class MobileMegaRender {

    constructor(viewmode = M.viewmode) {

        this.section = 'cloud-drive';
        this.location = 'default';

        switch (M.currentdirid) {
            case 'shares':
            case 'out-shares':
                this.section = M.currentdirid;
                break;
            case 'public-links':
                this.location = 'mixed-content';
                this.section = M.currentdirid;
                break;
            case M.RubbishID:
                this.location = 'trashcan';
                break;
        }

        this.numInsertedDOMNodes = 0;
        this.nodeMap = Object.create(null);
        this.container = document.getElementById('file-manager-list-container');

        if (this.container) {
            // grid view is not available for shared items page
            this.container.classList[M.currentdirid === 'shares' || M.currentdirid === 'out-shares'
                || M.currentdirid === 'public-links' || viewmode !== 1 ? 'remove' : 'add']('grid-view');
        }

        if (d) {
            var options = {
                levelColors: {
                    'ERROR': '#DE1F35',
                    'DEBUG': '#837ACC',
                    'WARN':  '#DEBB1F',
                    'INFO':  '#1F85CE',
                    'LOG':   '#9B7BA6'
                }
            };

            Object.defineProperty(this, 'logger', {value: new MegaLogger(this.section, options, this.logger)});
        }

        this.labelsColors = {
            'red': l[16223],
            'orange': l[16224],
            'yellow': l[16225],
            'green': l[16226],
            'blue': l[16227],
            'purple': l[16228],
            'grey': l[16229]
        };

        this.touching = false;
    }

    cleanupLayout() {

        this.removeScrollEvent();
        this.container.innerText = '';
        window.removeEventListener('resize', this);
    }

    renderLayout(aUpdate, aNodeList) {

        if (this.logger) {
            console.time('MegaRender.renderLayout');
        }

        if (!aUpdate || !this.megaList) {

            const megaListOptions = this.getMListOptions();

            Object.defineProperty(this, 'megaList', {
                enumerable: true,
                configurable: true,
                value: new MegaList(this.container, megaListOptions)
            });

            this.container.style.paddingBottom = `${megaListOptions.bottomSpacing | 0}px`;

            this.initScrollEvent();
        }

        const newNodes = [];
        let curNodeList;

        if (aUpdate && aNodeList.length && Object(newnodes).length) {

            var objMap = newnodes.map(n => n.h).reduce((obj, value) => {
                obj[value] = 1;
                return obj;
            }, {});

            for (var idx = aNodeList.length; idx--;) {
                if (objMap[aNodeList[idx].h]) {
                    newNodes[idx] = aNodeList[idx];
                    delete this.nodeMap[aNodeList[idx].h];
                }
            }

            if (newNodes.length) {
                curNodeList = aNodeList;
            }
        }

        if (!aUpdate) {
            this.container.classList.add('megaListContainer');

            if (this.container.classList.contains("hidden")) {
                this.container.classList.remove('hidden');
            }

            this.megaList.batchReplace(aNodeList.map(String));

            this.megaList.initialRender();
        }
        else if (newNodes.length) {
            this.megaList.batchReplace(curNodeList.map(String));
        }

        if (this.container.classList.contains('grid-view')) {

            const _createFiller = () => {

                if (!this.container) {
                    return;
                }

                if (this.container.classList.contains('bigger-node') ^ this.container.offsetWidth > 700) {

                    this.megaList.updateOptions(this.getMListOptions());
                }

                if (typeof this.megaList.options.renderAdapter.createFiller === 'function') {
                    this.megaList.options.renderAdapter.createFiller();
                }
            };

            $(window).rebind("resize.createFillerNode", SoonFc(40, _createFiller));

            _createFiller();
        }
        else {
            $(window).off("resize.createFillerNode");
        }

        window.addEventListener('resize', this);

        if (this.logger) {
            console.timeEnd('MegaRender.renderLayout');
        }
    }

    destroy() {
        if (this.ready) {
            this.cleanupLayout();
        }
        window.removeEventListener('resize', this);

        if (this.megaList) {
            this.megaList.destroy();
        }

        $(window).off("resize.createFillerNode");
        oDestroy(this);
    }

    getDOMNode(h, n) {

        if (!this.nodeMap[h] && (n || M.getNodeByHandle(h))) {
            const fragment = document.createDocumentFragment();

            if (M.currentdirid === 'shares') {
                this.nodeMap[h] = new MegaSharedNode({parentNode: fragment, nodeHandle: h}).domNode;
            }
            else if (M.albums) {
                this.nodeMap[h] = new mega.gallery.MegaAlbumNode({parentNode: fragment, nodeHandle: h}).domNode;
            }
            else {
                this.nodeMap[h] = new MegaNodeComponent({parentNode: fragment, nodeHandle: h}).domNode;
            }
        }

        return this.nodeMap[h];
    }

    hasDOMNode(h) {
        return !!this.nodeMap[h];
    }

    revokeDOMNode(h, aRemove) {

        if (this.nodeMap[h]) {

            const node = this.nodeMap[h];

            delete this.nodeMap[h];

            if (aRemove) {
                if (node.component instanceof MegaNodeComponent) {
                    node.component.destroy();
                }
                else {
                    node.remove();
                }
            }

            return node;
        }
    }

    isDOMNodeVisible(h) {

        const node = this.nodeMap[h];
        const res = !!(node && node.parentNode);

        if (d > 1) {
            console.assert(!this.megaList || res === this.megaList.isRendered(h));
        }

        return res;
    }

    getMListOptions() {

        const options = {
            itemRenderFunction: M.megaListRenderNode,
            preserveOrderInDOM: true,
            extraRows: 1,
            batchPages: 0,
            appendOnly: false,
            onContentUpdated: function() {
                if (M.onIconView) {
                    delay('thumbnails', fm_thumbnails, 2);
                }
            },
            usingNativeScroll: true
        };

        if (!(M.currentdirid === 'shares' || M.currentdirid === 'out-shares'
            || M.currentdirid === 'public-links') && M.onIconView) {
            // Item width and height are dom node base size + margin
            if (this.container.offsetWidth <= 700) {
                options.itemWidth = 124 + 24;
                options.itemHeight = 156 + 24;
                this.container.classList.remove('bigger-node');
            }
            else {
                options.itemWidth = 155 + 24;
                options.itemHeight = 187 + 24;
                this.container.classList.add('bigger-node');
            }
            options.renderAdapter = new MegaList.RENDER_ADAPTERS.Grid({usingNativeScroll: true});
        }
        else {
            options.extraRows = 4;
            options.itemWidth = false;
            options.itemHeight = M.currentdirid === 'shares' ? 60 + 24 : 40 + 24; // Item height + padding
            options.renderAdapter = new MegaList.RENDER_ADAPTERS.List({usingNativeScroll: true});
        }

        // add bottom spacing for public links view
        if (pfid) {
            options.bottomSpacing = 57 + 16;  // height + padding
        }

        return options;
    }

    initScrollEvent() {

        this.megaList.listContainer.addEventListener('scroll', this);
        this.megaList.listContainer.addEventListener('touchstart', this);
        this.megaList.listContainer.addEventListener('touchend', this);

        this.lastScrollTop = 0;

        if (mega.ui.footer && mega.ui.footer.visible) {
            mega.ui.footer.showButton();
        }
    }

    removeScrollEvent() {
        if (this.megaList) {
            this.megaList.listContainer.removeEventListener('scroll', this);
            this.megaList.listContainer.removeEventListener('touchstart', this);
            this.megaList.listContainer.removeEventListener('touchend', this);
        }
    }

    get ready() {
        return this.megaList && this.megaList.listContainer && this.megaList.listContainer.parentNode;
    }

    handleEvent({type}) {

        if (typeof this[`handle${type}`] === 'function') {
            console.assert(this.ready, 'This MegaRender instance is receiving events out of context.');

            if (this.ready) {
                this[`handle${type}`]();
            }
        }
    }

    handlescroll() {

        delay('mobileMegaListScroll', () => {

            // Seem user call destroy megalist while delay
            if (!this.ready) {
                return;
            }

            const {scrollTop} = this.megaList.listContainer;
            const {lastScrollTop, touching} = this;
            const {style: headerStyle, classList: headerClass , originalHeight} = mega.ui.header.bottomBlock;
            const {offsetHeight: footerHeight, style: footerStyle} = mega.ui.footer.domNode;
            const scrollMoved = scrollTop - lastScrollTop;

            if (!touching) {

                if (scrollMoved > originalHeight * 2) {
                    mega.ui.header.hideBottomBlock();
                    mega.ui.footer.hideButton();
                }
                else if (scrollMoved < -originalHeight * 2) {
                    mega.ui.header.showBottomBlock();
                    mega.ui.footer.showButton();
                }

                return;
            }

            this.lastScrollTop = scrollTop;

            let newVal = `${Math.min(originalHeight, Math.max(parseInt(headerStyle.height || 0) - scrollMoved, 0))}px`;

            if (mega.ui.header && !headerClass.contains('hidden') && newVal !== headerStyle.height) {
                headerStyle.height = newVal;
            }

            newVal = `${Math.max(-footerHeight, Math.min(parseInt(footerStyle.bottom || 0) - scrollMoved, 0))}px`;

            if (mega.ui.footer && mega.ui.footer.visible && newVal !== footerStyle.bottom) {
                footerStyle.bottom = newVal;
            }
        }, 10);
    }

    handletouchstart() {

        this.touching = true;
        mega.ui.header.bottomBlock.classList.add('no-trans');
        mega.ui.footer.domNode.classList.add('no-trans');
    }

    handletouchend() {

        const {scrollTop, scrollHeight, offsetHeight: listHeight} = this.megaList.listContainer;
        const {bottomBlock: {style, originalHeight}} = mega.ui.header;

        mega.ui.header.bottomBlock.classList.remove('no-trans');
        mega.ui.footer.domNode.classList.remove('no-trans');

        if ((originalHeight / 2 > parseInt(style.height || 0) ||
            scrollTop + listHeight > scrollHeight - originalHeight / 2) &&
            scrollTop >= originalHeight / 2) {

            mega.ui.header.hideBottomBlock();
            mega.ui.footer.hideButton();
        }
        else {
            mega.ui.header.showBottomBlock();
            mega.ui.footer.showButton();
        }

        this.touching = false;
    }

    handleresize() {

        if (mega.ui.footer && mega.ui.footer.visible) {
            mega.ui.footer.showButton();
        }

        if (M.v.length) {

            onIdle(() => {
                if (this.ready) {
                    this.lastScrollTop = this.megaList.listContainer.scrollTop;
                }
            });
        }
    }
}
