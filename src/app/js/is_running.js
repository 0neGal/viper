const lang = require("../../lang");

// is the game running?
let is_running = false;

// updates play buttons depending on whether the game is running
ipcRenderer.on("is-running", (event, running) => {
	let set_playbtns = (text) => {
		let playbtns = document.querySelectorAll(".playBtn");
		for (let i = 0; i < playbtns.length; i++) {
			playbtns[i].innerHTML = text;
		}
	}

	if (running && is_running != running) {
		set_buttons(false);
		set_playbtns(lang("general.running"));

		is_running = running;

		// show force quit button in Titanfall tab
		tfquit.style.display = "inline-block";

		update.setAttribute("onclick", "kill('game')");
		update.innerHTML = "(" + lang("ns.menu.force_quit") + ")";
		return;
	}

	if (is_running != running) {
		set_buttons(true);
		set_playbtns(lang("gui.launch"));

		is_running = running;

		// hide force quit button in Titanfall tab
		tfquit.style.display = "none";

		update.setAttribute("onclick", "update.ns()");
		update.innerHTML = "(" + lang("gui.update.check") + ")";
	}
})

// return whether the game is running
module.exports = () => {
	return is_running;
}
