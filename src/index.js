const fs = require("fs");
const path = require("path");
const { app, dialog, ipcMain, BrowserWindow } = require("electron");

const utils = require("./utils")

function start() {
	win = new BrowserWindow({
		width: 500,
		height: 115,
		show: false,
		title: "Viper",
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		},
	}); win.openDevTools()

	win.removeMenu();
	win.loadFile(__dirname + "/app/index.html");
	win.webContents.once("dom-ready", () => {win.show()});

	ipcMain.on("update", (event) => {utils.update(win)})
	ipcMain.on("setpath", (event) => {utils.setpath(win)})
}

app.on("ready", () => {
	process.chdir(app.getPath("appData"));
	app.setPath("userData", path.join(app.getPath("cache"), app.name));
	start();
})
