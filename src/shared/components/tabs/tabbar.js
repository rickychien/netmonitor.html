/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {
  createClass,
  createFactory,
  DOM,
  PropTypes,
} = require("react");
const Tabs = createFactory(require("./tabs").Tabs);
const { showMenu } = require("../menu");

const { div } = DOM;

/**
 * Renders Tabbar component.
 */
let Tabbar = createClass({
  displayName: "Tabbar",

  propTypes: {
    children: PropTypes.array,
    onSelect: PropTypes.func,
    showAllTabsMenu: PropTypes.bool,
    activeTabId: PropTypes.string,
    renderOnlySelected: PropTypes.bool,
  },

  getDefaultProps: function () {
    return {
      showAllTabsMenu: false,
    };
  },

  getInitialState: function () {
    let { activeTabId, children = [] } = this.props;
    let tabs = this.createTabs(children);
    let activeTab = tabs.findIndex((tab, index) => tab.id === activeTabId);

    return {
      activeTab: activeTab === -1 ? 0 : activeTab,
      tabs,
    };
  },

  componentWillReceiveProps: function (nextProps) {
    let { activeTabId, children = [] } = nextProps;
    let tabs = this.createTabs(children);
    let activeTab = tabs.findIndex((tab, index) => tab.id === activeTabId);

    if (activeTab !== this.state.activeTab ||
        (children !== this.props.children)) {
      this.setState({
        activeTab: activeTab === -1 ? 0 : activeTab,
        tabs,
      });
    }
  },

  createTabs: function (children) {
    return children
      .filter((panel) => panel)
      .map((panel, index) =>
        Object.assign({}, children[index], {
          id: panel.props.id || index,
          panel,
          title: panel.props.title,
        })
      );
  },

  // Public API

  addTab: function (id, title, selected = false, panel, url) {
    let tabs = this.state.tabs.slice();
    tabs.push({id, title, panel, url});

    let newState = Object.assign({}, this.state, {
      tabs: tabs,
    });

    if (selected) {
      newState.activeTab = tabs.length - 1;
    }

    this.setState(newState, () => {
      if (this.props.onSelect && selected) {
        this.props.onSelect(id);
      }
    });
  },

  toggleTab: function (tabId, isVisible) {
    let index = this.getTabIndex(tabId);
    if (index < 0) {
      return;
    }

    let tabs = this.state.tabs.slice();
    tabs[index] = Object.assign({}, tabs[index], {
      isVisible: isVisible
    });

    this.setState(Object.assign({}, this.state, {
      tabs: tabs,
    }));
  },

  removeTab: function (tabId) {
    let index = this.getTabIndex(tabId);
    if (index < 0) {
      return;
    }

    let tabs = this.state.tabs.slice();
    tabs.splice(index, 1);

    this.setState(Object.assign({}, this.state, {
      tabs: tabs,
    }));
  },

  select: function (tabId) {
    let index = this.getTabIndex(tabId);
    if (index < 0) {
      return;
    }

    let newState = Object.assign({}, this.state, {
      activeTab: index,
    });

    this.setState(newState, () => {
      if (this.props.onSelect) {
        this.props.onSelect(tabId);
      }
    });
  },

  // Helpers

  getTabIndex: function (tabId) {
    let tabIndex = -1;
    this.state.tabs.forEach((tab, index) => {
      if (tab.id === tabId) {
        tabIndex = index;
      }
    });
    return tabIndex;
  },

  getTabId: function (index) {
    return this.state.tabs[index].id;
  },

  getCurrentTabId: function () {
    return this.state.tabs[this.state.activeTab].id;
  },

  // Event Handlers

  onTabChanged: function (index) {
    this.setState({
      activeTab: index
    });

    if (this.props.onSelect) {
      this.props.onSelect(this.state.tabs[index].id);
    }
  },

  onAllTabsMenuClick: function (evt) {
    let target = evt.target;
    // Generate list of menu items from the list of tabs.
    let items = this.state.tabs.map((tab) => ({
      label: tab.title,
      type: "checkbox",
      checked: this.getCurrentTabId() === tab.id,
      click: () => this.select(tab.id),
    }));

    showMenu(evt, items);
  },

  // Rendering

  renderTab: function (tab) {
    if (typeof tab.panel === "function") {
      return tab.panel({
        key: tab.id,
        title: tab.title,
        id: tab.id,
        url: tab.url,
      });
    }

    return tab.panel;
  },

  render: function () {
    let tabs = this.state.tabs.map((tab) => this.renderTab(tab));

    return (
      div({className: "devtools-sidebar-tabs"},
        Tabs({
          onAllTabsMenuClick: this.onAllTabsMenuClick,
          renderOnlySelected: this.props.renderOnlySelected,
          showAllTabsMenu: this.props.showAllTabsMenu,
          tabActive: this.state.activeTab,
          onAfterChange: this.onTabChanged,
        },
          tabs
        )
      )
    );
  },
});

module.exports = Tabbar;
