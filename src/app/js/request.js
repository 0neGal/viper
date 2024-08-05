const ipcRenderer = require("electron").ipcRenderer;

const updateOnlineStatus = () => {
	// show a toast message if no Internet connection has been detected.
	if (!navigator.onLine) {
		ipcRenderer.send("no-internet");
	}
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

// invokes `requests.get()` from `src/modules/requests.js` through the
// main process, and returns the output
let request = async (...args) => {
	return await ipcRenderer.invoke("request", ...args);
}

request.delete_cache = () => {
	ipcRenderer.send("delete-request-cache");
}

module.exports = request;
