const {
  createClass,
  createFactory,
  DOM,
  PropTypes,
} = require("react");
const { connect } = require("react-redux");
const { findDOMNode } = require("react-dom");
const Actions = require("../actions/index");
const { Prefs } = require("../utils/prefs");
const { getFormDataSections } = require("../utils/request-utils");
const { getSelectedRequest } = require("../selectors/index");

// Components
const SplitBox = createFactory(require("devtools-modules").SplitBox);
const NetworkDetailsPanel = createFactory(require("../shared/components/network-details-panel"));
const RequestList = createFactory(require("./request-list"));
const Toolbar = createFactory(require("./toolbar"));

const { div } = DOM;
const MediaQueryList = window.matchMedia("(min-width: 700px)");

/*
 * Monitor panel component
 * The main panel for displaying various network request information
 */
const MonitorPanel = createClass({
  displayName: "MonitorPanel",

  propTypes: {
    isEmpty: PropTypes.bool.isRequired,
    networkDetailsOpen: PropTypes.bool.isRequired,
    openNetworkDetails: PropTypes.func.isRequired,
    request: PropTypes.object,
    updateRequest: PropTypes.func.isRequired,
  },

  getInitialState() {
    return {
      isVerticalSpliter: MediaQueryList.matches,
    };
  },

  componentDidMount() {
    MediaQueryList.addListener(this.onLayoutChange);
  },

  componentWillReceiveProps(nextProps) {
    let {
      request = {},
      updateRequest,
    } = nextProps;
    let {
      formDataSections,
      requestHeaders,
      requestHeadersFromUploadStream,
      requestPostData,
    } = request;

    if (!formDataSections && requestHeaders &&
        requestHeadersFromUploadStream && requestPostData) {
      getFormDataSections(
        requestHeaders,
        requestHeadersFromUploadStream,
        requestPostData,
        window.gNetwork.getString.bind(window.gNetwork),
      ).then((newFormDataSections) => {
        updateRequest(
          request.id,
          { formDataSections: newFormDataSections },
          true,
        );
      });
    }
  },

  componentWillUnmount() {
    MediaQueryList.removeListener(this.onLayoutChange);

    let { clientWidth, clientHeight } = findDOMNode(this.refs.endPanel) || {};

    if (this.state.isVerticalSpliter && clientWidth) {
      Prefs.networkDetailsWidth = clientWidth;
    }
    if (!this.state.isVerticalSpliter && clientHeight) {
      Prefs.networkDetailsHeight = clientHeight;
    }
  },

  onLayoutChange() {
    this.setState({
      isVerticalSpliter: MediaQueryList.matches,
    });
  },

  render() {
    let { isEmpty, networkDetailsOpen } = this.props;
    return (
      div({ className: "monitor-panel" },
        Toolbar(),
        SplitBox({
          className: "devtools-responsive-container",
          initialWidth: `${Prefs.networkDetailsWidth}px`,
          initialHeight: `${Prefs.networkDetailsHeight}px`,
          minSize: "50px",
          maxSize: "80%",
          splitterSize: "1px",
          startPanel: RequestList({ isEmpty }),
          endPanel: networkDetailsOpen && NetworkDetailsPanel({ ref: "endPanel" }),
          endPanelControl: true,
          vert: this.state.isVerticalSpliter,
        }),
      )
    );
  }
});

module.exports = connect(
  (state) => ({
    isEmpty: state.requests.requests.isEmpty(),
    networkDetailsOpen: state.ui.networkDetailsOpen,
    request: getSelectedRequest(state),
  }),
  (dispatch) => ({
    openNetworkDetails: (open) => dispatch(Actions.openNetworkDetails(open)),
    updateRequest: (id, data, batch) => dispatch(Actions.updateRequest(id, data, batch)),
  }),
)(MonitorPanel);
