<!-- eslint-disable prettier/prettier -->
<template>
  <v-container fluid>
    <header>
      <h1>Canned Pinapple Company</h1>
    </header>

    <main>
      <div class="project-grid">
        <div v-for="image in images" :key="image.id" class="project-card">
          <h2>{{ image.name }}</h2>
          <img :src="image.url" :alt="image.name">
          <p>{{ image.path }}</p>
        </div>
      </div>
      <div v-if="loading" class="loading">
        Loading images...
      </div>
      <div v-if="error" class="error">
        {{ error }}
      </div>
    </main>
  </v-container>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useDropboxImages } from '@/api/dropbox';

export default {
  name: "HomeView",
  setup() {
    const { images, loading, error, fetchImages } = useDropboxImages();

    onMounted(() => {
      fetchImages('High Street Deli');
    });

    return {
      images,
      loading,
      error,
    };
  },
};
</script>

<style scoped>
header {
  padding: 20px;
  text-align: center;
  margin-bottom: 20px;
  font-family: 'Gotham Pro', sans-serif;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  padding: 20px;
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