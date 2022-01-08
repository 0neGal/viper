const fs = require("fs");
const { app, ipcMain } = require("electron");

const Emitter = require("events");
const events = new Emitter();

const cli = app.commandLine;
const lang = require("./lang");

function hasArgs() {
	if (cli.hasSwitch("cli") ||
		cli.hasSwitch("help") ||
		cli.hasSwitch("mods") ||
		cli.hasSwitch("update") ||
		cli.hasSwitch("launch") ||
		cli.hasSwitch("setpath") ||
		cli.hasSwitch("version") ||
		cli.hasSwitch("updatevp") ||
		cli.hasSwitch("gamepath") ||
		cli.hasSwitch("togglemod") ||
		cli.hasSwitch("removemod") ||
		cli.hasSwitch("installmod")) {
		return true;
	} else {return false}
}

function exit(code) {
	if (hasArgs()) {process.exit(code)}
}

async function init() {
	if (cli.hasSwitch("help")) {
	console.log(`options:
  --help       ${lang("cli.help.help")}
  --debug      ${lang("cli.help.debug")}
  --version    ${lang("cli.help.version")}

  --cli        ${lang("cli.help.cli")}
  --update     ${lang("cli.help.update")}
  --updatevp   ${lang("cli.help.updatevp")}
  --setpath    ${lang("cli.help.setpath")}

  --installmod ${lang("cli.help.installmod")}
  --removemod  ${lang("cli.help.removemod")}
  --togglemod  ${lang("cli.help.togglemod")}`)
		// In the future --setpath should be able to understand
		// relative paths, instead of just absolute ones.
		exit();
	}

	if (cli.hasSwitch("update")) {ipcMain.emit("update")}
	if (cli.hasSwitch("version")) {ipcMain.emit("versioncli")}

	if (cli.hasSwitch("setpath")) {
		if (cli.getSwitchValue("setpath") != "") {
			ipcMain.emit("setpathcli", cli.getSwitchValue("setpath"));
		} else {
			console.error(`error: ${lang("cli.setpath.noarg")}`);
			exit(1);
		}
	}

	if (cli.hasSwitch("launch")) {
		switch(cli.getSwitchValue("launch")) {
			case "vanilla":
				ipcMain.emit("launchVanilla");
				break;
			default:
				ipcMain.emit("launch");
				break;
		}
	}

	if (cli.hasSwitch("installmod")) {ipcMain.emit("installmod")}
	if (cli.hasSwitch("removemod")) {ipcMain.emit("removemod", "", cli.getSwitchValue("removemod"))}
	if (cli.hasSwitch("togglemod")) {ipcMain.emit("togglemod", "", cli.getSwitchValue("togglemod"))}

	if (cli.hasSwitch("mods")) {ipcMain.emit("getmods")}
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
