const fs = require("fs");
const path = require("path");
const { ipcRenderer, shell } = require("electron");

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

	if (settings.gamepath.length === 0) {
		alert(lang("general.missingpath"));
		setpath(false);
	} else {
		setpath(true);
	}
} else {
	alert(lang("general.missingpath"));
	setpath();
}

function exit() {ipcRenderer.send("exit")}
function update() {ipcRenderer.send("update")}

/**
 * Reports to the main thread about game path status.
 * @param {boolean} value is game path loaded
 */
function setpath(value = false) {
	ipcRenderer.send("setpath", value);
}

function launch() {ipcRenderer.send("launch")}
function launchVanilla() {ipcRenderer.send("launchVanilla")}

function log(msg) {
	console.log(msg);
	// welcome.innerHTML = msg;
}

function setButtons(state) {
	let buttons = document.querySelectorAll("button");

	for (let i = 0; i < buttons.length; i++) {
		buttons[i].disabled = !state;
	}
}

ipcRenderer.on('ns-update-event', (_, key) => {
	document.getElementById('update').innerText = `(${lang(key)})`;
	console.log(key);
	switch(key) {
		case 'cli.update.uptodate.short':
			setButtons(true);
			break;
		default:
			setButtons(false);
			break;
	}
});

ipcRenderer.on("newpath", (event, newpath) => {
	settings.gamepath = newpath;
})

ipcRenderer.on("log", (event, msg) => {log(msg)})
ipcRenderer.on("version", (event, versions) => {
	document.getElementById('vpversion').innerText = versions.vp;
	document.getElementById('nsversion').innerText = versions.ns;
	document.getElementById('ttf2Version').innerText = versions.ttf2;
}); ipcRenderer.send("getversion");

ipcRenderer.on("updateavailable", () => {
	if (confirm(lang("gui.update.available"))) {
		ipcRenderer.send("updatenow");
	}
})

ipcRenderer.on("nopathselected", () => {
	alert(lang("gui.gamepath.must"));
	exit();
});

setlang();

document.body.addEventListener('click', event => {
	if (event.target.tagName.toLowerCase() === 'a' && event.target.protocol != 'file:') {
	  event.preventDefault();
	  shell.openExternal(event.target.href);
	}
  });