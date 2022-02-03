var Browser = {
	toggle: (state) => {
		if (state) {
			overlay.classList.add("shown")
			browser.classList.add("shown")
			return
		} else if (! state) {
			if (state != undefined) {
				overlay.classList.remove("shown")
				browser.classList.remove("shown")
				return
			}
		}

		overlay.classList.toggle("shown")
		browser.classList.toggle("shown")
	},
	loadfront: async () => {
		let packages = await (await fetch("https://northstar.thunderstore.io/api/v1/package/")).json();
		
		for (let i in packages) {
			let pkg = {...packages[i], ...packages[i].versions[0]};

			new BrowserEl({
				title: pkg.name,
				image: pkg.icon,
				author: pkg.owner,
				download: pkg.download_url,
				description: pkg.description
			})
		}
	},
	loading: () => {
		if (! browserEntries.querySelector(".loading")) {
			browserEntries.innerHTML = `<div class="loading">${lang("gui.browser.loading")}</div>`;
		}
	}
}; Browser.toggle()
Browser.loadfront()

document.body.addEventListener("keyup", (e) => {
	if (e.key == "Escape") {Browser.toggle(false)}
})

function BrowserEl(properties) {
	properties = {
		title: "No name",
		image: "icons/no-image.png",
		author: "Unnamed Pilot",
		description: "No description",
		...properties
	}

	if (browserEntries.querySelector(".loading")) {
		browserEntries.innerHTML = "";
	}

	let installstring = "Install";
	if (normalize(modsdiv.innerText.split("\n")).includes(normalize(properties.title))) {
		installstring = "Re-Install";
	}

	browserEntries.innerHTML += `
		<div class="el" id="${normalize(properties.title)}">
			<div class="image">
				<img src="${properties.image}">
			</div>
			<div class="text">
				<div class="title">${properties.title}</div>
				<div class="description">${properties.description} - ${lang("gui.browser.madeby")} ${properties.author}</div>
				<button onclick="installFromURL('${properties.download}')">${installstring}</button>
			</div>
		</div>
	`
}

ipcRenderer.on("installedmod", (event, modname) => {
	setButtons(true);
	modname = normalize(modname);

	if (document.getElementById(modname)) {
		document.getElementById(modname).querySelector(".text button").innerHTML = "Re-Install";
	}
})

function normalize(items) {
	let main = (string) => {
		return string.replaceAll(" ", "").replaceAll(".", "").toLowerCase()
	}
	if (typeof items == "string") {
		return main(items)
	} else {
		let newArray = [];
		for (let i = 0; i < items.length; i++) {
			newArray.push(main(items[i]));
		}

		return newArray;
	}
}
