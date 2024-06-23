const fs = require("fs");
const path = require("path");
const vdf = require("simple-vdf");
const { app } = require("electron");

const util = require("util");
const exec = util.promisify(require("child_process").exec);

console = require("./console");

module.exports = async () => {
	let gamepath = "";
	
	// autodetect path through Powershell and Windows registry
	if (process.platform == "win32") {
		try {
			const {stdout} = await exec("Get-ItemProperty -Path Registry::HKEY_LOCAL_MACHINE\\SOFTWARE\\Respawn\\Titanfall2\\ -Name \"Install Dir\"", {"shell":"powershell.exe"});

			gamepath = stdout.split('\n')
				.filter(r => r.indexOf("Install Dir") !== -1)[0]
				.replace(/\s+/g,' ')
				.trim()
				.replace("Install Dir : ","");

			if (gamepath) {return gamepath}
		} catch (err) {}
	}

	// reads, then parses VDF files, to search for Titanfall
	function readvdf(data) {
		data = vdf.parse(data); // parse read_data

		// verify VDF was parsed correctly
		if (! data || typeof data !== "object" || ! data.libraryfolders) {
			return;
		}

		// list of folders where the game could possibly be installed at
		let values = Object.values(data["libraryfolders"]);

		if (typeof values[values.length - 1] != "object") {
			values.pop(1);
		}
		
		// `.length - 1` This is because the last value is `contentstatsid`
		for (let i = 0; i < values.length; i++) {
			let data_array = Object.values(values[i]);
			
			if (fs.existsSync(data_array[0] + "/steamapps/common/Titanfall2/Titanfall2.exe")) {
				console.ok("Found game in:", data_array[0]);
				return data_array[0] + "/steamapps/common/Titanfall2";
			} else {
				console.error("Game not in:", data_array[0]);
			}
		}
	}

	let vdf_files = [];

	// set `folders` to paths where the VDF file can be
	switch (process.platform) {
		case "win32":
			vdf_files = ["C:\\Program Files (x86)\\Steam\\steamapps\\libraryfolders.vdf"];
			break
		case "linux":
		case "openbsd":
		case "freebsd":
			let home = app.getPath("home");
			vdf_files = [
				path.join(home, "/.steam/steam/steamapps/libraryfolders.vdf"),
				path.join(home, ".var/app/com.valvesoftware.Steam/.steam/steam/steamapps/libraryfolders.vdf"),
				path.join(home, ".var/app/com.valvesoftware.Steam/.local/share/Steam/steamapps/libraryfolders.vdf")
			]
			break
	}

	// searches VDF files
	for (let i = 0; i < vdf_files.length; i++) {
		if (! fs.existsSync(vdf_files[i])) {continue}
		console.info("Searching VDF file at:", vdf_files[i]);

		let data = fs.readFileSync(vdf_files[i]);
		let read_vdf = readvdf(data.toString());
		if (read_vdf) {return read_vdf}
	}

	return gamepath || false;
}
