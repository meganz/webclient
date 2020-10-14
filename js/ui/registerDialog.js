(function(scope) {
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
            $('.fm-dialog-close', $dialog).off('click.registerDialog');
            $('input', $dialog).val('');

            if (isUserTriggered && options.onDialogClosed) {
                options.onDialogClosed($dialog);
            }
        }

        options = {};
    }

    function doProRegister($dialog) {

        var rv = {};
        var hideOverlay = function() {
            loadingDialog.hide();
            $dialog.removeClass('arrange-to-back');
        };

        if (options.onCreatingAccount) {
            options.onCreatingAccount($dialog);
        }
        loadingDialog.show();
        $dialog.addClass('arrange-to-back');

        if (u_type > 0) {
            hideOverlay();
            msgDialog('warninga', l[135], l[5843]);
            return false;
        }

        var registrationDone = function(login) {

            var onAccountCreated = options.onAccountCreated && options.onAccountCreated.bind(options);

            hideOverlay();
            closeRegisterDialog($dialog);
            $('.fm-dialog.registration-page-success').off('click');

            if (login) {
                Soon(function() {
                    showToast('megasync', l[8745]);
                    $('.fm-avatar img').attr('src', useravatar.mine());
                });
            }
            onIdle(topmenuUI);

            if (typeof onAccountCreated === 'function') {
                onAccountCreated(login, rv);
            }
            else {
                // $('.fm-dialog.registration-page-success').removeClass('hidden');
                // fm_showoverlay();
                // ^ legacy confirmation dialog, with no email change option
                sendSignupLinkDialog(rv);
            }
        };

        /**
         * Continue the old method Pro registration
         * @param {Number} result The result of the 'uc' API request
         * @param {Boolean} oldMethod Using old registration method.
         */
        var continueProRegistration = function(result, oldMethod) {
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
                $('.fm-dialog:visible').addClass('arrange-to-back');
                if (result === EEXIST) {
                    fm_hideoverlay();
                    msgDialog('warninga', l[1578], l[7869]);
                    options.$dialog.find('input.email').megaInputsShowError(l[1297]);
                }
                else {
                    msgDialog('warninga', l[1578], l[200], api_strerror(result), function() {
                        if ($('.fm-dialog:visible').removeClass('arrange-to-back').length) {
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
        var continueOldProRegistration = function(result) {
            continueProRegistration(result, true);
        };

        /**
         * Continue the new method registration
         * @param {Number} result The result of the 'uc2' API request
         */
        var continueNewProRegistration = function(result) {
            continueProRegistration(result, false);
        };

        /**
         * The main function to register the account
         */
        var registeraccount = function() {

            rv.password = $('input.pass', $dialog).val();
            rv.first = $.trim($('input.f-name', $dialog).val());
            rv.last = $.trim($('input.l-name', $dialog).val());
            rv.email = $.trim($('input.email', $dialog).val());
            rv.name = rv.first + ' ' + rv.last;

            // Set a flag that the registration came from the Pro page
            var fromProPage = localStorage.getItem('proPageContinuePlanNum') !== null;

            // Set a flag indicating the registration came from the webclient.
            localStorage.signUpStartedInWebclient = '1';

            // Set the signup function to start the new secure registration process
            if (security.register.newRegistrationEnabled()) {
                security.register.startRegistration(rv.first, rv.last, rv.email, rv.password,
                                                    fromProPage, continueNewProRegistration);
            }
            else {
                // Set the signup function to use the legacy registration process
                sendsignuplink(rv.name, rv.email, rv.password, { callback: continueOldProRegistration }, fromProPage);
            }
        };

        var err = false;
        var $formWrapper = $dialog.find('form');
        var $firstName = $('input.f-name', $formWrapper);
        var $lastName = $('input.l-name', $formWrapper);
        var $email = $('input.email', $formWrapper);
        var $password = $('input.pass', $formWrapper);
        var $confirmPassword = $('input.confirm-pass', $formWrapper);

        var firstName = $.trim($firstName.val());
        var lastName = $.trim($lastName.val());
        var email = $.trim($email.val());
        var password = $password.val();
        var confirmPassword = $confirmPassword.val();

        // Check if the entered passwords are valid or strong enough
        var passwordValidationResult = security.isValidPassword(password, confirmPassword);

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
            $password.rebind('input.hideError', function() {
                $confirmPassword.megaInputsHideError();
                $password.off('input.hideError');
                $confirmPassword.off('input.hideError');
            });

            $confirmPassword.rebind('input.hideError', function() {
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
            $firstName.rebind('input.hideError', function() {
                $lastName.megaInputsHideError();
                $firstName.off('input.hideError');
                $lastName.off('input.hideError');
            });

            $lastName.rebind('input.hideError', function() {
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
        }
    }

    function showRegisterDialog(opts) {
        if ($.len(options)) {
            closeRegisterDialog(options.$dialog, true);
        }
        options = Object(opts);
        var $dialog = options.$wrapper || $('.fm-dialog.pro-register-dialog');
        var $inputs = $dialog.find('input');
        var $button = $dialog.find('.button');
        var $password = $dialog.find('input[type="password"]');

        // Controls events, close button etc
        if (options.controls) {
            options.controls();
        }
        else {
            // controls
            $('.fm-dialog-close', $dialog).rebind('click.registerDialog', function() {
                closeRegisterDialog($dialog, true);
                return false;
            });

            // close dialog by click on overlay
            $('.fm-dialog-overlay').rebind('click.registerDialog', function() {
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
            $('.dialog-dark-bottom.login', $dialog).removeClass('hidden').find('a')
                .rebind('click.doSignup', function() {
                    closeRegisterDialog($dialog, true);
                    megaChat.loginOrRegisterBeforeJoining(undefined, false, true);
                });
        }
        else if (options.showLogin) {
            $('.dialog-dark-bottom.login, .register-side-pane.header', $dialog).removeClass('hidden').find('a')
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
            $('.dialog-dark-bottom.login', $dialog).addClass('hidden');
        }

        $inputs.val('');
        $password.parent().find('.password-status').removeClass('checked');

        $('.register-side-pane.header span', $dialog).text(options.title || l[20755]);
        if (options.body) {
            $('.register-side-pane.header-info', $dialog)
                .safeHTML(options.body);
        }
        else {
            $('.register-side-pane.header-info', $dialog).safeHTML(l[20757]);
        }

        $inputs.rebind('keydown.proRegister', function(e) {
            if (e.keyCode === 13) {
                doProRegister($dialog);
            }
        });

        $button.rebind('click.proRegister', function(e) {

            if ($(this).hasClass('disabled')) {
                return false;
            }
            doProRegister($dialog);
            return false;
        });

        $button.rebind('keydown.proRegister', function (e) {
            if (e.keyCode === 13  && !$(this).hasClass('disabled')) {
                doProRegister($dialog);
                return false;
            }
        });

        $('.checkbox-block.register .terms-check a', $dialog).rebind('click', function(e) {

            e.preventDefault();
            $.termsAgree = function() {
                $('.register-check', $dialog).removeClass('checkboxOff')
                    .addClass('checkboxOn');
            };
            bottomPageDialog(false, 'terms', false, true); // show terms dialog
            return false;
        });
    }

    /**
     * Send Signup link dialog
     * @param {Object} accountData The data entered by the user at registration
     * @param {Function} onCloseCallback Optional callback to invoke on close
     */
    function sendSignupLinkDialog(accountData, onCloseCallback) {
        var $dialog = $('.fm-dialog.registration-page-success').removeClass('hidden');
        var $changeEmailLink = $('.reg-success-change-email-btn', $dialog);
        var $resendEmailButton = $('.resend-email-button', $dialog);

        if (page && page.indexOf("chat/") > -1  || page === "chat") {
            $dialog.addClass('chatlink');
            $('.reg-success-icon-container-chat', $dialog).removeClass('hidden');
            $('.reg-success-icon-container', $dialog).addClass('hidden');
        }
        else {
            $dialog.removeClass('chatlink');
            $('.reg-success-icon-container-chat', $dialog).addClass('hidden');
            $('.reg-success-icon-container', $dialog).removeClass('hidden');
        }
        $('.reg-resend-email-txt', $dialog).text(accountData.email);

        $changeEmailLink.rebind('click', function(event) {
            event.preventDefault();
            $('.reg-resend-email-txt', $dialog).addClass('hidden');
            $('.reg-success-txtb', $dialog).css('display', 'none');
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
            var ctx = {
                callback: function(res) {
                    loadingDialog.hide();

                    if (res === -5) {
                        alert(l[7717]);
                        return;
                    }
                    if (res !== 0) {
                        console.error('sendsignuplink failed', res);

                        $resendEmailButton.addClass('disabled');
                        $resendEmailButton.off('click');

                        var tick = 26;
                        var timer = setInterval(function() {
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

            var newEmail = $.trim($('input', $dialog).val());

            // Verify the new email address is in valid format
            if (!isValidEmail(newEmail)) {
                $('input', $dialog).parent().addClass('error');
                $('input', $dialog).focus();
                return false;
            }

            // If the new registration method is enabled, re-send the signup link using the new method
            if (security.register.newRegistrationEnabled()) {
                security.register.repeatSendSignupLink(accountData.first, accountData.last, newEmail, ctx.callback);
            }
            else {
                // Otherwise use the old method
                sendsignuplink(accountData.name, newEmail, accountData.password, ctx, true);
            }
        });

        if (typeof onCloseCallback === 'function') {
            // Show dialog close button
            $('.fm-dialog-header', $dialog).removeClass('hidden');

            $('.fm-dialog-close', $dialog).rebind('click', function _click() {

                msgDialog('confirmation', l[1334], l[5710], false, function(ev) {

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
            $('.fm-dialog-header', $dialog).addClass('hidden');
        }

        if (onCloseCallback === true) {
            // we just want the close button to be show and to not trigger anything closing it.
            $('.fm-dialog-header', $dialog).removeClass('hidden');
            $('.fm-dialog-close', $dialog).rebind('click', function() {
                // TODO: Move this to safeShowDialog();
                $dialog.addClass('hidden');
                fm_hideoverlay();
                return false;
            });
        }

        fm_showoverlay();
        $dialog.addClass('special').show();
    }

    // export
    scope.mega.ui.showRegisterDialog = showRegisterDialog;
    scope.mega.ui.sendSignupLinkDialog = sendSignupLinkDialog;

})(this);
