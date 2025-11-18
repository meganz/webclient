/* exported openRecents */
/* exported renderRecents */

/**
 * Trigger open recents with all default values.
 * (Ignore any passed arguments).
 *
 */
function openRecents() {
    'use strict';
    renderRecents();
}

/**
 * Render recents interface.
 * @param limit Node Limit
 * @param until Unix timestamp until.
 */
function renderRecents(limit, until) {
    'use strict';
    console.log("renderRecents:", limit, until);
    if (!M.recentsRender) {
        M.recentsRender = new RecentsRender();
    }
    M.recentsRender.render(limit, until);
}

/**
 * Recents Render Controller.
 * @constructor
 */
function RecentsRender() {
    'use strict';
    this.$container = $(".fm-recents.container");
    this.container = this.$container[0];
    this.$scrollDiv = this.$container.find(".fm-recents.scroll");
    this.scrollDiv = this.$scrollDiv[0];
    this.$content = this.$container.find(".fm-recents.content");
    this.$noContent = this.$container.find(".fm-recents.no-content");
    this.$disabledContent = this.$container.find(".fm-recents.disabled-content");
    this.$buttonEnableRecents = this.$disabledContent.find("button");
    this._$titleTemplate = this.getTemplate("title-template");

    this.currentLimit = false;
    this.currentUntil = false;
    this._showRecents = this._getConfigShow();
    this._rendered = false;
    this._maxFitOnScreen = false;
    this._resizeListeners = [];

    this._renderCache = {};
    this._childIds = {};
    this._dynamicList = false;
    this._renderFunctions = {};
    this._view = [];
    this.recentActions = [];
    this.actionIdMap = {};
    this._shortTimeFormatter = new Intl.DateTimeFormat([], {
        hour: '2-digit',
        minute:'2-digit',
        hour12: false
    });
    this._fullTimeFormatter = new Intl.DateTimeFormat([], {
        hour: '2-digit',
        minute:'2-digit',
        second: '2-digit',
        hour12: false
    });
    this.isRtl = document.body.classList.contains('rtl');
    this._expandedStates = {};
    this.pathSeparatorClass = `sprite-fm-mono ${this.isRtl ? 'icon-arrow-left' : 'icon-arrow-right'}`;

    this._initScrollPosition = false;

    // Map all nodes -> action ids.
    this._nodeActionMap = {};

    // Maps nodes -> rendered item ids (only if different than action id).
    this._nodeRenderedItemIdMap = {};

    this._actionChildren = {};

    var recentsDays = parseInt(localStorage.recentsDays) || 90;
    var recentsNodeLimit = parseInt(localStorage.recentsNodeLimit) || 10000;

    this._defaultRangeTimestamp = Math.floor((Date.now() - recentsDays * 86400000) / 1000); // 90 days
    this._defaultRangeLimit = recentsNodeLimit;

    var self = this;

    /**
     * Object storing currently selected filters by the selected index
     * @type {Object.<String, [Number, Function]>}
     */
    this.selectedFilters = Object.create(null);

    // Default click handlers
    this.$container.rebind("click contextmenu", function(e) {
        $.hideTopMenu(e);
        $.hideContextMenu(e);
        self.markSelected();
        selectionManager.clear_selection();
        return false;
    });
}

RecentsRender.prototype.dropAllFilters = function() {
    'use strict';

    const buttons = [...$('button.fm-filter-chip-button', this.$container)];

    for (let i = buttons.length; i--;) {
        const btn = buttons[i];
        btn.classList.remove('selected');
        btn.querySelector('.fm-filter-chip-button-text').textContent = btn.dataset.label;
    }

    this.selectedFilters = Object.create(null);

    $('.fm-filter-reset', this.$container).remove();
};

/**
 * Selecting DOM chip and showing the reset button
 * @param {Number} index Index of the filter to work with
 * @param {String} label Label of the filter to replace the header to
 * @returns {void}
 */
RecentsRender.prototype.adjustFilterChip = function(index, label) {
    'use strict';

    const chips = $('.fm-filter-chips', this.$container);
    const chip = $(`button.fm-filter-chip-button:nth-child(${index + 1})`, chips);

    if (!chip.length) {
        return;
    }

    chip.addClass('selected');

    $('.fm-filter-chip-button-text', chip).text(label);

    if (!$('.fm-filter-reset', chips).length) {
        chips.safeAppend(`<button class="fm-filter-reset font-body-1">${l.filter_chip_reset}</button>`);
        const resetBtn = $('.fm-filter-reset', chips);

        resetBtn.rebind('click.recentsReset', () => {
            this.dropAllFilters();
            this.renderFiltered(M.recentActions);
            return false;
        });
    }
};

/**
 * Clearing the filter chip by index
 * @param {Number} index Index to use in Chips list
 * @returns {void}
 */
RecentsRender.prototype.clearFilterChip = function(index) {
    'use strict';

    const chips = $('.fm-filter-chips', this.$container);
    const chip = $(`button.fm-filter-chip-button:nth-child(${index + 1})`, chips);

    chip.removeClass('selected');
    $('.fm-filter-chip-button-text', chip).text(chip.data('label'));

    if (!$('button.fm-filter-chip-button.selected', chips).length) {
        $('.fm-filter-reset', chips).remove();
    }
};

/**
 * Rendering only the filtered actions if any
 * @param {Object.<String, any>[]} filtered Filtered actions
 * @returns {void}
 */
RecentsRender.prototype.renderFiltered = function(filtered) {
    'use strict';

    const container = document.querySelector('.fm-recents.container');
    const header = container.querySelector('.fm-recents.header-row');

    if (filtered.length) {
        mega.ui.empty.clear(container);
        if (header) {
            header.classList.remove('hidden');
        }
    }
    else if (this._rendered) {
        this.reset();

        if (header) {
            header.classList.add('hidden');
        }
    }

    this._initialRender(filtered);
};

/**
 * Setting filter chips in header
 * @param {Object.<String, any>[]} actions All actions to filter through
 * @returns {void}
 */
RecentsRender.prototype.setFilters = function(actions) {
    'use strict';

    const chips = $('.fm-filter-chips', this.$container);

    if (chips.children().length) {
        return;
    }

    const locStrings = [l[164], l[5542], l[5543]];
    const typeExStrings = [l.filter_chip_type_folder];

    if (u_attr.s4) {
        locStrings.push(l.obj_storage);
    }

    const allowedLocations = array.to.object(locStrings, true);
    const disallowedTypes = array.to.object(typeExStrings, true);

    const { filters } = mega.ui.mNodeFilter;
    const filterArr = [filters.location, filters.type, filters.dateadded];

    const filteredActions = () => {
        const arr = [];

        for (let i = M.recentActions.length; i--;) {
            const action = M.recentActions[i];

            if (action.type === 'date') {
                if (Array.isArray(arr[0])) {
                    arr.unshift(action);
                }
            }
            else if (action.length) {
                const filtered = action.filter((n) => {
                    const keys = Object.keys(this.selectedFilters);
                    for (let j = keys.length; j--;) {
                        if (!this.selectedFilters[keys[j]][1](n)) {
                            return false;
                        }
                    }

                    return true;
                });

                if (filtered.length) {
                    const keys = Object.keys(action).filter(isNaN);

                    for (let j = keys.length; j--;) {
                        filtered[keys[j]] = action[keys[j]];
                    }

                    arr.unshift(filtered);
                }
            }
        }

        return arr;
    };

    for (let i = 0; i < filterArr.length; i++) {
        const { title, menu, match } = filterArr[i];
        const txt = mCreateElement('div', { class: 'fm-filter-chip-button-text font-body-1' });
        txt.textContent = title;
        const chip = mCreateElement('button', { class: 'fm-filter-chip-button', 'data-label': title }, [
            txt,
            mCreateElement('i', { class: 'sprite-fm-mono icon-chevron-down-thin-outline' })
        ]);
        chip.addEventListener('click', () => {
            const { x, bottom, width } = chip.getBoundingClientRect();

            const subMenu = new MMenuSelect();
            subMenu.parentItem = { el: chip };

            let items = [...menu];

            if (!i) { // Stripping unneeded locations
                const tmp = [];

                for (let i = 0; i < items.length; i++) {
                    if (!allowedLocations[items[i].label]) {
                        continue;
                    }

                    tmp.push({ ...items[i], icon: undefined });
                }

                items = tmp;
            }
            else if (i === 1) { // Stripping unneded types
                items = items.filter(({ label }) => !disallowedTypes[label]);
            }

            subMenu.options = items.map(({ label, icon, data }, index) => {
                return {
                    label,
                    icon,
                    click: () => {
                        if (data) {
                            filterArr[i].selection = data;
                            this.selectedFilters[i] = [index, match.bind(filterArr[i])];
                            this.adjustFilterChip(i, label, actions);
                        }
                        else {
                            delete filterArr[i].selection;
                            delete this.selectedFilters[i];
                            this.clearFilterChip(i);
                        }

                        const filtered = filteredActions();
                        this.renderFiltered(filtered);
                    },
                    selected: (!!this.selectedFilters[i] && this.selectedFilters[i][0] === index)
                        || (!data && !this.selectedFilters[i]),
                    checkFn() {
                        if (!this.checkEl) {
                            this.checkEl = document.createElement('i');
                            this.el.append(this.checkEl);
                            this.checkEl.className = 'sprite-fm-mono icon-check selected-mark';
                            this.el.classList.add('selected', 'hide-radio-on');
                        }

                    }
                };
            });

            subMenu.show(x + (this.isRtl ? width : 0), bottom + 2);
        });

        chips[0].appendChild(chip);
    }

    MegaButton.factory({
        parentNode: chips.parent()[0],
        icon: 'sprite-fm-mono icon-info-thin-outline cursor-pointer',
        componentClassname: 'transparent-icon text-icon secondary recents-info-btn',
        type: 'icon'
    }).on('click.recentsInfo', mega.ui.mInfoPanel.show);
};

/**
 * Trigger a render init or update.
 * @param limit
 * @param until
 */
RecentsRender.prototype.render = function(limit, until, forceInit) {
    'use strict';
    var self = this;

    if (M.currentdirid !== "recents") {
        return;
    }

    // Switch to recents panel.
    M.onSectionUIOpen('recents');
    $('.fmholder').removeClass("transfer-panel-opened");
    $('.fm-right-files-block').addClass('hidden');
    this.$container.removeClass('hidden');

    M.viewmode = 1;
    M.v = this._view;
    this.currentLimit = limit || this._defaultRangeLimit;
    this.currentUntil = until || this._defaultRangeTimestamp;

    if (M.megaRender) {
        // Cleanup background nodes
        M.megaRender.cleanupLayout(false, M.v);
    }

    if (this._dynamicList && !this._dynamicList.active) {
        this._dynamicList.resume();
    }

    if (!$.dialog) {
        selectionManager.clear_selection();
        this.clearSelected();
    }

    if (!this._showRecents) {
        return this._initialRender([]);
    }

    if (!this._rendered) {
        this.dropAllFilters();
        loadingDialog.show();
    }
    M.initShortcutsAndSelection(this.container);

    M.getRecentActionsList(this.currentLimit, this.currentUntil).then(function(actions) {
        self.getMaxFitOnScreen(true);
        console.time('recents:render');
        self._injectDates(actions);
        if (!self._rendered || !self._dynamicList || forceInit) {
            self._initialRender(actions);
        }
        else {
            self._updateState(actions);
        }
        loadingDialog.hide();
        console.timeEnd('recents:render');
    });
};

/**
 * Initialise the dynamicList and render the initial view.
 * If called after already initialized, will destroy previous instance and recreate.
 * @param actions
 * @private
 */
RecentsRender.prototype._initialRender = function(actions) {
    'use strict';

    var self = this;
    if (!this._showRecents) {
        this.recentActions = actions;
        this._view = [];
        M.v = this._view;
        this.$content.addClass('hidden');
        mega.ui.empty.recents(this.$container[0], 0);

        this.$buttonEnableRecents
            .rebind('click.enableRecents', () => this._setConfigShow(1));
    }
    else if (actions.length === 0) {
        this.recentActions = actions;
        this._view = [];
        M.v = this._view;
        this.$content.addClass('hidden');
        mega.ui.empty.recents(this.$container[0], Object.keys(this.selectedFilters).length > 0 ? 2 : 1);
    } else {
        mega.ui.empty.clear(this.$container[0]);
        this.$container.removeClass('emptied empty-filter');
        this.recentActions = actions;
        this.setFilters(actions);

        if (this._rendered) {
            this.reset();
        }
        this._dynamicList = new MegaDynamicList(this.scrollDiv, {
            'contentContainerClasses': 'fm-recents content',
            'initialScrollY': this._initScrollPosition,
            'itemRenderFunction': function(id) { return self._doRenderWorker(id); },
            'itemHeightCallback': function(id) { return self._getItemHeight(id); },
            'onNodeInjected': function() { return self._onNodeInjected(); },
            'onResize': function() { return self.thottledResize(); },
            'onScroll': function() { return self.onScroll(); },
            'perfectScrollOptions': {
                'handlers': ['click-rail', 'drag-thumb', 'wheel', 'touch'],
                'minScrollbarLength': 20
            },
            'viewPortBuffer': 50,
        });

        this._dynamicList.getItemHeight = function(position) {
            return this._heights[this.items[position]];
        };

        this._dynamicList.getItemOffsets = function(position) {
            return this._offsets[this.items[position]];
        };

        this._dynamicList.scrollToItemPosition = function(position, toBottom) {

            var newPosition = this._offsets[this.items[position]];

            if (toBottom) {
                newPosition += this.options.viewPortBuffer * 2;
                newPosition -= this._calculated.scrollHeight - this.getItemHeight(position);
            }
            else {
                newPosition -= this.options.viewPortBuffer * 2;
            }

            this.listContainer.scrollTop = newPosition;

            this._viewChanged(true);
        };

        if (!actions[0].id) {
            this._fillActionIds(actions);
        }

        this._view = [];
        var keys = [];
        for (var i = 0; i < actions.length; i++) {
            keys.push(actions[i].id);
            this.actionIdMap[actions[i].id] = actions[i];
            if (actions[i].length && actions[i].length > 0) {
                this._view = this._view.concat(actions[i]);
                this._populateNodeActionMap(actions[i]);
            }
        }

        M.v = this._view;
        this._dynamicList.batchAdd(keys);
        this._dynamicList.initialRender();
        this._rendered = true;
        this._initScrollPosition = false;
    }
    self.previousActionCount = actions.length;
    self.previousNodeCount = actions.nodeCount;
};

RecentsRender.prototype._doRenderWorker = function(id) {
    'use strict';

    if (!this._renderCache[id]) {
        if (this._renderFunctions[id]) {
            this._renderCache[id] = this._renderFunctions[id](id);
        } else {
            var action = this.actionIdMap[id];
            if (action.type === "date") {
                var $newTitleDiv = this._$titleTemplate.clone().removeClass("template title-template");
                $newTitleDiv.text(action.date);
                this._renderCache[id] = $newTitleDiv[0];
            } else {
                this._renderCache[id] = this.generateRow(action, id)[0];
            }
        }
    }
    return this._renderCache[id];
};

RecentsRender.prototype._getItemHeight = function(id) {
    'use strict';

    if (this._renderCache[id]) {
        return this._renderCache[id].offsetHeight;
    }

    return (this.actionIdMap[id] && this.actionIdMap[id].type === 'date') ? 57 : 48;
};

RecentsRender.prototype._onNodeInjected = function() {
    'use strict';
    delay('thumbnails', fm_thumbnails, 200);
};

/**
 * Inject the date titles into the actions array before passing to dynamicList.
 * @private
 */
RecentsRender.prototype._injectDates = function(actions) {
    'use strict';
    var lastSeenDate = false;
    for (var i = 0; i < actions.length; i++) {
        var action = actions[i];
        if (action.date !== lastSeenDate) {
            actions.splice(i, 0, {
                type: "date",
                date: action.date,
                ts: moment.unix(action.ts).endOf('day')._d.getTime() / 1000
            });
            lastSeenDate = action.date;
        }
    }
    return actions;
};


/**
 * Mark UI elements as selected.
 * Note: Call with no arguments to clear selection.
 */
RecentsRender.prototype.markSelected = function($elms) {

    'use strict';

    this.clearSelected();
    if ($elms) {
        $elms.addClass('ui-selected');
    }
};

RecentsRender.prototype.appendSelected = function($elms) {

    'use strict';

    $elms.addClass('ui-selected');
};

RecentsRender.prototype.clearSelected = function() {
    'use strict';
    this.$container.find('.ui-selected').removeClass('ui-selected');
};

RecentsRender.prototype.keySelectPrevNext = function(dir, shift) {

    'use strict';

    var $selectedAction = $('.MegaDynamicListItem.ui-selected', this.$container);
    var $selectedFile = $('.data-block-view.ui-selected', $selectedAction);

    if (!$selectedFile.length) {
        return false;
    }

    var $nextFileToSelect = $selectedFile[dir < 0 ? 'prev' : 'next']()[dir < 0 ? 'first' : 'last']();

    if ($nextFileToSelect.length) {

        var nextNodeId = $nextFileToSelect.prop('id');

        if (shift) {
            this.appendSelected($nextFileToSelect);
            if ($.selected && !$.selected.includes(nextNodeId)) {
                $.selected.push(nextNodeId);
            }
        }
        else {
            this.markSelected($nextFileToSelect.add($nextFileToSelect.parents('.MegaDynamicListItem')));
            $.selected = [nextNodeId];
        }
        mega.ui.mInfoPanel.reRenderIfVisible($.selected);
    }
};

RecentsRender.prototype.keySelectUpDown = function(dir, shift) {

    'use strict';

    var $selectedAction = $('.MegaDynamicListItem.ui-selected', this.$container);

    var _getNextToSelect = function() {

        var $action;

        if (dir < 0) {

            $action = $selectedAction.first().prev();
            $action = $action.hasClass('date') ? $action.prev() : $action;
        }
        else {
            $action = $selectedAction.last().next();
            $action = $action.hasClass('date') ? $action.next() : $action;
        }

        return $action;
    };

    var $nextActionToSelect = _getNextToSelect();

    if ($nextActionToSelect.hasClass('pre-pusher')) {

        var currentItemIndex = this._dynamicList.items.indexOf($selectedAction.data('action'));

        this._dynamicList.scrollToItemPosition(--currentItemIndex);
    }

    var nextID = $nextActionToSelect.prop('id');

    nextID = nextID || $('.data-block-view', $nextActionToSelect).first().prop('id');

    if (!nextID) {
        return false;
    }

    var $nextItem = $(`#${nextID}`);

    if (shift) {

        this.appendSelected($nextItem.add($nextActionToSelect));
        if ($.selected && !$.selected.includes(nextID)) {
            $.selected.push(nextID);
        }
    }
    else {
        this.markSelected($nextItem);

        if ($nextItem.hasClass('data-block-view')) {
            this.appendSelected($nextItem.parents('.MegaDynamicListItem'));
        }
        $.selected = [nextID];
    }
    mega.ui.mInfoPanel.reRenderIfVisible($.selected);

    var itemIndex = this._dynamicList.items.indexOf($nextActionToSelect.data('action'));

    if (dir < 0 && this._dynamicList.getScrollTop() >= this._dynamicList.getItemOffsets(itemIndex)) {
        this._dynamicList.scrollToItemPosition(itemIndex);
    }
    else if (dir > 0 && this._dynamicList.getScrollTop() + this._dynamicList.listContainer.offsetHeight <=
        this._dynamicList.getItemOffsets(itemIndex) + this._dynamicList.getItemHeight(itemIndex)) {
        this._dynamicList.scrollToItemPosition(itemIndex, true);
    }
};

/**
 * Populate, enable and attach event listeners to the `by <name>` parts of the template.
 * @param $newRow
 * @param action
 */
RecentsRender.prototype.handleByUserHandle = function($newRow, action) {
    'use strict';

    // If the user is not a contact, and the added node belongs in an inshare w/o full-access,
    // we show '[Node name] shared by [Sharer]'
    const useInshareUser =
        action.action === 'added'
        && !M.getNameByHandle(action.user)
        && action.su;

    const user = M.getUserByHandle(useInshareUser || action.user);
    const $userNameContainer = $('.action-user-name', $newRow);
    const username = M.getNameByHandle(useInshareUser || action.user) || l[24061];

    $userNameContainer
        .text(username);

    if (!user.h || isValidEmail(username) || username === l[24061]) {
        // unknown/deleted contact, no business here...
        return;
    }
    $userNameContainer
        .attr('id', user.h)
        .rebind('click.recentUser', () => {
            if (user.h) {
                mega.ui.flyout.showContactFlyout(user.h);
            }
            return false;
        });
};

/**
 * @param {Boolean} action Action to work with
 * @returns {Boolean}
 */
RecentsRender.prototype.hasMore = function(action) {
    'use strict';
    return !action.isChild && (action.path.length !== 1 || action.path[0].h !== M.RootID);
};

/**
 * Handle In/Out share actions for a new row
 * @param $newRow
 * @param action
 */
RecentsRender.prototype.getActionIcon = function(action) {
    'use strict';

    if (this.hasMore(action)) {
        if (action.outshare || action.inshare) {
            return 'folder-users';
        }
        if (action.path[0].h === M.CameraId) {
            return 'folder-camera-uploads';
        }
        if (action.path[0].h === M.cf.h) {
            return 'folder-chat';
        }
        if (action.path[1].s4Root) {
            return 'bucket';
        }
        if (mega.fileRequest && mega.fileRequest.publicFolderExists(action.path[0].h)) {
            return 'folder-public';
        }

        return 'folder';
    }

    return fileIcon(action[0]);
};

/**
 * Get the max number of image thumbs that will fit on the screen horizontally.
 * @param force Calulation is cached, use this to force recalculate.
 * @returns {int}
 */
RecentsRender.prototype.getMaxFitOnScreen = function(force) {
    'use strict';
    if (!this._maxFitOnScreen || force) {
        this._maxFitOnScreen = Math.floor((this.$container.width() - 114) / 130) || 2;
    }
    return this._maxFitOnScreen;
};

/**
 * Preparing an action string to show
 * @param {Object.<String, any>} action Action to work with
 * @returns {String}
 */
RecentsRender.prototype.getActionUserString = function(action) {
    'use strict';

    const isMore = this.hasMore(action);

    let str = '<span>';

    str += action.action === 'added'
        ? (isMore ? mega.icu.format(l.recents_added_count, action.length) : l.recent_added_by)
        : (isMore ? mega.icu.format(l.recents_modified_count, action.length) : l.recent_modified_by);

    str = str.replace("%1", '<a class="action-user-name underline text-color-primary-link"></a>');

    if (isMore) {
        const dot = '<span class="dot-separator">&nbsp;&#183;&nbsp;</span>';

        if (action.outshare) {
            str += `${dot}<span>${l.type_outshare}</span>`;
        }
        else if (action.inshare) {
            str += `${dot}<span>${l.type_inshare}</span>`;
        }
        else if (action.path[0].h === M.CameraId) {
            str += `${dot}<span>${l.sync_folder}</span>`;
        }
        else if (action.path[0].h === M.cf.h) {
            str += `${dot}<span>${l.chat_folder}</span>`;
        }
        else if (action.path[1].s4Root) {
            str += `${dot}<span>${l.s4_bucket_type}</span>`;
        }
        else if (mega.fileRequest && mega.fileRequest.publicFolderExists(action.path[0].h)) {
            str += `${dot}<span>${l.file_request}</span>`;
        }
    }

    return `${str}</span>`;
};

/**
 * Preparing a location string in the row
 * @param {jQuery} row Row to work with
 * @param {Object.<String, any>} action Action to work with
 * @returns {String}
 */
RecentsRender.prototype.setActionLocation = function(row, action) {
    'use strict';

    const { path, outshare, inshare, isChild } = action;

    if (!Array.isArray(path) || !path.length) {
        return;
    }

    if (isChild) {
        $('.file-location a', row).text('');
        return;
    }

    let parent = path[0];
    let pathArr = [];

    if (outshare) {
        parent = { name: l.type_outshare, h: 'out-shares' };
    }
    else if (inshare) {
        parent = path[1];
        pathArr = [...path.slice(1)];
    }
    else if (path.length > 1) {
        parent = path[1];

        pathArr = path;
        const { s4Root } = path[path.length - 2];
        const maxPathItems = 5 + (s4Root | 0);

        if (path.length > maxPathItems) {
            const skipNum = s4Root ? 2 : 1;
            pathArr = [...path.slice(1, maxPathItems - skipNum), { name: '...' }, path[path.length - skipNum]];
        }
        else {
            pathArr = path.slice(s4Root | 0, -1);
        }
    }

    const loc = $('.file-location a', row);

    loc.text(parent.name).rebind('click.recentLoc', () => {
        M.openFolder(parent.h);
        return false;
    });

    if (pathArr.length > 1 || (pathArr.length === 1 && pathArr[0].h !== path[0].h && pathArr[0].h !== parent.h)) {
        loc.attr(
            'data-simpletip',
            pathArr.reduceRight(
                (acc, { name }) => acc ? `${acc}[I class="${this.pathSeparatorClass}"][/I]${name}` : name,
                ''
            )
        );
    }
};

/**
 * Generate a new action row.
 * @param {Object.<String, any>} action Action to work with
 * @param {String|Number} actionId Action id to map to
 * @returns {*|Autolinker.HtmlTag}
 */
RecentsRender.prototype.generateRow = function(action, actionId) {
    'use strict';

    const $newRow = this.getTemplate('content-row-template').removeClass('template');

    // Attach unique class & data attributes for this action.
    if (actionId !== undefined) {
        $newRow.addClass(`action-${actionId}`).data('action', actionId);
    }

    $newRow.attr('id', this.hasMore(action) ? action.path[0].h : action[0].h);
    this._renderFiles($newRow, action, actionId);

    const actionEl = $('.file-action', $newRow);
    actionEl.safeAppend(this.getActionUserString(action));

    this.setActionLocation($newRow, action);

    if (action.user !== u_handle) {
        // Show by user if not current user
        this.handleByUserHandle($newRow, action);
    }
    else {
        $('.action-user-name', $newRow)
            .text(`${u_attr.fullname} (${l[8885]})`)
            .removeClass();
    }

    actionEl.addClass('simpletip').attr('data-simpletip', actionEl.text());

    return $newRow;
};

/**
 * Render Files Block
 * @param $newRow
 * @param action
 * @param actionId
 * @private
 */
RecentsRender.prototype._renderFiles = function($newRow, action, actionId) {
    'use strict';
    const emptyPixel = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E`;
    const $icon = $('.item-type-icon-90', $newRow);
    let iconClass = this.getActionIcon(action);

    // handle icon
    $icon.addClass(`${iconClass.includes('video') ? 'video ' : ''}icon-${iconClass}-90`);

    if (!Array.isArray(action.path) || !action.path.length) {
        // FIXME: check out where this does originates...
        console.warn('Invalid parameters, cannot render group...', action);
    }

    // handle filename.
    const $fileName = $('.file-name', $newRow);
    const isMore = this.hasMore(action);

    $fileName.safeHTML('<span class="link title first-node-name"></span>');

    let node = action[0];

    if (isMore) {
        node = action.path[0];
        iconClass = 'folder';
    }
    else if (
        iconClass === 'pdf'
        || iconClass === 'image' && is_image2(action[0])
        || iconClass === 'video' && is_video(action[0])
    ) {
        $icon.addClass('thumb').safeHTML(`<img src="${emptyPixel}" class="shimmer" />`);
        $('img', $icon).rebind('load.recentThumb', ({ target }) => {
            if (target.src !== emptyPixel) {
                target.classList.remove('shimmer');
            }
        });

        if (M.d[action[0].h]) {
            M.d[action[0].h].seen = true;
        }
        action[0].seen = true;

        if (iconClass === 'video') {
            $icon.safeAppend(
                '<div class="video-thumb-details theme-dark-forced">' +
                    '<i class="sprite-fm-mono icon-play"></i>' +
                '</div>');
        }
    }

    const $fileNameContainer = $('.title', $fileName);
    $fileNameContainer
        .text(node.name)
        .attr('id', node.h)
        .addClass('simpletip')
        .attr('data-simpletip', node.name);

    $newRow
        .rebind('click.recentNode', (e) => {
            $.hideContextMenu();

            if (!e.ctrlKey && !e.metaKey) {
                this.markSelected();
                selectionManager.clear_selection();
            }

            let ids = '';

            for (let i = action.length; i--;) {
                const { h } = action[i];
                selectionManager.add_to_selection(h);
                ids += `#${h},`;
            }

            $(ids.slice(0, -1), this.$container).addClass('ui-selected');

            return false;
        }).rebind('dblclick.recentNode', () => {
            this.markSelected();
            $.hideContextMenu();

            if (isMore) {
                M.openFolder(node.h);
            }
            else if (is_image(node)) {
                slideshow(node.h);
            }
            else if (is_video(node)) {
                $.autoplay = node.h;
                slideshow(node.h);
            }
            else if (is_text(node)) {
                loadingDialog.show();

                mega.fileTextEditor.getFile(node.h)
                    .then((data) => {
                        mega.textEditorUI.setupEditor(node.name, data, node.h);
                    })
                    .catch(dump)
                    .finally(() => {
                        loadingDialog.hide();
                    });
            }
            else {

            }
            return false;
        });

    let expandedIds = [];

    // Use a render function to delay the rendering of a child node till it is in view.
    const generateRenderFunction = (i, id) => {
        return () => {
            if (!this._renderCache[id]) {
                const nodeAction = action.createEmptyClone();
                const node = action[i];
                nodeAction.ts = node.ts;
                nodeAction.push(node);
                nodeAction.isChild = true;
                const $newChildAction = this.generateRow(nodeAction);
                $newChildAction.addClass(`action-${actionId}-child`);
                $newChildAction.addClass(i === action.length - 1 ? 'last-child' : 'child-note');
                this._renderCache[id] = $newChildAction[0];
            }
            return this._renderCache[id];
        };
    };

    const doExpand = () => {
        this._expandedStates[actionId] = true;
        $newRow.removeClass('collapsed').addClass('expanded');
        expandedIds = [];
        const toInsert = [];

        for (let i = 0; i < action.length; i++) {
            const id = `${actionId}:${i}`;
            this._nodeRenderedItemIdMap[action[i].h] = id;
            this._renderFunctions[id] = generateRenderFunction(i, id);

            if (!this._dynamicList.items.includes(id)) {
                toInsert.push(id);
            }

            this._childIds[id] = true;
            expandedIds.push(id);
        }
        if (toInsert.length) {
            // Insert new items only if they haven't already been inserted
            this._dynamicList.insert(actionId, toInsert, false);
        }
        this._actionChildren[actionId] = expandedIds;
    };

    const expandCollapseHelper = () => {
        this.markSelected();
        $.hideContextMenu();

        if ($newRow.hasClass('expanded')) {
            this._expandedStates[actionId] = false;
            $newRow.removeClass('expanded').addClass('collapsed');
            this._dynamicList.remove(expandedIds, false);
            this._dynamicList.itemRenderChanged(actionId);
            delete this._actionChildren[actionId];
            expandedIds = [];
        }
        else {
            doExpand();
            this._dynamicList.itemRenderChanged(actionId);
        }
    };

    // If more than 1 file in action.
    if (isMore) {
        action.createEmptyClone = function() {
            const clone = [];
            clone.action = this.action;
            clone.ts = this.ts;
            clone.date = this.date;
            clone.path = this.path;
            clone.user = this.user;
            clone.recent = this.recent;
            if (this.inshare) {
                clone.inshare = this.inshare;
                clone.su = this.su;
            }
            if (this.outshare) {
                clone.outshare = this.outshare;
            }
            return clone;
        };

        $('.expand-collapse-toggle, .more-less-toggle', $newRow)
            .rebind('click.recents', () => {
                expandCollapseHelper();
                return false;
            });

        $newRow.removeClass('single').addClass('group');

        if (node.lbl) {
            $newRow.addClass(`folder colour-label ${M.getLabelClassFromId(node.lbl)}`);
        }

        doExpand();
        delay('recent-render-resize', () => {
            this._dynamicList.resized();
        });
    }

    $newRow
        .rebind('contextmenu', (e) => {
            const selector = `.content-row#${action.map(({ h }) => h).join(',.content-row#')}`;
            const allChildrenSelected = isMore
                && $(selector, this.$container).filter('.ui-selected').length === action.length;

            if (!$.selected.includes(node.h) && !allChildrenSelected) {
                selectionManager.clear_selection();
                selectionManager.add_to_selection(node.h);
                this.markSelected($newRow);
            }

            return !!M.contextMenuUI(e, isMore ? 10 : 1);
        });

    const $contextMenuButton = $('.context-menu-button', $newRow);
    $contextMenuButton
        .attr('id', node.h)
        .rebind("click", function (e) {
            $newRow.trigger({
                type: 'contextmenu',
                originalEvent: e.originalEvent
            });
            return false;
        })
        .rebind("dblclick", function() {
            return false;
        })
        .rebind('contextmenu', (e) => {
            this.markSelected($newRow);
            selectionManager.clear_selection();
            selectionManager.add_to_selection(node.h);
            $.hideTopMenu();
            return M.contextMenuUI(e, 1) ? true : false;
        });

    if (mega.sensitives.isSensitive(node) && !mega.sensitives.isNormalNode(node)) {
        $newRow.addClass('is-sensitive');
    }
};

/**
 * Get a new instance of a template.
 * @param className
 * @returns {jQuery}
 */
RecentsRender.prototype.getTemplate = function(className) {
    'use strict';
    return this.$container.find(".template." + className).clone().removeClass(className);
};

/**
 * Reset internal variables before reiniting.
 */
RecentsRender.prototype.reset = function() {
    'use strict';
    var renderCacheIds = Object.keys(this._renderCache);
    for (var i = 0; i < renderCacheIds.length; i++) {
        var id = renderCacheIds[i];
        $(this._renderCache[id]).remove();
        delete this._renderCache[id];
    }
    this._rendered = false;
    this._resizeListeners = [];
    this._renderCache = {};
    this._childIds = {};
    this._renderFunctions = {};
    this._view = [];
    this._nodeActionMap = {};
    if (this._dynamicList) {
        this._dynamicList.destroy();
        this._dynamicList = false;
    }
};

/**
 * @returns {boolean} true if recents config has changed
 */
RecentsRender.prototype.hasConfigChanged = function() {
    'use strict';
    return this._showRecents !== this._getConfigShow();
};

/**
 * To be used on recents config change
 * @returns {void}
 */
RecentsRender.prototype.onConfigChange = function() {
    'use strict';
    this._showRecents = this._getConfigShow();

    if (!this._showRecents) {
        this.reset();
    }
};

/**
 * @returns {boolean} get show recents value from mega configuration
 */
RecentsRender.prototype._getConfigShow = function() {
    'use strict';
    return mega.config.get('showRecents');
};

/**
 * set show recents value in mega configuration
 * @param {boolean} val new value
 * @returns {void}
 */
RecentsRender.prototype._setConfigShow = function(val) {
    'use strict';
    mega.config.set('showRecents', val ? 1 : undefined);
    if (!val) {
        mega.ui.searchbar.recentlySearched.clear();
    }
    queueMicrotask(() => {
        this.checkStatusChange(1);
    });
};

/**
 * Check status change.
 */
RecentsRender.prototype.checkStatusChange = function(force) {
    'use strict';
    let res = false;

    if (force || this.hasConfigChanged()) {
        this.onConfigChange();

        res = page.includes('fm/recents');
        if (res++) {
            openRecents();
        }
    }

    return res;
};

/**
 * Cleanup function, should be triggered when moving to another section of the webclient.
 */
RecentsRender.prototype.cleanup = function() {
    'use strict';
    if (this._dynamicList && this._dynamicList.active) {
        this._dynamicList.pause();
    }
};

/**
 * Triggered on resize after a thottle control.
 * @private
 */
RecentsRender.prototype._onResize = function() {
    'use strict';
    this.getMaxFitOnScreen(true);
    if (d) {
        console.time("recents.resizeListeners");
    }
    for (var i = 0; i < this._resizeListeners.length; i++) {
        this._resizeListeners[i]();
    }
    fm_thumbnails();
    if (this._dynamicList && this._dynamicList.listContainer && this._dynamicList.listContainer.Ps) {
        this._dynamicList.listContainer.Ps.update();
    }
    if (d) {
        console.timeEnd("recents.resizeListeners");
    }
};

RecentsRender.prototype.thottledResize = function() {
    'use strict';
    var self = this;
    delay('recents.resizeListener', function() {
        self._onResize();
    }, 100);
};

/**
 * Triggered when the list scrolls.
 */
RecentsRender.prototype.onScroll = function() {
    'use strict';
    delay('recents:on-scroll', () => {
        delay('thumbnails', fm_thumbnails, 260);

        onIdle(() => {
            $.hideContextMenu();
            notify.closePopup();
        });
    }, 190);
};

/**
 * Trigger for when a single node gets changes (renamed, etc).
 * This will attempt to re-render the action that houses the node or the breadcrumb if its parent.
 * The parent/breadcrumb can change if its share status or name is changed
 * For large changes, like moving the file, the RecentsRender.updateState() should be called instead.
 *
 * @param handle
 */
RecentsRender.prototype.nodeChanged = function(handle) {
    'use strict';

    const currentNode = M.d[handle];

    if (!currentNode) {
        return;
    }

    if (currentNode.t) { // Updating parent for all actions
        this._updateParentFolder(currentNode);
    }
    else if (this._nodeActionMap[handle] && this._dynamicList) {
        var actionId = this._nodeActionMap[handle];
        var action = this.actionIdMap[actionId];
        if (action) {
            var renderedItemId = this._nodeRenderedItemIdMap[handle] || actionId;
            // Remove any cached rendering.
            if (this._renderCache[renderedItemId]) {
                delete this._renderCache[renderedItemId];
            }

            var i;

            // Update the internal list.
            for (i = 0; i < action.length; i++) {
                if (action[i].h === handle) {
                    action[i] = currentNode;
                    break;
                }
            }

            // Update the view.
            for (i = 0; i < this._view.length; i++) {
                if (this._view[i].h === handle) {
                    this._view[i] = currentNode;
                    break;
                }
            }
            M.v = this._view;

            if (!this._updateNodeName(currentNode)) {
                this._dynamicList.itemChanged(renderedItemId);
            }
        }
    } else if (this._dynamicList.active) {
        this.updateState();
    }
};

/**
 * Generate a unique id for this action based on its contents.
 * @param action
 * @private
 */
RecentsRender.prototype._generateId = function(action) {
    'use strict';
    var idString;
    if ($.isArray(action) && action.length > 0) {
        var handleAppend = function(summary, node) {
            return summary + node.h;
        };
        var pathString = action.path.reduce(handleAppend, "");
        idString = action.reduce(handleAppend, "recents_" + pathString);
    } else if (action.type === "date") {
        idString = "date_" + action.ts;
    }
    return fastHashFunction(idString);
};

/**
 * Generate IDS for all the actions provided.
 * @param actions
 * @private
 */
RecentsRender.prototype._fillActionIds = function(actions) {
    'use strict';
    for (var i = 0; i < actions.length; i++) {
        actions[i].id = this._generateId(actions[i]);
    }
};

/**
 * Update state with changes from new actions list.
 * Computes a diff against the current content to find actions that need to be inserted / removed and does so.
 * Will only re-render the actions that has been updated.
 *
 * @param actions
 * @private
 */
RecentsRender.prototype._updateState = function(actions) {
    'use strict';

    if (this.previousActionCount === 0 || actions.length === 0) {
        this.reset();

        this._initialRender(actions);
        return;
    }

    var removed = [];
    var added = [];
    var removedAsExpanded = [];
    var newActionIdMap = {};
    var i;
    var k;
    var action;
    var stateChanged = false;

    this._injectDates(actions);
    this._fillActionIds(actions);

    this._firstItemPosition = this._dynamicList.getFirstItemPosition();

    // Scan for added nodes
    for (i = 0; i < actions.length; i++) {
        action = actions[i];
        newActionIdMap[action.id] = action;
        if (this.actionIdMap[action.id] === undefined) {
            this.actionIdMap[action.id] = action;
            added.push(action);
            stateChanged = true;
        }
    }

    // Scan and remove nodes no longer present in newActions.
    for (i = 0; i < this.recentActions.length; i++) {
        action = this.recentActions[i];
        if (newActionIdMap[action.id] === undefined) {
            removed.push(action.id);
            delete this._renderCache[action.id];
            delete this._renderFunctions[action.id];
            delete this.actionIdMap[action.id];

            // If this is expaned action and it is about to removed, save states with ts.
            if (this._expandedStates[action.id]) {
                removedAsExpanded.push(action.ts);
            }

            this._dynamicList.remove(action.id);
            if (this._actionChildren[action.id]) {
                for (k = 0; k < this._actionChildren[action.id].length; k++) {
                    this._dynamicList.remove(this._actionChildren[action.id][k]);
                    delete this._renderCache[this._actionChildren[action.id][k]];
                    delete this._renderFunctions[this._actionChildren[action.id][k]];
                }
                delete this._actionChildren[action.id];
            }
            stateChanged = true;
        }
    }

    if (stateChanged) {
        this._applyStateChange(added, removed, removedAsExpanded);
    }
};

/**
 * Apply the state changes.
 * @param added
 * @param removed
 * @private
 */
RecentsRender.prototype._applyStateChange = function(added, removed, removedAsExpanded) {
    'use strict';
    var action;
    var i;
    var k;
    var after;
    var pos;
    // Make changes to internal list of recentActions.
    var actions = this.recentActions.filter(function(item) {
        return removed.indexOf(item.id) === -1;
    });

    // Inject new actions.
    var handled = 0;
    i = 0;

    var currentScrollTop = this._dynamicList.getScrollTop();

    var keepExpanded = function(id) {
        $('.toggle-expanded-state', '.action-' + id).trigger('click');
        this._dynamicList.scrollToYPosition(currentScrollTop);
    };

    while (i < actions.length && handled < added.length) {
        action = actions[i];
        if (added[handled].ts > action.ts) {
            pos = i;
            if (pos === 0) {
                after = null;
            } else {
                after = actions[pos - 1].id;
                if (this._actionChildren[after]) {
                    after = this._actionChildren[after][this._actionChildren[after].length - 1];
                }
            }
            actions.splice(pos, 0, added[handled]);
            this._populateNodeActionMap(added[handled]);
            this._dynamicList.insert(after, added[handled].id);

            if (removedAsExpanded.indexOf(added[handled].ts) > -1) {
                onIdle(keepExpanded.bind(this, added[handled].id));
            }

            handled++;
        }
        i++;
    }

    for (k = handled; k < added.length; k++ && i++) {
        pos = actions.length;
        if (pos === 0) {
            after = null;
        } else {
            after = actions[pos - 1].id;
            if (this._actionChildren[after]) {
                after = this._actionChildren[after][this._actionChildren[after].length - 1];
            }
        }
        actions.splice(pos, 0, added[handled]);
        this._populateNodeActionMap(added[handled]);
        this._dynamicList.insert(after, added[k].id);
    }

    if (removed.length > 0) {
        this._removeConsecutiveDates(actions);
    }

    if (this._firstItemPosition !== undefined) {
        this._dynamicList.scrollToItemPosition(this._firstItemPosition);
        delete this._firstItemPosition;
    }

    // Update M.v
    this._view = [];
    for (i = 0; i < actions.length; i++) {
        if ($.isArray(actions[i])) {
            Array.prototype.push.apply(this._view, actions[i]);
        }
    }
    this.recentActions = actions;
    M.v = this._view;
};

/**
 * Add action nodes to maps.
 * @param action
 * @private
 */
RecentsRender.prototype._populateNodeActionMap = function(action) {
    'use strict';
    if ($.isArray(action)) {
        for (var k = 0; k < action.length; k++) {
            this._nodeActionMap[action[k].h] = action.id;
        }
    }
};

/**
 * Remove consecutive dates from actions list.
 * @param actions
 * @private
 */
RecentsRender.prototype._removeConsecutiveDates = function(actions) {
    'use strict';
    // Remove duplicating dates.
    for (i = 0; i < actions.length; i++) {
        if (actions[i].type === "date" && i + 1 < actions.length && actions[i + 1].type === "date") {
            var id = actions[i].id;
            delete this._renderCache[id];
            delete this._renderFunctions[id];
            delete this.actionIdMap[id];
            this._dynamicList.remove(id);
            actions.splice(i, 1);
        }
    }
};

/**
 * Trigger when content changes while the recents page is open.
 * Thottles the _updateState function.
 */
RecentsRender.prototype.updateState = function() {
    'use strict';
    var self = this;
    delay('recents.updateState', function() {
        self.render();
    }, 500);
};

/**
 * Update the name of a rendered node.
 * @param node
 * @returns boolean if update was handled.
 * @private
 */
RecentsRender.prototype._updateNodeName = function(node) {
    'use strict';
    var $renderdItem = $("#" + node.h);
    if ($renderdItem.length > 0) {
        if ($renderdItem.hasClass("data-block-view")) {
            $renderdItem.attr('title', node.name);
            return true;
        }
        else if ($renderdItem.hasClass("content-row")) {
            $renderdItem.find(".first-node-name").text(node.name);
            return true;
        }
    }
    return false;
};

/**
 * Updating the cached values of the parent folder
 * @param {MegaNode} node Node to work with
 */
RecentsRender.prototype._updateParentFolder = function(node) {
    'use strict';

    const { h, name, lbl, sen } = node;
    const keys = Object.keys(this.actionIdMap);

    for (let i = keys.length; i--;) {
        const id = keys[i];
        const action = this.actionIdMap[id];

        if (!Array.isArray(action.path)) {
            continue;
        }

        for (let j = action.path.length; j--;) {
            if (action.path[j].h === h) {
                action.path[j].name = name;
                action.path[j].lbl = lbl;
                action.path[j].sen = sen;

                delete this._renderCache[id];
                break;
            }
        }
    }
};
