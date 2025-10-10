<template>
  <v-container fluid class="home-container">
    <main>
      <div v-if="!loading && !error" class="project-grid">
        <div v-for="img in images" :key="img.path" class="project-card">
          <div class="card-container" @click="goToProject(img)">
            <img
              class="folder-thumbnail"
              :src="thumbSrc(img)"
              :alt="img.name"
              decoding="async"
            />
            <div class="folder-overlay"></div>
          </div>
        </div>
      </div>

      <div v-else-if="loading" class="loading">
        <v-progress-circular indeterminate color="primary" />
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
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
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

/* ✅ Click-through to linked project */
async function goToProject(img) {
  try {
    const proj = img?.project
    if (!proj) return

    const res = await fetch(`/api/dropbox/folder-by-project?project=${encodeURIComponent(proj)}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const folderPath = data?.folder?.path
    if (folderPath) router.push(`/folder/${encodeURIComponent(folderPath)}`)
  } catch (err) {
    console.error('goToProject error:', err)
  }
}

watch(() => route.params.category, fetchCategory)
onMounted(fetchCategory)
</script>

<style scoped>
.home-container {
  padding: 0;
  margin: 0;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  padding: 0.5rem 0;
}

.project-card {
  content-visibility: auto;
  contain-intrinsic-size: 400px 400px;
}

.card-container {
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 100%;
  margin: 0;
  overflow: hidden;
  cursor: pointer;
}

.folder-thumbnail {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 0 !important;
  transition: filter 0.25s ease, opacity 0.25s ease, transform 0.2s ease;
}

/* ✨ Light opaque fade on hover */
.folder-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0);
  opacity: 0;
  transition: opacity 0.25s ease, background 0.25s ease;
  pointer-events: none;
  z-index: 2;
}

.card-container:hover .folder-overlay {
  background: rgba(255, 255, 255, 0.15);
  opacity: 1;
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
