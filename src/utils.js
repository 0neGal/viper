const fs = require("fs");
const path = require("path");
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

function getInstalledVersion() {
	const versionFilePath = path.join(settings.gamepath, "ns_version.txt");

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
	const version = getInstalledVersion();

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

module.exports = {
	winLog,
	launch,
	update,
	setpath,
	settings,
	setlang: (lang) => {
		settings.lang = lang;
		saveSettings();
	},
}
