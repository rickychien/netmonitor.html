/**
 * HTML5 file saver to provide a standard download interface with a "Save As"
 * dialog
 *
 * @param {object} blob - A blob object will be downloaded
 * @param {string} filename - Given a file name which will display in "Save As" dialog
 */
function saveAs(blob, filename = "") {
  let url = URL.createObjectURL(blob);
  let a = document.createElement("a");
  document.body.appendChild(a);
  a.style = "display: none";
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}

module.exports = {
  saveAs,
};
