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
    config.plugin('define').tap(args => {
      args[0]['process.env'].VITE_DROPBOX_ACCESS_TOKEN = JSON.stringify(process.env.VITE_DROPBOX_ACCESS_TOKEN);
      return args;
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
        protocol: 'wss',
        hostname: '8bfb36130333.ngrok-free.app',
        port: 443,
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
