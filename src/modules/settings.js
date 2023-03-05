const fs = require("fs");
const path = require("path");
const app = require("electron").app;

const json = require("./json");
const lang = require("../lang");

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

	settings.zip = path.join(settings.gamepath + "/northstar.zip");

	let args = path.join(settings.gamepath, "ns_startup_args.txt");
	if (fs.existsSync(args)) {
		settings.nsargs = fs.readFileSync(args, "utf8");
	}
} else {
	console.log(lang("general.missingpath"));
}

// as to not have to do the same one liner a million times, this
// function exists, as the name suggests, it simply writes the current
// settings to the disk.
//
// you can also pass a settings object to the function and it'll try and
// merge it together with the already existing settings
settings.save = (obj = {}) => {
	// refuse to save if settings aren't valid
	if (invalid_settings) {
		return false;
	}

	let settings_content = {
		...settings, ...obj
	}

	delete settings_content.save;

	// write Northstar's startup argument file
	if (fs.existsSync(settings.gamepath)) {
		fs.writeFileSync(path.join(settings.gamepath, "ns_startup_args.txt"), settings.nsargs);
	}

	let stringified_settings = JSON.stringify({
		...settings, ...obj
	})

	let settings_file = app.getPath("appData") + "/viper.json";

	// write the settings file
	fs.writeFileSync(settings_file, stringified_settings);
}

module.exports = settings;
