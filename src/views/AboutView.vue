<template>
  <div class="about-page">
    <div class="header-border"></div>
    <v-container class="about-container">
      <div class="about-header">
        <!-- <h1 class="about-title"></h1> -->
        <!-- <div class="title-border"></div> -->
      </div>
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
        <h1 class="about-title">ABOUT</h1>
        
        <div class="about-content">
          <p class="text-body-1 mb-4" style="font-family: var(--font-gotham);">
            Canned Pineapple Co. is a creative studio led by Buddy and Shelby, specializing in murals, gold leaf, hand painted signage, and large-scale artwork. With over a decade of experience, we blend craftsmanship and creativity to transform spaces with bold, custom designs.
          </p>
          
          <p class="text-body-1" style="font-family: var(--font-gotham);">
            Based in Nashville, TN, we bring our work to life across the country—collaborating with businesses, brands, and communities to create art that connects and inspires. Whether it's a storefront that needs timeless gold leaf lettering or a statement mural that turns heads, we design with purpose and passion.
          </p>
        </div>
      </v-col>
    </v-row>
    </v-container>
  </div>
</template>

<script setup>
import aboutImage from '../assets/about_img.jpg';
import PageHeader from '@/components/PageHeader.vue';
</script>

<style scoped>
.about-page {
  position: relative;
}

.header-border {
  border-top: .18rem solid #3e2723;
  margin: 0 auto;
  width: 100%;
}

.about-header {
  margin-bottom: 2rem;
  position: relative;
}

.about-title {
  font-family: 'Gotham', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: #3e2723;
  margin: 0;
  display: flex;
  justify-items: flex-start;
  /* padding: 1rem 0 0 0; */
  text-transform: uppercase;
  letter-spacing: 0.35px;
  border-bottom: .18rem solid #3e2723;
}

.about-container {
  min-height: calc(100vh - 300px);
  margin: 0;
  padding: .9rem 0 0 0;
  width: 100%;
  max-width: 100%;
}

.about-row {
  /* display: flex; */
  width: 100%;
  /* max-width: 1200px; */
  margin: 0 auto;
  gap: 15px;
}

.image-col {
  flex: 0 0 60%;
  max-width: 52%;
  padding: 0;
}

.text-col {
  flex: 1 1 35%;
  max-width: 50%;
  padding: .85rem 0 0 .85rem;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.about-content {
  width: 100%;
  max-width: 100%;
  line-height: 1.8;
  text-align: left;
  padding-top: 1rem;
}

.about-image {
  border-radius: 0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  width: 100%;
  /* max-height: 80vh; */
  object-fit: cover;
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
  /* .about-container {
    padding: 4rem 0;
  } */
  
  h1 {
    font-size: 2.5rem;
    margin-bottom: 3rem;
  }
  
  p {
    font-size: 1.2rem;
  }
}
</style>
