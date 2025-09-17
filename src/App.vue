<!-- eslint-disable prettier/prettier -->
<template>
  <div class="header-container">
    <div class="nav-content">
      <!-- Left: Clickable logo (stays left, vertically centered) -->
      <router-link to="/" class="logo-link" aria-label="Go to homepage">
        <img :src="logo" alt="Canned Pineapple" class="logo" />
      </router-link>

      <!-- Center: Nav (stays centered on the page) -->
      <nav>
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
            <ul class="dropdown-menu" role="menu" aria-label="Work categories">
              <li role="none">
                <router-link role="menuitem" :to="{ path: '/work/signs' }">Signs</router-link>
              </li>
              <li role="none">
                <router-link role="menuitem" :to="{ path: '/work/gold-leaf' }">Gold Leaf</router-link>
              </li>
              <li role="none">
                <router-link role="menuitem" :to="{ path: '/work/murals' }">Murals</router-link>
              </li>
              <li role="none">
                <router-link role="menuitem" :to="{ path: '/work/branding' }">Branding</router-link>
              </li>
            </ul>
          </li>

          <!-- Other nav links -->
          <li><router-link to="/about">ABOUT</router-link></li>
          <li><router-link to="/contact">CONTACT</router-link></li>
          <li>
            <a
              href="https://www.instagram.com/cannedpineappleco/"
              target="_blank"
              rel="noopener noreferrer"
            >
              FOLLOW
            </a>
          </li>
          <!--
          <li><router-link to="/shop">SHOP</router-link></li>
          -->
        </ul>
      </nav>

      <!-- Right: empty spacer keeps the nav perfectly centered -->
      <div class="nav-spacer" aria-hidden="true"></div>
    </div>
  </div>

  <main class="main-content">
    <router-view />
  </main>

  <footer>
    <div class="footer-content">
      <p><b>&copy; {{ year }} Canned Pineapple Co.</b></p>
    </div>
  </footer>
</template>
<!-- eslint-disable prettier/prettier -->

<script setup>
import logo from './assets/logo.png' // If using public/, use '/logo.png' instead
const year = new Date().getFullYear()
</script>

<!-- eslint-disable prettier/prettier -->
<style>
@import url('https://fonts.cdnfonts.com/css/gotham');

:root {
  --font-gotham: 'Gotham', sans-serif;
  --font-gotham-medium: 'Gotham Medium', Arial, sans-serif;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  padding: 0 30px 0 30px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: var(--font-gotham-medium);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4, h5, h6,
p, span, div, a, button, input, textarea, select, label {
  font-family: var(--font-gotham-medium);
}

#app {
  font-family: var(--font-gotham-medium);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  font-weight: 700;
  padding-top: 0;
}

/* Header */
.header-container {
  position: sticky;
  top: 0;
  z-index: 1000;
  background-color: white;
  padding: 1.5rem 0;
  display: flex;
  justify-content: center;
  box-sizing: border-box;
}

/* ✅ Grid layout: [logo] [nav centered] [spacer] */
.nav-content {
  width: 100%;
  max-width: 1200px;
  display: grid;
  grid-template-columns: 1fr auto 1fr; /* left / center / right */
  align-items: center;                 /* vertical centering */
  gap: 20px;
}

/* Left cell: logo */
.logo-link {
  justify-self: start;                 /* stick to the left edge of the grid */
  display: inline-flex;
  align-items: center;
}

.logo {
  max-height: 100px;
  height: auto;
  width: auto;
  display: block;
}

/* Center cell: nav */
nav {
  justify-self: center;                /* center the nav block in the page */
  margin: 0;
}

nav ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  gap: 25px;
  align-items: center;
}

/* Right cell: spacer (empty, balances grid) */
.nav-spacer {
  justify-self: end;                   /* not visible, just layout */
}

/* Default blue for links */
nav a {
  text-decoration: none;
  color: #72a2e4;
  font-weight: 700;
  font-size: 1.3rem;
  letter-spacing: 0.5px;
  line-height: 1.3;
  padding: 0.25rem 0;
  transition: color 0.2s ease;
  display: inline-flex;
  align-items: center;
}

nav a:hover,
nav a.router-link-exact-active {
  color: #42b983;
}

/* Dropdown */
.dropdown {
  position: relative;
  display: flex;
  align-items: center;
}

/* Make WORK look like links + match metrics exactly */
nav .dropdown > .dropdown-toggle {
  color: #72a2e4;
  font-weight: 700;
  font-size: 1.3rem;
  letter-spacing: 0.5px;
  line-height: 1.3;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0;
}

/* Hover = green */
nav .dropdown:hover > .dropdown-toggle,
nav .dropdown > .dropdown-toggle:hover {
  color: #42b983;
}

/* Optional: focus for accessibility */
nav .dropdown > .dropdown-toggle:focus-visible {
  outline: 2px solid #42b983;
  outline-offset: 2px;
  border-radius: 4px;
}

/* Dropdown menu */
.dropdown-menu {
  display: none;
  position: absolute;
  top: 100%;      /* menu touches the trigger, no dead zone */
  left: 0;
  background: white;
  border: 1px solid #eee;
  box-shadow: 0 8px 20px rgba(0,0,0,0.08);
  list-style: none;
  padding: 0.5rem 0;
  margin: 0;      /* no gap = no hover flicker */
  min-width: 180px;
  z-index: 2000;
  text-align: left;
}

/* Show only while hovered (prevents sticking) */
.dropdown:hover .dropdown-menu {
  display: block;
}

.dropdown-menu li { padding: 0; }

.dropdown-menu a {
  display: block;
  padding: 0.55rem 1rem;
  color: #72a2e4;
  font-size: 1.05rem;
  text-decoration: none;
  white-space: nowrap;
  line-height: 1.3;
}

.dropdown-menu a:hover {
  background-color: #f5f5f5;
  color: #42b983;
}

/* Main content area */
.main-content {
  flex: 1;
  padding-top: 0;
}

/* Ensure the first element in main doesn't have extra top margin */
.main-content > :first-child {
  margin-top: 0;
}

/* Footer */
footer {
  padding-bottom: 20px;
  text-align: center;
  margin-top: auto;
}

.footer-content {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
}
</style>
