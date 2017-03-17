let { L10N } = require("devtools-launchpad");

/**
   * Converts a number to a locale-aware string format and keeps a certain
   * number of decimals.
   *
   * @param number number
   *        The number to convert.
   * @param number decimals [optional]
   *        Total decimals to keep.
   * @return string
   *         The localized number as a string.
   */
L10N.numberWithDecimals = function(number, decimals = 0) {
  // If this is an integer, don't do anything special.
  if (number === (number|0)) {
    return number;
  }
  // If this isn't a number (and yes, `isNaN(null)` is false), return zero.
  if (isNaN(number) || number === null) {
    return "0";
  }

  let localized = number.toLocaleString();

  // If no grouping or decimal separators are available, bail out, because
  // padding with zeros at the end of the string won't make sense anymore.
  if (!localized.match(/[^\d]/)) {
    return localized;
  }

  return number.toLocaleString(undefined, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  });
}

module.exports = { L10N };
