lazy(s4, 'policies', () => {
    'use strict';

    const {S4List: UIS4List} = s4.ui.classes;

    const handlers = freeze({

        copyArn(e) {
            if (e) {
                const $row = $(e.currentTarget).closest('tr');
                const $block = $(e.currentTarget).closest('.values-col');
                let arn = '';
                if ($row.length) {
                    arn = $('.policy-arn span', $row).text();
                }
                else if ($block.length) {
                    arn = $('.js-policies-arn-value span', $block).text();
                }
                return copyToClipboard(arn, arn ? l.s4_policy_arn_copied : l[6949]);
            }
            return s4.ui.lists.policies.findSelected()
                .then((item) => {
                    copyToClipboard(item.arn, l.s4_policy_arn_copied);
                })
                .catch(tell);
        },

        requiredLinks() {
            return s4.ui.lists.policies.findSelected()
                .then(() => {
                    return {
                        hide: [
                            'options',
                            'delete'
                        ],
                        show: [
                            's4-policy-copy-arn'
                        ],
                    };
                })
                .catch(tell);
        },

        initStatusBarLinks(classList) {
            if (classList.contains('s4-policy-copy-arn')) {
                this.copyArn();
            }
        }
    });

    class S4List extends UIS4List {
        constructor(domNode, handle, onItems, onEmptyItems) {
            super(domNode, handle, onItems, onEmptyItems, S4List.getColsWidth(), 'policyName');

            /** @property S4List.template */
            lazy(this, 'template', () => {
                return parseHTML(S4List.template()).querySelector('tr');
            });
            Object.defineProperty(this, 'type', { value: 'policies' });
            Object.defineProperty(this, 'colsWidth', { value: S4List.getColsWidth()});
        }

        static getColsWidth() {
            return {
                'policy-name': { min: 215, max: 5000 },
                'policy-attach': { min: 85, max: 300, init: 190 },
                'policy-arn': { min: 300, max: 440, init: 460 },
            };
        }

        static supports(type) {
            return type === 'policies';
        }

        static template() {
            return '<tr>' +
                '<td class="policy-name">' +
                    '<span></span>' +
                '</td>' +
                '<td class="policy-attach">' +
                    `<span class="simpletip" data-simpletip="${l.s4_policy_arn_assign_msg}"></span>` +
                '</td>' +
                '<td class="policy-arn with-icons">' +
                    '<span></span>' +
                    '<button class="mega-button small action copy" data-key="arn">' +
                        '<i class="sprite-fm-mono icon-copy icon24"></i>' +
                    '</button>' +
                '</td>' +
            '</tr>';
        }

        get [Symbol.toStringTag]() {
            return 'S4KeysList';
        }

        setRow(row, {policyName, attachmentCount, arn, policyId}) {
            super.setRow(row, policyId);

            const nNode = row.querySelector('td.policy-name span');
            if (nNode.textContent !== policyName) {
                nNode.textContent = policyName;
            }
            const attachNode = row.querySelector('td.policy-attach span');
            if (attachNode.textContent !== attachmentCount) {
                attachNode.textContent = attachmentCount;
            }
            const arnNode = row.querySelector('td.policy-arn span');
            if (arnNode.textContent !== arn) {
                arnNode.textContent = arn;
            }
        }

        async getItems(n) {
            if ((n = super.getItems(n))) {

                // @todo remove when s4.p is implemented
                s4.ui.policies = await s4.kernel.policies.list(n.h);
                return ['policyId', s4.ui.policies];
            }
        }

        handleSelection(event, onSelection) {
            const $row = $(event.target).closest('tr');
            const policyId = $row.attr('id');
            const policyName = $('.policy-name span', $row).text();
            const attachmentCount = $('.policy-attach span', $row).text();
            const arn = $('.policy-arn span', $row).text();

            const item = {policyName, attachmentCount, arn, policyId};
            super.handleSelection(event, onSelection, item, 'policyId');
        }

        unbindEvents() {
            super.unbindEvents();

            const dd = '.dropdown.body.context .dropdown-item';
            this.$tableData.unbind('contextmenu.s4klst');
            $(`${dd}.s4-policy-copy-arn`).unbind('click.s4klst.ctxm.copypolicyarn');
            $('button.copy', this.$tableData).unbind('click.s4klst.copypolicyarn');
            $('.s4-grid-table tbody tr', '.s4-policies-management-scroll').unbind('dblclick.showDetails');
        }

        bindEvents() {
            super.bindEvents();

            const dd = '.dropdown.body.context .dropdown-item';
            this.$tableData.rebind('contextmenu.s4klst', (e) => {
                this.handleSelection(e, () => M.contextMenuUI(e, 8, '.s4-policy-copy-arn'));
            });

            $(`${dd}.s4-policy-copy-arn`).rebind('click.s4klst.ctxm.copypolicyarn', () => {
                handlers.copyArn();
            });

            $('button.copy', this.$tableData).rebind('click.s4klst.copypolicyarn', e => {
                handlers.copyArn(e);
            });

            $('.s4-grid-table tbody tr', '.s4-policies-management-scroll').rebind('dblclick.showDetails', (e) => {
                const s4ItemNodeID = $(e.currentTarget).attr('id');
                this.selection.clear();
                M.openFolder(`${this.handle}/${M.currentCustomView.subType}/${s4ItemNodeID}`);
                return false;
            });
        }
    }

    return freeze({handlers, S4List});
});
