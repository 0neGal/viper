const fs = require("fs");
const path = require("path");
const vdf = require("simple-vdf");
const { app } = require("electron");

const util = require("util");
const exec = util.promisify(require("child_process").exec);

module.exports = async () => {
	let gamepath = "";
	
	// Autodetect path
	// Windows only using powershell and windows registery
	// Get-Item -Path Registry::HKEY_LOCAL_MACHINE\SOFTWARE\Respawn\Titanfall2\
	if (process.platform == "win32") {
		try {
			const {stdout} = await exec("Get-ItemProperty -Path Registry::HKEY_LOCAL_MACHINE\\SOFTWARE\\Respawn\\Titanfall2\\ -Name \"Install Dir\"", {"shell":"powershell.exe"});

			const gamepath = stdout.split('\n')
				.filter(r => r.indexOf("Install Dir") !== -1)[0]
				.replace(/\s+/g,' ')
				.trim()
				.replace("Install Dir : ","");

			if (gamepath) {return gamepath}
		} catch (err) {}
	}

	// Detect using Steam VDF
	function readvdf(data) {
		// Parse read_data
		data = vdf.parse(data);

		// `.length - 1` This is because the last value is `contentstatsid`
		for (let pathIterator = 0; pathIterator < Object.values(data["libraryfolders"]).length - 1; pathIterator++) {
			let data_array = Object.values(data["libraryfolders"][pathIterator])
			
			if (fs.existsSync(data_array[0] + "/steamapps/common/Titanfall2/Titanfall2.exe")) {
				return data_array[0] + "/steamapps/common/Titanfall2";
			}
		}
	}

	switch (process.platform) {
		case "win32":
			if (fs.existsSync("C:\\Program Files (x86)\\Steam\\steamapps\\libraryfolders.vdf")) {
				let data = fs.readFileSync("C:\\Program Files (x86)\\Steam\\steamapps\\libraryfolders.vdf")
				let read_vdf = readvdf(data.toString())
				if (read_vdf ) {return read_vdf}
			}
			break;
		case "linux":
			if (fs.existsSync(path.join(app.getPath("home"), "/.steam/steam/steamapps/libraryfolders.vdf"))) {
				let data = fs.readFileSync(path.join(app.getPath("home"), "/.steam/steam/steamapps/libraryfolders.vdf"))
				let read_vdf = readvdf(data.toString())
				if (read_vdf ) {return read_vdf}
			}
			break;	
	}

	if (gamepath) {
		return gamepath;
	} else {
		return false;
	}
}
