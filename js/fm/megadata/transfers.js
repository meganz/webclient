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
                    p.push(fm_safename(M.d[d].name));
                }
                p.push(fm_safename(M.d[e].name));
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

    var subids = M.getNodesSync(n);

    for (var j = 0; j < subids.length; j++) {
        var p = this.getPath(subids[j]);
        var path = '';

        for (var k = 0; k < p.length; k++) {
            if (M.d[p[k]] && M.d[p[k]].t) {
                path = fm_safename(M.d[p[k]].name) + '/' + path;
            }
            if (p[k] == n) {
                break;
            }
        }

        if (!M.d[subids[j]].t) {
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
            M.addDownloadReady.apply(M, args);
        });
};

MegaData.prototype.addDownloadReady = function(n, z, preview) {
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
                        n: base64urlencode(fm_safename(node.name))
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
            if (M.d[n[i]] && M.d[n[i]].t) {
                var nn = [], pp = {};
                this.getDownloadFolderNodes(n[i], false, nn, pp);
                cbs.push(this.addDownload.bind(this, nn, 0x21f9A, pp, M.d[n[i]].name));
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
            if (M.d[n[i]]) {
                if (M.d[n[i]].t) {
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
        if (M.d[n[0]] && M.d[n[0]].t && M.d[n[0]].name) {
            zipname = fm_safename(M.d[n[0]].name) + '.zip';
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
        if (!nodes.hasOwnProperty(k) || !this.isFileNode((n = M.d[nodes[k]]))) {
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
            id: n.h,
            key: n.k,
            n: n.name,
            t: n.mtime || n.ts,
            p: path,
            size: n.s,
            nauth: n_h,
            onDownloadProgress: this.dlprogress,
            onDownloadComplete: this.dlcomplete,
            onBeforeDownloadComplete: this.dlbeforecomplete,
            onDownloadError: this.dlerror,
            onDownloadStart: this.dlstart,
            zipid: z,
            zipname: zipname,
            preview: preview
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
        Later(firefoxDialog);
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
    }

    if (!preview) {
        this.onDownloadAdded(added, uldl_hold, z, zipsize);
        setupTransferAnalysis();
    }

    delete $.dlhash;
};

MegaData.prototype.onDownloadAdded = function(added, isPaused, isZIP, zipSize) {
    if (!$.transferHeader) {
        transferPanelUI();
    }
    delay('fm_tfsupdate', fm_tfsupdate); // this will call $.transferHeader();

    if (!isZIP || zipSize) {
        M.addDownloadToast = ['d', isZIP ? 1 : added, isPaused];
    }
    openTransfersPanel();
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
        $.transferprogress = {};
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
    if (bt) {
        // $.transferprogress[id] = Math.floor(bl/bt*100);
        $.transferprogress[id] = [bl, bt, bps];
        if (!uldl_hold) {
            if (slideshowid == dl_queue[dl_queue_num].id && !previews[slideshowid]) {
                $('.slideshow-error').addClass('hidden');
                $('.slideshow-pending').addClass('hidden');
                $('.slideshow-progress').attr('class', 'slideshow-progress percents-' + perc);
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
                $tr.find('.speed').safeHTML(bytesToSize(bps, 1, 1) + '/s').removeClass('unknown');
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
                mega.ui.tpp.setTransfered(id, bl, 'dl', dl_queue[dl_queue_num]);
                mega.ui.tpp.updateBlock('dl');
            }
            delay('percent_megatitle', percent_megatitle, 50);
        }
    }
};

MegaData.prototype.dlcomplete = function(dl) {
    var id = dl.id, z = dl.zipid;

    if (slideshowid == id && !previews[slideshowid]) {
        $('.slideshow-pending').addClass('hidden');
        $('.slideshow-error').addClass('hidden');
        $('.slideshow-progress').attr('class', 'slideshow-progress percents-100');
    }

    if (z) {
        id = 'zip_' + z;
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
        mega.utils.resetUploadDownload();
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

    if (d) {
        dlmanager.logger.error('dlerror', gid, error);
    }
    else {
        if (error !== EOVERQUOTA) {
            srvlog('onDownloadError :: ' + error + ' [' + hostname(dl.url) + '] ' + (dl.zipid ? 'isZIP' : ''));
        }
        else if (!dl.log509 && !dl.logOverQuota && Object(u_attr).p) {
            dl.logOverQuota = 1;
            api_req({a: 'log', e: 99615, m: 'PRO user got EOVERQUOTA'});
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
        $('.slideshow-image-bl').addClass('hidden');
        $('.slideshow-pending').addClass('hidden');
        $('.slideshow-progress').addClass('hidden');
        $('.slideshow-error').removeClass('hidden');
        $('.slideshow-error-txt').text(errorstr);
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
                    $('.download-info.time-txt .text').text('');
                    $('.download-info.speed-txt .text').text('');
                    $('.download.pause-button').addClass('active');
                    $('.download.info-block').addClass('overquota');
                }
                else {
                    $('.download.error-icon').text(errorstr);
                    $('.download.error-icon').removeClass('hidden');
                    $('.download.icons-block').addClass('hidden');
                }
            }
            else {
                var $tr = $('.transfer-table tr#' + gid);

                $tr.addClass('transfer-error');
                $tr.find('.eta, .speed').text('').addClass('unknown');
                $tr.find('.transfer-status').text(errorstr);

                if (error === EOVERQUOTA) {
                    $tr.find('.transfer-status').addClass('overquota');
                }
            }
        }
    }
};

MegaData.prototype.dlstart = function(dl) {
    var id = (dl.zipid ? 'zip_' + dl.zipid : 'dl_' + dl.dl_id);

    if (M.tfsdomqueue[id]) {
        // flush the transfer from the DOM queue
        addToTransferTable(id, M.tfsdomqueue[id]);
        delete M.tfsdomqueue[id];
    }

    $('.transfer-table #' + id)
        .addClass('transfer-initiliazing')
        .find('.transfer-status').text(l[1042]);

    dl.st = NOW();
    ASSERT(typeof dl_queue[dl.pos] === 'object', 'No dl_queue entry for the provided dl...');
    ASSERT(typeof dl_queue[dl.pos] !== 'object' || dl.n == dl_queue[dl.pos].n, 'No matching dl_queue entry...');
    if (typeof dl_queue[dl.pos] === 'object') {
        fm_tfsupdate(); // this will call $.transferHeader()
        M.dlprogress(id, 0, 0, 0, 0, dl.pos);
        if (mega.ui.tpp.getTime('dl') === 0) {
            mega.ui.tpp.setTime(NOW(), 'dl');
        }
        mega.ui.tpp.start(dl, 'dl');
    }
};

MegaData.prototype.doFlushTransfersDynList = function(aNumNodes) {
    aNumNodes = Object.keys(M.tfsdomqueue).slice(0, aNumNodes | 0);

    if (aNumNodes.length) {
        for (var i = 0, l = aNumNodes.length; i < l; ++i) {
            var item = aNumNodes[i];

            addToTransferTable(item, M.tfsdomqueue[item], 1);
            delete M.tfsdomqueue[item];
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
        delete this.tfsResizeHandler;
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
    var filesize;
    var added = 0;
    var f;
    var ul_id;
    var pause = '';
    var pauseTxt = '';
    var ttl = this.getTransferTableLengths();

    if ($.onDroppedTreeFolder) {
        target = $.onDroppedTreeFolder;
        delete $.onDroppedTreeFolder;
    }
    else if (String(M.currentdirid).length !== 8) {
        target = M.lastSeenCloudFolder || M.RootID;
    }
    else {
        target = M.currentdirid;
    }

    if ((onChat = (M.currentdirid && M.currentdirid.substr(0, 4) === 'chat'))) {
        if (!$.ulBunch) {
            $.ulBunch = Object.create(null);
        }
        if (!$.ulBunch[M.currentdirid]) {
            $.ulBunch[M.currentdirid] = Object.create(null);
        }
        target = M.currentdirid;
    }

    if (uldl_hold) {
        pause = 'transfer-paused';
        pauseTxt = l[1651];
    }

    for (var i in u) {
        f = u[i];
        try {
            Object.defineProperty(f, 'name', {value: fm_safename(f.name)});
        }
        catch (e) {
        }
        try {
            // this could throw NS_ERROR_FILE_NOT_FOUND
            filesize = f.size;
        }
        catch (ex) {
            ulmanager.logger.warn(f.name, ex);
            continue;
        }
        ul_id = ++__ul_id;
        if (!f.flashid) {
            f.flashid = false;
        }
        f.target = target;
        f.id = ul_id;

        var gid = 'ul_' + ul_id;
        this.addToTransferTable(gid, ttl,
            '<tr id="' + gid + '" class="transfer-queued transfer-upload ' + pause + '">'
            + '<td><div class="transfer-type upload">'
            + '<ul><li class="right-c"><p><span></span></p></li><li class="left-c"><p><span></span></p></li></ul>'
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
            $.ulBunch[M.currentdirid][ul_id] = 1;
        }
    }
    if (!added) {
        ulmanager.logger.warn('Nothing added to upload.');
        return;
    }
    if (!$.transferHeader) {
        transferPanelUI();
    }
    if (page == 'start') {
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
    }
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
        $.transferprogress = {};
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
            $tr.find('.speed').safeHTML(bytesToSize(bps, 1, 1) + '/s').removeClass('unknown');
        }
        else {
            $tr.find('.speed').addClass('unknown').text('');
        }

        mega.ui.tpp.setTransfered(id, bl, 'ul', ul);
        mega.ui.tpp.updateBlock('ul');
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

MegaData.prototype.ulcomplete = function(ul, h, k) {
    var id = ul.id;
    var $tr = $('#ul_' + id);

    if ($.ulBunch && $.ulBunch[ul.target]) {
        var ub = $.ulBunch[ul.target], p;
        ub[id] = h;

        for (var i in ub) {
            if (ub[i] == 1) {
                p = true;
                break;
            }
        }

        if (!p) {
            var ul_target = ul.target;
            ub = Object.keys(ub).map(function(m) {
                return ub[m]
            });
            Soon(function() {
                $(document).trigger('megaulcomplete', [ul_target, ub]);
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

    /*this.mobile_ul_completed = true;
     for (var i in this.mobileuploads)
     {
     if (id == this.mobileuploads[i].id)
     this.mobileuploads[i].done = 1;
     if (!this.mobileuploads[i].done)
     this.mobile_ul_completed = false;
     }
     if (this.mobile_ul_completed)
     {
     $('.upload-status-txt').text(l[1418]);
     $('#mobileuploadtime').addClass('complete');
     $('#uploadpopbtn').text(l[726]);
     $('#mobileupload_header').text(l[1418]);
     }*/
    $tr.removeClass('transfer-started').addClass('transfer-completed');
    $tr.find('.left-c p, .right-c p').css('transform', 'rotate(180deg)');
    $tr.find('.transfer-status').text(ul.skipfile ? l[1668] : l[1418]);
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
        mega.utils.resetUploadDownload();
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
    M.ulprogress(ul, 0, 0, 0);
    if (mega.ui.tpp.getTime('ul') === 0) {
        mega.ui.tpp.setTime(NOW(), 'ul');
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
