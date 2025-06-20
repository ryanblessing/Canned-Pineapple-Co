<!-- Contact Form -->
<template>
  <v-container fluid>
    <v-row class="contact-container">
      <v-col cols="12" md="6" class="contact-info">
        <h1>Contact Us</h1>
        <div class="contact-details">
          <div class="contact-item">
            <v-icon>mdi-map-marker</v-icon>
            <p>Nashville, Tennessee</p>
          </div>
          <div class="contact-item">
            <v-icon>mdi-phone</v-icon>
            <p>1-800-buy-me-dinner-first-you-caddy-bitch</p>
          </div>
          <div class="contact-item">
            <v-icon>mdi-email</v-icon>
            <p>cannedpineappleco.com </p>
          </div>
        </div>
      </v-col>
      <v-col cols="12" md="6">
        <v-card class="contact-form">
          <v-card-title>Contact Form</v-card-title>
          <v-card-text>
            <v-form ref="form" v-model="valid" lazy-validation>
              <v-text-field
                v-model="name"
                :rules="nameRules"
                label="Name"
                required
              ></v-text-field>

              <v-text-field
                v-model="email"
                :rules="emailRules"
                label="E-mail"
                required
              ></v-text-field>

              <v-textarea
                v-model="message"
                :rules="messageRules"
                label="Message"
                required
              ></v-textarea>

              <v-btn
                color="primary"
                class="mr-4"
                @click="submit"
              >
                Submit
              </v-btn>

              <v-btn
                color="secondary"
                @click="reset"
              >
                Reset
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  name: 'ContactView',
  data: () => ({
    valid: true,
    name: '',
    nameRules: [
      v => !!v || 'Name is required',
      v => (v && v.length <= 100) || 'Name must be less than 100 characters',
    ],
    email: '',
    emailRules: [
      v => !!v || 'E-mail is required',
      v => /.+@.+.+.+/.test(v) || 'E-mail must be valid',
    ],
    message: '',
    messageRules: [
      v => !!v || 'Message is required',
      v => (v && v.length <= 500) || 'Message must be less than 500 characters',
    ],
  }),
  methods: {
    submit() {
      if (this.$refs.form.validate()) {
        // TODO: Implement form submission
        console.log('Form submitted:', {
          name: this.name,
          email: this.email,
          message: this.message,
        });
        this.reset();
        alert('Thank you for your message! We will get back to you soon.');
      }
    },
    reset() {
      this.$refs.form.reset();
    },
  },
};
</script>

<style scoped>
.contact-container {
  padding: 40px 0;
}

.contact-info {
  padding: 40px;
}

.contact-info h1 {
  font-size: 2.5rem;
  margin-bottom: 2rem;
  color: #333;
}

.contact-details {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.contact-item p {
  margin: 0;
  font-size: 1.1rem;
  color: #666;
}

.contact-form {
  padding: 20px;
}

.contact-form .v-card-title {
  padding: 20px 0 10px 0;
  font-size: 1.5rem;
}

.contact-form .v-card-text {
  padding: 20px;
}

@media (max-width: 960px) {
  .contact-info {
    text-align: center;
  }
  
  .contact-info h1 {
    font-size: 2rem;
  }
}
</style>