const path = require("path");
const fs = require("fs-extra");
const copy = require("recursive-copy");
const { app, dialog, ipcMain, Notification } = require("electron");

const Emitter = require("events");
const events = new Emitter();

const cli = require("./cli");
const lang = require("./lang");
const requests = require("./extras/requests");
const findgame = require("./extras/findgame");

const unzip = require("unzipper");
const run = require("child_process").spawn;
const exec = require("child_process").exec;
const { https } = require("follow-redirects");

process.chdir(app.getPath("appData"));

// Base settings
var settings = {
	gamepath: "",
	lang: "en-US",
	autoupdate: true,
	zip: "/northstar.zip",

	// These files won't be overwritten when installing/updating
	// Northstar, useful for config file.
	excludes: [
		"ns_startup_args.txt",
		"ns_startup_args_dedi.txt"
	]
}

// Creates the settings file with the base settings if it doesn't exist.
if (fs.existsSync("viper.json")) {
	settings = {...settings, ...JSON.parse(fs.readFileSync("viper.json", "utf8"))};
	settings.zip = path.join(settings.gamepath + "/northstar.zip");
} else {
	console.log(lang("general.missingpath"));
}

// A simple function that checks if the game is running, which we use to
// not update Northstar when it is running.
async function isGameRunning() {
	return new Promise(resolve => {
		let procs = ["Titanfall2.exe", "Titanfall2-unpacked.exe", "NorthstarLauncher.exe"];
		// While we could use a Node module to do this instead, I
		// decided not to do so. As this achieves exactly the same
		// thing. And it's not much more clunky.
		let cmd = (() => {
			switch (process.platform) {
				case "linux": return "ps -A";
				case "win32": return "tasklist";
			}
		})();

		exec(cmd, (err, stdout) => {
			for (let i = 0; i < procs.length; i++) {
				if (stdout.includes(procs[i])) {
					resolve(true);
					break
				}

				if (i == procs.length - 1) {resolve(false)}
			}
		});
	});
}

// Handles auto updating Northstar.
//
// It uses isGameRunning() to ensure it doesn't run while the game is
// running, as that may have all kinds of issues.
northstar_auto_updates: {
	if (!settings.autoupdate || !fs.existsSync("viper.json") || settings.gamepath.length === 0) {
		break northstar_auto_updates;
	}

	async function _checkForUpdates() {
		let localVersion = getNSVersion();
		let distantVersion = await requests.getLatestNsVersion();
		console.log(lang("cli.autoupdates.checking"));

		// Checks if NS is outdated
		if (localVersion !== distantVersion) {
			console.log(lang("cli.autoupdates.available"));
			if (await isGameRunning()) {
				console.log(lang("cli.autoupdates.gamerunning"));
				new Notification({
					title: lang("gui.nsupdate.gaming.title"), 
					body: lang("gui.nsupdate.gaming.body")
				}).show();
			} else {
				console.log(lang("cli.autoupdates.updatingns"));
				update();
			}
		} else {
			console.log(lang("cli.autoupdates.noupdate"))
		}

		setTimeout(
			_checkForUpdates, 
			15 * 60 * 1000
			// interval in between each update check
			// by default 15 minutes.
		);
	}

	_checkForUpdates();
}


// Requests to set the game path
//
// If running with CLI it takes in the --setpath argument otherwise it
// open the systems file browser for the user to select a path.
async function setpath(win, forcedialog) {
	function setGamepath(folder) {
		settings.gamepath = folder;
		settings.zip = path.join(settings.gamepath + "/northstar.zip");
		saveSettings();
		win.webContents.send("newpath", settings.gamepath);
		ipcMain.emit("newpath", null, settings.gamepath);
	}

	if (! win) { // CLI
		setGamepath(cli.param("setpath"));
	} else { // GUI
		if (! forcedialog) {
			function setGamepath(folder, forcedialog) {
				settings.gamepath = folder;
				settings.zip = path.join(settings.gamepath + "/northstar.zip");
				saveSettings();
				win.webContents.send("newpath", settings.gamepath);
				ipcMain.emit("newpath", null, settings.gamepath);
			}

			let gamepath = await findgame();
			if (gamepath) {
				setGamepath(gamepath);
				return;
			}

			winAlert(lang("general.missingpath"));
		}

		// Fallback to manual selection
		dialog.showOpenDialog({properties: ["openDirectory"]}).then(res => {
			if (res.canceled) {
				ipcMain.emit("newpath", null, false);
				return;
			}
			if (! fs.existsSync(path.join(res.filePaths[0], "Titanfall2.exe"))) {
				ipcMain.emit("wrongpath");
				return;
			}

			setGamepath(res.filePaths[0])

			cli.exit();
			return;
		}).catch(err => {console.error(err)})
	}
}

// As to not have to do the same one liner a million times, this
// function exists, as the name suggests, it simply writes the current
// settings to the disk.
function saveSettings() {
	fs.writeFileSync(app.getPath("appData") + "/viper.json", JSON.stringify(settings));
}

// Returns the current Northstar version
// If not installed it'll return "unknown"
function getNSVersion() {
	var versionFilePath = path.join(settings.gamepath, "ns_version.txt");

	if (fs.existsSync(versionFilePath)) {
		return fs.readFileSync(versionFilePath, "utf8");
	} else {
		fs.writeFileSync(versionFilePath, "unknown");
		return "unknown";
	}
}


// Returns the Titanfall 2 version from gameversion.txt file.
// If it fails it simply returns "unknown"
//
// TODO: This file is present on Origin install, should check if it's
// present with Steam install as well.
function getTF2Version() {
	var versionFilePath = path.join(settings.gamepath, "gameversion.txt");
	if (fs.existsSync(versionFilePath)) {
		return fs.readFileSync(versionFilePath, "utf8");
	} else {
		return "unknown";
	}
}

// Installs/Updates Northstar
//
// If Northstar is already installed it'll be an update, otherwise it'll
// install it. It simply downloads the Northstar archive from GitHub, if
// it's outdated, then extracts it into the game path.
//
// As to handle not overwriting files we rename certain files to
// <file>.excluded, then rename them back after the extraction. The
// unzip module does not support excluding files directly.
async function update() {
	// Renames excluded files to <file>.excluded
	for (let i = 0; i < settings.excludes.length; i++) {
		let exclude = path.join(settings.gamepath + "/" + settings.excludes[i]);
		if (fs.existsSync(exclude)) {
			fs.renameSync(exclude, exclude + ".excluded")
		}
	}

	ipcMain.emit("ns-update-event", "cli.update.checking");
	console.log(lang("cli.update.checking"));
	var version = getNSVersion();

	const latestAvailableVersion = await requests.getLatestNsVersion();

	// Makes sure it is not already the latest version
	if (version === latestAvailableVersion) {
		ipcMain.emit("ns-update-event", "cli.update.uptodate.short");
		console.log(lang("cli.update.uptodate"), version);

		winLog(lang("gui.update.uptodate"));
		return;
	} else {
		if (version != "unknown") {
			console.log(lang("cli.update.current"), version);
		}; 
		console.log(lang("cli.update.downloading") + ":", latestAvailableVersion);
		ipcMain.emit("ns-update-event", "cli.update.downloading");
	}

	// Start the download of the zip
	https.get(requests.getLatestNsVersionLink(), (res) => {
		let stream = fs.createWriteStream(settings.zip);
		res.pipe(stream);

		let received = 0;
		// Progress messages, we should probably switch this to
		// percentage instead of how much is downloaded.
		res.on("data", (chunk) => {
			received += chunk.length;
			ipcMain.emit("ns-update-event", lang("gui.update.downloading") + " " + (received / 1024 / 1024).toFixed(1) + "mb");
		})

		stream.on("finish", () => {
			stream.close();
			winLog(lang("gui.update.extracting"));
			ipcMain.emit("ns-update-event", "gui.update.extracting");
			console.log(lang("cli.update.downloaddone"));
			// Extracts the zip, this is the part where we're actually
			// installing Northstar.
			fs.createReadStream(settings.zip).pipe(unzip.Extract({path: settings.gamepath}))
			.on("finish", () => {
					fs.writeFileSync(path.join(settings.gamepath, "ns_version.txt"), latestAvailableVersion);
					ipcMain.emit("getversion");

				// Renames excluded files to their original name
				for (let i = 0; i < settings.excludes.length; i++) {
					let exclude = path.join(settings.gamepath + "/" + settings.excludes[i]);
					if (fs.existsSync(exclude + ".excluded")) {
						fs.renameSync(exclude + ".excluded", exclude)
					}
				}

				ipcMain.emit("guigetmods");
				ipcMain.emit("ns-update-event", "cli.update.uptodate.short");
				winLog(lang("gui.update.finished"));
				console.log(lang("cli.update.finished"));
				cli.exit();
			})
		})
	})
}

// Updates Viper itself
//
// This uses electron updater to easily update and publish releases, it
// simply fetches it from GitHub and updates if it's outdated, very
// useful. Not much we have to do on our side.
function updatevp(autoinstall) {
	const { autoUpdater } = require("electron-updater");

	if (autoinstall) {
		autoUpdater.on("update-downloaded", (info) => {
			autoUpdater.quitAndInstall();
		});
	}

	autoUpdater.on("error", (info) => {cli.exit(1)});
	autoUpdater.on("update-not-available", (info) => {cli.exit()});

	autoUpdater.checkForUpdatesAndNotify();
}

// Launches the game
//
// Either Northstar or Vanilla. Linux support is not currently a thing,
// however it'll be added at some point.
function launch(version) {
	if (process.platform == "linux") {
		console.error("error:", lang("cli.launch.linuxerror"))
		cli.exit(1);
	}

	process.chdir(settings.gamepath);
	switch(version) {
		case "vanilla":
			console.log(lang("general.launching"), "Vanilla...")
			run(path.join(settings.gamepath + "/Titanfall2.exe"))
			break;
		default:
			console.log(lang("general.launching"), "Northstar...")
			run(path.join(settings.gamepath + "/NorthstarLauncher.exe"))
			break;
	}
}

// Logs into the dev tools of the renderer
function winLog(msg) {
	ipcMain.emit("winLog", msg, msg);
}

// Sends an alert to the renderer
function winAlert(msg) {
	ipcMain.emit("winAlert", msg, msg);
}

// Used to manage mods.
//
// We can both get list of disabled mods, remove/install/toggle mods and
// other things akin to that, all kinds of mod related stuff
let modpath = path.join(settings.gamepath, "R2Northstar/mods");
const mods = {
	// Returns a list of mods
	//
	// It'll return 3 arrays, all, enabled, disabled. all being a
	// combination of the other two, enabled being enabled mods, and you
	// guessed it, disabled being disabled mods.
	list: () => {
		let modpath = path.join(settings.gamepath, "R2Northstar/mods");

		if (getNSVersion() == "unknown") {
			winLog(lang("general.notinstalled"))
			console.log("error: " + lang("general.notinstalled"))
			cli.exit(1);
			return false;
		}

		let mods = [];
		let disabled = [];

		if (! fs.existsSync(modpath)) {
			fs.mkdirSync(path.join(modpath, "disabled"), {recursive: true})
			return {
				enabled: [],
				disabled: [],
				all: []
			};
		}

		files = fs.readdirSync(modpath)
		files.forEach((file) => {
			if (fs.statSync(path.join(modpath, file)).isDirectory()) {
				if (fs.existsSync(path.join(modpath, file, "mod.json"))) {
					try {
						mods.push({...require(path.join(modpath, file, "mod.json")), FolderName: file, Disabled: false})
					}catch(err) {
						if (cli.hasArgs()) {console.log("error: " + lang("cli.mods.improperjson"), file)}
						mods.push({Name: file, FolderName: file, Version: "unknown", Disabled: false})
					}

					let manifest = path.join(modpath, file, "manifest.json");
					if (fs.existsSync(manifest)) {
						mods[mods.length - 1].ManifestName = require(manifest).name;
					}
				}
			}
		})

		let disabledPath = path.join(modpath, "disabled")
		if (! fs.existsSync(disabledPath)) {
			fs.mkdirSync(disabledPath)
		}

		files = fs.readdirSync(disabledPath)
		files.forEach((file) => {
			if (fs.statSync(path.join(disabledPath, file)).isDirectory()) {
				if (fs.existsSync(path.join(disabledPath, file, "mod.json"))) {
					try {
						disabled.push({...require(path.join(disabledPath, file, "mod.json")), FolderName: file, Disabled: true})
					}catch(err) {
						if (cli.hasArgs()) {console.log("error: " + lang("cli.mods.improperjson"), file)}
						disabled.push({Name: file, FolderName: file, Version: "unknown", Disabled: true})
					}
				}

				let manifest = path.join(modpath, file, "manifest.json");
				if (fs.existsSync(manifest)) {
					mods[mods.length - 1].ManifestName = require(manifest).name;
				}
			}
		})

		return {
			enabled: mods,
			disabled: disabled,
			all: [...mods, ...disabled]
		};
	},

	// Gets information about a mod
	//
	// Folder name, version, name and whatever else is in the mod.json,
	// keep in mind if the mod developer didn't format their JSON file
	// the absolute basics will be provided and we can't know the
	// version or similar.
	get: (mod) => {
		let modpath = path.join(settings.gamepath, "R2Northstar/mods");

		if (getNSVersion() == "unknown") {
			winLog(lang("general.notinstalled"))
			console.log("error: " + lang("general.notinstalled"))
			cli.exit(1);
			return false;
		}

		let list = mods.list().all;

		for (let i = 0; i < list.length; i++) {
			if (list[i].Name == mod) {
				return list[i];
			} else {continue}
		}

		return false;
	},

	// Installs mods from a file path
	//
	// Either a zip or folder is supported, we'll also try to search
	// inside the zip or folder to see if buried in another folder or
	// not, as sometimes that's the case.
	install: (mod, destname, manifestfile) => {
		let modname = mod.replace(/^.*(\\|\/|\:)/, "");

		if (getNSVersion() == "unknown") {
			winLog(lang("general.notinstalled"))
			console.log("error: " + lang("general.notinstalled"))
			cli.exit(1);
			return false;
		}

		let notamod = () => {
			winLog(lang("gui.mods.notamod"))
			console.log("error: " + lang("cli.mods.notamod"))
			cli.exit(1);
			return false;
		}

		let installed = () => {
			console.log(lang("cli.mods.installed"));
			cli.exit();

			winLog(lang("gui.mods.installedmod"))

			if (modname == "mods") {
				let manifest = path.join(app.getPath("userData"), "Archives/manifest.json")

				if (fs.existsSync(manifest)) {
					modname = require(manifest).name;
				}
			}

			ipcMain.emit("installedmod", "", modname);
			ipcMain.emit("guigetmods");
			return true;
		}

		if (! fs.existsSync(mod)) {return notamod()}

		if (fs.statSync(mod).isDirectory()) {
			winLog(lang("gui.mods.installing"))
			files = fs.readdirSync(mod);
			if (fs.existsSync(path.join(mod, "mod.json")) && 
				fs.statSync(path.join(mod, "mod.json")).isFile()) {

				if (fs.existsSync(path.join(modpath, modname))) {
					fs.rmSync(path.join(modpath, modname), {recursive: true});
				}
				let copydest = path.join(modpath, modname);
				if (typeof destname == "string") {copydest = path.join(modpath, destname)}
				copy(mod, copydest)
				copy(manifestfile, path.join(copydest, "manifest.json"))

				return installed();
			} else {
				files = fs.readdirSync(mod);

				for (let i = 0; i < files.length; i++) {
					if (fs.statSync(path.join(mod, files[i])).isDirectory()) {
						if (fs.existsSync(path.join(mod, files[i], "mod.json")) &&
							fs.statSync(path.join(mod, files[i], "mod.json")).isFile()) {

							console.log(mods.install(path.join(mod, files[i])))
							if (mods.install(path.join(mod, files[i]))) {return true};
						}
					}
				}

				notamod();
				return false;
			}
		} else {
			winLog(lang("gui.mods.extracting"))
			let cache = path.join(app.getPath("userData"), "Archives");
			if (fs.existsSync(cache)) {
				fs.rmSync(cache, {recursive: true});
				fs.mkdirSync(path.join(cache, "mods"), {recursive: true});
			} else {
				fs.mkdirSync(path.join(cache, "mods"), {recursive: true});
			}

			try {
				fs.createReadStream(mod).pipe(unzip.Extract({path: cache}))
				.on("finish", () => {
					setTimeout(() => {
						let manifest = path.join(cache, "manifest.json");
						if (fs.existsSync(manifest)) {
							files = fs.readdirSync(path.join(cache, "mods"));

							if (fs.existsSync(path.join(cache, "mods/mod.json"))) {
								if (mods.install(path.join(cache, "mods"), require(manifest).name, manifest)) {
									return true;
								}
							} else {
								for (let i = 0; i < files.length; i++) {
									let mod = path.join(cache, "mods", files[i]);
									if (fs.statSync(mod).isDirectory()) {
										setTimeout(() => {
											if (mods.install(mod, false, manifest)) {return true};
										}, 1000)
									}
								}
							}

							return notamod();
						}

						if (mods.install(cache)) {
							installed();
						} else {return notamod()}
					}, 1000)
				});
			}catch(err) {return notamod()}
		}
	},

	// Installs mods from URL's
	//
	// This'll simply download the file that the URL points to and then
	// install it with mods.install()
	installFromURL: (url) => {
		https.get(url, (res) => {
			let tmp = path.join(app.getPath("cache"), "vipertmp");
			let modlocation = path.join(tmp, "/mod.zip");

			if (fs.existsSync(tmp)) {
				if (! fs.statSync(tmp).isDirectory()) {
					fs.rmSync(tmp)
				}
			} else {
				fs.mkdirSync(tmp)
				if (fs.existsSync(modlocation)) {
					fs.rmSync(modlocation)
				}
			}

			let stream = fs.createWriteStream(modlocation);
			res.pipe(stream);

			// let received = 0;
			// // Progress messages, we should probably switch this to
			// // percentage instead of how much is downloaded.
			// res.on("data", (chunk) => {
			// 	received += chunk.length;
			// 	ipcMain.emit("ns-update-event", lang("gui.update.downloading") + " " + (received / 1024 / 1024).toFixed(1) + "mb");
			// })

			stream.on("finish", () => {
				stream.close();
				mods.install(modlocation)
			})
		})
	},

	// Removes mods
	//
	// Takes in the names of the mod then removes it, no confirmation,
	// that'd be up to the GUI.
	remove: (mod) => {
		let modpath = path.join(settings.gamepath, "R2Northstar/mods");

		if (getNSVersion() == "unknown") {
			winLog(lang("general.notinstalled"))
			console.log("error: " + lang("general.notinstalled"))
			cli.exit(1);
			return false;
		}

		if (mod == "allmods") {
			let modlist = mods.list().all;
			for (let i = 0; i < modlist.length; i++) {
				mods.remove(modlist[i].Name)
			}
			return
		}

		let disabled = path.join(modpath, "disabled");
		if (! fs.existsSync(disabled)) {
			fs.mkdirSync(disabled)
		}

		let modName = mods.get(mod).FolderName;
		if (! modName) {
			console.log("error: " + lang("cli.mods.cantfind"))
			cli.exit(1);
			return;
		}

		let modPath = path.join(modpath, modName);

		if (mods.get(mod).Disabled) {
			modPath = path.join(disabled, modName);
		}

		if (fs.statSync(modPath).isDirectory()) {
			let manifestname = null;
			if (fs.existsSync(path.join(modPath, "manifest.json"))) {
				manifestname = require(path.join(modPath, "manifest.json")).name;
			}

			fs.rmSync(modPath, {recursive: true});
			console.log(lang("cli.mods.removed"));
			cli.exit();
			ipcMain.emit("guigetmods");
			ipcMain.emit("removedmod", "", {
				name: mod.replace(/^.*(\\|\/|\:)/, ""),
				manifestname: manifestname
			});
		} else {
			cli.exit(1);
		}
	},

	// Toggles mods
	//
	// If a mod is enabled it'll disable it, vice versa it'll enable it
	// if it's disabled. You could have a direct .disable() function if
	// you checked for if a mod is already disable and if not run the
	// function. However we currently have no need for that.
	toggle: (mod, fork) => {
		let modpath = path.join(settings.gamepath, "R2Northstar/mods");

		if (getNSVersion() == "unknown") {
			winLog(lang("general.notinstalled"))
			console.log("error: " + lang("general.notinstalled"))
			cli.exit(1);
			return false;
		}

		if (mod == "allmods") {
			let modlist = mods.list().all;
			for (let i = 0; i < modlist.length; i++) {
				mods.toggle(modlist[i].Name, true)
			}

			console.log(lang("cli.mods.toggledall"));
			cli.exit(0);
			return
		}

		let disabled = path.join(modpath, "disabled");
		if (! fs.existsSync(disabled)) {
			fs.mkdirSync(disabled)
		}

		let modName = mods.get(mod).FolderName;
		if (! modName) {
			console.log("error: " + lang("cli.mods.cantfind"))
			cli.exit(1);
			return;
		}

		let modPath = path.join(modpath, modName);
		let dest = path.join(disabled, modName);

		if (mods.get(mod).Disabled) {
			modPath = path.join(disabled, modName);
			dest = path.join(modpath, modName);
		}

		fs.moveSync(modPath, dest)
		if (! fork) {
			console.log(lang("cli.mods.toggled"));
			cli.exit();
		}
		ipcMain.emit("guigetmods");
	}
};

setInterval(() => {
	ipcMain.emit("guigetmods");
}, 1500)

module.exports = {
	mods,
	lang,
	winLog,
	launch,
	update,
	setpath,
	updatevp,
	settings,
	getNSVersion,
	getTF2Version,
	isGameRunning,
	setlang: (lang) => {
		settings.lang = lang;
		saveSettings();
	},
}
