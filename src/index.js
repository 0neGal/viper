const fs = require("fs");
const path = require("path");
const { autoUpdater } = require("electron-updater");
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
		icon: path.join(__dirname, "assets/icons/512x512.png"),
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

	if (utils.settings.autoupdate) {utils.updatevp(false)}

	autoUpdater.on("update-downloaded", () => {
		win.webContents.send("updateavailable")
	});

	ipcMain.on("updatenow", () => {
		autoUpdater.quitAndInstall();
	})
}

ipcMain.on("launch", (event) => {utils.launch()})
ipcMain.on("setlang", (event, lang) => {utils.setlang(lang)})
ipcMain.on("launchVanilla", (event) => {utils.launch("vanilla")})

ipcMain.on("update", (event) => {utils.update()})
ipcMain.on("setpathcli", (event) => {utils.setpath()});

ipcMain.on("getversion", () => {
	win.webContents.send("version", {
		ns: utils.getNSVersion(),
		vp: "v" + require("../package.json").version
	});
});

ipcMain.on("versioncli", () => {
	console.log("Viper: v" + require("../package.json").version);
	console.log("Northstar: " + utils.getNSVersion());
	console.log("Node: " + process.version);
	console.log("Electron: v" + process.versions.electron);
	cli.exit();
})

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
	if (cli.hasParam("updatevp")) {
		utils.updatevp(true);
	} else {
		cli.init();
	}
} else {
	app.on("ready", () => {
		app.setPath("userData", path.join(app.getPath("cache"), app.name));
		start();
	})
}
