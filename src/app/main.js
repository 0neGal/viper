const fs = require("fs");
const path = require("path");
const unzip = require("unzipper");
const request = require("request");
const { ipcRenderer } = require("electron");
const { https } = require("follow-redirects");

var settings = {
	gamepath: "",
	file: "viper.json",
	zip: "/northstar.zip",
}

if (fs.existsSync(settings.file)) {
	settings.gamepath = JSON.parse(fs.readFileSync(settings.file, "utf8")).path;
	settings.zip = path.join(settings.gamepath + "/northstar.zip");
} else {
	alert("Game path is not set! Please select the path!");
	setpath();
}

function update() {
	request({
		json: true,
		headers: {"User-Agent": navigator.userAgent},
		url: "https://api.github.com/repos/R2Northstar/Northstar/releases/latest",
	}, (error, response, body) => {
		https.get(body.assets[0].browser_download_url, (res) => {
			let stream = fs.createWriteStream(settings.zip);
			res.pipe(stream);
			stream.on("finish",() => {
				stream.close();
				console.log("download done");
				fs.createReadStream(settings.zip).pipe(unzip.Extract({path: settings.gamepath}))
				.on("finish", () => {
					alert("Installation finished!")
				});
			})
		})
	})
}

function setpath() {
	ipcRenderer.send("setpath");
}

ipcRenderer.on("newpath", (event, newpath) => {
	settings.gamepath = newpath;
})
