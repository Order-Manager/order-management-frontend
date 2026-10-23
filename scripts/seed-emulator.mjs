// Seeds the local emulators (npm run emulators) with users, reference data and orders in every status.
// Sign in on http://localhost:5173/orders/ with one of the emails below; the login link is printed by
// `node scripts/seed-emulator.mjs link <email>` after you request it in the app.

const PROJECT = 'demo-orders'
const FIRESTORE = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`
const AUTH = `http://127.0.0.1:9099`
const headers = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }

const ADMIN = { uid: 'admin', email: 'admin@devinci.fr' }
const STUDENT = { uid: 'student', email: 'student@edu.devinci.fr' }
const OTHER = { uid: 'other', email: 'camille.lefebvre-de-la-fontaine@edu.devinci.fr' }

function toValue(v) {
    if (v === null || v === undefined) return { nullValue: null }
    if (v instanceof Date) return { timestampValue: v.toISOString() }
    if (Array.isArray(v)) return { arrayValue: v.length ? { values: v.map(toValue) } : {} }
    if (typeof v === 'boolean') return { booleanValue: v }
    if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
    if (typeof v === 'object') return { mapValue: { fields: toFields(v) } }
    return { stringValue: String(v) }
}

function toFields(obj) {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, toValue(v)]))
}

async function setDoc(path, data) {
    const res = await fetch(`${FIRESTORE}/${path}`, { method: 'PATCH', headers, body: JSON.stringify({ fields: toFields(data) }) })
    if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`)
}

async function printLoginLink(email) {
    const res = await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/oobCodes`)
    const { oobCodes } = await res.json()
    const code = oobCodes.filter(c => c.email === email && c.requestType === 'EMAIL_SIGNIN').pop()
    console.log(code ? code.oobLink : `No login link requested for ${email} yet`)
}

if (process.argv[2] === 'link') {
    await printLoginLink(process.argv[3])
    process.exit(0)
}

const daysAgo = (d, h = 10) => new Date(Date.now() - d * 86400e3 + h * 3600e3 - 10 * 3600e3)

for (const user of [ADMIN, STUDENT, OTHER]) {
    const res = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts`, {
        method: 'POST', headers, body: JSON.stringify({ localId: user.uid, email: user.email, emailVerified: true }),
    })
    if (!res.ok && !(await res.text()).includes('DUPLICATE')) throw new Error(`user ${user.email}`)
}
await setDoc(`admins/${ADMIN.uid}`, { email: ADMIN.email, isIR: true })

const suppliers = [
    ['rs', 'RS Components', 'https://fr.rs-online.com'],
    ['amazon', 'Amazon', 'https://www.amazon.fr'],
    ['mouser', 'Mouser', 'https://www.mouser.fr'],
    ['lcsc', 'LCSC', 'https://www.lcsc.com'],
]
for (const [id, name, webpage] of suppliers) await setDoc(`suppliers/${id}`, { name, webpage, hidden: false })

const tags = [
    ['octon', 'Octon', 'project'], ['marblebot', 'MarbleBot', 'project'], ['compass', 'Compass', 'project'],
    ['fablab', 'Fablab consumables', 'stock'], ['electronics', 'Electronics', 'stock'],
    ['bde', 'BDE', 'asso'], ['robotics-club', 'Robotics club', 'asso'],
]
for (const [id, name, type] of tags) await setDoc(`tags/${id}`, { name, type, hidden: false })

const item = (name, link, quantity, price, state = {}) => ({ type: 'item', name, link, quantity: String(quantity), price: String(price), ...state })
const created = (d) => ({ type: 'order-creation', date: daysAgo(d), author: 'system' })
const comment = (d, author, message) => ({ type: 'comment', date: daysAgo(d, 11), author, message })
const event = (type, d, author, extra = {}) => ({ type, date: daysAgo(d, 12), author, ...extra })

const orders = [
    {
        id: 'servo-motors', owner: STUDENT, status: 'pendingIR', title: 'Servo motors for the arm prototype', supplier: 'RS Components',
        tags: ['octon'], priority: 'high', created: 1,
        items: [item('MG996R servo motor', 'https://fr.rs-online.com/web/p/servo-motors/123', 6, 9.9), item('Servo extension cable 30cm', 'https://fr.rs-online.com/web/p/cables/456', 6, 1.2)],
        updates: [created(1), comment(1, STUDENT.email, 'Needed before the demo on Friday if possible.')],
    },
    {
        id: 'acrylic', owner: STUDENT, status: 'processingOrder', title: 'Acrylic sheets', supplier: 'Amazon', tags: ['fablab'], priority: 'medium', created: 6,
        items: [item('Acrylic sheet 3x200x300mm, transparent', 'https://www.amazon.fr/dp/B000000001', 10, 4.5)],
        updates: [created(6), event('review-ir-approved', 5, ADMIN.email)],
    },
    {
        id: 'pcb-batch', owner: STUDENT, status: 'ordered', title: 'Passive components for PCB batch v3 (resistors, capacitors, connectors, headers and spare ICs for 20 boards)',
        supplier: 'LCSC', tags: ['octon', 'electronics'], priority: 'low', created: 14,
        items: [
            item('0402 10k resistor', 'https://www.lcsc.com/product-detail/1', 500, 0.002, { ordered: true }),
            item('0402 100nF capacitor', 'https://www.lcsc.com/product-detail/2', 500, 0.003, { ordered: true }),
            item('JST-PH 2-pin connector, right angle, through hole', 'https://www.lcsc.com/product-detail/3', 40, 0.08, { ordered: true }),
            item('ESP32-C3-MINI-1 module', 'https://www.lcsc.com/product-detail/4', 20, 2.35, { ordered: true }),
            item('Pin header 2.54mm 1x40', 'https://www.lcsc.com/product-detail/5', 10, 0.12, { ordered: true }),
            item('TP4056 charger IC', 'https://www.lcsc.com/product-detail/6', 20, 0.15, { ordered: true }),
        ],
        updates: [created(14), event('review-ir-approved', 13, ADMIN.email), event('order-processed', 10, ADMIN.email),
            comment(9, ADMIN.email, 'Ordered with standard shipping, LCSC says 7 to 10 days. I split the connectors into a second parcel because the first one was out of stock; they should arrive a few days later than the rest.')],
    },
    {
        id: 'filament', owner: STUDENT, status: 'received', title: 'PLA filament', supplier: 'Amazon', tags: ['fablab'], priority: 'low', created: 20,
        items: [item('PLA 1.75mm 1kg black', 'https://www.amazon.fr/dp/B000000002', 3, 19.99, { ordered: true, delivered: true })],
        updates: [created(20), event('review-ir-approved', 19, ADMIN.email), event('order-processed', 18, ADMIN.email), event('order-received', 15, ADMIN.email)],
    },
    {
        id: 'old-done', owner: STUDENT, status: 'completed', title: 'Soldering tips', supplier: 'RS Components', tags: ['fablab'], priority: 'low', created: 60,
        items: [item('Weller LT B tip', 'https://fr.rs-online.com/web/p/tips/789', 4, 7.6, { ordered: true, delivered: true, completed: true })],
        updates: [created(60), event('review-ir-approved', 59, ADMIN.email), event('order-processed', 58, ADMIN.email), event('order-received', 52, ADMIN.email), event('order-completed', 50, ADMIN.email)],
    },
    {
        id: 'refused', owner: STUDENT, status: 'refusedIR', title: 'Gaming mouse', supplier: 'Amazon', tags: ['bde'], priority: 'low', created: 30,
        items: [item('Wireless gaming mouse', 'https://www.amazon.fr/dp/B000000003', 1, 89),],
        updates: [created(30), comment(29, ADMIN.email, 'This is not lab equipment, please ask the BDE budget instead.'), event('review-ir-refused', 29, ADMIN.email)],
    },
    {
        id: 'draft', owner: STUDENT, status: 'draft', title: 'Magnets (draft)', supplier: 'Amazon', tags: ['marblebot'], priority: 'low', created: 2,
        items: [item('Neodymium magnet 10x3mm', 'https://www.amazon.fr/dp/B000000004', 50, 0.3)],
        updates: [created(2)],
    },
    {
        id: 'cancelled', owner: STUDENT, status: 'cancelled', title: 'Duplicate of servo order', supplier: 'RS Components', tags: ['octon'], priority: 'low', created: 3,
        items: [item('MG996R servo motor', 'https://fr.rs-online.com/web/p/servo-motors/123', 6, 9.9)], cancelledBy: STUDENT.email,
        updates: [created(3), event('order-cancelled', 3, STUDENT.email)],
    },
    {
        id: 'other-pending', owner: OTHER, status: 'pendingIR', title: 'Stepper drivers', supplier: 'Mouser', tags: ['marblebot', 'robotics-club'], priority: 'medium', created: 0,
        items: [item('TMC2209 stepper driver', 'https://www.mouser.fr/ProductDetail/1', 4, 6.8), item('NEMA17 stepper motor', 'https://www.mouser.fr/ProductDetail/2', 4, 14.5)],
        updates: [created(0)],
    },
    {
        id: 'other-processing', owner: OTHER, status: 'processingOrder', title: 'Compass watch v2 batteries', supplier: 'Mouser', tags: ['compass'], priority: 'high', created: 4,
        items: [item('LiPo 3.7V 150mAh', 'https://www.mouser.fr/ProductDetail/3', 10, 4.2)],
        updates: [created(4), event('review-requested', 4, ADMIN.email, { message: 'other.admin@devinci.fr' }), event('review-ir-approved', 3, ADMIN.email)],
    },
]

for (const o of orders) {
    const total = o.updates.at(-1).date
    await setDoc(`orders/${o.id}`, {
        creationDate: daysAgo(o.created), lastUpdate: total, requestedBy: o.owner.email, requestedById: o.owner.uid,
        status: o.status, title: o.title, supplier: o.supplier, items: o.items, comment: '', updates: o.updates,
        tags: o.tags, priority: o.priority, ...(o.cancelledBy ? { cancelledBy: o.cancelledBy } : {}),
    })
}

console.log(`Seeded ${orders.length} orders. Users: ${ADMIN.email} (admin), ${STUDENT.email}, ${OTHER.email}`)
