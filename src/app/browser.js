const Fuse = require("fuse.js");
var fuse;
var packages = [];

var Browser = {
	maxentries: 50,
	toggle: (state) => {
		if (state) {
			browser.scrollTo(0, 0);
			overlay.classList.add("shown")
			browser.classList.add("shown")

			if (browserEntries.querySelectorAll(".el").length == 0) {
				Browser.loadfront();
			}
			return
		} else if (! state) {
			if (state != undefined) {
				overlay.classList.remove("shown")
				browser.classList.remove("shown")
				return
			}
		}

		browser.scrollTo(0, 0);
		overlay.classList.toggle("shown")
		browser.classList.toggle("shown")
	},
	loadfront: async () => {
		Browser.loading();
		
		if (packages.length < 1) {
			packages = await (await fetch("https://northstar.thunderstore.io/api/v1/package/")).json();

			fuse = new Fuse(packages, {
				keys: ["full_name"]
			})
		}
		
		for (let i in packages) {
			if (i == Browser.maxentries) {Browser.endoflist();break}
			new BrowserElFromObj(packages[i]);
		}
	},
	loading: (string) => {
		if (string) {
			browserEntries.innerHTML = `<div class="loading">${string}</div>`;
		}

		if (! browserEntries.querySelector(".loading")) {
			browserEntries.innerHTML = `<div class="loading">${lang('gui.browser.loading')}</div>`;
		}
	},
	endoflist: () => {
		browserEntries.innerHTML += `<div class="message">${lang('gui.browser.endoflist')}</div>`
	},
	search: (string) => {
		Browser.loading();
		let res = fuse.search(string);

		if (res.length < 1) {
			Browser.loading("No results...")
			return
		}

		for (let i = 0; i < res.length; i++) {
			if (i == Browser.maxentries) {Browser.endoflist();break}
			new BrowserElFromObj(res[i].item);
		}
	},
	setbutton: (mod, string) => {
		mod = normalize(mod);
		if (document.getElementById(mod)) {
			let elems = document.querySelectorAll(`#${mod}`);

			for (let i = 0; i < elems.length; i++) {
				elems[i].querySelector(".text button").innerHTML = string;
			}
		} else {
			let make = (str) => {
				if (document.getElementById(str)) {
					return Browser.setbutton(str, string);
				} else {
					return false;
				}
			}

			setTimeout(() => {
				for (let i = 0; i < modsobj.all.length; i++) {
					let modname = normalize(modsobj.all[i].Name);
					let modfolder = normalize(modsobj.all[i].FolderName);

					if (mod.includes(modname)) {
						if (! make(modname)) {
							if (modsobj.all[i].ManifestName) {
								make(normalize(modsobj.all[i].ManifestName));
							}
						}
					}
					else if (mod.includes(modfolder)) {make(modfolder);break}
				}
			}, 1501)
		}
	}
}

document.body.addEventListener("keyup", (e) => {
	if (e.key == "Escape") {Browser.toggle(false)}
})

function BrowserElFromObj(obj) {
	let pkg = {...obj, ...obj.versions[0]};

	new BrowserEl({
		title: pkg.name,
		image: pkg.icon,
		author: pkg.owner,
		url: pkg.package_url,
		download: pkg.download_url,
		version: pkg.version_number,
		description: pkg.description
	})
}

function BrowserEl(properties) {
	properties = {
		title: "No name",
		version: "1.0.0",
		image: "icons/no-image.png",
		author: "Unnamed Pilot",
		description: "No description",
		...properties
	}

	if (properties.version[0] != "v") {
		properties.version = "v" + properties.version;
	}

	if (browserEntries.querySelector(".loading")) {
		browserEntries.innerHTML = "";
	}

	let installstr = lang("gui.browser.install");

	if (normalize(modsdiv.innerText.split("\n")).includes(normalize(properties.title))) {
		installstr = lang("gui.browser.reinstall");

		for (let i = 0; i < modsobj.all.length; i++) {
			if (normalize(modsobj.all[i].Name) == normalize(properties.title)
				&& "v" + modsobj.all[i].Version != properties.version) {
				
				installstr = lang("gui.browser.update");
			}
		}
	} else {
		for (let i = 0; i < modsobj.all.length; i++) {
			let title = normalize(properties.title);
			let folder = normalize(modsobj.all[i].FolderName);
			let manifestname = null;
			if (modsobj.all[i].ManifestName) {
				manifestname = normalize(modsobj.all[i].ManifestName);
			}

			if (title.includes(folder) || title.includes(manifestname)) {
				installstr = lang("gui.browser.reinstall");

				if (folder == title
					&& "v" + modsobj.all[i].Version != properties.version) {
					
					installstr = lang("gui.browser.update");
				}
			}
		}
	}

	browserEntries.innerHTML += `
		<div class="el" id="${normalize(properties.title)}">
			<div class="image">
				<img src="${properties.image}">
			</div>
			<div class="text">
				<div class="title">${properties.title}</div>
				<div class="description">${properties.description}</div>
				<button onclick="installFromURL('${properties.download}')">${installstr}</button>
				<button onclick="require('electron').shell.openExternal('${properties.url}')">${lang('gui.browser.info')}</button>
				<button class="visual">${properties.version}</button>
				<button class="visual">${lang("gui.browser.madeby")} ${properties.author}</button>
			</div>
		</div>
	`
}

ipcRenderer.on("removedmod", (event, mod) => {
	setButtons(true);
	Browser.setbutton(mod.name, lang("gui.browser.install"));
	if (mod.manifestname) {
		Browser.setbutton(mod.manifestname, lang("gui.browser.install"));
	}
})

ipcRenderer.on("failedmod", (event, modname) => {
	setButtons(true);
	new Toast({
		timeout: 10000,
		scheme: "error",
		title: lang("gui.toast.title.failed"),
		description: lang("gui.toast.desc.failed")
	})
})

ipcRenderer.on("installedmod", (event, mod) => {
	setButtons(true);
	Browser.setbutton(mod.name, lang("gui.browser.reinstall"));

	if (mod.malformed) {
		new Toast({
			timeout: 8000,
			scheme: "warning",
			title: lang("gui.toast.title.malformed"),
			description: mod.name + " " + lang("gui.toast.desc.malformed")
		})
	}

	new Toast({
		scheme: "success",
		title: lang("gui.toast.title.installed"),
		description: mod.name + " " + lang("gui.toast.desc.installed")
	})
})

function normalize(items) {
	let main = (string) => {
		return string.replaceAll(" ", "").replaceAll(".", "").replaceAll("-", "").replaceAll("_", "").toLowerCase()
	}
	if (typeof items == "string") {
		return main(items)
	} else {
		let newArray = [];
		for (let i = 0; i < items.length; i++) {
			newArray.push(main(items[i]));
		}

		return newArray;
	}
}

let searchtimeout;
let searchstr = "";
search.addEventListener("keyup", () => {
	clearTimeout(searchtimeout);

	if (searchstr != search.value) {
		if (search.value.replaceAll(" ", "") == "") {
			searchstr = "";
			Browser.loadfront();
			return
		}

		searchtimeout = setTimeout(() => {
			Browser.search(search.value);
			searchstr = search.value;
		}, 500)
	}
})
