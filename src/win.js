let win = {
	send: () => {}
}

let func = () => {
	return win;
}

func.set = (main_window) => {
	win = main_window;
}

module.exports = func;
