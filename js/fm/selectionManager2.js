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

        this.idMapper = n => n.h || String(n);

        /**
         * Store all selected items in an _ordered_ array.
         *
         * @type {Array}
         */
        this.selected_list = [];
        this.removing_list = [];

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
        const res = this.selected_list;

        this.selected_list = [];
        this.clear_last_selected();

        this.eventHandlers.onSelectedUpdated(this.selected_list);
        delete this.shiftFirst;

        return res;
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
        if (!nodeId || !this.selected_list.includes(nodeId)) {
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

        if (!this.selected_list.includes(nodeId)) {
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

            this.removing_list.push(nodeId);
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
                        this.selected_list.includes(nextId)
                    ) {
                        // get first item from the list
                        var firstItemId = this.selected_list[0];

                        // modify selection
                        this.shift_select_to(nextId, scrollTo, false, false);
                    }
                    else {
                        this.add_to_selection(nextId, scrollTo, false);

                        if (!this.shiftFirst) {
                            this.shiftFirst = current;
                        }
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
                        this.selected_list.includes(nextId)
                    ) {
                        // get last item from the list
                        var fromFirstItemId = this.selected_list[1];
                        var lastItemId = this.selected_list[this.selected_list.length - 1];


                        // modify selection
                        this.shift_select_to(nextId, scrollTo, false, false);
                        this.last_selected = fromFirstItemId;
                    }
                    else {
                        this.add_to_selection(nextId, scrollTo, false);

                        if (!this.shiftFirst) {
                            this.shiftFirst = current;
                        }
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
            // handle the case when the users presses UP and the current row is the first row
            target_element_num = Math.max(current_idx - items_per_row, 0);
        }
        else if (ptr === 1) { // down

            // if user is already in the last row just ignore this.
            if ((current_idx / items_per_row | 0) === (items.length / items_per_row | 0)) {
                return;
            }

            // handle the case when the users presses DOWN and the current row is one before the last row
            target_element_num = Math.min(current_idx + items_per_row, currentViewIds.length - 1);
        }
        else {
            assert('selectionManager._select_ptr_grid received invalid pointer: ' + ptr);
        }

        if (shiftKey) {
            this.shift_select_to(currentViewIds[target_element_num], scrollTo, false, false);
        }
        else {
            this.clear_selection();
            this.set_currently_selected(currentViewIds[target_element_num], scrollTo);
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

        if (clear) {
            this.clear_selection();
        }

        // Very first node start shift + select
        if (!this.shiftFirst) {
            this.shiftFirst = $.selected[0];
        }

        if (current_idx !== -1 && last_idx !== -1) {

            if (last_idx > current_idx) {

                // direction - down
                const first = Math.min(current_idx, currentViewIds.length - 1);

                for (let i = first + 1; i <= last_idx; i++) {

                    if (this.selected_list.includes(currentViewIds[i])) {

                        this.remove_from_selection(currentViewIds[i]);

                        if (i === first + 1) {
                            this.remove_from_selection(currentViewIds[first]);
                        }
                    }
                    else {
                        this.add_to_selection(currentViewIds[i], false, i !== first + 1);
                    }
                }
            }
            else {
                const first = Math.max(0, current_idx);

                // direction - up
                for (let i = first - 1; i >= last_idx; i--) {

                    if (this.selected_list.includes(currentViewIds[i])) {
                        this.remove_from_selection(currentViewIds[i]);

                        if (i === first - 1) {
                            this.remove_from_selection(currentViewIds[first]);
                        }
                    }
                    else {
                        this.add_to_selection(currentViewIds[i], false, i !== first - 1 && i !== last_idx);
                    }
                }
            }
        }

        // always select very first node of shift, following Windows explorer behaviour
        this.add_to_selection(this.shiftFirst, false, true);

        if (lastId) {
            this.set_currently_selected(lastId, scrollTo);
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
            const mainSel = $.selectddUIgrid && $.selectddUIitem ? `${$.selectddUIgrid} ${$.selectddUIitem}` : '';

            // If fm drag drop selection event is not inited yet, click may arrive here, send it back to correct event.
            if (mainSel && (e.shiftKey || e.metaKey || e.ctrlKey) && e.originalEvent.type !== 'mouseup' &&
                ($selected.is(mainSel) || $selected.closest(mainSel).length)) {

                return $selected.trigger('click.filemanager', [e]);
            }

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
                    this.remove_from_selection(unselectedId , false);
                }
            });

        this._boundEvents.push([$jqSelectable, 'selectableunselecting.sm selectableunselected.sm']);

        if ($jqSelectable.is(`${$.selectddUIgrid}:not(.hidden)`)) {
            // jQuery UI won't do trigger unselecting, in case of the ui-selected item is NOT in the DOM, so
            // we need to reset it on our own (on drag on the background OR click)
            this._boundEvents.push([$jqSelectable, 'mousedown.sm']);

            $jqSelectable.rebind('mousedown.sm', e => {
                var $target = $(e.target).parent();

                if ($target.is(`${$.selectddUIgrid}:not(.hidden)`) &&
                    e.button === 0 && !e.shiftKey && !e.metaKey && !e.ctrlKey &&
                    !e.target.classList.contains('ps__rail-x') &&
                    !e.target.classList.contains('ps__rail-y')) {
                    this.clear_selection();
                }
            });
        }
    }

    scrollToElementProxyMethod(nodeHandle) {

        if (M.megaRender && M.megaRender.megaList) {
            M.megaRender.megaList.scrollToItem(nodeHandle);
        }
        else {
            const $el = $('#' + nodeHandle, this._get_selectable_container());
            scrollToElement($el.closest('.ps'), $el);
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
        const res = super.clear_selection();

        let $selectable = this._get_selectable_container();
        $('.ui-selected', $selectable).removeClass(this.CLS_UI_SELECTED);

        onIdle(() => {
            var list = this.selected_list;
            if (list && !list.length) {
                this.hideSelectionBar();
            }
        });

        return res;
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
                const e = M.megaRender ? M.megaRender.getDOMNode(n) : document.getElementById(n);
                if ((n = M.d[n])) {
                    selectionSize += n.t ? n.tb : n.s;
                }
                else if (M.dyh) {
                    selectionSize = 0;
                }
                if (e) {
                    e.classList.add(this.CLS_UI_SELECTED);
                }
            }

            if (selectionSize === false) {
                this.hideSelectionBar();
            }
            else {
                this.selectionNotification(selectionSize, false, false);
            }
        }, 60);

        return res;
    }

    remove_from_selection(nid, scrollTo) {

        let old_last_selected = this.last_selected;
        super.remove_from_selection(nid);

        const e = M.megaRender ? M.megaRender.getDOMNode(nid) : document.getElementById(nid);

        if (e) {
            e.classList.remove(this.CLS_UI_SELECTED);

            if (old_last_selected === nid) {
                e.classList.remove('currently-selected');
            }
        }

        delay('selManUpdNotif', () => {

            if (!this.removing_list || !this.selected_list) {
                return;
            }

            const selListMap = array.to.object(this.selected_list);

            // Lets deduplicate and filter reselected
            this.removing_list = [...new Set(this.removing_list)].filter(h => !selListMap[h]);

            if (this.selected_list.length !== 0 && this.removing_list.length > 1) {

                const cb = (pv, c) => pv + (M.d[c] ? M.d[c].tb === undefined ? M.d[c].s : M.d[c].tb : 0);
                const removingSize = this.removing_list.reduce(cb, 0);
                nid = this.selected_totalSize - removingSize;
            }

            this.selectionNotification(nid, false, scrollTo);
            this.removing_list = [];
        }, 50);
    }

    select_all() {
        super.select_all();

        var container = this._get_selectable_container().get(0);
        var nodeList = container && container.querySelectorAll('.megaListItem') || false;
        const currentNode = M.d[this.currentdirid]
            || M.currentrootid === 's4' && M.d[this.currentdirid.split('/').pop()];

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
        if (currentNode) {
            this.selectionNotification(currentNode.tb);
        }
    }

    /**
     * Update the selection notification message once a node is added or removed
     * @param nodeId
     * @param isAddToSelection
     * @returns {Boolean}
     */
    selectionNotification(nodeId, isAddToSelection, scrollTo = true) {
        if (M.chat || M.isGalleryPage() || typeof nodeId !== 'number' && !M.d[nodeId]) {
            return false;
        }
        let itemsNum = this.selected_list.filter(h => h !== this.currentdirid).length;

        if (itemsNum === 0) {
            this.hideSelectionBar();
        }
        else {
            var totalNodes = this.items.length;

            var itemsTotalSize = "";
            var notificationText = "";

            const _getNodeSize = () => M.d[nodeId].t ? M.d[nodeId].tb : M.d[nodeId].s;

            if (typeof nodeId === 'number') {
                this.selected_totalSize = nodeId;
            }
            else if (isAddToSelection) {
                this.selected_totalSize += _getNodeSize();
            }
            else {
                this.selected_totalSize -= _getNodeSize();
            }

            if (this.selected_totalSize > 0) {
                itemsTotalSize = bytesToSize(this.selected_totalSize);
            }

            const totalHtml = `<span class="sel-notif-size-total">${itemsTotalSize}</span>`;

            if (totalNodes) {
                if (totalNodes === 1) { // Only one item exists
                    notificationText = l[24679].replace('%1', itemsNum).replace('%2', totalHtml);
                }
                else { // Multiple items here
                    itemsNum = mega.icu.format(l.selected_count, itemsNum);

                    notificationText = mega.icu.format(l[24672], totalNodes)
                        .replace('%1', `<span class="sel-notif-count-total">${itemsNum}</span>`)
                        .replace('%2', totalHtml);
                }
            }

            this.showSelectionBar(notificationText, itemsNum, itemsTotalSize, totalNodes);

            if (M.megaRender && M.megaRender.megaList) {
                M.megaRender.megaList.resized();
            }
            else {
                initPerfectScrollbar($(this._get_selectable_container()).closest('.ps'));
            }

            if (scrollTo) {
                this.scrollToElementProxyMethod(this.last_selected);
            }
        }
    }

    /**
     * Show the selection notification bar at the bottom of pages
     * @param notificationText
     */
    showSelectionBar(notificationText, itemSelected, itemsTotalSize, totalNodes) {

        var $selectionBar = $('.selection-status-bar');
        let scrollBarYClass = '';
        const $selCountElm = $('.sel-notif-count-total', $selectionBar);

        if (notificationText) {
            // if count is existing, lets using existing dom node not create new one.
            if ($selCountElm.length && totalNodes === $selectionBar.data('total-node')) {
                $selCountElm.text(itemSelected);
                $('.sel-notif-size-total', $selectionBar).text(itemsTotalSize);
            }
            else {
                $('.selection-bar-col', $selectionBar).safeHTML(notificationText);
                $selectionBar.data('total-node', totalNodes);
            }
        }
        else {
            $('.selection-bar-col', $selectionBar).empty();
        }

        this.vSelectionBar = $('b', $selectionBar).get(0);

        if (this.currentdirid === "out-shares") {
            scrollBarYClass = M.viewmode ? '.out-shared-blocks-scrolling.ps--active-y' :
                '.out-shared-grid-view .grid-scrolling-table.ps--active-y';
        }
        else if (this.currentdirid === "shares") {
            scrollBarYClass = M.viewmode ? '.shared-blocks-scrolling.ps--active-y' :
                '.shared-grid-view .grid-scrolling-table.ps--active-y';
        }
        else {
            scrollBarYClass = (M.viewmode === 1) ?
                '.file-block-scrolling.ps--active-y' : '.grid-scrolling-table.ps--active-y';
        }

        if (
            (!M.gallery || M.isAlbumsPage())
            && (this.currentdirid.substr(0, 7) !== 'search/' || this.selected_list.length > 0)
        ) {
            $selectionBar.removeClass('hidden');
        }

        const scrollBarY = document.querySelector(scrollBarYClass);
        if (scrollBarY && (scrollBarY.scrollHeight - scrollBarY.scrollTop - scrollBarY.clientHeight) < 37) {
            requestAnimationFrame(() => {
                scrollBarY.scrollTop = scrollBarY.scrollHeight;
                initPerfectScrollbar();
            });
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

        if (M.megaRender && M.megaRender.megaList) {
            M.megaRender.megaList.resized();
        }
        else {
            initPerfectScrollbar($(this._get_selectable_container()).closest('.ps'));
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

        const isAlbums = M.isAlbumsPage(2);

        const allButtons = selectionLinkWrapper.querySelectorAll(
            mega.gallery.albums.isPublic ? '.js-statusbarbtn:not(.options)' : '.js-statusbarbtn'
        );

        for (let i = allButtons.length; i--;) {
            allButtons[i].classList.add('hidden');
        }

        let __showBtn = (className) => {
            const button = selectionLinkWrapper.querySelector(`.js-statusbarbtn.${className}`);

            if (button) {
                button.classList.remove('hidden');
            }
        };

        const __hideButton = (className) => {
            const button = selectionLinkWrapper.querySelector(`.js-statusbarbtn.${className}`);

            if (button) {
                button.classList.add('hidden');
            }
        };

        const isMegaList = M.dyh ? M.dyh('is-mega-list') : true;

        if (isAlbums && mega.gallery.albums.grid && mega.gallery.albums.grid.timeline) {
            if (mega.gallery.albums.isPublic) {
                const selections = Object.keys(mega.gallery.albums.grid.timeline.selections);

                if (selections.length === 1 && mega.gallery.isPreviewable(M.d[selections[0]])) {
                    __showBtn('preview');
                }
            }

            __showBtn('download');

            if (!mega.gallery.albums.isPublic) {
                const albumId = M.currentdirid.replace('albums/', '');

                if (mega.gallery.albums.store[albumId] && !mega.gallery.albums.store[albumId].filterFn) {
                    __showBtn('delete-from-album');
                }
            }
        }
        else if (isMegaList) {
            __showBtn('options');
            const isSearch = page.startsWith('fm/search');
            const selNode = M.getNodeByHandle($.selected[0]);
            const sourceRoot = M.getSelectedSourceRoot(isSearch);
            const shareButton = selectionLinkWrapper.querySelector(`.js-statusbarbtn.share`);

            let showGetLink;
            let restrictedFolders = false;

            const spanTotal = document.querySelector('.selection-bar-col .sel-notif-size-total');

            if (spanTotal) {
                spanTotal.classList.remove('hidden');
            }

            // Set default "Share folder" / "Share bucket" string
            shareButton.dataset.simpletip = sourceRoot === 's4'
                && M.geS4NodeType(selNode) === 'bucket' && l.s4_share_bucket || l[5631];

            const { dataset } = selectionLinkWrapper.querySelector('.selection-links-wrapper .delete');
            dataset.simpletip = M.getSelectedRemoveLabel($.selected);

            if ((sourceRoot === M.RootID || sourceRoot === 's4'
                 || M.isDynPage(sourceRoot)) && !folderlink) {

                const cl = new mega.Share.ExportLink();

                for (let i = 0; i < $.selected.length; i++) {
                    if (M.getNodeRoot($.selected[i]) === M.InboxID) {
                        restrictedFolders = true;
                        break;
                    }
                }

                // If any of selected items is taken down we do not need to proceed futher
                if (cl.isTakenDown($.selected)) {
                    if (!restrictedFolders) {
                        __showBtn('delete');
                    }
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

            // Temporarily hide download button for now in MEGA Lite mode (still accessible via zip in context menu)
            if (M.getNodeRoot(M.currentdirid) !== M.RubbishID &&
                (!mega.lite.inLiteMode || !mega.lite.containsFolderInSelection($.selected))) {
                __showBtn('download');
            }

            if (showGetLink || folderlink) {
                __showBtn('link');
            }

            if (sourceRoot === M.InboxID || restrictedFolders) {

                // Set "Read-only share" string
                shareButton.dataset.simpletip = l.read_only_share;

                if (selNode.t && $.selected.length === 1) {
                    __showBtn('share');
                }
                __showBtn('link');
            }
            else if (!folderlink && M.currentrootid !== 'shares' && M.currentdirid !== 'shares'
                || M.currentrootid === 'shares' && M.currentdirid !== 'shares' && M.d[M.currentdirid].r === 2) {
                __showBtn('delete');
            }

            if (M.currentdirid === 'file-requests') {
                __hideButton('link');
                __hideButton('share');
                __hideButton('sendto');
            }

            // If in MEGA Lite mode, temporarily hide any download buttons in the Shared area
            if (mega.lite.inLiteMode && M.currentrootid === 'shares') {
                __hideButton('download');
            }

            // If in MEGA Lite mode, temporarily hide the Bove to Rubbish Bin button in the outgoing shares area
            if (mega.lite.inLiteMode && M.currentrootid === 'out-shares') {
                __hideButton('delete');
            }
        }
        else {
            M.dyh('required-links')
                .then((links) => {
                    if (links) {
                        const { show, hide } = links;
                        for (const h of hide) {
                            __hideButton(h);
                        }
                        for (const s of show) {
                            __showBtn(s);
                        }
                    }
                });
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
