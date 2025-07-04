class MegaContextMenu extends MegaComponentGroup {
    constructor() {
        super();

        this.domNode = document.createElement('div');
        this.domNode.className = 'context-menu-items';

        this.keys = Object.keys(MegaContextMenu.menuItems);

        // build all context menu items
        for (let i = this.keys.length; i--;) {
            const key = this.keys[i];
            const menu = MegaContextMenu.menuItems[key];

            const item = new MegaButton({
                text: menu.text,
                icon: menu.icon,
                type: 'fullwidth',
                parentNode: this.domNode,
                componentClassname: `text-icon ${key.replace('.', '')}`
            });

            item.on('click', () => menu.onClick(this.handle));

            this.addChild(key, item);
        }
    }

    /**
     * Build menu items and show context menu dialog
     *
     * @param {Object} options Options for the context menu
     * @returns {void}
     */
    show(options) {
        this.name = options.name;
        if (options.handle) {
            this.handle = options.handle;
        }
        const menuItems = Object.create(null);

        if (this.name === 'item-detail-menu') {
            menuItems['.edit-item'] = 1;
            menuItems['.delete-item'] = 1;
        }
        else if (this.name === 'item-list-menu') {
            const node = M.getNodeByHandle(this.handle);
            const pwm = node && node.pwm;

            if (pwm) {
                if (pwm.t === 'c') {
                    menuItems['.copy-card-number'] = 1;
                    if (pwm.u) {
                        menuItems['.copy-cardholder-name'] = 1;
                    }
                    if (pwm.exp) {
                        menuItems['.copy-expiration-date'] = 1;
                    }
                    if (pwm.cvv) {
                        menuItems['.copy-security-code'] = 1;
                    }
                }
                else {
                    menuItems['.copy-password'] = 1;
                    if (pwm.u) {
                        menuItems['.copy-username'] = 1;
                    }
                    if (pwm.url) {
                        menuItems['.launch-website'] = 1;
                    }
                }
            }
            menuItems['.edit-item'] = 1;
            menuItems['.delete-item'] = 1;
        }

        for (let i = this.keys.length; i--;) {
            const key = this.keys[i];
            const item = this.domNode.querySelector(key);

            // if the context menu has the key then remove hidden class to show the item
            item.classList[menuItems[key] ? 'remove' : 'add']('hidden');
        }

        let contents = [this.domNode];

        if (options.parentNode) {
            options.parentNode.append(...contents);
            contents = [options.parentNode];
        }

        mega.ui.pm.menu.show({
            ...options,
            contents
        });
    }
}

(mega => {
    "use strict";

    lazy(MegaContextMenu, 'menuItems', () => {
        return {
            '.delete-item': {
                text: l.delete_item,
                icon: 'sprite-pm-mono icon-trash-thin-outline',
                onClick: (nodeHandle) => {
                    if (mega.pm.validateUserStatus()) {
                        const node = M.getNodeByHandle(nodeHandle);
                        let eventlogId = 500545;

                        if (node && node.pwm && node.pwm.t === 'c') {
                            eventlogId = 500849;
                        }

                        mega.ui.pm.delete.showConfirm();
                        eventlog(eventlogId);
                    }
                }
            },
            '.edit-item': {
                text: l.edit_item,
                icon: 'sprite-pm-mono icon-edit-thin-outline',
                onClick: () => {
                    const node = M.getNodeByHandle(mega.ui.pm.list.selectedItem.domNode.id);
                    const {pwm} = node;
                    let prop = 'passform';
                    let itemClass = PasswordItemForm;
                    let eventlogId = 500546;

                    // credit card item
                    if (pwm.t === 'c') {
                        prop = 'creditcardform';
                        itemClass = CreditCardItemForm;
                        eventlogId = 500861;
                    }

                    if (!mega.ui[prop]) {
                        mega.ui[prop] = new itemClass();
                    }

                    mega.ui[prop].show({ type: 'update' });
                    eventlog(eventlogId);
                }
            },
            '.launch-website': {
                text: l.launch_website,
                icon: 'sprite-pm-mono icon-external-link-thin-outline',
                onClick: (nodeHandle) => {
                    const node = M.getNodeByHandle(nodeHandle);
                    const {url} = node.pwm;
                    window.open(/^https?:\/\//i.test(url) ? url : `https://${url}`, '_blank', 'noopener,noreferrer');
                    eventlog(500543);
                }
            },
            '.copy-username': {
                text: l.copy_username,
                icon: 'sprite-pm-mono icon-copy-thin-outline',
                onClick: (nodeHandle) => {
                    const node = M.getNodeByHandle(nodeHandle);
                    mega.ui.pm.utils.copyPMToClipboard(node.pwm.u, l.username_copied);
                    eventlog(500542);
                }
            },
            '.copy-password': {
                text: l[19601],
                icon: 'sprite-pm-mono icon-copy-thin-outline',
                onClick: (nodeHandle) => {
                    const node = M.getNodeByHandle(nodeHandle);
                    mega.ui.pm.utils.copyPMToClipboard(node.pwm.pwd, l[19602]);
                    eventlog(500541);
                }
            },
            '.copy-security-code': {
                text: l.copy_security_code,
                icon: 'sprite-pm-mono icon-copy-thin-outline',
                onClick: (nodeHandle) => {
                    const node = M.getNodeByHandle(nodeHandle);
                    mega.ui.pm.utils.copyPMToClipboard(node.pwm.cvv.replace(/\s+/g, ''), l.security_code_copied);
                }
            },
            '.copy-expiration-date': {
                text: l.copy_exp_date,
                icon: 'sprite-pm-mono icon-copy-thin-outline',
                onClick: (nodeHandle) => {
                    const node = M.getNodeByHandle(nodeHandle);
                    mega.ui.pm.utils.copyPMToClipboard(node.pwm.exp.replace(/\s+/g, ''), l.exp_date_copied);
                }
            },
            '.copy-card-number': {
                text: l.copy_card_number,
                icon: 'sprite-pm-mono icon-copy-thin-outline',
                onClick: (nodeHandle) => {
                    const node = M.getNodeByHandle(nodeHandle);
                    mega.ui.pm.utils.copyPMToClipboard(node.pwm.nu.replace(/\s+/g, ''), l.card_number_copied);
                }
            },
            '.copy-cardholder-name': {
                text: l.copy_cardholder_name,
                icon: 'sprite-pm-mono icon-copy-thin-outline',
                onClick: (nodeHandle) => {
                    const node = M.getNodeByHandle(nodeHandle);
                    mega.ui.pm.utils.copyPMToClipboard(node.pwm.u, l.cardholder_name_copied);
                }
            }
        };
    });

})(window.mega);
