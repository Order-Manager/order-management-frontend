// Marks which research engineers students can pick as their referent (admins/{uid}.isReferent).
// Every admin becomes a referent except the excluded emails. Uses your gcloud login; dry run by default.
//
//   node scripts/set-referents.mjs --project orders-server --exclude madalina.nicolae@devinci.fr,antoine.pradoura@devinci.fr
//   ... --apply      writes

import { execSync } from 'node:child_process'

const args = process.argv.slice(2)
const option = (name) => { const i = args.indexOf(name); return i === -1 ? undefined : args[i + 1] }
const project = option('--project')
if (!project) throw new Error('usage: node scripts/set-referents.mjs --project <id> [--exclude a@devinci.fr,b@devinci.fr] [--apply]')
const excluded = new Set((option('--exclude') || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean))
const apply = args.includes('--apply')

const emulator = process.env.FIRESTORE_EMULATOR_HOST
const token = emulator ? 'owner' : execSync('gcloud auth print-access-token').toString().trim()
const headers = { Authorization: `Bearer ${token}`, 'x-goog-user-project': project, 'Content-Type': 'application/json' }
const API = `${emulator ? `http://${emulator}` : 'https://firestore.googleapis.com'}/v1/projects/${project}/databases/(default)/documents`

const res = await fetch(`${API}/admins?pageSize=300`, { headers })
const { documents = [] } = await res.json()
const unknown = [...excluded].filter(e => !documents.some(d => d.fields.email?.stringValue.toLowerCase() === e))
if (unknown.length) throw new Error(`Not admins: ${unknown.join(', ')}`)

for (const admin of documents) {
    const email = admin.fields.email?.stringValue
    const referent = !excluded.has(email.toLowerCase())
    const current = admin.fields.isReferent?.booleanValue
    console.log(`${referent ? 'referent    ' : 'not referent'}  ${email}${current === referent ? '' : '  (changes)'}`)
    if (apply && current !== referent) {
        const write = await fetch(`${API}/admins/${admin.name.split('/').pop()}?updateMask.fieldPaths=isReferent`, {
            method: 'PATCH', headers, body: JSON.stringify({ fields: { isReferent: { booleanValue: referent } } }),
        })
        if (!write.ok) throw new Error(`${email}: ${write.status} ${await write.text()}`)
    }
}
console.log(apply ? 'Done.' : 'Dry run: nothing written. Add --apply to write.')
