const { Services: { wm } } = require("devtools-modules");
const {
  DOM,
  PropTypes,
} = require("react");
const { L10N } = require("../../utils/l10n");

const { a } = DOM;

const LEARN_MORE = L10N.getStr("netmonitor.headers.learnMore");

function MDNLink({ url }) {
  return (
    a({
      className: "learn-more-link",
      title: url,
      onClick: (e) => onLearnMoreClick(e, url),
    }, `[${LEARN_MORE}]`)
  );
}

MDNLink.displayName = "MDNLink";

MDNLink.propTypes = {
  url: PropTypes.string.isRequired,
};

function onLearnMoreClick(e, url) {
  e.stopPropagation();
  e.preventDefault();

  let win = wm.getMostRecentWindow();
  win.openUILinkIn(url, e.button === 1 ? "tabshifted" : "tab");
}

module.exports = MDNLink;
