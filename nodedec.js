var d;
var usk;
var u_handle;
var u_privk;
var u_k_aes;
var missingkeys;
var vkey = new Set();
var ckey = new Set();
var nkey = new Set();
var u_sharekeys = Object.create(null);

Object.defineProperty(self, 'u_k', {
    writable: true,
    value: undefined,
    configurable: true
});

if (typeof importScripts !== 'undefined') {
    importScripts('sjcl.js', 'rsaasm.js');

    self.postMessage = self.webkitPostMessage || self.postMessage;

    let jobs;
    // eslint-disable-next-line strict
    const init = ({d: debug, allowNullKeys, secureKeyMgr} = false) => {

        jobs = 0;
        d = !!debug;

        // Set global to allow all-0 keys to be used (for those users that set localStorage flag)
        if (allowNullKeys) {
            self.allowNullKeys = allowNullKeys;
        }

        if (secureKeyMgr) {
            // Inherits from parent 'mega.keyMgr.secure && mega.keyMgr.generation'
            self.secureKeyMgr = secureKeyMgr;
        }
    };

    init();

    self.onmessage = function(e) {
        'use strict';
        const req = e.data;
        jobs++;

        if (req.scqi >= 0) {
            // actionpacket - we do CPU-intensive stuff here, e.g. decrypting share-keys
            if ((req.a === 's' || req.a === 's2') && req.n && req.k) {
                const k = crypto_process_sharekey(req.n, req.k);

                if (k === false) {
                    console.warn(`Failed to decrypt RSA share key for ${req.n}: ${req.k}`);
                }
                else if (crypto_setsharekey2(req.n, k)) {
                    req.k = k;
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
            crypto_setsharekey2(req.h, req.sk);
        }
        else if (req.ha) {
            // ownerkey (ok element)
            let ok = false;
            if (crypto_handleauthcheck(req.h, req.ha)) {
                if (d) {
                    console.log("Successfully decrypted sharekeys for " + req.h);
                }
                const key = decrypt_key(u_k_aes, base64_to_a32(req.k));
                ok = crypto_setsharekey2(req.h, key);
            }
            if (!ok && d) {
                console.warn("handleauthcheck failed for " + req.h);
            }
        }
        else if (req.u_k) {
            // setup for user account
            init(req);

            usk = req.usk;
            u_handle = req.u_handle;
            u_privk = req.u_privk;
            u_k_aes = new sjcl.cipher.aes(req.u_k);
        }
        else if (req.n_h) {
            // setup folder link
            init(req);

            const key = base64_to_a32(req.pfkey);
            crypto_setsharekey2(req.n_h, key);
        }
        else if (req.assign) {
            delete req.assign;
            Object.assign(self, req);

            if (d) {
                console.debug('dec.worker: assign request.', JSON.stringify(req));
            }
        }
        else {
            // unfortunately, we have to discard the SJCL AES cipher
            // because it does not fit in a worker message
            const sharekeys = Object.create(null);
            for (const h in u_sharekeys) {
                sharekeys[h] = u_sharekeys[h][0];
            }
            jobs--;

            // done - post state back to main thread
            self.postMessage({done: 1, jobs, sharekeys});
            init(self);
        }
    };

    if (typeof srvlog2 === 'undefined') {
        srvlog2 = function() {
            self.postMessage(['srvlog2', [].slice.call(arguments)]);
        };
    }
    if (typeof delay === 'undefined') {
        const q = new Map();
        delay = (tag, cb, t) => {
            'use strict';
            let e = q.get(tag);
            if (!e) {
                (e = Object.create(null)).tid = setTimeout((e) => {
                    q.delete(e.pun);
                    const rem = e.tde - (performance.now() - e.tik);
                    return rem < 77 ? queueMicrotask(e.tsk) : delay(e.pun, e.tsk, rem);
                }, t, e);
                q.set(e.pun = tag, e);
            }
            e.tde = t;
            e.tsk = cb;
            e.tik = performance.now();
        };
    }

    /* eslint-disable no-use-before-define,no-empty-function,no-empty,strict */
    lazy = () => {};
    tryCatch = (fn) => (...args) => {
        // eslint-disable-next-line local-rules/hints
        try {
            return fn(...args);
        }
        catch (ex) {}
    };
}

function crypto_setsharekey2(h, sk) {
    'use strict';

    const key = tryCatch(() => new sjcl.cipher.aes(sk))();
    if (key) {
        u_sharekeys[h] = [sk, key];
        return true;
    }

    console.warn(`Received invalid share key for ${h}`, typeof sk, sk && sk.length);
    return false;
}

function crypto_process_sharekey(handle, key) {
    if (self.secureKeyMgr) {
        return false;
    }

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
    'use strict';
    let key, k, id, p, pp;

    // is this node in OK or CORRUPT state or a keyless (root) node? no decryption needed.
    if (typeof n.k === 'undefined' || n.name) {
        return n;
    }

    if (typeof n.k == 'string') {
        // inbound share root? set parent to sharing user; extract & store sharekey.
        if (n.su && typeof n.sk == 'string') {
            key = crypto_process_sharekey(n.h, n.sk);

            if (key) {
                if (key.length !== 4 && key.length !== 8) {
                    srvlog2('invalid-aes-key-size', n.h, n.k.length, n.sk.length, key.length);
                }
                else {
                    delete n.sk;
                    u_sharekeys[n.h] = [key, new sjcl.cipher.aes(key)];
                }
            }
        }

        // does the logged in user own the node? (user key is guaranteed to be located first in .k)
        if (n.k.length === 43 || n.k.length === 22) {
            id = u_handle;
            p = 0;
        }
        else if (n.k[11] === ':' && u_handle === n.k.substr(0, 11)) {
            id = u_handle;
            p = 12; // save calculation.  u_handle.length+1;
        }
        else {
            // do we have a suitable sharekey?
            for (p = 8; (p = n.k.indexOf(':', p)) >= 0;) {
                if (++p === 9 || n.k[p - 10] === '/') {
                    id = n.k.substr(p - 9, 8);
                    if (u_sharekeys[id]) {
                        break;
                    }
                }
            }
        }

        if (p >= 0) {
            pp = n.k.indexOf('/', p + 21);

            if (pp < 0) {
                pp = n.k.length;
            }

            key = n.k.substr(p, pp-p);

            // we have found a suitable key: decrypt!
            if (key.length < 44) {
                // short keys: AES
                k = base64_to_a32(key);

                // check for permitted key lengths (4 == folder, 8 == file)
                if (k.length === 4 || k.length === 8) {
                    k = decrypt_key(id === u_handle ? u_k_aes : u_sharekeys[id][1], k);

                    // Don't decrypt the file if the first half of the key is identical to the second half. Creating
                    // such a key enables the attacker to leverage the deobfuscation step (XORing the second half into
                    // the first half) to provoke an all-0 AES key. We have an override here (self.allowNullKeys) set by
                    // localStorage.allownullkeys for users who were using a bad client and still need their files.
                    if (!self.allowNullKeys) {
                        const invalidFileKey =
                            k.length === 8 && k[0] === k[4] && k[1] === k[5] && k[2] === k[6] && k[3] === k[7];

                        if (invalidFileKey) {

                            // @todo check for folders and revamp
                            // eslint-disable-next-line max-depth
                            if (d) {
                                nkey.add(n.h);

                                delay('nodedec:nkey:store', () => {
                                    const hint = 'please enter localStorage.allownullkeys = 1 to override';
                                    console.error(`All-0 AES key not allowed (${[...nkey]}), ${hint}.`);
                                    nkey.clear();
                                }, 6e3);
                            }

                            k = false;
                        }
                    }
                }
                else {
                    if (d) {
                        console.error(`Received invalid key length (${k.length}): ${n.h}`);
                    }
                    k = false;
                }
            }
            else if (u_privk) {
                // long keys: RSA
                const t = base64urldecode(key);
                if (t) {
                    tryCatch((t) => {
                        k = crypto_rsadecrypt(t, u_privk);

                        if (k !== false) {
                            k = str_to_a32(k.substr(0, n.t ? 16 : 32));
                        }
                    })(t);
                }
                else if (d) {
                    console.warn(`Corrupt key for node ${n.h}`);
                }
            }
            else if (d) {
                console.log(`Received RSA key, but have no public key published: ${n.h}`);
            }
        }
    }
    else {
        // use existing key (for attribute changes)
        k = n.k;
    }

    if (k) {
        if (n.a) {
            crypto_procattr(n, k);
        }
        else if (d && n.t < 2) {
            console.warn(`Missing attribute for node ${n.h}`);
        }
    }
    else {
        if (d) {
            vkey.add(n.h);
            delay('nodedec:vkey:store', () => {
                console.debug("Can't extract a valid key for", [...vkey]);
                vkey.clear();
            }, 4000);
        }

        if (missingkeys) {
            crypto_reportmissingkey(n);
        }
    }

    return n;
}

// generate attributes block for given node using AES-CBC with MEGA canary
// (also generates random (folder-type) key if missing)
// nn is an optional target node to which the attributes will be encrypted
function crypto_makeattr(n, nn) {
    'use strict';
    if (!nn) {
        nn = n;
    }

    // if node is keyless, generate one
    if (!nn.k || !nn.k.length) {

        nn.k = [...crypto.getRandomValues(new Uint32Array(4))];
    }
    else if (nn.k.length !== 4 && nn.k.length !== 8) {
        // node does not have a valid key
        throw new SecurityError(`Invalid key on ${nn.h} (${nn.k.length})`);
    }

    // construct full set of transport attributes
    // NOTE: changes must be replicated to crypto_procaddr()
    const ar = {...n.ar};

    if (n.hash) {
        ar.c = n.hash;
    }
    else if (n.mtime) {
        ar.t = n.mtime;
    }
    if (n.fav | 0) {
        ar.fav = n.fav | 0;
    }
    if (n.lbl | 0) {
        ar.lbl = n.lbl | 0;
    }
    if (typeof n.name != 'undefined') {
        ar.n = n.name;
    }
    if (typeof n.f != 'undefined') {
        ar.f = n.f;
    }
    if (typeof n.devid !== 'undefined') {
        ar['dev-id'] = n.devid;
    }
    if (typeof n.drvid !== 'undefined') {
        ar['drv-id'] = n.drvid;
    }
    if (typeof n.sds !== 'undefined') {
        ar.sds = n.sds;
    }
    if (typeof n.rr !== 'undefined') {
        ar.rr = n.rr;
    }
    if (typeof n.s4 !== 'undefined') {
        ar.s4 = JSON.stringify(n.s4);
    }

    const buf = str_to_ab(`MEGA${to8(JSON.stringify(ar))}`);
    const key = a32_to_ab([nn.k[0] ^ nn.k[4], nn.k[1] ^ nn.k[5], nn.k[2] ^ nn.k[6], nn.k[3] ^ nn.k[7]]);

    return asmCrypto.AES_CBC.encrypt(buf, key, false);
}

// clear all node attributes, including derived ones
function crypto_clearattr(n) {
    // derived node attr directory, see crypto_procattr()
    const dattrs = [
        'ar', 'devid', 'drvid', 'f', 'fav', 'gps',
        'hash', 'lbl', 'mtime', 'name',
        'rr', 's4', 'sds'
    ];
    const old = {};

    for (let i = dattrs.length; i--;) {
        if (typeof n[dattrs[i]] != 'undefined') {
            old[dattrs[i]] = n[dattrs[i]];
            delete n[dattrs[i]];
        }
    }

    return old;
}

// restore previously cleared attributes
function crypto_restoreattr(n, old) {
    Object.assign(n, old);
}

// if decryption of .a is successful, set .name, .hash, .mtime, .k, .sds, .devid/.drvid and .ar and clear .a
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

            if (typeof o['dev-id'] !== 'undefined') {
                n.devid = o['dev-id'];
                delete o['dev-id'];
            }

            if (typeof o['drv-id'] !== 'undefined') {
                n.drvid = o['drv-id'];
                delete o['drv-id'];
            }

            if (typeof o.sds !== 'undefined') {
                n.sds = o.sds;
                delete o.sds;
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

            if (typeof o.s4 !== 'undefined') {
                n.s4 = tryCatch(() => JSON.parse(o.s4))();
                delete o.s4;
            }

            if (o.l && o.l.length === 8 || o.gp && o.gp.length === 16) {
                tryCatch(() => decode_coords(n, o))();
            }

            n.k = key;
            n.ar = o;
            delete n.a;
        }
        else if (d > 1) {
            console.warn("Incomplete attributes for node " + n.h);
        }
    }
    else if (d) {
        ckey.add(n.h);
        delay('nodedec:ckey:store', () => {
            console.debug("Corrupted attributes or key for", [...ckey]);
            ckey.clear();
        }, 4000);
    }
}

// decode/decrypt GPS coords in l/gp node attributes.
function decode_coords(n, o) {
    const coords = o.l;

    if (o.gp) {
        usk = self.usk || typeof u_attr !== 'undefined' && u_attr['*~usk'];

        if (usk) {
            // if (typeof usk === 'string') {
            //     usk = new sjcl.cipher.aes(decrypt_key(u_k_aes, base64_to_a32(usk)));
            // }
            //
            // let tmp = usk.decrypt(base64_to_a32(o.gp));
        }
    }

    if (coords) {
        const dec = str => {
            const buf = Uint8Array.from(base64urldecode(str), c => c.charCodeAt(0));
            return buf[2] << 16 | buf[1] << 8 | buf[0];
        };
        const lat = -90 + 180 * dec(String(coords).substr(0, 4)) / 0xFFFFFF;
        const lon = -180 + 360 * dec(String(coords).substr(4, 4)) / 0x01000000;

        if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
            n.gps = [lat, lon];
        }
    }
}

// encrypt/decrypt 4- or 8-element 32-bit integer array
function encrypt_key(cipher, a) {
    if (!a) {
        a = [];
    }
    if (!cipher) {
        console.error('No encryption cipher provided!');
        return false;
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
    if (!cipher) {
        console.error('No decryption cipher provided!');
        return false;
    }
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
function from8(utf8) {
    'use strict';
    return decodeURIComponent(escape(utf8));
}


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

// --------------------------------------------------------------------------

class MegaNode {
    constructor(node) {
        if (node) {
            Object.assign(this, node);
        }

        if (d && String(this).length !== 8) {
            console.error('Instantiated invalid MegaNode instance.', this);
        }
    }

    toString() {
        return this.h || '';
    }

    valueOf() {
        return this.s || 0;
    }

    get [Symbol.toStringTag]() {
        return 'MegaNode';
    }
}

Object.setPrototypeOf(MegaNode.prototype, null);

// --------------------------------------------------------------------------

lazy(self, 'decWorkerPool', function decWorkerPool() {
    'use strict';
    let head, tail, next;
    const shareWorker = new Map();
    const parentWorker = new Map();

    /** @class decWorkerPool */
    return new class extends Array {
        get url() {
            const WORKER_VERSION = 3;
            return `${window.is_extension || window.is_karma ? '' : '/'}nodedec.js?v=${WORKER_VERSION}`;
        }

        get ok() {
            return this.length > 0;
        }

        get limit() {
            return this.length * BACKPRESSURE_WORKER_LIMIT;
        }

        get busy() {
            const res = head - tail > this.limit;
            if (d && res) {
                console.debug('decWorkerPool.busy', head, tail);
            }
            return res;
        }

        get load() {
            return tail * 100 / head | 0;
        }

        _terminate(worker) {
            worker.onmessage = worker.onerror = null;
            tryCatch(() => worker.terminate())();
        }

        /** cleanup internal data */
        cleanup() {
            shareWorker.clear();
            parentWorker.clear();
            head = tail = next = 0;
        }

        /** terminate and cleanup worker pool */
        kill() {
            for (let i = this.length; i--;) {
                this._terminate(this[i]);
            }
            this.length = 0;
            this.cleanup();
        }

        /** initialize worker pool */
        init(handler, size = 4, state = false) {
            this.kill();

            let errorHandler = (ex) => {
                queueMicrotask(() => {
                    this.kill();

                    if (String(ex.message || ex).includes('SyntaxError')) {
                        const cnt = sessionStorage.decWorkerError | 0;
                        sessionStorage.decWorkerError = cnt + 1;

                        if (cnt > 1) {
                            // hmm..
                            if (cnt > 7) {
                                delete sessionStorage.decWorkerError;
                            }
                            tSleep(333).then(() =>
                                delay('decWorkerPool.error', () => {
                                    if (mega.is.loading) {
                                        siteLoadError(ex.message || ex, this.url);
                                    }
                                }, 2e3)
                            );
                        }
                        else {
                            fm_fullreload(!cnt, cnt && 'nodedec-err');
                        }
                    }
                });

                console.error(`FATAL: ${this.url} worker error.`, ex);
            };

            let messageHandler = (ev) => {
                const {scqi, t} = ev.data;
                if (scqi || t >= 0) {
                    tail++;
                }
                return handler(ev);
            };

            let appendWorker = tryCatch(() => {
                const w = new Worker(this.url);

                w.onerror = errorHandler;
                w.onmessage = messageHandler;

                if (state) {
                    w.postMessage(state);
                }
                return this.push(w);
            });

            while (size--) {
                if (!appendWorker()) {
                    if (!this.length) {
                        this.kill();
                    }
                    break;
                }
            }

            appendWorker = errorHandler = messageHandler = state = undefined;
        }

        /** get next worker index (round robin) */
        getNextWorker(slot) {
            if (slot !== undefined) {
                return slot;
            }

            if (next >= this.length) {
                next = 0;
            }
            return next++;
        }

        /** get a suitable worker index for a shared node */
        getShareIndex(n, slot) {
            let p, id;

            // own node?
            if (!n.k || n.k.substr(0, 11) === u_handle) {
                p = -1;
            }
            else {
                // no - do we have an existing share key?
                for (p = 8; (p = n.k.indexOf(':', p)) >= 0;) {
                    if (++p === 9 || n.k[p - 10] === '/') {
                        id = n.k.substr(p - 9, 8);
                        if (shareWorker.has(id) || u_sharekeys[id]) {
                            break;
                        }
                    }
                }
            }

            if (p >= 0) {
                let pp = n.k.indexOf('/', p + 21);

                if (pp < 0) {
                    pp = n.k.length;
                }

                // rewrite key to the minimum
                n.k = id + ':' + n.k.substr(p, pp - p);

                if (shareWorker.has(id)) {
                    // the key is already known to a worker
                    slot = shareWorker.get(id);
                }
                else {
                    // pick a pseudorandom worker (round robin)
                    slot = this.getNextWorker(slot);

                    // record for future nodes in the same share
                    shareWorker.set(id, slot);

                    // send share-key
                    this[slot].postMessage({h: id, sk: u_sharekeys[id][0]});
                }
            }

            return slot;
        }

        /** post something to *all* workers */
        signal(data) {
            for (const worker of this) {
                worker.postMessage(data);
            }
        }

        /** post a node to a worker for decryption */
        postNode(n, slot) {
            slot = this.getShareIndex(n, slot);

            if (slot === undefined) {
                if (parentWorker.has(n.p)) {
                    slot = parentWorker.get(n.p);
                    parentWorker.set(n.h, slot);
                }
                else if (parentWorker.has(n.h)) {
                    slot = parentWorker.get(n.h);
                }
            }

            // pick a pseudorandom worker (round robin)
            slot = this.getNextWorker(slot);

            if (n.t >= 0) {
                ++head;
            }
            this[slot].postMessage(n);

            if (n.sk || n.ha) {
                parentWorker.set(n.h, slot);
            }

            return slot;
        }

        /** post action packet for sharekey decryption */
        postPacket(a, slot) {
            // set scq slot number
            a.scqi = slot;

            slot = a.scqi % this.length;

            // pin the nodes of this share to the same worker
            // (it is the only one that knows the sharekey)
            shareWorker.set(a.n, slot);

            ++head;
            this[slot].postMessage(a);
        }
    };
});
