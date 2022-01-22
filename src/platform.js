const os = require('os');
const util = require('util');
const exec = util.promisify(require('child_process').exec);


// Tries to automatically retrieve Titanfall2 installation folder.
async function getGameFolder() {
    switch(os.platform()) {
        case 'win32':
            // Game path via Windows register
            try {
                const {stdout} = await exec("Get-Item -Path Registry::HKEY_LOCAL_MACHINE\\SOFTWARE\\Respawn\\Titanfall2\\", {"shell":"powershell.exe"});
                const originPath = stdout.split('\n')
                    .filter(r => r.indexOf('Install Dir') !== -1)[0]
                    .replace(/\s+/g,' ')
                    .trim()
                    .replace('Install Dir : ','');
                return originPath;
            } catch (err) {
                console.log('Game path was not found in register.')
            }
            
            return '';
        case 'linux':
            // TODO wine
            // TODO proton
            // TODO lutris
            break;
        default:
            return '';
    }
}


async function _getSteamGameFolder() {
    let steamInstallPath = "";

    // Checking if Steam is installed on a 64-bit machine
    try {
        const {stdout} = await exec("Get-Item -Path Registry::HKEY_LOCAL_MACHINE\\SOFTWARE\\Wow6432Node\\Valve\\Steam", {"shell":"powershell.exe"});
        steamInstallPath = stdout.split('\n')
            .filter(r => r.indexOf('InstallPath') !== -1)[0]
            .replace(/\s+/g,' ')
            .trim()
            .replace('Steam InstallPath : ','');
    } catch (err) { }

    // Trying to get 32-bit path then !
    if (steamInstallPath.length === 0) {
        try {
            const {stdout} = await exec("Get-Item -Path Registry::HKEY_LOCAL_MACHINE\\SOFTWARE\\Valve\\Steam", {"shell":"powershell.exe"});
            steamInstallPath = stdout.split('\n')
                .filter(r => r.indexOf('InstallPath') !== -1)[0]
                .replace(/\s+/g,' ')
                .trim()
                .replace('Steam InstallPath : ','');
        } catch (err) { }
    }

    if (steamInstallPath.length === 0) return '';

    // TODO read Steam/steamapps/libraryfolders.vdf and find Titanfall2 path in there
}


module.exports = {
    getGameFolder
}