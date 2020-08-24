function removeUInode(h, parent) {
    'use strict';

    var i = 0;
    var n = M.getNodeByHandle(h);

    // check subfolders
    if (n && n.t) {
        var cns = M.c[n.p];
        if (cns) {
            for (var cn in cns) {
                if (M.d[cn] && M.d[cn].t && cn !== h) {
                    i++;
                    break;
                }
            }
        }
    }

    // Update M.v it's used for at least preview slideshow
    for (var k = M.v.length; k--;) {
        var v = M.v[k].ch || M.v[k].h;
        if (v === h) {
            if (slideshowid === v) {
                (function(h) {
                    onIdle(function() {
                        slideshow(h, !h);
                    });
                })(slideshow_steps().backward[0]);
            }
            M.v.splice(k, 1);
            break;
        }
    }

    var hasItems = !!M.v.length;
    switch (M.currentdirid) {
        case "shares":
            $('#treeli_' + h).remove();// remove folder and subfolders
            if (!hasItems) {
                $('.files-grid-view .grid-table-header tr').remove();
                $('.fm-empty-cloud').removeClass('hidden');
            }
            break;
        case "contacts":

            //Clear left panel:
            $('#contact_' + h).fadeOut('slow', function() {
                $(this).remove();
            });

            //Clear right panel:
            $('.grid-table.contacts tr#' + h + ', .contacts-blocks-scrolling a#' + h)
                .fadeOut('slow', function() {
                    $(this).remove();
                });

            // clear the contacts grid:
            $('.contacts-grid-view #' + h).remove();
            if (!hasItems) {
                $('.contacts-grid-view .contacts-grid-header tr').remove();
                $('.fm-empty-contacts .fm-empty-cloud-txt').text(l[784]);
                $('.fm-empty-contacts').removeClass('hidden');
            }
            break;
        case "chat":
            if (!hasItems) {
                $('.contacts-grid-view .contacts-grid-header tr').remove();
                $('.fm-empty-chat').removeClass('hidden');
            }
            break;
        case M.RubbishID:
            if (i == 0 && n) {
                $('#treea_' + n.p).removeClass('contains-folders expanded');
            }

            // Remove item
            $('#' + h).remove();

            // Remove folder and subfolders
            $('#treeli_' + h).remove();
            if (!hasItems) {
                $('.contacts-grid-view .contacts-grid-header tr').remove();
                $('.fm-empty-trashbin').removeClass('hidden');
                $('.fm-clearbin-button').addClass('hidden');
            }
            break;
        case M.RootID:
            if (i == 0 && n) {
                $('#treea_' + n.p).removeClass('contains-folders expanded');
            }

            // Remove item
            $('#' + h).remove();

            // Remove folder and subfolders
            $('#treeli_' + h).remove();
            if (!hasItems) {
                $('.files-grid-view').addClass('hidden');
                $('.grid-table.fm tr').remove();

                if (folderlink) {
                    $('.fm-empty-folder').removeClass('hidden');
                }
                else {
                    $('.fm-empty-cloud').removeClass('hidden');
                }
            }
            break;
        default:
            if (M.chat || M.currentdirid.indexOf('fm/user-management') >= 0) {
                break;
            }
            if (i == 0 && n) {
                $('#treea_' + n.p).removeClass('contains-folders expanded');
            }
            $('#' + h).remove();// remove item
            $('#treeli_' + h).remove();// remove folder and subfolders
            if (!hasItems) {
                if (sharedFolderUI()) {
                    M.emptySharefolderUI();
                }
                else {
                    $('.files-grid-view').addClass('hidden');
                    $('.fm-empty-folder').removeClass('hidden');
                }
                $('.grid-table.fm tr').remove();
            }
            break;
    }

    if (M.megaRender && M.megaRender.megaList) {
        if (parent) {
            // this was a move node op
            if (parent === M.currentdirid || parent === M.currentCustomView.nodeID) {
                // the node was moved out of the current viewport, so lets remove it from the MegaList
                M.megaRender.megaList.remove(h);
            }
        }
        else {
            M.megaRender.megaList.remove(h);
        }
    }

    if (M.currentCustomView.nodeID === h || M.isCircular(h, M.currentCustomView.nodeID) === true) {
        parent = parent || M.getNodeParent(n || h) || M.getNodeRoot(h);
        parent = parent === M.RootID ? M.currentCustomView.type : (M.currentCustomView.prefixPath + parent);

        // if parent is exist on M.su.EXP
        delay('openfolder', M.openFolder.bind(M, parent));
    }
    else if (M.currentdirid === h || M.isCircular(h, M.currentdirid) === true) {
        parent = parent || M.getNodeParent(n || h) || M.getNodeRoot(h);
        delay('openfolder', M.openFolder.bind(M, parent));
    }
}

/**
 * Remove nodes
 * @param {Array|String} selectedNodes An array of node handles.
 * @returns {MegaPromise}
 */
function fmremove(selectedNodes) {
    'use strict';

    var promise = new MegaPromise();
    var handles;

    if (selectedNodes) {
        if (!Array.isArray(selectedNodes)) {
            selectedNodes = [selectedNodes];
        }
    }
    else {
        selectedNodes = $.selected || [];
    }
    handles = selectedNodes.concat();

    dbfetch.coll(handles)
        .always(function() {
            var doRemoveShare = handles.some(function(h) {
                return M.d[h] && M.d[h].su;
            });

            if (doRemoveShare) {
                var promises = [];

                for (var i = handles.length; i--;) {
                    promises.push(M.leaveShare(handles[i]));
                }

                promise.linkDoneAndFailTo(MegaPromise.allDone(promises));
            }
            else {
                fmremovesync(selectedNodes);
                promise.resolve();
            }
        });

    return promise;
}

function fmremovesync(selectedNodes) {
    'use strict';

    var i = 0;
    var filecnt = 0;
    var foldercnt = 0;
    var contactcnt = 0;
    var removesharecnt = 0;
    var title = '';
    var message = '';

    // If on mobile we will bypass the warning dialog prompts
    if (is_mobile) {
        localStorage.skipDelWarning = '1';
    }

    for (i = 0; i < selectedNodes.length; i++) {
        var n = M.d[selectedNodes[i]];

        if (n && n.su) {
            removesharecnt++;
        }
        else if (String(selectedNodes[i]).length === 11) {
            contactcnt++;
        }
        else if (n && n.t) {
            foldercnt++;
        }
        else {
            filecnt++;
        }
    }

    if (removesharecnt) {
        for (i = 0; i < selectedNodes.length; i++) {
            M.leaveShare(selectedNodes[i]);
        }
        M.openFolder('shares', true);
    }

    // Remove contacts from list
    else if (contactcnt) {

        var c = selectedNodes.length;
        var replaceString = '';
        var sharedFoldersAlertMessage = l[7872];

        if (c > 1) {
            replaceString = c + ' ' + l[5569];
            sharedFoldersAlertMessage = l[17974];
        }
        else {
            var contactName = escapeHTML(M.getNameByHandle(selectedNodes[0]) || '');
            replaceString = '<strong>' + contactName + '</strong>';
            sharedFoldersAlertMessage = sharedFoldersAlertMessage.replace('[X]', contactName);
        }

        msgDialog('delete-contact', l[1001], l[1002].replace('[X]', replaceString), sharedFoldersAlertMessage,
            function(e) {
                if (e) {
                    for (i = 0; i < selectedNodes.length; i++) {
                        var selected = selectedNodes[i];

                        if (M.c[selected]) {
                            Object.keys(M.c[selected])
                                .forEach(function(sharenode) {
                                    M.leaveShare(sharenode);
                                });
                        }

                        api_req({a: 'ur2', u: selected, l: '0', i: requesti});
                        M.handleEmptyContactGrid();
                    }
                }
            });
        if (c > 1) {
            $('#msgDialog').addClass('multiple');
            $('.fm-del-contacts-number').text(selectedNodes.length);
            $('#msgDialog .fm-del-contact-avatar').attr('class', 'fm-del-contact-avatar');
            $('#msgDialog .fm-del-contact-avatar span').empty();
        }
        else {
            var user = M.u[selectedNodes[0]];
            var avatar = useravatar.contact(user, 'avatar-remove-dialog');

            $('#msgDialog .fm-del-contact-avatar').html(avatar);
        }
    }

    // Remove selected nodes from rubbish bin
    else if (M.getNodeRoot(selectedNodes[0]) === M.RubbishID) {

        var dlgMessage = '';
        var toastMessage = '';

        if ((filecnt === 1) && (!foldercnt)) {
            dlgMessage = l[13749];// 1 file
            toastMessage = l[13757];
        }
        else if ((filecnt > 1) && (!foldercnt)) {
            dlgMessage = l[13750].replace('%1', filecnt);
            toastMessage = l[13758].replace('%1', filecnt);
        }
        else if ((!filecnt) && (foldercnt === 1)) {
            dlgMessage = l[13751];// 1 folder
            toastMessage = l[13759];
        }
        else if ((!filecnt) && (foldercnt > 1)) {
            dlgMessage = l[13752].replace('%1', foldercnt);
            toastMessage = l[13760].replace('%1', foldercnt);
        }
        else if ((filecnt === 1) && (foldercnt === 1)) {
            dlgMessage = l[13753];// 1 file 1 folder
            toastMessage = l[13761];
        }
        else if ((filecnt === 1) && (foldercnt > 1)) {
            dlgMessage = l[13754].replace('%1', foldercnt);
            toastMessage = l[13762].replace('%1', foldercnt);
        }
        else if ((filecnt > 1) && (foldercnt === 1)) {
            dlgMessage = l[13755].replace('%1', filecnt);
            toastMessage = l[13763].replace('%1', filecnt);
        }
        else if ((filecnt > 1) && (foldercnt > 1)) {
            dlgMessage = l[13756].replace('%1', filecnt).replace('%2', foldercnt);
            toastMessage = l[13764].replace('%1', filecnt).replace('%2', foldercnt);
        }

        msgDialog('clear-bin:' + l[83], l[1003], dlgMessage, l[1007], function(e) {
            if (e) {
                var tmp = null;
                if (String(M.currentdirid).substr(0, 7) === 'search/') {
                    tmp = M.currentdirid;
                    M.currentdirid = M.getNodeByHandle(selectedNodes[0]).p || M.RubbishID;
                }
                M.clearRubbish(false)
                    .always(function() {
                        if (tmp) {
                            M.currentdirid = tmp;
                        }
                    })
                    .done(function() {
                        showToast('settings', toastMessage);
                    });
            }
        });
    }

    // Remove contacts
    else if (M.getNodeRoot(selectedNodes[0]) === 'contacts') {
        if (localStorage.skipDelWarning) {
            M.copyNodes(selectedNodes, M.RubbishID, true);
        }
        else {
            title = l[1003];
            message = l[1004].replace('[X]', fm_contains(filecnt, foldercnt));

            msgDialog('confirmation', title, message, false, function(e) {
                    if (e) {
                        M.copyNodes(selectedNodes, M.RubbishID, 1);
                    }
                }, true);
        }
    }
    else {
        var moveToRubbish = function() {
            loadingDialog.pshow();
            M.moveToRubbish(selectedNodes).always(loadingDialog.phide.bind(loadingDialog)).done(function () {
                // Re-render the search result page after files being removed
                if (M.currentdirid.split("/")[0] === "search") {
                    M.openFolder(M.currentdirid, true);
                }
            });
        };

        if (localStorage.skipDelWarning) {
            moveToRubbish();
        }
        else {
            title = l[1003];
            message = escapeHTML(l[1004]).replace('[X]', fm_contains(filecnt, foldercnt));

            msgDialog('remove', title, message, l[1952] + ' ' + l[7410], function(yes) {
                if (yes) {
                    moveToRubbish();
                }
            }, true);
        }
    }
}

/**
 * Generate file manager contains text message
 *
 * @param {Number} filecnt          The number of files
 * @param {Number} foldercnt        The number of folders
 * @param {Boolean} lineBreak       Indicate needs a line break or not
 * @returns {String} containstext   Contains text message
 */
function fm_contains(filecnt, foldercnt, lineBreak) {

    "use strict";

    var containstxt = l[782];

    if ((foldercnt > 1) && (filecnt > 1) && lineBreak) {
        containstxt = l[832].replace('[X]', foldercnt) + '<br>' + l[833].replace('[X]', filecnt);
    }
    else if ((foldercnt > 1) && (filecnt > 1)) {
        containstxt = l[828].replace('[X1]', foldercnt).replace('[X2]', filecnt);
    }
    else if ((foldercnt > 1) && (filecnt === 1) && lineBreak) {
        containstxt = l[832].replace('[X]', foldercnt) + '<br>' + l[835];
    }
    else if ((foldercnt > 1) && (filecnt === 1)) {
        containstxt = l[829].replace('[X]', foldercnt);
    }
    else if ((foldercnt === 1) && (filecnt > 1) && lineBreak) {
        containstxt = l[834] + '<br>' + l[833].replace('[X]', filecnt);
    }
    else if ((foldercnt === 1) && (filecnt > 1)) {
        containstxt = l[830].replace('[X]', filecnt);
    }
    else if ((foldercnt === 1) && (filecnt === 1)) {
        containstxt = l[831];
    }
    else if (foldercnt > 1) {
        containstxt = l[832].replace('[X]', foldercnt);
    }
    else if (filecnt > 1) {
        containstxt = l[833].replace('[X]', filecnt);
    }
    else if (foldercnt === 1) {
        containstxt = l[834];
    }
    else if (filecnt === 1) {
        containstxt = l[835];
    }

    return containstxt;
}


function fmremdupes(test) {
    var hs = {}, i, f = [], s = 0;
    var cRootID = M.currentrootid;
    loadingDialog.show();
    for (i in M.d) {
        var n = M.d[i];
        if (n && n.hash && n.h && M.getNodeRoot(n.h) === cRootID) {
            if (!hs[n.hash]) {
                hs[n.hash] = [];
            }
            hs[n.hash].push(n.h);
        }
    }
    for (i in hs) {
        var h = hs[i];
        while (h.length > 1)
            f.push(h.pop());
    }
    for (i in f) {
        console.debug('Duplicate node: ' + f[i] + ' at ~/'
            + M.getPath(f[i]).reverse().map(function(n) {
                return M.d[n].name || ''
            }).filter(String).join("/"));
        s += M.d[f[i]].s | 0;
    }
    loadingDialog.hide();
    console.log('Found ' + f.length + ' duplicated files using a sum of ' + bytesToSize(s));
    if (!test && f.length) {
        fmremove(f);
    }
    return f.length;
}
