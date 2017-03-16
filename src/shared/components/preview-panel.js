const {
  DOM,
  PropTypes,
} = require("react");

const { div, iframe } = DOM;

/*
 * Preview panel component
 * Display HTML content within a sandbox enabled iframe
 */
function PreviewPanel({ request }) {
  const htmlBody = request.responseContent ?
    request.responseContent.content.text : "";

  return (
    div({ className: "panel-container" },
      iframe({
        sandbox: "",
        srcDoc: typeof htmlBody === "string" ? htmlBody : "",
      })
    )
  );
}

PreviewPanel.displayName = "PreviewPanel";

PreviewPanel.propTypes = {
  request: PropTypes.object.isRequired,
};

module.exports = PreviewPanel;
