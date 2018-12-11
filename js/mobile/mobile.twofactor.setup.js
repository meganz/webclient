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
        this.$page = $('.mobile.two-factor-page.setup-page');

        // Initialise functionality
        this.getSharedSecret();
        this.initNextButton();
        this.initNoAuthenticatorAppButton();
        this.initAppLinkButtons();
        this.initCloseAuthenticatorAppDialogButton();

        // Initialise back button to go back to the My Account page
        mobile.initBackButton(this.$page, 'fm/account');

        // Show the account page content
        this.$page.removeClass('hidden');
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

                // The Two-Factor has already been setup, return to the My Account page to disable
                if (response === EEXIST) {
                    mobile.messageOverlay.show(l[19219] + ' ' + l[19220], function() {
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
     * Initialise the Don't have an authenticator app? button to load the Select Authenticator App dialog
     */
    initNoAuthenticatorAppButton: function() {

        'use strict';

        var $noAuthAppButton = mobile.twofactor.setup.$page.find('.no-auth-app-button');
        var $authAppSelectDialog = $('.auth-app-select-dialog');
        var $darkOverlay = $('.dark-overlay');

        // On button click/tap
        $noAuthAppButton.off('tap').on('tap', function() {

            // Show an overlay behind the Select Authenticator app dialog
            $darkOverlay.removeClass('hidden');
            $authAppSelectDialog.removeClass('hidden');
        });
    },

    /**
     * Initialise the Cancel button in the Select Authenticator App dialog
     */
    initCloseAuthenticatorAppDialogButton: function() {

        'use strict';

        var $authAppSelectDialog = $('.auth-app-select-dialog');
        var $cancelButton = $authAppSelectDialog.find('.cancel-button');
        var $darkOverlay = $('.dark-overlay');

        // On button click/tap
        $cancelButton.off('tap').on('tap', function() {

            // Hide the overlay and Select Authenticator app dialog
            $darkOverlay.addClass('hidden');
            $authAppSelectDialog.addClass('hidden');
        });
    },

    /**
     * The suggested/supported apps and app store links for each platform
     */
    apps: {
        authy: {
            android: 'https://play.google.com/store/apps/details?id=com.authy.authy',
            ios: 'https://itunes.apple.com/us/app/authy/id494168017'
        },
        duomobile: {
            android: 'https://play.google.com/store/apps/details?id=com.duosecurity.duomobile',
            ios: 'https://itunes.apple.com/us/app/duo-mobile/id422663827'
        },
        googleauthenticator: {
            android: 'https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2',
            ios: 'https://itunes.apple.com/us/app/google-authenticator/id388497605'
        },
        microsoftauthenticator: {
            android: 'https://play.google.com/store/apps/details?id=com.azure.authenticator',
            ios: 'https://itunes.apple.com/app/microsoft-authenticator/id983156458',
            winphone: 'https://www.microsoft.com/p/microsoft-authenticator/9nblgggzmcj6'
        }
    },

    /**
     * Initialise the app link buttons to load the relevant link for the button clicked and their phone's OS
     */
    initAppLinkButtons: function() {

        'use strict';

        var $authAppSelectDialog = $('.auth-app-select-dialog');
        var $appLinkButtons = $authAppSelectDialog.find('.app-link');

        // If on Windows Phone, hide all apps except Microsoft Authenticator because they're not supported
        if (is_microsoft) {
            $appLinkButtons.filter('.authy, .duomobile, .googleauthenticator').addClass('hidden');
        }

        // On button click/tap
        $appLinkButtons.off('tap').on('tap', function() {

            // Get the app clicked on e.g. authy, googleauthenticator
            var app = $(this).attr('class').replace('mobile app-link ', '');

            // Get which platform (OS) is used (Android is default if platform can't be detected)
            var platform = 'android';

            if (is_ios) {
                platform = 'ios';
            }
            else if (is_microsoft) {
                platform = 'winphone';
            }

            // Load the link
            window.location.href = mobile.twofactor.setup.apps[app][platform];
        });
    }
};
