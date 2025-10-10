<!-- Contact Form -->
<template>
  <div class="header-border"></div>
  <v-container fluid>
    <div class="contact-info">
      <img 
        :src="ContactImage" 
        alt="Canned Pineapple Co. Logo" 
        class="contact-logo"
      />
      <p class="contact-title"> FOR ALL PROJECT INQUIRIES, PLEASE CONTACT:</p>
      <a href="mailto:INFO@CANNEDPINEAPPLECO.COM" class="contact-email">
        INFO@CANNEDPINEAPPLECO.COM
      </a>
    </div>
  </v-container>
</template>

<script setup>
import ContactImage from '../assets/contact-logo.png';
</script>

<style scoped>
.contact-logo {
  max-width: 275px;
  height: auto;
  margin-top: 2rem;
}

.contact-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  min-height: 50vh;
  margin-top: -40px;
  font-family: var(--font-gotham);
}
.header-border {
  border-top: .18rem solid #3e2723;
  margin: 0 auto;
  width: 100%;
}
.contact-title {
  font-size: 1.1rem;
  font-weight: 400;
  color: #b30202;
  font-family: var(--font-gotham);
}
.contact-email {
  font-family: var(--font-gotham);
  color: #3e2723;
  font-size: 2rem;
  text-decoration: none;
}
</style>