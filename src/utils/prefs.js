const { PrefsHelper } = require("devtools-sham-modules");
const { Services: { pref }} = require("devtools-modules");
const { isDevelopment } = require("devtools-config");

if (isDevelopment()) {
  pref("devtools.webconsole.persistlog", false);
  pref("devtools.netmonitor.panes-network-details-width", 450);
  pref("devtools.netmonitor.panes-network-details-height", 50);
  pref("devtools.netmonitor.filters", JSON.stringify(["all"]));
}

module.exports = {
  Prefs: new PrefsHelper("devtools", {
    networkDetailsWidth: ["Int", "netmonitor.panes-network-details-width"],
    networkDetailsHeight: ["Int", "netmonitor.panes-network-details-height"],
    filters: ["Json", "netmonitor.filters"],
  }),
};
