const fs = require("fs");

let lang = require("../src/lang/en.json");

langs = fs.readdirSync("src/lang")
langs.forEach((localefile) => {
	let missing = [];
	let locale = require("../src/lang/" + localefile)
	for (let i in lang) {
		if (! locale[i]) {
			missing.push(i);
		}
	}

	if (missing.length > 0) {
		console.error(`${localefile} is missing: ${missing}`)
	}
})
