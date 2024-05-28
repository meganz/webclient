/** @property mega.ui.mInfoPanel */
lazy(mega.ui, 'mInfoPanel', () => {
    'use strict';

    // DOM caches
    const $container = $('.folder-file-info-panel');

    // Other constants
    const visibleClass = 'info-panel-visible';

    /**
     * Logic to reset panel to default, clear values, icons etc
     * @returns {undefined}
     */
    function resetToDefault() {

        // Update DOM
        const $blockView = $('.block-view-file-type', $container);

        $('.name-section .description', $container).addClass('hidden');
        $('.name-value', $container).text('');
        $('.type-section', $container).addClass('hidden');
        $('.type-value', $container).text('');
        $('.size-value', $container).text('');
        $('.path-section', $container).addClass('hidden');
        $('.path-value', $container).text('');
        $('.date-added-section', $container).addClass('hidden');
        $('.last-modified-section', $container).addClass('hidden');
        $('.date-added-value', $container).text('');
        $('.contains-section', $container).addClass('hidden');
        $('.contains-value', $container).text('');
        $('.permissions-section', $container).addClass('hidden');
        $('.permissions-icon', $container).addClass('hidden');
        $('.permissions-value', $container).text('');
        $('.owner-section', $container).addClass('hidden');
        $('.owner-value', $container).text('');
        $('.version-section', $container).addClass('hidden');
        $('.version-value', $container).text('');
        $('.current-version-section', $container).addClass('hidden');
        $('.current-version-value', $container).text('');
        $('.prev-version-section', $container).addClass('hidden');
        $('.prev-version-value', $container).text('');

        $container.removeClass('taken-down');
        $container.removeClass('undecryptable');
        $blockView.removeClass().addClass('block-view-file-type').addClass('item-type-icon-90');
        $('img', $blockView).attr('src', '');
        $('img', $blockView).addClass('hidden');
    }

    /**
     * Get all the node data (so we only look it up once)
     * @param {Array} selectedNodeHandles Array of node handles
     * @returns {Array} Returns an array of nodes
     */
    function getAllNodeData(selectedNodeHandles) {

        const nodes = [];

        for (let i = selectedNodeHandles.length; i--;) {

            const nodeHandle = selectedNodeHandles[i];
            const node = M.getNodeByHandle(nodeHandle);

            if (!node) {
                continue;
            }

            nodes.push(node);
        }

        // reverse the list to maintain nodes original order to be use on scroll
        return nodes.reverse();
    }

    /**
     * From the selected nodes, get how many folders and files are selected
     * @param {Array} nodes Array of nodes
     * @returns {String} Returns how many e.g. 3 folders, 2 files
     */
    function getSelectedFolderAndFileCount(nodes) {

        let folderCount = 0;
        let fileCount = 0;

        for (let i = 0; i < nodes.length; i++) {

            const node = nodes[i];

            if (node.t) {
                folderCount++;
            }
            else {
                fileCount++;
            }
        }

        // Reword e.g. 3 folders, 2 files
        return fm_contains(fileCount, folderCount, false);
    }

    /**
     * From the selected nodes, get the total size of them in Bytes (formatted for user)
     * @param {Array} nodes Array of nodes
     * @returns {String} Returns the size e.g.  200 MB
     */
    function getSize(nodes) {

        let totalBytes = 0;

        for (let i = 0; i < nodes.length; i++) {

            const node = nodes[i];

            if (node.t) {
                totalBytes += node.tb;
            }
            else {
                totalBytes += node.s;
            }
        }

        return bytesToSize(totalBytes);
    }

    /**
     * From the selected node handle, get the path to the node
     * @param {String} nodeHandle node handle
     * @returns {String} folder/file path
     */
    function getPath(nodeHandle) {

        const pathItems = M.getPath(nodeHandle);
        const path = document.createElement('div');

        // Reverse order so the root node is first
        pathItems.reverse();

        for (let i = 0; i < pathItems.length; i++) {

            const pathItemHandle = pathItems[i];
            const node = M.getNodeByHandle(pathItemHandle);
            const $span = document.createElement('span');
            let nodeName = node.name;

            // Add Cloud drive for the initial handle
            if (pathItemHandle === M.RootID) {
                nodeName = l[164];
            }
            else if (pathItemHandle === M.RubbishID) {
                nodeName = l[167];
            }

            // Skip if no node name available
            if (!nodeName) {
                continue;
            }

            // Add the folder/file name and an ID of the handle so we can add a click handler for it later
            $span.textContent = nodeName;
            $span.dataset.nodeId = node.h;

            // Keep building up the path HTML
            path.appendChild($span);

            // Add the path separator except for the last item
            if (i < pathItems.length - 1) {
                path.appendChild(document.createTextNode(' \u{3E} '));
            }
        }

        return path;
    }

    /**
     * From the selected nodes, get how many sub folders and files this contains
     * @param {Array} nodes
     * @returns {String} Returns how many e.g. 3 folders, 2 files
     */
    function getContainsCount(nodes) {

        let totalSubDirCount = 0;
        let totalSubFilesCount = 0;
        let selectionIncludesDir = false;

        for (let i = 0; i < nodes.length; i++) {

            const node = nodes[i];

            // If type folder, total up the dirs and files in the folder
            if (node.t) {
                totalSubDirCount += node.td;
                totalSubFilesCount += node.tf;
                selectionIncludesDir = true;
            }
        }

        // If there's no folder in the selection, return empty string and the caller will hide the Contains block
        if (!selectionIncludesDir) {
            return '';
        }

        // Reword e.g. 3 folders, 2 files
        return fm_contains(totalSubFilesCount, totalSubDirCount, false);
    }

    /**
     * Adds a click handler for the items in the Path so that the user can open that folder or file
     * @returns {undefined}
     */
    function addClickHandlerForPathValues() {

        $('.path-value span', $container).rebind('click.pathClick', function() {

            const nodeHandle = $(this).attr('data-node-id');
            const node = M.getNodeByHandle(nodeHandle);

            // If type folder, open it in the cloud drive
            if (node.t) {
                M.openFolder(nodeHandle);
            }

            // If an image, load the slideshow
            else if (is_image2(node)) {
                slideshow(nodeHandle);
            }

            // If it's a video, load the video viewer
            else if (is_video(node)) {
                $.autoplay = nodeHandle;
                slideshow(nodeHandle);
            }

            // If a text file, load the text editor
            else if (is_text(node)) {

                loadingDialog.show();

                mega.fileTextEditor.getFile(nodeHandle).done((data) => {
                    loadingDialog.hide();
                    mega.textEditorUI.setupEditor(node.name, data, nodeHandle);
                }).fail(() => {
                    loadingDialog.hide();
                });
            }
            else {
                // Download
                M.addDownload([nodeHandle]);
            }
        });
    }

    /**
     * Adds a click handler for files/folder with versions to see version list of it
     * @returns {undefined}
     */
    function addClickHandlerVersionsValue() {

        $('.version-value span', $container).rebind('click.prevVersion', function() {

            const nodeHandle = $(this).attr('data-node-id');
            const node = M.getNodeByHandle(nodeHandle);

            if (M.currentrootid !== M.RubbishID) {

                // If the slideshow is currently showing, hide it otherwise the file versioning dialog won't appear
                if (slideshowid) {
                    slideshow(node.h, 1);
                }
                fileversioning.fileVersioningDialog(node.h);
            }
        });
    }

    /**
     * For multiple selected nodes, find an icon we can use (especially if all the same type we can use that icon)
     * @param {Array} selectedNodes An array of selected nodes
     * @returns {String} Returns the class name of the icon e.g. folder/file/inbound-share
     */
    function getIconForMultipleNodes(selectedNodes) {

        const totalNodeCount = selectedNodes.length;
        let regularFolderCount = 0;
        let incomingSharedFolderCount = 0;
        let outgoingSharedFolderCount = 0;
        let isFolders = 0;

        // Go through the selected nodes and count up what types are selected
        for (let i = 0; i < selectedNodes.length; i++) {

            const node = selectedNodes[i];

            if (typeof node.r === 'number') {
                incomingSharedFolderCount++;
            }
            else if (node.t & M.IS_SHARED || M.ps[node.h] || M.getNodeShareUsers(node, 'EXP').length) {
                outgoingSharedFolderCount++;
            }
            else if (node.t) {
                regularFolderCount++;
            }
        }
        isFolders = incomingSharedFolderCount + outgoingSharedFolderCount + regularFolderCount;

        // If all selected nodes are incoming shares, show the incoming share icon
        if (incomingSharedFolderCount === totalNodeCount) {
            return 'folder-incoming';
        }

        // If all selected nodes are incoming shares, show the incoming share icon
        if (outgoingSharedFolderCount === totalNodeCount) {
            return 'folder-outgoing';
        }

        // If all selected nodes are folders, show the folder icon
        if (regularFolderCount === totalNodeCount || isFolders === totalNodeCount) {
            return 'folder';
        }

        // Otherwise the default is file for any mix of folders/files or just files
        return 'generic';
    }

    /**
     * Checks if all of the currently selected nodes are taken down. If a mix of taken down nodes and normal files are
     * selected the UI will not change to mention the taken down nodes. Only if 1 or more taken down nodes are selected
     * will the UI be updated.
     * @param {Array} selectedNodes An array of selected nodes
     * @returns {Boolean} Returns true if all nodes are taken down
     */
    function containsAllTakenDownNodes(selectedNodes) {

        let takenDownNodeCount = 0;
        const totalNodeCount = selectedNodes.length;

        for (let i = 0; i < totalNodeCount; i++) {

            const node = selectedNodes[i];

            // If taken down, increase the count
            if (node.t & M.IS_TAKENDOWN || M.getNodeShare(node).down === 1) {
                takenDownNodeCount++;
            }
        }

        return (takenDownNodeCount === totalNodeCount);
    }

    /**
     * Scroll to selected element within the current view
     * @param {String} nodeHandle selected node handle
     * @returns {undefined}
     */
    function scrollToNode(nodeHandle) {

        if (!nodeHandle) {
            return;
        }

        var grid = $($.selectddUIgrid);

        if (grid.length && grid.hasClass('ps')) {

            if (M.megaRender && M.megaRender.megaList) {
                delay('infoPanelScroll', () => M.megaRender.megaList.scrollToItem(nodeHandle), 500);
            }
            else {
                const el = $(`#${nodeHandle}`, $(`${$.selectddUIgrid}:visible`));
                delay('infoPanelScroll', scrollToElement.bind(this, el.closest('.ps'), el), 500);
            }
        }
    }

    /**
     * Initialise or update the side panel's vertical scroll block (if the content gets too long)
     * @returns {undefined}
     */
    function initOrUpdateScrollBlock() {

        const scrollBlock = $('.info-panel-scroll-block', $container);

        if (scrollBlock.is('.ps')) {
            Ps.update(scrollBlock[0]);
        }
        else {
            Ps.initialize(scrollBlock[0]);
        }
    }

    /**
     * Gets the name of the selected node (or generic string for the nodes that are selected)
     * @param {Array} selectedNodes The selected nodes
     * @returns {String}
     */
    function getNodeName(selectedNodes) {

        if (selectedNodes.length > 1) {
            return getSelectedFolderAndFileCount(selectedNodes);
        }

        return M.getNameByHandle(selectedNodes);
    }

    /**
     * Get the title of the Info panel
     * @param {Array} selectedNodes The selected nodes
     * @returns {String}
     */
    function getPanelTitle(selectedNodes) {

        // For multiple nodes selected
        if (selectedNodes.length > 1) {
            return mega.icu.format(l.selected_items_count, selectedNodes.length); // X items selected
        }

        // Single node
        return l[6859]; // Info
    }

    /**
     * Get the permissions text, icon and owner information for a single node
     * @param {Object} node The selected node
     * @returns {Object} An object containing the permissionsText, permissionsIcon and ownerText if applicable
     */
    function getSingleNodePermissionsData(node) {

        let permissionsText;
        let permissionsIcon;
        let ownerText;

        // Check permissions on node (shown for inshares)
        if (typeof node.r === 'number') {
            permissionsText = l[55];        // Read-only
            permissionsIcon = 'icon-read-only';

            if (node.r === 1) {
                permissionsText = l['56'];  // Read and write
                permissionsIcon = 'icon-permissions-write';
            }
            else if (node.r === 2) {
                permissionsText = l[57];    // Full access
                permissionsIcon = 'icon-star';
            }

            // Get owner information
            const user = Object(M.d[node.su || node.p]);
            ownerText = htmlentities(M.getNameByHandle(user.h));
        }

        return { permissionsText, permissionsIcon, ownerText };
    }

    /**
     * Render thumbnail image/videos if applicable
     * @param {Array} selectedNodes The currently selected nodes
     * @returns {undefined}
     */
    function renderIconOrThumbnail(selectedNodes) {

        const $blockView = $('.block-view-file-type', $container);
        const $iconFrame = $('.icon-frame', $container);
        const $imgContainer = $('img', $blockView);
        const isTakenDown = containsAllTakenDownNodes(selectedNodes);

        // If more than one node is selected, set a generic icon e.g. folder or file
        if (selectedNodes.length > 1) {
            const nodeIcon = getIconForMultipleNodes(selectedNodes);

            // Update DOM
            $blockView.addClass(`icon-${nodeIcon}-90`);
            $('.video-thumb-details', $blockView).remove();
            return;
        }

        const node = selectedNodes[0];
        const nodeIcon = fileIcon(node);

        // Update DOM
        $blockView.addClass(`icon-${nodeIcon}-90`);
        $('.video-thumb-details', $blockView).remove();

        // If Image/Video/Raw render thumbnail image/videos
        if (['image', 'video', 'raw', 'photoshop', 'vector'].includes(nodeIcon) && !isTakenDown &&
            (is_image3(node) || nodeIcon === 'video' && mega.gallery.isVideo(node))) {

            $blockView.addClass('img-thumb');

            // Set image loader
            const iconFrameElement = $iconFrame.get(0);
            if (iconFrameElement) {
                mega.gallery.setShimmering(iconFrameElement);
            }
            getImage(node)
                .then((url) => {
                    if (url) {
                        $imgContainer.attr('src', url);
                        $imgContainer.removeClass('hidden');

                        // If video render video duration into thumbnail
                        if (mega.gallery.isVideo(node)) {

                            const div = document.createElement('div');
                            div.className = 'video-thumb-details';
                            $blockView[0].appendChild(div);

                            const spanTime = document.createElement('span');
                            spanTime.textContent = secondsToTimeShort(MediaAttribute(node).data.playtime);
                            div.appendChild(spanTime);
                        }
                    }
                    else {
                        $blockView.removeClass('img-thumb');
                    }
                })
                .catch(() => {
                    // Bring back to icon view
                    $blockView.removeClass('img-thumb');
                })
                .finally(() => {
                    // Fix exception if not set on public link
                    if (iconFrameElement) {
                        mega.gallery.unsetShimmering(iconFrameElement);
                    }
                });

        }
    }

    /**
     * Render the versioning info
     * @param {Array} selectedNodes The selected nodes
     * @returns {undefined}
     */
    function renderSizeAndVersioningInfo(selectedNodes) {

        let totalSize;

        // For multiple nodes, just get the total size
        if (selectedNodes.length > 1) {
            totalSize = getSize(selectedNodes);
        }
        else {
            // Single node selected
            const node = selectedNodes[0];
            let versioningFlag = false;
            let size;
            let versionSize;
            let versionCount;

            // Get total bytes for folder, or the file size
            totalSize = bytesToSize(node.t ? node.tb : node.s);

            // Hide versioning details temporarily, due to it not working correctly in MEGA Lite / Infinity
            if (node.tvf && !mega.lite.inLiteMode) {
                versioningFlag = true;
                versionCount = mega.icu.format(l.version_count, node.tvf);  // Version Count
                versionSize = bytesToSize(node.tvb || 0);                   // Version Size
                totalSize = bytesToSize(node.t ? node.tb + node.tvb : node.s + node.tvb);
                size = bytesToSize(node.t ? node.tb : node.s);        // Current Version size
            }

            // If the user has versioning enabled for their files in the settings
            if (versioningFlag) {

                // Show version count
                $('.version-section', $container).removeClass('hidden');

                if (node.t) {
                    $('.version-value', $container).text(versionCount);
                }
                else {
                    const $span = document.createElement('span');
                    $span.textContent = versionCount;
                    $span.dataset.nodeId = node.h;
                    $('.version-value', $container).get(0).appendChild($span);

                    addClickHandlerVersionsValue();
                }

                // Show Version current size
                $('.current-version-section', $container).removeClass('hidden');
                $('.current-version-value', $container).text(size);

                // Show Previous version size
                $('.prev-version-section', $container).removeClass('hidden');
                $('.prev-version-value', $container).text(versionSize);
            }
        }

        // Render total size
        $('.size-value', $container).text(totalSize);
    }

    /**
     * Render takedown folder/file
     * @param {Array} selectedNodes The selected nodes
     * @returns {undefined}
     */
    function renderTakedown(selectedNodes) {
        const isTakenDown = containsAllTakenDownNodes(selectedNodes);

        // If there are taken down nodes within the currently selected nodes, update the display to show that
        if (isTakenDown) {
            const warningText = mega.icu.format(l.item_subject_to_takedown, selectedNodes.length);
            $('.takedown-warning', $container).text(warningText);
            $container.addClass('taken-down');
        }
    }

    /**
     * Adding class to media viewer or meeting call is active
     * @returns {undefined}
     */
    function checkCurrentView() {
        // If we have the photo viewer open add a class to the container so we can hide some of the top right menu
        if ($('.media-viewer-container', 'body').hasClass('hidden')) {
            $container.removeClass('media-viewer-visible');
        }
        else {
            $container.addClass('media-viewer-visible');
        }

        // if we have meeting open add class to the container to hide some element from the top right menu
        if ($('.meetings-call', '.conversation-panel').length) {
            $container.addClass('meetings-visible');
        }
        else {
            $container.removeClass('meetings-visible');
        }
    }

    /**
     * Get node dates to html
     * @param {Number} date selected node dates
     * @returns {String} date
     */
    function getDate(date) {
        return date && htmlentities(time2date(date)) || '';
    }

    /**
     * Main render function
     * @param {Array} selectedNodeHandles Array of selected nodes
     * @returns {undefined|Object} The jquery object of the warning dialog
     */
    function renderInfo(selectedNodeHandles) {

        let nodeHandle;
        let node;
        let nodeType;
        let containsText;
        let path;
        let dateAdded;
        let lastModified;
        let permissionsText;
        let permissionsIcon;
        let ownerText;
        let isUndecrypted = false;

        // Of there are no selected nodes, return
        if (!selectedNodeHandles.length) {
            return;
        }

        // Get data for all the selected nodes
        const selectedNodes = getAllNodeData(selectedNodeHandles);

        // If there is a node, make sure it's valid, otherwise close the panel
        if (selectedNodeHandles.length === 1 && !selectedNodes[0]) {
            mega.ui.mInfoPanel.closeIfOpen();
            return;
        }

        // If multiple nodes selected
        if (selectedNodeHandles.length > 1) {
            nodeType = l[1025]; // Multiple items
            containsText = getContainsCount(selectedNodes);
        }
        else {
            // Single node selected
            nodeHandle = selectedNodeHandles[0];
            node = selectedNodes[0];

            // Get single node data
            nodeType = node.t ? l[1049] : filetype(node, 0);
            path = getPath(nodeHandle);
            dateAdded = getDate(node.ts);
            lastModified = getDate(node.mtime);
            isUndecrypted = missingkeys[node.h];

            // If type folder, we need to show the total of the contents (or empty folder if empty)
            if (node.t) {
                containsText = getContainsCount([node]);
            }

            // Get the permissions data if applicable
            ({ permissionsText, permissionsIcon, ownerText } = getSingleNodePermissionsData(node));
        }

        // Reset previous state
        resetToDefault();
        initOrUpdateScrollBlock();

        // Get data
        const panelTitle = getPanelTitle(selectedNodes);
        const nodeName = getNodeName(selectedNodes);

        // Update DOM
        $('.header-title', $container).text(panelTitle);
        $('.name-value', $container).text(nodeName);
        $('.type-value', $container).text(nodeType);

        // If this selection has subfolders and files, show it
        if (containsText) {
            $('.contains-section', $container).removeClass('hidden');
            $('.contains-value', $container).text(containsText);
        }

        // Name for undecrypted node
        if (isUndecrypted) {
            $('.name-value', $container).text(l[8649]);
            $container.addClass('undecryptable');
            showToast('clipboard', M.getUndecryptedLabel(node));
        }
        // If this single node selection has a Path, show it and should be decrypted
        else if (path) {
            $('.path-section', $container).removeClass('hidden');
            $('.path-value', $container).get(0).appendChild(path);

            addClickHandlerForPathValues();
        }

        // If this single node selection has a Date Modified, show it
        if (lastModified) {
            $('.last-modified-section', $container).removeClass('hidden');
            $('.last-modified-value', $container).text(lastModified);
        }

        // If this single node selection is an In-share with permissions information, show it
        if (permissionsText) {
            $('.permissions-section', $container).removeClass('hidden');
            $(`.permissions-icon.${permissionsIcon}`, $container).removeClass('hidden');
            $('.permissions-value', $container).text(permissionsText);
        }
        else {
            // Show the Type except for In-shares and Backups sections where we do not show it
            if (M.currentdirid !== M.BackupsId) {
                $('.type-section', $container).removeClass('hidden');
            }

            // If this single node selection has a Date Added, show it (NB: don't show for in-shares)
            if (dateAdded) {
                $('.date-added-section', $container).removeClass('hidden');
                $('.date-added-value', $container).text(dateAdded);
            }
        }

        // If this single node selection is an inshare with an owner, show who owns it
        if (ownerText) {
            $('.owner-section', $container).removeClass('hidden');
            $('.owner-value', $container).safeHTML(ownerText);
        }

        // If just one node selected, show the Name label (just showing the # of files/folders instead for multiple)
        if (selectedNodeHandles.length === 1) {
            $('.name-section .description', $container).removeClass('hidden');
        }

        // Render icons/thumbnails as applicable
        renderIconOrThumbnail(selectedNodes);

        // Render size (and version information if applicable)
        renderSizeAndVersioningInfo(selectedNodes);

        // Render takedown file/folder
        renderTakedown(selectedNodes);

        // Check if media viewer or meeting call ui is active
        checkCurrentView();

        // If the rewind sidebar is visible we need to hide it (no room for both sidebars on the screen)
        if (mega.rewindUi && mega.rewindUi.sidebar.active) {
            mega.rewindUi.sidebar.forceClose();
        }
    }

    // Public API
    return freeze({

        /**
         * Sets up the info panel
         * @returns {undefined}
         */
        initInfoPanel() {

            // Scroll to element
            scrollToNode($.selected[0]);

            // Show the panel
            $('body').addClass(visibleClass);

            // Init the Close button to hide the panel
            $('.close', $container).rebind('click.closeButton', () => {
                $('body').removeClass(visibleClass);

                // Trigger a resize for the grid mode tiles to fill up the void
                $.tresizer();
            });

            // Render the selected node info into the panel
            renderInfo($.selected);

            // Trigger a resize for the grid tiles to move
            $.tresizer();
        },

        /**
         * Re-render the contents of the Info panel if they selected a new node/s while the panel is already open
         * @param {Array} selectedNodes An array of the handles that are selected in the UI (e.g. call with $.selected)
         * @returns {undefined}
         */
        reRenderIfVisible(selectedNodes) {

            const isOpen = $('body').hasClass(visibleClass);

            // If it's already visible, render the selected node information (no need for resizes etc)
            if (isOpen && selectedNodes && selectedNodes.length > 0) {
                renderInfo(selectedNodes);
            }
        },

        /**
         * Close the Info panel if it's currently visible
         * @returns {undefined}
         */
        closeIfOpen() {

            const isOpen = $('body').hasClass(visibleClass);

            // If it's already visible, close the panel
            if (isOpen) {
                $('body').removeClass(visibleClass);
            }
        }
    });
});
