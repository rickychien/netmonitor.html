const React = require("react");
const ReactDOM = require("react-dom");
const { firefox, getClient } = require("devtools-client-adapters");
const {
  bootstrap,
  renderRoot,
  unmountRoot,
} = require("devtools-launchpad");
const { getValue, isFirefoxPanel } = require("devtools-config");
const { L10N } = require("./utils/l10n");
const configureStore = require("./utils/store");
const { onConnect, onFirefoxConnect } = require("./utils/client");
const NetworkMonitor = require("./components/network-monitor").default;

L10N.setBundle("./locales/netmonitor.properties");
L10N.setBundle("./locales/webconsole.properties");
L10N.setBundle("./locales/har.properties");

// require("./netmonitor.css");

const store = configureStore();
const actions = bindActionCreators(require("./actions"), store.dispatch);

if (isFirefoxPanel()) {
  module.exports = {
    bootstrap: ({ threadClient, tabTarget }) => {
      firefox.setThreadClient(threadClient);
      firefox.setTabTarget(tabTarget);
      renderRoot(React, ReactDOM, App, store);
      firefox.initPage(actions);
      return onFirefoxConnect(actions, firefox);
    },
    destroy: () => unmountRoot(ReactDOM),
    store,
    actions,
    selectors,
    client: firefox.clientCommands,
  };
} else {
  bootstrap(React, ReactDOM, NetworkMonitor, actions, store)
    .then((connection) => onConnect(connection, actions));
}
