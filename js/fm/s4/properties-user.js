lazy(s4, 'userProperties', () => {
    'use strict';

    const {S4List} = s4.ui.classes;
    const {S4CreateDialog: S4UsersCreateDialog} = s4.users;
    const {S4CreateDialog: S4KeysCreateDialog} = s4.keys;

    class S4AddKeyDialog extends S4KeysCreateDialog {
        hide() {
            super.hide();

            $('.head-title', this.$steps[1]).text(l.s4_user_assign_title);
            $('.radio-buttons', this.$steps[1]).removeClass('hidden');
            $('.search-bar', this.$steps[1]).removeClass('hidden');
            $('.user-select-wrap', this.$steps[1]).addClass('hidden');
            $('.user-radio.radioOn', this.$steps[1]).addClass('radioOn');
            $('.radioOn input[value=rootuser]', this.$steps[1]).prop('checked', false);
            $('.s4-table-scroll', this.$steps[1]).removeAttr('style');
        }

        async step1(finalise) {
            if (finalise) {
                return super.step1(true);
            }
            if ($('li', this.$steps[1]).length === 1) {
                const html = this._createListRow(this.user);
                if (html) {
                    $('.container-user-list', this.$steps[1]).safeAppend(html);
                }
            }

            this.key.name = true;
            await super.step1(finalise);

            $('.head-title', this.$steps[1]).text(l.s4_user_attached_key_title);
            $('.s4-table-scroll', this.$steps[1]).css('height', '68px');
            $('.radio-buttons', this.$steps[1]).addClass('hidden');
            $('.search-bar', this.$steps[1]).addClass('hidden');
            $('.user-select-wrap', this.$steps[1]).removeClass('hidden');
            $('.user-radio.radioOn', this.$steps[1]).removeClass('radioOn');
            $('.radioOn input[value=rootuser]', this.$steps[1]).prop('checked', false);
        }
    }

    class S4AddGroupDialog extends S4UsersCreateDialog {
        constructor(name) {
            super(name);

            this.handleOverlayClick = true;
            this.maxStep = 2;
            this.isCustomFlow = true;
            this.regressSteps = false;
            this.changes = Object.create(null);
            this.origSelected = Object.create(null);
            this.text = {
                header: l.s4_add_groups,
                progress: l.add,
            };
        }

        show() {
            super.show();

            $('.create-group-button', this.$steps[2]).addClass('hidden');
            this.steps(2, true);
        }

        unbindEvents() {
            super.unbindEvents();

            this.$dialogContainer.unbind('dialog-closed.s4dlg');
            $('button.js-close', this.$dialogContainer).unbind('click.s4dlg');
            $('.group-table tbody input', this.$steps[2]).unbind('click.s4dlg');
        }

        async step2(finalise) {
            if (finalise) {
                super.step2(true);

                if (this.tainted) {
                    const newGroups = [];
                    for (const key of Object.keys(this.changes)) {
                        if (this.changes[key]) {
                            newGroups.push(key);
                        }
                    }
                    await this._updateUserGroup(newGroups);
                }
                return;
            }

            await this._init();

            $('.group-row:not(.group-template)', this.$steps[2]).remove();
            if ($('tbody tr', this.$steps[2]).length === 1) {
                let html = '';
                for (const group of this.container.groups) {
                    if (!$(`#cg_${group.gid}`, this.$steps[2]).length) {
                        html += this._createGroupRow(group);
                    }
                }
                if (html) {
                    $('.group-table tbody', this.$steps[2]).safeAppend(html);
                    $('.group-table tbody input', this.$steps[2]).rebind('click.s4dlg', e => {
                        const $this = $(e.target);
                        this.toggleRowCheckbox($this.closest('.group-check'), true);
                        this.changes[$this.attr('data-name').replace('cg_', '')] =
                            $this.closest('.group-check').hasClass('checkboxOn');
                        this.checkTaint(this.origSelected, this.changes);
                    });
                }
            }

            for (const group of this.user.groups) {
                const $input = $(`input[data-name="cg_${group.n}"]`, this.$steps[2]);
                if ($input.length) {
                    $input.closest('.group-check').addClass('checkboxOn').removeClass('checkboxOff');
                }
            }
            return super.step2(finalise);
        }

        async _init() {
            const {containerID} = M.currentCustomView;

            const userInfo = await s4.kernel.user.info(containerID, s4.ui.lastPathPart);
            this.user.groups = Object.values(userInfo.groups) || [];

            await this._initList();

            this.container.groups = this.container.groups.filter(
                u => !this.user.groups.some(ug => u.gid === ug.gid));

            for (const group of this.container.groups) {
                this.changes[group.name] = this.user.groups.includes(group.name);
            }
            this.origSelected = {...this.changes};
        }

        async _updateUserGroup(group) {
            const {containerID} = M.currentCustomView;

            mLoadingSpinner.show('s4-user-update-group');
            this.user.groups = this.container.groups
                .filter(g => group.includes(g.name))
                .map(g => parseInt(g.gid));
            const promises = this.user.groups.map(g =>
                s4.kernel.group.addUsers(
                    containerID,
                    g,
                    [s4.ui.lastPathPart]
                )
            );
            await Promise.all(promises)
                .catch(tell)
                .finally(() => mLoadingSpinner.hide('s4-user-update-group'));
        }
    }

    class S4AddPolicyDialog extends S4UsersCreateDialog {
        constructor(name) {
            super(name);

            this.handleOverlayClick = true;
            this.maxStep = 3;
            this.isCustomFlow = true;
            this.regressSteps = false;
            this.changes = Object.create(null);
            this.origSelected = Object.create(null);
            this.text = {
                header: l.s4_add_policies,
                progress: l[8023],
            };
        }

        show(isGroup) {
            super.show();

            this.isGroup = isGroup;
            this.steps(3, true);
        }

        unbindEvents() {
            super.unbindEvents();

            this.$dialogContainer.unbind('dialog-closed.s4dlg');
            $('button.js-close', this.$dialogContainer).unbind('click.s4dlg');
            $('.policy-table tbody input', this.$steps[3]).unbind('click.s4dlg');
        }

        async step3(finalise) {
            if (finalise) {
                super.step3(true);

                if (this.tainted) {
                    const policies = [];
                    for (const key of Object.keys(this.changes)) {
                        if (this.changes[key]) {
                            policies.push(key);
                        }
                    }
                    await this._attachPolicies(policies);
                }
                return;
            }

            await this._init();

            $('.head-title', this.$steps[3]).text(
                this.isGroup ? l.s4_group_attach_policy : l.s4_user_attach_policy);

            $('.policy-row:not(.policy-template)', this.$steps[3]).remove();
            if ($('tbody tr', this.$steps[3]).length === 1) {
                let html = '';
                for (const policy of this.container.policies) {
                    if (!$(`#cp_${policy.policyId}`, this.$steps[3]).length) {
                        html += this._createPolicyRow(policy);
                    }
                }
                if (html) {
                    $('.policy-table tbody', this.$steps[3]).safeAppend(html);
                    $('.policy-table tbody input', this.$steps[3]).rebind('click.s4dlg', e => {
                        const $this = $(e.target);
                        this.toggleRowCheckbox($this.closest('.policy-check'), true);
                        this.changes[$this.attr('data-name').replace('cp_', '')] =
                            $this.closest('.policy-check').hasClass('checkboxOn');
                        this.checkTaint(this.origSelected, this.changes);
                    });
                }
            }
            for (const policy of this.user.policies) {
                const $input = $(`input[data-name="cp_${policy.name}"]`, this.$steps[3]);
                if ($input.length) {
                    $input.closest('.policy-check').addClass('checkboxOn').removeClass('checkboxOff');
                }
            }
            return super.step3(finalise);
        }

        async _init() {
            const fnName = `list${this.isGroup ? 'Group' : 'User'}Policies`;
            const {containerID} = M.currentCustomView;

            this.user.policies = (await s4.kernel.policies[fnName](containerID, s4.ui.lastPathPart)) || [];
            await this._initList();

            const policies = await s4.kernel.policies.list(containerID);

            for (const policy of this.container.policies) {
                this.changes[policy.policyName] = (policies || []).includes(policy.policyName);
            }

            this.container.policies = this.container.policies
                .filter(p => !this.user.policies.some(up => p.policyName === up.name));

            this.origSelected = {...this.changes};
        }

        async _attachPolicies(policies) {
            const {containerID} = M.currentCustomView;
            const type = this.isGroup ? 'group' : 'user';
            const attachFnName = this.isGroup ? 'attachGroupPolicy' : 'attachUserPolicy';

            mLoadingSpinner.show(`s4-${type}-attach-policies`);
            this.user.policies = this.container.policies
                .filter(p => policies.includes(p.policyName))
                .map(p => p.arn);

            const update = await s4.kernel[type].info(containerID, s4.ui.lastPathPart);
            await s4.kernel.policies[attachFnName](containerID, update.name, this.user.policies)
                .catch(tell)
                .finally(() => mLoadingSpinner.hide(`s4-${type}-attach-policies`));
        }
    }

    const dialogs = Object.create(null);
    lazy(dialogs, 'addKey', () => new S4AddKeyDialog('user-add-key'));
    lazy(dialogs, 'addGroup', () => new S4AddGroupDialog('user-add-group'));
    lazy(dialogs, 'addPolicy', () => new S4AddPolicyDialog('user-add-policy'));

    class S4KeyList extends S4List {
        constructor(domNode, handle, onItems, onEmptyItems) {
            super(domNode, handle, onItems, onEmptyItems, S4KeyList.getColsWidth(), 'n');

            /** @property S4List.template */
            lazy(this, 'template', () => {
                return parseHTML(S4KeyList.template()).querySelector('tr');
            });
            Object.defineProperty(this, 'type', {value: 'user-keys'});
            Object.defineProperty(this, 'colsWidth', { value: S4KeyList.getColsWidth()});
        }

        static getColsWidth() {
            return {
                'key-name': { min: 180, max: 5000 },
                'access-key': { min: 200, max: 300, init: 220 },
                'secret-key': { min: 220, max: 420, init: 220 },
                'status': { min: 120, max: 150, init: 120 },
                'actions-btn': { min: 100, max: 200, init: 100 },
            };
        }

        static supports(type) {
            return type === 'user-keys';
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
                '<td class="actions-btn">' +
                    `<a class="delete-btn delete-key" data-ak="">${l[1730]}</a>` +
                '</td>' +
            '</tr>';
        }

        get [Symbol.toStringTag]() {
            return 'S4UserPropertiesKeyList';
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
            row.querySelector('td.status span').textContent = enText;
        }

        async getItems(n) {
            if ((n = super.getItems(n))) {
                return ['ak', (await s4.kernel.user.info(n.h, s4.ui.lastPathPart)).keys];
            }
        }

        unbindEvents() {
            super.unbindEvents();

            $('.s4-grid-table tr .delete-key', this.$fmBlock).unbind('click.delete-keys');
            $('button.copy', this.$tableData).unbind('click.s4klst.copykey');
            $('button.toggle-vis', this.$tableData).unbind('click.s4klst.reveal');
            $('.action.add-s4-new-keys', this.$fmBlock).unbind('click.add-key');
        }

        bindEvents() {
            super.bindEvents();

            const {containerID} = M.currentCustomView;
            $('.s4-grid-table tr .delete-key', this.$fmBlock).rebind('click.delete-keys', (e) => {
                const tr = e.target.closest('tr');
                const keyId = tr.id;
                const name = tr.querySelector('td.key-name span').textContent;
                asyncMsgDialog(
                    `-remove:!^${l[1730]}!${l.s4_key_confirm_delete_cancel}`,
                    l[1003],
                    l.s4_key_confirm_delete_title.replace('%s', name),
                    l.s4_key_confirm_delete_message,
                    async(yes) => {
                        if (yes) {
                            mLoadingSpinner.show('s4-user-delete-key');
                            s4.kernel.keys.remove(containerID, keyId)
                                .catch(tell)
                                .finally(() => mLoadingSpinner.hide('s4-user-delete-key'));
                        }
                    },
                    1
                );

            });

            $('button.copy', this.$tableData).rebind('click.s4klst.copykey', e => {
                s4.keys.handlers.copyKey(e);
            });

            $('button.toggle-vis', this.$tableData).rebind('click.s4klst.reveal', e => {
                s4.keys.handlers.toggleVis(e);
            });

            $('.action.add-s4-new-keys', this.$fmBlock).rebind('click.add-key', () => {
                const uid = s4.ui.lastPathPart;
                const {containerID} = M.currentCustomView;

                s4.kernel.user.info(containerID, uid)
                    .then(u => s4.ui.showDialog(dialogs.addKey, {...u, uid}))
                    .catch(tell);
            });

        }
    }

    class S4GroupList extends S4List {
        constructor(domNode, handle, onItems, onEmptyItems) {
            super(domNode, handle, onItems, onEmptyItems, S4GroupList.getColsWidth(), 'n');

            /** @property S4List.template */
            lazy(this, 'template', () => {
                return parseHTML(S4GroupList.template()).querySelector('tr');
            });
            Object.defineProperty(this, 'type', {value: 'user-groups'});
            Object.defineProperty(this, 'colsWidth', { value: S4GroupList.getColsWidth()});
        }

        static getColsWidth() {
            return {
                'group-name': { min: 200, max: 5000 },
                'att-policies': { min: 200, max: 500, init: 200 },
                'actions-btn': { min: 100, max: 200, init: 120 },
            };
        }

        static supports(type) {
            return type === 'user-groups';
        }

        static template() {
            return '<tr>' +
                        '<td class="s4-user-name"><span></span></td>' +
                        '<td class="att-policies"><span class="simpletip"></span></td>' +
                        '<td class="actions-btn">' +
                            `<a class="view-btn view-user">${l[16797]}</a>` +
                            `<a class="delete-btn delete-user">${l[83]}</a>` +
                        '</td>' +
                    '</tr>';
        }

        get [Symbol.toStringTag]() {
            return 'S4UserPropertiesGroupList';
        }

        async setRow(row, {gid, n}) {
            super.setRow(row, gid.toString());

            const nNode = row.querySelector('td.s4-user-name span');
            if (nNode.textContent !== n) {
                nNode.textContent = n;
            }

            const policies = await s4.kernel.policies.listGroupPolicies(M.currentCustomView.containerID, gid);

            const pNode = row.querySelector('td.att-policies span');
            s4.utils.setNodeMultipleText(pNode, policies, 'name', l.s4_policies_attached_overview);

            const policiestt = (policies || []).map(p => p.name).join('[BR]');
            if (pNode.dataset.simpletip !== policiestt) {
                pNode.dataset.simpletip = policiestt;
            }
        }

        async getItems(n) {
            if ((n = super.getItems(n))) {
                return ['gid', Object.values((await s4.kernel.user.info(n.h, s4.ui.lastPathPart)).groups)];
            }
        }

        unbindEvents() {
            super.unbindEvents();

            $('.s4-grid-table tbody tr .delete-user', this.$fmBlock).unbind('click.delete-user');
            $('.s4-grid-table tbody tr .view-user', this.$fmBlock).unbind('click.view-user');
            $('.action.add-s4-new-groups', this.$fmBlock).unbind('click.add-group');
        }

        bindEvents() {
            super.bindEvents();

            const {containerID} = M.currentCustomView;
            $('.s4-grid-table tbody tr .delete-user', this.$fmBlock).rebind('click.delete-user', (e) => {
                const tr = e.target.closest('tr');
                const groupId = parseInt(tr.id);
                asyncMsgDialog(
                    `-remove:!^${l[83]}!${l.s4_confirm_remove_cancel}`,
                    l[1003],
                    l.s4_confirm_remove_group_from_user_title,
                    false,
                    async(yes) => {
                        if (yes) {
                            mLoadingSpinner.show('s4-user-delete-group');
                            s4.kernel.group.removeUsers(containerID, groupId, [parseInt(s4.ui.lastPathPart)])
                                .catch(tell)
                                .finally(() => mLoadingSpinner.hide('s4-user-delete-group'));
                        }
                    },
                    1
                );
            });
            $('.s4-grid-table tbody tr .view-user', this.$fmBlock).rebind('click.view-user', event => {
                const groupId = parseInt(event.target.closest('tr').id);
                M.openFolder(`${this.handle}/groups/${groupId}`, true);
            });

            $('.action.add-s4-new-groups', this.$fmBlock).rebind('click.add-group', () => {
                s4.ui.showDialog(dialogs.addGroup);
            });
        }
    }

    class S4PolicyList extends S4List {
        constructor(domNode, handle, onItems, onEmptyItems) {
            super(domNode, handle, onItems, onEmptyItems, S4PolicyList.getColsWidth(), 'name');

            /** @property S4List.template */
            lazy(this, 'template', () => {
                return parseHTML(S4PolicyList.template()).querySelector('tr');
            });
            Object.defineProperty(this, 'type', {value: 'user-policies'});
            Object.defineProperty(this, 'colsWidth', { value: S4PolicyList.getColsWidth()});
        }

        static getColsWidth() {
            return {
                'policy-name': { min: 200, max: 5000 },
                'actions-btn': { min: 100, max: 200, init: 120 },
            };
        }

        static supports(type) {
            return type === 'user-policies';
        }

        static template() {
            return '<tr class="">' +
                        '<td class="policy-name"><span></span></td>' +
                        '<td class="actions-btn">' +
                            `<a class="view-btn view-policy">${l[16797]}</a>` +
                            `<a class="delete-btn delete-policy">${l.s4_detach}</a>` +
                        '</td>' +
                    '</tr>';
        }

        get [Symbol.toStringTag]() {
            return 'S4UserPropertiesPolicyList';
        }

        setRow(row, {policyId, name, arn}) {
            super.setRow(row, policyId);

            row.arn = arn;
            const nNode = row.querySelector('td.policy-name span');
            if (nNode.textContent !== name) {
                nNode.textContent = name;
            }
        }

        async getElements(n) {
            if ((n = super.getElements(n))) {
                return ['name', await s4.kernel.policies.listUserPolicies(n.h, s4.ui.lastPathPart) || []];
            }
        }

        async getItems(n) {
            if ((n = super.getItems(n))) {
                return ['name', await s4.kernel.policies.listUserPolicies(n.h, s4.ui.lastPathPart) || []];
            }
        }

        unbindEvents() {
            super.unbindEvents();

            $('.s4-grid-table tbody tr .delete-policy', this.$fmBlock).unbind('click.delete-policy');
            $('.s4-grid-table tbody tr .view-policy', this.$fmBlock).unbind('click.view-policy');
            $('.action.add-policies', this.$fmBlock).unbind('click.add-policies');
        }
        bindEvents() {
            super.bindEvents();

            $('.s4-grid-table tbody tr .delete-policy', this.$fmBlock)
                .rebind('click.delete-policy', e => {
                    const {containerID} = M.currentCustomView;
                    const tr = e.target.closest('tr');
                    const policyArn = tr.arn;
                    msgDialog(
                        `-remove:!^${l.s4_detach}!${l.s4_confirm_detach_cancel}`,
                        l[1003],
                        l.s4_confirm_detach_policy_title,
                        false,
                        (yes) => {
                            if (yes) {
                                mLoadingSpinner.show('s4-user-delete-policy');
                                s4.kernel.user.info(containerID, s4.ui.lastPathPart)
                                    .then(user => s4.kernel.policies.detachUserPolicy(
                                        containerID, user.name, policyArn))
                                    .catch(tell)
                                    .finally(() => mLoadingSpinner.hide('s4-user-delete-policy'));
                            }
                        },
                        1
                    );
                });
            $('.s4-grid-table tbody tr .view-policy', this.$fmBlock).rebind('click.view-policy', event => {
                const id = event.target.closest('tr').id;
                M.openFolder(`${this.handle}/policies/${id}`, true);
            });

            $('.action.add-policies', this.$fmBlock).rebind('click.add-policies', () => {
                s4.ui.showDialog(dialogs.addPolicy, false);
            });
        }
    }

    return freeze({dialogs, S4AddKeyDialog, S4AddGroupDialog, S4AddPolicyDialog, S4KeyList, S4GroupList, S4PolicyList});
});
