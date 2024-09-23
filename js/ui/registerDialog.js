(function(scope) {
    'use strict';
    var options = {};

    /*jshint -W074*/
    // ^ zxcvbn stuff..

    function closeRegisterDialog($dialog, isUserTriggered) {
        console.assert(options.closeDialog || $.dialog === 'register', 'Invalid state...');

        if (options.closeDialog) {
            options.closeDialog();
        }
        else if ($.dialog === 'register') {
            delete $.registerDialog;
            closeDialog();

            $(window).off('resize.proregdialog');
            $('.fm-dialog-overlay').off('click.registerDialog');
            $('button.js-close', $dialog).off('click.registerDialog');
            $('input', $dialog).val('');
            $('.understand-check', $dialog).removeClass('checkboxOn').addClass('checkboxOff');
            $('.register-check', $dialog).removeClass('checkboxOn').addClass('checkboxOff');

            if (isUserTriggered && options.onDialogClosed) {
                options.onDialogClosed($dialog);
            }
        }

        options = {};
    }

    function doProRegister($dialog, aPromise) {
        const rv = {};
        const hideOverlay = () => {
            loadingDialog.hide();
            $dialog.removeClass('arrange-to-back');
        };

        const $button = $('button:not(.js-close)', $dialog).addClass('disabled');
        if (options.onCreatingAccount) {
            options.onCreatingAccount($dialog);
        }
        loadingDialog.show();
        $dialog.addClass('arrange-to-back');

        if (u_type > 0) {
            hideOverlay();
            msgDialog('warninga', l[135], l[5843]);
            $button.removeClass('disabled');
            return false;
        }

        const registrationDone = (login) => {

            const onAccountCreated = options.onAccountCreated && options.onAccountCreated.bind(options);

            hideOverlay();
            closeRegisterDialog($dialog);
            $('.mega-dialog.registration-page-success').off('click');

            if (login) {
                Soon(() => {
                    showToast('megasync', l[8745]);
                    $('.fm-avatar img').attr('src', useravatar.mine());
                });
            }
            onIdle(topmenuUI);

            if (typeof onAccountCreated === 'function') {
                onAccountCreated(login, rv);
            }
            else {
                // $('.mega-dialog.registration-page-success').removeClass('hidden');
                // fm_showoverlay();
                // ^ legacy confirmation dialog, with no email change option
                sendSignupLinkDialog(rv);
            }

            if (aPromise) {
                aPromise.resolve();
            }
        };

        /**
         * Continue the old method Pro registration
         * @param {Number} result The result of the 'uc' API request
         * @param {Boolean} oldMethod Using old registration method.
         */
        const continueProRegistration = (result, oldMethod) => {
            $button.removeClass('disabled');
            if (result === 0) {
                if (oldMethod) {
                    var ops = {
                        a: 'up',
                        terms: 'Mq',
                        name2: base64urlencode(to8(rv.name)),
                        lastname: base64urlencode(to8(rv.last)),
                        firstname: base64urlencode(to8(rv.first))
                    };
                    u_attr.terms = 1;

                    if (mega.affid) {
                        ops.aff = mega.affid;
                    }

                    api_req(ops);
                }
                registrationDone();
            }
            else {
                u_logout();
                hideOverlay();
                // closeRegisterDialog($dialog, true);
                $('.mega-dialog:visible').addClass('arrange-to-back');
                if (result === EEXIST) {
                    fm_hideoverlay();
                    msgDialog('warninga', l[1578], l[7869]);
                    options.$dialog.find('input.email').megaInputsShowError(l[1297]);
                }
                else {
                    msgDialog('warninga', l[1578], l[200], api_strerror(result), () => {
                        if ($('.mega-dialog:visible').removeClass('arrange-to-back').length) {
                            fm_showoverlay();
                        }
                    });
                }
            }
        };

        /**
         * Continue the new method registration
         * @param {Number} result The result of the 'uc2' API request
         */
        const continueNewProRegistration = (result) => {
            continueProRegistration(result, false);
        };

        /**
         * The main function to register the account
         */
        const registeraccount = function() {

            rv.password = $('input.pass', $dialog).val();
            rv.first = $.trim($('input.f-name', $dialog).val());
            rv.last = $.trim($('input.l-name', $dialog).val());
            rv.email = $.trim($('input.email', $dialog).val());
            rv.name = rv.first + ' ' + rv.last;

            // Set a flag that the registration came from the Pro page
            const fromProPage = sessionStorage.getItem('proPageContinuePlanNum') !== null;

            // Set the signup function to start the new secure registration process
            security.register.startRegistration(
                rv.first,
                rv.last,
                rv.email,
                rv.password,
                fromProPage,
                continueNewProRegistration);
        };

        let err = false;
        const $formWrapper = $('form', $dialog);
        const $firstName = $('input.f-name', $formWrapper);
        const $lastName = $('input.l-name', $formWrapper);
        const $email = $('input.email', $formWrapper);
        const $password = $('input.pass', $formWrapper);
        const $confirmPassword = $('input.confirm-pass', $formWrapper);

        const firstName = $.trim($firstName.val());
        const lastName = $.trim($lastName.val());
        const email = $.trim($email.val());
        const password = $password.val();
        const confirmPassword = $confirmPassword.val();

        // Check if the entered passwords are valid or strong enough
        const passwordValidationResult = security.isValidPassword(password, confirmPassword);

        // If bad result
        if (passwordValidationResult !== true) {

            // Show error for password field, clear the value and refocus it
            $password.val('').trigger('input');
            $password.focus();
            $password.megaInputsShowError(l[1102] + ' ' + passwordValidationResult);

            // Show error for confirm password field and clear the value
            $confirmPassword.val('');
            $confirmPassword.blur();
            $confirmPassword.megaInputsShowError();

            // Make These two error disappear together
            $password.rebind('input.hideError', () => {
                $confirmPassword.megaInputsHideError();
                $password.off('input.hideError');
                $confirmPassword.off('input.hideError');
            });

            $confirmPassword.rebind('input.hideError', () => {
                $password.megaInputsHideError();
                $password.off('input.hideError');
                $confirmPassword.off('input.hideError');
            });

            err = 1;
        }

        if (email === '' || !isValidEmail(email)) {
            $email.megaInputsShowError(l[1100] + ' ' + l[1101]);
            $email.focus();
            err = 1;
        }

        if (firstName === '' || lastName === '') {
            $firstName.megaInputsShowError(l[1098] + ' ' + l[1099]);
            $lastName.megaInputsShowError();
            $firstName.focus();

            // Make These two error disappear together
            $firstName.rebind('input.hideError', () => {
                $lastName.megaInputsHideError();
                $firstName.off('input.hideError');
                $lastName.off('input.hideError');
            });

            $lastName.rebind('input.hideError', () => {
                $firstName.megaInputsHideError();
                $firstName.off('input.hideError');
                $lastName.off('input.hideError');
            });

            err = 1;
        }

        if (!err) {
            if ($('.understand-check', $dialog).hasClass('checkboxOff')) {
                hideOverlay();
                msgDialog('warninga', l[1117], l[21957]);
            }
            else if ($('.register-check', $dialog).hasClass('checkboxOff')) {
                hideOverlay();
                msgDialog('warninga', l[1117], l[1118]);
            }
            else {
                if (u_type === false) {
                    hideOverlay();
                    u_storage = init_storage(localStorage);
                    u_checklogin({
                        checkloginresult: function(u_ctx, r) {
                            u_type = r;
                            registeraccount();
                        }
                    }, true);
                }
                else if (u_type === 0) {
                    registeraccount();
                }
            }
        }
        if (err) {
            hideOverlay();
            $button.removeClass('disabled');
        }
    }

    function showRegisterDialog(opts, aPromise) {
        if ($.len(options)) {
            closeRegisterDialog(options.$dialog, true);
        }
        options = Object(opts);
        var $dialog = options.$wrapper || $('.mega-dialog.pro-register-dialog');
        var $inputs = $('input', $dialog);
        var $button = $('button:not(.js-close)', $dialog);
        var $password = $('input[type="password"]', $dialog);

        // Controls events, close button etc
        if (options.controls) {
            options.controls();
        }
        else {
            // controls
            $('button.js-close', $dialog).rebind('click.registerDialog', function() {
                if (aPromise) {
                    aPromise.reject();
                }
                closeRegisterDialog($dialog, true);
                return false;
            });

            // close dialog by click on overlay
            $('.fm-dialog-overlay').rebind('click.registerDialog', function() {
                if (aPromise) {
                    aPromise.reject();
                }
                if ($.registerDialog === $.dialog) {
                    closeRegisterDialog($dialog, true);
                }
                else {
                    closeDialog();
                }
                return false;
            });
        }
        console.assert(options.showDialog || $.dialog !== 'register', 'Invalid state...');
        options.$dialog = $dialog;

        // Show dialog function
        if (options.showDialog) {
            options.showDialog();
        }
        else {
            M.safeShowDialog('register', function() {
                $.registerDialog = 'register';
                return $dialog;
            });
        }

        // Init inputs events
        accountinputs.init($dialog);

        if (M.chat) {
            $('aside .login-text', $dialog).removeClass('hidden');
            $('aside .login-text a, .register-side-pane.header a', $dialog)
                .rebind('click.doSignup', function() {
                    closeRegisterDialog($dialog, true);
                    megaChat.loginOrRegisterBeforeJoining(
                        undefined,
                        false,
                        true,
                        undefined,
                        opts.onLoginSuccessCb
                    );
                });
        }
        else if (options.showLogin) {
            $('aside', $dialog).removeClass('no-padding');
            $('aside .login-text', $dialog).removeClass('hidden');
            $('aside .login-text a, .register-side-pane.header a', $dialog)
                .rebind('click.doSignup', function() {
                    var onAccountCreated = options.onAccountCreated && options.onAccountCreated.bind(options);

                    closeRegisterDialog($dialog, true);
                    mega.ui.showLoginRequiredDialog({minUserType: 3, skipInitialDialog: 1})
                        .then(function() {
                            if (typeof onAccountCreated === 'function') {
                                onAccountCreated(2, false);
                            }
                            else if (d) {
                                console.warn('Completed login, but have no way to notify the caller...');
                            }
                        }).catch(console.debug.bind(console));
                });
        }
        else {
            $('aside .login-text', $dialog).addClass('hidden');
            $('aside', $dialog).addClass('no-padding');
        }

        $inputs.val('');
        $password.parent().find('.password-status').removeClass('checked');

        $('header h2', $dialog).text(options.title || l[20755]);
        if (options.body) {
            $('header p', $dialog).safeHTML(options.body);
        }
        else {
            $('header p', $dialog).safeHTML(l[20757]);

            // Hide the "Create an account and get x GB of free storage on MEGA"
            // text if coming from the discount promotion page
            if (sessionStorage.getItem('discountPromoContinuePlanNum')) {
                $('header p', $dialog).addClass('hidden');
            }
        }

        $inputs.rebind('keydown.proRegister', function(e) {
            if (e.keyCode === 13) {
                doProRegister($dialog, aPromise);
            }
        });

        $button.rebind('click.proRegister', function() {
            var $this = $(this);
            if ($this.hasClass('disabled')) {
                return false;
            }
            doProRegister($dialog, aPromise);
            return false;
        });

        $button.rebind('keydown.proRegister', function (e) {
            if (e.keyCode === 13  && !$(this).hasClass('disabled')) {
                doProRegister($dialog, aPromise);
                return false;
            }
        });
    }

    /**
     * Send Signup link dialog
     * @param {Object} accountData The data entered by the user at registration
     * @param {Function} onCloseCallback Optional callback to invoke on close
     */
    function sendSignupLinkDialog(accountData, onCloseCallback) {
        const $dialog = $('.mega-dialog.registration-page-success').removeClass('hidden');
        const $changeEmailLink = $('.reg-success-change-email-btn', $dialog);
        const $resendEmailButton = $('.resend-email-button', $dialog);

        if (page && page.indexOf("chat/") > -1  || page === "chat") {
            $dialog.addClass('chatlink');
            $('.reg-success-icon-chat', $dialog).removeClass('hidden');
            $('.reg-success-icon', $dialog).addClass('hidden');
        }
        else {
            $dialog.removeClass('chatlink');
            $('.reg-success-icon-chat', $dialog).addClass('hidden');
            $('.reg-success-icon', $dialog).removeClass('hidden');
        }

        const $resendEmailTxt = $('.reg-resend-email-txt', $dialog);
        $resendEmailTxt.text(accountData.email).attr('data-simpletip', accountData.email);

        $changeEmailLink.rebind('click', (event) => {
            event.preventDefault();
            $('.reg-resend-email-txt', $dialog).addClass('hidden');
            $('footer', $dialog).addClass('hidden');
            $('.content-block', $dialog).addClass('dialog-bottom');
            if ($dialog.hasClass('chatlink')) {
                $('.reg-success-special .chat-header', $dialog).text(l[22901]);
            }
            else {
                $(".reg-success-special div[class='reg-success-txt']", $dialog).text(l[22901]);
            }
            $('.reg-resend-email input', $dialog).val(accountData.email);
            $('.reg-resend-email', $dialog).removeClass('hidden');
        });

        $resendEmailButton.rebind('click', function _click() {
            const ctx = {
                callback: function(res) {
                    loadingDialog.hide();

                    if (res === -5) {
                        alert(l[7717]);
                        return;
                    }
                    if (res === EEXIST) {
                        $('.reg-resend-email-meg', $dialog).text(l[19562]);
                        $('input', $dialog).parent().addClass('error');
                        $('input', $dialog).focus();
                        return false;
                    }
                    if (res !== 0) {
                        console.error('sendsignuplink failed', res);

                        $resendEmailButton.addClass('disabled');
                        $resendEmailButton.off('click');

                        let tick = 26;
                        var timer = setInterval(() => {
                            if (--tick === 0) {
                                clearInterval(timer);
                                $resendEmailButton.text(l[8744]);
                                $resendEmailButton.removeClass('disabled');
                                $resendEmailButton.rebind('click', _click);
                            }
                            else {
                                $resendEmailButton.text('\u23F1 ' + tick + '...');
                            }
                        }, 1000);

                        alert(l[200]);
                    }
                    else {
                        closeDialog();
                        fm_showoverlay();

                        $dialog.removeClass('hidden');
                    }
                }
            };
            loadingDialog.show();

            const newEmail = $.trim($('input', $dialog).val());

            // Verify the new email address is in valid format
            if (!isValidEmail(newEmail)) {
                // Hide the loading spinner
                loadingDialog.hide();

                $('.reg-resend-email-meg', $dialog).text(l[1100]);
                $('input', $dialog).parent().addClass('error');
                $('input', $dialog).focus();
                return false;
            }

            security.register.repeatSendSignupLink(accountData.first, accountData.last, newEmail, ctx.callback);
        });

        if (typeof onCloseCallback === 'function') {
            // Show dialog close button
            $('button.js-close', $dialog).removeClass('hidden');

            $('button.js-close', $dialog).rebind('click', () => {

                msgDialog('confirmation', l[1334], l[5710], false, (ev) => {

                    // Confirm abort registration
                    if (ev) {

                        // Run 'user cancel registration' API command to cleanup the registration API side
                        api_req({ a: 'ucr' });
                        onCloseCallback();
                    }
                    else {
                        // Restore the background overlay which was closed by the msgDialog function
                        fm_showoverlay();
                    }
                });
            });
        }
        else {
            // Hide dialog close button
            $('button.js-close', $dialog).addClass('hidden');
        }

        if (onCloseCallback === true) {
            // we just want the close button to be show and to not trigger anything closing it.
            $('button.js-close', $dialog).removeClass('hidden');
            $('button.js-close', $dialog).rebind('click', () => {
                // TODO: Move this to safeShowDialog();
                $dialog.addClass('hidden');
                fm_hideoverlay();
                return false;
            });
        }

        fm_showoverlay();
        $('.content-block', $dialog).removeClass('dialog-bottom');
        $('footer', $dialog).removeClass('hidden');
        $dialog.addClass('special').show();

        if ($resendEmailTxt[0].scrollWidth > $resendEmailTxt[0].offsetWidth) {
            $resendEmailTxt.addClass('simpletip').attr("data-simpletip-class", "no-max-width");
        }
        else {
            $resendEmailTxt.removeClass('simpletip').removeAttr('data-simpletip-class');
        }
    }

    // export
    scope.mega.ui.showRegisterDialog = showRegisterDialog;
    scope.mega.ui.sendSignupLinkDialog = sendSignupLinkDialog;

})(this);
