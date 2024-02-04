const win = require("../win");
const exec = require("child_process").exec;

let is_running = {};

setInterval(async () => {
	win().send("is-running", await is_running.game());
}, 1000)

// a simple function that checks whether any of a given set of process
// names are running, you can either input a string or an Array of
// strings
async function check_processes(processes) {
	if (typeof processes == "string") {
		processes = [processes];
	}

	return new Promise(resolve => {
		if (! Array.isArray(processes)) {
			reject(false);
		}

		// while we could use a Node module to do this instead, I
		// decided not to do so. As this achieves exactly the same
		// thing. And it's not much more clunky.
		let cmd = (() => {
			switch (process.platform) {
				case "linux": return "ps a";
				case "win32": return "tasklist";
			}
		})();

		exec(cmd, (err, stdout) => {
			for (let i = 0; i < processes.length; i++) {
				if (stdout.includes(processes[i])) {
					resolve(true);
					break
				}

				if (i == processes.length - 1) {resolve(false)}
			}
		});
	});
}

is_running.game = () => {
	return check_processes([
		"NorthstarLauncher.exe",
		"Titanfall2.exe", "Titanfall2-unpacked.exe"
	])
}

is_running.origin = () => {
	return check_processes([
		"Origin.exe",
		"EADesktop.exe"
	])
}

is_running.titanfall = () => {
	return check_processes([
		"Titanfall2.exe", "Titanfall2-unpacked.exe"
	])
}

is_running.northstar = () => {
	return check_processes([
		"NorthstarLauncher.exe",
	])
}

module.exports = is_running;
