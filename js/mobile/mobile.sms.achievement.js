/**
 * Functions for the SMS add phone achievement introduction page
 */
mobile.sms.achievement = {

    $page: null,

    /**
     * Initialise the page
     */
    init: function() {
        
        'use strict';

        // Cache the page
        this.$page = $('.js-add-phone-achievement-page');

        // Init functionality
        this.initAddPhoneButton();
        this.initCloseButtons();

        // Set achievement text with API values
        mobile.sms.renderAddPhoneText(this.$page.find('.js-achievement-text'));

        // Init header
        mobile.initHeaderMegaIcon();

        // Initialise the top menu
        topmenuUI();

        // Show the page
        this.$page.removeClass('hidden');
    },

    /**
     * Initialise the Add Phone button to take them back to their phone number entry page
     */
    initAddPhoneButton: function() {
        
        'use strict';

        // On Add Phone button tap
        this.$page.find('.js-add-phone-button').off('tap').on('tap', function() {

            // Load the previous page
            loadSubPage('sms/add-phone-achievement');

            // Prevent double taps
            return false;
        });
    },

    /**
     * Initialise the Close button and Close icon to take them back to the My Account page
     */
    initCloseButtons: function() {
        
        'use strict';

        // On Add Phone button tap
        this.$page.find('.js-cancel-button, .fm-dialog-close').off('tap').on('tap', function() {

            // Load the previous page
            loadSubPage('fm/account');

            // Prevent double taps
            return false;
        });
    }
};
