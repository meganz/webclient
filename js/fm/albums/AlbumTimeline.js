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
        if (el.ref.isVideo && !el.dataset.videoDuration) {
            el.dataset.videoDuration = secondsToTimeShort(MediaAttribute(el.ref.node).data.playtime);
            el.classList.add('show-video-duration');

            const icon = document.createElement('i');
            icon.className = 'video-thumb-play sprite-fm-mono icon-play-circle';
            el.appendChild(icon);
        }
    };

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
                isVideo: !!M.isGalleryVideo(node),
                setThumb: (dataUrl) => {
                    this.setThumb(dataUrl);
                }
            };

            this.el.setAttribute('title', node.name);
            this.el.setAttribute('id', node.h);

            this._active = true;
            this._selected = false;
            this.isSensitive = !!mega.sensitives.isSensitive(node);

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
                check.className = 'sprite-fm-mono icon-check';
                this.el.appendChild(check);
                this._selected = true;

                if (!this._active) {
                    this.isActive = true;
                }
            }
            else {
                this.el.classList.remove('ui-selected');
                this.el.removeChild(this.el.querySelector('i.icon-check'));
                this._selected = false;
            }
        }

        get isSensitive() {
            return this._sensitive;
        }

        /**
         * @param {Boolean} status Sensitive status
         * @returns {void}
         */
        set isSensitive(status) {
            if (status === this._sensitive) {
                return;
            }

            this._sensitive = status;

            if (status) {
                this.el.classList.add('is-sensitive');
            }
            else {
                this.el.classList.remove('is-sensitive');
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

                        if (!this.isSelected) {
                            clickFn(this, evt);
                        }

                        const selectedItems = [];
                        const selections = Object.keys(albums.grid.timeline.selections);
                        const albumId = scope.getAlbumIdFromPath();
                        const { filterFn, at, eIds, nodes } = albums.store[albumId];

                        $.selected = [...selections];

                        let selectionsPreviewable = false;
                        let onlyPlayableVideosSelected = true;
                        for (let i = 0; i < selections.length; i++) {
                            if (scope.isPreviewable(M.d[selections[i]])) {
                                if (!is_video(M.d[selections[i]])) {
                                    onlyPlayableVideosSelected = false;
                                }
                                selectionsPreviewable = true;
                            }
                        }

                        if (selections.length === 1 && onlyPlayableVideosSelected) {
                            selectedItems.push('.play-item');
                        }
                        if (window.useMegaSync === 2 || window.useMegaSync === 3) {
                            selectedItems.push('.download-item');
                        }
                        else {
                            selectedItems.push('.download-standart-item', '.zipdownload-item');
                        }

                        if (albums.isPublic) {
                            const hasImageSelected = selections.some(h => !!M.isGalleryImage(M.d[h]));

                            if (hasImageSelected && scope.nodesAllowSlideshow(nodes)) {
                                selectedItems.push('.play-slideshow');
                            }


                            selectedItems.push('.properties-item', '.import-item');
                        }
                        else {
                            // 0 - Disable, 1 - Hide, 2 - Unhide
                            const toApplySensitive = mega.sensitives.getSensitivityStatus(selections, evt);

                            const isCoverChangeable = !filterFn
                                && selections.length === 1
                                && (!at.c || eIds[at.c] !== selections[0]);

                            if (!onlyPlayableVideosSelected && scope.nodesAllowSlideshow(nodes)) {
                                selectedItems.push('.play-slideshow');
                            }

                            if (selections.length === 1 && !onlyPlayableVideosSelected && selectionsPreviewable) {
                                selectedItems.push('.preview-item');
                            }

                            if (isCoverChangeable) {
                                selectedItems.push('.set-thumbnail');
                            }

                            if (
                                mega.gallery.canShowAddToAlbum() &&
                                selections.every(h => M.isGalleryNode(M.getNodeByHandle(h)))
                            ) {
                                selectedItems.push('.add-to-album');
                            }

                            if (toApplySensitive) {
                                selectedItems.push('.add-sensitive-item');
                            }

                            if (!filterFn) {
                                selectedItems.push('.remove-item');
                            }
                            selectedItems.push('.add-star-item');
                        }

                        M.contextMenuUI(evt, 8, selectedItems.join(','));
                    }
                );
            }
        }

        setThumb(dataUrl) {
            let img = this.el.querySelector('img');

            if (!img) {
                img = document.createElement('img');
                img.className = 'w-full h-full absolute';
                this.el.appendChild(img);
            }

            img.src = dataUrl;

            this.naturalSize = this.el.style.width;

            if (this.el.classList.contains('shimmer')) {
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
            this._selSize = 0;

            this.el.classList.add(`album-timeline-zoom-${this._zoomStep}`);
            this.attachEvents();
        }

        get selCount() {
            return this._selCount;
        }

        get selSize() {
            return bytesToSize(this._selSize || 0);
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
            let $middleBlock;

            if (this.dynamicList) {
                $middleBlock = this.findMiddleImage();
                this.dynamicList.destroy();
                this.dynamicList = null;
            }

            MComponent.resetSubElements(this, '_nodes', false);

            if (!nodes.length) {
                return;
            }

            this._winWidth = window.innerWidth;
            this._winHeight = window.innerHeight;
            this.setCellSize();

            this.dynamicList = new MegaDynamicList(this.el, {
                itemRenderFunction: this.renderRow.bind(this),
                itemHeightCallback: this.getRowHeight.bind(this),
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

            if ($middleBlock) {
                const listContainerHeight = this.el.offsetHeight;
                const blockSize = $('.album-timeline-cell', this.el).width();
                const rowIndex = this.rowIndexCache[$middleBlock.attr('id')];
                const newOffsetTop = this.dynamicList._offsets[rowIndex];
                this.dynamicList.scrollToYPosition(newOffsetTop - (listContainerHeight - blockSize) / 2);
            }

            delay('album_timeline:set_nodes', () => {
                if (this.dynamicList) {
                    this.dynamicList.options.onResize = this.onResize.bind(this);
                }
            });
        }

        getRowHeight(index) {
            const headerHeight = (this._nodes[index] && this._nodes[index].monthLabel)
                ? 44
                : 0;

            return this.cellSize + scope.cellMargin * 2 + headerHeight;
        }

        findMiddleImage() {
            const $blockViews = $('.album-timeline-cell', this.el);
            const contentOffset = $('.MegaDynamicList-content', this.el).offset();
            const listContainerHeight = this.el.offsetHeight;

            let middleBlock = null;
            let minDistance = 1e6;

            const { scrollTop } = this.el;

            for (const v of $blockViews) {
                const $v = $(v);

                if ($v.offset().left < contentOffset.left + 5) {
                    const blockSize = $v.width();
                    const blockTop = $v.offset().top - contentOffset.top - parseInt($v.css('margin-top'));
                    const middle = blockTop + blockSize / 2 - scrollTop;
                    const distance = Math.abs(listContainerHeight / 2 - middle);

                    if (distance < minDistance) {
                        minDistance = distance;
                        middleBlock = $v;
                    }
                }
            }

            return middleBlock;
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
                    const children = this.dynamicList._currentlyRendered[keys[i]]
                        .querySelector(':scope > div .album-timeline-cell');

                    if (children && children.length) {
                        for (let j = 0; j < children.length; j++) {
                            if (scope.isInSelectArea(children[j], posArr, this.sidePadding)) {
                                this.selectNode(children[j].ref.node);
                                this.lastNavNode = children[j].ref.node;
                            }
                            else {
                                this.deselectNode(children[j].ref.node);
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
                    allowedClasses: ['MegaDynamicListItem', 'flex-row'],
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
                    + this.getRowHeight(rowIndex)
                    + scope.cellMargin
                    - (scrollTop + this.el.clientHeight);

                if (bottomOverflow > 0) {
                    this.dynamicList.scrollToYPosition(scrollTop + bottomOverflow);
                }
            }
        }

        getCellMonthCheck(cell) {
            let titleEl = cell.el.parentNode.parentNode;

            while (titleEl && !titleEl.classList.contains('has-month-label')) {
                titleEl = titleEl.previousElementSibling;
            }

            return titleEl && titleEl.querySelector('.checkdiv');
        }

        updateGroupSelect(cell) {
            const checkbox = this.getCellMonthCheck(cell);

            if (!checkbox) {
                return;
            }

            const rowIndex = checkbox.parentNode.dataset.row;

            delay(`album_timeline.check-select-${rowIndex}`, () => {
                const nodes = this.getMonthNodes(rowIndex);
                let all = true;
                let some = false;
                const selSet = new Set(Object.keys(this.selections));
                let i = nodes.length;

                while (--i >= 0) {
                    if (selSet.has(nodes[i])) {
                        some = true;
                    }
                    else {
                        all = false;
                    }

                    // All conditions met
                    if (some && !all) {
                        break;
                    }
                }

                checkbox.parentNode.mComponent.checked = all || some;

                if (all || !some) {
                    checkbox.classList.remove('checkboxMinimize');
                }
                else {
                    checkbox.classList.add('checkboxMinimize');
                }
            });
        }

        updateGroupDeselect(cell) {
            const checkbox = this.getCellMonthCheck(cell);

            if (!checkbox) {
                return;
            }

            const rowIndex = checkbox.parentNode.dataset.row;

            delay(`album_timeline.check-deselect-${rowIndex}`, () => {
                const sel = Object.keys(this.selections);
                let some = false;

                if (sel.length) {
                    const selSet = new Set(sel);
                    const monthNodes = this.getMonthNodes(rowIndex);

                    for (let i = 0; i < monthNodes.length; i++) {
                        if (selSet.has(monthNodes[i])) {
                            some = true;
                            break;
                        }
                    }
                }

                if (some) {
                    checkbox.classList.add('checkboxMinimize');
                }
                else {
                    checkbox.parentNode.mComponent.checked = false;
                    checkbox.classList.remove('checkboxMinimize');
                }
            });
        }

        /**
         * @param {Meganode} node Node to select
         * @param {boolean} [ignoreContainerCheck] Skiping the container check
         * @returns {void}
         */
        selectNode(node, ignoreContainerCheck = false) {
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

                    if (!ignoreContainerCheck && cell.el.isConnected) {
                        this.updateGroupSelect(cell);
                    }
                }

                this._selCount++;
                this._selSize += node.s;

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
         * @param {boolean} [ignoreContainerCheck] Skiping the container check
         * @returns {void}
         */
        deselectNode(node, ignoreContainerCheck = false) {
            if (this.selections[node.h]) {
                delete this.selections[node.h];

                if (this.onSelectToggle) {
                    this.onSelectToggle(node);
                }

                const cell = this.cellCache[node.h];

                if (cell) {
                    cell.isSelected = false;

                    if (!ignoreContainerCheck && cell.el.isConnected) {
                        this.updateGroupDeselect(cell);
                    }
                }

                this.adjustToBottomBar();

                this._selCount--;
                this._selSize -= node.s;

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
            if (this._winWidth === window.innerWidth && this._winHeight === window.innerHeight || !this.dynamicList) {
                return;
            }

            this.setCellSize();
            this._winWidth = window.innerWidth;
            this._winHeight = window.innerHeight;

            const keys = Object.keys(this.dynamicList._currentlyRendered);

            for (let i = 0; i < keys.length; i++) {
                this.dynamicList.itemChanged(keys[i]);
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
            if (this.cellCache[node.h]) {
                this.cellCache[node.h].isSensitive = !!mega.sensitives.isSensitive(node);
            }
            else {
                this.cellCache[node.h] = new AlbumTimelineCell({
                    node,
                    clickFn: this.onNodeClick,
                    dbclickFn: this.onNodeDbClick,
                    useMenu: this.interactiveCells
                });
            }

            return this.cellCache[node.h];
        }

        getMonthNodes(rowIndex) {
            if (this._nodes.length <= rowIndex) {
                return [];
            }

            let { monthLabel } = this._nodes[rowIndex];

            while (!monthLabel) {
                rowIndex--;
                monthLabel = this._nodes[rowIndex].monthLabel;
            }

            const handles = [];

            for (let i = rowIndex; i < this._nodes.length; i++) {
                if (i !== rowIndex && this._nodes[i].monthLabel) {
                    break;
                }

                handles.push(...this._nodes[i].list.map(({ h }) => h));
            }

            return handles;
        }

        applyMonthLabel(domNode, label, rowIndex) {
            const checkbox = new MCheckbox({
                id: `timeline-check-${rowIndex}`,
                name: `timeline_check_${rowIndex}`,
                passive: true
            });

            const monthNodes = this.getMonthNodes(rowIndex);
            const sel = Object.keys(this.selections);
            const selSet = new Set(sel);
            let all = sel.length >= monthNodes.length; // Presuming, based on length
            let some = false;

            for (let i = 0; i < monthNodes.length; i++) {
                if (selSet.has(monthNodes[i])) {
                    some = true;
                }
                else if (all) {
                    all = false;
                }

                if (some && !all) {
                    break;
                }
            }

            if (all) {
                checkbox.checked = true;
            }
            else if (some) {
                checkbox.checked = true;
                checkbox.el.firstChild.classList.add('checkboxMinimize');
            }

            checkbox.el.dataset.row = rowIndex;
            checkbox.onChange = (newVal) => {
                checkbox.checked = newVal;

                const nodes = this.getMonthNodes(rowIndex);

                if (newVal) {
                    for (let i = 0; i < nodes.length; i++) {
                        this.selectNode(M.d[nodes[i]], true);
                    }
                }
                else {
                    for (let i = 0; i < nodes.length; i++) {
                        this.deselectNode(M.d[nodes[i]], true);
                    }
                }

                checkbox.el.querySelector('.checkdiv').classList.remove('checkboxMinimize');
            };

            const dateTitle = document.createElement('div');
            dateTitle.classList.add(
                'timeline-date-title',
                'px-2',
                'py-3',
                'flex',
                'flex-row',
                'gap-2',
                'items-center'
            );

            const dateLabel = document.createElement('div');
            dateLabel.classList.add('font-bold', 'text-color-high');
            dateLabel.textContent = label;

            const countLabel = document.createElement('div');
            countLabel.className = 'text-color-medium font-body-2';
            countLabel.textContent = mega.icu.format(l.items_count, monthNodes.length);

            dateTitle.appendChild(checkbox.el);
            dateTitle.appendChild(dateLabel);
            dateTitle.appendChild(countLabel);
            domNode.appendChild(dateTitle);
        }

        removeMonthLabel(domNode) {
            const dateTitle = domNode.querySelector('.timeline-date-title');

            if (dateTitle) {
                domNode.removeChild(dateTitle);
            }
        }

        renderRow(rowKey) {
            const div = document.createElement('div');
            const row = document.createElement('div');
            row.className = 'flex flex-row';

            const toFetchAttributes = [];

            if (this._nodes[rowKey]) {
                const sizePx = `${this.cellSize}px`;
                const { list, monthLabel } = this._nodes[rowKey];

                if (this.showMonthLabel && monthLabel) {
                    this.applyMonthLabel(div, monthLabel, rowKey);
                    div.classList.add('has-month-label');
                }
                else {
                    this.removeMonthLabel(div);
                    div.classList.remove('has-month-label');
                }

                for (let i = 0; i < list.length; i++) {
                    const tCell = this.getCachedCell(list[i]);

                    tCell.el.style.width = sizePx;
                    tCell.el.style.height = sizePx;

                    scope.setShimmering(tCell.el);

                    if (this.selections[list[i].h]) {
                        tCell.isSelected = true;
                    }

                    tCell.isActive = !this.limitReached || tCell.isSelected;

                    row.appendChild(tCell.el);
                    fillAlbumTimelineCell(tCell.el);

                    tCell.el.ref.el = tCell.el;
                    toFetchAttributes.push(tCell.el.ref);
                }
            }

            if (toFetchAttributes.length) {
                delay(`album_timeline:render_row${rowKey}`, () => MegaGallery.addThumbnails(toFetchAttributes));
            }

            div.appendChild(row);

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
                if (albums.grid) {
                    albums.grid.header.update(scope.getAlbumIdFromPath(), Object.keys(this.selections));
                }
                if (mega.ui.mInfoPanel) {
                    mega.ui.mInfoPanel.reRenderIfVisible(Object.keys(this.selections));
                }
            }, 100);
        }

        adjustToBottomBar() {
            delay(
                'album_timeline:adjusting_to_bottom_bar',
                () => {
                    if (this.interactiveCells) {
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

        updateCell(node) {
            const cell = this.cellCache[node.h];

            if (!cell) {
                return;
            }

            cell.isSensitive = !!mega.sensitives.isSensitive(node);
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
