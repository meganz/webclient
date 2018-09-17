var rv = {};

/**
 * When the user tries to register, but they already have an account and they used the same password for registration,
 * log them in and if they were in an ephemeral session, try transfer their ephemeral files as well to the account
 */
var loginFromEphemeral = {

    init: function() {

        'use strict';

        var rememberMe = true;
        var twoFactorPin = null;

        loadingDialog.show();

        // Checks if they have an old or new registration type, after this the flow will continue to login
        security.login.checkLoginMethod(rv.email, rv.password, twoFactorPin, rememberMe,
                                        loginFromEphemeral.old.startLogin,
                                        loginFromEphemeral.new.startLogin);
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

            postLogin(email, password, pinCode, rememberMe, loginFromEphemeral.completeLogin);
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

        // Remove loading spinner on the button
        $('.top-dialog-login-button').removeClass('loading');

        loadingDialog.hide();

        // Check and handle the common login errors
        if (security.login.checkForCommonErrors(result, loginFromEphemeral.old.startLogin,
                                                loginFromEphemeral.new.startLogin)) {

            return false;
        }

        // If successful result
        else if (result !== false && result >= 0) {

            // If the user got logged-in when trying to register, let's migrate the ephemeral account
            if ($.ephNodes) {

                passwordManager('#register_form');
                showToast('megasync', l[8745]);
                boot_auth(null, result);

                // The user got logged-in when trying to register, let's migrate the ephemeral account
                var msg = l[16517].replace('%1', rv.email);

                // On dialog confirm, import the ephemeral session files to the user's Inbox
                msgDialog('info', l[761], msg, null, function() {
                    $.onImportCopyNodes = $.ephNodes;
                    M.copyNodes(['meh'], u_handle, false, function(e) {
                        if (!Array.isArray(e)) {
                            console.error(e);
                        }
                        location.reload();
                    });
                });
            }
            else {
                // Show message that they've been successfully logged in then on OK reload the page
                msgDialog('info', l[18280], l[8745], null, function() {
                    location.reload();
                });
            }
        }
        else {
            // Close the 2FA dialog for a generic error
            twofactor.loginDialog.closeDialog();

            // Show message that the email has already been registered and to choose an alternative email to proceed
            $('.account.input-wrapper.email .account.input-tooltip')
                .safeHTML(l[1100] + '<br>' + l[1297]);
            $('.account.input-wrapper.email').addClass('incorrect');
            $('.account.input-wrapper.email input').focus();
            msgDialog('warninga', 'Error', l[7869]);
        }
    }
};

function registeraccount() {

    'use strict';

    rv.password = $.trim($('#register-password-registerpage2').val());
    rv.first = $.trim($('#register-firstname-registerpage2').val());
    rv.last = $.trim($('#register-lastname-registerpage2').val());
    rv.email = $.trim($('#register-email-registerpage2').val());
    rv.name = rv.first + ' ' + rv.last;

    var signup = null;
    var fromProPage = false;

    // Set the signup function to start the new secure registration process
    if (security.register.newRegistrationEnabled()) {
        signup = function() {
            security.register.startRegistration(rv.first, rv.last, rv.email, rv.password, fromProPage,
                                                continueNewRegistration);
        };
    }
    else {
        // Set the signup function to use the legacy registration process
        signup = function() {
            sendsignuplink(rv.name, rv.email, rv.password, { callback: continueOldRegistration }, fromProPage);
        };
    }

    if (u_type === 0) {
        // An ephemeral account is registering, save the cloud nodes in case we need to migrate later
        var names = Object.create(null);
        names[M.RootID] = 'ephemeral-account';

        M.getCopyNodes([M.RootID], null, names)
            .done(function(nodes) {
                if (Array.isArray(nodes) && nodes.length) {
                    $.ephNodes = nodes;
                    $.ephNodes[0].t = 1; // change RootID's t2 to t1
                }

                signup();
            });
    }
    else {
        signup();
    }
}

/**
 * Continue the old method registration
 * @param {Number} result The result of the 'uc' API request
 */
function continueOldRegistration(result) {

    'use strict';

    loadingDialog.hide();

    if (result === 0) {
        var ops = {
            a: 'up'
        };

        passwordManager($('#register_form'));

        $('.fm-dialog.registration-page-success').unbind('click');

        mega.ui.sendSignupLinkDialog(rv);

        ops.terms = 'Mq';
        ops.firstname = base64urlencode(to8(rv.first));
        ops.lastname = base64urlencode(to8(rv.last));
        ops.name2 = base64urlencode(to8(rv.name));
        u_attr.terms = 1;

        localStorage.awaitingConfirmationAccount = JSON.stringify(rv);

        api_req(ops);
    }
    else if (result === EACCESS || result === EEXIST) {
        loginFromEphemeral.init();
    }
    else {
        msgDialog('warninga', l[1578], l[200], result);
    }
}

/**
 * Continue the new method registration
 * @param {Number} result The result of the 'uc2' API request
 */
function continueNewRegistration(result) {

    'use strict';

    loadingDialog.hide();

    if (result === 0) {

        // Setup the password manager
        passwordManager($('#register_form'));

        $('.fm-dialog.registration-page-success').unbind('click');

        mega.ui.sendSignupLinkDialog(rv);

        u_attr.terms = 1;
        localStorage.awaitingConfirmationAccount = JSON.stringify(rv);
    }
    else if (result === EACCESS || result === EEXIST) {
        loginFromEphemeral.init();
    }
    else {
        msgDialog('warninga', l[1578], l[200], result);
    }
}

function pageregister() {

    /* jshint -W074 */
    if (u_type > 0) {
        msgDialog('warninga', l[135], l[5843]); // You are already logged in. You can only create one MEGA account
        return false;
    }

    var err = false;
    var $formWrapper = $('.main-mid-pad.register1 form');
    var $firstName = $('.input-wrapper.name .f-name', $formWrapper);
    var $lastName = $('.input-wrapper.name .l-name', $formWrapper);
    var $email = $('.input-wrapper.email input', $formWrapper);
    var $password = $('.input-wrapper.first input', $formWrapper);
    var $passwordConfirm = $('.input-wrapper.confirm input', $formWrapper);

    var firstName = $.trim($firstName.val());
    var lastName = $.trim($lastName.val());
    var email = $.trim($email.val());
    var password = $.trim($password.val());
    var passwordConfirm = $.trim($passwordConfirm.val());

    if (password !== passwordConfirm) {
        $password.parent().find('.account.password-stutus').removeClass('checked');
        $password.val('');
        $passwordConfirm.val('');
        $passwordConfirm.parent().addClass('incorrect');
        $password.focus();
        err = 1;
    }

    if (password === '') {
        $password.parent().addClass('incorrect');
        $password.focus();
        $password.parent().find('.account.input-tooltip')
            .safeHTML(l[1102] + '<br>' + l[213]);
        err = 1;
    }
    else if (password.length < security.minPasswordLength) {
        $password.parent().addClass('incorrect');
        $password.focus();
        $password.parent().find('.account.input-tooltip')
            .safeHTML(l[1102] + '<br>' + l[18701]);
        err = 1;
    }
    else if (typeof zxcvbn !== 'undefined') {
        var pw = zxcvbn(password);
        if (pw.score < 1) {
            $password.parent().addClass('incorrect');
            $password.focus();
            $password.parent().find('.account.input-tooltip')
                .safeHTML(l[1102] + '<br>' + l[1104]);
            err = 1;
        }
    }

    if (email === '' || checkMail(email)) {
        $email.parent().addClass('incorrect');
        $email.parent().find('.account.input-tooltip')
            .safeHTML(l[1100] + '<br>' + l[1101]);
        $email.focus();
        err = 1;
    }

    if (firstName === '' || lastName === '') {
        $firstName.parent().addClass('incorrect');
        $firstName.focus();
        err = 1;
    }

    if (!err && typeof zxcvbn === 'undefined') {
        msgDialog('warninga', l[135], l[1115] + '<br>' + l[1116]);
        return false;
    }
    else if (!err) {
        if ($('.register-check', $formWrapper).hasClass('checkboxOff')) {
            msgDialog('warninga', l[1117], l[1118]);
        }
        else {
            if (u_type === false) {
                loadingDialog.show();
                u_storage = init_storage(localStorage);
                u_checklogin({
                    checkloginresult: function(u_ctx, r) {
                        u_type = r;
                        registeraccount();
                    }
                }, true);
            }
            else if (u_type === 0) {
                registeraccount();
            }
        }
    }
}


function init_register() {
    'use strict';

    var $formWrapper = $('.main-mid-pad.register1');
    var $inputs = $formWrapper.find('.account.input-wrapper input');
    var $button = $formWrapper.find('.big-red-button');
    var $email = $formWrapper.find('.account.input-wrapper.email input');
    var $password = $formWrapper.find('.account.input-wrapper.password input');

    if (register_txt) {
        $('.main-top-info-block').removeClass('hidden');
        $('.main-top-info-text').text(register_txt);
        register_txt = false;
    }

    if (localStorage.registeremail) {
        $email.val(localStorage.registeremail);
    }

    $inputs.rebind('keydown.initregister', function(e) {
        if (e.keyCode === 13) {
            pageregister();
            return false;
        }
    });

    $password.first().rebind('blur.password, keyup.password', function() {
        registerpwcheck();
    });

    if (typeof zxcvbn === 'undefined') {
        $('.account.input-wrapper.password').addClass('loading');

        M.require('zxcvbn_js')
            .done(function() {
                $('.account.input-wrapper.password').removeClass('loading');
                registerpwcheck();
            });
    }

    $button.rebind('click.initregister', function() {
        pageregister();
    });

    $button.rebind('keydown.initregister', function (e) {
        if (e.keyCode === 13) {
            pageregister();
        }
    });

    $('.checkbox-block.register a', $formWrapper).rebind('click', function(e) {
        e.preventDefault();
        $.termsAgree = function() {
            $('.register-check', $registerForm).removeClass('checkboxOff')
                .addClass('checkboxOn');
        };
        bottomPageDialog(false, 'terms');
        return false;
    });

    // Init inputs events
    accountinputs.init($formWrapper);
}


function registerpwcheck() {
    'use strict';

    $('.account.password-stutus')
        .removeClass('good1 good2 good3 good4 good5 checked');

    var trimmedPassword = $.trim($('#register-password-registerpage2').val());

    if (typeof zxcvbn === 'undefined' || trimmedPassword === '') {
        return false;
    }

    classifyPassword(trimmedPassword);
}


function register_signup(email) {
    document.getElementById('register_email').value = email;
    document.getElementById('register_email').readOnly = true;
    document.getElementById('register_password_confirm_div').style.display = '';
}
