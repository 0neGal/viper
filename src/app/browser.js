function Browser(state) {
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
};Browser()

document.body.addEventListener("keyup", (e) => {
	if (e.key == "Escape") {Browser(false)}
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
			</div>
		</div>
	`
}

new BrowserEl()
new BrowserEl()
new BrowserEl()
