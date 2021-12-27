const fs = require("fs");
const { app, ipcMain } = require("electron");

const Emitter = require("events");
const events = new Emitter();

const cli = app.commandLine;

function hasArgs() {
	if (cli.hasSwitch("cli") ||
		cli.hasSwitch("help") ||
		cli.hasSwitch("update") ||
		cli.hasSwitch("launch") ||
		cli.hasSwitch("setpath") ||
		cli.hasSwitch("gamepath")) {
		return true;
	} else {return false}
}

function exit(code) {
	if (hasArgs()) {process.exit(code)}
}

async function init() {
	if (cli.hasSwitch("help")) {
	console.log(`options:
  --help     shows this help message
  --debug    opens the dev/debug tools

  --cli      forces the CLI to enable
  --update   updates Northstar from your set game path
  --setpath  sets your game path`)
		// In the future --setpath should be able to understand
		// relative paths, instead of just absolute ones.
		exit();
	}

	if (cli.hasSwitch("update")) {
		ipcMain.emit("update");
	}

	if (cli.hasSwitch("setpath")) {
		if (cli.getSwitchValue("setpath") != "") {
			ipcMain.emit("setpathcli", cli.getSwitchValue("setpath"));
		} else {
			console.error("error: No argumment provided for --setpath");
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
