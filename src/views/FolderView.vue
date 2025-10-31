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
import { ref, computed, onMounted, watch } from 'vue';
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

/* ---------- utils ---------- */
const naturalCompare = (a, b) =>
  (a || '').localeCompare(b || '', undefined, { numeric: true, sensitivity: 'base' });

const displayFolderName = computed(() => {
  const parts = folderName.value.split('/').filter(Boolean);
  const name = parts[parts.length - 1] || 'Gallery';
  return name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
});

/* ---------- keep order EXACTLY the same ---------- */
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

/* ---------- size by orientation (no reordering) ---------- */
/* 'horizontal' => span 12 (large), 'square' => span 6 (small)
   If orientation missing, fall back to your old pattern (1 large row, then 2 small) */
function spanFromOrientation(img) {
  const o =
    String(img?.orientation || img?.organization || '')
      .toLowerCase()
      .trim();
  if (o === 'horizontal') return 12;
  if (o === 'square')     return 6;
  return null; // unknown -> fallback pattern
}

const tileRows = computed(() => {
  const rows = [];
  let cur = [];
  let used = 0;
  // fallback alternation state for images WITHOUT orientation
  let nextFallbackSingle = true; // true => make the next unknown a full-width row

  for (const image of imagesSorted.value) {
    let span = spanFromOrientation(image);

    if (span == null) {
      // Fallback to original look: 1 big, then 2 small (for *unknown* orientations only)
      if (nextFallbackSingle) {
        span = 12;
        nextFallbackSingle = false; // next unknowns should be smalls
      } else {
        span = 6;
        // if this small completes the half-row, flip back to single
        if (used === 6) nextFallbackSingle = true;
      }
    }

    // if it doesn't fit, wrap line (preserve strict order)
    if (used + span > 12) {
      if (cur.length) rows.push(cur);
      cur = [];
      used = 0;
    }

    cur.push({ image, span });

    used += span;
    if (used === 12) {
      rows.push(cur);
      cur = [];
      used = 0;
    }
  }
  if (cur.length) rows.push(cur);
  return rows;
});

/* ---------- image loading (lazy + skeleton) ---------- */
const tinyPlaceholder =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjZWVlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=';

// choose which backend URL to use
function bestBaseUrl(img) {
  return img?.display || img?.thumb || img?.url || '/placeholder.jpg';
}
// our /thumb proxy accepts ?s=w###h###, so we can swap sizes on the same URL
function srcWithSize(url, size) {
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
    ? '(min-width: 960px) 100vw, 100vw'
    : '(min-width: 960px) 50vw, 100vw';
}
function srcsetFor(img, span) {
  const base = bestBaseUrl(img);
  const rungs = span === 12
    ? ['w1024h768', 'w1600h1200', 'w2048h1536']
    : ['w480h320', 'w768h512', 'w1024h768'];
  return rungs.map(s => `${srcWithSize(base, s)} ${widthHint(s)}`).join(', ');
}

/* small concurrency limiter for decode() and network */
const LOAD_CONCURRENCY = 6;
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
          el.src = src;
        }));
      }
    });
  }, { rootMargin: '300px 0px', threshold: 0.01 });
  return io;
}

const vLazyImg = {
  mounted(el, binding) {
    const opts = binding.value || {};
    // allow an eager hero if you want later
    if (opts.eager) {
      if (opts.priority) el.fetchPriority = 'high';
      enqueue(() => new Promise((resolve) => {
        const done = () => { setLoading(el, false); resolve(); };
        el.addEventListener('load', done, { once: true });
        el.addEventListener('error', done, { once: true });
        if (opts.srcset) el.srcset = opts.srcset;
        if (opts.sizes)  el.sizes  = opts.sizes;
        setLoading(el, true);
        el.decoding = 'async';
        el.src = opts.src;
      }));
      return;
    }
    el.__lazy = { src: opts.src, srcset: opts.srcset, sizes: opts.sizes };
    setLoading(el, true);
    ensureObserver().observe(el);
  },
  unmounted(el) { if (io) io.unobserve(el); delete el.__lazy; }
};

/* binding for each tile (uses tile.span) */
function bindingFor(tile, rowIndex, colIndex) {
  const base   = bestBaseUrl(tile.image);
  const src    = srcWithSize(base, tile.span === 12 ? 'w1600h1200' : 'w768h512');
  const srcset = srcsetFor(tile.image, tile.span);
  const sizes  = sizesForSpan(tile.span);
  const hero   = rowIndex === 0 && colIndex === 0;
  return { src, srcset, sizes, eager: hero, priority: hero };
}

function onImgError(e) {
  const el = e?.target;
  setLoading(el, false);
  if (el) el.src = '/placeholder.jpg';
}

/* ---------- data fetch ---------- */
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

    // If backend already attaches orientation/organization on each image, we use it.
    // Otherwise this still works (falls back to the old 1/then/2 sizing pattern).
    images.value = list.filter(img => !img.is_zero);
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
// register directive locally when using <script setup>
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
  /* border-bottom: .12rem solid #3e2723; */
}

.folder-view { max-width: 1800px; margin: 0 auto; padding: 0;}

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
