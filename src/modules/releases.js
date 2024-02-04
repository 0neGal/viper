const win = require("../win");
const ipcMain = require("electron").ipcMain;

const requests = require("./requests");

let releases = {
	notes: {},
	latest: {}
}

// returns release notes to renderer
ipcMain.on("get-ns-notes", async () => {
	win().send("ns-notes", await releases.notes.northstar());
})

ipcMain.on("get-vp-notes", async () => {
	win().send("vp-notes", await releases.notes.viper());
})

// gets and returns the release notes of a GitHub repo
async function github_releases(repo) {
	let request = false;

	// attempt to perform the request, while caching it
	try {
		request = JSON.parse(await requests.get(
			"api.github.com", `/repos/${repo}/releases`,
			"release-notes-" + repo
		))
	}catch(err) {
		// request or parsing failed, return `false`
		return false;
	}

	// request is somehow falsy, return `false`
	if (! request) {
		return false;
	}

	// return the actual request as parsed JSON
	return request;
}

// returns release notes for Viper
releases.notes.viper = async () => {
	return await github_releases("0neGal/viper");
}

// returns release notes for Northstar
releases.notes.northstar = async () => {
	return await github_releases("R2Northstar/Northstar");
}

// gets and returns some details of the latest release of a GitHub repo
async function github_latest(repo) {
	let request = false;

	// attempt to perform the request, while caching it
	try {
		request = JSON.parse(await requests.get(
			"api.github.com", `/repos/${repo}/releases/latest`,
			"latest-release-" + repo
		))
	}catch(err) {
		// request or parsing failed, return `false`
		return false;
	}

	// request is somehow falsy, return `false`
	if (! request) {
		return false;
	}

	// return the actual request as parsed JSON
	return {
		notes: request.body,
		version: request.tag_name,
		download_link: request.assets[0].browser_download_url
	}
}

// returns latest release for Viper
releases.latest.viper = async () => {
	return await github_latest("0neGal/viper");
}

// returns latest release for Northstar
releases.latest.northstar = async () => {
	return await github_latest("R2Northstar/Northstar");
}

module.exports = releases;
