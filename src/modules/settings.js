const fs = require("fs");
const path = require("path");
const { app, ipcMain } = require("electron");

const json = require("./json");
const lang = require("../lang");

console = require("./console");

var invalid_settings = false;

// base settings
var settings = {
	gamepath: "",
	lang: "en-US",
	nsupdate: true,
	autolang: true,
	forcedlang: "en",
	autoupdate: true,
	originkill: false,
	nsargs: "-multiple",
	zip: "/northstar.zip",

	// these files won't be overwritten when installing/updating
	// Northstar, useful for config files
	excludes: [
		"ns_startup_args.txt",
		"ns_startup_args_dedi.txt"
	]
}

// creates the settings file with the base settings if it doesn't exist.
if (fs.existsSync("viper.json")) {
	let conf = json("viper.json");

	// validates viper.json
	if (! conf) {
		invalid_settings = true;
	}

	settings = {
		...settings, ...conf
	}

	settings.zip = path.join(app.getPath("cache"), "vipertmp/northstar.zip");

	let args = path.join(settings.gamepath, "ns_startup_args.txt");
	if (! settings.nsargs && fs.existsSync(args)) {
		settings.nsargs = fs.readFileSync(args, "utf8");
	}
} else {
	console.error(lang("general.missing_path"));
}

// as to not have to do the same one liner a million times, this
// function exists, as the name suggests, it simply writes the current
// settings to the disk.
//
// you can also pass a settings object to the function and it'll try and
// merge it together with the already existing settings
settings.save = (obj = {}, notify_renderer = true) => {
	// refuse to save if settings aren't valid
	if (invalid_settings) {
		settings = {};
	}

	let settings_content = {
		...settings, ...obj
	}

	delete settings_content.save;

	let stringified_settings = JSON.stringify({
		...settings, ...obj
	})

	let settings_file = app.getPath("appData") + "/viper.json";

	// write the settings file
	fs.writeFileSync(settings_file, stringified_settings);

	// set the settings obj for the main process
	settings = settings_content;
	
	if (notify_renderer) {
		ipcMain.emit("saved-settings", settings_content);
	}
}

module.exports = settings;
