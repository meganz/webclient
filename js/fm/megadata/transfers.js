
MegaData.prototype.getDownloadFolderNodes = function(n, md, nodes, paths) {

    var subids = this.getNodesSync(n, false, false, true);

    for (var j = 0; j < subids.length; j++) {
        var p = this.getPath(subids[j]);
        var path = '';

        for (var k = 0; k < p.length; k++) {
            if (this.d[p[k]] && this.d[p[k]].t) {
                path = M.getSafeName(this.d[p[k]].name) + '/' + path;
            }
            if (p[k] == n) {
                break;
            }
        }

        if (!this.d[subids[j]].t) {
            nodes.push(subids[j]);
            paths[subids[j]] = path;
        }
        else {
            console.log('0 path', path);
        }
    }
};

/** like addToTransferTable, but can take a download object */
MegaData.prototype.putToTransferTable = function(node, ttl) {
    var handle = node.h || node.dl_id;
    node.name = node.name || node.n;

    if (d) {
        var isDownload = node.owner instanceof ClassFile;
        console.assert(this.isFileNode(node) || isDownload, 'Invalid putToTransferTable node.');
    }

    var gid = 'dl_' + handle;
    var isPaused = uldl_hold || dlQueue.isPaused(gid);

    var state = '';
    var pauseTxt = '';
    var isFailed = false;
    if (isPaused) {
        state = 'transfer-paused';
        pauseTxt = l[1651];
    }
    if (dlmanager.isOverQuota) {
        pauseTxt = '';
    }

    else if (node.failed || node.dl_failed) {
        isFailed = true;
    }

    var dowloadedSize = node.loaded || 0;
    var rightRotate = '';
    var leftRotate = '';

    if (dowloadedSize > 0 && node.s > 0) {
        var deg = 360 * dowloadedSize / node.s;
        if (deg <= 180) {
            rightRotate = 'style="transform: rotate(' + deg + 'deg);"';
        }
        else {
            rightRotate = 'style="transform: rotate(180deg);"';
            leftRotate = 'style="transform: rotate(' + (deg - 180) + 'deg);"';
        }
    }

    this.addToTransferTable(gid, ttl,
        '<tr id="dl_' + htmlentities(handle) + '" class="transfer-queued transfer-download ' + state + '">'
        + '<td><div class="transfer-type download sprite-fm-mono-after icon-down-after">'
        + '<ul><li class="right-c"><p ' + rightRotate + '>'
        + '<span></span></p></li><li class="left-c"><p ' + leftRotate + '><span></span></p></li></ul>'
        + '</div></td>'
        + '<td><span class="transfer-filetype-icon ' + fileIcon(node) + '"></span>'
        + '<span class="tranfer-filetype-txt">' + htmlentities(node.name) + '</span></td>'
        + '<td>' + filetype(node) + '</td>'
        + '<td class="transfer-size">' + bytesToSize(node.s) + '</td>'
        + '<td><span class="downloaded-size">' + bytesToSize(dowloadedSize) + '</span></td>'
        + '<td><span class="eta"></span><span class="speed">' + pauseTxt + '</span></td>'
        + '<td><span class="transfer-status">' + l[7227] + '</span></td>'
        + '<td class="grid-url-field">'
        + '<a class="link-transfer-status transfer-pause"><i class="sprite-fm-mono icon-pause"></i></a>'
        + '<a class="clear-transfer-icon"><i class="sprite-fm-mono icon-close-component"></i></a></td>'
        + '<td><span class="row-number"></span></td>'
        + '</tr>');

    if (isPaused) {
        fm_tfspause('dl_' + handle);
    }
    if (isFailed) {
        M.dlerror(node, node.lasterror || l[135]);
    }
    if (ttl) {
        ttl.left--;
    }
};

MegaData.prototype.addDownload = function(n, z, preview) {
    "use strict";

    if (M.isInvalidUserStatus()) {
        return;
    }

    var args = toArray.apply(null, arguments);
    // fetch all nodes needed by M.getNodesSync
    dbfetch.coll(n)
        .always(function () {
            M.addDownloadSync.apply(M, args);
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
                                n: base64urlencode(to8(M.getSafeName(node.name)))
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
                            addNodeToArray(files, M.d[nodes[k]]);
                            if (M.d[nodes[k]].t) {
                                if (M.c[nodes[k]]) {
                                    recursivelyLoadNodes(arr, Object.keys(M.c[nodes[k]]));
                                }
                            }
                        }
                        else { // it's object
                            addNodeToArray(files, nodes[k]);
                            if (nodes[k].t) {
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
                .done(function() {
                    showToast('megasync-transfer', l[8635]);
                })
                .fail(
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
        for (var i in n) {
            if (this.d[n[i]] && this.d[n[i]].t) {
                var nn = [], pp = {};
                this.getDownloadFolderNodes(n[i], false, nn, pp);
                cbs.push(this.addDownload.bind(this, nn, 0x21f9A, pp, this.d[n[i]].name));
            }
            else {
                nf.push(n[i]);
            }
        }

        quiet = n && M.d[n[0]] && M.d[n[0]].t && M.d[n[0]].tb;
        n = nf;

        if (cbs.length) {
            for (var i in cbs) {
                Soon(cbs[i]);
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
        for (var i in n) {
            if (this.d[n[i]]) {
                if (this.d[n[i]].t) {
                    this.getDownloadFolderNodes(n[i], !!z, nodes, paths);
                }
                else {
                    nodes.push(n[i]);
                }
            }
            else if (this.isFileNode(n[i])) {
                nodes.push(n[i]);
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

    var p = '';
    var pauseTxt = '';

    if (uldl_hold) {
        p = 'transfer-paused';
        pauseTxt = l[1651];
    }

    var ttl = this.getTransferTableLengths();
    let errorStatus = null;
    for (var k in nodes) {
        /* jshint -W089 */
        if (!nodes.hasOwnProperty(k) || !this.isFileNode((n = this.d[nodes[k]]))) {
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

        var $tr = !z && $('.transfer-table #dl_' + htmlentities(n.h));
        if ($tr.length) {
            if (!$tr.hasClass('transfer-completed')) {
                if ($tr.hasClass('transfer-error') && !entries.length) {
                    errorStatus = $('.transfer-status', $tr).text();
                }
                continue;
            }
            $tr.remove();
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
            this.putToTransferTable(n, ttl);
            tempEntry[e] = entries[e].entry;
        }
    }
    tfsheadupdate({
        a: z ? `dl_${entries[0].entry.zipid}` : Object.values(entries).map((e) => {
            return `dl_${e.entry.zipid ? e.entry.zipid : e.entry.id}`;
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
        this.addToTransferTable('zip_' + z, ttl,
            '<tr id="zip_' + z + '" class="transfer-queued transfer-download ' + p + '">'
            + '<td><div class="transfer-type download sprite-fm-mono-after icon-down-after">'
            + '<ul><li class="right-c"><p><span></span></p></li><li class="left-c"><p><span></span></p></li></ul>'
            + '</div></td>'
            + '<td><span class="transfer-filetype-icon ' + fileIcon({name: 'archive.zip'}) + '"></span>'
            + '<span class="tranfer-filetype-txt">' + htmlentities(zipname) + '</span></td>'
            + '<td>' + filetype({name: 'archive.zip'}) + '</td>'
            + '<td class="transfer-size">' + bytesToSize(zipsize) + '</td>'
            + '<td><span class="downloaded-size">' + bytesToSize(0) + '</span></td>'
            + '<td><span class="eta"></span><span class="speed">' + pauseTxt + '</span></td>'
            + '<td><span class="transfer-status">' + l[7227] + '</span></td>'
            + '<td class="grid-url-field">'
            + '<a class="link-transfer-status transfer-pause"><i class="sprite-fm-mono icon-pause"></i></a>'
            + '<a class="clear-transfer-icon"><i class="sprite-fm-mono icon-close-component"></i></a></td>'
            + '<td><span class="row-number"></span></td>'
            + '</tr>');


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
    if (!$.transferHeader) {
        M.addTransferPanelUI();
    }
    delay('fm_tfsupdate', fm_tfsupdate); // this will call $.transferHeader();

    if (!isZIP || zipSize) {
        this.addDownloadToast = ['d', isZIP ? 1 : added, isPaused];
    }
    M.openTransfersPanel();
    initTreeScroll();

    if ((dlmanager.isDownloading = Boolean(dl_queue.length))) {
        $('.transfer-pause-icon').removeClass('disabled');
        $('.transfer-clear-completed').removeClass('disabled');
        $('.transfer-clear-all-icon').removeClass('disabled');
    }
};

MegaData.prototype.dlprogress = function(id, perc, bl, bt, kbps, dl_queue_num, force) {
    var st;
    var original_id = id;

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
        mega.tpw.updateDownloadUpload(mega.tpw.DOWNLOAD, original_id, perc, bl, bt, kbps, dl_queue_num, st);
    }

    var $tr = $('.transfer-table #' + id);
    if (!$tr.hasClass('transfer-started')) {
        $tr.find('.transfer-status').text('');
        $tr.addClass('transfer-started');
        $tr.removeClass('transfer-initiliazing transfer-queued');
        $('.transfer-table').prepend($tr);
        delay('fm_tfsupdate', fm_tfsupdate); // this will call $.transferHeader();
    }

    // var eltime = (new Date().getTime()-st)/1000;
    var bps = kbps * 1000;
    var retime = bps && (bt - bl) / bps;
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

            $tr.find('.transfer-status').text(perc + '%');
            var transferDeg = 360 * perc / 100;
            if (transferDeg <= 180) {
                $tr.find('.right-c p').css('transform', 'rotate(' + transferDeg + 'deg)');
            }
            else {
                $tr.find('.right-c p').css('transform', 'rotate(180deg)');
                $tr.find('.left-c p').css('transform', 'rotate(' + (transferDeg - 180) + 'deg)');
            }
            if (retime > 0) {
                var title = '';
                try {
                    title = new Date((unixtime() + retime) * 1000).toLocaleString();
                }
                catch (ex) {
                }
                $tr.find('.eta')
                    .text(secondsToTime(retime))
                    .removeClass('unknown')
                    .attr('title', title);
            }
            else {
                $tr.find('.eta').addClass('unknown').text('');
            }
            $('.downloaded-size', $tr).text(bytesToSize(bl, 1));
            if (bps > 0) {
                $tr.removeClass('transfer-error');
                $('.speed', $tr).text(bytesToSpeed(bps, 1)).removeClass('unknown');
            }
            else {
                $tr.find('.speed').addClass('unknown').text('');
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

    tfsheadupdate({f: `dl_${z ? z : id}`});
    mega.tpw.finishDownloadUpload(mega.tpw.DOWNLOAD, dl);


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

    var $tr = $('.transfer-table #' + id);
    $tr.removeClass('transfer-started').addClass('transfer-completed');
    $tr.find('.left-c p, .right-c p').css('transform', 'rotate(180deg)');
    $tr.find('.transfer-status').text(l[1418]);
    $tr.find('.eta, .speed').text('').removeClass('unknown');
    $tr.find('.downloaded-size').html($tr.find('.transfer-size').text());

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
            errorstr = l[24];
            break;
        case EOVERQUOTA:
            errorstr = l[20666];
            overquota = true;
            break;
        // case EAGAIN:               errorstr = l[233]; break;
        // case ETEMPUNAVAIL:         errorstr = l[233]; break;
        default:
            errorstr = l[x = 233];
            break;
    }
    tfsheadupdate(overquota ? {o: gid} : {e: gid});
    mega.tpw.errorDownloadUpload(mega.tpw.DOWNLOAD, dl, errorstr, overquota);


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
                    $('.download.eta-block .span').text('');
                    $('.download.speed-block span').text('');
                    $('.download .pause-transfer').removeClass('hidden').addClass('active')
                        .find('span').text(l[1649]);
                    $('.download.download-page').addClass('overquota');
                }
                else {
                    $('.download.download-page').removeClass('overquota');
                }
            }
            else {
                var $tr = $('.transfer-table tr#' + gid);

                $tr.addClass('transfer-error');
                $tr.find('.eta, .speed').text('').addClass('unknown');

                if (error === EOVERQUOTA) {
                    $tr.find('.transfer-status').addClass('overquota');
                }
            }

            switch (error) {
                case EACCESS:
                case ETOOMANY:
                case EBLOCKED:
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

    if (this.tfsdomqueue[id]) {
        // flush the transfer from the DOM queue
        addToTransferTable(id, this.tfsdomqueue[id]);
        delete this.tfsdomqueue[id];
    }

    $('.transfer-table #' + id)
        .addClass('transfer-initiliazing')
        .find('.transfer-status').text(l[1042]);

    dl.st = Date.now();
    ASSERT(typeof dl_queue[dl.pos] === 'object', 'No dl_queue entry for the provided dl...');
    ASSERT(typeof dl_queue[dl.pos] !== 'object' || dl.n == dl_queue[dl.pos].n, 'No matching dl_queue entry...');
    if (typeof dl_queue[dl.pos] === 'object') {
        fm_tfsupdate(); // this will call $.transferHeader()
        this.dlprogress(id, 0, 0, 0, 0, dl.pos);

    }
};

MegaData.prototype.doFlushTransfersDynList = function(aNumNodes) {
    aNumNodes = Object.keys(this.tfsdomqueue).slice(0, aNumNodes | 0);

    if (aNumNodes.length) {
        for (var i = 0, l = aNumNodes.length; i < l; ++i) {
            var item = aNumNodes[i];

            addToTransferTable(item, this.tfsdomqueue[item], 1);
            delete this.tfsdomqueue[item];
        }

        $.tresizer();
    }
};

MegaData.prototype.tfsResizeHandler = SoonFc(function() {

    const T = M.getTransferTableLengths();

    if (T) {

        if (d) {
            console.log('resize.tfsdynlist', JSON.stringify(T));
        }

        if (T.left > 0) {
            M.doFlushTransfersDynList(T.left + 3);
        }
    }
});

MegaData.prototype.getTransferTableLengths = function() {
    "use strict";

    var te = this.getTransferElements();
    if (!te) {
        return false;
    }
    var used = te.domTable.querySelectorAll('tr').length;
    var size = (Math.ceil(te.domScrollingTable.offsetHeight / 32) || 27) + 1;
    return { size: size, used: used, left: size - used };
};

MegaData.prototype.getTransferElements = function() {
    'use strict';
    const obj = Object.create(null);
    obj.domTransfersBlock = document.querySelector('.fm-transfers-block');
    if (!obj.domTransfersBlock) {
        return false;
    }
    obj.domTableWrapper = obj.domTransfersBlock.querySelector('.transfer-table-wrapper');
    obj.domTransferHeader = obj.domTransfersBlock.querySelector('.fm-transfers-header');
    obj.domPanelTitle = obj.domTransferHeader.querySelector('.transfer-panel-title');
    obj.domUploadBlock = obj.domPanelTitle.querySelector('.upload');
    obj.domUploadProgressText = obj.domUploadBlock.querySelector('.transfer-progress-txt');
    obj.domDownloadBlock = obj.domPanelTitle.querySelector('.download');
    obj.domDownloadProgressText = obj.domDownloadBlock.querySelector('.transfer-progress-txt');
    obj.domTableEmptyTxt = obj.domTableWrapper.querySelector('.transfer-panel-empty-txt');
    obj.domScrollingTable = obj.domTableWrapper.querySelector('.transfer-scrolling-table');
    obj.domTable = obj.domScrollingTable.querySelector('.transfer-table tbody');
    obj.domDownloadChart = obj.domDownloadBlock.querySelector('.progress-chart');
    obj.domUploadChart = obj.domUploadBlock.querySelector('.progress-chart');

    Object.defineProperty(this, 'getTransferElements', {
        value() {
            return obj;
        }
    });

    return obj;
};

function addToTransferTable(gid, elem, q) {
    var te = M.getTransferElements();
    var target = gid[0] === 'u'
        ? $('tr.transfer-upload.transfer-queued:last', te.domTable)
        : $('tr.transfer-download.transfer-queued:last', te.domTable);

    if (target.length) {
        target.after(elem);
    }
    else {
        if (gid[0] != 'u') {
            target = $('tr.transfer-upload.transfer-queued:first', te.domTable);
        }

        if (target.length) {
            target.before(elem);
        }
        else {
            target = $('tr.transfer-completed:first', te.domTable);

            if (target.length) {
                target.before(elem);
            }
            else {
                $(te.domTable).append(elem);
            }
        }
    }
    /*if ($.mSortableT) {
     $.mSortableT.sortable('refresh');
     }*/
    if (!q) {
        delay('fm_tfsupdate', fm_tfsupdate);
    }
}
MegaData.prototype.addToTransferTable = function(gid, ttl, elem) {
    var T = ttl || this.getTransferTableLengths();
    if (T === false) {
        return;
    }

    if (d > 1) {
        var logger = (gid[0] === 'u' ? ulmanager : dlmanager).logger;
        logger.info('Adding Transfer', gid, JSON.stringify(T));
    }

    if (this.tfsResizeHandler) {
        M.getTransferElements()
            .domScrollingTable
            .addEventListener('ps-y-reach-end', M, {passive: true});
        mBroadcaster.addListener('tfs-dynlist-flush', M);

        $(window).rebind('resize.tfsdynlist', this.tfsResizeHandler);
        this.tfsResizeHandler = null;
    }

    if (T.left > 0) {
        addToTransferTable(gid, elem, true);
    }
    else {
        var fit;

        if (gid[0] !== 'u') {
            // keep inserting downloads as long there are uploads
            var dl = $('.transfer-table tr.transfer-download.transfer-queued:last');

            if (dl.length) {
                dl = dl.prevAll().length;

                fit = (dl && dl + 1 < T.used);
            }
            else {
                fit = !document.querySelector('.transfer-table tr.transfer-download');
            }

            if (fit) {
                addToTransferTable(gid, elem);
            }
        }
        else {
            // Keep inserting uploads as long downloads are overquota...
            // XXX: Check whether there is a noticeable performance degradation...

            if (document.querySelector('.transfer-table tr.transfer-download .transfer-status.overquota')) {
                fit = true;
                addToTransferTable(gid, elem);
            }
        }

        if (!fit) {
            M.tfsdomqueue[gid] = elem;
        }
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
                        megasync.uploadFile(M.currentdirid);
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
    var ephemeral = page === 'start';
    var ttl = this.getTransferTableLengths();

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
            var filesize = f.size;

            ul_id = ++__ul_id;
            f.target = f.target || target;
            f.id = ul_id;

            var gid = 'ul_' + ul_id;
            var template = (
                '<tr id="' + gid + '" class="transfer-queued transfer-upload ' + pause + '">'
                + '<td><div class="transfer-type upload sprite-fm-mono-after icon-up-after">'
                + '<ul><li class="right-c"><p><span></span></p></li>'
                + '<li class="left-c"><p><span></span></p></li></ul>'
                + '</div></td>'
                + '<td><span class="transfer-filetype-icon ' + fileIcon({ name: f.name }) + '"></span>'
                + '<span class="tranfer-filetype-txt">' + htmlentities(f.name) + '</span></td>'
                + '<td>' + filetype(f.name) + '</td>'
                + '<td class="transfer-size">' + bytesToSize(filesize) + '</td>'
                + '<td><span class="uploaded-size">' + bytesToSize(0) + '</span></td>'
                + '<td><span class="eta"></span><span class="speed">' + pauseTxt + '</span></td>'
                + '<td><span class="transfer-status">' + l[7227] + '</span></td>'
                + '<td class="grid-url-field">'
                + '<a class="link-transfer-status transfer-pause"><i class="sprite-fm-mono icon-pause"></i></a>'
                + '<a class="clear-transfer-icon"><i class="sprite-fm-mono icon-close-component"></i></a></td>'
                + '<td><span class="row-number"></span></td>'
                + '</tr>');
            this.addToTransferTable(gid, ttl || f, template);

            if (typeof f._replaces === 'number') {
                // We need to create a version for a pending upload, hold it up until it finishes.
                ulmanager.holdUntilUploadFinished(f, f._replaces, true);
                delete f._replaces;
            }
            else {
                ul_queue.push(f);
            }

            if (ttl) {
                ttl.left--;
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
        tfsheadupdate({
            a: u.map((u) => {
                return `ul_${u.id}`;
            })
        });
        mega.tpw.addDownloadUpload(mega.tpw.UPLOAD, u);

        if (!added) {
            ulmanager.logger.warn('Nothing added to upload.');
            return;
        }
        if (!$.transferHeader) {
            M.addTransferPanelUI();
        }
        if (ephemeral && !Object(u_attr).terms) {
            ulQueue.pause();
            uldl_hold = true;
        }
        else {
            M.showTransferToast('u', added);
            M.openTransfersPanel();
            delay('fm_tfsupdate', fm_tfsupdate); // this will call $.transferHeader()
        }

        if ((ulmanager.isUploading = Boolean(ul_queue.length))) {
            $('.transfer-pause-icon').removeClass('disabled');
            $('.transfer-clear-completed').removeClass('disabled');
            $('.transfer-clear-all-icon').removeClass('disabled');

            M.onFileManagerReady(function() {

                if (ulmanager.ulOverStorageQuota) {
                    ulmanager.ulShowOverStorageQuotaDialog();
                }

                if (mBroadcaster.hasListener('upload:start')) {
                    var data = Object.create(null);

                    for (var i = u.length; i--;) {
                        var f = u[i];

                        data[f.id] = {
                            uid: f.id,
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

    var makeDirProc = function() {
        var conflicts = [];
        var folders = Object.keys(queue);

        if (d) {
            console.time('makeDirProc-' + uuid);
        }

        for (var i = folders.length; i--;) {
            var name = folders[i];
            var found = fileconflict.getNodeByName(target, name);

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
                M.createFolders(paths, toChat ? M.cf.p || M.RootID : target).always(function(res) {
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
        dbfetch.get(String(target)).finally(() => {
            makeDirProc();
            // M.checkGoingOverStorageQuota(ulOpSize).done(makeDirProc);
        });
    });

    makeDirPromise.then(() => {
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

        return dbfetch.geta(Object.keys(targets)).then((r) => {
            // loadingDialog.hide();

            if (!M.c[target] && String(target).length !== 11 && !toChat) {
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
    nFile.isCreateFile = true;
    nFile.promiseToInvoke = addFilePromise;


    ul_queue.push(nFile);
    return addFilePromise;
};

// eslint-disable-next-line complexity
MegaData.prototype.ulprogress = function(ul, perc, bl, bt, bps) {
    'use strict';
    var id = ul.id;
    var domElement = ul.domElement;

    if (!domElement || !domElement.parentNode) {
        var $tr = $('#ul_' + id);
        delay('fm_tfsupdate', fm_tfsupdate); // this will call $.transferHeader()

        $tr.find('.transfer-status').text('');
        $tr.removeClass('transfer-initiliazing transfer-queued');
        $tr.addClass('transfer-started');
        // eslint-disable-next-line local-rules/jquery-replacements
        $($tr.closest('table')).prepend($tr);

        domElement = ul.domElement = document.getElementById('ul_' + id);
        if (!domElement) {
            console.error('DOM Element not found...', id, ul);
            return false;
        }

        domElement._elmStatus = domElement.querySelector('.transfer-status');
        domElement._elmSentSize = domElement.querySelector('.uploaded-size');
        domElement._elmRProgress = domElement.querySelector('.right-c p');
        domElement._elmLProgress = domElement.querySelector('.left-c p');
        domElement._elmTimeLeft = domElement.querySelector('.eta');
        domElement._elmSpeed = domElement.querySelector('.speed');
    }

    if (!bl || !ul.starttime || uldl_hold) {
        return false;
    }

    $.transferprogress['ul_' + id] = [bl, bt, bps];
    delay('percent_megatitle', percent_megatitle, 50);

    if (domElement._elmRProgress) {
        var transferDeg = 360 * perc / 100;
        if (transferDeg <= 180) {
            domElement._elmRProgress.style.transform = 'rotate(' + transferDeg + 'deg)';
        }
        else {
            domElement._elmRProgress.style.transform = 'rotate(180deg)';
            domElement._elmLProgress.style.transform = 'rotate(' + (transferDeg - 180) + 'deg)';
        }
    }

    if (domElement._elmStatus) {
        domElement._elmStatus.textContent = perc + '%';
    }

    if (domElement._elmSentSize) {
        if (perc > 99) {
            domElement._elmSentSize.textContent = bytesToSize(bt, 2);
        }
        else {
            domElement._elmSentSize.textContent = bytesToSize(bl, 1, -1);
        }
    }

    if (domElement._elmTimeLeft) {
        var retime = bps > 1000 ? (bt - bl) / bps : -1;
        if (retime > 0) {
            if (!domElement._elmTimeLeft.textContent) {
                domElement._elmTimeLeft.classList.remove('unknown');
            }
            domElement._elmTimeLeft.textContent = secondsToTime(retime);
        }
        else {
            domElement._elmTimeLeft.classList.add('unknown');
            domElement._elmTimeLeft.textContent = '';
        }
    }

    if (domElement._elmSpeed) {
        if (bps > 0) {
            if (!domElement._elmSpeed.textContent) {
                domElement._elmSpeed.classList.remove('unknown');
            }
            domElement._elmSpeed.textContent = bytesToSpeed(bps, 1);
        }
        else {
            domElement._elmSpeed.classList.add('unknown');
            domElement._elmSpeed.textContent = '';
        }
    }

    if (ul._gotTransferError && bps > 0) {
        ul._gotTransferError = false;
        domElement.classList.remove('transfer-error');
    }
    tfsheadupdate({t: `ul_${id}`});
    mega.tpw.updateDownloadUpload(mega.tpw.UPLOAD, id, perc, bl, bt, bps, ul.pos, ul.starttime);
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
    else {
        overquota = false;
    }

    if (ul) {
        var id = ul.id;
        var target = ul.target;

        var errStr = api_strerror(error);

        this.ulfinalize(ul, errStr);
        tfsheadupdate(overquota ? {o: `ul_${id}`} : {e: `ul_${id}`});
        mega.tpw.errorDownloadUpload(mega.tpw.UPLOAD, ul, errStr, overquota);


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
            const tfse = M.getTransferElements();
            const $rows = $("tr[id^='ul_']", tfse.domTable);
            $rows.addClass('transfer-error overquota').removeClass('transfer-completed');
            $('.transfer-status', $rows).text(l[1010]);

            // Inform user that upload File request is not available anymore
            if (is_megadrop) {
                mBroadcaster.sendMessage('FileRequest:overquota', error);
            }
        }
        else {
            if (error < 0) {
                const $ulRow = $(`#ul_${id}`);
                $ulRow.addClass('transfer-error').removeClass('transfer-completed');
                if (error === EOVERQUOTA) {
                    $ulRow.addClass('overquota');
                }
            }

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
    if (h && !ul.isCreateFile && typeof ul.starttime === 'undefined') {
        M.ulstart(ul);
        M.ulprogress(ul, 100, ul.size, ul.size, 0);
    }

    mBroadcaster.sendMessage('upload:completion', ul.id, h || -0xBADF, faid, ul.chatid);

    if (ul.skipfile) {
        showToast('megasync', l[372] + ' "' + ul.name + '" (' + l[1668] + ')');
    }

    tfsheadupdate({f: `ul_${ul.id}`});
    mega.tpw.finishDownloadUpload(mega.tpw.UPLOAD, ul, h);

    this.ulfinalize(ul, ul.skipfile ? l[1668] : l[1418], h);
};

MegaData.prototype.ulfinalize = function(ul, status, h) {
    'use strict';
    if (ul.promiseToInvoke) {
        ul.promiseToInvoke.resolve(h);
        ul_queue[ul.pos] = Object.freeze({});
        percent_megatitle();
        return;
    }

    var id = ul.id;
    var $tr = $('#ul_' + id);

    $tr.removeClass('transfer-started').addClass('transfer-completed');
    $('.link-transfer-status', $tr).addClass('hidden');
    $tr.find('.left-c p, .right-c p').css('transform', 'rotate(180deg)');
    $tr.find('.transfer-status').text(status);
    $tr.find('.eta, .speed').text('').removeClass('unknown');
    $('.uploaded-size', $tr).text(bytesToSize(ul.size, 2));
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

    $('.transfer-status', $('#ul_' + id).addClass('transfer-initiliazing')).text(l[1042]);

    ul.starttime = new Date().getTime();
    fm_tfsupdate();// this will call $.transferHeader()
    this.ulprogress(ul, 0, 0, 0);
    mBroadcaster.sendMessage('trk:event', 'upload', 'started');
};

MegaData.prototype.openTransfersPanel = function openTransfersPanel() {
    'use strict';

    $.tresizer();
    $('.nw-fm-left-icon.transfers').addClass('transfering');
    // Start the new transfer right away even if the queue is paused?
    // XXX: Remove fm_tfspause calls at M.addDownload/addUpload to enable this
    /*if (uldl_hold) {
        uldl_hold = false;
        dlQueue.resume();
        ulQueue.resume();
        $('.transfer-pause-icon').removeClass('active').find('span').text(l[6993]);
        $('.nw-fm-left-icon.transfers').removeClass('paused');
    }*/
    // $(window).trigger('resize'); // this will call initTreeScroll();

    if ($('table.transfer-table tr').length > 1) {
        $('.transfer-clear-all-icon').removeClass('hidden');
    }
};

MegaData.prototype.showTransferToast = function showTransferToast(t_type, t_length, isPaused) {
    'use strict';

    t_type = t_type ? t_type : 'd';

    // If the user is viewing a slideshow
    if (window.slideshowid && page !== 'download') {

        let icons = ['upload'];
        const text = document.createElement('span');
        text.className = 'message';
        let buttons = [];

        // Upload message
        if (t_type === 'u') {
            // Plural message
            if (t_length > 1) {
                text.textContent = l[12480].replace('%1', t_length);
            }
            // Singular message
            else {
                text.textContent = l[7223];
            }
        }
        // Download message
        else {
            icons = ['download'];
            // Plural message
            if (t_length > 1) {
                text.textContent = l[12481].replace('%1', t_length);
            }
            // Singular message
            else {
                text.textContent = l[7222];
            }
        }

        // Add (paused) to the message
        if (uldl_hold || isPaused) {
            const b = document.createElement('b');
            b.textContent = ` (${l[1651]}) `;
            text.appendChild(b);
        }

        // Only display the "Show me" button in the toast if the user is logged in
        if (u_type) {
            buttons.push({
                text: l[7224],
                onClick: () => {
                    // Hide the toast and overlay, open the transfers page
                    window.toaster.main.hideAll();
                    const el = document.querySelector('.viewer-overlay');
                    if (el) {
                        el.classList.add('hidden');
                    }
                    document.querySelector('.nw-fm-left-icon.transfers').click();
                }
            });
        }

        // Show the toast
        window.toaster.main.show({
            content: text,
            buttons,
            icons
        });
    }
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

    tfsheadupdate(isOverQuota ? {o: `ul_${ul.id}`} : {e: `ul_${ul.id}`});
    mega.tpw.errorDownloadUpload(mega.tpw.UPLOAD, { id: ul.id }, errorstr, isOverQuota);

    ul._gotTransferError = true;
    const $ulRow = $(`#ul_${ul.id}`);
    $ulRow.addClass('transfer-error');
    $('.transfer-status', $ulRow).text(errorstr);
    if (isOverQuota) {
        $ulRow.addClass('overquota');
    }
}


function resetOverQuotaTransfers(ids) {
    $('#' + ids.join(',#'))
        .addClass('transfer-queued')
        .find('.transfer-status')
        .removeClass('overquota')
        .text(l[7227]);

    tfsheadupdate({t: ids});
    mega && mega.tpw && mega.tpw.resetErrorsAndQuotasUI(mega.tpw.DOWNLOAD);
}

function fm_tfspause(gid, overquota) {
    'use strict';
    var transferType;
    if (ASSERT(typeof gid === 'string' && "zdu".indexOf(gid[0]) !== -1, 'Ivalid GID to pause')) {
        if (gid[0] === 'u') {
            ulQueue.pause(gid);
            transferType = mega.tpw.UPLOAD;
        }
        else {
            dlQueue.pause(gid);
            transferType = mega.tpw.DOWNLOAD;
        }

        if (page === 'download') {
            if (overquota === true) {
                setTransferStatus(gid, l[20666]);
                $('.download.download-page').addClass('overquota');
            }
            $('.download .pause-transfer').removeClass('hidden').addClass('active')
                .find('span').text(l[1649]);
            $('.download.download-page').addClass('paused-transfer');
            $('.download.eta-block .dark-numbers').text('');
            $('.download.eta-block .light-txt').text(l[1651]);
            $('.download.speed-block .dark-numbers').text('');
            $('.download.speed-block .light-txt').safeHTML('&mdash; ' + l['23062.k']);
        }
        else {
            var $tr = $('#' + gid);

            if ($tr.hasClass('transfer-started')) {
                $tr.find('.eta').text('').addClass('unknown');
            }
            $tr.find('.speed').text(l[1651]).addClass('unknown');
            $tr.addClass('transfer-paused');
            $tr.removeClass('transfer-started');

            let $transLink = $('.link-transfer-status', $tr);
            $transLink.removeClass('transfer-pause').addClass('transfer-play');
            $('i', $transLink).removeClass('icon-pause').addClass('icon-play-small');

            if (overquota === true) {
                $tr.addClass('transfer-error');
                if (gid[0] === 'u') {
                    $tr.addClass('overquota');
                }
                $tr.find('.transfer-status').addClass('overquota').text(l[1673]);
                tfsheadupdate({o: gid});
                mega.tpw.errorDownloadUpload(transferType, { id: gid.split('_').pop() }, l[1673], overquota);
            }
            else {
                $tr.addClass('transfer-queued');
                $tr.removeClass('transfer-error');
                $tr.find('.transfer-status').text(l[7227]);
                tfsheadupdate({p: gid});
                mega.tpw.pauseDownloadUpload(transferType, { id: gid.split('_').pop() });
            }
        }
        return true;
    }
    return false;
}

function fm_tfsresume(gid) {
    'use strict';
    if (ASSERT(typeof gid === 'string' && "zdu".indexOf(gid[0]) !== -1, 'Invalid GID to resume')) {

        var $tr = $('#' + gid);
        tfsheadupdate({r: gid});
        if (gid[0] === 'u') {
            mega.tpw.resumeDownloadUpload(mega.tpw.UPLOAD, { id: gid.split('_').pop() });

            ulQueue.resume(gid);

            $tr.removeClass('transfer-paused');

            let $transLink = $('.link-transfer-status', $tr);
            $transLink.removeClass('transfer-play').addClass('transfer-pause');
            $('i', $transLink).removeClass('icon-play-small').addClass('icon-pause');
        }
        else {
            mega.tpw.resumeDownloadUpload(mega.tpw.DOWNLOAD, { id: gid.split('_').pop() });

            if (page === 'download'
                && $('.download.download-page').hasClass('overquota')
                || $tr.find('.transfer-status').hasClass('overquota')) {

                if (page === 'download') {
                    $('.download .pause-transfer').removeClass('hidden').addClass('active');
                    $('.download.download-page').addClass('paused-transfer');
                }

                if (dlmanager.isOverFreeQuota) {
                    return dlmanager.showOverQuotaRegisterDialog();
                }

                return dlmanager.showOverQuotaDialog();
            }
            dlQueue.resume(gid);

            if (page === 'download') {
                $('.download .pause-transfer').removeClass('active').find('span').text(l[9112]);
                $('.download.download-page').removeClass('paused-transfer');
                $('.download.speed-block .light-txt').safeHTML('&mdash; ' + l['23062.k']);
            }
            else {
                $tr.removeClass('transfer-paused');

                let $transLink = $('.link-transfer-status', $tr);
                $transLink.removeClass('transfer-play').addClass('transfer-pause');
                $('i', $transLink).removeClass('icon-play-small').addClass('icon-pause');

                if ($('tr.transfer-started, tr.transfer-initiliazing', $tr.closest('table')).length) {
                    $('.speed, .eta', $tr).removeClass('unknown').text('');
                }
                else {
                    $('.transfer-status', $tr.addClass('transfer-initiliazing')).text(l[1042]);
                }
            }
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
    /* jshint -W074 */

    var i = 0;
    var u = 0;

    var tfse = M.getTransferElements();
    if (!tfse) {
        return false;
    }
    var domTable = tfse.domTable;

    var domCompleted = domTable.querySelectorAll('tr.transfer-completed');
    var completedLen = domCompleted.length;
    if (completedLen) {
        var ttl    = M.getTransferTableLengths();
        var parent = domCompleted[0].parentNode;

        if (ttl.used > 10 && completedLen + 4 > ttl.size || M.pendingTransfers > 50 + ttl.used * 4) {
            // Remove completed transfers filling the whole table
            while (completedLen--) {
                parent.removeChild(domCompleted[completedLen]);
            }
            mBroadcaster.sendMessage('tfs-dynlist-flush');
        }
        else if (M.pendingTransfers) {
            // Move completed transfers to the bottom
            while (completedLen--) {
                parent.appendChild(domCompleted[completedLen]);
            }
        }
    }
    if ($.transferHeader) {
        $.transferHeader(tfse);
    }

    var $trs = domTable.querySelectorAll('tr:not(.transfer-completed)');
    i = $trs.length;
    while (i--) {
        if ($trs[i].classList.contains('transfer-upload')) {
            ++u;
        }
    }
    i = $trs.length - u;
    for (var k in M.tfsdomqueue) {
        if (k[0] === 'u') {
            ++u;
        }
        else {
            ++i;
        }
    }

    M.pendingTransfers = i + u;
    tfsheadupdate();
}

function tfsheadupdate(update) {
    'use strict';
    const processStats = function(tRemain, tBytes, tDoneBytes, tOq, tErr, blocks) {
        if (tOq) {
            blocks.block.classList.add('overquota');
            blocks.text.textContent = l.tfw_header_overquota;
        }
        else if (tErr) {
            blocks.block.classList.add('error');
            blocks.text.textContent = l.tfw_header_error;
        }
        else if (tRemain) {
            blocks.text.textContent = String(l[20808] || '').replace('{0}', tRemain > 999 ? '999+' : tRemain);
            blocks.block.classList.remove('error', 'overquota');
        }
        else {
            blocks.text.textContent = l.tfw_header_complete;
            blocks.block.classList.remove('error', 'overquota');
        }
        let perc = tDoneBytes / tBytes;
        perc = isNaN(perc) ? 0 : Math.round(perc * 100);
        const fullDeg = 360;
        const deg = fullDeg * perc / 100;
        const leftChart = blocks.chart.querySelector('.left-chart');
        const rightChart = blocks.chart.querySelector('.right-chart');
        const leftSpan = leftChart.getElementsByTagName('span')[0];
        if (perc < 50) {
            leftChart.classList.add('low-percent-clip');
            rightChart.classList.add('low-percent-clip');
            leftSpan.style.transform = `rotate(${180 + deg}deg)`;
        }
        else {
            leftChart.classList.remove('low-percent-clip');
            rightChart.classList.remove('low-percent-clip');
            leftSpan.style.transform = `rotate(${deg - 180}deg)`;
        }
    };

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
        tfsheadupdate.checkState = (type, id, state) =>
            tfsheadupdate.stats[type]
            && tfsheadupdate.stats[type][id]
            && tfsheadupdate.stats[type][id] === state ? -1 : 0;
    }
    if (update) {
        tfsheadcalc(update);
    }

    const tfse = M.getTransferElements();
    if (!tfse) {
        return;
    }

    const blocks = Object.create(null);
    const { adl, aul, edl, eul, odl, oul, fdl, ful } = tfsheadupdate.stats;
    let { dl_done, ul_done, dl_total, ul_total } = getTransfersPercent();
    if (!dl_total && !dl_done) {
        dl_total = 1;
        dl_done = 1;
    }
    if (!ul_total && !ul_done) {
        ul_total = 1;
        ul_done = 1;
    }
    if (aul) {
        blocks.block = tfse.domUploadBlock;
        blocks.text = tfse.domUploadProgressText;
        blocks.chart = tfse.domUploadChart;
        processStats(
            aul - ful,
            ul_total,
            ul_done,
            oul,
            eul,
            blocks
        );
        tfse.domUploadBlock.classList.remove('hidden');
    }
    else {
        tfse.domUploadBlock.classList.add('hidden');
    }
    if (adl) {
        blocks.block = tfse.domDownloadBlock;
        blocks.text = tfse.domDownloadProgressText;
        blocks.chart = tfse.domDownloadChart;
        processStats(
            adl - fdl,
            dl_total,
            dl_done,
            odl,
            edl,
            blocks
        );
        tfse.domDownloadBlock.classList.remove('hidden');
    }
    else {
        tfse.domDownloadBlock.classList.add('hidden');
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
    update[key] = update[key].replace('zip_', 'dl_').replace('LOCKed_', '');
    const type = update[key].split('_')[0];
    const o = tfsheadupdate.checkState(type, update[key], STATE.OVERQUOTA);
    const e = tfsheadupdate.checkState(type, update[key], STATE.ERROR);
    if (typeof tfsheadupdate.stats[type][update[key]] === 'undefined' && ['t', 'f', 'p', 'r'].includes(key)) {
        // Update for an unknown transfer so add it first.
        tfsheadcalc({a: update[key]});
    }

    switch (key) {
        case 't': {
            // Transfer transferring
            updateStats(type, update.t, 'o', o, STATE.TEMP);
            updateStats(type, update.t, 'e', e, STATE.TEMP);
            updateStats(type, update.t, 'n', 1, STATE.PROGRESS);
            break;
        }
        case 'f': {
            // Finish transfer
            updateStats(type, update.f, key, 1, STATE.FINISH);
            break;
        }
        case 'e': {
            // Error transfer
            updateStats(type, update.e, 'o', o, STATE.TEMP);
            updateStats(type, update.e, key, 1 + e, STATE.ERROR);
            break;
        }
        case 'o': {
            // Overquota transfer
            updateStats(type, update.o, 'e', e, STATE.TEMP);
            updateStats(type, update.o, key, 1 + o, STATE.OVERQUOTA);
            break;
        }
        case 'p': {
            // Pause transfer
            updateStats(type, update.p, 'e', e, STATE.TEMP);
            updateStats(type, update.p, 'o', o, STATE.TEMP);
            updateStats(type, update.p, 'n', 1, STATE.PAUSE);
            break;
        }
        case 'r': {
            // Resume transfer
            updateStats(type, update.r, 'n', 1, STATE.PROGRESS);
            break;
        }
        case 'c': {
            // Cancel transfer
            const f = tfsheadupdate.checkState(type, update.c, STATE.FINISH);
            updateStats(type, update.c, 'o', o, STATE.TEMP);
            updateStats(type, update.c, 'e', e, STATE.TEMP);
            updateStats(type, update.c, 'f', f, STATE.TEMP);
            updateStats(type, update.c, 'a', -1, STATE.TEMP);
            delete tfsheadupdate.stats[type][update.c];
            break;
        }
        default: {
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
