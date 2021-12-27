const fs = require("fs");
const path = require("path");
const { ipcRenderer } = require("electron");

var settings = {
	gamepath: "",
	file: "viper.json",
	zip: "/northstar.zip",
}

if (fs.existsSync(settings.file)) {
	settings = {...settings, ...JSON.parse(fs.readFileSync(settings.file, "utf8"))};
	settings.zip = path.join(settings.gamepath + "/northstar.zip");
} else {
	alert("Game path is not set! Please select the path!");
	setpath();
}

function update() {ipcRenderer.send("update")}
function setpath() {ipcRenderer.send("setpath")}

function launch() {ipcRenderer.send("launch")}
function launchVanilla() {ipcRenderer.send("launchVanilla")}

ipcRenderer.on("newpath", (event, newpath) => {
	settings.gamepath = newpath;
})
