const path = require("path");
const fs = require("fs-extra");
const { ipcMain, Notification } = require("electron");

const cli = require("../cli");
const lang = require("../lang");

const win = require("./window");
const version = require("./version");
const settings = require("./settings");
const requests = require("./requests");
const gamepath = require("./gamepath");
const is_running = require("./is_running");

console = require("./console");

const unzip = require("unzipper");
const { https } = require("follow-redirects");

let update = {};

// renames excluded files to their original name
function restore_excluded_files() {
	if (! gamepath.exists()) {return}

	for (let i = 0; i < settings.excludes.length; i++) {
		let exclude = path.join(settings.gamepath + "/" + settings.excludes[i]);
		if (fs.existsSync(exclude + ".excluded")) {
			fs.renameSync(exclude + ".excluded", exclude);
		}
	}
}; restore_excluded_files();

// renames excluded files to <file>.excluded, the list of files to be
// exluded is set in the settings (settings.excludes)
function exclude_files() {
	for (let i = 0; i < settings.excludes.length; i++) {
		let exclude = path.join(settings.gamepath + "/" + settings.excludes[i]);
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
	if (! settings.nsupdate || ! fs.existsSync("viper.json") || settings.gamepath.length === 0) {
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
	let distant = await requests.getLatestNsVersion();

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
	const { autoUpdater } = require("electron-updater");

	if (! autoUpdater.isUpdaterActive()) {
		if (settings.nsupdate) {
			update.northstar_autoupdate();
		}

		return cli.exit();
	}

	if (autoinstall) {
		autoUpdater.on("update-downloaded", (info) => {
			autoUpdater.quitAndInstall();
		});
	}

	autoUpdater.on("error", (info) => {cli.exit(1)});
	autoUpdater.on("update-not-available", (info) => {
		// only check for NS updates if Viper itself has no updates and
		// if NS auto updates is enabled.
		if (settings.nsupdate || cli.hasArgs()) {
			update.northstar_autoupdate();
		}
		cli.exit();
	});

	autoUpdater.checkForUpdatesAndNotify();
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
	if (await is_running.game()) {
		console.error(lang("general.auto_updates.game_running"));
		return false;
	}

	if (! gamepath.exists()) {return}

	ipcMain.emit("ns-update-event", "cli.update.checking");
	console.info(lang("cli.update.checking"));
	let ns_version = version.northstar();

	const latest_version = await requests.getLatestNsVersion();

	if (latest_version == false) {
		ipcMain.emit("ns-update-event", "cli.update.noInternet");
		return;
	}

	// Makes sure it is not already the latest version
	if (! force_install && ! await northstar_update_available()) {
		ipcMain.emit("ns-update-event", "cli.update.uptodate_short");
		console.ok(lang("cli.update.uptodate").replace("%s", ns_version));

		win.log(lang("gui.update.uptodate"));
		cli.exit();
		return;
	} else {
		if (ns_version != "unknown") {
			console.info(lang("cli.update.current"), ns_version);
		};
	}

	exclude_files();

	// start the download of the zip
	https.get(requests.getLatestNsVersionLink(), (res) => {
		// cancel out if zip can't be retrieved and or found
		if (res.statusCode !== 200) {
			ipcMain.emit("ns-update-event", "cli.update.uptodate_short");
			console.ok(lang("cli.update.uptodate"), ns_version);
			return false;
		}

		console.info(lang("cli.update.downloading") + ":", latest_version);
		ipcMain.emit("ns-update-event", "cli.update.downloading");

		let tmp = path.dirname(settings.zip);

		if (fs.existsSync(tmp)) {
			if (! fs.statSync(tmp).isDirectory()) {
				fs.rmSync(tmp);
			}
		} else {
			fs.mkdirSync(tmp);
			if (fs.existsSync(settings.zip)) {
				fs.rmSync(settings.zip);
			}
		}

		let stream = fs.createWriteStream(settings.zip);
		res.pipe(stream);

		let received = 0;
		// progress messages, we should probably switch this to
		// percentage instead of how much is downloaded.
		res.on("data", (chunk) => {
			received += chunk.length;
			ipcMain.emit("ns-update-event", lang("gui.update.downloading") + " " + (received / 1024 / 1024).toFixed(1) + "mb");
		})

		stream.on("finish", () => {
			stream.close();
			let extract = fs.createReadStream(settings.zip);

			win.log(lang("gui.update.extracting"));
			ipcMain.emit("ns-update-event", "gui.update.extracting");
			console.ok(lang("cli.update.download_done"));
			// extracts the zip, this is the part where we're actually
			// installing Northstar.
			extract.pipe(unzip.Extract({path: settings.gamepath}))

			let max = received;
			received = 0;

			extract.on("data", (chunk) => {
				received += chunk.length;
				let percent = Math.floor(received / max * 100);
				ipcMain.emit("ns-update-event", lang("gui.update.extracting") + " " + percent + "%");
			})

			extract.on("end", () => {
				extract.close();
				ipcMain.emit("getversion");

				restore_excluded_files();

				ipcMain.emit("gui-getmods");
				ipcMain.emit("get-version");
				ipcMain.emit("ns-update-event", "cli.update.uptodate_short");
				win.log(lang("gui.update.finished"));
				console.ok(lang("cli.update.finished"));
				cli.exit();
			})
		})
	})
}

module.exports = update;
