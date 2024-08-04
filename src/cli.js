const fs = require("fs");
const { app, ipcMain } = require("electron");

const Emitter = require("events");
const events = new Emitter();

const cli = app.commandLine;
const lang = require("./lang");
const json = require("./modules/json");
console = require("./modules/console");

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
			console.error(lang("cli.gamepath.lost"));
			exit(1);
		} else {
			return true;
		}
	}
}

// General CLI initialization
//
// A lot of the CLI is handled through events sent back to the main process for
// it to handle, this is because we re-use these events for the renderer as.
async function init() {
	// --help menu/argument
	if (cli.hasSwitch("help")) {
	console.log(`options:
  --help          ${lang("cli.help.help")}
  --version       ${lang("cli.help.version")}
  --devtools      ${lang("cli.help.devtools")}

  --cli           ${lang("cli.help.cli")}
  --update        ${lang("cli.help.update")}
  --update-viper  ${lang("cli.help.update_vp")}
  --setpath       ${lang("cli.help.setpath")}
  --no-vp-updates ${lang("cli.help.no_vp_updates")}

  --installmod    ${lang("cli.help.install_mod")}
  --removemod     ${lang("cli.help.remove_mod")}
  --togglemod     ${lang("cli.help.toggle_mod")}`)
		// In the future --setpath should be able to understand
		// relative paths, instead of just absolute ones.
		exit();
	}

	// --update
	if (cli.hasSwitch("update") && gamepathExists()) {ipcMain.emit("update")}
	// --version
	if (cli.hasSwitch("version") && gamepathExists()) {
		let version = require("./modules/version");

		console.log("Viper: v" + require("../package.json").version);
		console.log("Titanfall 2: " + version.titanfall());
		console.log("Northstar: " + version.northstar());
		console.log("Node: " + process.version);
		console.log("Electron: v" + process.versions.electron);
		exit();
	}

	// --setpath
	if (cli.hasSwitch("setpath")) {
		// Checks to verify the path is legitimate
		if (cli.getSwitchValue("setpath") != "") {
			ipcMain.emit("setpathcli", cli.getSwitchValue("setpath"));
		} else {
			console.error(lang("cli.setpath.no_arg"));
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
	if (cli.hasSwitch("installmod") && gamepathExists()) {ipcMain.emit("install-mod")}
	if (cli.hasSwitch("removemod") && gamepathExists()) {ipcMain.emit("remove-mod", "", cli.getSwitchValue("removemod"))}
	if (cli.hasSwitch("togglemod") && gamepathExists()) {ipcMain.emit("toggle-mod", "", cli.getSwitchValue("togglemod"))}

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
