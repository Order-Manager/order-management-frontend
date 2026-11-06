<script setup>
// Invoice PDFs for an order, for staff only. Files live on the orders-files service; the order's
// `invoices` array (updated by that service) lists them, so this list stays live with the order.
import { computed, ref } from 'vue'
import { getAuth } from 'firebase/auth'
import RelativeTime from './RelativeTime.vue'

const props = defineProps({
    order: Object,
    orderId: String,
})

const FILES_URL = import.meta.env.VITE_FILES_URL || '/orders-files'
const MAX_MB = 20

const invoices = computed(() => props.order.invoices || [])
const busy = ref(false)
const status = ref('')
const error = ref('')
const fileInput = ref(null)
const deleteDialog = ref(null)
const toDelete = ref(null)

async function call(method, path, body) {
    const token = await getAuth().currentUser.getIdToken()
    const response = await fetch(`${FILES_URL}/orders/${props.orderId}/invoices${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body,
    })
    if (!response.ok) {
        const detail = await response.json().catch(() => ({}))
        throw new Error(detail.detail || `The file service answered ${response.status}.`)
    }
    return response
}

async function upload(event) {
    const files = [...event.target.files]
    if (!files.length) return
    error.value = ''
    const tooBig = files.find(file => file.size > MAX_MB * 1024 * 1024)
    if (tooBig) {
        error.value = `${tooBig.name} is larger than ${MAX_MB} MB.`
        event.target.value = ''
        return
    }
    const form = new FormData()
    files.forEach(file => form.append('files', file))
    busy.value = true
    status.value = `Uploading ${files.length} file${files.length === 1 ? '' : 's'}…`
    try {
        await call('POST', '', form)
        status.value = `${files.length} invoice${files.length === 1 ? '' : 's'} added.`
    } catch (e) {
        status.value = ''
        error.value = e.message
    } finally {
        busy.value = false
        event.target.value = ''
    }
}

async function download(invoice) {
    error.value = ''
    try {
        const response = await call('GET', `/${invoice.id}`)
        const url = URL.createObjectURL(await response.blob())
        const link = document.createElement('a')
        link.href = url
        link.download = invoice.name
        link.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) {
        error.value = e.message
    }
}

function askDelete(invoice) {
    toDelete.value = invoice
    deleteDialog.value.showModal()
}

async function confirmDelete() {
    busy.value = true
    error.value = ''
    try {
        await call('DELETE', `/${toDelete.value.id}`)
        status.value = `${toDelete.value.name} deleted.`
        deleteDialog.value.close()
    } catch (e) {
        error.value = e.message
    } finally {
        busy.value = false
    }
}

function size(bytes) {
    return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
</script>

<template>
    <section class="invoices" aria-labelledby="invoices-title">
        <h2 id="invoices-title" class="section-title">
            <span class="material-symbols-outlined" aria-hidden="true">receipt_long</span>
            Invoices <span class="group-count">{{ invoices.length }}</span>
        </h2>

        <ul v-if="invoices.length" class="invoice-list">
            <li v-for="invoice in invoices" :key="invoice.id">
                <span class="material-symbols-outlined invoice-icon" aria-hidden="true">picture_as_pdf</span>
                <span class="invoice-text">
                    <span class="invoice-name" :title="invoice.name">{{ invoice.name }}</span>
                    <span class="invoice-meta">{{ size(invoice.size) }} · {{ invoice.uploadedBy }} · <RelativeTime :value="invoice.uploadedAt" /></span>
                </span>
                <span class="invoice-actions">
                    <button type="button" @click="download(invoice)">
                        Download<span class="visually-hidden"> {{ invoice.name }}</span>
                    </button>
                    <button type="button" class="icon-button red" :aria-label="`Delete ${invoice.name}`" title="Delete" :disabled="busy" @click="askDelete(invoice)">
                        <span class="material-symbols-outlined" aria-hidden="true">delete</span>
                    </button>
                </span>
            </li>
        </ul>
        <p v-else class="invoices-empty">No invoices yet.</p>

        <div class="invoice-upload">
            <label for="invoice-files" class="button-link" :class="{ disabled: busy }">
                <span class="material-symbols-outlined" aria-hidden="true">upload_file</span>
                Add invoices
            </label>
            <input
                id="invoice-files"
                ref="fileInput"
                class="visually-hidden"
                type="file"
                accept="application/pdf"
                multiple
                :disabled="busy"
                aria-describedby="invoice-hint"
                @change="upload"
            />
            <p id="invoice-hint" class="field-hint">PDF only, up to {{ MAX_MB }} MB each. You can pick several files.</p>
        </div>
        <p class="field-hint" role="status">{{ status }}</p>
        <p class="field-error" role="alert">{{ error }}</p>

        <dialog ref="deleteDialog" class="dialog" aria-labelledby="delete-invoice-title">
            <form @submit.prevent="confirmDelete()">
                <h2 id="delete-invoice-title">Delete this invoice?</h2>
                <p>{{ toDelete && toDelete.name }} will be removed from the order and from the server.</p>
                <div class="dialog-actions">
                    <button type="button" @click="deleteDialog.close()">Keep it</button>
                    <button type="submit" class="danger" :disabled="busy">Delete invoice</button>
                </div>
            </form>
        </dialog>
    </section>
</template>

<style>
.invoices {
    margin: var(--space-6) 0;
}

.invoice-list {
    margin: 0;
    padding: 0;
    list-style: none;
    border-radius: var(--radius);
    border: 1px solid var(--border-muted);
    background-color: var(--bg);
}

.invoice-list li {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
}

.invoice-list li + li {
    border-top: 1px solid var(--border-muted);
}

.invoice-icon {
    color: var(--red);
}

.invoice-text {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
}

.invoice-name {
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.invoice-meta {
    font-size: var(--font-sm);
    color: var(--text-muted);
    overflow-wrap: anywhere;
}

.invoice-actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
}

.invoices-empty {
    margin: 0;
}

.invoice-upload {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3);
    margin-top: var(--space-4);
}

.invoice-upload .button-link {
    gap: var(--space-2);
    cursor: pointer;
}

.invoice-upload .button-link.disabled {
    opacity: 0.6;
    pointer-events: none;
}

/* The real file input is hidden; show its focus on the label that stands in for it */
.invoice-upload:has(input:focus-visible) .button-link {
    outline: 3px solid var(--focus);
    outline-offset: 2px;
}

.invoice-upload .field-hint {
    margin: 0;
}
</style>
