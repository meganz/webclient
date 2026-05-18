(function(scope) {
    'use strict';
    var options = {};

    function getRegisterDialogContent() {
        const {signup} = mega.ui;

        if (signup.dialogContent) {
            return signup.dialogContent;
        }

        const dialog = signup.dialogContent = mCreateElement('div', {
            class: 'pro-register-dialog',
            role: 'dialog',
            'aria-labelledby': 'pro-register-dialog-title',
            'aria-modal': 'true'
        });

        const header = mCreateElement('header', {}, dialog);
        const row = mCreateElement('div', {class: 'register-header-row'}, header);
        const backBtn = mCreateElement('button', {
            class: 'register-back-button js-register-back',
            type: 'button',
            'aria-label': l[23706]
        }, row);
        mCreateElement('i', {class: 'sprite-fm-mono icon-arrow-left-regular-outline rtl-rot-180'}, backBtn);
        mCreateElement('h2', {id: 'pro-register-dialog-title'},[parseHTML(l.register_dialog_title)], row);

        const headerAside = mCreateElement('aside', {class: 'with-condition'}, header);
        const loginText = mCreateElement('div', {class: 'login-text'}, headerAside);
        loginText.textContent = `${l[5585]} `;
        const loginLink = mCreateElement('a', {href: '/login'}, loginText);
        loginLink.textContent = l[171];

        const section = mCreateElement('section', {class: 'content'}, dialog);
        const contentBlock = mCreateElement('div', {class: 'content-block'}, section);
        mCreateElement('div', {class: 'fm-dialog-body hidden'}, contentBlock);
        const layout = mCreateElement('div', {class: 'register-layout'}, contentBlock);
        const formCol = mCreateElement('div', {class: 'register-form-column'}, layout);
        const form = mCreateElement('form', {class: 'account dialog-register-form'}, formCol);
        const pane = mCreateElement('div', {class: 'register-side-pane content'}, form);

        const firstNameWrap = mCreateElement('div', {class: 'account'}, pane);
        mCreateElement('input', {
            class: 'pmText f-name clearButton',
            type: 'text',
            name: 'register-name',
            id: 'register-firstname',
            title: l[7342],
            maxlength: 40
        }, firstNameWrap);

        const emailWrap = mCreateElement('div', {class: 'account'}, pane);
        mCreateElement('input', {
            class: 'pmText email clearButton',
            type: 'text',
            name: 'register-email',
            id: 'register-email',
            title: l[95],
            maxlength: 190
        }, emailWrap);

        mCreateElement('div', {class: 'clear'}, pane);

        const passwordWrap = mCreateElement('div', {class: 'account full-sized-error password-wrapper'}, pane);
        mCreateElement('input', {
            class: 'pmText pass clearButton',
            type: 'password',
            name: 'register-password',
            id: 'register-password',
            title: l[909],
            autocomplete: 'new-password'
        }, passwordWrap);

        const strength = mCreateElement('div', {class: 'password-strength hidden'}, passwordWrap);
        mCreateElement('i', {class: 'sprite-fm-mono icon-size-18'}, strength);
        mCreateElement('span', {class: 'password-strength-text'}, strength);

        const passInfo = mCreateElement('div', {class: 'password-info'}, passwordWrap);
        const passStrong = mCreateElement('span', {class: 'pass-incr-strength bold'}, passInfo);
        passStrong.textContent = l.stronger_pass_have;
        const passList = mCreateElement('ul', {class: 'pass-incr-strength'}, passInfo);
        const li1 = mCreateElement('li', {}, passList);
        li1.textContent = l.upper_and_lower_letters;
        const li2 = mCreateElement('li', {}, passList);
        li2.textContent = l.number_or_special;
        const passStore = mCreateElement('span', {class: 'password-not-stored hidden'}, passInfo);
        passStore.append(parseHTML(l.we_dont_store_password));

        mCreateElement('div', {class: 'clear'}, pane);
        const terms = mCreateElement('div', {class: 'account terms'}, pane);
        terms.append(parseHTML(l.register_terms));
        terms.dataset.defaultHtml = l.register_terms;

        const privacyWrap = mCreateElement('div', {
            class: 'account checkbox-block register privacy-checkbox-block hidden'
        }, pane);
        const privacyCheck = mCreateElement('div', {class: 'privacy-check checkboxOff checkbox'}, privacyWrap);
        mCreateElement('input', {class: 'checkboxOff', type: 'checkbox', checked: ''}, privacyCheck);
        const privacyLabel = mCreateElement('label', {class: 'radio-txt privacy-label'}, privacyWrap);
        privacyLabel.textContent = l.accept_privacy_policy;
        mCreateElement('div', {class: 'clear'}, privacyWrap);

        const footer = mCreateElement('footer', {}, dialog);
        mCreateElement('div', {class: 'footer-container'}, footer);

        const benefits = mCreateElement('aside', {class: 'register-benefits-column'}, dialog);
        const benefitsTitle = mCreateElement('div', {class: 'register-benefits-title'}, benefits);
        benefitsTitle.textContent = l.register_benefits_title;
        const benefitsList = mCreateElement('ul', {class: 'register-benefits-list'}, benefits);

        const _makeBenefit = (cls, icon, heading, text) => {
            const li = mCreateElement('li', {class: cls}, benefitsList);
            mCreateElement('i', {class: `glass-icon ${icon}`}, li);
            const copy = mCreateElement('div', {class: 'benefit-copy'}, li);
            const h = mCreateElement('div', {class: 'benefit-heading'}, copy);
            h.textContent = heading;
            const t = mCreateElement('div', {class: 'benefit-text'}, copy);
            t.textContent = text;
        };

        _makeBenefit('free-storage', 'glass-cloud-circle',
                     l.register_benefit_free_storage_heading.replace('%1', bytesToSize(mega.bstrg, 0)),
                     l.register_benefit_free_storage_text);
        _makeBenefit('e2ee-storage', 'glass-lock', l.register_benefit_e2ee_heading, l.register_benefit_e2ee_text);
        _makeBenefit('sync-backup', 'glass-folder-sync', l.register_benefit_sync_heading, l.register_benefit_sync_text);
        _makeBenefit('upgrade-features', 'glass-rocket', l.register_benefit_upgrade_heading,
                     l.register_benefit_upgrade_text);

        return dialog;
    }

    function getBusinessSubAccountInfo() {

        if (!localStorage.businessSubAc) {
            return;
        }

        const source = JSON.parse(localStorage.businessSubAc);

        if (!source || typeof source !== 'object') {
            return;
        }

        const email = source.e.trim();
        const signupCode = source.signupcode.trim();

        if (!email || !signupCode) {
            return;
        }

        const firstName = from8(base64urldecode(source.firstname));
        const lastName = from8(base64urldecode(source.lastname));

        options.businessSubAccountInfo = {email, signupCode, firstName, lastName};
    }

    /*jshint -W074*/
    // ^ zxcvbn stuff..

    function closeRegisterDialog($dialog, isUserTriggered) {

        const component = mega.ui.auth.getDialogComponent(page === 'register');
        const _reset = () => {

            $('input', $dialog).val('');
            $('.privacy-checkbox-block', $dialog).addClass('hidden');
            $('.privacy-check', $dialog).removeClass('checkboxOn').addClass('checkboxOff');
        };

        component.hide(component.name);

        _reset();

        if (isUserTriggered && options.onDialogClosed) {
            options.onDialogClosed($dialog);
        }

        options = {};
    }

    function doProRegister($dialog, aPromise, pageBound) {
        const rv = {};
        const registerBtn = $dialog[0].componentSelector('.mega-button:not(.js-close)');
        registerBtn.loading = true;

        if (options.onCreatingAccount) {
            options.onCreatingAccount($dialog);
        }

        if (u_type > 0) {
            registerBtn.loading = false;
            msgDialog('warninga', l[135], l[5843]);
            return false;
        }

        const registrationDone = (login) => {

            const onAccountCreated = options.onAccountCreated && options.onAccountCreated.bind(options);

            if (aPromise) {
                aPromise.resolve();
            }

            registerBtn.loading = false;
            closeRegisterDialog($dialog);

            if (login) {
                Soon(() => {
                    showToast('megasync', l[8745]);
                    $('.fm-avatar img').attr('src', useravatar.mine());
                });
            }
            onIdle(topmenuUI);

            if (login) {
                loadSubPage('fm');
            }
            else if (typeof onAccountCreated === 'function') {
                onAccountCreated(login, rv);
            }
            else {
                security.register.cacheRegistrationData(rv);
                sendSignupLinkDialog(rv, null, true);
            }
        };

        const showExistingAccountError = () => {
            registerBtn.loading = false;
            options.$dialog.find('input.email').megaInputsShowError(l[7869]);
        };

        const attemptExistingAccountLogin = () => {
            registerBtn.loading = true;
            M.require('register_js').then(() => {
                loginFromEphemeral.init(rv, {registrationDone, showExistingAccountError});
            }).catch(ex => {

                if (d) {
                    console.error('Existing account login bootstrap failed', ex);
                }

                if (typeof loginFromEphemeral !== 'undefined') {
                    loginFromEphemeral.context = null;
                }

                u_logout();
                showExistingAccountError();
            });
        };

        /**
         * Continue the old method Pro registration
         * @param {Number} result The result of the 'uc' API request
         */
        const continueProRegistration = result => {
            registerBtn.loading = false;
            if (result === 0) {
                registrationDone();
            }
            else if (result === EACCESS || result === EEXIST) {
                attemptExistingAccountLogin();
            }
            else {
                u_logout();
                $('.mega-dialog:visible').addClass('arrange-to-back');
                msgDialog('warninga', l[1578], l[200], api_strerror(result), () => {
                    if ($('.mega-dialog:visible').removeClass('arrange-to-back').length) {
                        fm_showoverlay();
                    }
                });
            }
        };

        /**
         * The main function to register the account
         */
        const registeraccount = function() {

            rv.password = $('input.pass', $dialog).val();
            rv.name = rv.first = $.trim($('input.f-name', $dialog).val());
            rv.last = ''; // no longer collect last name
            rv.email = $.trim($('input.email', $dialog).val());

            // Set a flag that the registration came from the Pro page
            const fromProPage = sessionStorage.getItem('proPageContinuePlanNum') !== null;

            const signup = () => {
                // Set the signup function to start the new secure registration process
                security.register.startRegistration(
                    rv.first,
                    rv.last,
                    rv.email,
                    rv.password,
                    fromProPage,
                    continueProRegistration,
                    true
                );
            };

            if (u_type === 0) {
                const names = Object.create(null);
                names[M.RootID] = 'ephemeral-account';

                M.getCopyNodes([M.RootID], null, names)
                    .then((nodes) => {
                        if (Array.isArray(nodes) && nodes.length) {
                            $.ephNodes = nodes;
                            $.ephNodes[0].t = 1;
                        }

                        signup();
                    });
                return;
            }

            signup();
        };

        let err = false;
        const errReasons = [];
        const $formWrapper = $('form', $dialog);
        const $firstName = $('input.f-name', $formWrapper);
        const $email = $('input.email', $formWrapper);
        const $password = $('input.pass', $formWrapper);

        const firstName = $.trim($firstName.val());
        const email = $.trim($email.val());
        const password = $password.val();

        // Check if the entered passwords are valid or strong enough
        const passwordValidationResult = security.isValidPassword(password, password);
        const warningIcon = '<i class="sprite-fm-mono icon-alert-triangle-thin-outline"></i>';

        // If bad result
        if (passwordValidationResult !== true) {
            if (!password) {
                errReasons.push('mp');
            }

            $password.focus();
            $password.megaInputsShowError(`${warningIcon} ${passwordValidationResult}`);
            $('.password-strength', $formWrapper).addClass('hidden'); // Hide this for avoid double error message

            err = 1;
        }

        if (email === '' || !isValidEmail(email)) {
            errReasons.push(email === '' ? 'me' : 'ie');
            $email.megaInputsShowError(`${warningIcon} ${l[1101]}`);
            $email.focus();
            err = 1;
        }

        if (firstName === '') {
            errReasons.push('mf');
            $firstName.megaInputsShowError(`${warningIcon} ${l.enter_name_err}`);
            $firstName.focus();

            $firstName.rebind('input.hideError', () => {
                $firstName.megaInputsHideError();
                $firstName.off('input.hideError');
            });

            err = 1;
        }

        if (!err) {
            if (options.s4Flag && $('.privacy-check', $dialog).hasClass('checkboxOff')) {
                registerBtn.loading = false;
                msgDialog('warninga', l[1117], l.accept_privacy_policy_warning);
            }
            else {
                // Log S4 account registation
                if (options.s4Flag) {
                    eventlog(500592);
                }

                if (options.businessSubAccountInfo) {

                    rv.first = options.businessSubAccountInfo.firstName;
                    rv.last = options.businessSubAccountInfo.lastName;
                    rv.email = options.businessSubAccountInfo.email.toLowerCase();
                    rv.name = `${rv.first} ${rv.last}`.trim();

                    window.businessSubAc = JSON.parse(localStorage.businessSubAc);

                    u_checklogin({
                        checkloginresult(u_ctx, r) {
                            if (typeof r[0] === 'number' && r[0] < 0) {
                                registerBtn.loading = false;
                                msgDialog('warningb', l[135], l[200]);
                                return;
                            }

                            u_type = r;

                            security.login.checkLoginMethod(rv.email, $password.val(), null, false,
                                                            signin.old.startLogin, signin.new.startLogin);

                            if (!is_mobile) {
                                mega.ui.onboardBusSub = 1;
                            }
                            delete localStorage.businessSubAc;
                        },
                        businessUser: $password.val()
                    }, true, null, options.businessSubAccountInfo.signupCode, rv.name);

                    return;
                }
                else if (u_type === false) {

                    api.req({a: 'ere', m: email, v: 2}).then(() => {

                        rv.email = email;
                        rv.password = password;

                        attemptExistingAccountLogin();
                    }).catch(ex => {
                        if (ex === -9) {
                            u_storage = init_storage(localStorage);
                            u_checklogin({
                                checkloginresult(u_ctx, r) {
                                    u_type = r;
                                    registeraccount();
                                }
                            }, true);
                        }
                        else {
                            console.error('Unexpected return value from API');
                        }
                    });
                }
                else if (u_type === 0) {
                    registeraccount();
                }
            }
        }
        if (err) {
            eventlog(pageBound ? 501133 : 501242, errReasons.join(','), true);
            registerBtn.loading = false;
        }
    }

    function showRegisterDialog(opts, aPromise) {
        const {login, signup} = mega.ui;

        if ($.len(options)) {
            closeRegisterDialog(options.$dialog, true);
        }
        options = Object(opts);
        getBusinessSubAccountInfo();

        // Force no login for ephemeral users or if it's a business sub account registration form
        if (u_type === 0 || options.businessSubAccountInfo) {
            options.showLogin = false;
        }

        const dialog = getRegisterDialogContent();
        const $dialog = options.$dialog = $(dialog);
        var $inputs = $('input', $dialog);
        const pageBound = page === 'register';
        const component = mega.ui.auth.getDialogComponent(pageBound);

        if (!component) {
            return;
        }

        if (pageBound) {
            $('.fm-dialog-overlay').addClass('hidden');
            component.addClass('page-bound');
        }

        const showOptions = {
            name: 'pro-register-dialog',
            classList: ['pro-register-dialog-overlay'],
            showClose: !pageBound,
            actionOnBottom: false,
            contents: [dialog],
            preventBgClosing: pageBound || options.preventBgClosing !== false,
            onClose: () => {

                closeRegisterDialog($dialog, true);

                if (pageBound) {
                    component.removeClass('page-bound');
                }
                if (aPromise) {
                    aPromise.reject();
                }
            },
            noBlurBackground: pageBound
        };

        if (!is_mobile) {

            showOptions.type = 'modal';
            showOptions.sheetHeight = 'auto';
            showOptions.sheetWidth = 'auto';
        }

        component.show(showOptions);
        component.toggleClass('business-sub-account', !!options.businessSubAccountInfo);

        if (!pageBound) {
            eventlog(501240);
        }

        placeLangBtnToLogin(is_mobile ? component : undefined);

        onIdle(() => {
            // Init inputs events
            accountinputs.init($dialog);
        });

        // S4 new ToS And Privacy checkboxes
        if (options.s4Flag) {
            $('.privacy-checkbox-block').removeClass('hidden');
        }

        const $withCondition = $('header .with-condition', $dialog);
        const $loginText = $('header .login-text', $dialog);
        const $loginLink = $('header .login-text a', $dialog);

        $withCondition.removeClass('hidden');
        $loginText.addClass('hidden');

        const submitWrap = $dialog[0].querySelector('.footer-container');

        if (!submitWrap) {
            if (d) {
                console.error('Submit button wrapper not found in the dialog');
            }
            return;
        }

        let submitButton = submitWrap.componentSelector('.register-button');

        if (!submitButton) {
            submitButton = new MegaButton({
                parentNode: submitWrap,
                componentClassname: 'mega-button register-button primary',
                text: l[1108],
                typeAttr: 'button'
            });
        }

        const initPasswordStrength = () => {

            const $passwordInput = $('input.pass', $dialog);

            if (!$passwordInput.length || typeof signup.updatePasswordStrength !== 'function') {
                return;
            }

            const validatePasswordStrength = password => {

                const isValid = security.isValidPassword(password, password, true);

                if (isValid === true && typeof zxcvbn === 'function') {
                    return classifyPassword(password);
                }

                return isValid;
            };

            $passwordInput.rebind('input.passwordStrength', ev => {
                signup.updatePasswordStrength(validatePasswordStrength(ev.target.value), $dialog);
            });

            // For input cleared case
            $passwordInput.rebind('keyup.passwordStrength', ev => {

                if (ev.keyCode === 9) {
                    return;
                }

                if (ev.target.value.length === 0) {
                    $passwordInput.data('MegaInputs').hideError();
                    signup.updatePasswordStrength(validatePasswordStrength(ev.target.value), $dialog);
                }
            });
        };

        M.require('zxcvbn_js').then(initPasswordStrength);

        $('.js-register-back', $dialog).rebind('click.registerBack', () => {

            const {fromLogin, onBack} = options;

            closeRegisterDialog($dialog, true);

            if (pageBound) {
                loadSubPage('login');
            }

            if (fromLogin) {
                login.openDialog();
            }

            if (typeof onBack === 'function') {
                onBack();
            }

            return false;
        });

        if (M.chat) {
            $loginText.removeClass('hidden');
            $loginLink.rebind('click.doSignup', () => {
                closeRegisterDialog($dialog, true);
                megaChat.loginOrRegisterBeforeJoining(
                    undefined,
                    false,
                    true,
                    undefined,
                    opts.onLoginSuccessCb
                );

                return false;
            });
        }
        else if (options.showLogin) {
            $loginText.removeClass('hidden');
            $loginLink.rebind('click.doSignup', () => {
                if (pageBound) {
                    closeRegisterDialog($dialog, true);
                    loadSubPage('login');
                    return false;
                }

                var onAccountCreated = options.onAccountCreated && options.onAccountCreated.bind(options);

                closeRegisterDialog($dialog, true);
                login.showRequiredDialog({minUserType: 3, skipInitialDialog: 1})
                    .then(() => {
                        if (typeof onAccountCreated === 'function') {
                            onAccountCreated(2, false);
                        }
                        else if (d) {
                            console.warn('Completed login, but have no way to notify the caller...');
                        }
                    }).catch(console.debug.bind(console));

                return false;
            });
        }

        $inputs.val('');
        $('.password-wrapper .password-strength', $dialog).addClass('hidden');

        // Hide the "Create an account and get x GB of free storage on MEGA"
        // text if coming from the discount promotion page
        $('.register-benefits-list .free-storage', $dialog)
            .toggleClass('hidden', !!sessionStorage.getItem('discountPromoContinuePlanNum'));

        const $firstName = $('input.f-name', $dialog);
        const $email = $('input.email', $dialog);
        const $terms = $('.account.terms', $dialog);
        const termsNode = $terms[0];
        const $title = $('#pro-register-dialog-title', $dialog);
        const $benefits = $('.register-benefits-column', $dialog);

        $firstName.closest('.account').removeClass('hidden');
        $email.closest('.account').removeClass('hidden');
        $benefits.removeClass('hidden');

        if ($title.length) {
            $title.safeHTML(l.register_dialog_title);
        }

        if (termsNode && termsNode.dataset.defaultHtml) {
            $terms.safeHTML(termsNode.dataset.defaultHtml);
        }

        if (options.businessSubAccountInfo) {
            $firstName.val(options.businessSubAccountInfo.firstName);
            $email.val(options.businessSubAccountInfo.email);
            $firstName.closest('.account').addClass('hidden');
            $email.closest('.account').addClass('hidden');
            $benefits.addClass('hidden');

            if ($title.length) {
                $title.text(l[19517]);
            }
        }

        submitButton.rebind('click.proRegister', () => {
            if (!submitButton.loading && !submitButton.disabled) {
                eventlog(pageBound ? 99809 : 501043);
                doProRegister($dialog, aPromise, pageBound);
            }
            return false;
        });

        const _keysubmit = e => {
            if (e.keyCode === 13) {
                submitButton.trigger('click.proRegister');
            }
        };

        $inputs.rebind('keydown.proRegister', _keysubmit);
        submitButton.rebind('keydown.proRegister', _keysubmit);

        $inputs.rebind('keyup.registerforminteraction', () => {
            eventlog(pageBound ? 501132 : 501241, true);
            $inputs.off('keyup.registerforminteraction');
        });
    }

    let _cachePendingSignUp = null;

    /**
     * Send Signup link dialog
     * @param {Object} accountData The data entered by the user at registration
     * @param {Function} onCloseCallback Optional callback to invoke on close
     * @param {Boolean} startTimerOnOpen Whether to start resend timer immediately on first render
     */
    function sendSignupLinkDialog(accountData, onCloseCallback, startTimerOnOpen) {

        // Make this dialog only available on register page for header consistency.
        if (page !== 'register') {

            // cache current data for redirection to register page and showing the dialog there
            _cachePendingSignUp = {accountData, onCloseCallback, startTimerOnOpen};
            loadSubPage('register');
            return;
        }

        if (_cachePendingSignUp) {
            accountData = _cachePendingSignUp.accountData;
            onCloseCallback = _cachePendingSignUp.onCloseCallback;
            startTimerOnOpen = _cachePendingSignUp.startTimerOnOpen;
            _cachePendingSignUp = null;
        }

        const data = Object(accountData);
        const user = {
            first: data.first || '',
            last: data.last || '',
            email: data.email || ''
        };

        let resendTimer;
        const changeEmailInput = new MegaInputComponent({
            parentNode: document.createDocumentFragment(),
            className: 'pmText signup-email-input',
            title: l[95]
        });
        changeEmailInput.input.type = 'email';
        changeEmailInput.on('input.signupLink', () => {
            changeEmailInput.error = null;
        });

        const contents = {
            default: {
                title: l[735],
                get msg() {
                    return l.email_confirmation_sent.replace('%1', `<strong>${escapeHTML(user.email)}</strong>`);
                },
                subMsg:
                    `<p>${l[217]}</p>
                    <p>${l.account_delete_email_confirmation_no_receive}</p>
                    <p>${l.contact_support_email}</p>`
            },
            change: {
                title: l[7743],
                msg: l.register_change_email_prompt,
                subMsg: changeEmailInput.domNode
            }
        };

        const _clearTimer = () => {
            if (resendTimer) {
                clearInterval(resendTimer);
                resendTimer = null;
            }
        };
        const dialogComponent = mega.ui.auth.getDialogComponent(true);

        if (!dialogComponent) {
            if (d) {
                console.error('No dialog component available to show signup link dialog');
            }
            return;
        }

        dialogComponent.rebind('hide.signupLinkDialogTimer', _clearTimer);

        const _handleResend = (mode) => {
            const email = mode === 'change' ? $.trim(changeEmailInput.value || '') : user.email;
            const resendTarget = dialogComponent.contentNode.componentSelector(
                mode === 'change' ? '.resend-email' : '.resend-email-link'
            );

            if (resendTarget && (resendTarget.disabled || resendTarget.loading)) {
                return;
            }

            if (mode === 'change' && !isValidEmail(email)) {
                changeEmailInput.error = l.enter_valid_email;
                return;
            }

            if (resendTarget) {
                resendTarget.loading = true;
            }

            _resendEmail(email, mode, resendTarget);
        };

        const _formatResendWait = tick => l.register_resend_wait
            .replace('%1', String(Math.floor(tick / 60)).padStart(2, '0'))
            .replace('%2', String(tick % 60).padStart(2, '0'));

        const _renderDialogContent = (mode, msg, subMsg) => {
            const content = mCreateElement('div', {class: 'signup-link-overlay-content'});
            const msgNode = mCreateElement('p', {}, content);

            if (mode === 'change') {
                msgNode.textContent = msg;
                if (subMsg) {
                    content.append(subMsg);
                }

                const resendBlock = mCreateElement('div', {class: 'signup-link-action'}, content);
                const resendButton = new MegaButton({
                    parentNode: resendBlock,
                    type: 'normal',
                    componentClassname: 'resend-email',
                    text: l.register_update_email_button
                });
                resendButton.on('click', () => _handleResend(mode));
                mCreateElement('span', {class: 'resend-email-wait hidden'}, resendBlock)
                    .textContent = _formatResendWait(300);

                return content;
            }

            msgNode.append(parseHTML(msg));
            const subMsgNode = mCreateElement('div', {}, content);
            subMsgNode.append(parseHTML(subMsg));

            const resendBlock = mCreateElement('div', {class: 'signup-link-resend'}, content);
            mCreateElement('span', {}, resendBlock).textContent = l.register_resend_question;
            resendBlock.append(' ');

            MegaLink.factory({
                parentNode: resendBlock,
                type: 'text',
                componentClassname: 'resend-email-link',
                text: l.register_resend_link
            }).on('click', () => _handleResend(mode));
            mCreateElement('span', {class: 'resend-email-wait hidden'}, resendBlock)
                .textContent = _formatResendWait(300);

            if (is_mobile) {

                const wrap = mCreateElement(
                    'div',
                    {class: 'signup-link-footer'},
                    [document.createTextNode(`${l.register_wrong_email_prompt} `)],
                    content
                );

                MegaLink.factory({
                    parentNode: wrap,
                    type: 'text',
                    text: l[7743]
                }).on('click', () => _showDialog('change'));
            }

            return content;
        };

        const _renderSignupLinkFooter = (mode) => {

            if (mode !== 'default' || is_mobile) {
                return null;
            }

            const footer = document.createDocumentFragment();
            MegaLink.factory({
                parentNode: footer,
                type: 'text',
                text: l[7743]
            }).on('click', () => _showDialog('change'));

            footer.prepend(document.createTextNode(`${l.register_wrong_email_prompt} `));

            return {
                slot: [footer],
                classList: ['signup-link-footer']
            };
        };

        const _handleSignupLinkDialogClose = () => {

            _clearTimer();

            const type = `>*-signupCancel:!^${l.register_cancel_signup_confirm}!${l.register_cancel_signup_dismiss}`;

            onIdle(() => msgDialog(type, false, l.register_cancel_signup_title, l.register_cancel_signup_text, ev => {
                if (!ev) {
                    return;
                }

                eventlog(501159);

                const promise = api.req({a: 'ucr'}).catch(dump);

                const _ = () => {

                    if (typeof onCloseCallback === 'function') {

                        onCloseCallback();
                        return;
                    }

                    delete localStorage.awaitingConfirmationAccount;

                    loadSubPage('login');
                };

                // For mobile web register ephemeral is not allowed
                if (is_mobile) {

                    promise.then(() => u_logout(1)).then(() => {

                        _();
                        window.location.reload();
                    });
                }
                else {
                    _();
                }
            }));
        };

        function _showDialog(mode, opts = {}) {

            changeEmailInput.value = opts.email || user.email;
            changeEmailInput.error = opts.error || '';

            let {title, msg, subMsg} = contents[mode];

            if (opts.customTitle) {
                title = opts.customTitle;
            }

            const opt = {
                name: 'signup-link-overlay',
                classList: ['signup-link-dialog-overlay'],
                type: is_mobile ? 'modal' : 'modalLeft',
                preventBgClosing: true,
                contents: [_renderDialogContent(mode, msg, subMsg)],
                footer: _renderSignupLinkFooter(mode),
                onShow: () => {

                    placeLangBtnToLogin(is_mobile ? dialogComponent : null);

                    if (opts.startTimerTick > 0) {

                        _startTimer(opts.startTimerTick);
                    }
                },
                confirmClose: _handleSignupLinkDialogClose,
                noBlurBackground: true
            };

            if (mode === 'change') {

                opt.onBack = () => _showDialog('default');
                opt[is_mobile ? 'title' : 'header'] = title;
                opt.showClose = false;
            }
            else {
                opt.showClose = true;
                opt.icon = 'png-icon email-sent';
                opt.title = title;
            }

            dialogComponent.show(opt);
            dialogComponent.titleNode.classList.remove('mob-px-6');

            if (is_mobile) {
                mega.ui.header.update();
            }
        }

        function _startTimer(tick = 301) {

            const primaryBtn = dialogComponent.contentNode.componentSelector('.resend-email');
            const resendLink = dialogComponent.contentNode.componentSelector('.resend-email-link');
            const resendWait = dialogComponent.contentNode.querySelector('.resend-email-wait');
            const target = primaryBtn || resendLink;

            _clearTimer();

            if (!target) {
                return;
            }

            target.hide();
            if (resendWait) {
                resendWait.classList.remove('hidden');
            }

            resendTimer = setInterval(() => {
                if (--tick <= 0) {
                    _clearTimer();
                    target.show();
                    if (resendWait) {
                        resendWait.classList.add('hidden');
                    }
                    return;
                }
                if (resendWait) {
                    resendWait.textContent = _formatResendWait(tick);
                }
            }, 1000);
        }

        function _resendEmail(email, fallbackMode, resendTarget) {
            security.register.repeatSendSignupLink(
                user.first,
                user.last,
                email,
                res => {
                    if (resendTarget) {
                        resendTarget.loading = false;
                    }

                    if (res === -5) {
                        showToast('warning', l[7717]);
                        _showDialog(fallbackMode, {email});
                        return;
                    }

                    if (res === EEXIST) {
                        _showDialog('change', {email, error: l.register_resend_email_exists_error});
                        return;
                    }

                    if (res === ETOOMANY) {
                        showToast('warning', l.register_resend_limit_toast);
                        _showDialog('default', {email, startTimerTick: 301});
                        return;
                    }

                    if (res !== 0) {
                        console.error('sendsignuplink failed', res);
                        showToast('warning', l[200]);
                        _startTimer(26);
                        return;
                    }

                    let msg = l.register_resend_success_toast;

                    if (user.email !== email) {

                        const aca = JSON.parse(localStorage.awaitingConfirmationAccount);

                        msg = l.register_email_update_success;
                        aca.email = user.email = email;
                        security.register.cacheRegistrationData(aca);
                    }
                    _showDialog('default', {startTimerTick: 301, customTitle: l.register_update_email_title});
                    showToast('success', msg);
                }
            );
        }

        _showDialog('default', startTimerOnOpen ? {startTimerTick: 301} : undefined);

    }

    function updatePasswordStrength(strength, $context) {

        const {className} = strength;
        const $passwordWrapper = $('.password-wrapper', $context).removeClass('strengthen error');
        const $passwordStrength = $('.password-strength', $passwordWrapper).addClass('hidden');
        const $passwordStrengthIcon = $('i', $passwordStrength);
        const $passwordStrengthText = $('.password-strength-text', $passwordStrength);
        const $passwordNotStored = $('.password-not-stored', $passwordWrapper);

        $passwordNotStored.addClass('hidden');

        $passwordStrengthIcon.attr('class', 'sprite-fm-mono icon-size-18');
        $passwordStrength.attr('class', 'password-strength');

        if (className && className.startsWith('good')) {
            $passwordStrength.addClass(className);

            if (className === 'good1') {
                $passwordWrapper.addClass('strengthen');
                $passwordStrengthIcon.addClass('icon-alert-triangle-thin-outline');
                $passwordStrengthText.text(l.weak_pass_try_stronger);
            }
            else if (className === 'good2' || className === 'good3') {
                $passwordWrapper.addClass('strengthen');
                $passwordStrengthIcon.addClass('icon-alert-circle-thin-outline');
                $passwordStrengthText.safeHTML(l[1121]);
                $passwordNotStored.removeClass('hidden');
            }
            else {
                $passwordStrengthIcon.addClass('icon-check-circle-thin-outline');
                $passwordStrengthText.safeHTML(l.this_is_strong_password);
                $passwordNotStored.removeClass('hidden');
            }
        }
        else if (typeof strength === 'string') {
            $passwordStrengthIcon.addClass('icon-alert-triangle-thin-outline');
            $passwordStrengthText.text(strength);

        }
        else {
            $passwordStrengthIcon.addClass('icon-alert-triangle-thin-outline');
            $passwordStrengthText.text(l.err_no_pass);
            $passwordNotStored.removeClass('hidden');
        }
    }

    // export
    mega.ui.auth = mega.ui.auth || {};
    mega.ui.login = mega.ui.login || {};
    mega.ui.signup = mega.ui.signup || {};
    mega.ui.signup.showDialog = showRegisterDialog;
    mega.ui.signup.showLinkDialog = sendSignupLinkDialog;
    mega.ui.signup.updatePasswordStrength = updatePasswordStrength;

})(this);
