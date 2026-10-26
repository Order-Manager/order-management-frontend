// Archives orders with no update for N months, without notifying anyone, and marks every other
// order archived: false (the lists filter on that field). Uses your gcloud login (IAM access).
//
//   node scripts/archive-orders.mjs --project orders-server-dev              dry run: lists what would change
//   node scripts/archive-orders.mjs --project orders-server-dev --apply      writes
//   options: --months 6 (default) or --before 2026-04-26
//
// Why this is silent: the order update function only emails on comments, review requests and
// status changes, and only stamps lastUpdate = now when lastUpdate did not change. Each write here
// touches neither status nor history and moves lastUpdate by 1 ms, so the function does nothing.

import { execSync } from 'node:child_process'

const args = process.argv.slice(2)
const option = (name) => { const i = args.indexOf(name); return i === -1 ? undefined : args[i + 1] }
const project = option('--project')
const apply = args.includes('--apply')
if (!project) throw new Error('usage: node scripts/archive-orders.mjs --project <id> [--months 6 | --before YYYY-MM-DD] [--apply]')

const months = Number(option('--months') || 6)
const cutoff = option('--before')
    ? new Date(`${option('--before')}T00:00:00Z`)
    : new Date(new Date().setMonth(new Date().getMonth() - months))

// FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 runs it against the local emulator instead
const emulator = process.env.FIRESTORE_EMULATOR_HOST
const token = emulator ? 'owner' : execSync('gcloud auth print-access-token').toString().trim()
const headers = { Authorization: `Bearer ${token}`, 'x-goog-user-project': project, 'Content-Type': 'application/json' }
const DB = `projects/${project}/databases/(default)`
const API = `${emulator ? `http://${emulator}` : 'https://firestore.googleapis.com'}/v1/${DB}/documents`

async function call(url, body) {
    const res = await fetch(url, body ? { method: 'POST', headers, body: JSON.stringify(body) } : { headers })
    const json = await res.json()
    if (!res.ok) throw new Error(`${url}: ${JSON.stringify(json.error)}`)
    return json
}

// Firestore timestamps carry nanoseconds; add 1 ms without losing precision
function plusOneMillisecond(rfc3339) {
    const [whole, fraction = ''] = rfc3339.replace('Z', '').split('.')
    const nanos = BigInt(Date.parse(`${whole}Z`)) * 1000000n + BigInt(fraction.padEnd(9, '0').slice(0, 9)) + 1000000n
    const seconds = nanos / 1000000000n
    const rest = (nanos % 1000000000n).toString().padStart(9, '0')
    return `${new Date(Number(seconds) * 1000).toISOString().slice(0, 19)}.${rest}Z`
}

const fields = ['status', 'title', 'requestedBy', 'lastUpdate', 'archived']
let orders = []
let pageToken
do {
    const page = await call(`${API}/orders?pageSize=300&${fields.map(f => `mask.fieldPaths=${f}`).join('&')}${pageToken ? `&pageToken=${pageToken}` : ''}`)
    orders = orders.concat(page.documents || [])
    pageToken = page.nextPageToken
} while (pageToken)

const now = new Date().toISOString()
const toArchive = []
const toBackfill = []
for (const order of orders) {
    const f = order.fields || {}
    if (f.archived?.booleanValue === true) continue
    const lastUpdate = f.lastUpdate?.timestampValue
    if (lastUpdate && new Date(lastUpdate) < cutoff) toArchive.push(order)
    else if (f.archived === undefined) toBackfill.push(order)
}

const byStatus = {}
for (const order of toArchive) {
    const status = order.fields.status?.stringValue
    byStatus[status] = (byStatus[status] || 0) + 1
}
console.log(`${project}: ${orders.length} orders. Cutoff: no update since ${cutoff.toISOString().slice(0, 10)}.`)
console.log(`To archive: ${toArchive.length}`, byStatus)
console.log(`To mark archived: false: ${toBackfill.length}`)
for (const order of toArchive.slice(0, 10)) {
    const f = order.fields
    console.log(`  ${f.lastUpdate.timestampValue.slice(0, 10)}  ${(f.status?.stringValue || '').padEnd(16)} ${f.title?.stringValue || '(untitled)'}`)
}
if (toArchive.length > 10) console.log(`  … and ${toArchive.length - 10} more`)

if (!apply) {
    console.log('Dry run: nothing written. Add --apply to write.')
    process.exit(0)
}

// Only write if the order hasn't changed since we read it
function write(order, archived) {
    const lastUpdate = order.fields.lastUpdate?.timestampValue
    const values = { archived: { booleanValue: archived } }
    if (archived) {
        values.archivedAt = { timestampValue: now }
        values.archivedBy = { stringValue: `bulk archive: no update for ${months} months` }
    }
    if (lastUpdate) values.lastUpdate = { timestampValue: plusOneMillisecond(lastUpdate) }
    return {
        update: { name: order.name, fields: values },
        updateMask: { fieldPaths: Object.keys(values) },
        currentDocument: { updateTime: order.updateTime },
    }
}

const writes = [...toArchive.map(o => write(o, true)), ...toBackfill.map(o => write(o, false))]
for (let i = 0; i < writes.length; i += 400) {
    await call(`${API}:commit`, { writes: writes.slice(i, i + 400) })
    console.log(`wrote ${Math.min(i + 400, writes.length)}/${writes.length}`)
}
console.log('Done.')
