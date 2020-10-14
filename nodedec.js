if (typeof importScripts !== 'undefined') {
    importScripts('sjcl.js', 'rsaasm.js');

    var firefox_boost = false;
    var d;

    self.postMessage = self.webkitPostMessage || self.postMessage;

    function init(debug) {
        u_sharekeys = {};
        missingkeys = false;
    }

    init();

    self.onmessage = function(e) {
        var req = e.data;
        var key;

        if (req.scqi >= 0) {
            // actionpacket - we do CPU-intensive stuff here, e.g. decrypting
            // sharekeys
            if (req.a == 's' || req.a == 's2' && req.n && req.k) {
                var k = crypto_process_sharekey(req.n, req.k);

                if (k === false) {
                    console.warn("Failed to decrypt RSA share key for " + req.n + ": " + req.k);
                }
                else {
                    req.k = k;
                    u_sharekeys[req.n] = [k, new sjcl.cipher.aes(k)];
                }
            }
            self.postMessage(req);
        }
        else if (req.t >= 0) {
            // node
            crypto_decryptnode(req);
            self.postMessage(req);
        }
        else if (req.sk) {
            // existing sharekey
            u_sharekeys[req.h] = [req.sk, new sjcl.cipher.aes(req.sk)];
        }
        else if (req.ha) {
            // ownerkey (ok element)
            if (crypto_handleauthcheck(req.h, req.ha)) {
                if (d) {
                    console.log("Successfully decrypted sharekeys for " + req.h);
                }
                key = decrypt_key(u_k_aes, base64_to_a32(req.k));
                u_sharekeys[req.h] = [key, new sjcl.cipher.aes(key)];
            }
            else if (d) {
                console.warn("handleauthcheck failed for " + req.h);
            }
        }
        else if (req.u_k) {
            // setup for user account
            init();

            d = req.d;
            u_handle = req.u_handle;
            u_privk = req.u_privk;
            u_k_aes = new sjcl.cipher.aes(req.u_k);
        }
        else if (req.n_h) {
            // setup folder link
            init(req.d);

            key = base64_to_a32(req.pfkey);
            u_sharekeys[req.n_h] = [key, new sjcl.cipher.aes(key)];
        }
        else {
            // unfortunately, we have to discard the SJCL AES cipher
            // because it does not fit in a worker message
            for (var h in u_sharekeys) u_sharekeys[h] = u_sharekeys[h][0];

            // done - post state back to main thread
            self.postMessage({ done: 1, sharekeys: u_sharekeys });
            init();
        }
    };

    if (typeof srvlog2 === 'undefined') {
        srvlog2 = function() {
            self.postMessage(['srvlog2', [].slice.call(arguments)]);
        };
    }
}

var u_k;
var u_handle;
var u_privk;
var u_k_aes;
var u_sharekeys = {};
var vkey = {};

function crypto_process_sharekey(handle, key) {
    if (key.length > 43) {
        key = base64urldecode(key);
        var k = crypto_rsadecrypt(key, u_privk);
        if (k === false) return k;
        return str_to_a32(k.substr(0, 16));
    }

    return decrypt_key(u_k_aes, base64_to_a32(key));
}

// decrypt a node received via `f`, in response to a `p` or in an actionpacket
// no-op if the node object has previously been decrypted successfully
// node states and their attributes:
// RAW:     { h, p, u, ts, t, k (string), a (for t < 2), s (for t == 0), sk/r/su (for inshares), fa (for some t == 0) }
// NO_KEY:  { h, p, u, ts, t, k (string), a (for t < 2), s (for t == 0), fa (for some t == 0) }
// CORRUPT: { h, p, u, ts, t, k (object), s (for t == 0) }
// OK:      { h, p, u, ts, t, k (object), s (for t == 0), name, hash, mtime, ar (containing attributes other than n/c/t) }
function crypto_decryptnode(n) {
    var key, k;
    var id;
    var p, pp;

    // is this node in OK or CORRUPT state or a keyless (root) node? no decryption needed.
    if (typeof n.k == 'undefined' || n.name) return;

    if (typeof n.k == 'string') {
        // inbound share root? set parent to sharing user; extract & store sharekey.
        if (n.su && typeof n.sk == 'string') {
            key = crypto_process_sharekey(n.h, n.sk);

            if (key) {
                if (key.length != 4 && key.length != 8) {
                    srvlog2('invalid-aes-key-size', n.h, n.k.length, n.sk.length, key.length);
                }
                else {
                    delete n.sk;
                    u_sharekeys[n.h] = [key, new sjcl.cipher.aes(key)];
                }
            }
        }

        // does the logged in user own the node? (user key is guaranteed to be located first in .k)
        if (n.k.length == 43 || n.k.length == 22) {
            id = u_handle;
            p = 0;
        }
        else if (n.k[11] == ':' && u_handle === n.k.substr(0, 11)) {
            id = u_handle;
            p = 12; // save calculation.  u_handle.length+1;
        } else {
            // do we have a suitable sharekey?
            for (p = 8; (p = n.k.indexOf(':', p)) >= 0; ) {
                if (++p == 9 || n.k[p-10] == '/') {
                    id = n.k.substr(p-9, 8);
                    if (u_sharekeys[id]) {
                        break;
                    }
                }
            }
        }

        if (p >= 0) {
            var pp = n.k.indexOf('/', p+21);

            if (pp < 0) {
                pp = n.k.length;
            }

            key = n.k.substr(p, pp-p);

            // we have found a suitable key: decrypt!
            if (key.length < 44) {
                // short keys: AES
                k = base64_to_a32(key);

                // check for permitted key lengths (4 == folder, 8 == file)
                if (k.length == 4 || k.length == 8) {
                    k = decrypt_key(id === u_handle ? u_k_aes : u_sharekeys[id][1], k);
                }
                else {
                    if (d) {
                        console.error("Received invalid key length (" + k.length + "): " + n.h);
                    }
                    k = false;
                }
            }
            else {
                // long keys: RSA
                if (u_privk) {
                    var t = base64urldecode(key);
                    try {
                        if (t) {
                            k = crypto_rsadecrypt(t, u_privk);

                            if (k !== false) {
                                k = str_to_a32(k.substr(0, n.t ? 16 : 32));
                            }
                        }
                        else {
                            if (d) {
                                console.warn("Corrupt key for node " + n.h);
                            }
                        }
                    }
                    catch (e) {
                        if (d) {
                            console.error('u_privk error: ' + e);
                        }
                    }
                }
                else {
                    if (d) {
                        console.log("Received RSA key, but have no public key published: " + n.h);
                    }
                }
            }
        }
    }
    else {
        // use existing key (for attribute changes)
        k = n.k;
    }

    if (k) {
        if (n.a) crypto_procattr(n, k);
        else {
            if (d && n.t < 2) {
                console.warn('Missing attribute for node ' + n.h);
            }
        }
    }
    else {
        if (d) {
            vkey[n.h] = 1;
            if (vkey.t) {
                clearTimeout(vkey.t);
            }
            vkey.t = setTimeout(function() {
                delete vkey.t;
                console.debug("Can't extract a valid key for", Object.keys(vkey));
                vkey = {};
            }, 4000);
        }

        if (missingkeys) crypto_reportmissingkey(n);
    }
}
var vkey = {};
var ckey = {};

// generate attributes block for given node using AES-CBC with MEGA canary
// (also generates random (folder-type) key if missing)
// nn is an optional target node to which the attributes will be encrypted
function crypto_makeattr(n, nn) {
    if (!nn) nn = n;

    // if node is keyless, generate one
    if (!nn.k || !nn.k.length) {
        nn.k = [];
        for (var i = 4; i--; ) nn.k[i] = rand(0x100000000);
    } else {
        // node does not have a valid key
        if (nn.k.length != 4 && nn.k.length != 8) {
            throw new Error("Invalid key on " + n.h);
        }
    }

    // construct full set of transport attributes
    // NOTE: changes must be replicated to crypto_procaddr()
    var ar = clone(n.ar) || {};

    if (n.hash) ar.c = n.hash;
    else if (n.mtime) ar.t = n.mtime;

    if (typeof n.name != 'undefined') ar.n = n.name;
    if (typeof n.f != 'undefined') ar.f = n.f;
    if (n.fav | 0) {
        ar.fav = n.fav | 0;
    }
    if (n.lbl | 0) {
        ar.lbl = n.lbl | 0;
    }
    if (typeof n.rr !== 'undefined') {
        ar.rr = n.rr;
    }

    try {
        var ab = str_to_ab('MEGA' + to8(JSON.stringify(ar)));
    } catch (e) {
        msgDialog('warningb', l[135], e.message || e);
        throw e;
    }

    return asmCrypto.AES_CBC.encrypt(ab,
        a32_to_ab([nn.k[0] ^ nn.k[4], nn.k[1] ^ nn.k[5], nn.k[2] ^ nn.k[6], nn.k[3] ^ nn.k[7]]), false);
}

// derived node attr directory
var dattrs = ['ar', 'name', 'hash', 'mtime', 'fav', 'lbl', 'f', 'rr'];

// clear all node attributes, including derived ones
function crypto_clearattr(n) {
    var old = {};

    for (var i = dattrs.length; i--; ) {
        if (typeof n[dattrs[i]] != 'undefined') {
            old[dattrs[i]] = n[dattrs[i]];
            delete n[dattrs[i]];
        }
    }

    return old;
}

// restore previously cleared attributes
function crypto_restoreattr(n, old) {
    for (var i in old) {
        n[i] = old[i];
    }
}

// if decryption of .a is successful, set .name, .hash, .mtime, .k and .ar and clear .a
function crypto_procattr(n, key) {
    var ab = base64_to_ab(n.a);
    var o = ab && dec_attr(ab, key);

    if (o) {
        if (typeof o.n == 'string') {
            n.name = o.n;
            delete o.n;

            if (typeof o.c == 'string') {
                n.hash = o.c;
                delete o.c;
            }

            if (typeof o.t != 'undefined') {
                n.mtime = o.t;
                delete o.t;
            }
            else if (n.hash) {
                var h = base64urldecode(n.hash);
                var i = h.charCodeAt(16);
                if (i <= 4) { // FIXME: change to 5 before the year 2106
                    var t = 0;
                    for (var i = h.charCodeAt(16); i--;) {
                        t = t * 256 + h.charCodeAt(17 + i);
                    }
                    n.mtime = t;
                }
            }

            if (typeof o.fav != 'undefined') {
                n.fav = o.fav | 0;
                if (!n.fav) {
                    delete n.fav;
                }
                delete o.fav;
            }

            if (typeof o.lbl != 'undefined') {
                n.lbl = o.lbl | 0;
                if (!n.lbl) {
                    delete n.lbl;
                }
                delete o.lbl;
            }

            if (typeof o.f != 'undefined') {
                n.f = o.f;
                delete o.f;
            }

            if (typeof o.rr !== 'undefined') {
                n.rr = o.rr;
                delete o.rr;
            }

            n.k = key;
            n.ar = o;
            delete n.a;
        }
        else if (d) {
            console.warn("Incomplete attributes for node " + n.h);
        }
    }
    else if (d) {
        ckey[n.h] = 1;
        if (ckey.t) {
            clearTimeout(ckey.t);
        }
        ckey.t = setTimeout(function() {
            delete ckey.t;
            console.debug("Corrupted attributes or key for", Object.keys(ckey));
            ckey = {};
        }, 4000);
    }
}

// encrypt/decrypt 4- or 8-element 32-bit integer array
function encrypt_key(cipher, a) {
    if (!a) {
        a = [];
    }
    if (a.length == 4) {
        return cipher.encrypt(a);
    }
    var x = [];
    for (var i = 0; i < a.length; i += 4) {
        x = x.concat(cipher.encrypt([a[i], a[i + 1], a[i + 2], a[i + 3]]));
    }
    return x;
}

function decrypt_key(cipher, a) {
    if (a.length == 4) {
        return cipher.decrypt(a);
    }

    var x = [];
    for (var i = 0; i < a.length; i += 4) {
        x = x.concat(cipher.decrypt([a[i], a[i + 1], a[i + 2], a[i + 3]]));
    }
    return x;
}

function crypto_handleauthcheck(h, ha) {
    var a = base64_to_a32(ha);
    var b = encrypt_key(u_k_aes, str_to_a32(h + h));
    return a[0] == b[0] && a[1] == b[1] && a[2] == b[2] && a[3] == b[3];
}

/**
 * Decrypts a ciphertext string with the supplied private key.
 *
 * @param {String} ciphertext
 *     Cipher text to decrypt.
 * @param {Array} privkey
 *     Private encryption key (in the usual internal format used).
 * @return {String}
 *     Decrypted clear text or false in case of an error
 */
// decrypts ciphertext string representing an MPI-formatted big number with the supplied privkey
// returns cleartext string
function crypto_rsadecrypt(ciphertext, privkey) {
    var l = (ciphertext.charCodeAt(0) * 256 + ciphertext.charCodeAt(1) + 7) >> 3;
    ciphertext = ciphertext.substr(2, l);

    try {
        var cleartext = asmCrypto.bytes_to_string(asmCrypto.RSA_RAW.decrypt(ciphertext, privkey));
    }
    catch (e) {
        if (d) {
            console.error("RSA decryption failed: " + e);
        }
        srvlog2('rsa-dec-err', String(e), String(JSON.stringify(privkey)).length);
        return false;
    }

    if (cleartext.length < privkey[0].length) {
        cleartext = Array(privkey[0].length - cleartext.length + 1).join(String.fromCharCode(0)) + cleartext;
    }

    // Old bogus padding workaround
    if (cleartext.charCodeAt(1) !== 0) {
        cleartext = String.fromCharCode(0) + cleartext;
    }

    return cleartext.substr(2);
}

// array of 32-bit words to string (big endian)
function a32_to_str(a) {
    var b = '';

    for (var i = 0; i < a.length * 4; i++) {
        b = b + String.fromCharCode((a[i >> 2] >>> (24 - (i & 3) * 8)) & 255);
    }

    return b;
}

// array of 32-bit words ArrayBuffer (big endian)
function a32_to_ab(a) {
    var ab = new Uint8Array(4 * a.length);

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

// substitute standard base64 special characters to prevent JSON escaping, remove padding
function base64urlencode(data) {
    if (typeof btoa === 'function') {
        return btoa(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }

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

var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=";
var b64a = b64.split('');

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

// (Safari workers lack atob()!)
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


// binary string to ArrayBuffer, 0-padded to AES block size
function str_to_ab(b) {
    var ab = new ArrayBuffer((b.length + 15) & -16);
    var u8 = new Uint8Array(ab);

    for (var i = b.length; i--;) {
        u8[i] = b.charCodeAt(i);
    }

    return ab;
}

// ArrayBuffer to binary with depadding
function ab_to_str_depad(ab) {
    var b = '', i;
    var ab8 = new Uint8Array(ab);

    for (i = 0; i < ab8.length && ab8[i]; i++) {
        b = b + String.fromCharCode(ab8[i]);
    }

    return b;
}

// ArrayBuffer to binary string
function ab_to_base64(ab) {
    return base64urlencode(ab_to_str(ab));
}

if (firefox_boost) {
    ab_to_str_depad = mozAB2SDepad;
}

function ab_to_str(ab) {
    var b = '', i;
    var ab8 = new Uint8Array(ab);

    for (i = 0; i < ab8.length; i++) {
        b = b + String.fromCharCode(ab8[i]);
    }

    return b;
}

// binary string to ArrayBuffer, 0-padded to AES block size
function base64_to_ab(a) {
    return str_to_ab(base64urldecode(a));
}

// decrypt attributes block using AES-CBC, check for MEGA canary
// attr = ab, key as with enc_attr
// returns [Object] or false
function dec_attr(attr, key) {
    var aes;
    var b;

    attr = asmCrypto.AES_CBC.decrypt(attr,
        a32_to_ab([key[0] ^ key[4], key[1] ^ key[5], key[2] ^ key[6], key[3] ^ key[7]]), false);
    b = ab_to_str_depad(attr);

    if (b.substr(0, 6) !== 'MEGA{"') {
        return false;
    }

    try {
        return JSON.parse(from8(b.substr(4)));
    }
    catch (e) {
        if (d) {
            console.warn(b, String(e));
        }
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

/**
 * Converts a UTF-8 encoded string to a Unicode string.
 *
 * @param {String} utf8
 *     UTF-8 encoded string (8-bit characters only).
 * @return {String}
 *     Browser's native string encoding.
 */
var from8 = firefox_boost ? mozFrom8 : function (utf8) {
    return decodeURIComponent(escape(utf8));
};


(function _console(global) {
    var logFunc;
    var dummyFunc = function() {};
    var logging = {debug: 1, log: 1, info: 1, warn: 1, error: 1};

    if (typeof importScripts !== 'undefined') {
        logFunc = function() {
            global.postMessage(['console', [].slice.call(arguments)]);
        };
    }

    if (!global.console) {
        global.console = {};
    }

    var funcs = 'clear,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,' +
                'info,log,profile,profileEnd,table,timeline,timelineEnd,timeStamp,trace,warn';

    funcs.split(',').forEach(function(fn) {
        if (global.console[fn] === undefined) {
            global.console[fn] = logging[fn] && logFunc || dummyFunc;
        }
    });

    if (!global.console.assert) {
        global.console.assert = function cassert(expr) {
            if (!expr) {
                global.console.error.apply(global.console, [].slice.call(arguments, 1));
            }
        };
    }

    if (!global.console.time) {
        var timers = {};
        global.console.time = function ctime(n) {
            timers[n] = new Date().getTime()
        };
        global.console.timeEnd = function ctimeend(n) {
            if (timers[n]) {
                global.console.log(n + ': ' + (new Date().getTime() - timers[n]) + 'ms');
                delete timers[n];
            }
        };
    }

})(self);

function MegaNode(node) {
    'use strict';

    if (!node || !node.h || node.h.length !== 8) {
        return Object(node || null);
    }
    Object.assign(this, node);

    // XXX: While setPrototypeOf() did seem faster, it does increases mem usage by ~1GB for 1M-nodes account..(v8 bug?)
    // return Object.setPrototypeOf(node, MegaNode.prototype);
}

MegaNode.prototype = Object.create(null, {
    constructor: {
        value: MegaNode
    },
    toString: {
        value: function toString() {
            'use strict';

            return this.h || '';
        }
    },
    valueOf: {
        value: function valueOf() {
            'use strict';

            return this.s || 0;
        }
    }
});
