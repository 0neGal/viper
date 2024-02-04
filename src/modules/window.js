const main_win = require("../win");
const ipcMain = require("electron").ipcMain;

let win = {};

// logs into the dev tools of the renderer
win.log = (...args) => {
	main_win().send("log", ...args);
}

// this increments for every alert that's created, the ID is used to
// keep track of popups being opened or closed.
let alert_id = 0;

// sends an alert to the renderer
win.alert = (msg) => {
	alert_id++;

	return new Promise((resolve) => {
		ipcMain.once(`alert-closed-${alert_id}`, () => {
			resolve();
		})

		main_win().send("alert", {
			id: alert_id,
			message: msg
		})
	})
}

// this increments for every confirm alert that's created, the ID is
// used to keep track of popups being opened or closed.
let confirm_id = 0;

// sends an alert to the renderer
win.confirm = (msg) => {
	confirm_id++;

	return new Promise((resolve) => {
		ipcMain.once(`confirm-closed-${confirm_id}`, (event, confirmed) => {
			resolve(confirmed);
		})

		main_win().send("confirm", {
			message: msg,
			id: confirm_id
		})
	})
}

module.exports = win;
