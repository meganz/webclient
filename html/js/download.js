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
    if (!is_mobile) {
        init_start();
    }
    if (dlMethod === FlashIO) {
        $('.mega-dialog.download-dialog').removeClass('hidden');
        $('.mega-dialog.download-dialog').css('left','-1000px');
        $('.download-save-your-file').safeHTML('<object data="'
            + document.location.origin
            + '/downloader.swf" id="dlswf_' + htmlentities(ph)
            + '" typeex="application/x-shockwave-flash" height="'
            + $('.download-save-your-file').height() + '"  width="'
            + $('.download-save-your-file').width()
            + '"><param name="wmode" value="transparent">'
            + '<param value="always" name="allowscriptaccess">'
            + '<param value="all" name="allowNetworking">'
            + '<param name=FlashVars value="buttonclick=1" /></object>');
    }
    loadingDialog.show();

    dlpage_ph   = ph;
    dlpage_key  = key;

    if (is_mobile) {
        $('.mobile.dl-browser, .mobile.dl-megaapp').addClass('disabled');
    }
    else {
        watchdog.query('dlsize', 2100, true);
    }

    if (dl_res)
    {
        dl_g(dl_res);
        dl_res = false;
    }
    else {
        // Fetch the file information and optionally the download URL
        M.req({a: 'g', p: ph, 'ad': localStorage.adflag || 1, au: ["wphl", "wphr", "wpht"]}).always(dl_g);
    }

    if (is_mobile) {

        Soon(function() {
            $('.top-head div').children().not('.logo').hide();
        });
    }

    $(window).rebind('keydown.uikeyevents', function(ev) {
        if (ev.keyCode === 27) {
            $('.media-viewer-container', 'body').removeClass('fullscreen browserscreen');
            closeDialog();
        }
    });
}

// eslint-disable-next-line complexity
function dl_g(res, ctx) {
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

    if (ctx && ctx.v2APIError) {
        res = ctx.v2APIError;
    }
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
            var $pageScrollBlock = $(is_mobile ? '.mobile.download-page' : '.download.download-page')
                .removeClass('video video-theatre-mode downloading resumable txtfile image');
            var filename = M.getSafeName(fdl_file.name) || 'unknown.bin';
            var filenameLength = filename.length;
            var fileExtPos = filename.lastIndexOf('.') > 0 ? filename.lastIndexOf('.') : filenameLength;
            var fileTitle = filename.substring(0, fileExtPos);
            var fileExt = filename.substring(fileExtPos).toLowerCase();
            var isVideo = is_video(filename);
            var prevBut = isVideo;
            var onMaxSizeKnown;
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

                if (is_mobile) {
                    $('body').addClass('download-complete');
                    $('.mobile .dl-app-link').removeClass('hidden');
                    $('.mobile .download-progress span').text(l[776]);
                    $('.mobile.download-speed, .mobile.download-percents').text('');
                    $('.download-progress').rebind('click', function() {
                        if (fdl_queue_var) {
                            dlPageStartDownload();
                        }
                        return false;
                    });
                }
            };

            if (is_mobile) {
                setMobileAppInfo();
                fdl_queue_var.onBeforeDownloadComplete = dlbeforecomplete(filename);

                $('.mobile.dl-browser, .mobile.dl-megaapp').removeClass('disabled');
                $('.mobile.filename').text(str_mtrunc(filename, 40));
                $('.mobile.filesize').text(bytesToSize(res.s));
                $('.mobile.dl-megaapp').rebind('click', function() {
                    // Start the download in the app
                    return mobile.downloadOverlay.redirectToApp($(this));
                });
                $('img.filetype-img')
                    .attr('src', staticpath + 'images/mobile/extensions/' + fileIcon(dl_node) + '.png');

                onMaxSizeKnown = function() {

                    // If UC Browser, show an error message, remove the tap/click handler and show as greyed out
                    if (is_uc_browser) {
                        $('body').addClass('wrong-file');
                        $('.mobile.dl-browser').addClass('disabled').off('click');
                        $('.mobile.error-txt.file-unsupported').removeClass('hidden');
                        return false;
                    }

                    var supported = dlmanager.canSaveToDisk(dl_node);

                    if (dl_node.s > maxDownloadSize || !supported) {
                        $('body').addClass('wrong-file');
                        $('.mobile.dl-browser').addClass('disabled').off('click');

                        if (!supported) {
                            $('.mobile.error-txt.file-unsupported').removeClass('hidden');
                        }
                        else {
                            $('.mobile.error-txt.file-too-large').removeClass('hidden');
                        }
                    }
                };
            }

            dlmanager.getMaximumDownloadSize().done(function(size) {
                maxDownloadSize = size;

                if (onMaxSizeKnown) {
                    onIdle(onMaxSizeKnown);
                }

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
                                if (is_mobile && $('body').hasClass('downloading')) {
                                    $('.mobile .download-progress span').text(l[5740]);
                                }
                            }
                            else if (size === fdl_filesize) {
                                onIdle(onDownloadReady);
                            }
                            else if (size === dlResumeInfo.byteOffset) {
                                dlprogress(-0xbadf, perc, dlResumeInfo.byteOffset, fdl_filesize);

                                $pageScrollBlock.addClass('resumable');
                                $('.download.state-text.save').addClass('hidden');
                                $('.download.state-text.resume').removeClass('hidden');
                                setDownloadOptions();

                                if (is_mobile) {
                                    var $progress = $('.mobile .download-progress span');
                                    $progress.text(l[1649]).addClass('resume-bttn');
                                    $('.mobile .dl-app-link').removeClass('hidden');

                                    $('.download-progress').rebind('click', function() {
                                        $('.download-progress').off('click');
                                        $progress.text(l[5740]).removeClass('resume-bttn');
                                        dlPageStartDownload();
                                        return false;
                                    });
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
                $.itemExport = [dlpage_ph];
                var exportLink = new mega.Share.ExportLink({
                    'showExportLinkDialog': true,
                    'nodesToProcess': $.itemExport
                });
                exportLink.getExportLink();
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
                '.js-resume-download, .js-save-download, .mobile.dl-browser')
                .rebind('click', (event) => {

                    if (event.target.classList.contains('js-megasync-qus')) {
                        window.open(getAppBaseUrl() + '/desktop', "_blank");
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

                    if (is_mobile) {
                        const supported = dlmanager.canSaveToDisk(dl_node);
                        $('.mobile.filetype-img').addClass('hidden');

                        const $imageBlock = $('.js-image-preview');
                        window.mediaConIsDl = true;

                        $('.mobile.slideshow-image-previewer').addClass('browserscreen')
                            .appendTo('.js-image-preview').removeClass('hidden');

                        mobile.slideshow.init(dl_node.h);

                        if (supported) {
                            mobile.slideshow.hideHFFlag = true;
                            $imageBlock.addClass('clickable ' + fileIcon(dl_node)).removeClass('hidden')
                                .rebind('click', () => {
                                    $('.mobile.slideshow-image-previewer').addClass('fullscreen')
                                        .removeClass('browserscreen');
                                });
                        }
                    }
                    else {
                        window.mediaConIsDl = true;
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
                        return false;
                    }

                    // Change layout for video
                    $pageScrollBlock.addClass('video');
                    $fileinfoBlock.find('.big-txt .filename').text(fileTitle);
                    $fileinfoBlock.find('.big-txt .extension').text(fileExt);
                    $('.mobile.filetype-img').addClass('hidden');
                    $(window).trigger('resize');

                }).catch(function(ex) {
                    if (ex) {
                        console.warn(ex);
                        showPreviewButton();
                    }
                });
            }
            else if (is_text(dl_node)) {
                // if it's textual file, then handle the UI.
                $('.mobile.filetype-img').addClass('hidden');

                const $containerB =  is_mobile ? $('.download-page.mobile .js-text-viewer')
                    : $('.download.main-pad .js-text-viewer');
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

            if (prevBut) {
                showPreviewButton();
            }

            // This file link is valid to affiliate
            M.affiliate.storeAffiliate(dlpage_ph, 2);
        }
        else if (is_mobile) {
            // Load the missing file decryption key dialog for mobile
            parsepage(pages['mobile']);
            mobile.decryptionKeyOverlay.show(dlpage_ph, false, key);
            fm_hideoverlay();
            return false;
        }
        else {
            // Otherwise load the regular file decryption key dialog
            mKeyDialog(dlpage_ph, false, key)
                .fail(function() {
                    $('.download.error-text.message').text(l[7427]).removeClass('hidden');
                    $('.info-block .block-view-file-type').addClass(fileIcon({name:'unknown'}));
                    $('.download.buttons-block, .download.checkbox-bl').addClass('hidden');
                    $('.js-file-info .download.info-txt').text('Unknown');
                });
        }
    }
    else {
        $('.download.download-page').addClass('na-some-reason');
    }

    if (is_mobile) {
        $('.mobile.application-txt').safeHTML(l[8950]);

        if (!fdl_queue_var) {

            setMobileAppInfo();

            // Show file not found overlay
            $('#mobile-ui-notfound').removeClass('hidden');

            let elm = '';
            if (!dlpage_key && !msg && res !== EBLOCKED && res !== ENOENT) {
                elm = '.download.some-reason';
            }
            else if (res === ETOOMANY) {
                elm = '.download.deleted-user';
            }
            else if (res.e === ETEMPUNAVAIL) {
                elm = '.download.temporarty-error';
            }
            else {
                elm = '.download.some-reason';
            }

            $(elm).removeClass('hidden');

            const $btnClose = $('.js-close-error', '#mobile-ui-notfound');

            $btnClose.removeClass('hidden');

            $btnClose.rebind('tap', () => {
                mobile.loadCloudDrivePage();
                return false;
            });
        }
        else {
            // Show the download overlay
            $('#mobile-ui-main').removeClass('hidden');
        }
    }

    var pf = navigator.platform.toUpperCase();
    if (page.substr(-5) == 'linux') sync_switchOS('linux');
    else if (pf.indexOf('MAC')>=0) sync_switchOS('mac');
    else if (pf.indexOf('LINUX')>=0) sync_switchOS('linux');
    else sync_switchOS('windows');

    if ($.doFireDownload) {
        delete $.doFireDownload;
        if (fdl_queue_var) {
            dlPageStartDownload();
        }
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

    if (is_mobile) {
        if (!Object(fdl_queue_var).lastProgress) {
            $('body').addClass('downloading').find('.bar').width('1%');
            $('.mobile .download-progress span').text(l[5740]);
        }
    }
    else if (mediaCollectFn) {
        onIdle(mediaCollectFn);
        mediaCollectFn = null;
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

    // XXX: ^
    if (is_mobile) {
        var $body = $('body');

        $body
            .addClass('downloading')
            .find('.bar').width(perc + '%');

        $('.mobile.download-percents').text(perc + '%');
    }

    var bps = kbps * 1000;

    if (bytesloaded === bytestotal) {
        $('.download.eta-block .dark-numbers', $dowloadWrapper).text('');
        $('.download.eta-block .light-txt', $dowloadWrapper).text(l[8579] + '\u2026');

        // Change button text to DECRYPTING... which can take some time
        if (is_mobile) {
            $('.mobile .download-progress span').text(l[8579] + '...');
        }
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
        if (is_mobile) {
            $('.mobile.download-speed', $dowloadWrapper).text(Math.round(speed.size) + speed.unit);
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

    var id = dl.dl_id;
    if (d) {
        console.log('dlcomplete', dl);
    }

    $('.download.progress-bar').width('100%');

    if ($('#dlswf_' + id).length > 0)
    {
        $('.fm-dialog-overlay').removeClass('hidden');
        $('body').addClass('overlayed');
        $('.mega-dialog.download-dialog').css('left','50%');
        $('.mega-dialog.download-dialog button.js-close').rebind('click', function() {
            $('.mega-dialog.download-dialog').css('left','-1000px');
            msgDialog('confirmation', l[1196], l[1197], l[1198], function(e)
            {
                if (e) {
                    $('.mega-dialog.download-dialog').addClass('hidden');
                }
                else {
                    $('.mega-dialog.download-dialog').css('left','50%');
                    $('.fm-dialog-overlay').removeClass('hidden');
                    $('body').addClass('overlayed');
                }
            });
        });
    }
    Soon(M.resetUploadDownload);
    $('.download.download-page').removeClass('downloading').addClass('download-complete');
    tfsheadupdate({f: `dl_${id}`});
    if (mega.tpw) {
        mega.tpw.finishDownloadUpload(mega.tpw.DOWNLOAD, dl);
    }
    fdl_queue_var = false;
}

function dlbeforecomplete(filename) {
    'use strict';
    assert(is_mobile, 'er...');

    return function(dl) {
        // default button text: Download completed
        var doneText = String(l[239]).toUpperCase();
        var $dlprogress = $('.download-progress');

        $dlprogress.off('click');
        $('body').addClass('download-complete');
        $('.download-progress .bar').css('width', '100%');
        $('.mobile.download-speed, .mobile.download-percents').text('');

        // Store a log for statistics
        eventlog(99637);// Downloaded file on mobile webclient

        if (dl.io instanceof MemoryIO) {
            // pretend to be a preview to omit the download attempt
            dl.preview = true;

            var openInBrowser = dlmanager.openInBrowser(filename);
            doneText = openInBrowser ? l[8949] : String(l[1988]).toUpperCase();  // Save/Open File

            $dlprogress.rebind('click', function() {

                if (openInBrowser) {
                    dl.io.openInBrowser(filename);
                }
                else {
                    dl.io.completed = false;
                    dl.io.download(filename);
                }
                return false;
            });
        }

        $('.mobile .download-progress span').text(doneText);
    };
}

function sync_switchOS(os)
{
    if (os == 'windows')
    {
        syncurl = 'https://mega.nz/MEGAsyncSetup.exe';
        $('.sync-button-txt.small').text(l[1158]);
        $('.sync-bottom-txt').safeHTML('Also available for <a href="" class="red mac">Mac</a> and <a href="" class="red linux">Linux</a>');
        $('.sync-button').removeClass('mac linux');
        $('.sync-button').attr('href',syncurl);
    }
    else if (os == 'mac')
    {

        syncurl = 'https://mega.nz/MEGAsyncSetup.dmg';
        var ostxt = 'For Mac';
        if (l[1158].indexOf('Windows') > -1) ostxt = l[1158].replace('Windows','Mac');
        if (l[1158].indexOf('Linux') > -1) ostxt = l[1158].replace('Linux','Mac');
        $('.sync-button-txt.small').text(ostxt);
        $('.sync-bottom-txt').safeHTML('Also available for <a href="" class="red windows">Windows</a> and <a href="" class="red linux">Linux</a>');
        $('.sync-button').removeClass('windows linux').addClass('mac');
        $('.sync-button').attr('href',syncurl);
    }
    else if (os == 'linux')
    {
        syncurl = '/desktop';
        var ostxt = 'For Linux';
        if (l[1158].indexOf('Windows') > -1) ostxt = l[1158].replace('Windows','Linux');
        if (l[1158].indexOf('Mac') > -1) ostxt = l[1158].replace('Mac','Linux');
        $('.sync-button-txt.small').text(ostxt);
        $('.sync-bottom-txt').safeHTML('Also available for <a href="" class="red windows">Windows</a> and <a href="" class="red mac">Mac</a>');
        $('.sync-button').removeClass('mac linux').addClass('linux');
        $('.sync-button').attr('href',syncurl);
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
}
