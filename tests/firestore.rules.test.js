// Run with `npm run test:rules` (starts the Firestore emulator)
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, test } from 'vitest'
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
    Timestamp,
    addDoc,
    arrayUnion,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    setDoc,
    updateDoc,
    where,
    setLogLevel,
} from 'firebase/firestore'

setLogLevel('silent')

let env

const STUDENT = { uid: 'student', email: 'student@edu.devinci.fr' }
const OTHER = { uid: 'other', email: 'other@devinci.fr' }
const ADMIN = { uid: 'admin', email: 'admin@devinci.fr' }
const OUTSIDER = { uid: 'outsider', email: 'someone@gmail.com' }
const LOOKALIKE = { uid: 'lookalike', email: 'x@devinci.fr.evil.com' }

function db(user, emailVerified = true) {
    return env
        .authenticatedContext(user.uid, { email: user.email, email_verified: emailVerified })
        .firestore()
}

function order(owner, overrides = {}) {
    return {
        creationDate: Timestamp.now(),
        lastUpdate: Timestamp.now(),
        requestedBy: owner.email,
        requestedById: owner.uid,
        status: 'pendingIR',
        title: 'Acrylic sheets',
        supplier: 'RS',
        items: [{ type: 'item', name: 'Sheet', link: 'https://rs-online.com/a', quantity: '1', price: '3' }],
        comment: '',
        updates: [{ type: 'order-creation', date: Timestamp.now(), author: 'system' }],
        tags: ['t1'],
        priority: 'low',
        ...overrides,
    }
}

async function seed(path, data) {
    await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), path), data)
    })
}

beforeAll(async () => {
    env = await initializeTestEnvironment({
        projectId: 'demo-orders',
        firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    })
})

afterAll(async () => {
    await env.cleanup()
})

beforeEach(async () => {
    await env.clearFirestore()
    await seed('admins/admin', { email: ADMIN.email, isIR: true })
    await seed('orders/o1', order(STUDENT))
    await seed('orders/draft', order(STUDENT, { status: 'draft' }))
    await seed('suppliers/s1', { name: 'RS', webpage: 'https://rs-online.com', hidden: false })
})

describe('email domain', () => {
    test('outsiders and look-alike domains cannot read anything', async () => {
        await assertFails(getDoc(doc(db(OUTSIDER), 'suppliers/s1')))
        await assertFails(getDoc(doc(db(LOOKALIKE), 'suppliers/s1')))
        await assertFails(addDoc(collection(db(OUTSIDER), 'orders'), order(OUTSIDER)))
    })

    test('unverified email is rejected', async () => {
        await assertFails(getDoc(doc(db(STUDENT, false), 'suppliers/s1')))
    })

    test('unauthenticated users are rejected', async () => {
        await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'suppliers/s1')))
    })

    test('both devinci domains are accepted', async () => {
        await assertSucceeds(getDoc(doc(db(STUDENT), 'suppliers/s1')))
        await assertSucceeds(getDoc(doc(db(OTHER), 'suppliers/s1')))
    })
})

describe('orders: reading', () => {
    test('owner reads own order and own-orders query', async () => {
        await assertSucceeds(getDoc(doc(db(STUDENT), 'orders/o1')))
        await assertSucceeds(getDocs(query(
            collection(db(STUDENT), 'orders'),
            where('requestedBy', '==', STUDENT.email),
            where('status', 'in', ['pendingIR', 'draft']),
        )))
    })

    test('other users cannot read it or list all orders', async () => {
        await assertFails(getDoc(doc(db(OTHER), 'orders/o1')))
        await assertFails(getDocs(collection(db(OTHER), 'orders')))
    })

    test('admin reads everything', async () => {
        await assertSucceeds(getDoc(doc(db(ADMIN), 'orders/o1')))
        await assertSucceeds(getDocs(collection(db(ADMIN), 'orders')))
    })
})

describe('orders: creating', () => {
    test('create own order as draft or pending', async () => {
        await assertSucceeds(addDoc(collection(db(STUDENT), 'orders'), order(STUDENT, { updates: [] })))
        await assertSucceeds(addDoc(collection(db(STUDENT), 'orders'), order(STUDENT, { updates: [], status: 'draft' })))
    })

    test('cannot create an already approved order', async () => {
        await assertFails(addDoc(collection(db(STUDENT), 'orders'), order(STUDENT, { updates: [], status: 'processingOrder' })))
    })

    test('cannot create an order in someone else\'s name', async () => {
        await assertFails(addDoc(collection(db(STUDENT), 'orders'), order(OTHER, { updates: [] })))
    })

    test('cannot pre-fill the history', async () => {
        await assertFails(addDoc(collection(db(STUDENT), 'orders'), order(STUDENT)))
    })
})

describe('orders: owner updates', () => {
    test('publish a draft', async () => {
        await assertSucceeds(updateDoc(doc(db(STUDENT), 'orders/draft'), { status: 'pendingIR' }))
    })

    test('cannot approve own order', async () => {
        await assertFails(updateDoc(doc(db(STUDENT), 'orders/o1'), { status: 'approvedIR', reviewIRBy: STUDENT.email }))
        await assertFails(updateDoc(doc(db(STUDENT), 'orders/o1'), { status: 'processingOrder' }))
    })

    test('cancel while pending, not once processing', async () => {
        await assertSucceeds(updateDoc(doc(db(STUDENT), 'orders/o1'), { status: 'cancelled', cancelledBy: STUDENT.email }))
        await seed('orders/o2', order(STUDENT, { status: 'processingOrder' }))
        await assertFails(updateDoc(doc(db(STUDENT), 'orders/o2'), { status: 'cancelled', cancelledBy: STUDENT.email }))
    })

    test('edit items only while pending review', async () => {
        const items = [{ type: 'item', name: 'Sheet', link: 'https://rs-online.com/b', quantity: '2', price: '3' }]
        const edit = { items, lastItemsUpdatedBy: STUDENT.email, ignoreItemsModification: false }
        await assertSucceeds(updateDoc(doc(db(STUDENT), 'orders/o1'), edit))
        await seed('orders/o2', order(STUDENT, { status: 'ordered' }))
        await assertFails(updateDoc(doc(db(STUDENT), 'orders/o2'), edit))
    })

    test('add a comment', async () => {
        await assertSucceeds(updateDoc(doc(db(STUDENT), 'orders/o1'), {
            updates: arrayUnion({ type: 'comment', date: new Date(), author: STUDENT.email, message: 'Thanks' }),
        }))
    })

    test('cannot comment as someone else or rewrite history', async () => {
        await assertFails(updateDoc(doc(db(STUDENT), 'orders/o1'), {
            updates: arrayUnion({ type: 'comment', date: new Date(), author: ADMIN.email, message: 'Approved' }),
        }))
        await assertFails(updateDoc(doc(db(STUDENT), 'orders/o1'), {
            updates: arrayUnion({ type: 'review-ir-approved', date: new Date(), author: STUDENT.email }),
        }))
        await assertFails(updateDoc(doc(db(STUDENT), 'orders/o1'), {
            updates: [{ type: 'comment', date: new Date(), author: STUDENT.email, message: 'History wiped' }],
        }))
    })

    test('cannot transfer ownership', async () => {
        await assertFails(updateDoc(doc(db(STUDENT), 'orders/o1'), { requestedBy: OTHER.email }))
    })

    test('other users cannot touch the order', async () => {
        await assertFails(updateDoc(doc(db(OTHER), 'orders/o1'), {
            updates: arrayUnion({ type: 'comment', date: new Date(), author: OTHER.email, message: 'Hi' }),
        }))
        await assertFails(updateDoc(doc(db(OTHER), 'orders/o1'), { status: 'cancelled', cancelledBy: OTHER.email }))
    })

    test('nobody deletes orders from the client', async () => {
        await assertFails(deleteDoc(doc(db(STUDENT), 'orders/o1')))
        await assertFails(deleteDoc(doc(db(ADMIN), 'orders/o1')))
    })
})

describe('orders: admin updates', () => {
    test('approve, request review, change item status', async () => {
        await assertSucceeds(updateDoc(doc(db(ADMIN), 'orders/o1'), { status: 'approvedIR', reviewIR: true, reviewIRBy: ADMIN.email }))
        await assertSucceeds(updateDoc(doc(db(ADMIN), 'orders/o1'), { lastReviewRequestTo: OTHER.email, lastReviewRequestDate: new Date() }))
        await assertSucceeds(updateDoc(doc(db(ADMIN), 'orders/o1'), { items: [], lastItemsUpdatedBy: ADMIN.email }))
    })

    test('cannot rewrite the owner', async () => {
        await assertFails(updateDoc(doc(db(ADMIN), 'orders/o1'), { requestedBy: ADMIN.email }))
    })
})

describe('reference data and admins', () => {
    test('only admins write suppliers, tags and inventory', async () => {
        for (const path of ['suppliers/s2', 'tags/t2', 'inventory_items/i1', 'inventory_categories/c1']) {
            await assertFails(setDoc(doc(db(STUDENT), path), { name: 'x' }))
            await assertSucceeds(setDoc(doc(db(ADMIN), path), { name: 'x' }))
        }
    })

    test('users read only their own admin doc', async () => {
        await assertSucceeds(getDoc(doc(db(STUDENT), 'admins/student')))
        await assertFails(getDoc(doc(db(STUDENT), 'admins/admin')))
        await assertFails(getDocs(collection(db(STUDENT), 'admins')))
        await assertSucceeds(getDocs(collection(db(ADMIN), 'admins')))
    })

    test('users cannot make themselves admin', async () => {
        await assertFails(setDoc(doc(db(STUDENT), 'admins/student'), { email: STUDENT.email, isIR: true }))
    })

    test('mail collection is closed to clients', async () => {
        await assertFails(addDoc(collection(db(ADMIN), 'mail'), { to: ['a@b.c'], message: {} }))
        await assertFails(getDocs(collection(db(ADMIN), 'mail')))
    })
})
