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
        var exclude = ['c', 'email', 'k', 'name', 'p', 'privk', 'pubk', 's', 'ts', 'u', 'currk'];

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

        if (!u_attr.email) {
            r = 0;
        }
        else if (!u_attr.c) {
            r = 1;
        }
        else if (!u_attr.privk) {
            r = 2;
        }
        else {
            r = 3;
        }

        if (r == 3) {
            // Load/initialise the authentication system.
            u_initAuthentication();
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
        a[i].removeItem('randseed');
    }

    if (logout) {
        if (!MegaChatDisabled) {

            localStorage.removeItem("audioVideoScreenSize");

            if (megaChat.is_initialized) {
                megaChat.destroy( /* isLogout: */ true).always(function () {
                    window.megaChat = new Chat();
                    localStorage.removeItem("megaChatPresence");
                    localStorage.removeItem("megaChatPresenceMtime");
                });

                localStorage.removeItem("megaChatPresence");
                localStorage.removeItem("megaChatPresenceMtime");
            }
        }

        delete localStorage.signupcode;
        delete localStorage.registeremail;
        if (mDBact) {
            mDBact = false;
            delete localStorage[u_handle + '_mDBactive'];
        }
        if (typeof mDBcls === 'function') {
            mDBcls(); // resets mDBloaded
        }
        fminitialized = false;
        mBroadcaster.crossTab.leave();
        u_sid = u_handle = u_k = u_attr = u_privk = u_k_aes = undefined;
        notifyPopup.notifications = null;
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
        $.each(Object.keys(M.u), function (k, v) {
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

/**
 * Retrieves a user attribute.
 *
 * @param userhandle {string}
 *     Mega's internal user handle.
 * @param attribute {string}
 *     Name of the attribute.
 * @param pub {bool}
 *     True for public attributes (default: true).
 * @param nonHistoric {bool}
 *     True for non-historic attributes (default: false).  Non-historic
 *     attributes will overwrite the value, and not retain previous
 *     values on the API server.
 * @param callback {function}
 *     Callback function to call upon completion (default: none).
 * @param ctx {object}
 *     Context, in case higher hierarchies need to inject a context
 *     (default: none).
 * @return {MegaPromise}
 *     A promise that is resolved when the original asynch code is settled.
 *     Can be used to use promises instead of callbacks for asynchronous
 *     dependencies.
 */
function getUserAttribute(userhandle, attribute, pub, nonHistoric,
                          callback, ctx) {
    var myCtx = ctx || {};

    // Assemble property name on Mega API.
    var attributePrefix = '';
    if (pub === true || pub === undefined) {
        attributePrefix = '+';
    }
    else {
        attributePrefix = '*';
    }
    if (nonHistoric === true || nonHistoric === 1) {
        attributePrefix += '!';
    }
    attribute = attributePrefix + attribute;

    // Make the promise to execute the API code.
    var thePromise = new MegaPromise();

    function settleFunction(res) {
        if (typeof res !== 'number') {
            // Decrypt if it's a private attribute container.
            if (attribute.charAt(0) === '*') {
                var clearContainer = tlvstore.blockDecrypt(base64urldecode(res),
                                                           u_k);
                res = tlvstore.tlvRecordsToContainer(clearContainer);
            }
            if (window.d) {
                console.log('Attribute "' + attribute + '" for user "'
                            + userhandle + '" is "' + res + '".');
            }
            thePromise.resolve(res);
        }
        else {
            // Got back an error (a number).
            if (window.d) {
                console.log('Warning, attribute "' + attribute
                            + '" for user "' + userhandle
                            + '" could not be retrieved: ' + res + '!');
            }
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

    // Fire it off.
    api_req({'a': 'uga', 'u': userhandle, 'ua': attribute}, myCtx);

    return thePromise;
}

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
 *     Encryption mode. One of BLOCK_ENCRYPTION_SCHEME (default: AES_CCM_12_16).
 * @return {MegaPromise}
 *     A promise that is resolved when the original asynch code is settled.
 *     Can be used to use promises instead of callbacks for asynchronous
 *     dependencies.
 */
function setUserAttribute(attribute, value, pub, nonHistoric, callback, ctx,
                          mode) {
    var myCtx = ctx || {};

    // Prepare all data needed for the call on the Mega API.
    if (mode === undefined) {
        mode = tlvstore.BLOCK_ENCRYPTION_SCHEME.AES_GCM_12_16;
    }
    if (nonHistoric === true || nonHistoric === 1) {
        attribute = '!' + attribute;
    }
    if (pub === true || pub === undefined) {
        attribute = '+' + attribute;
    }
    else {
        attribute = '*' + attribute;
        // The value should be a key/value property container. Let's encode and
        // encrypt it.
        value = base64urlencode(tlvstore.blockEncrypt(
            tlvstore.containerToTlvRecords(value), u_k, mode));
    }

    // Make the promise to execute the API code.
    var thePromise = new MegaPromise();

    function settleFunction(res) {
        if (typeof res !== 'number') {
            console.log('Setting user attribute "'
                        + attribute + '", result: ' + res);
            thePromise.resolve(res);
        }
        else {
            console.log('Error setting user attribute "'
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
    var apiCall = {'a': 'up'};
    apiCall[attribute] = value;
    api_req(apiCall, myCtx);

    return thePromise;
}

function isNonActivatedAccount() {
    return (!u_privk && typeof (u_attr.p) !== 'undefined'
            && (u_attr.p >= 1 || u_attr.p <= 4));
}

function isEphemeral() {
    return (u_type === 0);
}


var _lastUserInteractionCache = {};
var _lastUserInteractionGetRequests = {};

var _getLastInteractionAttribKey = function(u_h) {
    assert(u_h, "missing argument u_h, can't proceed");

    return "li_" + u_h;
};

var setLastInteractionWith = function(u_h, v) {
    assert(u_handle, "missing u_handle, can't proceed");
    assert(u_h, "missing argument u_h, can't proceed");

    var k = _getLastInteractionAttribKey(u_h);

    var isDone = false;
    var $promise = createTimeoutPromise(
        function() {
            return isDone === true;
        },
        500,
        10000
    );

    var tsNew = parseInt(v.split(":")[1], 10);

    if (!_lastUserInteractionCache[u_h]) {
        getLastInteractionWith(u_h)
            .done(function(r) {
                var tsOld = parseInt(r.split(":")[1], 10);
                if (tsOld >= tsNew)  {
                    //console.error("tsOld > tsNew, can't set li to dates in the past.");
                    // ^^ mainly triggered by notifications.

                    $promise.resolve(r);
                } else {
                    setLastInteractionWith(u_h, v)
                        .done(function() { $promise.resolve.apply($promise, arguments); })
                        .fail(function() { $promise.reject.apply($promise, arguments); });
                }
            })
            .fail(function(e) {
                $promise.reject(e);
            });

        return $promise;
    } else {
        var tsOld = parseInt(_lastUserInteractionCache[u_h].split(":")[1], 10);
        if (tsOld > tsNew)  {
            //console.error("tsOld > tsNew, can't set li to dates in the past.");
            // ^^ mainly triggered by notifications.

            $promise.resolve(_lastUserInteractionCache[u_h]);
            return $promise;
        }
    }

    _lastUserInteractionCache[u_h] = v;

    setUserAttribute(
        k,
        {'': v}, // as advised by Guy, this is the format that we should use when we want to store strings in attributes
        false,
        true,
        function() {
            isDone = true;
            $promise.resolve(_lastUserInteractionCache[u_h]);
            $promise.verify();
        }
    );

    return $promise;
};
var getLastInteractionWith = function(u_h) {
    assert(u_handle, "missing u_handle, can't proceed");
    assert(u_h, "missing argument u_h, can't proceed");

    var k = _getLastInteractionAttribKey(u_h);

    var _renderLastInteractionDone = function(r) {
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
        } else if (r[0] === "1" && megaChat) {
            M.u[u_h].lastChatActivity = ts;
            var room = megaChat.getPrivateRoom(u_h);
            if (room && megaChat && megaChat.plugins && megaChat.plugins.chatNotifications) {
                if (megaChat.plugins.chatNotifications.notifications.getCounterGroup(room.roomJid) > 0) {
                    $elem.addClass('unread-conversations');
                } else {
                    $elem.addClass('conversations');
                }
            } else {
                $elem.addClass('conversations');
            }
        } else {
            $elem.addClass('never');
        }
        $elem.text(
            time2last(ts)
        );

        if ($.sortTreePanel.contacts.by === 'last-interaction') {
            M.contacts(); // we need to resort
        }
    };

    var _renderLastInteractionFail = function(r) {
        var $elem = $('.li_' + u_h);

        $elem
            .removeClass('never')
            .removeClass('cloud-drive')
            .removeClass('conversations')
            .removeClass('unread-conversations');


        $elem.addClass('never');
    };

    var $promise;
    if (_lastUserInteractionCache[u_h]) {
        $promise = MegaPromise.resolve(_lastUserInteractionCache[u_h]);

        $promise
            .done(_renderLastInteractionDone)
            .fail(_renderLastInteractionFail);

        return $promise;
    }
    if (_lastUserInteractionGetRequests[u_h] && _lastUserInteractionGetRequests[u_h].state() === 'pending') {
        return _lastUserInteractionGetRequests[u_h];
    }
    var isDone = false;
    $promise = createTimeoutPromise(
        function() {
            return isDone === true;
        },
        500,
        10000
    );

    getUserAttribute(
        u_handle,
        k,
        false,
        true,
        function(res, ctx) {
            if (typeof res !== 'number') {
                if (res && typeof(res['']) !== 'undefined') {
                    _lastUserInteractionCache[u_h] = res[''];
                    $promise.resolve(_lastUserInteractionCache[u_h]);
                    isDone = true;
                } else {
                    $promise.reject(res);
                    isDone = true;
                }
            } else {
                $promise.reject(res);
                isDone = true;
            }

        }
    );

    $promise
        .done(_renderLastInteractionDone)
        .fail(_renderLastInteractionFail)
        .always(function() {
            if (_lastUserInteractionGetRequests[u_h] === $promise) {
                delete _lastUserInteractionGetRequests[u_h];
            }
        });

    _lastUserInteractionGetRequests[u_h] = $promise;

    return $promise;
};
