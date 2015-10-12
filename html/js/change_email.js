var verifyEmail = null;

function verify_email_err(errcode) {
    if (typeof errcode != "number") {
        return false;
    }

    switch (errcode) {
    case 0:
        return false;

    case EEXIST:
        title   = "Error";
        errbody = "This email address has already been taken. Please contact MEGA support for more information.";
        break;
    case EEXPIRED:
    default:
        title   = "Error";
        msgbody = "Your confirmation link for this email has expired. Please click ok to restart the process.";
    }
    
    verifyEmail = null; /* wipe variable */
    msgDialog('warninga', title, msgbody, false, function() {
        document.location.href = "#fm/account/profile";
    });

    return true;
}

function verify_email_callback(passaes) {
    var k1 = verifyEmail.k1 || u_attr.k;
    var k2 = verifyEmail.k2 || u_k;
    if (decrypt_key(passaes, base64_to_a32(k1)).join(",")  !== (k2).join(",")) {
        $('.login-register-input.password').addClass('loading').removeClass('incorrect');
        return;
    }

    verifyEmail.u_k = null;
    
    loadingDialog.show();
    var args = {
        a: 'sec',
        c: verifyEmail.code,
        e: verifyEmail.email,
        uh: stringhash(verifyEmail.email, passaes),
        r:1,
        i: requesti
    };
    api_req(args, { 
        callback: function(res) {
            loadingDialog.hide();
            $('.fm-account-change-email.disabled')
                .removeClass('disabled')
                .find('span').text('Request email change')
            if (verify_email_err(res)) {
                return;
            }

            u_attr.email = verifyEmail.code;
            $('#account-email').val('').attr('placeholder', verifyEmail.email);
            title   = 'Congratulations';
            msgbody = 'Congratulations, your new email address for this mega account is ' + verifyEmail.email;
            verifyEmail = null; /* wipe variable */
            msgDialog('warninga', title, msgbody, false, function() {
                document.location.href = "#fm/account/profile";
            });
        }
    });
}

function verify_email_passwd(passaes) {
    passaes = passaes || new sjcl.cipher.aes(prepare_key_pw($('#verify-password').val()));
    $('.login-register-input.password').addClass('loading').removeClass('incorrect');
    $('#verify-password').val('');
    api_req({"a":"ersv", "c": verifyEmail.code}, { callback: function(res) {
        if (verify_email_err(res)) {
            return;
        }

        verifyEmail.email = res[1];
        verify_email_callback(passaes);
    }});
}

function verify_email() {
    verifyEmail = {code: page.substr(6)};
    if (!u_type) {
        return msgDialog('warninga', 'Information', "You need to be logged in to complete your email change. Please log in again with your current email address and then click on your confirmation link again.",  false, function() {
            document.location.href = "#login";
        });
    }
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
    $('.restore-verify-button').rebind('click', function() {
            verify_email_passwd();
    });
}
