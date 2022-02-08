function Toast(properties) {
	let toast = {
		fg: "#000000",
		bg: "#FFFFFF",
		timeout: 3000,
		title: "Untitled Toast",
		description: "No description provided for toast",
		...properties
	}

	switch(toast.scheme) {
		case "error":
			toast.fg = "#FFFFFF";
			toast.bg = "var(--red)";
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
	el.setAttribute("onclick", `dismissToast(${id})`);

	el.innerHTML = `
		<div class="title">${toast.title}</div>
		<div class="description">${toast.description}</div>
	`

	toasts.appendChild(el);

	setTimeout(() => {
		dismissToast(id);
	}, toast.timeout)
}

function dismissToast(id) {
	id = document.getElementById(id);
	if (id) {
		id.classList.add("hidden");
		setTimeout(() => {
			id.remove();
		}, 500)
	}
}
