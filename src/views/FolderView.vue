<template>
  <v-container fluid class="folder-view">
    <PageHeader
      :folder-name="displayFolderName"
      :folder-description="folderMetadata?.description || ''"
      :folder-services="folderMetadata?.services || ''"
    />

    <!-- loader only while we don't have anything to show yet -->
    <v-row v-if="loading" class="loader">
      <v-col cols="12" class="text-center">
        <v-progress-circular indeterminate color="primary" size="64" />
        <p class="mt-4">Loading images...</p>
      </v-col>
    </v-row>

    <v-alert v-if="error" type="error" class="ma-4">
      {{ error }}
      <v-btn color="white" variant="text" class="ml-4" @click="fetchFolderImages">
        Retry
      </v-btn>
    </v-alert>

    <div class="images-grid" v-if="tileRows.length">
      <v-row v-for="(row, rowIndex) in tileRows" :key="rowIndex" no-gutters>
        <v-col
          v-for="(tile, colIndex) in row"
          :key="tile.image.path || tile.image.url || (rowIndex + '-' + colIndex)"
          :cols="tile.span"
          class="image-gaps"
        >
          <v-card class="image-card" elevation="0">
            <div class="image-container" :class="tile.span === 12 ? 'single' : 'double'">
              <img
                class="image-el"
                :alt="tile.image.name || 'Gallery image'"
                :src="tinyPlaceholder"
                v-lazy-img="bindingFor(tile, rowIndex, colIndex)"
                @error="onImgError($event)"
              />
              <div class="img-skeleton" aria-hidden="true"></div>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <div v-else-if="!loading">
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
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from 'vuex'
import PageHeader from '@/components/PageHeader.vue'

const route = useRoute()
const store = useStore()

const folderName     = ref(decodeURIComponent(route.params.folderName))
const images         = ref([])
const folderMetadata = ref(null)
const loading        = ref(true)
const error          = ref(null)

/* -------- perf hints -------- */
let hintsInstalled = false
function installPerfHintsOnce () {
  if (hintsInstalled) return
  hintsInstalled = true
  const head = document.head
  const add = (rel, href, attrs = {}) => {
    if ([...head.querySelectorAll(`link[rel="${rel}"]`)].some(l => l.href === href)) return
    const link = document.createElement('link')
    link.rel = rel; link.href = href
    Object.entries(attrs).forEach(([k, v]) => link.setAttribute(k, v))
    head.appendChild(link)
  }
  add('preconnect', 'https://content.dropboxapi.com', { crossorigin: '' })
  add('preconnect', 'https://api.dropboxapi.com', { crossorigin: '' })
}
function preloadFirstImage (href, imagesrcset, imagesizes) {
  if (!href) return
  const head = document.head
  const key = `preload-${href}`
  if (head.querySelector(`link[data-key="${CSS.escape(key)}"]`)) return
  const l = document.createElement('link')
  l.rel = 'preload'
  l.as = 'image'
  l.href = href
  if (imagesrcset) l.setAttribute('imagesrcset', imagesrcset)
  if (imagesizes)  l.setAttribute('imagesizes',  imagesizes)
  l.setAttribute('fetchpriority', 'high')
  l.setAttribute('data-key', key)
  head.appendChild(l)
}

/* ---------- utils ---------- */
const naturalCompare = (a, b) =>
  (a || '').localeCompare(b || '', undefined, { numeric: true, sensitivity: 'base' })

const displayFolderName = computed(() => {
  const parts = folderName.value.split('/').filter(Boolean)
  const name = parts[parts.length - 1] || 'Gallery'
  return name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
})

/* ---------- keep order EXACTLY the same ---------- */
const imagesSorted = computed(() => {
  const list = images.value.slice()
  list.sort((a, b) => {
    const ao = Number.isFinite(a?.order) ? a.order : Infinity
    const bo = Number.isFinite(b?.order) ? b.order : Infinity
    if (ao !== bo) return ao - bo
    return naturalCompare(a?.name, b?.name)
  })
  return list
})

/* ---------- size by orientation ---------- */
function spanFromOrientation (img) {
  const o = String(img?.orientation || img?.organization || '').toLowerCase().trim()
  if (o === 'horizontal') return 12
  if (o === 'square')     return 6
  return null
}
const tileRows = computed(() => {
  const rows = []
  let cur = []
  let used = 0
  let nextFallbackSingle = true
  for (const image of imagesSorted.value) {
    let span = spanFromOrientation(image)
    if (span == null) {
      if (nextFallbackSingle) { span = 12; nextFallbackSingle = false }
      else {
        span = 6
        if (used === 6) nextFallbackSingle = true
      }
    }
    if (used + span > 12) { if (cur.length) rows.push(cur); cur = []; used = 0 }
    cur.push({ image, span })
    used += span
    if (used === 12) { rows.push(cur); cur = []; used = 0 }
  }
  if (cur.length) rows.push(cur)
  return rows
})

/* ---------- global index: ONLY index 0 is eager ---------- */
function globalIndex (rowIndex, colIndex) {
  let idx = 0
  for (let r = 0; r < rowIndex; r++) idx += tileRows.value[r].length
  return idx + colIndex
}

/* ---------- lazy loader ---------- */
const tinyPlaceholder =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjZWVlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4='

function bestBaseUrl (img) {
  return img?.display || img?.thumb || img?.url || '/placeholder.jpg'
}
function withSize (url, size) {
  if (!url) return '/placeholder.jpg'
  try { const u = new URL(url, window.location.origin); u.searchParams.set('s', size); return u.toString() }
  catch { return url.includes('?') ? url.replace(/([?&])s=[^&]+/, `$1s=${size}`) : `${url}?s=${size}` }
}
function widthHint (token) {
  const m = token.match(/^w(\d+)h/i)
  return m ? `${m[1]}w` : '800w'
}
function sizesForSpan (span) {
  return span === 12
    ? '(min-width: 1200px) 100vw, 100vw'
    : '(min-width: 1200px) 50vw, 100vw'
}
function srcsetFor (img, span) {
  const base = bestBaseUrl(img)
  const R320='w320h240', R640='w640h480', R768='w768h512', R1024='w1024h768', R1600='w1600h1200'
  const rungs = span === 12 ? [R320,R640,R768,R1024,R1600] : [R320,R640,R768,R1024]
  return rungs.map(s => `${withSize(base, s)} ${widthHint(s)}`).join(', ')
}

/* Concurrency & observer */
const LOAD_CONCURRENCY = 6
let activeLoads = 0
const queue = []
let io

function setLoadingClass (el, on) {
  el.classList.toggle('is-loading', on)
  const wrap = el.closest('.image-container')
  if (wrap) wrap.classList.toggle('is-loading', on)
}
function nextJob () {
  if (activeLoads >= LOAD_CONCURRENCY) return
  const job = queue.shift(); if (!job) return
  activeLoads++
  job().finally(() => { activeLoads--; nextJob() })
}
function enqueue (job) { queue.push(job); nextJob() }

function ensureObserver () {
  if (io) return io
  io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const el = entry.target
      if (!el.__lazy) return
      if (entry.isIntersecting) {
        io.unobserve(el)
        const { src, srcset, sizes } = el.__lazy
        enqueue(() => new Promise((resolve) => {
          const done = () => { setLoadingClass(el, false); resolve() }
          el.addEventListener('load', done,  { once: true })
          el.addEventListener('error', done, { once: true })
          if (srcset) el.srcset = srcset
          if (sizes)  el.sizes  = sizes
          setLoadingClass(el, true)
          el.decoding = 'async'
          el.loading  = 'lazy'
          el.fetchPriority = 'low'
          el.src = src
        }))
      }
    })
  }, { rootMargin: '700px 0px', threshold: 0.01 })
  return io
}

const vLazyImg = {
  mounted (el, binding) {
    const opts = binding.value || {}
    const isEager = !!opts.eager

    if (isEager) {
      installPerfHintsOnce()
      if (opts.src) preloadFirstImage(opts.src, opts.srcset, opts.sizes)
      if (opts.priority) el.fetchPriority = 'high'
      enqueue(() => new Promise((resolve) => {
        const done = () => { setLoadingClass(el, false); resolve() }
        el.addEventListener('load', done, { once: true })
        el.addEventListener('error', done, { once: true })
        if (opts.srcset) el.srcset = opts.srcset
        if (opts.sizes)  el.sizes  = opts.sizes
        setLoadingClass(el, true)
        el.decoding = 'auto'
        el.loading  = 'eager'
        el.src = opts.src
      }))
      return
    }

    el.__lazy = { src: opts.src, srcset: opts.srcset, sizes: opts.sizes }
    setLoadingClass(el, true)
    ensureObserver().observe(el)
  },
  unmounted (el) {
    if (io) io.unobserve(el)
    delete el.__lazy
  }
}

/* binding for each tile (index 0 eager, rest lazy) */
function bindingFor (tile, rowIndex, colIndex) {
  const base   = bestBaseUrl(tile.image)
  const initialRung = tile.span === 12 ? 'w1024h768' : 'w768h512'
  const src    = withSize(base, initialRung)
  const srcset = srcsetFor(tile.image, tile.span)
  const sizes  = sizesForSpan(tile.span)
  const idx = globalIndex(rowIndex, colIndex)
  const isFirst = idx === 0
  return { src, srcset, sizes, eager: isFirst, priority: isFirst }
}

function onImgError (e) {
  const el = e?.target
  setLoadingClass(el, false)
  if (el) el.src = '/placeholder.jpg'
}

/* ---------- data fetch ---------- */
watch(() => route.params.folderName, (nv) => {
  if (nv) { folderName.value = decodeURIComponent(nv); fetchFolderImages() }
})

function findInStore () {
  const all = store.getters?.getFolders || []
  let folder = all.find(f => f.path === folderName.value)
  if (!folder) {
    const nameOnly = folderName.value.split('/').pop()
    folder = all.find(f => f.name === nameOnly)
  }
  return folder || null
}

/** if store has nothing yet, fetch folder list once to fill metadata (non-blocking) */
async function backfillMetadataIfNeeded () {
  try {
    if (folderMetadata.value) return
    const inStore = findInStore()
    if (inStore) { folderMetadata.value = inStore.metadata || null; return }

    const res = await fetch('/api/dropbox/website-photos', { headers: { Accept: 'application/json' }, cache: 'no-store' })
    if (!res.ok) return
    const data = await res.json()
    const list = Array.isArray(data) ? data : []
    let match = list.find(f => f.path === folderName.value)
    if (!match) {
      const nameOnly = folderName.value.split('/').pop()
      match = list.find(f => f.name === nameOnly)
    }
    if (match) folderMetadata.value = match.metadata || null
  } catch {}
}

async function fetchFolderImages () {
  loading.value = true
  error.value   = null
  images.value  = []

  try {
    // kick off metadata fetch in the background (do NOT block images)
    backfillMetadataIfNeeded()

    // always try to load images with the route param path
    const res = await fetch(`/api/dropbox/files?path=${encodeURIComponent(folderName.value)}&ts=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data = await res.json()
    const list = Array.isArray(data.images) ? data.images : []
    images.value = list.filter(img => !img.is_zero)

    // preload the first visible image (for instant paint)
    await nextTick()
    const firstTile = tileRows.value?.[0]?.[0]
    if (firstTile?.image) {
      const base = bestBaseUrl(firstTile.image)
      const initialRung = firstTile.span === 12 ? 'w1024h768' : 'w768h512'
      const href  = withSize(base, initialRung)
      const srcset = srcsetFor(firstTile.image, firstTile.span)
      const sizes  = sizesForSpan(firstTile.span)
      preloadFirstImage(href, srcset, sizes)

      // publish next-nav LCP hint
      try {
        window.__LCP_CANDIDATES__ = [{ href, imagesrcset: srcset, imagesizes: sizes }]
      } catch {}
    } else {
      window.__LCP_CANDIDATES__ = []
    }

    // ✅ hide spinner as soon as we have the grid structure ready
    loading.value = false
  } catch (err) {
    console.error('Error fetching folder images:', err)
    error.value = 'Failed to load images. ' + (err.message || 'Please try again later.')
    images.value = []
    loading.value = false
  }
}

onMounted(fetchFolderImages)
</script>

<script>
export default {
  directives: {
    lazyImg: {
      mounted(el, binding, vnode) { vnode.ctx?.$?.setupState?.vLazyImg?.mounted?.(el, binding) },
      unmounted(el, binding, vnode) { vnode.ctx?.$?.setupState?.vLazyImg?.unmounted?.(el, binding) }
    }
  }
}
</script>

<style scoped>
.image-gaps { padding: 5px !important; }
.images-grid{ padding-top: .85rem; padding-bottom: .85rem; }
.folder-view { max-width: 1800px; margin: 0 auto; padding: 0; }

.image-card { width: 100%; height: 100%; position: relative; border-radius: 0 !important; overflow: hidden; background: #f5f5f5; box-shadow: none !important; }
.image-container { position: relative; width: 100%; overflow: hidden; background: #f5f5f5; }
.image-container.single { padding-bottom: 66.66%; } /* 3:2 */
.image-container.double { padding-bottom: 100%; }   /* 1:1 */

.image-el { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 0 !important; }
.img-skeleton { position: absolute; inset: 0; z-index: 1; background-size: 200% 100%; pointer-events: none; opacity: 1; transition: opacity .2s ease; }
.image-container:not(.is-loading) .img-skeleton { opacity: 0; }

.loader { display: flex; justify-content: center; align-items: center; min-height: 320px; }

@media (max-width: 960px) { .folder-view { padding: 16px 8px; } }
@media (prefers-reduced-motion: reduce) { .image-el { transition: none; } .img-skeleton { animation: none; transition: none; } }
@media (max-width: 1350px) { .image-gaps { padding: 5px !important; } }
</style>
