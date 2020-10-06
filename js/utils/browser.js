/**
 * Returns an object identifying the user agent browser
 * @param {String} [useragent] The user-agent string to identify
 * @returns {Object}
 */
function browserdetails(useragent) {
    var os = false;
    var browser = false;
    var icon = '';
    var name = '';
    var verSep = "\\s+";
    var verTag = '';
    var nameTrans = '';
    var current = false;
    var brand = false;
    var details = {};
    var displayName;

    if (useragent === undefined || useragent === ua) {
        current = true;
        useragent = ua;
    }
    if (Object(useragent).details !== undefined) {
        return useragent.details;
    }
    useragent = (' ' + useragent).toLowerCase();

    if (current) {
        brand = mega.getBrowserBrandID();
    }
    else if (useragent.indexOf('~:') !== -1) {
        brand = useragent.match(/~:(\d+)/);
        brand = brand && brand.pop() | 0;
    }

    if (useragent.indexOf('windows phone') > 0) {
        icon = 'wp.png';
        os = 'Windows Phone';
    }
    else if (useragent.indexOf('android') > 0 || useragent.indexOf('andr0id') > 0) {
        os = 'Android';
    }
    else if (useragent.indexOf('windows') > 0) {
        os = 'Windows';
    }
    else if (useragent.indexOf('iphone') > 0) {
        os = 'iPhone';
    }
    else if (useragent.indexOf('imega') > 0) {
        os = 'iPhone';
    }
    else if (useragent.indexOf('ipad') > 0) {
        os = 'iPad';
    }
    else if (useragent.indexOf('mac') > 0
        || useragent.indexOf('darwin') > 0) {
        os = 'Apple';
    }
    else if (useragent.indexOf('qnap') > 0) {
        os = 'QNAP';
    }
    else if (useragent.indexOf('synology') > 0) {
        os = 'Synology';
    }
    else if (useragent.indexOf('linux') > 0
        || useragent.indexOf('freebsd') > 0
        || useragent.indexOf('netbsd') > 0
        || useragent.indexOf('openbsd') > 0
        || useragent.indexOf('sunos') > 0
        || useragent.indexOf('gentoo') > 0) {
        os = 'Linux';
    }
    else if (useragent.indexOf('blackberry') > 0) {
        os = 'Blackberry';
    }
    else if (useragent.indexOf(' cros ') > 0) {
        os = 'ChromeOS';
    }
    else if (useragent.indexOf(' kaios') > 0) {
        os = 'KaiOS';
    }
    else if (useragent.indexOf('webos') > 0) {
        os = 'WebOS';
    }

    if (mega.browserBrand[brand]) {
        browser = mega.browserBrand[brand];
    }
    else if (useragent.indexOf(' edge/') > 0) {
        browser = 'Edge';
    }
    else if (useragent.indexOf(' edg/') > 0) {
        displayName = 'Edge (Chromium)';
        icon = 'edgium.png';
        browser = 'Edgium';
        verTag = 'Edg';
    }
    else if (useragent.indexOf('iemobile/') > 0) {
        icon = 'ie.png';
        brand = 'IEMobile';
        browser = 'Internet Explorer';
    }
    else if (useragent.indexOf('smarttv') > 0
        || useragent.indexOf('smart_tv') > 0
        || useragent.indexOf('netcast') > 0
        || useragent.indexOf('webos') > 0
        || useragent.indexOf('hbbtv') > 0) {
        icon = 'linux.png';
        browser = 'SmartTV';
    }
    else if (useragent.indexOf('opera') > 0 || useragent.indexOf(' opr/') > 0 || useragent.indexOf(' opt/') > 0) {
        if (useragent.indexOf(' opr/') > 0) {
            verTag = 'opr';
        }
        else if (useragent.indexOf(' opt/') > 0) {
            verTag = 'opt';
        }
        browser = 'Opera';
    }
    else if (useragent.indexOf(' dragon/') > 0) {
        icon = 'dragon.png';
        browser = 'Comodo Dragon';
        verTag = 'Dragon';
    }
    else if (useragent.indexOf('vivaldi') > 0) {
        browser = 'Vivaldi';
    }
    else if (useragent.indexOf('maxthon') > 0) {
        browser = 'Maxthon';
    }
    else if (useragent.indexOf(' electron/') > 0) {
        browser = 'Electron';
    }
    else if (useragent.indexOf('palemoon') > 0) {
        browser = 'Palemoon';
    }
    else if (useragent.indexOf('cyberfox') > 0) {
        browser = 'Cyberfox';
    }
    else if (useragent.indexOf('waterfox') > 0) {
        browser = 'Waterfox';
    }
    else if (useragent.indexOf('iceweasel') > 0) {
        browser = 'Iceweasel';
    }
    else if (useragent.indexOf('seamonkey') > 0) {
        browser = 'SeaMonkey';
    }
    else if (useragent.indexOf('lunascape') > 0) {
        browser = 'Lunascape';
    }
    else if (useragent.indexOf(' iron/') > 0) {
        browser = 'Iron';
    }
    else if (useragent.indexOf(' superbird/') > 0) {
        browser = 'Superbird';
    }
    else if (useragent.indexOf('avant browser') > 0) {
        browser = 'Avant';
    }
    else if (useragent.indexOf('polarity') > 0) {
        browser = 'Polarity';
    }
    else if (useragent.indexOf('k-meleon') > 0) {
        browser = 'K-Meleon';
    }
    else if (useragent.indexOf(' edga/') > 0) {
        os = 'Android';
        browser = 'Edge';
        details.brand = verTag = 'EdgA';
    }
    else if (useragent.indexOf(' edgios') > 0) {
        browser = 'Edge';
        details.brand = verTag = 'EdgiOS';
    }
    else if (useragent.indexOf(' crios') > 0) {
        browser = 'Chrome';
        details.brand = verTag = 'CriOS';
    }
    else if (useragent.indexOf(' opios') > 0) {
        browser = 'Opera';
        details.brand = verTag = 'OPiOS';
    }
    else if (useragent.indexOf(' fxios') > 0) {
        browser = 'Firefox';
        details.brand = verTag = 'FxiOS';
    }
    else if (useragent.indexOf('ucbrowser') > 0) {
        browser = 'UCBrowser';
    }
    else if (useragent.indexOf('samsungbrowser') > 0) {
        icon = 'samsung.png';
        browser = 'SamsungBrowser';
    }
    else if (useragent.indexOf('yabrowser') > 0) {
        browser = 'YaBrowser';
    }
    else if (useragent.indexOf('miuibrowser') > 0) {
        verTag = 'XiaoMi/MiuiBrowser';
        browser = 'MiuiBrowser';
    }
    else if (useragent.indexOf('puffin/') > 0) {
        browser = 'Puffin';
    }
    else if (useragent.indexOf(' mcent/') > 0) {
        browser = 'mCent';
    }
    else if (useragent.indexOf(' avast/') > 0 || useragent.indexOf(' asw/') > 0) {
        if (useragent.indexOf(' asw/') > 0) {
            verTag = 'ASW';
        }
        browser = 'Avast';
    }
    else if (useragent.indexOf(' vivobrowser/') > 0) {
        browser = 'VivoBrowser';
    }
    else if (useragent.indexOf('qqbrowser/') > 0) {
        browser = 'QQBrowser';
    }
    else if (useragent.indexOf('coc_coc_browser') > 0) {
        browser = 'Coc';
        icon = 'coc.png';
        verTag = 'coc_coc_browser';
    }
    else if (useragent.indexOf(' [fb') > 0
        || useragent.indexOf(' steam ') > 0
        || useragent.indexOf(' eve-') > 0
        || useragent.indexOf(' kik/') > 0
        || useragent.indexOf(' gsa/') > 0
        || useragent.indexOf('messenger') > 0
        || useragent.indexOf('twit' + 'ter') > 0
        || useragent.indexOf('cros' + 'swalk') > 0
        || useragent.indexOf('snap' + 'chat') > 0
        || useragent.indexOf('pint' + 'erest') > 0
        || useragent.indexOf('inst' + 'agram') > 0) {

        icon = 'app.png';
        browser = 'In-App WebView';

        if (useragent.indexOf(' [fb') > 0) {
            verSep = ';';
            verTag = 'FBAV';
        }
        else if (useragent.indexOf(' gsa/') > 0) {
            verTag = 'GSA';
            browser = 'Google Search App';
        }

        details.brand = os === 'Android' ? 'Chrome' : 'Safari';
    }
    else if (useragent.indexOf(' chromium/') > 0) {
        browser = 'Chromium';
    }
    else if (useragent.indexOf('chrome') > 0) {
        browser = 'Chrome';
    }
    else if (useragent.indexOf('safari') > 0) {
        verTag = 'Version';
        browser = os === 'Android' || os === 'Linux' ? null : 'Safari';
    }
    else if (useragent.indexOf('firefox') > 0) {
        browser = 'Firefox';
    }
    else if (useragent.indexOf(' otter/') > 0) {
        browser = 'Otter';
    }
    else if (useragent.indexOf('thunderbird') > 0) {
        browser = 'Thunderbird';
    }
    else if (useragent.indexOf('es plugin ') === 1) {
        icon = 'esplugin.png';
        browser = 'ES File Explorer';
    }
    else if (useragent.indexOf('megasync') > 0) {
        icon = 'mega.png';
        browser = 'MEGAsync';
    }
    else if (useragent.indexOf('megacmd') > 0) {
        icon = 'mega.png';
        browser = 'MEGAcmd';
    }
    else if (useragent.indexOf('msie') > 0
        || useragent.indexOf('trident') > 0) {
        browser = 'Internet Explorer';
    }

    // Translate "%1 on %2" to "Chrome on Windows"
    if ((os) && (browser)) {
        name = (brand || browser) + ' on ' + os;
        nameTrans = String(l && l[7684]).replace('%1', displayName || brand || browser).replace('%2', os);
    }
    else if (os) {
        name = os;
        icon = icon || (os.toLowerCase() + '.png');
    }
    else if (browser) {
        name = browser;
        nameTrans = displayName || name;
    }
    else {
        name = 'Unknown';
        icon = 'unknown.png';
    }

    if (!icon && browser) {
        if (browser === 'Internet Explorer') {
            icon = 'ie.png';
        }
        else {
            icon = browser.toLowerCase() + '.png';
        }
    }

    if (browser === null && os === 'Android') {
        icon = 'android.png';
        name = browser = 'Android Browser';
    }

    details.name = name;
    details.nameTrans = nameTrans || name;
    details.icon = icon;
    details.os = os || '';
    details.browser = browser;
    details.version =
        (useragent.match(RegExp(verSep + (verTag || brand || browser) + "/([\\d.]+)", 'i')) || [])[1] || 0;

    // Determine if the OS is 64bit
    details.is64bit = /\b(WOW64|x86_64|Win64|intel mac os x 10.(9|\d{2,}))/i.test(useragent);

    // Determine if using a browser extension
    details.isExtension = (current && is_extension || useragent.indexOf('megext') > -1);

    // Determine device is ARM machine
    details.isARM = /\barmv?[4-8]+l?\b/.test(useragent);

    if (useragent.indexOf(' MEGAext/') !== -1) {
        var ver = useragent.match(/ MEGAext\/([\d.]+)/);

        details.isExtension = ver && ver[1] || true;
    }

    if (brand) {
        details.brand = brand;
    }

    // Determine core engine.
    if (browser === 'Edge') {
        details.engine = 'EdgeHTML';
    }
    else if (useragent.indexOf('webkit') > 0) {
        details.engine = 'Webkit';
        details.blink = useragent.match(/\bchrom[eium]+\/(\d+(?:\.\d+)?)/);
        if (details.blink) {
            details.blink = String(details.blink[1] || '').replace(/\.0+$/, '');
        }
    }
    else if (useragent.indexOf('trident') > 0) {
        details.engine = 'Trident';
    }
    else if (useragent.indexOf('gecko') > 0) {
        details.engine = 'Gecko';
    }
    else if (useragent.indexOf('presto') > 0) {
        details.engine = 'Presto';
    }
    else {
        details.engine = 'Unknown';
    }

    // Product info to quickly access relevant info.
    details.prod = details.name + ' [' + details.engine + ']'
        + (details.brand ? '[' + details.brand + ']' : '')
        + '[' + details.version + ']'
        + (details.isExtension ? '[E:' + details.isExtension + ']' : '')
        + '[' + (details.is64bit ? 'x64' : 'x32') + ']';

    return details;
}
