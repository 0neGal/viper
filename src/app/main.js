const fs = require("fs");
const path = require("path");
const { ipcRenderer, shell } = require("electron");

const lang = require("../lang");
var modsobj = {};
let shouldInstallNorthstar = false;

// Base settings
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

// Sets the lang to the system default
ipcRenderer.send("setlang", settings.lang);

// Loads the settings
if (fs.existsSync("viper.json")) {
	settings = {...settings, ...JSON.parse(fs.readFileSync("viper.json", "utf8"))};
	settings.zip = path.join(settings.gamepath + "/northstar.zip");

	if (settings.gamepath.length === 0) {
		setpath(false);
	} else {
		setpath(true);
	}
} else {
	setpath();
}

function exit() {ipcRenderer.send("exit")}
function update() {ipcRenderer.send("update")}

// Reports to the main process about game path status.
// @param {boolean} value is game path loaded
function setpath(value = false) {
	ipcRenderer.send("setpath", value);
}

// Tells the main process to launch or install Northstar
function launch() {
	if (shouldInstallNorthstar) {
		update();
		shouldInstallNorthstar = false;
	} else {
		ipcRenderer.send("launch");
	}
}

// Tells the main process to launch the vanilla game
function launchVanilla() {ipcRenderer.send("launchVanilla")}

// In conjunction with utils.js' winLog(), it'll send log messages in
// the devTools from utils.js
function log(msg) {
	console.log(msg);
}

// Disables or enables certain buttons when for example
// updating/installing Northstar.
function setButtons(state) {
	playNsBtn.disabled = !state;

	let disablearray = (array) => {
		for (let i = 0; i < array.length; i++) {
			array[i].disabled = !state;
		}
	}

	disablearray(document.querySelectorAll("#nsMods .buttons.modbtns button"))
	disablearray(document.querySelectorAll("#browser #browserEntries .text button"))
}

// Frontend part of updating Northstar
ipcRenderer.on("ns-update-event", (event, key) => {
	document.getElementById("update").innerText = `(${lang(key)})`;
	console.log(key);
	switch(key) {
		case "cli.update.uptodate.short":
			setButtons(true);
			playNsBtn.innerText = lang("gui.launch");
			break;
		default:
			setButtons(false);
			break;
	}
});

let lastselected = "";
function select(entry) {
	let entries = document.querySelectorAll("#modsdiv .mod .modtext");

	for (let i = 0; i < entries.length; i++) {
		if (entries[i].innerHTML == entry) {
			lastselected = entry;
			entries[i].parentElement.classList.add("selected");
		} else {
			entries[i].parentElement.classList.remove("selected");
		}
	}
}

// Mod selection
function selected(all) {
	let selected = "";
	if (all) {
		selected = "allmods"
	} else {
		selected = document.querySelector(".mod.selected .modtext");
		if (selected != null) {
			selected = selected.innerHTML;
		} else {
			alert(lang("gui.mods.nothingselected"));
			return {
				remove: () => {},
				toggle: () => {},
			}
		}
	}

	return {
		remove: () => {

			if (selected.match(/^Northstar\./)) {
				if (! confirm(lang("gui.mods.required.confirm"))) {
					return;
				}
			} else if (selected == "allmods") {
				if (! confirm(lang("gui.mods.removeall.confirm"))) {
					return;
				}
			}

			ipcRenderer.send("removemod", selected)
		},
		toggle: () => {
			if (selected.match(/^Northstar\./)) {
				if (! confirm(lang("gui.mods.required.confirm"))) {
					return;
				}
			} else if (selected == "allmods") {
				if (! confirm(lang("gui.mods.toggleall.confirm"))) {
					return;
				}
			}

			ipcRenderer.send("togglemod", selected)
		}
	}
}

// Tells the main process to install a mod
function installmod() {
	setButtons(false);
	ipcRenderer.send("installmod")
}

// Tells the main process to install a mod from a URL
function installFromURL(url) {
	setButtons(false);
	ipcRenderer.send("installfromurl", url)
}

// Frontend part of settings a new game path
ipcRenderer.on("newpath", (event, newpath) => {
	settings.gamepath = newpath;
	ipcRenderer.send("guigetmods");
})

// Continuation of log()
ipcRenderer.on("log", (event, msg) => {log(msg)})
ipcRenderer.on("alert", (event, msg) => {alert(msg)})

// Updates the installed mods
ipcRenderer.on("mods", (event, mods) => {
	modsobj = mods;
	if (! mods) {return}

	modcount.innerHTML = `${lang("gui.mods.count")} ${mods.all.length}`;
	modsdiv.innerHTML = "";
	
	let newmod = (name, disabled) => {
		if (disabled) {
			disabled  = `<span class="disabled">${lang("gui.mods.disabledtag")}</span>`
		} else {
			disabled  = ""
		}

		modsdiv.innerHTML += `<div onclick="select('${name}')" class="mod"><span class="modtext">${name}</span>${disabled}</div>`;
	}

	for (let i = 0; i < mods.enabled.length; i++) {newmod(mods.enabled[i].Name)}
	for (let i = 0; i < mods.disabled.length; i++) {newmod(mods.disabled[i].Name, " - Disabled")}

	select(lastselected);
})

// Updates version numbers
ipcRenderer.on("version", (event, versions) => {
	vpversion.innerText = versions.vp;
	nsversion.innerText = versions.ns;
	tf2Version.innerText = versions.tf2;

	if (versions.ns == "unknown") {
		let buttons = document.querySelectorAll(".modbtns button");

		for (let i = 0; i < buttons.length; i++) {
			buttons[i].disabled = true;
		}

		// Since Northstar is not installed, we cannot launch it
		shouldInstallNorthstar = true;
		playNsBtn.innerText = lang("gui.installnorthstar");
	}
}); ipcRenderer.send("getversion");

// When an update is available it'll ask the user about it
ipcRenderer.on("updateavailable", () => {
	if (confirm(lang("gui.update.available"))) {
		ipcRenderer.send("updatenow");
	}
})

// Error out when no game path is set
ipcRenderer.on("nopathselected", () => {
	alert(lang("gui.gamepath.must"));
	exit();
});

// Error out when game path is wrong
ipcRenderer.on("wrongpath", () => {
	alert(lang("gui.gamepath.wrong"));
	setpath(false);
});

setlang();

document.body.addEventListener("click", event => {
	if (event.target.tagName.toLowerCase() === "a" && event.target.protocol != "file:") {
		event.preventDefault();
		shell.openExternal(event.target.href);
	}
});
