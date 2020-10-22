/**
 * The register/login prompt on the Pro page when they try to access step 2 without being logged in.
 * This is the lightweight version of the showSignupPromptDialog function in proplan.js. When the user
 * has completed login or registration they will be returned to the propay_x page they clicked on to
 * continue with their purchase.
 */
mobile.proSignupPrompt = {

    /** jQuery selector for the dialog */
    $dialog: null,

    /**
     * Initialise the dialog and show it
     */
    init: function() {

        'use strict';

        // Cache the selector
        this.$dialog = $('.mobile.loginrequired-dialog');
        this.scrollPos = $('html').scrollTop();

        // Initialise the buttons
        this.initCloseButton();
        this.initRegisterButton();
        this.initLoginButton();

        // Show the dialog
        this.$dialog.removeClass('hidden').addClass('overlay');

        // Disable scrolling
        $('html').addClass('overlayed');
    },

    /**
     * Scroll to position before dialog is opened
     */
    restoreScrollPosition: function() {

        'use strict';

        var scrollPos = this.scrollPos;

        $('html').removeClass('overlayed').scrollTop(scrollPos);
    },

    /**
     * Initialise the Close icon in the top right of the dialog
     */
    initCloseButton: function() {

        'use strict';

        var self = this;
        var $dialog = self.$dialog;
        var $closeButton = $dialog.find('.fm-dialog-close');

        // Add click/tap handler
        $closeButton.off('tap').on('tap', function() {

            // They don't want to continue with the Registration/Login so remove the flag
            localStorage.removeItem('proPageContinuePlanNum');

            // Hide the dialog
            $dialog.addClass('hidden').removeClass('overlay');

            // Enabled scroll again and scroll to previous position
            self.restoreScrollPosition();

            // Prevent any additional clicks
            return false;
        });
    },

    /**
     * Initialise the Register button
     */
    initRegisterButton: function() {

        'use strict';

        var self = this;
        var $registerButton = self.$dialog.find('.register');

        // Add click/tap handler
        $registerButton.off('tap').on('tap', function() {

            // Set the plan number they selected into localStorage for use after Registration/Login
            self.setSelectedPlanNum();

            // Hide the dialog
            self.$dialog.addClass('hidden').removeClass('overlay');

            // Enabled scroll again and scroll to previous position
            self.restoreScrollPosition();

            // Load the register page
            loadSubPage('register');

            // Prevent any additional clicks
            return false;
        });
    },

    /**
     * Initialise the Login button
     */
    initLoginButton: function() {

        'use strict';

        var self = this;
        var $loginButton = self.$dialog.find('.login');

        // Add click/tap handler
        $loginButton.off('tap').on('tap', function() {

            // Set the plan number they selected into localStorage for use after Registration/Login
            self.setSelectedPlanNum();

            // Hide the dialog
            self.$dialog.addClass('hidden').removeClass('overlay');

            // Enabled scroll again and scroll to previous position
            self.restoreScrollPosition();

            // Load the login page
            loadSubPage('login');

            // Prevent any additional clicks
            return false;
        });
    },

    /**
     * Sets the selected Pro plan number from what the user selected on the page into localStorage
     */
    setSelectedPlanNum: function() {

        'use strict';

        // Get the selected Pro card's data-payment attribute value
        var selectedPlanNum = $('.pricing-page.plan.selected').data('payment');

        // Set the selected plan number so when they've completed Login and Registration they can proceed to pay
        localStorage.setItem('proPageContinuePlanNum', selectedPlanNum);
    }
};
