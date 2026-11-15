// Moves orders from tags to categories (category, categoryValue, categoryId), and sets up the category choices.
// Uses your gcloud login (IAM access); dry run by default, so read its output before adding --apply.
//
//   node scripts/migrate-categories.mjs --project orders-server-dev            what would change
//   node scripts/migrate-categories.mjs --project orders-server-dev --apply    writes
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/migrate-categories.mjs --project demo-orders --apply
//
// Choices (the tags collection):
//   - Lab stock offers exactly Electronics, CreaKits and Tools and equipment: missing ones are added, other stock
//     tags are hidden (older orders keep showing them).
//   - The Fablab is an association: an "Fablab" association is added if missing, and any other tag named like
//     the Fablab (e.g. a "Fablab consumables" stock tag) is hidden.
// Orders: each order without a category gets the category of its first tag (an order tagged with a Fablab tag
// becomes Association · Fablab). Its tags stay on the order. Orders without a known tag are left as they are.
//
// Silent like archive-orders.mjs: the update function only emails on comments, review requests and status
// changes, and only stamps lastUpdate = now when lastUpdate did not change; each write moves lastUpdate by 1 ms.

import { execSync } from 'node:child_process'

const args = process.argv.slice(2)
const option = (name) => { const i = args.indexOf(name); return i === -1 ? undefined : args[i + 1] }
const project = option('--project')
const apply = args.includes('--apply')
if (!project) throw new Error('usage: node scripts/migrate-categories.mjs --project <id> [--apply]')

const emulator = process.env.FIRESTORE_EMULATOR_HOST
const token = emulator ? 'owner' : execSync('gcloud auth print-access-token').toString().trim()
const headers = { Authorization: `Bearer ${token}`, 'x-goog-user-project': project, 'Content-Type': 'application/json' }
const DB = `projects/${project}/databases/(default)`
const API = `${emulator ? `http://${emulator}` : 'https://firestore.googleapis.com'}/v1/${DB}/documents`

const STOCKS = ['Electronics', 'CreaKits', 'Tools and equipment']
const FABLAB = 'Fablab'
const isFablab = (name) => /fab\s*lab/i.test(name)
const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase()

async function call(url, body) {
    const res = await fetch(url, body ? { method: 'POST', headers, body: JSON.stringify(body) } : { headers })
    const json = await res.json()
    if (!res.ok) throw new Error(`${url}: ${JSON.stringify(json.error)}`)
    return json
}

async function list(collection) {
    let docs = []
    let pageToken
    do {
        const page = await call(`${API}/${collection}?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`)
        docs = docs.concat(page.documents || [])
        pageToken = page.nextPageToken
    } while (pageToken)
    return docs
}

function plusOneMillisecond(rfc3339) {
    const [whole, fraction = ''] = rfc3339.replace('Z', '').split('.')
    const nanos = BigInt(Date.parse(`${whole}Z`)) * 1000000n + BigInt(fraction.padEnd(9, '0').slice(0, 9)) + 1000000n
    const seconds = nanos / 1000000000n
    const rest = (nanos % 1000000000n).toString().padStart(9, '0')
    return `${new Date(Number(seconds) * 1000).toISOString().slice(0, 19)}.${rest}Z`
}

const id = (doc) => doc.name.split('/').pop()
const str = (doc, field) => doc.fields?.[field]?.stringValue ?? ''

// 1. Choices
const tags = (await list('tags')).map(doc => ({ doc, id: id(doc), name: str(doc, 'name'), type: str(doc, 'type'), hidden: doc.fields?.hidden?.booleanValue === true }))
const toAdd = []
const toHide = []
for (const name of STOCKS) if (!tags.some(t => t.type === 'stock' && same(t.name, name))) toAdd.push({ name, type: 'stock' })
if (!tags.some(t => t.type === 'asso' && same(t.name, FABLAB))) toAdd.push({ name: FABLAB, type: 'asso' })
for (const tag of tags) {
    if (tag.hidden) continue
    const fablabElsewhere = isFablab(tag.name) && !(tag.type === 'asso' && same(tag.name, FABLAB))
    const extraStock = tag.type === 'stock' && !STOCKS.some(name => same(name, tag.name))
    if (fablabElsewhere || extraStock) toHide.push(tag)
}
console.log('Choices:')
for (const t of toAdd) console.log(`  add   ${t.type.padEnd(7)} ${t.name}`)
for (const t of toHide) console.log(`  hide  ${t.type.padEnd(7)} ${t.name}`)
if (!toAdd.length && !toHide.length) console.log('  nothing to change')

for (const t of toAdd) {
    if (apply) {
        const created = await call(`${API}/tags`, { fields: { name: { stringValue: t.name }, type: { stringValue: t.type }, hidden: { booleanValue: false } } })
        tags.push({ doc: created, id: id(created), name: t.name, type: t.type, hidden: false })
    } else {
        tags.push({ id: `(new ${t.name})`, name: t.name, type: t.type, hidden: false })
    }
}
if (apply && toHide.length) {
    await call(`${API}:commit`, { writes: toHide.map(t => ({ update: { name: t.doc.name, fields: { hidden: { booleanValue: true } } }, updateMask: { fieldPaths: ['hidden'] } })) })
}

// 2. Orders
const fablab = tags.find(t => t.type === 'asso' && same(t.name, FABLAB))
const categoryOf = (tag) => isFablab(tag.name) ? fablab : (['project', 'stock', 'asso'].includes(tag.type) ? tag : undefined)
const orders = await list('orders')
const writes = []
const counts = {}
let unknown = 0
for (const order of orders) {
    if (order.fields?.category) continue
    const tagIds = (order.fields?.tags?.arrayValue?.values || []).map(v => v.stringValue)
    const target = tagIds.map(tagId => tags.find(t => t.id === tagId)).filter(Boolean).map(categoryOf).find(Boolean)
    if (!target) {
        unknown++
        continue
    }
    const key = `${target.type} · ${target.name}`
    counts[key] = (counts[key] || 0) + 1
    const values = {
        category: { stringValue: target.type },
        categoryValue: { stringValue: target.name },
        categoryId: { stringValue: target.id },
    }
    const lastUpdate = order.fields?.lastUpdate?.timestampValue
    if (lastUpdate) values.lastUpdate = { timestampValue: plusOneMillisecond(lastUpdate) }
    writes.push({ update: { name: order.name, fields: values }, updateMask: { fieldPaths: Object.keys(values) }, currentDocument: { updateTime: order.updateTime } })
}
console.log(`\nOrders: ${writes.length} to categorise, ${unknown} without a known tag (left as they are), ${orders.length - writes.length - unknown} already done.`)
for (const [key, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${key}`)

if (!apply) {
    console.log('\nDry run: nothing written. Add --apply to write.')
} else {
    for (let i = 0; i < writes.length; i += 400) {
        await call(`${API}:commit`, { writes: writes.slice(i, i + 400) })
        console.log(`wrote ${Math.min(i + 400, writes.length)}/${writes.length}`)
    }
    console.log('Done.')
}
