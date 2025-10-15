/**
 * @property {function} mega.ui.key.step1
 * @property {function} mega.ui.key.step2
 */
lazy(mega.ui, 'key', () => {
    'use strict';

    const parentNode = document.querySelector('.registration-generating-keys .widget-holder');
    const redirect = () => {
        const { p, b } = u_attr || {};
        let next = '';
        if (p && p >= 1 && p <= 4) {
            next = 'fm';
        }
        // if this is a sub-user in a business account.
        // either This is the master  --> wont get the confirmation link until we receive successful payment
        // or, this is a sub-user --> no need to ask them anything after this point
        else if (b) {
            next = page === 'fm' ? 'start' : 'fm';
        }
        // Load the Pro page to choose plan, or the redeem page if a pending voucher is found.
        else if (localStorage.voucher) {
            next = 'voucher';
        }
        else {
            next = 'pro';
        }
        loadSubPage(next);
    };
    if (!parentNode) {
        console.error('Cannot attach overlay to page');
        return {
            step1() {
                loadingDialog.show('keygen');
            },
            step2() {
                loadingDialog.hide('keygen');
                redirect();
            }
        };
    }
    const overlay = new MegaOverlay({
        parentNode,
        componentClassname: 'mega-overlay key-overlay',
        wrapperClassname: 'overlay overlay-container',
    });

    return {
        step1() {
            mega.ui.setTheme();
            const idx = Date.now() % 6;
            const { browser, version } = browserdetails(ua);
            const options = {
                name: 'key',
                classList: ['key-gen'],
                title: l.keygen_title,
                videoHeader: 'key-lock',
                contents: [
                    mCreateElement('div', { class: 'spinner-text' }, [
                        mCreateElement('i', {
                            class: 'sprite-fm-theme-after icon-loader-throbber-dark-outline-after loading'
                        }),
                        mCreateElement('span', false, [document.createTextNode(l.keygen_subtitle)])
                    ]),
                    mCreateElement('div', { class: 'trivia' }, [
                        mCreateElement('span', false, [document.createTextNode(l.encryption_trivia)]),
                        mCreateElement(
                            'span',
                            { class: 'trivia-info' },
                            [document.createTextNode(l[`encryption_trivia_${idx}`])]
                        )
                    ]),
                ],
            };
            if (browser === 'Safari' && parseInt(version.split('.').shift(), 10) < 16) {
                delete options.videoHeader;
                options.navImage = 'key-lock-fb';
            }
            overlay.show(options);
        },
        step2() {
            const langElem = document.querySelector('.bottom-page.key .change-language');
            if (langElem) {
                langElem.querySelector('span').textContent = getRemappedLangCode(lang);
                langElem.addEventListener('click', () => {
                    langDialog.show();
                });
                langElem.classList.remove('hidden');
            }
            overlay.removeClass(...overlay.addedClasses || []);
            overlay.parentNode.classList.add('recovery');
            const actionOptions = [
                {
                    text: l.later,
                    componentClassname: 'secondary',
                    className: 'secondary',
                    onClick() {
                        eventlog(500913);
                        const contents = [
                            mCreateElement('div', false, [document.createTextNode(l.recovery_skip_subtitle)]),
                            mCreateElement('div', { class: 'later-reminder' }, [
                                mCreateElement('i', { class: 'sprite-fm-mono icon-lightbulb-small-thin-outline' }),
                                mCreateElement(
                                    'span',
                                    false,
                                    [document.createTextNode(l.recovery_dl_later_desk)]
                                ),
                            ]),
                        ];
                        const options = {
                            name: 'recovery-key-skip',
                            classList: ['recovery-key'],
                            contents,
                            header: l.recovery_skip_title,
                            showClose: true,
                        };
                        const actionOptions = [
                            {
                                text: l.download_now,
                                componentClassname: 'secondary thin',
                                className: 'secondary thin',
                                onClick() {
                                    eventlog(500917);
                                    u_savekey();
                                    redirect();
                                    mega.ui.sheet.hide(options.name);
                                }
                            },
                            {
                                text: l.download_later,
                                componentClassname: 'thin',
                                className: 'thin',
                                onClick() {
                                    eventlog(500916);
                                    redirect();
                                    mega.ui.sheet.hide(options.name);
                                }
                            }
                        ];
                        if (is_mobile) {
                            options.actions = actionOptions;
                        }
                        else {
                            const parentNode = document.createElement('div');
                            parentNode.className = 'footer-buttons';
                            MegaButton.factory({ parentNode, ...actionOptions[0] });
                            MegaButton.factory({ parentNode, ...actionOptions[1] });
                            options.footer = {
                                slot: [parentNode]
                            };
                        }
                        mega.ui.sheet.show(options);
                    }
                },
                {
                    text: l.download_continue,
                    onClick() {
                        eventlog(500914);
                        u_savekey();
                        redirect();
                    }
                }
            ];
            const contents = [
                mCreateElement('div', { class: 'recovery-para' }, [document.createTextNode(l.recovery_key_page_para1)]),
                mCreateElement('div', { class: 'recovery-para' }, [parseHTML(l.recovery_key_page_para2)]),
            ];
            const options = {
                name: 'key',
                classList: ['recovery-key'],
                header: l.recovery_key_page_title,
                icon: 'recovery-key',
                centered: false,
                showClose: false,
                contents,
            };
            if (is_mobile) {
                options.actions = actionOptions;
            }
            else {
                const parentNode = document.createElement('div');
                parentNode.className = 'footer-buttons';
                MegaButton.factory({ parentNode, ...actionOptions[0] });
                MegaButton.factory({ parentNode, ...actionOptions[1] });
                options.footer = {
                    slot: [parentNode]
                };
            }
            overlay.show(options);
            clickURLs();
        }
    };
});

/** Initialise they keys required for operation. */
function init_key() {
    if (typeof u_k_aes === 'undefined') {
        return loadSubPage('start');
    }
    mega.ui.key.step1();

    if (typeof u_privk === 'undefined') {
        crypto_rsagenkey();
    }
    else {
        ui_keycomplete();
    }
}

/** Callback called on completion. */
function ui_keycomplete() {
    mega.ui.key.step2();

    // Sets the "Hide Recent Activity" toggle in Settings to `OFF` by default
    mBroadcaster.once('fm:initialized', () => {
        // The value for `showRecents` is `undefined` when toggle is `ON`
        mega.config.set('showRecents', 1);
    });

    const campaignTagger = () => {
        const parse = tryCatch((v) => JSON.parse(v));

        let utm = localStorage.uTagUTM || sessionStorage.uTagUTM;
        if (utm) {
            utm = parse(utm).tags;
        }

        let mtm = localStorage.uTagMTM || sessionStorage.uTagMTM;
        if (mtm) {
            mtm = parse(mtm).tags;
        }

        if (utm || mtm) {
            const payload = JSON.stringify({ ...utm, ...mtm });
            eventlog(500510, payload);

            delete localStorage.uTagUTM;
            delete localStorage.uTagMTM;
            delete sessionStorage.uTagUTM;
            delete sessionStorage.uTagMTM;
        }
    };
    onIdle(campaignTagger);

    if (u_attr.p === undefined || u_attr.p < 1 || u_attr.p > 4) {
        localStorage.keycomplete = true;
        sessionStorage.signinorup = 2;

        // If mobile, log to see how many registrations are completed on mobile and load the cloud drive
        if (is_mobile) {

            // Check if they actually started the registration process on mobile web
            if (localStorage.signUpStartedInMobileWeb) {

                // Remove the flag as it's no longer needed and send a stats log
                localStorage.removeItem('signUpStartedInMobileWeb');
                api_req({ a: 'log', e: 99639, m: 'Started and completed registration on mobile webclient' });
            }
            else {
                // Otherwise they just completed sign up on the mobile web and may have started it on a mobile app
                api_req({ a: 'log', e: 99627, m: 'Completed registration on mobile webclient' });
            }
        }
        else {
            // Otherwise log to see how many registrations are completed on regular webclient
            api_req({ a: 'log', e: 99628, m: 'Completed registration on regular webclient' });
        }

        if (!(u_attr && u_attr.b)) {
            onIdle(function() {
                authring.initAuthenticationSystem();
            });
        }
    }
}
