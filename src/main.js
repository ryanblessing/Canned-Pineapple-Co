/* eslint-disable prettier/prettier */
import { createApp } from 'vue'
import axios from 'axios'
import App from './App.vue'
import router from './router'
import store from './store'
import { FontAwesomeIcon, FontAwesomeLayers } from './font-awesome'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

// Configure axios
axios.defaults.baseURL = 'http://localhost:3001' // Update this if your backend runs on a different port

// Create the Vue app
const app = createApp(App)

// Configure axios globally
app.config.globalProperties.$axios = axios
app.provide('axios', axios)

// Configure Vuetify
const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light'
  }
})

// Set up the app with plugins
app.use(store)
  .use(router)
  .use(vuetify)
  .component('font-awesome-icon', FontAwesomeIcon)
  .component('font-awesome-layers', FontAwesomeLayers)

// Mount the app
app.mount('#app')