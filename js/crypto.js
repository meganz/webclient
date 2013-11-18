



window.URL = window.URL || window.webkitURL;
var have_ab = typeof ArrayBuffer != 'undefined' && typeof DataView != 'undefined';
var use_workers = have_ab && typeof Worker != 'undefined';

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
//else if ((navigator.userAgent.indexOf('Chrome/') >= 0) && (document.location.hash.indexOf('#!') >= 0)) use_ssl = 0;
else use_ssl++;


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
	var i, aes;
	mac = [0,0,0,0];

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

// ArrayBuffer to binary string
function ab_to_str(ab)
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
function ab_to_str_depad(ab)
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

// encrypt ArrayBuffer in CBC mode (zero IV)
function encrypt_ab_cbc(cipher,ab)
{
	if (have_ab)
	{
		var v = new DataView(ab);
		var iv = [0,0,0,0], d = Array(4);
		var i;
		
		for (i = 0; i < ab.byteLength; i += 16)
		{
			d[0] = v.getUint32(i,false) ^ iv[0];
			d[1] = v.getUint32(i+4,false) ^ iv[1];
			d[2] = v.getUint32(i+8,false) ^ iv[2];
			d[3] = v.getUint32(i+12,false) ^ iv[3];
		
			iv = cipher.encrypt(d);
			
			v.setUint32(i,iv[0],false);
			v.setUint32(i+4,iv[1],false);
			v.setUint32(i+8,iv[2],false);
			v.setUint32(i+12,iv[3],false);
		}
	}
	else
	{
		var ab32 = str_to_a32(ab.buffer);
		var iv = [0,0,0,0], d = Array(4);
		var i;
		
		for (i = 0; i < ab32.length; i += 4)
		{
			d[0] = ab32[i] ^ iv[0];
			d[1] = ab32[i+1] ^ iv[1];
			d[2] = ab32[i+2] ^ iv[2];
			d[3] = ab32[i+3] ^ iv[3];
		
			iv = cipher.encrypt(d);
			
			ab32[i] = iv[0];
			ab32[i+1] = iv[1];
			ab32[i+2] = iv[2];
			ab32[i+3] = iv[3];
		}
		
		ab.buffer = a32_to_str(ab32);
	}
}

// decrypt ArrayBuffer in CBC mode (zero IV)
function decrypt_ab_cbc(cipher,ab)
{
	if (have_ab)
	{
		var v = new DataView(ab);
		var iv = [0,0,0,0], d = Array(4), t = Array(4);
		var i;
		
		for (i = 0; i < ab.byteLength; i += 16)
		{
			d[0] = v.getUint32(i,false);
			d[1] = v.getUint32(i+4,false);
			d[2] = v.getUint32(i+8,false);
			d[3] = v.getUint32(i+12,false);
			t = d;
		
			d = cipher.decrypt(d);

			v.setUint32(i,d[0] ^ iv[0],false);
			v.setUint32(i+4,d[1] ^ iv[1],false);
			v.setUint32(i+8,d[2] ^ iv[2],false);
			v.setUint32(i+12,d[3] ^ iv[3],false);
			iv = t;
		}
	}
	else
	{
		// no offset/length support needed
		var ab32 = str_to_a32(ab.buffer);
		var iv = [0,0,0,0], d = Array(4), t = Array(4);
		var i;
		
		for (i = 0; i < ab32.length; i += 4)
		{
			d[0] = ab32[i];
			d[1] = ab32[i+1];
			d[2] = ab32[i+2];
			d[3] = ab32[i+3];
			t = d;
		
			d = cipher.decrypt(d);
			
			ab32[i] = d[0] ^ iv[0];
			ab32[i+1] = d[1] ^ iv[1];
			ab32[i+2] = d[2] ^ iv[2];
			ab32[i+3] = d[3] ^ iv[3];
			iv = t;
		}

		ab.buffer = a32_to_str(ab32);
	}
}

// encrypt/decrypt 4- or 8-element 32-bit integer array
function encrypt_key(cipher,a)
{
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
	var aes;
	var ab;
	var b;

	ab = str_to_ab('MEGA'+to8(JSON.stringify(attr)));

	// if no key supplied, generate a random one
	if (!key.length) for (i = 4; i--; ) key[i] = rand(0x100000000);

	aes = new sjcl.cipher.aes([key[0]^key[4],key[1]^key[5],key[2]^key[6],key[3]^key[7]]);

	encrypt_ab_cbc(aes,ab);

	return [ab,key];
}

// decrypt attributes block using AES-CBC, check for MEGA canary
// attr = ab, key as with enc_attr
// returns [Object] or false
function dec_attr(attr,key)
{
	var aes;
	var b;
	
	aes = new sjcl.cipher.aes([key[0]^key[4],key[1]^key[5],key[2]^key[6],key[3]^key[7]]);
	decrypt_ab_cbc(aes,attr);

	b = ab_to_str_depad(attr);

	if (b.substr(0,6) != 'MEGA{"') return false;

	// @@@ protect against syntax errors
	try {
		return JSON.parse(from8(b.substr(4)));
	} catch (e) {
		return { n : 'MALFORMED_ATTRIBUTES' };
	}
}

function to8(unicode)
{
	return unescape(encodeURIComponent(unicode));
}

function from8(utf8)
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

var apiq = new Array;
var apiqtimer = false;
var apixhr;

function api_req(req,params)
{
	apiq.push([typeof req == 'string' ? req : to8(JSON.stringify(req)),params,seqno++,0]);

	if (apiq.length == 1) api_proc();
}

// execute first pending event
function api_proc()
{
	if (apiqtimer)
	{
		// delete timer (should not ever happen)
		clearTimeout(apiqtimer);
		apiqtimer = false;
	}

	if (apixhr && apixhr.readyState && apixhr.readyState != apixhr.DONE)
	{
		// wait for apixhr to get ready
		if (d) console.log("XHR not in DONE state: " + apixhr.readyState);
		apiqtimer = setTimeout(api_proc,1000);
		return;
	}

	// no more commands pending?
	if (!apiq.length) return;
	
	// request ready for (re)execution: execute
	apixhr = getxhr();

	apixhr.onerror = function()
	{
		if (d) console.log("API request error - retrying");
		api_result(-3);
	}

	apixhr.onload = function()
	{		
		var t;
		
		if (this.responseText) this.response = this.responseText;

		if (d) console.log('API response: ' + this.response);
		
		try {
			t = JSON.parse(from8(this.response));
		} catch (e) {
			// bogus response, requeue
			console.log("Bad JSON data in response: " + this.response);
			t = -3;
		}

		api_result(t);
	}

	if (d) console.log("Making API request: " + apiq[0][0]);
	
	var n_h_api = false;	
	if ((apiq[0][0].indexOf('"a":"f"') > -1 || apiq[0][0].indexOf('"a":"ufa"') > -1 || apiq[0][0].indexOf('"a":"g"') > -1 || apiq[0][0].indexOf('sc?sn') > -1) && n_h) n_h_api = n_h;

	var url = (apiq[0][0].substr(0,4) == 'https') ? apiq[0][0] : (apipath + (apiq[0][0].substr(0,1) == '[' ? ('cs?id=' + apiq[0][2]) : apiq[0][0]) + (n_h_api ? '&n=' + n_h_api : (u_sid ? ('&sid=' + u_sid) : '')));

	if (chromehack)
	{
		// plug extreme Chrome memory leak
		var t = url.indexOf('/',9);
		apixhr.open('POST', url.substr(0,t+1), true);
		apixhr.setRequestHeader("MEGA-Chrome-Antileak",url.substr(t));
	}
	else 
	{		
		apixhr.open('POST', url, true);	
	}

	apixhr.send(apiq[0][0]);
}

function api_result(res)
{
	if (res === -3)
	{
		// exponential backoff
		if (apiq[0][3]) apiq[0][3] *= 2;
		else apiq[0][3] = 125;
		
		if (d) console.log('Temporary error (' + res + ') - retrying after: ' + (apiq[0][3]/1000));

		apiqtimer = setTimeout(api_proc,apiq[0][3]);
	}
	else
	{
		if (apiq[0][1]) apiq[0][1].callback(res,apiq[0][1]);
		apiq.shift();
		api_proc();
	}
}

// calls execsc() with server-client requests received
function getsc(fm)
{
	ctx = 
	{		
		callback : function(res,ctx)
		{
			if (res.w)
			{				
				waiturl = res.w;
				if (waitbackoff > 1000) setTimeout(waitsc,waitbackoff);
				else waitsc();
			}
			else
			{
				if (res.sn) maxaction = res.sn;				
				execsc(res.a);
				if (typeof mDBloaded !== 'undefined' && !folderlink && !pfid) localStorage[u_handle + '_maxaction'] = maxaction;
			}			
			if (ctx.fm)
			{
				mDBloaded=true;
				renderfm();
				pollnotifications();
			}
		},
		fm: fm
	};
	api_req('sc?sn=' + maxaction + '&ssl=1',ctx);
}

var waiturl;
var waitxhr;
var waitbackoff = 125;
var waitbegin;

function waitsc()
{
	if (waitxhr && waitxhr.readyState != apixhr.DONE) waitxhr = undefined;

	waitxhr = getxhr();

	waitxhr.onerror = function()
	{
		if (d) console.log("Error while waiting - retrying, backoff: " + waitbackoff);
		getsc();
	}

	waitxhr.onload = function()
	{
		var t = new Date().getTime()-waitbegin;
		if (t < 1000) waitbackoff += waitbackoff;
		else waitbackoff = 125;
		getsc();
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

	api_req([req],ctx);
}

function api_checkconfirmcode(ctx,c)
{
	res = api_req([{ a : 'uc', c : c }],ctx);
}

// We query the sid using the supplied user handle (or entered email address, if already attached)
// and check the supplied password key.
// Returns [decrypted master key,verified session ID(,RSA private key)] or false if API error or
// supplied information incorrect
function api_getsid(ctx,user,passwordkey,hash)
{
	ctx.callback = api_getsid2;
	ctx.passwordkey = passwordkey;
	
	api_req([{ a : 'us', user : user, uh : hash }],ctx);
}

function api_getsid2(res,ctx)
{	
	var t, k;
	var r = false;

	if (typeof res == 'object')
	{
		var aes = new sjcl.cipher.aes(ctx.passwordkey);
		
		// decrypt master key
		if (typeof res[0].k == 'string')
		{
			k = base64_to_a32(res[0].k);

			if (k.length == 4)
			{
				k = decrypt_key(aes,k);

				aes = new sjcl.cipher.aes(k);
				
				if (typeof res[0].tsid == 'string')
				{
					t = base64urldecode(res[0].tsid);
					if (a32_to_str(encrypt_key(aes,str_to_a32(t.substr(0,16)))) == t.substr(-16)) r = [k,res[0].tsid];
				}
				else if (typeof res[0].csid == 'string')
				{
					var t = mpi2b(base64urldecode(res[0].csid));

					var privk = a32_to_str(decrypt_key(aes,base64_to_a32(res[0].privk)));

					var rsa_privk = Array(4);
					
					// decompose private key
					for (var i = 0; i < 4; i++)
					{
						var l = ((privk.charCodeAt(0)*256+privk.charCodeAt(1)+7)>>3)+2;

						rsa_privk[i] = mpi2b(privk.substr(0,l));
						if (typeof rsa_privk[i] == 'number') break;
						privk = privk.substr(l);
					}

					// check format
					if (i == 4 && privk.length < 16)
					{
						// TODO: check remaining padding for added early wrong password detection likelihood
						r = [k,base64urlencode(crypto_rsadecrypt(t,rsa_privk).substr(0,43)),rsa_privk];
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
	api_req([{ a : 'ug' }],ctx);
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

	api_req([req],ctx);
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
	
	res = api_req([newuser],ctx);
}

var u_pubkeys = {};

// Query missing keys for the given users
function api_cachepubkeys(ctx,users)
{
	ctx.users = [];
	req = [];
	
	for (var i = users.length; i--; )
	{
		if (!u_pubkeys[users[i]])
		{
			ctx.users.push(users[i]);
			req.push({ a : 'uk', u : users[i] });
		}
	}

	if (req.length)
	{
		ctx.callback = api_cachepubkeys2;
		api_req(req,ctx);
	}
	else ctx.cachepubkeyscomplete(ctx);
}

function api_cachepubkeys2(res,ctx)
{
	var spubkey, keylen, pubkey;
	
	for (var i = res.length; i--; )
	{
		if (res[i].pubk)
		{
			spubkey = base64urldecode(res[i].pubk);
			keylen = spubkey.charCodeAt(0)*256+spubkey.charCodeAt(1);
			pubkey = Array(3);

			// decompose public key
			for (var j = 0; j < 2; j++)
			{
				var l = ((spubkey.charCodeAt(0)*256+spubkey.charCodeAt(1)+7)>>3)+2;

				pubkey[j] = mpi2b(spubkey.substr(0,l));
				if (typeof pubkey[j] == 'number') break;
				spubkey = spubkey.substr(l);
			}
			
			// check format
			if (j == 2 && spubkey.length < 16)
			{
				pubkey[2] = keylen;
				u_pubkeys[ctx.users[i]] = pubkey;
			}
		}
	}
	if (ctx.cachepubkeyscomplete) ctx.cachepubkeyscomplete(ctx);
}

function encryptto(user,data)
{
	var i, data;
	var pubkey;

	if (pubkey = u_pubkeys[user])
	{
		// random padding
		for (i = (pubkey[2]>>3)-1-data.length; i-- > 0; ) data = data+String.fromCharCode(rand(256));

		i = data.length*8;
		data = String.fromCharCode(i >> 8) + String.fromCharCode(i & 255) + data;

		return b2mpi(RSAencrypt(mpi2b(data),pubkey[1],pubkey[0]));
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
function api_setshare1(node,targets,sharenodes,ctx)
{
	var i, j, n, nk, sharekey, ssharekey;
	var req, res;
	var newkey = false;

	req = { a : 's',
			n : node,
			s : []
		};

	ctx.sharenodes = sharenodes;
	ctx.targets = targets;
	
	// we only need to generate a key if one or more shares are added
	for (i = targets.length; i--; )
	{
		if (typeof targets[i].r == 'undefined')
		{
			// share cancellation
			req.s.push({ u : targets[i].u });
		}
		else
		{	
			if (!req.ok)
			{			
				if (u_sharekeys[node]) sharekey = u_sharekeys[node];
				else
				{
				
					sharekey = Array(4);
					for (j = 4; j--; ) sharekey[j] = rand(0x100000000);
					u_sharekeys[node] = sharekey;
					newkey = true;
				}

				req.ok = a32_to_base64(encrypt_key(u_k_aes,sharekey));
				req.ha = crypto_handleauth(node);
				ssharekey = a32_to_str(sharekey);
			}
		}
	}
	

	u_sharekeys[node] = sharekey;

	if (newkey) req.cr = crypto_makecr(sharenodes,[node],true);

	ctx.tried = -1;
	ctx.ssharekey = ssharekey;
	ctx.req = req;
	ctx.i = 0;
	ctx.node = node;
	ctx.targets = targets;
	ctx.sharenodes = sharenodes;

	ctx.callback = function(res,ctx)
	{
		var pubkey;
		var i;

		if (typeof res == 'object' && typeof res[0] == 'object')
		{
			if (typeof res[0].pubk == 'string') u_pubkeys[ctx.targets[ctx.i].u] = crypto_decodepubkey(res[0].pubk);
			else if (res[0].ok)
			{
				u_sharekeys[node] = decrypt_key(u_k_aes,base64_to_a32(res[0].ok));
				return api_setshare(ctx.node,ctx.targets,ctx.sharenodes,ctx);
			}
		}
		
		if (ctx.i == ctx.targets.length) ctx.done(ctx);
		else if (!(pubkey = u_pubkeys[ctx.targets[ctx.i].u]) && ctx.tried < ctx.i)
		{
			ctx.tried = ctx.i;
			
			// no public key cached for this user: get it!
			api_req([{ a : 'uk', u : ctx.targets[ctx.i].u }],ctx);
		}
		else
		{
			n = false;
			
			if (pubkey)
			{
				
			
				// pubkey found: encrypt share key to it
				n = crypto_rsaencrypt(pubkey,ctx.ssharekey);
			}

			if (n) ctx.req.s.push({ u : ctx.targets[ctx.i].u, r : ctx.targets[ctx.i].r, k : base64urlencode(n) });
			else ctx.req.s.push({ u : ctx.targets[ctx.i].u, r : ctx.targets[ctx.i].r });
			
			ctx.i++;
			
			ctx.callback(false,ctx);
		}
	}
	
	ctx.callback(false,ctx);
}

function api_setshare2(res,node)
{
	if (res[0].ok) u_sharekeys[node] = decrypt_key(u_k_aes,base64_to_a32(res[0].ok));
}

function api_setrsa(privk,pubk)
{
	var t, i;
	
	for (t = '', i = 0; i < privk.length; i++) t = t+b2mpi(privk[i]);
	
	for (i = (-t.length)&15; i--; ) t = t + String.fromCharCode(rand(256));

	ctx = { callback : function(res,ctx)
		{
			if (d) console.log("RSA key put result=" + res);
			
			u_privk = ctx.privk;
			u_storage.privk = JSON.stringify(u_privk);
			u_type = 3;
			
			ui_keycomplete();
		},
		privk : privk
	};
		
	api_req([{ a : 'up', privk : a32_to_base64(encrypt_key(u_k_aes,str_to_a32(t))), pubk : base64urlencode(b2mpi(pubk[0])+b2mpi(pubk[1])) }],ctx);
}

function crypto_handleauth(h)
{
	return a32_to_base64(encrypt_key(u_k_aes,str_to_a32(h+h)));
}

function crypto_decodepubkey(pubk)
{
	var i;
	
	var spubkey = base64urldecode(pubk);

	var keylen = spubkey.charCodeAt(0)*256+spubkey.charCodeAt(1);

	var pubkey = Array(3);

	// decompose public key
	for (i = 0; i < 2; i++)
	{
		var l = ((spubkey.charCodeAt(0)*256+spubkey.charCodeAt(1)+7)>>3)+2;

		pubkey[i] = mpi2b(spubkey.substr(0,l));
		if (typeof pubkey[i] == 'number') break;
		spubkey = spubkey.substr(l);
	}

	// check format
	if (i == 2 && spubkey.length < 16)
	{
		pubkey[2] = keylen;
		return pubkey;
	}
	return false;
}

u_contactkeys = {};

// generate and set missing contact keys
// (contact keys can only be generated contacts with a full account)
function api_contactkeys(ctx,users)
{
	ctx.users = users;
	
	var missingpubk = [];

	ctx.cachepubkeyscomplete = api_contactkeys2;
	
	// step 1: fetch missing RSA keys
	for (var i = users.length; i--; ) if (!u_contactkeys[users[i]] && !u_pubkeys[users[i]]) missing.push(users[i]);

	if (!users.length) api_contactkeys2(false,ctx);
	else api_cachepubkeys(ctx,missingpubk)
}

function api_contactkeys2(res,ctx)		
{
	var newkey;
	var j;
	var req = [];

	for (var i = ctx.users.length; i--; )
	{
		if (!u_contactkeys[ctx.users[i]] && u_pubkeys[ctx.users[i]])
		{
			newkey = Array(4);

			// generate contact key and attempt to set it
			// if a race condition occurs (because another terminal or the peer did so already),
			// store the concurrently generated key.
			for (j = 4; j--; ) newkey[j] = rand(0x100000000);

			ck = encrypt_key(u_k_aes,newkey);
			ack = encryptto(ctx.users[i],a32_to_str(newkey));

			req.push({a : 'ck', u : ctx.users[i], ck : ck, ack : ack});
		}
	}

	if (req.length)
	{
		ctx.callback = ctx.contactkeysset;
		api_req(req,ctx);
	}
	else ctx.contactkeysset(false,ctx);
}

function crypto_rsaencrypt(pubkey,data)
{
	

	var i;
	
	// random padding
	for (i = (pubkey[2]>>3)-1-data.length; i-- > 0; ) data = data+String.fromCharCode(rand(256));

	i = data.length*8;
	data = String.fromCharCode(i >> 8) + String.fromCharCode(i & 255) + data;

	return b2mpi(RSAencrypt(mpi2b(data),pubkey[1],pubkey[0]));
}

function crypto_rsadecrypt(ciphertext,privk)
{
	var l = ((privk[2].length*28-1)>>5<<2)-2;
	var c = b2s(RSAdecrypt(ciphertext,privk[2],privk[0],privk[1],privk[3]));

	if (c.length < l) c = new Array(l-c.length+1).join(String.fromCharCode(0))+c;
	
	return c;
}

// Complete upload
// We construct a special node put command that uses the upload token
// as the source handle
function api_completeupload(t,ut,path,n,k,faid,ctx)
{
	ctx2 = { callback : api_completeupload2, t : base64urlencode(t), path : path, n : n, k : k, fa : api_getfa(faid), ctx : ctx };

	api_completeupload2(ctx2,ut);
}

function api_completeupload2(ctx,ut)
{
	var p;

	if (ctx.path && ctx.path != ctx.n && (p = ctx.path.indexOf('/')) > 0)
	{
		var pc = ctx.path.substr(0,p);
		
		ctx.path = ctx.path.substr(p+1);

		fm_requestfolderid(ut,pc,ctx);
	}
	else
	{
		a = { n : ctx.n };

		if (d) console.log(ctx.k);

		var ea = enc_attr(a,ctx.k);
		
		if (d) console.log(ea);
		
		

		var req = { a : 'p',
			t : ut,
			n : [{ h : ctx.t, t : 0, a : ab_to_base64(ea[0]), k : a32_to_base64(encrypt_key(u_k_aes,ctx.k)), fa : ctx.fa}],
			i : requesti
		};

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

		api_req([req],ctx.ctx);
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
function api_storefileattr(id,type,aes,data,ctx)
{	
	if (!ctx)
	{
		if (!storedattr[id]) storedattr[id] = {};

		if (aes) encrypt_ab_cbc(aes,data);

		var ctx = { callback : api_fareq, id : id, type : type, data : data };
	}

	api_req([{a : 'ufa', s : ctx.data.byteLength, ssl : use_ssl}],ctx);
}

function api_fareq(res,ctx)
{
	if (typeof res == 'object' && res[0].p)
	{
		var data;			
		var slot, i, t;
		var p, pp = [res[0].p], m;

		for (i = 0; p = res[0]['p'+i]; i++) pp.push(p);

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
			
			faxhrs[slot].onreadystatechange = function()
			{
				if (this.readyState == this.DONE)
				{
					var ctx = this.ctx;

					if (this.status == 200 && typeof this.response == 'object')
					{				
						if (this.response == null) return;

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
									var td = new Uint8Array(l);

									td.set(ts);

									decrypt_ab_cbc(new sjcl.cipher.aes([k[0]^k[4],k[1]^k[5],k[2]^k[6],k[3]^k[7]]),td.buffer);

									ctx.procfa(ctx,ctx.h[h],td);
								}

								i += 12;
							} while (i < bod);
						}
						else
						{
							if (d) console.log("Attribute storage successful for faid=" + ctx.id + ", type=" +ctx.type);

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
						}
						else
						{
							if (d) console.log("Attribute storage failed (" + this.status + "), retrying...");
							api_storefileattr(null,null,null,null,ctx);
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
				else t = pp[m].length;

				pp[m] += '/'+ctx.type;

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

	if (storedattr[id]) for (type in storedattr[id]) if (type != 'target') f.push(type + '*' + storedattr[id][type]);

	storedattr[id] = {};

	return f.join('/');
}

function api_attachfileattr(node,id)
{
	var fa = api_getfa(id);
	
	storedattr[id].target = node;
	
	if (fa) api_req([{a : 'pfa', n : node, fa : fa}]);
}

function api_getfileattr(fa,type,procfa)
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
	}

	for (n in p)
	{
		var ctx = { callback : api_fareq, type : type, p : p[n], h : h, k : k, procfa : procfa };
		api_req([{a : 'ufa', fah : base64urlencode(ctx.p.substr(0,8)), ssl : use_ssl}],ctx);
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

			if (typeof res == 'object' && typeof res[0] == 'object' && typeof res[0].pubk == 'string') u_pubkeys[ctx.sr[ctx.i]] = crypto_decodepubkey(res[0].pubk);

			// collect all required pubkeys	
			while (ctx.i < ctx.sr.length)
			{
				if (ctx.sr[ctx.i].length == 11 && !(pubkey = u_pubkeys[ctx.sr[ctx.i]]))
				{
					api_req([{ a : 'uk', u : ctx.sr[ctx.i] }],ctx);
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
							if (n = crypto_rsaencrypt(pubkey,a32_to_str(u_sharekeys[sh]))) rsr.push(sh,ctx.sr[i],base64urlencode(n));
						}
					}
				}
				else sh = ctx.sr[i];
			}

			if (rsr.length) api_req([{ a : 'k', sr : rsr }]);
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
				var t = mpi2b(base64urldecode(key));
				
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
		
	if (nk.length) api_req([{ a : 'k', nk : nk }]);

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

	if (!cr[1].length /*&& !missingsharekeys.length*/)
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

		res = api_req([{ a : 'k', cr : cr }],ctx);
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

	if (cr[0].length) api_req([{ a : 'k', cr : cr }]);
}

var rsasharekeys = {};

function crypto_process_sharekey(handle,key)
{
	if (key.length > 22)
	{
		key = mpi2b(base64urldecode(key));
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
		api_req([{ a : 'k', sr : rsr }]);
		rsasharekeys = {};
	}
}
