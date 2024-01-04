mobile.settings.account.lostAuthDevice = Object.create(mobile.settingsHelper, {
    /**
     * Initiate and render the page, fetch from cache if already inited.
     *
     * @returns {boolean} True if cached, undefined otherwise.
     */
    init: {
        value: function() {
            'use strict';

            if (this.domNode) {
                return this.render();
            }

            this.domNode = this.generatePage('lost-auth-device');

            // Lost authenticator device page
            this.infoNode = mCreateElement('div', undefined, this.domNode);

            // Account reset details
            let dataNode = mCreateElement('p', undefined, this.infoNode);
            mCreateElement('b', undefined, dataNode).textContent = l[19852];
            mCreateElement('p', undefined, this.infoNode).textContent = l.lost_two_fa_device_info;
            mCreateElement('p', undefined, this.infoNode).append(parseHTML(l.account_reset_details));

            // Form elements wrapper
            dataNode = mCreateElement('div', {class: 'form-elements'}, this.infoNode);

            // Recovery code input
            mCreateElement('input', {
                'class': 'underlinedText recoveryKey copyButton',
                'data-wrapper-class': 'box-style fixed-width mobile',
                'name': 'recoveryKey',
                'readonly': true,
                'title': l.recovery_key_input_heading,
                'type': 'text'
            }, dataNode);

            // Download recovery key button
            new MegaMobileButton({
                parentNode: dataNode,
                componentClassname: 'form-button block ',
                text: l.recovery_key_download_button
            }).on('tap.downloadKey', () => {
                M.saveAs(a32_to_base64(window.u_k || ''), `${M.getSafeName(l[20830])}.txt`)
                    .then(() => mega.ui.toast.show(l.recovery_key_download_toast)).catch(tell);
            });

            // Reset account button
            new MegaMobileButton({
                parentNode: dataNode,
                componentClassname: 'form-button block secondary',
                text: l.account_reset_label
            }).on('tap.accountReset', () => this.resetAccount());

            // Reset account details page
            this.resetNode = mCreateElement('div', undefined, this.domNode);

            // Reset account email details
            dataNode = mCreateElement('div', {'class': 'form-info'}, this.resetNode);
            mCreateElement('p', undefined, dataNode).append(
                parseHTML(l.account_reset_email_info.replace('%1', u_attr.email))
            );

            // Resent email button
            new MegaMobileButton({
                parentNode: this.resetNode,
                componentClassname: 'form-button block ',
                text: l.resend_email
            }).on('tap.resendEmail', () => this.resetAccount());

            this.render();
        },
    },

    /**
     * Render Lost your authentication device page
     * @returns {void} void
     */
    render: {
        value: function() {
            'use strict';

            this.domNode.classList.add('default-form');
            this.infoNode.classList.remove('hidden');
            this.resetNode.classList.add('hidden');
            this.resetProgress = false;

            // Recovery code input init
            this.codeInput = new mega.ui.MegaInputs($('.recoveryKey', this.infoNode), {
                copyToastText: l[8836]
            }).setValue(a32_to_base64(window.u_k || ''));

            this.show();
        }
    },

    /**
     * Send Reset account email
     * @returns {void} void
     */
    resetAccount: {
        value: function() {
            'use strict';

            loadingDialog.show();

            api.req({a: 'erm', m: u_attr.email, t: 9})
                .then(() => {
                    // Show Reset account details page
                    this.resetProgress = true;
                    this.infoNode.classList.add('hidden');
                    this.resetNode.classList.remove('hidden');

                    // Account reset
                    document.querySelector('.mega-header .bottom-block .heading')
                        .textContent = l.account_reset_label;

                    // Email sent to u_attr_email
                    mega.ui.toast.show(l.email_sent_to_address.replace('%1', u_attr.email));
                })
                .catch((ex) => {
                    // Invalid email adress, please check your email and try again
                    if (ex === ENOENT) {
                        return msgDialog('warningb', l[1513], l[1946]);
                    }
                    tell(ex);
                })
                .finally(() => loadingDialog.hide());
        }
    },

    /**
     * Back to previous page
     * @returns {void} void
     */
    back: {
        value: function() {
            'use strict';

            if (this.resetProgress) {
                this.render();
            }
            else {
                history.back();
            }
        }
    }
});
