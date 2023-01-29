const fs = require("fs");

let problems = false;
let lang = require("../src/lang/en.json");
let maintainers = require("../src/lang/maintainers.json");

langs = fs.readdirSync("src/lang")
langs.forEach((localefile) => {
	if (localefile == "maintainers.json") {return}

	let missing = [];
	let langmaintainers = maintainers.list[localefile.replace(/\..*$/, "")];
	let locale = false;
	try {
		locale = require("../src/lang/" + localefile)
	}catch(err) {
		console.log(`\x1b[101m!! ${localefile} is not formatted right !!\x1b[0m`);
		return
	}

	for (let i in lang) {
		if (! locale[i]) {
			missing.push(i);
		}
	}

	if (missing.length > 0) {
		problems = true;

		console.error(`${localefile} is missing:`)
		for (let i in missing) {
			console.log(`\x1b[31m  ${missing[i]}\x1b[0m`)
		}

		console.log()

		console.log("Maintainers: ")
		for (let i in langmaintainers) {
			console.log(`  ${langmaintainers[i]}`)
		}

		console.log("\n")
	}
})

if (! problems) {
	console.log("\x1b[32mAll localizations are complete and formatted properly.\x1b[0m");
} else {
	process.exit(1);
}
