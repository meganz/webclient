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
        this.onLowTierProPg = page === 'pro' && window.mProTab;

        // Initialise the buttons
        this.initCloseButton();
        this.initRegisterButton();
        this.initLoginButton();

        // Update the title text if on low tier page
        if (this.onLowTierProPg) {
            $('.dialog-heading-text', this.$dialog).text(l[1768]);
            $('.dialog-body-text', this.$dialog).text(l.log_in_to_continue);
        }

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

        // Force the user to login if they want to view the low tier tab of the pro page
        if (self.onLowTierProPg) {
            $closeButton.addClass('hidden');
            return;
        }

        // Add click/tap handler
        $closeButton.off('tap').on('tap', function() {

            // Trigger close event
            delay('logindlg.close', eventlog.bind(null, 99861));

            // They don't want to continue with the Registration/Login so remove the flag
            sessionStorage.removeItem('proPageContinuePlanNum');

            if (String(page).startsWith('propay')) {
                // Load the pro page if on propay page
                loadSubPage('pro');
            }
            else {
                // Otherwise hide the dialog and scroll to previous position
                self.$dialog.addClass('hidden').removeClass('overlay');
                self.restoreScrollPosition();
            }

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

        if (self.onLowTierProPg) {
            $registerButton.addClass('hidden');
            return;
        }

        // Add click/tap handler
        $registerButton.off('tap').on('tap', function() {

            // Trigger register event
            delay('logindlg.register', eventlog.bind(null, 99860));

            // Set the plan number they selected into sessionStorage for use after Registration/Login
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

            // Trigger register event
            delay('logindlg.login', eventlog.bind(null, 99859));

            // Set the plan number they selected into sessionStorage for use after Registration/Login
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
     * Sets the selected Pro plan number from what the user selected on the page into sessionStorage
     */
    setSelectedPlanNum: function() {

        'use strict';

        // If the continue plan number is already set (e.g. on discount promo page)
        // we can skip trying to set it from the Pro page selected item
        if (sessionStorage.getItem('proPageContinuePlanNum')) {
            return;
        }

        // Get the selected Pro card's data-payment attribute value
        var selectedPlanNum = pro.proplan2.selectedPlan || $('.pricing-page.plan.selected').data('payment');

        // Set the selected plan number so when they've completed Login and Registration they can proceed to pay
        if (typeof selectedPlanNum !== 'undefined') {
            sessionStorage.setItem('proPageContinuePlanNum', selectedPlanNum);
        }
    }
};
