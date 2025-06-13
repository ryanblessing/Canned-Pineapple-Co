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
        vm: require.resolve("vm-browserify") // 👈 add this line
      },
    },
  },
  chainWebpack: config => {
    config.plugin('define').tap(args => {
      args[0]['process.env'].DROPBOX_REFRESH_TOKEN = JSON.stringify(process.env.DROPBOX_REFRESH_TOKEN);
      return args;
    });
  },
  devServer: {
    hot: true,
    liveReload: true,
    host: 'localhost',
    port: 8080,
    open: true,
    client: {
      overlay: {
        warnings: true,
        errors: true
      },
      progress: true
    }
  }
});
