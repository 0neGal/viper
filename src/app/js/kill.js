const ipcRenderer = require("electron").ipcRenderer;

// attempts to kill something using the main process' `modules/kill.js`
// functions, it simply attempts to run `kill[function_name]()`, if it
// doesn't exist, nothing happens
module.exports = (function_name) => {
	ipcRenderer.send("kill", function_name);
}
