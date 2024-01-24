var dlpage_ph;
var dlpage_key;
var fdl_filename, fdl_filesize, fdl_key, fdl_url, fdl_starttime;
var dl_import=false;
var dl_attr;
var dl_node;
var fdl_queue_var=false;
var fileSize;
var dlResumeInfo;
var mediaCollectFn;
var maxDownloadSize = Math.pow(2, 53);

function dlinfo(ph,key,next)
{
    $('.widget-block').addClass('hidden');
    loadingDialog.show();

    dlpage_ph = ph;
    dlpage_key = key;

    if (!is_mobile) {
        watchdog.query('dlsize', 2100, true).catch(nop);
    }

    if (dl_res) {
        setupSingleDownloadPage(dl_res)
            .catch(tell);

        dl_res = false;
    }
    else {
        // Fetch the file information and optionally the download URL
        api.req({a: 'g', p: ph, ad: 1})
            .then(({result}) => result)
            .always(setupSingleDownloadPage)
            .catch(tell);
    }

    $(window).rebind('keydown.uikeyevents', function(ev) {
        if (ev.keyCode === 27) {
            $('.media-viewer-container', 'body').removeClass('fullscreen browserscreen');
            closeDialog();
        }
    });
}

// eslint-disable-next-line complexity
async function setupSingleDownloadPage(res) {
    'use strict';

    var msg;
    var isPageRefresh = false;
    var $topBar = $('.download.download-page');

    if (Object(fdl_queue_var).lastProgress) {
        dlprogress.apply(this, fdl_queue_var.lastProgress);
        isPageRefresh = true;
    }
    if (Object(fdl_queue_var).ph) {
        var gid = dlmanager.getGID(fdl_queue_var);

        if (dlQueue.isPaused(gid)) {
            fm_tfspause(gid);
            $('.download .pause-transfer').removeClass('hidden').addClass('active')
                .find('span').text(l[1649]);
        }
    }

    loadingDialog.hide();
    fdl_queue_var = null;

    //  Hide Register Panel
    $('.widget-block').addClass('hidden');

    if (typeof res === 'object' && res.err < 0 && res.u !== 7) {
        res = res.err;
    }

    if (res === ETOOMANY) {
        $('.download.download-page').addClass('global-error not-available-user');
        setTransferStatus(0, l[243]);
    }
    else if (typeof res === 'number' && res < 0) {
        if (res === -2) {
            $('.download.download-page').addClass('global-error invalid-url');
            setTransferStatus(0, l[20198]);
        }
        else {
            $('.download.download-page').addClass('global-error na-some-reason');
            setTransferStatus(0, l[243]);
        }
    }
    else if (res.err < 0) {
        msg = l[23242];

        if (res.l !== 2) {
            msg = l[23243];
        }
        console.assert(res.u === 7);

        setTransferStatus(0, msg);
        $('.deleted-user .error-list-item', $topBar.addClass('global-error not-available-user')).safeHTML(msg);
    }
    else if (res.e === ETEMPUNAVAIL) {
        $('.download.download-page').addClass('global-error temporary-na');
        setTransferStatus(0, l[1191]);
    }
    else if (res.d) {
        $('.download.download-page').addClass('global-error na-some-reason');
        setTransferStatus(0, l[243]);
    }
    else if (res.at) {
        $('.download .pause-transfer').rebind('click', function() {
            if (!$(this).hasClass('active')) {
                fm_tfspause('dl_' + fdl_queue_var.ph);
                $('.download .pause-transfer').addClass('active');
                if (mega.tpw && mega.tpw.initialized) {
                    mega.tpw.pauseDownloadUpload(mega.tpw.DOWNLOAD, { id: fdl_queue_var.ph });
                }
            }
            else {
                $('.download .pause-transfer').removeClass('active');
                fm_tfsresume('dl_' + fdl_queue_var.ph);
                if (mega.tpw && mega.tpw.initialized) {
                    mega.tpw.resumeDownloadUpload(mega.tpw.DOWNLOAD, { id: fdl_queue_var.ph });
                }
            }
        });
        var key = dlpage_key;
        var fdl_file = false;

        if (key) {
            var base64key = String(key).trim();
            key = base64_to_a32(base64key).slice(0, 8);
            if (key.length === 8) {
                dl_attr = res.at;
                fdl_filesize = res.s;
                fdl_file = {a: dl_attr};
                crypto_procattr(fdl_file, key);
            }
        }
        if (fdl_file.name) {
            if (is_mobile) {
                MegaMobileHeader.init(true);
                MegaMobileBanner.init();
                MegaMobileViewOverlay.init();
            }

            var $pageScrollBlock = $(is_mobile ? '.mega-overlay-view.mega-component' : '.download.download-page')
                .removeClass('video video-theatre-mode downloading resumable txtfile image');
            var filename = M.getSafeName(fdl_file.name) || 'unknown.bin';
            var filenameLength = filename.length;
            var fileExtPos = filename.lastIndexOf('.') > 0 ? filename.lastIndexOf('.') : filenameLength;
            var fileTitle = filename.substring(0, fileExtPos);
            var fileExt = filename.substring(fileExtPos).toLowerCase();
            var isVideo = is_video(filename);
            var prevBut = isVideo;
            onIdle(initDownloadScroll);


            dl_node = new MegaNode(Object.assign(fdl_file, {
                k: key,
                fa: res.fa,
                h: dlpage_ph,
                ph: dlpage_ph,
                name: filename,
                s: fdl_filesize,
                link: dlpage_ph + '!' + dlpage_key
            }));

            M.v = [dl_node];
            M.d[dlpage_ph] = dl_node;
            dl_node.shares = {EXP: Object.assign({u: "EXP", r: 0}, dl_node)};

            mediaCollectFn = function() {
                MediaAttribute.setAttribute(dl_node)
                    .then(console.debug.bind(console, 'MediaAttribute'))
                    .catch(console.warn.bind(console, 'MediaAttribute'));
            };

            fdl_queue_var = {
                id: dlpage_ph,
                ph: dlpage_ph,
                key: key,
                s: res.s,
                n: filename,
                size: fdl_filesize,
                dlkey: dlpage_key,
                onDownloadProgress: dlprogress,
                onDownloadComplete: dlcomplete,
                onDownloadStart: dlstart,
                onDownloadError: M.dlerror.bind(M),
                onBeforeDownloadComplete: function() {
                }
            };
            fileSize = bytesToSize(res.s);

            var setDownloadOptions = function() {
                if (dlResumeInfo) {
                    $('.js-download').addClass('hidden');
                    if (dlResumeInfo.byteLength === fdl_filesize) {
                        $('.js-save-download').removeClass('hidden');
                        $('.js-resume-download').addClass('hidden');
                    }
                    else if (dlResumeInfo.byteLength === dlResumeInfo.byteOffset) {
                        $('.js-save-download').addClass('hidden');
                        $('.js-resume-download').removeClass('hidden');
                    }
                    else {
                        $('.js-download').removeClass('hidden');
                    }
                }
                else {
                    $('.js-download').removeClass('hidden');
                    $('.js-resume-download, .js-save-download').addClass('hidden');
                }
            };

            var setMegaSyncDownloadOptions = function() {
                $('.js-default-download').removeClass('js-standard-download').addClass('js-megasync-download');
                setDownloadOptions();
            };
            var setStandardDownloadOptions = function() {
                $('.js-default-download').removeClass('js-megasync-download').addClass('js-standard-download');
                setDownloadOptions();
            };

            var onDownloadReady = function() {
                setStandardDownloadOptions();
                dlprogress(-0xbadf, 100, fdl_filesize, fdl_filesize);

                $pageScrollBlock.addClass('resumable');
                $('.download.state-text.resume').addClass('hidden');
                $('.download.state-text.save').removeClass('hidden');

                $('.js-save-download').removeClass('hidden');
            };

            dlmanager.getMaximumDownloadSize().done(function(size) {
                maxDownloadSize = size;

                dlmanager.getResumeInfo(dlpage_ph, function(aResumeInfo) {
                    dlResumeInfo = aResumeInfo;

                    if (dlResumeInfo) {
                        maxDownloadSize += dlResumeInfo.byteOffset;

                        dlmanager.getFileSizeOnDisk(dlpage_ph, filename).always(function(size) {
                            var perc = Math.floor(dlResumeInfo.byteOffset * 100 / fdl_filesize);
                            dlResumeInfo.byteLength = size >= 0 ? size : null;

                            if (isPageRefresh) {
                                if (d) {
                                    console.log('on-page-refresh');
                                }
                                if (size === dlResumeInfo.byteOffset && !$pageScrollBlock.hasClass('downloading')) {
                                    $('.download.state-text.resume').removeClass('hidden');
                                    setDownloadOptions();
                                }
                            }
                            else if (size === fdl_filesize) {
                                onIdle(onDownloadReady);
                            }
                            else if (size === dlResumeInfo.byteOffset) {
                                if (is_mobile) {
                                    mobile.downloadOverlay.resumeDownload(dlpage_ph);
                                }
                                else {
                                    dlprogress(-0xbadf, perc, dlResumeInfo.byteOffset, fdl_filesize);

                                    $pageScrollBlock.addClass('resumable');
                                    $('.download.state-text.save').addClass('hidden');
                                    $('.download.state-text.resume').removeClass('hidden');
                                    setDownloadOptions();
                                }
                            }
                            else {
                                dlResumeInfo = false;
                                dlmanager.remResumeInfo(dlpage_ph);
                            }
                        });
                    }

                    if (fdl_filesize > maxDownloadSize) {
                        setMegaSyncDownloadOptions();
                    }
                    else if (is_mobile) {
                        setStandardDownloadOptions();
                    }
                    else {
                        megasync.isInstalled(function(err, is) {
                            if (!err && is) {
                                setMegaSyncDownloadOptions();
                            }
                            else {
                                setStandardDownloadOptions();
                            }
                        });
                    }

                });
            });

            $('.viewer-button.right.share, .js-video-share').rebind('click', () => {
                $(document).fullScreen(false);

                if (!$(this).hasClass('disabled')) {
                    $(this).addClass('disabled');

                    // @todo get rid of this '$.itemExport' ...
                    $.itemExport = [dlpage_ph];

                    mega.Share.ExportLink.pullShareLink($.itemExport, {showExportLinkDialog: true})
                        .catch(tell)
                        .finally(() => {
                            $(this).removeClass('disabled');
                        });
                }
                return false;
            });

            $('.viewer-button.right.share, .js-report-abuse').rebind('click', () => {
                M.require('reportabuse_js').done(() => {
                    window.disableVideoKeyboardHandler = true;
                    mega.ui.ReportAbuse = new ReportAbuse();
                });
                return false;
            });

            $('.js-default-download, .js-standard-download, .js-megasync-download,' +
                '.js-resume-download, .js-save-download')
                .rebind('click', (event) => {
                    if (event.detail > 1) {
                        return false;
                    }

                    $('.download.progress-bar').width('0%');
                    $('.open-in-folder').addClass('hidden');

                    if (event.currentTarget.classList.contains('js-megasync-download')) {

                        loadingDialog.show();
                        megasync.isInstalled((err, is) => {
                            loadingDialog.hide();

                            // If 'msd' (MegaSync download) flag is turned on and application is installed
                            if (res.msd !== 0 && (!err || is)) {
                                $('.megasync-overlay').removeClass('downloading');
                                megasync.download(dlpage_ph, a32_to_base64(base64_to_a32(dlkey).slice(0, 8)), (err) => {
                                    if (err) {
                                        setStandardDownloadOptions();
                                        $('.js-default-download').trigger('click');
                                    }
                                }, true);
                                dlPageStartDownload(true);
                            }
                            else {
                                dlmanager.showMEGASyncOverlay(fdl_filesize > maxDownloadSize);
                            }
                        });
                    }
                    else if (fdl_filesize > maxDownloadSize) {
                        setMegaSyncDownloadOptions();
                        dlmanager.setBrowserWarningClasses('.download.warning-block');
                        $(window).trigger('resize');
                    }
                    else if (Object(previews[dlpage_ph]).full) {
                        dlprogress(-0xbadf, 100, fdl_filesize, fdl_filesize);
                        $('.download.download-page').removeClass('downloading').addClass('download-complete');
                        M.saveAs(previews[dlpage_ph].buffer, filename);
                    }
                    else if (dlResumeInfo && dlResumeInfo.byteLength === fdl_filesize) {
                        dlPageStartDownload();
                    }
                    else {
                        watchdog.query('dling')
                            .always((res) => {
                                var proceed = true;

                                if (Array.isArray(res)) {
                                    res = Array.prototype.concat.apply([], res);
                                    proceed = res.indexOf(dlmanager.getGID({ph: dlpage_ph})) < 0;
                                }

                                if (proceed) {
                                    dlmanager.getFileSizeOnDisk(dlpage_ph, filename)
                                        .always((size) => {
                                            if (size === fdl_filesize) {
                                                // another tab finished the download
                                                dlResumeInfo = Object.assign({}, dlResumeInfo, {byteLength: size});
                                                onDownloadReady();
                                            }
                                            dlPageStartDownload();
                                        });
                                }
                                else {
                                    $('.download.state-text.resume').addClass('hidden');
                                    $('.download.download-page')
                                        .removeClass('download-complete resumable')
                                        .addClass('downloading');

                                    // another tab is downloading this
                                    setTransferStatus(0, l[18]);
                                }
                            });
                    }
                    return false;
                });

            $('.mid-button.to-clouddrive, button.to-clouddrive').rebind('click', start_import);

            $('.share-content-button').rebind('click', function() {
                copyToClipboard(getBaseUrl() + '#!' + dlpage_ph + '!' + dlpage_key, l[1642]);
                return false;
            });

            var $fileinfoBlock = $('.js-file-info');

            $fileinfoBlock.find('.big-txt').attr('title', filename);
            $fileinfoBlock.find('.big-txt .filename').text(fileTitle);
            $fileinfoBlock.find('.big-txt .extension').text(fileExt);
            $fileinfoBlock.find('.small-txt').text(fileSize);

            $('.download.bar-filename').text(filename).attr('title', filename);
            $('.bar-cell .download.bar-filesize').text(fileSize);
            $('.info-block .block-view-file-type, .download .bar-cell .transfer-filetype-icon')
                .addClass(fileIcon({ name: filename }));

            if (dlQueue.isPaused(dlmanager.getGID(fdl_queue_var))) {
                $('.download.download-page').addClass('paused-transfer');
                $('.download.eta-block .dark-numbers').text('');
                $('.download.eta-block .light-txt').text(l[1651]);
                $('.download.speed-block .dark-numbers').safeHTML('&mdash; ' + l['23062.k']);
                $('.download.speed-block .light-txt').text('');
            }

            var showPreviewButton = function() {

                if (is_image2(dl_node) || isVideo) {

                    $pageScrollBlock.addClass('image');

                    window.mediaConIsDl = true;

                    if (is_mobile) {
                        $('.mobile.slideshow-image-previewer').addClass('browserscreen');
                        if (slideshow(dl_node.h) === false) {
                            mega.ui.viewerOverlay.showLayout(dl_node.h);
                        }
                    }
                    else {
                        $('.media-viewer-container').appendTo('.js-image-preview');
                        slideshow(dl_node);
                    }

                    if (mediaCollectFn) {
                        onIdle(mediaCollectFn);
                        mediaCollectFn = null;
                    }
                }
            };

            if (res.fa) {
                let promise = Promise.resolve(null);

                if (isStreamingEnabled() && String(res.fa).indexOf(':8*') > 0) {
                    promise = iniVideoStreamLayout(dl_node, $pageScrollBlock);
                    prevBut = false;
                }

                promise.then(function(ok) {
                    if (!ok) {
                        // not streamable, load thumbnail and quit.
                        if (ok === null) {
                            showPreviewButton();
                        }
                        else if (is_mobile) {
                            // Non Pre-viewable file
                            mega.ui.viewerOverlay.show(dl_node.h);
                        }
                        return false;
                    }

                    // Change layout for video
                    $pageScrollBlock.addClass('video');
                    $fileinfoBlock.find('.big-txt .filename').text(fileTitle);
                    $fileinfoBlock.find('.big-txt .extension').text(fileExt);
                    $('.mobile.filetype-img').addClass('hidden');
                    $(window).trigger('resize');
                    if (is_mobile) {
                        if (slideshow(dl_node.h) === false) {
                            mega.ui.viewerOverlay.showLayout(dl_node.h);
                        }
                    }

                }).catch(function(ex) {
                    if (ex) {
                        console.warn(ex);
                        showPreviewButton();
                    }
                });
            }
            else if (is_text(dl_node)) {
                if (is_mobile) {
                    // Text file - Non Pre-viewable file
                    mega.ui.viewerOverlay.show(dl_node.h);
                }
                else {
                    const $containerB = $('.download.main-pad .js-text-viewer');
                    $('.viewer-pending', $containerB).removeClass('hidden');
                    $pageScrollBlock.addClass('txtfile');

                    // Preload CodeMirror to be available when setupEditor() is invoked.
                    M.require('codemirror_js', 'codemirrorscroll_js').dump('cm.preload');

                    // Handle partial content for big text-files?
                    const CHUNK_SIZE = 32768;
                    const partial = dl_node.s > CHUNK_SIZE;

                    const cachedData = mega.fileTextEditor.getCachedData(dl_node.link);

                    if (cachedData) {
                        mega.textEditorUI.setupEditor(dl_node.name, cachedData.text, dlpage_ph, true, $containerB);
                        window.textConIsDl = true;
                        $('.viewer-pending', $containerB).addClass('hidden');
                    }
                    else {
                        const onError = (ex) => {
                            $('.js-text-viewer-icon', $containerB).removeClass('hidden');
                            if (d) {
                                console.error("Failed to read as text from buffer.", ex);
                            }
                        };
                        const onLoadEnd = () => {
                            $('.viewer-pending', $containerB).addClass('hidden');
                        };

                        M.gfsfetch(dl_node.link, 0, partial ? CHUNK_SIZE : -1)
                            .then((data) => {
                                return mega.fileTextEditor.getTextFromBuffer(data.buffer);
                            })
                            .then(txt => {
                                if (dl_node && dl_node.name) {

                                    mega.fileTextEditor.cacheData(dl_node.link, txt, partial);
                                    window.textConIsDl = true;
                                    mega.textEditorUI.setupEditor(dl_node.name, txt, dlpage_ph, true, $containerB);

                                    if (partial) {
                                        // @todo streaming
                                        mBroadcaster.once('txt.viewer:scroll-bottom', (editor) => {
                                            $('.viewer-pending', $containerB).removeClass('hidden');
                                            const ln = editor.lineCount();
                                            M.gfsfetch(dl_node.link, 0, -1)
                                                .then((data) => {
                                                    return mega.fileTextEditor.getTextFromBuffer(data.buffer);
                                                })
                                                .then(txt => {
                                                    mega.fileTextEditor.cacheData(dl_node.link, txt, false);
                                                    editor.setValue(txt);
                                                    editor.scrollIntoView(ln);
                                                })
                                                .catch(onError)
                                                .finally(onLoadEnd);
                                        });
                                    }
                                }
                            })
                            .catch(onError)
                            .finally(onLoadEnd);
                    }
                }
            }
            else if (fileext(dl_node.name, true) === 'DOCX') {
                prevBut = true;
            }
            else if (is_mobile) {
                mega.ui.viewerOverlay.show(dl_node.h);
            }

            if (prevBut) {
                showPreviewButton();
            }

            // This file link is valid to affiliate
            M.affiliate.storeAffiliate(dlpage_ph, 2);
        }
        else {
            return mKeyDialog(dlpage_ph, false, key)
                .catch(() => {
                    $('.download.error-text.message').text(l[7427]).removeClass('hidden');
                    $('.info-block .block-view-file-type').addClass(fileIcon({name: 'unknown'}));
                    $('.download.buttons-block, .download.checkbox-bl').addClass('hidden');
                    $('.js-file-info .download.info-txt').text('Unknown');
                });
        }
    }
    else {
        $('.download.download-page').addClass('na-some-reason');
    }

    if (is_mobile & !fdl_queue_var) {
        mobile.notFound.show(msg || parseInt(res && res.e || res));
    }

    if (!is_mobile) {

        var pf = navigator.platform.toUpperCase();

        if (page.substr(-5) === 'linux') {
            sync_switchOS('linux');
        }
        else if (pf.indexOf('MAC') >= 0) {
            sync_switchOS('mac');
        }
        else if (pf.indexOf('LINUX') >= 0) {
            sync_switchOS('linux');
        }
        else {
            sync_switchOS('windows');
        }
    }

    if ($.doFireDownload) {
        delete $.doFireDownload;
        if (fdl_queue_var) {
            dlPageStartDownload();
        }
    }

    if (mega.flags.ab_ads && !is_mobile) {
        mega.commercials.init();
    }
}

function initDownloadScroll() {

    "use strict";

    var treeClass = 'js-download-scroll-panel';
    var scrollBlock = document.getElementsByClassName(treeClass).item(0);

    if (scrollBlock) {
        if (scrollBlock.classList.contains('ps')) {
            Ps.update(scrollBlock);
        }
        else {
            Ps.initialize(scrollBlock);
        }
    }
}

function dlPageStartDownload(isDlWithMegaSync) {
    'use strict';
    var $downloadPage = $('.download.download-page');

    $('.download .pause-transfer').removeClass('hidden active').find('span').text(l[9112]);

    // Initializing...
    $downloadPage.addClass('downloading').removeClass('resumable');
    $downloadPage.find('.download.state-text').addClass('hidden');
    $downloadPage.find('.img-preview-button:visible').addClass('hidden');
    $downloadPage.find('.standalone-download-message').removeClass('hidden');
    $downloadPage.find('.download.eta-block .dark-numbers').text('');
    $downloadPage.find('.download.eta-block .light-txt').text(l[1042] + '\u2026');
    $('.download.warning-block').removeClass('visible');

    if (isDlWithMegaSync) {
        $('.download .pause-transfer').addClass('hidden');
        $('.download.speed-block .dark-numbers').css('display', 'none');
        return;
    }

    if (!is_mobile && mediaCollectFn) {
        onIdle(mediaCollectFn);
        mediaCollectFn = null;
    }

    if (fdl_queue_var === false) {
        console.error('This download did complete, fix the UI and set it up from scratch...');
        return;
    }

    if (ASSERT(fdl_queue_var, 'Cannot start download, fdl_queue_var is not set.')) {
        dlmanager.isDownloading = true;
        if (mega.tpw && !mega.tpw.initialized) {
            mega.tpw.showWidget(); // Doesn't show the widget but prepares it for static pages.
        }
        if (dlResumeInfo) {
            fdl_queue_var.byteOffset = dlResumeInfo.byteLength;
        }
        dl_queue.push(fdl_queue_var);
    }
    $.dlhash = getSitePath();
}

function setMobileAppInfo() {
    $('.mobile.download-app').attr('href', getMobileStoreLink());
    switch (ua.details.os) {
        case 'iPad':
        case 'iPhone':
            $('.app-info-block').addClass('ios');
            break;

        case 'Windows Phone':
            $('.app-info-block').addClass('wp');
            $('.mobile.dl-browser').addClass('disabled').off('click');
            break;

        case 'Android':
            $('.app-info-block').addClass('android');
            break;
    }
}

function closedlpopup()
{
    document.getElementById('download_overlay').style.display='none';
    document.getElementById('download_popup').style.left = '-500px';
}

function importFile() {
    'use strict';
    M.importFileLink(dl_import[0], dl_import[1], dl_attr, dl_import[2]).always(function() {
        mBroadcaster.sendMessage('fm:importFileLinkDone');
    });
}

function dlprogress(fileid, perc, bytesloaded, bytestotal,kbps, dl_queue_num)
{
    var now = Date.now();
    var $dowloadWrapper = $('.download.download-page');

    Object(fdl_queue_var).lastProgress =
        [fileid, perc, bytesloaded, bytestotal, kbps, dl_queue_num];

    if (fileid !== -0xbadf) {
        $dowloadWrapper.removeClass('download-complete').addClass('downloading');
        if (!kbps) {
            return;
        }
    }

    $dowloadWrapper.removeClass('error');
    $('.download.speed-block', $dowloadWrapper).removeClass('hidden');
    $('.download.eta-block', $dowloadWrapper).removeClass('hidden');
    $('.bar-table .progress-block', $dowloadWrapper).removeClass('hidden');
    $('.download.error-text', $dowloadWrapper).addClass('hidden');
    $('.download.main-transfer-error', $dowloadWrapper).addClass('hidden');
    $('.download.overquoata-error', $dowloadWrapper).addClass('hidden');
    $('.download.state-text', $dowloadWrapper).addClass('hidden');

    if (dl_queue[dl_queue_num]) {
        if (!dl_queue[dl_queue_num].st) {
            dl_queue[dl_queue_num].st = now - 100;
        }
        dl_queue[dl_queue_num].loaded = bytesloaded;
    }

    if (!m)
    {
        $dowloadWrapper.removeClass('temporary-na');
        $('.download.progress-bar', $dowloadWrapper).width(perc + '%');

        var $sizeBlock = $('.js-file-info .download.info-txt.small-txt', $dowloadWrapper);
        var $topbarSizeBlock = $('.bar-cell .download.bar-filesize', $dowloadWrapper);

        if ($('.dark', $sizeBlock).length === 0) {
            $sizeBlock.safeHTML(
                '<span class="dark">' +
                '</span>' +
                '<hr />' +
                '<span class="fs">' +
                    fileSize +
                '</span>'
            );
            $topbarSizeBlock.safeHTML('<span class="green"></span><hr />' + fileSize);
        }

        $('.dark', $sizeBlock).add($('.green', $topbarSizeBlock)).text(bytesToSize(bytesloaded));

        megatitle(' ' + Math.round(perc) + '%');
    }

    var bps = kbps * 1000;

    if (bytesloaded === bytestotal) {
        $('.download.eta-block .dark-numbers', $dowloadWrapper).text('');
        $('.download.eta-block .light-txt', $dowloadWrapper).text(l[8579] + '\u2026');
    }
    else if (bytesloaded && (now - (fdl_starttime || Object(dl_queue[dl_queue_num]).st)) / 1000) {
        var retime = (bytestotal-bytesloaded)/bps;
        var speed  = numOfBytes(bps, 1, true);
        $('.download.speed-block .dark-numbers', $dowloadWrapper).text(speed.size);
        $('.download.speed-block .light-txt', $dowloadWrapper).text(speed.unit);
        $('.download.eta-block .dark-numbers', $dowloadWrapper).safeHTML(secondsToTime(retime, 1));
        $('.download.eta-block .light-txt', $dowloadWrapper).text('');

        if (!$.transferprogress) {
            $.transferprogress = Object.create(null);
        }

        if (bytestotal) {
            $.transferprogress["dl_" + fileid] = [bytesloaded, bytestotal, kbps * 1000];
        }
        tfsheadupdate({t: `dl_${fileid}`});
        if (mega.tpw) {
            mega.tpw.updateDownloadUpload(
                mega.tpw.DOWNLOAD,
                fileid,
                perc,
                bytesloaded,
                bytestotal,
                kbps,
                dl_queue_num,
                dl_queue[dl_queue_num].st
            );
        }
    }
}

function dlstart(id,name,filesize)
{
    dlmanager.isDownloading = true;

    if (window.slideshowid) {
        M.showTransferToast();
    }
}

function start_import() {
    'use strict';

    dl_import = [dlpage_ph, dlkey, dl_node];

    if (u_type) {
        loadSubPage('fm');
        if (fminitialized) {
            importFile();
        }
        return;
    }

    var dialogHeader = l[20751];
    var dialogTxt = l[20752];
    var dialogType = 'import_login_or_register';
    var buttonEventRegister = function() {
        mega.ui.showRegisterDialog({
            body: l[20756],
            showLogin: true,
            onAccountCreated: function(gotLoggedIn, accountData) {
                if (gotLoggedIn) {
                    console.assert(u_type, 'Invalid procedure...');
                    return start_import();
                }

                security.register.cacheRegistrationData(accountData);
                mega.ui.sendSignupLinkDialog(accountData);
            }
        });
    };

    var buttonEventLogin = function() {
        mega.ui.showLoginRequiredDialog({minUserType: 3, skipInitialDialog: 1}).then(start_import);
    };

    msgDialog(dialogType, l[1193], dialogHeader, dialogTxt, function(e) {
        if (e === 'login') {
            buttonEventLogin();
        }
        else if (e === 'register') {
            buttonEventRegister();
        }
        else if (e === 'ephemeral') {
            start_anoimport();
        }
        else {
            dl_import = false;
        }
    });
}

function start_anoimport()
{
    loadingDialog.show();
    u_checklogin(
    {
        checkloginresult: function(u_ctx,r)
        {
            u_type = r;
            u_checked=true;
            loadingDialog.hide();
            loadSubPage('fm');
        }
    },true);
}

function dlcomplete(dl) {
    'use strict';

    if (d) {
        console.log('dlcomplete', dl);
    }

    onIdle(M.resetUploadDownload);
    $('.download.progress-bar').width('100%');
    $('.download.download-page').removeClass('downloading').addClass('download-complete');
    tfsheadupdate({f: dlmanager.getGID(dl)});
    if (mega.tpw) {
        mega.tpw.finishDownloadUpload(mega.tpw.DOWNLOAD, dl);
    }
    fdl_queue_var = false;
}

function sync_switchOS(os) {
    'use strict';
    const l1158 = String(l[1158] || 'for Windows');
    let syncurl = 'https://mega.nz/MEGAsyncSetup.exe';

    if (os === 'windows') {
        $('.sync-button-txt.small').text(l1158);
        $('.sync-bottom-txt').safeHTML('Also available for <a href="" class="red mac">Mac</a> and <a href="" class="red linux">Linux</a>');
        $('.sync-button').removeClass('mac linux').attr('href', syncurl);
    }
    else if (os === 'mac') {
        syncurl = 'https://mega.nz/MEGAsyncSetup.dmg';
        let ostxt = 'For Mac';
        if (l1158.includes('Windows')) {
            ostxt = l1158.replace('Windows', 'Mac');
        }
        else if (l1158.includes('Linux')) {
            ostxt = l1158.replace('Linux', 'Mac');
        }
        $('.sync-button-txt.small').text(ostxt);
        $('.sync-bottom-txt').safeHTML('Also available for <a href="" class="red windows">Windows</a> and <a href="" class="red linux">Linux</a>');
        $('.sync-button').removeClass('windows linux').addClass('mac').attr('href', syncurl);
    }
    else if (os === 'linux') {
        syncurl = '/desktop';
        let ostxt = 'For Linux';
        if (l1158.includes('Windows')) {
            ostxt = l1158.replace('Windows', 'Linux');
        }
        else if (l1158.includes('Mac')) {
            ostxt = l1158.replace('Mac', 'Linux');
        }
        $('.sync-button-txt.small').text(ostxt);
        $('.sync-bottom-txt').safeHTML('Also available for <a href="" class="red windows">Windows</a> and <a href="" class="red mac">Mac</a>');
        $('.sync-button').removeClass('mac linux').addClass('linux').attr('href', syncurl);
    }
    $('.sync-bottom-txt a').rebind('click',function(e)
    {
        const $this = $(this);
        if ($this.hasClass('windows')) {
            sync_switchOS('windows');
        }
        else if ($this.hasClass('mac')) {
            sync_switchOS('mac');
        }
        else if ($this.hasClass('linux')) {
            loadSubPage('desktop');
        }

        return false;
    });
}

function dlPageCleanup() {
    'use strict';

    if (typeof gifSlider !== 'undefined') {
        gifSlider.clear();
    }

    if (dl_node) {
        $(window).trigger('video-destroy');
        dl_node = false;
    }

    if (window.textConIsDl) {
        mega.textEditorUI.cleanup();
        delete window.textConIsDl;
    }

    if (window.mediaConIsDl) {
        const wrapper = is_mobile ? '#startholder' : 'body';
        const container = is_mobile ? '.mobile.slideshow-image-previewer' : '.media-viewer-container';
        $(container).appendTo(wrapper);
        delete window.mediaConIsDl;
    }
    if (!is_mobile && typeof fdl_queue_var !== 'undefined') {
        const $tpwRows = $('.transfer-task-row.complete', '.transfer-progress-widget-body');
        if (mega.tpw && $tpwRows.length) {
            mega.tpw.removeRow($tpwRows.toArray().map(a => String(a.id).replace('tpw_', '')), false);
        }
    }
}
