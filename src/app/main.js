const fs = require("fs");
const path = require("path");
const { ipcRenderer } = require("electron");

const lang = require("../lang");

var settings = {
	gamepath: "",
	autoupdate: true,
	zip: "/northstar.zip",
	lang: navigator.language,
	excludes: [
		"ns_startup_args.txt",
		"ns_startup_args_dedi.txt"
	]
}

ipcRenderer.send("setlang", settings.lang);

if (fs.existsSync("viper.json")) {
	settings = {...settings, ...JSON.parse(fs.readFileSync("viper.json", "utf8"))};
	settings.zip = path.join(settings.gamepath + "/northstar.zip");
} else {
	alert(lang("general.missingpath"));
	setpath();
}

function exit() {ipcRenderer.send("exit")}
function update() {ipcRenderer.send("update")}
function setpath() {ipcRenderer.send("setpath")}

function launch() {ipcRenderer.send("launch")}
function launchVanilla() {ipcRenderer.send("launchVanilla")}

function log(msg) {
	console.log(msg);
	welcome.innerHTML = msg;
}

function setButtons(state) {
	let buttons = document.querySelectorAll("button");

	for (let i = 0; i < buttons.length; i++) {
		buttons[i].disabled = !state;
	}
}

ipcRenderer.on("ns-updated", () => {setButtons(true)})
ipcRenderer.on("ns-updating", () => {setButtons(false)})

ipcRenderer.on("newpath", (event, newpath) => {
	settings.gamepath = newpath;
})

ipcRenderer.on("log", (event, msg) => {log(msg)})

ipcRenderer.on("version", (event, versions) => {
	vpversion.innerText = lang("gui.versions.viper") + ": " + versions.vp;
	nsversion.innerText = lang("gui.versions.northstar") + ": " + versions.ns;
}); ipcRenderer.send("getversion");

ipcRenderer.on("updateavailable", () => {
	if (confirm(lang("gui.update.available"))) {
		ipcRenderer.send("updatenow");
	}
})

setlang();
setInterval(() => {
	ipcRenderer.send("setsize", document.querySelector(".lines").offsetHeight + 20);
}, 150);
