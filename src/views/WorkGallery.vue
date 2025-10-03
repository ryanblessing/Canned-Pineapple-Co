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
            <!-- Non-clickable square tile -->
            <div class="tile-box">
              <v-card class="card-front" flat>
                <v-img
                  :src="thumbSrc(img)"
                  height="100%"
                  cover
                  class="folder-thumbnail"
                  decoding="async"
                />
              </v-card>
            </div>
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

function thumbSrc(img) {
  return img.display || img.thumb || img.thumb_url || img.url || '/placeholder.jpg'
}

async function fetchCategory() {
  loading.value = true
  error.value = null
  images.value = []

  try {
    const cat = String(route.params.category || '').trim()
    if (!cat) throw new Error('Missing category')

    // Use /by-category; we do NOT use any project_folder or linking logic here
    const res = await fetch(`/api/dropbox/by-category?category=${encodeURIComponent(cat)}`, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    })
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
/* Container */
.home-container {
  padding: 0;
  margin: 0;
}

/* Grid: 3 across, square tiles */
.project-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  padding: 0.5rem 0;
}

.project-card { }

.card-container {
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 100%; /* perfect square */
  margin: 0;
  overflow: hidden;
}

/* Non-clickable tile wrapper */
.tile-box {
  position: absolute;
  inset: 0;
  pointer-events: none; /* ensures no clicks */
}

.card-front {
  position: absolute;
  inset: 0;
  transition: opacity 0.3s ease;
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
  border-radius: 0 !important;
  object-fit: cover;
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

/* Responsive tweaks */
@media (max-width: 960px) {
  .project-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 600px) {
  .project-grid {
    grid-template-columns: 1fr;
  }
}
</style>
