<!-- eslint-disable prettier/prettier -->
<template>
  <v-container fluid class="home-container">
    <!-- <header class="text-center py-6">
      <h1 class="text-h4 text-md-h3">Canned Pineapple Company</h1>
    </header> -->

    <main>
      <div class="project-grid">
        <div v-for="folder in folders" :key="folder.id" class="project-card">
          <router-link :to="`/folder/${encodeURIComponent(folder.path)}`" class="folder-link">
            <v-card class="folder-card">
              <v-img
                :src="folder.thumbnail"
                height="350"
                cover
                class="folder-thumbnail"
              >
                <div class="folder-overlay"></div>
                <v-card-title class="folder-title">
                  {{ folder.name }}
                </v-card-title>
              </v-img>
            </v-card>
          </router-link>
        </div>
      </div>
      <div v-if="loading" class="loading">
        Loading folders...
      </div>
      <div v-if="error" class="error">
        {{ error }}
      </div>

    </main>
  </v-container>
</template>

<script>
import { ref, onMounted } from 'vue'
import { initDropbox, fetchAllFolders, fetchImagesFromFolder } from '../api/dropbox'
import { VContainer, VCard, VImg, VCardTitle, VCardText, VBtn } from 'vuetify/components';

export default {
  components: {
    VContainer,
    VCard,
    VImg,
    VCardTitle,
    VCardText,
    VBtn
  },
  setup() {
    const folders = ref([]);
    const loading = ref(true);
    const error = ref(null);

    // Initialize Dropbox and fetch folders
    const initialize = async () => {
      try {
        loading.value = true;
        error.value = null;

        // Initialize Dropbox connection
        const isInitialized = await initDropbox();
        if (!isInitialized) {
          error.value = 'Failed to initialize Dropbox';
          return;
        }

        // Fetch all folders and filter out unwanted ones
        const allFolders = await fetchAllFolders();
        const filteredFolders = allFolders.filter(folder => {
          const lowerName = folder.name.toLowerCase();
          return !['deliverables', 'proofs', 'website photos'].includes(lowerName);
        });
        
        folders.value = filteredFolders.map(async folder => {
          try {
            // Fetch thumbnail for folder
            const thumbnail = await fetchImagesFromFolder(folder.path);
            console.log('thumbnail', thumbnail)
            return {
              id: folder.path,
              name: folder.name,
              path: folder.path,
              items: folder.items || 0,
              thumbnail: thumbnail && thumbnail.length > 0 ? thumbnail[0] : '/public/placeholder-image.jpg'
            };
          } catch (err) {
            console.error(`Error fetching thumbnail for ${folder.name}:`, err);
            return {
              id: folder.path,
              name: folder.name,
              path: folder.path,
              items: folder.items || 0,
              thumbnail: '/public/placeholder-image.jpg'
            };
          }
        });

        // Wait for all thumbnails to be fetched
        folders.value = await Promise.all(folders.value);

      } catch (err) {
        error.value = err.message;
      } finally {
        loading.value = false;
      }
    };

    // Initialize when component mounts
    onMounted(() => {
      initialize();
    });

    return {
      folders,
      loading,
      error
    };
  }
};
</script>

<style scoped>
.home-container {
  max-width: 1600px;
  margin: 0 auto;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 2rem;
  padding: 1rem;
}

.folder-link {
  text-decoration: none;
  display: block;
  height: 100%;
}

.folder-card {
  height: 100%;
  transition: all 0.3s ease;
  /* border-radius: 8px; */
  overflow: hidden;
  /* box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); */
  position: relative;
}

.folder-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.folder-thumbnail {
  position: relative;
  height: 350px;
  width: 100%;
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

<style scoped>
header {
  padding: 20px;
  text-align: center;
  margin-bottom: 20px;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr); /* exactly two columns */
  gap: 2rem;
  padding: 2rem 0;
}

.project-card {
  /* border: 1px solid #ddd;
  border-radius: 8px; */
  padding: 15px;
  text-align: center;
}

.project-card h2 {
  margin-top: 0;
  margin-bottom: 10px;
}

.project-card img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin-bottom: 10px;
}

.project-card p {
  font-size: 0.9em;
  color: #555;
}

.loading {
  text-align: center;
  padding: 20px;
  color: #666;
}

.error {
  text-align: center;
  padding: 20px;
  color: #ff4444;
}
</style>