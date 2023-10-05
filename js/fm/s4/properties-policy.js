lazy(s4, 'policyProperties', () => {
    'use strict';

    const {S4List} = s4.ui.classes;
    const {S4CreateDialog: S4GroupsCreateDialog} = s4.groups;
    const {S4CreateDialog: S4UsersCreateDialog} = s4.users;

    class S4AddUserDialog extends S4GroupsCreateDialog {
        constructor(name) {
            super(name);

            this.handleOverlayClick = true;
            this.maxStep = 3;
            this.isCustomFlow = true;
            this.regressSteps = false;
            this.changes = Object.create(null);
            this.origSelected = Object.create(null);
            this.text = {
                header: l.s4_add_users,
                progress: l.add,
            };
        }

        show() {
            super.show();

            this.steps(3, true);
        }

        unbindEvents() {
            super.unbindEvents();

            this.$dialogContainer.unbind('dialog-closed.s4dlg');
            $('button.js-close', this.$dialogContainer).unbind('click.s4dlg');
            $('.group-users-table tbody input', this.$steps[3]).unbind('click.s4dlg');
        }

        async step3(finalise) {
            if (finalise) {
                super.step3(true);

                if (this.tainted) {
                    const newUsers = [];
                    for (const key of Object.keys(this.changes)) {
                        if (this.changes[key]) {
                            newUsers.push(key);
                        }
                    }
                    await this._updatePolicyUsers(newUsers);
                }
                return;
            }

            await this._init();

            $('.group-user-row:not(.group-user-template)', this.$steps[3]).remove();
            if ($('tbody tr', this.$steps[3]).length === 1) {
                let html = '';
                for (const user of this.container.users) {
                    if (!$(`#cu_${user.uid}`, this.$steps[3]).length) {
                        html += this._createTableRow(user, 'group-user', 'cu_', 3);
                    }
                }
                if (html) {
                    $('.group-users-table tbody', this.$steps[3]).safeAppend(html);
                    $('.group-users-table tbody input', this.$steps[3]).rebind('click.s4dlg', e => {
                        const $this = $(e.target);
                        this.toggleRowCheckbox($this.closest('.group-user-check'), true);
                        this.changes[$this.attr('data-name').replace('cu_', '')] =
                            $this.closest('.group-user-check').hasClass('checkboxOn');
                        this.checkTaint(this.origSelected, this.changes);
                    });
                }
            }
            return super.step3(finalise);
        }

        async _init() {
            const {containerID} = M.currentCustomView;

            this.policy = await s4.policyProperties.handlers.info(containerID, s4.ui.lastPathPart);
            this.group = {users: []};

            await this._initList();

            await Promise.all(this.container.users.map(async(user) => {
                const policies = await s4.kernel.policies.listUserPolicies(containerID, user.uid);
                if (!policies || !policies.some((p) => p.arn === this.policy.arn)) {
                    this.group.users.push(user);
                }
            }));

            this.container.users = this.group.users;
            for (const user of this.container.users) {
                this.changes[user.name] = this.group.users.includes(user.name);
            }
            this.origSelected = {...this.changes};
        }

        async _updatePolicyUsers(users) {
            if (users.length === 0) {
                return false;
            }

            const promises = [];
            mLoadingSpinner.show('s4-policy-update-user');

            for (let i = 0; i < users.length; ++i) {
                promises.push(s4.kernel.policies
                    .attachUserPolicy(M.currentCustomView.containerID, users[i], this.policy.arn));
            }
            await Promise.all(promises)
                .catch(tell)
                .finally(() => mLoadingSpinner.hide('s4-policy-update-user'));
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
                    await this._updatePolicyGroup(newGroups);
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
            return super.step2(finalise);
        }

        async _init() {
            const {containerID} = M.currentCustomView;

            this.policy = await s4.policyProperties.handlers.info(containerID, s4.ui.lastPathPart);
            this.user = {groups: []};

            await this._initList();

            await Promise.all(this.container.groups.map(async(group) => {
                const policies = await s4.kernel.policies.listGroupPolicies(containerID,  group.gid);
                if (!policies || !policies.some((p) => p.arn === this.policy.arn)) {
                    this.user.groups.push(group);
                }
            }));

            this.container.groups = this.user.groups;
            for (const group of this.container.groups) {
                this.changes[group.name] = this.user.groups.includes(group.name);
            }
            this.origSelected = {...this.changes};
        }

        async _updatePolicyGroup(groups) {
            if (groups.length === 0) {
                return false;
            }

            const promises = [];
            mLoadingSpinner.show('s4-policy-update-group');

            for (let i = 0; i < groups.length; ++i) {
                promises.push(s4.kernel.policies
                    .attachGroupPolicy(M.currentCustomView.containerID, groups[i], this.policy.arn));
            }
            await Promise.all(promises)
                .catch(tell)
                .finally(() => mLoadingSpinner.hide('s4-policy-update-group'));
        }
    }

    const dialogs = Object.create(null);
    lazy(dialogs, 'addUser', () => new S4AddUserDialog('policy-add-user'));
    lazy(dialogs, 'addGroup', () => new S4AddGroupDialog('policy-add-group'));

    const handlers = freeze({

        // Policies list caching
        // @todo remove when s4.p/info is implemented
        async list(handle, force) {
            s4.ui.policies = !force && s4.ui.policies || await s4.kernel.policies.list(handle).catch(tell);

            return s4.ui.policies;
        },

        // Policy info: Name ARN, Attatched, Version
        // @todo fix when s4.p/info is implemented
        async info(handle, id) {
            const list = await this.list(handle);
            const p = list && list.find(o => o.policyId === id);
            return p ? {name: p.policyName, arn: p.arn, cnt: p.attachmentCount, v: p.defaultVersionId} : false;
        },

        // Temp Policy Attachment value update
        // @todo remove when s4.p/info is implemented
        policyDataUpdate() {
            const { containerID } = M.currentCustomView;

            delay('s4AttachmentUpdate', async() => {
                await this.list(containerID, true);
                s4.ui.renderSelected();
            }, 5000);
        },

        async showPolicyDoc() {
            const { containerID } = M.currentCustomView;
            const p = await this.info(containerID, s4.ui.lastPathPart);
            const infoPageBlock = s4.ui.$pageBlock.get(0);
            const policyDoc = p && await s4.kernel.policies.getPolicyVersion(p.arn, p.v, containerID)
                .catch(nop) || {};

            await M.require('codemirror_js', 'codemirrorscroll_js');

            const textArea = infoPageBlock.querySelector('.policy-pdoc-info textarea.policy-doc');
            if (!s4.ui.codeEditor) {
                s4.ui.codeEditor = CodeMirror.fromTextArea(textArea, {
                    lineNumbers: true,
                    mode: "javascript",
                    autofocus: true,
                    lineWrapping: true,
                    readOnly: true
                });
            }

            s4.ui.codeEditor.setValue(JSON.stringify(policyDoc, null, 4));

            $('.policy-pdoc-info .copy-policy-doc', infoPageBlock).rebind('click.s4pdoc', () => {
                const value = s4.ui.codeEditor ? s4.ui.codeEditor.getValue() : '';
                return copyToClipboard(value, value ? l.s4_policy_copied.replace('%1', p.name) : l[6949]);
            });
        }
    });

    class S4GroupList extends S4List {
        constructor(domNode, handle, onItems, onEmptyItems) {
            super(domNode, handle, onItems, onEmptyItems, S4GroupList.getColsWidth(), 'name');

            /** @property S4List.template */
            lazy(this, 'template', () => {
                return parseHTML(S4GroupList.template()).querySelector('tr');
            });
            Object.defineProperty(this, 'colsWidth', {value: S4GroupList.getColsWidth()});
            Object.defineProperty(this, 'type', {value: 'policy-groups'});
        }

        async getItems(n) {
            if ((n = super.getItems(n))) {
                const list = await s4.kernel.group.list(n.h);
                const groups = [];
                this.policy = await s4.policyProperties.handlers.info(n.h, s4.ui.lastPathPart);

                for (let i = 0; i < list.length; ++i) {
                    const policies = await s4.kernel.policies.listGroupPolicies(n.h, list[i].gid);
                    for (let j = 0; j < policies.length; ++j) {
                        if (policies[j].arn === this.policy.arn) {
                            groups.push(list[i]);
                            break;
                        }
                    }
                }

                return ['gid', groups];
            }
        }

        static getColsWidth() {
            return {
                's4-group-name': { min: 200, max: 5000 },
                'actions-btn': { min: 100, max: 200, init: 120 },
            };
        }

        static supports(type) {
            return type === 'policy-groups';
        }

        static template() {
            return '<tr>' +
                        '<td class="s4-group-name"><span></span></td>' +
                        '<td class="actions-btn">' +
                            `<a class="view-btn view-group">${l[16797]}</a>` +
                            `<a class="remove-btn remove-group">${l[83]}</a>` +
                        '</td>' +
                    '</tr>';

        }

        get [Symbol.toStringTag]() {
            return 'S4PolicyPropertiesGroupList';
        }

        setRow(row, {gid, name}) {
            super.setRow(row, gid.toString());

            const nNode = row.querySelector('td.s4-group-name span');
            if (nNode.textContent !== name) {
                nNode.textContent = name;
            }
        }

        unbindEvents() {
            super.unbindEvents();

            $('.s4-grid-table tbody tr .remove-group', this.$fmBlock).unbind('click.remove-group');
            $('.s4-grid-table tbody tr .view-group', this.$fmBlock).unbind('click.view-group');
            $('.action.add-s4-new-group', this.$fmBlock).unbind('click.add-group');
        }

        bindEvents() {
            super.bindEvents();

            const {containerID} = M.currentCustomView;
            $('.s4-grid-table tbody tr .remove-group', this.$fmBlock).rebind('click.remove-group', (e) => {
                const groupId = parseInt(e.target.closest('tr').id);
                asyncMsgDialog(
                    `-remove:!^${l[83]}!${l.s4_confirm_remove_cancel}`,
                    l[1003],
                    l.s4_confirm_remove_group_from_user_title,
                    false,
                    async(yes) => {
                        if (yes) {
                            mLoadingSpinner.show('s4-group-remove-group');
                            s4.kernel.group.info(containerID, groupId)
                                .then((group) => s4.kernel.policies.detachGroupPolicy(
                                    containerID, group.name, this.policy.arn))
                                .catch(tell)
                                .finally(() => mLoadingSpinner.hide('s4-group-remove-group'));
                        }
                    },
                    1
                );
            });

            $('.s4-grid-table tbody tr .view-group', this.$fmBlock).rebind('click.view-group', event => {
                const userId = parseInt(event.target.closest('tr').id);
                M.openFolder(`${this.handle}/groups/${userId}`, true);
            });

            $('.action.add-s4-new-groups', this.$fmBlock).rebind('click.add-group', () => {
                s4.ui.showDialog(dialogs.addGroup);
            });
        }
    }

    class S4UserList extends S4List {
        constructor(domNode, handle, onItems, onEmptyItems) {
            super(domNode, handle, onItems, onEmptyItems, S4UserList.getColsWidth(), 'name');

            /** @property S4List.template */
            lazy(this, 'template', () => {
                return parseHTML(S4UserList.template()).querySelector('tr');
            });
            Object.defineProperty(this, 'type', {value: 'policy-users'});
            Object.defineProperty(this, 'colsWidth', { value: S4UserList.getColsWidth()});
        }

        static getColsWidth() {
            return {
                's4-user-name': { min: 200, max: 5000 },
                'actions-btn': { min: 100, max: 200, init: 120 },
            };
        }

        static supports(type) {
            return type === 'policy-users';
        }

        static template() {
            return '<tr>' +
                        '<td class="s4-user-name"><span></span></td>' +
                        '<td class="actions-btn">' +
                            `<a class="view-btn view-user">${l[16797]}</a>` +
                            `<a class="remove-btn remove-user">${l[83]}</a>` +
                        '</td>' +
                    '</tr>';
        }

        get [Symbol.toStringTag]() {
            return 'S4PolicyPropertiesUserList';
        }

        async setRow(row, {uid, name}) {
            super.setRow(row, uid.toString());

            const nNode = row.querySelector('td.s4-user-name span');
            if (nNode.textContent !== name) {
                nNode.textContent = name;
            }
        }

        async getItems(n) {
            if ((n = super.getItems(n))) {
                const list = await s4.kernel.user.list(n.h);
                const users = [];
                this.policy = await s4.policyProperties.handlers.info(n.h, s4.ui.lastPathPart);

                for (let i = 0; i < list.length; ++i) {
                    const policies = await s4.kernel.policies.listUserPolicies(n.h, list[i].uid);
                    for (let j = 0; j < policies.length; ++j) {
                        if (policies[j].arn === this.policy.arn) {
                            users.push(list[i]);
                            break;
                        }
                    }
                }

                return ['uid', users];
            }
        }

        unbindEvents() {
            super.unbindEvents();

            $('.s4-grid-table tbody tr .remove-user', this.$fmBlock).unbind('click.remove-user');
            $('.s4-grid-table tbody tr .view-user', this.$fmBlock).unbind('click.view-user');
            $('.action.add-s4-new-users', this.$fmBlock).unbind('click.add-user');
        }

        bindEvents() {
            super.bindEvents();

            const {containerID} = M.currentCustomView;
            $('.s4-grid-table tbody tr .remove-user', this.$fmBlock).rebind('click.remove-user', (e) => {
                const userId = parseInt(e.target.closest('tr').id);
                asyncMsgDialog(
                    `-remove:!^${l[83]}!${l.s4_confirm_remove_cancel}`,
                    l[1003],
                    l.s4_confirm_remove_user_from_group_title,
                    false,
                    async(yes) => {
                        if (yes) {
                            mLoadingSpinner.show('s4-group-remove-user');
                            s4.kernel.user.info(containerID, userId)
                                .then((user) => s4.kernel.policies.detachUserPolicy(
                                    containerID, user.name, this.policy.arn))
                                .catch(tell)
                                .finally(() => mLoadingSpinner.hide('s4-group-remove-user'));
                        }
                    },
                    1
                );
            });

            $('.s4-grid-table tbody tr .view-user', this.$fmBlock).rebind('click.view-user', event => {
                const userId = parseInt(event.target.closest('tr').id);
                M.openFolder(`${this.handle}/users/${userId}`, true);
            });

            $('.action.add-s4-new-users', this.$fmBlock).rebind('click.add-user', () => {
                s4.ui.showDialog(dialogs.addUser);
            });
        }
    }

    return freeze({dialogs, handlers, S4UserList, S4GroupList});
});
