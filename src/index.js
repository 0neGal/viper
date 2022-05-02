const fs = require("fs");
const path = require("path");
const { autoUpdater } = require("electron-updater");
const { app, ipcMain, BrowserWindow, dialog } = require("electron");

const Emitter = require("events");
const events = new Emitter();

const utils = require("./utils");
const cli = require("./cli");
const requests = require("./extras/requests");

// Starts the actual BrowserWindow, which is only run when using the
// GUI, for the CLI this function is never called.
function start() {
	win = new BrowserWindow({
		width: 1000,
		height: 600,

		// Hides the window initially, it'll be shown when the DOM is
		// loaded, as to not cause visual issues.
		show: false,
		title: "Viper",

		// In the future we may want to allow the user to resize the window,
		// as it's fairly responsive, but for now we won't allow that.
		resizable: false,
		titleBarStyle: "hidden",
		frame: false,
		icon: path.join(__dirname, "assets/icons/512x512.png"),
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		},
	}); 

	// When --debug is added it'll open the dev tools
	if (cli.hasParam("debug")) {win.openDevTools()}

	// General setup
	win.removeMenu();
	win.loadFile(__dirname + "/app/index.html");


	ipcMain.on("exit", () => {process.exit(0)})
	ipcMain.on("minimize", () => {win.minimize()})
	ipcMain.on("relaunch", () => {app.relaunch();app.exit()})
	ipcMain.on("installfrompath", (event, path) => {utils.mods.install(path)})
	ipcMain.on("installfromurl", (event, url) => {utils.mods.installFromURL(url)})
	ipcMain.on("winLog", (event, ...args) => {win.webContents.send("log", ...args)});
	ipcMain.on("winAlert", (event, ...args) => {win.webContents.send("alert", ...args)});
	ipcMain.on("ns-update-event", (event) => win.webContents.send("ns-update-event", event));
	ipcMain.on("failedmod", (event, modname) => {win.webContents.send("failedmod", modname)});
	ipcMain.on("removedmod", (event, modname) => {win.webContents.send("removedmod", modname)});
	ipcMain.on("installedmod", (event, modname) => {win.webContents.send("installedmod", modname)});
	ipcMain.on("guigetmods", (event, ...args) => {win.webContents.send("mods", utils.mods.list())});

	let gamepathlost = false;
	ipcMain.on("gamepathlost", (event, ...args) => {
		if (! gamepathlost) {
			gamepathlost = true;
			win.webContents.send("gamepathlost");
		}
	});

	ipcMain.on("savesettings", (event, obj) => {utils.saveSettings(obj)})

	ipcMain.on("can-autoupdate", (event) => {
		if (! require("electron-updater").autoUpdater.isUpdaterActive() || cli.hasParam("no-vp-updates")) {
			win.webContents.send("cant-autoupdate")
		}
	})

	win.webContents.on("dom-ready", () => {
		win.webContents.send("mods", utils.mods.list());
	});

	if (utils.settings.autoupdate) {
		if (cli.hasParam("no-vp-updates")) {
			utils.handleNorthstarUpdating();
		} else {
			utils.updatevp(false)
		}
	} else {
		utils.handleNorthstarUpdating();
	}

	autoUpdater.on("update-downloaded", () => {
		win.webContents.send("updateavailable")
	});

	// Updates and restarts Viper, if user says yes to do so.
	// Otherwise it'll do it on the next start up.
	ipcMain.on("updatenow", () => {
		autoUpdater.quitAndInstall();
	})
}

// General events used to handle utils.js stuff without requiring the
// module inside the file that sent the event. {
ipcMain.on("installmod", () => {
	if (cli.hasArgs()) {
		utils.mods.install(cli.param("installmod"))
	} else {
		dialog.showOpenDialog({properties: ["openFile"]}).then(res => {
			if (res.filePaths.length != 0) {
				utils.mods.install(res.filePaths[0]);
			} else {
				win.webContents.send("setbuttons", true);
			}
		}).catch(err => {console.error(err)})
	}
})

ipcMain.on("removemod", (event, mod) => {utils.mods.remove(mod)})
ipcMain.on("togglemod", (event, mod) => {utils.mods.toggle(mod)})

ipcMain.on("launch", (event) => {utils.launch()})
ipcMain.on("setlang", (event, lang) => {utils.setlang(lang)})
ipcMain.on("launchVanilla", (event) => {utils.launch("vanilla")})

ipcMain.on("update", (event) => {utils.update()})
ipcMain.on("setpathcli", (event) => {utils.setpath()});
ipcMain.on("setpath", (event, value) => {
	if (! value) {
		if (! win.isVisible()) {
			utils.setpath(win);
		} else {
			utils.setpath(win, true);
		}
	} else if (! win.isVisible()) {
		win.show();
	}
});

function _sendVersionsInfo() {
	win.webContents.send("version", {
		ns: utils.getNSVersion(),
		tf2: utils.getTF2Version(),
		vp: "v" + require("../package.json").version
	});
}

// Sends the version info back to the renderer
ipcMain.on("getversion", () => {_sendVersionsInfo()});

// Prints out version info for the CLI
ipcMain.on("versioncli", () => {
	console.log("Viper: v" + require("../package.json").version);
	console.log("Northstar: " + utils.getNSVersion());
	console.log("Node: " + process.version);
	console.log("Electron: v" + process.versions.electron);
	cli.exit();
})

ipcMain.on("getmods", (event) => {
	let mods = utils.mods.list();
	if (mods.all.length > 0) {
		console.log(`${utils.lang("general.mods.installed")} ${mods.all.length}`)
		console.log(`${utils.lang("general.mods.enabled")} ${mods.enabled.length}`)
		for (let i = 0; i < mods.enabled.length; i++) {
			console.log(`  ${mods.enabled[i].Name} ${mods.enabled[i].Version}`)
		}

		if (mods.disabled.length > 0) {
			console.log(`${utils.lang("general.mods.disabled")} ${mods.disabled.length}`)
			for (let i = 0; i < mods.disabled.length; i++) {
				console.log(`  ${mods.disabled[i].Name} ${mods.disabled[i].Version}`)
			}
		}
		cli.exit(0);
	} else {
		console.log("No mods installed");
		cli.exit(0);
	}
})
// }

ipcMain.on("newpath", (event, newpath) => {
	if (newpath === false && !win.isVisible()) {
		win.webContents.send("nopathselected");
	} else {
		_sendVersionsInfo();
		if (!win.isVisible()) {
			win.show();
		}
	}
}); ipcMain.on("wrongpath", (event) => {
	win.webContents.send("wrongpath");
});

// Ensures ./ is the config folder where viper.json is located.
process.chdir(app.getPath("appData"));

// Starts the GUI or CLI
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

// Returns cached requests
ipcMain.on("get-ns-notes", async () => {
	win.webContents.send("ns-notes", await requests.getNsReleaseNotes());
});

ipcMain.on("get-vp-notes", async () => {
	win.webContents.send("vp-notes", await requests.getVpReleaseNotes());
});
