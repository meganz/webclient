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
    var outshares = n.h === 'out-shares';
    var publiclinks = n.h === 'public-links';
    var treeType;
    var expand = function(i, e) {
        if (i) {
            e.firstElementChild.classList.add('expanded');
        }
    };
    var labelhash = [];
    var cvtree = {};

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

    if (n.h === M.RootID && !sDeepIndex) {
        if (folderlink) {
            n = {h: ''};
        }
        i = escapeHTML(n.h);
        if (typeof dialog === 'undefined') {
            if (rebuild || $('.content-panel.cloud-drive ul').length === 0) {
                $('.content-panel.cloud-drive').html('<ul id="treesub_' + i + '"></ul>');
            }
        }
        else {
            $('.' + dialog + ' .cloud-drive .dialog-content-block').html('<ul id="mctreesub_' + i + '"></ul>');
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
    else if (outshares) {
        $('.content-panel.out-shares').html('<ul id="treesub_os_out-shares"></ul>');
        stype = "out-shares";
        cvtree = M.getOutShareTree();
    }
    else if (publiclinks) {
        $('.content-panel.public-links').html('<ul id="treesub_pl_public-links"></ul>');
        stype = "public-links";
        cvtree = M.getPublicLinkTree();
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
        else if ($.selectFolderDialog) {
            prefix = 'SelectFolder' + stype;
        }
        else if ($.saveAsDialog) {
            prefix = 'SaveAs' + stype;
        }
    }

    var btd = d > 1;
    if (btd) {
        console.group('BUILDTREE for "' + n.h + '"');
    }

    if (n.h && n.h.indexOf('os_') === 0) {
        treeType = 'os';
        n.h = n.h.substr(3);
    }
    else if (n.h && n.h.indexOf('pl_') === 0) {
        treeType = 'pl';
        n.h = n.h.substr(3);
    }

    var tree = this.tree[n.h] || cvtree;

    if (tree) {
        folders = obj_values(tree);

        if (inshares) {
            folders = folders
                .filter(function(n) {
                    return !M.d[n.p];
                });
        }

        if (outshares || publiclinks) {
            // Remove child duplication on the tree.
            folders = folders
                .filter(function(n) {
                    var folderParents = {};
                    while (n && n.p !== M.RootID) {
                        folderParents[n.p] = 1;
                        n = M.d[n.p];
                    }

                    for (var i in folders) {
                        if (folderParents[folders[i].h]) {
                            return false;
                        }
                    }
                    return true;
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
                var type;

                if (outshares || publiclinks) {
                    type = stype;
                }

                sortFn = function (a, b) {
                    return M.getSortByDateTimeFn(type)(a, b, sortDirection);
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

        // Special prefixs for Out-shares and Public links
        var typefix = '';

        if (stype === 'out-shares' || treeType === 'os') {
            _a += 'os_';
            _li += 'os_';
            _sub += 'os_';
            typefix = 'os_';
        }
        else if (stype === 'public-links' || treeType === 'pl') {
            _a += 'pl_';
            _li += 'pl_';
            _sub += 'pl_';
            typefix = 'pl_';
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

            if (curItemHandle === M.RootID || Object(fmconfig.treenodes).hasOwnProperty(typefix + curItemHandle) ||
                dialog && Object($.openedDialogNodes).hasOwnProperty(curItemHandle)) {
                if (containsc) {
                    buildnode = true;
                }
                else {
                    fmtreenode(typefix + curItemHandle, false);
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

                if (folders[idx].lbl) {
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

    if (!sDeepIndex) {
        if (d) {
            console.timeEnd('buildtree');
        }

        if (_ts_l) {
            mBroadcaster.sendMessage('treesearch', _ts_l, stype);
        }
    }
};

MegaData.prototype.buildtree.FORCE_REBUILD = 34675890009;

MegaData.prototype.initTreePanelSorting = function() {
    "use strict";

    var sections = [
        'folder-link', 'contacts', 'conversations', 'inbox',
        'shared-with-me', 'cloud-drive', 'rubbish-bin', 'out-shares', 'public-links' // Sorting sections for tree parts
    ];
    var byType = ['name', 'status', 'last-interaction', 'label'];
    var dialogs = ['Copy', 'Move', 'SelectFolder', 'SaveAs'];
    var byDefault;
    var type;

    $.sortTreePanel = Object.create(null);

    var setSortTreePanel = function _setSortTreePanel(dialog) {
        var key = (dialog || '') + type;
        $.sortTreePanel[key] = {
            by: anyOf(byType, localStorage['sort' + key + 'By']) || byDefault,
            dir: parseInt(anyOf(['-1', '1'], localStorage['sort' + key + 'Dir']) || '1')
        };
    };

    for (var i = sections.length; i--;) {
        type = sections[i];
        byDefault = type === 'contacts' ? "status" : "name";

        setSortTreePanel();

        dialogs.forEach(setSortTreePanel);
    }
};

MegaData.prototype.getTreePanelSortingValue = function(column, property) {
    'use strict';

    column = $.sortTreePanel && $.sortTreePanel[column] || false;
    return column[property || 'by'];
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
        !M.chat && $('.nw-fm-search-icon').show().rebind('click', function() {
            var $self = $(this);
            var $input = $self.prev();

            if ($input.val() === '') {
                $input.trigger('focus');
            }
            else {
                treesearch = false;
                M.redrawTree();
                $input.val('');
                $input.trigger('blur').trigger('cleared');
            }
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
        var sortMenuPos;

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

            menu.find('.sorting-item-divider,.dropdown-item').removeClass('hidden');

            // Show only contacts related sorting options
            if (type === 'contacts') {
                menu.find('*[data-by=fav],*[data-by=created],*[data-by=label]').addClass('hidden');
                menu.find('.dropdown-section.labels').addClass('hidden');
                menu.find('hr').addClass('hidden');
                menu.find('.filter-by').addClass('hidden');

            }
            else { // Hide status and last-interaction sorting options in sort dialog
                menu.find('*[data-by=status],*[data-by=last-interaction]').addClass('hidden');
                menu.find('hr').removeClass('hidden');
                menu.find('.dropdown-section.labels').removeClass('hidden');
                menu.find('.filter-by').removeClass('hidden');
            }

            if (type === 'shared-with-me') {
                menu.find('*[data-by=created]').addClass('hidden');
            }

            sortMenuPos = $self.offset().top - 9;

            if (sortMenuPos < 3) {
                sortMenuPos = 3;
                menu.find('.dropdown-dark-arrow').css({
                    'top': $self.offset().top - sortMenuPos + 1
                });
            }
            else {
                menu.find('.dropdown-dark-arrow').removeAttr('style');
            }

            menu.css({
                'top': sortMenuPos,
                'right': '-' + (menu.outerWidth() - 3) + 'px'
            });

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

    var remove = /active|nw-fm-left-icon|ui-droppable|filled|glow|asc|desc/g;
    return $.trim(String($('.nw-fm-left-icon.active').attr('class') || 'unknown').replace(remove, ''));
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

    if (M.currentrootid === M.RootID || String(M.currentdirid).match("^search/")) {
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
    else if (M.currentrootid === 'out-shares') {
        M.buildtree({h: 'out-shares'}, force);
    }
    else if (M.currentrootid === 'public-links') {
        M.buildtree({h: 'public-links'}, force);
    }
    else if (M.currentrootid === 'contacts' || M.currentrootid === 'opc' || M.currentrootid === 'ipc') {
        M.contacts();
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

    if (handle === 'out-shares') {
        ct = M.getOutShareTree();
    }
    else if (handle === 'public-links') {
        ct = M.getPublicLinkTree();
    }

    for (var h in ct) {
        if (ct[h].lbl > 0 || (M.tree[h] && M.isLabelExistTree(h))) {
            return true;
        }
    }
    return false;
};

/**
 * Create tree of public-link's children. Same structure as M.tree
 * @return {Object}
 */
MegaData.prototype.getPublicLinkTree = function() {

    'use strict';

    var pltree = {};
    for (var h in M.su.EXP) {
        if (M.d[h].t) {
            pltree[h] = Object.assign({}, M.d[h]);
            pltree[h].t = this.getTreeValue(M.d[h]);
        }
    }
    return pltree;
};

/**
 * Create tree of out-share's children. Same structure as M.tree
 * @return {Object}
 */
MegaData.prototype.getOutShareTree = function() {

    'use strict';

    var ostree = {};
    for (var suh in M.su) {
        if (suh !== 'EXP') {
            for (var h in M.su[suh]) {
                if (M.d[h]) {
                    ostree[h] = Object.assign({}, M.d[h]);
                    ostree[h].t = this.getTreeValue(M.d[h]);
                }
            }
        }
    }
    return ostree;
};

/**
 * Get t value of custom view trees
 * @return {MegaNode} An ufs-node
 */
MegaData.prototype.getTreeValue = function(n) {

    'use strict';

    var t = n.t;
    if (n.fav) {
        t |= M.IS_FAV;
    }
    if (M.su.EXP && M.su.EXP[n.h]) {
        t |= M.IS_LINKED;
    }
    if (M.getNodeShareUsers(n, 'EXP').length || M.ps[n.h]) {
        t |= M.IS_SHARED;
    }
    if (M.getNodeShare(n).down === 1) {
        t |= M.IS_TAKENDOWN;
    }
    return t;
};

/**
 * Initializes tree panel
 */
MegaData.prototype.addTreeUI = function() {
    "use strict";

    if (d) {
        console.time('treeUI');
    }
    var $treePanel = $('.fm-tree-panel');
    var $treeItem = $(folderlink ? '.nw-fm-tree-item' : '.nw-fm-tree-item:visible', $treePanel);

    $treeItem.draggable(
        {
            revert: true,
            containment: 'document',
            revertDuration: 200,
            distance: 10,
            scroll: false,
            cursorAt: {right: 88, bottom: 58},
            helper: function(e, ui) {
                $(this).draggable("option", "containment", [72, 42, $(window).width(), $(window).height()]);
                return M.getDDhelper();
            },
            start: function(e, ui) {
                $.treeDragging = true;
                $.hideContextMenu(e);
                var html = '';
                var id = $(e.target).attr('id');
                if (id) {
                    id = id.replace(/treea_+|(os_|pl_)/g, '');
                }
                if (id && M.d[id]) {
                    html = (
                        '<div class="transfer-filetype-icon ' + fileIcon(M.d[id]) + '"></div>' +
                        '<div class="tranfer-filetype-txt dragger-entry">' +
                        str_mtrunc(htmlentities(M.d[id].name)) + '</div>'
                    );
                }
                $('#draghelper .dragger-icon').remove();
                $('#draghelper .dragger-content').html(html);
                $('body').addClass('dragging');
                $.draggerHeight = $('#draghelper .dragger-content').outerHeight();
                $.draggerWidth = $('#draghelper .dragger-content').outerWidth();
            },
            drag: function(e, ui) {
                //console.log('tree dragging',e);
                if (ui.position.top + $.draggerHeight - 28 > $(window).height()) {
                    ui.position.top = $(window).height() - $.draggerHeight + 26;
                }
                if (ui.position.left + $.draggerWidth - 58 > $(window).width()) {
                    ui.position.left = $(window).width() - $.draggerWidth + 56;
                }
            },
            stop: function(e, u) {
                $.treeDragging = false;
                $('body').removeClass('dragging').removeClassWith("dndc-");
            }
        });

    $(
        '.fm-tree-panel .nw-fm-tree-item,' +
        '.rubbish-bin,' +
        '.fm-breadcrumbs,' +
        '.nw-fm-left-icons-panel .nw-fm-left-icon,' +
        '.shared-with-me tr,' +
        '.nw-conversations-item,' +
        'ul.conversations-pane > li,' +
        '.messages-block'
    ).filter(":visible").droppable({
        tolerance: 'pointer',
        drop: function(e, ui) {
            $.doDD(e, ui, 'drop', 1);
        },
        over: function(e, ui) {
            $.doDD(e, ui, 'over', 1);
        },
        out: function(e, ui) {
            $.doDD(e, ui, 'out', 1);
        }
    });

    $treeItem.rebind('click.treeUI, contextmenu.treeUI', function(e) {

        var $this = $(this);
        var id = $this.attr('id').replace('treea_', '');
        var tmpId = id;
        var cv = M.isCustomView(id);

        id = cv ? cv.nodeID : id;

        if (e.type === 'contextmenu') {
            $('.nw-fm-tree-item').removeClass('dragover');
            $this.addClass('dragover');

            var $uls = $this.parents('ul').find('.selected');

            if ($uls.length > 1) {
                $.selected = $uls.attrs('id')
                    .map(function(id) {
                        return id.replace(/treea_+|(os_|pl_)/g, '');
                    });
            }
            else {
                $.selected = [id];

                Soon(function() {
                    $this.addClass('hovered');
                });
            }
            return !!M.contextMenuUI(e, 1);
        }

        var $target = $(e.target);
        if ($target.hasClass('nw-fm-arrow-icon')) {
            M.onTreeUIExpand(tmpId);
        }
        else if (e.shiftKey) {
            $this.addClass('selected');
        }
        else {
            // plain click, remove all .selected from e.shiftKey
            $('#treesub_' + M.currentrootid + ' .nw-fm-tree-item').removeClass('selected');
            $this.addClass('selected');

            if ($target.hasClass('opened')) {
                M.onTreeUIExpand(tmpId);
            }
            if (e.ctrlKey) {
                $.ofShowNoFolders = true;
            }

            id = cv ? cv.prefixPath + id : id;

            M.openFolder(id, e.ctrlKey);
        }

        return false;
    });

    $('.nw-contact-item', $treePanel).rebind('contextmenu.treeUI', function(e) {
        var $self = $(this);

        if (!$self.hasClass('selected')) {
            $('.content-panel.contacts .nw-contact-item.selected').removeClass('selected');
            $self.addClass('selected');
        }

        $.selected = [$self.attr('id').replace('contact_', '')];
        M.searchPath();
        $.hideTopMenu();

        return Boolean(M.contextMenuUI(e, 1));
    });

    /**
     * Let's shoot two birds with a stone, when nodes are moved we need a resize
     * to let dynlist refresh - plus, we'll implicitly invoke initTreeScroll.
     */
    $(window).trigger('resize');

    if (d) {
        console.timeEnd('treeUI');
    }
};

/**
 * Invokes debounced tree panel initialization.
 */
MegaData.prototype.addTreeUIDelayed = function(ms) {
    'use strict';

    delay('treeUI', function() {
        M.addTreeUI();
    }, ms || 30);
};

/**
 * Handles expanding of tree panel elements.
 * @param {String} id An ufs-node's handle
 * @param {Boolean} [force]
 */
MegaData.prototype.onTreeUIExpand = function(id, force) {
    "use strict";

    this.buildtree({h: id});

    var $tree = $('#treea_' + id);

    if ($tree.hasClass('expanded') && !force) {
        fmtreenode(id, false);
        $('#treesub_' + id).removeClass('opened');
        $tree.removeClass('expanded');
    }
    else if ($tree.hasClass('contains-folders')) {
        fmtreenode(id, true);
        $('#treesub_' + id).addClass('opened')
            .find('.tree-item-on-search-hidden')
            .removeClass('tree-item-on-search-hidden');
        $tree.addClass('expanded');
    }

    M.addTreeUIDelayed();
};

/**
 * Handles opening of tree panel elemement.
 * @param {String} id An ufs-node's handle
 * @param {Object} [event] Event triggering action
 * @param {Boolean} [ignoreScroll] Whether scroll element into view.
 */
MegaData.prototype.onTreeUIOpen = function(id, event, ignoreScroll) {
    "use strict";

    id = String(id);
    var id_r = this.getNodeRoot(id);
    var id_s = id.split('/')[0];
    var e, scrollTo = false, stickToTop = false;
    if (d) {
        console.log("treeUIopen", id);
    }

    if (id_r === 'shares') {
        this.onSectionUIOpen('shared-with-me');
    }
    else if (id_r === 'out-shares') {
        this.onSectionUIOpen('out-shares');
    }
    else if (id_r === 'public-links') {
        this.onSectionUIOpen('public-links');
    }
    else if (this.InboxID && id_r === this.InboxID) {
        this.onSectionUIOpen('inbox');
    }
    else if (id_r === this.RootID) {
        this.onSectionUIOpen('cloud-drive');
    }
    else if (id_s === 'chat') {
        this.onSectionUIOpen('conversations');
    }
    else if (id_r === 'contacts') {
        this.onSectionUIOpen('contacts');
    }
    else if (id_r === 'ipc') {
        this.onSectionUIOpen('ipc');
    }
    else if (id_r === 'opc') {
        this.onSectionUIOpen('opc');
    }
    else if (id_s === 'user-management') {
        this.onSectionUIOpen('user-management');
    }
    else if (id_r === 'account') {
        this.onSectionUIOpen('account');
    }
    else if (id_r === 'dashboard') {
        this.onSectionUIOpen('dashboard');
    }
    else if (this.RubbishID && id_r === this.RubbishID) {
        this.onSectionUIOpen('rubbish-bin');
    }
    else if (id_s === 'transfers') {
        this.onSectionUIOpen('transfers');
    }
    else if (id_s === 'recents') {
        this.onSectionUIOpen('recents');
    }

    if (!fminitialized) {
        return false;
    }

    if (!event) {
        var ids = this.getPath(id);
        var i = 1;
        while (i < ids.length) {
            if (this.d[ids[i]] && ids[i].length === 8) {
                if (id_r === 'out-shares') {
                    this.onTreeUIExpand('os_' + ids[i], 1);
                }
                else if (id_r === 'public-links') {
                    this.onTreeUIExpand('pl_' + ids[i], 1);
                }
                else {
                    this.onTreeUIExpand(ids[i], 1);
                }
            }
            i++;
        }
        if (
            (ids[0] === 'contacts')
            && this.currentdirid
            && (String(this.currentdirid).length === 11)
            && (this.currentrootid === 'contacts')
        ) {
            this.onSectionUIOpen('contacts');
        }
        else if (ids[0] === 'contacts') {
            // XX: whats the goal of this? everytime when i'm in the contacts and I receive a share, it changes ONLY the
            // UI tree -> Shared with me... its a bug from what i can see and i also don't see any points of automatic
            // redirect in the UI when another user had sent me a shared folder.... its very bad UX. Plus, as a bonus
            // sectionUIopen is already called with sectionUIopen('contacts') few lines before this (when this func
            // is called by the renderNew()

            // sectionUIopen('shared-with-me');
        }
        else if (ids[0] === this.RootID) {
            this.onSectionUIOpen('cloud-drive');
        }
    }
    if ($.hideContextMenu) {
        $.hideContextMenu(event);
    }

    if (id_r === 'out-shares') {
        e = $('#treea_os_' + id.split('/')[1]);
    }
    else if (id_r === 'public-links') {
        e = $('#treea_pl_' + id.split('/')[1]);
    }
    else {
        e = $('#treea_' + id_s);
    }

    $('.fm-tree-panel .nw-fm-tree-item').removeClass('selected');
    e.addClass('selected');

    if (!ignoreScroll) {
        if (id === this.RootID || id === 'shares' || id === 'contacts' || id === 'chat' || id === 'opc' || id === 'ipc') {
            stickToTop = true;
            scrollTo = $('.nw-tree-panel-header');
        }
        else if (e.length && !e.visible()) {
            scrollTo = e;
        }
        // if (d) console.log('scroll to element?',ignoreScroll,scrollTo,stickToTop);

        var jsp = scrollTo && $('.fm-tree-panel').data('jsp');
        if (jsp) {
            setTimeout(function() {
                jsp.scrollToElement(scrollTo, stickToTop);
            }, 50);
        }
    }
    this.addTreeUIDelayed();
};
