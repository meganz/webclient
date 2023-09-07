var versiondialogid;
(function _fileversioning(global) {
    'use strict';

    var current_sel_version = [];
    var ns = {
        /**
         * Get all the versions for given file handle in an async way.
         * If the versions are not loaded, it will load versions info into memory first.
         * @param h is expected to be a file handle.
         * @return It returns a list of handles of all the versions if everything works fine,
         * otherwise it returns list with current version.
         */
        async getAllVersions(h) {
            await dbfetch.tree([h], -1).catch(dump);
            return this.getAllVersionsSync(h);
        },

        /**
         * Get all the versions for given file handle.
         * @param {String} h is expected to be a file handle.
         * @return {Array} an array of ufs-nodes of all the versions if everything works fine,
         *         otherwise it returns list with current version.
         */
        getAllVersionsSync: function(h) {
            return this.getVersionHandles(h, true).map(h => M.d[h]);
        },

        /**
         * Get all the versions for given file handle.
         * @param {String} h is expected to be a file handle.
         * @param {Boolean} [includeroot] include {@h} in result.
         * @returns {Array} ufs-node's handles of all the versions.
         */
        getVersionHandles(h, includeroot = false) {
            const res = includeroot ? [h] : [];

            while (M.c[h]) {
                h = this.getChildVersion(h);
                if (h) {
                    res.push(h);
                }
            }
            return res;
        },

        /**
         * Retrieve a single version child
         * @param {String} h is expected to be a file handle.
         * @returns {Boolean|String} child handle or false
         */
        getChildVersion(h) {
            const c = Object.keys(M.c[h]);
            // 1. the chain should be 1 parent-child.
            // 2. the node's parent chain stops.
            // 3. the node's parent is a file.
            return c.length === 1 && M.c[h][c[0]] === 1 && (!M.d[c[0]] || !M.d[c[0]].t) && c[0];
        },

        /**
         * Check whether ph is an older version of h or is h.
         * @param h is expected to be the file handle of the current file.
         * @param ph is expected to be the file handle of an older version.
         * @return It returns true if ph is an older version of h, otherwise false.
         */
        checkPreviousVersionSync: function(h, ph) {
            return h === ph || this.getVersionHandles(h).includes(ph);
        },

        /**
         * Get the previous version for given file handle.
         * @param h is expected to be a file handle.
         * @return It returns the previous file of the given file handle, otherwise it returns false.
         */
        getPreviousVersionSync: function(h) {
            return M.c[h] && M.d[this.getChildVersion(h)] || false;
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
         * Close file versioning dialog if it is open.
         * @param {hanlde} del file hanle of the file to delete.
         */
        closeFileVersioningDialog: function (del) {
            if (!$('.fm-versioning').hasClass('hidden')) {
                if (del && $.selected && ($.selected.length === 0 || del === $.selected[0])) {
                    $('.fm-versioning').addClass('hidden');
                    current_sel_version = [];
                    versiondialogid = undefined;
                    $(document).off('keydown.fileversioningKeydown');
                    $(window).unbind('resize.fileversioning');

                    mBroadcaster.sendMessage('mega:close_fileversioning');
                }
                else {
                    fileversioning.updateFileVersioningDialog();
                }
            }
        },

        /**
         * delete all previous versions of a file.
         * @param {String} h ufs-node handle
         * @returns {Promise<*>}
         */
        clearPreviousVersions: function (h) {
            return fileversioning.getAllVersions(h)
                .then((versions) => {
                    var previousVersion = versions && versions.length > 1 ? versions[1] : false;
                    if (previousVersion) {
                        return api.screq({a: 'd', n: previousVersion.h});
                    }
                });
        },

        /**
         * set/remove favourite on all previous versions of a file.
         * @param {hanlde} h file hanle.
         * @param {Number} newFavState Favourites state 0 or 1
         */
        favouriteVersions: function (h, newFavState) {
            return fileversioning.getAllVersions(h)
                .then((versions) => {
                    const promises = [];
                    for (let i = 1; i < versions.length; i++) {
                        promises.push(api.setNodeAttributes(versions[i], {fav: newFavState | 0}));
                    }
                    return Promise.allSettled(promises);
                });
        },

        /**
         * set/remove labels on all previous versions of a file.
         * @param {hanlde} h file hanle.
         * @param {Number} labelId Numeric value of label
         */
        labelVersions: function (h, labelId) {
            return fileversioning.getAllVersions(h)
                .then((versions) => {
                    const promises = [];
                    for (let i = 1; i < versions.length; i++) {
                        promises.push(api.setNodeAttributes(versions[i], {lbl: labelId | 0}));
                    }
                    return Promise.allSettled(promises);
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
            ).done(r => {
                if (r === "0") {
                    $('#versioning-status').addClass('toggle-on').trigger('update.accessibility');
                    fileversioning.dvState = 0;
                }
                else if (r === "1") {
                    $('#versioning-status').removeClass('toggle-on').trigger('update.accessibility');
                    fileversioning.dvState = 1;
                }
            }).fail(e => {
                if (e === ENOENT) {
                    $('#versioning-status').addClass('toggle-on').trigger('update.accessibility');
                    fileversioning.dvState = 0;
                }
            });

            var data = M.getDashboardData();

            var $deleteButton = $('button#delete-all-versions').removeClass('disabled');
            if (data.versions.cnt === 0) {
                $deleteButton.addClass('disabled');
            }
            const verionInfo = mega.icu.format(l.version_file_summary, data.versions.cnt)
                .replace('[X]',
                         `<span class="versioning-text total-versions-size">${bytesToSize(data.versions.size)}</span>`);

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

            current_sel_version = current_sel_version.length ? current_sel_version : [fh];

            var revertVersion = function(handle, current_node) {
                if (M.isInvalidUserStatus()) {
                    return;
                }

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
                var share = M.getShareNodesSync(dir, null, true);
                var req = {
                    a: 'p',
                    t: dir,
                    n: [{
                        h: handle,
                        t: 0,
                        a: ea,
                        k: a32_to_base64(encrypt_key(u_k_aes, file.k)),
                        fa: file.fa,
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

                api.screq(req)
                    .then(({handle}) => {
                        $.selected = [handle];
                        reselect();
                    })
                    .catch(dump);
            };

            var fillVersionList = function(versionList) {

                var html = '';
                var lastDate = false;
                let firstHeader = true;
                for (var i = 0; i < versionList.length; i++) {

                    var v = versionList[i];
                    var curTimeMarker;
                    var msgDate = new Date(v.ts * 1000 || 0);
                    var iso = (msgDate.toISOString());
                    const isCurrentVersion = i === 0;

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
                        if (firstHeader) {
                            firstHeader = false;
                        }
                        else {
                            html += '</table>';
                        }
                        html += '<div class="fm-versioning data">' + curTimeMarker + '</div><table class="data-table">';
                    }
                    var actionHtml = (v.u === u_handle) ? l[16480]
                        : l[16476].replace('%1', M.u[v.u] && M.u[v.u].m || l[7381]);
                    if (i < versionList.length - 1) {
                        if (v.name !== versionList[i + 1].name) {
                            actionHtml = l[17156].replace(
                                '%1',
                                '<span>' + htmlentities(versionList[i + 1].name) + '</span>');
                        }
                    }

                    var mostRecentHtml = isCurrentVersion ? '<span class="current">(' + l[17149] + ')</span>' : '';
                    var activeClass  = current_sel_version.includes(v.h) ? 'active' : '';
                    var downBtnHtml =
                        `<div class="mega-button small action download-file simpletip"
                            data-simpletip="${l[58]}"
                            aria-label="${l[58]}"
                            id="vdl_${v.h}">
                            <i class="sprite-fm-mono icon-download-small"></i>
                        </div>`;
                    var viewBtnHtml =
                        `<div class="mega-button small action preview-file simpletip"
                            data-simpletip="${l.version_preview}"
                            aria-label="${l.version_preview}"
                            id="vdl_${v.h}">
                            <i class="sprite-fm-mono icon-file-edit"></i>
                        </div>`;
                    var revertBtnHtml =
                        `<div class="mega-button small action revert-file simpletip"
                            data-simpletip="${l[16475]}"
                            aria-label="${l[16475]}"
                            id="vrv_${v.h}">
                            <i class="sprite-fm-mono icon-versions-previous"></i>
                        </div>`;
                    // if the user does not have full access of the shared folder.
                    if (nodeData && nodeData.r < 2
                            || i === 0
                                && fileversioning.getTopNodeSync(current_sel_version[0]) === v.h
                    ) {
                        revertBtnHtml =
                            `<div class="mega-button small action revert-file disabled nonclickable simpletip"
                                data-simpletip="${l[16475]}"
                                aria-label="${l[16475]}"
                                id="vrv_${v.h}">
                                <i class="sprite-fm-mono icon-versions-previous disabled nonclickable"></i>
                            </div>`;
                    }
                    var deleteBtnHtml =
                        `<div class="mega-button small action delete-file simpletip"
                            data-simpletip="${l[1730]}"
                            aria-label="${l[1730]}"
                            id="vde_${v.h}">
                            <i class="sprite-fm-mono icon-bin"></i>
                        </div>`;
                    if ((nodeData && nodeData.r < 2) || !M.d[fh].tvf) {// if the user does not have full access of the shared folder.
                        deleteBtnHtml =
                            `<div class="mega-button small action delete-file disabled nonclickable"
                                data-simpletip="${l[1730]}"
                                aria-label="${l[1730]}"
                                id="vde_${v.h}">
                                <i class="sprite-fm-mono icon-bin disabled nonclickable"></i>
                            </div>`;
                    }

                    // If from backup
                    if (M.getNodeRoot(v.h) === M.InboxID) {
                        revertBtnHtml = ``;
                        if (isCurrentVersion) {
                            deleteBtnHtml = ``;
                        }
                    }

                    html += // <!-- File Data Row !-->
                            `<tr class="fm-versioning file-info-row ${activeClass}" id=v_${v.h}>
                                <td class="fm-versioning file-icon">
                                    <div class="medium-file-icon ${fileIcon({name : v.name})}"></div>
                                </td>
                                <td class="fm-versioning file-data">
                                    <div class="fm-versioning file-name">
                                        <span>${htmlentities(v.name)}</span>
                                    </div>
                                    <div class="fm-versioning file-info">
                                        <span class="size">${bytesToSize(v.s)}</span>
                                        <span>${mostRecentHtml}</span>
                                    </div>
                                </td>
                                ${/* Modification time */''}
                                <td class="fm-versioning modified-time">
                                    <i class="sprite-fm-uni icon-history"></i>
                                    <span>
                                        ${msgDate.getHours()}:${addZeroIfLenLessThen(msgDate.getMinutes(), 2)}
                                    </span>
                                </td>
                                ${/* Modification info */''}
                                <td class="fm-versioning modified-info">
                                    ${/* Classnames: "earth", "refresh-arrows",
                                    "mobile-device", "reverted-light-clock" */''}
                                    <span class="modified-info-txt">
                                        ${actionHtml}
                                    </span>
                                </td>
                                <td class="fm-versioning button-container">
                                    ${/* Buttons */''}
                                    <div class="fm-versioning buttons">
                                        ${downBtnHtml}
                                        ${viewBtnHtml}
                                        ${revertBtnHtml}
                                        ${deleteBtnHtml}
                                    </div>
                                    ${/* End of Buttons */''}
                                </td>
                            </tr>`;
                    lastDate = curTimeMarker;
                }
                html += '</table>';
                return html;
            };

            var a2 = M.getPath(M.d[fh].p);
            var name;
            var pathHtml = '';
            for (var i in a2) {
                let hasArrow = false;
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
                else if (M.BackupsId && a2[i] === M.BackupsId) {
                    name = l.restricted_folder_button;
                    hasArrow = false;
                }
                else if (a2[i] === 'messages') {
                    name = l[166];
                }
                else {
                    var n = M.d[a2[i]];
                    if (n && n.name) {
                        name = n.name;
                        hasArrow = true;
                    }
                }

                if (name) {
                    name = htmlentities(name);
                    pathHtml =
                        `<span>
                            ${hasArrow ? '<i class="sprite-fm-mono icon-arrow-right"></i>' : ''}
                            <span class="simpletip" data-simpletip="${name}">${name}</span>
                        </span>` + pathHtml;
                }
            }

            var refreshHeader = function(fileHandle) {

                const headerSelect = '.fm-versioning .pad .top-column';
                const $rvtBtn = $('button.js-revert', headerSelect);
                const $delBtn = $('button.js-delete', headerSelect);
                const $clrBtn = $('button.js-clear-previous', headerSelect);
                const topNodeHandle = fileversioning.getTopNodeSync(fileHandle);

                if (current_sel_version.length > 1
                    || current_sel_version[0] === topNodeHandle
                    || nodeData && nodeData.r < 2
                ) {

                    $rvtBtn.addClass("disabled nonclickable");
                }
                else {
                    $rvtBtn.removeClass("disabled nonclickable");
                }

                if (nodeData && (nodeData.r < 2)) {
                    $delBtn.addClass("disabled nonclickable");
                    $clrBtn.addClass("disabled nonclickable");
                }
                else {
                    if (!M.d[fh].tvf || current_sel_version.length === M.d[fh].tvf + 1) {
                        $delBtn.addClass("disabled nonclickable");
                    }
                    else {
                        $delBtn.removeClass("disabled nonclickable");
                    }
                    if (M.d[fh].tvf) {
                        $clrBtn.removeClass("disabled nonclickable");
                    }
                    else {
                        $clrBtn.addClass("disabled nonclickable");
                    }
                }

                // If from backup
                if (M.getNodeRoot(fileHandle) === M.InboxID) {
                    $rvtBtn.addClass("disabled nonclickable");
                    if (current_sel_version.includes(topNodeHandle)) {
                        $delBtn.addClass("disabled nonclickable");
                    }
                }

                var f = M.d[fileHandle];
                var fnamehtml = '<span>' + htmlentities(f.name);

                $('.fm-versioning .header .pad .top-column .file-data .file-name').html(fnamehtml);

                $('.fm-versioning .header .pad .top-column .medium-file-icon')
                    .attr('class', 'medium-file-icon')
                    .addClass(fileIcon({'name':f.name}));

            };
            var fnamehtml = '<span>' + htmlentities(f.name);

            $('.fm-versioning .header .pad .top-column .file-data .file-name').html(fnamehtml);
            $('.fm-versioning .header .pad .top-column .file-data .file-path').html(pathHtml);
            $('.fm-versioning .header .pad .top-column .medium-file-icon').addClass(fileIcon({'name':f.name}));

            $('.fm-versioning .pad .top-column button.js-download').rebind('click', () => {
                M.addDownload(current_sel_version);
            });

            $('.fm-versioning .pad .top-column button.js-delete')
                .rebind('click', function() {
                    if (M.isInvalidUserStatus()) {
                        return;
                    }
                    $('.fm-versioning.overlay').addClass('arrange-to-back');

                    if (!$(this).hasClass('disabled')) {

                        const msg = mega.icu.format(l[13750], current_sel_version.length);

                        msgDialog('remove', l[1003], msg, l[1007], e => {
                            if (e) {
                                api.screq(current_sel_version.map((n) => ({n, a: 'd', v: 1}))).catch(dump);
                                current_sel_version = [];
                            }
                            $('.fm-versioning.overlay').removeClass('arrange-to-back');
                        });
                    }
            });

            $('.fm-versioning .pad .top-column button.js-revert').rebind('click', function() {
                if (!$(this).hasClass('disabled')) {
                    revertVersion(current_sel_version[0], fh);
                }
            });

            $('.fm-versioning .button.close').rebind('click', function() {
                fileversioning.closeFileVersioningDialog(window.versiondialogid);
            });

            $('.pad .top-column button.js-preview', '.fm-versioning').rebind('click.version', () => {
                fileversioning.previewFile(current_sel_version[0]);
            });

            fileversioning.getAllVersions(fh)
                .then((versions) => {
                    var vh = fillVersionList(versions);
                    const $scrollBlock = $('.fm-versioning.scroll-bl', '.fm-versioning .body');

                    $('.fm-versioning .body .scroll-bl .content').html(vh);
                    $('.fm-versioning .body .file-info-row').rebind('click', function(e) {
                        if (!e.shiftKey) {
                            $('.fm-versioning .body .file-info-row').removeClass('active');
                            current_sel_version = [];
                        }

                        if (this.classList.contains('active')) {

                            this.classList.remove('active');
                            current_sel_version.splice(current_sel_version.indexOf(this.id.substring(2)), 1);
                        }
                        else {
                            this.classList.add('active');
                            current_sel_version.push(this.id.substring(2));
                        }
                        refreshHeader(this.id.substring(2));
                    });

                    $('.fm-versioning .body .file-info-row').rebind('dblclick.fileInfoRow', function(e) {

                        if (!e.shiftKey) {
                            $('.fm-versioning .body .file-info-row').removeClass('active');
                            $(this).addClass('active');
                            M.addDownload([this.id.substring(2)]);
                            current_sel_version = [this.id.substring(2)];
                            refreshHeader(this.id.substring(2));
                        }
                    });

                    $('.fm-versioning .buttons .download-file').rebind('click', function(e) {

                        if (e.shiftKey && current_sel_version.length > 0) {
                            $('.fm-versioning .body .file-info-row').removeClass('active');
                            this.closest('.file-info-row').classList.add('active');
                        }
                        M.addDownload([this.id.substring(4)]);
                        current_sel_version = [this.id.substring(4)];
                    });

                    $('.fm-versioning .buttons .revert-file').rebind('click', function(e) {
                        if (!$(this).hasClass('disabled')) {

                            if (e.shiftKey && current_sel_version.length > 0) {
                                $('.fm-versioning .body .file-info-row').removeClass('active');
                                this.closest('.file-info-row').classList.add('active');
                            }

                            revertVersion(this.id.substring(4), fh);
                            current_sel_version = [this.id.substring(4)];
                        }
                    });

                    $('.fm-versioning .buttons .delete-file').rebind('click', function(e) {
                        if (M.isInvalidUserStatus()) {
                            return;
                        }
                        if (!$(this).hasClass('disabled')) {
                            const n = this.id.substr(4);

                            if (e.shiftKey && current_sel_version.length > 0) {
                                $('.fm-versioning .body .file-info-row').removeClass('active');
                                this.closest('.file-info-row').classList.add('active');
                            }

                            $('.fm-versioning.overlay').addClass('arrange-to-back');
                            msgDialog('remove', l[1003], mega.icu.format(l[13750], 1), l[1007], e => {
                                if (e) {
                                    current_sel_version = [];
                                    api.screq({a: 'd', n, v: 1}).catch(dump);
                                }
                                $('.fm-versioning.overlay').removeClass('arrange-to-back');
                            });
                        }
                    });

                    $('.fm-versioning .pad .top-column button.js-clear-previous')
                        .rebind('click', function() {
                            if (M.isInvalidUserStatus()) {
                                return;
                            }

                            if (!$(this).hasClass('disabled')) {
                                msgDialog('remove', l[1003], mega.icu.format(l[17154], 1), l[1007], e => {
                                    if (e) {
                                        fileversioning.clearPreviousVersions(fh);
                                        current_sel_version = [fh];
                                    }
                                });
                            }
                        });
                    $('.buttons .preview-file', '.fm-versioning').rebind('click.version', function() {
                        fileversioning.previewFile($(this).prop('id').substring(4));
                    });
                    refreshHeader(fh);
                    pd.removeClass('hidden');
                    // Init scrolling
                    initPerfectScrollbar($scrollBlock);
                    $(window).rebind('resize.fileversioning', SoonFc(() => {
                        initPerfectScrollbar($scrollBlock);
                    }));
                    if (
                        !is_video(M.d[window.versiondialogid])
                        && !is_image2(M.d[window.versiondialogid])
                        && !is_text(M.d[window.versiondialogid])
                    ) {
                        $('.pad .top-column button.js-preview', '.fm-versioning').addClass('hidden');
                        $('.action.preview-file', '.fm-versioning').addClass('hidden');
                    }
                });

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

            const current_sel = fileHandle || $.selected[0];
            const p = fileversioning.getTopNodeSync(current_sel);

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
        },

        /**
         * Open the text editor for the given version handle
         *
         * @param {string} previewHandle Node handle of the version to preview
         * @returns {none} none (ESLint requires)
         */
        previewFile: function(previewHandle) {
            if (M.isInvalidUserStatus()) {
                return;
            }

            loadingDialog.show('common', l[23130]);
            const versionHandle = window.versiondialogid;
            const reopen = () => {
                fileversioning.fileVersioningDialog(versionHandle);
                $(`#v_${previewHandle}`).trigger('click');
            };
            if (is_text(M.d[previewHandle])) {
                fileversioning.closeFileVersioningDialog(versionHandle);
                mBroadcaster.once('text-editor:close', () => {
                    onIdle(reopen);
                });
                mega.fileTextEditor
                    .getFile(previewHandle)
                    .done((data) => {
                        loadingDialog.hide();
                        mega.textEditorUI.setupEditor(M.d[previewHandle].name, data, previewHandle, true);
                    })
                    .fail(loadingDialog.hide);
            }
            else if (is_video(M.d[previewHandle]) || is_image2(M.d[previewHandle])) {
                fileversioning.getAllVersions(versionHandle).then((res) => {
                    fileversioning.closeFileVersioningDialog(versionHandle);
                    if (is_video(M.d[previewHandle])) {
                        $.autoplay = previewHandle;
                    }
                    mBroadcaster.once('slideshow:close', reopen);
                    slideshow(previewHandle, 0, false, res);
                    loadingDialog.hide();
                });
            }
        },
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

