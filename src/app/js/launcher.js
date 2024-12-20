const popups = require("./popups");
const markdown = require("marked").parse;

let launcher = {};

var servercount;
var playercount;
var masterserver;

// changes the main page, this is the tabs in the sidebar
launcher.change_page = (page) => {
	let btns = document.querySelectorAll(".gamesContainer button");
	let pages = document.querySelectorAll(".mainContainer .contentContainer");

	for (let i = 0; i < pages.length; i++) {
		pages[i].classList.add("hidden");
	}

	for (let i = 0; i < btns.length; i++) {
		btns[i].classList.add("inactive");
	}

	pages[page].classList.remove("hidden");
	btns[page].classList.remove("inactive");
	bgHolder.setAttribute("bg", page);
}; launcher.change_page(1)

launcher.format_release = (notes) => {
	if (! notes) {return ""}

	let content = "";

	if (notes.length === 1) {
		content = notes[0];
	} else {
		for (let release of notes) {
			if (release.prerelease) {continue}
			let new_content = 
				// release date
				new Date(release.published_at).toLocaleString() +
				"\n" +

				// release name
				`# ${release.name}` +
				"\n\n" +

				// actual release text/body
				release.body +
				"\n\n\n";

			content +=
				"<div class='release-block'>\n"
					+ markdown(new_content, {breaks: true}) + "\n" +
				"</div>";
		}
	
		content = content.replaceAll(/\@(\S+)/g, `<a href="https://github.com/$1">@$1</a>`);
	}

	return markdown(content, {
		breaks: true
	});
}

// sets content of `div` to a single release block with centered text
// inside it, the text being `lang(lang_key)`
launcher.error = (div, lang_key) => {
	div.innerHTML =
		"<div class='release-block'>" +
			"<p><center>" +
				lang(lang_key) +
			"</center></p>" +
		"</div>";
}

// updates the Viper release notes
ipcRenderer.on("vp-notes", (event, response) => {
	if (! response) {
		return launcher.error(
			vpReleaseNotes,
			"request.no_vp_release_notes"
		)
	}

	vpReleaseNotes.innerHTML = launcher.format_release(response);
});

// updates the Northstar release notes
ipcRenderer.on("ns-notes", (event, response) => {
	if (! response) {
		return launcher.error(
			nsRelease,
			"request.no_ns_release_notes"
		)
	}

	nsRelease.innerHTML = launcher.format_release(response);
});

launcher.load_vp_notes = async () => {
	ipcRenderer.send("get-vp-notes");	
}; launcher.load_vp_notes();

launcher.load_ns_notes = async () => {
	ipcRenderer.send("get-ns-notes");
}; launcher.load_ns_notes();

// TODO: We gotta make this more automatic instead of switch statements
// it's both not pretty, but adding more sections requires way too much
// effort, compared to how it should be.
launcher.show_vp = (section) => {
	if (!["main", "release", "info", "credits"].includes(section)) throw new Error("unknown vp section");
	vpMainBtn.removeAttribute("active");
	vpReleaseBtn.removeAttribute("active");
	vpInfoBtn.removeAttribute("active");

	vpMain.classList.add("hidden");
	vpReleaseNotes.classList.add("hidden");
	vpInfo.classList.add("hidden");

	switch(section) {
		case "main":
			vpMainBtn.setAttribute("active", "");
			vpMain.classList.remove("hidden");
			break;
		case "release":
			vpReleaseBtn.setAttribute("active", "");
			vpReleaseNotes.classList.remove("hidden");
			break;
		case "info":
			vpInfoBtn.setAttribute("active", "");
			vpInfo.classList.remove("hidden");
			break;
	}
}

launcher.show_ns = (section) => {
	if (! ["main", "release", "mods"].includes(section)) {
		throw new Error("unknown ns section");
	}

	nsMainBtn.removeAttribute("active");
	nsModsBtn.removeAttribute("active");
	nsReleaseBtn.removeAttribute("active");

	nsMain.classList.add("hidden");
	nsMods.classList.add("hidden");
	nsRelease.classList.add("hidden");

	switch(section) {
		case "main":
			nsMainBtn.setAttribute("active", "");
			nsMain.classList.remove("hidden");
			break;
		case "mods":
			nsModsBtn.setAttribute("active", "");
			nsMods.style.display = "block";
			nsMods.classList.remove("hidden");
			break;
		case "release":
			nsReleaseBtn.setAttribute("active", "");
			nsRelease.classList.remove("hidden");
			break;
	}
}

// changes the active section on the currently active
// `.contentContainer` in the direction specified
//
// `direction` can be: left or right
launcher.relative_section = (direction) => {
	// prevent switching section if a popup is open
	if (popups.open_list().length) {
		return;
	}

	// the `.contentMenu` in the currently active tab
	let active_menu = document.querySelector(
		".contentContainer:not(.hidden) .contentMenu"
	)

	// get the currently active section
	let active_section = active_menu.querySelector("[active]");

	// no need to do anything, if there's somehow no active section
	if (! active_section) {return}

	// these will be filled out
	let prev_section, next_section;

	// get list of all the sections
	let sections = active_menu.querySelectorAll("li");

	for (let i = 0; i < sections.length; i++) {
		if (sections[i] != active_section) {
			continue;
		}

		// make `next_section` be the next element in `sections`
		next_section = sections[i + 1];

		// if we're at the first iteration, use the last element in
		// `sections` as the previous section, otherwise make it the
		// element before this iteration
		if (i == 0) {
			prev_section = sections[sections.length - 1];
		} else {
			prev_section = sections[i - 1];
		}
	}

	let new_section;

	// if we're going left, and a previous section was found, click it
	if (direction == "left" && prev_section) {
		new_section = prev_section;
	} else if (direction == "right") {
		// click the next section, if one was found, otherwise just
		// assume that the first section is the next section, as the
		// active section is likely just the last section, so we wrap
		// around instead
		if (next_section) {
			new_section = next_section;
		} else if (sections[0]) {
			new_section = sections[0];
		}
	}

	if (new_section) {
		new_section.click();

		// if there's an active selection, we select the new section, as
		// that selection may be in a section that's now hidden
		if (document.querySelector(".active-selection")) {
			navigate.selection(new_section);
		}
	}
}

launcher.check_servers = async () => {
	serverstatus.classList.add("checking");

	try {
		let host = "northstar.tf";
		let path = "/client/servers";

		// ask the masterserver for the list of servers, if this has
		// been done recently, it'll simply return the cached version
		let servers = JSON.parse(
			await request(host, path, "ns-servers", false)
		)

		masterserver = true;

		playercount = 0;
		servercount = servers.length;

		for (let i = 0; i < servers.length; i++) {
			playercount += servers[i].playerCount
		}
	}catch (err) {
		playercount = 0;
		servercount = 0;
		masterserver = false;
	}

	serverstatus.classList.remove("checking");

	if (servercount == 0 || ! servercount || ! playercount) {masterserver = false}

	let playerstr = lang("gui.server.players");
	if (playercount == 1) {
		playerstr = lang("gui.server.player");
	}

	if (masterserver) {
		serverstatus.classList.add("up");
		serverstatus.innerHTML = `${servercount} ${lang("gui.server.servers")} - ${playercount} ${playerstr}`;
	} else {
		serverstatus.classList.add("down");
		serverstatus.innerHTML = lang("gui.server.offline");

	}
}; launcher.check_servers()

// refreshes every 5 minutes
setInterval(() => {
	launcher.check_servers();
}, 300000)

module.exports = launcher;
