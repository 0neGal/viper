const ipcRenderer = require("electron").ipcRenderer;

const lang = require("../../lang");
const process = require("./process");
const launcher = require("./launcher");
const settings = require("./settings");

// frontend part of settings a new game path
ipcRenderer.on("newpath", (_, newpath) => {
	set_buttons(true);

	settings.set({gamepath: newpath});

	ipcRenderer.send("gui-getmods");
	ipcRenderer.send("save-settings", settings.data());
})

// a previously valid gamepath no longer exists, and is therefore lost
ipcRenderer.on("gamepath-lost", () => {
	launcher.change_page(0);
	set_buttons(false, true);
	alert(lang("gui.gamepath.lost"));
})

// error out when no game path is set
ipcRenderer.on("no-path-selected", () => {
	alert(lang("gui.gamepath.must"));
	process.exit();
})

// error out when game path is wrong
ipcRenderer.on("wrong-path", () => {
	alert(lang("gui.gamepath.wrong"));
	gamepath.set(false);
})

// reports to the main process about game path status.
module.exports = {
	open: () => {
		let gamepath = settings.data().gamepath;

		if (gamepath) {
			require("electron").shell.openPath(gamepath);
		} else {
			alert(lang("gui.settings.miscbuttons.open_gamepath_alert"));
		}
	},

	set: (value) => {
		ipcRenderer.send("setpath", value);
	}
}
