/**
 * Folder and File link - user enters the decryption key then they can download the file/view the folder
 */
mobile.keyDecryption = {

    /**
     * Initialise and show the page
     * @param {String} publicHandle The public file/folder handle
     * @param {Boolean} folderLink If this was a folder link
     * @param {Boolean} previousKeyIncorrect If the previous attempt was incorrect
     * @param {String} selector New link selector
     * @returns {void}
     */
    init: function(publicHandle, folderLink, previousKeyIncorrect, selector) {
        'use strict';

        // neccessary when navigation between fm and folderlink happens
        this.reset();

        // Megainput cannot be cached as jQuery event will be reset, so reinit always.
        // TODO: once MegaInput changes to using Emitter remove this.
        const dKey = document.createElement('input');
        dKey.id = 'decryption_text';
        dKey.className = 'underlinedText clearButton with-icon mobile decryption-key';
        dKey.title = l[1028];
        dKey.value = '';

        let decryptionKeyInput;
        let dButton;

        if (this.domNode) {

            decryptionKeyInput = $('#decryption_text', this.domNode).parent();
            decryptionKeyInput.replaceWith(dKey);
            dButton = this.domNode.componentSelector('.mobile.decrypt-button');
        }
        else {
            this.domNode = document.createElement('div');
            this.domNode.id = 'mobile-key-decryption';
            this.domNode.className = 'file-folder-view';

            const title = document.createElement('h2');
            title.textContent = l[1026];

            const subNode = document.createElement('div');
            subNode.className = 'decryption-msg';
            subNode.textContent = removeHTML((pfcol) ? l.album_decr_key_descr : `${l[7945]} ${l[7972]}`);

            this.domNode.append(title, subNode, dKey);

            dButton = new MegaMobileButton({
                type: 'normal',
                text: l[1027],
                parentNode: this.domNode,
                componentClassname: 'mobile decrypt-button',
                disabled: !previousKeyIncorrect
            });
        }

        dButton.rebind('tap.keydlg', function() {

            if (this.hasClass('active')) {

                // Trim the input from the user for whitespace, newlines etc on either end
                let key = dKey.value.trim();

                if (key) {

                    // Remove the !,# from the key which is exported from the export dialog
                    key = key.replace('!', '').replace('#', '');

                    let newHash = `${folderLink ? '/#F!' : '/#!'}${publicHandle}!${key}`;

                    if (pfcol) {
                        newHash = `/collection/${publicHandle}#${key}`;
                    }
                    else if (isPublickLinkV2(getSitePath())) {
                        newHash = `${folderLink ? '/folder/' : '/file/'}${publicHandle}#${key}${selector || ''}`;
                    }

                    if (getSitePath() === newHash) {
                        decryptionKeyInput.showError(`<i class="alert sprite-mobile-fm-mono
                            icon-alert-triangle-thin-outline"></i>${escapeHTML(l[16471])} ${escapeHTML(l[16472])}`);
                    }
                    else {
                        loadSubPage(newHash);
                    }
                }
            }
        });

        decryptionKeyInput = new mega.ui.MegaInputs($(dKey));
        decryptionKeyInput.$wrapper.addClass('box-style fixed-width mobile');

        decryptionKeyInput.$input.rebind('input keypress', function(e)  {

            if (this.classList.contains('errored')) {
                decryptionKeyInput.hideError();
            }

            if (this.value.trim()) {
                dButton.disabled = false;
                dButton.addClass('active');

                if (e.keyCode === 13) {
                    dButton.trigger('tap.keydlg');
                }
            }
            else {
                dButton.removeClass('active');
                dButton.disabled = true;
            }
        });

        document.getElementById('startholder').append(this.domNode);

        // If the previous folder key was incorrect, show an error message for them to try again
        if (previousKeyIncorrect) {
            decryptionKeyInput.showError(`<i class="alert sprite-mobile-fm-mono
                icon-alert-triangle-thin-outline"></i>${escapeHTML(l[16471])} ${escapeHTML(l[16472])}`);
        }
    },

    reset() {
        'use strict';

        folderlink = 1;
        M.currentdirid = undefined;

        MegaMobileHeader.init(true);
    }
};

// Mobile version mKeyDialog sym
mKeyDialog = async function(ph, fl, keyr, selector) {

    'use strict';

    mobile.keyDecryption.init(ph, fl, keyr, selector);
    return Promise.resolve();
};
