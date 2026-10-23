<script>
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import { useCollection, useFirestore } from "vuefire";
import { collection, doc, updateDoc } from "firebase/firestore";

export default {
    methods: {
        returnToInventory() {
            this.$router.push("/inventory");
        },
        addQuantity(item) {
            item.quantity++;
            // Update the item in Firestore
            const db = useFirestore();
            const itemRef = doc(db, "inventory_items", item.id);
            updateDoc(itemRef, {
                quantity: item.quantity,
            })
        },
        removeQuantity(item) {
            if (item.quantity > 0) {
                item.quantity--;
                // Update the item in Firestore
                const db = useFirestore();
                const itemRef = doc(db, "inventory_items", item.id);
                updateDoc(itemRef, {
                    quantity: item.quantity,
                })
            }
        },
        goToItem(item) {
            this.$router.push(`/inventory/item/${item.id}`);
        },
    },
    setup() {
        const db = useFirestore();
        const route = useRoute();
        const categoryId = route.params.id;

        const allItems = useCollection(collection(db, "inventory_items"));
        const categories = useCollection(collection(db, "inventory_categories"));
        const searchQuery = ref("");

        // Find the selected category
        const selectedCategory = computed(() =>
        categories.value.find((cat) => cat.id === categoryId)
        );

        // Items for this category or all
        const filteredItems = computed(() => {
        let items = [];
        if (categoryId === "all") {
            items = allItems.value;
        } else if (selectedCategory.value && selectedCategory.value.items) {
            items = selectedCategory.value.items;
        }
        // Filter by search
        return items.filter(
            (item) =>
            item.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
            item.description.toLowerCase().includes(searchQuery.value.toLowerCase())
        );
        });

        return { selectedCategory, filteredItems, searchQuery, categoryId };
    },
};
</script>

<template>
  <div class="item-view">
    <div class="center-row medium-gap">
      <button type="button" class="icon-button" @click="returnToInventory" aria-label="Back to inventory">
        <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>
      </button>
      <h1 v-if="categoryId === 'all'">All Inventory Items</h1>
      <h1 v-else>{{ selectedCategory?.name || "Category" }}</h1>
    </div>
    <p v-if="categoryId !== 'all'">{{ selectedCategory?.description }}</p>
    <div class="search-bar">
      <label for="inventory-search" class="visually-hidden">Search items</label>
      <input
        id="inventory-search"
        type="search"
        v-model="searchQuery"
        placeholder="Search items..."
      />
    </div>

    <div class="table" id="orders">
        <div class="table-header inventorylist-table">
            <p>Image</p>
            <p>Name</p>
            <p>Description</p>
            <p>Price</p>
            <p>Quantity</p>
            <p>Suppliers</p>
        </div>
        <div
            class="table-row inventorylist-table"
            v-for="item in filteredItems"
            :key="item.id"
            @click="goToItem(item)"
        >
            <img :src="item.image" alt="" />
            <p><router-link :to="`/inventory/item/${item.id}`" @click.stop>{{ item.name }}</router-link></p>
            <p>{{ item.description }}</p>
            <p>{{ item.price }}€</p>
            <div class="center-both">
                <button type="button" class="icon-button" @click.stop="removeQuantity(item)" :aria-label="`One less ${item.name}`">
                    <span class="material-symbols-outlined" aria-hidden="true">remove</span>
                </button>
                <p aria-live="polite">{{ item.quantity }}</p>
                <button type="button" class="icon-button" @click.stop="addQuantity(item)" :aria-label="`One more ${item.name}`">
                    <span class="material-symbols-outlined" aria-hidden="true">add</span>
                </button>
            </div>
            <div>
                <p
                    v-for="sup in item.suppliers"
                    :key="sup.id"
                >
                    {{ sup.name }}
                </p>
            </div>
        </div>
    </div>

  </div>
</template>

<style>

.item-view {
  padding: 1rem;
}

.search-bar {
  margin-bottom: 1rem;
}

.search-bar input {
  width: 100%;
  padding: 0.5rem;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.inventorylist-table {
    grid-template-columns: 88px 2fr 3fr 8rem 2fr 2fr;
}

.inventorylist-table:first-child {
    padding: 0;
}

.inventorylist-table img {
  width: 80px;
  height: 80px;
  object-fit: contain;
  border-radius: 4px;
  flex-shrink: 0;
  background: #f4f4f5;
}
</style>
