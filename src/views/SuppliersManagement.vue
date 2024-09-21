<script>
import Return from '../components/Return.vue'
import { useFirestore, useCurrentUser, useCollection, useDocument } from 'vuefire'
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";

import {useRouter} from 'vue-router'

import { useToast } from "vue-toastification";

export default {
    components: {
        Return
    },
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
    props: {
        order_id: String,
    },
    setup() {
        const db = useFirestore()
        const suppliers = useCollection(collection(db, 'suppliers'))

        const currentUser = useCurrentUser();

        if(currentUser.value == null) {
            const router = useRouter()
            router.push('/')
            return
        }

        const userData = useDocument(doc(db, 'admins', currentUser.value.uid));
        const isAdmin = userData.value != null && (userData.value.isPI || userData.value.isIR);

        if(!isAdmin) {
            const router = useRouter()
            router.push('/')
            return
        }

        const toast = useToast();

        return {
            suppliers, toast
        }
    }
}
</script>

<template>
    <Return />

    <div class="center-column">
        <h2>Suppliers Management</h2>
    </div>

    <div id="suppliers-list" class="table">
        <div class="table-header suppliers-table">
            <p>Name</p>
            <p>Link</p>
            <p>Hide</p>
        </div>
        <div class="table-row suppliers-table"
            v-for="supplier in suppliers"
            :key="supplier.id"
        >
            <p>{{ supplier.name }}</p>
            <a :href="supplier.webpage">{{ supplier.webpage }}</a>
            <div class="center-column" >
                <input type="checkbox" v-model="supplier.hidden" v-on:change="changeHidden(supplier)"/>
            </div>
        </div>
    </div>

    <div class="full-width center-column">
        <div class="full-width center-row single-row" style="width: fit-content;">
            <h3>Add a Supplier:</h3>
            <input type="text" v-model="newSupplierName" placeholder="Supplier Name" required/>
            <input type="url" v-model="newSupplierWebpage" placeholder="Supplier Webpage" required/>
            <span class="material-symbols-outlined" id="add-item" v-on:click="addSupplier()">
                add_circle
            </span>
        </div>
    </div>
</template>


<style>

.suppliers-table {
    border: 3px solid transparent !important;
    grid-template-columns: 1fr 1fr 5rem;
    cursor: initial !important;
}

.table .table-row * {
    padding: 0.5rem;
    min-width: 0;
    margin: 0 0.5rem;
}

.table .table-row input[type="checkbox"] {
    width: 1rem;
}

</style>
