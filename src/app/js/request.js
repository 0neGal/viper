const ipcRenderer = require("electron").ipcRenderer;

let sent_error_toast = false;

let update_status = () => {
	// if offline, show toast and offline icon
	if (! navigator.onLine) {
		if (! sent_error_toast) {
			sent_error_toast = true;
			ipcRenderer.send("no-internet");
		}

		offline.classList.remove("hidden");
		return;
	}

	// remove offline icon
	offline.classList.add("hidden");
	sent_error_toast = false;
}

update_status();
window.addEventListener("online", update_status);
window.addEventListener("offline", update_status);

// invokes `requests.get()` from `src/modules/requests.js` through the
// main process, and returns the output
let request = async (...args) => {
	return await ipcRenderer.invoke("request", ...args);
}

// invokes `requests.check()` from `src/modules/requests.js` through the
// main process, and returns the output
request.check = async (...args) => {
	return await ipcRenderer.invoke("request-check", ...args);
}

request.delete_cache = () => {
	ipcRenderer.send("delete-request-cache");
}

// checks a list of endpoints/domains we need to be functioning for a
// lot of the WAN functionality
let check_endpoints = async () => {
	// if we're not online according to the navigator, it's highly
	// unlikely the endpoints will succeed
	if (! navigator.onLine) {
		if (! sent_error_toast) {
			sent_error_toast = true;
			ipcRenderer.send("no-internet");
		}

		return offline.classList.remove("hidden");
	}

	// check endpoints
	let status = await request.check([
		"https://github.com",
		"https://northstar.tf",
		"https://thunderstore.io"
	])

	// if just 1 endpoint succeeded, we probably have internet
	if (status.succeeded.length) {
		sent_error_toast = false;
		offline.classList.add("hidden");
	} else { // no endpoint succeeded!
		if (! sent_error_toast) {
			sent_error_toast = true;
			ipcRenderer.send("no-internet");
		}

		offline.classList.remove("hidden");
	}
}; check_endpoints();

// check endpoints every 30 seconds
setInterval(check_endpoints, 30000);

module.exports = request;
