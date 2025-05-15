class MegaNodeComponent extends MegaComponent {

    constructor(options) {

        options.componentClassname = `mega-node ${options.componentClassname || ''}`;
        options.nodeType = 'a';

        super(options);

        if (!options.nodeHandle) {

            console.error('Node handle not given');

            return;
        }

        if (!this.domNode) {
            return;
        }

        const classNames = [];

        Object.defineProperty(this, 'handle', {
            value: options.nodeHandle,
            writable: false
        });

        Object.defineProperty(this, 'node', {
            value: options.nodeHandle.length === 8 ?
                M.getNodeByHandle(options.nodeHandle) :
                M.getUserByHandle(options.nodeHandle),
            writable: false
        });

        if (!this.node) {

            console.error(`No such node exist - ${this.handle}`);

            return;
        }

        // Set lazy for previewable parameter
        this.resetPreviewable();

        classNames.push(this.node.t === 1 ? 'folder' : 'file');

        if (this.versioned) {
            classNames.push('versioned');
        }

        if (missingkeys[this.handle]) {

            this.undecryptable = true;
            classNames.push('undecryptable');
        }

        this.domNode.id = this.domNode.dataset.handle = this.node.h;
        this.linked = M.getNodeShare(this.node.h);

        let subNode = document.createElement('div');
        subNode.className = 'mobile fm-item-img';
        this.iconNode = document.createElement('i');
        this.iconNode.className = this.icon;

        subNode.appendChild(this.iconNode);

        if (this.node.fa) {
            this.thumbNode = document.createElement('img');
            subNode.appendChild(this.thumbNode);
            this.thumbNode.classList.add('theme-dark-forced');
        }

        this.domNode.appendChild(subNode);

        subNode = document.createElement('div');
        subNode.className = 'mobile fm-item-name';
        subNode.textContent = this.name;

        this.domNode.appendChild(subNode);

        const props = document.createElement('div');
        props.className = 'mobile props';

        this.domNode.appendChild(props);

        let numDetails = document.createElement('span');

        if (M.currentdirid === 'out-shares') {
            numDetails.className = 'shared-owner';

            // Creating the public link for an item doesn't share it with a specific person,
            // so exclude that key from the "shared with" count
            const sharedWith = M.getNodeShareUsers(this.handle, 'EXP');

            numDetails.textContent = mega.icu.format(l.shared_with, sharedWith.length);
            props.appendChild(numDetails);
        }
        else if (this.node.t === 1) {
            numDetails.className = 'mobile num-files';
            numDetails.textContent = this.subNodeCount;
            props.appendChild(numDetails);
        }
        else if (this.node.t === 0) {
            numDetails = document.createElement('span');
            numDetails.className = 'mobile file-size';
            numDetails.textContent = `${this.size}, ${this.time}`;
            props.appendChild(numDetails);
        }

        // label
        subNode = document.createElement('i');
        subNode.className = `mobile colour-label ${this.lbl}`;
        props.appendChild(subNode);

        // takedown-link
        subNode = document.createElement('i');
        subNode.className = 'mobile icon-takedown sprite-fm-mono icon-alert-triangle-thin-solid';
        props.appendChild(subNode);

        // link
        subNode = document.createElement('i');
        subNode.className = 'mobile icon-link sprite-fm-mono icon-link-thin-outline icon';
        props.appendChild(subNode);

        // show correct link icon
        MegaNodeComponent.updateLinkIcon(this);

        // fav - show fav only if the file/folder is not taken down
        if (!this.takedown && M.currentrootid !== 'shares') {
            subNode = document.createElement('i');

            subNode.className = 'mobile icon-favourite sprite-fm-mono icon-heart-thin-solid icon';
            props.appendChild(subNode);

            if (this.fav) {
                this.domNode.classList.add('favourited');
            }

            if (this.sen) {
                this.domNode.classList.add('is-sensitive');
            }
        }

        this.domNode.classList.add('mobile', 'fm-item', ...classNames);

        const btnNode = new MegaButton({
            type: 'icon',
            parentNode: this.domNode,
            icon: 'sprite-fm-mono icon-more-horizontal-thin-outline',
            iconSize: 24,
            componentClassname: 'context-btn open-context-menu text-icon'
        });

        if (is_mobile) {
            btnNode.on('click', () => {
                mega.ui.contextMenu.show(this.handle);

                return false;
            });
        }
        else {
            btnNode.hide();
        }

        this.on('click', () => {
            if (!is_mobile) {
                $.hideContextMenu();
            }

            if (typeof options.onTap === 'function') {
                options.onTap(this.node);
            }
            else if (typeof options.onClick === 'function') {
                options.onClick(this.node);
            }
            else if (!this.contact && this.node.t === 1) {
                const target = !options.ignoreCustomRoute && M.currentCustomView ?
                    `${M.currentrootid}/${this.handle}` : this.handle;
                M.openFolder(target);
            }
            else {
                // @todo full desktop support of previews, context menu, etc...
                if (!is_mobile) {
                    M.isInvalidUserStatus();
                    return false;
                }
                if (!validateUserAction()) {
                    return false;
                }

                // Get the node handle and node
                var isVideo = is_video(this.node);

                if (!this.node || this.linked.down) {
                    if (this.node) {
                        mega.ui.contextMenu.show(this.handle);
                    }
                    return false;
                }

                // If this is an previewable but not text, load the preview slideshow
                if (this.previewable && this.previewable !== 'text') {
                    if (isVideo) {
                        $.autoplay = this.handle;
                    }
                    slideshow(this.handle);
                }
                else {
                    // Non Pre-viewable file
                    mega.ui.viewerOverlay.show(this.handle);
                }
            }

            return false;
        });
    }

    // Previewable states cannot really change normally, hence using lazy
    resetPreviewable() {

        lazy(this, 'previewable', () => {

            if (is_video(this.node)) {
                return 'video';
            }
            else if (is_image2(this.node)) {
                return 'image';
            }
            else if (is_text(this.node)) {
                return 'text';
            }

            return false;
        });
    }

    get size() {
        return bytesToSize(this.node.t === 1 ? this.node.tb || 0 : this.node.s);
    }

    get subNodeCount() {
        return fm_contains(this.node.tf, this.node.td);
    }

    get shared() {
        return this.node.shares;
    }

    get name() {
        if (this.undecryptable) {
            return this.node.t ? l[8686] : l[8687];
        }
        return this.node.name;
    }

    get icon() {
        const iconSize = M.viewmode ? 90 : 24;
        const iconSpriteClass = `item-type-icon${M.viewmode ? '-90' : ''}`;

        return `${iconSpriteClass} icon-${fileIcon(this.node)}-${iconSize}`;
    }

    get fileType() {
        return this.takedown || this.undecryptable ? l[7381] : this.node.t === 1 ? l[1049] : filetype(this.node, 0, 1);
    }

    get lbl() {
        return this.node.lbl && !folderlink && M.getLabelClassFromId(this.node.lbl) || '';
    }

    get fav() {
        return this.node.fav && !folderlink;
    }

    get sen() {
        return !folderlink && mega.sensitives.shouldBlurNode(this.node);
    }

    get time() {
        return M.currentCustomView.type === 'public-links' && this.linked ?
            time2date(this.linked.ts) : time2date(this.node.mtime || this.node.ts);
    }

    get versioned() {
        return !this.node.t && this.node.tvf;
    }

    get takedown() {
        return this.linked && this.linked.down;
    }

    get rights() {
        return M.getNodeRights(this.handle);
    }

    get contact() {
        return this.handle.length === 11;
    }

    static updateLinkIcon(component) {

        const {linked, domNode} = component;
        const classname = linked ? linked.down ? 'taken-down' : 'linked' : '';

        if (classname) {
            domNode.classList.add(classname);
        }
    }

    static mAvatarNode(userHandle, domNode, options) {
        if (!userHandle || !(userHandle in M.u) || !domNode) {
            return;
        }

        options = options || {};
        useravatar.loadAvatar(userHandle).always(() => {
            const avatarMeta = generateAvatarMeta(userHandle);

            const shortNameEl = mCreateElement('span');
            shortNameEl.textContent = avatarMeta.shortName;

            const avatar = avatarMeta.avatarUrl
                ? mCreateElement('img', {src: avatarMeta.avatarUrl})
                : mCreateElement('div', {class: `color${avatarMeta.color}`},[shortNameEl]);

            domNode.textContent = '';
            domNode.appendChild(avatar);
            if (options.presence) {
                const presence = document.createElement('i');
                const p = M.u[userHandle].presence;
                /**
                 * Presence values without requiring megaChat/presence to be loaded.
                 * @see UserPresence.PRESENCE
                 * */
                if (p === 1) {
                    presence.className = 'activity-status online';
                }
                else if (p === 2) {
                    presence.className = 'activity-status away';
                }
                else if (p === 3) {
                    presence.className = 'activity-status online';
                }
                else if (p === 4) {
                    presence.className = 'activity-status busy';
                }
                else {
                    presence.className = 'activity-status black';
                }
                domNode.appendChild(presence);
            }

            if (options.simpletip && avatarMeta.fullName) {
                domNode.dataset.simpletip = avatarMeta.fullName;
                domNode.classList.add('simpletip');
            }
        });
    }

    update(type) {
        const _shouldUpdate = key => !type || type === key;

        if (_shouldUpdate('name')) {
            this.domNode.querySelector('.fm-item-name').textContent = this.name;

            // Node name change may update previewable state
            this.resetPreviewable();
        }

        if (_shouldUpdate('icon')) {
            const iconNode = this.domNode.querySelector('.fm-item-img i');
            const imgNode = iconNode.parentNode;

            if (iconNode.className !== this.icon) {

                // Rendering issue fix. File/folder blocks were not re-rendered when changing svg icon classname
                iconNode.remove();
                mCreateElement('i', {'class': this.icon}, imgNode);
            }
        }

        if (_shouldUpdate('fav')) {
            this.domNode.classList[this.fav ? 'add' : 'remove']('favourited');
        }

        if (_shouldUpdate('sen')) {
            this.domNode.classList[this.sen ? 'add' : 'remove']('is-sensitive');
        }

        if (_shouldUpdate('lbl')) {
            this.domNode.classList.remove('colour-label', ...Object.keys(M.megaRender.labelsColors));

            const lbl = this.lbl;
            const lblElm = this.domNode.querySelector('.colour-label');

            if (lblElm) {
                lblElm.classList.remove(...Object.keys(M.megaRender.labelsColors));

                if (lbl) {
                    lblElm.classList.add(lbl);
                }
            }
        }

        if (_shouldUpdate('time') && this.node.t === 0) {
            this.domNode.querySelector('.date').textContent = this.time;
        }

        if (_shouldUpdate('linked')) {
            this.linked = M.getNodeShare(this.handle);

            this.domNode.classList.remove('taken-down', 'linked');
            MegaNodeComponent.updateLinkIcon(this);
        }

        if (_shouldUpdate('versioned')) {
            this.domNode.classList[this.versioned ? 'add' : 'remove']('versioned');
        }

        if (_shouldUpdate('subNodeCount') && this.domNode.querySelector('.mobile.num-files')) {
            this.domNode.querySelector('.mobile.num-files').textContent = this.subNodeCount;
        }
    }
}

MegaNodeComponent.getNodeComponentByHandle = h => {

    'use strict';

    return M.megaRender && M.megaRender.nodeMap[h] && M.megaRender.nodeMap[h].component;
};
