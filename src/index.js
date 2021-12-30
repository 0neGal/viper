const fs = require("fs");
const path = require("path");
const { app, dialog, ipcMain, BrowserWindow } = require("electron");

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

	ipcMain.on("exit", () => {process.exit(0)})
	ipcMain.on("setpath", () => {utils.setpath(win)})
	ipcMain.on("setsize", (event, height) => {
		win.setSize(width, height);
		if (! win.isVisible()) {
			win.show();
		}
	})

	ipcMain.on("ns-updated", () => {win.webContents.send("ns-updated")})
	ipcMain.on("ns-updating", () => {win.webContents.send("ns-updating")})
	ipcMain.on("winLog", (event, ...args) => {win.webContents.send("log", ...args)})
	ipcMain.on("guigetmods", (event, ...args) => {win.webContents.send("mods", utils.mods.list())})

	win.webContents.once("dom-ready", () => {
		win.webContents.send("mods", utils.mods.list());
	});
}

ipcMain.on("launch", (event) => {utils.launch()})
ipcMain.on("setlang", (event, lang) => {utils.setlang(lang)})
ipcMain.on("launchVanilla", (event) => {utils.launch("vanilla")})

ipcMain.on("update", (event) => {utils.update()})
ipcMain.on("setpathcli", (event) => {utils.setpath()})

ipcMain.on("getmods", (event) => {
	let mods = utils.mods.list();
	if (mods.length > 0) {
		console.log(`${utils.lang("general.mods.installed")} ${mods.length}`)
		for (let i = 0; i < mods.length; i++) {
			console.log(`  ${mods[i].Name} ${mods[i].Version}`)
		}
		cli.exit(0);
	} else {
		console.log("No mods installed");
		cli.exit(0);
	}
})

process.chdir(app.getPath("appData"));

if (cli.hasArgs()) {
	cli.init();
} else {
	app.on("ready", () => {
		app.setPath("userData", path.join(app.getPath("cache"), app.name));
		start();
	})
}
