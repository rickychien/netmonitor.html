const { combineReducers } = require("redux");
const batchingReducer = require("./batching");
const { requestsReducer } = require("./requests");
const { sortReducer } = require("./sort");
const { filters } = require("./filters");
const { timingMarkers } = require("./timing-markers");
const { ui } = require("./ui");

module.exports = batchingReducer(
  combineReducers({
    requests: requestsReducer,
    sort: sortReducer,
    filters,
    timingMarkers,
    ui,
  })
);
