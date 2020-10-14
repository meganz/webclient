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
    this._$titleTemplate = this.getTemplate("title-template");

    this.currentLimit = false;
    this.currentUntil = false;
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
    this._expandedStates = {};

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

    // Init Dependencies
    M.initShortcutsAndSelection(this.$container);

    // Default click handlers
    this.$container.rebind("click contextmenu", function(e) {
        $.hideContextMenu(e);
        self.markSelected();
        selectionManager.clear_selection();
        return false;
    });
}

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
    $('.fm-right-files-block, .fm-left-panel, .fm-transfers-block').addClass('hidden');
    $('.top-head').find(".recents-tab-link").removeClass("hidden").addClass('active');
    this.$container.removeClass('hidden');
    M.viewmode = 1;
    M.v = this._view;
    if (!this._rendered) {
        loadingDialog.show();
    }
    this.currentLimit = limit || this._defaultRangeLimit;
    this.currentUntil = until || this._defaultRangeTimestamp;

    if (M.megaRender) {
        // Cleanup background nodes
        M.megaRender.cleanupLayout(false, M.v);
    }

    if (this._dynamicList && !this._dynamicList.active) {
        this._dynamicList.resume();
    }

    selectionManager.clear_selection();
    this.clearSelected();

    M.getRecentActionsList(this.currentLimit, this.currentUntil).then(function(actions) {
        self.getMaxFitOnScreen(true);
        console.time('recents:render');
        self._injectDates(actions);
        if (!self._rendered || !self._dynamicList || forceInit) {
            self._initialRender(actions);
        } else {
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
    if (actions.length === 0) {
        this.recentActions = actions;
        this._view = [];
        M.v = this._view;
        this.$noContent.removeClass('hidden');
        this.$content.addClass('hidden');
    } else {
        self.$noContent.addClass('hidden');
        this.recentActions = actions;
        if (this._rendered) {
            this._dynamicList.destroy();
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
                'handlers': ['click-rail', 'drag-scrollbar', 'wheel', 'touch'],
                'minScrollbarLength': 20
            }
        });

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
    var h;
    if (this._childIds[id]) {
        h = 49;
    } else if (this._renderCache[id]) {
        h = this._renderCache[id].offsetHeight;
    } else {
        var a = this.actionIdMap[id];
        if (a.type === "date") {
            h = 62;
        } else if (a.type === "media" && a.length > this.getMaxFitOnScreen()) {
            h = 254;
        } else if (a.type === "media" && a.length > 1) {
            h = 219;
        } else if (a.length > 1) {
            h = 66;
        } else {
            h = 49;
        }

    }
    return h;
};

RecentsRender.prototype._onNodeInjected = function() {
    'use strict';
    delay('recentsThumbnails', function() {
        fm_thumbnails();
    }, 75);
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
RecentsRender.prototype.markSelected = function () {
    'use strict';
    this.clearSelected();
    this.appendSelected.apply(this, arguments);
};

RecentsRender.prototype.appendSelected = function() {
    'use strict';
    for (var i = 0; i < arguments.length; i++) {
        $(arguments[i]).addClass('ui-selected');
    }
};

RecentsRender.prototype.clearSelected = function() {
    'use strict';
    this.$container.find('.ui-selected').removeClass('ui-selected');
};

/**
 * Generate a breadcrumb based off array of partPart (or node) objects.
 * @param $container
 * @param action
 */
RecentsRender.prototype.populateBreadCrumb = function($container, action) {
    'use strict';
    var self = this;
    var newBreadCrumb = function(node) {
        var $breadCrumb = $('<span/>');
        $breadCrumb
            .attr('id', node.h)
            .text(node.name)
            .rebind('click dblclick', function () {
                M.openFolder(node.h);
                return false;
            })
            .rebind("contextmenu", function(e) {
                self.markSelected($breadCrumb, $breadCrumb.closest('.content-row'));
                selectionManager.clear_selection();
                selectionManager.add_to_selection(node.h);
                $.hideTopMenu();
                return M.contextMenuUI(e, 1) ? true : false;
            });
        return $breadCrumb;
    };

    if (!action || !Array.isArray(action.path) || !action.path.length) {
        // FIXME: check out where this does originates...
        console.warn('Invalid parameters, cannot render breadcrumb...', action);
        return;
    }

    for (var k = action.path.length - 1; k >= 1; k--) {
        $container.append(newBreadCrumb(action.path[k]));
        $container.append('<i class=" tiny-icon icons-sprite grey-arrow"></i>');
    }
    $container.append(newBreadCrumb(action.path[0]));

};

/**
 * Populate, enable and attach event listeners to the `by <name>` parts of the template.
 * @param $newRow
 * @param action
 */
RecentsRender.prototype.handleByUserHandle = function($newRow, action) {
    'use strict';
    var self = this;
    var user = M.getUserByHandle(action.user);
    var $userNameContainer = $newRow.find(".file-name .action-user-name");

    $userNameContainer
        .removeClass("hidden")
        .text(M.getNameByHandle(action.user) || l[24061])

    if (!user.h) {
        // unknown/deleted contact, no business here...
        return;
    }
    $userNameContainer
        .attr('id', user.h)
        .rebind("contextmenu", function(e) {
            self.markSelected($userNameContainer, $newRow);
            selectionManager.clear_selection();
            selectionManager.add_to_selection(user.h);
            $.hideTopMenu();
            return M.contextMenuUI(e, 1) ? true : false;
        })
        .rebind("click", function(e) {
            $userNameContainer.trigger({
                type: 'contextmenu',
                originalEvent: e.originalEvent
            });
            return false;
        })
        .rebind("dblclick", function() {
            if (user.h) {
                M.openFolder(user.h);
            }
            return false;
        });
};

/**
 * Handle In/Out share actions for a new row
 * @param $newRow
 * @param action
 */
RecentsRender.prototype.handleInOutShareState = function($newRow, action) {
    'use strict';

    $newRow.find(".transfer-filetype-icon")
        .removeClass('hidden')
        .addClass(action.outshare ? "folder-shared" : "inbound-share");
    $newRow.find(".in-out-tooltip span")
        .text(action.outshare ? l[5543] : l[5542]);
};

/**
 * Get the max number of image thumbs that will fit on the screen horizontally.
 * @param force Calulation is cached, use this to force recalculate.
 * @returns {int}
 */
RecentsRender.prototype.getMaxFitOnScreen = function(force) {
    'use strict';
    if (!this._maxFitOnScreen || force) {
        this._maxFitOnScreen = Math.ceil(this.$container.width() / 170) || 2;
    }
    return this._maxFitOnScreen;
};

/**
 * Generate a new action row.
 * @param action
 * @param actionId
 * @returns {*|Autolinker.HtmlTag}
 */
RecentsRender.prototype.generateRow = function (action, actionId) {
    'use strict';

    var self = this;

    // Get correct template.
    var $newRow;
    if (action.type === "media" && action.length > 1) {
        $newRow = self.getTemplate("images-content-row-template").removeClass("template");
    } else {
        $newRow = self.getTemplate("content-row-template").removeClass("template");
    }

    // Attach unique class & data attributes for this action.
    if (actionId !== undefined) {
        $newRow.addClass("action-" + actionId).data("action", actionId);
    }

    // Populate breadcrumb path
    this.populateBreadCrumb($newRow.find(".breadcrumbs"), action);

    // Render the date/time views.
    var date = new Date(action.ts * 1000 || 0);
    $newRow.find(".file-data .time").text(this._shortTimeFormatter.format(date));
    $newRow.find(".file-data .uploaded-on-message.dark-direct-tooltip span").text(
        (action.action !== "added" ? l[19942] : l[19941])
            .replace('%1', acc_time2date(action.ts, true))
            .replace('%2', this._fullTimeFormatter.format(date))
    );

    // Render in/out share icons.
    if (action.outshare || action.inshare) {
        self.handleInOutShareState($newRow, action);
    }

    // Show correct icon for action.
    if (action.action !== 'added') {
        $newRow.find(".action-icon.tiny-icon").removeClass("top-arrow").addClass("refresh");
    }

    if (action.type === "media" && action.length > 1) {
        this._renderMedia($newRow, action, actionId);
    } else {
        $newRow.attr('id', action[0].h);
        this._renderFiles($newRow, action, actionId);
    }

    // Show by user if not current user.
    if (action.user !== u_handle) {
        self.handleByUserHandle($newRow, action);
    }
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
    var self = this;
    var isCreated = action.action === "added";
    var isOtherUser = action.user !== u_handle;
    var $icon = $(".medium-file-icon", $newRow);
    var iconClass = fileIcon(action[0]);

    // handle icon
    $icon.addClass(iconClass);

    if (action.length === 1 && (iconClass === 'image' && is_image2(action[0]) ||
        iconClass === 'video' && is_video(action[0]) || iconClass === 'pdf')) {

        $icon.addClass('thumb').safeHTML('<img>');

        if (M.d[action[0].h]) {
            M.d[action[0].h].seen = true;
        }
        action[0].seen = true;

        if (iconClass === 'video') {
            $icon.safeAppend(
                '<div class="video-thumb-details">' +
                    '<i class="small-icon small-play-icon"></i>' +
                '</div>');
        }
    }

    // handle filename.
    var $fileName = $newRow.find(".file-name");
    var titleString;
    var isMore = action.length > 1;
    if (isOtherUser) {
        if (isCreated) {
            if (isMore) {
                titleString = l[19936];
            } else {
                titleString = l[19937];
            }
        } else {
            if (isMore) {
                titleString = l[19939];
            } else {
                titleString = l[19940];
            }
        }
    } else {
        if (isMore) {
            titleString = l[19938];
        } else {
            titleString = '%1';
        }
    }

    titleString = titleString
        .replace("%1", '<span class="link title first-node-name"></span>')
        .replace("%2", action.length - 1)
        .replace("%3", '<span class="link action-user-name"></span>')
        .replace("[A]", '<span class="link more-less-toggle">')
        .replace("[/A]", '<i class="small-icon icons-sprite gray-arrow"></i></span>');

    $fileName.safeHTML(titleString);

    var $fileNameContainer = $fileName.find(".title");
    $fileNameContainer
        .text(action[0].name)
        .attr('id', action[0].h)
        .rebind('click', function(e) {
            self.markSelected();
            $.hideContextMenu();
            if (is_image(action[0]) || is_video(action[0]) === 1) {
                if (is_video(action[0])) {
                    $.autoplay = action[0].h;
                }
                slideshow(action[0].h);
            } else {
                $fileNameContainer.trigger({
                    type: 'contextmenu',
                    originalEvent: e.originalEvent
                });
            }
            return false;
        });

    // If more than 1 file in action.
    if (isMore) {
        action.createEmptyClone = function() {
            var clone = [];
            clone.action = this.action;
            clone.ts = this.ts;
            clone.date = this.date;
            clone.path = this.path;
            clone.user = this.user;
            clone.recent = this.recent;
            if (this.inshare) {
                clone.inshare = this.inshare;
            }
            if (this.outshare) {
                clone.outshare = this.outshare;
            }
            return clone;
        };

        var $moreLessToggle = $fileName.find(".more-less-toggle");
        var expandedIds = [];

        // Use a render function to delay the rendering of a child node till it is in view.
        var generateRenderFunction = function (i, id) {
            return function () {
                if (!self._renderCache[id]) {
                    var nodeAction = action.createEmptyClone();
                    var node = action[i];
                    nodeAction.ts = node.ts;
                    nodeAction.push(node);
                    var $newChildAction = self.generateRow(nodeAction);
                    $newChildAction.addClass("action-" + actionId + "-child");
                    if (i === action.length - 1) {
                        $newChildAction.addClass('last-child');
                    }
                    self._renderCache[id] = $newChildAction[0];
                }
                return self._renderCache[id];
            };
        };

        var expandCollapseHelper = function() {
            self.markSelected();
            $.hideContextMenu();
            if ($moreLessToggle.hasClass('less')) {
                self._expandedStates[actionId] = false;
                $newRow.removeClass('expanded').addClass("collapsed");
                $moreLessToggle.removeClass("less").addClass("more");
                self._dynamicList.remove(expandedIds, false);
                self._dynamicList.itemRenderChanged(actionId);
                delete self._actionChildren[actionId];
                expandedIds = [];
            } else {
                // Render new action views.
                self._expandedStates[actionId] = true;
                $newRow.removeClass("collapsed").addClass("expanded");
                expandedIds = [];
                for (var i = 1; i < action.length; i++) {
                    var id = actionId + ":" + i;
                    self._nodeRenderedItemIdMap[action[i].h] = id;
                    self._renderFunctions[id] = generateRenderFunction(i, id);
                    self._childIds[id] = true;
                    expandedIds.push(id);
                }
                $moreLessToggle.removeClass("more").addClass("less");
                self._dynamicList.insert(actionId, expandedIds, false);
                self._dynamicList.itemRenderChanged(actionId);
                self._actionChildren[actionId] = expandedIds;
            }
        };

        $moreLessToggle.rebind('click', function() {
                expandCollapseHelper();
                return false;
            })
            .rebind("dblclick", function() {
            return false;
        });

        $newRow.removeClass("single").addClass("group collapsed");
    }

    $newRow
        .rebind("contextmenu", function(e) {
            if (selectionManager.selected_list.indexOf(action[0].h) === -1) {
                selectionManager.clear_selection();
                selectionManager.add_to_selection(action[0].h);
                self.markSelected($newRow);
            }
            return M.contextMenuUI(e, 1) ? true : false;
        })
        .rebind('click', function(e) {
            return self._handleSelectionClick(e, action[0].h, $newRow);
        });

    var $contextMenuButton = $newRow.find(".context-menu-button");
    $contextMenuButton
        .attr('id', action[0].h)
        .rebind("click", function (e) {
            $contextMenuButton.trigger({
                type: 'contextmenu',
                originalEvent: e.originalEvent
            });
            return false;
        })
        .rebind("dblclick", function() {
            return false;
        })
        .rebind("contextmenu", function(e) {
            self.markSelected($newRow);
            selectionManager.clear_selection();
            selectionManager.add_to_selection(action[0].h);
            $.hideTopMenu();
            return M.contextMenuUI(e, 1) ? true : false;
        });
};

/**
 * Render Media Block
 * @param $newRow
 * @param action
 * @private
 */
RecentsRender.prototype._renderMedia = function($newRow, action, actionId) {
    'use strict';
    var self = this;
    var isCreated = action.action === "added";
    var isOtherUser = action.user !== u_handle;
    var $previewBody = $newRow.find(".previews-body");
    var $thumbTemplate = $previewBody.find(".data-block-view.template");
    var maxFitOnScreen = self.getMaxFitOnScreen();
    var imagesToRender = action.length;

    // Maintain the index of images that we have rendered.
    var renderedIndex = 0;
    var renderedThumbs = [];
    var mediaCounts = self._countMedia(action);
    var videos = mediaCounts.videos;
    var images = mediaCounts.images;
    var pdfs = mediaCounts.pdfs;

    // Create & append new image container, fire async method to collect thumbnail.
    var renderThumb = function(i) {
        return new Promise(function (resolve) {
            var $newThumb = $thumbTemplate.clone().removeClass("template");
            var node = action[i];
            $newThumb
                .attr('id', node.h)
                .attr('title', node.name)
                .rebind('dblclick', function() {
                    self.markSelected();
                    $.hideContextMenu();
                    slideshow(node.h);
                    $.autoplay = node.h;
                    return false;
                })
                .rebind('click', function (e) {
                    return self._handleSelectionClick(e, node.h, [$newThumb, $newRow]);
                })
                .rebind('contextmenu', function(e) {
                    if (selectionManager.selected_list.indexOf(node.h) === -1) {
                        selectionManager.clear_selection();
                        self.clearSelected();
                    }
                    self.appendSelected($newThumb, $newRow);
                    selectionManager.add_to_selection(node.h);
                    $.hideTopMenu();
                    return M.contextMenuUI(e, 1) ? true : false;
                });

            if (M.d[node.h]) {
                M.d[node.h].seen = true;

                if (M.d[node.h].shares && M.d[node.h].shares.EXP) {
                    $newThumb.addClass('linked');
                }
            }

            if (!node.t && node.tvf) {
                $newThumb.addClass('versioning');
            }
            node.seen = true;

            if (is_video(node)) {
                $newThumb.find(".block-view-file-type").removeClass("image").addClass("video");
                $newThumb.find(".data-block-bg").addClass("video");
                node = MediaAttribute(node, node.k);
                if (node && node.data && node.data.playtime) {
                    $newThumb.find('.video-thumb-details span').text(secondsToTimeShort(node.data.playtime));
                }
            }
            else if (fileIcon(node) === 'pdf') {
                $(".block-view-file-type", $newThumb).removeClass("image").addClass("pdf");
            }

            var $contextMenuHandle = $newThumb.find(".file-settings-icon");
            $contextMenuHandle
                .attr('id', node.h)
                .rebind("contextmenu", function(e) {
                    self.markSelected($newThumb, $newRow);
                    selectionManager.clear_selection();
                    selectionManager.add_to_selection(node.h);
                    $.hideTopMenu();
                    return M.contextMenuUI(e, 1) ? true : false;
                })
                .rebind('click', function(e) {
                    $contextMenuHandle.trigger({
                        type: 'contextmenu',
                        originalEvent: e.originalEvent
                    });
                });

            $previewBody.append($newThumb);
            renderedThumbs[i] = $newThumb;
            resolve($newThumb);
        });
    };

    var $toggleExpandedButton = $newRow.find(".toggle-expanded-state");
    var $toggleExpandedButtonText = $toggleExpandedButton.find("span");
    var $toggleExpandedButtonIcon = $toggleExpandedButton.find("i");

    var $previewsScroll = $newRow.find(".previews-scroll");

    // If there are more images than we can fit onto the initial screen size.
    if (action.length >= maxFitOnScreen) {
        imagesToRender = maxFitOnScreen;
        $toggleExpandedButton.removeClass('hidden');
    }

    var toggleOpenState = function() {
        if ($previewsScroll.hasClass('expanded')) {
            self._expandedStates[actionId] = false;
            $previewsScroll.removeClass('expanded');
            $toggleExpandedButtonText.text(l[19797]);
            $toggleExpandedButtonIcon.removeClass("bold-crossed-eye").addClass("bold-eye");
            // Mark thumbs that are no longer viewable as hidden.
            for (var i = maxFitOnScreen; i < renderedIndex; i++) {
                if (renderedThumbs[i]) {
                    renderedThumbs[i].addClass('hidden');
                }
            }

        } else {
            if (action.length >= maxFitOnScreen) {
                self._expandedStates[actionId] = true;
                $previewsScroll.addClass('expanded');
                $toggleExpandedButtonText.text(l[19963]);
                $toggleExpandedButtonIcon.removeClass("bold-eye").addClass("bold-crossed-eye");
                $previewsScroll.children().removeClass('hidden');
                // Inject the rest of the images that were not loaded initially.
                for (;renderedIndex < action.length; renderedIndex++) {
                    renderThumb(renderedIndex);
                }
                fm_thumbnails();
            }
        }
        self._dynamicList.itemRenderChanged(actionId);
        return false;
    };

    $toggleExpandedButton.rebind('click', function() {
        toggleOpenState();
        return false;
    });

    // render inital image containers.
    for (renderedIndex = 0; renderedIndex < imagesToRender; renderedIndex++) {
        renderThumb(renderedIndex);
    }

    // Set title based on content.
    var $title = $newRow.find(".file-name");
    var $titleString;

    var makeTitle = function() {

        var numOfFiles = images + videos + pdfs;
        var currentStringSet = [l[7470].replace('%d', '%1'), l[24059], l[24060]];

        if (isOtherUser) {
            if (isCreated) {
                $titleString = currentStringSet[1];
            } else {
                $titleString = currentStringSet[2];
            }
            $titleString = $titleString
                .replace("%3", '<span class="link action-user-name"></span>')
                .replace("[A]", '<span class="link title">')
                .replace("[/A]", '</span>');
        } else {
            $titleString = '<span class="link title">' + currentStringSet[0] + '</span>';
        }
        return $titleString.replace("%1", numOfFiles);
    };

    $titleString = makeTitle();
    $title.safeHTML($titleString);

    // Attach title click to open folder.
    $title.find("span.title").on('click', function() {
            toggleOpenState();
            return false;
        })
        .rebind("dblclick", function() {
            return false;
        });

    // Set the media block icons according to media content.
    var $rearIcon = $newRow.find(".medium-file-icon.double");
    var $frontIcon = $newRow.find(".medium-file-icon.double .medium-file-icon");
    if (images === 0) {
        $frontIcon.removeClass("image").addClass("video");
    }

    if (videos === 0) {
        $frontIcon.removeClass('video').addClass('pdf');
    }
    else {
        $rearIcon.removeClass("image").addClass("video");
    }

    if (pdfs === 0) {
        $frontIcon.removeClass('pdf').addClass('image');
    }
    else {
        $rearIcon.removeClass("image").addClass("pdf");
    }

    // Attach resize listener to the image block.
    self._resizeListeners.push(function() {
        var newMax = self.getMaxFitOnScreen();

        // Render new more images if we can now fit more on the screen.
        if (newMax > maxFitOnScreen) {
            for (; renderedIndex < newMax && renderedIndex < action.length; renderedIndex++) {
                renderThumb(renderedIndex);
            }
        }
        maxFitOnScreen = newMax;

        // Enable/disable showall button if resize makes appropriate.
        if (newMax < action.length && !$previewsScroll.hasClass('.expanded')) {
            $toggleExpandedButton.removeClass("hidden");
        } else if (newMax > action.length) {
            $toggleExpandedButton.addClass("hidden");
        }
    });

    $newRow.rebind("contextmenu", function(e) {
        self.markSelected($newRow);
        selectionManager.clear_selection();
        for (var i = 0; i < action.length; i++) {
            selectionManager.add_to_selection(action[i].h);
        }
        $.hideTopMenu();
        return M.contextMenuUI(e, 3) ? true : false;
    });

    var $contextMenuButton = $newRow.find(".context-menu-button");
    $contextMenuButton
        .rebind("click", function (e) {
            $contextMenuButton.trigger({
                type: 'contextmenu',
                originalEvent: e.originalEvent
            });
            return false;
        })
        .rebind("dblclick", function() {
            return false;
        })
        .rebind("contextmenu", function(e) {
            self.markSelected($newRow);
            selectionManager.clear_selection();
            for (var i = 0; i < action.length; i++) {
                selectionManager.add_to_selection(action[i].h);
            }
            $.hideTopMenu();
            return M.contextMenuUI(e, 3) ? true : false;
        });

    // Remove the template that we no longer need.
    $thumbTemplate.remove();
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
 * Generate count of images/videos in action block.
 * @param action
 * @private
 */
RecentsRender.prototype._countMedia = function(action) {
    'use strict';
    var counts = {
        images: 0,
        videos: 0,
        pdfs: 0
    };

    for (var idx = action.length; idx--;) {
        var n = action[idx];

        if (is_video(n)) {
            counts.videos++;
        }
        else if (is_image3(n)) {
            counts.images++;
        }
        else if (fileIcon(n) === 'pdf') {
            counts.pdfs++;
        }
        else if (d) {
            console.warn('What is this?...', n);
        }
    }
    return counts;
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
    $.hideContextMenu();
    notify.closePopup();
};

/**
 * Helper function to add items to the selection based on common key shortcuts.
 * @param e
 * @param handle
 * @param $element
 * @returns boolean
 * @private
 */
RecentsRender.prototype._handleSelectionClick = function(e, handle, $element) {
    'use strict';
    $.hideContextMenu();
    if (e.ctrlKey !== false || e.metaKey !== false) {
        this.appendSelected.apply(this, $element);
        selectionManager.add_to_selection(handle);
    }
    else {
        this.markSelected.apply(this, $element);
        selectionManager.clear_selection();
        selectionManager.add_to_selection(handle);
    }
    return false;
};

/**
 * Trigger for when a single node gets changes (renamed, etc).
 * This will attempt to re-redner the action that houses the node.
 * For large changes, like moving the file, the RecentsRender.updateState() should be called instead.
 *
 * @param handle
 */
RecentsRender.prototype.nodeChanged = function(handle) {
    'use strict';
    if (handle && M.d[handle] && this._nodeActionMap[handle] && this._dynamicList) {
        var actionId = this._nodeActionMap[handle];
        var action = this.actionIdMap[actionId];
        if (action) {
            var renderedItemId = this._nodeRenderedItemIdMap[handle] || actionId;
            // Remove any cached rendering.
            if (this._renderCache[renderedItemId]) {
                delete this._renderCache[renderedItemId];
            }

            var i;
            // Get the new node state.
            var currentNode = M.d[handle];
            currentNode.recent = true;
            delete currentNode.ar;

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
