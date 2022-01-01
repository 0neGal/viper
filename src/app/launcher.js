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