class MegaTopMenu extends MegaMobileTopMenu {

    constructor(options) {

        super(options);

        this.megaLink.interactableType = 'normal';
        this.megaLink.icon = 'sprite-fm-uni icon-mega-logo';

        // @todo: Wrap menu items in a div to fix stretching bug when scrolling horizontally
        this.menuNode.Ps = new PerfectScrollbar(this.menuNode);
        this.addBroadcasterListener('pagechange', () => this.menuNode.Ps.update());
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

        const _resizeHandler = SoonFc(90, this.menuNode.Ps.update);
        window.addEventListener('resize', _resizeHandler);
        this.on('destroy', () => window.removeEventListener('resize', _resizeHandler));

        this.domNode.prepend(mCreateElement('div', {'class': 'left-pane-drag-handle'}));

        M.onFileManagerReady(() => {
            const leftIcon = 'sprite-fm-mono icon-chevrons-left-thin-outline';
            const rightIcon = 'sprite-fm-mono icon-chevrons-right-thin-outline';
            const uiShrink = (didShrink) => {
                fmconfig.smallLhp = didShrink | 0;
                if (didShrink) {
                    document.body.classList.add('small-lhp');
                    this.smallPaneButton.icon = rightIcon;
                    this.smallPaneButton.dataset.simpletip = l.expand_sidebar;
                }
                else {
                    document.body.classList.remove('small-lhp');
                    this.smallPaneButton.icon = leftIcon;
                    this.smallPaneButton.dataset.simpletip = l.collapse_sidebar;
                }
            };
            this.leftPaneResizable = $.leftPaneResizable = new FMResizablePane($(this.domNode), {
                'direction': 'e',
                // ignoring mega.flags.ab_ads (260) now due to collapsing behaviour
                'minWidth': 72,
                'maxWidth': 400,
                'persistanceKey': 'leftPaneWidth',
                'handle': '.left-pane-drag-handle',
                shrinkBelow: 200,
                onShrinkBelow: uiShrink
            });
            const { persistanceKey, minWidth } = this.leftPaneResizable.options;
            this.smallPaneButton = new MegaButton({
                parentNode: this.domNode.querySelector('.top-nav'),
                icon: leftIcon,
                type: 'icon',
                componentClassname: 'small-menu-btn',
                simpletip: l.collapse_sidebar,
                simpletipClass: 'small-sidebar-tip-vis',
                simpletipPos: 'right',
                onClick: () => {
                    let width = fmconfig[persistanceKey] || 286;
                    if (fmconfig.smallLhp) {
                        eventlog(500955);
                    }
                    else {
                        eventlog(500954);
                        width = minWidth;
                    }
                    uiShrink(!fmconfig.smallLhp);
                    this.leftPaneResizable.setWidth(width);
                },
            });
            if (fmconfig.smallLhp) {
                uiShrink(true);
                this.leftPaneResizable.setWidth(minWidth);
                this.leftPaneResizable.element[0].classList.add('small-resize-pane');
            }
        });

        this.addBroadcasterListener('updFileManagerUI', () => {
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
                simpletip: M.getNameByHandle(M.RootID),
                simpletipClass: 'small-sidebar-tip',
                simpletipPos: 'right',
                simpletipWrapper: 'body',
                simpletipOffset: '-16',
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
                simpletip: l[164],
                simpletipClass: 'small-sidebar-tip',
                simpletipPos: 'right',
                simpletipWrapper: 'body',
                simpletipOffset: '-16',
                onContextmenu: _openContext,
                eventLog: 500631
            },
            {
                text: l.shared_items,
                icon: 'sprite-fm-mono icon-folder-users-thin-outline',
                hasTree: 'shared-with-me', // hidden tree for copy dialog
                treeWrapClass: 'hidden-tree',
                name: 'shares',
                typeClassname: 'drive',
                eventLog: 500641,
                simpletip: l.shared_items,
                simpletipClass: 'small-sidebar-tip',
                simpletipPos: 'right',
                simpletipWrapper: 'body',
                simpletipOffset: '-16',
                binding: () => {
                    console.assert(self.fminitialized);
                    return M.openFolder(localStorage.sihp || 'shares');
                }
            },
            {
                text: l.device_centre,
                icon: 'sprite-fm-mono icon-devices-thin-outline',
                href: '/fm/device-centre',
                treeWrapClass: 'js-device-centre-tree-panel',
                name: 'device-centre',
                typeClassname: 'drive',
                simpletip: l.device_centre,
                simpletipClass: 'small-sidebar-tip',
                simpletipPos: 'right',
                simpletipWrapper: 'body',
                simpletipOffset: '-16',
                eventLog: 500613
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
                simpletip: l[1346],
                simpletipClass: 'small-sidebar-tip',
                simpletipPos: 'right',
                simpletipWrapper: 'body',
                simpletipOffset: '-16',
                eventLog: 500634
            },
            {
                text: l[167],
                icon: 'sprite-fm-mono icon-trash-thin-outline',
                href: '/fm/rubbish',
                name: 'rubbish-bin',
                typeClassname: 'drive',
                simpletip: l[167],
                simpletipClass: 'small-sidebar-tip',
                simpletipPos: 'right',
                simpletipWrapper: 'body',
                simpletipOffset: '-16',
                onContextmenu: _openContext,
                eventLog: 500635
            },

            // Password Manager menus
            {
                text: l.rewind_label_all_default,
                icon: 'sprite-pm-mono icon-square-regular-outline',
                href: '/fm/pwm',
                name: 'pwm',
                typeClassname: 'pwm',
                simpletip: l.rewind_label_all_default,
                simpletipClass: 'small-sidebar-tip',
                simpletipPos: 'right',
                simpletipWrapper: 'body',
                simpletipOffset: '-16',
            },
            {
                text: l[823],
                icon: 'sprite-fm-mono icon-settings-thin-outline',
                href: '/fm/pwm/account',
                typeClassname: 'pwm',
                name: 'pwm-settings',
                simpletip: l[823],
                simpletipClass: 'small-sidebar-tip',
                simpletipPos: 'right',
                simpletipWrapper: 'body',
                simpletipOffset: '-16',
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
                simpletip: l.media,
                simpletipClass: 'small-sidebar-tip',
                simpletipPos: 'right',
                simpletipWrapper: 'body',
                simpletipOffset: '-16',
                eventLog: 500447
            });

            loggedInCD.splice(5, 0, {
                text: l[20141],
                icon: 'sprite-fm-mono icon-clock-thin-outline',
                href: '/fm/recents',
                name: 'recents',
                typeClassname: 'drive',
                simpletip: l[20141],
                simpletipClass: 'small-sidebar-tip',
                simpletipPos: 'right',
                simpletipWrapper: 'body',
                simpletipOffset: '-16',
                eventLog: 500632
            }, {
                text: l.gallery_favourites,
                icon: 'sprite-fm-mono icon-heart-thin-outline',
                href: '/fm/faves',
                name: 'faves',
                typeClassname: 'drive',
                simpletip: l.gallery_favourites,
                simpletipClass: 'small-sidebar-tip',
                simpletipPos: 'right',
                simpletipWrapper: 'body',
                simpletipOffset: '-16',
                eventLog: 500633
            });
        }

        // No S4 for low tier plans
        if ([11, 12, 13].includes(u_attr.p)) {
            return loggedInCD;
        }

        loggedInCD.splice(mega.lite.inLiteMode ? 3 : 4, 0, {
            autoExpand: true,
            text: l.obj_storage,
            icon: 'sprite-fm-mono icon-bucket-triangle-thin-outline',
            hasTree: u_attr.s4 ? 's4' : null,
            treeWrapClass: 'js-s4-tree-panel',
            name: 's4',
            typeClassname: 'drive',
            simpletip: l.obj_storage,
            simpletipClass: 'small-sidebar-tip',
            simpletipPos: 'right',
            simpletipWrapper: 'body',
            simpletipOffset: '-16',
            eventLog: 500636,
            rightBadge: u_attr.b && !u_attr.s4 ? {
                badgeClass: 'brand-filled',
                text: l[24648]
            } : null,
            binding: () => s4.main.render()
        });

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
            if (selected === true) {
                const currNode = M.currentCustomView ? M.currentCustomView.nodeID : M.currentdirid;

                this.activeItem = document.getElementById(`treea_${currNode}`);
            }
            else {
                // Auto expand when rendering items or selected item is not active
                if (!(active && active.domNode === selected) && selected.dataset.expandEvt) {
                    selected.component.trigger(selected.dataset.expandEvt);
                }
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

