const path = require("path");
const fs = require("fs-extra");
const unzip = require("unzipper");
const { app, ipcMain } = require("electron");
const https = require("follow-redirects").https;

const lang = require("../lang");

const json = require("./json");
const win = require("./window");
const settings = require("./settings");

console = require("./console");

var packages = {};

function update_path() {
	packages.path = path.join(settings.gamepath, "R2Northstar/packages");
	
	// make sure the `packages` folder exists
	if (fs.existsSync(packages.path)) {
		// if it does, but it's a file, remove it
		if (fs.lstatSync(packages.path).isFile()) {
			fs.rmSync(packages.path);
		} else {return}
	} 

	// only create folder if the profile folder exists
	if (fs.existsSync(path.dirname(packages.path))) {
		// create the folder, in case it doesn't already exist
		fs.mkdirSync(packages.path);
	}

}; update_path();

packages.format_name = (author, package_name, version) => {
	return author + "-" + package_name + "-" + version;
}

// splits the package name into it's individual parts
packages.split_name = (name) => {
	let split = name.split("-");

	// make sure there are only 3 parts
	if (split.length !== 3) {
		return false;
	}

	// return parts
	return {
		author: split[0],
		version: split[2],
		package_name: split[1]
	}
}

packages.list = (dir = packages.path, no_functions) => {
	let files = fs.readdirSync(dir);
	let package_list = {};

	for (let i = 0; i < files.length; i++) {
		let package_path = path.join(dir, files[i]);
		let verification = packages.verify(package_path);

		let split_name = packages.split_name(files[i]);

		if (! split_name) {continue}

		// make sure the package is actually package
		switch(verification) {
			case true:
			case "has-plugins":
				package_list[files[i]] = {
					// adds `author`, `package_name` and `version`
					...split_name,

					icon: false, // will be set later
					package_path: package_path, // path to package

					// this is whether or not the package has plugins
					has_plugins: (verification == "has-plugins"),

					// this will be set later on
					has_mods: false,

					// contents of `manifest.json` or `false` if it can
					// be parsed correctly
					manifest: json(
						path.join(package_path, "manifest.json")
					),
				}

				// if the package has a `mods` folder, and it's not
				// empty, then we can assume that the package does
				// indeed have mods
				let mods_dir = path.join(package_path, "mods");
				if (fs.existsSync(mods_dir) &&
					fs.lstatSync(mods_dir).isDirectory() &&
					fs.readdirSync(mods_dir).length >= 1) {

					package_list[files[i]].has_mods = true;
				}

				// add `.remove()` function, mostly just a shorthand,
				// unless `no_functions` is `true`
				if (! no_functions) {
					package_list[files[i]].remove = () => {
						return packages.remove(
							split_name.author,
							split_name.package_name,
							split_name.version,
						)
					}
				}

				// set the `.icon` property
				let icon_file = path.join(package_path, "icon.png");
				if (fs.existsSync(icon_file) &&
					fs.lstatSync(icon_file).isFile()) {

					package_list[files[i]].icon = icon_file;
				}
				break;
		}
	}

	return package_list;
}

packages.remove = (author, package_name, version) => {
	// if `version` is not set, we'll search for a package with the same
	// `author` and `package_name` and use the version from that,
	// this'll be useful when updating, of course this assumes that
	// nobody has two versions of the same package installed
	//
	// TODO: perhaps we should remove duplicate packages?
	if (! version) {
		// get list of packages
		let list = packages.list();

		// iterate through them
		for (let i in list) {
			// check for `author` and `package_name` being the same
			if (list[i].author == author &&
				list[i].package_name == package_name) {

				// set `version` to the found package
				version = list[i].version;
				break;
			}
		}
	}

	let name = packages.format_name(author, package_name, version);
	let package_path = path.join(packages.path, name);
	
	// make sure the package even exists to begin with
	if (! fs.existsSync(package_path)) {
		return false;
	}

	fs.rmSync(package_path, {recursive: true});

	// return the inverse of whether the package still exists, this'll
	// be equivalent to whether or not the removal was successful
	return !! fs.existsSync(package_path);
}

packages.install = async (url, author, package_name, version) => {
	update_path();

	let name = packages.format_name(author, package_name, version);

	// removes zip's and folders
	let cleanup = () => {
		console.info("Cleaning up cache folder of mod:", name);
		if (zip_path && fs.existsSync(zip_path)) {
			fs.rm(zip_path, {recursive: true});
			console.ok("Cleaned archive of mod:", name);
		}

		if (package_path && fs.existsSync(package_path)) {
			fs.rm(zip_path, {recursive: true});
			console.ok("Cleaned mod folder:", name);
		}

		console.ok("Cleaned up cache folder of mod:", name);
	}

	console.info("Downloading package:", name);
	// download `url` to a temporary dir, and return the path to it
	let zip_path = await packages.download(url, name);

	console.info("Extracting package:", name);
	// extract the zip file we downloaded before, and return the path of
	// the folder that we extracted it to
	let package_path = await packages.extract(zip_path, name);


	console.info("Verifying package:", name);
	let verification = packages.verify(package_path);

	switch(verification) {
		case true: break;
		case "has-plugins":
			// if the package has plugins, then we want to prompt the
			// user, and make absolutely certain that they do want to
			// install this package, as plugins have security concerns
			let confirmation = await win.confirm(
				`${lang("gui.mods.confirm_plugins_title")} ${name} \n\n` +
				lang("gui.mods.confirm_plugins_description")
			)

			// check whether the user cancelled or confirmed the
			// installation, and act accordingly
			if (! confirmation) {
				return console.ok("Cancelled package installation:", name);
			}
			break;
		default:
			ipcMain.emit("failed-mod", name);

			// other unhandled error
			console.error(
				"Verification of package failed:", name,
				", reason:", verification
			);

			return cleanup();
	}

	console.ok("Verified package:", name);

	console.info("Deleting older version(s), if it exists:", name);
	// check and delete any mod with the name package details in the old
	// `mods` folder, if there are any at all
	let mods = require("./mods");
	let mods_list = mods.list().all;
	for (let i = 0; i < mods_list.length; i++) {
		let mod = mods_list[i];

		if (mod.manifest_name == package_name) {
			mods.remove(mod.name);
			continue;
		}

		// normalizes a string, i.e attempt to make two strings
		// identical, that simply have slightly different formatting, as
		// an example, these strings:
		//
		//   "Mod_Name" and "Mod name"
		//
		// will just become:
		//
		//   "modname"
		let normalize = (string) => {
			return string.toLowerCase()
				.replaceAll("_", "")
				.replaceAll(".", "")
				.replaceAll(" ", "");
		}

		// check if the mod's name from it's `mod.json` file when
		// normalized, is the same as the normalized name of the package
		if (normalize(mod.name) == normalize(package_name)) {
			mods.remove(mod.name);
			continue;
		}

		// check if the name of the mod's folder when normalized, is the
		// same as the normalized name of the package
		if (normalize(mod.folder_name) == normalize(package_name)) {
			mods.remove(mod.name);
			continue;
		}
	}

	// removes older version of package inside the `packages` folder
	packages.remove(author, package_name);
	packages.remove(author, package_name, version);

	console.info("Moving package:", name);
	let moved = packages.move(package_path);

	if (! moved) {
		ipcMain.emit("failed-mod", name);
		console.error("Moving package failed:", name);

		cleanup();

		return false;
	}

	ipcMain.emit("installed-mod", "", {
		name: name,
		fancy_name: package_name
	})

	console.ok("Installed package:", name);
	cleanup();

	return true;
}

packages.download = async (url, name) => {
	update_path();

	return new Promise((resolve) => {
		// download mod to a temporary location
		https.get(url, (res) => {
			let tmp = path.join(app.getPath("cache"), "vipertmp");

			let zip_name = name || "package";
			let zip_path = path.join(tmp, `${zip_name}.zip`);

			// make sure the temporary folder exists
			if (fs.existsSync(tmp)) {
				// if it's not a folder, then delete it
				if (! fs.statSync(tmp).isDirectory()) {
					fs.rmSync(tmp);
				}
			} else {
				// create the folder
				fs.mkdirSync(tmp);

				// if there's already a zip file at `zip_path`, then we
				// simple remove it, otherwise problems will occur
				if (fs.existsSync(zip_path)) {
					fs.rmSync(zip_path);
				}
			}

			// write out the file to the temporary location
			let stream = fs.createWriteStream(zip_path);
			res.pipe(stream);

			stream.on("finish", () => {
				stream.close();

				// return the path of the downloaded zip file
				resolve(zip_path);
			})
		})
	})
}

packages.extract = async (zip_path, name) => {
	// this is where everything from `zip_path` will be extracted
	let extract_dir = path.join(path.dirname(zip_path), name);

	// delete `extract_dir` if it does exist
	if (fs.existsSync(extract_dir)) {
		fs.rmSync(extract_dir, {recursive: true});
	}

	// make an empty folder at `extract_dir`
	fs.mkdirSync(extract_dir);

	return new Promise((resolve) => {
		fs.createReadStream(zip_path).pipe(
			unzip.Extract({
				path: extract_dir
			}
		)).on("finish", () => {
			setInterval(() => {
				resolve(extract_dir);
			}, 1000)
		});
	})
}

packages.verify = (package_path) => {
	// make sure `package_path` is even exists
	if (! fs.existsSync(package_path)) {
		return "does-not-exist";
	}

	// make sure `package_path` is not a folder
	if (fs.lstatSync(package_path).isFile()) {
		return "is-file";
	}

	// make sure a manifest file exists, this is required for
	// Thunderstore packages, and is therefore also assumed to be
	// required here
	let manifest = path.join(package_path, "manifest.json");
	if (! fs.existsSync(manifest) ||
		fs.lstatSync(manifest).isDirectory()) {

		return "missing-manifest";
	}

	// check if there are any plugins in the package
	let mods_path = path.join(package_path, "mods");
	let plugins = path.join(package_path, "plugins");
	if (fs.existsSync(plugins) && fs.lstatSync(plugins).isDirectory()) {
		// package has plugins, the function calling `packages.verify()`
		// will have to handle this at their own discretion
		return "has-plugins";
	} else if (! fs.existsSync(mods_path) || fs.lstatSync(mods_path).isFile()) {
		// if there are no plugins, then we check if there are any mods,
		// if not, then it means there are both no plugins and mods, so
		// we signal that back
		return "no-mods";
	}

	// make sure files in the `mods` folder actually are mods, and if
	// none of them are, then we make sure to return back that are no
	// mods installed
	let found_mod = false;
	let mods = fs.readdirSync(mods_path);
	for (let i = 0; i < mods.length; i++) {
		let mod_file = path.join(mods_path, mods[i], "mod.json");

		// make sure mod.json exists, and is a file, otherwise, this
		// is unlikely to be a mod folder
		if (! fs.existsSync(mod_file)
			|| ! fs.statSync(mod_file).isFile()) {
			continue;
		}

		// attempt to read the mod.json file, and if it succeeds, then
		// this is likely to be a mod
		let json_data = json(mod_file);
		if (json_data) {
			found_mod = true;
		}
	}

	if (! found_mod) {return "no-mods"}

	// all files exist, and everything is just fine
	return true;
}

// moves `package_path` to the packages folder
packages.move = (package_path) => {
	update_path();

	// make sure we're actually dealing with a real folder
	if (! fs.existsSync(package_path) ||
		! fs.lstatSync(package_path).isDirectory()) {

		return false;
	}

	// get path to the package's destination
	let new_path = path.join(
		packages.path, path.basename(package_path)
	)

	// attempt to move `package_path` to the packages folder
	try {
		fs.moveSync(package_path, new_path);
	}catch(err) {return false}

	return true;
}

module.exports = packages;
