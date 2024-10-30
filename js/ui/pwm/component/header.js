class MegaHeader extends MegaMobileHeader {

    constructor(options) {

        super(options);

        /* Top block */

        const menuButton = this.domNode.componentSelector('.top-block .menu');
        menuButton.on('click.menu', () => {
            menuButton.handleEvent('tap.list');
        });

        /* Bottom block */

        const navNavigation = this.domNode.querySelector('.bottom-block .nav-navigation');
        navNavigation.textContent = '';

        const navActions = this.domNode.querySelector('.bottom-block .nav-actions');
        navActions.textContent = '';

        const returnLink = new MegaLink({
            parentNode: navActions,
            text: l.return_to_clouddrive,
            componentClassname: 'text-only'
        });

        returnLink.on('click.return', () => {
            loadSubPage('fm');

            if (mega.ui.pm.overlay.visible) {
                mega.ui.pm.overlay.hide();
            }

            eventlog(500562);
        });

        // const alarmButton = new MegaButton({
        //     parentNode: navActions,
        //     type: 'icon',
        //     componentClassname: 'text-icon menu',
        //     icon: 'sprite-mobile-fm-mono icon-bell-thin',
        //     iconSize: 24
        // });

        // alarmButton.on('tap.list', () => {
        //     // TODO: Implement alarm button functionality
        // });

        // const avatarButton = new MegaLink({
        //     parentNode: navActions,
        //     type: 'normal',
        //     componentClassname: 'avatar'
        // });

        // useravatar.loadAvatar(u_handle).finally(() => {

        //     const avatarMeta = generateAvatarMeta(u_handle);

        //     const shortNameEl = mCreateElement('span');
        //     shortNameEl.textContent = avatarMeta.shortName;

        //     const avatar = avatarMeta.avatarUrl
        //         ? mCreateElement('img', {src: avatarMeta.avatarUrl})
        //         : mCreateElement('div', {class: `color${avatarMeta.color}`},[shortNameEl]);

        //     avatarButton.domNode.appendChild(avatar);

        //     avatarButton.on('click.account', () => {
        //         // TODO: Implement popup for user account settings
        //     });
        // });

        const treeDotButton = new MegaButton({
            parentNode: navActions,
            type: 'icon',
            componentClassname: 'text-icon menu js-more-menu',
            icon: 'sprite-fm-mono icon-side-menu',
            iconSize: 24
        });

        treeDotButton.on('click', () => topMenu());
    }

    static init(update) {
        const {topmenu, header} = mega.ui;

        topmenu.hide();

        if (update) {
            header.update();
        }
    }
}

(mega => {
    "use strict";

    lazy(mega.ui, 'header', () => new MegaHeader({
        parentNode: pmlayout,
        componentClassname: 'mega-header',
        prepend: true
    }));

})(window.mega);
