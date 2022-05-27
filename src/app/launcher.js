const markdown = require("marked").parse;

var servercount;
var playercount;
var masterserver;

// Changes the main page
// This is the tabs in the sidebar
function page(page) {
	let pages = document.querySelectorAll(".mainContainer .contentContainer")
	let btns = document.querySelectorAll(".gamesContainer button")

	for (let i = 0; i < pages.length; i++) {
		pages[i].classList.add("hidden");
	}

	for (let i = 0; i < btns.length; i++) {
		btns[i].classList.add("inactive");
	}

	pages[page].classList.remove("hidden");
	btns[page].classList.remove("inactive");
	bgHolder.setAttribute("bg", page);
}; page(1)

function formatRelease(notes) {
	let content = "";

	for (let release of notes) {
		if (release.prerelease) {continue}
		content += "# " + release.name + "\n\n"	+ release.body + "\n\n\n";
	}

	content = content.replaceAll(/\@(\S+)/g, `<a href="https://github.com/$1">@$1</a>`);

	return markdown(content, {
		breaks: true
	});
}

// Updates the Viper release notes
ipcRenderer.on("vp-notes", (event, response) => {
	vpReleaseNotes.innerHTML = formatRelease(response);
});

// Updates the Northstar release notes
ipcRenderer.on("ns-notes", (event, response) => {
	nsRelease.innerHTML = formatRelease(response);
});

async function loadVpReleases() {
	ipcRenderer.send("get-vp-notes");	
}; loadVpReleases();

async function loadNsReleases() {
	ipcRenderer.send("get-ns-notes");
}; loadNsReleases();

// TODO: We gotta make this more automatic instead of switch statements
// it's both not pretty, but adding more sections requires way too much
// effort, compared to how it should be.
function showVpSection(section) {
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

function showNsSection(section) {
	if (!["main", "release", "mods"].includes(section)) throw new Error("unknown ns section");
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

async function loadServers() {
	serverstatus.classList.add("checking");

	try {
		let servers = await (await fetch("https://northstar.tf/client/servers/")).json();
		masterserver = true;
	}catch (err) {
		playercount = 0;
		servercount = 0;
		masterserver = false;
	}

	serverstatus.classList.remove("checking");

	if (servercount == 0) {masterserver = false}

	if (masterserver) {
		serverstatus.classList.add("up");
		// servercount and playercount don't actually get set anywhere,
		// the reason for this is, while writing this code, the master
		// server is down so I don't have anyway to test the code...
		//
		// it'll be added whenever the masterserver comes online again.
		serverstatus.innerHTML = `${servercount} ${lang("gui.server.servers")} - ${playercount} ${lang("gui.server.players")}`;
	} else {
		serverstatus.classList.add("down");
		serverstatus.innerHTML = lang("gui.server.offline");

	}
}; loadServers()

// Refreshes every 5 minutes
setInterval(() => {
	loadServers();
}, 300000)
