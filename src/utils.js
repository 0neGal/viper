const fs = require("fs");
const path = require("path");
const { app, dialog, ipcMain } = require("electron");

const Emitter = require("events");
const events = new Emitter();

const cli = require("./cli");

const unzip = require("unzipper");
const request = require("request");
const exec = require("child_process").spawn;
const { https } = require("follow-redirects");

process.chdir(app.getPath("appData"));

var settings = {
	gamepath: "",
	zip: "/northstar.zip",
	northstarVersion: "unknown",
	excludes: [
		"ns_startup_args.txt",
		"ns_startup_args_dedi.txt"
	]
}

if (fs.existsSync("viper.json")) {
	settings = {...settings, ...JSON.parse(fs.readFileSync("viper.json", "utf8"))};
	settings.zip = path.join(settings.gamepath + "/northstar.zip");
} else {
	console.log("Game path is not set! Please select the path.");
}


function setpath(win) {
	if (! win) {
		settings.gamepath = cli.param("setpath");
	} else {
		dialog.showOpenDialog({properties: ["openDirectory"]}).then(res => {
			settings.gamepath = res.filePaths[0];
			settings.zip = path.join(settings.gamepath + "/northstar.zip");

			win.webContents.send("newpath", settings.gamepath);
		}).catch(err => {console.error(err)})
	}

	fs.writeFileSync(app.getPath("appData") + "/viper.json", JSON.stringify({...settings}));
	cli.exit();
}

function saveSettings() {
	fs.writeFileSync(app.getPath("appData") + "/viper.json", JSON.stringify({...settings}));
}

function getNorthstarInstalledVersion() {
	const configFilePath = app.getPath("appData") + "/viper.json";
	return JSON.parse(fs.readFileSync(configFilePath, "utf8"))['northstarVersion'];
}

function update() {
	for (let i = 0; i < settings.excludes.length; i++) {
		let exclude = path.join(settings.gamepath + "/" + settings.excludes[i]);
		if (fs.existsSync(exclude)) {
			fs.renameSync(exclude, exclude + ".excluded")
		}
	}

	console.log("Downloading...");
	const version = getNorthstarInstalledVersion();
	console.log(version);

	request({
		json: true,
		headers: {"User-Agent": "Viper"},
		url: "https://api.github.com/repos/R2Northstar/Northstar/releases/latest",
	}, (error, response, body) => {
		const tag = body['tag_name'];
		console.log(tag);

		https.get(body.assets[0].browser_download_url, (res) => {
			let stream = fs.createWriteStream(settings.zip);
			res.pipe(stream);
			stream.on("finish", () => {
				stream.close();
				console.log("Download done! Extracting...");
				fs.createReadStream(settings.zip).pipe(unzip.Extract({path: settings.gamepath}))
				.on("finish", () => {
					console.log("Installation/Update finished!");
					settings.northstarVersion = tag;
					saveSettings();
					events.emit("updated");

					for (let i = 0; i < settings.excludes.length; i++) {
						let exclude = path.join(settings.gamepath + "/" + settings.excludes[i]);
						if (fs.existsSync(exclude + ".excluded")) {
							fs.renameSync(exclude + ".excluded", exclude)
						}
					}

					cli.exit();
				});
			})
		})
	})
}

function launch(version) {
	if (process.platform == "linux") {
		console.error("error: Launching the game is not currently supported on Linux")
		cli.exit(1);
	}

	process.chdir(settings.gamepath);
	switch(version) {
		case "vanilla":
			console.log("Launching Vanilla...")
			exec(path.join(settings.gamepath + "/Titanfall2.exe"))
			break;
		default:
			console.log("Launching Northstar...")
			exec(path.join(settings.gamepath + "/NorthstarLauncher.exe"))
			break;
	}
}

module.exports = {
	launch,
	update,
	setpath,
	settings,
}
