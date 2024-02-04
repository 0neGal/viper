const fs = require("fs");
const path = require("path");
const { app, ipcMain } = require("electron");

const json = require("./json");
const lang = require("../lang");
const win = require("./window");

console = require("./console");

var invalid_settings = false;

ipcMain.on("save-settings", (event, obj) => {
	save(obj, false);
})

ipcMain.on("reset-config", async () => {
	let confirmation = await win.confirm(
		lang("gui.settings.miscbuttons.reset_config_alert")
	)

	if (confirmation) {
		fs.rmSync("viper.json");

		app.relaunch({
			args: process.argv.slice(1)
		})

		app.exit(0);
	}
})

ipcMain.on("setlang", (event, lang) => {
	set("lang", lang);
	save();
})

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
let save = (obj = {}, notify_renderer = true) => {
	// refuse to save if settings aren't valid
	if (invalid_settings) {
		settings = {};
	}

	let settings_content = {
		...settings, ...obj
	}

	let stringified_settings = JSON.stringify({
		...settings, ...obj
	})

	let settings_file = app.getPath("appData") + "/viper.json";

	// write the settings file
	fs.writeFileSync(settings_file, stringified_settings);

	// set the settings obj for the main process
	settings = settings_content;
	
	if (notify_renderer) {
		send("changed-settings", obj);
	}
}

// sets `key` in `settings` to `value`
let set = (key, value) => {
	settings[key] = value;
}

// returns up-to-date `settings`, along with `set()` and `save()`
let export_func = () => {
	return {
		...settings,

		set,
		save
	}
}

// add properties from `settings` to `export_func`, this is just for
// backwards compatibility, and they really shouldn't be relied on,
// this'll likely be removed at some point
for (let i in settings) {
	export_func[i] = settings[i];
}

module.exports = export_func;
