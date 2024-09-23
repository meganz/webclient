lazy(s4, 'groupProperties', () => {
    'use strict';

    const {S4List} = s4.ui.classes;
    const {S4CreateDialog} = s4.groups;

    class S4AddUserDialog extends S4CreateDialog {
        constructor(name) {
            super(name);

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
                    const newGroups = [];
                    for (const key of Object.keys(this.changes)) {
                        if (this.changes[key]) {
                            newGroups.push(key);
                        }
                    }
                    await this._updateGroupUser(newGroups);
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
            for (const user of this.group.users) {
                const $input = $(`input[data-name="cu_${user.name}"]`, this.$steps[3]);
                if ($input.length) {
                    $input.closest('.group-user-check').addClass('checkboxOn').removeClass('checkboxOff');
                }
            }
            return super.step3(finalise);
        }

        async _init() {
            const {containerID} = M.currentCustomView;

            const groupInfo = await s4.kernel.group.info(containerID, s4.ui.lastPathPart);
            this.group.users = Object.values(groupInfo.users) || [];

            await this._initList();

            this.container.users = (this.container.users || [])
                .filter(u => !this.group.users.some(ug => u.uid === ug.uid));

            for (const user of this.container.users) {
                this.changes[user.name] = this.group.users.includes(user.name);
            }

            this.origSelected = {...this.changes};
        }

        async _updateGroupUser(groups) {
            mLoadingSpinner.show('s4-group-update-user');
            this.group.users = this.container.users.filter(u => groups.includes(u.name)).map(u => u.uid.toString());
            s4.kernel.group.addUsers(M.currentCustomView.containerID, s4.ui.lastPathPart, this.group.users)
                .catch(tell)
                .finally(() => mLoadingSpinner.hide('s4-group-update-user'));
        }
    }

    const dialogs = Object.create(null);
    lazy(dialogs, 'addUser', () => new S4AddUserDialog('group-add-user'));

    class S4UserList extends S4List {
        constructor(domNode, handle, onItems, onEmptyItems) {
            super(domNode, handle, onItems, onEmptyItems, S4UserList.getColsWidth(), 'name');

            /** @property S4List.template */
            lazy(this, 'template', () => {
                return parseHTML(S4UserList.template()).querySelector('tr');
            });
            Object.defineProperty(this, 'type', {value: 'group-users'});
            Object.defineProperty(this, 'colsWidth', { value: S4UserList.getColsWidth()});
        }

        async getItems(n) {
            if ((n = super.getItems(n))) {
                return ['name', (await s4.kernel.group.info(n.h, s4.ui.lastPathPart)).users];
            }
        }

        static getColsWidth() {
            return {
                's4-user-name': { min: 200, max: 5000 },
                'actions-btn': { min: 100, max: 200, init: 120 },
            };
        }

        static supports(type) {
            return type === 'group-users';
        }

        static template() {
            return '<tr>' +
                        '<td class="s4-user-name"><span></span></td>' +
                        '<td class="actions-btn">' +
                            `<a class="view-btn view-user">${l[16797]}</a>` +
                            `<a class="delete-btn delete-user">${l[83]}</a>` +
                        '</td>' +
                    '</tr>';

        }

        get [Symbol.toStringTag]() {
            return 'S4GroupPropertiesUserList';
        }

        setRow(row, {uid, name}) {
            super.setRow(row, uid.toString());

            const nNode = row.querySelector('td.s4-user-name span');
            if (nNode.textContent !== name) {
                nNode.textContent = name;
            }
        }

        async getElements(n) {
            // policiy listing to be added
            if ((n = super.getElements(n))) {
                return ['uid', (await s4.kernel.group.info(n.h, s4.ui.lastPathPart)).users];
            }
        }

        unbindEvents() {
            super.unbindEvents();

            $('.s4-grid-table tbody tr .delete-user', this.$fmBlock).unbind('click.delete-user');
            $('.s4-grid-table tbody tr .view-user', this.$fmBlock).unbind('click.view-user');
            $('.action.add-s4-new-users', this.$fmBlock).unbind('click.add-user');
        }

        bindEvents() {
            super.bindEvents();

            const {containerID} = M.currentCustomView;
            $('.s4-grid-table tbody tr .delete-user', this.$fmBlock).rebind('click.delete-user', (e) => {
                const tr = e.target.closest('tr');
                const userId = parseInt(tr.id);
                asyncMsgDialog(
                    `-remove:!^${l[83]}!${l.s4_confirm_remove_cancel}`,
                    l[1003],
                    l.s4_confirm_remove_user_from_group_title,
                    false,
                    async(yes) => {
                        if (yes) {
                            mLoadingSpinner.show('s4-group-delete-user');
                            s4.kernel.group.removeUsers(containerID, s4.ui.lastPathPart, [userId])
                                .catch(tell)
                                .finally(() => mLoadingSpinner.hide('s4-group-delete-user'));
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

    class S4PolicyList extends S4List {
        constructor(domNode, handle, onItems, onEmptyItems) {
            super(domNode, handle, onItems, onEmptyItems, S4PolicyList.getColsWidth(), 'name');

            /** @property S4List.template */
            lazy(this, 'template', () => {
                return parseHTML(S4PolicyList.template()).querySelector('tr');
            });
            Object.defineProperty(this, 'type', {value: 'group-policies'});
            Object.defineProperty(this, 'colsWidth', { value: S4PolicyList.getColsWidth()});
        }

        static getColsWidth() {
            return {
                'policy-name': { min: 200, max: 5000 },
                'actions-btn': { min: 100, max: 200, init: 120 },
            };
        }

        static supports(type) {
            return type === 'group-policies';
        }

        static template() {
            return '<tr>' +
                        '<td class="policy-name"><span></span></td>' +
                        '<td class="actions-btn">' +
                            `<a class="view-btn view-policy">${l[16797]}</a>` +
                            `<a class="delete-btn delete-policy">${l.s4_detach}</a>` +
                        '</td>' +
                    '</tr>';
        }

        get [Symbol.toStringTag]() {
            return 'S4GroupPropertiesPolicyList';
        }

        setRow(row, {policyId, name, arn}) {
            super.setRow(row, policyId);

            row.arn = arn;
            const nNode = row.querySelector('td.policy-name span');
            if (nNode.textContent !== name) {
                nNode.textContent = name;
            }
        }

        async getItems(n) {
            if ((n = super.getItems(n))) {
                return ['name', await s4.kernel.policies.listGroupPolicies(n.h, s4.ui.lastPathPart) || []];
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
                    asyncMsgDialog(
                        `-remove:!^${l.s4_detach}!${l.s4_confirm_detach_cancel}`,
                        l[1003],
                        l.s4_confirm_detach_policy_title,
                        false,
                        async(yes) => {
                            if (yes) {
                                mLoadingSpinner.show('s4-group-delete-policy');
                                s4.kernel.group.info(containerID, s4.ui.lastPathPart)
                                    .then((group) => s4.kernel.policies.detachGroupPolicy(
                                        containerID, group.name, policyArn))
                                    .catch(tell)
                                    .finally(() => mLoadingSpinner.hide('s4-group-delete-policy'));
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
                s4.ui.showDialog(s4.userProperties.dialogs.addPolicy, true);
            });
        }
    }

    return freeze({dialogs, S4UserList, S4PolicyList});
});
