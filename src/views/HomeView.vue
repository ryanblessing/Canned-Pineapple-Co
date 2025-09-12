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
              <!-- Front of card (always visible) -->
              <v-card class="card-front" flat>
                <v-img
                  :src="folder.thumbnail || '/placeholder.jpg'"
                  height="600"
                  cover
                  class="folder-thumbnail"
                >
                  <div class="folder-overlay">
                    <div class="card-front-content">
                      <h4 class="folder-title">{{ folder.metadata?.title || folder.name }}</h4>
                      <p class="folder-location">
                        {{ folder.metadata?.category || '' }}
                      </p>
                    </div>
                  </div>
                </v-img>
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

// Computed properties
const folders = computed(() => store.getters.getFolders);
const loading = computed(() => store.getters.isLoading);
const error = computed(() => store.getters.getError);

// Fetch data when component mounts
onMounted(() => {
  fetchFolders();
});


// Expose fetchFolders for retry button
const retryFetch = () => {
  fetchFolders();
};

// Fetch folders from the API
const fetchFolders = async () => {
  try {
    const response = await fetch('/api/dropbox/website-photos');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Ensure we have valid data
    if (!Array.isArray(data)) {
      throw new Error('Invalid data format received from server');
    }
    
    // Process the data to ensure it has the expected structure
    const processedFolders = data.map(folder => ({
      ...folder,
      // Ensure metadata has all required fields
      metadata: {
        title: folder.metadata?.title || folder.name,
        location: folder.metadata?.location || 'Location not specified',
        description: folder.metadata?.description || `View all ${folder.name} photos`,
        category: folder.metadata?.category || '',
        services: folder.metadata?.services || '',
        tags: Array.isArray(folder.metadata?.tags) ? folder.metadata.tags : []
      }
    }));
    
    // Update the store with the fetched folders
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

.header-border {
  width: 100%;
  height: 1px;
  background-color: #e0e0e0;
  margin: 20px 0;
}

/* v-container {
  padding: 0;
} */
.home-container {
  /* max-width: 1800px; */
  padding: 0;
  margin: 0;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* exactly three columns */
  gap: 0.5rem;
  padding: 0.5rem 0;
}

.folder-link {
  text-decoration: none;
  display: block;
  position: relative;
  overflow: hidden;
  border-radius: 0;
  height: 0;
  padding-bottom: 100%;
}

.card-container {
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 100%; /* This creates a square aspect ratio (1:1) */
  margin: 0;
  overflow: hidden;
}

.card-front {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  background-color: #f5f5f5;
  overflow: hidden;
  border-radius: 0 !important;
}

.background-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  opacity: 0.5; /* Reduced opacity for the background image */
  z-index: 0;
}

/* .folder-link:hover .card-front {
  opacity: 0;
  transform: translateY(-10px);
  pointer-events: none;
} */


.card-content {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 40px 20px;
  width: 100%;
  height: 100%;
  /* box-sizing: border-box; */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.card-front-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1.5rem 1rem 1rem;
  font-family: var(--font-gotham-medium);
  color: #fff;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.folder-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 500;
  line-height: 1.2;
  order: 1; /* Ensures title comes first */
}

.folder-location {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.9;
  order: 2; /* Ensures category comes after title */
}

.folder-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 70%, transparent 100%);
  padding: 1.5rem 1rem 1rem;
  color: white;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  min-height: 40%; /* Ensure minimum height for better text display */
}

/* .folder-card:hover .folder-overlay {
  opacity: 0.9;
} */

.folder-thumbnail {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transition: transform 0.3s ease;
  border-radius: 0 !important;
}

.folder-link:hover .folder-thumbnail {
  opacity: 0.8;
  transition: opacity 0.3s ease;
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
