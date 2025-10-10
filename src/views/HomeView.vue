<template>
  <v-container fluid class="home-container">
    <PageHeader />
    <main>
      <div v-if="!loading && !error" class="project-grid">
        <div v-for="(folder, i) in folders" :key="folder.id" class="project-card">
          <div class="card-container">
            <router-link
              v-if="folder.path"
              :to="`/folder/${encodeURIComponent(folder.path)}`"
              class="folder-link"
            >
              <!-- image (lazy via directive) -->
              <img
                class="folder-thumbnail"
                :alt="folder.metadata?.title || folder.name"
                :src="tinyPlaceholder"
                v-lazy-img="lazyBinding(folder, i)"
                @error="onThumbError($event, folder)"
              />
              <!-- skeleton shimmer shown until the image finishes -->
              <div class="thumb-skeleton" aria-hidden="true"></div>

              <div class="folder-overlay">
                <div class="card-front-content">
                  <h4 class="folder-title">
                    {{ folder.metadata?.title || folder.name }}
                  </h4>
                </div>
              </div>
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
          <v-btn @click="retryFetch" class="mt-2" color="error" variant="outlined">Retry</v-btn>
        </v-alert>
      </div>

      <div v-else class="no-projects">
        <p>No projects found.</p>
      </div>
    </main>
  </v-container>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import PageHeader from '@/components/PageHeader.vue';

const store = useStore();

const folders = computed(() => store.getters.getFolders);
const loading = computed(() => store.getters.isLoading);
const error   = computed(() => store.getters.getError);

/* ---- tiny placeholder + srcset helpers ---- */
const tinyPlaceholder =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjZWVlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=';

const tileSizes = '(min-width: 1280px) 33vw, (min-width: 960px) 50vw, 100vw';

function srcForSize(url, size) {
  if (!url) return '/placeholder.jpg';
  try { const u = new URL(url, window.location.origin); u.searchParams.set('s', size); return u.toString(); }
  catch { return url.replace(/([?&])s=[^&]+/, `$1s=${size}`); }
}
function widthHint(token) { const m = token.match(/^w(\d+)h/i); return m ? `${m[1]}w` : '640w'; }
function srcsetFor(url) {
  if (!url) return '';
  const sizes = ['w256h256', 'w480h320', 'w640h480'];
  return sizes.map(s => `${srcForSize(url, s)} ${widthHint(s)}`).join(', ');
}

/* ---- IntersectionObserver lazy + small concurrency cap ---- */
const LOAD_CONCURRENCY = 6;
let activeLoads = 0;
const loadQueue = [];
let io;

function setLoadingState(el, isLoading) {
  el.classList.toggle('is-loading', isLoading);
  const box = el.closest('.card-container');
  if (box) box.classList.toggle('is-loading', isLoading);
}

function runNext() {
  if (activeLoads >= LOAD_CONCURRENCY) return;
  const job = loadQueue.shift();
  if (!job) return;
  activeLoads++;
  job().finally(() => { activeLoads--; runNext(); });
}
function enqueue(job) { loadQueue.push(job); runNext(); }

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
          const done = () => { setLoadingState(el, false); resolve(); };
          el.addEventListener('load', done, { once: true });
          el.addEventListener('error', done, { once: true });
          if (srcset) el.srcset = srcset;
          if (sizes)  el.sizes  = sizes;
          setLoadingState(el, true);
          el.src = src;
        }));
      }
    });
  }, { rootMargin: '200px 0px', threshold: 0.01 });
  return io;
}

const vLazyImg = {
  mounted(el, binding) {
    const opts = binding.value || {};
    el.decoding = 'async';

    // eager: first row (still respects concurrency so requests don't stampede)
    if (opts.eager) {
      if (opts.priority) el.fetchPriority = 'high';
      enqueue(() => new Promise((resolve) => {
        const done = () => { setLoadingState(el, false); resolve(); };
        el.addEventListener('load', done, { once: true });
        el.addEventListener('error', done, { once: true });
        if (opts.srcset) el.srcset = opts.srcset;
        if (opts.sizes)  el.sizes  = opts.sizes;
        setLoadingState(el, true);
        el.src = opts.src;
      }));
      return;
    }

    // lazy via IO
    el.__lazy = { src: opts.src, srcset: opts.srcset, sizes: opts.sizes };
    setLoadingState(el, true);
    ensureObserver().observe(el);
  },
  unmounted(el) {
    if (io) io.unobserve(el);
    delete el.__lazy;
  }
};

/* ---- load data ---- */
let aborter;
onMounted(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(() => {});
  }
  fetchFolders(true);
});
onBeforeUnmount(() => { aborter?.abort?.(); });

const retryFetch = () => { fetchFolders(true); };

const fetchFolders = async (force = false) => {
  const cacheKey = 'home.folders.v1';
  try {
    store.commit('SET_LOADING', true);
    store.commit('SET_ERROR', null);

    if (!force) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          store.commit('SET_FOLDERS', parsed);
          store.commit('SET_LOADING', false);
          return;
        }
      }
    }

    aborter?.abort();
    aborter = new AbortController();
    const response = await fetch(`/api/dropbox/website-photos?ts=${Date.now()}`, {
      signal: aborter.signal,
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);

    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid data format: expected array');

    const processed = data.map(folder => ({
      ...folder,
      metadata: {
        title: folder.metadata?.title || folder.name,
        location: folder.metadata?.location || 'Location not specified',
        description: folder.metadata?.description || `View all ${folder.name} photos`,
        category: folder.metadata?.category || '',
        services: folder.metadata?.services || '',
        tags: Array.isArray(folder.metadata?.tags) ? folder.metadata.tags : []
      }
    }));

    store.commit('SET_FOLDERS', processed);
    sessionStorage.setItem(cacheKey, JSON.stringify(processed));
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('[home] fetch error:', err);
      store.commit('SET_ERROR', `Failed to load projects. ${err.message || ''}`);
      store.commit('SET_FOLDERS', []);
    }
  } finally {
    store.commit('SET_LOADING', false);
  }
};

/* ---- bindings ---- */
function lazyBinding(folder, index) {
  const url = folder.thumbnail || '/placeholder.jpg';
  return {
    src:    srcForSize(url, 'w480h320'),
    srcset: srcsetFor(url),
    sizes:  tileSizes,
    eager:  index < 3,
    priority: index < 3
  };
}
function onThumbError(e, folder) {
  const el = e?.target;
  setLoadingState(el, false);
  if (el) el.src = '/placeholder.jpg';
  console.warn('thumb error:', folder?.name);
}
</script>

<style scoped>
.home-container { padding: 0; margin: 0; }

.project-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  padding: 0.5rem 0;
}

/* Reserve space + avoid work for offscreen items */
.project-card {
  content-visibility: auto;
  contain-intrinsic-size: 400px 400px;
}

.folder-link {
  text-decoration: none;
  display: block;
  position: relative;
  overflow: hidden;
  height: 0;
  padding-bottom: 100%;
}

.card-container {
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 100%;
  margin: 0;
  overflow: hidden;
}

/* Base image */
.folder-thumbnail {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: translateZ(0);
  border-radius: 0 !important;
  transition: filter .25s ease, opacity .25s ease, transform .2s ease;
  background-size: cover;
  background-position: center;
}

/* Blur-up while loading */
.folder-thumbnail.is-loading {
  filter: blur(12px) saturate(.9) brightness(.96);
  transform: scale(1.02);
}

/* Shimmer skeleton (sits on top until load complete) */
.thumb-skeleton {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(90deg,
    rgba(240,240,240,0.85) 0%,
    rgba(250,250,250,0.95) 40%,
    rgba(240,240,240,0.85) 80%);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite linear;
  pointer-events: none;
  opacity: 1;
  transition: opacity .2s ease;
}
@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }

/* Hide skeleton once the image (or container) is not loading */
.card-container:not(.is-loading) .thumb-skeleton { opacity: 0; }

/* Hover overlay */
.folder-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity .25s ease, background .25s ease;
  pointer-events: none;
  background: rgba(255,255,255,0);
  z-index: 2;
}
.folder-link:hover .folder-overlay {
  opacity: 1;
  background: rgba(255,255,255,0.45);
}

.card-front-content { display: flex; align-items: center; justify-content: center; }

.folder-title {
  margin: 0;
  color: #000;
  font-size: 1.1rem;
  font-weight: 600;
  text-align: center;
  line-height: 1.2;
  padding: 0.25rem 0.5rem;
}

.loading { text-align: center; padding: 2rem; color: #666; font-size: 1.1rem; }
.error   { text-align: center; padding: 2rem; color: #ff4444; }

@media (prefers-reduced-motion: reduce) {
  .folder-thumbnail { transition: none; }
  .thumb-skeleton   { animation: none; }
  .folder-overlay   { transition: none; }
}
</style>
