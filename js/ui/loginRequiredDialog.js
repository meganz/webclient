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
            showLoginDialog(promise);
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
                        showLoginDialog(promise);
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

    function showLoginDialog(aPromise) {
        var $dialog = $('.fm-dialog.pro-login-dialog');

        M.safeShowDialog('pro-login-dialog', function() {
            $dialog.removeClass('hidden').addClass('active');

            $dialog.css({
                'margin-left': -1 * ($dialog.outerWidth() / 2),
                'margin-top': -1 * ($dialog.outerHeight() / 2)
            });

            return $dialog.css('zoom', '1.2');
        });

        $('.top-login-input-block').removeClass('incorrect');

        // controls
        $('.fm-dialog-close', $dialog)
            .rebind('click.proDialog', function() {
                closeDialog();
                aPromise.reject();
            });

        $('.input-email', $dialog)
            .val('');

        $('.input-password', $dialog)
            .data('placeholder', l[909]);

        uiPlaceholders($dialog);
        uiCheckboxes($dialog);

        $('#login-password, #login-name', $dialog).rebind('keydown', function(e) {
            $('.top-login-pad', $dialog).removeClass('both-incorrect-inputs');
            $('.top-login-input-tooltip.both-incorrect', $dialog).removeClass('active');
            $('.top-login-input-block.password', $dialog).removeClass('incorrect');
            $('.top-login-input-block.e-mail', $dialog).removeClass('incorrect');
            if (e.keyCode == 13) {
                doLogin($dialog, aPromise);
            }
        });

        $('.top-login-forgot-pass', $dialog).rebind('click', function(e) {
            aPromise.reject();
            loadSubPage('recovery');
        });

        $('.top-dialog-login-button', $dialog).rebind('click', function(e) {
            doLogin($dialog, aPromise);
        });
    }

    var completePromise = null;

    function doLogin($dialog, aPromise) {

        loadingDialog.show();

        // Save the promise for use in the completeLogin function
        completePromise = aPromise;

        var email = $dialog.find('#login-name').val();
        var password = $dialog.find('#login-password').val();
        var rememberMe = $dialog.find('#login-checkbox').is('.checkboxOn');
        var twoFactorPin = null;

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

        var $emailField = $('#login-email');
        var $passwordField = $('#login-password');

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
                completePromise.resolve();
            }
            else {
                boot_auth(null, result);
                completePromise.reject();
            }

            $emailField.val('');
            $passwordField.val('');
        }
        else {
            // Close the 2FA dialog for a generic error
            twofactor.loginDialog.closeDialog();

            $passwordField.val('');
            alert(l[201]);
        }
    }

    // export
    scope.mega.ui.showLoginRequiredDialog = showLoginRequiredDialog;

})(jQuery, window);
