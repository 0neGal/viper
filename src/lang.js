const fs = require("fs");

const enLang = JSON.parse(fs.readFileSync(__dirname + `/lang/en.json`, "utf8"));
let lang = "";
var langObj = {};


function _loadTranslation() {
	if (fs.existsSync("viper.json")) {
		lang = JSON.parse(fs.readFileSync("viper.json", "utf8")).lang;
		if (! lang) {lang = "en"}
		if (! fs.existsSync(__dirname + `/lang/${lang}.json`)) {
			if (fs.existsSync(__dirname + `/lang/${lang.replace(/-.*$/, "")}.json`)) {
				lang = lang.replace(/-.*$/, "");
			} else {
				lang = "en";
			}
		}
	} else {
		lang = "en";
	}
	langObj = JSON.parse(fs.readFileSync(__dirname + `/lang/${lang}.json`, "utf8"));
}


module.exports = (string) => {
	if (lang === "")
		_loadTranslation();

	if (langObj[string]) {
		return langObj[string];
	} else {
		if (enLang[string]) {
			return enLang[string];
		} else {
			// If it's not in the default lang either, it returns the
			// string, this is absolute fallback.
			return string;
		}
	}
}
