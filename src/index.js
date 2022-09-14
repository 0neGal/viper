const fs = require("fs");
const path = require("path");
const { autoUpdater } = require("electron-updater");
const { app, ipcMain, BrowserWindow, dialog } = require("electron");

const utils = require("./utils");
const cli = require("./cli");
const requests = require("./extras/requests");

var log = console.log;

// Starts the actual BrowserWindow, which is only run when using the
// GUI, for the CLI this function is never called.
function start() {
	win = new BrowserWindow({
		width: 1000,
		height: 600,
		title: "Viper",

		// Hides the window initially, it'll be shown when the DOM is
		// loaded, as to not cause visual issues.
		show: false,

		// In the future we may want to allow the user to resize the window,
		// as it's fairly responsive, but for now we won't allow that.
		resizable: false,

		frame: false,
		titleBarStyle: "hidden",
		icon: path.join(__dirname, "assets/icons/512x512.png"),
		webPreferences: {
			webviewTag: true,
			nodeIntegration: true,
			contextIsolation: false,
		},
	});

	// when --debug is added it'll open the dev tools
	if (cli.hasParam("debug")) {win.openDevTools()}

	// general setup
	win.removeMenu();
	win.loadFile(__dirname + "/app/index.html");

	win.send = (channel, data) => {
		win.webContents.send(channel, data);
	}; send = win.send;

	ipcMain.on("exit", () => {
		if (utils.settings.originkill) {
			utils.isOriginRunning().then((running) => {
				if (running) {
					utils.killOrigin().then(process.exit(0))
				} else {
					process.exit(0)	
				}
			})
		} else {
			process.exit(0)
		}
	});
	ipcMain.on("minimize", () => {win.minimize()});
	ipcMain.on("relaunch", () => {app.relaunch(); app.exit()});

	// passthrough to renderer from main
	ipcMain.on("win-log", (event, ...args) => {send("log", ...args)});
	ipcMain.on("win-alert", (event, ...args) => {send("alert", ...args)});

	// mod states
	ipcMain.on("failed-mod", (event, modname) => {send("failed-mod", modname)});
	ipcMain.on("removed-mod", (event, modname) => {send("removed-mod", modname)});
	ipcMain.on("gui-getmods", (event, ...args) => {send("mods", utils.mods.list())});
	ipcMain.on("installed-mod", (event, modname) => {send("installed-mod", modname)});
	ipcMain.on("no-internet", () => {send("no-internet")});

	// install calls
	ipcMain.on("install-from-path", (event, path) => {utils.mods.install(path)});
	ipcMain.on("install-from-url", (event, url) => {utils.mods.installFromURL(url)});

	win.webContents.on("dom-ready", () => {
		send("mods", utils.mods.list());
	});

	// ensures gamepath still exists and is valid on startup
	let gamepathlost = false;
	ipcMain.on("gamepath-lost", (event, ...args) => {
		if (! gamepathlost) {
			gamepathlost = true;
			send("gamepath-lost");
		}
	});

	ipcMain.on("save-settings", (event, obj) => {utils.saveSettings(obj)});

	// allows renderer to check for updates
	ipcMain.on("ns-update-event", (event) => {send("ns-update-event", event)});
	ipcMain.on("can-autoupdate", () => {
		if (! autoUpdater.isUpdaterActive() || cli.hasParam("no-vp-updates")) {
			send("cant-autoupdate");
		}
	})

	// start auto-update process
	if (utils.settings.autoupdate) {
		if (cli.hasParam("no-vp-updates")) {
			utils.handleNorthstarUpdating();
		} else {
			utils.updateViper(false)
		}
	} else {
		utils.handleNorthstarUpdating();
	}

	autoUpdater.on("update-downloaded", () => {
		send("update-available");
	});

	// updates and restarts Viper, if user says yes to do so.
	// otherwise it'll do it on the next start up.
	ipcMain.on("update-now", () => {
		autoUpdater.quitAndInstall();
	})
}

// General events used to handle utils.js stuff without requiring the
// module inside the file that sent the event. {
ipcMain.on("install-mod", () => {
	if (cli.hasArgs()) {
		utils.mods.install(cli.param("installmod"));
	} else {
		dialog.showOpenDialog({properties: ["openFile"]}).then(res => {
			if (res.filePaths.length != 0) {
				utils.mods.install(res.filePaths[0]);
			} else {
				send("set-buttons", true);
			}
		}).catch(err => {error(err)});
	}
})

ipcMain.on("remove-mod", (event, mod) => {utils.mods.remove(mod)});
ipcMain.on("toggle-mod", (event, mod) => {utils.mods.toggle(mod)});

ipcMain.on("launch-ns", () => {utils.launch()});
ipcMain.on("launch-vanilla", () => {utils.launch("vanilla")});

ipcMain.on("setlang", (event, lang) => {utils.setlang(lang)});

ipcMain.on("update-northstar", () => {utils.updateNorthstar()})
ipcMain.on("setpath-cli", () => {utils.setpath()});
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

// retrieves various local version numbers
function sendVersionsInfo() {
	send("version", {
		ns: utils.getNSVersion(),
		tf2: utils.getTF2Version(),
		vp: "v" + require("../package.json").version
	});
}

// sends the version info back to the renderer
ipcMain.on("get-version", () => {sendVersionsInfo()});

// prints out version info for the CLI
ipcMain.on("version-cli", () => {
	log("Viper: v" + require("../package.json").version);
	log("Northstar: " + utils.getNSVersion());
	log("Node: " + process.version);
	log("Electron: v" + process.versions.electron);
	cli.exit();
})

// sends installed mods info to renderer
ipcMain.on("getmods", () => {
	let mods = utils.mods.list();
	if (mods.all.length > 0) {
		log(`${utils.lang("general.mods.installed")} ${mods.all.length}`);
		log(`${utils.lang("general.mods.enabled")} ${mods.enabled.length}`);
		for (let i = 0; i < mods.enabled.length; i++) {
			log(`  ${mods.enabled[i].Name} ${mods.enabled[i].Version}`);
		}

		if (mods.disabled.length > 0) {
			log(`${utils.lang("general.mods.disabled")} ${mods.disabled.length}`);
			for (let i = 0; i < mods.disabled.length; i++) {
				log(`  ${mods.disabled[i].Name} ${mods.disabled[i].Version}`);
			}
		}
		cli.exit(0);
	} else {
		log("No mods installed");
		cli.exit(0);
	}
})
// }

// allows renderer to set a new renderer
ipcMain.on("newpath", (event, newpath) => {
	if (newpath === false && ! win.isVisible()) {
		win.send("no-path-selected");
	} else {
		sendVersionsInfo();
		if (!win.isVisible()) {
			win.show();
		}
	}
}); ipcMain.on("wrong-path", () => {
	win.send("wrong-path");
});

// ensures PWD/CWD is the config folder where viper.json is located
process.chdir(app.getPath("appData"));

// starts the GUI or CLI
if (cli.hasArgs()) {
	if (cli.hasParam("update-viper")) {
		utils.updateViper(true);
	} else {
		cli.init();
	}
} else {
	app.on("ready", () => {
		app.setPath("userData", path.join(app.getPath("cache"), app.name));
		start();
	})
}

// returns cached requests
ipcMain.on("get-ns-notes", async () => {
	win.send("ns-notes", await requests.getNsReleaseNotes());
});

ipcMain.on("get-vp-notes", async () => {
	win.send("vp-notes", await requests.getVpReleaseNotes());
});
