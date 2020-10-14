/**
 * Login functionality
 */
mobile.signin = {

    /** jQuery selector for the login/register screen */
    $screen: null,

    /** The previous email used, if set will be pre-populated in the login form */
    previousEmailUsed: null,

    /**
     * Render the signin screen
     */
    show: function() {

        'use strict';

        // Cache the selector
        this.$screen = $('.mobile.signin-register-block');

        // Show the login/register screen
        this.$screen.removeClass('hidden');

        // Show the login tab and hide the register tab until they manually open it
        this.$screen.find('.tab-block.sign-in').removeClass('hidden');
        this.$screen.find('.tab-block.register').addClass('hidden');
        this.$screen.find('.mobile.forgot-password-button, .mobile.top-links').removeClass('hidden');

        // Init functionality
        this.prefillLoginMessage();
        this.prefillEmailField();
        this.initLoginButton();
        this.initForgotPasswordButton();
        this.initEmailPasswordKeyupEvents();

        // Initialise the Remember Me checkbox, top button tabs
        mobile.initTabs('login');
        mobile.initCheckbox('remember-me');
        mobile.initHeaderMegaIcon();
    },

    /**
     * Shows a custom message on the login page if they got redirected from somewhere else
     */
    prefillLoginMessage: function() {

        'use strict';

        // If the custom message is set
        if (login_txt) {

            // Default messages
            var $containerBlock = this.$screen.find('.custom-login-message-block.original-message');
            var $messageText = $containerBlock.find('.custom-login-text');
            var messageToShow = login_txt;

            // If a phone number has been used as the text, show a special custom phone verified icon & message
            if (login_txt.charAt(0) === '+') {
                $containerBlock = this.$screen.find('.custom-login-message-block.sms-verified-message');
                $messageText = $containerBlock.find('.js-user-phone-number');
            }

            // Unhide the block and show the message
            $containerBlock.removeClass('hidden');
            $messageText.text(messageToShow);

            // Clear the message so it's only shown once
            login_txt = false;
        }
    },

    /**
     * Pre-fills the email text input if recently completed the recovery process
     */
    prefillEmailField: function() {

        'use strict';

        var $emailField = this.$screen.find('.signin-input.login input');

        // If the email has been set (e.g. from recovery process), pre-fill the email field
        if (this.previousEmailUsed || window.login_email) {
            $emailField.val(this.previousEmailUsed || window.login_email);
        }
    },

    /**
     * Enable the login button if email and password is complete
     */
    initEmailPasswordKeyupEvents: function() {

        'use strict';

        var $emailField = this.$screen.find('.signin-input.login input');
        var $passwordField = this.$screen.find('.signin-input.password input');
        var $bothFields = $emailField.add($passwordField);
        var $signInButton = this.$screen.find('.signin-button');

        // Add keyup event to the email and password fields
        $bothFields.rebind('keyup', function(event) {

            // Change the button to red to enable it if they have entered something in the two fields
            if ($emailField.val().length > 0 && $passwordField.val().length > 0) {
                $signInButton.addClass('active');

                // If the Enter key is pressed try logging them in
                if (event.which === 13) {
                    $signInButton.trigger('tap');
                }
            }
            else {
                // Grey it out if they have not completed one of the fields
                $signInButton.removeClass('active');
            }
        });
    },

    /**
     * Initialise the login button to log the user into the site
     */
    initLoginButton: function() {

        'use strict';

        var $emailField = this.$screen.find('.signin-input.login input');
        var $passwordField = this.$screen.find('.signin-input.password input');
        var $signInButton = this.$screen.find('.signin-button');
        var $rememberMeCheckbox = this.$screen.find('.remember-me .checkbox');

        // Add click/tap handler to login button
        $signInButton.off('tap').on('tap', function() {

            // Get the current text field values
            var email = $emailField.val().trim();
            var password = $passwordField.val();
            var rememberMe = $rememberMeCheckbox.is(':checked');
            var twoFactorPin = null;

            // If the fields are not completed, the button should not do anything and looks disabled anyway
            if (email.length < 1 || password.length < 1) {
                return false;
            }

            // If the email is invalid
            if (!isValidEmail(email)) {

                // Add red border, red text and show warning icon
                $emailField.parent().addClass('incorrect');

                // Show an error and don't proceed
                mobile.messageOverlay.show(l[198]);         // Please enter a valid e-mail address.
                return false;
            }

            // Unfocus (blur) the input fields to prevent the cursor showing on iOS and also hide the keyboard
            $emailField.add($passwordField).trigger("blur");

            // Hide the text and show a loading spinner
            $signInButton.addClass('loading');

            // Start the login flow and set different callbacks for the old and new registration types
            security.login.checkLoginMethod(
                email,
                password,
                twoFactorPin,
                rememberMe,
                mobile.signin.old.startLogin,
                mobile.signin.new.startLogin);

            // Prevent double clicks/taps
            return false;
        });
    },

    /**
     * Initialise the Forgot Password button
     */
    initForgotPasswordButton: function() {

        'use strict';

        // Add click/tap handler to Forgot Password button
        this.$screen.find('.forgot-password-button').off('tap').on('tap', function() {

            var email = $('.signin-input.login input').val();

            if (isValidEmail(email)) {
                $.prefillEmail = email;
            }

            // Load the Recovery page
            loadSubPage('recovery');
            return false;
        });
    }
};


/**
 * Functions for the old login process which will need to be retained until everyone has upgraded to the new process
 */
mobile.signin.old = {

    /**
     * Start the login process
     * @param {String} email The user's email addresss
     * @param {String} password The user's password as entered
     * @param {String|null} pinCode The two-factor authentication PIN code (6 digit number), or null if not applicable
     * @param {Boolean} rememberMe A boolean for if they checked the Remember Me checkbox on the login screen
     */
    startLogin: function(email, password, pinCode, rememberMe) {

        'use strict';

        // If email confirm code is ok
        if (confirmok) {
            doConfirm(email, password, function() {
                postLogin(email, password, pinCode, rememberMe, function(result) {

                    // Hide the loading spinner
                    mobile.signin.$screen.find('.signin-button').removeClass('loading');

                    // Check they are not locked out
                    if (result === EBLOCKED) {
                        mobile.messageOverlay.show(l[730]);
                    }
                    else if (result !== false && result >= 0) {
                        u_type = result;
                        loadSubPage('key');
                    }
                    else {
                        // Otherwise they used an incorrect email or password so show an error
                        mobile.messageOverlay.show(l[16349], l[16350]);
                    }
                });
            });
        }
        else {
            // Run the regular login process
            postLogin(email, password, pinCode, rememberMe, mobile.signin.old.completeLogin);
        }
    },

    /**
     * Complete the login process and redirect to the cloud drive
     * @param {Number} result If the result is negative there is an error, if positive it is the user type
     */
    completeLogin: function(result) {

        'use strict';

        // Hide the loading spinner
        mobile.signin.$screen.find('.signin-button').removeClass('loading');

        // If the Two-Factor PIN is required
        if (result === EMFAREQUIRED) {

            // Load the Two-Factor PIN entry page
            loadSubPage('twofactor/verify-login');
            return false;
        }

        // Check they are not locked out
        else if (result === EBLOCKED) {
            mobile.messageOverlay.show(l[730]);
        }

        // If there was a 2FA error, show a message that the PIN code was incorrect and clear the text field
        else if (result === EFAILED) {
            mobile.twofactor.verifyLogin.showVerificationError();
        }

        // Otherwise if successful
        else if (result !== false && result >= 0) {

            // Set the u_type e.g. 3 is fully registered user
            u_type = result;

            // Try getting the plan number they selected on Pro page
            var planNum = localStorage.getItem('proPageContinuePlanNum');

            // If they did come from the Pro page, continue to Pro page Step 2
            if (planNum !== null) {

                // Remove the flag as it's no longer needed
                localStorage.removeItem('proPageContinuePlanNum');

                // Continue to the Pro payment page
                loadSubPage('propay_' + planNum);
            }

            // If they were on a page and asked to login before accessing
            else if (login_next) {

                if (typeof login_next === 'function') {
                    return login_next();                    
                }

                // Store the page temporarily
                var nextPageAfterLogin = login_next;

                // Clear the variable so subsequent logins work fine
                login_next = false;

                // Redirect back to the page
                loadSubPage(nextPageAfterLogin);
            }
            else {
                // Load the file manager
                loadSubPage('fm');
            }
        }
        else {
            // Otherwise they used an incorrect email or password so show an error
            mobile.messageOverlay.show(l[16349], l[16350]);
        }
    }
};

/**
 * Functions for the new secure login process
 */
mobile.signin.new = {

    /**
     * Start the login process
     * @param {String} email The user's email addresss
     * @param {String} password The user's password as entered
     * @param {String|null} pinCode The two-factor authentication PIN code (6 digit number), or null if not applicable
     * @param {Boolean} rememberMe A boolean for if they checked the Remember Me checkbox on the login screen
     * @param {String} salt The user's salt as a Base64 URL encoded string
     */
    startLogin: function(email, password, pinCode, rememberMe, salt) {

        'use strict';

        // Start the login using the new process
        security.login.startLogin(email, password, pinCode, rememberMe, salt, mobile.signin.new.completeLogin);
    },

    /**
     * Complete the login process and redirect to key generation step if newly registered, or to the cloud drive
     * @param {Number} result If the result is negative there is an error, if positive it is the user type
     */
    completeLogin: function(result) {

        'use strict';

        // Hide the loading spinner
        mobile.signin.$screen.find('.signin-button').removeClass('loading');

        // If email confirm code is ok
        if (confirmok) {
            if (result === EBLOCKED) {
                mobile.messageOverlay.show(l[730]);
            }
            else if (result !== false && result >= 0) {
                u_type = result;
                loadSubPage('key');
            }
            else {
                // Otherwise they used an incorrect email or password so show an error
                mobile.messageOverlay.show(l[16349], l[16350]);
            }
        }
        else {
            // If the Two-Factor PIN is required
            if (result === EMFAREQUIRED) {

                // Load the Two-Factor PIN entry page
                loadSubPage('twofactor/verify-login');
                return false;
            }

            // Check they are not locked out
            else if (result === EBLOCKED) {
                mobile.messageOverlay.show(l[730]);
            }

            // If there was a 2FA error, show a message that the PIN code was incorrect and clear the text field
            else if (result === EFAILED) {
                mobile.twofactor.verifyLogin.showVerificationError();
            }

            // Otherwise if successful
            else if (result !== false && result >= 0) {

                // Set the u_type e.g. 3 is fully registered user
                u_type = result;

                // Try getting the plan number they selected on Pro page
                var planNum = localStorage.getItem('proPageContinuePlanNum');

                // If they did come from the Pro page, continue to Pro page Step 2
                if (planNum !== null) {

                    // Remove the flag as it's no longer needed
                    localStorage.removeItem('proPageContinuePlanNum');

                    // Continue to the Pro payment page
                    loadSubPage('propay_' + planNum);
                }

                // If they were on a page and asked to login before accessing
                else if (login_next) {

                    if (typeof login_next === 'function') {
                        return login_next();                    
                    }
                    
                    // Store the page temporarily
                    var nextPageAfterLogin = login_next;

                    // Clear the variable so subsequent logins work fine
                    login_next = false;

                    // Redirect back to the page
                    loadSubPage(nextPageAfterLogin);
                }
                else {
                    // Load the file manager
                    loadSubPage('fm');
                }
            }
            else {
                // Otherwise they used an incorrect email or password so show an error
                mobile.messageOverlay.show(l[16349], l[16350]);
            }
        }
    }
};
