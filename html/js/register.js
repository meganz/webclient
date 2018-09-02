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
            $('.login-register-input.email .top-loginp-tooltip-txt')
                .safeHTML('@@<div class="white-txt">@@</div>', l[1297], l[1298]);
            $('.login-register-input.email').addClass('incorrect');
            msgDialog('warninga', 'Error', l[7869]);
        }
    }
};

function registeraccount() {

    'use strict';

    rv.password = $.trim($('#register-password-registerpage').val());
    rv.first = $.trim($('#register-firstname-registerpage').val());
    rv.last = $.trim($('#register-lastname-registerpage').val());
    rv.email = $.trim($('#register-email-registerpage').val());
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
    var firstName = $.trim($('#register-firstname-registerpage').val());
    var lastName = $.trim($('#register-lastname-registerpage').val());
    var email = $.trim($('#register-email-registerpage').val());
    var password = $.trim($('#register-password-registerpage').val());
    var passwordConfirm = $.trim($('#register-password-registerpage2').val());

    if (firstName === '' || lastName === '') {
        $('.login-register-input.name').addClass('incorrect');
        err = 1;
    }
    if (email === '' || checkMail(email)) {
        $('.login-register-input.email').addClass('incorrect');
        err = 1;
    }

    if (email === '' || checkMail(email)) {
        $('.login-register-input.email').addClass('incorrect');
        err = 1;
    }

    if (password === '') {
        $('.login-register-input.password.first').addClass('incorrect');
        $('.white-txt.password').text(l[213]);
        err = 1;
    }
    else if (password.length < security.minPasswordLength) {
        $('.login-register-input.password.first').addClass('incorrect');
        $('.white-txt.password').text(l[18701]);
        err = 1;
    }
    else if (typeof zxcvbn !== 'undefined') {
        var pw = zxcvbn(password);
        if (pw.score < 1) {
            $('.login-register-input.password.first').addClass('incorrect');
            $('.white-txt.password').text(l[1104]);
            err = 1;
        }
    }

    if (password !== passwordConfirm) {
        $('#register-password-registerpage').val('');
        $('#register-password-registerpage2').val('');
        $('.login-register-input.password.confirm').addClass('incorrect');
        err = 1;
    }

    if (!err && typeof zxcvbn === 'undefined') {
        msgDialog('warninga', l[135], l[1115] + '<br>' + l[1116]);
        return false;
    }
    else if (!err) {
        if ($('.register-check').attr('class').indexOf('checkboxOff') > -1) {
            msgDialog('warninga', l[1117], l[1118]);    // You need to agree with the Terms of Service to register...
        }
        else {
            if (localStorage.businessSubAc) {
                var signupcode = '';
                window.businessSubAc = JSON.parse(localStorage.businessSubAc);
                signupcode = window.businessSubAc.signupcode;
                var ctx = {
                    checkloginresult: function (u_ctx, r) {
                        if (typeof r[0] === 'number' && r[0] < 0) {
                            msgDialog('warningb', l[135], l[200]);
                        }
                        else {
                            loadingDialog.hide();
                            u_type = r;
                            loadSubPage('fm');
                        }
                    },
                    businessUser: localStorage.businessSubAc
                };
                var passwordaes = new sjcl.cipher.aes(prepare_key_pw($('#register-password').val()));
                var uh = stringhash($('#register-email').val().toLowerCase(), passwordaes);
                u_checklogin(ctx,
                    true,
                    prepare_key_pw($('#register-password').val()),
                    signupcode,
                    $('#register-firstname').val() + ' ' + $('#register-lastname').val(), uh);
                delete localStorage.businessSubAc;
            }
            else if (u_type === false) {
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
    if (register_txt) {
        $('.main-top-info-block').removeClass('hidden');
        $('.main-top-info-text').text(register_txt);
        register_txt = false;
    }

    if (localStorage.registeremail) {
        $('#register-email-registerpage').val(localStorage.registeremail);
    }

    $('#register-firstname-registerpage').rebind('focus.initregister', function() {
        $('.login-register-input.name').removeClass('incorrect');
        $('.login-register-input.name').addClass('focused');
    });
    $('#register-firstname-registerpage').rebind('blur.initregister', function() {
        $('.login-register-input.name').removeClass('focused');
    });
    $('#register-lastname-registerpage').rebind('focus.initregister', function() {
        $('.login-register-input.name').removeClass('incorrect');
        $('.login-register-input.name').addClass('focused');
    });
    $('#register-lastname-registerpage').rebind('blur.initregister', function() {
        $('.login-register-input.name').removeClass('focused');
    });
    $('#register-email-registerpage').rebind('focus.initregister', function() {
        $('.login-register-input.email .top-loginp-tooltip-txt')
            .safeHTML('@@<div class="white-txt">@@</div>', l[1100], l[1101]);
        $('.login-register-input.email').removeClass('incorrect');
        $('.login-register-input.email').addClass('focused');
    });
    $('#register-email-registerpage').rebind('blur.initregister', function() {
        $('.login-register-input.email').removeClass('focused');
    });
    $('#register-password-registerpage').rebind('focus.initregister', function() {
        $('.login-register-input.password.first').removeClass('incorrect');
        $('.login-register-input.password.confirm').removeClass('incorrect');
        $(this).parents('.password').addClass('focused');
    });
    $('#register-password-registerpage').rebind('blur.initregister', function() {
        $('.login-register-input.password').removeClass('focused');
        registerpwcheck();
    });
    $('#register-password-registerpage2').rebind('focus.initregister', function() {
        $('.login-register-input.password.confirm').removeClass('incorrect');
        $(this).parents('.password').addClass('focused');
    });
    $('#register-password-registerpage2').rebind('blur.initregister', function() {
        $(this).parents('.password').removeClass('focused');
    });
    $('.new-registration-checkbox .radio-txt,.register-check').rebind('click.uiCheckboxes', function() {
        if ($('.register-check').attr('class').indexOf('checkboxOn') > -1) {
            $('.register-check').addClass('checkboxOff');
            $('.register-check').removeClass('checkboxOn');
        }
        else {
            $('.register-check').addClass('checkboxOn');
            $('.register-check').removeClass('checkboxOff');
        }
    });
    if (typeof zxcvbn === 'undefined') {
        $('.login-register-input.password').addClass('loading');

        M.require('zxcvbn_js')
            .done(function() {
                $('.login-register-input.password').removeClass('loading');
                registerpwcheck();
            });
    }
    $('#register-password-registerpage').rebind('keyup.initregister', function() {
        registerpwcheck();
    });
    $('.password-status-icon').rebind('mouseover.initregister', function() {
        if ($(this).parents('.strong-password').length === 0) {
            $('.password-status-warning').removeClass('hidden');
        }
    });
    $('.password-status-icon').rebind('mouseout', function(e) {
        if ($(this).parents('.strong-password').length === 0) {
            $('.password-status-warning').addClass('hidden');
        }
    });

    $('.register-st2-button').rebind('click', function() {
        pageregister();
    });
    $('.new-registration-checkbox a').rebind('click', function(e) {
        $.termsAgree = function() {
            $('.register-check').removeClass('checkboxOff');
            $('.register-check').addClass('checkboxOn');
        };
        bottomPageDialog(false, 'terms');
        return false;
    });
    $('.login-register-input.email,.login-register-input.password').rebind('click', function(e) {
        $(this).find('input').focus();
    });
    $('.login-register-input.name').rebind('click', function(e) {
        var c = $(e.target).attr('class');
        if (c && c.indexOf('login-register-input name') > -1) {
            $('#register-firstname-registerpage').focus();
        }
        else if (c && c.indexOf('register-family-input-block') > -1) {
            $('#register-lastname-registerpage').focus();
        }
    });

    var $regInfoContainer = $('#register_form .main-mid-pad.big-pad.register1 .main-left-block');
    $('.login-register-input.name', $regInfoContainer).removeClass('hidden');
    $('.login-register-input.email', $regInfoContainer).removeClass('hidden');
    $('h3.main-italic-header', $regInfoContainer).html(l[1095]);

    var $tipsContainer = $('#register_form .main-mid-pad.big-pad.register1 .main-right-block');
    $('.dont-forget-pass', $tipsContainer).removeClass('hidden'); //19130
    $('p.account-sec', $tipsContainer).html(l[1093] + ' ' + l[1094]);
    $('.account-business', $tipsContainer).addClass('hidden');

    // business sub-account registeration
    if (localStorage.businessSubAc) {
        var userInfo = JSON.parse(localStorage.businessSubAc);
        // we know here that userInfo contain all needed attr, othrewise higher layers wont allow us
        // to get here.
        $('#register-email-registerpage').val(userInfo.e);
        // $('#register-email').attr('readonly', true);
        $('#register-lastname-registerpage').val(a32_to_str(base64_to_a32(userInfo.lastname)));
        // $('#register-lastname').attr('readonly', true);
        $('#register-firstname-registerpage').val(a32_to_str(base64_to_a32(userInfo.firstname)));
        // $('#register-firstname').attr('readonly', true);
        var headerText = l[19129].replace('[A]', '<span class="red">').replace('[/A]', '</span>');
        $('h3.main-italic-header', $regInfoContainer).html(headerText);

        $('.login-register-input.name', $regInfoContainer).addClass('hidden');
        $('.login-register-input.email', $regInfoContainer).addClass('hidden');
        $('.dont-forget-pass', $tipsContainer).addClass('hidden');
        $('p.account-sec', $tipsContainer).text(l[19131]);
        $('.account-business', $tipsContainer).removeClass('hidden');
    }
}


function registerpwcheck() {

    $('.login-register-input.password').removeClass('weak-password strong-password');
    $('.new-registration').removeClass('good1 good2 good3 good4 good5');

    var trimmedPassword = $.trim($('#register-password-registerpage').val());

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
