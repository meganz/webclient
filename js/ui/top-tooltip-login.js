/**
 * Logic for the top navigation bar's signin tooltip
 */
var tooltiplogin = {

    /**
     * Initialise the tooltip
     * @param {Boolean} close Optional flag to hide the tooltip
     */
    init: function(close) {

        'use strict';

        var $dialog = $('.dropdown.top-login-popup');

        if (close) {
            $dialog.find('form').empty();
            $dialog.addClass('hidden');
            $(document).off('keydown.logingpopup');
            return false;
        }

        $dialog.find('form').replaceWith(getTemplate('top-login'));

        if (localStorage.hideloginwarning || is_extension) {
            $dialog.find('.top-login-warning').addClass('hidden');
            $dialog.find('.login-notification-icon').removeClass('hidden');
        }

        $dialog.find('.login-checkbox, .radio-txt').rebind('click', function() {

            var c = $dialog.find('.login-checkbox').attr('class');
            if (c.indexOf('checkboxOff') > -1) {
                $dialog.find('.login-checkbox').attr('class', 'login-checkbox checkboxOn');
            }
            else {
                $dialog.find('.login-checkbox').attr('class', 'login-checkbox checkboxOff');
            }
        });

        $('.top-login-forgot-pass').rebind('click', function() {
            loadSubPage('recovery');
            tooltiplogin.init(1);
        });

        $('.top-dialog-login-button').rebind('click', function() {
            tooltiplogin.startLogin();
        });

        $('.top-login-full').rebind('click', function() {
            tooltiplogin.init(1);
            loadSubPage('login');
        });

        $(document).off('keydown.logingpopup').on('keydown.logingpopup', function(e) {

            if ($('.dropdown.top-login-popup').hasClass('hidden')) {
                $(document).off('keydown.logingpopup');
                return;
            }
            if (e.keyCode === 32) { // space
                if (document.activeElement !== $('#login-name', $dialog)[0]
                    && document.activeElement !== $('#login-password', $dialog)[0]) {
                    var c = $dialog.find('.login-checkbox').attr('class');
                    if (c.indexOf('checkboxOff') > -1) {
                        $dialog.find('.login-checkbox').attr('class', 'login-checkbox checkboxOn');
                    }
                    else {
                        $dialog.find('.login-checkbox').attr('class', 'login-checkbox checkboxOff');
                    }
                    return false;
                }
            }
            if (e.keyCode === 13) { // enter
                tooltiplogin.startLogin();
                return false;
            }
        });

        $('#login-password, #login-name', $dialog).rebind('keydown.toplogintooltip', function (e) {

            $('.top-login-pad').removeClass('both-incorrect-inputs');
            $('.top-login-input-tooltip.both-incorrect').removeClass('active');
            $('.top-login-input-block.password').removeClass('incorrect');
            $('.top-login-input-block.e-mail').removeClass('incorrect');

            if (e.keyCode === 13) {
                tooltiplogin.startLogin();
                return false;
            }
        });

        $('.top-login-warning-close').rebind('click', function() {
            if ($('.loginwarning-checkbox').hasClass('checkboxOn')) {
                localStorage.hideloginwarning = 1;
            }
            $('.top-login-warning').removeClass('active');
            $('.login-notification-icon').removeClass('hidden');
        });

        $('.login-notification-icon').rebind('click', function() {
            $('.top-login-warning').removeClass('hidden');
            $('.top-login-warning').addClass('active');
            $(this).addClass('hidden');
        });

        $('.top-login-input-block').rebind('click', function() {
            $(this).find('input').focus();
        });

        $('.top-login-input-block.password input, .top-login-input-block.e-mail input').rebind('blur.toplogintooltip',
            function() {
                $(this).parents('.top-login-input-block').removeClass('focused');
            })
            .rebind('focus', function() {
                $(this).parents('.top-login-input-block').addClass('focused');
            }
        );

        $('.loginwarning-checkbox,.top-login-warning .radio-txt').rebind('click', function() {

            var c = '.loginwarning-checkbox';
            var c2 = $(c).attr('class');

            $(c).removeClass('checkboxOn checkboxOff');
            if (c2.indexOf('checkboxOff') > -1) {
                $(c).addClass('checkboxOn');
            }
            else {
                $(c).addClass('checkboxOff');
            }
        });

        $('.dropdown.top-login-popup').removeClass('hidden');
        $('#login-name', $dialog).focus();

        if ($('body').hasClass('logged')) {
            topPopupAlign('.top-head .user-name', '.dropdown.top-login-popup', 40);
        }
        else {
            topPopupAlign('.top-login-button', '.dropdown.top-login-popup', 40);
        }
        if (is_chrome_firefox) {
            mozLoginManager.fillForm.bind(mozLoginManager, 'form_login_header');
        }
    },

    /**
     * Start the login process
     */
    startLogin: function() {

        'use strict';

        var $topLoginPopup = $('.top-login-popup');
        var $emailContainer = $topLoginPopup.find('.top-login-input-block.e-mail');
        var $passwordContainer = $topLoginPopup.find('.top-login-input-block.password');
        var $emailField = $topLoginPopup.find('#login-name');
        var $passwordField = $topLoginPopup.find('#login-password');
        var $loginButton = $topLoginPopup.find('.top-dialog-login-button');
        var $loginWarningCheckbox = $topLoginPopup.find('.loginwarning-checkbox');
        var $loginRememberCheckbox = $topLoginPopup.find('.login-checkbox');

        var email = $emailField.val();
        var password = $passwordField.val();
        var rememberMe = false;
        var twoFactorPin = null;

        if (email === '' || checkMail(email)) {
            $emailContainer.addClass('incorrect');
            $emailField.val('');
            $emailField.focus();
        }
        else if (password === '') {
            $passwordContainer.addClass('incorrect');
        }
        else {
            $loginButton.addClass('loading');

            if ($loginWarningCheckbox.hasClass('checkboxOn')) {
                localStorage.hideloginwarning = 1;
            }

            if ($loginRememberCheckbox.hasClass('checkboxOn')) {
                rememberMe = true;
            }

            // Checks if they have an old or new registration type, after this the flow will continue to login
            security.login.checkLoginMethod(email, password, twoFactorPin, rememberMe,
                                            tooltiplogin.old.startLogin,
                                            tooltiplogin.new.startLogin);
        }
    },

    /**
     * Functions for the old login process which will need to be retained until everyone's upgraded to the new process
     */
    old: {
        /**
         * Starts the login proceedure
         * @param {String} email The user's email address
         * @param {String} password The user's password as entered
         * @param {String|null} pinCode The two-factor authentication PIN code (6 digit number), or null if N/A
         * @param {Boolean} rememberMe Whether the user clicked the Remember me checkbox or not
         */
        startLogin: function(email, password, pinCode, rememberMe) {

            'use strict';

            postLogin(email, password, pinCode, rememberMe, tooltiplogin.completeLogin);
        }
    },

    /**
     * Functions for the new secure login process
     */
    new: {
        /**
         * Start the login proceedure
         * @param {String} email The user's email addresss
         * @param {String} password The user's password as entered
         * @param {String|null} pinCode The two-factor authentication PIN code (6 digit number), or null if N/A
         * @param {Boolean} rememberMe A boolean for if they checked the Remember Me checkbox on the login screen
         * @param {String} salt The user's salt as a Base64 URL encoded string
         */
        startLogin: function(email, password, pinCode, rememberMe, salt) {

            'use strict';

            // Start the login using the new process
            security.login.startLogin(email, password, pinCode, rememberMe, salt, tooltiplogin.completeLogin);
        }
    },

    /**
     * Complete the login process and redirect to the cloud drive
     * @param {Number} result If the result is negative there is an error, if positive it is the user type
     */
    completeLogin: function(result) {

        'use strict';

        // Remove loading spinner on the button
        $('.top-dialog-login-button').removeClass('loading');

        // Check and handle the common login errors
        if (security.login.checkForCommonErrors(result, tooltiplogin.old.startLogin, tooltiplogin.new.startLogin)) {
            return false;
        }

        // If successful result
        else if (result !== false && result >= 0) {
            passwordManager('#form_login_header');
            u_type = result;

            if (login_next) {
                loadSubPage(login_next);
            }
            else if (page !== 'login') {
                page = getSitePath().substr(1);
                init_page();
            }
            else {
                loadSubPage('fm');
            }
            login_next = false;
        }
        else {
            // Close the 2FA dialog for a generic error
            twofactor.loginDialog.closeDialog();

            $('.top-login-pad').addClass('both-incorrect-inputs');
            $('.top-login-input-tooltip.both-incorrect').addClass('active');
            $('#login-password').select();
        }
    }
};
