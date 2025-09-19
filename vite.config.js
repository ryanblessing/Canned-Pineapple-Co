import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [vue()],
    define: {
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: mode !== 'production',
      __VUE_PROD_DEVTOOLS__: false,
      'process.env': env,
      global: 'window'
    },
    build: {
      target: 'esnext',
      sourcemap: true
    },
    server: {
      host: '0.0.0.0',
      port: 3001,
      strictPort: true,
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: 3001
      },
      watch: {
        usePolling: true
      },
      proxy: {
        '^/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          ws: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    },
    preview: {
      port: 3001
    }
  }
})
