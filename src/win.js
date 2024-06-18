const ipcMain = require("electron").ipcMain;

// logs into the dev tools of the renderer
log = (...args) => {
	win.send("log", ...args);
}

// this increments for every alert that's created, the ID is used to
// keep track of popups being opened or closed.
let alert_id = 0;

// sends an alert to the renderer
alert = async (msg) => {
	alert_id++;

	return new Promise((resolve) => {
		ipcMain.once(`alert-closed-${alert_id}`, () => {
			resolve();
		})

		win.send("alert", {
			id: alert_id,
			message: msg
		})
	})
}

// sends an toast to the renderer
toast = (properties) => {
	win.send("toast", properties);
}

// this increments for every confirm alert that's created, the ID is
// used to keep track of popups being opened or closed.
let confirm_id = 0;

// sends an alert to the renderer
confirm = async (msg) => {
	confirm_id++;

	return new Promise((resolve) => {
		ipcMain.once(`confirm-closed-${confirm_id}`, (event, confirmed) => {
			resolve(confirmed);
		})

		win.send("confirm", {
			message: msg,
			id: confirm_id
		})
	})
}

let win = {
	send: () => {},

	log: log,
	toast: toast,
	alert: alert,
	confirm: confirm
}

let func = () => {
	return win;
}

func.set = (main_window) => {
	win = main_window;

	win.log = log;
	win.toast = toast;
	win.alert = alert;
	win.confirm = confirm;
}

module.exports = func;
