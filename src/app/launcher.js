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


function showVpSection(section) {
	if (!["main", "release", "info", "credits"].includes(section)) throw new Error("unknown vp section");
	vpMainBtn.removeAttribute("active");
	vpReleaseBtn.removeAttribute("active");
	vpInfoBtn.removeAttribute("active");
	vpCreditsBtn.removeAttribute("active");

	vpMain.style.display = "none";
	vpReleaseNotes.style.display = "none";
	vpCredits.style.display = "none";
	vpInfo.style.display = "none";

	switch(section) {
		case "main":
			vpMainBtn.setAttribute("active", "");
			vpMain.style.display = "block";
			break;
		case "release":
			vpReleaseBtn.setAttribute("active", "");
			vpReleaseNotes.style.display = "block";
			break;
		case "info":
			vpInfoBtn.setAttribute("active", "");
			vpInfo.style.display = "block";
			break;
		case "credits":
			vpCreditsBtn.setAttribute("active", "");
			vpCredits.style.display = "block";
			break;
	}
}

function showNsSection(section) {
	if (!["main", "release", "mods"].includes(section)) throw new Error("unknown ns section");
	nsMainBtn.removeAttribute("active");
	nsModsBtn.removeAttribute("active");
	nsReleaseBtn.removeAttribute("active");

	nsMods.style.display = "none";
	nsMain.style.display = "none";
	nsRelease.style.display = "none";

	switch(section) {
		case "main":
			nsMainBtn.setAttribute("active", "");
			nsMain.style.display = "block";
			break;
		case "release":
			nsReleaseBtn.setAttribute("active", "");
			nsRelease.style.display = "block";
			break;
		case "mods":
			nsModsBtn.setAttribute("active", "");
			nsMods.style.display = "block";
			break;
	}
}
