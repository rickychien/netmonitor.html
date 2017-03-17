/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { createStore, applyMiddleware } = require("redux");
const thunk = require("redux-thunk").default;
const { Prefs } = require("./prefs");
const batching = require("../middleware/batching");
const prefs = require("../middleware/prefs");
const rootReducer = require("../reducers/index");
const { FilterTypes, Filters } = require("../reducers/filters");
const { Requests } = require("../reducers/requests");
const { Sort } = require("../reducers/sort");
const { TimingMarkers } = require("../reducers/timing-markers");
const { UI } = require("../reducers/ui");

function configureStore() {
  let activeFilters = {};
  let middleware = [thunk, prefs, batching];

  Prefs.filters.forEach((filter) => {
    activeFilters[filter] = true;
  });

  let initialState = {
    filters: new Filters({ requestFilterTypes: new FilterTypes(activeFilters) }),
    requests: new Requests(),
    sort: new Sort(),
    timingMarkers: new TimingMarkers(),
    ui: new UI(),
  };

  return createStore(rootReducer, initialState, applyMiddleware(...middleware));
}

module.exports = {
  configureStore,
}
