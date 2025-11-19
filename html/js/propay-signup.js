
pro.propay.signup = {
    newAccountCreation: false,

    isEphemeralPayment: false,

    accountCreationFinished: false,

    newAccount: false,

    currentcreation: null,
    current2FA: false,

    // Payments with no redirect
    requireAccountOnShow: new Set([
        'bitcoin'
    ]),

    /**
     * Check the payment type
     * @returns {number} - 1: require account to show, 2: require account to subscribe
     */
    checkPaymentType() {
        const currentGatewayName = pro.propay.currentGateway && pro.propay.currentGateway.gatewayName;

        if (!currentGatewayName) {
            return false;
        }

        // Requires an account has been finalised to show the payment method
        if (this.requireAccountOnShow.has(currentGatewayName)) {
            return 1;
        }

        // Create an account when the subscribe button is clicked
        return 2;
    },

    continueAccountCreation(cardValid, callback) {

        if (this.newAccountCreation) {
            return;
        }

        const currentGatewayId = pro.propay.currentGateway && pro.propay.currentGateway.gatewayId;

        if (currentGatewayId === addressDialog.gatewayId_stripe && !pro.propay.paymentButton) {
            if (cardValid === undefined) {
                return this.validateCard(undefined);
            }
            if (cardValid === false) {
                pro.propay.toggleContinueButtonLoading(false, 'accountCreation');
                return;
            }
        }
        this.newAccountCreation = true;

        if (!isEphemeral()) {
            pro.propay.signup.continuePaymentFlow();
        }

        const {email, password, name} = this.getNewAccountDetails();

        if (!email || !password || !name || pro.propay.showErrors()) {
            this.newAccountCreation = false;
            pro.propay.showErrors();
            pro.propay.toggleContinueButtonLoading(false, 'accountCreation');
            return false;
        }

        const [firstName, ...rest] = name.trim().split(' ');
        const lastName = rest.length ? rest.join(' ') : '';

        const callbackFunc = (res) => {
            if (res >= 0 || res === EINCOMPLETE) {
                pro.propay.signup.accountCreationFinished = true;
                if (res === EINCOMPLETE) {
                    security.login.checkLoginMethod(email, password, null, true,
                        loginFromEphemeral.old.startLogin,
                        loginFromEphemeral.new.startLogin);
                }
                security.register.cacheRegistrationData({
                    email,
                    password,
                });

                if (typeof callback === 'function') {
                    callback(res === 0);
                }
                else {
                    pro.propay.signup.continuePaymentFlow();
                }
                pro.propay.toggleContinueButtonLoading(false, 'accountCreation');

            }
            else if (res === -12){
                this.newAccountCreation = false;
                if (typeof callback === 'function') {
                    callback(false);
                }
                pro.propay.accountExists = true;
                this.attemptLogin();
            }
            else {
                this.newAccountCreation = false;
                if (typeof callback === 'function') {
                    callback(false);
                }
                pro.dialog.show(l.acc_creation_failed, l.try_again_not_charged, l.ok_button,
                    pro.propay.updatePayment.bind(pro.propay), 'error');
            }
        }

        security.register.startRegistration(firstName, lastName, email, password, true, callbackFunc, true);

        return true;
    },

    continuePaymentFlow() {

        const state = this.checkPaymentType();

        if (state === 1) {
            pro.propay.updatePayment();
            pro.propay.renderPlanInfo();
        }
        else if (state === 2) {
            pro.propay.proceedPayment(
                pro.propay.getPaymentType(pro.propay.currentGateway),
                pro.propay.currentGateway && pro.propay.currentGateway.gatewayId);
        }
    },

    onEphemeralAccountCreated() {
        'use strict';

        this.currentcreation = null;

        this.newAccount = true;

        pro.propay.updatePayment();
        pro.propay.skItems.billingAddress.endLoad();
        pro.propay.skItems.continueBtn.endLoad('signup');
    },

    async attemptAccountCreation() {
        'use strict';

        pro.propay.skItems.billingAddress.startLoad();
        pro.propay.skItems.continueBtn.startLoad('signup');

        if (this.currentcreation) {
            return;
        }

        this.currentcreation = true;

        // User is not logged in
        if (u_type === false) {
            security.register.createEphemeralAccount(this.onEphemeralAccountCreated.bind(this));
        }
        // User is already ephemeral
        else if (u_type === 0) {
            this.onEphemeralAccountCreated();
        }
    },

    async completeLogin(res) {
        'use strict';

        this.newAccount = false;

        // This is not completely accurate as it ignores the case of EEXIST when auth code already used
        // This case needs fixing for all 2FA locations
        if ([EFAILED, EMFAREQUIRED].includes(res)) {
            this.current2FA = true;
        }
        else if (res < 0) {
            this.current2FA = false;
        }

        if (is_mobile && (res === EFAILED || res === EMFAREQUIRED)) {
            pro.propay.signup.activeMobileLogin = true;

            pro.propay.requireconfirmation = false;
            mobile.settings.account.twofactorVerifyAction.init(false, res === EFAILED ? res : null)
            return false;
        }

        else if (is_mobile) {
            pro.propay.signup.activeMobileLogin = false;
            mega.ui.overlay.hide();
        }

        if (res === EMFAREQUIRED) {
            pro.propay.toggleContinueButtonLoading(false, 'accountCreation');
        }

        // It is expected that the user will not have confirmed their email yet (EINCOMPLETE: -13)
        if ((res !== EINCOMPLETE) && security.login.checkForCommonErrors(
            res,
            this.onAttemptLoginOld.bind(this),
            this.onAttemptLoginNew.bind(this)
        )) {
            // Show loading for address until here
            pro.propay.skItems.billingAddress.endLoad();
            return false;
        }

        if (u_type && pro.propay.planObj.isIn('validFeatures')) {
            // Remove free trial info if unavailable for logged in users
            await pro.loadMembershipPlans(false, true);
            const canProceed = await pro.propay.checkUserFeatures();
            if (!canProceed) {
                return false;
            }
            pro.propay.renderPlanInfo();
        }
        pro.propay.updatePayment(false, true);
        pro.propay.skItems.billingAddress.endLoad();
        pro.propay.skItems.continueBtn.endLoad('signup');
        pro.propay.toggleContinueButtonLoading(false, 'accountCreation');

        // Accept: 0: Success, ENOENT: Account not found, EINCOMPLETE: Incomplete registration
        const acceptedResults = [0, ENOENT, EINCOMPLETE];

        if (res !== false && (acceptedResults.includes(res) || res >= 0)) {
            if (res >= 0) {
                pro.propay.signup.accountCreationFinished = true;
            }

            if (res === ENOENT && pro.propay.accountExists) {
                pro.propay.showErrors({emailExists: true});
                pro.propay.accountExists = false;
                return false;
            }

            pro.propay.accountExists = false;
            this.initNewAccountDetails();

            if (u_attr) {
                let dialogShown = false;
                if (u_attr.b || u_attr.pf) {
                    addressDialog.closeDialog();

                    const currentPlanName = pro
                        .getProPlanName(u_attr.b ? pro.ACCOUNT_LEVEL_BUSINESS : pro.ACCOUNT_LEVEL_PRO_FLEXI);

                    dialogShown = true;
                    pro.dialog.show(
                        l.already_have_x_sub.replace('%1', currentPlanName),
                        l.cant_sub_aready_on_pf_or_b.replace('%1', currentPlanName),
                        l.ok_button,
                        () => {
                            fm_fullreload();
                        },
                        'error'
                    );

                    return false;
                }
                else if (u_attr.p) {
                    const {subs} = await pro.propay.getUserPlanInfo();

                    if (subs.length) {
                        dialogShown = true;
                        pro.dialog.show(l.have_active_sub_title, l.have_active_sub_msg
                            .replace('%1', pro.getProPlanName(u_attr.p)), [
                            {text: l.subscribe_btn, onClick: pro.propay.updatePayment.bind(pro.propay)},
                            {text: l.dont_subscribe, onClick: () => {addressDialog.closeDialog(); loadSubPage('fm');}},
                        ], null, 'warninga');
                    }
                }

                // If the user was logged in and no other dialog is shown, inform them of the login
                if (!dialogShown) {
                    pro.dialog.show(l.welcome_back, l.alr_have_acc_so_logged_in);
                }
            }
        }
        else if (res === EEXIST) {
            pro.propay.showErrors({emailExists: true});
        }
        else {
            console.warn('Unexpected result', res);
        }

        this.initNewAccountDetails();
    },

    onAttemptLoginOld(email, password, pinCode, rememberMe, salt) {
        this.onAttemptLogin('old', email, password, pinCode, rememberMe, salt);
    },

    onAttemptLoginNew(email, password, pinCode, rememberMe, salt) {
        this.onAttemptLogin('new', email, password, pinCode, rememberMe, salt);
    },

    async onAttemptLogin(type, email, password, pinCode, rememberMe, salt) {
        'use strict';

        if (type === 'old') {
            postLogin(email, password, pinCode, rememberMe).then(this.completeLogin.bind(this)).catch(tell);
        }
        else {
            security.login.startLogin(email, password, pinCode, rememberMe, salt, this.completeLogin.bind(this));
        }
    },

    attemptLogin() {
        'use strict';

        const email = $('.email input', this.$accountDetailsDiv).val().trim();
        const password = $('.password input', this.$accountDetailsDiv).val();

        if (!email || !password) {
            pro.propay.updatePayment(true);
            pro.propay.skItems.continueBtn.endLoad('signup');
            pro.propay.skItems.billingAddress.endLoad();
            return;
        }

        security.login.checkLoginMethod(
            $('.email input', this.$accountDetailsDiv).val().trim(),
            $('.password input', this.$accountDetailsDiv).val(),
            null,
            true,
            this.onAttemptLoginOld.bind(this),
            this.onAttemptLoginNew.bind(this)
        );

        return true;
    },

    validatePassword(password) {
        delete this.isValid;
        let isValid = security.isValidPassword(password, password, true);
        if ((isValid === true) && (typeof zxcvbn === 'function')) {
            return classifyPassword(password);
        }
        else {
            this.isValid = isValid;
            return isValid;
        }
    },

    updatePasswordStrength(strength) {
        const {className} = strength;

        const $passwordWrapper = $('.password-wrapper', this.$accountDetailsDiv)
            .removeClass('strengthen');
        const $passwordStrength = $('.password-strength', $passwordWrapper)
            .addClass('hidden')
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
            else if ((className === 'good2') || (className === 'good3')) {
                $passwordWrapper.addClass('strengthen');
                $passwordStrengthIcon.addClass('icon-alert-circle-thin-outline');
                $passwordStrengthText.safeHTML(l['1121']);
                $passwordNotStored.removeClass('hidden')
            }
            else {
                $passwordStrengthIcon.addClass('icon-check-circle-thin-outline');
                $passwordStrengthText.safeHTML(l.this_is_strong_password);
                $passwordNotStored.removeClass('hidden')
            }
        }
        else if (typeof strength === 'string') {
            $passwordStrengthIcon.addClass('icon-alert-circle-thin-outline');
            $passwordStrengthText.text(strength);
            return;
        }
        else {
            $passwordStrengthIcon.addClass('icon-alert-triangle-thin-outline');
            $passwordStrengthText.text(l.err_no_pass);
            $passwordNotStored.removeClass('hidden')
        }
    },

    initHandlePasswordStrength() {

        $('#propay-create-account-password', this.$accountDetailsDiv).rebind('input.passwordStrength', (ev) => {
            this.updatePasswordStrength(this.validatePassword(ev.target.value));
        });
    },

    validateEmail(email) {
        return isValidEmail(email);
    },

    validateName(name) {
        return name.trim().split(' ').length >= 2;
    },

    getNewAccountDetails() {
        'use strict';

        const name = $('.name input', this.$accountDetailsDiv).val().trim();
        const email = $('.email input', this.$accountDetailsDiv).val().trim();
        const password = $('.password input', this.$accountDetailsDiv).val();

        if (name || email || password) {
            return {
                name,
                email,
                password,
            };
        }

        return false;
    },

    lockPasswordInput() {
        const $passwordWrapper = $('.password-wrapper', this.$accountDetailsDiv);
        $passwordWrapper.addClass('locked');

        const passwordInput = $('.password input', this.$accountDetailsDiv);
        passwordInput.attr('readonly', true);
    },

    async validateCard(valid) {

        valid = valid === undefined ? await pro.megapay.req('validateCard') : valid;

        this.continueAccountCreation(valid);
    },

    checkShowAccountDetails() {

        const hideDetails = u_type
            || sessionStorage.getItem('acc_creation_bitcoin')
            || localStorage.awaitingConfirmationAccount !== undefined;

        if (hideDetails) {
            this.$accountDetailsDiv.addClass('hidden');
            return false;
        }

        return true;
    },

    getIsNewAccount() {
        'use strict';
        return (u_type === false) || (!u_type && !localStorage.awaitingConfirmationAccount);
    },

    initNewAccountDetails() {
        'use strict';

        this.$accountDetailsDiv = $('.create-account-wrapper', pro.propay.$page);

        pro.propay.isNewAccount = this.getIsNewAccount();

        $('.new-account-tos', pro.propay.$page).toggleClass('hidden', !pro.propay.isNewAccount);
        $('.title.no-create-account', pro.propay.$page).toggleClass('hidden', pro.propay.isNewAccount);
        $('.title.create-account', pro.propay.$page).toggleClass('hidden', !pro.propay.isNewAccount);

        if (!this.checkShowAccountDetails()) {
            return;
        }

        pro.propay.sk.initSk(this.$accountDetailsDiv[0]);

        $('.name input', this.$accountDetailsDiv).val('');
        $('.email input', this.$accountDetailsDiv).val('');
        $('.password input', this.$accountDetailsDiv).val('');
        this.$accountDetailsDiv.removeClass('hidden');

        $('.password .pass-visible', this.$accountDetailsDiv).addClass('icon-eye-hidden');
        $('.password .pass-visible', this.$accountDetailsDiv).removeClass('icon-eye-reveal');

        $('.password .pass-visible', this.$accountDetailsDiv).rebind('click.togglePassV', function() {
            const input = this.closest('.password').querySelector('input');
            const isVisible = this.classList.toggle('icon-eye-reveal');

            input.type = isVisible ? 'text' : 'password';

            // Toggle the opposite class as well (if you're switching between reveal/hide icons)
            this.classList.toggle('icon-eye-hidden', !isVisible);
        });

        $('#propay-create-account-name', this.$accountDetailsDiv)
            .rebind('input.accountNameInput', (ev) => {
                $(ev.target).closest('.name-wrapper').removeClass('error');
            });

        $('#propay-create-account-email', this.$accountDetailsDiv)
            .rebind('input.accountEmailInput', (ev) => {
                $(ev.target).closest('.email-wrapper').removeClass('error');
            });

        this.initHandlePasswordStrength();
        this.initLoginButton();
    },

    initLoginButton() {
        const $loginButton = $('.login .login-link', this.$accountDetailsDiv);

        $loginButton.rebind('click.loginButton', () => {
            if (is_mobile) {
                login_next = page;
                loadSubPage('login');
            }
            else {
                showLoginDialog(null, null);
            }
        });
    },
};

pro.megapay = {
    iframe: null,
    currentRequests: {},
    boundListener: null, // store the bound function

    listenerFunc(resEvent) {
        const {origin} = resEvent;

        if (!resEvent || (origin !== addressDialog.gatewayOrigin) || typeof resEvent.data !== 'string' || !resEvent.data.startsWith('res^')) {
            return;
        }

        let {data} = resEvent;
        try {
            data = JSON.parse(data.slice(4));
        }
        catch (e) {
            eventlog(500985, data);
            if (d) {
                console.error('Error parsing response', e);
            }
        }

        if (!data.__megapay) {
            return;
        }

        const callback = this.currentRequests[data.id];
        if (callback) {
            callback(data.res);
            delete this.currentRequests[data.id];
        }
    },

    init() {
        const iframe = document.getElementById('stripe-widget');
        if (!iframe) {
            return false;
        }

        this.iframe = iframe;

        if (!this.boundListener) {
            // Store the bound listener so that it can be removed later
            this.boundListener = this.listenerFunc.bind(this);
            window.addEventListener('message', this.boundListener);
        }

        return true;
    },

    async req(payload) {
        if (!this.iframe) {
            return Promise.reject('Iframe not initialized');
        }

        const id = crypto.randomUUID();
        const message = {__megapay: true, id, payload};

        this.iframe.contentWindow.postMessage(`req^${JSON.stringify(message)}`, addressDialog.gatewayOrigin);

        return new Promise((resolve) => {
            this.currentRequests[id] = (res) => {
                resolve(res);
                delete this.currentRequests[id];
            };
        });
    },

    destroy() {
        if (this.boundListener) {
            window.removeEventListener('message', this.boundListener);
            this.boundListener = null;
        }
        this.iframe = null;

        // Reject all pending requests
        for (const id in this.currentRequests) {
            this.currentRequests[id](EEXPIRED);
        }
    }
};

mBroadcaster.once('pagechange', () => {
    pro.megapay.destroy();
});
