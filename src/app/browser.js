const Fuse = require("fuse.js");
var fuse;
var packages = [];

var packagecount = 0;

var Browser = {
	maxentries: 50,
	filters: {
		getpkgs: () => {
			let pkgs = [];
			let other = [];
			for (let i in packages) {
				if (! Browser.filters.isfiltered(packages[i].categories)) {
					pkgs.push(packages[i]);
				} else {
					other.push(packages[i]);
				}
			}

			return pkgs;
		},
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

			let filters = [
				"Mods", "Skins",
				"Client-side", "Server-side",
			];

			let newcategories = [];
			for (let i = 0; i < categories.length; i++) {
				if (filters.includes(categories[i])) {
					newcategories.push(categories[i]);
				}
			}; categories = newcategories;

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
			filters.style.right = filterRect.right - filterRect.left + filterRect.width - (spacing / 2);
		},
	},
	toggle: (state) => {
		if (state) {
			browser.scrollTo(0, 0);
			overlay.classList.add("shown");
			browser.classList.add("shown");

			if (browserEntries.querySelectorAll(".el").length == 0) {
				Browser.loadfront();
			}
			return
		} else if (! state) {
			if (state != undefined) {
				Browser.filters.toggle(false);
				overlay.classList.remove("shown");
				browser.classList.remove("shown");
				preview.classList.remove("shown");
				return
			}
		}

		browser.scrollTo(0, 0);
		overlay.classList.toggle("shown");
		browser.classList.toggle("shown");
	},
	loadfront: async () => {
		Browser.loading();

		packagecount = 0;
		
		if (packages.length < 1) {
			packages = await (await fetch("https://northstar.thunderstore.io/api/v1/package/")).json();

			fuse = new Fuse(packages, {
				keys: ["full_name"]
			})
		}
		
		let pkgs = Browser.filters.getpkgs();
		for (let i in pkgs) {
			if (packagecount >= Browser.maxentries) {
				Browser.endoflist();
				break
			}

			new BrowserElFromObj(pkgs[i]);
			packagecount++;
		}
	},
	loading: (string) => {
		if (Browser.filters.get().unfiltered.length == 0) {
			string = lang("gui.browser.noresults");
		}

		if (string) {
			browserEntries.innerHTML = `<div class="loading">${string}</div>`;
		}

		if (! browserEntries.querySelector(".loading")) {
			browserEntries.innerHTML = `<div class="loading">${lang('gui.browser.loading')}</div>`;
		}
	},
	endoflist: (isEnd) => {
		let pkgs = [];
		let filtered = Browser.filters.getpkgs();
		for (let i = 0; i < filtered.length; i++) {
			if ([packagecount + i]) {
				pkgs.push(filtered[packagecount + i]);
			} else {
				break
			}
		}

		if (browserEntries.querySelector(".message")) {
			browserEntries.querySelector(".message").remove();
		}

		if (pkgs.length == 0 || isEnd) {
			Browser.msg(`${lang('gui.browser.endoflist')}`);
			return
		}

		Browser.msg(`<button id="loadmore">${lang("gui.browser.loadmore")}</button>`);
		loadmore.addEventListener("click", () => {
			Browser.loadpkgs(pkgs);
			Browser.endoflist(pkgs);
		})
	},
	search: (string) => {
		Browser.loading();
		let res = fuse.search(string);

		if (res.length < 1) {
			Browser.loading(lang("gui.browser.noresults"));
			return
		}

		packagecount = 0;

		let count = 0;
		for (let i = 0; i < res.length; i++) {
			if (count >= Browser.maxentries) {break}
			if (Browser.filters.isfiltered(res[i].item.categories)) {continue}
			new BrowserElFromObj(res[i].item);
			count++;
		}

		if (count < 1) {
			Browser.loading(lang("gui.browser.noresults"));
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
	},
	loadpkgs: (pkgs, clear) => {
		if (clear) {packagecount = 0}

		if (browserEntries.querySelector(".message")) {
			browserEntries.querySelector(".message").remove();
		}

		let count = 0;
		for (let i in pkgs) {
			if (count >= Browser.maxentries) {
				if (pkgs[i] === undefined) {
					Browser.endoflist(true);
				}

				Browser.endoflist();
				break
			}

			try {
				new BrowserElFromObj(pkgs[i]);
			}catch(e) {}

			count++;
			packagecount++;
		}
	},
	msg: (html) => {
		let msg = document.createElement("div");
		msg.classList.add("message");
		msg.innerHTML = html;
		
		browserEntries.appendChild(msg);
	}
}

function openExternal(url) {
	require("electron").shell.openExternal(url);
}

var view = document.querySelector(".popup#preview webview");
var Preview = {
	show: () => {
		preview.classList.add("shown");
	},
	hide: () => {
		preview.classList.remove("shown");
	},
	set: (url, autoshow) => {
		if (autoshow != false) {Preview.show()}
		view.src = url;
		document.querySelector("#preview #external").setAttribute("onclick", `openExternal("${url}")`);
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
		description: pkg.description,
		dependencies: pkg.dependencies,
	})
}

function BrowserEl(properties) {
	if (Browser.filters.isfiltered(properties.categories)) {return}

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
	
	let entry = document.createElement("div");
	entry.classList.add("el");
	entry.id = `mod-${normalize(properties.title)}`;

	entry.innerHTML = `
		<div class="image">
			<img src="${properties.image}">
			<img class="blur" src="${properties.image}">
		</div>
		<div class="text">
			<div class="title">${properties.title}</div>
			<div class="description">${properties.description}</div>
			<button class="install" onclick='installFromURL("${properties.download}", ${JSON.stringify(properties.dependencies)}, true)'>${installstr}</button>
			<button class="info" onclick="Preview.set('${properties.url}')">${lang('gui.browser.view')}</button>
			<button class="visual">${properties.version}</button>
			<button class="visual">${lang("gui.browser.madeby")} ${properties.author}</button>
		</div>
	`

	browserEntries.appendChild(entry);
}

ipcRenderer.on("removed-mod", (event, mod) => {
	setButtons(true);
	Browser.setbutton(mod.name, lang("gui.browser.install"));
	if (mod.manifestname) {
		Browser.setbutton(mod.manifestname, lang("gui.browser.install"));
	}
})

ipcRenderer.on("failed-mod", (event, modname) => {
	setButtons(true);
	new Toast({
		timeout: 10000,
		scheme: "error",
		title: lang("gui.toast.title.failed"),
		description: lang("gui.toast.desc.failed")
	})
})

ipcRenderer.on("installed-mod", (event, mod) => {
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

	if (installqueue.length != 0) {
		installFromURL("https://thunderstore.io/package/download/" + installqueue[0]);
		installqueue.shift();
	}
})

function normalize(items) {
	let main = (string) => {
		return string.replaceAll(" ", "")
			.replaceAll(".", "").replaceAll("-", "")
			.replaceAll("_", "").toLowerCase();
	}
	if (typeof items == "string") {
		return main(items);
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

let events = ["scroll", "mousedown", "touchdown"];
events.forEach((event) => {
    browser.addEventListener(event, () => {
		Preview.hide();

		let mouseAt = document.elementsFromPoint(mouseX, mouseY);
		if (! mouseAt.includes(document.querySelector("#filter"))
			&& ! mouseAt.includes(document.querySelector(".overlay"))) {
			Browser.filters.toggle(false);
		}
	})
});

view.addEventListener("dom-ready", () => {
	let css = [
		fs.readFileSync(__dirname + "/css/theming.css", "utf8"),
		fs.readFileSync(__dirname + "/css/webview.css", "utf8")
	]

	view.insertCSS(css.join(" "));
})

view.addEventListener("did-stop-loading", () => {
	view.style.display = "flex";
	setTimeout(() => {
		view.classList.remove("loading");
	}, 200)
})

view.addEventListener("did-start-loading", () => {
	view.style.display = "none";
	view.classList.add("loading");
})

let mouseY = 0;
let mouseX = 0;
browser.addEventListener("mousemove", (event) => {
	mouseY = event.clientY;
	mouseX = event.clientX;
})

let checks = document.querySelectorAll(".check");
for (let i = 0; i < checks.length; i++) {
	checks[i].setAttribute("onclick", 
		"this.classList.toggle('checked');Browser.loadfront();search.value = ''"
	)
}
