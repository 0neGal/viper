const vpContent = document.getElementById('vpContent');
const nsContent = document.getElementById('nsContent');
const ttfContent = document.getElementById('ttfContent');
const bgHolder = document.getElementById('bgHolder');

function displayContent (gameId) {
    if (!['ttf', 'ns', 'vp'].includes(gameId)) throw new Error('wrong game id called');
    switch(gameId) {
        case 'vp':
            vpContent.style.display = 'block';
            nsContent.style.display = 'none';
            ttfContent.style.display = 'none';
            bgHolder.style.backgroundImage = "url('../assets/bg/viper.jpg')";
            break;
        case 'ns':
            vpContent.style.display = 'none';
            nsContent.style.display = 'block';
            ttfContent.style.display = 'none';
            bgHolder.style.backgroundImage = "url('../assets/bg/northstar.jpeg')";
            break;
        case 'ttf':
            vpContent.style.display = 'none';
            nsContent.style.display = 'none';
            ttfContent.style.display = 'block';
            bgHolder.style.backgroundImage = "url('../assets/bg/ttf2.jpg')";
            break;
    }
}

async function getNsReleasesText() {
    const response = await (await fetch('https://api.github.com/repos/0negal/viper/releases')).json();

    for (const release of response) {
        vpReleaseNotes.innerText += '#' + release.tag_name + '\n\n' + release.body;
    }
}

getNsReleasesText();


const vpMainBtn = document.getElementById('vpMainBtn');
const vpReleaseBtn = document.getElementById('vpReleaseBtn');
const vpInfoBtn = document.getElementById('vpInfoBtn');
const vpCreditsBtn = document.getElementById('vpCreditsBtn');

const vpMainSection = document.getElementById('vpMain');
const vpReleaseNotes = document.getElementById('vpReleaseNotes');
const vpCredits = document.getElementById('vpCredits');

function showVpSection(section) {
    if (!['main', 'release', 'info', 'credits'].includes(section)) throw new Error('unknown vp section');
    vpMainBtn.removeAttribute('active');
    vpReleaseBtn.removeAttribute('active');
    vpInfoBtn.removeAttribute('active');
    vpCreditsBtn.removeAttribute('active');

    vpMainSection.style.display = 'none';
    vpReleaseNotes.style.display = 'none';
    vpCredits.style.display = 'none';

    switch(section) {
        case 'main':
            vpMainBtn.setAttribute('active', '');
            vpMainSection.style.display = 'block';
            break;
        case 'release':
            vpReleaseBtn.setAttribute('active', '');
            vpReleaseNotes.style.display = 'block';
            break;
        case 'info':
            vpInfoBtn.setAttribute('active', '');
            break;
        case 'credits':
            vpCreditsBtn.setAttribute('active', '');
            vpCredits.style.display = 'block';
            break;
    }
}