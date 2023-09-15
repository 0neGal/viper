const fs = require("fs");

const json = require("./modules/json");

const enLang = json(__dirname + "/lang/en.json");
let lang = "";
var langObj = {};

function flatten_obj(data) {
	var obj = {};

	for (let i in data) {
		if (! data.hasOwnProperty(i)) {
			continue;
		}

		if (typeof data[i] == "object" && data[i] !== null) {
			var flattened = flatten_obj(data[i]);
			for (var ii in flattened) {
				if (! flattened.hasOwnProperty(ii)) {
					continue;
				}

				obj[i + "." + ii] = flattened[ii];
			}
		} else {
			obj[i] = data[i];
		}
	}

	return obj;
}

function _loadTranslation(forcedlang) {
	if (fs.existsSync("viper.json")) {
		// Validate viper.json
		let opts = {
			lang: "en",
			autolang: true,
		}

		try {
			opts = json("viper.json");
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

	langObj = flatten_obj(json(__dirname + `/lang/${lang}.json`) || {});
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
