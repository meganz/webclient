/**
 * a class to apply actions on business account in collaboration with API
 */
function BusinessAccount() {

}

/**
 * Function to add sub user to a business account
 * @param {String} subEmail  email address of new user
 * @param {String} subFName  First name of new user
 * @param {String} subLName  Last name of new user
 * @returns {Promise}        Resolves with new add user HANDLE
 */
BusinessAccount.prototype.addSubAccount = function _addSubAccount(subEmail, subFName, subLName) {
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
                operationPromise.reject(0, res, 'API returned error');
            }
            else if (typeof res === 'string') {
                operationPromise.resolve(1, res); // new added user handle
            }
            else {
                operationPromise.reject(0, 4, 'API returned error, ret=' + res);
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
BusinessAccount.prototype.deActivateSubAccount = function _deActivateSubAccount(subUserHandle) {
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
BusinessAccount.prototype.activateSubAccount = function _activateSubAccount(subUserHandle) {
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
                if (res !== 0) {
                    operationPromise.reject(0, res, 'API returned error');
                }
                else {
                    operationPromise.resolve(1); // user activated successfully
                }
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
BusinessAccount.prototype.getSubAccountMKey = function _getSubAccountMKey(subUserHandle) {
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
 * a function to parse the JSON object recived holding information about a sub-account of a business account.
 * @param {string} suba    the object to parse, it must contain a sub-account ids
 * @param {boolean} ignoreDB if we want to skip DB updating
 */
BusinessAccount.prototype.parseSUBA = function _parseSUBA(suba, ignoreDB) {
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
        if (!suba) {
            return;
        }
        if (!M.suba) {
            M.suba = [];
        }
        M.suba[suba.u] = suba; // i will keep deleted in sub-accounts in DB and MEM as long as i recieve them
        /**
         * SUBA object:
         *      -u: handle
         *      -p: parent {for future multilevel business accounts}
         *      -s: status {10=pending confirmation , 11:disabled, 12:deleted, 0:enabled and ok}
         */
    }
    if (fmdb && !ignoreDB && !pfkey && !folderlink) {
        fmdb.add('suba', { s_ac: suba.u, d: suba });
    }
};