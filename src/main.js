import {
    createApp
} from "vue";
import {
    createRouter,
    createWebHashHistory
} from "vue-router";

import { getCurrentUser } from "./lib/utils";
import "./style.css";
import App from "./App.vue";

import OrdersList from "./views/OrdersList.vue";
import OrdersListAdmin from "./views/OrdersListAdmin.vue";
import OrderCreation from "./views/OrderCreation.vue";
import OrderView from "./views/OrderView.vue";
import Login from "./views/Login.vue";
import SignOut from "./views/SignOut.vue";
import SuppliersManagement from "./views/SuppliersManagement.vue";
import TagsManagement from "./views/TagsManagement.vue";


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
{
    path: "/tags",
    component: TagsManagement
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
        const {currentUser, error} = await getCurrentUser()
        console.log(currentUser)
        
        // if the user is not logged in, redirect to the login page
        if (error) {
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

app.mount("#app");
