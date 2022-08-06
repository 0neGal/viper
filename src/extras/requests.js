const { app } = require("electron");
const path = require("path");
const fs = require("fs");
const { https } = require("follow-redirects");


// all requests results are stored in this file
const cachePath = path.join(app.getPath("cache"), "requests.json");
const NORTHSTAR_LATEST_RELEASE_KEY = "nsLatestRelease";
const NORTHSTAR_RELEASE_NOTES_KEY = "nsReleaseNotes";
const VIPER_RELEASE_NOTES_KEY = "vpReleaseNotes";


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
            })
            
            .on('error', () => {
                console.error('Failed to get latest Northstar version.');
                resolve( false );
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

// Returns and caches the Northstar release notes
async function getNsReleaseNotes() {
    return new Promise(resolve => {
        let cache = _getRequestsCache();

        if (cache[NORTHSTAR_RELEASE_NOTES_KEY] && (Date.now() - cache[NORTHSTAR_RELEASE_NOTES_KEY]["time"]) < 5 * 60 * 1000) {
            resolve( cache[NORTHSTAR_RELEASE_NOTES_KEY]["body"] );
        } else {
            https.get({
                host: "api.github.com",
                port: 443,
                path: "/repos/R2Northstar/Northstar/releases",
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
                    cache[NORTHSTAR_RELEASE_NOTES_KEY] = {
                        "time": Date.now(),
                        "body": JSON.parse(responseData)
                    };
                    _saveCache(cache);
                    resolve( cache[NORTHSTAR_RELEASE_NOTES_KEY]["body"] );
                });
            })
            
            // When GitHub cannot be reached (when user doesn't have Internet 
            // access for instance), we return latest cache content even if 
            // it's not up-to-date, or display an error message if cache
            // is empty.
            .on('error', () => {
                if ( cache[NORTHSTAR_RELEASE_NOTES_KEY] ) {
                    console.warn("Couldn't fetch Northstar release notes, returning data from cache.");
                    resolve( cache[NORTHSTAR_RELEASE_NOTES_KEY]["body"] );
                } else {
                    console.error("Couldn't fetch Northstar release notes, cache is empty.");
                    resolve( ["Couldn't fetch Northstar release notes.\nTry again later!"] );
                }
            });
        }
    });
}

// Returns and caches the Viper release notes
async function getVpReleaseNotes() {
    return new Promise(resolve => {
        let cache = _getRequestsCache();

        if (cache[VIPER_RELEASE_NOTES_KEY] && (Date.now() - cache[VIPER_RELEASE_NOTES_KEY]["time"]) < 5 * 60 * 1000) {
            resolve( cache[VIPER_RELEASE_NOTES_KEY]["body"] );
        } else {
            https.get({
                host: "api.github.com",
                port: 443,
                path: "/repos/0negal/viper/releases",
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
                    cache[VIPER_RELEASE_NOTES_KEY] = {
                        "time": Date.now(),
                        "body": JSON.parse(responseData)
                    };
                    _saveCache(cache);
                    resolve( cache[VIPER_RELEASE_NOTES_KEY]["body"] );
                });
            })

            // When GitHub cannot be reached (when user doesn't have Internet 
            // access for instance), we return latest cache content even if 
            // it's not up-to-date, or display an error message if cache
            // is empty.
            .on('error', () => {
                if ( cache[VIPER_RELEASE_NOTES_KEY] ) {
                    console.warn("Couldn't fetch Viper release notes, returning data from cache.");
                    resolve( cache[VIPER_RELEASE_NOTES_KEY]["body"] );
                } else {
                    console.error("Couldn't fetch Viper release notes, cache is empty.");
                    resolve( ["Couldn't fetch Viper release notes.\nTry again later!"] );
                }
            });
        }
    });
}

module.exports = {
    getLatestNsVersion, 
    getLatestNsVersionLink,
    getNsReleaseNotes,
    getVpReleaseNotes
};
