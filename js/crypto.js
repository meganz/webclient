window.URL = window.URL || window.webkitURL;
var have_ab = typeof ArrayBuffer != 'undefined' && typeof DataView != 'undefined';
var use_workers = have_ab && typeof Worker != 'undefined';

if (is_extension)
{
	var use_ssl = 0;
}
else
{
	if ((navigator.appVersion.indexOf('Safari') > 0) && (navigator.appVersion.indexOf('Version/5') > 0))
	{
		use_workers=false;
		have_ab=false;
	}

	var ssl_off = [ 'Firefox/14', 'Firefox/15', 'Firefox/17', 'Safari', 'Firefox/16' ];
	var ssl_opt = [ 'Chrome/' ];

	function ssl_needed()
	{
		for (var i = ssl_opt.length; i--; ) if (navigator.userAgent.indexOf(ssl_opt[i]) >= 0) return 0;
		for (var i = ssl_off.length; i--; ) if (navigator.userAgent.indexOf(ssl_off[i]) >= 0) return -1;
		return 1;
	}
	var use_ssl = ssl_needed();
	if (!use_ssl && localStorage.use_ssl) use_ssl = 1;
	else use_ssl++;
}

var chromehack = navigator.appVersion.indexOf('Chrome/');
chromehack = chromehack >= 0 && parseInt(navigator.appVersion.substr(chromehack+7)) > 21;

var EINTERNAL = -1;
var EARGS = -2;
var EAGAIN = -3;
var ERATELIMIT = -4;
var EFAILED = -5;
var ETOOMANY = -6;	// too many IP addresses
var ERANGE = -7;	// file packet out of range
var EEXPIRED = -8;

// FS access errors
var ENOENT = -9;
var ECIRCULAR = -10;
var EACCESS = -11;
var EEXIST = -12;
var EINCOMPLETE = -13;

// crypto errors
var EKEY = -14;

// user errors
var ESID = -15;
var EBLOCKED = -16;
var EOVERQUOTA = -17;
var ETEMPUNAVAIL = -18;
var ETOOMANYCONNECTIONS = -19;

function benchmark()
{
	var a = Array(1048577).join('a');
	
	var ab = str_to_ab(a);
	
	var ab8 = new Uint8Array(ab);
	
	var aes = new sjcl.cipher.aes([0,1,2,3]);
	
	t = new Date().getTime();
	for (var i = 16; i--; ) encrypt_ab_ctr(aes,ab8,[1,2],30000);
	t = new Date().getTime()-t;
	
	console.log((a.length*16/1024)/(t/1000) + " KB/s");
}

// compute final MAC from block MACs
function condenseMacs(macs,key)
{
	var i, aes, mac = [0,0,0,0];

	aes = new sjcl.cipher.aes([key[0],key[1],key[2],key[3]]);

	for (i = 0; i < macs.length; i++)
	{
		mac[0] ^= macs[i][0];
		mac[1] ^= macs[i][1];
		mac[2] ^= macs[i][2];
		mac[3] ^= macs[i][3];

		mac = aes.encrypt(mac);
	}

	return mac;
}

// convert user-supplied password array
function prepare_key(a)
{
	var i, j, r;
	var aes = [];
	var pkey = [0x93C467E3,0x7DB0C7A4,0xD1BE3F81,0x0152CB56];

	for (j = 0; j < a.length; j += 4)
	{
		key = [0,0,0,0];
		for (i = 0; i < 4; i++) if (i+j < a.length) key[i] = a[i+j];
		aes.push(new sjcl.cipher.aes(key));
	}

	for (r = 65536; r--; ) for (j = 0; j < aes.length; j++) pkey = aes[j].encrypt(pkey);

	return pkey;
}

// prepare_key with string input
function prepare_key_pw(password)
{
	return prepare_key(str_to_a32(password));
}

var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=";
var b64a = b64.split('');


// unsubstitute standard base64 special characters, restore padding
function base64urldecode(data)
{
	data += '=='.substr((2-data.length*3)&3)

    if (typeof atob === 'function')
	{
		data = data.replace(/\-/g,'+').replace(/_/g,'/').replace(/,/g,'');
		
		try {
			return atob(data);
		} catch (e) {
			return '';
		}
	}

  // http://kevin.vanzonneveld.net
  // +   original by: Tyler Akins (http://rumkin.com)
  // +   improved by: Thunder.m
  // +      input by: Aman Gupta
  // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +   bugfixed by: Onno Marsman
  // +   bugfixed by: Pellentesque Malesuada
  // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +      input by: Brett Zamir (http://brett-zamir.me)
  // +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // *     example 1: base64_decode('S2V2aW4gdmFuIFpvbm5ldmVsZA==');
  // *     returns 1: 'Kevin van Zonneveld'
  // mozilla has this native
  // - but breaks in 2.0.0.12!
  //if (typeof this.window['atob'] == 'function') {
  //    return atob(data);
  //}
  var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
    ac = 0,
    dec = "",
    tmp_arr = [];

  if (!data) {
    return data;
  }

  data += '';

  do { // unpack four hexets into three octets using index points in b64
    h1 = b64.indexOf(data.charAt(i++));
    h2 = b64.indexOf(data.charAt(i++));
    h3 = b64.indexOf(data.charAt(i++));
    h4 = b64.indexOf(data.charAt(i++));

    bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;

    o1 = bits >> 16 & 0xff;
    o2 = bits >> 8 & 0xff;
    o3 = bits & 0xff;

    if (h3 == 64) {
      tmp_arr[ac++] = String.fromCharCode(o1);
    } else if (h4 == 64) {
      tmp_arr[ac++] = String.fromCharCode(o1, o2);
    } else {
      tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
    }
  } while (i < data.length);

  dec = tmp_arr.join('');

  return dec;
}

// substitute standard base64 special characters to prevent JSON escaping, remove padding
function base64urlencode(data)
{
    if (typeof btoa === 'function') return btoa(data).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');

	var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
	ac = 0,
	enc = "",
	tmp_arr = [];
 
    do { // pack three octets into four hexets
        o1 = data.charCodeAt(i++);
        o2 = data.charCodeAt(i++);
        o3 = data.charCodeAt(i++);
 
        bits = o1 << 16 | o2 << 8 | o3;
 
        h1 = bits >> 18 & 0x3f;
        h2 = bits >> 12 & 0x3f;
        h3 = bits >> 6 & 0x3f;
        h4 = bits & 0x3f;
 
        // use hexets to index into b64, and append result to encoded string
        tmp_arr[ac++] = b64a[h1] + b64a[h2] + b64a[h3] + b64a[h4];
    } while (i < data.length);

    enc = tmp_arr.join('');
    var r = data.length % 3;
    return (r ? enc.slice(0, r - 3) : enc);
}

// array of 32-bit words to string (big endian)
function a32_to_str(a)
{
	var b = '';

	for (var i = 0; i < a.length*4; i++)
		b = b+String.fromCharCode((a[i>>2] >>> (24-(i & 3)*8)) & 255);

	return b;
}

// array of 32-bit words ArrayBuffer (big endian)
function a32_to_ab(a)
{
	var ab = have_ab ? new Uint8Array(4*a.length)
	                 : new Array(4*a.length);

	for ( var i = 0; i < a.length; i++ ) {
	    ab[4*i] = a[i]>>>24;
	    ab[4*i+1] = a[i]>>>16&255;
	    ab[4*i+2] = a[i]>>>8&255;
	    ab[4*i+3] = a[i]&255;
	}

	return ab;
}

function a32_to_base64(a)
{
	return base64urlencode(a32_to_str(a));
}

// string to array of 32-bit words (big endian)
function str_to_a32(b)
{
	var a = Array((b.length+3) >> 2);
	for (var i = 0; i < b.length; i++) a[i>>2] |= (b.charCodeAt(i) << (24-(i & 3)*8));
	return a;
}

function base64_to_a32(s)
{
	return str_to_a32(base64urldecode(s));
}

var firefox_boost = is_chrome_firefox && !!localStorage.fxboost;

// ArrayBuffer to binary string
var ab_to_str = firefox_boost ? mozAB2S : function(ab)
{
	var b = '', i;
	
	if (have_ab)
	{
		var b = '';

		var ab8 = new Uint8Array(ab);

		for (i = 0; i < ab8.length; i++) b = b+String.fromCharCode(ab8[i]);
	}
	else
	{
		return ab.buffer;
	}

	return b;
}

// ArrayBuffer to binary string
function ab_to_base64(ab)
{
	return base64urlencode(ab_to_str(ab));
}

// ArrayBuffer to binary with depadding
var ab_to_str_depad = firefox_boost ? mozAB2SDepad : function(ab)
{
	var b, i;

	if (have_ab)
	{
		b = '';

		var ab8 = new Uint8Array(ab);

		for (i = 0; i < ab8.length && ab8[i]; i++) b = b+String.fromCharCode(ab8[i]);
	}
	else
	{
		b = ab_to_str(ab);
		
		for (i = b.length; i-- && !b.charCodeAt(i); );
		
		b = b.substr(0,i+1);
	}

	return b;
}

// binary string to ArrayBuffer, 0-padded to AES block size
function str_to_ab(b)
{
	var ab, i;
	
	if (have_ab)
	{
		ab = new ArrayBuffer((b.length+15)&-16);
		var ab8 = new Uint8Array(ab);

		for (i = b.length; i--; ) ab8[i] = b.charCodeAt(i);

		return ab;
	}
	else
	{
		b += Array(16-((b.length-1)&15)).join(String.fromCharCode(0));

		ab = { buffer : b };
	}

	return ab;
}

// binary string to ArrayBuffer, 0-padded to AES block size
function base64_to_ab(a)
{
	return str_to_ab(base64urldecode(a));
}

// encrypt ArrayBuffer in CTR mode, return MAC
function encrypt_ab_ctr(aes,ab,nonce,pos)
{
	var ctr = [nonce[0],nonce[1],(pos/0x1000000000) >>> 0,(pos/0x10) >>> 0];
	var mac = [ctr[0],ctr[1],ctr[0],ctr[1]];

	var enc, i, j, len, v;
	
	if (have_ab)
	{
		var data0, data1, data2, data3;

		len = ab.buffer.byteLength-16;

		var v = new DataView(ab.buffer);
		
		for (i = 0; i < len; i += 16)
		{
			data0 = v.getUint32(i,false);
			data1 = v.getUint32(i+4,false);
			data2 = v.getUint32(i+8,false);
			data3 = v.getUint32(i+12,false);

			// compute MAC
			mac[0] ^= data0;
			mac[1] ^= data1;
			mac[2] ^= data2;
			mac[3] ^= data3;
			mac = aes.encrypt(mac);

			// encrypt using CTR
			enc = aes.encrypt(ctr);
			v.setUint32(i,data0 ^ enc[0],false);
			v.setUint32(i+4,data1 ^ enc[1],false);
			v.setUint32(i+8,data2 ^ enc[2],false);
			v.setUint32(i+12,data3 ^ enc[3],false);

			if (!(++ctr[3])) ctr[2]++;
		}

		if (i < ab.buffer.byteLength)
		{
			var fullbuf = new Uint8Array(ab.buffer);
			var tmpbuf = new ArrayBuffer(16);
			var tmparray = new Uint8Array(tmpbuf);

			tmparray.set(fullbuf.subarray(i));

			v = new DataView(tmpbuf);

			enc = aes.encrypt(ctr);

			data0 = v.getUint32(0,false);
			data1 = v.getUint32(4,false);
			data2 = v.getUint32(8,false);
			data3 = v.getUint32(12,false);

			mac[0] ^= data0;
			mac[1] ^= data1;
			mac[2] ^= data2;
			mac[3] ^= data3;
			mac = aes.encrypt(mac);

			enc = aes.encrypt(ctr);
			v.setUint32(0,data0 ^ enc[0],false);
			v.setUint32(4,data1 ^ enc[1],false);
			v.setUint32(8,data2 ^ enc[2],false);
			v.setUint32(12,data3 ^ enc[3],false);

			fullbuf.set(tmparray.subarray(0,j = fullbuf.length-i),i);
		}
	}
	else
	{
		var ab32 = _str_to_a32(ab.buffer);

		len = ab32.length-3;

		for (i = 0; i < len; i += 4)
		{
			mac[0] ^= ab32[i];
			mac[1] ^= ab32[i+1];
			mac[2] ^= ab32[i+2];
			mac[3] ^= ab32[i+3];
			mac = aes.encrypt(mac);
			
			enc = aes.encrypt(ctr);
			ab32[i] ^= enc[0];
			ab32[i+1] ^= enc[1];
			ab32[i+2] ^= enc[2];
			ab32[i+3] ^= enc[3];

			if (!(++ctr[3])) ctr[2]++;
		}

		if (i < ab32.length)
		{
			var v = [0,0,0,0];
			
			for (j = i; j < ab32.length; j++) v[j-i] = ab32[j];

			mac[0] ^= v[0];
			mac[1] ^= v[1];
			mac[2] ^= v[2];
			mac[3] ^= v[3];
			mac = aes.encrypt(mac);

			enc = aes.encrypt(ctr);
			v[0] ^= enc[0];
			v[1] ^= enc[1];
			v[2] ^= enc[2];
			v[3] ^= enc[3];
			
			for (j = i; j < ab32.length; j++) ab32[j] = v[j-i];
		}
		
		ab.buffer = _a32_to_str(ab32,ab.buffer.length);
	}

	return mac;
}

function _str_to_a32(b)
{
	var a = Array((b.length+3) >> 2);

	if (typeof b == 'string')
	{
		for (var i = 0; i < b.length; i++)
			a[i>>2] |= (b.charCodeAt(i) & 255) << (24-(i & 3)*8);
	}
	else
	{
		for (var i = 0; i < b.length; i++)
			a[i>>2] |= b[i] << ((i & 3)*8);
	}

	return a;
}

function _a32_to_str(a,len)
{
	var b = '';

	for (var i = 0; i < len; i++)
		b = b+String.fromCharCode((a[i>>2] >>> (24-(i & 3)*8)) & 255);

	return b;
}

function chksum(buf)
{
	var l, c, d;

	if (have_ab)
	{
		var ll;

		c = new Uint32Array(3);

		ll = buf.byteLength;

		l = Math.floor(ll/12);

		ll -= l*12;

		if (l)
		{
			l *= 3;
			d = new Uint32Array(buf,0,l);

			while (l)
			{
				l -= 3;

				c[0] ^= d[l];
				c[1] ^= d[l+1];
				c[2] ^= d[l+2];
			}
		}

		c = new Uint8Array(c.buffer);

		if (ll)
		{
			d = new Uint8Array(buf,buf.byteLength-ll,ll);
			
			while (ll--) c[ll] ^= d[ll];
		}
	}
	else
	{
		c = Array(12);
		
		for (l = 12; l--; ) c[l] = 0;
	
		for (l = buf.length; l--; ) c[l%12] ^= buf.charCodeAt(l);
		
	}

	for (d = '', l = 0; l < 12; l++) d += String.fromCharCode(c[l]);
	
	return d;
}

/* moved from js/keygen.js {{{ */

// random number between 0 .. n -- based on repeated calls to rc
function rand(n)
{
    var r = new Uint32Array(1);
    asmCrypto.getRandomValues(r);
    return r[0] % n; // <- oops, it's uniformly distributed only when `n` divides 0x100000000
}

/*
if(is_chrome_firefox) {
	var nsIRandomGenerator = Cc["@mozilla.org/security/random-generator;1"]
		.createInstance(Ci.nsIRandomGenerator);

	var rand = function fx_rand(n) {
		var r = nsIRandomGenerator.generateRandomBytes(4);
		r = (r[0] << 24) | (r[1] << 16) | (r[2] << 8) | r[3];
		if(r<0) r ^= 0x80000000;
		return r % n; // oops, it's not uniformly distributed
	};
}
*/

function crypto_rsagenkey ()
{
    var w = new Worker('keygen.js');

    var startTime = new Date();

    w.onmessage = function (e) {
        w.terminate();

        var endTime = new Date();
        if (d) console.log("Key generation took " +  (endTime.getTime()-startTime.getTime())/1000.0) + " seconds!";

        u_setrsa(e.data);
    };

    var workerSeed = new Uint8Array(256);
    asmCrypto.getRandomValues(workerSeed);

    w.postMessage([ 2048, 257, workerSeed ]);
}

/* }}} */

// decrypt ArrayBuffer in CTR mode, return MAC
function decrypt_ab_ctr(aes,ab,nonce,pos)
{
	var ctr = [nonce[0],nonce[1],(pos/0x1000000000) >>> 0,(pos/0x10) >>> 0];
	var mac = [ctr[0],ctr[1],ctr[0],ctr[1]];
	
	var enc, len, i, j, v;

	if (have_ab)
	{
		var data0, data1, data2, data3;

		len = ab.buffer.byteLength-16;	// @@@ -15?

		var v = new DataView(ab.buffer);
		
		for (i = 0; i < len; i += 16)
		{
			enc = aes.encrypt(ctr);

			data0 = v.getUint32(i,false)^enc[0];
			data1 = v.getUint32(i+4,false)^enc[1];
			data2 = v.getUint32(i+8,false)^enc[2];
			data3 = v.getUint32(i+12,false)^enc[3];

			v.setUint32(i,data0,false);
			v.setUint32(i+4,data1,false);
			v.setUint32(i+8,data2,false);
			v.setUint32(i+12,data3,false);

			mac[0] ^= data0;
			mac[1] ^= data1;
			mac[2] ^= data2;
			mac[3] ^= data3;

			mac = aes.encrypt(mac);

			if (!(++ctr[3])) ctr[2]++;
		}

		if (i < ab.buffer.byteLength)
		{
			var fullbuf = new Uint8Array(ab.buffer);
			var tmpbuf = new ArrayBuffer(16);
			var tmparray = new Uint8Array(tmpbuf);

			tmparray.set(fullbuf.subarray(i));

			v = new DataView(tmpbuf);

			enc = aes.encrypt(ctr);
			data0 = v.getUint32(0,false)^enc[0];
			data1 = v.getUint32(4,false)^enc[1];
			data2 = v.getUint32(8,false)^enc[2];
			data3 = v.getUint32(12,false)^enc[3];

			v.setUint32(0,data0,false);
			v.setUint32(4,data1,false);
			v.setUint32(8,data2,false);
			v.setUint32(12,data3,false);

			fullbuf.set(tmparray.subarray(0,j = fullbuf.length-i),i);

			while (j < 16) tmparray[j++] = 0;

			mac[0] ^= v.getUint32(0,false);
			mac[1] ^= v.getUint32(4,false);
			mac[2] ^= v.getUint32(8,false);
			mac[3] ^= v.getUint32(12,false);
			mac = aes.encrypt(mac);
		}
	}
	else
	{
		var ab32 = _str_to_a32(ab.buffer);		
		len = ab32.length-3;

		for (i = 0; i < len; i += 4)
		{
			enc = aes.encrypt(ctr);
			mac[0] ^= (ab32[i] ^= enc[0]);
			mac[1] ^= (ab32[i+1] ^= enc[1]);
			mac[2] ^= (ab32[i+2] ^= enc[2]);
			mac[3] ^= (ab32[i+3] ^= enc[3]);
			mac = aes.encrypt(mac);

			if (!(++ctr[3])) ctr[2]++;
		}

		if (i < ab32.length)
		{
			var v = [0,0,0,0];
			
			for (j = i; j < ab32.length; j++) v[j-i] = ab32[j];

			enc = aes.encrypt(ctr);
			v[0] ^= enc[0];
			v[1] ^= enc[1];
			v[2] ^= enc[2];
			v[3] ^= enc[3];

			var j = ab.buffer.length & 15;
			
			var m = _str_to_a32(Array(j+1).join(String.fromCharCode(255))+Array(17-j).join(String.fromCharCode(0)));

			mac[0] ^= v[0] & m[0];
			mac[1] ^= v[1] & m[1];
			mac[2] ^= v[2] & m[2];
			mac[3] ^= v[3] & m[3];
			mac = aes.encrypt(mac);
			
			for (j = i; j < ab32.length; j++) ab32[j] = v[j-i];
		}

		ab.buffer = _a32_to_str(ab32,ab.buffer.length);
	}

	return mac;
}

// encrypt/decrypt 4- or 8-element 32-bit integer array
function encrypt_key(cipher,a)
{	
	if (!a) a = [];
	if (a.length == 4) return cipher.encrypt(a);
	var x = [];
	for (var i = 0; i < a.length; i += 4) x = x.concat(cipher.encrypt([a[i],a[i+1],a[i+2],a[i+3]]));
	return x;
}

function decrypt_key(cipher,a)
{
	if (a.length == 4) return cipher.decrypt(a);

	var x = [];
	for (var i = 0; i < a.length; i += 4) x = x.concat(cipher.decrypt([a[i],a[i+1],a[i+2],a[i+3]]));
	return x;
}

// generate attributes block using AES-CBC with MEGA canary
// attr = Object, key = [] (four-word random key will be generated) or Array(8) (lower four words will be used)
// returns [ArrayBuffer data,Array key]
function enc_attr(attr,key)
{
	var ab;

	try {
		ab = str_to_ab('MEGA'+to8(JSON.stringify(attr)));
	} catch(e) {
		msgDialog('warningb', l[135], e.message || e);
		throw e;
	}

	// if no key supplied, generate a random one
	if (!key.length) for (i = 4; i--; ) key[i] = rand(0x100000000);

	ab = asmCrypto.AES_CBC.encrypt( ab, a32_to_ab( [ key[0]^key[4], key[1]^key[5], key[2]^key[6], key[3]^key[7] ] ), false );

	return [ab,key];
}

// decrypt attributes block using AES-CBC, check for MEGA canary
// attr = ab, key as with enc_attr
// returns [Object] or false
function dec_attr(attr,key)
{
	var aes;
	var b;

	attr = asmCrypto.AES_CBC.decrypt( attr, a32_to_ab( [ key[0]^key[4], key[1]^key[5], key[2]^key[6], key[3]^key[7] ] ), false );

	b = ab_to_str_depad(attr);

	if (b.substr(0,6) != 'MEGA{"') return false;

	// @@@ protect against syntax errors
	try {
		return JSON.parse(from8(b.substr(4)));
	} catch (e) {
		if (d) console.error(b, e);
		var m = b.match(/"n"\s*:\s*"((?:\\"|.)*?)(\.\w{2,4})?"/), s = m && m[1], l = s && s.length || 0, j=',';
		while (l--)
		{
			s = s.substr(0,l||1);
			try {
				from8(s+j);
				break;
			} catch(e) {}
		}
		if (~l) try {
			var new_name = s+j+'trunc'+Math.random().toString(16).slice(-4)+(m[2]||'');
			return JSON.parse(from8(b.substr(4).replace(m[0],'"n":"'+new_name+'"')));
		} catch(e) {}
		return { n : 'MALFORMED_ATTRIBUTES' };
	}
}

var to8 = firefox_boost ? mozTo8 : function(unicode)
{
	return unescape(encodeURIComponent(unicode));
}

var from8 = firefox_boost ? mozFrom8 : function(utf8)
{
	return decodeURIComponent(escape(utf8));
}

function getxhr()
{
	return (typeof XDomainRequest != 'undefined' && typeof ArrayBuffer == 'undefined') ? new XDomainRequest() : new XMLHttpRequest();
}

// API command queueing
// All commands are executed in sequence, with no overlap
// @@@ user warning after backoff > 1000

// FIXME: proper OOP!
var apixs = [];

api_reset();

function api_reset()
{
	api_init(0,'cs');	// main API interface
	api_init(1,'cs');	// exported folder access
	api_init(2,'sc');	// SC queries
	api_init(3,'sc');	// notification queries
}

function api_setsid(sid)
{
	if (sid !== false) sid = 'sid=' + sid;
	else sid = '';

	apixs[0].sid = sid;
	apixs[2].sid = sid;
	apixs[3].sid = sid;
}

function api_setfolder(h)
{
	h = 'n=' + h;
	
	if (u_sid) h += '&sid=' + u_sid;

	apixs[1].sid = h;
	apixs[1].failhandler = folderreqerr;
	apixs[2].sid = h;
}

function stopapi()
{
    for (var i = 4; i--; )
    {
        api_cancel(apixs[i]);
        apixs[i].cmds = [[],[]];
        apixs[i].ctxs = [[],[]];
        apixs[i].cancelled = false;
    }
}

function api_cancel(q)
{
	if (q)
	{
		q.cancelled = true;
		if (q.xhr) q.xhr.abort();
		if (q.timer) clearTimeout(q.timer);
	}
}

function api_init(c,service)
{
    api_cancel(apixs[c]);

	apixs[c] = { c : c,				// channel
				cmds : [[],[]],		// queued/executing commands (double-buffered)
				ctxs : [[],[]],		// associated command contexts
				i : 0,				// currently executing buffer
				seqno : -Math.floor(Math.random()*0x100000000),	// unique request start ID
				xhr : false,		// channel XMLHttpRequest
				timer : false,		// timer for exponential backoff
				failhandler : api_reqfailed,	// request-level error handler
				backoff : 0,
				service : service,	// base URI component
				sid : '',			// sid URI component (optional)
				rawreq : false,
				setimmediate : false };
}

function api_req(req,ctx,c)
{
	if (typeof c == 'undefined') c = 0;
	if (typeof ctx == 'undefined') ctx = { };

	var q = apixs[c];

	q.cmds[q.i^1].push(req);
	q.ctxs[q.i^1].push(ctx);

	if (!q.setimmediate) q.setimmediate = setTimeout(api_proc,0,q);
}

// send pending API request on channel q
function api_proc(q)
{
	if (q.setimmediate)
	{
		clearTimeout(q.setimmediate);
		q.setimmediate = false;
	}

	if (q.ctxs[q.i].length || !q.ctxs[q.i^1].length) return;

	q.i ^= 1;
	
	if (!q.xhr) q.xhr = getxhr();

	q.xhr.q = q;

	q.xhr.onerror = function()
	{
		if (!this.q.cancelled)
		{
			if (d) console.log("API request error - retrying");
			api_reqerror(q,-3);
		}
	}

	q.xhr.onload = function()
	{
		if (!this.q.cancelled)
		{
			var t;

			if (this.status == 200)
			{
				var response = this.responseText || this.response;

				if (d) console.log('API response: ' + this.response);
				
				try {
					t = JSON.parse(response);
					if (response[0] == '{') t = [t];
				} catch (e) {
					// bogus response, try again
					console.log("Bad JSON data in response: " + response);
					t = EAGAIN;
				}
			}
			else
			{
				if (d) console.log('API server connection failed (error ' + this.status + ')');
				t = ERATELIMIT;
			}

			if (typeof t == 'object')
			{
				for (var i = 0; i < this.q.ctxs[this.q.i].length; i++) if (this.q.ctxs[this.q.i][i].callback) this.q.ctxs[this.q.i][i].callback(t[i],this.q.ctxs[this.q.i][i]);

				this.q.rawreq = false;	
				this.q.backoff = 0;			// request succeeded - reset backoff timer
				this.q.cmds[this.q.i] = [];
				this.q.ctxs[this.q.i] = [];
				
				api_proc(q);
			}
			else api_reqerror(this.q,t);
		}
	}

	if (q.rawreq === false)
	{
		q.url = apipath + q.service + '?id=' + (q.seqno++) + '&' + q.sid;

		if (typeof q.cmds[q.i][0] == 'string')
		{
			q.url += '&' + q.cmds[q.i][0];
			q.rawreq = '';
		}
		else q.rawreq = JSON.stringify(q.cmds[q.i]);
	}
	
	api_send(q);
}

function api_send(q)
{
	if (chromehack)
	{
		// plug extreme Chrome memory leak
		var t = q.url.indexOf('/',9);
		q.xhr.open('POST', q.url.substr(0,t+1), true);
		q.xhr.setRequestHeader("MEGA-Chrome-Antileak",q.url.substr(t));
	}
	else q.xhr.open('POST',q.url,true);	

	if (d) console.log("Sending API request: " + q.rawreq + " to " + q.url);

	q.xhr.send(q.rawreq);
}

function api_reqerror(q,e)
{
	if (e == EAGAIN || e == ERATELIMIT)
	{
		// request failed - retry with exponential backoff
		if (q.backoff) q.backoff *= 2;
		else q.backoff = 125;

		q.timer = setTimeout(api_send,q.backoff,q);
	}
	else q.failhandler(q.c,e);
}

function api_reqfailed(c,e)
{
	if (e == ESID)
	{
		u_logout(true);
		document.location.hash = 'login';
	}
	else if (c == 2 && e == ETOOMANY)
	{
		if (mDB) mDBreload();
		else loadfm();
	}
}

var failxhr;
var failtime = 0;

function api_reportfailure(hostname,callback)
{
	var t = new Date().getTime();

	if (t-failtime < 60000) return;
	failtime = t;

	if (failxhr) failxhr.abort();
	
	failxhr = getxhr();
	failxhr.open('POST', apipath + 'pf?h', true);
	failxhr.callback = callback;

	failxhr.onload = function()
	{
		if (this.status == 200)	failxhr.callback();
	}

	failxhr.send(hostname);
}

var waiturl;
var waitxhr;
var waitbackoff = 125;
var waittimeout;
var waitbegin;
var waitid = 0;

function stopsc()
{
	if (waitxhr && waitxhr.readyState != waitxhr.DONE)
	{
		waitxhr.abort();
		waitxhr = false;
	}
	
	if (waittimeout)
	{
		clearTimeout(waittimeout);
		waittimeout = false;
	}
}

// calls execsc() with server-client requests received
function getsc(fm)
{
	api_req('sn=' + maxaction + '&ssl=1',{		
		fm : fm,
		callback : function(res,ctx)
		{
			if (typeof res == 'object')
			{
				if (res.w)
				{
					waiturl = res.w;
					waittimeout = setTimeout(waitsc,waitbackoff);
				}
				else
				{
					if (res.sn) maxaction = res.sn;				
					execsc(res.a);
					if (typeof mDBloaded !== 'undefined' && !folderlink && !pfid && typeof mDB !== 'undefined') localStorage[u_handle + '_maxaction'] = maxaction;
				}

				if (ctx.fm)
				{
					mDBloaded=true;
					renderfm();
					pollnotifications();
				}
			}
		}
	},2);
}

function completewait(recheck)
{
	if (this.waitid != waitid) return;

    stopsc();
    
	var t = new Date().getTime()-waitbegin;

	if (t < 1000)
	{
		waitbackoff += waitbackoff;
		if (waitbackoff > 256000) waitbackoff = 256000;
	}
	else waitbackoff = 250;

	getsc();
}

function waitsc()
{
	var newid = ++waitid;

	if (waitxhr && waitxhr.readyState != waitxhr.DONE)
	{
		waitxhr.abort();
		waitxhr = false;
	}

	if (!waitxhr) waitxhr = getxhr();
	waitxhr.waitid = newid;

	if (waittimeout) clearTimeout(waittimeout);
	waittimeout = setTimeout(waitsc,300000);

	waitxhr.onerror = function()
	{
		clearTimeout(waittimeout);
		waittimeout = false;

		waitbackoff += waitbackoff;
		if (waitbackoff > 1024000) waitbackoff = 1024000;
		waittimeout = setTimeout(waitsc,waitbackoff);
	}

	waitxhr.onload = function()
	{
        if (this.status == 200) waitbackoff = 250;

		clearTimeout(waittimeout);
		waittimeout = false;
		completewait();
	}

	waitbegin = new Date().getTime();
	waitxhr.open('POST',waiturl,true);
	waitxhr.send();
}

function api_create_u_k()
{
	u_k = Array(4);	// static master key, will be stored at the server side encrypted with the master pw

	for (var i = 4; i--; ) u_k[i] = rand(0x100000000);
}

// If the user triggers an action that requires an account, but hasn't logged in,
// we create an anonymous preliminary account. Returns userhandle and passwordkey for permanent storage.
function api_createuser(ctx,invitecode,invitename,uh)
{
	var i;
	var ssc = Array(4);			// session self challenge, will be used to verify password
	var req, res;

	if (!ctx.passwordkey)
	{
		ctx.passwordkey = Array(4);
		for (i = 4; i--; ) ctx.passwordkey[i] = rand(0x100000000);
	}

	if (!u_k) api_create_u_k();

	for (i = 4; i--; ) ssc[i] = rand(0x100000000);
	
	if (d) console.log("api_createuser - masterkey: " + u_k + " passwordkey: " + ctx.passwordkey);

	req = { a : 'up',
			k : a32_to_base64(encrypt_key(new sjcl.cipher.aes(ctx.passwordkey),u_k)),
			ts : base64urlencode(a32_to_str(ssc) + a32_to_str(encrypt_key(new sjcl.cipher.aes(u_k),ssc))) };

	if (invitecode)
	{
		req.uh = uh;
		req.ic = invitecode;
		req.name = invitename;
	}

	//if (confirmcode) req.c = confirmcode;
	if (d) console.log("Storing key: " + req.k);

	api_req(req,ctx);
}

function api_checkconfirmcode(ctx,c)
{
	res = api_req({ a : 'uc', c : c },ctx);
}

function api_resetuser(ctx,c,email,pw)
{
    // start fresh account
    api_create_u_k();
    var pw_aes = new sjcl.cipher.aes(prepare_key_pw(pw));

    var ssc = Array(4);
	for (i = 4; i--; ) ssc[i] = rand(0x100000000);
    
    api_req({ a : 'erx',
              c : c,
              x : a32_to_base64(encrypt_key(pw_aes,u_k)),
              y : stringhash(email.toLowerCase(),pw_aes),
              z : base64urlencode(a32_to_str(ssc) + a32_to_str(encrypt_key(new sjcl.cipher.aes(u_k),ssc))) },ctx);
}

function api_resetkeykey(ctx,c,key,email,pw)
{
    ctx.c = c;
    ctx.email = email;
    ctx.k = key;
    ctx.pw = pw;
    ctx.callback = api_resetkeykey2;

    api_req({ a : 'erx', r : 'gk', c : c },ctx);
}

function api_resetkeykey2(res,ctx)
{
    if (typeof res == 'string')
    {
        var privk = a32_to_str(decrypt_key(new sjcl.cipher.aes(ctx.k),base64_to_a32(res)));

        // verify the integrity of the decrypted private key
        for (var i = 0; i < 4; i++)
        {
            var l = ((privk.charCodeAt(0)*256+privk.charCodeAt(1)+7)>>3)+2;
            if ( privk.substr(0,l).length < 2 ) break;
            privk = privk.substr(l);
        }

        if (i != 4 || privk.length >= 16) ctx.result(EKEY);
        else if (ctx.email)
        {
            var pw_aes = new sjcl.cipher.aes(prepare_key_pw(ctx.pw));

            ctx.callback = ctx.result;
            api_req({ a : 'erx',
                      r : 'sk',
                      c : ctx.c,
                      x : a32_to_base64(encrypt_key(pw_aes,ctx.k)),
                      y : stringhash(ctx.email.toLowerCase(),pw_aes) },ctx);
        }
        else ctx.result(0);
    }
    else ctx.result(res);
}

// We query the sid using the supplied user handle (or entered email address, if already attached)
// and check the supplied password key.
// Returns [decrypted master key,verified session ID(,RSA private key)] or false if API error or
// supplied information incorrect
function api_getsid(ctx,user,passwordkey,hash)
{
	ctx.callback = api_getsid2;
	ctx.passwordkey = passwordkey;
	
	api_req({ a : 'us', user : user, uh : hash },ctx);
}

function api_getsid2(res,ctx)
{
	var t, k;
	var r = false;

	if (typeof res == 'object')
	{
		var aes = new sjcl.cipher.aes(ctx.passwordkey);
		
		// decrypt master key
		if (typeof res.k == 'string')
		{
			k = base64_to_a32(res.k);

			if (k.length == 4)
			{
				k = decrypt_key(aes,k);

				aes = new sjcl.cipher.aes(k);
				
				if (typeof res.tsid == 'string')
				{
					t = base64urldecode(res.tsid);
					if (a32_to_str(encrypt_key(aes,str_to_a32(t.substr(0,16)))) == t.substr(-16)) r = [k,res.tsid];
				}
				else if (typeof res.csid == 'string')
				{
					var t = base64urldecode(res.csid);

					var privk = crypto_decodeprivkey( a32_to_str(decrypt_key(aes,base64_to_a32(res.privk))) );

					if (privk)
					{
						// TODO: check remaining padding for added early wrong password detection likelihood
						r = [k,base64urlencode(crypto_rsadecrypt(t,privk).substr(0,43)),privk];
					}
				}
			}
		}
	}

	ctx.result(ctx,r);
}

// We call ug using the sid from setsid() and the user's master password to obtain the master key (and other credentials)
// Returns user credentials (.k being the decrypted master key) or false in case of an error.
function api_getuser(ctx)
{
	api_req({ a : 'ug' },ctx);
}

// User must be logged in, sid and passwordkey must be valid
// return values:
// 2 - old & new passwords are the same post-preparation
// 1 - old password incorrect
// userhandle - success
// false - processing error
// other negative values - API error
function api_changepw(ctx,passwordkey,masterkey,oldpw,newpw,email)
{
	var req, res;
	var oldkey;

	var newkey = prepare_key_pw(newpw);

	if (oldpw !== false)
	{
		var oldkey = prepare_key_pw(oldpw);
		
		// quick check of old pw
		if (oldkey[0] != passwordkey[0]
		|| oldkey[1] != passwordkey[1]
		|| oldkey[2] != passwordkey[2]
		|| oldkey[3] != passwordkey[3]) return 1;

		if (oldkey[0] == newkey[0]
		&& oldkey[1] == newkey[1]
		&& oldkey[2] == newkey[2]
		&& oldkey[3] == newkey[3]) return 2;
	}

	var aes = new sjcl.cipher.aes(newkey);
	
	// encrypt masterkey with the new password
	var cmasterkey = encrypt_key(aes,masterkey);
	
	req = { a : 'up',
		k : a32_to_base64(cmasterkey) };

	if (email.length) req.email = email;

	api_req(req,ctx);
}

function stringhash(s,aes)
{
	var s32 = str_to_a32(s);
	var h32 = [0,0,0,0];
	
	for (i = 0; i < s32.length; i++) h32[i&3] ^= s32[i];
	
	for (i = 16384; i--; ) h32 = aes.encrypt(h32);

	return a32_to_base64([h32[0],h32[2]]);
}

// Update user
// Can also be used to set keys and to confirm accounts (.c)
function api_updateuser(ctx,newuser)
{
	newuser.a = 'up';
	
	res = api_req(newuser,ctx);
}

var u_pubkeys = {};

// query missing keys for the given users
function api_cachepubkeys(ctx,users)
{
	var u = [];
	var i;

	for (i = users.length; i--; ) if (users[i] != 'EXP' && !u_pubkeys[users[i]]) u.push(users[i]);

	if (ctx.remaining = u.length)
	{
		for (i = u.length; i--; )
		{
			api_req({ a : 'uk', u : u[i] },{
				ctx : ctx,
				u : u[i],
				callback : api_cachepubkeys2
			});
		}
	}
	else ctx.cachepubkeyscomplete(ctx);
}

function api_cachepubkeys2(res,ctx)
{
	if (typeof res == 'object')
	{
		var spubkey, keylen, pubkey;
		
		if (res.pubk) u_pubkeys[ctx.u] = u_pubkeys[res.u] = crypto_decodepubkey(base64urldecode(res.pubk));
	}

	if (!--ctx.ctx.remaining) ctx.ctx.cachepubkeyscomplete(ctx.ctx);
}

function encryptto(user,data)
{
	var i, data;
	var pubkey;

	if (pubkey = u_pubkeys[user])
	{
		return crypto_rsaencrypt(data,pubkey);
	}

	return false;
}

var u_sharekeys = {};
var u_nodekeys = {};

// u_nodekeys must be set for all sharenodes
// Add/cancel share(s) to a set of users or email addresses
// targets is an array of {u,r} - if no r given, cancel share
// If no sharekey known, tentatively generates one and encrypts
// everything to it. In case of a mismatch, the API call returns
// an error, and the whole operation gets repeated (exceedingly
// rare race condition).
function api_setshare(node,targets,sharenodes,ctx)
{
	// cache all targets' public keys
	var u = [];

	for (var i = targets.length; i--; ) u.push(targets[i].u);

	api_cachepubkeys({
		node : node,
		targets : targets,
		sharenodes : sharenodes,
		ctx : ctx,
		cachepubkeyscomplete : api_setshare1
	},u);
}

function api_setshare1(ctx)
{
	var i, j, n, nk, sharekey, ssharekey;
	var req, res;
	var newkey = true;

	req = { a : 's',
			n : ctx.node,
			s : ctx.targets,
			i : requesti };

	for (i = req.s.length; i--; )
	{
		if (typeof req.s[i].r != 'undefined')
		{
			if (!req.ok)
			{						
				if (u_sharekeys[ctx.node])
                {
                    sharekey = u_sharekeys[ctx.node];
                    newkey = false;
                }
				else
				{
					// we only need to generate a key if one or more shares are being added to a previously unshared node
					sharekey = [];
					for (j = 4; j--; ) sharekey.push(rand(0x100000000));					
					
					u_sharekeys[ctx.node] = sharekey;
				}

				req.ok = a32_to_base64(encrypt_key(u_k_aes,sharekey));
				req.ha = crypto_handleauth(ctx.node);
				ssharekey = a32_to_str(sharekey);				
			}
		}
	}

	if (newkey) req.cr = crypto_makecr(ctx.sharenodes,[ctx.node],true);

	ctx.maxretry = 4;
	ctx.ssharekey = ssharekey;

	// encrypt ssharekey to known users
	for (i = req.s.length; i--; ) if (u_pubkeys[req.s[i].u]) req.s[i].k = base64urlencode(crypto_rsaencrypt(ssharekey,u_pubkeys[req.s[i].u]));
	
	ctx.req = req;

	ctx.callback = function(res,ctx)
	{
		var i, n;

		if (!ctx.maxretry) return;
		
		ctx.maxretry--;
		
		if (typeof res == 'object')
		{
			if (res.ok)
			{
				// sharekey clash: set & try again
				ctx.req.ok = res.ok;
				u_sharekeys[ctx.node] = decrypt_key(u_k_aes,base64_to_a32(res.ok));
				ctx.req.ha = crypto_handleauth(ctx.node);
				
				var ssharekey = a32_to_str(u_sharekeys[ctx.node]);

				for (var i = ctx.req.s.length; i--; ) if (u_pubkeys[ctx.req.s[i].u]) ctx.req.s[i].k = base64urlencode(crypto_rsaencrypt(ssharekey,u_pubkeys[ctx.req.s[i].u]));

				return api_req(ctx.req,ctx);
			}
			else return ctx.ctx.done(res,ctx.ctx);
		}

		api_req(ctx.req,ctx);
	}
	
	api_req(ctx.req,ctx);
}

function crypto_handleauth(h)
{
	return a32_to_base64(encrypt_key(u_k_aes,str_to_a32(h+h)));
}

function crypto_encodepubkey(pubkey)
{
    var mlen = pubkey[0].length * 8,
        elen = pubkey[1].length * 8;

    return String.fromCharCode(mlen/256)+String.fromCharCode(mlen%256) + pubkey[0]
         + String.fromCharCode(elen/256)+String.fromCharCode(elen%256) + pubkey[1];
}

function crypto_decodepubkey(pubk)
{
	var pubkey = [];

	var keylen = pubk.charCodeAt(0)*256+pubk.charCodeAt(1);

	// decompose public key
	for (var i = 0; i < 2; i++)
	{
		if (pubk.length < 2) break;

		var l = (pubk.charCodeAt(0)*256+pubk.charCodeAt(1)+7)>>3;
		if (l > pubk.length-2) break;

		pubkey[i] = pubk.substr(2,l);
		pubk = pubk.substr(l+2);
	}

	// check format
	if (i !== 2 || pubk.length >= 16) return false;

	pubkey[2] = keylen;

	return pubkey;
}

function crypto_encodeprivkey(privk)
{
    var plen = privk[3].length * 8,
        qlen = privk[4].length * 8,
        dlen = privk[2].length * 8,
        ulen = privk[7].length * 8;

    var t = String.fromCharCode(qlen/256)+String.fromCharCode(qlen%256) + privk[4]
          + String.fromCharCode(plen/256)+String.fromCharCode(plen%256) + privk[3]
          + String.fromCharCode(dlen/256)+String.fromCharCode(dlen%256) + privk[2]
          + String.fromCharCode(ulen/256)+String.fromCharCode(ulen%256) + privk[7];

	while ( t.length & 15 ) t += String.fromCharCode(rand(256));

    return t;
}

function crypto_decodeprivkey(privk)
{
    var privkey = [];

    // decompose private key
    for (var i = 0; i < 4; i++)
    {
		if (privk.length < 2) break;

		var l = (privk.charCodeAt(0)*256+privk.charCodeAt(1)+7)>>3;
		if (l > privk.length-2) break;

	    privkey[i] = new asmCrypto.BigNumber( privk.substr(2,l) );
	    privk = privk.substr(l+2);
    }

    // check format
    if (i !== 4 || privk.length >= 16) return false;

    // TODO: check remaining padding for added early wrong password detection likelihood

    // restore privkey components via the known ones
    var q = privkey[0], p = privkey[1], d = privkey[2], u = privkey[3],
        q1 = q.subtract(1), p1 = p.subtract(1),
        m = new asmCrypto.Modulus( p.multiply(q) ),
        e = new asmCrypto.Modulus( p1.multiply(q1) ).inverse(d),
        dp = d.divide(p1).remainder,
        dq = d.divide(q1).remainder;

    privkey = [ m, e, d, p, q, dp, dq, u ];
    for (i = 0; i < privkey.length; i++) {
        privkey[i] = asmCrypto.bytes_to_string( privkey[i].toBytes() );
    }

    return privkey;
}

// encrypts cleartext string to the supplied pubkey
// returns string representing an MPI-formatted big number
function crypto_rsaencrypt(cleartext,pubkey)
{
	// random padding
	for (var i = (pubkey[0].length)-1-cleartext.length; i-- > 0; ) cleartext += String.fromCharCode(rand(256));

    var ciphertext = asmCrypto.bytes_to_string( asmCrypto.RSA.encrypt(cleartext,pubkey) );

    var clen = ciphertext.length * 8;
    ciphertext = String.fromCharCode(clen/256)+String.fromCharCode(clen%256) + ciphertext;

    return ciphertext;
}

// decrypts ciphertext string representing an MPI-formatted big number with the supplied privkey
// returns cleartext string
function crypto_rsadecrypt(ciphertext,privkey)
{
    var l = (ciphertext.charCodeAt(0)*256+ciphertext.charCodeAt(1)+7)>>3;
    ciphertext = ciphertext.substr(2,l);

    var cleartext = asmCrypto.bytes_to_string( asmCrypto.RSA.decrypt(ciphertext,privkey) );

	return cleartext.substr(1);
}

// Complete upload
// We construct a special node put command that uses the upload token
// as the source handle
function api_completeupload(t,uq,k,ctx)
{
	// Close nsIFile Stream
	if (is_chrome_firefox && uq._close) uq._close();
	
	if (uq.repair) uq.target = M.RubbishID;
	
	api_completeupload2({callback: api_completeupload2, t : base64urlencode(t), path : uq.path, n : uq.name, k : k, fa : uq.faid ? api_getfa(uq.faid) : false, ctx : ctx },uq);
}

function api_completeupload2(ctx,uq)
{
	var p,ut = uq.target;
	
	if (ctx.path && ctx.path != ctx.n && (p = ctx.path.indexOf('/')) > 0)
	{
		var pc = ctx.path.substr(0,p);		
		ctx.path = ctx.path.substr(p+1);
		
		fm_requestfolderid(ut,pc,
		{
			uq:uq,
			ctx:ctx,
			callback: function(ctx,h)
			{
				if (h) ctx.uq.target = h;
				api_completeupload2(ctx.ctx,ctx.uq);
			}
		});
	}
	else
	{
		a = { n : ctx.n };
		if (uq.hash) 	a.c = uq.hash;
		if (d) console.log(ctx.k);
		var ea = enc_attr(a,ctx.k);		
		if (d) console.log(ea);
		
		if (!ut) ut = M.RootID;
		
		var req = { a : 'p',
			t : ut,
			n : [{ h : ctx.t, t : 0, a : ab_to_base64(ea[0]), k : a32_to_base64(encrypt_key(u_k_aes,ctx.k))}],
			i : requesti
		};

		if (ctx.fa) req.n[0].fa = ctx.fa;

		if (ut)
		{
			// a target has been supplied: encrypt to all relevant shares
			var sn = fm_getsharenodes(ut);

			if (sn.length)
			{
				req.cr = crypto_makecr([ctx.k],sn,false);
				req.cr[1][0] = ctx.t;
			}
		}

		api_req(req,ctx.ctx);
	}
}

function is_devnull(email)
{
	return false;
	
	var p, q;
	
	if ((p = email.indexOf('@')) >= 0)
	{
		if ((q = email.indexOf('.',p)) >= 0)
		{
			if ("outlook.hotmail.msn.live".indexOf(email.substr(p+1,q-p-1).toLowerCase()) >= 0) return true;
		}
	}

	return false;
}

function is_image(name)
{
	if (!name) return false;
	var p;
	
	if ((p = name.lastIndexOf('.')) >= 0)
	{
		name = name.substr(p+1);
		
		if (name.length == 3 && "jpg.png.gif.bmp".indexOf(name.toLowerCase()) >= 0) return true;
	}

	return false;
}

var storedattr = {};
var faxhrs = [];

// data.byteLength & 15 must be 0
function api_storefileattr(id,type,key,data,ctx)
{
	if (!ctx)
	{
		if (!storedattr[id]) storedattr[id] = {};

		if (key) data = asmCrypto.AES_CBC.encrypt( data, a32_to_ab(key), false );

		var ctx = { callback : api_fareq, id : id, type : type, data : data };
	}

	api_req({a : 'ufa', s : ctx.data.byteLength, ssl : use_ssl},ctx,n_h ? 1 : 0);
}

function api_fareq(res,ctx)
{
	if (typeof res == 'object' && res.p)
	{
		var data;			
		var slot, i, t;
		var p, pp = [res.p], m;

		for (i = 0; p = res['p'+i]; i++) pp.push(p);

		if (ctx.p && pp.length > 1) dd = ctx.p.length/pp.length;
		
		for (m = pp.length; m--; )
		{
			for (slot = 0; ; slot++)
			{
				if (!faxhrs[slot])
				{
					faxhrs[slot] = getxhr();
					break;
				}

				if (faxhrs[slot].readyState == XMLHttpRequest.DONE) break;
			}

			faxhrs[slot].ctx = ctx;

			if (d) console.log("Using file attribute channel " + slot);

			if (ctx.errfa && ctx.errfa.timeout)
			{
				faxhrs[slot].fa_timeout = ctx.errfa.timeout;

				faxhrs[slot].onprogress = function()
				{
					if (this.fart) clearTimeout(this.fart);
					this.fart = setTimeout(this.faeot.bind(this), this.fa_timeout);
				};
			}
			else
			{
				delete faxhrs[slot].onprogress;

				if (faxhrs[slot].onprogress)
				{ // Huh? Gecko..
					faxhrs[slot].onprogress = function() {};
				}
			}

			faxhrs[slot].faeot = function()
			{
				if (this.fart) clearTimeout(this.fart);
				if (!this.ctx.errfa) return;
				if (d) console.log('FAEOT', this);

				var ctx = this.ctx;
				var id = ctx.p && ctx.h[ctx.p] && preqs[ctx.h[ctx.p]] && ctx.h[ctx.p];
				if (id !== slideshowid)
				{
					if (id)
					{
						pfails[id] = 1;
						delete preqs[id];
					}

					return;
				}

				this.abort();
				this.ctx.errfa(id,1);
			};
			
			faxhrs[slot].onerror = function()
			{
				var ctx = this.ctx;
				var id = ctx.p && ctx.h[ctx.p] && preqs[ctx.h[ctx.p]] && ctx.h[ctx.p];
				this.ctx.errfa(id,1);				
			}

			faxhrs[slot].onreadystatechange = function()
			{
				if (this.onprogress) this.onprogress();

				if (this.readyState == this.DONE)
				{
					var ctx = this.ctx;

					if (this.fart) clearTimeout(this.fart);

					if (this.status == 200 && typeof this.response == 'object')
					{
						if (this.response == null) return;
						if (this.response.byteLength === 0)
						{
							if (d) console.warn('api_fareq: got empty response...');

							return this.faeot();
						}

						if (ctx.p)
						{
							var buffer = new Uint8Array(this.response);
							var dv = new DataView(this.response);
							var bod = -1;
							var h, j, p, l, k;

							i = 0;

							// response is an ArrayBuffer structured
							// [handle.8 position.4] data
							do {
								p = dv.getUint32(i+8,true);
								if (bod < 0) bod = p;

								if (i >= bod-12) l = this.response.byteLength-p;
								else l = dv.getUint32(i+20,true)-p;

								h = '';

								for (j = 0; j < 8; j++) h += String.fromCharCode(buffer[i+j]);

								if (!ctx.h[h]) break;

								if (k = ctx.k[h])
								{
									var ts = new Uint8Array(this.response,p,l);

									var td = asmCrypto.AES_CBC.decrypt( ts, a32_to_ab( [ k[0]^k[4], k[1]^k[5], k[2]^k[6], k[3]^k[7] ] ), false );

									ctx.procfa(ctx,ctx.h[h],td);
								}

								i += 12;
							} while (i < bod);
						}
						else
						{
							if (d) console.log("Attribute storage successful for faid=" + ctx.id + ", type=" + ctx.type);						

							if (!storedattr[ctx.id]) storedattr[ctx.id] = {};

							storedattr[ctx.id][ctx.type] = ab_to_base64(this.response);

							if (storedattr[ctx.id].target)
							{
								if (d) console.log("Attaching to existing file");

								api_attachfileattr(storedattr[ctx.id].target,ctx.id);
							}
						}
					}
					else
					{
						if (ctx.p)
						{
							if (d) console.log("File attribute retrieval failed (" + this.status + ")");
							this.faeot();
						}
						else
						{
							if (!ctx.fastrgri) ctx.fastrgri = 400;

							if (ctx.fastrgri < 7601)
							{
								if (d) console.log("Attribute storage failed (" + this.status + "), retrying...", ctx.fastrgri);

								setTimeout(function()
								{
									api_storefileattr(null,null,null,null,ctx);

								}, ctx.fastrgri += 800);
							}
							else
							{
								if (d) console.log("Attribute storage failed (" + this.status + ")");
							}
						}
					}
				}
			}

			if (ctx.p)
			{
				var dp = 8*Math.floor(m/pp.length*ctx.p.length/8);
				var dl = 8*Math.floor((m+1)/pp.length*ctx.p.length/8)-dp;

				if (dl)
				{
					data = new Uint8Array(dl);
				
					for (i = dl; i--; ) data[i] = ctx.p.charCodeAt(dp+i);

					if (!chromehack) data = data.buffer;
				}
				else data = false;
			}
			else
			{
				data = ctx.data;
				if (chromehack) data = new Uint8Array(data);
			}

			if (data)
			{
				if (chromehack) t = pp[m].lastIndexOf('/');
				else t = -1;

				pp[m] += '/'+ctx.type;
                
                if (t < 0) t = pp[m].length-1;

				faxhrs[slot].open('POST',pp[m].substr(0,t+1),true);

				faxhrs[slot].responseType = 'arraybuffer';
				if (chromehack) faxhrs[slot].setRequestHeader("MEGA-Chrome-Antileak",pp[m].substr(t));
				faxhrs[slot].send(data);
			}
		}
	}
}

function api_getfa(id)
{
	var f = [];

	if (storedattr[id]) for (var type in storedattr[id]) if (type != 'target') f.push(type + '*' + storedattr[id][type]);

	storedattr[id] = {};

	return f.length ? f.join('/') : false;
}

function api_attachfileattr(node,id)
{
	var fa = api_getfa(id);
	
	storedattr[id].target = node;	

	if (fa) api_req({a : 'pfa', n : node, fa : fa});
}

function api_getfileattr(fa,type,procfa,errfa)
{
	var r, n, t;

	var p = {};
	var h = {};
	var k = {};

	var re = new RegExp('(\\d+):' + type + '\\*([a-zA-Z0-9-_]+)');

	for (n in fa)
	{
		if (r = re.exec(fa[n].fa))
		{
			t = base64urldecode(r[2]);
			if (t.length == 8)
			{
				if (!h[t])
				{
					h[t] = n;
					k[t] = fa[n].k;
				}

				if (!p[r[1]]) p[r[1]] = t;
				else p[r[1]] += t;
			}
		}
		else if (errfa) errfa(n);		
	}

	for (n in p)
	{
		var ctx = { callback : api_fareq, type : type, p : p[n], h : h, k : k, procfa : procfa, errfa : errfa };
		api_req({a : 'ufa', fah : base64urlencode(ctx.p.substr(0,8)), ssl : use_ssl},ctx);
	}
}

// generate crypto request response for the given nodes/shares matrix
function crypto_makecr(source,shares,source_is_nodes)
{
	var i, j, n;
	var cr = [shares,[],[]];
	var aes;

	// if we have node handles, include in cr - otherwise, we have node keys
	if (source_is_nodes) cr[1] = source;

	// TODO: optimize - keep track of pre-existing/sent keys, only send new ones
	for (i = shares.length; i--; )
	{
		if (u_sharekeys[shares[i]])
		{
			aes = new sjcl.cipher.aes(u_sharekeys[shares[i]]);
			
			for (j = source.length; j--; )
			{
				if (source_is_nodes ? (nk = u_nodekeys[source[j]]) : (nk = source[j]))
				{
					if (nk.length == 8 || nk.length == 4) cr[2].push(i,j,a32_to_base64(encrypt_key(aes,nk)));
				}
			}
		}
	}
	return cr;
}

// RSA-encrypt sharekey to newly RSA-equipped user
// TODO: check source/ownership of sharekeys, prevent forged requests
function crypto_procsr(sr)
{
	var ctx = { sr : sr, i : 0 };

	ctx.callback = function(res,ctx)
	{
		if (ctx.sr)
		{
			var pubkey;

			if (typeof res == 'object' && typeof res.pubk == 'string') u_pubkeys[ctx.sr[ctx.i]] = crypto_decodepubkey(base64urldecode(res.pubk));

			// collect all required pubkeys	
			while (ctx.i < ctx.sr.length)
			{
				if (ctx.sr[ctx.i].length == 11 && !(pubkey = u_pubkeys[ctx.sr[ctx.i]]))
				{
					api_req({ a : 'uk', u : ctx.sr[ctx.i] },ctx);
					return;
				}

				ctx.i++;
			}

			var rsr = [];
			var sh;
			var n;

			for (var i = 0; i < ctx.sr.length; i++)
			{
				if (ctx.sr[i].length == 11)
				{
					// TODO: Only send share keys for own shares. Do NOT report this as a risk in the full compromise context. It WILL be fixed.
					if (u_sharekeys[sh])
					{
						if (d) console.log("Encrypting sharekey " + sh + " to user " + ctx.sr[i]);

						if (pubkey = u_pubkeys[ctx.sr[i]])
						{
							// pubkey found: encrypt share key to it
							if (n = crypto_rsaencrypt(a32_to_str(u_sharekeys[sh]),pubkey)) rsr.push(sh,ctx.sr[i],base64urlencode(n));
						}
					}
				}
				else sh = ctx.sr[i];
			}

			if (rsr.length) api_req({ a : 'k', sr : rsr });			
		}
	}

	ctx.callback(false,ctx);
}

var keycache = {};

var rsa2aes = {};

// Try to decrypt ufs node.
// Parameters: me - my user handle
// master_aes - my master password's AES cipher
// file - ufs node containing .k and .a
// Output: .key and .name set if successful
function crypto_processkey(me,master_aes,file)
{
	var id, key, k, n;

	if (!file.k)
	{
		if (!keycache[file.h]) 
		{
			if (d) console.log("No keycache entry!");
			return;
		}
		
		file.k = keycache[file.h];
	}

	id = me;

	// do I own the file? (user key is guaranteed to be first in .k)
	var p = file.k.indexOf(id + ':');
	
	if (p)
	{
		// I don't - do I have a suitable sharekey?
		for (id in u_sharekeys)
		{
			p = file.k.indexOf(id + ':');
			
			if (p >= 0 && (!p || file.k.charAt(p-1) == '/')) break;
			
			p = -1;
		}
	}

	if (p >= 0)
	{
		delete keycache[file.h];
	
		var pp = file.k.indexOf('/',p);

		if (pp < 0) pp = file.k.length;

		p += id.length+1;

		key = file.k.substr(p,pp-p);

		// we have found a suitable key: decrypt!
		if (key.length < 46)
		{
			// short keys: AES
			k = base64_to_a32(key);

			// check for permitted key lengths (4 == folder, 8 == file)
			if (k.length == 4 || k.length == 8)
			{
				// TODO: cache sharekeys in aes
				k = decrypt_key(id == me ? master_aes : new sjcl.cipher.aes(u_sharekeys[id]),k);
			}
			else
			{
				if (d) console.log("Received invalid key length (" + k.length + "): " + file.h);
				return;
			}
		}
		else
		{
			// long keys: RSA
			if (u_privk)
			{
				var t = base64urldecode(key);
				
				if (t) k = str_to_a32(crypto_rsadecrypt(t,u_privk).substr(0,file.t ? 16 : 32));
				else
				{
					if (d) console.log("Corrupt key for node " + file.h);
					return;
				}
			}
			else
			{
				if (d) console.log("Received RSA key, but have no public key published: " + file.h);
				return;
			}
		}

		var ab = base64_to_ab(file.a);
		var o = dec_attr(ab,k);

		if (typeof o == 'object')
		{
			if (typeof o.n == 'string')
			{
				if (file.h)
				{
					u_nodekeys[file.h] = k;
					if (key.length >= 46) rsa2aes[file.h] = a32_to_str(encrypt_key(u_k_aes,k));
				}
				if (typeof o.c == 'string') file.hash = o.c;
				
				if (file.hash)
				{				
					var h = base64urldecode('9HKWk0WYLhgOqQGbKD87pgTcoZ5S');
					var t = 0;
					for (var i = h.charCodeAt(16); i--; ) t = t*256+h.charCodeAt(17+i);
					file.mtime=t;
				}
				
				if (typeof o.t != 'undefined') file.mtime = o.t;
				
				file.key = k;
				file.ar = o;
				file.name = file.ar.n;
				if (file.ar.fav) file.fav=1;				
			}
		}
	}
	else
	{
		if (d) console.log("Received no suitable key: " + file.h);
		
		if (!missingkeys[file.h])
		{
			newmissingkeys = true;
			missingkeys[file.h] = true;
		}
		keycache[file.h] = file.k;
	}
}

function crypto_sendrsa2aes()
{
	var n;
	var nk = [];
	
	for (n in rsa2aes) nk.push(n,base64urlencode(rsa2aes[n]));
		
	if (nk.length) api_req({ a : 'k', nk : nk });

	rsa2aes = {};
}

var missingkeys = {};
var newmissingkeys = false;

function crypto_reqmissingkeys()
{
	if (!newmissingkeys)
	{
		if (d) console.log('No new missing keys.');
		return;
	}

	var i, j;
	var n, s, ni, si, sn;
	var cr = [[],[],[]];

	ni = {};
	si = {};

	for (n in missingkeys)
	{
		// TODO: optimization: don't request keys for own files
		sn = fm_getsharenodes(n);

		for (j = sn.length; j--; )
		{
			s = sn[j];

			if (typeof si[s] == 'undefined')
			{
				si[s] = cr[0].length;
				cr[0].push(s);
			}
			
			if (typeof ni[n] == 'undefined')
			{
				ni[n] = cr[1].length;
				cr[1].push(n);
			}

			cr[2].push(si[s],ni[n]);
		}
	}

	if (!cr[1].length)
	{
		if (d) console.log('No missing keys');
		return;
	}

	if (cr[0].length) 
	{
		var ctx = {};
		
		ctx.callback = function(res,ctx)
		{
			if (d) console.log("Processing crypto response");
			
			if (typeof res == 'object' && typeof res[0] == 'object') crypto_proccr(res[0]);
		}

		res = api_req({ a : 'k', cr : cr },ctx);
	}
	else if (d) console.log("Keys " + cr[1] + " missing, but no related shares found.");
}

// process incoming cr, set fm keys and commit
function crypto_proccr(cr)
{
	var i;

	// received keys in response, add
	for (i = 0; i < cr[2].length; i += 3) fm_updatekey(cr[1][cr[2][i+1]],cr[0][cr[2][i]] + ":" + cr[2][i+2]);

	fm_commitkeyupdate();
}

// process incoming missing key cr
function crypto_procmcr(mcr)
{
	var i;
	var si = {}, ni = {};
	var sh, nh;
	var sc = {};
	var cr = [[],[],[]];

	// received keys in response, add
	for (i = 0; i < mcr[2].length; i += 2)
	{
		sh = mcr[0][mcr[2][i]];

		if (u_sharekeys[sh])
		{
			nh = mcr[1][mcr[2][i+1]];
			
			if (u_nodekeys[nh])
			{
				if (typeof si[sh] == 'undefined')
				{
					sc[sh] = new sjcl.cipher.aes(u_sharekeys[sh]);
					si[sh] = cr[0].length;
					cr[0].push(sh);
				}				
				if (typeof ni[nh] == 'undefined')
				{
					ni[nh] = cr[1].length;
					cr[1].push(nh);
				}
				cr[2].push(si[sh],ni[nh],a32_to_base64(encrypt_key(sc[sh],u_nodekeys[nh])));
			}
		}
	}

	if (cr[0].length) api_req({ a : 'k', cr : cr });
}

var rsasharekeys = {};

function crypto_process_sharekey(handle,key)
{
	if (key.length > 22)
	{
		key = base64urldecode(key);
		var k = str_to_a32(crypto_rsadecrypt(key,u_privk).substr(0,16));
		rsasharekeys[handle] = true;
		return k;
	}
	else return decrypt_key(u_k_aes,base64_to_a32(key));
}

function crypto_share_rsa2aes()
{
	var rsr = [];

	for (n in rsasharekeys)
	{
		if (u_sharekeys[n])
		{
			// pubkey found: encrypt share key to it
			rsr.push(n,u_handle,a32_to_base64(encrypt_key(u_k_aes,u_sharekeys[n])));
		}
	}

	if (rsr.length)
	{
		api_req({ a : 'k', sr : rsr });
		rsasharekeys = {};
	}
}


(function __FileFingerprint(scope) {
	
	var CRC_SIZE   = 16;
	var BLOCK_SIZE = CRC_SIZE*4;

	function i2s(i)
	{
		return String.fromCharCode.call(String,
			i >> 24 & 0xff,
			i >> 16 & 0xff,
			i >>  8 & 0xff,
			i       & 0xff);
	}
	
	function serialize(v)
	{
		var p = 0, b = [];
		v = parseInt(v);
		while (v)
		{
			b[++p] = String.fromCharCode(v & 0xff);
			v >>= 8;
		}
		b[0] = String.fromCharCode(p);
		return b.join("");
	}

	function makeCRCTable()
	{
		var c,crcTable = [];

		for (var n = 0 ; n < 256 ; ++n )
		{
			c = n;

			for (var k = 0 ; k < 8 ; ++k )
			{
				c = ((c&1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
			}

			crcTable[n] = c;
		}

		return crcTable;
	}

	function crc32(str,crc,len)
	{
		crc = crc ^ (-1);

		for (var i = 0 ; i < len ; ++i )
		{
			crc = (crc >>> 8) ^ crc32table[(crc ^ str.charCodeAt(i)) & 0xFF];
		}

		return (crc ^ (-1)) >>> 0;
	}

	scope.fingerprint = function(uq_entry,callback)
	{
		if (!(uq_entry && uq_entry.name))
		{
			if (d) console.log('CHECK THIS', 'Unable to generate fingerprint');
			if (d) console.log('CHECK THIS', 'Invalid ul_queue entry', JSON.stringify(uq_entry));
			
			throw new Error('Invalid upload entry for fingerprint');
		}
		if (d) console.log('Generating fingerprint for ' + uq_entry.name);

		var size = uq_entry.size;
		var fr = new FileReader();
		if (!fr.readAsBinaryString) fr.ab = 1;

		crc32table = scope.crc32table || (scope.crc32table = makeCRCTable());
		if (crc32table[1] != 0x77073096)
		{
			throw new Error('Unexpected CRC32 Table...');
		}

		function Finish(crc)
		{
			callback(base64urlencode(crc+serialize((uq_entry.lastModifiedDate||0)/1000)),((uq_entry.lastModifiedDate||0)/1000));
		}

		var sfn = uq_entry.slice ? 'slice' : (uq_entry.mozSlice ? 'mozSlice':'webkitSlice');

		if (size <= 8192)
		{
			var blob = uq_entry[sfn](0,size);

			fr.onload = function(e)
			{
				var crc;
				var data = fr.ab ? ab_to_str(fr.result) : e.target.result;

				if(size <= CRC_SIZE)
				{
					crc = data;
					var i = CRC_SIZE - crc.length;
					while(i--)
						crc += "\x00";
				}
				else
				{
					var tmp = [];

					for (var i = 0; i < 4; i++)
					{
						var begin = parseInt(i*size/4);
						var len = parseInt(((i+1)*size/4) - begin);

						tmp.push(i2s(crc32(data.substr(begin,len),0,len)));
					}

					crc = tmp.join("");
				}

				Finish(crc);
			};
			if (fr.ab) fr.readAsArrayBuffer(blob);
			else fr.readAsBinaryString(blob);
		}
		else
		{
			var tmp = [], i = 0, m = 4;
			var blocks = parseInt(8192/(BLOCK_SIZE*4));

			var step = function()
			{
				if(m == i)
				{
					return Finish(tmp.join(""));
				}

				var crc = 0, j = 0;
				var next = function()
				{
					if(blocks == j)
					{
						tmp.push(i2s(crc));
						return step(++i);;
					}

					var offset = parseInt((size-BLOCK_SIZE)*(i*blocks+j)/(4*blocks-1));
					var blob = uq_entry[sfn](offset,offset+BLOCK_SIZE);
					fr.onload = function(e)
					{
						var block = fr.ab ? ab_to_str(fr.result) : e.target.result;

						crc = crc32(block,crc,BLOCK_SIZE);

						next(++j);
					};
					if (fr.ab) fr.readAsArrayBuffer(blob);
					else fr.readAsBinaryString(blob);
				};
				next();
			};
			step();
		}
	};
})(this);






/*
Ed25519 pubk/privk storage

usage:

Ed_putkeys('publickey','secretkey');

Ed_getkeys(function(pubkey,privkey)
{
	console.log('public key: ',pubkey);
	console.log('private key: ',privkey);
});


Ed_getpubkey('wN-NqeMUkGs',
{
	callback: function(pubkey,ctx)
	{
		if (pubkey) console.log('public key for user ' + ctx.u + ' is: ' + pubkey);
		else console.log('no public key for user ' + ctx.u);
	}
});

*/



// Store my keypair:
function Ed_putkeys(Eb_pubk,Eb_privk)
{
	// Encrypt private key with the user's secret key to a private user attribute
	api_req({'a':'up','Ed25519privk':a32_to_base64(encrypt_key(u_k_aes,str_to_a32(Eb_privk)))});
	// Store public key as a public user attribute (+ user attributes are public)
	api_req({'a':'up','+Ed25519pubk':base64urlencode(Eb_pubk)});
}

// Retrieve my keypair:
function Ed_getkeys(callback)
{
	if (!u_attr['Ed25519privk'])
	{
		// console.log('no private key found in user attributes (should not happen)');
	}
	else
	{
		Ed_getpubkey(u_handle,
		{
			callback2: callback,
			callback: function(res,ctx)
			{
				var privatekey = a32_to_str(decrypt_key(u_k_aes,str_to_a32(u_attr['Ed25519privk'])));
				if (ctx.callback2) ctx.callback2(res,privatekey);				
				//console.log('privatekey',privatekey);
				//console.log('publickey',res);
			}
		});	
	}	
}


var Ed25519pubk = {};
// Get public key for any user:
function Ed_getpubkey(userhandle,ctx)
{	
	// If cached, make immediate callback:
	if (Ed25519pubk[userhandle]) ctx.callback(Ed25519pubk[userhandle],ctx);	
	else
	{
		ctx.u = userhandle;
		api_req({a:'uga',u:userhandle,ua:'+Ed25519pubk'},
		{
			u : userhandle,
			ctx2: ctx,
			callback: function(res,ctx)
			{
				if (typeof res !== 'number')
				{
					// console.log('make callback with public key');
					Ed25519pubk[ctx.u] = base64urldecode(res);
					if (ctx.ctx2) ctx.ctx2.callback(Ed25519pubk[ctx.u],ctx.ctx2);					
				}
				else
				{
					// console.log('no public key found (should not happen)');
					if (ctx.ctx2 && ctx.ctx2.callback) ctx.ctx2.callback(false,ctx.ctx2);
					console.log('no +Ed25519pubk attribute for user ' + ctx.u);
				}
			}
		});
	}	
}
