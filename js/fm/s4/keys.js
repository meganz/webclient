lazy(s4, 'keys', () => {
    'use strict';

    const {exportKey} = s4.utils;
    const {S4List: UIS4List, S4PagedDialog} = s4.ui.classes;

    const handlers = freeze({

        validateName(name) {
            const maxLength = 32;
            if (!name) {
                return l.s4_key_empty_error;
            }

            if (name.length > maxLength) {
                return l.s4_key_max_length_error.replace('%d', maxLength);
            }

            if (!s4.kernel.isValidKeyName(name)) {
                return l.s4_key_not_allowed_chars_error;
            }
            return null;
        },

        enable(isEnable) {
            mLoadingSpinner.show('s4-key-enable');
            return s4.ui.lists.keys.findSelected()
                .then((item) => s4.kernel.keys.enable(s4.ui.lists.keys.handle, item.ak, isEnable))
                .catch(tell)
                .finally(() => {
                    mLoadingSpinner.hide('s4-key-enable');
                });
        },

        copyKey(e) {
            const $row = $(e.currentTarget).closest('tr');
            const ak = $('.access-key span', $row).text();
            const sk = $('.secret-key input', $row).val();
            const dataKey = $(e.currentTarget).attr('data-key');
            const value = dataKey === 'ak' ? ak : sk;
            const message = dataKey === 'ak' ? l.s4_access_key_copied_toast_txt : l.s4_secret_key_copied_toast_txt;

            return copyToClipboard(value, message, 'recoveryKey');
        },

        download() {
            return s4.ui.lists.keys.findSelected()
                .then((item) => {
                    const {n, ak, sk} = item;
                    return M.saveAs(exportKey(ak, sk), M.getSafeName(`credentials-${n}`));
                })
                .then(() => {
                    showToast('s4AccessKey', l.s4_key_downloaded_toast_txt);
                })
                .catch(tell);
        },

        copyKeyConfig() {
            return s4.ui.lists.keys.findSelected()
                .then((item) => {
                    const {ak, sk} = item;
                    copyToClipboard(
                        exportKey(ak, sk),
                        l.s4_key_copied_toast_txt,
                        'recoveryKey'
                    );
                })
                .catch(tell);
        },

        toggleVis(e) {
            const $row = $(e.currentTarget).closest('tr');
            const $input = $('input.secret-key-value', $('.secret-key', $row));
            const $icon = $('i', e.currentTarget);

            if ($icon.hasClass('icon-eye-reveal')) {
                const $table = $row.closest('table');
                $('button.toggle-vis i.icon-eye-hidden', $table)
                    .removeClass('icon-eye-hidden')
                    .addClass('icon-eye-reveal');
                $('input.secret-key-value[type=text]', $table).attr('type', 'password');

                $input.attr('type', 'text');
                $icon.removeClass('icon-eye-reveal').addClass('icon-eye-hidden');
            }
            else {
                $input.attr('type', 'password');
                $icon.removeClass('icon-eye-hidden').addClass('icon-eye-reveal');
            }

        },

        rename() {
            return s4.ui.lists.keys.findSelected()
                .then((item) => {
                    const {n: name, ak: id} = item;
                    const obj = {name, id, kernel: 'keys'};
                    return s4.ui.renameDialog('keys', obj, l.s4_key_rename, 'icon-key');
                })
                .catch(tell);
        },

        remove() {
            return s4.ui.lists.keys.findSelected()
                .then((item) => {
                    const {n, ak} = item;
                    return asyncMsgDialog(
                        `-remove:!^${l[1730]}!${l.s4_key_confirm_delete_cancel}`,
                        l[1003],
                        l.s4_key_confirm_delete_title.replace('%s', n),
                        l.s4_key_confirm_delete_message,
                        async(yes) => {
                            if (yes) {
                                mLoadingSpinner.show('s4-key-remove');
                                return s4.kernel.keys.remove(s4.ui.lists.keys.handle, ak)
                                    .catch(tell)
                                    .finally(() => mLoadingSpinner.hide('s4-key-remove'));
                            }
                        },
                        1
                    );
                });
        },

        requiredLinks() {
            return s4.ui.lists.keys.findSelected()
                .then((item) => {
                    return item ? {
                        hide: [
                            'options',
                            'delete'
                        ],
                        show: [
                            `s4-key-${item.en ? 'disable' : 'enable'}`,
                            's4-key-download',
                            's4-key-copy-config',
                            's4-key-rename',
                            's4-key-delete'
                        ],
                    } : null;
                })
                .catch(tell);
        },

        initStatusBarLinks(classList) {
            if (classList.contains('s4-key-enable')) {
                this.enable(true);
            }
            else if (classList.contains('s4-key-disable')) {
                this.enable(false);
            }
            else if (classList.contains('s4-key-download')) {
                this.download();
            }
            else if (classList.contains('s4-key-copy-config')) {
                this.copyKeyConfig();
            }
            else if (classList.contains('s4-key-rename')) {
                this.rename();
            }
            else if (classList.contains('s4-key-delete')) {
                this.remove();
            }
        }
    });

    class S4CreateDialog extends S4PagedDialog {
        constructor(name) {
            super(name, $('.s4-create-access-key-dialog', '.mega-dialog-container'), 2);

            this.key = Object.create(null);
            this.text.header = l.s4_key_create;

            this.$keyInput = new mega.ui.MegaInputs($('input[name=key-name-input]', this.$steps[1]));
            this.$radioInputs = $('input[name=user]', this.$steps[1]);
        }

        destroy() {
            super.destroy();

            $('.key-user-row:not(.key-user-template)', this.$steps[1]).remove();
        }

        hide() {
            super.hide();

            this.key = Object.create(null);

            $('input:not([type=radio])', this.$dialogContainer).val('');
            this.$radioInputs.prop('checked', false)
                .parent().removeClass('radioOn').addClass('radioOff');
            this.$radioInputs.filter('[value=rootuser]').prop('checked', true)
                .parent().removeClass('radioOff').addClass('radioOn');
            $('li.selected', this.$steps[1]).removeClass('selected');
            $('.secret-key-value', this.$steps[2]).val('').attr('type', 'password');
            $('.icon-eye-hidden', this.$steps[2]).addClass('icon-eye-reveal').removeClass('icon-eye-hidden');
        }

        unbindEvents() {
            super.unbindEvents();

            const { $steps, $keyInput } = this;
            $keyInput.$input.unbind('keydown.s4dlg');
            $keyInput.$input.unbind('input.s4dlg');
            $('.radio-wrap', $steps[1]).unbind('click.s4dlg');
            $('input.container-user-search', $steps[1]).unbind('input.s4dlg');
            $('button.copy', $steps[2]).unbind('click.s4dlg');
            $('button.toggle-vis', $steps[2]).unbind('click.s4dlg');
        }

        bindEvents() {
            super.bindEvents();

            const {
                $steps,
                $keyInput,
                $radioInputs,
                $dialogProgress,
            } = this;
            // Step 1 events
            const $userSelectWrap = $('.user-select-wrap', $steps[1]);
            $keyInput.$input.rebind('keydown.s4dlg', (e) => {
                if (e.which === 13) {
                    $dialogProgress.trigger('click');
                }
            });
            $keyInput.$input.rebind('input.s4dlg', () => {
                this._validate();
            });
            $('.radio-wrap', $steps[1]).rebind('click.s4dlg', e => {
                const $clickedRadio = $('input', e.currentTarget);
                const wasOff = $clickedRadio.parent().hasClass('radioOff');
                $radioInputs.prop('checked', false).parent().removeClass('radioOn').addClass('radioOff');
                $clickedRadio.prop('checked', true).parent().removeClass('radioOff').addClass('radioOn');
                if (wasOff && $clickedRadio.is('[value=subuser]')) {
                    $userSelectWrap.removeClass('hidden');
                }
                else if (wasOff && $clickedRadio.is('[value=rootuser]')) {
                    $userSelectWrap.addClass('hidden');
                }
                this._validate();

                if (wasOff) {
                    delay('s4.input.focus', () => {
                        $keyInput.$input.focus();
                    }, 50);
                }
            });
            $('input.container-user-search', $steps[1]).rebind('input.s4dlg', e => {
                const val = $(e.currentTarget).val().toLowerCase();
                if (val) {
                    for (const userRow of $('tr[id^="cku_"]', $steps[1])) {
                        const $userRow = $(userRow);
                        if ($('span', $userRow).text().toLowerCase().includes(val)) {
                            $userRow.removeClass('hidden');
                        }
                        else {
                            $userRow.addClass('hidden');
                        }
                    }
                }
                else {
                    $('.key-user-row.hidden:not(.key-user-template)', $steps[1]).removeClass('hidden');
                }
            });
            // Step 2 events
            $('button.copy', $steps[2]).rebind('click.s4dlg', e => {
                const { key } = this;
                const dataKey = $(e.currentTarget).attr('data-key');
                const { [dataKey]: value } = key;
                const message = dataKey === 'ak' ? l.s4_access_key_copied_toast_txt : l.s4_secret_key_copied_toast_txt;
                copyToClipboard(value, message, 'recoveryKey');
            });
            $('button.toggle-vis', $steps[2]).rebind('click.s4dlg', e => {
                const $this = $('i', e.currentTarget);
                if ($this.hasClass('icon-eye-reveal')) {
                    $this.removeClass('icon-eye-reveal').addClass('icon-eye-hidden');
                    $('.secret-key-value', $steps[2]).attr('type', 'text');
                }
                else {
                    $this.removeClass('icon-eye-hidden').addClass('icon-eye-reveal');
                    $('.secret-key-value', $steps[2]).attr('type', 'password');
                }
            });
        }

        async step1(finalise) {
            if (finalise) {
                if (this._getNameError()) {
                    throw new Error('Invalid key name');
                }

                if (this._getUserError()) {
                    throw new Error('Invalid key user');
                }

                const { containerID } = M.currentCustomView;
                const n = this.$keyInput.$input.val().trim();
                const ui = $('.radioOn input[value=rootuser]', this.$steps[1]).length ?
                    null : $('tr.active', this.$steps[1]).prop('id').replace('cku_', '');
                this.key = { n, ui, en: true };

                const key = await s4.kernel.keys.create(containerID, ui, n);
                this.key = {...this.key, ...key};
            }
            this.$dialogProgress.addClass('disabled');
            $('.user-select-wrap', this.$steps[1]).addClass('hidden');
            $('.search-bar input', this.$steps[1]).val('');
            $('.key-user-row:not(.key-user-template)', this.$steps[1]).removeClass('active hidden');

            const uid = s4.ui.lastPathPart;
            const {containerID} = M.currentCustomView;
            if (uid) {
                await this._initUser(containerID, uid);
            }
            else {
                await this._initUserList(containerID);
            }

            this.initScrollbar(this.$steps[1].get(0).querySelector('.s4-table-scroll'));
            this.$steps[1].removeClass('hidden');
            this._showErrorMessage();
            delay('s4.input.focus', () => {
                this.$keyInput.$input.focus();
            }, 50);
        }

        async step2(finalise) {
            if (finalise) {
                this.$steps[2].addClass('hidden');
                return this._download();
            }
            if (this.key) {
                const {ak, sk} = this.key;
                this.$steps[1].addClass('hidden');
                $('header h2', this.$dialogContainer).text(l.s4_key_created_success);
                $('.key-success-text', this.$steps[2]).text(l.s4_key_dl_share);
                $('.access-key-value', this.$steps[2]).text(ak);
                $('.secret-key-value', this.$steps[2]).val(sk).attr('type', 'password');
                this.$dialogCancel.addClass('hidden');
                this.$dialogProgress.removeClass('disabled');
                $('span', this.$dialogProgress).text(l.s4_key_dl_button);
                this.$steps[2].removeClass('hidden');
            }
        }

        async _initUser(handle, uid) {
            const user = await s4.kernel.user.info(handle, uid);

            const currentUser = {...user, uid};
            let html = '';
            if (!$(`#cku_${currentUser.uid}`, this.$steps[1]).length) {
                html += this._createUserRow(currentUser);
            }
            if (html) {
                $('.key-users-table tbody', this.$steps[1]).safeAppend(html);
            }
            $(`#cku_${currentUser.uid}`, this.$steps[1]).addClass('active');
        }

        async _initUserList(handle) {
            const users = await s4.kernel.user.list(handle);

            let html = '';
            for (const user of users) {
                if (!$(`#cku_${user.uid}`, this.$steps[1]).length) {
                    html += this._createUserRow(user);
                }
            }
            if (html) {
                $('.key-users-table tbody', this.$steps[1]).safeAppend(html);
                $('.key-users-table tbody tr', this.$steps[1]).rebind('click.s4dlg', e => {
                    this._userRowToggle($(e.currentTarget));
                });
            }
        }

        _validate() {
            const message = this._getNameError();
            if (message || this._getUserError()) {
                this.$dialogProgress.addClass('disabled');
            }
            else {
                this.$dialogProgress.removeClass('disabled');
            }
            this._showErrorMessage(message === l.s4_key_empty_error ? null : message);
        }

        async _download() {
            const {n, ak, sk} = this.key;
            await M.saveAs(exportKey(ak, sk), M.getSafeName(`credentials-${n}`));
            showToast('s4AccessKey', l.s4_key_downloaded_toast_txt);
        }

        _createUserRow(user) {
            const { uid, name } = user;
            const $template = $(`.key-user-template`, this.$steps[1]).clone();
            $template.removeClass(`key-user-template hidden`).prop('id', `cku_${uid}`);
            $(`span.key-user-name`, $template).text(name);
            return $template.prop('outerHTML');
        }

        _userRowToggle($row) {
            if ($row.hasClass('active')) {
                $row.removeClass('active');
            }
            else {
                $('.active', $row.closest('table')).removeClass('active');
                $row.addClass('active');
            }
            this._validate();
        }

        _getNameError() {
            return handlers.validateName(this.$keyInput.$input.val());
        }

        _getUserError() {
            if (!($('.radioOn input', this.$steps[1]).val() === 'rootuser'
                || $('tr.active', this.$steps[1]).length)) {
                return l.s4_key_empty_user_error;
            }
        }

        _showErrorMessage(message) {
            const $container = this.$keyInput.$input.closest('.mega-input');
            const $err = $('.message-container', $container);

            if (message) {
                $err.text(message);
                $container.css('margin-bottom', `${$err.outerHeight()}px`);
                $container.addClass('msg error');
            }
            else {
                $err.text('');
                $container.css('margin-bottom', '');
                $container.removeClass('msg error');
            }
        }
    }

    const dialogs = Object.create(null);
    lazy(dialogs, 'create', () => new S4CreateDialog('create-key'));

    class S4List extends UIS4List {
        constructor(domNode, handle, onItems, onEmptyItems) {
            super(domNode, handle, onItems, onEmptyItems, S4List.getColsWidth(), 'n');

            /** @property S4List.template */
            lazy(this, 'template', () => {
                return parseHTML(S4List.template()).querySelector('tr');
            });
            Object.defineProperty(this, 'type', { value: 'keys' });
            Object.defineProperty(this, 'colsWidth', { value: S4List.getColsWidth()});
        }

        static getColsWidth() {
            return {
                'key-name': { min: 180, max: 5000 },
                'access-key': { min: 200, max: 300, init: 250 },
                'secret-key': { min: 200, max: 420, init: 250 },
                'status': { min: 120, max: 150, init: 150 },
            };
        }

        static supports(type) {
            return type === 'keys';
        }

        static template() {
            return '<tr>' +
                '<td class="key-name">' +
                    '<span></span>' +
                '</td>' +
                '<td class="access-key with-icons">' +
                    '<span></span>' +
                    '<button class="mega-button small action copy" data-key="ak">' +
                        '<i class="sprite-fm-mono icon-copy icon24"></i>' +
                    '</button>' +
                '</td>' +
                '<td class="secret-key with-icons">' +
                    '<input class="secret-key-value" type="password" readonly>' +
                    '<button class="mega-button small action toggle-vis">' +
                        '<i class="sprite-fm-mono icon-eye-reveal icon24"></i>' +
                    '</button>' +
                    '<button class="mega-button small action copy" data-key="sk">' +
                        '<i class="sprite-fm-mono icon-copy icon24"></i>' +
                    '</button>' +
                '</td>' +
                '<td class="status">' +
                    '<i class="sprite-fm-mono icon-active icon16"></i>' +
                    '<span></span>' +
                '</td>' +
            '</tr>';
        }

        get [Symbol.toStringTag]() {
            return 'S4KeysList';
        }

        setRow(row, {n, ak, sk, en}) {
            super.setRow(row, ak);

            const nNode = row.querySelector('td.key-name span');
            if (nNode.textContent !== n) {
                nNode.textContent = n;
            }
            const akNode = row.querySelector('td.access-key span');
            if (akNode.textContent !== ak) {
                akNode.textContent = ak;
            }
            const skNode = row.querySelector('td.secret-key input');
            if (skNode.value !== sk) {
                skNode.value = sk;
            }
            const enNode = row.querySelector('td.status span');
            const enText = en ? l.s4_enabled_key : l.s4_disabled_key;
            if (enNode.textContent !== enText) {
                const enClassList = row.querySelector('td.status i').classList;
                enClassList.remove(en ? 'icon-disabled-filled' : 'icon-active');
                enClassList.add(en ? 'icon-active' : 'icon-disabled-filled');
                enNode.textContent = enText;
            }
        }

        async getItems(n) {
            if ((n = super.getItems(n))) {
                return ['ak', await s4.kernel.keys.list(n.h)];
            }
        }

        handleSelection(event, onSelection) {
            const $row = $(event.target).closest('tr');
            const n = $('.key-name span', $row).text();
            const ak = $('.access-key span', $row).text();
            const sk = $('.secret-key input', $row).val();
            const en = $('.status i', $row).hasClass('icon-active');

            const item = {n, ak, sk, en};
            super.handleSelection(event, onSelection, item, 'ak');
        }

        unbindEvents() {
            super.unbindEvents();

            const dd = '.dropdown.body.context .dropdown-item';
            this.$tableData.unbind('contextmenu.s4klst');
            $(`${dd}.s4-key-enable`).unbind('click.s4klst.ctxm.enable');
            $(`${dd}.s4-key-disable`).unbind('click.s4klst.ctxm.disable');
            $(`${dd}.s4-key-download`).unbind('click.s4klst.ctxm.download');
            $(`${dd}.s4-key-copy-config`).unbind('click.s4klst.ctxm.copykeyconfig');
            $(`${dd}.s4-key-rename`).unbind('click.s4klst.ctxm.rename');
            $(`${dd}.s4-key-delete`).unbind('click.s4klst.ctxm.delete');
            $('button.copy', this.$tableData).unbind('click.s4klst.copykey');
            $('button.toggle-vis', this.$tableData).unbind('click.s4klst.reveal');
        }

        bindEvents() {
            super.bindEvents();

            const dd = '.dropdown.body.context .dropdown-item';
            this.$tableData.rebind('contextmenu.s4klst', (e) => {
                this.handleSelection(e, (key) => {
                    M.contextMenuUI(e, 8, [
                        `.s4-key-${key.en ? 'disable' : 'enable'}`,
                        '.s4-key-download',
                        '.s4-key-copy-config',
                        '.s4-key-rename',
                        '.s4-key-delete'
                    ].join(','));
                });
            });

            $(`${dd}.s4-key-enable`).rebind('click.s4klst.ctxm.enable', () => {
                handlers.enable(true);
            });

            $(`${dd}.s4-key-disable`).rebind('click.s4klst.ctxm.disable', () => {
                handlers.enable(false);
            });

            $(`${dd}.s4-key-download`).rebind('click.s4klst.ctxm.download', () => {
                handlers.download();
            });

            $(`${dd}.s4-key-copy-config`).rebind('click.s4klst.ctxm.copykeyconfig', () => {
                handlers.copyKeyConfig();
            });

            $(`${dd}.s4-key-rename`).rebind('click.s4klst.ctxm.rename', () => {
                handlers.rename();
            });

            $(`${dd}.s4-key-delete`).rebind('click.s4klst.ctxm.delete', () => {
                handlers.remove();
            });

            $('button.copy', this.$tableData).rebind('click.s4klst.copykey', e => {
                handlers.copyKey(e);
            });

            $('button.toggle-vis', this.$tableData).rebind('click.s4klst.reveal', e => {
                handlers.toggleVis(e);
            });
        }
    }

    return freeze({handlers, dialogs, S4CreateDialog, S4List});
});
