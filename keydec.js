importScripts('sjcl.js');
importScripts('rsaasm.js');

self.postMessage = self.webkitPostMessage || self.postMessage;

self.onmessage = function(e) {
    var r = {};
    var dp = 0;
    var evd = e.data;
    var nodes = evd.data;
    var new_sharekeys = {};

    d              = !!evd.debug;
    u_privk        = evd.u_privk;
    u_k_aes        = evd.u_k && new sjcl.cipher.aes(evd.u_k);
    u_sharekeys    = evd.u_sharekeys;
    rsa2aes        = {};
    missingkeys    = {};
    rsasharekeys   = {};
    newmissingkeys = false;

    for (var i in nodes) {
        var n = nodes[i];

        if (!n.c) {
            if (n.sk && !u_sharekeys[n.h]) {
                new_sharekeys[n.h] = u_sharekeys[n.h] = crypto_process_sharekey(n.h, n.sk);
            }

            if (n.k && n.t !== 2 && n.t !== 3 && n.t !== 4) {
                var o = {};

                crypto_processkey(evd.u_handle, u_k_aes, n, o);
                r[n.h] = o;
            }
        }
    }
    // if (dp) console.log('Dummy process for ' + dp + ' nodes');

    self.postMessage({
        result         : r,
        jid            : evd.jid,
        rsa2aes        : Object.keys(rsa2aes).length && rsa2aes,
        rsasharekeys   : Object.keys(rsasharekeys).length && rsasharekeys,
        u_sharekeys    : Object.keys(new_sharekeys).length && new_sharekeys,
        missingkeys    : missingkeys,
        newmissingkeys : newmissingkeys,
    });
}

var console = {
    log: function() {
        self.postMessage(['console', [].slice.call(arguments)]);
    }
};
var have_ab = !0;
var d, u_privk, u_k_aes, u_sharekeys;

var rsa2aes = {};
var missingkeys = {};
var newmissingkeys = false;
var rsasharekeys = {};

function crypto_process_sharekey(handle, key) {
    if (key.length > 22) {
        key = base64urldecode(key);
        var k = str_to_a32(crypto_rsadecrypt(key, u_privk).substr(0, 16));
        rsasharekeys[handle] = true;
        return k;
    }
    return decrypt_key(u_k_aes, base64_to_a32(key));
}

// Try to decrypt ufs node.
// Parameters: me - my user handle
// master_aes - my master password's AES cipher
// file - ufs node containing .k and .a
// Output: .key and .name set if successful
function crypto_processkey(me, master_aes, file, OUT) {
    var id = me;
    var key, k, n;
    var success = false;

    // do I own the file? (user key is guaranteed to be first in .k)
    var p = file.k.indexOf(id + ':');

    if (p) {
        // I don't - do I have a suitable sharekey?
        for (id in u_sharekeys) {
            p = file.k.indexOf(id + ':');

            if (p >= 0 && (!p || file.k.charAt(p - 1) === '/')) {
                OUT.fk = 1;
                break;
            }

            p = -1;
        }
    }

    if (p >= 0) {
        var pp = file.k.indexOf('/', p);

        if (pp < 0) {
            pp = file.k.length;
        }

        p += id.length + 1;

        key = file.k.substr(p, pp - p);

        // we have found a suitable key: decrypt!
        if (key.length < 46) {
            // short keys: AES
            k = base64_to_a32(key);

            // check for permitted key lengths (4 === folder, 8 === file)
            if (k.length === 4 || k.length === 8) {
                // TODO: cache sharekeys in aes
                k = decrypt_key(id === me ? master_aes : new sjcl.cipher.aes(u_sharekeys[id]), k);
            }
            else {
                if (d) {
                    console.log("Received invalid key length (" + k.length + "): " + file.h);
                }
                k = null;
            }
        }
        else {
            // long keys: RSA
            if (u_privk) {
                var t = base64urldecode(key);
                try {
                    if (t) {
                        k = str_to_a32(crypto_rsadecrypt(t, u_privk).substr(0, file.t ? 16 : 32));
                    }
                    else {
                        if (d) {
                            console.log("Corrupt key for node " + file.h);
                        }
                    }
                }
                catch (e) {
                    if (d) {
                        console.log('u_privk error: ' + e);
                    }
                }
            }
            else {
                if (d) {
                    console.log("Received RSA key, but have no public key published: " + file.h);
                }
            }
        }

        if (d && !file.a) {
            console.log('Missing attribute for node "%s"', file.h, file);
        }

        var ab = k && file.a && base64_to_ab(file.a);
        var o = ab && dec_attr(ab, k);

        // if (d) console.log('dec_attr', file.h, key,ab,k, o && o.n, o);

        if (o && typeof o === 'object') {
            if (typeof o.n === 'string') {
                if (file.h) {
                    // u_nodekeys[file.h] = k;
                    if (key.length >= 46) {
                        rsa2aes[file.h] = a32_to_str(encrypt_key(u_k_aes, k));
                    }
                }
                if (typeof o.c === 'string') {
                    file.hash = o.c;
                }

                if (typeof o.t !== 'undefined') {
                    OUT.mtime = o.t;
                }
                else if (file.hash) {
                    var h = base64urldecode(file.hash);
                    var t = 0;
                    for (var i = h.charCodeAt(16); i--;) {
                        t = t * 256 + h.charCodeAt(17 + i);
                    }
                    OUT.mtime = t;
                }

                OUT.key = k;
                OUT.ar = o;
                OUT.name = o.n;

                if (file.hash) {
                    OUT.hash = file.hash;
                }

                var exclude = {t:1, c:1, n:1};
                for (var j in o) {
                    if (o.hasOwnProperty(j)) {
                        if (!exclude[j]) {
                            OUT[j] = o[j];
                        }
                    }
                }

                success = true;
            }
        }
    }

    if (!success) {
        if (d) {
            console.log('Received no suitable key for ' + file.h, file);
        }

        if (!missingkeys[file.h]) {
            newmissingkeys = true;
            missingkeys[file.h] = true;
        }
    }
}

function encrypt_key(cipher, a) {
    if (!a) {
        a = [];
    }
    if (a.length === 4) {
        return cipher.encrypt(a);
    }
    var x = [];
    for (var i = 0; i < a.length; i += 4) {
        x = x.concat(cipher.encrypt([a[i], a[i + 1], a[i + 2], a[i + 3]]));
    }
    return x;
}

function decrypt_key(cipher, a) {
    if (a.length === 4) {
        return cipher.decrypt(a);
    }

    var x = [];
    for (var i = 0; i < a.length; i += 4) {
        x = x.concat(cipher.decrypt([a[i], a[i + 1], a[i + 2], a[i + 3]]));
    }
    return x;
}

// decrypts ciphertext string representing an MPI-formatted big number with the supplied privkey
// returns cleartext string
function crypto_rsadecrypt(ciphertext, privkey) {
    var l = (ciphertext.charCodeAt(0) * 256 + ciphertext.charCodeAt(1) + 7) >> 3;
    ciphertext = ciphertext.substr(2, l);

    var cleartext = asmCrypto.bytes_to_string(asmCrypto.RSA_RAW.decrypt(ciphertext, privkey));
    if (cleartext.length < privkey[0].length) {
        cleartext = Array(privkey[0].length - cleartext.length + 1).join(String.fromCharCode(0)) + cleartext;
    }

    // Old bogus padding workaround
    if (cleartext.charCodeAt(1) !== 0) {
        cleartext = String.fromCharCode(0) + cleartext;
    }

    return cleartext.substr(2);
}

function a32_to_str(a) {
    var b = '';

    for (var i = 0; i < a.length * 4; i++) {
        b = b + String.fromCharCode((a[i >> 2] >>> (24 - (i & 3) * 8)) & 255);
    }

    return b;
}

function a32_to_ab(a) {
    var ab = have_ab ? new Uint8Array(4 * a.length)
        : new Array(4 * a.length);

    for (var i = 0; i < a.length; i++) {
        ab[4 * i] = a[i] >>> 24;
        ab[4 * i + 1] = a[i] >>> 16 & 255;
        ab[4 * i + 2] = a[i] >>> 8 & 255;
        ab[4 * i + 3] = a[i] & 255;
    }

    return ab;
}

// string to array of 32-bit words (big endian)
function str_to_a32(b) {
    var a = Array((b.length + 3) >> 2);
    for (var i = 0; i < b.length; i++) {
        a[i >> 2] |= (b.charCodeAt(i) << (24 - (i & 3) * 8));
    }
    return a;
}

function base64_to_a32(s) {
    return str_to_a32(base64urldecode(s));
}

var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=";
// var b64a = b64.split('');

var base64urldecode = function(data) {
    data += '=='.substr((2 - data.length * 3) & 3)

    data = data.replace(/\-/g, '+').replace(/_/g, '/').replace(/,/g, '');

    try {
        return atob(data);
    }
    catch (e) {
        return '';
    }
};

if (typeof atob !== 'function') {
    base64urldecode = function(data) {
        data += '=='.substr((2 - data.length * 3) & 3);

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
        //if (typeof this.window['atob'] === 'function') {
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

            if (h3 === 64) {
                tmp_arr[ac++] = String.fromCharCode(o1);
            }
            else if (h4 === 64) {
                tmp_arr[ac++] = String.fromCharCode(o1, o2);
            }
            else {
                tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
            }
        } while (i < data.length);

        dec = tmp_arr.join('');

        return dec;
    };
}

function str_to_ab(b) {
    var ab, i;

    if (have_ab) {
        ab = new ArrayBuffer((b.length + 15) & -16);
        var ab8 = new Uint8Array(ab);

        for (i = b.length; i--;) {
            ab8[i] = b.charCodeAt(i);
        }

        return ab;
    }
    else {
        b += Array(16 - ((b.length - 1) & 15)).join(String.fromCharCode(0));

        ab = {
            buffer: b
        };
    }

    return ab;
}

function ab_to_str_depad(ab) {
    var b, i;

    if (have_ab) {
        b = '';

        var ab8 = new Uint8Array(ab);

        for (i = 0; i < ab8.length && ab8[i]; i++) {
            b = b + String.fromCharCode(ab8[i]);
        }
    }
    else {
        b = ab_to_str(ab);

        for (i = b.length; i-- && !b.charCodeAt(i););

        b = b.substr(0, i + 1);
    }

    return b;
}

// ArrayBuffer to binary string
function ab_to_str(ab) {
    var b = '';
    var i;

    if (have_ab) {
        var b = '';

        var ab8 = new Uint8Array(ab);

        for (i = 0; i < ab8.length; i++) {
            b = b + String.fromCharCode(ab8[i]);
        }
    }
    else {
        return ab.buffer;
    }

    return b;
}

function base64_to_ab(a) {
    return str_to_ab(base64urldecode(a));
}

function dec_attr(attr, key) {
    var aes;
    var b;

    key = [
        key[0] ^ key[4],
        key[1] ^ key[5],
        key[2] ^ key[6],
        key[3] ^ key[7]
    ];

    attr = asmCrypto.AES_CBC.decrypt(attr, a32_to_ab(key), false);

    b = ab_to_str_depad(attr);

    if (b.substr(0, 6) !== 'MEGA{"') {
        return false;
    }

    // @@@ protect against syntax errors
    try {
        return JSON.parse(from8(b.substr(4)));
    }
    catch (e) {
        // if (d) console.error(b, e);
        var m = b.match(/"n"\s*:\s*"((?:\\"|.)*?)(\.\w{2,4})?"/);
        var s = m && m[1];
        var l = s && s.length || 0;
        var j = ',';

        while (l--) {
            s = s.substr(0, l || 1);
            try {
                from8(s + j);
                break;
            }
            catch (e) {}
        }

        if (~l) {
            try {
                var new_name = s + j + 'trunc' + Math.random().toString(16).slice(-4) + (m[2] || '');
                return JSON.parse(from8(b.substr(4).replace(m[0], '"n":"' + new_name + '"')));
            }
            catch (e) {}
        }

        return {
            n: 'MALFORMED_ATTRIBUTES'
        };
    }
}

function from8(utf8) {
    return decodeURIComponent(escape(utf8));
}
