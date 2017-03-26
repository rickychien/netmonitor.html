const { isDevelopment } = require("devtools-config");
const { NormalModuleReplacementPlugin } = require("webpack");
const { toolboxConfig } = require("./node_modules/devtools-launchpad/index");
const path = require("path");
const getConfig = require("./bin/getConfig");

let webpackConfig = {
  entry: {
    netmonitor: [path.join(__dirname, "src", "index.js")]
  },

  module: {
    loaders: [
      {
        test: /\.(png|svg)$/,
        loader: "file-loader?name=[name].[ext]",
      },
    ]
  },

  output: {
    path: path.join(__dirname, "assets/build"),
    filename: "[name].js",
    publicPath: "/assets/build",
    libraryTarget: "umd",
  },

  // Fallback compatibility for npm link
  resolve: {
    fallback: path.join(__dirname, "node_modules"),
    alias: {
      'react': path.join(__dirname, 'node_modules/react'),
    },
  }
};

if (!isDevelopment()) {
  webpackConfig.output.libraryTarget = "umd";
  webpackConfig.plugins = [];

  const mappings = [
    [/\.\/mocha/, "./mochitest"],
    [/\.\.\/utils\/mocha/, "../utils/mochitest"],
    [/\.\/utils\/mocha/, "./utils/mochitest"],
  ];

  mappings.forEach(([regex, res]) => {
    webpackConfig.plugins.push(new NormalModuleReplacementPlugin(regex, res));
  });
}

let config = toolboxConfig(webpackConfig, getConfig());

// Remove loaders from devtools-launchpad webpack config
config.module.loaders = config.module.loaders
  .filter((loader) => !["svg-inline"].includes(loader.loader));

module.exports = config;
