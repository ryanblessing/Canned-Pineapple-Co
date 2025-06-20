<template>
  <v-container fluid class="folder-view">
    <v-row class="mt-0 pt-2">
      <v-col cols="12" class="py-0">
        <v-breadcrumbs :items="breadcrumbs" class="py-0 my-0">
          <template v-slot:divider>
            <v-icon icon="mdi-chevron-right" size="small" class="mx-1"></v-icon>
          </template>
        </v-breadcrumbs>
      </v-col>
    </v-row>

    <v-row class="mt-2 pb-6">
      <v-col cols="12" class="text-center py-0">
        <h3 class="text-h4 text-md-h3 mb-2" style="font-family: var(--font-gotham);">{{ displayFolderName }}</h3>
      </v-col>
    </v-row>

    <!-- Loading State -->
    <v-row v-if="loading" class="justify-center">
      <v-col cols="12" class="text-center">
        <v-progress-circular
          indeterminate
          color="primary"
          size="64"
        ></v-progress-circular>
        <p class="mt-4">Loading images...</p>
      </v-col>
    </v-row>

    <!-- Error State -->
    <v-alert
      v-else-if="error"
      type="error"
      class="ma-4"
    >
      {{ error }}
      <v-btn
        color="white"
        variant="text"
        class="ml-4"
        @click="fetchFolderImages"
      >
        Retry
      </v-btn>
    </v-alert>

    <!-- Images Grid -->
    <v-container v-if="images.length > 0" class="pa-0">
      <v-row v-for="(row, rowIndex) in masonryRows" :key="rowIndex" no-gutters>
        <v-col 
          v-for="(image, imgIndex) in row" 
          :key="`${rowIndex}-${imgIndex}`"
          :cols="row.length === 1 ? '12' : '6'"
          class="pa-2"
        >
          <v-card
            class="image-card"
            elevation="2"
          >
            <div class="image-container">
              <v-img 
                :src="image.url" 
                :alt="image.name || 'Gallery image'"
                :lazy-src="image.thumbnail || image.url"
                cover
                class="image-preview"
                aspect-ratio="1"
              >
                <template v-slot:placeholder>
                  <div class="fill-height d-flex align-center justify-center">
                    <v-progress-circular 
                      indeterminate 
                      color="grey lighten-5"
                      size="32"
                      width="2"
                    ></v-progress-circular>
                  </div>
                </template>
              </v-img>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Empty State -->
    <v-row v-else class="justify-center">
      <v-col v-if="!loading" cols="12" md="8" class="text-center">
        <v-icon size="64" color="grey lighten-1" class="mb-4">mdi-image-off</v-icon>
        <h3 class="text-h6">No images found in this folder</h3>
        <p class="text-body-1 text-medium-emphasis">This folder doesn't contain any images.</p>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { format } from 'date-fns/format'

const route = useRoute()
const folderName = ref(route.params.folderName)
const images = ref([])
const breadcrumbs = ref([])

// Extract just the last part of the path for display and capitalize first letter of each word
const displayFolderName = computed(() => {
  const parts = folderName.value.split('/').filter(part => part.trim() !== '')
  const name = parts[parts.length - 1] || 'Gallery'
  return name.replace(/\b\w/g, (char) => char.toUpperCase())
})

// Create rows with alternating patterns: 1 image (odd rows) and 2 images (even rows)
const masonryRows = computed(() => {
  const rows = []
  let currentIndex = 0
  let rowNumber = 1

  while (currentIndex < images.value.length) {
    const itemsInRow = rowNumber % 2 === 1 ? 1 : 2
    const rowImages = images.value.slice(currentIndex, currentIndex + itemsInRow)

    if (rowImages.length > 0) {
      rows.push(rowImages)
    } else {
      break
    }

    currentIndex += itemsInRow
    rowNumber++
  }

  return rows
})

const loading = ref(true)
const error = ref(null)

async function fetchFolderImages() {
  loading.value = true;
  error.value = null;
  
  try {
    // Use the path query parameter to specify the folder
    const res = await fetch(`/api/dropbox/files?path=${encodeURIComponent(folderName.value)}`);
    if (!res.ok) throw new Error('Failed to fetch Dropbox images');
    
    const responseData = await res.json();
    
    // Handle the new response format - it now has an 'images' property
    images.value = Array.isArray(responseData.images) ? responseData.images : [];

    // Update breadcrumbs - Only show Home and current folder, excluding 'Website Photos'
    const pathParts = folderName.value.split('/').filter(part => part);
    // Get just the current folder name (last part of the path)
    const currentFolder = pathParts[pathParts.length - 1] || '';
    breadcrumbs.value = [
      { 
        title: 'Home', 
        disabled: false, 
        href: '/',
        to: '/'
      },
      { 
        title: currentFolder
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (char) => char.toUpperCase()),
        disabled: true
      }
    ];
    
    console.log('Fetched images:', images.value);
  } catch (err) {
    console.error('Error fetching folder images:', err);
    error.value = 'Failed to load images. ' + (err.message || 'Please try again later.');
  } finally {
    loading.value = false;
  }
}

// Format file size to human readable format
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format date to a readable format
const formatDate = (dateString) => {
  if (!dateString) return 'Unknown date';
  try {
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return 'Unknown date';
    }
    return format(date, 'MMM d, yyyy');
  } catch (e) {
    console.error('Error formatting date:', e);
    return 'Unknown date';
  }
};

onMounted(fetchFolderImages);
</script>

<style scoped>
.folder-view {
  max-width: 1800px;
  margin: 0 auto;
  padding: 24px 16px;
}

.image-container {
  position: relative;
  width: 100%;
  padding-bottom: 100%; /* This makes the container square */
  overflow: hidden;
  background-color: #f5f5f5;
}

.single {
  padding-bottom: 50%; /* Half height for single image rows */
}

.double {
  padding-bottom: 100%; /* Full height for double image rows */
}

.image-card {
  width: 100%;
  height: 100%;
  position: relative;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 0;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  background-color: #f5f5f5;
}

.image-card {
  /* No hover effects */
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.image-preview {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* No hover effects or overlays */

/* Responsive adjustments */
@media (max-width: 1264px) {
  .masonry-layout {
    padding: 0 24px;
  }
  
  .masonry-row {
    gap: 20px;
  }
  
  .double-row .masonry-item {
    flex: 1 1 calc(50% - 10px);
    max-width: calc(50% - 10px);
  }
}

@media (max-width: 960px) {
  .folder-view {
    padding: 16px 8px;
  }
  
  .masonry-layout {
    padding: 0 8px;
  }
  
  .masonry-row {
    flex-direction: column;
    gap: 16px;
    margin-bottom: 16px;
  }
  
  .masonry-item,
  .single-row .masonry-item,
  .double-row .masonry-item {
    width: 100%;
    max-width: 100%;
    flex: 1 1 100% !important;
  }
  
  .image-card {
    aspect-ratio: 4/3;
  }
}

/* Card styles */
.v-card {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform, box-shadow;
  height: 100%;
  border-radius: 0;
}

.v-card:not(.on-hover) {
  transform: scale(1);
}

.v-card.on-hover {
  transform: scale(1.02);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.15) !important;
}

/* Loading and error states */
.loading, .error {
  text-align: center;
  padding: 3rem 1rem;
  min-height: 300px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.error {
  color: #ff4444;
}

/* Smooth transitions */
.v-enter-active,
.v-leave-active {
  transition: opacity 0.3s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}

/* Breadcrumbs */
:deep(.v-breadcrumbs) {
  padding: 8px 0;
  margin-bottom: 16px;
}

:deep(.v-breadcrumbs-item) {
  font-weight: 500;
  text-decoration: none;
  transition: color 0.2s ease;
}

:deep(.v-breadcrumbs-item--disabled) {
  color: rgba(0, 0, 0, 0.6) !important;
  cursor: default;
  pointer-events: none;
}

/* Page title */
.text-h4 {
  font-weight: 600;
  letter-spacing: -0.5px;
  margin: 0.5em 0;
  color: #1a1a1a;
}

/* Empty state */
.text-h6 {
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
}

.text-body-1 {
  color: #666;
  max-width: 500px;
  margin: 0 auto;
}

/* Download button */
.v-btn--icon {
  pointer-events: auto;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  transition: all 0.2s ease;
}

.v-btn--icon:hover {
  background-color: rgba(0, 0, 0, 0.7);
  transform: scale(1.1);
}
</style>
