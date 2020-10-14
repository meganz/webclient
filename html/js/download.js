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

function expandDlBar() {
    'use strict';

    var $topBar = $('.download.top-bar');

    $topBar.addClass('expanded');

    (function _resizer() {
        // Set height to  top  bar if it doesn't fit min height
        if ($topBar.hasClass('expanded')) {
            var contentHeight = $('.download.main-pad', $topBar).outerHeight(true);
            if (contentHeight > $('.download-content', $topBar).outerHeight()) {
                $topBar.css({
                    'height': contentHeight +
                        $('.download.bar-table', $topBar).outerHeight() +
                        $('.pages-menu.body', $topBar).height()
                });
            }
        }
        $(window).rebind('resize.download-bar', _resizer);
    })();
}

function dlinfo(ph,key,next)
{
    $('.widget-block').addClass('hidden');
    if (!is_mobile) {
        init_start();
    }
    if (dlMethod === FlashIO) {
        $('.fm-dialog.download-dialog').removeClass('hidden');
        $('.fm-dialog.download-dialog').css('left','-1000px');
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
        M.req({a: 'g', p: ph, 'ad': showAd()}).always(dl_g);
    }

    if (is_mobile) {

        Soon(function() {
            $('.top-head div').children().not('.logo').hide();
        });
    }

    $(window).rebind('keydown.uikeyevents', function(ev) {
        if (ev.keyCode === 27) {
            closeDialog();
        }
    });
}

// eslint-disable-next-line complexity
function dl_g(res, ctx) {
    'use strict';

    var msg;
    var isPageRefresh = false;
    var $topBar = $('.download.top-bar');

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
    showRegisterSidePane(1);
    $('.widget-block').addClass('hidden');

    if (ctx && ctx.v2APIError) {
        res = ctx.v2APIError;
    }
    if (typeof res === 'object' && res.err < 0 && res.u !== 7) {
        res = res.err;
    }

    if (res === ETOOMANY) {
        $('.download.top-bar').addClass('global-error not-available-user');
        setTransferStatus(0, l[243]);
    }
    else if (typeof res === 'number' && res < 0) {
        if (res === -2) {
            $('.download.top-bar').addClass('global-error invalid-url');
            setTransferStatus(0, l[20198]);
        }
        else {
            $('.download.top-bar').addClass('global-error na-some-reason');
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
        $('.download.top-bar').addClass('global-error temporary-na');
        setTransferStatus(0, l[1191]);
    }
    else if (res.d) {
        $('.download.top-bar').addClass('global-error na-some-reason');
        setTransferStatus(0, l[243]);
    }
    else if (res.at) {
        $('.download .pause-transfer').rebind('click', function() {
            if (!$(this).hasClass('active')) {
                fm_tfspause('dl_' + fdl_queue_var.ph);
                $('.download .pause-transfer').addClass('active');
            }
            else {
                $('.download .pause-transfer').removeClass('active');
                fm_tfsresume('dl_' + fdl_queue_var.ph);
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
            var $pageScrollBlock = $(is_mobile ? '.bottom-page.scroll-block' : '.download.top-bar')
                .removeClass('video video-theatre-mode resumable');
            var filename = M.getSafeName(fdl_file.name) || 'unknown.bin';
            var filenameLength = filename.length;
            var fileExtPos = filename.lastIndexOf('.') > 0 ? filename.lastIndexOf('.') : filenameLength;
            var fileTitle = filename.substring(0, fileExtPos);
            var fileExt = filename.substring(fileExtPos).toLowerCase();
            var isVideo = is_video(filename);
            var prevBut = isVideo;
            var onMaxSizeKnown;

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

            var checkMegaSyncDownload = function() {
                $('.checkdiv.megaapp-download').removeClass('checkboxOff').addClass('checkboxOn');
                $('.checkdiv.megaapp-download input').prop('checked', true);
                $('.download.download-file span').text(l[58]);
                $('.download.download-file i').removeClass('save resume');
            };
            var uncheckMegaSyncDownload = function() {
                $('.checkdiv.megaapp-download').removeClass('checkboxOn').addClass('checkboxOff');
                $('.checkdiv.megaapp-download input').prop('checked', false)
                    .closest('.checkbox-bl').removeClass('checked');
                var $but = $('.download.download-file span');
                if (dlResumeInfo) {
                    if (dlResumeInfo.byteLength === fdl_filesize) {
                        $but.text(l[776]);
                        $('.download.download-file i').removeClass('resume').addClass('save');
                    }
                    else {
                        $but.text(l[1649]);
                        $('.download.download-file i').removeClass('save').addClass('resume');
                    }
                    $('.download.info-block .checkbox-bl').css('display', 'none');
                }
                else {
                    $but.text(l[58]);
                    $('.download.download-file i').removeClass('save resume');
                }
            };
            var onDownloadReady = function() {
                uncheckMegaSyncDownload();
                dlprogress(-0xbadf, 100, fdl_filesize, fdl_filesize);

                $pageScrollBlock.addClass('resumable');
                $('.download.state-text.resume').addClass('hidden');
                $('.download.state-text.save').removeClass('hidden');
                $('.download.transfer-buttons a').addClass('hidden');
                $('.download.download-file span').text(l[776]);
                $('.download.download-file i').removeClass('resume').addClass('save');

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
            $('.download.download-file span').text(l[58]);

            if (is_mobile) {
                setMobileAppInfo();
                fdl_queue_var.onBeforeDownloadComplete = dlbeforecomplete(filename);

                $('.mobile.dl-browser, .mobile.dl-megaapp').removeClass('disabled');
                $('.mobile.filename').text(str_mtrunc(filename, 40));
                $('.mobile.filesize').text(bytesToSize(res.s));
                $('.mobile.dl-megaapp').rebind('click', function() {
                    // Start the download in the app
                    mobile.downloadOverlay.redirectToApp($(this));
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
                            }
                            else if (size === fdl_filesize) {
                                onIdle(onDownloadReady);
                            }
                            else if (size === dlResumeInfo.byteOffset) {
                                dlprogress(-0xbadf, perc, dlResumeInfo.byteOffset, fdl_filesize);

                                $pageScrollBlock.addClass('resumable');
                                $('.download.state-text.save').addClass('hidden');
                                $('.download.state-text.resume').removeClass('hidden');
                                $('.download.download-file span').text(l[1649]);
                                $('.download.download-file i').removeClass('save').addClass('resume');

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
                        checkMegaSyncDownload();
                    }
                    else if (localStorage.megaSyncDownloadUnchecked) {
                        uncheckMegaSyncDownload();
                    }
                    else if (!is_mobile) {
                        megasync.isInstalled(function(err, is) {
                            if (!err && is) {
                                checkMegaSyncDownload();
                            }
                            else {
                                uncheckMegaSyncDownload();
                            }
                        });
                    }
                });
            });

            $('.checkdiv.megaapp-download input').change(function() {
                if ($(this).prop('checked')) {
                    checkMegaSyncDownload();
                    delete localStorage.megaSyncDownloadUnchecked;
                }
                else if (fdl_filesize > maxDownloadSize) {
                    checkMegaSyncDownload();
                    dlmanager.setBrowserWarningClasses('.download.warning-block');
                    $(window).trigger('resize');
                }
                else {
                    uncheckMegaSyncDownload();
                    localStorage.megaSyncDownloadUnchecked = 1;
                }
            });

            $('.video-share-button, .viewer-button.right.share').rebind('click', function() {
                $(document).fullScreen(false);
                $.itemExport = [dlpage_ph];
                var exportLink = new mega.Share.ExportLink({
                    'showExportLinkDialog': true,
                    'nodesToProcess': $.itemExport
                });
                exportLink.getExportLink();
                return false;
            });

            $('.mid-button.download-file, .big-button.download-file, .mobile.dl-browser')
                .rebind('click', function() {
                    $('.download.progress-bar').width('0%');
                    $('.open-in-folder').addClass('hidden');

                    if ($('.checkdiv.megaapp-download input').prop('checked')) {
                        loadingDialog.show();
                        megasync.isInstalled(function(err, is) {
                            loadingDialog.hide();

                            // If 'msd' (MegaSync download) flag is turned on and application is installed
                            if (res.msd !== 0 && (!err || is)) {
                                $('.megasync-overlay').removeClass('downloading');
                                megasync.download(dlpage_ph, a32_to_base64(base64_to_a32(dlkey).slice(0, 8)));
                                dlPageStartDownload(true);
                            }
                            else {
                                dlmanager.showMEGASyncOverlay(fdl_filesize > maxDownloadSize);
                            }
                        });
                    }
                    else if (Object(previews[dlpage_ph]).full) {
                        onDownloadReady();
                        M.saveAs(previews[dlpage_ph].buffer, filename);
                    }
                    else if (dlResumeInfo && dlResumeInfo.byteLength === fdl_filesize) {
                        dlPageStartDownload();
                    }
                    else {
                        if (!u_type && !is_mobile) {
                            setTimeout(showRegisterSidePane, 1000);
                        }
                        watchdog.query('dling')
                            .always(function(res) {
                                var proceed = true;

                                if (Array.isArray(res)) {
                                    res = Array.prototype.concat.apply([], res);
                                    proceed = res.indexOf(dlmanager.getGID({ph: dlpage_ph})) < 0;
                                }

                                if (proceed) {
                                    dlmanager.getFileSizeOnDisk(dlpage_ph, filename)
                                        .always(function(size) {
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
                                    $('.download.top-bar')
                                        .removeClass('download-complete resumable')
                                        .addClass('downloading');

                                    // another tab is downloading this
                                    setTransferStatus(0, l[18]);
                                }
                            });
                    }

                    return false;
                });

            $('.mid-button.to-clouddrive, .big-button.to-clouddrive').rebind('click', start_import);

            $('.share-content-button').rebind('click', function() {
                copyToClipboard(getBaseUrl() + '#!' + dlpage_ph + '!' + dlpage_key, l[1642]);
                return false;
            });

            var $fileinfoBlock = $('.download.file-info');

            $fileinfoBlock.find('.big-txt').attr('title', filename);
            $fileinfoBlock.find('.big-txt .filename').text(fileTitle);
            $fileinfoBlock.find('.big-txt .extension').text(fileExt);
            $fileinfoBlock.find('.small-txt').text(fileSize);

            $('.download.bar-filename').text(filename).attr('title', filename);
            $('.bar-cell .download.bar-filesize').text(fileSize);
            $('.info-block .block-view-file-type, .download .bar-cell .transfer-filetype-icon')
                .addClass(fileIcon({ name: filename }));

            if (dlQueue.isPaused(dlmanager.getGID(fdl_queue_var))) {
                $('.download.top-bar').addClass('paused-transfer');
                $('.download.eta-block .dark-numbers').text('');
                $('.download.eta-block .light-txt').text(l[1651]);
                $('.download.speed-block .dark-numbers').safeHTML('&mdash; ' + l['23062.k']);
                $('.download.speed-block .light-txt').text('');
            }

            var showPreviewButton = function($infoBlock) {
                $infoBlock = $infoBlock || $('.download.info-block');

                if (is_image2(dl_node) || isVideo) {
                    var $ipb = $infoBlock.find('.img-preview-button, .thumb-block');

                    $ipb.addClass('clickable').removeClass('hidden')
                        .rebind('click', function() {
                            slideshow(dl_node);

                            if (mediaCollectFn) {
                                onIdle(mediaCollectFn);
                                mediaCollectFn = null;
                            }
                        });
                }
            };

            /** Function to show UI elements if textual files
             *@returns {Void}           void
             */
            var showTextView = function() {
                if (is_text(dl_node)) {
                    // there's no jquery parent for this container.
                    var $containerB = $('.download.main-pad .download.info-block');
                    var $viewBtns = $('.file-type-wrapper, .txt-view-button', $containerB);

                    $viewBtns.addClass('clickable').removeClass('hidden')
                        .rebind('click.txtViewer', function() {
                            loadingDialog.show();

                            mega.fileTextEditor.getFile(dlpage_ph).done(
                                function(data) {
                                    loadingDialog.hide();
                                    var fName;
                                    if (dl_node && dl_node.name) {
                                        fName = dl_node.name;
                                    }
                                    else {
                                        var $fileinfoBlock = $('.download.file-info', $containerB);
                                        fName = $('.big-txt', $fileinfoBlock).attr('title');
                                    }

                                    mega.textEditorUI.setupEditor(fName, data, dlpage_ph, true);
                                }
                            ).fail(function() {
                                loadingDialog.hide();
                            });
                        });
                }
            };

            if (res.fa) {
                var promise = Promise.resolve();

                if (isStreamingEnabled() && String(res.fa).indexOf(':8*') > 0) {
                    promise = iniVideoStreamLayout(dl_node, $pageScrollBlock);
                    prevBut = false;
                }
                else {

                    // load thumbnail
                    getImage(dl_node).then(function(uri) {
                        var $infoBlock = $('.download.info-block');
                        $infoBlock.addClass('thumb').find('img').attr('src', uri);
                        showPreviewButton($infoBlock);
                    });
                }

                promise.then(function(ok) {
                    if (!ok) {
                        // not streamable
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
            else {
                // if it's textual file, then handle the UI.
                showTextView();
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
            return false;
        }
        else {
            // Otherwise load the regular file decryption key dialog
            mKeyDialog(dlpage_ph, false, key)
                .fail(function() {
                    $('.download.error-text.message').text(l[7427]).removeClass('hidden');
                    $('.info-block .block-view-file-type').addClass(fileIcon({name:'unknown'}));
                    $('.download.buttons-block, .download.checkbox-bl').addClass('hidden');
                    $('.file-info .download.info-txt').text('Unknown');
                });
        }
    }
    else {
        $('.download.top-bar').addClass('na-some-reason');
    }

    if (is_mobile) {
        $('.mobile.application-txt').safeHTML(l[8950]);

        if (!fdl_queue_var) {
            // Show file not found overlay
            $('#mobile-ui-notFound').removeClass('hidden');

            if (!dlpage_key && !msg && res !== EBLOCKED && res !== ENOENT) {
                msg = l[7945] + '<p>' + l[7946];
            }
            else if (res === ETOOMANY) {
                msg = l[243] + '<p>' + l[731];
            }
            else if (res.e === ETEMPUNAVAIL) {
                msg = l[1191] + '<p>' + l[253];
            }
            else {
                msg = '<p>' + (msg || l[243]);
            }

            $('.mobile.na-file-txt').safeHTML(msg);
        }
        else {
            // Show the download overlay
            $('#mobile-ui-main').removeClass('hidden');
        }
    }
    else {
        // Expand top bar
        setTimeout(function() {

            // Expand Download Bar
            expandDlBar();

            // Expand top bar if its clicked
            $topBar.rebind('click.expandbar', function(e) {
                var $target = $(e.target);

                if ($(this).find('.download-content').height() < 15
                    && $target.not('.button') && !$target.closest('.button').length
                    && !$target.closest('.top-menu-popup').length
                    && !$target.closest('.pages-menu').length
                    && !$topBar.hasClass('download-complete')) {

                    expandDlBar();
                }
            });

            // Collapse/Expand top bar events
            $('.top-expand-button, .top-expand-txt', $topBar).rebind('click', function() {
                if ($topBar.hasClass('download-complete') && !$topBar.hasClass('expanded')) {
                    $topBar.addClass('hidden-bar');
                    return false;
                }
                else if ($(this).hasClass('active')) {
                    $topBar.removeClass('expanded initial auto').css('height', '');
                    return $(window).unbind('resize.download-bar');
                }
                expandDlBar();
            });

            // Collapse top bar if user scrolls over it
            $topBar.rebind('mousewheel.dlpage', function(ev) {
                var $this = $(this);

                if (!$this.is('.expanded.floating') || $this.is('.video-theatre-mode')) {
                    return;
                }
                var delta = ev.wheelDelta || ev.detail || ev.originalEvent.wheelDelta
                    || ev.originalEvent.detail * 40 || ev.originalEvent.deltaY * 40 || null;

                if ((delta > 120 || delta < -120) && $this.is('.activated')) {
                    $this.removeClass('expanded initial').css('height', '');
                }
            });
        }, 100);
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

// Show register side panel
function showRegisterSidePane(close) {
    'use strict';
    var $pane = $('.register-side-pane.container');

    if (close || !$pane.length) {
        $pane.removeClass('visible');
        return false;
    }

    mega.ui.showRegisterDialog({
        body: l[20750],
        $wrapper: $pane,
        showLogin: true,
        initFormEvents: true,
        controls: function() {
            $('.fm-dialog-close', $pane).rebind('click.registerSidePane', function() {
                $pane.removeClass('visible');
                return false;
            });
        },
        showDialog: function() {
            $pane.addClass('visible');
        },
        closeDialog: function() {
            $pane.removeClass('visible');
        },
        onAccountCreated: function(gotLoggedIn, accountData) {
            this.closeDialog();

            if (!gotLoggedIn) {
                security.register.cacheRegistrationData(accountData);
                mega.ui.sendSignupLinkDialog(accountData, true);
            }
        }
    });
}

function dlPageStartDownload(isDlWithMegaSync) {
    'use strict';
    var $downloadPage = $('.download.top-bar');

    // Collapse top bar
    if (!$downloadPage.hasClass('video-theatre-mode')) {
        $downloadPage.removeClass('expanded initial').css('height', '');
    }
    $('.download .pause-transfer').removeClass('hidden active').find('span').text(l[9112]);
    $(window).unbind('resize.download-bar');

    // Initializing...
    $downloadPage.addClass('downloading').removeClass('resumable');
    $downloadPage.find('.download.state-text').addClass('hidden');
    $downloadPage.find('.img-preview-button:visible').addClass('hidden');
    $downloadPage.find('.standalone-download-message').removeClass('hidden');
    $downloadPage.find('.download.eta-block .dark-numbers').text('');
    $downloadPage.find('.download.eta-block .light-txt').text(l[1042] + '\u2026');
    $('.download.transfer-buttons', $downloadPage).removeClass('hidden');
    $('.download.warning-block').removeClass('visible');

    if (isDlWithMegaSync) {
        $('.download .pause-transfer').addClass('hidden');
        $('.download.speed-block .dark-numbers').css('display', 'none');
        $('.download.transfer-buttons', $downloadPage).addClass('hidden');
        return;
    }

    if (is_mobile) {
        if (!Object(fdl_queue_var).lastProgress) {
            $('body').addClass('downloading').find('.bar').width('1%');
        }
    }
    else if (mediaCollectFn) {
        onIdle(mediaCollectFn);
        mediaCollectFn = null;
    }

    if (ASSERT(fdl_queue_var, 'Cannot start download, fdl_queue_var is not set.')) {
        dlmanager.isDownloading = true;

        if (dlResumeInfo) {
            fdl_queue_var.byteOffset = dlResumeInfo.byteLength;
        }
        dl_queue.push(fdl_queue_var);
    }
    $.dlhash = getSitePath();
}

function getStoreLink() {
    switch (ua.details.os) {
    case 'iPad':
    case 'iPhone':
        return 'https://itunes.apple.com/app/mega/id706857885';

    case 'Windows Phone':
        return 'zune://navigate/?phoneappID=1b70a4ef-8b9c-4058-adca-3b9ac8cc194a';

    case 'Android':
        return 'https://play.google.com/store/apps/details?id=mega.privacy.android.app&referrer=meganzindexandroid';
    }
}

function setMobileAppInfo() {
    $('.mobile.download-app').attr('href', getStoreLink());
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
    var $dowloadWrapper = $('.download.top-bar');

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
    $('.download .pause-transfer', $dowloadWrapper).removeClass('hidden active')
        .children('span').text(l[9112]);

    $('.download.error-text', $dowloadWrapper).addClass('hidden');
    $('.download.main-transfer-error', $dowloadWrapper).addClass('hidden');
    $('.download.overquoata-error', $dowloadWrapper).addClass('hidden');
    $('.download.state-text', $dowloadWrapper).addClass('hidden');
    $('.see-our-plans, .get-more-bonuses, .create-account-button.inline', $dowloadWrapper)
        .addClass('hidden');

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

        var $sizeBlock = $('.file-info .download.info-txt.small-txt', $dowloadWrapper);
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

        megatitle(' ' + perc + '%');
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
        $('.fm-dialog.download-dialog').css('left','50%');
        $('.fm-dialog.download-dialog .fm-dialog-close').rebind('click', function() {
            $('.fm-dialog.download-dialog').css('left','-1000px');
            msgDialog('confirmation', l[1196], l[1197], l[1198], function(e)
            {
                if (e) $('.fm-dialog.download-dialog').addClass('hidden');
                else
                {
                    $('.fm-dialog.download-dialog').css('left','50%');
                    $('.fm-dialog-overlay').removeClass('hidden');
                    $('body').addClass('overlayed');
                }
            });
        });
    }
    Soon(M.resetUploadDownload);
    $('.download.top-bar').removeClass('downloading').addClass('download-complete');
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
        $('.download-progress .bar').width('100%');
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
        syncurl = '/sync';
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
        var c = $(this).attr('class');
        if (c && c.indexOf('windows') > -1) sync_switchOS('windows');
        else if (c && c.indexOf('mac') > -1) sync_switchOS('mac');
        else if (c && c.indexOf('linux') > -1) loadSubPage('sync');
        return false;
    });
}

function dlPageCleanup() {
    if (typeof gifSlider !== 'undefined') {
        gifSlider.clear();
    }

    if (dl_node) {
        $(window).unbind('resize.download-bar');
        $('.download.top-bar').removeClass('expanded initial');
        $(window).trigger('video-destroy');
        dl_node = false;
    }
}
