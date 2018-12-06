// Release version information is replaced by the build scripts
var buildVersion = { website: '', chrome: '', firefox: '', commit: '', timestamp: '', dateTime: '' };

var m;
var b_u = 0;
var apipath;
var pageLoadTime;
var maintenance = false;
var androidsplash = false;
var silent_loading = false;
var cookiesDisabled = false;
var storageQuotaError = false;
var lastactive = new Date().getTime();
var URL = window.URL || window.webkitURL;
var seqno = Math.ceil(Math.random()*1000000000);
var staticpath = 'https://eu.static.mega.co.nz/3/';
var ua = window.navigator.userAgent.toLowerCase();
var storage_version = '1'; // clear localStorage when version doesn't match
var l, d = false;

// Cache location.search parameters early as the URL may get rewritten later
var locationSearchParams = location.search;

var is_electron = false;
if (typeof process !== 'undefined') {
    var mll = process.moduleLoadList || [];

    if (mll.indexOf('NativeModule ELECTRON_ASAR') !== -1) {
        is_electron = module;
        module = undefined; // prevent factory loaders from using the module

        // localStorage.jj = 1;
    }
}

var tmp = getCleanSitePath();
var is_selenium = !ua.indexOf('mozilla/5.0 (selenium; ');
var is_embed = location.pathname === '/embed' || tmp.substr(0, 2) === 'E!';
var is_drop = location.pathname === '/drop' || tmp.substr(0, 2) === 'D!';
var is_iframed = is_embed || is_drop;
var is_karma = !is_iframed && /^localhost:987[6-9]/.test(window.top.location.host);
var is_chrome_firefox = document.location.protocol === 'chrome:' &&
    document.location.host === 'mega' || document.location.protocol === 'mega:';
var location_sub = document.location.href.substr(0, 16);
var is_chrome_web_ext = location_sub === 'chrome-extension' || location_sub === 'ms-browser-exten';
var is_firefox_web_ext = location_sub === 'moz-extension://';
var is_extension = is_chrome_firefox || is_electron || is_chrome_web_ext || is_firefox_web_ext;
var is_mobile = m = isMobile();
var is_ios = is_mobile && (ua.indexOf('iphone') > -1 || ua.indexOf('ipad') > -1 || ua.indexOf('ipod') > -1);
var is_microsoft = /msie|edge|trident/i.test(ua);
var is_android = /android/.test(ua);
var is_bot = !is_extension && /bot|crawl/i.test(ua);
var is_old_windows_phone = /Windows Phone 8|IEMobile\/9|IEMobile\/10|IEMobile\/11/i.test(ua);

/**
 * Check if the user is coming from a mobile device
 * @returns {Boolean}
 */
function isMobile() {

    // If extension, not applicable
    if (is_extension) {
        return false;
    }

    var mobileStrings = [
        'iphone', 'ipad', 'android', 'blackberry', 'nokia', 'opera mini',
        'windows mobile', 'windows phone', 'iemobile', 'mobile safari', 'bb10; touch'
    ];

    for (var i = mobileStrings.length; i--;) {
        if (ua.indexOf(mobileStrings[i]) > 0) {
            return true;
        }
    }

    return false;
}

function getSitePath() {
    var hash = location.hash.replace('#', '');

    if (hashLogic || isPublicLink(hash)) {
        return '/' + hash;
    }

    if (location.host === 'webcache.googleusercontent.com') {
        var m = String(location.href).match(/mega\.nz\/([\w-]+)/);
        if (m) {
            return '/' + m[1];
        }
    }

    return document.location.pathname;
}

// remove dangling characters from the pathname/hash
function getCleanSitePath(path) {
    if (path === undefined) {
        path = getSitePath();
    }

    path = mURIDecode(path).replace(/^[/#]+|\/+$/g, '');

    return path;
}

// Check whether the provided `page` points to a public link
function isPublicLink(page) {
    page = mURIDecode(page).replace(/^[/#]+/, '');

    var types = {'F!': 1, 'P!': 1, 'E!': 1, 'D!': 1};
    return (page[0] === '!' || types[page.substr(0, 2)]) ? page : false;
}

// Safer wrapper around decodeURIComponent
function mURIDecode(path) {
    path = String(path);

    if (path.indexOf('%25') >= 0) {
        do {
            path = path.replace(/%25/g, '%');
        } while (path.indexOf('%25') >= 0);
    }
    if (path.indexOf('%21') >= 0) {
        path = path.replace(/%21/g, '!');
    }
    try {
        path = decodeURIComponent(path);
    }
    catch (e) {}

    return path;
}

function clickURLs() {
    $('a.clickurl').rebind('click', function() {
        var $this = $(this);
        var url = $this.attr('href') || $this.data('fxhref');
        if (url) {
            if (window.loadingDialog && $this.hasClass('pages-nav')) {
                loadingDialog.quiet = true;
                onIdle(function() {
                    loadingDialog.quiet = false;
                });
            }
            loadSubPage(url.substr(1));
            return false;
        }
    });
}

function geoStaticpath(eu)
{
    if (!eu) {
        try {
            if (!sessionStorage.skipcdn) {
                var cc_eu = 'FR DE NL ES PT DK CH IT UK GB NO SE FI PL CZ SK AT GR RO HU IE TR VA MC SM LI AD JE GG UA BG LT LV EE AX IS MA DZ LY TN EG RU BY HR SI AL ME RS KO EU FO CY IL LB SY SA JO IQ BA CV PS EH GI GL IM LU MK SJ BF BI BJ BW CF CG CM DJ ER ET GA GH GM GN GN GW KE KM LR LS MG ZA AE ML MR MT MU MV MW MZ NA NE QA RW SD SS SL SZ TD TG TZ UG YE ZA ZM ZR ZW';
                var cc_na = 'US CA MX AG BS BB BZ CR CO CU DO GD GT GY HT HN JM NI PA KN LC VC SR TT VE IS GL AI BL VG PR VI VE CO EC CL BR BO PY UY AR GY SR PE GF FK';
                var cc_nz = 'NZ AU FJ NC';
				var cc_sg = 'HK TH VN ID MY BD NP MM BT IN PH LK BN';
                var cm = String(document.cookie).match(/geoip\s*\=\s*([A-Z]{2})/);
				if (cm && cm[1] && cc_sg.indexOf(cm[1]) > -1)
                    return 'https://sg.static.mega.co.nz/3/';
                else if (cm && cm[1] && cc_na.indexOf(cm[1]) > -1)
                    return 'https://na.static.mega.co.nz/3/';
                else if (cm && cm[1] && cc_nz.indexOf(cm[1]) > -1)
                    return 'https://nz.static.mega.co.nz/3/';
                else if (cm && cm[1] && cc_eu.indexOf(cm[1]) == -1)
                    return 'https://g.cdn1.mega.co.nz/3/';
            }
        } catch(e) {
            setTimeout(function() { throw e; }, 2100);
        }
    }
    return 'https://eu.static.mega.co.nz/3/';
}

if (is_chrome_firefox) {
    var Cu = Components.utils;
    var Cc = Components.classes;
    var Ci = Components.interfaces;

    Cu['import']("resource://gre/modules/XPCOMUtils.jsm");
    Cu['import']("resource://gre/modules/Services.jsm");

    ['userAgent', 'appName', 'appVersion', 'platform', 'oscpu']
        .forEach(function(k) {
            var pref = 'general.' + k.toLowerCase() + '.override';

            if (Services.prefs.prefHasUserValue(pref)
                    && Services.prefs.getPrefType(pref) === 32) {

                try {
                    var value = Services.prefs.getCharPref(pref);
                    Services.prefs.clearUserPref(pref);

                    Object.defineProperty(navigator, k, {
                        enumerable: true,
                        value: Cc["@mozilla.org/network/protocol;1?name=http"]
                                    .getService(Ci.nsIHttpProtocolHandler)[k]
                    });
                    Services.prefs.setCharPref(pref, value);
                }
                catch (e) {}
            }
        });

    ua = navigator.userAgent.toLowerCase();
}

var myURL = window.URL;
b_u = b_u || !myURL || typeof DataView === 'undefined' || (window.chrome && !document.exitPointerLock);

if (!String.prototype.trim) {
    String.prototype.trim = function() {
        return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
    };
}
if (!String.prototype.localeCompare) {
    String.prototype.localeCompare = function(to) {
        var s1 = this.toLowerCase();
        var s2 = String(to).toLowerCase();
        return s1 > s2 ? 1 : (s1 < s2 ? -1 : 0);
    };
}
if (!String.trim) {
    String.trim = function(s) {
        return String(s).trim();
    };
}
if (!Date.now) {
    Date.now = function now() {
        return new Date().getTime();
    };
}

try {
    // Browser compatibility
    // Fx 4.0   Chrome 5   MSIE 9   Opera 11.60   Safari 5.1
    Object.defineProperty(this, 'megaChatIsDisabled', (function() {
        var status;
        return {
            set: function(val) {
                status = val;
                if (status) {
                    $(document.body).addClass("megaChatDisabled");
                }
                else {
                    $(document.body).removeClass("megaChatDisabled");
                }
            },
            get: function() {
                return status || localStorage.testChatDisabled
                    || (localStorage.chatDisabled !== undefined
                        && localStorage.chatDisabled !== "0");
            }
        };
    })());

    // Check whether Mega Chat is enabled *and* initialized
    Object.defineProperty(this, 'megaChatIsReady', {
        get: function() {
            return !megaChatIsDisabled
                && typeof megaChat !== 'undefined'
                && megaChat.is_initialized;
        }
    });
}
catch (ex) {
    console.error(ex);
    window.megaChatIsReady = false;
    window.megaChatIsDisabled = false;
    b_u = true;
}

if (!b_u) try
{
    if (is_chrome_firefox)
    {
        XPCOMUtils.defineLazyModuleGetter(this, "NetUtil", "resource://gre/modules/NetUtil.jsm");

        (function(global) {
            global.loadSubScript = function(file,scope) {
                var loader = Services.scriptloader;

                if (global.d && loader.loadSubScriptWithOptions) {
                    loader.loadSubScriptWithOptions(file, {
                        charset: "UTF-8",
                        ignoreCache: true,
                        target: scope || global
                    });
                } else {
                    loader.loadSubScript(file, scope || global);
                }
            };
        })(this);

        try {
            var mozBrowserID =
            [   Services.appinfo.name,
                Services.appinfo.platformVersion,
                Services.appinfo.platformBuildID,
                Services.appinfo.OS,
                Services.appinfo.XPCOMABI].join(" ");
        } catch(e) {
            var mozBrowserID = ua;
        }

        loadSubScript('chrome://mega/content/strg.js');

        if (!(localStorage instanceof Ci.nsIDOMStorage)) {
            throw new Error('Invalid DOM Storage instance.');
        }
    }
    try {
        if (typeof localStorage === 'undefined' || localStorage === null) {
            throw new Error('SecurityError: DOM Exception 18');
        }
        d = localStorage.d | 0;
        jj = localStorage.jj;
        dd = localStorage.dd;

        // Write test
        localStorage['$!--foo'] = Array(100).join(",");
        delete localStorage['$!--foo'];
    }
    catch (ex) {

        storageQuotaError = (ex.code === 22);
        cookiesDisabled = ex.code && ex.code === DOMException.SECURITY_ERR
            || ex.message === 'SecurityError: DOM Exception 18'
            || storageQuotaError;

        if (!cookiesDisabled) {
            throw ex;
        }

        // Cookies are disabled, therefore we can't use localStorage.
        // We could either show the user a message about the issue and let him
        // enable cookies, or rather setup a tiny polyfill so that they can use
        // the site even in such case, even though this solution has side effects.
        tmp = Object.create({}, {
                length:     { get: function() { return Object.keys(this).length; }},
                key:        { value: function(pos) { return Object.keys(this)[pos]; }},
                removeItem: { value: function(key) { delete this[key]; }},
                setItem:    { value: function(key, value) { this[key] = String(value); }},
                getItem:    { value: function(key) {
                    if (this.hasOwnProperty(key)) {
                        return this[key];
                    }
                    return null;
                }},
                clear: {
                    value: function() {
                        var obj = this;
                        Object.keys(obj).forEach(function(memb) {
                            if (obj.hasOwnProperty(memb)) {
                                delete obj[memb];
                            }
                        });
                    }
                }
            });

        try {
            delete window.localStorage;
            Object.defineProperty(window, 'localStorage', { value: tmp });
            Object.defineProperty(window, 'sessionStorage', { value: tmp });
        }
        catch (e) {
            if (!is_mobile) {
                throw ex;
            }
        }
        tmp = undefined;

        if (location.host !== 'mega.nz' && !is_karma) {
            dd = d = 1;
            if (!is_mobile) {
                jj = 1;
            }
        }
        setTimeout(function() {
            console.warn('Apparently you have Cookies disabled, ' +
                'please note this session is temporal, ' +
                'it will die once you close/reload the browser/tab.');
        }, 4000);
    }

    var contenterror = 0;
    var nocontentcheck = false;

    if (!is_extension && (window.dd || (location.host !== 'mega.nz' && location.host !== 'webcache.googleusercontent.com'))) {

        nocontentcheck = true;
        var devhost = window.location.host;
        // handle subdirs
        // Disable pathSuffixes, because they are no longer supported: the webclient will now only work from root
        var pathSuffix = '';
        pathSuffix = pathSuffix.split("/").slice(0, -1).join("/");
        // set the staticpath for debug mode
        staticpath = window.location.protocol + "//" + devhost + pathSuffix + "/";
        if (window.d) {
            console.debug('StaticPath set to "' + staticpath + '"');
        }
    }
    else {
        staticpath = localStorage.staticpath;
    }
    staticpath = staticpath || geoStaticpath();
    apipath = localStorage.apipath || 'https://g.api.mega.co.nz/';
}
catch(e) {
    if (!m || !cookiesDisabled) {
        var extraInfo = '';
        if (storageQuotaError) {
            extraInfo = "\n\nTip: We've detected this issue is likely caused by " +
                "browsing in private mode, please try turning it off.";
        }
        else if (cookiesDisabled) {
            extraInfo = "\n\nTip: We've detected this issue is likely related to " +
                "having Cookies disabled, please check your browser settings.";
        }
        alert(
            "Sorry, we were unable to initialize the browser's local storage, " +
            "either you're using an outdated/misconfigured browser or " +
            "it's something from our side.\n" +
            "\n"+
            "If you think it's our fault, please report the issue back to us.\n" +
            "\n" +
            "Reason: " + (e.message || e) +
            "\nBrowser: " + (typeof mozBrowserID !== 'undefined' ? mozBrowserID : ua)
            + extraInfo
        );
        b_u = 1;
    }
}

var mega = {
    ui: {},
    flags: 0,
    utils: {},
    updateURL: 'https://eu.static.mega.co.nz/3/current_ver.txt',
    chrome: (
        typeof window.chrome === 'object'
        && window.chrome.runtime !== undefined
        && String(window.webkitRTCPeerConnection).indexOf('native') > 0
    ),
    browserBrand: [
        0, 'Torch', 'Epic'
    ],
    whoami: 'We make secure cloud storage simple. Create an account and get 50 GB ' +
            'free on MEGA\'s end-to-end encrypted cloud collaboration platform today!',

    maxWorkers: Math.min(navigator.hardwareConcurrency || 4, 12),

    /** An object with flags detailing which features are enabled on the API */
    apiMiscFlags: {},

    /** Get browser brancd internal ID */
    getBrowserBrandID: function() {
        if (Object(window.chrome).torch) {
            return 1;
        }
        else {
            var plugins = Object(navigator.plugins);
            var len = plugins.length | 0;

            while (len--) {
                var plugin = Object(plugins[len]);

                // XXX: This plugin might be shown in other browsers than Epic,
                //      hence we check for chrome.webstore since it won't appear
                //      in Google Chrome, although it might does in other forks?
                if (plugin.name === 'Epic Privacy Browser Installer') {
                    return Object(window.chrome).webstore ? 2 : 0;
                }
            }
        }

        return 0;
    },

    /** Load performance report */
    initLoadReport: function() {
        var r = {startTime: Date.now(), stepTimeStamp: Date.now(), EAGAINs: 0, e500s: 0, errs: 0, mode: 1};

        r.aliveTimer = setInterval(function() {
            var now = Date.now();
            if ((now - r.aliveTimeStamp) > 20000) {
                // Either the browser froze for too long or the computer
                // was resumed from sleep/hibernation... let's hope it's
                // the later and do not send this report.
                r.sent = true;
                clearInterval(r.aliveTimer);
            }
            else if (r.scSent && now - r.scSent > 6e4 && (scqhead > scqtail * 2)) {
                api_req({a: 'log', e: 99679}); // sc processing took too long

                msgDialog('warninga:!^' + l[17704] + '!' + l[17705], l[882], l[17706], 0, function(yes) {
                    if (yes) {
                        fm_forcerefresh();
                    }
                });
            }
            r.aliveTimeStamp = now;
        }, 2000);

        this.loadReport = r;
        this.flags |= window.MEGAFLAG_LOADINGCLOUD;
    },

    /** Parameters to append to API requests */
    urlParams: function() {
        if (!this._urlParams) {
            var params = '&domain=meganz'; // domain origin

            // If using an extension, the version is passed through to the API for the helpdesk tool
            if (is_extension) {
                params += '&ext=' + (is_chrome_web_ext ? buildVersion.chrome : buildVersion.firefox);
            }

            // Append browser brand for easier troubleshoting
            var brand = this.getBrowserBrandID();
            if (brand) {
                params += '&bb=' + parseInt(brand);
            }

            var apiut = localStorage.apiut ? '&ut=' + localStorage.apiut : "";
            params += apiut;

            params += '&lang=' + lang;
            this._urlParams = params;
        }

        return this._urlParams;
    }
};

var hashLogic = false;
if (localStorage.hashLogic) hashLogic=true;
if (localStorage.testMobileSite) is_mobile = m = true;
if (typeof history == 'undefined') hashLogic=true;

var bootstaticpath = staticpath;
var urlrootfile = '';

// Disable hash checking for search engines to speed the site load up
if (is_bot) {
    nocontentcheck = true;
}

if (!b_u && is_extension)
{
    hashLogic = true;
    nocontentcheck=true;

    if (is_chrome_firefox)
    {
        bootstaticpath = 'chrome://mega/content/';
        urlrootfile = 'secure.html';
        if (d > 1) {
            staticpath = bootstaticpath;
        }
        else {
            staticpath = 'https://eu.static.mega.co.nz/3/';
        }
        try {
            loadSubScript(bootstaticpath + 'fileapi.js');
        } catch(e) {
            b_u = 1;
            Cu.reportError(e);
            alert('Unable to initialize core functionality:\n\n' + e + '\n\n' + mozBrowserID);
        }
        if (location.protocol === 'mega:') {
            try {
                var url = mObjectURL([""]);
                myURL.revokeObjectURL(url);
            }
            catch (e) {
                console.error('mObjectURL failed, is this TOR?', e);
                document.location = bootstaticpath + urlrootfile + location.hash;
            }
        }
    }
    else if (is_electron) {
        urlrootfile = 'index.html';
        bootstaticpath = location.href.replace(urlrootfile, '');
    }
    else /* Google Chrome */
    {
        tmp = 'mega';
        if (typeof chrome.runtime.getManifest === 'function' && !Object(chrome.runtime.getManifest()).update_url) {
            tmp = localStorage.chromextdevpath || tmp;
        }
        bootstaticpath = chrome.extension.getURL(tmp + '/');
        urlrootfile = tmp + '/secure.html';
    }

    Object.defineProperty(window, 'eval', {
        value : function eval(code) {
            throw new Error('Unsafe eval is not allowed, code: ' + String(code).replace(/\s+/g,' ').substr(0,60) + '...');
        }
    });
}


var page;
var locSearch = location.search;

if (hashLogic) {
    // legacy support:
    page = getCleanSitePath(document.location.hash);
}
else if ((page = isPublicLink(document.location.hash))) {
    // folder or file link: always keep the hash URL to ensure that keys remain client side
    // history.replaceState so that back button works in new URL paradigm
    history.replaceState({subpage: page}, "", '#' + page);
}
else {
    if (document.location.hash.length > 0) {
        // history.replaceState for legacy hash requests to new URL paradigm
        page = document.location.hash;
    }
    else {
        // new URL paradigm, look for desired page in the location.pathname:
        page = document.location.pathname;
    }
    page = getCleanSitePath(page);
	// put try block around it to allow the page to be rendered in Google cache
	try
	{
		history.replaceState({subpage: page}, "", '/' + page);
	}
	catch(e)
	{
		console.log('Probably Google Cache?');
	}
}


if (b_u && !is_mobile) {
    document.location = 'update.html';
}

// Mapping of user's browser language preference to language codes and native/english names
var languages = {
    'ar': [['ar', 'ar-'], 'Arabic', 'العربية'],
    'br': [['pt-br', 'pt'], 'Portuguese', 'Português'],
    'cn': [['zh', 'zh-cn'], 'Chinese', '简体中文'],
    'ct': [['zh-hk', 'zh-sg', 'zh-tw'], 'Traditional Chinese', '中文繁體'],
    'de': [['de', 'de-'], 'German', 'Deutsch'],
    'en': [['en', 'en-'], 'English', 'English'],
    'es': [['es', 'es-'], 'Spanish', 'Español'],
    'fr': [['fr', 'fr-'], 'French', 'Français'],
    'id': [['id'], 'Indonesian', 'Bahasa Indonesia'],
    'it': [['it', 'it-'], 'Italian', 'Italiano'],
    'jp': [['ja'], 'Japanese', '日本語'],
    'kr': [['ko'], 'Korean', '한국어'],
    'nl': [['nl', 'nl-'], 'Dutch', 'Nederlands'],
    'pl': [['pl'], 'Polish', 'Polski'],
    'ro': [['ro', 'ro-'], 'Romanian', 'Română'],
    'ru': [['ru', 'ru-mo'], 'Russian', 'Pусский'],
    'th': [['||'], 'Thai', 'ไทย'],
    'tl': [['en-ph'], 'Tagalog', 'Tagalog'],
    'tr': [['tr', 'tr-'], 'Turkish', 'Türkçe'],
    'uk': [['||'], 'Ukrainian', 'Українська'],
    'vi': [['vn', 'vi'], 'Vietnamese', 'Tiếng Việt']
};

/**
 * Below is the asmCrypto SHA-256 library which was converted to a string so it can be run by the web worker which
 * hashes the files. This was created by:
 * 1) Running 'git clone https://github.com/vibornoff/asmcrypto.js.git'
 * 2) Running 'npm install' to install Grunt and other dependencies
 * 3) Running 'git checkout v0.0.9' to switch to the v0.0.9 stable release version
 * 4) Running 'grunt --with="sha256" devel' to build the library with just SHA-256
 * 5) Changing namespace to asmCryptoSha256 so it does not interfere with the main asmCrypto library that is loaded later
 * 5) Replacing single quotes with double quotes, removing comments and whitespace (variable and function names remain unobfuscated)
 */
var asmCryptoSha256Js = '!function(exports,global){function IllegalStateError(){var err=Error.apply(this,arguments);this.message=err.message,this.stack=err.stack}IllegalStateError.prototype=Object.create(Error.prototype,{name:{value:"IllegalStateError"}});function IllegalArgumentError(){var err=Error.apply(this,arguments);this.message=err.message,this.stack=err.stack}IllegalArgumentError.prototype=Object.create(Error.prototype,{name:{value:"IllegalArgumentError"}});function SecurityError(){var err=Error.apply(this,arguments);this.message=err.message,this.stack=err.stack}SecurityError.prototype=Object.create(Error.prototype,{name:{value:"SecurityError"}});var FloatArray=global.Float64Array||global.Float32Array;function string_to_bytes(str,utf8){utf8=!!utf8;var len=str.length,bytes=new Uint8Array(utf8?4*len:len);for(var i=0,j=0;i<len;i++){var c=str.charCodeAt(i);if(utf8&&0xd800<=c&&c<=0xdbff){if(++i>=len)throw new Error("Malformed string, low surrogate expected at position "+i);c=((c^0xd800)<<10)|0x10000|(str.charCodeAt(i)^0xdc00)}else if(!utf8&&c>>>8){throw new Error("Wide characters are not allowed.");}if(!utf8||c<=0x7f){bytes[j++]=c}else if(c<=0x7ff){bytes[j++]=0xc0|(c>>6);bytes[j++]=0x80|(c&0x3f)}else if(c<=0xffff){bytes[j++]=0xe0|(c>>12);bytes[j++]=0x80|(c>>6&0x3f);bytes[j++]=0x80|(c&0x3f)}else{bytes[j++]=0xf0|(c>>18);bytes[j++]=0x80|(c>>12&0x3f);bytes[j++]=0x80|(c>>6&0x3f);bytes[j++]=0x80|(c&0x3f)}}return bytes.subarray(0,j)}function hex_to_bytes(str){var len=str.length;if(len&1){str="0"+str;len++}var bytes=new Uint8Array(len>>1);for(var i=0;i<len;i+=2){bytes[i>>1]=parseInt(str.substr(i,2),16)}return bytes}function base64_to_bytes(str){return string_to_bytes(atob(str))}function bytes_to_string(bytes,utf8){utf8=!!utf8;var len=bytes.length,chars=new Array(len);for(var i=0,j=0;i<len;i++){var b=bytes[i];if(!utf8||b<128){chars[j++]=b}else if(b>=192&&b<224&&i+1<len){chars[j++]=((b&0x1f)<<6)|(bytes[++i]&0x3f)}else if(b>=224&&b<240&&i+2<len){chars[j++]=((b&0xf)<<12)|((bytes[++i]&0x3f)<<6)|(bytes[++i]&0x3f)}else if(b>=240&&b<248&&i+3<len){var c=((b&7)<<18)|((bytes[++i]&0x3f)<<12)|((bytes[++i]&0x3f)<<6)|(bytes[++i]&0x3f);if(c<=0xffff){chars[j++]=c}else{c^=0x10000;chars[j++]=0xd800|(c>>10);chars[j++]=0xdc00|(c&0x3ff)}}else{throw new Error("Malformed UTF8 character at byte offset "+i);}}var str="",bs=16384;for(var i=0;i<j;i+=bs){str+=String.fromCharCode.apply(String,chars.slice(i,i+bs<=j?i+bs:j))}return str}function bytes_to_hex(arr){var str="";for(var i=0;i<arr.length;i++){var h=(arr[i]&0xff).toString(16);if(h.length<2)str+="0";str+=h}return str}function bytes_to_base64(arr){return btoa(bytes_to_string(arr))}function pow2_ceil(a){a-=1;a|=a>>>1;a|=a>>>2;a|=a>>>4;a|=a>>>8;a|=a>>>16;a+=1;return a}function is_number(a){return(typeof a==="number")}function is_string(a){return(typeof a==="string")}function is_buffer(a){return(a instanceof ArrayBuffer)}function is_bytes(a){return(a instanceof Uint8Array)}function is_typed_array(a){return(a instanceof Int8Array)||(a instanceof Uint8Array)||(a instanceof Int16Array)||(a instanceof Uint16Array)||(a instanceof Int32Array)||(a instanceof Uint32Array)||(a instanceof Float32Array)||(a instanceof Float64Array)}function _heap_init(constructor,options){var heap=options.heap,size=heap?heap.byteLength:options.heapSize||65536;if(size&0xfff||size<=0)throw new Error("heap size must be a positive integer and a multiple of 4096");heap=heap||new constructor(new ArrayBuffer(size));return heap}function _heap_write(heap,hpos,data,dpos,dlen){var hlen=heap.length-hpos,wlen=(hlen<dlen)?hlen:dlen;heap.set(data.subarray(dpos,dpos+wlen),hpos);return wlen}function hash_reset(){this.result=null;this.pos=0;this.len=0;this.asm.reset();return this}function hash_process(data){if(this.result!==null)throw new IllegalStateError("state must be reset before processing new data");if(is_string(data))data=string_to_bytes(data);if(is_buffer(data))data=new Uint8Array(data);if(!is_bytes(data))throw new TypeError("data isnt of expected type");var asm=this.asm,heap=this.heap,hpos=this.pos,hlen=this.len,dpos=0,dlen=data.length,wlen=0;while(dlen>0){wlen=_heap_write(heap,hpos+hlen,data,dpos,dlen);hlen+=wlen;dpos+=wlen;dlen-=wlen;wlen=asm.process(hpos,hlen);hpos+=wlen;hlen-=wlen;if(!hlen)hpos=0}this.pos=hpos;this.len=hlen;return this}function hash_finish(){if(this.result!==null)throw new IllegalStateError("state must be reset before processing new data");this.asm.finish(this.pos,this.len,0);this.result=new Uint8Array(this.HASH_SIZE);this.result.set(this.heap.subarray(0,this.HASH_SIZE));this.pos=0;this.len=0;return this}function sha256_asm(stdlib,foreign,buffer){"use asm";var H0=0,H1=0,H2=0,H3=0,H4=0,H5=0,H6=0,H7=0,TOTAL0=0,TOTAL1=0;var I0=0,I1=0,I2=0,I3=0,I4=0,I5=0,I6=0,I7=0,O0=0,O1=0,O2=0,O3=0,O4=0,O5=0,O6=0,O7=0;var HEAP=new stdlib.Uint8Array(buffer);function _core(w0,w1,w2,w3,w4,w5,w6,w7,w8,w9,w10,w11,w12,w13,w14,w15){w0=w0|0;w1=w1|0;w2=w2|0;w3=w3|0;w4=w4|0;w5=w5|0;w6=w6|0;w7=w7|0;w8=w8|0;w9=w9|0;w10=w10|0;w11=w11|0;w12=w12|0;w13=w13|0;w14=w14|0;w15=w15|0;var a=0,b=0,c=0,d=0,e=0,f=0,g=0,h=0,t=0;a=H0;b=H1;c=H2;d=H3;e=H4;f=H5;g=H6;h=H7;t=(w0+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x428a2f98)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;t=(w1+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x71374491)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;t=(w2+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0xb5c0fbcf)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;t=(w3+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0xe9b5dba5)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;t=(w4+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x3956c25b)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;t=(w5+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x59f111f1)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;t=(w6+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x923f82a4)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;t=(w7+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0xab1c5ed5)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;t=(w8+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0xd807aa98)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;t=(w9+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x12835b01)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;t=(w10+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x243185be)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;t=(w11+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x550c7dc3)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;t=(w12+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x72be5d74)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;t=(w13+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x80deb1fe)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;t=(w14+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x9bdc06a7)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;t=(w15+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0xc19bf174)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w0=t=((w1>>>7^w1>>>18^w1>>>3^w1<<25^w1<<14)+(w14>>>17^w14>>>19^w14>>>10^w14<<15^w14<<13)+w0+w9)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0xe49b69c1)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w1=t=((w2>>>7^w2>>>18^w2>>>3^w2<<25^w2<<14)+(w15>>>17^w15>>>19^w15>>>10^w15<<15^w15<<13)+w1+w10)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0xefbe4786)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w2=t=((w3>>>7^w3>>>18^w3>>>3^w3<<25^w3<<14)+(w0>>>17^w0>>>19^w0>>>10^w0<<15^w0<<13)+w2+w11)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x0fc19dc6)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w3=t=((w4>>>7^w4>>>18^w4>>>3^w4<<25^w4<<14)+(w1>>>17^w1>>>19^w1>>>10^w1<<15^w1<<13)+w3+w12)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x240ca1cc)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w4=t=((w5>>>7^w5>>>18^w5>>>3^w5<<25^w5<<14)+(w2>>>17^w2>>>19^w2>>>10^w2<<15^w2<<13)+w4+w13)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x2de92c6f)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w5=t=((w6>>>7^w6>>>18^w6>>>3^w6<<25^w6<<14)+(w3>>>17^w3>>>19^w3>>>10^w3<<15^w3<<13)+w5+w14)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x4a7484aa)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w6=t=((w7>>>7^w7>>>18^w7>>>3^w7<<25^w7<<14)+(w4>>>17^w4>>>19^w4>>>10^w4<<15^w4<<13)+w6+w15)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x5cb0a9dc)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w7=t=((w8>>>7^w8>>>18^w8>>>3^w8<<25^w8<<14)+(w5>>>17^w5>>>19^w5>>>10^w5<<15^w5<<13)+w7+w0)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x76f988da)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w8=t=((w9>>>7^w9>>>18^w9>>>3^w9<<25^w9<<14)+(w6>>>17^w6>>>19^w6>>>10^w6<<15^w6<<13)+w8+w1)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x983e5152)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w9=t=((w10>>>7^w10>>>18^w10>>>3^w10<<25^w10<<14)+(w7>>>17^w7>>>19^w7>>>10^w7<<15^w7<<13)+w9+w2)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0xa831c66d)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w10=t=((w11>>>7^w11>>>18^w11>>>3^w11<<25^w11<<14)+(w8>>>17^w8>>>19^w8>>>10^w8<<15^w8<<13)+w10+w3)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0xb00327c8)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w11=t=((w12>>>7^w12>>>18^w12>>>3^w12<<25^w12<<14)+(w9>>>17^w9>>>19^w9>>>10^w9<<15^w9<<13)+w11+w4)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0xbf597fc7)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w12=t=((w13>>>7^w13>>>18^w13>>>3^w13<<25^w13<<14)+(w10>>>17^w10>>>19^w10>>>10^w10<<15^w10<<13)+w12+w5)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0xc6e00bf3)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w13=t=((w14>>>7^w14>>>18^w14>>>3^w14<<25^w14<<14)+(w11>>>17^w11>>>19^w11>>>10^w11<<15^w11<<13)+w13+w6)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0xd5a79147)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w14=t=((w15>>>7^w15>>>18^w15>>>3^w15<<25^w15<<14)+(w12>>>17^w12>>>19^w12>>>10^w12<<15^w12<<13)+w14+w7)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x06ca6351)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w15=t=((w0>>>7^w0>>>18^w0>>>3^w0<<25^w0<<14)+(w13>>>17^w13>>>19^w13>>>10^w13<<15^w13<<13)+w15+w8)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x14292967)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w0=t=((w1>>>7^w1>>>18^w1>>>3^w1<<25^w1<<14)+(w14>>>17^w14>>>19^w14>>>10^w14<<15^w14<<13)+w0+w9)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x27b70a85)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w1=t=((w2>>>7^w2>>>18^w2>>>3^w2<<25^w2<<14)+(w15>>>17^w15>>>19^w15>>>10^w15<<15^w15<<13)+w1+w10)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x2e1b2138)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w2=t=((w3>>>7^w3>>>18^w3>>>3^w3<<25^w3<<14)+(w0>>>17^w0>>>19^w0>>>10^w0<<15^w0<<13)+w2+w11)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x4d2c6dfc)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w3=t=((w4>>>7^w4>>>18^w4>>>3^w4<<25^w4<<14)+(w1>>>17^w1>>>19^w1>>>10^w1<<15^w1<<13)+w3+w12)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x53380d13)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w4=t=((w5>>>7^w5>>>18^w5>>>3^w5<<25^w5<<14)+(w2>>>17^w2>>>19^w2>>>10^w2<<15^w2<<13)+w4+w13)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x650a7354)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w5=t=((w6>>>7^w6>>>18^w6>>>3^w6<<25^w6<<14)+(w3>>>17^w3>>>19^w3>>>10^w3<<15^w3<<13)+w5+w14)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x766a0abb)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w6=t=((w7>>>7^w7>>>18^w7>>>3^w7<<25^w7<<14)+(w4>>>17^w4>>>19^w4>>>10^w4<<15^w4<<13)+w6+w15)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x81c2c92e)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w7=t=((w8>>>7^w8>>>18^w8>>>3^w8<<25^w8<<14)+(w5>>>17^w5>>>19^w5>>>10^w5<<15^w5<<13)+w7+w0)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x92722c85)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w8=t=((w9>>>7^w9>>>18^w9>>>3^w9<<25^w9<<14)+(w6>>>17^w6>>>19^w6>>>10^w6<<15^w6<<13)+w8+w1)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0xa2bfe8a1)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w9=t=((w10>>>7^w10>>>18^w10>>>3^w10<<25^w10<<14)+(w7>>>17^w7>>>19^w7>>>10^w7<<15^w7<<13)+w9+w2)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0xa81a664b)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w10=t=((w11>>>7^w11>>>18^w11>>>3^w11<<25^w11<<14)+(w8>>>17^w8>>>19^w8>>>10^w8<<15^w8<<13)+w10+w3)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0xc24b8b70)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w11=t=((w12>>>7^w12>>>18^w12>>>3^w12<<25^w12<<14)+(w9>>>17^w9>>>19^w9>>>10^w9<<15^w9<<13)+w11+w4)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0xc76c51a3)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w12=t=((w13>>>7^w13>>>18^w13>>>3^w13<<25^w13<<14)+(w10>>>17^w10>>>19^w10>>>10^w10<<15^w10<<13)+w12+w5)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0xd192e819)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w13=t=((w14>>>7^w14>>>18^w14>>>3^w14<<25^w14<<14)+(w11>>>17^w11>>>19^w11>>>10^w11<<15^w11<<13)+w13+w6)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0xd6990624)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w14=t=((w15>>>7^w15>>>18^w15>>>3^w15<<25^w15<<14)+(w12>>>17^w12>>>19^w12>>>10^w12<<15^w12<<13)+w14+w7)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0xf40e3585)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w15=t=((w0>>>7^w0>>>18^w0>>>3^w0<<25^w0<<14)+(w13>>>17^w13>>>19^w13>>>10^w13<<15^w13<<13)+w15+w8)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x106aa070)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w0=t=((w1>>>7^w1>>>18^w1>>>3^w1<<25^w1<<14)+(w14>>>17^w14>>>19^w14>>>10^w14<<15^w14<<13)+w0+w9)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x19a4c116)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w1=t=((w2>>>7^w2>>>18^w2>>>3^w2<<25^w2<<14)+(w15>>>17^w15>>>19^w15>>>10^w15<<15^w15<<13)+w1+w10)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x1e376c08)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w2=t=((w3>>>7^w3>>>18^w3>>>3^w3<<25^w3<<14)+(w0>>>17^w0>>>19^w0>>>10^w0<<15^w0<<13)+w2+w11)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x2748774c)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w3=t=((w4>>>7^w4>>>18^w4>>>3^w4<<25^w4<<14)+(w1>>>17^w1>>>19^w1>>>10^w1<<15^w1<<13)+w3+w12)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x34b0bcb5)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w4=t=((w5>>>7^w5>>>18^w5>>>3^w5<<25^w5<<14)+(w2>>>17^w2>>>19^w2>>>10^w2<<15^w2<<13)+w4+w13)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x391c0cb3)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w5=t=((w6>>>7^w6>>>18^w6>>>3^w6<<25^w6<<14)+(w3>>>17^w3>>>19^w3>>>10^w3<<15^w3<<13)+w5+w14)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x4ed8aa4a)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w6=t=((w7>>>7^w7>>>18^w7>>>3^w7<<25^w7<<14)+(w4>>>17^w4>>>19^w4>>>10^w4<<15^w4<<13)+w6+w15)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x5b9cca4f)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w7=t=((w8>>>7^w8>>>18^w8>>>3^w8<<25^w8<<14)+(w5>>>17^w5>>>19^w5>>>10^w5<<15^w5<<13)+w7+w0)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x682e6ff3)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w8=t=((w9>>>7^w9>>>18^w9>>>3^w9<<25^w9<<14)+(w6>>>17^w6>>>19^w6>>>10^w6<<15^w6<<13)+w8+w1)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x748f82ee)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w9=t=((w10>>>7^w10>>>18^w10>>>3^w10<<25^w10<<14)+(w7>>>17^w7>>>19^w7>>>10^w7<<15^w7<<13)+w9+w2)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x78a5636f)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w10=t=((w11>>>7^w11>>>18^w11>>>3^w11<<25^w11<<14)+(w8>>>17^w8>>>19^w8>>>10^w8<<15^w8<<13)+w10+w3)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x84c87814)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w11=t=((w12>>>7^w12>>>18^w12>>>3^w12<<25^w12<<14)+(w9>>>17^w9>>>19^w9>>>10^w9<<15^w9<<13)+w11+w4)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x8cc70208)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w12=t=((w13>>>7^w13>>>18^w13>>>3^w13<<25^w13<<14)+(w10>>>17^w10>>>19^w10>>>10^w10<<15^w10<<13)+w12+w5)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0x90befffa)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w13=t=((w14>>>7^w14>>>18^w14>>>3^w14<<25^w14<<14)+(w11>>>17^w11>>>19^w11>>>10^w11<<15^w11<<13)+w13+w6)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0xa4506ceb)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w14=t=((w15>>>7^w15>>>18^w15>>>3^w15<<25^w15<<14)+(w12>>>17^w12>>>19^w12>>>10^w12<<15^w12<<13)+w14+w7)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0xbef9a3f7)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;w15=t=((w0>>>7^w0>>>18^w0>>>3^w0<<25^w0<<14)+(w13>>>17^w13>>>19^w13>>>10^w13<<15^w13<<13)+w15+w8)|0;t=(t+h+(e>>>6^e>>>11^e>>>25^e<<26^e<<21^e<<7)+(g^e&(f^g))+0xc67178f2)|0;h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+((b&c)^(d&(b^c)))+(b>>>2^b>>>13^b>>>22^b<<30^b<<19^b<<10))|0;H0=(H0+a)|0;H1=(H1+b)|0;H2=(H2+c)|0;H3=(H3+d)|0;H4=(H4+e)|0;H5=(H5+f)|0;H6=(H6+g)|0;H7=(H7+h)|0}function _core_heap(offset){offset=offset|0;_core(HEAP[offset|0]<<24|HEAP[offset|1]<<16|HEAP[offset|2]<<8|HEAP[offset|3],HEAP[offset|4]<<24|HEAP[offset|5]<<16|HEAP[offset|6]<<8|HEAP[offset|7],HEAP[offset|8]<<24|HEAP[offset|9]<<16|HEAP[offset|10]<<8|HEAP[offset|11],HEAP[offset|12]<<24|HEAP[offset|13]<<16|HEAP[offset|14]<<8|HEAP[offset|15],HEAP[offset|16]<<24|HEAP[offset|17]<<16|HEAP[offset|18]<<8|HEAP[offset|19],HEAP[offset|20]<<24|HEAP[offset|21]<<16|HEAP[offset|22]<<8|HEAP[offset|23],HEAP[offset|24]<<24|HEAP[offset|25]<<16|HEAP[offset|26]<<8|HEAP[offset|27],HEAP[offset|28]<<24|HEAP[offset|29]<<16|HEAP[offset|30]<<8|HEAP[offset|31],HEAP[offset|32]<<24|HEAP[offset|33]<<16|HEAP[offset|34]<<8|HEAP[offset|35],HEAP[offset|36]<<24|HEAP[offset|37]<<16|HEAP[offset|38]<<8|HEAP[offset|39],HEAP[offset|40]<<24|HEAP[offset|41]<<16|HEAP[offset|42]<<8|HEAP[offset|43],HEAP[offset|44]<<24|HEAP[offset|45]<<16|HEAP[offset|46]<<8|HEAP[offset|47],HEAP[offset|48]<<24|HEAP[offset|49]<<16|HEAP[offset|50]<<8|HEAP[offset|51],HEAP[offset|52]<<24|HEAP[offset|53]<<16|HEAP[offset|54]<<8|HEAP[offset|55],HEAP[offset|56]<<24|HEAP[offset|57]<<16|HEAP[offset|58]<<8|HEAP[offset|59],HEAP[offset|60]<<24|HEAP[offset|61]<<16|HEAP[offset|62]<<8|HEAP[offset|63])}function _state_to_heap(output){output=output|0;HEAP[output|0]=H0>>>24;HEAP[output|1]=H0>>>16&255;HEAP[output|2]=H0>>>8&255;HEAP[output|3]=H0&255;HEAP[output|4]=H1>>>24;HEAP[output|5]=H1>>>16&255;HEAP[output|6]=H1>>>8&255;HEAP[output|7]=H1&255;HEAP[output|8]=H2>>>24;HEAP[output|9]=H2>>>16&255;HEAP[output|10]=H2>>>8&255;HEAP[output|11]=H2&255;HEAP[output|12]=H3>>>24;HEAP[output|13]=H3>>>16&255;HEAP[output|14]=H3>>>8&255;HEAP[output|15]=H3&255;HEAP[output|16]=H4>>>24;HEAP[output|17]=H4>>>16&255;HEAP[output|18]=H4>>>8&255;HEAP[output|19]=H4&255;HEAP[output|20]=H5>>>24;HEAP[output|21]=H5>>>16&255;HEAP[output|22]=H5>>>8&255;HEAP[output|23]=H5&255;HEAP[output|24]=H6>>>24;HEAP[output|25]=H6>>>16&255;HEAP[output|26]=H6>>>8&255;HEAP[output|27]=H6&255;HEAP[output|28]=H7>>>24;HEAP[output|29]=H7>>>16&255;HEAP[output|30]=H7>>>8&255;HEAP[output|31]=H7&255}function reset(){H0=0x6a09e667;H1=0xbb67ae85;H2=0x3c6ef372;H3=0xa54ff53a;H4=0x510e527f;H5=0x9b05688c;H6=0x1f83d9ab;H7=0x5be0cd19;TOTAL0=TOTAL1=0}function init(h0,h1,h2,h3,h4,h5,h6,h7,total0,total1){h0=h0|0;h1=h1|0;h2=h2|0;h3=h3|0;h4=h4|0;h5=h5|0;h6=h6|0;h7=h7|0;total0=total0|0;total1=total1|0;H0=h0;H1=h1;H2=h2;H3=h3;H4=h4;H5=h5;H6=h6;H7=h7;TOTAL0=total0;TOTAL1=total1}function process(offset,length){offset=offset|0;length=length|0;var hashed=0;if(offset&63)return-1;while((length|0)>=64){_core_heap(offset);offset=(offset+64)|0;length=(length-64)|0;hashed=(hashed+64)|0}TOTAL0=(TOTAL0+hashed)|0;if(TOTAL0>>>0<hashed>>>0)TOTAL1=(TOTAL1+1)|0;return hashed|0}function finish(offset,length,output){offset=offset|0;length=length|0;output=output|0;var hashed=0,i=0;if(offset&63)return-1;if(~output)if(output&31)return-1;if((length|0)>=64){hashed=process(offset,length)|0;if((hashed|0)==-1)return-1;offset=(offset+hashed)|0;length=(length-hashed)|0}hashed=(hashed+length)|0;TOTAL0=(TOTAL0+length)|0;if(TOTAL0>>>0<length>>>0)TOTAL1=(TOTAL1+1)|0;HEAP[offset|length]=0x80;if((length|0)>=56){for(i=(length+1)|0;(i|0)<64;i=(i+1)|0)HEAP[offset|i]=0x00;_core_heap(offset);length=0;HEAP[offset|0]=0}for(i=(length+1)|0;(i|0)<59;i=(i+1)|0)HEAP[offset|i]=0;HEAP[offset|56]=TOTAL1>>>21&255;HEAP[offset|57]=TOTAL1>>>13&255;HEAP[offset|58]=TOTAL1>>>5&255;HEAP[offset|59]=TOTAL1<<3&255|TOTAL0>>>29;HEAP[offset|60]=TOTAL0>>>21&255;HEAP[offset|61]=TOTAL0>>>13&255;HEAP[offset|62]=TOTAL0>>>5&255;HEAP[offset|63]=TOTAL0<<3&255;_core_heap(offset);if(~output)_state_to_heap(output);return hashed|0}function hmac_reset(){H0=I0;H1=I1;H2=I2;H3=I3;H4=I4;H5=I5;H6=I6;H7=I7;TOTAL0=64;TOTAL1=0}function _hmac_opad(){H0=O0;H1=O1;H2=O2;H3=O3;H4=O4;H5=O5;H6=O6;H7=O7;TOTAL0=64;TOTAL1=0}function hmac_init(p0,p1,p2,p3,p4,p5,p6,p7,p8,p9,p10,p11,p12,p13,p14,p15){p0=p0|0;p1=p1|0;p2=p2|0;p3=p3|0;p4=p4|0;p5=p5|0;p6=p6|0;p7=p7|0;p8=p8|0;p9=p9|0;p10=p10|0;p11=p11|0;p12=p12|0;p13=p13|0;p14=p14|0;p15=p15|0;reset();_core(p0^0x5c5c5c5c,p1^0x5c5c5c5c,p2^0x5c5c5c5c,p3^0x5c5c5c5c,p4^0x5c5c5c5c,p5^0x5c5c5c5c,p6^0x5c5c5c5c,p7^0x5c5c5c5c,p8^0x5c5c5c5c,p9^0x5c5c5c5c,p10^0x5c5c5c5c,p11^0x5c5c5c5c,p12^0x5c5c5c5c,p13^0x5c5c5c5c,p14^0x5c5c5c5c,p15^0x5c5c5c5c);O0=H0;O1=H1;O2=H2;O3=H3;O4=H4;O5=H5;O6=H6;O7=H7;reset();_core(p0^0x36363636,p1^0x36363636,p2^0x36363636,p3^0x36363636,p4^0x36363636,p5^0x36363636,p6^0x36363636,p7^0x36363636,p8^0x36363636,p9^0x36363636,p10^0x36363636,p11^0x36363636,p12^0x36363636,p13^0x36363636,p14^0x36363636,p15^0x36363636);I0=H0;I1=H1;I2=H2;I3=H3;I4=H4;I5=H5;I6=H6;I7=H7;TOTAL0=64;TOTAL1=0}function hmac_finish(offset,length,output){offset=offset|0;length=length|0;output=output|0;var t0=0,t1=0,t2=0,t3=0,t4=0,t5=0,t6=0,t7=0,hashed=0;if(offset&63)return-1;if(~output)if(output&31)return-1;hashed=finish(offset,length,-1)|0;t0=H0,t1=H1,t2=H2,t3=H3,t4=H4,t5=H5,t6=H6,t7=H7;_hmac_opad();_core(t0,t1,t2,t3,t4,t5,t6,t7,0x80000000,0,0,0,0,0,0,768);if(~output)_state_to_heap(output);return hashed|0}function pbkdf2_generate_block(offset,length,block,count,output){offset=offset|0;length=length|0;block=block|0;count=count|0;output=output|0;var h0=0,h1=0,h2=0,h3=0,h4=0,h5=0,h6=0,h7=0,t0=0,t1=0,t2=0,t3=0,t4=0,t5=0,t6=0,t7=0;if(offset&63)return-1;if(~output)if(output&31)return-1;HEAP[(offset+length)|0]=block>>>24;HEAP[(offset+length+1)|0]=block>>>16&255;HEAP[(offset+length+2)|0]=block>>>8&255;HEAP[(offset+length+3)|0]=block&255;hmac_finish(offset,(length+4)|0,-1)|0;h0=t0=H0,h1=t1=H1,h2=t2=H2,h3=t3=H3,h4=t4=H4,h5=t5=H5,h6=t6=H6,h7=t7=H7;count=(count-1)|0;while((count|0)>0){hmac_reset();_core(t0,t1,t2,t3,t4,t5,t6,t7,0x80000000,0,0,0,0,0,0,768);t0=H0,t1=H1,t2=H2,t3=H3,t4=H4,t5=H5,t6=H6,t7=H7;_hmac_opad();_core(t0,t1,t2,t3,t4,t5,t6,t7,0x80000000,0,0,0,0,0,0,768);t0=H0,t1=H1,t2=H2,t3=H3,t4=H4,t5=H5,t6=H6,t7=H7;h0=h0^H0;h1=h1^H1;h2=h2^H2;h3=h3^H3;h4=h4^H4;h5=h5^H5;h6=h6^H6;h7=h7^H7;count=(count-1)|0}H0=h0;H1=h1;H2=h2;H3=h3;H4=h4;H5=h5;H6=h6;H7=h7;if(~output)_state_to_heap(output);return 0}return{reset:reset,init:init,process:process,finish:finish,hmac_reset:hmac_reset,hmac_init:hmac_init,hmac_finish:hmac_finish,pbkdf2_generate_block:pbkdf2_generate_block}}var _sha256_block_size=64,_sha256_hash_size=32;function sha256_constructor(options){options=options||{};this.heap=_heap_init(Uint8Array,options);this.asm=options.asm||sha256_asm(global,null,this.heap.buffer);this.BLOCK_SIZE=_sha256_block_size;this.HASH_SIZE=_sha256_hash_size;this.reset()}sha256_constructor.BLOCK_SIZE=_sha256_block_size;sha256_constructor.HASH_SIZE=_sha256_hash_size;var sha256_prototype=sha256_constructor.prototype;sha256_prototype.reset=hash_reset;sha256_prototype.process=hash_process;sha256_prototype.finish=hash_finish;var sha256_instance=null;function get_sha256_instance(){if(sha256_instance===null)sha256_instance=new sha256_constructor({heapSize:0x100000});return sha256_instance}function sha256_bytes(data){if(data===undefined)throw new SyntaxError("data required");return get_sha256_instance().reset().process(data).finish().result}function sha256_hex(data){var result=sha256_bytes(data);return bytes_to_hex(result)}function sha256_base64(data){var result=sha256_bytes(data);return bytes_to_base64(result)}sha256_constructor.bytes=sha256_bytes;sha256_constructor.hex=sha256_hex;sha256_constructor.base64=sha256_base64;exports.SHA256=sha256_constructor;global.asmCryptoSha256=exports}({},function(){return this}());';

function addScript(data) {
    "use strict";
    return mCreateElement('script', {type: 'text/javascript'}, 'head', data);
}

function mCreateElement(aNode, aAttrs, aChildNodes, aTarget, aData) {
    "use strict";

    aNode = document.createElement(aNode);
    if (!aNode) {
        return null;
    }

    if (aAttrs) {
        for (var attr in aAttrs) {
            aNode.setAttribute( attr, '' + aAttrs[attr]);
        }
    }

    if (!Array.isArray(aChildNodes)) {
        aData = aTarget;
        aTarget = aChildNodes;
        aChildNodes = null;
    }

    if (aChildNodes) {
        for (var cn in aChildNodes) {
            if (aChildNodes[cn]) {
                aNode.appendChild(aChildNodes[cn]);
            }
        }
    }

    if (aTarget) {
        if (typeof aTarget === 'string') {
            aTarget = document[aTarget] || document.getElementsByTagName(aTarget)[0];
        }
        if (aTarget) {
            aTarget.appendChild(aNode);
        }
        else if (d) {
            console.error('Invalid target', aNode, aAttrs, aTarget);
        }
    }

    if (aData) {
        aData = mObjectURL(aData, aAttrs && aAttrs.type || 'text/plain');

        if (!d) {
            aNode.onload = function() {
                setTimeout(function() {
                    URL.revokeObjectURL(aData);
                }, 2600);

                aNode.onload = null;
            };
        }

        if (aNode.nodeName === 'SCRIPT') {
            aNode.src = aData;
        }
        else {
            aNode.href = aData;
        }
    }

    return aNode;
}

function mObjectURL(data, type)
{
    var blob;
    try {
        blob = new Blob( data, { type: type });
    } catch(e) {
        if (d) console.error(e);
        if (!window.BlobBuilder) {
            window.BlobBuilder = window.WebKitBlobBuilder || window.MozBlobBuilder || window.MSBlobBuilder;
        }
        if (window.BlobBuilder) {
            var bb = new BlobBuilder();
            bb.append(data.join("\n"));
            blob = bb.getBlob(type);
        }
    }
    return blob && URL.createObjectURL(blob);
}

/**
 * Events broadcaster
 * @name mBroadcaster
 * @global
 */
(function(s, o) {
    'use strict';
    Object.defineProperty(s, 'mBroadcaster', {
        value: o,
        writable: false
    });
})(self, {
    // @private
    _topics: Object.create(null),

    /**
     * Add broadcast event listener.
     * @param {String} topic A string representing the event type to listen for.
     * @param {Object|Function} options Event options or function to invoke.
     * @returns {String} The ID identifying the event
     * @memberOf mBroadcaster
     */
    addListener: function mBroadcaster_addListener(topic, options) {
        'use strict';

        if (typeof options === 'function') {
            options = {
                callback : options
            };
        }
        if (options.hasOwnProperty('handleEvent')) {
            options = {
                scope: options,
                callback: options.handleEvent
            };
        }
        if (typeof options.callback !== 'function') {
            return false;
        }

        if (!this._topics[topic]) {
            this._topics[topic] = Object.create(null);
        }

        var id = makeUUID();
        this._topics[topic][id] = options;

        //if (d) console.log('Adding broadcast listener', topic, id, options);

        return id;
    },

    /**
     * Check whether someone is listening for an event
     * @param {String} topic A string representing the event type we may be listening for.
     * @returns {Boolean}
     */
    hasListener: function mBroadcaster_hasListener(topic) {
        'use strict';
        return Boolean(this._topics[topic]);
    },

    /**
     * Remove all broadcast events for an specific topic.
     * @param {String} topic The string representing the event type we were listening for.
     * @returns {Boolean} Whether the event was found.
     * @memberOf mBroadcaster
     */
    removeListeners: function mBroadcaster_removeListeners(topic) {
        'use strict';

        if (this._topics[topic]) {
            delete this._topics[topic];
            return true;
        }
        return false;
    },

    /**
     * Remove an specific event based on the ID given by addListener()
     * @param {String} token The ID identifying the event.
     * @param {EventListener} [listener] Optional DOM event listener.
     * @returns {Boolean} Whether the event was found.
     * @memberOf mBroadcaster
     */
    removeListener: function mBroadcaster_removeListenr(token, listener) {
        'use strict';

        // if (d) console.log('Removing broadcast listener', token);

        if (listener) {
            // Remove an EventListener interface.
            var found;
            for (var id in this._topics[token]) {
                if (this._topics[token].hasOwnProperty(id)
                    && this._topics[token][id].scope === listener) {

                    found = id;
                    break;
                }
            }

            token = found;
        }

        for (var topic in this._topics) {
            if (this._topics[topic][token]) {
                delete this._topics[topic][token];
                if (!Object.keys(this._topics[topic]).length) {
                    delete this._topics[topic];
                }
                return true;
            }
        }
        return false;
    },

    /**
     * Send a broadcast event
     * @param {String} topic A string representing the event type to notify.
     * @returns {Boolean} Whether anyone were listening.
     * @memberOf mBroadcaster
     */
    sendMessage: function mBroadcaster_sendMessage(topic) {
        'use strict';

        if (this._topics[topic]) {
            var idr  = [];
            var args = toArray.apply(null, arguments);
            args.shift();

            if (!args.length) {
                args = [{type: topic}];
            }

            // if (d) console.log('Broadcasting ' + topic, args);

            for (var id in this._topics[topic]) {
                var ev = this._topics[topic][id], rc;
                try {
                    rc = ev.callback.apply(ev.scope, args);
                } catch (ex) {
                    if (d) console.error(ex);

                    onIdle(function() {
                        throw ex;
                    });
                }
                if (ev.once || rc === 0xDEAD)
                    idr.push(id);
            }
            if (idr.length) {
                for (var i = idr.length; i--;) {
                    this.removeListener(idr[i]);
                }
            }

            return true;
        }

        return false;
    },

    /**
     * Wrapper around addListener() that will listen for the event just once.
     * @param {String} topic A string representing the event type to listen for.
     * @param {Function} callback The function to invoke
     * @memberOf mBroadcaster
     */
    once: function mBroadcaster_once(topic, callback) {
        'use strict';

        this.addListener(topic, {
            once : true,
            callback : callback
        });
    },

    crossTab: {
        eTag: '$CTE$!_',

        initialize: function crossTab_init(cb) {
            var setup = function(ev) {
                var msg = String(ev && ev.key).substr(this.eTag.length);
                if (d) console.log('crossTab setup-event', msg, ev);
                if (cb && (!ev || msg === 'pong')) {
                    this.unlisten(setup);
                    if (msg !== 'pong') {
                        this.setMaster();
                    } else {
                        delete localStorage[ev.key];
                    }
                    this.listen();
                    if (d) {
                        console.log('CROSSTAB COMMUNICATION INITIALIZED AS '
                            + (this.master ? 'MASTER':'SLAVE'));

                        console.log(String(ua));
                        console.log(buildVersion);
                        console.log(browserdetails(ua).prod + u_handle);
                    }
                    cb(this.master);
                    cb = null;
                }
            }.bind(this);

            if (this.handle) {
                this.eTag = this.eTag.split(this.handle).shift();
            }
            this.slaves = [];
            this.handle = u_handle;
            this.eTag += u_handle + '!';

            this.ctID = ~~(Math.random() * Date.now());
            this.listen(setup);
            this.notify('ping');

            // if multiple tabs are reloaded/opened at the same time
            // they would both see .ctInstances as === 0, so we need to increase this
            // as earlier as possible, e.g. now.
            localStorage.ctInstances = (parseInt(localStorage.ctInstances) || 0) + 1;

            setTimeout(function() {
                setup();
            }, parseInt(localStorage.ctInstances) === 1 ? 0 : 2000);
        },

        listen: function crossTab_listen(aListener) {
            if (window.addEventListener) {
                window.addEventListener('storage', aListener || this, false);
            }
            else if (window.attachEvent) {
                if (!aListener) {
                    aListener = this.__msie_listener = this.handleEvent.bind(this);
                }
                window.attachEvent('onstorage', aListener);
            }
        },

        unlisten: function crossTab_unlisten(aListener) {
            if (window.addEventListener) {
                window.removeEventListener('storage', aListener || this, false);
            }
            else if (window.attachEvent) {
                if (!aListener) {
                    aListener = this.__msie_listener;
                    delete this.__msie_listener;
                }
                window.detachEvent('onstorage', aListener);
            }
        },

        leave: function crossTab_leave() {
            if (this.ctID) {
                var wasMaster = this.master;
                if (wasMaster) {
                    var current = parseInt(localStorage.ctInstances);
                    if (current > 1) {
                        // only decrease ctInstnaces if its > 1, so that we would never
                        // get into a case when ctInstances is < 0
                        localStorage.ctInstances--;
                    }
                    else {
                        localStorage.ctInstances = 0;
                    }
                    localStorage['mCrossTabRef_' + u_handle] = this.master;
                    delete this.master;
                } else if (d) {
                    console.log('crossTab leaving');
                }

                this.unlisten();
                this.notify('leaving', {
                    wasMaster: wasMaster || -1,
                    newMaster: this.slaves[0]
                });

                mBroadcaster.sendMessage('crossTab:leave', wasMaster);
                this.ctID = 0;
            }
        },

        notify: function crossTab_notify(msg, data) {
            data = { origin: this.ctID, data: data, sid: Math.random()};
            localStorage.setItem(this.eTag + msg, JSON.stringify(data));
            if (d) console.log('crossTab Notifying', this.eTag + msg, localStorage[this.eTag + msg]);
        },

        setMaster: function crossTab_setMaster() {
            this.master = (Math.random() * Date.now()).toString(36);

            localStorage.ctInstances = (this.slaves.length + 1);
            mBroadcaster.sendMessage('crossTab:master', this.master);

            // (function liveLoop(tag) {
            // if (tag === mBroadcaster.crossTab.master) {
            // localStorage['mCrossTabRef_' + u_handle] = Date.now();
            // setTimeout(liveLoop, 6e3, tag);
            // }
            // })(this.master);
        },

        clear: function crossTab_clear() {
            Object.keys(localStorage).forEach(function(key) {
                if (key.substr(0,this.eTag.length) === this.eTag) {
                    if (d) console.log('crossTab Removing ' + key);
                    delete localStorage[key];
                }
            }.bind(this));
        },

        handleEvent: function crossTab_handleEvent(ev) {
            if (d > 1) console.log('crossTab ' + ev.type + '-event', ev.key, ev.newValue, ev);

            if (String(ev.key).indexOf(this.eTag) !== 0) {
                return;
            }
            var msg = ev.key.substr(this.eTag.length),
                strg = JSON.parse(ev.newValue ||'""');

            if (!strg || strg.origin === this.ctID) {
                if (d) console.log('Ignoring crossTab event', msg, strg);
                return;
            }

            switch (msg) {
                case 'ping':
                    this.slaves.push(strg.origin);
                    if (this.master) {
                        localStorage.ctInstances = (this.slaves.length + 1);
                    }

                    this.notify('pong');
                    break;
                case 'leaving':
                    var idx = this.slaves.indexOf(strg.origin);
                    if (idx !== -1) {
                        this.slaves.splice(idx, 1);
                        if (this.master) {
                            localStorage.ctInstances = (this.slaves.length + 1);
                        }
                    }

                    if (localStorage['mCrossTabRef_' + u_handle] === strg.data.wasMaster) {
                        if (strg.data.newMaster === this.ctID) {
                            if (d) {
                                console.log('Taking crossTab-master ownership');
                            }
                            delete localStorage['mCrossTabRef_' + u_handle];
                            this.setMaster();
                            //if (u_handle && window.indexedDB) {
                            //    mDBstart(true);
                            //}
                            if (Object(window.fmdb).crashed === 666) {
                                fmdb.crashed = 0;
                            }
                        }
                    }
                default:
                    mBroadcaster.sendMessage('crossTab:' + msg, strg);

                    break;
            }

            delete localStorage[ev.key];
        }
    }
});

if (!is_karma) {
    Object.freeze(mBroadcaster);
}


var sh = [];

/**
 * Check that the hexadecimal hash of the file from the worker thread matches the correct one created at deployment time
 * @param {String} hashFromWorker A hexadecimal string
 * @param {String} fileName The file name with the SHA-256 hash appended at the end
 * @returns {Boolean}
 */
function compareHashes(hashFromWorker, fileName) {

    // Retrieve the SHA-256 hash that was appended to the file name
    var startOfHash = fileName.lastIndexOf('_') + 1;
    var endOfHash = fileName.lastIndexOf('.');
    var hashFromDeployment = fileName.substring(startOfHash, endOfHash);

    if (hashFromWorker === hashFromDeployment) {
        //console.log('Hash match on file: ' + fileName + '. Hash from worker thread: ' + hashFromWorker + ' Hash from deployment script: ' + hashFromDeployment);
        return true;
    }
    else {
        console.error('Hash mismatch on file: ' + fileName + '. Hash from worker thread: ' + hashFromWorker + ' Hash from deployment script: ' + hashFromDeployment);
        return false;
    }
}

function init_storage ( storage ) {
    var v = storage.v || 0,
        d = storage.d,
        dd = storage.dd,
        sp = storage.staticpath;

    // Graceful storage version upgrade
    if ( v == 0 ) {
        // array of limbs -> mpi-encoded number
        function b2mpi (b) {
            var bs = 28, bm = (1 << bs) - 1, bn = 1, bc = 0, r = [0], rb = 1, rn = 0;
            var bits = b.length * bs;
            var n, rr='';

            for ( n = 0; n < bits; n++ ) {
                if ( b[bc] & bn ) r[rn] |= rb;
                if ( (rb <<= 1) > 255 ) rb = 1, r[++rn] = 0;
                if ( (bn <<= 1) > bm ) bn = 1, bc++;
            }

            while ( rn && r[rn] == 0 ) rn--;

            bn = 256;
            for ( bits = 8; bits > 0; bits-- ) if ( r[rn] & (bn >>= 1) ) break;
            bits += rn * 8;

            rr += String.fromCharCode(bits/256)+String.fromCharCode(bits%256);
            if ( bits ) for ( n = rn; n >= 0; n-- ) rr += String.fromCharCode(r[n]);
            return rr;
        }

        if ( storage.privk && storage.privk.substr(0, 1) == "[") { /* is json serialized array which need to be migrated */
            // Upgrade key format
            try {
                var privk = JSON.parse(storage.privk), str = '';
                for ( var i = 0; i < privk.length; i++ ) str += b2mpi( privk[i] );
                storage.privk = btoa(str).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
                v++;
            }
            catch ( e ) {
                console.error("Could not migrate storage - priv key could not be converted to the new format: ", e);
            }
        }
        else {
            v++;
        }

        storage.v = v;
    }
    // if ( v == 1 ) { ... }
    // if ( v == 2 ) { ... }
    // ... and so on

    // Or upgrade hard when graceful method isn't provided
    if ( v != storage_version ) {
        storage.clear();
        storage.v = storage_version;
        if ( d ) storage.d = d;
        if ( dd ) storage.dd = dd;
        if ( sp ) storage.staticpath = sp;
    }

    return storage;
}

if (typeof XDomainRequest !== 'undefined' && typeof ArrayBuffer === 'undefined') {
    window.getxhr = function _getxhr() {
        return new XDomainRequest();
    };
}
else {
    window.getxhr = function _getxhr() {
        return new XMLHttpRequest();
    };
}

function siteLoadError(error, filename) {
    'use strict';
    var message = ['MEGA failed to load because of '];
    if (location.host !== 'mega.nz') {
        message[0] += '..';
    }
    if (error === 1) {
        message.push('The file "' + filename + '" is corrupt.');
    }
    else if (error === 2) {
        message.push('The file "' + filename + '" could not be loaded.');
    }
    else {
        message.push('Filename: ' + filename + "\nException: " + error);
        message.push('Stack trace: ' + String(error.stack).split('\n').splice(1, 4).join('\n'));
    }
    message.push('Please click OK to refresh and try again.');
    message.push("If the problem persists, please try disabling all third-party browser extensions,"
        + " update your browser and MEGA browser extension to the latest version.If that does not help, "
        + "contact support@mega.nz");
    message.push('BrowserID: ' + (typeof mozBrowserID !== 'undefined' ? mozBrowserID : ua));
    message.push('Static server: ' + staticpath);
    contenterror = 1;
    // showing a confirm dialog containing the message, and if 'OK' pressed it will reload
    if (confirm(message.join("\n\n")) === true) {
        location.reload(true);
    }
}

// Add manifest.json so this can be used on latest browsers.
var tag=document.createElement('link');
tag.rel = "manifest";
tag.href = "/manifest.json";
document.getElementsByTagName('head')[0].appendChild(tag);

if (m || (typeof localStorage !== 'undefined' && localStorage.mobile))
{
    var tag=document.createElement('meta');
    tag.name = "viewport";
    tag.content = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0";
    document.getElementsByTagName('head')[0].appendChild(tag);
    var tag=document.createElement('meta');
    tag.name = "apple-mobile-web-app-capable";
    tag.content = "yes";
    document.getElementsByTagName('head')[0].appendChild(tag);
    var tag=document.createElement('meta');
    tag.name = "apple-mobile-web-app-status-bar-style";
    tag.content = "black";
    document.getElementsByTagName('head')[0].appendChild(tag);
    var tag=document.createElement('link');
    tag.rel = "apple-touch-icon-precomposed";
    tag.sizes = "144x144";
    tag.href = staticpath + "images/favicons/apple-touch-icon-144x144.png";
    document.getElementsByTagName('head')[0].appendChild(tag);
    var tag=document.createElement('link');
    tag.rel = "apple-touch-icon-precomposed";
    tag.sizes = "114x114";
    tag.href = staticpath + "images/favicons/apple-touch-icon-114x114.png";
    document.getElementsByTagName('head')[0].appendChild(tag);
    var tag=document.createElement('link');
    tag.rel = "apple-touch-icon-precomposed";
    tag.sizes = "72x72";
    tag.href = staticpath + "images/favicons/apple-touch-icon-72x72.png";
    document.getElementsByTagName('head')[0].appendChild(tag);
    var tag=document.createElement('link');
    tag.rel = "apple-touch-icon-precomposed";
    tag.href = staticpath + "images/favicons/apple-touch-icon-57x57.png";
    document.getElementsByTagName('head')[0].appendChild(tag);
    var tag=document.createElement('link');
    tag.rel = "shortcut icon";
    tag.type = "image/vnd.microsoft.icon";
    tag.href = "https://mega.nz/favicon.ico";
    document.getElementsByTagName('head')[0].appendChild(tag);
    m=true;
}

if (is_ios) {
    tmp = document.querySelector('meta[name="apple-itunes-app"]');
    if (tmp) {
        tmp.setAttribute('content',
            'app-id=706857885, app-argument=mega://#' + page);
    }

    // http://whatsmyuseragent.com/Devices/iPhone-User-Agent-Strings
    // http://www.enterpriseios.com/wiki/Complete_List_of_iOS_User_Agent_Strings
    tmp = ua.match(/(?:iphone|cpu) os (\d+)[\._](\d+)/);
    if (tmp) {
        var rev = tmp.pop();
        tmp = tmp.pop();

        console.log('Found iOS ' + tmp + '.' + rev);

        is_ios = parseInt(tmp);
        if (!is_ios) {
            // Huh?
            is_ios = true;
        }
    }
    tmp = undefined;

    if (m) {
        // Prevent Safari's copy&paste bug..
        window.onhashchange = function() {
            location.reload();
        };
    }
}

/**
 * Some legacy secureboot mobile code that has been refactored to keep just the blog working and also redirect to the
 * app if any cancel, verify, fm/ipc, newsignup, recover or account links are clicked in the app
 * because the new mobile site is not designed for those yet.
 */
if (m && (page.substr(0, 6) === 'verify' || page.substr(0, 6) === 'fm/ipc' || page.substr(0, 9) === 'newsignup' ||
    page.substr(0, 7) === 'account' || page.substr(0, 4) === 'blog' ||
    (is_old_windows_phone && page.substr(0, 7) === 'confirm'))) {

    var app;
    var mobileblog;
    var android;
    var intent;
    var ios9;
    var link = document.createElement('link');

    link.setAttribute('rel', 'stylesheet');
    link.type = 'text/css';
    link.href = staticpath + 'css/mobile-app-old.css';
    document.head.appendChild(link);

    // AMO: Markup should not be passed to `innerHTML` dynamically. -- This isnt reached for the extension, anyway
    // jscs:disable
    document.body.innerHTML = '<div class="bottom-page scroll-block"><div class="main-content-block">'
                            + '<div class="free-green-tip"></div><div class="main-centered-bl">'
                            + '<div class="main-logo"></div><div class="main-head-txt" id="m_title"></div>'
                            + '<div class="main-head-txt" id="m_desc"></div><br /><br />'
                            + '<a href="" class="main-button" id="m_appbtn"></a><div class="main-social hidden">'
                            + '<a href="https://www.facebook.com/MEGAprivacy" class="main-social-icon facebook"></a>'
                            + '<a href="https://www.twitter.com/MEGAprivacy" class="main-social-icon twitter"></a>'
                            + '<div class="clear"></div></div></div> </div><div class="scrolling-content">'
                            + '<div class="mid-logo"></div><div class="mid-gray-block">MEGA provides free cloud '
                            + 'storage with convenient and powerful always-on privacy</div>'
                            + '<div class="scrolling-block-icon encription"></div><div class="scrolling-block-header">'
                            + 'End-to-end encryption</div><div class="scrolling-block-txt">Unlike other cloud storage '
                            + 'providers, your data is encrypted & decrypted during transfer by your client devices '
                            + 'only and never by us.</div><div class="scrolling-block-icon access"></div>'
                            + '<div class="scrolling-block-header">Secure Global Access</div>'
                            + '<div class="scrolling-block-txt">Your data is accessible any time, from any device, '
                            + 'anywhere. Only you control the keys to your files.</div>'
                            + '<div class="scrolling-block-icon colaboration"></div>'
                            + '<div class="scrolling-block-header">Secure Collaboration</div>'
                            + '<div class="scrolling-block-txt">Share folders with your contacts and see their '
                            + 'updates in real time. Online collaboration has never been more private and secure.'
                            + '</div><div class="bottom-menu full-version"><div class="copyright-txt">Mega Limited '
                            + new Date().getFullYear() + '</div><div class="language-block"></div><div class="clear">'
                            + '</div><iframe src="" width="1" height="1" frameborder="0" style="width:1px; '
                            + 'height:1px; border:none;" id="m_iframe"></iframe></div></div></div>';

    if (page.substr(0, 4) === 'blog') {
        mobileblog = 1;
    }
    if (ua.indexOf('windows phone') > -1) {
        app = 'zune://navigate/?phoneappID=1b70a4ef-8b9c-4058-adca-3b9ac8cc194a';
        document.body.className = 'wp full-mode supported';
    }
    else if (ua.indexOf('android') > -1) {
        app = 'https://play.google.com/store/apps/details?id=mega.privacy.android.app&referrer=meganzsb';
        document.body.className = 'android full-mode supported';
        android = 1;
        var ver = ua.match(/android (\d+)\.(\d+)/);
        if (ver) {
            var rev = ver.pop();
            ver = ver.pop();
            // Check for Android 2.3+
            if (ver > 2 || (ver === 2 && rev > 3)) {
                intent = 'intent://#' + page + '/#Intent;scheme=mega;package=mega.privacy.android.app;end';
            }
        }
        if (intent && !mobileblog) {
            document.location = intent;
        }
    }
    else if (ua.indexOf('bb10') > -1) {
        app = 'http://appworld.blackberry.com/webstore/content/46810890/';
        document.body.className = 'blackberry full-mode supported';
    }
    else if (is_ios) {
        app = 'https://itunes.apple.com/app/mega/id706857885';
        document.body.className = 'ios full-mode supported';
    }
    else {
        document.body.className = 'another-os full-mode unsupported';
    }
    document.getElementById('m_title').innerHTML = 'This link should be opened in the MEGA app.';

    if (app) {
        document.getElementById('m_appbtn').href = app;
        document.getElementById('m_desc').innerHTML = 'Otherwise, you can also open the link on a '
                                                    + 'desktop/laptop browser, or download the MEGA app.';
    }
    else {
        document.getElementById('m_desc').innerHTML = 'Otherwise you can also open the link on a '
                                                    + 'desktop/laptop browser.';
    }

    if (mobileblog) {
        document.body.innerHTML = '';
        mCreateElement('script', {type: 'text/javascript'}, 'head')
            .src = ((location.host === 'mega.nz') ? '/blog.js' : 'html/js/blog.js');
    }
    else {
        var prechar = '#';
        if (ua.indexOf('windows phone') > -1) {
            prechar = '';
        }
        if (ua.indexOf('chrome') > -1) {
            window.location = 'mega://' + prechar + page;
        }
        else if (is_ios > 8) {
            setTimeout(function() {
                var text = 'This link should be opened in the MEGA app. '
                         + 'Click OK if you already have the MEGA app installed';
                if (confirm(text)) {
                    document.location = 'mega://#' + page;
                }
            }, 1500);
        }
        else {
            document.getElementById('m_iframe').src = 'mega://' + prechar + page;
        }
        if (intent) {
            document.getElementById('m_title').innerHTML
                += '<br/><em>If you already have the app installed, <a href="' + intent + '">click here!</a></em>';
        }
    }
}
else if (!b_u) {
    d = window.d || 0;
    jj = window.jj || 0;
    var onBetaW = location.hostname === 'beta.mega.nz' || location.hostname.indexOf("developers.") === 0;

    if (typeof console == "undefined") { this.console = { log: function() {}, error: function() {}}}
    if (d && !console.time) (function(c)
    {
        var timers = {};
        c.time = function(n) { timers[n] = new Date().getTime()};
        c.timeEnd = function(n) {
            if (timers[n]) {
                c.log(n + ': ' + (new Date().getTime() - timers[n]) + 'ms');
                delete timers[n];
            }
        };
    })(console);

    // Do not report exceptions if this build is older than 10 days
    var exTimeLeft = ((buildVersion.timestamp + (10 * 86400)) * 1000) > Date.now();
    window.buildOlderThan10Days = !exTimeLeft;

    if (!d && exTimeLeft && (location.host === 'mega.nz' || is_extension || onBetaW))
    {
        var __cdumps = [], __cd_t;
        window.onerror = function __MEGAExceptionHandler(msg, url, ln, cn, errobj)
        {
            function mTrim(s)
            {
                return String(s)
                    .replace(/resource:.+->\s/,'')
                    .replace(/blob:[^:\s]+/, '..')
                    .replace(/\.\.:\/\/[^:\s]+/, '..')
                    .replace('chrome://mega/content','..')
                    .replace(/file:.+extensions/,'..fx')
                    .replace(/(?: line \d+ > eval)+/g,' >.eval')
                    .trim();
            }
            if (__cdumps.length > 3) return false;

            var dump = {
                l: ln,
                f: mTrim(url),
                m: mTrim(msg)
                    .replace(/'[a-z]+:\/+[^']+(?:'|$)/gi, function(url) {
                        url = url.substr(1);
                        if (url[url.length - 1] === "'") {
                            url = url.substr(0, url.length - 1);
                        }
                        var a = document.createElement('a');
                        a.href = url;
                        return "'" + (a.origin !== 'null' && a.origin
                            || (a.protocol + '//' + a.hostname)) + "...'";
                    })
                    .replace(/(Cannot read property )('[\w-]{8}')/, "$1'<h>?'")
                    .replace(/(Access to '\.\.).*(' from script denied)/, '$1$2')
                    .replace(/gfs\w+\.userstorage/, 'gfs...userstorage')
                    .replace(/^Uncaught\W*(?:exception\W*)?/i, ''),
            }, cc;
            var sbid = +(''+(document.querySelector('script[src*="secureboot"]')||{}).src).split('=').pop()|0;

            if (~dump.m.indexOf('[[:i]]')) {
                return false;
            }

            if ((mega.flags & window.MEGAFLAG_MDBOPEN)
                    && (dump.m === 'InvalidStateError'
                        || (dump.m === 'UnknownError'))) {
                // Prevent InvalidStateError exceptions from indexedDB.open
                // caused while using Private Browser Mode on Firefox.
                return false;
            }

            if (dump.m.indexOf('this.get(...).querySelectorAll') !== -1
                    || String(errobj && errobj.stack).indexOf('<anonymous>:1:18') !== -1
                    || dump.m.indexOf('TypeError: this.get is not a function') !== -1) {
                // ^ this seems a quirk on latest Chrome (~46+) or a bogus extension
                dump.l = 1;
                errobj = null;
                dump.m = 'TypeError: this.get(...).querySelectorAll is not a function';
            }

            if (~dump.m.indexOf("\n")) {
                var lns = dump.m.split(/\r?\n/).map(String.trim).filter(String);

                if (lns.length > 6) {
                    dump.m = [].concat(lns.slice(0,2), "[..!]", lns.slice(-2)).join(" ");
                }
            }
            dump.m = (is_mobile ? '[mobile] ' : is_embed ? '[embed] ' : is_drop ? '[drop] ' : '') + dump.m.replace(/\s+/g, ' ');

            if (!window.jsl_done && !window.u_checked) {
                // Alert the user if there was an uncaught exception while
                // loading the site, this should only happen on some fancy
                // browsers other than what we use during development, and
                // hopefully they'll report it back to us for troubleshoot
                if ((url || ln !== 1) && dump.m.indexOf('Error: Blocked') < 0) {
                    siteLoadError(dump.m, url + ':' + ln);
                }
                else {
                    console.error(dump.m, arguments);
                }
                return;
            }

            if (dump.m.indexOf('Permission denied to access property') > -1) {
                // Some Firefox extension is injecting some script(s)...
                console.warn('Your account is only as secure as your computer...');
                console.warn('Check your installed extensions and which one is injecting scripts on this page...');
                return false;
            }

            if (errobj)
            {
                if (errobj.udata) dump.d = errobj.udata;
                if (errobj.stack)
                {
                    var maxStackLines = 15;
                    var omsg = String(msg).trim();
                    var re = RegExp(
                        omsg.substr(0, 70)
                        .replace(/^\w+:\s/, '')
                        .replace(/([^\w])/g, '\\$1')
                        + '[^\r\n]+'
                    );

                    dump.s = String(errobj.stack)
                        .replace(omsg, '').replace(re, '')
                        .split("\n").map(mTrim).filter(String);

                    for (var idx = 1; idx < dump.s.length; idx++) {
                        var s = dump.s[idx];

                        if (s.indexOf('@resource:') > 0 || s.indexOf('@jar:') > 0) {
                            maxStackLines = idx;
                            break;
                        }
                    }

                    dump.s = dump.s.splice(0, maxStackLines).join("\n");

                    if (dump.s.indexOf('Unknown script code:') !== -1
                        || dump.s.indexOf('Function code:') !== -1
                        || dump.s.indexOf('(eval code:') !== -1
                        || dump.s.indexOf('(unknown source)') !== -1
                        || /<anonymous>:\d+:/.test(dump.s)) {

                        console.warn('Got uncaught exception from unknown resource,'
                            + ' your MEGA account might be compromised.');
                        console.error(msg, errobj, errobj && errobj.stack, url, ln);
                        return false;
                    }
                }

                if (typeof eventlog === 'function' && !errobj.udata) {
                    eventlog(99702, true);
                }
            }
            if (cn) dump.c = cn;

            if (/Access to '.*' from script denied/.test(dump.m)) {
                console.error(dump.m, dump);
                return false;
            }

            if (ln == 0 && !dump.s)
            {
                if (dump.m.toLowerCase().indexOf('out of memory') != -1) dump.m = '!Fatal! Out Of Memory.';
                else dump.m = dump.m.replace(/[^\s\w]/gi,'') || ('[!] ' + msg);
            }
            if (location.hostname === 'beta.mega.nz' || location.hostname.indexOf("developers.") > -1) dump.m = '[' + location.hostname + '] ' + dump.m;

            try
            {
                var crashes = JSON.parse(localStorage.crashes || '{}');
                var checksum = MurmurHash3(JSON.stringify(dump), 0x4ef5391a);

                if (crashes.v != sbid) crashes = { v : sbid };

                if (crashes[checksum])
                {
                    // Reported less than 10 days ago?
                    if (Date.now() - crashes[checksum] < 864000000) return false;
                }
                dump.x = checksum;
                crashes[checksum] = Date.now();
                localStorage.crashes = JSON.stringify(crashes);
                cc = Object.keys(crashes).length;
            }
            catch(e) {
                delete localStorage.crashes;
            }

            __cdumps.push(dump);
            if (__cd_t) clearTimeout(__cd_t);
            var report = tryCatch(function()
            {
                function ctx(id)
                {
                    return {
                        callback : function(res)
                        {
                            if (res === EOVERQUOTA)
                            {
                                __cdumps = new Array(4);
                                if (__cd_t) clearTimeout(__cd_t);

                                if (id)
                                {
                                    var crashes = JSON.parse(localStorage.crashes || '{}');
                                    delete crashes[id];
                                    localStorage.crashes = JSON.stringify(crashes);
                                }
                            }
                        }
                    };
                }
                var ids = [], uds = [], r = 1;
                for (var i in __cdumps)
                {
                    var dump = __cdumps[i];

                    if (dump.x) { ids.push(dump.x); delete dump.x; }
                    if (dump.d) { uds.push(dump.d); delete dump.d; }
                    if (dump.l < 0) r = 0;
                }

                var report = {};
                report.ua = navigator.userAgent;
                report.io = window.dlMethod && dlMethod.name;
                report.sb = sbid;
                report.tp = typeof $ !== 'undefined' && $.transferprogress;
                report.id = ids.join(",");
                report.ud = uds;
                report.cc = cc;

                if (is_chrome_firefox)
                {
                    report.mo = mozBrowserID + '::' + is_chrome_firefox + '::' + mozMEGAExtensionVersion;
                }
                report = JSON.stringify(r? report:{});

                var version = buildVersion.website;

                if (is_extension) {
                    if (is_chrome_firefox || is_firefox_web_ext) {
                        version = buildVersion.firefox;
                    }
                    else if (window.chrome) {
                        version = buildVersion.chrome;
                    }
                }

                for (var i in __cdumps)
                {
                    api_req({
                        a: 'cd2',
                        c: JSON.stringify(__cdumps[i]),
                        v: report,
                        t: version,
                        s: window.location.host
                    }, ctx(ids[i]));
                }
                __cd_t = 0;
                __cdumps = [];
            });
            __cd_t = setTimeout(function() {
                report();
            }, 3000);

            return false;
        };
    }

    /**
     * Detects which language the user currently has set in their browser
     * @returns {String} Returns the two letter language code e.g. 'en', 'es' etc
     */
    var detectLang = function() {
        'use strict';

        // Get the preferred language in their browser
        var userLangs, userLang, ourLangs, k, v, j, i, u;

        // If a search bot, they may set the URL as e.g. mega.nz/pro?es so get the language from that
        if (is_bot && locationSearchParams !== '') {
            userLangs = locationSearchParams.replace('?', '');
        }
        else {
            // Otherwise get the user's preferred language in their browser settings
            userLangs = navigator.languages || navigator.language || navigator.userLanguage;
        }

        // If a language can't be detected, default to English
        if (!userLangs) {
            return 'en';
        }

        if (!Array.isArray(userLangs)) {
            userLangs = [userLangs];
        }

        for (u = 0; u < userLangs.length; u++) {

            // Lowercase it
            userLang = String(userLangs[u]).toLowerCase();

            // Language mapping handling.
            ourLangs = Object.keys(languages);

            // Match on language code variants e.g. 'pt-br' returns 'br'
            for (i = ourLangs.length; i--;) {
                k = ourLangs[i];
                v = languages[k][0];

                for (j = v.length; j--;) {
                    if (v[j] === userLang || v[j] === userLang.substr(0, 3)) {
                        return k;
                    }
                }
            }

            // If no exact match supported, normalise to base language code e.g. en-gb, en-us, en-ca returns 'en'
            for (i = ourLangs.length; i--;) {
                k = ourLangs[i];
                v = languages[k][0];

                for (j = v.length; j--;) {
                    if (v[j].substr(0, 3) === userLang.substr(0, 3)) {
                        return k;
                    }
                }
            }
        }

        // Default to English
        return 'en';
    };

    /**
     * Gets the file path for a language file
     * @param {String} language
     * @returns {String}
     */
    var getLanguageFilePath = function(language) {
        'use strict';

        // If the sh1 (filename with hashes) array has been created from deploy script
        if (typeof sh1 === 'undefined') {
            // Otherwise return the filename.json when in Development
            return 'lang/' + language + '.json';
        }

        var enLang;
        for (var i = 0, length = sh1.length; i < length; i++) {
            var filePath = sh1[i];

            // If the language e.g. 'en' matches part of the filename from the deploy script e.g.
            // 'lang/en_0a8e1591149050ef1884b0c4abfbbeb759bbe9eaf062fa54e5b856fdb78e1eb3.json'
            if (filePath.indexOf('lang/' + language) > -1) {
                return filePath;
            }

            // Catch the English language file.
            if (filePath.indexOf('lang/en_') > -1) {
                enLang = filePath;
            }
        }

        console.warn('Failed to find language file for %s...', language);
        return enLang;
    };

    var lang = detectLang();
    var jsl = [];

    // If they've already selected a language, use that
    if (localStorage.lang) {
        if (languages[localStorage.lang]) {
            lang = localStorage.lang;
        }
        else {
            console.warn('Language "%s" is no longer available...', localStorage.lang);
            delete localStorage.lang;
        }
    }

    // Get the language file path e.g. lang/en.json or 'lang/en_7a8e15911490...f1878e1eb3.json'
    var langFilepath = getLanguageFilePath(lang);

    jsl.push({f:langFilepath, n: 'lang', j:3});
    jsl.push({f:'sjcl.js', n: 'sjcl_js', j:1});
    jsl.push({f:'nodedec.js', n: 'nodedec_js', j:1});
    jsl.push({f:'js/vendor/jquery.js', n: 'jquery', j:1, w:10});
    jsl.push({f:'js/vendor/jquery-ui.js', n: 'jqueryui_js', j:1, w:10});
    jsl.push({f:'js/vendor/jquery.mousewheel.js', n: 'jquerymouse_js', j:1});
    jsl.push({f:'js/vendor/jquery.jscrollpane.js', n: 'jscrollpane_js', j:1});
    jsl.push({f:'js/jscrollpane.utils.js', n: 'jscrollpane_utils_js', j: 1});
    jsl.push({f:'js/jquery.misc.js', n: 'jquerymisc_js', j:1});
    jsl.push({f:'js/vendor/megaLogger.js', n: 'megaLogger_js', j:1});
    jsl.push({f:'js/vendor/jquery.fullscreen.js', n: 'jquery_fullscreen', j:1, w:10});

    jsl.push({f:'js/utils/polyfills.js', n: 'js_utils_polyfills_js', j: 1});
    jsl.push({f:'js/utils/browser.js', n: 'js_utils_browser_js', j: 1});
    jsl.push({f:'js/utils/clipboard.js', n: 'js_utils_clipboard_js', j: 1});
    jsl.push({f:'js/utils/conv.js', n: 'js_utils_conv_js', j: 1});
    jsl.push({f:'js/utils/crypt.js', n: 'js_utils_crypt_js', j: 1});
    jsl.push({f:'js/utils/debug.js', n: 'js_utils_debug_js', j: 1});
    jsl.push({f:'js/utils/dom.js', n: 'js_utils_dom_js', j: 1});
    jsl.push({f:'js/utils/events.js', n: 'js_utils_events_js', j: 1});
    jsl.push({f:'js/utils/locale.js', n: 'js_utils_locale_js', j: 1});
    jsl.push({f:'js/utils/media.js', n: 'js_utils_pictools_js', j: 1});
    jsl.push({f:'js/utils/network.js', n: 'js_utils_network_js', j: 1});
    jsl.push({f:'js/utils/splitter.js', n: 'js_utils_splitter_js', j: 1});
    jsl.push({f:'js/utils/stringcrypt.js', n: 'js_utils_stringcrypt_js', j: 1});
    jsl.push({f:'js/utils/timers.js', n: 'js_utils_timers_js', j: 1});
    jsl.push({f:'js/utils/watchdog.js', n: 'js_utils_watchdog_js', j: 1});
    jsl.push({f:'js/utils/workers.js', n: 'js_utils_workers_js', j: 1});
    jsl.push({f:'js/utils/trans.js', n: 'js_utils_trans_js', j: 1});

    jsl.push({f:'js/functions.js', n: 'functions_js', j:1});
    jsl.push({f:'js/crypto.js', n: 'crypto_js', j:1,w:5});
    jsl.push({f:'js/account.js', n: 'user_js', j:1});
    jsl.push({f:'js/security.js', n: 'security_js', j: 1, w: 5});
    jsl.push({f:'js/two-factor-auth.js', n: 'two_factor_auth_js', j: 1, w: 5});
    jsl.push({f:'js/attr.js', n: 'mega_attr_js', j:1});
    jsl.push({f:'js/mega.js', n: 'mega_js', j:1,w:7});
    jsl.push({f:'js/megaPromise.js', n: 'megapromise_js', j:1,w:5});

    jsl.push({f:'js/mDB.js', n: 'mDB_js', j:1});
    jsl.push({f:'js/mouse.js', n: 'mouse_js', j:1});
    jsl.push({f:'js/datastructs.js', n: 'datastructs_js', j:1});
    jsl.push({f:'js/idbkvstorage.js', n: 'idbkvstorage_js', j: 1, w: 5});
    jsl.push({f:'js/sharedlocalkvstorage.js', n: 'sharedlocalkvstorage_js', j: 1, w: 5});

    jsl.push({f:'js/tlvstore.js', n: 'tlvstore_js', j:1});
    jsl.push({f:'js/vendor/jsbn.js', n: 'jsbn_js', j:1, w:2});
    jsl.push({f:'js/vendor/jsbn2.js', n: 'jsbn2_js', j:1, w:2});
    jsl.push({f:'js/vendor/nacl-fast.js', n: 'nacl_js', j:1,w:7});
    jsl.push({f:'js/vendor/dexie.js', n: 'dexie_js', j:1,w:5});

    jsl.push({f:'js/authring.js', n: 'authring_js', j:1});
    jsl.push({f:'html/js/login.js', n: 'login_js', j:1});
    jsl.push({f:'js/ui/export.js', n: 'export_js', j:1,w:1});
    jsl.push({f:'html/js/key.js', n: 'key_js', j:1});

    jsl.push({f:'js/useravatar.js', n: 'contact_avatar_js', j:1,w:3});
    jsl.push({f:'css/avatars.css', n: 'avatars_css', j:2,w:5,c:1,d:1,cache:1});
    jsl.push({f:'js/cms.js', n: 'cms_js', j:1});

    // Common desktop and mobile, bottom pages
    jsl.push({f:'css/bottom-pages.css', n: 'bottom-pages_css', j:2,w:5,c:1,d:1,cache:1});
    jsl.push({f:'css/bottom-menu.css', n: 'bottom-menu_css', j:2,w:5,c:1,d:1,cache:1});
    jsl.push({f:'css/business.css', n: 'business_css', j:2,w:5,c:1,d:1,cache:1});
    jsl.push({f:'css/pro.css', n: 'pro_css', j:2,w:5,c:1,d:1,cache:1});
    jsl.push({f:'css/startpage.css', n: 'startpage_css', j:2,w:5,c:1,d:1,cache:1});
    jsl.push({f:'css/top-menu.css', n: 'top_menu_css', j: 2, w: 5, c: 1, d: 1, cache: 1});
    jsl.push({f:'css/icons.css', n: 'icons_css', j: 2, w: 5, c: 1, d: 1, cache: 1});
    jsl.push({f:'css/spinners.css', n: 'spinners_css', j: 2, w: 5, c: 1, d: 1, cache: 1});
    jsl.push({f:'css/retina-images.css', n: 'retina_images_css', j: 2, w: 5, c: 1, d: 1, cache: 1});
    jsl.push({f:'css/psa.css', n: 'psa_css', j: 2, w: 5, c: 1, d: 1, cache: 1});
    jsl.push({f:'html/start.html', n: 'start', j:0});
    jsl.push({f:'html/js/start.js', n: 'start_js', j:1});
    jsl.push({f:'html/js/bottompage.js', n: 'bottompage_js', j:1});
    jsl.push({f:'html/pagesmenu.html', n: 'pagesmenu', j:0});
    jsl.push({f:'html/bottom2.html', n: 'bottom2',j:0});
    jsl.push({f:'html/megainfo.html', n: 'megainfo', j:0});
    jsl.push({f:'js/thumbnail.js', n: 'thumbnail_js', j:1});
    jsl.push({f:'js/vendor/exif.js', n: 'exif_js', j:1, w:3});
    jsl.push({f:'js/vendor/smartcrop.js', n: 'smartcrop_js', j:1, w:7});
    jsl.push({f:'js/vendor/jquery.qrcode.js', n: 'jqueryqrcode', j:1});
    jsl.push({f:'js/vendor/qrcode.js', n: 'qrcode', j:1,w:2, g: 'vendor'});
    jsl.push({f:'js/ui/publicServiceAnnouncement.js', n: 'psa_js', j:1,w:1});

    if (!is_mobile) {
        jsl.push({f:'js/filedrag.js', n: 'filedrag_js', j:1});
        jsl.push({f:'js/vendor/verge.js', n: 'verge', j:1, w:5});
        jsl.push({f:'js/jquery.tokeninput.js', n: 'jquerytokeninput_js', j:1});
        jsl.push({f:'js/jquery.checkboxes.js', n: 'checkboxes_js', j:1});

        // This is not used anymore, unless we process and store credit card details for renewals again
        // jsl.push({f:'js/paycrypt.js', n: 'paycrypt_js', j:1 });

        // Desktop notifications
        jsl.push({f:'js/vendor/notification.js', n: 'notification_js', j:1,w:7});

        // Other
        jsl.push({f:'js/vendor/moment.js', n: 'moment_js', j:1,w:1});
        jsl.push({f:'js/vendor/perfect-scrollbar.js', n: 'ps_js', j:1,w:1});

        // Google Import Contacts
        jsl.push({f:'js/gContacts.js', n: 'gcontacts_js', j:1,w:3});

        // UI Elements
        jsl.push({f:'js/ui/megaRender.js', n: 'megarender_js', j:1,w:1});
        jsl.push({f:'js/ui/dialog.js', n: 'dialogui_js', j:1,w:1});
        jsl.push({f:'js/ui/credentialsWarningDialog.js', n: 'creddialogui_js', j:1,w:1});
        jsl.push({f:'js/ui/loginRequiredDialog.js', n: 'loginrequireddialog_js', j:1,w:1});
        jsl.push({f:'js/ui/registerDialog.js', n: 'registerdialog_js', j:1,w:1});
        jsl.push({f:'js/ui/keySignatureWarningDialog.js', n: 'mega_js', j:1,w:7});
        jsl.push({f:'js/ui/feedbackDialog.js', n: 'feedbackdialogui_js', j:1,w:1});
        jsl.push({f:'js/ui/languageDialog.js', n: 'mega_js', j:1,w:7});
        jsl.push({f:'js/ui/alarm.js', n: 'alarm_js', j:1,w:1});
        jsl.push({f:'js/ui/toast.js', n: 'toast_js', j:1,w:1});
        jsl.push({f:'js/ui/transfers-popup.js', n: 'transfers_popup_js', j:1,w:1});
        jsl.push({f:'js/ui/passwordReminderDialog.js', n: 'prd_js', j:1,w:1});
        jsl.push({f:'js/ui/top-tooltip-login.js', n: 'top-tooltip-login', j:1});
        jsl.push({f:'html/megadrop.html', n: 'megadrop', j:0});
        jsl.push({f:'html/nomegadrop.html', n: 'nomegadrop', j:0});
        jsl.push({f:'js/megadrop.js', n: 'megadrop_js', j:1});
    } // !is_mobile

    if (is_chrome_firefox && parseInt(Services.appinfo.version) > 27) {
        is_chrome_firefox |= 4;
        jsl.push({f:'js/transfers/meths/firefox-extension.js', n: 'dl_firefox', j: 1, w: 3});
    }

    // Transfers
    jsl.push({f:'js/transfers/xhr2.js', n: 'xhr_js', j:1});
    jsl.push({f:'js/transfers/queue.js', n: 'queue', j:1,w:4});
    jsl.push({f:'js/transfers/utils.js', n: 'tutils', j:1,w:4});
    jsl.push({f:'js/transfers/meths/cache.js', n: 'dl_cache', j:1,w:3});
    jsl.push({f:'js/transfers/meths/flash.js', n: 'dl_flash', j:1,w:3});
    jsl.push({f:'js/transfers/meths/memory.js', n: 'dl_memory', j:1,w:3});
    jsl.push({f:'js/transfers/meths/filesystem.js', n: 'dl_chrome', j:1,w:3});
    // jsl.push({f:'js/transfers/meths/mediasource.js', n: 'dl_mediasource', j:1,w:3});
    jsl.push({f:'js/transfers/downloader.js', n: 'dl_downloader', j:1,w:3});
    jsl.push({f:'js/transfers/decrypter.js', n: 'dl_decrypter', j: 1, w: 3});
    jsl.push({f:'js/transfers/download2.js', n: 'dl_js', j:1,w:3});
    jsl.push({f:'js/transfers/meths.js', n: 'dl_meths', j: 1, w: 3});
    jsl.push({f:'js/transfers/upload2.js', n: 'upload_js', j:1,w:2});
    jsl.push({f:'js/transfers/reader.js', n: 'upload_reader_js', j: 1, w: 2});
    jsl.push({f:'js/transfers/zip64.js', n: 'zip_js', j: 1});

    // Everything else...
    jsl.push({f:'index.js', n: 'index', j:1,w:4});

    if (is_mobile) {
        jsl.push({f:'html/top-mobile.html', n: 'top-mobile', j:0});
    }
    else {
        jsl.push({f:'html/top.html', n: 'top', j:0});
    }

    jsl.push({f:'html/transferwidget.html', n: 'transferwidget', j:0});
    jsl.push({f:'js/filetypes.js', n: 'filetypes_js', j:1});
    jsl.push({f:'js/fm/removenode.js', n: 'fm_removenode_js', j: 1});
    jsl.push({f:'js/fm/ufssizecache.js', n: 'ufssizecache_js', j:1});

    // Pro pages Step 1 (Pro plan) and Step 2 (Pro payment)
    jsl.push({f:'html/proplan.html', n: 'proplan', j:0});
    jsl.push({f:'html/propay.html', n: 'propay', j:0});
    jsl.push({f:'html/js/pro.js', n: 'pro_js', j:1});
    jsl.push({f:'html/js/proplan.js', n: 'proplan_js', j:1});
    jsl.push({f:'html/js/propay.js', n: 'propay_js', j:1});
    jsl.push({f:'html/js/propay-dialogs.js', n: 'propay_js', j:1});
    jsl.push({f:'js/states-countries.js', n: 'states_countries_js', j:1});

    jsl.push({f:'js/ui/miniui.js', n: 'miniui_js', j:1});
    jsl.push({f:'js/fm/achievements.js', n: 'achievements_js', j:1, w:5});
    jsl.push({f:'js/fm/fileversioning.js', n: 'fm_fileversioning_js', j:1});
    jsl.push({f:'js/ui/gdpr-download.js', n: 'gdpr_download', j:1});

    if (!is_mobile) {
        jsl.push({f:'css/style.css', n: 'style_css', j:2, w:30, c:1, d:1, cache:1});
        jsl.push({f:'js/vendor/megalist.js', n: 'megalist_js', j:1, w:5});
        jsl.push({f:'js/fm/quickfinder.js', n: 'fm_quickfinder_js', j:1, w:1});
        jsl.push({f:'js/fm/selectionmanager.js', n: 'fm_selectionmanager_js', j:1, w:1});
        jsl.push({f:'js/fm.js', n: 'fm_js', j:1, w:12});
        jsl.push({f:'js/fm/dashboard.js', n: 'fmdashboard_js', j:1, w:5});
        jsl.push({f:'js/fm/account.js', n: 'fm_account_js', j:1});
        jsl.push({f:'js/fm/account-change-password.js', n: 'fm_account_change_password_js', j:1});
        jsl.push({f:'js/fm/account-change-email.js', n: 'fm_account_change_email_js', j:1});
        jsl.push({f:'js/fm/dialogs.js', n: 'fm_dialogs_js', j:1});
        jsl.push({f:'js/fm/fileconflict.js', n: 'fm_fileconflict_js', j:1});
        jsl.push({f:'js/fm/properties.js', n: 'fm_properties_js', j:1});
        jsl.push({f:'js/ui/imagesViewer.js', n: 'imagesViewer_js', j:1});
        jsl.push({f:'js/ui/miniui.js', n: 'miniui_js', j:1});
        jsl.push({f:'js/notify.js', n: 'notify_js', j:1});
        jsl.push({f:'js/popunda.js', n: 'popunda_js', j:1});
        jsl.push({f:'js/vendor/avatar.js', n: 'avatar_js', j:1, w:3});
        jsl.push({f:'js/vendor/int64.js', n: 'int64_js', j:1});

        jsl.push({f:'js/ui/onboarding.js', n: 'onboarding_js', j:1,w:1});
        jsl.push({f:'html/onboarding.html', n: 'onboarding', j:0,w:2});
        jsl.push({f:'css/onboarding.css', n: 'onboarding_css', j:2,w:5,c:1,d:1,cache:1});

        jsl.push({f:'css/download.css', n: 'download_css', j:2,w:5,c:1,d:1,cache:1});
        jsl.push({f:'css/user-card.css', n: 'user_card_css', j:2, w:5, c:1, d:1, cache:1});
        jsl.push({f:'css/fm-lists.css', n: 'fm_lists_css', j:2,w:5,c:1,d:1,cache:1});
        jsl.push({f:'css/account.css', n: 'account_css', j:2,w:5,c:1,d:1,cache:1});
        jsl.push({f:'css/buttons.css', n: 'buttons_css', j:2,w:5,c:1,d:1,cache:1});
        jsl.push({f:'css/dropdowns.css', n: 'dropdowns_css', j:2,w:5,c:1,d:1,cache:1});
        jsl.push({f:'css/labels-and-filters.css', n: 'labels-and-filters_css', j:2,w:5,c:1,d:1,cache:1});
        jsl.push({f:'css/dialogs.css', n: 'dialogs_css', j:2,w:5,c:1,d:1,cache:1});
        jsl.push({f:'css/media-viewer.css', n: 'media_viewer_css', j:2,w:5,c:1,d:1,cache:1});
        jsl.push({f:'css/popups.css', n: 'popups_css', j:2,w:5,c:1,d:1,cache:1});
        jsl.push({f:'css/toast.css', n: 'toast_css', j:2,w:5,c:1,d:1,cache:1});
        jsl.push({f:'css/data-blocks-view.css', n: 'data_blocks_view_css', j:2,w:5,c:1,d:1,cache:1});
        jsl.push({f:'css/help2.css', n: 'help_css', j:2,w:5,c:1,d:1,cache:1});
        jsl.push({f:'css/perfect-scrollbar.css', n: 'vendor_ps_css', j:2,w:5,c:1,d:1,cache:1});
        jsl.push({f:'css/recovery.css', n: 'recovery_css', j:2,w:5,c:1,d:1,cache:1});
        jsl.push({f:'css/retina-images.css', n: 'retina_images_css', j: 2, w: 5, c: 1, d: 1, cache: 1});
        jsl.push({f:'css/media-print.css', n: 'media_print_css', j:2,w:5,c:1,d:1,cache:1});

        jsl.push({f:'html/key.html', n: 'key', j:0});
        jsl.push({f:'html/login.html', n: 'login', j:0});
        jsl.push({f:'html/fm.html', n: 'fm', j:0, w:3});
        jsl.push({f:'html/top-login.html', n: 'top-login', j:0});
        jsl.push({f:'html/dialogs.html', n: 'dialogs', j:0,w:2});
    } // !is_mobile

    // do not change the order...
    jsl.push({f:'js/fm/filemanager.js', n: 'filemanager_js', j: 1, w: 5});
    jsl.push({f:'js/fm/utils.js', n: 'fm_utils_js', j: 1});
    jsl.push({f:'js/fm/megadata.js', n: 'fm_megadata_js', j: 1});
    jsl.push({f:'js/fm/megadata/account.js', n: 'fm_megadata_account_js', j: 1});
    jsl.push({f:'js/fm/megadata/avatars.js', n: 'fm_megadata_avatars_js', j: 1});
    jsl.push({f:'js/fm/megadata/contacts.js', n: 'fm_megadata_contacts_js', j: 1});
    jsl.push({f:'js/fm/megadata/filters.js', n: 'fm_megadata_filters_js', j: 1});
    jsl.push({f:'js/fm/megadata/inbox.js', n: 'fm_megadata_inbox_js', j: 1});
    jsl.push({f:'js/fm/megadata/menus.js', n: 'fm_megadata_menus_js', j: 1});
    jsl.push({f:'js/fm/megadata/nodes.js', n: 'fm_megadata_nodes_js', j: 1});
    jsl.push({f:'js/fm/megadata/openfolder.js', n: 'fm_megadata_openfolder_js', j: 1});
    jsl.push({f:'js/fm/megadata/render.js', n: 'fm_megadata_render_js', j: 1});
    jsl.push({f:'js/fm/megadata/reset.js', n: 'fm_megadata_reset_js', j: 1});
    jsl.push({f:'js/fm/megadata/sort.js', n: 'fm_megadata_sort_js', j: 1});
    jsl.push({f:'js/fm/megadata/transfers.js', n: 'fm_megadata_transfers_js', j: 1});
    jsl.push({f:'js/fm/megadata/tree.js', n: 'fm_megadata_tree_js', j: 1});
    jsl.push({f:'html/js/megasync.js', n: 'megasync_js', j: 1});
    jsl.push({f:'js/fm/linkinfohelper.js', n: 'fm_linkinfohelper_js', j: 1});

    if (localStorage.makeCache) {
        jsl.push({f:'makecache.js', n: 'makecache', j:1});
    }

    if (localStorage.enableDevtools) {
        jsl.push({f:'dont-deploy/transcripter/exporter.js', n: 'tse_js', j:1});
    }

    if (lang === 'ar') {
        jsl.push({f:'css/lang_ar.css', n: 'lang_arabic_css', j: 2, w: 30, c: 1, d: 1, m: 1});
    }

    if (lang === 'fa') {
        jsl.push({f:'css/lang_ar.css', n: 'lang_farsi_css', j: 2, w: 30, c: 1, d: 1, m: 1});
    }

    if (lang === 'th') {
        jsl.push({f:'css/lang_th.css', n: 'lang_thai_css', j: 2, w: 30, c: 1, d: 1, m: 1});
    }

    // Load files common to all mobile pages
    if (is_mobile) {
        jsl.push({f:'css/mobile.css', n: 'mobile_css', j: 2, w: 30, c: 1, d: 1, m: 1});
        jsl.push({f:'css/mobile-help.css', n: 'mobile_css', j: 2, w: 30, c: 1, d: 1, m: 1});
        jsl.push({f:'css/toast.css', n: 'toast_css', j: 2, w: 5, c: 1, d: 1, cache: 1});
        jsl.push({f:'html/mobile.html', n: 'mobile', j: 0, w: 1});
        jsl.push({f:'js/vendor/jquery.mobile.js', n: 'jquery_mobile_js', j: 1, w: 5});
        jsl.push({f:'js/mobile/mobile.js', n: 'mobile_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.account.js', n: 'mobile_account_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.account.cancel.js', n: 'mobile_account_cancel_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.account.history.js', n: 'mobile_account_history_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.account.change-password.js', n: 'mobile_account_change_pass_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.achieve.js', n: 'mobile_achieve_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.achieve.how-it-works.js', n: 'mobile_achieve_how_it_works_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.achieve.invites.js', n: 'mobile_achieve_invites_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.achieve.referrals.js', n: 'mobile_achieve_referrals_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.backup.js', n: 'mobile_backup_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.cloud.js', n: 'mobile_cloud_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.cloud.action-bar.js', n: 'mobile_cloud_action_bar_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.cloud.context-menu.js', n: 'mobile_cloud_context_menu_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.create-folder-overlay.js', n: 'mobile_create_folder_overlay_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.decryption-key-overlay.js', n: 'mobile_mobile_dec_key_overlay_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.decryption-password-overlay.js', n: 'mobile_dec_pass_overlay_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.delete-overlay.js', n: 'mobile_delete_overlay_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.download-overlay.js', n: 'mobile_download_overlay_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.language-menu.js', n: 'mobile_language_menu_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.link-overlay.js', n: 'mobile_link_overlay_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.message-overlay.js', n: 'mobile_message_overlay_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.not-found-overlay.js', n: 'mobile_not_found_overlay_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.pro-signup-prompt.js', n: 'mobile_pro_signup_prompt_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.propay.js', n: 'mobile_propay_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.recovery.js', n: 'mobile_rec_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.recovery.send-email.js', n: 'mobile_rec_send_email_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.recovery.from-email-link.js', n: 'mobile_rec_from_email_link_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.recovery.enter-key.js', n: 'mobile_rec_enter_key_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.recovery.change-password.js', n: 'mobile_rec_change_password_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.register.js', n: 'mobile_register_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.signin.js', n: 'mobile_signin_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.slideshow.js', n: 'mobile_slideshow_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.support.js', n: 'mobile_support_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.terms.js', n: 'mobile_terms_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.upload-overlay.js', n: 'mobile_upload_overlay_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.megadrop.js', n: 'mobile_megadrop_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.contact-link.js', n: 'mobile_contactlink_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.twofactor.js', n: 'mobile_twofactor_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.twofactor.intro.js', n: 'mobile_twofactor_info_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.twofactor.setup.js', n: 'mobile_twofactor_setup_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.twofactor.verify-setup.js', n: 'mobile_twofactor_verify_setup_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.twofactor.enabled.js', n: 'mobile_twofactor_enabled_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.twofactor.verify-disable.js', n: 'mobile_twofactor_verify_disable_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.twofactor.disabled.js', n: 'mobile_twofactor_disabled_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.twofactor.verify-login.js', n: 'mobile_twofactor_verify_login_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.twofactor.verify-action.js', n: 'mobile_twofactor_verify_action_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.titlemenu.js', n: 'mobile_titlemenu_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.rubbish-bin-empty-overlay.js', n: 'mobile_rubbish_bin_empty_overlay_js', j: 1, w: 1});
        jsl.push({f:'js/mobile/mobile.rubbishbin.js', n: 'mobile_rubbishbin_js', j: 1, w: 1});
        jsl.push({f:'js/fm/fileconflict.js', n: 'fileconflict_js', j:1});
        jsl.push({f:'js/mobile/mobile.alertbanner.js', n: 'mobile_alert_banner', j: 1 });
        jsl.push({f:'js/mobile/mobile.conflict-resolution-overlay.js', n: 'mobile_conflict_resolution_overlay_js', j: 1 });
        jsl.push({f:'js/mobile/mobile.over-storage-quota-overlay.js', n: 'mobile_over_storage_quota_overlay_js', j: 1 });
    }

    // We need to keep a consistent order in loaded resources, so that if users
    // send us logs we won't get different line numbers on stack-traces from
    // different browsers. Hence, do NOT add more jsl entries after this block,
    // unless they're optional (such as polyfills) or third-party resources.

    if (is_embed) {
        jsl = [{f: langFilepath, n: 'lang', j: 3}];
        jsl.push({f:'sjcl.js', n: 'sjcl_js', j: 1});
        jsl.push({f:'nodedec.js', n: 'nodedec_js', j: 1});
        jsl.push({f:'js/vendor/jquery.js', n: 'jquery', j: 1, w: 10});
        jsl.push({f:'js/vendor/jquery.fullscreen.js', n: 'jquery_fullscreen', j:1, w:10});
        jsl.push({f:'js/jquery.misc.js', n: 'jquerymisc_js', j: 1});
        jsl.push({f:'html/js/embedplayer.js', n: 'embedplayer_js', j: 1, w: 4});

        jsl.push({f:'js/utils/polyfills.js', n: 'js_utils_polyfills_js', j: 1});
        jsl.push({f:'js/utils/browser.js', n: 'js_utils_browser_js', j: 1});
        jsl.push({f:'js/utils/clipboard.js', n: 'js_utils_clipboard_js', j: 1});
        jsl.push({f:'js/utils/conv.js', n: 'js_utils_conv_js', j: 1});
        jsl.push({f:'js/utils/dom.js', n: 'js_utils_dom_js', j: 1});
        jsl.push({f:'js/utils/events.js', n: 'js_utils_events_js', j: 1});
        jsl.push({f:'js/utils/locale.js', n: 'js_utils_locale_js', j: 1});
        jsl.push({f:'js/utils/media.js', n: 'js_utils_pictools_js', j: 1});
        jsl.push({f:'js/utils/network.js', n: 'js_utils_network_js', j: 1});
        jsl.push({f:'js/utils/timers.js', n: 'js_utils_timers_js', j: 1});
        jsl.push({f:'js/utils/watchdog.js', n: 'js_utils_watchdog_js', j: 1});
        jsl.push({f:'js/utils/workers.js', n: 'js_utils_workers_js', j: 1});

        jsl.push({f:'js/crypto.js', n: 'crypto_js', j: 1, w: 5});
        jsl.push({f:'js/account.js', n: 'user_js', j: 1});

        jsl.push({f:'js/transfers/queue.js', n: 'queue', j: 1, w: 4});
        jsl.push({f:'js/transfers/decrypter.js', n: 'dl_downloader', j: 1, w: 3});
        jsl.push({f:'js/vendor/videostream.js', n: 'videostream', j: 1, w: 3});

        jsl.push({f:'html/embedplayer.html', n: 'index', j: 0});
        jsl.push({f:'css/embedplayer.css', n: 'embedplayer_css', j: 2, w: 5});
    }

    if (is_drop) {
        u_checked = true;
        jsl = [{f: langFilepath, n: 'lang', j: 3}];
        jsl.push({f:'html/js/embeddrop.js', n: 'embeddrop_js', j: 1, w: 4});
        jsl.push({f:'css/embeddrop.css', n: 'embeddrop_css', j: 2, w: 5});
    }
    else {
        jsl.push({f:'js/jquery.protect.js', n: 'jqueryprotect_js', j: 1});
        jsl.push({f:'js/vendor/asmcrypto.js', n: 'asmcrypto_js', j: 1, w: 5});

        if (typeof Number.isNaN !== 'function' || typeof Set === 'undefined' || !Object.assign) {
            jsl.push({f:'js/vendor/es6-shim.js', n: 'es6shim_js', j: 1});
        }
    }

    // If the TextEncoder is not supported natively (IE, Edge) then load the polyfill
    if (typeof TextEncoder !== 'function') {
        jsl.push({f:'js/vendor/encoding.js', n: 'encoding_js', j:1});
    }

    // only used on beta
    if (onBetaW) {
        jsl.push({f:'js/betacrashes.js', n: 'betacrashes_js', j: 1});
    }

    var jsl2 =
    {
        'dcrawjs': {f:'js/vendor/dcraw.js', n: 'dcraw_js', j: 1},
        'about': {f:'html/about.html', n: 'about', j:0},
        'sourcecode': {f:'html/sourcecode.html', n: 'sourcecode', j:0},
        'blog': {f:'html/blog.html', n: 'blog', j:0},
        'blog_js': {f:'html/js/blog.js', n: 'blog_js', j:1},
        'blogarticle': {f:'html/blogarticle.html', n: 'blogarticle', j:0},
        'blogarticle_js': {f:'html/js/blogarticle.js', n: 'blogarticle_js', j:1},
        'register': {f:'html/register.html', n: 'register', j:0},
        'register_js': {f:'html/js/register.js', n: 'register_js', j:1},
        'resellers': {f:'html/resellers.html', n: 'resellers', j:0},
        'download': {f:'html/download.html', n: 'download', j:0},
        'download_js': {f:'html/js/download.js', n: 'download_js', j:1},
        'dispute': {f:'html/dispute.html', n: 'dispute', j:0},
        'disputenotice': {f:'html/disputenotice.html', n: 'disputenotice', j:0},
        'copyright': {f:'html/copyright.html', n: 'copyright', j:0},
        'copyrightnotice': {f:'html/copyrightnotice.html', n: 'copyrightnotice', j:0},
        'copyright_js': {f:'html/js/copyright.js', n: 'copyright_js', j:1},
        'privacy': {f:'html/privacy.html', n: 'privacy', j:0},
        'gdpr': {f:'html/gdpr.html', n: 'gdpr', j:0},
        'gdpr_js': {f:'html/js/gdpr.js', n: 'gdpr_js', j:1},
        'mega': {f:'html/mega.html', n: 'mega', j:0},
        'terms': {f:'html/terms.html', n: 'terms', j:0},
        'general': {f:'html/general.html', n: 'general', j:0},
        'backup': {f:'html/backup.html', n: 'backup', j:0},
        'backup_js': {f:'html/js/backup.js', n: 'backup_js', j:1},
        'cancel': {f:'html/cancel.html', n: 'cancel', j:0},
        'cancel_js': {f:'html/js/cancel.js', n: 'cancel_js', j:1},
        'reset': {f:'html/reset.html', n: 'reset', j:0},
        'reset_js': {f:'html/js/reset.js', n: 'reset_js', j:1},
        'change_email_js': {f:'html/js/emailchange.js', n: 'change_email_js', j:1},
        'change_email': {f:'html/emailchange.html', n: 'change_email', j:0},
        'filesaver': {f:'js/vendor/filesaver.js', n: 'filesaver', j:1},
        'recovery': {f:'html/recovery.html', n: 'recovery', j:0},
        'recovery_js': {f:'html/js/recovery.js', n: 'recovery_js', j:1},
        'credits': {f:'html/credits.html', n: 'credits', j:0},
        'takedown': {f:'html/takedown.html', n: 'takedown', j:0},
        'dev': {f:'html/dev.html', n: 'dev', j:0},
        'dev_js': {f:'html/js/dev.js', n: 'dev_js', j:1},
        'sdkterms': {f:'html/sdkterms.html', n: 'sdkterms', j:0},
        'lunr_js': {f:'js/vendor/elasticlunr.js', n: 'lunr_js', j:1},
        'help_js': {f:'html/js/help2.js', n: 'help_js', j:1},
        'sync': {f:'html/sync.html', n: 'sync', j:0},
        'sync_js': {f:'html/js/sync.js', n: 'sync_js', j:1},
        'cmd': {f:'html/megacmd.html', n: 'cmd', j:0},
        'mobileapp': {f:'html/mobileapp.html', n: 'mobileapp', j:0},
        'megacmd_js': {f:'html/js/megacmd.js', n: 'megacmd_js', j:1},
        'cms_snapshot_js': {f:'js/cmsSnapshot.js', n: 'cms_snapshot_js', j:1},
        'support_js': {f:'html/js/support.js', n: 'support_js', j:1},
        'support': {f:'html/support.html', n: 'support', j:0},
        'contact': {f:'html/contact.html', n: 'contact', j:0},
        'pdfjs': {f:'js/vendor/pdf.js', n: 'pdfjs', j:1},
        'tiffjs': {f:'js/vendor/tiff.js', n: 'tiffjs', j:1},
        'webpjs': {f:'js/vendor/webp.js', n: 'webpjs', j:1},
        'videostream': {f:'js/vendor/videostream.js', n: 'videostream', j:1},
        'mediainfo': {f:'js/vendor/mediainfo.js', n: 'mediainfo', j:1},
        'privacycompany': {f:'html/privacycompany.html', n: 'privacycompany', j:0},
        'zxcvbn_js': {f:'js/vendor/zxcvbn.js', n: 'zxcvbn_js', j:1},
        'redeem': {f:'html/redeem.html', n: 'redeem', j:0},
        'redeem_js': {f:'html/js/redeem.js', n: 'redeem_js', j:1},
        'browsers': {f:'html/browsers.html', n: 'browsers', j:0},
        'browsers_js': {f:'html/js/browsers.js', n: 'browsers_js', j:1},
        'megabird': {f:'html/megabird.html', n: 'megabird', j:0},
        'uwp': {f:'html/uwp.html', n: 'uwp', j:0},
        'pdfviewer': {f:'html/pdfViewer.html', n: 'pdfviewer', j:0 },
        'pdfviewercss': {f:'css/pdfViewer.css', n: 'pdfviewercss', j:4 },
        'pdfjs2': {f:'js/vendor/pdf.js', n: 'pdfjs2', j:4 },
        'pdforiginalviewerjs': {f:'js/vendor/pdf.viewer.js', n: 'pdforiginalviewerjs', j:4 },
        'megadrop': {f:'html/megadrop.html', n: 'megadrop', j: 0 },
        'nomegadrop': {f:'html/nomegadrop.html', n: 'nomegadrop', j: 0 },
        'megadrop_js': {f:'js/megadrop.js', n: 'megadrop_js', j: 1 }
    };

    var jsl3 = {
        'chat': {
            /* chat related css */
            'chat_messages_css':{f:'css/chat-messages.css', n: 'chat_messages_css', j:2,'w':5,'c':1,'cache':1,'d':1},
            'chat_share_links_css':{f:'css/chat-share-links.css', n: 'chat_share_links_css', j:2,'w':5,'c':1,'cache':1,'d':1},
            'chat_textarea_css':{f:'css/chat-textarea.css', n: 'chat_textarea_css', j:2,'w':5,'c':1,'cache':1,'d':1},
            'chat_typing_css':{f:'css/chat-typing.css', n: 'chat_typing_css', j:2,'w':5,'c':1,'cache':1,'d':1},
            'chat_left_pane_css':{f:'css/chat-left-pane.css', n: 'chat_left_pane_css', j:2,'w':5,'c':1,'cache':1,'d':1},
            'chat_feedback_css':{f:'css/chat-feedback.css', n: 'chat_feedback_css', j:2,'w':5,'c':1,'cache':1,'d':1},
            'chat_calls_css':{f:'css/chat-calls.css', n: 'chat_calls_css', j:2,'w':5,'c':1,'cache':1,'d':1},
            'chat_common_css':{f:'css/chat-common.css', n: 'chat_common_css', j:2,'w':5,'c':1,'cache':1,'d':1},
            'chat_emoji_css':{f:'css/chat-emoji.css', n: 'chat_emoji_css', j:2,'w':2,'c':1,'cache':1,'d':1},

            /* chat related js */
            'react_js': {f:'js/vendor/react.js', n: 'react_js', j:1},
            'reactdom_js': {f:'js/vendor/react-dom.js', n: 'reactdom_js', j:1},
            'appactivityhandler_js': {f:'js/appActivityHandler.js', n: 'appactivityhandler_js', j:1},
            'keepalive_js': {f:'js/keepAlive.js', n: 'keepalive_js', j:1},
            'meganotifications_js': {f:'js/megaNotifications.js', n: 'meganotifications_js', j:1},
            'twemoji_js': {f:'js/vendor/twemoji.noutf.js', n: 'twemoji_js', j:1},
            'ionsound_js': {f:'js/vendor/ion.sound.js', n: 'ionsound_js', j:1},
            'favico_js': {f:'js/vendor/favico.js', n: 'favico_js', j:1},
            'autolinker_js': {f:'js/vendor/autolinker.js', n: 'autolinker_js', j:1},
            'strongvelope_js': {f:'js/chat/strongvelope.js', n: 'strongvelope_js', j:1},
            'adapter_js': {f:'js/vendor/chat/adapter.js', n: 'adapter_js', j:1},
            'megawebrtcadapt_js': {f:'js/chat/webrtcAdapter.js', n: 'megawebrtcadapt_js', j:1},
            'rtcstats_js': {f:'js/chat/rtcStats.js', n: 'rtcstats_js', j:1},
            'webrtcsdp_js': {f:'js/chat/webrtcSdp.js', n: 'webrtcsdp_js', j:1},
            'webrtc_js': {f:'js/chat/webrtc.js', n: 'webrtc_js', j:1},
            'webrtcimpl_js': {f:'js/chat/webrtcImpl.js', n: 'webrtcimpl_js', j:1},
            'chatdpersist_js': {f:'js/chat/chatdPersist.js', n: 'chatdpersist_js', j:1},
            'chatd_js': {f:'js/chat/chatd.js', n: 'chatd_js', j:1},
            'incomingcalldialog_js': {f:'js/chat/ui/incomingCallDialog.js', n: 'incomingcalldialog_js', j:1},
            'chatdInt_js': {f:'js/chat/plugins/chatdIntegration.js', n: 'chatdInt_js', j:1},
            'callManager_js': {f:'js/chat/plugins/callManager.js', n: 'callManager_js', j:1},
            'cne_js': {f:'js/chat/callNotificationsEngine.js', n: 'cne_js', j:1},
            'urlFilter_js': {f:'js/chat/plugins/urlFilter.js', n: 'urlFilter_js', j:1},
            'emoticonShortcutsFilter_js': {f:'js/chat/plugins/emoticonShortcutsFilter.js', n: 'emoticonShortcutsFilter_js', j:1},
            'emoticonsFilter_js': {f:'js/chat/plugins/emoticonsFilter.js', n: 'emoticonsFilter_js', j:1},
            'rtfFilter_js': {f:'js/chat/plugins/rtfFilter.js', n: 'rtfFilter_js', j:1},
            'btRtfFilter_js': {f:'js/chat/plugins/backtickRtfFilter.js', n: 'btRtfFilter_js', j:1},
            'chatnotifications_js': {f:'js/chat/plugins/chatNotifications.js', n: 'chatnotifications_js', j:1},
            'callfeedback_js': {f:'js/chat/plugins/callFeedback.js', n: 'callfeedback_js', j:1},
            'persistedTypeArea_js': {f:'js/chat/plugins/persistedTypeArea.js', n: 'persistedTypeArea_js', j:1, w:1},
            'presencedIntegration_js': {f:'js/chat/plugins/presencedIntegration.js', n: 'presInt_js', j:1, w:1},
            'richpreviewsFilt_js': {f:'js/chat/plugins/richpreviewsFilter.js', n: 'richpreviewsFilt_js', j:1, w:1},
            'chatStats_js': {f:'js/chat/plugins/chatStats.js', n: 'chatStats_js', j:1, w:1},
            'crm_js': {f:'js/connectionRetryManager.js', n: 'crm_js', j:1},
            'chat_messages_Js': {f:'js/chat/messages.js', n: 'chat_messages_Js', j:1},
            'presence2_js': {f:'js/chat/presence2.js', n: 'presence2_js', j:1},
            'chat_react_minified_js': {f:'js/chat/bundle.js', n: 'chat_react_minified_js', j:1}
        }
    };

    var subpages =
    {
        'about': ['about'],
        'sourcecode': ['sourcecode'],
        'terms': ['terms'],
        'general': ['general'],
        'credits': ['credits'],
        'backup': ['backup','backup_js','filesaver'],
        'recovery': ['recovery','recovery_js'],
        'reset': ['reset','reset_js'],
        'verify': ['change_email', 'change_email_js'],
        'cancel': ['cancel', 'cancel_js'],
        'blog': ['blog','blog_js','blogarticle','blogarticle_js'],
        'register': ['register','register_js', 'zxcvbn_js'],
        'newsignup': ['register','register_js', 'zxcvbn_js'],
        'resellers': ['resellers'],
        '!': ['download','download_js'],
        'dispute': ['dispute'],
        'disputenotice': ['disputenotice', 'copyright_js'],
        'copyright': ['copyright'],
        'copyrightnotice': ['copyrightnotice','copyright_js'],
        'privacy': ['privacy','privacycompany'],
        'gdpr': ['gdpr', 'gdpr_js'],
        'mega': ['mega'],
        'takedown': ['takedown'],
        'sync': ['sync', 'sync_js'],
        'cmd': ['cmd', 'megacmd_js'],
        'mobile': ['mobileapp'],
        'ios': ['mobileapp'],
        'android': ['mobileapp'],
        'support': ['support_js', 'support'],
        'contact': ['contact'],
        'dev': ['dev','dev_js','sdkterms'],
        'sdk': ['dev','dev_js','sdkterms'],
        'doc': ['dev','dev_js','sdkterms'],
        'help': [
            'lunr_js', 'help_js'
        ],
        'recover': ['reset', 'reset_js'],
        'redeem': ['redeem', 'redeem_js'],
        'plugin': ['browsers', 'browsers_js'],
        'extensions': ['browsers', 'browsers_js'],
        'bird': ['megabird'],
        'wp': ['uwp'],
        'uwp': ['uwp']
    };

    if (is_mobile) {
        // Page specific
        subpages['!'] = ['download_js'];
    }
	if (page == 'megacmd') page = 'cmd';

    if (page && !is_iframed)
    {
        for (var p in subpages)
        {
            if (page.substr(0,p.length) == p)
            {
                for (var i in subpages[p]) jsl.push(jsl2[subpages[p][i]]);
            }
        }
    }
    var lightweight=false;
    var waitingToBeLoaded = 0,jsl_done,jj_done = !jj;
    var fx_startup_cache = is_chrome_firefox && nocontentcheck;
    if (!fx_startup_cache && !nocontentcheck)
    {
        addScript([asmCryptoSha256Js]);
    }
    if ((typeof Worker !== 'undefined') && (typeof window.URL !== 'undefined') && !fx_startup_cache && !nocontentcheck)
    {
        var hashdata = ['self.postMessage = self.webkitPostMessage || self.postMessage;', asmCryptoSha256Js, 'self.onmessage = function(e) { try { var hashHex = asmCryptoSha256.SHA256.hex(e.data.text); e.data.hash = hashHex; self.postMessage(e.data); } catch(err) { e.data.error = err.message; self.postMessage(e.data);  } };'];
        var hash_url = mObjectURL(hashdata, "text/javascript");
        var hash_workers = [];
        var i =0;
        while (i < 2)
        {
            try
            {
                hash_workers[i] = new Worker(hash_url);
                hash_workers[i].postMessage = hash_workers[i].webkitPostMessage || hash_workers[i].postMessage;
                hash_workers[i].onmessage = function(e)
                {
                    if (e.data.error)
                    {
                        console.log('error',e.data.error);
                        console.log(e.data.text);
                        alert('error');
                    }
                    var file = Object(jsl[e.data.jsi]).f || 'unknown.js';
                    if (!nocontentcheck && !compareHashes(e.data.hash, file))
                    {
                        if (bootstaticpath.indexOf('cdn') > -1)
                        {
                            sessionStorage.skipcdn = 1;
                            document.location.reload();
                        }
                        else {
                            siteLoadError(1, bootstaticpath + file);
                        }

                        contenterror = 1;
                    }
                    if (!contenterror)
                    {
                        jsl_current += jsl[e.data.jsi].w || 1;
                        jsl_progress();
                        if (++jslcomplete == jsl.length) initall();
                        else jsl_load(e.data.xhri);
                    }
                };
            }
            catch(e)
            {
                hash_workers = undefined;
                break;
            }
            i++;
        }
        hashdata = null;
    }
    asmCryptoSha256Js = null;

    if (jj)
    {
        var _queueWaitToBeLoaded = function(id, elem) {
            waitingToBeLoaded++;
            elem.onload = function() {
                // if (d) console.log('jj.progress...', waitingToBeLoaded);

                jsl_loaded[Object(jsl[id]).n] = 1;
                jsl_current += Object(jsl[id]).w || 1;
                jsl_progress();

                if (--waitingToBeLoaded == 0) {
                    jj_done = true;
                    boot_done();
                }
                elem.onload = null;
            };
        };

        var createScriptTag = function(id, src) {
            var elem = mCreateElement('script', {type: 'text/javascript'}, 'head');
            elem.async = false;
            _queueWaitToBeLoaded(id, elem);
            elem.src = src;
            return elem;
        };

        var createStyleTag = function(id, src) {
            var elem = mCreateElement('link', {type: 'text/css', rel: "stylesheet"}, 'head');
            _queueWaitToBeLoaded(id, elem);
            elem.href = src;
            return elem;
        };
    }

    var pages = [],xhr_progress,xhr_stack,jsl_fm_current,jsl_current,jsl_total,jsl_perc,jsli,jslcomplete;

    function jsl_start()
    {
        jslcomplete = 0;
        if (d && jj) {
            xhr_progress = [0, 0, 0, 0, 0];
        } else {
            xhr_progress = [0, 0];
        }
        xhr_stack = Array(xhr_progress.length);
        jsl_fm_current = 0;
        jsl_current = 0;
        jsl_total = 0;
        jsl_perc = 0;
        jsli=0;
        var jjNoCache = '';
        if (localStorage.jjnocache) {
            jjNoCache = '?r=' + (new Date().toISOString().replace(/[^\w]/g, ''));
        }
        for (var i = 0; i < jsl.length; i++) {
            if (jsl[i] && !jsl[i].text) {
                jsl_total += jsl[i].w || 1;

                if (jj) {

                    if (jsl[i].j === 1) {
                        jj_done = false;
                        jsl[i].text = '/**/';
                        createScriptTag(i, bootstaticpath + jsl[i].f + jjNoCache);
                    }
                    else if (jsl[i].j === 2) {

                        jj_done = false;
                        jsl[i].text = '/**/';
                        createStyleTag(i, bootstaticpath + jsl[i].f + jjNoCache);
                    }
                }

                if (!jj || !jsl[i].j || jsl[i].j > 2) {
                    jsl_done = false;
                }
            }
        }
        if (d) {
            console.log('jj.total...', waitingToBeLoaded);
        }

        if (fx_startup_cache)
        {
            var step = function(jsi)
            {
                jsl_current += jsl[jsi].w || 1;
                jsl_progress();
                if (++jslcomplete == jsl.length) {
                    jsl_done = true;
                    initall();
                }
                else
                {
                    // mozRunAsync(next.bind(this, jsli++));
                    next(jsli++);
                }
            };
            var next = function(jsi)
            {
                var file = bootstaticpath + jsl[jsi].f;

                if (jsl[jsi].j == 1)
                {
                    try
                    {
                        loadSubScript(file);
                    }
                    catch(e)
                    {
                        Cu.reportError(e);

                        if (String(e) !== "Error: AsmJS modules are not yet supported in XDR serialization."
                                && file.indexOf('dcraw') === -1) {

                            return siteLoadError(e, file);
                        }
                    }
                    step(jsi);
                }
                else
                {
                    mozNetUtilFetch(file, jsl[jsi].j === 3, function(data) {
                        if (data === null) {
                            siteLoadError(2, file);
                        }
                        else {
                            jsl[jsi].text = String(data);

                            if (jsl[jsi].j === 3) {
                                l = JSON.parse(jsl[jsi].text);
                            }
                            step(jsi);
                        }
                    });
                }
            };
            next(jsli++);
        }
        else
        {
            for (var i = xhr_progress.length; i--; ) jsl_load(i);
        }
    }

    var xhr_timeout=30000;
    var urlErrors = {};

    function xhr_error()
    {
        xhr_timeout+=10000;
        console.log(xhr_timeout);
        if (bootstaticpath.indexOf('cdn') > -1)
        {
            bootstaticpath = geoStaticpath(1);
            staticpath = geoStaticpath(1);
        }
        var url = this.url;
        var jsi = this.jsi;
        var xhri = this.xhri;
        urlErrors[url] = (urlErrors[url] | 0) + 1;
        if (urlErrors[url] < 20) {
            setTimeout(function() {
                xhr_progress[xhri] = 0;
                xhr_load(url, jsi, xhri);
            }, urlErrors[url] * 100);
        }
        else {
            siteLoadError(2, this.url);
        }
    }

    function xhr_load(url,jsi,xhri)
    {
        xhr_stack[xhri] = getxhr();
        xhr_stack[xhri].onload = function()
        {
            try {
                jsl[this.jsi].text = this.response || this.responseText;
            }
            catch (ex) {
                return siteLoadError(ex, bootstaticpath + Object(jsl[this.jsi]).f);
            }

            if (typeof hash_workers !== 'undefined' && !nocontentcheck)
            {
                hash_workers[this.xhri].postMessage({'text':jsl[this.jsi].text,'xhr':'test','jsi':this.jsi,'xhri':this.xhri});
            }
            else
            {
                if (!nocontentcheck) {

                    // Hash the file content and convert to hex
                    var hashHex = asmCryptoSha256.SHA256.hex(jsl[this.jsi].text);

                    // Compare the hash from the file and the correct hash determined at deployment time
                    if (!compareHashes(hashHex, jsl[this.jsi].f))
                    {
                        siteLoadError(1, jsl[this.jsi].f);
                        contenterror = 1;
                    }
                }

                if (!contenterror)
                {
                    jsl_current += jsl[this.jsi].w || 1;
                    jsl_progress();
                    if (++jslcomplete == jsl.length) initall();
                    else jsl_load(this.xhri);
                }
            }
        };
        xhr_stack[xhri].onreadystatechange = function()
        {
            try
            {
                if (this.readyState == 1) this.timeout=0;
            }
            catch(e)
            {

            }
        };
        xhr_stack[xhri].onerror = xhr_error;
        xhr_stack[xhri].ontimeout = xhr_error;
        if (jsl[jsi].text)
        {
            if (++jslcomplete == jsl.length) initall();
            else jsl_load(xhri);
        }
        else
        {
            xhr_stack[xhri].url = url;
            xhr_stack[xhri].jsi = jsi;
            xhr_stack[xhri].xhri = xhri;
            if (localStorage.dd) url += '?t=' + Date.now();
            xhr_stack[xhri].open("GET", bootstaticpath + url, true);
            xhr_stack[xhri].timeout = xhr_timeout;
            if (is_chrome_firefox || is_firefox_web_ext) {
                xhr_stack[xhri].overrideMimeType('text/plain');
            }
            xhr_stack[xhri].send(null);
        }
    }

    window.onload = function() {
        'use strict';

        pageLoadTime = Date.now();
        mBroadcaster.once('startMega', function() {
            var now = Date.now();

            pageLoadTime = now - pageLoadTime;

            var ph = String(isPublicLink(page)).split('!')[1];
            if (ph) {
                localStorage.affid = ph;
                localStorage.affts = now;
            }

            Object.defineProperty(mega, 'affid', {
                get: function() {
                    return parseInt(localStorage.affts) + 864e5 > Date.now() && localStorage.affid || 0;
                }
            });

            // Get information about what API flags are enabled e.g. 2FA, New Registration etc
            if (!is_iframed) {
                M.req('gmf').done(function(result) {
                    if (typeof result === 'object') {
                        // Cache flags object
                        mega.apiMiscFlags = result;
                    }
                });
            }
            mega.ipcc = (String(document.cookie).match(/geoip\s*=\s*([A-Z]{2})/) || [])[1];
        });

        if (!maintenance && !androidsplash && !is_karma) {
            jsl_start();
        }
    };
    function jsl_load(xhri)
    {
        if (jsl[jsli]) xhr_load(jsl[jsli].f, jsli++,xhri);
    }
    function jsl_progress()
    {
        // if (d) console.log('done',(jsl_current+jsl_fm_current));
        // if (d) console.log('total',jsl_total);
        var p = Math.floor((jsl_current+jsl_fm_current)/jsl_total*100);
        var deg = 0;
        var leftProgressBlock = document.getElementById('loadinganimleft');
        var rightProgressBlock = document.getElementById('loadinganimright');

        // Fix exception thrown when going from mobile web /login page to mobile web /register page
        if (is_mobile && (rightProgressBlock === null)) {
            return false;
        }

        if ((p > jsl_perc) && (p <= 100))
        {
            jsl_perc = p;
            if (d) console.log('jsl.progress... ' + p + '%', (jsl_current+jsl_fm_current), jsl_total);
            if (is_extension) p=100;
            deg = 360 * p / 100;
            if (deg <= 180) {
                rightProgressBlock.style.webkitTransform = 'rotate(' + deg + 'deg)';
                rightProgressBlock.style.MozTransform = 'rotate(' + deg + 'deg)';
                rightProgressBlock.style.msTransform = 'rotate(' + deg + 'deg)';
                rightProgressBlock.style.OTransform = 'rotate(' + deg + 'deg)';
                rightProgressBlock.style.transform = 'rotate(' + deg + 'deg)';
            } else {
                rightProgressBlock.style.webkitTransform = 'rotate(180deg)';
                rightProgressBlock.style.MozTransform = 'rotate(180deg)';
                rightProgressBlock.style.msTransform = 'rotate(180deg)';
                rightProgressBlock.style.OTransform = 'rotate(180deg)';
                rightProgressBlock.style.transform = 'rotate(180deg)';
                leftProgressBlock.style.webkitTransform = 'rotate(' + (deg - 180) + 'deg)';
                leftProgressBlock.style.MozTransform = 'rotate(' + (deg - 180) + 'deg)';
                leftProgressBlock.style.msTransform = 'rotate(' + (deg - 180) + 'deg)';
                leftProgressBlock.style.OTransform = 'rotate(' + (deg - 180) + 'deg)';
                leftProgressBlock.style.transform = 'rotate(' + (deg - 180) + 'deg)';
            }
        }
    }
    var cssCache=false;
    var jsl_loaded={};
    function initall() {
        var jsar = [];
        var cssar = [];
        var nodedec = {};
        //for(var i in localStorage) if (i.substr(0,6) == 'cache!') delete localStorage[i];
        for (var i in jsl)
        {
            if (!jj || !jsl[i].j || jsl[i].j > 2) {
                jsl_loaded[jsl[i].n] = 1;
            }
            if ((jsl[i].j == 1) && (!jj))
            {
                if (!fx_startup_cache)
                {
                    jsar.push(jsl[i].text + '\n\n');
                }
            }
            else if ((jsl[i].j == 2) && (!jj))
            {
                if (document.getElementById('bootbottom')) document.getElementById('bootbottom').style.display='none';
                if (!is_chrome_firefox && window.URL)
                {
                    cssar.push(jsl[i].text.replace(/\.\.\//g,staticpath).replace(new RegExp( "\\/en\\/", "g"),'/' + lang + '/'));
                }
                else
                {
                    mCreateElement('style', {type: 'text/css', rel: 'stylesheet'}, 'head')
                        .textContent = jsl[i].text.replace(/\.\.\//g,staticpath).replace(new RegExp( "\\/en\\/", "g"),'/' + lang + '/');
                }
            }
            else if (jsl[i].j == 3) {
                try {
                    l = !jj && l || JSON.parse(jsl[i].text);
                } catch(ex) {
                    console.error(ex);
                    if (lang !== 'en') {
                        localStorage.lang = 'en';
                        setTimeout(function() {
                            document.location.reload();
                        }, 300);
                    }
                    throw new Error('Error parsing language file '+lang+'.json');
                }
            }
            else if (jsl[i].j === 4) { // new type to distinguish files to be used on iframes
                if (!window[jsl[i].n]) {
                    var scriptText = jsl[i].text;
                    var blobLink;
                    if ((jsl[i].n || '').indexOf('css') > -1) {
                        scriptText = scriptText.replace(/\.\.\//g, staticpath).replace(new RegExp("\\/en\\/", "g"), '/' + lang + '/');
                        blobLink = mObjectURL([scriptText], 'text/css');
                    }
                    else {
                        if (jsl[i].n === 'pdforiginalviewerjs') {
                            if (localStorage.d === '1' && localStorage.dd === '1' && localStorage.jj === '1') {
                                blobLink = staticpath + 'dont-deploy/pdf.viewer.debug.js';
                            }
                            else {
                                scriptText = modifyPdfViewerScript(scriptText);
                                blobLink = mObjectURL([scriptText], 'text/javascript');
                            }
                        }
                        else {
                            blobLink = mObjectURL([scriptText], 'text/javascript');
                        }
                    }
                    window[jsl[i].n] = blobLink;
                }
            }
            else if (jsl[i].j === 0 && jsl[i].f.match(/\.json$/)) {
                try {
                    var templates = JSON.parse(jsl[i].text);
                    for (var e in templates) {
                        pages[e] = templates[e];
                        jsl_loaded[e] = 1;
                    }
                } catch (ex) {
                    throw new Error("Error parsing template");
                }
            }
            else if (jsl[i].j == 0) pages[jsl[i].n] = jsl[i].text;

            if (jsl[i].n === 'sjcl_js' || jsl[i].n === 'nodedec_js' || jsl[i].n === 'asmcrypto_js') {
                nodedec[jsl[i].n] = jsl[i].text;
            }
        }
        if (window.URL)
        {
            nodedec = !jj && !is_extension && !("ActiveXObject" in window) && nodedec;

            if (nodedec && Object.keys(nodedec).length === 3) {
                var tmp = String(nodedec.nodedec_js).split(/importScripts\([^)]+\)/);

                nodedec = [tmp.shift(), nodedec.sjcl_js, nodedec.asmcrypto_js, tmp.join(';')];
                mega.nodedecBlobURI = mObjectURL(nodedec, 'text/javascript');
                nodedec = tmp = undefined;
            }
            if (localStorage.makeCache && !cssCache) cssCache=cssar;
            if (cssar.length)
            {
                mCreateElement('link', {type: 'text/css', rel: 'stylesheet'}, 'head', cssar);
            }
            if (!jsl_done || jsar.length) {
                jsar.push('jsl_done=true; boot_done();');
            } else {
                boot_done();
            }
            if (jsar.length) {
                if (is_chrome_firefox) {
                    console.error('jsar must be empty here...');
                }
                else {
                    addScript(jsar);
                }
            }
            jsar=undefined;
            cssar=undefined;
        }
        else
        {
            jsl_done=true;
            boot_done();
        }
    }

    var istaticpath = staticpath;
    if (is_chrome_web_ext || is_firefox_web_ext) {
        istaticpath = '../';
    }
    else if (is_chrome_firefox) {
        istaticpath = 'chrome://mega/content/';
    }

    mCreateElement('style', {type: 'text/css'}, 'body').textContent = '.div, span, input {outline: none;}.hidden {display: none;}.clear {clear: both;margin: 0px;padding: 0px;display: block;}.loading-main-block {width: 100%;height: 100%;position: fixed;z-index: 10000;font-family:Arial, Helvetica, sans-serif;}.loading-mid-white-block {height: 100%;width:100%;}.loading-cloud {width: 222px;position: fixed;height: 158px;background-image: url(' + istaticpath + 'images/mega/loading-sprite_v4.png);background-repeat: no-repeat;background-position: 0 0;left:50%;top:50%;margin:-79px 0 0 -111px;}.loading-m-block{width:60px;height:60px;position:absolute; left:81px;top:65px;background-color:white;background-image: url(' + istaticpath + 'images/mega/loading-sprite_v4.png);background-repeat: no-repeat;background-position: -81px -65px;border-radius: 100%;-webkit-border-radius: 100%;border-radius: 100%;z-index:10;}.loading-percentage { width: 80px;height: 80px; background-color: #e1e1e1;position: absolute;-moz-border-radius: 100%;-webkit-border-radius: 100%;border-radius: 100%;overflow: hidden;background-image: url(' + istaticpath + 'images/mega/loading-sprite_v4.png);background-repeat: no-repeat;background-position: -70px -185px;left:71px;top:55px;}.loading-percentage ul {list-style-type: none;-moz-border-radius: 100%;-webkit-border-radius: 100%;border-radius: 100%;overflow: hidden;}.loading-percentage li {position: absolute;top: 0px;}.loading-percentage p, .loading-percentage li, .loading-percentage ul{width: 80px;height: 80px;padding: 0;margin: 0;}.loading-percentage span {display: block;width: 40px;height: 80px;}.loading-percentage ul :nth-child(odd) {clip: rect(0px, 80px, 80px, 40px);}.loading-percentage ul :nth-child(even) {clip: rect(0px, 40px, 80px, 0px);}.loading-percentage .right-c span {-moz-border-radius-topleft: 40px;-moz-border-radius-bottomleft: 40px;-webkit-border-top-left-radius: 40px;-webkit-border-bottom-left-radius: 40px;border-top-left-radius: 40px;border-bottom-left-radius: 40px;background-color:#dc0000;}.loading-percentage .left-c span {margin-left: 40px;-moz-border-radius-topright: 40px;-moz-border-radius-bottomright: 40px;-webkit-border-top-right-radius: 40px;-webkit-border-bottom-right-radius: 40px;border-top-right-radius: 40px;border-bottom-right-radius: 40px;background-color:#dc0000;}.loading-main-bottom {max-width: 940px;width: 100%;position: absolute;bottom: 20px;left: 50%;margin: 0 0 0 -470px;text-align: center;}.loading-bottom-button {height: 29px;width: 29px;float: left;background-image: url(' + istaticpath + 'images/mega/loading-sprite_v4.png);background-repeat: no-repeat;cursor: pointer;}.st-social-block-load {position: fixed;bottom: 20px;left: 0;width: 100%;height: 43px;text-align: center;}.st-bottom-button {height: 24px;width: 24px;margin: 0 8px;display: inline-block;background-image: url(' + istaticpath + 'images/mega/loading-sprite_v4.png);background-repeat: no-repeat;background-position:11px -405px;cursor: pointer;-moz-border-radius: 100%;-webkit-border-radius: 100%;border-radius: 100%;-webkit-transition: all 200ms ease-in-out;-moz-transition: background-color 200ms ease-in-out;-o-transition: background-color 200ms ease-in-out;-ms-transition: background-color 200ms ease-in-out;transition: background-color 200ms ease-in-out;background-color:#999999;}.st-bottom-button.st-google-button {background-position: 11px -405px;}.st-bottom-button.st-google-button {background-position: -69px -405px;}.st-bottom-button.st-twitter-button{background-position: -29px -405px;}.st-bottom-button:hover {background-color:#334f8d;}.st-bottom-button.st-twitter-button:hover {background-color:#1a96f0;}.st-bottom-button.st-google-button:hover {background-color:#d0402a;}@media only screen and (-webkit-min-device-pixel-ratio: 1.5), only screen and (-o-min-device-pixel-ratio: 3/2), only screen and (min--moz-device-pixel-ratio: 1.5), only screen and (min-device-pixel-ratio: 1.5) {.maintance-block, .loading-percentage, .loading-m-block, .loading-cloud, .loading-bottom-button,.st-bottom-button, .st-bottom-scroll-button {background-image: url(' + istaticpath + 'images/mega/loading-sprite_v4@2x.png);    background-size: 222px auto;}}';

    mCreateElement('div', { "class": "loading-main-block", id: "loading"}, 'body')
        .innerHTML =
            '<div class="loading-mid-white-block">'+
            '    <div class="loading-cloud">'+
            '        <div class="loading-percentage">'+
            '            <ul>'+
            '                <li class="right-c"><p id="loadinganimright"><span></span></p></li>'+
            '                <li class="left-c"><p  id="loadinganimleft"><span></span></p></li>'+
            '            </ul>'+
            '        </div>'+
            '        <div class="loading-m-block"></div>'+
            '    </div>'+
            '    <div class="st-social-block-load" id="bootbottom">'+
            '        <a href="https://www.facebook.com/MEGAprivacy" target="_blank" rel="noopener noreferrer" class="st-bottom-button st-facebook-button"></a>'+
            '        <a href="https://www.twitter.com/MEGAprivacy" target="_blank" rel="noopener noreferrer" class="st-bottom-button st-twitter-button"></a>'+
            '    </div>'+
            '</div>';

    if (is_iframed) {
        try {
            document.body.textContent = '';
            document.body.style.background = is_drop ? '#fff' : '#000';
            jsl_progress = function() {};
        }
        catch (ex) {}
    }

    var u_storage, loginresponse, u_sid, dl_res;
    u_storage = init_storage(localStorage.sid ? localStorage : sessionStorage);

    (function _crossTabSession(u_storage) {
        'use strict';

        var xhr = function(params, data, callback) {
            var xhr = getxhr();
            xhr.onloadend = function() {
                var response = false;

                if (this.status === 200) {
                    try {
                        response = this.response || this.responseText || false;
                        if (response[0] === '[') {
                            response = JSON.parse(response);
                        }
                    }
                    catch (ex) {
                        console.warn(ex);
                        response = false;
                    }
                }

                callback(response);
                boot_done();
            };

            xhr.open("POST", apipath + 'cs?id=0' + mega.urlParams() + (params || ''), true);
            xhr.send(JSON.stringify([data]));
        };

        var ack = function() {
            if (!(u_sid = u_storage.sid)) {
                loginresponse = false;
            }

            if (loginresponse) {
                xhr('&sid=' + u_storage.sid, {'a': 'ug'}, function(response) {
                    loginresponse = false;

                    if (parseInt(response) === -15 /* ESID */) {
                        loginresponse = -15;
                    }
                    else if (typeof response[0] === 'object') {
                        loginresponse = response;
                    }
                });
            }

            if (dl_res) {
                var g = {a: 'g', p: page.split('!')[1], 'ad': showAd(), 'esid': u_sid || ''};

                xhr(false, g, function(response) {
                    dl_res = Array.isArray(response) && response[0];
                });
            }

            boot_done();
            ack = xhr = undefined;
        };

        // No session handling needed for
        if (is_drop) {
            return;
        }

        loginresponse = true;
        dl_res = (page[0] === '!' || (page[0] === 'E' && page[1] === '!')) && page.length > 2;

        if (localStorage === u_storage) {
            ack();
        }
        else {
            var onStorageEvent = function(ev) {
                if (ev.key === 'sb!sid') {
                    var value = JSON.parse(ev.newValue || '""');

                    if (typeof value === 'number') {
                        // Requesting session storage

                        var data = {};

                        if (sessionStorage.sid) {
                            data.k = sessionStorage.k;
                            data.sid = sessionStorage.sid;
                        }

                        onIdle(function() {
                            localStorage.setItem('sb!sid', JSON.stringify(data));
                        });
                    }
                    else if (typeof value === 'object') {
                        // Received session storage

                        if (ack) {
                            if (value.sid) {
                                u_storage.k = value.k;
                                u_storage.sid = value.sid;
                            }
                            ack();
                        }
                    }

                    delete localStorage[ev.key];
                }
            };

            if (window.addEventListener) {
                window.addEventListener('storage', onStorageEvent, false);
            }
            else if (window.attachEvent) {
                window.attachEvent('onstorage', onStorageEvent);
            }
            onStorageEvent = undefined;

            if (u_storage.sid) {
                ack();
            }
            else {
                setTimeout(function() {
                    if (ack) {
                        ack();
                    }
                    delete localStorage['sb!sid'];
                }, 800);
                localStorage.setItem('sb!sid', JSON.stringify(Math.random()));
            }
        }
    })(u_storage);

    function boot_auth(u_ctx,r)
    {
        u_type = r;
        u_checked=true;
        startMega();
    }

    var boot_done_makecache=false;

    function boot_done()
    {
        if (boot_done_makecache)
        {
            boot_done_makecache=false;
            makeCache();
            return false;
        }

        if (d) console.log('boot_done', loginresponse === true, dl_res === true, !jsl_done, !jj_done);

        if (loginresponse === true || dl_res === true || !jsl_done || !jj_done) return;

        // turn the `ua` (userAgent) string into an object which holds the browser details
        try {
            ua = Object(ua);
            ua.details = Object.create(browserdetails(ua));
        }
        catch (e) {}

        mBroadcaster.sendMessage('boot_done');

        if (u_checked) {
            startMega();
        }
        else if (loginresponse === -15) {
            u_logout(true);
            boot_auth(null, false);
        }
        else if (loginresponse)
        {
            api_setsid(u_sid);
            u_checklogin3a(loginresponse[0],{checkloginresult:boot_auth});
            loginresponse = undefined;
        }
        else u_checklogin({checkloginresult:boot_auth},false);
    }
}

/**
 * Determines whether to show an ad or not
 * @returns {number} Returns a 0 for definitely no ads (e.g. I am using an extension). 1 will enable ads dependent on
 *                   country. 2 ignores country limitations (for developers to always see ads regardless). 3 means I
 *                   prefer not to see an ad because I am logged in, but it will send one if it is a trusted ad that we
 *                   have vetted (we fully control the ad and host it ourselves) and ads are turned on in the API.
 */
function showAd() {

    // We need to tell the API we would like ad urls, but only show generic ads from providers if we are not logged in
    var showAd = (typeof u_sid === 'undefined') ? 1 : 3;

    // If using a browser extension, do not show ads at all for our security conscious users
    showAd = (is_extension) ? 0 : showAd;

    // Override for testing
    showAd = (typeof localStorage.testAds === 'undefined') ? showAd : parseInt(localStorage.testAds);

    return showAd;
}

/**
 * Simple .toArray method to be used to convert `arguments` to a normal JavaScript Array
 *
 * Please note there is a huge performance degradation when using `arguments` outside their
 * owning function, to mitigate it use this function as follow: toArray.apply(null, arguments)
 *
 * @returns {Array}
 */
function toArray() {
    var len = arguments.length;
    var res = Array(len);
    while (len--) {
        res[len] = arguments[len];
    }
    return res;
}

function tryCatch(fn, onerror)
{
    fn.foo = function __tryCatchWrapper()
    {
        try {
            return fn.apply(this, arguments);
        } catch (e) {
            console.error(e);

            if (typeof onerror === 'function') {
                onIdle(onerror.bind(null, e));
            }
        }
    };
    fn.foo.bar = fn;
    return fn.foo;
}

// setImmediate polyfill for Dexie...
if (!window.setImmediate && window.requestIdleCallback) {
    window.setImmediate = function _setImmediate(callback) {
        'use strict';

        // XXX: nothing from the code depends on the args
        return window.requestIdleCallback(callback, {timeout: 20});
    };

    window.clearImmediate = function _clearImmediate(pid) {
        'use strict';

        window.cancelIdleCallback(pid);
    };
}

var onIdle = function(handler) {
        var startTime = Date.now();

        return setTimeout(function() {
            handler({
                didTimeout: false,
                timeRemaining: function() {
                    return Math.max(0, 50.0 - (Date.now() - startTime));
                }
            });
        }, 1);
    };

if (window.requestIdleCallback) {
    onIdle = function onIdle(callback) {
        'use strict';

        return window.requestIdleCallback(callback, {timeout: 20});
    };
}

/** Helper to replace process.nextTick in videostream.js */
function onIdleA(boundCallBack) {
    'use strict';

    onIdle(function() {
        boundCallBack();
    });
}

function makeUUID(a) {
    'use strict';

    return a
        ? (a ^ Math.random() * 16 >> a / 4).toString(16)
        : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, makeUUID);
}

function inherits(target, source) {
    'use strict';

    target.prototype = Object.create(source.prototype || source);
    Object.defineProperty(target.prototype, 'constructor', {
        value: target,
        enumerable: false
    });
}
