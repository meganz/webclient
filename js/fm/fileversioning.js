(function _fileversioning(global) {
    'use strict';

    const selections = Object.create(null);
    function clearSelections() {
        // Currently selected versions of the file (rows)
        selections.versions = [];
        // Currently selected file (header)
        selections.file = '';
        selections.handles = [];
        selections.vtree = Object.create(null);
    }
    clearSelections();
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

        async getSubVersions(h) {
            const foldersVersions = Object.create(null);
            foldersVersions[h] = M.d[h].tvf;

            const getChildFolderWithVersion = (h) => {
                if (!M.tree[h]) {
                    return;
                }
                const fHandles = Object.keys(M.tree[h]);

                for (let i = fHandles.length; i--;) {

                    if (M.tree[h][fHandles[i]].tvf) {
                        foldersVersions[fHandles[i]] = M.tree[h][fHandles[i]].tvf;
                        foldersVersions[h] -= M.tree[h][fHandles[i]].tvf;
                        getChildFolderWithVersion(fHandles[i]);
                    }

                    if (!foldersVersions[h]) {
                        delete foldersVersions[h];
                        break;
                    }
                }
            };

            getChildFolderWithVersion(h);

            const fh = Object.keys(foldersVersions);
            await dbfetch.geta(fh);

            const out = [];
            for (let i = fh.length; i--;) {
                const handles = Object.keys(M.c[fh[i]]);
                for (let j = handles.length; j--;) {
                    const node = M.getNodeByHandle(handles[j]);
                    if (!node.t && node.tvf) {
                        out.push(handles[j]);
                    }
                }
            }
            selections.handles = out;
            return Promise.allSettled(selections.handles.map(h => this.getAllVersions(h)));
        },

        /**
         * Get all the versions for given file handle.
         * @param {String} h is expected to be a file handle.
         * @return {Array} an array of ufs-nodes of all the versions if everything works fine,
         *         otherwise it returns list with current version.
         */
        getAllVersionsSync: function(h) {
            return this.getVersionHandles(h, true).map(h => M.d[h]).filter(Boolean);
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
         */
        closeFileVersioningDialog() {
            if (!fileversioning.isOpen) {
                return;
            }

            $('.fm-versioning').addClass('hidden');
            if (selectionManager) {
                let cleared = false;
                for (const handle of selections.handles) {
                    const node = M.getNodeByHandle(handle);
                    if (M.v.includes(node)) {
                        if (!cleared) {
                            selectionManager.clear_selection();
                            cleared = true;
                        }
                        selectionManager.add_to_selection(handle);
                    }
                }
            }
            clearSelections();
            $(document).off('keydown.fileversioningKeydown');
            $(window).unbind('resize.fileversioning');
            mBroadcaster.sendMessage('mega:close_fileversioning');
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
         * set/remove sensitive on all previous versions of a file.
         * @param {hanlde} h file hanle.
         * @param {Number} newSenState Sensitive state 0 or 1
         */
        sensitiveVersions(h, newSenState) {
            return fileversioning.getAllVersions(h)
                .then((versions) => {
                    const promises = [];
                    for (let i = 1; i < versions.length; i++) {
                        promises.push(api.setNodeAttributes(versions[i], {sen: newSenState | 0}));
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
         * set/remove description on all previous versions of a file.
         * @param {String} h file handle.
         * @param {String} desc description string/text
         * @returns {Promise} promise
         */
        descriptionVersions(h, desc) {
            return fileversioning.getAllVersions(h)
                .then((versions) => {
                    const promises = [];
                    for (let i = 1; i < versions.length; i++) {
                        promises.push(api.setNodeAttributes(versions[i], {des: desc}));
                    }
                    return Promise.allSettled(promises);
                });
        },

        /**
         * set/remove tags on all previous versions of a file.
         * @param {String} h file handle.
         * @param {Object} prop tags
         * @returns {Promise} promise
         */
        tagVersions(h, prop) {
            return fileversioning.getAllVersions(h)
                .then((versions) => {
                    const promises = [];
                    for (let i = 1; i < versions.length; i++) {
                        promises.push(api.setNodeAttributes(versions[i], prop));
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
         * @param {Array|string|undefined} handles handles of the file(s) to render history versioning list.
         *                 if handles is not set, then it will use the default $.selected
         */
        fileVersioningDialog(handles) {
            if (!handles) {
                handles = $.selected;
            }
            if (!Array.isArray(handles) && handles) {
                handles = [handles];
            }
            if (!handles || !handles.length) {
                return;
            }
            const $versioning = $('.fm-versioning');
            const $versionOverlay = $versioning.filter('.overlay');
            clearSelections();
            selections.handles = handles.filter(h => M.d[h]);
            if (!selections.handles.length) {
                return;
            }
            const revertVersion = (handle, current_node) => {
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

                if (file.sen) {
                    n.sen = file.sen;
                }

                if (file.lbl) {
                    n.lbl = file.lbl;
                }

                if (file.des) {
                    n.des = file.des;
                }

                if (file.tags) {
                    n.tags = file.tags;
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
            const checkNodeData = handle => {
                let nodeData = M.d[handle];
                // are we in an inshare?
                while (nodeData && !nodeData.su) {
                    nodeData = M.d[nodeData.p];
                }
                return nodeData && nodeData.r < 2;
            };

            const genActionHtml = (version, i, versionList) => {
                if (i < versionList.length - 1 && version.name !== versionList[i + 1].name) {
                    return l[17156].replace('%1', `<span>${versionList[i + 1].name}</span>`);
                }
                return version.u === u_handle ? l[16480]
                    : l[16476].replace('%1', M.getNameByHandle(version.u) || l[7381]);
            };

            const fillVersionList = (handle, versionList) => {

                let html = '';
                let lastDate = false;
                let firstHeader = true;
                const noSharePerm = checkNodeData(handle);
                for (let i = 0; i < versionList.length; i++) {

                    const version = versionList[i];
                    let curTimeMarker;
                    const msgDate = new Date((version.ts | 0) * 1000);
                    const iso = msgDate.toISOString();
                    const isCurrentVersion = i === 0;

                    if (todayOrYesterday(iso)) {
                        // if in last 2 days, use the time2lastSeparator
                        curTimeMarker = time2lastSeparator(iso);
                    }
                    else {
                        // if not in the last 2 days, use 1st June [Year]
                        curTimeMarker = acc_time2date(version.ts, true);
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

                    const mostRecentHtml = isCurrentVersion ? '<span class="current">(' + l[17149] + ')</span>' : '';
                    const activeClass  =
                        selections.file === handle && selections.versions.includes(version.h) ? 'active' : '';
                    const downBtnHtml =
                        `<div class="mega-button small action download-file simpletip"
                            data-simpletip="${l[58]}"
                            aria-label="${l[58]}"
                            id="vdl_${version.h}">
                            <i class="sprite-fm-mono icon-download-small"></i>
                        </div>`;
                    const notPreviewable = !is_video(version) && !is_image2(version) && !is_text(version);
                    const viewBtnHtml =
                        `<div class="mega-button small action preview-file ${notPreviewable ? 'hidden' : ''} simpletip"
                            data-simpletip="${l.version_preview}"
                            aria-label="${l.version_preview}"
                            id="vdl_${version.h}">
                            <i class="sprite-fm-mono icon-file-edit"></i>
                        </div>`;
                    const isInbox = M.getNodeRoot(version.h) === M.InboxID;
                    // if the user does not have full access of the shared folder.
                    const revertDisabled = noSharePerm || isCurrentVersion ? 'disabled' : '';
                    const revertBtnHtml = isInbox ?
                        '' :
                        `<div class="mega-button small action revert-file simpletip ${revertDisabled}"
                            data-simpletip="${l[16475]}"
                            aria-label="${l[16475]}"
                            id="vrv_${version.h}">
                            <i class="sprite-fm-mono icon-clock-rotate ${revertDisabled}"></i>
                        </div>`;
                    // if the user does not have full access of the shared folder.
                    const deleteDisabled = (noSharePerm || !M.d[handle].tvf) ? 'disabled' : '';
                    const deleteBtnHtml = isInbox && isCurrentVersion ?
                        '' :
                        `<div class="mega-button small action delete-file simpletip ${deleteDisabled}"
                            data-simpletip="${l[1730]}"
                            aria-label="${l[1730]}"
                            id="vde_${version.h}">
                            <i class="sprite-fm-mono icon-bin ${deleteDisabled}"></i>
                        </div>`;

                    html += // <!-- File Data Row !-->
                            `<tr class="fm-versioning file-info-row ${activeClass}" id=v_${version.h}>
                                <td class="fm-versioning file-icon">
                                    <div class="item-type-icon-90 icon-${fileIcon({name : version.name})}-90"></div>
                                </td>
                                <td class="fm-versioning file-data">
                                    <div class="fm-versioning file-name">
                                        <span>${htmlentities(version.name)}</span>
                                    </div>
                                    <div class="fm-versioning file-info">
                                        <span class="size">${bytesToSize(version.s)}</span>
                                        <span>${mostRecentHtml}</span>
                                    </div>
                                </td>
                                <td class="fm-versioning modified-time">
                                    <i class="sprite-fm-uni icon-history"></i>
                                    <span>
                                        ${msgDate.getHours()}:${addZeroIfLenLessThen(msgDate.getMinutes(), 2)}
                                    </span>
                                </td>
                                <td class="fm-versioning modified-info">
                                    <span class="modified-info-txt">
                                        ${genActionHtml(version, i, versionList)}
                                    </span>
                                </td>
                                <td class="fm-versioning button-container">
                                    <div class="fm-versioning buttons">
                                        ${downBtnHtml}
                                        ${viewBtnHtml}
                                        ${revertBtnHtml}
                                        ${deleteBtnHtml}
                                    </div>
                                </td>
                            </tr>`;
                    lastDate = curTimeMarker;
                }
                html += '</table>';
                return `<div class="version-block" data-ph="${handle}">${html}</div>`;
            };

            const genPathHtml = (h) => {
                const path = M.getPath(M.d[h].p);
                let name = '';
                let pathHtml = '';
                for (const handle of path) {
                    let hasArrow = false;
                    if (handle === M.RootID) {
                        name = l[164];
                    }
                    else if (handle === 'contacts') {
                        name = l[165];
                    }
                    else if (handle === 'opc') {
                        name = l[5862];
                    }
                    else if (handle === 'ipc') {
                        name = l[5863];
                    }
                    else if (handle === 'shares') {
                        name = l[5542];
                    }
                    else if (handle === M.RubbishID) {
                        name = l[167];
                    }
                    else if (handle === 'messages') {
                        name = l[166];
                    }
                    else {
                        const n = M.d[handle];
                        if (n && n.name) {
                            name = n.name;
                            hasArrow = true;
                        }
                    }

                    if (name) {
                        name = escapeHTML(name);
                        pathHtml = `
                            <span>
                                ${hasArrow ? '<i class="sprite-fm-mono icon-arrow-right"></i>' : ''}
                                <span class="simpletip" data-simpletip="${name}">${name}</span>
                            </span>
                            ${pathHtml}
                        `;
                    }
                }
                return pathHtml;
            };

            const $header = $('.header', $versionOverlay);
            const $headerColumn = $('.pad .top-column', $header);
            const $rvtBtn = $('button.js-revert', $headerColumn);
            const $delBtn = $('button.js-delete', $headerColumn);
            const $clrBtn = $('button.js-clear-previous', $headerColumn);
            const refreshHeader = () => {
                const fileHandle = selections.file;
                const topNodeHandle = fileversioning.getTopNodeSync(fileHandle);
                const node = M.d[fileHandle];
                if (!node) {
                    return;
                }
                const noSharePerm = checkNodeData(node.h);
                if (
                    selections.versions.length > 1
                    || selections.versions[0] === topNodeHandle
                    || noSharePerm
                ) {
                    $rvtBtn.addClass('disabled');
                }
                else {
                    $rvtBtn.removeClass('disabled');
                }

                if (noSharePerm) {
                    $delBtn.addClass('disabled');
                    $clrBtn.addClass('disabled');
                }
                else {
                    if (!M.d[fileHandle].tvf || selections.versions.length === M.d[fileHandle].tvf + 1) {
                        $delBtn.addClass('disabled');
                    }
                    else {
                        $delBtn.removeClass('disabled');
                    }
                    if (M.d[fileHandle].tvf) {
                        $clrBtn.removeClass('disabled');
                    }
                    else {
                        $clrBtn.addClass('disabled');
                    }
                }

                // If from backup
                if (M.getNodeRoot(fileHandle) === M.InboxID) {
                    $rvtBtn.addClass('disabled');
                    if (selections.versions.includes(topNodeHandle)) {
                        $delBtn.addClass('disabled');
                    }
                }


                $('.file-data .file-name', $header).safeHTML(`<span>${htmlentities(node.name)}</span>`);
                $('.file-data .file-path', $header).safeHTML(genPathHtml(fileHandle));
                $('.item-type-icon-90', $header)
                    .attr('class', `item-type-icon-90 icon-${fileIcon({name: node.name})}-90`);

                if (
                    !is_video(M.d[fileHandle])
                    && !is_image2(M.d[fileHandle])
                    && !is_text(M.d[fileHandle])
                ) {
                    $('button.js-preview', $header).addClass('hidden');
                }
                else {
                    $('button.js-preview', $header).removeClass('hidden');
                }
            };

            $('button.js-download', $header).rebind('click', () => {
                M.addDownload(selections.versions);
            });

            $('button.js-delete', $header)
                .rebind('click', (ev) => {
                    if (M.isInvalidUserStatus()) {
                        return;
                    }
                    $versionOverlay.addClass('arrange-to-back');

                    if (!ev.currentTarget.classList.contains('disabled')) {

                        const msg = mega.icu.format(l[13750], selections.versions.length);

                        msgDialog('remove', l[1003], msg, l[1007], e => {
                            if (e) {
                                api.screq(selections.versions.map((n) => ({n, a: 'd', v: 1}))).catch(dump);
                                selections.versions = [];
                            }
                            $versionOverlay.removeClass('arrange-to-back');
                        });
                    }
                });

            $('button.js-revert', $header).rebind('click', (ev) => {
                if (!ev.currentTarget.classList.contains('disabled')) {
                    revertVersion(selections.versions[0], selections.file);
                }
            });

            $('.button.close', $header).rebind('click', () => {
                fileversioning.closeFileVersioningDialog();
            });

            $('button.js-preview', $header).rebind('click.version', () => {
                fileversioning.previewFile(selections.versions[0], selections.file, selections.handles);
            });

            $('button.js-clear-previous', $header)
                .rebind('click', (ev) => {
                    if (M.isInvalidUserStatus()) {
                        return;
                    }

                    if (!ev.currentTarget.classList.contains('disabled')) {
                        msgDialog('remove', l[1003], mega.icu.format(l[17154], 1), l[1007], e => {
                            if (e) {
                                fileversioning.clearPreviousVersions(selections.file);
                                selections.versions = [selections.file];
                            }
                        });
                    }
                });

            const isFolder = selections.handles.length === 1 && M.d[selections.handles[0]].t;
            const promises = isFolder ?
                [fileversioning.getSubVersions(selections.handles[0])]
                : selections.handles.map(h => fileversioning.getAllVersions(h));
            Promise.allSettled(promises)
                .then((res) => {
                    const blocks = [];
                    if (isFolder && res[0].status === 'fulfilled') {
                        res = res[0].value;
                    }
                    selections.file = selections.handles[0];
                    for (let i = 0; i < res.length; i++) {
                        const result = res[i];
                        if (result.status === 'fulfilled') {
                            if (!selections.versions.length) {
                                selections.versions.push(result.value[0].h);
                            }
                            selections.vtree[selections.handles[i]] = result.value.map(n => n.h);
                            blocks.push(fillVersionList(selections.handles[i], result.value));
                        }
                    }
                    const $body = $('.body', $versionOverlay);
                    const $scrollBlock = $('.fm-versioning.scroll-bl', $body);

                    const content = blocks.join('\n');
                    if (!content) {
                        fileversioning.closeFileVersioningDialog();
                        return;
                    }
                    $('.content', $scrollBlock).safeHTML(blocks.join('\n'));
                    $('.file-info-row', $scrollBlock).rebind('click', (ev) => {
                        if (!ev.shiftKey) {
                            $('.file-info-row', $body).removeClass('active');
                            selections.versions = [];
                        }

                        const handle = ev.currentTarget.id.substring(2);
                        const parent = ev.currentTarget.closest('.version-block');
                        if (ev.shiftKey && parent.dataset.ph !== selections.file) {
                            let dir = 'previousSibling';
                            for (const row of parent.parentNode.children) {
                                if (row === parent) {
                                    dir = 'nextSibling';
                                }
                                if (row.dataset.ph === selections.file) {
                                    break;
                                }
                            }
                            $('.file-info-row', $body).removeClass('active');
                            selections.versions = [];
                            let sibling = ev.currentTarget[dir];
                            while (sibling && sibling.classList.contains('file-info-row')) {
                                sibling.classList.add('active');
                                selections.versions.push(sibling.id.substring(2));
                                sibling = sibling[dir];
                            }
                        }
                        selections.file = parent.dataset.ph;
                        if (ev.currentTarget.classList.contains('active')) {
                            ev.currentTarget.classList.remove('active');
                            selections.versions.splice(selections.versions.indexOf(handle), 1);
                        }
                        else {
                            ev.currentTarget.classList.add('active');
                            selections.versions.push(handle);
                        }
                        refreshHeader();
                    });

                    $('.file-info-row', $scrollBlock).rebind('dblclick.fileInfoRow', (ev) => {
                        if (!ev.shiftKey) {
                            $('.file-info-row', $scrollBlock).removeClass('active');
                            ev.currentTarget.classList.add('active');
                            const handle = ev.currentTarget.id.substring(2);
                            selections.versions = [handle];
                            M.addDownload(selections.versions);
                            const parent = ev.currentTarget.closest('.version-block');
                            selections.file = parent.dataset.ph;
                            refreshHeader();
                        }
                    });

                    $('.download-file', $scrollBlock).rebind('click', (ev) => {
                        if (ev.shiftKey && selections.versions.length > 0) {
                            $('.file-info-row', $scrollBlock).removeClass('active');
                            ev.currentTarget.closest('.file-info-row').classList.add('active');
                        }
                        const handle = ev.currentTarget.id.substring(4);
                        selections.versions = [handle];
                        const parent = ev.currentTarget.closest('.version-block');
                        selections.file = parent.dataset.ph;
                        refreshHeader();
                        M.addDownload(selections.versions);
                    });

                    $('.revert-file', $scrollBlock).rebind('click', (ev)=> {
                        if (ev.currentTarget.classList.contains('disabled')) {
                            return false;
                        }
                        if (ev.shiftKey && selections.versions.length > 0) {
                            $('.file-info-row', $scrollBlock).removeClass('active');
                            ev.currentTarget.closest('.file-info-row').classList.add('active');
                        }
                        const handle = ev.currentTarget.id.substring(4);
                        const parent = ev.currentTarget.closest('.version-block');
                        selections.versions = [handle];
                        selections.file = parent.dataset.ph;
                        refreshHeader();
                        revertVersion(handle, selections.file);
                    });

                    $('.delete-file', $scrollBlock).rebind('click', (ev) => {
                        if (M.isInvalidUserStatus()) {
                            return;
                        }
                        if (ev.currentTarget.classList.contains('disabled')) {
                            return false;
                        }
                        if (ev.shiftKey && selections.versions.length > 0) {
                            $('.file-info-row', $scrollBlock).removeClass('active');
                            ev.currentTarget.closest('.file-info-row').classList.add('active');
                        }
                        const handle = ev.currentTarget.id.substring(4);
                        const parent = ev.currentTarget.closest('.version-block');
                        selections.versions = [handle];
                        selections.file = parent.dataset.ph;
                        $versionOverlay.addClass('arrange-to-back');
                        msgDialog('remove', l[1003], mega.icu.format(l[13750], 1), l[1007], e => {
                            if (e) {
                                selections.versions = [];
                                api.screq({a: 'd', n: handle, v: 1}).catch(dump);
                            }
                            $versionOverlay.removeClass('arrange-to-back');
                        });
                    });

                    $('.preview-file', $scrollBlock).rebind('click.version', (ev) => {
                        fileversioning.previewFile(
                            ev.currentTarget.id.substring(4),
                            selections.file,
                            selections.handles
                        );
                    });
                    refreshHeader();
                    $versioning.removeClass('hidden');
                    // Init scrolling
                    initPerfectScrollbar($scrollBlock);
                    $(window).rebind('resize.fileversioning', SoonFc(() => {
                        initPerfectScrollbar($scrollBlock);
                    }));
                });

            $(document).rebind('keydown.fileversioningKeydown', (e) => {
                if (e.keyCode === 8) { // Backspace
                    e.stopPropagation();
                    fileversioning.closeFileVersioningDialog();
                }
            });
            $('.button.settings', $header).rebind('click', () => {
                $versionOverlay.addClass('hidden');
                loadSubPage('fm/account/file-management');
            });
            pushHistoryState(page);
        },

        /**
         * Update file versioning dialog if it is open.
         *
         *
         * @param {String} [fileHandle] fileHandle file handle of the file to update,
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
            if (
                !p ||
                !fileversioning.isOpen ||
                $('.fm-versioning').hasClass('hidden')
            ) {
                return;
            }
            if ($.selected.length === 0) {
                $.selected[0] = p;
            }
            let update = false;
            for (const [h, versions] of Object.entries(selections.vtree)) {
                if (fileversioning.checkPreviousVersionSync(p, h)) {
                    selections.handles[selections.handles.indexOf(h)] = p;
                    update = true;
                    break;
                }
                if (p && versions.includes(current_sel)) {
                    selections.handles[selections.handles.indexOf(h)] = p;
                    update = true;
                    break;
                }
            }
            if (update) {
                fileversioning.fileVersioningDialog(selections.handles);
            }
        },

        /**
         * Open the text editor for the given version handle
         *
         * @param {string} previewHandle Node handle of the version to preview
         * @param {string} fileHandle Handle for the node that has these versions.
         * @param {array} handles Array of handles currently shown in the overlay.
         * @returns {none} none (ESLint requires)
         */
        previewFile(previewHandle, fileHandle, handles) {
            if (M.isInvalidUserStatus()) {
                return;
            }

            loadingDialog.show('common', l[23130]);
            const reopen = () => {
                fileversioning.fileVersioningDialog(handles);
            };
            if (is_text(M.d[previewHandle])) {
                fileversioning.closeFileVersioningDialog();
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
                fileversioning.getAllVersions(fileHandle).then((res) => {
                    fileversioning.closeFileVersioningDialog();
                    if (is_video(M.d[previewHandle])) {
                        $.autoplay = previewHandle;
                    }
                    mBroadcaster.once('slideshow:close', () => onIdle(reopen));
                    slideshow(previewHandle, 0, false, res);
                    loadingDialog.hide();
                });
            }
        },
    };
    ns.dvState = null;
    Object.defineProperty(ns, 'isOpen', {
        get: () => {
            return selections && selections.handles && !!selections.handles.length;
        }
    });
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

