(function($, scope) {

    function showLoginRequiredDialog(options) {
        var promise = new MegaPromise();
        options = options || {};

        // Already logged-in, even on ephemeral?
        if (u_type !== false && (!options.minUserType || u_type >= options.minUserType)) {
            Soon(function() {
                promise.resolve();
            });
        }
        else if (options.skipInitialDialog) {
            showLoginDialog(promise);
        }
        else {
            var icon;
            var loginRequiredDialog = new mega.ui.Dialog({
                'className': 'loginrequired-dialog',
                'closable': true,
                'focusable': false,
                'expandable': false,
                'requiresOverlay': true,
                'title': options.title || l[5841],
                'buttons': []
            });
            loginRequiredDialog.bind('onHide', function() {
                Soon(function() {
                    if (promise) {
                        promise.reject();
                        promise = undefined;
                    }
                });
            });
            loginRequiredDialog.bind('onBeforeShow', function() {
                $('.fm-dialog-title', this.$dialog)
                    .text(this.options.title);

                // custom buttons, because of the styling
                $('.fm-notification-info', this.$dialog)
                    .safeHTML('<p>@@</p>', options.textContent || l[7679]);

                icon = $(this.$dialog)
                    .addClass('warning-dialog-a login').removeClass('loginrequired-dialog');

                $('.default-white-button.pro-login', this.$dialog)
                    .rebind('click.loginrequired', function() {
                        loginRequiredDialog.hide();
                        showLoginDialog(promise);
                        promise = undefined;
                        return false;
                    });

                $('.default-white-button.pro-register', this.$dialog)
                    .rebind('click.loginrequired', function() {
                        promise.reject();
                        return false;
                    }).find('span').text(l[82]);
            });

            loginRequiredDialog.show();

            promise.always(function __lrdAlways() {
                loginRequiredDialog.hide();
                loginRequiredDialog = undefined;
                if (icon) {
                    icon.removeClass('warning-dialog-a login').addClass('loginrequired-dialog');
                    icon = undefined;
                }
                closeDialog();
                promise = undefined;
            });
        }

        return promise;
    }

    function showLoginDialog(aPromise) {
        $.dialog = 'pro-login-dialog';

        var $dialog = $('.pro-login-dialog');
        $dialog
            .removeClass('hidden')
            .addClass('active');

        $('.fm-dialog-overlay').removeClass("hidden");
        $('body').addClass("overlayed");

        $dialog.css({
            'margin-left': -1 * ($dialog.outerWidth() / 2),
            'margin-top': -1 * ($dialog.outerHeight() / 2)
        });

        $('.top-login-input-block').removeClass('incorrect');

        // controls
        $('.fm-dialog-close', $dialog)
            .rebind('click.proDialog', function() {
                closeDialog();
                aPromise.reject();
            });

        $('.input-email', $dialog)
            .val('');

        $('.input-password', $dialog)
            .data('placeholder', l[909]);

        uiPlaceholders($dialog);
        uiCheckboxes($dialog);

        $('#login-password, #login-name', $dialog).rebind('keydown', function(e) {
            $('.top-login-pad', $dialog).removeClass('both-incorrect-inputs');
            $('.top-login-input-tooltip.both-incorrect', $dialog).removeClass('active');
            $('.top-login-input-block.password', $dialog).removeClass('incorrect');
            $('.top-login-input-block.e-mail', $dialog).removeClass('incorrect');
            if (e.keyCode == 13) {
                doLogin($dialog, aPromise);
            }
        });

        $('.top-login-forgot-pass', $dialog).rebind('click', function(e) {
            aPromise.reject();
            loadSubPage('recovery');
        });

        $('.top-dialog-login-button', $dialog).rebind('click', function(e) {
            doLogin($dialog, aPromise);
        });
    }


    function doLogin($dialog, aPromise) {
        loadingDialog.show();

        var ctx = {
            checkloginresult: function(ctx, r) {
                loadingDialog.hide();

                if (r == EBLOCKED) {
                    aPromise.reject(l[730]);
                }
                else if (r) {
                    passwordManager('#form_login_header');

                    u_type = r;
                    u_checked = true;
                    if (u_type === 3) {
                        aPromise.resolve();
                    }
                    else {
                        boot_auth(ctx, r);
                        aPromise.reject();
                    }
                    $('#login-password', $dialog).val('');
                    $('#login-email', $dialog).val('');

                }
                else {
                    $('#login-password', $dialog).val('');
                    alert(l[201]);
                }
            }
        };

        var passwordaes = new sjcl.cipher.aes(prepare_key_pw($('#login-password', $dialog).val()));
        var uh = stringhash($('#login-name', $dialog).val().toLowerCase(), passwordaes);
        u_login(
            ctx,
            $('#login-name', $dialog).val(),
            $('#login-password', $dialog).val(),
            uh,
            $('#login-checkbox').is('.checkboxOn'));
    }

    // export
    scope.mega.ui.showLoginRequiredDialog = showLoginRequiredDialog;

})(jQuery, window);
