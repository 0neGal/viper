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
const repair = require("jsonrepair");
const exec = require("child_process").exec;
const { https } = require("follow-redirects");

process.chdir(app.getPath("appData"));

var invalidsettings = false;

// Base settings
var settings = {
	gamepath: "",
	lang: "en-US",
	nsupdate: true,
	autolang: true,
	forcedlang: "en",
	autoupdate: true,
	originkill: false,
	nsargs: "-multiple",
	zip: "/northstar.zip",

	// These files won't be overwritten when installing/updating
	// Northstar, useful for config files
	excludes: [
		"ns_startup_args.txt",
		"ns_startup_args_dedi.txt"
	]
}

// Logs into the dev tools of the renderer
function winLog(msg) {
	ipcMain.emit("win-log", msg, msg);
}

// Sends an alert to the renderer
function winAlert(msg) {
	ipcMain.emit("win-alert", msg, msg);
}

// Creates the settings file with the base settings if it doesn't exist.
if (fs.existsSync("viper.json")) {
	let conf = fs.readFileSync("viper.json", "utf8");
	let json = "{}";

	// Validates viper.json
	try {
		json = JSON.parse(conf);
	}catch (e) {
		invalidsettings = true;
	}

	settings = {...settings, ...json};
	settings.zip = path.join(settings.gamepath + "/northstar.zip");

	let args = path.join(settings.gamepath, "ns_startup_args.txt");
	if (fs.existsSync(args)) {
		settings.nsargs = fs.readFileSync(args, "utf8");
	}
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

// checks if any origin processes are running
async function isOriginRunning() {
	return new Promise(resolve => {
		let procs = ["Origin.exe", "OriginClientService.exe"];
		let cmd = (() => {
			switch (process.platform) {
				case "linux": return "ps -A";
				case "win32": return "tasklist";
			}
		})();

		exec(cmd, (err, stdout) => {
			procs.forEach(proc => {
				if (stdout.includes(proc)) {
					resolve(true);
					return;
				}
				resolve(false);
			});
		});
	});
}

// kill origin processes
async function killOrigin() {
	return new Promise(resolve => {
		let proc = "Origin.exe"; //I'm pretty sure we only have to kill this one
		let cmd = (() => {
			switch (process.platform) {
				case "linux": return "killall " + proc;
				case "win32": return "taskkill /IM " + proc + " /F";
			}
		})();

		exec(cmd, (err, stdout) => {
			// just try and fail silently if we don't find it w/e
			resolve(true);
		});
	});
}

// Handles auto updating Northstar.
//
// It uses isGameRunning() to ensure it doesn't run while the game is
// running, as that may have all kinds of issues.
function handleNorthstarUpdating() {
	if (! settings.nsupdate || ! fs.existsSync("viper.json") || settings.gamepath.length === 0) {
		return;
	}

	async function _checkForUpdates() {
		let localVersion = getNSVersion();
		let distantVersion = await requests.getLatestNsVersion();
		if (distantVersion == false) { return; }
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
				updateNorthstar();
			}
		} else {
			console.log(lang("cli.autoupdates.noupdate"));
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

		modpath = path.join(settings.gamepath, "R2Northstar/mods");
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
				ipcMain.emit("wrong-path");
				return;
			}

			setGamepath(res.filePaths[0]);

			cli.exit();
			return;
		}).catch(err => {console.error(err)})
	}
}

// As to not have to do the same one liner a million times, this
// function exists, as the name suggests, it simply writes the current
// settings to the disk.
//
// You can also pass a settings object to the function and it'll try and
// merge it together with the already existing settings
function saveSettings(obj = {}) {
	if (invalidsettings) {return false}

	settings = {...settings, ...obj};

	if (fs.existsSync(settings.gamepath)) {
		fs.writeFileSync(path.join(settings.gamepath, "ns_startup_args.txt"), settings.nsargs);
	}

	fs.writeFileSync(app.getPath("appData") + "/viper.json", JSON.stringify({...settings, ...obj}));
}

// Returns the current Northstar version
// If not installed it'll return "unknown"
function getNSVersion() {
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
				add("v" + JSON.parse(fs.readFileSync(versionFile, "utf8")).Version);
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


// Renames excluded files to their original name
function restoreExcludedFiles() {
	for (let i = 0; i < settings.excludes.length; i++) {
		let exclude = path.join(settings.gamepath + "/" + settings.excludes[i]);
		if (fs.existsSync(exclude + ".excluded")) {
			fs.renameSync(exclude + ".excluded", exclude);
		}
	}
}
// At start, restore excluded files who might have been created by an incomplete update process.
restoreExcludedFiles();

// Installs/Updates Northstar
//
// If Northstar is already installed it'll be an update, otherwise it'll
// install it. It simply downloads the Northstar archive from GitHub, if
// it's outdated, then extracts it into the game path.
//
// As to handle not overwriting files we rename certain files to
// <file>.excluded, then rename them back after the extraction. The
// unzip module does not support excluding files directly.
async function updateNorthstar() {
	if (! gamepathExists()) {return}

	ipcMain.emit("ns-update-event", "cli.update.checking");
	console.log(lang("cli.update.checking"));
	var version = getNSVersion();

	const latestAvailableVersion = await requests.getLatestNsVersion();
	console.log(latestAvailableVersion)
	if (latestAvailableVersion == false) {
		ipcMain.emit("ns-update-event", "cli.update.noInternet");
		return;
	}

	// Makes sure it is not already the latest version
	if (version === latestAvailableVersion) {
		ipcMain.emit("ns-update-event", "cli.update.uptodate.short");
		console.log(lang("cli.update.uptodate"), version);

		winLog(lang("gui.update.uptodate"));
		cli.exit();
		return;
	} else {
		if (version != "unknown") {
			console.log(lang("cli.update.current"), version);
		};
		console.log(lang("cli.update.downloading") + ":", latestAvailableVersion);
		ipcMain.emit("ns-update-event", "cli.update.downloading");
	}

	// Renames excluded files to <file>.excluded
	for (let i = 0; i < settings.excludes.length; i++) {
		let exclude = path.join(settings.gamepath + "/" + settings.excludes[i]);
		if (fs.existsSync(exclude)) {
			fs.renameSync(exclude, exclude + ".excluded");
		}
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
			let extract = fs.createReadStream(settings.zip);

			winLog(lang("gui.update.extracting"));
			ipcMain.emit("ns-update-event", "gui.update.extracting");
			console.log(lang("cli.update.downloaddone"));
			// Extracts the zip, this is the part where we're actually
			// installing Northstar.
			extract.pipe(unzip.Extract({path: settings.gamepath}))

			let max = received;
			received = 0;

			extract.on("data", (chunk) => {
				received += chunk.length;
				let percent = Math.floor(received / max * 100);
				ipcMain.emit("ns-update-event", lang("gui.update.extracting") + " " + percent + "%");
			})

			extract.on("end", () => {
				extract.close();
				ipcMain.emit("getversion");

				restoreExcludedFiles();

				ipcMain.emit("gui-getmods");
				ipcMain.emit("get-version");
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
function updateViper(autoinstall) {
	const { autoUpdater } = require("electron-updater");

	if (! autoUpdater.isUpdaterActive()) {
		if (settings.nsupdate) {
			handleNorthstarUpdating();
		}
		return cli.exit();
	}

	if (autoinstall) {
		autoUpdater.on("update-downloaded", (info) => {
			autoUpdater.quitAndInstall();
		});
	}

	autoUpdater.on("error", (info) => {cli.exit(1)});
	autoUpdater.on("update-not-available", (info) => {
		// only check for NS updates if Viper itself has no updates and
		// if NS auto updates is enabled.
		if (settings.nsupdate || cli.hasArgs()) {
			handleNorthstarUpdating();
		}
		cli.exit();
	});

	autoUpdater.checkForUpdatesAndNotify();
}

// Launches the game
//
// Either Northstar or Vanilla. Linux support is not currently a thing,
// however it'll be added at some point.
function launch(version) {
	if (process.platform == "linux") {
		winAlert(lang("cli.launch.linuxerror"));
		console.error("error:", lang("cli.launch.linuxerror"));
		cli.exit(1);
		return;
	}

	process.chdir(settings.gamepath);
	switch(version) {
		case "vanilla":
			console.log(lang("general.launching"), "Vanilla...");
			exec("Titanfall2.exe", {cwd: settings.gamepath});
			break;
		default:
			console.log(lang("general.launching"), "Northstar...");
			exec("NorthstarLauncher.exe", {cwd: settings.gamepath});
			break;
	}
}

// Returns true/false depending on if the gamepath currently exists/is
// mounted, used to avoid issues...
function gamepathExists() {
	return fs.existsSync(settings.gamepath);
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
			winLog(lang("general.notinstalled"));
			console.log("error: " + lang("general.notinstalled"));
			cli.exit(1);
			return false;
		}

		let enabled = [];
		let disabled = [];

		if (! fs.existsSync(modpath)) {
			fs.mkdirSync(path.join(modpath), {recursive: true});
			return {
				enabled: [],
				disabled: [],
				all: []
			};
		}

		files = fs.readdirSync(modpath);
		files.forEach((file) => {
			if (fs.statSync(path.join(modpath, file)).isDirectory()) {
				let modjson = path.join(modpath, file, "mod.json");
				if (fs.existsSync(modjson)) {
					let mod = {};
					try {
						mod = JSON.parse(repair(fs.readFileSync(modjson, "utf8")));
					}catch(err) {
						return;
					}

					let obj = {
						Version: "unknown",
						Name: "unknown",
						FolderName: file,
					...mod}

					obj.Disabled = ! mods.modfile().get(obj.Name);

					let manifestfile = path.join(modpath, file, "manifest.json");
					if (fs.existsSync(manifestfile)) {
						let manifest = JSON.parse(repair(fs.readFileSync(manifestfile, "utf8")));

						obj.ManifestName = manifest.name;
						if (obj.Version == "unknown") {
							obj.Version = manifest.version_number;
						}
					}

					if (obj.Disabled) {
						disabled.push(obj);
					} else {
						enabled.push(obj);
					}
				}
			}
		})

		return {
			enabled: enabled,
			disabled: disabled,
			all: [...enabled, ...disabled]
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
			winLog(lang("general.notinstalled"));
			console.log("error: " + lang("general.notinstalled"));
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

	// Manages the enabledmods.json file
	//
	// It can both return info about the file, but also toggle mods in
	// it, generate the file itself, and so on.
	modfile: () => {
		let modpath = path.join(settings.gamepath, "R2Northstar/mods");
		let file = path.join(modpath, "..", "enabledmods.json");

		if (! fs.existsSync(modpath)) {
			fs.mkdirSync(path.join(modpath), {recursive: true});
		}

		if (! fs.existsSync(file)) {
			fs.writeFileSync(file, "{}");
		}

		return {
			gen: () => {
				let names = {};
				let list = mods.list().all;
				for (let i = 0; i < list.length; i++) {
					names[list[i].Name] = true
				}

				fs.writeFileSync(file, JSON.stringify(names));
			},
			disable: (mod) => {
				let data = JSON.parse(repair(fs.readFileSync(file, "utf8")));
				data[mod] = false;
				fs.writeFileSync(file, JSON.stringify(data));
			},
			enable: (mod) => {
				let data = JSON.parse(repair(fs.readFileSync(file, "utf8")));
				data[mod] = true;
				fs.writeFileSync(file, JSON.stringify(data));
			},
			toggle: (mod) => {
				let data = JSON.parse(repair(fs.readFileSync(file, "utf8")));
				if (data[mod] != undefined) {
					data[mod] = ! data[mod];
				} else {
					data[mod] = false;
				}

				fs.writeFileSync(file, JSON.stringify(data));
			},
			get: (mod) => {
				let data = JSON.parse(repair(fs.readFileSync(file, "utf8")));
				let names = Object.keys(data);

				if (data[mod]) {
					return true;
				} else if (data[mod] === false) {
					return false;
				} else {
					return true;
				}
			}
		};
	},

	installing: [],
	dupe_msg_sent: false,

	// Installs mods from a file path
	//
	// Either a zip or folder is supported, we'll also try to search
	// inside the zip or folder to see if buried in another folder or
	// not, as sometimes that's the case.
	install: (mod, opts ) => {
		let modname = mod.replace(/^.*(\\|\/|\:)/, "");

		opts = {
			forked: false,
			destname: false,
			malformed: false,
			manifest_file: false,
			...opts
		}

		if (! opts.forked) {
			mods.installing = [];
			mods.dupe_msg_sent = false;
		}

		if (getNSVersion() == "unknown") {
			winLog(lang("general.notinstalled"));
			console.log("error: " + lang("general.notinstalled"));
			cli.exit(1);
			return false;
		}

		let notamod = () => {
			winLog(lang("gui.mods.notamod"));
			console.log("error: " + lang("cli.mods.notamod"));
			cli.exit(1);
			return false;
		}

		let installed = () => {
			console.log(lang("cli.mods.installed"));
			cli.exit();

			winLog(lang("gui.mods.installedmod"));

			if (modname == "mods") {
				let manifest = path.join(app.getPath("userData"), "Archives/manifest.json");

				if (fs.existsSync(manifest)) {
					modname = require(manifest).name;
				}
			}

			ipcMain.emit("installed-mod", "", {
				name: modname,
				malformed: opts.malformed,
			});

			ipcMain.emit("gui-getmods");
			return true;
		}

		if (! fs.existsSync(mod)) {return notamod()}

		if (fs.statSync(mod).isDirectory()) {
			winLog(lang("gui.mods.installing"));
			files = fs.readdirSync(mod);
			if (fs.existsSync(path.join(mod, "mod.json")) &&
				fs.statSync(path.join(mod, "mod.json")).isFile()) {

				try {
					JSON.parse(fs.readFileSync(path.join(mod, "mod.json")));
				}catch(err) {
					ipcMain.emit("failed-mod");
					return notamod();
				}

				if (fs.existsSync(path.join(modpath, modname))) {
					fs.rmSync(path.join(modpath, modname), {recursive: true});
				}

				let copydest = path.join(modpath, modname);
				if (typeof opts.destname == "string") {
					copydest = path.join(modpath, opts.destname)
				}

				copy(mod, copydest);
				copy(opts.manifest_file, path.join(copydest, "manifest.json"));

				return installed();
			} else {
				mod_files = fs.readdirSync(mod);

				for (let i = 0; i < mod_files.length; i++) {
					if (fs.statSync(path.join(mod, mod_files[i])).isDirectory()) {
						if (fs.existsSync(path.join(mod, mod_files[i], "mod.json")) &&
							fs.statSync(path.join(mod, mod_files[i], "mod.json")).isFile()) {

							let mod_name = mod_files[i];
							let use_mod_name = false;

							while (mods.installing.includes(mod_name)) {
								if (! mods.dupe_msg_sent) {
									mods.dupe_msg_sent = true;
									ipcMain.emit("duped-mod", "", mod_name);
								}

								use_mod_name = true;
								mod_name = mod_name + " (dupe)";
							}

							mods.installing.push(mod_name);

							let install = false;
							if (use_mod_name) {
								install = mods.install(path.join(mod, mod_files[i]), {
									forked: true,
									destname: mod_name,
								})
							} else {
								install = mods.install(path.join(mod, mod_files[i]), {
									forked: true
								})
							}

							if (install) {return true};
						}
					}
				}

				return notamod();
			}

			return notamod();
		} else {
			winLog(lang("gui.mods.extracting"));
			let cache = path.join(app.getPath("userData"), "Archives");
			if (fs.existsSync(cache)) {
				fs.rmSync(cache, {recursive: true});
				fs.mkdirSync(path.join(cache, "mods"), {recursive: true});
			} else {
				fs.mkdirSync(path.join(cache, "mods"), {recursive: true});
			}

			try {
				if (mod.replace(/.*\./, "").toLowerCase() == "zip") {
					fs.createReadStream(mod).pipe(unzip.Extract({path: cache}))
					.on("finish", () => {
						setTimeout(() => {
							let manifest = path.join(cache, "manifest.json");
							if (fs.existsSync(manifest)) {
								files = fs.readdirSync(path.join(cache, "mods"));
								if (fs.existsSync(path.join(cache, "mods/mod.json"))) {
									if (mods.install(path.join(cache, "mods"), {
											forked: true,
											malformed: true,
											manifest_file: manifest,
											destname: require(manifest).name
										})) {

										return true;
									}
								} else {
									for (let i = 0; i < files.length; i++) {
										let mod = path.join(cache, "mods", files[i]);
										if (fs.statSync(mod).isDirectory()) {
											setTimeout(() => {
												if (mods.install(mod, {
														forked: true,
														destname: false,
														manifest_file: manifest
													})) {

													return true
												}
											}, 1000)
										}
									}

									if (files.length == 0) {
										ipcMain.emit("failed-mod");
										return notamod();
									}
								}

								return notamod();
							}

							if (mods.install(cache, { forked: true })) {
								installed();
							} else {return notamod()}
						}, 1000)
					});
				} else {
					return notamod();
				}
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
					fs.rmSync(tmp);
				}
			} else {
				fs.mkdirSync(tmp);
				if (fs.existsSync(modlocation)) {
					fs.rmSync(modlocation);
				}
			}

			let stream = fs.createWriteStream(modlocation);
			res.pipe(stream);

			stream.on("finish", () => {
				stream.close();
				mods.install(modlocation);
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
			winLog(lang("general.notinstalled"));
			console.log("error: " + lang("general.notinstalled"));
			cli.exit(1);
			return false;
		}

		if (mod == "allmods") {
			let modlist = mods.list().all;
			for (let i = 0; i < modlist.length; i++) {
				mods.remove(modlist[i].Name);
			}
			return
		}

		let disabled = path.join(modpath, "disabled");
		if (! fs.existsSync(disabled)) {
			fs.mkdirSync(disabled);
		}

		let modName = mods.get(mod).FolderName;
		if (! modName) {
			console.log("error: " + lang("cli.mods.cantfind"));
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
			ipcMain.emit("gui-getmods");
			ipcMain.emit("removed-mod", "", {
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
		if (getNSVersion() == "unknown") {
			winLog(lang("general.notinstalled"));
			console.log("error: " + lang("general.notinstalled"));
			cli.exit(1);
			return false;
		}

		if (mod == "allmods") {
			let modlist = mods.list().all;
			for (let i = 0; i < modlist.length; i++) {
				mods.toggle(modlist[i].Name, true);
			}

			console.log(lang("cli.mods.toggledall"));
			cli.exit(0);
			return
		}

		mods.modfile().toggle(mod);
		if (! fork) {
			console.log(lang("cli.mods.toggled"));
			cli.exit();
		}
		ipcMain.emit("gui-getmods");
	}
};

setInterval(() => {
	if (gamepathExists()) {
		ipcMain.emit("gui-getmods");
	} else {
		if (fs.existsSync("viper.json")) {
			if (settings.gamepath != "") {
				ipcMain.emit("gamepath-lost");
			}
		}
	}
}, 1500)

setTimeout(() => {
	sasdasd
}, 3000)

module.exports = {
	mods,
	winLog,

	updateViper,
	getNSVersion,
	getTF2Version,
	updateNorthstar,
	handleNorthstarUpdating,

	launch,
	killOrigin,
	isGameRunning,
	isOriginRunning,


	settings,
	saveSettings,

	setpath,
	gamepathExists,

	lang,
	setlang: (lang) => {
		settings.lang = lang;
		saveSettings();
	},
}
