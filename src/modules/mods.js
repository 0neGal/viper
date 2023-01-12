const path = require("path");
const fs = require("fs-extra");
const unzip = require("unzipper");
const copy = require("recursive-copy");
const { app, ipcMain } = require("electron");
const { https } = require("follow-redirects");

const json = require("./json");
const settings = require("./settings");

const cli = require("../cli");
const lang = require("../lang");
const utils = require("../utils");

var mods = {
	installing: [],
	dupe_msg_sent: false,
}

function update_path() {
	mods.path = path.join(settings.gamepath, "R2Northstar/mods");
}; update_path();

// Returns a list of mods
//
// It'll return 3 arrays, all, enabled, disabled. all being a
// combination of the other two, enabled being enabled mods, and you
// guessed it, disabled being disabled mods.
mods.list = () => {
	update_path();

	if (utils.getNSVersion() == "unknown") {
		utils.winLog(lang("general.notinstalled"));
		console.log("error: " + lang("general.notinstalled"));
		cli.exit(1);
		return false;
	}

	let enabled = [];
	let disabled = [];

	if (! fs.existsSync(mods.path)) {
		fs.mkdirSync(path.join(mods.path), {recursive: true});
		return {
			enabled: [],
			disabled: [],
			all: []
		};
	}

	let files = fs.readdirSync(mods.path);
	files.forEach((file) => {
		if (fs.statSync(path.join(mods.path, file)).isDirectory()) {
			let modjson = path.join(mods.path, file, "mod.json");
			if (fs.existsSync(modjson)) {
				let mod = json(modjson);
				if (! mod) {return}

				let obj = {
					Version: "unknown",
					Name: "unknown",
					FolderName: file,
				...mod}

				obj.Disabled = ! mods.modfile.get(obj.Name);

				let manifestfile = path.join(mods.path, file, "manifest.json");
				if (fs.existsSync(manifestfile)) {
					let manifest = json(manifestfile);
					if (manifest != false) {
						obj.ManifestName = manifest.name;
						if (obj.Version == "unknown") {
							obj.Version = manifest.version_number;
						}
					}
				}

				if (obj.Disabled) {
					disabled.push(obj);
				} else {
					enabled.push(obj);
				}
			}
		}
	})

	return {
		enabled: enabled,
		disabled: disabled,
		all: [...enabled, ...disabled]
	};
}

// Gets information about a mod
//
// Folder name, version, name and whatever else is in the mod.json, keep
// in mind if the mod developer didn't format their JSON file the
// absolute basics will be provided and we can't know the version or
// similar.
mods.get = (mod) => {
	update_path();

	if (utils.getNSVersion() == "unknown") {
		utils.winLog(lang("general.notinstalled"));
		console.log("error: " + lang("general.notinstalled"));
		cli.exit(1);
		return false;
	}

	let list = mods.list().all;

	for (let i = 0; i < list.length; i++) {
		if (list[i].Name == mod) {
			return list[i];
		} else {continue}
	}

	return false;
}

function modfile_pre() {
	mods.modfile.file = path.join(mods.path, "..", "enabledmods.json");

	if (! fs.existsSync(mods.path)) {
		fs.mkdirSync(path.join(mods.path), {recursive: true});
	}

	if (! fs.existsSync(mods.modfile.file)) {
		fs.writeFileSync(mods.modfile.file, "{}");
	}
}

// Manages the enabledmods.json file
//
// It can both return info about the file, but also toggle mods in it,
// generate the file itself, and so on.
mods.modfile = {};

mods.modfile.gen = () => {
	modfile_pre();

	let names = {};
	let list = mods.list().all;
	for (let i = 0; i < list.length; i++) {
		names[list[i].Name] = true
	}

	fs.writeFileSync(mods.modfile.file, JSON.stringify(names));
}

mods.modfile.disable = (mod) => {
	modfile_pre();

	let data = json(mods.modfile.file);
	data[mod] = false;
	fs.writeFileSync(mods.modfile.file, JSON.stringify(data));
}

mods.modfile.enable = (mod) => {
	modfile_pre();

	let data = json(mods.modfile.file);
	data[mod] = true;
	fs.writeFileSync(mods.modfile.file, JSON.stringify(data));
}

mods.modfile.toggle = (mod) => {
	modfile_pre();

	let data = json(mods.modfile.file);
	if (data[mod] != undefined) {
		data[mod] = ! data[mod];
	} else {
		data[mod] = false;
	}

	fs.writeFileSync(mods.modfile.file, JSON.stringify(data));
}

mods.modfile.get = (mod) => {
	modfile_pre();

	let data = json(mods.modfile.file);

	if (data[mod]) {
		return true;
	} else if (data[mod] === false) {
		return false;
	} else {
		return true;
	}
}

// Installs mods from a file path
//
// Either a zip or folder is supported, we'll also try to search inside
// the zip or folder to see if buried in another folder or not, as
// sometimes that's the case.
mods.install = (mod, opts) => {
	update_path();

	let modname = mod.replace(/^.*(\\|\/|\:)/, "");

	opts = {
		forked: false,
		author: false,
		destname: false,
		malformed: false,
		manifest_file: false,
		...opts
	}

	if (! opts.forked) {
		mods.installing = [];
		mods.dupe_msg_sent = false;
	}

	if (utils.getNSVersion() == "unknown") {
		utils.winLog(lang("general.notinstalled"));
		console.log("error: " + lang("general.notinstalled"));
		cli.exit(1);
		return false;
	}

	let notamod = () => {
		utils.winLog(lang("gui.mods.notamod"));
		console.log("error: " + lang("cli.mods.notamod"));
		cli.exit(1);
		return false;
	}

	let installed = () => {
		console.log(lang("cli.mods.installed"));
		cli.exit();

		utils.winLog(lang("gui.mods.installedmod"));

		if (modname == "mods") {
			let manifest = path.join(app.getPath("userData"), "Archives/manifest.json");

			if (fs.existsSync(manifest)) {
				modname = require(manifest).name;
			}
		}

		ipcMain.emit("installed-mod", "", {
			name: modname,
			malformed: opts.malformed,
		});

		ipcMain.emit("gui-getmods");
		return true;
	}

	if (! fs.existsSync(mod)) {return notamod()}

	if (fs.statSync(mod).isDirectory()) {
		utils.winLog(lang("gui.mods.installing"));
		files = fs.readdirSync(mod);
		if (fs.existsSync(path.join(mod, "mod.json")) &&
			fs.statSync(path.join(mod, "mod.json")).isFile()) {


			if (! json(path.join(mod, "mod.json"))) {
				ipcMain.emit("failed-mod");
				return notamod();
			}

			if (fs.existsSync(path.join(mods.path, modname))) {
				fs.rmSync(path.join(mods.path, modname), {recursive: true});
			}

			let copydest = path.join(mods.path, modname);
			if (typeof opts.destname == "string") {
				copydest = path.join(mods.path, opts.destname)
			}

			copy(mod, copydest, (err) => {
				if (err) {
					ipcMain.emit("failed-mod");
					return;
				}

				copy(opts.manifest_file, path.join(copydest, "manifest.json"), (err) => {
					if (err) {
						ipcMain.emit("failed-mod");
						return;
					}

					if (opts.author) {
						fs.writeFileSync(
							path.join(copydest, "thunderstore_author.txt"),
							opts.author
						)
					}

					return installed();
				});
			});

			return;
		} else {
			mod_files = fs.readdirSync(mod);

			for (let i = 0; i < mod_files.length; i++) {
				if (fs.statSync(path.join(mod, mod_files[i])).isDirectory()) {
					if (fs.existsSync(path.join(mod, mod_files[i], "mod.json")) &&
						fs.statSync(path.join(mod, mod_files[i], "mod.json")).isFile()) {

						let mod_name = mod_files[i];
						let use_mod_name = false;

						while (mods.installing.includes(mod_name)) {
							if (! mods.dupe_msg_sent) {
								mods.dupe_msg_sent = true;
								ipcMain.emit("duped-mod", "", mod_name);
							}

							use_mod_name = true;
							mod_name = mod_name + " (dupe)";
						}

						mods.installing.push(mod_name);

						let install = false;
						if (use_mod_name) {
							install = mods.install(path.join(mod, mod_files[i]), {
								...opts,
								forked: true,
								destname: mod_name,
							})
						} else {
							install = mods.install(path.join(mod, mod_files[i]), {
								...opts,
								forked: true
							})
						}

						if (install) {return true};
					}
				}
			}

			return notamod();
		}
	} else {
		utils.winLog(lang("gui.mods.extracting"));
		let cache = path.join(app.getPath("userData"), "Archives");
		if (fs.existsSync(cache)) {
			fs.rmSync(cache, {recursive: true});
			fs.mkdirSync(path.join(cache, "mods"), {recursive: true});
		} else {
			fs.mkdirSync(path.join(cache, "mods"), {recursive: true});
		}

		try {
			if (mod.replace(/.*\./, "").toLowerCase() == "zip") {
				fs.createReadStream(mod).pipe(unzip.Extract({path: cache}))
				.on("finish", () => {
					setTimeout(() => {
						let manifest = path.join(cache, "manifest.json");
						if (fs.existsSync(manifest)) {
							files = fs.readdirSync(path.join(cache, "mods"));
							if (fs.existsSync(path.join(cache, "mods/mod.json"))) {
								if (mods.install(path.join(cache, "mods"), {
										...opts,

										forked: true,
										malformed: true,
										manifest_file: manifest,
										destname: require(manifest).name
									})) {

									return true;
								}
							} else {
								for (let i = 0; i < files.length; i++) {
									let mod = path.join(cache, "mods", files[i]);
									if (fs.statSync(mod).isDirectory()) {
										setTimeout(() => {
											if (mods.install(mod, {
													...opts,
													forked: true,
													destname: false,
													manifest_file: manifest
												})) {

												return true
											}
										}, 1000)
									}
								}

								if (files.length == 0) {
									ipcMain.emit("failed-mod");
									return notamod();
								}
							}

							return notamod();
						}

						if (mods.install(cache, {
							...opts,
							forked: true
						})) {
							installed();
						} else {return notamod()}
					}, 1000)
				});
			} else {
				return notamod();
			}
		}catch(err) {return notamod()}
	}
}

// Installs mods from URL's
//
// This'll simply download the file that the URL points to and then
// install it with mods.install()
mods.installFromURL = (url, author) => {
	update_path();

	https.get(url, (res) => {
		let tmp = path.join(app.getPath("cache"), "vipertmp");
		let modlocation = path.join(tmp, "/mod.zip");

		if (fs.existsSync(tmp)) {
			if (! fs.statSync(tmp).isDirectory()) {
				fs.rmSync(tmp);
			}
		} else {
			fs.mkdirSync(tmp);
			if (fs.existsSync(modlocation)) {
				fs.rmSync(modlocation);
			}
		}

		let stream = fs.createWriteStream(modlocation);
		res.pipe(stream);

		stream.on("finish", () => {
			stream.close();
			mods.install(modlocation, {
				author: author
			})
		})
	})
}

// Removes mods
//
// Takes in the names of the mod then removes it, no confirmation,
// that'd be up to the GUI.
mods.remove = (mod) => {
	update_path();

	if (utils.getNSVersion() == "unknown") {
		utils.winLog(lang("general.notinstalled"));
		console.log("error: " + lang("general.notinstalled"));
		cli.exit(1);
		return false;
	}

	if (mod == "allmods") {
		let modlist = mods.list().all;
		for (let i = 0; i < modlist.length; i++) {
			mods.remove(modlist[i].Name);
		}
		return
	}

	let disabled = path.join(mods.path, "disabled");
	if (! fs.existsSync(disabled)) {
		fs.mkdirSync(disabled);
	}

	let mod_name = mods.get(mod).FolderName;
	if (! mod_name) {
		console.log("error: " + lang("cli.mods.cantfind"));
		cli.exit(1);
		return;
	}

	let path_to_mod = path.join(mods.path, mod_name);

	if (mods.get(mod).Disabled) {
		path_to_mod = path.join(disabled, mod_name);
	}

	if (fs.statSync(path_to_mod).isDirectory()) {
		let manifestname = null;
		if (fs.existsSync(path.join(path_to_mod, "manifest.json"))) {
			manifestname = require(path.join(path_to_mod, "manifest.json")).name;
		}

		fs.rmSync(path_to_mod, {recursive: true});
		console.log(lang("cli.mods.removed"));
		cli.exit();
		ipcMain.emit("gui-getmods");
		ipcMain.emit("removed-mod", "", {
			name: mod.replace(/^.*(\\|\/|\:)/, ""),
			manifestname: manifestname
		});
	} else {
		cli.exit(1);
	}
}

// Toggles mods
//
// If a mod is enabled it'll disable it, vice versa it'll enable it if
// it's disabled. You could have a direct .disable() function if you
// checked for if a mod is already disable and if not run the function.
// However we currently have no need for that.
mods.toggle = (mod, fork) => {
	update_path();

	if (utils.getNSVersion() == "unknown") {
		utils.winLog(lang("general.notinstalled"));
		console.log("error: " + lang("general.notinstalled"));
		cli.exit(1);
		return false;
	}

	if (mod == "allmods") {
		let modlist = mods.list().all;
		for (let i = 0; i < modlist.length; i++) {
			mods.toggle(modlist[i].Name, true);
		}

		console.log(lang("cli.mods.toggledall"));
		cli.exit(0);
		return
	}

	mods.modfile.toggle(mod);
	if (! fork) {
		console.log(lang("cli.mods.toggled"));
		cli.exit();
	}
	ipcMain.emit("gui-getmods");
}

module.exports = mods;
