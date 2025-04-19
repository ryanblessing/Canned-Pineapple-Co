<!-- eslint-disable prettier/prettier -->
<template>
  <v-container fluid>
    <header>
      <h1>Canned Pinapple Company </h1>
    </header>

    <main>
      <div class="project-grid">
        <div v-for="project in projects" :key="project.id" class="project-card">
          <h2>{{ project.title }}</h2>
          <img :src="project.image" :alt="project.title">
          <p>{{ project.description }}</p>
        </div> 
      </div>
    </main>
  </v-container>
</template>
<!-- eslint-disable prettier/prettier -->
<script>
import { ref } from 'vue';

export default {
  name: "HomeView",
  setup() {
    // Sample project data (you'll likely fetch this from an API or data file)
    const projects = ref([
      {
        id: 1,
        title: 'Copperhead Tattoo Parlour',
        image: 'https://www.dropbox.com/scl/fo/glpip3lf292inlrqa5dt4/AHo5pbz3TAHoyYrlUWQhXrU/Copperhead%20Tattoo%20Parlour?e=3&preview=Copperhead+Tattoo+Parlour-2.jpg&rlkey=ittjbrkatj94seh8c9mzc9dnh&subfolder_nav_tracking=1&st=1y6rj1su&dl=0',
        description: 'A brief description of Project Alpha and its key features.'
      },
      {
        id: 2,
        title: 'Project Beta',
        image: 'https://via.placeholder.com/300x200/0000FF/FFFFFF?Text=Beta', // Another example
        description: 'Project Beta: An exciting endeavor with innovative solutions.'
      },
      {
        id: 3,
        title: 'Project Gamma',
        image: 'https://via.placeholder.com/300x200/FF0000',
        description: 'Exploring the possibilities with Project Gamma and its unique approach.'
      },
    ]);

    return {
      projects,
    };
  },
};
</script>
<!-- eslint-disable prettier/prettier -->
<style scoped>
header {
  padding: 20px;
  text-align: center;
  margin-bottom: 20px;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); /* Responsive grid */
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
</style>