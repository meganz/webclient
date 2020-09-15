var xxtea = (function() {
    'use strict';

    // (from https://github.com/xxtea/xxtea-js/blob/master/src/xxtea.js)
    var DELTA = 0x9E3779B9;
    var ns = Object.create(null);

    var int32 = function(i) {
        return i & 0xFFFFFFFF;
    };

    var mx = function(sum, y, z, p, e, k) {
        return (z >>> 5 ^ y << 2) + (y >>> 3 ^ z << 4) ^ (sum ^ y) + (k[p & 3 ^ e] ^ z);
    };

    ns.encryptUint32Array = function encryptUint32Array(v, k) {
        var length = v.length;
        var n = length - 1;
        var y;
        var z = v[n];
        var sum = 0;
        var e;
        var p;
        var q;
        for (q = Math.floor(6 + 52 / length) | 0; q > 0; --q) {
            sum = int32(sum + DELTA);
            e = sum >>> 2 & 3;
            for (p = 0; p < n; ++p) {
                y = v[p + 1];
                z = v[p] = int32(v[p] + mx(sum, y, z, p, e, k));
            }
            y = v[0];
            z = v[n] = int32(v[n] + mx(sum, y, z, n, e, k));
        }
        return v;
    };

    ns.decryptUint32Array = function decryptUint32Array(v, k) {
        var length = v.length;
        var n = length - 1;
        var y = v[0];
        var z;
        var sum;
        var e;
        var p;
        var q = Math.floor(6 + 52 / length);
        for (sum = int32(q * DELTA); sum !== 0; sum = int32(sum - DELTA)) {
            e = sum >>> 2 & 3;
            for (p = n; p > 0; --p) {
                z = v[p - 1];
                y = v[p] = int32(v[p] - mx(sum, y, z, p, e, k));
            }
            z = v[n];
            y = v[0] = int32(v[0] - mx(sum, y, z, 0, e, k));
        }
        return v;
    };

    return Object.freeze(ns);
}());

window.URL = window.URL || window.webkitURL;

var have_ab = typeof ArrayBuffer !== 'undefined' && typeof DataView !== 'undefined';
var use_workers = have_ab && typeof Worker !== 'undefined';

if (is_extension && typeof localStorage.use_ssl === 'undefined') {
    localStorage.use_ssl = 0;
}

// if (is_extension || +localStorage.use_ssl === 0) {
if (is_chrome_firefox) {
    var use_ssl = 0;
}
else if (+localStorage.use_ssl === 0) {
    var use_ssl = (navigator.userAgent.indexOf('Chrome/') !== -1
        && parseInt(navigator.userAgent.split('Chrome/').pop()) > 40) ? 1 : 0;
}
else {
    if ((navigator.appVersion.indexOf('Safari') > 0) && (navigator.appVersion.indexOf('Version/5') > 0)) {
        use_workers = false;
        have_ab = false;
    }

    var use_ssl = ssl_needed();
    if (!use_ssl && localStorage.use_ssl) {
        use_ssl = 1;
    }
    else {
        use_ssl++;
    }
}

// general errors
var EINTERNAL = -1;
var EARGS = -2;
var EAGAIN = -3;
var ERATELIMIT = -4;
var EFAILED = -5;
var ETOOMANY = -6;
var ERANGE = -7;
var EEXPIRED = -8;

// FS access errors
var ENOENT = -9;            // No Entity (does not exist)
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
var EGOINGOVERQUOTA = -24;

var EROLLEDBACK = -25;
var EMFAREQUIRED = -26;     // Multi-Factor Authentication Required
var EPAYWALL = -29;     // ODQ paywall state

// custom errors
var ETOOERR = -400;
var ESHAREROVERQUOTA = -401;

function ssl_needed() {
    var ssl_opt = ['Chrome/'];
    var ssl_off = ['Firefox/14', 'Firefox/15', 'Firefox/16', 'Firefox/17'];
    for (var i = ssl_opt.length; i--;) {
        if (navigator.userAgent.indexOf(ssl_opt[i]) >= 0) {
            return parseInt(navigator.userAgent.split(ssl_opt[i]).pop()) > 40;
        }
    }
    for (var i = ssl_off.length; i--;) {
        if (navigator.userAgent.indexOf(ssl_off[i]) >= 0) {
            return -1;
        }
    }
    return 1;
}

// convert user-supplied password array
function prepare_key(a) {
    var i, j, r;
    var aes = [];
    var pkey = [0x93C467E3, 0x7DB0C7A4, 0xD1BE3F81, 0x0152CB56];

    for (j = 0; j < a.length; j += 4) {
        var key = [0, 0, 0, 0];
        for (i = 0; i < 4; i++) {
            if (i + j < a.length) {
                key[i] = a[i + j];
            }
        }
        aes.push(new sjcl.cipher.aes(key));
    }

    for (r = 65536; r--;) {
        for (j = 0; j < aes.length; j++) {
            pkey = aes[j].encrypt(pkey);
        }
    }

    return pkey;
}

// prepare_key with string input
function prepare_key_pw(password) {
    return prepare_key(str_to_a32(password));
}

function a32_to_base64(a) {
    return base64urlencode(a32_to_str(a));
}

var firefox_boost = is_chrome_firefox && !!localStorage.fxboost;

// ArrayBuffer to binary string
var ab_to_str = function abToStr1(ab) {
    return ab.buffer;
};

if (firefox_boost) {
    ab_to_str = mozAB2S;
}
else if (have_ab) {
    ab_to_str = function abToStr2(ab) {
        var u8 = new Uint8Array(ab);

        /*if (u8.length < 0x10000) {
         return String.fromCharCode.apply(String, u8);
         }*/

        var b = '';
        for (var i = 0; i < u8.length; i++) {
            b = b + String.fromCharCode(u8[i]);
        }

        return b;
    };
}

// random number between 0 .. n -- based on repeated calls to rc
function rand(n) {
    var r = new Uint32Array(1);
    asmCrypto.getRandomValues(r);
    return r[0] % n; // <- oops, it's uniformly distributed only when `n` divides 0x100000000
}


/**
 * generate RSA key
 * @param {Function} callBack   optional callback function to be called.
 *                              if not specified the standard set_RSA will be called
 */
var crypto_rsagenkey = promisify(function _crypto_rsagenkey(resolve, reject, aSetRSA) {
    'use strict';
    var logger = MegaLogger.getLogger('crypt');

    var startTime = new Date();

    if (typeof msCrypto !== 'undefined' && msCrypto.subtle) {
        var ko = msCrypto.subtle.generateKey({
            name: 'RSAES-PKCS1-v1_5',
            modulusLength: 2048
        }, true);
        ko.oncomplete = function () {
            ko = msCrypto.subtle.exportKey('jwk', ko.result.privateKey);
            ko.oncomplete = function () {
                var jwk = JSON.parse(asmCrypto.bytes_to_string(new Uint8Array(ko.result)));
                _done(['n', 'e', 'd', 'p', 'q', 'dp', 'dq', 'qi'].map(function (x) {
                    return base64urldecode(jwk[x]);
                }));
            };
        };
    }
    else {
        var w = new Worker((is_extension ? '' : '/') + 'keygen.js');

        w.onmessage = function (e) {
            w.terminate();
            _done(e.data);
        };

        var workerSeed = mega.getRandomValues(256);

        w.postMessage([2048, 257, workerSeed]);
    }

    function _done(k) {
        var endTime = new Date();
        logger.debug("Key generation took "
                     + (endTime.getTime() - startTime.getTime()) / 1000.0
            + " seconds!");

        if (aSetRSA === false) {
            resolve(k);
        }
        else {
            u_setrsa(k).then(resolve).catch(dump);
        }
    }
});

function ApiQueue() { // double storage
    'use strict';
    this._head = 0;
    this._tail = 0;
    this._storage1 = Object.create(null);
    this._storage2 = Object.create(null);
}
ApiQueue.prototype.size = function () {
    'use strict';
    return this._tail - this._head;
};
ApiQueue.prototype.sneak = function () {
    'use strict';
    if (this._head !== this._tail) {
        return { st1: this._storage1[this._head], st2: this._storage2[this._head] };
    }
};
ApiQueue.prototype.enqueue = function (data1, data2) {
    'use strict';
    // reset to 0 index, we dont want indexes to keep getting bigger
    // this is very safe, since it takes place during enqueue,
    // and it is not possible to have another undergoing dequeue(because head=tail)
    if (this._head === this._tail) {
        this._head = 0;
        this._tail = 0;
    }
    this._storage1[this._tail] = data1;
    this._storage2[this._tail++] = data2;
};
ApiQueue.prototype.clear = function () {
    'use strict';
    this._head = 0;
    this._tail = 0;
    this._storage1 = Object.create(null);
    this._storage2 = Object.create(null);
};
ApiQueue.prototype.dequeue = function (onlySingle) {
    'use strict';
    if (this._head !== this._tail) {
        var data1 = this._storage1[this._head];
        if (onlySingle && data1.length) {
            return null;
        }
        var data2 = this._storage2[this._head];
        delete this._storage1[this._head];
        delete this._storage2[this._head++];

        return { st1: data1, st2: data2 };
    }
};


/**
 * Converts a Unicode string to a UTF-8 cleanly encoded string.
 *
 * @param {String} unicode
 *     Browser's native string encoding.
 * @return {String}
 *     UTF-8 encoded string (8-bit characters only).
 */
var to8 = firefox_boost ? mozTo8 : function (unicode) {
    return unescape(encodeURIComponent(unicode));
};

// API command queueing
// All commands are executed in sequence, with no overlap
// FIXME: show user warning after backoff > 1000

var apixs = [];

function api_reset() {
    "use strict";

    // user account API interface
    api_init(0, 'cs');

    // folder link API interface
    api_init(1, 'cs');

    // active view's SC interface (chunked mode)
    api_init(2, 'sc', { '{[a{'      : sc_packet,     // SC command
                        '{[a{{t[f{' : sc_node,       // SC node
                        '{[a{{t[f2{': sc_node,       // SC node (versioned)
                        '{'         : sc_residue,    // SC residue
                        '#'         : api_esplit }); // numeric error code


    // user account event notifications
    api_init(3, 'sc');

    // active view's initial tree fetch (chunked mode)
    api_init(4, 'cs', { '[{[ok0{' : tree_ok0,        // tree shareownerkey
                        '[{[f{'   : tree_node,       // tree node
                        '[{[f2{'  : tree_node,       // tree node (versioned)
                        '['       : tree_residue,    // tree residue
                        '#'       : api_esplit });   // numeric error code

    // WSC interface (chunked mode)
    api_init(5, 'wsc', {
        '{[a{': sc_packet,     // SC command
        '{[a{{t[f{': sc_node,       // SC node
        '{[a{{t[f2{': sc_node,       // SC node (versioned)
        '{': sc_residue,    // SC residue
        '#': api_esplit // numeric error code
    });

}

mBroadcaster.once('boot_done', api_reset);

// a chunked request received a purely numerical response - handle it the usual way
function api_esplit(e) {
    api_reqerror(this.q, e, false);
}

function api_setsid(sid) {
    "use strict";

    if (sid !== false) {
        watchdog.notify('setsid', sid);

        if (typeof dlmanager === 'object') {

            dlmanager._onOverQuotaAttemptRetry();
        }
        sid = 'sid=' + sid;
    }
    else {
        sid = '';
    }

    apixs[0].sid = sid;
    apixs[2].sid = sid;
    apixs[3].sid = sid;
    apixs[4].sid = sid;
    apixs[5].sid = sid;
}

function api_setfolder(h) {
    "use strict";

    h = 'n=' + h;

    if (u_sid) {
        h += '&sid=' + u_sid;
    }

    apixs[1].sid = h;
    apixs[2].sid = h;
    apixs[4].sid = h;
    apixs[5].sid = h;
}

function stopapi() {
    "use strict";

    if (typeof M === 'object' && $.len(M._apiReqInflight)) {
        if (d) {
            console.warn('Aborting in-flight API requests...', M._apiReqInflight);
        }

        M._apiReqInflight = Object.create(null);
        M._apiReqPollCache = Object.create(null);
    }

    for (var i = apixs.length; i--;) {
        api_cancel(apixs[i]);
        apixs[i].cmdsQueue.clear();
        apixs[i].cmdsBuffer = [];
        apixs[i].ctxsBuffer = [];
    }
}

function api_cancel(q) {
    "use strict";

    if (q) {
        if (q.xhr) {
            // setting the "cancelled" flag ensures that
            // subsequent onerror/onload/onprogress callbacks are ignored.
            q.xhr.cancelled = true;
            if (q.xhr.abort) q.xhr.abort();
            q.xhr = false;
        }
        if (q.timer) {
            clearTimeout(q.timer);
        }
    }
}

function api_init(channel, service, split) {
    "use strict";

    if (apixs[channel]) {
        api_cancel(apixs[channel]);
    }

    apixs[channel] = {
        c: channel,                 // channel
        cmdsQueue: new ApiQueue(),    // queued executing commands + contexts
        cmdsBuffer: [],               // pulled cmds from queue (under processing)
        ctxsBuffer: [],               // pulled ctxs from queue
        i: 0,                       // currently executing buffer
        seqno: -Math.floor(Math.random() * 0x100000000), // unique request start ID
        xhr: false,                 // channel XMLHttpRequest
        timer: false,               // timer for exponential backoff
        failhandler: api_reqfailed, // request-level error handler
        backoff: 0,                 // timer backoff
        service: service,           // base URI component
        sid: '',                    // sid URI component (optional)
        split: split,               // associated JSON splitter rules, presence triggers progressive/chunked mode
        splitter: false,            // JSONSplitter instance implementing .split
        rawreq: false,
        setimmediate: false
    };
}


/**
 * queue request on API channel
 * @param {Object} request              request object to be sent to API
 * @param {Object} context              context object to be returned with response, has 'callback' func to be called
 * @param {Number} channel              optional - channel number to use (default =0)
 */
function api_req(request, context, channel) {
    "use strict";

    if (channel === undefined) {
        channel = 0;
    }

    if (d) console.debug("API request on " + channel + ": " + JSON.stringify(request));

    if (context === undefined) {
        context = Object.create(null);
    }

    var q = apixs[channel];

    q.cmdsQueue.enqueue(request, context);

    if (!q.setimmediate) {
        q.setimmediate = setTimeout(api_proc, 0, q);
    }
}

// indicates whether this is a Firefox supporting the moz-chunked-*
// responseType or a Chrome derivative supporting the fetch API
// values: unknown: -1, no: 0, moz-chunked: 1, fetch: 2
// FIXME: check for fetch on !Firefox, not just on Chrome
var chunked_method = window.chrome ? (self.fetch ? 2 : 0) : -1;

if (typeof Uint8Array.prototype.indexOf !== 'function' || is_firefox_web_ext) {
    if (d) {
        console.debug('No chunked method on this browser: ' + ua);
    }
    chunked_method = 0;
}

// this kludge emulates moz-chunked-arraybuffer with XHR-style callbacks
function chunkedfetch(xhr, uri, postdata, httpMethod) {
    "use strict";

    var fail = function(ex) {
        if (d) {
            console.error("Fetch error", ex);
        }
        // at this point fake a partial data to trigger a retry..
        xhr.status = 206;
        xhr.onloadend();
    };
    var requestBody = {
        method: 'POST',
        body: postdata
    };

    if (httpMethod === 'GET') {
        requestBody.method = 'GET';
        delete requestBody.body;
    }

    fetch(uri, requestBody).then(function(response) {
        var reader = response.body.getReader();
        var evt = {loaded: 0};
        xhr.status = response.status;
        xhr.totalBytes = response.headers.get('Original-Content-Length') | 0;

        (function chunkedread() {
            return reader.read().then(function(r) {
                if (r.done) {
                    // signal completion through .onloadend()
                    xhr.response = null;
                    xhr.onloadend();
                }
                else {
                    // feed received chunk to JSONSplitter via .onprogress()
                    evt.loaded += r.value.length;
                    xhr.response = r.value;
                    xhr.onprogress(evt);
                    chunkedread();
                }
            }).catch(fail);
        })();
    }).catch(fail);
}

// send pending API request on channel q
function api_proc(q) {
    "use strict";

    var logger = d && MegaLogger.getLogger('crypt');
    if (q.setimmediate) {
        clearTimeout(q.setimmediate);
        q.setimmediate = false;
    }

    if (q.cmdsQueue.size() === 0 || q.cmdsBuffer.length && q.cmdsBuffer.length > 0) {
        return;
    }
    var currCmd = [];
    var currCtx = [];
    var element = q.cmdsQueue.dequeue(); // only first element alone
    if (element) {
        currCmd.push(element.st1);
        currCtx.push(element.st2);
        if (!element.st1.length) { // we will distinguish String + array of CMDs
            element = q.cmdsQueue.dequeue(true);
            while (element) {
                currCmd.push(element.st1);
                currCtx.push(element.st2);
                element = q.cmdsQueue.dequeue(true);
            }
        }
    }

    q.cmdsBuffer = currCmd;
    q.ctxsBuffer = currCtx;


    if (!q.xhr) {
        // we need a real XHR only if we don't use fetch for this channel
        q.xhr = (!q.split || chunked_method != 2) ? getxhr() : Object.create(null);

        q.xhr.q = q;

        // JSON splitters are keen on processing the data as soon as it arrives,
        // so route .onprogress to it.
        if (q.split) {
            q.xhr.onprogress = function(evt) {
                if (!this.cancelled) {
                    // caller wants progress updates? give caller progress updates!
                    if (this.q.ctxsBuffer[0] && this.q.ctxsBuffer[0].progress) {
                        var progressPercent = 0;
                        var bytes = evt.total || this.totalBytes;

                        if (!bytes) {
                            // this may throw an exception if the header doesn't exist
                            try {
                                bytes = this.getResponseHeader('Original-Content-Length') | 0;
                                this.totalBytes = bytes;
                            }
                            catch (e) {}
                        }

                        if (evt.loaded > 0 && bytes > 2) {
                            this.q.ctxsBuffer[0].progress(evt.loaded / bytes * 100);
                        }
                    }

                    // update number of bytes received in .onprogress() for subsequent check
                    // in .onloadend() whether it contains more data

                    var chunk = this.response;

                    // is this an ArrayBuffer? turn into a Uint8Array
                    if (!(chunk.length >= 0)) chunk = new Uint8Array(chunk);

                    if (!chunked_method) {
                        // unfortunately, we're receiving a growing response
                        this.q.received = chunk.length;
                    }
                    else {
                        // wonderful, we're receiving a chunked response
                        this.q.received += chunk.length;
                    }

                    // send incoming live data to splitter
                    // for maximum flexibility, the splitter ctx will be the XHR
                    if (!this.q.splitter.chunkproc(chunk, chunk.length === this.totalBytes)) {
                        // a JSON syntax error occurred: hard reload
                        fm_fullreload(this.q, 'onerror JSON Syntax Error');
                    }
                }
            };
        }

        q.xhr.onloadend = function onAPIProcXHRLoad(ev) {
            if (!this.cancelled) {
                var t;
                var status = this.status;

                if (status == 200) {
                    var response = this.response;

                    // is this residual data that hasn't gone to the splitter yet?
                    if (this.q.splitter) {
                        // we process the full response if additional bytes were received
                        // FIXME: in moz-chunked transfers, if onload() can contain chars beyond
                        // the last onprogress(), send .substr(this.q.received) instead!
                        // otherwise, we send false to indicate no further input
                        // in all cases, set the inputcomplete flag to catch incomplete API responses
                        if (!this.q.splitter.chunkproc((response && (response.length > this.q.received || typeof this.totalBytes === 'undefined')) ? response : false, true)) {
                            fm_fullreload(this.q, 'onload JSON Syntax Error');
                        }
                        return;
                    }

                    if (d) {
                        logger.debug('API response:', response);
                    }

                    try {
                        t = JSON.parse(response);
                        if (response[0] == '{') {
                            t = [t];
                        }

                        status = true;
                    } catch (e) {
                        // bogus response, try again
                        if (d) {
                            logger.debug("Bad JSON data in response: " + response);
                        }
                        t = EAGAIN;
                    }
                }
                else {
                    if (d) {
                        logger.debug('API server connection failed (error ' + status + ')');
                    }
                    t = ERATELIMIT;
                }

                if (typeof t === 'object') {
                    var ctxs = this.q.ctxsBuffer;
                    var paywall;
                    for (var i = 0; i < ctxs.length; i++) {
                        var ctx = ctxs[i];

                        if (typeof ctx.callback === 'function') {
                            var res = t[i];

                            if (res && res.err < 0) {
                                // eslint-disable-next-line max-depth
                                if (d) {
                                    logger.debug('APIv2 Custom Error Detail', res, this.q.cmdsBuffer[i]);
                                }
                                ctx.v2APIError = res;
                                res = res.err;
                            }
                            if (res === EPAYWALL) {
                                paywall = true;
                            }
                            ctx.callback(res, ctx, this, t);
                        }
                    }
                    if (paywall) {
                        api_reqerror(this.q, EPAYWALL, status);
                    }

                    // reset state for next request
                    api_ready(this.q);
                    api_proc(this.q);
                }
                else {
                    if (ev && ev.type === 'error') {
                        if (logger) {
                            logger.debug("API request error - retrying");
                        }
                    }
                    api_reqerror(this.q, t, status);
                }
            }
        };
    }

    if (q.rawreq === false) {
        q.url = apipath + q.service
              + '?id=' + (q.seqno++)
              + '&' + q.sid
              + (q.split ? '&ec' : '')  // encoding: chunked if splitter attached
              + mega.urlParams();       // additional parameters

        if (typeof q.cmdsBuffer[0] === 'string') {
            q.url += '&' + q.cmdsBuffer[0];
            q.rawreq = '';
        }
        else {
            if (q.cmdsBuffer.length === 1 && q.cmdsBuffer[0].length) {
                q.url += '&bc=1';
                q.rawreq = JSON.stringify(q.cmdsBuffer[0]);
            }
            else {
                q.rawreq = JSON.stringify(q.cmdsBuffer);
            }
        }
    }

    api_send(q);
}

function api_send(q) {
    "use strict";

    var logger = d && MegaLogger.getLogger('crypt');
    q.timer = false;

    if (q.xhr === false) {
        if (logger) {
            logger.debug("API request aborted: " + q.rawreq + " to " + q.url);
        }
        return;
    }

    if (logger) {
        logger.debug("Sending API request: " + q.rawreq + " to " + String(q.url).replace(/sid=[\w-]+/, 'sid=\u2026'));
    }

    // reset number of bytes received and response size
    q.received = 0;
    delete q.xhr.totalBytes;

    q.xhr.cancelled = false;

    if (q.split && chunked_method == 2) {
        // use chunked fetch with JSONSplitter input type Uint8Array
        q.splitter = new JSONSplitter(q.split, q.xhr, true);
        chunkedfetch(q.xhr, q.url, q.rawreq, (q.service === 'wsc') ? 'GET' : null);
    }
    else {
        // use legacy XHR API
        q.xhr.open('POST', q.url, true);

        if (q.split) {
            if (chunked_method) {
                // FIXME: use Fetch API if more efficient than this
                q.xhr.responseType = 'moz-chunked-arraybuffer';

                // first try? record success
                if (chunked_method < 0) {
                    chunked_method = q.xhr.responseType == 'moz-chunked-arraybuffer';
                }
            }

            // at this point, chunked_method being logically true implies arraybuffer
            q.splitter = new JSONSplitter(q.split, q.xhr, chunked_method);
         }

        q.xhr.send(q.rawreq);
    }
}

function api_reqerror(q, e, status) {
    'use strict';
    var c = e | 0;

    if (typeof e === 'object' && e.err < 0) {
        c = e.err | 0;
    }

    if (c === EAGAIN || c === ERATELIMIT) {
        // request failed - retry with exponential backoff
        if (q.backoff) {
            q.backoff = Math.min(600000, q.backoff << 1);
        }
        else {
            q.backoff = 125+Math.floor(Math.random()*600);
        }

        q.timer = setTimeout(api_send, q.backoff, q);

        c = EAGAIN;
    }
    else {
        q.failhandler(q.c, e);
    }

    if (mega.state & window.MEGAFLAG_LOADINGCLOUD) {
        if (status === true && c === EAGAIN) {
            mega.loadReport.EAGAINs++;
        }
        else if (status === 500) {
            mega.loadReport.e500s++;
        }
        else {
            mega.loadReport.errs++;
        }
    }
}

function api_ready(q) {
    q.rawreq = false;
    q.backoff = 0; // request succeeded - reset backoff timer
    q.cmdsBuffer = [];
    q.ctxsBuffer = [];
}

var apiFloorCap = 3000;

function api_retry() {
    "use strict";

    for (var i = apixs.length; i--; ) {
        if (apixs[i].timer && apixs[i].backoff > apiFloorCap) {
            clearTimeout(apixs[i].timer);
            apixs[i].backoff = apiFloorCap;
            apixs[i].timer = setTimeout(api_send, apiFloorCap, apixs[i]);
        }
    }
}

function api_reqfailed(channel, error) {
    'use strict';

    var e = error | 0;
    var c = channel | 0;

    if (typeof error === 'object' && error.err < 0) {
        e = error.err | 0;
    }

    // does this failure belong to a folder link, but not on the SC channel?
    if (apixs[c].sid[0] === 'n' && c !== 2) {
        // yes: handle as a failed folder link access
        return folderreqerr(c, error);
    }

    if (e === ESID) {
        u_logout(true);
        Soon(function() {
            showToast('clipboard', l[19]);
        });
        loadingInitDialog.hide();
        loadingDialog.hide('force'); // subjected loading dialog is not hide by loadsubpage, so force hide it.
        loadSubPage('login');
    }
    else if ((c === 2 || c === 5) && e === ETOOMANY) {
        // too many pending SC requests - reload from scratch
        fm_fullreload(this.q, 'ETOOMANY');
    }
    // if suspended account
    else if (e === EBLOCKED) {
        var queue = apixs[c];
        queue.rawreq = false;
        queue.cmdsQueue.clear();
        queue.cmdsBuffer = [];
        queue.ctxsBuffer = [];
        queue.setimmediate = false;

        api_req({ a: 'whyamiblocked' }, {
            callback: function whyAmIBlocked(reasonCode) {
                var setLogOutOnNavigation = function() {
                    onIdle(function() {
                        mBroadcaster.once('pagechange', function() {
                            u_logout();
                            location.reload(true);
                        });
                    });
                    window.doUnloadLogOut = 0x9001;
                    return false;
                };

                // On clicking OK, log the user out and redirect to contact page
                loadingDialog.hide();

                var reasonText = '';
                var dialogTitle = l[17768];// Terminated account

                if (reasonCode === 200) {
                    dialogTitle = l[6789];// Suspended account
                    reasonText = l[17741];// Your account has been suspended due to multiple breaches of Mega's Terms..
                }
                else if (reasonCode === 300) {
                    reasonText = l[17740];// Your account was terminated due to breach of Mega's Terms of Service...
                }
                else if (reasonCode === 400) {
                    reasonText = l[19748];// Your account is disabled by administrator
                }
                else if (reasonCode === 401) {
                    reasonText = l[20816];// Your account is deleted (business user)
                }
                else if (reasonCode === 500) {

                    // Handle SMS verification for suspended account
                    if (is_mobile) {
                        loadSubPage('sms/add-phone-suspended');
                    }
                    else {
                        sms.phoneInput.init(true);
                    }

                    // Allow user to escape from SMS verification dialog in order to login a different account.
                    return setLogOutOnNavigation();
                }
                else if (reasonCode === 700) {
                    var to = String(page).startsWith('emailverify') && 'login-to-account';
                    security.showVerifyEmailDialog(to);

                    // Allow user to escape from Email verification dialog in order to login a different account.
                    return setLogOutOnNavigation();
                }
                else {
                    // Unknown reasonCode
                    reasonText = l[17740]; // Your account was terminated due to breach of Mega's Terms of Service...
                }

                // Log the user out for all scenarios except SMS required (500)
                u_logout(true);

                // if fm-overlay click handler was initialized, we remove the handler to prevent dialog skip
                $('.fm-dialog-overlay').off('click.fm');
                if (is_mobile) {
                    parsepage(pages['mobile']);
                }
                msgDialog('warninga', dialogTitle,
                    reasonText,
                    false,
                    function () {
                        var redirectUrl = getAppBaseUrl() + '#contact';
                        window.location.replace(redirectUrl);
                    }
                );
            }
        });
    }
    else if (e === EPAYWALL) {
        if (window.M) {
            if (M.account && u_attr && !u_attr.uspw) {
                M.account = null;
            }
            if (window.loadingDialog) {
                loadingDialog.hide();
            }
            M.showOverStorageQuota(e);
        }
    }
    else {
        api_reqerror(apixs[c], EAGAIN, 0);
    }
}

var failxhr;
var failtime = 0;

function api_reportfailure(hostname, callback) {
    if (!hostname) {
        return Soon(callback);
    }

    var t = new Date().getTime();

    if (t - failtime < 60000) {
        return;
    }
    failtime = t;

    if (failxhr) {
        failxhr.abort();
    }

    failxhr = getxhr();
    failxhr.open('POST', apipath + 'pf?h', true);
    failxhr.callback = callback;

    failxhr.onload = function () {
        if (this.status === 200) {
            failxhr.callback();
        }
    };

    failxhr.send(hostname);
}

var waiturl;
var waitxhr;
var waitbackoff = 125;
var waittimeout;
var waitbegin;
var waitid = 0;
var cmsNotifHandler = localStorage.cmsNotificationID || 'Nc4AFJZK';

function stopsc() {
    "use strict";

    if (waitxhr && waitxhr.readyState !== waitxhr.DONE) {
        waitxhr.abort();
        waitxhr = false;
    }

    if (waittimeout) {
        clearTimeout(waittimeout);
        waittimeout = false;
    }
}

// if set, further sn updates are disallowed (the local state has become invalid)
function setsn(sn) {
    "use strict";

    // update sn in DB, triggering a "commit" of the current "transaction"
    if (fmdb) {
        attribCache.flush();
        fmdb.add('_sn', { i : 1, d : sn });
    }
}

// are we processing historical SC commands?
var initialscfetch;

// last step of the streamed SC response processing
function sc_residue(sc) {
    /*jshint validthis: true */
    "use strict";

    if (sc.sn) {
        // enqueue new sn
        currsn = sc.sn;
        scq[scqhead++] = [{ a: '_sn', sn: currsn }];
        resumesc();

        if (initialscfetch) {
            // we have concluded the post-load SC fetch, as we have now
            // run out of new actionpackets: show filemanager!
            scq[scqhead++] = [{ a: '_fm' }];
            initialscfetch = false;
            resumesc();
        }

        // we're done, wait for more
        if (sc.w) {
            waiturl = sc.w + '?' + apixs[5].sid + '&sn=' + currsn;
        }
        else if (!waiturl) {
            console.error("Strange error, we dont know WSC url and we didnt get it");
            return getsc(true);
        }
        waittimeout = setTimeout(waitsc, waitbackoff);

        if ((mega.state & window.MEGAFLAG_LOADINGCLOUD) && !mega.loadReport.recvAPs) {
            mega.loadReport.recvAPs = Date.now() - mega.loadReport.stepTimeStamp;
            mega.loadReport.stepTimeStamp = Date.now();
        }
    }
    else {
        // malformed SC response - take the conservative route and reload fully
        // FIXME: add one single retry if !sscount: Clear scq, clear worker state,
        // then reissue getsc() (difficult to get right - be cautious)
        return fm_fullreload(null, 'malformed SC response');
    }

    // (mandatory steps at the conclusion of a successful split response)
    if (this.q) {
        api_ready(this.q);
        api_proc(this.q);
    }
}

// getsc() serialisation (getsc() can be called anytime from anywhere if
// someone thinks that it is beneficial!)
var gettingsc;

// request new actionpackets and stream them to sc_packet() as they come in
// nodes in t packets are streamed to sc_node()
function getsc(force) {
    "use strict";

    if (force) {
        gettingsc = true;

        if (waitxhr) {
            waitxhr.abort();
        }

        api_cancel(apixs[5]);   // retire existing XHR that may still be completing the request
        if (currsn) {
            api_ready(apixs[5]);
            api_req('sn=' + currsn, {}, 5);

            if (mega.state & window.MEGAFLAG_LOADINGCLOUD) {
                mega.loadReport.scSent = Date.now();
            }
        }
        else {
            if (d) {
                console.error('Get WSC is called but without SN, it\'s a bug... please trace');
            }
            eventlog(99737);
        }
    }
}

function waitsc() {
    "use strict";

    var MAX_WAIT = 40e3;
    var newid = ++waitid;

    stopsc();

    if (!waitxhr) {
        waitxhr = getxhr();
    }
    waitxhr.waitid = newid;

    waittimeout = setTimeout(waitsc, MAX_WAIT);

    waitxhr.onloadend = function(ev) {
        if (this.waitid === waitid) {
            if (this.status !== 200) {
                if (d) {
                    console.info('waitsc(%s:%s)', this.status, ev.type, ev);
                }

                clearTimeout(waittimeout);
                waitbackoff = Math.min(MAX_WAIT, waitbackoff << 1);
                waittimeout = setTimeout(waitsc, waitbackoff);
            }
            else {
                // Increase backoff if we do keep receiving packets is rapid succession, so that we maintain
                // smaller number of connections to process more data at once - backoff up to 4 seconds.
                stopsc();
                if (Date.now() - waitbegin < 1000) {
                    waitbackoff = Math.min(4e3, waitbackoff << 1);
                }
                else {
                    waitbackoff = 250;
                }

                var delieveredResponse = this.response;
                if (delieveredResponse === '0') {
                    // clearTimeout(waittimeout); mo need for clearing, we stopped
                    // immediately re-connect.
                    waittimeout = setTimeout(waitsc, 0);
                }
                else if ($.isNumeric(delieveredResponse)) {
                    if (delieveredResponse == ETOOMANY) {
                        // WSC is stopped at the beginning.
                        fm_fullreload(null, 'ETOOMANY');
                    }
                    else if (delieveredResponse == EAGAIN || delieveredResponse == ERATELIMIT) {
                        // WSC is stopped at the beginning.
                        waittimeout = setTimeout(waitsc, waitbackoff);
                    }
                    else if (delieveredResponse == EBLOCKED) {
                        // == because API response will be in a string
                        api_reqfailed(5, EBLOCKED);
                    }
                }
                else if (!apixs[5].split) {
                    console.error('WSC has no splitter !!!!');
                }
                else {
                    var wscSplitter = new JSONSplitter(apixs[5].split, waitxhr, false);
                    if (!wscSplitter.chunkproc(delieveredResponse, true)) {
                        fm_fullreload(null, 'onload JSON Syntax Error');
                    }
                }
            }
        }
    };

    waitbegin = Date.now();
    waitxhr.open('POST', waiturl, true);
    waitxhr.send();
}
mBroadcaster.once('startMega', function() {
    'use strict';

    window.addEventListener('online', function(ev) {
        if (d) {
            console.info(ev);
        }
        api_retry();

        if (waiturl) {
            waitsc();
        }
    });

    var invisibleTime;
    document.addEventListener('visibilitychange', function(ev) {
        if (d) {
            console.info(ev, document.hidden);
        }

        if (document.hidden) {
            invisibleTime = Date.now();
        }
        else {
            invisibleTime = Date.now() - invisibleTime;

            if (mega.loadReport && !mega.loadReport.sent) {
                if (!mega.loadReport.invisibleTime) {
                    mega.loadReport.invisibleTime = 0;
                }
                mega.loadReport.invisibleTime += invisibleTime;
            }
        }

        mBroadcaster.sendMessage('visibilitychange:' + Boolean(document.hidden));
    });
});

function api_create_u_k() {
    u_k = Array(4); // static master key, will be stored at the server side encrypted with the master pw

    for (var i = 4; i--;) {
        u_k[i] = rand(0x100000000);
    }
}

// If the user triggers an action that requires an account, but hasn't logged in,
// we create an anonymous preliminary account. Returns userhandle and passwordkey for permanent storage.
function api_createuser(ctx, invitecode, invitename, uh) {
    var logger = MegaLogger.getLogger('crypt');
    var i;
    var ssc = Array(4); // session self challenge, will be used to verify password
    var req, res;

    if (!ctx.passwordkey) {
        ctx.passwordkey = Array(4);
        for (i = 4; i--;) {
            ctx.passwordkey[i] = rand(0x100000000);
        }
    }

    if (!u_k) {
        api_create_u_k();
    }

    for (i = 4; i--;) {
        ssc[i] = rand(0x100000000);
    }

    logger.debug("api_createuser - masterkey: " + u_k + " passwordkey: " + ctx.passwordkey);

    // in business sub-users API team decided to hack "UP" command to include "UC2" new arguments.
    // so now. we will check if this is a business sub-user --> we will add extra arguments to "UP" (crv,hak,v)

    var doApiRequest = function (request) {
        if (mega.affid) {
            req.aff = mega.affid;
        }
        logger.debug("Storing key: " + request.k);

        api_req(request, ctx);
        watchdog.notify('createuser');
    };

    req = {
            a: 'up',
            k: a32_to_base64(encrypt_key(new sjcl.cipher.aes(ctx.passwordkey), u_k)),
            ts: base64urlencode(a32_to_str(ssc) + a32_to_str(encrypt_key(new sjcl.cipher.aes(u_k), ssc)))
        };

    // invite code usage is obsolete. it's only used in case of business sub-users
    // therefore, if it exists --> we are registering a business sub-user
    if (invitecode) {
        req.ic = invitecode;
        req.name = invitename;

        security.deriveKeysFromPassword(ctx.businessUser, u_k,
            function (clientRandomValueBytes, encryptedMasterKeyArray32,
                hashedAuthenticationKeyBytes, derivedAuthenticationKeyBytes) {
                req.crv = ab_to_base64(clientRandomValueBytes);
                req.hak = ab_to_base64(hashedAuthenticationKeyBytes);
                req.v = 2;
                req.k = a32_to_base64(encryptedMasterKeyArray32);
                ctx.uh = ab_to_base64(derivedAuthenticationKeyBytes);

                doApiRequest(req);
            }
        );

    }
    else {
        doApiRequest(req);
    }

}

function api_checkconfirmcode(ctx, c) {
    res = api_req({
        a: 'uc',
        c: c
    }, ctx);
}

/* jshint -W098 */  // It is used in another file
function api_resetuser(ctx, emailCode, email, password) {

    // start fresh account
    api_create_u_k();

    var pw_aes = new sjcl.cipher.aes(prepare_key_pw(password));

    var ssc = Array(4);
    for (var i = 4; i--;) {
        ssc[i] = rand(0x100000000);
    }

    api_req({
        a: 'erx',
        c: emailCode,
        x: a32_to_base64(encrypt_key(pw_aes, u_k)),
        y: stringhash(email.toLowerCase(), pw_aes),
        z: base64urlencode(a32_to_str(ssc) + a32_to_str(encrypt_key(new sjcl.cipher.aes(u_k), ssc)))
    }, ctx);
}

function api_resetkeykey(ctx, code, key, email, pw) {

    'use strict';

    ctx.c = code;
    ctx.email = email;
    ctx.k = key;
    ctx.pw = pw;
    ctx.callback = api_resetkeykey2;

    api_req({
        a: 'erx',
        r: 'gk',
        c: code
    }, ctx);
}
/* jshint +W098 */

function api_resetkeykey2(res, ctx) {
    try {
        api_resetkeykey3(res, ctx);
    }
    catch (ex) {
        ctx.result(EKEY);
    }
}

function api_resetkeykey3(res, ctx) {

    'use strict';

    if (typeof res === 'string') {

        if (!verifyPrivateRsaKeyDecryption(res, ctx.k)) {
            ctx.result(EKEY);
        }
        else if (ctx.email && ctx.pw) {
            var pw_aes = new sjcl.cipher.aes(prepare_key_pw(ctx.pw));

            ctx.callback = ctx.result;
            api_req({
                a: 'erx',
                r: 'sk',
                c: ctx.c,
                x: a32_to_base64(encrypt_key(pw_aes, ctx.k)),
                y: stringhash(ctx.email.toLowerCase(), pw_aes)
            }, ctx);
        }
        else {
            ctx.result(0);
        }
    }
    else {
        ctx.result(res);
    }
}

/**
 * Verify that the Private RSA key was decrypted successfully by the Master/Recovery Key
 * @param {String} encryptedPrivateRsaKeyBase64 The encrypted Private RSA key as a Base64 string
 * @param {Array} masterKeyArray32 The Master/Recovery Key
 * @returns {Boolean} Returns true if the decryption succeeded, false if it failed
 */
function verifyPrivateRsaKeyDecryption(encryptedPrivateRsaKeyBase64, masterKeyArray32) {

    'use strict';

    try {
        // Decrypt the RSA key
        var privateRsaKeyArray32 = base64_to_a32(encryptedPrivateRsaKeyBase64);
        var cipherObject = new sjcl.cipher.aes(masterKeyArray32);
        var decryptedPrivateRsaKey = decrypt_key(cipherObject, privateRsaKeyArray32);
        var privateRsaKeyStr = a32_to_str(decryptedPrivateRsaKey);

        // Verify the integrity of the decrypted private key
        for (var i = 0; i < 4; i++) {
            var l = ((privateRsaKeyStr.charCodeAt(0) * 256 + privateRsaKeyStr.charCodeAt(1) + 7) >> 3) + 2;

            if (privateRsaKeyStr.substr(0, l).length < 2) {
                break;
            }
            privateRsaKeyStr = privateRsaKeyStr.substr(l);
        }

        // If invalid
        if (i !== 4 || privateRsaKeyStr.length >= 16) {
            return false;
        }

        return true;
    }
    catch (exception) {
        return false;
    }
}

// We query the sid using the supplied user handle (or entered email address, if already attached)
// and check the supplied password key.
// Returns [decrypted master key,verified session ID(,RSA private key)] or false if API error or
// supplied information incorrect
function api_getsid(ctx, user, passwordkey, hash, pinCode) {
    "use strict";

    ctx.callback = api_getsid2;
    ctx.passwordkey = passwordkey;

    // If previously blocked for too many login attempts, return early and show warning with time they can try again
    if (api_getsid.etoomany + 3600000 > Date.now() || location.host === 'webcache.googleusercontent.com') {
        return ctx.checkloginresult(ctx, ETOOMANY);
    }

    // Setup the login request
    var requestVars = { a: 'us', user: user, uh: hash };

    // If the two-factor authentication code was entered by the user, add it to the request as well
    if (pinCode !== null) {
        requestVars.mfa = pinCode;
    }

    api_req(requestVars, ctx);
}

api_getsid.warning = function() {
    var time = new Date(api_getsid.etoomany + 3780000).toLocaleTimeString();

    msgDialog('warningb', l[882], l[8855].replace('%1', time));
};

function api_getsid2(res, ctx) {
    var t, k;
    var r = false;

    // If the result is an error, pass that back to get an exact error
    if (typeof res === 'number') {
        ctx.checkloginresult(ctx, res);
        return false;
    }
    else if (typeof res === 'object') {
        var aes = new sjcl.cipher.aes(ctx.passwordkey);

        // decrypt master key
        if (typeof res.k === 'string') {
            k = base64_to_a32(res.k);

            if (k.length === 4) {
                k = decrypt_key(aes, k);

                aes = new sjcl.cipher.aes(k);

                if (typeof res.tsid === 'string') {
                    t = base64urldecode(res.tsid);
                    if (a32_to_str(encrypt_key(aes,
                            str_to_a32(t.substr(0, 16)))) === t.substr(-16)) {
                        r = [k, res.tsid];
                    }
                }
                else if (typeof res.csid === 'string') {
                    var t = base64urldecode(res.csid);
                    var privk = null;

                    try {
                        privk = crypto_decodeprivkey(a32_to_str(decrypt_key(aes, base64_to_a32(res.privk))));
                    }
                    catch (ex) {
                        console.error('Error decoding private RSA key!', ex);

                        Soon(function() {
                            msgDialog('warninga', l[135], l[8853]);
                        });
                    }

                    if (privk) {
                        // TODO: check remaining padding for added early wrong password detection likelihood
                        r = [k, base64urlencode(crypto_rsadecrypt(t, privk).substr(0, 43)), privk];
                    }
                    else {
                        // Bad decryption of RSA is an indication that the password was wrong
                        ctx.checkloginresult(ctx, false);
                        return false;
                    }
                }
            }
        }
    }

    // emailchange namespace exists, that means the user
    // attempted to verify their new email address without a session
    // therefore we showed them the login dialog. Now we call `emailchange.verify`
    // so the email verification can continue as expected.
    if (r && typeof emailchange === 'object') {
        emailchange.verify(new sjcl.cipher.aes(ctx.passwordkey), { k1: res.k, k2: k });
    }

    ctx.result(ctx, r);
}

// We call ug using the sid from setsid() and the user's master password to obtain the master key (and other credentials)
// Returns user credentials (.k being the decrypted master key) or false in case of an error.
function api_getuser(ctx) {
    api_req({
        a: 'ug'
    }, ctx);
}

/**
 * Send current node attributes to the API
 * @return {MegaPromise}
 */
function api_setattr(n, idtag) {
    "use strict";

    var promise = new MegaPromise();
    var logger = MegaLogger.getLogger('crypt');

    var ctx = {
        callback: function(res) {
            if (res !== 0) {
                logger.error('api_setattr', res);
                promise.reject(res);
            }
            else {
                promise.resolve(res);
            }
        }
    };

    if (!crypto_keyok(n)) {
        logger.warn('Unable to set node attributes, invalid key on %s', n.h, n);
        return MegaPromise.reject(EKEY);
    }

    try {
        var at = ab_to_base64(crypto_makeattr(n));

        logger.debug('Setting node attributes for "%s"...', n.h, idtag);

        // we do not set i here, unless explicitly specified
        api_req({a: 'a', n: n.h, at: at, i: idtag}, ctx);

        if (idtag) {
            M.scAckQueue[idtag] = Date.now();
        }
    }
    catch (ex) {
        logger.error(ex);
        promise.reject(ex);
    }

    return promise;
}

function stringhash(s, aes) {
    var s32 = str_to_a32(s);
    var h32 = [0, 0, 0, 0];
    var i;

    for (i = 0; i < s32.length; i++) {
        h32[i & 3] ^= s32[i];
    }

    for (i = 16384; i--;) {
        h32 = aes.encrypt(h32);
    }

    return a32_to_base64([h32[0], h32[2]]);
}

// Update user
// Can also be used to set keys and to confirm accounts (.c)
function api_updateuser(ctx, newuser) {
    newuser.a = 'up';

    if (mega.affid) {
        newuser.aff = mega.affid;
    }

    api_req(newuser, ctx);
}

var u_pubkeys = Object.create(null);

/**
 * Query missing keys for the given users.
 *
 * @return {MegaPromise}
 */
function api_cachepubkeys(users) {

    var logger = MegaLogger.getLogger('crypt');
    var u = [];
    var i;

    for (i = users.length; i--;) {
        if (users[i] !== 'EXP' && !u_pubkeys[users[i]]) {
            u.push(users[i]);
        }
    }

    // Fire off the requests and track them.
    var keyPromises = [];
    for (i = u.length; i--;) {
        keyPromises.push(crypt.getPubRSA(u[i]));
    }

    var gotPubRSAForEveryone = function() {
        for (i = u.length; i--;) {
            if (!u_pubkeys[u[i]]) {
                return false;
            }
        }
        return true;
    };
    var promise = new MegaPromise();

    // Make a promise for the bunch of them, and define settlement handlers.
    MegaPromise.allDone(keyPromises)
        .always(function __getKeysDone() {
            if (gotPubRSAForEveryone()) {
                logger.debug('Cached RSA pub keys for users ' + JSON.stringify(u));
                promise.resolve.apply(promise, arguments);
            }
            else {
                logger.warn('Failed to cache RSA pub keys for users' + JSON.stringify(u), arguments);
                promise.reject.apply(promise, arguments);
            }
        });

    return promise;
}

/**
 * Encrypts a cleartext data string to a contact.
 *
 * @param {String} user
 *     User handle of the contact.
 * @param {String} data
 *     Clear text to encrypt.
 * @return {String|Boolean}
 *     Encrypted cipher text, or `false` in case of unavailability of the RSA
 *     public key (needs to be obtained/cached beforehand).
 */
function encryptto(user, data) {
    var pubkey;

    if ((pubkey = u_pubkeys[user])) {
        return crypto_rsaencrypt(data, pubkey);
    }

    return false;
}

/**
 * Add/cancel share(s) to a set of users or email addresses
 * targets is an array of {u,r} - if no r given, cancel share
 * If no sharekey known, tentatively generates one and encrypts
 * everything to it. In case of a mismatch, the API call returns
 * an error, and the whole operation gets repeated (exceedingly
 * rare race condition).
 *
 * @param {String} node
 *     Selected node id.
 * @param {Array} targets
 *     List of user email or user handle and access permission.
 * @param {Array} sharenodes
 *     Holds complete directory tree starting from given node.
 * @returns {MegaPromise}
 */
function api_setshare(node, targets, sharenodes) {

    var masterPromise  = new MegaPromise();

    // cache all targets' public keys
    var targetsPubKeys = [];

    for (var i = targets.length; i--;) {
        targetsPubKeys.push(targets[i].u);
    }

    var cachePromise = api_cachepubkeys(targetsPubKeys);
    cachePromise.done(function _cacheDone() {
        var setSharePromise = api_setshare1({ node: node, targets: targets, sharenodes: sharenodes });
        masterPromise.linkDoneAndFailTo(setSharePromise);
    });
    masterPromise.linkFailTo(cachePromise);

    return masterPromise;
}

/**
 * Actually enacts the setting/cancelling of shares.
 *
 * @param {Object} ctx
 *     Context for API commands.
 * @param {Array} params
 *     Additional parameters.
 * @returns {MegaPromise}
 */
function api_setshare1(ctx, params) {
    var logger = MegaLogger.getLogger('crypt');
    var i, j, n, nk, sharekey, ssharekey;
    var req, res;
    var newkey = true;
    var masterPromise = new MegaPromise();

    req = {
        a: 's2',
        n: ctx.node,
        s: ctx.targets,
        i: requesti
    };

    if (params) {
        logger.debug('api_setshare1.extend', params);
        for (i in params) {
            req[i] = params[i];
        }
    }

    for (i = req.s.length; i--;) {
        if (typeof req.s[i].r !== 'undefined') {
            if (!req.ok) {
                if (u_sharekeys[ctx.node]) {
                    sharekey = u_sharekeys[ctx.node][0];
                    newkey = false;
                }
                else {
                    // we only need to generate a key if one or more shares are being added to a previously unshared node
                    sharekey = [];
                    for (j = 4; j--;) {
                        sharekey.push(rand(0x100000000));
                    }
                    crypto_setsharekey(ctx.node, sharekey, true);
                }

                req.ok = a32_to_base64(encrypt_key(u_k_aes, sharekey));
                req.ha = crypto_handleauth(ctx.node);
                ssharekey = a32_to_str(sharekey);
            }
        }
    }

    if (newkey) {
        req.cr = crypto_makecr(ctx.sharenodes, [ctx.node], true);
    }

    ctx.backoff = 97;
    ctx.maxretry = 4;
    ctx.ssharekey = ssharekey;

    // encrypt ssharekey to known users
    for (i = req.s.length; i--;) {
        if (u_pubkeys[req.s[i].u]) {
            req.s[i].k = base64urlencode(crypto_rsaencrypt(ssharekey, u_pubkeys[req.s[i].u]));
        }
        if (typeof req.s[i].m !== 'undefined') {
            req.s[i].u = req.s[i].m;
        }

        if (M.opc[req.s[i].u]) {
            if (d) {
                logger.warn(req.s[i].u + ' is an outgoing pending contact, fixing to email...', M.opc[req.s[i].u].m);
            }
            // the caller incorrectly passed a handle for a pending contact, so fixup..
            req.s[i].u = M.opc[req.s[i].u].m;
        }
    }

    ctx.req = req;

    /** Callback for API interactions. */
    ctx.callback = function (res, ctx) {
        if (typeof res === 'object') {
            if (res.ok) {
                logger.debug('Share key clash: Set returned key and try again.');
                ctx.req.ok = res.ok;
                var k = decrypt_key(u_k_aes, base64_to_a32(res.ok));
                crypto_setsharekey(ctx.node, k);
                ctx.req.ha = crypto_handleauth(ctx.node);

                var ssharekey = a32_to_str(k);

                for (var i = ctx.req.s.length; i--;) {
                    if (u_pubkeys[ctx.req.s[i].u]) {
                        ctx.req.s[i].k = base64urlencode(crypto_rsaencrypt(ssharekey,
                            u_pubkeys[ctx.req.s[i].u]));
                    }
                }
                logger.info('Retrying share operation.');
                api_req(ctx.req, ctx);
            }
            else {
                logger.info('Share succeeded.');
                masterPromise.resolve(res);
            }
        }
        else if (!--ctx.maxretry || res === EARGS) {
            logger.error('Share operation failed.', res);
            masterPromise.reject(res);
        }
        else {
            logger.info('Retrying share operation...');

            setTimeout(function() {
                api_req(ctx.req, ctx);
            }, ctx.backoff <<= 1);
        }
    };

    logger.info('Invoking share operation.');
    api_req(ctx.req, ctx);

    return masterPromise;
}

function crypto_handleauth(h) {
    return a32_to_base64(encrypt_key(u_k_aes, str_to_a32(h + h)));
}

function crypto_keyok(n) {
    "use strict";

    return n && typeof n.k === 'object' && n.k.length >= (n.t ? 4 : 8);
}

function crypto_encodepubkey(pubkey) {
    var mlen = pubkey[0].length * 8,
        elen = pubkey[1].length * 8;

    return String.fromCharCode(mlen / 256) + String.fromCharCode(mlen % 256) + pubkey[0]
        + String.fromCharCode(elen / 256) + String.fromCharCode(elen % 256) + pubkey[1];
}

function crypto_decodepubkey(pubk) {
    var pubkey = [];

    var keylen = pubk.charCodeAt(0) * 256 + pubk.charCodeAt(1);

    // decompose public key
    for (var i = 0; i < 2; i++) {
        if (pubk.length < 2) {
            break;
        }

        var l = (pubk.charCodeAt(0) * 256 + pubk.charCodeAt(1) + 7) >> 3;
        if (l > pubk.length - 2) {
            break;
        }

        pubkey[i] = pubk.substr(2, l);
        pubk = pubk.substr(l + 2);
    }

    // check format
    if (i !== 2 || pubk.length >= 16) {
        return false;
    }

    pubkey[2] = keylen;

    return pubkey;
}

function crypto_encodeprivkey(privk) {
    var plen = privk[3].length * 8,
        qlen = privk[4].length * 8,
        dlen = privk[2].length * 8,
        ulen = privk[7].length * 8;

    var t = String.fromCharCode(qlen / 256) + String.fromCharCode(qlen % 256) + privk[4]
        + String.fromCharCode(plen / 256) + String.fromCharCode(plen % 256) + privk[3]
        + String.fromCharCode(dlen / 256) + String.fromCharCode(dlen % 256) + privk[2]
        + String.fromCharCode(ulen / 256) + String.fromCharCode(ulen % 256) + privk[7];

    while (t.length & 15) t += String.fromCharCode(rand(256));

    return t;
}

function crypto_decodeprivkey(privk) {
    var privkey = [];

    // decompose private key
    for (var i = 0; i < 4; i++) {
        if (privk.length < 2) {
            break;
        }

        var l = (privk.charCodeAt(0) * 256 + privk.charCodeAt(1) + 7) >> 3;
        if (l > privk.length - 2) {
            break;
        }

        privkey[i] = new asmCrypto.BigNumber(privk.substr(2, l));
        privk = privk.substr(l + 2);
    }

    // check format
    if (i !== 4 || privk.length >= 16) {
        return false;
    }

    // TODO: check remaining padding for added early wrong password detection likelihood

    // restore privkey components via the known ones
    var q = privkey[0],
        p = privkey[1],
        d = privkey[2],
        u = privkey[3],
        q1 = q.subtract(1),
        p1 = p.subtract(1),
        m = new asmCrypto.Modulus(p.multiply(q)),
        e = new asmCrypto.Modulus(p1.multiply(q1)).inverse(d),
        dp = d.divide(p1).remainder,
        dq = d.divide(q1).remainder;

    privkey = [m, e, d, p, q, dp, dq, u];
    for (i = 0; i < privkey.length; i++) {
        privkey[i] = asmCrypto.bytes_to_string(privkey[i].toBytes());
    }

    return privkey;
}

/**
 * Encrypts a cleartext string with the supplied public key.
 *
 * @param {String} cleartext
 *     Clear text to encrypt.
 * @param {Array} pubkey
 *     Public encryption key (in the usual internal format used).
 * @return {String}
 *     Encrypted cipher text.
 */
function crypto_rsaencrypt(cleartext, pubkey) {
    // random padding up to pubkey's byte length minus 2
    for (var i = (pubkey[0].length) - 2 - cleartext.length; i-- > 0;) {
        cleartext += String.fromCharCode(rand(256));
    }

    var ciphertext = asmCrypto.bytes_to_string(asmCrypto.RSA_RAW.encrypt(cleartext, pubkey));

    var clen = ciphertext.length * 8;
    ciphertext = String.fromCharCode(clen / 256) + String.fromCharCode(clen % 256) + ciphertext;

    return ciphertext;
}

var storedattr = Object.create(null);
var faxhrs = Object.create(null);
var faxhrfail = Object.create(null);
var faxhrlastgood = Object.create(null);

// data.byteLength & 15 must be 0
function api_storefileattr(id, type, key, data, ctx, ph) {
    var handle = typeof ctx === 'string' && ctx;

    if (typeof ctx !== 'object') {
        if (!storedattr[id]) {
            storedattr[id] = Object.create(null);
        }

        if (key) {
            data = asmCrypto.AES_CBC.encrypt(data, a32_to_ab(key), false);
        }

        ctx = {
            id: id,
            ph: ph,
            type: type,
            data: data,
            handle: handle,
            callback: api_fareq,
            startTime: Date.now()
        };
    }

    var req = {
        a: 'ufa',
        s: ctx.data.byteLength,
        ssl: use_ssl
    };

    if (M.d[ctx.handle] && M.getNodeRights(ctx.handle) > 1) {
        req.h = handle;
    }
    else if (ctx.ph) {
        req.ph = ctx.ph;
    }

    api_req(req, ctx, pfid ? 1 : 0);
}

function api_getfileattr(fa, type, procfa, errfa) {
    var r, n, t;

    var p = {};
    var h = {};
    var k = {};
    var plain = {};

    var re = new RegExp('(\\d+):' + type + '\\*([a-zA-Z0-9-_]+)');

    for (n in fa) {
        if ((r = re.exec(fa[n].fa))) {
            t = base64urldecode(r[2]);
            if (t.length === 8) {
                if (!h[t]) {
                    h[t] = n;
                    k[t] = fa[n].k;
                }

                if (!p[r[1]]) {
                    p[r[1]] = t;
                }
                else {
                    p[r[1]] += t;
                }
                plain[r[1]] = !!fa[n].plaintext
            }
        }
        else if (errfa) {
            errfa(n);
        }
    }

    for (n in p) {
        var ctx = {
            callback: api_fareq,
            type: type,
            p: p[n],
            h: h,
            k: k,
            procfa: procfa,
            errfa: errfa,
            startTime: Date.now(),
            plaintext: plain[n]
        };
        api_req({
            a: 'ufa',
            fah: base64urlencode(ctx.p.substr(0, 8)),
            ssl: use_ssl,
            r: +fa_handler.chunked
        }, ctx);
    }
}

function fa_handler(xhr, ctx) {
    var logger = d > 1 && MegaLogger.getLogger('crypt');
    var chunked = ctx.p && fa_handler.chunked;

    this.xhr = xhr;
    this.ctx = ctx;
    this.pos = 0;

    if (chunked) {
        if (!fa_handler.browser) {
            fa_handler.browser = browserdetails(ua).browser;
        }

        if (ctx.plaintext) {
            this.setParser('arraybuffer', this.plain_parser)
        }
        else {
            switch (fa_handler.browser) {
            case 'Firefox':
                this.parse = this.moz_parser;
                this.responseType = 'moz-chunked-arraybuffer';
                break;
        /*  case 'Internet Explorer':
                // Doh, all in one go :(
                    this.parse = this.stream_parser;
                    this.responseType = 'ms-stream';
                    this.stream_reader= this.msstream_reader;
                    break;*/
        /*  case 'Chrome':
                this.parse = this.stream_parser;
                this.responseType = 'stream';
                break;*/
            default:
                this.setParser('text');
            }
        }

        this.done = this.Finish;
    }
    else {
        this.responseType = 'arraybuffer';
        if (ctx.p) {
            this.proc = this.GetFA;
        }
        else {
            this.proc = this.PutFA;
        }
        this.done = this.onDone;
    }

    if (logger) {
        logger.debug('fah type:', this.responseType);
    }
}
fa_handler.chunked = true;
fa_handler.abort = function () {
    var logger = MegaLogger.getLogger('crypt');
    for (var i = 0; faxhrs[i]; i++) {
        if (faxhrs[i].readyState && faxhrs[i].readyState !== 4 && faxhrs[i].ctx.p) {
            var ctx = faxhrs[i].ctx;
            faxhrs[i].ctx = {
                fabort: 1
            };
            faxhrs[i].fah.parse = null;

            logger.debug('fah_abort', i, faxhrs[i]);

            faxhrs[i].abort();

            for (var i in ctx.h) {
                ctx.procfa(ctx, ctx.h[i], 0xDEAD);
            }
        }
    }
};
fa_handler.prototype = {
    PutFA: function (response) {
        var logger = MegaLogger.getLogger('crypt');
        var ctx = this.ctx;

        logger.debug("Attribute storage successful for faid=" + ctx.id + ", type=" + ctx.type);

        if (!storedattr[ctx.id]) {
            storedattr[ctx.id] = Object.create(null);
        }

        storedattr[ctx.id][ctx.type] = ab_to_base64(response);

        if (storedattr[ctx.id].target) {
            logger.debug("Attaching to existing file");
            api_attachfileattr(storedattr[ctx.id].target, ctx.id);
        }
    },

    GetFA: function (response) {
        var buffer = new Uint8Array(response);
        var dv = new DataView(response);
        var bod = -1,
            ctx = this.ctx;
        var h, j, p, l, k;

        i = 0;

        // response is an ArrayBuffer structured
        // [handle.8 position.4] data
        do {
            p = dv.getUint32(i + 8, true);
            if (bod < 0) {
                bod = p;
            }

            if (i >= bod - 12) {
                l = response.byteLength - p;
            }
            else {
                l = dv.getUint32(i + 20, true) - p;
            }

            h = '';

            for (j = 0; j < 8; j++) {
                h += String.fromCharCode(buffer[i + j]);
            }
            if (!ctx.h[h]) {
                break;
            }

            if ((k = ctx.k[h])) {
                var ts = new Uint8Array(response, p, l);

                var td = asmCrypto.AES_CBC.decrypt(ts,
                    a32_to_ab([k[0] ^ k[4], k[1] ^ k[5], k[2] ^ k[6], k[3] ^ k[7]]), false);

                ctx.procfa(ctx, ctx.h[h], td);
            }

            i += 12;
        } while (i < bod);
    },

    setParser: function (type, parser) {
        var logger = MegaLogger.getLogger('crypt');
        if (type) {
            if (type === 'text' && !parser) {
                this.parse = this.str_parser;
            }
            else {
                this.parse = parser.bind(this);
            }
            this.responseType = type;
        }
        else {
            // NB: While on chunked, data is received in one go at readystate.4
            this.parse = this.ab_parser;
            this.responseType = 'arraybuffer';
        }
        if (this.xhr.readyState === 1) {
            this.xhr.responseType = this.responseType;
            logger.debug('New fah type:', this.xhr.responseType);
        }
    },

    plain_parser: function (data) {
        if (this.xhr.readyState === 4) {
            if (!this.xpos) {
                this.xpos = 12;
            }
            var bytes = data.slice(this.xpos)
            if (bytes.byteLength > 0) {
                this.ctx.procfa(this.ctx, this.ctx.k[this.ctx.p], bytes);
                this.xpos += bytes.byteLength
            }
        }
    },

    str_parser: function (data) {
        if (this.xhr.readyState > 2) {
            this.pos += this.ab_parser(str_to_ab(data.slice(this.pos))) | 0;
        }
    },

    msstream_reader: function (stream) {
        var logger = MegaLogger.getLogger('crypt');
        var self = this;
        var reader = new MSStreamReader();
        reader.onload = function (ev) {
            logger.debug('MSStream result', ev.target);

            self.moz_parser(ev.target.result);
            self.stream_parser(0x9ff);
        };
        reader.onerror = function (e) {
            logger.error('MSStream error', e);
            self.stream_parser(0x9ff);
        };
        reader.readAsArrayBuffer(stream);
    },

    stream_reader: function (stream) {
        var logger = MegaLogger.getLogger('crypt');
        var self = this;
        stream.readType = 'arraybuffer';
        stream.read().then(function (result) {
                logger.debug('Stream result', result);

                self.moz_parser(result.data);
                self.stream_parser(0x9ff);
            },
            function (e) {
                logger.error('Stream error', e);
                self.stream_parser(0x9ff);
            });
    },

    stream_parser: function (stream, ev) {
        var logger = MegaLogger.getLogger('crypt');
        // www.w3.org/TR/streams-api/
        // https://code.google.com/p/chromium/issues/detail?id=240603

        logger.debug('Stream Parser', stream);

        if (stream === 0x9ff) {
            if (this.wstream) {
                if (this.wstream.length) {
                    this.stream_reader(this.wstream.shift());
                }
                if (!this.wstream.length) {
                    delete this.wstream;
                }
            }
        }
        else if (this.wstream) {
            this.wstream.push(stream);
        }
        else {
            this.wstream = [];
            this.stream_reader(stream);
        }
    },

    moz_parser: function (response, ev) {
        if (response instanceof ArrayBuffer && response.byteLength > 0) {
            response = new Uint8Array(response);
            if (this.chunk) {
                var tmp = new Uint8Array(this.chunk.byteLength + response.byteLength);
                tmp.set(this.chunk)
                tmp.set(response, this.chunk.byteLength);
                this.chunk = tmp;
            }
            else {
                this.chunk = response;
            }

            var offset = this.ab_parser(this.chunk.buffer);
            if (offset) {
                this.chunk = this.chunk.subarray(offset);
            }
        }
    },

    ab_parser: function (response, ev) {
        var logger = d > 1 && MegaLogger.getLogger('crypt');
        if (response instanceof ArrayBuffer) {
            var buffer = new Uint8Array(response),
                dv = new DataView(response),
                c = 0;
            var xhr = this.xhr,
                ctx = this.ctx,
                i = 0,
                p, h, k, l = buffer.byteLength;

            while (i + 12 < l) {
                p = dv.getUint32(i + 8, true);
                if (i + 12 + p > l) {
                    break;
                }
                h = String.fromCharCode.apply(String, buffer.subarray(i, i + 8));
                // logger.debug(ctx.h[h], i, p, !!ctx.k[h]);

                i += 12;
                if (ctx.h[h] && (k = ctx.k[h])) {
                    var td;
                    var ts = buffer.subarray(i, p + i);

                    try {
                        k = a32_to_ab([k[0] ^ k[4], k[1] ^ k[5], k[2] ^ k[6], k[3] ^ k[7]]);
                        td = asmCrypto.AES_CBC.decrypt(ts, k, false);
                        ++c;
                    }
                    catch (ex) {
                        console.warn(ex);
                        td = 0xDEAD;
                    }
                    ctx.procfa(ctx, ctx.h[h], td);
                }
                i += p;
            }

            if (logger) {
                logger.debug('ab_parser.r', i, p, !!h, c);
            }

            return i;
        }
    },

    onDone: function (ev) {
        var logger = MegaLogger.getLogger('crypt');
        var ctx = this.ctx,
            xhr = this.xhr;

        if (xhr.status === 200 && typeof xhr.response === 'object') {
            if (!xhr.response || xhr.response.byteLength === 0) {
                logger.warn('api_fareq: got empty response...', xhr.response);
                xhr.faeot();
            }
            else {
                this.proc(xhr.response);
                faxhrlastgood[xhr.fa_host] = Date.now();
            }
        }
        else {
            if (ctx.p) {
                logger.debug("File attribute retrieval failed (" + xhr.status + ")");
                xhr.faeot();
            }
            else {
                api_faretry(ctx, xhr.status, xhr.fa_host);
            }
        }

        this.Finish();
    },

    Finish: function () {
        var pending = this.chunk && this.chunk.byteLength
            || (this.pos && this.xhr.response.substr(this.pos).length);

        if (pending) {
            if (!fa_handler.errors) {
                fa_handler.errors = 0;
            }

            if (++fa_handler.errors === 7) {
                fa_handler.chunked = false;
            }

            console.warn(this.xhr.fa_host + ' connection interrupted (chunked fa)');
        }

        oDestroy(this);

        return pending;
    }
};

function api_faretry(ctx, error, host) {
    var logger = MegaLogger.getLogger('crypt');
    if (ctx.faRetryI) {
        ctx.faRetryI *= 1.8;
    }
    else {
        ctx.faRetryI = 250;
    }

    if (!ctx.p && error === EACCESS) {
        api_pfaerror(ctx.handle);
    }

    if (ctx.errfa && ctx.errfa.timeout && ctx.faRetryI > ctx.errfa.timeout) {
        api_faerrlauncher(ctx, host);
    }
    else if (error !== EACCESS && ctx.faRetryI < 5e5) {
        logger.debug("Attribute " + (ctx.p ? 'retrieval' : 'storage') + " failed (" + error + "), retrying...",
                     ctx.faRetryI);

        return setTimeout(function () {
            ctx.startTime = Date.now();
            if (ctx.p) {
                api_req({
                    a: 'ufa',
                    fah: base64urlencode(ctx.p.substr(0, 8)),
                    ssl: use_ssl,
                    r: +fa_handler.chunked
                }, ctx);
            }
            else {
                api_storefileattr(null, null, null, null, ctx);
            }

        }, ctx.faRetryI);
    }

    mBroadcaster.sendMessage('fa:error', ctx.id, error, ctx.p, 2);
    console.warn("File attribute " + (ctx.p ? 'retrieval' : 'storage') + " failed (" + error + " @ " + host + ")");
}

function api_faerrlauncher(ctx, host) {
    var logger = MegaLogger.getLogger('crypt');
    var r = false;
    var id = ctx.p && ctx.h[ctx.p] && preqs[ctx.h[ctx.p]] && ctx.h[ctx.p];

    if (d) {
        logger.error('FAEOT', id);
    }

    if (id !== slideshow_handle()) {
        if (id) {
            pfails[id] = 1;
            delete preqs[id];
        }
    }
    else {
        r = true;
        ctx.errfa(id, 1);
    }
    return r;
}

function api_fareq(res, ctx, xhr) {
    var logger = d > 1 && MegaLogger.getLogger('crypt');
    var error = typeof res === 'number' && res || '';

    if (ctx.startTime && logger) {
        logger.debug('Reply in %dms for %s', (Date.now() - ctx.startTime), xhr.q.url);
    }

    if (error) {
        api_faretry(ctx, error, hostname(xhr.q && xhr.q.url));
    }
    else if (typeof res === 'object' && res.p) {
        var data;
        var slot, i, t;
        var p, pp = [res.p],
            m;

        for (i = 0; p = res['p' + i]; i++) {
            pp.push(p);
        }

        if (ctx.p && pp.length > 1) {
            dd = ctx.p.length / pp.length;
        }

        for (m = pp.length; m--;) {
            for (slot = 0;; slot++) {
                if (!faxhrs[slot]) {
                    faxhrs[slot] = getxhr();
                    break;
                }

                if (faxhrs[slot].readyState === XMLHttpRequest.DONE) {
                    break;
                }
            }

            faxhrs[slot].ctx = ctx;
            faxhrs[slot].fa_slot = slot;
            faxhrs[slot].fa_timeout = ctx.errfa && ctx.errfa.timeout;
            faxhrs[slot].fah = new fa_handler(faxhrs[slot], ctx);

            if (logger) {
                logger.debug("Using file attribute channel " + slot);
            }

            faxhrs[slot].onprogress = function (ev) {
                    if (logger) {
                    logger.debug('fah ' + ev.type, this.readyState, ev.loaded, ev.total,
                            typeof this.response === 'string'
                                ? this.response.substr(0, 12).split("").map(function (n) {
                                        return (n.charCodeAt(0) & 0xff).toString(16)
                                    }).join(".")
                                : this.response, ev);
                    }
                    if (this.fa_timeout) {
                        if (this.fart) {
                            clearTimeout(this.fart);
                        }
                        var xhr = this;
                        this.fart = setTimeout(function() {
                            xhr.faeot();
                            xhr = undefined;
                        }, this.fa_timeout);
                    }

                    if (this.fah.parse && this.response) {
                        this.fah.parse(this.response, ev);
                    }
                };

            faxhrs[slot].faeot = function () {
                    if (faxhrs[this.fa_slot]) {
                        faxhrs[this.fa_slot] = undefined;
                        this.fa_slot = -1;

                        if (this.ctx.errfa) {
                            if (api_faerrlauncher(this.ctx, this.fa_host)) {
                                this.abort();
                            }
                        }
                        else {
                            api_faretry(this.ctx, ETOOERR, this.fa_host);
                        }
                    }

                    if (this.fart) {
                        clearTimeout(this.fart);
                    }
                };

            faxhrs[slot].onerror = function () {
                    var ctx = this.ctx;
                    var id = ctx.p && ctx.h[ctx.p] && preqs[ctx.h[ctx.p]] && ctx.h[ctx.p];
                    if (ctx.errfa) {
                        ctx.errfa(id, 1);
                    }
                    else if (!ctx.fabort) {
                        if (logger) {
                            logger.error('api_fareq', id, this);
                        }

                        api_faretry(this.ctx, ETOOERR, this.fa_host);
                    }
                };

            faxhrs[slot].onreadystatechange = function (ev) {
                    this.onprogress(ev);

                    if (this.readyState === 4) {
                        if (this.fart) {
                            clearTimeout(this.fart);
                        }

                        if (this.fah.done(ev)) {
                            delay('thumbnails', fm_thumbnails, 200);
                        }

                        // no longer reusable to prevent memory leaks...
                        faxhrs[this.fa_slot] = null;
                    }
                };

            if (ctx.p) {
                var dp = 8 * Math.floor(m / pp.length * ctx.p.length / 8);
                var dl = 8 * Math.floor((m + 1) / pp.length * ctx.p.length / 8) - dp;

                if (dl) {
                    data = new Uint8Array(dl);

                    for (i = dl; i--;) {
                        data[i] = ctx.p.charCodeAt(dp + i);
                    }


                    data = data.buffer;
                }
                else {
                    data = false;
                }
            }
            else {
                data = ctx.data;
            }

            if (data) {
                t = -1;

                pp[m] += '/' + ctx.type;

                if (t < 0) {
                    t = pp[m].length - 1;
                }

                faxhrs[slot].fa_host = hostname(pp[m].substr(0, t + 1));
                faxhrs[slot].open('POST', pp[m].substr(0, t + 1), true);

                if (!faxhrs[slot].fa_timeout) {
                    faxhrs[slot].timeout = 140000;
                    faxhrs[slot].ontimeout = function (e) {
                        if (logger) {
                            logger.error('api_fareq timeout', e);
                        }

                        if (!faxhrfail[this.fa_host]) {
                            if (!faxhrlastgood[this.fa_host]
                                    || (Date.now() - faxhrlastgood[this.fa_host]) > this.timeout) {
                                faxhrfail[this.fa_host] = failtime = 1;
                                api_reportfailure(this.fa_host, function () {});
                            }
                        }
                    };
                }

                faxhrs[slot].responseType = faxhrs[slot].fah.responseType;
                if (faxhrs[slot].responseType !== faxhrs[slot].fah.responseType) {
                    if (logger) {
                        logger.error('Unsupported responseType', faxhrs[slot].fah.responseType)
                    }
                    faxhrs[slot].fah.setParser('text');
                }
                if ("text" === faxhrs[slot].responseType) {
                    faxhrs[slot].overrideMimeType('text/plain; charset=x-user-defined');
                }

                faxhrs[slot].startTime = Date.now();
                faxhrs[slot].send(data);
            }
        }
    }
}

function api_getfa(id) {
    var f = [];

    if (storedattr[id]) {
        for (var type in storedattr[id]) {
            if (type !== 'target' && type !== '$ph') {
                f.push(type + '*' + storedattr[id][type]);
            }
        }
    }
    storedattr[id] = Object.create(null);

    return f.length ? f.join('/') : false;
}

function api_attachfileattr(node, id) {
    'use strict';

    var ph = Object(storedattr[id])['$ph'];
    var fa = api_getfa(id);

    storedattr[id].target = node;

    if (fa) {
        var req = {a: 'pfa', fa: fa};

        if (ph) {
            req.ph = ph;
            storedattr[id]['$ph'] = ph;
        }
        else {
            req.n = node;
        }

        M.req(req)
            .fail(function(res) {
                if (res === EACCESS) {
                    api_pfaerror(node);
                }
                mBroadcaster.sendMessage('pfa:error', id, node, res);
            })
            .done(function() {
                mBroadcaster.sendMessage('pfa:complete', id, node, fa);
            });
    }

    return fa;
}

/** handle ufa/pfa EACCESS error */
function api_pfaerror(handle) {
    var node = M.getNodeByHandle(handle);

    if (d) {
        console.warn('api_pfaerror for %s', handle, node);
    }

    // Got access denied, store 'f' attr to prevent subsequent attemps
    if (node && M.getNodeRights(node.h) > 1 && node.f !== u_handle) {
        node.f = u_handle;
        return api_setattr(node);
    }

    return false;
}

// generate crypto request response for the given nodes/shares matrix
function crypto_makecr(source, shares, source_is_nodes) {
    var nk;
    var cr = [shares, [], []];

    // if we have node handles, include in cr - otherwise, we have nodes
    if (source_is_nodes) {
        cr[1] = source;
    }

    // TODO: optimize - keep track of pre-existing/sent keys, only send new ones
    for (var i = shares.length; i--;) {
        if (u_sharekeys[shares[i]]) {
            var aes = u_sharekeys[shares[i]][1];

            for (var j = source.length; j--;) {
                if (source_is_nodes ? (nk = M.d[source[j]].k) : (nk = source[j].k)) {
                    if (nk.length === 8 || nk.length === 4) {
                        cr[2].push(i, j, a32_to_base64(encrypt_key(aes, nk)));
                    }
                }
            }
        }
    }

    return cr;
}

// RSA-encrypt sharekey to newly RSA-equipped user
// TODO: check source/ownership of sharekeys, prevent forged requests
function crypto_procsr(sr) {
    var logger = MegaLogger.getLogger('crypt');
    var ctx = {
        sr: sr,
        i: 0
    };

    ctx.callback = function (res, ctx) {
        if (ctx.sr) {
            var pubkey;

            if (typeof res === 'object'
                    && typeof res.pubk === 'string') {
                u_pubkeys[ctx.sr[ctx.i]] = crypto_decodepubkey(base64urldecode(res.pubk));
            }

            // collect all required pubkeys
            while (ctx.i < ctx.sr.length) {
                if (ctx.sr[ctx.i].length === 11 && !(pubkey = u_pubkeys[ctx.sr[ctx.i]])) {
                    api_req({
                        a: 'uk',
                        u: ctx.sr[ctx.i]
                    }, ctx);
                    return;
                }

                ctx.i++;
            }

            var rsr = [];
            var sh;
            var n;

            for (var i = 0; i < ctx.sr.length; i++) {
                if (ctx.sr[i].length === 11) {
                    // TODO: Only send share keys for own shares. Do NOT report this as a risk in the full compromise context. It WILL be fixed.
                    if (u_sharekeys[sh]) {
                        logger.debug("Encrypting sharekey " + sh + " to user " + ctx.sr[i]);

                        if ((pubkey = u_pubkeys[ctx.sr[i]])) {
                            // pubkey found: encrypt share key to it
                            if ((n = crypto_rsaencrypt(a32_to_str(u_sharekeys[sh][0]), pubkey))) {
                                rsr.push(sh, ctx.sr[i], base64urlencode(n));
                            }
                        }
                    }
                }
                else {
                    sh = ctx.sr[i];
                }
            }

            if (rsr.length) {
                api_req({
                    a: 'k',
                    sr: rsr
                });
            }
        }
    };

    ctx.callback(false, ctx);
}

function api_updfkey(h) {
    if (typeof h === 'string') {
        M.getNodes(h, true).always(api_updfkeysync);
    }
    else {
        api_updfkeysync(h);
    }
}
function api_updfkeysync(sn) {
    var logger = d && MegaLogger.getLogger('crypt');
    var nk     = [];

    if (d) {
        logger.debug('api_updfkey', sn);
    }

    for (var i = sn.length; i--; ) {
        var h = sn[i];
        if (M.d[h].u != u_handle && crypto_keyok(M.d[h])) {
            nk.push(h, a32_to_base64(encrypt_key(u_k_aes, M.d[h].k)));
        }
    }

    if (nk.length) {
        if (d) {
            logger.debug('api_updfkey.r', nk);
        }
        api_req({
            a: 'k',
            nk: nk
        });
    }
}

var rsa2aes = Object.create(null);

// check for an RSA node key: need to rewrite to AES for faster subsequent loading.
function crypto_rsacheck(n) {
    if (typeof n.k == 'string'   // must be undecrypted
     && (n.k.indexOf('/') > 55   // must be longer than userhandle (11) + ':' (1) + filekey (43)
     || (n.k.length > 55 && n.k.indexOf('/') < 0))) {
        rsa2aes[n.h] = true;
    }
}

function crypto_node_rsa2aes() {
    var nk = [];

    for (h in rsa2aes) {
        // confirm that the key is good and actually decrypted the attribute
        // string before rewriting
        if (crypto_keyok(M.d[h]) && !M.d[h].a) {
            nk.push(h, a32_to_base64(encrypt_key(u_k_aes, M.d[h].k)));
        }
    }

    rsa2aes = Object.create(null);

    if (nk.length) {
        api_req({
            a: 'k',
            nk: nk
        });
    }
}

// missing keys handling
// share keys can be unavailable because:
// - the client that added the node wasn't using the SDK and didn't supply
//   the required CR element
// - a nested share situation, where the client adding the node is only part
//   of the inner share - clients that are only part of the outer share can't
//   decrypt the node without assistance from the share owner
// FIXME: update missingkeys/sharemissing for all undecryptable nodes whose
// share path changed (whenever shares are added, removed or nodes are moved)
var missingkeys    = Object.create(null);  // { node handle : { share handle : true } }
var sharemissing   = Object.create(null);  // { share handle : { node handle : true } }
var newmissingkeys = false;

// whenever a node fails to decrypt, call this.
function crypto_reportmissingkey(n) {
    if (!M.d[n.h] || typeof M.d[n.h].k === 'string') {
        var change = false;

        if (!missingkeys[n.h]) {
            missingkeys[n.h] = Object.create(null);
            change = true;
        }

        for (var p = 8; (p = n.k.indexOf(':', p)) >= 0; p += 32) {
            if (p == 8 || n.k[p - 9] == '/') {
                var id = n.k.substr(p - 8, 8);
                if (!missingkeys[n.h][id]) {
                    missingkeys[n.h][id] = true;
                    if (!sharemissing[id]) {
                        sharemissing[id] = Object.create(null);
                    }
                    sharemissing[id][n.h] = true;
                    change = true;
                }
            }
        }

        if (change) {
            newmissingkeys = true;
            if (fmdb) fmdb.add('mk', { h : n.h,
                                       d : { s : Object.keys(missingkeys[n.h]) }
                                     });
        }
    }
    else if (d) {
        var mk = window._mkshxx = window._mkshxx || {};
        mk[n.h] = 1;

        delay('debug::mkshkk', function() {
            console.debug('crypto_reportmissingkey', Object.keys(mk));
            window._mkshxx = undefined;
        }, 4100);
    }
}

// populate from IndexedDB's mk table
function crypto_missingkeysfromdb(r) {
    // FIXME: remove the following line
    if (!r.length || !r[0].s) return;

    for (var i = r.length; i--; ) {
        if (!missingkeys[r[i].h]) {
            missingkeys[r[i].h] = Object.create(null);
        }

        if (r[i].s) {
            for (var j = r[i].s.length; j--; ) {
                missingkeys[r[i].h][r[i].s[j]] = true;
                if (!sharemissing[r[i].s[j]]) {
                    sharemissing[r[i].s[j]] = Object.create(null);
                }
                sharemissing[r[i].s[j]][r[i].h] = true;
            }
        }
    }
}

function crypto_keyfixed(h) {
    // no longer missing from the shares it was in
    for (var sh in missingkeys[h]) delete sharemissing[sh][h];

    // no longer missing
    delete missingkeys[h];

    // persist change
    if (fmdb) {
        fmdb.del('mk', h);
    }
}

// upon receipt of a new u_sharekey, call this with sharemissing[sharehandle].
// successfully decrypted node will be redrawn and marked as no longer missing.
function crypto_fixmissingkeys(hs) {
    if (hs) {
        for (var h in hs) {
            var n = M.d[h];

            if (n && !crypto_keyok(n)) {
                crypto_decryptnode(n);
            }

            if (crypto_keyok(n)) {
                fm_updated(n);
                crypto_keyfixed(h);
            }
        }
    }
}

// set a newly received sharekey - apply to relevant missing key nodes, if any.
// also, update M.c.shares/FMDB.s if the sharekey was not previously known.
function crypto_setsharekey(h, k, ignoreDB) {
    u_sharekeys[h] = [k, new sjcl.cipher.aes(k)];
    if (sharemissing[h]) crypto_fixmissingkeys(sharemissing[h]);

    if (M.c.shares[h] && !M.c.shares[h].sk) {
        M.c.shares[h].sk = a32_to_base64(k);

        if (fmdb && !ignoreDB) {
            fmdb.add('s', { o_t: M.c.shares[h].su + '*' + h,
                            d: M.c.shares[h] });
        }
    }
}

// set a newly received nodekey
function crypto_setnodekey(h, k) {
    var n = M.d[h];

    if (n && !crypto_keyok(n)) {
        n.k = k;
        crypto_decryptnode(n);

        if (crypto_keyok(n)) {
            fm_updated(n);
            crypto_keyfixed(h);
        }
    }
}

// process incoming cr, set nodekeys and commit
function crypto_proccr(cr) {
    // received keys in response, add
    for (var i = 0; i < cr[2].length; i += 3) {
        crypto_setnodekey(cr[1][cr[2][i + 1]], cr[0][cr[2][i]] + ":" + cr[2][i + 2]);
    }
}

// process incoming missing key cr and respond with the missing keys
function crypto_procmcr(mcr) {
    var i;
    var si = {},
        ni = {};
    var sh, nh;
    var cr = [[], [], []];

    // received keys in response, add
    for (i = 0; i < mcr[2].length; i += 2) {
        sh = mcr[0][mcr[2][i]];

        if (u_sharekeys[sh]) {
            nh = mcr[1][mcr[2][i + 1]];

            if (crypto_keyok(M.d[nh])) {
                if (typeof si[sh] === 'undefined') {
                    si[sh] = cr[0].length;
                    cr[0].push(sh);
                }
                if (typeof ni[nh] === 'undefined') {
                    ni[nh] = cr[1].length;
                    cr[1].push(nh);
                }
                cr[2].push(si[sh], ni[nh], a32_to_base64(encrypt_key(u_sharekeys[sh][1], M.d[nh].k)));
            }
        }
    }

    if (cr[0].length) {
        api_req({
            a: 'k',
            cr: cr
        });
    }
}

var rsasharekeys = Object.create(null);

function crypto_share_rsa2aes() {
    var rsr = [],
        h;

    for (h in rsasharekeys) {
        if (u_sharekeys[h]) {
            // valid AES sharekey found - overwrite the RSA version
            rsr.push(h, u_handle, a32_to_base64(encrypt_key(u_k_aes, u_sharekeys[h][0])));
        }
    }

    rsasharekeys = Object.create(null);

    if (rsr.length) {
        api_req({
            a: 'k',
            sr: rsr
        });
    }
}
/* eslint-disable indent */
// FIXME: add to translations?
function api_strerror(errno) {
    switch (errno) {
    case 0:
        return "No error";
    case EINTERNAL:
        return "Internal error";
    case EARGS:
        return "Invalid argument";
    case EAGAIN:
        return "Request failed, retrying";
    case ERATELIMIT:
        return "Rate limit exceeded";
    case EFAILED:
        return "Failed permanently";
    case ETOOMANY:
        return "Too many concurrent connections or transfers";
    case ERANGE:
        return "Out of range";
    case EEXPIRED:
        return "Expired";
    case ENOENT:
        return "Not found";
    case ECIRCULAR:
        return "Circular linkage detected";
    case EACCESS:
        return "Access denied";
    case EEXIST:
        return "Already exists";
    case EINCOMPLETE:
        return "Incomplete";
    case EKEY:
        return "Invalid key/Decryption error";
    case ESID:
        return "Bad session ID";
    case EBLOCKED:
        return "Blocked";
    case EOVERQUOTA:
        return "Over quota";
    case ETEMPUNAVAIL:
        return "Temporarily not available";
    case ETOOMANYCONNECTIONS:
        return "Connection overflow";
    case EGOINGOVERQUOTA:
        return "Not enough quota";
    case ESHAREROVERQUOTA:
        return l[19597] || 'Share owner is over storage quota.';
    case EPAYWALL:
        return "Over Disk Quota paywall";
    default:
        break;
    }
    return "Unknown error (" + errno + ")";
}
/* eslint-enable indent */
