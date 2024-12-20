const path = require("path");
const fs = require("fs-extra");
const { autoUpdater } = require("electron-updater");
const { app, ipcMain, Notification } = require("electron");

const win = require("../win");
const cli = require("../cli");
const lang = require("../lang");

const version = require("./version");
const settings = require("./settings");
const releases = require("./releases");
const gamepath = require("./gamepath");
const is_running = require("./is_running");

console = require("./console");

const unzip = require("unzip-stream");
const https = require("follow-redirects").https;

let update = {};

ipcMain.on("delete-install-cache", () => {
	let delete_dirs = [
		path.join(app.getPath("userData"), "Temp"),
		path.join(app.getPath("cache"), "vipertmp"),
		path.join(settings().gamepath, "northstar.zip")
	]

	for (let i = 0; i < delete_dirs.length; i++) {
		if (fs.existsSync(delete_dirs[i])) {
			fs.rmSync(delete_dirs[i], {recursive: true});
		}
	}
})

ipcMain.on("update-northstar", async (e, force_install) => {
	if (await is_running.game()) {
		return win().alert(lang("general.auto_updates.game_running"));
	}

	update.northstar(force_install);
})

// inform renderer that an update has been downloaded
autoUpdater.on("update-downloaded", () => {
	win().send("update-available");
})

// updates and restarts Viper, if user says yes to do so.
// otherwise it'll do it on the next start up.
ipcMain.on("update-now", () => {
	autoUpdater.quitAndInstall();
})

let update_active;

// renderer requested a check for whether we can auto updates
ipcMain.on("can-autoupdate", () => {
	// is this the first time we're checking?
	if (typeof update_active == "undefined") {
		// save auto updater status
		update_active = autoUpdater.isUpdaterActive();
	}

	// if `update_active` is falsy or `--no-vp-updates` is set,
	// inform the renderer that auto updates aren't possible
	if (! update_active || cli.hasParam("no-vp-updates")) {
		win().send("cant-autoupdate");
	}
})


// renames excluded files to their original name
function restore_excluded_files() {
	if (! gamepath.exists()) {return}

	for (let i = 0; i < settings().excludes.length; i++) {
		let exclude = path.join(settings().gamepath + "/" + settings().excludes[i]);
		if (fs.existsSync(exclude + ".excluded")) {
			fs.renameSync(exclude + ".excluded", exclude);
		}
	}
}; restore_excluded_files();

// renames excluded files to <file>.excluded, the list of files to be
// exluded is set in the settings (settings().excludes)
function exclude_files() {
	for (let i = 0; i < settings().excludes.length; i++) {
		let exclude = path.join(settings().gamepath + "/" + settings().excludes[i]);
		if (fs.existsSync(exclude)) {
			fs.renameSync(exclude, exclude + ".excluded");
		}
	}
}

// whether update.northstar_auto_update() has already been run before
let is_auto_updating = false;

// handles auto updating Northstar.
//
// it uses isGameRunning() to ensure it doesn't run while the game is
// running, as that may have all kinds of issues.
update.northstar_autoupdate = () => {
	if (! settings().nsupdate || ! fs.existsSync("viper.json") || settings().gamepath.length === 0) {
		return;
	}

	if (is_auto_updating) {return}

	async function _checkForUpdates() {
		is_auto_updating = true;

		console.info(lang("cli.auto_updates.checking"));

		// checks if NS is outdated
		if (await northstar_update_available()) {
			console.ok(lang("cli.auto_updates.available"));
			if (await is_running.game()) {
				console.error(lang("general.auto_updates.game_running"));
				new Notification({
					title: lang("gui.nsupdate.gaming.title"),
					body: lang("gui.nsupdate.gaming.body")
				}).show();
			} else {
				console.info(lang("cli.auto_updates.updating_ns"));
				update.northstar();
			}
		} else {
			console.info(lang("cli.auto_updates.no_update"));
		}

		setTimeout(
			_checkForUpdates,
			15 * 60 * 1000
			// interval in between each update check
			// by default 15 minutes.
		);
	}

	_checkForUpdates();
}

// returns whether an update is available for Northstar
async function northstar_update_available() {
	let local = version.northstar();
	let distant = (await releases.latest.northstar()).version;

	if (distant == false) {
		return false;
	}

	// checks if NS is outdated
	if (local !== distant) {
		return true;
	} else {
		return false;
	}
}

// updates Viper itself
//
// this uses electron updater to easily update and publish releases, it
// simply fetches it from GitHub and updates if it's outdated, very
// useful. Not much we have to do on our side.
update.viper = (autoinstall) => {
	// stop if we're already in the process of updating
	if (update.viper.updating) {
		return;
	}

	update.viper.updating = true;

	const { autoUpdater } = require("electron-updater");

	if (! autoUpdater.isUpdaterActive()) {
		update.viper.updating = false;

		if (settings().nsupdate) {
			update.northstar_autoupdate();
		}

		return cli.exit();
	}

	if (autoinstall) {
		autoUpdater.on("update-downloaded", (info) => {
			autoUpdater.quitAndInstall();
			update.viper.updating = false;
		});
	}

	autoUpdater.on("error", (info) => {
		update.viper.updating = false;
		cli.exit(1)
	});

	autoUpdater.on("update-not-available", (info) => {
		update.viper.updating = false;

		// only check for NS updates if Viper itself has no updates and
		// if NS auto updates is enabled.
		if (settings().nsupdate || cli.hasArgs()) {
			update.northstar_autoupdate();
		}

		cli.exit();
	});

	autoUpdater.checkForUpdatesAndNotify();
}

update.viper.updating = false;

// removes all mods in "R2Northstar/mods" starting with "Northstar."
function remove_core_mods() {
	if (! gamepath.exists()) {return}

	// make sure the "R2Northstar/mods" folder exists, on top of making
	// sure that, it is in fact a folder
	let mod_dir = path.join(settings().gamepath, "R2Northstar/mods");
	if (! fs.existsSync(mod_dir) || fs.statSync(mod_dir).isFile()) {
		return;
	}

	let mods = [];
	let deleted_core_mods = false;

	try {
		// try to get list of items in `mod_dir`
		mods = fs.readdirSync(mod_dir);
	}catch(err) {}

	// run through list
	for (let i = 0; i < mods.length; i++) {
		// does the item starts with "Northstar."?
		if (mods[i].match("Northstar\..*")) {
			// remove the item
			fs.rmSync(path.join(mod_dir, mods[i]), {
				recursive: true
			})

			deleted_core_mods = true;
		}
	}

	// display message, if we even deleted any mods
	if (deleted_core_mods) {
		console.ok("Removed existing core mods!");
	}
}

// installs/Updates Northstar
//
// if Northstar is already installed it'll be an update, otherwise it'll
// install it. It simply downloads the Northstar archive from GitHub, if
// it's outdated, then extracts it into the game path.
//
// as to handle not overwriting files we rename certain files to
// <file>.excluded, then rename them back after the extraction. The
// unzip module does not support excluding files directly.
//
// `force_install` makes this function not care about whether or not
// we're already up-to-date, forcing the install
update.northstar = async (force_install) => {
	// stop if we're already in the process of updating
	if (update.northstar.updating) {
		return;
	}

	update.northstar.updating = true;

	if (await is_running.game()) {
		update.northstar.updating = false;
		console.error(lang("general.auto_updates.game_running"));
		return false;
	}

	if (! gamepath.exists()) {
		update.northstar.updating = false;
		return;
	}

	win().send("ns-update-event", "cli.update.checking");
	console.info(lang("cli.update.checking"));
	let ns_version = version.northstar();

	let latest = await releases.latest.northstar();

	if (latest && latest.version == false) {
		update.northstar.updating = false;
		win().send("ns-update-event", "cli.update.noInternet");
		return;
	}

	// Makes sure it is not already the latest version
	if (! force_install && ! await northstar_update_available()) {
		win().send("ns-update-event", "cli.update.uptodate_short");
		console.ok(lang("cli.update.uptodate").replace("%s", ns_version));

		win().log(lang("gui.update.uptodate"));

		update.northstar.updating = false;

		cli.exit();
		return;
	} else {
		if (ns_version != "unknown") {
			console.info(lang("cli.update.current"), ns_version);
		}
	}

	exclude_files();

	// start the download of the zip
	https.get(latest.download_link, (res) => {
		// cancel out if zip can't be retrieved and or found
		if (res.statusCode !== 200) {
			win().send("ns-update-event", "cli.update.uptodate_short");
			console.ok(lang("cli.update.uptodate"), ns_version);
			update.northstar.updating = false;
			return false;
		}

		let unknown_size = false;
		let content_length_mb = 0.0;
		let content_length = res.headers["content-length"];

		// if content_length is `undefined`, we can't get the complete
		// size (not all servers send the content-length)
		if (content_length == undefined) {
			unknown_size = true;
		} else {
			content_length = parseInt(content_length);

			if (isNaN(content_length)) {
				unknown_size = true;
			} else {
				content_length_mb = (content_length / 1024 / 1024).toFixed(1);
			}
		}

		console.info(lang("cli.update.downloading") + ":", latest.version);
		win().send("ns-update-event", {
			progress: 0,
			btn_text: "1/2",
			key: "cli.update.downloading",
		})

		let tmp = path.dirname(settings().zip);

		if (fs.existsSync(tmp)) {
			if (! fs.statSync(tmp).isDirectory()) {
				fs.rmSync(tmp);
			}
		} else {
			fs.mkdirSync(tmp);
			if (fs.existsSync(settings().zip)) {
				fs.rmSync(settings().zip);
			}
		}

		let stream = fs.createWriteStream(settings().zip);
		res.pipe(stream);

		let received = 0;
		res.on("data", (chunk) => {
			received += chunk.length;
			let received_mb = (received / 1024 / 1024).toFixed(1);

			let percentage_str = "";
			let current_percentage = 0;

			let key = lang("gui.update.downloading") + " " + received_mb + "mb";

			if (unknown_size === false) {
				key += " / " + content_length_mb + "mb";
				current_percentage = Math.floor(received_mb / content_length_mb * 100);
				percentage_str = " - " + current_percentage + "%";
			}

			win().send("ns-update-event", {
				key: key,
				progress: current_percentage,
				btn_text: "1/2" + percentage_str
			});
		})

		stream.on("finish", () => {
			remove_core_mods();

			stream.close();
			let extract = fs.createReadStream(settings().zip);

			win().log(lang("gui.update.extracting"));
			win().send("ns-update-event", {
				progress: 0,
				btn_text: "2/2 - 0%",
				key: lang("gui.update.extracting")
			});

			console.ok(lang("cli.update.download_done"));

			let destination = unzip.Extract({path: settings().gamepath});

			// If we receive multiple errors of the same type we ignore them
			let received_errors = [];
			destination.on("error", (err) => {
				if (received_errors.indexOf(err.code) >= 0)
					return;

				received_errors.push(err.code);
				extract.close();
				update.northstar.updating = false;

				let description = lang("gui.toast.desc.unknown_error") + " (" + err.code + ")";

				win().toast({
					scheme: "error",
					title: lang("gui.toast.title.failed"),
					description: description
				})

				win().send("ns-update-event", "cli.update.failed");
			})

			// extracts the zip, this is the part where we're actually
			// installing Northstar.
			extract.pipe(destination)

			let extracted = 0;
			let size = received;
			let size_mb = (size / 1024 / 1024).toFixed(1);

			extract.on("data", (chunk) => {
				extracted += chunk.length;
				let percent = Math.floor(extracted / size * 100);
				let extracted_mb = (extracted / 1024 / 1024).toFixed(1);

				win().send("ns-update-event", {
					progress: percent,
					btn_text: "2/2 - " + percent + "%",
					key: lang("gui.update.extracting") +
						" " + extracted_mb + "mb / " + size_mb + "mb"
				});
			})

			extract.on("end", () => {
				extract.close();
				ipcMain.emit("getversion");

				restore_excluded_files();

				ipcMain.emit("gui-getmods");
				ipcMain.emit("get-version");
				win().send("ns-update-event", "cli.update.uptodate_short");
				win().log(lang("gui.update.finished"));
				console.ok(lang("cli.update.finished"));

				update.northstar.updating = false;

				cli.exit();
			})
		})
	})
}

update.northstar.updating = false;

module.exports = update;
