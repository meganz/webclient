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
        $('.node-description-section', $container).addClass('hidden');
        $('.node-description-section .desc-counter', $container).addClass('hidden');
        $('.node-description-section', $container).removeClass('readonly');

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
     * @param {String} node node
     * @returns {String} folder/file path
     */
    function getPath(node) {

        const pathItems = M.getPath(node.h);

        // return false when no path found
        if (pathItems && !pathItems.length) {
            return false;
        }

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
    function initOrUpdateScrollBlock(node) {

        const scrollBlock = $('.info-panel-scroll-block', $container);

        if (node && mega.ui.mInfoPanel.previousValue.handle === node.h && scrollBlock.is('.ps')) {
            // Do nothing
        }
        else if (scrollBlock.is('.ps')) {
            Ps.update(scrollBlock[0]);
        }
        else {
            Ps.initialize(scrollBlock[0]);
        }

        if (node && node.h) {
            mega.ui.mInfoPanel.previousValue.set(node.h);
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

        return selectedNodes[0].ch ? selectedNodes[0].name : M.getNameByHandle(selectedNodes);
    }

    function hideFeature(node) {

        // Hide for S4 nodes
        const isS4 = 'kernel' in s4 && s4.kernel.getS4NodeType(node.h);
        return M.RootID === node.h && !folderlink || node.devid || isS4;
    }

    /**
     * Render node description
     * @param {MegaNode} node selected node
     * @returns {undefined}
     */
    function renderNodeDescription(node) {

        if (hideFeature(node)) {
            return;
        }

        // Node description
        const $section = $(`.node-description-section.${mega.flags.ab_ndes ? 'top' : 'bottom'}`, $container);
        $section.removeClass('hidden');
        const $descInput = $('.node-description-textarea textarea', $section);
        const $descCounter = $('.desc-counter', $section);
        const $descCounterVal = $('span', $descCounter);
        const $descPermission = $('.desc-permission', $section);
        const description = node.des;

        $descInput.attr('placeholder', l.info_panel_description_add);

        const descriptionEventHandler = () => {

            // Changing description length counter
            $descInput.rebind('input.nodeDescription', (e) => {
                $descCounterVal.text($(e.currentTarget).val().length);
            });

            // Save description when hit enter
            $descInput.rebind('keydown.nodeDescription', (e) => {
                e.stopPropagation();
                const key = e.keyCode || e.which;

                $descCounter.removeClass('hidden');

                if (key === 13 && !e.shiftKey && !e.ctrlKey && !e.altKey) {
                    e.currentTarget.blur();
                }
            });

            // Save description upon unfocus/blur
            $descInput.rebind('blur.nodeDescription', (e) => {
                // Saving node description
                const $descValue = $(e.currentTarget).val();
                const prevDesc = description;

                // Skipped if no changes/Description length max 300 char/Document focus
                if (prevDesc !== $descValue && $descValue.length <= 300 && document.hasFocus()) {
                    M.setNodeDescription(node.h, $descValue)
                        .then(() => {
                            if (prevDesc === '') {
                                showToast('info', l.info_panel_description_added);
                                if (mega.flags.ab_ndes) {
                                    // Top position node description added event log
                                    eventlog(500252);
                                }
                                else {
                                    // Bottom position node description added event log
                                    eventlog(500253);
                                }
                            }
                            else {
                                showToast('info', l.info_panel_description_updated);
                            }
                        })
                        .catch(dump);
                }

                if ($descValue === '') {
                    $descCounter.addClass('hidden');
                }
            });

            // For styling the mega textarea
            $('.node-description-textarea > *', $section)
                .focus((e)=> {
                    const $currTarget = $(e.currentTarget);
                    $currTarget.closest('.node-description.mega-textarea').addClass('active');
                    $currTarget.attr("spellcheck", "true");
                    if (mega.flags.ab_ndes) {
                        // Top position node description focus event log
                        eventlog(500250);
                    }
                    else {
                        // Bottom position node description focus event log
                        eventlog(500251);
                    }
                })
                .blur((e) => {
                    const $currTarget = $(e.currentTarget);
                    $currTarget.closest('.node-description.mega-textarea').removeClass('active');
                    $currTarget.attr("spellcheck", "false");
                });
        };

        // Fill node description text area
        if (description) {
            $descInput.val(description);
            $descCounterVal.text(description.length);
            $descCounter.removeClass('hidden');
        }
        else {
            $descInput.val('');
            $descCounter.addClass('hidden');
        }

        // Apply scrollbar to the textarea
        initTextareaScrolling($descInput);

        if (M.getNodeRights(node.h) < 2 || M.currentrootid === M.RubbishID ||
            folderlink || M.getNodeRoot(node.h) === M.InboxID || node.ch ||
            M.getNodeRoot(node.h) === M.RubbishID) {
            $descInput.attr('disabled','disabled');
            $descInput.attr('placeholder', l.info_panel_description_empty);
            $descPermission.removeClass('hidden');
            $('span', $descPermission).text(l[55]);  // Read-only
            $section.addClass('readonly');
        }
        else {
            $descPermission.addClass('hidden');
            $descInput.removeAttr('disabled');
            descriptionEventHandler();
            $section.removeClass('readonly');
        }
    }

    /**
     * Render node tags
     * @param {MegaNode} nodes selected nodes
     * @returns {undefined}
     */
    function renderTags(nodes) {
        const $section = $(`.node-tags-section`, $container);
        const $inputContainer = $('.mega-input', $section);
        const $dropDownBody = $('.dropdown-body', $section);
        const $inputTag = $('.node-tags-input', $inputContainer);
        const $nodeChips =  $('.node-tags-chips', $section);
        const $errorBanner = $('.message-container', $inputContainer);
        const $nodeTagsDropdown = $('.node-tags-dropdown', $section);
        const $clearInputTag = $('.js-btnClearTags', $inputContainer);
        const $tagCloseIcons = $('.node-tag-chip .icon-dialog-close', $section);
        const $tagsLbl = $('.description',  $section);
        const $emptyTags = $('.empty-tags', $section);
        const $parentScrollBlock = $('.info-panel-scroll-block', $container);
        const { tagsDB } = mega.ui.mInfoPanel;

        const isShares = M.currentrootid === 'shares' || selectedNodesIsShared(nodes);
        let readOnly = false;
        let arrSimilar = [];

        if (hideFeature(nodes[0])) {
            $section.addClass('hidden');
            return;
        }

        $section.removeClass('hidden');
        $('.node-tag-chip', $nodeChips).remove();
        $dropDownBody.addClass('hidden');
        $nodeTagsDropdown.removeClass('hidden top bottom');
        $tagCloseIcons.removeClass('hidden');
        $inputTag.removeClass('disabled').removeAttr('disabled');
        $inputTag.val('');
        $tagsLbl.removeClass('pro-only');
        $nodeChips.removeClass('hidden');
        $emptyTags.addClass('hidden');
        $clearInputTag.addClass('hidden');

        // If the A/B test flag is not enabled (or localStorage test flag) then hide the whole UI for tags
        if (!mega.flags.ab_cntag && !localStorage.tagsFeatureEnabled || isShares) {
            $section.addClass('hidden');
            return;
        }
        else if (u_attr && !u_attr.p) {
            // Otherwise, the tags feature is enabled by flag, but if they are not a Pro/Business account we will
            // disable functionality for adding/updating/removing of tags. We will still show existing tags though.
            $tagsLbl.addClass('pro-only');

            if (selectedNodesHaveTags(nodes)) {
                $nodeTagsDropdown.addClass('hidden');
                $tagCloseIcons.addClass('hidden');
            }
            else {
                // No existing tags, so hide completely
                $nodeTagsDropdown.addClass('hidden');
                $nodeChips.addClass('hidden');
            }
            // On PRO options click, go to the Pro page
            $('.pro-only', $section).rebind('click.openpro', () => {
                window.open(`${getBaseUrl()}/pro`, '_blank', 'noopener,noreferrer');
            });
        }

        // Check if node is read only
        function isReadOnly(node) {
            return node && M.getNodeRights(node.h) < 2 || M.currentrootid === M.RubbishID ||
            folderlink || M.getNodeRoot(node.h) === M.InboxID || node.ch ||
            !u_handle || M.getNodeRoot(node.h) === M.RubbishID;
        }

        // Check if the node is read only
        if (nodes && isReadOnly(nodes[0])) {
            $nodeTagsDropdown.addClass('hidden');
            readOnly = true;
        }
        else {
            tagsDB.init();
        }

        /**
         * Check if the selected nodes have tags or not
         * @param {Array} nodes The selected nodes
         * @returns {Boolean} Returns true if the nodes have tags
         */
        function selectedNodesHaveTags(nodes) {
            for (let i = nodes.length; i--;) {
                if (nodes[i].tags) {
                    return true;
                }
            }

            return false;
        }

        /**
         * Check if the selected nodes is shared or backups node
         * @param {Array} nodes The selected nodes
         * @returns {Boolean} Returns true if the nodes have tags
         */
        function selectedNodesIsShared(nodes) {
            for (let i = nodes.length; i--;) {
                if (sharer(nodes[i]) ||
                    M.BackupsId && M.getNodeRoot(nodes[i]) === M.getNodeByHandle(M.BackupsId).p) {
                    return true;
                }
            }

            return false;
        }

        function showError(error) {
            $inputContainer.addClass('error');
            $errorBanner.text(error);
            $nodeTagsDropdown.removeClass('active');
        }

        function hideError() {
            $inputContainer.removeClass('error medium small');
            $errorBanner.text('');
        }

        // Get all tags in current nodes
        function getAllTags() {
            return nodes.map((n) => n.tags || []).flat();
        }

        // Check validity of tag
        function validateTag(tag) {
            const cleanTag = tag.replace('#', '');
            if (cleanTag && cleanTag !== '') {
                // Check the validity of the tag string
                // \p{L} - any kind of letter from any language
                // \p{M} - a character intended to be combined with another character
                // \d - digits
                const isLetterOrNumber = new RegExp('^[\\d\\p{L}\\p{M}]+$', 'u');
                if (!isLetterOrNumber.test(cleanTag)) {
                    $inputContainer.addClass("medium");
                    // Invalid character for tags error message is shown
                    eventlog(500309);
                    return l.info_panel_tags_error_invalid_char;
                }
                else if (cleanTag.length > 32) {
                    $inputContainer.addClass("small");
                    // Invalid character for tags error message is shown
                    eventlog(500308);
                    return l.info_panel_tags_error_maxchar;
                }
            }
            return false;
        }

        // Remove tag
        function removeTagEvent() {
            $('.js-btnDeleteTag', $nodeChips).rebind('mousedown.deleteTag', (e) => {
                const $parent = $(e.currentTarget).closest('.node-tag-chip');
                let tagText = $('span', $parent).text();
                tagText = tagText.replace('#', '');

                function remove() {
                    $(e.currentTarget).addClass('hidden');
                    tagsDB.set(tagText, nodes.map(n => n.h), true);
                    return M.setNodeTag(nodes, tagText, true).catch(tell);
                }

                if (!is_mobile && u_attr && (u_attr.b || u_attr.pf)) {
                    forBusinessProFlex((valid) => valid && remove());
                }
                else {
                    remove();
                }

            });
        }

        // Validate request if user plan is expired
        function forBusinessProFlex(cb) {

            // Make sure the files are loaded
            M.require('businessAcc_js', 'businessAccUI_js').done(() => {
                var busUI = new BusinessAccountUI();

                if (u_attr.b && u_attr.b.s === pro.ACCOUNT_STATUS_EXPIRED ||
                    u_attr.pf && u_attr.pf.s === pro.ACCOUNT_STATUS_EXPIRED) {

                    let msg = '';

                    // If Business master account or Pro Flexi
                    if (u_attr.b && u_attr.b.m) {
                        msg = l[24431];
                    }
                    else if (u_attr.pf) {
                        msg = l.pro_flexi_expired_banner;
                    }
                    else {
                        // Otherwise Business sub-user
                        msg = l[20462];
                    }

                    $('.fm-notification-block.expired-business', 'body').safeHTML(`<span>${msg}</span>`)
                        .addClass('visible');
                    clickURLs();

                    const isMaster = u_attr.b && u_attr.b.m || u_attr.pf;
                    return busUI.showExpiredDialog(isMaster);
                }
                return cb(true);
            });
        }

        // Save tag
        function saveTag(value) {
            const invalid = validateTag(value);

            if (invalid) {
                showError(invalid);
                return;
            }

            if ($('.node-tag-chip', $section).length === 10 || getAllTags().length === nodes.length * 10) {
                $inputContainer.addClass("small");
                // Max amount of tags error message is shown
                showError(l.info_panel_tags_error_max_tag);
                errorState();
                eventlog(500310);
                return;
            }

            let tag = value.replace('#', '');

            if (isExisting(tag)) {
                $inputTag.val('');
                $inputTag.blur();
                return;
            }

            if (tag && u_attr.p && !isShares) {
                tag = tag.toLowerCase();
                const validNodes = nodes.filter((n) => !isReadOnly(n) && (!n.tags || n.tags.length < 10));
                $inputTag.addClass('disabled').attr('disabled', 'disabled');
                $clearInputTag.addClass('hidden');
                M.setNodeTag(validNodes, tag).catch(tell);

                tagsDB.set(tag, validNodes.map(n => n.h));
                removeTagEvent();
                $inputTag.blur();
            }
        }

        // Find out if tag is existing to the list
        function isExisting(tag) {
            const validTag = tag;
            if (nodes.length > 1) {
                return arrSimilar.length && arrSimilar.includes(validTag);
            }

            return (nodes[0].tags || []).includes(validTag);

        }


        function addTagUI(tag) {
            // Adding tag into info panel tag list
            if (tag) {
                const $section = $(`.node-tags-section`, $container);
                const $nodeChips =  $('.node-tags-chips', $section);
                const $tagItem = $('.node-tag-chip-template', $section).clone();

                $tagItem.removeClass('hidden node-tag-chip-template');
                $tagItem.addClass('node-tag-chip');
                $('span', $tagItem).text(`#${tag}`);

                if (readOnly) {
                    $('.js-btnDeleteTag', $tagItem).addClass('hidden');
                }

                $nodeChips.safeAppend($tagItem.prop('outerHTML'));
            }
        }

        // Render existing tags singe or multiple nodes
        function renderTagList() {
            if (nodes.length === 1 && nodes[0].tags && nodes[0].tags.length) {
                const tags = nodes[0].tags;
                for (let i = tags.length; i--;) {
                    addTagUI(tags[i]);
                }
            }
            else if (nodes.length > 1) {
                const nodesTags = [];
                for (let i = nodes.length; i--;) {
                    if (nodes[i].tags) {
                        nodesTags.push(nodes[i].tags);
                    }
                }

                if (nodes.length === nodesTags.length) {
                    arrSimilar = similar(nodesTags);
                    for (let i = arrSimilar.length; i--;) {
                        addTagUI(arrSimilar[i]);
                    }
                }
            }

            isReadOnlyUI();
        }

        // Check if the tags is read only
        function isReadOnlyUI() {
            if (readOnly && !nodes[0].tags || readOnly && nodes[0].tags
                && nodes[0].tags.length === 0 || readOnly && !arrSimilar.length && nodes.length > 1) {
                if (nodes.length > 1) {
                    $emptyTags.text(l.info_panel_tags_empty_multiple);
                }
                else {
                    $emptyTags.text(l.info_panel_tags_empty);
                }
                $emptyTags.removeClass('hidden');
            }
        }

        // Check similar tags between selected nodes
        function similar(arrs) {
            return arrs.shift().filter(v =>
                arrs.every(subArray => subArray.some(e => e === v)));
        }

        // Render dropdown items includes sugggest to input current tag
        function renderDropdownItem(value) {
            let position = 'top';

            if (nodes.length > 1) {
                position = 'bottom';
            }

            const $renderDropDown = $(`.dropdown-body.${position}`, $section);
            $dropDownBody.empty();
            $nodeTagsDropdown.addClass(position);
            const offset = $section.offset().top;
            let existingArr = Array.from(tagsDB.t.keys());
            $nodeTagsDropdown.css('top', position === 'top' ? offset - 60 : offset);

            if (nodes[0].tags && nodes[0].tags.length) {
                const currTagsArr = nodes.length > 1 ? arrSimilar : nodes[0].tags;
                existingArr = existingArr.filter(t => !currTagsArr.includes(t));
            }

            const makeTagItem = () => {
                const $item = $('.dropdown-item.dropdown-content-template', $section).clone();
                $item.removeClass('hidden dropdown-content-template');
                $item.addClass('dropdown-content-add');
                return $item;
            };

            const createSuggestion = (val) => {
                if (val) {
                    existingArr = existingArr.filter(t => t.includes(val.replace('#', '')));
                    (existingArr || []).sort((a, b) =>  M.compareStrings(a, b, -1));
                }

                const $suggestions = $('.suggestions-template', $section).clone();
                $suggestions.removeClass('hidden suggestions-template');
                $suggestions.addClass('suggestion-sb');

                for (let i = existingArr.length - 1; i >= 0 ; i--) {
                    const item = makeTagItem();
                    const tagText = $('.node-tags-add', item);
                    tagText.addClass('suggest');
                    tagText.safeAppend(`<span>${existingArr[i]}</span>`);
                    $suggestions.safeAppend(item.prop('outerHTML'));
                }

                if (position === 'top') {
                    const currLen = existingArr.length < 5 ? existingArr.length : 5;
                    $nodeTagsDropdown.css('top', offset - (60 + currLen * 30));
                }

                $renderDropDown.safeAppend($suggestions.prop('outerHTML'));

                // Initialize scroll bar
                const $scrollBlock = $('.suggestion-sb', $renderDropDown);
                Ps.initialize($scrollBlock[0]);
            };

            // Render dropdown items | existing
            if (value && value.length >= 2) {

                const $addItem = makeTagItem();
                const addTagText = $('.node-tags-add', $addItem);
                // Add translation
                $addItem.addClass('current');
                addTagText.safeAppend(l.info_panel_tags_add.replace('%s', `<span>${value}</span>`));

                if (position === 'bottom') {
                    $renderDropDown.safeAppend($addItem.prop('outerHTML'));
                    createSuggestion(value);
                }
                else {
                    createSuggestion(value);
                    $renderDropDown.safeAppend($addItem.prop('outerHTML'));
                }

                $renderDropDown.removeClass('hidden');
            }
            // Render tags help
            else {
                const $item = $('.dropdown-content-template-tips', $section).clone();
                $item.removeClass('hidden dropdown-content-template-tips');
                $renderDropDown.safeAppend($item.prop('outerHTML'));
                $renderDropDown.removeClass('hidden');
            }

            $('.dropdown-content-add', $renderDropDown).rebind('mousedown.addTag', (e) => {
                const $el = $(e.currentTarget);

                if ($el.hasClass('current')) {
                    saveTag($inputTag.val());
                }
                else {
                    saveTag($('span', $(e.currentTarget)).text());
                }
                // User clicks on the "Add #<tag> tag" option from the dropdown menu
                eventlog(500307);
            });
        }

        function errorState() {
            $dropDownBody.empty();
            $nodeTagsDropdown.removeClass('top');
            $nodeTagsDropdown.removeClass('bottom');
        }

        // Changing description length counter
        $inputTag.rebind('input.nodeTags', (e) => {
            let tagValue = $(e.currentTarget).val();

            if (tagValue[0] !== '#' || tagValue.includes('#')) {
                tagValue = `#${tagValue.replace(/#/g, '').toLowerCase()}`;
                $(e.currentTarget).val(tagValue);
            }
            if (tagValue.length > 1 && !validateTag(tagValue)) {
                renderDropdown($(e.currentTarget));
            }
        });

        $inputTag.rebind('keydown.nodeTags', (e) => {
            const key = e.keyCode || e.which;

            // Todo multiple tags same input comma separator tags
            if (key === 51 && e.shiftKey) {
                e.preventDefault();
            }

            // Handle enter
            if (key === 13 && !e.shiftKey && !e.ctrlKey && !e.altKey) {
                e.stopPropagation();
                return saveTag($(e.currentTarget).val());
            }
        });

        $inputTag.rebind('keyup.nodeTags', (e) => {
            const tagValue = $(e.currentTarget).val();
            const invalid = validateTag(tagValue);
            const key = e.keyCode || e.which;

            if (key === 13 && !e.shiftKey && !e.ctrlKey && !e.altKey) {
                return;
            }

            if (invalid) {
                showError(invalid);
                errorState();
                return false;

            }

            hideError();
            renderDropdown($(e.currentTarget));
        });

        function renderDropdown(inputTag) {
            inputTag.closest('.node-tags-dropdown').addClass('active');
            hideError();
            renderDropdownItem(inputTag.val());
        }

        // Clear input
        $clearInputTag.rebind('mousedown.clearTags', (e) => {
            e.preventDefault();

            hideError();
            $inputTag.val('#');
            $inputTag.focus();
        });

        $inputTag
            .focus((e)=> {
                const $currTarget = $(e.currentTarget);
                $('.node-tags-tips', $section).removeClass('hidden');
                $clearInputTag.removeClass('hidden');

                // Hash tag tbd add multiple tags
                if ($currTarget.val().length === 0) {
                    $(e.currentTarget).val('#');
                }
                const invalid = validateTag($currTarget.val());

                if (invalid) {
                    showError(invalid);
                }
                else {
                    renderDropdown($currTarget);
                }

                if ($parentScrollBlock.is('.ps')) {
                    Ps.disable($parentScrollBlock[0]);
                }

                // User focus on the Node Tags field
                eventlog(500306);
            })
            .blur((e) => {
                e.preventDefault();
                const $currTarget = $(e.currentTarget);
                $currTarget.closest('.node-tags-dropdown').removeClass('active');

                if ($currTarget.val().length <= 1) {
                    $currTarget.val('');
                    $clearInputTag.addClass('hidden');
                }

                if ($parentScrollBlock.is('.ps')) {
                    Ps.enable($parentScrollBlock[0]);
                }

                errorState();
            });

        renderTagList();
        removeTagEvent();
        hideError();
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
            const warningText = selectedNodes.length > 1 ? l.items_subject_to_takedown : l.item_subject_to_takedown;
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

            // For Devices page, show Warning: 'The folder does not exist'
            if (page === 'fm/devices') {
                return msgDialog('warninga', l[882], l[24196]);
            }

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
            node = selectedNodes[0];

            // Get single node data
            nodeType = node.t ? l[1049] : filetype(node, 0);
            path = getPath(node);
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
        initOrUpdateScrollBlock(node);

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

            renderNodeDescription(node);
        }

        // Render icons/thumbnails as applicable
        renderIconOrThumbnail(selectedNodes);

        // Render size (and version information if applicable)
        renderSizeAndVersioningInfo(selectedNodes);

        // Render takedown file/folder
        renderTakedown(selectedNodes);

        // Check if media viewer or meeting call ui is active
        checkCurrentView();

        // Node tags
        renderTags(selectedNodes);

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

            // If it's already visible, render the selected node information (no need for resizes etc)
            if (this.isOpen() && selectedNodes && selectedNodes.length > 0) {
                renderInfo(selectedNodes);
            }
        },

        /**
         * Close the Info panel if it's currently visible
         * @returns {undefined}
         */
        closeIfOpen() {

            // If it's already visible, close the panel
            if (this.isOpen()) {
                $('body').removeClass(visibleClass);

                const $section = $(`.node-tags-section`, $container);
                const $nodeTagsDropdown = $('.node-tags-dropdown', $section);

                if ($nodeTagsDropdown.hasClass('active')) {
                    $nodeTagsDropdown.removeClass('active');
                    $('.node-tags-input', $section).blur();
                }

                mega.ui.mInfoPanel.previousValue.set(null);
            }
        },

        /**
         * Check info panel if it's currently visible
         * @returns {Boolean} is panel open
         */
        isOpen() {
            return $('body').hasClass(visibleClass);
        },
        previousValue: {
            handle: null,
            set(n) {
                this.handle = n;
                return n;
            }
        },
        tagsDB: {
            t: false,
            /**
             * Update Tags DB
             * @param {MegaNode} oldattr Old node attribute
             * @param {MegaNode} node Updated
             * @returns {undefined}
             */
            update(oldattr, node) {
                const diff = array.diff(oldattr.tags || [], node.tags || []);
                if (diff.added.length) {
                    this.set(diff.added[0], [node.h]);
                }
                if (diff.removed.length) {
                    this.set(diff.removed[0], [node.h], true);
                }
            },
            /**
             * Add / Remove tag from the memory
             * @param {String} tag tag text
             * @param {Array} handles array of node handles
             * @param {Boolean} isRemove is delete process
             * @returns {undefined}
             */
            set(tag, handles, isRemove) {
                if (isRemove) {
                    const tagSet = this.t.get(tag);
                    if (handles && tagSet) {
                        for (let i = 0; i < handles.length; i++) {
                            tagSet.delete(handles[i]);
                            if (tagSet.size === 0) {
                                this.t.delete(tag);
                            }
                        }
                    }
                }
                else {
                    for (let i = 0; i < handles.length; i++) {
                        this.t.set(tag, handles[i]);
                    }
                }
            },
            async init() {
                if (!this.t) {
                    this.t = new MapSet();
                    return fmdb.get('f')
                        .then(nodes => {
                            for (let i = nodes.length; i--;) {
                                const n = nodes[i];
                                if (n.tags) {
                                    for (let j = n.tags.length; j--;) {
                                        this.t.set(n.tags[j], n.h);
                                    }
                                }
                            }

                        });
                }
            }
        }
    });
});
