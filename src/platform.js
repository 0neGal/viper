const os = require('os');
const util = require('util');
const exec = util.promisify(require('child_process').exec);


// Tries to automatically retrieve Titanfall2 installation folder.
async function getGameFolder() {
    switch(os.platform()) {
        case 'win32':
            // Origin path
            try {
                const {stdout} = await exec("Get-Item -Path Registry::HKEY_LOCAL_MACHINE\\SOFTWARE\\Respawn\\Titanfall2\\", {"shell":"powershell.exe"});
                const originPath = stdout.split('\n')
                    .filter(r => r.indexOf('Install Dir') !== -1)[0]
                    .replace(/\s+/g,' ')
                    .trim()
                    .replace('Install Dir : ','');
                return originPath;
            } catch (err) {
                console.log('Origin path could not be determined.')
            }
            
            // TODO steam => 
            break;
        case 'linux':
            // TODO wine
            // TODO proton
            // TODO lutris
            break;
        default:
            return '';
    }
}


module.exports = {
    getGameFolder
}