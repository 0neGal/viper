const { app } = require("electron");
const path = require("path");
const fs = require("fs");
const { https } = require("follow-redirects");


// all requests results are stored in this file
const cachePath = path.join(app.getPath("cache"), "requests.json");
const NORTHSTAR_LATEST_RELEASE_KEY = "nsLatestRelease";


function _saveCache(data) {
    fs.writeFileSync(cachePath, JSON.stringify(data));
}

function _getRequestsCache() {
    if (fs.existsSync(cachePath)) {
        return JSON.parse(fs.readFileSync(cachePath, "utf8"));
    } else {
        fs.writeFileSync(cachePath, "{}");
        return {};
    }
}

// Returns latest Northstar version available from GitHub releases. If
// there's no cache result for this request, or if cache exists but is
// old, refreshes cache with new data.
async function getLatestNsVersion() {
    return new Promise((resolve, reject) => {
        let cache = _getRequestsCache();
    
        if (cache[NORTHSTAR_LATEST_RELEASE_KEY] && (Date.now() - cache[NORTHSTAR_LATEST_RELEASE_KEY]["time"]) < 5 * 60 * 1000) {
            console.log(`returning ${NORTHSTAR_LATEST_RELEASE_KEY} data from cache`);
            resolve( cache[NORTHSTAR_LATEST_RELEASE_KEY]["body"]["tag_name"] );
        } else {
            https.get({
                host: "api.github.com",
                port: 443,
                path: "/repos/R2Northstar/Northstar/releases/latest",
                method: "GET",
                headers: { "User-Agent": "viper" }
            }, 
            
            response => {
                response.setEncoding("utf8");
                let responseData = "";

                response.on("data", data => {
                    responseData += data;
                });

                response.on("end", _ => {                    
                    cache[NORTHSTAR_LATEST_RELEASE_KEY] = {
                        "time": Date.now(),
                        "body": JSON.parse(responseData)
                    };
                    _saveCache(cache);
                    resolve( cache[NORTHSTAR_LATEST_RELEASE_KEY]["body"]["tag_name"] );
                });
            });
        }
    });
}

// Returns the download link to latest Northstar version. Should always
// be called after getLatestNsVersion, as it refreshes cache data (if
// needed).
function getLatestNsVersionLink() {
    const cache = _getRequestsCache();
    return cache[NORTHSTAR_LATEST_RELEASE_KEY]["body"].assets[0].browser_download_url;
}


module.exports = {
    getLatestNsVersion, 
    getLatestNsVersionLink
};
