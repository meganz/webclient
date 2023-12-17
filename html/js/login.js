/**
 * Desktop signin/login functions
 */
var signin = {

    /**
     * Old method functions
     */
    old: {

        /**
         * Starts the login proceedure for v1 accounts
         * @param {String} email The user's email address
         * @param {String} password The user's password
         * @param {String|null} pinCode The two-factor authentication PIN code (6 digit number), or null if N/A
         * @param {Boolean} rememberMe Whether the user clicked the Remember me checkbox or not
         */
        startLogin: function(email, password, pinCode, rememberMe) {

            'use strict';

            postLogin(email, password, pinCode, rememberMe)
                .then((result) => {

                    signin.proceedWithLogin(result);
                })
                .catch(tell)
                .finally(() => loadingDialog.hide());
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
        $('.mega-dialog.verify-two-factor-login.submit-button').removeClass('loading');

        // Check and handle the common login errors
        if (security.login.checkForCommonErrors(result, signin.old.startLogin, signin.new.startLogin)) {
            return false;
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
            if (document.activeElement) {
                document.activeElement.blur();
            }

            msgDialog('warninga', l[135], l[7431], false, () => {
                $('#login-password2').select();
            });
        }
    }
};

var login_txt = false;
var login_email = false;


function postLogin(email, password, pinCode, remember) {
    'use strict';
    return new Promise((resolve) => {
        var ctx = {
            checkloginresult(ctx, result) {
                const {u_k} = window;

                // Check if we can upgrade the account to v2
                security.login.checkToUpgradeAccountVersion(result, u_k, password)
                    .catch(dump)
                    .finally(() => resolve(result));
            }
        };
        var passwordaes = new sjcl.cipher.aes(prepare_key_pw(password));
        var uh = stringhash(email.toLowerCase(), passwordaes);

        u_login(ctx, email, password, uh, pinCode, remember);
    });
}

function pagelogin() {
    'use strict';

    var $formWrapper = $('.main-mid-pad.login form');
    var $email = $formWrapper.find('#login-name2');
    var $password = $formWrapper.find('#login-password2');
    var $button = $('button.login-button', $formWrapper);

    var e = $email.val().trim();
    if (e === '' || !isValidEmail(e)) {
        $email.megaInputsShowError(l[141]);
        $email.focus();
    }
    else if ($('#login-password2').val() === '') {
        $('#login-password2').megaInputsShowError(l[1791]);
        $password.focus();
    }
    else if ($button.hasClass('disabled')) {
        if (d) {
            console.warn('Aborting login procedure, there is another ongoing...');
        }
    }
    else {
        $button.addClass('disabled');
        tSleep(9).then(() => $button.removeClass('disabled'));
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
    var $inputs = $('#login-name2, #login-password2, .login-button', $formWrapper);
    var $button = $('button.login-button', $formWrapper);
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
        $('span', $button).text(l[1131]);
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
        delay('loginevlog', () => eventlog(99796));
        pagelogin();
    });

    // Init inputs events
    accountinputs.init($formWrapper);
}
