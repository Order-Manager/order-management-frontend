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
        methods: {
            openTab(type) {
                const tabs = document.getElementsByClassName('tag-tab')
                for (let tab of tabs) {
                    tab.style.display = 'none'
                }
                document.getElementById(type).style.display = 'flex'

                const buttons = document.getElementsByClassName('tag-type-button')
                for (let button of buttons) {
                    button.classList.remove('alt-button')
                }
                document.getElementById(type + '-type-button').classList.add('alt-button')
            },
            toggleTag(tag, type) {
                const index = this.selectedTags.indexOf(tag)
                const button = document.getElementById(type + '-' + tag.id + '-name-button')
                if (index === -1) {
                    this.selectedTags.push(tag)
                    button.classList.add('alt-button')
                } else {
                    this.selectedTags.splice(index, 1)
                    button.classList.remove('alt-button')
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
        mounted() {
            this.openTab('project');
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
    <div id="tags-types-div">
        <button v-for="type in tagsTypes" :key="type" v-on:click="openTab(type)" class="tag-type-button" :id="type + '-type-button'">{{ type }}</button>
    </div>
    <div v-for="type in tagsTypes" :key="type" :id="type" class="tag-tab">
        <button v-for="tag in tags.filter(tag => (tag.type === type) && (!tag.hidden))" :key="tag.id" class="tag-button" v-on:click="toggleTag(tag, type)" :id="type + '-' + tag.id + '-name-button'">{{ tag.name }}</button>
    </div>
</template>


<style>

    .tag-tab {
        display: none;
        padding: 0.5rem 0;
        gap: 0.5rem;
    }

    #tags-types-div {
        display: flex;
        flex-direction: row;
        margin-top: 0.5rem;
        width: 100%;
        border-radius: 0.5rem;
        overflow: hidden;
    }

    #tags-types-div > button {
        border-radius: 0;
        width: 100%;
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
