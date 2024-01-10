lazy(mega.gallery, 'AlbumTimeline', () => {
    'use strict';

    const scope = mega.gallery;
    const { albums } = scope;
    const defZoomStep = 2;

    /**
     * Getting the month label for the node
     * @param {MegaNode} node Node to fetch the label from
     * @returns {String}
     */
    const getMonthLabel = ({ mtime, ts }) => GalleryNodeBlock.getTimeString(mtime || ts, 3);

    let globalZoomStep = defZoomStep;

    const fillAlbumTimelineCell = (el) => {
        if (el.ref.isVideo) {
            el.dataset.videoDuration = secondsToTimeShort(MediaAttribute(el.ref.node).data.playtime);
            el.classList.add('show-video-duration');
        }
    };

    class AlbumItemContextMenu extends MMenuSelect {
        constructor() {
            super();

            const selections = Object.keys(albums.grid.timeline.selections);
            const albumId = scope.getAlbumIdFromPath();
            const album = albums.store[albumId];
            const { filterFn, at, eIds, nodes } = album;
            const options = [];
            let selectionsPreviewable = false;

            const isCoverChangeable = !filterFn
                && selections.length === 1
                && (!at.c || eIds[at.c] !== selections[0]);

            for (let i = 0; i < selections.length; i++) {
                if (scope.isPreviewable(M.d[selections[i]])) {
                    selectionsPreviewable = true;
                    break;
                }
            }

            if (scope.nodesAllowSlideshow(nodes)) {
                options.push({
                    label: l.album_play_slideshow,
                    icon: 'play-square',
                    click: () => {
                        scope.playSlideshow(albumId, true);
                    }
                });
            }

            if (selectionsPreviewable) {
                options.push(
                    {
                        label: l.album_item_preview_label,
                        icon: 'preview-reveal',
                        click: () => {
                            scope.playSlideshow(albumId);
                        }
                    }
                );
            }

            if (options.length) {
                options.push({});
            }

            options.push(
                {
                    label: l.album_download,
                    icon: 'download-small',
                    click: () => {
                        if (M.currentdirid !== `albums/${albumId}`) {
                            return;
                        }

                        const handles = scope.getAlbumsHandles([albumId]);

                        if (!handles.length) {
                            return;
                        }

                        scope.reportDownload();
                        M.addDownload(handles);
                    }
                }
            );

            if (isCoverChangeable) {
                options.push({
                    label: l.set_as_album_cover,
                    icon: 'images',
                    click: () => {
                        if (albums.grid.timeline.selCount === 1) {
                            albums.updateAlbumCover(album, Object.keys(albums.grid.timeline.selections)[0]);
                        }
                    }
                });
            }

            if (!filterFn) {
                options.push(
                    {},
                    {
                        label: l.album_item_remove_label,
                        icon: 'bin',
                        click: () => {
                            albums.requestAlbumElementsRemoval();
                        },
                        classes: ['red']
                    }
                );
            }

            this.options = options;
        }
    }

    class PublicAlbumItemContextMenu extends MMenuSelect {
        constructor() {
            super();

            const selections = Object.keys(albums.grid.timeline.selections);

            const albumId = scope.getAlbumIdFromPath();
            const { nodes } = albums.store[albumId];
            const options = [];

            const hasImageSelected = selections.some(h => !!scope.isImage(M.d[h]));
            const onlyPlayableVideosSelected = selections.every((h) => !!(scope.isVideo(M.d[h])
                && scope.isVideo(M.d[h]).isPreviewable && MediaAttribute.getMediaType(M.d[h])));

            if (hasImageSelected) {
                options.push({
                    label: l.album_item_preview_label,
                    icon: 'preview-reveal',
                    click: () => {
                        scope.playSlideshow(albumId);
                    }
                });

                if (scope.nodesAllowSlideshow(nodes)) {
                    options.push({
                        label: l.album_play_slideshow,
                        icon: 'play-square',
                        click: () => {
                            scope.playSlideshow(albumId, true);
                        }
                    });
                }
            }

            if (onlyPlayableVideosSelected) {
                options.push({
                    label: l.album_play_video,
                    icon: 'video-call-filled',
                    click: () => {
                        scope.playSlideshow(albumId, false, true);
                    }
                });
            }

            options.push(
                {},
                {
                    label: l.album_download,
                    icon: 'download-small',
                    click: () => {
                        if (!M.isAlbumsPage()) {
                            return;
                        }

                        eventlog(99954);
                        M.addDownload(selections);
                    }
                },
                {},
                {
                    label: l[6859],
                    icon: 'info',
                    click: () => {
                        $.selected = selections;
                        propertiesDialog();
                    }
                },
                {},
                {
                    label: (u_type) ? l.context_menu_import : l.btn_imptomega,
                    icon: (u_type) ? 'upload-to-cloud-drive' : 'mega-thin-outline',
                    click: () => {
                        if (M.isInvalidUserStatus()) {
                            return;
                        }

                        assert(albums.isPublic, 'This import needs to happen in public album only...');

                        eventlog(99832);
                        M.importFolderLinkNodes(selections);
                    }
                }
            );

            this.options = options;
        }
    }

    class AlbumTimelineCell extends MComponent {
        /**
         * @param {Object.<String, any>} data Data for the cell
         * @param {MegaNode} data.node Node to base on
         * @param {Function} data.clickFn Single click handler
         * @param {Function} data.dbclickFn Double click handler
         * @param {Boolean} data.useMenu Whether to use context menu or skip it
         */
        constructor({ node, clickFn, dbclickFn, useMenu }) {
            super();

            this.el.ref = {
                node,
                isVideo: !!scope.isVideo(node),
                setThumb: (dataUrl) => {
                    this.setThumb(dataUrl);
                }
            };

            this.el.setAttribute('title', node.name);
            this.el.setAttribute('id', node.h);

            this._active = true;
            this._selected = false;

            this.attachEvents(clickFn, dbclickFn, useMenu);
        }

        get isActive() {
            return this._active;
        }

        /**
         * Using this parameter to grey-out the cell when needed
         * @param {Boolean} status Active status
         * @returns {void}
         */
        set isActive(status) {
            if (status) {
                this.el.classList.remove('opacity-50');
            }
            else {
                this.el.classList.add('opacity-50');
            }
        }

        get isSelected() {
            return this._selected;
        }

        /**
         * @param {Boolean} status Selected status
         * @returns {void}
         */
        set isSelected(status) {
            if (status === this._selected) {
                return;
            }

            if (status) {
                this.el.classList.add('ui-selected');

                const check = document.createElement('i');
                check.className = 'sprite-fm-mono icon-check-circle icon-size-6';
                this.el.appendChild(check);
                this._selected = true;

                if (!this._active) {
                    this.isActive = true;
                }
            }
            else {
                this.el.classList.remove('ui-selected');
                this.el.removeChild(this.el.querySelector('i.icon-check-circle'));
                this._selected = false;
            }
        }

        buildElement() {
            this.el = document.createElement('div');
            this.el.className = 'album-timeline-cell cursor-pointer';
        }

        attachEvents(clickFn, dbclickFn, useMenu) {
            if (clickFn) {
                this.attachEvent('mouseup', (evt) => {
                    if (evt.which === 3) {
                        return false;
                    }

                    if (!evt.detail || evt.detail === 1) {
                        clickFn(this, evt);
                    }
                    else if (evt.detail === 2) {
                        dbclickFn(this, evt);
                    }
                });
            }

            if (useMenu) {
                this.attachEvent(
                    'contextmenu',
                    (evt) => {
                        evt.preventDefault();
                        const { pageX, pageY, target } = evt;

                        if (!this.isSelected) {
                            clickFn(this, evt);
                        }

                        if (albums.isPublic) {
                            const contextMenu = new PublicAlbumItemContextMenu(target);
                            contextMenu.show(pageX, pageY);
                        }
                        else {
                            const contextMenu = new AlbumItemContextMenu(target);
                            contextMenu.show(pageX, pageY);
                        }
                    }
                );
            }
        }

        applyMonthLabel(label) {
            this.el.classList.add('show-date');
            this.el.dataset.date = label;
        }

        removeMonthLabel() {
            this.el.classList.remove('show-date');
        }

        setThumb(dataUrl) {
            if (this.el.classList.contains('shimmer')) {
                this.el.style.backgroundImage = `url('${dataUrl}')`;
                this.el.style.backgroundColor = 'white';
                scope.unsetShimmering(this.el);
            }
        }
    }

    class AlbumTimeline extends MComponent {
        /**
         * The sorted list of nodes (newest at top) with the specific handler
         * @param {Object.<String, any>} options Options object
         * @param {Function} options.onSelectToggle Method is called when the cell status is changed
         * @param {Function} options.onDoubleClick Method is called when the cell is double clicked
         * @param {String} [options.containerClass] Additional classes for container
         * @param {Number} [options.sidePadding] Use this correction, if container classes include x-axis padding
         * @param {Boolean} [options.showMonthLabel] Whether to show month timestamps or not
         * @param {Boolean} [options.interactiveCells] Whether cells should react to context menu and selections
         * @param {Boolean} [options.selectionLimit] Whether a multiple selection is allowed or not
         * @param {Boolean} [options.skipGlobalZoom] Whether to use global zoom or the locally created one
         */
        constructor({
            onSelectToggle,
            onDoubleClick,
            containerClass,
            sidePadding,
            showMonthLabel,
            interactiveCells,
            selectionLimit,
            skipGlobalZoom
        }) {
            super(null, false);

            this.sidePadding = sidePadding || 0;

            if (typeof containerClass === 'string') {
                this.el.className = containerClass;
            }

            this.dynamicList = false;

            this.rowIndexCache = {};
            this.cellCache = {};
            this.initialRender = true;

            this.selections = {};
            this.selectArea = null;
            this.shiftSelectedIndexes = [];

            this.onSelectToggle = onSelectToggle;
            this.onDoubleClick = onDoubleClick;
            this.showMonthLabel = showMonthLabel;
            this.interactiveCells = interactiveCells;
            this.skipGlobalZoom = skipGlobalZoom;
            this.selectionLimit = selectionLimit || 0;

            this._zoomStep = skipGlobalZoom ? defZoomStep : globalZoomStep;
            this._limitReached = false;
            this._selCount = 0;

            this.el.classList.add(`album-timeline-zoom-${this._zoomStep}`);
            this.attachEvents();
        }

        get selCount() {
            return this._selCount;
        }

        get rowHeight() {
            return this.cellSize + scope.cellMargin * 2;
        }

        get zoomStep() {
            return this._zoomStep;
        }

        get limitReached() {
            return this._limitReached;
        }

        /**
         * @param {Boolean} status Whether the limit is reached or not
         */
        set limitReached(status) {
            this._limitReached = status;

            delay('album_timeline:toggle_cell_activation', () => {
                const selector = '.album-timeline-cell'
                    + (this._limitReached ? ':not(.opacity-50)' : '.opacity-50')
                    + ':not(.ui-selected)';


                const cellsToToggle = this.el.querySelectorAll(selector);

                if (cellsToToggle.length) {
                    for (let i = 0; i < cellsToToggle.length; i++) {
                        cellsToToggle[i].mComponent.isActive = !this._limitReached;
                    }
                }
            }, 100);
        }

        /**
         * @param {Number} step The zoom step index
         * @returns {void}
         */
        set zoomStep(step) {
            step = parseInt(step);

            if (isNaN(step)) {
                step = 0;
            }

            if (step >= AlbumTimeline.zoomSteps.length || step < 0) {
                return;
            }

            this.el.classList.remove(`album-timeline-zoom-${this._zoomStep}`);
            this._zoomStep = step;
            this.el.classList.add(`album-timeline-zoom-${step}`);

            if (!this.skipGlobalZoom) {
                globalZoomStep = step;
            }

            if (this.dynamicList && this._nodes.length) {
                this.nodes = this._nodes.map(({ list }) => list).flat();
            }
        }

        /**
         * @param {MegaNode[]} nodes The new list of nodes to use
         * @returns {void}
         */
        set nodes(nodes) {
            if (this.dynamicList) {
                this.dynamicList.destroy();
                this.dynamicList = null;
            }

            MComponent.resetSubElements(this, '_nodes', false);

            if (!nodes.length) {
                return;
            }

            this.setCellSize();

            this.dynamicList = new MegaDynamicList(this.el, {
                itemRenderFunction: this.renderRow.bind(this),
                itemHeightCallback: () => this.rowHeight,
                onResize: this.onResize.bind(this),
                perfectScrollOptions: {
                    handlers: ['click-rail', 'drag-thumb', 'wheel', 'touch'],
                    minScrollbarLength: 50
                }
            });

            const ids = [];
            let lastIndex = 0;
            let monthLabel = getMonthLabel(nodes[0]);
            this.rowIndexCache[nodes[0].h] = 0;
            this._nodes.push({
                list: [nodes[0]],
                monthLabel
            });

            for (let i = 1; i < nodes.length; i++) {
                const node = nodes[i];
                const lastEl = this._nodes[lastIndex];
                const curLabel = getMonthLabel(node);

                if (this.showMonthLabel && curLabel !== monthLabel) {
                    ids.push(lastIndex.toString());
                    monthLabel = curLabel;
                    lastIndex++;

                    this._nodes.push({
                        list: [node],
                        monthLabel
                    });
                }
                else if (lastEl.list.length % AlbumTimeline.zoomSteps[this.zoomStep] === 0) {
                    ids.push(lastIndex.toString());
                    lastIndex++;

                    this._nodes.push({
                        list: [node]
                    });
                }
                else {
                    lastEl.list.push(node);
                }

                this.rowIndexCache[node.h] = lastIndex;
            }

            if (!this.dynamicList.items[lastIndex]) {
                ids.push(lastIndex.toString());
            }

            this.dynamicList.batchAdd(ids);
            this.dynamicList.initialRender();

            if (this.zoomControls) {
                this.el.parentNode.prepend(this.zoomControls);
            }

            delay('album_timeline:set_nodes', () => {
                if (this.dynamicList) {
                    this.dynamicList.options.onResize = this.onResize.bind(this);
                }
            });
        }

        clearSiblingSelections(ignoreHandle) {
            const handles = Object.keys(this.selections);

            for (let i = 0; i < handles.length; i++) {
                if (handles[i] !== ignoreHandle) {
                    this.deselectNode(M.d[handles[i]]);
                }
            }
        }

        attachEvents() {
            this.onNodeClick = (cell, evt) => {
                const { shiftKey } = evt;
                const { el, isSelected } = cell;

                if (this.selectionLimit === 1) {
                    this.selectNode(el.ref.node);
                    this.clearSiblingSelections(el.ref.node.h);
                    return;
                }

                this.lastNavNode = el.ref.node;

                if (shiftKey) {
                    if (this.selectStartNode && this.selectStartNode.h !== el.ref.node.h) {
                        this.selectElementsRange(this.selectStartNode, el.ref.node, true);
                    }
                    else {
                        this.clearSiblingSelections(el.ref.node.h);
                        this.selectStartNode = el.ref.node;
                    }
                }
                else {
                    if (isSelected) {
                        this.deselectNode(el.ref.node);
                        this.selectStartNode = null;
                        this.lastNavNode = null;
                    }
                    else {
                        this.selectNode(el.ref.node);
                        this.selectStartNode = el.ref.node;
                    }

                    this.shiftSelectedIndexes = [];
                }
            };

            this.onNodeDbClick = (cell, evt) => {
                this.selectStartNode = cell.el.ref.node;
                this.lastNavNode = null;

                if (this.onDoubleClick) {
                    this.onDoubleClick(cell, evt);
                }
            };

            this.attachKeyboardListener();

            if (this.selectionLimit !== 1) {
                this.attachDragListener();
            }
        }

        selectNonRenderedCells(posArr) {
            for (let i = 0; i < this._nodes.length; i++) {
                for (let j = 0; j < this._nodes[i].list.length; j++) {
                    const isInArea = scope.isInSelectArea(
                        {
                            offsetLeft: Math.floor(
                                this.cellSize * j + scope.cellMargin * (j * 2 + 1)
                            ),
                            offsetTop: Math.floor(
                                this.dynamicList._offsets[i.toString()] + scope.cellMargin
                            ),
                            offsetWidth: this.cellSize,
                            offsetHeight: this.cellSize
                        },
                        posArr,
                        this.sidePadding
                    );

                    if (isInArea) {
                        this.selectNode(this._nodes[i].list[j]);
                    }
                    else {
                        this.deselectNode(this._nodes[i].list[j]);
                    }
                }
            }
        }

        selectRenderedCells(posArr) {
            const keys = Object.keys(this.dynamicList._currentlyRendered);

            if (keys.length) {
                for (let i = 0; i < keys.length; i++) {
                    const row = this.dynamicList._currentlyRendered[keys[i]];

                    if (row.children && row.children.length) {
                        for (let j = 0; j < row.children.length; j++) {
                            if (scope.isInSelectArea(row.children[j], posArr, this.sidePadding)) {
                                this.selectNode(row.children[j].ref.node);
                                this.lastNavNode = row.children[j].ref.node;
                            }
                            else {
                                this.deselectNode(row.children[j].ref.node);
                            }
                        }
                    }
                }
            }
        }

        attachDragListener() {
            let initX = 0;
            let initY = 0;

            this.dragSelect = new mega.ui.dragSelect(
                this.el,
                {
                    allowedClasses: ['MegaDynamicListItem'],
                    onDragStart: (xPos, yPos) => {
                        initX = xPos;
                        initY = this.dynamicList.getScrollTop() + yPos;
                        $.hideContextMenu();
                    },
                    onDragMove: (xPos, yPos) => {
                        const posArr = [];

                        yPos += this.dynamicList.getScrollTop();

                        if (xPos > initX) {
                            posArr.push(initX, xPos);
                        }
                        else {
                            posArr.push(xPos, initX);
                        }

                        if (yPos > initY) {
                            posArr.push(initY, yPos);
                        }
                        else {
                            posArr.push(yPos, initY);
                        }

                        this.selectArea = posArr;

                        if (this.dynamicList) {
                            this.selectRenderedCells(posArr);

                            delay('album_timeline:drag_select', () => {
                                this.selectNonRenderedCells(posArr);
                            }, 50);
                        }
                    },
                    onDragEnd: (wasDragging, yCorrection, rect, { target }) => {
                        if (!wasDragging
                            && this.selCount
                            && (target === this.el || target.classList.contains('MegaDynamicListItem'))) {
                            this.clearSiblingSelections();
                            this.selectArea = null;
                            this.lastNavNode = null;
                        }

                        this.selectStartNode = null;
                        this.shiftSelectedIndexes = [];
                    },
                    onScrollUp: () => {
                        if (!this.limitReached) {
                            this.dynamicList.scrollToYPosition(this.dynamicList.getScrollTop() - 20);
                        }
                    },
                    onScrollDown: () => {
                        if (!this.limitReached) {
                            this.dynamicList.scrollToYPosition(this.dynamicList.getScrollTop() + 20);
                        }
                    },
                    getOffsetTop: () => this.dynamicList.getScrollTop()
                }
            );
        }

        resetLastNavNode(shiftKey) {
            if (!this.lastNavNode) {
                if (this.selectStartNode) {
                    this.lastNavNode = this.selectStartNode;
                    return;
                }

                const selections = Object.keys(this.selections);

                if (selections.length) {
                    this.lastNavNode = M.d[selections[selections.length - 1]];
                }
            }

            if (shiftKey && !this.selectStartNode) {
                this.selectStartNode = this.lastNavNode || this._nodes[0].list[0];
            }
        }

        attachKeyboardListener() {
            if (scope.disposeKeyboardEvents) {
                scope.disposeKeyboardEvents();
            }

            scope.disposeKeyboardEvents = MComponent.listen(document, 'keydown', (evt) => {
                if (evt.target !== document.body) {
                    return;
                }

                const { key, shiftKey } = evt;
                const isCtrl = scope.getCtrlKeyStatus(evt);

                let rowIndex = -1;
                let inRowIndex = -1;
                let skipSelfSelect = false;

                this.resetLastNavNode(shiftKey);

                if (this.lastNavNode) {
                    rowIndex = this.rowIndexCache[this.lastNavNode.h];

                    inRowIndex = this._nodes[this.rowIndexCache[this.lastNavNode.h]].list
                        .findIndex(({ h }) => h === this.lastNavNode.h);
                }
                else {
                    rowIndex++;
                }

                const events = {
                    ArrowLeft: () => {
                        inRowIndex--;

                        if (inRowIndex < 0) {
                            rowIndex--;
                            inRowIndex = AlbumTimeline.zoomSteps[this.zoomStep] - 1;
                        }

                        if (rowIndex < 0 && !shiftKey && !isCtrl) {
                            rowIndex = this._nodes.length - 1;
                        }

                        if (this._nodes[rowIndex] && inRowIndex >= this._nodes[rowIndex].list.length) {
                            inRowIndex = this._nodes[rowIndex].list.length - 1;
                        }
                    },
                    ArrowRight: () => {
                        inRowIndex++;

                        if (inRowIndex >= this._nodes[rowIndex].list.length) {
                            rowIndex++;
                            inRowIndex = 0;
                        }

                        if (rowIndex >= this._nodes.length && !shiftKey && !isCtrl) {
                            rowIndex = 0;
                        }
                    },
                    ArrowUp: () => {
                        if (this.lastNavNode) {
                            rowIndex--;
                        }
                        else {
                            rowIndex = 0;
                            inRowIndex = 0;
                        }

                        if (rowIndex < 0 && !shiftKey && !isCtrl) {
                            rowIndex = this._nodes.length - 1;
                        }

                        if (!this._nodes[rowIndex]) {
                            return true;
                        }

                        const perRow = this._nodes[rowIndex].list.length;

                        if (inRowIndex >= perRow) {
                            inRowIndex = perRow - 1;
                        }

                        if (this.selectionLimit > 1 && !this.limitReached) {
                            const overLimit = this.selCount + perRow - this.selectionLimit;

                            if (overLimit > 0) {
                                inRowIndex += overLimit;

                                if (inRowIndex >= perRow) {
                                    rowIndex++;
                                    inRowIndex = perRow - inRowIndex;
                                }
                            }
                        }
                    },
                    ArrowDown: () => {
                        if (this.lastNavNode) {
                            rowIndex++;
                        }
                        else {
                            rowIndex = 0;
                            inRowIndex = 0;
                        }

                        if (rowIndex >= this._nodes.length && !shiftKey && !isCtrl) {
                            rowIndex = 0;
                        }

                        if (!this._nodes[rowIndex]) {
                            return true;
                        }

                        const perRow = this._nodes[rowIndex].list.length;

                        if (this._nodes[rowIndex] && inRowIndex >= perRow) {
                            inRowIndex = perRow - 1;
                        }

                        if (this.selectionLimit > 1 && !this.limitReached) {
                            const overLimit = this.selCount + perRow - this.selectionLimit;

                            if (overLimit > 0) {
                                inRowIndex -= overLimit;
                                if (inRowIndex < 0) {
                                    rowIndex--;
                                    inRowIndex = perRow + inRowIndex;
                                }
                            }
                        }
                    },
                    a: () => {
                        if (this.selectionLimit === 1) {
                            return true;
                        }

                        for (let i = 0; i < this._nodes.length; i++) {
                            for (let j = 0; j < this._nodes[i].list.length; j++) {
                                this.selectNode(this._nodes[i].list[j]);
                            }
                        }

                        this.lastNavNode = null;
                        skipSelfSelect = true;
                    },
                    Escape: () => {
                        if ($.dialog) {
                            if ($.dialog === 'm-dialog') {
                                scope.disposeKeyboardEvents();
                                scope.disposeKeyboardEvents = null;
                            }

                            evt.preventDefault();
                            evt.stopPropagation();
                            closeDialog();
                        }

                        return true;
                    },
                    Enter: () => {
                        evt.preventDefault();
                        evt.stopPropagation();

                        if ($.dialog) {
                            scope.disposeKeyboardEvents();
                            scope.disposeKeyboardEvents = null;
                            return true;
                        }

                        if (!this.selCount) {
                            return true;
                        }

                        if (this.selCount === 1) {
                            scope.playSlideshow(scope.getAlbumIdFromPath());
                        }
                        else {
                            scope.reportDownload();
                            M.addDownload(Object.keys(this.selections));
                        }

                        return true;
                    }
                };

                if (!events[key]) {
                    return;
                }

                if (isCtrl) {
                    evt.preventDefault();
                    evt.stopPropagation();
                }

                if (events[key]() === true
                    || rowIndex < 0
                    || rowIndex >= this._nodes.length
                    || !this._nodes[rowIndex]
                    || !this._nodes[rowIndex].list[inRowIndex]
                ) {
                    return true;
                }

                this.lastNavNode = this._nodes[rowIndex].list[inRowIndex];

                if (skipSelfSelect || !this.cellCache[this.lastNavNode.h]) {
                    return;
                }

                const performSelection = () => {
                    const { el } = this.cellCache[this.lastNavNode.h];

                    if (shiftKey) {
                        this.selectElementsRange(this.selectStartNode, this.lastNavNode);
                    }
                    else if (!isCtrl || !el.mComponent.isSelected) {
                        this.selectNode(this.lastNavNode);
                    }

                    this.scrollToSelectedRow(rowIndex);

                    if (!shiftKey && !isCtrl) {
                        this.clearSiblingSelections(this.lastNavNode.h);
                    }
                };

                performSelection();
            });
        }

        scrollToSelectedRow(rowIndex) {
            const newOffsetTop = this.dynamicList._offsets[rowIndex];
            const scrollTop = this.dynamicList.getScrollTop();

            if (newOffsetTop < scrollTop) {
                this.dynamicList.scrollToYPosition(newOffsetTop);
            }
            else {
                const bottomOverflow = newOffsetTop
                    + this.rowHeight
                    + scope.cellMargin
                    - (scrollTop + this.el.clientHeight);

                if (bottomOverflow > 0) {
                    this.dynamicList.scrollToYPosition(scrollTop + bottomOverflow);
                }
            }
        }

        /**
         * @param {Meganode} node Node to select
         * @returns {void}
         */
        selectNode(node) {
            if (this.limitReached) {
                if (!this.limitTip) {
                    this.addCountLimitTip();
                }

                return;
            }

            if (!this.selections[node.h]) {
                this.selections[node.h] = true;

                if (this.onSelectToggle) {
                    this.onSelectToggle(node);
                }

                const cell = this.cellCache[node.h];

                if (cell) {
                    cell.isSelected = true;
                }

                this._selCount++;

                if (
                    this.selectionLimit > 1
                    && this.selCount >= this.selectionLimit
                ) {
                    this.addCountLimitTip();
                    this.limitReached = true;
                }

                this.adjustHeader();
            }
        }

        /**
         * @param {Meganode} node Node to deselect
         * @returns {void}
         */
        deselectNode(node) {
            if (this.selections[node.h]) {
                delete this.selections[node.h];

                if (this.onSelectToggle) {
                    this.onSelectToggle(node);
                }

                const cell = this.cellCache[node.h];

                if (cell) {
                    cell.isSelected = false;
                }

                this.adjustToBottomBar();

                this._selCount--;

                if (
                    this.limitReached
                    && this.selCount < this.selectionLimit
                ) {
                    this.removeCountLimitTip();
                    this.limitReached = false;
                }

                this.adjustHeader();
            }
        }

        addCountLimitTip() {
            if (this.limitTip) {
                return;
            }

            this.limitTip = document.createElement('div');
            this.limitTip.className = 'absolute bottom-0 right-0 w-full tooltip-popin timeline-tooltip';

            const icon = document.createElement('i');
            const message = document.createElement('span');
            const button = document.createElement('button');
            icon.className = 'sprite-fm-uni icon-hazard mr-4 icon-size-6';
            message.className = 'flex-1';
            message.textContent = mega.icu.format(l.album_items_limit, scope.maxSelectionsCount);
            button.textContent = l[81];

            const flex = document.createElement('div');
            flex.className = 'w-full flex flex-row items-center bg-surface-main rounded-2xl p-4';
            flex.appendChild(icon);
            flex.appendChild(message);
            flex.appendChild(button);
            this.limitTip.appendChild(flex);

            this.attachEvent(
                'click.hideSelectionLimit',
                () => {
                    this.removeCountLimitTip();
                },
                null,
                button
            );

            this.el.parentNode.appendChild(this.limitTip);
        }

        removeCountLimitTip() {
            if (this.limitTip) {
                this.disposeEvent('click.hideSelectionLimit');
                this.el.parentNode.removeChild(this.limitTip);
                delete this.limitTip;
            }
        }

        onResize() {
            if (this.dynamicList) {
                this.setCellSize();

                const keys = Object.keys(this.dynamicList._currentlyRendered);

                for (let i = 0; i < keys.length; i++) {
                    this.dynamicList.itemChanged(keys[i]);
                }
            }
        }

        setCellSize() {
            const gap = 8;

            this.cellSize = (this.el.offsetWidth
                - gap * AlbumTimeline.zoomSteps[this.zoomStep] // Cell margins
                - this.sidePadding * 2) // Horizontal padding
                / AlbumTimeline.zoomSteps[this.zoomStep]; // Columns
        }

        /**
         * Preparing and caching the cell result for the future use
         * @param {MegaNode} node Node to use for building the cell
         * @returns {AlbumTimelineCell}
         */
        getCachedCell(node) {
            if (!this.cellCache[node.h]) {
                this.cellCache[node.h] = new AlbumTimelineCell({
                    node,
                    clickFn: this.onNodeClick,
                    dbclickFn: this.onNodeDbClick,
                    useMenu: this.interactiveCells
                });
            }

            return this.cellCache[node.h];
        }

        renderRow(rowKey) {
            const div = document.createElement('div');
            div.className = 'flex flex-row';

            const toFetchAttributes = [];

            if (this._nodes[rowKey]) {
                const sizePx = `${this.cellSize}px`;
                const { list, monthLabel } = this._nodes[rowKey];

                for (let i = 0; i < list.length; i++) {
                    const tCell = this.getCachedCell(list[i]);

                    tCell.el.style.width = sizePx;
                    tCell.el.style.height = sizePx;
                    scope.setShimmering(tCell.el);

                    if (this.showMonthLabel && !i && monthLabel) {
                        tCell.applyMonthLabel(monthLabel);
                    }
                    else {
                        tCell.removeMonthLabel();
                    }

                    if (this.selections[list[i].h]) {
                        tCell.isSelected = true;
                    }

                    tCell.isActive = !this.limitReached || tCell.isSelected;

                    div.appendChild(tCell.el);
                    fillAlbumTimelineCell(tCell.el);

                    tCell.el.ref.el = tCell.el;

                    toFetchAttributes.push(tCell.el.ref);
                }
            }

            if (toFetchAttributes.length) {
                delay(`album_timeline:render_row${rowKey}`, () => MegaGallery.addThumbnails(toFetchAttributes));
            }

            return div;
        }

        /**
         * Selecting all nodes in between
         * @param {MegaNode} nodeA First node in the range
         * @param {MegaNode} nodeB Last node in the range
         * @param {Number} direction Selecting as 1 (from left to right) or -1 (from right to left)
         * @returns {void}
         */
        selectElementsRange(nodeA, nodeB) {
            const nodes = this._nodes.map(({ list }) => list).flat();
            let indexA = false;
            let indexB = false;
            const newIndexes = [];

            for (let i = 0; i < nodes.length; i++) {
                const { h } = nodes[i];

                if (h === nodeA.h) {
                    indexA = i;

                    if (nodeA.h === nodeB.h) {
                        indexB = i;
                    }
                }
                else if (h === nodeB.h) {
                    indexB = i;
                }

                if (indexA !== false && indexB !== false) {
                    break;
                }
            }

            if (indexA > indexB) {
                indexA += indexB;
                indexB = indexA - indexB;
                indexA -= indexB;
            }

            for (let i = indexA; i <= indexB; i++) {
                this.selectNode(nodes[i]);
                newIndexes.push(i);
            }

            for (let i = 0; i < this.shiftSelectedIndexes.length; i++) {
                if (!newIndexes.includes(this.shiftSelectedIndexes[i])) {
                    this.deselectNode(nodes[this.shiftSelectedIndexes[i]]);
                }
            }

            this.shiftSelectedIndexes = newIndexes;
        }

        adjustHeader() {
            delay('album_timeline:render_header', () => {
                albums.grid.header.update(scope.getAlbumIdFromPath(), Object.keys(this.selections));
            }, 100);
        }

        adjustToBottomBar() {
            delay(
                'album_timeline:adjusting_to_bottom_bar',
                () => {
                    if (this.interactiveCells) {
                        this.el.style.height = (this.selCount) ? 'calc(100% - 65px)' : null;
                        this.el.style.minHeight = (this.selCount) ? '280px' : null;
                        this.resizeDynamicList();
                        Ps.update(this.el);
                    }
                },
                50
            );
        }

        resizeDynamicList() {
            if (this.dynamicList) {
                const prevScrollTop = this.dynamicList.getScrollTop();

                this.dynamicList.resized();
                this.dynamicList.scrollToYPosition(prevScrollTop);
            }
        }

        debouncedResize() {
            delay(
                'album_timeline:resize',
                () => {
                    this.resizeDynamicList();
                },
                100
            );
        }

        setZoomControls() {
            if (this.zoomControls) {
                return;
            }

            this.zoomControls = document.createElement('div');
            this.zoomControls.className = 'gallery-view-zoom-control';

            const buttons = [
                {
                    tooltip: l[24927],
                    classes: 'zoom-out',
                    icon: 'icon-minimise',
                    clickFn: () => {
                        this.zoomStep--;
                    },
                    checkIfDisabled: () => this.zoomStep <= 0
                },
                {
                    tooltip: l[24928],
                    classes: 'zoom-in',
                    icon: 'icon-add',
                    clickFn: () => {
                        this.zoomStep++;
                    },
                    checkIfDisabled: () => this.zoomStep >= AlbumTimeline.zoomSteps.length - 1
                }
            ];

            for (let i = 0; i < buttons.length; i++) {
                const { icon, clickFn, tooltip, classes, checkIfDisabled } = buttons[i];

                const btn = document.createElement('button');
                btn.className = `btn-icon simpletip ${classes}`;
                btn.dataset.simpletip = tooltip;
                const iconEl = document.createElement('i');
                iconEl.className = `sprite-fm-mono ${icon}`;
                btn.appendChild(iconEl);
                btn.onclick = () => {
                    clickFn();

                    if (checkIfDisabled()) {
                        btn.disabled = true;
                        btn.classList.add('disabled');
                    }

                    const sibling = btn.nextElementSibling || btn.previousElementSibling;

                    if (sibling && sibling.disabled) {
                        sibling.disabled = false;
                        sibling.classList.remove('disabled');
                    }
                };

                this.zoomControls.appendChild(btn);

                if ((!i && !this.zoomStep)
                    || (i === buttons.length - 1 && this.zoomStep === AlbumTimeline.zoomSteps.length - 1)) {
                    btn.disabled = true;
                    btn.classList.add('disabled');
                }
            }

            this.el.parentNode.prepend(this.zoomControls);
        }

        buildElement() {
            this.el = document.createElement('div');
        }

        clear() {
            this.selections = {};

            if (this.dynamicList) {
                this.dynamicList.destroy();
                this.dynamicList = null;
            }

            if (this.zoomControls) {
                if (this.el.parentNode) {
                    this.el.parentNode.removeChild(this.zoomControls);
                }

                this.zoomControls = null;
            }

            if (this.dragSelect) {
                this.dragSelect.dispose();
            }

            if (scope.disposeKeyboardEvents) {
                scope.disposeKeyboardEvents();
                scope.disposeKeyboardEvents = null;
            }

            if (this.el && this.el.parentNode) {
                this.el.parentNode.removeChild(this.el);
            }
        }
    }

    AlbumTimeline.zoomSteps = [15, 10, 5, 3];
    return AlbumTimeline;
});
