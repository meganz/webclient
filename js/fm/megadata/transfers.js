
MegaData.prototype.getDownloadFolderNodes = function(n, md, nodes, paths) {

    var subids = this.getNodesSync(n, false, false, true);

    for (var j = 0; j < subids.length; j++) {
        var p = this.getPath(subids[j]);
        var path = '';

        for (var k = 0; k < p.length; k++) {
            if (this.getNodeByHandle(p[k]).t) {
                path = M.getSafeName(this.getNodeByHandle(p[k]).name) + '/' + path;
            }
            if (p[k] == n) {
                break;
            }
        }

        if (this.getNodeByHandle(subids[j]).t) {
            console.log('0 path', path);
        }
        else {
            nodes.push(subids[j]);
            paths[subids[j]] = path;
        }
    }
};

/** Add a download object to the transfer widget. */
MegaData.prototype.putToTransferTable = function(node) {
    'use strict';
    var handle = node.h || node.dl_id;
    node.name = node.name || node.n;

    if (d) {
        var isDownload = node.owner instanceof ClassFile;
        console.assert(this.isFileNode(node) || isDownload, 'Invalid putToTransferTable node.');
    }

    mega.tpw.addDownloadUpload(mega.tpw.DOWNLOAD, {
        id: handle,
        dl_id: handle,
        n: node.name,
        zipid: node.zipid,
        zipname: node.zipname,
        size: node.s || node.size || 0
    });

    if (uldl_hold || dlQueue.isPaused(`dl_${handle}`)) {
        fm_tfspause(`dl_${handle}`);
    }

    if (node.failed || node.dl_failed) {
        M.dlerror(node, node.lasterror || l[135]);
    }
};

MegaData.prototype.addDownload = function(n, z, preview) {
    "use strict";

    if (M.isInvalidUserStatus()) {
        return;
    }

    var args = toArray.apply(null, arguments);

    mLoadingSpinner.show('load-add-download-nodes', l[258]);

    // fetch all nodes needed by M.getNodesSync
    Promise.resolve(this.collectNodes(n))
        .catch(reportError)
        .finally(() => {
            mLoadingSpinner.hide('load-add-download-nodes');

            this.addDownloadSync(...args);
        });
};

MegaData.prototype.addDownloadSync = function(n, z, preview) {
    var args = toArray.apply(null, arguments);
    var webdl = function() {
        dlmanager.getMaximumDownloadSize()
            .done(function(size) {
                dlmanager.maxDownloadSize = size;

                M.addWebDownload.apply(M, args);
                args = undefined;
            });
    };

    // @TODO: Remove this bypass once the new download method public albums is implemented
    if (pfcol) {
        return webdl();
    }

    if (!folderlink && (z || preview || !fmconfig.dlThroughMEGAsync)) {
        return webdl();
    }
    // if in folder link and logged-in and download using mSync is set to 0
    if (folderlink && u_type) {
        if (!fmconfig.dlThroughMEGAsync) {
            return webdl();
        }
    }

    if (fmconfig.dlThroughMEGAsync && window.useMegaSync && useMegaSync === 1) {
        return webdl();
    }

    dlmanager.isMEGAsyncRunning(0x02010100)
        .done(function (sync) {
            var dlAuth = M.RootID;
            if (!folderlink) {
                var ommitedEsid = base64urldecode(u_sid);
                ommitedEsid = ommitedEsid.substr(0, ommitedEsid.length - 6);
                dlAuth = base64urlencode(ommitedEsid);
            }
            var cmd = {
                a: 'd',
                auth: dlAuth
            };
            var files = [];

            try {

                var addNodeToArray = function(arr, node) {
                    if (!node) {
                        return;
                    }
                    if (!node.a && node.k) {
                        if (!node.t) {
                            arr.push({
                                t: node.t,
                                h: node.h,
                                p: node.p,
                                n: base64urlencode(to8(M.getSafeName(node.name))),
                                s: node.s,
                                c: node.hash,
                                ts: node.mtime || node.ts,
                                k: a32_to_base64(node.k),
                                rewind: node.rewind
                            });
                        }
                        else {
                            arr.push({
                                t: node.t,
                                h: node.h,
                                p: node.p,
                                n: base64urlencode(to8(M.getSafeName(node.name))),
                                ts: node.mtime || node.ts,
                                k: a32_to_base64(node.k),
                                rewind: node.rewind
                            });
                        }
                    }
                };

                var recursivelyLoadNodes = function(arr, nodes) {
                    if (!nodes) {
                        return;
                    }
                    for (var k = 0; k < nodes.length; k++) {
                        if (typeof nodes[k] === 'string') {
                            const n = M.getNodeByHandle(nodes[k]);
                            addNodeToArray(files, n);
                            if (n.t && M.c[nodes[k]]) {
                                recursivelyLoadNodes(arr, Object.keys(M.c[nodes[k]]));
                            }
                        }
                        else { // it's object
                            addNodeToArray(files, nodes[k]);
                            if (nodes[k].t && !nodes[k].rewind) {
                                // If its a rewind download, we need not add the children recursively here
                                recursivelyLoadNodes(arr, Object.keys(M.c[nodes[k].h]));
                            }
                        }
                    }
                };

                recursivelyLoadNodes(files, n);

            }
            catch (exx) {
                if (d) {
                    dlmanager.logger.error('Failed to load all nodes to pass to megaSync', exx);
                }
                return webdl();
            }

            if (!files.length) {
                console.error('No files');
                return webdl();
            }

            if (files[0].rewind) {
                cmd.a = 'gd';
            }

            cmd.f = files;

            sync.megaSyncRequest(cmd)
                .then(() => {
                    showToast('megasync-transfer', l[8635]);
                })
                .catch(
                function () {
                    sync.megaSyncIsNotResponding(webdl);

                }
                );
        })
        .fail(webdl);
};

MegaData.prototype.addWebDownload = function(n, z, preview, zipname) {
    delete $.dlhash;
    var path;
    var nodes = [];
    var paths = {};
    var zipsize = 0;
    var entries = [];
    let quiet = false;

    if (!is_extension && !preview && !z && dlMethod === MemoryIO) {
        var nf = [], cbs = [];
        for (const i in n) {
            if (this.getNodeByHandle(n[i]).t) {
                var nn = [], pp = {};
                this.getDownloadFolderNodes(n[i], false, nn, pp);
                cbs.push(this.addDownload.bind(this, nn, 0x21f9A, pp, this.getNodeByHandle(n[i]).name));
            }
            else {
                nf.push(n[i]);
            }
        }

        quiet = n && M.getNodeByHandle(n[0]).t && M.getNodeByHandle(n[0]).tb;
        n = nf;

        if (cbs.length) {
            for (const j in cbs) {
                Soon(cbs[j]);
            }
        }
    }
    if (z === 0x21f9A) {
        nodes = n;
        paths = preview;
        preview = false;
        quiet = true;
    }
    else {
        for (const k in n) {
            if (this.getNodeByHandle(n[k])) {
                if (this.getNodeByHandle(n[k]).t) {
                    this.getDownloadFolderNodes(n[k], !!z, nodes, paths);
                }
                else {
                    nodes.push(n[k]);
                }
            }
            else if (this.isFileNode(n[k])) {
                nodes.push(n[k]);
            }
        }
    }

    if (z) {
        z = ++dlmanager.dlZipID;

        if (!zipname && n.length === 1) {
            const {name} = M.getNodeByHandle(n[0]);
            if (name) {
                zipname = M.getSafeName(name).replace(/\.\w{2,5}$/, '');
            }
        }

        if (!zipname) {
            const parent = this.getNodeParent(n[0]);
            const {name} = this.getNodeByHandle(parent);
            if (name) {
                zipname = M.getSafeName(name);
            }
        }

        zipname = `${zipname || `Archive-${Math.random().toString(16).slice(-4)}`}.zip`;
    }
    else {
        z = false;
    }
    if (!$.totalDL) {
        $.totalDL = 0;
    }
    // a variable to store the current download batch size. as $.totalDL wont be cleared on failure
    // due to MaxDownloadSize exceeding (and it should not be cleared). We need only to subtract the
    // current batch size.
    var currDownloadSize = 0;

    let errorStatus = null;
    for (var k in nodes) {
        /* jshint -W089 */
        if (!nodes.hasOwnProperty(k) || !this.isFileNode((n = this.getNodeByHandle(nodes[k])))) {
            n = nodes[k];
            if (this.isFileNode(n)) {
                dlmanager.logger.info('Using plain provided node object.');
            }
            else {
                dlmanager.logger.error('** CHECK THIS **', 'Invalid node', k, nodes[k]);
                continue;
            }
        }
        path = paths[nodes[k]] || '';
        $.totalDL += n.s;
        currDownloadSize += n.s;

        const status = !z && mega.tpw.getRowStatus(`dl_${n.h}`);
        if (status) {
            if (!status.complete) {
                if ((status.errored || status.overquota) && !entries.length) {
                    errorStatus = status.statusText;
                }
                continue;
            }
            mega.tpw.removeRow(`dl_${n.h}`);
        }
        if (!z && mega.tpw.hasDOMRow(`dl_${n.h}`)) {
            continue;
        }
        var entry = {
            ...n,
            size: n.s,
            nauth: n.nauth || n_h,
            id: n.h,
            key: n.k,
            n: n.name,
            t: n.mtime || n.ts,
            zipid: z,
            zipname: zipname,
            preview: preview,
            p: n.path || path,
            ph: undefined,
            onDownloadProgress: this.dlprogress.bind(this),
            onDownloadComplete: this.dlcomplete.bind(this),
            onBeforeDownloadComplete: this.dlbeforecomplete.bind(this),
            onDownloadError: this.dlerror.bind(this),
            onDownloadStart: this.dlstart.bind(this)
        };

        if (self.dlpage_ph) {
            entry.ph = dlpage_ph;
        }

        if (n.rewind) {
            entry.customRequest = 'gd';
        }

        entries.push({node: n, entry: entry});
    }

    if (errorStatus) {
        showToast('download', errorStatus);
    }

    if (!entries.length) {
        if (d) {
            dlmanager.logger.warn('Nothing to download.');
        }
        if (dlmanager.isOverQuota) {
            dlmanager.showOverQuotaDialog();
        }
        else if (!currDownloadSize && !quiet) {
            dlmanager.showNothingToDownloadDialog();
        }
        return;
    }

    if ($.totalDL > dlmanager.maxDownloadSize) {
        if (d) {
            console.log('Downloads exceed max size', entries.length, entries);
        }
        // subtract the current batch size from the stored total
        $.totalDL -= currDownloadSize;
        if (!fmconfig.dlThroughMEGAsync) {
            var msgMsg = l[18213];
            var msgSubMsg = l[18214];
            msgDialog('confirmation', 'File Size is too big',
                msgMsg,
                msgSubMsg,
                function (activateMsync) {
                    if (activateMsync) {
                        mega.config.setn('dlThroughMEGAsync', 1);
                    }
                });
            return;
        }
        else {
            // Forcibly check permission is blocked for megasync integration.
            megasync.allowShowingBlockedDialog();
            megasync.megaSyncRequest({ a: 'v' }).always(nop);
            // this means the setting is ON to user MEGASync. but we got here because either
            // MEGASync is not installed (or working), or there were an error when we tried to use MEGASync.
            return dlmanager.showMEGASyncOverlay(true);
        }
    }

    var tempEntry = !z && new Array(entries.length);
    for (var e = 0; e < entries.length; e++) {
        n = entries[e].node;

        dl_queue.push(entries[e].entry);
        zipsize += n.s;

        if (!z) {
            tempEntry[e] = entries[e].entry;
        }
    }
    tfsheadupdate({
        a: z ? `zip_${entries[0].entry.zipid}` : Object.values(entries).map((e) => {
            return `dl_${e.entry.id}`;
        })
    });
    if (z) {
        mega.tpw.addDownloadUpload(mega.tpw.DOWNLOAD, entries[0].entry, zipsize);
    }
    else {
        if (!preview) {
            mega.tpw.addDownloadUpload(mega.tpw.DOWNLOAD, tempEntry);
        }
        tempEntry = null;
    }

    if (z && zipsize) {
        if (uldl_hold) {
            fm_tfspause('zip_' + z);
        }

        api_req({a: 'log', e: 99655, m: 'ZipIO Download started.'});
        mBroadcaster.sendMessage('trk:event', 'download', 'started', 'zip');
    }

    if (!preview) {
        this.onDownloadAdded(entries.length, uldl_hold, z, zipsize);
    }

    delete $.dlhash;
};

MegaData.prototype.onDownloadAdded = function(added, isPaused, isZIP, zipSize) {
    if (!$.removeTransferItems) {
        M.addTransferPanelUI();
    }

    if (!isZIP || zipSize) {
        this.addDownloadToast = ['d', isZIP ? 1 : added, isPaused];
    }
    if (is_mobile) {
        M.openTransfersPanel();
    }
    initTreeScroll();

    dlmanager.isDownloading = Boolean(dl_queue.length);
};

MegaData.prototype.dlprogress = function(id, perc, bl, bt, kbps, dl_queue_num, force) {
    var st;

    if (dl_queue[dl_queue_num].zipid) {
        id = 'zip_' + dl_queue[dl_queue_num].zipid;
        var tl = 0;
        var ts = 0;
        for (var i in dl_queue) {
            if (dl_queue[i].zipid == dl_queue[dl_queue_num].zipid) {
                if (!st || st > dl_queue[i].st) {
                    st = dl_queue[i].st;
                }
                ts += dl_queue[i].size;
                if (dl_queue[i].complete) {
                    tl += dl_queue[i].size;
                }
                // TODO: check this for suitable GP use
            }
        }
        bt = ts;
        bl = tl + bl;
    }
    else {
        id = 'dl_' + id;
        st = dl_queue[dl_queue_num].st;
    }

    if (!bl) {
        return false;
    }
    if (!$.transferprogress) {
        $.transferprogress = Object.create(null);
    }
    if (kbps == 0) {
        if (!force && (perc != 100 || $.transferprogress[id])) {
            return false;
        }
    }
    tfsheadupdate({t: id});
    if (!dl_queue[dl_queue_num].preview) {
        mega.tpw.updateDownloadUpload(mega.tpw.DOWNLOAD, id, perc, bl, bt, kbps, dl_queue_num, st);
    }

    // var eltime = (new Date().getTime()-st)/1000;
    var bps = kbps * 1000;
    if (bt) {
        // $.transferprogress[id] = Math.floor(bl/bt*100);
        $.transferprogress[id] = [bl, bt, bps];
        dl_queue[dl_queue_num].loaded = bl;

        if (!uldl_hold) {
            var slideshowid = window.slideshowid && slideshow_handle();
            if (slideshowid === dl_queue[dl_queue_num].id && !previews[slideshowid]) {
                var $overlay = $('.media-viewer-container');
                var $chart = $overlay.find('.viewer-progress');

                $overlay.find('.viewer-error').addClass('hidden');
                $overlay.find('.viewer-pending').addClass('hidden');

                var deg = 360 * perc / 100;
                if (deg <= 180) {
                    $chart.find('.left-chart p').css('transform', 'rotate(' + deg + 'deg)');
                    $chart.find('.right-chart p').removeAttr('style');
                }
                else {
                    $chart.find('.left-chart p').css('transform', 'rotate(180deg)');
                    $chart.find('.right-chart p').css('transform', 'rotate(' + (deg - 180) + 'deg)');
                }
            }
            delay('percent_megatitle', percent_megatitle, 50);
        }
    }
};

MegaData.prototype.dlcomplete = function(dl) {
    var id = dl.id, z = dl.zipid;

    if (dl.hasResumeSupport) {
        dlmanager.remResumeInfo(dl).dump();
    }

    var slideshowid = slideshow_handle();
    if (slideshowid == id && !previews[slideshowid]) {
        var $overlay = $('.media-viewer-container');
        $overlay.find('.viewer-pending').addClass('hidden');
        $overlay.find('.viewer-error').addClass('hidden');
        $overlay.find('.viewer-progress p').css('transform', 'rotate(180deg)');
    }

    if (z) {
        id = 'zip_' + z;

        api_req({a: 'log', e: 99656, m: 'ZipIO Download completed.'});
        mBroadcaster.sendMessage('trk:event', 'download', 'completed', 'zip');
    }
    else {
        id = 'dl_' + id;
    }

    tfsheadupdate({f: id});
    mega.tpw.finishDownloadUpload(id, dl);

    if ($.transferprogress && $.transferprogress[id]) {
        if (!$.transferprogress['dlc']) {
            $.transferprogress['dlc'] = 0;
        }
        $.transferprogress['dlc'] += $.transferprogress[id][1];
        delete $.transferprogress[id];
    }

    delay('tfscomplete', function() {
        M.resetUploadDownload();
        $.tresizer();
    });
};

MegaData.prototype.dlbeforecomplete = function() {
};

MegaData.prototype.dlerror = function(dl, error) {
    var x;
    var errorstr;
    var gid = dlmanager.getGID(dl);
    var $overlay = $('.media-viewer-container');

    if (d) {
        dlmanager.logger.error('dlerror', gid, error);
    }
    else {
        if (error === EOVERQUOTA) {
            if (!dl.log509 && !dl.logOverQuota && Object(u_attr).p) {
                dl.logOverQuota = 1;
                api_req({a: 'log', e: 99615, m: 'PRO user got EOVERQUOTA'});
            }
        }
        // else if (error !== EAGAIN) {
        //     srvlog('onDownloadError :: ' + error + ' [' + hostname(dl.url) + '] ' + (dl.zipid ? 'isZIP' : ''));
        // }
    }
    let overquota = false;
    switch (error) {
        case ETOOMANYCONNECTIONS:
            errorstr = l[18];
            break;
        case ESID:
            errorstr = l[19];
            break;
        case EBLOCKED:
            errorstr = l[20705];
            break;
        case ETOOMANY:
        case EACCESS:
            errorstr = l[20228];
            break;
        case ENOENT:
            errorstr = l[22];
            break;
        case EKEY:
            errorstr = l.dl_decryption_failed;
            break;
        case EOVERQUOTA:
            errorstr = l[17];
            overquota = true;
            break;
        // case EAGAIN:               errorstr = l[233]; break;
        // case ETEMPUNAVAIL:         errorstr = l[233]; break;
        default:
            errorstr = l[x = 233];
            break;
    }
    tfsheadupdate(overquota ? {o: gid} : {e: gid});
    mega.tpw.errorDownloadUpload(gid, errorstr, overquota);


    var slideshowid = slideshow_handle();
    if (slideshowid === dl.id && !previews[slideshowid]) {
        $('.img-wrap', $overlay).addClass('hidden');
        $('.viewer-pending', $overlay).addClass('hidden');
        $('.viewer-progress', $overlay).addClass('vo-hidden');
        $('.viewer-error', $overlay).removeClass('hidden');
        $('.viewer-error-txt', $overlay).text(errorstr);
    }

    if (errorstr) {
        var prog = Object(GlobalProgress[gid]);

        dl.failed = new Date;
        if (x != 233 || !prog.speed || !(prog.working || []).length) {
            /**
             * a chunk may fail at any time, don't report a temporary error while
             * there is network activity associated with the download, though.
             */
            if (page === 'download') {
                if (error === EOVERQUOTA) {
                    setTransferStatus(gid, l[17]);
                }
            }
            else if (error === EOVERQUOTA && page === 'fm/dashboard') {
                delay('obq-update.dashboard', () => dashboardUI());
            }

            switch (error) {
                case EACCESS:
                case ETOOMANY:
                case EBLOCKED:
                case EKEY:
                case ENOENT:
                    dlFatalError(dl, errorstr);
                    delete dlmanager.onDownloadFatalError;
                    break;
                default:
                    setTransferStatus(dl, errorstr);
            }
        }
    }
};

MegaData.prototype.dlstart = function(dl) {
    var id = (dl.zipid ? 'zip_' + dl.zipid : 'dl_' + dl.dl_id);

    dl.st = Date.now();
    ASSERT(typeof dl_queue[dl.pos] === 'object', 'No dl_queue entry for the provided dl...');
    ASSERT(typeof dl_queue[dl.pos] !== 'object' || dl.n == dl_queue[dl.pos].n, 'No matching dl_queue entry...');
    if (typeof dl_queue[dl.pos] === 'object') {
        this.dlprogress(id, 0, 0, 0, 0, dl.pos);
    }
};

var __ul_id = 8000;
MegaData.prototype.addUpload = function(u, ignoreWarning, emptyFolders, target) {
    'use strict'; /* jshint -W074 */

    if (M.isInvalidUserStatus()) {
        return;
    }

    var flag = 'ulMegaSyncAD';

    if (u.length > 999 && !ignoreWarning && !localStorage[flag]) {
        var showMEGAsyncDialog = function(button, syncData) {
            const tag = `addUpload.${makeUUID()}`;

            $('.download-button.download').safeHTML(button);
            $('.megasync-upload-overlay').removeClass('hidden');

            var $chk = $('.megasync-upload-overlay .checkdiv');
            var hideMEGAsyncDialog = function() {
                delay.cancel(tag);
                $('.megasync-upload-overlay').addClass('hidden');
                $(document).off('keyup.megasync-upload');
                $('.download-button.continue, .fm-dialog-close').off('click');
                $('.download-button.download').off('click');
                $chk.off('click.dialog');
                $chk = undefined;
            };
            var onclick = function() {
                hideMEGAsyncDialog();
                M.addUpload(u, true, emptyFolders, target);
            };
            $(document).rebind('keyup.megasync-upload', onclick);
            $('.download-button.continue, .fm-dialog-close').rebind('click', onclick);
            $('.download-button.download').rebind('click', () => {
                hideMEGAsyncDialog();

                if (!syncData) {
                    mega.redirect('mega.io', 'desktop', false, false, false);
                }
                // if the user is running MEGAsync 3.0+
                else if (!syncData.verNotMeet) {
                    // Check whether the user logged in MEGAsync does match here
                    if (syncData.u === u_handle) {
                        // Let MEGAsync open the local file selector.
                        if (M.vtol(syncData.v) < M.vtol('6.2.0')) {
                            megasync.uploadFile(M.currentdirid);
                        }
                        else {
                            megasync.uploadFilesAndFolders(M.currentdirid);
                        }
                    }
                }
            });
            $chk.rebind('click.dialog', function() {
                if ($chk.hasClass('checkboxOff')) {
                    $chk.removeClass('checkboxOff').addClass('checkboxOn');
                    localStorage[flag] = 1;
                }
                else {
                    $chk.removeClass('checkboxOn').addClass('checkboxOff');
                    delete localStorage[flag];
                }
            });

            if (syncData && syncData.u !== u_handle) {
                $('.megasync-title span', '.megasync-upload-overlay').text(l.msync_upload_wrong_user_title);
                $('.megasync-info', '.megasync-upload-overlay').safeHTML(l.megasync_upload_wrong_user);
            }
            else {
                $('.megasync-title span', '.megasync-upload-overlay').text(l[19639]);
                $('.megasync-info', '.megasync-upload-overlay').safeHTML(l[12488]);
            }
            delay(tag, () => {
                if (!elementIsVisible(document.querySelector('.megasync-upload-overlay'))) {
                    onclick();
                }
            }, 2000);
        };
        megasync.allowShowingBlockedDialog();
        dlmanager.isMEGAsyncRunning('3.0', 1)
            .done(function(ms, syncData) {
                showMEGAsyncDialog(u_handle === syncData.u ? l[8912] : l.megasync_check_logins, syncData);
            })
            .fail(function() {
                showMEGAsyncDialog(l.desktopapp_dialog_btn);
            });
        return;
    }
    var toChat;
    var added = 0;
    var ul_id;
    var pause = '';
    var pauseTxt = '';
    var ephemeral = M.isFileDragPage(page);
    target = target || this.currentdirid;
    target = M.isCustomView(target).nodeID || target;

    if (String(target).startsWith('chat')) {
        toChat = true;
    }
    else if (String(target).length !== 8 && String(target).length !== 11) {
        target = this.lastSeenCloudFolder || this.RootID;
    }
    console.assert(ephemeral || this.RootID, 'Unexpected M.addUpload() invocation...');

    if (uldl_hold) {
        pause = 'transfer-paused';
        pauseTxt = l[1651];
    }

    // Foreach the queue and start uploading
    var startUpload = function(u) {
        u.sort(function(a, b) {
            return a.size < b.size ? 1 : -1;
        });

        for (var i = u.length; i--;) {
            var f = u[i];

            ul_id = ++__ul_id;
            f.target = f.target || target;
            f.id = ul_id;

            var gid = 'ul_' + ul_id;
            if (is_mobile) {
                M.addToTransferTable(gid, f);
            }

            if (typeof f._replaces === 'number') {
                // We need to create a version for a pending upload, hold it up until it finishes.
                ulmanager.holdUntilUploadFinished(f, f._replaces, true);
                delete f._replaces;
            }
            else {
                ul_queue.push(f);
            }
            added++;

            // When dragging files to create an ephemeral, uldl_hold is set at the time of showing the terms dialog.
            if (!ephemeral && uldl_hold) {
                fm_tfspause('ul_' + ul_id);
            }

            if (toChat) {
                f.chatid = target;
            }
        }
        // unfortunately, looping again in reversed order
        // for (var ur = 0; ur < u.length; ur++) {
        //    mega.tpw.addDownloadUpload(mega.tpw.UPLOAD, u[ur]);
        // }
        if (!added) {
            ulmanager.logger.warn('Nothing added to upload.');
            return;
        }

        tfsheadupdate({
            a: u.map((u) => {
                return `ul_${u.id}`;
            })
        });
        mega.tpw.addDownloadUpload(mega.tpw.UPLOAD, u);
        if (!$.removeTransferItems) {
            M.addTransferPanelUI();
        }
        if (ephemeral && !Object(u_attr).terms) {
            ulQueue.pause();
            uldl_hold = true;
        }
        else {
            M.showTransferToast('u', added);
            if (is_mobile) {
                M.openTransfersPanel();
            }
        }

        if ((ulmanager.isUploading = Boolean(ul_queue.length))) {
            queueMicrotask(() => {

                if (ulmanager.ulOverStorageQuota) {
                    ulmanager.ulShowOverStorageQuotaDialog();
                }

                if (mBroadcaster.hasListener('upload:start')) {
                    var data = Object.create(null);

                    for (var i = u.length; i--;) {
                        var f = u[i];

                        data[f.id] = {
                            uid: f.id,
                            faid: f.faid,
                            size: f.size,
                            name: f.name,
                            chat: f.chatid,
                            // store the minimal expected file attributes for this upload
                            efa: (is_image(f) ? 2 : 0) + (MediaInfoLib.isFileSupported(f) ? 1 : 0)
                        };

                        // keep a global record for possible createnodethumbnail() calls at any later stage...
                        ulmanager.ulEventData[f.id] = data[f.id];
                    }

                    mBroadcaster.sendMessage('upload:start', data);
                }
            });
        }
    }.bind(this);

    // Prepare uploads by creating their target path beforehand as needed for the new fileconflict logic
    var paths = Object.create(null);
    var queue = Object.create(null);
    var files = [];

    if (toChat) {
        toChat = M.myChatFilesFolder.name;
        paths[toChat] = null;
        files = u;
    }
    else {
        for (var i = u.length; i--;) {
            var file = u[i];

            if (file.path) {
                paths[file.path] = null;

                var path = M.getSafePath(file.path)[0];
                if (path) {
                    if (!queue[path]) {
                        queue[path] = [];
                    }
                    queue[path].push(file);
                    continue;
                }
            }

            files.push(file);
        }

        if (emptyFolders) {
            for (var x = emptyFolders.length; x--;) {
                paths[emptyFolders[x]] = null;
            }
        }
    }

    var uuid = makeUUID();
    var makeDirPromise = mega.promise;

    if (d) {
        ulmanager.logger.info('[%s] Pre-upload preparation...', uuid, u.length, [u]);
        console.time('makeDirPromise-' + uuid);
    }

    var dequeue = function(name) {
        var files = queue[name] || false;

        if (d) {
            ulmanager.logger.info('Skipping uploads under "%s"...', name, files);
        }

        for (var i = files.length; i--;) {
            delete paths[files[i].path];
        }

        delete queue[name];
    };

    // Rename/KEEPBOTH on folder upload conflict requires to rewrite the paths of sub nodes
    const renameFolder = (oldName, newName) => {
        if (oldName === newName || !queue[oldName]) {
            return;
        }
        const files = queue[oldName];
        for (let i = files.length; i--;) {
            const f = files[i];
            delete paths[f.path];
            const segments = String(f.path).split('/');
            segments[0] = newName;
            f.path = segments.join('/');
            paths[f.path] = null;
        }
        queue[newName] = files;
        delete queue[oldName];

        if (emptyFolders) {
            for (let x = emptyFolders.length; x--;) {
                const seg = String(emptyFolders[x]).split('/');
                if (M.getSafeName(seg[0]) === oldName) {
                    delete paths[emptyFolders[x]];
                    seg[0] = newName;
                    emptyFolders[x] = seg.join('/');
                    paths[emptyFolders[x]] = null;
                }
            }
        }
    };

    var makeDirProc = function() {
        var conflicts = [];
        var folders = Object.keys(queue);

        if (d) {
            console.time('makeDirProc-' + uuid);
        }

        for (var i = folders.length; i--;) {
            var name = folders[i];
            const found = fileconflict.getFolderByName(target, name);

            if (found) {
                conflicts.push([{t: 1, name: name}, found]);
            }
        }

        if (d && conflicts.length) {
            ulmanager.logger.info('[%s] Resolving folder conflicts...', uuid, conflicts.concat());
        }

        (function _foreach() {
            var entry = conflicts.pop();

            if (entry) {
                var node = entry[1];
                entry = entry[0];

                fileconflict.prompt('upload', entry, node, conflicts.length, target)
                    .always(function(file, name, action, repeat) {
                        if (file === -0xBADF) {
                            if (d) {
                                console.timeEnd('makeDirProc-' + uuid);
                            }
                            return makeDirPromise.reject(EBLOCKED);
                        }

                        if (action === fileconflict.DONTCOPY) {
                            dequeue(entry.name);

                            if (repeat) {
                                while ((entry = conflicts.pop())) {
                                    dequeue(entry[0].name);
                                }
                            }
                        }
                        else if (action === fileconflict.KEEPBOTH) {
                            renameFolder(entry.name, name);

                            if (repeat) {
                                while ((entry = conflicts.pop())) {
                                    const renamed = fileconflict.findNewName(entry[0].name, target);
                                    renameFolder(entry[0].name, renamed);
                                }
                            }
                        }
                        else {
                            console.assert(action === fileconflict.REPLACE, 'Invalid action...');

                            if (repeat) {
                                conflicts = [];
                            }
                        }

                        onIdle(_foreach);
                    });
            }
            else {
                u = Array.prototype.concat.apply([], Object.values(queue).concat(files));
                M.createFolders(paths, toChat ? M.cf.p || M.RootID : target, {
                    pitagFrom: 'U',
                    pitagTrigger: u[0] && u[0].pitagTrigger
                }).always(res => {
                    if (d && res !== paths) {
                        ulmanager.logger.debug('Failed to create paths hierarchy...', res);
                    }
                    if (res[toChat]) {
                        M.myChatFilesFolder.set(res[toChat]).dump('cf');
                    }
                    makeDirPromise.resolve();
                });

                if (d) {
                    console.timeEnd('makeDirProc-' + uuid);
                }
            }
        })();
    };

    var ulOpSize = 0; // how much bytes we're going to upload

    for (var j = u.length; j--;) {
        ulOpSize += u[j].size;
    }

    M.onFileManagerReady(function() {
        if (target === undefined) {
            // On ephemeral was undefined
            target = M.RootID;
        }
        target = `${target || ''}`;
        Promise.resolve(!target || M.getChildren(target) || dbfetch.get(target)).finally(() => {
            makeDirProc();
            // M.checkGoingOverStorageQuota(ulOpSize).done(makeDirProc);
        });
    });

    makeDirPromise.then(() => {
        if (!u.length) {
            return u;
        }
        var targets = Object.create(null);

        for (var i = u.length; i--;) {
            var file = u[i];

            if (toChat) {
                file.target = paths[toChat] || M.RootID;
            }
            else if (paths[file.path]) {
                file.target = paths[file.path];
            }
            else if (!file.target) {
                file.target = target;
            }

            targets[file.target] = 1;
        }

        return dbfetch.geta(Object.keys(targets).filter(h => !M.getChildren(h))).then((r) => {
            // loadingDialog.hide();

            if (!toChat && !M.getChildren(target) && String(target).length !== 11) {
                if (d) {
                    ulmanager.logger.warn("Error dbfetch'ing target %s", target, r);
                }
                target = M.currentdirid;
            }

            var to = toChat ? u[0].target : target;
            var op = fileversioning.dvState ? 'replace' : 'upload';

            return fileconflict.check(u, to, op, toChat ? fileconflict.KEEPBOTH : 0);
        });
    }).then(startUpload).catch((ex) => ex !== EBLOCKED && tell(ex)).finally(() => {
        if (d) {
            console.timeEnd('makeDirPromise-' + uuid);
        }
    });
};

/**
 * Create new file on the cloud
 * @param {String} fileName a string with the file name to create.
 * @param {String} dest The handle where the file will be created.
 * @return {MegaPromise} megaPromise to be resolved/rejected once the operation is finished.
 */
MegaData.prototype.addNewFile = function(fileName, dest) {
    'use strict';
    // eslint-disable-next-line local-rules/hints
    var addFilePromise = new MegaPromise();
    dest = dest || M.currentdirid || M.RootID;
    dest = dest.split('/').pop();

    if ([8, 11].indexOf(String(dest).length) === -1) {
        return addFilePromise.reject(EACCESS);
    }
    if (!fileName) {
        return addFilePromise.reject('File Name is empty');
    }
    if (M.c[dest]) {
        // Check if a node (file or folder) with the same name already exists.
        for (var handle in M.c[dest]) {
            if (M.d[handle] && M.d[handle].name === name) {
                return addFilePromise.reject('A node with the same name already exists');
            }
        }
    }

    var nFile = new File([''], fileName, { type: "text/plain" });
    nFile.target = dest;
    nFile.id = ++__ul_id;
    nFile.path = '';
    nFile.ulSilent = true;
    nFile.promiseToInvoke = addFilePromise;


    ul_queue.push(nFile);
    return addFilePromise;
};

MegaData.prototype.ulprogress = function(ul, perc, bl, bt, bps) {
    'use strict';

    if (!bl || !ul.starttime || uldl_hold) {
        return false;
    }
    const gid = `ul_${ul.id}`;

    $.transferprogress[gid] = [bl, bt, bps];

    queueMicrotask(() => {
        if ($.transferprogress[gid]) {
            perc = Math.min(100, perc);
            bl = Math.min(bl, ul.size) || bl;
            delay('percent_megatitle', percent_megatitle, 450);

            tfsheadupdate({t: gid});
            mega.tpw.updateDownloadUpload(mega.tpw.UPLOAD, gid, perc, bl, bt, bps, ul.pos, ul.starttime);
        }
    });
};

// Handle 'usc' errors
MegaData.prototype.uscex = function(ex) {
    'use strict';

    if (ex === EOVERQUOTA || ex === EGOINGOVERQUOTA) {

        return ulmanager.ulShowOverStorageQuotaDialog();
    }

    return this.ulerror(null, ex);
};

// Handle upload error
MegaData.prototype.ulerror = function(ul, error) {
    'use strict';

    if (d) {
        console.error('Upload error', ul, error, api_strerror(error));
    }
    var overquota = true;

    if (error === EOVERQUOTA) {
        ulQueue.pause();
        if (!is_megadrop) {
            M.showOverStorageQuota(-1).catch(nop);
        }
    }
    else if (error === EGOINGOVERQUOTA) {
        M.checkGoingOverStorageQuota(-1);
    }
    else if (error === ESUBUSERKEYMISSING) {
        ulmanager.ulShowBusAdminVerifyDialog(ul);
    }
    else {
        overquota = false;
    }

    if (ul) {
        var id = ul.id;
        var target = ul.target;

        var errStr = api_strerror(error);

        this.ulfinalize(ul, errStr);
        const gid = ulmanager.getGID(ul);
        tfsheadupdate(overquota ? {o: gid} : {e: gid});
        mega.tpw.errorDownloadUpload(gid, errStr, overquota);


        if (ul.owner) {
            ul.owner.destroy();
        }
        else {
            oDestroy(ul);
        }
        mBroadcaster.sendMessage('upload:error', id, error);
        mBroadcaster.sendMessage('trk:event', 'upload', 'error', 'code', error);

        if (error === EOVERQUOTA) {
            if (mBroadcaster.hasListener('upload:error')) {
                ul_queue.filter(isQueueActive)
                    .forEach(function(ul) {
                        mBroadcaster.sendMessage('upload:error', ul.id, error);
                    });
            }
            ulmanager.abort(null);

            // Inform user that upload File request is not available anymore
            if (is_megadrop) {
                mBroadcaster.sendMessage('FileRequest:overquota', error);
            }
        }
        else {
            // Target is not exist on M.d anymore, target is deleted.
            if (error === EACCESS && !M.d[target]) {
                ulmanager.ulClearTargetDeleted(target);
            }
        }
    }
    else if (!overquota) {
        if (error === ESHAREROVERQUOTA) {
            msgDialog('warninga', l[135], l[8435]);
        }
        else {
            msgDialog('warninga', l[135], l[47], api_strerror(error));
        }
    }
};

MegaData.prototype.ulcomplete = function(ul, h, faid) {
    'use strict';

    // If there is no start time, initialise the upload and set percentage to 100, e.g. with deduplicated uploads
    if (h && !ul.ulSilent && ul.starttime === undefined) {
        M.ulstart(ul);
        M.ulprogress(ul, 100, ul.size, ul.size, 0);
    }

    if (self.d > 0) {
        ulmanager.logger.info('completing upload %s... (%s->%s)', ul.owner || ul.id, ul.target, h, ul.response, [ul]);
    }

    mBroadcaster.sendMessage('upload:completion', ul.id, h || -0xBADF, faid, ul.chatid);

    if (ul.skipfile) {
        showToast('megasync', l[372] + ' "' + ul.name + '" (' + l[1668] + ')');
    }
    const gid = ulmanager.getGID(ul);
    tfsheadupdate({f: gid});
    mega.tpw.finishDownloadUpload(gid, ul, h);

    this.ulfinalize(ul, ul.skipfile ? l[1668] : l[1418], h);
};

MegaData.prototype.ulfinalize = function(ul, status, h) {
    'use strict';

    if (self.d > 0) {
        ulmanager.logger.info('finalising %s (%s)', ul.owner || ul.id, status, h, ul.promiseToInvoke, ul.wsfu, [ul]);
    }

    if (ul.promiseToInvoke) {
        ul.promiseToInvoke.resolve(h);
        ul_queue[ul.pos] = Object.freeze({});
        percent_megatitle();
        return;
    }

    var id = ul.id;
    ul_queue[ul.pos] = Object.freeze({});

    if ($.transferprogress && $.transferprogress['ul_' + id]) {
        if (!$.transferprogress['ulc']) {
            $.transferprogress['ulc'] = 0;
        }
        $.transferprogress['ulc'] += $.transferprogress['ul_' + id][1];
        delete $.transferprogress['ul_' + id];
    }

    // If File request windows exists and upload
    if (id && is_megadrop) {
        mega.fileRequestUpload.onItemUploadCompletion(id);
    }
    else if (h) {
        // @todo better error handling..
        M.confirmNodesAtLocation(h).catch(tell);
    }

    delay('tfscomplete', function() {
        M.resetUploadDownload();
        $.tresizer();
    });
};

MegaData.prototype.ulstart = function(ul) {
    var id = ul.id;

    if (d) {
        ulmanager.logger.log('ulstart', id);
    }

    if (!$.transferprogress) {
        $.transferprogress = Object.create(null);
    }

    ul.starttime = new Date().getTime();
    this.ulprogress(ul, 0, 0, 0);
    mBroadcaster.sendMessage('trk:event', 'upload', 'started');
};

MegaData.prototype.showTransferToast = function showTransferToast(t_type, t_length, isPaused) {
    'use strict';

    t_type = t_type ? t_type : 'd';

    // If the user is viewing a slideshow
    if (window.toaster && window.slideshowid && page !== 'download') {

        let icons = ['upload'];
        const text = document.createElement('span');
        text.className = 'message';

        // Upload message
        if (t_type === 'u') {
            // Plural message
            text.textContent = mega.icu.format(l.transfer_toast_added_ul, t_length);
        }
        // Download message
        else {
            icons = ['download'];
            // Plural message
            text.textContent = mega.icu.format(l.transfer_toast_added_dl, t_length);
        }

        // Add (paused) to the message
        if (uldl_hold || isPaused) {
            const b = document.createElement('b');
            b.textContent = ` (${l[1651]}) `;
            text.appendChild(b);
        }

        // Show the toast
        window.toaster.main.show({
            content: text,
            icons
        });
    }
};

// @see filedrag.js
MegaData.prototype.isFileDragPage = function(page) {
    'use strict';

    return page === 'start' || page === 'login' || page === 'register';
};

MegaData.prototype.transferRowExists = function(gid) {
    'use strict';

    if (is_mobile || is_megadrop) {
        return !!document.getElementById(gid);
    }
    return mega.tpw ? mega.tpw.hasDOMRow(gid) : false;
};

// report a transient upload error
function onUploadError(ul, errorstr, reason, xhr, isOverQuota) {
    'use strict';

    if (!ul || !ul.id) {
        return;
    }

    if (d) {
        ulmanager.logger.error('onUploadError', ul.id, ul.name, errorstr, reason, hostname(ul.posturl));
    }

    if (is_mobile) {
        mobile.uploadOverlay.error(ul, errorstr);
        return;
    }

    const gid = ulmanager.getGID(ul);
    tfsheadupdate(isOverQuota ? {o: gid} : {e: gid});
    mega.tpw.errorDownloadUpload(gid, errorstr, isOverQuota);

    ul._gotTransferError = true;
}

function fm_tfspause(gid, overquota) {
    'use strict';

    if (ASSERT(typeof gid === 'string' && "zdu".indexOf(gid[0]) !== -1, 'Ivalid GID to pause')) {
        if (gid[0] === 'u') {
            ulQueue.pause(gid);
        }
        else {
            dlQueue.pause(gid);
        }

        if (page === 'download') {
            if (overquota === true) {
                setTransferStatus(gid, l[17]);
                $('.download.download-page').addClass('overquota');
            }
        }
        return true;
    }
    return false;
}

function fm_tfsresume(gid) {
    'use strict';
    if (ASSERT(typeof gid === 'string' && "zdu".indexOf(gid[0]) !== -1, 'Invalid GID to resume')) {
        if (gid[0] === 'u') {

            ulQueue.resume(gid);
        }
        else {
            if (page === 'download'
                && $('.download.download-page').hasClass('overquota')) {

                if (dlmanager.isOverFreeQuota) {
                    return dlmanager.showOverQuotaRegisterDialog();
                }

                return dlmanager.showOverQuotaDialog();
            }
            dlQueue.resume(gid);
        }
        if (uldl_hold) {
            dlQueue.resume();
            ulQueue.resume();
            uldl_hold = false;
        }
        return true;
    }
    return false;
}

function fm_tfsupdate() {
    'use strict';
    if (mega.tpw && mega.tpw.domReady) {
        mega.tpw.updateHeaderAndContent();
    }

    tfsheadupdate();
}

function tfsheadupdate(update) {
    'use strict';
    if (!tfsheadupdate.stats) {
        tfsheadupdate.stats = Object.create(null);
        // Transfer ids by type
        tfsheadupdate.stats.dl = Object.create(null);
        tfsheadupdate.stats.ul = Object.create(null);
        // Total transfers by type
        tfsheadupdate.stats.adl = 0;
        tfsheadupdate.stats.aul = 0;
        // Total errored transfers by type
        tfsheadupdate.stats.edl = 0;
        tfsheadupdate.stats.eul = 0;
        // Total overquota transfers by type
        tfsheadupdate.stats.odl = 0;
        tfsheadupdate.stats.oul = 0;
        // Total finished transfers by type
        tfsheadupdate.stats.fdl = 0;
        tfsheadupdate.stats.ful = 0;
        // Total paused transfers by type
        tfsheadupdate.stats.pdl = 0;
        tfsheadupdate.stats.pul = 0;
        tfsheadupdate.checkState = (type, id, state) =>
            tfsheadupdate.stats[type]
            && tfsheadupdate.stats[type][id]
            && tfsheadupdate.stats[type][id] === state ? -1 : 0;
    }
    if (update) {
        tfsheadcalc(update);
    }
}

function tfsheadcalc(update) {
    'use strict';
    const STATE = {
        TEMP: 0,
        INIT: 1,
        PROGRESS: 2,
        PAUSE: 3,
        ERROR: 4,
        OVERQUOTA: 5,
        FINISH: 6,
    };
    const updateStats = (type, id, key, change, state) => {
        if (state !== STATE.INIT && typeof tfsheadupdate.stats[type][id] === 'undefined') {
            return;
        }
        tfsheadupdate.stats[type][id] = state;
        if (typeof tfsheadupdate.stats[`${key}${type}`] !== 'undefined') {
            tfsheadupdate.stats[`${key}${type}`] += change;
        }
    };

    const key = Object.keys(update)[0];
    if (Array.isArray(update[key])) {
        for (const id of update[key]) {
            const patch = Object.create(null);
            patch[key] = id;
            tfsheadcalc(patch);
        }
        return;
    }
    // Zip downloads collected under dl buckets
    const type = update[key][0] === 'u' ? 'ul' : 'dl';
    const o = tfsheadupdate.checkState(type, update[key], STATE.OVERQUOTA);
    const e = tfsheadupdate.checkState(type, update[key], STATE.ERROR);
    const p = tfsheadupdate.checkState(type, update[key], STATE.PAUSE);
    if (typeof tfsheadupdate.stats[type][update[key]] === 'undefined' && ['t', 'f', 'p', 'r'].includes(key)) {
        // Update for an unknown transfer so add it first.
        tfsheadcalc({a: update[key]});
    }

    switch (key) {
        case 't': {
            // Transfer transferring
            updateStats(type, update.t, 'o', o, STATE.TEMP);
            updateStats(type, update.t, 'e', e, STATE.TEMP);
            updateStats(type, update.t, 'p', p, STATE.TEMP);
            updateStats(type, update.t, 'n', 1, STATE.PROGRESS);
            break;
        }
        case 'f': {
            // Finish transfer
            updateStats(type, update.f, 'o', o, STATE.TEMP);
            updateStats(type, update.f, 'e', e, STATE.TEMP);
            updateStats(type, update.f, 'p', p, STATE.TEMP);
            updateStats(type, update.f, key, 1, STATE.FINISH);
            break;
        }
        case 'e': {
            // Error transfer
            updateStats(type, update.e, 'p', p, STATE.TEMP);
            updateStats(type, update.e, 'o', o, STATE.TEMP);
            updateStats(type, update.e, key, 1 + e, STATE.ERROR);
            break;
        }
        case 'o': {
            // Overquota transfer
            updateStats(type, update.o, 'p', p, STATE.TEMP);
            updateStats(type, update.o, 'e', e, STATE.TEMP);
            updateStats(type, update.o, key, 1 + o, STATE.OVERQUOTA);
            break;
        }
        case 'p': {
            // Pause transfer
            if (!p && !o && !e && !tfsheadupdate.checkState(type, update.p, STATE.FINISH)) {
                updateStats(type, update.p, 'p', 1, STATE.PAUSE);
            }
            break;
        }
        case 'r': {
            // Resume transfer
            updateStats(type, update.r, 'p', p, STATE.TEMP);
            updateStats(type, update.r, 'n', 1, STATE.PROGRESS);
            break;
        }
        case 'c': {
            // Cancel transfer
            const f = tfsheadupdate.checkState(type, update.c, STATE.FINISH);
            updateStats(type, update.c, 'o', o, STATE.TEMP);
            updateStats(type, update.c, 'e', e, STATE.TEMP);
            updateStats(type, update.c, 'f', f, STATE.TEMP);
            updateStats(type, update.c, 'p', p, STATE.TEMP);
            updateStats(type, update.c, 'a', -1, STATE.TEMP);
            delete tfsheadupdate.stats[type][update.c];
            break;
        }
        default:
            if (tfsheadupdate.stats[type]) {
            const id = update[key];
            if (
                typeof tfsheadupdate.stats[type][id] !== "undefined"
                && tfsheadupdate.checkState(type, id, STATE.FINISH)
            ) {
                // If the user downloads the same finished download reset the stats and add it again.
                updateStats(type, id, 'f', -1, STATE.TEMP);
                updateStats(type, id, 'a', -1, STATE.TEMP);
                delete tfsheadupdate.stats[type][id];
                updateStats(type, id, key, 1, STATE.INIT);
            }
            else if (typeof tfsheadupdate.stats[type][id] === 'undefined') {
                // If we haven't received an update for this transfer before add it.
                updateStats(type, id, key, 1, STATE.INIT);
            }
        }
    }
}
