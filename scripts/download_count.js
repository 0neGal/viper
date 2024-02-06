const https = require("https");
const args = require("minimist")(process.argv.slice(2), {
	boolean: [
		"help",
		"total",
		"releases",
		"sort-releases",
		"total-platforms",
		"include-prereleases"
	],

	default: {
		"help": false,
		"total": true,
		"releases": true,
		"sort-releases": false,
		"total-platforms": true,
		"include-prereleases": false
	}
})

// help message
if (args["help"]) {
	console.log(`options:
  --help                  shows this help message
  --no-total              dont show total downloads
  --no-releases           dont show individual releases
  --sort-releases         sorts releases by download count
  --no-total-platforms    hides individual total platform downloads 
  --include-prereleases   includes prereleases when listing out
                          individual releases
	`.trim()) // the trim removes the last blank newline

	process.exit(0);
}

// when parsing releases, these will be filled
let releases = {};
let total = {
	all: 0,
	linux: 0,
	windows: 0
}

// calculates what percentage `value` is of `total`
let percent = (total, value) => {
	return (value / total * 100).toFixed(2) + "%";
}

// parses a release object from the GitHub API, and then it changes
// `releases` and `total` accordingly
let parse_release = (release) => {
	if (release.prerelease && ! args["include-prereleases"]) {
		return;
	}

	let name = release.name;
	let assets = release.assets;

	// run through downloadable files from release
	for (let i = 0; i < assets.length; i++) {
		// dont count blockmaps
		if (assets[i].name.match("blockmap")) {
			continue;
		}

		switch(assets[i].name) {
			// dont count these files
			case "latest.yml":
			case "latest-linux.yml":
				continue;

			default:
				let platform;
				let downloads = assets[i].download_count;

				// assume platform is Windows if filename ends with
				// `.exe`, and Linux if not
				if (assets[i].name.endsWith(".exe")) {
					platform = "windows";
				} else {
					platform = "linux";
				}

				// create new object for this release in `releases` if
				// it doesn't already have one
				if (! releases[name]) {
					releases[name] = {
						all: 0,
						linux: 0,
						windows: 0
					}
				}

				// add total download counts
				total.all += downloads;
				releases[name].all += downloads;

				// add platform specific download counts
				total[platform] += downloads;
				releases[name][platform] += downloads;
		}
	}
}

// pads out `str` until it's `length` long
let pad = (str, length) => {
	str = String(str);

	while (str.length < length) {
		str += " ";
	}

	return str;
}

// takes in `obj` and prints out a table based on it, each key in the
// objects inside `obj` will be used as a column, and it'll attempt to
// pad them so it the output looks properly "columnized"
let print_table = (obj) => {
	// keep track of the longest value of a key
	let max_lengths = {};

	// run through all the keys
	for (let i in obj) {
		for (let ii in obj[i]) {
			// get length of current key
			let length = String(obj[i][ii]).length;

			// if the currently longest value for this type of key is
			// smaller than `length`, then we make `length` the newest
			// longest value for this type of key, the same happens if
			// there's not been a registered longest key for this type
			// of key yet
			if (max_lengths[ii] < length || ! max_lengths[ii]) {
				max_lengths[ii] = length;
			}
		}
	}

	// run through object again
	for (let i in obj) {
		// we'll add to this, then print it later
		let line_str = "";

		// run through keys
		for (let ii in obj[i]) {
			// add value to `line_str` padding it to the longest found
			// value for this type of key and adding 5 for some margin
			line_str += pad(obj[i][ii], max_lengths[ii] + 5);
		}

		// print the line of this table out
		console.log(line_str);
	}
}

let parse_json = (json) => {
	// parse `json`
	json = JSON.parse(json);

	// run through releases and parse them
	for (let i = 0; i < json.length; i++) {
		parse_release(json[i]);
	}

	// should we should print the individual release stats?
	if (args["releases"]) {
		// should we sort the releases?
		if (args["sort-releases"]) {
			// the finalized and sorted `releases` will go here
			let sorted = {};

			// sort `releases` using the `.all` property
			releases = Object.keys(releases).sort((a, b) => {
				return releases[b].all - releases[a].all;
			}).forEach((key) => {
				sorted[key] = releases[key];
			})

			// set `releases` to now be the sorted version
			releases = sorted;
		}

		// initialize `table` with a header
		let table = [{
			version: "VERSION",
			total:   "TOTAL",
			windows: "WINDOWS",
			linux:   "LINUX"
		}]

		// runs through `releases` adding the various lines of the table
		// to `table`, essentially converting it to something we can use
		// `print_table()` on and nothing else
		for (let i in releases) {
			table.push({
				version: i,

				total: releases[i].all,

				windows: releases[i].windows + " (" + percent(
					releases[i].all, releases[i].windows
				) + ")",

				linux: releases[i].linux + " (" + percent(
					releases[i].all, releases[i].linux
				) + ")"
			})
		}

		// print the finalized table
		print_table(table);
	}

	// if we dont want to print the total downloads, then we just exit
	if (! args["total"]) {
		process.exit(0);
	}

	// if we've already printed the list of releases, we add an extra
	// space between this and the total
	if (args["releases"]) {
		console.log();
	}

	// print out the total
	console.log("Total downloads: " + total.all);

	// if we shouldn't print the platform distribution, then these empty
	// strings will be used instead
	let linux_percent = "";
	let windows_percent = "";

	// get the percent of platform distribution
	if (args["total-platforms"]) {
		let linux_percent =
			"(" + percent(total.all, total.linux) + ")";

		let windows_percent =
			"(" + percent(total.all, total.windows) + ")";
	}

	// print Windows platform distribution
	console.log(
		"        Windows: " +
		total.windows, windows_percent
	)

	// print Linux platform distribution
	console.log(
		"          Linux: " +
		total.linux, linux_percent
	)
}

let link = "/repos/0neGal/viper/releases";

// request info about releases via GitHub's API
https.get({
	host: "api.github.com",
	port: 443,
	path: link,
	method: "GET",
	headers: { "User-Agent": "viper" }
}, (res) => {
	res.setEncoding("utf8");
	let res_data = "";

	res.on("data", data => {
		res_data += data;
	})

	// we got the data, now lets parse it!
	res.on("end", () => {
		parse_json(res_data);
	})
})
