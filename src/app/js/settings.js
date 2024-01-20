var Settings = {
	toggle: (state) => {
		Settings.load();
		options.scrollTo(0, 0);

		popups.set("#options", state);
	},
	apply: () => {
		settings = {...settings, ...Settings.get()};
		ipcRenderer.send("save-settings", Settings.get());
	},
	get: () => {
		let opts = {};
		let options = document.querySelectorAll(".option");

		for (let i = 0; i < options.length; i++) {
			let optName = options[i].getAttribute("name");
			if (options[i].querySelector(".actions input")) {
				let input = options[i].querySelector(".actions input").value;
				if (options[i].getAttribute("type")) {
					opts[optName] = input.split(" ");
				} else {
					opts[optName] = input;
				}
			} else if (options[i].querySelector(".actions select")) {
				opts[optName] = options[i].querySelector(".actions select").value;
			} else if (options[i].querySelector(".actions .switch")) {
				if (options[i].querySelector(".actions .switch.on")) {
					opts[optName] = true;
				} else {
					opts[optName] = false;
				}
			}
		}

		return opts;
	},
	load: () => {
		let options = document.querySelectorAll(".option");

		for (let i = 0; i < options.length; i++) {
			let optName = options[i].getAttribute("name");
			if (optName == "forcedlang") {
				let div = options[i].querySelector("select");

				div.innerHTML = "";
				let lang_dir = __dirname + "/../lang";
				let langs = fs.readdirSync(lang_dir);
				for (let i in langs) {
					let lang_file = require(lang_dir + "/" + langs[i]);
					let lang_no_extension = langs[i].replace(/\..*$/, "");

					if (! lang_file.lang || ! lang_file.lang.title) {
						continue;
					}

					let title = lang_file.lang.title;

					if (title) {
						div.innerHTML += `<option value="${lang_no_extension}">${title}</option>`
					}
					
				}

				div.value = settings.forcedlang;
				continue;
			}

			if (settings[optName] != undefined) {
				switch(typeof settings[optName]) {
					case "string":
						options[i].querySelector(".actions input").value = settings[optName];
						break
					case "object":
						options[i].querySelector(".actions input").value = settings[optName].join(" ");
						break
					case "boolean":
						let switchDiv = options[i].querySelector(".actions .switch");
						if (settings[optName]) {
							switchDiv.classList.add("on");
							switchDiv.classList.remove("off");
						} else {
							switchDiv.classList.add("off");
							switchDiv.classList.remove("on");
						}
						break

				}
			}
		}

		ipcRenderer.send("can-autoupdate");
		ipcRenderer.on("cant-autoupdate", () => {
			document.querySelector(".option[name=autoupdate]").style.display = "none";
		})
	},
	switch: (el, state) => {
		if (state) {
			return el.classList.add("on");
		} else if (state === false) {
			return el.classList.remove("on");
		}

		if (el.classList.contains("switch") && el.tagName == "BUTTON") {
			el.classList.toggle("on");
		}
	}
}

events.on("popup-changed", () => {
	let settings_is_shown =
		document.getElementById("options")
		.classList.contains("shown");

	let settings_btn = document.getElementById("settings");

	if (settings_is_shown) {
		settings_btn.classList.add("shown");
	} else {
		settings_btn.classList.remove("shown");
	}
})

document.body.addEventListener("click", (e) => {
	let el = document.elementFromPoint(e.clientX, e.clientY);
	Settings.switch(el);
})

Settings.load();
