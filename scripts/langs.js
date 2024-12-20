const fs = require("fs");
const dialog = require("enquirer");
const flat = require("flattenizer");
const args = require("minimist")(process.argv.slice(2), {
	boolean: [
		"help",
		"check",
		"format",
		"localize"
	],

	default: {
		"help": false,
		"check": false,
		"format": false,
		"localize": false
	}
})

console = require("../src/modules/console");

// help message
if (args["help"]) {
	console.log(`options:
  --help                  shows this help message
  --check                 checks for incorrectly formatted lang files
                          and missing localizations
  --format                formats all lang files correctly if the files
                          can be read and parsed
  --localize              allows you add missing incorrectly
                          localizations, and edit old ones
	`.trim()) // the trim removes the last blank newline

	process.exit(0);
}

// move into `scripts` folder, makes sure all file system requests work
// identically to `require()`
process.chdir(__dirname);

// get list of files in `src/lang/`, except for `maintainers.json` these
// should all be language files
let langs = fs.readdirSync("../src/lang");

// get the English language file and flatten it
let lang = flat.flatten(require("../src/lang/en.json"));

// formats all files automatically, nothing too fancy, it ignores
// `en.json` however, as its manually edited.
let format = (logging = true) => {
	// run through langs
	langs.forEach((locale_file) => {
		// ignore these files
		if (locale_file == "en.json"
			|| locale_file == "maintainers.json") {
			return;
		}

		// path to lang file
		let file_path = "../src/lang/" + locale_file;

		try {
			// attempt read, parse and flatten `file_path`
			let json = flat.flatten(
				JSON.parse(fs.readFileSync(file_path))
			)

			// sort `json`
			json = Object.fromEntries(
				Object.entries(json).sort()
			)

			// delete keys that are only found in `locale_file` but not
			// in the English localization file, if something doesn't
			// exist in the English localization file, then it shouldn't
			// exist at all!
			for (let i in json) {
				if (! lang[i]) {
					delete json[i];
				}
			}

			json = flat.unflatten(json);

			// attempt to stringify earlier JSON, with default
			// formatting, directly into `file_path`
			fs.writeFileSync(
				file_path, JSON.stringify(json, null, "\t")
			)
		}catch(err) {
			// something went wrong!
			console.error("Couldn't format: " + locale_file);
		}
	})

	console.ok("Formatted all localization files.");
}

// starts up a prompt interface to edit localization strings, letting
// you both add missing ones, and change old ones
let localize = async () => {
	// check if there's any missing keys
	let problems = check(false);

	// this'll have the `choices` for language picking prompt
	let lang_list = [];

	// run through langs
	langs.forEach((locale_file) => {
		// ignore these files
		if (locale_file == "en.json"
			|| locale_file == "maintainers.json") {
			return;
		}

		// default value
		let lang_name = locale_file;

		// are we missing any keys? if so, add a "(missing)" label at
		// the end of the language name
		let missing = (problems[lang_name] && problems[lang_name].length);
		if (missing) {
			lang_name += ` (missing: ${missing})`;
		}

		// add to list of langs
		lang_list.push(lang_name);
	})

	// prompt for which lang to edit
	let picked_lang = await new dialog.AutoComplete({
		choices: lang_list,
		message: "Pick a language to edit:",
	}).run()

	// remove extra labels after the lang file name itself
	picked_lang = picked_lang.replace(/ \(.*/, "");

	// this'll contain the languages flattened contents
	let lang_keys;

	try {
		// attempt to read, parse and flatten the language file
		lang_keys = flat.flatten(require("../src/lang/" + picked_lang));
	}catch (err) {
		// something went wrong!
		console.error("Couldn't read and parse language file");
		process.exit(1);
	}

	// should we just show the keys that are missing, or everything?
	let just_missing = false;

	// get just the flattened keys of the language
	let keys = Object.keys(lang_keys);

	// are there any missing keys?
	if (problems[picked_lang].length) {
		// prompt for whether we should only show missing keys
		just_missing = await new dialog.Confirm({
			message: "Add just missing keys without editing all keys?",
		}).run()

		// if we should just show missing keys, remove all other keys,
		// if we're allowed to show other keys, then we'll at least add
		// the missing keys
		if (just_missing) {
			keys = problems[picked_lang];
		} else {
			keys = [
				...problems[picked_lang],
				...keys,
			]
		}
	}

	// add "Save changes" option
	keys = [
		"Save changes",
		...keys
	]

	// add "(missing)" label to missing keys
	for (let i = 0; i < keys.length; i++) {
		if (! just_missing && problems[picked_lang].includes(keys[i])) {
			keys[i] = keys[i] + " \x1b[91m(missing)\x1b[0m";
		}
	}

	// this'll hold the flattened edits we make
	let edited_keys = {};

	// starts the process of editing a key
	let edit_key = async () => {
		// prompt for which key to edit
		let key_to_edit = await new dialog.AutoComplete({
			limit: 15,
			choices: [...keys],
			message: "Pick a key to edit:"
		}).run()

		// if "Save changes" was picked then return all the edits we've
		// made and stop prompting for new edits
		if (key_to_edit == "Save changes") {
			return edited_keys;
		}

		// strip labels from chosen key name
		key_to_edit = key_to_edit.split(" ")[0];

		// prompt for what to set the key to
		let edited_key = await new dialog.Input({
			type: "input",
			message: `Editing: ${key_to_edit}\n` +
			"  Original string: " + lang[key_to_edit] + "\n"
		}).run()

		// add the edited key in `edited_keys`
		edited_keys[key_to_edit] = edited_key;

		// add "(edited)" to the label of this key
		for (let i = 0; i < keys.length; i++) {
			if (keys[i].split(" ")[0] == key_to_edit) {
				keys[i] = key_to_edit + " \x1b[94m(edited)\x1b[0m";
			}
		}

		// clear screen and ask for the next edit to be made
		console.clear();
		return edit_key();
	}

	// start the process of key editing, whenever the below function
	// returns with the list of edits, it also only first returns when
	// all the changes have been made and "Save changes" has been
	// selected in the menu
	let changes = await edit_key();

	console.clear();

	try {
		// merge edits and original lang file, then unflatten them
		let final_json = flat.unflatten({
			...lang_keys,
			...changes
		})

		// attempt to write `final_json` to the language file
		fs.writeFileSync(
			"../src/lang/" + picked_lang,
			JSON.stringify(final_json, null, "\t")
		)

		console.ok("Saved changes: " + picked_lang);

		// check for changes
		check(true);

		// format everything
		format(true);
	}catch(err) {
		// something went wrong!
		console.error("Failed to save changes: " + picked_lang);
	}
}

// checks whether or not language files are missing any keys, and
// whether they're even parseable.
//
// an object will be returned containing information about each file and
// which, if any, keys are missing from them
let check = (logging = true) => {
	// this'll contain the missing keys for all the files, if any
	let problems = {};

	// this'll be changed to `true` if any errors at any point arise
	let has_problems = false;

	// get list of maintainers for each language
	let maintainers = require("../src/lang/maintainers.json");

	// run through langs
	langs.forEach((locale_file) => {
		// ignore this file, it's not a language file
		if (locale_file == "maintainers.json") {return}

		// this'll contain missing keys
		let missing = [];

		// this'll contain the flattened language file contents
		let locale = false;

		// this is the list of maintainers for this language
		let lang_maintainers = maintainers.list[
			locale_file.replace(/\..*$/, "")
		]

		// attempt read, parse and flatten language file
		try {
			locale = flat.flatten(require("../src/lang/" + locale_file));
		}catch(err) {
			// we couldn't parse it!
			if (logging) {
				has_problems = true;
				console.error(`!! ${locale_file} is not formatted right !!`);
			}

			return;
		}

		// run through keys, and note ones that are missing from
		// `en.json` in this lang
		for (let i in lang) {
			if (! locale[i]) {
				missing.push(i);
			}
		}

		// add missing keys to `problems`
		problems[locale_file] = missing;

		// was there any missing keys?
		if (missing.length > 0) {
			// this is a problem
			has_problems = true;

			// do nothing if we're not supposed to log anything
			if (! logging) {
				return;
			}

			// log language file with missing keys
			console.error(`${locale_file} is missing:`);

			// log missing keys
			for (let i in missing) {
				console.error(`  ${missing[i]}`);
			}

			// spacing
			console.log();

			// log the maintainers for this language
			console.log("Maintainers: ");
			for (let i in lang_maintainers) {
				console.log(`  ${lang_maintainers[i]}`);
			}

			console.log("\n");
		}
	})

	// if no problems occurred, and we can log things, then print that
	// everything went just fine!
	if (! has_problems && logging) {
		console.ok("All localizations are complete and parseable.");
	}

	return problems;
}

// run `check()` if `--check()` is set
if (args["check"]) {
	let has_problems = false;

	// check localizations, and set `has_problems` depending on whether
	// any localization files have problems
	Object.values(check()).forEach((item) => {
		if (item.length) {
			has_problems = true;
		}
	});

	// exit with the correct exit code
	if (has_problems) {
		process.exit(1);
	} else {
		process.exit();
	}
}

// run `format()` if `--format` is set
if (args["format"]) {
	format();
}

// run `localize()` if `--localize` is set
if (args["localize"]) {
	localize();
}
