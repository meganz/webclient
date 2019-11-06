/**
 * Generic functions for Two-Factor Authentication on mobile
 */
mobile.twofactor = {

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

        // Make Multi-Factor Auth Get request
        api_req({ a: 'mfag', e: u_attr.email }, {
            callback: function(result) {

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
