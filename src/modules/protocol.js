const { app, ipcMain } = require("electron");

const win = require("../win");
const requests = require("./requests");
const version = require("./version");

var packages = undefined;
async function install_mod(domain, author, package_name, version) {
	if (packages == undefined)
	{
		ipcMain.once("packages-reply", (event, packages_string) => {
			packages = JSON.parse(packages_string);
			install_mod(domain, author, package_name, version);
		});

		win().send("packages");
		return;
	}

	const package = packages.find((package) => { return package.owner == author && package.name == package_name; })
	if (!package) {
		console.error("Couldn't find package")
		return;
	}

	const package_data = package.versions.find((package_version) => { return package_version.version_number == version; })
	if (!package_data) {
		console.error("Couldn't find package_version")
		return;
	}

	for (const dep of package_data.dependencies) {
		let fragments = dep.split("-");
		if (fragments.length != 3) {
			console.error("bad dep")
			return;
		}

		if (fragments[0] != "northstar")
			await install_mod(domain, ...fragments);
	}

	let result = ipcMain.emit("install-from-url", null, package_data.download_url, author, package_name, version);
	if (!result) {
		console.error("no install-from-url handler")
	}
}

module.exports = async () => {
	if (version.northstar() == "unknown")
		return;

	const args = process.argv.slice(app.isPackaged ? 1 : 2);

	for (const key of args) {
		if (key.startsWith("ror2mm://")) {
			let fragments = key.slice(9).split("/");
		
			if (fragments.length < 6)
				return;

			const ver = fragments[0];
			const term = fragments[1];
			const domain = fragments[2];
			const author = fragments[3];
			const mod = fragments[4];
			const version = fragments[5];

			// There is only v1
			if (ver != "v1")
				continue;

			// No support for custom thunderstore instances
			if (domain != "thunderstore.io")
				continue;

			try {
				if (term == "install") {
					await install_mod(domain, author, mod, version);
				}
			}catch(err) {
				console.error(err);
				continue;
			}
		}
	}
}
