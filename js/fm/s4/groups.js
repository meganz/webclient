lazy(s4, 'groups', () => {
    'use strict';

    const {S4List: UIS4List, S4PagedDialog} = s4.ui.classes;

    const handlers = freeze({

        validateName(name) {
            const maxLength = 128;
            if (!name) {
                return l.s4_group_empty_error;
            }

            if (name.length > maxLength) {
                return l.s4_group_max_length_error.replace('%d', maxLength);
            }

            if (!s4.kernel.isValidGroupName(name)) {
                return l.s4_user_not_allowed_chars_error;
            }
        },

        async checkNameAvailable(name, skipName) {
            const {containerID} = M.currentCustomView;
            const groups = await s4.kernel.group.list(containerID);
            const group = groups.find((group) => {
                if (skipName && group.name.toLowerCase() === skipName.toLowerCase()) {
                    return false;
                }
                return group.name.toLowerCase() === name.toLowerCase();
            });

            if (group) {
                throw new Error(l.s4_group_name_duplicate_error);
            }
        },

        rename() {
            return s4.ui.lists.groups.findSelected()
                .then((item) => {
                    const {name, gid: id} = item;
                    const obj = {name, id, kernel: 'group'};
                    return s4.ui.renameDialog('groups', obj, l.s4_group_rename, 'icon-contacts');
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
                    name = $('.s4-group-name', $row).text();
                    arn = $('.s4-group-arn span', $row).text();
                }
                else if ($block.length) {
                    name = $('.js-group-name-value', $block).text();
                    arn = $('.js-group-arn-value span', $block).text();
                }
                if (name && arn) {
                    return copyToClipboard(arn, l.s4_group_arn_copied_toast_txt);
                }
                return copyToClipboard('', l[6949]);
            }
            return s4.ui.lists.groups.findSelected()
                .then((item) => {
                    copyToClipboard(item.arn, l.s4_group_arn_copied_toast_txt);
                })
                .catch(tell);
        },

        remove() {
            return s4.ui.lists.groups.findSelected()
                .then((item) => {
                    const {gid, name} = item;
                    return asyncMsgDialog(
                        `-remove:!^${l[1730]}!${l.s4_key_confirm_delete_cancel}`,
                        l[1003],
                        l.s4_key_confirm_delete_title.replace('%s', name),
                        l.s4_group_confirm_delete_message,
                        async(yes) => {
                            if (yes) {
                                mLoadingSpinner.show('s4-group-delete');
                                return s4.kernel.group.remove(M.currentCustomView.containerID, parseInt(gid))
                                    .catch(tell)
                                    .finally(() => mLoadingSpinner.hide('s4-group-delete'));
                            }
                        },
                        1
                    );
                });
        },

        requiredLinks() {
            return s4.ui.lists.groups.findSelected()
                .then(() => {
                    return {
                        hide: [
                            'options',
                            'delete',
                        ],
                        show: [
                            's4-group-copy-arn',
                            's4-group-rename',
                            's4-group-delete'
                        ],
                    };
                })
                .catch(tell);
        },

        initStatusBarLinks(classList) {
            if (classList.contains('s4-group-copy-arn')) {
                this.copyArn();
            }
            else if (classList.contains('s4-group-rename')) {
                this.rename();
            }
            else if (classList.contains('s4-group-delete')) {
                this.remove();
            }
        }
    });

    class S4CreateDialog extends S4PagedDialog {
        constructor(name) {
            super(name, $('.s4-create-group-dialog', '.mega-dialog-container'), 4, [2, 3, 4]);

            this.handleOverlayClick = true;
            this.group = Object.create(null);
            this.container = Object.create(null);
            this.text.header = l.s4_group_create;

            this.$groupInput = mega.ui.MegaInputs($('input[name=group-name-input]', this.$steps[1]));
        }

        destroy() {
            super.destroy();

            $('.policy-row:not(.policy-template)', this.$steps[2]).remove();
            $('.group-user-row:not(.group-user-template)', this.$steps[3]).remove();
            $('.group-row:not(.group-template)', this.$steps[3]).remove();
            $('.badge-container .badge:not(.badge-template)', this.$steps[4]).remove();
            this.$groupInput.hideError();
        }

        hide() {
            super.hide();

            this.group = Object.create(null);

            this.$dialogRegress.addClass('hidden');
            $('input', this.$dialogContainer).val('');
            $('.create-group-container', this.$steps[2]).addClass('hidden');
            $('.checkboxOn', this.$dialog).removeClass('checkboxOn').addClass('checkboxOff');
        }

        unbindEvents() {
            super.unbindEvents();

            const {
                $steps,
                $groupInput,
            } = this;

            $groupInput.$input.unbind('keydown.s4dlg');
            $groupInput.$input.unbind('input.s4dlg');
            $('input.policies-search', $steps[2]).unbind('input.s4dlg');
            $('input.users-search', $steps[3]).unbind('input.s4dlg');
            $('.policy-table tbody input', this.$steps[2]).unbind('click.s4dlg');
            $('.group-users-table tbody input', this.$steps[3]).unbind('click.s4dlg');
        }

        bindEvents() {
            super.bindEvents();

            const {
                $steps,
                $groupInput,
                $dialogProgress,
            } = this;

            // Step 1 events
            $groupInput.$input.rebind('keydown.s4dlg', (e) => {
                if (e.which === 13) {
                    $dialogProgress.trigger('click');
                }
            });
            $groupInput.$input.rebind('input.s4dlg', e => {
                const name = $(e.currentTarget).val();
                if (this._validGroupName(name)) {
                    this._toggleProgress(name);
                }
                else {
                    this._toggleProgress(false);
                }
            });

            // Step 2 events
            $('input.policies-search', $steps[2]).rebind('input.s4dlg', e => {
                const val = $(e.currentTarget).val().toLowerCase();
                $('.policy-row.hidden:not(.policy-template)', $steps[2]).removeClass('hidden');
                if (val) {
                    for (const policyRow of $('.policy-table .policy-row:not(.policy-template)', this.$steps[2])) {
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
                    $('.policy-table .policy-row.hidden:not(.policy-template)', $steps[2]).removeClass('hidden');
                }
            });

            // Step 3 events
            $('input.users-search', $steps[3]).rebind('input.s4dlg', e => {
                const val = $(e.currentTarget).val().toLowerCase();
                $('.group-user-row.hidden:not(.group-user-template)', $steps[3]).removeClass('hidden');
                if (val) {
                    const uRow = $('.group-users-table .group-user-row:not(.group-user-template)', this.$steps[3]);
                    for (const userRow of uRow) {
                        const $userRow = $(userRow);
                        if ($('span.group-user-name', $userRow).text().toLowerCase().includes(val)) {
                            $userRow.removeClass('hidden');
                        }
                        else {
                            $userRow.addClass('hidden');
                        }
                    }
                }
                else {
                    $('.group-users-table .group-user-row.hidden:not(.group-user-template)', $steps[3])
                        .removeClass('hidden');
                }
            });
        }

        async step1(finalise) {
            if (finalise) {
                this.group.name = this.$groupInput.$input.val();

                return handlers.checkNameAvailable(this.group.name)
                    .then(() => {
                        this.stepLocked = false;
                        this.tainted = true;
                        this.$steps[1].addClass('hidden');
                    })
                    .catch((ex) => {
                        this.$groupInput.showError(ex.message || ex);
                    });
            }
            this.stepLocked = true;
            await this._initList();

            if (!this.group.name) {
                this.$dialogProgress.addClass('disabled');
            }

            this.$steps[1].removeClass('hidden');
            delay('s4.input.focus', () => {
                this.$groupInput.$input.focus();
            }, 50);
        }

        async step2(finalise) {
            if (finalise) {
                this.$steps[2].addClass('hidden');
                // eslint-disable-next-line jquery/no-map
                this.group.policies = $('.checkboxOn input[data-name]', this.$steps[2])
                    .toArray().map(row => row.dataset.name.replace('cp_', ''));
                return;
            }
            $('.search-bar input', this.$steps[2]).val('');
            $('.policy-row:not(.policy-template)', this.$steps[2]).removeClass('hidden');
            if (!this.group.policies) {
                let html = '';
                for (const policy of this.container.policies) {
                    if (!$(`#cp_${policy.policyId}`, this.$steps[2]).length) {
                        html += this._createPolicyRow(policy);
                    }
                }
                if (html) {
                    $('.policy-table tbody', this.$steps[2]).safeAppend(html);
                    $('.policy-table tbody input', this.$steps[2]).rebind('click.s4dlg', e => {
                        this.toggleRowCheckbox($(e.target).closest('.policy-check'));
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
                this.group.users = $('.checkboxOn input[data-name]', this.$steps[3])
                    .toArray()
                    .map(row => row.dataset.name.replace('cu_', ''));
                return;
            }
            $('.search-bar input', this.$steps[3]).val('');
            $('.group-row:not(.group-template)', this.$steps[3]).removeClass('hidden');
            if (!this.group.users) {
                let html = '';
                for (const user of this.container.users) {
                    if (!$(`#cu_${user.uid}`, this.$steps[3]).length) {
                        html += this._createTableRow(user, 'group-user', 'cu_', 3);
                    }
                }
                if (html) {
                    $('.group-users-table tbody', this.$steps[3]).safeAppend(html);
                    $('.group-users-table tbody input', this.$steps[3]).rebind('click.s4dlg', e => {
                        this.toggleRowCheckbox($(e.target).closest('.group-user-check'));
                    });
                }
            }
            this.initScrollbar(this.$steps[3].get(0).querySelector('.s4-table-scroll'));
            this.$steps[3].removeClass('hidden');
        }

        async step4(finalise) {
            if (finalise) {
                await this._createGroup();
                this.stepLocked = false;
                this.$steps[4].addClass('hidden');
                return;
            }

            this.stepLocked = true;
            if (!this.group.arn) {
                const {containerID} = M.currentCustomView;
                this.group.arn = await s4.kernel.group.arn(containerID, this.group.name);
            }
            $('.container-group-name', this.$steps[4]).text(this.group.name);
            $('.container-group-arn', this.$steps[4]).text(this.group.arn);
            let html = '';
            for (const user of this.group.users) {
                if (!$(`[data-name="gu_${user}"]`, this.$steps[4]).length) {
                    html += this._createBadge(user, 'gu_', this.$steps[4]);
                }
            }
            if (html) {
                const $container = $('.user-info .badge-container', this.$steps[4]);
                $container.safeAppend(html);
                $('i.icon-dialog-close', $container).rebind('click.s4dlg', e => {
                    const $badge = $(e.currentTarget).closest('.badge');
                    const label = $('.badge-name', $badge).text();
                    const index = this.group.users.indexOf(label);
                    if (index !== -1) {
                        this.group.users.splice(index, 1);
                    }
                    $badge.remove();
                    $(`input[data-name="cu_${label}"]`, this.$dialogContainer).trigger('click');
                });
            }
            html = '';
            for (const policy of this.group.policies) {
                if (!$(`[data-name="gp_${policy}"]`, this.$steps[4]).length) {
                    html += this._createBadge(policy, 'gp_', this.$steps[4]);
                }
            }
            if (html) {
                const $container = $('.policy-info .badge-container', this.$steps[4]);
                $container.safeAppend(html);
                $('button.remove', $container).rebind('click.s4dlg', e => {
                    const $badge = $(e.currentTarget).closest('.badge');
                    const label = $('.badge-name', $badge).text();
                    const index = this.group.policies.indexOf(label);
                    if (index !== -1) {
                        this.group.policies.splice(index, 1);
                    }
                    $badge.remove();
                    $(`input[data-name="cp_${label}"]`, this.$dialogContainer).trigger('click');
                });
            }
            $('span', this.$dialogProgress.removeClass('disabled')).text(l[870] /* Confirm */);
            this.$steps[4].removeClass('hidden');
        }

        async _initList() {
            const {containerID} = M.currentCustomView;

            const [users = [], policies = []] = await Promise.all([
                s4.kernel.user.list(containerID),
                s4.kernel.policies.list(containerID)
            ]);

            Object.assign(this.container, {users, policies});
        }

        _validGroupName(name) {
            const groupError = handlers.validateName(name);
            if (groupError) {
                if (groupError !== l.s4_group_empty_error) {
                    this.$groupInput.showError(groupError);
                }
                return false;
            }
            return true;
        }

        _createTableRow(value, key, idPrefix, step) {
            const $template = $(`.${key}-template`, this.$steps[step]).clone();
            $template.removeClass(`${key}-template hidden`).attr('id', idPrefix + value.uid);
            $(`span.${key}-name`, $template).text(value.name);
            $(`input`, $template).attr('data-name', idPrefix + value.name);
            return $template.prop('outerHTML');
        }

        _createPolicyRow(policy) {
            const $template = $('.policy-template', this.$steps[2]).clone();
            $template.removeClass('policy-template hidden')
                .attr('id', `cp_${policy.policyId}`);
            $('span.policy-name', $template).text(policy.policyName);
            $('input', $template).attr('data-name', `cp_${policy.policyName}`);
            return $template.prop('outerHTML');
        }

        async _createGroup() {
            mLoadingSpinner.show('s4-group-create');
            const {containerID} = M.currentCustomView;

            const users = this.container.users
                .filter(u => this.group.users.includes(u.name))
                .map(u => parseInt(u.uid));

            const policies = this.container.policies
                .filter(u => this.group.policies.includes(u.policyName))
                .map(u => u.arn);

            return s4.kernel.group.create(containerID, this.group.name, policies)
                .then(g => {
                    if (users && users.length > 0) {
                        return s4.kernel.group.addUsers(containerID, g, users);
                    }
                })
                .finally(() => {
                    mLoadingSpinner.hide('s4-group-create');
                });
        }
    }

    const dialogs = Object.create(null);
    lazy(dialogs, 'create', () => new S4CreateDialog('create-group'));

    class S4List extends UIS4List {
        constructor(domNode, handle, onItems, onEmptyItems) {
            super(domNode, handle, onItems, onEmptyItems, S4List.getColsWidth(), 'name');

            /** @property S4List.template */
            lazy(this, 'template', () => {
                return parseHTML(S4List.template()).querySelector('tr');
            });
            Object.defineProperty(this, 'type', {value: 'groups'});
            Object.defineProperty(this, 'colsWidth', { value: S4List.getColsWidth()});
        }

        static getColsWidth() {
            return {
                's4-group-name': { min: 200, max: 5000 },
                's4-user-amount': { min: 50, max: 200, init: 120 },
                's4-att-policies': { min: 200, max: 500, init: 250 },
                's4-group-arn': { min: 400, max: 500, init: 400 },
            };
        }

        static supports(type) {
            return type === 'groups';
        }

        static template() {
            return '<tr>' +
                        '<td class="s4-group-name"><span></span></td>' +
                        '<td class="s4-user-amount"><span></span></td>' +
                        '<td class="s4-att-policies">' +
                            '<span class="simpletip"></span>' +
                        '</td>' +
                        '<td class="s4-group-arn with-icons">' +
                            '<span class="space-for-icon-right"></span>' +
                            '<button class="mega-button small action copy" data-key="arn">' +
                                '<i class="sprite-fm-mono icon-copy icon24"></i>' +
                            '</button>' +
                        '</td>' +
                    '</tr>';
        }

        get [Symbol.toStringTag]() {
            return 'S4GroupsList';
        }

        async setRow(row, {gid, name, arn, users}) {
            super.setRow(row, gid.toString());

            const nNode = row.querySelector('td.s4-group-name span');
            if (nNode.textContent !== name) {
                nNode.textContent = name;
            }
            const uaNode = row.querySelector('td.s4-user-amount span');
            if (uaNode.textContent !== (users.length || 0).toString()) {
                uaNode.textContent = users.length || 0;
            }
            const arnNode = row.querySelector('td.s4-group-arn span');
            if (arnNode.textContent !== arn) {
                arnNode.textContent = arn;
            }

            const policies = await s4.kernel.policies.listGroupPolicies(M.currentCustomView.containerID, gid);

            const pNode = row.querySelector('td.s4-att-policies span');
            s4.utils.setNodeMultipleText(pNode, policies, 'name', '%s and %d more');

            const policiestt = (policies || []).map(p => p.name).join('[BR]');
            if (pNode.dataset.simpletip !== policiestt) {
                pNode.dataset.simpletip = policiestt;
            }
        }

        async getItems(n) {
            if ((n = super.getItems(n))) {
                return ['gid', await s4.kernel.group.list(n.h)];
            }
        }

        handleSelection(event, onSelection) {
            const $row = $(event.target).closest('tr');
            const name = $('.s4-group-name', $row).text();
            const arn = $('.s4-group-arn', $row).text();
            const gid = $row.attr('id');

            const selected = {name, arn, gid};
            super.handleSelection(event, onSelection, selected, 'gid');
        }

        unbindEvents() {
            super.unbindEvents();

            const dd = '.dropdown.body.context .dropdown-item';
            this.$tableData.unbind('click.s4klst');
            this.$tableData.unbind('contextmenu.s4klst');
            $(`${dd}.s4-group-copy-arn`, '.fmholder').unbind('click.s4klst.ctxm.copyarn');
            $(`${dd}.s4-group-rename`, '.fmholder').unbind('click.s4klst.ctxm.rename');
            $(`${dd}.s4-group-delete`, '.fmholder').unbind('click.s4klst.ctxm.delete');
            $('.s4-grid-table tbody tr', '.s4-groups-management-scroll').unbind('dblclick.openInfoPage');
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
                        '.s4-group-copy-arn',
                        '.s4-group-rename',
                        '.s4-group-delete',
                    ].join(','));
                });
            });

            $(`${dd}.s4-group-copy-arn`, '.fmholder').rebind('click.s4klst.ctxm.copyarn', () => {
                handlers.copyArn();
            });

            $(`${dd}.s4-group-rename`, '.fmholder').rebind('click.s4klst.ctxm.rename', () => {
                handlers.rename();
            });

            $(`${dd}.s4-group-delete`, '.fmholder').rebind('click.s4klst.ctxm.delete', () => {
                handlers.remove();
            });

            $('.s4-grid-table tbody tr', '.s4-groups-management-scroll').rebind('dblclick.openInfoPage', (e) => {
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
