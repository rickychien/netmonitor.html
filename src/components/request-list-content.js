const {
  createClass,
  createFactory,
  DOM,
  PropTypes,
} = require("react");
const { connect } = require("react-redux");
const { Tooltip } = require("../shared/components/tooltip/Tooltip");
const Actions = require("../actions/index");
const {
  setTooltipImageContent,
  setTooltipStackTraceContent,
} = require("../request-list-tooltip");
const {
  getDisplayedRequests,
  getSelectedRequest,
  getSortedRequests,
  getWaterfallScale,
} = require("../selectors/index");

// Components
const RequestListItem = createFactory(require("./request-list-item"));
const RequestListContextMenu = require("../request-list-context-menu");

const { div } = DOM;

/**
 * Renders the actual contents of the request list.
 */
const RequestListContent = createClass({
  displayName: "RequestListContent",

  propTypes: {
    displayedRequests: PropTypes.object.isRequired,
    firstRequestStartedMillis: PropTypes.number.isRequired,
    fromCache: PropTypes.bool,
    onItemMouseDown: PropTypes.func.isRequired,
    onSelectDelta: PropTypes.func.isRequired,
    scale: PropTypes.number,
    selectedRequest: PropTypes.object,
    selectDetailsPanelTab: PropTypes.func.isRequired,
    sortedRequests: PropTypes.object,
  },

  componentWillMount() {
    this.contextMenu = new RequestListContextMenu(this.props);
    this.tooltip = new Tooltip({ type: "arrow" });
  },

  componentDidMount() {
    // Set the CSS variables for waterfall scaling
    this.setScalingStyles();

    // Install event handler for displaying a tooltip
    this.tooltip.startTogglingOnHover(this.refs.contentEl, this.onHover, {
      toggleDelay: 500,
      interactive: true
    });

    // Install event handler to hide the tooltip on scroll
    this.refs.contentEl.addEventListener("scroll", this.onScroll, true);
  },

  componentWillUpdate(nextProps) {
    // Check if the list is scrolled to bottom before the UI update.
    // The scroll is ever needed only if new rows are added to the list.
    const delta = nextProps.displayedRequests.size - this.props.displayedRequests.size;
    this.shouldScrollBottom = delta > 0 && this.isScrolledToBottom();
  },

  componentDidUpdate(prevProps) {
    // Update the CSS variables for waterfall scaling after props change
    this.setScalingStyles(prevProps);

    // Keep the list scrolled to bottom if a new row was added
    if (this.shouldScrollBottom) {
      let node = this.refs.contentEl;
      node.scrollTop = node.scrollHeight;
    }
  },

  componentWillUnmount() {
    this.refs.contentEl.removeEventListener("scroll", this.onScroll, true);

    // Uninstall the tooltip event handler
    this.tooltip.stopTogglingOnHover();
  },

  /**
   * Set the CSS variables for waterfall scaling. If React supported setting CSS
   * variables as part of the "style" property of a DOM element, we would use that.
   *
   * However, React doesn't support this, so we need to use a hack and update the
   * DOM element directly: https://github.com/facebook/react/issues/6411
   */
  setScalingStyles(prevProps) {
    const { scale } = this.props;
    if (prevProps && prevProps.scale === scale) {
      return;
    }

    const { style } = this.refs.contentEl;
    style.removeProperty("--timings-scale");
    style.removeProperty("--timings-rev-scale");
    style.setProperty("--timings-scale", scale);
    style.setProperty("--timings-rev-scale", 1 / scale);
  },

  isScrolledToBottom() {
    const { contentEl } = this.refs;
    const lastChildEl = contentEl.lastElementChild;

    if (!lastChildEl) {
      return false;
    }

    let lastChildRect = lastChildEl.getBoundingClientRect();
    let contentRect = contentEl.getBoundingClientRect();

    return (lastChildRect.height + lastChildRect.top) <= contentRect.bottom;
  },

  /**
   * The predicate used when deciding whether a popup should be shown
   * over a request item or not.
   *
   * @param nsIDOMNode target
   *        The element node currently being hovered.
   * @param object tooltip
   *        The current tooltip instance.
   * @return {Promise}
   */
  onHover(target, tooltip) {
    let itemEl = target.closest(".request-list-item");
    if (!itemEl) {
      return false;
    }
    let itemId = itemEl.dataset.id;
    if (!itemId) {
      return false;
    }
    let requestItem = this.props.displayedRequests.find(r => r.id == itemId);
    if (!requestItem) {
      return false;
    }

    if (requestItem.responseContent && target.closest(".requests-list-icon-and-file")) {
      return setTooltipImageContent(tooltip, itemEl, requestItem);
    } else if (requestItem.cause && target.closest(".requests-list-cause-stack")) {
      return setTooltipStackTraceContent(tooltip, requestItem);
    }

    return false;
  },

  /**
   * Scroll listener for the requests menu view.
   */
  onScroll() {
    this.tooltip.hide();
  },

  /**
   * Handler for keyboard events. For arrow up/down, page up/down, home/end,
   * move the selection up or down.
   */
  onKeyDown(evt) {
    let delta;

    switch (evt.key) {
      case "ArrowUp":
      case "ArrowLeft":
        delta = -1;
        break;
      case "ArrowDown":
      case "ArrowRight":
        delta = +1;
        break;
      case "PageUp":
        delta = "PAGE_UP";
        break;
      case "PageDown":
        delta = "PAGE_DOWN";
        break;
      case "Home":
        delta = -Infinity;
        break;
      case "End":
        delta = +Infinity;
        break;
    }

    if (delta) {
      // Prevent scrolling when pressing navigation keys.
      e.preventDefault();
      e.stopPropagation();
      this.props.onSelectDelta(delta);
    }
  },

  onContextMenu(evt) {
    evt.preventDefault();
    this.contextMenu.open(evt);
  },

  /**
   * If selection has just changed (by keyboard navigation), don't keep the list
   * scrolled to bottom, but allow scrolling up with the selection.
   */
  onFocusedNodeChange() {
    this.shouldScrollBottom = false;
  },

  render() {
    const {
      displayedRequests,
      firstRequestStartedMillis,
      selectedRequest = {},
      selectDetailsPanelTab,
      onItemMouseDown,
    } = this.props;

    return (
      div({
        ref: "contentEl",
        className: "requests-list-contents",
        tabIndex: 0,
        onKeyDown: this.onKeyDown,
      },
        displayedRequests.map((item, index) => RequestListItem({
          firstRequestStartedMillis,
          fromCache: item.status === "304" || item.fromCache,
          item,
          index,
          isSelected: item.id === selectedRequest.id,
          key: item.id,
          onContextMenu: this.onContextMenu,
          onFocusedNodeChange: this.onFocusedNodeChange,
          onMouseDown: () => onItemMouseDown(item.id),
          onSecurityIconClick: () => {
            let { securityState } = item;
            if (securityState && securityState !== "insecure") {
              selectDetailsPanelTab("security");
            }
          },
        }))
      )
    );
  },
});

module.exports = connect(
  (state) => ({
    displayedRequests: getDisplayedRequests(state),
    firstRequestStartedMillis: state.requests.firstStartedMillis,
    selectedRequest: getSelectedRequest(state),
    sortedRequests: getSortedRequests(state),
    scale: getWaterfallScale(state),
  }),
  (dispatch) => ({
    cloneSelectedRequest: () => dispatch(Actions.cloneSelectedRequest()),
    openStatistics: (open) => dispatch(Actions.openStatistics(open)),
    onItemMouseDown: (id) => dispatch(Actions.selectRequest(id)),
    onSelectDelta: (delta) => dispatch(Actions.selectDelta(delta)),
    selectDetailsPanelTab: (tab) => dispatch(Actions.selectDetailsPanelTab(tab)),
  }),
)(RequestListContent);
