/**
 * Let the user enter a password to decrypt the real folder/file link and access the contents
 */
mobile.passwordDecryption = {
    /**
     * Initialise and show the password decryption page
     */
    show() {
        'use strict';

        // neccessary when navigation between fm and folderlink happens
        this.reset();

        this.pwdDecryption = document.getElementById('mobile-decryption-password');

        if (!this.pwdDecryption) {
            this.pwdDecryption = document.createElement('div');
            this.pwdDecryption.id = 'mobile-decryption-password';
            this.pwdDecryption.className = 'file-folder-view';

            const title = document.createElement('h2');
            title.textContent = l.dl_enter_pass_header;

            const subNode = document.createElement('div');
            subNode.className = 'decryption-msg';
            subNode.textContent = l.dl_enter_pass_info;

            const dKeyInput = document.createElement('input');
            dKeyInput.type = 'password';
            dKeyInput.id = 'decryption_pwd';
            dKeyInput.className = 'underlinedText clearButton with-icon mobile decryption-password';
            dKeyInput.title = l[909];

            this.pwdDecryption.append(title, subNode, dKeyInput);

            this.passwordInput = new mega.ui.MegaInputs($(dKeyInput));
            this.passwordInput.$wrapper.addClass('box-style fixed-width mobile');

            const dButton = new MegaButton({
                type: 'normal',
                text: l[1027],
                parentNode: this.pwdDecryption,
                componentClassname: 'mobile decrypt-button',
                disabled: true
            });

            document.querySelector('#startholder > .content-holder').append(this.pwdDecryption);

            // Initialise the Decrypt button
            this.initDecryptButton(dButton, dKeyInput);
        }
    },

    /**
     * Initialise the Decrypt button
     * @param {HTMLElement} dButton Button component to decrypt the key
     * @param {HTMLElement} dKeyInput Ipnut element to enter the decryption key
     */
    initDecryptButton(dButton, dKeyInput) {
        'use strict';

        const _action = () => {

            dKeyInput.blur();

            // is this a subuser invitation link
            if (page.startsWith('businesssignup')) {
                mobile.passwordDecryption.decryptBSubuserInvitationLink(page);
            }

            return false;
        };

        dButton.on('tap.pwd', _action);

        this.passwordInput.$input.rebind('input keypress', e => {
            if (this.passwordInput.$input.val()) {
                dButton.disabled = false;
                if (e.keyCode === 13) {
                    _action();
                }
            }
            else {
                dButton.disabled = true;
            }
        });
    },

    /**
     * Decrypts the invitation link and redirects if successful
     * @param {String} link sub-user invitation link
     */
    decryptBSubuserInvitationLink(link) {
        'use strict';

        link = page.substring(14, link.length);
        var enteredPassword = this.passwordInput.$input.val();

        if (!enteredPassword.length) {
            return false;
        }
        else {
            M.require('businessAcc_js').done(() => {

                var business = new BusinessAccount();
                var failureAction = (st, res, desc) => {
                    var msg = l[17920]; // not valid password
                    if (res) {
                        msg = l[19567]; // not valid link 19567
                        console.error(st, res, desc);
                    }
                    msgDialog('warninga', '', msg, '', function () {
                        loadSubPage('start');
                    });
                };

                var decryptedTokenBase64 = business.decryptSubAccountInvitationLink(link, enteredPassword);

                if (decryptedTokenBase64) {
                    var getInfoPromise = business.getSignupCodeInfo(decryptedTokenBase64);

                    getInfoPromise.fail(failureAction);

                    getInfoPromise.done((status, res) => {
                        this.pwdDecryption.classList.add('hidden');
                        if (d) {
                            console.log(res);
                        }
                        if (!res.e || !res.firstname || !res.bpubk || !res.bu) {
                            failureAction(1, res, 'uv2 not complete response');
                        }
                        else {
                            mega.ui.header.hide();
                            if (u_type === false) {
                                parsepage(pages.mobile);

                                res.signupcode = decryptedTokenBase64;
                                localStorage.businessSubAc = JSON.stringify(res);
                                mobile.register.show(res);
                            }
                            else {
                                var msgTxt = l[18795];
                                // 'You are currently logged in. ' +
                                //  'Would you like to log out and proceed with business account registration ? ';
                                // closeDialog();
                                msgDialog('confirmation', l[968], msgTxt, '', function (e) {
                                    if (e) {
                                        mLogout();
                                    }
                                    else {
                                        loadSubPage('');
                                    }
                                });
                            }
                        }
                    });
                }
                else {
                    failureAction();
                }
            });
        }
    },

    showError(errorText) {
        'use strict';

        this.passwordInput.showError(`<i class="alert sprite-mobile-fm-mono
            icon-alert-triangle-thin-outline"></i>${escapeHTML(errorText)}`);
    },

    reset() {
        'use strict';

        folderlink = 1; // Trigger FM load home.
        M.currentdirid = undefined;

        MegaMobileHeader.init(true);
    }
};
