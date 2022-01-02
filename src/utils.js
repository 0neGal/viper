const path = require("path");
const fs = require("fs-extra");
const copy = require("copy-dir");
const { app, dialog, ipcMain } = require("electron");

const Emitter = require("events");
const events = new Emitter();

const cli = require("./cli");
const lang = require("./lang");

const unzip = require("unzipper");
const request = require("request");
const exec = require("child_process").spawn;
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
	console.log(lang("general.missinggamepath"));
}

function setpath(win) {
	if (! win) {
		settings.gamepath = cli.param("setpath");
	} else {
		dialog.showOpenDialog({properties: ["openDirectory"]}).then(res => {
			settings.gamepath = res.filePaths[0];
			settings.zip = path.join(settings.gamepath + "/northstar.zip");
			saveSettings();
			win.webContents.send("newpath", settings.gamepath);
		}).catch(err => {console.error(err)})
	}

	fs.writeFileSync(app.getPath("appData") + "/viper.json", JSON.stringify(settings));
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

function update() {
	for (let i = 0; i < settings.excludes.length; i++) {
		let exclude = path.join(settings.gamepath + "/" + settings.excludes[i]);
		if (fs.existsSync(exclude)) {
			fs.renameSync(exclude, exclude + ".excluded")
		}
	}

	ipcMain.emit("ns-updating");
	console.log(lang("cli.update.checking"));
	var version = getNSVersion();

	request({
		json: true,
		headers: {"User-Agent": "Viper"},
		url: "https://api.github.com/repos/R2Northstar/Northstar/releases/latest",
	}, (error, response, body) => {
		var tag = body["tag_name"];

		if (version === tag) {
			ipcMain.emit("ns-updated");
			console.log(lang("cli.update.uptodate"), version);

			winLog(lang("gui.update.uptodate"));
			return;
		} else {
			if (version != "unknown") {
				console.log(lang("cli.update.current"), version);
			}; console.log(lang("cli.update.downloading") + ":", tag);

			winLog(lang("gui.update.downloading"));
		}

		https.get(body.assets[0].browser_download_url, (res) => {
			let stream = fs.createWriteStream(settings.zip);
			res.pipe(stream);
			stream.on("finish", () => {
				stream.close();
				winLog(lang("gui.update.extracting"));
				console.log(lang("cli.update.downloaddone"));
				fs.createReadStream(settings.zip).pipe(unzip.Extract({path: settings.gamepath}))
				.on("finish", () => {
					fs.writeFileSync(path.join(settings.gamepath, "ns_version.txt"), tag);
					ipcMain.emit("getversion");

					for (let i = 0; i < settings.excludes.length; i++) {
						let exclude = path.join(settings.gamepath + "/" + settings.excludes[i]);
						if (fs.existsSync(exclude + ".excluded")) {
							fs.renameSync(exclude + ".excluded", exclude)
						}
					}

					ipcMain.emit("ns-updated");
					winLog(lang("gui.update.finished"));
					console.log(lang("cli.update.finished"));
					cli.exit();
				});
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
			exec(path.join(settings.gamepath + "/Titanfall2.exe"))
			break;
		default:
			console.log(lang("general.launching"), "Northstar...")
			exec(path.join(settings.gamepath + "/NorthstarLauncher.exe"))
			break;
	}
}

function winLog(msg) {
	ipcMain.emit("winLog", msg, msg);
}

let modpath = path.join(settings.gamepath, "R2Northstar/mods");
const mods = {
	list: () => {
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
		files = fs.readdirSync(disabledPath)
		files.forEach((file) => {
			if (fs.statSync(path.join(disabledPath, file)).isDirectory()) {
				if (fs.existsSync(path.join(disabledPath, file, "mod.json"))) {
					try {
						disabled.push({...require(path.join(disabledPath, file, "mod.json")), FolderName: file, Disabled: true})
					}catch(err) {
						console.log("error: " + lang("cli.mods.improperjson"), file)
						disabled.push({Name: file, FolderName: file, Version: "unknown", Disabled: false})
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
		let list = mods.list().all;

		for (let i = 0; i < list.length; i++) {
			if (list[i].Name == mod) {
				return list[i];
			} else {continue}
		}

		return false;
	},
	install: (mod) => {
		if (fs.statSync(mod).isDirectory()) {
			if (fs.statSync(path.join(mod, "mod.json"))) {
				copy(mod, path.join(modpath, mod.replace(/^.*(\\|\/|\:)/, "")), {
					mode: true,
					cover: true,
					utimes: true,
				}, (err) => {
					if(err) {console.log("error:", err)};
					console.log();
				});
				cli.exit();
				return
			} else {
				console.log("error: " + lang("cli.mods.notamod"))
				cli.exit(1);
				return;
			}
		}

		fs.createReadStream(mod).pipe(unzip.Extract({path: modpath}))
		.on("finish", () => {
			cli.exit();
		});
	},
	remove: (mod) => {
		let modName = mods.get(mod).FolderName;
		let modPath = path.join(modpath, modName);
		if (fs.statSync(modPath).isDirectory()) {
			fs.rmSync(modPath, {recursive: true});
			cli.exit();
		} else {
			cli.exit(1);
		}
	},
	toggle: (mod) => {
		let disabled = path.join(modpath, "disabled");
		if (! fs.existsSync(disabled)) {
			fs.mkdirSync(disabled)
		}

		let modName = mods.get(mod).FolderName;
		let modPath = path.join(modpath, modName);
		let dest = path.join(disabled, modName);

		if (mods.get(mod).Disabled) {
			modPath = path.join(disabled, modName);
			dest = path.join(modpath, modName);
		}

		fs.moveSync(modPath, dest)
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
	setlang: (lang) => {
		settings.lang = lang;
		saveSettings();
	},
}
