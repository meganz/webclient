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
MegaData.prototype.buildtree = function _buildtree(n, dialog, stype, sDeepIndex) {
    'use strict'; /* jshint -W074, -W073 */

    if (!n) {
        console.error('Invalid node passed to M.buildtree');
        return false;
    }

    var folders = [];
    var _ts_l = (typeof treesearch !== 'undefined' && treesearch) ? treesearch.toLowerCase() : undefined;
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
                node = node.lastElementChild;
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

                /*
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
                    */

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
                if (name.toLowerCase().indexOf(_ts_l) === -1) {
                    node = document.getElementById(_li + curItemHandle);
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

            if (buildnode) {
                M.buildtree(folders[idx], dialog, stype, sDeepIndex + 1);
            }

            /*
             * XXX: if this was really needed, add it at DOM node creation
            if (fminitialized) {
                var currNode = M.d[curItemHandle];

                if ((currNode && currNode.shares) || M.ps[curItemHandle]) {
                    sharedUInode(curItemHandle);
                }

                if (currNode && currNode.lbl) {
                    M.colourLabelDomUpdate(curItemHandle, currNode.lbl);
                }
            }*/
        }// END of for folders loop
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
        var flag;

        if (!treesearch) {
            flag = M.buildtree.FORCE_REBUILD;
        }

        $('li.tree-item-on-search-hidden').removeClass('tree-item-on-search-hidden');

        if (M.currentrootid === M.RootID) {
            M.buildtree(M.d[M.RootID], flag);
        }
        if (M.currentrootid === M.InboxID) {
            M.buildtree(M.d[M.InboxID], flag);
        }
        else if (M.currentrootid === M.RubbishID) {
            M.buildtree({h: M.RubbishID}, flag);
        }
        else if (M.currentrootid === 'shares') {
            M.buildtree({h: 'shares'}, flag);
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

                delay('treesearch:keyup', function() {
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
