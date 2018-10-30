(function($, scope) {
    /**
     * Account recovery, cancelation, deletion
     *
     * @param opts {Object}
     * @constructor
     */
    var AccountRecovery = function(opts) {
        var self = this;

        var defaultOptions = {
            'APARK': 10,
            'ARECOVER': 9
        };

        self.options = $.extend(true, {}, defaultOptions, opts);
    };

    AccountRecovery.prototype.initRecovery = function() {
        var self = this;

        $('.login-register-input input').unbind('focus');
        $('.login-register-input input').bind('focus', function() {
            $(this).parent().addClass('focused');
        });
        $('.login-register-input input').unbind('blur');
        $('.login-register-input input').bind('blur', function() {
            $(this).parent().removeClass('focused');
        });

        // We have Yes and No button
        $('.recover-button').rebind('click', function() {
            if ($(this).attr('class').indexOf('active') === -1) {
                $('.recover-button').removeClass('active');
                $('.recover-block').addClass('hidden');
                $(this).addClass('active');

                // Yes button, have master key
                if ($(this).attr('class').indexOf('yes') !== -1) {
                    $('.positive.recover-block').removeClass('hidden');
                }

                // No button, don't have master key
                else {
                    $('.negative.recover-block').removeClass('hidden');
                }
            }
        });

        // Send recovery email to address
        $('.backup-input-button').rebind('click', function() {
            self._startRecovery();
        });

        $('#recover-input1').unbind('keypress');
        $('#recover-input1').bind('keypress', function(e) {
            if (e.keyCode === 13) {
                self._startRecovery();
            }
        });

        $('#recover-input2').unbind('keypress');
        $('#recover-input2').bind('keypress', function(e) {
            if (e.keyCode === 13) {
                self._startRecovery();
            }
        });

        // Inform that can't recover with temporary sesstion
        if (u_type === 0) {
            msgDialog('info', l[135], l[1944], false, function() {
                loadSubPage('start');
            });
        }

        // Inform that current session can be used to backup master key
        else if (u_type) {
            msgDialog('warninga', l[135], l[1945].replace('[X]', u_attr.email), false, function() {
                loadSubPage('backup');
            });
        }
    };

    /**
     *
     * @param {integer} actions: recover, park
     *
     */
    AccountRecovery.prototype._startRecovery = function() {
        var self = this;

        var t,
            email = '',
            c = $('.recover-button.no').attr('class');

        // Park account
        if (c && c.indexOf('active') > -1) {
            email = $('#recover-input2').val();
            t = self.options.APARK;
        }

        // Recover account using backup master key
        else {
            email = $('#recover-input1').val();
            t = self.options.ARECOVER;
        }

        if (checkMail(email)) {
            msgDialog('warninga', l[1100], l[1101]);
        } else {
            loadingDialog.show();
            api_req({a: 'erm', m: email, t: t}, {
                callback: function(res) {
                    loadingDialog.hide();
                    if (res === ENOENT) {
                        msgDialog('warningb', l[1513], l[1946]);
                    } else if (res === 0) {
                        handleResetSuccessDialogs('.reset-success', l[735], 'resetsuccess');
                    } else {
                        msgDialog('warningb', l[135], l[200]);
                    }
                }
            });
        }
    };

    //export
    scope.mega = scope.mega || {};
    scope.mega.AccountRecovery = AccountRecovery;
})(jQuery, window);
