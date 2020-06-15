/**
 * Desktop signin/login functions
 */
var signin = {

    /**
     * Old method functions
     */
    old: {

        /**
         * Starts the login proceedure
         * @param {String} email The user's email address
         * @param {String} password The user's password
         * @param {String|null} pinCode The two-factor authentication PIN code (6 digit number), or null if N/A
         * @param {Boolean} rememberMe Whether the user clicked the Remember me checkbox or not
         */
        startLogin: function(email, password, pinCode, rememberMe) {

            'use strict';

            if (confirmok) {
                doConfirm(email, password, function() {
                    loadingDialog.show();
                    postLogin(email, password, pinCode, rememberMe, function(result) {

                        loadingDialog.hide();

                        // Proceed with login
                        signin.proceedWithLogin(result);
                    });
                });
            }
            else {
                postLogin(email, password, pinCode, rememberMe, function(result) {

                    loadingDialog.hide();

                    // Otherwise proceed with regular login
                    signin.proceedWithLogin(result);
                });
            }
        }
    },

    /**
     * New secure method functions
     */
    new: {

        /**
         * Start the login process
         * @param {String} email The user's email addresss
         * @param {String} password The user's password as entered
         * @param {String|null} pinCode The two-factor authentication PIN code (6 digit number), or null if N/A
         * @param {Boolean} rememberMe A boolean for if they checked the Remember Me checkbox on the login screen
         * @param {String} salt The user's salt as a Base64 URL encoded string
         */
        startLogin: function(email, password, pinCode, rememberMe, salt) {

            'use strict';

            // Start the login using the new process
            security.login.startLogin(email, password, pinCode, rememberMe, salt, function(result) {

                loadingDialog.hide();

                // Otherwise proceed with regular login
                signin.proceedWithLogin(result);
            });
        }
    },

    /**
     * Proceed to key generation step
     * @param {Number} result The result from the API, e.g. a negative error num or the user type
     */
    proceedWithKeyGeneration: function(result) {

        'use strict';

        u_type = result;
        loadSubPage('key');
    },

    /**
     * Proceed to the login step
     * @param {Number} result The result from the API, e.g. a negative error num or the user type
     */
    proceedWithLogin: function(result) {

        'use strict';

        // Remove loading spinner from 2FA dialog
        $('.fm-dialog.verify-two-factor-login.submit-button').removeClass('loading');

        // Check and handle the common login errors
        if (security.login.checkForCommonErrors(result, signin.old.startLogin, signin.new.startLogin)) {
            return false;
        }

        // close two-factor dialog if it was opened
        if (twofactor && twofactor.loginDialog) {
            twofactor.loginDialog.closeDialog();
        }

        // If successful result
        if (result !== false && result >= 0) {

            // Otherwise if email confirm code is ok, proceed with RSA key generation
            if (confirmok) {
                signin.proceedWithKeyGeneration(result);
            }
            else {
                // Otherwise proceed with regular login
                u_type = result;
                passwordManager('#login_form');

                if (login_next) {
                    loadSubPage(login_next);
                }
                else if (page !== 'login') {
                    init_page();
                }
                else {
                    loadSubPage('fm');
                }
                login_next = false;
            }
        }
        else {
            // Show a failed login
            $('#login-name2').megaInputsShowError().blur();
            $('#login-password2').megaInputsShowError(l[7431]).val('').blur();

            // Close the 2FA dialog for a generic error
            twofactor.loginDialog.closeDialog();

            msgDialog('warninga', l[135], l[7431] + '.', false, function() {
                $('#login-name2').select();
            });
        }
    }
};

var login_txt = false;
var login_email = false;

function doConfirm(email, password, callback) {
    'use strict';

    var $formWrapper = $('.main-mid-pad.login form');

    if (u_signupenck) {
        if (checksignuppw(password)) {
            if (d) {
                console.log('u_handle', u_handle);
            }
            var passwordaes = new sjcl.cipher.aes(prepare_key_pw(password));
            api_updateuser({
                callback2: callback,
                callback: function(res, ctx) {
                    loadingDialog.hide();
                    if (res[0] === EACCESS) {
                        if (m) {
                            alert(l[732]);
                        }
                        else {
                            msgDialog('warninga', l[135], l[732]);
                        }
                    }
                    else if (typeof res[0] === 'string') {
                        confirmok = false;
                        if (ctx.callback2) {
                            ctx.callback2();
                        }
                    }
                    else if ((typeof res === 'number') && (res === -11)) {
                        if (u_type === 0) {// Ephemeral session
                            msgDialog("warninga", l[2480], l[12439]);
                        }
                        else {
                            msgDialog("warninga", l[2480], l[12440]);
                        }
                    }
                    else {
                        alert(l[200]);
                    }
                }
            }, {
                uh: stringhash(email.toLowerCase(), passwordaes),
                c: confirmcode
            });
        }
        else {
            loadingDialog.hide();

            if (is_mobile) {
                mobile.messageOverlay.show(l[201]);
                $('.mobile.signin-register-block .signin-button').removeClass('loading');
            }
            else {
                $('#login-password2', $formWrapper).val('');
                $('#login-password2', $formWrapper).megaInputsHideError();
                $('#login-name2', $formWrapper).megaInputsHideError();
                msgDialog('warninga', l[135], l[201]);
            }
        }
    }
}

function postLogin(email, password, pinCode, remember, loginCompletionCallback) {
    'use strict';

    // A little helper to pass only the final result of the User Get (ug) API request
    // i.e. the (user type or error code) back to the loginCompletionCallback function
    var ctx = {
        callback2: loginCompletionCallback,
        checkloginresult: function(ctx, result) {
            if (ctx.callback2) {
                ctx.callback2(result);
            }
        }
    };
    var passwordaes = new sjcl.cipher.aes(prepare_key_pw(password));
    var uh = stringhash(email.toLowerCase(), passwordaes);

    u_login(ctx, email, password, uh, pinCode, remember);
}

function pagelogin() {
    'use strict';

    var $formWrapper = $('.main-mid-pad.login form');
    var $email = $formWrapper.find('#login-name2');
    var $password = $formWrapper.find('#login-password2');

    var e = $email.val().trim();
    if (e === '' || !isValidEmail(e)) {
        $email.megaInputsShowError(l[141]);
        $email.focus();
    }
    else if ($('#login-password2').val() === '') {
        $('#login-password2').megaInputsShowError(l[1791]);
        $password.focus();
    }
    else {
        loadingDialog.show();
        $formWrapper.find('.top-dialog-login-button').addClass('loading');
        if ($formWrapper.find('.loginwarning-checkbox').hasClass('checkboxOn')) {
            localStorage.hideloginwarning = 1;
        }

        var email = e;
        var password = $password.val();
        var rememberMe = false;
        var twoFactorPin = null;

        // XXX: Set remember on by default if confirming a freshly created account
        if (confirmok || $formWrapper.find('.login-check').hasClass('checkboxOn')) {
            rememberMe = true;
        }

        // Checks if they have an old or new registration type, after this the flow will continue to login
        security.login.checkLoginMethod(email, password, twoFactorPin, rememberMe,
                                        signin.old.startLogin,
                                        signin.new.startLogin);
    }
}

function init_login() {
    'use strict';

    var $formWrapper = $('.main-mid-pad.login');
    var $inputs = $formWrapper.find('input');
    var $button = $formWrapper.find('.big-red-button');
    var $forgotPassLink = $('.top-login-forgot-pass', $formWrapper);

    if (is_extension) {
        $('.extension-advise').addClass('hidden');
    }
    else {
        $('.extension-advise').removeClass('hidden');
    }

    if (login_email) {
        $('#login-name2', $formWrapper).val(login_email);
    }

    if (confirmok) {
        $('.main-left-block').addClass('confirm');
        $('.main-right-block').addClass('hidden');
        $('.register-st2-txt-block').addClass('hidden');
        $('.account.small-header-txt').addClass('hidden');
        $forgotPassLink.addClass('hidden');
        $('.main-top-info-block').removeClass('hidden');
        $('.big-red-button.login-button').text(l[1131]);
        $('.account.top-header.login').text(l[1131]);
        $('.main-top-info-text').text(l[378]);
        $('.login-check').addClass('hidden').next().addClass('hidden');
    }
    else {
        if (login_txt) {
            $('.main-top-info-block').removeClass('hidden');
            $('.main-top-info-text').text(login_txt);
            login_txt = false;
        }
    }

    $forgotPassLink.rebind('click.forgotpasslink', function() {

        var email = document.getElementById('login-name2').value;

        if (isValidEmail(email)) {
            $.prefillEmail = email;
        }

        loadSubPage('recovery');
    });

    $inputs.rebind('keydown.initlogin', function(e) {

        $inputs.removeClass('errored').parent().removeClass('error');

        if (e.keyCode === 13) {
            pagelogin();
        }
    });

    $button.rebind('click.initlogin', function() {
        pagelogin();
    });

    $button.rebind('keydown.initlogin', function (e) {
        if (e.keyCode === 13) {
            pagelogin();
        }
    });

    // Init inputs events
    accountinputs.init($formWrapper);

    if (is_chrome_firefox) {
        Soon(mozLoginManager.fillForm.bind(mozLoginManager, 'login_form'));
    }
}
