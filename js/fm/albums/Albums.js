lazy(mega.gallery, 'albums', () => {
    'use strict';

    const scope = mega.gallery;

    /**
     * Globally storing disposing callback for convenience
     */
    scope.disposeKeyboardEvents = null;

    /**
     * This is a margin for the cell to render within the row
     * @type {Number}
     */
    scope.cellMargin = 4;

    /**
     * Checking whether an event is being dispatched with Ctrl key in hold
     * @param {Event} evt Event object to check
     * @returns {Boolean}
     */
    scope.getCtrlKeyStatus = ({ ctrlKey, metaKey }) => metaKey || ctrlKey;

    /**
     * How many items can be selected at once when add to an album per batch
     */
    scope.maxSelectionsCount = 1500;

    scope.getAlbumIdFromPath = () => {
        if (M.currentdirid && M.currentdirid.startsWith('albums/')) {
            return M.currentdirid.replace(/^albums\//, '');
        }

        if (pfcol) {
            const albumIds = Object.keys(scope.albums.store);

            for (let i = 0; i < albumIds.length; i++) {
                const { filterFn, p, id } = scope.albums.store[albumIds[i]];

                if (!filterFn && id && p && p.ph === pfid) {
                    return id;
                }
            }
        }

        return '';
    };

    /**
     * Reporting album content download event
     * @returns {void}
     */
    scope.reportDownload = () => {
        if (pfcol) {
            eventlog(99954);
        }

        const onlySelection = scope.albums.grid.timeline && scope.albums.grid.timeline.selCount > 0;
        eventlog((onlySelection) ? 99793 : 99792);
    };

    /**
     * Checking whether an element is in select area, checking if at least two edges are within the area
     * @param {HTMLElement} domEl Dom element
     * @param {Number[]} area Coordinates of the selection
     * @param {Number} containerPadding The left padding of the container
     * @returns {Boolean}
     */
    scope.isInSelectArea = (domEl, [left, right, top, bottom], containerPadding = 0) => {
        const offsetLeft = domEl.offsetLeft + containerPadding;
        const offsetTop = domEl.offsetTop;
        const rightEdge = offsetLeft + domEl.offsetWidth;
        const bottomEdge = offsetTop + domEl.offsetHeight;

        const fitVert = (offsetTop >= top && offsetTop <= bottom) || (bottomEdge >= top && bottomEdge <= bottom);
        const fitHoriz = (offsetLeft <= right && offsetLeft >= left) || (rightEdge >= left && rightEdge <= right);

        return (fitVert && (fitHoriz || offsetLeft < left && rightEdge > right))
            || fitHoriz && offsetTop < top && bottomEdge > bottom && fitHoriz;
    };

    /**
     * Re-initiating the events which are being paused due to dialogs
     * @returns {void}
     */
    scope.reinitiateEvents = () => {
        delay('render:album_events_reinitiate', () => {
            if (scope.albums.grid && !$.dialog) {
                if (M.isAlbumsPage(1)) {
                    scope.albums.grid.attachKeyboardEvents();
                }
                else {
                    const timelineEl = scope.albums.grid.el.querySelector('.album-timeline-main');

                    if (timelineEl) {
                        timelineEl.mComponent.attachKeyboardListener();

                        if (timelineEl.mComponent.dragSelect) {
                            timelineEl.mComponent.dragSelect.disabled = false;
                        }
                    }
                }
            }
        });
    };

    let tmpMv = [];
    let previewMvLength = 0;

    /**
     * Launching the slideshow right away (in fullscreen mode)
     * @param {String} albumId Album ID
     * @param {Boolean} useFullscreen Skipping videos and playing in the fullscreen
     * @param {Boolean} autoplay Whether to start the slideshow right away or not
     * @returns {void}
     */
    scope.playSlideshow = (albumId, useFullscreen, autoplay) => {
        const album = scope.albums.store[albumId];

        if (album && album.nodes.length > 0) {
            const selHandles = (scope.albums.grid && scope.albums.grid.timeline)
                ? Object.keys(scope.albums.grid.timeline.selections)
                : [];
            const firstNode = (selHandles.length)
                ? album.nodes.find((n) => scope.albums.grid.timeline.selections[n.h] && scope.isPreviewable(n))
                : album.nodes.find((n) => !scope.isVideo(n) && scope.isPreviewable(n));

            if (!firstNode) {
                console.warn('Could not find the first node for the slideshow...');
                return;
            }

            if (autoplay) {
                $.autoplay = firstNode.h;
            }

            tmpMv = M.v;
            M.v = [...album.nodes];
            previewMvLength = M.v.length;

            slideshow(firstNode, false);

            scope.albums.removeKeyboardListener();

            delay('toggle:album_slideshow_on', () => {
                if (useFullscreen) {
                    const slideshowBtn = $('.v-btn.slideshow', 'footer');

                    if (slideshowBtn) {
                        slideshowBtn.click();
                    }

                    const fullscreenHandler = () => {
                        if (!document.fullscreenElement) {
                            $('.v-btn.close', 'section.media-viewer-container').click();
                            window.removeEventListener('fullscreenchange', fullscreenHandler);
                        }
                    };

                    window.addEventListener('fullscreenchange', fullscreenHandler);
                }

                const eventsToDisposeOnClose = [];
                const selectModifiers = [
                    '.media-viewer header nav.viewer-bars button.options',
                    '.media-viewer header nav.viewer-bars button.send-to-chat'
                ];
                const modifySelection = () => {
                    $.selected = [slideshow_handle()];
                };

                for (let i = 0; i < selectModifiers.length; i++) {
                    eventsToDisposeOnClose.push(
                        MComponent.listen(selectModifiers[i], 'click', modifySelection)
                    );
                }

                mBroadcaster.once('slideshow:close', () => {
                    M.v = tmpMv;

                    scope.reinitiateEvents();

                    if (window.selectionManager.clearSlideshowSelections) {
                        window.selectionManager.clearSlideshowSelections();
                    }

                    for (let i = 0; i < eventsToDisposeOnClose.length; i++) {
                        eventsToDisposeOnClose[i]();
                    }

                    if (M.isAlbumsPage(1) || !selHandles.length) {
                        window.selectionManager.hideSelectionBar();
                    }
                    else {
                        window.selectionManager.showSelectionBar(
                            mega.icu.format(l.album_selected_items_count, album.nodes.length)
                                .replace('%1', selHandles.length)
                        );
                    }
                });
            });
        }
    };

    /**
     * Checking if the provided nodes qualify for the slideshow action
     * @param {MegaNodep[]} nodes Nodes to check against
     * @returns {Boolean}
     */
    scope.nodesAllowSlideshow = (nodes) => {
        if (nodes.length <= 1) {
            return false;
        }

        let imgCount = 0;

        for (let i = 0; i < nodes.length; i++) {
            if (scope.isImage(nodes[i])) {
                imgCount++;

                if (imgCount > 1) {
                    return true;
                }
            }
        }

        return false;
    };

    /**
     * Fetching all MegaNode handles from specified albums
     * @param {String[]} albumIds ID of albums to fetch handles from
     * @returns {String[]}
     */
    scope.getAlbumsHandles = (albumIds) => {
        const handles = [];

        if (
            albumIds.length === 1
            && albumIds[0] === scope.getAlbumIdFromPath()
            && scope.albums.grid.timeline.selCount > 0
        ) {
            handles.push(...Object.keys(scope.albums.grid.timeline.selections));
        }
        else {
            for (let i = 0; i < albumIds.length; i++) {
                const album = scope.albums.store[albumIds[i]];

                if (album && album.nodes && album.nodes.length) {
                    handles.push(...album.nodes.map(({ h }) => h));
                }
            }
        }

        return handles;
    };

    const timemarks = {
        albumCreateStarted: 0,
        albumItemsSelectStarted: 0,
        albumCreateNamed: 0
    };

    /**
     * Indicates which files should not be considered as raw as of now to match other platforms
     * @type {Object.<String, Boolean>}
     */
    const ignoreRaws = {
        "ARI": true,
        "ARQ": true,
        "BAY": true,
        "BMQ": true,
        "CAP": true,
        "CINE": true,
        "CR3": true,
        "DC2": true,
        "DRF": true,
        "DSC": true,
        "EIP": true,
        "FFF": true,
        "IA": true,
        "KC2": true,
        "MDC": true,
        "OBM": true,
        "ORI": true,
        "PTX": true,
        "PXN": true,
        "QTK": true,
        "RDC": true,
        "RWZ": true,
        "STI": true
    };

    /**
     * This length is being used for identification of the predefined album in the list
     * @type {Number}
     */
    const predefinedKeyLength = 3;

    /**
     * The maximum number of buttons allowed without grouping to `More`
     * @type {Number}
     */
    const headerBtnLimit = 2;

    /**
     * This is the default name to be used when
     * @type {String}
     */
    const defaultAlbumName = l.album_def_name;

    /**
     * How many times to propose default label name before giving up
     * @type {Number}
     */
    const maxLabelPropositions = 10000;

    /**
     * The limit for number of albums on when to make the grid finer
     * @type {Number}
     */
    const bigAlbumCellsLimit = 4;

    /**
     * @type {Number}
     */
    const nameLenLimit = 40;

    /**
     * Storing the name value for just created album
     * @type {String}
     */
    let pendingName = '';

    const isMSync = () => window.useMegaSync === 2 || window.useMegaSync === 3;

    /**
     * @returns {String[]}
     */
    const unwantedHandles = () => MegaGallery.handlesArrToObj([
        ...M.getTreeHandles(M.RubbishID),
        ...M.getTreeHandles('shares')
    ]);

    /**
     * Trimming name if it is too long
     * @param {String} name Name to trim
     * @returns {String}
     */
    const limitNameLength = name => (name.length > nameLenLimit) ? name.substring(0, nameLenLimit) + '...' : name;

    const getAlbumsCount = () => Object.values(scope.albums.store).filter(({ filterFn }) => !filterFn).length;

    const openMainPage = () => {
        M.openFolder('albums');
    };

    /**
     * @param {HTMLElement} el DOM element to apply PerfectScroll to
     * @returns {void}
     */
    const applyPs = (el) => {
        if (el.classList.contains('ps')) {
            Ps.update(el);
        }
        else {
            Ps.initialize(el);
        }
    };

    /**
     * Sorting nodes in a specific album
     * @param {MegaNode[]} nodes Nodes array to sort
     * @returns {void}
     */
    const sortInAlbumNodes = (nodes) => {
        const sort = M.sortByModTimeFn3();
        nodes.sort((a, b) => sort(a, b, -1));
    };

    const debouncedLoadingUnset = () => {
        delay('album:hide_loading_dialog', () => {
            loadingDialog.hide('MegaAlbums');
        });
    };

    /**
     * Updating the album cell if available
     * @param {String} albumId Album id
     * @param {Boolean} sortNodes Whether to re-sort existing nodes or not
     * @param {Boolean} forceCoverUpdate Whether to reset the cover to first node of album
     * @param {Node} coverNode Node that should be used as the cover
     * @returns {void}
     */
    const debouncedAlbumCellUpdate = (albumId, sortNodes = false, forceCoverReset = false, coverNode = undefined) => {
        const album = scope.albums.store[albumId];

        if (!album) {
            return;
        }

        delay('album:' + albumId + ':update_placeholder', () => {
            if (sortNodes) {
                sortInAlbumNodes(album.nodes);
            }

            let coverUpdated = false;

            if (forceCoverReset || !album.nodes.length) {
                album.node = album.nodes[0];
                coverUpdated = true;
            }
            else if (coverNode) {
                album.node = coverNode;
                coverUpdated = true;
            }
            else {
                const shouldUpdateCover = (album.filterFn)
                    ? !album.node || album.nodes[0].h !== album.node.h
                    : !album.node
                        || !album.at.c
                        || !album.eIds[album.at.c]
                        || album.eIds[album.at.c] !== album.node.h
                    ;

                if (shouldUpdateCover) {
                    album.node = album.nodes[0];
                    coverUpdated = true;
                }
            }

            if (album.cellEl) {
                album.cellEl.updatePlaceholders();

                if (coverUpdated) {
                    album.cellEl.updateCoverImage();
                }
            }
        });
    };

    const storeLastActiveTab = () => {
        const activeBtn = document.querySelector('.lp-content-wrap.library-panel > button.active');

        if (!activeBtn) {
            return;
        }

        const activeClass = [...activeBtn.classList].find(c => !!M.fmTabState[c]);

        if (!activeClass) {
            return;
        }

        M.fmTabState[activeClass].prev = M.currentdirid;
        M.lastActiveTab = activeClass;
    };

    /**
     * @param {String} text Text to use inside the toast
     * @returns {HTMLElement}
     */
    const generateToastContent = (text) => {
        const textEl = document.createElement('div');
        textEl.className = 'flex flex-1';
        textEl.textContent = text;

        const content = document.createElement('div');
        content.className = 'flex flex-row items-center px-3 w-full';
        content.appendChild(textEl);

        return content;
    };

    /**
     * Generating the download options menu
     * @param {String[]} albumIds IDs of albums to fetch handles from
     * @returns {Object.<String, any>}
     */
    const generateDownloadOptions = (albumIds) => {
        return [
            {
                label: l[5928],
                icon: 'download-standard',
                click: () => {
                    const handles = scope.getAlbumsHandles(albumIds);

                    if (handles.length) {
                        scope.reportDownload();
                        M.addDownload(handles);
                    }
                }
            },
            {
                label: l[864],
                icon: 'download-zip',
                click: () => {
                    const handles = scope.getAlbumsHandles(albumIds);

                    if (handles.length) {
                        scope.reportDownload();
                        M.addDownload(
                            handles,
                            true,
                            false,
                            albumIds.length > 1 ? 'Album-archive-1' : scope.albums.store[albumIds[0]].label
                        );
                    }
                }
            }
        ];
    };

    /**
     * Generating the download item for context menu
     * @param {String[]} albumIds IDs of target albums
     * @returns {Object.<String, any>}
     */
    const generateDownloadMenuItem = (albumIds) => {
        return {
            label: l.download_option,
            icon: 'download-small',
            click: () => {
                const handles = scope.getAlbumsHandles(albumIds);

                if (handles.length) {
                    scope.reportDownload();
                    M.addDownload(handles);
                }
            },
            children: (isMSync()) ? undefined : generateDownloadOptions(albumIds)
        };
    };

    const fillAlbumCell = (el) => {
        const div = document.createElement('div');
        const titleEl = document.createElement('div');
        el.album.cellEl.countEl = document.createElement('div');

        titleEl.textContent = el.album.label;
        titleEl.className = 'album-label text-ellipsis';
        titleEl.setAttribute('title', el.album.label);

        div.appendChild(titleEl);
        div.appendChild(el.album.cellEl.countEl);

        el.album.cellEl.updatePlaceholders();
        el.appendChild(div);
    };

    /**
     * Sorting albums by given names in attributes
     * @param {String} labelA Album label A
     * @param {String} labelB Album label B
     * @param {String} direction Default is ascending order (1)
     * @returns {Number}
     */
    const sortLabels = (labelA, labelB, direction = 1) => {
        if (labelA < labelB) {
            return -direction;
        }

        if (labelA > labelB) {
            return direction;
        }

        return 0;
    };

    const sortAlbumsArray = (a, b) => {
        if ((a.filterFn && b.filterFn) || a.cts === b.cts) {
            return sortLabels(a.label, b.label);
        }

        if (a.filterFn) {
            return -1;
        }
        else if (b.filterFn) {
            return 1;
        }

        return b.cts - a.cts;
    };

    const sortStore = () => {
        const albumKeys = Object.keys(scope.albums.store);

        albumKeys.sort((keyA, keyB) => sortAlbumsArray(
            scope.albums.store[keyA],
            scope.albums.store[keyB]
        ));

        const obj = Object.create(null);

        for (let i = 0; i < albumKeys.length; i++) {
            obj[albumKeys[i]] = scope.albums.store[albumKeys[i]];
        }

        scope.albums.store = obj;
    };

    /**
     * @param {String} name Album name to check against others
     * @param {String} ignoreId Ignore specific id, ususally it's current Album ID
     * @returns {void}
     */
    const albumNameExists = (name, ignoreId) => Object
        .values(scope.albums.store)
        .some(({ label, id }) => label === name && id !== ignoreId);

    const getFirstUserAlbum = (ignoreId) => {
        const keys = Object.keys(scope.albums.store);

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];

            if (key.length !== predefinedKeyLength && key !== ignoreId) {
                return scope.albums.store[key];
            }
        }

        return null;
    };

    /**
     * Checking whether an album needs to be rendered in the tree and on main page or not
     * @param {Object} album Album data to check
     * @returns {Boolean}
     */
    const albumIsRenderable = ({ filterFn, nodes }) => !filterFn || (Array.isArray(nodes) && nodes.length);

    /**
     * Inserting the album related element in the proper place in the list
     * @param {String} albumId Album ID
     * @param {HTMLElement} domElement DOM element to insert
     * @param {HTMLElement} domContainer DOM element to insert into
     * @param {String} siblingComponentKey key to use in album upon sibling element fetch
     * @returns {void}
     */
    const insertAlbumElement = (albumId, domElement, domContainer, siblingComponentKey) => {
        /**
         * Active album keys
         * @type {String[]}
         */
        const aKeys = [];

        /**
         * All albums keys
         * @type {String[]}
         */
        const keys = Object.keys(scope.albums.store);

        for (let i = 0; i < keys.length; i++) {
            if (albumIsRenderable(scope.albums.store[keys[i]])) {
                aKeys.push(keys[i]);
            }
        }

        const aIndex = aKeys.indexOf(albumId);

        if (aIndex === aKeys.length - 1) {
            domContainer.appendChild(domElement);
        }
        else {
            domContainer.insertBefore(
                domElement,
                scope.albums.store[aKeys[aIndex + 1]][siblingComponentKey].el
            );
        }
    };

    /**
     * Removing the node from album in store
     * @param {String} albumId Album ID
     * @param {String} handle Node handle
     * @returns {void}
     */
    const removeNodeFromAlbum = (albumId, handle) => {
        const album = scope.albums.store[albumId];

        if (!album || (!album.filterFn && !album.eHandles[handle])) {
            return;
        }

        let nodeSpliced = false;

        for (let j = 0; j < album.nodes.length; j++) {
            const { h } = album.nodes[j];

            if (h === handle) {
                album.nodes.splice(j, 1);
                nodeSpliced = true;
                break;
            }
        }

        if (!nodeSpliced) {
            return;
        }

        if (album.filterFn && !album.nodes.length) {
            scope.albums.removeAlbumFromGridAndTree(albumId);
        }

        debouncedAlbumCellUpdate(albumId, false, !!album.node && album.node.h === handle);

        const { grid } = scope.albums;

        if (grid) {
            if (M.isAlbumsPage(1)) {
                delay('album:refresh_main_grid', () => {
                    grid.refresh();
                });
            }
            else if (albumId === scope.getAlbumIdFromPath()) {
                if (grid.timeline) {
                    if (grid.timeline.selections[handle]) {
                        grid.timeline.deselectNode(M.d[handle]);
                    }

                    if (grid.timeline.selCount > 0) {
                        window.selectionManager.showSelectionBar(
                            mega.icu.format(l.album_selected_items_count, album.nodes.length)
                                .replace('%1', grid.timeline.selCount)
                        );
                    }
                    else {
                        window.selectionManager.hideSelectionBar();
                    }
                }

                if (album.nodes.length) {
                    delay('album:' + albumId + ':remove_items', () => {
                        if (grid.timeline) {
                            grid.timeline.nodes = album.nodes;
                        }

                        if (M.currentdirid === albumId) {
                            grid.header.update(albumId);
                        }
                    });
                }
                else if (album.filterFn) {
                    openMainPage();
                    grid.showAllAlbums();
                }
                else {
                    grid.showEmptyAlbumPage(albumId);
                }
            }
        }
    };

    /**
     * Removing the node from album timeline in dialog
     * @param {String} handle Node handle
     * @returns {void}
     */
    const removeNodeFromTimelineDialog = (handle) => {
        const timeline = $.timelineDialog.timeline;

        if (timeline) {
            if (timeline.selections[handle]) {
                timeline.deselectNode(M.d[handle]);
                $.timelineDialog.updateSelectedCount(timeline.selCount);
            }

            delay('timeline_dialog:remove_items', () => {
                timeline.nodes = M.v;
            });
        }
    };

    /**
     * Checking if there is at least one active album available for the list
     * @returns {Boolean}
     */
    const checkIfExpandable = () => Object
        .values(scope.albums.store)
        .some(album => albumIsRenderable(album));

    /**
     * Checking if the provided name is preserved by auto-generated albums
     * @param {String} name The name to check against system values
     * @returns {Boolean}
     */
    const isSystemAlbumName = (name) => {
        name = name.toLowerCase();

        return Object.keys(scope.albums.store)
            .filter(k => k.length === predefinedKeyLength)
            .some(k => scope.albums.store[k].label.toLowerCase() === name);
    };

    /**
     * Proposing the name for a new album based on the default value plus counter
     * @returns {String}
     */
    const proposeAlbumName = () => {
        const currentNames = {};
        const albums = Object.values(scope.albums.store);

        for (let i = 0; i < albums.length; i++) {
            const { label } = albums[i];

            if (label.startsWith(defaultAlbumName)) {
                currentNames[label] = true;
            }
        }

        const namesCount = Object.values(currentNames).length;

        if (!namesCount || !currentNames[defaultAlbumName]) {
            return defaultAlbumName;
        }

        for (let i = 1; i <= maxLabelPropositions; i++) {
            const newName = defaultAlbumName + ' (' + i + ')';

            if (!currentNames[newName]) {
                return newName;
            }
        }

        return '';
    };

    /**
     * Checking which predefined active album is preceding the current one
     * @param {String} albumId Album ID
     * @param {String} elKey Which subelement to use as an active checker
     * @returns {Object.<String, any>?}
     */
    const getPrevActivePredefinedAlbum = (albumId, elKey) => {
        const keys = Object.keys(scope.albums.store).filter(k => k.length === predefinedKeyLength);
        const index = keys.indexOf(albumId);
        let prev = null;

        if (index < 0) {
            return;
        }

        for (let i = 0; i < index; i++) {
            const album = scope.albums.store[keys[i]];

            if (album.nodes && album.nodes.length && album[elKey]) {
                prev = album;
            }
        }

        return prev;
    };

    class AlbumsSelectionManager extends SelectionManager2_DOM {
        constructor(albumId, container, eventHandlers) {
            super(container, eventHandlers);
            this.currentdirid = `albums/${albumId}`;
            this._boundEvents = [];
            this.init();
            this.albumId = albumId;
            this.timeline = container;
        }

        get items() {
            return scope.albums.store[this.albumId] ? scope.albums.store[this.albumId].nodes : [];
        }

        get items_per_row() {
            return scope.AlbumTimeline.zoomSteps[this.timeline.zoomStep];
        }

        clearSlideshowSelections() {
            const cells = scope.albums.grid.timeline ? scope.albums.grid.timeline.cellCache : {};

            for (let i = 0; i < Object.keys(cells).length; i++) {
                const mComponent = cells[Object.keys(cells)[i]];

                if (!mComponent._selected) {
                    mComponent.el.classList.remove('ui-selected');
                }
            }
        }
    }

    class DownloadContextMenu extends MMenuSelect {
        constructor(albumId) {
            super();
            this.options = generateDownloadOptions([albumId]);
        }
    }

    class TimelineDialog extends MDialog {
        hide() {
            if (this.timeline) {
                this.timeline.clear();
                delete this.timeline;
            }

            super.hide();
        }
    }

    class ToCopyInput extends MComponent {
        constructor(isKey) {
            super();

            this.copyResponse = (isKey)
                ? mega.icu.format(l.toast_copy_key, 1)
                : mega.icu.format(l.toast_copy_link, 1);

            const inputIcon = document.createElement('i');
            inputIcon.className = `sprite-fm-mono ${isKey ? 'icon-key' : 'icon-link'}`;
            this.wrap.prepend(inputIcon);
        }

        get value() {
            return this.input.value;
        }

        set value(value) {
            this.input.value = value;
        }

        buildElement() {
            this.el = document.createElement('div');
            this.el.className = 'item-link link flex-1';

            this.wrap = document.createElement('div');
            this.wrap.className = 'input-wrap';

            this.input = document.createElement('input');
            this.input.type = 'text';
            this.input.readOnly = true;
            this.copyBtn = new MButton(
                l[63],
                null,
                () => {
                    copyToClipboard(this.input.value, this.copyResponse);
                },
                'mega-button positive copy current'
            );

            this.wrap.appendChild(this.input);
            this.el.appendChild(this.wrap);
            this.el.appendChild(this.copyBtn.el);
        }
    }

    class RemoveShareDialog extends MDialog {
        constructor(albumIds) {
            super({
                ok: {
                    label: albumIds.length > 1 ? l[8735] : l[6821],
                    callback: () => {
                        scope.albums.removeShare(albumIds);
                    },
                    classes: ['mega-button', 'branded-green']
                },
                cancel: {
                    label: l[82]
                },
                dialogClasses: null,
                leftIcon: 'sprite-fm-uni icon-question icon-size-16',
                doNotShowCheckboxText: l.do_not_show_this_again
            });

            this.setContent(albumIds);
            this.addConfirmationCheckbox(
                () => mega.config.get('nowarnpl'),
                (val) => {
                    const currentVal = !!mega.config.get('nowarnpl');

                    if (val !== currentVal) {
                        mega.config.setn('nowarnpl', val ? 1 : undefined);
                    }
                }
            );
        }

        setContent(albumIds) {
            const p = document.createElement('p');
            p.className = 'px-6';

            p.textContent = mega.icu.format(l.plink_remove_dlg_text_album, albumIds.length);

            this.slot = p;
            this.title = mega.icu.format(l.plink_remove_dlg_title_album, albumIds.length);
        }
    }

    const removeShareWithConfirmation = (albumIds) => {
        if (mega.config.get('nowarnpl')) {
            scope.albums.removeShare(albumIds);
        }
        else {
            const dialog = new RemoveShareDialog(albumIds);
            dialog.show();
        }
    };

    class AlbumShareLinkBlock extends MComponent {
        /**
         * @param {HTMLElement} parent Parent DOM element
         * @param {String} albumId Album id to build the data upon
         * @param {Boolean} [amongOthers] Indicates if the link is in the list by itself or with others
         * @param {Function?} [onRemoveClick] Callback to fire when the remove button is pressed
         */
        constructor(parent, albumId, amongOthers = false, onRemoveClick = null) {
            super(parent);

            this._separated = false;
            this.amongOthers = amongOthers;
            this.album = scope.albums.store[albumId];
            this.onRemoveClick = onRemoveClick;
        }

        get linkString() {
            return this.linkInput.value;
        }

        get keyString() {
            return this.keyInput.value;
        }

        /**
         * @param {Object.<String, any>} album Album to build link for
         * @returns {void}
         */
        set album(album) {
            this._album = album;

            const { label, nodes } = this._album;

            this.labelEl.textContent = label;
            this.countEl.textContent = mega.icu.format(l.album_items_count, nodes.length);
            this.updateInputValue();
        }

        /**
         * @param {Boolean} status Whether the key should be separated or not
         */
        set keySeparated(status) {
            if (this._separated === status) {
                return;
            }

            this._separated = status;

            if (status) {
                if (this.keyInput) {
                    return;
                }

                this.linkInput.el.classList.add('mr-4');
                this.keyInput = new ToCopyInput(true);
                this.keyInput.value = a32_to_base64(decrypt_key(u_k_aes, base64_to_a32(this._album.k)));
                this.flexContainer.appendChild(this.keyInput.el);
                this.updateInputValue();
            }
            else {
                if (!this.keyInput) {
                    return;
                }

                this.keyInput.detachEl();
                delete this.keyInput;
                this.linkInput.el.classList.remove('mr-4');
                this.updateInputValue();
            }
        }

        updateInputValue() {
            const { p: { ph }, k } = this._album;

            let value = `${getBaseUrl()}/collection/${ph}`;

            if (!this._separated) {
                value += `#${a32_to_base64(decrypt_key(u_k_aes, base64_to_a32(k)))}`;
            }

            this.linkInput.value = value;
        }

        buildElement() {
            this.el = document.createElement('div');
            this.el.className = 'bg-surface-main p-3 mt-2 border-radius-1';

            const headerContainer = document.createElement('div');
            headerContainer.className = 'relative';
            const header = document.createElement('div');
            header.className = 'flex flex-row items-center max-w-full w-min-content mb-2 pr-28';

            const icon = document.createElement('i');
            icon.className = 'sprite-fm-mono icon-album icon-blue icon-size-5 mx-2';

            const separator = document.createElement('i');
            separator.className = 'sprite-fm-mono icon-dot icon-size-3 mt-1 mx-1';

            this.labelEl = document.createElement('div');
            this.labelEl.className = 'flex-1 text-ellipsis';
            this.countEl = document.createElement('span');
            this.countEl.className = 'white-space-nowrap';

            header.appendChild(icon);
            header.appendChild(this.labelEl);
            header.appendChild(separator);
            header.appendChild(this.countEl);
            headerContainer.appendChild(header);

            this.flexContainer = document.createElement('div');
            this.flexContainer.className = 'flex flex-row';

            this.linkInput = new ToCopyInput();

            this.flexContainer.appendChild(this.linkInput.el);
            this.el.appendChild(headerContainer);
            this.el.appendChild(this.flexContainer);
        }

        dispose() {
            if (this.keyInput) {
                this.keyInput.detachEl();
                delete this.keyInput;
            }

            this.linkInput.detachEl();
            delete this.linkInput;

            this.detachEl();
        }
    }

    class AlbumShareLinksList extends MComponent {
        /**
         * @param {String[]} albumIds Album ids to insert into the list
         * @param {Function} onDismiss Callback to fire when the list is not needed anymore
         */
        constructor(albumIds, onDismiss) {
            super();

            if (Array.isArray(albumIds) && albumIds.length) {
                this.albumIds = albumIds;
            }

            this.onDismiss = onDismiss;
        }

        /**
         * @param {String} albumIds The array of album ids to build links for
         */
        set albumIds(albumIds) {
            this.clearList();

            const { store } = scope.albums;
            const ids = albumIds.filter(id => store[id] && !store[id].filterFn);
            this.isMultiple = ids.length > 1;

            for (let i = 0; i < ids.length; i++) {
                this._shares.push(new AlbumShareLinkBlock(
                    this.el.firstElementChild,
                    ids[i],
                    this.isMultiple,
                    () => {
                        if (!this.isMultiple && typeof this.onDismiss === 'function') {
                            this.onDismiss();
                        }
                    }
                ));
            }

            this._keysSeparated = false;
            this.updateCopyButtons();
        }

        /**
         * @param {Boolean} status Either shares keys should be separated or not
         */
        set keysSeparated(status) {
            this._keysSeparated = status;

            for (let i = 0; i < this._shares.length; i++) {
                this._shares[i].keySeparated = status;
            }

            this.updateCopyButtons();
        }

        updateCopyButtons() {
            if (this.isMultiple) {
                const label = this._keysSeparated ? l[23625] : l[20840];

                if (!this.copyLinksBtn) {
                    const container = document.createElement('div');
                    container.className = 'flex flex-row justify-end pt-4 gap-4 px-12';

                    this.copyLinksBtn = new MButton(
                        label,
                        null,
                        () => {
                            copyToClipboard(
                                this._shares.map(s => s.linkString).join("\n"),
                                mega.icu.format(l.toast_copy_link, this._shares.length)
                            );
                        },
                        'mega-button positive copy current'
                    );

                    container.appendChild(this.copyLinksBtn.el);
                    this.el.appendChild(container);
                }
                else if (label !== this.copyLinksBtn.label) {
                    this.copyLinksBtn.label = label;
                }

                if (this._keysSeparated) {
                    if (!this.copyLinksBtn.el.nextElementSibling) {
                        this.copyKeysBtn = new MButton(
                            l[23624],
                            null,
                            () => {
                                copyToClipboard(
                                    this._shares.map(s => s.keyString).join("\n"),
                                    mega.icu.format(l.toast_copy_key, this._shares.length)
                                );
                            },
                            'mega-button positive copy current'
                        );

                        this.copyLinksBtn.el.insertAdjacentElement('afterend', this.copyKeysBtn.el);
                    }
                }
                else if (this.copyLinksBtn.el.nextElementSibling) {
                    this.copyLinksBtn.el.parentNode.removeChild(this.copyLinksBtn.el.nextElementSibling);
                }
            }
            else {
                this.clearCopyButtons();
            }
        }

        clearCopyButtons() {
            if (this.copyLinksBtn) {
                this.copyLinksBtn.detachEl();
                delete this.copyLinksBtn;

                if (this.copyKeysBtn) {
                    this.copyKeysBtn.detachEl();
                    delete this.copyKeysBtn;
                }
            }
        }

        buildElement() {
            this.el = document.createElement('div');

            const scrollable = document.createElement('div');
            scrollable.className = 'max-h-100 px-12 overflow-y-hidden';

            this.el.appendChild(scrollable);

            delay('share_dialog:apply_scrollable', () => {
                applyPs(scrollable);
            }, 100);
        }

        clearList() {
            if (Array.isArray(this._shares) && this._shares.length) {
                for (let i = 0; i < this._shares.length; i++) {
                    this._shares[i].dispose();
                }
            }

            this._shares = [];
            this.clearCopyButtons();
        }
    }

    class AlbumShareDialog extends MDialog {
        constructor(albumIds) {
            super({
                ok: false,
                cancel: false,
                dialogClasses: 'export-links-dialog'
            });

            this.setContent(albumIds);
        }

        setContent(albumIds) {
            this.slot = document.createElement('div');
            this.title = mega.icu.format(l.album_share_link, albumIds.length);

            const divTop = document.createElement('div');
            divTop.className = 'pb-6 pt-2 px-12 flex flex-row';
            const divBottom = document.createElement('div');
            divBottom.className = 'py-6 bg-surface-grey-1';

            const checkbox = new MCheckbox({
                label: mega.icu.format(l.album_share_link_checkbox_label, albumIds.length),
                id: 'album-link-export',
                checked: false
            });

            const hint = new MHint({
                title: l[1028],
                text: mega.icu.format(l.export_link_decrypt_tip, albumIds.length),
                img: 'illustration sprite-fm-illustration img-dialog-decryption-key',
                link: 'https://help.mega.io/files-folders/sharing/encrypted-links',
                classes: 'icon-size-6 cursor-pointer mx-2'
            });

            this.list = new AlbumShareLinksList(
                albumIds,
                () => {
                    this.hide();
                }
            );

            checkbox.onChange = (checked) => {
                this.list.keysSeparated = checked;
            };

            divTop.appendChild(checkbox.el);
            divTop.appendChild(hint.el);
            divBottom.appendChild(this.list.el);

            this.slot.appendChild(divTop);
            this.slot.appendChild(divBottom);
        }

        hide() {
            this.list.clearList();
            this.list.detachEl();

            super.hide();
        }
    }

    class AlbumItemsDialog extends TimelineDialog {
        constructor(albumId, keepEnabled) {
            super({
                ok: {
                    label: l.album_done,
                    callback: () => {
                        const album = scope.albums.store[albumId];
                        this.confirmed = true;

                        if (this.timeline && album) {
                            const handles = Object.keys(this.timeline.selections);

                            if (handles.length > 0) {
                                const existingHandles = {};
                                const handlesToAdd = [];

                                const { nodes, label, k } = album;
                                let addedCount = 0;

                                for (let i = 0; i < nodes.length; i++) {
                                    existingHandles[nodes[i].h] = true;

                                    if (scope.isVideo(nodes[i])) {
                                        this.currentVideosCount++;
                                    }
                                    else {
                                        this.currentImagesCount++;
                                    }
                                }

                                for (let i = 0; i < handles.length; i++) {
                                    const h = handles[i];

                                    if (!existingHandles[h]) {
                                        addedCount++;
                                        handlesToAdd.push({ h, o: (nodes.length + handlesToAdd.length + 1) * 1000 });

                                        if (M.d[h] && scope.isVideo(M.d[h])) {
                                            this.videosCount++;
                                        }
                                        else {
                                            this.imagesCount++;
                                        }
                                    }
                                }

                                if (addedCount > 0) {
                                    loadingDialog.show('MegaAlbumsAddItems');

                                    mega.sets.elements.bulkAdd(handlesToAdd, albumId, k)
                                        .then(() => {
                                            toaster.main.show({
                                                icons: ['sprite-fm-mono icon-check-circle text-color-medium'],
                                                content: mega.icu
                                                    .format(l.album_added_items_status, addedCount)
                                                    .replace('%s', limitNameLength(label))
                                            });

                                            if (M.isAlbumsPage(1)) {
                                                M.openFolder(`albums/${albumId}`);
                                            }
                                        })
                                        .catch(() => {
                                            console.error(`Cannot add items to album ${albumId}`);
                                        })
                                        .finally(() => {
                                            loadingDialog.hide('MegaAlbumsAddItems');
                                        });
                                }
                            }
                        }
                    }
                },
                cancel: true,
                dialogClasses: 'album-items-dialog',
                contentClasses: 'px-1',
                onclose: () => {
                    const seqEnd = Date.now();

                    if (timemarks.albumCreateNamed) {
                        delay(
                            'albums_stat_99828',
                            eventlog.bind(null, 99828, JSON.stringify({
                                videosCount: this.videosCount,
                                imagesCount: this.imagesCount,
                                start: timemarks.albumCreateStarted,
                                end: seqEnd,
                                lifetime: seqEnd - timemarks.albumCreateStarted
                            }))
                        );
                    }
                    else if (this.confirmed && (this.videosCount || this.imagesCount)) {
                        delay(
                            'albums_stat_99827',
                            eventlog.bind(null, 99827, JSON.stringify({
                                videosCount: this.videosCount,
                                imagesCount: this.imagesCount,
                                totalImagesCount: this.currentImagesCount + this.imagesCount,
                                totalVideosCount: this.currentVideosCount + this.videosCount,
                                start: timemarks.albumItemsSelectStarted,
                                end: seqEnd,
                                lifetime: seqEnd - timemarks.albumItemsSelectStarted
                            }))
                        );
                    }

                    timemarks.albumCreateNamed = 0;
                    timemarks.albumItemsSelectStarted = 0;
                    scope.reinitiateEvents();
                    delete $.timelineDialog;
                }
            });

            this.videosCount = 0;
            this.imagesCount = 0;
            this.currentVideosCount = 0;
            this.currentImagesCount = 0;
            this.confirmed = false;

            this.setContent(scope.albums.store[albumId].label);
            this.keepEnabled = keepEnabled;
            this._title.classList.add('text-center');
            this.albumId = albumId;
            $.timelineDialog = this;
        }

        setContent(albumName) {
            this.slot = document.createElement('div');
            this.slot.className = 'relative';
            this.title = l.add_items_to_album.replace('%s', albumName);
        }

        updateSelectedCount(count) {
            if (count) {
                this.actionTitle = mega.icu.format(l.selected_items_count, count);
                this.enable();
            }
            else {
                this.actionTitle = l.no_selected_items;

                if (!this.keepEnabled) {
                    this.disable();
                }
            }
        }

        onMDialogShown() {
            document.activeElement.blur();
            this.updateSelectedCount(0);

            if (scope.albums.grid && scope.albums.grid.timeline && scope.albums.grid.timeline.dragSelect) {
                scope.albums.grid.timeline.dragSelect.disabled = true;
            }

            this.timeline = new scope.AlbumTimeline({
                onSelectToggle: () => {
                    delay(
                        'timeline:update_selected_count',
                        () => {
                            this.updateSelectedCount(this.timeline.selCount);
                        },
                        50
                    );
                },
                containerClass: 'album-timeline-dialog px-2 py-1',
                sidePadding: 8,
                showMonthLabel: true,
                skipGlobalZoom: true,
                selectionLimit: scope.maxSelectionsCount
            });

            const cameraTree = MegaGallery.getCameraHandles();
            const galleryNodes = {
                all: [],
                cd: [],
                cu: []
            };

            for (let i = 0; i < M.v.length; i++) {
                const n = M.v[i];
                let isGalleryNode = false;

                // Checking if it is a gallery node and if is located specifically in CU or in CD
                if (scope.sections[scope.secKeys.cdphotos].filterFn(n, cameraTree)) {
                    galleryNodes.cd.push(n);
                    isGalleryNode = true;
                }

                else if (scope.sections[scope.secKeys.cuphotos].filterFn(n, cameraTree)) {
                    galleryNodes.cu.push(n);
                    isGalleryNode = true;
                }

                if (isGalleryNode) {
                    galleryNodes.all.push(n);
                }
            }

            if (galleryNodes.cu.length > 0 && galleryNodes.cd.length > 0) {
                const nav = new MTabs();
                nav.el.classList.add('locations-dialog-nav');

                nav.tabs = [
                    {
                        label: l.gallery_all_locations,
                        click: () => {
                            nav.activeTab = 0;
                            this.timeline.nodes = galleryNodes.all;
                        }
                    },
                    {
                        label: l.gallery_from_cloud_drive,
                        click: () => {
                            nav.activeTab = 1;
                            this.timeline.nodes = galleryNodes.cd;
                        }
                    },
                    {
                        label: l.gallery_camera_uploads,
                        click: () => {
                            nav.activeTab = 2;
                            this.timeline.nodes = galleryNodes.cu;
                        }
                    }
                ];

                nav.activeTab = 0;
                this.slot.appendChild(nav.el);
            }
            else {
                const div = document.createElement('div');
                div.className = 'text-center timeline-location';
                div.textContent = (galleryNodes.cu.length > 0)
                    ? l.on_camera_uploads
                    : l.on_cloud_drive;

                this.slot.appendChild(div);
            }

            this.slot.appendChild(this.timeline.el);

            delay('render:album_timeline', () => {
                if (this.timeline) {
                    this.timeline.nodes = galleryNodes.all;
                }
            });

            timemarks.albumItemsSelectStarted = Date.now();
            mBroadcaster.once('closedialog', scope.reinitiateEvents);
        }
    }

    class AlbumCoverDialog extends TimelineDialog {
        constructor(albumId) {
            super({
                ok: {
                    label: l.album_done,
                    callback: () => {
                        if (this.timeline && this.timeline.selCount) {
                            scope.albums.updateAlbumCover(
                                scope.albums.store[this.albumId],
                                Object.keys(this.timeline.selections)[0]
                            );
                        }
                    }
                },
                cancel: true,
                dialogClasses: 'album-items-dialog',
                contentClasses: 'px-1',
                onclose: () => {
                    scope.reinitiateEvents();
                    delete $.timelineDialog;
                }
            });

            this.setContent();
            this._title.classList.add('text-center');
            this.albumId = albumId;
            $.timelineDialog = this;
        }

        setContent() {
            this.slot = document.createElement('div');
            this.title = l.set_album_cover;
        }

        onMDialogShown() {
            let isLoaded = false;

            if (scope.albums.grid && scope.albums.grid.timeline && scope.albums.grid.timeline.dragSelect) {
                scope.albums.grid.timeline.dragSelect.disabled = true;
            }

            this.timeline = new scope.AlbumTimeline({
                onSelectToggle: () => {
                    delay('album:cover_update', () => {
                        if (this.timeline.selCount === 1 && isLoaded) {
                            this.enable();
                        }
                        else {
                            isLoaded = true;
                            this.disable();
                        }
                    }, 100);
                },
                containerClass: 'album-timeline-dialog px-2 py-1',
                sidePadding: 8,
                showMonthLabel: false,
                skipGlobalZoom: true,
                selectionLimit: 1
            });

            const { nodes, eIds, at: { c } } = scope.albums.store[this.albumId];

            if (nodes && nodes.length) {
                this.timeline.selectNode(
                    (c && eIds[c] && M.d[eIds[c]] && M.getNodeRoot(M.d[eIds[c]].p) !== M.RubbishID)
                        ? M.d[eIds[c]]
                        : nodes[0]
                );
            }

            this.slot.appendChild(this.timeline.el);

            delay('render:album_timeline', () => {
                if (this.timeline) {
                    this.timeline.nodes = nodes;
                }
            });

            mBroadcaster.once('closedialog', scope.reinitiateEvents);

            this.disable();
        }
    }

    class RemoveAlbumDialog extends MDialog {
        /**
         * @param {String[]} albumIds The IDs array for albums to be removed
         */
        constructor(albumIds) {
            const isMultiple = albumIds.length > 1;

            super({
                ok: {
                    label: (isMultiple) ? l.delete_albums_confirmation : l.delete_album_confirmation,
                    callback: () => {
                        let albumLabel = '';

                        const promises = [];
                        const stats = { count: getAlbumsCount() };

                        for (let i = 0; i < albumIds.length; i++) {
                            const albumId = albumIds[i];
                            const album = scope.albums.store[albumId];

                            if (!album || album.filterFn) {
                                return;
                            }

                            if (!albumLabel) {
                                albumLabel = album.label;
                            }

                            if (pendingName && album.label === pendingName) {
                                pendingName = '';
                            }

                            loadingDialog.show('AlbumRemoval');

                            promises.push(
                                mega.sets.remove(album.id)
                                    .then((res) => {
                                        delay(
                                            'albums_stat_99916_' + album.id,
                                            eventlog.bind(null, 99916, JSON.stringify({
                                                elCount: album.nodes.length,
                                                albumCount: --stats.count,
                                            }))
                                        );

                                        return Promise.resolve(res);
                                    })
                                    .catch(() => {
                                        console.error(`Could not remove album ${album.id}...`);
                                    })
                            );
                        }

                        Promise.all(promises)
                            .then(() => {
                                let toastText = mega.icu.format(l.albums_removed_status, albumIds.length);

                                if (!isMultiple) {
                                    toastText = toastText.replace('%s', limitNameLength(albumLabel));
                                }

                                const content = generateToastContent(toastText);

                                toaster.main.show({
                                    icons: ['sprite-fm-mono icon-bin text-color-medium'],
                                    content
                                });
                            })
                            .finally(() => {
                                loadingDialog.hide('AlbumRemoval');
                            });
                    },
                    classes: ['mega-button', 'branded-red']
                },
                cancel: true,
                dialogClasses: null,
                leftIcon: 'warning sprite-fm-uni icon-warning icon-size-16'
            });

            this.setContent(isMultiple);
        }

        setContent(isMultiple) {
            const p = document.createElement('p');
            p.className = 'px-6';

            p.textContent = (isMultiple) ? l.delete_albums_dialog_body : l.delete_album_dialog_body;

            this.slot = p;
            this.title = (isMultiple) ? l.delete_albums_dialog_title : l.delete_album_dialog_title;
        }
    }

    class RemoveAlbumItemsDialog extends MDialog {
        constructor(handles) {
            super({
                ok: {
                    label: l.remove_album_elements_btn,
                    callback: () => {
                        scope.albums.removeElementsByHandles(handles);
                    },
                    classes: ['mega-button', 'branded-red']
                },
                cancel: {
                    label: l.remove_album_elements_cancel
                },
                dialogClasses: null,
                leftIcon: 'warning sprite-fm-uni icon-warning icon-size-16'
            });

            this.setContent(handles);
        }

        setContent(handles) {
            const p = document.createElement('p');
            p.className = 'px-6';

            p.textContent = mega.icu.format(l.remove_album_elements_text, handles.length);

            this.slot = p;
            this.title = mega.icu.format(l.remove_album_elements_title, handles.length);
        }
    }

    class AlbumNameDialog extends MDialog {
        constructor(albumId, okFn, closeFn) {
            super({
                ok: {
                    label: albumId ? l.album_rename_btn_label : l.album_create_btn_label,
                    callback: () => {
                        const { value } = this.input;
                        const { err, isDisabled } = this.validateInput(albumId);

                        if (mega.sets && !err && !isDisabled) {
                            this.okBtn.loading = true;

                            if (okFn) {
                                okFn(value);
                            }
                            else if (albumId) {
                                mega.sets.updateAttrValue(
                                    {
                                        at: scope.albums.store[albumId].at,
                                        k: scope.albums.store[albumId].k,
                                        id: albumId
                                    },
                                    'n',
                                    value
                                ).then(() => {
                                    const album = scope.albums.store[albumId];

                                    if (album) {
                                        album.label = value;

                                        if (album.cellEl) {
                                            album.cellEl.updateName();
                                        }

                                        if (album.button) {
                                            album.button.label = value;
                                        }
                                    }

                                    this.hide();
                                }).catch(() => {
                                    this.okBtn.loading = false;
                                    // Show an error?
                                });
                            }
                            else {
                                scope.albums.tree.setPendingButton(value);
                                scope.albums.grid.setPendingCell(value);
                                pendingName = value;

                                timemarks.albumCreateNamed = Date.now();

                                delay(
                                    'albums_stat_99826',
                                    eventlog.bind(null, 99826, JSON.stringify({
                                        albumsCount: getAlbumsCount() + 1,
                                        start: timemarks.albumCreateStarted,
                                        end: timemarks.albumCreateNamed,
                                        lifetime: timemarks.albumCreateNamed - timemarks.albumCreateStarted
                                    }))
                                );

                                mega.sets.add(value)
                                    .then(() => {
                                        this.hide();
                                    })
                                    .catch(() => {
                                        // Show an error?
                                        this.okBtn.loading = false;
                                    });
                            }
                        }

                        return false;
                    }
                },
                cancel: true,
                dialogClasses: 'create-folder-dialog',
                contentClasses: 'px-2',
                onclose: () => {
                    scope.reinitiateEvents();

                    if (closeFn) {
                        queueMicrotask(closeFn);
                    }
                }
            });

            this.albumId = albumId;
            this.setContent(albumId);

            this.disposeInputListener = MComponent.listen(this.input, 'input', () => {
                this.triggerInputSaveguard();
            });
            this._title.classList.add('text-center');

            scope.albums.removeKeyboardListener();

            if (!albumId) {
                timemarks.albumCreateStarted = Date.now();
            }
            mBroadcaster.once('closedialog', scope.reinitiateEvents);
        }

        triggerInputSaveguard() {
            const { err, warn, isDisabled } = this.validateInput(this.albumId);

            if (err) {
                this.disable();
                this.showError(err);
            }
            else if (isDisabled) {
                this.disable();
            }
            else {
                this.enable();
            }

            if (!err && warn) {
                this.showWarning(warn);
            }

            if (!err && !warn) {
                this.clearHint();
            }
        }

        setNames(names) {
            this.existingNames = names;
        }

        setContent(albumId) {
            this.slot = document.createElement('div');
            this.slot.className = 'px-6';

            const div = document.createElement('div');
            div.className = 'create-album-input-bl';

            const inputIcon = document.createElement('i');
            inputIcon.className = 'sprite-fm-mono icon-album icon-size-6';

            this.input = document.createElement('input');
            this.input.setAttribute('placeholder', 'Album name');
            this.input.setAttribute('autofocus', '');
            this.input.setAttribute('type', 'text');

            if (albumId && scope.albums.store[albumId]) {
                this.input.value = scope.albums.store[albumId].label;
                this.title = l.edit_album_name;
            }
            else {
                const name = proposeAlbumName();

                this.title = l.enter_album_name;
                this.input.value = name;

                if (!name) {
                    this.disable();
                }
            }

            div.appendChild(inputIcon);
            div.appendChild(this.input);
            this.slot.appendChild(div);
        }

        validateInput(albumId) {
            const { value } = this.input;

            const validation = {
                isDisabled: false,
                err: null,
                warn: null
            };


            if (!value
                || typeof value !== 'string'
                || value.trim() === ''
                || typeof albumId === 'string' && value === scope.albums.store[albumId].label) {
                validation.isDisabled = true;
            }

            // Cases for errors
            switch (true) {
                case value.length > 250:
                    validation.err = l.album_name_too_long;
                    break;
                case value.trim().length && !M.isSafeName(value):
                    validation.err = l[24708];
                    break;
                case isSystemAlbumName(value):
                    validation.err = l.album_name_not_allowed;
                    break;
                case (this.existingNames && this.existingNames[value]) || albumNameExists(value, albumId):
                    validation.err = l.album_name_exists;
                    break;
                case pfcol && scope.takenNames && scope.takenNames[value]:
                    validation.err = l.album_exists_in_account.replace('%s', value);
                    break;
                default: break;
            }

            if (value.length !== value.trim().length) {
                validation.warn = l.album_name_contains_extra_spaces;
            }

            return validation;
        }

        showHint(text, className) {
            if (!this.hint) {
                this.hint = document.createElement('div');
                this.slot.appendChild(this.hint);
            }

            this.hint.className = className;
            this.hint.textContent = text;
        }

        showError(err) {
            this.input.classList.add('error');
            this.showHint(err, 'duplicated-input-warning');
            $('.create-album-input-bl').addClass('duplicated');
        }

        showWarning(warn) {
            this.showHint(warn, 'whitespaces-input-warning');
        }

        clearHint() {
            this.input.classList.remove('error');
            $('.create-album-input-bl').removeClass('duplicated');

            if (this.hint) {
                this.slot.removeChild(this.hint);
                delete this.hint;
            }
        }

        onMDialogShown() {
            this.triggerInputSaveguard();

            delay('focus:new_album_input', () => {
                this.input.focus();
                this.input.select();
            }, 200);
        }

        hide() {
            super.hide();
            this.disposeInputListener();
        }
    }

    Object.defineProperty(AlbumNameDialog, 'prompt', {
        value(albumId, names) {
            return new Promise((resolve) => {
                const dialog = new AlbumNameDialog(
                    albumId,
                    (name) => {
                        dialog.hide();
                        return resolve(name);
                    },
                    () => resolve(null)
                );

                if (names) {
                    dialog.setNames(names);
                }

                dialog.show();
            });
        }
    });

    class NoMediaForAlbums extends MEmptyPad {
        constructor() {
            super();
            this.setContents();
        }

        setContents() {
            this.el.appendChild(MEmptyPad.createIcon('section-icon sprite-fm-theme icon-gallery-photos'));
            this.el.appendChild(MEmptyPad.createTxt(l.album_no_media, 'fm-empty-cloud-txt empty-albums-title'));
            this.el.appendChild(MEmptyPad.createTxt(l.empty_album_subtitle, 'fm-empty-description'));

            this.appendOptions([
                [l.empty_album_instruction_1, 'sprite-fm-mono icon-camera-uploads'],
                [l.empty_album_instruction_2, 'sprite-fm-mono icon-mobile'],
                [l.empty_album_instruction_3, 'sprite-fm-mono icon-pc']
            ]);
        }
    }

    class NoMediaNoAlbums extends MEmptyPad {
        constructor() {
            super();
            this.setContents();
        }

        setContents() {
            this.el.appendChild(MEmptyPad.createIcon('section-icon sprite-fm-theme icon-gallery-photos'));
            this.el.appendChild(MEmptyPad.createTxt(l.no_albums, 'fm-empty-cloud-txt empty-albums-title'));
            this.el.appendChild(MEmptyPad.createTxt(l.gallery_get_start, 'fm-empty-description'));

            this.appendOptions([
                [l.empty_album_instruction_1, 'sprite-fm-mono icon-camera-uploads'],
                [l.empty_album_instruction_2, 'sprite-fm-mono icon-mobile'],
                [l.empty_album_instruction_3, 'sprite-fm-mono icon-pc']
            ]);
        }
    }

    class AlbumsEmpty {
        constructor(title, btnLabel, buttonFn) {
            this.el = document.createElement('div');
            this.el.className = 'text-center flex flex-column justify-center empty-albums-section';

            this.setContents(title, btnLabel, buttonFn);
        }

        setContents(title, btnLabel, buttonFn) {
            const icon = document.createElement('i');
            icon.className = 'sprite-fm-theme icon-gallery-photos';

            const titleEl = document.createElement('div');
            titleEl.className = 'fm-empty-cloud-txt empty-albums-title';
            titleEl.textContent = title;

            this.el.appendChild(icon);
            this.el.appendChild(titleEl);

            if (!btnLabel) {
                return;
            }

            const button = new MButton(
                btnLabel,
                null,
                buttonFn,
                'mega-button large positive'
            );
            this.el.appendChild(button.el);
        }
    }

    class MultipleAlbumsContextMenu extends MMenuSelect {
        constructor(domCells) {
            super();

            const options = [];
            const albums = [];
            let somePredefined = false;
            let someContainNodes = false;
            let sharedCount = 0;
            let allShared = true;

            for (let i = 0; i < domCells.length; i++) {
                const { album } = domCells[i];

                if (!somePredefined && album.filterFn) {
                    somePredefined = true;
                }

                if (!someContainNodes && album.nodes.length > 0) {
                    someContainNodes = true;
                }

                if (album.p) {
                    sharedCount++;
                }

                if (allShared && !album.p) {
                    allShared = false;
                }

                albums.push(album);
            }

            if (!somePredefined) {
                if (allShared) {
                    options.push(
                        {
                            label: l[17520],
                            icon: 'link',
                            click: () => {
                                const albumIds = [];

                                for (let i = 0; i < albums.length; i++) {
                                    const { p, id } = albums[i];

                                    if (p) {
                                        albumIds.push(id);
                                    }
                                }

                                const dialog = new AlbumShareDialog(albumIds);
                                dialog.show();
                            }
                        }
                    );
                }
                else {
                    options.push({
                        label: mega.icu.format(l.album_share_link, albums.length),
                        icon: 'link',
                        click: () => {
                            scope.albums.addShare(albums.map(({ id }) => id));
                        }
                    });
                }

                if (sharedCount) {
                    options.push({
                        label: (sharedCount > 1) ? l[8735] : l[6821],
                        icon: 'link-remove',
                        click: () => {
                            const albumIds = [];

                            for (let i = 0; i < albums.length; i++) {
                                const { p, id } = albums[i];

                                if (p) {
                                    albumIds.push(id);
                                }
                            }

                            if (albumIds.length) {
                                removeShareWithConfirmation(albumIds);
                            }
                        }
                    });
                }

                if (someContainNodes) {
                    options.push({});
                }
            }

            if (someContainNodes) {
                options.push(generateDownloadMenuItem(albums.map(({ id }) => id)));
            }

            if (!somePredefined) {
                options.push(
                    {},
                    {
                        label: l.delete_album,
                        click: () => {
                            const dialog = new RemoveAlbumDialog(albums.map(({ id }) => id));
                            dialog.show();
                            this.hide();
                        },
                        icon: 'bin',
                        classes: ['red']
                    }
                );
            }

            this.options = options;
        }
    }

    class AlbumOptionsContextMenu extends MMenuSelect {
        constructor(options) {
            super();
            this.options = options;
        }
    }

    class AlbumContextMenu extends MMenuSelect {
        constructor(albumId, isPublic) {
            super();

            const options = [];
            const { nodes, p, filterFn } = scope.albums.store[albumId];
            const isUserAlbum = !filterFn;

            if (scope.nodesAllowSlideshow(nodes)) {
                options.push({
                    label: l.album_play_slideshow,
                    icon: 'play-square',
                    click: () => {
                        if (scope.albums.grid && scope.albums.grid.timeline) {
                            scope.albums.grid.timeline.clearSiblingSelections();
                        }

                        $.selected = [];
                        scope.playSlideshow(albumId, true);
                    }
                });
            }

            if (isPublic) {
                if (nodes.length) {
                    options.push(
                        {},
                        generateDownloadMenuItem([albumId]),
                        {},
                        {
                            label: (u_type) ? l.context_menu_import : l.btn_imptomega,
                            icon: (u_type) ? 'upload-to-cloud-drive' : 'mega-thin-outline',
                            click: () => {
                                eventlog(99831);
                                M.importFolderLinkNodes([M.RootID]);
                            }
                        }
                    );
                }
            }
            else {
                if (M.currentdirid !== `albums/${albumId}`) {
                    options.push(
                        {
                            label: l.album_open,
                            icon: 'preview-reveal',
                            click: () => {
                                M.openFolder(`albums/${albumId}`);
                            }
                        }
                    );
                }

                if (isUserAlbum) {
                    options.push(
                        {},
                        {
                            label: l.add_album_items,
                            icon: 'add',
                            click: () => {
                                const dialog = new AlbumItemsDialog(albumId);
                                dialog.show();
                            }
                        },
                        {}
                    );

                    if (p) {
                        options.push(
                            {
                                label: l[6909],
                                icon: 'link',
                                click: () => {
                                    const dialog = new AlbumShareDialog([albumId]);
                                    dialog.show();
                                }
                            },
                            {
                                label: l[6821],
                                icon: 'link-remove',
                                click: () => {
                                    removeShareWithConfirmation([albumId]);
                                }
                            }
                        );
                    }
                    else {
                        options.push({
                            label: mega.icu.format(l.album_share_link, 1),
                            icon: 'link',
                            click: () => {
                                scope.albums.addShare([albumId]);
                            }
                        });
                    }

                    options.push({});

                    if (nodes.length) {
                        options.push(
                            generateDownloadMenuItem([albumId]),
                            {
                                label: l.set_album_cover,
                                icon: 'images',
                                click: () => {
                                    const dialog = new AlbumCoverDialog(albumId);
                                    dialog.show();
                                }
                            }
                        );
                    }

                    options.push(
                        {
                            label: l.rename_album,
                            click: () => {
                                const dialog = new AlbumNameDialog(albumId);
                                dialog.show();
                            },
                            icon: 'rename'
                        },
                        {},
                        {
                            label: l.delete_album,
                            click: () => {
                                const dialog = new RemoveAlbumDialog([albumId]);
                                dialog.show();
                                this.hide();
                            },
                            icon: 'bin',
                            classes: ['red']
                        }
                    );
                }
                else {
                    options.push(
                        {},
                        generateDownloadMenuItem([albumId])
                    );
                }
            }

            this.options = options;
        }
    }

    class AlbumCell extends MComponent {
        constructor(albumId) {
            super();

            this.el.album = scope.albums.store[albumId];
            this.el.album.setThumb = (dataUrl, fa) => {
                if (M.isAlbumsPage(1)) {
                    this.setThumb(dataUrl, fa);
                }
            };

            this.attachEvent('click', (evt) => {
                const resetSelections = !scope.getCtrlKeyStatus(evt) && !evt.shiftKey;
                scope.albums.grid.lastSelected = this.el;

                this.selectCell(resetSelections);

                if (evt.shiftKey) {
                    const albums = Object.values(scope.albums.store).filter(album => albumIsRenderable(album));

                    const index = albums.findIndex(({ cellEl }) => cellEl.el === this.el);
                    let shiftSelIndex = albums.findIndex(({ cellEl }) => cellEl.el === scope.albums.grid.shiftSelected);

                    if (shiftSelIndex < 0) {
                        shiftSelIndex = index;
                    }

                    const arr = [index, shiftSelIndex];
                    arr.sort((a, b) => a - b);

                    const [min, max] = arr;

                    for (let i = 0; i < albums.length; i++) {
                        if (i >= min && i <= max) {
                            albums[i].cellEl.selectCell();
                        }
                        else {
                            albums[i].cellEl.deselectCell();
                        }
                    }
                }

                evt.stopPropagation();
                evt.preventDefault();
            });

            this.attachEvent(
                'dblclick',
                () => {
                    M.openFolder('albums/' + albumId);
                }
            );

            this.attachEvent(
                'contextmenu',
                ({ pageX, pageY }) => {
                    if (!$.dialog) {
                        this.selectCell(!this.el.classList.contains('ui-selected'));

                        const selectedCells = this.el.parentNode.querySelectorAll('.ui-selected');

                        const contextMenu = (selectedCells.length > 1)
                            ? new MultipleAlbumsContextMenu(selectedCells)
                            : new AlbumContextMenu(albumId);

                        if (contextMenu.options) {
                            contextMenu.show(pageX, pageY);
                        }
                    }
                }
            );

            this.isShared = !!this.el.album.p;
        }

        get isShared() {
            return !!this.shareIcon;
        }

        /**
         * @param {Boolean} value Shared status
         */
        set isShared(value) {
            if (value === this.isShared) {
                return;
            }

            if (value) {
                this.shareIcon = document.createElement('i');
                this.shareIcon.className = 'sprite-fm-mono icon-link pointer-events-none icon-size-6';
                this.el.appendChild(this.shareIcon);
            }
            else {
                this.el.removeChild(this.shareIcon);
                delete this.shareIcon;
            }
        }

        buildElement() {
            this.el = document.createElement('div');
            this.el.className = 'albums-grid-cell flex flex-column justify-end cursor-pointer';
            scope.setShimmering(this.el);
        }

        selectCell(clearSiblingSelections) {
            if (!this.el.classList.contains('ui-selected')) {
                this.el.classList.add('ui-selected');
            }

            if (clearSiblingSelections) {
                AlbumCell.clearSiblingSelections(this.el);
            }
        }

        deselectCell() {
            if (this.el.classList.contains('ui-selected')) {
                this.el.classList.remove('ui-selected');
            }
        }

        setThumb(dataUrl, fa) {
            // The album cover might change, when editing multiple nodes at once,
            // so need to check if the thumb is still applicable
            if (this.el.album.node && this.el.album.node.fa === fa && fa !== this.coverFa) {
                this.el.style.backgroundImage = 'url(\'' + dataUrl + '\')';
                this.el.style.backgroundColor = 'white';
                this.coverFa = fa;
                scope.unsetShimmering(this.el);
            }
        }

        updateCoverImage() {
            if (this.el.album.node) {
                MegaGallery.addThumbnails([this.el.album]);
            }
            else {
                this.dropBackground();
            }
        }

        dropBackground() {
            this.el.style.backgroundImage = null;
            this.el.style.backgroundColor = null;
            this.coverFa = '';
        }

        updateName() {
            const titleEl = this.el.querySelector('.album-label');

            if (titleEl) {
                titleEl.textContent = this.el.album.label;
                titleEl.title = this.el.album.label;
            }
        }

        updatePlaceholders() {
            const count = this.el.album.nodes.length;

            const isPlaceholder = this.el.classList.contains('album-placeholder');
            this.countEl.textContent = count ? mega.icu.format(l.album_items_count, count) : l.album_empty;

            if (isPlaceholder) {
                if (count) {
                    this.el.classList.remove('album-placeholder');
                    this.el.removeChild(this.el.firstChild);
                }
            }
            else if (!count) {
                this.el.classList.add('album-placeholder');

                const placeholder = document.createElement('div');
                placeholder.className = 'flex flex-1 flex-row flex-center';

                const icon = document.createElement('i');
                icon.className = 'sprite-fm-mono icon-album';

                placeholder.appendChild(icon);
                this.el.prepend(placeholder);
            }
        }

        static clearSiblingSelections(ignoreEl) {
            const albums = Object.values(scope.albums.store);

            for (let i = 0; i < albums.length; i++) {
                if (albums[i].cellEl && (!ignoreEl || albums[i].cellEl.el !== ignoreEl)) {
                    albums[i].cellEl.el.classList.remove('ui-selected');
                }
            }
        }
    }

    /**
     * Creates a header for the Album(s) grid
     * @class
     */
    class AlbumsGridHeader {
        constructor(parent) {
            /**
             * @type {HTMLElement?}
             */
            this.breadcrumbs = null;

            /**
             * @type {HTMLElement?}
             */
            this.rightButtons = null;

            if (!parent) {
                return;
            }

            this.el = document.createElement('div');
            this.el.className = 'albums-header flex flex-row items-center justify-between';

            parent.appendChild(this.el);
            parent.classList.remove('hidden');

            this.setBreadcrumbs();

        }

        setBreadcrumbs(albumId) {
            if (this.breadcrumbs) {
                this.el.removeChild(this.breadcrumbs);
            }

            this.breadcrumbs = document.createElement('div');

            const span = document.createElement('span');

            if (albumId && scope.albums.store[albumId]) {
                const div = document.createElement('div');

                span.title = scope.albums.store[albumId].label;
                span.textContent = span.title;
                span.className = 'text-ellipsis ml-3 text-color-high';

                if (!scope.albums.isPublic) {
                    const btn = new MButton(
                        '',
                        'icon-next-arrow rot-180',
                        () => {
                            openMainPage();
                        },
                        'mega-button breadcrumb-btn action'
                    );

                    btn.el.title = l[822];
                    div.appendChild(btn.el);
                }

                this.breadcrumbs.appendChild(div);
                this.breadcrumbs.appendChild(span);
                this.breadcrumbs.className = 'flex flex-row items-center text-ellipsis';
            }
            else {
                span.textContent = l.albums;
                span.className = 'ml-3 text-color-high font-body-1';
                this.breadcrumbs.prepend(span);

                const i = document.createElement('i');
                i.className = 'sprite-fm-mono icon-album icon-blue icon-size-6';
                this.breadcrumbs.prepend(i);
                this.breadcrumbs.className = 'flex flex-row justify-center items-center';
            }

            this.el.prepend(this.breadcrumbs);
        }

        setBreadcrumbsTitle(albumId) {
            if (!this.breadcrumbs) {
                this.setBreadcrumbs(albumId);
                return;
            }

            const span = this.breadcrumbs.querySelector('span');

            span.title = scope.albums.store[albumId].label;
            span.textContent = span.title;
        }

        setSpecificAlbumButtons(albumId) {
            if (!scope.albums.store[albumId]) {
                return;
            }

            const { nodes, filterFn, p } = scope.albums.store[albumId];

            const nodesAvailable = !!nodes.length;
            const buttons = [];
            const needSlideshow = scope.nodesAllowSlideshow(nodes);

            if (scope.albums.isPublic) {
                if (needSlideshow) {
                    buttons.push([
                        l.album_play_slideshow,
                        'play-square icon-blue',
                        () => {
                            scope.albums.grid.timeline.clearSiblingSelections();
                            $.selected = [];
                            scope.playSlideshow(albumId, true);
                        },
                        this.rightButtons
                    ]);
                }
            }
            else {
                if (!filterFn) {
                    buttons.push(
                        [
                            l.add_album_items,
                            'add icon-green',
                            () => {
                                const dialog = new AlbumItemsDialog(albumId);
                                dialog.show();
                            },
                            this.rightButtons,
                            !M.v.length
                        ],
                        [
                            p ? l[6909] : mega.icu.format(l.album_share_link, 1),
                            'link icon-yellow',
                            () => {
                                if (p) {
                                    const dialog = new AlbumShareDialog([albumId]);
                                    dialog.show();
                                }
                                else {
                                    scope.albums.addShare([albumId]);
                                }
                            },
                            this.rightButtons,
                            !M.v.length
                        ]
                    );
                }

                if (needSlideshow) {
                    buttons.push([
                        l.album_play_slideshow,
                        'play-square icon-blue',
                        () => {
                            scope.playSlideshow(albumId, true);
                        },
                        this.rightButtons
                    ]);
                }

                if (nodesAvailable) {
                    buttons.push([
                        l.album_download,
                        'download-small icon-blue',
                        (component) => {
                            if (component) {
                                const { x, bottom } = component.el.getBoundingClientRect();
                                const menu = new DownloadContextMenu(albumId);

                                menu.show(x, bottom + 4);
                            }
                            else {
                                const handles = scope.getAlbumsHandles([albumId]);

                                if (handles.length) {
                                    scope.reportDownload();
                                    M.addDownload(handles);
                                }
                            }
                        },
                        this.rightButtons,
                        false,
                        (isMSync()) ? undefined : generateDownloadOptions([albumId])
                    ]);
                }

                if (p) {
                    buttons.push([
                        l[6821],
                        'link-remove',
                        () => {
                            removeShareWithConfirmation([albumId]);
                        },
                        this.rightButtons
                    ]);
                }

                if (!filterFn) {
                    buttons.push(
                        [
                            l.rename_album,
                            'rename',
                            () => {
                                const dialog = new AlbumNameDialog(albumId);
                                dialog.show();
                            },
                            this.rightButtons
                        ],
                        [
                            l.delete_album,
                            'bin',
                            () => {
                                const dialog = new RemoveAlbumDialog([albumId]);
                                dialog.show();
                            },
                            this.rightButtons,
                            false,
                            undefined,
                            ['red']
                        ]
                    );
                }
            }

            for (let i = 0; i < headerBtnLimit; i++) {
                if (buttons[i]) {
                    AlbumsGridHeader.attachButton(...buttons[i]);
                }
            }

            if (buttons.length > headerBtnLimit) {
                const optionsBtn = AlbumsGridHeader.attachButton(
                    l.album_options_more,
                    'options',
                    () => {
                        const contextMenu = new AlbumOptionsContextMenu(
                            buttons.slice(headerBtnLimit).map(([
                                label,
                                icon,
                                click,
                                parent,
                                isDisabled,
                                children,
                                classes
                            ]) => {
                                return {
                                    label,
                                    click,
                                    icon: icon.replace('icon-blue', ''),
                                    children,
                                    parent,
                                    isDisabled,
                                    classes
                                };
                            })
                        );

                        const { x, y, right, bottom } = optionsBtn.el.getBoundingClientRect();
                        contextMenu.show(x, bottom + MContextMenu.offsetVert, right, y + MContextMenu.offsetVert);
                    },
                    this.rightButtons,
                    !M.v.length
                );
            }
        }

        setGlobalButtons() {
            AlbumsGridHeader.attachButton(
                l.new_album,
                'add icon-green',
                () => {
                    const dialog = new AlbumNameDialog();
                    dialog.show();
                },
                this.rightButtons
            );
        }

        update(albumId) {
            this.setRightControls(albumId);
            this.setBreadcrumbs(albumId);

            // Only 'Albums' section needs this. Otherwise the banner does not appear in albums
            $('.fm-right-files-block').addClass('visible-notification');
        }

        setRightControls(albumId) {
            if (this.rightButtons) {
                while (this.rightButtons.firstChild) {
                    this.rightButtons.removeChild(this.rightButtons.firstChild);
                }
            }
            else {
                this.rightButtons = document.createElement('div');
                this.rightButtons.className = 'flex flex-row';
                this.el.appendChild(this.rightButtons);
            }

            if (albumId) {
                this.setSpecificAlbumButtons(albumId);
            }
            else {
                this.setGlobalButtons();
            }
        }
    }

    AlbumsGridHeader.attachButton = (label, icon, clickFn, parent, isDisabled) => {
        const button = new MButton(
            label,
            `icon-${icon}`,
            clickFn,
            'mega-button action ml-5'
        );

        if (parent) {
            parent.appendChild(button.el);
        }

        if (isDisabled) {
            button.el.disabled = true;
            button.el.classList.add('disabled');
        }

        return button;
    };

    /**
     * Creates a grid of available albums
     * @class
     */
    class AlbumsGrid {
        constructor() {
            /**
             * @type {AlbumsGridHeader?}
             */
            this.header = null;
            this.emptyBlock = null;
        }

        initLayout() {
            loadingDialog.hide('MegaGallery');

            // Checking if layout has already been initialised
            if (this.header) {
                return;
            }

            const parent = document.getElementById('albums-view');

            this.header = new AlbumsGridHeader(parent);
            this.el = document.createElement('div');
            this.el.className = 'albums-grid justify-center ps-ignore-keys';

            parent.appendChild(this.el);
        }

        setPendingCell(label) {
            this.pendingCell = document.createElement('div');
            this.pendingCell.className = 'albums-grid-cell flex flex-column justify-end album-placeholder pending-cell';
            const subdiv = document.createElement('div');
            const labelEl = document.createElement('div');
            labelEl.className = 'album-label';
            labelEl.textContent = label;
            const captionEl = document.createElement('div');
            captionEl.textContent = l.album_name_creating;

            subdiv.appendChild(labelEl);
            subdiv.appendChild(captionEl);
            this.pendingCell.appendChild(subdiv);

            const firstUserAlbum = getFirstUserAlbum();

            if (firstUserAlbum) {
                this.el.insertBefore(this.pendingCell, firstUserAlbum.cellEl.el);
            }
            else {
                this.el.appendChild(this.pendingCell);
            }

            this.updateGridState(
                Object.values(scope.albums.store).filter(album => albumIsRenderable(album)).length + 1
            );
            this.el.scrollTop = 0;
        }

        clearPendingCell() {
            if (this.pendingCell) {
                this.el.removeChild(this.pendingCell);
                delete this.pendingCell;
            }
        }

        addSkeletonCells(albums) {
            for (let i = 0; i < albums.length; i++) {
                const { label, nodes } = albums[i];
                const cell = document.createElement('div');

                cell.className = 'albums-grid-cell flex flex-column justify-end shimmer';
                const subdiv = document.createElement('div');
                const labelEl = document.createElement('div');
                labelEl.className = 'album-label';
                labelEl.textContent = label;
                const captionEl = document.createElement('div');
                captionEl.textContent = mega.icu.format(l.album_items_count, nodes.length);

                subdiv.appendChild(labelEl);
                subdiv.appendChild(captionEl);
                cell.appendChild(subdiv);

                this.el.appendChild(cell);
            }

            this.updateGridState(albums.length);
            this.el.scrollTop = 0;
        }

        showEmptyAlbumPage(albumId) {
            if (this.timeline) {
                this.timeline.clear();
                delete this.timeline;
            }

            let mvLength = M.v.length;
            if (slideshowid) {
                mvLength = tmpMv.length - (previewMvLength - M.v.length);
            }

            if (scope.albums.isPublic) {
                this.updateGridState(0, false);
                this.addEmptyBlock(new AlbumsEmpty(l.public_album_empty_title));
            }
            else if (mvLength) {
                this.updateGridState(0, false);

                this.addEmptyBlock(new AlbumsEmpty(
                    l.album_no_media,
                    l.add_album_items,
                    () => {
                        const dialog = new AlbumItemsDialog(albumId);
                        dialog.show();
                    }
                ));
            }
            else {
                this.updateGridState(0, false);
                this.addEmptyBlock(new NoMediaForAlbums());
            }
        }

        showAlbumContents(albumId) {
            const album = scope.albums.store[albumId];

            if (!album || !album.nodes || !album.nodes.length) {
                scope.albums.removeKeyboardListener();

                if (this.dragSelect) {
                    this.dragSelect.dispose();
                }

                this.showEmptyAlbumPage(albumId);
                return;
            }

            this.removeEmptyBlock();

            let prevCount = 0;

            this.timeline = new scope.AlbumTimeline({
                onSelectToggle: () => {
                    delay(
                        'timeline:update_selected_count',
                        () => {
                            if (!this.timeline) {
                                window.selectionManager.hideSelectionBar();
                                return;
                            }

                            if (this.timeline.selCount) {
                                window.selectionManager.showSelectionBar(
                                    mega.icu.format(l.album_selected_items_count, album.nodes.length)
                                        .replace('%1', this.timeline.selCount)
                                );

                                if (!prevCount) {
                                    this.timeline.adjustToBottomBar();
                                }
                            }
                            else {
                                window.selectionManager.hideSelectionBar();

                                if (prevCount) {
                                    this.timeline.adjustToBottomBar();
                                }
                            }

                            prevCount = this.timeline.selCount;
                        },
                        50
                    );
                },
                onDoubleClick: (cell) => {
                    const { h } = cell.el.ref.node;
                    this.timeline.clearSiblingSelections(h);

                    this.timeline.selections[h] = true;
                    cell.isSelected = true;
                    this._selCount++;

                    // double click will mess _selCount, so we need to reset here
                    if (scope.albums.grid && scope.albums.grid.timeline) {
                        const selHandles = scope.albums.grid.timeline.selections;
                        scope.albums.grid.timeline._selCount = Object.keys(selHandles).length;
                        scope.albums.grid.timeline.onSelectToggle();
                    }

                    delay('render:in_album_node_preview', () => {
                        const isVideo = scope.isVideo(cell.el.ref.node);

                        if (isVideo && (!isVideo.isPreviewable || !MediaAttribute.getMediaType(cell.el.ref.node))) {
                            scope.reportDownload();
                            M.addDownload([h]);
                        }
                        else {
                            scope.playSlideshow(albumId, false, !!isVideo);
                        }
                    });
                },
                containerClass: 'album-timeline-main px-1 py-1',
                sidePadding: 4,
                interactiveCells: true
            });

            this.el.classList.add('album-content-grid');
            this.el.style.gridTemplateColumns = null;
            this.el.style.gridAutoRows = null;
            this.el.appendChild(this.timeline.el);

            delay('render:album_content_timeline', () => {
                if (this.timeline && this.timeline.el && albumId === scope.getAlbumIdFromPath()) {
                    window.selectionManager = new AlbumsSelectionManager(
                        albumId,
                        this.timeline.el
                    ).reinitialize();
                }
            });

            sortInAlbumNodes(album.nodes);
            this.timeline.nodes = album.nodes;
            this.timeline.setZoomControls();
        }

        addEmptyBlock(emptyPad) {
            if (!this.emptyBlock) {
                this.emptyBlock = emptyPad;
            }

            this.el.appendChild(this.emptyBlock.el);
        }

        removeEmptyBlock() {
            if (this.emptyBlock) {
                if (this.el.contains(this.emptyBlock.el)) {
                    this.el.removeChild(this.emptyBlock.el);
                }

                delete this.emptyBlock;
            }
        }

        /**
         * Making the grid react to the elements change
         * @param {Number} count Number of elements to render
         * @param {Boolean} [useDefaultEmptyPad] Indicates when the empty state is being handled from outside
         * @returns {void}
         */
        updateGridState(count, useDefaultEmptyPad = true) {
            let isEmpty = false;

            this.el.classList.remove('album-content-grid');

            if (count > bigAlbumCellsLimit) {
                this.el.classList.add('albums-grid-3-col');
                this.el.style.gridTemplateColumns = '200px 200px 200px';
                this.el.style.gridAutoRows = '200px';
            }
            else if (count > 0) {
                this.el.classList.remove('albums-grid-3-col');
                this.el.style.gridTemplateColumns = '300px 300px';
                this.el.style.gridAutoRows = '300px';
            }
            else {
                isEmpty = true;
                this.el.style.gridTemplateColumns = null;
                this.el.style.gridAutoRows = null;
            }

            if (useDefaultEmptyPad) {
                if (isEmpty) {
                    if (M.v.length) {
                        this.addEmptyBlock(new AlbumsEmpty(
                            l.no_albums,
                            l.create_new_album,
                            () => {
                                const dialog = new AlbumNameDialog();
                                dialog.show();
                            }
                        ));
                    }
                    else {
                        this.updateGridState(0, false);
                        this.addEmptyBlock(new NoMediaNoAlbums());
                    }
                }
                else {
                    this.removeEmptyBlock();
                }
                this.header.el.classList.toggle('invisible', isEmpty && !M.v.length);
            }
        }

        refresh() {
            this.updateGridState(
                Object.values(scope.albums.store).filter(album => albumIsRenderable(album)).length
            );
        }

        prepareAlbumCell(id) {
            const album = scope.albums.store[id];

            if (!album || !albumIsRenderable(album)) {
                return null;
            }

            let albumCell = album.cellEl;

            if (!albumCell) {
                albumCell = new AlbumCell(id);
                album.cellEl = albumCell;
                fillAlbumCell(albumCell.el);
            }

            albumCell.el.album.el = albumCell.el;

            return albumCell;
        }

        insertPredefinedAlbum(albumId) {
            const prevActiveSiblingAlbum = getPrevActivePredefinedAlbum(albumId, 'cellEl');
            const albumCell = this.prepareAlbumCell(albumId);

            if (prevActiveSiblingAlbum) {
                this.el.insertBefore(albumCell.el, prevActiveSiblingAlbum.cellEl.el.nextSibling);
            }
            else {
                this.el.prepend(albumCell.el);
            }

            if (albumCell.el.album.node && albumCell.el.album.node.fa !== albumCell.coverFa) {
                MegaGallery.addThumbnails([albumCell.el.album]);
            }
        }

        insertUserAlbum(id) {
            const albumCell = this.prepareAlbumCell(id);

            if (albumCell) {
                insertAlbumElement(id, albumCell.el, this.el, 'cellEl');

                if (albumCell.el.album.node && albumCell.el.album.node.fa !== albumCell.coverFa) {
                    MegaGallery.addThumbnails([albumCell.el.album]);
                }
                else {
                    scope.unsetShimmering(albumCell.el);
                }
            }
        }

        showAllAlbums() {
            const albumKeys = Object.keys(scope.albums.store);
            let albumsCount = 0;

            const thumbBlocks = [];

            for (let i = 0; i < albumKeys.length; i++) {
                const albumCell = this.prepareAlbumCell(albumKeys[i]);

                if (albumCell) {
                    if (albumCell.el.classList.contains('ui-selected')) {
                        albumCell.el.classList.remove('ui-selected');
                    }
                    this.el.appendChild(albumCell.el);
                    albumsCount++;

                    if (albumCell.el.album.node) {
                        thumbBlocks.push(albumCell.el.album);
                    }
                    else {
                        scope.unsetShimmering(albumCell.el);
                    }
                }
            }

            this.updateGridState(albumsCount);

            delay('render:albums_grid', () => {
                applyPs(this.el);

                MegaGallery.addThumbnails(thumbBlocks);

                this.attachDragSelect();
                this.attachKeyboardEvents();

                this.lastSelected = null;
            });
        }

        attachDragSelect() {
            if (this.dragSelect) {
                this.dragSelect.dispose();
            }

            let initX = 0;
            let initY = 0;
            let albums = [];
            let area = [];

            const selectMatchingCells = () => {
                for (let i = 0; i < albums.length; i++) {
                    if (scope.isInSelectArea(albums[i].cellEl.el, area)) {
                        albums[i].cellEl.selectCell(false);
                    }
                    else {
                        albums[i].cellEl.deselectCell();
                    }
                }
            };

            this.dragSelect = new mega.ui.dragSelect(
                this.el,
                {
                    onDragStart: (xPos, yPos) => {
                        initX = xPos;
                        initY = this.el.scrollTop + yPos;
                        albums = Object.values(scope.albums.store).filter(a => albumIsRenderable(a) && a.cellEl);
                    },
                    onDragMove: (xPos, yPos) => {
                        area = [];

                        yPos += this.el.scrollTop;

                        if (xPos > initX) {
                            area.push(initX, xPos);
                        }
                        else {
                            area.push(xPos, initX);
                        }

                        if (yPos > initY) {
                            area.push(initY, yPos);
                        }
                        else {
                            area.push(yPos, initY);
                        }

                        selectMatchingCells();
                    },
                    onDragEnd: (wasDragging) => {
                        if (!wasDragging) {
                            AlbumCell.clearSiblingSelections();
                        }
                    },
                    onScrollUp: () => {
                        this.el.scrollTop -= 20;
                        selectMatchingCells();
                    },
                    onScrollDown: () => {
                        this.el.scrollTop += 20;
                        selectMatchingCells();
                    }
                }
            );
        }

        attachKeyboardEvents() {
            if (scope.disposeKeyboardEvents) {
                scope.disposeKeyboardEvents();
            }

            scope.disposeKeyboardEvents = (() => {
                const disposeKeydown = MComponent.listen(document, 'keydown', (evt) => {
                    if (evt.target !== document.body) {
                        return;
                    }

                    const albums = Object.values(scope.albums.store).filter(album => albumIsRenderable(album));

                    if (!albums.length) {
                        return true;
                    }

                    const { key, shiftKey } = evt;
                    const isCtrl = scope.getCtrlKeyStatus(evt);
                    const lastSelIndex = (this.lastSelected)
                        ? albums.findIndex(({ cellEl }) => cellEl.el === this.lastSelected)
                        : -1;
                    const albumsPerRow = (albums.length > bigAlbumCellsLimit) ? 3 : 2;
                    let curIndex = lastSelIndex;

                    const setFirstSelection = () => {
                        this.lastSelected = albums[0].cellEl.el;
                        albums[0].cellEl.selectCell();

                        return true;
                    };

                    const events = {
                        ArrowLeft: () => {
                            if (!this.lastSelected) {
                                setFirstSelection();
                            }

                            curIndex--;
                        },
                        ArrowUp: () => {
                            if (!this.lastSelected) {
                                setFirstSelection();
                            }

                            curIndex -= albumsPerRow;
                        },
                        ArrowRight: () => {
                            if (!this.lastSelected) {
                                setFirstSelection();
                            }

                            curIndex++;
                        },
                        ArrowDown: () => {
                            if (!this.lastSelected) {
                                setFirstSelection();
                            }

                            curIndex += albumsPerRow;
                        },
                        a: () => {
                            if (!isCtrl) {
                                return;
                            }

                            for (let i = 0; i < albums.length; i++) {
                                albums[i].cellEl.selectCell();
                            }

                            evt.preventDefault();
                            evt.stopPropagation();

                            return true;
                        },
                        Shift: () => {
                            this.shiftSelected = this.lastSelected;
                            return true;
                        }
                    };

                    if (!events[key] || events[key]() === true) {
                        return true;
                    }

                    evt.preventDefault();
                    evt.stopPropagation();

                    if (curIndex < 0) {
                        curIndex = (isCtrl || shiftKey) ? 0 : albums.length - 1;
                    }
                    else if (curIndex >= albums.length) {
                        curIndex = (isCtrl
                            || shiftKey
                            || (curIndex - lastSelIndex > 1 && curIndex - (albums.length - 1) < albumsPerRow))
                            ? albums.length - 1
                            : 0;
                    }

                    const albumCell = albums[curIndex].cellEl;
                    albumCell.selectCell();
                    this.lastSelected = albumCell.el;

                    const adjustScrollTop = () => {
                        if (albumCell.el.offsetTop < scope.albums.grid.el.scrollTop) {
                            scope.albums.grid.el.scrollTop = albumCell.el.offsetTop - scope.cellMargin * 3;
                        }
                        else {
                            const bottomOverlap = albumCell.el.offsetTop + albumCell.el.offsetHeight
                                - (scope.albums.grid.el.scrollTop + scope.albums.grid.el.clientHeight);

                            if (bottomOverlap > 0) {
                                scope.albums.grid.el.scrollTop += bottomOverlap + scope.cellMargin * 3;
                            }
                        }
                    };

                    const adjustSiblings = () => {
                        if (!isCtrl && !shiftKey) {
                            AlbumCell.clearSiblingSelections(albumCell.el);
                        }
                        else if (shiftKey) {
                            const shiftSelIndex = albums.findIndex(({ cellEl }) => cellEl.el === this.shiftSelected);

                            const arr = [curIndex, shiftSelIndex];
                            arr.sort((a, b) => a - b);

                            const [min, max] = arr;

                            for (let i = 0; i < albums.length; i++) {
                                if (i >= min && i <= max) {
                                    albums[i].cellEl.selectCell();
                                }
                                else {
                                    albums[i].cellEl.deselectCell();
                                }
                            }
                        }
                    };

                    adjustScrollTop();
                    adjustSiblings();
                });

                const disposeKeyup = MComponent.listen(document, 'keyup', ({ key }) => {
                    if (key === 'Shift') {
                        this.shiftSelected = null;
                    }
                });

                return () => {
                    disposeKeydown();
                    disposeKeyup();
                };
            })();
        }

        showAlbum(id) {
            this.initLayout();

            if (M.isAlbumsPage(1)) {
                this.showAllAlbums();
                this.header.update();
                return;
            }

            const album = id ? scope.albums.store[id] : null;

            if (!album || !albumIsRenderable(album)) {
                openMainPage();
            }
            else {
                this.showAlbumContents(id);
                this.header.update(id);
                scope.reporter.report(false, 'Album');
            }
        }

        clear(removeGridContainer) {
            const { el, timeline } = this;

            while (el.firstChild) {
                el.removeChild(el.firstChild);
            }

            if (removeGridContainer && el.parentNode) {
                el.parentNode.removeChild(el);
            }

            if (timeline) {
                timeline.clear();
                delete this.timeline;
            }
        }

        removeHeader() {
            if (this.header) {
                this.header.el.parentNode.removeChild(this.header.el);
                this.header = null;
            }
        }

        updateInAlbumGrid(s) {
            if (M.currentdirid === 'albums/' + s) {
                const { timeline, header } = this;

                const album = mega.gallery.albums.store[s];

                if (!album) {
                    return;
                }

                // Checking if that is the first node and clearing up the empty state
                if (album.nodes.length === 1) {
                    this.removeEmptyBlock();
                    this.showAlbumContents(s);
                    header.update(s);
                }
                else {
                    delay('album:' + s + ':add_items', () => {
                        if (timeline) {
                            timeline.nodes = album.nodes;
                            header.update(s);

                            if (timeline.selCount > 0) {
                                window.selectionManager.showSelectionBar(
                                    mega.icu.format(l.album_selected_items_count, album.nodes.length)
                                        .replace('%1', timeline.selCount)
                                );
                            }
                        }
                    });
                }
            }
        }

        removeAlbum(album) {
            this.el.removeChild(album.cellEl.el);
        }
    }

    /**
     * Creates a tree for the sidebar with expandable first item and other ones treated as subitems
     * @class
     */
    class AlbumsTree {
        constructor(parent) {
            /**
             * @type {MSidebarButton?}
             */
            this.headButton = null;

            /**
             * @type {Object.<String, Object.<String, Object>>}
             */
            this.buttons = {
                predefined: {},
                userDefined: {}
            };

            this.el = document.createElement('div');
            this.el.className = 'lp-content-wrap';

            this.treeList = document.createElement('div');
            this.treeList.className = 'albums-tree-list collapse';

            this.el.appendChild(this.treeList);

            parent.appendChild(this.el);
            this.setHeader();
        }

        setPendingButton(label) {
            this.pendingBtn = new MSidebarButton(
                label + ' ' + l.album_name_creating,
                'icon-album',
                nop,
                'pending-btn subalbum-btn'
            );

            const firstUserAlbum = getFirstUserAlbum();

            if (firstUserAlbum) {
                this.treeList.insertBefore(this.pendingBtn.el, firstUserAlbum.button.el);
            }
            else {
                this.treeList.appendChild(this.pendingBtn.el);
            }
        }

        clearPendingButton() {
            if (this.pendingBtn) {
                this.treeList.removeChild(this.pendingBtn.el);
                delete this.pendingBtn;
            }
        }

        setHeader() {
            this.headButton = new MSidebarButton(
                l.albums,
                'icon-album',
                () => {
                    storeLastActiveTab();

                    if (!M.isAlbumsPage(1)) {
                        openMainPage();
                    }

                    if (this.listExpanded) {
                        this.collapseList();
                    }
                    else {
                        this.expandList();
                    }
                }
            );

            this.headButton.isExpandable = checkIfExpandable();
            this.el.prepend(this.headButton.el);
        }

        clear(removeAll) {
            if (this.treeList) {
                while (this.treeList.firstChild) {
                    this.treeList.removeChild(this.treeList.firstChild);
                }
            }

            if (removeAll) {
                if (this.headButton) {
                    this.el.removeChild(this.headButton.el);
                    delete this.headButton;
                }

                if (this.treeList) {
                    this.el.removeChild(this.treeList);
                    delete this.treeList;
                }
            }
        }

        renderAlbumButtons() {
            const keys = Object.keys(scope.albums.store);

            for (let i = 0; i < keys.length; i++) {
                if (albumIsRenderable(scope.albums.store[keys[i]])) {
                    this.appendButton(keys[i]);
                }
            }
        }

        focusAlbum(id) {
            const album = id ? scope.albums.store[id] : null;

            if (!album || !albumIsRenderable(album)) {
                this.headButton.setActive();
            }
            else {
                scope.albums.store[id].button.setActive();
            }

            this.expandList();
        }

        unfocusAlbums() {
            this.headButton.unsetActive();
        }

        /**
         * Appending the list with the new button
         * @param {String} albumId The key of the album in the store
         * @returns {void}
         */
        appendButton(albumId) {
            const album = scope.albums.store[albumId];

            if (album) {
                if (!album.button) {
                    album.button = AlbumsTree.createButton(albumId, album.label, !!album.p);
                }

                if (!album.filterFn || album.nodes) {
                    this.treeList.appendChild(album.button.el);
                    this.headButton.isExpandable = true;
                }
            }
        }

        /**
         * Inserting the button into the existing list as per the order
         * @param {String} albumId Album id
         * @returns {void}
         */
        insertPredefinedButton(albumId) {
            const album = scope.albums.store[albumId];

            if (album) {
                if (!album.button) {
                    album.button = AlbumsTree.createButton(albumId, album.label, !!album.p);
                }

                const prevActiveSiblingAlbum = getPrevActivePredefinedAlbum(albumId, 'button');

                if (prevActiveSiblingAlbum) {
                    this.treeList.insertBefore(album.button.el, prevActiveSiblingAlbum.button.el.nextSibling);
                }
                else {
                    this.treeList.prepend(album.button.el);
                }

                this.headButton.isExpandable = true;
            }
        }

        removeAlbum(album) {
            if (album.button) {
                album.button.el.classList.remove('active');
                this.treeList.removeChild(album.button.el);
            }
        }

        expandList() {
            if (this.headButton) {
                this.listExpanded = true;
                this.headButton.el.classList.add('expansion-btn-open');
                this.treeList.classList.remove('collapse');
                this.adjustScrollBar();
            }
        }

        collapseList() {
            if (this.headButton) {
                this.listExpanded = false;
                this.headButton.el.classList.remove('expansion-btn-open');
                this.treeList.classList.add('collapse');
                this.adjustScrollBar();
            }
        }

        adjustScrollBar() {
            delay('render:albums_sidebar', () => {
                const sidebar = document.querySelector('.js-lp-gallery.lp-gallery .js-gallery-panel');
                applyPs(sidebar);
            });
        }
    }

    /**
     * @param {String} albumId Album ID
     * @param {String} label Button label
     * @param {Boolean} isShared Whether the album is already shared or not
     * @returns {MSidebarButton}
     */
    AlbumsTree.createButton = (albumId, label, isShared) => {
        const btn = new MSidebarButton(
            label,
            'icon-album',
            () => {
                storeLastActiveTab();

                const nextFolder = 'albums/' + albumId;

                if (!scope.albums.isPublic && M.currentdirid !== nextFolder) {
                    M.openFolder(nextFolder);
                }
            },
            'subalbum-btn'
        );

        btn.truncateOverflowText = true;
        btn.isShared = isShared;
        btn.attachEvent(
            'contextmenu',
            (evt) => {
                evt.preventDefault();
                if (!pfcol || scope.albums.store[albumId].nodes.length) {
                    const contextMenu = new AlbumContextMenu(albumId, scope.albums.isPublic);
                    contextMenu.show(evt.pageX, evt.pageY);
                }
            }
        );

        return btn;
    };

    /**
     * Creates a controlling class for AlbumsTree, AlbumsGrid and AlbumScroll
     */
    class Albums {
        constructor() {
            this.awaitingDbAction = false;
            this.grid = null;
            this.store = { // The length of the key should be always as per predefinedKeyLength
                fav: { id: 'fav', label: l.gallery_favourites, filterFn: () => false },
                mya: { id: 'mya', label: l.my_albums, filterFn: () => false },
                sha: { id: 'sha', label: l.shared_albums, filterFn: () => false },
                gif: {
                    id: 'gif',
                    label: l.album_key_gif,
                    filterFn: n => n.fa && fileext(n.name || '', true, true) === 'GIF'
                },
                raw: {
                    id: 'raw',
                    label: l.album_key_raw,
                    filterFn: n => n.fa
                        && is_rawimage(n.name) !== undefined
                        && !ignoreRaws[fileext(n.name || '', true, true)]
                }
            };

            this.tree = null;

            /**
             * This array holds all the subscribers for mega.sets
             * The stored functions represent `unsubscribe` methods for each of the subscriber
             * @type {Function[]}
             */
            this.setsSubscribers = [];
        }

        subscribeToSetsChanges() {
            if (Array.isArray(this.setsSubscribers) && this.setsSubscribers.length) {
                return;
            }

            this.setsSubscribers = [
                mega.sets.subscribe('asp', 'albums', (data) => {
                    const { id, at, k } = data;
                    const isPending = pendingName !== '' && mega.sets.decryptSetAttr(at, k).n === pendingName;

                    let prevName = '';
                    const album = this.store[id];
                    const isExisting = !!album;

                    if (isPending) {
                        this.grid.clearPendingCell();
                        this.tree.clearPendingButton();
                        pendingName = '';
                    }
                    else if (album) {
                        prevName = album.label;
                    }

                    sortStore();

                    if (isExisting) {
                        const ids = Object.keys(album.eIds);
                        data.e = Object.create(null);

                        for (let i = 0; i < ids.length; i++) {
                            const id = ids[i];

                            data.e[id] = {
                                id,
                                h: album.eIds[id]
                            };
                        }

                        data.p = album.p;
                    }

                    this.createAlbumData(data, unwantedHandles());

                    const nameChanged = album && prevName !== album.label;

                    sortStore();

                    if (isExisting) {
                        this.tree.removeAlbum(album);
                    }

                    this.addUserAlbumToTree(id, true);

                    if (M.isAlbumsPage(1)) {
                        if (isExisting) {
                            this.grid.removeAlbum(album);

                            if (album.cellEl && nameChanged) {
                                album.cellEl.updateName();
                            }
                        }

                        this.grid.insertUserAlbum(id);

                        if (!isExisting) {
                            this.grid.refresh();
                        }

                        delay('album:trigger_items_dialog', () => {
                            if (isPending && M.v.length) {
                                const dialog = new AlbumItemsDialog(id, true);
                                dialog.show();
                            }
                        }, 100);
                    }
                    else if (M.currentdirid === 'albums/' + id && this.grid) {
                        this.grid.header.setBreadcrumbsTitle(id);
                    }
                }),
                mega.sets.subscribe('asr', 'albums', ({ id }) => {
                    this.removeAlbumFromGridAndTree(id);

                    if (M.currentdirid === 'albums/' + id) {
                        if (this.grid.emptyBlock) {
                            this.grid.removeEmptyBlock();
                        }

                        openMainPage();
                    }
                }),
                mega.sets.subscribe('aep', 'albums', async({ s, h: handle, id }) => {
                    const album = scope.albums.store[s];

                    // Checking if the album is still available or if it has already got a requested node
                    if (!album || album.nodes.some(({ h }) => h === handle)) {
                        return;
                    }

                    if (!M.d[handle]) {
                        await dbfetch.get(handle);
                    }

                    album.nodes.push(M.d[handle]);
                    album.eHandles[handle] = id;
                    album.eIds[id] = handle;

                    debouncedAlbumCellUpdate(s, true);

                    if (this.grid) {
                        this.grid.updateInAlbumGrid(s);
                    }

                    debouncedLoadingUnset();
                }),
                mega.sets.subscribe('aer', 'albums', (element) => {
                    this.removeUserAlbumItem(element);
                }),
                mega.sets.subscribe('ass', 'albums', (share) => {
                    this.updateAlbumShare(share);
                })
            ];
        }

        getAvailableNodes(handles) {
            const nodes = [];

            if (Array.isArray(handles)) {
                for (let i = 0; i < handles.length; i++) {
                    nodes.push(M.d[handles[i]]);
                }
            }
            else {
                const fmNodes = Object.values(M.d);
                const ignoreHandles = unwantedHandles();

                for (let i = 0; i < fmNodes.length; i++) {
                    if (!scope.isGalleryNode(fmNodes[i])) {
                        continue;
                    }

                    const { fa, s, p, fv } = fmNodes[i];

                    if (fa && s && !ignoreHandles[p] && !fv) {
                        nodes.push(fmNodes[i]);
                    }
                }
            }

            return nodes;
        }

        async initPublicAlbum() {
            const albumData = {
                ...M.d[M.RootID],
                p: { ph: pfid }
            };
            const handles = M.c[M.RootID] ? Object.keys(M.c[M.RootID]) : [];

            this.isPublic = true;

            this.removeTree();
            this.initTree(document.querySelector('.js-fm-left-panel .fm-other-tree-panel.js-other-tree-panel'));

            this.createAlbumData(albumData, {}, true);

            for (const id in this.store) {
                if (Object.hasOwnProperty.call(this.store, id) && !this.store[id].filterFn && id !== albumData.id) {
                    delete this.store[id];
                }
            }

            MegaGallery.dbActionPassed = true;

            const availableNodes = this.getAvailableNodes(handles);

            if (availableNodes.length) {
                sortInAlbumNodes(availableNodes);
            }

            await this.buildAlbumsList(availableNodes);

            M.v = availableNodes;
            const {id, button} = this.store[albumData.id];

            insertAlbumElement(id, button.el, this.tree.treeList, 'button');
            this.tree.focusAlbum(id);

            this.showAlbum(albumData.id);

            this.awaitingDbAction = false;
            this.subscribeToSetsChanges();

            const treePanel = $('section.fm-tree-panel', '.fm-main.default');

            $('.files-grid-view.fm, .fm-blocks-view.fm, .fm-right-header, .fm-empty-section').addClass('hidden');
            $('.tree', treePanel).addClass('hidden');
            $('.cloud-drive .lp-header span', treePanel).text(l.album_link);
            $('button.btn-galleries', treePanel).addClass('pl-4');

            if (handles.length) {
                $('.fm-import-to-cloudrive span', '.folder-link-btns-container').text(
                    (u_type)
                        ? l.context_menu_import
                        : l.btn_imptomega
                );
            }
            else {
                $('.folder-link-btns-container').addClass('hidden');
            }

            const rfBlock = $('.fm-right-files-block', '.fmholder');
            rfBlock.removeClass('hidden');
            $('.onboarding-control-panel', rfBlock).addClass('hidden');

            eventlog(99952);
        }

        /**
         * @param {String[]} handles Node handles to work with
         * @returns {void}
         */
        init(handles) {
            this.isPublic = false;
            const gallerySidebar = document.querySelector('.js-lp-gallery.lp-gallery .js-gallery-panel');
            const gallerySidebarWrap =
                document.querySelector('.js-lp-gallery.lp-gallery .js-gallery-panel .lp-content-wrap-wrap');
            const isAlbums = M.isAlbumsPage();
            const isGallery = M.isGalleryPage();

            if ((!isAlbums && !isGallery) || !gallerySidebar) {
                // It is either not a Gallery page or dom is broken
                return;
            }

            this.initTree(gallerySidebarWrap);
            delay('render:albums_sidebar', () => {
                applyPs(gallerySidebar);
            });

            if (!MegaGallery.dbActionPassed) {
                if (this.awaitingDbAction) {
                    return; // Some other part has already requested this
                }

                this.awaitingDbAction = true;

                if (isGallery) {
                    return;// Handles will be retrieved by Gallery
                }

                Albums.fetchDBDataFromGallery();
                return; // Fetch will re-trigger Albums.init() the second time after the db data is retrieved.
            }

            const availableNodes = this.getAvailableNodes(handles);

            if (availableNodes.length) {
                sortInAlbumNodes(availableNodes);
            }

            this.buildAlbumsList(availableNodes).then(() => {
                if (isAlbums) {
                    M.v = availableNodes;
                    const id = M.currentdirid.replace(/albums\/?/i, '');

                    this.tree.focusAlbum(id);
                    this.showAlbum(id);
                }
                else {
                    loadingDialog.hide('MegaGallery');
                }

                this.awaitingDbAction = false;
            });

            this.subscribeToSetsChanges();
        }

        initTree(sidebar) {
            if (!this.tree) {
                if (M.isAlbumsPage()) {
                    loadingDialog.show('MegaGallery');
                }

                this.tree = new AlbumsTree(sidebar);
            }
        }

        initGrid() {
            if (!this.grid) {
                this.grid = new AlbumsGrid();
            }
        }

        /**
         * Generating buttons for predefined albums
         * @param {MegaNode[]} nodesArr array of nodes to process
         * @returns {void}
         */
        setPredefinedAlbums(nodesArr) {
            const nodesObj = Object.create(null);
            const covers = Object.create(null);
            const predefinedKeys = Object.keys(this.store).filter(k => k.length === predefinedKeyLength);
            const albums = [];

            for (let i = 0; i < nodesArr.length; i++) {
                const node = nodesArr[i];

                for (let j = 0; j < predefinedKeys.length; j++) {
                    const key = predefinedKeys[j];
                    const { filterFn } = this.store[key];

                    if (filterFn(node)) {
                        if (!covers[key]) {
                            covers[key] = node;
                        }

                        if (nodesObj[key]) {
                            nodesObj[key].push(node);
                        }
                        else {
                            nodesObj[key] = [node];
                        }

                        break;
                    }
                }
            }

            for (let i = 0; i < predefinedKeys.length; i++) {
                const key = predefinedKeys[i];
                const album = this.store[key];

                album.cellEl = null;

                if (nodesObj[key]) {
                    album.node = covers[key];
                    album.nodes = nodesObj[key];

                    this.tree.appendButton(key);
                    albums.push(album);
                }
                else {
                    this.store[key].nodes = [];
                }
            }

            return albums;
        }

        /**
         * Generating buttons for User-created albums
         * @returns {Object[]}
         */
        async setUserAlbums() {
            const albums = [];

            if (!this.isPublic) {
                const sets = Object.values(await mega.sets.buildTmp());

                if (!Array.isArray(sets) || !sets.length) {
                    return [];
                }

                const ignoreHandles = unwantedHandles();

                for (let i = 0; i < sets.length; i++) {
                    albums.push(this.createAlbumData(sets[i], ignoreHandles));
                }
            }

            sortStore();

            const userAlbums = Object.values(this.store);

            for (let i = 0; i < userAlbums.length; i++) {
                if (!userAlbums[i].filterFn) {
                    this.addUserAlbumToTree(userAlbums[i].id);
                }
            }

            return albums;
        }

        /**
         * @param {MegaNode} nodesArr Array of nodes to filter through
         * @returns {void}
         */
        async buildAlbumsList(nodesArr) {
            if (scope.albumsRendered) {
                this.tree.renderAlbumButtons();
            }
            else {
                if (this.tree && this.tree.treeList.children.length > 0) {
                    this.tree.clear();
                }

                if (!this.isPublic) {
                    const albums = Object.values(this.store);

                    for (let index = 0; index < albums.length; index++) {
                        const { id, filterFn } = albums[index];

                        if (!filterFn) {
                            delete this.store[id];
                        }
                    }

                    this.setPredefinedAlbums(nodesArr);
                }

                await this.setUserAlbums();

                scope.albumsRendered = true;

                if (this.tree && this.tree.headButton) {
                    this.tree.headButton.isExpandable = checkIfExpandable();
                }
            }

            if (this.isPublic) {
                this.tree.headButton.el.classList.add('hidden');
            }
            else {
                this.tree.headButton.el.classList.remove('hidden');
            }
        }

        /**
         * @param {Object.<String, any>} data Set data to process
         * @param {Object.<String, Boolean>} ignoreHandles Handles to ignore when add to the album
         * @param {Boolean} [isPublic] Whether the specified key is encrypted
         * @returns {void}
         */
        createAlbumData({ e, at, k, id, ts, p, cts }, ignoreHandles, isPublic) {
            const attr = at === '' || !at ? {} : isPublic
                ? mega.sets.decryptPublicSetAttr(at, k)
                : mega.sets.decryptSetAttr(at, k);
            const label = attr.n || l.unknown_album_name;
            const coverHandle = attr.c || '';
            let album = this.store[id];
            const nodes = [];
            const eHandles = Object.create(null);
            const eIds = Object.create(null);
            let node = null;

            if (e) {
                const elements = Object.values(e);

                for (let i = 0; i < elements.length; i++) {
                    const { h, id } = elements[i];

                    if (M.d[h] && !ignoreHandles[M.d[h].p] && !eHandles[h]) {
                        nodes.push(M.d[h]);

                        if (id === coverHandle) {
                            node = M.d[h];
                        }
                    }

                    eHandles[h] = id;
                    eIds[id] = h;
                }
            }

            sortInAlbumNodes(nodes);

            if (!node) {
                node = nodes[0];
            }

            if (album) {
                album.at = attr;
                album.k = k;
                album.label = label;
                album.ts = ts;
                album.button.label = label;
                album.nodes = nodes;
                album.node = node;
                album.eHandles = eHandles;
                album.eIds = eIds;
                album.p = p;
            }
            else {
                album = {
                    at: attr,
                    k,
                    id,
                    label,
                    nodes,
                    node,
                    button: AlbumsTree.createButton(id, label, !!p),
                    ts,
                    cts,
                    eHandles,
                    eIds,
                    p
                };

                this.store[id] = album;
            }

            return album;
        }

        /**
         * Adding/removing share to an album
         * @param {Object.<String, String|Number>} payload The share payload
         * @returns {void}
         */
        updateAlbumShare({ ph, s, ts, r }) {
            const album = this.store[s];

            if (!album) {
                return;
            }

            const removing = r === 1;

            if (removing) {
                if (album.p) {
                    delete album.p;
                }
            }
            else {
                album.p = { ph, ts };
            }

            if (album.button) {
                album.button.isShared = !removing;
            }

            if (s === scope.getAlbumIdFromPath() && this.grid && this.grid.header) {
                this.grid.header.update(s);
            }

            if (album.cellEl) {
                album.cellEl.isShared = !removing;
            }
        }

        /**
         * @param {String} albumId Album ID
         * @param {Boolean} toInsert Whether to insert an album among the others or just append the list
         * @returns {void}
         */
        addUserAlbumToTree(albumId, toInsert) {
            const album = this.store[albumId];

            if (!album) {
                return;
            }

            if (toInsert) {
                insertAlbumElement(albumId, album.button.el, this.tree.treeList, 'button');
            }
            else {
                this.tree.treeList.appendChild(album.button.el);
            }

            if (this.tree.headButton) {
                this.tree.headButton.isExpandable = true;
            }
        }

        showAlbum(id) {
            this.initGrid();
            this.grid.showAlbum(id);
        }

        clearSubscribers() {
            if (this.setsSubscribers) {
                for (let i = 0; i < this.setsSubscribers.length; i++) {
                    this.setsSubscribers[i]();
                }
            }

            this.setsSubscribers = [];
        }

        removeKeyboardListener() {
            if (scope.disposeKeyboardEvents) {
                scope.disposeKeyboardEvents();
            }

            scope.disposeKeyboardEvents = null;
        }

        disposeInteractions() {
            if (this.grid && this.grid.timeline) {
                this.grid.timeline.clear();
            }
            else {
                this.removeKeyboardListener();
            }

            if (this.tree) {
                this.tree.unfocusAlbums();
            }

            this.removeGrid();
        }

        disposeAll() {
            this.disposeInteractions();

            this.removeTree();
            this.clearSubscribers();

            if (this.grid) {
                this.grid.clear();
            }
        }

        removeTree() {
            if (this.tree) {
                this.tree.clear(true);
                delete this.tree;
            }
        }

        removeGrid() {
            if (this.grid) {
                this.grid.clear(true);
                this.grid.removeHeader();

                const albumsView = document.getElementById('albums-view');

                if (albumsView && !albumsView.classList.contains('hidden')) {
                    albumsView.classList.add('hidden');
                }

                this.grid = null;
            }
        }

        /**
         * This method removes album from tree and grid by id
         * @param {String} albumId Album ID
         * @returns {void}
         */
        removeAlbumFromGridAndTree(albumId) {
            const album = this.store[albumId];

            if (!album) {
                return;
            }

            const onMainAlbumsGrid = this.grid && M.isAlbumsPage(1) && album.cellEl;

            if (this.tree) {
                this.tree.removeAlbum(album);
            }

            if (onMainAlbumsGrid) {
                this.grid.removeAlbum(album);
            }

            if (!album.filterFn) {
                delete this.store[albumId];
            }

            if (onMainAlbumsGrid) {
                this.grid.refresh();
            }

            delay('album:clean_grid_and_tree', () => {
                if (this.tree && this.tree.headButton) {
                    this.tree.headButton.isExpandable = checkIfExpandable();
                }
            });
        }

        /**
         * Reacting to the global removal of the node
         * @param {MegaNode} node Removed MegaNode
         * @returns {void}
         */
        onCDNodeRemove(node) {
            if (node.t) {
                if (M.c[node.h]) {
                    const childKeys = Object.keys(M.c[node.h]);

                    for (let i = 0; i < childKeys.length; i++) {
                        const n = M.d[childKeys[i]];

                        if (n) {
                            this.onCDNodeRemove(n);
                        }
                    }
                }

                return;
            }

            if (!scope.isGalleryNode(node)) {
                return;
            }

            const albumKeys = Object.keys(this.store)
                .filter(k => Array.isArray(this.store[k].nodes) && this.store[k].nodes.length > 0);

            if (!albumKeys.length) {
                return;
            }

            const { h: handle } = node;

            for (let i = 0; i < albumKeys.length; i++) {
                removeNodeFromAlbum(albumKeys[i], handle);
            }

            if (slideshowid) {
                tmpMv.splice(tmpMv.indexOf(node), 1);
            }

            if ($.timelineDialog) {
                removeNodeFromTimelineDialog(handle);
            }
        }

        /**
         * Reacting to the global change of the node
         * @param {MegaNode} node Updated MegaNode
         * @returns {void}
         */
        onCDNodeUpdate(node) {
            if (node.t) {
                if (M.c[node.h]) {
                    const childKeys = Object.keys(M.c[node.h]);

                    for (let i = 0; i < childKeys.length; i++) {
                        const n = M.d[childKeys[i]];

                        if (n) {
                            this.onCDNodeUpdate(n);
                        }
                    }
                }

                return;
            }

            if (M.getNodeRoot(node.p) === M.RubbishID) {
                this.onCDNodeRemove(node);
                return;
            }

            if (!scope.isGalleryNode(node)) {
                return;
            }

            const keys = Object.keys(this.store);

            for (let i = 0; i < keys.length; i++) {
                this.updateAlbumDataByUpdatedNode(keys[i], node);
            }

            if (!M.v.includes(node)) {
                M.v.push(node);
                sortInAlbumNodes(M.v);
            }

            if ($.timelineDialog) {
                this.updateTimelineDialog();
            }
        }

        removeUserAlbumItem({ id, s }) {
            const album = this.store[s];

            if (!album || !album.eIds[id]) {
                return;
            }

            const delHandle = album.eIds[id];
            this.isCover = this.isCover || album.node && album.node.h === delHandle;

            album.nodes = album.nodes.filter(({ h }) => h !== delHandle);

            delete album.eHandles[delHandle];
            delete album.eIds[id];

            delay('album:' + s + ':update_placeholder', () => {
                if (album.nodes.length) {
                    if (this.isCover) {
                        album.node = album.nodes[0];
                    }
                }
                else {
                    delete album.node;
                }

                if (album.cellEl) {
                    album.cellEl.updatePlaceholders();

                    if (!album.node || this.isCover || album.node.fa !== album.cellEl.coverFa) {
                        album.cellEl.updateCoverImage();
                    }
                }

                delete this.isCover;
            });

            if (M.currentdirid === 'albums/' + s) {
                if (this.grid.timeline && this.grid.timeline.selections[delHandle]) {
                    this.grid.timeline.deselectNode(M.d[delHandle]);
                }

                if (album.nodes.length) {
                    delay('album:' + s + ':remove_items', () => {
                        if (this.grid.timeline) {
                            this.grid.timeline.nodes = album.nodes;
                        }

                        this.grid.header.update(s);
                    });
                }
                else {
                    this.grid.header.update(s);
                    this.grid.showEmptyAlbumPage(s);
                }
            }
        }

        /**
         * Updating grid and tree after adding a node to an album
         * @param {String} albumId Album id
         * @returns {void}
         */
        updateGridAfterAddingNode(albumId, node) {
            const album = this.store[albumId];

            if (!album) {
                return;
            }

            // Creating the predefined album buttons if it has received it's first node (was hidden before)
            if (album.filterFn && album.nodes.length === 1) {
                if (M.isAlbumsPage() || M.isGalleryPage()) {
                    this.tree.insertPredefinedButton(albumId);
                }

                if (M.isAlbumsPage(1) && this.grid) {
                    this.grid.insertPredefinedAlbum(albumId);
                    this.grid.refresh();
                    this.grid.header.update();
                }
            }

            debouncedAlbumCellUpdate(albumId, true, false, album.eHandles[node.h] === album.at.c ? node : undefined);

            if (albumId === scope.getAlbumIdFromPath() && this.grid) {
                if (album.nodes.length === 1) {
                    this.grid.removeEmptyBlock();
                    this.grid.showAlbumContents(albumId);
                    this.grid.header.update(albumId);
                }
                else {
                    delay('album:' + albumId + ':add_items', () => {
                        if (this.grid && this.grid.timeline) {
                            this.grid.timeline.nodes = album.nodes;
                            this.grid.header.update(albumId);

                            if (this.grid.timeline.selCount > 0) {
                                window.selectionManager.showSelectionBar(
                                    mega.icu.format(l.album_selected_items_count, album.nodes.length)
                                        .replace('%1', this.grid.timeline.selCount)
                                );
                            }
                        }
                    });
                }
            }
        }

        /**
         * Updating the data of the specific album based on the new node details
         * @param {String} albumId Album id
         * @param {MegaNode} node Updated node
         * @returns {void}
         */
        updateAlbumDataByUpdatedNode(albumId, node) {
            const { h: handle } = node;
            const album = this.store[albumId];
            const additionIsNeeded = album
                && ((album.filterFn && album.filterFn(node)) || (!album.filterFn && album.eHandles[handle]))
                ? !album.nodes || !album.nodes.length || !album.nodes.some(({ h }) => h === handle)
                : false;

            if (additionIsNeeded) {
                album.nodes = (Array.isArray(album.nodes)) ? [...album.nodes, node] : [node];

                if (this.grid) {
                    this.updateGridAfterAddingNode(albumId, node);
                    debouncedLoadingUnset();
                }
            }
        }

        /**
         * Updating the data of the timeline dialog based on the new node details
         * @param {MegaNode} node Updated node
         * @returns {void}
         */
        updateTimelineDialog() {
            const timeline = $.timelineDialog.timeline;

            if (timeline) {
                delay('timeline_dialog:add_items', () => {
                    timeline.nodes = M.v;
                });
            }
        }

        static fetchDBDataFromGallery() {
            const passDbAction = (handles) => {
                MegaGallery.dbActionPassed = true;

                if (scope.albums.awaitingDbAction) {
                    scope.albums.init(handles);
                }
            };

            /**
             * @param {Object[]} nodes Nodes fetched from local DB to parse
             * @param {Boolean} skipDbFetch Skipping individual node fetch, when it is being loaded already
             * @returns {void}
             */
            const parseNodes = (nodes, skipDbFetch) => {
                const ignoreHandles = unwantedHandles();
                const handles = [];

                if (Array.isArray(nodes)) {
                    for (let i = 0; i < nodes.length; i++) {
                        if (!scope.isGalleryNode(nodes[i])) {
                            continue;
                        }

                        const { fa, s, p, h, fv } = nodes[i];

                        if (fa && s && !ignoreHandles[p] && !fv) {
                            handles.push(h);
                        }
                    }
                }

                if (skipDbFetch) {
                    passDbAction(handles);
                }
                else {
                    dbfetch.geta(handles)
                        .then(() => {
                            passDbAction(handles);
                        })
                        .catch(nop);
                }
            };

            MegaGallery.dbAction()
                .then(parseNodes)
                .catch(() => {
                    console.warn('Local DB failed. Fetching nodes from memory...');
                    parseNodes(Object.values(M.d), true);
                });
        }

        requestAlbumElementsRemoval() {
            if (!this.grid || !this.grid.timeline || !this.grid.timeline.selCount) {
                return;
            }

            const dialog = new RemoveAlbumItemsDialog(Object.keys(this.grid.timeline.selections));
            dialog.show();
        }

        removeElementsByHandles(handles) {
            loadingDialog.show('MegaAlbumsRemoveItems');

            const album = scope.albums.store[scope.getAlbumIdFromPath()];
            const ids = [];
            const handlesCache = {};
            const statsObj = {
                delImg: 0,
                delVid: 0,
                leftImg: 0,
                leftVid: 0
            };

            for (let i = 0; i < handles.length; i++) {
                ids.push(album.eHandles[handles[i]]);
                handlesCache[handles[i]] = true;
            }

            // Building stats object for removed and left items
            for (let i = 0; i < album.nodes.length; i++) {
                statsObj[
                    (handlesCache[album.nodes[i].h] ? 'del' : 'left')
                    + (scope.isVideo(album.nodes[i]) ? 'Vid' : 'Img')
                ]++;
            }

            mega.sets.elements.bulkRemove(
                ids,
                album.id
            ).then(() => {
                const content = generateToastContent(
                    mega.icu
                        .format(l.album_items_removed_status, handles.length)
                        .replace('%s', limitNameLength(album.label))
                );

                toaster.main.show({
                    icons: ['sprite-fm-mono icon-bin text-color-medium'],
                    content
                });

                delay(
                    'albums_stat_99917',
                    eventlog.bind(null, 99917, JSON.stringify(statsObj))
                );
            }).catch(() => {
                console.error('Could not remove the album items...');
            }).finally(() => {
                loadingDialog.hide('MegaAlbumsRemoveItems');
            });
        }

        previewSelectedElements() {
            scope.playSlideshow(scope.getAlbumIdFromPath());
        }

        downloadSelectedElements() {
            if (this.grid && this.grid.timeline && this.grid.timeline.selCount) {
                scope.reportDownload();
                M.addDownload(Object.keys(this.grid.timeline.selections));
            }
        }

        updateAlbumCover({ at, id, k, eHandles }, handle) {
            loadingDialog.show('MegaAlbumsUpdateCover');

            mega.sets.updateAttrValue({ at, k, id }, 'c', eHandles[handle] || '')
                .then(() => {
                    if (this.grid && this.grid.timeline) {
                        this.grid.timeline.clearSiblingSelections();
                    }

                    toaster.main.show({
                        icons: ['sprite-fm-mono icon-images text-color-medium'],
                        content: l.album_cover_updated
                    });
                })
                .catch(dump)
                .finally(() => {
                    loadingDialog.hide('MegaAlbumsUpdateCover');
                });
        }

        async getUniqueSetName(setNode) {
            const sets = Object.values(await mega.sets.buildTmp());
            const names = Object.create(null);
            const  { h, name } = setNode;

            for (let i = 0; i < sets.length; i++) {
                const { at, k } = sets[i];

                tryCatch(() => {
                    names[mega.sets.decryptSetAttr(at, k).n] = true;
                })();
            }

            if (!names[name]) {
                return name;
            }

            const newName = await AlbumNameDialog.prompt($.albumImport.id, names);

            return (newName === null) ? null : newName || name;
        }

        /**
         * @param {String[]} albumIds Album ids to add the share for
         * @returns {void}
         */
        addShare(albumIds) {
            mega.Share.initCopyrightsDialog(
                [],
                false,
                async() => {
                    delete $.itemExport;
                    delete $.itemExportEmbed;
                    loadingDialog.show('MegaAlbumsAddShare');

                    const promises = [];
                    const availableIds = [];

                    const { getSetById, elements } = mega.sets;

                    for (let i = 0; i < albumIds.length; i++) {
                        const id = albumIds[i];
                        const album = scope.albums.store[id];

                        if (!album) {
                            continue;
                        }

                        // Checking that all elements are good to be a part of share
                        const s = await getSetById(id).catch((ex) => console.error(ex));

                        availableIds.push(id);

                        if (!album.p) {
                            promises.push(mega.sets.addShare(id));
                        }

                        if (!s) {
                            continue;
                        }

                        const elsToReset = {};
                        const { e, k } = s;

                        if (e && typeof e === 'object') {
                            const minKeyLen = 43; // The length of 32b ByteArray in Base64 string

                            for (const eId in e) {
                                if (Object.hasOwnProperty.call(e, eId)) {
                                    const { h, k, o, at, ts } = e[eId];

                                    // Repairing the elements with old incorrect keys
                                    if (k.length < minKeyLen || (!at && ts < 1695340800)) {
                                        elsToReset[eId] = { h, o: o || 1500 };
                                    }
                                }
                            }
                        }

                        const eIds = Object.keys(elsToReset);

                        if (eIds.length) {
                            elements.bulkRemove(eIds, id)
                                .then(() => {
                                    return elements.bulkAdd(Object.values(elsToReset), id, k);
                                })
                                .catch(dump);
                        }
                    }

                    Promise.all(promises)
                        .then((results) => {
                            for (let i = 0; i < results.length; i++) {
                                const p = results[i][1] || results[i];

                                // In case there is a race, it is safer to assign ass result to albums directly
                                if (!scope.albums.store[availableIds[i]].p) {
                                    scope.albums.store[availableIds[i]].p = p;
                                }
                            }

                            loadingDialog.hide('MegaAlbumsAddShare');
                            const dialog = new AlbumShareDialog(availableIds);
                            dialog.show();
                        })
                        .catch((ex) => {
                            loadingDialog.hide('MegaAlbumsAddShare');
                            dump(ex);
                        });
                }
            );
        }

        /**
         * @param {String} albumIds Album ids to remove the share from
         * @returns {void}
         */
        removeShare(albumIds) {
            loadingDialog.show('MegaAlbumsRemoveShare');

            const idsToClear = [];

            for (let i = 0; i < albumIds.length; i++) {
                const id = albumIds[i];
                const album = scope.albums.store[id];

                if (album && album.p) {
                    idsToClear.push(id);
                }
            }

            if (!idsToClear.length) {
                loadingDialog.hide('MegaAlbumsRemoveShare');
                return;
            }

            Promise.all(idsToClear.map(id => mega.sets.removeShare(id)))
                .catch(dump)
                .finally(() => {
                    loadingDialog.hide('MegaAlbumsRemoveShare');
                });
        }
    }

    return new Albums();
});
