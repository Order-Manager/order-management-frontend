// Fills the dev project with fake orders from the test accounts of the account switcher (seed-dev.mjs --personas),
// at every stage, so the order lists and pages have something to show. Uses your gcloud login; dry run by default.
//
//   node scripts/seed-dev-orders.mjs            what it would write
//   node scripts/seed-dev-orders.mjs --apply    writes the orders whose id isn't taken yet
//   ... --reset                                 also rewrites the fake-* orders that already exist
//
// The dev functions react to new orders (they reset the history and queue an email, which dev never sends), so the
// script creates each order, waits for them, then writes its real history.

import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const PROJECT = 'orders-server-dev'
const args = process.argv.slice(2)
const apply = args.includes('--apply')
const reset = args.includes('--reset')

const token = execSync('gcloud auth print-access-token').toString().trim()
const headers = { Authorization: `Bearer ${token}`, 'x-goog-user-project': PROJECT, 'Content-Type': 'application/json' }
const DOCS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`

// People (uids from seed-dev.mjs --personas; yours from the admins collection)
const STUDENT = { uid: 'persona-student', email: 'test.student@edu.devinci.fr' }
const REFERENT = { uid: 'persona-referent', email: 'test.referent@devinci.fr' }
const ADMIN = { uid: 'persona-admin', email: 'test.admin@devinci.fr' }
const THOMAS = { uid: '7T42Y35O1qZbrEi3DiC85cRIt772', email: 'thomas.juldo@devinci.fr' }

// Catalogue parts, so stock badges show on the order page
const parts = JSON.parse(readFileSync(new URL('./catalog-parts.json', import.meta.url)))
const part = (name, quantity, state = {}) => {
    const p = parts.find(p => p.name === name)
    if (!p) throw new Error(`no catalogue part named ${name}`)
    return item(`${p.name}${p.note ? ` (${p.note})` : ''}`, p.link, quantity, p.price, state)
}

const now = Date.now()
const daysAgo = (d, hour = 10) => { const t = new Date(now - d * 86400000); t.setHours(hour, 0, 0, 0); return t }
const item = (name, link, quantity, price, state = {}) => ({ type: 'item', name, link, quantity: String(quantity), price: String(price), ...state })
const created = (d) => ({ type: 'order-creation', date: daysAgo(d, 9), author: 'system' })
const comment = (d, author, message, hour = 11) => ({ type: 'comment', date: daysAgo(d, hour), author, message })
const event = (type, d, author, hour = 12) => ({ type, date: daysAgo(d, hour), author })
const ordered = { ordered: true }
const delivered = { ordered: true, delivered: true }
const done = { ordered: true, delivered: true, completed: true }

const orders = [
    // The test student's orders, reviewed by the test referent
    {
        id: 'fake-student-draft', owner: STUDENT, referent: REFERENT, status: 'draft', title: 'Sensors for the plant monitor (draft)',
        supplier: 'Amazon FR', tags: ['project-demo'], priority: 'low', created: 1,
        items: [part('LDR photoresistor', 1), part('HC-SR04 ultrasonic range finder', 1)],
        updates: [created(1)],
    },
    {
        id: 'fake-student-pending', owner: STUDENT, referent: REFERENT, status: 'pendingIR', title: 'Servos and driver for the robot arm',
        supplier: 'Amazon FR', tags: ['project-demo'], priority: 'high', created: 0,
        items: [part('SG90 9 g servo', 2), part('L293D motor driver', 1), part('Breadboards and Dupont wires', 1)],
        updates: [created(0), comment(0, STUDENT.email, 'For the robot arm of our second-year project: 6 servos for the joints, the driver for the base motor. We need them for the demo on the 28th.')],
    },
    {
        id: 'fake-student-pending-mouser', owner: STUDENT, referent: REFERENT, status: 'pendingIR', title: 'Microcontroller and sound parts',
        supplier: 'Mouser', tags: ['project-test'], priority: 'medium', created: 2,
        items: [part('Seeed XIAO ESP32-S3', 2), part('LM386 audio amplifier', 2), part('Speaker 8 Ω 0.25 W, 23 mm', 2), part('Piezo buzzer 4 kHz 3 V', 4)],
        updates: [created(2), comment(2, STUDENT.email, 'A small sound box that reacts to movement. Two of each so we can break one.')],
    },
    {
        id: 'fake-student-changes', owner: STUDENT, referent: REFERENT, status: 'changesRequested', title: 'Display and buttons for the game console',
        supplier: 'Amazon FR', tags: ['project-demo'], priority: 'medium', created: 4,
        items: [
            part('OLED screen 128x64', 1),
            part('Push button 6x6x5 mm', 1),
            item('Mechanical keyboard switches, pack of 90', 'https://www.amazon.fr/dp/B0EXAMPLE01', 1, 32.99,
                { rejected: true, rejectedReason: 'The 6x6 push buttons from the lab stock do the same job.', rejectedBy: REFERENT.email, rejectedAt: daysAgo(3, 14) }),
        ],
        changesRequestedBy: REFERENT.email, changesRequestedAt: daysAgo(3, 14),
        changesRequestedMessage: 'Use the push buttons we have instead of the keyboard switches, and tell me how many screens you really need.',
        updates: [created(4), comment(4, STUDENT.email, 'A handheld game console for the embedded systems course.'),
            comment(3, REFERENT.email, 'Item rejected: “Mechanical keyboard switches, pack of 90”. The 6x6 push buttons from the lab stock do the same job.', 13),
            comment(3, REFERENT.email, 'Use the push buttons we have instead of the keyboard switches, and tell me how many screens you really need.', 14),
            event('changes-requested', 3, REFERENT.email, 14)],
    },
    {
        id: 'fake-student-approved', owner: STUDENT, referent: REFERENT, status: 'processingOrder', title: 'Motion sensors for the wearable',
        supplier: 'Amazon FR', tags: ['project-test'], priority: 'medium', created: 5,
        items: [part('MPU-6050 accelerometer and gyroscope', 1), part('Tilt ball switch', 1)],
        updates: [created(5), comment(5, STUDENT.email, 'For the fall detector bracelet.'), event('review-ir-approved', 4, REFERENT.email)],
    },
    {
        id: 'fake-student-ordered', owner: STUDENT, referent: REFERENT, status: 'ordered', title: 'Motors for the line follower',
        supplier: 'Amazon FR', tags: ['project-demo'], priority: 'low', created: 12,
        items: [part('Gear motor 3-6 V', 1, ordered), part('IRLB8721 MOSFET, logic level', 1, ordered)],
        updates: [created(12), event('review-ir-approved', 11, REFERENT.email), event('order-processed', 9, ADMIN.email),
            comment(9, ADMIN.email, 'Ordered, Amazon says delivery on Thursday.', 15)],
    },
    {
        id: 'fake-student-received', owner: STUDENT, referent: REFERENT, status: 'received', title: 'Microphone boards',
        supplier: 'Amazon FR', tags: ['project-test'], priority: 'low', created: 18,
        items: [part('INMP441 I2S microphone board', 1, delivered), part('MAX98357 I2S amplifier board', 1, delivered)],
        updates: [created(18), event('review-ir-approved', 17, REFERENT.email), event('order-processed', 16, ADMIN.email), event('order-received', 13, ADMIN.email),
            comment(13, ADMIN.email, 'In the pickup shelf at the fablab, box with your name.', 16)],
    },
    {
        id: 'fake-student-completed', owner: STUDENT, referent: REFERENT, status: 'completed', title: 'Stepper motors for the camera slider',
        supplier: 'Amazon FR', tags: ['project-demo'], priority: 'low', created: 40,
        items: [part('28BYJ-48 stepper with ULN2003 driver', 1, done)],
        updates: [created(40), event('review-ir-approved', 39, REFERENT.email), event('order-processed', 38, ADMIN.email), event('order-received', 34, ADMIN.email), event('order-completed', 33, ADMIN.email)],
    },
    {
        id: 'fake-student-refused', owner: STUDENT, referent: REFERENT, status: 'refusedIR', title: 'Gaming headset for the team',
        supplier: 'Amazon FR', tags: ['asso-demo'], priority: 'low', created: 9,
        items: [item('Wireless gaming headset', 'https://www.amazon.fr/dp/B0EXAMPLE02', 1, 79.99)],
        updates: [created(9), comment(8, REFERENT.email, "This isn't lab equipment: ask the association's budget instead."), event('review-ir-refused', 8, REFERENT.email)],
    },
    {
        id: 'fake-student-cancelled', owner: STUDENT, referent: REFERENT, status: 'cancelled', title: 'Duplicate of the servo order',
        supplier: 'Amazon FR', tags: ['project-demo'], priority: 'low', created: 1, cancelledBy: STUDENT.email,
        items: [part('SG90 9 g servo', 1)],
        updates: [created(1), event('order-cancelled', 1, STUDENT.email, 13)],
    },
    // The test student's orders for you to review on your own account
    {
        id: 'fake-student-for-thomas', owner: STUDENT, referent: THOMAS, status: 'pendingIR', title: 'Timers and shift registers for the LED matrix',
        supplier: 'Amazon FR', tags: ['stock-electronics'], priority: 'medium', created: 1,
        items: [part('74HC595 shift register', 1), part('RGB LED 5 mm', 1), part('Slide switch', 1)],
        updates: [created(1), comment(1, STUDENT.email, 'An 8x8 LED matrix for the open day. The shift registers drive the rows.')],
    },
    {
        id: 'fake-student-for-thomas-mouser', owner: STUDENT, referent: THOMAS, status: 'pendingIR', title: 'Hall and force sensors',
        supplier: 'Mouser', tags: ['project-test'], priority: 'low', created: 3,
        items: [part('DRV5055 Hall effect sensor', 4), part('FSR07CE force sensor', 2), part('Red LED 5 mm', 20)],
        updates: [created(3), comment(3, STUDENT.email, 'To compare sensors for the smart door handle.')],
    },
    // The test referent's own orders (stock and kits), reviewed by you
    {
        id: 'fake-referent-creakit', owner: REFERENT, referent: THOMAS, status: 'pendingIR', title: 'CreaKit restock for next semester',
        supplier: 'Amazon FR', tags: ['stock-electronics'], priority: 'medium', created: 0,
        items: [part('Storage box 1.4 L', 2), part('Foam pad 40x30x1 cm', 2), part('Potentiometer 10 kΩ', 2), part('Push button 6x6x5 mm', 1), part('Breadboards and Dupont wires', 3)],
        updates: [created(0), comment(0, REFERENT.email, 'Enough for 20 more CreaKits before the January workshops.')],
    },
    {
        id: 'fake-referent-stock', owner: REFERENT, referent: THOMAS, status: 'processingOrder', title: 'Lab stock: MOSFETs and timers',
        supplier: 'Mouser', tags: ['stock-electronics'], priority: 'low', created: 6,
        items: [part('NE555 timer (SE555P)', 50), part('LM386 audio amplifier', 20), part('Piezo buzzer 4 kHz 3 V', 30)],
        updates: [created(6), comment(6, REFERENT.email, 'The drawers are almost empty.'), event('review-ir-approved', 5, THOMAS.email)],
    },
    {
        id: 'fake-referent-ordered', owner: REFERENT, referent: REFERENT, status: 'ordered', title: 'Screens for the workshop',
        supplier: 'Amazon FR', tags: ['stock-electronics'], priority: 'high', created: 8,
        items: [part('OLED screen 128x64', 4, ordered), part('MPU-6050 accelerometer and gyroscope', 2)],
        updates: [created(8), event('review-ir-approved', 8, REFERENT.email, 14), event('order-processed', 7, REFERENT.email),
            comment(7, REFERENT.email, 'The MPU-6050 packs were out of stock, ordering them next week.', 15)],
    },
]

// Firestore REST encoding
function value(v) {
    if (v instanceof Date) return { timestampValue: v.toISOString() }
    if (Array.isArray(v)) return { arrayValue: { values: v.map(value) } }
    if (typeof v === 'boolean') return { booleanValue: v }
    if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
    if (v && typeof v === 'object') return { mapValue: { fields: fields(v) } }
    return { stringValue: String(v) }
}
const fields = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => [k, value(v)]))

async function exists(id) {
    const res = await fetch(`${DOCS}/orders/${id}`, { headers })
    if (res.status === 404) return false
    if (!res.ok) throw new Error(`${id}: ${res.status} ${await res.text()}`)
    return true
}

async function write(id, data, mask) {
    const query = mask ? '?' + mask.map(f => `updateMask.fieldPaths=${f}`).join('&') : ''
    const res = await fetch(`${DOCS}/orders/${id}${query}`, { method: 'PATCH', headers, body: JSON.stringify({ fields: fields(data) }) })
    if (!res.ok) throw new Error(`${id}: ${res.status} ${await res.text()}`)
}

const written = []
for (const o of orders) {
    if (await exists(o.id) && !reset) {
        console.log(`exists  ${o.id}`)
        continue
    }
    console.log(`write   ${o.id.padEnd(32)} ${o.status.padEnd(17)} ${o.owner.email} → ${o.referent.email}`)
    written.push(o)
    if (!apply) continue
    await write(o.id, {
        creationDate: daysAgo(o.created, 9), lastUpdate: o.updates.at(-1).date,
        requestedBy: o.owner.email, requestedById: o.owner.uid, referent: o.referent.email, referentId: o.referent.uid,
        status: o.status, title: o.title, supplier: o.supplier, items: o.items, comment: '', updates: [],
        tags: o.tags, priority: o.priority, archived: false,
        cancelledBy: o.cancelledBy, changesRequestedBy: o.changesRequestedBy, changesRequestedAt: o.changesRequestedAt,
        changesRequestedMessage: o.changesRequestedMessage,
    })
}

if (apply && written.length) {
    console.log('Waiting for the dev functions to process the new orders...')
    await new Promise(r => setTimeout(r, 25000))
    // Write the real history (and dates) over what the creation function put there
    for (const o of written) await write(o.id, { updates: o.updates, lastUpdate: o.updates.at(-1).date, archived: false }, ['updates', 'lastUpdate', 'archived'])
}
console.log(`${written.length} orders ${apply ? 'written' : 'to write'}.`)
if (!apply) console.log('Dry run: nothing written. Add --apply to write.')
