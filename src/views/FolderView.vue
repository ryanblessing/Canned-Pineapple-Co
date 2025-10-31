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
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import PageHeader from '@/components/PageHeader.vue';

const route = useRoute();
const store = useStore();

const folderName     = ref(decodeURIComponent(route.params.folderName));
const images         = ref([]);
const folderMetadata = ref(null);
const currentFolder  = ref(null);
const loading        = ref(true);
const error          = ref(null);

/* -------- perf hints (same idea as homepage) -------- */
let hintsInstalled = false;
function installPerfHintsOnce() {
  if (hintsInstalled) return;
  hintsInstalled = true;
  const head = document.head;
  const add = (rel, href, attrs = {}) => {
    if ([...head.querySelectorAll(`link[rel="${rel}"]`)].some(l => l.href === href)) return;
    const link = document.createElement('link');
    link.rel = rel; link.href = href;
    Object.entries(attrs).forEach(([k, v]) => link.setAttribute(k, v));
    head.appendChild(link);
  };
  add('preconnect', 'https://content.dropboxapi.com', { crossorigin: '' });
  add('preconnect', 'https://api.dropboxapi.com', { crossorigin: '' });
}
function preloadFirstImage(href, imagesrcset, imagesizes) {
  if (!href) return;
  const head = document.head;
  const key = `preload-${href}`;
  if (head.querySelector(`link[data-key="${CSS.escape(key)}"]`)) return;
  const l = document.createElement('link');
  l.rel = 'preload';
  l.as = 'image';
  l.href = href;
  if (imagesrcset) l.setAttribute('imagesrcset', imagesrcset);
  if (imagesizes)  l.setAttribute('imagesizes',  imagesizes);
  l.setAttribute('fetchpriority', 'high');
  l.setAttribute('data-key', key);
  head.appendChild(l);
}

/* ---------- utils ---------- */
const naturalCompare = (a, b) =>
  (a || '').localeCompare(b || '', undefined, { numeric: true, sensitivity: 'base' });

const displayFolderName = computed(() => {
  const parts = folderName.value.split('/').filter(Boolean);
  const name = parts[parts.length - 1] || 'Gallery';
  return name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
});

/* ---------- keep order EXACTLY the same (unchanged) ---------- */
const imagesSorted = computed(() => {
  const list = images.value.slice();
  list.sort((a, b) => {
    const ao = Number.isFinite(a?.order) ? a.order : Infinity;
    const bo = Number.isFinite(b?.order) ? b.order : Infinity;
    if (ao !== bo) return ao - bo;
    return naturalCompare(a?.name, b?.name);
  });
  return list;
});

/* ---------- size by orientation (unchanged) ---------- */
function spanFromOrientation(img) {
  const o = String(img?.orientation || img?.organization || '').toLowerCase().trim();
  if (o === 'horizontal') return 12;
  if (o === 'square')     return 6;
  return null;
}
const tileRows = computed(() => {
  const rows = [];
  let cur = [];
  let used = 0;
  let nextFallbackSingle = true; // keeps your 12 / 6+6 look for unknowns

  for (const image of imagesSorted.value) {
    let span = spanFromOrientation(image);
    if (span == null) {
      if (nextFallbackSingle) { span = 12; nextFallbackSingle = false; }
      else {
        span = 6;
        if (used === 6) nextFallbackSingle = true;
      }
    }
    if (used + span > 12) { if (cur.length) rows.push(cur); cur = []; used = 0; }
    cur.push({ image, span });
    used += span;
    if (used === 12) { rows.push(cur); cur = []; used = 0; }
  }
  if (cur.length) rows.push(cur);
  return rows;
});

/* ---------- global index: ONLY index 0 is eager ---------- */
function globalIndex(rowIndex, colIndex) {
  let idx = 0;
  for (let r = 0; r < rowIndex; r++) idx += tileRows.value[r].length;
  return idx + colIndex;
}

/* ---------- lazy loader (mirror homepage behavior) ---------- */
const tinyPlaceholder =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjZWVlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=';

function bestBaseUrl(img) {
  return img?.display || img?.thumb || img?.url || '/placeholder.jpg';
}
function withSize(url, size) {
  if (!url) return '/placeholder.jpg';
  try {
    const u = new URL(url, window.location.origin);
    u.searchParams.set('s', size);
    return u.toString();
  } catch {
    return url.includes('?') ? url.replace(/([?&])s=[^&]+/, `$1s=${size}`) : `${url}?s=${size}`;
  }
}
function widthHint(token) {
  const m = token.match(/^w(\d+)h/i);
  return m ? `${m[1]}w` : '800w';
}
function sizesForSpan(span) {
  return span === 12
    ? '(min-width: 1200px) 100vw, 100vw'
    : '(min-width: 1200px) 50vw, 100vw';
}
function srcsetFor(img, span) {
  const base = bestBaseUrl(img);
  const rungs = span === 12
    ? ['w1024h768', 'w1600h1200', 'w2048h1536']
    : ['w640h480', 'w768h512', 'w1024h768'];
  return rungs.map(s => `${withSize(base, s)} ${widthHint(s)}`).join(', ');
}

/* Concurrency & observer tuned the same spirit as home */
const LOAD_CONCURRENCY = 6; // modest to reduce early contention
let activeLoads = 0;
const queue = [];
let io;

function setLoading(el, on) {
  el.classList.toggle('is-loading', on);
  const wrap = el.closest('.image-container');
  if (wrap) wrap.classList.toggle('is-loading', on);
}
function nextJob() {
  if (activeLoads >= LOAD_CONCURRENCY) return;
  const job = queue.shift(); if (!job) return;
  activeLoads++;
  job().finally(() => { activeLoads--; nextJob(); });
}
function enqueue(job) { queue.push(job); nextJob(); }

function ensureObserver() {
  if (io) return io;
  io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const el = entry.target;
      if (!el.__lazy) return;
      if (entry.isIntersecting) {
        io.unobserve(el);
        const { src, srcset, sizes } = el.__lazy;
        enqueue(() => new Promise((resolve) => {
          const done = () => { setLoading(el, false); resolve(); };
          el.addEventListener('load', done,   { once: true });
          el.addEventListener('error', done,  { once: true });
          if (srcset) el.srcset = srcset;
          if (sizes)  el.sizes  = sizes;
          setLoading(el, true);
          el.decoding = 'async';
          el.loading  = 'lazy';
          el.fetchPriority = 'low';
          el.src = src;
        }));
      }
    });
  }, { rootMargin: '700px 0px', threshold: 0.01 });
  return io;
}

const vLazyImg = {
  mounted(el, binding) {
    const opts = binding.value || {};
    const isEager = !!opts.eager;

    if (isEager) {
      // Mirror homepage: eager + high priority for the FIRST image only
      installPerfHintsOnce();
      if (opts.src) {
        // Start fetch before <img> paints, like we did on home
        preloadFirstImage(opts.src, opts.srcset, opts.sizes);
      }
      if (opts.priority) el.fetchPriority = 'high';
      enqueue(() => new Promise((resolve) => {
        const done = () => { setLoading(el, false); resolve(); };
        el.addEventListener('load', done, { once: true });
        el.addEventListener('error', done, { once: true });
        if (opts.srcset) el.srcset = opts.srcset;
        if (opts.sizes)  el.sizes  = opts.sizes;
        setLoading(el, true);
        el.decoding = 'auto';
        el.loading  = 'eager';
        el.src = opts.src; // small initial rung; srcset can upgrade if needed
      }));
      return;
    }

    // Everyone else: true lazy
    el.__lazy = { src: opts.src, srcset: opts.srcset, sizes: opts.sizes };
    setLoading(el, true);
    ensureObserver().observe(el);
  },
  unmounted(el) {
    if (io) io.unobserve(el);
    delete el.__lazy;
  }
};

/* binding for each tile (index 0 eager, rest lazy) */
function bindingFor(tile, rowIndex, colIndex) {
  const base   = bestBaseUrl(tile.image);
  // Use a quick first-rung like home; browser can upgrade via srcset
  const initialRung = tile.span === 12 ? 'w1024h768' : 'w768h512';
  const src    = withSize(base, initialRung);
  const srcset = srcsetFor(tile.image, tile.span);
  const sizes  = sizesForSpan(tile.span);

  const idx = globalIndex(rowIndex, colIndex);
  const isFirst = idx === 0;

  return { src, srcset, sizes, eager: isFirst, priority: isFirst };
}

function onImgError(e) {
  const el = e?.target;
  setLoading(el, false);
  if (el) el.src = '/placeholder.jpg';
}

/* ---------- data fetch (unchanged sorting/exclusion) ---------- */
watch(() => route.params.folderName, (nv) => {
  if (nv) { folderName.value = decodeURIComponent(nv); fetchFolderImages(); }
});

function findCurrentFolder() {
  const all = store.getters.getFolders || [];
  let folder = all.find(f => f.path === folderName.value);
  if (!folder) {
    const nameOnly = folderName.value.split('/').pop();
    folder = all.find(f => f.name === nameOnly);
  }
  return folder || null;
}

async function fetchFolderImages() {
  loading.value = true; error.value = null;
  try {
    currentFolder.value = findCurrentFolder();
    if (!currentFolder.value) throw new Error('Folder not found');

    folderMetadata.value = currentFolder.value.metadata || null;

    const res = await fetch(`/api/dropbox/files?path=${encodeURIComponent(folderName.value)}&ts=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const list = Array.isArray(data.images) ? data.images : [];

    // Keep exclusion of order=0 from backend; also filter here just in case.
    images.value = list.filter(img => !img.is_zero);

    // Preload the very first visible image (mirrors home behavior)
    await nextTick();
    const firstTile = tileRows.value?.[0]?.[0];
    if (firstTile?.image) {
      const base = bestBaseUrl(firstTile.image);
      const initialRung = firstTile.span === 12 ? 'w1024h768' : 'w768h512';
      const href = withSize(base, initialRung);
      const srcset = srcsetFor(firstTile.image, firstTile.span);
      const sizes  = sizesForSpan(firstTile.span);
      preloadFirstImage(href, srcset, sizes);
    }
  } catch (err) {
    console.error('Error fetching folder images:', err);
    error.value = 'Failed to load images. ' + (err.message || 'Please try again later.');
    images.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(fetchFolderImages);
</script>

<script>
/* Keep your directive registration pattern intact */
export default {
  directives: {
    lazyImg: {
      mounted(el, binding, vnode) { vnode.ctx?.$?.setupState?.vLazyImg?.mounted?.(el, binding); },
      unmounted(el, binding, vnode) { vnode.ctx?.$?.setupState?.vLazyImg?.unmounted?.(el, binding); }
    }
  }
}
</script>

<style scoped>
.image-gaps { padding: 5px !important; }
.images-grid{
  padding-top: .85rem;
  padding-bottom: .85rem;
}

.folder-view { max-width: 1800px; margin: 0 auto; padding: 0; }

.image-card { 
  width: 100%; 
  height: 100%; 
  position: relative; 
  border-radius: 0 !important; 
  overflow: hidden; 
  background: #f5f5f5;
  box-shadow: none !important;
  -webkit-box-shadow: none !important;
  -moz-box-shadow: none !important;
}
.image-container { position: relative; width: 100%; overflow: hidden; background: #f5f5f5; }
.image-container.single { padding-bottom: 66.66%; } /* 3:2 large */
.image-container.double { padding-bottom: 100%; }   /* 1:1 small */

.image-el {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover;
  border-radius: 0 !important;
  /* transform: translateZ(0); */
  /* transition: filter .25s ease, opacity .25s ease, transform .2s ease; */
}
/* .image-el.is-loading { filter: blur(12px) saturate(.9) brightness(.96); transform: scale(1.02); } */

.img-skeleton {
  position: absolute; inset: 0; z-index: 1;
  /* background: linear-gradient(90deg, rgba(240,240,240,0.85) 0%, rgba(250,250,250,0.95) 40%, rgba(240,240,240,0.85) 80%); */
  background-size: 200% 100%;
  /* animation: shimmer 1.2s infinite linear; */
  pointer-events: none;
  opacity: 1; transition: opacity .2s ease;
}
@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
.image-container:not(.is-loading) .img-skeleton { opacity: 0; }

.loader { display: flex; justify-content: center; align-items: center; min-height: 320px; }

@media (max-width: 960px) { .folder-view { padding: 16px 8px; } }
@media (prefers-reduced-motion: reduce) { .image-el { transition: none; } .img-skeleton { animation: none; transition: none; } }

@media (max-width: 1350px) {
  .image-gaps { padding: 5px !important; }
}
</style>
