<script>
    import {
        useCollection,
        useFirestore
    } from 'vuefire'

    import {
        collection,
        orderBy,
        query
    } from 'firebase/firestore'

    import { tagsTypes } from '../utils/definitions'

    export default {
        data() {
            return {
                activeType: 'project'
            }
        },
        methods: {
            isSelected(tag) {
                return this.selectedTags.some(selected => selected.id === tag.id)
            },
            toggleTag(tag) {
                const index = this.selectedTags.findIndex(selected => selected.id === tag.id)
                if (index === -1) {
                    this.selectedTags.push(tag)
                } else {
                    this.selectedTags.splice(index, 1)
                }
            }
        },
        setup() {
            const db = useFirestore()
            const tags = useCollection(query(collection(db, 'tags'), orderBy('name')))

            return {
                tags, tagsTypes
            }
        },
        props: {
            selectedTags: {
                type: Array,
                default: () => []
            }
        },
    }
</script>

<template>
    <div id="tags-types-div" role="group" aria-label="Tag type">
        <button
            v-for="type in tagsTypes"
            :key="type"
            type="button"
            class="tag-type-button"
            :class="{ 'alt-button': activeType === type }"
            :aria-pressed="activeType === type"
            @click="activeType = type"
        >{{ type }}</button>
    </div>
    <div class="tag-tab" role="group" :aria-label="`${activeType} tags`">
        <button
            v-for="tag in tags.filter(tag => (tag.type === activeType) && (!tag.hidden))"
            :key="tag.id"
            type="button"
            class="tag-button"
            :class="{ 'alt-button': isSelected(tag) }"
            :aria-pressed="isSelected(tag)"
            @click="toggleTag(tag)"
        >
            <span class="material-symbols-outlined tag-check" aria-hidden="true" v-if="isSelected(tag)">check</span>
            {{ tag.name }}
        </button>
    </div>
</template>


<style>

    .tag-tab {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        padding: 0.5rem 0;
        gap: 0.5rem;
    }

    .tag-button {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        min-height: 2.75rem;
    }

    .tag-check {
        font-size: 1.1rem;
    }

    #tags-types-div {
        display: flex;
        flex-direction: row;
        margin-top: 0.5rem;
        width: 100%;
        border-radius: 0.5rem;
    }

    #tags-types-div > button {
        border-radius: 0;
        width: 100%;
        min-height: 2.75rem;
        text-transform: capitalize;
    }

    #tags-types-div > button:first-child {
        border-top-left-radius: 0.5rem;
        border-bottom-left-radius: 0.5rem;
    }

    #tags-types-div > button:last-child {
        border-top-right-radius: 0.5rem;
        border-bottom-right-radius: 0.5rem;
    }
</style>
