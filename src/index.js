const path = require("path");
const { app, BrowserWindow } = require("electron");

// makes it so Electron cache doesn't get stored in your system's config
// folder, and instead changing it over to using the system's cache
// folder instead
app.setPath("userData", path.join(app.getPath("cache"), app.name));

// ensures PWD/CWD is the config folder where viper.json is located
process.chdir(app.getPath("appData"));

const cli = require("./cli");

const mods = require("./modules/mods");
const update = require("./modules/update");
const version = require("./modules/version");
const settings = require("./modules/settings");
const protocol = require("./modules/protocol");

// loads `ipcMain` events that dont fit in any of the modules directly
require("./modules/ipc");

// required to load launch IPC events
require("./modules/launch");

console = require("./modules/console");

// Starts the actual BrowserWindow, which is only run when using the
// GUI, for the CLI this function is never called.
function start() {
	let win = new BrowserWindow({
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
			contextIsolation: false
		}
	})

	// makes sending things to the renderer a little more readable
	win.send = (channel, data) => {
		win.webContents.send(channel, data);
	}; send = win.send;

	// give `./win` the main window, `./win()` will then be equal
	// to `win`, but its accessible anywhere
	require("./win").set(win);

	// when --devtools is added it'll open the dev tools
	if (cli.hasParam("devtools")) {
		// for some unknown, mysterious reason, the devtools just wont
		// open if you call this immediately, that's how its worked for
		// a very long time, and suddenly it stopped working, and this
		// seemingly was the only fix
		setTimeout(() => {
			win.openDevTools();
		}, 1)
	}

	// we dont need this!
	win.removeMenu();

	// load `src/app/index.html` (the app)
	win.loadURL("file://" + __dirname + "/app/index.html", {
		userAgent: "viper/" + version.viper(),
	})

	// print exceptions to terminal, and forward the exception to the
	// renderer, it'll then show a more user friendly error message
	process.on("uncaughtException", (err) => {
		send("unknown-error", err);
		console.error(err);
	})

	// load list of mods on initial load
	win.webContents.on("dom-ready", () => {
		protocol();
		send("mods", mods.list());
	})

	// start auto-update process
	if (settings().autoupdate) {
		if (cli.hasParam("no-vp-updates")) {
			update.northstar_autoupdate();
		} else {
			update.viper(false);
		}
	} else {
		update.northstar_autoupdate();
	}
}


// starts the GUI or CLI
if (cli.hasArgs()) {
	if (cli.hasParam("update-viper")) {
		update.viper(true);
	} else {
		// start the CLI
		cli.init();
	}
} else {
	app.setAsDefaultProtocolClient("ror2mm");

	// start the window/GUI
	app.on("ready", () => {
		start();
	})
}
