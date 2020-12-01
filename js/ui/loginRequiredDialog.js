(function($, scope) {

    function showLoginRequiredDialog(options) {
        var promise = new MegaPromise();
        options = options || {};

        // Already logged-in, even on ephemeral?
        if (u_type !== false && (!options.minUserType || u_type >= options.minUserType)) {
            Soon(function() {
                promise.resolve();
            });
        }
        else if (options.skipInitialDialog) {
            showLoginDialog(promise, options);
        }
        else {
            var icon;
            var loginRequiredDialog = new mega.ui.Dialog({
                'className': 'loginrequired-dialog',
                'closable': true,
                'focusable': false,
                'expandable': false,
                'requiresOverlay': true,
                'title': options.title || l[5841],
                'buttons': []
            });
            loginRequiredDialog.bind('onHide', function() {
                Soon(function() {
                    if (promise) {
                        promise.reject();
                        promise = undefined;
                    }
                });
            });
            loginRequiredDialog.bind('onBeforeShow', function() {
                $('.fm-dialog-title', this.$dialog)
                    .text(this.options.title);


                // custom buttons, because of the styling
                $('.fm-notification-info', this.$dialog)
                    .safeHTML('<p>@@</p>', options.textContent || l[7679]);

                icon = $(this.$dialog)
                    .addClass('warning-dialog-a login').removeClass('loginrequired-dialog');

                $('.default-white-button.pro-login', this.$dialog)
                    .rebind('click.loginrequired', function() {
                        loginRequiredDialog.hide();
                        showLoginDialog(promise, options);
                        promise = undefined;
                        return false;
                    });

                $('.default-white-button.pro-register', this.$dialog)
                    .rebind('click.loginrequired', function() {
                        promise.reject();
                        return false;
                    }).find('span').text(l[82]);
            });

            loginRequiredDialog.show();

            promise.always(function __lrdAlways() {
                loginRequiredDialog.hide();
                loginRequiredDialog = undefined;
                if (icon) {
                    icon.removeClass('warning-dialog-a login').addClass('loginrequired-dialog');
                    icon = undefined;
                }
                closeDialog();
                promise = undefined;
            });
        }

        return promise;
    }

    function showLoginDialog(aPromise, options) {
        var $dialog = $('.fm-dialog.pro-login-dialog');
        var $inputs = $dialog.find('input');
        var $button = $dialog.find('.big-red-button');

        if (M.chat) {
            $('.fm-dialog-subheading', $dialog).removeClass('hidden');
            $('.fm-dialog-subheading > a', $dialog).rebind('click.doSignup', function() {
                closeDialog();
                megaChat.loginOrRegisterBeforeJoining(undefined, true, false);
            });
        }
        else if (options.showRegister) {
            $('.fm-dialog-subheading', $dialog).removeClass('hidden');
            $('.fm-dialog-subheading > a', $dialog).rebind('click.doSignup', function() {
                closeDialog();
                mega.ui.showRegisterDialog({
                    showLogin: true,
                    body: options.showRegister,
                    onAccountCreated: function(gotLoggedIn, accountData) {
                        if (gotLoggedIn) {
                            completeLogin(u_type);
                        }
                        else {
                            security.register.cacheRegistrationData(accountData);

                            if (!options.noSignupLinkDialog) {
                                mega.ui.sendSignupLinkDialog(accountData);
                            }
                        }
                    }
                });
            });
        }
        else {
            $('.fm-dialog-subheading', $dialog).addClass('hidden');
        }

        M.safeShowDialog('pro-login-dialog', function() {

            // Init inputs events
            accountinputs.init($dialog);

            return $dialog;
        });

        // controls
        $('.fm-dialog-close', $dialog).rebind('click.proDialog', function() {
            closeDialog();
            aPromise.reject();
        });

        $inputs.val('');

        $inputs.rebind('keydown', function(e) {

            $inputs.removeClass('errored').parent().removeClass('error');

            if (e.keyCode == 13) {
                doLogin($dialog, aPromise);
            }
        });

        $('.top-login-forgot-pass', $dialog).rebind('click.loginreq', function(e) {
            e.preventDefault();
            aPromise.reject();
            loadSubPage('recovery');
        });

        $button.rebind('click.loginreq', function(e) {
            doLogin($dialog, aPromise);
        });

        $button.rebind('keydown.loginreq', function (e) {
            if (e.keyCode === 13) {
                doLogin($dialog, aPromise);
            }
        });
    }

    var completePromise = null;

    function doLogin($dialog, aPromise) {

        loadingDialog.show();

        // Save the promise for use in the completeLogin function
        completePromise = aPromise;

        var $formWrapper = $dialog.find('form');
        var $emailInput = $dialog.find('#login-name3');
        var $passwordInput = $dialog.find('#login-password3');
        var $rememberMeCheckbox = $dialog.find('.login-check input');

        var email = $emailInput.val().trim();
        var password = $passwordInput.val();
        var rememberMe = $rememberMeCheckbox.is('.checkboxOn');  // ToDo check if correct
        var twoFactorPin = null;

        if (email === '' || !isValidEmail(email)) {
            $emailInput.megaInputsShowError(l[141]);
            $emailInput.focus();
            loadingDialog.hide();

            return false;
        }
        else if (password === '') {
            $passwordInput.megaInputsShowError(l[1791]);
            loadingDialog.hide();

            return false;
        }

        // Checks if they have an old or new registration type, after this the flow will continue to login
        security.login.checkLoginMethod(email, password, twoFactorPin, rememberMe, startOldLogin, startNewLogin);
    }

    /**
     * Starts the old login proceedure
     * @param {String} email The user's email address
     * @param {String} password The user's password as entered
     * @param {String|null} pinCode The two-factor authentication PIN code (6 digit number), or null if N/A
     * @param {Boolean} rememberMe Whether the user clicked the Remember me checkbox or not
     */
    function startOldLogin(email, password, pinCode, rememberMe) {

        postLogin(email, password, pinCode, rememberMe, completeLogin);
    }

    /**
     * Start the new login proceedure
     * @param {String} email The user's email addresss
     * @param {String} password The user's password as entered
     * @param {String|null} pinCode The two-factor authentication PIN code (6 digit number), or null if N/A
     * @param {Boolean} rememberMe A boolean for if they checked the Remember Me checkbox on the login screen
     * @param {String} salt The user's salt as a Base64 URL encoded string
     */
    function startNewLogin(email, password, pinCode, rememberMe, salt) {

        // Start the login using the new process
        security.login.startLogin(email, password, pinCode, rememberMe, salt, completeLogin);
    }

    /**
     * Completes the login process
     * @param {Number} result The result from the API, e.g. a negative error num or the user type e.g. 3 for full user
     */
    function completeLogin(result) {
        'use strict';

        var $formWrapper = $('.pro-login-dialog form');
        var $emailInput = $formWrapper.find('#login-name3');
        var $passwordInput = $formWrapper.find('#login-password3');

        loadingDialog.hide();

        // Check and handle the common login errors
        if (security.login.checkForCommonErrors(result, startOldLogin, startNewLogin)) {
            return false;
        }

        // If successful result
        else if (result !== false && result >= 0) {
            passwordManager('#form_login_header');

            u_type = result;
            u_checked = true;

            if (u_type === 3) {
                onIdle(topmenuUI);
                console.assert($.dialog === 'pro-login-dialog', 'Uhm, unexpected dialog... ' + $.dialog);
                if ($.dialog === 'pro-login-dialog') {
                    closeDialog();
                }
                if (window.n_h) {
                    // set new u_sid under folderlinks
                    api_setfolder(n_h);
                }
                completePromise.resolve();
            }
            else {
                boot_auth(null, result);
                completePromise.reject();
            }

            $emailInput.val('');
            $passwordInput.val('');
        }
        else {
            // Close the 2FA dialog for a generic error
            twofactor.loginDialog.closeDialog();

            $emailInput.megaInputsShowError();
            $passwordInput.megaInputsShowError(l[7431]);
            $passwordInput.focus();
        }
    }

    // export
    scope.mega.ui.showLoginRequiredDialog = showLoginRequiredDialog;

})(jQuery, window);
