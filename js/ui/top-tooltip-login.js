/**
 * Logic for the Account forms Inputs behaviour
*/
var accountinputs = {

    /**
     * Initialise inputs events
     * @param {Object} $formWrapper. DOM form wrapper.
     */
    init: function($formWrapper) {
        "use strict";

        if (!$formWrapper.length) {
            return false;
        }

        var $loginForm = $formWrapper.find('form');
        var $inputs = $('.account.input-wrapper input',  $loginForm);
        var $checkbox = $loginForm.find('.account.checkbox-block input');
        var $button = $loginForm.find('.big-red-button');

        $loginForm.removeClass('both-incorrect-inputs');
        $inputs.parent().removeClass('incorrect');

        $inputs.rebind('click.commonevent', function() {
            $(this).parent().removeClass('incorrect');
            $loginForm.removeClass('both-incorrect-inputs');
        });

        $inputs.rebind('focus.commonevent', function() {
            $(this).parent().addClass('focused');
        });

        $inputs.rebind('blur.commonevent', function() {
            $(this).parent().removeClass('focused');
        });

        $inputs.rebind('keydown.commonevent', function(e) {
            $loginForm.removeClass('both-incorrect-inputs');
            $inputs.parent().removeClass('incorrect');
        });

        $checkbox.rebind('focus.commonevent', function() {
            $(this).parents('.checkbox-block').addClass('focused');
        });

        $checkbox.rebind('blur.commonevent', function() {
            $(this).parents('.checkbox-block').removeClass('focused');
        });

        $checkbox.rebind('keydown.commonevent', function (e) {
            if (e.keyCode === 9) {
                e.preventDefault();
                $(this).blur();
                $button.focus().addClass('focused');
            }
            else if (e.keyCode === 32) {
                var $wrapper = $(this).parent().find('.checkbox');

                if ($wrapper.hasClass('checkboxOn')) {
                    $wrapper.addClass('checkboxOff').removeClass('checkboxOn');
                }
                else {
                    $wrapper .addClass('checkboxOn').removeClass('checkboxOff');
                }
            }
        });

        $button.rebind('click.commonevent', function() {
            $button.removeClass('focused');
        });

        $button.rebind('keydown.commonevent', function (e) {
            if (e.keyCode === 9) {
                e.preventDefault();
                $inputs.first().focus();
            }
        });

        $button.rebind('blur.commonevent', function() {
            $(this).removeClass('focused');
        });

        $('.radio-txt, .checkbox', $formWrapper).rebind('click.commonevent', function(e) {
            var $wrapper = $(this).parent().find('.checkbox');
    
            $wrapper.parent().removeClass('focused');
    
            if ($wrapper.hasClass('checkboxOn')) {
                $wrapper.addClass('checkboxOff').removeClass('checkboxOn');
            }
            else {
                $wrapper .addClass('checkboxOn').removeClass('checkboxOff');
            }
        });

        Soon(function() {
            $inputs.first().focus()
        });
    }
};

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
        var $inputs;
        var $checkbox;
        var $button;

        if (close) {
            $dialog.find('form').empty();
            $dialog.addClass('hidden');
            return false;
        }

        $dialog.find('form').replaceWith(getTemplate('top-login'));

        $inputs = $('.account.input-wrapper input',  $dialog);
        $button = $dialog.find('.big-red-button');

        if (localStorage.hideloginwarning || is_extension) {
            $dialog.find('.top-login-warning').addClass('hidden');
            $dialog.find('.login-notification-icon').removeClass('hidden');
        }

        $('.top-dialog-login-button', $dialog).rebind('click', function() {
            tooltiplogin.startLogin();
        });

        $('.top-login-full', $dialog).rebind('click', function() {
            tooltiplogin.init(1);
            loadSubPage('login');
        });

        $inputs.rebind('keydown.loginpopup', function(e) {
            if (e.keyCode === 13) {
                tooltiplogin.startLogin();
                return false;
            }
        });

        $button.rebind('click.loginpopup', function() {
            tooltiplogin.startLogin();
        });

        $button.rebind('keydown.loginpopup', function (e) {
            if (e.keyCode === 13) {
                tooltiplogin.startLogin();
            }
        });

        $('.top-login-warning-close', $dialog).rebind('click', function() {
            if ($('.loginwarning-checkbox', $dialog).hasClass('checkboxOn')) {
                localStorage.hideloginwarning = 1;
            }
            $('.top-login-warning', $dialog).removeClass('active');
            $('.login-notification-icon', $dialog).removeClass('hidden');
        });

        $('.login-notification-icon', $dialog).rebind('click', function() {
            $('.top-login-warning', $dialog).removeClass('hidden');
            $('.top-login-warning', $dialog).addClass('active');
            $(this).addClass('hidden');
        });

        $dialog.removeClass('hidden');

        if ($('body').hasClass('logged')) {
            topPopupAlign('.top-head .user-name', '.dropdown.top-login-popup', 40);
        }
        else {
            topPopupAlign('.top-login-button:visible', '.dropdown.top-login-popup', 40);
        }
        if (is_chrome_firefox) {
            mozLoginManager.fillForm.bind(mozLoginManager, 'form_login_header');
        }

        // Init inputs events
        accountinputs.init($dialog);
    },

    /**
     * Start the login process
     */
    startLogin: function() {

        'use strict';

        var $topLoginPopup = $('.top-login-popup');
        var $loginForm = $topLoginPopup.find('.account.top-login-form');
        var $emailContainer = $topLoginPopup.find('.account.input-wrapper.email');
        var $emailField = $topLoginPopup.find('#login-name');
        var $passwordField = $topLoginPopup.find('#login-password');
        var $loginButton = $topLoginPopup.find('.top-dialog-login-button');
        var $loginWarningCheckbox = $topLoginPopup.find('.loginwarning-checkbox');
        var $loginRememberCheckbox = $topLoginPopup.find('.login-check');

        var email = $emailField.val();
        var password = $passwordField.val();
        var rememberMe = false;
        var twoFactorPin = null;

        if (email === '' || checkMail(email)) {
            $emailContainer.addClass('incorrect');
            $emailField.val('');
            $emailField.trigger("focus");
        }
        else if (password === '') {
            $emailContainer.removeClass('incorrect');
            $loginForm.addClass('both-incorrect-inputs');
            $passwordField.focus();
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

        var $topLoginPopup = $('.top-login-popup');
        var $loginForm = $topLoginPopup.find('.account.top-login-form');
        var $emailContainer = $topLoginPopup.find('.account.input-wrapper.email');
        var $passwordContainer = $topLoginPopup.find('.account.input-wrapper.password');
        var $passwordField = $passwordContainer.find('input');
        var $button = $topLoginPopup.find('.top-dialog-login-button');

        // Remove loading spinner on the button
        $button.removeClass('loading');

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
            $passwordField.focus();
            $emailContainer.removeClass('incorrect');
            $loginForm.addClass('both-incorrect-inputs');
            $passwordField.select();
        }
    }
};
