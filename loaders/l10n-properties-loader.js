module.exports = function (source) {
  this.cacheable && this.cacheable();
  let strings = {};

  for (let line of source.split("\n")) {
    if (!line.startsWith("#") && line.length > 0) {
      let [key, value] = line.split("=");
      strings[key] = value;
    }
  }

  return `module.exports = ${JSON.stringify(strings)}`;
};
