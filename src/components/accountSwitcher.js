import { defineAsyncComponent, markRaw } from 'vue'

// Only builds with VITE_ACCOUNT_SWITCHERS (dev) contain the account switcher; elsewhere this is null and it is left out
export default import.meta.env.VITE_ACCOUNT_SWITCHERS
    ? markRaw(defineAsyncComponent(() => import('./AccountSwitcher.vue')))
    : null
