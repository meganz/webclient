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
            'fbDlgName': 'resetsuccessst3',
            'passwordInputId': '#reset_success_st2_pass',
            'inputWrapperClass': '.fm-account-input',
            'tOut': 1000,
            'fbDlgClass': '.reset-success-st3',
            'feedbackText': '',
            'fbType': 'accClosureUserFeedback'
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

        // Button cloase account listener
        $(self.opt.dialogClass + ' .fm-dialog-button.close-account').rebind('click', function(e) {

//            if ($(this).hasClass('close-account')) {
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
//            }
        });

        // Cancel button listener
        $(self.opt.dialogClass + ' .fm-dialog-button.cancel').rebind('click', function() {
            loadingDialog.hide();
            document.location.hash = 'fm/account';
        });

        // Keyboard button listener <Enter key>
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
        var self = this;

        api_resetuser({callback: function(code) {
                closeDialog();
                loadingDialog.hide();

                if (code === 0) {
                    self._handleFeedback();

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

    AccountClosure.prototype._deleteLeftovers = function() {
        mDBclear();
        for (var i in localStorage) {
            if (localStorage.hasOwnProperty(i)) {
//                delete localStorage[i];
            }
        }
        delete localStorage;
        closeDialog();
        document.location.hash = 'login';
    };

    AccountClosure.prototype._gatherFeedback = function() {
        var text = '';

        // Other: Textarea, $('.feedback-textarea textarea').val()
        if ($('.radioOn').attr('id') === 'res1_div') {
            text = "I don’t use my account anymore";
        }
        else if ($('.radioOn').attr('id') === 'res2_div') {
            text = 'I have another MEGA account';
        }
        else if ($('.radioOn').attr('id') === 'res3_div') {
            text = 'I have experienced too many problems';
        }
        else if ($('.radioOn').attr('id') === 'res4_div') {
            text = "My favourite browser is not technologically compatible and I don't want to change";
        }
        else if ($('.radioOn').attr('id') === 'res5_div') {
            text = "I find the interface too confusing to use";
        }
        else if ($('.radioOn').attr('id') === 'res6_div') {
            text = "MEGA has under-delivered on its promise";
        }
        else {
            text = $('.radio-txt.active').text();
        }

        return text;
    };

    AccountClosure.prototype._prepareJsonString = function(text) {
        var result;

        result = '{"lang": "' + lang + '", "feedbackText": "' + text + '"}';

        return result;
    };

    AccountClosure.prototype._handleFeedback = function() {
        var self = this;
//                $('.fm-dialog-overlay').removeClass('hidden');
//                $('body').addClass('overlayed');
        $('.fm-dialog' + self.opt.fbDlgClass).removeClass('hidden');

        $.dialog = self.opt.fbDlgName;

        // Send feedback button listener
        $(self.opt.fbDlgClass + ' .fm-dialog-button.feedback-submit').rebind('click', function() {

            self.opt.feedbackText = self._prepareJsonString(self._gatherFeedback());
            api_req({'a': 'clog', 't': self.opt.fbType, 'd': self.opt.feedbackText});
            self._deleteLeftovers();
        });

        // Cancel button listener
        $(self.opt.fbDlgClass + ' .fm-dialog-button.cancel').rebind('click', function() {

            self.opt.feedbackText = self._prepareJsonString("User did NOT provide feedback.");
            api_req({'a': 'clog', 't': self.opt.fbType, 'd': self.opt.feedbackText});
            self._deleteLeftovers();
        });

        // Keyboard button listener <Enter key>
        $(self.opt.fbDlgClass).rebind('keypress', function(e) {

            var key = e.wich || e.keyCode;

            if (key === 13) {
                $(self.opt.fbDlgClass + ' .fm-dialog-button.feedback-button').click();
            }
        });

    };

    //export
    scope.mega = scope.mega || {};
    scope.mega.AccountClosure = AccountClosure;
}(jQuery, window));
