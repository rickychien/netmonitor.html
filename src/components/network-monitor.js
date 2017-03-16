const {
  createFactory,
  DOM,
  PropTypes,
} = require("react");
const { connect } = require("react-redux");

// Components
const MonitorPanel = createFactory(require("./monitor-panel"));
const StatisticsPanel = createFactory(require("./statistics-panel"));

const { div } = DOM;

/*
 * Network monitor component
 */
function NetworkMonitor({ statisticsOpen }) {
  return (
    div({ className: "network-monitor" },
      !statisticsOpen ? MonitorPanel() : StatisticsPanel()
    )
  );
}

NetworkMonitor.displayName = "NetworkMonitor";

NetworkMonitor.propTypes = {
  statisticsOpen: PropTypes.bool.isRequired,
};

module.exports = connect(
  (state) => ({ statisticsOpen: state.ui.statisticsOpen }),
)(NetworkMonitor);
