let toasts = {};

toasts.show = (properties) => {
	let toast = {
		timeout: 3000,
		fg: "#FFFFFF",
		bg: "var(--selbg)",
		callback: () => {},
		title: "Untitled Toast",
		description: "No description provided for toast",
		...properties
	}

	switch(toast.scheme) {
		case "error":
			toast.fg = "#FFFFFF";
			toast.bg = "rgb(var(--red))";
			break
		case "success":
			toast.fg = "#FFFFFF";
			toast.bg = "#60D394";
			break
		case "warning":
			toast.fg = "#FFFFFF";
			toast.bg = "#FF9B85";
			break
	}


	let id = Date.now();
	if (document.getElementById(id)) {id = id + 1}
	let el = document.createElement("div");

	el.classList.add("toast");

	el.style.color = toast.fg;
	el.style.background = toast.bg;

	el.id = id;
	el.addEventListener("click", () => {
		toasts.dismiss(id);
		toast.callback();
	})

	el.innerHTML = `
		<div class="title">${toast.title}</div>
		<div class="description">${toast.description}</div>
	`

	if (! toast.title) {
		el.querySelector(".title").remove();
	}

	if (! toast.description) {
		el.querySelector(".description").remove();
	}

	document.getElementById("toasts").appendChild(el);

	setTimeout(() => {
		toasts.dismiss(id);
	}, toast.timeout)
}

// dismissed/closes toasts with `id` as their ID
toasts.dismiss = (id) => {
	id = document.getElementById(id);

	if (id) {
		id.classList.add("hidden");
		setTimeout(() => {
			id.remove();
		}, 500)
	}
}

module.exports = toasts;
