let repo = "viper";
let author = "0neGal";
let api = "https://api.github.com/repos";

async function init() {
	let release = await (await fetch(`${api}/${author}/${repo}/releases/latest`)).json();
	let assets = release.assets;

	let get = (asset) => {
		for (let i in assets) {
			if (assets[i].name.match(asset)) {
				return assets[i].browser_download_url;
			}
		}
	}

	let url;
	let search = location.search.replace(/^\?/, "");
	switch(search) {
		case "win-setup":
			url = get(/Viper-Setup-.*\.exe$/);
			break;
		case "win-portable":
			url = get(/Viper-.*\.exe$/);
			break;
		case "appimage":
			url = get(/Viper-.*\.AppImage$/);
			break;
		case "linux":
			url = get(/viper-.*.tar\.gz$/);
			break;
		case "rpm":
			url = get(/viper-.*\.x86_64\.rpm$/);
			break;
		case "deb":
			url = get(/viper_.*_amd64\.deb$/);
			break;
		default:
			url = release.html_url;
			break;
	}

	location.replace(url);
}; init()
