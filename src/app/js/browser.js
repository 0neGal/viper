var browser_fuse;
var packages = [];

var packagecount = 0;

var mod_versions = {};

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

			filters.style.top = filterRect.bottom - (spacing + (spacing * 1.3));
			filters.style.right = filterRect.right - filterRect.left + filterRect.width - (spacing / 2);
		},
	},
	toggle: (state) => {
		browser.scrollTo(0, 0);
		popups.set("#browser", state);

		if (state) {
			if (browserEntries.querySelectorAll(".el").length == 0) {
				Browser.loadfront();
			}
		} else if (state === false) {
			Browser.filters.toggle(false);
		}
	},
	install: (package_obj, clear_queue = false) => {
		return installFromURL(
			package_obj.download || package_obj.versions[0].download_url,
			package_obj.dependencies || package_obj.versions[0].dependencies,
			clear_queue,

			package_obj.author || package_obj.owner,
			package_obj.name || package_obj.pkg.name,
			package_obj.version || package_obj.versions[0].version_number
		)
	},
	add_pkg_properties: () => {
		for (let i = 0; i < packages.length; i++) {
			let properties = packages[i];
			let normalized = normalize(packages[i].name);

			let has_update = false;
			let local_name = false;
			let local_version = false;
			let remote_version = packages[i].versions[0].version_number;
			remote_version = version.format(remote_version);

			if (modsobj) {
				for (let ii = 0; ii < modsobj.all.length; ii++) {
					let mod = modsobj.all[ii];

					if (normalize(mod.name) !== normalized && (
						! mod.package ||
						mod.package.author + "-" + mod.package.package_name !==
						packages[i].full_name
					)) {
						continue;
					}

					local_name = mod.name;
					local_version = version.format(mod.version);
					if (version.is_newer(remote_version, local_version)) {
						has_update = true;
					}
				}
			}

			let install = () => {
				return Browser.install({...properties});
			}

			packages[i].install = install;
			packages[i].has_update = has_update;
			packages[i].local_version = local_version;

			if (local_version) {
				mod_versions[normalized] = {
					install: install,
					has_update: has_update,
					local_name: local_name,
					local_version: local_version,

					package: packages[i]
				}
			}
		}
	},
	loadfront: async () => {
		Browser.loading();

		packagecount = 0;
		
		if (packages.length < 1) {
			let host = "northstar.thunderstore.io";
			let path = "/api/v1/package/";

			packages = [];

			// attempt to get the list of packages from Thunderstore, if
			// this has been done recently, it'll simply return a cached
			// version of the request
			try {
				packages = JSON.parse(
					await request(host, path, "thunderstore-packages")
				)
			}catch(err) {
				console.error(err)
			}

			Browser.add_pkg_properties();

			browser_fuse = new Fuse(packages, {
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
			string = lang("gui.browser.no_results");
		}

		if (string) {
			browserEntries.innerHTML = `<div class="loading">${string}</div>`;
		}

		if (! browserEntries.querySelector(".loading")) {
			browserEntries.innerHTML = `<div class="loading">${lang('gui.browser.loading')}</div>`;
		}
	},
	endoflist: (is_end) => {
		let pkgs = [];
		let filtered = Browser.filters.getpkgs();
		for (let i = 0; i < filtered.length; i++) {
			if (filtered[packagecount + i]) {
				pkgs.push(filtered[packagecount + i]);
			} else {
				break
			}
		}

		if (browserEntries.querySelector(".message")) {
			browserEntries.querySelector(".message").remove();
		}

		if (pkgs.length == 0 || is_end) {
			Browser.msg(`${lang('gui.browser.endoflist')}`);
			return
		}

		Browser.msg(`<button id="loadmore">` +
				`<img src="icons/down.png">` +
				`<span>${lang("gui.browser.load_more")}</span>` +
			`</button>`);

		loadmore.addEventListener("click", () => {
			Browser.loadpkgs(pkgs);
			Browser.endoflist(! pkgs.length);
		})
	},
	search: (string) => {
		Browser.loading();
		let res = browser_fuse.search(string);

		if (res.length < 1) {
			Browser.loading(lang("gui.browser.no_results"));
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
			Browser.loading(lang("gui.browser.no_results"));
		}
	},
	setbutton: (mod, string, icon) => {
		mod = normalize(mod);
		if (browserEntries.querySelector(`#mod-${mod}`)) {
			let elems = browserEntries.querySelectorAll(`.el#mod-${mod}`);

			for (let i = 0; i < elems.length; i++) {
				if (icon) {
					string = `<img src="icons/${icon}.png">` +
						`<span>${string}</span>`;
				}

				elems[i].querySelector(".text button").innerHTML = string;
			}
		} else {
			let make = (str) => {
				if (browserEntries.querySelector(`#mod-${str}`)) {
					return Browser.setbutton(str, string, icon);
				} else {
					return false;
				}
			}

			setTimeout(() => {
				for (let i = 0; i < modsobj.all.length; i++) {
					let modname = normalize(modsobj.all[i].name);
					let modfolder = normalize(modsobj.all[i].folder_name);

					if (mod.includes(modname)) {
						if (! make(modname)) {
							if (modsobj.all[i].manifest_name) {
								make(normalize(modsobj.all[i].manifest_name));
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

setInterval(Browser.add_pkg_properties, 1500);

if (navigator.onLine) {
	Browser.loadfront();
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
		pkg: pkg,
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

	let installicon = "downloads";
	let installstr = lang("gui.browser.install");
	let normalized_mods = [];

	for (let i = 0; i < modsobj.all; i++) {
		normalized_mods.push(normalize(mods_list[i].name));
	}

	if (properties.pkg.local_version) {
		installicon = "redo";
		installstr = lang("gui.browser.reinstall");

		if (properties.pkg.has_update) {
			installicon = "downloads";
			installstr = lang("gui.browser.update");
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
			<button class="install bg-blue" onclick=''>
				<img src="icons/${installicon}.png">
				<span>${installstr}</span>
			</button>
			<button class="info" onclick="Preview.set('${properties.url}')">
				<img src="icons/open.png">
				<span>${lang('gui.browser.view')}</span>
			</button>

			<button class="visual">${properties.version}</button>
			<button class="visual">
				${lang("gui.browser.made_by")}
				${properties.author}
			</button>
		</div>
	`

	entry.querySelector("button.install").addEventListener("click", () => {
		Browser.install(properties);
	})

	browserEntries.appendChild(entry);
}

let recent_toasts = {};
function add_recent_toast(name, timeout = 3000) {
	if (recent_toasts[name]) {return}

	recent_toasts[name] = true;

	setTimeout(() => {
		delete recent_toasts[name];
	}, timeout)
}

ipcRenderer.on("removed-mod", (event, mod) => {
	setButtons(true);
	Browser.setbutton(mod.name, lang("gui.browser.install"), "downloads");

	if (mod.manifest_name) {
		Browser.setbutton(mod.manifest_name, lang("gui.browser.install"), "downloads");
	}
})

ipcRenderer.on("failed-mod", (event, modname) => {
	if (recent_toasts["failed" + modname]) {return}
	add_recent_toast("failed" + modname);

	setButtons(true);
	new Toast({
		timeout: 10000,
		scheme: "error",
		title: lang("gui.toast.title.failed"),
		description: lang("gui.toast.desc.failed")
	})
})

ipcRenderer.on("legacy-duped-mod", (event, modname) => {
	if (recent_toasts["duped" + modname]) {return}
	add_recent_toast("duped" + modname);

	setButtons(true);
	new Toast({
		timeout: 10000,
		scheme: "warning",
		title: lang("gui.toast.title.duped"),
		description: modname + " " + lang("gui.toast.desc.duped")
	})
})

ipcRenderer.on("no-internet", (event, modname) => {
	setButtons(true);
	new Toast({
		timeout: 10000,
		scheme: "error",
		title: lang("gui.toast.title.no_internet"),
		description: lang("gui.toast.desc.no_internet")
	})
})

ipcRenderer.on("installed-mod", (event, mod) => {
	if (recent_toasts["installed" + mod.name]) {return}
	add_recent_toast("installed" + mod.name);

	let name = mod.fancy_name || mod.name;

	setButtons(true);
	Browser.setbutton(name, lang("gui.browser.reinstall"), "redo");

	if (mod.malformed) {
		new Toast({
			timeout: 8000,
			scheme: "warning",
			title: lang("gui.toast.title.malformed"),
			description: name + " " + lang("gui.toast.desc.malformed")
		})
	}

	new Toast({
		scheme: "success",
		title: lang("gui.toast.title.installed"),
		description: name + " " + lang("gui.toast.desc.installed")
	})

	if (installqueue.length != 0) {
		installFromURL(
			"https://thunderstore.io/package/download/" + installqueue[0].pkg,
			false, false, installqueue[0].author, installqueue[0].package_name, installqueue[0].version
		)

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
let search = document.querySelector("#browser .search");
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

let mouse_events = ["scroll", "mousedown", "touchdown"];
mouse_events.forEach((event) => {
	document.body.addEventListener(event, (e) => {
		let mouse_at = document.elementsFromPoint(mouseX, mouseY);

		if (! mouse_at.includes(document.querySelector("#preview"))) {
			Preview.hide();
		}

		if (! mouse_at.includes(document.querySelector("#filter"))
			&& ! mouse_at.includes(document.querySelector(".overlay"))) {
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
