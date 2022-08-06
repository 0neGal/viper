const fs = require("fs");
const path = require("path");
const { ipcRenderer, shell } = require("electron");

const lang = require("../lang");
var modsobj = {};
let shouldInstallNorthstar = false;

// Base settings
var settings = {
	nsargs: "",
	gamepath: "",
	nsupdate: true,
	autolang: true,
	forcedlang: "en",
	autoupdate: true,
	originkill: false,
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
	let conf = fs.readFileSync("viper.json", "utf8");
	let json = {};

	// Validates viper.json
	try {
		json = JSON.parse(conf);
	}catch (e) {
		let reset = confirm(lang("general.invalidconfig", navigator.language) + e);
		if (! reset) {
			ipcRenderer.send("exit");
		} else {
			fs.writeFileSync("viper.json", "{}");
			ipcRenderer.send("relaunch");
		}
		
	}

	settings = {...settings, ...json};
	settings.zip = path.join(settings.gamepath + "/northstar.zip");

	if (settings.gamepath.length === 0) {
		setpath(false);
	} else {
		setpath(true);
	}

	let args = path.join(settings.gamepath, "ns_startup_args.txt");
	if (fs.existsSync(args)) {
		settings.nsargs = fs.readFileSync(args, "utf8");
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
		ipcRenderer.send("launch-ns");
	}
}

// Tells the main process to launch the vanilla game
function launchVanilla() {ipcRenderer.send("launch-vanilla")}

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

	disablearray(document.querySelectorAll(".playBtnContainer .playBtn"));
	disablearray(document.querySelectorAll("#nsMods .buttons.modbtns button"));
	disablearray(document.querySelectorAll("#browser #browserEntries .text button"));
}

ipcRenderer.on("set-buttons", (event, state) => {
	setButtons(state);
})

ipcRenderer.on("gamepath-lost", (event, state) => {
	page(0);
	setButtons(false);
	alert(lang("gui.gamepath.lost"));
})

// Frontend part of updating Northstar
ipcRenderer.on("ns-update-event", (event, key) => {
	document.getElementById("update").innerText = `(${lang(key)})`;
	console.log(lang(key));
	switch(key) {
		case "cli.update.uptodate.short":
		case "cli.update.noInternet":
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

			ipcRenderer.send("remove-mod", selected);
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

			ipcRenderer.send("toggle-mod", selected);
		}
	}
}

let installqueue = [];

// Tells the main process to install a mod through the file selector
function installmod() {
	setButtons(false);
	ipcRenderer.send("install-mod");
}

// Tells the main process to directly install a mod from this path
function installFromPath(path) {
	setButtons(false);
	ipcRenderer.send("install-from-path", path);
}

// Tells the main process to install a mod from a URL
function installFromURL(url, dependencies, clearqueue) {
	if (clearqueue) {installqueue = []};

	let prettydepends = [];

	if (dependencies) {
		let newdepends = [];
		for (let i = 0; i < dependencies.length; i++) {
			let depend = dependencies[i].toLowerCase();
			if (! depend.match(/northstar-northstar-.*/)) {
				depend = dependencies[i].replaceAll("-", "/");
				let pkg = depend.split("/");
				if (! isModInstalled(pkg[1])) {
					newdepends.push(depend);
					prettydepends.push(`${pkg[1]} v${pkg[2]} - ${lang("gui.browser.madeby")} ${pkg[0]}`);
				}
			}
		}

		dependencies = newdepends;
	} 

	if (dependencies && dependencies.length != 0) {
		let confirminstall = confirm(lang("gui.mods.confirmdependencies") + prettydepends.join("\n"));
		if (! confirminstall) {
			return
		}
	}

	setButtons(false);
	ipcRenderer.send("install-from-url", url, dependencies);

	if (dependencies) {
		installqueue = dependencies;
	}
}

function isModInstalled(modname) {
	for (let i = 0; i < modsobj.all.length; i++) {
		let mod = modsobj.all[i];
		if (mod.ManifestName) {
			if (mod.ManifestName.match(modname)) {
				return true;
			}
		} else if (mod.Name.match(modname)) {
			return true;
		}
	}

	return false;
}

// Frontend part of settings a new game path
ipcRenderer.on("newpath", (event, newpath) => {
	settings.gamepath = newpath;
	ipcRenderer.send("gui-getmods");
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
}); ipcRenderer.send("get-version");

// When an update is available it'll ask the user about it
ipcRenderer.on("update-available", () => {
	if (confirm(lang("gui.update.available"))) {
		ipcRenderer.send("update-now");
	}
})

// Error out when no game path is set
ipcRenderer.on("no-path-selected", () => {
	alert(lang("gui.gamepath.must"));
	exit();
});

// Error out when game path is wrong
ipcRenderer.on("wrong-path", () => {
	alert(lang("gui.gamepath.wrong"));
	setpath(false);
});

setlang();

let dragtimer;
document.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
	dragUI.classList.add("shown");

	clearTimeout(dragtimer);
	dragtimer = setTimeout(() => {
		dragUI.classList.remove("shown");
	}, 5000)
});

document.addEventListener("mouseover", (e) => {
	clearTimeout(dragtimer);
	dragUI.classList.remove("shown");
});

document.addEventListener("drop", (e) => {
    event.preventDefault();
    event.stopPropagation();

	dragUI.classList.remove("shown");
	installFromPath(event.dataTransfer.files[0].path);
});

document.body.addEventListener("keyup", (e) => {
	if (e.key == "Escape") {
		Browser.toggle(false);
		Settings.toggle(false);
	}
})

document.body.addEventListener("click", event => {
	if (event.target.tagName.toLowerCase() === "a" && event.target.protocol != "file:") {
		event.preventDefault();
		shell.openExternal(event.target.href);
	}
});
