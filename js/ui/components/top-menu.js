class MegaTopMenu extends MegaMobileTopMenu {

    constructor(options) {

        super(options);

        this.megaLink.interactableType = 'normal';
        this.megaLink.icon = 'sprite-fm-uni icon-mega-logo';

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

    }

    renderMenuItems() {

        this.ready = this.ready || 0;

        if (pfid && !(this.ready & 1) || !pfid && !(this.ready & 2)) {
            super.renderMenuItems();
        }
    }

    closeActiveOverlays() {

        if (mega.ui.pm && (mega.pm.pwmFeature || u_attr.b || u_attr.pf) && mega.ui.pm.overlay.visible) {
            mega.ui.passform.discard(mega.ui.passform.isFormChanged).then(res => {
                if (res) {
                    mega.ui.pm.overlay.hide();
                    mega.ui.passform.clear();
                }
            });
        }
    }

    // Override for desktop
    get menuItems() {

        if (pfid) {

            this.ready |= 1;

            return [{
                text: M.getNameByHandle(M.RootID),
                icon: 'sprite-fm-mime icon-folder-24',
                href: `/${pfcol ? 'collection' : 'folder'}/${pfid}`,
                hasTree: pfcol ? false : 'cloud-drive',
                treeWrapClass: 'js-public-tree-panel',
                name: 'root-folder',
                typeClassname: 'root-folder'
            }];
        }

        this.ready |= 2;

        const _openContext = ev => {
            M.contextMenuUI(ev.originalEvent, 1);
            return false;
        };

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
                onContextmenu: _openContext
            },
            {
                text: l.shared_items,
                icon: 'sprite-fm-mono icon-folder-users-thin-outline',
                href: '/fm/shares',
                hasTree: 'shared-with-me', // hidden tree for copy dialog
                treeWrapClass: 'hidden-tree',
                name: 'shares',
                typeClassname: 'drive'
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
                typeClassname: 'drive'
            },
            {
                text: l[167],
                icon: 'sprite-fm-mono icon-trash-thin-outline',
                href: '/fm/rubbish',
                name: 'rubbish-bin',
                typeClassname: 'drive',
                onContextmenu: _openContext
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
                icon: 'sprite-mobile-fm-mono icon-settings-thin-outline',
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
                typeClassname: 'drive'
            });

            loggedInCD.splice(3, 0, {
                text: l.device_centre,
                icon: 'sprite-fm-mono icon-devices-thin-outline',
                href: '/fm/devices',
                name: 'devices',
                typeClassname: 'drive'
            });

            loggedInCD.splice(5, 0, {
                text: l[20141],
                icon: 'sprite-fm-mono icon-clock-thin-outline',
                href: '/fm/recents',
                name: 'recents',
                typeClassname: 'drive'
            }, {
                text: l.gallery_favourites,
                icon: 'sprite-fm-mono icon-heart-thin-outline',
                href: '/fm/faves',
                name: 'faves',
                typeClassname: 'drive'
            });
        }

        if (u_attr && u_attr.s4) {

            // push below object to loggedInCD 2nd place
            loggedInCD.splice(1, 0, {
                text: l.obj_storage,
                icon: 'sprite-fm-mono icon-bucket-triangle-thin-outline',
                binding() {
                    M.require('s4').then(() => {
                        if (!(M.dyh && M.dyh('is-section', 'container') || s4.utils.getContainersList().length > 1)){
                            s4.ui.renderRoot();
                        }
                    });
                },
                hasTree: 's4',
                treeWrapClass: 'js-s4-tree-panel',
                name: 's4',
                typeClassname: 'drive'
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
        const _isTreeItemOrSearch = () => M.currentrootid === M.RootID ||
            M.currentCustomView.type === 's4' || M.search;
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
            else if (M.currentdirid === 'devices' || M.currentrootid === M.InboxID) {
                selected = items.devices;
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
            else if (M.currentrootid === 's4' && M.currentCustomView.subType === 'container') {
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
                parentNode: this.domNode
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

