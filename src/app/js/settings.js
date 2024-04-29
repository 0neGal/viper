var settings_fuse;

var Settings = {
	default: {settings},
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
		// re-opens any closed categories
		let categories = document.querySelectorAll("#options details");
		for (let i = 0; i < categories.length; i++) {
			categories[i].setAttribute("open", true);

			// hide categories that aren't for the current platform
			let for_platform = categories[i].getAttribute("platform");
			if (for_platform && process.platform != for_platform) {
				categories[i].style.display = "none";
				categories[i].setAttribute("perma-hidden", true);
			}
		}

		let options = document.querySelectorAll(".option");

		for (let i = 0; i < options.length; i++) {
			// hide options that aren't for the current platform
			let for_platform = options[i].getAttribute("platform");
			if (for_platform && process.platform != for_platform) {
				options[i].style.display = "none";
				options[i].setAttribute("perma-hidden", true);
			}

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
				// check if setting has a `<select>`
				let select_el = options[i].querySelector(".actions select");
				if (select_el) {
					// get `<option>` for settings value, if it exists
					let option = select_el.querySelector(
						`option[value="${settings[optName]}"]`
					)

					// check if it exists
					if (option) {
						// set the `<select>` to the settings value
						select_el.value = settings[optName];
					} else { // use the default value
						select_el.value = Settings.default[optName];
					}

					continue;
				}

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

		// create Fuse based on options from `get_search_arr()`
		settings_fuse = new Fuse(get_search_arr(), {
			keys: ["text"],
			threshold: 0.4,
			ignoreLocation: true
		})

		// reset search
		Settings.search();
		search_el.value = "";

		ipcRenderer.send("can-autoupdate");
		ipcRenderer.on("cant-autoupdate", () => {
			document.querySelector(".option[name=autoupdate]")
				.style.display = "none";

			document.querySelector(".option[name=autoupdate]")
				.setAttribute("perma-hidden", true);
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
	},

	// searches for `query` in the list of options, hides the options
	// that dont match, and shows the one that do, if `query` is falsy,
	// it'll simply reset everything back to being visible
	search: (query = "") => {
		// get list of elements that can be hidden
		let search_els = [
			...document.querySelectorAll(".options .title"),
			...document.querySelectorAll(".options .option"),
			...document.querySelectorAll(".options .buttons"),
			...document.querySelectorAll(".options .details"),
		]

		// this sets the visibility of all elements found in
		// `search_els` unless the element has the `perma-hidden`
		// attribute set
		let set_all = (state) => {
			// set `state` to the CSS equivalent
			if (state) {
				state = null;
			} else {
				state = "none";
			}

			// run through elements
			for (let i = 0; i < search_els.length; i++) {
				// check that the element shouldn't be perma hidden, and
				// if so, hide it correctly.
				if (search_els[i].hasAttribute("perma-hidden")) {
					search_els[i].style.display = "none";
					continue;
				}

				// set the visibility
				search_els[i].style.display = state;
			}
		}

		// check if `query` is empty, and reset search if so
		if (! query || ! query.trim()) {
			set_all(true);
		} else {
			// hide everything
			set_all(false);
		}

		// unhides `el` and relevant elements related to it
		let unhide = (el) => {
			// list of elements that could be relevant through `el`'s
			// `.closest()` function
			let closest = [
				".option",
				"details",
				".buttons",
			]

			// run through `closest`
			for (let i = 0; i < closest.length; i++) {
				// shorthand
				let closest_el = el.closest(closest[i]);

				// was a relevant element found?
				if (closest_el) {
					// is it supposed to always be hidden? do nothing
					if (el.hasAttribute("perma-hidden")
						|| closest_el.hasAttribute("perma-hidden")) {

						break;
					}

					// reset visibility
					closest_el.style.display = null;

					// are we at a `<details>`?
					if (closest[i] == "details") {
						// attempt to get a `.title` inside that
						// `<details>` element
						let title = closest_el.querySelector(".title");

						// did we find a title?
						if (title) {
							// reset visibility of title and also reset
							// open state of `<details>`
							title.style.display = null;
							closest_el.setAttribute("open", false);
						}
					}
				}
			}
		}

		// do a Fuse.js search with `query`
		let res = settings_fuse.search(query);

		// if nothing was found, reset all
		if (res.length == 0) {
			return set_all(true);
		}

		// run through results and unhide all of them
		for (let i = 0; i < res.length; i++) {
			unhide(res[i].item.el);
		}
	}
}

// search on key events in search input
let search_el = document.body.querySelector("#options .search");
search_el.addEventListener("keyup", () => {
	Settings.search(search_el.value);
})

// returns a Fuse.js compatible Array for searching through the settings
function get_search_arr() {
	// list of elements that should be taken into consideration when
	// trying to do a search
	let searchables_queries = [
		".option .text",
		".buttons .text",
		".option .actions input",
		".option .actions select",
		".buttons .actions button:not(.switch)",
	]

	let searchables_els = [];

	// run through queries
	for (let i = 0; i < searchables_queries.length; i++) {
		// attempt to get element(s) with that query
		let query = document.querySelectorAll(
			".options " + searchables_queries[i]
		)

		// if something was found add it
		searchables_els = [
			...query,
			...searchables_els
		]
	}

	let searchables = [];

	// run through the found elements
	for (let i = 0; i < searchables_els.length; i++) {
		let el = searchables_els[i];
		switch(el.tagName.toLowerCase()) {
			// is this an `<input>`?
			case "input":
				// if no value is in the input, do nothing
				if (! el.value) {
					continue;
				}

				// add to list of searchable elements, using the value
				// of the input as the text
				searchables.push({
					el: el,
					text: el.value
				})
				break;

			// is this a `<select>`?
			case "select":
				// get options in `<select>`
				let options = el.children;

				// run through options
				for (let ii = 0; ii < options.length; ii++) {
					// add to list of searchable elements, using the
					// insides of the option as the text, and the
					// element being the `<select>` and not the
					// `<option>`!
					searchables.push({
						el: el,
						text: options[ii].innerText
					})
				}
				break;

			default:
				// add to list of searchable elements using the insides
				// of the element as the text
				searchables.push({
					el: el,
					text: el.innerText
				})
		}
	}

	// return the actual searchable elements and text
	return searchables;
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
