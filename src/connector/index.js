let connector = {};

module.exports = {
  connect(connection, actions, store) {
    let { clientType } = connection.tab;
    switch (clientType) {
      case "chrome":
        break;
      case "firefox":
        connector = require("./firefox-connector");
        break;
      default:
        throw `Unknown client type - ${clientType}`;
    }
    connector.connect(connection, actions, store);
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
