const { app } = require("electron");
const path = require("path");
const fs = require("fs");
const fetch = require('electron-fetch').default


// all requests results are stored in this file
const cachePath = path.join(app.getPath("appData"), 'requests.json');
const NORTHSTAR_LATEST_RELEASE_KEY = 'nsLatestRelease';


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

/**
 * Returns latest Northstar version available from GitHub releases.
 * If there's no cache result for this request, or if cache exists but is old, refreshes
 * cache with new data.
 */
async function getLatestNsVersion() {
    let cache = _getRequestsCache();
    
    if (cache[NORTHSTAR_LATEST_RELEASE_KEY] && (Date.now() - cache[NORTHSTAR_LATEST_RELEASE_KEY]['time']) < 5 * 60 * 1000) {
        console.log(`returning ${NORTHSTAR_LATEST_RELEASE_KEY} data from cache`);
        return cache[NORTHSTAR_LATEST_RELEASE_KEY]['body']['tag_name'];
    } else {
        const response = await fetch("https://api.github.com/repos/R2Northstar/Northstar/releases/latest");

        cache[NORTHSTAR_LATEST_RELEASE_KEY] = {
            'time': Date.now(),
            'body': await response.json()
        };
        _saveCache(cache);
        return cache[NORTHSTAR_LATEST_RELEASE_KEY]['body']['tag_name'];
    }
}

/**
 * Returns the download link to latest Northstar version.
 * Should always be called after getLatestNsVersion, as it refreshes 
 * cache data (if needed).
 */
function getLatestNsVersionLink() {
    const cache = _getRequestsCache();
    return cache[NORTHSTAR_LATEST_RELEASE_KEY]['body'].assets[0].browser_download_url;
}


module.exports = {
    getLatestNsVersion, 
    getLatestNsVersionLink
};