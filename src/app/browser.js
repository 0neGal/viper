function Browser() {
	browser.classList.toggle("shown")
};Browser()

function BrowserEl(properties) {
	properties = {
		title: "No name",
		image: "",
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
