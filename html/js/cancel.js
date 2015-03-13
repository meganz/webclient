(function($, scope) {
    /**
     * Account closure/deletion
     *
     * @param opts {Object}
     * @constructor
     */
    var AccountClosure = function(opts) {
        var self = this;

        var defaultOptions = {
            'prefix': 'cancel',
            'code': '',
            'email': '',
            'secret': Math.random()
        };

        self.opt = $.extend(true, {}, defaultOptions, opts);
    };

    AccountClosure.prototype.initAccountClosure = function() {
        var self = this;
        $('.cancel-account-button').unbind('click');
        $('.cancel-account-button').bind('click', function() {
            
            self.opt.code = page.replace(self.opt.prefix, '');

            loadingDialog.show();
            self.opt.email = self._getEmail(self._accountClosure);
        });
    };

    /**
     * _accountClosure, closes account
     * 
     * @param {string} url code
     * @param {string} email
     * @param {string} hash
     * 
     */
    AccountClosure.prototype._accountClosure = function(code, email, hash) {
        api_resetuser({callback: function(code) {
                loadingDialog.hide();
                if (code === 0) {
                    msgDialog('info', 'Account is canceled', 'Your account has been canceled successfully.', '', function() {
                        
                        // If user canceling account from active session
                        if (u_type) {
                            mDBclear();
                            for (var i in localStorage) {
                                if (localStorage.hasOwnProperty(i)) {
                                    delete localStorage[i];
                                }
                            }
                            delete localStorage;
                        }
                        document.location.hash = 'login';
                    });
                }
                else if (code === EEXPIRED || code === ENOENT) {
                    msgDialog('warninga', 'Cancellation link has expired.', 'Cancellation link has expired, please try again.', '', function() {
                        document.location.hash = 'fm/account';
                    });
                }
            }}, code, email, hash);
    };

    /**
     * _getEmail, query server for email using given url code
     * 
     * @param {callback} on success call this function
     * 
     */
    AccountClosure.prototype._getEmail = function(callback) {
        var self = this;

        api_req({a: 'erv', c: self.opt.code}, {
            callback: function(res) {
                if (typeof res === 'number') {
                    if (res === EEXPIRED) {
                        loadingDialog.hide();
                        msgDialog('warninga', 'Cancellation link has expired.', 'Cancellation link has expired, please try again.', '', function() {
                            document.location.hash = 'fm/account';
                        });
                    }
                    else {
                        loadingDialog.hide();
                        msgDialog('warninga', 'Invalid cancelation link.', 'Invalid cancellation link, please try again.', '', function() {
                            document.location.hash = 'fm/account';
                        });
                    }
                }
                else {
                    if (res[0] === 21) {
                        self.opt.email = res[1];
                        callback(self.opt.code, self.opt.email, self.opt.secret.toString());
                    }
                }
            }
        });
    };

    //export
    scope.mega = scope.mega || {};
    scope.mega.AccountClosure = AccountClosure;
}(jQuery, window));
