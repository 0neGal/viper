const path = require("path");
const fs = require("fs-extra");
const { dialog, ipcMain, Notification } = require("electron");

const Emitter = require("events");
const events = new Emitter();

const cli = require("./cli");
const lang = require("./lang");
const json = require("./modules/json");
const settings = require("./modules/settings");
const requests = require("./modules/requests");
const findgame = require("./modules/findgame");

const unzip = require("unzipper");
const exec = require("child_process").exec;
const execFile = require("child_process").execFile;
const { https } = require("follow-redirects");

// Logs into the dev tools of the renderer
function winLog(msg) {
	ipcMain.emit("win-log", msg, msg);
}

// Sends an alert to the renderer
function winAlert(msg) {
	ipcMain.emit("win-alert", msg, msg);
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
		settings.save();
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
				settings.save();
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
function launch(version) {
	console.log(settings.nsmethod);
	var method = settings.nsmethod;

	if (process.platform == "linux" && method == "direct") {
		// there is no directly launching on Linux, so try the next best thing.
		method = "steam";
	}

	switch(method) {
		default:
		case "direct":
			launchDirect(version);
			break;

		case "steam":
			launchSteam(version);
			break;
	}
}

// Launch the game directly
//
// Windows only
function launchDirect(version) {
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

// Launch the game via Steam
function launchSteam(version) {
	const isVanilla = version == "vanilla"
	const args = ["-applaunch", "1237970", isVanilla ? "-vanilla" : "-northstar" ]

	process.chdir(settings.gamepath);
	if (process.platform == "linux") {
		switch(version) {
			case "vanilla":
				fs.writeFileSync("run_northstar.txt", "0");
				break;
			default:
				fs.writeFileSync("run_northstar.txt", "1");
				break;
		}
	}
	execFile("/usr/bin/steam", args)
}

// Returns true/false depending on if the gamepath currently exists/is
// mounted, used to avoid issues...
function gamepathExists() {
	return fs.existsSync(settings.gamepath);
}

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

module.exports = {
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

	setpath,
	gamepathExists,

	lang,
	setlang: (lang) => {
		settings.lang = lang;
		settings.save();
	},
}
