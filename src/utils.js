const fs = require("fs");
const path = require("path");
const { app, dialog, ipcMain } = require("electron");

const Emitter = require("events");
const events = new Emitter();

const cli = require("./cli");

const unzip = require("unzipper");
const request = require("request");
const { https } = require("follow-redirects");

process.chdir(app.getPath("appData"));

var settings = {
	gamepath: "",
	file: "viper.json",
	zip: "/northstar.zip",
}

if (fs.existsSync(settings.file)) {
	settings.gamepath = JSON.parse(fs.readFileSync(settings.file, "utf8")).path;
	settings.zip = path.join(settings.gamepath + "/northstar.zip");
} else {
	console.log("Game path is not set! Please select the path.");
}


function setpath(win) {
	if (! win) {
		fs.writeFileSync(app.getPath("appData") + "/viper.json", JSON.stringify({path: cli.param("setpath")}));
		settings.gamepath = cli.param("setpath");
		cli.exit();
	} else {
		dialog.showOpenDialog({properties: ["openDirectory"]}).then(res => {
			fs.writeFileSync(app.getPath("appData") + "/viper.json", JSON.stringify({path: res.filePaths[0]}));

			win.webContents.send("newpath", res.filePaths[0]);
			settings.gamepath = res.filePaths[0];
		}).catch(err => {console.error(err)})
	}
}

function update() {
	console.log("Downloading...");
	request({
		json: true,
		headers: {"User-Agent": "Viper"},
		url: "https://api.github.com/repos/R2Northstar/Northstar/releases/latest",
	}, (error, response, body) => {
		https.get(body.assets[0].browser_download_url, (res) => {
			let stream = fs.createWriteStream(settings.zip);
			res.pipe(stream);
			stream.on("finish", () => {
				stream.close();
				console.log("Download done! Extracting...");
				fs.createReadStream(settings.zip).pipe(unzip.Extract({path: settings.gamepath}))
				.on("finish", () => {
					console.log("Installation/Update finished!");
					events.emit("updated");
					cli.exit();
				});
			})
		})
	})
}

module.exports = {
	update,
	setpath,
	settings,
}
