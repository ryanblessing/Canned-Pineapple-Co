/* eslint-disable prettier/prettier */
import {
  createRouter,
  createWebHashHistory
} from "vue-router";
import HomeView from "../views/HomeView.vue";

const routes = [{
    path: "/",
    name: "home",
    component: HomeView,
  },
  {
    path: "/folder/:folderName",
    name: "folder",
    component: () => import("../views/FolderView.vue"),
  },
  {
    path: "/about",
    name: "about",
    component: () => import("../views/AboutView.vue"),
  },
  {
    path: "/shop",
    name: "shop",
    component: () => import("../views/Shop.vue"),
  },
  {
    path: "/contact",
    name: "contact",
    component: () => import("../views/Contact.vue"),
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;