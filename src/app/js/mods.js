var mods = {};

mods.load = (mods_obj) => {
	modcount.innerHTML = `${lang("gui.mods.count")} ${mods_obj.all.length}`;

	let normalized_names = [];
	
	let set_mod = (mod) => {
		let normalized_name = "mod-list-" + normalize(mod.Name);

		normalized_names.push(normalized_name);

		let el = document.getElementById(normalized_name);
		if (el) {
			if (mod.Disabled) {
				el.querySelector(".switch").classList.remove("on");
			} else {
				el.querySelector(".switch").classList.add("on");
			}

			return;
		}

		let div = document.createElement("div");
		div.classList.add("el");
		div.id = normalized_name;

		div.innerHTML += `
			<div class="image">
				<img src="">
				<img class="blur" src="">
			</div>
			<div class="text">
				<div class="title">${mod.Name}</div>
				<div class="description">${mod.Description}</div>
				<button class="switch on orange"></button>
				<button class="update bg-blue">
					${lang("gui.browser.update")}
				</button>
				<button class="bg-red" onclick="mods.remove('${mod.Name}')">
					${lang("gui.mods.remove")}
				</button>

				<button class="visual">${version.format(mod.Version)}</button>
				<button class="visual">
					${lang("gui.browser.madeby")}
					${mod.Author || lang("gui.mods.unknown_author")}
				</button>
			</div>
		`;

		if (mod.Disabled) {
			div.querySelector(".switch").classList.remove("on");
		}

		div.querySelector(".switch").addEventListener("click", () => {
			mods.toggle(mod.Name);
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

		if (mod_versions[mod]) {
			let image_url = mod_versions[mod].package.versions[0].icon;

			let image_container = mod_els[i].querySelector(".image");
			let image_el = image_container.querySelector("img")
			let image_blur_el = image_container.querySelector("img.blur")

			if (image_url && ! image_el.getAttribute("src")) {
				image_container.style.display = null;
				image_el.src = image_url;
				image_blur_el.src = image_url;

				image_container.parentElement.classList.add("has-icon");
			}
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
			
			mod_els[i].remove();
			modsdiv.querySelector(".line").after(mod_el);
		} else {
			mod_els[i].querySelector(".update").style.display = "none";
		}
	}
}

mods.remove = (mod) => {
	if (mod.match(/^northstar\./)) {
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
	if (mod.match(/^Northstar\./)) {
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
