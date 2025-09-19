const { defineConfig } = require("@vue/cli-service");
require('dotenv').config();

module.exports = defineConfig({
  transpileDependencies: true,

  configureWebpack: {
    resolve: {
      fallback: {
        crypto: require.resolve("crypto-browserify"),
        util: require.resolve("util/"),
        stream: require.resolve("stream-browserify"),
        vm: require.resolve("vm-browserify")
      },
    },
  },

  chainWebpack: config => {
    config.plugin('define').tap(definitions => {
      Object.assign(definitions[0], {
        __VUE_OPTIONS_API__: 'true',
        __VUE_PROD_DEVTOOLS__: 'false',
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'true',
        'process.env': {
          ...definitions[0]['process.env'],
          VITE_DROPBOX_ACCESS_TOKEN: JSON.stringify(process.env.VITE_DROPBOX_ACCESS_TOKEN)
        },
        global: 'window'
      });
      return definitions;
    });
  },

  devServer: {
    allowedHosts: 'all',
    host: '0.0.0.0',
    port: 8080,
    open: true,
    hot: true,
    liveReload: true,
    client: {
      overlay: {
        warnings: true,
        errors: true
      },
      progress: true,
      webSocketURL: {
        protocol: 'ws',
        hostname: 'localhost',
        port: 8080,
        pathname: '/ws'
      }
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
