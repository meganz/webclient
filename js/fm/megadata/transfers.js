MegaData.prototype.makeDir = function(n) {
    if (is_chrome_firefox & 4) {
        return;
    }

    var dirs = [];

    function getfolders(d, o) {
        var c = 0;
        for (var e in M.d) {
            if (M.d[e].t == 1 && M.d[e].p == d) {
                var p = o || [];
                if (!o) {
                    p.push(M.getSafeName(M.d[d].name));
                }
                p.push(M.getSafeName(M.d[e].name));
                if (!getfolders(M.d[e].h, p)) {
                    dirs.push(p);
                }
                ++c;
            }
        }
        return c;
    }

    getfolders(n);

    if (d) {
        console.log('makedir', dirs);
    }

    if (is_chrome_firefox) {
        var root = mozGetDownloadsFolder();
        if (root) {
            dirs.filter(String).forEach(function(p) {
                try {
                    p = mozFile(root, 0, p);
                    if (!p.exists()) {
                        p.create(Ci.nsIFile.DIRECTORY_TYPE, parseInt("0755", 8));
                    }
                }
                catch (e) {
                    Cu.reportError(e);
                    console.log('makedir', e.message);
                }
            });
        }
    }
    else {
        // FIXME: add support once available
    }
};

MegaData.prototype.getDownloadFolderNodes = function(n, md, nodes, paths) {
    if (md) {
        this.makeDir(n);
    }

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
    var flashhtml = '';
    if (dlMethod === FlashIO) {
        flashhtml = '<object width="1" height="1" id="dlswf_'
            + htmlentities(handle)
            + '" type="application/x-shockwave-flash">'
            + '<param name=FlashVars value="buttonclick=1" />'
            + '<param name="movie" value="' + location.origin + '/downloader.swf"/>'
            + '<param value="always" name="allowscriptaccess"/>'
            + '<param name="wmode" value="transparent"/>'
            + '<param value="all" name="allowNetworking">'
            + '</object>';
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
        + '<td><div class="transfer-type download">'
        + '<ul><li class="right-c"><p ' + rightRotate + '>'
        + '<span></span></p></li><li class="left-c"><p ' + leftRotate + '><span></span></p></li></ul>'
        + '</div>' + flashhtml + '</td>'
        + '<td><span class="transfer-filetype-icon ' + fileIcon(node) + '"></span>'
        + '<span class="tranfer-filetype-txt">' + htmlentities(node.name) + '</span></td>'
        + '<td>' + filetype(node) + '</td>'
        + '<td class="transfer-size">' + bytesToSize(node.s) + '</td>'
        + '<td><span class="downloaded-size">' + bytesToSize(dowloadedSize) + '</span></td>'
        + '<td><span class="eta"></span><span class="speed">' + pauseTxt + '</span></td>'
        + '<td><span class="transfer-status">' + l[7227] + '</span></td>'
        + '<td class="grid-url-field"><a class="grid-url-arrow"></a>'
        + '<a class="clear-transfer-icon"></a></td>'
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

    if (!folderlink && (z || preview || !fmconfig.dlThroughMEGAsync)) {
        return webdl();
    }
    // if in folder link and logged-in and download using mSync is set to 0
    if (folderlink && u_type) {
        if (fmconfig.dlThroughMEGAsync === 0) {
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
                                ts: node.mtime || node.ts,
                                k: a32_to_base64(node.k)
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

            cmd.f = files;

            sync.megaSyncRequest(cmd)
                .done(function() {
                    //showToast('megasync', l[8635], 'Open');
                    showToast('megasync-transfer', l[8635]); // Download added to MEGAsync
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

    if (!is_extension && !preview && !z && (dlMethod === MemoryIO || dlMethod === FlashIO)) {
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
        if (this.d[n[0]] && this.d[n[0]].t && this.d[n[0]].name) {
            zipname = M.getSafeName(this.d[n[0]].name) + '.zip';
        }
        else {
            zipname = (zipname || ('Archive-' + Math.random().toString(16).slice(-4))) + '.zip';
        }
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
                    var errorStatus = $('.transfer-status', $tr).text();
                    showToast('download', errorStatus);
                }
                continue;
            }
            $tr.remove();
        }
        var entry = {
            size: n.s,
            nauth: n_h,
            id: n.h,
            key: n.k,
            n: n.name,
            t: n.mtime || n.ts,
            zipid: z,
            zipname: zipname,
            preview: preview,
            p: path,
            onDownloadProgress: this.dlprogress.bind(this),
            onDownloadComplete: this.dlcomplete.bind(this),
            onBeforeDownloadComplete: this.dlbeforecomplete.bind(this),
            onDownloadError: this.dlerror.bind(this),
            onDownloadStart: this.dlstart.bind(this)
        };
        entries.push({node: n, entry: entry});
    }

    if (!entries.length) {
        if (d) {
            dlmanager.logger.warn('Nothing to download.');
        }
        if (dlmanager.isOverQuota) {
            dlmanager.showOverQuotaDialog();
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
            var msgMsg = l[18213]; // 'Download size exceeds the maximum size supported by the browser. '
            //    + 'You can use MEGASync to proceed with the download.'; // 18213
            var msgSubMsg = l[18214]; // 'Do you want to turn ON downloading with MEGASync?'; // 18214
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
    if (z) {
        mega.tpw.addDownloadUpload(mega.tpw.DOWNLOAD, entries[0].entry, zipsize);
    }
    else {
        if (!preview) {
            mega.tpw.addDownloadUpload(mega.tpw.DOWNLOAD, tempEntry);
        }
        tempEntry = null;
    }

    var flashhtml = '';
    if (dlMethod === FlashIO) {
        flashhtml = '<object width="1" height="1" id="dlswf_zip_' + htmlentities(z) + '" type="application/x-shockwave-flash"><param name=FlashVars value="buttonclick=1" /><param name="movie" value="' + document.location.origin + '/downloader.swf"/><param value="always" name="allowscriptaccess"><param name="wmode" value="transparent"><param value="all" name="allowNetworking"></object>';
    }

    if (z && zipsize) {
        this.addToTransferTable('zip_' + z, ttl,
            '<tr id="zip_' + z + '" class="transfer-queued transfer-download ' + p + '">'
            + '<td><div class="transfer-type download">'
            + '<ul><li class="right-c"><p><span></span></p></li><li class="left-c"><p><span></span></p></li></ul>'
            + '</div>' + flashhtml + '</td>'
            + '<td><span class="transfer-filetype-icon ' + fileIcon({name: 'archive.zip'}) + '"></span>'
            + '<span class="tranfer-filetype-txt">' + htmlentities(zipname) + '</span></td>'
            + '<td>' + filetype({name: 'archive.zip'}) + '</td>'
            + '<td class="transfer-size">' + bytesToSize(zipsize) + '</td>'
            + '<td><span class="downloaded-size">' + bytesToSize(0) + '</span></td>'
            + '<td><span class="eta"></span><span class="speed">' + pauseTxt + '</span></td>'
            + '<td><span class="transfer-status">' + l[7227] + '</span></td>'
            + '<td class="grid-url-field"><a class="grid-url-arrow"></a>'
            + '<a class="clear-transfer-icon"></a></td>'
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
        setupTransferAnalysis();
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
    initGridScrolling();
    initFileblocksScrolling();
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
                var $overlay = $('.viewer-overlay');
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

    mega.tpw.finishDownloadUpload(mega.tpw.DOWNLOAD, dl);

    var slideshowid = slideshow_handle();
    if (slideshowid == id && !previews[slideshowid]) {
        var $overlay = $('.viewer-overlay');
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

    if ($('#dlswf_' + id.replace('dl_', '')).length > 0) {
        var flashid = id.replace('dl_', '');
        $('#dlswf_' + flashid).width(170);
        $('#dlswf_' + flashid).height(22);
        $('#' + id + ' .transfer-type')
            .removeClass('download')
            .addClass('safari-downloaded')
            .text('Save File');
    }

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
    var $overlay = $('.viewer-overlay');

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
            break;
        // case EAGAIN:               errorstr = l[233]; break;
        // case ETEMPUNAVAIL:         errorstr = l[233]; break;
        default:
            errorstr = l[x = 233];
            break;
    }
    mega.tpw.errorDownloadUpload(mega.tpw.DOWNLOAD, dl, errorstr);

    var slideshowid = slideshow_handle();
    if (slideshowid === dl.id && !previews[slideshowid]) {
        $overlay.find('.viewer-image-bl').addClass('hidden');
        $overlay.find('.viewer-pending').addClass('hidden');
        $overlay.find('.viewer-progress').addClass('hidden');
        $overlay.find('.viewer-error').removeClass('hidden');
        $overlay.find('.viewer-error-txt').text(errorstr);
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
                    $('.download.top-bar').addClass('overquota');
                }
                else {
                    $('.download.top-bar').removeClass('overquota');
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
            setTransferStatus(dl, errorstr);
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

    // if (M.currentdirid === 'transfers')
    if (M.getTransferElements()) {
        var T = M.getTransferTableLengths();

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
    var size = (Math.ceil(parseInt(te.domScrollingTable.style.height) / 24) | 0) + 1;

    return { size: size, used: used, left: size - used };
};

MegaData.prototype.getTransferElements = function() {
    var obj = {};
    obj.domTransfersBlock = document.querySelector('.fm-transfers-block');
    if (!obj.domTransfersBlock) {
        return false;
    }
    obj.domTableWrapper = obj.domTransfersBlock.querySelector('.transfer-table-wrapper');
    obj.domTransferHeader = obj.domTransfersBlock.querySelector('.fm-transfers-header');
    obj.domPanelTitle = obj.domTransferHeader.querySelector('.transfer-panel-title');
    obj.domUploadBlock = obj.domPanelTitle.querySelector('.upload');
    obj.domDownloadBlock = obj.domPanelTitle.querySelector('.download');
    obj.domTableEmptyTxt = obj.domTableWrapper.querySelector('.transfer-panel-empty-txt');
    obj.domTableHeader = obj.domTableWrapper.querySelector('.transfer-table-header');
    obj.domScrollingTable = obj.domTableWrapper.querySelector('.transfer-scrolling-table');
    obj.domTable = obj.domScrollingTable.querySelector('.transfer-table');

    this.getTransferElements = function() {
        return obj;
    };

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
        // In some cases UI is not yet initialized, nor transferHeader()
        $('.transfer-table-header').show(0);
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
            $('.download-button.light-red.download').safeHTML(button);
            $('.download-button.light-white.continue').safeHTML(l[8846]);
            $('.megasync-upload-overlay').show();
            var $chk = $('.megasync-upload-overlay .checkdiv');
            var hideMEGAsyncDialog = function() {
                $('.megasync-upload-overlay').hide();
                $(document).off('keyup.megasync-upload');
                $('.download-button.light-white.continue, .fm-dialog-close').off('click');
                $('.download-button.light-red.download').off('click');
                $chk.off('click.dialog');
                $chk = undefined;
            };
            var onclick = function() {
                hideMEGAsyncDialog();
                M.addUpload(u, true, emptyFolders, target);
            };
            $(document).rebind('keyup.megasync-upload', onclick);
            $('.download-button.light-white.continue, .fm-dialog-close').rebind('click', onclick);
            $('.download-button.light-red.download').rebind('click', function() {
                hideMEGAsyncDialog();

                if (!syncData) {
                    loadSubPage('sync');
                }
                // if the user is running MEGAsync 3.0+
                else if (!syncData.verNotMeet) {
                    // Check whether the user logged in MEGAsync does match here
                    if (syncData.u === u_handle) {
                        // Let MEGAsync open the local file selector.
                        megasync.megaSyncRequest({a: 'u'});
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
        };
        dlmanager.isMEGAsyncRunning('3.0', 1)
            .done(function(ms, syncData) {
                showMEGAsyncDialog(l[8912], syncData);
            })
            .fail(function() {
                showMEGAsyncDialog(l[8847]);
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
            if (!f.flashid) {
                f.flashid = false;
            }
            f.target = f.target || target;
            f.id = ul_id;

            var gid = 'ul_' + ul_id;
            var template = (
                '<tr id="' + gid + '" class="transfer-queued transfer-upload ' + pause + '">'
                + '<td><div class="transfer-type upload">'
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
                + '<td class="grid-url-field"><a class="grid-url-arrow"></a>'
                + '<a class="clear-transfer-icon"></a></td>'
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

        setupTransferAnalysis();
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
                mBroadcaster.sendMessage('trk:event', 'upload', 'started');
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
    var makeDirPromise = new MegaPromise();

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
                            return makeDirPromise.reject(EACCESS);
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
        dbfetch.get(String(target), new MegaPromise()).always(function() {
            makeDirProc();
            // M.checkGoingOverStorageQuota(ulOpSize).done(makeDirProc);
        });
    });

    makeDirPromise.done(function() {
        var targets = Object.create(null);

        for (var i = u.length; i--;) {
            var file = u[i];

            if (toChat) {
                file.target = paths[toChat] || M.RootID;
            }
            else if (paths[file.path]) {
                file.target = paths[file.path];
            }

            targets[file.target] = 1;
        }

        dbfetch.geta(Object.keys(targets)).always(function(r) {
            // loadingDialog.hide();

            if (!M.c[target] && String(target).length !== 11 && !toChat) {
                if (d) {
                    ulmanager.logger.warn("Error dbfetch'ing target %s", target, r);
                }
                target = M.currentdirid;
            }

            var to = toChat ? u[0].target : target;
            var op = fileversioning.dvState ? 'replace' : 'upload';

            fileconflict.check(u, to, op, toChat ? fileconflict.KEEPBOTH : 0).done(startUpload);
        });
    }).always(function() {
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
    dest = dest.replace('public-links/', '').replace('out-shares/', '');

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
        if (mega.megadrop.isInit()) {// MEGAdrop window is active
            mega.megadrop.overQuota();
        }
        else {
            M.showOverStorageQuota(-1);
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
            $("tr[id^='ul_']").addClass('transfer-error')
                .removeClass('transfer-completed').find('.transfer-status').text(l[1010]);

            // Inform user that upload MEGAdrop is not available anymore
            if (page.substr(0, 8) === 'megadrop') {
                mBroadcaster.sendMessage('MEGAdrop:overquota');
            }
        }
        else {
            if (error < 0) {
                $('#ul_' + id).addClass('transfer-error').removeClass('transfer-completed');
            }

            // Inform user that upload MEGAdrop is not available anymore
            if ((error === ENOENT || error === EACCESS) && page.substr(0, 8) === 'megadrop') {
                mBroadcaster.sendMessage('MEGAdrop:disabled');
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
    if (h && typeof ul.starttime === 'undefined') {
        M.ulstart(ul);
        M.ulprogress(ul, 100, ul.size, ul.size, 0);
    }

    mBroadcaster.sendMessage('upload:completion', ul.id, h || -0xBADF, faid, ul.chatid);
    mBroadcaster.sendMessage('trk:event', 'upload', 'completed');

    if (ul.skipfile) {
        showToast('megasync', l[372] + ' "' + ul.name + '" (' + l[1668] + ')');
    }

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

    // If MEGAdrop windows exists and upload
    if (id && mega.megadrop.isInit()) {
        var gid = 'ul_' + id;
        if (is_mobile) {
            gid = 'md_' + gid;
        }
        mega.megadrop.onItemCompletion('#' + gid);
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

    if (!$.mSortableT) {
        $.mSortableT = $('.transfer-table tbody');
        $.mSortableT.sortable({
            delay: 200,
            revert: 100,
            start: function() {
                $('body').addClass('dndc-sort');
            },
            helper: function(ev, tr) {
                if (!tr.hasClass('ui-selected')) {
                    tr.addClass('ui-selected');
                }
                this.order = fm_tfsorderupd();
                var $selected = tr.parent().children('.ui-selected').clone();
                tr.data('multidrag', $selected).siblings('.ui-selected').hide();
                var $helper = $('<tr/>');
                return $helper.append($selected);
            },
            stop: function(ev, ui) {
                var cancel = false;
                $('body').removeClass('dndc-sort');

                var $selected = ui.item.data('multidrag');
                ui.item.after($selected).remove();
                $('.transfer-table tr.ui-selected:not(:visible)').remove();
                $.transferHeader(); // rebind cloned trs

                // var $tr = $(ui.item[0]);
                // var id = String($tr.attr('id'));
                // var $next = $tr.next();

                /*if ($selected.hasClass('started')) {
                    cancel = true;
                }
                else {
                    var $prev = $tr.prev();
                    var pid = $prev.attr('id');
                    var nid = $next.attr('id');

                    cancel = ((id[0] === 'u' && nid && nid[0] !== 'u')
                            || (id[0] !== 'u' && pid && pid[0] === 'u'));
                }*/
                if (cancel) {
                    $.mSortableT.sortable('cancel');
                }
                else {
                    var order = fm_tfsorderupd();

                    if (JSON.stringify(order) !== JSON.stringify(this.order)) {
                        var mDL = {
                            pos: 0,
                            etmp: [],
                            oQueue: [],
                            pQueue: {},
                            mQueue: dlQueue,
                            m_queue: dl_queue,
                            prop: 'dl'
                        };
                        var mUL = {
                            pos: 0,
                            etmp: [],
                            oQueue: [],
                            pQueue: {},
                            mQueue: ulQueue,
                            m_queue: ul_queue,
                            prop: 'ul'
                        };
                        var id;
                        var dst;
                        var i = 0;
                        var len = Object.keys(order).length / 2;

                        [dl_queue, ul_queue].forEach(function(queue) {
                            var t_queue = queue.filter(isQueueActive);
                            if (t_queue.length !== queue.length) {
                                var m = t_queue.length;
                                var i = 0;
                                while (i < m) {
                                    (queue[i] = t_queue[i]).pos = i;
                                    ++i;
                                }
                                queue.length = i;
                                while (queue[i]) {
                                    delete queue[i++];
                                }
                            }
                        });

                        while (len > i) {
                            id = M.t[i++];

                            dst = id[0] === 'u' ? mUL : mDL;
                            var mQ = dst.mQueue.slurp(id);
                            // for (var x in mQ) {
                            // if (mQ.hasOwnProperty(x)) {
                            // var entry = mQ[x][0][dst.prop];
                            // if (dst.etmp.indexOf(entry) === -1) {
                            // (dst.m_queue[dst.pos] = entry).pos = dst.pos;
                            // dst.etmp.push(entry);
                            // dst.pos++;
                            // }
                            // }
                            // }
                            dst.oQueue = dst.oQueue.concat(mQ);

                            if (dst.mQueue._qpaused.hasOwnProperty(id)) {
                                dst.pQueue[id] = dst.mQueue._qpaused[id];
                            }
                        }

                        dlQueue._queue = mDL.oQueue;
                        ulQueue._queue = mUL.oQueue;
                        dlQueue._qpaused = mDL.pQueue;
                        ulQueue._qpaused = mUL.pQueue;

                        // Check for transfers moved before any started one
                        var $prev = $('.transfer-table tr.transfer-started')
                            .first()
                            .prevAll()
                            .not('.transfer-paused');
                        // XXX: we rely on the speed field being non-numeric
                        if ($prev.length && !$prev.find('.speed').text().replace(/\D/g, '')) {
                            var ids = $('.transfer-table tr:not(.transfer-paused)').attrs('id');
                            ids.forEach(fm_tfspause);
                            if (dlQueue._queue.length || ulQueue._queue.length) {
                                dlmanager.logger.error('The move operation should have cleared the queues.');
                            }
                            ids.forEach(fm_tfsresume);
                            i = 0;
                            mDL.pQueue = {};
                            mUL.pQueue = {};
                            while (len > i) {
                                id = M.t[i++];
                                dst = id[0] === 'u' ? mUL : mDL;
                                if (dst.mQueue._qpaused.hasOwnProperty(id)) {
                                    dst.pQueue[id] = dst.mQueue._qpaused[id];
                                }
                            }
                            dlQueue._qpaused = mDL.pQueue;
                            ulQueue._qpaused = mUL.pQueue;
                        }
                    }
                }

                $('.transfer-table tr.ui-selected').removeClass('ui-selected');
            }
        });
    }
};

MegaData.prototype.showTransferToast = function showTransferToast(t_type, t_length, isPaused) {
    'use strict';

    if (window.slideshowid) {
        var $toast;
        var $second_toast;
        var timer = 0;
        var nt_txt;

        if (t_type !== 'u') {
            $toast = $('.toast-notification.download');
            $second_toast = $('.toast-notification.upload');
            if (t_length > 1) {
                nt_txt = l[12481].replace('%1', t_length);
            }
            else {
                nt_txt = l[7222];
            }
        }
        else {
            $toast = $('.toast-notification.upload');
            $second_toast = $('.toast-notification.download');
            if (t_length > 1) {
                nt_txt = l[12480].replace('%1', t_length);
            }
            else {
                nt_txt = l[7223];
            }
        }
        if (uldl_hold || isPaused) {
            nt_txt += '<b> (' + l[1651] + ') </b>';
        }

        $toast.find('.toast-col:first-child span').safeHTML(nt_txt);

        if (!u_type) {
            // If not logged in, do not display the "Show me" button in the toast information
            $('.toast-button', $toast).addClass('hidden');
        }

        if ($second_toast.hasClass('visible')) {
            $second_toast.addClass('second');
        }

        clearTimeout(timer);
        $toast.removeClass('second hidden').addClass('visible');
        timer = setTimeout(function() {
            M.hideTransferToast($toast);
        }, 4000);

        $('.transfer .toast-button').rebind('click', function() {
            $('.toast-notification').removeClass('visible second');
            if (!$('.viewer-overlay').hasClass('hidden')) {
                $('.viewer-overlay').addClass('hidden');
            }
            // M.openFolder('transfers', true);
            $('.nw-fm-left-icon.transfers').click();
        });

        $('.toast-close-button', $toast).rebind('click', function() {
            $(this).closest('.toast-notification').removeClass('visible');
            $('.toast-notification').removeClass('second');
        });

        $toast.rebind('mouseover', function() {
            clearTimeout(timer);
        });
        $toast.rebind('mouseout', function() {
            timer = setTimeout(function() {
                M.hideTransferToast($toast);
            }, 4000);
        });
    }
};

MegaData.prototype.hideTransferToast = function hideTransferToast($toast) {
    'use strict';

    $toast.removeClass('visible');
    $('.toast-notification').removeClass('second');
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

    mega.tpw.errorDownloadUpload(mega.tpw.UPLOAD, { id: ul.id }, errorstr, isOverQuota);

    ul._gotTransferError = true;
    $('#ul_' + ul.id).addClass('transfer-error');
    $('#ul_' + ul.id + ' .transfer-status').text(errorstr);
}


function resetOverQuotaTransfers(ids) {
    $('#' + ids.join(',#'))
        .addClass('transfer-queued')
        .find('.transfer-status')
        .removeClass('overquota')
        .text(l[7227]);

    mega && mega.tpw && mega.tpw.resetErrorsAndQuotasUI(mega.tpw.DOWNLOAD);
}

function fm_tfsorderupd() {
    'use strict';

    M.t = {};
    $('.transfer-table tr[id]:visible').each(function(pos, node) {
        var t = String(node.id).split('_').shift();
        if (['ul', 'dl', 'zip', 'LOCKed'].indexOf(t) === -1) {
            dlmanager.logger.error('fm_tfsorderupd', 'Unexpected node id: ' + node.id);
        }

        // if (t !== 'LOCKed') {
        M.t[pos] = node.id;
        M.t[node.id] = pos;
        // }
    });
    if (d) {
        dlmanager.logger.info('M.t', M.t);
    }
    return M.t;
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
                $('.download.top-bar').addClass('overquota');
            }
            $('.download .pause-transfer').removeClass('hidden').addClass('active')
                .find('span').text(l[1649]);
            $('.download.top-bar').addClass('paused-transfer');
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

            if (overquota === true) {
                $tr.addClass('transfer-error');
                $tr.find('.transfer-status').addClass('overquota').text(l[1673]);

                mega.tpw.errorDownloadUpload(transferType, { id: gid.split('_').pop() }, l[1673], overquota);
            }
            else {
                $tr.addClass('transfer-queued');
                $tr.removeClass('transfer-error');
                $tr.find('.transfer-status').text(l[7227]);
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
        if (gid[0] === 'u') {
            mega.tpw.resumeDownloadUpload(mega.tpw.UPLOAD, { id: gid.split('_').pop() });

            ulQueue.resume(gid);
        }
        else {
            mega.tpw.resumeDownloadUpload(mega.tpw.DOWNLOAD, { id: gid.split('_').pop() });

            var $tr = $('#' + gid);

            if (page === 'download'
                && $('.download.top-bar').hasClass('overquota')
                || $tr.find('.transfer-status').hasClass('overquota')) {

                if (page === 'download') {
                    $('.download .pause-transfer').removeClass('hidden').addClass('active');
                    $('.download.top-bar').addClass('paused-transfer');
                }

                if (dlmanager.isOverFreeQuota) {
                    return dlmanager.showOverQuotaRegisterDialog();
                }

                return dlmanager.showOverQuotaDialog();
            }
            dlQueue.resume(gid);

            if (page === 'download') {
                $('.download .pause-transfer').removeClass('active').find('span').text(l[9112]);
                $('.download.top-bar').removeClass('paused-transfer');
                $('.download.speed-block .light-txt').safeHTML('&mdash; ' + l['23062.k']);
            }
            else {
                $tr.removeClass('transfer-paused');

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

function fm_tfsmove(gid, dir) { // -1:up, 1:down
    'use strict';
    /* jshint -W074 */
    var tfs = $('#' + gid);
    var to;
    var act;
    var p1;
    var p2;
    var i;
    var x;
    var mng;
    gid = String(gid);
    mng = gid[0] === 'u' ? ulmanager : dlmanager;
    if (tfs.length !== 1) {
        mng.logger.warn('Invalid transfer node', gid, tfs);
        return;
    }

    if (!GlobalProgress[gid] || GlobalProgress[gid].working.length) {
        mng.logger.warn('Invalid transfer state', gid);
        return;
    }

    if (dir !== -1) {
        to = tfs.next();
        act = 'after';
    }
    else {
        to = tfs.prev();
        act = 'before';
    }

    var id = to && to.attr('id') || 'x';

    if (!GlobalProgress[id] || GlobalProgress[id].working.length) {
        if (id !== 'x') {
            mng.logger.warn('Invalid [to] transfer state', gid, id, to);
        }
        return;
    }

    if (id[0] === gid[0] || "zdz".indexOf(id[0] + gid[0]) !== -1) {
        to[act](tfs);
    }
    else {
        if (d) {
            dlmanager.logger.error('Unable to move ' + gid);
        }
        return;
    }

    fm_tfsorderupd();

    var m_prop;
    var m_queue;
    var mQueue = [];
    if (gid[0] === 'z' || id[0] === 'z') {
        var p = 0;
        var trick = Object.keys(M.t).map(Number).filter(function(n) {
            return !isNaN(n) && M.t[n][0] !== 'u';
        });
        for (i in trick) {
            if (trick.hasOwnProperty(i)) {
                ASSERT(i === trick[i] && M.t[i], 'Oops..');
                var mQ = dlQueue.slurp(M.t[i]);
                for (x in mQ) {
                    if (mQ.hasOwnProperty(x)) {
                        (dl_queue[p] = mQ[x][0].dl).pos = p;
                        ++p;
                    }
                }
                mQueue = mQueue.concat(mQ);
            }
        }
        // we should probably fix our Array inheritance
        for (var j = p, len = dl_queue.length; j < len; ++j) {
            delete dl_queue[j];
        }
        dl_queue.length = p;
        dlQueue._queue = mQueue;
        return;
    }

    if (gid[0] === 'u') {
        m_prop = 'ul';
        mQueue = ulQueue._queue;
        m_queue = ul_queue;
    }
    else {
        m_prop = 'dl';
        mQueue = dlQueue._queue;
        m_queue = dl_queue;
    }
    var t_queue = m_queue.filter(isQueueActive);
    if (t_queue.length !== m_queue.length) {
        var m = t_queue.length;
        i = 0;
        while (i < m) {
            (m_queue[i] = t_queue[i]).pos = i;
            ++i;
        }
        m_queue.length = i;
        while (m_queue[i]) {
            delete m_queue[i++];
        }
    }
    for (i in mQueue) {
        if (mQueue[i][0][gid]) {
            var tmp = mQueue[i];
            var m_q = tmp[0][m_prop];
            p1 = Number(i) + dir;
            p2 = m_q.pos;
            tmp[0][m_prop].pos = mQueue[p1][0][m_prop].pos;
            mQueue[p1][0][m_prop].pos = p2;
            mQueue[i] = mQueue[p1];
            mQueue[p1] = tmp;
            p1 = m_queue.indexOf(m_q);
            tmp = m_queue[p1];
            m_queue[p1] = m_queue[p1 + dir];
            m_queue[p1 + dir] = tmp;
            ASSERT(m_queue[p1].pos === mQueue[i][0][m_prop].pos, 'Huh, move sync error..');
            break;
        }
    }
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

        if (completedLen + 4 > ttl.size || M.pendingTransfers > 50 + ttl.used * 4) {
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

    /*$('.transfer-table span.row-number').each(function() {
        var $this = $(this);
        $this.text(++i);
        if ($this.closest('tr').find('.transfer-type.upload').length) {
            ++u;
        }
    });*/
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
    tfse.domUploadBlock.textContent = u || '';
    tfse.domDownloadBlock.textContent = i || '';

}
