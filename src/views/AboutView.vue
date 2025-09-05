<template>
  <v-container class="about-container">
    <v-row align="start" class="about-row">
      <!-- Left Column - Image -->
      <v-col cols="12" md="6" class="image-col">
        <v-img
          :src="aboutImage"
          alt="Canned Pineapple Co. Team"
          class="about-image"
          cover
          :aspect-ratio="3/4"
        ></v-img>
      </v-col>

      <!-- Right Column - Text Content -->
      <v-col cols="12" md="6" class="text-col">
        <h1 class="text-h4 text-md-h3 mb-6" style="font-family: var(--font-gotham); color: #72a2e4;">About</h1>
        
        <div class="about-content">
          <p class="text-body-1 mb-4" style="font-family: var(--font-gotham);">
            Canned Pineapple Co. is a creative studio led by Buddy and Shelby, specializing in murals, gold leaf, hand painted signage, and large-scale artwork. With over a decade of experience, we blend craftsmanship and creativity to transform spaces with bold, custom designs.
          </p>
          
          <p class="text-body-1" style="font-family: var(--font-gotham);">
            Based in <b style="color: #42b983;">Nashville, TN</b>, we bring our work to life across the country—collaborating with businesses, brands, and communities to create art that connects and inspires. Whether it's a storefront that needs timeless gold leaf lettering or a statement mural that turns heads, we design with purpose and passion.
          </p>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import aboutImage from '../assets/about_img.jpg';
</script>

<style scoped>
.about-container {
  padding: 4rem 1rem;
  min-height: calc(100vh - 300px);
  display: flex;
  align-items: flex-start;
  padding-top: 2rem;
}

.about-row {
  width: 100%;
  margin: 0;
}

.image-col {
  padding: 1rem;
}

.text-col {
  padding: 1rem 2rem;
}

.about-image {
  border-radius: 0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-height: 80vh;
  object-fit: cover;
}

.about-content {
  line-height: 1.8;
  text-align: left;
}

h1 {
  font-weight: 500;
  margin-bottom: 2rem;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 1px;
}

p {
  margin-bottom: 1.5rem;
  font-size: 1.1rem;
}

/* Responsive adjustments */
@media (min-width: 960px) {
  .about-container {
    padding: 4rem 2rem;
  }
  
  h1 {
    font-size: 2.5rem;
    margin-bottom: 3rem;
  }
  
  p {
    font-size: 1.2rem;
  }
}
</style>
