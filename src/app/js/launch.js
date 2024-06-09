const update = require("./update");

// tells the main process to launch `game_version`
module.exports = (game_version) => {
	if (game_version == "vanilla") {
		ipcRenderer.send("launch", game_version);
		return;
	}

	if (update.ns.should_install) {
		update.ns();
	} else {
		ipcRenderer.send("launch", game_version);
	}
}
