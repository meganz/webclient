/**
 * Page handling backup of the recovery key.
 */
mobile.settings.backupRecovery = Object.create(mobile.settingsHelper, {

    /**
     * Initiate and render the page
     *
     * @returns {undefined}
     */
    init: {
        value: function() {
            'use strict';

            if (this.domNode) {
                this.show();

                return true;
            }

            this.domNode = this.generatePage('settings-backup-recovery');
            const recoveryKey = a32_to_base64(window.u_k || '');

            // Information text
            mCreateElement('div', {'class': 'recovery-key info'}, [
                mCreateElement('span', {'class': 'text'}, [parseHTML(l.recovery_key_blurb)])
            ], this.domNode);

            let rkinput;

            // Actual recovery key input + download button
            const recoveryKeyContainer = mCreateElement('div', {'class': 'recovery-key container'}, [
                mCreateElement('span', {'class': 'recovery-key blurb'}, [document.createTextNode(
                    l.recovery_key_input_heading)]),
                rkinput = mCreateElement('div', {'class': 'recovery-key input'}, [
                    mCreateElement('input', {
                        'class': 'recovery-key string',
                        'type': 'text',
                        'readonly': '',
                        'value': recoveryKey
                    })])
            ], this.domNode);

            // Inline copy button
            const copyButton = new MegaMobileButton({
                parentNode: rkinput,
                type: 'icon',
                icon: 'sprite-mobile-fm-mono icon-copy-thin-outline',
                iconSize: 20,
                componentClassname: 'text-icon'
            });
            copyButton.on('tap', () => {
                eventlog(500026);
                copyToClipboard(recoveryKey, l[6040]);
            });

            // Download button
            const dlButton = new MegaMobileButton({
                parentNode: recoveryKeyContainer,
                text: l.recovery_key_download_button,
                componentClassname: 'primary block dlButton'
            });
            dlButton.on('tap', () => {
                eventlog(99994);
                M.saveAs(recoveryKey, `${M.getSafeName(l[20830])}.txt`)
                    .then(() => {
                        mega.ui.toast.show(l.recovery_key_download_toast); // Downloaded copy
                    })
                    .catch(tell);
            });

            this.show();
        }
    }
});
