var mods = {};

mods.load = (mods_obj) => {
	modcount.innerHTML = `${lang("gui.mods.count")} ${mods_obj.all.length}`;

	let normalized_names = [];
	
	let set_mod = (mod) => {
		let name = mod.name;
		if (mod.package) {
			name = mod.package.package_name;
		}

		let normalized_name = "mod-list-" + normalize(name);

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
					${lang("gui.browser.update")}
				</button>
				<button class="bg-red remove">
					${lang("gui.mods.remove")}
				</button>

				<button class="visual">${version.format(mod_details.version)}</button>
				<button class="visual">
					${lang("gui.browser.madeby")}
					${mod.author || lang("gui.mods.unknown_author")}
				</button>
			</div>
		`;

		div.querySelector(".remove").addEventListener("click", () => {
			if (! mod.package) {
				return mods.remove(mod.name);
			}

			for (let i = 0; i < mod.packaged_mods.length; i++) {
				mods.remove(mod.packaged_mods[i]);
			}
		})

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

		if (mod_versions[mod]) {
			image_el.src = mod_versions[mod].package.versions[0].icon;
		}

		if (image_el.getAttribute("src") &&
			! image_container.parentElement.classList.contains("has-icon")) {

			let image_src = image_el.getAttribute("src");

			image_blur_el.src = image_src;
			image_container.style.display = null;

			image_container.parentElement.classList.add("has-icon");
		}

		if (mod_versions[mod]
			&& mod_versions[mod].has_update) {

			mod_els[i].querySelector(".update").style.display = null;

			mod_els[i].querySelector(".update").setAttribute(
				"onclick", `mod_versions["${mod}"].install()`
			)

			if (mod_update_els.includes(mod_els[i].id)) {
				continue;
			}

			let mod_el = mod_els[i].cloneNode(true);

			mod_el.classList.add("no-animation");

			mod_el.querySelector(".switch").addEventListener("click", () => {
				if (mod_versions[mod].local_name) {
					mods.toggle(mod_versions[mod].local_name);
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
		if (! confirm(lang("gui.mods.required.confirm"))) {
			return;
		}
	} else if (mod == "allmods") {
		if (! confirm(lang("gui.mods.removeall.confirm"))) {
			return;
		}
	}

	ipcRenderer.send("remove-mod", mod);
}

mods.toggle = (mod) => {
	if (mod.toLowerCase().match(/^northstar\./)) {
		if (! confirm(lang("gui.mods.required.confirm"))) {
			return;
		}
	} else if (mod == "allmods") {
		if (! confirm(lang("gui.mods.toggleall.confirm"))) {
			return;
		}
	}

	ipcRenderer.send("toggle-mod", mod);
}
