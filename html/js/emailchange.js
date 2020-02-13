/**
 * Verify email: When a user changes their main email address
 * we send a new email to verify the own this new email address.
 * This namespace contains the logic to verify the email addres:
 *
 * Possible scenarios:
 *  1. The user already has a session, we ask them their password
 *  2. The user has no session and we show the login screen
 *  3. After  1 or 2, we change the user's hash with their password and their new email address
 *  4. We redirect them to their profile page
 */
var emailchange = (function() {

    var ns = {};
    var $input;
    var context = null;

    /**
     * Main application.
     *
     * Boot the UI to change verify the new email address for the current user.
     *
     * If the user has no session we show the login dialog and we add a listener
     * for `verify` when they successfully login
     */
    ns.main = function() {

        context = { code: page.substr(6) };

        // If not logged in, display warning dialog explaining the user
        // they need to login. When the user is logged in successfully
        // `verify` is called.
        if (!u_type) {
            return msgDialog('warninga', l[135], l[7720],  false, function() {
                loadSubPage('login');
            });
        }

        loadingDialog.show();

        // Check if the code is valid using 'Email Request Service' API call
        api_req({ 'a': 'ersv', 'c': context.code }, { callback: function(res) {

            loadingDialog.hide();

            if (checkError(res)) {
                return;
            }

            if (u_attr.u !== res[4]) {
                return msgDialog('warninga', l[135], l[23046],  false, function() {
                    loadSubPage('fm');
                });
            }

            // Receive the old email address and verify the password they typed is correct.
            // If it is correct, then we update the user hash with the new email address.
            context.email = res[1];

            $input = $('#verify-password');
            $input.rebind('focus', function() {

                $('.login-register-input.password.first').removeClass('incorrect');
                $('.login-register-input.password.confirm').removeClass('incorrect');
                $('.login-register-input.password').addClass('focused');
            });

            $input.rebind('keyup', function(event) {

                if (event.keyCode === 13) {
                    ns.verify();
                }
            });

            $('.restore-verify-button').rebind('click', function() {

                ns.verify();
            });
        }});
    };

    /**
     * Analyse responses from the server and show the error dialog
     * _if_ there was any error.
     *
     * @param {Number|Object} response The error code
     * @return {Boolean} Returns false if there was no error, true otherwise.
     */
    function checkError(response) {

        // If response is anything but a number or zero there is no error
        if (typeof response !== 'number' || response === 0) {
            return false;
        }

        var title = l[135];     // Error
        var msgBody = l[7719];  // Your confirmation link for this email has expired...

        if (response === EEXIST) {
            msgBody = l[7718]; // This email address has already been taken...
        }
        else if (response === -9) {
            msgBody = l[22128]; // invalid verify code
        }
        else if (response === -11) {
            msgBody = l[22151]; // not logged in
        }
        else if (response === -2) {
            msgBody = l[22152]; // code is for a different user
        }


        context = null; // wipe variable

        msgDialog('warninga', title, msgBody, false, function() {
            loadSubPage('fm/account/security');
        });

        return true;
    }

    /**
     * Continue the email verification
     * @param {Array} derivedEncryptionKeyArray32
     */
    function continueEmailVerification(derivedEncryptionKeyArray32) {

        // If the password is incorrect, then quit out
        if (!checkMyPassword(derivedEncryptionKeyArray32)) {
            $('.login-register-input.password').removeClass('loading').addClass('incorrect');
            return;
        }

        // API request params
        var args = {
            a: 'sec',           // 'Set Email Confirmation'
            c: context.code,
            e: context.email,
            r: 1,               // Replace the email address
            i: requesti
        };

        // If using the old method send the updated email string hash as well, this is not needed in the new method
        if (u_attr.aav < 2) {

            // Create the SJCL cipher object
            var derivedEncryptionKeyCipherObject = new sjcl.cipher.aes(derivedEncryptionKeyArray32);

            // Add the user email hash to the request
            args.uh = stringhash(context.email, derivedEncryptionKeyCipherObject);
        }

        loadingDialog.show();

        // Confirms that the user owns the email address
        api_req(args, {
            callback: function(res) {
                loadingDialog.hide();

                if (checkError(res)) {
                    return;
                }

                var title   = l[6859];                                  // Info
                var msgBody = l[7701].replace("[X]", context.email);    // Your new e-mail address is ...
                u_attr.email = context.email;
                context = null; /* wipe variable */

                msgDialog('warninga', title, msgBody, false, function() {

                    // Wipe out account cache data (so we can fetch the newest email address)
                    M.currentdirid = null;
                    M.account = null;
                    loadSubPage('fm/account/security');
                    showToast('settings', l[7698]);// You have successfully changed your profile
                });
            }
        });
    }

    /**
     * Verify if verify code is valid
     */
    ns.verify = function() {

        // The user has no context, it happens when a given user login
        // and this function exists (verify new email / logout / login again)
        // but we have no context, so we ignore this request.
        if (!context) {
            return;
        }

        /**
         * After we updated the user's data, we verify if they typed their password correctly or not.
         */
        function verifyUserPasswordCallback() {

            $input = $input || $('#verify-password');
            var password = $input.val();

            $input.val('');

            // Verify if a given password is the user's password.
            // If everything is correct, we attempt to verify the email.
            security.getDerivedEncryptionKey(password)
                .then(function(derivedKey) {
                    continueEmailVerification(derivedKey);
                })
                .catch(function(ex) {
                    console.warn(ex);
                    continueEmailVerification('');
                });
        }

        $('.login-register-input.password').addClass('loading').removeClass('incorrect');

        // User-Get
        // Get the user information from the session. We call it here
        // because we need to be sure we're always getting the latest user's
        // password
        api_req({ a: 'ug' }, {
            callback: function(res) {

                // Update the user's data and then verify their password
                u_checklogin3a(res, { checkloginresult: verifyUserPasswordCallback });
            }
        });
    };

    return ns;
})();
