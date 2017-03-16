const {
  createFactory,
  DOM,
  PropTypes,
} = require("react");

// Components
const RequestListContent = createFactory(require("./request-list-content"));
const RequestListEmptyNotice = createFactory(require("./request-list-empty"));
const RequestListHeader = createFactory(require("./request-list-header"));

const { div } = DOM;

/**
 * Request panel component
 */
function RequestList({ isEmpty }) {
  return (
    div({ className: "request-list-container" },
      RequestListHeader(),
      isEmpty ? RequestListEmptyNotice() : RequestListContent(),
    )
  );
}

RequestList.displayName = "RequestList";

RequestList.propTypes = {
  isEmpty: PropTypes.bool.isRequired,
};

module.exports = RequestList;
