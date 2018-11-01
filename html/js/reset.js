var recoverycode;
var recoveryemail;
var recoverykey;

function init_reset() {
    $.tresizer();
    loadingDialog.show();
    recoverycode = page.replace('recover', '');
    api_req({
        a: 'erv',
        c: recoverycode
    }, {
        callback: function(res) {
            loadingDialog.hide();
            if (typeof res === 'number') {
                if (res === EEXPIRED) {
                    msgDialog('warninga', l[1966], l[1967], '', function() {
                        loadSubPage('recovery');
                    });
                }
                else {
                    msgDialog('warninga', l[1968], l[1969], '', function() {
                        loadSubPage('recovery');
                    });
                }
            }
            else {
                if (res[0] === 9) {
                    recoveryemail = res[1];
                    $('.main-mid-pad.backup-recover.withkey').removeClass('hidden');

                    $('.withkey .backup-input-button').rebind('click', function() {
                        verify_key($('#key-input2').val());
                    });

                    $('#key-input2').rebind('keypress', function(e) {
                        if (e.keyCode === 13) {
                            verify_key($('#key-input2').val());
                        }
                    });

                    $('#key-upload-field').rebind('change', function(e) {
                        if (e && e.target && e.target.files) {
                            var f = e.target.files[0];
                            if (f && f.size > 100) {
                                msgDialog('warningb', l[1972], l[1973]);
                            }
                            else if (f) {
                                var FR = new FileReader();
                                FR.onload = function(e) {
                                    var contents = e.target.result;
                                    verify_key(contents);
                                };
                                FR.readAsText(f);
                            }
                        }
                    });

                    $('.park-account-link').rebind('click', function() {
                        AccountRecoveryControl.showParkWarning();
                    });
                }
                else if (res[0] === 10) {
                    recoveryemail = res[1];
                    $('.main-mid-pad.backup-recover.withoutkey').removeClass('hidden');
                    $('.backup-notification-block').removeClass('hidden');
                }
            }
        }
    });

    if (typeof zxcvbn === 'undefined') {
        $('.login-register-input.password').addClass('loading');

        M.require('zxcvbn_js')
            .done(function() {
                $('.login-register-input.password').removeClass('loading');
                reset_pwcheck();
            });
    }
    else {
        $('.login-register-input.password').removeClass('loading');
        reset_pwcheck();
    }

    $('.restore-verify-button').rebind('click', function(e) {
        if (!$(this).hasClass('active')) {
            return false;
        }
        if ($(this).hasClass('reset-account')) {
            delete_reset_pw();
        }
        else {
            recovery_reset_pw();
        }
    });
    init_reset_pw();

    $('.new-registration-checkbox').rebind('click', function(e) {
        if ($(this).find(".register-check").hasClass('checkboxOn')) {
            $('.register-check').removeClass('checkboxOn').addClass('checkboxOff');
        }
        else {
            $('.register-check').addClass('checkboxOn').removeClass('checkboxOff');
        }
        return false;
    });

    $('.login-register-input').rebind('click', function() {
        $(this).find('input').trigger("focus");
    });
}

function delete_reset_pw() {

    var c = $('.register-check').attr('class');
    var password = $('#withoutkey-password').val();

    if (password === l[909]) {
        msgDialog('warninga', l[135], l[741]);
        return;
    }
    else if ($('#withoutkey-password').val() !== $('#withoutkey-password2').val()) {
        msgDialog('warninga', l[135], l[715]);
        return;
    }
    else if ($('.login-register-input.password').hasClass('weak-password')) {
        msgDialog('warninga', l[135], l[1129]);
        return;
    }
    else if ($('.new-registration-checkbox .register-check').hasClass('checkboxOff')) {
        msgDialog('warninga', l[135], l[1974]);
        return;
    }

    loadingDialog.show();

    // Finish the Park Account process
    security.resetUser(recoverycode, recoveryemail, password, function(code) {

        loadingDialog.hide();

        if (code === 0) {
            msgDialog('info', l[1975], l[1976], '', function() {
                login_email = recoveryemail;
                loadSubPage('login');
            });
        }
        else if (code === EKEY) {
            msgDialog('warningb', l[1977], l[1978]);
            $('.recover-block.error').removeClass('hidden');
        }
        else if (code === EBLOCKED) {
            msgDialog('warningb', l[1979], l[1980]);
        }
        else if (code === EEXPIRED || code === ENOENT) {
            msgDialog('warninga', l[1966], l[1967], '', function() {
                loadSubPage('recovery');
            });
        }
    });
}

function recovery_reset_pw() {

    'use strict';

    var newPassword = $('#withkey-password').val();
    var newPasswordConfirm = $('#withkey-password2').val();

    if (newPassword === l[909]) {
        msgDialog('warninga', l[135], l[741]);
        return;
    }
    else if (newPassword !== newPasswordConfirm) {
        msgDialog('warninga', l[135], l[715]);
        return;
    }
    else if ($('.login-register-input.password').hasClass('weak-password')) {
        msgDialog('warninga', l[135], l[1129]);
        return;
    }

    loadingDialog.show();

    // Perform the Master Key re-encryption with a new password
    security.resetKey(recoverycode, base64_to_a32(recoverykey), recoveryemail, newPassword, function(responseCode) {

        loadingDialog.hide();

        if (responseCode === 0) {
            msgDialog('info', l[1955], l[1981], '', function() {
                login_email = recoveryemail;
                loadSubPage('login');
            });
        }
        else if (responseCode === EKEY) {
            msgDialog('warningb', l[1977], l[1978]);
            $('.recover-block.error').removeClass('hidden');
        }
        else if (responseCode === EBLOCKED) {
            msgDialog('warningb', l[1979], l[1980]);
        }
        else if (responseCode === EEXPIRED || responseCode === ENOENT) {
            msgDialog('warninga', l[1966], l[1967], '', function() {
                loadSubPage('login');
            });
        }
    });
}


function verify_key(key) {

    $('#key-upload-field').val('');
    $('.recover-block.error,.recover-block.success').addClass('hidden');

    recoverykey = key;

    loadingDialog.show();

    // Change the password, re-encrypt the Master Key and send the encrypted key to the server
    security.resetKey(recoverycode, base64_to_a32(recoverykey), recoveryemail, null, function(responseCode) {

        if (responseCode === 0) {
            $('.recover-block').addClass('hidden');
            $('.recover-block.success').removeClass('hidden');
        }

        // If EKEY - invalid master key
        else if (responseCode === EKEY) {
            msgDialog('warningb', l[1977], l[1978]);
            // $('.recover-block.error').removeClass('hidden');
        }
        else if (responseCode === EBLOCKED) {
            msgDialog('warningb', l[1979], l[1980]);
        }

        // If ENOENT - invalid or already used code_from_email or if EEXPIRED - valid, but expired code_from_email
        else if (responseCode === EEXPIRED || responseCode === ENOENT) {
            msgDialog('warninga', l[1966], l[1967], '', function() {
                loadSubPage('login');
            });
        }

        loadingDialog.hide();
    });
}


function reset_pwcheck() {

    $('.login-register-input.password').removeClass('weak-password strong-password');
    $('.account.password-stutus').removeClass('good1 good2 good3 good4 good5 checked');
    $('.password-advice').empty();
    $('.minimum-password-block .password-icon').removeClass('success');

    if (typeof zxcvbn === 'undefined') {
        return false;
    }

    var trimmedWithKeyPassword = $.trim($('#withkey-password').val());
    var trimmedWithoutKeyPassword = $.trim($('#withoutkey-password').val());

    if (trimmedWithKeyPassword !== '') {
        classifyPassword(trimmedWithKeyPassword);
    }
    else if (trimmedWithoutKeyPassword !== '') {
        classifyPassword(trimmedWithoutKeyPassword);
    }
    else {
        return false;
    }
}


function init_reset_pw() {

    'use strict';
    
    var $passwords = $('#withkey-password,#withoutkey-password');
    var $confirms = $('#withkey-password2,#withoutkey-password2');

    var checkInput = function($input) {

        var $contentWrapper = $input.parents('.content-wrapper');
        var $firstInput = $contentWrapper.find('.first > input');
        var $confirmInput = $contentWrapper.find('.confirm > input');
        var $button = $contentWrapper.find('.restore-verify-button');

        if ($firstInput.val() && $confirmInput.val() && $firstInput.val().length > security.minPasswordLength
            && $firstInput.val().length === $confirmInput.val().length) {
            $button.addClass('active').removeClass('disabled');
        }
        else {
            $button.removeClass('active').addClass('disabled');
        }
    };

    $passwords.rebind('focus.initresetpw', function() {
        var $parent = $(this).parent();
        var $tooltip = $parent.find('.password-tooltip');
        $parent.removeClass('incorrect').addClass('focused');
        $tooltip.removeClass('hidden');
        setTimeout(function() { // Waiting for hidden to be removed for animation
            $tooltip.addClass('visible');
        }, 10);
    });

    $passwords.rebind('blur.initresetpw', function() {
        var $parent = $(this).parent();
        var $tooltip = $parent.find('.password-tooltip');
        $parent.removeClass('focused');
        $tooltip.removeClass('visible');
        setTimeout(function() { // Waiting for animation
            $tooltip.addClass('hidden');
        }, 200);
    });

    $confirms.rebind('focus.initresetpw', function() {
        $(this).parent().removeClass('incorrect').addClass('focused');
    });

    $confirms.rebind('blur.initresetpw', function() {
        $(this).parent().removeClass('focused');
    });

    $passwords.rebind('keyup.initresetpw', function() {
        checkInput($(this));
        reset_pwcheck();
    });

    // $('#withkey-password2').rebind('keyup.initresetpw', function(e) {
    $confirms.rebind('keyup.initresetpw', function(e) {
        checkInput($(this));
        if (e.keyCode === 13) {
            recovery_reset_pw();
        }
    });

    $('.password-status-icon').rebind('mouseover.initresetpw', function() {
        $('.password-status-warning').removeClass('hidden');
    });

    $('.password-status-icon').rebind('mouseout.initresetpw', function() {
        $('.password-status-warning').addClass('hidden');
    });
}
