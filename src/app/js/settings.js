const fs = require("fs");
const Fuse = require("fuse.js");
const ipcRenderer = require("electron").ipcRenderer;

const lang = require("../../lang");

const events = require("./events");
const popups = require("./popups");

let settings_fuse;

// base settings, and future set settings data
let settings_data = {
	nsargs: "",
	gamepath: "",
	nsupdate: true,
	autolang: true,
	forcedlang: "en",
	autoupdate: true,
	originkill: false,
	zip: "/northstar.zip",
	lang: navigator.language,
	excludes: [
		"ns_startup_args.txt",
		"ns_startup_args_dedi.txt"
	]
}

// loads the settings
if (fs.existsSync("viper.json")) {
	let iteration = 0;

	// loads the config file, it's loaded in an interval like this in
	// case the config file is currently being written to, if we were to
	// read from the file during that, then it'd be empty or similar.
	//
	// and because of that, we check if the file is empty when loading
	// it, if so we wait 100ms, then check again, and we keep doing that
	// hoping it'll become normal again. unless we've checked it 50
	// times, then we simply give up, and force the user to re-select
	// the gamepath, as this'll make the config file readable again.
	//
	// ideally it'll never have to check those 50 times, it's only in
	// case something terrible has gone awry, like if a write got
	// interrupted, or a user messed with the file.
	//
	// were it to truly be broken, then it'd take up to 5 seconds to
	// then reset, this is basically nothing, especially considering
	// this should only happen in very rare cases... hopefully!
	let config_interval = setInterval(() => {
		let gamepath = require("./gamepath");

		iteration++;

		config = json("viper.json") || {};

		// checks whether `settings_data.gamepath` is set, and if so,
		// it'll attempt to load ns_startup_args.txt
		let parse_settings = () => {
			// if gamepath is not set, attempt to set it
			if (settings_data.gamepath.length === 0) {
				gamepath.set(false);
			} else {
				// if the gamepath is set, we'll simply tell the main
				// process about it, and it'll then show the main
				// renderer BrowserWindow
				gamepath.set(true);
			}

			// filepath to Northstar's startup args file
			let args = path.join(settings_data.gamepath, "ns_startup_args.txt");

			// check file exists, and that no `nsargs` setting was set
			if (! settings_data.nsargs && fs.existsSync(args)) {
				// load arguments from file into `settings`
				settings_data.nsargs = fs.readFileSync(args, "utf8") || "";
			}
		}

		// make sure config isn't empty
		if (Object.keys(config).length !== 0) {
			// add `config` to `settings`
			settings.set(config);
			parse_settings();

			clearInterval(config_interval);
			return;
		}

		// we've attempted to load the config 50 times now, give up
		if (iteration >= 50) {
			// request a new gamepath be set
			gamepath.set(false);
			clearInterval(config_interval);
		}
	}, 100)
} else {
	require("./gamepath").set();
}

ipcRenderer.on("changed-settings", (e, new_settings) => {
	// attempt to set `settings_data` to `new_settings`
	try {
		settings.set(new_settings);
	}catch(e) {}
})

let settings = {
	data: () => {return settings_data},

	// asks the main process to reset the config/settings file
	reset: () => {
		ipcRenderer.send("reset-config");
	},

	// merges `object` with `settings_data`, unless `no_merge` is set,
	// then it replaces it entirely
	set: (object, no_merge) => {
		if (no_merge) {
			settings_data = object;
			return;
		}

		settings_data = {
			...settings_data,
			...object
		}
	},

	popup: {}
}

settings.popup.toggle = (state) => {
	settings.popup.load();
	options.scrollTo(0, 0);

	popups.set("#options", state);
}

settings.popup.apply = () => {
	settings = {...settings, ...settings.popup.get()};
	ipcRenderer.send("save-settings", settings.popup.get());
}

settings.popup.get = () => {
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
}

settings.popup.load = () => {
	// re-opens any closed categories
	let categories = document.querySelectorAll("#options details");
	for (let i = 0; i < categories.length; i++) {
		categories[i].setAttribute("open", true);
	}

	let options = document.querySelectorAll(".option");

	for (let i = 0; i < options.length; i++) {
		let optName = options[i].getAttribute("name");
		if (optName == "forcedlang") {
			let div = options[i].querySelector("select");

			div.innerHTML = "";
			let lang_dir = __dirname + "/../../lang";
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

			div.value = settings_data.forcedlang;
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

	// create Fuse based on options from `get_search_arr()`
	settings_fuse = new Fuse(get_search_arr(), {
		keys: ["text"],
		threshold: 0.4,
		ignoreLocation: true
	})

	// reset search
	settings.popup.search();
	search_el.value = "";

	ipcRenderer.send("can-autoupdate");
	ipcRenderer.on("cant-autoupdate", () => {
		document.querySelector(".option[name=autoupdate]")
			.style.display = "none";

		document.querySelector(".option[name=autoupdate]")
			.setAttribute("perma-hidden", true);
	})
}

settings.popup.switch = (el, state) => {
	if (state) {
		return el.classList.add("on");
	} else if (state === false) {
		return el.classList.remove("on");
	}

	if (el.classList.contains("switch") && el.tagName == "BUTTON") {
		el.classList.toggle("on");
	}
}

// searches for `query` in the list of options, hides the options
// that dont match, and shows the one that do, if `query` is falsy,
// it'll simply reset everything back to being visible
settings.popup.search = (query = "") => {
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

// search on key events in search input
let search_el = document.body.querySelector("#options .search");
search_el.addEventListener("keyup", () => {
	settings.popup.search(search_el.value);
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
	settings.popup.switch(el);
})

settings.popup.load();

// sets the lang to the system default
ipcRenderer.send("setlang", settings_data.lang);

module.exports = settings;
