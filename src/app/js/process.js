const ipcRenderer = require("electron").ipcRenderer;

ipcRenderer.on("log", (_, msg) => {
	console.log(msg)
})

ipcRenderer.on("alert", (_, data) => {
	alert(data.message);
	ipcRenderer.send("alert-closed-" + data.id);
})

ipcRenderer.on("confirm", (_, data) => {
	let confirmed = confirm(data.message);
	ipcRenderer.send("confirm-closed-" + data.id, confirmed);
})

module.exports = {
	// attempts to relaunch the process
	relaunch: () => {
		ipcRenderer.send("relaunch");
	},

	// attempts to exit the process (closing Viper)
	exit: () => {
		ipcRenderer.send("exit")
	}
}
