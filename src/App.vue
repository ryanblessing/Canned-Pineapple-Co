<!-- Header / Navigation SFC (clean/DRY, behavior preserved) -->
<template>
  <div class="header-container">
    <div class="logo-container">
      <router-link to="/" class="logo-link" aria-label="Go to homepage">
        <img :src="logo" alt="Canned Pineapple" class="logo" @click="$router.push('/')" />
      </router-link>
    </div>

    <div class="nav-content">
      <!-- Desktop / Tablet (≥1025px) -->
      <nav class="nav-desktop">
        <ul>
          <!-- WORK dropdown -->
          <li class="dropdown">
            <span
              class="dropdown-toggle"
              role="button"
              aria-haspopup="true"
              aria-expanded="false"
              tabindex="0"
            >
              WORK ▾
            </span>
            <div class="dropdown-menu" role="menu" aria-label="Work categories">
              <div class="menu-row">
                <router-link role="menuitem" :to="{ path: '/work/signs' }">SIGNS</router-link>
                <router-link role="menuitem" :to="{ path: '/work/gold-leaf' }">GOLD LEAF</router-link>
                <router-link role="menuitem" :to="{ path: '/work/murals' }">MURALS</router-link>
                <router-link role="menuitem" :to="{ path: '/work/branding' }">BRANDING</router-link>
              </div>
            </div>
          </li>

          <!-- Other nav links -->
          <li><router-link to="/about">ABOUT</router-link></li>
          <li><router-link to="/contact">CONTACT</router-link></li>
          <li>
            <a href="https://www.instagram.com/cannedpineappleco/" target="_blank" rel="noopener noreferrer">
              FOLLOW
            </a>
          </li>
          <li>
            <a href="https://shop.cannedpineappleco.com/" target="_blank" rel="noopener noreferrer">
              SHOP
            </a>
          </li>
        </ul>
      </nav>

      <!-- Mobile hamburger (≤1024px) -->
      <button
        class="mobile-menu-button"
        aria-label="Open menu"
        :aria-expanded="mobileOpen ? 'true' : 'false'"
        aria-controls="mobile-drawer"
        @click="toggleMenu"
      >
        <span class="bar"></span><span class="bar"></span><span class="bar"></span>
      </button>
    </div>
  </div>

  <main class="main-content">
    <router-view />
  </main>

  <footer>
    <div class="footer-content">
      <p class="footer-text">&copy; {{ year }} Canned Pineapple Co.</p>
      <div class="footer-spacer"></div>
      <a
        href="https://www.instagram.com/cannedpineappleco/"
        target="_blank"
        rel="noopener noreferrer"
        class="instagram-link"
      >
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M12 2.162c3.204 0 3.584.012 4.849.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919C8.416 2.172 8.796 2.162 12 2.162zM12 0C8.741 0 8.332.014 7.052.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.165 6.165 0 100 12.33 6.165 6.165 0 000-12.33zM12 16a4.162 4.162 0 110-8.324 4.162 4.162 0 010 8.324zm8.585-10.5a1.44 1.44 0 11-2.881 0 1.44 1.44 0 012.881 0z" fill="currentColor"/>
        </svg>
      </a>
    </div>
  </footer>

  <!-- MOBILE OVERLAY -->
  <div class="mobile-overlay" :class="{ open: mobileOpen }" @click="closeMenu" aria-hidden="true"></div>

  <!-- MOBILE DRAWER -->
  <aside
    id="mobile-drawer"
    class="mobile-drawer"
    :class="{ open: mobileOpen }"
    role="dialog"
    aria-modal="true"
    aria-label="Mobile menu"
  >
    <div class="drawer-header">
      <span class="drawer-title">MENU</span>
      <button class="drawer-close" aria-label="Close menu" @click="closeMenu">✕</button>
    </div>

    <nav class="drawer-nav">
      <details class="drawer-group">
        <summary>WORK</summary>
        <div class="drawer-sub">
          <router-link :to="{ path: '/work/signs' }" @click="closeMenu">SIGNS</router-link>
          <router-link :to="{ path: '/work/gold-leaf' }" @click="closeMenu">GOLD LEAF</router-link>
          <router-link :to="{ path: '/work/murals' }" @click="closeMenu">MURALS</router-link>
          <router-link :to="{ path: '/work/branding' }" @click="closeMenu">BRANDING</router-link>
        </div>
      </details>

      <router-link to="/about" @click="closeMenu">ABOUT</router-link>
      <router-link to="/contact" @click="closeMenu">CONTACT</router-link>
      <a href="https://www.instagram.com/cannedpineappleco/" target="_blank" rel="noopener noreferrer" @click="closeMenu">FOLLOW</a>
      <a href="https://shop.cannedpineappleco.com/" target="_blank" rel="noopener noreferrer" @click="closeMenu">SHOP</a>
    </nav>
  </aside>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import logo from './assets/logo.png'

const year = new Date().getFullYear()
const mobileOpen = ref(false)

const toggleMenu = () => { mobileOpen.value = !mobileOpen.value }
const closeMenu  = () => { mobileOpen.value = false }
const onKeydown  = (e) => { if (e.key === 'Escape') closeMenu() }

watch(mobileOpen, v => { document.body.classList.toggle('no-scroll', v) })
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<style>
/* ---- Gotham with font-display: swap (keeps cdnfonts, fixes Lighthouse) ---- */

/* Regular (400) */
@font-face {
  font-family: 'Gotham';
  src:
    url('https://fonts.cdnfonts.com/s/14898/GothamBook.woff2') format('woff2'),
    url('https://fonts.cdnfonts.com/s/14898/GothamBook.woff') format('woff');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

/* Medium (600) */
@font-face {
  font-family: 'Gotham Medium';
  src:
    url('https://fonts.cdnfonts.com/s/14898/GothamMedium.woff2') format('woff2'),
    url('https://fonts.cdnfonts.com/s/14898/GothamMedium.woff') format('woff');
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}

/* Optional: allow using weight 600 via 'Gotham' as well */
@font-face {
  font-family: 'Gotham';
  src:
    url('https://fonts.cdnfonts.com/s/14898/GothamMedium.woff2') format('woff2'),
    url('https://fonts.cdnfonts.com/s/14898/GothamMedium.woff') format('woff');
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}

/* Helpful fallbacks so text paints instantly */
:root{
  --font-gotham: 'Gotham', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
  --font-gotham-medium: 'Gotham Medium', 'Gotham', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
}


:root{
  --font-gotham: 'Gotham', sans-serif;
  --font-gotham-medium: 'Gotham Medium', Arial, sans-serif;
  --brand: #3e2723;
  --nav-title-size: 18px;           /* keep in sync with PageHeader title */
  --pad-body-1500: 90px;
  --pad-body-1350: 70px;
  --pad-body-1200: 50px;
  --pad-body-1024: 20px;
}

* { box-sizing: border-box; }

/* Page frame */
body{
  margin: 0;
  padding: 0 var(--pad-body-1500);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: var(--font-gotham-medium);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
body.no-scroll{ overflow: hidden; }

#app{ font-family: var(--font-gotham-medium); text-align: center; min-height: 100vh; }

/* ---------------- Header ---------------- */
.header-container{
  display: flex;
  position: sticky;
  top: 0;
  z-index: 1000;
  background: #fff;
  padding: 0;
  width: 100%;
  height: 60px !important;
}
.logo-container{ margin-top: 5px; width: 15%; padding-left: 35px; }
.logo-link{ display: inline-flex; align-items: center; }
.logo{ max-height: 50px; height: auto; width: auto; display: block; }

.nav-content{
  width: 65%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding-left: 75px;
}

/* ---------------- Desktop nav ---------------- */
.nav-desktop, .nav-desktop nav{ text-align: center; margin: 0; }
nav ul{ list-style: none; padding: 0; margin: 0; display: flex; gap: 25px; align-items: center; }

/* Shared desktop link style (WORK matches other items) */
nav a,
nav .dropdown > .dropdown-toggle{
  --link-size: var(--nav-title-size);
  color: var(--brand);
  text-decoration: none;
  font-family: var(--font-gotham-medium) !important;
  font-weight: 600 !important;
  font-size: var(--link-size) !important;
  letter-spacing: .5px;
  line-height: 1.3;
  padding: .25rem 0;
  transition: color .2s;
  display: inline-flex;
  align-items: center;
}
nav a:hover,
nav a.router-link-exact-active,
nav .dropdown > .dropdown-toggle:hover{ color: #b30202; }

.dropdown{ position: relative; display: flex; align-items: center; }
.dropdown-menu{
  display: none;
  position: absolute;
  top: 100%; left: 50%;
  transform: translateX(-50%);
  background: #fff;
  border: 1px solid #eee;
  box-shadow: 0 8px 20px rgba(0,0,0,.08);
  padding: .5rem 1.5rem;
  z-index: 2000;
  min-width: max-content;
  white-space: nowrap;
  text-align: center;
}
.dropdown:hover .dropdown-menu{ display: block; }

.menu-row{ display: flex; justify-content: center; align-items: center; gap: 1rem; }
.menu-row a{
  color: var(--brand);
  text-decoration: none;
  font-family: var(--font-gotham-medium) !important;
  font-weight: 600 !important;
  font-size: calc(var(--nav-title-size) - 3px); /* submenu slightly smaller */
  padding: .35rem .2rem;
  transition: color .2s;
  white-space: nowrap;
}
.menu-row a:hover{ color: #b30202; background: #f9f9f9; border-radius: 3px; }

.main-content{ flex: 1; padding-top: 0; }
.main-content > :first-child{ margin-top: 0; }

/* ---------------- Footer ---------------- */
.footer-content{
  border-top: .12rem solid var(--brand);
  display: flex; justify-content: space-between; align-items: center; gap: 20px;
  font-family: var(--font-gotham);
  font-weight: 400;
  padding: 10px 0;
  height: 90px;
  text-transform: uppercase;
}
.footer-text{ margin: 0; }
.instagram-link{ color: var(--brand); transition: color .2s; text-decoration: none; }
.instagram-link:hover{ color: #8d6e63; }
.instagram-link svg{ width: 24px; height: 24px; vertical-align: middle; }

/* ---------------- Mobile menu ---------------- */
.mobile-menu-button{
  display: none;
  margin-left: auto;
  background: transparent;
  border: 0;
  padding: 8px 4px;
  cursor: pointer;
}
.mobile-menu-button .bar{
  display: block;
  width: 22px; height: 2px;
  background: var(--brand);
  margin: 4px 0;
  transition: transform .2s;
}

.mobile-overlay{
  position: fixed; inset: 0;
  background: rgba(0,0,0,.25);
  opacity: 0; pointer-events: none;
  transition: opacity .2s ease; z-index: 1200;
}
.mobile-overlay.open{ opacity: 1; pointer-events: auto; }

.mobile-drawer{
  position: fixed; top: 0; right: 0;
  height: 100vh; width: 280px; max-width: 86vw; background: #fff;
  border-left: 1px solid #eee;
  transform: translateX(100%);
  transition: transform .25s ease;
  z-index: 1300;
  display: flex; flex-direction: column;
}
.mobile-drawer.open{ transform: translateX(0); }

.drawer-header{
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-bottom: 1px solid #eee;
  text-transform: uppercase; color: var(--brand);
  font-family: var(--font-gotham);
}
.drawer-title{ font-size: 14px; letter-spacing: .6px; }
.drawer-close{ background: transparent; border: 0; font-size: 20px; line-height: 1; cursor: pointer; color: var(--brand); }

.drawer-nav{ display: flex; flex-direction: column; padding: 8px 8px 16px; gap: 2px; text-align: left; }

/* Top-level items (ABOUT/CONTACT/FOLLOW/SHOP and WORK summary) */
.drawer-nav > a,
.drawer-nav > .drawer-group > summary{
  color: var(--brand) !important;
  font-family: var(--font-gotham-medium) !important;
  font-weight: 600 !important;
  font-size: 16px !important;  /* WORK label matches others */
  letter-spacing: .4px !important;
  text-transform: uppercase !important;
  line-height: 1.3 !important;
  padding: 12px 10px !important;
  border-radius: 6px;
}

/* Make summary act like a link and show caret */
.drawer-nav > .drawer-group > summary{
  display: block; cursor: pointer; position: relative; padding-right: 26px !important;
  -webkit-tap-highlight-color: transparent;
}
.drawer-nav > .drawer-group > summary::-webkit-details-marker{ display: none; }
.drawer-group[open] > summary::after,
.drawer-group > summary::after{
  content: ''; position: absolute; right: 10px; top: 50%;
  width: 8px; height: 8px; border-right: 2px solid var(--brand); border-bottom: 2px solid var(--brand);
  transform: translateY(-50%) rotate(45deg); transition: transform .15s ease;
}
.drawer-group[open] > summary::after{ transform: translateY(-20%) rotate(-135deg); }

/* Submenu under WORK: smaller than top-level */
.drawer-sub a{
  color: var(--brand) !important;
  font-family: var(--font-gotham-medium) !important;
  font-weight: 600 !important;
  font-size: 13px !important;
  letter-spacing: .35px !important;
  text-transform: uppercase !important;
  line-height: 1.3 !important;
  padding: 10px 10px !important;
}

.drawer-nav a:hover,
.drawer-nav > .drawer-group > summary:hover{ background: #f5f5f5; }

.drawer-group{ padding: 2px 0; }
.drawer-sub{ display: flex; flex-direction: column; padding: 4px 0 6px 8px; }

/* ---------------- Responsive ---------------- */
@media (max-width:1500px){
  .logo{ max-height: 45px; }
}

@media (max-width:1350px){
  body{ padding: 0 var(--pad-body-1350); }
  .logo{ max-height: 45px !important; }
  .logo-container{ padding-bottom: 4px; padding-right: 31px; padding-left: 29px; min-width: 100px; margin-top: 9px; }
  .footer-content{ font-size: 10px !important; height: 70px; width: 100%; }
  .footer-text{ font-size: 10px !important; margin-bottom: 0; }
  .instagram-link{ margin-bottom: 0; }
  .instagram-link svg{ width: 20px; height: 20px; }
}

@media (max-width:1200px){
  body{ padding: 0 var(--pad-body-1200); }
  .nav-content{ padding-left: 20px; }
  .logo-container{ padding-left: 20px; min-width: 100px; }
}

@media (max-width:1400px){
  .nav-content{ padding-left: 30px; }
}

@media (max-width:1024px){
  body{ padding: 0 var(--pad-body-1024); }
  .logo{ max-height: 40px; }
  .logo-container{ padding-left: 10px; min-width: 80px; margin-top: 10px; }

  /* Hide desktop nav & show hamburger */
  .nav-desktop{ display: none !important; }
  .nav-content{
    justify-content: flex-end !important;
    width: 85% !important;
    padding-left: 0 !important;
    padding-right: 12px !important;
  }
  .mobile-menu-button{ display: inline-flex; flex-direction: column; gap: 0; margin-right: 0; }
}
</style>
