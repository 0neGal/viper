const fs = require("fs");

var lang = "en"; // Default language

// Loads fallback/default language strings
var langDef = JSON.parse(fs.readFileSync(__dirname + `/lang/en.json`, "utf8"));

// If settins are set it'll try to set the language to that instead of
// the default, however if it can't find it, it'll still fallback to the
// default language. This might happen as the default language is
// retrieved from the renderer's navigator.language, which may have
// languages we don't support yet.
if (fs.existsSync("viper.json")) {
	lang = JSON.parse(fs.readFileSync("viper.json", "utf8")).lang;
	if (! lang) {lang = "en"} // Uses fallback, if language isn't set
	if (! fs.existsSync(__dirname + `/lang/${lang}.json`)) {
		if (fs.existsSync(__dirname + `/lang/${lang.replace(/-.*$/, "")}.json`)) {
			lang = lang.replace(/-.*$/, "");
		} else {
			lang = "en"; // Uses fallback if language doesn't exist
		}
	}
}

var langObj = JSON.parse(fs.readFileSync(__dirname + `/lang/${lang}.json`, "utf8"));

module.exports = (string) => {
	if (langObj[string]) { // Returns string from language
		return langObj[string];
	} else { // If string doesn't exist
		if (langDef[string]) { // Retrieves from default lang instead
			return langDef[string];
		} else {
			// If it's not in the default lang either, it returns the
			// string, this is absolute fallback.
			return string;
		}
	}
}
