import {
    createApp
} from "vue";
import {
    createRouter,
    createWebHashHistory
} from "vue-router";
import "./style.css";
import App from "./App.vue";

import OrdersList from "./views/OrdersList.vue";
import OrdersListAdmin from "./views/OrdersListAdmin.vue";
import OrderCreation from "./views/OrderCreation.vue";
import OrderView from "./views/OrderView.vue";
import Login from "./views/Login.vue";
import SignOut from "./views/SignOut.vue";
import SuppliersManagement from "./views/SuppliersManagement.vue";

import {
    firebaseApp
} from './firebaseInit'
import {
    VueFire,
    VueFireAuth,
    getCurrentUser
} from 'vuefire'


const routes = [{
        path: "/",
        component: OrdersList,
        meta: { requiresAuth: true }
    },
    {
        path: "/all",
        component: OrdersListAdmin,
        meta: { requiresAuth: true }
    },
    {
        path: "/create",
        component: OrderCreation,
        meta: { requiresAuth: true }
    },
    {
        path: "/view/:id",
        component: OrderView,
        meta: { requiresAuth: true }
    },
    {
        path: "/login",
        component: Login
    },
    {
        path: "/signout",
        component: SignOut
    },
    {
        path: "/suppliers",
        component: SuppliersManagement
    },
];

const router = createRouter({
    history: createWebHashHistory(),
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

app.mount("#app");
