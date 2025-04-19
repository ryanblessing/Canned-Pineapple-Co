/* eslint-disable prettier/prettier */
import {
  createApp
} from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import {
  FontAwesomeIcon,
  FontAwesomeLayers
} from "./font-awesome"; // Import the correctly exported components

createApp(App)
  .use(store)
  .use(router)
  .component('font-awesome-icon', FontAwesomeIcon)
  .component('font-awesome-layers', FontAwesomeLayers)
  .mount("#app");