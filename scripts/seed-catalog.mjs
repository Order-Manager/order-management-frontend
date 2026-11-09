// Loads scripts/catalog-parts.json into the parts catalogue (catalog/{id}). Parts already there
// (same name, note and supplier) are skipped, so it is safe to run again. Uses your gcloud login; dry run by default.
//
//   node scripts/seed-catalog.mjs --project orders-server-dev
//   ... --apply      writes
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/seed-catalog.mjs --project demo-orders --apply

import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const option = (name) => { const i = args.indexOf(name); return i === -1 ? undefined : args[i + 1] }
const project = option('--project')
if (!project) throw new Error('usage: node scripts/seed-catalog.mjs --project <id> [--apply]')
const apply = args.includes('--apply')

const emulator = process.env.FIRESTORE_EMULATOR_HOST
const token = emulator ? 'owner' : execSync('gcloud auth print-access-token').toString().trim()
const headers = { Authorization: `Bearer ${token}`, 'x-goog-user-project': project, 'Content-Type': 'application/json' }
const API = `${emulator ? `http://${emulator}` : 'https://firestore.googleapis.com'}/v1/projects/${project}/databases/(default)/documents`

const parts = JSON.parse(readFileSync(new URL('./catalog-parts.json', import.meta.url)))
const key = (p) => [p.name, p.note, p.supplier].join('|')

const res = await fetch(`${API}/catalog?pageSize=1000`, { headers })
if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
const { documents = [] } = await res.json()
const existing = new Set(documents.map(d => key(Object.fromEntries(
    ['name', 'note', 'supplier'].map(f => [f, d.fields[f]?.stringValue || ''])))))

const suppliers = (await (await fetch(`${API}/suppliers?pageSize=300`, { headers })).json()).documents || []
const supplierNames = new Set(suppliers.map(s => s.fields.name?.stringValue.trim()))

let added = 0
for (const part of parts) {
    if (!supplierNames.has(part.supplier)) throw new Error(`${part.name}: no supplier named ${part.supplier}`)
    if (existing.has(key(part))) {
        console.log(`exists  ${part.name} ${part.note}`)
        continue
    }
    console.log(`add     ${part.category} · ${part.name}${part.note ? ` (${part.note})` : ''} · ${part.supplier} · €${part.price}`)
    added++
    if (!apply) continue
    const fields = {
        name: { stringValue: part.name },
        note: { stringValue: part.note },
        category: { stringValue: part.category },
        supplier: { stringValue: part.supplier },
        link: { stringValue: part.link },
        price: { doubleValue: part.price },
        hidden: { booleanValue: false },
        updatedAt: { timestampValue: new Date().toISOString() },
        updatedBy: { stringValue: 'seed-catalog' },
    }
    const write = await fetch(`${API}/catalog`, { method: 'POST', headers, body: JSON.stringify({ fields }) })
    if (!write.ok) throw new Error(`${part.name}: ${write.status} ${await write.text()}`)
}
console.log(`${added} to add, ${parts.length - added} already there.`)
console.log(apply ? 'Done.' : 'Dry run: nothing written. Add --apply to write.')
