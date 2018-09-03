/**
 * This should take care of flagging the LAST selected item in those cases:
 *
 *  - jQ UI $.selectable's multi selection using drag area (integrated using jQ UI $.selectable's Events)
 *
 *  - Single click selection (integrated by assumption that the .get_currently_selected will also try to cover this
 *  case when there is only one .ui-selected...this is how no other code had to be changed :))
 *
 *  - Left/right/up/down keys (integrated by using the .set_currently_selected and .get_currently_selected public
 *  methods)
 *
 * @param $selectable
 * @param resume {boolean}
 * @returns {*}
 * @constructor
 */
var SelectionManager = function($selectable, resume) {
    var self = this;

    var idx = window._selectionManagerIdx = window._selectionManagerIdx ? window._selectionManagerIdx + 1 : 1;

    self.idx = idx;

    var debugMode = !!localStorage.selectionManagerDebug;

    /**
     * Store all selected items in an _ordered_ array.
     *
     * @type {Array}
     */
    this.selected_list = [];


    this.last_selected = null;

    /**
     * This method should be called, so that a brand new jQuery query would be called each time, to guarantee that
     * the currently cached $selectable is the one attached to the DOM.
     * This is caused by the deleteScroll called in some sections (contacts, shared) right after the MegaRender init
     * finishes. Which makes its MegaRender.container to be the cached node which was just removed from the DOM.
     *
     * @returns {*}
     * @private
     */
    this._ensure_selectable_is_available = function() {
        var targetScope = $selectable && $selectable[0];
        if (
            !targetScope ||
            !targetScope.parentNode ||
            $(targetScope).is(".hidden") ||
            !$(targetScope).is(":visible")
        ) {
            // because MegaRender is providing a DOM node, which later on is being removed, we can't cache
            // the $selectable in this case, so lets try to use $.selectddUIgrid and do a brand new jq Sizzle query
            $selectable = $($.selectddUIgrid + ":visible");
        }
        return $selectable;
    };

    /**
     * Called to bind the (currently active) selectionManager to the currently active .ui-selectable target
     *
     * @param target
     */
    this.bindSelectable = function(target) {
        var $jqSelectable = $(target);

        if (debugMode) {
            console.error("(re)bindselectable", target, self);
        }

        $jqSelectable.unbind('selectableselecting.sm' + idx + ' selectableselected.sm' + idx);
        $jqSelectable.unbind('selectableunselecting.sm' + idx + ' selectableunselected.sm' + idx);

        /**
         * Push the last selected item to the end of the selected_list array.
         */
        $jqSelectable.bind('selectableselecting.sm' + idx + ' selectableselected.sm' + idx, function (e, data) {
            var $selected = $(data.selecting || data.selected);
            var id = $selected.attr('id');
            if (id) {
                // dont use 'this/self' but the current/global selectionManager
                selectionManager.add_to_selection(id);
            }
        });

        /**
         * Remove any unselected element from the selected_list array.
         */
        $jqSelectable.bind('selectableunselecting.sm' + idx + ' selectableunselected.sm' + idx, function (e, data) {
            var $unselected = $(data.unselecting || data.unselected);
            var unselectedId = $unselected.attr('id');
            if (unselectedId) {
                // dont use 'this/self' but the current/global selectionManager
                selectionManager.remove_from_selection(unselectedId);
            }
        });

        if (selectionManager) {
            selectionManager._$jqSelectable = $jqSelectable;
        }

        if ($(target).is(".file-block-scrolling:not(.hidden)")) {
            // jQuery UI won't do trigger unselecting, in case of the ui-selected item is NOT in the DOM, so
            // we need to reset it on our own (on drag on the background OR click)
            $(target).rebind('mousedown.sm' + idx, function(e) {
                if ($(e.target.parentNode).is(".file-block-scrolling:not(.hidden)")) {
                    selectionManager.clear_selection();
                }
            });
        }
    };

    /**
     * Helper func to clear old reset state from other icons.
     */
    this.clear_last_selected = function() {
        if (this.last_selected) {
            $selectable = this._ensure_selectable_is_available();

            $('.currently-selected', $selectable).removeClass('currently-selected');

            this.last_selected = null;
        }
    };


    this.clear_selection = function() {
        $selectable = this._ensure_selectable_is_available();

        this.selected_list.forEach(function(nodeId) {
            var node = $('#' + nodeId, $selectable);
            if (node && node.size() > 0) {
                node.removeClass('ui-selected');
            }
        });

        this.selected_list = $.selected = [];

        this.clear_last_selected();
    };

    /**
     * The idea of this method is to _validate_ and return the .currently-selected element.
     *
     * @returns {String|Boolean} node id
     */
    this.get_currently_selected = function() {
        if (this.last_selected) {
            return this.last_selected;
        }
        else {
            return false;
        }
    };

    /**
     * Used from the shortcut keys code.
     *
     * @param nodeId
     */
    this.set_currently_selected = function(nodeId, scrollTo) {
        self.clear_last_selected();
        quickFinder.disable_if_active();


        if (this.selected_list.indexOf(nodeId) === -1) {
            this.add_to_selection(nodeId, scrollTo);
            return;
        }

        if ($.isArray(nodeId)) {
            this.last_selected = nodeId[nodeId.length - 1];
        }
        else {
            this.last_selected = nodeId;
        }

        if (scrollTo && !$.isArray(nodeId)) {
            $selectable = this._ensure_selectable_is_available();
            var $element = $('#' + this.last_selected, $selectable);
            $element.addClass("currently-selected");
            // Do .scrollIntoView if the parent or parent -> parent DOM Element is a JSP.
            {
                var $jsp = $element.getParentJScrollPane();
                if ($jsp) {
                    $jsp.scrollToElement($element);
                }
                else {
                    if (M.megaRender && M.megaRender.megaList) {
                        M.megaRender.megaList.scrollToItem(this.last_selected);
                    }
                }
            }
        }
    };

    this.add_to_selection = function(nodeId, scrollTo, alreadySorted) {
        if (!isString(nodeId)) {
            if (nodeId && nodeId.h) {
                nodeId = nodeId.h;
            }
            else if (d) {
                console.error(".add_to_selection received a non-string as nodeId");
                return;
            }
        }

        if (this.selected_list.indexOf(nodeId) === -1) {
            this.selected_list.push(nodeId);
            $selectable = this._ensure_selectable_is_available();
            $('#' + nodeId, $selectable).addClass('ui-selected');
            this.set_currently_selected(nodeId, scrollTo);

            if (!alreadySorted) {
                // shift + up/down requires the selected_list to be in the same order as in M.v (e.g. render order)
                var currentViewOrderMap = {};
                M.v.forEach(function (v, k) {
                    currentViewOrderMap[SelectionManager.dynamicNodeIdRetriever(v)] = k;
                });

                // sort this.selected_list as in M.v
                this.selected_list.sort(function (a, b) {
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
        $.selected = this.selected_list;
        if (debugMode) {
            console.error("commit: ", JSON.stringify(this.selected_list), self);
        }
    };

    this.remove_from_selection = function(nodeId) {
        var foundIndex = this.selected_list.indexOf(nodeId);

        if (foundIndex > -1) {
            $selectable = this._ensure_selectable_is_available();

            this.selected_list.splice(foundIndex, 1);
            $('#' + nodeId, $selectable).removeClass('ui-selected');
            if (this.last_selected === nodeId) {
                $('#' + nodeId, $selectable).removeClass('currently-selected');
                this.last_selected = null;
            }
            $.selected = this.selected_list;
            if (debugMode) {
                console.error("commit: ", JSON.stringify(this.selected_list));
            }
        }
        else {
            if (debugMode) {
                console.error("can't remove:", nodeId, JSON.stringify(this.selected_list), JSON.stringify($.selected));
            }
        }
    };

    /**
     * Simple helper func, for selecting all elements in the current view.
     */
    this.select_all = function() {
        var self = this;

        self.clear_selection();

        M.v.forEach(function(v) {
            self.add_to_selection(SelectionManager.dynamicNodeIdRetriever(v), false, true);
        });
    };

    this.select_next = function(shiftKey, scrollTo) {
        this._select_pointer(1, shiftKey, scrollTo);
    };

    this.select_prev = function(shiftKey, scrollTo) {
        this._select_pointer(-1, shiftKey, scrollTo);
    };

    this._select_pointer = function(ptr, shiftKey, scrollTo) {
        var currentViewIds = [];
        M.v.forEach(function(v) {
            currentViewIds.push(SelectionManager.dynamicNodeIdRetriever(v));
        });


        var current = this.get_currently_selected();
        var nextIndex = currentViewIds.indexOf(current);


        if (ptr === -1) {
            // up

            // allow selection to go backwards, e.g. start selecting from the end of the list
            nextIndex = nextIndex <= 0 ? currentViewIds.length - Math.max(nextIndex, 0) : nextIndex;

            if (nextIndex > -1 && nextIndex - 1 >= 0) {
                var nextId = currentViewIds[nextIndex - 1];

                // clear old selection if no shiftKey
                if (!shiftKey) {
                    this.clear_selection();
                    this.set_currently_selected(nextId, scrollTo);
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
                        this.clear_selection();
                        this.set_currently_selected(firstItemId, false);
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
                var nextId = currentViewIds[nextIndex + 1];

                // clear old selection if no shiftKey
                if (!shiftKey) {
                    this.clear_selection();
                    this.set_currently_selected(nextId, scrollTo);
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
                        this.clear_selection();
                        this.set_currently_selected(fromFirstItemId, false);
                        this.shift_select_to(lastItemId, scrollTo, false, false);
                        this.last_selected = fromFirstItemId;
                    }
                    else {
                        this.add_to_selection(nextId, scrollTo);
                    }
                }
            }
        }
    };

    this._select_ptr_grid = function(ptr, shiftKey, scrollTo) {
        if (this.selected_list.length === 0) {
            this.set_currently_selected(SelectionManager.dynamicNodeIdRetriever(M.v[0]), scrollTo);
            return;
        }

        var currentViewIds = [];
        M.v.forEach(function(v) {
            currentViewIds.push(SelectionManager.dynamicNodeIdRetriever(v));
        });


        var items_per_row = Math.floor(
            $('.data-block-view:visible').parent().outerWidth() / $('.data-block-view:visible:first').outerWidth(true)
        );


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
                $("#" + currentViewIds[target_element_num]).addClass('ui-selected');
                this.set_currently_selected(currentViewIds[target_element_num], scrollTo);
            }
        }
        else {
            // do nothing.
        }
    };

    this.select_grid_up = function(shiftKey, scrollTo) {
        this._select_ptr_grid(-1, shiftKey, scrollTo);
    };

    this.select_grid_down = function(shiftKey, scrollTo) {
        this._select_ptr_grid(1, shiftKey, scrollTo);
    };


    this.shift_select_to = function(lastId, scrollTo, isMouseClick, clear) {
        assert(lastId, 'missing lastId for selectionManager.shift_select_to');

        var currentViewIds = [];
        M.v.forEach(function(v) {
            currentViewIds.push(SelectionManager.dynamicNodeIdRetriever(v));
        });

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
                for (var i = Math.min(current_idx, currentViewIds.length - 1); i <= last_idx; i++) {
                    this.add_to_selection(currentViewIds[i], scrollTo);
                }
            }
            else {
                // direction - up
                for (var i = Math.max(0, current_idx); i >= last_idx; i--) {
                    this.add_to_selection(currentViewIds[i], scrollTo);
                }
            }
        }

        if (isMouseClick && last_selected) {
            this.set_currently_selected(last_selected, false);
        }

    };

    /**
     * Use this to get ALL (multiple!) selected items in the currently visible view/grid.
     */
    this.get_selected = function() {
        return this.selected_list;
    };


    this.destroy = function() {
        if (this._$jqSelectable) {
            this._$jqSelectable.unbind('selectableunselecting.sm' + this.idx + ' selectableunselected.sm' + this.idx);
            this._$jqSelectable.unbind('selectableselecting.sm' + this.idx + ' selectableselected.sm' + this.idx);
        }
        $('.fm-right-files-block').undelegate('selectablecreate.sm');
    };


    if (!resume) {
        this.clear_selection(); // remove ANY old .currently-selected values.
    }
    else {
        if (debugMode) {
            console.error('resuming:', JSON.stringify($.selected));
        }
        this.selected_list = [];

        $.selected.forEach(function(entry) {
            self.selected_list.push(entry);
        });

        // ensure the current 'resume' selection list is matching the current M.v
        $.selected.forEach(function(nodeId) {
            if (!M.c[M.currentdirid] || !M.c[M.currentdirid][nodeId]) {
                self.remove_from_selection(nodeId);
            }
        });

        this.clear_last_selected();
    }

    var $uiSelectable = $('.fm-right-files-block .ui-selectable:visible:not(.hidden)');

    if ($uiSelectable.length === 1) {
        this.bindSelectable($uiSelectable);
    }

    $('.fm-right-files-block').undelegate('selectablecreate.sm');

    $('.fm-right-files-block').delegate('.ui-selectable', 'selectablecreate.sm', function(e) {
        selectionManager.bindSelectable(e.target);
    });


    if (localStorage.selectionManagerDebug) {
        Object.keys(self).forEach(function(k) {
            if (typeof(self[k]) === 'function') {
                var old = self[k];
                self[k] = function () {
                    console.error(k, arguments);
                    return old.apply(this, arguments);
                };
            }
        });
        $selectable = this._ensure_selectable_is_available();
        this.$selectable = $selectable;
    }

    return this;
};


/**
 * Helper function that would retrieve the DOM Node ID from `n` and convert it to DOM node ID
 *
 * @param n
 */
SelectionManager.dynamicNodeIdRetriever = function(n) {
    if ((M.currentdirid === "ipc" || M.currentdirid === "opc") && n.p) {
        return M.currentdirid + "_" + n.p;
    }
    else {
        return n.h;
    }
};

var selectionManager;
