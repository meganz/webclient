/**
 * a class to apply actions on business account in collaboration with API
 */
function BusinessAccount() {

}

/**
 * Function to add sub user to a business account
 * @param {String} subEmail : email address of new user
 * @param {String} subFName : First name of new user
 * @param {String} subLName : Last name of new user
 * @returns {MegaPromise} Resolves with new add user HANDLE
 */
BusinessAccount.prototype.addSubAccount = function _addSubAccount(subEmail, subFName, subLName) {
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
 * Function to delete sub user from business account
 * @param {String} subUserHandle    sub user handle to delete
 */
BusinessAccount.prototype.delSubAccount = function _delSubAccount(subUserHandle) {
    if (!subUserHandle || subUserHandle !== 11) {

    }
};