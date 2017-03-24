const fs = require("fs");
const path = require("path");

function getConfig() {
  if (process.env.TARGET === "firefox-panel") {
    return require("../configs/firefox-panel.json");
  }

  const developmentConfig = require("../configs/development.json");

  let localConfig = {};
  if (fs.existsSync(path.resolve(__dirname, "../configs/local.json"))) {
    localConfig = require("../configs/local.json");
  }

  return Object.assign({},developmentConfig, localConfig);
}

module.exports = getConfig;
