/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { tools: { copyFile, makeBundle }} = require("devtools-launchpad/index");
const path = require("path");
const minimist = require("minimist");
const feature = require("devtools-config");
const getConfig = require("./getConfig");

const envConfig = getConfig();
feature.setConfig(envConfig);

const args = minimist(process.argv.slice(2), {
  boolean: ["watch", "symlink"],
  string: ["mc"],
});

console.log("start: copy assets");

const projectPath = path.resolve(__dirname, "..");
const mcModulePath =  "devtools/client/netmonitor/dist";
let mcPath = args.mc || feature.getValue("firefox.mcPath");

copyFile(
  path.join(projectPath, "./assets/panel/index.html"),
  path.join(mcPath, "devtools/client/netmonitor/netmonitor.html"),
  { cwd: projectPath }
);

copyFile(
  path.join(projectPath, "./assets/panel/moz.build"),
  path.join(mcPath, "devtools/client/netmonitor/dist/moz.build"),
  { cwd: projectPath }
);

copyFile(
  path.join(projectPath, "./assets/panel/panel.js"),
  path.join(mcPath, "devtools/client/netmonitor/panel.js"),
  { cwd: projectPath }
);

// Resolving against the project path in case it's relative. If it's absolute
// it will override whatever is in projectPath.
mcPath = path.resolve(projectPath, mcPath);

makeBundle({
  outputPath: path.join(mcPath, mcModulePath),
  projectPath,
  watch: args.watch,
}).then(() => {
  console.log("done: copy assets");
});
