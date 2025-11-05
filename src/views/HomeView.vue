<template>
  <v-container fluid class="home-container">
    <!-- ✅ Page header back -->
    <PageHeader />

    <main>
      <div v-if="!loading && !error" class="project-grid">
        <div
          v-for="(folder, idx) in visibleFolders"
          :key="folder.id || folder.path || folder.name || idx"
          class="project-card"
          :class="{ instant: idx < FIRST6_COUNT, loaded: isLoaded(idx) }"
        >
          <div class="card-container">
            <router-link
              v-if="folder.path"
              :to="`/folder/${encodeURIComponent(folder.path)}`"
              class="folder-link"
            >
              <div class="skeleton" v-if="!isLoaded(idx)"></div>

              <img
                class="folder-thumbnail"
                :src="sized(folder.thumbnail || '/placeholder.jpg', idx < FIRST6_COUNT ? 'w768h512' : 'w640h480')"
                :srcset="srcsetFor(folder.thumbnail)"
                :sizes="sizesForGrid"
                :alt="folder.metadata?.title || folder.name || 'folder'"
                :loading="idx < FIRST6_COUNT ? 'eager' : 'lazy'"
                :decoding="idx < FIRST6_COUNT ? 'sync' : 'async'"
                :fetchpriority="idx < FIRST6_COUNT ? 'high' : 'low'"
                @load="markLoaded(idx)"
                @error="markLoaded(idx)"
              />
              <div class="folder-overlay"></div>
            </router-link>
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
          <v-btn @click="fetchFolders" class="mt-2" color="error" outlined>Retry</v-btn>
        </v-alert>
      </div>

      <div v-else class="no-projects">
        <p>No projects found.</p>
      </div>
    </main>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import PageHeader from '@/components/PageHeader.vue'  // ✅ import

/* ---------------- constants ---------------- */
const FIRST6_COUNT   = 6
const REM_BATCH_SIZE = 12

/* ---------------- state ---------------- */
const loading        = ref(true)
const error          = ref(null)
const folders        = ref([])
const visibleFolders = ref([])
const loadedMap      = ref({})
let startedRemainder = false

/* ---------------- helpers ---------------- */
const isLoaded   = idx => !!loadedMap.value[idx]
const markLoaded = idx => { loadedMap.value[idx] = true }

function enrichFolder (folder) {
  return {
    ...folder,
    metadata: {
      title: folder?.metadata?.title || folder?.name,
      location: folder?.metadata?.location || '',
      description: folder?.metadata?.description || '',
      category: folder?.metadata?.category || '',
      services: folder?.metadata?.services || '',
      tags: Array.isArray(folder?.metadata?.tags) ? folder.metadata.tags : []
    }
  }
}
const withSize = (url, size) => {
  if (!url) return '/placeholder.jpg'
  try { const u = new URL(url, window.location.origin); u.searchParams.set('s', size); return u.toString() }
  catch { return url.includes('?') ? url.replace(/([?&])s=[^&]+/, `$1s=${size}`) : `${url}?s=${size}` }
}
const sized = (url, size) => withSize(url, size)
const srcsetFor = (url) => {
  if (!url) url = '/placeholder.jpg'
  const R320='w320h240', R640='w640h480', R768='w768h512', R1024='w1024h768', R1600='w1600h1200'
  return [
    `${withSize(url, R320)} 320w`,
    `${withSize(url, R640)} 640w`,
    `${withSize(url, R768)} 768w`,
    `${withSize(url, R1024)} 1024w`,
    `${withSize(url, R1600)} 1600w`,
  ].join(', ')
}
const sizesForGrid = '(min-width: 1025px) 33vw, 50vw'

function preconnectOnce () {
  try {
    if (document.querySelector('link[data-preconnect-origin]')) return
    const link = document.createElement('link')
    link.rel = 'preconnect'
    link.href = window.location.origin
    link.setAttribute('data-preconnect-origin', '1')
    document.head.appendChild(link)
  } catch {}
}
function preloadImage (href, imagesrcset, imagesizes) {
  try {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as  = 'image'
    link.href = href
    if (imagesrcset) link.setAttribute('imagesrcset', imagesrcset)
    if (imagesizes)  link.setAttribute('imagesizes',  imagesizes)
    document.head.appendChild(link)
  } catch {}
}
function warm (href) {
  try { const img = new Image(); img.decoding = 'sync'; img.loading = 'eager'; img.src = href } catch {}
}

function startRemainderBatches (items) {
  if (startedRemainder) return
  startedRemainder = true
  let i = 0
  const step = () => {
    if (i >= items.length) return
    const end = Math.min(i + REM_BATCH_SIZE, items.length)
    visibleFolders.value = visibleFolders.value.concat(items.slice(i, end))
    i = end
    if (i < items.length) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

/* ---------------- fetch ---------------- */
async function fetchFolders () {
  loading.value = true
  error.value   = null
  folders.value = []
  visibleFolders.value = []
  loadedMap.value = {}
  startedRemainder = false

  try {
    preconnectOnce()

    const res = await fetch('/api/dropbox/website-photos', { headers: { Accept: 'application/json' }, cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const list = Array.isArray(data) ? data.map(enrichFolder) : []

    folders.value = list

    const first = list.slice(0, FIRST6_COUNT)
    for (const f of first) {
      const href = sized(f.thumbnail || '/placeholder.jpg', 'w768h512')
      preloadImage(href, srcsetFor(f.thumbnail), sizesForGrid)
      warm(href)
    }

    visibleFolders.value = first

    const remainder = list.slice(FIRST6_COUNT)
    requestAnimationFrame(() => startRemainderBatches(remainder))
  } catch (e) {
    console.error('fetch folders error:', e)
    error.value = e?.message || 'Failed to load projects.'
  } finally {
    loading.value = false
  }
}

onMounted(fetchFolders)
</script>

<style scoped>
.home-container { padding: 0; margin: 0; }
.project-grid   { width: 100%; display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; padding-top: .85rem; padding-bottom: .85rem; }
.project-card   { position: relative; }
.card-container { position: relative; width: 100%; aspect-ratio: 1 / 1; overflow: hidden; margin: 0; }
.folder-link    { display: block; text-decoration: none; }

/* skeleton */
.skeleton { position: absolute; inset: 0; background: linear-gradient(90deg,rgba(0,0,0,0.06) 25%,rgba(0,0,0,0.10) 37%,rgba(0,0,0,0.06) 63%); background-size: 400% 100%; animation: shimmer 1.2s ease-in-out infinite; }
@keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }

/* image */
.folder-thumbnail { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 0 !important; transition: opacity .25s ease; opacity: 0; }
.project-card.loaded .skeleton { display: none; }
.project-card.loaded .folder-thumbnail { opacity: 1; }

.folder-overlay { position: absolute; inset: 0; background: rgba(255,255,255,0); opacity: 0; transition: opacity 0.25s ease, background 0.25s ease; pointer-events: none; z-index: 2; }
.card-container:hover .folder-overlay { background: rgba(255,255,255,0.15); opacity: 1; }

/* states */
.loading { text-align: center; padding: 2rem; color: #666; font-size: 1.1rem; }
.error   { text-align: center; padding: 2rem; color: #ff4444; }

/* responsive */
@media (max-width: 1350px) { .project-grid { grid-template-columns: repeat(3, 1fr); gap: 8px; } }
@media (max-width: 1024px) { .project-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; } }
@media (max-width: 600px)  { .project-grid { grid-template-columns: repeat(2, 1fr); gap: 6px; } }
</style>
