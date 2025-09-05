<template>
  <div class="page-header">
    <div class="header-content">
      <slot>
        <template v-if="$route.name === 'home'">
          <p class="header-text">
            A CREATIVE STUDIO FOCUSED IN SIGN PAINTINGS, MURALS, VISUAL ART AND BRAND DESIGN
          </p>
        </template>
        <template v-else-if="$route.name === 'folder'">
          <h3 class="folder-title">{{ folderName }}</h3>
          <p v-if="folderDescription" class="header-text">
            {{ folderDescription }}
          </p>
        </template>
      </slot>
    </div>
    <div class="header-border"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const props = defineProps({
  folderDescription: {
    type: String,
    default: ''
  },
  folderName: {
    type: String,
    default: ''
  }
});

const route = useRoute();
</script>

<style scoped>
.page-header {
  position: sticky;
  top: 140px; /* Height of the navigation bar */
  z-index: 999; /* Just below the navigation bar */
  background-color: white;
  width: 100%;
  margin: 0;
  padding: 20px 0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.header-text {
  font-family: 'Gotham', sans-serif;
  font-weight: 400;
  font-size: 1.1rem;
  color: #333;
  letter-spacing: 0.5px;
  line-height: 1.6;
  margin: 10px 0 20px 0;
  text-align: center;
  text-transform: uppercase;
}

.folder-title {
  font-family: 'Gotham', sans-serif;
  font-size: 2.5rem;
  font-weight: 500;
  color: #42b983;
  margin: 10px 0 5px 0;
  text-align: center;
  text-transform: uppercase;
}

.header-border {
  width: 100%;
  height: 3px;
  background-color: #e0e0e0;
  margin: 20px 0;
  position: relative;
}

/* .header-border::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 0;
  width: 100%;
  height: 1px;
  background-color: #e0e0e0;
} */
</style>
