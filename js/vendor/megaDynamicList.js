(function(scope, $) {
    var isFirefox = navigator.userAgent.indexOf("Firefox") > -1;
    var isIE = navigator.userAgent.indexOf('Edge/') > -1 || navigator.userAgent.indexOf('Trident/') > -1;

    /**
     * Internal/private helper method for doing 'assert's.
     *
     * @param val {boolean}
     * @param msg {String}
     */
    var assert = function(val, msg) {
        if (!val) {
            throw new Error(msg ? msg : "Assertion Failed.");
        }
    };

    /**
     * DOM utilities
     *
     * @type {{}}
     */
    var DOMUtils = {};

    /**
     * Optimised/faster DOM node removal method
     *
     * @param node
     */
    DOMUtils.removeNode = function(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
        // else - parentNode is already removed.
    };

    /**
     * Helper for .appendAfter
     *
     * @param newElement
     * @param targetElement
     */
    DOMUtils.appendAfter = function(newElement, targetElement) {
        // target is what you want it to go after. Look for this elements parent.
        var parent = targetElement.parentNode;

        if (!parent) {
            // TODO: fix me properly...
            console.warn('The target element got detached from the DOM...', [targetElement]);
            return false;
        }

        // if the parents lastchild is the targetElement...
        if (parent.lastElementChild === targetElement) {
            // add the newElement after the target element.
            parent.appendChild(newElement);
        } else {
            // else the target has siblings, insert the new element between the target and it's next sibling.
            parent.insertBefore(newElement, targetElement.nextElementSibling);
        }
    };

    /**
     * Helper for .prepend
     *
     * @param newElement
     * @param targetElement
     */
    DOMUtils.prepend = function(newElement, targetElement) {
        if (targetElement.prepend) {
            targetElement.prepend(newElement)
        }
        else {
            if (targetElement.firstElementChild) {
                targetElement.insertBefore(newElement, targetElement.firstElementChild);
            }
            else {
                targetElement.appendChild(newElement);
            }
        }
    };

    var SETTINGS = {

        /**
         * Callback should return the height of item at id.
         * Callback should satisfy the signature function(id) -> height (int)
         */
        'itemHeightCallback': false,

        /**
         * A Callback function, that receives 1 argument - itemID (string/int) and should return a DOM Object, HTML
         * String or a jQuery object that is the actual DOM node to be rendered/appended to the list.
         */
        'itemRenderFunction': false,

        /**
         * Pass any PerfectScrollbar options here.
         */
        'perfectScrollOptions': {},

        /**
         * Force MegaDynamicList to trigger a 'onUserScroll' jQuery Event if needed.
         */
        'enableUserScrollEvent': false,

        /**
         * Triggered when the content is updated.
         */
        'onContentUpdated': false,

        /**
         * Offscreen buffer to keep rendered in px.
         */
        'viewPortBuffer': 50,

        /**
         * Custom callback for when the view changes.
         */
        'onViewChange': false,

        /**
         * Custom callback only triggeed when new nodes are inserted into the DOM.
         * Can satisfy signature (Array injectedIds) => void
         */
        'onNodeInjected': false,

        /**
         * Custom classes to add to the contentContainer. (The actual content div that gets scrolled.
         */
        'contentContainerClasses': false,

        /**
         * Optional resize callback.
         */
        'onResize': false,

        /**
         * On scroll callback.
         */
        'onScroll': false,

        /**
         * Initial scroll position.
         */
        'initialScrollY': false
    };

    /**
     * Helper variable, that create unique IDs by auto incrementing for every new MegaDynamicList that gets initialised.
     *
     * @type {number}
     */
    var listId = 0;

    /**
     * MegaDynamicList allows for rendering a list inside of a viewport. Only items which are within the visible range
     * will be rendered.
     *
     * @param listContainer {String|jQuery|DOMNode} the container, which would be used to append list items
     * @param options {Object} see SETTINGS for defaults and available options.
     * @constructor
     */
    var MegaDynamicList = function (listContainer, options) {
        assert(options.itemRenderFunction, 'itemRenderFunction was not provided.');
        assert(options.itemHeightCallback, 'itemHeightCallback was not provided.');

        this.listId = listId++;

        this.$listContainer = $(listContainer);
        this.$listContainer
            .css({'position': 'relative'})
            .addClass("MegaDynamicList");
        this.listContainer = this.$listContainer[0];
        this.prepusher = null;

        this._lastScrollPosY = -1;

        var items = options.items;
        delete options.items;
        if (!items) {
            items = [];
        }
        this.items = items;

        // Maintains the height of each item in the list.
        this._heights = {};

        // Maintains the top-offset for each item in the list.
        this._offsets = {};

        this._wasRendered = false;

        /**
         * A dynamic cache to be used as a width/height/numeric calculations
         *
         * @type {{}}
         * @private
         */
        this._calculated = {};

        // Remember the last range before scrolling.
        this._lastFirstPos = 0;
        this._lastLastPos = 0;
        this._lastFirstItem = null;
        this._lastLastItem = null;

        // Indicates if this list is currently rendered and listening for events.
        this.active = true;

        // Saved state such that when we resume we can restore to the same position.
        this._state = {};

        /**
         * A map of IDs which are currently rendered (cached as a map, so that we can reduce access to the DOM)
         *
         * @type {Array}
         * @private
         */
        this._currentlyRendered = {};

        this.options = $.extend({}, SETTINGS, options);

        this._debug = localStorage.d || 0;
    };

    /**
     * Do the initial render, setting up the content container and scrolling.
     */
    MegaDynamicList.prototype.initialRender = function() {
        assert(this._wasRendered === false, 'This MegaDynamicList is already rendered');

        if (!this.$content) {
            this.$content = $('<div class="MegaDynamicList-content"><div class="pre-pusher"></div></div>');
            this.$content.css({
                'position': 'relative'
            });

            if (this.options.contentContainerClasses) {
                this.$content.addClass(this.options.contentContainerClasses);
            }

            this.content = this.$content[0];

            this.listContainer.appendChild(this.content);
            this.prepusher = this.$content.find(".pre-pusher")[0];
        }

        // init PS
        Ps.initialize(this.listContainer, this.options.perfectScrollOptions);
        this._wasRendered = true;
        this._isUserScroll = true;



        this._onContentUpdated();

        // bind events
        this._bindEvents();
        this._calculateHeightAndOffsets(true);
        if (this.options.initialScrollY) {
            this.listContainer.scrollTop = this.options.initialScrollY;
        }
        this._calculateScrollValues();
        this._viewChanged(true);
    };

    /**
     * Calculate the total height + offsets of each item on screen.
     * @private
     */
    MegaDynamicList.prototype._calculateHeightAndOffsets = function (applyHeight) {
        'use strict';
        var totalHeight = 0;
        for (var i = 0; i < this.items.length; i++) {
            var key = this.items[i];
            if (!this._heights[key]) {
                this._heights[key] = this.options.itemHeightCallback(key);
            }
            this._offsets[key] = totalHeight;
            totalHeight += this._heights[key];
            this._heights[key] = this._heights[key];
        }
        this._calculated['contentHeight'] = totalHeight;
        if (applyHeight) {
            this.content.style.height = this._calculated['contentHeight'] + "px";
            Ps.update(this.listContainer);
        }
    };

    /**
     * Should be triggered when an items render properties are changed (eg Height).
     * @param index
     */
    MegaDynamicList.prototype.itemRenderChanged = function(id) {
        'use strict';
        this._updateHeight(id);
        this._viewChanged();
    };

    /**
     * Force a DOM element to be re-collected from the collector function if it is in view.
     * @param id
     */
    MegaDynamicList.prototype.itemChanged = function(id) {
        'use strict';
        if (this.active && this._currentlyRendered[id]) {
            this._removeItemFromView(id);
            this._updateHeight(id);
            this._viewChanged(true);
        }
    };

    /**
     * Handle when an items height changes.
     * @param index
     * @private
     */
    MegaDynamicList.prototype._updateHeight = function(id) {
        'use strict';
        var newHeight = this.options.itemHeightCallback(id);
        this._calculated['contentHeight'] += newHeight - this._heights[id];
        this.content.style.height = this._calculated['contentHeight'] + "px";
        this._heights[id] = newHeight;
        this._calculateHeightAndOffsets(true);
    };

    /**
     * Update all offsets below the start index.
     * @param startIndex Index to start at.
     * @param offset The offset for the first item.
     * @private
     */
    MegaDynamicList.prototype._updateOffsetsFrom = function(startIndex, offset) {
        'use strict';
        for (var i = startIndex; i < this.items.length; i++) {
            var id = this.items[i];
            this._offsets[id] = offset;
            if (!this._heights[id]) {
                this._heights[id] = this.options.itemHeightCallback(id);
            }
            offset += this._heights[id];
        }
    };

    /**
     * Calculate the scroll offset and viewport height.
     * @private
     */
    MegaDynamicList.prototype._calculateScrollValues = function() {
        'use strict';
        this._calculated['scrollTop'] = this.listContainer.scrollTop;
        this._calculated['scrollHeight'] = this.$listContainer.innerHeight();
    };

    /**
     * Calculate the first and last items visible on screen.
     * @private
     */
    MegaDynamicList.prototype._calculateFirstLast = function() {
        'use strict';
        var viewportTop = this._calculated['scrollTop'] - this.options.viewPortBuffer;
        var viewportBottom = viewportTop + this._calculated['scrollHeight'] + this.options.viewPortBuffer;
        var i = 0;
        while (this._offsets[this.items[i]] < viewportTop && i < this.items.length - 1) {
            i++;
        }
        var top = i;
        if (this._offsets[this.items[i]] > viewportTop) {
            top = Math.max(0, i - 1);
        }
        while (this._offsets[this.items[i]] < viewportBottom && i < this.items.length - 1) {
            i++;
        }
        this._calculated['firstItemPos'] = top;
        this._calculated['lastItemPos'] = i;
        this._calculated['firstItem'] = this.items[top];
        this._calculated['lastItem'] = this.items[i];
    };

    /**
     * Triggered when the view is changed.
     * @private
     */
    MegaDynamicList.prototype._viewChanged = function(forceDOMCheck) {
        'use strict';
        this._calculateScrollValues();
        this._calculateFirstLast();
        if (forceDOMCheck
            || this._calculated['firstItemPos'] !== this._lastFirstPos || this._calculated['lastItemPos'] !== this._lastLastPos
            || this._calculated['firstItem'] !== this._lastFirstItem || this._calculated['lastItem'] !== this._lastLastItem
        ) {
            this._applyDOMChanges();
        }
        this._lastFirstPos = this._calculated['firstItemPos'];
        this._lastLastPos = this._calculated['lastItemPos'];
        this._lastFirstItem = this._calculated['firstItem'];
        this._lastLastItem = this._calculated['lastItem'];

        if (this.options.onViewChange) {
            this.options.onViewChange();
        }
    };

    /**
     * Apply any required DOM Changes.
     * @private
     */
    MegaDynamicList.prototype._applyDOMChanges = function() {
        var contentHasChanged = false;
        var nodeInjected = [];
        var low = this._calculated['firstItemPos'];
        var high = this._calculated['lastItemPos'];
        if (high < this.items.length) {
            high += 1;
        }

        for (var i = 0; i < this.items.length; i++) {
            var id = this.items[i];
            if (this._currentlyRendered[id] !== undefined && (i < low || i > high)) {
                this._removeItemFromView(id);
                contentHasChanged = true;
            }
        }
        for (var i = low; i < high; i++) {
            var id = this.items[i];
            if (!this._currentlyRendered[id]) {
                this._currentlyRendered[id] = this.options.itemRenderFunction(id);
                this._currentlyRendered[id].classList.add("MegaDynamicListItem");
                var afterTarget;
                if (this._currentlyRendered[this.items[i - 1]]) {
                    afterTarget = this._currentlyRendered[this.items[i - 1]];
                } else {
                    afterTarget = this.prepusher;
                }
                DOMUtils.appendAfter(this._currentlyRendered[id], afterTarget);
                contentHasChanged = true;
                nodeInjected.push(id);
            }
        }
        this.prepusher.style.height = this._offsets[this.items[low]] + "px";
        if (contentHasChanged) {
            this._onContentUpdated();
            if (nodeInjected) {
                this._onNodeInjected(nodeInjected);
            }
        }
    };

    MegaDynamicList.prototype.add = function (item) {
        'use strict';
        this.batchAdd([item]);
    };

    /**
     * Optimised adding of entries, less DOM updates
     *
     * @param itemIdsArray {Array} Array of item IDs (Strings)
     */
    MegaDynamicList.prototype.batchAdd = function (itemIdsArray) {
        var self = this;
        itemIdsArray.forEach(function(itemId) {
            self.items.push(itemId);
        });
    };

    /**
     * Internal method to trigger when the dom content is changed.
     * @private
     */
    MegaDynamicList.prototype._onContentUpdated = function() {
        'use strict';
        if (this.options.onContentUpdated) {
            this.options.onContentUpdated();
        }
    };

    /**
     * Similiar to onContentUpdated but will only trigger if a new node added to the view not if a node is removed.
     * @private
     */
    MegaDynamicList.prototype._onNodeInjected = function() {
        if (this.options.onNodeInjected) {
            this.options.onNodeInjected();
        }
    };

    /**
     * Internal method used for generating unique (per MegaDynamicList) instance namespace string. (not prepended with "."!)
     *
     * @returns {string}
     * @private
     */
    MegaDynamicList.prototype._generateEventNamespace = function() {
        return "MegaDynamicList" + this.listId;
    };

    /**
     * Should be called when the list container is resized.
     * This method would be automatically called on window resize, so no need to do that in the implementing code.
     */
    MegaDynamicList.prototype.resized = function () {
        'use strict';
        this._calculateScrollValues();
        this._viewChanged();

        if (this.options.onResize) {
            this.options.onResize();
        }

        // all done, trigger a resize!
        $(this).trigger('resize');
    };

    MegaDynamicList.prototype._actualOnScrollCode = function(e) {
        var self = this;
        if (self.options.onScroll) {
            self.options.onScroll();
        }
        self._onScroll(e);
    };

    MegaDynamicList.prototype.throttledOnScroll = function(e) {
        var wait = isFirefox ? 30 : 5;
        var self = this;
        if (!self._lastThrottledOnScroll) {
            self._lastThrottledOnScroll = Date.now();
        }

        if ((self._lastThrottledOnScroll + wait - Date.now()) < 0) {
            if (
                self._lastScrollPosY !== e.target.scrollTop &&
                self._isUserScroll === true &&
                self.listContainer === e.target
            ) {
                self._lastScrollPosY = e.target.scrollTop;

                if (isFirefox) {
                    if (self._lastOnScrollTimer) {
                        clearTimeout(self._lastOnScrollTimer);
                    }

                    self._lastOnScrollTimer = setTimeout(function() {
                        self._actualOnScrollCode(e);
                    }, 0);
                }
                else {
                    self._actualOnScrollCode(e);
                }

            }
            self._lastThrottledOnScroll = Date.now();
        }
    };

    /**
     * Internal method that gets called when the user scrolls.
     *
     * @param e {Event}
     * @private
     */
    MegaDynamicList.prototype._onScroll = function(e) {
        this._calculateScrollValues();
        this._viewChanged();
    };

    /**
     * Internal method that would be called when the MegaDynamicList renders to the DOM UI and is responsible for binding
     * the DOM events.
     *
     * @private
     */
    MegaDynamicList.prototype._bindEvents = function () {
        var self = this;
        var ns = self._generateEventNamespace();

        $(window).rebind("resize." + ns, function() {
            self.resized();
        });

        $(document).rebind('ps-scroll-y.ps' + ns, self.throttledOnScroll.bind(self));
    };

    /**
     * Called when .destroy is triggered. Should unbind any DOM events added by this MegaDynamicList instance.
     *
     * @private
     */
    MegaDynamicList.prototype._unbindEvents = function () {
        var ns = this._generateEventNamespace();

        $(window).off("resize." + ns);
        $(document).off('ps-scroll-y.ps' + ns);
    };

    /**
     * Insert a new item into the list.
     * @param after
     * @param id
     */
    MegaDynamicList.prototype.insert = function(after, id, renderUpdate) {
        'use strict';
        if (renderUpdate !== false) {
            renderUpdate = true;
        }

        var position;
        if (!after) {
            position = 0;
        } else {
            position = this.items.indexOf(after) + 1;
        }

        [].splice.apply(this.items, [position, 0].concat(id));
        this._calculateHeightAndOffsets(true);
        if (renderUpdate) {
            this._viewChanged(true);
        }
    };

    /**
     * Remove an item from the list.
     * @param id
     */
    MegaDynamicList.prototype.remove = function(id, renderUpdate) {
        'use strict';
        if (renderUpdate !== false) {
            renderUpdate = true;
        }

        if (!Array.isArray(id)) {
            id = [id];
        }
        var position = this.items.indexOf(id[0]);
        this.items.splice(position, id.length);

        // Ensure that they are not currently rendered.
        for (var i =0; i < id.length; i++) {
            this._removeItemFromView(id[i]);
        }
        this._calculateHeightAndOffsets(true);
        if (renderUpdate) {
            this._viewChanged(true);
        }

    };

    /**
     * Remove an item from the view.
     * @param id
     * @private
     */
    MegaDynamicList.prototype._removeItemFromView = function(id) {
        'use strict';
        if (this._currentlyRendered[id]) {
            DOMUtils.removeNode(this._currentlyRendered[id]);
            delete this._currentlyRendered[id];
        }
    };

    /**
     * Destroy this instance.
     */
    MegaDynamicList.prototype.destroy = function() {
        'use strict';
        this._unbindEvents();
        this.items = [];
        this._wasRendered = false;
        Ps.destroy(this.listContainer);
        DOMUtils.removeNode(this.content);
        this.$listContainer.html("");
        this.$content = this.content = undefined;
    };

    /**
     * Should be triggered when the list is no longer in view.
     */
    MegaDynamicList.prototype.pause = function() {
        'use strict';
        this.active = false;
        this._state = this._calculated;
        this._unbindEvents();
        Ps.destroy(this.listContainer);
        var currentlyRenderedKeys = Object.keys(this._currentlyRendered);
        for (var i = 0; i < currentlyRenderedKeys.length; i++) {
            this._removeItemFromView(currentlyRenderedKeys[i]);
        }
    };

    /**
     * Resume state, should be called when the list is brought back into view.
     */
    MegaDynamicList.prototype.resume = function() {
        'use strict';
        this.active = true;
        this._wasRendered = false;
        this.initialRender();
    };

    /**
     * Returns the current top position of the scrollable area
     *
     * @returns {number|*|Number|undefined}
     */
    MegaDynamicList.prototype.getScrollTop = function() {
        return this.listContainer.scrollTop;
    };

    MegaDynamicList.prototype.getFirstItemPosition = function() {
        'use strict';
        return this._calculated['firstItemPos'];
    };

    MegaDynamicList.prototype.scrollToItemPosition = function(position) {
        'use strict';
        this.listContainer.scrollTop = this._offsets[this.items[position]] + (this.options.viewPortBuffer * 2);
        this._viewChanged(true);
    };

    MegaDynamicList.prototype.scrollToYPosition = function(value) {

        'use strict';

        this.listContainer.scrollTop = value;
        this._viewChanged(true);
    }

    scope.MegaDynamicList = MegaDynamicList;
})(window, jQuery);
