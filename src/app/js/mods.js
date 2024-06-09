const ipcRenderer = require("electron").ipcRenderer;

const lang = require("../../lang");

const version = require("./version");
const set_buttons = require("./set_buttons");

let mods = {};

let mods_list = {
	all: [],
	enabled: [],
	disabled: []
}

// returns the list of mods
mods.list = () => {
	return mods_list;
}

mods.load = (mods_obj) => {
	modcount.innerHTML = `${lang("gui.mods.count")} ${mods_obj.all.length}`;

	let normalized_names = [];

	let set_mod = (mod) => {
		let name = mod.name;
		if (mod.package) {
			name = mod.package.package_name;
		}

		let normalized_name = "mod-list-" + mods.normalize(name);

		normalized_names.push(normalized_name);

		let el = document.getElementById(normalized_name);
		if (el) {
			if (mod.disabled) {
				el.querySelector(".switch").classList.remove("on");
			} else {
				el.querySelector(".switch").classList.add("on");
			}

			return;
		}

		let div = document.createElement("div");
		div.classList.add("el");
		div.id = normalized_name;

		let mod_details = {
			name: mod.name,
			version: mod.version,
			description: mod.description
		}

		if (mod.package) {
			mod_details = {
				image: mod.package.icon,
				name: mod.package.manifest.name,
				version: mod.package.manifest.version_number,
				description: mod.package.manifest.description
			}
		}

		div.innerHTML += `
			<div class="image">
				<img src="${mod_details.image || ""}">
				<img class="blur" src="">
			</div>
			<div class="text">
				<div class="title">${mod_details.name}</div>
				<div class="description">${mod_details.description}</div>
				<button class="switch on orange"></button>
				<button class="update bg-blue">
					<img src="icons/downloads.png">
					<span>${lang("gui.browser.update")}</span>
				</button>
				<button class="bg-red remove">
					<img src="icons/trash.png">
					<span>${lang("gui.mods.remove")}</span>
				</button>

				<button class="visual">${version.format(mod_details.version)}</button>
				<button class="visual">
					${lang("gui.browser.made_by")}
					${mod.author || lang("gui.mods.unknown_author")}
				</button>
			</div>
		`;

		if (mod_details.name.match(/^Northstar\..*/)) {
			div.querySelector("img").src = "icons/northstar.png"
		}

		div.querySelector(".remove").onclick = () => {
			if (! mod.package) {
				return mods.remove(mod.name);
			}

			for (let i = 0; i < mod.packaged_mods.length; i++) {
				mods.remove(mod.packaged_mods[i]);
			}
		}

		if (mod.disabled) {
			div.querySelector(".switch").classList.remove("on");
		}

		div.querySelector(".switch").addEventListener("click", () => {
			if (! mod.package) {
				return mods.toggle(mod.name);
			}

			for (let i = 0; i < mod.packaged_mods.length; i++) {
				mods.toggle(mod.packaged_mods[i]);
			}
		})

		div.querySelector(".image").style.display = "none";

		modsdiv.append(div);
	}

	for (let i = 0; i < mods_obj.all.length; i++) {
		set_mod(mods_obj.all[i]);
	}

	let mod_els = document.querySelectorAll("#modsdiv .el");
	let mod_update_els = [];

	for (let i = 0; i < mod_els.length; i++) {
		let update_btn = mod_els[i].querySelector(".update");

		if (update_btn && update_btn.style.display != "none") {
			mod_update_els.push(mod_els[i].id);
		} else {
			break;
		}
	}

	for (let i = 0; i < mod_els.length; i++) {
		let mod = mod_els[i].id.replace(/^mod-list-/, "");

		if (! normalized_names.includes(mod_els[i].id)) {
			mod_els[i].remove();
			return;
		}

		let image_container = mod_els[i].querySelector(".image");
		let image_el = image_container.querySelector("img")
		let image_blur_el = image_container.querySelector("img.blur")

		if (browser.mod_versions[mod]) {
			image_el.src = browser.mod_versions[mod].package.versions[0].icon;
		}

		if (image_el.getAttribute("src") &&
			! image_container.parentElement.classList.contains("has-icon")) {

			let image_src = image_el.getAttribute("src");

			image_blur_el.src = image_src;
			image_container.style.display = null;

			image_container.parentElement.classList.add("has-icon");
		}

		if (browser.mod_versions[mod]
			&& browser.mod_versions[mod].has_update) {

			mod_els[i].querySelector(".update").style.display = null;

			mod_els[i].querySelector(".update").setAttribute(
				"onclick", `browser.mod_versions["${mod}"].install()`
			)

			if (mod_update_els.includes(mod_els[i].id)) {
				continue;
			}

			let mod_el = mod_els[i].cloneNode(true);

			// copy click event of the remove button to the new button
			mod_el.querySelector(".remove").onclick =
				mod_els[i].querySelector(".remove").onclick;

			mod_el.classList.add("no-animation");

			mod_el.querySelector(".switch").addEventListener("click", () => {
				if (browser.mod_versions[mod].local_name) {
					mods.toggle(browser.mod_versions[mod].local_name);
				}
			})

			mod_els[i].remove();
			modsdiv.querySelector(".line").after(mod_el);
		} else {
			mod_els[i].querySelector(".update").style.display = "none";
		}
	}
}

mods.remove = (mod) => {
	if (mod.toLowerCase().match(/^northstar\./)) {
		if (! confirm(lang("gui.mods.required_confirm"))) {
			return;
		}
	} else if (mod == "allmods") {
		if (! confirm(lang("gui.mods.remove_all_confirm"))) {
			return;
		}
	}

	ipcRenderer.send("remove-mod", mod);
}

mods.toggle = (mod) => {
	if (mod.toLowerCase().match(/^northstar\./)) {
		if (! confirm(lang("gui.mods.required_confirm"))) {
			return;
		}
	} else if (mod == "allmods") {
		if (! confirm(lang("gui.mods.toggle_all_confirm"))) {
			return;
		}
	}

	ipcRenderer.send("toggle-mod", mod);
}

mods.install_queue = [];

// tells the main process to install a mod through the file selector
mods.install_prompt = () => {
	set_buttons(false);
	ipcRenderer.send("install-mod");
}

// tells the main process to directly install a mod from this path
mods.install_from_path = (path) => {
	set_buttons(false);
	ipcRenderer.send("install-from-path", path);
}

// tells the main process to install a mod from a URL
mods.install_from_url = (url, dependencies, clearqueue, author, package_name, version) => {
	if (clearqueue) {mods.install_queue = []};

	let prettydepends = [];

	if (dependencies) {
		let newdepends = [];
		for (let i = 0; i < dependencies.length; i++) {
			let depend = dependencies[i].toLowerCase();
			if (! depend.match(/northstar-northstar-.*/)) {
				depend = dependencies[i].replaceAll("-", "/");
				let pkg = depend.split("/");
				if (! mods.is_installed(pkg[1])) {
					newdepends.push({
						pkg: depend,
						author: pkg[0],
						version: pkg[2],
						package_name: pkg[1]
					});

					prettydepends.push(`${pkg[1]} v${pkg[2]} - ${lang("gui.browser.made_by")} ${pkg[0]}`);
				}
			}
		}

		dependencies = newdepends;
	} 

	if (dependencies && dependencies.length != 0) {
		let confirminstall = confirm(lang("gui.mods.confirm_dependencies") + prettydepends.join("\n"));
		if (! confirminstall) {
			return;
		}
	}

	set_buttons(false);
	ipcRenderer.send("install-from-url", url, author, package_name, version);

	if (dependencies) {
		mods.install_queue = dependencies;
	}
}

mods.is_installed = (modname) => {
	for (let i = 0; i < mods.list().all.length; i++) {
		let mod = mods.list().all[i];
		if (mod.manifest_name) {
			if (mod.manifest_name.match(modname)) {
				return true;
			}
		} else if (mod.name.match(modname)) {
			return true;
		}
	}

	return false;
}

mods.normalize = (items) => {
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

// updates the installed mods
ipcRenderer.on("mods", (event, mods_obj) => {
	mods_list = mods_obj;
	if (! mods_obj) {return}

	mods.load(mods_obj);
})

module.exports = mods;
