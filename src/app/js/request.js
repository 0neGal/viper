const ipcRenderer = require("electron").ipcRenderer;

let update_status = () => {
	// if offline, show toast and offline icon
	if (! navigator.onLine) {
		ipcRenderer.send("no-internet");
		offline.classList.remove("hidden");
	} else { // remove offline icon
		offline.classList.add("hidden");
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
