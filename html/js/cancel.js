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

            // Make sure that user is logged out
            if (u_type) {
                // Logout user
            }            
        });
    };

    /**
     * _accountClosure, closes account
     * 
     * @returns {undefined}
     */
    AccountClosure.prototype._accountClosure = function(code, email, hash) {
        var self = this;

        api_resetuser({callback: function(code) {
                loadingDialog.hide();
                if (code === 0) {
                    msgDialog('info', l[1975], l[1976], '', function() {
                        login_email = recoveryemail;
                        document.location.hash = 'login';
                    });
                }
                else if (code === EKEY) {
                    msgDialog('warningb', l[1977], l[1978]);
                    $('.recover-block.error').removeClass('hidden');
                }
                else if (code === EBLOCKED)
                {
                    msgDialog('warningb', l[1979], l[1980]);
                }
                else if (code === EEXPIRED || code === ENOENT) {
                    msgDialog('warninga', l[1966], l[1967], '', function() {
                        document.location.hash = 'recovery';
                    });
                }
            }}, code, email, hash);
    };

    /**
     * _getEmail, query server for email using given url code
     * 
     * @param {callback} on success call this function
     * @returns {undefined}
     */
    AccountClosure.prototype._getEmail = function(callback) {
        var self = this;

        api_req({a: 'erv', c: self.opt.code}, {
            callback: function(res) {
                if (typeof res === 'number') {
                    if (res === EEXPIRED) {
                        msgDialog('warninga', l[1966], l[1967], '', function() {
                            document.location.hash = 'recovery';
                        });
                    }
                    else {
                        msgDialog('warninga', l[1968], l[1969], '', function() {
                            document.location.hash = 'recovery';
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
