<template>
  <div v-if="$route.name !== 'about' || $route.name !== 'contact'" class="header-content">
    <slot>
      <template v-if="$route.name === 'home'">
        <p class="home-header-text">
          A CREATIVE STUDIO FOCUSED IN SIGN PAINTING, MURALS, VISUAL ART AND BRAND DESIGN
        </p>
      </template>
      <template v-else-if="$route.name === 'folder'">
        <div class="header-section title-section">
          <p class="header-text" style="color: #3e2723; font-weight: 700; font-size: 1.5rem;">{{ folderName }}</p>
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
  <!-- <div v-if="$route.name === 'about'">
    <p class="header-section">
    </p>
  </div> -->
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
/* justify-content: center; */
padding: 0;
min-height: 100px;
border-top: .18rem solid #3e2723;
border-bottom: .18rem solid #3e2723;
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
height: 75px;
box-sizing: border-box;
padding: 0;
/* padding: 5px 0 0 0; */
}

.title-section {
justify-content: center;
text-align: center;
line-height: 1;
width: 305px;
flex: 0 0 305px;
padding: 0;
}

.description-section {
text-align: left;
border-right: .18rem solid #3e2723;
border-left: .18rem solid #3e2723;
width: 75%;
flex: 0 0 60%;
padding: 0 17px;
/* text-transform: uppercase;
letter-spacing: 1px; */

}

.services-section {
/* justify-content: center; */
/* text-align: center; */
/* border-left: 3px solid #e0e0e0eb; */
width: 15%;
flex: 0 0 23%;
/* padding: 0 1rem; */
}

/* Text styles */
.header-text {
margin: 0;
/* font-size: 1rem; */
width: 100%;
line-height: 1.2;
color: #3e2723;
text-align: inherit;
font-family: var(--font-gotham);
font-weight: 400;
/* letter-spacing: 0.5px; */
text-transform: uppercase;
}

.home-header-text {
margin: 0;
font-size: 21px;
width: 100%;
line-height: 1;
color: #3e2723;
text-align: inherit;
font-family: var(--font-gotham);
font-weight: 400;
/* letter-spacing: 0.5px; */
text-transform: uppercase;
}
</style>