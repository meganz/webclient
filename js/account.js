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
function u_checklogin(ctx, force, passwordkey, invitecode, invitename) {
    'use strict';

    if ((u_sid = u_storage.sid)) {
        api_setsid(u_sid);
        u_checklogin3(ctx);
    }
    else if (force) {
        u_logout();
        api_create_u_k();

        // Forget whether the user was logged-in creating an ephemeral account.
        delete localStorage.wasloggedin;

        ctx.passwordkey = passwordkey;
        api_createuser(ctx, invitecode, invitename)
            .then(({result}) => {
                assert(
                    typeof result === 'string'
                    && (localStorage.p = ctx.passwordkey)
                    && (localStorage.handle = result),
                    `Unexpected response (${result}), or state (${!!ctx.passwordkey})`
                );

                $.createanonuser = result;
                ctx.result = u_checklogin2;
                api_getsid(ctx, result, ctx.passwordkey, ctx.uh); // if ctx.uh is defined --> we need it for "us"

            })
            .catch((ex) => {
                console.error(ex);
                ctx.checkloginresult(ctx, false);
            });
    }
    else {
        ctx.checkloginresult(ctx, false);
    }
}

function u_checklogin2(ctx, ks) {
    'use strict';

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
    'use strict';
    var r = false;

    if (typeof res !== 'object') {
        u_logout();
        r = res;
        ctx.checkloginresult(ctx, r);
    }
    else {
        u_attr = res;

        // u_attr = new Proxy(res, {
        //     defineProperty(target, prop, descriptor) {
        //         console.warn('def', prop);
        //         return Reflect.defineProperty(target, prop, descriptor);
        //     },
        //     deleteProperty(target, prop) {
        //         console.warn('del', prop);
        //         return Reflect.deleteProperty(target, prop);
        //     },
        // });

        const exclude = new Set([
            'aav', 'aas', 'b', 'c', 'currk', 'email', 'flags', 'ipcc', 'k', 'lup', 'mkt',
            'name', 'p', 'pf', 'privk', 'pubk', 's', 'since', 'smsv', 'ts', 'u', 'ut', 'uspw'
        ]);

        for (var n in u_attr) {
            if (n[0] === '^') {
                u_attr[n] = base64urldecode(u_attr[n]);
            }
            else if (n[0] !== '*' && n[0] !== '+' && !exclude.has(n)) {
                let value = u_attr[n];

                if (typeof value === 'string') {
                    value = base64urldecode(value);
                    u_attr[n] = tryCatch(() => window.from8(value), false)() || value;
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

        const {s4} = u_attr;
        delete u_attr.s4;
        Object.defineProperty(u_attr, 's4', {
            value: !!s4,
            writable: false,
            configurable: false
        });

        init_storage(u_storage);

        if (u_storage.k) {
            const {k} = u_storage;
            u_k = tryCatch(() => JSON.parse(k), dump.bind(null, `Error parsing key(${k}):`))();
        }

        if (u_k) {
            u_k_aes = new sjcl.cipher.aes(u_k);
        }

        if (u_attr.privk) {
            u_privk = tryCatch(() => {
                return crypto_decodeprivkey(a32_to_str(decrypt_key(u_k_aes, base64_to_a32(u_attr.privk))));
            }, (ex) => {
                console.error('Error decoding private RSA key', ex);
            })();
        }

        if (typeof u_attr.ut !== 'undefined') {
            localStorage.apiut = u_attr.ut;
        }
        const {flags} = u_attr;

        delete u_attr.flags;
        Object.defineProperty(u_attr, 'flags', {
            configurable: true,
            value: freeze(flags || {})
        });

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

        if (r === 3) {
            document.body.classList.add('logged');
            document.body.classList.remove('not-logged');
        }

        // Recovery key has been saved
        if (localStorage.recoverykey) {
            document.body.classList.add('rk-saved');
        }

        const log99810 = async(ex, tag = 0) => {
            console.error(ex);

            if (!window.buildOlderThan10Days) {
                const msg = String(ex).trim().replace(/:\s+/, ': ').split('\n')[0];
                const stack = String(ex && ex.stack).trim().replace(/\s+/g, ' ').replace(msg, '').substr(0, 512);

                const payload = [
                    4,
                    msg,
                    stack,
                    tag | 0,
                    is_mobile | 0,
                    is_extension | 0,
                    buildVersion.website || 'dev'
                ];
                return eventlog(99810, JSON.stringify(payload));
            }
        };

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
            .catch((ex) => {
                if (ex instanceof Error) {
                    console.warn(ex);
                }
            })
            .then(() => {
                if (!r || is_iframed || pfid) {
                    // Nothing to do here.
                    return;
                }
                const page = getCleanSitePath();
                const pubLink = isPublicLink(page) || isPublickLinkV2(page);
                if (pubLink) {
                    // Nor here.
                    return;
                }

                const keys = u_attr['^!keys'];
                delete u_attr['^!keys'];

                if (mega.keyMgr.version > 0) {
                    if (d) {
                        console.warn('Key Manager already initialized, moving on.');
                    }
                    console.assert(window.u_checked, 'Unexpected KeyMgr state...', mega.keyMgr.generation);
                    return;
                }

                // We've got keys?
                if (keys) {
                    return mega.keyMgr.initKeyManagement(keys)
                        .catch((ex) => {

                            if (!mega.keyMgr.secure) {
                                log99810(ex, 1).catch(dump);

                                mega.keyMgr.reset();
                                return mega.keyMgr.setGeneration(0).catch(dump);
                            }

                            throw ex;
                        });
                }

                // @todo Transifex
                const gone =
                    `Your cryptographic keys have gone missing. It is not safe to use your account at this time.`;

                // We don't - are we supposed to?
                // otherwise, write them later, when the insecure state is fully loaded
                return mega.keyMgr.getGeneration()
                    .then((gen) => {
                        if (gen > 0) {
                            throw new SecurityError(`${gone} (#${gen})`);
                        }
                    });
            })
            .then(() => {
                // there was a race condition between importing and business accounts creation.
                // in normal users there's no problem, however in business the user will be disabled
                // till they pay. therefore, if the importing didnt finish before 'upb' then the importing
                // will fail.
                if (r > 2 && !is_iframed) {
                    const {handle} = mBroadcaster.crossTab;

                    console.assert(!handle, 'FIXME: cross-tab already initialized.', handle, u_handle);
                    console.assert(!handle || handle === u_handle, 'Unmatched cross-tab handle', handle, u_handle);

                    mBroadcaster.crossTab.initialize(() => ctx.checkloginresult(ctx, r));
                }
                else if ($.createanonuser === u_attr.u) {
                    delete $.createanonuser;

                    if (pfid) {
                        M.importWelcomePDF().catch(dump);
                        ctx.checkloginresult(ctx, r);
                    }
                    else {
                        M.importWelcomePDF()
                            .catch(dump)
                            .finally(() => {
                                ctx.checkloginresult(ctx, r);
                            });
                    }
                }
                else {
                    ctx.checkloginresult(ctx, r);
                }
            })
            .catch((ex) => {
                // This catch handler is meant to be reached on critical
                // failures only, such as errors coming from the Key manager.
                setTimeout(() => siteLoadError(ex, 'logon'), 2e3);

                log99810(ex).catch(dump);
            });
    }
}

// validate user session.
async function u_checklogin4(sid) {
    'use strict';

    console.assert(!u_sid || u_type, `Unexpected state (${u_type}) <> ${!!u_sid}:${!!sid}:${sid === u_sid}`);
    console.assert(u_storage === localStorage || u_storage === sessionStorage);

    u_storage.sid = u_sid = sid;
    api_setsid(u_sid || false);
    delay.cancel('overquota:retry');

    // let's use M.req()'s deduplication capability in case of concurrent callers..
    const {result: ug} = await api.req({a: 'ug'}).catch(echo);

    const res = await promisify(resolve => {
        u_checklogin3a(ug, {
            checkloginresult: (ctx, r) => resolve(r)
        });
    })();

    if (res >= 0) {
        let held;

        if (window.n_h) {
            // set new sid under folder-links
            api_setfolder(n_h);
            held = mega.config.sync().catch(dump).then(() => getsc(true).catch(dump));

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

        return held ? held.then(() => res) : res;
    }

    u_storage.sid = u_sid = undefined;
    throw new SecurityError('Invalid Session, ' + res);
}

// erase all local user/session information
function u_logout(logout) {
    // Send some data to mega.io that we logged out
    const promise = initMegaIoIframe(false);

    var a = [localStorage, sessionStorage];
    for (var i = 2; i--;) {
        a[i].removeItem('sid');
        a[i].removeItem('jid');
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
        localStorage.removeItem('mInfinity');
        localStorage.removeItem('megaLiteMode');

        fminitialized = false;
        if ($.leftPaneResizable) {
            tryCatch(() => $.leftPaneResizable.destroy())();
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
        u_sharekeys = {};
        u_type = false;
        loggedout = true;

        $('#fmholder').text('').attr('class', 'fmholder');
        if (window.MegaData) {
            if (window.M instanceof MegaData) {
                tryCatch(() => oDestroy(M.reset()), false)();
            }
            M = new MegaData();
        }

        u_reset();
        $.hideContextMenu = nop;
        mBroadcaster.sendMessage('logout');
    }

    // Delete closed mobile app banner flag on log in
    delete localStorage.closedMobileAppBanner;

    return promise;
}

// cleanup internal state.
function u_reset() {
    'use strict';

    api.reset();

    if (window.waitsc) {
        waitsc.stop();
    }
    if (window.initworkerpool) {
        initworkerpool();
    }

    // clear the n-auth in ch:4
    api.setSID(window.u_sid);

    // close fmdb
    if (typeof mDBcls === 'function') {
        mDBcls();
    }

    if (window.M && M.reset) {
        M.reset();
    }
    if (window.loadfm) {
        loadfm.loaded = false;
        loadfm.loading = false;
    }
    window.fminitialized = false;
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
    // (deprecated)
    if (window.businessSubAc) {
        request['^gmk'] = 'MQ';
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
                    api.req({a: 'ug'}).then(({result: u_attr}) => {
                        if (u_attr.b && u_attr.b.m === 0 && u_attr.b.bu) {
                            crypt.getPubKeyAttribute(u_attr.b.bu, 'RSA')
                                .then(function(res) {
                                    window.businessSubAc = {bu: u_attr.b.bu, bpubk: res};
                                    mBroadcaster.once('fm:initialized', () => M.importWelcomePDF().catch(dump));
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
                            name: u_attr.name,

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

                    if (d) {
                        console.warn('Initializing auth-ring and keys subsystem...');
                    }

                    Promise.resolve(authring.initAuthenticationSystem())
                        .then(() => {
                            return mega.keyMgr.initKeyManagement();
                        })
                        .then(() => {
                            $promise.resolve(rsakey);
                        })
                        .catch((ex) => {
                            msgDialog('warninga', l[135], l[47], ex < 0 ? api_strerror(ex) : ex);
                        })
                        .finally(ui_keycomplete);
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


/**
 * Generates meta data required for rendering avatars
 *
 * @param user_hash
 * @returns {*|jQuery|HTMLElement}
 */
function generateAvatarMeta(user_hash) {
    'use strict';
    const meta = {
        fullName: M.getNameByHandle(user_hash)
    };

    var ua_meta = useravatar.generateContactAvatarMeta(user_hash);
    meta.color = ua_meta.avatar.colorIndex;
    meta.shortName = ua_meta.avatar.letters;

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

/**
 * Inform the mega.io static server of first name, avatar, login status in/out
 * @param {Boolean} loginStatus This is true if they just logged in, false if they logged out
 * @param {Number|undefined} planNum Optional Pro plan number if recently purchased (otherwise u_attr.p is used)
 * @returns {undefined}
 */
function initMegaIoIframe(loginStatus, planNum) {

    'use strict';

    // Set constants for URLs (easier to change for local testing)
    const megapagesUrl = 'https://mega.io';
    const parentUrl = 'https://mega.nz';

    const megapagesPromise = mega.promise;

    tryCatch(() => {
        const megaIoIframe = document.getElementById('i-ping');

        // Check iframe is available
        if (!megaIoIframe) {
            console.error('[webclient->megapages] The iframe is not available. Cannot send user details.');
            megapagesPromise.resolve();
            return;
        }

        // We only want to inform the mega.io site if on live domain
        if (is_iframed || is_extension || location.origin !== parentUrl) {
            console.warn(`[webclient->megapages] The iframe was not initialised.
                Is iframed: ${is_iframed}. Is extension: ${is_extension}.
                Origin unexpected: ${location.origin !== parentUrl} (was ${location.origin}, expecting ${parentUrl}).`);
            megapagesPromise.resolve();
            return;
        }

        // Give mega.io five seconds to provide receipt before allowing other processes to continue
        const timeout = setTimeout(() => {
            megapagesPromise.resolve();
        }, 5000);

        const sendMessage = (messageData) => {
            // Send the data
            megaIoIframe.contentWindow.postMessage(messageData, megapagesUrl);

            // Wait for receipt
            window.addEventListener('message', (e) => {
                if (e.source === megaIoIframe.contentWindow && e.origin === megapagesUrl) {
                    console.info('[megapages] megapages hook receipt received. Success:', e.data);
                    megapagesPromise.resolve();
                    clearTimeout(timeout);
                }
            });
        };

        // Once the mega.io iframe has loaded
        megaIoIframe.onload = () => {
            console.info('[webclient->megapages] iframe loaded. Preparing message...');

            let postMessageData = { };

            // If logging in, assign the first name and set the plan num if available (NB: Free is undefined)
            if (loginStatus) {
                postMessageData = {
                    firstName: u_attr.firstname,
                    planNum: planNum || u_attr.p || undefined
                };

                const avatarMeta = generateAvatarMeta(u_handle);
                if (avatarMeta && avatarMeta.color) {
                    postMessageData.avatarColourKey = avatarMeta.color;
                }

                // Get the custom avatar
                mega.attr.get(u_handle, 'a', true, false)
                    .done((res) => {

                        // If the avatar (in Base64) exists, add to the data
                        if (typeof res !== 'number' && res.length > 5) {
                            postMessageData.avatar = res;
                        }
                    })
                    .always(() => {
                        console.info('[webclient->megapages] Sending loggedin message to iframe.', postMessageData);
                        sendMessage(postMessageData);
                    });
            }
            else {
                console.info('[webclient->megapages] Sending loggedout message to iframe.', postMessageData);
                sendMessage(postMessageData);
            }
        };

        // If they logged out, inform the logged out mega.io URL
        if (!loginStatus) {
            console.info('[webclient->megapages] Setting iframe source to loggedout endpoint.');

            megaIoIframe.src = `${megapagesUrl}/webclient/loggedout.html`;
        }
        else {
            console.info('[webclient->megapages] Setting iframe source to loggedin endpoint');

            // Set the source to the logged in mega.io URL
            megaIoIframe.src = `${megapagesUrl}/webclient/loggedin.html`;
        }
    })();

    return megapagesPromise;
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
    var _compareLastInteractionStamp = function(a, b) {
        var timestampA = parseInt(a.split(":")[1], 10);
        var timestampB = parseInt(b.split(":")[1], 10);

        return timestampA > timestampB;
    };

    const setLastInteractionQueue = [];
    const SET_LAST_INTERACTION_TIMER = 60; // seconds

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

            $elem.text(time2last(ts) || l[1051]);
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
            () => {
                return isDone === true;
            },
            500,
            10000,
            false,
            `SetLastInteraction(${u_h})`
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

        for (let i = setLastInteractionQueue.length; i--;) {
            const [user, value, promise] = setLastInteractionQueue[i];

            _lastUserInteractionCacheInFlight[user] = -1;
            promise.linkDoneAndFailTo(_realSetLastInteractionWith(user, value));
        }
        setLastInteractionQueue.length = 0;
    };


    /**
     * Set the last interaction for a contact (throttled internally)
     *
     * @param u_h {String} user handle
     * @param v {String} "$typeOfInteraction:$unixTimestamp" (see getLastInteractionWith for the types of int...)
     * @returns {Deferred|MegaPromise}
     */
    exportScope.setLastInteractionWith = function(u_h, v) {
        var promise = new MegaPromise();

        if (d && u_h === 'test-me') {
            const user = M.u[M.u.keys()[0]] || !1;

            onIdle(_flushSetLastInteractionWith);
            console.debug(`Triggering last-interaction (upv->ua combo) for "${user.name}" (${user.u}, ${user.m})`);

            u_h = user.u;
            v = `0:${unixtime()}`;
        }

        // set on client side, to simulate a real commit
        const user = u_h in M.u && M.u[u_h] || false;
        const newTs = parseInt(String(v).split(":")[1], 10);

        if (user && user.ts < newTs) {
            user.ts = newTs;
            _lastUserInteractionCacheInFlight[u_h] = v;
        }
        tSleep.schedule(SET_LAST_INTERACTION_TIMER, _flushSetLastInteractionWith);

        for (var i = 0; i < setLastInteractionQueue.length; i++) {
            var entry = setLastInteractionQueue[i];
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
        setLastInteractionQueue.push([u_h, v, promise]);

        return promise;
    };
    exportScope.getLastInteractionWith = getLastInteractionWith;
})(window);
