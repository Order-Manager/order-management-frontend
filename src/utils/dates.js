// Human dates: relative while recent ("5 min ago", "Yesterday, 16:18"), absolute after a week ("23 Oct 2026")

const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });
const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long' });
const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const full = new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'short' });

export function toDate(value) {
    if (!value) return null;
    return typeof value.toDate === 'function' ? value.toDate() : new Date(value);
}

function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function relativeDate(value, now = new Date()) {
    const date = toDate(value);
    if (!date) return '';
    const minutes = Math.round((now - date) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    const days = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
    if (days === 0) return `${Math.floor(minutes / 60)} h ago`;
    if (days === 1) return `Yesterday, ${time.format(date)}`;
    if (days < 7) return `${weekday.format(date)}, ${time.format(date)}`;
    return day.format(date);
}

export function fullDate(value) {
    const date = toDate(value);
    return date ? full.format(date) : '';
}

export function isoDate(value) {
    const date = toDate(value);
    return date ? date.toISOString() : '';
}

const euros = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: 3 });

export function formatEuros(amount) {
    return euros.format(Number.isFinite(amount) ? amount : 0);
}

// Items store quantity and price as strings
export function orderTotal(items) {
    return (items || []).reduce((sum, item) => sum + (parseFloat(item.price) || 0) * (parseFloat(item.quantity) || 0), 0);
}
