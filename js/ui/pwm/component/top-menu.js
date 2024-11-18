class MegaTopMenu extends MegaMobileTopMenu {

    constructor(options) {
        super(options);

        const menuNode = this.domNode.querySelector('.menu');
        menuNode.textContent = '';

        const menuOpts = {
            type: 'fullwidth',
            componentClassname: 'text-icon menu-item',
            iconSize: 24
        };

        const menuItems = [
            {
                text: l.rewind_label_all_default,
                icon: 'sprite-pm-mono icon-square-regular-outline',
                href: '/fm/pwm'
            },
            {
                text: l[823],
                icon: 'sprite-mobile-fm-mono icon-settings-thin-outline',
                href: '/fm/pwm/account',
                eventLog: 500573
            }
        ];

        let menuItem;
        for (const item of menuItems) {
            // Infer the tappable type
            if (item.binding) {
                menuItem = new MegaButton({
                    ...menuOpts,
                    ...item,
                    parentNode: menuNode
                });
                menuItem.on('click', () => {
                    item.binding();
                });
            }
            else {
                menuItem = new MegaLink({
                    ...menuOpts,
                    ...item,
                    parentNode: menuNode
                });

                menuItem.domNode.dataset.section = item.href;

                menuItem.on('beforeRedirect.topmenu', () => {

                    mega.ui.topmenu.hide();

                    return false;
                });

                menuItem.on('click', () => {
                    // close overlay when clicking the menu item
                    if (mega.ui.pm.overlay.visible) {
                        mega.ui.passform.discard(mega.ui.passform.isFormChanged).then(res => {
                            if (res) {
                                mega.ui.pm.overlay.hide();
                                mega.ui.passform.clear();
                            }
                        });
                    }
                });

                if (menuItem.href === '/login') {

                    menuItem.on('beforeRedirect.beforeLogin', () => {
                        login_next = page;
                    });

                    mBroadcaster.once('login2', () => {

                        this.destroy();
                        delete mega.ui.topmenu;

                        MegaMobileTopMenu.init();
                    });
                }
            }

            if (item.eventLog) {
                menuItem.rebind('tap.eventlog', () => eventlog(item.eventLog));
            }
        }

        this.toggleActive();
    }
}

(mega => {
    "use strict";

    lazy(mega.ui, 'topmenu', () => new MegaTopMenu({
        parentNode: pmlayout,
        componentClassname: 'mega-top-menu',
        prepend: true
    }));

})(window.mega);

