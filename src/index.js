const fs = require("fs");
const path = require("path");
const { app, dialog, ipcMain, BrowserWindow } = require("electron");

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

	ipcMain.on("setpath", (event) => {
		dialog.showOpenDialog({properties: ["openDirectory"]}).then(res => {
			fs.writeFileSync(app.getPath("appData") + "/viper.json", JSON.stringify({path: res.filePaths[0]}))

			win.webContents.send("newpath", res.filePaths[0]);
		}).catch(err => {console.error(err)})
	})
}

app.on("ready", () => {
	process.chdir(app.getPath("appData"));
	app.setPath("userData", path.join(app.getPath("cache"), app.name));
	start();
})
