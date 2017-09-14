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

    var subids = this.getNodesSync(n);

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
    if (isPaused) {
        state = 'transfer-paused';
        pauseTxt = l[1651];
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

    this.addToTransferTable(gid, ttl,
        '<tr id="dl_' + htmlentities(handle) + '" class="transfer-queued transfer-download ' + state + '">'
        + '<td><div class="transfer-type download">'
        + '<ul><li class="right-c"><p><span></span></p></li><li class="left-c"><p><span></span></p></li></ul>'
        + '</div>' + flashhtml + '</td>'
        + '<td><span class="transfer-filetype-icon ' + fileIcon(node) + '"></span>'
        + '<span class="tranfer-filetype-txt">' + htmlentities(node.name) + '</span></td>'
        + '<td>' + filetype(node.name) + '</td>'
        + '<td>' + bytesToSize(node.s) + '</td>'
        + '<td><span class="eta"></span><span class="speed">' + pauseTxt + '</span></td>'
        + '<td><span class="transfer-status">' + l[7227] + '</span></td>'
        + '<td class="grid-url-field"><a class="grid-url-arrow"></a>'
        + '<a class="clear-transfer-icon"></a></td>'
        + '<td><span class="row-number"></span></td>'
        + '</tr>');

    if (isPaused) {
        fm_tfspause('dl_' + handle);
    }
    if (ttl) {
        ttl.left--;
    }
};

MegaData.prototype.addDownload = function(n, z, preview) {
    var args = toArray.apply(null, arguments);

    // fetch all nodes needed by M.getNodesSync
    dbfetch.coll(n)
        .always(function() {
            M.addDownloadSync.apply(M, args);
        });
};

MegaData.prototype.addDownloadSync = function(n, z, preview) {
    var args = toArray.apply(null, arguments);
    var webdl = function() {
        M.addWebDownload.apply(M, args);
        args = undefined;
    };

    if (z || preview || !fmconfig.dlThroughMEGAsync) {
        return webdl();
    }

    dlmanager.isMEGAsyncRunning(0x02010100)
        .done(function(sync) {
            var cmd = {
                a: 'd',
                auth: folderlink ? M.RootID : u_sid
            };
            var files = [];

            var addNode = function(node) {
                if (!node.a && node.k) {
                    var item = {
                        t: node.t,
                        h: node.h,
                        p: node.p,
                        n: base64urlencode(M.getSafeName(node.name))
                    };
                    if (!node.t) {
                        item.s = node.s;
                        item.ts = node.mtime || node.ts;
                        item.k = a32_to_base64(node.k);
                    }
                    files.push(item);
                }

                if (node.t) {
                    foreach(M.getNodesSync(node.h));
                }
            };

            var foreach = function(nodes) {
                for (var i = 0; i < nodes.length; i++) {
                    var node = M.d[nodes[i]];

                    if (node) {
                        addNode(node);
                    }
                }
            };

            foreach(n);

            if (!files.length) {
                console.error('No files');
                return webdl();
            }

            cmd.f = files;

            sync.megaSyncRequest(cmd)
                .done(function() {
                    showToast('megasync', l[8635], 'Open');
                })
                .fail(webdl);
        })
        .fail(webdl);
};

MegaData.prototype.addWebDownload = function(n, z, preview, zipname) {
    delete $.dlhash;
    var path;
    var added = 0;
    var nodes = [];
    var paths = {};
    var zipsize = 0;
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
        mega.ui.tpp.setTotal(1, 'dl');
    }
    else {
        z = false;
    }
    if (!$.totalDL) {
        $.totalDL = 0;
    }

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
        var $tr = $('.transfer-table #dl_' + htmlentities(n.h));
        if ($tr.length) {
            if (!$tr.hasClass('transfer-completed')) {
                continue;
            }
            $tr.remove();
        }
        dl_queue.push({
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
        });
        added++;
        zipsize += n.s;

        if (!z) {
            this.putToTransferTable(n, ttl);
            mega.ui.tpp.setTotal(1, 'dl');
        }
    }

    if (!added) {
        if (d) {
            dlmanager.logger.warn('Nothing to download.');
        }
        return;
    }

    // If regular download using Firefox and the total download is over 1GB then show the dialog
    // to use the extension, but not if they've seen the dialog before and ticked the checkbox
    if (dlMethod == MemoryIO && !localStorage.firefoxDialog && $.totalDL > 1048576000 && navigator.userAgent.indexOf('Firefox') > -1) {
        later(firefoxDialog);
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
            + '<td>' + bytesToSize(zipsize) + '</td>'
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
    }

    if (!preview) {
        this.onDownloadAdded(added, uldl_hold, z, zipsize);
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
    openTransfersPanel();
    initGridScrolling();
    initFileblocksScrolling();
    initTreeScroll();

    if ((dlmanager.isDownloading = Boolean(dl_queue.length))) {
        $('.transfer-pause-icon').removeClass('disabled');
        $('.transfer-clear-completed').removeClass('disabled');
        $('.transfer-clear-all-icon').removeClass('disabled');

        M.onFileManagerReady(function() {
            // mega.ui.tpp.setTotal(1, 'dl');
            mega.ui.tpp.started('dl');
            if (typeof fdl_queue_var !== 'undefined' && Object(fdl_queue_var).ph) {
                var gid = dlmanager.getGID(fdl_queue_var);

                if (dlQueue.isPaused(gid)) {
                    mega.ui.tpp.pause(gid, 'dl');
                }
            }
        });
    }
};

MegaData.prototype.dlprogress = function(id, perc, bl, bt, kbps, dl_queue_num, force) {
    var st;
    var tmpId = id;
    if (dl_queue[dl_queue_num].zipid) {
        id = 'zip_' + dl_queue[dl_queue_num].zipid;
        var tl = 0;
        var ts = 0;
        for (var i in dl_queue) {
            if (dl_queue[i].zipid == dl_queue[dl_queue_num].zipid) {
                if (!st) {
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

    // var failed = parseInt($('#' + id).data('failed') || "0");
    // failed not long ago

    // if (failed+30000 > NOW()) return;

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
    var transferDeg = 0;
    var $overlay = $('.viewer-overlay');
    var $chart = $overlay.find('.viewer-progress');
    var deg;
    if (bt) {
        // $.transferprogress[id] = Math.floor(bl/bt*100);
        $.transferprogress[id] = [bl, bt, bps];
        if (!uldl_hold) {
            if (slideshowid == dl_queue[dl_queue_num].id && !previews[slideshowid]) {
                $overlay.find('.viewer-error').addClass('hidden');
                $overlay.find('.viewer-pending').addClass('hidden');

                deg =  360 * perc / 100;
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
            transferDeg = 360 * perc / 100;
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
            if (bps > 0) {
                $tr.find('.speed').html(bytesToSize(bps, 1, 1) + '/s').removeClass('unknown');
            }
            else {
                $tr.find('.speed').addClass('unknown').text('');
            }

            if (page.substr(0, 2) !== 'fm') {
                $('.widget-block').removeClass('hidden');
                $('.widget-block').show();
                if (!ulmanager.isUploading) {
                    $('.widget-circle').attr('class', 'widget-circle percents-' + perc);
                }
                $('.widget-icon.downloading').removeClass('hidden');
                $('.widget-speed-block.dlspeed').text(bytesToSize(bps, 1) + '/s');
                $('.widget-block').addClass('active');
            }
            else {
                if (mega.ui.tpp.isCached()) {
                    mega.ui.tpp.setTransfered(id, bl, 'dl', dl_queue[dl_queue_num]);
                    mega.ui.tpp.updateBlock('dl');
                }
            }
            delay('percent_megatitle', percent_megatitle, 50);
        }
    }
};

MegaData.prototype.dlcomplete = function(dl) {
    var id = dl.id, z = dl.zipid;
    var $overlay = $('.viewer-overlay');

    if (dl.hasResumeSupport) {
        dlmanager.remResumeInfo(dl).dump();
    }

    if (slideshowid == id && !previews[slideshowid]) {
        $overlay.find('.viewer-pending').addClass('hidden');
        $overlay.find('.viewer-error').addClass('hidden');
        $overlay.find('.viewer-progress p').css('transform', 'rotate(180deg)');
    }

    if (z) {
        id = 'zip_' + z;

        api_req({a: 'log', e: 99656, m: 'ZipIO Download completed.'});
    }
    else {
        id = 'dl_' + id;
    }

    var $tr = $('.transfer-table #' + id);
    $tr.removeClass('transfer-started').addClass('transfer-completed');
    $tr.find('.left-c p, .right-c p').css('transform', 'rotate(180deg)');
    $tr.find('.transfer-status').text(l[1418]);
    $tr.find('.eta, .speed').text('').removeClass('unknown');

    if ($('#dlswf_' + id.replace('dl_', '')).length > 0) {
        var flashid = id.replace('dl_', '');
        $('#dlswf_' + flashid).width(170);
        $('#dlswf_' + flashid).height(22);
        $('#' + id + ' .transfer-type')
            .removeClass('download')
            .addClass('safari-downloaded')
            .text('Save File');
    }
    if (dlMethod == FileSystemAPI) {
        setTimeout(fm_chromebar, 250, $.dlheight);
        setTimeout(fm_chromebar, 500, $.dlheight);
        setTimeout(fm_chromebar, 1000, $.dlheight);
    }
    if (page.substr(0, 2) !== 'fm') {
        var a = dl_queue.filter(isQueueActive).length;
        if (a < 2 && !ulmanager.isUploading) {
            $('.widget-block').fadeOut('slow', function(e) {
                $('.widget-block').addClass('hidden').css({opacity: 1});
            });
        }
        else if (a < 2) {
            $('.widget-icon.downloading').addClass('hidden');
        }
        else {
            $('.widget-circle').attr('class', 'widget-circle percents-0');
        }
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
        mega.ui.tpp.setIndex(1, 'dl');
        $.tresizer();
    });
};

MegaData.prototype.dlbeforecomplete = function() {
    $.dlheight = $('body').height();
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
        else if (error !== EAGAIN) {
            srvlog('onDownloadError :: ' + error + ' [' + hostname(dl.url) + '] ' + (dl.zipid ? 'isZIP' : ''));
        }
    }

    switch (error) {
        case ETOOMANYCONNECTIONS:
            errorstr = l[18];
            break;
        case ESID:
            errorstr = l[19];
            break;
        case EBLOCKED:
        case ETOOMANY:
        case EACCESS:
            errorstr = l[23];
            break;
        case ENOENT:
            errorstr = l[22];
            break;
        case EKEY:
            errorstr = l[24];
            break;
        case EOVERQUOTA:
            errorstr = l[1673];
            break;
        // case EAGAIN:               errorstr = l[233]; break;
        // case ETEMPUNAVAIL:         errorstr = l[233]; break;
        default:
            errorstr = l[x = 233];
            break;
    }

    if (window.slideshowid == dl.id && !previews[slideshowid]) {
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
                    $('.download.eta-block span').text('');
                    $('.download.speed-block span').text('');
                    $('.download .pause-transfer').addClass('active');
                    $('.download.file-info').addClass('overquota');
                }
                else {
                    $('.download.file-info').removeClass('overquota');
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
        if (mega.ui.tpp.getTime('dl') === 0) {
            mega.ui.tpp.setTime(Date.now(), 'dl');
        }
        mega.ui.tpp.start(dl, 'dl');
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
    var te = this.getTransferElements();
    var used = te.domTable.querySelectorAll('tr').length;
    var size = Math.ceil(parseInt(te.domScrollingTable.style.height) / 24);

    return {size: size, used: used, left: size - used};
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

        $(window).bind('resize.tfsdynlist', this.tfsResizeHandler);
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

        if (!fit) {
            M.tfsdomqueue[gid] = elem;
        }
    }
};

var __ul_id = 8000;
MegaData.prototype.addUpload = function(u, ignoreWarning) {
    var flag = 'ulMegaSyncAD';

    if (u.length > 999 && !ignoreWarning && !localStorage[flag]) {
        var showMEGAsyncDialog = function(button, syncData) {
            $('.download-button.light-red.download').safeHTML(button);
            $('.download-button.light-white.continue').safeHTML(l[8846]);
            $('.megasync-upload-overlay').show();
            var $chk = $('.megasync-upload-overlay .checkdiv');
            var hideMEGAsyncDialog = function() {
                $('.megasync-upload-overlay').hide();
                $(document).unbind('keyup.megasync-upload');
                $('.download-button.light-white.continue, .fm-dialog-close').unbind('click');
                $('.download-button.light-red.download').unbind('click');
                $chk.unbind('click.dialog');
                $chk = undefined;
            };
            $('.download-button.light-white.continue, .fm-dialog-close').rebind('click', function() {
                hideMEGAsyncDialog();
                M.addUpload(u, true);
            });
            $(document).rebind('keyup.megasync-upload', function() {
                hideMEGAsyncDialog();
                M.addUpload(u, true);
            });
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
    var target;
    var onChat;
    var added = 0;
    var ul_id;
    var pause = '';
    var pauseTxt = '';
    var ttl = this.getTransferTableLengths();

    if ($.onDroppedTreeFolder) {
        target = $.onDroppedTreeFolder;
        delete $.onDroppedTreeFolder;
    }
    else if (String(this.currentdirid).length !== 8) {
        target = this.lastSeenCloudFolder || this.RootID;
    }
    else {
        target = this.currentdirid;
    }

    if ((onChat = (String(this.currentdirid).substr(0, 4) === 'chat'))) {
        if (!$.ulBunch) {
            $.ulBunch = Object.create(null);
        }
        if (!$.ulBunch[this.currentdirid]) {
            $.ulBunch[this.currentdirid] = Object.create(null);
        }
        target = this.currentdirid;
    }

    if (uldl_hold) {
        pause = 'transfer-paused';
        pauseTxt = l[1651];
    }

    // Foreach the queue and start uploading
    var startUpload = function(u) {

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
            this.addToTransferTable(gid, ttl,
                '<tr id="' + gid + '" class="transfer-queued transfer-upload ' + pause + '">'
                + '<td><div class="transfer-type upload">'
                + '<ul><li class="right-c"><p><span></span></p></li>'
                + '<li class="left-c"><p><span></span></p></li></ul>'
                + '</div></td>'
                + '<td><span class="transfer-filetype-icon ' + fileIcon({name: f.name}) + '"></span>'
                + '<span class="tranfer-filetype-txt">' + htmlentities(f.name) + '</span></td>'
                + '<td>' + filetype(f.name) + '</td>'
                + '<td>' + bytesToSize(filesize) + '</td>'
                + '<td><span class="eta"></span><span class="speed">' + pauseTxt + '</span></td>'
                + '<td><span class="transfer-status">' + l[7227] + '</span></td>'
                + '<td class="grid-url-field"><a class="grid-url-arrow"></a>'
                + '<a class="clear-transfer-icon"></a></td>'
                + '<td><span class="row-number"></span></td>'
                + '</tr>');

            ul_queue.push(f);
            ttl.left--;
            added++;
            mega.ui.tpp.setTotal(1, 'ul');

            if (uldl_hold) {
                fm_tfspause('ul_' + ul_id);
            }

            if (onChat) {
                f.chatid = target;
                $.ulBunch[f.chatid][ul_id] = 1;
            }
        }
        if (!added) {
            ulmanager.logger.warn('Nothing added to upload.');
            return;
        }
        if (!$.transferHeader) {
            M.addTransferPanelUI();
        }
        if (page === 'start') {
            ulQueue.pause();
            uldl_hold = true;
        }
        else {
            showTransferToast('u', added);
            openTransfersPanel();
            delay('fm_tfsupdate', fm_tfsupdate); // this will call $.transferHeader()
        }

        setupTransferAnalysis();
        if ((ulmanager.isUploading = Boolean(ul_queue.length))) {
            $('.transfer-pause-icon').removeClass('disabled');
            $('.transfer-clear-completed').removeClass('disabled');
            $('.transfer-clear-all-icon').removeClass('disabled');

            M.onFileManagerReady(function() {
                mega.ui.tpp.started('ul');
            });
        }
    }.bind(this);

    // Prepare uploads by creating their target path beforehand as needed for the new fileconflict logic
    var paths = Object.create(null);

    if (onChat) {
        // onChat = 'My chat files/' + (M.getNameByHandle(target.substr(5)) || target.substr(5));
        onChat = 'My chat files';
        paths[onChat] = null;
    }
    else {
        for (var i = u.length; i--;) {
            var file = u[i];

            if (file.path) {
                paths[file.path] = null;
            }
        }
    }

    // Make one folder at a time
    var makeDir = function(path, target) {
        var promise = new MegaPromise();
        var safePath = M.getSafePath(path);

        if (safePath.length === 1) {
            safePath = safePath[0];
        }

        if (onChat) {
            target = M.RootID;
        }

        M.createFolder(target, safePath, new MegaPromise())
            .always(function(_target) {
                if (typeof _target === 'number') {
                    ulmanager.logger.warn('Unable to create folder "%s" on target "%s"',
                        path, target, api_strerror(_target));
                }
                else {
                    paths[path] = _target;
                }

                promise.resolve();
            });

        return promise;
    };

    var makeDirPromise = new MegaPromise();

    var makeDirProc = function() {
        loadingDialog.show();

        (function _md(paths) {
            var path = paths.pop();

            if (path) {
                makeDir(path, target).done(_md.bind(null, paths));
            }
            else {
                makeDirPromise.resolve();
            }
        })(Object.keys(paths));
    };

    var ulOpSize = 0; // how much bytes we're going to upload

    for (var j = u.length; j--;) {
        ulOpSize += u[j].size;
    }

    // makeDirProc();
    M.checkGoingOverStorageQuota(ulOpSize).done(makeDirProc);

    makeDirPromise
        .done(function() {
            var targets = Object.create(null);

            for (var i = u.length; i--;) {
                var file = u[i];

                if (onChat) {
                    file.target = paths[onChat] || M.RootID;
                }
                else if (paths[file.path]) {
                    file.target = paths[file.path];
                }

                targets[file.target] = 1;
            }
            targets[target] = 1;

            dbfetch.geta(Object.keys(targets))
                .always(function(r) {
                    loadingDialog.hide();

                    if (!M.c[target] && String(target).length !== 11 && !onChat) {
                        if (d) {
                            ulmanager.logger.warn("Error dbfetch'ing target %s", target, r);
                        }
                        target = M.currentdirid;
                    }

                    fileconflict
                        .check(u, onChat ? u[0].target : target, 'upload', onChat ? fileconflict.KEEPBOTH : 0)
                        .done(startUpload);
                });
        });
};

MegaData.prototype.ulprogress = function(ul, perc, bl, bt, bps) {
    var id = ul.id;
    var $tr = $('#ul_' + id);
    if (!$tr.hasClass('transfer-started')) {
        $tr.find('.transfer-status').text('');
        $tr.removeClass('transfer-initiliazing transfer-queued');
        $tr.addClass('transfer-started');
        $('.transfer-table').prepend($tr);
        delay('fm_tfsupdate', fm_tfsupdate); // this will call $.transferHeader()
    }
    if (!bl || !ul.starttime) {
        return false;
    }
    var retime = bps > 1000 ? (bt - bl) / bps : -1;
    var transferDeg = 0;
    if (!$.transferprogress) {
        $.transferprogress = Object.create(null);
    }
    if (bl && bt && !uldl_hold) {
        // $.transferprogress[id] = Math.floor(bl/bt*100);
        $.transferprogress['ul_' + id] = [bl, bt, bps];
        $tr.find('.transfer-status').text(perc + '%');
        transferDeg = 360 * perc / 100;
        if (transferDeg <= 180) {
            $tr.find('.right-c p').css('transform', 'rotate(' + transferDeg + 'deg)');
        }
        else {
            $tr.find('.right-c p').css('transform', 'rotate(180deg)');
            $tr.find('.left-c p').css('transform', 'rotate(' + (transferDeg - 180) + 'deg)');
        }
        if (retime > 0) {
            $tr.find('.eta').safeHTML(secondsToTime(retime, 1)).removeClass('unknown');
        }
        else {
            $tr.find('.eta').addClass('unknown').text('');
        }
        if (bps > 0) {
            $tr.find('.speed').html(bytesToSize(bps, 1, 1) + '/s').removeClass('unknown');
        }
        else {
            $tr.find('.speed').addClass('unknown').text('');
        }

        if (mega.ui.tpp.isCached()) {
            mega.ui.tpp.setTransfered(id, bl, 'ul', ul);
            mega.ui.tpp.updateBlock('ul');
        }
        delay('percent_megatitle', percent_megatitle, 50);

        if (page.substr(0, 2) !== 'fm') {
            $('.widget-block').removeClass('hidden');
            $('.widget-block').show();
            $('.widget-circle').attr('class', 'widget-circle percents-' + perc);
            $('.widget-icon.uploading').removeClass('hidden');
            $('.widget-speed-block.ulspeed').text(bytesToSize(bps, 1) + '/s');
            $('.widget-block').addClass('active');
        }
    }
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
        M.showOverStorageQuota(100, 1, 2, {custom: 1});
    }
    else if (error === EGOINGOVERQUOTA) {
        M.checkGoingOverStorageQuota(-1);
    }
    else {
        overquota = false;
    }

    if (ul) {
        this.ulfinalize(ul, api_strerror(error));

        if (ul.owner) {
            ul.owner.destroy();
        }
        else {
            oDestroy(ul);
        }

        if (error === EOVERQUOTA) {
            mega.ui.tpp.hide();
            ulmanager.abort(null);
            $("tr[id^='ul_'] .transfer-status").text(l[1010]);
        }
    }
    else if (!overquota) {
        msgDialog('warninga', l[135], l[47], api_strerror(error));
    }
};

MegaData.prototype.ulcomplete = function(ul, h, k) {
    var id = ul.id;

    if ($.ulBunch && $.ulBunch[ul.chatid]) {
        var ub = $.ulBunch[ul.chatid], p;
        ub[id] = h || -0xBADF;

        for (var i in ub) {
            if (ub[i] === 1) {
                p = true;
                break;
            }
        }

        if (!p) {
            var ul_target = ul.chatid;
            ub = Object.values(ub)
                .filter(function(m) {
                    return m !== -0xBADF;
                });
            onIdle(function() {
                if (ub.length) {
                    $(document).trigger('megaulcomplete', [ul_target, ub]);
                }
                delete $.ulBunch[ul_target];
                if (!$.len($.ulBunch)) {
                    delete $.ulBunch;
                }
            });
        }
    }

    if (ul.skipfile) {
        showToast('megasync', l[372] + ' "' + ul.name + '" (' + l[1668] + ')');
    }

    this.ulfinalize(ul, ul.skipfile ? l[1668] : l[1418]);
};

MegaData.prototype.ulfinalize = function(ul, status) {
    'use strict';

    var id = ul.id;
    var $tr = $('#ul_' + id);

    $tr.removeClass('transfer-started').addClass('transfer-completed');
    $tr.find('.left-c p, .right-c p').css('transform', 'rotate(180deg)');
    $tr.find('.transfer-status').text(status);
    $tr.find('.eta, .speed').text('').removeClass('unknown');

    ul_queue[ul.pos] = Object.freeze({});

    if (page.substr(0, 2) !== 'fm') {
        var a = ul_queue.filter(isQueueActive).length;
        if (a < 2 && !ulmanager.isDownloading) {
            $('.widget-block').fadeOut('slow', function(e) {
                $('.widget-block').addClass('hidden').css({opacity: 1});
            });
        }
        else if (a < 2) {
            $('.widget-icon.uploading').addClass('hidden');
        }
        else {
            $('.widget-circle').attr('class', 'widget-circle percents-0');
        }
    }

    if ($.transferprogress && $.transferprogress['ul_' + id]) {
        if (!$.transferprogress['ulc']) {
            $.transferprogress['ulc'] = 0;
        }
        $.transferprogress['ulc'] += $.transferprogress['ul_' + id][1];
        delete $.transferprogress['ul_' + id];
    }
    // $.transferHeader();
    delay('tfscomplete', function() {
        M.resetUploadDownload();
        mega.ui.tpp.setIndex(1, 'ul');
        $.tresizer();
    });
};

MegaData.prototype.ulstart = function(ul) {
    var id = ul.id;

    if (d) {
        ulmanager.logger.log('ulstart', id);
    }

    $('.transfer-table #ul_' + id)
        .addClass('transfer-initiliazing')
        .find('.transfer-status').text(l[1042]);

    ul.starttime = new Date().getTime();
    fm_tfsupdate();// this will call $.transferHeader()
    this.ulprogress(ul, 0, 0, 0);
    if (mega.ui.tpp.getTime('ul') === 0) {
        mega.ui.tpp.setTime(Date.now(), 'ul');
    }
    mega.ui.tpp.start(ul, 'ul');
};


function onUploadError(ul, errorstr, reason, xhr) {
    var hn = hostname(ul.posturl);

    /*if (!d && (!xhr || xhr.readyState < 2 || xhr.status)) {
     var details = [
     browserdetails(ua).name,
     String(reason)
     ];
     if (xhr || reason === 'peer-err') {
     if (xhr && xhr.readyState > 1) {
     details.push(xhr.status);
     }
     details.push(hn);
     }
     if (details[1].indexOf('mtimeout') == -1 && -1 == details[1].indexOf('BRFS [l:Unk]')) {
     srvlog('onUploadError :: ' + errorstr + ' [' + details.join("] [") + ']');
     }
     }*/

    if (d) {
        ulmanager.logger.error('onUploadError', ul.id, ul.name, errorstr, reason, hn);
    }

    $('.transfer-table #ul_' + ul.id).addClass('transfer-error');
    $('.transfer-table #ul_' + ul.id + ' .transfer-status').text(errorstr);
}

function addupload(u) {
    M.addUpload(u);
}
function onUploadStart(id) {
    M.ulstart(id);
}
function onUploadProgress(id, p, bl, bt, speed) {
    M.ulprogress(id, p, bl, bt, speed);
}
function onUploadSuccess(id, bl, bt) {
    M.ulcomplete(id, bl, bt);
}

function fm_chromebar(height) {
    if (window.navigator.userAgent.toLowerCase().indexOf('mac') >= 0 || localStorage.chromeDialog == 1) {
        return false;
    }
    var h = height - $('body').height();
    if ((h > 33) && (h < 41)) {
        setTimeout(fm_chromebarcatchclick, 500, $('body').height());
        chromeDialog();
    }
}

function fm_chromebarcatchclick(height) {
    if ($('body').height() != height) {
        chromeDialog(1);
        return false;
    }
    setTimeout(fm_chromebarcatchclick, 200, height);
}
