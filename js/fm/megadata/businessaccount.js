/**
 * a class to apply actions on business account in collaboration with API
 */
function BusinessAccount() {
    this.QuotaUpdateFreq = 15000; // 15 sec - default threshold to update quotas info
}

/**
 * Function to add sub user to a business account
 * @param {String} subEmail  email address of new user
 * @param {String} subFName  First name of new user
 * @param {String} subLName  Last name of new user
 * @returns {Promise}        Resolves with new add user HANDLE + password
 */
BusinessAccount.prototype.addSubAccount = function (subEmail, subFName, subLName) {
    "use strict";
    var operationPromise = new MegaPromise();
    if (checkMail(subEmail)) {
        // promise reject/resolve will return: success,errorCode,errorDesc
        return operationPromise.reject(0, 1,'Invalid Email');
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
        "fn": subFName, // first name of user to add (not base64 encoded like attributes are)
        "ln": subLName // last name of user to add (also not base64 encoded)
    };

    api_req(request, {
        callback: function (res) {
            if ($.isNumeric(res)) {
                operationPromise.reject(0, res, 'API returned error', request);
            }
            else if (typeof res === 'object') {
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
 * Function to deactivate sub user from business account
 * @param {String} subUserHandle    sub user handle to deactivate
 * @returns {Promise}               Resolves deactivate opertation result
 */
BusinessAccount.prototype.deActivateSubAccount = function (subUserHandle) {
    "use strict";
    var operationPromise = new MegaPromise();
    if (!subUserHandle || subUserHandle.length !== 11) {
        return operationPromise.reject(0, 5, 'invalid U_HANDLE');
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
 * @returns {Promise}               Resolves activate opertation result
 */
BusinessAccount.prototype.activateSubAccount = function (subUserHandle) {
    "use strict";
    var operationPromise = new MegaPromise();
    if (!subUserHandle || subUserHandle.length !== 11) {
        return operationPromise.reject(0, 5, 'invalid U_HANDLE');
    }
    var request = {
        "a": "sbu", // business sub account operation
        "aa": "c", // activate operation
        "u": subUserHandle // user handle to activate
    };

    api_req(request, {
        callback: function (res) {
            if ($.isNumeric(res)) {
                operationPromise.reject(0, res, 'API returned error');
            }
            else if (typeof res === 'object') {
                operationPromise.resolve(1, res, request); // user activated successfully
            }
            else {
                operationPromise.reject(0, 4, 'API returned error, ret=' + res);
            }
        }

    });

    return operationPromise;
};

/**
 * Function to get the master key of a sub user in business account
 * @param {String} subUserHandle    sub user handle to get the master key of
 * @returns {Promise}               Resolves opertation result
 */
BusinessAccount.prototype.getSubAccountMKey = function (subUserHandle) {
    "use strict";
    var operationPromise = new MegaPromise();
    if (!subUserHandle || subUserHandle.length !== 11) {
        return operationPromise.reject(0, 5, 'invalid U_HANDLE');
    }
    var request = {
        "a": "sbu", // business sub account operation
        "aa": "k", // get master-key operation
        "u": subUserHandle // user handle to get key of
    };

    api_req(request, {
        callback: function (res) {
            if ($.isNumeric(res)) {
                operationPromise.reject(0, res, 'API returned error');
            }
            else if (typeof res === 'string') {
                operationPromise.resolve(1, res); // sub-user master-key
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
        "aa": "q" // get quota info
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
 * a function to parse the JSON object recived holding information about a sub-account of a business account.
 * @param {string} suba    the object to parse, it must contain a sub-account ids
 * @param {boolean} ignoreDB if we want to skip DB updating
 * @param {boolean} fireUIEvent if we want to fire a n event to update ui
 */
BusinessAccount.prototype.parseSUBA = function (suba, ignoreDB, fireUIEvent) {
    "use strict";
    if (M) {
        M.isBusinessAccountMaster = 1; // init it, or re-set it

        if (mega.config.get('isBusinessMasterAcc') !== '1') {
            mega.config.set('isBusinessMasterAcc', '1');
            // i used config to store user type (if he's a master business account). because this was
            // the only possible way considering that API team [Jon] decided to provide user status 
            // in a:f [get user tree] response in [suba] array, and to deduce the type of the user by 
            // the existance of this array!
            // the problem is when we load using our local DB, we cant tell if the empty "sub account" table we have
            // is to due to non-master-business account, or due to a master account without sub-accounts yet.
            // The applied solution by API is ineffecient. 
            // --> the applied soultion is not logical [storing user type in configuration]
        }
        if (!M.suba) {
            M.suba = [];
        }
        if (!suba) {
            return;
        }
        M.suba[suba.u] = suba; // i will keep deleted in sub-accounts in DB and MEM as long as i recieve them
        /**
         * SUBA object:
         *      -u: handle
         *      -p: parent {for future multilevel business accounts}
         *      -s: status {10=pending confirmation , 11:disabled, 12:deleted, 0:enabled and ok}
         *      -e: email
         *      -firstname
         *      -lastname
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
 * @returns {boolean}   true if the user is a Master B-Account
 */
BusinessAccount.prototype.isBusinessMasterAcc = function () {
    if (M.isBusinessAccountMaster || M.suba && M.suba.length) {
        return true;
    }
    return false;
};

/**
 * Decrypting the link sent to sub-account using a password 
 * @param {string} link         invitation link #businesssignup<link> without #businesssignup prefix
 * @param {string} password     The passowrd which the sub-user entered to decrypt the link
 * @returns {string}            base64 signup-code (decryption result)
 */
BusinessAccount.prototype.decryptSubAccountInvitationLink = function (link, password) {
    if (!link || !password) {
        return null;
    }
    try {
        var keyFromPassword = base64_to_a32(password);
        var aesCipher = new sjcl.cipher.aes(keyFromPassword);
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
 * Get info assosiated with signup code
 * @param {string} signupCode       signup code to fetch infor for
 * @returns {Promise}                Promise resolves an object contains fetched info
 */
BusinessAccount.prototype.getSignupCodeInfo = function (signupCode) {
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