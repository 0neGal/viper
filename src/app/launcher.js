const markdownConverter = new Markdown.Converter();

function page(page) {
	let pages = document.querySelectorAll(".mainContainer .contentContainer")

	for (let i = 0; i < pages.length; i++) {
		pages[i].classList.add("hidden");
	}

	pages[page].classList.remove("hidden")
	bgHolder.setAttribute("bg", page);
}; page(0)


ipcRenderer.on("vp_notes", (event, response) => {
	let content = "";

	for (const release of response) {
		content += "# " + release.name + "\n\n"
			+ release.body.replaceAll("\r\n", "\n") + "\n\n\n";
	}

	vpReleaseNotes.innerHTML = markdownConverter.makeHtml(content);
});
async function loadVpReleases() {
	ipcRenderer.send("get_vp_notes");	
}; loadVpReleases();


ipcRenderer.on("ns_notes", (event, response) => {
	let content = "";

	for (let release of response) {
		content += "# " + release.name + "\n\n"
			+ release.body.replaceAll("\r\n", "<br>") + "\n\n\n";
	}

	nsRelease.innerHTML = markdownConverter.makeHtml(content);
});

async function loadNsReleases() {
	ipcRenderer.send("get_ns_notes");
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
