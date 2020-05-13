(function($, scope) {
    /**
     * Account closure/deletion
     *
     * @param opts {Object}
     * @constructor
     */
    var AccountClosure = function(opts) {

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
            'tOut': 3000,
            'fbDlgClass': '.reset-success-st3',
            'feedbackText': '',
            'fbType': 'accClosureUserFeedback'
        };

        this.opt = $.extend(true, {}, defaultOptions, opts);
    };

    AccountClosure.prototype._initAccountClosure = function() {

        $('body').removeClass('overlayed');
        $('.fm-dialog').removeClass('error active');
        $('.fm-dialog' + this.opt.fbDlgClass)
            .addClass('hidden')
            .removeClass('active');

        this._accountClosure(this.opt.code, u_attr.email, this.opt.secret.toString());
    };

    /**
     * Closes the user's account
     *
     * @param {String} code Email confirm code
     * @param {String} email The user's email address
     * @param {String} password The user's password
     *
     */
    AccountClosure.prototype._accountClosure = function(code, email, password) {

        localStorage.beingAccountCancellation = 1;

        loadingDialog.show();

        // Park the current account, then create a new account with a random password
        security.resetUser(code, email, password, function(code) {

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
        });
    };

    /**
     * _getEmail, query server for email using given url code
     *
     * @param {callback} on success call this function
     *
     */
    AccountClosure.prototype._getEmail = function() {

        var self = this;
        var promise = new MegaPromise();

        // Get the email cancel code
        this.opt.code = page.replace(this.opt.prefix, '');

        api_req({a: 'erv', c: this.opt.code}, {
            callback: function(res) {
                if (typeof res === 'number') {
                    if (res === EEXPIRED) {
                        loadingDialog.hide();
                        msgDialog('warninga', l[6184], l[6185], '', function() {
                            loadSubPage('fm/account');
                        });
                        promise.reject(res);
                    }
                    else {
                        loadingDialog.hide();
                        msgDialog('warninga', l[6186], l[6187], '', function() {
                            loadSubPage('fm/account');
                        });
                        promise.reject(res);
                    }
                }
                else {
                    if (res[0] === 21) {
                        self.opt.email = res[1];
                        promise.resolve();
                    }
                }
            }
        });

        return promise;
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
            text = "I am moving to another cloud storage provider";
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
        $(self.opt.fbDlgClass + ' #res5_div')
            .attr('class', 'radioOn')
            .next().addClass('active');
        $('.fm-dialog' + self.opt.fbDlgClass).removeClass('hidden');

        $.dialog = self.opt.fbDlgName;

        // Send feedback button listener
        $(self.opt.fbDlgClass + ' .feedback-submit').rebind('click', function() {

            self.opt.feedbackText = self._prepareJsonString(self._gatherFeedback());
            api_req({ 'a': 'clog', 't': self.opt.fbType, 'd': self.opt.feedbackText });

            self._initAccountClosure();
        });

        // Cancel button listener
        $(self.opt.fbDlgClass + ' .cancel').rebind('click', function() {

            self.opt.feedbackText = self._prepareJsonString("User did NOT provide feedback.");
            api_req({ 'a': 'clog', 't': self.opt.fbType, 'd': self.opt.feedbackText });

            self._initAccountClosure();
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

    AccountClosure.prototype.validateCodeWithSession = function() {

        var self = this;
        var promise = new MegaPromise();

        var getProsmie = this._getEmail().done(function() {
            if (self.opt.email === u_attr.email) {
                promise.resolve();
            }
            else {
                promise.reject();
            }
        });

        promise.linkFailTo(getProsmie);

        return promise;
    };

    //export
    scope.mega = scope.mega || {};
    scope.mega.AccountClosure = AccountClosure;
}(jQuery, window));
