function init_recovery() {
    $('.login-register-input input').unbind('focus');
    $('.login-register-input input').bind('focus', function() {
        $(this).parent().addClass('focused');
    });
    $('.login-register-input input').unbind('blur');
    $('.login-register-input input').bind('blur', function() {
        $(this).parent().removeClass('focused');
    });

    $('.recover-button').unbind('click');
    $('.recover-button').bind('click', function() {
        if ($(this).attr('class').indexOf('active') === -1) {
            $('.recover-button').removeClass('active');
            $('.recover-block').addClass('hidden');
            $(this).addClass('active');
            if ($(this).attr('class').indexOf('yes') !== -1) {// Have master key
                $('.positive.recover-block').removeClass('hidden');
            } else {// Don't have master key
                $('.negative.recover-block').removeClass('hidden');
            }
        }
    });

    $('.backup-input-button').unbind('click');
    $('.backup-input-button').bind('click', function() {
        startRecovery();
    });

    $('#recover-input2,#recover-input1').unbind('keypress');
    $('#recover-input2,#recover-input1').bind('keypress', function(e) {
        if (e.keyCode === 13)
            startRecovery();
    });

    if (u_type === 0) {
        msgDialog('info', l[135], l[1944], false, function() {
            document.location.hash = 'start';
        });
    } else if (u_type) {
        msgDialog('warninga', l[135], l[1945].replace('[X]', u_attr.email), false, function() {
            document.location.hash = 'backup';
        });
    }
}

function startRecovery() {
    var t,
        email = '',
        c = $('.recover-button.no').attr('class');
    
    if (c && c.indexOf('active') > -1) {// Park account
        email = $('#recover-input2').val();
        t = 10;
    } else {// Recover account using backup master key 
        email = $('#recover-input1').val();
        t = 9;
    }
    
    if (checkMail(email)) {
        msgDialog('warninga', l[1100], l[1101]);
    } else {
        loadingDialog.show();
        api_req({a: 'erm', m: email, t: t}, {
            callback: function(res) {
                loadingDialog.hide();
                if (res == ENOENT) {
                    msgDialog('warningb', l[1513], l[1946]);
                } else if (res == '0') {
                    $('.fm-dialog.reset-success .reg-success-txt').text(l[735]);
                    $('.fm-dialog.reset-success .fm-dialog-button').unbind('click');
                    $('.fm-dialog.reset-success .fm-dialog-button').bind('click', function() {
                        $('.fm-dialog-overlay').addClass('hidden');
                        $('body').removeClass('overlayed');
                        $('.fm-dialog.reset-success').addClass('hidden');
                        delete $.dialog;
                    });
                    $('.fm-dialog-overlay').removeClass('hidden');
                    $('body').addClass('overlayed');
                    $('.fm-dialog.reset-success').removeClass('hidden');
                    $.dialog = 'resetsuccess';
                } else {
                    msgDialog('warningb', l[135], l[200]);
                }
            }
        });
    }
}
