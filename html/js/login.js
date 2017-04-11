var login_txt = false;
var login_email = false;

function dologin() {
    /* jshint -W074 */
    if ((document.getElementById('login_email').value === '')) {
        alert(l[197]);
    }
    else if (checkMail(document.getElementById('login_email').value)) {
        alert(l[198]);
    }
    else if (document.getElementById('login_password').value === '') {
        alert(l[199]);
    }
    else {
        if (m) {
            loadingDialog.show();
        }
        else {
            document.getElementById('overlay').style.display = '';
        }

        if (confirmok) {
            if (u_signupenck) {
                if (checksignuppw(document.getElementById('login_password').value)) {
                    var ctx = {
                        callback: function(res, ctx) {
                            if (m) {
                                loadingDialog.hide();
                            }
                            else {
                                document.getElementById('overlay').style.display = 'none';
                            }

                            if (res[0] === EACCESS) {
                                alert(l[732]);
                            }
                            else if (typeof res[0] === 'string') {
                                if (u_type) {
                                    if (login_next) {
                                        loadSubPage(login_next);
                                    }
                                    else if (page !== 'login') {
                                        init_page();
                                    }
                                    else {
                                        loadSubPage('fm');
                                    }
                                    login_next = false;
                                    document.title = 'MEGA';
                                }
                                else {
                                    postlogin();
                                }
                            }
                            else {
                                alert(l[200]);
                            }
                        }
                    };
                    if (d) {
                        console.log('u_handle', u_handle);
                    }
                    var keypw = prepare_key_pw(document.getElementById('login_password').value);
                    var passwordaes = new sjcl.cipher.aes(keypw);
                    api_updateuser(ctx, {
                        uh: stringhash(document.getElementById('login_email').value.toLowerCase(), passwordaes),
                        c: confirmcode
                    });
                }
                else {
                    alert(l[201]);
                    if (m) {
                        loadingDialog.hide();
                    }
                    else {
                        document.getElementById('overlay').style.display = 'none';
                    }
                    document.getElementById('login_password').value = '';
                }
            }
        }
        else {
            postlogin();
        }
    }
}

function doConfirm(email, password, callback) {
    if (u_signupenck) {
        if (checksignuppw(password)) {
            if (d) {
                console.log('u_handle', u_handle);
            }
            var passwordaes = new sjcl.cipher.aes(prepare_key_pw(password));
            api_updateuser({
                callback2: callback,
                callback: function(res, ctx) {
                    loadingDialog.hide();
                    if (res[0] === EACCESS) {
                        if (m) {
                            alert(l[732]);
                        }
                        else {
                            msgDialog('warninga', l[135], l[732]);
                        }
                    }
                    else if (typeof res[0] === 'string') {
                        confirmok = false;
                        if (ctx.callback2) {
                            ctx.callback2();
                        }
                    }
                    else if ((typeof res === 'number') && (res === -11)) {
                        if (u_type === 0) {// Ephemeral session
                            msgDialog("warninga", l[2480], l[12439]);
                        }
                        else {
                            msgDialog("warninga", l[2480], l[12440]);
                        }
                    }
                    else {
                        alert(l[200]);
                    }
                }
            }, {
                uh: stringhash(email.toLowerCase(), passwordaes),
                c: confirmcode
            });
        }
        else {
            loadingDialog.hide();
            if (m) {
                loadingDialog.hide();
                alert(l[201]);
            }
            else {
                $('#login-password2').val('');
                $('.login-register-input.password').addClass('incorrect');
                msgDialog('warninga', l[135], l[201]);
            }
        }
    }
}

function postLogin(email, password, remember, callback) {
    var ctx = {
        callback2: callback,
        checkloginresult: function(ctx, r) {
            if (ctx.callback2) {
                ctx.callback2(r);
            }
        }
    };
    var passwordaes = new sjcl.cipher.aes(prepare_key_pw(password));
    var uh = stringhash(email.toLowerCase(), passwordaes);
    u_login(ctx, email, password, uh, remember);
}

function pagelogin() {
    var e = $('#login-name2').val();
    if (e === '' || checkMail(e)) {
        $('.login-register-input.email').addClass('incorrect');
        $('#login-name2').focus();
    }
    else if ($('#login-password2').val() === '') {
        $('.login-register-input.password').addClass('incorrect');
        $('#login-password2').focus();
    }
    else {
        loadingDialog.show();
        $('.top-dialog-login-button').addClass('loading');
        if ($('.loginwarning-checkbox').hasClass('checkboxOn')) {
            localStorage.hideloginwarning = 1;
        }
        var remember;
        // XXX: Set remember on by default if confirming a freshly created account
        if (confirmok || $('.login-check').hasClass('checkboxOn')) {
            remember = 1;
        }

        if (confirmok) {
            doConfirm($('#login-name2').val(), $('#login-password2').val(), function() {
                loadingDialog.show();
                postLogin($('#login-name2').val(), $('#login-password2').val(), remember, function(r) {
                    loadingDialog.hide();
                    if (r === EBLOCKED) {
                        alert(l[730]);
                    }
                    else if (r) {
                        u_type = r;
                        loadSubPage('key');
                    }
                });
            });
        }
        else {
            postLogin($('#login-name2').val(), $('#login-password2').val(), remember, function(r) {
                loadingDialog.hide();

                if (r === EBLOCKED) {
                    alert(l[730]);
                }
                else if (r) {
                    u_type = r;
                    passwordManager('#login_form');
                    if (login_next) {
                        loadSubPage(login_next);
                    }
                    else if (page !== 'login') {
                        init_page();
                    }
                    else {
                        loadSubPage('fm');
                    }
                    login_next = false;
                }
                else {
                    $('.login-register-input.password').addClass('incorrect');
                    $('.login-register-input.email').addClass('incorrect');

                    // Check that there is not already a message dialog being shown, otherwise
                    // this generic one will override the other's more specific error message
                    if ($('#msgDialog').hasClass('hidden')) {
                        msgDialog('warninga', l[135], l[7431], false, function(e) {
                            $('#login-password2').val('');
                            $('#login-name2').select();
                        });
                    }
                }
            });
        }
    }
}

function init_login() {
    if (login_email) {
        $('#login-name2').val(login_email);
    }

    if (confirmok) {
        $('.register-st2-txt-block').addClass('hidden');
        $('.login-page-create-new').addClass('hidden');
        $('.top-login-forgot-pass').addClass('hidden');
        $('.main-top-info-block').removeClass('hidden');
        $('.register-st2-button-arrow').text(l[1131]);
        $('.main-italic-header.login').text(l[1131]);
        $('.main-top-info-text').text(l[378]);
        $('.login-check').addClass('hidden').next().addClass('hidden');
    }
    else {
        $('.register-st2-button').addClass('active');
        if (login_txt) {
            $('.main-top-info-block').removeClass('hidden');
            $('.main-top-info-text').text(login_txt);
            login_txt = false;
        }
    }

    $('#login-name2,#login-password2').rebind('focus', function(e) {
        $(this).parents('.login-register-input').addClass('focused');
    });
    $('#login-name2,#login-password2').rebind('blur', function(e) {
        $(this).parents('.login-register-input').removeClass('focused');
    });

    $('#login-password2, #login-name2').rebind('keydown', function(e) {
        if ($('#login-name2').val() !== '' && $('#login-password2').val() !== '') {
            $('.register-st2-button').addClass('active');
        }
        $('.login-register-input.password').removeClass('incorrect');
        $('.login-register-input.email').removeClass('incorrect');
        if (e.keyCode === 13) {
            pagelogin();
        }
    });

    $('.register-st2-button').rebind('click', function(e) {
        pagelogin();
    });

    $('.login .radio-txt,.login-check').rebind('click', function(e) {
        if ($('.login-check').hasClass('checkboxOn')) {
            $('.login-check').addClass('checkboxOff');
            $('.login-check').removeClass('checkboxOn');
        }
        else {
            $('.login-check').addClass('checkboxOn');
            $('.login-check').removeClass('checkboxOff');
        }
    });

    $('.top-login-forgot-pass').rebind('click', function(e) {
        loadSubPage('recovery');
    });

    $('.login-page-create-new span').rebind('click', function(e) {
        loadSubPage('register');
    });

    $('.login-register-input').rebind('click', function(e) {
        $(this).find('input').focus();
    });
    document.getElementById('login-name2').focus();

    if (is_chrome_firefox) {
        Soon(mozLoginManager.fillForm.bind(mozLoginManager, 'login_form'));
    }
}

function postlogin() {
    if (m) {
        loadingDialog.show();
    }
    var ctx = {
        checkloginresult: function(ctx, r) {
            if (m) {
                loadingDialog.hide();
            }
            else {
                document.getElementById('overlay').style.display = 'none';
            }

            if (r === EBLOCKED) {
                alert(l[730]);
            }
            else if (r) {
                document.getElementById('login_password').value = '';
                document.getElementById('login_email').value = '';
                u_type = r;
                if (page === 'login') {
                    if (getSitePath().substr(0,3) == '/fm') {
                        page = 'fm';
                        init_page();
                    }
                    else {
                        if (login_next) {
                            loadSubPage(login_next);
                        }
                        else if (page !== 'login') {
                            init_page();
                        }
                        else {
                            loadSubPage('fm');
                        }
                        login_next = false;
                        document.title = 'MEGA';
                    }
                }
                else {
                    init_page();
                }
                if (d) {
                    console.log('logged in');
                }
            }
            else {
                document.getElementById('login_password').value = '';
                alert(l[201]);
            }
        }
    };
    var passwordaes = new sjcl.cipher.aes(prepare_key_pw(document.getElementById('login_password').value));
    var uh = stringhash(document.getElementById('login_email').value.toLowerCase(), passwordaes);
    u_login(ctx,
        document.getElementById('login_email').value,
        document.getElementById('login_password').value, uh,
        document.getElementById('login_remember').checked);
}
