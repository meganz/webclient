var recoverycode;
var recoveryemail;
var recoverykey;

function init_reset() {
    if (u_type) {
        msgDialog('warningb', l[135], l[1971], false, function(e) {
            loadSubPage('help/account');
        });
        return false;
    }
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
                    $('.withkey #key-input2').rebind('focus', function() {
                        $(this).val('');
                    });
                    $('.withkey #key-input2').rebind('blur', function() {
                        if ($(this).val() === '') {
                            $(this).val(l[1970]);
                        }
                    });

                    $('.withkey .backup-input-button').rebind('click', function() {
                        verify_key($('#key-input2').val());
                    });

                    $('#key-input2').rebind('keypress', function(e) {
                        if (e.keyCode === 13) {
                            verify_key($('#key-input2').val());
                        }
                    });

                    $('#key-upload-field').rebind('change', function(e) {
                        $('.recover-block.error,.recover-block.success').addClass('hidden');
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

        mega.utils.require('zxcvbn_js')
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
        if ($(this).hasClass('reset-account')) {
            delete_reset_pw();
        }
        else {
            recovery_reset_pw();
        }
    });
    init_reset_pw();

    $('.new-registration-checkbox').rebind('click', function(e) {
        if ($(this).hasClass('checkboxOn')) {
            $('.register-check').removeClass('checkboxOn').addClass('checkboxOff');
        }
        else {
            $('.register-check').addClass('checkboxOn').removeClass('checkboxOff');
        }
    });

    $('.login-register-input').rebind('click', function(e) {
        $(this).closest('input').focus();
    });
}

function delete_reset_pw() {
    var c = $('.register-check').attr('class');
    if ($('#withoutkey-password').val() === l[909]) {
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
    else if ($(this).hasClass('checkboxOff')) {
        msgDialog('warninga', l[135], l[1974]);
        return;
    }
    loadingDialog.show();
    api_resetuser({
        callback: function(code) {
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
        }
    }, recoverycode, recoveryemail, $('#withoutkey-password').val());


}

function recovery_reset_pw() {
    if ($('#withkey-password').val() === l[909]) {
        msgDialog('warninga', l[135], l[741]);
        return;
    }
    else if ($('#withkey-password').val() !== $('#withkey-password2').val()) {
        msgDialog('warninga', l[135], l[715]);
        return;
    }
    else if ($('.login-register-input.password').hasClass('weak-password')) {
        msgDialog('warninga', l[135], l[1129]);
        return;
    }
    loadingDialog.show();
    api_resetkeykey({
        result: function(code) {
            loadingDialog.hide();
            if (code === 0) {
                msgDialog('info', l[1955], l[1981], '', function() {
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
                    loadSubPage('login');
                });
            }
        }
    }, recoverycode, base64_to_a32(recoverykey), recoveryemail, $('#withkey-password').val());
}


function verify_key(key) {
    $('#key-upload-field').val('');
    $('.recover-block.error,.recover-block.success').addClass('hidden');
    recoverykey = key;
    loadingDialog.show();
    api_resetkeykey({
        result: function(code) {
            if (code === 0) {
                $('.recover-block.success').removeClass('hidden');
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
                    loadSubPage('login');
                });
            }
            loadingDialog.hide();
        }
    }, recoverycode, base64_to_a32(key));

    /*
    result(x) can be called with
    x === 0 - all good
    x === EKEY - invalid master key
    x === ENOENT - invalid or already used code_from_email
    x === EEXPIRED - valid, but expired code_from_email
    */
}



function reset_pwcheck() {
    Soon(mainScroll);
    $('.login-register-input.password').removeClass('weak-password strong-password');
    $('.new-registration').removeClass('good1 good2 good3 good4 good5');


    if (typeof zxcvbn === 'undefined') {
        return false;
    }
    var pw;
    if ($('#withkey-password').attr('type') !== 'text'
            && $('#withkey-password').val() !== '') {
        pw = zxcvbn($('#withkey-password').val());
    }
    else if ($('#withoutkey-password').attr('type') !== 'text'
            && $('#withoutkey-password').val() !== '') {
        pw = zxcvbn($('#withoutkey-password').val());
    }
    else {
        return false;
    }

    if (pw.score > 3 && pw.entropy > 75) {
        $('.login-register-input.password').addClass('strong-password');
        $('.new-registration').addClass('good5');
        $('.new-reg-status-pad').safeHTML('<strong>@@</strong> @@', l[1105], l[1128]);
        $('.new-reg-status-description').text(l[1123]);
    }
    else if (pw.score > 2 && pw.entropy > 50) {
        $('.login-register-input.password').addClass('strong-password');
        $('.new-registration').addClass('good4');
        $('.new-reg-status-pad').safeHTML('<strong>@@</strong> @@', l[1105], l[1127]);
        $('.new-reg-status-description').text(l[1122]);
    }
    else if (pw.score > 1 && pw.entropy > 40) {
        $('.login-register-input.password').addClass('strong-password');
        $('.new-registration').addClass('good3');
        $('.new-reg-status-pad').safeHTML('<strong>@@</strong> @@', l[1105], l[1126]);
        $('.new-reg-status-description').text(l[1121]);
    }
    else if (pw.score > 0 && pw.entropy > 15) {
        $('.new-registration').addClass('good2');
        $('.new-reg-status-pad').safeHTML('<strong>@@</strong> @@', l[1105], l[1125]);
        $('.new-reg-status-description').text(l[1120]);
    }
    else {
        $('.login-register-input.password').addClass('weak-password');
        $('.new-registration').addClass('good1');
        $('.new-reg-status-pad').safeHTML('<strong>@@</strong> @@', l[1105], l[1124]);
        $('.new-reg-status-description').text(l[1119]);
    }
    $('.password-status-warning')
        .safeHTML('<span class="password-warning-txt">@@</span> ' +
            '@@<div class="password-tooltip-arrow"></div>', l[34], l[1129]);
    $('.password-status-warning').css('margin-left', ($('.password-status-warning').width() / 2 * -1) - 13);
}


function init_reset_pw() {
    var a = '';

    Soon(mainScroll);
    $('#withkey-password,#withoutkey-password').rebind('focus', function(e) {
        $('.login-register-input.password.first').removeClass('incorrect');
        $('.login-register-input.password.confirm').removeClass('incorrect');
        $('.login-register-input.password').addClass('focused');
        if ($(this).val() === l[909]) {
            $(this).val('');
            $(this)[0].type = 'password';
        }
    });
    $('#withkey-password,#withoutkey-password').rebind('blur', function(e) {
        $('.login-register-input.password').removeClass('focused');
        if ($(this).val() === '') {
            $(this).val(l[909]);
            $(this)[0].type = 'text';
        }
        reset_pwcheck();
    });
    $('#withkey-password2,#withoutkey-password2').rebind('focus', function(e) {
        $('.login-register-input.password.confirm').removeClass('incorrect');
        $('.login-register-input.password2').addClass('focused');
        if ($(this).val() === l[1114]) {
            $(this).val('');
            $(this)[0].type = 'password';
        }
    });
    $('#withkey-password2,#withoutkey-password2').rebind('blur', function(e) {
        $('.login-register-input.password2').removeClass('focused');
        if ($(this).val() === '') {
            $(this).val(l[1114]);
            $(this)[0].type = 'text';
        }
    });

    $('#withkey-password,#withoutkey-password').rebind('keyup', function(e) {
        reset_pwcheck();
    });

    $('#withkey-password2').rebind('keyup', function(e) {
        if (e.keyCode === 13) {
            recovery_reset_pw();
        }
    });

    $('.password-status-icon').rebind('mouseover', function(e) {
        $('.password-status-warning').removeClass('hidden');

    });
    $('.password-status-icon').rebind('mouseout', function(e) {
        $('.password-status-warning').addClass('hidden');
    });
}
