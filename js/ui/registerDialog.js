(function(scope) {
    var options = {};

    /*jshint -W074*/
    // ^ zxcvbn stuff..

    function doProRegister($dialog) {
        if (options.onCreatingAccount) {
            options.onCreatingAccount($dialog);
        }
        loadingDialog.show();

        if (u_type > 0) {
            msgDialog('warninga', l[135], l[5843]);
            loadingDialog.hide();
            return false;
        }

        var registeraccount = function() {
            var rv = {};
            var done = function(login) {
                loadingDialog.hide();
                $('.pro-register-dialog').addClass('hidden');
                $('.fm-dialog.registration-page-success').unbind('click');

                if (login) {
                    Soon(function() {
                        showToast('megasync', l[8745]);
                        $('.fm-avatar img').attr('src', useravatar.mine());
                    });
                }
                Soon(topmenuUI);

                if (options.onAccountCreated) {
                    options.onAccountCreated(login, rv);
                }
                else {
                    // $('.fm-dialog.registration-page-success').removeClass('hidden');
                    // fm_showoverlay();
                    // ^ legacy confirmation dialog, with no email change option
                    sendSignupLinkDialog(rv);
                }
            };

            var ctx = {
                callback: function(res) {
                    if (res === 0) {
                        var ops = {
                            a: 'up'
                        };

                        ops.terms = 'Mq';
                        ops.firstname = base64urlencode(to8(rv.first));
                        ops.lastname = base64urlencode(to8(rv.last));
                        ops.name2 = base64urlencode(to8(rv.name));
                        u_attr.terms = 1;

                        api_req(ops);
                        done();
                    }
                    else if (res === EACCESS || res === EEXIST) {

                        var passwordaes = new sjcl.cipher.aes(prepare_key_pw(rv.password));
                        var uh = stringhash(rv.email.toLowerCase(), passwordaes);
                        var ctx = {
                            checkloginresult: function(ctx, r) {
                                loadingDialog.hide();

                                if (!r) {
                                    $('.login-register-input.email', $dialog).addClass('incorrect');
                                    $('.login-register-input.email .top-loginp-tooltip-txt', $dialog)
                                        .safeHTML('@@<div class="white-txt">@@</div>', l[1297], l[1298]);

                                    if (options.onLoginAttemptFailed) {
                                        options.onLoginAttemptFailed(rv);
                                    }
                                    else {
                                        msgDialog('warninga', l[1578], l[218]);
                                    }
                                }
                                else if (r === EBLOCKED) {
                                    alert(l[730]);
                                }
                                else {
                                    u_type = r;
                                    u_checked = true;
                                    done(true);
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


            rv.password = $('#register-password', $dialog).val();
            rv.first = $('#register-firstname', $dialog).val();
            rv.last = $('#register-lastname', $dialog).val();
            rv.email = $('#register-email', $dialog).val();
            rv.name = rv.first + ' ' + rv.last;

            sendsignuplink(rv.name, rv.email, rv.password, ctx, true);
        };


        var err = false;

        if ($('#register-firstname', $dialog).val() === ''
                || $('#register-firstname', $dialog).val() === l[1096]
                || $('#register-lastname', $dialog).val() === ''
                || $('#register-lastname', $dialog).val() === l[1097]) {

            $('.login-register-input.name', $dialog).addClass('incorrect');
            err = 1;
        }
        if ($('#register-email', $dialog).val() === ''
                || $('#register-email', $dialog).val() === l[1096]
                || checkMail($('#register-email', $dialog).val())) {

            $('.login-register-input.email', $dialog).addClass('incorrect');
            err = 1;
        }

        if ($('#register-email', $dialog).val() === ''
                || $('#register-email', $dialog).val() === l[1096]
                || checkMail($('#register-email', $dialog).val())) {

            $('.login-register-input.email', $dialog).addClass('incorrect');
            err = 1;
        }

        var pw = {};
        if (typeof zxcvbn !== 'undefined') {
            pw = zxcvbn($('#register-password', $dialog).val());
        }
        if ($('#register-password', $dialog).attr('type') === 'text') {
            $('.login-register-input.password.first', $dialog).addClass('incorrect');
            $('.white-txt.password', $dialog).text(l[213]);
            err = 1;
        }
        else if (pw.score === 0 || pw.entropy < 16) {
            $('.login-register-input.password.first', $dialog).addClass('incorrect');
            $('.white-txt.password', $dialog).text(l[1104]);
            err = 1;
        }

        if ($('#register-password', $dialog).val() !== $('#register-password2', $dialog).val()) {
            $('#register-password', $dialog)[0].type = 'password';
            $('#register-password2', $dialog)[0].type = 'password';
            $('#register-password', $dialog).val('');
            $('#register-password2', $dialog).val('');
            $('.login-register-input.password.confirm', $dialog).addClass('incorrect');
            err = 1;
        }

        if (!err && typeof zxcvbn === 'undefined') {
            msgDialog('warninga', l[135], l[1115] + '<br>' + l[1116]);
            loadingDialog.hide();
            return false;
        }
        else if (!err) {
            if ($('.register-check', $dialog).hasClass('checkboxOff')) {
                msgDialog('warninga', l[1117], l[1118]);
                loadingDialog.hide();
            }
            else {
                if (localStorage.signupcode) {
                    loadingDialog.show();
                    u_storage = init_storage(localStorage);
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
                        }
                    };
                    var passwordaes = new sjcl.cipher.aes(prepare_key_pw($('#register-password', $dialog).val()));
                    var uh = stringhash($('#register-email', $dialog).val().toLowerCase(), passwordaes);
                    u_checklogin(ctx,
                        true,
                        prepare_key_pw($('#register-password', $dialog).val()),
                        localStorage.signupcode,
                        $('#register-firstname', $dialog).val() + ' ' + $('#register-lastname', $dialog).val(), uh);
                    delete localStorage.signupcode;
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
        if (err) {
            loadingDialog.hide();
        }
    }


    function showRegisterDialog(opts) {
        $.dialog = 'pro-register-dialog';

        var $dialog = $('.pro-register-dialog');
        $dialog
            .removeClass('hidden')
            .addClass('active');

        $('.pro-register-scroll').removeAttr('style');
        deleteScrollPanel('.pro-register-scroll', 'jsp');

        fm_showoverlay();

        options = Object(opts);

        $('.fm-dialog-title', $dialog)
            .text(options.title || l[5840]);

        if (options.body) {
            $('.fm-dialog-body', $dialog)
                .removeClass('hidden')
                .safeHTML(options.body);
        }
        else {
            $('.fm-dialog-body', $dialog)
                .addClass('hidden');
        }

        var dialogBodyScroll = function() {
            var jsp;
            var bodyHeight = $('body').height();
            var $scrollBlock =  $('.pro-register-scroll');
            var scrollBlockHeight = $scrollBlock.height();
            $scrollBlock.css({
                'max-height': bodyHeight - 100
            });

            if (scrollBlockHeight + 140 > bodyHeight) {
                $scrollBlock.jScrollPane({
                    enableKeyboardNavigation: false,
                    showArrows: true,
                    arrowSize: 5,
                    animateScroll: true
                });
            }
            else {
                deleteScrollPanel('.pro-register-scroll', 'jsp');
                $scrollBlock.removeAttr('style');
            }
        };

        var reposition = function() {
            $dialog.css({
                'margin-left': -1 * ($dialog.outerWidth() / 2),
                'margin-top': -1 * ($dialog.outerHeight() / 2)
            });
        };

        var closeRegisterDialog = function() {
            closeDialog();
            $(window).unbind('resize.proregdialog');

            if (options.onDialogClosed) {
                options.onDialogClosed($dialog);
            }
        };

        dialogBodyScroll();
        reposition();

        $(window).rebind('resize.proregdialog', function() {
            Soon(function() {
                dialogBodyScroll();
                reposition();
            });
        });

        $('*', $dialog).removeClass('incorrect'); // <- how bad idea is that "*" there?

        // this might gets binded from init_page() which will conflict here..
        $('.login-register-input').unbind('click');

        // controls
        $('.fm-dialog-close', $dialog)
            .rebind('click.proDialog', function() {
                closeRegisterDialog();
            });

        $('.fm-dialog-overlay')
            .rebind('click.proDialog', function() {
                closeRegisterDialog();
            });

        $('#register-email', $dialog)
            .data('placeholder', l[95])
            .val(l[95]);

        $('#register-firstname', $dialog)
            .data('placeholder', l[1096])
            .val(l[1096]);

        $('#register-lastname', $dialog)
            .data('placeholder', l[1097])
            .val(l[1097]);

        $('#register-password', $dialog)
            .addClass('input-password')
            .data('placeholder', l[909])
            .val(l[909]);

        $('#register-password2', $dialog)
            .addClass('input-password')
            .data('placeholder', l[1114])
            .val(l[1114]);

        uiPlaceholders($dialog);
        uiCheckboxes($dialog);

        var registerpwcheck = function() {
            $('.login-register-input.password', $dialog)
                .removeClass('weak-password strong-password');
            $('.new-registration', $dialog)
                .removeClass('good1 good2 good3 good4 good5');

            if (typeof zxcvbn === 'undefined'
                    || $('#register-password', $dialog).attr('type') === 'text'
                    || $('#register-password', $dialog).val() === '') {
                return false;
            }

            var pw = zxcvbn($('#register-password', $dialog).val());
            if (pw.score > 3 && pw.entropy > 75) {
                $('.login-register-input.password', $dialog).addClass('strong-password');
                $('.new-registration', $dialog).addClass('good5');
                $('.new-reg-status-pad', $dialog).safeHTML('<strong>@@</strong>@@', l[1105], l[1128]);
                $('.new-reg-status-description', $dialog).text(l[1123]);
            }
            else if (pw.score > 2 && pw.entropy > 50) {
                $('.login-register-input.password', $dialog).addClass('strong-password');
                $('.new-registration', $dialog).addClass('good4');
                $('.new-reg-status-pad', $dialog).safeHTML('<strong>@@</strong>@@', l[1105], l[1127]);
                $('.new-reg-status-description', $dialog).text(l[1122]);
            }
            else if (pw.score > 1 && pw.entropy > 40) {
                $('.login-register-input.password', $dialog).addClass('strong-password');
                $('.new-registration', $dialog).addClass('good3');
                $('.new-reg-status-pad', $dialog).safeHTML('<strong>@@</strong>@@', l[1105], l[1126]);
                $('.new-reg-status-description', $dialog).text(l[1121]);
            }
            else if (pw.score > 0 && pw.entropy > 15) {
                $('.new-registration', $dialog).addClass('good2');
                $('.new-reg-status-pad', $dialog).safeHTML('<strong>@@</strong>@@', l[1105], l[1125]);
                $('.new-reg-status-description', $dialog).text(l[1120]);
            }
            else {
                $('.login-register-input.password', $dialog).addClass('weak-password');
                $('.new-registration', $dialog).addClass('good1');
                $('.new-reg-status-pad', $dialog).safeHTML('<strong>@@</strong> @@', l[1105], l[1124]);
                $('.new-reg-status-description', $dialog).text(l[1119]);
            }
            $('.password-status-warning', $dialog)
                .safeHTML('<span class="password-warning-txt">@@</span> '
                        + '@@<div class="password-tooltip-arrow"></div>', l[34], l[1129]);
            $('.password-status-warning', $dialog).css('margin-left',
                ($('.password-status-warning', $dialog).width() / 2 * -1) - 13);
            reposition();
            dialogBodyScroll();
        };

        if (typeof zxcvbn === 'undefined') {
            $('.login-register-input.password', $dialog).addClass('loading');

            mega.utils.require('zxcvbn_js')
                .done(function() {
                    $('.login-register-input.password', $dialog).removeClass('loading');
                    registerpwcheck();
                });
        }

        $('#register-password', $dialog).rebind('keyup.proRegister', function(e) {
            registerpwcheck();
        });

        $('.password-status-icon', $dialog).rebind('mouseover.proRegister', function(e) {
            if ($(this).parents('.strong-password').length === 0) {
                $('.password-status-warning', $dialog).removeClass('hidden');
            }
        });

        $('.password-status-icon', $dialog).rebind('mouseout.proRegister', function(e) {
            if ($(this).parents('.strong-password').length === 0) {
                $('.password-status-warning', $dialog).addClass('hidden');
            }
        });

        $('input', $dialog).rebind('keydown.proRegister', function(e) {
            if (e.keyCode === 13) {
                doProRegister($dialog);
            }
        });

        $('.register-st2-button', $dialog).rebind('click', function(e) {
            doProRegister($dialog);
            return false;
        });

        $('.new-registration-checkbox a', $dialog)
            .rebind('click.proRegisterDialog', function(e) {
                $.termsAgree = function() {
                    $('.register-check').removeClass('checkboxOff');
                    $('.register-check').addClass('checkboxOn');
                };
                bottomPageDialog(false, 'terms'); // show terms dialog
                return false;
            });
    }

    /**
     * Send Signup link dialog
     * @param {Object} accountData The data entered by the user at registration
     * @param {Function} onCloseCallback Optional callback to invoke on close
     */
    function sendSignupLinkDialog(accountData, onCloseCallback) {
        var $dialog = $('.fm-dialog.registration-page-success').removeClass('hidden');
        var $button = $('.resend-email-button', $dialog);

        $('input', $dialog).val(accountData.email);

        $button.rebind('click', function _click() {
            var ctx = {
                callback: function(res) {
                    loadingDialog.hide();

                    if (res !== 0) {
                        console.error('sendsignuplink failed', res);

                        $button.addClass('disabled');
                        $button.unbind('click');

                        var tick = 26;
                        var timer = setInterval(function() {
                            if (--tick === 0) {
                                clearInterval(timer);
                                $button.text(l[8744]);
                                $button.removeClass('disabled');
                                $button.rebind('click', _click);
                            }
                            else {
                                $button.text('\u23F1 ' + tick + '...');
                            }
                        }, 1000);

                        alert(l[200]);
                    }
                    else {
                        closeDialog();
                        fm_showoverlay();

                        $dialog.removeClass('hidden');
                    }
                }
            };
            loadingDialog.show();

            var email = $('input', $dialog).val().trim() || accountData.email;
            sendsignuplink(accountData.name, email, accountData.password, ctx, true);
        });

        if (typeof onCloseCallback === 'function') {
            // Show dialog close button
            $('.fm-dialog-header', $dialog).removeClass('hidden');

            $('.fm-dialog-close', $dialog).rebind('click', function _click() {

                msgDialog('confirmation', l[1334], l[5710], false, function(ev) {

                    // Confirm abort registration
                    if (ev) {
                        onCloseCallback();
                    }
                    else {
                        // Restore the background overlay which was closed by the msgDialog function
                        fm_showoverlay();
                    }
                });
            });
        }
        else {
            // Hide dialog close button
            $('.fm-dialog-header', $dialog).addClass('hidden');
        }

        fm_showoverlay();
        $dialog.addClass('special').show();
    }

    // export
    scope.mega.ui.showRegisterDialog = showRegisterDialog;
    scope.mega.ui.sendSignupLinkDialog = sendSignupLinkDialog;

})(this);
