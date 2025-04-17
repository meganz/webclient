/* eslint-disable jquery/no-find */
/* eslint-disable no-restricted-properties */
/* eslint-disable dot-notation */
/* eslint-disable max-len */
/* eslint-disable no-new */
/* eslint-disable valid-jsdoc */
/* eslint-disable local-rules/misc-warnings */
/* eslint-disable unicorn/prefer-dataset */
/* eslint-disable local-rules/jquery-replacements */
/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable local-rules/jquery-scopes */
/* eslint-disable strict */
/* eslint-disable complexity */
/* eslint-disable sonarjs/no-collapsible-if */
/* eslint-disable sonarjs/no-duplicated-branches */
/* eslint-disable brace-style */

/**
 * To use: `M.require('dont-deploy/dialog_manual_tests.js')` in the console
 *
 * Most methods here are the same as they are in the live code
 * Some are adapted to show business dialogs on normal accounts
 * Some are made safer where they could cause harm to your account
 *
 * You can import this into a page.
 */

const dialogTest = {

    validFileHandle: '',            // A file in your drive
    validUserHandle: '',         // A valid user handle, existing contact or not
    existingContactHandle: '',      // An existing contact
    newValidUserHandle: '',         // A valid user who is not a contact
    validContactLink: '',         // To generate a QR code
    paddingCSSAdded: false,
    borderCSSAdded: false,

    showPadding: function() {
        document.querySelectorAll('.mega-dialog').forEach(elem => {

            elem.classList.remove('test-padding-highlight');

            if (window.getComputedStyle(elem).display !== 'none') {
                elem.classList.add('test-padding-highlight');
            }


        });

        if (!dialogTest.paddingCSSAdded) {
            const style = document.createElement('style');
            style.innerHTML = `
            .mega-dialog.test-padding-highlight header,
            .mega-dialog.test-padding-highlight section,
            .mega-dialog.test-padding-highlight .content-block,
            .mega-dialog.test-padding-highlight footer,
            .mega-dialog.test-padding-highlight aside {
                background-clip: content-box, padding-box;
                background-image: linear-gradient(
                        to bottom,
                        rgba(50, 50, 255, 0.1) 0%,
                        rgba(50, 50, 255, 0.1) 100%
                    ),
                    linear-gradient(
                        to bottom,
                        rgba(50, 255, 0, 0.1) 0%,
                        rgba(50, 255, 0, 0.1) 100%
                    );
            }`;
            document.head.appendChild(style);
            dialogTest.paddingCSSAdded = true;
        }
    },

    showBorders: function() {
        document.querySelectorAll('.mega-dialog').forEach(elem => {

            elem.classList.remove('test-border');

            if (window.getComputedStyle(elem).display !== 'none') {
                elem.classList.add('test-border');
            }
        });

        if (!dialogTest.borderCSSAdded) {
            const style = document.createElement('style');
            style.innerHTML = `
            .mega-dialog.test-border header,
            .mega-dialog.test-border section,
            .mega-dialog.test-border .content-block,
            .mega-dialog.test-border footer,
            .mega-dialog.test-border aside {
                box-shadow: inset 0 0 0 1px rgb(0, 0, 255);
            }`;
            document.head.appendChild(style);
            dialogTest.borderCSSAdded = true;
        }
    },

    showGrid: function() {

        // cleanup
        document.querySelectorAll('.js-gridline').forEach(e => e.remove());

        document.querySelectorAll('.mega-dialog').forEach(elem => {

            if (window.getComputedStyle(elem).display !== 'none') {

                const padding = {};
                const type = elem.dataset.type;

                const parser = new DOMParser();

                // If it's visible, check it for children. No children means it's just there for padding and rounded corners.
                const aside = Array.from(elem.querySelectorAll('aside')).filter(aside => {
                    if (window.getComputedStyle(aside).display !== 'none') {
                        if (aside.children.length) {
                            return true;
                        }
                    }
                    return false;
                })[0];

                // first visible footer
                const footer = Array.from(elem.querySelectorAll('footer')).filter(footer => {
                    if (window.getComputedStyle(footer).display !== 'none') {
                        return true;
                    }
                    return false;
                })[0];

                // first visible button in visible footer
                let button;
                if (footer) {
                    Array.from(footer.querySelectorAll('.footer-container')).filter(footerContainer => {
                        if (window.getComputedStyle(footerContainer).display !== 'none') {
                            button = Array.from(footerContainer.querySelectorAll('button')).filter(button => {
                                if (window.getComputedStyle(button).display !== 'none') {
                                    return true;
                                }
                                return false;
                            })[0];
                        }
                        return false;
                    });
                }

                switch (type) {
                    case 'main':
                        padding.top = 48;
                        padding.right = 48;
                        padding.bottom = footer && aside ? aside.offsetTop - 48 : elem.offsetHeight - 48;
                        padding.left = 48;
                        padding.aboveButton = footer && button ? button.offsetTop - 16 : null;
                        padding.buttonTop = footer && button ? footer.offsetTop + 16 : null;
                        break;
                    case 'tool':
                        padding.top = 12;
                        padding.right = 48;
                        padding.bottom = footer && aside ? aside.offsetTop - 24 : elem.offsetHeight - 24;
                        padding.left = 48;
                        padding.aboveButton = footer && button ? button.offsetTop - 40 : null;
                        padding.buttonTop = footer && button ? footer.offsetTop + 40 : null;
                        break;
                    case 'action':
                        padding.top = 16;
                        padding.right = 48;
                        padding.bottom = footer && aside ? aside.offsetTop - 24 : elem.offsetHeight - 24;
                        padding.left = 48;
                        padding.aboveButton = footer && button ? button.offsetTop - 16 : null;
                        padding.buttonTop = footer && button ? footer.offsetTop + 16 : null;
                        break;
                    case 'message':
                        padding.top = 24;
                        padding.right = 24;
                        padding.bottom = elem.offsetHeight - 24;
                        padding.left = 24;
                        padding.aboveButton = footer && button ? button.offsetTop - 24 : null;
                        padding.buttonTop = footer && button ? footer.offsetTop + 24 : null;
                        break;
                    case 'graphic':
                        padding.top = 48;
                        padding.right = 48;
                        padding.bottom = footer && aside ? aside.offsetTop - 48 : elem.offsetHeight - 48;
                        padding.left = 48;
                        padding.aboveButton = footer && button ? button.offsetTop - 16 : null;
                        padding.buttonTop = footer && button ? footer.offsetTop + 16 : null;
                        break;
                }

                const topLine = parser.parseFromString(`<div class="js-gridline topline" style="position: absolute; top: ${padding.top}px; left: 0; width: 100%; height: 1px; background: red; pointer-events: none"></div>`, 'text/html');
                const bottomLine = parser.parseFromString(`<div class="js-gridline bottomline" style="position: absolute; top: ${padding.bottom}px; left: 0; width: 100%; height: 1px; background: red; pointer-events: none"></div>`, 'text/html');
                const leftLine = parser.parseFromString(`<div class="js-gridline leftline" style="position: absolute; left: ${padding.left}px; top: 0; width: 1px; height: 100%; background: red; pointer-events: none"></div>`, 'text/html');
                const rightLine = parser.parseFromString(`<div class="js-gridline rightline" style="position: absolute; right: ${padding.right}px; top: 0; width: 1px; height: 100%; background: red; pointer-events: none"></div>`, 'text/html');


                elem.appendChild(topLine.getRootNode().body.firstChild);
                elem.appendChild(rightLine.getRootNode().body.firstChild);
                elem.appendChild(bottomLine.getRootNode().body.firstChild);
                elem.appendChild(leftLine.getRootNode().body.firstChild);

                if (padding.buttonTop) {
                    const buttonTop = parser.parseFromString(`<div class="js-gridline buttontop" style="position: absolute; top: ${padding.buttonTop}px; left: 0; width: 100%; height: 1px; background: red; pointer-events: none"></div>`, 'text/html');
                    elem.appendChild(buttonTop.getRootNode().body.firstChild);
                }

                if (padding.aboveButton) {
                    const paddingAboveButtonLine = parser.parseFromString(`<div class="js-gridline abovebutton" style="position: absolute; top: ${padding.aboveButton}px; left: 0; width: 100%; height: 1px; background: red; pointer-events: none"></div>`, 'text/html');
                    elem.appendChild(paddingAboveButtonLine.getRootNode().body.firstChild);
                }
            }
        });
    },


    /* Dialog: awaiting-confirmation --> */
    ['awaiting-confirmation']: () => {
        fm_showoverlay();
        $('.awaiting-confirmation').removeClass('hidden');
    },


    /* Dialog: reset-success --> */
    ['reset-success']: () => {
        handleResetSuccessDialogs('.reset-success', 'test message', 'resetsuccess');
    },


    /* Dialog: reset-success-st2 --> */
    ['reset-success-st2']: () => {
        // Open without event handlers (safely, no risks)
        // Not sure if it's ever used
        M.safeShowDialog('reset-success-st2', document.querySelector('.reset-success-st2'));
    },


    /* Dialog: reset-success-st3 --> */
    /* Feedback */
    ['reset-success-st3']: () => {
        M.require('cancel_js').then(() => {
            const ac = new mega.AccountClosure();
            ac.handleFeedback();
        });
    },


    /* Dialog: account-reset-confirmation --> */
    ['account-reset-confirmation']: () => {
        M.safeShowDialog('account-reset-confirmation', document.querySelector('.account-reset-confirmation'));
    },


    /* Dialog: share-help --> */
    ['share-help']: () => {
        let link = 'http://test.com';
        const $input = $('.share-help').removeClass('hidden');
        $('input', $input).val(link).trigger('focus').trigger('select');
        $('button.js-close', $('.share-help')).rebind('click', function() {
            $('.share-help').addClass('hidden');
            fm_hideoverlay();
        });
        $('.copy-to-clipboard').rebind('click', function() {
            copyToClipboard(link, l[7654]);
            return false;
        });
        fm_showoverlay();
    },


    /* Dialog: create-folder-dialog --> */
    ['create-folder-dialog']: () => {
        createFolderDialog();
        // In a folder, right click, 'New Folder'
    },


    /* Dialog: create-file-dialog --> */
    ['create-file-dialog']: () => {
        createFileDialog();
        // In a folder, right click, 'New Text File'
    },


    /* Dialog: dlkey-dialog --> */
    /* ALSO ON MOBILE */
    ['dlkey-dialog']: () => {
        mKeyDialog(dialogTest.validFileHandle, false);
    },


    /* Dialog: sub-account-link-password --> */
    ['sub-account-link-password']: () => {
        M.require('businessAcc_js', 'businessAccUI_js').then(() => {
            const business = new BusinessAccountUI();
            business.showLinkPasswordDialog();
        });
    },


    /* Dialog: bus-pw-reset --> */
    ['bus-pw-reset']: () => {
        M.require('businessAcc_js', 'businessAccUI_js').then(() => {
            u_attr.b = true;
            M.suba[dialogTest.validUserHandle] = {
                firstname: 'VXNlcg',
                lastname: 'TmFtZQ'
            };
            const business = new BusinessAccountUI();
            business.showResetPasswordSubUserDialog(dialogTest.validUserHandle);
        });
    },


    /* Dialog: password-dialog --> */
    ['password-dialog']: () => {
        exportPassword.decrypt.init(/* optionally put page hash here */);
    },


    /* Dialog: registration-page-success --> */
    /* TODO: different variants */
    /* refresh page between versions */
    ['registration-page-success']: ({version}) => {

        switch (version) {
            case 0:
                mega.ui.sendSignupLinkDialog({});
                break;
            case 1:
                // chatlink
                page = 'chat';

                mega.ui.sendSignupLinkDialog({
                    email: 'a@b.com'
                });
                break;
            case 2:
                // with close button
                mega.ui.sendSignupLinkDialog({
                    email: 'a@b.com'
                }, closeDialog);
                break;
        }
    },


    /* Dialog: rename-dialog --> */
    ['rename-dialog']: () => {
        $.selected = [dialogTest.validFileHandle];
        renameDialog();
    },


    /* Dialog: fm-picker-dialog --> */
    /* See copy-dialog and move-dialog below */


    /* Dialog: msgDialog --> */
    /* see below */

    /* Dialog: export-links-dialog --> */
    ['export-links-dialog']: () => {
        fmconfig.cws = false;
        mega.Share.initCopyrightsDialog([dialogTest.validFileHandle], false);
    },


    /* Dialog: set-password-dialog --> */
    /* user by export-links-dialog */
    ['set-password-dialog']: () => {
        exportPassword.encrypt.init();
        exportPassword.encrypt.showSetPasswordDialog();
    },


    /* Dialog: avatar-dialog --> */
    ['avatar-dialog']: () => {
        // http://localhost:8089/fm/account, click "Change Avatar"
        avatarDialog();
    },


    /* Dialog: properties-dialog --> */
    /* TODO: folders, multiple files, favourited files, shared, shared with me (read only, read and write) */
    ['properties-dialog']: () => {
        $.selected = [dialogTest.validFileHandle];
        propertiesDialog();
    },


    /* Dialog: bottom-pages-dialog --> */
    ['bottom-pages-dialog']: ({ showAgree }) => {
        // (close now, page name, title of popup, true = hide agree button on terms/sdkterms pages)
        if (showAgree) {
            bottomPageDialog(false, 'terms', 'header', false);
        }
        else {
            bottomPageDialog(false, 'terms', 'header', true);
        }
    },


    /* Dialog: languages-dialog --> */
    ['languages-dialog']: () => {
        langDialog.show();
    },


    /* Dialog: download-dialog --> */
    /* Not used - legacy garbage */
    /* Doesn't work anymore due to safeHTML removing <object> elements */
    ['download-dialog']: () => {
        $('.download-save-your-file').safeHTML('<object></object>');
        $('.mega-dialog.download-dialog').removeClass('hidden');
        fm_showoverlay();
    },


    /* Dialog: add-user-popup --> */
    ['add-user-popup']: () => {
        // http://localhost:8089/fm/ipc, 'Add Contact'
        contactAddDialog();
    },


    /* Dialog: new-contact --> */
    ['new-contact']: () => {
        M.ipc[dialogTest.validUserHandle] = {
            m: 'a username',
        };
        newContactDialog(dialogTest.validUserHandle);

        const message = document.querySelector('.new-user-message');
        message.classList.remove('hidden');
        message.querySelector('span').innerText = 'test message from new contact';
    },


    /* Dialog: contact-info --> */
    ['contact-info']: () => {
        contactsInfoDialog('test title', 'a user', 'message', 0);
    },


    /* Dialog: share-dialog --> */
    ['share-dialog']: () => {
        $.selected = [dialogTest.validFileHandle];
        mega.ui.mShareDialog.init();
    },


    /* Dialog: fingerprint-dialog --> */
    ['fingerprint-dialog']: () => {
        fingerprintDialog(dialogTest.validUserHandle);
    },


    /* Dialog: pro-login-dialog --> */
    ['pro-login-dialog']: () => {
        showLoginDialog('a@b.com', 'secure password');
    },


    /* Dialog: pro-login-dialog: with a signup link/subheader --> */
    ['pro-login-dialog-2']: () => {
        window.u_type = false;

        window.M.chat = false;

        mega.ui.showLoginRequiredDialog({
            title: 'A Title',
            textContent: 'Some content',
            skipInitialDialog: true
        })
            .done((res) => {
                console.log(res);
            })
            .fail((error) => {
                console.log(error);
            });
    },


    /* Dialog: pro-register-dialog --> */
    /* lots of options on this one */
    ['pro-register-dialog']: () => {
        // const $pane = $('.register-side-pane.container');
        mega.ui.showRegisterDialog({
            body: 'some body text',
            // $wrapper: $pane,
            showLogin: true,
            // initFormEvents: true,
            // controls: function() {
            //     $('.fm-dialog-close', $pane).rebind('click.registerSidePane', function() {
            //         $pane.removeClass('visible');
            //         return false;
            //     });
            // },
            // showDialog: function() {
            //     $pane.addClass('visible');
            // },
            // closeDialog: function() {
            //     $pane.removeClass('visible');
            // },
            // onAccountCreated: function(gotLoggedIn, accountData) {
            //     this.closeDialog();
            // }
        });
    },


    /* Dialog: loginrequired-dialog --> */
    /* Register/Login required dialog for desktop !--> */
    ['loginrequired-dialog']: ({withSignupLink}) => {
        window.u_type = false;

        window.M.chat = withSignupLink;

        mega.ui.showLoginRequiredDialog({
            title: l[6186],
            textContent: l[5841],
            skipInitialDialog: false
        })
            .done((res) => {
                console.log(res);
            })
            .fail((error) => {
                console.log(error);
            });
    },


    /* Dialog: feedback-dialog --> */
    /* overlay dialog */
    ['feedback-dialog']: () => {
        mega.ui.FeedbackDialog.singleton(
            undefined,              // toggleButton: not needed here
            undefined,              // rating: never used
            'test'            // type of feedback
        );
    },


    /* voucher-redeem-dialog */
    /* overlay dialog */
    ['voucher-redeem-dialog']: () => {
        M.require('redeem_js').then(() => {
            redeem.$dialog = $('.voucher-redeem-dialog');
            redeem.$backgroundOverlay = $('.fm-dialog-overlay');
            redeem.voucherData = {
                planId: '1',
                proNum: '1',
                storage: '2048',
                bandwidth: '2048',
                months: 12,
                price: '0.99',
                available: true,
                value: 500,
                balance: 1000.00
            };
            redeem.displayDialog();
        });
    },


    /* push-settings-dialog */
    ['push-settings-dialog']: () => {
        M.safeShowDialog('push-settings-dialog', $('.push-settings-dialog'));
    },


    /* Dialog: collected-data-review-dialog --> */
    ['collected-data-review-dialog']: () => {
        const dialog = self.$dataReportDialog = new mega.ui.Dialog({
            className: 'collected-data-review-dialog',

            /**
             * features:
             */
            'focusable': true,
            'closable': true,
            'closableByEsc': true,
            'expandable': true,
            'requiresOverlay': false,

            /**
             * optional:
             */
            'title': 'Collected Data Report',
            'buttons': [
                {
                    'label': l[148],
                    'className': "mega-button positive collected-data-review-button-cancel",
                    'callback': function() {
                        this.hide();
                    }
                }
            ]
        });

        const collectedData = '<li>some data</li><li>some more data</li>';
        $('.collected-data', dialog.$dialog).html(collectedData);

        dialog.show();
    },


    /* Dialog: credentials-warning-dialog --> */
    /* Dialog is shown when user's Ed25519 public key fingerprint mismatches. --> */
    ['credentials-warning-dialog']: () => {
        M.u[dialogTest.validUserHandle] = {
            m: 'a@b.com'
        };
        mega.ui.CredentialsWarningDialog.waitingList = [{
            contactHandle: dialogTest.validUserHandle,
            keyType: 'Ed25519',
            prevFingerprint: '111',
            newFingerprint: '222'
        }];
        mega.ui.CredentialsWarningDialog.rendernext();
    },


    /* Dialog: key-signature-warning-dialog --> */
    /* Dialog is shown when user's public key signature fails validation. --> */
    /* refresh page between versions */
    ['key-signature-warning-dialog']: ({withAvatar}) => {
        if (withAvatar) {
            mega.ui.KeySignatureWarningDialog.singleton(dialogTest.validUserHandle, 'Ed25519');
        }
        else {
            mega.ui.KeySignatureWarningDialog.singleton('test user', 'Ed25519');
        }
    },


    /* Dialog: payment-dialog --> */
    ['payment-dialog']: () => {
        pro.propay.selectedProPackage = [
            "N02zLAiWqRU",
            2,
            4096,
            4096,
            1,
            "0.99",
            "NZD",
            "0.99",
            null,
            null,
            null,
            null
        ];
        cardDialog.init();
    },


    /* Dialog: payment-address-dialog --> */
    /* ALSO ON MOBILE */
    ['payment-address-dialog']: () => {
        const step2 = document.createElement('div');
        step2.classList.add('payment-section');

        const paymentOptionsList = document.createElement('div');
        paymentOptionsList.classList.add('payment-options-list');

        const paymentOptionsInput = document.createElement('input');
        paymentOptionsInput.type = 'radio';
        paymentOptionsInput.setAttribute('checked', true);
        paymentOptionsInput.value = 'ecp';

        paymentOptionsList.append(paymentOptionsInput);
        step2.append(paymentOptionsList);


        const durationOptionsList = document.createElement('div');
        durationOptionsList.classList.add('duration-options-list');
        durationOptionsList.setAttribute('data-plan-index', 0);

        const membershipRadio = document.createElement('input');
        membershipRadio.classList.add('membership-radio', 'checked');

        durationOptionsList.append(membershipRadio);
        step2.append(durationOptionsList);

        document.body.append(step2);

        pro.membershipPlans = {
            '0': [
                "N02zLAiWqRU",
                2,
                4096,
                4096,
                1,
                "0.99",
                "EUR",
                "0.99",
                null,
                null,
                null,
                null
            ]
        };

        pro.propay.selectedProPackage = [
            "N02zLAiWqRU",
            2,
            4096,
            4096,
            1,
            "0.99",
            "EUR",
            "0.99",
            null,
            null,
            null,
            null
        ];

        pro.propay.$backgroundOverlay = $('.fm-dialog-overlay');
        pro.propay.$loadingOverlay = $('.payment-processing');
        pro.propay.startPurchaseProcess();
    },


    /* Dialog: wire-transfer-dialog --> */
    ['wire-transfer-dialog']: () => {
        wireTransferDialog.init();
    },


    /* Dialog: cancel-subscription-st1 --> */
    /* May cancel your subscription */
    ['cancel-subscription-st1']: () => {
        accountUI.plan.accountType.cancelSubscriptionDialog.init();
    },


    /* Dialog: cancel-subscription-st2 --> */
    /* Safe, no interaction */
    ['cancel-subscription-st2']: () => {
        M.safeShowDialog('cancel-subscription-st2', document.querySelector('.cancel-subscription-st2'));
    },


    /* Dialog: voucher-dialog --> */
    /* ALSO ON MOBILE */
    ['voucher-dialog']: ({ balanceHighEnough }) => {

        // optionally set your balance high enough
        if (balanceHighEnough) {
            pro.propay.proBalance = 1000;
        }
        else {
            pro.propay.proBalance = 0;
        }

        pro.propay.selectedProPackage = [
            "N02zLAiWqRU",
            2,
            4096,
            4096,
            1,
            "0.99",
            "EUR",
            "0.99",
            null,
            null,
            null,
            null
        ];

        pro.membershipPlans[0] = pro.propay.selectedProPackage;

        const selectedDurationOptionParent = document.createElement('div');
        selectedDurationOptionParent.classList.add('duration-options-list');
        selectedDurationOptionParent.setAttribute('data-plan-index', 0);
        const selectedDurationOption = document.createElement('div');
        selectedDurationOption.classList.add('membership-radio', 'checked');

        selectedDurationOptionParent.append(selectedDurationOption);
        document.body.append(selectedDurationOptionParent);

        pro.propay.$backgroundOverlay = $('.fm-dialog-overlay');
        pro.propay.$loadingOverlay = $('.payment-processing');

        voucherDialog.init();
    },


    /* Overlay: payment-processing --> */
    /* Used by several payment processes */
    /* ALSO ON MOBILE */
    ['payment-processing']: () => {
        pro.propay.preloadAnimation();
        document.querySelector('.payment-processing').classList.remove('hidden');
    },


    /* Dialog: astropay-dialog --> */
    ['astropay-dialog']: () => {
        astroPayDialog.init({
            displayName: 'AstroPay Visa',
            gatewayId: 11,
            gatewayName: 'astropayVI',
            supportsAnnualPayment: 1,
            supportsExpensivePlans: 1,
            supportsMonthlyPayment: 1,
            supportsRecurring: 1,
            type: 'subgateway',
            extra: {
                taxIdLabel: 'CPF'
            }
        });
    },


    /* Dialog: copyrights-dialog --> */
    ['copyrights-dialog']: () => {
        document.querySelectorAll('.copyrights-dialog button').forEach(elem => {
            elem.onclick = closeDialog;
        });
        M.safeShowDialog('copyrights', document.querySelector('.copyrights-dialog'));
    },


    /* Dialog: invite-dialog --> */
    ['invite-dialog']: ({version}) => {
        M.maf= [
            null,
            null,
            null,
            {
                0: 1024,
                2: 1024,
                rwd: true
            }
        ];
        mega.achievem.inviteFriendDialog();

        if (version === 1) {
            document.querySelector('.invite-dialog').classList.add('success');
        }
        else if (version === 0) {
            document.querySelector('.invite-dialog').classList.remove('success');
        }
    },


    /* Dialog: bitcoin-invoice-dialog --> */
    ['bitcoin-invoice-dialog']: () => {
        pro.propay.selectedProPackage = [
            "N02zLAiWqRU",
            2,
            4096,
            4096,
            1,
            "0.99",
            "EUR",
            "0.99",
            null,
            null,
            null,
            null
        ];

        bitcoinDialog.showInvoice({
            address: 'bitcoin-address',
            amount: '1.1',
            created: Date.now() / 1000 - 3600,
            expiry: Date.now() / 1000 + 3600
        });
    },


    /* Dialog: bitcoin-provider-failure-dialog --> */
    ['bitcoin-provider-failure-dialog']: () => {
        bitcoinDialog.showBitcoinProviderFailureDialog();
    },


    /* Dialog: limited-bandwidth-dialog: download over quota --> */
    /**
     * Flags:
     *
     * REGISTERED = 1
     * ACHIEVEMENTS = 4
     * REGISTERED + PRO = 3
     * REGISTERED + ACHIEVEMENTS = 5
     * REGISTERED + PRO + ACHIEVEMENTS = 7
     */
    /* ALSO ON MOBILE */
    ['limited-bandwidth-dialog:over-dl']: ({ flags }) => {
        // dlmanager.LMT_ISREGISTERED = false;
        dlmanager.showOverQuotaDialog(null, flags);
        // Varies when logged in/out
    },


    /* Dialog: limited-bandwidth-dialog: limited bandwidth quota --> */
    /* ALSO ON MOBILE */
    ['limited-bandwidth-dialog:limited-dl']: ({ flags }) => {
        dlmanager.LMT_ISREGISTERED = false;
        dlmanager.showLimitedBandwidthDialog(1, closeDialog, flags);
        // Varies when logged in/out
    },


    /* Dialog: limited-bandwidth-dialog: upload over quota --> */
    /* ALSO ON MOBILE */
    ['limited-bandwidth-dialog:over-ul-quota']: ({ flags }) => {
        dlmanager.lmtUserFlags = flags;
        pro.maxPlan = [
            null,
            null,
            1000,
            1000
        ];
        ulmanager.ulShowOverStorageQuotaDialog();
        // Varies when logged in/out
    },


    /* Dialog: achievements-list-dialog --> */
    ['achievements-list-dialog']: () => {
        mega.achievem.achievementsListDialog();
    },


    /* Dialog: invitation-dialog --> */
    /* run from /fm/account */
    ['invitation-dialog']: () => {
        M.maf[3].rwds = [
            {
                m: [
                    'a@b.com'
                ],
                ts: Date.now() / 1000 - 13600,
                csu: false
            },
            {
                m: [
                    'a@b.com'
                ],
                ts: Date.now() / 1000 - 3600,
                csu: true,
                c: Date.now() / 1000 - 360
            },
            {
                m: [
                    'a@b.com'
                ],
                ts: Date.now() / 1000 - 3000,
                csu: true
            }
        ];
        mega.achievem.invitationStatusDialog();
    },


    /* Dialog: storage-dialog --> */
    /* ALSO ON MOBILE */
    ['storage-dialog']: ({ version }) => {
        switch (version) {
            case 0:
                // capacity full & upgrade to pro
                u_attr.p = false;
                M.showOverStorageQuota(-1);
                break;
            case 1:
                // capacity full & upgrade current pro account
                u_attr.p = true;
                M.showOverStorageQuota(-1);
                break;
            case 2:
                // storage full version
                M.showOverStorageQuota(EPAYWALL);
                break;
            case 3:
                // megadrop version
                mega.megadrop.overQuota();
                break;
            case 4:
                // custom version
                M.showOverStorageQuota({
                    mstrg: 1024,
                    cstrg: 1023,
                    percent: 16
                }, {
                    custom: true,
                    title: 'Custom title',
                    body: 'Custom body'
                });
        }
    },


    /* Dialog: duplicate-conflict --> */
    /* ALSO ON MOBILE */
    ['duplicate-conflict']: ({version}) => {
        const file = {
            name: 'testfilename',
            size: 10241024,
            mtime: Date.now() / 1000
        };

        const node = {
            t: 1,
            name: 'nodefilename',
            size: 1024,
            mtime: Date.now() / 1000 - 1000
        };

        // number of remaining conflicts
        const remaining = 70;

        M.d.aaaa = {
            p: true,
            r: 1,
            name: 'bbbb'
        };

        M.c.aaaa = [
            'aaaa'
        ];

        const target = 'aaaa';

        switch (version) {
            case 0:
                // Keep the newest: 1 other duplicate
                fileconflict.prompt('dups', file, node, remaining, target, 2);
                break;
            case 1:
                // Merge the duplicates: 1 other duplicate
                file.t = 1;
                fileconflict.prompt('dups', file, node, remaining, target, 2);
                break;
            case 2:
                // Keep the newest: 3 other duplicates
                fileconflict.prompt('dups', file, node, remaining, target, 4);
                break;
            case 3:
                // Don't copy/Copy and rename: "The file you are copying will be renamed as:"
                fileconflict.prompt('copy', file, node, remaining, target);
                break;
            case 4:
                // Copy and merge/Don't copy: "Skip this folder:"
                file.t = 1;
                fileconflict.prompt('copy', file, node, remaining, target);
                break;
            case 5:
                // Don't move/Move and rename: "The file you are moving will be renamed as:"
                fileconflict.prompt('move', file, node, remaining, target);
                break;
            case 6:
                // Move and merge/Don't move: "Skip this folder:"
                file.t = 1;
                fileconflict.prompt('move', file, node, remaining, target);
                break;
            case 7:
                // Don't upload/Upload and rename: "The file you are uploading will be renamed as:"
                fileconflict.prompt('upload', file, node, remaining, target);
                break;
            case 8:
                // Upload and merge/Don't upload: "Skip this folder:"
                file.t = 1;
                fileconflict.prompt('upload', file, node, remaining, target);
                break;
            case 9:
                // Don't upload/Upload and rename: "The file you are uploading will be renamed as:"
                fileconflict.prompt('replace', file, node, remaining, target);
                break;
            case 10:
                // Don't import/Import and rename: "The file you are importing will be renamed as:"
                fileconflict.prompt('import', file, node, remaining, target);
                break;
            case 11:
                // Don't import/Import and rename: "The file you are importing will be renamed as:, no more remaining"
                fileconflict.prompt('import', file, node, 0, target);
        }
    },


    /* Dialog: fm-voucher-popup --> */
    ['fm-voucher-popup']: () => {
        var $inputs = $('.fm-account-main input').add('.fm-voucher-popup input');
        new mega.ui.MegaInputs($inputs);
        document.querySelector('.fm-voucher-popup').classList.remove('hidden');
    },


    /* Dialog: resume-transfer --> */
    ['resume-transfer']: () => {
        document.querySelectorAll('.resume-transfer button.js-close, .resume-transfer .cancel, .resume-transfer .resume-transfers-button').forEach(elem => {
            elem.onclick = closeDialog;
        });
        M.safeShowDialog('resume-transfer', document.querySelector('.resume-transfer'));
    },


    /* Dialog: create-widget-info-dialog --> */
    ['create-widget-info-dialog']: ({ version }) => {
        // right click folder, 'Make MEGAdrop folder', or:

        if (version === 0) {
            document.querySelector('.create-widget-info-dialog .fm-widget-manage').classList.remove('hidden');
            document.querySelector('.create-widget-info-dialog .fm-widget-introduction').classList.add('hidden');
        } else {
            document.querySelector('.create-widget-info-dialog .fm-widget-manage').classList.add('hidden');
            document.querySelector('.create-widget-info-dialog .fm-widget-introduction').classList.remove('hidden');
        }

        M.safeShowDialog('create-widget-info-dialog', document.querySelector('.create-widget-info-dialog'));

        // Lots of potential variations here
    },

    /* Dialog: widget-dialog --> */
    /* Get MEGAdrop embed instructions --> */
    ['widget-dialog']: () => {
        M.safeShowDialog('widget-dialog', document.querySelector('.mega-dialog.widget-dialog'));

        // Lots of potential variations here - untestable mush pile
    },


    /* Dialog: park-account-dialog --> */
    /* Dangerous */
    ['park-account-dialog']: ({ version }) => {
        // Go through password recovery steps, or:

        M.require('recovery_js').then(() => {
            const recov = new AccountRecoveryControl();

            switch (version) {
                case 0:
                    // no easy park
                    recov.showParkWarning(false);
                    break;
                case 1:
                    // with easy park
                    recov.showParkWarning(true);
                    break;
                case 2:
                    // mobile version
                    is_mobile = true;
                    recov.showParkWarning(false);
            }
        });
    },


    /* Dialog: qr-contact --> */
    /* QR Code Contact info Dialog !--> */
    ['qr-contact']: ({ version }) => {
        switch (version) {
            case 0:
                // An existing contact's contact card
                openContactInfoLink(dialogTest.existingContactHandle);
                break;
            case 1:
                // A new contact's card
                openContactInfoLink(dialogTest.newValidUserHandle);
                break;
            case 2:
                // Your own contact card
                api_req({ a: 'clc', f: 1 }, {
                    account: window.account,
                    callback: function(res) {
                        console.error(res);
                        openContactInfoLink(res);
                    }
                });
        }
    },


    /* Dialog: verify-two-factor-login --> */
    /* Login with two-factor authentication !--> */
    ['verify-two-factor-login']: () => {
        twofactor.loginDialog.init();
    },


    /* Dialog: setup-two-factor --> */
    /* Setup Two-Factor Authentication !--> */
    ['setup-two-factor']: () => {
        twofactor.setupDialog.init();
    },


    /* Dialog: setup-two-factor-verify --> */
    /* Set up Two factor verify the code from Authentication app --> */
    ['setup-two-factor-verify']: () => {
        twofactor.verifySetupDialog.init();
    },


    /* Dialog: setup-two-factor-backup-key --> */
    /* Post set up of Two Factor Authentication to backup the recovery key --> */
    ['setup-two-factor-backup-key']: () => {
        twofactor.backupKeyDialog.init();
    },


    /* Dialog: two-factor-verify-action --> */
    /* Verify an account action with two-factor authentication PIN required !--> */
    ['two-factor-verify-action']: () => {
        twofactor.verifyActionDialog.init();
    },


    /* Dialog: verify-phone --> */
    /* Verify phone number super dialog --> */
    ['verify-phone']: ([ smss, smsv ]) => {

        sms.phoneInput.init();

        /**
         * smss:
         *   - EACCESS: Your phone number is already verified
         *   - EEXIST: Your phone number is already verified
         *   - ETEMPUNAVAIL: Too many attempts. Please try in x hours
         *   - -1: General error
         *   - 1: Success
         *
         * smsv:
         *   - EACCESS
         *   - EEXPIRED
         *   - EFAILED
         *   - EEXIST
         *   - -1: General error
         *   - 1: Success
         */

        const api = api_req;

        function apiProxy(req, options) {
            if (req && options && req.a && (req.a === 'smss' || req.a === 'smsv')) {
                if (req.a === 'smss') {
                    options.callback(smss);
                }
                else {
                    options.callback(smsv, {
                        account: [
                            {

                            }
                        ]
                    });
                }
            }
            else if (req && options) {
                api(req, { callback: options.callback });
            }
            else if (req) {
                api(req);
            }
        }

        api_req = apiProxy;
    },


    /* Dialog: recovery-key-dialog --> */
    /* version: 0 - 2 */
    ['recovery-key-dialog']: ({ version }) => {
        M.showRecoveryKeyDialog(version);
    },


    /* Dialog: recovery-key-info --> */
    /* Recover Account (Display recover key) !--> */
    ['recovery-key-info']: () => {
        M.safeShowDialog('recovery-key-info', function() {
            const dialog = document.querySelector('.mega-dialog.recovery-key-info');
            dialog.querySelectorAll('.close-dialog, button.js-close').forEach(elem => {
                elem.onclick = closeDialog;
            });
            return $(dialog);
        });
    },


    /* Dialog: user-management-add-user-dialog --> */
    /* user management dialog --> */
    ['user-management-add-user-dialog']: ({ version }) => {
        u_attr.b = {
            bu: true
        };
        M.require('businessAcc_js', 'businessAccUI_js').then(() => {
            const business = new BusinessAccountUI();

            switch (version) {
                case 0:
                    // Without password
                    business.showAddSubUserDialog({
                        u: dialogTest.validUserHandle,               // user id
                        m: 'a@b.com',           // verification email
                    });
                    break;
                case 1:
                    // With password
                    business.showAddSubUserDialog({
                        u: dialogTest.validUserHandle,               // user id
                        m: 'a@b.com',           // verification email
                        lp: 'impossibletoguess'         // user's verification password
                    });
                    break;
                case 2:
                    // Without result, shows add user screen
                    business.showAddSubUserDialog();
            }
        });
    },


    /* Dialog: user-management-edit-profile-dialog --> */
    ['user-management-edit-profile-dialog']: ({ version }) => {
        switch (version) {
            case 0:
                // No pending email text
                M.require('businessAcc_js', 'businessAccUI_js').then(() => {
                    mega.buinsessController = true;
                    u_attr.b = true;
                    M.suba[dialogTest.validUserHandle] = {
                        firstname: 'VXNlcg',
                        lastname: 'TmFtZQ',
                        e: 'a@b.com',
                        position: 'RW5naW5lZXI',
                        idnum: 'MDA3',
                        phonenum: 'MDEyMzQ1Njc4OQ',
                        location: 'TWFycw'
                    };
                    const business = new BusinessAccountUI();
                    business.showEditSubUserDialog(dialogTest.validUserHandle);
                });
                break;
            case 1:
                M.require('businessAcc_js', 'businessAccUI_js').then(() => {
                    mega.buinsessController = true;
                    u_attr.b = true;
                    M.suba[dialogTest.validUserHandle] = {
                        firstname: 'VXNlcg',
                        lastname: 'TmFtZQ',
                        e: 'a@b.com',
                        position: 'RW5naW5lZXI',
                        idnum: 'MDA3',
                        phonenum: 'MDEyMzQ1Njc4OQ',
                        location: 'TWFycw',
                        pe: {
                            e: 'Pending email text'
                        }
                    };
                    const business = new BusinessAccountUI();
                    business.showEditSubUserDialog(dialogTest.validUserHandle);
                });
        }
    },


    /* Dialog: sub-en-dis --> */
    ['sub-en-dis']: ({ version }) => {
        switch (version) {
            case 0:
                // re-activate user
                M.require('businessAcc_js', 'businessAccUI_js').then(() => {
                    mega.buinsessController = true;
                    u_attr.b = true;
                    const business = new BusinessAccountUI();
                    business.showDisableAccountConfirmDialog(res => console.log(res), 'testuser', true);
                });
                break;
            case 1:
                // disable user
                M.require('businessAcc_js', 'businessAccUI_js').then(() => {
                    mega.buinsessController = true;
                    u_attr.b = true;
                    const business = new BusinessAccountUI();
                    business.showDisableAccountConfirmDialog(res => console.log(res), 'testuser', false);
                });
        }
    },



    /* Dialog: mig-success --> */
    ['mig-success']: () => {
        M.safeShowDialog('migration-success-dlg', function() {
            const dialog = document.querySelector('.user-management-able-user-dialog.mig-success.user-management-dialog');
            dialog.querySelector('.yes-answer').onclick = closeDialog;
            dialog.querySelector('.dialog-text-one').innerHTML = `Data migration from user <b>name</b> has been completed successfully. Data is stored in your account in the folder folderName`;
            return $(dialog);
        });
    },

    /* Dialog: user-management-migrate-process-dialog --> */
    ['user-management-migrate-process-dialog']: () => {
        const migrateDialog = document.querySelector('.user-management-migrate-process-dialog');
        const changePercentage = function(val) {
            migrateDialog.querySelector('.process-percentage').textContent = val + '%';
            migrateDialog.querySelector('.data-migrate.progress-bar').style.width = val + '%';
        };

        M.require('businessAcc_js', 'businessAccUI_js').then(() => {
            M.suba[dialogTest.validUserHandle] = {
                firstname: 'VXNlcg',
                lastname: 'TmFtZQ',
                e: 'a@b.com'
            };

            mega.buinsessController = true;
            u_attr.b = true;
            const business = new BusinessAccountUI();

            setTimeout(() => changePercentage(25), 1000);
            setTimeout(() => changePercentage(50), 2000);
            setTimeout(() => changePercentage(75), 3000);
            setTimeout(() => changePercentage(100), 4000);
            business.migrateSubUserData(dialogTest.validUserHandle);
        });
    },


    /* Dialog: bus-welcome-dialog --> */
    ['bus-welcome-dialog']: () => {
        // remove the attr to allow the dialog to be shown
        mega.attr.remove('bwelcome', -2).then(res => {
            M.require('businessAcc_js', 'businessAccUI_js').then(() => {
                mega.buinsessController = true;
                u_attr.b = true;
                const business = new BusinessAccountUI();
                business.showWelcomeDialog();
            });
        });
    },


    /* Dialog: add-reassign-dialog --> */
    /* business adding contact reassign dialog --> */
    ['add-reassign-dialog']: () => {
        contactVsUserDialog();
    },


    /* Dialog: payment-reminder --> */
    ['payment-reminder']: () => {
        $dialog = $('.payment-reminder.user-management-dialog');

        $dialog.find('button.js-close').off('click.subuser')
            .on('click.subuser', function() {
                closeDialog();
            });

        $dialog.find('.pay-reactive-acc').off('click.subuser')
            .on('click.subuser', function() {
                closeDialog();
                loadSubPage('repay');
            });

        M.safeShowDialog('expired-business-dialog', function() {
            return $dialog;
        });
    },


    /* Dialog: user-management-able-user-dialog.warning --> */
    ['user-management-able-user-dialog.warning']: () => {
        const dialog = document.querySelector('.user-management-able-user-dialog.warning.user-management-dialog');

        dialog.querySelector('.dialog-text-one').innerHTML = 'text one';
        dialog.querySelector('.text-two-text').textContent = 'text two';
        dialog.querySelector('.bold-warning').textContent = 'bold warning:';

        dialog.querySelector('.cancel-action').classList.add('hidden');
        dialog.querySelector('.ok-action span').textContent = 'OK';
        dialog.querySelector('.ok-action').onclick = () => {
            console.log('close dialog');
            closeDialog();
        };

        $dialog = $(dialog);

        M.safeShowDialog('expired-business-dialog', function() {
            return $dialog;
        });
    },


    /* Dialog: group-chat-link --> */
    /* Group Chat Link !--> */
    ['group-chat-link']: () => {
        // Created separately by React
        // Never used?
    },


    /* Dialog: contact-nickname-dialog --> */
    /* Contact Nickname dialog !--> */
    ['contact-nickname-dialog']: () => {
        nicknames.setNicknameDialog.init(dialogTest.validUserHandle);
    },


    /* Dialog: voucher-info-redeem --> */
    /* Business requires: isBusiness: true, businessmonths and bCreatedVoucher */
    /* Non-Business requires: storage (in GB), bandwidth (in GB), proNum, bCreatedVoucher */
    /* refresh between business and free voucher */
    ['voucher-info-redeem']: ({ isBusiness, businessmonths, bCreatedVoucher, storage, bandwidth, proNum }) => {
        /* businessmonths has 3 cases: 1, 12, or a different number */
        /* proNum has 4 cases: 1, 2, 3, 4 */
        M.require('redeem_js').then(() => {
            if (isBusiness) {
                mega.voucher = {
                    businessmonths
                };

                if (bCreatedVoucher) {
                    window.u_type = 3;
                    window.bCreatedVoucher = true;
                }
            }
            else {
                mega.voucher = {
                    storage,
                    bandwidth,
                    proNum
                };

                if (bCreatedVoucher) {
                    window.bCreatedVoucher = true;
                }
            }
            redeem.showVoucherInfoDialog();
        });
    },


    /* payment-dialog-overlay --> */
    /* overlay */
    /* ALSO ON MOBILE */
    ['payment-dialog-overlay']: () => {
        M.require('redeem_js').then(() => {
            window.bCreatedVoucher = true; // necessary?
            redeem.getVoucherData = () => {
                return new Promise(resolve => {
                    resolve({
                        planId: '1',
                        proNum: '1',
                        storage: '2048',
                        bandwidth: '2048',
                        months: 12,
                        price: '0.99',
                        available: true,
                        value: 500,
                        balance: 1000.00
                    });
                });
            };
            M.req = () => {
                return new Promise(resolve => {
                    resolve({
                        promotional: false,
                        balance: 1000.00,
                        value: 500
                    });
                });
            };
            redeem.init();
        });
    },


    /* Dialog: affiliate-guide --> */
    /* Affiliate guide dialogs !--> */
    ['affiliate-guide']: () => {
        affiliateUI.guideDialog.show();
    },


    /* Dialog: generate-url --> */
    /* Generate referral URL dialog !--> */
    ['generate-url']: ({ version }) => {
        if (version === 0) {
            $('.generate-url .custom-block').removeClass('hidden');
        }

        affiliateUI.referralUrlDialog.show();
    },


    /* Dialog: joined-to-affiliate --> */
    /* Joinned to affiliate program dialog !--> */
    ['joined-to-affiliate']: ({ version }) => {
        switch (version) {
            case 0:
                // single button version
                M.currentdirid = 'refer';
                affiliateUI.registeredDialog.show(true);
                break;
            case 1:
                // two button version
                affiliateUI.registeredDialog.show(true);
        }
    },


    /* Dialog: affiliate-redeem --> */
    /* Affiliate program redemption dialog !--> */
    ['affiliate-redeem']: ({ step, bitcoin }) => {
        M.safeShowDialog('affiliate-redeem', document.querySelector('.affiliate-redeem'));

        switch (step) {
            case 1:
                M.affiliate.redeemGateways = {
                    1: {
                        1: true
                    },
                    2: {
                        2: true
                    }
                };

                // step 1
                affiliateUI.redemptionDialog.displayStep1();
                break;
            case 2:
                // step 2
                affiliateRedemption.requests.first = {
                    p: 1000,    // amount
                    cc: 'AQ',   // country
                    c: 'Hope',  // currency
                    m: 1        // type 2: bitcoin, 1: bank transfer
                };

                if (bitcoin) {
                    affiliateRedemption.requests.first.m = 2;
                }

                M.affiliate.redeemGateways = {
                    1: {
                        data: {
                            cc: [               // list of possible countries
                                'AQ'
                            ],
                            $: [                // list of possible currencies
                                'Hope',
                                'Pixie Dust',
                                'Dreams'
                            ]
                        },
                        1: true
                    },
                    2: {
                        data: {
                            cc: [               // list of possible countries
                                'AQ'
                            ],
                            $: [                // list of possible currencies
                                'Hope',
                                'Pixie Dust',
                                'Dreams'
                            ]
                        },
                        2: true
                    }
                };

                affiliateUI.redemptionDialog.displayStep2();
                document.querySelector('.affiliate-redeem .step1').classList.add('hidden');
                document.querySelector('.affiliate-redeem .step2').classList.remove('hidden');
                document.querySelector('.affiliate-redeem .step3').classList.add('hidden');
                document.querySelector('.affiliate-redeem .step4').classList.add('hidden');
                break;
            case 3:
                // step 3

                affiliateRedemption.req1res = [
                    {
                        f: 16,      // fee
                        la: 1.11,   // BTC requested
                        lf: 0.12,   // BTC fee
                        lc: 'GBP',

                    }
                ];

                affiliateUI.redemptionDialog.displayStep3();
                document.querySelector('.affiliate-redeem .step1').classList.add('hidden');
                document.querySelector('.affiliate-redeem .step2').classList.add('hidden');
                document.querySelector('.affiliate-redeem .step3').classList.remove('hidden');
                document.querySelector('.affiliate-redeem .step4').classList.add('hidden');
                break;
            case 4:
                // step 4

                affiliateRedemption.requests.second = {
                    det: []
                };

                affiliateUI.redemptionDialog.displayStep4();
                document.querySelector('.affiliate-redeem .step1').classList.add('hidden');
                document.querySelector('.affiliate-redeem .step2').classList.add('hidden');
                document.querySelector('.affiliate-redeem .step3').classList.add('hidden');
                document.querySelector('.affiliate-redeem .step4').classList.remove('hidden');
        }
    },


    /* Dialog: affiliate-request --> */
    /* Affiliate program redemption request dialog !--> */
    ['affiliate-request']: () => {
        affiliateUI.redemptionDialog.showSumitted();
    },


    /* Dialog: pass-reminder */
    /* ALSO ON MOBILE */
    ['pass-reminder']: async() => {
        // Click the logout button
        let options = await mega.attr.get(u_handle, 'prd', -2, true);
        options = options.split(':');
        options[3] = '0';
        await mega.attr.set(
            "prd",
            options.join(':'),
            -2,
            true
        );
        is_fm = () => true;
        await mega.ui.passwordReminderDialog.recheckLogoutDialog();
    },


    /* Dialog: pro-discount */
    ['pro-discount']: () => {
        u_attr = {};
        u_attr.mkt = {
            dc: [{
                al: 4,
                pd: '98.7',
                m: 1
            }]
        };
        page = '';
        pro.propay.showDiscountOffer();
    },


    /* Dialog: cookie-dialog */
    ['cookie-dialog']: () => {
        csp.showCookiesDialog();
    },


    /* megasync overlay - not a mega-dialog */
    ['megasync-overlay']: () => {
        dlmanager.showMEGASyncOverlay(true);
    },


    /** ** Shared Mobile/Desktop Dialogs ** **/

    ['verify-email']: ({ isMobile }) => {
        if (isMobile) {
            document.querySelector('body').classList.add('mobile');
        }
        security.showVerifyEmailDialog();
    },

    ['verify-email-login-to-account']: ({ isMobile }) => {
        if (isMobile) {
            document.querySelector('body').classList.add('mobile');
        }
        M.safeShowDialog('verify-email-login-to-account', $('.verify-email-login-to-account'));
        mega.ui.MegaInputs($('.verify-email-login-to-account input'));
        setTimeout(() => $('.verify-email-login-to-account .mail').val(u_attr.email), 2000);
    },

    ['verify-email-set-new-pass']: ({ isMobile }) => {
        if (isMobile) {
            document.querySelector('body').classList.add('mobile');
        }
        M.safeShowDialog('verify-email-set-new-pass', $('.verify-email-set-new-pass'));
        mega.ui.MegaInputs($('.verify-email-set-new-pass input'));
    },


    /** ** msgDialogs ** **/

    /**
     * Types - applicable arguments:
     *
     * 'clear-bin' - extraButton
     * 'delete-contact' - none
     * 'warninga' - extraButton
     * 'warningb' - extraButton
     * 'info' - extraButton
     * 'confirmation' - extraButton, checkbox
     * 'remove' - extraButton, checkbox
     * 'import_login_or_register' - none
     *
     * extraButton: button text for second button
     *
     * checkbox: should it have a checkbox?
     */
    /* ALSO ON MOBILE */
    ['msgDialog']: ({ type, extraButton, checkbox}) => {
        const button = typeof extraButton === 'string' ? ':' + extraButton : '';
        msgDialog(type + button, 'test title', 'test message', 'test submessage', (res) => console.log('callback fired', res), typeof checkbox === 'undefined' ? false : checkbox);
    },


    ['ephemeralDialog']: () => {
        // A special case on msgDialog called from elsewhere
        ephemeralDialog('message');
    },


    /** ** Other Dialogs ** **/

    /* special case of fm-picker-dialog */
    ['move-dialog']: () => {
        // Right click on file, click 'Move...', 'Select Location'
        $.selected = [dialogTest.validFileHandle];
        openMoveDialog();
    },


    /* special case of fm-picker-dialog */
    ['copy-dialog']: () => {
        // Right click on file, click 'Copy'
        $.selected = [dialogTest.validFileHandle];
        openCopyDialog();
    },


    /* ALSO ON MOBILE */
    ['loading-dialog']: () => {
        // Not really a dialog
        loadingDialog.show();
        setTimeout(loadingDialog.hide, 3000);
    },


    /** ** Dropdowns ** **/

    /* Dropdown: create-new-folder --> */
    ['create-new-folder']: () => {
        // Click new folder (top right) when browsing a folder
        const $nFolderDialog = $('.create-new-folder');
        $nFolderDialog.removeClass('hidden');
        topPopupAlign($('.fm-new-folder'), '.dropdown.create-new-folder');
    },


    ['top-login-popup']: () => {
        // When logged out, click 'Login' button on top bar
    },

    /**
     * Onboarding Dropdowns
     *
     * {
     *     shouldShowFn
     *     onHideFn
     *     onBeforeShow
     *     learnMoreUrl
     *     customLinkUrl
     * }
     */


    ['how-to-upload']: () => {
        // on cloud drive home
        mega.ui.onboarding.renderDialog('how-to-upload', {});
    },


    ['manage-transfers']: () => {
        mega.ui.onboarding.renderDialog('manage-transfers', {});
    },


    ['share-content']: () => {
        // on cloud drive home
        mega.ui.onboarding.renderDialog('share-content', {
            customLinkUrl: l.mega_help_host + '/files-folders/sharing'
        });
    },


    ['share-folders']: () => {
        mega.ui.onboarding.renderDialog('share-folders', {});
    },


    ['rubbish-bin']: () => {
        mega.ui.onboarding.renderDialog('rubbish-bin', {});
    },


    ['add-contacts']: () => {
        mega.ui.onboarding.renderDialog('add-contacts', {});
    },


    ['megachat']: () => {
        mega.ui.onboarding.renderDialog('megachat', {});
    }
};
