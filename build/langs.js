const fs = require("fs");

let lang = require("../src/lang/en.json");
let maintainers = require("../src/lang/maintainers.json");

langs = fs.readdirSync("src/lang")
langs.forEach((localefile) => {
	if (localefile == "maintainers.json") {return}

	let missing = [];
	let langmaintainers = maintainers.list[localefile.replace(/\..*$/, "")];
	let locale = require("../src/lang/" + localefile)
	for (let i in lang) {
		if (! locale[i]) {
			missing.push(i);
		}
	}

	if (missing.length > 0) {
		console.error(`${localefile} is missing:`)
		for (let i in missing) {
			console.log(`  ${missing[i]}`)
		}

		console.log()

		console.log("Maintainers of language: ")
		for (let i in langmaintainers) {
			console.log(`  ${langmaintainers[i]}`)
		}
	}
})
