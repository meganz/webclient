var emailchange = (function(){
    var ns = {};
    var $input;
    var context = null;
    
    function checkError(errcode) {
        if (typeof errcode != "number") {
            return false;
        }
    
        switch (errcode) {
        case 0:
            return false;
    
        case EEXIST:
            title   = l[135];
            msgbody = l[7718];
            break;
        case EEXPIRED:
        default:
            title   = l[135];
            msgbody = l[7719];
        }
        
        context = null; /* wipe variable */
        msgDialog('warninga', title, msgbody, false, function() {
            document.location.href = "#fm/account/profile";
        });
    
        return true;
    }
    
    function verifyEmailCallback(passAES) {
        var k1 = context.k1 || u_attr.k;
        var k2 = context.k2 || u_k;
        if (!checkMyPassword(passAES, k1, k2)) {
            $('.login-register-input.password').removeClass('loading').addClass('incorrect');
            return;
        }
    
        context.u_k = null;
        
        loadingDialog.show();
        var args = {
            a: 'sec',
            c: context.code,
            e: context.email,
            uh: stringhash(context.email, passAES),
            r:1,
            i: requesti
        };
        api_req(args, { 
            callback: function(res) {
                loadingDialog.hide();
                $('.fm-account-change-email.disabled')
                    .removeClass('disabled')
                    .find('span').text('Request email change')
                if (checkError(res)) {
                    return;
                }
    
                u_attr.email = context.code;
                $('#account-email').val(context.email);
                $('.profile-form.first').removeClass('email-confirm');
                title   = l[6859];
                msgbody = l[7701].replace("[X]",context.email);
                u_attr.email = context.email;
                context = null; /* wipe variable */
                msgDialog('warninga', title, msgbody, false, function() {
                    M.account = null; /* wipe M.account cache */
                    document.location.href = "#fm/account/profile";
                    Later(accountUI);
                    showToast('settings', l[7698]);
                });
            }
        });
    }
    
    ns.verifyEmailPassword = function(passAES, keys) {
        if (!$input) {
            $input = $('#verify-password');
        }
        passAES = passAES || new sjcl.cipher.aes(prepare_key_pw($input.val()));
        $('.login-register-input.password').addClass('loading').removeClass('incorrect');
        $input.val('');
        api_req({"a":"ersv", "c": context.code}, { callback: function(res) {
            if (checkError(res)) {
                return;
            }

            if (keys) {
                context.k1 = keys.k1;
                context.k2 = keys.k2;
            }
    
            context.email = res[1];
            verifyEmailCallback(passAES);
        }});
    }
    
    ns.main = function() {
        context = {code: page.substr(6)};
        if (!u_type) {
            return msgDialog('warninga', l[135], l[7720],  false, function() {
                document.location.href = "#login";
            });
        }
        $input = $('#verify-password');
        $input.rebind('focus',function(e)
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
    
        $input.rebind('blur',function(e)
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
                ns.verifyEmailPassword();
            }
        });    
        $('.restore-verify-button').rebind('click', function() {
                ns.verifyEmailPassword();
        });
    };

    return ns;
})();
