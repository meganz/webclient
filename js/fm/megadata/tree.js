/**
 * buildtree
 *
 * Re-creates tree DOM elements in given order i.e. { ascending, descending }
 * for given parameters i.e. { name, [last interaction, status] },
 * Sorting for status and last interaction are available only for contacts.
 * @param {String} n, node id.
 * @param {String} dialog, dialog identifier or force rebuild constant.
 * @param {type} stype, what to sort.
 * @returns {MegaPromise}
 */
MegaData.prototype.buildtree = function _buildtree(n, dialog, stype) {

    if (!n) {
        console.error('Invalid node passed to M.buildtree');
        return MegaPromise.reject();
    }

    var folders = [],
        _ts_l = (typeof treesearch !== 'undefined' && treesearch) ? treesearch.toLowerCase() : undefined,
        _li = 'treeli_',
        _sub = 'treesub_',
        _a = 'treea_',
        rebuild = false,
        sharedfolder, openedc, arrowIcon,
        ulc, expandedc, buildnode, containsc, i, node, html, sExportLink,
        fName = '',
        curItemHandle = '',
        undecryptableClass = '',
        titleTooltip = '',
        fIcon = '',
        prefix;

    var inshares = n.h === 'shares';

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
    stype = stype || "cloud-drive";
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
                sortFn = function(a, b) {
                    return a.t & M.IS_FAV ? -1 * sortDirection : b.t & M.IS_FAV ? sortDirection : 0;
                };
                break;
            case 'created':
                sortFn = function(a, b) {
                    return (a.ts < b.ts ? -1 : 1) * sortDirection;
                };
                break;
            case 'label':
                sortFn = function(a, b) {
                    return (a.lbl < b.lbl ? -1 : 1) * sortDirection;
                };
                break;
        }
        folders.sort(sortFn);

        // In case of copy and move dialogs
        if (typeof dialog !== 'undefined') {
            _a = 'mctreea_';
            _li = 'mctreeli_';
            _sub = 'mctreesub_';
        }

        if (folders.length) {
            // render > if new folders found on an empty folder
            ulc = $('#' + _a + n.h);

            if (!ulc.hasClass('contains-folders')) {
                ulc.addClass('contains-folders').find('span:first').addClass('nw-fm-arrow-icon');
            }
        }

        for (var idx = 0; idx < folders.length; idx++) {

            ulc = '';
            expandedc = '';
            buildnode = false;
            containsc = '';
            curItemHandle = folders[idx].h;
            undecryptableClass = '';
            titleTooltip = [];
            fIcon = '';

            fName = folders[idx].name;

            // Undecryptable node indicators
            if (missingkeys[curItemHandle]) {
                undecryptableClass = 'undecryptable';
                fName = l[8686];
                fIcon = 'generic';
            }

            if (this.tree[curItemHandle]) {
                containsc = 'contains-folders';
            }
            if (fmconfig && fmconfig.treenodes && fmconfig.treenodes[curItemHandle]) {
                buildnode = !!containsc;
            }
            if (buildnode) {
                ulc = 'class="opened"';
                expandedc = 'expanded';
            }
            else if (Object(fmconfig.treenodes).hasOwnProperty(curItemHandle)) {
                fmtreenode(curItemHandle, false);
            }

            // Check is there a full and pending share available, exclude public link shares i.e. 'EXP'
            // if (this.d[curItemHandle].su) {
            if (folders[idx].su || Object(M.c.shares[curItemHandle]).su) {
                sharedfolder = ' inbound-share';
            }
            else if (folders[idx].t & M.IS_SHARED) {
                sharedfolder = ' shared-folder';
            }
            else if (mega.megadrop.pufs[curItemHandle] && mega.megadrop.pufs[curItemHandle].s !== 1) {
                sharedfolder = ' puf-folder';
            }
            else {
                sharedfolder = '';
            }
            openedc = (M.currentdirid === curItemHandle) ? 'opened' : '';

            var k = $('#' + _li + curItemHandle).length;

            if (k) {
                if (containsc) {
                    $('#' + _li + curItemHandle + ' .nw-fm-tree-item').addClass(containsc)
                        .find('span').eq(0).addClass('nw-fm-arrow-icon');
                }
                else {
                    $('#' + _li + curItemHandle + ' .nw-fm-tree-item').removeClass('contains-folders')
                        .find('span').eq(0).removeClass('nw-fm-arrow-icon');
                }
            }
            else {

                if (folders[idx].t & M.IS_TAKENDOWN) {
                    titleTooltip.push(l[7705]);
                }

                if (undecryptableClass) {
                    // Undecryptable
                    titleTooltip.push(l[8595]);
                }
                titleTooltip = titleTooltip.map(escapeHTML).join("\n");

                sExportLink = folders[idx].t & M.IS_LINKED ? 'linked' : '';
                arrowIcon = containsc ? 'class="nw-fm-arrow-icon"' : '';

                html = '<li id="' + _li + curItemHandle + '">' +
                    '<span  id="' + _a + curItemHandle + '"' +
                    ' class="nw-fm-tree-item ' + containsc + ' ' + expandedc + ' ' + openedc + ' ' +
                    sExportLink + ' ' + undecryptableClass + '" title="' + titleTooltip + '">' +
                    '<span ' + arrowIcon + '></span>' +
                    '<span class="nw-fm-tree-folder' + sharedfolder + '">' + escapeHTML(fName) + '</span>' +
                    '<span class="data-item-icon"></span>' +
                    '</span>' +
                    '<ul id="' + _sub + curItemHandle + '" ' + ulc + '></ul>' +
                    '</li>';

                if (folders[idx - 1] && $('#' + _li + folders[idx - 1].h).length > 0) {
                    if (btd) {
                        console.debug('Buildtree, ' + curItemHandle + ' after ' + _li + folders[idx - 1].h);
                    }
                    $('#' + _li + folders[idx - 1].h).after(html);
                }
                else if (idx === 0 && $('#' + _sub + n.h + ' li').length > 0) {
                    if (btd) {
                        console.debug('Buildtree, ' + curItemHandle + ' before ' + _sub + n.h);
                    }
                    $($('#' + _sub + n.h + ' li')[0]).before(html);
                }
                else {
                    if (btd) {
                        console.debug('Buildtree, ' + curItemHandle + ' append ' + _sub + n.h);
                    }
                    $('#' + _sub + n.h).append(html);
                }
            }

            if (_ts_l) {
                if (fName.toLowerCase().indexOf(_ts_l) === -1) {
                    $('#' + _li + curItemHandle).addClass('tree-item-on-search-hidden');
                }
                else {
                    $('#' + _li + curItemHandle).parents('li').removeClass('tree-item-on-search-hidden');
                }
            }
            if (buildnode) {
                _buildtree.call(this, folders[idx], dialog, stype);
            }

            if (fminitialized) {
                var currNode = M.d[curItemHandle];

                if ((currNode && currNode.shares) || M.ps[curItemHandle]) {
                    sharedUInode(curItemHandle);
                }

                if (currNode && currNode.lbl) {
                    M.colourLabelDomUpdate(curItemHandle, currNode.lbl);
                }
            }
        }// END of for folders loop
    }

    if (btd) {
        console.groupEnd();
    }

    return MegaPromise.resolve();
};

MegaData.prototype.buildtree.FORCE_REBUILD = 34675890009;

MegaData.prototype.initTreePanelSorting = function() {
    "use strict";

    var sections = [
        'folder-link', 'contacts', 'conversations', 'inbox', 'shared-with-me', 'cloud-drive', 'rubbish-bin'
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

    $('.nw-fm-tree-header').unbind('click');
    $('.nw-fm-search-icon').unbind('click');
    $('.nw-fm-tree-header input').unbind('keyup').unbind('blur');

    var treeredraw = function() {
        $('li.tree-item-on-search-hidden').removeClass('tree-item-on-search-hidden');

        if (M.currentrootid === M.RootID) {
            M.buildtree(M.d[M.RootID]);
        }
        if (M.currentrootid === M.InboxID) {
            M.buildtree(M.d[M.InboxID]);
        }
        else if (M.currentrootid === M.RubbishID) {
            M.buildtree({h: M.RubbishID});
        }
        else if (M.currentrootid === 'shares') {
            M.buildtree({h: 'shares'});
        }
        else if (M.currentrootid === 'contacts') {
            M.contacts();
        }
        else if (M.currentrootid === 'chat') {
            console.log('render the entire contact list filtered by search query into the conversations list');
        }
        M.addTreeUI();
    };

    // Items are NOT available in left panel, hide search
    if (!$('.fm-tree-panel .content-panel.active').find('ul li, .nw-contact-item').length) {
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
                $input.focus();
            }
        }); // END left panel header click

        // Make a search
        $('.nw-fm-search-icon').show().rebind('click', function() {
            var $self = $(this);

            treesearch = false;
            treeredraw();
            $self.prev().val('');
            $self.parent().find('input').blur();
        });

        $('.nw-fm-tree-header input')
            .prop('readonly', false)
            .rebind('keyup', function(e) {
                var $self = $(this);

                var $parentElem = $self.parent();

                if (e.keyCode === 27) {
                    $parentElem.removeClass('filled-input');
                    $self.val('');
                    $self.blur();
                    treesearch = false;
                }
                else {
                    $parentElem.addClass('filled-input');
                    treesearch = $self.val();
                }

                if ($self.val() === '') {
                    $parentElem.removeClass('filled-input');
                }

                treeredraw();
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

    /**
     * Show/hide sort dialog in left panel
     */
    $('.nw-tree-panel-arrows').rebind('click', function() {
        var $self = $(this);
        var menu, type, sortTreePanel, $sortMenuItems;

        // Show sort menu
        if (!$self.hasClass('active')) {

            $.hideContextMenu();

            $self.addClass('active');

            menu = $('.nw-sorting-menu').removeClass('hidden');
            menu.css('right', '-' + (menu.outerWidth() - 4) + 'px');

            type = M.treePanelType();

            if (type === 'settings') {
                type = M.lastActiveTab || 'cloud-drive';
            }

            // Show only contacts related sorting options
            if (type === 'contacts') {
                menu.find('.sorting-item-divider,.sorting-menu-item').removeClass('hidden');
                menu.find('*[data-by=fav],*[data-by=created],*[data-by=label]').addClass('hidden');
            }
            else { // Hide status and last-interaction sorting options in sort dialog
                menu.find('.sorting-item-divider,.sorting-menu-item').removeClass('hidden');
                menu.find('*[data-by=status],*[data-by=last-interaction]').addClass('hidden');
            }

            sortTreePanel = $.sortTreePanel[type];

            if (d && !sortTreePanel) {
                console.error('No sortTreePanel for "%s"', type);
            }

            $sortMenuItems = $('.sorting-menu-item').removeClass('active');

            if (sortTreePanel) {
                $sortMenuItems
                    .filter('*[data-by=' + sortTreePanel.by + '],*[data-dir=' + sortTreePanel.dir + ']')
                    .addClass('active');
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
    $('.fm-left-panel .sorting-menu-item').rebind('click', function() {
        var $self = $(this);
        var data = $self.data();
        var type = M.treePanelType();

        if (type === 'settings') {
            type = M.lastActiveTab || 'cloud-drive';
        }

        if (!$self.hasClass('active') && $.sortTreePanel[type]) {
            $self.parent().find('.sorting-menu-item').removeClass('active');
            $self.addClass('active');

            $('.nw-sorting-menu').addClass('hidden');
            $('.nw-tree-panel-arrows').removeClass('active');

            if (data.dir) {
                localStorage['sort' + type + 'Dir'] = $.sortTreePanel[type].dir = data.dir;
            }
            if (data.by) {
                localStorage['sort' + type + 'By'] = $.sortTreePanel[type].by = data.by;
            }

            if (type === 'contacts') {
                M.contacts();
            }
            else if (type === 'shared-with-me') {
                M.buildtree({h: 'shares'}, M.buildtree.FORCE_REBUILD);
            }
            else if (type === 'inbox') {
                M.buildtree(M.d[M.InboxID], M.buildtree.FORCE_REBUILD);
            }
            else if (type === 'rubbish-bin') {
                M.buildtree({h: M.RubbishID}, M.buildtree.FORCE_REBUILD);
            }
            else if ((type === 'cloud-drive') || (type === 'folder-link')) {
                M.buildtree(M.d[M.RootID], M.buildtree.FORCE_REBUILD);
            }

            M.addTreeUI(); // reattach events
        }
    });
};

MegaData.prototype.treePanelType = function() {
    'use strict';

    var remove = /(?:active|nw-fm-left-icon|ui-droppable|filled|glow)/g;
    return $.trim($('.nw-fm-left-icon.active').attr('class').replace(remove, ''));
};
