lazy(mega.gallery, 'albums', () => {
    'use strict';

    const scope = mega.gallery;

    const userAlbumsEnabled = true;

    /**
     * Globally storing disposing callback for convenience
     */
    let disposeKeyboardEvents = null;

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
     * This is a margin for the cell to render within the row
     * @type {Number}
     */
    const cellMargin = 4;

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
     * How many items can be selected at once when add to an album per batch
     */
    const maxSelectionsCount = 1500;

    const zoomSteps = [15, 10, 5, 3];

    const defZoomStep = 2;

    /**
     * The limit for number of albums on when to make the grid finer
     * @type {Number}
     */
    const bigAlbumCellsLimit = 4;

    /**
     * @type {Number}
     */
    const nameLenLimit = 40;

    let globalZoomStep = defZoomStep;

    /**
     * Storing the name value for just created album
     * @type {String}
     */
    let pendingName = '';

    let tmpMv = [];
    let previewMvLength = 0;

    /**
     * Checking whether an event is being dispatched with Ctrl key in hold
     * @param {Event} evt Event object to check
     * @returns {Boolean}
     */
    const getCtrlKeyStatus = ({ ctrlKey, metaKey }) => metaKey || ctrlKey;

    const isMSync = () => window.useMegaSync === 2 || window.useMegaSync === 3;

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

    const getAlbumIdFromPath = () => M.currentdirid.replace('albums/', '');

    /**
     * Reporting album content download event
     * @returns {void}
     */
    const reportDownload = () => {
        const onlySelection = scope.albums.grid.timeline && scope.albums.grid.timeline.selCount > 0;
        eventlog((onlySelection) ? 99793 : 99792);
    };

    const getAlbumsCount = () => Object.values(scope.albums.store).filter(({ filterFn }) => !filterFn).length;

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
        nodes.sort((a, b) => M.sortByModTimeFn2()(a, b, -1));
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
     * @returns {void}
     */
    const debouncedAlbumCellUpdate = (albumId, sortNodes = false) => {
        const album = scope.albums.store[albumId];

        if (!album) {
            return;
        }

        delay('album:' + albumId + ':update_placeholder', () => {
            if (sortNodes) {
                sortInAlbumNodes(album.nodes);
            }

            let coverUpdated = false;


            if (album.nodes.length) {
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
            else {
                album.node = album.nodes[0];
                coverUpdated = true;
            }

            if (album.cellEl) {
                album.cellEl.updatePlaceholders();

                if (coverUpdated) {
                    album.cellEl.updateCoverImage();
                }
            }
        });
    };

    /**
     * Fetching all MegaNode handles from specified albums
     * @param {String[]} albumIds ID of albums to fetch handles from
     * @returns {String[]}
     */
    const getAlbumsHandles = (albumIds) => {
        const handles = [];

        if (
            albumIds.length === 1
            && M.currentdirid === 'albums/' + albumIds[0]
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

    /**
     * Adding a loading icon to the cell
     * @param {HTMLElement} el DOM Element to add the loading icon to
     * @param {Boolean} isVideo Whether to attach loading icon as for a video or an image
     * @returns {void}
     */
    const attachLoadingIcon = (el, isVideo = false) => {
        if (!el.classList.contains('cover-loading')) {
            el.classList.add('cover-loading');
            const i = document.createElement('i');
            i.className = 'sprite-fm-mono ' + (isVideo ? 'icon-videos video' : 'icon-images image');
            el.appendChild(i);
        }
    };

    /**
     * Removing the loading icon from the cell
     * @param {HTMLElement} el DOM Element to remove the loading icon from
     * @returns {void}
     */
    const detachLoadingIcon = (el) => {
        if (el.classList.contains('cover-loading')) {
            el.classList.remove('cover-loading');
            const i = Array.from(el.children).find(child => child.tagName === 'I');

            if (i) {
                el.removeChild(i);
            }
        }
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
        content.append(textEl);

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
                    const handles = getAlbumsHandles(albumIds);

                    if (handles.length) {
                        reportDownload();
                        M.addDownload(handles);
                    }
                }
            },
            {
                label: l[864],
                icon: 'download-zip',
                click: () => {
                    const handles = getAlbumsHandles(albumIds);

                    if (handles.length) {
                        reportDownload();
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
                const handles = getAlbumsHandles(albumIds);

                if (handles.length) {
                    reportDownload();
                    M.addDownload(handles);
                }
            },
            children: (isMSync()) ? undefined : generateDownloadOptions(albumIds)
        };
    };

    /**
     * Re-initiating the events which are being paused due to dialogs
     * @returns {void}
     */
    const reinitiateEvents = () => {
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

    const fillAlbumTimelineCell = (el) => {
        if (el.ref.isVideo) {
            el.dataset.videoDuration = secondsToTimeShort(MediaAttribute(el.ref.node).data.playtime);
            el.classList.add('show-video-duration');
        }
    };

    const fillAlbumCell = (el) => {
        const div = document.createElement('div');
        const titleEl = document.createElement('div');
        el.album.cellEl.countEl = document.createElement('div');

        titleEl.textContent = el.album.label;
        titleEl.className = 'album-label text-ellipsis';
        titleEl.setAttribute('title', el.album.label);

        div.append(titleEl);
        div.append(el.album.cellEl.countEl);

        el.album.cellEl.updatePlaceholders();
        el.append(div);
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
     * @param {String} ignoreId Current Album ID
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
            domContainer.append(domElement);
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

        debouncedAlbumCellUpdate(albumId);

        const { grid } = scope.albums;

        if (grid) {
            if (M.isAlbumsPage(1)) {
                delay('album:refresh_main_grid', () => {
                    grid.refresh();
                });
            }
            else if (M.currentdirid === 'albums/' + albumId) {
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
                    M.openFolder('albums');
                    grid.showAllAlbums();
                }
                else {
                    grid.showEmptyAlbumPage(albumId);
                }
            }
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
     * Checking whether the video is available to be previewed
     * @param {MegaNode} n Node to check
     * @returns {Boolean}
     */
    const isAllowedVideo = (n) => {
        const data = mega.gallery.isGalleryVideo(n);
        return !!data;
    };

    /**
     * Launching the slideshow right away (in fullscreen mode)
     * @param {String} albumId Album ID
     * @param {Boolean} useFullscreen Skipping videos and playing in the fullscreen
     * @returns {void}
     */
    const playSlideshow = (albumId, useFullscreen) => {
        const album = scope.albums.store[albumId];

        if (album && album.nodes.length > 0) {
            let firstNode = (useFullscreen && album.nodes.find(n => !isAllowedVideo(n))) || album.nodes[0];
            let selHandles = {};

            if (scope.albums.grid && scope.albums.grid.timeline) {
                selHandles = scope.albums.grid.timeline.selections;

                if (Object.keys(selHandles).length) {
                    for (let i = 0; i < album.nodes.length; i++) {
                        if (selHandles[album.nodes[i].h]
                            && (!useFullscreen || !isAllowedVideo(album.nodes[i]))) {
                            firstNode = album.nodes[i];
                            break;
                        }
                    }
                }
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
                    const selCount = Object.keys(selHandles).length;

                    // double click will mess _selCount, so we need to reset here
                    if (scope.albums.grid && scope.albums.grid.timeline) {
                        scope.albums.grid.timeline._selCount = selCount;
                        scope.albums.grid.timeline.adjustToBottomBar();
                    }

                    reinitiateEvents();

                    if (window.selectionManager.clearSlideshowSelections) {
                        window.selectionManager.clearSlideshowSelections();
                    }

                    for (let i = 0; i < eventsToDisposeOnClose.length; i++) {
                        eventsToDisposeOnClose[i]();
                    }

                    if (M.isAlbumsPage(1) || !selCount) {
                        window.selectionManager.hideSelectionBar();
                    }
                    else {
                        window.selectionManager.showSelectionBar(
                            mega.icu.format(l.album_selected_items_count, album.nodes.length)
                                .replace('%1', selCount)
                        );
                    }
                });
            });
        }
    };

    /**
     * Getting the month label for the node
     * @param {MegaNode} node Node to fetch the label from
     * @returns {String}
     */
    const getMonthLabel = ({ mtime, ts }) => GalleryNodeBlock.getTimeString(mtime || ts, 3);

    /**
     * Checking whether an element is in select area, checking if at least two edges are within the area
     * @param {HTMLElement} domEl Dom element
     * @param {Number[]} area Coordinates of the selection
     * @param {Number} containerPadding The left padding of the container
     * @returns {Boolean}
     */
    const isInSelectArea = (domEl, [left, right, top, bottom], containerPadding = 0) => {
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
            this.currentdirid = M.currentdirid;
            this._boundEvents = [];
            this.init();
            this.albumId = albumId;
            this.timeline = container;
        }

        get items() {
            return scope.albums.store[this.albumId] ? scope.albums.store[this.albumId].nodes : [];
        }

        get items_per_row() {
            return zoomSteps[this.timeline.zoomStep];
        }

        clearSlideshowSelections() {
            const cells = scope.albums.grid.timeline.cellCache;

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

    class AlbumItemContextMenu extends MMenuSelect {
        constructor() {
            super();

            const selections = Object.keys(scope.albums.grid.timeline.selections);
            const albumId = getAlbumIdFromPath();
            const album = scope.albums.store[albumId];
            const options = [];
            const isCoverChangeable = !album.filterFn
                && selections.length === 1
                && (!album.at.c || album.eIds[album.at.c] !== selections[0]);

            const onlyImagesSelected = !selections.some((h) => isAllowedVideo(M.d[h]));

            if (onlyImagesSelected) {
                options.push({
                    label: l.album_play_slideshow,
                    icon: 'play-square',
                    click: () => {
                        playSlideshow(albumId, true);
                    }
                });
            }

            options.push(
                {
                    label: l.album_item_preview_label,
                    icon: 'preview-reveal',
                    click: () => {
                        playSlideshow(albumId);
                    }
                },
                {},
                {
                    label: l.album_download,
                    icon: 'download-small',
                    click: () => {
                        if (M.currentdirid !== 'albums/' + albumId) {
                            return;
                        }

                        const handles = getAlbumsHandles([albumId]);

                        if (!handles.length) {
                            return;
                        }

                        reportDownload();
                        M.addDownload(handles);
                    }
                }
            );

            if (isCoverChangeable) {
                options.push({
                    label: l.set_as_album_cover,
                    icon: 'images',
                    click: () => {
                        if (scope.albums.grid.timeline.selCount === 1) {
                            scope.albums.updateAlbumCover(album, Object.keys(scope.albums.grid.timeline.selections)[0]);
                        }
                    }
                });
            }

            if (!album.filterFn) {
                options.push(
                    {},
                    {
                        label: l.album_item_remove_label,
                        icon: 'bin',
                        click: () => {
                            scope.albums.requestAlbumElementsRemoval();
                        },
                        classes: ['red']
                    }
                );
            }

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
                isVideo: isAllowedVideo(node),
                setThumb: (dataUrl) => {
                    this.setThumb(dataUrl);
                }
            };

            this.el.setAttribute('title', node.name);
            this.el.setAttribute('id', node.h);

            this._active = true;
            this._selected = false;

            this.attachEvents(clickFn, dbclickFn, useMenu);
            attachLoadingIcon(this.el, this.el.ref.isVideo);
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
                this.el.append(check);
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
                        const { pageX, pageY, target } = evt;

                        if (!this.isSelected) {
                            clickFn(this, evt);
                        }

                        const contextMenu = new AlbumItemContextMenu(target);
                        contextMenu.show(pageX, pageY);
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
            if (this.el.classList.contains('cover-loading')) {
                this.el.style.backgroundImage = 'url(\'' + dataUrl + '\')';
                this.el.style.backgroundColor = 'white';
                detachLoadingIcon(this.el);
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

            this.attachEvents();
        }

        get selCount() {
            return this._selCount;
        }

        get rowHeight() {
            return this.cellSize + cellMargin * 2;
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

            if (step >= zoomSteps.length || step < 0) {
                return;
            }

            this._zoomStep = step;

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
                perfectScrollOptions: {
                    handlers: ['click-rail', 'drag-scrollbar', 'wheel', 'touch'],
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
                else if (lastEl.list.length % zoomSteps[this.zoomStep] === 0) {
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
                this.dynamicList.options.onResize = this.onResize.bind(this);
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
                    const isInArea = isInSelectArea(
                        {
                            offsetLeft: Math.floor(
                                this.cellSize * j + cellMargin * (j * 2 + 1)
                            ),
                            offsetTop: Math.floor(
                                this.dynamicList._offsets[i.toString()] + cellMargin
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
                            if (isInSelectArea(row.children[j], posArr, this.sidePadding)) {
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
                    getScrollTop: () => this.dynamicList.getScrollTop()
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
            if (disposeKeyboardEvents) {
                disposeKeyboardEvents();
            }

            disposeKeyboardEvents = MComponent.listen(document, 'keydown', (evt) => {
                if (evt.target !== document.body) {
                    return;
                }

                const { key, shiftKey } = evt;
                const isCtrl = getCtrlKeyStatus(evt);

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
                            inRowIndex = zoomSteps[this.zoomStep] - 1;
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
                            disposeKeyboardEvents();
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
                            disposeKeyboardEvents();
                            return true;
                        }

                        if (!this.selCount) {
                            return true;
                        }

                        if (this.selCount === 1) {
                            playSlideshow(getAlbumIdFromPath());
                        }
                        else {
                            reportDownload();
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
                    + cellMargin
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
            message.textContent = mega.icu.format(l.album_items_limit, maxSelectionsCount);
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
                - gap * zoomSteps[this.zoomStep] // Cell margins
                - this.sidePadding * 2) // Horizontal padding
                / zoomSteps[this.zoomStep]; // Columns
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

            const elements = [];

            if (this._nodes[rowKey]) {
                const sizePx = this.cellSize + 'px';
                const { list, monthLabel } = this._nodes[rowKey];

                for (let i = 0; i < list.length; i++) {
                    const tCell = this.getCachedCell(list[i]);

                    tCell.el.style.width = sizePx;
                    tCell.el.style.height = sizePx;

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

                    div.append(tCell.el);
                    fillAlbumTimelineCell(tCell.el);

                    tCell.el.ref.el = tCell.el;

                    elements.push(tCell.el);
                }
            }

            delay(`album_timeline:render_row_${rowKey}`, () => {
                const toFetchAttributes = [];

                for (let i = 0; i < elements.length; i++) {
                    const element = elements[i];

                    if (element.clientWidth && element.clientHeight) {
                        toFetchAttributes.push(element.ref);
                    }
                }

                if (toFetchAttributes.length) {
                    MegaGallery.addThumbnails(toFetchAttributes);
                }
            });

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
                scope.albums.grid.header.update(M.currentdirid.replace(/albums\/?/i, ''), Object.keys(this.selections));
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
                    checkIfDisabled: () => this.zoomStep >= zoomSteps.length - 1
                }
            ];

            for (let i = 0; i < buttons.length; i++) {
                const { icon, clickFn, tooltip, classes, checkIfDisabled } = buttons[i];

                const btn = document.createElement('button');
                btn.className = 'btn-icon simpletip ' + classes;
                btn.dataset.simpletip = tooltip;
                const iconEl = document.createElement('i');
                iconEl.className = 'sprite-fm-mono ' + icon;
                btn.append(iconEl);
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

                this.zoomControls.append(btn);

                if ((!i && !this.zoomStep)
                    || (i === buttons.length - 1 && this.zoomStep === zoomSteps.length - 1)) {
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

            if (disposeKeyboardEvents) {
                disposeKeyboardEvents();
            }

            if (this.el && this.el.parentNode) {
                this.el.parentNode.removeChild(this.el);
            }
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

    class AlbumItemsDialog extends TimelineDialog {
        constructor(albumId, keepEnabled) {
            super({
                ok: {
                    label: l.add,
                    callback: () => {
                        const album = scope.albums.store[albumId];
                        this.confirmed = true;

                        if (this.timeline && album) {
                            const handles = Object.keys(this.timeline.selections);

                            if (handles.length > 0) {
                                const existingHandles = {};
                                const handlesToAdd = [];

                                const { nodes, label } = album;
                                let addedCount = 0;

                                for (let i = 0; i < nodes.length; i++) {
                                    existingHandles[nodes[i].h] = true;

                                    if (mega.gallery.isGalleryVideo(nodes[i])) {
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

                                        if (M.d[h] && mega.gallery.isGalleryVideo(M.d[h])) {
                                            this.videosCount++;
                                        }
                                        else {
                                            this.imagesCount++;
                                        }
                                    }
                                }

                                if (addedCount > 0) {
                                    loadingDialog.show('MegaAlbumsAddItems');

                                    mega.sets.elements.bulkAdd(handlesToAdd, albumId)
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
                    reinitiateEvents();
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

        show() {
            super.show();
            document.activeElement.blur();
            this.updateSelectedCount(0);

            if (scope.albums.grid && scope.albums.grid.timeline && scope.albums.grid.timeline.dragSelect) {
                scope.albums.grid.timeline.dragSelect.disabled = true;
            }

            this.timeline = new AlbumTimeline({
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
                selectionLimit: maxSelectionsCount
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
                if (mega.gallery.sections[mega.gallery.secKeys.cdphotos].filterFn(n, cameraTree)) {
                    galleryNodes.cd.push(n);
                    isGalleryNode = true;
                }

                else if (mega.gallery.sections[mega.gallery.secKeys.cuphotos].filterFn(n, cameraTree)) {
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
                this.slot.append(nav.el);
            }
            else {
                const div = document.createElement('div');
                div.className = 'text-center timeline-location';
                div.textContent = (galleryNodes.cu.length > 0)
                    ? l.on_camera_uploads
                    : l.on_cloud_drive;

                this.slot.append(div);
            }

            this.slot.append(this.timeline.el);

            delay('render:album_timeline', () => {
                if (this.timeline) {
                    this.timeline.nodes = galleryNodes.all;
                }
            });

            timemarks.albumItemsSelectStarted = Date.now();
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
                    reinitiateEvents();
                }
            });

            this.setContent();
            this._title.classList.add('text-center');
            this.albumId = albumId;
        }

        setContent() {
            this.slot = document.createElement('div');
            this.title = l.set_album_cover;
        }

        show() {
            super.show();

            let isLoaded = false;

            if (scope.albums.grid && scope.albums.grid.timeline && scope.albums.grid.timeline.dragSelect) {
                scope.albums.grid.timeline.dragSelect.disabled = true;
            }

            this.timeline = new AlbumTimeline({
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

            this.slot.append(this.timeline.el);

            delay('render:album_timeline', () => {
                if (this.timeline) {
                    this.timeline.nodes = nodes;
                }
            });

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
        constructor(albumId) {
            super({
                ok: {
                    label: albumId ? l.album_rename_btn_label : l.album_create_btn_label,
                    callback: () => {
                        const { value } = this.input;
                        const { err, isDisabled } = this.validateInput(albumId);

                        if (mega.sets && !err && !isDisabled) {
                            this.okBtn.loading = true;

                            if (albumId) {
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
                    reinitiateEvents();
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

            div.append(inputIcon);
            div.append(this.input);
            this.slot.append(div);
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
                case albumNameExists(value, albumId):
                    validation.err = l.album_name_exists;
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
                this.slot.append(this.hint);
            }

            this.hint.className = className;
            this.hint.textContent = text;
        }

        showError(err) {
            this.input.classList.add('error');
            this.showHint(err, 'duplicated-input-warning');
        }

        showWarning(warn) {
            this.showHint(warn, 'whitespaces-input-warning');
        }

        clearHint() {
            this.input.classList.remove('error');

            if (this.hint) {
                this.slot.removeChild(this.hint);
                delete this.hint;
            }
        }

        show() {
            super.show();
            this.triggerInputSaveguard();

            delay('focus:new_album_input', () => {
                this.input.focus();
            }, 200);
        }

        hide() {
            super.hide();
            this.disposeInputListener();
        }
    }

    class NoMediaForAlbums extends MEmptyPad {
        constructor() {
            super();
            this.setContents();
        }

        setContents() {
            this.el.append(MEmptyPad.createIcon('section-icon sprite-fm-theme icon-gallery-photos'));
            this.el.append(MEmptyPad.createTxt(l.album_no_media, 'fm-empty-cloud-txt empty-albums-title'));
            this.el.append(MEmptyPad.createTxt(l.empty_album_subtitle, 'fm-empty-description'));

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

            this.el.append(icon);
            this.el.append(titleEl);

            if (userAlbumsEnabled) {
                const button = new MButton(
                    btnLabel,
                    null,
                    buttonFn,
                    'mega-button large positive'
                );
                this.el.append(button.el);
            }
        }
    }

    class MultipleAlbumContextMenu extends MMenuSelect {
        constructor(domCells) {
            super();

            const options = [];
            const albums = [];
            let somePredefined = false;
            let someContainNodes = false;

            for (let i = 0; i < domCells.length; i++) {
                const { album } = domCells[i];

                if (!somePredefined && album.filterFn) {
                    somePredefined = true;
                }

                if (!someContainNodes && album.nodes.length > 0) {
                    someContainNodes = true;
                }

                albums.push(album);
            }

            if (someContainNodes) {
                options.push(generateDownloadMenuItem(albums.map(({ id }) => id)));
            }

            if (!somePredefined) {
                options.push({
                    label: l.delete_album,
                    click: () => {
                        const dialog = new RemoveAlbumDialog(albums.map(({ id }) => id));
                        dialog.show();
                        this.hide();
                    },
                    icon: 'bin',
                    classes: ['red']
                });
            }

            this.options = options;
        }
    }

    class AlbumContextMenu extends MMenuSelect {
        constructor(albumId) {
            super();

            const options = [];
            const album = scope.albums.store[albumId];
            const isUserAlbum = !album.filterFn;

            if (album.nodes.length && album.nodes.some(n => !isAllowedVideo(n))) {
                options.push({
                    label: l.album_play_slideshow,
                    icon: 'play-square',
                    click: () => {
                        $.selected = [];
                        playSlideshow(albumId, true);
                    }
                });
            }

            if (M.currentdirid !== `albums/${albumId}`) {
                options.push({
                    label: l.album_open,
                    icon: 'preview-reveal',
                    click: () => {
                        M.openFolder(`albums/${albumId}`);
                    }
                });
            }

            if (isUserAlbum) {
                options.push(
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

                if (album.nodes.length) {
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
                const resetSelections = !getCtrlKeyStatus(evt) && !evt.shiftKey;
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
                            ? new MultipleAlbumContextMenu(selectedCells)
                            : new AlbumContextMenu(albumId);

                        if (contextMenu.options) {
                            contextMenu.show(pageX, pageY);
                        }
                    }
                }
            );
        }

        buildElement() {
            this.el = document.createElement('div');
            this.el.className = 'albums-grid-cell flex flex-column justify-end cursor-pointer';
            attachLoadingIcon(this.el);
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
                detachLoadingIcon(this.el);
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

                placeholder.append(icon);
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

            parent.append(this.el);
            parent.classList.remove('hidden');

            this.setBreadcrumbs();

            // Only 'Albums' section needs this. Otherwise the banner does not appear in albums
            $('.fm-right-files-block').addClass('visible-notification');
        }

        setBreadcrumbs(albumId) {
            if (this.breadcrumbs) {
                this.el.removeChild(this.breadcrumbs);
            }

            this.breadcrumbs = document.createElement('div');

            const span = document.createElement('span');

            if (albumId && scope.albums.store[albumId]) {
                const div = document.createElement('div');
                const btn = new MButton(
                    '',
                    'icon-next-arrow rot-180',
                    () => {
                        M.openFolder('albums');
                    },
                    'mega-button breadcrumb-btn action'
                );

                btn.el.title = l[822];

                span.title = scope.albums.store[albumId].label;
                span.textContent = span.title;
                span.className = 'text-ellipsis ml-3 text-color-high';

                div.append(btn.el);
                this.breadcrumbs.append(div);
                this.breadcrumbs.append(span);
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

        setSpecificAlbumButtons(albumId, handles) {
            const album = scope.albums.store[albumId];
            let nodesAvailable = false;
            let needSlideshow = false;

            if (Array.isArray(handles) && handles.length) {
                needSlideshow = true;
                nodesAvailable = true;

                for (let i = 0; i < handles.length; i++) {
                    const n = M.d[handles[i]];

                    if (!n) {
                        continue;
                    }

                    if (isAllowedVideo(n)) {
                        needSlideshow = false;
                        break;
                    }
                }
            }
            else {
                for (let i = 0; i < album.nodes.length; i++) {
                    nodesAvailable = true;

                    if (!isAllowedVideo(album.nodes[i])) {
                        needSlideshow = true;
                    }

                    if (nodesAvailable && needSlideshow) {
                        break;
                    }
                }
            }

            if (needSlideshow) {
                AlbumsGridHeader.attachButton(
                    l.album_play_slideshow,
                    'icon-play-square icon-blue',
                    () => {
                        playSlideshow(albumId, true);
                    },
                    this.rightButtons
                );
            }

            if (album && !album.filterFn) {
                AlbumsGridHeader.attachButton(
                    l.add_album_items,
                    'icon-add icon-green',
                    () => {
                        const dialog = new AlbumItemsDialog(albumId);
                        dialog.show();
                    },
                    this.rightButtons,
                    !M.v.length
                );
            }

            if (nodesAvailable) {
                AlbumsGridHeader.attachButton(
                    l.album_download,
                    'icon-download-small icon-blue',
                    ({ el }) => {
                        if (isMSync()) {
                            const handles = getAlbumsHandles([albumId]);

                            if (handles.length) {
                                reportDownload();
                                M.addDownload(handles);
                            }
                        }
                        else {
                            const { x, bottom } = el.getBoundingClientRect();
                            const menu = new DownloadContextMenu(albumId);

                            menu.show(x, bottom + 4);
                        }
                    },
                    this.rightButtons
                );
            }
        }

        setGlobalButtons() {
            if (userAlbumsEnabled) {
                AlbumsGridHeader.attachButton(
                    l.new_album,
                    'icon-add icon-green',
                    () => {
                        const dialog = new AlbumNameDialog();
                        dialog.show();
                    },
                    this.rightButtons
                );
            }
        }

        update(albumId, handles) {
            this.setRightControls(albumId, handles);
            this.setBreadcrumbs(albumId);
        }

        setRightControls(albumId, handles) {
            if (this.rightButtons) {
                while (this.rightButtons.firstChild) {
                    this.rightButtons.removeChild(this.rightButtons.firstChild);
                }
            }
            else {
                this.rightButtons = document.createElement('div');
                this.rightButtons.className = 'flex flex-row';
                this.el.append(this.rightButtons);
            }

            if (albumId) {
                this.setSpecificAlbumButtons(albumId, handles);
            }
            else {
                this.setGlobalButtons();
            }
        }
    }

    AlbumsGridHeader.attachButton = (label, icon, clickFn, parent, isDisabled) => {
        const button = new MButton(
            label,
            icon,
            clickFn,
            'mega-button action ml-5'
        );

        if (parent) {
            parent.append(button.el);
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

            MComponent.listen(this.el, 'click', ({ shiftKey }) => {
                AlbumCell.clearSiblingSelections();

                if (!shiftKey) {
                    this.lastSelected = null;
                }
            });

            parent.append(this.el);
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

            subdiv.append(labelEl);
            subdiv.append(captionEl);
            this.pendingCell.append(subdiv);

            const firstUserAlbum = getFirstUserAlbum();

            if (firstUserAlbum) {
                this.el.insertBefore(this.pendingCell, firstUserAlbum.cellEl.el);
            }
            else {
                this.el.append(this.pendingCell);
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

        showEmptyAlbumPage(albumId) {
            if (this.timeline) {
                this.timeline.clear();
                delete this.timeline;
            }

            let mvLength = M.v.length;
            if (slideshowid) {
                mvLength = tmpMv.length - (previewMvLength - M.v.length);
            }

            if (mvLength) {
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

            this.timeline = new AlbumTimeline({
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

                    delay('render:in_album_node_preview', () => {
                        const isVideo = mega.gallery.isGalleryVideo(cell.el.ref.node);

                        if (isVideo && (!isVideo.isPreviewable || !MediaAttribute.getMediaType(cell.el.ref.node))) {
                            reportDownload();
                            M.addDownload([h]);
                        }
                        else {
                            playSlideshow(albumId);
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
            this.el.append(this.timeline.el);

            delay('render:album_content_timeline', () => {
                if (this.timeline && this.timeline.el && albumId === getAlbumIdFromPath()) {
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

            this.el.append(this.emptyBlock.el);
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
                    this.removeEmptyBlock();
                }
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
                    detachLoadingIcon(albumCell.el);
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
                    this.el.append(albumCell.el);
                    albumsCount++;

                    if (albumCell.el.album.node) {
                        thumbBlocks.push(albumCell.el.album);
                    }
                    else {
                        detachLoadingIcon(albumCell.el);
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
                    if (isInSelectArea(albums[i].cellEl.el, area)) {
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
            if (disposeKeyboardEvents) {
                disposeKeyboardEvents();
            }

            disposeKeyboardEvents = (() => {
                const disposeKeydown = MComponent.listen(document, 'keydown', (evt) => {
                    if (evt.target !== document.body) {
                        return;
                    }

                    const albums = Object.values(scope.albums.store).filter(album => albumIsRenderable(album));

                    if (!albums.length) {
                        return true;
                    }

                    const { key, shiftKey } = evt;
                    const isCtrl = getCtrlKeyStatus(evt);
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
                            scope.albums.grid.el.scrollTop = albumCell.el.offsetTop - cellMargin * 3;
                        }
                        else {
                            const bottomOverlap = albumCell.el.offsetTop + albumCell.el.offsetHeight
                                - (scope.albums.grid.el.scrollTop + scope.albums.grid.el.clientHeight);

                            if (bottomOverlap > 0) {
                                scope.albums.grid.el.scrollTop += bottomOverlap + cellMargin * 3;
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
                M.openFolder('albums');
            }
            else {
                this.showAlbumContents(id);
                this.header.update(id);
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

        async updateInAlbumNode({ s, h: handle, id }) {
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

            if (M.currentdirid === 'albums/' + s) {
                const { timeline, header } = this;

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
            this.treeList.className = 'albums-tree-list';

            this.el.append(this.treeList);

            parent.append(this.el);
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
                this.treeList.append(this.pendingBtn.el);
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
                        M.openFolder('albums');
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

            // @TODO: Remove this bit once User albums are in place
            if (!userAlbumsEnabled && !this.headButton.isExpandable) {
                this.headButton.el.classList.add('hidden');
            }
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
                    album.button = AlbumsTree.createButton(albumId, album.label);
                }

                if (!album.filterFn || album.nodes) {
                    this.treeList.append(album.button.el);
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
                    album.button = AlbumsTree.createButton(albumId, album.label);
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
                this.treeList.removeChild(album.button.el);
            }
        }

        expandList() {
            if (this.headButton) {
                this.listExpanded = true;
                this.headButton.el.classList.add('expansion-btn-open');
            }
        }

        collapseList() {
            if (this.headButton) {
                this.listExpanded = false;
                this.headButton.el.classList.remove('expansion-btn-open');
            }
        }
    }

    /**
     * @param {String} albumId Album ID
     * @param {String} label Button label
     * @returns {MSidebarButton}
     */
    AlbumsTree.createButton = (albumId, label) => {
        const btn = new MSidebarButton(
            label,
            'icon-album',
            () => {
                storeLastActiveTab();

                const nextFolder = 'albums/' + albumId;

                if (M.currentdirid !== nextFolder) {
                    M.openFolder(nextFolder);
                }
            },
            'subalbum-btn'
        );

        btn.attachEvent(
            'contextmenu',
            ({ pageX, pageY }) => {
                const contextMenu = new AlbumContextMenu(albumId);
                contextMenu.show(pageX, pageY);
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
                    const isPending = pendingName !== '' && mega.sets.decryptAttr(at, k).n === pendingName;

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
                        data.e = Object.keys(album.eIds).map((id) => {
                            return {
                                id,
                                h: album.eIds[id]
                            };
                        });
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

                        M.openFolder('albums');
                    }
                }),
                mega.sets.subscribe('aep', 'albums', (element) => {
                    if (this.grid) {
                        this.grid.updateInAlbumNode(element);
                    }

                    debouncedLoadingUnset();
                }),
                mega.sets.subscribe('aer', 'albums', (element) => {
                    this.removeUserAlbumItem(element);
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
                    if (!mega.gallery.isGalleryNode(fmNodes[i])) {
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

        init(handles) {
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
            const sets = Object.values(await mega.sets.buildTmp());
            const albums = [];

            if (!Array.isArray(sets) || !sets.length) {
                return [];
            }

            const ignoreHandles = unwantedHandles();

            for (let i = 0; i < sets.length; i++) {
                albums.push(this.createAlbumData(sets[i], ignoreHandles));
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

        async buildAlbumsList(nodesArr) {
            if (scope.albumsRendered) {
                this.tree.renderAlbumButtons();
                return;
            }

            const albums = Object.values(this.store);

            for (let index = 0; index < albums.length; index++) {
                const { id, filterFn } = albums[index];

                if (!filterFn) {
                    delete this.store[id];
                }
            }

            if (this.tree && this.tree.treeList.children.length > 0) {
                this.tree.clear();
            }

            this.setPredefinedAlbums(nodesArr);
            await this.setUserAlbums();

            scope.albumsRendered = true;

            if (this.tree) {
                this.tree.headButton.isExpandable = checkIfExpandable();

                // @TODO: Remove this bit once User albums are in place
                if (!userAlbumsEnabled && !this.tree.headButton.isExpandable) {
                    this.tree.headButton.el.classList.add('hidden');
                }
                else {
                    this.tree.headButton.el.classList.remove('hidden');
                }
            }
        }

        /**
         * @param {Object.<String, any>} data Set data to process
         * @param {Object.<String, Boolean>} ignoreHandles Handles to ignore when add to the album
         * @returns {void}
         */
        createAlbumData({ e, at, k, id, ts, cts }, ignoreHandles) {
            const attr = mega.sets.decryptAttr(at, k);
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
            }
            else {
                album = {
                    at: attr,
                    k,
                    id,
                    label,
                    nodes,
                    node,
                    button: AlbumsTree.createButton(id, label),
                    ts,
                    cts,
                    eHandles,
                    eIds
                };

                this.store[id] = album;
            }

            return album;
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
                this.tree.treeList.append(album.button.el);
            }

            this.tree.headButton.isExpandable = true;
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
            if (disposeKeyboardEvents) {
                disposeKeyboardEvents();
            }

            disposeKeyboardEvents = null;
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
                if (this.tree) {
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

            if (!mega.gallery.isGalleryNode(node)) {
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

            if (!mega.gallery.isGalleryNode(node)) {
                return;
            }

            const keys = Object.keys(this.store);

            for (let i = 0; i < keys.length; i++) {
                this.updateAlbumDataByUpdatedNode(keys[i], node);
            }
        }

        removeUserAlbumItem({ id, s }) {
            const album = this.store[s];

            if (!album || !album.eIds[id]) {
                return;
            }

            const delHandle = album.eIds[id];
            const isCover = album.node && album.node.h === delHandle;

            album.nodes = album.nodes.filter(({ h }) => h !== delHandle);

            delete album.eHandles[delHandle];
            delete album.eIds[id];

            delay('album:' + s + ':update_placeholder', () => {
                if (album.nodes.length) {
                    album.node = album.nodes[0];
                }
                else {
                    delete album.node;
                }

                if (album.cellEl) {
                    album.cellEl.updatePlaceholders();

                    if (!album.node || isCover) {
                        album.cellEl.updateCoverImage();
                    }
                }
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
        updateGridAfterAddingNode(albumId) {
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

            debouncedAlbumCellUpdate(albumId, true);

            if (M.currentdirid === 'albums/' + albumId && this.grid) {
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
                    this.updateGridAfterAddingNode(albumId);
                    debouncedLoadingUnset();
                }
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
                        if (!mega.gallery.isGalleryNode(nodes[i])) {
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

            const album = scope.albums.store[getAlbumIdFromPath()];

            mega.sets.elements.bulkRemove(
                handles.map((h) => album.eHandles[h]),
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
            }).catch(() => {
                console.error('Could not remove the album items...');
            }).finally(() => {
                loadingDialog.hide('MegaAlbumsRemoveItems');
            });
        }

        previewSelectedElements() {
            playSlideshow(getAlbumIdFromPath());
        }

        downloadSelectedElements() {
            if (this.grid && this.grid.timeline && this.grid.timeline.selCount) {
                reportDownload();
                M.addDownload(Object.keys(mega.gallery.albums.grid.timeline.selections));
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
    }

    return new Albums();
});
