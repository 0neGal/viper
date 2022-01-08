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
	welcome.innerHTML = msg;
}

function setButtons(state) {
	let buttons = document.querySelectorAll("button");

	for (let i = 0; i < buttons.length; i++) {
		buttons[i].disabled = !state;
	}
}

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
			if (selected == "allmods") {
				if (! confirm(lang("gui.mods.removeall.confirm"))) {
					return;
				}
			}

			ipcRenderer.send("removemod", selected)
		},
		toggle: () => {
			ipcRenderer.send("togglemod", selected)
		}
	}
}

function installmod() {
	ipcRenderer.send("installmod")
}

ipcRenderer.on("ns-updated", () => {setButtons(true)})
ipcRenderer.on("ns-updating", () => {setButtons(false)})

ipcRenderer.on("newpath", (event, newpath) => {
	settings.gamepath = newpath;
})

ipcRenderer.on("log", (event, msg) => {log(msg)})
ipcRenderer.on("alert", (event, msg) => {alert(msg)})

ipcRenderer.on("mods", (event, mods) => {
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

ipcRenderer.on("version", (event, versions) => {
	vpversion.innerText = lang("gui.versions.viper") + ": " + versions.vp;
	nsversion.innerText = lang("gui.versions.northstar") + ": " + versions.ns;

	if (versions.ns == "unknown") {
		let buttons = document.querySelectorAll(".modbtns button");

		for (let i = 0; i < buttons.length; i++) {
			buttons[i].disabled = true;
		}
	}
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

ipcRenderer.on("wrongpath", () => {
	alert(lang("gui.gamepath.wrong"));
	setpath(false);
});

setlang();
setInterval(() => {
	ipcRenderer.send("setsize", document.querySelector(".lines").offsetHeight + 20);
}, 150);
