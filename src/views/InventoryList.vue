<!-- filepath: /home/thomas/Projects/order-management-platform/src/views/ItemView.vue -->
<script>
import { ref, computed } from "vue";
import { useCollection, useFirestore, useCurrentUser, useDocument } from "vuefire";
import { collection, doc, query, where, orderBy } from "firebase/firestore";
import { useRouter } from "vue-router";

export default {
  setup() {
    const db = useFirestore();
    const categories = useCollection(collection(db, "inventory_categories"));
    const allItems = useCollection(collection(db, "inventory_items"));
    const router = useRouter();

    // Search query for filtering items
    const searchQuery = ref("");

    // Filtered items for each category
    const getFilteredItems = (category) => {
      if (!category.items || !category.items.length) return [];
      return category.items
        .map((itemRef) =>
          allItems.value.find((item) => itemRef.path === `/inventory_items/${item.id}`)
        )
        .filter(
          (item) =>
            item &&
            (item.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
              item.description.toLowerCase().includes(searchQuery.value.toLowerCase()))
        );
    };

    // Filtered items for "All Items" view
    const filteredAllItems = computed(() =>
      allItems.value.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.value.toLowerCase())
      )
    );

    // Go to category page
    const goToCategory = (id) => {
      router.push(`/inventory/category/${id}`);
    };

    // Go to "All" page
    const goToAll = () => {
      router.push(`/inventory/category/all`);
    };

    return {
      categories,
      allItems,
      searchQuery,
      getFilteredItems,
      filteredAllItems,
      goToCategory,
      goToAll
    };
  },
};
</script>

<template>
  <div class="item-view">
    <h1>Inventory</h1>

    <!-- Search bar -->
    <div class="search-bar">
      <label for="inventory-search" class="visually-hidden">Search items</label>
      <input
        id="inventory-search"
        type="search"
        v-model="searchQuery"
        placeholder="Search items..."
      />
    </div>

    <!-- "All Items" view -->
    <div class="category-card">
      <h2>All Items</h2>
      <div class="items-list">
        <div v-for="item in filteredAllItems" :key="item.id" class="item-card">
          <img :src="item.image" :alt="item.name" />
          <h3>{{ item.name }}</h3>
          <p>{{ item.description }}</p>
          <p>Price: €{{ item.price }}</p>
        </div>
      </div>
    </div>

    <!-- Categories -->
    <div class="categories">
      <router-link
        v-for="category in categories"
        :key="category.id"
        class="category-card"
        :to="`/inventory/category/${category.id}`"
      >
        <img
          v-if="category.items && category.items.length"
          :src="category.items[0]?.image || ''"
          alt=""
        />
        <h2>{{ category.name }}</h2>
        <p>{{ category.description }}</p>
      </router-link>
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

.categories {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.category-card {
  display: block;
  color: inherit;
  text-decoration: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem;
  width: 100%;
  max-width: 300px;
  text-align: center;
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.category-card:hover {
  box-shadow: 0 2px 8px #aaa;
}

.category-card img {
  width: 100%;
  height: auto;
  border-radius: 4px;
}

.all-card {
  background: #f4f4f5;
  font-weight: bold;
}

.items-list {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.item-card {
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
}

.item-card img {
  width: 100%;
  height: auto;
  border-radius: 4px;
}
</style>
