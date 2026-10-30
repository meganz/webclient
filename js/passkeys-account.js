/**
 * Passkeys - My Account > Security section + rename dialog. Crypto lives in security.passkey.
 */
lazy(self, 'passkeys', () => {
    'use strict';

    const account = {

        init() {

            this.section = document.querySelector('.account.data-block.passkeys');
            const nav = document.querySelector('.content-panel.account .acc-setting-menu-passkeys');

            if (!security.passkey.isEnabled() || !this.section) {
                return;
            }

            this.section.classList.remove('hidden');

            if (nav) {
                nav.classList.remove('hidden');
            }

            this.render().catch(dump);
        },

        async render() {

            const list = this.section.querySelector('.passkeys-list');
            const res = await security.passkey.list().catch(dump);
            const hasList = Array.isArray(res);

            if (hasList) {
                security.passkey.signalAccepted(res.map(r => r.id)).catch(dump);
            }

            if (!list) {
                return;
            }

            list.textContent = '';

            const table = mCreateElement('table', {class: 'data-table passkeys-table', width: '100%'}, list);
            const tr = mCreateElement('tr', undefined, table);

            mCreateElement('th', undefined, tr).textContent = l[86];
            mCreateElement('th', undefined, tr).textContent = l[17445];
            mCreateElement('th', undefined, tr).textContent = l.passkey_col_last_used;
            mCreateElement('th', {class: 'no-border'}, tr).textContent = '';

            const _appendRow = row => {

                const tr = mCreateElement('tr', undefined, table);
                const nameTd = mCreateElement('td', {class: 'passkey-name'}, tr);
                const addedTd = mCreateElement('td', undefined, tr);
                const usedTd = mCreateElement('td', undefined, tr);
                const actionsTd = mCreateElement('td', {class: 'no-border'}, tr);
                const ren = mCreateElement('button', {class: 'mega-button small passkey-ren'}, actionsTd);
                const del = mCreateElement('button', {class: 'mega-button small passkey-del'}, actionsTd);

                tr.dataset.id = row.id || '';
                mCreateElement('span', {class: 'passkey-row-name', title: row.n}, nameTd).textContent = row.n;
                mCreateElement('span', undefined, addedTd).textContent = row.ts && time2date(row.ts) || '-';
                mCreateElement('span', undefined, usedTd).textContent = row.lts && time2date(row.lts) || l[1051];
                mCreateElement('span', undefined, ren).textContent = l[61];
                mCreateElement('span', undefined, del).textContent = l[83];
            };

            if (hasList && res.length) {
                for (let i = 0; i < res.length; i++) {
                    _appendRow(res[i]);
                }
            }
            else {
                const tr = mCreateElement('tr', undefined, table);
                const td = mCreateElement('td', {class: 'data-table-empty', colspan: 4}, tr);

                mCreateElement('span', undefined, td).textContent = hasList
                    ? l.passkey_list_empty
                    : l.passkey_list_error;
            }

            const add = this.section.querySelector('.passkeys-add-button');

            add.classList.toggle('hidden', !security.passkey.isSupported());

            if (security.passkey.isSupported()) {
                security.passkey.isPrfSupported().then(ok => add.classList.toggle('hidden', !ok)).catch(dump);
            }

            this._bindEvents(add);
        },

        _bindEvents(add) {

            if (add) {
                add.onclick = async() => {

                    const rowNames = this.section.querySelectorAll('.passkey-row-name');
                    let max = 0;

                    for (const el of rowNames) {

                        const match = /^Passkey (\d+)$/.exec(el.textContent);

                        if (match) {
                            max = Math.max(max, parseInt(match[1], 10));
                        }
                    }

                    loadingDialog.show();

                    const ok = await security.passkey.register(l.passkey_default_name.replace('%1', max + 1))
                        .catch(ex => {

                            // dismissing the browser prompt is not a failure to report
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
                        await this.render();
                        mega.ui.toast.show(l.passkey_added_toast);
                    }
                };
            }

            const _rename = (id, currentName) => {

                if (!id) {
                    return;
                }

                if (!mega.ui.renameNode) {
                    mega.ui.renameNode = new NodeNameControl({type: 'rename'});
                }

                const {$input} = mega.ui.renameNode.nameInput;

                $input.rebind('input.passkeyName', e => {

                    if (mega.ui.sheet.name === 'passkey-rename' && !(e.originalEvent && e.originalEvent.isComposing)) {
                        $input.val(security.passkey.clipName($input.val()));
                    }
                });

                mega.ui.renameNode.show({name: currentName, t: 0}, {
                    canSubmit: value => value.trim() !== currentName && security.passkey.isValidName(value.trim()),
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

                        if (!name || name === currentName) {
                            return;
                        }

                        loadingDialog.show();

                        const ok = await security.passkey.rename(id, name);

                        loadingDialog.hide();

                        if (ok) {
                            await this.render();
                            mega.ui.toast.show(l.passkey_renamed_toast);
                        }
                    }
                });
            };

            const _delete = id => {

                if (!id) {
                    return;
                }

                msgDialog(
                    'confirmation',
                    '',
                    l.passkey_remove_title,
                    l.passkey_remove_info,
                    async yes => {

                        if (!yes) {
                            return;
                        }

                        loadingDialog.show();

                        const ok = await security.passkey.remove(id);

                        loadingDialog.hide();

                        if (ok) {
                            await this.render();
                            mega.ui.toast.show(l.passkey_removed_toast);
                        }
                    }
                );
            };

            for (const tr of this.section.querySelectorAll('.passkeys-table tr[data-id]')) {

                tr.querySelector('.passkey-ren').onclick =
                    () => _rename(tr.dataset.id, tr.querySelector('.passkey-row-name').textContent);
                tr.querySelector('.passkey-del').onclick = () => _delete(tr.dataset.id);
            }
        }
    };

    return {account};
});
