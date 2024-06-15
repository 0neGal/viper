const popups = require("./popups");
const launcher = require("./launcher");
const navigate = require("./navigate");

window.addEventListener("gamepadconnected", (e) => {
	console.log("Gamepad connected:", e.gamepad.id);
}, false)

window.addEventListener("gamepaddisconnected", (e) => {
	console.log("Gamepad disconnected:", e.gamepad.id);
}, false)

// this contains the names/directions of axes and IDs that have
// previously been pressed, if it is found that these were recently
// pressed in the next iteration of the `setInterval()` below than the
// iteration is skipped
//
// the value of each item is equivalent to the amount of iterations to
// wait, so `up: 3` will cause it to wait 3 iterations, before `up` can
// be pressed again
let delay_press = {};

let held_buttons = {};

setInterval(() => {
	let gamepads = navigator.getGamepads();

	// this has a list of all the directions that the `.axes[]` are
	// pointing in, letting us navigate in that direction
	let directions = {}

	// keeps track of which buttons `delay_press` that have already been
	// lowered, that way we can lower the ones that haven't been lowered
	// through a button press
	let lowered_delay = [];

	// is the select/accept button being held
	let selecting = false;

	for (let i in gamepads) {
		if (! gamepads[i]) {continue}
		// every other `.axes[]` element is a different coordinate, each
		// analog stick has 2 elements in `.axes[]`, the first one is
		// the x coordinate, second is the y coordinate
		//
		// so we use this to keep track of which coordinate we're
		// currently on, and thereby the direction of the float inside
		// `.axes[i]`
		let coord = "x";
		let deadzone = 0.5;

		for (let ii = 0; ii < gamepads[i].axes.length; ii++) {
			let value = gamepads[i].axes[ii];

			// check if we're beyond the deadzone in both the negative
			// and positive direction, and then using `coord` add a
			// direction to `directions`
			if (value < -deadzone) {
				if (coord == "y") {
					directions.up = true;
				} else {
					directions.left = true;
				}
			} else if (value > deadzone) {
				if (coord == "y") {
					directions.down = true;
				} else {
					directions.right = true;
				}
			}

			// flip `coord`
			if (coord == "x") {
				coord = "y";
			} else {
				coord = "x";
			}
		}

		// only support "standard" button layouts/mappings
		//
		// TODO: for anybody reading this in the future, the support
		// for other mappings is something that's on the table,
		// however, due to not having all the hardware in the world,
		// this will have to be up to someone else
		if (gamepads[i].mapping != "standard") {
			continue;
		}

		for (let ii = 0; ii < gamepads[i].buttons.length; ii++) {
			if (! gamepads[i].buttons[ii].pressed) {
				held_buttons[ii] = false;
				continue;
			}

			// a list of known combinations of buttons for the most
			// common brands out there, more should possibly be added
			let brands = {
				"Xbox": {
					accept: 0,
					cancel: 1
				},
				"Nintendo": {
					accept: 1,
					cancel: 0
				},
				"PlayStation": {
					accept: 0,
					cancel: 1
				}
			}

			// this is the most common setup, to my understanding, with
			// the exception of third party Nintendo controller, may
			// need to be adjusted in the future
			let buttons = {
				accept: 0,
				cancel: 1
			}

			// set `cancel` and `accept` accordingly to the ID of the
			// gamepad, if its a known brand
			for (let brand in brands) {
				// unknown brand
				if (! gamepads[i].id.includes(brand)) {
					continue;
				}

				// set buttons according to brand
				buttons = brands[brand];
				break;
			}

			// if the button that's being pressed is the "accept"
			// button, then we set `selecting` to `true`, this is done
			// before we check for the button delay so that holding the
			// button keeps the selection in place, until the button is
			// no longer pressed
			if (ii == buttons.accept) {
				selecting = true;
			}

			// if this button is still delayed, we lower the delay and
			// then go to the next button
			if (delay_press[ii]) {
				delay_press[ii]--;
				lowered_delay.push(ii);
				continue;
			}

			// add delay to this button, so it doesn't get clicked
			// immediately again after this
			delay_press[ii] = 3;

			if (held_buttons[ii]) {
				continue;
			}

			held_buttons[ii] = true;

			// interpret `ii` as a specific button/action, using the
			// standard IDs: https://w3c.github.io/gamepad/#remapping
			switch(ii) {
				// change active section
				case 4: launcher.relative_section("left"); break;
				case 5: launcher.relative_section("right"); break;

				// navigate selection
				case 12: navigate.move("up"); break;
				case 13: navigate.move("down"); break;
				case 14: navigate.move("left"); break;
				case 15: navigate.move("right"); break;

				// click selected element
				case buttons.accept: navigate.select(); break;

				// close last opened popup
				case buttons.cancel: popups.hide_last(); break;
			}
		}
	}

	for (let i in directions) {
		if (directions[i] === true) {
			// if this direction is still delayed, we lower the delay,
			// and then go to the next direction
			if (delay_press[i]) {
				delay_press[i]--;
				lowered_delay.push(i);
				continue;
			}

			// move in the direction
			navigate.move(i);

			// add delay to this direction, to prevent it from being
			// triggered immediately again
			delay_press[i] = 5;
		}
	}

	// run through buttons that have or have had a delay
	for (let i in delay_press) {
		// if a button has a delay, and it hasn't already been lowered,
		// then we lower it
		if (delay_press[i] && ! lowered_delay.includes(i)) {
			delay_press[i]--;
		}
	}

	let selection_el = document.getElementById("selection");

	// add `.selecting` to `#selection` depending on whether
	// `selecting`, is set or not
	if (selecting) {
		selection_el.classList.add("controller-selecting");
	} else {
		selection_el.classList.remove("controller-selecting");
	}
}, 50)


let can_keyboard_navigate = (e) => {
	// quite empty right now, might add more in the future, these are
	// just element selectors where movement with the keyboard is off
	let ignore_on_focus = [
		"input",
		"select"
	]

	// check for whether the active element is one that matches
	// something in `ignore_on_focus`
	for (let i = 0; i < ignore_on_focus.length; i++) {
		if (! document.activeElement.matches(ignore_on_focus)) {
			// active element does not match to `ignore_on_focus[i]`
			continue;
		}

		// if the key that's being pressed is "Escape" then we unfocus
		// to the currently focused active element, this lets you go
		// into an input, and then exit it as well
		if (e.key == "Escape") {
			document.activeElement.blur();
		}

		return false;
	}

	// check if there's already an active selection
	if (document.querySelector(".active-selection")) {
		// this is a list of keys where this keyboard event will be
		// cancelled on, this prevents key events from being sent to
		// element, but still lets you type
		let cancel_keys = [
			"Space", "Enter",
			"ArrowUp", "ArrowDown",
			"ArrowLeft", "ArrowRight"
		]

		// cancel this keyboard event if `e.key` is inside `cancel_keys`
		if (cancel_keys.includes(e.code)) {
			e.preventDefault();
		}
	}

	return true;
}

window.addEventListener("keydown", (e) => {
	// do nothing if we cant navigate
	if (! can_keyboard_navigate(e)) {
		return;
	}

	let select = () => {
		// do nothing if this is a repeat key press
		if (e.repeat) {return}

		// select `.active-selection`
		navigate.select();

		// add `.keyboard-selecting` to `#selection`
		document.getElementById("selection")
			.classList.add("keyboard-selecting");
	}

	// perform the relevant action for the key that was pressed
	switch(e.code) {
		// select
		case "Space": return select();
		case "Enter": return select();

		// move selection
		case "ArrowUp": return navigate.move("up")
		case "ArrowDown": return navigate.move("down")
		case "ArrowLeft": return navigate.move("left")
		case "ArrowRight": return navigate.move("right")
	}
})

window.addEventListener("keyup", (e) => {
	if (! can_keyboard_navigate(e)) {
		return;
	}

	let selection_el = document.getElementById("selection");

	// perform the relevant action for the key that was pressed
	switch(e.code) {
		case "KeyQ": launcher.relative_section("left"); break;
		case "KeyE": launcher.relative_section("right"); break;

		case "Space": return selection_el
				.classList.remove("keyboard-selecting");

		case "Enter": return selection_el
				.classList.remove("keyboard-selecting");
	}
})
