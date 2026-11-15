// Seeds the dev Firebase project with suppliers, tags and admins.
// Uses your gcloud login (IAM access bypasses security rules), so it refuses any other project.
//
//   node scripts/seed-dev.mjs                    suppliers + tags
//   node scripts/seed-dev.mjs you@devinci.fr     ... and make these users admins (sign in on dev first)
//   node scripts/seed-dev.mjs --personas         ... and the test accounts of the dev account switcher

import { execSync } from 'node:child_process'

const PROJECT = 'orders-server-dev'
const token = execSync('gcloud auth print-access-token').toString().trim()
const headers = {
    Authorization: `Bearer ${token}`,
    'x-goog-user-project': PROJECT,
    'Content-Type': 'application/json',
}
const DOCS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`

// Same names and webpages as on prod, so the parts catalogue (scripts/seed-catalog.mjs) matches them
const suppliers = [
    { id: 'rs', name: 'RS Online', webpage: 'https://fr.rs-online.com/' },
    { id: 'amazon', name: 'Amazon FR', webpage: 'https://amazon.fr/' },
    { id: 'mouser', name: 'Mouser', webpage: 'https://mouser.fr/' },
    { id: 'digikey', name: 'Digikey', webpage: 'https://www.digikey.fr/' },
]

// The choices of each order category (Categories page). The Fablab is an association.
const tags = [
    { id: 'project-demo', name: 'Demo project', type: 'project' },
    { id: 'project-test', name: 'Test project', type: 'project' },
    { id: 'stock-electronics', name: 'Electronics', type: 'stock' },
    { id: 'stock-creakits', name: 'CreaKits', type: 'stock' },
    { id: 'stock-tools', name: 'Tools and equipment', type: 'stock' },
    { id: 'asso-demo', name: 'Demo association', type: 'asso' },
    { id: 'asso-fablab', name: 'Fablab', type: 'asso' },
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
// Test accounts for the account switcher (functions/main.py switchAccount; same uids there). Nobody signs in
// to them with an email link: the function hands out sign-in tokens to the people in ACCOUNT_SWITCHERS.
const personas = [
    { uid: 'persona-student', email: 'test.student@edu.devinci.fr' },
    { uid: 'persona-referent', email: 'test.referent@devinci.fr', admin: { isIR: true, isReferent: true } },
    { uid: 'persona-admin', email: 'test.admin@devinci.fr', admin: { isIR: true } },
]

async function createPersona({ uid, email }) {
    const accounts = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts`
    const res = await fetch(accounts, { method: 'POST', headers, body: JSON.stringify({ localId: uid, email, emailVerified: true }) })
    if (res.ok) return console.log(`created ${email}`)
    const text = await res.text()
    if (!text.includes('DUPLICATE_LOCAL_ID')) throw new Error(`${email}: ${res.status} ${text}`)
    console.log(`exists ${email}`)
}

const args = process.argv.slice(2)
if (args.includes('--personas')) {
    for (const persona of personas) {
        await createPersona(persona)
        if (persona.admin) await setDoc(`admins/${persona.uid}`, { email: persona.email, ...persona.admin })
    }
}
for (const email of args.filter(a => !a.startsWith('--'))) {
    await setDoc(`admins/${await uidForEmail(email)}`, { email, isIR: true })
}
