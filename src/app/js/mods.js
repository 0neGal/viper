var mods = {};

mods.load = (mods_obj) => {
	modcount.innerHTML = `${lang("gui.mods.count")} ${mods_obj.all.length}`;

	let normalized_names = [];
	
	let set_mod = (mod) => {
		let image_url = "";
		let normalized_name = "mod-list-" + normalize(mod.Name);

		normalized_names.push(normalized_name);

		if (document.getElementById(normalized_name)) {
			return;
		}

		let div = document.createElement("div");
		div.classList.add("el");
		div.id = normalized_name;

		div.innerHTML += `
			<div class="image">
				<img src="${image_url}">
				<img class="blur" src="${image_url}">
			</div>
			<div class="text">
				<div class="title">${mod.Name}</div>
				<div class="description">${mod.Description}</div>
				<button class="red" onclick="mods.remove('${mod.Name}')">Remove</button>
				<button class="visual">${mod.Version}</button>
				<button class="visual">by ${mod.Author || "Unknown"}</button>
			</div>
		`;

		if (! image_url) {
			div.querySelector(".image").remove();
		}

		modsdiv.append(div);
	}

	for (let i = 0; i < mods_obj.all.length; i++) {
		set_mod(mods_obj.all[i]);
	}

	let mod_els = document.querySelectorAll("#modsdiv .el");
	for (let i = 0; i < mod_els.length; i++) {
		if (! normalized_names.includes(mod_els[i].id)) {
			mod_els[i].remove();
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
