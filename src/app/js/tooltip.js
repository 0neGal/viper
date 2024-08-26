var tooltip = {
	target: false,
	div: document.getElementById("tooltip"),
}

tooltip.show = (target, text, vertical_positioned) => {
	if (target == tooltip.target) {
		return;
	}

	tooltip.target = target;

	let div = tooltip.div;

	let padding = parseFloat(
		getComputedStyle(div).getPropertyValue("padding")
	);

	let tooltip_padding = padding / 1.2;

	let get_positions = () => {
		div.innerHTML = text;

		let div_rect = div.getBoundingClientRect();
		let target_rect = target.getBoundingClientRect();

		let x_pos = 0;
		let y_pos = 0;

		if (vertical_positioned) {
			x_pos = target_rect.x + (target_rect.width / 2);
			x_pos = x_pos - (div_rect.width / 2);

			if (x_pos < padding) {
				x_pos = padding;
			} else if (x_pos + div_rect.width > window.innerWidth - padding) {
				x_pos = window.innerWidth - div_rect.width - padding;
			}

			y_pos = target_rect.y + target_rect.height + tooltip_padding;

			if (y_pos + div_rect.height > window.innerHeight) {
				y_pos = target_rect.y - div_rect.height - tooltip_padding;
			}
		} else {
			x_pos = target_rect.x - div_rect.width - tooltip_padding;

			if (x_pos < 0) {
				x_pos = target_rect.x + target_rect.width + tooltip_padding;
			}

			if (x_pos > window.innerWidth - padding) {
				x_pos = window.innerWidth - div_rect.width - padding;
			}

			y_pos = target_rect.y + (target_rect.height / 2);
			y_pos = y_pos - (div_rect.height / 2);
		}

		return {x: x_pos, y: y_pos}
	}

	let transition_duration = parseFloat(
		getComputedStyle(div).getPropertyValue("transition-duration")
	) * 1000;

	if (div.classList.contains("visible")) {
		div.classList.remove("visible");
	}

	return new Promise((resolve) => {
		setTimeout(() => {
			if (tooltip.target != target) {
				return resolve();
			}

			let pos = get_positions();
			div.style.top = pos.y + "px";
			div.style.left = pos.x + "px";
		}, transition_duration)

		setTimeout(() => {
			if (tooltip.target != target) {
				return resolve();
			}

			div.classList.add("visible");

			resolve();
		}, transition_duration * 2)
	})
}

let mouse_y = 0;
let mouse_x = 0;

let tooltip_event = (event) => {
	if (event && event.x && event.y) {
		mouse_y = event.y;
		mouse_x = event.x;
	} else {
		event = {
			x: mouse_x,
			y: mouse_y
		}
	}

	let at_mouse = document.elementFromPoint(event.x, event.y);

	if (! at_mouse) {return}

	let tooltip_text = at_mouse.getAttribute("tooltip");
	if (! tooltip_text) {
		tooltip.target = false;
		tooltip.div.classList.remove("visible");

		return;
	}

	let position = at_mouse.getAttribute("tooltip-position") || "vertical";
	tooltip.show(at_mouse, tooltip_text, (position == "vertical"));
}

setInterval(tooltip_event, 1000);
document.addEventListener("click", tooltip_event);
document.addEventListener("mouseup", tooltip_event);
document.addEventListener("mousedown", tooltip_event);
document.addEventListener("mousemove", tooltip_event);
document.addEventListener("mouseenter", tooltip_event);
document.addEventListener("mouseleave", tooltip_event);
