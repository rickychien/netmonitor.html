const I = require("immutable");
const { SORT_BY } = require("../constants");

const Sort = I.Record({
  // null means: sort by "waterfall", but don't highlight the table header
  type: null,
  ascending: true,
});

function sortReducer(state = new Sort(), action) {
  switch (action.type) {
    case SORT_BY: {
      return state.withMutations(st => {
        if (action.sortType == st.type) {
          st.ascending = !st.ascending;
        } else {
          st.type = action.sortType;
          st.ascending = true;
        }
      });
    }
    default:
      return state;
  }
}

module.exports = {
  Sort,
  sortReducer
};
