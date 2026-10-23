<script>
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDocument, useCollection, useFirestore } from "vuefire";
import { doc, updateDoc, collection, query, where, orderBy } from "firebase/firestore";

export default {
  setup() {
    const db = useFirestore();
    const route = useRoute();
    const router = useRouter();
    const itemId = route.params.id;

    const itemRef = computed(() => doc(db, "inventory_items", itemId));
    const item = useDocument(itemRef);

    // Editable fields
    const name = ref("");
    const description = ref("");
    const price = ref(0);
    const image = ref("");
    const quantity = ref(0);

    // Suppliers
    const allSuppliers = useCollection(
        query(
            collection(db, 'suppliers'),
            where('hidden', '!=', true),
            orderBy('name')
        )
    );
    const selectedSuppliers = ref([]);

    // Populate fields when item loads
    const initialized = ref(false);
    watch(
      () => item.value,
      (val) => {
        if (val && !initialized.value) {
          name.value = val.name || "";
          description.value = val.description || "";
          price.value = val.price || 0;
          image.value = val.image || "";
          quantity.value = val.quantity || 0;
          selectedSuppliers.value = val.suppliers ? val.suppliers : [];
          initialized.value = true;
        }
      },
      { immediate: true }
    );

    // Save changes
    const saveChanges = async () => {
      if (!itemId) return;
      // Save supplier references as DocumentReferences
      const supplierRefs = selectedSuppliers.value.map(
        id => doc(db, "suppliers", id)
      );
      await updateDoc(itemRef.value, {
        name: name.value,
        description: description.value,
        price: price.value,
        image: image.value,
        quantity: quantity.value,
        suppliers: supplierRefs,
      });
      alert("Item updated!");
    };

    // Go back
    const goBack = () => router.back();

    return {
      item,
      name,
      description,
      price,
      image,
      quantity,
      saveChanges,
      goBack,
      allSuppliers,
      selectedSuppliers,
    };
  },
};
</script>

<template>
  <div class="inventory-view full-width center-column">
    <button type="button" class="back-btn" @click="goBack">← Back</button>
    <h1>Edit Inventory Item</h1>
    <div v-if="item" class="edit-card">
      <div class="item-image center-both">
        <img :src="image" :alt="name" v-if="image" />
      </div>
      <form @submit.prevent="saveChanges" class="edit-form">
        <label>
          Name:
          <input v-model="name" required />
        </label>
        <label>
          Description:
          <textarea v-model="description" required />
        </label>
        <label>
          Price (€):
          <input type="number" v-model.number="price" min="0" step="0.001" required />
        </label>
        <label>
          Image URL:
          <input v-model="image" />
        </label>
        <label>
          Quantity:
          <input type="number" v-model.number="quantity" min="0" required />
        </label>
        <label>
          Suppliers:
          <select v-model="selectedSuppliers" multiple class="supplier-select">
            <option
              v-for="sup in allSuppliers"
              :key="sup.id"
              :value="sup.id"
            >
              {{ sup.name }}
            </option>
          </select>
        </label>
        <div class="selected-suppliers" v-if="selectedSuppliers.length">
          <span
            v-for="supId in selectedSuppliers"
            :key="supId"
            class="tag"
          >
            {{ supId.name }}
          </span>
        </div>
        <button type="submit" class="alt-button save-btn">Save Changes</button>
      </form>
    </div>
    <div v-else>
      <p>Loading item...</p>
    </div>
  </div>
</template>

<style scoped>
.inventory-view {
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem 1rem;
  background: var(--color-secondary);
  border-radius: 12px;
  box-shadow: 0 2px 8px #0001;
}
.back-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  margin-bottom: 1rem;
  color: var(--color-text-primary);
}
.edit-card {
  width: 100%;
  background: var(--color-tertiary);
  border-radius: 12px;
  box-shadow: 0 2px 8px #0001;
  padding: 2rem;
}
.item-image img {
  max-width: 120px;
  max-height: 120px;
  object-fit: contain;
  margin-bottom: 1rem;
  border-radius: 8px;
  background: #f4f4f5;
}
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.edit-form label {
  display: flex;
  flex-direction: column;
  font-weight: 500;
  color: var(--color-text-secondary);
}
.edit-form input,
.edit-form textarea,
.edit-form select {
  padding: 0.5rem;
}
.edit-form textarea {
  min-height: 60px;
  resize: vertical;
}
.supplier-select {
  min-height: 2.5rem;
}
.selected-suppliers {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.tag {
  background: var(--color-primary);
  color: var(--color-text-primary);
  border-radius: 8px;
  padding: 0.2rem 0.7rem;
  font-size: 1rem;
  display: inline-block;
}
.save-btn {
  background: var(--color-text-primary);
  color: var(--color-tertiary);
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 1rem;
  transition: background 0.2s;
}
.save-btn:hover {
  background: var(--color-tertiary);
  color: var(--color-text-primary);
  border: 2px solid var(--color-text-primary);
}
</style>
