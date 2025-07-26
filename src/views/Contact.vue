<!-- Contact Form -->
<template>
  <v-container fluid>
    <div class="contact-info">
      <p style="font-size: 1.3rem; color: #42b983"> For custom murals and project inquires</p>
      <p style="font-size: 1.3rem; color: #42b983">please email us at: </p>
        <div class="email-container">
          <v-icon>mdi-email</v-icon>
          <h3>
            <a href="mailto:cannedpineappleco.com" style="color: #72a2e4; font-size: 2rem; text-decoration: none;">
              cannedpineappleco.com
            </a>
          </h3>
        </div>
      </div>
  </v-container>
</template>

<script>
export default {
  name: 'ContactView',
  data: () => ({
  }),
  methods: {
    
  },
};
</script>

<style scoped>
.contact-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  min-height: 60vh;
  font-family: 'Gotham', sans-serif;
  /* margin: 0 auto;
  padding: 10px; */
}
</style>