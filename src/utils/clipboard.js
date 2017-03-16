function copyToClipboard(string) {
  let doCopy = function(e) {
    e.clipboardData.setData("text/plain", string);
    e.preventDefault();
  };

  document.addEventListener("copy", doCopy);
  document.execCommand("copy", false, null);
  document.removeEventListener("copy", doCopy);
}

module.exports = {
  copyToClipboard,
};
