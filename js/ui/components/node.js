class MegaNodeComponent extends MegaComponent {

    constructor(options) {

        options.componentClassname = `mega-node ${options.componentClassname || ''}`;
        options.nodeType = 'a';
        const mobileClass = is_mobile ? 'mobile' : '';

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
            this.inv411d = true;
        }

        this.domNode.id = this.domNode.dataset.handle = this.node.h;
        this.linked = M.getNodeShare(this.node.h);

        let subNode;

        if (!options.noSelectionCheck) {
            subNode = document.createElement('i');
            subNode.className = 'sprite-fm-mono icon-check selected';

            this.domNode.appendChild(subNode);
        }

        subNode = document.createElement('div');
        subNode.className = `${mobileClass} fm-item-img`.trim();
        this.iconNode = document.createElement('i');
        this.iconNode.className = this.icon;

        subNode.appendChild(this.iconNode);

        if (this.node.fa) {
            this.thumbNode = document.createElement('img');
            subNode.appendChild(this.thumbNode);
            this.thumbNode.classList.add('theme-dark-forced');

            if (this.node.fa.includes(':8*')) {
                this.media = MediaAttribute(this.node).data;
                if (this.media) {
                    this.media.codecs = MediaAttribute.getCodecStrings(this.node);
                }
            }
        }

        this.domNode.appendChild(subNode);

        subNode = document.createElement('div');
        subNode.className = `${mobileClass} fm-item-name`.trim();
        subNode.textContent = this.name;

        this.domNode.appendChild(subNode);

        const props = document.createElement('div');
        props.className = `${mobileClass} props`.trim();

        this.domNode.appendChild(props);

        let propsBottomLeft;
        let propsBottomRight;

        if (!is_mobile) {

            if (!options.noLeftProps) {
                propsBottomLeft = document.createElement('div');
                propsBottomLeft.className = `${mobileClass} props-bottom-left`.trim();

                this.domNode.appendChild(propsBottomLeft);
            }

            if (!options.noRightProps) {
                propsBottomRight = document.createElement('div');
                propsBottomRight.className = `${mobileClass} props-bottom-right`.trim();

                this.domNode.appendChild(propsBottomRight);
            }
        }

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
            numDetails.className = `${mobileClass} num-files`.trim();
            numDetails.textContent = this.subNodeCount;
            props.appendChild(numDetails);
        }
        else if (this.node.t === 0) {
            numDetails = document.createElement('span');
            numDetails.className = `${mobileClass} file-size`.trim();
            numDetails.textContent = `${this.size}, ${this.time}`;
            props.appendChild(numDetails);
        }

        // label
        subNode = document.createElement('i');
        subNode.className = `${mobileClass} colour-label ${this.lbl}`.trim();
        (propsBottomLeft || props).appendChild(subNode);

        // show correct link icon
        MegaNodeComponent.updateLinkIcon(this);

        // Duration
        if (this.media && this.media.playtime) {
            this.updatePlayTime();
        }

        // fav - show fav only if the file/folder is not taken down
        if (!this.takedown && M.currentrootid !== 'shares') {

            subNode = document.createElement('i');
            subNode.className = `${mobileClass} icon-favourite sprite-fm-mono icon-heart-thin-solid icon`.trim();
            props.appendChild(subNode);

            // Making icon interactable
            if (!is_mobile) {
                subNode.classList.add('simpletip');
                subNode.dataset.simpletip = l[5872];
                subNode.dataset.simpletipposition = 'top';

                subNode.addEventListener('click', e => {
                    $.hideContextMenu();
                    if (M.isInvalidUserStatus()) {
                        return;
                    }

                    // Handling favourites is allowed for full permissions shares only
                    if (M.getNodeRights(this.handle) > 1) {
                        e.stopPropagation();
                        M.favourite(this.handle, 0);
                    }
                });
            }

            if (this.fav) {
                this.domNode.classList.add('favourited');
            }

            if (this.sen) {
                this.domNode.classList.add('is-sensitive');
            }
        }

        // Versioned
        subNode = document.createElement('i');
        subNode.className = `${mobileClass} icon-version sprite-fm-mono icon-clock-rotate icon`.trim();
        props.appendChild(subNode);

        if (!is_mobile) {

            subNode.classList.add('simpletip');
            subNode.dataset.simpletip = l[16474];
            subNode.dataset.simpletipposition = 'top';

            subNode.addEventListener('click', () => {
                selectionManager.clear_selection();
                selectionManager.add_to_selection(this.handle);
                fileversioning.fileVersioningDialog();
            });
        }

        // link
        subNode = document.createElement('i');
        subNode.className = `${mobileClass} icon-link sprite-fm-mono icon-link-thin-outline icon`.trim();
        props.appendChild(subNode);

        if (!is_mobile) {

            subNode.classList.add('simpletip');
            subNode.dataset.simpletip = l[6909];
            subNode.dataset.simpletipposition = 'top';

            subNode.addEventListener('click', () => {
                selectionManager.clear_selection();
                selectionManager.add_to_selection(this.handle);
                M.getLinkAction();
            });
        }

        this.addClass(mobileClass, 'fm-item', ...classNames);

        this.attr('title', this.title);

        if (!options.noContextBtn) {
            const btnNode = new MegaButton({
                type: 'icon',
                parentNode: propsBottomRight || this.domNode,
                icon: `sprite-fm-mono icon-more-${is_mobile ? 'horizontal' : 'vertical'}-thin-outline`,
                iconSize: 24,
                componentClassname: 'context-btn open-context-menu text-icon'
            });

            btnNode.on('click', ev => {
                if (is_mobile) {
                    mega.ui.contextMenu.show(this.handle);
                }
                else {
                    selectionManager.clear_selection();
                    selectionManager.add_to_selection(this.handle);
                    $.gridLastSelected = this.domNode;

                    ev.currentTarget = this.domNode;
                    ev.delegateTarget = btnNode.domNode;

                    M.contextMenuUI(ev, 1);
                }

                return false;
            });
        }

        const _open = () => {

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
            else if (is_mobile) {
                if (!this.contact && this.node.t === 1) {
                    const target = !options.ignoreCustomRoute && M.currentCustomView ?
                        `${M.currentrootid}/${this.handle}` : this.handle;
                    M.openFolder(target);
                }
                else {
                    _open();
                }

                return false;
            }
        });

        // Double click is currently handling on filemanager.js
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

    updatePlayTime(fa) {

        if (fa) {
            const {width, height, fps, playtime, shortformat} = fa;
            this.media = {width, height, fps, playtime, shortformat};
            this.media.codecs = MediaAttribute.getCodecStrings(fa);
        }

        const playtimeNode = document.createElement('span');
        playtimeNode.className = `${is_mobile ? 'mobile' : ''} duration`.trim();
        playtimeNode.textContent = secondsToTimeShort(this.media.playtime);
        this.domNode.querySelector('.props').appendChild(playtimeNode);

        this.attr('title', this.title);
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
        const iconSize = M.onIconView ? 90 : 24;
        const iconSpriteClass = `item-type-icon${M.onIconView ? '-90' : ''}`;

        return `${iconSpriteClass} icon-${fileIcon(this.node)}-${iconSize}`;
    }

    get title() {
        const title = [];

        if (!this.inv411d && (M.onIconView || String(this.name).length > 78 || this.playtime !== undefined)) {

            if (this.media) {

                if (this.media.width) {

                    title.push(this.media.width + 'x' + this.media.height + ' @' + this.media.fps + 'fps');
                }
                if (this.media.codecs) {
                    title.push(this.media.codecs);
                }
            }
            if (this.size) {
                title.push(this.size);
            }
            if (this.name) {
                title.push(this.name);
            }
        }

        return title.join(' ');
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

        if (classname === 'taken-down') {
            component.inv411d = true;
            component.iconNode.className = 'sprite-fm-mime icon-takedown-24';
        }
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
            this.removeClass('colour-label', ...Object.keys(M.megaRender.labelsColors));

            const lbl = this.lbl;
            const lblElm = this.domNode.querySelector('.colour-label');

            if (lblElm) {
                lblElm.classList.remove(...Object.keys(M.megaRender.labelsColors));

                if (lbl) {
                    if (!is_mobile) {
                        this.addClass('colour-label', lbl);
                    }
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
