<template>
  <v-container fluid class="folder-view">
    <PageHeader 
      :folder-name="displayFolderName" 
      :folder-description="folderMetadata?.description || ''"
      :folder-services="folderMetadata?.services || ''"
    />

    <v-row v-if="loading" class="loader">
      <v-col cols="12" class="text-center">
        <v-progress-circular indeterminate color="primary" size="64" />
        <p class="mt-4">Loading images...</p>
      </v-col>
    </v-row>

    <!-- <v-alert v-if="error" type="error" class="ma-4">
      {{ error }}
      <v-btn color="white" variant="text" class="ml-4" @click="fetchFolderImages">
        Retry
      </v-btn>
    </v-alert> -->

    <div class="images-grid" v-if="images.length > 0">
      <v-row v-for="(row, rowIndex) in masonryRows" :key="rowIndex" no-gutters>
        <v-col
          v-for="image in row"
          :key="image.path"
          :cols="row.length === 1 ? '12' : '6'"
          class="pa-1"
          :class="{'v-col-12': row.length === 1, 'v-col-6': row.length > 1}"
        >
          <v-card class="image-card" elevation="2">
            <div class="image-container">
              <div class="image-wrapper">
                <v-img
                  :src="image.url"
                  :alt="image.name || 'Gallery image'"
                  :lazy-src="image.thumbnail || image.url"
                  contain
                  class="image-preview"
                >
                  <template #placeholder>
                    <div class="fill-height d-flex align-center justify-center">
                      <v-progress-circular indeterminate color="grey lighten-5" size="32" width="2" />
                    </div>
                  </template>
                </v-img>
                <!-- <div class="image-caption">
                  {{ image.name }}
                  {{ image.orientation }}
                  {{ image.order }}
                </div> -->
              </div>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <div v-else-if="images.length === 0 && !loading">
      <v-row class="justify-center">
        <v-col cols="12" md="8" class="text-center">
          <v-icon size="64" color="grey lighten-1" class="mb-4">mdi-image-off</v-icon>
          <h3 class="text-h6">No images found in this folder</h3>
          <p class="text-body-1 text-medium-emphasis">This folder doesn't contain any images.</p>
        </v-col>
      </v-row>
    </div>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from 'vuex'
import PageHeader from '@/components/PageHeader.vue'
import { format } from 'date-fns'

const route = useRoute()
const store = useStore()
const folderName = ref(decodeURIComponent(route.params.folderName))
const images = ref([])
const breadcrumbs = ref([])
const folderMetadata = ref(null)
const currentFolder = ref(null)
const loading = ref(true)
const error = ref(null)

/** Natural filename compare for stable tie-breaks */
const naturalCompare = (a, b) =>
  (a || '').localeCompare(b || '', undefined, { numeric: true, sensitivity: 'base' })

/** Display name = last segment, title-cased */
const displayFolderName = computed(() => {
  const parts = folderName.value.split('/').filter(part => part.trim() !== '')
  const name = parts[parts.length - 1] || 'Gallery'
  return name.replace(/\b\w/g, (char) => char.toUpperCase())
})

/** Sort by `order` (1..N; null last) then natural filename */
const sortedImages = computed(() => {
  const copy = images.value.slice()
  copy.sort((a, b) => {
    const ao = Number.isFinite(a?.order) ? a.order : Infinity
    const bo = Number.isFinite(b?.order) ? b.order : Infinity
    if (ao !== bo) return ao - bo
    return naturalCompare(a?.name, b?.name)
  })
  return copy
})

/** Build rows alternating between horizontal and square images */
const masonryRows = computed(() => {
  const rows = []
  const list = [...sortedImages.value]
  const horizontalImages = list.filter(img => img.orientation === 'horizontal')
  const squareImages = list.filter(img => img.orientation !== 'horizontal')
  
  let hIndex = 0
  let sIndex = 0
  let nextShouldBeHorizontal = true
  
  while (hIndex < horizontalImages.length || sIndex < squareImages.length) {
    if (nextShouldBeHorizontal && hIndex < horizontalImages.length) {
      // Add horizontal image
      rows.push([horizontalImages[hIndex++]])
    } else if (sIndex < squareImages.length) {
      // Add two square images if available, otherwise just one
      const squares = []
      squares.push(squareImages[sIndex++])
      if (sIndex < squareImages.length) {
        squares.push(squareImages[sIndex++])
      }
      rows.push(squares)
    } else if (hIndex < horizontalImages.length) {
      // If no more squares but still have horizontals
      rows.push([horizontalImages[hIndex++]])
    }
    nextShouldBeHorizontal = !nextShouldBeHorizontal
  }
  
  return rows
})

/** Keep folder page reactive to route changes */
watch(() => route.params.folderName, (newFolderName) => {
  if (newFolderName) {
    folderName.value = decodeURIComponent(newFolderName)
    fetchFolderImages()
  }
})

/** Resolve the current folder from Vuex store */
const findCurrentFolder = () => {
  const allFolders = store.getters.getFolders
  let folder = allFolders.find(f => f.path === folderName.value)
  if (!folder) {
    const folderNameOnly = folderName.value.split('/').pop()
    folder = allFolders.find(f => f.name === folderNameOnly)
  }
  return folder || null
}

async function fetchFolderImages() {
  loading.value = true
  error.value = null
  try {
    currentFolder.value = findCurrentFolder()
    if (!currentFolder.value) throw new Error('Folder not found')

    folderMetadata.value = currentFolder.value.metadata || null

    const res = await fetch(`/api/dropbox/files?path=${encodeURIComponent(folderName.value)}`)
    if (!res.ok) throw new Error('Failed to fetch Dropbox images')

    const responseData = await res.json()
    const allImages = Array.isArray(responseData.images) ? responseData.images : []

    // Defensive: filter out any zero-order images if they ever slip through
    images.value = allImages.filter(img => !img.is_zero)

    // Breadcrumbs (use metadata title if present)
    const displayName =
      folderMetadata.value?.title ||
      folderName.value.split('/').pop()
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())

    breadcrumbs.value = [
      { title: 'Murals', disabled: false, href: '/', to: '/' },
      { title: displayName, disabled: true }
    ]

    console.log('Fetched folder data:', {
      folder: currentFolder.value,
      metadata: folderMetadata.value,
      imageCount: images.value.length
    })
  } catch (err) {
    console.error('Error fetching folder images:', err)
    error.value = 'Failed to load images. ' + (err.message || 'Please try again later.')
  } finally {
    loading.value = false
  }
}

/** Human-readable file size */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/** Safe date formatting */
const formatDate = (dateString) => {
  if (!dateString) return 'Unknown date'
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString)
      return 'Unknown date'
    }
    return format(date, 'MMM d, yyyy')
  } catch (e) {
    console.error('Error formatting date:', e)
    return 'Unknown date'
  }
}

onMounted(fetchFolderImages)
</script>

<style scoped>
.folder-description {
  max-width: 1200px;
  margin: 0 auto;
  color: #8a8a8a;
  font-size: .9rem;
  line-height: 1.5;
  padding: 0 1rem 2rem;
  white-space: pre-line;
}

.title-underline { position: relative; display: inline-block; padding-bottom: 12px; }
.title-underline::after {
  content: '';
  position: absolute;
  left: -60px; right: -60px; bottom: 0; height: 0.5px;
  background-color: #42b983;
}

.folder-view { max-width: 1800px; margin: 0 auto; padding: 0 ; }

.image-container {
  /* position: relative; */
  width: 100%;
  height: 100%;
  /* display: flex; */
  /* align-items: flex-start;
  justify-content: center;
  background-color: #f5f5f5;
  padding-top: 0; */
}

.single { padding-bottom: 50%; }
.double { padding-bottom: 100%; }

/* .image-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
} */

.image-preview {
  max-width: 100%;
  max-height: 100%;
  /* width: 100%;
  height: 100%; */
  object-fit: contain;
  /* transition: opacity 0.3s ease; */
}

/* hover for testing */
.image-caption {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px;
  text-align: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* hover for testing */
.image-wrapper:hover .image-caption {
  opacity: 1;
}

/* .image-wrapper:hover .image-preview {
  opacity: 0.9;
} */

.image-card {
  height: auto;
  position: relative;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 0;
  overflow: hidden;
}

/* @media (max-width: 1264px) {
  .masonry-layout { padding: 0 24px; }
  .masonry-row { gap: 20px; }
  .double-row .masonry-item { flex: 1 1 calc(50% - 10px); max-width: calc(50% - 10px); }
}

@media (max-width: 960px) {
  .folder-view { padding: 16px 8px; }
  .masonry-layout { padding: 0 8px; }
  .masonry-row { flex-direction: column; gap: 16px; margin-bottom: 16px; }
  .masonry-item,
  .single-row .masonry-item,
  .double-row .masonry-item { width: 100%; max-width: 100%; flex: 1 1 100% !important; }
  .image-card { aspect-ratio: 4/3; }
} */

.images-grid{
  padding-top: .85rem;
}

.v-card {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform, box-shadow;
  /* height: 100%; border-radius: 0; */
  width: 100%;
}

.v-card.on-hover {
  transform: scale(1.02);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.15) !important;
}

.loader { display: flex; justify-content: center; align-items: center; min-height: 400px; }
.error { color: #ff4444; }

.v-enter-active, .v-leave-active { transition: opacity 0.3s ease; }
.v-enter-from, .v-leave-to { opacity: 0; }

:deep(.v-breadcrumbs) { padding: 8px 0; margin-bottom: 16px; }
:deep(.v-breadcrumbs-item) { font-weight: 500; text-decoration: none; transition: color 0.2s ease; }
:deep(.v-breadcrumbs-item--disabled) { color: rgba(0, 0, 0, 0.6) !important; cursor: default; pointer-events: none; }

.text-h4 { font-weight: 600; letter-spacing: -0.5px; margin: 0.5em 0; color: #1a1a1a; }
.text-h6 { font-weight: 600; margin-bottom: 8px; color: #333; }
.text-body-1 { color: #666; max-width: 500px; margin: 0 auto; }

.v-btn--icon {
  pointer-events: auto; background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px); transition: all 0.2s ease;
}
.v-btn--icon:hover { background-color: rgba(0, 0, 0, 0.7); transform: scale(1.1); }
</style>