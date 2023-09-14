/**
 * a class to apply actions on business account in collaboration with API
 */
function BusinessAccount() {
    "use strict";
    this.QuotaUpdateFreq = 3e4; // 30 sec - default threshold to update quotas info
    this.DashboardUpdateFreq = 6e4; // 60 sec - default threshold to update dashboard info
    this.invoiceListUpdateFreq = 9e5; // 15 min - default threshold to update invoices list
}

/**
 * Function to add sub user to a business account
 * @param {String} subEmail         email address of new user
 * @param {String} subFName         First name of new user
 * @param {String} subLName         Last name of new user
 * @param {Object} optionals        contain optional fields if any [position,idnum,phonenum,location]
 * @param {Boolean} isProtectLink   true if we want to protect invitation link with a password
 * @returns {Promise}               Resolves with new add user HANDLE + password
 */
BusinessAccount.prototype.addSubAccount = function (subEmail, subFName, subLName, optionals, isProtectLink) {
    "use strict";
    var operationPromise = new MegaPromise();

    if (!isValidEmail(subEmail)) {
        // promise reject/resolve will return: success,errorCode,errorDesc
        return operationPromise.reject(0, 1, 'Invalid Email');
    }
    if (!subFName) {
        return operationPromise.reject(0, 2, 'Empty First Name');
    }
    if (!subLName) {
        return operationPromise.reject(0, 3, 'Empty Last Name');
    }

    var request = {
        "a": "sbu", // business sub account operation
        "aa": "a", // add operation
        "m": subEmail, // email address of user to add
        "firstname": base64urlencode(to8(subFName)), // first name of user to add
        // (not base64 encoded like attributes are)
        "lastname": base64urlencode(to8(subLName)) // last name of user to add (also not base64 encoded)
    };

    if (optionals) {
        if (optionals.position) {
            request['%position'] = base64urlencode(to8(optionals.position));
        }
        if (optionals.idnum) {
            request['%idnum'] = base64urlencode(to8(optionals.idnum));
        }
        if (optionals.phonenum) {
            request['%phonenum'] = base64urlencode(to8(optionals.phonenum));
        }
        if (optionals.location) {
            request['%location'] = base64urlencode(to8(optionals.location));
        }
    }
    if (isProtectLink) {
        request.lp = 1;
    }

    api_req(request, {
        callback: function (res) {
            if ($.isNumeric(res)) {
                operationPromise.reject(0, res, 'API returned error', request);
            }
            else if (typeof res === 'object') {
                // this must be re done
                // since no action packet will be sent for sub-user adding
                // and since the return handle + password is a true confirmation of success
                // we will simulate the effect locally
                // however, this may introduce theoretical data inconsistency between server and local
                // as although we know the operation is successful, we are assuming that the server used
                // the sent email + first-name + last-name without any alternation

                // var usr = {
                //    u: res.u,
                //    p: null,
                //    s: 10, // pending
                //    e: request.m, // assuming that the server MUST not change the requested val
                //    firstname: request.firstname, // same assumption as above
                //    lastname: request.lastname, // same assumption as above
                //    position: request['%position'] || '',
                //    idnum: request['%idnum'] || '',
                //    phonenum: request['%phonenum'] || '',
                //    location: request['%location'] || ''
                // };

                // mySelf.parseSUBA(usr, false, true);

                operationPromise.resolve(1, res, request); // new added user handle
            }
            else {
                operationPromise.reject(0, 4, 'API returned error, ret=' + res, request);
            }
        }
    });

    return operationPromise;
};

/**
 * edit sub-user info
 * @param {String} subuserHandle        sub-user handle
 * @param {String} subEmail             new email address, or null to don't change
 * @param {String} subFName             new first name, or null to don't change
 * @param {String} subLName             new last name, or null to don't change
 * @param {any} optionals               new optionals, or null to don't change
 * @param {Boolean} isProtectLink       true if we want to protect invitation link with a password
 */
BusinessAccount.prototype.editSubAccount =
    function (subuserHandle, subEmail, subFName, subLName, optionals, isProtectLink) {
    "use strict";
    var operationPromise = new MegaPromise();

    if (!subuserHandle) {
        return operationPromise.reject(0, 18, 'Empty User Handle');
    }
    if (!subEmail && !subFName && !subLName && !optionals) {
        return operationPromise.reject(0, 19, 'Empty User attributes. nothing to edit');
    }
    if (subEmail && !isValidEmail(subEmail)) {
        return operationPromise.reject(0, 1, 'Invalid Email');
    }

    var request = {
        "a": "upsub",               // business sub account update
        "su": subuserHandle,        // sub-user handle
    };
    if (subEmail) {
        request['email'] = subEmail;
    }
    if (subFName) {
        request.firstname = base64urlencode(to8(subFName));
    }
    if (subLName) {
        request.lastname = base64urlencode(to8(subLName));
    }
    if (optionals) {
        if (typeof optionals.position !== 'undefined') {
            request['%position'] = base64urlencode(to8(optionals.position));
        }
        if (typeof optionals.idnum !== 'undefined') {
            request['%idnum'] = base64urlencode(to8(optionals.idnum));
        }
        if (typeof optionals.phonenum !== 'undefined') {
            request['%phonenum'] = base64urlencode(to8(optionals.phonenum));
        }
        if (typeof optionals.location !== 'undefined') {
            request['%location'] = base64urlencode(to8(optionals.location));
        }
    }
    if (isProtectLink) {
        request.lp = 1;
    }

        api.screq(request)
            .then(({result}) => {
                const type = typeof result;
                assert(type === 'string' || type === 'object', `Unexpected response ${type}:${result}`);

                if (type === 'string') {
                    operationPromise.resolve(1, null, request); // user edit succeeded
                }
                else {
                    operationPromise.resolve(1, result, request); // user edit involved email change
                }
            })
            .catch((ex) => {
                if (d) {
                    console.error('upsub failed', ex);
                }
                operationPromise.reject(0, parseInt(ex) || 4, `API returned error, ${ex}`);
            });

    return operationPromise;
};

/**
 * Function to deactivate sub user from business account
 * @param {String} subUserHandle    sub user handle to deactivate
 * @returns {Promise}               Resolves deactivate operation result
 */
BusinessAccount.prototype.deActivateSubAccount = function (subUserHandle) {
    "use strict";
    var operationPromise = new MegaPromise();
    if (!subUserHandle || subUserHandle.length !== 11) {
        return operationPromise.reject(0, 5, 'invalid U_HANDLE');
    }
    if (!M.suba[subUserHandle]) {
        return operationPromise.reject(0, 7, 'u_handle is not a sub-user');
    }

    var request = {
        "a": "sbu", // business sub account operation
        "aa": "d", // deactivate operation
        "u": subUserHandle // user handle to deactivate
    };

    api_req(request, {
        callback: function (res) {
            if ($.isNumeric(res)) {
                if (res !== 0) {
                    operationPromise.reject(0, res, 'API returned error');
                }
                else {
                    operationPromise.resolve(1); // user deactivated successfully
                }
            }
            else {
                operationPromise.reject(0, 4, 'API returned error, ret=' + res);
                if (d) {
                    console.error('API returned error, ret=' + res);
                }
            }
        }

    });

    return operationPromise;
};

/**
 * Function to activate sub user in business account
 * @param {String} subUserHandle    sub user handle to activate
 * @returns {Promise}               Resolves activate operation result
 */
BusinessAccount.prototype.activateSubAccount = function (subUserHandle) {
    "use strict";
    var operationPromise = new MegaPromise();
    if (!subUserHandle || subUserHandle.length !== 11) {
        return operationPromise.reject(0, 5, 'invalid U_HANDLE');
    }
    if (!M.suba[subUserHandle]) {
        return operationPromise.reject(0, 7, 'u_handle is not a sub-user');
    }

    var request = {
        "a": "sbu", // business sub account operation
        "aa": "c", // activate operation
        "u": subUserHandle // user handle to activate
    };

    api_req(request, {
        callback: function (res) {
            if ($.isNumeric(res) && res === 0) {
                operationPromise.resolve(1, res, request); // activated used successfully, non need for re-init
            }
            else if (typeof res === 'object') {
                operationPromise.resolve(1, res, request); // user activated successfully, object contain lp + u
            }
            else {
                operationPromise.reject(0, 4, 'API returned error, ret=' + res);
            }
        }

    });

    return operationPromise;
};

/**
 * Get Shared Key
 * @param {String} myPrivate    Private Cu25519 (me)
 * @param {String} theirPublic  Public Cu25519 (them)
 * @param {String} data         Data payload
 */
BusinessAccount.prototype.getSharedKey = function(myPrivate, theirPublic, data) {
    'use strict';

    if (!theirPublic || !myPrivate) {
        console.error('Fatal: trying to get shared key without prior verification. Not expected reach');
        return false;
    }

    const prvCuBytes = asmCrypto.string_to_bytes(myPrivate);
    const pubCuBytes = asmCrypto.string_to_bytes(theirPublic);
    const sharedSecret = nacl.scalarMult(prvCuBytes, pubCuBytes);

    //// now let's calculate the cryptographic hash
    //// Hashing an empty data with shared secret as a key is sufficient.
    //// In chat context, they used a static data and a hashed secret.
    //// I will use dynamic data, which will harden the challenge, and I will inherit the repeated hash approach.
    const hashBytes = asmCrypto.HMAC_SHA256.bytes(data, asmCrypto.HMAC_SHA256.bytes(sharedSecret, ''));

    // convert to string to take the first 16 characters as the key.
    // we cant do that on bytes.
    const keyString = asmCrypto.bytes_to_string(hashBytes).substring(0, 16);

    return asmCrypto.string_to_bytes(keyString);
};

BusinessAccount.prototype.encryptKey = function() {
    'use strict';

    if (!u_attr || !u_attr.b || u_attr.b.m || !u_attr.b.mu[0]) {
        throw new SecurityError('Trying to encrypt key in an invalid account state.');
    }

    if (!pubCu25519[u_attr.b.mu[0]]) {
        throw new SecurityError('Trying to encrypt key without prior or invalid verification.');
    }

    if (!u_attr.prCu255) {
        throw new SecurityError('Trying to encrypt key without having the Cu25519 private key available.');
    }

    const msgString = a32_to_str(u_k);
    const msgBytes = asmCrypto.string_to_bytes(msgString);

    const cryptoHash = this.getSharedKey(u_attr.prCu255, pubCu25519[u_attr.b.mu[0]], u_handle);

    const EncMsg = asmCrypto.AES_ECB.encrypt(msgBytes, cryptoHash, false);

    return asmCrypto.bytes_to_string(EncMsg);
};


/**
 * Decrypt the mk for the sub-user using k2
 * @param {String} key          The mk (k2) after b64 decode
 * @param {any} userHandle      subuser's handle
 */
BusinessAccount.prototype.decryptKey = function(key, userHandle) {
    'use strict';

    if (!u_attr || !u_attr.b || !u_attr.b.m || !key || !userHandle) {
        console.error('Error: trying to decrypt key in an invalid case');
        return false;
    }
    if (!pubCu25519[userHandle]) {
        console.error('Fatal: trying to decrypt key without prior verification. Not expected reach');
        return false;
    }

    const msgBytes = asmCrypto.string_to_bytes(key);
    const cryptoHash = (this || mega.buinsessController)
        .getSharedKey(u_attr.prCu255, pubCu25519[userHandle], userHandle);
    const decMsg = asmCrypto.AES_ECB.decrypt(msgBytes, cryptoHash, false);

    return asmCrypto.bytes_to_string(decMsg);

};

/**
 * Function that send the master-key of the sub-user to Master
 * Encrypted using Ed25519
 * @returns {Promise}               Operation result
 */
BusinessAccount.prototype.sendSubMKey = async function() {
    'use strict';

    if (!u_attr || !u_attr.b || u_attr.b.m || !u_attr.b.mu[0]) {
        throw new SecurityError('Invalid business attributes.');
    }

    const encryptedMKey = this.encryptKey();
    assert(encryptedMKey && encryptedMKey.length, 'Encrypting submaster-k failed');

    const b64Encoded = base64urlencode(encryptedMKey);
    assert(b64Encoded && b64Encoded.length, 'Encoding submaster-k failed');

    const request = {
        "a": "up",          // update attributes
        "mk2": b64Encoded   // master-key encrypted
    };

    return api.screq(request)
        .then(({result}) => {
            assert(typeof result === 'string', `Invalid API Response...${result}`);

            return mega.attr.remove('gmk', -2, 0).catch(reportError);
        });
};

/**
 * Function to get the master key of a sub user in business account
 * @param {String} subUserHandle    sub user handle to get the master key of
 * @returns {Promise}               Resolves operation result
 */
BusinessAccount.prototype.getSubAccountMKey = async function(subUserHandle) {
    "use strict";
    assert(subUserHandle && subUserHandle.length === 11 && M.suba[subUserHandle], `Invalid handle, ${subUserHandle}`);

    var request = {
        "a": "sbu", // business sub account operation
        "aa": "k", // get master-key operation
        "u": subUserHandle // user handle to get key of
    };
    const {result} = await api.req(request);

    assert(typeof result === 'object' && 'k' in result, `Unexpected 'sub' response, ${result}`);

    return result;
};

/**
 * Function to get Quota usage Report between two dates.
 * @param {boolan} forceUpdate      a flag to force updating the cached values
 * @param {Object} fromToDate       object contains .fromDate and .toDate YYYYMMDD
 * @returns {Promise}               Resolves operation result
 */
BusinessAccount.prototype.getQuotaUsageReport = function (forceUpdate, fromToDate) {
    "use strict";
    var operationPromise = new MegaPromise();

    if (!fromToDate || !fromToDate.fromDate || !fromToDate.toDate
        || fromToDate.fromDate.length !== fromToDate.toDate.length
        || fromToDate.fromDate.length !== 8) {
        return operationPromise.reject(0, 10, 'invalid FromToDate');
    }

    var context = Object.create(null);
    context.dates = fromToDate;
    var request = {
        "a": "sbu", // business sub account operation
        "aa": "q" // get quota info
    };

    if (!forceUpdate) {
        if (mega.buinsessAccount && mega.buinsessAccount.quotaReport) {
            var storedDates = Object.keys(mega.buinsessAccount.quotaReport);
            storedDates.sort();
            var oldestStoredDate = storedDates[0];
            var newestStoredDate = storedDates[storedDates.length - 1];

            // best case scenario, the period we want is inside the saved
            if (fromToDate.fromDate >= oldestStoredDate && fromToDate.toDate <= newestStoredDate) {
                var result = Object.create(null);

                var start = storedDates.indexOf(fromToDate.fromDate);

                if (start === -1) {
                    for (var s1 = 0; s1 < storedDates.length; s1++) {
                        if (storedDates[s1] > fromToDate.fromDate) {
                            start = s1;
                            break;
                        }
                    }
                }

                var end = storedDates.indexOf(fromToDate.toDate);

                if (end === -1) {
                    for (var s2 = storedDates.length - 1; s2 >= 0; s2--) {
                        if (storedDates[s2] < fromToDate.toDate) {
                            end = s2;
                            break;
                        }
                    }
                }

                for (var k = start; k <= end; k++) {
                    result[storedDates[k]] = mega.buinsessAccount.quotaReport[storedDates[k]];
                }
                operationPromise.resolve(1, result); // quota report
            }
            // the second case, left wing of saved data
            else if (fromToDate.fromDate < oldestStoredDate && fromToDate.toDate <= newestStoredDate) {
                // we need to get data from "fromDate" to "oldestStoredDate-1"
                const upperDate = new Date(
                    parseInt(oldestStoredDate.substr(0, 4)),
                    parseInt(oldestStoredDate.substr(4, 2)) - 1,
                    parseInt(oldestStoredDate.substr(6, 2))
                );
                upperDate.setDate(upperDate.getDate() - 1);

                request.fd = fromToDate.fromDate;

                let upperDateStr = String(upperDate.getMonth() + 1);
                if (upperDateStr.length < 2) {
                    upperDateStr = '0' + upperDateStr;
                }
                upperDateStr = upperDate.getFullYear() + upperDateStr;
                let tempDay = String(upperDate.getDate());
                if (tempDay.length < 2) {
                    tempDay = '0' + tempDay;
                }
                upperDateStr += tempDay;

                request.td = upperDateStr;
            }
            // the third case, right wing of saved data
            else if (fromToDate.fromDate >= oldestStoredDate && fromToDate.toDate > newestStoredDate) {
                // we need to get data from "newestStoredDate+1" to "toDate"
                const lowerDate = new Date(
                    parseInt(newestStoredDate.substr(0, 4)),
                    parseInt(newestStoredDate.substr(4, 2)) - 1,
                    parseInt(newestStoredDate.substr(6, 2))
                );
                lowerDate.setDate(lowerDate.getDate() + 1);

                request.td = fromToDate.toDate;

                let lowerDateStr = String(lowerDate.getMonth() + 1);
                if (lowerDateStr.length < 2) {
                    lowerDateStr = '0' + lowerDateStr;
                }
                lowerDateStr = lowerDate.getFullYear() + lowerDateStr;
                let tempDay2 = String(lowerDate.getDate());
                if (tempDay2.length < 2) {
                    tempDay2 = '0' + tempDay2;
                }
                lowerDateStr += tempDay2;

                request.fd = lowerDateStr;
            }
            // Else case left + right --> call recursively and combine them then return
            // in the current UI is not possible to generate such case
        }
    }

    if (!request.fd || !request.td) {
        request.fd = fromToDate.fromDate;
        request.td = fromToDate.toDate;
    }

    api_req(request, {
        context: context,
        callback: function (res,ctx) {
            if ($.isNumeric(res)) {
                operationPromise.reject(0, res, 'API returned error');
            }
            else if (typeof res === 'object') {
                mega.buinsessAccount = mega.buinsessAccount || Object.create(null);
                mega.buinsessAccount.quotaReport = mega.buinsessAccount.quotaReport || Object.create(null);

                for (var repDay in res) {
                    mega.buinsessAccount.quotaReport[repDay] = res[repDay];
                }
                if (Array.isArray(res) && res.length === 0) {
                    // Empty result still needs to create an entry to show the graph.
                    mega.buinsessAccount.quotaReport[ctx.context.dates.fromDate] = Object.create(null);
                }

                var orderedDates = Object.keys(mega.buinsessAccount.quotaReport);
                orderedDates.sort();

                var startIx = 0;
                var startFound = false;
                for (startIx = 0; startIx < orderedDates.length; startIx++) {
                    if (orderedDates[startIx] >= ctx.context.dates.fromDate) {
                        startFound = true;
                        break;
                    }
                }
                if (orderedDates[startIx].substr(4, 2) > ctx.context.dates.fromDate.substr(4, 2)) {
                    // found date is in the next month
                    operationPromise.resolve(1, Object.create(null)); // quota info
                }
                // quit if we didnt find the data, report in future !!
                if (!startFound) {
                    console.error('Requested report start-date is not found (in the future)');
                    return operationPromise.reject(0, res, 'Requested report start-date is not found (in future)');
                }

                var result = Object.create(null);
                var endIx = -1;
                for (endIx = startIx; endIx < orderedDates.length; endIx++) {
                    if (orderedDates[endIx] > ctx.context.dates.toDate) {
                        break;
                    }

                    result[orderedDates[endIx]] = mega.buinsessAccount.quotaReport[orderedDates[endIx]];

                    if (orderedDates[endIx] === ctx.context.dates.toDate) {
                        break;
                    }
                }

                // quit if we didnt find the data
                // if (endIx === orderedDates.length && orderedDates[endIx] !== ctx.context.dates.toDate) {
                //    result = null;
                //    console.error('Requested report end-date is not found');
                //    return operationPromise.reject(0, res, 'Requested report end-date is not found');
                // }

                operationPromise.resolve(1, result); // quota info
            }
            else {
                operationPromise.reject(0, 4, 'API returned error, ret=' + res);
            }
        }

    });

    return operationPromise;
};


/**
 * Function to get Quota usage info for the master account and each sub account.
 * @param {boolan} forceUpdate      a flag to force updating the cached values
 * @returns {Promise}               Resolves operation result
 */
BusinessAccount.prototype.getQuotaUsage = function (forceUpdate) {
    "use strict";
    var operationPromise = new MegaPromise();
    if (!forceUpdate) {
        if (mega.buinsessAccount && mega.buinsessAccount.quotas) {
            var currTime = new Date().getTime();
            if (mega.buinsessAccount.quotas.timestamp &&
                (currTime - mega.buinsessAccount.quotas.timestamp) < this.QuotaUpdateFreq) {
                return operationPromise.resolve(1, mega.buinsessAccount.quotas);
            }
        }
    }

    var request = {
        "a": "sbu", // business sub account operation
        "aa": "q", // get quota info
        ps: 1, // Split links and shares data.
    };

    api_req(request, {
        callback: function (res) {
            if ($.isNumeric(res)) {
                operationPromise.reject(0, res, 'API returned error');
            }
            else if (typeof res === 'object') {
                var currTime = new Date().getTime();
                res.timestamp = currTime;
                mega.buinsessAccount = mega.buinsessAccount || Object.create(null);
                mega.buinsessAccount.quotas = res;

                // update reports in the way...
                mega.buinsessAccount = mega.buinsessAccount || Object.create(null);
                mega.buinsessAccount.quotaReport = mega.buinsessAccount.quotaReport || Object.create(null);
                var todayKey = Object.keys(res)[0];
                mega.buinsessAccount.quotaReport[todayKey] = res[todayKey];

                operationPromise.resolve(1, res); // quota info
            }
            else {
                operationPromise.reject(0, 4, 'API returned error, ret=' + res);
            }
        }

    });

    return operationPromise;
};


/**
 * a function to parse the JSON object received holding information about a sub-account of a business account.
 * @param {String} suba    the object to parse, it must contain a sub-account ids
 * @param {Boolean} ignoreDB if we want to skip DB updating
 * @param {Boolean} fireUIEvent if we want to fire a n event to update ui
 */
BusinessAccount.prototype.parseSUBA = function (suba, ignoreDB, fireUIEvent) {
    "use strict";
    if (M) {
        // M.isBusinessAccountMaster = 1; // init it, or re-set it

        if (!M.suba) {
            M.suba = Object.create(null);
        }
        if (!suba) {
            return;
        }
        M.suba[suba.u] = suba; // i will keep deleted in sub-accounts in DB and MEM as long as i receive them
        /**
         * SUBA object:
         *      -u: handle
         *      -p: parent {for future multilevel business accounts}
         *      -s: status {10=pending confirmation , 11:disabled, 12:deleted, 0:enabled and OK}
         *      -e: email
         *      -firstname
         *      -lastname
         *      -position
         *      -idnum
         *      -phonenum
         *      -location
         */
    }
    if (fmdb && !ignoreDB && !pfkey && !folderlink) {
        fmdb.add('suba', { s_ac: suba.u, d: suba });
    }
    if (fireUIEvent) {
        mBroadcaster.sendMessage('business:subuserUpdate', suba);
    }
};

/**
 * Function to check if the current logged in user is a Business Account Master
 * @returns {Boolean}   true if the user is a Master B-Account
 */
BusinessAccount.prototype.isBusinessMasterAcc = function () {
    "use strict";
    if ((u_attr && u_attr.b && u_attr.b.m) || (M.suba && M.suba.length)) {
        return true;
    }
    return false;
};

/**
 * @param {String} password Password to process
 * @returns {Object?}
 */
BusinessAccount.prototype.passwordToAesCypher = function(password) {
    'use strict';

    return tryCatch(
        () => {
            const keyFromPassword = base64_to_a32(password);
            return new sjcl.cipher.aes(keyFromPassword);
        },
        false
    )();
};

/**
 * Decrypting the link sent to sub-account using a password
 * @param {String} link         invitation link #businesssignup<link> without #businesssignup prefix
 * @param {String} password     The password which the sub-user entered to decrypt the link
 *                              Password is randomly generated and 24 chars / 192 bits
 * @returns {String}            base64 sign-up-code (decryption result)
 */
BusinessAccount.prototype.decryptSubAccountInvitationLink = function (link, password) {
    "use strict";
    if (!link || !password) {
        return null;
    }

    const aesCipher = this.passwordToAesCypher(password);

    if (!aesCipher) {
        return null;
    }

    try {
        var decryptedTokenArray32 = aesCipher.decrypt(base64_to_a32(link));
        var decryptedTokenArray8 = a32_to_ab(decryptedTokenArray32);
        decryptedTokenArray8 = decryptedTokenArray8.slice(0, 15);
        var decryptedTokenBase64 = ab_to_base64(decryptedTokenArray8);
        return decryptedTokenBase64;
    }
    catch (exp) {
        console.error(exp);
        if (exp.stack) {
            console.error(exp.stack);
        }
        return null;
    }

};

/**
 * Get info associated with sign-up code
 * @param {String} signupCode       sign-up code to fetch info for
 * @returns {Promise}                Promise resolves an object contains fetched info
 */
BusinessAccount.prototype.getSignupCodeInfo = function (signupCode) {
    "use strict";
    if (!signupCode) {
        return null;
    }
    var operationPromise = new MegaPromise();
    var request = {
        "a": "uv2", // business sub account operation - get signupcode info
        "c": signupCode // the code
    };

    api_req(request, {
        callback: function (res) {
            if (typeof res === 'object') {
                operationPromise.resolve(1, res); // sub-user info
            }
            else {
                operationPromise.reject(0, res, 'API returned error');
            }
        }
    });

    return operationPromise;
};


/**
 * copying the sub-user decrypted tree to master user root
 * @param {Array} tree               sub-user tree decrypted
 * @param {String} folderName           name of the folder to create in master's root
 * @param {Function} progressCallback   optional callback function for progress reporting
 * @returns {Promise}                   resolves if operation succeeded
 */
BusinessAccount.prototype.copySubUserTreeToMasterRoot = async function(tree, folderName, progressCallback) {
    "use strict";
    const createAttribute = tryCatch((n, nn) => ab_to_base64(crypto_makeattr(n, nn)));

    assert(tree && tree.length, 'sub-user tree is empty or invalid');
    assert(folderName && folderName.length > 3, 'folder name is not valid');
    assert(M.RootID, 'Master user root could not be found');

    var fNode = { name: folderName };
    var attr = ab_to_base64(crypto_makeattr(fNode));
    var key = a32_to_base64(encrypt_key(u_k_aes, fNode.k));

    var cloudNode = { name: 'Cloud-Drive' };
    var cloudAttr = ab_to_base64(crypto_makeattr(cloudNode));
    var cloudKey = a32_to_base64(encrypt_key(u_k_aes, cloudNode.k));

    var rubbishNode = { name: 'User-Rubbish-bin'};
    var rubbishAttr = ab_to_base64(crypto_makeattr(rubbishNode));
    var rubbishKey = a32_to_base64(encrypt_key(u_k_aes, rubbishNode.k));

    var foldersToCreate = [
        { h: 'xxxxxxxx', t: 1, a: attr, k: key },
        { h: 'xxxxxxx1', t: 1, a: cloudAttr, k: cloudKey, p: 'xxxxxxxx' },
        { h: 'xxxxxxx2', t: 1, a: rubbishAttr, k: rubbishKey, p: 'xxxxxxxx' }
    ];

    if (progressCallback) {
        progressCallback(33);
    }
    const {handle, packet: {scnodes}} = await api.screq({a: 'p', t: M.RootID, n: foldersToCreate});

    if (progressCallback) {
        progressCallback(42);
    }

    var treeToCopy = [];
    var opSize = 0;
    var rootParentsMap = Object.create(null);
    var copyHeads = Object.create(null);

    for (let h = 0; h < tree.length; h++) {
        const originalNode = tree[h];

        if (originalNode.t > 1) {
            if (originalNode.t === 4) { // rubbish
                rootParentsMap[originalNode.h] = scnodes[2].h;
            }
            else { // cloud (originalNode.t === 2) or anything else
                rootParentsMap[originalNode.h] = scnodes[1].h;
            }
            continue;
        }

        const newNode = {};

        if (!originalNode.t) {
            newNode.k = originalNode.k;
            opSize += originalNode.s || 0;
        }

        if (!(newNode.a = createAttribute(originalNode, newNode))) {

            console.warn(`Failed to create attribute for node ${originalNode.h}, ignoring...`);
            continue;
        }
        newNode.h = originalNode.h;
        newNode.p = originalNode.p;
        newNode.t = originalNode.t;

        if (rootParentsMap[newNode.p]) {
            newNode.newTarget = rootParentsMap[newNode.p];
            delete newNode.p;
            copyHeads[newNode.h] = newNode.newTarget;
        }
        else if (copyHeads[newNode.p]) {
            newNode.newTarget = copyHeads[newNode.p];
            copyHeads[newNode.h] = newNode.newTarget;
        }

        treeToCopy.push(newNode);
        if (progressCallback) {
            progressCallback(42 + Math.floor(50 / tree.length * (h + 1)));
        }
    }
    treeToCopy.opSize = opSize;

    await M.copyNodes(treeToCopy, handle, false, treeToCopy);

    return M.getNodeByHandle(handle);
};


/**
 * decrypt the sub-user tree using the passed key
 * @param {Array} theTree        sub-user tree as an array of nodes
 * @param {String} key           sub-user's master key
 * @param {String} subUserHandle sub-user's handle, if passed master key is K2 version
 * @returns {Object}             if succeeded, contains .tree attribute and .errors .warn
 */
BusinessAccount.prototype.decrypteSubUserTree = function(theTree, key, subUserHandle) {
    "use strict";

    if (!theTree || !theTree.ok0) {
        return null;
    }

    var treeF = theTree.f;

    if (!treeF || !treeF.length || !key) {
        return null;
    }
    // if (!u_privk) {
    //    return null;
    // }
    if (!u_attr || !u_attr.b || !u_attr.b.bprivk) {
        return null;
    }

    let subUserKey = null;
    const t = base64urldecode(key);

    if (!subUserHandle) {
        const business_privk = crypto_decodeprivkey(a32_to_str(decrypt_key(u_k_aes, base64_to_a32(u_attr.b.bprivk))));
        const dKey = crypto_rsadecrypt(t, business_privk);
        subUserKey = new sjcl.cipher.aes(str_to_a32(dKey.substr(0, 16)));
    }
    else {
        const dKey = this.decryptKey(t, subUserHandle);
        subUserKey = new sjcl.cipher.aes(str_to_a32(dKey));
    }

    // loading sharing keys, as out-shares will be sent with sharing keys (instead of owner node key)
    var subUserShareKeys = Object.create(null);
    for (var ok in theTree.ok0) {
        var currKey = null;
        currKey = decrypt_key(subUserKey, base64_to_a32(theTree.ok0[ok].k));
        subUserShareKeys[theTree.ok0[ok].h] = [currKey, new sjcl.cipher.aes(currKey)];
    }

    var errors = [];
    var warns = [];
    var er;

    for (var k = 0; k < treeF.length; k++) {
        var nodeKey = false;
        var p = -1;
        var sId = null;



        if (typeof treeF[k].k === 'undefined' || treeF[k].name) {
            // no decryption needed
            continue;

        }

        if (typeof treeF[k].k === 'string') {
            if (treeF[k].k.length === 43 || treeF[k].k.length === 22) {
                p = 0;
            }
            else if (treeF[k].k[11] === ':') {
                p = 12;
            }
            else {
                // var dots = treeF[k].k.indexOf(':', 8);
                // if (dots !== -1) {
                //    p = dots + 1;
                // }
                for (p = 8; (p = treeF[k].k.indexOf(':', p)) >= 0;) {
                    if (++p === 9 || treeF[k].k[p - 10] === '/') {
                        sId = treeF[k].k.substr(p - 9, 8);
                        if (subUserShareKeys[sId]) {
                            break;
                        }
                    }
                }
            }

            if (p >= 0) {
                var pp = treeF[k].k.indexOf('/', p + 21);

                if (pp < 0) {
                    pp = treeF[k].k.length;
                }

                var stringKey = treeF[k].k.substr(p, pp - p);

                if (stringKey.length < 44) {
                    // short keys: AES
                    var keyInt = base64_to_a32(stringKey);

                    // check for permitted key lengths (4 == folder, 8 == file)
                    if (keyInt.length === 4 || keyInt.length === 8) {
                        nodeKey = decrypt_key((sId) ? subUserShareKeys[sId][1] : subUserKey, keyInt);
                    }
                    else {
                        er = treeF[k].h + ": Received invalid key length [sub-user] (" + keyInt.length + "): ";
                        errors.push(er);
                        console.error(er);
                        nodeKey = false;
                    }
                }
                else {
                    er = treeF[k].h + ": strange key length = " + stringKey.length + '  ' + stringKey;
                    errors.push(er);
                    console.error(er);
                    nodeKey = false;
                }
            }
        }
        else {
            nodeKey = treeF[k].k;
        }

        if (nodeKey) {
            if (treeF[k].a) {
                crypto_procattr(treeF[k], nodeKey);
            }
            else {
                if (treeF[k].t < 2) {
                    er = treeF[k].h + ': Missing attribute for node @sub-user ';
                    warns.push(er);
                    console.warn(er);
                }
            }
        }
        else {
            er = treeF[k].h + ": nothing could be done to this node";
            errors.push(er);
            console.error(er);
        }
    }
    return { "tree": treeF, "errors": errors, "warns": warns };
};

/**
 * get the sub-user tree
 * @param {String} subUserHandle    Handle of a sub-user
 * @returns {Promise}               resolve if the operation succeeded
 */
BusinessAccount.prototype.getSubUserTree = async function(subUserHandle) {
    "use strict";

    assert(subUserHandle && subUserHandle.length === 11 && M.suba[subUserHandle], `Invalid handle, ${subUserHandle}`);

    // getting sub-user tree
    var request = {
        "a": "fsub", // operation - get user tree
        "su": subUserHandle, // sub-user Handle
        "r": 1, // recursive
        "c": 1 // don't get extra data (contacts, sub-users ...etc)
    };
    const {result} = await api.req(request);

    assert(typeof result === 'object' && 'ok0' in result, `Unexpected 'fsub' response, ${result}`);

    return result;
};


/**
 * get invoice details
 * @param {String} invoiceID            invoice unique id
 * @param {Boolean} forceUpdate         a flag to force getting info from API not using the cache
 * @returns {Promise}                   resolve if the operation succeeded
 */
BusinessAccount.prototype.getInvoiceDetails = function (invoiceID, forceUpdate) {
    "use strict";
    var operationPromise = new MegaPromise();
    if (!forceUpdate) {
        if (mega.buinsessAccount && mega.buinsessAccount.invoicesDetailsList
            && mega.buinsessAccount.invoicesDetailsList[invoiceID]) {
            var currTime = new Date().getTime();
            var cachedTime = mega.buinsessAccount.invoicesDetailsList[invoiceID].timestamp;
            if (cachedTime && (currTime - cachedTime) < this.invoiceListUpdateFreq) {
                return operationPromise.resolve(1, mega.buinsessAccount.invoicesDetailsList[invoiceID]);
            }
        }
    }

    var request = {
        'a': 'id', // get invoice details
        'n': invoiceID,   // invoice number
        'extax': 1
    };

    api_req(request, {
        callback: function (res) {
            if ($.isNumeric(res)) {
                operationPromise.reject(0, res, 'API returned error');
            }
            else if (typeof res === 'object') {
                var currTime = new Date().getTime();
                mega.buinsessAccount = mega.buinsessAccount || Object.create(null);
                mega.buinsessAccount.invoicesDetailsList = mega.buinsessAccount.invoicesDetailsList
                    || Object.create(null);
                res.timestamp = currTime;

                mega.buinsessAccount.invoicesDetailsList[invoiceID] = res;
                operationPromise.resolve(1, res); // invoice detail
            }
            else {
                operationPromise.reject(0, 4, 'API returned error, ret=' + res);
            }
        }

    });
    return operationPromise;
};


/**
 * a function to get a list of payment gateways for business accounts
 * @param {Boolean} forceUpdate         force updating from API
 * @returns {Promise}                   resolves when we get the answer
 */
BusinessAccount.prototype.getListOfPaymentGateways = function (forceUpdate) {
    "use strict";
    var operationPromise = new MegaPromise();

    if (!forceUpdate) {
        if (mega.buinsessAccount && mega.buinsessAccount.cachedBusinessGateways) {
            var currTime = new Date().getTime();
            if (mega.buinsessAccount.cachedBusinessGateways.timestamp &&
                (currTime - mega.buinsessAccount.cachedBusinessGateways.timestamp) < this.invoiceListUpdateFreq) {
                return operationPromise.resolve(1, mega.buinsessAccount.cachedBusinessGateways.list);
            }
        }
    }

    var request = {
        a: "ufpqfull",  // get a list of payment gateways
        d: 0,           // get all gateways [debugging]
        t: 0
    };

    api_req(request, {
        callback: function (res) {
            if ($.isNumeric(res)) {
                operationPromise.reject(0, res, 'API returned error');
            }
            else if (typeof res === 'object') {
                var currTime = new Date().getTime();
                mega.buinsessAccount = mega.buinsessAccount || Object.create(null);
                var paymentGateways = Object.create(null);
                paymentGateways.timestamp = currTime;
                var res2 = [];
                for (var h = 0; h < res.length; h++) {
                    if (res[h].supportsBusinessPlans) {
                        res2.push(res[h]);
                    }
                }
                paymentGateways.list = res2;
                mega.buinsessAccount.cachedBusinessGateways = paymentGateways;
                operationPromise.resolve(1, res2); // payment gateways list
            }
            else {
                operationPromise.reject(0, 4, 'API returned error, ret=' + res);
            }
        }

    });

    return operationPromise;
};


/**
 * a function to get the business account plan (only 1). as the UI is not ready to handle more than 1 plan
 * @param {Boolean} forceUpdate         force updating from API
 * @param {Boolean} [flexI]             Get the Pro Flexi plan.
 * @returns {Promise}                   resolves when we get the answer
 */
BusinessAccount.prototype.getBusinessPlanInfo = async function(forceUpdate, flexI) {
    "use strict";

    if (!forceUpdate && !flexI) {
        const {cachedBusinessPlan: {timestamp} = false} = mega.buinsessAccount || !1;

        if (Date.now() - timestamp < this.invoiceListUpdateFreq) {
            return mega.buinsessAccount.cachedBusinessPlan;
        }
    }

    const request = {
        a: 'utqa',  // get a list of plans
        nf: 2,      // extended format
        b: 1        // also show business plans
    };

    if (flexI) {
        // get the Pro Flex-i plan
        request.p = 1;
    }

    return api.req(request)
        .then(({result}) => {

            for (let h = 0; h < result.length; h++) {
                const {it, al} = result[h];
                const match = flexI ? al === pro.ACCOUNT_LEVEL_PRO_FLEXI : !!it;

                if (match) {
                    const plan = result[h];
                    plan.bd.us.lp /= 100;
                    plan.bd.us.p /= 100;
                    plan.bd.trns.lp /= 100;
                    plan.bd.trns.p /= 100;
                    plan.bd.sto.lp /= 100;
                    plan.bd.sto.p /= 100;
                    plan.l = result[0].l;
                    plan.c = result[0].l.c;
                    plan.timestamp = Date.now();

                    if (!flexI) {
                        mega.buinsessAccount = mega.buinsessAccount || Object.create(null);
                        mega.buinsessAccount.cachedBusinessPlan = plan;
                    }

                    return plan;
                }
            }

            throw new MEGAException('Business plan not found.', {request, result}, 'NotFoundError');
        });
};

/**
 * Get business account list of invoices
 * @param {Boolean} forceUpdate         a flag to force getting info from API not using the cache
 * @returns {Promise}                   resolve if the operation succeeded
 */
BusinessAccount.prototype.getAccountInvoicesList = function (forceUpdate) {
    "use strict";
    var operationPromise = new MegaPromise();

    if (!forceUpdate) {
        if (mega.buinsessAccount && mega.buinsessAccount.invoicesList) {
            var currTime = new Date().getTime();
            if (mega.buinsessAccount.invoicesList.timestamp &&
                (currTime - mega.buinsessAccount.invoicesList.timestamp) < this.invoiceListUpdateFreq) {
                return operationPromise.resolve(1, mega.buinsessAccount.invoicesList.list);
            }
        }
    }

    var request = {
        "a": "il" // get a list of invoices
    };

    api_req(request, {
        callback: function (res) {
            if ($.isNumeric(res)) {
                operationPromise.reject(0, res, 'API returned error');
            }
            else if (typeof res === 'object') {
                var currTime = new Date().getTime();
                mega.buinsessAccount = mega.buinsessAccount || Object.create(null);
                var storedBills = Object.create(null);
                storedBills.timestamp = currTime;
                storedBills.list = res;
                mega.buinsessAccount.invoicesList = storedBills;
                operationPromise.resolve(1, res); // invoices list
            }
            else {
                operationPromise.reject(0, 4, 'API returned error, ret=' + res);
            }
        }

    });

    return operationPromise;
};

/**
 * adding business account attributes to business account
 * @param {Number} nbusers      number of users
 * @param {String} cname        company name
 * @param {String} tel          company phone
 * @param {String} fname        first name of the user
 * @param {String} lname        last name of the user
 * @param {String} email        email of the user
 * @param {String} pass         user's entered password
 * @param {Boolean} isUpgrade   a flag to tell that this is a user upgrade and no need to create the user
 * @returns {Promise}           resolve with the operation result
 */
BusinessAccount.prototype.setMasterUserAttributes =
    function (nbusers, cname, tel, fname, lname, email, pass, isUpgrade) {
        "use strict";
        var operationPromise = new MegaPromise();
        var mySelf = this;

        if (!tel) {
            return operationPromise.reject(0, 3, 'Empty phone');
        }
        if (!cname) {
            return operationPromise.reject(0, 4, 'Empty company name');
        }

        var request_upb = {
            "a": "upb",                                     // up - business
            "%name": base64urlencode(to8(cname)),    // company name
            "%phone": base64urlencode(to8(tel)),     // company phone
            // terms: 'Mq',
            // firstname: base64urlencode(to8(fname)),
            // lastname: base64urlencode(to8(lname)),
            // name2: base64urlencode(to8(fname + ' ' + lname))
        };

        if (nbusers) {
            request_upb['%nbusers'] = base64urlencode(to8(nbusers)); // nb of users
        }
        if (isUpgrade && u_attr && u_attr.b && u_attr.b.m && u_attr.b.bu && u_attr.b.s === -1) {
            api.screq(request_upb)
                .then(({result}) => {
                    assert(typeof result === 'string', `Unexpected response ${result}`);
                    operationPromise.resolve(1, result); // update success
                })
                .catch((ex) => {
                    operationPromise.reject(0, ex, `API returned error, ${ex}`);
                });
        }
        else {
            var businessKey = mySelf.creatBusinessAccountMasterKey();
            crypto_rsagenkey(false)
                .then((businessRSA) => {

                    request_upb.k = a32_to_base64(encrypt_key(u_k_aes, businessKey));
                    request_upb.pubk = base64urlencode(crypto_encodepubkey(businessRSA));
                    request_upb.privk = a32_to_base64(
                        encrypt_key(u_k_aes, str_to_a32(crypto_encodeprivkey(businessRSA)))
                    );

                    /* const keyPair = nacl.sign.keyPair();
                    const b_privEd25519 = asmCrypto.bytes_to_string(keyPair.secretKey.subarray(0, 32));
                    const b_pubEd25519 = asmCrypto.bytes_to_string(keyPair.publicKey);
                    const b_k_aes = new sjcl.cipher.aes(businessKey);
                    const enc_b_priv = a32_to_base64(encrypt_key(b_k_aes, str_to_a32(b_privEd25519)));
                    const enc_b_pub = base64urlencode(b_pubEd25519);

                    request_upb['%prv25519'] = enc_b_priv;
                    request_upb['+pub25519'] = enc_b_pub;
                    */

                    if (isUpgrade) {
                        return api.screq(request_upb)
                            .then(({result}) => {
                                assert(typeof result === 'string', `Unexpected response ${result}`);
                                operationPromise.resolve(1, result); // update success
                            })
                            .catch((ex) => {
                                operationPromise.reject(0, ex, `API returned error, ${ex}`);
                            });
                    }

                    return security.deriveKeysFromPassword(pass, u_k)
                        .then(({clientRandomValueBytes, encryptedMasterKeyArray32, hashedAuthenticationKeyBytes}) => {

                            // Encode parameters to Base64 before sending to the API
                            const sendEmailRequestParams = {
                                a: 'uc2',
                                n: base64urlencode(to8(`${fname} ${lname}`)),    // Name (used just for the email)
                                m: base64urlencode(email),                       // Email
                                crv: ab_to_base64(clientRandomValueBytes),       // Client Random Value
                                k: a32_to_base64(encryptedMasterKeyArray32),     // Encrypted Master Key
                                hak: ab_to_base64(hashedAuthenticationKeyBytes), // Hashed Authentication Key
                                v: 2                                             // Version of this protocol
                            };

                            return api.screq([request_upb, sendEmailRequestParams])
                                .then(({batch: res}) => {
                                    const [{result: u_h}, {result: uc2r}] = res;

                                    if (d) {
                                        console.debug('upb/uc2 combo', res);
                                    }

                                    if (typeof u_h !== 'string' || uc2r !== 0) {
                                        operationPromise.reject(0, res, 'API returned error');
                                    }
                                    else {
                                        security.register.sendAdditionalInformation(fname, lname);
                                        operationPromise.resolve(1, u_h); // user handle
                                    }
                                })
                                .catch((ex) => {
                                    if (d) {
                                        console.warn('upb/uc2 combo error', ex);
                                    }
                                    operationPromise.reject(0, ex, 'API returned error');
                                });
                        });
                })
                .catch(tell);
        }

        return operationPromise;
    };

/**
 * update the business account attributes (company)
 * @param {Object[]} attrs              array of key,val of attributes to update
 */
BusinessAccount.prototype.updateBusinessAttrs = function (attrs) {
    "use strict";
    var operationPromise = new MegaPromise();

    if (!attrs) {
        return operationPromise.reject(0, 19, 'Empty attributes array');
    }
    if (!attrs.length) {
        return operationPromise.resolve(1); // as nothing to change.
    }

    var request = {
        "a": "upb" // update business attr
    };

    for (var k = 0; k < attrs.length; k++) {
        request[attrs[k].key] = base64urlencode(to8(attrs[k].val));
    }

    api.screq(request)
        .then(({result}) => {
            assert(typeof result === 'string', `Unexpected response ${result}`);
            operationPromise.resolve(1, result); // update success
        })
        .catch((ex) => {
            operationPromise.reject(0, 4, `API returned error, ${ex}`);
        });

    return operationPromise;
};


/**
 * Do the payment with the API
 * @param {Object} payDetails       payment collected details from payment dialog
 * @param {Object} businessPlan     business plan details
 * @return {Promise}                resolve with the result
 */
BusinessAccount.prototype.doPaymentWithAPI = async function(payDetails, businessPlan) {
    "use strict";
    assert(payDetails, 'Empty payment details');
    assert(businessPlan, 'Empty business plan details');

    var boughtItemPrice = businessPlan.totalPrice;

    if (businessPlan.currInvoice && businessPlan.currInvoice.et) {
        boughtItemPrice = businessPlan.currInvoice.et;
    }

    var request = {
        a: 'uts',
        it: businessPlan.it,
        si: businessPlan.id,
        p: boughtItemPrice,
        c: businessPlan.c,
        aff: mega.affid,
        m: m,
        bq: 0,
        pbq: 0,
        num: [businessPlan.totalUsers | 0, 0, 0]        // number of users
    };
    if (businessPlan.quota) {
        request.num[1] = businessPlan.quota;
    }

    if (mega.uaoref) {
        request.uao = escapeHTML(mega.uaoref);
    }
    const salesIDs = [];
    const {pastInvoice = false, totalUsers, usedGatewayId, currInvoice} = businessPlan;

    // We need to make the uts request to add multiple sale IDs for Business,
    // also for Pro Flexi (if there is previous invoice to be added to the total)
    if (totalUsers > 0 || u_attr.pf && currInvoice.et > 0) {

        salesIDs.push((await api.screq(request)).result);
    }
    else {
        assert(pastInvoice.si, 'Invalid payment parameters.');
    }

    if (pastInvoice.si && !salesIDs.includes(pastInvoice.si)) {

        salesIDs.push(pastInvoice.si);
    }

    const utcRequest = {
        a: 'utc',                   // User Transaction Complete
        s: salesIDs,                // Sale ID
        m: usedGatewayId || addressDialog.gatewayId, // Gateway number
        bq: 0,                      // Log for bandwidth quota triggered
        extra: payDetails           // Extra information for the specific gateway
    };

    const {result} = await api.screq(utcRequest);

    assert(result && result.EUR, 'Invalid API Response.');

    return {result, saleId: salesIDs[0]};
};

/**
 * Get Tax name to be viewed on UI
 * @param {String} countryCode      country code to get Tax code abbreviation for
 */
BusinessAccount.prototype.getTaxCodeName = function(countryCode) {
    "use strict";
    /* var operationPromise = new MegaPromise();

    if (mega.buinsessAccount && mega.buinsessAccount.invoicesTaxName) {
        return operationPromise.resolve(1, mega.buinsessAccount.invoicesTaxName);
    }

    var request = {
        "a": "tn",
    };

    api_req(request, {
        callback: function(res) {
            if (typeof res === 'string') {
                mega.buinsessAccount = mega.buinsessAccount || Object.create(null);
                mega.buinsessAccount.invoicesTaxName = res;
                operationPromise.resolve(1, res); // user activated successfully, object contain lp + u
            }
            else {
                operationPromise.reject(0, 4, 'API returned error, ret=' + res);
            }
        }
    });

    return operationPromise; */
    return getTaxName(countryCode);
};

/**
 * resend invitation link to sub-user with new password
 * @param {String} subuserHandle        sub-user handle
 */
BusinessAccount.prototype.resendInvitation = function (subuserHandle) {
    "use strict";
    var operationPromise = new MegaPromise();

    if (!subuserHandle) {
        return operationPromise.reject(0, 11, 'Empty sub-user handle');
    }

    var request = {
        "a": "sbu",
        "aa": "r",
        "u": subuserHandle // user handle
    };

    api_req(request, {
        callback: function (res) {
            if (typeof res === 'object') {
                operationPromise.resolve(1, res); // user activated successfully, object contain lp + u
            }
            else {
                operationPromise.reject(0, 4, 'API returned error, ret=' + res);
            }
        }
    });

    return operationPromise;
};


/**
 * Ask API about due payments
 */
BusinessAccount.prototype.getOverduePayments = function() {
    "use strict";
    var operationPromise = new MegaPromise();

    var request = {
        "a": "iu"
    };

    api_req(request, {
        callback: function(res) {
            if (typeof res === 'object') {
                operationPromise.resolve(1, res);
            }
            else {
                operationPromise.reject(0, res, 'API returned error, ret=' + res);
            }
        }
    });

    return operationPromise;
};




/**
 * update a sub user attributes upon their change notification
 * @param {String} subuserHandle            Sub-user handle
 * @param {String[]} changedAttrs           Array of changed attributes names
 */
BusinessAccount.prototype.updateSubUserInfo = function (subuserHandle, changedAttrs) {
    "use strict";

    if (!subuserHandle) {
        return ;
    }
    var mySelf = this;

    var subUser = M.suba[subuserHandle];
    var isMasterAttr = false;
    var isSubAttr = false;

    var considereAttrs = ["%position", "%idnum", "%phonenum", "%location", '%name', '%phone',
        '%email', '%taxnum', '%address1', '%address2', '%city', '%state',
        '%country', '%zip'];
    var totalAttrs = 0;

    // if the user is not active, --> it wont be considered in contacts updating mechanisms
    if (subUser && subUser.s !== 0 && !M.u[subuserHandle]) {
        considereAttrs.push('lastname', 'firstname');
    }

    var attrFetched = function(res, ctx) {

        if (typeof res !== 'number') {
            if (ctx.ua === "e") {
                subUser.m = res;
                isSubAttr = true;
            }
            else if (ctx.ua === "firstname") {
                subUser.firstname = res;
                isSubAttr = true;
            }
            else if (ctx.ua === "lastname") {
                subUser.lastname = res;
                isSubAttr = true;
            }
            else if (ctx.ua === "%position") {
                subUser["position"] = res;
                isSubAttr = true;
            }
            else if (ctx.ua === "%idnum") {
                subUser["idnum"] = res;
                isSubAttr = true;
            }
            else if (ctx.ua === "%phonenum") {
                subUser["phonenum"] = res;
                isSubAttr = true;
            }
            else if (ctx.ua === "%location") {
                subUser["location"] = res;
                isSubAttr = true;
            }
            else {
                u_attr[ctx.ua] = from8(base64urldecode(res));
                isMasterAttr = true;
            }
        }

        if (!--totalAttrs) {
            if (isSubAttr) {
                mySelf.parseSUBA(subUser, false, true);
            }
            else if (isMasterAttr) {
                mBroadcaster.sendMessage('business:subuserUpdate', {});
            }
        }
    };

    for (var k = 0; k < changedAttrs.length; k++) {
        if (considereAttrs.indexOf(changedAttrs[k]) > -1) {
            totalAttrs++;
            mega.attr.get(subuserHandle, changedAttrs[k], -1, undefined, attrFetched);
        }
    }

};


BusinessAccount.prototype.resetSubUserPassword = async function(subuserHandle, password) {
    "use strict";
    assert(subuserHandle, 'Empty sub-user handle');
    assert(password && password.length > 9, 'Empty password/or not long enough');
    assert(window.u_attr && u_attr.b && u_attr.b.bprivk, 'Broken master account status');

    const {k, k2} = await this.getSubAccountMKey(subuserHandle);

    assert(k2 || k, 'Failed to get/decrypt subuser key');

    const request = {
        "a": "upsub",
        "su": subuserHandle // user handle
    };
    let subUserKey;
    if (k) {
        const business_privk = crypto_decodeprivkey(a32_to_str(decrypt_key(u_k_aes, base64_to_a32(u_attr.b.bprivk))));
        subUserKey = str_to_a32(crypto_rsadecrypt(base64urldecode(k), business_privk).substr(0, 16));
    }
    else {
        subUserKey = str_to_a32(this.decryptKey(base64urldecode(k2), subuserHandle));
    }

    const {
        clientRandomValueBytes,
        encryptedMasterKeyArray32,
        hashedAuthenticationKeyBytes
    } = await security.deriveKeysFromPassword(password, subUserKey);

    // Convert to Base64
    const encryptedMasterKeyBase64 = a32_to_base64(encryptedMasterKeyArray32);
    const hashedAuthenticationKeyBase64 = ab_to_base64(hashedAuthenticationKeyBytes);
    const clientRandomValueBase64 = ab_to_base64(clientRandomValueBytes);

    request.k = encryptedMasterKeyBase64;
    request.uh = hashedAuthenticationKeyBase64;
    request.crv = clientRandomValueBase64;

    // Send API request to change password
    const {result} = await api.screq(request);

    assert(typeof result === 'string' && result.length === 11, `Unexpected 'upsub' response, ${result}`);
    return result;
};


/** Create the master key for Business account
 * @returns {Array}     The key
 */
BusinessAccount.prototype.creatBusinessAccountMasterKey = function () {
    "use strict";
    var bKey = Array(4);
    for (var i = 4; i--;) {
        bKey[i] = rand(0x100000000);
    }
    return bKey;
};
