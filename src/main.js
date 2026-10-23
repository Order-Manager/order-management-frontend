import {
    createApp,
    nextTick
} from "vue";
import {
    createRouter,
    createWebHashHistory
} from "vue-router";
import "./style.css";
import App from "./App.vue";

import OrdersList from "./views/OrdersList.vue";
import OrderCreation from "./views/OrderCreation.vue";
import OrderView from "./views/OrderView.vue";
import Login from "./views/Login.vue";
import SignOut from "./views/SignOut.vue";
import SuppliersManagement from "./views/SuppliersManagement.vue";
import TagsManagement from "./views/TagsManagement.vue";

import {
    firebaseApp
} from './firebaseInit'
import {
    VueFire,
    VueFireAuth,
    getCurrentUser
} from 'vuefire'
import Toast from "vue-toastification";
import "vue-toastification/dist/index.css";
import InventoryList from "./views/InventoryList.vue";
import InventoryCategory from "./views/InventoryCategory.vue";
import InventoryView from "./views/InventoryView.vue";

const routes = [{
        path: "/",
        component: OrdersList,
        meta: { title: "Orders", requiresAuth: true }
    },
    {
        path: "/create",
        component: OrderCreation,
        meta: { title: "New order", requiresAuth: true }
    },
    {
        path: "/view/:id",
        component: OrderView,
        meta: { title: "Order", requiresAuth: true }
    },
    {
        path: "/login",
        component: Login,
        meta: { title: "Sign in" }
    },
    {
        path: "/signout",
        component: SignOut,
        meta: { title: "Signing out" }
    },
    {
        path: "/suppliers",
        component: SuppliersManagement,
        meta: { title: "Suppliers" }
    },
    {
        path: "/tags",
        component: TagsManagement,
        meta: { title: "Tags" }
    },
    {
        path: "/inventory",
        component: InventoryList,
        meta: { title: "Inventory" }
    },
    {
        path: "/inventory/category/:id",
        component: InventoryCategory,
        meta: { title: "Inventory category" }
    },
    {
        path: "/inventory/item/:id",
        component: InventoryView,
        meta: { title: "Inventory item" }
    },

];

const router = createRouter({
    history: createWebHashHistory("orders"),
    routes,
});

router.beforeEach(async (to) => {
    // routes with `meta: { requiresAuth: true }` will check for
    // the users, others won't
    if (to.meta.requiresAuth) {
        const currentUser = await getCurrentUser()
        // if the user is not logged in, redirect to the login page
        if (!currentUser) {
            return {
                path: '/login',
                query: {
                    // we keep the current path in the query so we can
                    // redirect to it after login with
                    // `router.push(route.query.redirect || '/')`
                    redirect: to.fullPath,
                },
            }
        }
    }
})

// Name each page in the tab title, and move focus to the new page so screen readers announce it
router.afterEach((to, from) => {
    document.title = to.meta.title ? `${to.meta.title} · IFT Orders` : "IFT Orders";
    if (from.matched.length) {
        nextTick(() => document.getElementById("main")?.focus({ preventScroll: true }));
    }
})

const app = createApp(App);
app.use(router);
app.use(VueFire, {
    // imported above but could also just be created here
    firebaseApp,
    modules: [
        // we will see other modules later on
        VueFireAuth(),
    ],
})

const toastOptions = {
    position: "top-center",
    timeout: 5000
};
app.use(Toast, toastOptions);
app.mount("#app");
