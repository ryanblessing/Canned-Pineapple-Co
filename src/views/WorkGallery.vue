<template>
  <v-container fluid class="home-container">
    <main>
      <div v-if="!loading && !error" class="project-grid">
        <div
          v-for="(img, idx) in visibleImages"
          :key="keyFor(img, idx)"
          class="project-card"
          :class="{ instant: idx < FIRST6_COUNT, loaded: isLoaded(keyFor(img, idx)) }"
        >
          <div class="card-container" @click="goToProject(img)">
            <div class="skeleton" v-if="!isLoaded(keyFor(img, idx))"></div>

            <img
              class="folder-thumbnail"
              :src="sized(img, idx < FIRST6_COUNT ? 'w768h512' : 'w640h480')"
              :srcset="srcsetFor(img)"
              :sizes="sizesForGrid"
              :alt="img.name || img.title || 'image'"
              :loading="idx < FIRST6_COUNT ? 'eager' : 'lazy'"
              :decoding="idx < FIRST6_COUNT ? 'sync' : 'async'"
              :fetchpriority="idx < FIRST6_COUNT ? 'high' : 'low'"
              @load="markLoaded(keyFor(img, idx))"
              @error="markLoaded(keyFor(img, idx))"
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

const FIRST6_COUNT   = 6
const REM_BATCH_SIZE = 12

const route  = useRoute()
const router = useRouter()

const loading       = ref(true)
const error         = ref(null)
const images        = ref([])
const visibleImages = ref([])
const loadedMap     = ref(Object.create(null))
let startedRemainder = false

const keyFor     = (img, idx) => img?.path || img?.id || `idx-${idx}`
const isLoaded   = key => !!loadedMap.value[key]
const markLoaded = key => { loadedMap.value[key] = true }

function robustDecode (s) { try { return decodeURIComponent(s) } catch { return s } }
function resolveCategory () {
  const p1 = route?.params?.category || route?.params?.slug
  if (typeof p1 === 'string' && p1.trim()) return robustDecode(p1)
  const cands = [route.path, route.fullPath, window.location.hash, window.location.pathname]
  for (const p of cands) {
    if (!p) continue
    const m = String(p).match(/\/work\/([^\/?#]+)/i)
    if (m && m[1]) return robustDecode(m[1])
  }
  const q = new URLSearchParams(window.location.search).get('category')
  return q ? robustDecode(q) : ''
}

const baseUrl = (img) => img.display || img.thumb || img.url || '/placeholder.jpg'
const withSize = (url, size) => {
  try { const u = new URL(url, window.location.origin); u.searchParams.set('s', size); return u.toString() }
  catch { return url.includes('?') ? url.replace(/([?&])s=[^&]+/, `$1s=${size}`) : `${url}?s=${size}` }
}
const sized = (img, size) => withSize(baseUrl(img), size)

const srcsetFor = (img) => {
  const R320='w320h240', R640='w640h480', R768='w768h512', R1024='w1024h768', R1600='w1600h1200'
  const b = baseUrl(img)
  return [
    `${withSize(b, R320)} 320w`,
    `${withSize(b, R640)} 640w`,
    `${withSize(b, R768)} 768w`,
    `${withSize(b, R1024)} 1024w`,
    `${withSize(b, R1600)} 1600w`,
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
function warmAndDecode (href) {
  try {
    const img = new Image()
    img.decoding = 'sync'
    img.loading  = 'eager'
    img.src = href
  } catch {}
}

function startRemainderBatches (items) {
  if (startedRemainder) return
  startedRemainder = true
  let i = 0
  const step = () => {
    if (i >= items.length) return
    const end = Math.min(i + REM_BATCH_SIZE, items.length)
    visibleImages.value = visibleImages.value.concat(items.slice(i, end))
    i = end
    if (i < items.length) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

async function fetchCategory () {
  loading.value = true
  error.value   = null
  images.value  = []
  visibleImages.value = []
  loadedMap.value = Object.create(null)
  startedRemainder = false

  try {
    preconnectOnce()
    const cat = resolveCategory()
    if (!cat) { error.value = 'Missing category in URL.'; loading.value = false; return }

    const res = await fetch(`/api/dropbox/by-category?category=${encodeURIComponent(cat)}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data = await res.json()
    const list = Array.isArray(data.images) ? data.images : []
    images.value = list

    const first = list.slice(0, FIRST6_COUNT)

    for (const it of first) {
      const href = sized(it, 'w768h512')
      preloadImage(href, srcsetFor(it), sizesForGrid)
      warmAndDecode(href)
    }

    visibleImages.value = first

    const remainder = list.slice(FIRST6_COUNT)
    requestAnimationFrame(() => startRemainderBatches(remainder))
  } catch (e) {
    console.error('by-category error:', e)
    error.value = e?.message || 'Failed to load category images'
  } finally {
    loading.value = false
  }
}

async function goToProject (img) {
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

watch(() => route.fullPath, fetchCategory)
onMounted(fetchCategory)
</script>

<style scoped>
.home-container { padding: 0; margin: 0 auto; max-width: 1800px; border-top: none !important; position: relative; }
.project-grid { width: 100%; display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; padding-top: .85rem; padding-bottom: .85rem; }
.project-card { position: relative; }
.card-container { position: relative; width: 100%; aspect-ratio: 1 / 1; overflow: hidden; margin: 0; cursor: pointer; }
.skeleton { position: absolute; inset: 0; background: linear-gradient(90deg,rgba(0,0,0,0.06) 25%,rgba(0,0,0,0.10) 37%,rgba(0,0,0,0.06) 63%); background-size: 400% 100%; animation: shimmer 1.2s ease-in-out infinite; }
@keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }
.folder-thumbnail { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 0 !important; transition: opacity .25s ease, filter .25s ease, transform .2s ease; opacity: 0; }
.project-card.loaded .skeleton { display: none; }
.project-card.loaded .folder-thumbnail { opacity: 1; }
.folder-overlay { position: absolute; inset: 0; background: rgba(255,255,255,0); opacity: 0; transition: opacity 0.25s ease, background 0.25s ease; pointer-events: none; z-index: 2; }
.card-container:hover .folder-overlay { background: rgba(255,255,255,0.15); opacity: 1; }
.loading { text-align: center; padding: 2rem; color: #666; font-size: 1.1rem; }
.error   { text-align: center; padding: 2rem; color: #ff4444; }
@media (max-width: 1350px) { .project-grid { grid-template-columns: repeat(3, 1fr); gap: 8px; padding-top: .85rem; padding-bottom: .85rem; } }
@media (max-width: 1024px) { .project-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; } }
@media (max-width: 600px)  { .project-grid { grid-template-columns: repeat(2, 1fr); gap: 6px; } }
</style>
