/**
 * buildtree
 *
 * Re-creates tree DOM elements in given order i.e. { ascending, descending }
 * for given parameters i.e. { name, [last interaction, status] },
 * Sorting for status and last interaction are available only for contacts.
 * @param {Object} n The ufs-like node.
 * @param {String} [dialog] dialog identifier or force rebuild constant.
 * @param {String} [stype] what to sort.
 * @param {Number} [sDeepIndex] Internal use
 * @returns {MegaPromise}
 */
MegaData.prototype.buildtree = function(n, dialog, stype, sDeepIndex) {
    'use strict'; /* jshint -W074, -W073 */

    if (!n) {
        console.error('Invalid node passed to M.buildtree');
        return false;
    }

    var folders = [];
    var _ts_l = (typeof treesearch !== 'undefined' && treesearch) ? treesearch.toLowerCase() : undefined;
    var _tf;
    var _a = 'treea_';
    var _li = 'treeli_';
    var _sub = 'treesub_';
    var rebuild = false;
    var curItemHandle;
    var buildnode;
    var containsc;
    var i;
    var node;
    var name;
    var html;
    var prefix;
    var inshares = n.h === 'shares';
    var expand = function(i, e) {
        if (i) {
            e.firstElementChild.classList.add('expanded');
        }
    };
    var labelhash = [];

    /*
     * XXX: Initially this function was designed to render new nodes only,
     * but due to a bug the entire tree was being rendered/created from
     * scratch every time. Trying to fix this now is a pain because a lot
     * of the New-design code was made with that bug in place and therefore
     * with the assumption the tree panels are recreated always.
     */

    if (dialog === this.buildtree.FORCE_REBUILD) {
        rebuild = true;
        dialog = undefined;
    }

    stype = stype || M.currentTreeType || "cloud-drive";
    if (!dialog || rebuild) { // dialog should not be filtered unless it is forced.
        _tf = M.filterTreePanel[stype + '-label'];
    }

    if (!sDeepIndex) {
        sDeepIndex = 0;

        if (d) {
            console.time('buildtree');
        }
    }
    if (n.h === M.RootID) {
        if (typeof dialog === 'undefined') {
            if (rebuild || $('.content-panel.cloud-drive ul').length === 0) {
                $('.content-panel.cloud-drive').html('<ul id="treesub_' + htmlentities(M.RootID) + '"></ul>');
            }
        }
        else {
            $('.' + dialog + ' .cloud-drive .dialog-content-block').html('<ul id="mctreesub_' + htmlentities(M.RootID) + '"></ul>');
        }
    }
    else if (inshares) {
        if (typeof dialog === 'undefined') {
            $('.content-panel.shared-with-me').html('<ul id="treesub_shares"></ul>');
        }
        else {
            $('.' + dialog + ' .shared-with-me .dialog-content-block').html('<ul id="mctreesub_shares"></ul>');
        }
        stype = "shared-with-me";
    }
    else if (n.h === M.InboxID) {
        if (typeof dialog === 'undefined') {
            $('.content-panel.inbox').html('<ul id="treesub_' + htmlentities(M.InboxID) + '"></ul>');
        }
        else {
            $('.' + dialog + ' .inbox .dialog-content-block').html('<ul id="mctreesub_' + htmlentities(M.InboxID) + '"></ul>');
        }
        stype = "inbox";
    }
    else if (n.h === M.RubbishID) {
        if (typeof dialog === 'undefined') {
            $('.content-panel.rubbish-bin').html('<ul id="treesub_' + htmlentities(M.RubbishID) + '"></ul>');
        }
        else {
            $('.' + dialog + ' .rubbish-bin .dialog-content-block').html('<ul id="mctreesub_' + htmlentities(M.RubbishID) + '"></ul>');
        }
        stype = "rubbish-bin";
    }
    else if (folderlink) {
        stype = "folder-link";
    }

    prefix = stype;
    // Detect copy and move dialogs, make sure that right DOMtree will be sorted.
    // copy and move dialogs have their own trees and sorting is done independently
    if (dialog) {
        if ($.copyDialog) {
            prefix = 'Copy' + stype;
        }
        else if ($.moveDialog) {
            prefix = 'Move' + stype;
        }
    }

    var btd = d > 1;
    if (btd) {
        console.group('BUILDTREE for "' + n.h + '"');
    }

    if (this.tree[n.h]) {
        var tree = this.tree[n.h];
        folders = obj_values(tree);

        if (inshares) {
            folders = folders
                .filter(function(n) {
                    return !M.d[n.p];
                });
        }

        if (btd) {
            console.debug('Building tree', folders.map(function(n) {
                return n.h
            }));
        }

        var sortDirection = is_mobile ? 1 : Object($.sortTreePanel[prefix]).dir;
        var sortFn = M.getSortByNameFn2(sortDirection);

        switch (Object($.sortTreePanel[prefix]).by) {
            case 'fav':
                sortFn = M.sortByFavFn(sortDirection);
                break;
            case 'created':
                sortFn = function(a, b) {
                    return (a.ts < b.ts ? -1 : 1) * sortDirection;
                };
                break;
            case 'label':
                sortFn = M.sortByLabelFn(sortDirection, true);
                break;
        }

        folders.sort(sortFn);

        // In case of copy and move dialogs
        if (typeof dialog !== 'undefined') {
            _a = 'mctreea_';
            _li = 'mctreeli_';
            _sub = 'mctreesub_';
        }

        if (folders.length && (node = document.getElementById(_a + n.h))) {
            // render > if new folders found on an empty folder
            if (!node.classList.contains('contains-folders')) {
                node.classList.add('contains-folders');
                node.firstElementChild.classList.add('nw-fm-arrow-icon');
            }
        }

        for (var idx = 0; idx < folders.length; idx++) {
            buildnode = false;
            curItemHandle = folders[idx].h;
            containsc = this.tree[curItemHandle] || '';
            name = folders[idx].name;

            if (Object(fmconfig.treenodes).hasOwnProperty(curItemHandle)) {
                if (containsc) {
                    buildnode = true;
                }
                else {
                    fmtreenode(curItemHandle, false);
                }
            }

            if ((node = document.getElementById(_li + curItemHandle))) {

                if ((node = node.querySelector('.nw-fm-tree-item'))) {

                    if (containsc) {
                        node.classList.add('contains-folders');
                    }
                    else {
                        node.classList.remove('contains-folders');
                    }

                    if ((node = node.querySelector('span'))) {
                        if (containsc) {
                            node.classList.add('nw-fm-arrow-icon');
                        }
                        else {
                            node.classList.remove('nw-fm-arrow-icon');
                        }
                    }
                }
            }
            else {
                node = this.tree$tmpl.cloneNode(true);
                node.id = _li + curItemHandle;
                if (_tf) {
                    node.classList.add('tree-item-on-filter-hidden');
                }
                node = node.lastElementChild;
                if (!node) {
                    console.warn('Tree template error...', [node]);
                    continue;
                }
                node.id = _sub + curItemHandle;
                if (buildnode) {
                    node.classList.add('opened');
                }

                node = node.parentNode.firstElementChild;
                node.id = _a + curItemHandle;
                if (buildnode) {
                    node.classList.add('expanded');
                }
                if (containsc) {
                    node.classList.add('contains-folders');
                    node.firstElementChild.classList.add('nw-fm-arrow-icon');
                }
                if (M.currentdirid === curItemHandle) {
                    node.classList.add('opened');
                }
                if (folders[idx].t & M.IS_LINKED) {
                    node.classList.add('linked');
                }

                var titleTooltip = [];
                if (folders[idx].t & M.IS_TAKENDOWN) {
                    titleTooltip.push(l[7705]);
                }
                if (missingkeys[curItemHandle]) {
                    node.classList.add('undecryptable');
                    titleTooltip.push(l[8595]);
                    name = l[8686];
                }
                if (titleTooltip.length) {
                    node.setAttribute('title', titleTooltip.map(escapeHTML).join("\n"));
                }

                if (folders[idx].lbl){
                    var labelClass = M.getLabelClassFromId(folders[idx].lbl);

                    if (!labelClass) {
                        console.error('Invalid label %s for %s (%s)', folders[idx].lbl, curItemHandle, name);
                    }
                    else {
                        node.classList.add('labeled');
                        var nodeLabel = node.querySelector('.colour-label-ind');
                        nodeLabel.classList.add(labelClass);
                        nodeLabel.classList.remove('hidden');
                    }
                }
                node = node.querySelector('.nw-fm-tree-folder');
                if (folders[idx].su || Object(M.c.shares[curItemHandle]).su) {
                    node.classList.add('inbound-share');
                }
                else if (folders[idx].t & M.IS_SHARED) {
                    node.classList.add('shared-folder');
                }
                else if (mega.megadrop.pufs[curItemHandle] && mega.megadrop.pufs[curItemHandle].s !== 1) {
                    node.classList.add('puf-folder');
                }
                node.textContent = name;
                html = node.parentNode.parentNode;

                if (folders[idx - 1] && (node = document.getElementById(_li + folders[idx - 1].h))) {
                    if (btd) {
                        console.debug('Buildtree, ' + curItemHandle + ' after ' + _li + folders[idx - 1].h, name);
                    }
                    $(node).after(html);
                }
                else {
                    node = document.getElementById(_sub + n.h);

                    if (idx === 0 && (i = node && node.querySelector('li'))) {
                        if (btd) {
                            console.debug('Buildtree, ' + curItemHandle + ' before ' + _sub + n.h, name);
                        }
                        $(i).before(html);
                    }
                    else {
                        if (btd) {
                            console.debug('Buildtree, ' + curItemHandle + ' append ' + _sub + n.h, name);
                        }
                        $(node).append(html);
                    }
                }
            }

            if (_ts_l) {
                node = document.getElementById(_li + curItemHandle);
                if (node) {
                    if (_tf) {
                        node.classList.add('tree-item-on-filter-hidden');
                    }
                    else {
                        node.classList.remove('tree-item-on-filter-hidden');
                    }
                }
                if (name.toLowerCase().indexOf(_ts_l) === -1) {
                    if (node) {
                        node.classList.add('tree-item-on-search-hidden');
                    }

                    // TODO: calculate the actual deepest folder and base this on it.
                    buildnode = sDeepIndex < 6;
                }
                else {
                    buildnode = false;
                    $(document.getElementById(_a + curItemHandle))
                        .parents('li').removeClass('tree-item-on-search-hidden').each(expand)
                        .parents('ul').addClass('opened');
                }
            }

            if (_tf && _tf[folders[idx].lbl]) {
                labelhash[curItemHandle] = true;
            }
            // need to add function for hide parent folder for color
            if (buildnode) {
                M.buildtree(folders[idx], dialog, stype, sDeepIndex + 1);
            }

            /**
             * XXX: if this was really needed, add it at DOM node creation
             * if (fminitialized) {
             *     var currNode = M.d[curItemHandle];
             *
             *     if ((currNode && currNode.shares) || M.ps[curItemHandle]) {
             *         sharedUInode(curItemHandle);
             *     }
             *
             *     if (currNode && currNode.lbl) {
             *         M.labelDomUpdate(curItemHandle, currNode.lbl);
             *     }
             * }
             */
        }// END of for folders loop

        for (var h in labelhash) {
            if (labelhash[h]) {
                $(document.querySelector('#' + _li + h)).removeClass('tree-item-on-filter-hidden')
                    .parents('li').removeClass('tree-item-on-filter-hidden');
            }
        }
    }

    if (btd) {
        console.groupEnd();
    }

    if (!sDeepIndex && d) {
        console.timeEnd('buildtree');
    }
};

MegaData.prototype.buildtree.FORCE_REBUILD = 34675890009;

MegaData.prototype.initTreePanelSorting = function() {
    "use strict";

    var sections = [
        'folder-link', 'contacts', 'conversations', 'inbox',
        'shared-with-me', 'cloud-drive', 'rubbish-bin' // Sorting sections for tree parts
    ];
    var byType = ['name', 'status', 'last-interaction', 'label'];

    $.sortTreePanel = Object.create(null);

    for (var i = sections.length; i--;) {
        var type = sections[i];
        var byDefault = type === 'contacts' ? "status" : "name";

        $.sortTreePanel[type] = {
            by: anyOf(byType, localStorage['sort' + type + 'By']) || byDefault,
            dir: parseInt(anyOf(['-1', '1'], localStorage['sort' + type + 'Dir']) || '1')
        };

        var dlgKey = 'Copy' + type;
        $.sortTreePanel[dlgKey] = {
            by: anyOf(byType, localStorage['sort' + dlgKey + 'By']) || byDefault,
            dir: parseInt(anyOf(['-1', '1'], localStorage['sort' + dlgKey + 'Dir']) || '1')
        };

        dlgKey = 'Move' + type;
        $.sortTreePanel[dlgKey] = {
            by: anyOf(byType, localStorage['sort' + dlgKey + 'By']) || byDefault,
            dir: parseInt(anyOf(['-1', '1'], localStorage['sort' + dlgKey + 'Dir']) || '1')
        };
    }
};

var treesearch = false;

MegaData.prototype.treeSearchUI = function() {
    "use strict";

    $('.nw-fm-tree-header').off('click');
    $('.nw-fm-search-icon').off('click');
    $('.nw-fm-tree-header input').off('keyup').off('blur');

    // Items are NOT available in left panel and not result of search, hide search
    if (!$('.fm-tree-panel .content-panel.active').find('ul li, .nw-contact-item').length
        && !$('.nw-fm-tree-header').hasClass('filled-input')) {
        $('.nw-fm-tree-header input').prop('readonly', true);
        $('.nw-fm-search-icon').hide();
    }
    else { // There's items available

        // Left panel header click, show search input box
        $('.nw-fm-tree-header').rebind('click', function(e) {
            var $self = $(this);

            var targetClass = $(e.target).attr('class');
            var filledInput = $self.attr('class');
            var $input = $self.find('input');

            // If plus button is clicked
            if (targetClass && (targetClass.indexOf('button') > -1)) {
                return false;
            }
            // Search icon visible
            else if (targetClass && (targetClass.indexOf('nw-fm-search-icon') > -1)) {

                // Remove previous search text
                if (filledInput && (filledInput.indexOf('filled-input') > -1)) {
                    $self.removeClass('filled-input');
                }
            }
            else {
                $self.addClass('focused-input');
                $input.trigger("focus");
            }
        }); // END left panel header click

        // Make a search
        $('.nw-fm-search-icon').show().rebind('click', function() {
            var $self = $(this);

            treesearch = false;
            M.redrawTree();
            $self.prev().val('');
            $self.parent().find('input').trigger("blur");
        });

        $('.nw-fm-tree-header input')
            .prop('readonly', false)
            .rebind('keyup', function(e) {
                var $self = $(this);
                var $parentElem = $self.parent();

                delay('treesearch:keyup', function() {
                    if (e.keyCode === 27) {
                        $parentElem.removeClass('filled-input');
                        $self.val('');
                        $self.trigger("blur");
                        treesearch = false;
                    }
                    else {
                        $parentElem.addClass('filled-input');
                        treesearch = $self.val();
                    }

                    if ($self.val() === '') {
                        $parentElem.removeClass('filled-input');
                    }
                    var force = treesearch ? false : true;
                    M.redrawTree(force);
                });
            })
            .rebind('blur', function() {
                var $self = $(this);

                if ($self.val() === '') {
                    $self.parent('.nw-fm-tree-header').removeClass('focused-input filled-input');
                }
                else {
                    $self.parent('.nw-fm-tree-header').removeClass('focused-input');
                }
            });
    }
};

MegaData.prototype.treeFilterUI = function() {
    /**
     * React on user input when new filtering criteria is picked
     */
    'use strict';

    $('.fm-left-panel .dropdown-colour-item').rebind('click', function() {
        var $self = $(this);
        var type = M.currentTreeType;

        if ($self.parents('.labels').hasClass("disabled")) {
            return false;
        }

        $self.toggleClass('active');

        var $selectedColors = $('.fm-left-panel .dropdown-colour-item.active');

        delete M.filterTreePanel[type + '-label'];
        if ($selectedColors.length > 0) {
            M.filterTreePanel[type + '-label'] = {};
            for (var i = 0; i < $selectedColors.length; i++) {
                var data = $($selectedColors[i]).data();
                M.filterTreePanel[type + '-label'][data.labelId] = {
                    id:data.labelId,
                    txt: M.getLabelClassFromId(data.labelId)
                };
            }
        }
        M.redrawTree();
    });

    /**
     * React on user click close on filter block
     */
    $('.fm-left-panel .filter-block.tree .close').rebind('click', function() {
        var type = M.currentTreeType;
        delete M.filterTreePanel[type + '-label'];
        M.redrawTree();
    });
};

MegaData.prototype.redrawTreeFilterUI = function() {
    'use strict';

    var fltIndicator = '<div class="colour-label-ind %1"></div>';
    var $filterBlock = $('.nw-tree-panel-filter-tag');
    var type = M.currentTreeType;

    $filterBlock.addClass('hidden').find('.content').empty();
    for (var i in M.filterTreePanel[type + '-label']){
        if (M.filterTreePanel[type + '-label'][i]){
            $filterBlock.removeClass('hidden');
            $filterBlock.find('.content')
                .append(fltIndicator.replace('%1', M.filterTreePanel[type + '-label'][i].txt));
        }
    }
};

MegaData.prototype.treeSortUI = function() {
    /**
     * Show/hide sort dialog in left panel
     */
    'use strict';

    $('.nw-tree-panel-arrows').rebind('click', function() {
        var $self = $(this);
        var menu;
        var type;
        var sortTreePanel;
        var $sortMenuItems;
        var dir;

        // Show sort menu
        if (!$self.hasClass('active')) {
            $.hideContextMenu();

            $self.addClass('active');

            menu = $('.nw-sorting-menu');
            menu.removeClass('hidden');

            type = M.currentTreeType;

            if (type === 'settings') {
                type = M.lastActiveTab || 'cloud-drive';
            }

            // Show only contacts related sorting options
            if (type === 'contacts') {
                menu.find('.sorting-item-divider,.dropdown-item').removeClass('hidden');
                menu.find('*[data-by=fav],*[data-by=created],*[data-by=label]').addClass('hidden');
                menu.find('.dropdown-section.labels').addClass('hidden');
                menu.find('hr').addClass('hidden');
                menu.find('.filter-by').addClass('hidden');

            }
            else { // Hide status and last-interaction sorting options in sort dialog
                menu.find('.sorting-item-divider,.dropdown-item').removeClass('hidden');
                menu.find('*[data-by=status],*[data-by=last-interaction]').addClass('hidden');
                menu.find('hr').removeClass('hidden');
                menu.find('.dropdown-section.labels').removeClass('hidden');
                menu.find('.filter-by').removeClass('hidden');
            }

            menu.css('right', '-' + (menu.outerWidth() - 3) + 'px');

            sortTreePanel = $.sortTreePanel[type];

            if (d && !sortTreePanel) {
                console.error('No sortTreePanel for "%s"', type);
            }

            $sortMenuItems = $('.dropdown-item', menu).removeClass('active asc desc');

            if (sortTreePanel) {
                dir = sortTreePanel.dir === 1 ? 'asc' : 'desc';
                $sortMenuItems
                    .filter('*[data-by=' + sortTreePanel.by + ']')
                    .addClass('active')
                    .addClass(dir);
            }

            // reset and restore filter UI from previous actions.
            var filterTreePanel = M.filterTreePanel[type + '-label'];
            var $filterMenuItems = $('.dropdown-colour-item', menu);
            $filterMenuItems.noTransition(function() {
                $filterMenuItems.removeClass('active');
                if (filterTreePanel) {
                    $filterMenuItems
                        .filter(function() {
                            for (var i in filterTreePanel) {
                                if ($(this).data('labelTxt').toLowerCase() === filterTreePanel[i].txt) {
                                    return true;
                                }
                            }
                            return false;
                        })
                        .addClass('active');
                }
            });

            if (M.isLabelExistTree()) {
                // lbl is exist enable filter on DOM.
                menu.find('.dropdown-item-label').add('.fm-left-panel .filter-by .labels')
                    .removeClass('static disabled');
            }
            else {
                // lbl is not exist disable filter on DOM.
                menu.find('.dropdown-item-label').add('.fm-left-panel .filter-by .labels')
                    .addClass('static disabled');
            }

            return false; // Prevent bubbling
        }

        // Hide sort menu
        else {
            $self.removeClass('active');
            $('.nw-sorting-menu').addClass('hidden');
        }
    });

    /**
     * React on user input when new sorting criteria is picked
     */
    $('.fm-left-panel .dropdown-item').rebind('click', function() {
        var $self = $(this);
        var data = $self.data();
        var type = M.currentTreeType;

        if ($self.hasClass("static")) {
            return false;
        }

        if (type === 'settings') {
            type = M.lastActiveTab || 'cloud-drive';
        }

        if ($.sortTreePanel[type]) {
            $('.nw-sorting-menu').addClass('hidden');
            $('.nw-tree-panel-arrows').removeClass('active');

            if (data.by) {
                localStorage['sort' + type + 'By'] = $.sortTreePanel[type].by = data.by;
            }
            if ($self.hasClass('active')) {// Change sort direction
                $.sortTreePanel[type].dir *= -1;
                localStorage['sort' + type + 'Dir'] = $.sortTreePanel[type].dir;
            }

            var fav = function(el) {
                return el.fav;
            };

            // Check is there a need for sorting at all
            if (data.by === 'fav') {
                if (!M.v.some(fav)) {
                    return false;
                }
            }
            else if (data.by === 'label') {
                if (!M.isLabelExistTree()) {
                    return false;
                }
            }

            M.redrawTree();
        }
    });
};

MegaData.prototype.treePanelType = function() {
    'use strict';

    var remove = /(?:active|nw-fm-left-icon|ui-droppable|filled|glow|asc|desc)/g;
    return $.trim($('.nw-fm-left-icon.active').attr('class').replace(remove, ''));
};

/**
 * redrawTree
 *
 * Re-creates tree DOM elements.
 * if f variable is true or undefined rebuild the tree.
 * if f variable is false, apply DOM update only;
 * @param {Boolean} f force rebuild.
 */

MegaData.prototype.redrawTree = function(f) {
    'use strict';

    $('li.tree-item-on-search-hidden').removeClass('tree-item-on-search-hidden');

    var force = M.buildtree.FORCE_REBUILD;
    if (f === false) {
        force = undefined;
    }

    if (M.currentrootid === M.RootID || M.currentdirid.match("^search/")) {
        M.buildtree(M.d[M.RootID], force);
    }
    if (M.currentrootid === M.InboxID) {
        M.buildtree(M.d[M.InboxID], force);
    }
    else if (M.currentrootid === M.RubbishID) {
        M.buildtree({h: M.RubbishID}, force);
    }
    else if (M.currentrootid === 'shares') {
        M.buildtree({h: 'shares'}, force);
    }
    else if (M.currentrootid === 'contacts' || M.currentrootid === 'opc' || M.currentrootid === 'ipc') {
        M.contacts();
    }
    else if (M.currentrootid === 'chat') {
        console.log('render the entire contact list filtered by search query into the conversations list');
    }
    M.addTreeUI();
    $('.nw-fm-tree-item').noTransition(function() {
        M.onTreeUIOpen(M.currentdirid, false);
    });
    M.redrawTreeFilterUI();

};

/**
 * Check filter is available on current tree
 * @param {String} [handle] handle for what to check. if empty using currentrootid.
 * @returns boolean
 */
MegaData.prototype.checkFilterAvailable = function(handle) {
    "use strict";

    var t = this.tree;
    var result = false;
    handle = typeof handle === 'undefined' ? M.currentrootid : handle;

    $.each(t[handle], function(index, item) {
        if (item.lbl > 0) {
            result = true;
        }
        if (t[item.h] && M.checkFilterAvailable(item.h)) {
            result = true;
        }
    });
    return result;
};

/**
 * Check current viewing tree has label or not
 * @param {String} [handle] specify tree handle, if not check current tree
 * @returns boolean
 */
MegaData.prototype.isLabelExistTree = function(handle) {
    "use strict";

    handle = handle ? handle : M.currentrootid;
    var ct = M.tree[handle];

    for (var h in ct) {
        if (ct[h].lbl > 0 || (M.tree[h] && M.isLabelExistTree(h))) {
            return true;
        }
    }
    return false;
};
