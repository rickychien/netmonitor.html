const { WEBCONSOLE_L10N } = require("./utils/l10n");
const { formDataURI } = require("./utils/request-utils");

const CONTAINER_MIN_WIDTH = 100;
const IMAGE_PADDING = 4;
const LABEL_HEIGHT = 20;
const MAX_DIMENSION = 200;
const REQUESTS_TOOLTIP_IMAGE_MAX_DIM = 400;
const REQUESTS_TOOLTIP_STACK_TRACE_WIDTH = 600;

/**
 * Image preview tooltips should be provided with the naturalHeight and
 * naturalWidth value for the image to display. This helper loads the provided
 * image URL in an image object in order to retrieve the image dimensions after
 * the load.
 *
 * @param {Document} doc the document element to use to create the image object
 * @param {String} imageUrl the url of the image to measure
 * @return {Promise} returns a promise that will resolve after the iamge load:
 *         - {Number} naturalWidth natural width of the loaded image
 *         - {Number} naturalHeight natural height of the loaded image
 */
function getImageDimensions(doc, imageUrl) {
  return new Promise(resolve => {
    let imgObj = new doc.defaultView.Image();
    imgObj.onload = () => {
      imgObj.onload = null;
      let { naturalWidth, naturalHeight } = imgObj;
      resolve({ naturalWidth, naturalHeight });
    };
    imgObj.src = imageUrl;
  });
}

/**
 * Set the tooltip content of a provided HTMLTooltip instance to display an
 * image preview matching the provided imageUrl.
 *
 * @param {HTMLTooltip} tooltip
 *        The tooltip instance on which the image preview content should be set
 * @param {Document} doc
 *        A document element to create the HTML elements needed for the tooltip
 * @param {String} imageUrl
 *        Absolute URL of the image to display in the tooltip
 * @param {Object} options
 *        - {Number} naturalWidth mandatory, width of the image to display
 *        - {Number} naturalHeight mandatory, height of the image to display
 *        - {Number} maxDim optional, max width/height of the preview
 *        - {Boolean} hideDimensionLabel optional, pass true to hide the label
 */
function setImageTooltip(tooltip, doc, imageUrl, options) {
  let {naturalWidth, naturalHeight, hideDimensionLabel, maxDim} = options;
  maxDim = maxDim || MAX_DIMENSION;

  let imgHeight = naturalHeight;
  let imgWidth = naturalWidth;
  if (imgHeight > maxDim || imgWidth > maxDim) {
    let scale = maxDim / Math.max(imgHeight, imgWidth);
    // Only allow integer values to avoid rounding errors.
    imgHeight = Math.floor(scale * naturalHeight);
    imgWidth = Math.ceil(scale * naturalWidth);
  }

  // Create tooltip content
  let div = doc.createElement("div");
  div.style.cssText = `
    height: 100%;
    min-width: 100px;
    display: flex;
    flex-direction: column;
    text-align: center;`;
  let html = `
    <div style="flex: 1;
                display: flex;
                padding: ${IMAGE_PADDING}px;
                align-items: center;
                justify-content: center;
                min-height: 1px;">
      <img class="devtools-tooltip-tiles"
           style="height: ${imgHeight}px; max-height: 100%;"
           src="${imageUrl}"/>
    </div>`;

  if (!hideDimensionLabel) {
    let label = naturalWidth + " \u00D7 " + naturalHeight;
    html += `
      <div style="height: ${LABEL_HEIGHT}px;
                  text-align: center;">
        <span class="theme-comment devtools-tooltip-caption">${label}</span>
      </div>`;
  }
  div.innerHTML = html;

  // Calculate tooltip dimensions
  let height = imgHeight + 2 * IMAGE_PADDING;
  if (!hideDimensionLabel) {
    height += LABEL_HEIGHT;
  }
  let width = Math.max(CONTAINER_MIN_WIDTH, imgWidth + 2 * IMAGE_PADDING);

  tooltip.setContent(div, {width, height});
}

async function setTooltipImageContent(tooltip, itemEl, requestItem) {
  let { mimeType, text, encoding } = requestItem.responseContent.content;

  if (!mimeType || !mimeType.includes("image/")) {
    return false;
  }

  let string = await window.controller.getString(text);
  let src = formDataURI(mimeType, encoding, string);
  let maxDim = REQUESTS_TOOLTIP_IMAGE_MAX_DIM;
  let { naturalWidth, naturalHeight } = await getImageDimensions(tooltip.doc, src);
  let options = { maxDim, naturalWidth, naturalHeight };
  setImageTooltip(tooltip, tooltip.doc, src, options);

  return itemEl.querySelector(".requests-list-icon");
}

async function setTooltipStackTraceContent(tooltip, requestItem) {
  let {stacktrace} = requestItem.cause;

  if (!stacktrace || stacktrace.length == 0) {
    return false;
  }

  let doc = tooltip.doc;
  let el = doc.createElement("div");
  el.className = "stack-trace-tooltip devtools-monospace";

  for (let f of stacktrace) {
    let { functionName, filename, lineNumber, columnNumber, asyncCause } = f;

    if (asyncCause) {
      // if there is asyncCause, append a "divider" row into the trace
      let asyncFrameEl = doc.createElement("div");
      asyncFrameEl.className = "stack-frame stack-frame-async";
      asyncFrameEl.textContent =
        WEBCONSOLE_L10N.getFormatStr("stacktrace.asyncStack", asyncCause);
      el.appendChild(asyncFrameEl);
    }

    // Parse a source name in format "url -> url"
    let sourceUrl = filename.split(" -> ").pop();

    let frameEl = doc.createElement("div");
    frameEl.className = "stack-frame stack-frame-call";

    let funcEl = doc.createElement("span");
    funcEl.className = "stack-frame-function-name";
    funcEl.textContent =
      functionName || WEBCONSOLE_L10N.getStr("stacktrace.anonymousFunction");
    frameEl.appendChild(funcEl);

    let sourceEl = doc.createElement("span");
    sourceEl.className = "stack-frame-source-name";
    frameEl.appendChild(sourceEl);

    let sourceInnerEl = doc.createElement("span");
    sourceInnerEl.className = "stack-frame-source-name-inner";
    sourceEl.appendChild(sourceInnerEl);

    sourceInnerEl.textContent = sourceUrl;
    sourceInnerEl.title = sourceUrl;

    let lineEl = doc.createElement("span");
    lineEl.className = "stack-frame-line";
    lineEl.textContent = `:${lineNumber}:${columnNumber}`;
    sourceInnerEl.appendChild(lineEl);

    frameEl.addEventListener("click", () => {
      // hide the tooltip immediately, not after delay
      tooltip.hide();
      window.NetMonitorController.viewSourceInDebugger(filename, lineNumber);
    });

    el.appendChild(frameEl);
  }

  tooltip.setContent(el, {width: REQUESTS_TOOLTIP_STACK_TRACE_WIDTH});

  return true;
}

module.exports = {
  getImageDimensions,
  setImageTooltip,
  setTooltipImageContent,
  setTooltipStackTraceContent,
};
