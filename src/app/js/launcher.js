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
