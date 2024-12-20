const ipcRenderer = require("electron").ipcRenderer;

ipcRenderer.on("set-buttons", (_, state) => {
	set_buttons(state);
})

// disables or enables certain buttons when for example
// updating/installing Northstar.
module.exports = (state, enable_gamepath_btns, elements) => {
	if (! elements) {
		playNsBtn.disabled = ! state;
	}

	let disable_array = (array) => {
		for (let i = 0; i < array.length; i++) {
			array[i].disabled = ! state;

			if (state) {
				array[i].classList.remove("disabled");
			} else {
				array[i].classList.add("disabled");
			}
		}
	}

	disable_array(elements || document.querySelectorAll([
		"#modsdiv .el button",
		".disable-when-installing",
		".playBtnContainer .playBtn",
		"#nsMods .buttons.modbtns button",
		"#browser #browserEntries .text button",
	]))

	if (enable_gamepath_btns) {
		let gamepath_btns = query_all('*[onclick="gamepath.set()"]');

		for (let i = 0; i < gamepath_btns.length; i++) {
			gamepath_btns[i].disabled = false;
			gamepath_btns[i].classList.remove("disabled");
		}
	}
}
