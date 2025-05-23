<template>
  <v-container class="about-container">
    <v-row justify="center">
      <v-col cols="12" md="8" lg="6">
        <h1 class="text-h4 text-md-h3 mb-6">About Us</h1>
        
        <div class="about-content">
          <p class="text-body-1 mb-4">
            Canned Pineapple Co. is a creative studio led by Buddy and Shelby, specializing in murals, gold leaf, hand painted signage, and large-scale artwork. With over a decade of experience, we blend craftsmanship and creativity to transform spaces with bold, custom designs.
          </p>
          
          <p class="text-body-1">
            Based in Nashville, TN, we bring our work to life across the country—collaborating with businesses, brands, and communities to create art that connects and inspires. Whether it's a storefront that needs timeless gold leaf lettering or a statement mural that turns heads, we design with purpose and passion.
          </p>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
// Component logic goes here
</script>

<style scoped>
.about-container {
  padding: 2rem 1rem;
  min-height: calc(100vh - 300px); /* Adjust based on your header/footer */
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
