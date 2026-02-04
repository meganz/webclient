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
    document.getElementById('startholder').classList.add('empty');
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
    const {
        dlPage = {
            init: nop,
            updateDlOptions: nop,
            showPausedUI: nop,
            showErrorUI: nop,
        },
        linkAccess
    } = mega.ui || {};
    let errorData = null;

    if (Object(fdl_queue_var).lastProgress) {
        dlprogress.apply(this, fdl_queue_var.lastProgress);
        isPageRefresh = true;
    }
    if (Object(fdl_queue_var).ph) {
        var gid = dlmanager.getGID(fdl_queue_var);

        if (dlQueue.isPaused(gid)) {
            fm_tfspause(gid);

            dlPage.showPausedUI();
        }
    }

    loadingDialog.hide();
    fdl_queue_var = null;

    //  Hide Register Panel
    $('.widget-block').addClass('hidden');
    document.getElementById('startholder').classList.remove('empty');

    if ((errorData = linkAccess.getErrorMessage(res))) {
        linkAccess.showErrorUI(errorData);
    }
    else if (res.at) {
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

            const $pageScrollBlock = $(is_mobile ? '.mega-overlay-view.mega-component' : '.download.download-page')
                .removeClass('video video-theatre-mode');
            const filename = M.getSafeName(fdl_file.name) || 'unknown.bin';
            const isVideo = is_video(filename);
            let prevBut = isVideo;

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
            M.setNodeShare(Object.assign({u: "EXP", r: 0}, dl_node));

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

            // Init desktop UI
            dlPage.init(res);

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
                                if (size === dlResumeInfo.byteOffset) {
                                    dlPage.updateDlOptions();
                                }
                            }
                            else if (size === fdl_filesize) {
                                onIdle(() => {
                                    dlPage.updateDlOptions(fdl_filesize);
                                    dlprogress(-0xbadf, 100, fdl_filesize, fdl_filesize);
                                });
                            }
                            else if (size === dlResumeInfo.byteOffset) {
                                if (is_mobile) {
                                    mobile.downloadOverlay.resumeDownload(dlpage_ph);
                                }
                                else {
                                    dlPage.updateDlOptions();
                                    dlprogress(-0xbadf, perc, dlResumeInfo.byteOffset, fdl_filesize);
                                }
                            }
                            else {
                                dlResumeInfo = false;
                                dlmanager.remResumeInfo(dlpage_ph);
                            }
                        });
                    }
                });
            });

            // DO NOT CHANGE {name: filename} to dl_node as this will called before codec list is loaded
            $('.info-block .item-type-icon-90', $pageScrollBlock)
                .removeClass('icon-generic-90')
                .addClass(`icon-${fileIcon({name: filename})}-90`);

            if (dlQueue.isPaused(dlmanager.getGID(fdl_queue_var))) {
                dlPage.showPausedUI();
            }

            var showPreviewButton = function() {

                if (is_image2(dl_node) || isVideo) {

                    window.mediaConIsDl = true;

                    if (is_mobile) {
                        $('.mobile.slideshow-image-previewer').addClass('browserscreen');
                        if (slideshow(dl_node.h) === false) {
                            mega.ui.viewerOverlay.showLayout(dl_node.h);
                        }
                    }
                    else {
                        const $preview = $('.js-image-preview', $pageScrollBlock);
                        $('.media-viewer-container').appendTo('.js-image-preview');
                        $('.media-viewer', $preview).removeAttr('style');
                        $preview.removeClass('hidden');
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
                    $('.download.video-block', $pageScrollBlock).removeClass('hidden');
                    $('.mobile.filetype-img').addClass('hidden');
                    $(window).trigger('resize');
                    if (is_mobile) {
                        mega.ui.viewerOverlay.showLayout(dl_node.h);
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
                    const $containerB = $('.js-text-viewer', '.download-page').removeClass('hidden');
                    $('.viewer-pending', $containerB).removeClass('hidden');

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
        }
        else {
            return mega.ui.linkAccess.showDecryptionKeyUI(dlpage_ph, false, dlpage_key)
                .catch(() => {
                    // The file link can't be opened as the decryption key is missing.
                    dlPage.showErrorUI({msg: l[7427], fatalError: true});
                });
        }
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

    mBroadcaster.sendMessage('dlpage:initialized', res);

    if ($.doFireDownload) {
        delete $.doFireDownload;
        if (fdl_queue_var) {
            dlPageStartDownload();
        }
    }

    if (/* mega.flags.ab_ads &&*/ !is_mobile) {
        mega.commercials.init();
    }
}

/*
 * Download via browser
*/
function dlPageStartDownload() {
    'use strict';

    if ('dlPage' in mega.ui) {
        mega.ui.dlPage.appDl = false;
        mega.ui.dlPage.showInitUI();
    }

    if (!is_mobile && mediaCollectFn) {
        onIdle(mediaCollectFn);
        mediaCollectFn = null;
    }

    if (!fdl_queue_var) {
        console.warn('This download canceled, set it up from scratch...');

        fdl_queue_var = {
            ...dl_node,
            id: dlpage_ph,
            ph: dlpage_ph,
            key: dl_node.k,
            size: dl_node.s,
            dlkey: dlpage_key,
            n: dl_node.n || dl_node.name,
            onDownloadProgress: dlprogress,
            onDownloadComplete: dlcomplete,
            onDownloadStart: dlstart,
            onDownloadError: M.dlerror.bind(M),
            onBeforeDownloadComplete: nop
        };
    }

    if (ASSERT(fdl_queue_var, 'Cannot start download, fdl_queue_var is not set.')) {
        if (mega.tpw && !mega.tpw.initialized) {
            mega.tpw.showWidget(); // Doesn't show the widget but prepares it for static pages.
        }
        if (dlResumeInfo) {
            fdl_queue_var.byteOffset = dlResumeInfo.byteLength;
        }
        dl_queue.push(fdl_queue_var);
        dlmanager.isDownloading = true;
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

function dlprogress(fileid, perc, bytesloaded, bytestotal,kbps, dl_queue_num)
{
    var now = Date.now();
    const {
        dlPage = {
            showProgressUI: nop,
        }
    } = mega.ui || {};

    Object(fdl_queue_var).lastProgress =
        [fileid, perc, bytesloaded, bytestotal, kbps, dl_queue_num];

    if (fileid !== -0xbadf) {
        dlPage.showProgressUI();

        if (!kbps) {
            return;
        }
    }

    if (dl_queue[dl_queue_num]) {
        if (!dl_queue[dl_queue_num].st) {
            dl_queue[dl_queue_num].st = now - 100;
        }
        dl_queue[dl_queue_num].loaded = bytesloaded;
    }

    dlPage.showProgressUI(perc);

    if (!is_mobile) {
        megatitle(' ' + Math.round(perc) + '%');
    }

    if (bytesloaded && bytesloaded !== bytestotal
        && (now - (fdl_starttime || Object(dl_queue[dl_queue_num]).st)) / 1000) {
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

    if (!self.dl_node) {
        return;
    }
    dl_import = [dlpage_ph, dlkey, dl_node, dl_attr];

    tryCatch(() => {
        localStorage.dlimp = JSON.stringify(dl_import);
    })();

    if (u_type) {
        loadSubPage('fm');
        return;
    }

    var dialogHeader = l[20751];
    var dialogTxt = l[20752];
    var dialogType = 'import_login_or_register';
    var buttonEventRegister = () => {
        mega.ui.showRegisterDialog({
            body: `${l.free_storage_info__create.replace('%s', bytesToSize(mega.bstrg, 0))}`,
            showLogin: true,
            onAccountCreated(gotLoggedIn, accountData) {
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
        if (e === -1) {
            buttonEventLogin();
        }
        else if (e === 1) {
            buttonEventRegister();
        }
        else if (e === -2) {
            start_anoimport();
        }
        else {
            dl_import = false;
            delete localStorage.dlimp;
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

    if ('dlPage' in mega.ui) {
        mega.ui.dlPage.showCompleteUI();
    }

    tfsheadupdate({f: dlmanager.getGID(dl)});
    if (mega.tpw) {
        mega.tpw.finishDownloadUpload(mega.tpw.DOWNLOAD, dl);
    }
}

function sync_switchOS(os) {
    'use strict';
    const l1158 = String(l[1158] || 'for Windows');
    let syncurl = `https://mega.${mega.tld}/MEGAsyncSetup.exe`;

    if (os === 'windows') {
        $('.sync-button-txt.small').text(l1158);
        $('.sync-bottom-txt').safeHTML('Also available for <a href="" class="red mac">Mac</a> and <a href="" class="red linux">Linux</a>');
        $('.sync-button').removeClass('mac linux').attr('href', syncurl);
    }
    else if (os === 'mac') {
        syncurl = `https://mega.${mega.tld}/MEGAsyncSetup.dmg`;
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
        if (mega.tpw && mega.tpw.completeRowsLength) {
            mega.tpw.clearRows(mega.tpw.DONE);
        }
    }
}
