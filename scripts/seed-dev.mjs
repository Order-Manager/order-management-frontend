// Seeds the dev Firebase project with suppliers, tags and admins.
// Uses your gcloud login (IAM access bypasses security rules), so it refuses any other project.
//
//   node scripts/seed-dev.mjs                    suppliers + tags
//   node scripts/seed-dev.mjs you@devinci.fr     ... and make these users admins (sign in on dev first)

import { execSync } from 'node:child_process'

const PROJECT = 'orders-server-dev'
const token = execSync('gcloud auth print-access-token').toString().trim()
const headers = {
    Authorization: `Bearer ${token}`,
    'x-goog-user-project': PROJECT,
    'Content-Type': 'application/json',
}
const DOCS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`

const suppliers = [
    { id: 'rs', name: 'RS Components', webpage: 'https://fr.rs-online.com' },
    { id: 'amazon', name: 'Amazon', webpage: 'https://www.amazon.fr' },
    { id: 'mouser', name: 'Mouser', webpage: 'https://www.mouser.fr' },
]

const tags = [
    { id: 'project-demo', name: 'Demo project', type: 'project' },
    { id: 'project-test', name: 'Test project', type: 'project' },
    { id: 'stock-electronics', name: 'Electronics', type: 'stock' },
    { id: 'asso-demo', name: 'Demo association', type: 'asso' },
]

function toFields(data) {
    const fields = {}
    for (const [key, value] of Object.entries(data)) {
        fields[key] = typeof value === 'boolean' ? { booleanValue: value } : { stringValue: value }
    }
    return { fields }
}

async function setDoc(path, data) {
    const res = await fetch(`${DOCS}/${path}`, { method: 'PATCH', headers, body: JSON.stringify(toFields(data)) })
    if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`)
    console.log(`set ${path}`)
}

async function uidForEmail(email) {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`, {
        method: 'POST', headers, body: JSON.stringify({ email: [email] }),
    })
    const body = await res.json()
    if (!res.ok) throw new Error(`lookup ${email}: ${JSON.stringify(body)}`)
    if (!body.users) throw new Error(`${email} has no account on ${PROJECT}; sign in on the dev site first`)
    return body.users[0].localId
}

for (const { id, ...supplier } of suppliers) await setDoc(`suppliers/${id}`, { ...supplier, hidden: false })
for (const { id, ...tag } of tags) await setDoc(`tags/${id}`, { ...tag, hidden: false })
for (const email of process.argv.slice(2)) {
    await setDoc(`admins/${await uidForEmail(email)}`, { email, isIR: true })
}
