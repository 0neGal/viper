const launcher = require("./launcher");
const set_buttons = require("./set_buttons");
const ipcRenderer = require("electron").ipcRenderer;

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

// keeps track of whether we've already sent a toast since we last went
// offline, to prevent multiple toasts
let sent_error_toast = false;

// shows or hides offline icon, and shows toast depending on `is_online`
let state_action = async (is_online) => {
	if (is_online) {
		// hide offline icon
		sent_error_toast = false;
		offline.classList.add("hidden");

		// re-enable buttons that require internet
		set_buttons(
			true, false,
			document.querySelectorAll(".requires-internet")
		)

		await launcher.check_servers();
		serverstatus.style.opacity = "1.0";
	} else {
		// show toast
		if (! sent_error_toast) {
			sent_error_toast = true;
			ipcRenderer.send("no-internet");
		}

		// show offline icon
		offline.classList.remove("hidden");

		// disable buttons that require internet
		set_buttons(
			false, false,
			document.querySelectorAll(".requires-internet")
		)

		serverstatus.style.opacity = "0.0";

		// close mod browser
		try {
			require("./browser").toggle(false);
		} catch(err) {}
	}
}

setTimeout(() => state_action(navigator.onLine), 100);
window.addEventListener("online", () => state_action(navigator.onLine));
window.addEventListener("offline", () => state_action(navigator.onLine));

// checks a list of endpoints/domains we need to be functioning for a
// lot of the WAN functionality
let check_endpoints = async () => {
	// if we're not online according to the navigator, it's highly
	// unlikely the endpoints will succeed
	if (! navigator.onLine) {
		return state_action(false);
	}

	// check endpoints
	let status = await request.check([
		"https://github.com",
		"https://northstar.tf",
		"https://thunderstore.io"
	])

	// handle result of check
	state_action(!! status.succeeded.length);
}

// check endpoints on startup
setTimeout(check_endpoints, 100);

// check endpoints every 30 seconds
setInterval(check_endpoints, 30000);

module.exports = request;
