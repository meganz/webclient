class MegaHeader extends MegaMobileHeader {

    constructor(options) {

        super(options);

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

        const avatarBtn = new MegaLink({
            parentNode: navActions,
            type: 'normal',
            componentClassname: 'avatar'
        });

        useravatar.loadAvatar(u_handle).finally(() => {

            const avatarMeta = generateAvatarMeta(u_handle);

            const shortNameEl = mCreateElement('span');
            shortNameEl.textContent = avatarMeta.shortName;

            const avatar = avatarMeta.avatarUrl
                ? mCreateElement('div', {class: `avatar-wrapper ${u_handle} small-rounded-avatar`},
                                 [mCreateElement('img', {src: avatarMeta.avatarUrl})])
                : mCreateElement('div',
                                 {class: `color${avatarMeta.color} avatar-wrapper ${u_handle} small-rounded-avatar`},
                                 [shortNameEl]);

            avatarBtn.domNode.appendChild(avatar);

            this.avatarDialog = mCreateElement('div', {class: 'pm-account-dialog'}, [
                mCreateElement('div', {class: 'avatar-header'}, [
                    mCreateElement('div', {class: 'account-profile'}, [avatar.cloneNode(true)]),
                    mCreateElement('div', {class: 'avatar-details'}, [
                        mCreateElement('div', {class: 'pm-name ', 'data-simpletip': avatarMeta.fullName},
                                       [document.createTextNode(avatarMeta.fullName)]),
                        mCreateElement('div', {class: 'pm-email', 'data-simpletip': u_attr.email},
                                       [document.createTextNode(u_attr.email)])
                    ])
                ]),

                mCreateElement('div', {class: 'horizontal-divider'})
            ]);

            avatarBtn.rebind('click', event => {
                if (avatarBtn.toggleClass('active')) {
                    mega.ui.menu.addClass('avatar-menu');
                    mega.ui.contextMenu.show({
                        name: 'avatar-menu',
                        event,
                        eventTarget: avatarBtn,
                        parentNode: this.avatarDialog
                    });

                    this.updateUserName(u_attr.fullname);
                    this.updateEmail(u_attr.email);
                }
                else {
                    mega.ui.menu.hide();
                }
            });

            mega.ui.menu.on('hide.menu', () => {
                mega.ui.menu.removeClass('avatar-menu');
                avatarBtn.removeClass('active');
                this.avatarDialog.querySelector('.pm-name').classList.remove('simpletip');
                this.avatarDialog.querySelector('.pm-email').classList.remove('simpletip');
            });
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

    }

    updateUserName(newName) {
        const elem = this.avatarDialog.querySelector('.pm-name');
        elem.textContent = newName;
        elem.dataset.simpletip = newName;

        if (elem.scrollWidth > elem.offsetWidth) {
            elem.classList.add('simpletip');
        }
        else {
            elem.classList.remove('simpletip');
        }

        mega.ui.menu.calcPosition();
    }

    updateEmail(newEmail) {
        const elem = this.avatarDialog.querySelector('.pm-email');
        elem.textContent = newEmail;
        elem.dataset.simpletip = newEmail;

        if (elem.scrollWidth > elem.offsetWidth) {
            elem.classList.add('simpletip');
        }
        else {
            elem.classList.remove('simpletip');
        }

        mega.ui.menu.calcPosition();
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
