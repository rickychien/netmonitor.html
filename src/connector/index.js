let connector = {};

function onConnect(connection, actions, store) {
  if (!connection || !connection.tab) {
    return;
  }

  let { clientType } = connection.tab;
  switch (clientType) {
    case "chrome":
      onChromeConnect(connection, actions, store);
      break;
    case "firefox":
      onFirefoxConnect(connection, actions, store);
      break;
    default:
      throw `Unknown client type - ${clientType}`;
  }
}

function onChromeConnect(connection, actions, store) {
  // TODO: support chrome debugging protocol
}

function onFirefoxConnect(connection, actions, store) {
  connector = require("./firefox-connector");
  connector.connect(connection, actions, store);
}

function inspectRequest() {
  return connector.inspectRequest(...arguments);
}

function triggerActivity() {
  return connector.triggerActivity(...arguments);
}

function getString() {
  return connector.getString(...arguments);
}

module.exports = {
  onConnect,
  onChromeConnect,
  onFirefoxConnect,
  supportsCustomRequest: connector.supportsCustomRequest,
  inspectRequest,
  triggerActivity,
  getString,
};
