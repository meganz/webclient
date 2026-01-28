/** @property mega.ui.linkAccess */
lazy(mega.ui, 'linkAccess', () => {
    'use strict';

    const ce = (n, t, a) => mCreateElement(n, a, t);
    const startNode = document.getElementById('startholder');

    class AccessBox extends MegaComponent {

        constructor(options) {
            super(options);

            const {domNode} = this;
            const {
                actionButton, onClick = nop,
                icon, items, title, text,
                inputType, inputLabel
            } = options;

            domNode.classList.add('dl-access-box', 'vo-hidden');

            let node = ce('div', domNode, {class: 'file-folder-view main-content'});

            if (icon) {
                ce('i', node, {class: `no-access icon ${icon}`});
            }
            ce('h2', node).textContent = title || '';

            node = ce('div', node, {class: 'no-content'});

            if (text) {
                ce('p', node, items ? {class: 'strong'} : null).append(
                    parseHTML(text)
                );
            }

            if (items && items.length) {
                node = ce('ul', node);
                for (const item of items) {
                    ce('li', node).textContent = item;
                }
            }

            if (inputType) {
                const inputWrap = ce('div', node, {class: 'input-wrap'});

                if (inputLabel) {
                    ce('div', inputWrap, {class: 'input-label'}).textContent = inputLabel;
                }

                const inputNode = ce('input', inputWrap, {
                    'class': 'underlinedText clearButton',
                    'type': inputType,
                    'name': 'decrypt-link',
                    'data-wrapper-class': `box-style ${is_mobile ? 'fixed-width mobile' : 'rvp'}`,
                });

                this.megaInput = new mega.ui.MegaInputs($(inputNode));

                this.megaInput.$input.rebind('input.enterKey keypress.enterKey', (e) =>  {
                    if (e.keyCode === 13) {
                        onClick();
                    }
                });
            }

            if (actionButton) {
                const footerNode = ce('div', node, {class: 'footer'});
                this.actionButton = MegaButton.factory({
                    parentNode: footerNode,
                    text: actionButton,
                    componentClassname: `decrypt-button ${is_mobile ? 'mobile' : 'slim font-600'}`,
                    loaderIcon: 'icon-loader-throbber-light-outline-after',
                    type: 'normal'
                });

                this.actionButton.on(`${is_mobile ? 'tap' : 'click'}.linkAccess`, () => {
                    onClick();
                    return false;
                });
            }
        }

        show() {
            requestAnimationFrame(() => this.domNode.classList.remove('vo-hidden'));
        }

        hide() {
            requestAnimationFrame(() => this.domNode.classList.add('vo-hidden'));
        }
    }

    return freeze({
        data: Object.create(null),

        get inputValue() {
            const {megaInput} = this.data.accessBox || {};

            return megaInput ? megaInput.$input.val() : '';
        },

        set inputValue(value) {
            const {megaInput} = this.data.accessBox || {};

            if (megaInput) {
                megaInput.$input.val(typeof value === 'string' ? value : '').trigger('input');
            }
        },

        set loader(value) {
            const {actionButton} = this.data.accessBox || {};

            if (actionButton) {
                actionButton.loading = !!value;
            }
        },

        /*
         * Init UI, reset vars
         * @returns {void}
        */
        init() {
            const dlNode = startNode.querySelector('.bottom-page');

            if (dlNode) {
                dlNode.classList.add('hidden');
            }

            startNode.classList.add('empty');

            /*
             * Replace 'fm' page so that when on the Folder link page,
             * you can open the actual `fm` page without using redirects to start/login,
             * which will prevent you from returning to the folder link
            */
            page = 'linkaccess';

            // necessary for navigation between folder link and cloud or account pages
            if (is_mobile) {
                M.currentdirid = undefined;

                if ('banner' in mobile) {
                    mobile.banner.hide();
                }
                MegaMobileHeader.init(true);
                MegaMobileBanner.init();
                mobile.appBanner.updateBanner('');
            }

            delete this.data.accessBox;
        },

        /*
         * Show Key decryption box
         * @param {Object} opts I.e. ph, fl, keyr, selector
         * @returns {Promise}
        */
        async showDecryptionKeyUI(ph, fl, keyr, selector) {
            this.init();

            this.data.accessBox = new AccessBox({
                actionButton: l.dl_decrypt_btn,
                componentClassname: 'decrytion-box',
                icon: is_mobile ? '' : 'image key',
                inputLabel: l[1028],
                inputType: 'text',
                parentNode: startNode.querySelector('.content-holder'),
                text: l[7945],
                title: l[1026],
                onClick: () => {
                    let key = $.trim(this.inputValue);

                    if (key) {
                        // Remove the !,# from the key which is exported from the export dialog
                        key = key.split(/[^\w-]/)[0];

                        const path = `/${pfcol ? 'collection' : fl ? 'folder' : 'file'}/${ph}#${key}${selector || ''}`;

                        if (getSitePath() === path) {
                            this.showInputError(l[9048]);
                        }
                        else {
                            loadSubPage(path);
                        }
                    }
                    else {
                        this.showInputError(l.dl_enter_valid_key_err);
                    }
                }
            });
            this.data.accessBox.show();

            if (keyr) {
                delay('linkAccess:showError', () => {
                    this.inputValue = keyr;
                    this.showInputError(l[9048]);
                }, 600);
            }

            if ('gallery' in mega && mega.gallery.albums) {
                mega.gallery.albums.disposeAll();
                mega.gallery.albumsRendered = false;
            }

            mBroadcaster.sendMessage('mKeyDialog', !!keyr);

            return Promise.resolve();
        },

        /*
         * Show Passoword decryption box
         * @param {String} page
         * @returns {void}
        */
        showDecryptionPassUI(page) {
            this.init();

            this.data.accessBox = new AccessBox({
                actionButton: l[507],
                componentClassname: 'decrytion-box',
                icon: is_mobile ? '' : 'image password',
                inputLabel: l[909],
                inputType: 'password',
                parentNode: startNode.querySelector('.content-holder'),
                text: l.dl_enter_pass_info,
                title: l.dl_enter_pass_header,
                onClick: () => {
                    const {megaInput} = this.data.accessBox || {};

                    if ($.trim(megaInput ? megaInput.$input.val() : '')) {
                        exportPassword.decrypt.decryptLink(page);
                    }
                    else {
                        this.showInputError(l.dl_enter_valid_pass_err);
                    }
                }
            });

            this.data.accessBox.show();
        },

        /*
         * Show Decryption error under the input
         * @param {String} msg Error message
         * @returns {void}
        */
        showInputError(msg) {
            const {megaInput} = this.data.accessBox || {};

            this.loader = false;

            if (!megaInput) {
                return false;
            }

            if (msg) {
                megaInput.showError(
                    `<i class="alert ${mega.ui.sprites.mono} icon-alert-triangle-thin-outline"></i>${msg}`
                );
            }
            else {
                megaInput.hideError();
            }

            megaInput.$input.focus();
        },

        /*
         * Show Global error box for File/Folder/Album link
         * @param {Number|Object} res Invalid link api resoponse
         * @returns {void}
        */
        showErrorUI(res) {
            const [title, text, items = []] = Array.isArray(res) ? res : this.getErrorMessage(res) || [];

            if (!text) {
                return false;
            }

            this.init();

            this.data.accessBox = new AccessBox({
                parentNode: startNode.querySelector('.content-holder'),
                title,
                text,
                items,
                icon: is_mobile ? 'sprite-mobile-fm-mono icon-alert-circle-thin-outline' :
                    'sprite-fm-mono icon-x-circle-thin-solid',
            });

            this.data.accessBox.show();
        },

        /*
         * Get error file/folder/album link error data
         * @param {Number|Object} res Invalid link api resoponse
         * @returns {Array} Error data [title, text. items]
        */
        getErrorMessage(res = false) {
            /*
             * List of possible key combinations
             *
             * l.dl_na_file_error
             * l.dl_na_folder_error
             * l.dl_na_album_error
             * l.dl_na_file_err_header
             * l.dl_na_folder_err_header
             * l.dl_na_album_err_header
             * l.dl_expired_file_err
             * l.dl_expired_folder_err
             * l.dl_expired_album_err
             * l.dl_file_wo_access
             * l.dl_folder_wo_access
             * l.dl_album_wo_access
             * l.dl_temp_na_file_err
             * l.dl_temp_na_folder_err
             * l.dl_temp_na_album_err
            */
            const type = pfcol ? 'album' : pfid ? 'folder' : 'file';
            const naString = l[`dl_na_${type}_error`].split('[BR]');
            let text = null;
            let items = null;
            let title = null;

            if (typeof res === 'object' && res.err < 0 && res.u !== 7) {
                res = res.err;
            }

            /*
             * Was this link removed due to multiple violations?
            */
            if (res === ETOOMANY) {
                title = l[`dl_na_${type}_err_header`];
                text = l[731];
            }
            else if (typeof res === 'number' && res < 0) {
                /*
                 * Is this an Invalid URL?
                  * The link you're trying to access doesn't exist. The URL may be incorrect.
                */
                if (res === EARGS) {
                    title = l[20198];
                    text = l.dl_doesnt_exist_err;
                }
                /*
                 * Is this an expired link?
                */
                else if (res === EEXPIRED) {
                    text = l[`dl_expired_${type}_err`];
                }
                /*
                 * Was this link deleted or file doesn't exist?
                */
                else {
                    text = l.dl_na_error_reasons;
                    items = naString;
                }
            }
            else if (res.err < 0) {
                /*
                 * The link you are trying to access is unavailable because the folder
                 * or file was reported to contain illegal/objectionable content.
                 * The account of the user who created this link has been terminated...
                */
                if (res.l === 2) {
                    const link = 'https://www.stopitnow.org.uk/concerned-about-your-own-thoughts-or-behaviour/' +
                        'concerned-about-use-of-the-internet/self-help/understanding-the-behaviour/?utm_source=mega' +
                        '&utm_medium=banner&utm_campaign=mega_warning';
                    const info = l.etd_link_removed_body +
                        `<a class="clickurl" href="${link}" target="_blank" data-eventid="500245">` +
                        l.etd_link_removed_button +
                        `</a>`;

                    text = `<span class="sn-error">` +
                        `${info.replace(/(<strong>[\S\s]*?<\/strong>[\S\s]*)/, '<em>$1</em>')}</span>`;
                    title = l.etd_link_removed_title;

                    eventlog(500243);
                }
                /*
                 * Was this link removed due to (gross) violation?
                */
                else {
                    title = l[`dl_na_${type}_err_header`];
                    text = l.dl_gross_violation_err;
                }
                console.assert(res.u === 7);
            }
            else if (res.e === ETEMPUNAVAIL) {
                /*
                 * The file you're trying to access is temporarily unavailable
                 * Please try again later
                */
                title = l[`dl_temp_na_${type}_err`];
                text = l[253];
            }
            else if (res.d || !res.at) {
                /*
                 * Was this link deleted or file doesn't exist?
                */
                text = l.dl_na_error_reasons;
                items = naString;
            }

            if (text) {
                return [title || l[`dl_${type}_wo_access`], text, items];
            }

            return false;
        },
    });
});
