const { toolboxConfig } = require("./node_modules/devtools-launchpad/index");
const path = require("path");
const getConfig = require("./bin/getConfig");

function buildConfig(envConfig) {
  let webpackConfig = {
    entry: {
      netmonitor: [path.join(__dirname, "src", "index.js")],
    },

    output: {
      path: path.join(__dirname, "assets/build"),
      filename: "[name].js",
      publicPath: "/assets/build"
    },

    module: {
      loaders: [
        {
          test: /\.properties$/,
          loader: require.resolve('./loaders/l10n-properties-loader'),
        },
      ]
    }
  };

  return toolboxConfig(webpackConfig, envConfig);
}

module.exports = buildConfig(getConfig());
