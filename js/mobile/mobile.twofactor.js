/**
 * Generic functions for Two-Factor Authentication on mobile
 */
mobile.twofactor = window.twofactor || Object.create(null);

/**
 * Functionality for the Two-Factor Authentication pages
 * @todo: Move to a separate file when revamping
 */
mobile.twofactor.settings = {

    /**
     * 2FA setup step
     */
    setupStep: false,

    /**
     * Initialise the pages
     * @returns {void} void
     */
    init: function() {
        'use strict';

        // If not logged in, return to the login page
        if (typeof u_attr === 'undefined') {
            return loadSubPage('login');
        }

        document.querySelector('.main-layout .mobile.two-factor-page').classList.add('hidden');

        loadingDialog.show();

        mobile.twofactor.isEnabledForAccount()
            .then((res) => {
                loadingDialog.hide();

                if (res) {
                    return mobile.twofactor.verifyDisable.init();
                }

                if (this.setupStep === 1) {
                    return mobile.twofactor.setup.init();
                }

                if (this.setupStep === 2) {
                    return mobile.twofactor.verifySetup.init();
                }

                mobile.twofactor.intro.init();
            })
            .catch((ex) => {
                dump(ex);
                loadSubPage('fm/account/security');
            });
    },

    /**
     * Back to previous page
    * @returns {void} void
     */
    previousPage: function() {
        'use strict';

        if (this.setupStep) {
            this.setupStep--;
            this.init();
        }
        else {
            loadSubPage('fm/account/security');
        }
    }
};
