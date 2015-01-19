var b_u=0;
var maintenance=false;
var ua = window.navigator.userAgent.toLowerCase();
var is_chrome_firefox = document.location.protocol === 'chrome:' && document.location.host === 'mega' || document.location.protocol === 'mega:';
var is_extension = is_chrome_firefox || document.location.href.substr(0,19) == 'chrome-extension://';
var storage_version = '1'; // clear localStorage when version doesn't match
var page = document.location.hash;

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
					return 'https://g.cdn1.mega.co.nz/';
			}
		} catch(e) {
			setTimeout(function() { throw e; }, 2100);
		}
	}
	return 'https://eu.static.mega.co.nz/';
}

if (ua.indexOf('chrome') > -1 && ua.indexOf('mobile') == -1 && parseInt(window.navigator.appVersion.match(/Chrome\/(\d+)\./)[1], 10) < 22) b_u = 1;
else if (ua.indexOf('firefox') > -1 && typeof DataView == 'undefined') b_u = 1;
else if (ua.indexOf('opera') > -1 && typeof window.webkitRequestFileSystem == 'undefined') b_u = 1;
var apipath, staticpath = 'https://eu.static.mega.co.nz/';
var myURL = window.URL || window.webkitURL;
if (!myURL) b_u=1;

if (!b_u) try
{
	if (is_chrome_firefox)
	{
		var Cc = Components.classes, Ci = Components.interfaces, Cu = Components.utils;

		Cu['import']("resource://gre/modules/XPCOMUtils.jsm");
		Cu['import']("resource://gre/modules/Services.jsm");
		XPCOMUtils.defineLazyModuleGetter(this, "NetUtil", "resource://gre/modules/NetUtil.jsm");

		(function(global) {
			global.loadSubScript = function(file,scope) {
				if (global.d) {
					Services.scriptloader.loadSubScriptWithOptions(file,{
						target : scope||global, charset: "UTF-8",
						ignoreCache : true
					});
				} else {
					Services.scriptloader.loadSubScript(file,scope||global);
				}
			};
		})(this);

		try {
			var mozBrowserID =
			[	Services.appinfo.name,
				Services.appinfo.platformVersion,
				Services.appinfo.platformBuildID,
				Services.appinfo.OS,
				Services.appinfo.XPCOMABI].join(" ");
		} catch(e) {
			var mozBrowserID = ua;
		}

		loadSubScript('chrome://mega/content/strg2.js');

		if(!(localStorage instanceof Ci.nsIDOMStorage)) {
			throw new Error('Invalid DOM Storage instance.');
		}
		var d = !!localStorage.d;
	}
	if (typeof localStorage == 'undefined') b_u = 1;
	else
	{
		var contenterror = 0;
		var nocontentcheck = !!localStorage.dd;
		if (localStorage.dd) {
 			var devhost = window.location.host;
			// handle subdirs
			var pathSuffix = window.location.pathname;
			pathSuffix = pathSuffix.split("/").slice(0,-1).join("/");
			// set the staticpath for debug mode
			localStorage.staticpath = window.location.protocol + "//" + devhost + pathSuffix + "/";
			// localStorage.staticpath = location.protocol + "//" + location.host + location.pathname.replace(/[^/]+$/,'');
		}
		staticpath = localStorage.staticpath || geoStaticpath();
		apipath = localStorage.apipath || 'https://eu.api.mega.co.nz/';
	}
}
catch(e)
{
	alert(
		"Sorry, we were unable to initialize the browser's local storage, "+
		"either you're using an outdated browser or it's something from our side.\n"+
		"\n"+
		"If you think it's our fault, please report the issue back to us.\n"+
		"\n"+
		"Reason: " + (e.message || e)+
		"\nBrowser: " + (typeof mozBrowserID !== 'undefined' ? mozBrowserID : ua)
	);
	b_u = 1;
}

var bootstaticpath = staticpath;
var urlrootfile = '';

if (!b_u && is_extension)
{
	nocontentcheck=true;

	if (is_chrome_firefox)
	{
		bootstaticpath = 'chrome://mega/content/';
		urlrootfile = 'secure.html';
		if (d) staticpath = bootstaticpath;
		  else staticpath = 'https://eu.static.mega.co.nz/';
		try {
			loadSubScript(bootstaticpath + 'fileapi.js');
		} catch(e) {
			b_u = 1;
			Cu.reportError(e);
			alert('Unable to initialize core functionality:\n\n' + e + '\n\n' + mozBrowserID);
		}
	}
	else /* Google Chrome */
	{
		bootstaticpath = chrome.extension.getURL("mega/");
		urlrootfile = 'mega/secure.html';
	}

	Object.defineProperty(window, 'eval', {
		value : function eval(code) {
			throw new Error('Unsafe eval is not allowed, code: ' + String(code).replace(/\s+/g,' ').substr(0,60) + '...');
		}
	});
}

if (b_u) document.location = 'update.html';

window.URL = window.URL || window.webkitURL;

var ln ={}; ln.en = 'English'; ln.cn = '简体中文';  ln.ct = '中文繁體'; ln.ru = 'Pусский'; ln.es = 'Español'; ln.fr = 'Français'; ln.de = 'Deutsch'; ln.it = 'Italiano'; ln.br = 'Português Brasil'; ln.mi = 'Māori'; ln.vn = 'Tiếng Việt'; ln.nl = 'Nederlands'; ln.kr = '한국어';   ln.ar = 'العربية'; ln.jp = '日本語'; ln.pt = 'Português'; ln.he = 'עברית'; ln.pl = 'Polski'; ln.ca = 'Català'; ln.eu = 'Euskara'; ln.sk = 'Slovenský'; ln.af = 'Afrikaans'; ln.cz = 'Čeština'; ln.ro = 'Română'; ln.fi = 'Suomi'; ln.no = 'Norsk'; ln.se = 'Svenska'; ln.bs = 'Bosanski'; ln.hu = 'Magyar'; ln.sr = 'српски'; ln.dk = 'Dansk'; ln.sl = 'Slovenščina'; ln.tr = 'Türkçe';  ln.id = 'Bahasa Indonesia';  ln.hr = 'Hrvatski';  ln.el = 'ελληνικά'; ln.uk = 'Українська'; ln.gl = 'Galego'; ln.sr = 'српски'; ln.lt = 'Lietuvos'; ln.th = 'ภาษาไทย'; ln.lv = 'Latviešu'; ln.bg = 'български';  ln.mk = 'македонски'; ln.hi = 'हिंदी'; ln.fa = 'فارسی '; ln.ee = 'Eesti'; ln.ms = 'Bahasa Malaysia'; ln.cy = 'Cymraeg'; ln.be = 'Breton'; ln.tl = 'Tagalog'; ln.ka = 'ქართული';

var ln2 ={}; ln2.en = 'English'; ln2.cn = 'Chinese';  ln2.ct = 'Traditional Chinese'; ln2.ru = 'Russian'; ln2.es = 'Spanish'; ln2.fr = 'French'; ln2.de = 'German'; ln2.it = 'Italian'; ln2.br = 'Brazilian Portuguese'; ln2.mi = 'Maori'; ln2.vn = 'Vietnamese'; ln2.nl = 'Dutch'; ln2.kr = 'Korean';   ln2.ar = 'Arabic'; ln2.jp = 'Japanese'; ln2.pt = 'Portuguese'; ln2.he = 'Hebrew'; ln2.pl = 'Polish'; ln2.ca = 'Catalan'; ln2.eu = 'Basque'; ln2.sk = 'Slovak'; ln2.af = 'Afrikaans'; ln2.cz = 'Czech'; ln2.ro = 'Romanian'; ln2.fi = 'Finnish'; ln2.no = 'Norwegian'; ln2.se = 'Swedish'; ln2.bs = 'Bosnian'; ln2.hu = 'Hungarian'; ln2.sr = 'Serbian'; ln2.dk = 'Danish'; ln2.sl = 'Slovenian'; ln2.tr = 'Turkish'; ln2.id = 'Indonesian'; ln2.hr = 'Croatian'; ln2.el = 'Greek'; ln2.uk = 'Ukrainian'; ln2.gl = 'Galician'; ln2.sr = 'Serbian'; ln2.lt = 'Lithuanian'; ln2.th = 'Thai'; ln2.lv = 'Latvian'; ln2.bg = 'Bulgarian'; ln2.mk = 'Macedonian'; ln2.hi = 'Hindi'; ln2.fa = 'Farsi'; ln2.ee = 'Estonian';  ln2.ms = 'Malaysian'; ln2.cy = 'Welsh'; ln2.be = 'Breton'; ln2.tl = 'Tagalog'; ln2.ka = 'Georgian';

var sjcl_sha_js = 'var sjcl_sha={cipher:{},hash:{},keyexchange:{},mode:{},misc:{},codec:{},exception:{corrupt:function(a){this.toString=function(){return"CORRUPT: "+this.message};this.message=a},invalid:function(a){this.toString=function(){return"INVALID: "+this.message};this.message=a},bug:function(a){this.toString=function(){return"BUG: "+this.message};this.message=a},notReady:function(a){this.toString=function(){return"NOT READY: "+this.message};this.message=a}}};if(typeof module!="undefined"&&module.exports)module.exports=sjcl_sha;sjcl_sha.bitArray={bitSlice:function(a,b,c){a=sjcl_sha.bitArray.g(a.slice(b/32),32-(b&31)).slice(1);return c===undefined?a:sjcl_sha.bitArray.clamp(a,c-b)},extract:function(a,b,c){var d=Math.floor(-b-c&31);return((b+c-1^b)&-32?a[b/32|0]<<32-d^a[b/32+1|0]>>>d:a[b/32|0]>>>d)&(1<<c)-1},concat:function(a,b){if(a.length===0||b.length===0)return a.concat(b);var c=a[a.length-1],d=sjcl_sha.bitArray.getPartial(c);return d===32?a.concat(b):sjcl_sha.bitArray.g(b,d,c|0,a.slice(0,a.length-1))},bitLength:function(a){var b=a.length;if(b===0)return 0;return(b-1)*32+sjcl_sha.bitArray.getPartial(a[b-1])},clamp:function(a,b){if(a.length*32<b)return a;a=a.slice(0,Math.ceil(b/32));var c=a.length;b&=31;if(c>0&&b)a[c-1]=sjcl_sha.bitArray.partial(b,a[c-1]&2147483648>>b-1,1);return a},partial:function(a,b,c){if(a===32)return b;return(c?b|0:b<<32-a)+a*0x10000000000},getPartial:function(a){return Math.round(a/0x10000000000)||32},equal:function(a,b){if(sjcl_sha.bitArray.bitLength(a)!==sjcl_sha.bitArray.bitLength(b))return false;var c=0,d;for(d=0;d<a.length;d++)c|=a[d]^b[d];return c===0},g:function(a,b,c,d){var e;e=0;if(d===undefined)d=[];for(;b>=32;b-=32){d.push(c);c=0}if(b===0)return d.concat(a);for(e=0;e<a.length;e++){d.push(c|a[e]>>>b);c=a[e]<<32-b}e=a.length?a[a.length-1]:0;a=sjcl_sha.bitArray.getPartial(e);d.push(sjcl_sha.bitArray.partial(b+a&31,b+a>32?c:d.pop(),1));return d},i:function(a,b){return[a[0]^b[0],a[1]^b[1],a[2]^b[2],a[3]^b[3]]}};sjcl_sha.codec.utf8String={fromBits:function(a){var b="",c=sjcl_sha.bitArray.bitLength(a),d,e;for(d=0;d<c/8;d++){if((d&3)===0)e=a[d/4];b+=String.fromCharCode(e>>>24);e<<=8}return decodeURIComponent(escape(b))},toBits:function(a){var b=[],c,d=0,e;for(c=0;c<a.length;c++){e=a.charCodeAt(c);if(e&-256)return false;d=d<<8|e;if((c&3)===3){b.push(d);d=0}}c&3&&b.push(sjcl_sha.bitArray.partial(8*(c&3),d));return b}};sjcl_sha.hash.sha256=function(a){this.d[0]||this.h();if(a){this.c=a.c.slice(0);this.b=a.b.slice(0);this.a=a.a}else this.reset()};sjcl_sha.hash.sha256.hash=function(a){return(new sjcl_sha.hash.sha256).update(a).finalize()};sjcl_sha.hash.sha256.prototype={blockSize:512,reset:function(){this.c=this.f.slice(0);this.b=[];this.a=0;return this},update:function(a){if(typeof a==="string"&&!(a=sjcl_sha.codec.utf8String.toBits(a)))return[];var b,c=this.b=sjcl_sha.bitArray.concat(this.b,a);b=this.a;a=this.a=b+sjcl_sha.bitArray.bitLength(a);for(b=512+b&-512;b<=a;b+=512)this.e(c.splice(0,16));return this},finalize:function(){var a,b=this.b,c=this.c;b=sjcl_sha.bitArray.concat(b,[sjcl_sha.bitArray.partial(1,1)]);for(a=b.length+2;a&15;a++)b.push(0);b.push(Math.floor(this.a/4294967296));for(b.push(this.a|0);b.length;)this.e(b.splice(0,16));this.reset();return c},f:[],d:[],h:function(){function a(e){return(e-Math.floor(e))*0x100000000|0}var b=0,c=2,d;a:for(;b<64;c++){for(d=2;d*d<=c;d++)if(c%d===0)continue a;if(b<8)this.f[b]=a(Math.pow(c,0.5));this.d[b]=a(Math.pow(c,1/3));b++}},e:function(a){var b,c,d=a.slice(0),e=this.c,n=this.d,l=e[0],f=e[1],h=e[2],j=e[3],g=e[4],k=e[5],i=e[6],m=e[7];for(a=0;a<64;a++){if(a<16)b=d[a];else{b=d[a+1&15];c=d[a+14&15];b=d[a&15]=(b>>>7^b>>>18^b>>>3^b<<25^b<<14)+(c>>>17^c>>>19^c>>>10^c<<15^c<<13)+d[a&15]+d[a+9&15]|0}b=b+m+(g>>>6^g>>>11^g>>>25^g<<26^g<<21^g<<7)+(i^g&(k^i))+n[a];m=i;i=k;k=g;g=j+b|0;j=h;h=f;f=l;l=b+(f&h^j&(f^h))+(f>>>2^f>>>13^f>>>22^f<<30^f<<19^f<<10)|0}e[0]=e[0]+l|0;e[1]=e[1]+f|0;e[2]=e[2]+h|0;e[3]=e[3]+j|0;e[4]=e[4]+g|0;e[5]=e[5]+k|0;e[6]=e[6]+i|0;e[7]=e[7]+m|0}}; function sha256(d) { h = new sjcl_sha.hash.sha256(); for (var i = 0; i < d.length; i += 131072) h = h.update(d.substr(i,131072)); return h.finalize(); }';

function evalscript(text)
{
    var script = document.createElement('script');
    script.type = "text/javascript";
    document.getElementsByTagName('head')[0].appendChild(script);
    script.text = text;
}

function evalscript_url(jarray)
{
    try
    {
        var blob = new Blob(jarray, { type: "text/javascript" });
    }
    catch(e)
    {
        window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder || window.MSBlobBuilder;
        var bb = new BlobBuilder();
        for (var i in jarray) bb.append(jarray[i]);
        var blob = bb.getBlob('text/javascript');
    }
    var script = document.createElement('script');
    script.type = "text/javascript";
    document.getElementsByTagName('head')[0].appendChild(script);
    var url = window.URL.createObjectURL(blob);
    script.src = url;
    return url;
}

if (!nocontentcheck)
{
    if (window.URL) evalscript_url([sjcl_sha_js]);
    else evalscript(sjcl_sha_js);
}

var sh = [];
function cmparrays(a,b)
{
    if (a.length != b.length) return false;
    for (var i = a.length; i--; ) if (a[i] != b[i]) return false;
    return true;
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

var androidsplash = false;
var m = false;
var seqno = Math.ceil(Math.random()*1000000000);
if (isMobile() || (typeof localStorage !== 'undefined' && localStorage.mobile))
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
    tag.href = "https://mega.co.nz/favicon.ico";
    document.getElementsByTagName('head')[0].appendChild(tag);
    m=true;
}
var silent_loading=false;

if (m)
{
    var app,mobileblog,android;
    var link = document.createElement('link');
    link.setAttribute('rel', 'stylesheet');
    link.type = 'text/css';
    link.href = staticpath + 'css/mobile-app.css';
    document.head.appendChild(link);
    document.body.innerHTML = '<div class="main-scroll-block"> <div class="main-content-block"> <div class="free-green-tip"></div><div class="main-centered-bl"><div class="main-logo"></div><div class="main-head-txt" id="m_title"></div><div class="main-txt" id="m_desc"></div><a href="" class="main-button" id="m_appbtn"></a><div class="main-social hidden"><a href="https://www.facebook.com/MEGAprivacy" class="main-social-icon facebook"></a><a href="https://www.twitter.com/MEGAprivacy" class="main-social-icon twitter"></a><div class="clear"></div></div></div> </div><div class="scrolling-content"><div class="mid-logo"></div> <div class="mid-gray-block">MEGA provides free cloud storage with convenient and powerful always-on privacy </div> <div class="scrolling-block-icon encription"></div> <div class="scrolling-block-header"> End-to-end encryption </div> <div class="scrolling-block-txt">Unlike other cloud storage providers, your data is encrypted & decrypted during transfer by your client devices only and never by us. </div> <div class="scrolling-block-icon access"></div> <div class="scrolling-block-header"> Secure Global Access </div> <div class="scrolling-block-txt">Your data is accessible any time, from any device, anywhere. Only you control the keys to your files.</div> <div class="scrolling-block-icon colaboration"></div> <div class="scrolling-block-header"> Secure Collaboration </div> <div class="scrolling-block-txt">Share folders with your contacts and see their updates in real time. Online collaboration has never been more private and secure.</div> <div class="bottom-menu full-version"><div class="copyright-txt">Mega Limited ' + new Date().getFullYear() + '</div><div class="language-block"></div><div class="clear"></div><iframe src="" width="1" height="1" frameborder="0" style="width:1px; height:1px; border:none;" id="m_iframe"></iframe></div></div></div>';
    if (window.location.hash.substr(1,4) == 'blog') mobileblog=1;
    if (ua.indexOf('android') > -1)
    {
        app='https://play.google.com/store/apps/details?id=com.flyingottersoftware.mega';
        document.body.className = 'android full-mode supported';
        android=1;
    }
    else if (ua.indexOf('bb10') > -1)
    {
        app='http://appworld.blackberry.com/webstore/content/46810890/';
        document.body.className = 'blackberry full-mode supported';
        document.getElementById('m_desc').innerHTML = 'Free 50 GB - End-to-end encryption';
    }
    else if (ua.indexOf('iphone') > -1 || ua.indexOf('ipad') > -1 || ua.indexOf('ipod') > -1)
    {
        app='https://itunes.apple.com/app/mega/id706857885';
        document.body.className = 'ios full-mode supported';
        document.getElementById('m_desc').innerHTML = 'Free 50 GB - End-to-end encryption';
    }
    else document.body.className = 'another-os full-mode unsupported';

    if (app)
    {
        document.getElementById('m_appbtn').href = app;
        document.getElementById('m_title').innerHTML = 'Install the free MEGA app';
    }
    else
    {
        document.getElementById('m_title').innerHTML = 'A dedicated app for your device will be available soon.';
        document.getElementById('m_desc').innerHTML = 'Follow us on Twitter or Facebook for updates.';
    }
    if (window.location.hash.substr(1,1) == '!' || window.location.hash.substr(1,2) == 'F!')
    {
        if (app) {
		document.getElementById('m_title').innerHTML = 'Install the free MEGA app to access this file from your mobile';
		document.getElementById('m_appbtn').href += '&referrer=link';
	}
        if (ua.indexOf('chrome') > -1)
        {
            setTimeout(function()
            {
                if (confirm('Do you already have the MEGA app installed?')) document.location = 'mega://' + window.location.hash;
            },2500);
        }
        else document.getElementById('m_iframe').src = 'mega://' + window.location.hash;
    }
    else if (window.location.hash.substr(1,7) == 'confirm' || window.location.hash.substr(1,7) == 'account')
    {
        var i=0;
        if (ua.indexOf('iphone') > -1 || ua.indexOf('ipad') > -1 || ua.indexOf('ipod') > -1) i=1;
        if (ua.indexOf('chrome') > -1) window.location ='mega://' + window.location.hash.substr(i);
        else document.getElementById('m_iframe').src = 'mega://' + window.location.hash.substr(i);
    }
    if (mobileblog)
    {
        document.body.innerHTML = '';
        var script = document.createElement('script');
        script.type = "text/javascript";
        document.head.appendChild(script);
        script.src = 'https://mega.co.nz/blog.js';
    }
}
else if (page == '#android')
{
    document.location = 'https://play.google.com/store/apps/details?id=com.flyingottersoftware.mega';
}
else
{
	if (!b_u)
	{
		var d = localStorage.d || 0,l;
		var jj = localStorage.jj || 0;
		var onBetaW = location.hostname === 'beta.mega.nz' || location.hostname.indexOf("developers.") > -1;
		var languages = {'en':['en','en-'],'es':['es','es-'],'fr':['fr','fr-'],'de':['de','de-'],'it':['it','it-'],'nl':['nl','nl-'],'pt':['pt'],'br':['pt-br'],'dk':['da'],'se':['sv'],'fi':['fi'],'no':['no'],'pl':['pl'],'cz':['cz','cz-'],'sk':['sk','sk-'],'sl':['sl','sl-'],'hu':['hu','hu-'],'jp':['ja'],'cn':['zh','zh-cn'],'ct':['zh-hk','zh-sg','zh-tw'],'kr':['ko'],'ru':['ru','ru-mo'],'ar':['ar','ar-'],'he':['he'],'id':['id'],'ca':['ca','ca-'],'eu':['eu','eu-'],'af':['af','af-'],'bs':['bs','bs-'],'sg':[],'tr':['tr','tr-'],'mk':[],'hi':[],'hr':['hr'],'ro':['ro','ro-'],'uk':['||'],'gl':['||'],'sr':['||'],'lt':['||'],'th':['||'],'lv':['||'],'fa':['||'],'ee':['et'],'ms':['ms'],'cy':['cy'],'bg':['bg'],'be':['br'],'tl':['en-ph'],'ka':['||']};
		if (typeof console == "undefined") { this.console = { log: function() {}, error: function() {}}}
		if (d && !console.time) (function(c)
		{
			var timers = {};
			c.time = function(n) { timers[n] = new Date().getTime()};
			c.timeEnd = function(n) {
				if(timers[n]) {
					c.log(n + ': ' + (new Date().getTime() - timers[n]) + 'ms');
					delete timers[n];
				}
			};
		})(console);

		Object.defineProperty(window, "__cd_v", { value : 9, writable : false });
		if (!d || onBetaW)
		{
			var __cdumps = [], __cd_t;
			window.onerror = function __MEGAExceptionHandler(msg, url, ln, cn, errobj)
			{
				function mTrim(s)
				{
					return s
						.replace(/resource:.+->\s/,'')
						.replace(/blob:[^:\s]+/, '..')
						.replace(/\.\.:\/\/[^:\s]+/, '..')
						.replace('chrome://mega/content','..')
						.replace(/file:.+extensions/,'..fx')
						.replace(/(?: line \d+ > eval)+/g,' >.eval')
				}
				if (__cdumps.length > 3) return false;

				var dump = {
					m : ('' + msg).replace(/'(\w+:\/\/+[^/]+)[^']+'/,"'$1...'").replace(/^Uncaught\s*/,''),
					f : mTrim('' + url), l : ln
				}, cc, sbid = +(''+$('script[src*="secureboot"]').attr('src')).split('=').pop();

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
						dump.s = ('' + errobj.stack).split("\n").splice(0,9).map(mTrim).join("\n");
					}
				}
				if (cn) dump.c = cn;

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
					cc = $.len(crashes);
				}
				catch(e) {
					delete localStorage.crashes;
				}

				__cdumps.push(dump);
				if (__cd_t) clearTimeout(__cd_t);
				__cd_t = setTimeout(safeCall(function()
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
					report.tp = $.transferprogress;
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
						api_req({ a : 'cd', c : JSON.stringify(__cdumps[i]), v : report, t : +__cd_v }, ctx(ids[i]));
					}
					__cd_t = 0;
					__cdumps = [];

				}), 3000);

				return false;
			};
		}
		function detectlang()
		{
			if (!navigator.language) return 'en';
			var bl = navigator.language.toLowerCase();
			var l2 = languages;
			for (var l in l2) for (b in l2[l]) if (l2[l][b] == bl) return l;
			for (var l in l2) for (b in l2[l]) if (l2[l][b].substring(0,3)==bl.substring(0,3)) return l;
			return 'en';
		}
		var init_f = [];
		var lang = detectlang();
		if ((typeof localStorage != 'undefined') && (localStorage.lang)) if (languages[localStorage.lang]) lang = localStorage.lang;
		var langv = '';
		if (typeof lv != 'undefined') langv = '_' + lv[lang];
		var jsl = [];

		jsl.push({f:'lang/' + lang + langv + '.json', n: 'lang', j:3});
		jsl.push({f:'sjcl.js', n: 'sjcl_js', j:1}); // Will be replaced with asmCrypto soon
		jsl.push({f:'js/asmcrypto.js',n:'asmcrypto_js',j:1,w:1});
        jsl.push({f:'js/tlvstore.js', n: 'tlvstore_js', j:1});
		jsl.push({f:'js/crypto.js', n: 'crypto_js', j:1,w:5});
        jsl.push({f:'js/jsbn.js', n: 'jsbn_js', j:1,w:2});
		jsl.push({f:'js/jsbn2.js', n: 'jsbn2_js', j:1,w:2});
		jsl.push({f:'js/jodid25519.js', n: 'jodid25519_js', j:1,w:7});
        jsl.push({f:'js/stringcrypt.js', n: 'stringcrypt_js', j:1});		
        jsl.push({f:'js/user.js', n: 'user_js', j:1});
        jsl.push({f:'js/authring.js', n: 'authring_js', j:1});
        jsl.push({f:'js/mouse.js', n: 'mouse_js', j:1});
        jsl.push({f:'js/jquery-2.1.1.js', n: 'jquery', j:1,w:10});
        jsl.push({f:'js/functions.js', n: 'functions_js', j:1});
        jsl.push({f:'js/megaLogger.js', n: 'megaLogger_js', j:1});
        jsl.push({f:'js/jquery-ui-1.11.2.js', n: 'jqueryui_js', j:1,w:10});
        jsl.push({f:'js/base64.js', n: 'base64_js', j:1});
        jsl.push({f:'js/filedrag.js', n: 'filedrag_js', j:1});
        jsl.push({f:'js/jquery.mousewheel.js', n: 'jquerymouse_js', j:1});
        jsl.push({f:'js/jquery.jscrollpane.js', n: 'jscrollpane_js', j:1});
        jsl.push({f:'js/jquery.tokeninput.js', n: 'jquerytokeninput_js', j:1});
        jsl.push({f:'js/jquery.misc.js', n: 'jquerymisc_js', j:1});
        jsl.push({f:'js/mDB.js', n: 'mDB_js', j:1});
        jsl.push({f:'js/thumbnail.js', n: 'thumbnail_js', j:1});
        jsl.push({f:'js/exif.js', n: 'exif_js', j:1,w:3});
        jsl.push({f:'js/megapix.js', n: 'megapix_js', j:1});
        jsl.push({f:'js/smartcrop.js', n: 'smartcrop_js', j:1,w:7});
        jsl.push({f:'js/mega.js', n: 'mega_js', j:1,w:7});
        jsl.push({f:'js/jquery.fullscreen.js', n: 'jquery_fullscreen', j:1,w:10});
        jsl.push({f:'js/vendor/jquery.window-active.js', n: 'jquery_windowactive', j:1,w:2});
        jsl.push({f:'js/megaPromise.js', n: 'megapromise_js', j:1,w:5});
        jsl.push({f:'js/vendor/db.js', n: 'db_js', j:1,w:5});
        jsl.push({f:'js/megaDbEncryptionPlugin.js', n: 'megadbenc_js', j:1,w:5});
        jsl.push({f:'js/megaDb.js', n: 'megadb_js', j:1,w:5});
        jsl.push({f:'js/megaKvStorage.js', n: 'megakvstorage_js', j:1,w:5});

        jsl.push({f:'js/chat/mpenc.js', n: 'mega_js', j:1,w:7});
        jsl.push({f:'js/chat/opQueue.js', n: 'mega_js', j:1,w:7});

        jsl.push({f:'js/vendor/chat/strophe.js', n: 'mega_js', j:1,w:7});
        jsl.push({f:'js/vendor/chat/strophe.disco.js', n: 'mega_js', j:1,w:7});
        jsl.push({f:'js/vendor/chat/strophe.jingle.js', n: 'mega_js', j:1,w:7});
        jsl.push({f:'js/vendor/chat/strophe.jingle.session.js', n: 'mega_js', j:1,w:7});
        jsl.push({f:'js/vendor/chat/strophe.jingle.sdp.js', n: 'mega_js', j:1,w:7});
        jsl.push({f:'js/vendor/chat/strophe.jingle.adapter.js', n: 'mega_js', j:1,w:7});
        jsl.push({f:'js/vendor/chat/strophe.muc.js', n: 'mega_js', j:1,w:7});
        jsl.push({f:'js/vendor/chat/strophe.roster.js', n: 'mega_js', j:1,w:7});
        jsl.push({f:'js/vendor/chat/wildemitter.patched.js', n: 'mega_js', j:1,w:7});
        jsl.push({f:'js/vendor/chat/hark.patched.js', n: 'mega_js', j:1,w:7});
        jsl.push({f:'js/vendor/chat/base32.js', n: 'mega_js', j:1,w:7});

        // direct transfer deps.
        jsl.push({f:'js/vendor/chat/cryptojs-core.js', n: 'mega_js', j:1,w:7});
        jsl.push({f:'js/vendor/chat/cryptojs-sha1.js', n: 'mega_js', j:1,w:7});
        jsl.push({f:'js/vendor/chat/cryptojs-hmac.js', n: 'mega_js', j:1,w:7});
        jsl.push({f:'js/vendor/chat/cryptojs-lib-typedarrays.js', n: 'mega_js', j:1,w:7});

        // Other
        jsl.push({f:'js/vendor/Autolinker.js', n: 'mega_js', j:1,w:7});

		// Google Import Contacts
        jsl.push({f:'js/gContacts.js', n: 'gcontacts_js', j:1,w:3});


        // MEGA CHAT
        jsl.push({f:'js/chat/rtcStats.js', n: 'mega_js', j:1,w:7});
        jsl.push({f:'js/chat/rtcSession.js', n: 'mega_js', j:1,w:7});
        jsl.push({f:'js/chat/fileTransfer.js', n: 'mega_js', j:1,w:7});

        jsl.push({f:'js/ui/filepicker.js', n: 'mega_js', j:1,w:7});
        jsl.push({f:'js/ui/dialog.js', n: 'mega_js', j:1,w:7});
        jsl.push({f:'js/chat/ui/incomingCallDialog.js', n: 'mega_js', j:1,w:7});

        // notifications
        jsl.push({f:'js/megaNotifications.js', n: 'meganotifications_js', j:1,w:7});
        jsl.push({f:'js/vendor/ion.sound.js', n: 'ionsound_js', j:1,w:7});
        jsl.push({f:'js/vendor/favico.js', n: 'favico_js', j:1,w:7});
        jsl.push({f:'js/vendor/notification.js', n: 'notification_js', j:1,w:7});

        jsl.push({f:'js/chat/plugins/urlFilter.js', n: 'mega_js', j:1,w:7});
        jsl.push({f:'js/chat/plugins/emoticonsFilter.js', n: 'mega_js', j:1,w:7});
        jsl.push({f:'js/chat/plugins/attachmentsFilter.js', n: 'mega_js', j:1,w:7});
        jsl.push({f:'js/chat/plugins/encryptionFilter.js', n: 'mega_js', j:1,w:7});
        jsl.push({f:'js/chat/plugins/chatStore.js', n: 'chatstore_js', j:1,w:7});
        jsl.push({f:'js/chat/plugins/chatNotifications.js', n: 'chatnotifications_js', j:1,w:7});


        jsl.push({f:'js/chat/karereEventObjects.js', n: 'keo_js', j:1,w:7});
        jsl.push({f:'js/chat/karere.js', n: 'karere_js', j:1,w:7});
        jsl.push({f:'js/chat/chat.js', n: 'chat_js', j:1,w:7});
        jsl.push({f:'js/chat/chatRoom.js', n: 'chat_js', j:1,w:7});

        // END OF MEGA CHAT
        
        jsl.push({f:'js/fm.js', n: 'fm_js', j:1,w:12});
        jsl.push({f:'js/filetypes.js', n: 'filetypes_js', j:1});
        jsl.push({f:'js/miniui.js', n: 'miniui_js', j:1});
        if (is_extension)
        {
                jsl.push({f:'js/dcraw.js', n: 'dcraw_js', j:1});
        }
        /* better download */
        jsl.push({f:'js/xhr.js', n: 'xhr_js', j:1});
        jsl.push({f:'js/events.js', n: 'events', j:1,w:4});
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
        /* end better download */
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
        jsl.push({f:'js/notifications.js', n: 'notifications_js', j:1});
        jsl.push({f:'css/style.css', n: 'style_css', j:2,w:30,c:1,d:1,cache:1});
        jsl.push({f:'js/avatar.js', n: 'avatar_js', j:1,w:3});
        jsl.push({f:'js/countries.js', n: 'countries_js', j:1});
        jsl.push({f:'html/dialogs.html', n: 'dialogs', j:0,w:2});
        jsl.push({f:'html/transferwidget.html', n: 'transferwidget', j:0});
        jsl.push({f:'js/checkboxes.js', n: 'checkboxes_js', j:1});
        jsl.push({f:'js/Int64.js', n: 'int64_js', j:1});
        jsl.push({f:'js/zip64.js', n: 'zip_js', j:1});
        jsl.push({f:'js/cms.js', n: 'cms_js', j:1});
        jsl.push({f:'js/analytics.js', n: 'analytics_js', j:1});

        // only used on beta
		if(window.location.hostname == "beta.mega.nz"/* || window.location.hostname == "mega.dev" */|| location.hostname.indexOf("developers.") > -1) {
			jsl.push({f: 'js/betacrashes.js', n: 'cms_js', j: 1});
		}


//        jsl.push({f:'html/register.html', n: 'register', j:0});
//        jsl.push({f:'html/js/register.js', n: 'register_js', j:1});

        var jsl2 =
        {
            'about': {f:'html/about.html', n: 'about', j:0},
            'blog': {f:'html/blog.html', n: 'blog', j:0},
            'blog_js': {f:'html/js/blog.js', n: 'blog_js', j:1},
            'blogarticle': {f:'html/blogarticle.html', n: 'blogarticle', j:0},
            'blogarticle_js': {f:'html/js/blogarticle.js', n: 'blogarticle_js', j:1},
            'register': {f:'html/register.html', n: 'register', j:0},
            'register_js': {f:'html/js/register.js', n: 'register_js', j:1},
            'resellers': {f:'html/resellers.html', n: 'resellers', j:0},
            'download': {f:'html/download.html', n: 'download', j:0},
            'download_js': {f:'html/js/download.js', n: 'download_js', j:1},
            'copyright': {f:'html/copyright.html', n: 'copyright', j:0},
            'copyrightnotice': {f:'html/copyrightnotice.html', n: 'copyrightnotice', j:0},
            'copyrightnotice_js': {f:'html/js/copyrightnotice.js', n: 'copyrightnotice_js', j:1},
            'privacy': {f:'html/privacy.html', n: 'privacy', j:0},
            'terms': {f:'html/terms.html', n: 'terms', j:0},
            'backup': {f:'html/backup.html', n: 'backup', j:0},
            'backup_js': {f:'html/js/backup.js', n: 'backup_js', j:1},
            'reset': {f:'html/reset.html', n: 'reset', j:0},
            'reset_js': {f:'html/js/reset.js', n: 'reset_js', j:1},
            'filesaver': {f:'js/filesaver.js', n: 'filesaver', j:1},
            'recovery': {f:'html/recovery.html', n: 'recovery', j:0},
            'recovery_js': {f:'html/js/recovery.js', n: 'recovery_js', j:1},
            'credits': {f:'html/credits.html', n: 'credits', j:0},
            'takedown': {f:'html/takedown.html', n: 'takedown', j:0},
            'dev': {f:'html/dev.html', n: 'dev', j:0},
            'arkanoid_js': {f:'js/arkanoid.js', n: 'arkanoid_js', j:1},
            'dev_js': {f:'html/js/dev.js', n: 'dev_js', j:1},
            'sdkterms': {f:'html/sdkterms.html', n: 'sdkterms', j:0},
            'help_js': {f:'html/js/help.js', n: 'help_js', j:1},
            'firefox': {f:'html/firefox.html', n: 'firefox', j:0},
            'sync': {f:'html/sync.html', n: 'sync', j:0},
			'sync_js': {f:'html/js/sync.js', n: 'sync_js', j:1},
            'mobile': {f:'html/mobile.html', n: 'mobile', j:0},
            'affiliates': {f:'html/affiliates.html', n: 'affiliates', j:0},
            'affiliate_js': {f:'html/js/affiliate.js', n: 'affiliate_js', j:0},
            'affiliateterms': {f:'html/affiliateterms.html', n: 'affiliateterms', j:0},
            'affiliatesignup': {f:'html/affiliatesignup.html', n: 'affiliatesignup', j:0},
            'affiliatesignup_js': {f:'html/js/affiliatesignup.js', n: 'affiliatesignup_js', j:1},
            'affiliatemember': {f:'html/affiliatemember.html', n: 'affiliatemember', j:0},
            'affiliatemember_js': {f:'html/js/affiliatemember.js', n: 'affiliatemember_js', j:1},
            'contact': {f:'html/contact.html', n: 'contact', j:0},
            'privacycompany': {f:'html/privacycompany.html', n: 'privacycompany', j:0},
            'chrome': {f:'html/chrome.html', n: 'chrome', j:0},
            'zxcvbn_js': {f:'js/zxcvbn.js', n: 'zxcvbn_js', j:1}
        };
        var subpages =
        {
            'about': ['about'],
            'terms': ['terms'],
            'credits': ['credits'],
            'backup': ['backup','backup_js','filesaver'],
            'recovery': ['recovery','recovery_js'],
            'reset': ['reset','reset_js'],
            'blog': ['blog','blog_js','blogarticle','blogarticle_js'],
            'register': ['register','register_js'],
            'android': ['android'],
            'resellers': ['resellers'],
            '!': ['download','download_js'],
            'copyright': ['copyright'],
            'key':['arkanoid_js'],
            'copyrightnotice': ['copyrightnotice','copyrightnotice_js'],
            'privacy': ['privacy','privacycompany'],
            'takedown': ['takedown'],
            'firefox': ['firefox'],
            'mobile': ['mobile'],
            'sync': ['sync','sync_js'],
            'contact': ['contact'],
            'dev': ['dev','dev_js','sdkterms'],
            'sdk': ['dev','dev_js','sdkterms'],
            'doc': ['dev','dev_js','sdkterms'],
            'help': ['help_js'],
            'chrome': ['chrome'],
            'plugin': ['chrome','firefox'],
            'affiliate': ['affiliates','affiliateterms','affiliatesignup','affiliatesignup_js','affiliatemember','affiliatemember_js','affiliate_js'],
            'recover': ['reset','reset_js']
        };

        if (page)
        {
            if (page.indexOf('%25') !== -1)
            {
                do {
                    page = page.replace('%25','%', 'g');
                } while (~page.indexOf('%25'));
            }
            if (page.indexOf('%21') !== -1)
            {
                page = page.replace('%21','!', 'g');
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
        var downloading = false;
        var ul_uploading = false;
        var lightweight=false;
		var waitingToBeLoaded = {};
        var njsl = [];
        var fx_startup_cache = is_chrome_firefox && nocontentcheck;
        if ((typeof Worker !== 'undefined') && (typeof window.URL !== 'undefined') && !fx_startup_cache && !nocontentcheck)
        {
            var hashdata = ['self.postMessage = self.webkitPostMessage || self.postMessage;',sjcl_sha_js,'self.onmessage = function(e) { try { e.data.hash = sha256(e.data.text);  self.postMessage(e.data); } catch(err) { e.data.error = err.message; self.postMessage(e.data);  } };'];
            try  { var blob = new Blob(hashdata, { type: "text/javascript" }); }
            catch(e)
            {
                window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder || window.MSBlobBuilder;
                var bb = new BlobBuilder();
                for (var i in hashdata) bb.append(hashdata[i]);
                var blob = bb.getBlob('text/javascript');
            }
            var hash_url = window.URL.createObjectURL(blob);
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
                        if (!nocontentcheck && !cmparrays(e.data.hash,sh1[jsl[e.data.jsi].f]))
                        {
                            if (bootstaticpath.indexOf('cdn') > -1)
                            {
                                sessionStorage.skipcdn=1;
                                document.location.reload();
                            }
                            else alert('An error occurred while loading MEGA. The file ' + bootstaticpath+jsl[e.data.jsi].f + ' is corrupt. Please try again later. We apologize for the inconvenience.');

                            contenterror=1;
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
                }
                i++;
            }
        }

        if (jj)
        {

			var headElement = document.querySelector("head");
			var _queueWaitToBeLoaded = function(id, elem) {
				waitingToBeLoaded[id] = true;
				elem.onload = function() {
					delete waitingToBeLoaded[id];

					if(Object.keys(waitingToBeLoaded).length === 0) {
						boot_done();
					}
				};
			};

			var createScriptTag = function(id, src) {
				var elem = document.createElement("script");
				headElement.appendChild(elem);
				elem.id = id;
				elem.async = false;
				_queueWaitToBeLoaded(id, elem);
				elem.src = src;
				return elem;
			};
			var createStyleTag = function(id, src) {
				var elem = document.createElement("link");
				elem.rel = "stylesheet";
				elem.type = "text/css";

				headElement.appendChild(elem);
				elem.id = id;
				_queueWaitToBeLoaded(id, elem);
				elem.href = src;
				return elem;
			};

            l=[];
            var i = 3000, r = new Date().toISOString().replace(/[^\w]/g,'');
            if (localStorage.allowBreakpointsOnReload) r = '';
            while (i--) l[i]='l';
            for (var i in jsl)
            {
                if (jsl[i].j === 1) {
					createScriptTag("jsl" + i, bootstaticpath + jsl[i].f + '?r='/* + r */);
				}
                else if (jsl[i].j === 2)
                {
                    if ((m && (jsl[i].m)) || ((!m) && (jsl[i].d))) {
						createStyleTag("jsl" + i, bootstaticpath + jsl[i].f + '?r='/* + r */)
					}
                }
            }
        }

        var pages = [], scripts = {};
        function getxhr()
        {
            return (typeof XDomainRequest != 'undefined' && typeof ArrayBuffer == 'undefined') ? new XDomainRequest() : new XMLHttpRequest();
        }

        var xhr_progress,xhr_stack,jsl_fm_current,jsl_current,jsl_total,jsl_perc,jsli,jslcomplete;

        function jsl_start()
        {
            jslcomplete = 0;
            if(d && jj) {
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
            for (var i = jsl.length; i--;) if (!jsl[i].text) jsl_total += jsl[i].w || 1;
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

                            alert('An error occurred while loading MEGA.\n\nFilename: '
                                + file + "\n" + e + '\n\n' + mozBrowserID);
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
                                alert('An error occurred while loading MEGA.' +
                                    ' The file ' + file + ' could not be loaded.');
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

        function xhr_error()
        {
            xhr_timeout+=10000;
            console.log(xhr_timeout);
            if (bootstaticpath.indexOf('cdn') > -1)
            {
                bootstaticpath = geoStaticpath(1);
                staticpath = geoStaticpath(1);
            }
            xhr_progress[this.xhri] = 0;
            xhr_load(this.url,this.jsi,this.xhri);
        }

        function xhr_load(url,jsi,xhri)
        {
            if(d && jj) {
                if(jsl[jsi].j == 1 || jsl[jsi].j == 2) {
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
                jsl[this.jsi].text = this.response || this.responseText;

                if (typeof hash_workers != 'undefined' && !nocontentcheck)
                {
                    hash_workers[this.xhri].postMessage({'text':jsl[this.jsi].text,'xhr':'test','jsi':this.jsi,'xhri':this.xhri});
                }
                else
                {
                    if (!nocontentcheck && !cmparrays(sha256(jsl[this.jsi].text),sh1[jsl[this.jsi].f]))
                    {
                        alert('An error occurred while loading MEGA. The file ' + bootstaticpath+jsl[this.jsi].f + ' is corrupt. Please try again later. We apologize for the inconvenience.');
                        contenterror=1;
                    }
                    if (!contenterror)
                    {
                        jsl_current += jsl[this.jsi].w || 1;
                        jsl_progress();
                        if (++jslcomplete == jsl.length) initall();
                        else jsl_load(this.xhri);
                    }
                }
            }
            xhr_stack[xhri].onreadystatechange = function()
            {
                try
                {
                    if (this.readyState == 1) this.timeout=0;
                }
                catch(e)
                {

                }
            }
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
            if (!maintenance && !androidsplash) jsl_start();
        }
        function jsl_load(xhri)
        {
            if (jsl[jsli]) xhr_load(jsl[jsli].f, jsli++,xhri);
        }
        function jsl_progress()
        {
            if (d) console.log('done',(jsl_current+jsl_fm_current));
            if (d) console.log('total',jsl_total);
            var p = Math.floor((jsl_current+jsl_fm_current)/jsl_total*100);
            if ((p > jsl_perc) && (p <= 100))
            {
                jsl_perc = p;
                if (is_extension) p=100;
                document.getElementById('loadinganim').className = 'loading-progress-bar percents-'+p;
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
                        var css = document.createElement('style');
                        css.type = "text/css";
                        css.rel = 'stylesheet';
                        document.getElementsByTagName('head')[0].appendChild(css);
                        css.textContent = jsl[i].text.replace(/\.\.\//g,staticpath).replace(new RegExp( "\\/en\\/", "g"),'/' + lang + '/');
                    }
                }
                else if (jsl[i].j == 3) l = !jj && l || JSON.parse(jsl[i].text);
                else if (jsl[i].j == 4) scripts[jsl[i].f] = jsl[i].text;
                else if (jsl[i].j == 0) pages[jsl[i].n] = jsl[i].text;
            }
            if (window.URL)
            {
                var blob;
                if (cssar.length) try
                {
                    blob = new Blob(cssar, { type: "text/css" });
                    for ( var f in scripts ) {
                        if (!scripts[f].match(/^blob:/)) {
                            scripts[f] = window.URL.createObjectURL( new Blob( [ scripts[f] ], { type: 'text/javascript' } ) );
                        }
                    }
                }
                catch(e)
                {
                    window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder || window.MSBlobBuilder;
                    var bb = new BlobBuilder();
                    for (var i in cssar) bb.append(cssar[i]);
                    blob = bb.getBlob('text/css');
                    for ( var f in scripts ) {
                        if (!scripts[f].match(/^blob:/)) {
                            bb = new BlobBuilder();
                            bb.append( scripts[f] );
                            scripts[f] = window.URL.createObjectURL( bb.getBlob('text/javascript') );
                        }
                    }
                }
                if (blob)
                {
                    var link = document.createElement('link');
                    link.setAttribute('rel', 'stylesheet');
                    link.type = 'text/css';
                    link.href = window.URL.createObjectURL(blob);
                    document.head.appendChild(link);
                }
                cssar=undefined;
                jsar.push('jsl_done=true; boot_done();');
                evalscript_url(jsar);
                jsar=undefined;
            }
            else
            {
                jsl_done=true;
				if(Object.keys(waitingToBeLoaded).length === 0) boot_done();
            }
	    jj = 0; //prevent further 'silent_loading' loads from failing..
        }
    }
    if (ua.indexOf('android') > 0 && !sessionStorage.androidsplash && document.location.hash.indexOf('#confirm') == -1)
    {
        if (document.location.hash == '#android')
        {
            document.location = 'https://play.google.com/store/apps/details?id=com.flyingottersoftware.mega';
        }
        else
        {
            document.write('<link rel="stylesheet" type="text/css" href="' + staticpath + 'resources/css/mobile-android.css" /><div class="overlay"></div><div class="new-folder-popup" id="message"><div class="new-folder-popup-bg"><div class="new-folder-header">MEGA for Android</div><div class="new-folder-main-bg"><div class="new-folder-descr">Do you want to install the latest<br/> version of the MEGA app for Android?</div><a class="new-folder-input left-button" id="trashbinYes"> <span class="new-folder-bg1"> <span class="new-folder-bg2" id="android_yes"> Yes </span> </span></a><a class="new-folder-input right-button" id="trashbinNo"> <span class="new-folder-bg1"> <span class="new-folder-bg2" id="android_no">No </span> </span></a><div class="clear"></div></div></div></div></div>');
            document.getElementById('android_yes').addEventListener("click", function ()
            {
                document.location = 'https://play.google.com/store/apps/details?id=com.flyingottersoftware.mega';
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

        document.write('<style type="text/css">.div, span, input {outline: none;}.hidden {display: none;}.clear {clear: both;margin: 0px;padding: 0px;display: block;}.loading-main-block {width: 100%;height: 100%;overflow: auto;font-family:Arial, Helvetica, sans-serif;}.loading-mid-white-block {height: 100%;width:100%;}.mid-centered-block {position: absolute;width: 494px;min-height: 158px;top: 50%;left: 50%;margin: -95px 0 0 -247px;}.loading-main-bottom {max-width: 940px;width: 100%;position: absolute;bottom: 20px;left: 50%;margin: 0 0 0 -470px;text-align: center;}.loading-bottom-button {height: 29px;width: 29px;float: left;background-image: url(' + istaticpath + 'images/mega/loading-sprite1.png);background-repeat: no-repeat;cursor: pointer;}.st-social-block-load {position: absolute;bottom: 20px;left: 0;width: 100%;height: 43px;text-align: center;}.st-bottom-button {height: 29px;width: 29px;display: inline-block;background-image: url(' + istaticpath + 'images/mega/new-startpage-spite.png?v=1);background-repeat: no-repeat;cursor: pointer;}.st-bottom-button.st-google-button {background-position: -93px -1233px;position: relative;margin: 0 5px;}.st-bottom-button.st-google-button:hover {background-position: -93px -1173px;}.st-bottom-button.st-facebook-button {background-position: -49px -1233px;margin: 0 5px;}.st-bottom-button.st-facebook-button:hover {background-position: -49px -1173px;}.st-bottom-button.st-twitter-button {background-position: left -1233px;margin: 0 5px;}.st-bottom-button.st-twitter-button:hover {background-position: left -1173px;}.loading-cloud {width: 222px;height: 158px;background-image: url(' + istaticpath + 'images/mega/loading-sprite1.png);background-repeat: no-repeat;background-position: 0 -2128px;margin: 0 auto;-webkit-box-sizing: border-box;-moz-box-sizing: border-box;-ms-box-sizing: border-box;box-sizing: border-box;padding-top: 55px;}.loading-progress-bar, .loading-progress-bar div {width: 80px;height: 80px;margin: 0 0 0 71px;background-image: url(' + istaticpath + 'images/mega/loading-sprite1.png);background-repeat: no-repeat;background-position: 0 top;}.loading-progress-bar div {background-position: -71px -2183px;margin: 0;}.maintance-block {position: absolute;width: 484px;min-height: 94px;border: 2px solid #d9d9d9;-moz-border-radius: 7px;-webkit-border-radius: 7px;border-radius: 7px;padding: 10px;color: #333333;font-size: 13px;line-height: 30px;padding: 15px 15px 15px 102px;-webkit-box-sizing: border-box;-moz-box-sizing: border-box;-ms-box-sizing: border-box;box-sizing: border-box;background-image: url(' + istaticpath + 'images/mega/loading-sprite1.png);background-repeat: no-repeat;background-position: -60px -2428px;margin-top: 45px;}.loading-progress-bar.percents-0 {background-position: 0 0;}.loading-progress-bar.percents-1, .loading-progress-bar.percents-2, .loading-progress-bar.percents-3 {background-position: -130px 0;}.loading-progress-bar.percents-4, .loading-progress-bar.percents-5, .loading-progress-bar.percents-6 {background-position: 0 -100px;}.loading-progress-bar.percents-7, .loading-progress-bar.percents-8, .loading-progress-bar.percents-9 {background-position: -130px -100px;}.loading-progress-bar.percents-10, .loading-progress-bar.percents-11, .loading-progress-bar.percents-12 {background-position: 0 -200px;}.loading-progress-bar.percents-13, .loading-progress-bar.percents-14, .loading-progress-bar.percents-15 {background-position: -130px -200px;}.loading-progress-bar.percents-16, .loading-progress-bar.percents-17, .loading-progress-bar.percents-18 {background-position: 0 -300px;}.loading-progress-bar.percents-19, .loading-progress-bar.percents-20, .loading-progress-bar.percents-21 {background-position: -130px -300px;}.loading-progress-bar.percents-22, .loading-progress-bar.percents-23, .loading-progress-bar.percents-24 {background-position: 0 -400px;}.loading-progress-bar.percents-25, .loading-progress-bar.percents-26, .loading-progress-bar.percents-27 {background-position: -130px -400px;}.loading-progress-bar.percents-28, .loading-progress-bar.percents-29, .loading-progress-bar.percents-30 {background-position: 0 -500px;}.loading-progress-bar.percents-31, .loading-progress-bar.percents-32, .loading-progress-bar.percents-33 {background-position: -130px -500px;}.loading-progress-bar.percents-34, .loading-progress-bar.percents-35 {background-position: 0 -600px;}.loading-progress-bar.percents-36, .loading-progress-bar.percents-37 {background-position: -130px -600px;}.loading-progress-bar.percents-38, .loading-progress-bar.percents-39 {background-position: 0 -700px;}.loading-progress-bar.percents-40, .loading-progress-bar.percents-41 {background-position: -130px -700px;}.loading-progress-bar.percents-42, .loading-progress-bar.percents-43 {background-position: 0 -800px;}.loading-progress-bar.percents-44, .loading-progress-bar.percents-45 {background-position: -130px -800px;}.loading-progress-bar.percents-46, .loading-progress-bar.percents-47 {background-position: 0 -900px;}.loading-progress-bar.percents-48, .loading-progress-bar.percents-49 {background-position: -130px -900px;}.loading-progress-bar.percents-50 {background-position: 0 -1000px;}.loading-progress-bar.percents-51, .loading-progress-bar.percents-52, .loading-progress-bar.percents-53 {background-position: -130px -1000px;}.loading-progress-bar.percents-54, .loading-progress-bar.percents-55, .loading-progress-bar.percents-56 {background-position: 0 -1100px;}.loading-progress-bar.percents-57, .loading-progress-bar.percents-58, .loading-progress-bar.percents-59 {background-position: -130px -1100px;}.loading-progress-bar.percents-60, .loading-progress-bar.percents-61, .loading-progress-bar.percents-62 {background-position: 0 -1200px;}.loading-progress-bar.percents-63, .loading-progress-bar.percents-64, .loading-progress-bar.percents-65 {background-position: -130px -1200px;}.loading-progress-bar.percents-66, .loading-progress-bar.percents-67, .loading-progress-bar.percents-68 {background-position: 0 -1300px;}.loading-progress-bar.percents-69, .loading-progress-bar.percents-70, .loading-progress-bar.percents-71 {background-position: -130px -1300px;}.loading-progress-bar.percents-72, .loading-progress-bar.percents-73, .loading-progress-bar.percents-74 {background-position: 0 -1400px;}.loading-progress-bar.percents-75, .loading-progress-bar.percents-76, .loading-progress-bar.percents-77 {background-position: -130px -1400px;}.loading-progress-bar.percents-78, .loading-progress-bar.percents-79, .loading-progress-bar.percents-80 {background-position: 0 -1500px;}.loading-progress-bar.percents-81, .loading-progress-bar.percents-82, .loading-progress-bar.percents-83 {background-position: -130px -1500px;}.loading-progress-bar.percents-84, .loading-progress-bar.percents-85, .loading-progress-bar.percents-86 {background-position: 0 -1600px;}.loading-progress-bar.percents-87, .loading-progress-bar.percents-88, .loading-progress-bar.percents-89 {background-position: -130px -1600px;}.loading-progress-bar.percents-90, .loading-progress-bar.percents-91, .loading-progress-bar.percents-92 {background-position: 0 -1800px;}.loading-progress-bar.percents-93, .loading-progress-bar.percents-94, .loading-progress-bar.percents-95 {background-position: -130px -1800px;}.loading-progress-bar.percents-96, .loading-progress-bar.percents-97 {background-position: 0 -1900px;}.loading-progress-bar.percents-98, .loading-progress-bar.percents-99 {background-position: -130px -1900px;}.loading-progress-bar.percents-100 {background-position: 0 -2000px;}.follow-txt {text-decoration:none; line-height: 28px; float:right; color:#666666; font-size:12px;}@media only screen and (-webkit-min-device-pixel-ratio: 1.5), only screen and (-o-min-device-pixel-ratio: 3/2), only screen and (min--moz-device-pixel-ratio: 1.5), only screen and (min-device-pixel-ratio: 1.5) {.maintance-block, .loading-progress-bar, .loading-progress-bar div, .loading-cloud, .loading-bottom-button {background-image: url(' + istaticpath + 'images/mega/loading-sprite1@2x.png);	background-size: 222px auto;}.st-bottom-button, .st-bottom-scroll-button {background-image: url(' + istaticpath + 'images/mega/new-startpage-spite@2x.png?v=1);background-size: 356px auto;}}</style><div class="loading-main-block" id="loading"><div class="loading-mid-white-block"><div class="mid-centered-block"><div class="loading-cloud"><div class="loading-progress-bar percents-1" id="loadinganim"><div></div></div></div><div class="maintance-block hidden">Scheduled System Maintenance - Expect Disruptions<br/>Sunday 04:00 - 10:00 UTC </div></div><div class="st-social-block-load" id="bootbottom"><a href="https://www.facebook.com/MEGAprivacy" target="_blank" class="st-bottom-button st-facebook-button"></a><a href="https://www.twitter.com/MEGAprivacy" target="_blank" class="st-bottom-button st-twitter-button"></a><a href="https://plus.google.com/b/108055545377490138410/" target="_blank" class="st-bottom-button st-google-button"></a></div></div></div>');
    }
    var u_storage,loginresponse,u_sid,jsl_done,dlresponse,dl_res;
    u_storage = init_storage( localStorage.sid ? localStorage : sessionStorage );
    if ((u_sid = u_storage.sid))
    {
        loginresponse = true;
        var lxhr = getxhr();
        lxhr.onload = function()
        {
            if (this.status == 200)
            {
                try
                {
                    loginresponse = this.response || this.responseText;
                    if (loginresponse && loginresponse[0] == '[') loginresponse = JSON.parse(loginresponse);
                    else loginresponse = false;
					if(Object.keys(waitingToBeLoaded).length === 0) boot_done();
                }
                catch (e)
                {
                    loginresponse= false;
					if(Object.keys(waitingToBeLoaded).length === 0) boot_done();
                }
            }
            else
            {
                loginresponse= false;
				if(Object.keys(waitingToBeLoaded).length === 0) boot_done();
            }
        }
        lxhr.onerror = function()
        {
            loginresponse= false;
			if(Object.keys(waitingToBeLoaded).length === 0) boot_done();
        }
        lxhr.open("POST", apipath + 'cs?id=0&sid='+u_storage.sid, true);
        lxhr.send(JSON.stringify([{'a':'ug'}]));
    }
    function boot_auth(u_ctx,r)
    {
        u_type = r;
        u_checked=true;
        startMega();
    }

	var boot_done_called = false;
    function boot_done()
    {
        lxhr = dlxhr = undefined;
        if (loginresponse === true || dl_res === true || !jsl_done) return;
        else if (loginresponse)
        {
            api_setsid(u_sid);
            u_checklogin3a(loginresponse[0],{checkloginresult:boot_auth});
        }
        else u_checklogin({checkloginresult:boot_auth},false);
    }
    if (page.substr(0,1) == '!' && page.length > 1)
    {
		/**
		 * TODO: this is called twice: 1 time from the login success, 1 time from the loading finished. The secure boot
		 * should be rewritten to have a proper ASYNC flow/process of doing loading + doing auth, without actually
		 * triggering 2 boot_done calls, because this causes different race conditions on different connection speeds,
		 * which are almost impossible to track.
		 */
		if(!boot_done_called) {
			boot_done_called = true;
			$(window).trigger('MegaLoaded');
		}
        var dlxhr = getxhr(),dl_res = true;
        dlxhr.onload = function()
        {
            if (this.status == 200)
            {
                try
                {
                    dl_res = this.response || this.responseText;
                    if (dl_res[0] == '[') dl_res = JSON.parse(dl_res);
                    if (dl_res[0]) dl_res = dl_res[0];
					if(Object.keys(waitingToBeLoaded).length === 0) boot_done();
                }
                catch (e)
                {
                    dl_res = false;
					if(Object.keys(waitingToBeLoaded).length === 0) boot_done();
                }
            }
            else
            {
                dl_res = false;
				if(Object.keys(waitingToBeLoaded).length === 0) boot_done();
            }
        }
        dlxhr.onerror = function()
        {
            dl_res= false;
			if(Object.keys(waitingToBeLoaded).length === 0) boot_done();
        }
        dlxhr.open("POST", apipath + 'cs?id=0', true);
        dlxhr.send(JSON.stringify([{'a':'g',p:page.substr(1,8)}]));
    }
}
