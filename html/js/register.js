function doregister() {
    /* jshint -W074 */
    if ((document.getElementById('register_name').value === '')) {
        alert(l[212]);
        document.getElementById('register_name').focus();
    }
    else if ((document.getElementById('register_email').value === '')) {
        alert(l[197]);
        document.getElementById('register_email').focus();
    }
    else if (checkMail(document.getElementById('register_email').value)) {
        alert(l[198]);
        document.getElementById('register_email').focus();
    }
    else if ((document.getElementById('register_password').value === '')) {
        alert(l[213]);
        document.getElementById('register_email').focus();
    }
    else if (localStorage.signupcode
            && (document.getElementById('register_password').value
                !== document.getElementById('register_password_confirm').value)) {
        alert(l[715]);

        if (m) {
            document.getElementById('register_password').value = '';
            document.getElementById('register_password_confirm').value = '';
            document.getElementById('register_password').focus();
        }
    }
    else if (!document.getElementById('register_checkbox').checked) {
        alert(l[214]);
    }
    else {
        if (m) {
            loadingDialog.show();
        }
        else {
            document.getElementById('overlay').style.display = '';
        }

        if (localStorage.signupcode) {
            u_storage = init_storage(localStorage);
            var ctx = {
                checkloginresult: function(u_ctx, r) {
                    if (m) {
                        loadingDialog.hide();
                    }
                    else {
                        document.getElementById('overlay').style.display = 'none';
                    }
                    if ((typeof r[0] === 'number') && (r[0] < 0)) {
                        alert(l[200]);
                    }
                    else {
                        u_type = r;
                        loadSubPage('fm');
                    }
                }
            };
            var passwordaes = new sjcl.cipher.aes(prepare_key_pw(document.getElementById('register_password').value));
            var uh = stringhash(document.getElementById('register_email').value.toLowerCase(), passwordaes);
            u_checklogin(ctx,
                true,
                prepare_key_pw(document.getElementById('register_password').value),
                localStorage.signupcode, document.getElementById('register_name').value, uh);
        }
        else if (u_type === false) {
            u_storage = init_storage(localStorage);
            var u_ctx = {
                checkloginresult: function(u_ctx, r) {
                    u_type = r;
                    registeraccount();
                }
            };
            u_checklogin(u_ctx, true);
        }
        else {
            registeraccount();
        }
    }
}

function registeraccount() {
    var rv = {};
    var ctx = {
        callback: function(res) {
            if (res === 0) {
                var ops = {
                    a: 'up'
                };
                loadingDialog.hide();
                passwordManager($('#register_form'));

                if (m) {
                    done_text1 = l[216];
                    done_text2 = l[217];
                    page = 'done';
                    mobileui();

                    ops.name2 = $('#register_name').val();
                }
                else {
                    $('.fm-dialog.registration-page-success').unbind('click');
                    // $('.fm-dialog.registration-page-success').removeClass('hidden');
                    // fm_showoverlay();
                    // ^ legacy confirmation dialog, with no email change option
                    mega.ui.sendSignupLinkDialog(rv);

                    ops.terms = 'Mq';
                    ops.firstname = base64urlencode(to8(rv.first));
                    ops.lastname = base64urlencode(to8(rv.last));
                    ops.name2 = base64urlencode(to8(rv.name));
                    u_attr.terms = 1;

                    localStorage.awaitingConfirmationAccount = JSON.stringify(rv);
                }
                api_req(ops);
            }
            else if (res === EACCESS || res === EEXIST) {

                var passwordaes = new sjcl.cipher.aes(prepare_key_pw(rv.password));
                var uh = stringhash(rv.email.toLowerCase(), passwordaes);
                var ctx = {
                    checkloginresult: function(ctx, r) {
                        loadingDialog.hide();

                        if (!r) {
                            if (m) {
                                alert(l[219]);
                            }
                            else {
                                $('.login-register-input.email .top-loginp-tooltip-txt')
                                    .safeHTML('@@<div class="white-txt">@@</div>', l[1297], l[1298]);
                                $('.login-register-input.email').addClass('incorrect');
                                msgDialog('warninga', 'Error', l[7869]);
                            }
                        }
                        else if (r === EBLOCKED) {
                            alert(l[730]);
                        }
                        else {
                            passwordManager($('#register_form'));
                            showToast('megasync', l[8745]);
                            boot_auth(ctx, r);

                            if ($.ephNodes) {
                                // The user got logged-in when trying to register, let's migrate the ephemeral account
                                var msg = l[16517].replace('%1', rv.email);

                                msgDialog('info', l[761], msg, null, function() {
                                    $.onImportCopyNodes = $.ephNodes;
                                    M.copyNodes(['meh'], u_handle, false, function(e) {
                                        if (!Array.isArray(e)) {
                                            console.error(e);
                                            debugger
                                        }
                                        location.reload();
                                    });
                                });
                            }
                        }
                    }
                };
                u_login(ctx, rv.email, rv.password, uh, true);
            }
            else {
                loadingDialog.hide();
                msgDialog('warninga', 'Error', l[200], res);
            }
        }
    };
    if (m) {
        rv.name = $('#register_name').val();
        rv.email = $('#register_email').val();
        rv.password = $('#register_password').val();
    }
    else {
        rv.password = $('#register-password').val();
        rv.first = $('#register-firstname').val();
        rv.last = $('#register-lastname').val();
        rv.email = $('#register-email').val();
        rv.name = rv.first + ' ' + rv.last;
    }

    var signup = sendsignuplink.bind(null, rv.name, rv.email, rv.password, ctx);

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

function pageregister() {
    /* jshint -W074 */
    if (u_type > 0) {
        msgDialog('warninga', l[135], l[5843]);
        return false;
    }

    var err = false;

    if ($('#register-firstname').val() === ''
            || $('#register-lastname').val() === '') {
        $('.login-register-input.name').addClass('incorrect');
        err = 1;
    }
    if ($('#register-email').val() === ''
            || checkMail($('#register-email').val())) {
        $('.login-register-input.email').addClass('incorrect');
        err = 1;
    }

    if ($('#register-email').val() === ''
            || checkMail($('#register-email').val())) {
        $('.login-register-input.email').addClass('incorrect');
        err = 1;
    }

    if ($('#register-password').val() === '') {
        $('.login-register-input.password.first').addClass('incorrect');
        $('.white-txt.password').text(l[213]);
        err = 1;
    }
    else if (typeof zxcvbn !== 'undefined') {
        var pw = zxcvbn($('#register-password').val());
        if (pw.score === 0 || pw.entropy < 16) {
            $('.login-register-input.password.first').addClass('incorrect');
            $('.white-txt.password').text(l[1104]);
            err = 1;
        }
    }

    if ($('#register-password').val() !== $('#register-password2').val()) {
        $('#register-password').val('');
        $('#register-password2').val('');
        $('.login-register-input.password.confirm').addClass('incorrect');
        err = 1;
    }

    if (!err && typeof zxcvbn === 'undefined') {
        msgDialog('warninga', l[135], l[1115] + '<br>' + l[1116]);
        return false;
    }
    else if (!err) {
        if ($('.register-check').attr('class').indexOf('checkboxOff') > -1) {
            msgDialog('warninga', l[1117], l[1118]);
        }
        else {
            if (localStorage.signupcode || localStorage.businessSubAc) {
                loadingDialog.show();
                u_storage = init_storage(localStorage);
                var signupcode = localStorage.signupcode;
                if (localStorage.businessSubAc) {
                    window.businessSubAc = JSON.parse(localStorage.businessSubAc);
                    signupcode = window.businessSubAc.signupcode;
                }
                var ctx = {
                    checkloginresult: function(u_ctx, r) {
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
                delete localStorage.signupcode;
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
        $('#register-email').val(localStorage.registeremail);
        if (localStorage.signupcode) {
            $('#register-email').attr('readonly', true);
        }
    }

    $('#register-firstname').rebind('focus', function(e) {
        $('.login-register-input.name').removeClass('incorrect');
        $('.login-register-input.name').addClass('focused');
    });
    $('#register-firstname').rebind('blur', function(e) {
        $('.login-register-input.name').removeClass('focused');
    });
    $('#register-lastname').rebind('focus', function(e) {
        $('.login-register-input.name').removeClass('incorrect');
        $('.login-register-input.name').addClass('focused');
    });
    $('#register-lastname').rebind('blur', function(e) {
        $('.login-register-input.name').removeClass('focused');
    });
    $('#register-email').rebind('focus', function(e) {
        $('.login-register-input.email .top-loginp-tooltip-txt')
            .safeHTML('@@<div class="white-txt">@@</div>', l[1100], l[1101]);
        $('.login-register-input.email').removeClass('incorrect');
        $('.login-register-input.email').addClass('focused');
    });
    $('#register-email').rebind('blur', function(e) {
        $('.login-register-input.email').removeClass('focused');
    });
    $('#register-password').rebind('focus', function(e) {
        $('.login-register-input.password.first').removeClass('incorrect');
        $('.login-register-input.password.confirm').removeClass('incorrect');
        $(this).parents('.password').addClass('focused');
    });
    $('#register-password').rebind('blur', function(e) {
        $('.login-register-input.password').removeClass('focused');
        registerpwcheck();
    });
    $('#register-password2').rebind('focus', function(e) {
        $('.login-register-input.password.confirm').removeClass('incorrect');
        $(this).parents('.password').addClass('focused');
    });
    $('#register-password2').rebind('blur', function(e) {
        $(this).parents('.password').removeClass('focused');
    });
    $('.new-registration-checkbox .radio-txt,.register-check').rebind('click.uiCheckboxes', function(e) {
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
    $('#register-password').rebind('keyup', function(e) {
        registerpwcheck();
    });
    $('.password-status-icon').rebind('mouseover', function(e) {
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
            $('#register-firstname').focus();
        }
        else if (c && c.indexOf('register-family-input-block') > -1) {
            $('#register-lastname').focus();
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
        $('#register-email').val(userInfo.e);
        // $('#register-email').attr('readonly', true);
        $('#register-lastname').val(a32_to_str(base64_to_a32(userInfo.lastname)));
        // $('#register-lastname').attr('readonly', true);
        $('#register-firstname').val(a32_to_str(base64_to_a32(userInfo.firstname)));
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
    if (typeof zxcvbn === 'undefined'
            || $('#register-password').val() === '') {
        return false;
    }
    var pw = zxcvbn($('#register-password').val());
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


function register_signup(email) {
    document.getElementById('register_email').value = email;
    document.getElementById('register_email').readOnly = true;
    document.getElementById('register_password_confirm_div').style.display = '';
}
