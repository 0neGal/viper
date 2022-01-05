const markdownConverter = new Markdown.Converter();

function displayContent (gameId) {
	if (!["ttf", "ns", "vp"].includes(gameId)) throw new Error("wrong game id called");
	switch(gameId) {
		case "vp":
			vpContent.style.display = "block";
			nsContent.style.display = "none";
			ttfContent.style.display = "none";
			bgHolder.style.backgroundImage = "url('../assets/bg/viper.jpg')";
			break;
		case "ns":
			vpContent.style.display = "none";
			nsContent.style.display = "block";
			ttfContent.style.display = "none";
			bgHolder.style.backgroundImage = "url('../assets/bg/northstar.jpeg')";
			break;
		case "ttf":
			vpContent.style.display = "none";
			nsContent.style.display = "none";
			ttfContent.style.display = "block";
			bgHolder.style.backgroundImage = "url('../assets/bg/ttf2.jpg')";
			break;
	}
}

async function loadVpReleasesText() {
	const response = await (await fetch("https://api.github.com/repos/0negal/viper/releases")).json();
	let content = "";

	for (const release of response) {
		content += "# " + release.name + "\n\n"
			+ release.body.replaceAll("\r\n", "\n") + "\n\n\n";
	}

	vpReleaseNotes.innerHTML = markdownConverter.makeHtml(content);
}

loadVpReleasesText();

async function loadNsReleasesText() {
	const response = await (await fetch("https://api.github.com/repos/R2Northstar/Northstar/releases")).json();
	let content = "";

	for (let release of response) {
		content += "# " + release.name + "\n\n"
			+ release.body.replaceAll("\r\n", "<br>") + "\n\n\n";
	}

	nsRelease.innerHTML = markdownConverter.makeHtml(content);
}

loadNsReleasesText();


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