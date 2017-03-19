const { TooltipToggle } = require("./TooltipToggle");

const POSITION = {
  TOP: "top",
  BOTTOM: "bottom",
};
const TYPE = {
  NORMAL: "normal",
  ARROW: "arrow",
};

const ARROW_WIDTH = 32;

// Default offset between the tooltip's left edge and the tooltip arrow.
const ARROW_OFFSET = 20;

const EXTRA_HEIGHT = {
  "normal": 0,
  // The arrow is 16px tall, but merges on 3px with the panel border
  "arrow": 13,
};

const EXTRA_BORDER = {
  "normal": 0,
  "arrow": 3,
};

/**
 * Calculate the vertical position & offsets to use for the tooltip. Will attempt to
 * respect the provided height and position preferences, unless the available height
 * prevents this.
 *
 * @param {DOMRect} anchorRect
 *        Bounding rectangle for the anchor, relative to the tooltip document.
 * @param {DOMRect} viewportRect
 *        Bounding rectangle for the viewport. top/left can be different from 0 if some
 *        space should not be used by tooltips (for instance OS toolbars, taskbars etc.).
 * @param {Number} height
 *        Preferred height for the tooltip.
 * @param {String} pos
 *        Preferred position for the tooltip. Possible values: "top" or "bottom".
 * @return {Object}
 *         - {Number} top: the top offset for the tooltip.
 *         - {Number} height: the height to use for the tooltip container.
 *         - {String} computedPosition: Can differ from the preferred position depending
 *           on the available height). "top" or "bottom"
 */
const calculateVerticalPosition =
function (anchorRect, viewportRect, height, pos, offset) {
  let {TOP, BOTTOM} = POSITION;

  let {top: anchorTop, height: anchorHeight} = anchorRect;

  // Translate to the available viewport space before calculating dimensions and position.
  anchorTop -= viewportRect.top;

  // Calculate available space for the tooltip.
  let availableTop = anchorTop;
  let availableBottom = viewportRect.height - (anchorTop + anchorHeight);

  // Find POSITION
  let keepPosition = false;
  if (pos === TOP) {
    keepPosition = availableTop >= height + offset;
  } else if (pos === BOTTOM) {
    keepPosition = availableBottom >= height + offset;
  }
  if (!keepPosition) {
    pos = availableTop > availableBottom ? TOP : BOTTOM;
  }

  // Calculate HEIGHT.
  let availableHeight = pos === TOP ? availableTop : availableBottom;
  height = Math.min(height, availableHeight - offset);
  height = Math.floor(height);

  // Calculate TOP.
  let top = pos === TOP ? anchorTop - height - offset : anchorTop + anchorHeight + offset;

  // Translate back to absolute coordinates by re-including viewport top margin.
  top += viewportRect.top;

  return {top, height, computedPosition: pos};
};

/**
 * Calculate the vertical position & offsets to use for the tooltip. Will attempt to
 * respect the provided height and position preferences, unless the available height
 * prevents this.
 *
 * @param {DOMRect} anchorRect
 *        Bounding rectangle for the anchor, relative to the tooltip document.
 * @param {DOMRect} viewportRect
 *        Bounding rectangle for the viewport. top/left can be different from 0 if some
 *        space should not be used by tooltips (for instance OS toolbars, taskbars etc.).
 * @param {Number} width
 *        Preferred width for the tooltip.
 * @param {String} type
 *        The tooltip type (e.g. "arrow").
 * @param {Number} offset
 *        Horizontal offset in pixels.
 * @param {Boolean} isRtl
 *        If the anchor is in RTL, the tooltip should be aligned to the right.
 * @return {Object}
 *         - {Number} left: the left offset for the tooltip.
 *         - {Number} width: the width to use for the tooltip container.
 *         - {Number} arrowLeft: the left offset to use for the arrow element.
 */
const calculateHorizontalPosition =
function (anchorRect, viewportRect, width, type, offset, isRtl) {
  let anchorWidth = anchorRect.width;
  let anchorStart = isRtl ? anchorRect.right : anchorRect.left;

  // Translate to the available viewport space before calculating dimensions and position.
  anchorStart -= viewportRect.left;

  // Calculate WIDTH.
  width = Math.min(width, viewportRect.width);

  // Calculate LEFT.
  // By default the tooltip is aligned with the anchor left edge. Unless this
  // makes it overflow the viewport, in which case is shifts to the left.
  let left = anchorStart + offset - (isRtl ? width : 0);
  left = Math.min(left, viewportRect.width - width);
  left = Math.max(0, left);

  // Calculate ARROW LEFT (tooltip's LEFT might be updated)
  let arrowLeft;
  // Arrow style tooltips may need to be shifted to the left
  if (type === TYPE.ARROW) {
    let arrowCenter = left + ARROW_OFFSET + ARROW_WIDTH / 2;
    let anchorCenter = anchorStart + anchorWidth / 2;
    // If the anchor is too narrow, align the arrow and the anchor center.
    if (arrowCenter > anchorCenter) {
      left = Math.max(0, left - (arrowCenter - anchorCenter));
    }
    // Arrow's left offset relative to the anchor.
    arrowLeft = Math.min(ARROW_OFFSET, (anchorWidth - ARROW_WIDTH) / 2) | 0;
    // Translate the coordinate to tooltip container
    arrowLeft += anchorStart - left;
    // Make sure the arrow remains in the tooltip container.
    arrowLeft = Math.min(arrowLeft, width - ARROW_WIDTH);
    arrowLeft = Math.max(arrowLeft, 0);
  }

  // Translate back to absolute coordinates by re-including viewport left margin.
  left += viewportRect.left;

  return {left, width, arrowLeft};
};

/**
 * Get the bounding client rectangle for a given node, relative to a custom
 * reference element (instead of the default for getBoundingClientRect which
 * is always the element's ownerDocument).
 */
const getRelativeRect = function (node, relativeTo) {
  // Width and Height can be taken from the rect.
  let {width, height} = node.getBoundingClientRect();

  let quads = node.getBoxQuads({relativeTo});
  let top = quads[0].bounds.top;
  let left = quads[0].bounds.left;

  // Compute right and bottom coordinates using the rest of the data.
  let right = left + width;
  let bottom = top + height;

  return {top, right, bottom, left, width, height};
};

/**
 * The Tooltip can display HTML content in a tooltip popup.
 *
 * @param {Object}
 *        - {String} type
 *          Display type of the tooltip. Possible values: "normal", "arrow"
 *        - {Boolean} autofocus
 *          Defaults to false. Should the tooltip be focused when opening it.
 *        - {Boolean} consumeOutsideClicks
 *          Defaults to true. The tooltip is closed when clicking outside.
 *          Should this event be stopped and consumed or not.
 */
function Tooltip({
  type = "normal",
  autofocus = false,
  consumeOutsideClicks = true,
}) {
  this.doc = document;
  this.type = type;
  this.autofocus = autofocus;
  this.consumeOutsideClicks = consumeOutsideClicks;

  // The top window is used to attach click event listeners to close the tooltip if the
  // user clicks on the content page.
  this.topWindow = this._getTopWindow();
  this._position = null;
  this._onClick = this._onClick.bind(this);
  this._toggle = new TooltipToggle(this);
  this.startTogglingOnHover = this._toggle.start.bind(this._toggle);
  this.stopTogglingOnHover = this._toggle.stop.bind(this._toggle);
  this.container = this._createContainer();
  this.doc.body.appendChild(this.container);
}

Tooltip.prototype = {
  /**
   * The tooltip panel is the parentNode of the tooltip content provided in
   * setContent().
   */
  get panel() {
    return this.container.querySelector(".tooltip-panel");
  },

  /**
   * The arrow element. Might be null depending on the tooltip type.
   */
  get arrow() {
    return this.container.querySelector(".tooltip-arrow");
  },

  /**
   * Retrieve the displayed position used for the tooltip. Null if the tooltip is hidden.
   */
  get position() {
    return this.isVisible() ? this._position : null;
  },

  /**
   * Set the tooltip content element. The preferred width/height should also be
   * specified here.
   *
   * @param {Element} content
   *        The tooltip content, should be a HTML element.
   * @param {Object}
   *        - {Number} width: preferred width for the tooltip container. If not specified
   *          the tooltip container will be measured before being displayed, and the
   *          measured width will be used as preferred width.
   *        - {Number} height: optional, preferred height for the tooltip container. If
   *          not specified, the tooltip will be able to use all the height available.
   */
  setContent: function (content, {width = "auto", height = Infinity} = {}) {
    this.preferredWidth = width;
    this.preferredHeight = height;

    this.panel.innerHTML = "";
    this.panel.appendChild(content);
  },

  /**
   * Show the tooltip next to the provided anchor element. A preferred position
   * can be set.
   *
   * @param {Element} anchor
   *        The reference element with which the tooltip should be aligned
   * @param {Object}
   *        - {String} position: optional, possible values: top|bottom
   *          If layout permits, the tooltip will be displayed on top/bottom
   *          of the anchor. If ommitted, the tooltip will be displayed where
   *          more space is available.
   *        - {Number} x: optional, horizontal offset between the anchor and the tooltip
   *        - {Number} y: optional, vertical offset between the anchor and the tooltip
   */
  show(anchor, { position, x = 0, y = 0 } = {}) {
    // Get anchor geometry
    let anchorRect = getRelativeRect(anchor, this.doc);

    // Get viewport size
    let viewportRect = this._getViewportRect();

    let themeHeight = EXTRA_HEIGHT[this.type] + 2 * EXTRA_BORDER[this.type];
    let preferredHeight = this.preferredHeight + themeHeight;

    let { top, height, computedPosition } =
      calculateVerticalPosition(anchorRect, viewportRect, preferredHeight, position, y);

    this._position = computedPosition;
    // Apply height before measuring the content width (if width="auto").
    let isTop = computedPosition === POSITION.TOP;
    this.container.classList.toggle("tooltip-top", isTop);
    this.container.classList.toggle("tooltip-bottom", !isTop);

    // If the preferred height is set to Infinity, the tooltip container should grow based
    // on its content's height and use as much height as possible.
    this.container.classList.toggle("tooltip-flexible-height",
      this.preferredHeight === Infinity);

    this.container.style.height = height + "px";

    let preferredWidth;
    if (this.preferredWidth === "auto") {
      preferredWidth = this._measureContainerWidth();
    } else {
      let themeWidth = 2 * EXTRA_BORDER[this.type];
      preferredWidth = this.preferredWidth + themeWidth;
    }

    let anchorWin = anchor.ownerDocument.defaultView;
    let isRtl = anchorWin.getComputedStyle(anchor).direction === "rtl";
    let {left, width, arrowLeft} = calculateHorizontalPosition(
      anchorRect, viewportRect, preferredWidth, this.type, x, isRtl);

    this.container.style.width = width + "px";

    if (this.type === TYPE.ARROW) {
      this.arrow.style.left = arrowLeft + "px";
    }

    this.container.classList.add("tooltip-visible");

    // Keep a pointer on the focused element to refocus it when hiding the tooltip.
    this._focusedElement = this.doc.activeElement;

    this.doc.defaultView.clearTimeout(this.attachEventsTimer);
    this.attachEventsTimer = this.doc.defaultView.setTimeout(() => {
      this._maybeFocusTooltip();
      // Updated the top window reference each time in case the host changes.
      this.topWindow = this._getTopWindow();
      this.topWindow.addEventListener("click", this._onClick, true);
    }, 0);
  },

  /**
   * Calculate the rect of the viewport that limits the tooltip dimensions.
   *
   * @return {Object} DOMRect-like object with the Number properties: top, right, bottom,
   *         left, width, height
   */
  _getViewportRect: function () {
    return this.doc.documentElement.getBoundingClientRect();
  },

  _measureContainerWidth: function () {
    this.container.classList.add("tooltip-hidden");
    this.container.style.width = "auto";
    this.container.classList.remove("tooltip-hidden");

    return this.container.getBoundingClientRect().width;
  },

  /**
   * Hide the current tooltip.
   */
  hide() {
    this.doc.defaultView.clearTimeout(this.attachEventsTimer);
    if (!this.isVisible()) {
      return;
    }

    this.topWindow.removeEventListener("click", this._onClick, true);
    this.container.classList.remove("tooltip-visible");

    let tooltipHasFocus = this.container.contains(this.doc.activeElement);
    if (tooltipHasFocus && this._focusedElement) {
      this._focusedElement.focus();
      this._focusedElement = null;
    }
  },

  /**
   * Check if the tooltip is currently displayed.
   * @return {Boolean} true if the tooltip is visible
   */
  isVisible: function () {
    return this.container.classList.contains("tooltip-visible");
  },

  /**
   * Destroy the tooltip instance. Hide the tooltip if displayed, remove the
   * tooltip container from the document.
   */
  destroy: function () {
    this.hide();
    this.container.remove();
  },

  _createContainer: function () {
    let container = this.doc.createElement("div");
    container.setAttribute("type", this.type);
    container.classList.add("tooltip-container");

    let html = '<div class="tooltip-filler"></div>';
    html += '<div class="tooltip-panel"></div>';

    if (this.type === TYPE.ARROW) {
      html += '<div class="tooltip-arrow"></div>';
    }
    container.innerHTML = html;
    return container;
  },

  _onClick: function (e) {
    if (this._isInTooltipContainer(e.target)) {
      return;
    }

    this.hide();
    if (this.consumeOutsideClicks && e.button === 0) {
      // Consume only left click events (button === 0).
      e.preventDefault();
      e.stopPropagation();
    }
  },

  _isInTooltipContainer: function (node) {
    // Check if the target is the tooltip arrow.
    if (this.arrow && this.arrow === node) {
      return true;
    }

    let tooltipWindow = this.panel.ownerDocument.defaultView;
    let win = node.ownerDocument.defaultView;

    // Check if the tooltip panel contains the node if they live in the same document.
    if (win === tooltipWindow) {
      return this.panel.contains(node);
    }

    // Check if the node window is in the tooltip container.
    while (win.parent && win.parent !== win) {
      if (win.parent === tooltipWindow) {
        // If the parent window is the tooltip window, check if the tooltip contains
        // the current frame element.
        return this.panel.contains(win.frameElement);
      }
      win = win.parent;
    }

    return false;
  },

  /**
   * If the tootlip is configured to autofocus and a focusable element can be found,
   * focus it.
   */
  _maybeFocusTooltip: function () {
    // Simplied selector targetting elements that can receive the focus, full version at
    // http://stackoverflow.com/questions/1599660/which-html-elements-can-receive-focus .
    let focusableSelector = "a, button, iframe, input, select, textarea";
    let focusableElement = this.panel.querySelector(focusableSelector);
    if (this.autofocus && focusableElement) {
      focusableElement.focus();
    }
  },

  _getTopWindow: function () {
    return this.doc.defaultView.top;
  },
};

module.exports = {
  POSITION,
  TYPE,
  Tooltip,
};
