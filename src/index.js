const fs = require("fs");
const path = require("path");
const { app, dialog, ipcMain, BrowserWindow, ipcRenderer } = require("electron");

const Emitter = require("events");
const events = new Emitter();

const utils = require("./utils");
const cli = require("./cli");

function start() {
	win = new BrowserWindow({
		width: 600,
		height: 130,
		show: false,
		title: "Viper",
		resizable: false,
		titleBarStyle: "hidden",
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		},
	}); 

	if (cli.hasParam("debug")) {win.openDevTools()}

	win.removeMenu();
	win.loadFile(__dirname + "/app/index.html");
	win.webContents.once("dom-ready", () => {win.show()});

	ipcMain.on("setpath", (event) => {utils.setpath(win)})
	ipcMain.on("exit", (event) => {process.exit(0)})
}

ipcMain.on("launch", (event) => {utils.launch()})
ipcMain.on("setlang", (event, lang) => {utils.setlang(lang)})
ipcMain.on("launchVanilla", (event) => {utils.launch("vanilla")})

ipcMain.on("update", (event) => {utils.update()})
ipcMain.on("setpathcli", (event) => {utils.setpath()});

ipcMain.on('getVersionInfo', () => {
	win.webContents.send('versionInfo', {
		ns: utils.getInstalledVersion(),
		vp: 'v' + require('../package.json').version
	});
});

process.chdir(app.getPath("appData"));

if (cli.hasArgs()) {
	cli.init();
} else {
	app.on("ready", () => {
		app.setPath("userData", path.join(app.getPath("cache"), app.name));
		start();
	})
}
