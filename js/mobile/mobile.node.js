class MegaMobileNode extends MegaMobileComponent {

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
            value: M.getNodeByHandle(options.nodeHandle),
            writable: false
        });

        if (!this.node) {

            console.error(`No such node exist - ${this.handle}`);

            return;
        }

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
        subNode.className = 'mobile icon-takedown sprite-mobile-fm-mono icon-alert-triangle-thin-solid';
        props.appendChild(subNode);

        // link
        subNode = document.createElement('i');
        subNode.className = 'mobile icon-link sprite-mobile-fm-mono icon-link-thin-outline icon';
        props.appendChild(subNode);

        // show correct link icon
        MegaMobileNode.updateLinkIcon(this);

        // fav - show fav only if the file/folder is not taken down
        if (!this.takedown && M.currentrootid !== 'shares') {
            subNode = document.createElement('i');

            subNode.className = 'mobile icon-favourite sprite-mobile-fm-mono icon-heart-thin-solid icon';
            props.appendChild(subNode);

            if (this.fav) {
                this.domNode.classList.add('favourited');
            }
        }

        this.domNode.classList.add('mobile', 'fm-item', ...classNames);

        const btnNode = new MegaMobileButton({
            type: 'icon',
            parentNode: this.domNode,
            icon: 'sprite-mobile-fm-mono icon-more-horizontal-thin-outline',
            iconSize: 24,
            componentClassname: 'context-btn open-context-menu text-icon'
        });

        btnNode.on('tap', () => {
            mega.ui.contextMenu.show(this.handle);

            return false;
        });

        this.on('tap', () => {

            if (typeof options.onTap === 'function') {
                options.onTap(this.node);
            }
            else if (this.node.t === 1) {
                const target = M.currentCustomView ? `${M.currentrootid}/${this.handle}` : this.handle;
                M.openFolder(target);
            }
            else {
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

                // If this is an image, load the preview slideshow
                if (isVideo || is_image2(this.node)) {
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
        return MegaMobileNode.mFileIcon(this.node);
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

    get previewable() {
        return is_video(this.node) || is_image2(this.node);
    }

    static updateLinkIcon(component) {

        const {linked, domNode} = component;
        const classname = linked ? linked.down ? 'taken-down' : 'linked' : '';

        if (classname) {
            domNode.classList.add(classname);
        }
    }

    static mFileIcon(node) {
        let icon = 'generic';

        if (!this.takedown && !this.undecryptable) {
            const media = is_video(node);
            const fileExt = ext[fileext(node.name)];

            if (node.t) {
                return MegaMobileNode.mFolderIcon(node);
            }
            else if (fileExt && fileExt[0] !== 'mega') {
                icon = fileExt[0] === 'threed' ? '3d' : fileExt[0];
            }
            else if (media > 0) {
                icon = media > 1 ? 'audio' : 'video';
            }
        }

        return `sprite-mobile-fm-uni mime-${icon}-solid`;
    }

    static mFolderIcon(node) {
        let icon = 'folder';

        // Outgoing share
        if (node.t & M.IS_SHARED || M.ps[node.h] || M.getNodeShareUsers(node, 'EXP').length) {
            icon = 'folder-outgoing';
        }
        // Incoming share
        else if (node.su) {
            icon = 'folder-incoming';
        }
        // File request folder
        else if (
            mega.fileRequestCommon.storage.cache.puHandle[node.h]
            && mega.fileRequestCommon.storage.cache.puHandle[node.h].s !== 1
            && mega.fileRequestCommon.storage.cache.puHandle[node.h].p
        ) {
            icon = 'folder-request';
        }
        // Camera uploads
        else if (node.h === M.CameraId) {
            icon = 'folder-camera-uploads';
        }

        return `sprite-mobile-fm-uni mime-${icon}-solid`;
    }

    update(type) {
        const _shouldUpdate = key => !type || type === key;

        if (_shouldUpdate('name')) {
            this.domNode.querySelector('.fm-item-name').textContent = this.name;
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
            MegaMobileNode.updateLinkIcon(this);
        }

        if (_shouldUpdate('versioned')) {
            this.domNode.classList[this.versioned ? 'add' : 'remove']('versioned');
        }

        if (_shouldUpdate('subNodeCount') && this.domNode.querySelector('.mobile.num-files')) {
            this.domNode.querySelector('.mobile.num-files').textContent = this.subNodeCount;
        }
    }
}

MegaMobileNode.getNodeComponentByHandle = h => {

    'use strict';

    return M.megaRender && M.megaRender.nodeMap[h] && M.megaRender.nodeMap[h].component;
};
