const fs = require("fs");
const path = require("path");
const vdf = require("simple-vdf");
const { app } = require("electron");

const util = require("util");
const exec = util.promisify(require("child_process").exec);

let libraries = [];
let home = app.getPath("home");

let symdir = ".steam/steam";
let localdir = ".local/share/Steam";
let flatpakdir = ".var/app/com.valvesoftware.Steam/";

module.exports = {
	prefix: () => {
		if (process.platform == "win32") {return false}
		let compatdir = "/steamapps/compatdata/1237970/pfx";
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
	proton: () => {
		module.exports.game(true);

		let proton = "0.0";
		let protonpath = false;

		for (let i = 0; i < libraries.length; i++) {
			let files = fs.readdirSync(libraries[i]);
			for (let ii = 0; ii < files.length; ii++) {
				if (files[ii].match(/^Proton [0-9]+\.[0-9]+/)) {
					if (fs.existsSync(path.join(libraries[i], files[ii], "/dist/bin/wine64"))) {
						let version = files[ii].replace(/^Proton /, "");
						if (version > proton) {
							proton = version;
							protonpath = path.join(libraries[i], files[ii], "/dist/bin/wine64");
						}
					}
				}
			}
		}

		return protonpath;
	},
	game: async (quiet) => {
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

			libraries = [];
			
			// `.length - 1` This is because the last value is `contentstatsid`
			for (let i = 0; i < values.length; i++) {
				libraries.push(values[i].path + "/steamapps/common"); 

				let data_array = Object.values(values[i])
				
				if (fs.existsSync(data_array[0] + "/steamapps/common/Titanfall2/Titanfall2.exe")) {
					if (! quiet ) {console.log("Found game in:", data_array[0])}
					return data_array[0] + "/steamapps/common/Titanfall2";
				} else {
					if (! quiet ) {console.log("Game not in:", data_array[0])}
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
				if (! quiet ) {console.log("Searching VDF file at:", folders[i])}

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
