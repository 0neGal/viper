const fs = require("fs");
const path = require("path");
const { app, dialog, ipcMain, BrowserWindow, ipcRenderer } = require("electron");

const Emitter = require("events");
const events = new Emitter();

const utils = require("./utils");
const cli = require("./cli");

function start() {
	let width = 600;
	win = new BrowserWindow({
		width: width,
		height: 115,
		show: false,
		title: "Viper",
		resizable: false,
		titleBarStyle: "hidden",
		icon: path.join(__dirname, 'assets/icons/512x512.png'),
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		},
	}); 

	if (cli.hasParam("debug")) {win.openDevTools()}

	win.removeMenu();
	win.loadFile(__dirname + "/app/index.html");

	ipcMain.on("exit", (event) => {process.exit(0)})
	ipcMain.on("setpath", (event) => {utils.setpath(win)})
	ipcMain.on("setsize", (event, height) => {
		win.setSize(width, height);
		if (! win.isVisible()) {
			win.show();
		}
	})
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
