<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-breadcrumbs :items="breadcrumbs">
          <template v-slot:divider>
            <v-icon icon="mdi-chevron-right"></v-icon>
          </template>
        </v-breadcrumbs>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <h1>{{ folderName }}</h1>
      </v-col>
    </v-row>
    <v-row>
      <v-col v-for="(image, index) in images" :key="index" cols="12" sm="6" md="4" lg="3">
        <v-card class="image-card">
          <v-img :src="image" height="300" cover class="image-preview">
            <template v-slot:placeholder>
              <v-row class="fill-height ma-0" align="center" justify="center">
                <v-progress-circular indeterminate color="grey lighten-5"></v-progress-circular>
              </v-row>
            </template>
          </v-img>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { fetchImagesFromFolder } from '../api/dropbox'

const route = useRoute()
const folderName = ref(route.params.folderName)
const images = ref([])
const breadcrumbs = ref([])

async function fetchFolderImages() {
  try {
    const imageUrls = await fetchImagesFromFolder(folderName.value);
    images.value = imageUrls;
    
    // Build breadcrumbs
    const pathParts = folderName.value.split('/').filter(part => part);
    breadcrumbs.value = [
      { title: 'Home', disabled: false, href: '/' },
      ...pathParts.map((part, index) => ({
        title: part,
        disabled: index === pathParts.length - 1,
        href: `/${pathParts.slice(0, index + 1).join('/')}`
      }))
    ];
  } catch (error) {
    console.error('Error fetching folder images:', error);
  }
}

onMounted(fetchFolderImages)
</script>

<style scoped>
.image-card {
  margin: 8px;
  transition: transform 0.2s;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.image-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.image-preview {
  flex-grow: 1;
  object-fit: cover;
}

.v-card-title {
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.5rem;
  letter-spacing: 0.01em;
  word-break: break-word;
  padding: 8px;
}
</style>
