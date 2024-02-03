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
gamepath.exists = (folder) => {
	return fs.existsSync(folder || settings().gamepath);
}

// returns false if the user doesn't have read/write permissions to the
// selected gamepath, if no gamepath is set, then this will always
// return `false`, handle that correctly!
gamepath.has_perms = (folder) => {
	if (! gamepath.exists(folder)) {
		return false;
	}

	try {
		fs.accessSync(
			folder || settings().gamepath,
			fs.constants.R_OK | fs.constants.W_OK
		)

		return true;
	} catch (err) {
		return false;
	}
}

gamepath.setting = false;

// requests to set the game path
//
// if running with CLI it takes in the --setpath argument otherwise it
// open the systems file browser for the user to select a path.
gamepath.set = async (win, force_dialog) => {
	gamepath.setting = true;

	// actually sets and saves the gamepath in the settings
	function set_gamepath(folder) {
		// set settings
		settings().set("gamepath", folder);
		settings().set("zip", path.join(
			settings().gamepath + "/northstar.zip"
		))

		settings().save(); // save settings

		// tell the renderer the path has changed
		win.webContents.send("newpath", settings().gamepath);
		ipcMain.emit("newpath", null, settings().gamepath);
	}

	if (! win) { // CLI
		// sets the path to the --setpath argument's value
		set_gamepath(cli.param("setpath"));
	} else { // GUI
		// unless specified, we will first try to automatically find the
		// gamepath, and then later fallback to the GUI/manual selection
		if (! force_dialog) {
			function set_gamepath(folder, force_dialog) {
				settings().set("gamepath", folder);
				settings().set("zip", path.join(
					settings().gamepath + "/northstar.zip")
				)

				settings().save();
				win.webContents.send("newpath", settings().gamepath);
				ipcMain.emit("newpath", null, settings().gamepath);

				gamepath.setting = false;
			}

			let found_gamepath = await findgame();

			if (found_gamepath) {
				if (! gamepath.has_perms(found_gamepath)) {
					ipcMain.emit("found-missing-perms", null, found_gamepath);
					return;
				}

				set_gamepath(found_gamepath);
				return gamepath.setting = false;
			}

			await win_show.alert(lang("general.missing_path"));
		}

		// fallback to GUI/manual selection
		dialog.showOpenDialog({properties: ["openDirectory"]}).then(res => {
			if (res.canceled) {
				ipcMain.emit("newpath", null, false);
				return gamepath.setting = false;
			}

			if (! fs.existsSync(path.join(res.filePaths[0], "Titanfall2.exe"))) {
				ipcMain.emit("wrong-path");
				return gamepath.setting = false;
			}

			if (! gamepath.has_perms(res.filePaths[0])) {
				ipcMain.emit("missing-perms", null, res.filePaths[0]);
				return gamepath.setting = false;
			}

			set_gamepath(res.filePaths[0]);

			cli.exit();
			return gamepath.setting = false;
		}).catch(err => {
			console.error(err);
			gamepath.setting = false;
		})
	}
}

// periodically check for the gamepath still existing, in case the
// folder is on a disk that gets unmounted, or anything similar, we dont
// want to assume the gamepath is available forever and ever.
setInterval(() => {
	if (gamepath.exists()) {
		if (! gamepath.has_perms()) {
			return ipcMain.emit("gamepath-lost-perms", null, settings().gamepath);
		}

		ipcMain.emit("gui-getmods");
	} else {
		if (fs.existsSync("viper.json")) {
			if (settings().gamepath != "") {
				ipcMain.emit("gamepath-lost");
			}
		}
	}
}, 1500)

module.exports = gamepath;
