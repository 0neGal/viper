const os = require('os');


// Tries to automatically retrieve Titanfall2 installation folder.
function getGameFolder() {
    switch(os.platform()) {
        case 'win32':
            // TODO origin => Get-Item -Path Registry::HKEY_LOCAL_MACHINE\SOFTWARE\Respawn\Titanfall2\
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