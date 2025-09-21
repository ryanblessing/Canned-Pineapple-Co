<template>
  <v-container fluid class="home-container">
    <PageHeader />
    <main>
      <div v-if="!loading && !error" class="project-grid">
        <div v-for="folder in folders" :key="folder.id" class="project-card">
          <div class="card-container">
            <router-link 
              v-if="folder.path" 
              :to="`/folder/${encodeURIComponent(folder.path)}`" 
              class="folder-link"
            >
              <v-card class="card-front" flat>
                <v-img
                  :src="folder.thumbnail || '/placeholder.jpg'"
                  height="600"
                  cover
                  class="folder-thumbnail"
                />
                <!-- Overlay: hidden by default, shown on hover -->
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
import { computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import PageHeader from '@/components/PageHeader.vue';

const store = useStore();

const folders = computed(() => store.getters.getFolders);
const loading = computed(() => store.getters.isLoading);
const error = computed(() => store.getters.getError);

onMounted(() => {
  fetchFolders();
});

const retryFetch = () => {
  fetchFolders();
};

const fetchFolders = async () => {
  try {
    const response = await fetch('/api/dropbox/website-photos');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();

    if (!Array.isArray(data)) throw new Error('Invalid data format received from server');

    const processedFolders = data.map(folder => ({
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

    store.commit('SET_FOLDERS', processedFolders);
    console.log('Fetched folders:', processedFolders);
  } catch (err) {
    console.error('Error fetching folders:', err);
    store.commit('SET_ERROR', 'Failed to load projects. ' + (err.message || 'Please try again later.'));
  } finally {
    store.commit('SET_LOADING', false);
  }
};
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
  padding-bottom: 0.5rem;
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
  filter: none; /* remove brightness darken */
}

/* Overlay: transparent by default, becomes a white veil on hover */
.folder-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;     /* vertical center */
  justify-content: center; /* horizontal center */
  opacity: 0;              /* hidden initially */
  transition: opacity 0.50s ease, background 0.25s ease;
  pointer-events: none;    /* let clicks pass to the link */
  background: rgba(255, 255, 255, 0);  /* transparent initially */
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
  color: #3e2723;
  font-size: 35px;
  /* font-weight: 600; */
  text-align: center;
  text-transform: uppercase;
  line-height: 1.2;
  padding: 0.5rem 0.75rem;
  /* letter-spacing: 2px; */
  /* font-weight: 500; */
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
</style>