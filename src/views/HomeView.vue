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
    </main>
  </v-container>
</template>

<script>
import { ref } from 'vue';
// import { fetchImagesByFolder } from '../api/dropbox';
import {fetchImagesByFolder, listFolders} from '../api/dropbox';


export default {
  setup() {
    const folders = ref([]);
    const loading = ref(true);
    const error = ref(null);

    const fetchFoldersData = async () => {
      try {
        loading.value = true
        error.value = null
        folders.value = await listFolders()
      } catch (err) {
        error.value = err.message
      } finally {
        loading.value = false
      }
    }

    // Fetch folders when component mounts
    fetchFoldersData();

    return {
      folders,
      loading,
      error,
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

/* .folder-card {
  transition: transform 0.2s ease;
} */

.folder-card:hover {
  transform: translateY(-5px);
}

.folder-thumbnail {
  position: relative;
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