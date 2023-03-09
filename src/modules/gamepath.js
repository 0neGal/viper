const path = require("path");
const fs = require("fs-extra");

const { dialog, ipcMain } = require("electron");

const cli = require("../cli");
const lang = require("../lang");

const win_show = require("./window");
const settings = require("./settings");
const findgame = require("./findgame");


let gamepath = {};

// returns true/false depending on if the gamepath currently exists/is
// mounted, used to avoid issues...
gamepath.exists = () => {
	return fs.existsSync(settings.gamepath);
}

// requests to set the game path
//
// if running with CLI it takes in the --setpath argument otherwise it
// open the systems file browser for the user to select a path.
gamepath.set = async (win, force_dialog) => {
	// actually sets and saves the gamepath in the settings
	function set_gamepath(folder) {
		// set settings
		settings.gamepath = folder;
		settings.zip = path.join(settings.gamepath + "/northstar.zip");

		settings.save(); // save settings

		// tell the renderer the path has changed
		win.webContents.send("newpath", settings.gamepath);
		ipcMain.emit("newpath", null, settings.gamepath);
	}

	if (! win) { // CLI
		// sets the path to the --setpath argument's value
		set_gamepath(cli.param("setpath"));
	} else { // GUI
		// unless specified, we will first try to automatically find the
		// gamepath, and then later fallback to the GUI/manual selection
		if (! force_dialog) {
			function set_gamepath(folder, force_dialog) {
				settings.gamepath = folder;
				settings.zip = path.join(settings.gamepath + "/northstar.zip");
				settings.save();
				win.webContents.send("newpath", settings.gamepath);
				ipcMain.emit("newpath", null, settings.gamepath);
			}

			let gamepath = await findgame();
			if (gamepath) {
				set_gamepath(gamepath);
				return;
			}

			win_show.alert(lang("general.missingpath"));
		}

		// fallback to GUI/manual selection
		dialog.showOpenDialog({properties: ["openDirectory"]}).then(res => {
			if (res.canceled) {
				ipcMain.emit("newpath", null, false);
				return;
			}

			if (! fs.existsSync(path.join(res.filePaths[0], "Titanfall2.exe"))) {
				ipcMain.emit("wrong-path");
				return;
			}

			set_gamepath(res.filePaths[0]);

			cli.exit();
			return;
		}).catch(err => {console.error(err)})
	}
}

// periodically check for the gamepath still existing, in case the
// folder is on a disk that gets unmounted, or anything similar, we dont
// want to assume the gamepath is available forever and ever.
setInterval(() => {
	if (gamepath.exists()) {
		ipcMain.emit("gui-getmods");
	} else {
		if (fs.existsSync("viper.json")) {
			if (settings.gamepath != "") {
				ipcMain.emit("gamepath-lost");
			}
		}
	}
}, 1500)

module.exports = gamepath;
