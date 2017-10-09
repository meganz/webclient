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

    AccountClosure.prototype._initAccountClosure = function(_accountClosureCallback, obj) {
        $(obj.opt.passwordInputId).val('');
        $('.fm-dialog').removeClass('error active');
        $('.fm-dialog-overlay').removeClass('hidden');
        $('body').addClass('overlayed');
        $('.fm-dialog' + obj.opt.dialogClass)
            .removeClass('hidden')
            .addClass('active');
        $(obj.opt.passwordInputId).focus();
        $('.fm-dialog' + obj.opt.fbDlgClass)
            .addClass('hidden')
            .removeClass('active');

        $.dialog = obj.opt.dlgName;

        // Close account, password confimation dialog
        $(obj.opt.dialogClass + ' .close-account').rebind('click', function(e) {

            loadingDialog.show();

            obj.opt.code = page.replace(obj.opt.prefix, '');

            // Check is entered password correct
            postLogin(u_attr.email, $(obj.opt.passwordInputId).val(), false, function(r) {

                loadingDialog.hide();

                if (r) {// Password is matched
                    if (_accountClosureCallback) {
                        _accountClosureCallback(obj.opt.code, obj.opt.email, obj.opt.secret.toString());
                    }
                }
                else {// Password is wrong
                    $(obj.opt.passwordInputId).val('');
                    $('.fm-dialog').addClass('error');
                    setTimeout(function() {
                        $('.fm-dialog').removeClass('error');
                    }, obj.opt.tOut);
                    $(obj.opt.passwordInputId).focus();
                }
            });
        });

        // Cancel button listener
        $(obj.opt.dialogClass + ' .cancel').rebind('click', function() {
            loadingDialog.hide();
            loadSubPage('fm/account');
        });

        // Keyboard button listener <Enter key> or  <Esc>
        $(obj.opt.passwordInputId).rebind('keypress.st2_kp', function(e) {

            var key = e.wich || e.keyCode;

            // Return/Enter
            if (key === 13) {
                $(obj.opt.dialogClass + ' .close-account').click();
            }

            // Esc
            if (key === 27) {
                $(obj.opt.dialogClass + ' .cancel').click();
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
        localStorage.beingAccountCancellation = 1;

        api_resetuser({callback: function(code) {
            closeDialog();
            $('.reset-success-st2')
                .removeClass('active')
                .addClass('hidden');
            loadingDialog.hide();

            if (code === 0) {
                // Account successfully canceled/deleted
                u_logout(true);
                location.reload();
            }
            else if (code === EEXPIRED || code === ENOENT) {
                delete localStorage.beingAccountCancellation;

                msgDialog('warninga', l[6184], l[6185], '', function() {
                    loadSubPage('fm/account');
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
    AccountClosure.prototype._getEmail = function(_handleFeedbackCallback, callback_obj) {
        var self = this;

        api_req({a: 'erv', c: self.opt.code}, {
            callback: function(res) {
                if (typeof res === 'number') {
                    if (res === EEXPIRED) {
                        loadingDialog.hide();
                        msgDialog('warninga', l[6184], l[6185], '', function() {
                            loadSubPage('fm/account');
                        });
                    }
                    else {
                        loadingDialog.hide();
                        msgDialog('warninga', l[6186], l[6187], '', function() {
                            loadSubPage('fm/account');
                        });
                    }
                }
                else {
                    if (res[0] === 21) {
                        self.opt.email = res[1];
                        if (_handleFeedbackCallback) {
                            _handleFeedbackCallback(callback_obj);
                        }
                    }
                }
            }
        });
    };

    AccountClosure.prototype._gatherFeedback = function() {
        var text = '',
            comment = '',
            btnId = $('.reset-success-st3 .radioOn').attr('id');

        if (btnId === 'res1_div') {
            text = "I don't use my account anymore";
        }
        else if (btnId === 'res2_div') {
            text = 'I have another MEGA account';
        }
        else if (btnId === 'res3_div') {
            text = 'I have experienced too many problems';
        }
        else if (btnId === 'res4_div') {
            text = "My favourite browser is not technologically compatible and I don't want to change";
        }
        else if (btnId === 'res5_div') {
            text = "I find the interface too confusing to use";
        }
        else if (btnId === 'res6_div') {
            text = "MEGA has under-delivered on its promise";
        }
        else if (btnId === 'res7_div') {
            text = "Other reasons";
        }

        return text;
    };

    AccountClosure.prototype._prepareJsonString = function(text) {

        var result = '{"lang": "' + lang + '", "feedbackText": "' + text + '"}';

        return result;
    };

    AccountClosure.prototype.handleFeedback = function() {
        var self = this;

        // Reset feedback dialog to default state
        $(self.opt.fbDlgClass + ' .radioOn').attr('class', 'radioOff');
        $(self.opt.fbDlgClass + ' .radio-txt').removeClass('active');
        $(self.opt.fbDlgClass + ' #res1_div')
            .attr('class', 'radioOn')
            .next().addClass('active');
        $('.fm-dialog' + self.opt.fbDlgClass).removeClass('hidden');

        $.dialog = self.opt.fbDlgName;

        // Send feedback button listener
        $(self.opt.fbDlgClass + ' .feedback-submit').rebind('click', function() {

            self.opt.feedbackText = self._prepareJsonString(self._gatherFeedback());
            api_req({ 'a': 'clog', 't': self.opt.fbType, 'd': self.opt.feedbackText });

            self._initAccountClosure(self._accountClosure, self);
        });

        // Cancel button listener
        $(self.opt.fbDlgClass + ' .cancel').rebind('click', function() {

            self.opt.feedbackText = self._prepareJsonString("User did NOT provide feedback.");
            api_req({ 'a': 'clog', 't': self.opt.fbType, 'd': self.opt.feedbackText });

            self._initAccountClosure(self._accountClosure, self);
        });


        // Keyboard button listener
        $(self.opt.fbDlgClass).rebind('keypress.st3_kp', function(e) {

            var key = e.wich || e.keyCode;

            // Return | Enter
            if (key === 13) {
                $(self.opt.fbDlgClass + ' .feedback-submit').click();
            }

            // Esc
            if (key === 27) {
                $(self.opt.fbDlgClass + ' .cancel').click();
            }
        });

        $('.reset-success-st3 input[type=radio]').rebind('change', function() {
            $('.reset-success-st3 .radioOn').removeClass('radioOn').addClass('radioOff');
            $('.reset-success-st3 .radio-txt').removeClass('active');
            $(this).removeClass('radioOff').addClass('radioOn').parent().removeClass('radioOff').addClass('radioOn').next().addClass('active');
        });

    };

    //export
    scope.mega = scope.mega || {};
    scope.mega.AccountClosure = AccountClosure;
}(jQuery, window));
