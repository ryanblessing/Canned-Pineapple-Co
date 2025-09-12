<template>
    <div class="header-content">
      <slot>
        <template v-if="$route.name === 'home'">
          <p class="header-text">
            A CREATIVE STUDIO FOCUSED IN SIGN PAINTINGS, MURALS, VISUAL ART AND BRAND DESIGN
          </p>
        </template>
        <template v-else-if="$route.name === 'folder'">
          <div class="header-section title-section">
            <p class="header-text" style="color: #42b983; font-weight: 700; font-size: 1.5rem;">{{ folderName }}</p>
          </div>
          <div class="header-section description-section">
            <p v-if="folderDescription" class="header-text">
              {{ folderDescription }}
            </p>
          </div>
          <div class="header-section services-section">
            <p v-if="folderServices" class="header-text">
              {{ folderServices }}
            </p>
          </div>
        </template>
      </slot>
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
  },
  folderServices: {
    type: String,
    default: ''
  }
});

const route = useRoute();
</script>

<style scoped>
/* Header layout */
.header-content {
  display: flex;
  align-items: center;
  width: 100%;
  justify-content: center;
  padding: 0 20px;
  min-height: 100px;
  border-top: 3px solid #e0e0e0eb;
  border-bottom: 3px solid #e0e0e0eb;
}
.folder-header {
  display: flex;
  width: 100%;
  min-height: 60px;
  align-items: center;
}

/* Section styles */
.header-section {
  display: flex;
  align-items: center;
  min-height: 80px;
  box-sizing: border-box;
  padding: 5px 0;
}

.title-section {
  justify-content: center;
  text-align: center;
  border-right: 3px solid #e0e0e0eb;
  width: 20%;
  flex: 0 0 20%;
}

.description-section {
  justify-content: center;
  text-align: center;
  width: 60%;
  flex: 0 0 60%;
  padding: 0 30px;
}

.services-section {
  justify-content: center;
  text-align: center;
  border-left: 3px solid #e0e0e0eb;
  width: 20%;
  flex: 0 0 20%;
  padding: 0 1rem;
}

/* Text styles */
.header-text {
  font-family: 'Gotham', sans-serif;
  font-weight: 400;
  font-size: 1rem;
  color: #333;
  letter-spacing: 0.5px;
  line-height: 1.6;
  margin: 10px 0 20px;
  text-align: center;
  text-transform: uppercase;
}

/* Divider */
.divider {
  height: 150%;
  width: 3px;
  background-color: #e0e0e0eb;
}

</style>
