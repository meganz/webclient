function verify_email_passwd() {
    var password = $('#verify-password').val();
    var passwordaes = new sjcl.cipher.aes(prepare_key_pw(password));
    var email = u_attr.email.toLowerCase();
    var uh = stringhash(email, passwordaes);
    $('.login-register-input.password').addClass('loading').removeClass('incorrect');
    $('#verify-password').val('');
    api_req({
        a: 'us',
        user: email,
        uh: uh
    }, {
        callback: function(res) {
            $('.login-register-input.password').removeClass('loading');
            if (typeof res === "number") {
                $('.login-register-input.password').addClass('incorrect').focus();
                return;
            }
            loadingDialog.show();
            var newEmail = localStorage.new_email;
            var args = {
                a: 'sec',
                c: page.substr(6),
                e: newEmail,
                uh: stringhash(newEmail, passwordaes),
                r:1,
                i: requesti
            };
            api_req(args, { 
                callback: function(res) {
                    loadingDialog.hide();
                    $('.fm-account-change-email.disabled')
                        .removeClass('disabled')
                        .find('span').text('Request email change')
                    if (res === 0) {
                        u_attr.email = newEmail;
                        $('#account-email').val('').attr('placeholder', newEmail);
                        msgDialog('warninga', 'Congratulations', 'Congratulations, your new email address for this mega account is ' + newEmail, false, function() {
                            document.location.href = "#fm/account/profile";
                        });
                    } else { 
                        msgDialog('warninga', 'Error', 'The verification code expired, please send another one', false, function() {
                            document.location.href = "#fm/account/profile";
                        });
                    }
                }
            });
        }
    });
}

function verify_email() {
    $('#verify-password').rebind('focus',function(e)
    {
        $('.login-register-input.password.first').removeClass('incorrect');
        $('.login-register-input.password.confirm').removeClass('incorrect');
        $('.login-register-input.password').addClass('focused');
        if ($(this).val() == l[909])
        {
            $(this).val('');
            $(this)[0].type = 'password';
        }
    });

    $('#verify-password').rebind('blur',function(e)
    {
        $('.login-register-input.password').removeClass('focused');
        if ($(this).val() == '')
        {
            $(this).val(l[909]);
            $(this)[0].type = 'text';
        }
    });        

    $('#verify-password').rebind('keyup',function(e) {
        if (e.keyCode == 13) {
            verify_email_passwd();
        }
    });    
    $('.restore-verify-button').rebind('click', verify_email_passwd);
}
