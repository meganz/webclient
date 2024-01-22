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

var use_ssl = window.is_extension && !window.is_iframed ? 0 : 1;

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
var EMASTERONLY = -27;      // Access denied for sub-users (only for business accounts)
var EBUSINESSPASTDUE = -28; // Business account expired
var EPAYWALL = -29;     // ODQ paywall state

// custom errors
var ETOOERR = -400;
var ESHAREROVERQUOTA = -401;


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

// ArrayBuffer to binary string
function ab_to_str(ab) {
    'use strict';
    const u8 = new Uint8Array(ab);

    /**
     if (u8.length < 0x10000) {
        return String.fromCharCode.apply(String, u8);
    }
     /**/

    let b = '';
    for (let i = 0; i < u8.length; i++) {
        b += String.fromCharCode(u8[i]);
    }

    return b;
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

    // suppress upgrade warning at account creation time
    mega.keyMgr.postregistration = true;

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

/**
 * Converts a Unicode string to a UTF-8 cleanly encoded string.
 *
 * @param {String} unicode
 *     Browser's native string encoding.
 * @return {String}
 *     UTF-8 encoded string (8-bit characters only).
 */
function to8(unicode) {
    'use strict';
    return unescape(encodeURIComponent(unicode));
}

// @deprecated
function api_setsid(sid) {
    "use strict";
    api.setSID(sid);
}

// @deprecated
function api_setfolder(h) {
    "use strict";
    api.setFolderSID(h, window.u_sid);
}

// @deprecated
function api_req(request, context, channel) {
    "use strict";

    if (channel === undefined) {
        channel = 0;
    }
    const {a} = request || !1;
    const options = {channel, progress: context && context.progress, dedup: false};

    (a === 'up' || a === 'upv' ? api.screq(request, options) : api.req(request, options))
        .always((reply) => {
            if (reply instanceof Error) {
                throw reply;
            }
            if (context && context.callback) {
                const xhr = self.d > 0 && new Proxy({}, {
                    get(target, prop) {
                        console.warn(`[api] The XHR object is deprecated, trying to access ${prop}...`);
                        return false;
                    }
                });

                let {result, responses} = reply || false;

                if (typeof reply === 'number' || reply instanceof window.APIRequestError) {

                    result = Number(reply);
                }
                context.callback(result, context, xhr, responses);
            }
        })
        .catch(reportError);
}

// @todo refactor
function api_reqfailed(channel, error) {
    'use strict';

    var e = error | 0;
    var c = channel | 0;

    if (mega.state & window.MEGAFLAG_LOADINGCLOUD) {
        if (this.status === true && e === EAGAIN) {
            mega.loadReport.EAGAINs++;
        }
        else if (this.status === 500) {
            mega.loadReport.e500s++;
        }
        else {
            mega.loadReport.errs++;
        }
    }

    // does this failure belong to a folder link, but not on the SC channel?
    if (this.sid[0] === 'n' && c !== 2) {
        // yes: handle as a failed folder link access
        api.reset(c);
        return folderreqerr(c, this.error || error);
    }

    if (e === ESID) {
        u_logout(true);
        Soon(function() {
            showToast('clipboard', l[19]);
        });
        loadingInitDialog.hide('force');
        if (page !== 'download') {
            loadSubPage('login');
        }
    }
    else if ((c === 2 || c === 5) && e === ETOOMANY) {
        // too many pending SC requests - reload from scratch
        return fm_fullreload(this, 'ETOOMANY');
    }
    // if suspended account
    else if (e === EBLOCKED) {
        api.reset(c);

        api_req({ a: 'whyamiblocked' }, {
            callback: function whyAmIBlocked(reasonCode) {
                var setLogOutOnNavigation = function() {
                    onIdle(function() {
                        mBroadcaster.once('pagechange', function() {
                            u_logout().then(() => location.reload(true));
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
                    reasonText = l.blocked_rsn_copyright;
                }
                else if (reasonCode === 300) {
                    reasonText = l.blocked_rsn_terminated;
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
            M.showOverStorageQuota(e).catch(dump);
        }
    }
    else {
        if (d) {
            console.assert(e !== EARGS);
        }
        return e === EARGS ? e : EAGAIN;
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
    "use strict";

    if (d) {
        console.info('sc-residue', initialscfetch, scqtail, scqhead, tryCatch(() => JSON.stringify(sc))() || sc);
    }

    if (sc.sn) {
        const didLoadFromAPI = mega.loadReport.mode === 2;

        // enqueue new sn
        if (initialscfetch || currsn !== sc.sn || scqhead !== scqtail) {
            currsn = sc.sn;
            scq[scqhead++] = [{a: '_sn', sn: currsn}];
            resumesc();
        }

        if (initialscfetch) {
            // we have concluded the post-load SC fetch, as we have now
            // run out of new actionpackets: show filemanager!
            scq[scqhead++] = [{ a: '_fm' }];
            initialscfetch = false;
            resumesc();

            if (didLoadFromAPI && !pfid) {

                mega.keyMgr.pendingpullkey = true;
            }
        }

        // we're done, wait for more
        if (sc.w) {
            waitsc.setURL(`${sc.w}?${this.sid}&sn=${currsn}`);
        }

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
}

// request new actionpackets and stream them to sc_packet() as they come in
// nodes in t packets are streamed to sc_node()
function getsc(force) {
    "use strict";

    if (!force || window.pfcol) {
        return Promise.resolve(EEXIST);
    }

    // retire existing channel that may still be completing the request
    getsc.stop(-1, 'w/sc-fetch');

    if (!self.currsn) {
        if (d) {
            console.error('Invalid w/sc fetcher invocation, out of context...', self.currsn);
        }
        eventlog(99737, JSON.stringify([1, !!self.initialscfetch | 0, !!self.pfid | 0, !!self.dlid | 0]));

        return Promise.resolve(EACCESS);
    }

    if (window.loadingInitDialog.progress) {
        window.loadingInitDialog.step3(loadfm.fromapi ? 40 : 1, 55);
    }

    if (mega.state & window.MEGAFLAG_LOADINGCLOUD) {
        mega.loadReport.scSent = Date.now();
    }
    const runId = getsc.locked = currsn + makeUUID().slice(-18);

    if (d) {
        console.info('BEGIN w/sc fetcher <%s>', runId);
    }

    return getsc.fire(runId)
        .finally(() => {
            if (d) {
                console.info('END w/sc fetcher <%s>', runId);
            }

            if (getsc.validate(runId)) {

                getsc.locked = false;
            }
        });
}

function waitsc() {
    "use strict";

    if (!waitsc.kas) {
        waitsc.kas = new MEGAKeepAliveStream(waitsc.sink);
    }

    // re/set initial backoff value.
    waitsc.kas.backoff = 1e4 + Math.random() * 9e3;
}

Object.defineProperties(waitsc, {
    kas: {
        value: null,
        writable: true
    },
    sink: {
        value: freeze({
            onerror(ex) {
                'use strict';
                // @todo This is meant to work around API-1987, remove when resolved!
                if (this.status === 500 && waitsc.ok) {
                    if (d) {
                        console.info('w/sc connection failure, starting over...', [ex]);
                    }
                    getsc.stop(-1, 'http-500');
                    tSleep(4 + -Math.log(Math.random()) * 3)
                        .then(() => !getsc.locked && !waitsc.ok && getsc(true))
                        .catch(dump);
                    eventlog(99992);
                }
            },
            onload(buffer) {
                'use strict';
                let res = buffer.byteLength < 6 && String.fromCharCode.apply(null, new Uint8Array(buffer)) || '';

                if (res === '0') {
                    // immediately re-connect.
                    return this.restart('server-request');
                }

                if (res[0] === '-' && (res |= 0) < 0) {
                    // WSC is stopped at the beginning.
                    if (d) {
                        this.logger.warn('wsc error %s, %s...', res, api_strerror(res));
                    }
                    switch (res) {
                        case ESID:
                        case EBLOCKED:
                            // reach api.deliver();
                            break;
                        default:
                            return res === ETOOMANY && fm_fullreload(null, 'ETOOMANY');
                    }
                }

                return api.deliver(5, buffer);
            }
        })
    },
    stop: {
        value(reason) {
            'use strict';
            if (this.kas) {
                this.kas.destroy(`stop-request ${reason || ''}`);
                this.kas = null;
            }
        }
    },
    poke: {
        value(reason) {
            'use strict';
            if (this.kas) {
                this.kas.restart(reason || 'poke');
            }
        }
    },
    setURL: {
        value(url) {
            'use strict';
            waitsc();
            this.kas.setURL(url);
            this.poke('switching url');
        }
    },
    ok: {
        get() {
            'use strict';
            return this.kas && this.kas.url;
        }
    },
    running: {
        get() {
            'use strict';
            return !!this.ok || getsc.locked;
        }
    }
});

Object.defineProperties(getsc, {
    locked: {
        value: null,
        writable: true
    },
    validate: {
        value(runId) {
            'use strict';

            if (this.locked === runId) {

                return true;
            }

            if (d) {
                console.warn('w/sc connection %s superseded by %s...', runId, this.locked);
            }
        }
    },
    onLine: {
        async value() {
            'use strict';

            if (navigator.onLine === false) {
                if (d) {
                    console.warn('waiting for network connection to be back online...');
                }
                return new Promise((resolve) => {
                    const ready = () => {
                        tSleep(1 + Math.random()).then(resolve);
                        window.removeEventListener('online', ready);
                    };
                    window.addEventListener('online', ready);
                });
            }
        }
    },
    stop: {
        value(level, reason) {
            'use strict';

            if (this.timer) {
                this.timer.abort();
                this.timer = null;
            }

            if ((level >>>= 0)) {
                api.reset(5);

                if (level > 1) {
                    waitsc.stop(reason);
                }
            }
        }
    },
    fire: {
        async value(runId) {
            'use strict';

            if (navigator.onLine === false) {
                if (d) {
                    console.error('<%s> Network connection is offline...', runId);
                }

                if (initialscfetch) {
                    // No need to wait for network connectivity, immediately show the FM...

                    onIdle(getsc);
                    return sc_residue({sn: currsn});
                }
                await this.onLine();
            }

            if (this.validate(runId)) {
                if (getsc.timer) {
                    console.assert(false);
                    getsc.stop();
                }
                getsc.timer = tSleep(48);
                const res = await Promise.race([getsc.timer, api.req(`sn=${currsn}`, 5)]).catch(echo);

                if (Number(res) !== EROLLEDBACK && this.validate(runId)) {
                    if (d) {
                        if (res) {
                            if (initialscfetch || res.result !== 1) {
                                console.error(`Unexpected API response for w/sc request (${res.result})`, res);
                            }
                        }
                        else {
                            console.error('w/sc connection is taking too long, aborting...');
                        }
                    }
                    getsc.stop();

                    // at this point, sc_residue() should have been called with a new w/sc URL, but it may do not.
                    if (!waitsc.ok) {

                        if (initialscfetch) {
                            // No need to wait for the w/sc connection, immediately show the FM.
                            sc_residue({sn: currsn});
                        }

                        if (navigator.onLine === false) {

                            await this.onLine();
                        }
                        else {
                            console.error(' ---- caught faulty w/sc connection ----', res);

                            const data = [
                                !!self.initialscfetch | 0, res ? 1 : 0, (res && res.result) | 0, res | 0
                            ];
                            if (res || data[0]) {
                                eventlog(99993, JSON.stringify([2, ...data]), true);
                            }
                        }

                        tSleep(3 + Math.random() * 9)
                            .then(() => {

                                if (!this.locked && !waitsc.ok) {

                                    return getsc(true)
                                        .finally(() => {
                                            // Check for and release any held locks, if needed...
                                            api.poke().catch(dump);
                                        });
                                }
                            })
                            .catch(reportError);
                    }

                    return res;
                }
            }

            return EEXPIRED;
        }
    }
});

mBroadcaster.once('startMega', () => {
    'use strict';

    window.addEventListener('online', () => api.retry());

    var invisibleTime;
    document.addEventListener('visibilitychange', function(ev) {

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
    'use strict';

    // static master key, will be stored at the server side encrypted with the master pw
    u_k = [...crypto.getRandomValues(new Uint32Array(4))];
}

// If the user triggers an action that requires an account, but hasn't logged in,
// we create an anonymous preliminary account. Returns userhandle and passwordkey for permanent storage.
async function api_createuser(ctx, invitecode, invitename) {
    'use strict';
    let i;
    var ssc = Array(4); // session self challenge, will be used to verify password

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

    if (d) {
        console.debug(`api_createuser - mk: '${u_k}', pk: '${ctx.passwordkey}'`);
    }

    // in business sub-users API team decided to hack "UP" command to include "UC2" new arguments.
    // so now. we will check if this is a business sub-user --> we will add extra arguments to "UP" (crv,hak,v)
    const req = {
        a: 'up',
        k: a32_to_base64(encrypt_key(new sjcl.cipher.aes(ctx.passwordkey), u_k)),
        ts: base64urlencode(a32_to_str(ssc) + a32_to_str(encrypt_key(new sjcl.cipher.aes(u_k), ssc)))
    };

    // invite code usage is obsolete. it's only used in case of business sub-users
    // therefore, if it exists --> we are registering a business sub-user
    if (invitecode) {
        req.v = 2;
        req.ic = invitecode;
        req.name = invitename;

        const {
            clientRandomValueBytes,
            encryptedMasterKeyArray32,
            hashedAuthenticationKeyBytes,
            derivedAuthenticationKeyBytes
        } = await security.deriveKeysFromPassword(ctx.businessUser, u_k);

        req.crv = ab_to_base64(clientRandomValueBytes);
        req.k = a32_to_base64(encryptedMasterKeyArray32);
        req.hak = ab_to_base64(hashedAuthenticationKeyBytes);
        ctx.uh = ab_to_base64(derivedAuthenticationKeyBytes);
    }

    if (mega.affid) {
        req.aff = mega.affid;
    }

    watchdog.notify('createuser');
    return api.screq(req, ctx);
}

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
                else if (typeof res.u !== 'string' || res.u.length !== 11) {

                    console.error("Incorrect user handle in the 'us' response", res.u);

                    Soon(() => {
                        msgDialog('warninga', l[135], l[8853], res.u);
                    });

                    return false;
                }
                else if (typeof res.csid === 'string') {
                    let privk = null;
                    const errobj = {};
                    const t = base64urldecode(res.csid);

                    try {
                        privk = crypto_decodeprivkey(a32_to_str(decrypt_key(aes, base64_to_a32(res.privk))), errobj);
                    }
                    catch (ex) {

                        console.error('Error decoding private RSA key! %o', errobj, ex);

                        Soon(() => {
                            msgDialog('warninga', l[135], l[8853], JSON.stringify(errobj));
                        });

                        return false;
                    }

                    if (!privk) {
                        // Bad decryption of RSA is an indication that the password was wrong
                        console.error('RSA key decoding failed (%o)', errobj);
                        ctx.checkloginresult(ctx, false);
                        return false;
                    }

                    // Decrypt the Session ID
                    var decryptedSessionId = crypto_rsadecrypt(t, privk);

                    // Get the user handle from the decrypted Session ID (11 bytes starting at offset 16 bytes)
                    var sessionIdUserHandle = decryptedSessionId.substring(16, 27);

                    // Check that the decrypted sid and res.u aren't shorter than usual before making the comparison.
                    // Otherwise, we could construct an oracle based on shortened csids with single-byte user handles.
                    if (decryptedSessionId.length !== 255) {

                        console.error("Incorrect length of Session ID", decryptedSessionId.length, sessionIdUserHandle);

                        Soon(() => {
                            msgDialog('warninga', l[135], l[8853], decryptedSessionId.length);
                        });

                        return false;
                    }

                    // Check the user handle included in the Session ID matches the one sent in the 'us' response
                    if (sessionIdUserHandle !== res.u) {

                        console.error(
                            "User handle in Session ID did not match user handle from the 'us' request",
                            res.u, sessionIdUserHandle
                        );

                        Soon(() => {
                            msgDialog('warninga', l[135], l[8853], `${res.u} / ${sessionIdUserHandle}`);
                        });

                        return false;
                    }

                    // TODO: check remaining padding for added early wrong password detection likelihood
                    r = [k, base64urlencode(decryptedSessionId.substr(0, 43)), privk];
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
 * @param {MegaNode} n Updated node
 * @return {Promise} <st, *>
 */
async function api_setattr(n) {
    "use strict";

    if (!crypto_keyok(n)) {
        console.warn('Unable to set node attributes, invalid key on %s', n.h, n);
        return Promise.reject(EKEY);
    }

    if (d) {
        console.debug('Updating node attributes for "%s"...', n.h);
    }
    const req = {a: 'a', n: n.h, at: ab_to_base64(crypto_makeattr(n))};
    if (M.getNodeRoot(n.h) === M.InboxID) {
        mega.backupCenter.ackVaultWriteAccess(n.h, req);
    }
    return api.screq(req);
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
 * @return {Promise}
 */
async function api_cachepubkeys(users) {
    'use strict';

    users = users.filter((user) => user !== 'EXP' && !u_pubkeys[user]);

    if (users.length) {
        await Promise.allSettled(users.map((user) => Promise.resolve(crypt.getPubRSA(user))));

        if (users.some((user) => !u_pubkeys[user] && !user.includes('@'))) {
            throw new Error(`Failed to cache RSA pub keys for users ${JSON.stringify(users)}`);
        }

        if (d) {
            console.debug(`Cached RSA pub keys for users ${JSON.stringify(users)}`);
        }
    }
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
    'use strict';
    var pubkey;

    if ((pubkey = u_pubkeys[user])) {
        return crypto_rsaencrypt(data, pubkey, -0x4D454741);
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
 * @param {Array} [sharenodes]
 *     Holds complete directory tree starting from given node.
 * @returns {Promise}
 */
// eslint-disable-next-line complexity
async function api_setshare(node, targets, sharenodes) {
    'use strict';

    const pubKeys = [];
    const users = new Set();
    for (i = targets.length; i--;) {
        let {u} = targets[i];

        if (u && u !== 'EXP') {

            if (M.opc[u]) {
                console.error('Check this, got an outgoing pending contact...', u, M.opc[u]);

                u = M.opc[u].m;
                if (typeof u !== 'string' || !u.includes('@')) {
                    console.assert(false, 'Invalid outgoing pending contact email...');
                    continue;
                }
            }
            users.add(u);

            if (!mega.keyMgr.secure && !u_pubkeys[u]) {
                pubKeys.push(u);
            }
        }
    }

    if (pubKeys.length) {
        await api_cachepubkeys(pubKeys);
    }

    let exp = false;
    let maxretry = 5;
    let backoff = 196;
    let newkey = true;
    let sharekey, ssharekey;

    const req = {
        a: 's2',
        n: node,
        s: targets
    };

    for (let i = req.s.length; i--;) {
        if (typeof req.s[i].r !== 'undefined') {
            if (mega.keyMgr.secure) {
                newkey = mega.keyMgr.hasNewShareKey(node);

                // dummy key/handleauth - FIXME: remove
                req.ok = a32_to_base64([0, 0, 0, 0]);
                req.ha = a32_to_base64([0, 0, 0, 0]);
                break;
            }

            if (u_sharekeys[node]) {
                sharekey = u_sharekeys[node][0];
                newkey = mega.keyMgr.hasNewShareKey(node);
            }
            else {
                // we only need to generate a key if one or more shares are being added to a previously unshared node
                sharekey = [];
                for (let j = 4; j--;) {
                    sharekey.push(rand(0x100000000));
                }
                crypto_setsharekey(node, sharekey, true);
            }

            req.ok = a32_to_base64(encrypt_key(u_k_aes, sharekey));
            req.ha = crypto_handleauth(node);
            ssharekey = a32_to_str(sharekey);
            break;
        }
    }

    if (newkey) {
        if (!sharenodes) {
            if (d) {
                console.warn(`Acquiring share-nodes for ${node}...`, targets);
            }

            await mega.keyMgr.setShareSnapshot(node);
            sharenodes = mega.keyMgr.getShareSnapshot(node);
        }

        assert(Array.isArray(sharenodes) && sharenodes.includes(node), `Provided share-nodes seems invalid...`);
        req.cr = crypto_makecr(sharenodes, [node], true);
    }

    // encrypt ssharekey to known users
    for (let i = req.s.length; i--;) {
        if (req.s[i].u === 'EXP') {
            assert(!exp);
            exp = {a: 'l', n: node};

            if (req.s[i].w) {
                exp.w = 1;
                exp.sk = a32_to_base64(u_sharekeys[node][0]);
                req.s[i].r = 2;
                delete req.s[i].w;
            }
            else {
                assert(!req.s[i].r);
            }
        }
        else if (!mega.keyMgr.secure && u_pubkeys[req.s[i].u]) {
            req.s[i].k = base64urlencode(crypto_rsaencrypt(ssharekey, u_pubkeys[req.s[i].u]));
        }

        if (typeof req.s[i].m !== 'undefined') {
            req.s[i].u = req.s[i].m;
        }

        if (M.opc[req.s[i].u]) {
            if (d) {
                console.warn(`${req.s[i].u} is an outgoing pending contact, fixing to email...`, M.opc[req.s[i].u].m);
            }
            // the caller incorrectly passed a handle for a pending contact, so fixup..
            req.s[i].u = M.opc[req.s[i].u].m;
        }
    }

    if (users.size) {
        await mega.keyMgr.sendShareKeys(node, [...users]);
    }

    while (1) {
        const res = await api.screq(exp ? [req, exp] : req).catch(echo);
        if (d) {
            console.debug('api_setshare(%s)', node, res);
        }

        if (typeof res.result === 'object') {
            const {ok} = res.result;

            if (!ok) {
                mega.keyMgr.setUsedNewShareKey(node).catch(dump);
                return res.result;
            }

            if (mega.keyMgr.secure) {
                if (d) {
                    console.error('Share key clash: Will be resolved via ^!keys');
                }
                // @todo retry when resolved (?)..
                return res.result;
            }

            if (d) {
                console.warn('Share key clash: Set returned key and try again.');
            }
            let key = decrypt_key(u_k_aes, base64_to_a32(ok));

            crypto_setsharekey(node, key);
            req.ha = crypto_handleauth(node);
            req.ok = ok;

            if (exp.sk) {
                exp.sk = a32_to_base64(key);
            }

            key = a32_to_str(key);
            for (let i = req.s.length; i--;) {
                if (u_pubkeys[req.s[i].u]) {
                    req.s[i].k = base64urlencode(crypto_rsaencrypt(key, u_pubkeys[req.s[i].u]));
                }
            }
        }

        if (!--maxretry || res === EARGS) {
            throw new MEGAException(`Share operation failed for ${node}: ${api.strerror(res)}`, res);
        }

        await tSleep(Math.min(2e4, backoff <<= 1) / 1e3);
    }
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

function crypto_encodeprivkey2(privk) {
    'use strict';
    const plen = privk[3].length * 8;
    const qlen = privk[4].length * 8;
    const dlen = privk[2].length * 8;

    return String.fromCharCode(qlen / 256) + String.fromCharCode(qlen % 256) + privk[4]
        + String.fromCharCode(plen / 256) + String.fromCharCode(plen % 256) + privk[3]
        + String.fromCharCode(dlen / 256) + String.fromCharCode(dlen % 256) + privk[2];
}

/**
 * Decode private RSA key.
 * @param {String} privk the key to decode.
 * @param {Object} [errobj] Optional object to put the details of a failure, if any
 * @returns {Array|Boolean} decoded private key, or boolean(false) if failure.
 */
function crypto_decodeprivkey(privk, errobj) {
    'use strict';
    let i, l;
    let privkey = [];

    // decompose private key
    for (i = 0; i < 4; i++) {
        if (privk.length < 2) {
            break;
        }

        l = (privk.charCodeAt(0) * 256 + privk.charCodeAt(1) + 7) >> 3;
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
    const q = privkey[0];
    const p = privkey[1];
    const d = privkey[2];
    const u = privkey[3];
    const q1 = q.subtract(1);
    const p1 = p.subtract(1);
    const m = new asmCrypto.Modulus(p.multiply(q));
    const e = new asmCrypto.Modulus(p1.multiply(q1)).inverse(d);
    const dp = d.divide(p1).remainder;
    const dq = d.divide(q1).remainder;

    // Calculate inverse modulo of q under p
    const inv = new asmCrypto.Modulus(p).inverse(q);

    // Convert Uint32Arrays to hex for comparison
    const hexInv = asmCrypto.bytes_to_hex(inv.toBytes()).replace(/^0+/, '');
    const hexU = asmCrypto.bytes_to_hex(u.toBytes()).replace(/^0+/, '');

    // Detect private key blob corruption - prevent API-exploitable RSA oracle requiring 500+ logins.
    // Ensure the bit length being at least 1000 and that u is indeed the inverse modulo of q under p.
    if (!(p.bitLength > 1000 &&
        q.bitLength > 1000 &&
        d.bitLength > 2000 &&
        u.bitLength > 1000 &&
        hexU === hexInv)) {
        return false;
    }

    privkey = [m, e, d, p, q, dp, dq, u];
    for (i = 0; i < privkey.length; i++) {
        privkey[i] = asmCrypto.bytes_to_string(privkey[i].toBytes());
    }

    return privkey;
}

/**
 * Decode private RSA key (pqd format).
 * @param {Uint8Array} privk the key to decode.
 * @param {Object} [errobj] Optional object to put the details of a failure, if any
 * @returns {Array|Boolean} decoded private key, or boolean(false) if failure.
 */
function crypto_decodeprivkey2(privk) {
    'use strict';
    let i, l;
    let pos = 0;
    let privkey = [];

    // decompose private key
    for (i = 0; i < 3; i++) {
        if (pos + 2 > privk.length) {
            return false;
        }

        l = privk[pos] * 256 + (privk[pos + 1] + 7) >> 3;
        pos += 2;

        if (pos + l > privk.length) {
            return false;
        }

        privkey[i] = new asmCrypto.BigNumber(privk.slice(pos, pos + l));
        pos += l;
    }

    // restore privkey components via the known ones
    const q = privkey[0];
    const p = privkey[1];
    const d = privkey[2];
    const q1 = q.subtract(1);
    const p1 = p.subtract(1);
    const m = new asmCrypto.Modulus(p.multiply(q));
    const e = new asmCrypto.Modulus(p1.multiply(q1)).inverse(d);
    const dp = d.divide(p1).remainder;
    const dq = d.divide(q1).remainder;

    // Calculate inverse modulo of q under p
    const u = new asmCrypto.Modulus(p).inverse(q);

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
function crypto_rsaencrypt(cleartext, pubkey, bf) {
    'use strict';

    if (bf !== -0x4d454741 && mega.keyMgr.secure) {
        return '';
    }

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

async function api_getfileattr(fa, type, procfa, errfa) {
    'use strict';
    let r;
    const p = Object.create(null);
    const h = Object.create(null);
    const k = Object.create(null);
    const plain = Object.create(null);
    let cache = nop;

    type |= 0;
    if (type in fa_handler.lru) {
        const lru = await fa_handler.lru[type];
        if (!lru.error) {
            const send = async(h, ab) => procfa({cached: 1}, h, ab);
            const found = await lru.bulkGet(Object.keys(fa)).catch(dump) || false;

            for (const h in found) {
                fa[h] = null;
                send(h, found[h]).catch(dump);
            }
            cache = (h, buf) => lru.set(h, buf).catch(dump);
        }
    }

    const re = new RegExp(`(\\d+):${type}\\*([\\w-]+)`);
    for (const n in fa) {
        if (fa[n] && (r = re.exec(fa[n].fa))) {
            const t = base64urldecode(r[2]);
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
                plain[r[1]] = !!fa[n].plaintext;
            }
        }
        else if (fa[n] !== null && typeof errfa === 'function') {
            queueMicrotask(errfa.bind(null, n));
        }
    }

    // eslint-disable-next-line guard-for-in
    for (const n in p) {
        const ctx = {
            callback: api_fareq,
            type: type,
            p: p[n],
            h: h,
            k: k,
            procfa: (ctx, h, buf) => {
                if (!buf || !buf.byteLength) {
                    buf = 0xDEAD;
                }
                else {
                    cache(h, buf);
                }
                return procfa(ctx, h, buf);
            },
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

// @todo refactor whole fa-handler from scratch!
lazy(fa_handler, 'lru', () => {
    'use strict';
    const lru = Object.create(null);
    lazy(lru, 0, () => LRUMegaDexie.create('fa-handler.0', 1e4));
    lazy(lru, 1, () => LRUMegaDexie.create('fa-handler.1', 1e3));
    return lru;
});

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
        const procfa = (res) => ctx.procfa(ctx, ctx.h[h], res);
        const decrypt = tryCatch((k) => {
            const ts = new Uint8Array(response, p, l);

            const data = asmCrypto.AES_CBC.decrypt(ts, a32_to_ab([
                k[0] ^ k[4], k[1] ^ k[5], k[2] ^ k[6], k[3] ^ k[7]
            ]), false);

            procfa(data);
        }, () => procfa(0xDEAD));

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
                decrypt(k);
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
                if (faxhrs[this.fa_slot] && this.fah instanceof fa_handler && this.fah.done) {
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

    return f.length ? f.join('/') : undefined;
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

        api.screq(req)
            .then(() => {
                mBroadcaster.sendMessage('pfa:complete', id, node, fa);
            })
            .catch((ex) => {
                if (ex === EACCESS) {
                    api_pfaerror(node);
                }
                mBroadcaster.sendMessage('pfa:error', id, node, ex);
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
    'use strict';
    const cr = [shares, [], []];

    // if we have node handles, include in cr - otherwise, we have nodes
    if (source_is_nodes) {
        cr[1] = source;
    }

    for (let i = shares.length; i--;) {
        const sk = u_sharekeys[shares[i]];

        if (sk) {
            const aes = sk[1];

            for (let j = source.length; j--;) {
                const nk = source_is_nodes ? M.getNodeByHandle(source[j]).k : source[j].k;

                if (nk && (nk.length === 8 || nk.length === 4)) {

                    cr[2].push(i, j, a32_to_base64(encrypt_key(aes, nk)));
                }
                else {
                    console.warn(`crypto_makecr(): Node-key unavailable for ${shares[i]}->${source[j]}`, nk);
                }
            }
        }
        else {
            console.warn(`crypto_makecr(): Share-key unavailable for ${shares[i]}`);
        }
    }

    return cr;
}

// RSA-encrypt sharekey to newly RSA-equipped user
// TODO: check source/ownership of sharekeys, prevent forged requests
function crypto_procsr(sr) {
    // insecure functionality - disable
    if (mega.keyMgr.secure) {
        return;
    }

    var logger = MegaLogger.getLogger('crypt');
    var ctx = {
        sr: sr,
        i: 0
    };

    ctx.callback = function(res, ctx) {
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

async function api_updfkey(sn) {
    'use strict';

    if (typeof sn === 'string') {
        sn = await M.getNodes(sn, true).catch(dump);
    }

    if (Array.isArray(sn) && sn.length) {
        const nk = [];

        for (let i = sn.length; i--;) {
            const h = sn[i];
            const n = M.getNodeByHandle(h);

            if (n.u && n.u !== u_handle && crypto_keyok(n)) {

                nk.push(h, a32_to_base64(encrypt_key(u_k_aes, n.k)));
            }
        }

        if (nk.length) {
            if (d) {
                console.warn('re-keying foreign nodes...', sn, nk);
            }
            return api.send({a: 'k', nk});
        }
    }
}

var rsa2aes = Object.create(null);

// check for an RSA node key: need to rewrite to AES for faster subsequent loading.
function crypto_rsacheck(n) {
    // deprecated
    if (mega.keyMgr.secure) {
        return;
    }

    if (typeof n.k == 'string'   // must be undecrypted
        && (n.k.indexOf('/') > 55   // must be longer than userhandle (11) + ':' (1) + filekey (43)
            || (n.k.length > 55 && n.k.indexOf('/') < 0))) {
        rsa2aes[n.h] = true;
    }
}

function crypto_node_rsa2aes() {
    // deprecated
    if (mega.keyMgr.secure) {
        return;
    }

    var nk = [];

    for (const h in rsa2aes) {
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
    'use strict';

    if (!M.d[n.h] || typeof M.d[n.h].k === 'string') {
        var change = false;

        if (!missingkeys[n.h]) {
            missingkeys[n.h] = Object.create(null);
            change = true;
        }

        for (var p = 8; (p = n.k.indexOf(':', p)) >= 0; p += 32) {
            if (p === 8 || n.k[p - 9] === '/') {
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

            if (fmdb) {
                fmdb.add('mk', {
                    h: n.h,
                    d: {s: Object.keys(missingkeys[n.h])}
                });
            }

            if (fminitialized) {
                delay('reqmissingkeys', crypto_reqmissingkeys, 7e3);
            }
        }
    }
    else if (d) {
        const mk = window._mkshxx = window._mkshxx || new Set();
        mk.add(n.h);

        delay('debug::mkshkk', () => {
            console.debug('crypto_reportmissingkey', [...mk]);
            window._mkshxx = undefined;
        }, 4100);
    }
}

async function crypto_reqmissingkeys() {
    'use strict';

    if (!newmissingkeys) {
        if (d) {
            console.debug('No new missing keys.');
        }
        return;
    }

    if (mega.keyMgr.secure) {
        if (d) {
            console.warn('New missing keys', missingkeys);
        }
        return;
    }

    const cr = [[], [], []];
    const nodes = Object.create(null);
    const shares = Object.create(null);

    const handles = Object.keys(missingkeys);
    const sharenodes = await Promise.allSettled(handles.map(h => M.getShareNodes(h)));

    crypto_fixmissingkeys(missingkeys);

    for (let idx = 0; idx < handles.length; ++idx) {
        const n = handles[idx];
        if (!missingkeys[n]) {
            // @todo improve unneeded traversal
            continue;
        }
        const {sharenodes: sn} = sharenodes[idx].value || {sn: []};

        for (let j = sn.length; j--;) {
            const s = sn[j];

            if (shares[s] === undefined) {
                shares[s] = cr[0].length;
                cr[0].push(s);
            }

            if (nodes[n] === undefined) {
                nodes[n] = cr[1].length;
                cr[1].push(n);
            }

            cr[2].push(shares[s], nodes[n]);
        }
    }

    if (!cr[1].length) {
        // if (d) {
        //     console.debug('No missing keys.');
        // }
        return;
    }

    if (cr[0].length) {
        // if (d) {
        //     console.debug('Requesting missing keys...', cr);
        // }
        const {result: res} = await api.req({a: 'k', cr, i: requesti}).catch(echo);

        if (typeof res === 'object' && typeof res[0] === 'object') {
            if (d) {
                console.debug('Processing crypto response...', res);
            }
            crypto_proccr(res[0]);
        }
    }
    else if (d) {
        console.debug(`Keys ${cr[1]} missing, but no related shares found.`);
    }
}

// populate from IndexedDB's mk table
function crypto_missingkeysfromdb(r) {
    'use strict';

    // FIXME: remove the following line
    if (!r.length || !r[0].s) {
        return;
    }

    for (var i = r.length; i--;) {
        if (!missingkeys[r[i].h]) {
            missingkeys[r[i].h] = Object.create(null);
        }

        if (r[i].s) {
            for (var j = r[i].s.length; j--;) {
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
    'use strict';

    // no longer missing from the shares it was in
    for (const sh in missingkeys[h]) {
        delete sharemissing[sh][h];
    }

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
    'use strict';
    const res = [];

    if (hs) {
        for (var h in hs) {
            var n = M.d[h];

            if (n && !crypto_keyok(n)) {
                crypto_decryptnode(n);
            }

            if (crypto_keyok(n)) {
                res.push(h);
                fm_updated(n);
                crypto_keyfixed(h);
            }
        }
    }

    return res.length ? res : false;
}

// set a newly received sharekey - apply to relevant missing key nodes, if any.
// also, update M.c.shares/FMDB.s if the sharekey was not previously known.
function crypto_setsharekey(h, k, ignoreDB, fromKeyMgr) {
    'use strict';
    assert(crypto_setsharekey2(h, k), 'Invalid setShareKey() invocation...');

    if (!fromKeyMgr && !pfid) {
        mega.keyMgr.createShare(h, k, true).catch(dump);
    }

    if (sharemissing[h]) {
        crypto_fixmissingkeys(sharemissing[h]);
    }

    if (M.c.shares[h]) {
        M.c.shares[h].sk = a32_to_base64(k);

        if (fmdb && !ignoreDB) {
            fmdb.add('s', {
                o_t: M.c.shares[h].su + '*' + h,
                d: M.c.shares[h]
            });
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
    // deprecated
    if (mega.keyMgr.secure) {
        return;
    }

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
    // deprecated
    if (mega.keyMgr.secure) {
        return;
    }

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

// FIXME: add to translations?
function api_strerror(errno) {
    'use strict';
    const eno = parseInt(errno);

    return eno === 0 ? '<//NO_ERROR>' : api_strerror.map[eno] || `Unknown error (${errno})`;
}

/** @property api_strerror.map */
lazy(api_strerror, 'map', () => {
    'use strict';

    return freeze({
        [EINTERNAL]: 'Internal error.',
        [EARGS]: 'Invalid argument.',
        [EAGAIN]: 'Request failed, retrying',
        [ERATELIMIT]: 'Rate limit exceeded.',
        [EFAILED]: 'Failed permanently.',
        [ETOOMANY]: 'Too many concurrent connections or transfers',
        [ERANGE]: 'Resource access out of range.',
        [EEXPIRED]: 'Resource expired.',
        [ENOENT]: 'Resource does not exist.',
        [ECIRCULAR]: 'Circular linkage detected.',
        [EACCESS]: 'Access denied.',
        [EEXIST]: 'Resource already exists.',
        [EINCOMPLETE]: 'Request incomplete.',
        [EKEY]: 'Cryptographic error, invalid key.',
        [ESID]: 'Bad session ID.',
        [EBLOCKED]: 'Resource administratively blocked.',
        [EOVERQUOTA]: 'Quota exceeded.',
        [ETEMPUNAVAIL]: 'Resource temporarily not available.',
        [ETOOMANYCONNECTIONS]: 'Too many connections.',
        [EGOINGOVERQUOTA]: 'Not enough quota.',
        [EROLLEDBACK]: 'Request rolled back.',
        [EMFAREQUIRED]: 'Multi-Factor Authentication Required.',
        [EMASTERONLY]: 'Access denied for sub-users.',
        [EBUSINESSPASTDUE]: 'Business account expired.',
        [EPAYWALL]: 'Over Disk Quota Paywall.',
        [ETOOERR]: 'Too many concurrent errors.',
        [ESHAREROVERQUOTA]: l[19597] || 'Share owner is over storage quota.'
    });
});

/**
 * Helper class able to hold a so called APIv2 Custom Error Detail
 * @param {Number} code API error number.
 * @param {*} [args] object(s) holding such error details.
 */
class APIRequestError {
    constructor(code, ...args) {
        if (d) {
            console.assert(api_strerror.map[code], `Unexpected error code: ${code}`, args);
        }
        Object.assign(this, ...args);
        Object.defineProperty(this, 'code', {value: code | 0});
    }

    get [Symbol.toStringTag]() {
        return 'APIRequestError';
    }

    toString() {
        return api_strerror(this.code);
    }

    toJSON() {
        return {err: this.code, ...this};
    }

    valueOf() {
        return this.code;
    }
}

freeze(APIRequestError.prototype);
freeze(APIRequestError);

// @todo remove whenever api_req() is.
window.APIRequestError = APIRequestError;
