<!-- eslint-disable prettier/prettier -->
<template>
  <div class="header-container">
    <div class="nav-content">
      <img :src="logo" :alt="logo" class="logo">
      <nav>
        <ul>
          <li><router-link to="/">WORK</router-link></li> 
          <li><router-link to="/about">ABOUT</router-link></li> 
          <li><router-link to="/contact">CONTACT</router-link></li> 
          <li><a href="https://www.instagram.com/cannedpineappleco/" target="_blank" rel="noopener noreferrer">FOLLOW</a></li> 
          <li><router-link to="/shop">SHOP</router-link></li>
        </ul>
      </nav>
    </div>
  </div>
  <div class="nav-border"></div>
  <main class="main-content">
    <router-view />
  </main>

  <footer>
    <div class="footer-content">
      <p>
        <b>&copy; {{ year }} Canned Pineapple Co. </b>
      </p>
    </div>
  </footer>
</template>
<!-- eslint-disable prettier/prettier -->
<script setup>
import { onMounted, ref } from 'vue';
import logo from './assets/logo.png';

const year = new Date().getFullYear();
const dropboxFiles = ref([]);

onMounted(async () => {
  try {
    const res = await fetch('http://localhost:8080/api/dropbox/files');
    dropboxFiles.value = await res.json();
    console.log('📦 Dropbox Files:', dropboxFiles.value);
  } catch (err) {
    console.error('❌ Error fetching Dropbox files:', err);
  }
});
</script>

<!-- eslint-disable prettier/prettier -->
<style>
@import url('https://fonts.cdnfonts.com/css/gotham');

:root {
  --font-gotham: 'Gotham', sans-serif;
  --font-gotham-medium: 'Gotham Medium', Arial, sans-serif;
}

body {
  margin: 0;
  padding: 0 30px;
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
  font-weight: 500;
  padding-top: 0; /* Remove any top padding to prevent content from being hidden under the sticky nav */
}

/* .nav-border {
  width: 100%;
  position: sticky;
  padding: 0;
  margin: 0;
  height: 3px;
  background-color: #e0e0e0eb;
  align-self: center;
} */

.header-container {
  position: sticky;
  top: 0;
  z-index: 1000;
  background-color: white;
  padding: 2rem 0 1.2rem;  /* Increased top padding */
  display: flex;
  justify-content: center;
  min-height: 120px;  /* Increased minimum height */
  box-sizing: border-box;
  border-bottom: 3px solid #e0e0e0eb;
  padding-bottom: 20px;
}

/* .nav-content {
  width: 100%;
  max-width: 1200px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
} */

.nav-content {
  width: 100%;
  max-width: 1200px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding-top: 2rem;  /* Added top padding */
}
.logo {
  max-height: 100px;
  position: absolute;
  left: 0px;
  top: 20px;
}

nav {
  margin: 0 auto;
}

nav ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  gap: 25px;
}

nav a {
  text-decoration: none;
  color: #72a2e4;
  font-weight: 500;
  font-size: 1.3rem;
  letter-spacing: 0.5px;
  transition: color 0.2s ease;
}

nav a:hover {
  color: #42b983;
}
nav li a {
  font-weight: bolder;
  color: #72a2e4;
  /* color: #a0accb; */
  /* color: #2c3e50;  */
  text-decoration: none; /* Remove underlines from links */
}

nav a.router-link-exact-active {
  color: #42b983;
}

/* Main content area */
.main-content {
  flex: 1;
  padding-top: 0; /* Remove top padding since PageHeader is now sticky */
  /* padding-bottom: 40px; */
}

/* Ensure the first element in main doesn't have extra top margin */
.main-content > :first-child {
  margin-top: 0;
}

footer {
  padding-bottom: 20px;
  text-align: center;
  margin-top: auto; /* Push the footer to the bottom */
}

.footer-content {
  display: flex;
  justify-content: center; /* Center content horizontally */
  align-items: center; /* Center content vertically */
  gap: 20px; /* Space between footer elements */
}

.footer-content svg { /* Style the Font Awesome icon */
  color: #555; /* Example icon color */
}
</style>
