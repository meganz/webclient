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
     * @param {Object} registerInfo     Information passed to register page, used in Business accounts
     */
    show: function(registerInfo) {
        'use strict';

        // Cache the selector
        this.$screen = $('.mobile.signin-register-block');
        this.$registerScreen = this.$screen.find('.tab-block.register');

        // Cache registerInfo
        this.registerInfo = registerInfo;

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
        mobile.initPasswordEstimatorLibrary(this.$screen);
        mobile.initPasswordStrengthCheck(this.$screen);

        // Activate register button when fields are complete
        this.initKeyupEvents();
        this.initRegisterButton();
        this.initBlurEvents();

        // If we have valid passed registerInfo for Business, modify the UI
        if (registerInfo && registerInfo.firstname && registerInfo.lastname && registerInfo.e) {
            var $temp = $('.mobile.signin-input.first-name', this.$registerScreen).addClass('hidden');
            $('input', $temp).val(from8(base64urldecode(registerInfo.firstname)));

            $temp = $('.mobile.signin-input.last-name', this.$registerScreen).addClass('hidden');
            $('input', $temp).val(from8(base64urldecode(registerInfo.lastname)));

            $temp = $('.mobile.signin-input.email-address', this.$registerScreen).addClass('hidden');
            $('input', $temp).val(registerInfo.e);

            $('.top-link.sign-in', this.$screen).addClass('hidden');
        }
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
        var $tncBlock = $('.confirm-terms', this.$registerScreen);
        var $tncCheckbox = $('input', $tncBlock);
        var $allFields = $firstNameField.add($lastNameField).add($emailField)
                            .add($passwordField).add($confirmPasswordField);

        // Add keyup event to the input fields
        var registerButtonCheck = function(event) {

            var firstName = $firstNameField.val();
            var lastName = $lastNameField.val();
            var email = $emailField.val();
            var password = $passwordField.val();
            var confirmPassword = $confirmPasswordField.val();

            // when email was incorrect and it updated as correct, remove incorrect class with keyup
            if ($emailField.parent().hasClass('incorrect') && isValidEmail(email)) {
                $emailField.parent().removeClass('incorrect');
            }

            // Change the button to red to enable it if they have entered something in all the fields
            if (firstName.length > 0 && lastName.length > 0 && email.length > 0 &&
                    password.length > 0 && confirmPassword.length > 0 && $tncCheckbox[0].checked === true &&
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
        };

        $allFields.rebind('keyup.registerbuttoncheck', registerButtonCheck);
        $tncBlock.rebind('tap.registerbuttoncheck', registerButtonCheck);
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
            if (!isValidEmail(email)) {
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
     * Initialise the register button
     */
    initRegisterButton: function() {

        'use strict';

        var $firstNameField = this.$registerScreen.find('.first-name input');
        var $lastNameField = this.$registerScreen.find('.last-name input');
        var $emailField = this.$registerScreen.find('.email-address input');
        var $passwordField = this.$registerScreen.find('.password input');
        var $confirmPasswordField = this.$registerScreen.find('.password-confirm input');
        var $confirmTermsCheckbox = this.$registerScreen.find('.confirm-terms input');
        var $tncCheckbox = $('.confirm-terms input', this.$registerScreen);
        var $registerButton = this.$registerScreen.find('.register-button');
        var $containerFields = $emailField.parent().add($passwordField.parent()).add($confirmPasswordField.parent());
        var registerInfo = this.registerInfo;

        // Add click/tap handler to login button
        $registerButton.off('tap').on('tap', function() {

            // Get the current text field values
            var firstName = $.trim($firstNameField.val());
            var lastName = $.trim($lastNameField.val());
            var email = $.trim($emailField.val());
            var password = $passwordField.val();
            var confirmPassword = $confirmPasswordField.val();

            // If the fields are not completed, the button should not do anything and looks disabled anyway
            if (firstName.length < 1 || lastName.length < 1 || email.length < 1 ||
                    password.length < 1 || confirmPassword.length < 1 || $tncCheckbox[0].checked === false) {

                return false;
            }

            // If email is incorrect make button invalid and show toast message.
            if (!isValidEmail(email)) {
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

            // Check if the entered passwords are valid or strong enough
            var passwordValidationResult = security.isValidPassword(password, confirmPassword);

            // If bad result
            if (passwordValidationResult !== true) {

                // Add red border, red input text and show warning icon
                $passwordField.parent().addClass('incorrect');
                $confirmPasswordField.parent().addClass('incorrect');

                // Show error dialog and return early
                mobile.messageOverlay.show(passwordValidationResult);
                return false;
            }

            // Set a flag indicating the registration came from the webclient.
            localStorage.signUpStartedInWebclient = '1';
            loadingDialog.show();

            // Business accounts have different flow
            if (registerInfo || localStorage.businessSubAc) {
                var signupcode = '';
                window.businessSubAc = registerInfo || JSON.parse(localStorage.businessSubAc);
                signupcode = window.businessSubAc.signupcode;
                var ctx = {
                    checkloginresult: function(u_ctx, r) {
                        loadingDialog.hide();
                        if (typeof r[0] === 'number' && r[0] < 0) {
                            msgDialog('warningb', l[135], l[200]);
                        }
                        else {
                            loadingDialog.hide();
                            u_type = r;

                            security.login.checkLoginMethod(
                                email,
                                password,
                                null,
                                false,
                                mobile.signin.old.startLogin,
                                mobile.signin.new.startLogin);

                            // I need this event handler to be triggered only once after successful sub-user login
                            mBroadcaster.once('fm:initialized', M.importWelcomePDF);
                            delete localStorage.businessSubAc;
                        }
                    },
                    businessUser: password   // we need the plain entered password in later stages
                    // because u_checklogin take the byte array of the password.
                };
                u_checklogin(
                    ctx,
                    true,
                    null,
                    signupcode,
                    firstName + ' ' + lastName);

            }
            else {
                // If they came from the Pro page, set the flag
                var fromProPage = localStorage.getItem('proPageContinuePlanNum') || false;

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
            }

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
        var $cancelRegistrationButton = $confirmScreen.find('.register-cancel-button');

        // Hide the current register screen and show the confirmation one
        $registerScreen.addClass('hidden');
        $confirmScreen.removeClass('hidden');

        // Set the email into the text field
        $changeEmailInput.val(registrationVars.email);

        // Init email input keyup
        mobile.register.initConfirmEmailScreenKeyup($changeEmailInput, $resendButton);

        // Initialise the Resend button
        mobile.register.initConfirmEmailScreenResendButton($changeEmailInput, $resendButton, registrationVars);
        mobile.register.initCancelRegistrationButton($cancelRegistrationButton);
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
            if (isValidEmail(email)) {

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

            // If the flag has been set to use the new registration method
            var method = (security.register.newRegistrationEnabled()) ? 'new' : 'old';

            // Update the email to the new email address
            registrationVars.email = $.trim($changeEmailInput.val());

            // Show the loading dialog
            loadingDialog.show();

            // Resend the email to the new address
            mobile.register[method].processResendEmail(registrationVars);

            // Only let them send once (until they change email again)
            $resendButton.removeClass('active');

            // Prevent double taps
            return false;
        });
    },

    /**
     * Initialises the cancel registration button.
     */
    initCancelRegistrationButton: function($button) {
        'use strict';
        $button.off('tap').on('tap', function() {
            mobile.messageOverlay.show(l[5710], false, mobile.register.abort, false, false, [l[79], l[78]]);
        });
    },

    /**
     * Shows the login screen with a few things changed so they know they are
     * confirming their account and about to proceed to the key creation step
     * @param {String} email                The user's email address from the confirm code
     * @param {Boolean} isBusinessSubUser   are we confirming a business sub-user
     */
    showConfirmAccountScreen: function (email, isBusinessSubUser) {

        'use strict';

        // Show the general login screen
        mobile.signin.show();

        // Change the header text, hide the registration and preinput the email
        var $loginScreen = $('.signin-register-block');
        window.scrollTo(0, 0);
        $loginScreen.find('.fm-header-txt.sign-in').text(l[812]);            // Confirm Account
        $loginScreen.find('.signin-input.login input').val(isBusinessSubUser ? email.e : email);
        $loginScreen.find('.mobile.forgot-password-button, .mobile.top-links').addClass('hidden');
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
            mobile.messageOverlay.show(l[19788]); // Your confirm link is no longer valid. Your account may already...
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
    },

    /**
     * Cancel registration attempt.
     */
    abort: function() {
        'use strict';
        api_req({ a: 'ucr' });
        delete localStorage.awaitingConfirmationAccount;
        init_page();
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
        loadingDialog.hide();
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

                    security.register.cacheRegistrationData(registrationVars);

                    if (mega.affid) {
                        ops.aff = mega.affid;
                    }

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
     * @param {Object} registrationVars The registration form variables i.e. name, email etc
     */
    processResendEmail: function(registrationVars) {

        'use strict';

        // Send the confirmation email
        sendsignuplink(registrationVars.name, registrationVars.email, registrationVars.password, {
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

                    security.register.cacheRegistrationData(registrationVars);

                    if (mega.affid) {
                        ops.aff = mega.affid;
                    }

                    api_req(ops);

                    // Show a dialog success
                    mobile.messageOverlay.show(l[16351]);     // The email was sent successfully.
                }
                else {
                    // Show an error
                    mobile.messageOverlay.show(l[47]);     // Oops, something went wrong. Sorry about that!
                }
            }
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
     * @param {Object} registrationVars The registration form variables i.e. name, email etc
     */
    processResendEmail: function(registrationVars) {

        'use strict';

        // Re-send signup link email
        security.register.repeatSendSignupLink(
            registrationVars.first,
            registrationVars.last,
            registrationVars.email,
            mobile.register.new.completeRegistration    // Complete callback
        );
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
        loadingDialog.hide();
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

            security.register.cacheRegistrationData(registrationVars);

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
            mobile.messageOverlay.show(l[9000], '', function() {
                if (isEphemeral()) {
                    // Prevent the ephemeral session in mobile web if the email has been registered
                    u_logout(true);
                }
            });    // Error. This email address is already in use.
        }
        else {
            // Show an error
            mobile.messageOverlay.show(l[47], result);      // Oops, something went wrong.
        }
    }
};
