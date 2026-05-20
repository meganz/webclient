/**
 * When the user tries to register, but they already have an account and they used the same password for registration,
 * log them in and if they were in an ephemeral session, try transfer their ephemeral files as well to the account
 */
var loginFromEphemeral = {
    init: (rv, context) => {

        'use strict';

        loginFromEphemeral.context = context || null;
        loginFromEphemeral.rv = rv || loginFromEphemeral.rv;

        var rememberMe = true;
        var twoFactorPin = null;

        loadingDialog.show();

        const {rv: {email, password}, old: {startLogin: oldLogin}, new: {startLogin: newLogin}} = loginFromEphemeral;

        // Checks if they have an old or new registration type, after this the flow will continue to login
        security.login.checkLoginMethod(email, password, twoFactorPin, rememberMe, oldLogin, newLogin);
    },

    /**
     * Functions for the old login process which will need to be retained until everyone's upgraded to the new process
     */
    old: {
        /**
         * Starts the login proceedure
         * @param {String} email The user's email address
         * @param {String} password The user's password as entered
         * @param {String|null} pinCode The two-factor authentication PIN code (6 digit number), or null if N/A
         * @param {Boolean} rememberMe Whether the user clicked the Remember me checkbox or not
         */
        startLogin: function(email, password, pinCode, rememberMe) {
            'use strict';

            postLogin(email, password, pinCode, rememberMe)
                .then((res) => loginFromEphemeral.completeLogin(res))
                .catch(tell);
        }
    },

    /**
     * Functions for the new secure login process
     */
    new: {
        /**
         * Start the login proceedure
         * @param {String} email The user's email addresss
         * @param {String} password The user's password as entered
         * @param {String|null} pinCode The two-factor authentication PIN code (6 digit number), or null if N/A
         * @param {Boolean} rememberMe A boolean for if they checked the Remember Me checkbox on the login screen
         * @param {String} salt The user's salt as a Base64 URL encoded string
         */
        startLogin: function(email, password, pinCode, rememberMe, salt) {

            'use strict';

            // Start the login using the new process
            security.login.startLogin(email, password, pinCode, rememberMe, salt, loginFromEphemeral.completeLogin);
        }
    },

    /**
     * Complete the login process and redirect to the cloud drive
     * @param {Number} result If the result is negative there is an error, if positive it is the user type
     */
    completeLogin: function(result) {

        'use strict';

        const {context} = loginFromEphemeral;

        // Check and handle the common login errors
        if (security.login.checkForCommonErrors(result, loginFromEphemeral.old.startLogin,
                                                loginFromEphemeral.new.startLogin)) {

            return false;
        }

        // If successful result
        else if (result !== false && result >= 0) {
            let reload = async() => {
                if ('csp' in window) {
                    await csp.init();
                }
                location.reload();
            };

            // If the user got logged-in when trying to register, let's migrate the ephemeral account
            if ($.ephNodes) {

                showToast('megasync', l[8745]);
                boot_auth(null, result);

                // The user got logged-in when trying to register, let's migrate the ephemeral account
                var msg = l[16517].replace('%1', loginFromEphemeral.rv.email);

                // On dialog confirm, import the ephemeral session files to the user's Inbox
                msgDialog('info', l[761], msg, null, tryCatch(() => {

                    const req = {a: 'p', n: $.ephNodes, v: 3};

                    for (let i = req.n.length; i--;) {
                        const n = req.n[i];
                        n.k = a32_to_base64(encrypt_key(u_k_aes, n.k));
                    }

                    return api.req(req).catch(tell).finally(reload);

                }, reload));
            }
            else if (pro.propay.onPropayPage()) {
                pro.propay.signup.continuePaymentFlow();
            }
            else if (context && typeof context.registrationDone === 'function') {

                loginFromEphemeral.context = null;
                loginFromEphemeral.rv = null;
                u_type = result;
                u_checked = true;

                if (is_mobile) {
                    if (mega.ui.topmenu && mega.ui.topmenu.menuNode) {
                        mega.ui.topmenu.menuNode.textContent = '';
                        mega.ui.topmenu.renderMenuItems();
                    }
                }

                context.registrationDone(true);
            }
            else {
                // Show message that they've been successfully logged in then on OK reload the page
                msgDialog('info', l[18280], l[8745], null, reload);
            }
        }
        else {
            assert(context, 'Context should be set for failed registration login attempts');

            loginFromEphemeral.context = null;
            loginFromEphemeral.rv = null;
            u_logout();
            context.showExistingAccountError();
        }
    }
};
