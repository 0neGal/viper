const fs = require("fs");

var lang = "en-US";
if (fs.existsSync("viper.json")) {
	lang = JSON.parse(fs.readFileSync("viper.json", "utf8")).lang;
	if (! fs.existsSync(__dirname + `/lang/${lang}.json`)) {
		lang = "en-US";
	}
}

var langObj = JSON.parse(fs.readFileSync(__dirname + `/lang/${lang}.json`, "utf8"));

module.exports = (string) => {
	if (langObj[string]) {
		return langObj[string];
	} else {
		return string
	}
}
