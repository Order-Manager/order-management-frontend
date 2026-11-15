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

import { tagsTypes, ORDER_CATEGORIES } from '../utils/definitions'


export default {
    methods: {
        addTag() {
            const db = useFirestore()

            if (!this.newTagName || !this.newTagType) {
                //TODO: Add error message
                return
            }

            const name = this.newTagName.trim()
            const type = this.newTagType
            addDoc(collection(db, 'tags'), {
                name,
                type,
                hidden: false
            })

            this.newTagName = ''
            this.newTagType = ''

            this.showSuccess(`Added to ${ORDER_CATEGORIES[type].label}: ${name}`)
        },
        changeHidden(tag) {
            const db = useFirestore()
            const tagRef = doc(db, 'tags', tag.id)

            if (tag.hidden) {
                this.showInfo(`Hidden: ${tag.name}`)
            } else {
                this.showInfo(`Shown again: ${tag.name}`)
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

            this.showSuccess(`Saved: ${tag.name}`)
        },
        cancelEdit(tag) {
            tag.editing = false;
        },
        deleteTag(tag) {
            const db = useFirestore()
            const tagRef = doc(db, 'tags', tag.id)
            deleteDoc(tagRef)

            this.showSuccess(`Deleted: ${tag.name}`)
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
            tags, toast, isAdmin, userData, tagsTypes, ORDER_CATEGORIES
        }
    }
}
</script>

<template>
    <div class="center-column">
        <h1>Categories</h1>
    </div>
    <p class="categories-intro">Every order says what it's for. These are the choices students get for each category; hide one to stop offering it without changing older orders.</p>

    <p v-if="!isAdmin" role="status">{{ userData === undefined ? 'Loading…' : 'Only referents can manage categories.' }}</p>

    <template v-else>
    <section v-for="(category, type) in ORDER_CATEGORIES" :key="type" class="category-section" :aria-labelledby="`category-${type}`">
        <h2 :id="`category-${type}`" class="section-title">
            <span class="material-symbols-outlined" aria-hidden="true">{{ category.icon }}</span>
            {{ category.label }}
            <span class="category-field">· {{ category.field }}<template v-if="category.allowOther">, or typed in by the student</template></span>
        </h2>
        <div class="table-scroll">
            <table class="data-table tags-table">
                <caption class="visually-hidden">{{ category.label }}: {{ category.field }}</caption>
                <thead>
                    <tr>
                        <th scope="col">Name</th>
                        <th scope="col">Hidden</th>
                        <th scope="col"><span class="visually-hidden">Actions</span></th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="tag in tags.filter(tag => tag.type === type)" :key="tag.id">
                        <td v-if="tag.editing">
                            <div class="tag-edit">
                                <input type="text" v-model="tag.newName" :aria-label="`Name of ${tag.name}`" />
                                <select v-model="tag.newType" :aria-label="`Category of ${tag.name}`">
                                    <option v-for="(other, key) in ORDER_CATEGORIES" :key="key" :value="key">{{ other.label }}</option>
                                </select>
                            </div>
                        </td>
                        <td v-else>{{ tag.name }}</td>
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
                    <tr v-if="!tags.some(tag => tag.type === type)">
                        <td colspan="3" class="empty-category">Nothing yet.</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </section>

    <form class="add-form" @submit.prevent="addTag()">
        <h2>Add a choice</h2>
        <div class="add-fields">
                <div class="add-field">
                    <label for="new-tag-type">Category</label>
                    <select id="new-tag-type" v-model="newTagType" required>
                        <option value="" disabled>Choose a category</option>
                        <option v-for="(category, key) in ORDER_CATEGORIES" :key="key" :value="key">{{ category.label }}</option>
                    </select>
                </div>
                <div class="add-field">
                    <label for="new-tag-name">Name</label>
                    <input id="new-tag-name" type="text" v-model="newTagName" maxlength="100" required />
                </div>
            <button type="submit" class="primary add-button">
                <span class="material-symbols-outlined" aria-hidden="true">add_circle</span>
                Add
            </button>
        </div>
    </form>
    </template>
</template>


<style>

.categories-intro {
    color: var(--text-muted);
    max-width: 48rem;
}

.category-section {
    margin-top: var(--space-6);
}

.category-field {
    color: var(--text-muted);
    font-weight: 400;
    font-size: 1rem;
}

.tag-edit {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
}

.empty-category {
    color: var(--text-muted);
}

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
