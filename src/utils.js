const path = require("path");
const fs = require("fs-extra");
const copy = require("copy-dir");
const { app, dialog, ipcMain, Notification } = require("electron");

const Emitter = require("events");
const events = new Emitter();

const cli = require("./cli");
const lang = require("./lang");
const requests = require("./requests");

const unzip = require("unzipper");
const run = require("child_process").spawn;
const exec = require("child_process").exec;
const { https } = require("follow-redirects");

process.chdir(app.getPath("appData"));

var settings = {
	gamepath: "",
	lang: "en-US",
	autoupdate: true,
	zip: "/northstar.zip",
	excludes: [
		"ns_startup_args.txt",
		"ns_startup_args_dedi.txt"
	]
}

if (fs.existsSync("viper.json")) {
	settings = {...settings, ...JSON.parse(fs.readFileSync("viper.json", "utf8"))};
	settings.zip = path.join(settings.gamepath + "/northstar.zip");
} else {
	console.log(lang("general.missingpath"));
}


async function isGameRunning() {
	return new Promise(resolve => {
		let procs = ["Titanfall2.exe", "Titanfall2-unpacked.exe", "NorthstarLauncher.exe"];
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

northstar_auto_updates: {
	if (!settings.autoupdate || !fs.existsSync("viper.json") || settings.gamepath.length === 0) {
		break northstar_auto_updates;
	}

	async function _checkForUpdates() {
		let localVersion = getNSVersion();
		let distantVersion = await requests.getLatestNsVersion();
		console.log(lang("cli.autoupdates.checking"));

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
			15 * 60 * 1000	// update checking interval must be bigger than cache validity duration
		);
	}

	_checkForUpdates();
}


function setpath(win) {
	if (! win) {
		settings.gamepath = cli.param("setpath");
	} else {
		dialog.showOpenDialog({properties: ["openDirectory"]}).then(res => {
			if (res.canceled) {
				ipcMain.emit("newpath", null, false);
				return;
			}
			if (! fs.existsSync(path.join(res.filePaths[0], "Titanfall2.exe"))) {
				ipcMain.emit("wrongpath");
				return;
			}

			settings.gamepath = res.filePaths[0];
			settings.zip = path.join(settings.gamepath + "/northstar.zip");
			saveSettings();
			win.webContents.send("newpath", settings.gamepath);
			ipcMain.emit("newpath", null, settings.gamepath);
		}).catch(err => {console.error(err)})
	}

	saveSettings();
	cli.exit();
}

function saveSettings() {
	fs.writeFileSync(app.getPath("appData") + "/viper.json", JSON.stringify(settings));
}

function getNSVersion() {
	var versionFilePath = path.join(settings.gamepath, "ns_version.txt");

	if (fs.existsSync(versionFilePath)) {
		return fs.readFileSync(versionFilePath, "utf8");
	} else {
		fs.writeFileSync(versionFilePath, "unknown");
		return "unknown";
	}
}

async function update() {
	for (let i = 0; i < settings.excludes.length; i++) {
		let exclude = path.join(settings.gamepath + "/" + settings.excludes[i]);
		if (fs.existsSync(exclude)) {
			fs.renameSync(exclude, exclude + ".excluded")
		}
	}

	ipcMain.emit("ns-updating");
	console.log(lang("cli.update.checking"));
	var version = getNSVersion();

	const latestAvailableVersion = await requests.getLatestNsVersion();

	if (version === latestAvailableVersion) {
		ipcMain.emit("ns-updated");
		console.log(lang("cli.update.uptodate"), version);

		winLog(lang("gui.update.uptodate"));
		return;
	} else {
		if (version != "unknown") {
			console.log(lang("cli.update.current"), version);
		}; console.log(lang("cli.update.downloading") + ":", latestAvailableVersion);

		winLog(lang("gui.update.downloading"));
	}

	https.get(requests.getLatestNsVersionLink(), (res) => {
		let stream = fs.createWriteStream(settings.zip);
		res.pipe(stream);

		let received = 0;
		res.on("data", (chunk) => {
			received += chunk.length;
			winLog(lang("gui.update.downloading") + " " + (received / 1024 / 1024).toFixed(1) + "mb");
		})

		stream.on("finish", () => {
			stream.close();
			winLog(lang("gui.update.extracting"));
			console.log(lang("cli.update.downloaddone"));
			fs.createReadStream(settings.zip).pipe(unzip.Extract({path: settings.gamepath}))
			.on("finish", () => {
				fs.writeFileSync(path.join(settings.gamepath, "ns_version.txt"), latestAvailableVersion);
				ipcMain.emit("getversion");

				for (let i = 0; i < settings.excludes.length; i++) {
					let exclude = path.join(settings.gamepath + "/" + settings.excludes[i]);
					if (fs.existsSync(exclude + ".excluded")) {
						fs.renameSync(exclude + ".excluded", exclude)
					}
				}

					ipcMain.emit("guigetmods");
					ipcMain.emit("ns-updated");
					winLog(lang("gui.update.finished"));
					console.log(lang("cli.update.finished"));
					cli.exit();
			})
		})
	})
}

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

function winLog(msg) {
	ipcMain.emit("winLog", msg, msg);
}

function winAlert(msg) {
	ipcMain.emit("winAlert", msg, msg);
}

let modpath = path.join(settings.gamepath, "R2Northstar/mods");
const mods = {
	list: () => {
		if (getNSVersion() == "unknown") {
			winLog(lang("general.notinstalled"))
			console.log("error: " + lang("general.notinstalled"))
			cli.exit(1);
			return false;
		}

		let mods = [];
		let disabled = [];

		files = fs.readdirSync(modpath)
		files.forEach((file) => {
			if (fs.statSync(path.join(modpath, file)).isDirectory()) {
				if (fs.existsSync(path.join(modpath, file, "mod.json"))) {
					try {
						mods.push({...require(path.join(modpath, file, "mod.json")), FolderName: file, Disabled: false})
					}catch(err) {
						console.log("error: " + lang("cli.mods.improperjson"), file)
						mods.push({Name: file, FolderName: file, Version: "unknown", Disabled: false})
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
						console.log("error: " + lang("cli.mods.improperjson"), file)
						disabled.push({Name: file, FolderName: file, Version: "unknown", Disabled: true})
					}
				}
			}
		})

		return {
			enabled: mods,
			disabled: disabled,
			all: [...mods, ...disabled]
		};
	},
	get: (mod) => {
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
	install: (mod) => {
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
			ipcMain.emit("guigetmods");
			return true;
		}

		if (! fs.existsSync(mod)) {return notamod()}

		if (fs.statSync(mod).isDirectory()) {
			winLog(lang("gui.mods.installing"))
			if (fs.existsSync(path.join(mod, "mod.json")) && 
				fs.statSync(path.join(mod, "mod.json")).isFile()) {

				copy.sync(mod, path.join(modpath, mod.replace(/^.*(\\|\/|\:)/, "")), {
					mode: true,
					cover: true,
					utimes: true,
				});

				return installed();
			} else {
				files = fs.readdirSync(mod);

				for (let i = 0; i < files.length; i++) {
					if (fs.statSync(path.join(mod, files[i])).isDirectory()) {
						if (fs.existsSync(path.join(mod, files[i], "mod.json")) &&
							fs.statSync(path.join(mod, files[i], "mod.json")).isFile()) {

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
				fs.mkdirSync(cache);
			} else {
				fs.mkdirSync(cache);
			}

			try {
				fs.createReadStream(mod).pipe(unzip.Extract({path: cache}))
				.on("finish", () => {
					if (mods.install(cache)) {
						installed();
					} else {return notamod()}
				});
			}catch(err) {return notamod()}
		}
	},
	remove: (mod) => {
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
			fs.rmSync(modPath, {recursive: true});
			console.log(lang("cli.mods.removed"));
			cli.exit();
			ipcMain.emit("guigetmods");
		} else {
			cli.exit(1);
		}
	},
	toggle: (mod, fork) => {
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
	isGameRunning,
	setlang: (lang) => {
		settings.lang = lang;
		saveSettings();
	},
}
