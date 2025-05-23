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
      <v-col v-for="image in images" :key="image.id" cols="12" sm="6" md="4" lg="3">
        <v-card>
          <v-img :src="image.thumbnailUrl" height="200" cover>
            <v-card-title>{{ image.name }}</v-card-title>
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
    images.value = await fetchImagesFromFolder(folderName.value)
    console.log('images.value', images.value)
    
    // Build breadcrumbs
    const pathParts = folderName.value.split('/')
    breadcrumbs.value = pathParts.map((part, index) => ({
      title: part,
      disabled: index === pathParts.length - 1,
      href: `/${pathParts.slice(0, index + 1).join('/')}`
    }))
  } catch (error) {
    console.error('Error fetching folder images:', error)
  }
}

onMounted(fetchFolderImages)
</script>

<style scoped>
.v-card {
  margin: 16px;
  transition: transform 0.2s;
}

.v-card:hover {
  transform: translateY(-5px);
}
</style>
