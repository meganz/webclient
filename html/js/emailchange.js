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

        $input = $('#verify-password');
        $input.rebind('focus', function() {

            $('.login-register-input.password.first').removeClass('incorrect');
            $('.login-register-input.password.confirm').removeClass('incorrect');
            $('.login-register-input.password').addClass('focused');
        });

        $input.rebind('keyup', function(event) {

            if (event.keyCode == 13) {
                ns.verify();
            }
        });

        $('.restore-verify-button').rebind('click', function() {

            ns.verify();
        });
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

        context = null; // wipe variable

        msgDialog('warninga', title, msgBody, false, function() {
            loadSubPage('fm/account/profile');
        });

        return true;
    }

    /**
     * Verify if a given AES-Password (or if none is given, we read from the input)
     * is the user's password. If everything is correct, we attempt to verify
     * the email.
     *
     * We use the new email address to generate a new "login hash" (email + password AES),
     * without the step the current user won't be able to login with their new
     * email address.
     *
     * @param {Object} passAES The password AES object (optional)
     * @return {void}
     */
    function verifyEmailCallback(passAES) {

        var encryptedKey  = context.k1 || u_attr.k;
        var privateRsaKey = context.k2 || u_k;

        // If the password is incorrect, then quit out
        if (!checkMyPassword(passAES, encryptedKey, privateRsaKey)) {
            $('.login-register-input.password').removeClass('loading').addClass('incorrect');
            return;
        }

        // API request params
        var args = {
            a: 'sec',                                   // 'Set Email Confirmation'
            c: context.code,
            e: context.email,
            uh: stringhash(context.email, passAES),     // User Hash
            r: 1,                                       // Replace the email address
            i: requesti
        };

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
                    loadSubPage('fm/account/profile');
                    showToast('settings', l[7698]);     // You have successfully changed your profile
                });
            }
        });
    }

    /**
     * Verify if verify code is valid.
     *
     * @param {Object} passAES The password AES object (optional)
     * @param {Array} keys The hash with key 1 (encrypted private key) and key 2 (private key). (optional)
     */
    ns.verify = function(passAES, keys) {

        // The user has no context, it happens when a given user login
        // and this function exists (verify new email / logout / login again)
        // but we have no context, so we ignore this request.
        if (!context) {
            return;
        }


        /**
         *  After we updated the user's data, we verify if they
         *  typed their password correctly or not.
         */
        function verifyUserPassword() {

            $input = $input || $('#verify-password');
            var password = $input.val();

            // Use passAES (AES object with the user's password as the key)
            // *or* whatever the user typed in `$input`.
            passAES = passAES || new sjcl.cipher.aes(prepare_key_pw(password));

            $input.val('');

            // Check if the code is valid using 'Email Request Service' API call
            api_req({ 'a': 'ersv', 'c': context.code }, { callback: function(res) {

                if (checkError(res)) {
                    return;
                }

                if (keys) {
                    context.k1 = keys.k1;
                    context.k2 = keys.k2;
                }

                // Receive the old email address and verify the password they typed is correct.
                // If it is correct, then we update the user hash with the new email address.
                context.email = res[1];
                verifyEmailCallback(passAES);
            }});
        }


        $('.login-register-input.password').addClass('loading').removeClass('incorrect');

        // User-Get
        // Get the user information from the session. We call it here
        // because we need to be sure we're always getting the latest user's
        // password
        api_req({ a: 'ug' }, {
            callback: function(res) {

                // Update the user's data and then verify their password
                u_checklogin3a(res, {checkloginresult: verifyUserPassword});
            }
        })
    };

    return ns;
})();
