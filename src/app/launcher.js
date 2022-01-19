const markdown = require("marked").parse;

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
}; page(0)


// Updates the Viper release notes
ipcRenderer.on("vp-notes", (event, response) => {
	let content = "";

	for (const release of response) {
		content += "# " + release.name + "\n\n"
			+ release.body.replaceAll("\r\n", "\n") + "\n\n\n";
	}

	vpReleaseNotes.innerHTML = markdown(content);
});

async function loadVpReleases() {
	ipcRenderer.send("get-vp-notes");	
}; loadVpReleases();


// Updates the Northstar release notes
ipcRenderer.on("ns-notes", (event, response) => {
	let content = "";

	for (let release of response) {
		content += "# " + release.name + "\n\n"
			+ release.body.replaceAll("\r\n", "\nhtmlbreak") + "\n\n\n";
	}

	nsRelease.innerHTML = markdown(content).replaceAll("htmlbreak", "<br>");
});

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
