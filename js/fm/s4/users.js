lazy(s4, 'users', () => {
    'use strict';

    const {exportKey} = s4.utils;
    const {S4List: UIS4List, S4PagedDialog} = s4.ui.classes;

    const handlers = freeze({

        validateName(name) {
            const maxLength = 64;
            if (!name) {
                return l.s4_user_empty_error;
            }

            if (name.length > maxLength) {
                return l.s4_user_max_length_error.replace('%d', maxLength);
            }

            if (!s4.kernel.isValidUserName(name)) {
                return l.s4_user_not_allowed_chars_error;
            }
        },

        async checkNameAvailable(name, skipName) {
            const {containerID} = M.currentCustomView;
            const users = await s4.kernel.user.list(containerID);
            const user = users.find((user) => {
                if (skipName && user.name.toLowerCase() === skipName.toLowerCase()) {
                    return false;
                }
                return user.name.toLowerCase() === name.toLowerCase();
            });

            if (user) {
                throw new Error(l.s4_user_name_duplicate_error);
            }
        },

        download() {
            return s4.ui.lists.users.findSelected()
                .then((item) => {
                    const {n, ak, sk} = item;
                    return M.saveAs(exportKey(ak, sk), M.getSafeName(`credentials-${n}`));
                })
                .then(() => {
                    showToast('s4AccessKey', l.s4_key_downloaded_toast_txt);
                })
                .catch(tell);
        },

        rename() {
            return s4.ui.lists.users.findSelected()
                .then((item) => {
                    const {name, uid: id} = item;
                    const obj = {name, id, kernel: 'user'};
                    return s4.ui.renameDialog('users', obj, l.s4_user_rename, 'icon-user-filled');
                })
                .catch(tell);
        },

        copyArn(e) {
            if (e) {
                const $row = $(e.currentTarget).closest('tr');
                const $block = $(e.currentTarget).closest('.values-col');
                let name = '';
                let arn = '';
                if ($row.length) {
                    name = $('.s4-user-name span', $row).text();
                    arn = $('.s4-user-arn span', $row).text();
                }
                else if ($block.length) {
                    name = $('.js-user-name-value', $block).text();
                    arn = $('.js-user-arn-value span', $block).text();
                }
                if (name && arn) {
                    return copyToClipboard(arn, l.s4_user_arn_copied_toast_txt);
                }
                return copyToClipboard('', l[6949]);
            }
            return s4.ui.lists.users.findSelected()
                .then((item) => {
                    copyToClipboard(item.arn, l.s4_user_arn_copied_toast_txt);
                })
                .catch(tell);
        },

        remove() {
            return s4.ui.lists.users.findSelected()
                .then((item) => {
                    const {uid, name} = item;
                    return asyncMsgDialog(
                        `-remove:!^${l[1730]}!${l.s4_key_confirm_delete_cancel}`,
                        l[1003],
                        l.s4_key_confirm_delete_title.replace('%s', name),
                        l.s4_user_confirm_delete_message,
                        async(yes) => {
                            if (yes) {
                                mLoadingSpinner.show('s4-user-delete');
                                return s4.kernel.user.remove(M.currentCustomView.containerID, parseInt(uid))
                                    .catch(tell)
                                    .finally(() => mLoadingSpinner.hide('s4-user-delete'));
                            }
                        },
                        1
                    );
                });
        },

        requiredLinks() {
            return s4.ui.lists.users.findSelected()
                .then(() => {
                    return {
                        hide: [
                            'options',
                            'delete',
                        ],
                        show: [
                            's4-user-copy-arn',
                            's4-user-rename',
                            's4-user-delete'
                        ],
                    };
                })
                .catch(tell);
        },

        initStatusBarLinks(classList) {
            if (classList.contains('s4-user-copy-arn')) {
                this.copyArn();
            }
            else if (classList.contains('s4-user-rename')) {
                this.rename();
            }
            else if (classList.contains('s4-user-delete')) {
                this.remove();
            }
        }
    });

    class S4CreateDialog extends S4PagedDialog {
        constructor(name) {
            super(name, $('.s4-create-user-dialog', '.mega-dialog-container'), 5, [2, 3, 4]);

            this.handleOverlayClick = true;
            this.container = Object.create(null);
            this.user = Object.create(null);
            this.container.groupPolicies = Object.create(null);
            this.text.header = l.s4_user_create;

            this.$userInput = new mega.ui.MegaInputs($('input[name=user-name-input]', this.$steps[1]));
            this.$groupInput = new mega.ui.MegaInputs($('input[name=group-name-input]', this.$steps[2]));
            this.$saveGroupButton = $('.save-group', this.$steps[2]);
        }

        destroy() {
            super.destroy();

            $('.group-row:not(.group-template)', this.$steps[2]).remove();
            $('.policy-row:not(.policy-template)', this.$steps[3]).remove();
            $('.badge-container .badge:not(.badge-template)', this.$steps[4]).remove();
            this.$userInput.hideError();
        }

        hide() {
            super.hide();

            this.user = Object.create(null);

            $('input', this.$dialogContainer).val('');
            $('.create-group-container', this.$steps[2]).addClass('hidden');
            $('.checkboxOn', this.$dialogContainer).removeClass('checkboxOn').addClass('checkboxOff');
            $('.secret-key-value', this.$steps[4]).val('').attr('type', 'password');
            $('.icon-eye-hidden', this.$steps[4]).addClass('icon-eye-reveal').removeClass('icon-eye-hidden');
        }

        show() {
            super.show();

            $('.create-group-button', this.$steps[2]).removeClass('hidden');
        }

        unbindEvents() {
            super.unbindEvents();

            const {
                $steps,
                $userInput,
                $groupInput,
                $saveGroupButton,
            } = this;

            $userInput.$input.unbind('keydown.s4dlg');
            $userInput.$input.unbind('input.s4dlg');
            $groupInput.$input.unbind('keydown.s4dlg');
            $groupInput.$input.unbind('input.creategroup.s4dlg');
            $('.create-group', $steps[2]).unbind('click.s4dlg');
            $saveGroupButton.unbind('click.s4dlg');
            $('input.group-search', $steps[2]).unbind('input.s4dlg');
            $('input.policies-search', $steps[3]).unbind('input.s4dlg');
            $('button.copy', $steps[5]).unbind('click.s4dlg');
            $('button.toggle-vis', $steps[5]).unbind('click.s4dlg');
            $('.group-table tbody input', this.$steps[2]).unbind('click.s4dlg');
            $('.policy-table tbody input', this.$steps[3]).unbind('click.s4dlg');
        }

        bindEvents() {
            super.bindEvents();

            const {
                $steps,
                container,
                $userInput,
                $groupInput,
                $saveGroupButton,
                $dialogProgress,
            } = this;

            // Step 1 events
            $userInput.$input.rebind('keydown.s4dlg', (e) => {
                if (e.which === 13) {
                    $dialogProgress.trigger('click');
                }
            });
            $userInput.$input.rebind('input.s4dlg', e => {
                const name = $(e.currentTarget).val();
                if (this._validate(name, this.$userInput, 'users')) {
                    this._toggleProgress(name);
                }
                else {
                    this._toggleProgress(false);
                }
            });

            // Step 2 events
            $groupInput.$input.rebind('keydown.s4dlg', (e) => {
                if (e.which === 13) {
                    $saveGroupButton.trigger('click');
                }
            });
            $groupInput.$input.rebind('input.creategroup.s4dlg', e => {
                const $saveButton = $('.create-group-container .save-group', $steps[2]);
                const $input  = $(e.currentTarget);
                const isValid = this._validate($input.val(), this.$groupInput, 'groups');
                if (isValid) {
                    $saveButton.removeClass('disabled');
                }
                else {
                    $saveButton.addClass('disabled');
                }
            });
            $('.create-group', $steps[2]).rebind('click.s4dlg', () => {
                $('.create-group-container', $steps[2]).removeClass('hidden');
                $groupInput.$input.focus();
            });
            $saveGroupButton.rebind('click.s4dlg', e => {
                const $saveButton = $(e.currentTarget);
                if ($saveButton.hasClass('disabled')) {
                    return false;
                }
                const group = this.$groupInput.$input.val();
                if (group) {
                    this.$groupInput.$input.addClass('disabled');
                    const {containerID} = M.currentCustomView;
                    mLoadingSpinner.show('s4-group-create');

                    s4.groups.handlers.checkNameAvailable(group)
                        .then(() => s4.kernel.group.create(containerID, group, [])
                            .then((gid) => s4.kernel.group.info(containerID, gid)
                                .then((g) => {
                                    const newGroup = {...g, gid};
                                    container.groups.push(newGroup);
                                    $('.group-table tbody', $steps[2])
                                        .safeAppend(this._createGroupRow(newGroup));
                                    $(`.group-table tbody input[data-name="cg_${g.name}"]`, $steps[2])
                                        .rebind('click.s4dlg', e => {
                                            this.toggleRowCheckbox($(e.target).closest('.group-check'));
                                        });
                                    this.$groupInput.$input.val('');
                                    $saveButton.removeClass('disabled');
                                    this.$groupInput.$input.removeClass('disabled');
                                    $('.create-group-container', this.$steps[2]).addClass('hidden');
                                }))
                            .catch(tell)
                        )
                        .catch((ex) => {
                            this.$groupInput.showError(ex.message || ex);
                        })
                        .finally(() => mLoadingSpinner.hide('s4-group-create'));
                }
            });
            $('input.group-search', $steps[2]).rebind('input.s4dlg', e => {
                const val = $(e.currentTarget).val().toLowerCase();
                if (val && container.groups.length > 0) {
                    for (const groupRow of $('.group-table .group-row:not(.group-template)', this.$steps[2])) {
                        const $groupRow = $(groupRow);
                        if ($('span.group-name', $groupRow).text().toLowerCase().includes(val)) {
                            $groupRow.removeClass('hidden');
                        }
                        else {
                            $groupRow.addClass('hidden');
                        }
                    }
                }
                else {
                    $('.group-row.hidden:not(.group-template)', this.$steps[2]).removeClass('hidden');
                }
            });

            // Step 3 events
            $('input.policies-search', $steps[3]).rebind('input.s4dlg', e => {
                const val = $(e.currentTarget).val().toLowerCase();
                if (val && container.policies.length > 0) {
                    for (const policyRow of $('.policy-table .policy-row:not(.policy-template)', this.$steps[3])) {
                        const $policyRow = $(policyRow);
                        if ($('span.policy-name', $policyRow).text().toLowerCase().includes(val)) {
                            $policyRow.removeClass('hidden');
                        }
                        else {
                            $policyRow.addClass('hidden');
                        }
                    }
                }
                else {
                    $('.policy-row.hidden:not(.policy-template)', this.$steps[3]).removeClass('hidden');
                }
            });

            // Step 5 events
            $('button.copy', $steps[5]).rebind('click.s4dlg', e => {
                const dataKey = $(e.currentTarget).attr('data-key');
                const message = dataKey === 'ak' ? l.s4_access_key_copied_toast_txt : l.s4_secret_key_copied_toast_txt;
                copyToClipboard(this.user.keys[dataKey], message, 'recoveryKey');
            });
            $('button.toggle-vis', $steps[5]).rebind('click.s4dlg', e => {
                const $this = $('i', e.currentTarget);
                if ($this.hasClass('icon-eye-reveal')) {
                    $this.removeClass('icon-eye-reveal').addClass('icon-eye-hidden');
                    $('.secret-key-value', $steps[5]).attr('type', 'text');
                }
                else {
                    $this.removeClass('icon-eye-hidden').addClass('icon-eye-reveal');
                    $('.secret-key-value', $steps[5]).attr('type', 'password');
                }
            });
        }

        async step1(finalise) {
            if (finalise) {
                this.user.name = this.$userInput.$input.val();

                return handlers.checkNameAvailable(this.user.name)
                    .then(() => {
                        this.stepLocked = false;
                        this.tainted = true;
                        this.$steps[1].addClass('hidden');
                    })
                    .catch((ex) => {
                        this.$userInput.showError(ex.message || ex);
                    });
            }

            this.stepLocked = true;
            await this._initList();

            if (!this.user.name) {
                this.$dialogProgress.addClass('disabled');
            }

            this.$steps[1].removeClass('hidden');
            delay('s4.input.focus', () => {
                this.$userInput.$input.focus();
            }, 50);
        }

        async step2(finalise) {
            if (finalise) {
                this.$steps[2].addClass('hidden');
                // eslint-disable-next-line jquery/no-map
                this.user.groups = $('.checkboxOn input[data-name]', this.$steps[2])
                    .toArray()
                    .map(row => row.dataset.name.replace('cg_', ''));
                return;
            }

            this.$groupInput.hideError();
            this.$groupInput.setValue('');
            $('.create-group-container .save-group', this.$steps[2]).addClass('disabled');
            $('.create-group-container', this.$steps[2]).addClass('hidden');
            $('.search-bar input', this.$steps[2]).val('');
            $('.group-row:not(.group-template)', this.$steps[2]).removeClass('hidden');
            if (!this.user.groups) {
                let html = '';
                if (this.container.groups.length > 0) {
                    for (const group of this.container.groups) {
                        if (!$(`#cg_${group.gid}`, this.$steps[2]).length) {
                            html += this._createGroupRow(group);
                        }
                    }
                }
                if (html) {
                    $('.group-table tbody', this.$steps[2]).safeAppend(html);
                    $('.group-table tbody input', this.$steps[2]).rebind('click.s4dlg', e => {
                        this.toggleRowCheckbox($(e.target).closest('.group-check'));
                    });
                }
            }
            this.initScrollbar(this.$steps[2].get(0).querySelector('.s4-table-scroll'));
            this.$steps[2].removeClass('hidden');
        }

        async step3(finalise) {
            if (finalise) {
                this.$steps[3].addClass('hidden');
                // eslint-disable-next-line jquery/no-map
                this.user.policies = $('.checkboxOn input[data-name]', this.$steps[3])
                    .toArray().map(row => row.dataset.name.replace('cp_', ''));
                return;
            }
            $('.search-bar input', this.$steps[3]).val('');
            $('.policy-row:not(.policy-template)', this.$steps[3]).removeClass('hidden');
            if (!this.user.policies) {
                let html = '';
                if (this.container.policies.length > 0) {
                    for (const policy of this.container.policies) {
                        if (!$(`#cp_${policy.policyId}`, this.$steps[3]).length) {
                            html += this._createPolicyRow(policy);
                        }
                    }
                }
                if (html) {
                    $('.policy-table tbody', this.$steps[3]).safeAppend(html);
                    $('.policy-table tbody input', this.$steps[3]).rebind('click.s4dlg', e => {
                        this.toggleRowCheckbox($(e.target).closest('.policy-check'));
                    });
                }
            }
            this.initScrollbar(this.$steps[3].get(0).querySelector('.s4-table-scroll'));
            $(this.$dialogProgress).addClass('confirm');
            this.$steps[3].removeClass('hidden');
        }

        async step4(finalise) {
            if (finalise) {
                await this._createUser();
                this.stepLocked = false;
                this.$steps[4].addClass('hidden');
                return;
            }

            this.stepLocked = true;
            if (!this.user.arn) {
                const {containerID} = M.currentCustomView;
                this.user.arn = await s4.kernel.user.arn(containerID, this.user.name);
            }
            $('.container-user-name', this.$steps[4]).text(this.user.name);
            $('.container-user-arn', this.$steps[4]).text(this.user.arn);
            let html = '';
            for (const group of this.user.groups) {
                if (!$(`[data-name="ug_${group}"]`, this.$steps[4]).length) {
                    html += this._createBadge(group, 'ug_', this.$steps[4]);
                }
            }
            if (html) {
                const $container = $('.group-info .badge-container', this.$steps[4]);
                $container.safeAppend(html);
                $('i.icon-dialog-close', $container).rebind('click.s4dlg', e => {
                    const $badge = $(e.currentTarget).closest('.badge');
                    const label = $('.badge-name', $badge).text();
                    const index = this.user.groups.indexOf(label);
                    if (index !== -1) {
                        this.user.groups.splice(index, 1);
                    }
                    $badge.remove();
                    $(`input[data-name="cg_${label}"]`, this.$dialogContainer).trigger('click');
                });
            }
            html = '';
            for (const policy of this.user.policies) {
                if (!$(`[data-name="up_${policy}"]`, this.$steps[4]).length) {
                    html += this._createBadge(policy, 'up_', this.$steps[4]);
                }
            }
            if (html) {
                const $container = $('.policy-info .badge-container', this.$steps[4]);
                $container.safeAppend(html);
                $('button.remove', $container).rebind('click.s4dlg', (e) => {
                    const $badge = $(e.currentTarget).closest('.badge');
                    const label = $('.badge-name', $badge).text();
                    const index = this.user.policies.indexOf(label);
                    if (index !== -1) {
                        this.user.policies.splice(index, 1);
                    }
                    $badge.remove();
                    $(`input[data-name="cp_${label}"]`, this.$dialogContainer).trigger('click');
                });
            }
            $('span', this.$dialogProgress.removeClass('disabled')).text(l[870] /* Confirm */);
            $(this.$dialogProgress).addClass('confirm');
            // Add binding
            this.$steps[4].removeClass('hidden');
        }

        async step5(finalise) {
            this.tainted = false;
            if (finalise) {
                this.$steps[5].addClass('hidden');
                return this._download();
            }
            $('header h2', this.$dialogContainer).text(l.s4_user_create_success_title.replace('%s', this.user.name));
            $('.user-success-text', this.$steps[5]).text(l.s4_user_create_success_msg);
            $('.access-key-value', this.$steps[5]).text(this.user.keys.ak);
            $('.secret-key-value', this.$steps[5]).val(this.user.keys.sk).attr('type', 'password');
            this.$dialogCancel.addClass('hidden');
            $('span', this.$dialogProgress).text(l[58] /* Download */);
            this.$steps[5].removeClass('hidden');
        }

        async _initList() {
            const {containerID} = M.currentCustomView;

            const [groups = [], policies = []] = await Promise.all([
                s4.kernel.group.list(containerID),
                s4.kernel.policies.list(containerID)
            ]);

            Object.assign(this.container, {groups, policies});

            if (this.container.groups && this.container.groups.length > 0) {
                await Promise.all(this.container.groups.map(async(g) => {
                    const p = await s4.kernel.policies.listGroupPolicies(containerID, g.gid);
                    this.container.groupPolicies[g.gid] = p;
                }));
            }
        }

        _validate(name, input, type) {
            const err = s4[type].handlers.validateName(name);
            if (err) {
                if (![l.s4_user_empty_error, l.s4_group_empty_error].includes(err)) {
                    input.showError(err);
                }
                return false;
            }
            return true;
        }

        async _download() {
            const {n, ak, sk} = this.user.keys;
            await M.saveAs(exportKey(ak, sk), M.getSafeName(`credentials-${n}`));
            showToast('s4AccessKey', l.s4_key_downloaded_toast_txt);
        }

        async _createUser() {
            mLoadingSpinner.show('s4-user-create');
            const {containerID} = M.currentCustomView;

            this.user.groups = this.container.groups
                .filter(g => this.user.groups.includes(g.name))
                .map(g => g.gid);

            this.user.policies = this.container.policies
                .filter(p => this.user.policies.includes(p.policyName))
                .map(p => p.arn);

            return s4.kernel.user
                .create(containerID, this.user.name, true, this.user.groups, this.user.policies)
                .then((uid) => s4.kernel.user.info(containerID, uid))
                .then((ui) => {
                    this.user.keys = ui.keys[0];
                })
                .finally(() => {
                    mLoadingSpinner.hide('s4-user-create');
                });
        }

        _createGroupRow(group) {
            const { name, gid } = group;
            const $template = $('.group-table .group-template', this.$steps[2]).clone();
            $template.removeClass('group-template hidden').attr('id', `cg_${gid}`);
            $('span.group-name', $template).text(name);
            let policyString = 'None';
            if (this.container.groupPolicies[gid]) {
                policyString = this.container.groupPolicies[gid].length > 1
                    ? policyString = '%s1 and %s2 more'
                        .replace('%s1', this.container.groupPolicies[gid][0].name)
                        .replace('%s2', this.container.groupPolicies[gid].length - 1)
                    : this.container.groupPolicies[gid][0].name;
            }
            $('span.group-policies', $template).text(policyString);
            $('input', $template).attr('data-name', `cg_${name}`);
            return $template.prop('outerHTML');
        }

        _createPolicyRow(policy) {
            const $template = $('.policy-template', this.$steps[3]).clone();
            $template.removeClass('policy-template hidden').attr('id', `cp_${policy.policyId}`);
            $('span.policy-name', $template).text(policy.policyName);
            $('input', $template).attr('data-name', `cp_${policy.policyName}`);
            return $template.prop('outerHTML');
        }
    }

    const dialogs = Object.create(null);
    lazy(dialogs, 'create', () => new S4CreateDialog('create-user'));

    class S4List extends UIS4List {
        constructor(domNode, handle, onItems, onEmptyItems) {
            super(domNode, handle, onItems, onEmptyItems, S4List.getColsWidth(), 'name');

            /** @property S4List.template */
            lazy(this, 'template', () => {
                return parseHTML(S4List.template()).querySelector('tr');
            });
            Object.defineProperty(this, 'type', {value: 'users'});
            Object.defineProperty(this, 'colsWidth', { value: S4List.getColsWidth()});
        }

        static getColsWidth() {
            return {
                's4-user-name': { min: 200, max: 5000 },
                's4-groups': { min: 200, max: 500, init: 250 },
                's4-user-arn': { min: 400, max: 500, init: 400 },
            };
        }

        static supports(type) {
            return type === 'users';
        }

        static template() {
            return '<tr>' +
                '<td class="s4-user-name">' +
                    '<div class="color1 avatar-wrapper small-rounded-avatar"></div>' +
                    '<span></span>' +
                '</td>' +
                '<td class="s4-groups">' +
                    '<span class="simpletip"></span>' +
                '</td>' +
                '<td class="s4-user-arn with-icons">' +
                    '<span class="space-for-icon-right"></span>' +
                    '<button class="mega-button small action copy" data-key="arn">' +
                        '<i class="sprite-fm-mono icon-copy icon24"></i>' +
                    '</button>' +
                '</td>' +
            '</tr>';
        }

        get [Symbol.toStringTag]() {
            return 'S4UsersList';
        }

        setRow(row, {uid, name, groups, arn}) {
            super.setRow(row, uid.toString());

            const aNode = row.querySelector('td.s4-user-name div');
            if (name && aNode.textContent !== name.charAt(0).toUpperCase()) {
                aNode.textContent = name.charAt(0).toUpperCase();
            }
            const nNode = row.querySelector('td.s4-user-name span');
            if (nNode.textContent !== name) {
                nNode.textContent = name;
            }
            const arnNode = row.querySelector('td.s4-user-arn span');
            if (arnNode.textContent !== arn) {
                arnNode.textContent = arn;
            }
            const gNode = row.querySelector('td.s4-groups span');
            s4.utils.setNodeMultipleText(gNode, groups, 'n', l.s4_policies_attached_overview);

            const grouptt = (Object.values(groups) || []).map(g => g.n).join('[BR]');
            if (gNode.dataset.simpletip !== grouptt) {
                gNode.dataset.simpletip = grouptt;
            }
        }

        async getItems(n) {
            if ((n = super.getItems(n))) {
                return ['uid', await s4.kernel.user.list(n.h)];
            }
        }

        handleSelection(event, onSelection) {
            const $row = $(event.target).closest('tr');
            const uid = $row.attr('id');
            const name = $('.s4-user-name', $row).text();
            const arn = $('.s4-user-arn', $row).text();

            const selected = {uid, name, arn};
            super.handleSelection(event, onSelection, selected, 'uid');
        }

        unbindEvents() {
            super.unbindEvents();

            const dd = '.dropdown.body.context .dropdown-item';
            this.$tableData.unbind('click.s4klst');
            this.$tableData.unbind('contextmenu.s4klst');
            $(`${dd}.s4-copy-arn`, '.fmholder').unbind('click.s4klst.ctxm.copyarn');
            $(`${dd}.s4-user-rename`, '.fmholder').unbind('click.s4klst.ctxm.rename');
            $(`${dd}.s4-user-delete`, '.fmholder').unbind('click.s4klst.ctxm.delete');
            $('.s4-grid-table tbody tr', '.s4-users-management-scroll').unbind('dblclick.openInfoPage');
            $('button.copy', this.$tableData).unbind('click.s4klst.copykey');
        }

        bindEvents() {
            super.bindEvents();

            const dd = '.dropdown.body.context .dropdown-item';
            this.$tableData.rebind('click.s4klst', (e) => {
                this.handleSelection(e);
            });

            this.$tableData.rebind('contextmenu.s4klst', (e) => {
                this.handleSelection(e, () => {

                    // @todo contextMenuUI() is triggering a wrong FMDB fetch from this.

                    M.contextMenuUI(e, 8, [
                        '.s4-copy-arn',
                        '.s4-user-rename',
                        '.s4-user-delete',
                    ].join(','));
                });
            });

            $(`${dd}.s4-copy-arn`, '.fmholder').rebind('click.s4klst.ctxm.copyarn', () => {
                handlers.copyArn();
            });

            $(`${dd}.s4-user-rename`, '.fmholder').rebind('click.s4klst.ctxm.rename', () => {
                handlers.rename();
            });

            $(`${dd}.s4-user-delete`, '.fmholder').rebind('click.s4klst.ctxm.delete', () => {
                handlers.remove();
            });

            $('.s4-grid-table tbody tr', '.s4-users-management-scroll').rebind('dblclick.openInfoPage', (e) => {
                s4.ui.selectedTab = null;
                const s4ItemNodeID = $(e.currentTarget).attr('id');
                this.selection.clear();
                M.openFolder(`${this.handle}/${M.currentCustomView.subType}/${s4ItemNodeID}`);
                return false;
            });

            $('button.copy', this.$tableData).rebind('click.s4klst.copykey', e => {
                handlers.copyArn(e);
            });
        }
    }

    return freeze({handlers, dialogs, S4CreateDialog, S4List});
});
