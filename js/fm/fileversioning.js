var versiondialogid;
(function _fileversioning(global) {

    var current_sel_version = false;
    var ns = {
        /**
         * Get all the versions for given file handle in an async way.
         * If the versions are not loaded, it will load versions info into memory first.
         * @param h is expected to be a file handle.
         * @return It returns a list of handles of all the versions if everything works fine,
         * otherwise it returns list with current version.
         */
        getAllVersions: function(h) {
            var pms = new MegaPromise();

            dbfetch.tree([h], -1)
                .always(function() {
                    var versions = fileversioning.getAllVersionsSync(h);
                    pms.resolve(versions);
                });

            return pms;
        },

        /**
         * Get all the versions for given file handle.
         * @param h is expected to be a file handle.
         * @return It returns a list of handles of all the versions if everything works fine,
         *         otherwise it returns list with current version.
         */
        getAllVersionsSync: function(h) {
            var v = [];
            if (M.d[h]) {
                v.push(M.d[h]);
            }
            while (M.c[h]) {
                var k = Object.keys(M.c[h]);
                if (k.length !== 1 // the chain should be only 1 parent-child.
                        || M.c[h][k[0]] !== 1 // the node's parent chain stops.
                        || (M.d[k[0]] && M.d[k[0]].t !== 0) // the node's parent is not a file.
                        ) {
                    break;
                }
                v.push(M.d[k[0]]);
                h = k[0];
            }
            return v;
        },

        /**
         * Check whether ph is an older version of h or is h.
         * @param h is expected to be the file handle of the current file.
         * @param ph is expected to be the file handle of an older version.
         * @return It returns true if ph is an older version of h, otherwise false.
        */
        checkPreviousVersionSync: function(h, ph) {
            if (h === ph) {
                return true;
            }
            while (M.c[h]) {
                var k = Object.keys(M.c[h]);
                if (k.length !== 1 // the chain should be only 1 parent-child.
                        || M.c[h][k[0]] !== 1 // the node's parent chain stops.
                        || (M.d[k[0]] && M.d[k[0]].t !== 0) // the node's parent is not a file.
                        ) {
                    break;
                }
                if (k[0] === ph) {
                    return true;
                }
                h = k[0];
            }
            return false;
        },

        /**
         * Get the previous version for given file handle.
         * @param h is expected to be a file handle.
         * @return It returns the previous file of the given file handle, otherwise it returns false.
         */
        getPreviousVersionSync: function(h) {
            if (!M.c[h]) {
                return false;
            }
            var k = Object.keys(M.c[h]);
            if (k.length !== 1 // the chain should be only 1 parent-child.
                    || M.c[h][k[0]] !== 1 // the node's parent chain stops.
                    || (M.d[k[0]] && M.d[k[0]].t !== 0) // the node's parent is not a file.
                    ) {
                return false;
            }

            return M.d[k[0]];
        },

        /**
         * Get the top node of the given file node from versioning chain.
         * @param h is expected to be a file handle.
         * @return It returns the top node of the passed in node.
        */
        getTopNodeSync: function(h) {
            var node = h;
            while (M.d[h] && M.d[M.d[h].p]) {

                if (M.d[M.d[h].p].t !== 0) {// the node's parent is not a file.
                    node = h;
                    break;
                }

                h = M.d[h].p;
            }
            return node;
        },

        /**
         * Initialize file versioning dialog scrolling bar.
         */
        initFileVersioningScrolling: function () {
            var scroll = '.fm-versioning.scroll-bl';
            deleteScrollPanel(scroll, 'jsp');
            $(scroll).jScrollPane({enableKeyboardNavigation: false, showArrows: true, arrowSize: 5});
            jScrollFade(scroll);
        },

        /**
         * Close file versioning dialog if it is open.
         * @param {hanlde} del file hanle of the file to delete.
         */
        closeFileVersioningDialog: function (del) {
            if (!$('.fm-versioning').hasClass('hidden')) {
                if (del && $.selected && ($.selected.length === 0 || del === $.selected[0])) {
                    $('.fm-versioning').addClass('hidden');
                    current_sel_version = false;
                    versiondialogid = undefined;
                    $(document).off('keydown.fileversioningKeydown');
                }
                else {
                    fileversioning.updateFileVersioningDialog();
                }
            }
        },

        /**
         * delete all previous versions of a file.
         * @param {hanlde} h file hanle.
         */
        clearPreviousVersions: function (h) {
            fileversioning.getAllVersions(h).done(
                function(versions) {
                    var previousVersion = (versions && versions.length > 1) ? versions[1] : false;
                    if (previousVersion) {
                        api_req({
                                    a: 'd',
                                    n: previousVersion.h
                                });
                    }
                });
        },

        /**
         * set/remove favourite on all previous versions of a file.
         * @param {hanlde} h file hanle.
         * @param {Number} newFavState Favourites state 0 or 1
         */
        favouriteVersions: function (h, newFavState) {
            fileversioning.getAllVersions(h).done(
                function(versions) {
                    for (var i = 1; i < versions.length; i++) {
                        versions[i].fav = newFavState | 0;
                        if (!versions[i].fav) {
                            delete versions[i].fav;
                        }
                        api_setattr(versions[i], mRandomToken('fav'));
                    }
                });
        },

        /**
         * set/remove labels on all previous versions of a file.
         * @param {hanlde} h file hanle.
         * @param {Number} labelId Numeric value of label
         */
        labelVersions: function (h, labelId) {
            fileversioning.getAllVersions(h).done(
                function(versions) {
                    for (var i = 1; i < versions.length; i++) {
                        versions[i].lbl = labelId | 0;
                        if (!versions[i].lbl) {
                            delete versions[i].lbl;
                        }
                        api_setattr(versions[i], mRandomToken('lbl'));
                    }
                });
        },

        /**
         * update file versioning setting.
         */
        updateVersionInfo: function () {
            mega.attr.get(
                u_handle,
                'dv',
                -2,
                true
            )
            .done(function(r) {
                if (r === "0") {
                    $('#versioning-status').addClass('toggle-on');
                    fileversioning.dvState = 0;
                }
                else if (r === "1") {
                    $('#versioning-status').removeClass('toggle-on');
                    fileversioning.dvState = 1;
                }
            })
            .fail(function (e) {
                if (e === ENOENT) {
                    $('#versioning-status').addClass('toggle-on');
                    fileversioning.dvState = 0;
                }
            });

            var data = M.getDashboardData();
            var verionInfo = l[17582]
                    .replace('[X1]',
                    '<span class="versioning-text total-file-versions">' + data.versions.cnt + '</span>')
                    .replace('[X2]',
                    '<span class="versioning-text total-versions-size">' + bytesToSize(data.versions.size) + '</span>');

            $('.versioning-body-text.versioning-info-message').safeHTML(verionInfo);
        },

        /**
         * Open file versioning dialog and render file history versions list.
         * @param {hanlde} handle hanle of the file to render history versioning list.
         *                 if handle is not set, then it will use the default one, $.selected[0].
         */
        fileVersioningDialog: function (handle) {
            var pd = $('.fm-versioning');
            var fh = (!handle) ? $.selected[0] : handle;
            var f = M.d[fh];
            if (!f) {
                return;
            }
            versiondialogid = fh;
            var nodeData = M.d[fh];
            // are we in an inshare?
            while (nodeData && !nodeData.su) {
                nodeData = M.d[nodeData.p];
            }

            current_sel_version = (!current_sel_version) ? fh : current_sel_version;

            var revertVersion = function(handle, current_node) {

                var file = M.d[handle];
                var n = {
                    name: file.name,
                    hash: file.hash,
                    k: file.k
                };

                if (file.fav) {
                    n.fav = file.fav;
                }

                if (file.lbl) {
                    n.lbl = file.lbl;
                }

                var ea = ab_to_base64(crypto_makeattr(n));
                var dir = M.d[current_node].p || M.RootID;
                var share = M.getShareNodesSync(dir);
                var req = {
                    a: 'p',
                    t: dir,
                    n: [{
                        h: handle,
                        t: 0,
                        a: ea,
                        k: a32_to_base64(encrypt_key(u_k_aes, file.k)),
                        ov: current_node
                    }]
                };
                if (share.length) {

                    // repackage/-encrypt n for processing by the `p` API
                    var revertedNode = {};

                    // reverted files must retain their existing key
                    if (!file.t) {
                        revertedNode.k = file.k;
                    }

                    // new node inherits all attributes
                    revertedNode.a = ab_to_base64(crypto_makeattr(file, revertedNode));

                    // new node inherits handle, parent and type
                    revertedNode.h = n.h;
                    revertedNode.p = n.p;
                    revertedNode.t = n.t;
                    req.cr = crypto_makecr([revertedNode], share, false);
                }
                api_req(req, {
                    callback: function(res) {
                        if (typeof res === 'object' && res.f) {
                            selectionManager.clear_selection();
                            selectionManager.add_to_selection(res.f[0].h);
                        }
                    }
                });
            };
            var fillVersionList = function(versionList) {

                var html = '';
                var lastDate = false;
                for (var i = 0; i < versionList.length; i++) {

                    var v = versionList[i];
                    var curTimeMarker;
                    var msgDate = new Date(v.ts * 1000 || 0);
                    var iso = (msgDate.toISOString());
                    if (todayOrYesterday(iso)) {
                        // if in last 2 days, use the time2lastSeparator
                        curTimeMarker = time2lastSeparator(iso);
                    }
                    else {
                        // if not in the last 2 days, use 1st June [Year]
                        curTimeMarker = acc_time2date(v.ts, true);
                    }
                    //            <!-- Modification Date !-->
                    if (curTimeMarker !== lastDate) {
                        html += '<div class="fm-versioning data"><span>' + curTimeMarker + '</span></div>';
                    }
                    var actionHtml = (v.u === u_handle) ? l[16480]
                        : l[16476].replace('%1', M.u[v.u] && M.u[v.u].m || l[7381]);
                    if (i < versionList.length - 1) {
                        if (v.name !== versionList[i + 1].name) {
                            actionHtml = l[17156].replace('%1',
                            '<span class="light-grey italic">' + htmlentities(versionList[i + 1].name) + '</span>');
                        }
                    }

                    var mostRecentHtml = (i === 0) ? '<span class="red">(' + l[17149] + ')</span>' : '';
                    var radioClass  = (current_sel_version === v.h) ? 'radioOn' : 'radioOff';
                    var downBtnHtml = '<div class="button download-file" title="' + l[58] +
                            '" id=' + 'vdl_' + v.h + '>' +
                            '<i class="small-icon icons-sprite down-arrow"></i>' +
                            '</div>';
                    var revertBtnHtml = '<div class="button revert-file" title="' + l[16475] +
                            '" id=' + 'vrv_' + v.h + '>' +
                            '<i class="small-icon icons-sprite revert-small-arrow"></i>' +
                            '</div>';
                    // if the user does not have full access of the shared folder.
                    if ((nodeData && (nodeData.r < 2)) || (fileversioning.dvState === 1) ||
                    ((i === 0) && (fileversioning.getTopNodeSync(current_sel_version) === v.h))) {
                        revertBtnHtml = '<div class="button revert-file disabled nonclickable" title="' +
                            l[16475] + '" id=' + 'vrv_' + v.h + '>' +
                            '<i class="small-icon icons-sprite revert-small-arrow disabled nonclickable"></i>' +
                            '</div>';
                    }
                    var deleteBtnHtml = '<div class="button delete-file" title="' +
                            l[1730] + '" id=' + 'vde_' + v.h + '>' +
                            '<i class="small-icon icons-sprite filled-rubbish-bin"></i>' +
                            '</div>';
                    if (nodeData && (nodeData.r < 2)) {// if the user does not have full access of the shared folder.
                        deleteBtnHtml = '<div class="button delete-file disabled nonclickable" title="' +
                            l[1730] + '" id=' + 'vde_' + v.h + '>' +
                            '<i class="small-icon icons-sprite filled-rubbish-bin disabled nonclickable"></i>' +
                            '</div>';
                    }
                    html += // <!-- File Data Row !-->
                            '<div class="fm-versioning file-info-row" id=' + 'v_' + v.h + '>' +
                            '<div class="radio-input ' + radioClass + '">' +
                            '<input type="radio" name="versioning" class="' +
                            radioClass + '" value="1" id=' + 'r_' + v.h + '></div>' +
                            '<div class="medium-file-icon ' + fileIcon({'name' : v.name}) + '"></div>' +
                            '<div class="fm-versioning file-data table-cell">' +
                            '<div class="fm-versioning file-name">' +
                            '<span class="grey">' + htmlentities(v.name) + '</span>' +
                            '</div>' +
                            '<div class="fm-versioning file-info">' +
                            '<span class="size">' + bytesToSize(v.s) + '</span>' +
                            mostRecentHtml +
                            '</div>' +
                            '</div>' +
                            // <!-- Modification time !-->
                            '<div class="fm-versioning modified-time table-cell">' +
                            '<i class="small-icon icons-sprite clock"></i>' +
                            '<span>' +  msgDate.getHours() + ":" + addZeroIfLenLessThen(msgDate.getMinutes(), 2)
                            + '</span>' +
                            '</div>' +
                            // <!-- Modification info !-->
                            '<div class="fm-versioning modified-info table-cell">' +
                            // <!-- Classnames: "earth", "refresh-arrows", "mobile-device", "reverted-light-clock" !-->
                            '<span class="modified-info-txt">' +
                            actionHtml +
                            '</span>' +
                            // <!-- Buttons !-->
                            '<div class="fm-versioning buttons">' +
                            downBtnHtml +
                            revertBtnHtml +
                            deleteBtnHtml +
                            '</div>' +
                            // <!-- End of Buttons !-->
                            '</div>' +
                            '<div class="clear"></div>' +
                            '</div>';
                    lastDate = curTimeMarker;
                }
                return html;
            };

            var a2 = M.getPath(M.d[fh].p);
            var name;
            var pathHtml = '';
            for (var i in a2) {
                name = '';
                if (a2[i] === M.RootID) {
                    if (M.d[M.RootID]) {
                        name = l[164];
                    }
                }
                else if (a2[i] === 'contacts') {
                    name = l[165];
                }
                else if (a2[i] === 'opc') {
                    name = l[5862];
                }
                else if (a2[i] === 'ipc') {
                    name = l[5863];
                }
                else if (a2[i] === 'shares') {
                    name = l[5542];
                }
                else if (a2[i] === M.RubbishID) {
                    name = l[167];
                }
                else if (a2[i] === 'messages' || a2[i] === M.InboxID) {
                    name = l[166];
                }
                else {
                    var n = M.d[a2[i]];
                    if (n && n.name) {
                        name = n.name;
                    }
                }
                pathHtml = '<span>' + htmlentities(name) + '</span>' + pathHtml;
            }

            var refreshHeader = function(fileHandle) {
                if (((fileHandle === fh)
                        && (fileversioning.getTopNodeSync(fileHandle) === current_sel_version))
                        || (nodeData && (nodeData.r < 2)) || (fileversioning.dvState === 1)) {
                    $('.fm-versioning .pad .top-column .default-white-button .reverted-clock')
                        .parent()
                        .addClass("disabled nonclickable");
                }
                else {
                    $('.fm-versioning .pad .top-column .default-white-button .reverted-clock')
                        .parent()
                        .removeClass("disabled nonclickable");
                }
                if (nodeData && (nodeData.r < 2)) {
                    $('.fm-versioning .pad .top-column .default-white-button .rubbish-bin-icon')
                        .parent()
                        .addClass("disabled nonclickable");
                    $('.fm-versioning .pad .top-column .default-white-button .clock-with-cross')
                        .parent()
                        .addClass("disabled nonclickable");
                }
                else {
                    $('.fm-versioning .pad .top-column .default-white-button .rubbish-bin-icon')
                        .parent()
                        .removeClass("disabled nonclickable");
                    $('.fm-versioning .pad .top-column .default-white-button .clock-with-cross')
                        .parent()
                        .removeClass("disabled nonclickable");
                    if (M.d[fh].tvf) {
                        $('.fm-versioning .pad .top-column .default-white-button .clock-with-cross')
                            .parent()
                            .removeClass("disabled nonclickable");
                    }
                    else {
                        $('.fm-versioning .pad .top-column .default-white-button .clock-with-cross')
                            .parent()
                            .addClass("disabled nonclickable");
                    }
                }

                var f = M.d[fileHandle];
                var fnamehtml = '<span class="grey">' + htmlentities(f.name);

                $('.fm-versioning .header .pad .top-column .file-data .file-name').html(fnamehtml);

                $('.fm-versioning .header .pad .top-column .medium-file-icon')
                    .attr('class', 'medium-file-icon')
                    .addClass(fileIcon({'name':f.name}));

            };
            var fnamehtml = '<span class="grey">' + htmlentities(f.name);

            $('.fm-versioning .header .pad .top-column .file-data .file-name').html(fnamehtml);
            $('.fm-versioning .header .pad .top-column .file-data .file-path').html(pathHtml);
            $('.fm-versioning .header .pad .top-column .medium-file-icon').addClass(fileIcon({'name':f.name}));

            $('.fm-versioning .pad .top-column .default-white-button .down-arrow').parent()
                    .rebind('click', function() {
                M.addDownload([current_sel_version]);
            });

            $('.fm-versioning .pad .top-column .default-white-button .rubbish-bin-icon').parent()
                .rebind('click', function() {
                    $('.fm-versioning.overlay').addClass('arrange-to-back');
                    var apiReq = function(handle) {
                        api_req({
                            a: 'd',
                            n: handle,
                            v: 1
                        });
                    };
                    if (!$(this).hasClass('disabled')) {
                        msgDialog('remove', l[1003], l[13749], l[1007], function(e) {
                            if (e) {
                                apiReq(current_sel_version);
                                current_sel_version = false;
                            }
                            $('.fm-versioning.overlay').removeClass('arrange-to-back');
                        });
                    }
            });

            $('.fm-versioning .pad .top-column .default-white-button .reverted-clock').parent()
                    .rebind('click', function() {
                if (!$(this).hasClass('disabled')) {
                    revertVersion(current_sel_version, fh);
                }
            });

            $('.fm-versioning .header .button.close').rebind('click', function() {
                fileversioning.closeFileVersioningDialog(window.versiondialogid);
            });

            fileversioning.getAllVersions(fh).done(
                function(versions) {
                    var vh = fillVersionList(versions);
                    $('.fm-versioning .body .scroll-bl .content').html(vh);
                    $('.fm-versioning .body .file-info-row').rebind('click', function() {
                        $('.radio-input').removeClass('radioOn');
                        $('.radio-input').addClass('radioOff');
                        $('.radio-input', $(this)).removeClass('radioOff');
                        $('.radio-input', $(this)).addClass('radioOn');
                        current_sel_version = this.id.substring(2);
                        refreshHeader(this.id.substring(2));
                    });

                    $('.fm-versioning .body .file-info-row').rebind('dblclick.fileInfoRow', function() {
                        $('.radio-input').removeClass('radioOn');
                        $('.radio-input', $(this)).addClass('radioOn');
                        M.addDownload([this.id.substring(2)]);
                        current_sel_version = this.id.substring(2);
                        refreshHeader(this.id.substring(2));
                    });

                    $('input[type=radio]').change(function() {
                        $('.radio-input').removeClass('radioOn');
                        $(this).parent().addClass('radioOn');
                        current_sel_version = this.id.substring(2);
                        refreshHeader(this.id.substring(2));
                        if (current_sel_version === fileversioning.getTopNodeSync(current_sel_version)) {
                            $('#vrv_' + current_sel_version).addClass('disabled nonclickable');
                        }
                        else {
                            $('#vrv_' + current_sel_version).removeClass('disabled nonclickable');
                        }
                    });

                    $('.fm-versioning .buttons .button.download-file').rebind('click', function() {
                        M.addDownload([this.id.substring(4)]);
                        current_sel_version = this.id.substring(4);
                    });
                    $('.fm-versioning .buttons .button.revert-file').rebind('click', function() {
                        if (!$(this).hasClass('disabled')) {
                            revertVersion(this.id.substring(4), fh);
                            current_sel_version = this.id.substring(4);
                        }
                    });
                    $('.fm-versioning .buttons .button.delete-file').rebind('click', function() {
                        var apiReq = function(handle) {
                            api_req({a: 'd',
                                     n: handle,
                                     v: 1
                                    });
                        };
                        var self = this;
                        if (!$(this).hasClass('disabled')) {
                            $('.fm-versioning.overlay').addClass('arrange-to-back');
                            msgDialog('remove', l[1003], l[13749], l[1007], function(e) {
                                if (e) {
                                    apiReq(self.id.substring(4));
                                    current_sel_version = false;
                                }
                                $('.fm-versioning.overlay').removeClass('arrange-to-back');
                            });
                        }
                    });

                    $('.fm-versioning .pad .top-column .default-white-button .clock-with-cross').parent()
                    .rebind('click', function() {

                        if (!$(this).hasClass('disabled')) {
                            msgDialog('remove', l[1003], l[17154], l[1007], function(e) {
                                if (e) {
                                    fileversioning.clearPreviousVersions(fh);
                                    current_sel_version = fh;
                                }
                            });
                        }
                    });
                    refreshHeader(fh);
                    pd.removeClass('hidden');
                    // Init scrolling
                    fileversioning.initFileVersioningScrolling();
                });
            $(window).rebind('resize.fileversioning', SoonFc(function() {
                fileversioning.initFileVersioningScrolling();
            }));
            $(document).rebind('keydown.fileversioningKeydown', function(e) {
                if (e.keyCode === 8) { // Backspace
                    e.stopPropagation();
                    fileversioning.closeFileVersioningDialog(window.versiondialogid);
                }
            });
            $('.fm-versioning .header .button.settings').rebind('click', function() {
                pd.addClass('hidden');
                loadSubPage('fm/account/file-management');
            });
            pushHistoryState(page);
        },

        /**
         * Update file versioning dialog if it is open.
         *
         *
         * @param {hanlde} fileHandle file hanle of the file to update,
         * it is null, just do refresh based on the currently selected file.
         *
         */
        updateFileVersioningDialog: function (fileHandle) {
            var current_sel = fileHandle ? fileHandle : $.selected[0];
            var p = fileversioning.getTopNodeSync(current_sel);
            if (p) {
                // update node DOM.
                M.versioningDomUpdate(p);
            }
            if (!$('.fm-versioning').hasClass('hidden')) {
                if ($.selected.length === 0 ||
                    fileversioning.checkPreviousVersionSync(current_sel, $.selected[0]) ||
                    fileversioning.checkPreviousVersionSync($.selected[0], current_sel)) {
                    if (p) {
                        fileversioning.fileVersioningDialog(p);
                        $.selected[0] = p;
                    }
                }
            }
        }
    };
    ns.dvState = null;
    Object.defineProperty(global, 'fileversioning', {value: ns});
    ns = undefined;

    mBroadcaster.addListener('fm:initialized', function() {
        if (folderlink || !u_handle) {
            return;
        }

        mega.attr.get(u_handle, 'dv', -2, true).done(function(r) {
            fileversioning.dvState = r === "1" ? 1 : 0;
        });

        return 0xDEAD;
    });
})(this);

