/**
 * Register functionality
 */
mobile.register = {

    /** jQuery selector for the signin/register screen */
    $screen: null,

    /** jQuery selector for just the registration elements */
    $registerScreen: null,

    /**
     * Render the signin screen
     */
    show: function() {

        'use strict';

        // Cache the selector
        this.$screen = $('.mobile.signin-register-block');
        this.$registerScreen = this.$screen.find('.tab-block.register');

        // Show the login/register screen
        this.$screen.removeClass('hidden');

        // Show the register tab and hide the login tab until they manually open it
        this.$screen.find('.tab-block.register').removeClass('hidden');
        this.$screen.find('.tab-block.sign-in').addClass('hidden');

        // Initialise the login/register tabs and the Agree to Terms of Service checkbox
        mobile.initTabs('register');
        mobile.initCheckbox('confirm-terms');
        mobile.initHeaderMegaIcon();
        mobile.initMobileAppButton();

        // Activate register button when fields are complete
        this.initKeyupEvents();
        this.initRegisterButton();
        this.initBlurEvents();

        // Load password strength estimator
        this.loadPasswordEstimatorLibrary();
        this.initPasswordStrengthCheck();
    },

    /**
     * Enable the register button if the fields are complete and correct
     */
    initKeyupEvents: function() {

        'use strict';

        var $firstNameField = this.$registerScreen.find('.first-name input');
        var $lastNameField = this.$registerScreen.find('.last-name input');
        var $emailField = this.$registerScreen.find('.email-address input');
        var $passwordField = this.$registerScreen.find('.password input');
        var $confirmPasswordField = this.$registerScreen.find('.password-confirm input');
        var $registerButton = this.$registerScreen.find('.register-button');
        var $allFields = $firstNameField.add($lastNameField).add($emailField)
                            .add($passwordField).add($confirmPasswordField);

        // Add keyup event to the input fields
        $allFields.rebind('keyup', function(event) {

            var firstName = $firstNameField.val();
            var lastName = $lastNameField.val();
            var email = $emailField.val();
            var password = $passwordField.val();
            var confirmPassword = $confirmPasswordField.val();

            // when email was incorrect and it updated as correct, remove incorrect class with keyup
            if ($emailField.parent().hasClass('incorrect') && !checkMail(email)) {
                $emailField.parent().removeClass('incorrect');
            }

            // Change the button to red to enable it if they have entered something in all the fields
            if (firstName.length > 0 && lastName.length > 0 && email.length > 0 &&
                    password.length > 0 && confirmPassword.length > 0 &&
                    !$emailField.parent().hasClass('incorrect')) {

                // Activate the register button
                $registerButton.addClass('active');

                // If the Enter key is pressed try registering
                if (event.which === 13) {
                    $registerButton.trigger('tap');
                }
            }
            else {
                // Grey it out if they have not completed one of the fields
                $registerButton.removeClass('active');
            }
        });
    },

    /**
     * Enable the register button if email is valid.
     */
    initBlurEvents: function() {

        'use strict';

        var $emailField = this.$registerScreen.find('.email-address input');
        var $registerButton = this.$registerScreen.find('.register-button');

        // Add blur event to the email input fields
        $emailField.rebind('blur', function() {

            var email = $emailField.val();

            // If invalid email, deactivate register button, show toast and add red border to field
            if (checkMail(email)) {
                $emailField.parent().addClass('incorrect');
                $registerButton.removeClass('active');
                mobile.showToast(l[1101]);
            }
            else {
                // Remove field red border, activate the register button,
                // trigger keyup handler to set register button to active
                $emailField.parent().removeClass('incorrect');
                $registerButton.addClass('active');
                $emailField.trigger('keyup');
            }
        });
    },

    /**
     * Load the ZXCVBN password strength estimator library
     */
    loadPasswordEstimatorLibrary: function() {

        'use strict';

        // Make sure the library is loaded
        if (typeof zxcvbn === 'undefined') {

            // Show loading spinner
            var $loader = this.$registerScreen.find('.estimator-loading-icon').addClass('loading');

            // On completion of loading, hide the loading spinner
            M.require('zxcvbn_js')
                .done(function() {
                    $loader.removeClass('loading');
                });
        }
    },

    /**
     * Show what strength the currently entered password is on key up
     */
    initPasswordStrengthCheck: function() {

        'use strict';

        var $passwordStrengthBar = this.$registerScreen.find('.password-strength');
        var $passwordInput = this.$registerScreen.find('.signin-input.password input');

        // Add keyup event to the password text field
        $passwordInput.rebind('keyup', function() {

            // Make sure the ZXCVBN password strength estimator library is loaded first
            if (typeof zxcvbn !== 'undefined') {

                // Estimate the password strength
                var password = $.trim($passwordInput.val());
                var passwordScore = zxcvbn(password).score;
                var passwordLength = password.length;

                // Remove previous strength classes that were added
                $passwordStrengthBar.removeClass('good1 good2 good3 good4 good5');

                // Add colour coding
                if (passwordLength === 0) {
                    return false;
                }
                else if (passwordLength < security.minPasswordLength) {
                    $passwordStrengthBar.addClass('good1');    // Too short
                }
                else if (passwordScore === 4) {
                    $passwordStrengthBar.addClass('good5');    // Strong
                }
                else if (passwordScore === 3) {
                    $passwordStrengthBar.addClass('good4');    // Good
                }
                else if (passwordScore === 2) {
                    $passwordStrengthBar.addClass('good3');    // Medium
                }
                else if (passwordScore === 1) {
                    $passwordStrengthBar.addClass('good2');    // Weak
                }
                else {
                    $passwordStrengthBar.addClass('good1');    // Very Weak
                }
            }
        });
    },

    /**
     * Initialise the register button
     */
    initRegisterButton: function() {

        'use strict';

        var $firstNameField = this.$registerScreen.find('.first-name input');
        var $lastNameField = this.$registerScreen.find('.last-name input');
        var $emailField = this.$registerScreen.find('.email-address input');
        var $passwordField = this.$registerScreen.find('.password input');
        var $confirmPasswordField = this.$registerScreen.find('.password-confirm input');
        var $passwordStrengthBar = this.$registerScreen.find('.password-strength');
        var $confirmTermsCheckbox = this.$registerScreen.find('.confirm-terms input');
        var $registerButton = this.$registerScreen.find('.register-button');
        var $containerFields = $emailField.parent().add($passwordField.parent()).add($confirmPasswordField.parent());

        // Add click/tap handler to login button
        $registerButton.off('tap').on('tap', function() {

            // Get the current text field values
            var firstName = $.trim($firstNameField.val());
            var lastName = $.trim($lastNameField.val());
            var email = $.trim($emailField.val());
            var password = $.trim($passwordField.val());
            var confirmPassword = $.trim($confirmPasswordField.val());

            // If the fields are not completed, the button should not do anything and looks disabled anyway
            if (firstName.length < 1 || lastName.length < 1 || email.length < 1 ||
                    password.length < 1 || confirmPassword.length < 1) {

                return false;
            }

            // If email is incorrect make button invalid and show toast message.
            if (checkMail(email)) {
                if (!$emailField.parent().hasClass('incorrect')) {
                    mobile.showToast(l[1101]);
                }
                $emailField.parent().addClass('incorrect');
                $registerButton.removeClass('active');
                return false;
            }

            // Unfocus (blur) the input fields to prevent the cursor showing on iOS and also hide the keyboard
            $firstNameField.add($lastNameField).add($emailField)
                .add($passwordField).add($confirmPasswordField)
                .trigger("blur");

            // Clear old errors from past form submissions
            $containerFields.removeClass('incorrect');

            // If they have not confirmed the Terms of Service then show an error and don't proceed
            if (!$confirmTermsCheckbox.is(':checked')) {
                mobile.showToast(l[7241]);        // You must agree with our Terms of Service
                return false;
            }

            // If the passwords are not the same
            if (password !== confirmPassword) {

                // Add red border, red text and show warning icon
                $passwordField.parent().addClass('incorrect');
                $confirmPasswordField.parent().addClass('incorrect');

                // Show an error and don't proceed
                mobile.messageOverlay.show(l[9066]);        // The passwords are not the same...
                return false;
            }

            // Check for minimum length password
            if (password.length < security.minPasswordLength) {

                // Add red border, red text and show warning icon
                $passwordField.parent().addClass('incorrect');
                $confirmPasswordField.parent().addClass('incorrect');

                // Then show an error and don't proceed
                mobile.messageOverlay.show(l[18701]);        // Your password needs to be at least 8 characters long.
                return false;
            }

            // If the password has the 'Very weak' class i.e. it's not strong enough
            if ($passwordStrengthBar.hasClass('good1')) {

                // Add red border, red text and show warning icon
                $passwordField.parent().addClass('incorrect');

                // Then show an error and don't proceed
                mobile.messageOverlay.show(l[1104]);        // Please strengthen your password.
                return false;
            }

            // If they came from the Pro page, set the flag
            var fromProPage = (localStorage.getItem('proPageContinuePlanNum') !== null) ? true : false;

            // If the flag has been set to use the new registration method
            var method = (security.register.newRegistrationEnabled()) ? 'new' : 'old';

            // Start the registration process
            mobile.register[method].startRegistration(
                firstName,
                lastName,
                email,
                password,
                fromProPage,
                mobile.register[method].completeRegistration     // Complete callback
            );

            // Prevent double taps
            return false;
        });
    },

    /**
     * Shows the email confirmation screen
     * @param {Object} registrationVars The registration form variables i.e. name, email etc
     */
    showConfirmEmailScreen: function(registrationVars) {

        'use strict';

        var $confirmScreen = $('.registration-confirm-email');
        var $registerScreen = $('.mobile.signin-register-block');
        var $changeEmailInput = $confirmScreen.find('.change-email input');
        var $resendButton = $confirmScreen.find('.resend-button');

        // If the flag has been set to use the new registration method
        var method = (security.register.newRegistrationEnabled()) ? 'new' : 'old';

        // Hide the current register screen and show the confirmation one
        $registerScreen.addClass('hidden');
        $confirmScreen.removeClass('hidden');

        // Set the email into the text field
        $changeEmailInput.val(registrationVars.email);

        // Init email input keyup
        mobile.register.initConfirmEmailScreenKeyup($changeEmailInput, $resendButton);

        // Initialise the Resend button
        mobile.register[method].initConfirmEmailScreenResendButton(
            $changeEmailInput, $resendButton, registrationVars
        );
    },

    /**
     * Initialise the email input keyup which will enable the Resend button
     * @param {Object} $changeEmailInput jQuery selector for the email input
     * @param {Object} $resendButton jQuery selector for the Resend button
     */
    initConfirmEmailScreenKeyup: function($changeEmailInput, $resendButton) {

        'use strict';

        // Enable the resend button on keyup
        $changeEmailInput.rebind('keyup', function(event) {

            var email = $(this).val();

            // Change the button to red if the email is valid
            if (!checkMail(email)) {

                // Activate the resend button
                $resendButton.addClass('active');

                // If the Enter key is pressed try resending
                if (event.which === 13) {
                    $resendButton.trigger('tap');
                }
            }
            else {
                // Grey it out if they have not completed one of the fields
                $resendButton.removeClass('active');
            }
        });
    },

    /**
     * Shows the login screen with a few things changed so they know they are
     * confirming their account and about to proceed to the key creation step
     * @param {String} email The user's email address from the confirm code
     */
    showConfirmAccountScreen: function(email) {

        'use strict';

        // Show the general login screen
        mobile.signin.show();

        // Change the header text, hide the registration and preinput the email
        var $loginScreen = $('.signin-register-block');
        $loginScreen.find('.fm-header-txt.sign-in').text(l[812]);            // Confirm Account
        $loginScreen.find('.signin-input.login input').val(email);
    },

    /**
     * Show an account confirmation failure
     * @param {Number} apiResult An error code from the API
     */
    showConfirmAccountFailure: function(apiResult) {

        'use strict';

        // Show the general login screen
        mobile.signin.show();

        // Check for various error codes and show error messages
        if (apiResult === EINCOMPLETE) {
            mobile.messageOverlay.show(l[703]);   // Your sign-up link is not valid...
        }
        else if (apiResult === ENOENT) {
            mobile.messageOverlay.show(l[704]);   // Your account has already been activated. Please log in.
        }
        else {
            mobile.messageOverlay.show(l[705] + ' ' + apiResult);     // Please sign up again. Error code: xx
        }
    },

    /**
     * Shows the screen with a spinning image while the RSA keys are being generated
     */
    showGeneratingKeysScreen: function() {

        'use strict';

        // Show animation
        $('.mobile.registration-generating-keys').removeClass('hidden');
    }
};


/**
 * Functions for the old registration process. ToDo: remove this code once the new process is enabled across all apps.
 **/
mobile.register.old = {

    /**
     * Start the registration process
     * @param {String} firstName The user's first name
     * @param {String} lastName The user's last name
     * @param {String} email The user's email address
     * @param {String} password The user's password
     * @param {Boolean} fromProPage Whether the registration started on the Pro page or not
     * @param {Function} completeCallback A function to run when the registration is complete
     */
    startRegistration: function(firstName, lastName, email, password, fromProPage, completeCallback) {

        'use strict';

        // Show loading dialog
        loadingDialog.show();

        // Set a flag to check at the end of the registration process
        localStorage.signUpStartedInMobileWeb = '1';

        u_storage = init_storage(localStorage);

        var userContext = {
            checkloginresult: function(context, result) {

                // Set the user type
                u_type = result;

                // Register the account
                completeCallback(firstName, lastName, email, password, fromProPage);
            }
        };

        // Create anonymous account
        u_checklogin(userContext, true);
    },

    /**
     * Send the signup link via email
     * @param {String} firstName The user's first name
     * @param {String} lastName The user's last name
     * @param {String} email The user's email address
     * @param {String} password The user's password
     * @param {Boolean} fromProPage Whether the registration started on the Pro page or not
     */
    completeRegistration: function(firstName, lastName, email, password, fromProPage) {

        'use strict';

        var registrationVars = {
            password: password,
            first: firstName,
            last: lastName,
            email: email,
            name: firstName + ' ' + lastName
        };
        var context = {
            callback: function(result) {

                loadingDialog.hide();

                // If successful result
                if (result === 0) {
                    var ops = {
                        a: 'up',
                        terms: 'Mq',
                        firstname: base64urlencode(to8(registrationVars.first)),
                        lastname: base64urlencode(to8(registrationVars.last)),
                        name2: base64urlencode(to8(registrationVars.name))
                    };

                    u_attr.terms = 1;
                    localStorage.awaitingConfirmationAccount = JSON.stringify(registrationVars);

                    api_req(ops);

                    // Try getting the plan number they selected on Pro page
                    var planNum = localStorage.getItem('proPageContinuePlanNum');

                    // If they did come from the Pro page, continue to Pro page Step 2 and skip email confirmation
                    if (planNum !== null) {

                        // Remove the flag as it's no longer needed
                        localStorage.removeItem('proPageContinuePlanNum');

                        // Continue to the Pro payment page
                        loadSubPage('propay_' + planNum);
                    }
                    else {
                        // Otherwise show the signup email confirmation screen
                        mobile.register.showConfirmEmailScreen(registrationVars);
                    }
                }

                // Show an error if the email is already in use
                else if (result === EEXIST) {
                    mobile.messageOverlay.show(l[9000]);    // Error. This email address is already in use.
                }
                else {
                    // Show an error
                    mobile.messageOverlay.show(l[47], result);      // Oops, something went wrong.
                }
            }
        };

        // Run the old password key derivation function, encrypt the Master Key and send the confirmation email
        sendsignuplink(registrationVars.name, registrationVars.email, registrationVars.password, context, fromProPage);
    },

    /**
     * Initialises the Resend button on the email confirmation screen to send the confirmation link again
     * Uses the old registration process. ToDo: Remove in future when old registrations are no longer used.
     * @param {Object} $changeEmailInput jQuery selector for the email input
     * @param {Object} $resendButton jQuery selector for the Resend button
     * @param {Object} registrationVars The registration form variables i.e. name, email etc
     */
    initConfirmEmailScreenResendButton: function($changeEmailInput, $resendButton, registrationVars) {

        'use strict';

        // Add click/tap handler to resend button
        $resendButton.off('tap').on('tap', function() {

            // Make sure the button is enabled
            if (!$resendButton.hasClass('active')) {
                return false;
            }

            // Update the email to the new email address
            registrationVars.email = $.trim($changeEmailInput.val());

            // Show the loading dialog
            loadingDialog.show();

            // Setup subsequent API request
            var context = {
                callback: function(result) {

                    loadingDialog.hide();

                    // If successful result
                    if (result === 0) {
                        var ops = {
                            a: 'up',
                            terms: 'Mq',
                            firstname: base64urlencode(to8(registrationVars.first)),
                            lastname: base64urlencode(to8(registrationVars.last)),
                            name2: base64urlencode(to8(registrationVars.name))
                        };

                        u_attr.terms = 1;
                        localStorage.awaitingConfirmationAccount = JSON.stringify(registrationVars);

                        api_req(ops);

                        // Show a dialog success
                        mobile.messageOverlay.show(l[16351]);     // The email was sent successfully.
                    }
                    else {
                        // Show an error
                        mobile.messageOverlay.show(l[47]);     // Oops, something went wrong. Sorry about that!
                    }
                }
            };

            // Send the confirmation email
            sendsignuplink(registrationVars.name, registrationVars.email, registrationVars.password, context);

            // Only let them send once (until they change email again)
            $resendButton.removeClass('active');

            // Prevent double taps
            return false;
        });
    }
};


/**
 * Functions for the new secure registration process
 */
mobile.register.new = {

    /**
     * Start the registration process
     * @param {String} firstName The user's first name
     * @param {String} lastName The user's last name
     * @param {String} email The user's email address
     * @param {String} password The user's password
     * @param {Boolean} fromProPage Whether the registration started on the Pro page or not
     * @param {Function} completeCallback A function to run when the registration is complete
     */
    startRegistration: function(firstName, lastName, email, password, fromProPage, completeCallback) {

        'use strict';

        // Show loading dialog
        loadingDialog.show();

        // Set a flag to check at the end of the registration process
        localStorage.signUpStartedInMobileWeb = '1';

        // Start the new secure registration process
        security.register.startRegistration(firstName, lastName, email, password, fromProPage, completeCallback);
    },

    /**
     * Initialises the Resend button on the email confirmation screen to send the confirmation link again
     * Uses the new improved registration process.
     * @param {Object} $changeEmailInput jQuery selector for the email input
     * @param {Object} $resendButton jQuery selector for the Resend button
     */
    initConfirmEmailScreenResendButton: function($changeEmailInput, $resendButton) {

        'use strict';

        // Add click/tap handler to resend button
        $resendButton.off('tap').on('tap', function() {

            // Make sure the button is enabled
            if (!$resendButton.hasClass('active')) {
                return false;
            }

            // Get the new email address entered by the user
            var newEmail = $.trim($changeEmailInput.val());

            // Re-send signup link email
            security.register.repeatSendSignupLink(
                newEmail,
                mobile.register.new.completeRegistration    // Complete callback
            );
        });
    },

    /**
     * Complete the initial registration process after sending the user a confirmation email
     * @param {Number} result The result of the API request that sent the user's a confirmation email
     * @param {String} firstName The user's first name
     * @param {String} lastName The user's last name
     * @param {String} email The user's email address
     */
    completeRegistration: function(result, firstName, lastName, email) {

        'use strict';

        // Set some variables which are saved for use later
        var registrationVars = {
            first: firstName,
            last: lastName,
            email: email,
            name: firstName + ' ' + lastName
        };

        // If successful result
        if (result === 0) {

            u_attr.terms = 1;
            localStorage.awaitingConfirmationAccount = JSON.stringify(registrationVars);

            // Try getting the plan number they selected on Pro page
            var planNum = localStorage.getItem('proPageContinuePlanNum');

            // If they did come from the Pro page, continue to Pro page Step 2 and skip email confirmation
            if (planNum !== null) {

                // Remove the flag as it's no longer needed
                localStorage.removeItem('proPageContinuePlanNum');

                // Continue to the Pro payment page
                loadSubPage('propay_' + planNum);
            }
            else {
                // Otherwise show the signup email confirmation screen
                mobile.register.showConfirmEmailScreen(registrationVars);
            }
        }

        // Show an error if the email is already in use
        else if (result === EEXIST) {
            mobile.messageOverlay.show(l[9000]);    // Error. This email address is already in use.
        }
        else {
            // Show an error
            mobile.messageOverlay.show(l[47], result);      // Oops, something went wrong.
        }
    }
};
