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
				description: pkg.description
			})
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

	browser.innerHTML += `
		<div class="el">
			<div class="image">
				<img src="${properties.image}">
			</div>
			<div class="text">
				<div class="title">${properties.title}</div>
				<div class="description">${properties.description} - by ${properties.author}</div>
				<button>Install</button>
				<button>Info</button>
			</div>
		</div>
	`
}

new BrowserEl()
new BrowserEl()
new BrowserEl()
