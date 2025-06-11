<template>
  <v-container>
    <div v-if="folders.length">
      <div v-for="folder in folders" :key="folder.id">
        <h3>{{ folder.name }}</h3>
        <img :src="folder.thumbnail" alt="thumbnail" style="max-width: 200px;" />
      </div>
    </div>
    <div v-else-if="loading">Loading folders...</div>
    <div v-else-if="error">{{ error }}</div>
  </v-container>
</template>

<script>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { initDropbox, fetchAllFolders, fetchImagesFromFolder } from '@/api/dropbox';

export default {
  setup() {
    const folders = ref([]);
    const loading = ref(true);
    const error = ref(null);

    const initialize = async () => {
      try {
        loading.value = true;
        error.value = null;

        const tokenResponse = await axios.get('/api/dropbox/token');
        const accessToken = tokenResponse.data.accessToken;

        const dbx = initDropbox(accessToken);
        if (!dbx) {
          error.value = 'Failed to initialize Dropbox';
          return;
        }

        const allFolders = await fetchAllFolders(dbx);
        const filteredFolders = allFolders.filter(folder => {
          const lowerName = folder.name.toLowerCase();
          return !['deliverables', 'proofs', 'website photos'].includes(lowerName);
        });

        folders.value = await Promise.all(
          filteredFolders.map(async folder => {
            try {
              const images = await fetchImagesFromFolder(dbx, folder.path);
              return {
                id: folder.path,
                name: folder.name,
                path: folder.path,
                items: folder.items || 0,
                thumbnail: images?.[0] || '/public/placeholder-image.jpg'
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
          })
        );

      } catch (err) {
        error.value = 'Error initializing Dropbox: ' + err.message;
      } finally {
        loading.value = false;
      }
    };

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
img {
  max-width: 100%;
  height: auto;
  margin-bottom: 1rem;
}
</style>
