/* eslint-disable prettier/prettier */
import { createRouter, createWebHashHistory } from "vue-router";

// Keep your routes the same, just lazy-load them (cuts TBT)
const HomeView     = () => import("../views/HomeView.vue");
const WorkGallery  = () => import("@/views/WorkGallery.vue");
const FolderView   = () => import("../views/FolderView.vue");
const AboutView    = () => import("../views/AboutView.vue");
const ContactView  = () => import("../views/Contact.vue");

const routes = [
  {
    path: "/",
    name: "home",
    component: HomeView,
  },
  {
    path: "/work/:category",
    name: "work-category",
    component: WorkGallery,
    props: true,
  },
  {
    path: "/folder/:folderName",
    name: "folder",
    component: FolderView,
  },
  {
    path: "/about",
    name: "about",
    component: AboutView,
  },
  // {
  //   path: "/shop",
  //   name: "shop",
  //   component: () => import("../views/Shop.vue"),
  // },
  {
    path: "/contact",
    name: "contact",
    component: ContactView,
  },
  // optional catch-all
  // { path: "/:pathMatch(.*)*", redirect: "/" },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

/**
 * After each navigation, store hero preload candidates so
 * public/index.html can <preload> them BEFORE Vue boots on the next page.
 * (Your views set window.__LCP_CANDIDATES__ when they know the first image.)
 */
router.afterEach(() => {
  try {
    const cand = (window.__LCP_CANDIDATES__ || []).filter(Boolean);
    localStorage.setItem("__LCP_NEXT__", JSON.stringify(cand));
  } catch {}
});

export default router;
