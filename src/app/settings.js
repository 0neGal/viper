var Settings = {
	toggle: (state) => {
		if (state) {
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

		options.scrollTo(0, 0);
		overlay.classList.toggle("shown")
		options.classList.toggle("shown")
	},
	apply: () => {},
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
	}
}

Settings.reloadSwitches();

