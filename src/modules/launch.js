const { ipcMain, shell } = require("electron");
const { exec, execSync } = require("child_process");

const cli = require("../cli");
const win = require("../win");
const lang = require("../lang");

const in_path = require("./in_path");
const settings = require("./settings");

console = require("./console");

ipcMain.on("launch-ns", () => {launch()});
ipcMain.on("launch-vanilla", () => {
	launch("vanilla");
})

// launches the game
//
// either Northstar or Vanilla. Linux support is not currently a thing,
// however it'll be added at some point.
function launch(game_version, method = settings().linux_launch_method) {
	console.info(
		lang("general.launching"),
		game_version || "Northstar" + "..."
	)

	// change current directory to gamepath
	process.chdir(settings().gamepath);

	let launch_args = settings().nsargs || "";

	// add `-vanilla` or `-northstar` depending on `game_version`
	if (game_version == "vanilla") {
		launch_args += " -vanilla"
	} else {
		launch_args += " -northstar"
	}


	// Linux launch support
	if (process.platform == "linux") {
		let flatpak_id = "com.valvesoftware.Steam";
		let steam_run_str = `steam://run/1237970//${launch_args}/`;
		console.log(steam_run_str)

		// returns whether the Flatpak version of Steam is installed
		let flatpak_steam_installed = () => {
			// this will throw an error if the command fails,
			// either because of an error with the command, or
			// because it's not installed, either way,
			// indicating it's not installed
			try {
				execSync(
					`flatpak info ${flatpak_id}`
				)

				return true;
			}catch(err) {}

			return false;
		}

		switch(method) {
			case "steam_auto":
				// if a Steam executable is found, use that
				if (in_path("steam")) {
					return launch(game_version, "steam_executable");

				// is Flatpak (likely) installed?
				} else if (in_path("flatpak")) { 

					if (flatpak_steam_installed()) {
						return launch(game_version, "steam_flatpak");
					}
				}

				// fallback to Steam protocol
				return launch(game_version, "steam_protocol");

			case "steam_flatpak":
				// make sure Flatpak is installed, and show an error
				// toast if not
				if (! in_path("flatpak")) {
					win().toast({
						scheme: "error",
						title: lang("gui.toast.title.missing_flatpak"),
						description: lang(
							"gui.toast.desc.missing_flatpak"
						)
					})
					return;
				}

				// make sure the Flatpak version of Steam is installed,
				// and show an error toast if not
				if (! flatpak_steam_installed()) {
					win().toast({
						scheme: "error",
						title: lang(
							"gui.toast.title.missing_flatpak_steam"
						),
						description: lang(
							"gui.toast.desc.missing_flatpak_steam"
						)
					})
					return;
				}

				// attempt to launch the game with Flatpak Steam
				exec(`flatpak run ${flatpak_id} "${steam_run_str}"`, {

					cwd: settings().gamepath
				})

				return;

			case "steam_executable":
				// make sure Steam is installed, and show an error toast
				// if not
				if (! in_path("steam")) {
					win().toast({
						scheme: "error",
						title: lang("gui.toast.title.missing_steam"),
						description: lang(
							"gui.toast.desc.missing_steam"
						)
					})
					return;
				}

				// attempt to launch the game with the Steam executable
				exec(`steam "${steam_run_str}"`, {
					cwd: settings().gamepath
				})

				return;

			case "steam_protocol":
				// attempt to launch the game with the Steam protocol
				shell.openExternal(steam_run_str)

				return;
		}

		// launch Vanilla with custom command
		let command = settings().linux_launch_cmd_ns;
		if (game_version == "vanilla") {
			command = settings().linux_launch_cmd_vanilla;
		}

		// make sure the custom command is not just whitespace, and show
		// an error toast if it is
		if (! command.trim()) {
			win().toast({
				scheme: "error",
				title: lang("gui.toast.title.missing_launch_command"),
				description: lang(
					"gui.toast.desc.missing_launch_command"
				)
			})

			return;
		}

		// launch Northstar with custom command
		try {
			exec(command, {
				cwd: settings().gamepath,
				env: {
					...process.env,
					TF_ARGS: launch_args
				}
			})
		}catch(err) { 
			// show error if custom commands fails
			// this should basically never trigger, it should only
			// trigger if `command` isn't set to something valid
			win().toast({
				scheme: "error",
				title: lang("gui.toast.title.failed_launch_command"),
				description: lang(
					"gui.toast.desc.failed_launch_command"
				)
			})
		}

		return;
	}

	// default launches with Northstar
	let executable = "NorthstarLauncher.exe"

	// change over to using vanilla executable
	if (game_version == "vanilla") {
		executable = "Titanfall2.exe"
	}

	// launch executable/game
	exec(executable + " " + launch_args, {
		cwd: settings().gamepath
	})
}

module.exports = launch;
