const fs = require("fs");
const { app, ipcMain } = require("electron");

const Emitter = require("events");
const events = new Emitter();

const cli = app.commandLine;
const lang = require("./lang");
const json = require("./modules/json");

function hasArgs() {
	// Makes sure the GUI isn't launched.
	// TODO: Perhaps we should get a better way of doing this, at the
	// very least we should use a switch case here.
	if (cli.hasSwitch("cli") ||
		cli.hasSwitch("help") ||
		cli.hasSwitch("mods") ||
		cli.hasSwitch("update") ||
		cli.hasSwitch("launch") ||
		cli.hasSwitch("setpath") ||
		cli.hasSwitch("version") ||
		cli.hasSwitch("gamepath") ||
		cli.hasSwitch("togglemod") ||
		cli.hasSwitch("removemod") ||
		cli.hasSwitch("installmod") ||
		cli.hasSwitch("update-viper")) {
		return true;
	} else {return false}
}

// Exits the CLI, when run without CLI being on it'll do nothing, this
// is needed as without even if no code is executed it'll continue to
// run as Electron is still technically running.
function exit(code) {
	if (hasArgs()) {process.exit(code)}
}

// Ensures the gamepath exists, it's called by options that require the
// gamepath to be able to work.
function gamepathExists() {
	if (fs.existsSync("viper.json")) {
		gamepath = json("viper.json").gamepath;

		if (! fs.existsSync(gamepath)) {
			console.error(`error: ${lang("cli.gamepath.lost")}`);
			exit(1);
		} else {
			return true;
		}
	}
}

// General CLI initialization
//
// A lot of the CLI is handled through events sent back to the main
// process or utils.js to handle, this is because we re-use these events
// for the renderer as well.
async function init() {
	// --help menu/argument
	if (cli.hasSwitch("help")) {
	console.log(`options:
  --help          ${lang("cli.help.help")}
  --version       ${lang("cli.help.version")}
  --devtools      ${lang("cli.help.devtools")}

  --cli           ${lang("cli.help.cli")}
  --update        ${lang("cli.help.update")}
  --update-viper  ${lang("cli.help.updatevp")}
  --setpath       ${lang("cli.help.setpath")}
  --no-vp-updates ${lang("cli.help.novpupdates")}

  --installmod    ${lang("cli.help.installmod")}
  --removemod     ${lang("cli.help.removemod")}
  --togglemod     ${lang("cli.help.togglemod")}`)
		// In the future --setpath should be able to understand
		// relative paths, instead of just absolute ones.
		exit();
	}

	// --update
	if (cli.hasSwitch("update") && gamepathExists()) {ipcMain.emit("update")}
	// --version
	if (cli.hasSwitch("version") && gamepathExists()) {ipcMain.emit("version-cli")}

	// --setpath
	if (cli.hasSwitch("setpath")) {
		// Checks to verify the path is legitimate
		if (cli.getSwitchValue("setpath") != "") {
			ipcMain.emit("setpathcli", cli.getSwitchValue("setpath"));
		} else {
			console.error(`error: ${lang("cli.setpath.noarg")}`);
			exit(1);
		}
	}

	// --launch
	if (gamepathExists() && cli.hasSwitch("launch")) {
		switch(cli.getSwitchValue("launch")) {
			case "vanilla":
				ipcMain.emit("launchVanilla");
				break;
			default:
				ipcMain.emit("launch");
				break;
		}
	}

	// Mod related args, --installmod, --removemod, --togglemod
	if (cli.hasSwitch("installmod") && gamepathExists()) {ipcMain.emit("installmod")}
	if (cli.hasSwitch("removemod") && gamepathExists()) {ipcMain.emit("removemod", "", cli.getSwitchValue("removemod"))}
	if (cli.hasSwitch("togglemod") && gamepathExists()) {ipcMain.emit("togglemod", "", cli.getSwitchValue("togglemod"))}

	// Prints out the list of mods
	if (cli.hasSwitch("mods") && gamepathExists()) {ipcMain.emit("getmods")}
}

module.exports = {
	hasArgs,
	init, exit, 
	hasParam: (arg) => {
		return cli.hasSwitch(arg);
	},
	param: (arg) => {
		return cli.getSwitchValue(arg);
	}
}
