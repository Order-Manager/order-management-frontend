// The parts catalogue (catalog/{id}) and the cart students fill from it. An order has one supplier,
// so the cart is grouped by supplier and each group becomes its own order.
import { computed, reactive, watch } from 'vue'

export const CATALOG_CATEGORIES = [
    'Microcontrollers',
    'Sensors',
    'Actuators and output',
    'ICs and drivers',
    'Transistors and passives',
    'Prototyping',
    'Batteries',
    'Consumables',
    'Kit supplies',
]

// A rough idea of what the lab has, set by referents by eye (no counts). Parts without one are unknown.
export const STOCK_LEVELS = {
    high: { label: 'In stock', icon: 'inventory_2', color: 'green', item: 'Probably in stock at the lab' },
    low: { label: 'Low stock', icon: 'warning', color: 'orange', item: 'Low stock at the lab: maybe a few left' },
    none: { label: 'Out of stock', icon: 'block', color: 'grey', item: 'Not in stock at the lab' },
}

// Links compared the way they point to the same product: Amazon by product code, others without
// the protocol, "www." or a trailing slash
export function normalizeLink(link) {
    const text = (link || '').trim()
    const asin = text.match(/amazon\.[a-z.]+\/(?:.*\/)?(?:dp|gp\/product)\/([A-Z0-9]{10})/i)
    if (asin) return `amazon/${asin[1].toUpperCase()}`
    return text.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('#')[0].replace(/\/+$/, '')
}

// For each item of an order, the catalogue part with the same link, if any
export function partsByLink(parts) {
    const map = new Map()
    for (const part of parts) if (part.link) map.set(normalizeLink(part.link), part)
    return map
}

// How a part is named in an order's items
export function partLabel(part) {
    return part.note ? `${part.name} (${part.note})` : part.name
}

export function matchesSearch(part, search) {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return [part.name, part.note, part.category, part.supplier].some(text => (text || '').toLowerCase().includes(q))
}

// Categories in the usual order, then any new ones a referent typed
export function sortParts(parts) {
    const rank = (category) => {
        const i = CATALOG_CATEGORIES.indexOf(category)
        return i === -1 ? CATALOG_CATEGORIES.length : i
    }
    return [...parts].sort((a, b) =>
        rank(a.category) - rank(b.category) || (a.category || '').localeCompare(b.category || '') || a.name.localeCompare(b.name))
}

export function groupByCategory(parts) {
    const groups = []
    for (const part of sortParts(parts)) {
        const category = part.category || 'Other'
        if (groups.at(-1)?.category !== category) groups.push({ category, parts: [] })
        groups.at(-1).parts.push(part)
    }
    return groups
}

// Same check as the order form: item links must be on the supplier's website
export function linkMatchesSupplier(link, webpage) {
    const strip = (url) => url.trim().split("https://www.").slice(-1)[0].split("https://").slice(-1)[0]
    return strip(link).startsWith(strip(webpage || ''))
}

// The item a part becomes in an order
export function partToItem(part, quantity = 1) {
    return { type: 'item', name: partLabel(part), link: part.link, quantity, price: Number(part.price) || 0 }
}

// --- Cart: kept in this browser only, until the orders are created ---

const CART_KEY = 'partsCart'

function load() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || [] } catch (e) { return [] }
}

// Each line: { partId, name, note, supplier, link, price, quantity }
export const cart = reactive(load())

watch(cart, () => {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)) } catch (e) {}
}, { deep: true })

export const cartCount = computed(() => cart.reduce((sum, line) => sum + Number(line.quantity || 0), 0))

export const cartBySupplier = computed(() => {
    const groups = []
    for (const line of cart) {
        let group = groups.find(g => g.supplier === line.supplier)
        if (!group) groups.push(group = { supplier: line.supplier, lines: [] })
        group.lines.push(line)
    }
    return groups
})

export function cartLine(partId) {
    return cart.find(line => line.partId === partId)
}

export function addToCart(part) {
    const line = cartLine(part.id)
    if (line) {
        line.quantity = Number(line.quantity) + 1
        return
    }
    const { name, note, supplier, link, price } = part
    cart.push({ partId: part.id, name, note: note || '', supplier, link, price: Number(price) || 0, quantity: 1 })
}

export function setCartQuantity(partId, quantity) {
    const index = cart.findIndex(line => line.partId === partId)
    if (index === -1) return
    if (quantity > 0) cart[index].quantity = quantity
    else cart.splice(index, 1)
}

export function removeSupplierFromCart(supplier) {
    for (let i = cart.length - 1; i >= 0; i--) {
        if (cart[i].supplier === supplier) cart.splice(i, 1)
    }
}
