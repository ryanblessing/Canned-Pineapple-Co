<!-- eslint-disable prettier/prettier -->
<template>
  <v-container fluid>
    <header>
      <h1>Canned Pinapple Company</h1>
    </header>

    <main>
      <div class="project-grid">
        <div v-for="folder in folders" :key="folder.id" class="project-card">
          <v-card class="folder-card">
            <v-img
              :src="folder.thumbnailUrl"
              height="200"
              cover
              class="folder-thumbnail"
            >
              <v-card-title>
                {{ folder.name }}
              </v-card-title>
            </v-img>
            <v-card-text>
              <div>
                <p class="folder-items">{{ folder.items }} items</p>
                <v-btn
                  color="primary"
                  :to="`/folder/${folder.path}`"
                  class="view-folder-btn"
                >
                  View Folder
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </div>
      </div>
      <div v-if="loading" class="loading">
        Loading folders...
      </div>
      <div v-if="error" class="error">
        {{ error }}
      </div>
      <div v-if="selectedFolder">
        <h2>Selected Folder: {{ selectedFolder.name }}</h2>
        <div class="image-grid">
          <div v-for="image in images" :key="image" class="image-card">
            <v-img :src="image" height="200" cover class="image-thumbnail"></v-img>
          </div>
        </div>
      </div>
    </main>
  </v-container>
</template>

<script>
import { ref, onMounted } from 'vue';
import { initDropbox, fetchAllFolders, fetchImagesByFolder } from '../api/dropbox';
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
    const selectedFolder = ref(null);
    const images = ref([]);

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

        // Fetch all folders
        const allFolders = await fetchAllFolders();
        folders.value = allFolders.map(folder => ({
          id: folder.path,
          name: folder.name,
          path: folder.path,
          thumbnailUrl: '', // Will be populated when folder is selected
          items: 0
        }));

      } catch (err) {
        error.value = err.message;
      } finally {
        loading.value = false;
      }
    };

    // Fetch images for a specific folder
    const fetchFolderImages = async (folder) => {
      try {
        selectedFolder.value = folder;
        loading.value = true;
        error.value = null;

        const imageUrls = await fetchImagesByFolder(folder.path);
        images.value = imageUrls;
        
        // Update folder with thumbnail and item count
        const folderIndex = folders.value.findIndex(f => f.id === folder.id);
        if (folderIndex !== -1) {
          folders.value[folderIndex] = {
            ...folders.value[folderIndex],
            thumbnailUrl: imageUrls[0] || '',
            items: imageUrls.length
          };
        }
      } catch (err) {
        error.value = err.message;
      } finally {
        loading.value = false;
      }
    };

    // Initialize when component is mounted
    onMounted(() => {
      initialize();
    });

    return {
      folders,
      loading,
      error,
      selectedFolder,
      images,
      fetchFolderImages
    };
  },
};
</script>

<style scoped>
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
  padding: 2rem 0;
}

.folder-card {
  transition: transform 0.2s ease;
}

.folder-card:hover {
  transform: translateY(-5px);
}

.folder-thumbnail {
  position: relative;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 2rem;
}

.image-card {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.image-card:hover {
  transform: scale(1.05);
}

.image-thumbnail {
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.folder-title {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-weight: bold;
}

.folder-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.folder-items {
  color: #666;
  font-size: 0.9rem;
}

.view-folder-btn {
  margin-top: 1rem;
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
  border: 1px solid #ddd;
  border-radius: 8px;
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