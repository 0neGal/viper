const popups = require("./popups");
const settings = require("./settings");

let drag_timer;
document.addEventListener("dragover", (e) => {
	e.preventDefault();
	e.stopPropagation();
	dragUI.classList.add("shown");

	clearTimeout(drag_timer);
	drag_timer = setTimeout(() => {
		dragUI.classList.remove("shown");
	}, 5000)
})

document.addEventListener("mouseover", () => {
	clearTimeout(drag_timer);
	dragUI.classList.remove("shown");
})

document.addEventListener("drop", (e) => {
	e.preventDefault();
	e.stopPropagation();

	dragUI.classList.remove("shown");
	mods.install_from_path(e.dataTransfer.files[0].path);
})

document.body.addEventListener("keyup", (e) => {
	if (e.key == "Escape") {
		popups.hide_last();
	}
})

document.body.addEventListener("click", (e) => {
	if (e.target.tagName.toLowerCase() === "a"
		&& e.target.protocol != "file:") {

		e.preventDefault();
		shell.openExternal(e.target.href);
	}
})
