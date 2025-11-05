<!-- Contact.vue -->
<template>
  <div class="contact-page">
    <div class="header-border"></div>
    <v-container fluid class="contact-content">
      <div class="contact-info">
        <img 
          :src="ContactImage" 
          alt="Canned Pineapple Co. Logo" 
          class="contact-logo"
        />
        <p class="contact-title">FOR ALL PROJECT INQUIRIES, PLEASE CONTACT</p>
        <a href="mailto:INFO@CANNEDPINEAPPLECO.COM" class="contact-email">
          INFO@CANNEDPINEAPPLECO.COM
        </a>
      </div>
    </v-container>
    <!-- ✅ bottom border now fixed to page bottom -->
    <div class="footer-border"></div>
  </div>
</template>

<script setup>
import ContactImage from '../assets/contact-logo.png';
</script>

<style scoped>
.contact-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh; /* ensures page fills viewport */
  position: relative;
}

.contact-content {
  flex: 1; /* pushes footer to bottom */
}

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
  font-family: var(--font-gotham);
}

.header-border {
  border-top: .12rem solid #3e2723;
  width: 100%;
}

.footer-border {
  border-top: .12rem solid #3e2723;
  width: 100%;
  margin-top: auto; /* pins it to bottom */
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

/* responsive sizing */
@media(max-width: 1500px) {
  .contact-logo { max-width: 225px !important; }
  .contact-title { font-size: 1.1rem !important; }
  .contact-email { font-size: 1.1rem !important; }
}
@media(max-width: 1350px) {
  .contact-title { font-size: .9rem !important; }
  .contact-email { font-size: 1.4rem !important; }
}
@media(max-width: 1200px) { .contact-logo { max-width: 175px !important; } }
@media(max-width: 960px)  { .contact-logo { max-width: 150px !important; } }
@media(max-width: 425px) {
  .contact-logo { max-width: 135px !important; }
  .contact-title, .contact-email { font-size: .95rem !important; }
}
@media(max-width: 390px) {
  .contact-logo { max-width: 150px !important; }
  .contact-title, .contact-email { font-size: .75rem !important; }
}
</style>
