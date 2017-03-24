let connector = {};

module.exports = {
  onConnect(connection, actions, store) {
    if (!connection || !connection.tab) {
      return;
    }

    let { clientType } = connection.tab;
    switch (clientType) {
      case "chrome":
        this.onChromeConnect(actions, store);
        break;
      case "firefox":
        this.onFirefoxConnect(actions, store);
        break;
      default:
        throw `Unknown client type - ${clientType}`;
    }
  },

  onChromeConnect(actions, store) {
    // TODO: support chrome debugging protocol
  },

  onFirefoxConnect(actions, store) {
    connector = require("./firefox-connector");
    connector.connect(actions, store);
  },

  get supportsCustomRequest() {
    return connector.supportsCustomRequest;
  },

  inspectRequest() {
    return connector.inspectRequest(...arguments);
  },

  triggerActivity() {
    return connector.triggerActivity(...arguments);
  },

  getString() {
    return connector.getString(...arguments);
  },
};
