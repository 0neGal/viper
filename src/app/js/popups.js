let popups = {};

popups.set = (popup, state, auto_close_all = true) => {
	let popup_el = popup;

	if (typeof popup == "string") {
		popup_el = document.querySelector(popup);
	}

	if (! popup_el) {return false}

	if (auto_close_all && overlay.classList.contains("shown")) {
		popups.set_all(false, popup_el);
	}

	if (! state && state !== false) {
		state = ! popup_el.classList.contains("shown");
	}

	if (state) {
		overlay.classList.add("shown");
		popup_el.classList.add("shown");
	} else if (! state) {
		overlay.classList.remove("shown");
		popup_el.classList.remove("shown");
	}

	events.emit("popup-changed", {
		popup: popup_el,
		new_state: state
	})
}

popups.show = (popup, auto_close_all = true) => {
	return popups.set(popup, true, auto_close_all);
}

popups.hide = (popup, auto_close_all = true) => {
	return popups.set(popup, false, auto_close_all);
}

popups.list = () => {
	return document.querySelectorAll(".popup");
}

popups.set_all = (state = false, exclude_popup) => {
	let popups_list = document.querySelectorAll(".popup.shown");

	for (let i = 0; i < popups_list.length; i++) {
		if (popups_list[i] == exclude_popup) {
			continue;
		}

		popups.set(popups_list[i], state, false);
	}
}

module.exports = popups;
