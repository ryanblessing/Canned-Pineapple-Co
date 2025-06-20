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

<script setup>
import { ref, onMounted } from 'vue'

const folders = ref([])
const loading = ref(true)
const error = ref(null)

const fetchFolders = async () => {
  loading.value = true
  error.value = null

  try {
    const res = await fetch('/api/dropbox/folders')
    if (!res.ok) throw new Error('Failed to fetch folders')
    folders.value = await res.json()
  } catch (err) {
    error.value = 'Error loading folders: ' + err.message
  } finally {
    loading.value = false
  }
}

onMounted(fetchFolders)
</script>

<style scoped>
img {
  max-width: 100%;
  height: auto;
  margin-bottom: 1rem;
}
</style>
