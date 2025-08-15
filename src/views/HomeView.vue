<template>
  <v-container fluid class="home-container">
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
                        {{ folder.metadata?.category || 'No Category Specified' }}
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

const store = useStore();

// Computed properties
const folders = computed(() => store.getters.getFolders);
const loading = computed(() => store.getters.isLoading);
const error = computed(() => store.getters.getError);

// Fetch data when component mounts
onMounted(() => {
  fetchFolders();
});

// Truncate description to 100 characters
const truncateDescription = (text) => {
  if (!text) return '';
  const maxLength = 100;
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

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
/* v-container {
  padding: 0;
} */
.home-container {
  max-width: 1800px;
  margin: 0 auto;
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

.card-back {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  /* transform: translateY(10px);
  transition: all 0.3s ease; */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  overflow: hidden;
  border-radius: 0 !important;
  margin: 0;
  padding: 0;
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

.folder-link:hover .card-back {
  opacity: 1;
  /* transform: translateY(0); */
  pointer-events: auto;
  /* border-radius: 0 !important; */
}

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
  right: 60%;
  padding: 20px;
  font-family: var(--font-gotham-medium);
  color: #fff;
  /* text-align: left; */
  /* z-index: 2; */
  /* background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%); */
}

.folder-location {
  font-size: 0.9rem;
  padding-top: 10px;
  color: rgba(255, 255, 255, 0.9);
  font-style: var(--font-gotham-medium);
}

.back-description {
  color: white;
  line-height: 1.4;
  margin: 0 0 30px 0;
  font-size: 1.4rem;
  font-weight: 300;
  max-width: 80%;
  transform: translateY(20px);
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s;
  opacity: 0.9;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.view-all {
  color: white;
  font-size: 0.9rem;
  margin: 30px 0 0 0;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.3);
  opacity: 0.9;
  font-style: italic;
  position: absolute;
  bottom: 30px;
  left: 0;
  right: 0;
  max-width: 100%;
}

/* .folder-link:hover .back-description {
  transform: translateY(0);
}

.folder-link:hover .folder-card {
  transform: translateY(-8px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
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

.folder-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  /* background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.2) 100%); */
  opacity: 0.8;
  transition: opacity 0.3s ease;
}

/* .folder-card:hover .folder-overlay {
  opacity: 0.9;
} */

.folder-title {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1.8rem;
  color: white;
  font-weight: 500;
  margin: 0 0 5px 0;
  font-size: 1.25rem;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  transition: transform 0.3s ease, padding 0.3s ease;
  z-index: 2;
}

.folder-card:hover .folder-title {
  transform: translateY(-5px);
  padding-bottom: 1.8rem;
}

.card-back .back-description {
  margin: 0;
  font-size: 1.1rem;
  line-height: 1.4;
  color: white;
  text-align: center;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  transition: all 0.3s ease;
  opacity: 1;
  transform: none;
  flex-grow: 1;
  padding: 0 20px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  max-height: 3em;
  white-space: normal;
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
