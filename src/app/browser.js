const Fuse = require("fuse.js");
var fuse;
var packages = [];

var Browser = {
	maxentries: 50,
	filters: {
		get: () => {
			let filtered = [];
			let unfiltered = [];
			let checks = browser.querySelectorAll("#filters .check");

			for (let i = 0; i < checks.length; i++) {
				if (! checks[i].classList.contains("checked")) {
					filtered.push(checks[i].getAttribute("value"));
				} else {
					unfiltered.push(checks[i].getAttribute("value"));
				}
			}

			return {
				filtered,
				unfiltered
			};
		},
		isfiltered: (categories) => {
			let filtered = Browser.filters.get().filtered;
			let unfiltered = Browser.filters.get().unfiltered;
			let state = false;
			if (categories.length == 0) {return true}
			for (let i = 0; i < categories.length; i++) {
				if (filtered.includes(categories[i])) {
					state = true;
					continue
				} else if (unfiltered.includes(categories[i])) {
					state = false;
					continue
				}

				state = true;
			}

			return state;
		},
		toggle: (state) => {
			if (state == false) {
				filters.classList.remove("shown");
				return
			}

			filters.classList.toggle("shown");
			let filterRect = filter.getBoundingClientRect();
			let spacing = parseInt(getComputedStyle(filters).getPropertyValue("--spacing"));

			filters.style.top = filterRect.bottom - spacing;
			filters.style.right = filterRect.right - filterRect.left + filterRect.width;
		},
	},
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
				Browser.filters(false);
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
			new BrowserElFromObj(packages[i]);
		}
	},
	loading: (string) => {
		if (Browser.filters.get().unfiltered.length == 0) {
			string = "No mods found...";
		}

		if (string) {
			browserEntries.innerHTML = `<div class="loading">${string}</div>`;
		}

		if (! browserEntries.querySelector(".loading")) {
			browserEntries.innerHTML = `<div class="loading">${lang('gui.browser.loading')}</div>`;
		}
	},
	endoflist: () => {
		if (browserEntries.querySelector(".message")) {return}
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
			new BrowserElFromObj(res[i].item);
		}
	},
	setbutton: (mod, string) => {
		mod = normalize(mod);
		if (browserEntries.querySelector(`#mod-${mod}`)) {
			let elems = browserEntries.querySelectorAll(`.el#mod-${mod}`);

			for (let i = 0; i < elems.length; i++) {
				elems[i].querySelector(".text button").innerHTML = string;
			}
		} else {
			let make = (str) => {
				if (browserEntries.querySelector(`#mod-${str}`)) {
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

function BrowserElFromObj(obj) {
	let pkg = {...obj, ...obj.versions[0]};

	new BrowserEl({
		title: pkg.name,
		image: pkg.icon,
		author: pkg.owner,
		url: pkg.package_url,
		download: pkg.download_url,
		version: pkg.version_number,
		categories: pkg.categories,
		description: pkg.description
	})
}

function BrowserEl(properties) {
	if (Browser.filters.isfiltered(properties.categories)) {return}

	let entries = browser.querySelectorAll(".el").length;
	if (entries == Browser.maxentries) {Browser.endoflist();return}
	
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
		<div class="el" id="mod-${normalize(properties.title)}">
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
	Browser.filters.toggle(false);
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

browser.addEventListener("scroll", () => {
	Browser.filters.toggle(false);
})

Browser.toggle(true);
Browser.filters.toggle();

let checks = document.querySelectorAll(".check");
for (let i = 0; i < checks.length; i++) {
	checks[i].setAttribute("onclick", "this.classList.toggle('checked');Browser.loadfront();search.value = ''")
}
