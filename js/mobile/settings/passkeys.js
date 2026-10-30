mobile.settings.passkeys = Object.create(mobile.settingsHelper, {

    /**
     * Initiate and render the page, fetch from cache if already inited.
     *
     * @returns {boolean} True if cached, undefined otherwise.
     */
    init: {
        async value() {

            'use strict';

            if (!security.passkey.isEnabled()) {
                return loadSubPage('fm/account/security');
            }

            if (this.domNode) {
                this.show();
                return true;
            }

            this.domNode = this.generatePage('settings-passkeys');

            await this.updateCallback();

            this.show();
        }
    },

    /**
     * Fetch the passkeys and rebuild the page.
     *
     * @returns {Promise<void>}
     */
    updateCallback: {

        async value() {

            'use strict';

            loadingDialog.show('passkeys-api-req');

            const res = await security.passkey.list().catch(dump);

            loadingDialog.hide('passkeys-api-req');

            const hasList = Array.isArray(res);

            if (hasList) {
                security.passkey.signalAccepted(res.map(r => r.id)).catch(dump);
            }

            this.rows = hasList ? res : [];
            this.domNode.textContent = '';

            mCreateElement('p', {'class': 'passkeys-info'}, this.domNode).textContent = l.passkey_add_info;
            mCreateElement('h3', undefined, this.domNode).textContent = l.passkey_list_title;

            const list = mCreateElement('div', {'class': 'passkeys-list'}, this.domNode);

            if (this.rows.length) {
                for (const row of this.rows) {
                    list.appendChild(this.generateRow(row));
                }
            }
            else {
                mCreateElement('p', {'class': 'passkeys-empty'}, list).textContent =
                    hasList ? l.passkey_list_empty : l.passkey_list_error;
            }

            if (security.passkey.isSupported() && await security.passkey.isPrfSupported()) {

                const actions = mCreateElement('div', {'class': 'action-buttons'}, this.domNode);
                const add = new MegaButton({
                    parentNode: actions,
                    text: l.passkey_add_button,
                    componentClassname: 'block primary'
                });

                add.on('tap', () => this.add());
            }
        }
    },

    /**
     * Register a new passkey, named after the highest existing "Passkey N".
     *
     * @returns {Promise<void>}
     */
    add: {

        async value() {

            'use strict';

            let max = 0;

            for (const row of this.rows) {

                const match = /^Passkey (\d+)$/.exec(row.n);

                if (match) {
                    max = Math.max(max, parseInt(match[1], 10));
                }
            }

            loadingDialog.show();

            const ok = await security.passkey.register(l.passkey_default_name.replace('%1', max + 1)).catch(ex => {

                if (ex.name === 'NotAllowedError') {
                    return false;
                }

                if (ex.name === 'PrfUnsupported') {
                    return msgDialog('warninga', '', l.passkey_unusable_title, l.passkey_unusable_info);
                }

                if (ex.name === 'InvalidStateError') {
                    return msgDialog('info', '', l.passkey_exists_title, l.passkey_exists_info);
                }

                return tell(ex.message || ex);
            });

            loadingDialog.hide();

            if (ok) {

                await this.updateCallback();
                mega.ui.toast.show(l.passkey_added_toast);
            }
        }
    },

    /**
     * Rename a passkey through the shared name dialog.
     *
     * @param {Object} row Passkey list entry
     * @returns {void}
     */
    rename: {

        value(row) {

            'use strict';

            if (!mega.ui.renameNode) {
                mega.ui.renameNode = new NodeNameControl({type: 'rename'});
            }

            const {$input} = mega.ui.renameNode.nameInput;

            $input.rebind('input.passkeyName', e => {

                if (mega.ui.sheet.name === 'passkey-rename' && !(e.originalEvent && e.originalEvent.isComposing)) {
                    $input.val(security.passkey.clipName($input.val()));
                }
            });

            mega.ui.renameNode.show({name: row.n, t: 0}, {
                canSubmit: value => value.trim() !== row.n && security.passkey.isValidName(value.trim()),
                overrideTypeInfo: {
                    name: 'passkey-rename',
                    placeholder: escapeHTML(l.passkey_name_placeholder),
                    selection: false,
                    checkSpaces: false,
                    title: () => escapeHTML(l.passkey_rename_title),
                    button: escapeHTML(l[61]),
                    empty: escapeHTML(l[5744]),
                    submit: nop
                },
                overrideAction: async({value, close}) => {

                    const name = String(value || '').trim();

                    close();

                    if (!name || name === row.n) {
                        return;
                    }

                    loadingDialog.show();

                    const ok = await security.passkey.rename(row.id, name);

                    loadingDialog.hide();

                    if (ok) {
                        await this.updateCallback();
                        mega.ui.toast.show(l.passkey_renamed_toast);
                    }
                }
            });
        }
    },

    /**
     * Remove a passkey after confirmation.
     *
     * @param {Object} row Passkey list entry
     * @returns {void}
     */
    remove: {

        value(row) {

            'use strict';

            mega.ui.sheet.show({
                name: 'passkey-remove-confirm',
                type: 'modal',
                showClose: true,
                title: l.passkey_remove_title,
                content: l.passkey_remove_info,
                actions: [
                    {
                        type: 'normal',
                        text: l[82],
                        className: 'secondary block confirm',
                        onClick: () => {
                            mega.ui.sheet.hide();
                        }
                    },
                    {
                        type: 'normal',
                        text: l[83],
                        className: 'primary block confirm',
                        onClick: () => {

                            mega.ui.sheet.hide();
                            loadingDialog.show();

                            security.passkey.remove(row.id)
                                .then(ok => ok && this.updateCallback()
                                    .then(() => mega.ui.toast.show(l.passkey_removed_toast)))
                                .catch(dump)
                                .finally(() => loadingDialog.hide());
                        }
                    }
                ]
            });
        }
    },

    /**
     * Build one passkey row.
     *
     * @param {Object} row Passkey list entry
     * @returns {HTMLDivElement} Row node
     */
    generateRow: {

        value(row) {

            'use strict';

            const node = mCreateElement('div', {'class': 'mobile passkey'});
            const heading = mCreateElement('div', {'class': 'heading'}, node);

            mCreateElement('span', {'class': 'name'}, heading).textContent = row.n;

            const actions = mCreateElement('div', {'class': 'actions'}, heading);
            const data = mCreateElement('div', {'class': 'data'}, node);

            mCreateElement('span', undefined, data).textContent =
                `${l[17445]}: ${row.ts && time2date(row.ts) || '-'}`;
            mCreateElement('span', undefined, data).textContent =
                `${l.passkey_col_last_used}: ${row.lts && time2date(row.lts) || l[1051]}`;

            const cls = 'action-link passkey-action-button';
            const ren = new MegaButton({parentNode: actions, componentClassname: cls, text: l[61]});
            const del = new MegaButton({parentNode: actions, componentClassname: `${cls} remove`, text: l[83]});

            ren.on('tap', () => this.rename(row));
            del.on('tap', () => this.remove(row));

            return node;
        }
    }
});
