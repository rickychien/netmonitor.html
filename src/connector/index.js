let connector = {};

module.exports = {
  connect(connection, actions, store) {
    let { clientType } = connection.tab;
    connector = require(`./${clientType}-connector`);
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
