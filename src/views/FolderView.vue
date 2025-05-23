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
    <v-row class="mb-6">
      <v-col cols="12" class="text-center">
        <h1 class="text-h4 text-md-h3">{{ displayFolderName }}</h1>
      </v-col>
    </v-row>
    <div class="masonry-layout">
      <div 
        v-for="(row, rowIndex) in masonryRows" 
        :key="rowIndex" 
        class="masonry-row"
        :class="{ 'single-row': row.length === 1, 'double-row': row.length === 2 }"
      >
        <div 
          v-for="(image, imgIndex) in row" 
          :key="`${rowIndex}-${imgIndex}`"
          class="masonry-item"
        >
          <v-card class="image-card">
            <v-img 
              :src="image" 
              :height="row.length === 1 ? '600' : '500'" 
              cover 
              class="image-preview"
            >
              <template v-slot:placeholder>
                <v-row class="fill-height ma-0" align="center" justify="center">
                  <v-progress-circular indeterminate color="grey lighten-5"></v-progress-circular>
                </v-row>
              </template>
            </v-img>
          </v-card>
        </div>
      </div>
    </div>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { fetchImagesFromFolder } from '../api/dropbox'

const route = useRoute()
const folderName = ref(route.params.folderName)
const images = ref([])
const breadcrumbs = ref([])

// Extract just the last part of the path for display and capitalize first letter of each word
const displayFolderName = computed(() => {
  const parts = folderName.value.split('/').filter(part => part.trim() !== '')
  const name = parts[parts.length - 1] || 'Gallery'
  // Capitalize first letter of each word
  return name.replace(/\b\w/g, (char) => char.toUpperCase())
})

// Create rows with alternating patterns: 1 image (odd rows) and 2 images (even rows)
const masonryRows = computed(() => {
  const rows = [];
  let currentIndex = 0;
  let rowNumber = 1;
  
  while (currentIndex < images.value.length) {
    // Odd rows: 1 image, Even rows: 2 images
    const itemsInRow = rowNumber % 2 === 1 ? 1 : 2;
    const rowImages = images.value.slice(currentIndex, currentIndex + itemsInRow);
    
    if (rowImages.length > 0) {
      rows.push(rowImages);
    } else {
      break;
    }
    
    currentIndex += itemsInRow;
    rowNumber++;
  }
  
  return rows;
})

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
.masonry-layout {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 16px;
}

.masonry-row {
  display: flex;
  margin-bottom: 24px;
  gap: 24px;
  width: 100%;
}

.masonry-item {
  flex: 1;
  transition: all 0.3s ease;
  overflow: hidden;
  border-radius: 8px;
}

.masonry-item.single {
  /* Single item takes full width */
  flex: 1 1 100%;
}

.masonry-item.double {
  /* Two items share the row equally */
  flex: 1 1 calc(50% - 12px);
}

.image-card {
  height: 100%;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.image-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.image-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.image-card:hover .image-preview {
  transform: scale(1.03);
}

/* Responsive adjustments */
@media (max-width: 960px) {
  .masonry-row {
    flex-direction: column;
    gap: 16px;
  }
  
  .masonry-item,
  .masonry-item.single,
  .masonry-item.double {
    flex: 1 1 100%;
    width: 100%;
  }
  
  .v-img {
    height: 400px !important;
  }
}

@media (max-width: 600px) {
  .v-img {
    height: 300px !important;
  }
}
</style>
