const exec = require("child_process").exec;
const ipcMain = require("electron").ipcMain;

const cli = require("../cli");
const win = require("../win");
const lang = require("../lang");

const settings = require("./settings");

console = require("./console");

ipcMain.on("launch", (_, game_version) => {
	launch(game_version)
})

// launches the game
//
// either Northstar or Vanilla. Linux support is not currently a thing,
// however it'll be added at some point.
function launch(game_version) {
	// return early, and show error message if on Linux
	if (process.platform == "linux") {
		win().alert(lang("cli.launch.linux_error"));
		console.error(lang("cli.launch.linux_error"));
		cli.exit(1);
		return;
	}

	// change current directory to gamepath
	process.chdir(settings().gamepath);

	let launch_args = settings().nsargs || "";

	// launch the requested game version
	switch(game_version) {
		case "vanilla":
			console.info(lang("general.launching"), "Vanilla...");
			exec("Titanfall2.exe " + launch_args, {
				cwd: settings().gamepath
			})

			break;
		default:
			console.info(lang("general.launching"), "Northstar...");
			exec("NorthstarLauncher.exe " + launch_args, {
				cwd: settings().gamepath
			})

			break;
	}
}

module.exports = launch;
