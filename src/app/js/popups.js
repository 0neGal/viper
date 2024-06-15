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
		state = ! open_list.includes(popup_el);
	}

	if (state) {
		popups.open_list.add(popup_el);
		overlay.classList.add("shown");
		popup_el.classList.add("shown");
	} else if (! state) {
		popups.open_list.remove(popup_el);
		popup_el.classList.remove("shown");
		if (! open_list.length) {
			overlay.classList.remove("shown");
		}
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

// attempts to hide just the last shown popup
popups.hide_last = () => {
	if (open_list.length) {
		popups.hide(open_list[open_list.length - 1], false);
	}
}

let open_list = [];
popups.open_list = () => {
	return open_list;
}

popups.open_list.remove = (el) => {
	// no need to do anything if `el` isn't even in `open_list`
	if (! open_list.includes(el)) {
		return;
	}

	// filtered list
	let list = [];

	// run through open popups
	for (let i = 0; i < open_list.length; i++) {
		// add popup to `list` if it isn't `el`
		if (open_list[i] != el && el.classList.contains("shown")) {
			list.push(open_list[i]);
		}
	}

	// set `open_list` to the now filtered `list`
	open_list = list;
}

popups.open_list.add = (el) => {
	// make sure the `el` isn't already in the list
	popups.open_list.remove(el);

	// add `el` to the end of the list
	open_list.push(el);
}

module.exports = popups;
