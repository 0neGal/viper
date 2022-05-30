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

	ipcMain.on("exit", () => {process.exit(0)});
	ipcMain.on("minimize", () => {win.minimize()});
	ipcMain.on("relaunch", () => {app.relaunch();app.exit()});

	// passthrough to renderer from main
	ipcMain.on("winLog", (event, ...args) => {send("log", ...args)});
	ipcMain.on("winAlert", (event, ...args) => {send("alert", ...args)});

	// mod states
	ipcMain.on("failedmod", (event, modname) => {send("failedmod", modname)});
	ipcMain.on("removedmod", (event, modname) => {send("removedmod", modname)});
	ipcMain.on("guigetmods", (event, ...args) => {send("mods", utils.mods.list())});
	ipcMain.on("installedmod", (event, modname) => {send("installedmod", modname)});

	// install calls
	ipcMain.on("installfrompath", (event, path) => {utils.mods.install(path)});
	ipcMain.on("installfromurl", (event, url) => {utils.mods.installFromURL(url)});

	win.webContents.on("dom-ready", () => {
		send("mods", utils.mods.list());
	});

	// ensures gamepath still exists and is valid on startup
	let gamepathlost = false;
	ipcMain.on("gamepathlost", (event, ...args) => {
		if (! gamepathlost) {
			gamepathlost = true;
			send("gamepathlost");
		}
	});

	ipcMain.on("savesettings", (event, obj) => {utils.saveSettings(obj)});

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
			utils.updatevp(false)
		}
	} else {
		utils.handleNorthstarUpdating();
	}

	autoUpdater.on("update-downloaded", () => {
		send("updateavailable");
	});

	// updates and restarts Viper, if user says yes to do so.
	// otherwise it'll do it on the next start up.
	ipcMain.on("updatenow", () => {
		autoUpdater.quitAndInstall();
	})
}

// General events used to handle utils.js stuff without requiring the
// module inside the file that sent the event. {
ipcMain.on("installmod", () => {
	if (cli.hasArgs()) {
		utils.mods.install(cli.param("installmod"));
	} else {
		dialog.showOpenDialog({properties: ["openFile"]}).then(res => {
			if (res.filePaths.length != 0) {
				utils.mods.install(res.filePaths[0]);
			} else {
				send("setbuttons", true);
			}
		}).catch(err => {error(err)});
	}
})

ipcMain.on("removemod", (event, mod) => {utils.mods.remove(mod)});
ipcMain.on("togglemod", (event, mod) => {utils.mods.toggle(mod)});

ipcMain.on("launch", () => {utils.launch()});
ipcMain.on("launchVanilla", () => {utils.launch("vanilla")});

ipcMain.on("setlang", (event, lang) => {utils.setlang(lang)});

ipcMain.on("update", () => {utils.update()})
ipcMain.on("setpathcli", () => {utils.setpath()});
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
ipcMain.on("getversion", () => {sendVersionsInfo()});

// prints out version info for the CLI
ipcMain.on("versioncli", () => {
	log("Viper: v" + require("../package.json").version);
	log("Northstar: " + utils.getNSVersion());
	log("Node: " + process.version);
	log("Electron: v" + process.versions.electron);
	cli.exit();
})

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

ipcMain.on("newpath", (event, newpath) => {
	if (newpath === false && !win.isVisible()) {
		win.send("nopathselected");
	} else {
		_sendVersionsInfo();
		if (!win.isVisible()) {
			win.show();
		}
	}
}); ipcMain.on("wrongpath", () => {
	win.send("wrongpath");
});

// ensures PWD/CWD is the config folder where viper.json is located
process.chdir(app.getPath("appData"));

// starts the GUI or CLI
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

// returns cached requests
ipcMain.on("get-ns-notes", async () => {
	win.send("ns-notes", await requests.getNsReleaseNotes());
});

ipcMain.on("get-vp-notes", async () => {
	win.send("vp-notes", await requests.getVpReleaseNotes());
});
