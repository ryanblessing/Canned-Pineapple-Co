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
              <div class="card-front">
                <v-img
                  :src="folder.thumbnail || '/placeholder.jpg'"
                  height="600"
                  cover
                  class="folder-thumbnail"
                >
                  <div class="folder-overlay"></div>
                  <div class="card-front-content">
                    <h3 class="folder-title">{{ folder.metadata?.title || folder.name }}</h3>
                    <p class="folder-location">
                      {{ folder.metadata?.location || 'Location not specified' }}
                    </p>
                  </div>
                </v-img>
              </div>
              
              <!-- Back of card (visible on hover) -->
              <div class="card-back">
                <div 
                  v-if="folder.thumbnail"
                  class="background-image" 
                  :style="{ backgroundImage: `url(${folder.thumbnail})` }"
                ></div>
                <div class="card-content">
                  <p 
                    v-if="folder.metadata?.description" 
                    class="back-description"
                  >
                    {{ folder.metadata.description }}
                  </p>
                  <p class="view-all">
                    View all {{ folder.metadata?.title || folder.name }} photos
                  </p>
                </div>
              </div>
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
import { ref, onMounted } from 'vue';

const folders = ref([]);
const loading = ref(true);
const error = ref(null);

const fetchFolders = async () => {
  loading.value = true;
  error.value = null;

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
    folders.value = data.map(folder => ({
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
    
    console.log('Fetched folders:', folders.value);
  } catch (err) {
    console.error('Error fetching folders:', err);
    error.value = 'Failed to load projects. ' + (err.message || 'Please try again later.');
  } finally {
    loading.value = false;
  }
};

// Fetch data when component mounts
onMounted(() => {
  fetchFolders();  
});

// Expose fetchFolders for retry button
const retryFetch = () => {
  fetchFolders();
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
  grid-template-columns: repeat(3, 1fr); /* exactly two columns */
  gap: 2rem;
  padding: 2rem 0;
}

.folder-link {
  text-decoration: none;
  display: block;
  height: 100%;
  position: relative;
  overflow: hidden;
  border-radius: 0;
}

.card-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 600px;
  margin: 0;
  padding: 0;
}

.card-front,
.card-back {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.card-back {
  position: relative;
  background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%);
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  opacity: 0;
  padding: 40px 20px 60px;
  box-sizing: border-box;
  transform: translateY(20px);
}

.background-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  opacity: 0.15; /* Reduced opacity for the background image */
  z-index: 0;
}

.folder-link:hover .card-front {
  opacity: 0.2;
}

.folder-link:hover .card-back {
  opacity: 1;
  transform: translateY(0);
}

.card-content {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 40px 20px;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
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
  padding: 20px;
  color: white;
  text-align: left;
  z-index: 2;
  background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%);
}

.folder-title {
  font-size: 1.5rem;
  margin: 0 0 5px 0;
  color: white;
  font-weight: 500;
}

.folder-location {
  font-size: 0.9rem;
  margin: 0;
  color: rgba(255, 255, 255, 0.9);
  font-style: italic;
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

.folder-link:hover .back-description {
  transform: translateY(0);
}

.folder-link:hover .folder-card {
  transform: translateY(-8px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.folder-thumbnail {
  position: relative;
  height: 350px;
  width: 100%;
  transition: transform 0.3s ease;
  will-change: transform;
}

.folder-link:hover .folder-thumbnail {
  transform: scale(1.03);
}

.folder-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.2) 100%);
  opacity: 0.8;
  transition: opacity 0.3s ease;
}

.folder-card:hover .folder-overlay {
  opacity: 0.9;
}

.folder-title {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1.5rem;
  color: white;
  font-weight: 500;
  font-size: 1.25rem;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  transition: transform 0.3s ease, padding 0.3s ease;
  z-index: 2;
}

.folder-card:hover .folder-title {
  transform: translateY(-5px);
  padding-bottom: 1.8rem;
}

/* Loading and error states */
.loading,
.error {
  text-align: center;
  padding: 2rem;
  font-size: 1.1rem;
}

.error {
  color: #ff4444;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.error {
  text-align: center;
  padding: 2rem;
  color: #ff4444;
}
</style>
