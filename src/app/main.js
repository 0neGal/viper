const fs = require("fs");
const path = require("path");
const { ipcRenderer } = require("electron");

const lang = require("../lang");

var settings = {
	gamepath: "",
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
	alert(lang("gui.missinggamepath"));
	setpath();
}

function exit() {ipcRenderer.send("exit")}
function update() {ipcRenderer.send("update")}
function setpath() {ipcRenderer.send("setpath")}

function launch() {ipcRenderer.send("launch")}
function launchVanilla() {ipcRenderer.send("launchVanilla")}

ipcRenderer.on("newpath", (event, newpath) => {
	settings.gamepath = newpath;
})
