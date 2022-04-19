const fs = require("fs");
const path = require("path");
const vdf = require("simple-vdf");
const { app } = require("electron");

const util = require("util");
const exec = util.promisify(require("child_process").exec);

let home = app.getPath("home");

let symdir = ".steam/steam";
let localdir = ".local/share/Steam";
let flatpakdir = ".var/app/com.valvesoftware.Steam/";

module.exports = {
	prefix: () => {
		if (process.platform == "win32") {return false}
		let compatdir = "/steamapps/compatdata/123790/pfx";
		let folders = [
			path.join(home, symdir, compatdir),
			path.join(home, localdir, compatdir),
			path.join(home, flatpakdir, symdir, compatdir),
			path.join(home, flatpakdir, localdir, compatdir),
		]

		for (let i = 0; i < folders.length; i++) {
			let origin = path.join(folders[i], "drive_c/Program Files (x86)/Origin/Origin.exe");
			if (fs.existsSync(folders[i])) {
				if (fs.existsSync(origin)) {
					return {
						origin: origin,
						path: folders[i],
					}

				}
			}
		}
		 
		return false;
	},
	game: async () => {
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

			let values = Object.values(data["libraryfolders"]);
			if (typeof values[values.length - 1] != "object") {
				values.pop(1);
			}
			
			// `.length - 1` This is because the last value is `contentstatsid`
			for (let i = 0; i < values.length; i++) {
				let data_array = Object.values(values[i])
				
				if (fs.existsSync(data_array[0] + "/steamapps/common/Titanfall2/Titanfall2.exe")) {
					console.log("Found game in:", data_array[0])
					return data_array[0] + "/steamapps/common/Titanfall2";
				} else {
					console.log("Game not in:", data_array[0])
				}
			}
		}

		let folders = [];
		switch (process.platform) {
			case "win32":
				folders = ["C:\\Program Files (x86)\\Steam\\steamapps\\libraryfolders.vdf"];
				break
			case "linux":
			case "openbsd":
			case "freebsd":
				let vdfdir = "/steamapps/libraryfolders.vdf";
				folders = [
					path.join(home, symdir, vdfdir),
					path.join(home, localdir, vdfdir),
					path.join(home, flatpakdir, symdir, vdfdir),
					path.join(home, flatpakdir, localdir, vdfdir)
				]
				break
		}

		if (folders.length > 0) {
			for (let i = 0; i < folders.length; i++) {
				if (! fs.existsSync(folders[i])) {continue}
				console.log("Searching VDF file at:", folders[i])

				let data = fs.readFileSync(folders[i])
				let read_vdf = readvdf(data.toString())
				if (read_vdf) {return read_vdf}
			}
		}

		if (gamepath) {
			return gamepath;
		} else {
			return false;
		}
	}
}
