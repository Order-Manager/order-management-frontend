<script>
import Return from '../components/Return.vue'
import { useFirestore, useCurrentUser, useCollection, useDocument } from 'vuefire'

import {
    collection,
    addDoc,
    updateDoc,
    doc,
    query,
    where,
    orderBy,
    deleteDoc
} from 'firebase/firestore'

import {useRouter} from 'vue-router'

import { useToast } from "vue-toastification";


export default {
    components: {
        Return
    },
    methods: {
        addTag() {
            const db = useFirestore()

            if (!this.newTagName || !this.newTagType) {
                //TODO: Add error message
                return
            }

            addDoc(collection(db, 'tags'), {
                name: this.newTagName,
                type: this.newTagType,
                hidden: false
            })

            this.newTagName = ''
            this.newTagType = ''

            this.showSuccess('Tag added')
        },
        changeHidden(tag) {
            const db = useFirestore()
            const tagRef = doc(db, 'tags', tag.id)

            if (tag.hidden) {
                this.showInfo(`Tag hidden: ${tag.name} (${tag.type})`)
            } else {
                this.showInfo(`Tag shown: ${tag.name} (${tag.type})`)
            }

            updateDoc(tagRef, {
                hidden: tag.hidden
            })
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
        editTag(tag) {
            tag.editing = true;
            tag.newName = tag.name;
            tag.newType = tag.type;
        },
        saveTag(tag) {
            const db = useFirestore()
            const tagRef = doc(db, 'tags', tag.id)
            updateDoc(tagRef, {
                name: tag.newName,
                type: tag.newType
            })

            tag.name = tag.newName;
            tag.type = tag.newType;
            tag.editing = false;

            this.showSuccess(`Tag updated: ${tag.name} (${tag.type})`)
        },
        cancelEdit(tag) {
            tag.editing = false;
        },
        deleteTag(tag) {
            const db = useFirestore()
            const tagRef = doc(db, 'tags', tag.id)
            deleteDoc(tagRef)

            this.showSuccess(`Tag deleted: ${tag.name} (${tag.type})`)
        },
    },
    data() {
        return {
            newTagName: '',
            newTagType: ''
        }
    },
    props: {
        order_id: String,
    },
    setup() {
        const db = useFirestore()
        const tags = useCollection(
            query(
                collection(db, 'tags'),
                orderBy('name')
            )
        )

        const currentUser = useCurrentUser();

        if(currentUser.value == null) {
            const router = useRouter()
            router.push('/')
            return
        }

        const userData = useDocument(doc(db, 'admins', currentUser.value.uid));
        const isAdmin = userData.value != null && userData.value.isIR;

        if(!isAdmin) {
            const router = useRouter()
            router.push('/')
            return
        }

        const toast = useToast()

        return {
            tags, toast
        }
    }
}
</script>

<template>
    <Return />

    <div class="center-column">
        <h2>Tags Management</h2>
    </div>

    <div class="table">
        <div class="table-header tags-table">
            <p>Name</p>
            <p>Type</p>
            <p>Hide</p>
            <p>Edit</p>
        </div>
        <div class="table-row tags-table"
            v-for="tag in tags"
            :key="tag.id"
        >
            <template v-if="tag.editing">
                <input type="text" v-model="tag.newName" />
                <input type="text" v-model="tag.newType" />
                <div class="center-column center-both">
                    <input type="checkbox" style="margin: 0.5rem;" v-model="tag.hidden" v-on:change="changeHidden(tag)" />
                </div>
                <div class="center-row">
                    <span class="material-symbols-outlined clickable" @click="saveTag(tag)">save</span>
                    <span class="material-symbols-outlined clickable" @click="cancelEdit(tag)">cancel</span>
                    <span class="material-symbols-outlined clickable red" @click="deleteTag(tag)">delete</span>
                </div>
            </template>
            <template v-else>
                <p>{{ tag.name }}</p>
                <p>{{ tag.type }}</p>
                <div class="center-column center-both">
                    <input type="checkbox" v-model="tag.hidden" v-on:change="changeHidden(tag)" />
                </div>
                <div class="center-column">
                    <span class="material-symbols-outlined clickable" @click="editTag(tag)">edit</span>
                </div>
            </template>
        </div>
    </div>

    <div class="full-width center-column">
        <div class="full-width center-row single-row" style="width: fit-content;">
            <h3>Add a tag:</h3>
            <input type="text" v-model="newTagName" placeholder="Tag Name" required/>
            <input type="text" v-model="newTagType" placeholder="Tag Type" required/>
            <span class="material-symbols-outlined" id="add-item" v-on:click="addTag()">
                add_circle
            </span>
        </div>
    </div>
</template>


<style>

.tags-table {
    border: 3px solid transparent !important;
    grid-template-columns: 1fr 1fr 5rem 8rem;
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
