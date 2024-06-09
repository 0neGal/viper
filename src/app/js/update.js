const ipcRenderer = require("electron").ipcRenderer;

const lang = require("../../lang");

// updates version numbers
ipcRenderer.on("version", (event, versions) => {
	vpversion.innerText = versions.vp;
	nsversion.innerText = versions.ns;
	tf2Version.innerText = versions.tf2;

	if (versions.ns == "unknown") {
		let buttons = document.querySelectorAll(".modbtns button");

		for (let i = 0; i < buttons.length; i++) {
			buttons[i].disabled = true;
		}

		// since Northstar is not installed, we cannot launch it
		update.ns.should_install = true;
		playNsBtn.innerText = lang("gui.install");
	}
}); ipcRenderer.send("get-version");

// when an update is available it'll ask the user about it
ipcRenderer.on("update-available", () => {
	if (confirm(lang("gui.update.available"))) {
		ipcRenderer.send("update-now");
	}
})

// frontend part of updating Northstar
ipcRenderer.on("ns-update-event", (event, options) => {
	let key = options.key;
	if (typeof options == "string") {
		key = options;
	}

	// updates text in update button to `lang(key)`
	let update_btn = () => {
		document.getElementById("update")
			.innerText = `(${lang(key)})`;
	}

	switch(key) {
		case "cli.update.uptodate_short":
		case "cli.update.no_internet":
			// initial value
			let delay = 0;

			// get current time
			let now = new Date().getTime();

			// check if `update.ns.last_checked` was less than 500ms
			// since now, this variable is set when `update.ns()` is
			// called
			if (now - update.ns.last_checked < 500) {
				// if less than 500ms has passed, set `delay` to the
				// amount of milliseconds missing until we've hit that
				// 500ms threshold
				delay = 500 - (now - update.ns.last_checked);
			}

			// request up-to-date version numbers
			ipcRenderer.send("get-version");

			// wait `delay`ms
			setTimeout(() => {
				// set buttons accordingly
				update_btn();
				set_buttons(true);
				update.ns.progress(false);
				playNsBtn.innerText = lang("gui.launch");
			}, delay)

			break;
		default:
			update_btn();

			if (options.progress) {
				update.ns.progress(options.progress);
			}

			if (options.btn_text) {
				playNsBtn.innerText = options.btn_text;
			}

			set_buttons(false);
			break;
	}
})

let update = {
	// deletes install and update cache
	delete_cache: () => {
		ipcRenderer.send("delete-install-cache");
	},

	// updates Northstar, `force_update` forcefully updates Northstar,
	// causing it to update, even if its already up-to-date
	ns: (force_update) => {
		update.ns.last_checked = new Date().getTime();
		ipcRenderer.send("update-northstar", force_update);
		update.ns.should_install = false;
	}
}

// should Northstar be updated?
update.ns.should_install = false;

// when was the last time we checked for a Northstar update
update.ns.last_checked = new Date().getTime();

// `percent` should be a number between 0 to 100, if it's `false` it'll
// reset it back to nothing instantly, with no animation
update.ns.progress = (percent) => {
	// reset button progress
	if (percent === false) {
		document.querySelector(".contentContainer #nsMain .playBtn")
			.style.setProperty("--progress", "unset");

		return;
	}

	percent = parseInt(percent);

	// make sure we're dealing with a number
	if (isNaN(percent) || typeof percent !== "number") {
		return false;
	}

	// limit percent, while this barely has a difference, if you were to
	// set a very high number, the CSS would then use a very high
	// number, not great.
	if (percent > 100) {
		percent = 100;
	} else if (percent < 0) {
		percent = 0;
	}

	// invert number to it works in the CSS
	percent = 100 - percent;

	// set the CSS progress variable
	document.querySelector(".contentContainer #nsMain .playBtn")
		.style.setProperty("--progress", percent + "%");
}

module.exports = update;
