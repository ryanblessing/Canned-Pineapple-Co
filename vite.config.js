import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: true,
    __VUE_PROD_DEVTOOLS__: false
  },
  build: {
    target: 'esnext'
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000'  // Match backend server port
    }
  }
})
