/**
 * Login functionality
 */
mobile.signin = {

    /** jQuery selector for the login/register screen */
    $screen: null,

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

        // Init events
        this.initLoginButton();
        this.initEmailPasswordKeyupEvents();

        // Initialise the Remember Me checkbox, top button tabs
        mobile.initTabs('login');
        mobile.initCheckbox('remember-me');
        mobile.initHeaderMegaIcon();
        mobile.initMobileAppButton();
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
            var email = $emailField.val();
            var password = $passwordField.val();
            var rememberMe = $rememberMeCheckbox.is(':checked');

            // If the fields are not completed, the button should not do anything and looks disabled anyway
            if (email.length < 1 || password.length < 1) {
                return false;
            }

            // Unfocus (blur) the input fields to prevent the cursor showing on iOS and also hide the keyboard
            $emailField.add($passwordField).blur();

            // Pass the details to the login flow
            mobile.signin.startLogin($signInButton, email, password, rememberMe);

            return false;
        });
    },

    /**
     * Starts the login proceedure
     * @param {Object} $signInButton The jQuery selector for the signin button
     * @param {String} email The user's email address
     * @param {String} password The user's password
     * @param {Boolean} rememberMe Whether the user clicked the Remember me checkbox or not
     */
    startLogin: function($signInButton, email, password, rememberMe) {

        'use strict';

        // Hide the text and show a loading spinner
        $signInButton.addClass('loading');

        // If email confirm code is ok
        if (confirmok) {
            doConfirm(email, password, function() {
                postLogin(email, password, rememberMe, function(result) {

                    // Hide the loading spinner
                    $signInButton.removeClass('loading');

                    if (result === EBLOCKED) {
                        mobile.messageOverlay.show(l[730]);
                    }
                    else if (result) {
                        u_type = result;
                        loadSubPage('key');
                    }
                });
            });
        }
        else {
            // Run the regular login process
            postLogin(email, password, rememberMe, function (result) {

                // Hide the loading spinner
                $signInButton.removeClass('loading');

                // Check they are not locked out
                if (result === EBLOCKED) {
                    mobile.messageOverlay.show(l[730]);
                }

                // Otherwise if successful
                else if (result) {

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
            });
        }
    }
};
