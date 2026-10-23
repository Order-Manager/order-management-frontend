<script>
import { computed } from 'vue'
import { useFirestore, useCurrentUser, useCollection, useDocument } from 'vuefire'
import {
    collection,
    addDoc, doc,
    updateDoc,
    deleteDoc,
    query,
    orderBy
} from "firebase/firestore";


import { useToast } from "vue-toastification";

export default {
    methods: {
        addSupplier() {
            const db = useFirestore()

            if (!this.newSupplierName || !this.newSupplierWebpage) {
                //TODO: Add error message
                return
            }

            addDoc(collection(db, 'suppliers'), {
                name: this.newSupplierName,
                webpage: this.newSupplierWebpage,
                hidden: false
            })

            this.showSuccess(`Supplier added: ${this.newSupplierName}`)

            this.newSupplierName = ''
            this.newSupplierWebpage = ''
        },
        changeHidden(supplier) {
            const db = useFirestore()
            const supplierRef = doc(db, 'suppliers', supplier.id)
            updateDoc(supplierRef, {
                hidden: supplier.hidden
            })

            if (supplier.hidden) {
                this.showInfo(`Supplier hidden: ${supplier.name}`)
            } else {
                this.showInfo(`Supplier shown: ${supplier.name}`)
            }
        },
        editSupplier(supplier) {
            supplier.editing = true;
            supplier.newName = supplier.name;
            supplier.newWebpage = supplier.webpage;
        },
        saveSupplier(supplier) {
            const db = useFirestore()
            const supplierRef = doc(db, 'suppliers', supplier.id)
            updateDoc(supplierRef, {
                name: supplier.newName,
                webpage: supplier.newWebpage
            })

            supplier.name = supplier.newName;
            supplier.webpage = supplier.newWebpage;
            supplier.editing = false;

            this.showSuccess(`Supplier updated: ${supplier.name}`)
        },
        cancelEdit(supplier) {
            supplier.editing = false;
        },
        deleteSupplier(supplier) {
            const db = useFirestore()
            const supplierRef = doc(db, 'suppliers', supplier.id)
            deleteDoc(supplierRef)

            this.showSuccess(`Supplier deleted: ${supplier.name}`)
        },
        showError(message) {
            this.toast.error(message);
        },
        showSuccess(message) {
            this.toast.success(message);
        },
        showWarning(message) {
            this.toast.warning(message);
        },
        showInfo(message) {
            this.toast.info(message);
        },
    },
    data() {
        return {
            newSupplierName: '',
            newSupplierWebpage: ''
        }
    },
    setup() {
        const db = useFirestore()
        const suppliers = useCollection(
            query(
                collection(db, 'suppliers'),
                orderBy('name')
            )
        )

        const currentUser = useCurrentUser();

        // Rules only let admins write; this decides what to show once the admin record has loaded
        const userData = useDocument(computed(() => currentUser.value && doc(db, 'admins', currentUser.value.uid)));
        const isAdmin = computed(() => !!(userData.value && userData.value.isIR));

        const toast = useToast();

        return {
            suppliers, toast, isAdmin, userData
        }
    }
}
</script>

<template>
    <div class="center-column">
        <h1>Suppliers</h1>
    </div>

    <p v-if="!isAdmin" role="status">{{ userData === undefined ? 'Loading…' : 'Only research engineers can manage suppliers.' }}</p>

    <template v-else>
    <div class="table-scroll">
        <table class="data-table suppliers-table">
            <caption class="visually-hidden">Suppliers</caption>
            <thead>
                <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Website</th>
                    <th scope="col">Hidden</th>
                    <th scope="col"><span class="visually-hidden">Actions</span></th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="supplier in suppliers" :key="supplier.id">
                    <template v-if="supplier.editing">
                        <td><input type="text" v-model="supplier.newName" :aria-label="`Name of ${supplier.name}`" /></td>
                        <td><input type="url" v-model="supplier.newWebpage" :aria-label="`Website of ${supplier.name}`" /></td>
                    </template>
                    <template v-else>
                        <td>{{ supplier.name }}</td>
                        <td><a :href="supplier.webpage" target="_blank" rel="noopener">{{ supplier.webpage }}</a></td>
                    </template>
                    <td>
                        <input type="checkbox" v-model="supplier.hidden" v-on:change="changeHidden(supplier)" :aria-label="`Hide ${supplier.name}`" />
                    </td>
                    <td>
                        <div class="center-both" v-if="supplier.editing">
                            <button type="button" class="icon-button" @click="saveSupplier(supplier)" :aria-label="`Save ${supplier.name}`" title="Save">
                                <span class="material-symbols-outlined" aria-hidden="true">save</span>
                            </button>
                            <button type="button" class="icon-button" @click="cancelEdit(supplier)" :aria-label="`Cancel editing ${supplier.name}`" title="Cancel">
                                <span class="material-symbols-outlined" aria-hidden="true">cancel</span>
                            </button>
                            <button type="button" class="icon-button red" @click="deleteSupplier(supplier)" :aria-label="`Delete ${supplier.name}`" title="Delete">
                                <span class="material-symbols-outlined" aria-hidden="true">delete</span>
                            </button>
                        </div>
                        <button v-else type="button" class="icon-button" @click="editSupplier(supplier)" :aria-label="`Edit ${supplier.name}`" title="Edit">
                            <span class="material-symbols-outlined" aria-hidden="true">edit</span>
                        </button>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>

    <form class="add-form" @submit.prevent="addSupplier()">
        <h2>Add a supplier</h2>
        <div class="add-fields">
                <div class="add-field">
                    <label for="new-supplier-name">Name</label>
                    <input id="new-supplier-name" type="text" v-model="newSupplierName" required />
                </div>
                <div class="add-field">
                    <label for="new-supplier-webpage">Website</label>
                    <input id="new-supplier-webpage" type="url" v-model="newSupplierWebpage" required />
                </div>
            <button type="submit" class="primary add-button">
                <span class="material-symbols-outlined" aria-hidden="true">add_circle</span>
                Add supplier
            </button>
        </div>
    </form>
    </template>
</template>


<style>

.add-form {
    margin-top: 2rem;
}

.add-form h2 {
    margin: 0 0 0.5rem 0;
}

.add-fields {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 1rem;
}

.add-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.add-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 2.75rem;
}

</style>
