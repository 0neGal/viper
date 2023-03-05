const path = require("path");
const fs = require("fs-extra");

const json = require("./json");
const settings = require("./settings");

let version = {};

// returns the current Northstar version
// if not installed it'll return "unknown"
version.northstar = () => {
	// if NorthstarLauncher.exe doesn't exist, always return "unknown"
	if (! fs.existsSync(path.join(settings.gamepath, "NorthstarLauncher.exe"))) {
		return "unknown";
	}

	// mods to check version of
	var versionFiles = [
		"Northstar.Client",
		"Northstar.Custom",
		"Northstar.CustomServers"
	]

	var versions = [];


	let add = (version) => {
		versions.push(version)
	}

	// checks version of mods
	for (let i = 0; i < versionFiles.length; i++) {
		var versionFile = path.join(settings.gamepath, "R2Northstar/mods/", versionFiles[i],"/mod.json");
		if (fs.existsSync(versionFile)) {
			if (! fs.statSync(versionFile).isFile()) {
				add("unknown");
			}

			try {
				add("v" + json(versionFile).Version);
			}catch(err) {
				add("unknown");
			}
		} else {
			add("unknown");
		}
	}

	if (versions.includes("unknown")) {return "unknown"}

	// verifies all mods have the same version number
	let mismatch = false;
	let baseVersion = versions[0];
	for (let i = 0; i < versions.length; i++) {
		if (versions[i] != baseVersion) {
			mismatch = true;
			break
		}
	}

	if (mismatch) {return "unknown"}
	return baseVersion;
}

// returns the Titanfall 2 version from gameversion.txt file.
// If it fails it simply returns "unknown"
//
// TODO: This file is present on Origin install, should check if it's
// present with Steam install as well.
version.titanfall = () => {
	var versionFilePath = path.join(settings.gamepath, "gameversion.txt");
	if (fs.existsSync(versionFilePath)) {
		return fs.readFileSync(versionFilePath, "utf8");
	} else {
		return "unknown";
	}
}

module.exports = version;
