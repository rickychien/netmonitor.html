/* global gStore */

const { Services: { prefs } } = require("devtools-modules");
const Actions = require("../actions/index");
const { EVENTS } = require("../constants");

/**
 * Called for each location change in the monitored tab.
 *
 * @param {String} type Packet type.
 * @param {Object} packet Packet received from the server.
 */
function navigated(type) {
  window.emit(EVENTS.TARGET_DID_NAVIGATE);
}

/**
 * Called for each location change in the monitored tab.
 *
 * @param {String} type Packet type.
 * @param {Object} packet Packet received from the server.
 */
function willNavigate(type) {
  // Reset UI.
  if (!prefs.getBoolPref("devtools.webconsole.persistlog")) {
    gStore.dispatch(Actions.batchReset());
    gStore.dispatch(Actions.clearRequests());
  } else {
    // If the log is persistent, just clear all accumulated timing markers.
    gStore.dispatch(Actions.clearTimingMarkers());
  }

  window.emit(EVENTS.TARGET_WILL_NAVIGATE);
}

/**
 * Process connection events.
 *
 * @param {Object} tabTarget
 */
function onFirefoxConnect(tabTarget) {
  tabTarget.on("navigate", navigated);
  tabTarget.on("will-navigate", willNavigate);
}

/**
 * Process disconnect events.
 *
 * @param {Object} tabTarget
 */
function onFirefoxDisconnect(tabTarget) {
  tabTarget.off("navigate", navigated);
  tabTarget.off("will-navigate", willNavigate);
}

function onConnect(connection, actions) {
  if (!connection) {
    return;
  }

  switch(connection.tab.clientType) {
    case "firefox":
      return onFirefoxConnect(actions);
    default:
      throw Error("Unknown connection client");
  }
}

module.exports = {
  onFirefoxConnect,
  onFirefoxDisconnect,
  onConnect,
};
