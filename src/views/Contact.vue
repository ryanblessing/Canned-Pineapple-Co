<!-- Contact Form -->
<template>
  <div class="header-border"></div>
  <v-container fluid>
    <div class="contact-info">
      <p class="contact-title"> FOR ALL PROJECT INQUIRIES, PLEASE CONTACT:</p>
      <a href="mailto:INFO@CANNEDPINEAPPLECO.COM" class="contact-email">
        INFO@CANNEDPINEAPPLECO.COM
      </a>
    </div>
  </v-container>
</template>

<script>

export default {
  name: 'ContactView'
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
  font-family: var(--font-gotham);
  /* margin: 0 auto;
  padding: 10px; */
}
.header-border {
  border-top: 3px solid #e0e0e0eb;
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