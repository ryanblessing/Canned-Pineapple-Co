<!-- eslint-disable prettier/prettier -->
<template>
  <nav>
    <img :src="logo" :alt="logo" class="logo">
    <ul>
      <li><router-link to="/">Murals</router-link></li> |
      <li><router-link to="/about">About</router-link></li> |
      <!-- <li><router-link to="/shop">Shop</router-link></li> | -->
      <li><router-link to="/contact">Contact</router-link></li> 
    </ul>
  </nav>
  <router-view />

  <footer>
    <div class="footer-content">
      <p>
        <b>&copy; {{ year }} Canned Pineapple Co. </b>
      </p>
      <a href="https://www.cannedpineappleco.com/instagram" target="_blank">
        <font-awesome-icon size="2x" :icon="['fab', 'instagram']" />
      </a>
    </div>
  </footer>
</template>
<!-- eslint-disable prettier/prettier -->
<script setup>
import logo from './assets/logo.png';

const year = new Date().getFullYear();
</script>
<!-- eslint-disable prettier/prettier -->
<style>
@import url('https://fonts.cdnfonts.com/css/gotham');

:root {
  --font-gotham: 'Gotham', sans-serif;
}

#app {
  font-family: var(--font-gotham);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  font-weight: 500; /* Medium weight for Gotham */
  padding-top: 0; /* Remove any top padding to prevent content from being hidden under the sticky nav */
}

nav {
  position: sticky;
  top: 0;
  z-index: 1000;
  background-color: white;
  padding: 0 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); */
}

nav .logo {
  max-height: 120px; /* Make the logo bigger - adjust as needed */
}

nav ul {
  list-style: none; /* Remove bullet points from list */
  padding: 0;
  margin: 0;
  display: flex; /* Arrange links horizontally */
  gap: 15px; 
}

nav li a {
  font-weight: bold;
  color: #a0accb;
  /* color: #2c3e50;  */
  text-decoration: none; /* Remove underlines from links */
}

nav a.router-link-exact-active {
  color: #42b983;
}

footer {
  /* background-color: #f0f0f0; Example background color */
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
