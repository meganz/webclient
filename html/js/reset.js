var recoverycode;
var recoveryemail;
var recoverykey;

function init_reset() {
    $.tresizer();
    loadingDialog.show();
    recoverycode = page.replace('recover', '');
    api_req({
        a: 'erv',
        c: recoverycode,
        v: 2
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
                    if (u_type || u_type === 0) {

                        msgDialog("warninga", '', l[22817], '', function() {
                            loadSubPage('fm');
                        });

                        return;
                    }

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

                    if (u_type || u_type === 0) {

                        msgDialog("warninga", '', l[22818], '', function() {
                            loadSubPage('fm');
                        });

                        return;
                    }

                    recoveryemail = res[1];
                    var $wKey = $('.main-mid-pad.backup-recover.withoutkey').removeClass('hidden');
                    $('.backup-notification-block').removeClass('hidden');
                    if (res[6] && res[6].b) {
                        $wKey.find('.step-main-question').text(l[23050]);
                        $wKey.find('#step-p1').text(l[23051]);
                        $wKey.find('#step-p2').safeHTML(l[23052]);
                        $wKey.find('#lbl-reset-confirm-txt').text(l[23053]);
                    }
                    else {
                        $wKey.find('.step-main-question').text(l[19841]);
                        $wKey.find('#step-p1').text(l[19842]);
                        $wKey.find('#step-p2').safeHTML(l[19843]);
                        $wKey.find('#lbl-reset-confirm-txt').text(l[1950]);
                    }
                }
            }
        }
    });

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

    var password = $('#withoutkey-password').val();
    var confirmPassword = $('#withoutkey-password2').val();
    var passwordValidationResult = security.isValidPassword(password, confirmPassword);

    // If bad result
    if (passwordValidationResult !== true) {
        msgDialog('warninga', l[135], passwordValidationResult, '', function() {
            // Clear the park account form after warning passwords aren't matching
            $('#withoutkey-password').data('MegaInputs').setValue('');
            $('#withoutkey-password2').data('MegaInputs').setValue('');
            $('.new-registration-checkbox .register-check').removeClass('checkboxOn').addClass('checkboxOff');
            init_reset_pw();
        });
        return false;
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

    var password = $('#withkey-password').val();
    var confirmPassword = $('#withkey-password2').val();
    var passwordValidationResult = security.isValidPassword(password, confirmPassword);

    // If bad result
    if (passwordValidationResult !== true) {
        msgDialog('warninga', l[135], passwordValidationResult);
        return false;
    }

    loadingDialog.show();

    // Perform the Master Key re-encryption with a new password
    security.resetKey(recoverycode, base64_to_a32(recoverykey), recoveryemail, password, function(responseCode) {

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

function init_reset_pw() {

    'use strict';

    var $passwords = $('#withkey-password, #withoutkey-password');
    var $confirms = $('#withkey-password2, #withoutkey-password2');

    var passwordsMegaInput = new mega.ui.MegaInputs($passwords);
    var confirmsMegaInput = new mega.ui.MegaInputs($confirms);


    var _checkInput = function($input) {

        var $contentWrapper = $input.parents('.content-wrapper');
        var $firstInput = $contentWrapper.find('input.first');
        var $confirmInput = $contentWrapper.find('input.confirm');
        var $button = $contentWrapper.find('.restore-verify-button');

        if ($firstInput.val() && $confirmInput.val() && $firstInput.val().length >= security.minPasswordLength
            && $firstInput.val().length === $confirmInput.val().length) {

            $button.addClass('active').removeClass('disabled');

            return true;
        }
        else {
            $button.removeClass('active').addClass('disabled');

            return false;
        }
    };

    $passwords.add($confirms).rebind('keyup.initresetpw, input.initresetpw', function(e) {
        var valid = _checkInput($(this));
        if (e.keyCode === 13 && valid) {
            var $button = $('.restore-verify-button', $(this).parents('.content-wrapper'));
            if ($button.hasClass('reset-account')) {
                delete_reset_pw();
            }
            else {
                recovery_reset_pw();
            }
        }
    });

    $('.password-status-icon').rebind('mouseover.initresetpw', function() {
        $('.password-status-warning').removeClass('hidden');
    });

    $('.password-status-icon').rebind('mouseout.initresetpw', function() {
        $('.password-status-warning').addClass('hidden');
    });
}
