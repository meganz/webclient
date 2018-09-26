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

        // Otherwise if logged in, use the flag returned and set from the 'ug' request
        else if (typeof u_attr !== 'undefined' && u_attr.flags.mfae) {
            return (u_attr.flags.mfae === 1) ? true : false;
        }

        // Otherwise if not logged in, use the flag set by the 'gmf' request
        // NB: Probably not needed as all 2FA enabling/disabling functions require the user to be logged in
        else if (typeof u_attr === 'undefined' && typeof mega.apiMiscFlags.mfae !== 'undefined') {
            return (mega.apiMiscFlags.mfae === 1) ? true : false;
        }

        // Otherwise default to disabled
        else {
            return false;
        }
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
