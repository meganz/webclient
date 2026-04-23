var support = (function() {
    'use strict';

    let langGha, $deviceInput, $emailInput, acceptReadArticlesCheckbox, otpInputs,
        $defaultHiddenElements, $hiddenWhenOtherCategory, $messageInputTextArea, successCtaContainer,
        $hideOnShowEmailVerifyForm, $hideOnEmailVerifyCall, submittedBlockPrimaryCta, submittedBlockSecondaryCta;
    let dds = {category: null, issue: null};
    let $elsToUnbind = $();
    let supportType = null;
    let selectedCategory = null;
    let tooManyOtpResendMsgReqTimer = null;

    const ns = {};
    const minLetters = 30;
    const dom = {};
    const bind = ($el, event, handler) => {

        $el.rebind(event, handler);
        $elsToUnbind = $elsToUnbind.add($el);
        return $el;
    };
    const toDropdownOptions = (items, prefix = '', key = 'id', label = 'name') => Object
        .values(items).reduce((acc, v) => {

            acc[`${prefix}${v[key]}`] = v[label];
            return acc;
        }, {});
    const collateDomRefs = () => {
        const $mainLayout = $('#mainlayout').addClass('get-support');
        dom.$page = $('.get-support-block', $mainLayout);
        // submit flow
        dom.$category = $('.support-category', dom.$page);
        dom.$issue = $('.support-issue', dom.$page);
        dom.$issueBlock = dom.$issue.closest('.input-block');
        dom.$device = $('.support-device', dom.$page);
        dom.$related = $('.support-related', dom.$page);
        dom.$relatedList = $('.list', dom.$related);
        dom.$articlesRead = $('.accept-articles-read', dom.$page);
        dom.$message = $('.support-message', dom.$page);
        dom.$messageTxtAreaWrapper = $('.message', dom.$message);
        dom.$supportMessageClear = $('.message.mega-textarea .close-btn', dom.$message);
        dom.$messageError = $('.error', dom.$message);
        dom.$submitButton = $('button.cta', dom.$page);
        dom.$submissionFlow = $('.submission.request', dom.$page);
        dom.$successBlock = $('.success-block', dom.$page);
        dom.$verifiedEmail = $('.verified-email span', dom.$page);
        dom.$deviceInfoInputWrapper = $('.device-info', dom.$device);
        // verify flow
        dom.$verifyFlow = $('.verify-flow', dom.$page);
        dom.$email = $('.submit-email', dom.$page);
        dom.$emailInputWrapper = $('.email-input', dom.$verifyEmailForm);
        dom.$emailError = $('.error', dom.$email);
        dom.$errEmailInput = $('span', dom.$emailError);
        dom.$verifyFlowLanding = $('.verify-flow.landing', dom.$page);
        dom.$showVerifyFormLink = $('.show-form', dom.$verifyFlowLanding);
        dom.$verifyEmailForm = $('.verify-flow.email', dom.$page);
        dom.$verifyOtpForm = $('.verify-flow.otp', dom.$page);
        dom.$otpInputs = $('input.otp', dom.$verifyOtpForm);
        dom.$verifyOtpInput = $('button.cta.verify', dom.$verifyOtpForm);
        dom.$doVerifyEmailButton = $('.cta.verify-email', dom.$verifyEmailForm);
        dom.$errOnVerificationRequest = $('.error.api', dom.$verifyEmailForm);
        dom.$errOnVerificationRequestMsg = $('span', dom.$errOnVerificationRequest);
        dom.$tooManyOtpRequests = $('.too-many-otp-req', dom.$verifyOtpForm);
        dom.$tooManyOtpRequestsWarn = $('.timer', dom.$tooManyOtpRequests);
        dom.$changeEmailButton = $('.cta.change-email', dom.$verifyOtpForm);
        dom.$resendOtpCta = $('button.cta.resend', dom.$verifyOtpForm);
        dom.$otpError = $('.fields .error', dom.$verifyOtpForm);
        dom.$otpErrorMessage = $('span', dom.$otpError);
    };
    const createMobileDropdown = ($node, items, selected, onSelected, titleText) => new MegaMobileDropdown({
        selected,
        sheetHeight: 'auto',
        invisible: true,
        parentNode: $node[0],
        dropdownItems: items,
        dropdownOptions: {
            titleText,
            placeholderText: l[1278]
        },
        onSelected,
        listContainerClass: 'support-select'
    });
    const createSupportDropdown = (type, items, selected, onSelected) => {

        const $node = dom[`$${type}`];
        if (is_mobile) {
            if (dds[type]) {
                dds[type].destroy();
            }

            dds[type] = createMobileDropdown($node, items, selected, onSelected, l[type]);
            bind($node, 'click.support', () => dds[type].trigger('dropdown'));

            return;
        }

        window.createDropdown($('.mega-input-dropdown', $node), {
            placeholder: l[1278],
            items,
            selected: `${selected}`
        });
        bindDropdownEvents($node, undefined, undefined, undefined, true);
        bind($node, 'click.support', $e => {

            const {value} = $e.target.dataset;
            if (!value) {
                return;
            }
            onSelected(value);
        });
    };
    const showVerifyEmailForm = e => {

        e.preventDefault();
        $hideOnShowEmailVerifyForm.addClass('hidden');
        dom.$verifyEmailForm.removeClass('hidden');
        $emailInput.focus();
        $emailInput.val('');
        dom.$tooManyOtpRequests.addClass('hidden');
        dom.$resendOtpCta.removeClass('hidden');
        clearInterval(tooManyOtpResendMsgReqTimer);
    };
    const clearOtpInputs = () => otpInputs.forEach(o => o.$input.val('').megaInputsHideError());
    const beginEmailVerification = async() => {

        const emailValue = $emailInput.val().trim();
        const safeEmail = $('<span class="email">').text(emailValue).prop('outerHTML');
        $('.otp-sent-message', dom.$verifyOtpForm)
            .safeHTML(l.support_pg_verify_otp_description.replace('[E][/E]', safeEmail));
        dom.$errOnVerificationRequestMsg.text('');
        dom.$tooManyOtpRequests.addClass('hidden');
        dom.$resendOtpCta.removeClass('hidden');
        clearInterval(tooManyOtpResendMsgReqTimer);
        $hideOnEmailVerifyCall.addClass('hidden');
        clearOtpInputs();
        dom.$errEmailInput.text('');
        if (emailValue === '' || !isValidEmail(emailValue)) {
            dom.$errEmailInput.text(emailValue === '' ? l.err_no_email_provided : l[1100]);
            dom.$emailError.removeClass('hidden');
            $emailInput.focus();
            return false;
        }

        dom.$emailError.addClass('hidden');
        loadingDialog.show();
        const response = await api.send({a: 'ssv', e: emailValue}).catch(ex => {

            if (ex === -26) { // mfa needed
                dom.$verifyEmailForm.addClass('hidden');
                clearOtpInputs();
                dom.$verifyOtpForm.removeClass('hidden');
                return;
            }

            if (ex === -6) {
                dom.$errOnVerificationRequest.removeClass('hidden');
                dom.$errOnVerificationRequestMsg.text(l.err_too_many_submissions_via_email);
                dom.$tooManyOtpRequests.removeClass('hidden');
                dom.$resendOtpCta.addClass('hidden');

                let totalSeconds = 10 * 60;
                dom.$tooManyOtpRequestsWarn.safeHTML(
                    l.too_many_otp_resend_requests_sub.replace('%1', '<b>10:00</b>')
                );
                tooManyOtpResendMsgReqTimer = setInterval(() => {
                    const minutes = Math.floor(totalSeconds / 60);
                    const seconds = totalSeconds % 60;
                    const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                    dom.$tooManyOtpRequestsWarn.safeHTML(
                        l.too_many_otp_resend_requests_sub.replace('%1', `<b class="caption-b-l">${formatted}</b>`)
                    );
                    totalSeconds--;
                    if (totalSeconds < 0) {
                        dom.$tooManyOtpRequests.addClass('hidden');
                        dom.$resendOtpCta.removeClass('hidden');
                        dom.$tooManyOtpRequestsWarn.empty();
                        clearInterval(tooManyOtpResendMsgReqTimer);
                    }
                }, 1000);
            }
            else {
                tell(ex);
            }
        });
        loadingDialog.hide();

        if (response === 0) {
            await ns._initLoggedInUI(emailValue);
        }
    };
    const doVerifyOtp = async() => {

        const e = $emailInput.val().trim();
        const otp = otpInputs.map(i => i.$input.val()).join('');
        if (otp.length < 4) {
            otpInputs[0].$input.megaInputsShowError(l.err_otp_incomplete);
            return;
        }

        loadingDialog.show();
        const errMsgs = {'-11': l.err_otp_invalid, '-8': l.err_otp_expired, '-4': l.err_too_many_submissions_via_email};
        const response = await api.send({a: 'ss2fa', c: otp, e})
            .catch(ex => {

                // e === -2 => invalid args
                if (errMsgs[ex]) {
                    otpInputs[0].$input.megaInputsShowError(errMsgs[ex]);
                }
                else {
                    tell(ex);
                }
            });
        loadingDialog.hide();
        if (response === 0) {
            await ns._initLoggedInUI(e);
        }
    };
    const createOtpInput = () => {

        otpInputs = new mega.ui.MegaInputs(dom.$otpInputs, {
            onShowError: (m) => {

                otpInputs.forEach(o => o.$input.addClass('error'));
                dom.$otpError.removeClass('hidden');
                dom.$otpErrorMessage.text(m);
                loadingDialog.hide();
            },
            onHideError: () => {

                otpInputs.forEach(o => o.$input.removeClass('error'));
                dom.$otpError.addClass('hidden');
                dom.$otpErrorMessage.text('');
                loadingDialog.hide();
            },
        });
        otpInputs = otpInputs.reverse();

        // Bind fieldset events
        const len = otpInputs.length;
        for (let i = 0; i < len; i++) {

            const current = otpInputs[i];
            const prev = otpInputs[Math.max(0, i - 1)];
            const next = otpInputs[i + 1];
            const isLast = i === otpInputs.length - 1;

            bind(current.$input, 'keydown.verifyPin', (e) => {

                if (e.key === 'Backspace' && e.target.value === '') {
                    prev.$input.focus();
                }
                if (e.key === 'Enter') {
                    doVerifyOtp().catch(dump);
                }
            });
            bind(current.$input, 'focus.selectValue', e => e.target.select());
            bind(current.$input, 'input.fieldsetAction', e => {

                const [head, ...rest] = e.target.value;
                current.$input.megaInputsHideError();
                e.target.value = head || '';
                if (head !== undefined && !isLast && next) {
                    next.$input.focus();
                    if (rest.length) {
                        next.$input.val(rest.join('')).trigger('input.fieldsetAction');
                    }
                }
            }).val('').megaInputsHideError();
        }
    };
    const getSupportData = async() => {

        const response = await api.send({ a: 'gha', l: window.kbLang || lang }).catch(tell) || -1;
        if (response === -1 || !Array.isArray(response)) {
            return false;
        }
        const other = { id: -1, name: l[2007], parentId: 0, popularArticles: [] };
        const [language, raw] = response;
        dom.$category.closest('.input-block').removeClass('hidden');
        langGha = language;

        const menu = Object.create(null);
        for (const item of Object.values(raw)) {

            const {id, parentId} = item;
            item.name = escapeHTML(item.name);
            if (parentId === 0) {
                menu[id] = {...item, subCategories: menu[id] && menu[id].subCategories || {}};
                continue;
            }
            if (!menu[parentId]) {
                menu[parentId] = {subCategories: {}};
            }
            menu[parentId].subCategories[id] = item;
        }
        for (const id in menu) {

            if (!Object.keys(menu[id].subCategories).length) {
                delete menu[id];
            }
        }
        menu[-1] = other;
        return {menu, raw: {'-1': other, ...raw}};
    };
    const createIssueDropdown = (items, selected, onSelected) => {

        createSupportDropdown('issue', items, selected, onSelected);
        dom.$issueBlock.removeClass('hidden');
        if (acceptReadArticlesCheckbox) {
            acceptReadArticlesCheckbox.input.classList.add('hidden');
            acceptReadArticlesCheckbox.checked = false;
        }
        $(dom.$articlesRead).add($defaultHiddenElements).addClass('hidden');
    };
    const renderRelatedArticles = (raw, id) => {

        raw[id].popularArticles.forEach(p => {

            const listItem = mCreateElement(
                'div',
                { class: 'wrapper flex items-center' },
                [mCreateElement('i', { class: 'sprite-fm-mono icon-dot' })],
                dom.$relatedList[0]
            );
            const parsed = new URL(p.link, window.location.origin);
            MegaLink.factory({
                parentNode: listItem,
                text: escapeHTML(p.title), // not looping related articles inside getSupportData
                type: 'text',
                target: '_blank',
                href: `https://help.mega.io${parsed.pathname}`,
                componentClassname: 'related-article'
            });
        });
        dom.$related.removeClass('hidden');
    };
    // public function to start the logged-in/verified email flow
    ns._initLoggedInUI = async function(verifiedEmail) {

        // render success block
        successCtaContainer = document.querySelector('.success-block .buttons');
        submittedBlockPrimaryCta = MegaLink.factory({
            parentNode: successCtaContainer,
            text: l[164],
            href: 'fm',
            componentClassname: 'cta mio-button lg primary',
            icon: 'sprite-fm-mono icon-cloud-drive',
        });
        submittedBlockSecondaryCta = MegaLink.factory({
            parentNode: successCtaContainer,
            text: l[384],
            href: window.kbLang ? l.megakb_origin : l.mega_help_host,
            target: '_blank',
            componentClassname: 'cta mio-button lg secondary',
            icon: 'sprite-fm-mono icon-info',
        });
        if (verifiedEmail) {
            dom.$verifiedEmail.text(verifiedEmail);
            dom.$verifiedEmail.closest('.verified-email').removeClass('hidden');
        }
        dom.$verifyFlow.addClass('hidden');
        dom.$submissionFlow.removeClass('hidden');
        $hiddenWhenOtherCategory = $('.other-hidden', dom.$page);
        $defaultHiddenElements = $('.common-hidden', dom.$page);

        loadingDialog.show();
        const response = await getSupportData();
        if (!response) {
            loadingDialog.hide();
            return;
        }
        const {raw, menu} = response;
        const categoryOptions = toDropdownOptions(menu);
        const issueClick = id => {

            if (is_mobile) {
                id = dds.issue.selected;
            }

            dom.$relatedList.empty();
            supportType = Number(id);
            renderRelatedArticles(raw, id);
            dom.$articlesRead.removeClass('hidden');
            dom.$issue.children('span').first().addClass('dirty');

            if (is_mobile) {
                dom.$issue.children('span').first().text(raw[id].name);
            }
        };
        const createIssueDropDown = (id, selected) => {

            if (id === '-1') {
                supportType = -1;
                $defaultHiddenElements.removeClass('hidden');
                $hiddenWhenOtherCategory.addClass('hidden');
                return;
            }

            createIssueDropdown(toDropdownOptions(menu[id].subCategories), selected, issueClick);
        };
        const categoryClick = id => {
            id = is_mobile ? dds.category.selected : id;
            if (selectedCategory === id) {
                return false;
            }
            if (is_mobile) {
                dom.$issue.children('span').first().text(l[1278]);
            }

            selectedCategory = id;
            supportType = '';
            dom.$relatedList.empty();
            renderRelatedArticles(raw, id);
            createIssueDropDown(id);
            dom.$category.children('span').first().addClass('dirty');

            if (is_mobile) {
                dom.$category.children('span').first().text(raw[id].name);
            }
        };
        const submit = async() => {

            const emailValue = verifiedEmail || u_type && u_attr && u_attr.email;
            const message = $messageInputTextArea.val().trim();

            dom.$messageError.addClass('hidden');
            if (message.length < minLetters) {
                $messageInputTextArea.focus();
                dom.$messageError.removeClass('hidden');
                dom.$messageTxtAreaWrapper.addClass('error-border');
                return false;
            }
            dom.$submitButton.addClass('disabled');
            const requestOptions = {
                a: 'sse',
                v: 2,
                m: base64urlencode(to8(message)),
                c: supportType,
                e: emailValue,
                d: base64urlencode(to8($deviceInput.val().trim())),
                l: langGha
            };
            loadingDialog.show();
            const response = await api.req(requestOptions).catch(ex => {
                if (ex === -6) {
                    msgDialog(
                        'warningb',
                        l[34],
                        l.too_many_support_requests,
                        l[253]
                    );
                }
                else {
                    tell(ex);
                }
                return false;
            });
            loadingDialog.hide();
            if (response && response.result === 0) {
                // show success view
                dom.$submissionFlow.addClass('hidden');
                dom.$successBlock.removeClass('hidden');
                document.querySelector('#startholder').scrollTo({top: 0, behavior: 'smooth'});
            }
            dom.$submitButton.removeClass('disabled');
            return false;
        };

        // create device input
        if (!$deviceInput) {
            const input = mCreateElement('input', {
                type: 'text',
                class: 'underlinedText no-title-top',
                placeholder: l.support_page_device_input_name_placeholder,
                'data-wrapper-class': 'box-style mobile'
            }, dom.$deviceInfoInputWrapper[0]);
            $deviceInput = new mega.ui.MegaInputs($(input)).$input;
        }

        // create message input
        dom.$messageTxtAreaWrapper.empty();
        const messageInput = mCreateElement('textarea', {
            class: 'textArea no-title-top',
            placeholder: l.support_page_message_input_placeholder,
        }, mCreateElement('div', {
            class: 'box-style mobile textarea-scroll'
        }, dom.$messageTxtAreaWrapper[0]));
        $messageInputTextArea = $(messageInput);
        initTextareaScrolling($messageInputTextArea);

        // create accept checkbox
        if (!acceptReadArticlesCheckbox) {
            acceptReadArticlesCheckbox = new MegaCheckbox({
                parentNode: dom.$articlesRead[0],
                componentClassname: 'mega-checkbox',
                checkboxName: 'accept-articles-read',
                labelTitle: l.support_page_related_articles_read
            });
        }

        // prepopulate form, if the user is coming from help-center
        if (window.kbCatId && raw[window.kbCatId]) {
            const {kbCatId} = window;
            const item = raw[kbCatId];
            const isRoot = item.parentId === 0;
            const category = isRoot ? item : raw[item.parentId];
            const issue = isRoot ? null : item;

            delete window.kbCatId;
            delete window.kbPostId;

            createSupportDropdown('category', categoryOptions, category.id, categoryClick);
            categoryClick(category.id);
            if (is_mobile) {
                dom.$category.children('span').first().text(category.name);
            }
            if (issue) {
                createIssueDropDown(category.id, `${issue.id}`);
                issueClick(`${issue.id}`);
                acceptReadArticlesCheckbox.checked = kbCatId;
                $defaultHiddenElements.removeClass('hidden');
            }
        }
        else {
            createSupportDropdown('category', categoryOptions, undefined, categoryClick);
        }
        loadingDialog.hide();

        // register events for support flow
        acceptReadArticlesCheckbox.on('toggle.change', (e) => {
            if (e.data) {
                $defaultHiddenElements.removeClass('hidden');
                return;
            }
            $defaultHiddenElements.addClass('hidden');
        });
        bind(dom.$submitButton, 'click.support', () => submit().catch(dump));
        bind($messageInputTextArea, 'input.support', () => {
            if ($messageInputTextArea.val().length > 0) {
                dom.$supportMessageClear.removeClass('hidden');
                dom.$messageError.addClass('hidden');
                dom.$messageTxtAreaWrapper.removeClass('error-border');
            }
            else {
                dom.$supportMessageClear.addClass('hidden');
            }
        });
        bind(dom.$supportMessageClear, 'click.support', () => {
            $messageInputTextArea.val('');
            $messageInputTextArea.focus();
            $messageInputTextArea.trigger('input');
            dom.$messageError.addClass('hidden');
            dom.$messageTxtAreaWrapper.removeClass('error-border');
        });
    };

    // public function to start the non-logged-in
    ns._initNonLoggedInUI = async() => {

        // render verify flow
        dom.$submissionFlow.addClass('hidden');
        dom.$verifyFlowLanding.removeClass('hidden');
        dom.$verifyEmailForm.addClass('hidden');
        // create email input
        if (!$emailInput) {
            const input = mCreateElement('input', {
                type: 'email',
                class: 'underlinedText no-title-top',
                placeholder: l[16343],
                'data-wrapper-class': 'user-email box-style mobile'
            }, dom.$emailInputWrapper[0]);
            $emailInput = new mega.ui.MegaInputs($(input)).$input;
        }
        if (!otpInputs) {
            createOtpInput();
        }
        $hideOnShowEmailVerifyForm = dom.$verifyFlowLanding.add(dom.$verifyOtpForm);
        $hideOnEmailVerifyCall = dom.$errOnVerificationRequest.add(dom.$verifyFlowLanding);

        // register events
        bind(dom.$showVerifyFormLink, 'click.support', showVerifyEmailForm);
        bind(dom.$doVerifyEmailButton, 'click.support', () => beginEmailVerification().catch(dump));
        bind(dom.$changeEmailButton, 'click.support', showVerifyEmailForm);
        bind(dom.$verifyOtpInput, 'click.support', () => doVerifyOtp().catch(dump));
        bind(dom.$resendOtpCta, 'click.support', () => beginEmailVerification().catch(dump));
        bind($emailInput, 'keydown.emailEnter', (e) => {

            if (e.key === 'Enter') {
                beginEmailVerification().catch(dump);
                return false;
            }
        });
    };

    ns.init = async() => {
        if (ns._onLoginListener) {
            mBroadcaster.removeListener(ns._onLoginListener);
        }
        if (!self.u_attr) {
            ns._onLoginListener = mBroadcaster.addListener('login2', () => {
                ns.destroy();
                ns.init();
            });
        }

        collateDomRefs();
        if (is_mobile) {
            MegaMobileHeader.init(true);
        }

        const res = await(u_attr ?  ns._initLoggedInUI :  ns._initNonLoggedInUI)().catch(dump);
        mBroadcaster.removeListener(ns._pageChangeListener);
        ns._pageChangeListener = mBroadcaster.addListener('pagechange', ns.destroy);

        return res;
    };

    ns.destroy = page => {

        if (page === 'support') {
            return;
        }

        mBroadcaster.removeListener(ns._onLoginListener);
        mBroadcaster.removeListener(ns._pageChangeListener);
        $('#mainlayout').removeClass('get-support');

        clearInterval(tooManyOtpResendMsgReqTimer);
        $elsToUnbind.off();
        $elsToUnbind = $();
        if (dom.$page) {
            dom.$page[0].componentSelectorAll('.mega-component').forEach(component => component.destroy());
        }
        if (submittedBlockPrimaryCta) {
            submittedBlockPrimaryCta.destroy();
        }
        if (submittedBlockSecondaryCta) {
            submittedBlockSecondaryCta.destroy();
        }
        dom.$deviceInfoInputWrapper.empty();
        dom.$messageTxtAreaWrapper.empty();
        dom.$emailInputWrapper.empty();
        const keys = Object.keys(dom);
        for (let i = keys.length - 1; i >= 0; i--) {
            const k = keys[i];
            dom[k] = null;
        }
        dds = {category: null, issue: null};
        acceptReadArticlesCheckbox = null;
        $emailInput = null;
        $messageInputTextArea = null;
        $deviceInput = null;
        otpInputs = null;
        $defaultHiddenElements = null;
        $hiddenWhenOtherCategory = null;
        $hideOnShowEmailVerifyForm = null;
        $hideOnEmailVerifyCall = null;
        supportType = null;
        selectedCategory = null;
        submittedBlockPrimaryCta = null;
        submittedBlockSecondaryCta = null;
        successCtaContainer = null;
    };

    return ns;
})();
