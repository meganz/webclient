// global variables holding the user's identity
// (moved to nodedec.js)
var u_p; // prepared password
var u_attr; // attributes

/* jshint -W098 */  // It is used in another file
// log in
// returns user type if successful, false if not
// valid user types are: 0 - anonymous, 1 - email set, 2 - confirmed, but no RSA, 3 - complete
function u_login(ctx, email, password, uh, pinCode, permanent) {
    var keypw;

    ctx.result = u_login2;
    ctx.permanent = permanent;

    keypw = prepare_key_pw(password);

    api_getsid(ctx, email, keypw, uh, pinCode);
}
/* jshint +W098 */

function u_login2(ctx, ks) {
    if (ks !== false) {
        sessionStorage.signinorup = 1;
        security.login.rememberMe = !!ctx.permanent;
        security.login.loginCompleteCallback = (res) => {
            ctx.checkloginresult(ctx, res);
            ctx = ks = undefined;
        };
        security.login.setSessionVariables(ks);
    }
    else {
        ctx.checkloginresult(ctx, false);
    }
}

// if no valid session present, return ENOENT if force == false, otherwise create anonymous account and return 0 if
// successful or ENOENT if error; if valid session present, return user type
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
        api_getsid(ctx, u, ctx.passwordkey, ctx.uh); // if ctx.uh is defined --> we need it fo "us"
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
        ctx.checkloginresult(ctx, r);
    }
    else {
        u_attr = res;
        var exclude = [
            'aav', 'aas', 'b', 'c', 'currk', 'email', 'flags', 'ipcc', 'k', 'lup',
            'mkt', 'name', 'p', 'privk', 'pubk', 's', 'since', 'smsv', 'ts', 'u', 'ut', 'uspw'
        ];

        for (var n in u_attr) {
            if (exclude.indexOf(n) === -1 && n[0] !== '*') {
                try {
                    u_attr[n] = from8(base64urldecode(u_attr[n]));
                } catch (e) {
                    u_attr[n] = base64urldecode(u_attr[n]);
                }
            }
        }

        // IP geolocation debuggging
        if (d && sessionStorage.ipcc) {
            u_attr.ipcc = sessionStorage.ipcc;
        }

        u_storage.handle = u_handle = u_attr.u;

        delete u_attr.u;
        Object.defineProperty(u_attr, 'u', {
            value: u_handle,
            writable: false,
            configurable: false
        });

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

        if (typeof u_attr.ut !== 'undefined') {
            localStorage.apiut = u_attr.ut;
        }
        u_attr.flags = Object(u_attr.flags);

        Object.defineProperty(u_attr, 'fullname', {
            get: function() {
                var name = this.firstname || '';
                if (this.lastname) {
                    name += (name.length ? ' ' : '') + this.lastname;
                }
                return String(name || this.name || '').trim();
            }
        });

        // If their PRO plan has expired and Last User Payment info is set, configure the dialog
        if (typeof alarm !== 'undefined' && u_attr.lup !== undefined && !is_mobile) {
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

        // Notify session resumption.
        mBroadcaster.sendMessage('login2', r);

        // Notify flags availability.
        mBroadcaster.sendMessage('global-mega-flags', u_attr.flags);

        // If they have seen some Public Service Announcement before logging in and saved that in localStorage, now
        // after logging in, send that to the API so that they don't see the same PSA again. The API will retain the
        // highest PSA number if there is a difference.
        if (typeof psa !== 'undefined') {
            psa.updateApiWithLastPsaSeen(u_attr['^!lastPsa']);
        }

        setCookie('logged', '1');

        if (r === 3) {
            document.body.classList.add('logged');
            document.body.classList.remove('not-logged');
        }

        // Recovery key has been saved
        if (localStorage.recoverykey) {
            document.body.classList.add('rk-saved');
        }

        (window.M && typeof M.getPersistentData === 'function' ? M.getPersistentData('e++ck') : Promise.reject())
            .then((data) => {
                if (r < 3) {
                    assert(!u_attr.privk, 'a privk is set.');
                    assert(u_attr.u === data.u, 'found another e++ account.');
                    window.is_eplusplus = true;
                    return;
                }
                onIdle(() => eventlog(99746, true));

                // Former E++ account user.
                window.is_eplusplus = false;
                return M.getPersistentDataEntries('e++', true)
                    .then((records) => {
                        if (d) {
                            console.debug('Migrating E++ account records...', records);
                        }

                        const pfx = 'e++ua!';
                        const keys = Object.keys(records);

                        for (let i = keys.length; i--;) {
                            const key = keys[i];

                            if (key.startsWith(pfx)) {
                                attribCache.setItem(key.substr(pfx.length), records[key]);
                            }
                            M.delPersistentData(key);
                        }
                    });
            })
            .always(() => {
                // there was a race condition between importing and business accounts creation.
                // in normal users there's no problem, however in business the user will be disabled
                // till they pay. therefore, if the importing didnt finish before 'upb' then the importing
                // will fail.
                if (r > 2 && !is_embed) {
                    mBroadcaster.crossTab.initialize(() => ctx.checkloginresult(ctx, r));
                }
                else if ($.createanonuser === u_attr.u) {
                    M.importWelcomePDF().always(() => ctx.checkloginresult(ctx, r));
                    delete $.createanonuser;
                }
                else {
                    ctx.checkloginresult(ctx, r);
                }
            });
    }
}

// validate user session.
async function u_checklogin4(sid) {
    'use strict';

    console.assert(!u_sid || u_type);
    console.assert(u_storage === localStorage || u_storage === sessionStorage);

    u_storage.sid = u_sid = sid;
    api_setsid(u_sid || false);
    delay.cancel('overquota:retry');

    // let's use M.req()'s deduplication capability in case of concurrent callers..
    const ug = await Promise.resolve(M.req('ug')).catch(echo);

    const res = await promisify(resolve => {
        u_checklogin3a(ug, {
            checkloginresult: (ctx, r) => resolve(r)
        });
    })();

    if (res >= 0) {
        if (window.n_h) {
            // set new sid under folder-links
            api_setfolder(n_h);

            // hide ephemeral account warning
            if (typeof alarm !== 'undefined') {
                alarm.hideAllWarningPopups();
            }
        }
        u_type = res;
        u_checked = true;
        onIdle(topmenuUI);
        if (typeof dlmanager === 'object') {
            dlmanager.setUserFlags();
            delay('overquota:retry', () => dlmanager._onOverQuotaAttemptRetry(sid));
        }
        return res;
    }

    u_storage.sid = u_sid = undefined;
    throw new SecurityError('Invalid Session, ' + res);
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

        delete localStorage.voucher;
        delete sessionStorage.signinorup;
        localStorage.removeItem('signupcode');
        localStorage.removeItem('registeremail');

        fminitialized = false;
        if (typeof mDBcls === 'function') {
            mDBcls(); // close fmdb
        }

        if (logout !== -0xDEADF) {
            watchdog.notify('logout');
        }
        else {
            watchdog.clear();
        }

        if (typeof slideshow === 'function') {
            slideshow(0, 1);
        }

        if (typeof notify === 'object') {
            notify.notifications = [];
        }

        mBroadcaster.crossTab.leave();
        u_sid = u_handle = u_k = u_attr = u_privk = u_k_aes = undefined;
        api_setsid(false);
        u_sharekeys = {};
        u_type = false;
        loggedout = true;
        // setCookie('logged');
        $('#fmholder').text('').attr('class', 'fmholder');
        if (window.MegaData) {
            M = new MegaData();
        }
        $.hideContextMenu = function () {};
        api_reset();
        if (waitxhr) {
            waitxhr.abort();
            waitxhr = undefined;
        }

        if (window.loadfm) {
            loadfm.loaded = false;
        }

        mBroadcaster.sendMessage('logout');
    }
}

// true if user was ever logged in with a non-anonymous account
function u_wasloggedin() {
    return localStorage.wasloggedin;
}

// set user's RSA key
function u_setrsa(rsakey) {
    var $promise = new MegaPromise();

    // performance optimization. encode keys once
    var privateKeyEncoded = crypto_encodeprivkey(rsakey);
    var publicKeyEncodedB64 = base64urlencode(crypto_encodepubkey(rsakey));
    var buinessMaster;
    var buinsesPubKey;

    var request = {
        a: 'up',
        privk: a32_to_base64(encrypt_key(u_k_aes,
            str_to_a32(privateKeyEncoded))),
        pubk: publicKeyEncodedB64
    };

    if (!window.businessSubAc && localStorage.businessSubAc) {
        window.businessSubAc = JSON.parse(localStorage.businessSubAc);
    }

    // checking if we are creating keys for a business sub-user
    if (window.businessSubAc) {
        // we get current user's master user + its public key (master user pubkey)
        buinessMaster = window.businessSubAc.bu;
        buinsesPubKey = window.businessSubAc.bpubk;


        // now we will encrypt the current user master-key using master-user public key. and include it in 'up' request
        // because master-user must be aware of evey sub-user's master-key.
        var subUserMasterKey = a32_to_str(u_k);

        var masterAccountRSA_keyPub;
        if (typeof buinsesPubKey === 'string') {
            masterAccountRSA_keyPub = crypto_decodepubkey(base64urldecode(buinsesPubKey));
        }
        else {
            masterAccountRSA_keyPub = buinsesPubKey;
        }
        var subUserMasterKeyEncRSA = crypto_rsaencrypt(subUserMasterKey, masterAccountRSA_keyPub);
        var subUserMasterKeyEncRSA_B64 = base64urlencode(subUserMasterKeyEncRSA);

        request.mk = subUserMasterKeyEncRSA_B64;

    }

    var ctx = {
        callback: function (res, ctx) {
            if (window.d) {
                console.log("RSA key put result=" + res);
            }

            if (res < 0) {
                var onError = function(message, ex) {
                    var submsg = l[135] + ': ' + (ex < 0 ? api_strerror(ex) : ex);

                    console.warn('Unexpected RSA key put failure!', ex);
                    msgDialog('warninga', '', message, submsg, M.logout.bind(M));
                    $promise.reject(ex);
                };

                // Check whether this is a business sub-user attempting to confirm the account.
                if (res === EARGS && !window.businessSubAc) {
                    M.req('ug').then(function(u_attr) {
                        if (u_attr.b && u_attr.b.m === 0 && u_attr.b.bu) {
                            crypt.getPubKeyAttribute(u_attr.b.bu, 'RSA')
                                .then(function(res) {
                                    window.businessSubAc = {bu: u_attr.b.bu, bpubk: res};
                                    mBroadcaster.once('fm:initialized', M.importWelcomePDF);
                                    $promise.linkDoneAndFailTo(u_setrsa(rsakey));
                                })
                                .catch(onError.bind(null, l[22897]));
                        }
                        else {
                            onError(l[47], res);
                        }
                    }).catch(onError.bind(null, l[47]));
                }
                else {
                    // Something else happened, hang the procedure and start over...
                    onError(l[47], res);
                }

                return;
            }

            u_privk = rsakey;
            // If coming from a #confirm link in the new registration process and logging in from a clean browser
            // session the u_attr might not be set to an object yet, this will prevent an exception below
            if (typeof u_attr === 'undefined') {
                u_attr = {};
            }
            u_attr.privk = u_storage.privk = base64urlencode(privateKeyEncoded);
            u_attr.pubk = u_storage.pubk = publicKeyEncodedB64;

            // Update u_attr and store user data on account activation
            u_checklogin({
                checkloginresult: function(ctx, r) {
                    const assertMsg = `Invalid activation procedure (${parseInt(r)}:${request.mk ? 1 : 0}) :skull:`;

                    u_type = r;
                    if (ASSERT(u_type === 3, assertMsg)) {
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

                        // Recovery Key Onboarding improvements
                        // Show newly registered user the download recovery key dialog.
                        M.onFileManagerReady(function() {
                            M.showRecoveryKeyDialog(1);

                            if ('csp' in window) {
                                const storage = localStorage;
                                const value = storage[`csp.${u_handle}`];

                                if (storage.csp && value !== storage.csp) {
                                    csp.init().then((shown) => !shown && csp.showCookiesDialog('nova'));
                                }
                            }

                            mega.config.set('dlThroughMEGAsync', 1);
                        });

                        // free up memory since it's not useful any longer
                        delete window.businessSubAc;
                        delete localStorage.businessSubAc;
                    }

                    if (u_attr['^!promocode']) {
                        try {
                            var data = JSON.parse(u_attr['^!promocode']);

                            if (data[1] !== -1) {
                                localStorage[data[0]] = data[1];
                            }
                            localStorage.voucher = data[0];
                        }
                        catch (ex) {
                            console.error(ex);
                        }
                    }
                    mBroadcaster.sendMessage('trk:event', 'account', 'regist', u_attr.b ? 'bus' : 'norm', u_type);

                    $promise.resolve(rsakey);
                    ui_keycomplete();
                }
            });
        }
    };

    api_req(request, ctx);

    return $promise;
}

function u_eplusplus(firstName, lastName) {
    'use strict';
    return new Promise((resolve, reject) => {
        if (window.u_k || window.u_type !== false || window.u_privk) {
            return reject(EEXIST);
        }

        u_storage = init_storage(localStorage);
        u_checklogin({
            checkloginresult: tryCatch((u_ctx, r) => {
                if (r !== 0) {
                    if (d) {
                        console.warn('Unexpected E++ account procedure...', r);
                    }
                    return reject(r);
                }
                if (u_attr.privk) {
                    return reject(u_attr.u);
                }
                u_type = r;

                var data = {
                    u: u_attr.u,
                };
                M.setPersistentData('e++ck', data)
                    .then(() => {
                        return Promise.allSettled([
                            mega.attr.set(
                                'firstname', base64urlencode(to8(firstName)), -1, false
                            ),
                            mega.attr.set(
                                'lastname', base64urlencode(to8(lastName)), -1, false
                            )
                        ]);
                    })
                    .then(() => {
                        process_u([{c: 0, u: u_attr.u}]);
                        return authring.initAuthenticationSystem();
                    })
                    .then(() => {
                        // Update top menu controls (Logout)
                        onIdle(() => topmenuUI());
                        onIdle(() => eventlog(99744));

                        is_eplusplus = true;
                        resolve(u_attr.u);
                    })
                    .catch(reject);
            }, reject)
        }, true);
    });
}

// Save user's Recovery/Master key to disk
function u_savekey() {
    'use strict';
    return u_exportkey(true);
}

/**
 * Copy/Save user's Recovery/Master key
 * @param {Boolean|String} action save to disk if true, otherwise copy to clipboard - if string show a toast
 */
function u_exportkey(action) {
    'use strict';
    var key = a32_to_base64(window.u_k || '');

    if (action === true) {
        M.saveAs(key, M.getSafeName(l[20830]) + '.txt');
    }
    else if (page === 'keybackup') {
        copyToClipboard(key, l[8836], 'recoveryKey');
    }
    else {
        copyToClipboard(key, typeof action === 'string' && action);
    }

    mBroadcaster.sendMessage('keyexported');

    if (!localStorage.recoverykey) {
        localStorage.recoverykey = 1;
        $('body').addClass('rk-saved');
    }
}

// ensures that a user identity exists, also sets sid
function createanonuser(ctx, passwordkey, invitecode, invitename, uh) {
    ctx.callback = createanonuser2;

    ctx.passwordkey = passwordkey;

    api_createuser(ctx, invitecode, invitename, uh);

    // Forget whether the user was logged-in creating an ephemeral account.
    delete localStorage.wasloggedin;
}

function createanonuser2(u, ctx) {
    if (u === false || !(localStorage.p = ctx.passwordkey) || !(localStorage.handle = u)) {
        u = false;
    }

    $.createanonuser = u;
    ctx.createanonuserresult(ctx, u);
}

/**
 * Check if the password is the user's password without doing any API call. It tries to decrypt the user's key.
 *
 * @param {Array} derivedEncryptionKeyArray32 The derived encryption key from the Password Processing Function
 * @returns {Boolean} Whether the password is correct or not
 */
function checkMyPassword(derivedEncryptionKeyArray32) {

    'use strict';

    // Create SJCL cipher object
    var derivedEncryptionKeyCipherObject = new sjcl.cipher.aes(derivedEncryptionKeyArray32);

    // Decrypt the Master Key using the Derived Encryption Key
    var encryptedMasterKeyArray32 = base64_to_a32(u_attr.k);
    var decryptedMasterKeyArray32 = decrypt_key(derivedEncryptionKeyCipherObject, encryptedMasterKeyArray32);
    var decryptedMasterKeyString = decryptedMasterKeyArray32.join(',');

    // Convert the in memory copy of the unencrypted Master Key to string for comparison
    var masterKeyStringToCompare = u_k.join(',');

    // Compare the decrypted Master Key to the stored unencrypted Master Key
    return decryptedMasterKeyString === masterKeyStringToCompare;
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
    'use strict';
    return !window.u_privk && window.u_attr && (u_attr.p >= 1 || u_attr.p <= 4);
}

function isEphemeral() {
    return !is_eplusplus && u_type !== false && u_type < 3;
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


/**
 * A reusable function that is used for processing locally/3rd party email change
 * action packets.
 *
 * @param ap {Object} the actual 'se' action packet
 */
function processEmailChangeActionPacket(ap) {
    // set email
    var emailChangeAccepted = (ap.s === 3 && typeof ap.e === 'string' && ap.e.indexOf('@') !== -1);

    if (emailChangeAccepted) {
        var user = M.getUserByHandle(ap.u);

        if (user) {
            user.m = ap.e;
            process_u([user]);

            if (ap.u === u_handle) {
                u_attr.email = user.m;

                if (M.currentdirid === 'account/profile') {
                    $('.nw-fm-left-icon.account').trigger('click');
                }
            }
        }
        // update the underlying fmdb cache
        M.addUser(user);

        // in case of business master
        // first, am i a master?
        if (u_attr && u_attr.b && u_attr.b.m) {
            // then, do i have this user as sub-user?
            if (M.suba && M.suba[ap.u]) {
                M.require('businessAcc_js', 'businessAccUI_js').done(
                    function () {
                        var business = new BusinessAccount();
                        var sub = M.suba[ap.u];
                        sub.e = ap.e;
                        if (sub.pe) {
                            delete sub.pe;
                        }
                        business.parseSUBA(sub, false, true);
                    }
                );
            }
        }
    }
    else {
        // if the is business master we might accept other cases
        if (u_attr && u_attr.b && u_attr.b.m) {
            // then, do i have this user as sub-user?
            if (M.suba && M.suba[ap.u]) {
                var stillOkEmail = (ap.s === 2 && typeof ap.e === 'string' && ap.e.indexOf('@') !== -1);
                if (stillOkEmail) {
                    M.require('businessAcc_js', 'businessAccUI_js').done(
                        function () {
                            var business = new BusinessAccount();
                            var sub = M.suba[ap.u];
                            sub.pe = { e: ap.e, ts: ap.ts };
                            business.parseSUBA(sub, false, true);
                        }
                    );
                }
            }
        }
    }
}

/**
 * Contains a list of permitted landing pages.
 * @var {array} allowedLandingPages
 */
var allowedLandingPages = ['fm', 'recents', 'chat'];

/**
 * Fetch the landing page.
 * @return {string|int} The user selected landing page.
 */
function getLandingPage() {
    'use strict';
    return pfid ? false : allowedLandingPages[mega.config.get('uhp')] || 'fm';
}

/**
 * Set the landing page.
 * @param {string} page The user selected landing page from the `allowedLandingPages` array.
 * @return {void}
 */
function setLandingPage(page) {
    'use strict';
    var index = allowedLandingPages.indexOf(page);
    mega.config.set('uhp', index < 0 ? 0 : index);
}

(function(exportScope) {
    "use strict";
    var _lastUserInteractionCache = {};
    var _lastUserInteractionCacheInFlight = {};
    var _lastUserInteractionPromiseCache = {};

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

    var throttledSetLastInteractionOps = [];
    var timerSetLastInteraction = null;
    var SET_LAST_INTERACTION_TIMER = 1 * 60 * 1000;

    /**
     * Returns a promise which will be resolved with a string, formatted like this "$typeOfInteraction:$timestamp"
     * Where $typeOfInteraction can be:
     *  - 0 - cloud drive/sharing
     *  - 1 - chat
     *
     * @param u_h {String}
     * @param triggeredBySet {boolean}
     * @returns {MegaPromise}
     */
    var getLastInteractionWith = function (u_h, triggeredBySet, noRender) {
        console.assert(u_handle, "missing u_handle, can't proceed");
        console.assert(u_h, "missing argument u_h, can't proceed");

        if (!u_handle || !u_h) {
            return MegaPromise.reject(EARGS);
        }

        var _renderLastInteractionDone = noRender ? nop : function (r) {
            r = r.split(":");

            var ts = parseInt(r[1], 10);

            if (M.u[u_h]) {
                M.u[u_h].ts = ts;
            }

            if (triggeredBySet) {
                return;
            }

            var $elem = $('.li_' + u_h);

            $elem
                .removeClass('never')
                .removeClass('cloud-drive')
                .removeClass('conversations')
                .removeClass('unread-conversations');


            if (r[0] === "0") {
                $elem.addClass('cloud-drive');
            }
            else if (r[0] === "1" && megaChatIsReady) {
                var room = megaChat.getPrivateRoom(u_h);
                if (room && megaChat.plugins && megaChat.plugins.chatNotifications) {
                    if (megaChat.plugins.chatNotifications.notifications.getCounterGroup(room.roomId) > 0) {
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
            if (time2last(ts)) {
                $elem.text(
                    time2last(ts)
                );
            }
            else {
                $elem.text(l[1051]);
            }

            if (M.getTreePanelSortingValue('contacts') === 'last-interaction') {
                // we need to resort
                M.contacts();
            }
        };

        var _renderLastInteractionFail = noRender ? nop : function (r) {
            var $elem = $('.li_' + u_h);

            $elem
                .removeClass('never')
                .removeClass('cloud-drive')
                .removeClass('conversations')
                .removeClass('unread-conversations');


            $elem.addClass('never');
            $elem.text(l[1051]);
        };

        var $promise = new MegaPromise();

        $promise
            .done(_renderLastInteractionDone)
            .fail(_renderLastInteractionFail);

        if (_lastUserInteractionCacheInFlight[u_h] && _lastUserInteractionCacheInFlight[u_h] !== -1) {
            $promise.resolve(_lastUserInteractionCacheInFlight[u_h]);
        }
        else if (
            _lastUserInteractionPromiseCache[u_h] &&
            _lastUserInteractionPromiseCache[u_h].state() === 'pending'
        ) {
            return _lastUserInteractionPromiseCache[u_h];
        }
        else if (_lastUserInteractionCache[u_h] && _lastUserInteractionCacheInFlight[u_h] !== -1) {
            $promise.resolve(_lastUserInteractionCache[u_h]);
        }
        else if (
            (!_lastUserInteractionCache[u_h] || _lastUserInteractionCacheInFlight[u_h] === -1) &&
            (
                !_lastUserInteractionPromiseCache[u_h] ||
                _lastUserInteractionPromiseCache[u_h].state() !== 'pending'
            )
        ) {
            if (_lastUserInteractionCacheInFlight[u_h] === -1) {
                delete _lastUserInteractionCacheInFlight[u_h];
            }
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
                            if (!triggeredBySet) {
                                _lastUserInteractionCache[u_h] = res;
                            }
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

    /**
     * Set the last interaction for a contact (throttled internally)
     *
     * @param u_h {String} user handle
     * @param v {String} "$typeOfInteraction:$unixTimestamp" (see getLastInteractionWith for the types of int...)
     * @returns {Deferred}
     */
    var _realSetLastInteractionWith = function (u_h, v) {

        console.assert(u_handle, "missing u_handle, can't proceed");
        console.assert(u_h, "missing argument u_h, can't proceed");

        if (!u_handle || !u_h) {
            return MegaPromise.reject(EARGS);
        }

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


        getLastInteractionWith(u_h, true)
            .done(function (timestamp) {
                if (_compareLastInteractionStamp(v, timestamp) === false) {
                    // older timestamp found in `v`, resolve the promise with the latest timestamp
                    $promise.resolve(v);
                    $promise.verify();
                }
                else {
                    _lastUserInteractionCache[u_h] = v;

                    $promise.resolve(_lastUserInteractionCache[u_h]);

                    // TODO: check why `M.u[u_h]` might not be set...
                    Object(M.u[u_h]).ts = parseInt(v.split(":")[1], 10);

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
                        true
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
     * Internal method that flushes all queued setLastInteraction operations in one go.
     * Usually triggered by `setLastInteractionWith`
     *
     * @private
     */
    var _flushSetLastInteractionWith = function() {
        timerSetLastInteraction = null;

        for (var i = throttledSetLastInteractionOps.length - 1; i >= 0; i--) {
            var op = throttledSetLastInteractionOps[i];
            throttledSetLastInteractionOps.splice(i, 1);
            _lastUserInteractionCacheInFlight[op[0]] = -1;
            op[2].linkDoneAndFailTo(_realSetLastInteractionWith(op[0], op[1]));
        }
    };


    /**
     * Set the last interaction for a contact (throttled internally)
     *
     * @param u_h {String} user handle
     * @param v {String} "$typeOfInteraction:$unixTimestamp" (see getLastInteractionWith for the types of int...)
     * @returns {Deferred|MegaPromise}
     */
    var setLastInteractionWith = function(u_h, v) {
        var promise = new MegaPromise();

        // set on client side, to simulate a real commit
        var ts = Object(M.u[u_h]).ts;
        var newTs = parseInt(v.split(":")[1], 10);
        if (ts < newTs) {
            Object(M.u[u_h]).ts = newTs;
            _lastUserInteractionCacheInFlight[u_h] = v;
        }

        if (timerSetLastInteraction) {
            clearTimeout(timerSetLastInteraction);
        }
        timerSetLastInteraction = setTimeout(_flushSetLastInteractionWith, SET_LAST_INTERACTION_TIMER);

        for (var i = 0; i < throttledSetLastInteractionOps.length; i++) {
            var entry = throttledSetLastInteractionOps[i];
            var u_h2 = entry[0];
            var ts2 = parseInt(entry[1].split(":")[1], 10);

            if (u_h2 === u_h) {
                if (newTs < ts2) {
                    return MegaPromise.resolve(entry[1]);
                }
                else {
                    entry[1] = v;
                    return entry[2];
                }

            }
        }
        throttledSetLastInteractionOps.push([u_h, v, promise]);

        return promise;
    };

    exportScope.setLastInteractionWith = setLastInteractionWith;
    exportScope.getLastInteractionWith = getLastInteractionWith;
})(window);
