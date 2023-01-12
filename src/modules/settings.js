const fs = require("fs");
const path = require("path");
const app = require("electron").app;

const lang = require("../lang");

var invalid_settings = false;

// Base settings
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

	// These files won't be overwritten when installing/updating
	// Northstar, useful for config files
	excludes: [
		"ns_startup_args.txt",
		"ns_startup_args_dedi.txt"
	]
}

// Creates the settings file with the base settings if it doesn't exist.
if (fs.existsSync("viper.json")) {
	let conf = fs.readFileSync("viper.json", "utf8");
	let json = "{}";

	// Validates viper.json
	try {
		json = JSON.parse(conf);
	}catch (e) {
		invalid_settings = true;
	}

	settings = {...settings, ...json};
	settings.zip = path.join(settings.gamepath + "/northstar.zip");

	let args = path.join(settings.gamepath, "ns_startup_args.txt");
	if (fs.existsSync(args)) {
		settings.nsargs = fs.readFileSync(args, "utf8");
	}
} else {
	console.log(lang("general.missingpath"));
}

// As to not have to do the same one liner a million times, this
// function exists, as the name suggests, it simply writes the current
// settings to the disk.
//
// You can also pass a settings object to the function and it'll try and
// merge it together with the already existing settings
settings.save = (obj = {}) => {
	if (invalid_settings) {return false}

	let settings_content = {...settings, ...obj};

	delete settings_content.save;

	if (fs.existsSync(settings.gamepath)) {
		fs.writeFileSync(path.join(settings.gamepath, "ns_startup_args.txt"), settings.nsargs);
	}

	fs.writeFileSync(app.getPath("appData") + "/viper.json", JSON.stringify({...settings, ...obj}));
}

module.exports = settings;
