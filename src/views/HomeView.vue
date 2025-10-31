<template>
  <v-container fluid class="home-container">
    <PageHeader />
    <main>
      <div v-if="!loading && !error" class="project-grid">
        <div
          v-for="(folder, idx) in visibleFolders"
          :key="folder.id"
          class="project-card"
        >
          <div class="card-container">
            <router-link
              v-if="folder.path"
              :to="`/folder/${encodeURIComponent(folder.path)}`"
              class="folder-link"
            >
              <v-card class="card-front" flat>
                <!-- Top 6 are prioritized; rest are truly lazy + low priority -->
                <v-img
                  :src="folder.thumbnail || '/placeholder.jpg'"
                  height="600"
                  cover
                  class="folder-thumbnail"
                  :eager="idx < 6"
                  :loading="idx < 6 ? 'eager' : 'lazy'"
                  :fetchpriority="idx < 6 ? 'high' : 'low'"
                  :decoding="idx < 6 ? 'sync' : 'async'"
                  @load="idx < 6 ? onFirstSixLoad() : null"
                ></v-img>
                <div class="folder-overlay">
                  <div class="card-front-content">
                    <h4 class="folder-title">
                      {{ folder.metadata?.title || folder.name }}
                    </h4>
                  </div>
                </div>
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
          <v-btn @click="retryFetch" class="mt-2" color="error" outlined>Retry</v-btn>
        </v-alert>
      </div>

      <div v-else class="no-projects">
        <p>No projects found.</p>
      </div>
    </main>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import PageHeader from '@/components/PageHeader.vue';

const store = useStore();

const folders = computed(() => store.getters.getFolders);
const loading = computed(() => store.getters.isLoading);
const error = computed(() => store.getters.getError);

// What we actually render (starts with top 6, then appends rest after top-6 finished)
const visibleFolders = ref([]);

// First-6 gating
const firstSixToLoad = ref(0);     // how many top-6 actually rendered (handles <6 total)
const firstSixLoaded = ref(0);     // onload counter
let startedRemainder = false;      // ensure we only kick once
let firstSixTimeoutId = null;

function startRemainderBatches(items) {
  if (startedRemainder) return;
  startedRemainder = true;
  // Append quickly but without hammering the main thread
  const batchSize = 12;
  let i = 0;
  function step() {
    if (i >= items.length) return;
    const end = Math.min(i + batchSize, items.length);
    visibleFolders.value = visibleFolders.value.concat(items.slice(i, end));
    i = end;
    if (i < items.length) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function onFirstSixLoad() {
  firstSixLoaded.value += 1;
  if (firstSixLoaded.value >= firstSixToLoad.value) {
    if (firstSixTimeoutId) { clearTimeout(firstSixTimeoutId); firstSixTimeoutId = null; }
    const remainder = (folders.value || []).slice(6).map(enrichFolder);
    startRemainderBatches(remainder);
  }
}

function enrichFolder(folder) {
  return {
    ...folder,
    metadata: {
      title: folder.metadata?.title || folder.name,
      location: folder.metadata?.location || 'Location not specified',
      description: folder.metadata?.description || `View all ${folder.name} photos`,
      category: folder.metadata?.category || '',
      services: folder.metadata?.services || '',
      tags: Array.isArray(folder.metadata?.tags) ? folder.metadata.tags : []
    }
  };
}

onMounted(() => {
  fetchFolders();
});

// Keep your retry logic
const retryFetch = () => {
  fetchFolders();
};

// ---- tiny helpers for preconnect/preload/warm images (unchanged logic) ----
function preconnectOnce() {
  try {
    if (document.querySelector('link[data-preconnect-origin]')) return;
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = window.location.origin;
    link.setAttribute('data-preconnect-origin', '1');
    document.head.appendChild(link);
  } catch {}
}
function preloadImage(href) {
  try {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = href;
    document.head.appendChild(link);
  } catch {}
}
function warmImage(href) {
  try {
    const img = new Image();
    img.decoding = 'async';
    img.loading = 'eager';
    img.src = href;
  } catch {}
}

async function fetchFolders() {
  try {
    store.commit('SET_LOADING', true);

    preconnectOnce();

    const response = await fetch('/api/dropbox/website-photos');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid data format received from server');

    const processed = data.map(enrichFolder);

    // Commit full list to store (no behavior change)
    store.commit('SET_FOLDERS', processed);

    // Take the top 6 first
    const firstSix = processed.slice(0, 6);

    // Preload + warm the first 6 thumbnails BEFORE rendering, to make them "instant"
    for (const f of firstSix) {
      const href = f.thumbnail || '/placeholder.jpg';
      if (!href) continue;
      preloadImage(href);
      warmImage(href);
    }

    // Prime the first 6 immediately in the DOM
    visibleFolders.value = firstSix;

    // Configure the top-6 gate
    firstSixToLoad.value = firstSix.length;
    firstSixLoaded.value = 0;
    startedRemainder = false;

    // Safety timeout so the rest don't stall forever
    if (firstSixTimeoutId) clearTimeout(firstSixTimeoutId);
    firstSixTimeoutId = setTimeout(() => {
      if (!startedRemainder) {
        const remainder = processed.slice(6);
        startRemainderBatches(remainder);
      }
    }, 1200);
  } catch (err) {
    console.error('Error fetching folders:', err);
    store.commit('SET_ERROR', 'Failed to load projects. ' + (err.message || 'Please try again later.'));
  } finally {
    store.commit('SET_LOADING', false);
  }
}
</script>

<style scoped>
/* Header styles moved to PageHeader.vue */

.home-container {
  padding: 0;
  margin: 0;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* exactly three columns */
  gap: 1.15rem;
  padding-top: 1.15rem;
  padding-bottom: 1rem;
}

.folder-link {
  text-decoration: none;
  display: block;
  position: relative;
  overflow: hidden;
  border-radius: 0;
  height: 0;
  padding-bottom: 100%; /* square */
}

.card-container {
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 100%; /* 1:1 */
  margin: 0;
  overflow: hidden;
}

.card-front {
  position: absolute;
  inset: 0;
  transition: all 0.3s ease;
  display: flex;
  background-color: #f5f5f5;
  overflow: hidden;
  border-radius: 0 !important;
}

.folder-thumbnail {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transition: filter 0.3s ease, opacity 0.3s ease;
  border-radius: 0 !important;
}

/* OPTION A — White veil only: no darkening filter */
.folder-link:hover .folder-thumbnail {
  filter: none;
}

/* Overlay: transparent by default, becomes a white veil on hover */
.folder-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.50s ease, background 0.25s ease;
  pointer-events: none;
  background: rgba(255, 255, 255, 0);
}

.folder-link:hover .folder-overlay {
  opacity: 2.5;
  background: rgba(255, 255, 255, 0.45);
}

.card-front-content {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Title: black, centered */
.folder-title {
  margin: 0;
  margin-left: 1rem;
  margin-right: 1rem;
  color: #3e2723;
  font-size: 25px;
  text-align: center;
  text-transform: uppercase;
  line-height: 1.2;
  padding: 0.5rem 0.75rem;
  font-family: var(--font-gotham-medium);
}

/* Loading and error states */
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

@media (max-width: 1350px) {
  .project-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: .9rem;
    padding-top: .9rem;
    padding-bottom: .9rem;
  }

  .folder-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.50s ease, background 0.25s ease;
    pointer-events: none;
    background: rgba(255, 255, 255, 0);
  }

  .folder-link:hover .folder-overlay {
    opacity: 2.5;
    background: rgba(255, 255, 255, 0.45);
  }

  .folder-title {
    margin: 0 1rem;
    color: #3e2723;
    font-size: 25px;
    font-weight: 500;
    text-align: center;
    text-transform: uppercase;
    line-height: 1.2;
    padding: 0.5rem 0.75rem;
    font-family: var(--font-gotham-medium);
  }
}
</style>
