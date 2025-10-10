<!-- eslint-disable prettier/prettier -->
<template>
  <div class="header-container">
    <div class="logo-container">
      <router-link to="/" class="logo-link" aria-label="Go to homepage">
        <img :src="logo" alt="Canned Pineapple" class="logo"  @click="this.$router.push('/')"/>
      </router-link>
    </div>
    <div class="nav-content">
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
              <div class="dropdown-menu" role="menu" aria-label="Work categories">
                <div class="menu-row">
                  <!-- <router-link role="menuitem" :to="{ path: '/' }">HOME</router-link> -->
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
    </div>
  </div>
  <!-- </div> -->

  <main class="main-content">
    <router-view />
  </main>

  <footer>
    <div class="footer-content">
      <p>&copy; {{ year }} Canned Pineapple Co.</p>
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
  padding: 0 90px 0 90px;
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

/* Header container */
.header-container {
  display: flex;
  position: sticky;
  top: 0;
  z-index: 1000;
  background-color: white;
  padding: 0 0 0 .5rem;
  box-sizing: border-box;
  width: 100%;
}

/* Logo container (25% width) */
.logo-container {
  margin-top: 15px;
  width: 15%;
  padding-left: 35px;
  /* display: flex;
  align-items: center; */
}

/* Logo link */
.logo-link {
  display: inline-flex;
  align-items: center;
}

.logo {
  max-height: 60px;
  height: auto;
  width: auto;
  display: block;
}

/* Navigation content (75% width) */
.nav-content {
  width: 65%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding-left: 75px;
  /* padding-top: 15px; */
}

/* Navigation */
nav {
  text-align: center;
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
  color: #3e2723;
  font-weight: 500;
  font-size: 1.3rem;
  letter-spacing: 0.5px;
  line-height: 1.3;
  padding: 0.25rem 0;
  transition: color 0.2s ease;
  display: inline-flex;
  align-items: center;
}

span {
  font-weight: 500 !important;
}

nav a:hover,
nav a.router-link-exact-active {
  color: #b30202;
}

/* Dropdown */
.dropdown {
  position: relative;
  display: flex;
  align-items: center;
}

/* Make WORK look like links + match metrics exactly */
nav .dropdown > .dropdown-toggle {
  color: #3e2723;
  font-weight: 600;
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
  color: #b30202;
}

/* Optional: focus for accessibility */
nav .dropdown > .dropdown-toggle:focus-visible {
  outline: 2px solid #3e2723;
  outline-offset: 2px;
  border-radius: 4px;
}

/* Dropdown menu */
.dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-menu {
  display: none;
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border: 1px solid #eee;
  box-shadow: 0 8px 20px rgba(0,0,0,0.08);
  padding: 0.5rem 1.5rem;
  z-index: 2000;
  min-width: max-content;
  white-space: nowrap;
  text-align: center;
}

.menu-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
}

.menu-row a {
  color: #3e2723;
  text-decoration: none;
  font-size: 0.95rem;
  padding: 0.35rem 0.2rem;
  transition: color 0.2s ease;
  white-space: nowrap;
}

.menu-row a:hover {
  color: #b30202;
  background-color: #f9f9f9;
  border-radius: 3px;
}

/* Show only while hovered (prevents sticking) */
.dropdown:hover .dropdown-menu {
  display: block;
}

.dropdown-menu .v-list-item {
  display: inline-block;
  padding: 0 1rem;
  margin: 0;
}

.dropdown-menu a {
  display: inline-block;
  padding: 0.5rem 0.75rem;
  color: #3e2723;
  font-size: 1.05rem;
  text-decoration: none;
  white-space: nowrap;
  line-height: 1.3;
  transition: color 0.2s ease;}

.dropdown-menu a:hover {
  background-color: white;
  color: #b30202;
  opacity: .5;
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
  text-transform: uppercase;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  font-family: var(--font-gotham);
  font-weight: 400;
}

/* Responsive logo container */
@media (max-width: 1200px) {
  .logo-container {
    padding-left: 20px;
    min-width: 100px;
  }
}

@media (max-width: 768px) {
  .logo-container {
    padding-left: 10px;
    min-width: 80px;
    margin-top: 10px;
  }
}

/* Responsive body padding */
@media (max-width: 1200px) {
  body {
    padding: 0 50px;
  }
}

@media (max-width: 768px) {
  body {
    padding: 0 20px;
  }
}

/* Responsive logo */
@media (max-width: 1500px) {
  .logo {
    max-height: 55px;
  }
}

@media (max-width: 1200px) {
  .logo {
    max-height: 50px;
  }
  span{
    font-size: 1rem !important;
  }

}

@media (max-width: 1024px) {
  .logo {
    max-height: 45px;
  }
}

@media (max-width: 768px) {
  .logo {
    max-height: 40px;
  }
}

/* Responsive navigation content */
@media (max-width: 1400px) {
  .nav-content {
    padding-left: 30px;
  }
}

@media (max-width: 1200px) {
  .nav-content {
    padding-left: 20px;
  }
}

@media (max-width: 1024px) {
  .nav-content {
    padding-left: 15px;
  }

  nav .dropdown > .dropdown-toggle {
    font-size: .9em;
  }
  
  nav ul {
    gap: 15px;
  }
}

@media (max-width: 900px) {
  .nav-content {
    padding-left: 10px;
  }
  
  nav ul {
    gap: 12px;
  }

  nav .dropdown > .dropdown-toggle {
    font-size: .8rem;
  }
}

@media (max-width: 768px) {
  .nav-content {
    /* padding-left: 5px; */
    /* width: auto;
    flex-grow: 1; */
    justify-content: center;
  }
  
  nav ul {
    gap: 10px;
  }
}


/* Responsive navigation spacing */
@media (max-width: 1200px) {
  nav ul {
    gap: 20px;
  }
}

@media (max-width: 1024px) {
  nav ul {
    gap: 15px;
  }
}

@media (max-width: 768px) {
  nav ul {
    gap: 12px;
    font-size: .65rem;
  }
}

/* Responsive navigation text */
@media (max-width: 1500px) {
  nav a {
    font-size: 1.1rem;
    letter-spacing: 0.4px;
  }
}

@media (max-width: 1300px) {
  nav a {
    font-size: .85rem !important;
    letter-spacing: 0.3px;
  }
}

@media (max-width: 1100px) {
  nav a {
    font-size: 0.9rem;
    letter-spacing: 0.2px;
  }
}

@media (max-width: 1024px) {
  nav a {
    font-size: 0.85rem;
    padding: 0.15rem 0;
  }
}

@media (max-width: 900px) {
  nav a {
    font-size: 0.8rem;
  }
}

@media (max-width: 768px) {
  nav a {
    font-size: 0.7rem;
    padding: 0.1rem 0;
  }
  
  nav ul {
    gap: 10px;
  }
}

@media (max-width: 600px) {
  nav a {
    font-size: 0.6rem;
    letter-spacing: 0.1px;
  }
  
  nav ul {
    gap: 8px;
  }
}

@media (max-width: 430px) {
  nav .dropdown > .dropdown-toggle {
    font-size: .6rem;
  }
  .logo {
    max-height: 30px;
  }
}
</style>