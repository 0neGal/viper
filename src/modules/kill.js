const exec = require("child_process").exec;

// a simple function to kill processes with a certain name
async function kill(process_name) {
	return new Promise(resolve => {
		let proc = process_name;
		let cmd = (() => {
			switch (process.platform) {
				case "linux": return "killall " + proc;
				case "win32": return "taskkill /IM " + proc + " /F";
			}
		})();

		exec(cmd, (err, stdout) => {
			// just try and fail silently if we don't find it w/e
			resolve(true);
		});
	});
}

kill.process = kill;

kill.origin = () => {
	return kill("Origin.exe");
}

module.exports = kill;
