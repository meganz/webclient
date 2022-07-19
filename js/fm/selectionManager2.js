/**
 * Base class for selection managers.
 * Don't use directly.
 *
 * @abstract
 */
class SelectionManager2Base {
    constructor(eventHandlers) {
        var idx = ++mIncID;

        this.idx = idx;

        this.debugMode = !!localStorage.selectionManagerDebug;

        this.idMapper = String;

        /**
         * Store all selected items in an _ordered_ array.
         *
         * @type {Array}
         */
        this.selected_list = [];

        this.selected_totalSize = 0;

        this.last_selected = null;
        this.eventHandlers = eventHandlers || {};
        this.eventHandlers.onSelectedUpdated = this.eventHandlers.onSelectedUpdated || nop;

        this.NOT_IMPLEMENTED_STR = "Not implemented.";
        this.CLS_UI_SELECTED = "ui-selected";
    }


    /**
     * Should be implemented by classes. Would be called when scrolling is required to specific
     * node handle
     *
     * @abstract
     * @param {String} nodeHandle the actual node handle
     */
    scrollToElementProxyMethod(nodeHandle) {
        console.error("Not implemented. Arg: ", nodeHandle);
    }


    /**
     * Used by grid math, to calculate how much items are shown per rown in the UI
     *
     * @abstract
     */
    get items_per_row() {
        console.error(this.NOT_IMPLEMENTED_STR);
        return 0;
    }

    /**
     * Helper func to clear old reset state from other icons.
     */
    clear_last_selected() {
        if (this.last_selected) {
            this.last_selected = null;
        }
    }

    /**
     * Clears the whole selection
     */
    clear_selection() {
        this.selected_list = [];
        this.clear_last_selected();
        this.eventHandlers.onSelectedUpdated(this.selected_list);
    }

    /**
     * Clear the current selection and select only the pointed item instead
     * @param {Array|String|MegaNode} item Either a MegaNode, and array of them, or its handle.
     * @param {Boolean} [scrollTo] Whether the item shall be scrolled into view.
     * @returns {String} The node handle
     */
    resetTo(item, scrollTo) {
        this.clear_selection();
        return this.set_currently_selected(item, scrollTo);
    }

    /**
     * The idea of this method is to _validate_ and return the .currently-selected element.
     *
     * @returns {String|Boolean} node id
     */
    get_currently_selected() {
        if (this.last_selected) {
            return this.last_selected;
        }
        else {
            return false;
        }
    }

    /**
     * Get safe list item..
     * @param {Array|String|MegaNode} item Either a MegaNode, and array of them, or its handle.
     * @returns {String|Boolean} Either the node handle as an string or false if unable to determine.
     * @private
     */
    _getSafeListItem(item) {
        if (typeof item !== 'string') {
            if (!(item instanceof MegaNode)) {
                item = item && item[item.length - 1] || false;
            }

            if (item && typeof item !== 'string') {
                item = this.idMapper(item) || false;
            }
        }
        return item;
    }

    /**
     * Used from the shortcut keys code.
     *
     * @param nodeId
     */
    set_currently_selected(nodeId, scrollTo) {
        this.clear_last_selected();

        nodeId = this._getSafeListItem(nodeId);
        if (!nodeId || this.selected_list.indexOf(nodeId) === -1) {
            if (nodeId) {
                this.add_to_selection(nodeId, scrollTo);
            }
            return nodeId;
        }
        this.last_selected = nodeId;

        if (scrollTo) {
            this.scrollToElementProxyMethod(nodeId);
        }
        return nodeId;
    }

    /**
     * Add an item (`nodeId`) to selection
     *
     * @param {String} nodeId the id of the node
     * @param {boolean} [scrollTo] true/false if SelectionManager should scroll to that item
     * @param {boolean} [alreadySorted] true/false if requires sorting or its already sorted
     * @returns {boolean} true/false if added
     */
    add_to_selection(nodeId, scrollTo, alreadySorted) {
        var tmp = this._getSafeListItem(nodeId);
        if (!tmp) {
            console.error("Unable to determine item type...", nodeId);
            return false;
        }
        nodeId = tmp;

        if (this.selected_list.indexOf(nodeId) === -1) {
            this.selected_list.push(nodeId);

            this.set_currently_selected(nodeId, scrollTo);

            if (!alreadySorted) {
                // shift + up/down requires the selected_list to be in the same order as in this.items
                // (e.g. render order)
                var currentViewOrderMap = {};
                const items = this.items;
                for (var j = 0; j < items.length; ++j) {
                    currentViewOrderMap[this.idMapper(items[j])] = j;
                }

                // sort this.selected_list as in this.items
                this.selected_list.sort(function(a, b) {
                    var aa = currentViewOrderMap[a];
                    var bb = currentViewOrderMap[b];
                    if (aa < bb) {
                        return -1;
                    }
                    if (aa > bb) {
                        return 1;
                    }

                    return 0;
                });
            }
        }
        this.eventHandlers.onSelectedUpdated(this.selected_list);
        if (this.debugMode) {
            console.error("commit: ", JSON.stringify(this.selected_list), self);
        }
        return true;
    }

    /**
     * Remove item from selection
     * @param {String} nodeId the id of the node
     */
    remove_from_selection(nodeId) {
        var foundIndex = this.selected_list.indexOf(nodeId);

        if (foundIndex > -1) {
            this.selected_list.splice(foundIndex, 1);
            if (this.last_selected === nodeId) {
                this.last_selected = null;
            }
            this.eventHandlers.onSelectedUpdated(this.selected_list);
            if (this.debugMode) {
                console.error("commit: ", JSON.stringify(this.selected_list));
            }
        }
        else if (this.debugMode) {
            console.error("can't remove:", nodeId, JSON.stringify(this.selected_list), JSON.stringify($.selected));
        }
    }

    /**
     * Simple helper func, for selecting all elements in the current view in a performant way.
     */
    select_all() {
        this.selected_list = this.items.map(this.idMapper);
        this.eventHandlers.onSelectedUpdated(this.selected_list);
    }

    /**
     * Select next item in list view
     *
     * @param {boolean} shiftKey
     * @param {boolean} scrollTo
     */
    select_next(shiftKey, scrollTo) {
        this._select_pointer(1, shiftKey, scrollTo);
    }

    /**
     * Select previous item in list view
     *
     * @param {boolean} shiftKey
     * @param {boolean} scrollTo
     */
    select_prev(shiftKey, scrollTo) {
        this._select_pointer(-1, shiftKey, scrollTo);
    }

    _select_pointer(ptr, shiftKey, scrollTo) {
        var nextId = null;
        var currentViewIds = this.items.map(this.idMapper);
        var current = this.get_currently_selected();
        var nextIndex = currentViewIds.indexOf(current);


        if (ptr === -1) {
            // up

            // allow selection to go backwards, e.g. start selecting from the end of the list
            nextIndex = nextIndex <= 0 ? currentViewIds.length - Math.max(nextIndex, 0) : nextIndex;

            if (nextIndex > -1 && nextIndex - 1 >= 0) {
                nextId = currentViewIds[nextIndex - 1];

                // clear old selection if no shiftKey
                if (!shiftKey) {
                    this.resetTo(nextId, scrollTo);
                }
                else if (nextIndex < currentViewIds.length) {
                    // shift key selection logic
                    if (
                        this.selected_list.length > 0 &&
                        this.selected_list.indexOf(nextId) > -1
                    ) {
                        // get first item from the list
                        var firstItemId = this.selected_list[0];

                        // modify selection
                        this.resetTo(firstItemId, false);
                        this.shift_select_to(nextId, scrollTo, false, false);
                    }
                    else {
                        this.add_to_selection(nextId, scrollTo);
                    }
                }
            }
        }
        else if (ptr === 1) {
            // down

            // allow selection to go back at the start of the list if current = last selected
            nextIndex = (
                nextIndex + 1 >= currentViewIds.length ? -1 : nextIndex
            );

            if (nextIndex + 1 < currentViewIds.length) {
                nextId = currentViewIds[nextIndex + 1];

                // clear old selection if no shiftKey
                if (!shiftKey) {
                    this.resetTo(nextId, scrollTo);
                }
                else if (nextIndex > -1) {
                    // shift key selection logic

                    if (
                        this.selected_list.length > 1 &&
                        this.selected_list.indexOf(nextId) > -1
                    ) {
                        // get last item from the list
                        var fromFirstItemId = this.selected_list[1];
                        var lastItemId = this.selected_list[this.selected_list.length - 1];


                        // modify selection
                        this.resetTo(fromFirstItemId, false);
                        this.shift_select_to(lastItemId, scrollTo, false, false);
                        this.last_selected = fromFirstItemId;
                    }
                    else {
                        this.add_to_selection(nextId, scrollTo);
                    }
                }
            }
        }
    }

    _select_ptr_grid(ptr, shiftKey, scrollTo) {
        const items = this.items;
        if (!Object(items).length) {
            // Nothing to do here.
            return;
        }

        if (this.selected_list.length === 0) {
            this.set_currently_selected(this.idMapper(items[0]), scrollTo);
            return;
        }

        var currentViewIds = items.map(this.idMapper);


        var items_per_row = this.items_per_row;


        var current = this.get_currently_selected();
        var current_idx = currentViewIds.indexOf(current);


        var target_element_num;

        if (ptr === -1) { // up
            // handle the case when the users presses ^ and the current row is the first row
            target_element_num = current_idx - items_per_row;
        } else if (ptr === 1) { // down
            // handle the case when the users presses DOWN and the current row is the last row
            target_element_num = current_idx + items_per_row;
        }
        else {
            assert('selectionManager._select_ptr_grid received invalid pointer: ' + ptr);
        }

        // calc the index of the target element
        if (target_element_num >= currentViewIds.length) {
            if (ptr === -1) { // up
                target_element_num = 0;
            }
            else {
                // down
                target_element_num = currentViewIds.length - 1;
            }
        }
        if (target_element_num >= 0) {
            if (shiftKey) {
                this.shift_select_to(currentViewIds[target_element_num], scrollTo, false, false);
            }
            else {
                this.clear_selection();
                this.set_currently_selected(currentViewIds[target_element_num], scrollTo);
            }
        }
        else {
            // do nothing.
        }
    }

    /**
     * Select one item up in list view
     *
     * @param {boolean} shiftKey
     * @param {boolean} scrollTo
     */
    select_grid_up(shiftKey, scrollTo) {
        this._select_ptr_grid(-1, shiftKey, scrollTo);
    }

    /**
     * Select one item down in list view
     *
     * @param {boolean} shiftKey
     * @param {boolean} scrollTo
     */
    select_grid_down(shiftKey, scrollTo) {
        this._select_ptr_grid(1, shiftKey, scrollTo);
    }

    shift_select_to(lastId, scrollTo, isMouseClick, clear) {
        assert(lastId, 'missing lastId for selectionManager.shift_select_to');

        var currentViewIds = this.items.map(this.idMapper);
        var current = this.get_currently_selected();
        var current_idx = currentViewIds.indexOf(current);
        var last_idx = currentViewIds.indexOf(lastId);
        var last_selected = this.last_selected;

        if (clear) {
            this.clear_selection();
        }

        if (current_idx !== -1 && last_idx !== -1) {
            if (last_idx > current_idx) {
                // direction - down
                for (let i = Math.min(current_idx, currentViewIds.length - 1); i <= last_idx; i++) {
                    this.add_to_selection(currentViewIds[i], scrollTo);
                }
            }
            else {
                // direction - up
                for (let i = Math.max(0, current_idx); i >= last_idx; i--) {
                    this.add_to_selection(currentViewIds[i], scrollTo);
                }
            }
        }

        if (isMouseClick && last_selected) {
            this.set_currently_selected(last_selected, false);
        }
    }

    /**
     * Returns a list of all selected node ids
     *
     * @returns {Array}
     */
    get_selected() {
        return this.selected_list;
    }

    /**
     * Should be called to destroy any event listeners and cleanup stuff when a selection manager becomes redundant
     */
    destroy() {
        oDestroy(this);
    }
}

/**
 * Implementation class of SelectionManager2 for usage in FM's DOM
 */
class SelectionManager2_DOM extends SelectionManager2Base {
    /**
     * @param {jQuery} $selectable
     * @param {Object} eventHandlers (see `SelectionManager2Base.constructor`)
     */
    constructor($selectable, eventHandlers) {
        super(eventHandlers);
        this.currentdirid = M.currentdirid;
        this._boundEvents = [];
        this.init();
        this.$selectable = $selectable;
    }

    get items() {
        return M.v;
    }

    get items_per_row() {
        return Math.floor(
            $('.data-block-view:visible').parent().outerWidth() / $('.data-block-view:visible:first').outerWidth(true)
        );
    }

    init() {
        var $uiSelectable = $('.fm-right-files-block .ui-selectable:visible:not(.hidden)');

        if ($uiSelectable.length === 1) {
            this.bindJqSelectable($uiSelectable);
        }

        const $fmRightFilesBlock = $('.fm-right-files-block');

        $fmRightFilesBlock.rebind('selectablereinitialized.sm', (e) => {
            this.bindJqSelectable(e.target);
        });

        this._boundEvents.push([$fmRightFilesBlock, 'selectablereinitialized.sm']);

        this.reinitialize();
    }

    destroy() {
        for (const [$obj, eventName] of this._boundEvents) {
            $obj.off(eventName);
        }

        super.destroy();
    }

    /**
     * Initializes jQuery.selectable
     * @param target
     */
    bindJqSelectable(target) {
        var $jqSelectable = $(target);

        if (this.debugMode) {
            console.error("(re)bindselectable", target, this);
        }

        /**
         * Push the last selected item to the end of the selected_list array.
         */
        $jqSelectable.rebind('selectableselecting.sm selectableselected.sm', (e, data) => {
            var $selected = $(data.selecting || data.selected);
            var id = $selected.attr('id');
            if (id) {
                // dont use 'this/self' but the current/global selectionManager
                this.add_to_selection(id);
            }
        });
        this._boundEvents.push([$jqSelectable, 'selectableselecting.sm selectableselected.sm']);

        /**
         * Remove any unselected element from the selected_list array.
         */
        $jqSelectable.rebind(
            'selectableunselecting.sm selectableunselected.sm',
            (e, data) => {
                var $unselected = $(data.unselecting || data.unselected);
                var unselectedId = $unselected.attr('id');
                if (unselectedId) {
                    // dont use 'this/self' but the current/global selectionManager
                    this.remove_from_selection(unselectedId);
                }
            });

        this._boundEvents.push([$jqSelectable, 'selectableunselecting.sm selectableunselected.sm']);

        if ($(target).is(".file-block-scrolling:not(.hidden)")) {
            // jQuery UI won't do trigger unselecting, in case of the ui-selected item is NOT in the DOM, so
            // we need to reset it on our own (on drag on the background OR click)
            const $target = $(target);
            this._boundEvents.push([$target, 'mousedown.sm']);

            $target.rebind('mousedown.sm', (e) => {
                var $target = $(e.target);

                if ($target.parent().is('.file-block-scrolling:not(.hidden)') &&
                    !$target.is('.ps__scrollbar-x-rail') && !$target.is('.ps__scrollbar-y-rail')) {
                    this.clear_selection();
                }
            });
        }
    }

    scrollToElementProxyMethod(nodeHandle) {
        let $selectable = this._get_selectable_container();
        var $element = $('#' + nodeHandle, $selectable);
        var $jsp = $element.getParentJScrollPane();
        if ($jsp) {
            var jspXPosition = $jsp.getContentPositionX();
            $jsp.scrollToElement($element);
            $jsp.scrollToX(jspXPosition); // Keep the element remain the horizontal position after scrolling
        }
        else if (M.megaRender && M.megaRender.megaList) {
            M.megaRender.megaList.scrollToItem(nodeHandle);
        }
    }

    _get_selectable_container() {
        var targetScope = this.$selectable && this.$selectable[0];
        if (
            !targetScope ||
            !targetScope.parentNode ||
            targetScope.classList.contains("hidden") ||
            !$(targetScope).is(":visible")
        ) {
            // because MegaRender is providing a DOM node, which later on is being removed, we can't cache
            // the $selectable in this case, so lets try to use $.selectddUIgrid and do a brand new jq Sizzle query
            this.$selectable = $($.selectddUIgrid + ":visible");
        }
        return this.$selectable;
    }

    reinitialize() {
        var nodeList = this.selected_list = $.selected = $.selected || [];

        if (nodeList.length) {
            if (nodeList.length === this.items.length) {
                this.select_all();
            }
            else {
                this.add_to_selection(nodeList.shift(), true);
            }
        }
        else {
            this.clear_selection(); // remove ANY old .currently-selected values.
        }

        this.eventHandlers.onSelectedUpdated(this.selected_list);

        return this;
    }
    clear_last_selected() {
        super.clear_last_selected();

        let $selectable = this._get_selectable_container();
        $('.currently-selected', $selectable).removeClass('currently-selected');
    }

    clear_selection() {
        super.clear_selection();

        let $selectable = this._get_selectable_container();
        $('.ui-selected', $selectable).removeClass(this.CLS_UI_SELECTED);

        onIdle(() => {
            var list = this.selected_list;
            if (list && !list.length) {
                this.hideSelectionBar();
            }
        });
    }
    set_currently_selected(nodeId, scrollTo) {
        super.set_currently_selected(nodeId, scrollTo);

        quickFinder.disable_if_active();

        let $selectable = this._get_selectable_container();
        $("#" + nodeId).addClass(this.CLS_UI_SELECTED);

        if (scrollTo) {
            var $element = $('#' + this.last_selected, $selectable);
            $element.addClass("currently-selected");
            this.scrollToElementProxyMethod(this.last_selected);
        }
    }
    add_to_selection(nodeId, scrollTo, alreadySorted) {
        const res = super.add_to_selection(nodeId, scrollTo, alreadySorted);
        if (res === false) {
            return res;
        }

        delay('selMan:notify:selection', () => {
            let selectionSize = false;

            if (oIsFrozen(this)) {
                // Destroyed.
                return;
            }

            for (let i = this.selected_list.length; i--;) {
                let n = this.selected_list[i];
                const e = document.getElementById(n);
                if ((n = M.d[n])) {
                    selectionSize += n.t ? n.tb : n.s;
                }
                if (e) {
                    e.classList.add(this.CLS_UI_SELECTED);
                }
            }

            if (selectionSize === false) {
                this.hideSelectionBar();
            }
            else {
                this.selectionNotification(selectionSize);
            }
        }, 20);

        return res;
    }

    remove_from_selection(nodeId) {
        let $selectable = this._get_selectable_container();
        let old_last_selected = this.last_selected;
        super.remove_from_selection(nodeId);
        $('#' + nodeId, $selectable).removeClass(this.CLS_UI_SELECTED);

        if (old_last_selected === nodeId) {
            $('#' + nodeId, $selectable).removeClass('currently-selected');
        }

        this.selectionNotification(nodeId, false);
    }

    select_all() {
        super.select_all();

        var container = this._get_selectable_container().get(0);
        var nodeList = container && container.querySelectorAll('.megaListItem') || false;

        if (nodeList.length) {
            for (var i = nodeList.length; i--;) {
                nodeList[i].classList.add(this.CLS_UI_SELECTED);
            }
            this.set_currently_selected(nodeList[0].id);
        }
        else if (this.selected_list.length) {
            // Not under a MegaList-powered view
            this.add_to_selection(this.selected_list.pop(), false, true);
        }

        if (M.d[this.currentdirid]) {
            this.selectionNotification(M.d[this.currentdirid].tb);
        }
    }

    /**
     * Update the selection notification message once a node is added or removed
     * @param nodeId
     * @param isAddToSelection
     * @returns {Boolean}
     */
    selectionNotification(nodeId, isAddToSelection) {
        if (M.chat || M.currentCustomView.type === 'gallery' || typeof nodeId !== 'number' && !M.d[nodeId]) {
            return false;
        }

        if (this.selected_list.length === 0) {
            this.hideSelectionBar();
        }
        else {
            var totalNodes = this.items.length;
            var itemsNum = this.selected_list.length;
            var itemsTotalSize = "";
            var notificationText = "";

            if (typeof nodeId === 'number') {
                this.selected_totalSize = nodeId;
            }
            else if (isAddToSelection) {
                this.selected_totalSize += M.d[nodeId].t ? M.d[nodeId].tb : M.d[nodeId].s;
            }
            else {
                this.selected_totalSize -= M.d[nodeId].t ? M.d[nodeId].tb : M.d[nodeId].s;
            }

            if (this.selected_totalSize > 0) {
                itemsTotalSize = '<span>' + bytesToSize(this.selected_totalSize) + '</span>' ;
            }

            if (totalNodes === 1) { // Only one item exists
                notificationText = l[24679]
                    .replace('%1', itemsNum)
                    .replace('%2', itemsTotalSize);
            }
            else { // Multiple items here
                notificationText = mega.icu.format(l[24672], totalNodes)
                    .replace('%1', mega.icu.format(l.selected_count, itemsNum))
                    .replace('%2', itemsTotalSize);
            }
            this.showSelectionBar(notificationText);

            const container = this._get_selectable_container();

            if (container.data('jsp') || container.closest('.jspContainer').length) {

                if (M.viewmode) {
                    initShareBlocksScrolling();
                }
                else {
                    initGridScrolling();
                }
            }
            else if (M.megaRender && M.megaRender.megaList) {
                M.megaRender.megaList.resized();
            }
            this.scrollToElementProxyMethod(this.last_selected);
        }
    }

    /**
     * Show the selection notification bar at the bottom of pages
     * @param notificationText
     */
    showSelectionBar(notificationText) {

        var $selectionBar = $('.selection-status-bar');
        var jsp;

        $selectionBar.find('.selection-bar-col').safeHTML(notificationText);

        this.vSelectionBar = $('b', $selectionBar).get(0);

        if (this.currentdirid === "out-shares") {
            jsp = M.viewmode ? $('.out-shared-blocks-scrolling').data('jsp') :
                $('.out-shared-grid-view .grid-scrolling-table').data('jsp');
        }
        else if (this.currentdirid === "shares") {
            jsp = M.viewmode ? $('.shared-blocks-scrolling').data('jsp') :
                $('.shared-grid-view .grid-scrolling-table').data('jsp');
        }

        if (jsp) {
            var jspPercentY = jsp.getPercentScrolledY();
            jsp.reinitialise();

            // If this is scrolled to bottom, keep it stick on bottom
            if (jspPercentY === 1) {
                jsp.scrollToBottom();
            }
        }
        else {
            var scrollBarYClass = (M.viewmode === 1) ?
                '.file-block-scrolling.ps--active-y' : '.grid-scrolling-table.ps--active-y';
            var scrollBarY = document.querySelector(scrollBarYClass);
            if (scrollBarY && (scrollBarY.scrollHeight - scrollBarY.scrollTop - scrollBarY.clientHeight) < 37) {
                scrollBarY.scrollTop = scrollBarY.scrollHeight;
            }
        }

        if (this.currentdirid.substr(0, 7) !== 'search/' || this.selected_list.length > 0) {
            if (folderlink) {
                $('.fm-bottom-right-buttons', fmholder).addClass('hidden');
            }

            $selectionBar.removeClass('hidden');
        }

        this.showRequiredLinks();
    }

    /**
     * Hide the selection notification bar at the bottom of pages
     */
    hideSelectionBar() {

        let selectionBar = document.getElementsByClassName('selection-status-bar').item(0);

        if (selectionBar) {
            selectionBar.classList.add('hidden');
        }
        const block = document.querySelector('.search-multi');
        if (block) {
            block.classList.remove('search-multi');
        }
        this.selected_totalSize = 0;
        this.vSelectionBar = null;

        const container = this._get_selectable_container();

        if (container.data('jsp') || container.closest('.jspContainer').length) {

            if (M.viewmode) {
                initShareBlocksScrolling();
            }
            else {
                initGridScrolling();
            }
        }
        else if (M.megaRender && M.megaRender.megaList) {
            M.megaRender.megaList.resized();
        }

        if (this.currentdirid.substr(0, 7) !== 'search/' && folderlink) {
            $('.fm-bottom-right-buttons', fmholder).removeClass('hidden');
        }
    }

    /**
     * Show required links in selection notification bar based on selection
     */
    showRequiredLinks() {

        if (d) {
            console.time('showRequiredLinks');
        }

        const selectionLinkWrapper = document.getElementsByClassName('selection-links-wrapper').item(0);

        if (!selectionLinkWrapper) {
            return false;
        }

        const allButtons = selectionLinkWrapper.querySelectorAll('.js-statusbarbtn:not(.options)');

        for (let i = allButtons.length; i--;) {
            allButtons[i].classList.add('hidden');
        }

        const isSearch = page.startsWith('fm/search');
        const selNode = M.getNodeByHandle($.selected[0]);
        const sourceRoot = M.getSelectedSourceRoot(isSearch);

        let showGetLink;
        let __showBtn = (className) => {

            const button = selectionLinkWrapper.querySelector(`.js-statusbarbtn.${className}`);

            if (button) {
                button.classList.remove('hidden');
            }
        };

        if (sourceRoot === M.RootID && !folderlink) {

            const cl = new mega.Share.ExportLink();

            // If any of selected items is taken down we do not need to proceed futher
            if (cl.isTakenDown($.selected)) {
                __showBtn('delete');
                __showBtn = nop;
            }

            showGetLink = 1;

            if (selNode.t && $.selected.length === 1) {
                __showBtn('share');
            }
        }

        if (M.checkSendToChat(isSearch, sourceRoot)) {
            __showBtn('sendto');
        }

        if (selNode) {
            __showBtn('download');
        }

        if (showGetLink || folderlink) {
            __showBtn('link');
        }

        if (!folderlink && M.currentrootid !== 'shares' && M.currentdirid !== 'shares'
            || M.currentrootid === 'shares' && M.currentdirid !== 'shares' && M.d[M.currentdirid].r === 2) {
            __showBtn('delete');
        }

        M.initStatusBarLinks();

        if (d) {
            console.timeEnd('showRequiredLinks');
        }
    }
}

/**
 * Implementation class of SelectionManager2, to be used in chat/react-like environments,
 * where DOM operaitons are done separately.
 */
class SelectionManager2_React extends SelectionManager2Base {
    constructor(items, currentdirid, itemsPerRowGetter, scrollToNode, eventHandlers) {
        super(eventHandlers);
        this.items = items;
        this.currentdirid = currentdirid;
        this.itemsPerRowGetter = itemsPerRowGetter;
        this.scrollToElementProxyMethod = scrollToNode;
    }

    get items_per_row() {
        return this.itemsPerRowGetter() | 0;
    }
}

var selectionManager;
