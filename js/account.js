// global variables holding the user's identity
var u_handle; // user handle
var u_k; // master key
var u_k_aes; // master key AES engine
var u_p; // prepared password
var u_attr; // attributes
var u_privk; // private key

// log in
// returns user type if successful, false if not
// valid user types are: 0 - anonymous, 1 - email set, 2 - confirmed, but no RSA, 3 - complete
function u_login(ctx, email, password, uh, permanent) {
    ctx.result = u_login2;
    ctx.permanent = permanent;

    api_getsid(ctx, email, prepare_key_pw(password), uh);
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
            'ts', 'u', 'currk', 'flags', '*!lastPsaSeen'
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

        // Flags is a generic object for various things
        if (typeof u_attr.flags !== 'undefined') {
            
            // If the 'psa' Public Service Announcement flag is set, this is the current announcement being sent out
            if (typeof u_attr.flags.psa !== 'undefined') {
                
                var last = (typeof u_attr['*!lastPsaSeen'] !== 'undefined') ? u_attr['*!lastPsaSeen'] : 0;
                
                // Set the values we need to know if the psa should be shown
                psa.setInitialValues(u_attr.flags.psa, last);
                
                // Attempt to set event handlers. If the elements we need haven't loaded yet, then the other 
                // psa.init() in index.js will add them. If that one ran first, then no problem.
                psa.init();
            }
            
            // If 'mcs' Mega Chat Status flag is 0 then MegaChat is off, otherwise if flag is 1 MegaChat is on
            if (typeof u_attr.flags.mcs !== 'undefined') {
                localStorage.chatDisabled = (u_attr.flags.mcs === 0) ? '1' : '0';
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
            // Load/initialise the authentication system.
            authring.initAuthenticationSystem();
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
                localStorage.removeItem("megaChatPresenceMtime");
            }
        }

        localStorage.removeItem('signupcode');
        localStorage.removeItem('registeremail');
        localStorage.removeItem('agreedToCopyrightWarning');

        if (mDBact) {
            mDBact = false;
            delete localStorage[u_handle + '_mDBactive'];
        }
        if (typeof mDBcls === 'function') {
            mDBcls(); // resets mDBloaded
        }
        fminitialized = false;
        if (logout !== -0xDEADF) {
            watchdog.notify('logout');
        }
        slideshow(0, 1);
        mBroadcaster.crossTab.leave();
        u_sid = u_handle = u_k = u_attr = u_privk = u_k_aes = undefined;
        notify.notifications = [];
        api_setsid(false);
        u_sharekeys = {};
        u_nodekeys = {};
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
                            c: u_attr.c,
                            m: u_attr.email,
                        };
                        process_u([user]);

                        if (d) console.log('Account activation succeeded', user);
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

// an anonymous account must be present - check / create before calling
function sendsignuplink(name, email, password, ctx) {
    var pw_aes = new sjcl.cipher.aes(prepare_key_pw(password));
    var req = {
        a: 'uc',
        c: base64urlencode(a32_to_str(encrypt_key(pw_aes, u_k))
            + a32_to_str(encrypt_key(pw_aes, [rand(0x100000000), 0, 0, rand(0x100000000)]))),
        n: base64urlencode(to8(name)),
        m: base64urlencode(email)
    };

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
 * Use this when rendering contact's name. Will try to find the contact and render his name (or email, if name is not
 * available) and as a last fallback option, if the contact is not found will render the user_hash (which is not
 * really helpful, but a way to debug)
 *
 * @param user_hash
 * @returns {String}
 */
function generateContactName(user_hash) {
    var contact = M.u[user_hash];
    if (!contact) {
        console.error('contact not found');
    }

    var name;

    if (contact && contact.name) {
        name = contact.name;
    }
    else if (contact && contact.m) {
        name = contact.m;
    }
    else {
        name = user_hash;
    }

    return name;
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
        console.error('contact not found');
        contact = {}; // dummy obj.
    }

    var fullName = generateContactName(user_hash);

    var shortName = fullName.substr(0, 1).toUpperCase();
    var avatar = avatars[contact.u];

    var color = 1;

    if (contact.shortName && contact.displayColor) { // really simple in-memory cache
        shortName = contact.shortName;
        color = contact.displayColor;
    }
    else {
        M.u.forEach(function(k, v) {
            var c = M.u[v];
            var n = generateContactName(v);

            if (!n || !c) {
                return; // skip, contact not found
            }

            var dn;
            if (shortName.length == 1) {
                dn = _generateReadableContactNameFromStr(n, true);
            }
            else {
                dn = _generateReadableContactNameFromStr(n, false);
            }

            if (c.u == contact.u) {
                color = k % 10;
            }
            else if (dn == shortName) { // duplicate name, if name != my current name
                shortName = _generateReadableContactNameFromStr(fullName, false);
            }
        });

        contact.shortName = shortName;
        contact.displayColor = color;
    }

    meta.color = color;
    meta.shortName = shortName;
    meta.fullName = fullName;

    if (avatar) {
        meta.avatarUrl = avatar.url;
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
        login_next = document.location.hash;
        document.location.hash = "#login";
        return true;
    }

    return false;
}


(function(exportScope) {
    var _lastUserInteractionCache = false;
    var _lastUserInteractionCacheIsLoading = false;

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


    var _lastInteractionFlushThrottleTimer = null;
    /**
     * Used internally to throttle the updates to the API
     * @private
     */
    var _flushLastInteractionData = function () {
        assert(u_handle, "missing u_handle, can't proceed");

        if (_lastInteractionFlushThrottleTimer) {
            clearTimeout(_lastInteractionFlushThrottleTimer);
        }
        _lastInteractionFlushThrottleTimer = setTimeout(function () {
            mega.attr.set(
                "lstint",
                _lastUserInteractionCache,
                false,
                true
            );
        }, 3 * 60000);
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

                    _flushLastInteractionData();

                    $promise.resolve(_lastUserInteractionCache[u_h]);

                    M.u[u_h].ts = parseInt(v.split(":")[1], 10);

                    $promise.verify();
                }
            })
            .fail(function (res) {
                if (res === false || res === -9) {
                    if (res === -9 && _lastUserInteractionCache === false) {
                        _lastUserInteractionCache = {};
                    }
                    _lastUserInteractionCache[u_h] = v;

                    _flushLastInteractionData();

                    $promise.resolve(_lastUserInteractionCache[u_h]);

                    Object(M.u[u_h]).ts = parseInt(v.split(":")[1], 10);

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

        if (_lastUserInteractionCache === false) {
            // load and retry logic

            // loading is already in progress?
            if (_lastUserInteractionCacheIsLoading === false) {
                _lastUserInteractionCacheIsLoading = mega.attr.get(
                    u_handle,
                    'lstint',
                    false,
                    true
                )
                    .done(function (res) {
                        if (typeof res !== 'number') {
                            _lastUserInteractionCache = res;
                            Object.keys(res).forEach(function(k) {
                                // prefill in-memory M.u[...] cache!
                                getLastInteractionWith(k);
                            });

                            // recurse, and return the data from the mem cache
                            $promise.linkDoneAndFailTo(
                                getLastInteractionWith(u_h)
                            );
                        }
                        else {
                            $promise.reject(false);
                            console.error("Failed to retrieve last interaction cache from attrib, response: ", err);
                        }
                    })
                    .always(function () {
                        _lastUserInteractionCacheIsLoading = false;
                    });

                $promise.linkFailTo(_lastUserInteractionCacheIsLoading);
            }
            else {
                _lastUserInteractionCacheIsLoading
                    .done(function () {
                        $promise.linkDoneAndFailTo(
                            getLastInteractionWith(u_h)
                        );
                    });
                $promise.linkFailTo(_lastUserInteractionCacheIsLoading);
            }
        }
        else if (!_lastUserInteractionCache[u_h]) {
            $promise.reject(false);
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
        if (!u_handle) {
            return MegaPromise.reject(EINCOMPLETE);
        }
        var config = getConfig();
        var hash = JSON.stringify(config);
        var len = hash.length;

        // generate checkum/hash for the config
        hash = MurmurHash3(hash, 0x7f01e0aa);

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
        waiter = new MegaPromise();

        mega.attr.get(u_handle, 'fmconfig', false, true)
            .always(moveLegacySettings)
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
            })
            .fail(function() {
                waiter.reject.apply(waiter, arguments);
            });

        return waiter;
    };

    /**
     * Wrap a callback to be executed when the fetch's wait promise is resolved.
     * @param {Function} callback function
     */
    ns.ready = function _onConfigReady(callback) {
        if (waiter) {
            logger.debug('Waiting to receive fmconfig...');

            waiter.always(function() {
                callback();
                waiter = null;
            });
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

        if (u_type === 3) {
            if (timer) {
                clearTimeout(timer);
            }
            // through a timer to prevent floods
            timer = setTimeout(store, 9701);
        }
        else {
            localStorage.fmconfig = JSON.stringify(fmconfig);
        }

        mBroadcaster.sendMessage('fmconfig:' + key, value);
    };

    Object.defineProperty(mega, 'config', {
        value: Object.freeze(ns)
    });

})(this);

(function _userAttributeHandling() {
    "use strict";

    var ns = {};
    var logger = MegaLogger.getLogger('account');
    var ATTRIB_CACHE_NON_CONTACT_EXP_TIME = 2 * 60 * 60;

    /**
     * Assemble property name on Mega API.
     *
     * @private
     * @param attribute {String}
     *     Name of the attribute.
     * @param pub {Boolean|Number}
     *     True for public attributes (default: true). -1 for "system" attributes (e.g. without prefix)
     * @param nonHistoric {Boolean}
     *     True for non-historic attributes (default: false).  Non-historic
     *     attributes will overwrite the value, and not retain previous
     *     values on the API server.
     * @return {String}
     */
    var buildAttribute = function(attribute, pub, nonHistoric) {
        if (nonHistoric === true || nonHistoric === 1) {
            attribute = '!' + attribute;
        }

        if (pub === true || pub === undefined) {
            attribute = '+' + attribute;
        }
        else if (pub !== -1) {
            attribute = '*' + attribute;
        }

        return attribute;
    };

    /**
     * Assemble property name for database.
     *
     * @private
     * @param userHandle {String}
     *     Mega's internal user handle.
     * @param attribute {String}
     *     Name of the attribute.
     * @return {String}
     */
    var buildCacheKey = function(userHandle, attribute) {
        return userHandle + "_" + attribute;
    };

    /**
     * Retrieves a user attribute.
     *
     * @param userhandle {String}
     *     Mega's internal user handle.
     * @param attribute {String}
     *     Name of the attribute.
     * @param pub {Boolean|Number}
     *     True for public attributes (default: true). -1 for "system" attributes (e.g. without prefix)
     * @param nonHistoric {Boolean}
     *     True for non-historic attributes (default: false).  Non-historic
     *     attributes will overwrite the value, and not retain previous
     *     values on the API server.
     * @param callback {Function}
     *     Callback function to call upon completion (default: none).
     * @param ctx {Object}
     *     Context, in case higher hierarchies need to inject a context
     *     (default: none).
     * @return {MegaPromise}
     *     A promise that is resolved when the original asynch code is settled.
     *     Can be used to use promises instead of callbacks for asynchronous
     *     dependencies.
     */
    ns.get = function _getUserAttribute(userhandle, attribute, pub, nonHistoric, callback, ctx) {
        assertUserHandle(userhandle);
        var myCtx = ctx || {};

        // Assemble property name on Mega API.
        attribute = buildAttribute(attribute, pub, nonHistoric);

        // Make the promise to execute the API code.
        var thePromise = new MegaPromise();

        var cacheKey = buildCacheKey(userhandle, attribute);

        /**
         * mega.attr.get::settleFunction
         *
         * Process result from `uga` API request, and cache it.
         *
         * @param {Number|Object} res The received result.
         */
        function settleFunction(res) {

            if (typeof res !== 'number') {
                // Decrypt if it's a private attribute container.
                if (attribute.charAt(0) === '*') {
                    try {
                        var clearContainer = tlvstore.blockDecrypt(base64urldecode(res),
                                                                   u_k);
                        res = tlvstore.tlvRecordsToContainer(clearContainer, true);

                        if (res === false) {
                            res = EINTERNAL;
                        }
                    }
                    catch (e) {
                        if (e.name === 'SecurityError') {
                            logger.error('Could not decrypt private user attribute '
                                         + attribute + ': ' + e.message);
                        }
                        else {
                            logger.error('Unexpected exception!', e);
                            setTimeout(function() { throw e; }, 4);
                            debugger;
                        }
                        res = EINTERNAL;
                    }
                }
            }

            // Cache all returned values, except errors other than ENOENT
            if (typeof res !== 'number' || res === ENOENT) {
                var exp = 0;
                // Only add cache expiration for attributes of non-contacts, because
                // contact's attributes would be always in sync (using actionpackets)
                if (userhandle !== u_handle && (!M.u[userhandle] || M.u[userhandle].c !== 1)) {
                    exp = unixtime();
                }
                attribCache.setItem(cacheKey, JSON.stringify([res, exp]));
            }

            settleFunctionDone(res);
        }

        /**
         * mega.attr.get::settleFunctionDone
         *
         * Fullfill the promise with the result/attribute value from either API or cache.
         *
         * @param {Number|Object} res    The result/attribute value.
         * @param {Boolean} cached Whether it came from cache.
         */
        function settleFunctionDone(res, cached) {
            var tag = cached ? 'Cached ' : '';

            // Another conditional, the result value may have been changed.
            if (typeof res !== 'number') {
                if (d) {
                    var loggerValueOutput = pub ? JSON.stringify(res) : '-- hidden --';
                    logger.info(tag + 'Attribute "%s" for user "%s" is %s.',
                                attribute, userhandle, loggerValueOutput);
                }
                thePromise.resolve(res);
            }
            else {
                // Got back an error (a number).
                logger.warn(tag + 'attribute "%s" for user "%s" could not be retrieved: %d!',
                            attribute, userhandle, res);
                thePromise.reject(res);
            }

            // Finish off if we have a callback.
            if (callback) {
                callback(res, myCtx);
            }
        }

        // Assemble context for this async API request.
        myCtx.u = userhandle;
        myCtx.ua = attribute;
        myCtx.callback = settleFunction;

        /**
         * mega.attr.get::doApiReq
         *
         * Perform a `uga` API request If we are unable to retrieve the entry
         * from the cache. If a MegaPromise is passed as argument, we'll wait
         * for it to complete before firing the api rquest.
         *
         * settleFunction will be used to process the api result.
         *
         * @param {MegaPromise} promise Optional promise to wait for.
         */
        var doApiReq = function _doApiReq(promise) {
            if (promise instanceof MegaPromise) {
                promise.always(function() {
                    doApiReq();
                });
            }
            else {
                api_req({'a': 'uga', 'u': userhandle, 'ua': attribute}, myCtx);
            }
        };

        // check the cache first!
        attribCache.getItem(cacheKey)
            .fail(doApiReq)
            .done(function __attribCacheGetDone(v) {
                var result;

                try {
                    var res = JSON.parse(v);

                    if ($.isArray(res)) {
                        var exp = res[1];

                        // Pick the cached entry as long it has no expiry or it hasn't expired
                        if (!exp || exp > (unixtime() - ATTRIB_CACHE_NON_CONTACT_EXP_TIME)) {
                            result = res[0];
                        }
                    }
                }
                catch (ex) {
                    logger.error(ex);
                }

                if (result === undefined) {
                    doApiReq(attribCache.removeItem(cacheKey));
                }
                else {
                    settleFunctionDone(result, true);
                }
            });

        return thePromise;
    };

    /**
     * Removes a user attribute for oneself.
     *
     * @param attribute {string}
     *     Name of the attribute.
     * @param pub {bool}
     *     True for public attributes (default: true).
     * @param nonHistoric {bool}
     *     True for non-historic attributes (default: false).  Non-historic
     *     attributes will overwrite the value, and not retain previous
     *     values on the API server.
     * @return {MegaPromise}
     *     A promise that is resolved when the original asynch code is settled.
     */
    ns.remove = function _removeUserAttribute(attribute, pub, nonHistoric) {
        attribute = buildAttribute(attribute, pub, nonHistoric);
        var cacheKey = buildCacheKey(u_handle, attribute);
        var promise = new MegaPromise();

        attribCache.removeItem(cacheKey)
            .always(function() {
                api_req({'a': 'upr', 'ua': attribute}, {
                    callback: function(res) {
                        if (typeof res !== 'number' || res < 0) {
                            logger.warn('Error removing user attribute "%s", result: %s!', attribute, res);
                            promise.reject(res);
                        }
                        else {
                            logger.info('Removed user attribute "%s", result: ' + res, attribute);
                            promise.resolve();
                        }
                    }
                });
            });

        return promise;
    };

    /**
     * Stores a user attribute for oneself.
     *
     * @param attribute {string}
     *     Name of the attribute.
     * @param value {object}
     *     Value of the user attribute. Public properties are of type {string},
     *     private ones have to be an object with key/value pairs.
     * @param pub {bool}
     *     True for public attributes (default: true).
     * @param nonHistoric {bool}
     *     True for non-historic attributes (default: false).  Non-historic
     *     attributes will overwrite the value, and not retain previous
     *     values on the API server.
     * @param callback {function}
     *     Callback function to call upon completion (default: none). This callback
     *     function expects two parameters: the attribute `name`, and its `value`.
     *     In case of an error, the `value` will be undefined.
     * @param ctx {object}
     *     Context, in case higher hierarchies need to inject a context
     *     (default: none).
     * @param mode {integer}
     *     Encryption mode. One of BLOCK_ENCRYPTION_SCHEME (default: AES_GCM_12_16).
     * @return {MegaPromise}
     *     A promise that is resolved when the original asynch code is settled.
     *     Can be used to use promises instead of callbacks for asynchronous
     *     dependencies.
     */
    ns.set = function _setUserAttribute(attribute, value, pub, nonHistoric, callback, ctx, mode) {
        var myCtx = ctx || {};

        var savedValue = value;

        // Prepare all data needed for the call on the Mega API.
        if (mode === undefined) {
            mode = tlvstore.BLOCK_ENCRYPTION_SCHEME.AES_GCM_12_16;
        }

        attribute = buildAttribute(attribute, pub, nonHistoric);
        if (attribute[0] === '*') {
            // The value should be a key/value property container.
            // Let's encode and encrypt it.
            savedValue = base64urlencode(tlvstore.blockEncrypt(
                tlvstore.containerToTlvRecords(value), u_k, mode));
        }

        // Make the promise to execute the API code.
        var thePromise = new MegaPromise();

        var cacheKey = buildCacheKey(u_handle, attribute);

        // clear when the value is being sent to the API server, during that period
        // the value should be retrieved from the server, because of potential
        // race conditions
        attribCache.removeItem(cacheKey);

        function settleFunction(res) {
            if (typeof res !== 'number') {
                attribCache.setItem(cacheKey, JSON.stringify([value, 0]));

                logger.info('Setting user attribute "'
                            + attribute + '", result: ' + res);
                thePromise.resolve(res);
            }
            else {
                logger.warn('Error setting user attribute "'
                            + attribute + '", result: ' + res + '!');
                thePromise.reject(res);
            }

            // Finish off if we have a callback.
            if (callback) {
                callback(res, myCtx);
            }
        }

        // Assemble context for this async API request.
        myCtx.ua = attribute;
        myCtx.callback = settleFunction;

        // Fire it off.
        var apiCall = {'a': 'up', 'i': requesti};
        apiCall[attribute] = savedValue;
        api_req(apiCall, myCtx);

        return thePromise;
    };


    Object.defineProperty(mega, 'attr', {
        value: Object.freeze(ns)
    });
    ns = undefined;

})(this);

var attribCache = new IndexedDBKVStorage('attrib');

/**
 * Process action-packet for attribute updates.
 *
 * @param {String}  attrName        Attribute name
 * @param {String}  userHandle      User handle
 * @param {Boolean} ownActionPacket Whether the action-packet was issued by myself
 */
attribCache.uaPacketParser = function(attrName, userHandle, ownActionPacket) {
    var logger = MegaLogger.getLogger('account');
    var cacheKey = userHandle + "_" + attrName;

    logger.debug('uaPacketParser: Invalidating cache entry "%s"', cacheKey);

    var removeItemPromise = attribCache.removeItem(cacheKey);

    removeItemPromise
        .always(function _uaPacketParser() {
            if (ownActionPacket) {
                if (attrName === 'firstname'
                        || attrName === 'lastname') {

                    M.syncUsersFullname(userHandle);
                }
                else {
                    logger.warn('uaPacketParser: Unexpected attribute "%s"', attrName);
                }
            }
            else if (attrName === '+a') {
                avatars[userHandle] = undefined;
                M.avatars();
            }
            else if (attrName === '*!authring') {
                authring.getContacts('Ed25519');
            }
            else if (attrName === '*!authRSA') {
                authring.getContacts('RSA');
            }
            else if (attrName === '*!authCu255') {
                authring.getContacts('Cu25519');
            }
            else if (attrName === '+puEd255') {
                // pubEd25519 key was updated!
                // force fingerprint regen.
                delete pubEd25519[userHandle];
                crypt.getPubEd25519(userHandle);
            }
            else {
                logger.debug('uaPacketParser: No handler for "%s"', attrName);
            }
        });

    return removeItemPromise;
};
