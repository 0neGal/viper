const ipcRenderer = require("electron").ipcRenderer;

let update_status = () => {
	// show a toast message if no Internet connection has been detected.
	if (! navigator.onLine) {
		ipcRenderer.send("no-internet");
	}
}

window.addEventListener("online", update_status);
window.addEventListener("offline", update_status);
update_status();

// invokes `requests.get()` from `src/modules/requests.js` through the
// main process, and returns the output
let request = async (...args) => {
	return await ipcRenderer.invoke("request", ...args);
}

request.delete_cache = () => {
	ipcRenderer.send("delete-request-cache");
}

module.exports = request;
