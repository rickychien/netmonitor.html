/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const React = require("react");
const ReactDOM = require("react-dom");
const { bindActionCreators } = require("redux");
const { firefox } = require("devtools-client-adapters");
const { isFirefoxPanel } = require("devtools-config");
const { bootstrap, renderRoot, unmountRoot } = require("devtools-launchpad");
const { EventEmitter } = require("devtools-sham-modules");
const { L10N } = require("./utils/l10n");
const { configureStore } = require("./utils/store");

L10N.setBundle(require("./locales/har.properties"));
L10N.setBundle(require("./locales/netmonitor.properties"));
L10N.setBundle(require("./locales/webconsole.properties"));

require("./styles/common.css");
require("./shared/components/splitter/SplitBox.css");
require("./shared/components/tabs/tabbar.css");
require("./shared/components/tabs/tabs.css");
require("./shared/components/tree/tree-view.css");
require("./styles/netmonitor.css");

EventEmitter.decorate(window);

const App = require("./components/network-monitor");
const store = configureStore();
const actions = bindActionCreators(require("./actions"), store.dispatch);
const { onConnect, onFirefoxConnect } = require("./connector");

if (isFirefoxPanel()) {
  module.exports = {
    bootstrap({ tabTarget, toolbox }) {
      renderRoot(React, ReactDOM, App, store);
      firefox.setTabTarget(tabTarget);
      firefox.initPage(actions);
      return onFirefoxConnect(actions, store);
    },
    destroy() {
      unmountRoot(ReactDOM);
    },
  };
} else {
  bootstrap(React, ReactDOM, App, null, store).then((connection) =>
    onConnect(connection, actions, store));
}
