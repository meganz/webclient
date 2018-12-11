/**
 * Some additional functionality for the Pro pages.
 * This complements the desktop code in /html/js/propay.js
 */
mobile.propay = {

    /**
     * Extra initialisation code just for the mobile Pro payment page
     */
    init: function() {

        'use strict';

        var $stepTwo = $('.membership-step2');
        var $contactUsButton = $stepTwo.find('.pro-bottom-button');
        var $backButton = $stepTwo.find('.js-back-to-plans');

        // Add click handler for the contact button
        $contactUsButton.off('tap').on('tap', function() {
            loadSubPage('contact');
            return false;
        });

        // Add click handler to go back to the Pro page
        $backButton.off('tap').on('tap', function() {
            loadSubPage('pro');
            return false;
        });

        M.accountData();

        // Show the page for mobile
        $stepTwo.removeClass('hidden');
    },

    /**
     * Filter the payment providers for mobile as only credit cards are available for now
     * @param {Array} gatewayOptions All the payment providers
     * @returns {Array} Returns a filtered list of the payment providers
     */
    filterPaymentProviderOptions: function(gatewayOptions) {

        'use strict';

        // Enabled payment providers for mobile so far are vouchers, the credit card options and direct resellers
        var mobileEnabledGateways = [
            'voucher', 'astropayVI', 'astropayMC', 'ecpVI', 'ecpMC', 'sabadellVI', 'sabadellMC', 'directreseller'
        ];

        // Filter out anything else
        var filteredGateways = gatewayOptions.filter(function(val) {
            return mobileEnabledGateways.indexOf(val.gatewayName) > -1;
        });

        return filteredGateways;
    }
};
