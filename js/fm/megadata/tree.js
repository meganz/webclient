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
    var levels = 1;
    var promise = new MegaPromise();
    var args = toArray.apply(null, arguments);

    // Retrieve whole cloud for copy/move dialogs...
    // FIXME: find a proper way to retrieve folders only
    /* TODO: make move/copy dialogs logic async
     if (dialog === 'copy-dialog' || dialog === 'move-dialog') {
     levels = -1;
     }*/
    /*
     if (dialog !== M.buildtree.FORCE_REBUILD && levels > 0 || pfid) {
     _buildtree.apply(M, args);
     promise.resolve();
     }
     else {
     var folders;

     if (n.h === 'shares') {

     folders = Object.keys(M.c[n.h] || {});
     }
     else {
     folders = [n.h];
     }

     dbfetch.geta(folders)
     .always(function() {
     _buildtree.apply(M, args);
     promise.resolve();
     });
     }

     return promise;
     };
     var _buildtree = function(n, dialog, stype) {*/

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

    var share = new mega.Share({});

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
        if (dialog.indexOf('copy-dialog') !== -1) {
            prefix = 'Copy' + stype;
        }
        else if (dialog.indexOf('move-dialog') !== -1) {
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
                    return !M.tree.shares[n.p];
                });
        }

        if (btd) {
            console.debug('Building tree', folders.map(function(n) {
                return n.h
            }));
        }

        var sortFn = this.getSortByNameFn();
        var sortDirection = (is_mobile) ? 1 : $.sortTreePanel[prefix].dir;
        folders.sort(
            function(a, b) {
                return sortFn(a, b, sortDirection);
            }
        );

        // In case of copy and move dialogs
        if (typeof dialog !== 'undefined') {
            _a = 'mctreea_';
            _li = 'mctreeli_';
            _sub = 'mctreesub_';
        }

        for (var idx = 0; idx < folders.length; idx++) {

            ulc = '';
            expandedc = '';
            buildnode = false;
            containsc = '';
            curItemHandle = folders[idx].h;
            undecryptableClass = '';
            titleTooltip = '';
            fIcon = '';

            fName = folders[idx].name;

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
            else if (share.isShareExist([curItemHandle], true, true, false)) {
                sharedfolder = ' shared-folder';
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

                // Undecryptable node indicators
                if (missingkeys[curItemHandle]) {
                    undecryptableClass = 'undecryptable';
                    fName = l[8686];
                    fIcon = 'generic';

                    var exportLink = new mega.Share.ExportLink({});
                    titleTooltip = exportLink.isTakenDown(curItemHandle) ? (l[7705] + '\n') : '';
                    titleTooltip += l[8595];
                }

                sExportLink = Object(this.su.EXP)[curItemHandle] ? 'linked' : '';
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

            if (fminitialized && !is_mobile) {
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
