/**
 * Functionality for the Two-Factor Authentication Setup page
 */
mobile.twofactor.setup = {

    /**
     * jQuery selector for this page
     */
    $page: null,

    /**
     * Initialise the page
     */
    init: function() {

        'use strict';

        // If not logged in, return to the login page
        if (typeof u_attr === 'undefined') {
            loadSubPage('login');
            return false;
        }

        // Cache selector
        mobile.twofactor.setup.$page = $('.mobile.two-factor-page.setup-page');

        // Initialise functionality
        mobile.twofactor.setup.getSharedSecret();
        mobile.twofactor.setup.initNextButton();
        mobile.twofactor.setup.initBackButton();

        // Show the account page content
        mobile.twofactor.setup.$page.removeClass('hidden');
    },

    /**
     * Setup the Two-Factor Authentication by getting a shared secret from the API
     */
    getSharedSecret: function() {

        'use strict';

        // Cache selectors
        var $seedInput = mobile.twofactor.setup.$page.find('.two-factor-qr-seed');
        var $qrCode = mobile.twofactor.setup.$page.find('.qr-code-img');

        loadingDialog.show();

        // Run Multi-Factor Auth Setup (mfas) request
        api_req({ a: 'mfas' }, {
            callback: function(response) {

                loadingDialog.hide();

                // The Two-Factor has already been setup
                if (response === EEXIST) {
                    mobile.messageOverlay.show('Two-Factor Authentication is already setup.',
                                               'Return to the My Account page to disable.', function() {
                        loadSubPage('fm/account/');
                    });

                    return false;
                }

                // Set Base32 seed into text box
                $seedInput.text(response);

                // Configure the QR code rendering library
                // Appears as: MEGA (name@email.com) in authenticator app
                var options = {
                    width: 160,
                    height: 160,
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
     * Initialise the Next button to go to the Verify Setup page
     */
    initNextButton: function() {

        'use strict';

        // On button click/tap
        mobile.twofactor.setup.$page.find('.two-factor-next-btn').off('tap').on('tap', function() {

            // Render the Verify Setup page
            loadSubPage('twofactor/verify-setup');
            return false;
        });
    },

    /**
     * Initialise the back arrow icon in the header to go back to the main My Account page
     */
    initBackButton: function() {

        'use strict';

        // On Back click/tap
        mobile.twofactor.setup.$page.find('.mobile.fm-icon.back').off('tap').on('tap', function() {

            // Render the Intro page again
            loadSubPage('twofactor/intro');
            return false;
        });
    }
};
