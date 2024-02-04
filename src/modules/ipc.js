const win = require("../win");
const { app, ipcMain } = require("electron");

const kill = require("./kill");
const settings = require("./settings");
const is_running = require("./is_running");

ipcMain.on("exit", () => {
	if (settings().originkill) {
		is_running.origin().then((running) => {
			if (running) {
				kill.origin().then(process.exit(0));
			} else {
				process.exit(0)	;
			}
		})
	} else {
		process.exit(0);
	}
})

ipcMain.on("minimize", () => {
	win().minimize();
})

ipcMain.on("relaunch", () => {
	app.relaunch({
		args: process.argv.slice(1)
	})

	app.exit(0);
})
