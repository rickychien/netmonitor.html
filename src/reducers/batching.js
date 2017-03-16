const { BATCH_ACTIONS } = require("../constants");

/**
 * A reducer to handle batched actions. For each action in the BATCH_ACTIONS array,
 * the reducer is called successively on the array of batched actions, resulting in
 * only one state update.
 */
function batchingReducer(nextReducer) {
  return function reducer(state, action) {
    switch (action.type) {
      case BATCH_ACTIONS:
        return action.actions.reduce(reducer, state);
      default:
        return nextReducer(state, action);
    }
  };
}

module.exports = batchingReducer;
