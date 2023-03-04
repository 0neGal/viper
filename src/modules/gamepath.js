const path = require("path");
const fs = require("fs-extra");

const { dialog, ipcMain } = require("electron");

const cli = require("../cli");

const settings = require("./settings");

let gamepath = {};

// Returns true/false depending on if the gamepath currently exists/is
// mounted, used to avoid issues...
gamepath.exists = () => {
	return fs.existsSync(settings.gamepath);
}

// Requests to set the game path
//
// If running with CLI it takes in the --setpath argument otherwise it
// open the systems file browser for the user to select a path.
gamepath.set = async (win, forcedialog) => {
	function set_gamepath(folder) {
		settings.gamepath = folder;
		settings.zip = path.join(settings.gamepath + "/northstar.zip");
		settings.save();
		win.webContents.send("newpath", settings.gamepath);
		ipcMain.emit("newpath", null, settings.gamepath);

		modpath = path.join(settings.gamepath, "R2Northstar/mods");
	}

	if (! win) { // CLI
		set_gamepath(cli.param("setpath"));
	} else { // GUI
		if (! forcedialog) {
			function set_gamepath(folder, forcedialog) {
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

			win.alert(lang("general.missingpath"));
		}

		// Fallback to manual selection
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

// periodically check for the gamepath still existing
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
