/**
 * Two-Factor Authentication logic for logging in with 2FA, setting up 2FA, disabling etc.
 */

/**
 * Generic functions for the desktop code
 */
var twofactor = {

    /**
     * Checks if Two-Factor Authentication functionality is enabled for all users
     * i.e. the user is allowed to see the 2FA section and enable/disable 2FA.
     * @returns {Boolean} Returns true if enabled, false if not.
     */
    isEnabledGlobally: function() {

        'use strict';

        // If the localStorage override is set, use that on/off value for testing
        if (localStorage.getItem('twoFactorAuthEnabled') !== null) {
            return (localStorage.getItem('twoFactorAuthEnabled') === '1') ? true : false;
        }

        return mega.flags.mfae;
    },

    /**
     * Checks if 2FA is enabled on the user's account
     * @param {Function} callbackFunction The function to call when the results are returned,
     *                                    it passes the result of true for enabled and false for disabled
     */
    isEnabledForAccount: function(callbackFunction) {

        'use strict';

        loadingDialog.show();

        // Make Multi-Factor Auth Get request
        api_req({ a: 'mfag', e: u_attr.email }, {
            callback: function(result) {

                loadingDialog.hide();

                // Pass the result to the callback
                if (result === 1) {
                    callbackFunction(true);
                }
                else {
                    callbackFunction(false);
                }
            }
        });
    }
};

/**
 * Logic for the dialog where they enter a code for logging in
 */
twofactor.loginDialog = {

    /**
     * Intialise the dialog
     * @param {Function} oldStartLoginCallback The old registration method start login callback to run after 2FA verify
     * @param {Function} newStartLoginCallback The new registration method start login callback to run after 2FA verify
     */
    init: function(oldStartLoginCallback, newStartLoginCallback) {

        'use strict';

        // Show the dialog
        var $dialog = $('.fm-dialog.verify-two-factor-login');
        var $overlay = $('.dark-overlay');

        // Show the modal dialog
        $dialog.removeClass('hidden');
        $overlay.removeClass('hidden');

        // Initialise functionality
        this.initKeyupFunctionality();
        this.initSubmitButton(oldStartLoginCallback, newStartLoginCallback);
        this.initLostAuthenticatorDeviceButton();
        this.initCloseButton();
    },

    /**
     * Initialises keyup/blur functionality on the input field to check the PIN as it's being entered
     */
    initKeyupFunctionality: function() {

        'use strict';

        // Cache selectors
        var $dialog = $('.fm-dialog.verify-two-factor-login');
        var $pinCodeInput = $dialog.find('.pin-input');
        var $submitButton = $dialog.find('.submit-button');
        var $warningText = $dialog.find('.warning-text-field');

        // On keyup or clicking out of the text field
        $pinCodeInput.off('keyup blur').on('keyup blur', function(event) {

            // If Enter key is pressed, submit the login code
            if (event.keyCode === 13) {
                $submitButton.trigger('click');
            }

            // Hide previous warnings for incorrect PIN codes
            $warningText.addClass('hidden');

            // Trim whitespace from the ends of the PIN entered
            var pinCode = $pinCodeInput.val();
            var trimmedPinCode = $.trim(pinCode);

            // If empty, grey out the button so it appears unclickable
            if (trimmedPinCode === '' || trimmedPinCode.length !== 6 || Number.isInteger(trimmedPinCode)) {
                $submitButton.removeClass('active');
            }
            else {
                // Otherwise how the button as red/clickable
                $submitButton.addClass('active');
            }
        });

        // Put the focus in the PIN input field
        $pinCodeInput.trigger('focus');
    },

    /**
     * Initialise the Submit button
     * @param {Function} oldStartLoginCallback The old registration method start login callback
     * @param {Function} newStartLoginCallback The new registration method start login callback
     */
    initSubmitButton: function(oldStartLoginCallback, newStartLoginCallback) {

        'use strict';

        // Cache selectors
        var $dialog = $('.fm-dialog.verify-two-factor-login');
        var $pinCodeInput = $dialog.find('.pin-input');
        var $submitButton = $dialog.find('.submit-button');

        // On Submit button click
        $submitButton.rebind('click', function() {

            // Get the Google Authenticator PIN code from the user
            var pinCode = $.trim($pinCodeInput.val());

            // Get cached data from the login form
            var email = security.login.email.trim();
            var password = security.login.password;
            var rememberMe = security.login.rememberMe;

            // Show loading spinner on the buttons
            $submitButton.addClass('loading');

            // Check if using old/new login method and log them in
            security.login.checkLoginMethod(email, password, pinCode, rememberMe,
                                            oldStartLoginCallback,
                                            newStartLoginCallback);
        });
    },

    /**
     * Initialise the Lost Authenticator Device button
     */
    initLostAuthenticatorDeviceButton: function() {

        'use strict';

        // Cache selectors
        var $dialog = $('.fm-dialog.verify-two-factor-login');
        var $lostDeviceButton = $dialog.find('.lost-authenticator-button');

        // On button click
        $lostDeviceButton.rebind('click', function() {

            // Load the Recovery page where they can recover using their Recovery Key
            loadSubPage('recovery');
        });
    },

    /**
     * Initialise the Close button to close the overlay
     */
    initCloseButton: function() {

        'use strict';

        // Show the dialog
        var $dialog = $('.fm-dialog.verify-two-factor-login');
        var $closeButton = $dialog.find('.fm-dialog-close');

        // On click of the close and back buttons
        $closeButton.rebind('click', function() {

            // Close the modal dialog
            twofactor.loginDialog.closeDialog();
        });
    },

    /**
     * Shows a verification error on the 2FA dialog when there was an incorrect PIN
     */
    showVerificationError: function() {

        'use strict';

        var $dialog = $('.fm-dialog.verify-two-factor-login');
        var $overlay = $('.dark-overlay');
        var $warningText = $dialog.find('.warning-text-field');
        var $pinCodeInput = $dialog.find('.pin-input');
        var $submitButton = $dialog.find('.submit-button');

        // Re-show the background overlay which is removed from loading dialog being hidden,
        // then show a message that the PIN code was incorrect and clear the text field
        $overlay.removeClass('hidden');
        $submitButton.removeClass('loading');
        $warningText.removeClass('hidden');
        $pinCodeInput.val('');

        // Put the focus back in the PIN input field
        $pinCodeInput.trigger('focus');
    },

    /**
     * Reset the two-factor login dialog's user interface back to its default.
     * Useful if there was an error during the login/verification process.
     */
    resetState: function() {

        'use strict';

        var $dialog = $('.fm-dialog.verify-two-factor-login');
        var $warningText = $dialog.find('.warning-text-field');
        var $pinCodeInput = $dialog.find('.pin-input');
        var $submitButton = $dialog.find('.submit-button');

        // Hide loading spinner, warning text and clear the text input
        $submitButton.removeClass('loading');
        $warningText.addClass('hidden');
        $pinCodeInput.val('');
    },

    /**
     * Close the dialog
     */
    closeDialog: function() {

        'use strict';

        var $dialog = $('.fm-dialog.verify-two-factor-login');
        var $overlay = $('.dark-overlay');

        // Close the modal dialog
        $dialog.addClass('hidden');
        $overlay.addClass('hidden');
    }
};


/**
 * Functions for enabling and displaying 2FA in the My Account section, Security tab
 */
twofactor.account = {

    /**
     * Initialise the 2FA section on the page
     */
    init: function() {

        'use strict';

        // Check if disabled/enabled
        this.fetchAndDisplayTwoFactorAuthStatus();
    },

    /**
     * Displays the current Two-Factor Authentication status (enabled/disabled)
     */
    fetchAndDisplayTwoFactorAuthStatus: function() {

        'use strict';

        var $twoFactorSection = $('.account.two-factor-authentication');
        var $button = $twoFactorSection.find('.enable-disable-2fa-button');

        // Check if 2FA is actually enabled on the API for everyone
        if (twofactor.isEnabledGlobally()) {

            // Show the 2FA section
            $twoFactorSection.removeClass('hidden');

            // Check if 2FA is enabled on their account
            twofactor.isEnabledForAccount(function(result) {
                // If enabled, show red button, disable PIN entry text box and Deactivate text
                if (result) {
                    $button.addClass('toggle-on enabled');
                }
                else {
                    // Otherwise show green button and Enable text
                    $button.removeClass('toggle-on enabled');
                }

                // Init the click handler now for the button now that the enabled/disabled status has been retrieved
                twofactor.account.initEnableDeactivateButton();
            });
        }
    },

    /**
     * Initialises the enable/deactivate 2FA button
     */
    initEnableDeactivateButton: function() {

        'use strict';

        var $accountPageTwoFactorSection = $('.account.two-factor-authentication');
        var $button = $accountPageTwoFactorSection.find('.enable-disable-2fa-button');

        // On button click
        $button.rebind('click', function() {

            // If 2FA is enabled
            if ($button.hasClass('enabled')) {
                // Show the verify 2FA dialog to collect the user's PIN
                twofactor.verifyActionDialog.init(function(twoFactorPin) {
                    // Disable 2FA
                    twofactor.account.disableTwoFactorAuthentication(twoFactorPin);
                });
            }
            else {
                // Setup 2FA
                twofactor.setupDialog.init();
            }
        });
    },

    /**
     * Disable the Two Factor Authentication
     */
    disableTwoFactorAuthentication: function(twoFactorPin) {

        'use strict';

        loadingDialog.show();

        // Run Multi-Factor Auth Disable (mfad) request
        api_req({ a: 'mfad', mfa: twoFactorPin }, {
            callback: function(response) {

                loadingDialog.hide();

                // The Two-Factor has already been disabled
                if (response === ENOENT) {
                    msgDialog('warninga',
                        'Two-Factor Authentication is already disabled',
                        'Return to the My Account page to enable.',
                        function() {
                            // Refresh the account 2FA status
                            twofactor.account.init();
                        }
                    );
                }
                else if (response < 0) {

                    // If there was an error, show a message that the code was incorrect
                    msgDialog('warninga', 'Two-Factor Authentication could not be disabled',
                                          'Check that the PIN is correct.');
                }
                else {
                    // Refresh the account 2FA status to show it's deactivated
                    twofactor.account.init();
                }
            }
        });
    }
};


/**
 * The dialog to start the 2FA activation process
 */
twofactor.setupDialog = {

    /** jQuery selector for this dialog */
    $dialog: null,

    /** jQuery selector for the background overlay */
    $overlay: null,

    /**
     * Intialise the dialog
     */
    init: function() {

        'use strict';

        // Cache selector
        this.$dialog = $('.two-factor-dialog.setup-two-factor');
        this.$overlay = $('.dark-overlay');

        // Setup functionality
        this.getSharedSecret();
        this.initNextButton();
        this.initCloseButton();
        this.initNoAuthenticatorAppButton();

        // Show the dialog
        this.$dialog.removeClass('hidden');
        this.$overlay.removeClass('hidden');

        dialogPositioning('.two-factor-dialog.setup-two-factor');
    },

    /**
     * Setup the Two-Factor Authentication by getting a shared secret from the API
     */
    getSharedSecret: function() {

        'use strict';

        // Cache selectors
        var $seedInput = this.$dialog.find('.two-factor-qr-seed');
        var $qrCode = this.$dialog.find('.two-factor-qr-code');

        // Run Multi-Factor Auth Setup (mfas) request
        api_req({ a: 'mfas' }, {
            callback: function(response) {

                // If the Two-Factor has already been setup, show a warning dialog
                if (response === EEXIST) {
                    msgDialog('warninga', l[19219], l[19220],
                        function() {
                            // Close the dialog on click of OK button
                            twofactor.setupDialog.closeDialog();
                        }
                    );

                    return false;
                }

                // Set Base32 seed into text box
                $seedInput.val(response);

                // Configure the QR code rendering library
                // Appears as: MEGA (name@email.com) in authenticator app
                var options = {
                    width: 224,
                    height: 224,
                    correctLevel: QRErrorCorrectLevel.H,    // High
                    background: '#ffffff',
                    foreground: '#000',
                    text: 'otpauth://totp/MEGA:' + u_attr.email + '?secret=' + response + '&issuer=MEGA'
                };

                // Render the QR code
                $qrCode.text('').qrcode(options);
            }
        });
    },

    /**
     * Initialise the Next button to go to the Verify Setup dialog
     */
    initNextButton: function() {

        'use strict';

        // On button click
        this.$dialog.find('.two-factor-next-btn').rebind('click', function() {

            // Close the current dialog and open the verify dialog
            twofactor.setupDialog.closeDialog();
            twofactor.verifySetupDialog.init();
        });
    },

    /**
     * Initialise the close icon in the header to close the dialog
     */
    initCloseButton: function() {

        'use strict';

        // On button click, close the dialog
        this.$dialog.find('.fm-dialog-close').rebind('click', function() {

            twofactor.setupDialog.closeDialog();
        });
    },

    /**
     * Closes the dialog
     */
    closeDialog: function() {

        'use strict';

        // Hide the dialog and background
        this.$dialog.addClass('hidden');
        this.$overlay.addClass('hidden');
    },

    /**
     * Initialise the Don't have an authenticator app? button to open the Select Authenticator App tooltip
     */
    initNoAuthenticatorAppButton: function() {

        'use strict';

        var $noAuthAppButton = this.$dialog.find('.no-auth-app-button');
        var $authAppSelectDialog = $('.auth-app-select-tooltip');

        // On button click
        $noAuthAppButton.rebind('click', function() {

            // Get the absolute position of the button, the width of the button and dialog
            var buttonOffset = $noAuthAppButton.offset();
            var buttonWidth = $noAuthAppButton.width();
            var dialogWidth = $authAppSelectDialog.outerWidth();

            // Put the dialog in the middle of the button horizontally
            var offsetMiddleOfButton = buttonOffset.left + (buttonWidth / 2);
            var leftOffset = offsetMiddleOfButton - (dialogWidth / 2);

            // Move the dialog down below the button text (14px text height + 10px top margin)
            var topOffset = buttonOffset.top + 14 + 10;

            // Show the tooltip above the Select Authenticator app dialog and below the button
            $authAppSelectDialog.css({ top: topOffset, left: leftOffset }).removeClass('hidden');

            // Initialise the handler to close the tooltip
            twofactor.setupDialog.initTooltipClose();

            // Prevent click closing the tooltip straight away
            return false;
        });
    },

    /**
     * Initialise the click handler to close the tooltip if they click anywhere in or out of the tooltip or press the
     * Esc key. The authenticator app buttons/hyperlinks should still open the link in a new tab/window regardless.
     */
    initTooltipClose: function() {

        'use strict';

        // If there is a click anywhere on the page
        $(document).rebind('click.closeauthapptooltip', function() {

            // Close the tooltip
            $('.auth-app-select-tooltip').addClass('hidden');

            // Remove the click handler
            $(document).off('click.closeauthapptooltip');
        });

        // If there is a keypress
        $(document).rebind('keyup.closeauthapptooltip', function(event) {

            // If the Esc key was pressed
            if (event.keyCode === 27) {

                // Close the tooltip
                $('.auth-app-select-tooltip').addClass('hidden');

                // Remove the keyup handler
                $(document).off('keyup.closeauthapptooltip');
            }
        });
    }
};


/**
 * The dialog to verify the 2FA activation process was set up correctly
 */
twofactor.verifySetupDialog = {

    /** jQuery selector for this dialog */
    $dialog: null,

    /** jQuery selector for the background overlay */
    $overlay: null,

    /**
     * Intialise the dialog
     */
    init: function() {

        'use strict';

        // Cache selector
        this.$dialog = $('.two-factor-dialog.setup-two-factor-verify');
        this.$overlay = $('.dark-overlay');

        // Setup functionality
        this.resetToDefault();
        this.initCloseButton();
        this.initKeyupFunctionality();
        this.initBackButton();
        this.initNextButton();

        // Show the dialog
        this.$dialog.removeClass('hidden');
        this.$overlay.removeClass('hidden');

        // Put the focus in the PIN input field after its visible
        this.$dialog.find('.pin-input').trigger('focus');
    },

    /**
     * Reset the dialog to default state if it is re-opened
     */
    resetToDefault: function() {

        'use strict';

        var $pinCode = this.$dialog.find('.pin-input');
        var $warningText = this.$dialog.find('.information-highlight.warning');
        var $successText = this.$dialog.find('.information-highlight.success');
        var $closeButton = this.$dialog.find('.fm-dialog-close');

        // Clear the text input, remove the warning/success boxes, unhide the close button
        $pinCode.val('');
        $warningText.addClass('hidden');
        $successText.addClass('hidden');
        $closeButton.removeClass('hidden');
    },

    /**
     * Initialise the close icon in the header to close the dialog
     */
    initCloseButton: function() {

        'use strict';

        // On button click, close the dialog
        this.$dialog.find('.fm-dialog-close').rebind('click', function() {

            twofactor.verifySetupDialog.closeDialog();
        });
    },

    /**
     * Closes the dialog
     */
    closeDialog: function() {

        'use strict';

        // Hide the dialog and background
        this.$dialog.addClass('hidden');
        this.$overlay.addClass('hidden');
    },

    /**
     * Initialises keyup/blur functionality on the input field to check the PIN as it's being entered
     */
    initKeyupFunctionality: function() {

        'use strict';

        // Cache selectors
        var $pinCodeInput = this.$dialog.find('.pin-input');
        var $warningText = this.$dialog.find('.information-highlight.warning');
        var $verifyButton = this.$dialog.find('.next-button');

        // On keyup or clicking out of the text field
        $pinCodeInput.rebind('keyup blur', function(event) {

            // Hide previous warnings for incorrect PIN codes
            $warningText.addClass('hidden');

            // If Enter key is pressed, verify the code
            if (event.keyCode === 13) {
                $verifyButton.trigger('click');
            }
        });
    },

    /**
     * Initalises the back button to go back to the QR code/seed dialog
     */
    initBackButton: function() {

        'use strict';

        var $backButton = this.$dialog.find('.back-button');

        // On button click
        $backButton.removeClass('disabled').rebind('click', function() {

            // Don't let them go back if they already activated 2FA, they need to go forward
            if ($(this).hasClass('disabled')) {
                return false;
            }

            twofactor.verifySetupDialog.closeDialog();
            twofactor.setupDialog.init();
        });
    },

    /**
     * Initialise the Next button to verify the code
     */
    initNextButton: function() {

        'use strict';

        // Cache selectors
        var $pinCodeInput = this.$dialog.find('.pin-input');
        var $backButton = this.$dialog.find('.back-button');
        var $closeButton = this.$dialog.find('.fm-dialog-close');
        var $verifyButton = this.$dialog.find('.next-button');
        var $warningText = this.$dialog.find('.information-highlight.warning');
        var $successText = this.$dialog.find('.information-highlight.success');

        // On button click
        $verifyButton.rebind('click', function() {

            // Hide old warning
            $warningText.addClass('hidden');

            // If the operation hasn't succeeded yet
            if ($successText.hasClass('hidden')) {

                // Get the Google Authenticator PIN code from the user
                var pinCode = $.trim($pinCodeInput.val());

                // Run Multi-Factor Auth Setup (mfas) request
                api_req({ a: 'mfas', mfa: pinCode }, {
                    callback: function(response) {

                        // If the Two-Factor has already been setup, show a warning dialog
                        if (response === EEXIST) {
                            msgDialog('warninga', l[19219], l[19220],
                                function() {
                                    // Close the dialog on click of OK button
                                    twofactor.verifySetupDialog.closeDialog();
                                }
                            );
                        }
                        else if (response < 0) {

                            // If there was an error, show message that the code was incorrect and clear the text field
                            $warningText.removeClass('hidden');
                            $pinCodeInput.val('');

                            // Put the focus back in the PIN input field
                            $pinCodeInput.trigger('focus');
                        }
                        else {
                            // Disable the back button and hide the close button to force them to go to the next step
                            // to backup their Recovery Key. Also now that 2FA is activated, show the success message
                            $backButton.addClass('disabled');
                            $closeButton.addClass('hidden');
                            $successText.removeClass('hidden');
                        }
                    }
                });
            }
            else {
                // If the operation to activate succeeded, load next dialog to backup the recovery key
                twofactor.verifySetupDialog.closeDialog();
                twofactor.backupKeyDialog.init();
            }
        });
    }
};


/**
 * The dialog to verify the 2FA activation process was set up correctly
 */
twofactor.backupKeyDialog = {

    /** jQuery selector for this dialog */
    $dialog: null,

    /** jQuery selector for the background overlay */
    $overlay: null,

    /**
     * Intialise the dialog
     */
    init: function() {

        'use strict';

        // Cache selectors
        this.$dialog = $('.two-factor-dialog.setup-two-factor-backup-key');
        this.$overlay = $('.dark-overlay');

        // Setup functionality
        this.initCloseButton();
        this.initSaveRecoveryKeyButton();

        // Show the dialog
        this.$dialog.removeClass('hidden');
        this.$overlay.removeClass('hidden');
    },

    /**
     * Initialise the button to save the Recovery Key to a file
     */
    initSaveRecoveryKeyButton: function() {
        'use strict';
        this.$dialog.find('.recovery-key-button').rebind('click', u_savekey);
    },

    /**
     * Initialise the close and finish buttons to close the dialog
     */
    initCloseButton: function() {

        'use strict';

        // On button click, close the dialog
        this.$dialog.find('.fm-dialog-close, .finish-button').rebind('click', function() {

            // Close the dialog and refresh the status of 2FA in the background
            twofactor.backupKeyDialog.closeDialog();
            twofactor.account.init();
        });
    },

    /**
     * Closes the dialog
     */
    closeDialog: function() {

        'use strict';

        // Hide the dialog and background
        this.$dialog.addClass('hidden');
        this.$overlay.addClass('hidden');
    }
};


/**
 * Logic for the dialog where they need to perform some action e.g. change email or change
 * password but they need to enter their Two Factor Authentication PIN in order to proceed
 */
twofactor.verifyActionDialog = {

    /** jQuery selector for this dialog */
    $dialog: null,

    /** jQuery selector for the background overlay */
    $overlay: null,

    /**
     * Intialise the dialog
     * @param {Function} completeCallback The callback to run after 2FA verify
     */
    init: function(completeCallback) {

        'use strict';

        // Cache selectors
        this.$dialog = $('.fm-dialog.two-factor-verify-action');
        this.$overlay = $('.dark-overlay');

        // Initialise functionality
        this.resetState();
        this.initKeyupFunctionality();
        this.initSubmitButton(completeCallback);
        this.initLostAuthenticatorDeviceButton();
        this.initCloseButton();

        // Show the modal dialog
        this.$dialog.removeClass('hidden');
        this.$overlay.removeClass('hidden');

        // Put the focus in the PIN input field after its visible
        this.$dialog.find('.pin-input').trigger('focus');
    },

    /**
     * Initialises keyup/blur functionality on the input field to check the PIN as it's being entered
     */
    initKeyupFunctionality: function() {

        'use strict';

        // Cache selectors
        var $pinCodeInput = this.$dialog.find('.pin-input');
        var $submitButton = this.$dialog.find('.submit-button');

        // On keyup or clicking out of the text field
        $pinCodeInput.off('keyup blur').on('keyup blur', function(event) {

            // If Enter key is pressed, submit the login code
            if (event.keyCode === 13) {
                $submitButton.trigger('click');
            }

            // Trim whitespace from the ends of the PIN entered
            var pinCode = $pinCodeInput.val();
            var trimmedPinCode = $.trim(pinCode);

            // If empty, grey out the button so it appears unclickable
            if (trimmedPinCode === '' || trimmedPinCode.length !== 6 || Number.isInteger(trimmedPinCode)) {
                $submitButton.removeClass('active');
            }
            else {
                // Otherwise how the button as red/clickable
                $submitButton.addClass('active');
            }
        });
    },

    /**
     * Initialise the Submit button
     * @param {Function} completeCallback The callback to run after 2FA verify
     */
    initSubmitButton: function(completeCallback) {

        'use strict';

        // Cache selectors
        var $pinCodeInput = this.$dialog.find('.pin-input');
        var $submitButton = this.$dialog.find('.submit-button');

        // On Submit button click/tap
        $submitButton.rebind('click', function() {

            // Get the Google Authenticator PIN code from the user
            var pinCode = $.trim($pinCodeInput.val());

            // Close the modal dialog
            twofactor.verifyActionDialog.closeDialog();

            // Send the PIN code to the callback
            completeCallback(pinCode);
        });
    },

    /**
     * Initialise the Lost Authenticator Device button
     */
    initLostAuthenticatorDeviceButton: function() {

        'use strict';

        // Cache selectors
        var $lostDeviceButton = this.$dialog.find('.lost-authenticator-button');

        // On button click
        $lostDeviceButton.rebind('click', function() {
            M.showRecoveryKeyDialog();
        });
    },

    /**
     * Initialise the Close buttons to close the overlay
     */
    initCloseButton: function() {

        'use strict';

        var $closeButton = this.$dialog.find('.fm-dialog-close');

        // On click of the close and back buttons
        $closeButton.rebind('click', function() {

            // Close the modal dialog
            twofactor.verifyActionDialog.closeDialog();
        });
    },

    /**
     * Closes the dialog
     */
    closeDialog: function() {

        'use strict';

        // Hide the dialog and background
        this.$dialog.addClass('hidden');
        this.$overlay.addClass('hidden');
    },

    /**
     * Reset the two-factor login dialog's user interface back to its default.
     * Useful if there was an error during the verification process.
     */
    resetState: function() {

        'use strict';

        var $pinCodeInput = this.$dialog.find('.pin-input');
        var $submitButton = this.$dialog.find('.submit-button');

        // Hide loading spinner and clear the text input
        $submitButton.removeClass('active');
        $pinCodeInput.val('');
    }
};
