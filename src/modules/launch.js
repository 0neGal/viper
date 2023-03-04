const exec = require("child_process").exec;

const cli = require("../cli");
const lang = require("../lang");

const win = require("./window");
const settings = require("./settings");

// Launches the game
//
// Either Northstar or Vanilla. Linux support is not currently a thing,
// however it'll be added at some point.
function launch(game_version) {
	if (process.platform == "linux") {
		win.alert(lang("cli.launch.linuxerror"));
		console.error("error:", lang("cli.launch.linuxerror"));
		cli.exit(1);
		return;
	}

	process.chdir(settings.gamepath);
	switch(game_version) {
		case "vanilla":
			console.log(lang("general.launching"), "Vanilla...");
			exec("Titanfall2.exe", {cwd: settings.gamepath});
			break;
		default:
			console.log(lang("general.launching"), "Northstar...");
			exec("NorthstarLauncher.exe", {cwd: settings.gamepath});
			break;
	}
}

module.exports = launch;
