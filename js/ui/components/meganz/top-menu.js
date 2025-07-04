class MegaTopMenu extends MegaMobileTopMenu {

    constructor(options) {

        super(options);

        this.megaLink.interactableType = 'normal';
        this.megaLink.icon = 'sprite-fm-uni icon-mega-logo';

        // @todo: Wrap menu items in a div to fix stretching bug when scrolling horizontally
        this.menuNode.Ps = new PerfectScrollbar(this.menuNode);
        mBroadcaster.addListener('pagechange', () => this.menuNode.Ps.update());
        this.on('click.topmenuClicked', () => {

            // Adding this classname if it is required to make CSS applies first so Ps can position scrollbar correctly
            this.menuNode.classList.remove('ps--active-x', 'ps--active-y');

            if (this.menuNode.scrollWidth > this.menuNode.offsetWidth) {
                this.menuNode.classList.add('ps--active-x');
            }
            if (this.menuNode.scrollHeight > this.menuNode.offsetHeight) {
                this.menuNode.classList.add('ps--active-y');
            }
            this.menuNode.Ps.update();
        });

        window.addEventListener('resize', SoonFc(90, this.menuNode.Ps.update));

        this.domNode.prepend(mCreateElement('div', {'class': 'left-pane-drag-handle'}));

        M.onFileManagerReady(() => {
            this.leftPaneResizable = $.leftPaneResizable = new FMResizablePane($(this.domNode), {
                'direction': 'e',
                'minWidth': mega.flags.ab_ads ? 260 : 200,
                'maxWidth': 400,
                'persistanceKey': 'leftPaneWidth',
                'handle': '.left-pane-drag-handle'
            });
        });

        mBroadcaster.addListener('updFileManagerUI', () => {
            this.rootBtnWrap.classList.toggle('contains-tree', !!M.tree[M.RootID]);
        });
    }

    renderMenuItems() {

        this.ready = this.ready || 0;

        if (pfid && !(this.ready & 1) || !pfid && !(this.ready & 2)) {
            super.renderMenuItems();
        }

        this.rootBtnWrap = this.domNode.querySelector(pfid ? '.js-public-tree-panel' : '.js-myfile-tree-panel');
        if (this.rootBtnWrap) {
            this.rootBtnWrap.classList.toggle('contains-tree', !!M.tree[M.RootID]);
        }
        if (this.rubbishBtn) {
            const rubNodes = Object.keys(M.c[M.RubbishID] || {});
            if (rubNodes.length) {
                this.rubbishBtn.addClass('filled');
            }
            else {
                this.rubbishBtn.removeClass('filled');
            }
        }
    }

    closeActiveOverlays() {

        if (mega.ui.pm && (mega.pm.pwmFeature || u_attr.b || u_attr.pf) && mega.ui.pm.overlay.visible) {
            let activeForm = null;
            if (mega.ui.passform && mega.ui.passform.visible) {
                activeForm = mega.ui.passform;
            }
            else if (mega.ui.creditcardform && mega.ui.creditcardform.visible) {
                activeForm = mega.ui.creditcardform;
            }
            if (activeForm) {
                return activeForm.discard(activeForm.isFormChanged)
                    .then(res => {
                        if (res) {
                            mega.ui.pm.overlay.hide();
                            activeForm.clear();
                        }
                        return res;
                    })
                    .catch((ex) => {
                        tell(ex);
                        return false;
                    });
            }
        }
        return true;
    }

    // Override for desktop
    get menuItems() {

        const _openContext = ev => {
            M.contextMenuUI(ev.originalEvent, 1);
            return false;
        };

        if (pfid) {

            this.ready |= 1;

            return [{
                text: M.getNameByHandle(M.RootID),
                icon: 'sprite-fm-mime icon-folder-24',
                href: `/${pfcol ? 'collection' : 'folder'}/${pfid}`,
                hasTree: pfcol ? false : 'cloud-drive',
                treeWrapClass: 'js-public-tree-panel',
                name: 'root-folder',
                typeClassname: 'root-folder folder-link',
                onContextmenu: _openContext
            }];
        }

        this.ready |= 2;

        const loggedInCD = [
            // Cloud drive menus
            {
                text: l[164],
                icon: 'sprite-fm-mono icon-cloud-thin-outline',
                href: '/fm',
                hasTree: 'cloud-drive',
                treeWrapClass: 'js-myfile-tree-panel',
                name: 'cloud-drive',
                typeClassname: 'drive',
                onContextmenu: _openContext,
                eventLog: 500631
            },
            {
                text: l.shared_items,
                icon: 'sprite-fm-mono icon-folder-users-thin-outline',
                href: '/fm/shares',
                hasTree: 'shared-with-me', // hidden tree for copy dialog
                treeWrapClass: 'hidden-tree',
                name: 'shares',
                typeClassname: 'drive',
                eventLog: 500641
            },
            {
                type: 'spacer',
                typeClassname: 'drive'
            },
            {
                text: l[1346],
                icon: 'sprite-fm-mono icon-arrows-up-down-circle-thin-outline',
                href: '/fm/transfers',
                name: 'transfers',
                typeClassname: 'drive',
                eventLog: 500634
            },
            {
                text: l[167],
                icon: 'sprite-fm-mono icon-trash-thin-outline',
                href: '/fm/rubbish',
                name: 'rubbish-bin',
                typeClassname: 'drive',
                onContextmenu: _openContext,
                eventLog: 500635
            },

            // Password Manager menus
            {
                text: l.rewind_label_all_default,
                icon: 'sprite-pm-mono icon-square-regular-outline',
                href: '/fm/pwm',
                name: 'pwm',
                typeClassname: 'pwm'
            },
            {
                text: l[823],
                icon: 'sprite-fm-mono icon-settings-thin-outline',
                href: '/fm/pwm/account',
                typeClassname: 'pwm',
                name: 'pwm-settings',
                eventLog: 500573
            }
        ];

        if (!mega.lite.inLiteMode) {

            loggedInCD.splice(1, 0, {
                text: l.media,
                icon: 'sprite-fm-mono icon-image-01-thin-outline',
                href: '/fm/photos',
                name: 'media',
                typeClassname: 'drive',
                eventLog: 500447
            });

            loggedInCD.splice(3, 0, {
                text: l.device_centre,
                icon: 'sprite-fm-mono icon-devices-thin-outline',
                href: '/fm/device-centre',
                treeWrapClass: 'js-device-centre-tree-panel',
                name: 'device-centre',
                typeClassname: 'drive',
                eventLog: 500613
            });

            loggedInCD.splice(5, 0, {
                text: l[20141],
                icon: 'sprite-fm-mono icon-clock-thin-outline',
                href: '/fm/recents',
                name: 'recents',
                typeClassname: 'drive',
                eventLog: 500632
            }, {
                text: l.gallery_favourites,
                icon: 'sprite-fm-mono icon-heart-thin-outline',
                href: '/fm/faves',
                name: 'faves',
                typeClassname: 'drive',
                eventLog: 500633
            });
        }

        if (!u_attr.b) {
            loggedInCD.splice(mega.lite.inLiteMode ? 1 : 4, 0, {
                text: l.obj_storage,
                icon: 'sprite-fm-mono icon-bucket-triangle-thin-outline',
                href: 'fm/s4',
                hasTree: u_attr.s4 ? 's4' : null,
                treeWrapClass: 'js-s4-tree-panel',
                name: 's4',
                typeClassname: 'drive',
                eventLog: 500636,
                rightBadge: u_attr.s4 ? null : {
                    badgeClass: 'brand-filled',
                    text: l[24648]
                }
            });
        }

        return loggedInCD;
    }

    toggleActive() {

        const active = this.domNode.componentSelector('.menu-item.active');

        if (active) {
            active.removeClass('active');
            active.icon = active.icon.replace('solid', 'outline');
        }

        const items = this.domNode.getElementsByClassName('menu-item');
        const _isMedia = () => M.isGalleryPage() && mega.gallery.sections[M.currentdirid] ||
            (M.isGalleryPage() || M.isAlbumsPage()) && mega.gallery.albums;
        const _isTreeItemOrSearch = () => M.currentrootid === M.RootID
            || M.currentrootid === M.InboxID || M.currentCustomView.type === 's4' || M.search;
        const _getSelected = () => {

            let selected;
            let type = 'drive';

            if (pfid) {
                type = 'folderlink';
                selected = M.currentdirid === M.RootID ? items['root-folder'] : true;
            }
            else if (M.currentdirid === M.RootID) {
                selected = items['cloud-drive'];
            }
            else if (M.onDeviceCenter) {
                selected = items['device-centre'];
            }
            else if (['shares', 'out-shares', 'public-links', 'file-requests'].includes(M.currentrootid)) {
                selected = items.shares;
            }
            else if (M.currentdirid === 'recents') {
                selected = items.recents;
            }
            else if (M.currentrootid === M.RubbishID) {
                selected = items['rubbish-bin'];
            }
            else if (M.isDynPage(M.currentdirid)) {
                selected = items[M.currentdirid];
            }
            else if (_isMedia()) {
                selected = items.media;
            }
            else if (M.currentrootid === 's4'
                && (!M.currentCustomView || M.currentCustomView.subType === 'container')) {
                selected = items.s4;
            }
            else if (M.currentdirid === 'transfers') {
                selected = items.transfers;
            }
            else if (M.currentCustomView.type === 'pwm') {
                selected = M.currentCustomView.nodeID === 'account' ? items['pwm-settings'] : items.pwm;
                type = 'pwm';
            }
            // Tree view item selected or search result, so just return true to show menu.
            else if (_isTreeItemOrSearch()) {
                type = 'drive';
                selected = true;
            }

            return {selected, type};
        };

        const {selected, type} = _getSelected();

        if (!this.storageBlock) {
            this.storageBlock = new MegaStorageBlock({
                parentNode: this.domNode,
                achievements: true,
            });
        }

        this.storageBlock[type === 'drive' ? 'show' : 'hide']();
        this.removeClass('drive', 'pwm', 'other', 'folderlink');
        this.activeItem = null;

        if (selected) {
            this.removeClass('hidden');
            if (selected !== true) {
                selected.classList.add('active');
                selected.component.icon = selected.component.icon.replace('outline', 'solid');
                this.activeItem = selected;
            }
            this.addClass(type);

            // Temporary solution for hide old navs
            const oldPanel = this.domNode.parentNode.querySelector('.js-fm-left-panel');
            if (oldPanel) {
                oldPanel.classList.add('hidden');
            }
        }
        else {
            this.addClass('hidden');

            // Temporary solution for hide old navs
            const oldPanel = this.domNode.parentNode.querySelector('.js-fm-left-panel');

            if (oldPanel) {
                oldPanel.classList[M.chat ? 'add' : 'remove']('hidden');
            }
        }
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

