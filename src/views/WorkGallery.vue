<template>
  <v-container fluid class="home-container">
    <main>
      <div v-if="!loading && !error" class="project-grid">
        <div
          v-for="img in images"
          :key="img.path"
          class="project-card"
        >
          <div class="card-container">
            <!-- Link to the folder this image belongs to -->
            <router-link
              v-if="img.folder?.path"
              :to="`/folder/${encodeURIComponent(img.folder.path)}`"
              class="folder-link"
            >
              <!-- same square tile as homepage, no overlay/text -->
              <v-card class="card-front" flat>
                <v-img
                  :src="img.thumb_url || img.url || '/placeholder.jpg'"
                  height="600"
                  cover
                  class="folder-thumbnail"
                  decoding="async"
                />
              </v-card>
            </router-link>
          </div>
        </div>
      </div>

      <div v-else-if="loading" class="loading">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
        <p>Loading projects...</p>
      </div>

      <div v-else-if="error" class="error">
        <v-alert type="error" class="ma-4">
          {{ error }}
          <v-btn @click="fetchCategory" class="mt-2" color="error" outlined>Retry</v-btn>
        </v-alert>
      </div>

      <div v-else class="no-projects">
        <p>No images found.</p>
      </div>
    </main>
  </v-container>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const images = ref([])
const loading = ref(true)
const error = ref(null)

async function fetchCategory() {
  loading.value = true
  error.value = null
  images.value = []
  try {
    const cat = encodeURIComponent(route.params.category)
    const res = await fetch(`/api/dropbox/by-category?category=${cat}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    images.value = Array.isArray(data.images) ? data.images : []
  } catch (e) {
    console.error('by-category error:', e)
    error.value = e?.message || 'Failed to load category images'
  } finally {
    loading.value = false
  }
}

watch(() => route.params.category, fetchCategory)
onMounted(fetchCategory)
</script>

<style scoped>
/* Same grid/tiles as homepage, but no overlay text */

/* Container */
.home-container {
  padding: 0;
  margin: 0;
}

/* Grid identical to homepage */
.project-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  padding: 0.5rem 0;
}

.project-card { }

.folder-link {
  text-decoration: none;
  display: block;
  position: relative;
  overflow: hidden;
  border-radius: 0;
  height: 0;
  padding-bottom: 100%; /* Square tiles */
}

.card-container {
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 100%;
  margin: 0;
  overflow: hidden;
}

.card-front {
  position: absolute;
  inset: 0;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  background-color: #f5f5f5;
  overflow: hidden;
  border-radius: 0 !important;
}

.folder-thumbnail {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transition: opacity 0.3s ease;
  border-radius: 0 !important;
}

.folder-link:hover .folder-thumbnail {
  opacity: 0.8;
}

/* Loading / error */
.loading {
  text-align: center;
  padding: 2rem;
  color: #666;
  font-size: 1.1rem;
}

.error {
  text-align: center;
  padding: 2rem;
  color: #ff4444;
}
</style>
