const { sprintf } = require("devtools-modules");

let strings = {};

function getStr(key) {
  if (!strings[key]) {
    throw new Error(`L10N key ${key} cannot be found.`);
  }
  return strings[key];
}

function getFormatStr(name, ...args) {
  return sprintf(getStr(name), ...args);
}

function numberWithDecimals(number, decimals = 0) {
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

function setBundle(bundle) {
  strings = Object.assign(strings, bundle);
}

module.exports = {
  getStr,
  getFormatStr,
  numberWithDecimals,
  setBundle,
};
