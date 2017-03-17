const React = require("react");
const ReactDOM = require("react-dom");
const { bindActionCreators } = require("redux");
const { bootstrap } = require("devtools-launchpad");
const { EventEmitter } = require("devtools-sham-modules");
const { L10N } = require("./utils/l10n");
const { configureStore } = require("./utils/store");

L10N.setBundle(require("./locales/har.properties"));
L10N.setBundle(require("./locales/netmonitor.properties"));
L10N.setBundle(require("./locales/webconsole.properties"));

const Controller = require("./controller");
const NetworkMonitor = require("./components/network-monitor");

require("./shared/components/splitter/SplitBox.css");
require("./shared/components/tabs/tabbar.css");
require("./shared/components/tabs/tabs.css");
// require("./shared/components/tree/tree-view.css");
require("./netmonitor.css");

EventEmitter.decorate(window);

const store = configureStore();
const actions = bindActionCreators(require("./actions"), store.dispatch);

async function run() {
  let connection = await bootstrap(React, ReactDOM, NetworkMonitor, null, store);

  if (!connection || !connection.tab) {
    return;
  }

  switch(connection.tab.clientType) {
    case "chrome":
      // TODO: support chrome
    case "firefox":
      window.controller = new Controller(connection.client.getTabTarget(), actions, store);
      break;
    default:
      throw Error(`Unknown connection client - "${connection.tab.clientType}"`);
  }
}

run();
