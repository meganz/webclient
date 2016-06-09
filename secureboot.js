// Release version information is replaced by the build scripts
var buildVersion = { website: '', chrome: '', firefox: '', commit: '', timestamp: '', dateTime: '' };

var m;
var b_u = 0;
var apipath;
var maintenance = false;
var androidsplash = false;
var silent_loading = false;
var cookiesDisabled = false;
var URL = window.URL || window.webkitURL;
var seqno = Math.ceil(Math.random()*1000000000);
var staticpath = 'https://eu.static.mega.co.nz/3/';
var ua = window.navigator.userAgent.toLowerCase();
var storage_version = '1'; // clear localStorage when version doesn't match
var page = document.location.hash, l, d = false;

var is_electron = false;
if (typeof process !== 'undefined') {
    var mll = process.moduleLoadList || [];

    if (mll.indexOf('NativeModule ATOM_SHELL_ASAR') !== -1) {
        is_electron = module;
        module = undefined; // prevent factory loaders from using the module

        // localStorage.jj = 1;
    }
}
var is_karma = /^localhost:987[6-9]/.test(window.top.location.host);
var is_chrome_firefox = document.location.protocol === 'chrome:'
    && document.location.host === 'mega' || document.location.protocol === 'mega:';
var is_extension = is_chrome_firefox || is_electron || document.location.href.substr(0,19) == 'chrome-extension://';
var is_mobile = m = isMobile();

function isMobile()
{
    if (is_chrome_firefox) return false;
    var mobile = ['iphone','ipad','android','blackberry','nokia','opera mini','windows mobile','windows phone','iemobile','mobile safari','bb10; touch'];
    for (var i in mobile) if (ua.indexOf(mobile[i]) > 0) return true;
    return false;
}

function geoStaticpath(eu)
{
    if (!eu) {
        try {
            if (!sessionStorage.skipcdn) {
                var cc = 'FR DE NL ES PT DK CH IT UK GB NO SE FI PL CZ SK AT GR RO HU IE TR VA MC SM LI AD JE GG UA BG LT LV EE AX IS MA DZ LY TN EG RU BY HR SI AL ME RS KO EU FO CY IL LB SY SA JO IQ BA CV PS EH GI GL IM LU MK SJ BF BI BJ BW CF CG CM DJ ER ET GA GH GM GN GN GW KE KM LR LS MG ZA AE ML MR MT MU MV MW MZ NA NE QA RW SD SS SL SZ TD TG TZ UG YE ZA ZM ZR ZW';
                var cm = String(document.cookie).match(/geoip\s*\=\s*([A-Z]{2})/);
                if (cm && cm[1] && cc.indexOf(cm[1]) == -1)
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
else if (ua.indexOf('chrome') !== -1 && ua.indexOf('mobile') === -1
        && parseInt(String(navigator.appVersion).split('Chrome/').pop()) < 22) {
    b_u = 1;
}
else if (ua.indexOf('firefox') > -1 && typeof DataView === 'undefined') {
    b_u = 1;
}
else if (ua.indexOf('opera') > -1 && typeof window.webkitRequestFileSystem === 'undefined') {
    b_u = 1;
}
var myURL = URL;
if (!myURL) {
    b_u = 1;
}

if (!String.prototype.trim) {
    String.prototype.trim = function() {
        return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
    };
}
if (!String.trim) {
    String.trim = function(s) {
        return String(s).trim();
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
        d = !!localStorage.d;
    }
    catch (ex) {
        cookiesDisabled = ex.code && ex.code === DOMException.SECURITY_ERR
            || ex.message === 'SecurityError: DOM Exception 18';

        if (!cookiesDisabled) {
            throw ex;
        }

        // Cookies are disabled, therefore we can't use localStorage.
        // We could either show the user a message about the issue and let him
        // enable cookies, or rather setup a tiny polyfill so that they can use
        // the site even in such case, even though this solution has side effects.
        delete window.localStorage;
        Object.defineProperty(window, 'localStorage', {
            value: Object.create({}, {
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
            })
        });
        Object.defineProperty(window, 'sessionStorage', {
            value: localStorage
        });
        if (location.host !== 'mega.nz' && !is_karma) {
            localStorage.jj = localStorage.dd = localStorage.d = 1;
        }
        setTimeout(function() {
            console.warn('Apparently you have Cookies disabled, ' +
                'please note this session is temporal, ' +
                'it will die once you close/reload the browser/tab.');
        }, 4000);
    }

    var contenterror = 0;
    var nocontentcheck = false;
    if (localStorage.dd || is_karma) {
        nocontentcheck = true;
        var devhost = window.location.host;
        // handle subdirs
        var pathSuffix = window.location.pathname;
        pathSuffix = pathSuffix.split("/").slice(0, -1).join("/");
        // set the staticpath for debug mode
        localStorage.staticpath = window.location.protocol + "//" + devhost + pathSuffix + "/";
        // localStorage.staticpath = location.protocol + "//" + location.host + location.pathname.replace(/[^/]+$/,'');
        if (localStorage.d) {
            console.debug('StaticPath set to "' + localStorage.staticpath + '"');
        }
    }
    staticpath = localStorage.staticpath || geoStaticpath();
    apipath = localStorage.apipath || 'https://eu.api.mega.co.nz/';
}
catch(e) {
    if (!m || !cookiesDisabled) {
        var extraInfo = '';
        if (cookiesDisabled) {
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
    browserBrand: [
        0, 'Torch', 'Epic'
    ],

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

    /** Parameters to append to API requests */
    urlParams: function() {
        if (!this._urlParams) {
            var params = '&domain=meganz'; // domain origin

            // If using extension this is passed through to the API for the helpdesk tool
            if (is_extension) {
                params += '&ext=1';
            }

            // Append browser brand for easier troubleshoting
            var brand = this.getBrowserBrandID();
            if (brand) {
                params += '&bb=' + parseInt(brand);
            }

            this._urlParams = params;
        }

        return this._urlParams;
    }
};
var bootstaticpath = staticpath;
var urlrootfile = '';

if (!b_u && is_extension)
{
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
        bootstaticpath = chrome.extension.getURL('mega/');
        urlrootfile = 'mega/secure.html';
    }

    Object.defineProperty(window, 'eval', {
        value : function eval(code) {
            throw new Error('Unsafe eval is not allowed, code: ' + String(code).replace(/\s+/g,' ').substr(0,60) + '...');
        }
    });
}

if (b_u && !is_mobile) {
    document.location = 'update.html';
}

var ln = {}; ln.en = 'English'; ln.cn = '简体中文';  ln.ct = '中文繁體'; ln.ru = 'Pусский'; ln.es = 'Español'; ln.fr = 'Français'; ln.de = 'Deutsch'; ln.it = 'Italiano'; ln.br = 'Português Brasil'; ln.vi = 'Tiếng Việt'; ln.nl = 'Nederlands'; ln.kr = '한국어';   ln.ar = 'العربية'; ln.jp = '日本語'; ln.pt = 'Português'; ln.he = 'עברית'; ln.pl = 'Polski'; ln.sk = 'Slovenský'; ln.cz = 'Čeština'; ln.ro = 'Română'; ln.fi = 'Suomi'; ln.se = 'Svenska'; ln.hu = 'Magyar'; ln.sr = 'српски'; ln.sl = 'Slovenščina'; ln.tr = 'Türkçe';  ln.id = 'Bahasa Indonesia'; ln.uk = 'Українська'; ln.sr = 'српски'; ln.th = 'ภาษาไทย'; ln.bg = 'български'; ln.fa = 'فارسی '; ln.tl = 'Tagalog';
var ln2 = {}; ln2.en = 'English'; ln2.cn = 'Chinese';  ln2.ct = 'Traditional Chinese'; ln2.ru = 'Russian'; ln2.es = 'Spanish'; ln2.fr = 'French'; ln2.de = 'German'; ln2.it = 'Italian'; ln2.br = 'Brazilian Portuguese'; ln2.vi = 'Vietnamese'; ln2.nl = 'Dutch'; ln2.kr = 'Korean';   ln2.ar = 'Arabic'; ln2.jp = 'Japanese'; ln2.pt = 'Portuguese'; ln2.he = 'Hebrew'; ln2.pl = 'Polish'; ln2.sk = 'Slovak'; ln2.cz = 'Czech'; ln2.ro = 'Romanian'; ln2.fi = 'Finnish'; ln2.se = 'Swedish'; ln2.hu = 'Hungarian'; ln2.sr = 'Serbian'; ln2.sl = 'Slovenian'; ln2.tr = 'Turkish'; ln2.id = 'Indonesian'; ln2.uk = 'Ukrainian'; ln2.sr = 'Serbian'; ln2.th = 'Thai'; ln2.bg = 'Bulgarian'; ln2.fa = 'Farsi'; ln2.tl = 'Tagalog';

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

function evalscript(text)
{
    mCreateElement('script', {type: 'text/javascript'}, 'head').text = text;
}

function evalscript_url(jarray)
{
    var url = mObjectURL(jarray, 'text/javascript');
    mCreateElement('script', {type: 'text/javascript'}, 'head').src = url;
    return url;
}

function mCreateElement(aNode, aAttrs, aChildNodes, aTarget)
{
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

Object.defineProperty(this, 'mBroadcaster', {
    writable: false,
    value: Object.freeze({
    _topics : {},

    addListener: function mBroadcaster_addListener(topic, options) {
        if (typeof options === 'function') {
            options = {
                callback : options
            };
        }
        if (typeof options.callback !== 'function') {
            return false;
        }

        if (!this._topics.hasOwnProperty(topic)) {
            this._topics[topic] = {};
        }

        var id = Math.random().toString(26);
        this._topics[topic][id] = options;

        //if (d) console.log('Adding broadcast listener', topic, id, options);

        return id;
    },

    removeListener: function mBroadcaster_removeListenr(token) {
        if (d) console.log('Removing broadcast listener', token);
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

    sendMessage: function mBroadcaster_sendMessage(topic) {
        if (this._topics.hasOwnProperty(topic)) {
            var args = Array.prototype.slice.call(arguments, 1);
            var idr = [];

            // if (d) console.log('Broadcasting ' + topic, args);

            for (var id in this._topics[topic]) {
                var ev = this._topics[topic][id], rc;
                try {
                    rc = ev.callback.apply(ev.scope, args);
                } catch (ex) {
                    if (d) console.error(ex);
                }
                if (ev.once || rc === 0xDEAD)
                    idr.push(id);
            }
            if (idr.length)
                idr.forEach(this.removeListener.bind(this));

            return true;
        }

        return false;
    },

    once: function mBroadcaster_once(topic, callback) {
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

            setTimeout(function() {
                setup();
            }, !parseInt(localStorage.ctInstances) ? 0 : 2000);
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
                    localStorage.ctInstances--;
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
            if (d) console.log('crossTab ' + ev.type + '-event', ev.key, ev.newValue, ev);

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
                            if (u_handle && window.indexedDB) {
                                mDBstart(true);
                            }
                        }
                    }
                    break;
            }

            delete localStorage[ev.key];
        }
    }
})});


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
    var message = ['An error occurred while loading MEGA.'];

    if (error === 1) {
        message.push('The file "' + filename + '" is corrupt.');
    }
    else if (error === 2) {
        message.push('The file "' + filename + '" could not be loaded.');
    }
    else {
        message.push('Filename: ' + filename + "\nException: " + error);
    }

    if (!is_extension) {
        message.push('Please try again later. We apologize for the inconvenience.');
    }
    message.push('BrowserID: ' + (typeof mozBrowserID !== 'undefined' ? mozBrowserID : ua));

    contenterror = 1;
    alert(message.join("\n\n"));
}

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
    tag.href = staticpath + "images/mobile/App_ipad_144x144.png";
    document.getElementsByTagName('head')[0].appendChild(tag);
    var tag=document.createElement('link');
    tag.rel = "apple-touch-icon-precomposed";
    tag.sizes = "114x114";
    tag.href = staticpath + "images/mobile/App_iphone_114x114.png";
    document.getElementsByTagName('head')[0].appendChild(tag);
    var tag=document.createElement('link');
    tag.rel = "apple-touch-icon-precomposed";
    tag.sizes = "72x72";
    tag.href = staticpath + "images/mobile/App_ipad_72X72.png";
    document.getElementsByTagName('head')[0].appendChild(tag);
    var tag=document.createElement('link');
    tag.rel = "apple-touch-icon-precomposed";
    tag.href = staticpath + "images/mobile/App_iphone_57X57.png"
    document.getElementsByTagName('head')[0].appendChild(tag);
    var tag=document.createElement('link');
    tag.rel = "shortcut icon";
    tag.type = "image/vnd.microsoft.icon";
    tag.href = "https://mega.nz/favicon.ico";
    document.getElementsByTagName('head')[0].appendChild(tag);
    m=true;
}

if (m)
{
    var app,mobileblog,android,intent, ios9;
    var ios;
    var link = document.createElement('link');
    link.setAttribute('rel', 'stylesheet');
    link.type = 'text/css';
    link.href = staticpath + 'css/mobile-app.css';
    document.head.appendChild(link);
    // AMO: Markup should not be passed to `innerHTML` dynamically. -- This isnt reached for the extension, anyway
    document.body.innerHTML = '<div class="main-scroll-block"> <div class="main-content-block"> <div class="free-green-tip"></div><div class="main-centered-bl"><div class="main-logo"></div><div class="main-head-txt" id="m_title"></div><div class="main-head-txt" id="m_desc"></div><br /><br /><a href="" class="main-button" id="m_appbtn"></a><div class="main-social hidden"><a href="https://www.facebook.com/MEGAprivacy" class="main-social-icon facebook"></a><a href="https://www.twitter.com/MEGAprivacy" class="main-social-icon twitter"></a><div class="clear"></div></div></div> </div><div class="scrolling-content"><div class="mid-logo"></div> <div class="mid-gray-block">MEGA provides free cloud storage with convenient and powerful always-on privacy </div> <div class="scrolling-block-icon encription"></div> <div class="scrolling-block-header"> End-to-end encryption </div> <div class="scrolling-block-txt">Unlike other cloud storage providers, your data is encrypted & decrypted during transfer by your client devices only and never by us. </div> <div class="scrolling-block-icon access"></div> <div class="scrolling-block-header"> Secure Global Access </div> <div class="scrolling-block-txt">Your data is accessible any time, from any device, anywhere. Only you control the keys to your files.</div> <div class="scrolling-block-icon colaboration"></div> <div class="scrolling-block-header"> Secure Collaboration </div> <div class="scrolling-block-txt">Share folders with your contacts and see their updates in real time. Online collaboration has never been more private and secure.</div> <div class="bottom-menu full-version"><div class="copyright-txt">Mega Limited ' + new Date().getFullYear() + '</div><div class="language-block"></div><div class="clear"></div><iframe src="" width="1" height="1" frameborder="0" style="width:1px; height:1px; border:none;" id="m_iframe"></iframe></div></div></div>';
    if (window.location.hash.substr(1,4) == 'blog') mobileblog=1;
    if (ua.indexOf('windows phone') > -1 /*&& ua.indexOf('iemobile') > -1*/)
    {
        app='zune://navigate/?phoneappID=1b70a4ef-8b9c-4058-adca-3b9ac8cc194a';
        document.body.className = 'wp full-mode supported';
    }
    else if (ua.indexOf('android') > -1)
    {
        app='https://play.google.com/store/apps/details?id=mega.privacy.android.app&referrer=meganzsb';
        document.body.className = 'android full-mode supported';
        android=1;

        var ver = ua.match(/android (\d+)\.(\d+)/);
        if (ver) {
            var rev = ver.pop();
            ver = ver.pop();
            // Check for Android 2.3+
            if (ver > 2 || (ver === 2 && rev > 3)) {
                intent = 'intent://' + location.hash + '/#Intent;scheme=mega;package=mega.privacy.android.app;end';
            }
        }
        if (intent) {
            document.location = intent;
        }
    }
    else if (ua.indexOf('bb10') > -1)
    {
        app='http://appworld.blackberry.com/webstore/content/46810890/';
        document.body.className = 'blackberry full-mode supported';
    }
    else if (ua.indexOf('iphone') > -1 || ua.indexOf('ipad') > -1 || ua.indexOf('ipod') > -1)
    {
        app = document.querySelector('meta[name="apple-itunes-app"]');
        if (app) {
            app.setAttribute('content',
                'app-id=706857885, app-argument=mega://' + window.location.hash);
        }

        // http://whatsmyuseragent.com/Devices/iPhone-User-Agent-Strings
        // http://www.enterpriseios.com/wiki/Complete_List_of_iOS_User_Agent_Strings
        app='https://itunes.apple.com/app/mega/id706857885';
        document.body.className = 'ios full-mode supported';

        var ver = ua.match(/(?:iphone|cpu) os (\d+)[\._](\d+)/);
        if (ver) {
            var rev = ver.pop();
            ver = ver.pop();
            // Check for iOS 9.0+
            ios9 = (ver > 8);
        }
        ios = 1;
    }
    else document.body.className = 'another-os full-mode unsupported';

    document.getElementById('m_title').innerHTML = 'Due to our advanced end-to-end encryption we do not yet support mobile browsers.';
    if (app)
    {
        document.getElementById('m_appbtn').href = app;
        document.getElementById('m_desc').innerHTML = 'To use our service, you can either open MEGA on a desktop or laptop browser, or download the MEGA app.';
    }
    else
    {
        document.getElementById('m_desc').innerHTML = 'To use our service, you can open MEGA on a desktop or laptop browser. A dedicated app for your platform will be coming soon.';
    }
    if (window.location.hash.substr(1,1) == '!' || window.location.hash.substr(1,2) == 'F!')
    {
        var i = 0;
        if (ua.indexOf('windows phone') > -1) {
            i = 1;
        }

        if (app) {
            document.getElementById('m_desc').innerHTML = 'To view this link, you can either open it on a desktop or laptop browser, or download the MEGA app.';

            document.getElementById('m_appbtn').href += '&referrer=link';
        }
        if (ua.indexOf('chrome') > -1)
        {
            if (intent) {
                document.getElementById('m_desc').innerHTML
                    += '<br/><em>If you already have it installed, <a href="' + intent + '">Click here!</a></em>';
            }
            else {
                setTimeout(function() {
                    if (confirm('Do you already have the MEGA app installed?')) {
                        document.location = intent ? intent : 'mega://' + window.location.hash;
                    }
                }, 2500);
            }
        }
        else if (ios9) {
            setTimeout(function() {
                if (confirm('Do you already have the MEGA app installed?')) {
                    document.location = 'mega://' + window.location.hash;
                }
            }, 1500);
        }
        else {
            document.getElementById('m_iframe').src = 'mega://' + window.location.hash.substr(i);
        }
    }
    else if (window.location.hash.substr(1, 7) === 'confirm'
            || window.location.hash.substr(1, 6) === 'backup'
            || window.location.hash.substr(1, 9) === 'newsignup'
            || window.location.hash.substr(1, 7) === 'account')
    {
        var i = 0;
        if (ua.indexOf('windows phone') > -1) {
            i = 1;
        }
        if (ua.indexOf('chrome') > -1) {
            window.location = 'mega://' + window.location.hash.substr(i);
        }
        else if (ios9) {
            setTimeout(function() {
                if (confirm('Do you already have the MEGA app installed?')) {
                    document.location = 'mega://' + window.location.hash;
                }
            }, 1500);
        }
        else {
            document.getElementById('m_iframe').src = 'mega://' + window.location.hash.substr(i);
        }

        if (intent) {
            document.getElementById('m_title').innerHTML
                += '<br/><em>If you already have it installed, <a href="' + intent + '">Click here!</a></em>';
        }
    }
    if (mobileblog)
    {
        document.body.innerHTML = '';
        mCreateElement('script', {type: 'text/javascript'}, 'head').src = '/blog.js';
    }
}
else if (page == '#android')
{
    document.location = 'https://play.google.com/store/apps/details?id=mega.privacy.android.app&referrer=meganzmobileapps';
}
else if (!b_u)
{
    d = localStorage.d || 0;
    var jj = localStorage.jj || 0;
    var onBetaW = location.hostname === 'beta.mega.nz' || location.hostname.indexOf("developers.") === 0;
    var languages = {'en':['en','en-'],'es':['es','es-'],'fr':['fr','fr-'],'de':['de','de-'],'it':['it','it-'],'nl':['nl','nl-'],'pt':['pt'],'br':['pt-br'],'se':['sv'],'fi':['fi'],'pl':['pl'],'cz':['cz','cs','cz-'],'sk':['sk','sk-'],'sl':['sl','sl-'],'hu':['hu','hu-'],'jp':['ja'],'cn':['zh','zh-cn'],'ct':['zh-hk','zh-sg','zh-tw'],'kr':['ko'],'ru':['ru','ru-mo'],'ar':['ar','ar-'],'he':['he'],'id':['id'],'sg':[],'tr':['tr','tr-'],'ro':['ro','ro-'],'uk':['||'],'sr':['||'],'th':['||'],'fa':['||'],'bg':['bg'],'tl':['en-ph'],'vi':['vn', 'vi']};

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

    Object.defineProperty(window, "__cd_v", { value : 27, writable : false });

    // Do not report exceptions if this build is older than 20 days
    var exTimeLeft = ((buildVersion.timestamp + (20 * 86400)) * 1000) > Date.now();

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
            dump.m = dump.m.replace(/\s+/g, ' ');

            if (!window.jsl_done) {
                // Alert the user if there was an uncaught exception while
                // loading the site, this should only happen on some fancy
                // browsers other than what we use during development, and
                // hopefully they'll report it back to us for troubleshoot
                return siteLoadError(dump.m, url);
            }

            if (~dump.m.indexOf('took +10s'))
            {
                var lrc = +localStorage.ttfbReportCount || 0;
                if (lrc > 20)
                {
                    var eid = localStorage.ttfbReport;
                    localStorage.ttfbReport = sbid;
                    if (!eid || eid == sbid) return false;
                    lrc = 1;
                }
                localStorage.ttfbReportCount = lrc + 1;
            }

            if (errobj)
            {
                if (errobj.udata) dump.d = errobj.udata;
                if (errobj.stack)
                {
                    var omsg = String(msg).trim();
                    var re = RegExp(
                        omsg.substr(0, 70)
                        .replace(/^\w+:\s/, '')
                        .replace(/([^\w])/g, '\\$1')
                        + '[^\r\n]+'
                    );

                    dump.s = String(errobj.stack)
                        .replace(omsg, '').replace(re, '')
                        .split("\n").map(String.trim).filter(String)
                        .splice(0,15).map(mTrim).join("\n");

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
            var report = safeCall(function()
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

                for (var i in __cdumps)
                {
                    api_req({ a : 'cd', c : JSON.stringify(__cdumps[i]), v : report, t : +__cd_v, s : window.location.host }, ctx(ids[i]));
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

        // Get the preferred language in their browser
        var userLang = (navigator.languages) ? navigator.languages[0] : (navigator.language || navigator.userLanguage);
        var langCode = null;
        var langCodeVariant = null;

        if (!userLang) {
            return 'en';
        }

        // Lowercase it
        userLang = userLang.toLowerCase();

        // Match on language code variants e.g. 'pt-br' returns 'br'
        /* jshint -W089 */
        for (langCode in languages) {
            for (langCodeVariant in languages[langCode]) {
                if (languages[langCode][langCodeVariant] === userLang) {
                    return langCode;
                }
            }
        }

        // If no exact match supported, normalise to base language code e.g. en-gb, en-us, en-ca returns 'en'
        /* jshint -W089 */
        for (langCode in languages) {
            for (langCodeVariant in languages[langCode]) {
                if (languages[langCode][langCodeVariant].substring(0, 3) === userLang.substring(0, 3)) {
                    return langCode;
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

        // If the sh1 (filename with hashes) array has been created from deploy script
        if (typeof sh1 !== 'undefined') {

            // Search the array
            for (var i = 0, length = sh1.length; i < length; i++) {

                var filePath = sh1[i];

                // If the language e.g. 'en' matches part of the filename from the deploy script e.g.
                // 'lang/en_0a8e1591149050ef1884b0c4abfbbeb759bbe9eaf062fa54e5b856fdb78e1eb3.json'
                if (filePath.indexOf('lang/' + language) > -1) {
                    return filePath;
                }
            }
        }
        else {
            // Otherwise return the filename.json when in Development
            return 'lang/' + language + '.json';
        }
    };

    var lang = detectLang();
    var jsl = [];

    // If they've already selected a language, use that
    if ((typeof localStorage != 'undefined') && (localStorage.lang)) {
        if (languages[localStorage.lang]) {
            lang = localStorage.lang;
        }
    }

    // Get the language file path e.g. lang/en.json or 'lang/en_7a8e15911490...f1878e1eb3.json'
    var langFilepath = getLanguageFilePath(lang);

    jsl.push({f:langFilepath, n: 'lang', j:3});
    jsl.push({f:'sjcl.js', n: 'sjcl_js', j:1}); // Will be replaced with asmCrypto soon
    jsl.push({f:'js/mDB.js', n: 'mDB_js', j:1});
    jsl.push({f:'js/mouse.js', n: 'mouse_js', j:1});
    jsl.push({f:'js/vendor/jquery-2.2.1.js', n: 'jquery', j:1, w:10});
    jsl.push({f:'js/functions.js', n: 'functions_js', j:1});
    jsl.push({f:'js/datastructs.js', n: 'datastructs_js', j:1});
    jsl.push({f:'js/vendor/megaLogger.js', n: 'megaLogger_js', j:1});
    jsl.push({f:'js/mega.js', n: 'mega_js', j:1,w:7});
    jsl.push({f:'js/vendor/db.js', n: 'db_js', j:1,w:5});
    jsl.push({f:'js/megaDbEncryptionPlugin.js', n: 'megadbenc_js', j:1,w:5});
    jsl.push({f:'js/megaDb.js', n: 'megadb_js', j:1,w:5});
    jsl.push({f:'js/idbkvstorage.js', n: 'idbkvstorage_js', j: 1, w: 5});

    jsl.push({f:'js/tlvstore.js', n: 'tlvstore_js', j:1});
    jsl.push({f:'js/crypto.js', n: 'crypto_js', j:1,w:5});
    jsl.push({f:'js/vendor/jsbn.js', n: 'jsbn_js', j:1, w:2});
    jsl.push({f:'js/vendor/jsbn2.js', n: 'jsbn2_js', j:1, w:2});
    jsl.push({f:'js/vendor/nacl-fast.js', n: 'nacl_js', j:1,w:7});
    jsl.push({f:'js/megaPromise.js', n: 'megapromise_js', j:1,w:5});
    jsl.push({f:'js/account.js', n: 'user_js', j:1});
    jsl.push({f:'js/authring.js', n: 'authring_js', j:1});
    jsl.push({f:'js/filedrag.js', n: 'filedrag_js', j:1});
    jsl.push({f:'js/vendor/jquery-ui-1.11.4.js', n: 'jqueryui_js', j:1, w:10});
    jsl.push({f:'js/vendor/jquery.mousewheel.js', n: 'jquerymouse_js', j:1});
    jsl.push({f:'js/vendor/jquery.jscrollpane.js', n: 'jscrollpane_js', j:1});
    jsl.push({f:'js/vendor/jquery.fullscreen.js', n: 'jquery_fullscreen', j:1, w:10});
    jsl.push({f:'js/vendor/verge.js', n: 'verge', j:1, w:5});
    jsl.push({f:'js/jquery.tokeninput.js', n: 'jquerytokeninput_js', j:1});
    jsl.push({f:'js/jquery.checkboxes.js', n: 'checkboxes_js', j:1});
    jsl.push({f:'js/jquery.misc.js', n: 'jquerymisc_js', j:1});
    jsl.push({f:'js/thumbnail.js', n: 'thumbnail_js', j:1});
    jsl.push({f:'js/vendor/exif.js', n: 'exif_js', j:1, w:3});
    jsl.push({f:'js/vendor/megapix.js', n: 'megapix_js', j:1});
    jsl.push({f:'js/vendor/smartcrop.js', n: 'smartcrop_js', j:1, w:7});
    jsl.push({f:'js/vendor/jquery.qrcode.js', n: 'jqueryqrcode', j:1});
    jsl.push({f:'js/vendor/qrcode.js', n: 'qrcode', j:1,w:2, g: 'vendor'});
    jsl.push({f:'js/vendor/bitcoin-math.js', n: 'bitcoinmath', j:1 });
    jsl.push({f:'js/paycrypt.js', n: 'paycrypt_js', j:1 });

    // notifications
    jsl.push({f:'js/megaNotifications.js', n: 'meganotifications_js', j:1,w:7});
    jsl.push({f:'js/vendor/ion.sound.js', n: 'ionsound_js', j:1,w:7});
    jsl.push({f:'js/vendor/favico.js', n: 'favico_js', j:1,w:7});
    jsl.push({f:'js/vendor/notification.js', n: 'notification_js', j:1,w:7});

    // Other
    jsl.push({f:'js/vendor/autolinker.js', n: 'autolinker_js', j:1,w:1});
    jsl.push({f:'js/vendor/moment.js', n: 'moment_js', j:1,w:1});

    // Google Import Contacts
    jsl.push({f:'js/gContacts.js', n: 'gcontacts_js', j:1,w:3});

    // UI Elements
    jsl.push({f:'js/ui/filepicker.js', n: 'filepickerui_js', j:1,w:1});
    jsl.push({f:'js/ui/dialog.js', n: 'dialogui_js', j:1,w:1});
    jsl.push({f:'js/ui/credentialsWarningDialog.js', n: 'creddialogui_js', j:1,w:1});
    jsl.push({f:'js/ui/loginRequiredDialog.js', n: 'loginrequireddialog_js', j:1,w:1});
    jsl.push({f:'js/ui/registerDialog.js', n: 'registerdialog_js', j:1,w:1});
    jsl.push({f:'js/ui/keySignatureWarningDialog.js', n: 'mega_js', j:1,w:7});
    jsl.push({f:'js/ui/feedbackDialog.js', n: 'feedbackdialogui_js', j:1,w:1});
    jsl.push({f:'js/ui/languageDialog.js', n: 'mega_js', j:1,w:7});
    jsl.push({f:'js/ui/publicServiceAnnouncement.js', n: 'psa_js', j:1,w:1});
    jsl.push({f:'js/ui/alarm.js', n: 'alarm_js', j:1,w:1});
    jsl.push({f:'js/ui/export.js', n: 'export_js', j:1,w:1});

    // MEGA CHAT
    if (location.host === 'mega.nz' || !megaChatIsDisabled) {
        jsl.push({f:'js/chat/strongvelope.js', n: 'strongvelope_js', j:1, w:1});
        jsl.push({f:'js/chat/rtcStats.js', n: 'rtcstats_js', j:1, w:1});
        jsl.push({f:'js/chat/rtcSession.js', n: 'rtcsession_js', j:1, w:1});

        jsl.push({f:'js/vendor/chat/strophe.light.js', n: 'stropheligh_js', j:1, w:4});
        jsl.push({f:'js/vendor/chat/strophe.disco.js', n: 'strophedisco_js', j:1, w:1});
        jsl.push({f:'js/vendor/chat/strophe.jingle.js', n: 'strophejingle_js', j:1, w:3});
        jsl.push({f:'js/vendor/chat/strophe.jingle.session.js', n: 'strophejinglesess_js', j:1, w:2});
        jsl.push({f:'js/vendor/chat/strophe.jingle.sdp.js', n: 'strophejinglesdp_js', j:1, w:2});
        jsl.push({f:'js/vendor/chat/strophe.jingle.adapter.js', n: 'strophejingleadapt_js', j:1, w:2});
        jsl.push({f:'js/vendor/chat/strophe.muc.js', n: 'strophemuc_js', j:1, w:1});
        jsl.push({f:'js/vendor/chat/strophe.roster.js', n: 'stropheroster_js', j:1, w:1});
        jsl.push({f:'js/vendor/chat/wildemitter.patched.js', n: 'wildemitter_js', j:1, w:1});
        jsl.push({f:'js/vendor/chat/hark.patched.js', n: 'hark_js', j:1, w:1});
        jsl.push({f:'js/vendor/chat/base32.js', n: 'base32_js', j:1, w:1});

        jsl.push({f:'js/chat/chatd.js', n: 'chatd_js', j:1, w:1});
        jsl.push({f:'js/chat/ui/incomingCallDialog.js', n: 'incomingcalldialog_js', j:1, w:1});

        jsl.push({f:'js/chat/plugins/chatdIntegration.js', n: 'chatdInt_js', j:1, w:2});
        jsl.push({f:'js/chat/plugins/karerePing.js', n: 'karerePing_js', j:1, w:7});
        jsl.push({f:'js/chat/plugins/callManager.js', n: 'callManager_js', j:1, w:7});
        jsl.push({f:'js/chat/plugins/urlFilter.js', n: 'urlFilter_js', j:1, w:7});
        jsl.push({f:'js/chat/plugins/emoticonShortcutsFilter.js', n: 'emoticonShortcutsFilter_js', j:1, w:7});
        jsl.push({f:'js/chat/plugins/emoticonsFilter.js', n: 'emoticonsFilter_js', j:1, w:7});
        jsl.push({f:'js/chat/plugins/chatNotifications.js', n: 'chatnotifications_js', j:1, w:7});
        jsl.push({f:'js/chat/plugins/callFeedback.js', n: 'callfeedback_js', j:1, w:7});

        jsl.push({f:'js/chat/karereEventObjects.js', n: 'keo_js', j:1, w:7});
        jsl.push({f:'js/connectionRetryManager.js', n: 'crm_js', j:1, w:7});
        jsl.push({f:'js/chat/karere.js', n: 'karere_js', j:1, w:7});
        jsl.push({f:'js/chat/messages.js', n: 'chat_messages_Js', j:1, w:1});
        jsl.push({f:'js/chat/bundle.js', n: 'chat_react_minified_js', j:1, w:10});
    }
    // END OF MEGA CHAT

    jsl.push({f:'js/fm.js', n: 'fm_js', j:1,w:12});
    jsl.push({f:'js/filetypes.js', n: 'filetypes_js', j:1});
    jsl.push({f:'js/ui/miniui.js', n: 'miniui_js', j:1});

    // Transfers
    jsl.push({f:'js/xhr2.js', n: 'xhr_js', j:1});
    jsl.push({f:'js/queue.js', n: 'queue', j:1,w:4});
    jsl.push({f:'js/downloadChrome.js', n: 'dl_chrome', j:1,w:3});
    if (is_chrome_firefox && parseInt(Services.appinfo.version) > 27)
    {
        is_chrome_firefox |= 4;
        jsl.push({f:'js/downloadFirefox.js', n: 'dl_firefox', j:1,w:3});
    }
    else
    {
        jsl.push({f:'js/downloadMemory.js', n: 'dl_memory', j:1,w:3});
        jsl.push({f:'js/downloadFlash.js', n: 'dl_flash', j:1,w:3});
    }
    jsl.push({f:'js/downloader.js', n: 'dl_downloader', j:1,w:3});
    jsl.push({f:'js/download2.js', n: 'dl_js', j:1,w:3});
    jsl.push({f:'js/upload2.js', n: 'upload_js', j:1,w:2});

    // Everything else...
    jsl.push({f:'index.js', n: 'index', j:1,w:4});
    jsl.push({f:'html/start.html', n: 'start', j:0});
    jsl.push({f:'html/megainfo.html', n: 'megainfo', j:0});
    jsl.push({f:'html/js/start.js', n: 'start_js', j:1});
    jsl.push({f:'html/bottom2.html', n: 'bottom2',j:0});
    jsl.push({f:'html/key.html', n: 'key', j:0});
    jsl.push({f:'html/js/key.js', n: 'key_js', j:1});
    jsl.push({f:'html/pro.html', n: 'pro', j:0});
    jsl.push({f:'html/js/pro.js', n: 'pro_js', j:1});
    jsl.push({f:'html/login.html', n: 'login', j:0});
    jsl.push({f:'html/js/login.js', n: 'login_js', j:1});
    jsl.push({f:'html/fm.html', n: 'fm', j:0,w:3});
    jsl.push({f:'html/top.html', n: 'top', j:0});
    jsl.push({f:'html/top-login.html', n: 'top-login', j:0});
    jsl.push({f:'js/notify.js', n: 'notify_js', j:1});
    jsl.push({f:'js/popunda.js', n: 'popunda_js', j:1});
    jsl.push({f:'css/style.css', n: 'style_css', j:2,w:30,c:1,d:1,cache:1});
    jsl.push({f:'css/user-card.css', n: 'user_card_css', j:2,w:5,c:1,d:1,cache:1});
    jsl.push({f:'css/avatars.css', n: 'avatars_css', j:2,w:5,c:1,d:1,cache:1});
    jsl.push({f:'css/icons.css', n: 'icons_css', j:2,w:5,c:1,d:1,cache:1});
    jsl.push({f:'css/buttons.css', n: 'buttons_css', j:2,w:5,c:1,d:1,cache:1});
    jsl.push({f:'css/dropdowns.css', n: 'dropdowns_css', j:2,w:5,c:1,d:1,cache:1});
    jsl.push({f:'css/dialogs.css', n: 'dialogs_css', j:2,w:5,c:1,d:1,cache:1});
    jsl.push({f:'css/popups.css', n: 'popups_css', j:2,w:5,c:1,d:1,cache:1});
    jsl.push({f:'css/spinners.css', n: 'spinners_css', j:2,w:5,c:1,d:1,cache:1});
    jsl.push({f:'css/data-blocks-view.css', n: 'data_blocks_view_css', j:2,w:5,c:1,d:1,cache:1});
    jsl.push({f:'css/chat-messages.css', n: 'chat_messages_css', j:2,w:5,c:1,d:1,cache:1});
    jsl.push({f:'css/chat-share-links.css', n: 'chat_share_links_css', j:2,w:5,c:1,d:1,cache:1});
    jsl.push({f:'css/chat-textarea.css', n: 'chat_textarea_css', j:2,w:5,c:1,d:1,cache:1});
    jsl.push({f:'css/chat-typing.css', n: 'chat_typing_css', j:2,w:5,c:1,d:1,cache:1});
    jsl.push({f:'css/chat-left-pane.css', n: 'chat_left_pane_css', j:2,w:5,c:1,d:1,cache:1});
    jsl.push({f:'css/chat-feedback.css', n: 'chat_feedback_css', j:2,w:5,c:1,d:1,cache:1});
    jsl.push({f:'css/chat-calls.css', n: 'chat_calls_css', j:2,w:5,c:1,d:1,cache:1});
    jsl.push({f:'css/chat-common.css', n: 'chat_common_css', j:2,w:5,c:1,d:1,cache:1});
    jsl.push({f:'css/chat-emojione.css', n: 'chat_emojione_css', j:2,w:5,c:1,d:1,cache:1});
    jsl.push({f:'css/retina-images.css', n: 'retina_images_css', j:2,w:5,c:1,d:1,cache:1});
    jsl.push({f:'css/media-print.css', n: 'media_print_css', j:2,w:5,c:1,d:1,cache:1});
    jsl.push({f:'js/useravatar.js', n: 'contact_avatar_js', j:1,w:3});
    jsl.push({f:'js/vendor/avatar.js', n: 'avatar_js', j:1, w:3});
    jsl.push({f:'js/countries.js', n: 'countries_js', j:1});
    jsl.push({f:'html/dialogs.html', n: 'dialogs', j:0,w:2});
    jsl.push({f:'html/transferwidget.html', n: 'transferwidget', j:0});
    jsl.push({f:'js/vendor/int64.js', n: 'int64_js', j:1});
    jsl.push({f:'js/zip64.js', n: 'zip_js', j:1});
    jsl.push({f:'js/cms.js', n: 'cms_js', j:1});

    if (localStorage.enableDevtools) {
        jsl.push({f:'dont-deploy/transcripter/exporter.js', n: 'tse_js', j:1});
    }

    // We need to keep a consistent order in loaded resources, so that if users
    // send us logs we won't get different line numbers on stack-traces from
    // different browsers. Hence, do NOT add more jsl entries after this block,
    // unless they're optional (such as polyfills) or third-party resources.

    jsl.push({f:'js/jquery.protect.js', n: 'jqueryprotect_js', j: 1});
    jsl.push({f:'js/vendor/asmcrypto.js',n:'asmcrypto_js', j:1, w:5});

    if (is_extension) {
        jsl.push({f:'js/vendor/dcraw.js', n: 'dcraw_js', j:1, w:10});
    }
    if (
        typeof Number.isNaN !== 'function' ||
        typeof Set === 'undefined'
    ) {

        jsl.push({f:'js/vendor/es6-shim.js', n: 'es6shim_js', j:1});
    }

    // only used on beta
    if (onBetaW) {
        jsl.push({f: 'js/betacrashes.js', n: 'betacrashes_js', j: 1});
    }

    var jsl2 =
    {
        'about': {f:'html/about.html', n: 'about', j:0},
        'sourcecode': {f:'html/sourcecode.html', n: 'sourcecode', j:0},
        'megasync_js': {f:'html/js/megasync.js', n: 'megasync_js', j:1},
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
        'disputenotice_js': {f:'html/js/disputenotice.js', n: 'disputenotice_js', j:1},
        'copyright': {f:'html/copyright.html', n: 'copyright', j:0},
        'copyrightnotice': {f:'html/copyrightnotice.html', n: 'copyrightnotice', j:0},
        'copyrightnotice_js': {f:'html/js/copyrightnotice.js', n: 'copyrightnotice_js', j:1},
        'privacy': {f:'html/privacy.html', n: 'privacy', j:0},
        'mega': {f:'html/mega.html', n: 'mega', j:0},
        'terms': {f:'html/terms.html', n: 'terms', j:0},
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
        'help_js': {f:'html/js/help.js', n: 'help_js', j:1},
        'sync': {f:'html/sync.html', n: 'sync', j:0},
        'sync_js': {f:'html/js/sync.js', n: 'sync_js', j:1},
        'cms_snapshot_js': {f:'js/cmsSnapshot.js', n: 'cms_snapshot_js', j:1},
        'mobile': {f:'html/mobile.html', n: 'mobile', j:0},
        'support_js': {f:'html/js/support.js', n: 'support_js', j:1},
        'support': {f:'html/support.html', n: 'support', j:0},
        'contact': {f:'html/contact.html', n: 'contact', j:0},
        'privacycompany': {f:'html/privacycompany.html', n: 'privacycompany', j:0},
        'zxcvbn_js': {f:'js/vendor/zxcvbn.js', n: 'zxcvbn_js', j:1},
        'redeem': {f:'html/redeem.html', n: 'redeem', j:0},
        'redeem_js': {f:'html/js/redeem.js', n: 'redeem_js', j:1},
        'chrome': {f:'html/chrome.html', n: 'chrome', j:0},
        'chrome_js': {f:'html/js/chrome.js', n: 'chrome_js', j:1},
        'firefox': {f:'html/firefox.html', n: 'firefox', j:0},
        'firefox_js': {f:'html/js/firefox.js', n: 'firefox_js', j:1}
    };

    var subpages =
    {
        'about': ['about'],
        'sourcecode': ['sourcecode'],
        'terms': ['terms'],
        'credits': ['credits'],
        'backup': ['backup','backup_js','filesaver'],
        'recovery': ['recovery','recovery_js'],
        'reset': ['reset','reset_js'],
        'verify': ['change_email', 'change_email_js'],
        'cancel': ['cancel', 'cancel_js'],
        'blog': ['blog','blog_js','blogarticle','blogarticle_js'],
        'register': ['register','register_js', 'zxcvbn_js'],
        'newsignup': ['register','register_js', 'zxcvbn_js'],
        'android': ['android'],
        'resellers': ['resellers'],
        '!': ['download','download_js', 'megasync_js'],
        'dispute': ['dispute'],
        'disputenotice': ['disputenotice', 'disputenotice_js'],
        'copyright': ['copyright'],
        'copyrightnotice': ['copyrightnotice','copyrightnotice_js'],
        'privacy': ['privacy','privacycompany'],
        'mega': ['mega'],
        'takedown': ['takedown'],
        'mobile': ['mobile'],
        'sync': ['sync','sync_js', 'megasync_js'],
        'support': ['support_js', 'support'],
        'contact': ['contact'],
        'dev': ['dev','dev_js','sdkterms'],
        'sdk': ['dev','dev_js','sdkterms'],
        'doc': ['dev','dev_js','sdkterms'],
        'help': ['help_js'],
        'recover': ['reset', 'reset_js'],
        'redeem': ['redeem', 'redeem_js'],
        'plugin': ['chrome', 'chrome_js', 'firefox', 'firefox_js'],
        'chrome': ['chrome', 'chrome_js'],
        'firefox': ['firefox', 'firefox_js']
    };

    if (page)
    {
        if (page.indexOf('%25') !== -1)
        {
            do {
                page = page.replace(/%25/g, '%');
            } while (~page.indexOf('%25'));
        }
        if (page.indexOf('%21') !== -1)
        {
            page = page.replace(/%21/g, '!');
            document.location.hash = page;
        }

        page = page.replace('#','');
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
        if (window.URL) evalscript_url([asmCryptoSha256Js]);
        else evalscript(asmCryptoSha256Js);
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
                if (--waitingToBeLoaded == 0) {
                    jj_done = true;
                    boot_done();
                    _queueWaitToBeLoaded = createScriptTag = createStyleTag = undefined;
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

        l=[];
        var i = 3000, r = '?r=' + (new Date().toISOString().replace(/[^\w]/g,''));
        if (!localStorage.jjnocache) r = '';
        while (i--) l[i]='l';
        for (var i in jsl)
        {
            if (jsl[i].j === 1) {
                createScriptTag("jsl" + i, bootstaticpath + jsl[i].f + r);
            }
            else if (jsl[i].j === 2)
            {
                if ((m && (jsl[i].m)) || ((!m) && (jsl[i].d))) {
                    createStyleTag("jsl" + i, bootstaticpath + jsl[i].f + r);
                }
            }
        }
        if (d) console.log('jj.total...', waitingToBeLoaded);
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
        for (var i = jsl.length; i--;) {
            if (jsl[i] && !jsl[i].text) {
                jsl_total += jsl[i].w || 1;
            }
        }
        if (fx_startup_cache)
        {
            var step = function(jsi)
            {
                jsl_current += jsl[jsi].w || 1;
                jsl_progress();
                if (++jslcomplete == jsl.length) initall();
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
                    var ch = NetUtil.newChannel(file);
                    ch.contentType = jsl[jsi].j == 3
                        ? "application/json":"text/plain";

                    NetUtil.asyncFetch(ch, function(is, s)
                    {
                        if (!Components.isSuccessCode(s))
                        {
                            siteLoadError(2, file);
                        }
                        else
                        {
                            jsl[jsi].text = NetUtil.readInputStreamToString(is, is.available());
                            if (jsl[jsi].j == 3) l = JSON.parse(jsl[jsi].text);
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
        if (d && jj) {
            if (jsl[jsi].j == 1 || jsl[jsi].j == 2) {
                // DON'T load via XHR any js or css files...since when jj == 1, secureboot will append them in the doc.

                jsl_current += jsl[jsi].w || 1;
                jsl_progress();
                if (++jslcomplete == jsl.length) initall();
                else jsl_load(xhri);

                return;
            }
        }
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
            if (is_chrome_firefox) xhr_stack[xhri].overrideMimeType('text/plain');
            xhr_stack[xhri].send(null);
        }
    }
    window.onload = function ()
    {
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
    var jsl_loaded={};
    function initall()
    {
        var jsar = [];
        var cssar = [];
        //for(var i in localStorage) if (i.substr(0,6) == 'cache!') delete localStorage[i];
        for (var i in jsl)
        {
            jsl_loaded[jsl[i].n]=1;
            if ((jsl[i].j == 1) && (!jj))
            {
                if (!fx_startup_cache)
                {
                    if (window.URL) jsar.push(jsl[i].text + '\n\n');
                    else evalscript(jsl[i].text);
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
        }
        if (window.URL)
        {
            cssar = cssar.length && mObjectURL(cssar, "text/css");
            if (cssar)
            {
                mCreateElement('link', {type: 'text/css', rel: 'stylesheet'}, 'head').href = cssar;
            }
            if (!jsl_done || jsar.length) {
                jsar.push('jsl_done=true; boot_done();');
            } else {
                boot_done();
            }
            if (jsar.length) evalscript_url(jsar);
            jsar=undefined;
            cssar=undefined;
        }
        else
        {
            jsl_done=true;
            boot_done();
        }
        jj = 0; //prevent further 'silent_loading' loads from failing..
    }

    if (ua.indexOf('android') > 0 && !sessionStorage.androidsplash && document.location.hash.indexOf('#confirm') == -1)
    {
        if (document.location.hash == '#android')
        {
            document.location = 'https://play.google.com/store/apps/details?id=mega.privacy.android.app&referrer=meganzindexandroid';
        }
        else
        {
            // AMO Warning: Use of `document.write` strongly discouraged -- This isnt reached for the extension, anyway
            document.write('<link rel="stylesheet" type="text/css" href="' + staticpath + 'css/mobile-android.css" /><div class="overlay"></div><div class="new-folder-popup" id="message"><div class="new-folder-popup-bg"><div class="new-folder-header">MEGA for Android</div><div class="new-folder-main-bg"><div class="new-folder-descr">Do you want to install the latest<br/> version of the MEGA app for Android?</div><a class="new-folder-input left-button" id="trashbinYes"> <span class="new-folder-bg1"> <span class="new-folder-bg2" id="android_yes"> Yes </span> </span></a><a class="new-folder-input right-button" id="trashbinNo"> <span class="new-folder-bg1"> <span class="new-folder-bg2" id="android_no">No </span> </span></a><div class="clear"></div></div></div></div></div>');
            document.getElementById('android_yes').addEventListener("click", function ()
            {
                document.location = 'https://play.google.com/store/apps/details?id=mega.privacy.android.app&referrer=meganzandroid';
            }, false);
            document.getElementById('android_no').addEventListener("click", function ()
            {
                sessionStorage.androidsplash=1;
                document.location.reload();
            }, false);
            androidsplash=true;
        }
    }
    else
    {
        var istaticpath = staticpath;
        if (document.location.href.substr(0,19) == 'chrome-extension://')  istaticpath = '../';
        else if (is_chrome_firefox) istaticpath = 'chrome://mega/content/';

        mCreateElement('style', {type: 'text/css'}, 'body').textContent = '.div, span, input {outline: none;}.hidden {display: none;}.clear {clear: both;margin: 0px;padding: 0px;display: block;}.loading-main-block {width: 100%;height: 100%;overflow: auto;font-family:Arial, Helvetica, sans-serif;}.loading-mid-white-block {height: 100%;width:100%;}.loading-cloud {width: 222px;height: 158px;background-image: url(' + istaticpath + 'images/mega/loading-sprite_v2.png);background-repeat: no-repeat;background-position: 0 0;position:absolute;left:50%;top:50%;margin:-79px 0 0 -111px;}.loading-m-block{width:60px;height:60px;position:absolute; left:81px;top:65px;background-color:white;background-image: url(' + istaticpath + 'images/mega/loading-sprite_v2.png);background-repeat: no-repeat;background-position: -81px -65px;border-radius: 100%;-webkit-border-radius: 100%;border-radius: 100%;z-index:10;}.loading-percentage { width: 80px;height: 80px;position: absolute;-moz-border-radius: 100%;-webkit-border-radius: 100%;border-radius: 100%;overflow: hidden;background-image: url(' + istaticpath + 'images/mega/loading-sprite_v2.png);background-repeat: no-repeat;background-position: -70px -185px;left:71px;top:55px;}.loading-percentage ul {list-style-type: none;}.loading-percentage li {position: absolute;top: 0px;}.loading-percentage p, .loading-percentage li, .loading-percentage ul{width: 80px;height: 80px;padding: 0;margin: 0;}.loading-percentage span {display: block;width: 40px;height: 80px;}.loading-percentage ul :nth-child(odd) {clip: rect(0px, 80px, 80px, 40px);}.loading-percentage ul :nth-child(even) {clip: rect(0px, 40px, 80px, 0px);}.loading-percentage .right-c span {-moz-border-radius-topleft: 40px;-moz-border-radius-bottomleft: 40px;-webkit-border-top-left-radius: 40px;-webkit-border-bottom-left-radius: 40px;border-top-left-radius: 40px;border-bottom-left-radius: 40px;background-color:#dc0000;}.loading-percentage .left-c span {margin-left: 40px;-moz-border-radius-topright: 40px;-moz-border-radius-bottomright: 40px;-webkit-border-top-right-radius: 40px;-webkit-border-bottom-right-radius: 40px;border-top-right-radius: 40px;border-bottom-right-radius: 40px;background-color:#dc0000;}.loading-main-bottom {max-width: 940px;width: 100%;position: absolute;bottom: 20px;left: 50%;margin: 0 0 0 -470px;text-align: center;}.loading-bottom-button {height: 29px;width: 29px;float: left;background-image: url(' + istaticpath + 'images/mega/loading-sprite_v2.png);background-repeat: no-repeat;cursor: pointer;}.st-social-block-load {position: absolute;bottom: 20px;left: 0;width: 100%;height: 43px;text-align: center;}.st-bottom-button {height: 29px;width: 29px;display: inline-block;background-image: url(' + istaticpath + 'images/mega/loading-sprite_v2.png);background-repeat: no-repeat;cursor: pointer;}.st-bottom-button.st-google-button {background-position: -94px -468px;position: relative;margin: 0 5px;}.st-bottom-button.st-google-button:hover {background-position: -94px -408px;}.st-bottom-button.st-facebook-button {background-position: -49px -468px;margin: 0 5px;}.st-bottom-button.st-facebook-button:hover {background-position: -49px -408px;}.st-bottom-button.st-twitter-button {background-position: left -468px;margin: 0 5px;}.st-bottom-button.st-twitter-button:hover {    background-position: left -408px;}@media only screen and (-webkit-min-device-pixel-ratio: 1.5), only screen and (-o-min-device-pixel-ratio: 3/2), only screen and (min--moz-device-pixel-ratio: 1.5), only screen and (min-device-pixel-ratio: 1.5) {.maintance-block, .loading-percentage, .loading-m-block, .loading-cloud, .loading-bottom-button,.st-bottom-button, .st-bottom-scroll-button {background-image: url(' + istaticpath + 'images/mega/loading-sprite_v2@2x.png);    background-size: 222px auto;}}';

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
                '        <a href="https://www.facebook.com/MEGAprivacy" target="_blank" class="st-bottom-button st-facebook-button"></a>'+
                '        <a href="https://www.twitter.com/MEGAprivacy" target="_blank" class="st-bottom-button st-twitter-button"></a>'+
                '    <a href="https://plus.google.com/b/108055545377490138410/" target="_blank" class="st-bottom-button st-google-button"></a>'+
                '    </div>'+
                '</div>';
    }
    var u_storage, loginresponse, u_sid, dl_res;
    u_storage = init_storage( localStorage.sid ? localStorage : sessionStorage );
    
    if ((u_sid = u_storage.sid))
    {
        loginresponse = true;
        var lxhr = getxhr();
        lxhr.onload = function()
        {
            loginresponse = false;
            if (this.status == 200)
            {
                try
                {
                    loginresponse = this.response || this.responseText;
                    if (loginresponse && loginresponse[0] == '[') loginresponse = JSON.parse(loginresponse);
                    else if (parseInt(loginresponse) === -15 /* ESID */) {
                        loginresponse = -15;
                    }
                    else loginresponse = false;
                }
                catch (e) {}
            }
            boot_done();
        };
        lxhr.onerror = function()
        {
            loginresponse= false;
            boot_done();
        };

        lxhr.open('POST', apipath + 'cs?id=0&sid=' + u_storage.sid + mega.urlParams(), true);
        lxhr.send(JSON.stringify([{'a':'ug'}]));
    }
    
    function boot_auth(u_ctx,r)
    {
        u_type = r;
        u_checked=true;
        startMega();
    }
    function boot_done()
    {
        lxhr = dlxhr = undefined;

        if (d) console.log('boot_done', loginresponse === true, dl_res === true, !jsl_done, !jj_done);

        if (loginresponse === true || dl_res === true || !jsl_done || !jj_done) return;

        // turn the `ua` (userAgent) string into an object which holds the browser details
        try {
            ua = Object(ua);
            ua.details = Object.create(browserdetails(ua));
        }
        catch (e) {}

        if (u_checked) startMega();
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
    if (page.substr(0,1) == '!' && page.length > 1)
    {
        dl_res = true;
        var dlxhr = getxhr();
        dlxhr.onload = function()
        {
            dl_res = false;
            if (this.status == 200)
            {
                try
                {
                    dl_res = this.response || this.responseText;
                    if (dl_res[0] == '[') dl_res = JSON.parse(dl_res);
                    if (dl_res[0]) dl_res = dl_res[0];
                }
                catch (e) {}
            }
            boot_done();
        };
        dlxhr.onerror = function()
        {
            dl_res= false;
            boot_done();
        };

        dlxhr.open("POST", apipath + 'cs?id=0' + mega.urlParams(), true);
        dlxhr.send(JSON.stringify([{ 'a': 'g', p: page.substr(1,8), 'ad': showAd() }]));
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

function safeCall(fn)
{
    fn.foo = function __safeCallWrapper()
    {
        try {
            return fn.apply(this, arguments);
        } catch (e) {
            console.error(e);
        }
    };
    fn.foo.bar = fn;
    return fn.foo;
}
