const ipcMain = require("electron").ipcMain;

let win = {};

// logs into the dev tools of the renderer
win.log = (msg) => {
	ipcMain.emit("win-log", msg, msg);
}

// sends an alert to the renderer
win.alert = (msg) => {
	ipcMain.emit("win-alert", msg, msg);
}

module.exports = win;
