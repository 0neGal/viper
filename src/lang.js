const fs = require("fs");

const enLang = JSON.parse(fs.readFileSync(__dirname + `/lang/en.json`, "utf8"));
let lang = "";
var langObj = {};


function _loadTranslation(forcedlang) {
	if (fs.existsSync("viper.json")) {
		// Validate viper.json
		let opts = {
			lang: "en",
			autolang: true,
		}

		try {
			opts = JSON.parse(fs.readFileSync("viper.json", "utf8"));
		}catch (e) {}

		lang = opts.lang;

		if (! lang) {lang = "en"}

		if (forcedlang) {lang = forcedlang}

		if (opts.autolang == false) {
			lang = opts.forcedlang;
			if (! lang) {lang = "en"}
		}

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


module.exports = (string, forcedlang) => {
	if (lang === "") {
		_loadTranslation();
	}
	 
	if (forcedlang) {
		_loadTranslation(forcedlang);
	}

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
