<script>
import { computed } from 'vue'
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


import { useToast } from "vue-toastification";


export default {
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
    setup() {
        const db = useFirestore()
        const tags = useCollection(
            query(
                collection(db, 'tags'),
                orderBy('name')
            )
        )

        const currentUser = useCurrentUser();

        // Rules only let admins write; this decides what to show once the admin record has loaded
        const userData = useDocument(computed(() => currentUser.value && doc(db, 'admins', currentUser.value.uid)));
        const isAdmin = computed(() => !!(userData.value && userData.value.isIR));

        const toast = useToast()

        return {
            tags, toast, isAdmin, userData
        }
    }
}
</script>

<template>
    <div class="center-column">
        <h1>Tags</h1>
    </div>

    <p v-if="!isAdmin" role="status">{{ userData === undefined ? 'Loading…' : 'Only research engineers can manage tags.' }}</p>

    <template v-else>
    <div class="table-scroll">
        <table class="data-table tags-table">
            <caption class="visually-hidden">Tags</caption>
            <thead>
                <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Type</th>
                    <th scope="col">Hidden</th>
                    <th scope="col"><span class="visually-hidden">Actions</span></th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="tag in tags" :key="tag.id">
                    <template v-if="tag.editing">
                        <td><input type="text" v-model="tag.newName" :aria-label="`Name of ${tag.name}`" /></td>
                        <td><input type="text" v-model="tag.newType" :aria-label="`Type of ${tag.name}`" /></td>
                    </template>
                    <template v-else>
                        <td>{{ tag.name }}</td>
                        <td>{{ tag.type }}</td>
                    </template>
                    <td>
                        <input type="checkbox" v-model="tag.hidden" v-on:change="changeHidden(tag)" :aria-label="`Hide ${tag.name}`" />
                    </td>
                    <td>
                        <div class="center-both" v-if="tag.editing">
                            <button type="button" class="icon-button" @click="saveTag(tag)" :aria-label="`Save ${tag.name}`" title="Save">
                                <span class="material-symbols-outlined" aria-hidden="true">save</span>
                            </button>
                            <button type="button" class="icon-button" @click="cancelEdit(tag)" :aria-label="`Cancel editing ${tag.name}`" title="Cancel">
                                <span class="material-symbols-outlined" aria-hidden="true">cancel</span>
                            </button>
                            <button type="button" class="icon-button red" @click="deleteTag(tag)" :aria-label="`Delete ${tag.name}`" title="Delete">
                                <span class="material-symbols-outlined" aria-hidden="true">delete</span>
                            </button>
                        </div>
                        <button v-else type="button" class="icon-button" @click="editTag(tag)" :aria-label="`Edit ${tag.name}`" title="Edit">
                            <span class="material-symbols-outlined" aria-hidden="true">edit</span>
                        </button>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>

    <form class="add-form" @submit.prevent="addTag()">
        <h2>Add a tag</h2>
        <div class="add-fields">
                <div class="add-field">
                    <label for="new-tag-name">Name</label>
                    <input id="new-tag-name" type="text" v-model="newTagName" required />
                </div>
                <div class="add-field">
                    <label for="new-tag-type">Type</label>
                    <input id="new-tag-type" type="text" v-model="newTagType" required />
                </div>
            <button type="submit" class="alt-button add-button">
                <span class="material-symbols-outlined" aria-hidden="true">add_circle</span>
                Add tag
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
