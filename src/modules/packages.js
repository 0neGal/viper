const path = require("path");
const fs = require("fs-extra");
const unzip = require("unzipper");
const app = require("electron").app;
const https = require("follow-redirects").https;

const mods = require("./mods");
const json = require("./json");
const win = require("./window");
const settings = require("./settings");

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

	// create the folder, in case it doesn't already exist
	fs.mkdirSync(packages.path);
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

packages.list = (dir = packages.path) => {
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

					// contents of `manifest.json` or `false` if it can
					// be parsed correctly
					manifest: json(
						path.join(package_path, "manifest.json")
					),
				}

				// add `.remove()` function, mostly just a shorthand
				package_list[files[i]].remove = () => {
					return packages.remove(
						split_name.author,
						split_name.package_name,
						split_name.version,
					)
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

	console.log("Downloading package:", name);
	// download `url` to a temporary dir, and return the path to it
	let zip_path = await packages.download(url, name);

	console.log("Extracting package:", name);
	// extract the zip file we downloaded before, and return the path of
	// the folder that we extracted it to
	let package_path = await packages.extract(zip_path, name);


	console.log("Verifying package:", name);
	let verification = packages.verify(package_path);

	switch(verification) {
		case true: break;
		case "has-plugins":
			// if the package has plugins, then we want to prompt the
			// user, and make absolutely certain that they do want to
			// install this package, as plugins have security concerns
			let confirmation = await win.confirm(
				`The following package has native plugins: ${name} \n\n`

				+

				"Native plugins have far more system access than a " +
				"regular mod, and because of this they're inherently " +
				"less secure to have installed, as a malicious plugin" +
				" could do far more harm this way. If this plugin is " +
				"one from a trusted developer or similar or you know " +
				"what you're doing, then you can disregard this " +
				"message completely."
			)

			// check whether the user cancelled or confirmed the
			// installation, and act accordingly
			if (! confirmation) {
				return console.log("Cancelled package installation:", name);
			}
			break;
		default:
			// other unhandled error
			return console.log(
				"Verification of package failed:", name,
				", reason:", verification
			);
	}

	console.log("Verified package:", name);

	console.log("Deleting older version(s), if it exists:", name);
	// check and delete any mod with the name package details in the old
	// `mods` folder, if there are any at all
	let mods_list = mods.list().all;
	for (let i = 0; i < mods_list.length; i++) {
		let mod = mods_list[i];

		if (mod.ManifestName == package_name) {
			mods.remove(mod.Name);
			continue;
		}
	}

	// removes older version of package inside the `packages` folder
	packages.remove(author, package_name, version);

	console.log("Moving package:", name);
	let moved = packages.move(package_path);

	if (! moved) {
		console.log("Moving package failed:", name);
		return false;
	}

	console.log("Installed package:", name);
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
	let mods = path.join(package_path, "mods");
	let plugins = path.join(package_path, "plugins");
	if (fs.existsSync(plugins) && fs.lstatSync(plugins).isDirectory()) {
		// package has plugins, the function calling `packages.verify()`
		// will have to handle this at their own discretion
		return "has-plugins";
	} else if (! fs.existsSync(mods) || fs.lstatSync(mods).isFile()) {
		// if there are no plugins, then we check if there are any mods,
		// if not, then it means there are both no plugins and mods, so
		// we signal that back
		return "no-mods";
	}

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
