const exec = require("child_process").exec;
const ipcMain = require("electron").ipcMain;

ipcMain.on("kill-game", () => {
	kill.game();
})

ipcMain.on("kill-origin", () => {
	kill.origin();
})

// a simple function to kill processes with a certain name
async function kill(process_name) {
	return new Promise(resolve => {
		let proc = process_name;
		let cmd = (() => {
			switch (process.platform) {
				case "linux": return "killall -9 " + proc;
				case "win32": return "taskkill /IM " + proc + " /F";
			}
		})()

		exec(cmd, (err, stdout) => {
			// just try and fail silently if we don't find it w/e
			resolve(true);
		})
	})
}

kill.process = kill;

kill.origin = async () => {
	let origin = await kill("Origin.exe");
	let eadesktop = await kill("EADesktop.exe");

	// these should be Linux only, and the above shouldn't succeed if
	// these don't succeed, so we shouldn't have to check whether these
	// actually succeeded or not
	await kill("CrBrowserMain");
	await kill("EABackgroundSer");

	if (origin || eadesktop) {
		return true;
	}

	return false;
}

kill.game = async () => {
	let tf2 = await kill("Titanfall2.exe");
	let northstar = await kill("NorthstarLauncher.exe");
	let tf2_unpacked = await kill("Titanfall2-unpacked.exe");

	if (tf2 || northstar || tf2_unpacked) {
		return true;
	}

	return false;
}

module.exports = kill;
