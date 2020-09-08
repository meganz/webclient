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
            $('#register-email-registerpage2').megaInputsShowError(l[1297]);
            $('.account.input-wrapper.email input').focus();
            msgDialog('warninga', 'Error', l[7869]);
        }
    }
};

function registeraccount() {

    'use strict';

    rv.password = $('#register-password-registerpage2').val();
    rv.first = $.trim($('#register-firstname-registerpage2').val());
    rv.last = $.trim($('#register-lastname-registerpage2').val());
    rv.email = $.trim($('#register-email-registerpage2').val());
    rv.name = rv.first + ' ' + rv.last;

    var signup = null;
    var fromProPage = false;

    // Set a flag indicating the registration came from the webclient.
    localStorage.signUpStartedInWebclient = '1';

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

        $('.fm-dialog.registration-page-success').off('click');

        mega.ui.sendSignupLinkDialog(rv);

        ops.terms = 'Mq';
        ops.firstname = base64urlencode(to8(rv.first));
        ops.lastname = base64urlencode(to8(rv.last));
        ops.name2 = base64urlencode(to8(rv.name));
        u_attr.terms = 1;

        security.register.cacheRegistrationData(rv);

        if (mega.affid) {
            ops.aff = mega.affid;
        }

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

        $('.fm-dialog.registration-page-success').off('click');

        mega.ui.sendSignupLinkDialog(rv);

        u_attr.terms = 1;

        security.register.cacheRegistrationData(rv);
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
    var $firstName = $('#register-firstname-registerpage2', $formWrapper);
    var $lastName = $('#register-lastname-registerpage2', $formWrapper);
    var $email = $('#register-email-registerpage2', $formWrapper);
    var $password = $('#register-password-registerpage2', $formWrapper);
    var $confirmPassword = $('#register-password-registerpage3', $formWrapper);

    var firstName = $.trim($firstName.val());
    var lastName = $.trim($lastName.val());
    var email = $.trim($email.val());
    var password = $password.val();
    var confirmPassword = $confirmPassword.val();

    // Check if the entered passwords are valid or strong enough
    var passwordValidationResult = security.isValidPassword(password, confirmPassword);

    // If bad result
    if (passwordValidationResult !== true) {

        // Show error for password field, clear the value and refocus it
        $password.val('').focus().trigger('input');
        $password.megaInputsShowError(l[1102] + ' ' + passwordValidationResult);

        // Show error for confirm password field and clear the value
        $confirmPassword.val('');
        $confirmPassword.parent().addClass('error');

        err = 1;
    }

    if (email === '' || !isValidEmail(email)) {
        $email.megaInputsShowError(l[1100] + ' ' + l[1101]);
        $email.focus();
        err = 1;
    }

    if (firstName === '' || lastName === '') {
        $firstName.megaInputsShowError(l[1098] + ' ' + l[1099]);
        $lastName.megaInputsShowError();
        $firstName.focus();
        err = 1;
    }

    if (!err) {
        if ($('.understand-check', $formWrapper).hasClass('checkboxOff')) {
            msgDialog('warninga', l[1117], l[21957]);
        }
        else if ($('.register-check', $formWrapper).hasClass('checkboxOff')) {
            msgDialog('warninga', l[1117], l[1118]);
        }
        else {
            // for business sub-users signup we are still using signup code.
            // and business sub-users registration flow is different and more direct than normal users
            // as it doesnt contain "uc2" due to the implied email confirmation (because the user is coming
            // from invitation email)
            // Note: for business no backward compatibility is needed and V2 registration is mandatory
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

                            security.login.checkLoginMethod($email.val().toLowerCase(),
                                $password.val(), null, false,
                                signin.old.startLogin,
                                signin.new.startLogin);

                            // I need this event handler to be triggered only once after successful sub-user login
                            mBroadcaster.once('fm:initialized', M.importWelcomePDF);
                            delete localStorage.businessSubAc;
                        }
                    },
                    businessUser: $password.val()   // we need the plain enterd password in later stages
                    // because u_checklogin take the byte array of the password.
                };
                // var passwordByteArray = prepare_key_pw($password.val());
                // var passwordaes = new sjcl.cipher.aes(passwordByteArray);
                // var uh = stringhash($email.val().toLowerCase(), passwordaes);
                u_checklogin(ctx,
                    true,
                    null,
                    signupcode,
                    $firstName.val() + ' ' + $lastName.val());
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
    'use strict';

    var $formWrapper = $('.main-mid-pad.register1');
    var $inputs = $formWrapper.find('input');
    var $button = $formWrapper.find('.big-red-button');
    var $email = $formWrapper.find('#register-email-registerpage2');
    var $firstName = $formWrapper.find('#register-firstname-registerpage2');
    var $lastName = $formWrapper.find('#register-lastname-registerpage2');

    if (register_txt) {
        $('.main-top-info-block').removeClass('hidden');
        $('.main-top-info-text').text(register_txt);
        register_txt = false;
    }

    if (localStorage.registeremail) {
        $email.val(localStorage.registeremail);
    }

    $firstName.rebind('input.resetWithLastname', function() {
        $lastName.megaInputsHideError();
    });

    $lastName.rebind('input.resetWithFirstname', function() {
        $firstName.megaInputsHideError();
    });

    $inputs.rebind('keydown.initregister', function(e) {
        if (e.keyCode === 13) {
            pageregister();
            return false;
        }
    });

    $button.rebind('click.initregister', function() {

        if ($(this).hasClass('disabled')) {
            return false;
        }
        pageregister();
    });

    $button.rebind('keydown.initregister', function (e) {
        if (e.keyCode === 13 && !$(this).hasClass('disabled')) {
            pageregister();
        }
    });

    $('.checkbox-block.register .radio-txt', $formWrapper).safeHTML(l['208s']);

    $('.checkbox-block.register span', $formWrapper).rebind('click', function(e) {
        e.preventDefault();
        $.termsAgree = function() {
            $('.register-check', $formWrapper).removeClass('checkboxOff')
                .addClass('checkboxOn');
        };
        bottomPageDialog(false, 'terms', false, true);
        return false;
    });

    var $regInfoContainer = $('.main-mid-pad.big-pad.register1 .main-left-block').removeClass('businessSubAc');
    $('.mega-input-title-ontop', $regInfoContainer).removeClass('hidden');
    $('.account.top-header', $regInfoContainer).safeHTML(l[1095]);

    // business sub-account registration
    if (localStorage.businessSubAc) {
        var userInfo = JSON.parse(localStorage.businessSubAc);
        // we know here that userInfo contain all needed attr, otherwise higher layers wont allow us
        // to get here.
        $email.val(userInfo.e);
        $lastName.val(from8(base64urldecode(userInfo.lastname)));
        $firstName.val(from8(base64urldecode(userInfo.firstname)));
        var headerText = l[19129].replace('[A]', '<span class="red">').replace('[/A]', '</span>');
        $('.account.top-header', $regInfoContainer).safeHTML(headerText);

        $email.addClass('hidden');
        $lastName.addClass('hidden');
        $firstName.addClass('hidden');
        $regInfoContainer.addClass('businessSubAc');
        $('.checkbox-block.pw-remind .radio-txt', $formWrapper).safeHTML(l[23748]);
    }

    // Init inputs events
    accountinputs.init($formWrapper);

    // New register sercurity info slider
    var timer;

    // Aniamte slide -1 to previous, 1 to next, 0 is nothing
    var animateSlide = function(direction) {
        var $slideWrapper = $('.register-slide-wrapper', $formWrapper);
        var lastSlide = $slideWrapper.find('.register-slide-page').length;
        var currentSlide = parseInt($slideWrapper.attr('data-slide'));
        var to = 0;

        if (direction < 0) {
            to = currentSlide === 1 ? lastSlide : currentSlide - 1;
            $slideWrapper.attr('data-slide', to);
        }
        else if (direction > 0) {
            to = currentSlide === lastSlide ? 1 : currentSlide + 1;
            $slideWrapper.attr('data-slide', to);
        }
    };

    // Auto looping for the slider
    var startTimer = function () {
        clearInterval(timer);

        timer = setInterval(function() {

            // Prevent multiple jump after refocused tab
            if (document.visibilityState === 'hidden') {
                return false;
            }

            animateSlide(1);
        }, 4000);
    };

    startTimer();

    // Click next or prev.
    $('.slider-ctrl-button', $formWrapper).rebind('click', function() {
        if ($(this).hasClass('prev')) {
            animateSlide(-1);
        }
        else if ($(this).hasClass('next')) {
            animateSlide(1);
        }
        startTimer();
    });
}

function register_signup(email) {
    document.getElementById('register_email').value = email;
    document.getElementById('register_email').readOnly = true;
    document.getElementById('register_password_confirm_div').style.display = '';
}
