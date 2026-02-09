/* eslint-disable prettier/prettier */
import { createRouter, createWebHistory } from "vue-router";

// Keep your routes the same, just lazy-load them (cuts TBT)
const HomeView     = () => import("../views/HomeView.vue");
const WorkGallery  = () => import("@/views/WorkGallery.vue");
const FolderView   = () => import("../views/FolderView.vue");
const AboutView    = () => import("../views/AboutView.vue");
const ContactView  = () => import("../views/Contact.vue");

const routes = [
  { path: "/", name: "home", component: HomeView },
  { path: "/work/:category", name: "work-category", component: WorkGallery, props: true },
  { path: "/folder/:folderName", name: "folder", component: FolderView },
  { path: "/about", name: "about", component: AboutView },
  { path: "/contact", name: "contact", component: ContactView },
];

const router = createRouter({
  history: createWebHistory(),   // ✅ no more #
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

router.afterEach(() => {
  try {
    const cand = (window.__LCP_CANDIDATES__ || []).filter(Boolean);
    localStorage.setItem("__LCP_NEXT__", JSON.stringify(cand));
  } catch {}
});

export default router;
