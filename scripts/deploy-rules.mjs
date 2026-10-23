// Deploys firestore.rules and firestore.indexes.json with your gcloud login,
// for when the Firebase CLI login is unavailable. Equivalent to
// `firebase deploy --only firestore -P <alias>`.
//
//   node scripts/deploy-rules.mjs orders-server-dev

import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const project = process.argv[2]
if (!project) throw new Error('usage: node scripts/deploy-rules.mjs <projectId>')

const token = execSync('gcloud auth print-access-token').toString().trim()
const headers = {
    Authorization: `Bearer ${token}`,
    'x-goog-user-project': project,
    'Content-Type': 'application/json',
}

async function call(method, url, body) {
    const res = await fetch(url, { method, headers, body: body && JSON.stringify(body) })
    const json = await res.json()
    if (!res.ok && json.error?.status !== 'ALREADY_EXISTS') throw new Error(`${method} ${url}: ${JSON.stringify(json.error)}`)
    return json
}

const RULES = `https://firebaserules.googleapis.com/v1/projects/${project}`
const ruleset = await call('POST', `${RULES}/rulesets`, {
    source: { files: [{ name: 'firestore.rules', content: readFileSync('firestore.rules', 'utf8') }] },
})
await call('PATCH', `${RULES}/releases/cloud.firestore`, {
    release: { name: `projects/${project}/releases/cloud.firestore`, rulesetName: ruleset.name },
})
console.log(`rules: released ${ruleset.name}`)

const { indexes } = JSON.parse(readFileSync('firestore.indexes.json', 'utf8'))
for (const { collectionGroup, ...index } of indexes) {
    const url = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/collectionGroups/${collectionGroup}/indexes`
    const res = await call('POST', url, index)
    console.log(`index ${collectionGroup} ${index.fields.map(f => f.fieldPath).join(',')}: ${res.error ? 'exists' : 'creating'}`)
}
