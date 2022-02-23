var Settings = {
	toggle: (state) => {
		if (state) {
			Settings.load();
			options.scrollTo(0, 0);
			overlay.classList.add("shown")
			options.classList.add("shown")

			return
		} else if (! state) {
			if (state != undefined) {
				overlay.classList.remove("shown")
				options.classList.remove("shown")
				return
			}
		}

		Settings.load();
		options.scrollTo(0, 0);
		overlay.classList.toggle("shown")
		options.classList.toggle("shown")
	},
	apply: () => {
		settings = {...settings, ...Settings.get()};
		ipcRenderer.send("savesettings", Settings.get());
	},
	reloadSwitches: () => {
		let switches = document.querySelectorAll(".switch");

		for (let i = 0; i < switches.length; i++) {
			switches[i].setAttribute("onclick", `Settings.switch(${i})`); 
		}
	},
	switch: (element) => {
		let switches = document.querySelectorAll(".switch");
		element = switches[element];

		if (element.classList.contains("on")) {
			element.classList.add("off");
			element.classList.remove("on");
		} else {
			element.classList.add("on");
			element.classList.remove("off");
		}

		Settings.reloadSwitches();
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
	}
}

Settings.reloadSwitches();
Settings.load();
