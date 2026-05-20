(function($, scope) {

    'use strict';

    const icon = '<i class="sprite-fm-mono icon-alert-triangle-thin-outline"></i>';

    function getLoginDialogComponent(pagebound) {
        const {auth} = mega.ui;

        const contentHolder = is_mobile || pagebound ? startholder.querySelector('.content-holder') : document.body;

        if (!contentHolder) {
            return null;
        }

        if (auth.dialogComponent) {
            if (auth.dialogComponent.domNode.parentNode !== contentHolder) {
                contentHolder.appendChild(auth.dialogComponent.domNode);
            }

            return auth.dialogComponent;
        }

        if (is_mobile) {

            auth.dialogComponent = new MegaOverlay({
                parentNode: contentHolder,
                componentClassname: 'mega-overlay login-overlay mega-overlay-view',
                wrapperClassname: 'overlay overlay-container'
            });
        }
        else {
            auth.dialogComponent = new MegaSheet({
                parentNode: contentHolder,
                componentClassname: 'mega-sheet login-sheet',
                wrapperClassname: 'sheet'
            });
        }

        return auth.dialogComponent;
    }

    function hideProLoginDialog() {

        const component = getLoginDialogComponent(page === 'login');

        if (component) {
            component.hide('pro-login-dialog');
        }

        if ($.dialog === 'pro-login-dialog') {
            closeDialog();
        }
    }

    function getLoginDialogContent() {
        const {login} = mega.ui;

        if (login.dialogContent) {
            return $(login.dialogContent);
        }

        const dialog = login.dialogContent = mCreateElement('div', {
            class: 'pro-login-dialog sign'
        });

        const contentBlock = mCreateElement('div', {class: 'content-block'}, dialog);
        const contextBanner = mCreateElement('div', {
            class: 'login-context-banner hidden',
            role: 'alert',
            'aria-live': 'polite'
        }, contentBlock);
        mCreateElement('i', {class: 'sprite-fm-mono icon-alert-triangle-thin-outline'}, contextBanner);
        const contextCopy = mCreateElement('div', {class: 'login-context-copy'}, contextBanner);
        mCreateElement('div', {class: 'login-context-title'}, contextCopy);
        mCreateElement('div', {class: 'login-context-body'}, contextCopy);

        const form = mCreateElement('form', {class: 'account dialog-login-form'}, contentBlock);
        const fields = mCreateElement('div', {class: 'fields'}, form);

        mCreateElement('input', {
            class: 'pmText input-email clearButton',
            type: 'text',
            name: 'login-name3',
            id: 'login-name3',
            placeholder: l[95],
            maxlength: 190
        }, fields);

        mCreateElement('input', {
            class: 'pmText input-password clearButton',
            type: 'password',
            name: 'login-password3',
            id: 'login-password3',
            placeholder: l[909]
        }, fields);

        const errorBox = mCreateElement('div', {
            class: 'login-error-box hidden',
            role: 'alert',
            'aria-live': 'polite'
        }, fields);
        mCreateElement('i', {class: 'sprite-fm-mono icon-alert-triangle-thin-outline'}, errorBox);
        mCreateElement('span', {class: 'login-error-text'}, errorBox);

        const forgotWrap = mCreateElement('div', {class: 'login-page-forgot-bl'}, fields);
        const forgotLink = mCreateElement('a', {
            class: 'top-login-forgot-pass',
            href: '/recovery'
        }, forgotWrap);
        const forgotText = mCreateElement('span', {}, forgotLink);
        forgotText.textContent = l[8969];
        mCreateElement('div', {class: 'clear'}, forgotWrap);

        const footerContainer = mCreateElement('div', {class: 'footer-container'}, dialog);
        mCreateElement('div', {class: 'account checkbox-block js-login-remember'}, footerContainer);
        mCreateElement('div', {class: 'js-login-submit'}, footerContainer);

        if (!is_mobile) {
            const aside = mCreateElement('aside', {class: 'hidden'}, dialog);
            const asideText = mCreateElement('p', {}, aside);
            $(asideText).safeHTML(l[20635]);
        }

        return $(dialog);
    }

    function toggleLoginError($dialog, message) {

        const dialog = $dialog && $dialog[0];

        if (!dialog) {
            return;
        }

        const errorBox = dialog.querySelector('.login-error-box');
        const errorText = dialog.querySelector('.login-error-text');

        if (!errorBox || !errorText) {
            return;
        }

        if (message) {
            errorText.textContent = message;
            errorBox.classList.remove('hidden');
            return;
        }

        errorText.textContent = '';
        errorBox.classList.add('hidden');
    }

    function toggleLoginContextBanner($dialog) {

        const bodyText = login_txt || '';
        let titleText = '';
        let type = 'info';

        if (bodyText === l.confirm_link_invalid_text) {

            titleText = l.confirm_link_invalid_title;
            type = 'error';
        }
        else if (bodyText === l[703] || bodyText.startsWith(l[705])) {
            type = 'error';
        }

        if (is_mobile) {

            mobile.register.toggleLoginContextBanner(titleText, bodyText, type);
            login_txt = false;

            return;
        }

        const dialog = $dialog && $dialog[0];

        if (!dialog) {
            return;
        }

        const banner = dialog.querySelector('.login-context-banner');
        const title = dialog.querySelector('.login-context-title');
        const body = dialog.querySelector('.login-context-body');

        if (!banner || !title || !body) {
            return;
        }

        if (bodyText) {

            login_txt = false;
            title.textContent = titleText;
            body.textContent = bodyText;
            title.classList.toggle('hidden', !titleText);
            body.classList.remove('hidden');
            banner.classList.toggle('error', type === 'error');
            banner.classList.remove('hidden');

            mBroadcaster.once('pagechange', () => {
                toggleLoginContextBanner($dialog);
            });

            return;
        }

        title.textContent = '';
        body.textContent = '';
        title.classList.add('hidden');
        body.classList.add('hidden');
        banner.classList.remove('error');
        banner.classList.add('hidden');
    }

    function buildProLoginSecurityTip() {
        const {login} = mega.ui;

        if (login.securityTip) {
            return login.securityTip;
        }

        const tip = login.securityTip = mCreateElement('div', {class: 'login-security-tip'});
        const tipTitle = mCreateElement('div', {class: 'security-tip-title'}, tip);
        mCreateElement('i', {class: 'sprite-fm-mono icon-lightbulb-small-thin-outline'}, tipTitle);
        const tipHeading = mCreateElement('span', {}, tipTitle);
        tipHeading.textContent = l.login_security_tip_title;

        const tipBody = mCreateElement('p', {}, tip);
        tipBody.textContent = l.login_security_tip_body;

        return tip;
    }

    function showLoginRequiredDialog(options) {
        var promise = new MegaPromise();
        options = options || {};

        // Already logged-in, even on ephemeral
        if (u_type !== false && (!options.minUserType || u_type >= options.minUserType || u_type === 0)) {
            Soon(function() {
                promise.resolve();
            });
        }
        else if (is_mobile || options.skipInitialDialog) {
            showLoginDialog(promise, options);
        }
        else {
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
                $('header h2', this.$dialog)
                    .text(this.options.title);

                $('header p', this.$dialog)
                    .text(options.textContent || l[7679]);

                $('button.pro-login', this.$dialog)
                    .rebind('click.loginrequired', function() {
                        loginRequiredDialog.hide();
                        showLoginDialog(promise, options);
                        promise = undefined;
                        return false;
                    });

                if (options.showRegister) {
                    $('button.pro-register', this.$dialog)
                        .rebind('click.loginrequired', () => {
                            loginRequiredDialog.hide();
                            const keepPromise = promise;
                            mega.ui.signup.showDialog({
                                onBack() {
                                    promise = keepPromise;
                                    loginRequiredDialog.show();
                                }
                            }, promise);
                            promise = undefined;

                            return false;
                        });
                    $('button.pro-register span', this.$dialog).text(l.sign_up_btn);
                }
                else {
                    $('button.pro-register', this.$dialog)
                        .rebind('click.loginrequired', () => {
                            promise.reject();
                            return false;
                        });
                    $('button.pro-register span', this.$dialog).text(l.msg_dlg_cancel);
                }
            });

            loginRequiredDialog.show();

            promise.always(function __lrdAlways() {
                loginRequiredDialog.hide();
                loginRequiredDialog = undefined;
                hideProLoginDialog();
                promise = undefined;
            });
        }

        return promise;
    }

    function openLoginDialog() {

        const path = getCleanSitePath();

        // if already on login page, allow showing the dialog even for ephemeral users
        const minUserType = login_txt || path.startsWith('confirm') | 0;
        const loginPromise = showLoginRequiredDialog({
            skipInitialDialog: 1,
            showRegister: true,
            minUserType
        });

        onIdle(() => {

            const $content = getLoginDialogContent();

            if (login_email) {
                $('#login-name3', $content).val(login_email);
            }

            $('aside', $content).removeClass('hidden');
        });

        return loginPromise.then(() => {
            if (login_next) {
                loadSubPage(login_next);
            }
            else if (M && M.currentdirid && M.currentdirid.substr(0, 5) === 'chat/') {
                window.location.reload();
            }
            else if (page === 'download') {
                onIdle(() => {
                    topmenuUI();

                    if (dlmanager.isOverQuota) {
                        dlmanager._onOverquotaDispatchRetry();
                    }
                });
            }
            else if (page === 'login') {
                loadSubPage('fm');
            }
            else {
                page = getSitePath().substr(1);
                init_page();
            }
            login_next = false;
        });

    }

    function showLoginDialog(aPromise, options) {
        const {signup} = mega.ui;

        var $dialog = getLoginDialogContent();
        var $inputs = $('input', $dialog);
        var pageBound = is_mobile || page === 'login';

        if (!is_mobile) {
            options.showRegister = true;
        }

        if (M.chat) {

            $('aside', $dialog).removeClass('hidden');
            $('aside > p > a', $dialog).rebind('click.doSignup', () => {
                hideProLoginDialog();
                megaChat.loginOrRegisterBeforeJoining(undefined, true, false, false, options.onLoginSuccessCb, true);

                return false;
            });
        }
        else if (options.showRegister) {

            $('aside', $dialog).removeClass('hidden');
            $('aside > p > a', $dialog).rebind('click.doSignup', () => {

                if (pageBound) {
                    hideProLoginDialog();
                    loadSubPage('register');
                    return false;
                }

                hideProLoginDialog();

                signup.showDialog({
                    showLogin: true,
                    onAccountCreated(gotLoggedIn, accountData) {
                        if (gotLoggedIn) {
                            completeLogin(u_type);
                            if (pageBound) {
                                init_page();
                            }
                            else if (localStorage.folderLinkImport) {
                                loadSubPage('fm');
                            }
                            else {
                                loadSubPage(getCleanSitePath());
                            }
                        }
                        else {
                            security.register.cacheRegistrationData(accountData);

                            if (!options.noSignupLinkDialog) {
                                signup.showLinkDialog(accountData);
                            }
                        }
                    },
                    fromLogin: true
                }, folderlink ? aPromise : null);

                return false;
            });
        }
        else {
            $('aside', $dialog).addClass('hidden');
        }

        const rememberWrap = $dialog[0].querySelector('.js-login-remember');

        if (rememberWrap && !rememberWrap.megaCheckbox) {

            const rememberCheckbox = new MegaCheckbox({
                parentNode: rememberWrap,
                componentClassname: 'mega-checkbox login-check',
                checkboxName: 'login-check3',
                labelTitle: l.login_keep_me_logged_in,
                checked: true
            });
            const label = rememberCheckbox.domNode.querySelector('label');

            if (label) {

                label.textContent = '';
                const title = document.createElement('span');
                title.className = 'checkbox-title';
                title.textContent = l.login_keep_me_logged_in;
                const subtext = document.createElement('span');
                subtext.className = 'checkbox-subtext';
                subtext.textContent = l.login_keep_me_logged_in_subtext;
                label.appendChild(title);
                label.appendChild(subtext);
            }

            rememberWrap.megaCheckbox = rememberCheckbox;
        }

        const submitWrap = $dialog[0].querySelector('.js-login-submit');
        let loginBtn = submitWrap.componentSelector('.dialog-login-button');

        if (!loginBtn) {
            loginBtn = new MegaButton({
                parentNode: submitWrap,
                componentClassname: 'mega-button dialog-login-button primary block fat no-max',
                text: l[16345],
                type: 'normal'
            });
        }

        loginBtn.rebind('click.loginreq', () => doLogin($dialog, aPromise));

        loginBtn.rebind('keydown.loginreq', e => {
            if (e.keyCode === 13) {
                doLogin($dialog, aPromise);
            }
        });

        if (is_mobile && page !== 'login') {
            return loadSubPage('login');
        }

        const component = getLoginDialogComponent(pageBound);

        if (!component) {
            console.error('Failed to initiate dialog as getting the component failed');
            return aPromise.reject(EINTERNAL);
        }

        const loginDialogTitle = localStorage.megaLiteMode ? l.login_to_mega_lite : l[1768];
        const showOptions = {
            name: 'pro-login-dialog',
            classList: ['pro-login-dialog-overlay'],
            header: loginDialogTitle,
            headerType: 'h1',
            showClose: !pageBound,
            actionOnBottom: false,
            contents: [$dialog.removeClass('hidden')[0]],
            preventBgClosing: true,
            onClose: () => {
                $dialog.addClass('hidden');
                toggleLoginError($dialog);
                toggleLoginContextBanner($dialog);

                if (pageBound) {
                    component.removeClass('page-bound');
                }

                if (options.onDialogClosed) {
                    options.onDialogClosed();
                }

                aPromise.reject();
            },
            noBlurBackground: pageBound
        };

        if (!is_mobile) {
            showOptions.type = 'modal';
            showOptions.sheetHeight = 'auto';
            showOptions.sheetWidth = 'auto';
            showOptions.footer = {
                classList: ['pro-login-security-tip'],
                slot: [buildProLoginSecurityTip()]
            };
        }

        component.show(showOptions);
        // On mobile, footer belongs to the overlay component even on page-bound login.
        placeLangBtnToLogin(is_mobile || !pageBound ? component : null);
        $inputs.filter('[type="password"]').val('');
        toggleLoginError($dialog);
        toggleLoginContextBanner($dialog);

        if (pageBound) {
            component.addClass('page-bound');
        }

        onIdle(() => {
            // Init inputs events
            accountinputs.init($dialog);
        });

        $inputs.rebind('keydown', (e) => {
            toggleLoginError($dialog);

            // filter this input
            $inputs.filter((i, elm) => $('.message-container:empty', elm).length)
                .removeClass('errored').parent().removeClass('error');

            if (e.keyCode === 13) {
                doLogin($dialog, aPromise);
            }
        });

        $('.top-login-forgot-pass', $dialog).rebind('click.loginreq', (e) => {
            e.preventDefault();
            aPromise.reject();
            if (is_chatlink) {
                is_chatlink = false;
                delete megaChat.initialPubChatHandle;
                megaChat.destroy();
            }
            hideProLoginDialog();
            loadSubPage('recovery');
        });
    }

    var completePromise = null;

    function doLogin($dialog, aPromise) {

        const loginBtn = $dialog[0].componentSelector('.dialog-login-button');

        loginBtn.loading = true;
        toggleLoginError($dialog);

        // Save the promise for use in the completeLogin function
        completePromise = aPromise;

        var $emailInput = $dialog.find('#login-name3');
        var $passwordInput = $dialog.find('#login-password3');
        var $rememberMeCheckbox = $dialog.find('.login-check input');

        var email = $emailInput.val().trim();
        var password = $passwordInput.val();
        var rememberMe = $rememberMeCheckbox.prop('checked');
        var twoFactorPin = null;

        if (email === '' || !isValidEmail(email)) {

            $emailInput.megaInputsShowError(`${icon} ${l[5918]}`);
            $emailInput.focus();
            loginBtn.loading = false;
        }

        if (!password) {

            $passwordInput.megaInputsShowError(`${icon} ${l.err_no_pass}`);
            loginBtn.loading = false;
        }

        if (!loginBtn.loading) {
            return false;
        }

        mBroadcaster.once('msgdialog-closed', () => {
            if ($.msgDialog === '>error') {
                loginBtn.loading = false;
            }
        });

        // Checks if they have an old or new registration type, after this the flow will continue to login
        security.login.checkLoginMethod(email, password, twoFactorPin, rememberMe, startOldLogin, startNewLogin);
    }

    function getLoginFlowCallbacks(completeHandler) {
        return {
            old: (email, password, pinCode, rememberMe) =>
                postLogin(email, password, pinCode, rememberMe).then(completeHandler).catch(tell),
            new: (email, password, pinCode, rememberMe, salt) =>
                security.login.startLogin(email, password, pinCode, rememberMe, salt, completeHandler)
        };
    }

    /**
     * Starts the old login proceedure
     * @param {String} email The user's email address
     * @param {String} password The user's password as entered
     * @param {String|null} pinCode The two-factor authentication PIN code (6 digit number), or null if N/A
     * @param {Boolean} rememberMe Whether the user clicked the Remember me checkbox or not
     */
    function startOldLogin(email, password, pinCode, rememberMe) {
        postLogin(email, password, pinCode, rememberMe).then(completeLogin).catch(tell);
    }

    /**
     * Start the new login proceedure
     * @param {String} email The user's email addresss
     * @param {String} password The user's password as entered
     * @param {String|null} pinCode The two-factor authentication PIN code (6 digit number), or null if N/A
     * @param {Boolean} rememberMe A boolean for if they checked the Remember Me checkbox on the login screen
     * @param {String} salt The user's salt as a Base64 URL encoded string
     */
    function startNewLogin(email, password, pinCode, rememberMe, salt) {
        security.login.startLogin(email, password, pinCode, rememberMe, salt, completeLogin);
    }

    /**
     * Completes the login process
     * @param {Number} result The result from the API, e.g. a negative error num or the user type e.g. 3 for full user
     */
    function completeLogin(result) {

        var $formWrapper = $('.pro-login-dialog form');
        var $emailInput = $formWrapper.find('#login-name3');
        var $passwordInput = $formWrapper.find('#login-password3');
        let component = getLoginDialogComponent(page === 'login');
        if (component && (component = component.find('.dialog-login-button'))) {
            component.loading = false;
        }
        toggleLoginError($formWrapper);

        // Check and handle the common login errors
        if (security.login.checkForCommonErrors(result, startOldLogin, startNewLogin)) {
            return false;
        }

        // If successful result
        else if (result !== false && result >= 0) {

            u_type = result;
            u_checked = true;

            if (u_type === 3) {
                completePromise.resolve();
                hideProLoginDialog();
            }
            else {
                boot_auth(null, result);
                completePromise.reject();
            }

            $emailInput.val('');
            $passwordInput.val('');
        }
        else {
            $emailInput.megaInputsHideError(true);
            $emailInput.megaInputsShowError();
            $passwordInput.megaInputsHideError(true);
            $passwordInput.megaInputsShowError();
            toggleLoginError($formWrapper, l[16349]);
            $passwordInput.val('').focus();
        }
    }

    // export
    mega.ui.auth = mega.ui.auth || {};
    mega.ui.login = mega.ui.login || {};
    mega.ui.auth.getDialogComponent = getLoginDialogComponent;
    mega.ui.login.getDialogContent = getLoginDialogContent;
    mega.ui.login.getFlowCallbacks = getLoginFlowCallbacks;
    mega.ui.login.showRequiredDialog = showLoginRequiredDialog;
    mega.ui.login.openDialog = openLoginDialog;
    mega.ui.login.buildSecurityTip = buildProLoginSecurityTip;

})(jQuery, window);
