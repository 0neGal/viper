const path = require("path");
const { app, BrowserWindow } = require("electron");

function start() {
	win = new BrowserWindow({
		width: 500,
		height: 115,
		show: false,
		title: "Viper",
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		},
	}); win.openDevTools()

	win.removeMenu();
	win.loadFile(__dirname + "/app/index.html");
	win.webContents.once("dom-ready", () => {win.show()});
}

app.on("ready", () => {
	app.setPath("userData", path.join(app.getPath("cache"), app.name));
	start();
})

