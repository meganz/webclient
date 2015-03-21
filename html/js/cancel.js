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
            'secret': Math.random(),
            'dialogClass': '.reset-success-st2',
            'dlgName': 'resetsuccessst2',
            'passwordInputId': '#reset_success_st2_pass',
            'inputWrapperClass': '.fm-account-input',
            'tOut' : 1000
        };

        self.opt = $.extend(true, {}, defaultOptions, opts);
    };

    AccountClosure.prototype.initAccountClosure = function() {
        var self = this;
        
        $(self.opt.passwordInputId).val('');
        $('.fm-dialog').removeClass('error active');
        $('.fm-dialog-overlay').removeClass('hidden');
        $('body').addClass('overlayed');
        $('.fm-dialog' + self.opt.dialogClass).removeClass('hidden');    

        $.dialog = self.opt.dlgName;

        $(self.opt.passwordInputId).focus(function() {
            $('.fm-dialog').addClass('active');
        });
        
        $(self.opt.dialogClass + ' .fm-dialog-button.close-account').rebind('click', function(e) {
        
            if ($(this).hasClass('close-account')) {
                loadingDialog.show();

                self.opt.code = page.replace(self.opt.prefix, '');
                postLogin(u_attr.email, $(self.opt.passwordInputId).val(), false, function(r) {
                    loadingDialog.hide();

                    // Password is matched
                    if (r) {
                        self._getEmail(self._accountClosure);
                    }

                    // Password is wrong
                    else {
                        $(self.opt.passwordInputId).val('');
                        $('.fm-dialog').addClass('error');
                        setTimeout(function() {
                            $('.fm-dialog').removeClass('error');
                        }, self.opt.tOut);
                        $(self.opt.passwordInputId).focus();
                    }
                });
            }
        });

        $(self.opt.dialogClass + ' .fm-dialog-button.cancel').rebind('click', function() {
                loadingDialog.hide();
                document.location.hash = 'fm/account';
        });
        
        $(self.opt.passwordInputId).rebind('keypress', function(e) {
            
            var key = e.wich || e.keyCode;
            
            if (key === 13) {
                $(self.opt.dialogClass + ' .fm-dialog-button.close-account').click();
            }
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
                        closeDialog();
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
                        if (callback) {
                            callback(self.opt.code, self.opt.email, self.opt.secret.toString());
                        }
                    }
                }
            }
        });
    };

    //export
    scope.mega = scope.mega || {};
    scope.mega.AccountClosure = AccountClosure;
}(jQuery, window));
