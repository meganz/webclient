// global variables holding the user's identity
// (moved to nodedec.js)
var u_p; // prepared password
var u_attr; // attributes

// log in
// returns user type if successful, false if not
// valid user types are: 0 - anonymous, 1 - email set, 2 - confirmed, but no RSA, 3 - complete
function u_login(ctx, email, password, uh, permanent) {
    var keypw;

    ctx.result = u_login2;
    ctx.permanent = permanent;

    // check whether the pwd came from the browser manager
    var pwdman = passwordManager.getStoredCredentials(password);
    if (pwdman) {
        uh = pwdman.hash;
        keypw = pwdman.keypw;

        if (d) {
            console.log('Using pwdman credentials.');
        }
    }
    else {
        keypw = prepare_key_pw(password);
    }

    api_getsid(ctx, email, keypw, uh);
}

function u_login2(ctx, ks) {
    if (ks !== false) {
        localStorage.wasloggedin = true;
        u_logout();
        u_storage = init_storage(ctx.permanent ? localStorage : sessionStorage);
        u_storage.k = JSON.stringify(ks[0]);
        u_storage.sid = ks[1];
        watchdog.notify('login', ks[1]);
        if (ks[2]) {
            u_storage.privk = base64urlencode(crypto_encodeprivkey(ks[2]));
        }
        u_checklogin(ctx, false);
    }
    else {
        ctx.checkloginresult(ctx, false);
    }
}

// if no valid session present, return false if force == false, otherwise create anonymous account and return 0 if successful or false if error;
// if valid session present, return user type
function u_checklogin(ctx, force, passwordkey, invitecode, invitename, uh) {
    if ((u_sid = u_storage.sid)) {
        api_setsid(u_sid);
        u_checklogin3(ctx);
    }
    else {
        if (!force) {
            ctx.checkloginresult(ctx, false);
        }
        else {
            u_logout();

            api_create_u_k();

            ctx.createanonuserresult = u_checklogin2;

            createanonuser(ctx, passwordkey, invitecode, invitename, uh);
        }
    }
}

function u_checklogin2(ctx, u) {
    if (u === false) {
        ctx.checkloginresult(ctx, false);
    }
    else {
        ctx.result = u_checklogin2a;
        api_getsid(ctx, u, ctx.passwordkey);
    }
}

function u_checklogin2a(ctx, ks) {
    if (ks === false) {
        ctx.checkloginresult(ctx, false);
    }
    else {
        u_k = ks[0];
        u_sid = ks[1];
        api_setsid(u_sid);
        u_storage.k = JSON.stringify(u_k);
        u_storage.sid = u_sid;
        u_checklogin3(ctx);
    }
}

function u_checklogin3(ctx) {
    ctx.callback = u_checklogin3a;
    api_getuser(ctx);
}

function u_checklogin3a(res, ctx) {
    var r = false;

    if (typeof res !== 'object') {
        u_logout();
        r = res;
    }
    else {
        u_attr = res;
        var exclude = [
            'c', 'email', 'k', 'name', 'p', 'privk', 'pubk', 's',
            'ts', 'u', 'currk', 'flags', '*!lastPsaSeen', 'lup', 'since'
        ];

        for (var n in u_attr) {
            if (exclude.indexOf(n) == -1) {
                try {
                    u_attr[n] = from8(base64urldecode(u_attr[n]));
                } catch (e) {
                    u_attr[n] = base64urldecode(u_attr[n]);
                }
            }
        }

        u_storage.attr = JSON.stringify(u_attr);
        u_storage.handle = u_handle = u_attr.u;

        init_storage(u_storage);

        if (u_storage.k) {
            try {
                u_k = JSON.parse(u_storage.k);
            }
            catch(e) {
                console.error('Error parsing key', e);
            }
        }

        if (u_k) {
            u_k_aes = new sjcl.cipher.aes(u_k);
        }

        try {
            if (u_attr.privk) {
                u_privk = crypto_decodeprivkey(a32_to_str(decrypt_key(u_k_aes, base64_to_a32(u_attr.privk))));
            }
        }
        catch (e) {
            console.error('Error decoding private RSA key', e);
        }

        // Flags is a generic object for various things
        if (typeof u_attr.flags !== 'undefined') {

            // If the 'psa' Public Service Announcement flag is set, this is the current announcement being sent out
            if (typeof u_attr.flags.psa !== 'undefined') {

                // Get the last seen announcement private attribute
                var currentAnnounceNum = u_attr.flags.psa;
                var lastSeenAttr = (typeof u_attr['*!lastPsaSeen'] !== 'undefined') ? u_attr['*!lastPsaSeen'] : null;

                // Set the values we need to know if the PSA should be shown, then show the announcement
                psa.setInitialValues(currentAnnounceNum, lastSeenAttr);
            }

            // If 'mcs' Mega Chat Status flag is 0 then MegaChat is off, otherwise if flag is 1 MegaChat is on
            if (typeof u_attr.flags.mcs !== 'undefined') {
                localStorage.chatDisabled = (u_attr.flags.mcs === 0) ? '1' : '0';
            }
        }
        u_attr.flags = Object(u_attr.flags);

        // If their PRO plan has expired and Last User Payment info is set, configure the dialog
        if (typeof u_attr.lup !== 'undefined') {
            alarm.planExpired.lastPayment = u_attr.lup;
        }

        if (!u_attr.email) {
            r = 0;      // Ephemeral account
        }
        else if (!u_attr.c) {
            r = 1;      // Haven't confirmed email yet
        }
        else if (!u_attr.privk) {
            r = 2;      // Don't have a private key yet (maybe they quit before key generation completed)
        }
        else {
            r = 3;      // Fully registered
        }

        if (r == 3) {
            return mBroadcaster.crossTab.initialize(function() {
                ctx.checkloginresult(ctx, r);
            });
        }
    }
    ctx.checkloginresult(ctx, r);
}

// erase all local user/session information
function u_logout(logout) {
    var a = [localStorage, sessionStorage];
    for (var i = 2; i--;) {
        a[i].removeItem('sid');
        a[i].removeItem('k');
        a[i].removeItem('p');
        a[i].removeItem('handle');
        a[i].removeItem('attr');
        a[i].removeItem('privk');
        a[i].removeItem('keyring');
        a[i].removeItem('puEd255');
        a[i].removeItem('puCu255');
        a[i].removeItem('randseed');
    }

    if (logout) {
        if (!megaChatIsDisabled) {

            localStorage.removeItem("audioVideoScreenSize");

            if (megaChatIsReady) {
                megaChat.destroy( /* isLogout: */ true);

                localStorage.removeItem("megaChatPresence");
                localStorage.removeItem("userPresenceIsOffline");
                localStorage.removeItem("megaChatPresenceMtime");
            }
        }

        localStorage.removeItem('signupcode');
        localStorage.removeItem('registeremail');
        localStorage.removeItem('agreedToCopyrightWarning');

        fminitialized = false;
        if (typeof mDBcls === 'function') {
            mDBcls(); // close fmdb
        }
        if (logout !== -0xDEADF) {
            watchdog.notify('logout');
        }
        slideshow(0, 1);
        mBroadcaster.crossTab.leave();
        u_sid = u_handle = u_k = u_attr = u_privk = u_k_aes = undefined;
        notify.notifications = [];
        api_setsid(false);
        u_sharekeys = {};
        u_type = false;
        loggedout = true;
        $('#fmholder').html('');
        $('#fmholder').attr('class', 'fmholder');
        M = new MegaData();
        $.hideContextMenu = function () {};
        api_reset();
        if (waitxhr) {
            waitxhr.abort();
            waitxhr = undefined;
        }
    }
}

// true if user was ever logged in with a non-anonymous account
function u_wasloggedin() {
    return localStorage.wasloggedin;
}

// set user's RSA key
function u_setrsa(rsakey) {
    var $promise = new MegaPromise();

    var ctx = {
        callback: function (res, ctx) {
            if (window.d) {
                console.log("RSA key put result=" + res);
            }

            u_privk = rsakey;
            u_attr.privk = u_storage.privk = base64urlencode(crypto_encodeprivkey(rsakey));
            u_attr.pubk = u_storage.pubk = base64urlencode(crypto_encodepubkey(rsakey));

            // Update u_attr and store user data on account activation
            u_checklogin({
                checkloginresult: function(ctx, r) {
                    u_type = r;
                    if (ASSERT(u_type === 3, 'Invalid activation procedure.')) {
                        var user = {
                            u: u_attr.u,

                            // u_attr.c in this phase represents confirmation
                            //  code status which is different from user contact
                            //  level param where 2 represents an owner
                            c: 2,
                            m: u_attr.email
                        };
                        process_u([user]);

                        if (d) console.log('Account activation succeeded', user);

                        watchdog.notify('setrsa', [u_type, u_sid]);
                    }
                    $promise.resolve(rsakey);
                    ui_keycomplete();
                }
            });
        }
    };

    api_req({
        a: 'up',
        privk: a32_to_base64(encrypt_key(u_k_aes,
            str_to_a32(crypto_encodeprivkey(rsakey)))),
        pubk: base64urlencode(crypto_encodepubkey(rsakey))
    }, ctx);

    return $promise;
}

// ensures that a user identity exists, also sets sid
function createanonuser(ctx, passwordkey, invitecode, invitename, uh) {
    ctx.callback = createanonuser2;

    ctx.passwordkey = passwordkey;

    api_createuser(ctx, invitecode, invitename, uh);
}

function createanonuser2(u, ctx) {
    if (u === false || !(localStorage.p = ctx.passwordkey) || !(localStorage.handle = u)) {
        u = false;
    }

    ctx.createanonuserresult(ctx, u);
}

function setpwreq(newpw, ctx) {
    var pw_aes = new sjcl.cipher.aes(prepare_key_pw(newpw));

    api_req({
        a: 'upkm',
        k: a32_to_base64(encrypt_key(pw_aes, u_k)),
        uh: stringhash(u_attr['email'].toLowerCase(), pw_aes)
    }, ctx);
}

function setpwset(confstring, ctx) {
    api_req({
        a: 'up',
        uk: confstring
    }, ctx);
}

/**
 *  checkMyPassword
 *
 *  Check if the password is the user's password without doing
 *  any API call, it tries to decrypt the user's private key.
 *
 *  @param string|AES   password
 *  @param array        encrypted private key (optional)
 *  @param array        private key (optional)
 *
 *
 *  @return bool
 */
function checkMyPassword(password, k1, k2) {
    if (typeof password === "string") {
        password = new sjcl.cipher.aes(prepare_key_pw(password));
    }

    return decrypt_key(password, base64_to_a32(k1 || u_attr.k)).join(",")  === (k2||u_k).join(",");
}

function changepw(currentpw, newpw, ctx) {
    var pw_aes = new sjcl.cipher.aes(prepare_key_pw(newpw));

    api_req({
        a: 'up',
        currk: a32_to_base64(encrypt_key(new sjcl.cipher.aes(prepare_key_pw(currentpw)), u_k)),
        k: a32_to_base64(encrypt_key(pw_aes, u_k)),
        uh: stringhash(u_attr['email'].toLowerCase(), pw_aes)
    }, ctx);
}

/**
 * Send account signup/confirmation link.
 *  an anonymous account must be present - check / create before calling
 *
 * @param {String}  name     The user's full name
 * @param {String}  email    His email
 * @param {String}  password The password chosen
 * @param {Object}  ctx      The usual object with a callback to receive the result
 * @param {Boolean} pro      Whether the signup is part of a pro purchase
 */
function sendsignuplink(name, email, password, ctx, pro) {
    var pw_aes = new sjcl.cipher.aes(prepare_key_pw(password));
    var req = {
        a: 'uc',
        c: base64urlencode(a32_to_str(encrypt_key(pw_aes, u_k))
            + a32_to_str(encrypt_key(pw_aes, [rand(0x100000000), 0, 0, rand(0x100000000)]))),
        n: base64urlencode(to8(name)),
        m: base64urlencode(email)
    };

    if (pro === true) {
        req.p = 1;
    }

    api_req(req, ctx);
}

function verifysignupcode(code, ctx) {
    var req = {
        a: 'ud',
        c: code
    };

    ctx.callback = verifysignupcode2;

    api_req(req, ctx);
}

var u_signupenck;
var u_signuppwcheck;

function verifysignupcode2(res, ctx) {
    if (typeof res == 'object') {
        u_signupenck = base64_to_a32(res[3]);
        u_signuppwcheck = base64_to_a32(res[4]);

        ctx.signupcodeok(base64urldecode(res[0]), base64urldecode(res[1]));
    }
    else {
        ctx.signupcodebad(res);
    }
}

function checksignuppw(password) {
    var pw_aes = new sjcl.cipher.aes(prepare_key_pw(password));
    var t = decrypt_key(pw_aes, u_signuppwcheck);

    if (t[1] || t[2]) {
        return false;
    }

    u_k = decrypt_key(pw_aes, u_signupenck);

    return true;
}

function checkquota(ctx) {
    var req = {
        a: 'uq',
        xfer: 1
    };

    api_req(req, ctx);
}

function processquota1(res, ctx) {
    if (typeof res === 'object') {
        if (res.tah) {
            var i;
            var tt = 0;
            var tft = 0;
            var tfh = -1;

            for (i = 0; i < res.tah.length; i++) {
                tt += res.tah[i];

                if (tfh < 0) {
                    tft += res.tah[i];

                    if (tft > 1048576) {
                        tfh = i;
                    }
                }
            }

            ctx.processquotaresult(ctx, [tt, tft, (6 - tfh) * 3600 - res.bt, res.tar, res.tal]);
        }
        else {
            ctx.processquotaresult(ctx, false);
        }
    }
}

/**
 * Helper method that will generate a 1 or 2 letter short contact name
 *
 * @param s
 * @param shortFormat
 * @returns {string}
 * @private
 */
function _generateReadableContactNameFromStr(s, shortFormat) {
    if (!s) {
        return "NA";
    }

    if (shortFormat) {
        var ss = s.split("@")[0];
        if (ss.length == 2) {
            return ss.toUpperCase();
        }
        else {
            return s.substr(0, 1).toUpperCase();
        }
    }
    else {
        s = s.split(/[^a-z]/ig);
        s = s[0].substr(0, 1) + (s.length > 1 ? "" + s[1].substr(0, 1) : "");
        return s.toUpperCase();
    }
}

/**
 * Generates meta data required for rendering avatars
 *
 * @param user_hash
 * @returns {*|jQuery|HTMLElement}
 */
function generateAvatarMeta(user_hash) {
    var meta = {};

    var contact = M.u[user_hash];
    if (!contact) {
        // console.error('contact not found');
        contact = {}; // dummy obj.
    }

    var fullName = M.getNameByHandle(user_hash);

    var ua_meta = useravatar.generateContactAvatarMeta(user_hash);
    meta.color = ua_meta.avatar.colorIndex;
    meta.shortName = ua_meta.avatar.letters;
    meta.fullName = fullName;

    if (ua_meta.type === 'image') {
        meta.avatarUrl = ua_meta.avatar;
    }
    return meta;
}

function isNonActivatedAccount() {
    return (!u_privk && typeof (u_attr.p) !== 'undefined'
            && (u_attr.p >= 1 || u_attr.p <= 4));
}

function isEphemeral() {
    return (u_type === 0);
}

/**
 * Check if the current user doens't have a session, if they don't have
 * a session we show the login dialog, and when they have a session
 * we redirect back to the intended page.
 *
 * @return {Boolean} True if the login dialog is shown
 */
function checkUserLogin() {
    if (!u_type) {
        login_next = getSitePath();
        loadSubPage('login');
        return true;
    }

    return false;
}


(function(exportScope) {
    var _lastUserInteractionCache = window._lastUserInteractionCache = {};
    var _lastUserInteractionPromiseCache = window._lastUserInteractionPromiseCache = {};

    /**
     * Compare and return `true` if:
     * - `a` is > `b`
     *
     * @param a
     * @param b
     * @private
     */
    var _compareLastInteractionStamp = function (a, b) {
        var timestampA = parseInt(a.split(":")[1], 10);
        var timestampB = parseInt(b.split(":")[1], 10);

        return timestampA > timestampB;
    };


    /**
     * Set the last interaction for a contact
     *
     * @param u_h {String} user handle
     * @param v {String} "$typeOfInteraction:$unixTimestamp" (see getLastInteractionWith for the types of int...)
     * @returns {Deferred}
     */
    var setLastInteractionWith = function (u_h, v) {
        assert(u_handle, "missing u_handle, can't proceed");
        assert(u_h, "missing argument u_h, can't proceed");

        var isDone = false;
        var $promise = createTimeoutPromise(
            function () {
                return isDone === true;
            },
            500,
            10000
        );

        $promise.always(function () {
            isDone = true;
        });


        getLastInteractionWith(u_h)
            .done(function (timestamp) {
                if (_compareLastInteractionStamp(v, timestamp) === false) {
                    // older timestamp found in `v`, resolve the promise with the latest timestamp
                    $promise.resolve(v);
                    $promise.verify();
                }
                else {
                    _lastUserInteractionCache[u_h] = v;

                    $promise.resolve(_lastUserInteractionCache[u_h]);

                    M.u[u_h].ts = parseInt(v.split(":")[1], 10);

                    $promise.verify();

                    mega.attr.setArrayAttribute(
                        'lstint',
                        u_h,
                        _lastUserInteractionCache[u_h],
                        false,
                        true
                    );
                }
            })
            .fail(function (res) {
                if (res === false || res === -9) {
                    if (res === -9 && _lastUserInteractionCache === false) {
                        _lastUserInteractionCache = {};
                    }
                    _lastUserInteractionCache[u_h] = v;
                    $promise.resolve(_lastUserInteractionCache[u_h]);

                    Object(M.u[u_h]).ts = parseInt(v.split(":")[1], 10);

                    mega.attr.setArrayAttribute(
                        'lstint',
                        u_h,
                        _lastUserInteractionCache[u_h],
                        false,
                        false
                    );

                    $promise.verify();
                }
                else {
                    $promise.reject(res);
                    console.error("setLastInteraction failed, err: ", res);
                    $promise.verify();
                }
            });

        return $promise;

    };

    /**
     * Returns a promise which will be resolved with a string, formatted like this "$typeOfInteraction:$timestamp"
     * Where $typeOfInteraction can be:
     *  - 0 - cloud drive/sharing
     *  - 1 - chat
     *
     * @param u_h
     * @returns {MegaPromise}
     */
    var getLastInteractionWith = function (u_h) {
        assert(u_handle, "missing u_handle, can't proceed");
        assert(u_h, "missing argument u_h, can't proceed");


        var _renderLastInteractionDone = function (r) {

            r = r.split(":");

            var $elem = $('.li_' + u_h);

            $elem
                .removeClass('never')
                .removeClass('cloud-drive')
                .removeClass('conversations')
                .removeClass('unread-conversations');

            var ts = parseInt(r[1], 10);

            if (M.u[u_h]) {
                M.u[u_h].ts = ts;
            }

            if (r[0] === "0") {
                $elem.addClass('cloud-drive');
            }
            else if (r[0] === "1" && megaChatIsReady) {
                var room = megaChat.getPrivateRoom(u_h);
                if (room && megaChat.plugins && megaChat.plugins.chatNotifications) {
                    if (megaChat.plugins.chatNotifications.notifications.getCounterGroup(room.roomJid) > 0) {
                        $elem.addClass('unread-conversations');
                    }
                    else {
                        $elem.addClass('conversations');
                    }
                }
                else {
                    $elem.addClass('conversations');
                }
            }
            else {
                $elem.addClass('never');
            }
            $elem.text(
                time2last(ts)
            );

            if ($.sortTreePanel && $.sortTreePanel.contacts.by === 'last-interaction') {
                // we need to resort
                M.contacts();
            }
        };

        var _renderLastInteractionFail = function (r) {
            var $elem = $('.li_' + u_h);

            $elem
                .removeClass('never')
                .removeClass('cloud-drive')
                .removeClass('conversations')
                .removeClass('unread-conversations');


            $elem.addClass('never');
        };

        var $promise = new MegaPromise();

        $promise
            .done(_renderLastInteractionDone)
            .fail(_renderLastInteractionFail);

        if (_lastUserInteractionPromiseCache[u_h] && _lastUserInteractionPromiseCache[u_h].state() === 'pending') {
            return _lastUserInteractionPromiseCache[u_h];
        }
        else if (_lastUserInteractionCache[u_h]) {
            if (megaChatIsReady) {
                var chatRoom = megaChat.getPrivateRoom(u_h);

                if (chatRoom) {
                    var newActivity = parseInt(_lastUserInteractionCache[u_h].split(":")[1], 10);
                    if (newActivity > chatRoom.lastActivity) {
                        chatRoom.lastActivity = newActivity;
                    }
                }
            }
            $promise.resolve(_lastUserInteractionCache[u_h]);
        }
        else if (
                !_lastUserInteractionCache[u_h] &&
                (
                    !_lastUserInteractionPromiseCache[u_h] ||
                    _lastUserInteractionPromiseCache[u_h].state() !== 'pending'
                )
            ) {
            _lastUserInteractionPromiseCache[u_h] = mega.attr.getArrayAttribute(
                u_handle,
                'lstint',
                u_h,
                false,
                true
            )
                .always(function() {
                    _lastUserInteractionPromiseCache[u_h] = false;
                })
                .done(function (res) {
                    if (typeof res !== 'number') {
                        if (typeof res === 'undefined') {
                            // detected legacy value which was not unserialised properly....should re-initialise as
                            // empty value, e.g. no last interaction with that user (would be rebuilt by chat messages
                            // and stuff)
                            $promise.reject(false);
                        }
                        else {
                            _lastUserInteractionCache[u_h] = res;
                            $promise.resolve(res);
                        }
                    }
                    else {
                        $promise.reject(false);
                        console.error("Failed to retrieve last interaction cache from attrib, response: ", res);
                    }
                })
                .fail(function(res) {
                    $promise.reject(res);
                });
        }
        else {
            throw new Error("This should not happen.");
        }

        return $promise;
    };
    exportScope.setLastInteractionWith = setLastInteractionWith;
    exportScope.getLastInteractionWith = getLastInteractionWith;
})(window);



(function _userConfig() {
    "use strict";

    var timer;
    var waiter;
    var ns = {};
    var logger = MegaLogger.getLogger('account.config');
    var MMH_SEED = 0x7f01e0aa;

    /**
     * Move former/legacy settings stored in localStorage
     * @private
     */
    var moveLegacySettings = function() {
        var prefs = [
            'dl_maxSlots', 'ul_maxSlots', 'ul_maxSpeed', 'use_ssl',
            'ul_skipIdentical', 'font_size', 'leftPaneWidth'
        ];

        prefs.forEach(function(pref) {
            if (localStorage[pref] !== undefined) {
                if (fmconfig[pref] === undefined) {
                    mega.config.set(pref, parseInt(localStorage[pref]) | 0);
                }
            }
        });
    };

    /**
     * Pick the global `fmconfig` and sanitize it before
     * sending it to the server, as per TLV requirements.
     * @private
     */
    var getConfig = function() {
        var result = {};
        var config = Object(fmconfig);
        var nodes = { viewmodes: 1, sortmodes: 1, treenodes: 1 };

        var isValid = function(handle) {
            return handle.length !== 8 || M.d[handle] || handle === 'contacts';
        };

        for (var key in config) {
            if (!config.hasOwnProperty(key)) {
                continue;
            }
            var value = config[key];

            if (!value && value !== 0) {
                logger.info('Skipping empty value for "%s"', key);
                continue;
            }

            // Dont save no longer existing nodes
            if (nodes[key]) {
                if (typeof value !== 'object') {
                    logger.warn('Unexpected type for ' + key);
                    continue;
                }

                var modes = {};
                for (var handle in value) {
                    if (value.hasOwnProperty(handle)
                            && handle.substr(0, 7) !== 'search/'
                            && isValid(handle)) {
                        modes[handle] = value[handle];
                    }
                    else {
                        logger.info('Skipping non-existant node "%s"', handle);
                    }
                }
                value = modes;
            }

            if (typeof value === 'object' && !$.len(value)) {
                logger.info('Skipping empty object "%s"', key);
                continue;
            }

            try {
                result[key] = JSON.stringify(value);
            }
            catch (ex) {
                logger.error(ex);
            }
        }

        return result;
    };

    /**
     * Wrapper around mega.attr.set to store fmconfig on the server, encrypted.
     * @private
     */
    var store = function() {
        if (!u_handle || pfid) {
            return MegaPromise.reject(EINCOMPLETE);
        }

        var config = getConfig();
        if (!$.len(config)) {
            return MegaPromise.reject(ENOENT);
        }

        var hash = JSON.stringify(config);
        var len = hash.length;

        // generate checkum/hash for the config
        hash = MurmurHash3(hash, MMH_SEED);

        // dont store it unless it has changed
        if (hash === parseInt(localStorage[u_handle + '_fmchash'])) {
            return MegaPromise.resolve(EEXIST);
        }
        localStorage[u_handle + '_fmchash'] = hash;

        var promise;
        if (len < 8) {
            srvlog('config.set: invalid data');
            promise = MegaPromise.reject(EARGS);
        }
        else if (len > 12000) {
            srvlog('config.set: over quota');
            promise = MegaPromise.reject(EOVERQUOTA);
        }
        else {
            promise = mega.attr.set('fmconfig', config, false, true);
        }

        return promise;
    };

    /**
     * Fetch server-side config.
     * @return {MegaPromise}
     */
    ns.fetch = function _fetchConfig() {
        if (!u_handle) {
            return MegaPromise.reject(EINCOMPLETE);
        }

        // if already running/pending
        if (waiter) {
            return waiter;
        }
        var promise = waiter = new MegaPromise();

        mega.attr.get(u_handle, 'fmconfig', false, true)
            .always(function() {
                moveLegacySettings();

                // Initialize account notifications.
                mega.notif.setup(fmconfig.anf);
            })
            .done(function(result) {
                result = Object(result);
                for (var key in result) {
                    if (result.hasOwnProperty(key)) {
                        try {
                            mega.config.set(key, JSON.parse(result[key]));
                        }
                        catch (ex) {}
                    }
                }

                if (fminitialized) {
                    var view = Object(fmconfig.viewmodes)[M.currentdirid];
                    var sort = Object(fmconfig.sortmodes)[M.currentdirid];

                    if ((view !== undefined && M.viewmode !== view)
                            || (sort !== undefined
                                && (sort.n !== M.sortmode.n
                                    || sort.d !== M.sortmode.d))) {

                        M.openFolder(M.currentdirid, true);
                    }

                    if (M.currentrootid === M.RootID) {
                        var tree = Object(fmconfig.treenodes);

                        if (JSON.stringify(tree) !== M.treenodes) {

                            M.renderTree();
                        }
                    }

                    localStorage[u_handle + '_fmchash'] =
                        MurmurHash3(JSON.stringify(getConfig()), MMH_SEED);
                }

                if (fmconfig.ul_maxSlots) {
                    ulQueue.setSize(fmconfig.ul_maxSlots);
                }
                if (fmconfig.dl_maxSlots) {
                    dlQueue.setSize(fmconfig.dl_maxSlots);
                }
                if (fmconfig.font_size) {
                    $('body').removeClass('fontsize1 fontsize2')
                        .addClass('fontsize' + fmconfig.font_size);
                }
                waiter.resolve();
                waiter = undefined;
            })
            .fail(function() {
                waiter.reject.apply(waiter, arguments);
                waiter = undefined;
            });

        return promise;
    };

    /**
     * Wrap a callback to be executed when the fetch's wait promise is resolved.
     * @param {Function} callback function
     */
    ns.ready = function _onConfigReady(callback) {
        if (waiter) {
            waiter.always(callback);
        }
        else {
            Soon(callback);
        }
    };

    /**
     * Retrieve configuration value.
     * (We'll keep using the global `fmconfig` for now)
     *
     * @param {String} key Configuration key
     */
    ns.get = function _getConfigValue(key) {
        return fmconfig[key];
    };

    /**
     * Store configuration value
     * @param {String} key   Configuration key
     * @param {String} value Configuration value
     */
    ns.set = function _setConfigValue(key, value) {
        fmconfig[key] = value;

        if (d) {
            logger.debug('Setting value for key "%s"', key, value);
        }

        var push = function() {
            if (u_type === 3 && !pfid && !folderlink) {
                // through a timer to prevent floods
                timer = delay('fmconfig:store', store, 3100);
            }
            else {
                localStorage.fmconfig = JSON.stringify(fmconfig);
                timer = null;
            }
        };

        if (fminitialized) {
            Soon(push);
        }
        else if (timer !== -MMH_SEED) {
            timer = -MMH_SEED;
            mBroadcaster.once('fm:initialized', push);
        }

        mBroadcaster.sendMessage('fmconfig:' + key, value);
    };

    /**
     * Same as .set, but displays a toast notification.
     * @param {String} key          Configuration key
     * @param {String} value        Configuration value
     * @param {String} [toastText]  Toast notification text
     */
    ns.setn = function _setConfigValueToast(key, value, toastText) {
        toastText = toastText || l[16168];

        delay('fmconfig:setn', function() {
            showToast('settings', toastText);

            mega.config.set(key, value);
        });
    };

    if (is_karma) {
        mega.config = ns;
    }
    else {
        Object.defineProperty(mega, 'config', {
            value: Object.freeze(ns)
        });
    }
    ns = undefined;

})(this);
