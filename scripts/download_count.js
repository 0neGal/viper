const https = require("https");

let link = "/repos/0neGal/viper/releases";

let releases = {};
let total_count = 0;

let parse_release = (release) => {
	let assets = release.assets;
	let name = release.name + ":";

	for (let i = 0; i < assets.length; i++) {
		// dont count blockmaps
		if (assets[i].name.match("blockmap")) {
			continue;
		}

		switch(assets[i].name) {
			// dont count these files
			case "latest.yml":
			case "latest-linux.yml":
				continue;

			default:
				let downloads = assets[i].download_count;

				if (! releases[name]) {
					releases[name] = 0;
				}

				total_count += downloads;
				releases[name] += downloads;
		}

		if (i == assets.length - 1) {
			console.log(name, releases[name]);
		}
	}
}

let parse_json = (json) => {
	json = JSON.parse(json);
	for (let i = 0; i < json.length; i++) {
		parse_release(json[i]);
	}

	console.log();
	console.log("Total download count:", total_count);
}

https.get({
	host: "api.github.com",
	port: 443,
	path: link,
	method: "GET",
	headers: { "User-Agent": "viper" }
}, (res) => {
	res.setEncoding("utf8");
	let res_data = "";

	res.on("data", data => {
		res_data += data;
	});

	res.on("end", () => {
		parse_json(res_data);
	});
})
