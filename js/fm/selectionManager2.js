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
        this.removing_sizes = Object.create(null);

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

        mega.ui.mInfoPanel.eventuallyUpdateSelected();

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

    wantResetTo(item, scrollTo) {
        if (this.selected_list.length !== 1
            || this.get_currently_selected() !== item) {

            this.clash = this.resetTo(item, scrollTo);
        }
        return this.clash;
    }

    restoreResetTo() {
        if (this.clash === this.get_currently_selected()) {
            delete this.clash;
            this.clear_selection();
        }
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

        // If info panel is open change its attributes by current selected node
        mega.ui.mInfoPanel.eventuallyUpdateSelected();

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
        let last = false;
        var foundIndex = this.selected_list.indexOf(nodeId);

        if (foundIndex > -1) {
            this.selected_list.splice(foundIndex, 1);
            if (this.last_selected === nodeId) {
                this.last_selected = null;
                last = true;
            }
            this.eventHandlers.onSelectedUpdated(this.selected_list);
            if (this.debugMode) {
                console.error("commit: ", JSON.stringify(this.selected_list));
            }

            this.removing_list.push(nodeId);
            if (M.d[nodeId]) {
                this.removing_sizes[nodeId] = M.d[nodeId].t ? M.d[nodeId].tb : M.d[nodeId].s;
            }
        }
        else if (this.debugMode) {
            console.error("can't remove:", nodeId, JSON.stringify(this.selected_list), JSON.stringify($.selected));
        }

        return last;
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

                    // Rerender if info panel is visible when selecting node via shorcut
                    mega.ui.mInfoPanel.eventuallyUpdateSelected();
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
            if ($.selected && $.selected[0]) {
                this.shiftFirst = $.selected[0];
            }
            else {
                // always select very first node of shift if $.selected is empty, following Windows explorer behaviour
                this.shiftFirst = currentViewIds[0];
                current_idx = 0;
            }
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
        this.currentdirid = M.onDeviceCenter || M.currentdirid;
        this._boundEvents = [];
        this.init();
        this.$selectable = $selectable;
    }

    get items() {
        return M.v;
    }

    get items_per_row() {
        return Math.floor(
            $('.mega-node:visible').parent().outerWidth() / $('.mega-node:visible:first').outerWidth(true)
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

        if (this.onResize) {
            window.removeEventListener('resize', this.onResize);
            delete this.onResize;
            delete $.menuForcedItems;
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

                    // Close node Info panel as nothing selected
                    if (this.selected_list.length === 0) {
                        mega.ui.mInfoPanel.hide();
                    }
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

                    // Close node Info panel as nothing selected
                    mega.ui.mInfoPanel.hide();

                    this.clear_selection();
                }
            });
        }
    }

    updateScrollBar() {
        if (M.megaRender && M.megaRender.megaList) {
            M.megaRender.megaList.resized();
        }
        else {
            initPerfectScrollbar($(this._get_selectable_container()).closest('.ps'));
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

                if (M.gallery && !window.pfcol && mega.gallery[M.currentdirid]) {
                    mega.gallery[M.currentdirid].clearSelections();
                }
                else if (M.albums && mega.gallery.albums.grid && mega.gallery.albums.grid.timeline) {
                    mega.gallery.albums.grid.timeline.clearSiblingSelections();
                }
            }
        });

        return res;
    }
    set_currently_selected(nodeId, scrollTo) {
        const res = super.set_currently_selected(nodeId, scrollTo);

        quickFinder.disable_if_active();

        let $selectable = this._get_selectable_container();
        $("#" + nodeId).addClass(this.CLS_UI_SELECTED);

        if (scrollTo) {
            var $element = $('#' + this.last_selected, $selectable);
            $element.addClass("currently-selected");
            this.scrollToElementProxyMethod(this.last_selected);
        }

        return res;
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
                if (M.d[n]) {
                    n = M.d[n];
                    selectionSize += n.t ? n.tb : n.s;
                }
                else if (M.dcd[n]) {
                    n = M.dcd[n];
                    selectionSize += n.tb || 0;
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
        }, 180);

        return res;
    }

    remove_from_selection(nid, scrollTo) {
        const last = super.remove_from_selection(nid);

        const e = M.megaRender ? M.megaRender.getDOMNode(nid) : document.getElementById(nid);

        if (e) {
            e.classList.remove(this.CLS_UI_SELECTED);

            if (last) {
                e.classList.remove('currently-selected');
            }
        }

        if (this.rAFw) {
            return;
        }
        this.rAFw = 1;

        requestAnimationFrame(() => {

            if (!this.removing_list || !this.selected_list) {
                return;
            }
            this.rAFw = 0;

            const selListMap = array.to.object(this.selected_list);

            // Lets deduplicate and filter reselected
            this.removing_list = [...new Set(this.removing_list)].filter(h => !selListMap[h]);

            if (this.removing_list.length === 0) {
                this.removing_sizes = Object.create(null);
                return;
            }

            if (this.selected_list.length !== 0 && this.removing_list.length > 1) {

                const cb = (pv, c) => pv + (M.d[c] ?
                    M.d[c].tb === undefined ? M.d[c].s : M.d[c].tb :
                    this.removing_sizes[c] || 0);
                const removingSize = this.removing_list.reduce(cb, 0);
                nid = this.selected_totalSize - removingSize;
            }

            if (typeof nid !== 'number' && !M.d[nid]) {
                nid = this.selected_totalSize - (this.removing_sizes[nid] || 0);
            }
            this.selectionNotification(nid, false, scrollTo);
            this.removing_list = [];
            this.removing_sizes = Object.create(null);
        });
    }

    select_all() {
        super.select_all();

        var container = this._get_selectable_container().get(0);
        var nodeList = container && container.querySelectorAll('.megaListItem') || false;
        const currentNode = M.d[this.currentdirid] || M.search
            || ['shares', 'out-shares', 'public-links', 'file-requests', 'faves'].includes(M.currentrootid)
            || M.currentrootid === 's4' && M.d[this.currentdirid.split('/').pop()] || folderlink;

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
            this.updateSelectionNotification();
        }

        mega.ui.mInfoPanel.eventuallyUpdateSelected();

        if (M.gallery && mega.gallery[M.currentdirid]) {
            mega.gallery[M.currentdirid].enableGroupChecks();
        }
    }

    /**
     * Update the selection notification message once a node is added or removed
     * @param nodeId
     * @param isAddToSelection
     * @returns {Boolean}
     */
    selectionNotification(nodeId, isAddToSelection, scrollTo = true) {
        if (
            M.chat
            || (typeof nodeId !== 'number' && !M.d[nodeId])
            || (M.isGalleryPage() && mega.gallery.photos && mega.gallery.photos.mode !== 'a')
            || (M.isMediaDiscoveryPage() && mega.gallery.discovery && mega.gallery.discovery.mode !== 'a')
            || M.isAlbumsPage(1)
        ) {
            return false;
        }

        const itemsNum = this.selected_list.filter(h => h !== this.currentdirid).length;

        if (itemsNum === 0) {
            this.hideSelectionBar();
        }
        else {
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

            this.showSelectionBar(
                mega.icu.format(l.selected_count, itemsNum),
                bytesToSize(this.selected_totalSize || 0),
                scrollTo
            );
        }
    }

    updateSelectionNotification() {
        delay('sel-update-notif', () => {
            if (!this.selected_list) {
                // May be destroyed so just hide the bar.
                mega.ui.secondaryNav.hideSelectionBar();
                return;
            }
            const itemsNum = this.selected_list.filter(h => h !== this.currentdirid).length;
            if (itemsNum === 0) {
                this.hideSelectionBar();
            }
            else {
                this.selected_totalSize = this.selected_list.reduce((s, h) => {
                    if (!M.d[h]) {
                        return s + 0;
                    }
                    return s + (M.d[h].t ? M.d[h].tb : M.d[h].s);
                }, 0);
                this.showSelectionBar(
                    mega.icu.format(l.selected_count, itemsNum),
                    bytesToSize(this.selected_totalSize || 0)
                );
            }
        });
    }

    /**
     * Show the selection notification bar at the bottom of pages
     * @param {string} itemSelected Formatted string of selected item count
     * @param {string} itemsTotalSize Formatted string of the selected item total size
     * @returns {void} void
     */
    showSelectionBar(itemSelected, itemsTotalSize, scrollTo = true) {
        if (this.currentdirid.substr(0, 7) === 'search/') {
            M.renderSearchBreadcrumbs();
        }
        const { selectionBar } = mega.ui.secondaryNav;
        const selCountElm = selectionBar.querySelector('.selection-bar-col');
        const selSizeElm = selectionBar.querySelector('.selection-bar-size');
        const spacerElm = selectionBar.querySelector('.spacer');
        const isMegaList = M.dyh ? M.dyh('is-mega-list') : true;

        if (selCountElm) {
            selCountElm.textContent = itemSelected;
        }
        if (selSizeElm) {
            selSizeElm.textContent = isMegaList && !mega.lite.inLiteMode ? itemsTotalSize : '';
        }
        if (spacerElm) {
            spacerElm.textContent = isMegaList && !mega.lite.inLiteMode ? '\u00B7' : '';
        }

        mega.ui.secondaryNav.showSelectionBar();
        this.updateScrollBar();
        if (scrollTo) {
            this.scrollToElementProxyMethod(this.last_selected);
        }


        this.showRequiredLinks();
        this.updateRequiredLinksBySize();
        if (!this.onResize) {
            this.onResize = SoonFc(90, () => {
                this.updateRequiredLinksBySize();
            });
            window.addEventListener('resize', this.onResize);
        }
    }

    /**
     * Hide the selection notification bar at the bottom of pages
     */
    hideSelectionBar() {

        if (mega.ui.secondaryNav.selectionBar.classList.contains('hidden')) {
            return;
        }
        mega.ui.secondaryNav.hideSelectionBar();

        this.selected_totalSize = 0;

        // Hide search breadcrumbs bar
        M.renderSearchBreadcrumbs();

        this.updateScrollBar();

        if (mega.ui.secondaryNav.selectionBar.querySelector('.c-opened')) {
            $.hideContextMenu();
        }
        if (this.onResize) {
            window.removeEventListener('resize', this.onResize);
            delete this.onResize;
            delete $.menuForcedItems;
        }
    }

    /**
    * Show required links in selection notification bar based on selection
    */
    showRequiredLinks() {
        if (d) {
            console.time('showRequiredLinks');
        }

        const selectionLinkWrapper = mega.ui.secondaryNav.selectionBar.querySelector('.selection-links-wrapper');

        if (!selectionLinkWrapper) {
            return false;
        }

        const isAlbums = M.isAlbumsPage(2);

        const allButtons = selectionLinkWrapper.querySelectorAll('.js-statusbarbtn');

        for (let i = allButtons.length; i--;) {
            allButtons[i].classList.add('hidden');
            allButtons[i].classList.remove('collapsible');
        }

        const priority = ['download', 'link', 'share', 'rename', 'delete', 'options'];
        const toShow = Object.create(null);
        let __showBtn = (className) => {
            toShow[className] = 1;
        };

        const __hideButton = (className) => {
            delete toShow[className];
        };

        const doShow = (className) => {
            const button = selectionLinkWrapper.querySelector(`.js-statusbarbtn.${className}`);

            if (button) {
                button.classList.remove('hidden');
                if (className !== 'options') {
                    button.classList.add('collapsible');
                }
                mega.ui.secondaryNav.selectionBarItems.push(
                    SelectionManager2_DOM.selectionContextItemMap[className] || `.${className}`);
                return true;
            }
            return false;
        };
        const finalise = () => {
            mega.ui.secondaryNav.selectionBarItems = [];
            let count = 6;
            for (const key of priority) {
                if (toShow[key]) {
                    doShow(key);
                    count--;
                    delete toShow[key];
                }
            }
            if (count) {
                for (const key of Object.keys(toShow)) {
                    if (doShow(key)) {
                        count--;
                        if (count === 0) {
                            break;
                        }
                    }
                }
            }
        };

        const isMegaList = M.dyh ? M.dyh('is-mega-list') : true;

        if (isAlbums && mega.gallery.albums.grid && mega.gallery.albums.grid.timeline) {
            if (mega.gallery.albums.isPublic) {
                __showBtn('options');
            }
            else {
                const albumId = M.currentdirid.replace('albums/', '');

                if (mega.gallery.albums.store[albumId] && !mega.gallery.albums.store[albumId].filterFn) {
                    __showBtn('delete-from-album');
                }
            }

            __showBtn('download');
        }
        else if (isMegaList) {
            __showBtn('options');
            const isSearch = String(self.page).startsWith('fm/search');
            const selNode = M.getNodeByHandle($.selected[0]);
            const sourceRoot = M.getSelectedSourceRoot(isSearch);
            const shareButton = selectionLinkWrapper.querySelector(`.js-statusbarbtn.share`);
            const isRootSelected = $.selected.includes(M.RootID);

            let showGetLink;
            let restrictedFolders = false;

            const hasShare = M.ps[selNode.h] || M.getNodeShareUsers(selNode, 'EXP').length;
            // Set default "Share folder" / "Share bucket" string
            if (sourceRoot === 's4' && M.getS4NodeType(selNode) === 'bucket') {
                shareButton.dataset.simpletip = hasShare ?
                    l.manage_share : l.s4_share_bucket;
                const icon = shareButton.querySelector('i');
                if (icon) {
                    icon.classList.add('icon-bucket-outgoing-share');
                    icon.classList.remove('icon-folder-users-thin-outline');
                }
            }
            else {
                shareButton.dataset.simpletip = hasShare ?
                    l.manage_share : l[5631];
                const icon = shareButton.querySelector('i');
                if (icon) {
                    icon.classList.add('icon-folder-users-thin-outline');
                    icon.classList.remove('icon-bucket-outgoing-share');
                }
            }

            const { dataset } = selectionLinkWrapper.querySelector('.selection-links-wrapper .delete');
            dataset.simpletip = M.getSelectedRemoveLabel($.selected);

            if (sourceRoot === M.RubbishID) {
                if (!isSearch && $.selected.length > 1) {
                    __hideButton('options');
                }
                if (!$.selected.some(h => {
                    const node = M.getNodeByHandle(h);
                    return !(M.getNodeRoot(node.h) === M.RubbishID && node.rr);
                })) {
                    __showBtn('restore');
                }
            }

            let mkfound;

            for (let i = 0; i < $.selected.length; i++) {
                if (missingkeys[$.selected[i]]) {
                    mkfound = true;
                    break;
                }
            }

            if ((sourceRoot === M.RootID || sourceRoot === 's4' || sourceRoot === 'out-shares' ||
                M.isDynPage(sourceRoot) || sourceRoot === mega.devices.rootId) && !folderlink) {

                const cl = new mega.Share.ExportLink();

                for (let i = 0; i < $.selected.length; i++) {
                    if (M.getNodeRoot($.selected[i]) === M.InboxID) {
                        restrictedFolders = true;
                        break;
                    }
                }

                // If any of selected items is taken down we do not need to proceed futher
                if (cl.isTakenDown($.selected) || mkfound) {
                    if (!restrictedFolders) {
                        __showBtn('delete');
                    }
                    __showBtn = nop;
                }

                showGetLink = !isRootSelected;

                if (!isRootSelected && selNode.t && $.selected.length === 1) {
                    __showBtn('share');
                }
                if (M.currentdirid === mega.devices.rootId) {
                    __hideButton('options');
                    __showBtn('info');
                }
                if ($.selected.length === 1) {
                    __showBtn('rename');
                }
                __showBtn('move');
            }

            // Temporarily hide download button for now in MEGA Lite mode (still accessible via zip in context menu)
            if (selNode.h !== M.RootID && M.getNodeRoot(M.currentdirid) !== M.RubbishID && !mkfound &&
                (!mega.lite.inLiteMode || !mega.lite.containsFolderInSelection($.selected))) {
                __showBtn('download');
            }

            if ((showGetLink || folderlink) && !mkfound) {
                __showBtn('link');
            }

            if (sourceRoot === M.InboxID || restrictedFolders) {

                // Set "Read-only share" string
                shareButton.dataset.simpletip = l.read_only_share;

                if (selNode.t && $.selected.length === 1) {
                    __showBtn('share');
                }
                if (!isRootSelected) {
                    __showBtn('link');
                }
            }
            else if (!isRootSelected && !folderlink && M.currentrootid !== 'shares' && M.currentdirid !== 'shares'
                || M.currentrootid === 'shares' && M.currentdirid !== 'shares' && M.d[M.currentdirid].r === 2) {
                __showBtn('delete');
            }

            if (isSearch) {
                let hasRubbish = false;
                let hasInshare = false;
                let fullInshareFiles = 0;
                let allFullAccess = true;
                for (const h of $.selected) {
                    const root = M.getNodeRoot(h);
                    const rights = M.getNodeRights(h);
                    if (root === M.RubbishID) {
                        hasRubbish = true;
                    }
                    else if (root === 'shares') {
                        hasInshare = true;
                        if (M.d[h].t === 0 && rights === 2) {
                            fullInshareFiles++;
                        }
                    }
                    if (rights < 2) {
                        allFullAccess = false;
                    }
                }
                if (sourceRoot === M.RubbishID) {
                    __hideButton('download');
                }
                if (hasInshare) {
                    if (allFullAccess && $.selected.length === 1) {
                        __showBtn('rename');
                    }
                    else {
                        __hideButton('move');
                        __hideButton('delete');
                    }
                    if (fullInshareFiles === $.selected.length) {
                        __showBtn('delete');
                    }
                    else {
                        __hideButton('delete');
                    }
                }
                if ($.selected.length > 1 && hasRubbish) {
                    __hideButton('move');
                    __hideButton('delete');
                    __hideButton('link');
                    __hideButton('download');
                }
            }

            if (M.dcd[selNode.h]) {
                __hideButton('link');
                __hideButton('share');
                __hideButton('download');
                __hideButton('delete');
            }

            if (M.onDeviceCenter) {
                const section = mega.devices.ui.getRenderSection();
                const isBackup = mega.devices.ui.isBackupRelated(selNode.h);
                __hideButton('move');
                if (isBackup || isRootSelected) {
                    __hideButton('rename');
                }
                if (sharer(selNode.h)) {
                    if (section === 'device-centre-folders') {
                        __hideButton('delete');
                        __hideButton('link');
                        __hideButton('share');
                    }
                    else if (section === 'cloud-drive' && M.getNodeRights(selNode.h) > 1) {
                        __hideButton('link');
                        __hideButton('share');
                    }
                }
                else if (section === 'device-centre-folders') {
                    __hideButton('delete');
                }
                else if (section === 'cloud-drive' && !isBackup) {
                    __showBtn('move');
                }
            }

            if (M.currentdirid === 'file-requests') {
                __hideButton('link');
                __hideButton('share');
                __hideButton('move');
                if ($.selected.length === 1) {
                    __showBtn('manage-file-request');
                }
            }

            if (M.currentrootid === 'shares') {
                const r = M.getNodeRights(selNode.h);
                if (M.currentdirid === 'shares') {
                    __showBtn('info');
                }
                if (r === 2) {
                    if ($.selected.length === 1) {
                        __showBtn('rename');
                    }
                    if ($.selected.length > 1 && M.currentdirid !== 'shares') {
                        __showBtn('move');
                    }
                }
                // If in MEGA Lite mode, temporarily hide any download buttons in the Shared area
                if (mega.lite.inLiteMode) {
                    __hideButton('download');
                }
            }

            if (M.isGalleryPage()) {
                __showBtn('info');
                __showBtn('add-to-album');
            }

            if (M.currentrootid === 'public-links') {
                if ($.selected.length > 1) {
                    __showBtn('move');
                }
                else {
                    __showBtn('rename');
                }
            }

            if (mega.lite.inLiteMode) {
                // If in MEGA Lite mode, temporarily hide the Move to Rubbish Bin button in the outgoing shares area
                if (M.currentrootid === 'out-shares') {
                    __hideButton('delete');
                }
                __hideButton('move');
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
                        finalise();
                    }
                });
        }
        finalise();

        M.initStatusBarLinks();

        if (d) {
            console.timeEnd('showRequiredLinks');
        }
    }

    updateRequiredLinksBySize() {
        const { selectionBar, domNode } = mega.ui.secondaryNav;
        const itemsCenter = selectionBar.querySelector('.items-center');
        const linksWrapper = selectionBar.querySelector('.selection-links-wrapper');
        const layoutControls = domNode.querySelector('.fm-header-bottom');

        const { width: headerWidth } = domNode.getBoundingClientRect();
        let { width: metaWidth } = itemsCenter.getBoundingClientRect();
        let { width: layoutWidth } = layoutControls.getBoundingClientRect();
        metaWidth += 24; // Margin
        metaWidth += 24; // Element padding
        metaWidth += 48; // Parent padding
        metaWidth += 12; // Links padding
        layoutWidth += 16; // Padding
        const LINK_WIDTH = 64;
        const shownLinks = linksWrapper.querySelectorAll('.collapsible');
        // Context not included.
        const canShow = Math.floor((headerWidth - metaWidth - layoutWidth) / LINK_WIDTH) - 1;
        const filter = (c) => {
            switch (c) {
                case 'mega-component':
                case 'nav-elem':
                case 'icon-only':
                case 'transparent-icon':
                case 'simpletip':
                case 'small':
                case 'js-statusbarbtn':
                case 'collapsible': {
                    return false;
                }
            }
            return !!c;
        };
        if (canShow < shownLinks.length) {
            $.menuForcedItems = [];
            let toHide = shownLinks.length - canShow;
            for (let i = shownLinks.length; i--;) {
                const item = [...shownLinks[i].classList].filter(filter)[0];
                if (item) {
                    $.menuForcedItems.push(SelectionManager2_DOM.selectionContextItemMap[item] || `.${item}`);
                    shownLinks[i].classList.add('hidden');
                    if (--toHide === 0) {
                        break;
                    }
                }
            }
        }
        else {
            $.menuForcedItems = $.menuForcedItems || [];
            let alreadyHidden = 0;
            for (const shownLink of shownLinks) {
                if (shownLink.classList.contains('hidden')) {
                    alreadyHidden++;
                }
            }
            if (alreadyHidden) {
                for (let i = 0; i < Math.min(canShow, shownLinks.length); i++) {
                    shownLinks[i].classList.remove('hidden');
                    const type = [...shownLinks[i].classList].filter(filter)[0];
                    if (type) {
                        const idx = $.menuForcedItems
                            .indexOf(SelectionManager2_DOM.selectionContextItemMap[type] || `.${type}`);
                        if (idx > -1) {
                            $.menuForcedItems.splice(idx, 1);
                        }
                    }
                }
            }
        }
    }
}

SelectionManager2_DOM.selectionContextItemMap = freeze({
    'download': ['.download-item', '.download-standart-item', '.zipdownload-item'],
    'link': '.getlink-item',
    'share': '.sh4r1ng-item',
    'manage-file-request': '.file-request-manage.file-request-page',
    'add-to-album': '.add-to-album',
    'rename': '.rename-item',
    'move': '.move-item',
    'info': '.properties-item',
    'restore': '.revert-item',
    'delete': '.remove-item',
});

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

SelectionManager2Base.SUB_CLASSES = Object.create(null);
SelectionManager2Base.SUB_CLASSES.SelectionManager2_DOM = SelectionManager2_DOM;
SelectionManager2Base.SUB_CLASSES.SelectionManager2_React = SelectionManager2_React;

var selectionManager;
