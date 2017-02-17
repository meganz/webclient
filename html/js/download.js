var dlpage_key,dlpage_ph,dl_next;
var fdl_filename, fdl_filesize, fdl_key, fdl_url, fdl_starttime;
var dl_import=false;
var dl_attr;
var fdl_queue_var=false;

var MOBILE_MAXFILESIZE = 100 * (1024 * 1024);
var MOBILE_FILETYPES = {
    "docx" : 'word',
    "jpeg" : 'image',
    "jpg"  : 'image',
    "mp3"  : 'audio',
    "mp4"  : 'video',
    "pdf"  : 'pdf',
    "png"  : 'image',
    "xlsx" : 'word'
};

// If Chrome or Firefox on iOS, reduce the size to 1.3 MB
if ((navigator.userAgent.match(/CriOS/i)) || (navigator.userAgent.match(/FxiOS/i))) {
    MOBILE_MAXFILESIZE = 1.3 * (1024 * 1024);
}


function dlinfo(ph,key,next)
{
    dl_next = next;

    $('.widget-block').addClass('hidden');
    if (!is_mobile) {
        init_start();
    }
    if (dlMethod == FlashIO)
    {
        $('.fm-dialog.download-dialog').removeClass('hidden');
        $('.fm-dialog.download-dialog').css('left','-1000px');
        $('.download-save-your-file').safeHTML('<object data="' + document.location.origin + '/downloader.swf" id="dlswf_'+ htmlentities(ph) + '" type="application/x-shockwave-flash" height="' + $('.download-save-your-file').height() + '"  width="' + $('.download-save-your-file').width() + '"><param name="wmode" value="transparent"><param value="always" name="allowscriptaccess"><param value="all" name="allowNetworking"><param name=FlashVars value="buttonclick=1" /></object>');
    }
    loadingDialog.show();
    $('.download.content-block').addClass('hidden');

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
        api_req({ a: 'g', p: ph, 'ad': showAd() }, { callback: dl_g });
    }

    if (is_mobile) {
        $('.ads-left-block').hide();
        $('.ads-right-block').hide();
        $('.download.bottom-buttons').hide();

        Soon(function() {
            $('.top-head div').children().not('.logo').hide();
        });
    }
    else {
        // Initialise ads
        megaAds.init();

        // Initialise slide show
        gifSlider.init();
    }
}

function dl_g(res) {
    // Show ad if enabled
    megaAds.ad = res.ad;
    megaAds.popAd = res.popad;

    // Forcefully ignore the API if we really do not want to see ads. This prevents a malicious API response from
    // compromising the browser if an attacker MITM'd the HTTPS connection to the API and returned a malicious ad URL.
    if (showAd() === 0) {
        megaAds.ad = false;
        megaAds.popAd = false;
    }

    if (Object(fdl_queue_var).lastProgress) {
        dlprogress.apply(this, fdl_queue_var.lastProgress);
    }

    megaAds.showAds($('#ads-block-frame'));

    loadingDialog.hide();
    fdl_queue_var = null;

    $('.widget-block').addClass('hidden');
    $('.download.content-block').removeClass('hidden');
    $('.download-button.to-clouddrive').safeHTML(l[1389]).hide();
    $('.download-button.throught-browser').safeHTML(l[8849]).hide();
    $('.download-button.with-megasync').safeHTML(l[8848]).hide();

    if (res === ETOOMANY) {
        $('.download.content-block').addClass('not-available-user');
    }
    else if (typeof res === 'number' && res < 0) {
        $('.download.content-block').addClass('na-some-reason');
    }
    else if (res.e === ETEMPUNAVAIL) {
        $('.download.content-block').addClass('temporary-na');
    }
    else if (res.d) {
        $('.download.content-block').addClass('na-some-reason');
    }
    else if (res.at)
    {
        $('.download.pause-button').rebind('click', function(e) {
            if (!$(this).hasClass('active')) {
                fm_tfspause('dl_' + fdl_queue_var.ph);
                $(this).addClass('active');
            }
            else {
                $(this).removeClass('active');
                fm_tfsresume('dl_' + fdl_queue_var.ph);
            }
        });
        var key = dlpage_key;
        var fdl_file = false;

        if (key)
        {
            var base64key = String(key).trim();
            key = base64_to_a32(base64key).slice(0, 8);
            if (key.length === 8) {
                dl_attr = res.at;
                var dl_a = base64_to_ab(res.at);
                fdl_file = dec_attr(dl_a, key);
                fdl_filesize = res.s;
            }
        }
        if (fdl_file)
        {
            if (is_mobile) {
                $('.mobile.dl-browser, .mobile.dl-megaapp').removeClass('disabled');
            }
            else {
                $('.download-button.to-clouddrive').show();
                $('.download-button.with-megasync').show();
            }
            $('.download-button.with-megasync').rebind('click', function(e) {
                if (!$(this).hasClass('downloading')) {
                    loadingDialog.show();
                    megasync.isInstalled(function(err, is) {
                        // If 'msd' (MegaSync download) flag is turned on and application is installed
                        loadingDialog.hide();
                        if (res.msd !== 0 && (!err || is)) {
                            $('.megasync-overlay').removeClass('downloading');
                            megasync.download(dlpage_ph, a32_to_base64(base64_to_a32(dlkey).slice(0, 8)));
                        } else {
                            megasyncOverlay();
                        }
                    });
                }
            });
            $('.download-button.throught-browser, .mobile.dl-browser')
                .show()
                .rebind('click', function() {
                    $(this).unbind('click');
                    browserDownload();
                    return false;
                });

            $('.download-button.to-clouddrive').rebind('click', start_import);

            if (dl_next === 2)
            {
                dlkey = dlpage_key;
                dlclickimport();
                return false;
            }
            fdl_queue_var = {
                id:     dlpage_ph,
                ph:     dlpage_ph,
                key:    key,
                s:      res.s,
                n:      fdl_file.n,
                size:   fdl_filesize,
                dlkey:  dlpage_key,
                onDownloadProgress: dlprogress,
                onDownloadComplete: dlcomplete,
                onDownloadStart: dlstart,
                onDownloadError: M.dlerror,
                onBeforeDownloadComplete: function() { }
            };

            var filename = htmlentities(fdl_file.n) || 'unknown';
            var filenameLength = filename.length;

            $('.file-info .download.info-txt.filename').text(filename).attr('title', filename);
            $('.file-info .download.info-txt.small-txt').text(bytesToSize(res.s));
            $('.info-block .block-view-file-type').addClass(fileIcon({ name: filename }));

            // XXX: remove this once all browsers support `text-overflow: ellipsis;`
            Soon(function() {
                while (filenameLength-- && $('.download.info-txt.filename').width() > 316) {
                    $('.file-info .download.info-txt.filename').text(str_mtrunc(filename, filenameLength));
                }
                if (filenameLength < 1) {
                    $('.file-info .download.info-txt.filename').text(str_mtrunc(filename, 37));
                }
            });

            if (dlQueue.isPaused(dlmanager.getGID(fdl_queue_var))) {
                $('.download.status-txt, .download-info .text').text(l[1651]).addClass('blue');
                $('.download.pause-button').addClass('active');
            }

            if (is_mobile) {
                setMobileAppInfo();
                $('.mobile.filename').text(str_mtrunc(filename, 30));
                $('.mobile.filesize').text(bytesToSize(res.s));
                $('.mobile.dl-megaapp').rebind('click', function() {
                    mega.utils.redirectToApp($(this));
                });

                var ext = fileext(filename);
                var supported = MOBILE_FILETYPES[ext];
                var icon = supported || 'generic';

                $('img.filetype-img').attr({
                    src: staticpath + 'images/mobile/extensions/' + icon + '.png'
                });

                if (res.s > MOBILE_MAXFILESIZE || !supported) {
                    $('body').addClass('wrong-file');
                    $('.mobile.dl-browser').addClass('disabled');
                    $('.mobile.dl-browser').unbind('click');

                    // Change error message
                    if (!supported) {
                        $('.mobile.error-txt.file-unsupported').removeClass('hidden');
                    }
                    else {
                        $('.mobile.error-txt.file-too-large').removeClass('hidden');
                    }
                }
            }
        }
        else if (is_mobile) {
            var mkey = prompt(l[1026]);

            if (mkey) {
                location.hash = '#!' + dlpage_ph + '!' + mkey;
            }
            else {
                dlpage_key = null;
            }
        }
        else {
            mKeyDialog(dlpage_ph, false, key)
                .fail(function() {
                    $('.download.error-text.message').text(l[7427]).removeClass('hidden');
                    $('.info-block .block-view-file-type').addClass(fileIcon({name:'unknown'}));
                    $('.file-info .download.info-txt').text('Unknown');
                });
        }
    }
    else $('.download.content-block').addClass('na-some-reason');

    if (is_mobile) {
        $('.mobile.application-txt').safeHTML(l[8950]);

        if (!fdl_queue_var) {
            // Show file not found overlay
            $('#mobile-ui-notFound').removeClass('hidden');

            var msg;
            if (!dlpage_key) {
                msg = l[7945] + '<p>' + l[7946];
            }
            else if (res === ETOOMANY) {
                msg = l[243] + '<p>' + l[731];
            }
            else if (res.e === ETEMPUNAVAIL) {
                msg = l[1191] + '<p>' + l[253];
            }
            else {
                msg = '<p>' + l[243];
            }

            $('.mobile.na-file-txt').safeHTML(msg);
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
}

function browserDownload() {
    // If regular download using Firefox and the total download is over 1GB then show the dialog
    // to use the extension, but not if they've seen the dialog before and ticked the checkbox
    if (dlMethod === MemoryIO && !localStorage.firefoxDialog
            && fdl_filesize > 1048576000 && navigator.userAgent.indexOf('Firefox') > -1) {
        firefoxDialog();
    }
    else if (!is_mobile
            && browserDialog.isWeak()
            && fdl_filesize > 1048576000
            && !localStorage.browserDialog) {
        browserDialog();
    }
    else
    {
        $('.download.content-block').addClass('downloading');
        $('.download.percents-txt').text('0 %');
        $('.download.status-txt').text(l[819]).removeClass('green');
        $('.standalone-download-message').removeClass('hidden');

        if (is_mobile) {
            $('body').addClass('downloading')
                .find('.bar').width('1%');
        }

        if (ASSERT(fdl_queue_var, 'Cannot start download, fdl_queue_var is not set.')) {
            dlmanager.isDownloading = true;
            dl_queue.push(fdl_queue_var);
        }
        $.dlhash = getSitePath();
    }
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
            $('.mobile.dl-browser').addClass('disabled').unbind('click');
            break;

        case 'Android':
            $('.app-info-block').addClass('android');
            break;
    }
}

// MEGAsync dialog If filesize is too big for downloading through browser
function megasyncOverlay() {
    var $this = $('.megasync-overlay'),
          slidesNum = $('.megasync-controls div').length;

    $this.addClass('msd-dialog').removeClass('hidden downloading');

    $('.megasync-button.download', $this).rebind('click', function(e)
    {
        megasync.download(dlpage_ph, dlpage_key);
    });

    $('.megasync-slider.button', $this).rebind('click', function()
    {
        var activeSlide = parseInt($('.megasync-controls div.active').attr('data-slidernum'));

        $('.megasync-content.slider').removeClass('slide1 slide2 slide3');

        if ($(this).hasClass('prev')) {
            if (activeSlide > 1) {
                $('.megasync-controls div.active').removeClass('active').prev().addClass('active');
                $('.megasync-content.slider').addClass('slide' + (activeSlide - 1));
            }
        } else {
            if (activeSlide < slidesNum) {
                $('.megasync-controls div.active').removeClass('active').next().addClass('active');
                $('.megasync-content.slider').addClass('slide' + (activeSlide + 1));
            }
        }
    });

    $('.megasync-controls div', $this).rebind('click', function()
    {
        $('.megasync-content.slider').removeClass('slide1 slide2 slide3').addClass('slide' + $(this).attr('data-slidernum'));
        $('.megasync-controls div.active').removeClass('active');
        $(this).addClass('active');
    });

    $('.megasync-info-txt a', $this).rebind('click', function(e) {
        $this.addClass('hidden');
        loadSubPage('pro');
    });

    $('.megasync-close, .fm-dialog-close', $this).rebind('click', function(e) {
        $this.addClass('hidden');
    });

    $('body').rebind('keyup.msd', function(e) {
        if (e.keyCode === 27) {
            $this.addClass('hidden');
        }
    });
}

function closedlpopup()
{
    document.getElementById('download_overlay').style.display='none';
    document.getElementById('download_popup').style.left = '-500px';
}

function importFile() {

    api_req({
        a: 'p',
        t: M.RootID,
        n: [{
                ph: dl_import,
                t: 0,
                a: dl_attr,
                k: a32_to_base64(encrypt_key(u_k_aes, base64_to_a32(dlkey).slice(0, 8)))
            }]
    }, {
        // Check response and if over quota show a special warning dialog
        callback: function (result) {
            if (result === EOVERQUOTA) {
                alarm.overQuota.render();
            }
        }
    });

    dl_import = false;
}

function dlprogress(fileid, perc, bytesloaded, bytestotal,kbps, dl_queue_num)
{
    Object(fdl_queue_var).lastProgress =
        [fileid, perc, bytesloaded, bytestotal, kbps, dl_queue_num];

    $('.download.content-block').removeClass('download-complete').addClass('downloading');
    if (kbps == 0) return;
    $('.download.error-icon').addClass('hidden');
    $('.download.icons-block').removeClass('hidden');
    if ((typeof dl_limit_shown != 'undefined') && (dl_limit_shown < new Date().getTime()+20000) && (!m)) bwDialog.close();
    if (!dl_queue[dl_queue_num].starttime) dl_queue[dl_queue_num].starttime = new Date().getTime()-100;

    if (!m)
    {
        $('.download.status-txt').text(l[258]);
        $('.download-info').removeClass('hidden');
        $('.download.content-block').removeClass('temporary-na');
        $('.download.progress-bar').width(perc + '%');
        $('.download.percents-txt').text(perc + ' %');
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

    if (bytesloaded === bytestotal) {
        $('.download.status-txt').text(l[8579]);

        // Change button text to DECRYPTING... which can take some time
        if (is_mobile) {
            $('.mobile .download-progress span').text(l[8579] + '...');
        }
    }

    if (fdl_starttime) var eltime = (new Date().getTime()-fdl_starttime)/1000;
    else var eltime = (new Date().getTime()-dl_queue[dl_queue_num].starttime)/1000;
    if (eltime && bytesloaded)
    {
        var bps = kbps*1000;
        var retime = (bytestotal-bytesloaded)/bps;
        var speed  = numOfBytes(bps, 1);
        $('.download-info.speed-txt .text').safeHTML(
            speed.size + '<span>' + speed.unit + '/s</span>'
        );
        $('.download-info.time-txt .text').safeHTML(secondsToTime(retime, 1));

        if (is_mobile) {
            $('.mobile.download-speed').text(speed.size + speed.unit + '/s');
        }
    }
    if (page !== 'download' || $.infoscroll)
    {
        $('.widget-block').removeClass('hidden');
        $('.widget-block').show();
        $('.widget-circle').attr('class','widget-circle percents-'+perc);
        $('.widget-icon.downloading').removeClass('hidden');
        $('.widget-speed-block.dlspeed').text(bytesToSize(bps, 1) +'/s');
        $('.widget-block').addClass('active');
    }
}

function dlstart(id,name,filesize)
{
    dlmanager.isDownloading = true;
}

function start_import()
{
    dl_import = dlpage_ph;

    if (u_type) {
        loadSubPage('fm');
        if (fminitialized) {
            importFile();
        }
    }
    else if (u_wasloggedin()) {
        msgDialog('confirmation', l[1193], l[1194], l[1195], function(e) {
            if (e) {
                start_anoimport();
            }
            else {
                loginDialog();
            }
        });
    }
    else {
        start_anoimport();
    }
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

function dlcomplete(id)
{
    if (d) console.log('dlcomplete',id);
    if (typeof id === 'object') id = id.dl_id;

    $('.download-info').addClass('hidden');
    $('.download.progress-bar').width('100%');
    $('.download.percents-txt').text('100 %');
    $('.download.status-txt').text(l[1418]).addClass('green');
    if ($('#dlswf_' + id).length > 0)
    {
        $('.fm-dialog-overlay').removeClass('hidden');
        $('body').addClass('overlayed');
        $('.fm-dialog.download-dialog').css('left','50%');
        $('.fm-dialog.download-dialog .fm-dialog-close').unbind('click');
        $('.fm-dialog.download-dialog .fm-dialog-close').bind('click',function(e)
        {
            $('.fm-dialog.download-dialog').css('left','-1000px');
            msgDialog('confirmation',l[1196],l[1197],l[1198],function(e)
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
    var a=0;
    for(var i in dl_queue) if (typeof dl_queue[i] == 'object' && dl_queue[i]['dl_id']) a++;
    if (a < 2 && !ulmanager.isUploading)
    {
        $('.widget-block').fadeOut('slow',function(e)
        {
            $('.widget-block').addClass('hidden');
            $('.widget-block').css({opacity:1});
        });
    }
    else if (a < 2) $('.widget-icon.downloading').addClass('hidden');
    else $('.widget-circle').attr('class','widget-circle percents-0');
    Soon(mega.utils.resetUploadDownload);
    $('.download.content-block').removeClass('downloading').addClass('download-complete');
    fdl_queue_var = false;

    // Change button text to OPEN FILE
    if (is_mobile) {
        $('.mobile .download-progress span').text(l[8949]);
    }
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

/**
 * If an animation image fails to load it will show this transparent placeholder 1x1 pixel image
 * @param {String} source
 * @returns {Boolean}
 */
function ImgError(source) {
    source.src =  gifSlider.empty1x1png;
    return true;
}

/**
 * Enable ads for some countries and _only_ when they are not logged in.
 * Note: The html for the ads is added on page load rather than existing withing download.html.
 */
var megaAds = {

    // Set to an ad object containing src and other info if we should display an ad
    ad: false,

    // Set to a list of urls for potential popunder ads
    popAd: false,

    /**
     * Initialise the HTML for ads
     */
    init: function() {

        if (this.popAd) {
            mega.popunda.popurls = this.popAd;
            mega.popunda.init($(".download.buttons-block"));
        }

        // Remove any previous ad containers
        $('#ads-block-frame, ads-block-header').remove();

        // Add the ad html into download page
        var $adContainer = $('<div id="ads-block-frame"></div>');

        // Inject header html to alert users that this is advertisement content and not directly from mega
        $adContainer.safeAppend('<div class="ads-block-header">@@</div>', l[7212]);

        // Create the iframe element, with type:content so that it won't
        // inherit the privileged chrome context in the firefox extension.
        var $iframe = mCreateElement('iframe', {type: 'content', style: 'border: none'});
        $adContainer.append($iframe);

        // Fill with an ad if we already have one
        megaAds.showAds($adContainer);

        $('.ads-left-block').prepend($adContainer);
    },

    /**
     * Show the ads inside a cross-domain iframe
     * @param {Object} $adContainer jQuery object of the ads-block-frame
     */
    showAds: function($adContainer) {

        var $iframe = $adContainer.find('iframe');

        // Only show ads if we successfully fetched an ad
        if (this.ad) {

            // The init ads method injected this iframe into the DOM, we make it visible, the correct size, set its src to show the ad
            $adContainer.css('visibility', 'visible');
            $iframe.css('height', this.ad.height + 'px');
            $iframe.css('width', this.ad.width + 'px');
            $iframe.attr('src', this.ad.src);

            // Adjust the other elements within the left column so that they display nicer when the advertisement is present
            $('.animations-left-container').hide();
            $('.ads-left-block').addClass('ads-enabled');
        }
        else {
            // Reset to show no ads
            $adContainer.css('visibility', 'hidden');
            $iframe.css('height', '0px');
            $iframe.css('width', '0px');
            $iframe.removeAttr('src');

            // Hide ad block
            $('.animations-left-container').show();
            $('.ads-left-block').removeClass('ads-enabled');
        }
    }
};

/**
 * Changes the animated product images on the download page
 */
var gifSlider = {

    // Speed to fade in/out the images and text
    fadeInSpeed: 3000,
    fadeOutSpeed: 500,

    // Interval timers
    leftAnimationIntervalId: 0,
    rightAnimationIntervalId: 0,

    // Empty 1x1 image used as placeholder
    empty1x1png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYII=',

    // There can be more or less images on either side e.g. 2 gifs on left and
    // 3 on right and it will still work because they are run independently.
    images: {

        left: [
            {
                name: 'video-chat',         // Name & CSS class of the GIF
                animationLength: 12120,     // Length of the GIF animation in milliseconds
                href: '/blog_38',           // Page link you go to when clicked
                title: 5875,                // Title for above the GIF shown in red
                description: 5876,          // Description next to the title
                imageSrc: null,             // The image path
                bottomImage: null           // The corresponding ad image to be shown in the bottom right corner
            },
            {
                name: 'sync-client',
                animationLength: 12130,
                href: '/sync',
                title: 1626,
                description: 1086,
                imageSrc: null,
                bottomImage: 'button0'      // Swaps between Windows/MacOS/Linux using code above
            }
        ],

        // Slide show on right side of the page
        right: [
            {
                name: 'browser-extension-firefox',
                animationLength: 12080,
                href: '/firefox',
                title: 1088,
                description: 1929,
                imageSrc: null,
                bottomImage: 'button2'
            },
            {
                name: 'browser-extension-chrome',
                animationLength: 12090,
                href: '/chrome',
                title: 1088,
                description: 1929,
                imageSrc: null,
                bottomImage: 'button3'
            },
            {
                name: 'mobile-app',
                animationLength: 15190,
                href: '/mobile',
                title: 955,
                description: 1930,
                imageSrc: null,
                bottomImage: ['button4', 'button5', 'button6']
            }
        ]
    },

    // Initialise the slide show and preload the images into memory so they will display straight away
    init: function() {
        if (browserdetails(ua).browser !== 'Chrome'
                || parseInt(navigator.userAgent.split('Chrome/').pop()) > 42) {
            gifSlider.preLoadImages('left');
        }
        else {
            // Anims get disabled in Chrome 42 or older due a mem leak bug
            $('.products-top-txt').hide();
        }
    },

    /**
     * Preloads the images into memory
     * @param {String} side The side of the page (left or right)
     */
    preLoadImages: function(side) {
        function __loadHandler(idx, length) {
            if (d) {
                console.log('gifSlider.__loadHandler', side, imageLoadStep, idx, length, this.src);
            }
            ++imageLoadStep;

            this.onload = image = null;
            if (gifSlider.state === gifSlider.STATE_GONE) {
                return false;
            }

            // Download and cache the image in a hidden image tag. The currently playing animation will have the
            // src attribute swapped and the next image will start from frame 0 and load it from browser cache.
            $('.animation-image.' + gifSlider.images[side][idx].name).attr('src', this.src);
            this.src = gifSlider.empty1x1png;

            if (gifSlider.state === gifSlider.STATE_INIT) {
                gifSlider.state = gifSlider.STATE_SHOW;

                // Show first two slides using order defined above
                gifSlider.showImage(side, idx);

                // Setup loops to continually change after every slide has finished
                gifSlider.continueSlideShow(side, idx);
            }
            else if (imageLoadStep === length) {
                if (d) {
                    console.log('gifSlider.__loadHandler finished.');
                }

                setTimeout(function() {
                    $('img.animation-image').attr('src', gifSlider.empty1x1png);
                }, 400);

                gifSlider.state = gifSlider.STATE_DONE;

                if (side === 'left') {
                    gifSlider.preLoadImages('right');
                }
            }
        }

        var imageLoadStep = 0, imageSrc, image;
        this.state = this.STATE_INIT;

        // Load locally in dev, but force the .gif animations to load from the static server not CDN to save cost
        var basePath = (location.href.indexOf('localhost') > -1) ? staticpath : 'https://eu.static.mega.co.nz/';
        var baseImagePath = basePath + 'images/products/';

        // Check if using retina display
        var retina = (window.devicePixelRatio > 1) ? '-2x' : '';

        // Loop through the available images
        for (var i = 0, length = gifSlider.images[side].length; i < length; i++) {

            // Store source path to swap out later
            imageSrc = baseImagePath + gifSlider.images[side][i].name + retina + '.gif';
            gifSlider.images[side][i].imageSrc = imageSrc;

            image = new Image();
            image.onload = __loadHandler.bind(image, i, length);
            image.src = imageSrc;
        }
    },

    /**
     * Iterates to the next image in the slideshow
     * @param {String} side The side of the page (left or right)
     * @param {Number} currentSlideIndex The current slide's index number (matches array above)
     */
    continueSlideShow: function(side, currentSlideIndex) {

        // Find when to start the next image
        var animationLengthForCurrentSlide = gifSlider.images[side][currentSlideIndex].animationLength;

        // Set timer to load the next slide after the current one has finished
        gifSlider[side + 'AnimationIntervalId'] = setTimeout(function() {

            // Clear the interval
            gifSlider[side + 'AnimationIntervalId'] = 0;

            // Fade out existing image
            $('.ads-' + side + '-block .products-bottom-block a').fadeOut(gifSlider.fadeOutSpeed);
            $('.animations-' + side + '-container .currentImage').fadeOut(gifSlider.fadeOutSpeed, function() {

                // Increment to next image
                var nextSlideIndex = currentSlideIndex + 1;

                // If it has incremented past the last slide available, go back to start
                if (nextSlideIndex === gifSlider.images[side].length) {
                    nextSlideIndex = 0;
                }

                // Show the image now
                gifSlider.showImage(side, nextSlideIndex);

                // Setup the timer for the slide above, so after that finishes it will run the next one
                gifSlider.continueSlideShow(side, nextSlideIndex);
            });

        }, animationLengthForCurrentSlide);
    },

    /**
     * Shows the animated image
     * @param {String} side The side of the page (left or right)
     * @param {Number} slideIndex The slide's index number to be shown
     */
    showImage: function(side, slideIndex) {

        // Set the details for the next slide
        var sliderObj        = gifSlider.images[side][slideIndex];
        var slideTitle       = l[sliderObj.title] + ':';
        var slideDescription = l[sliderObj.description];
        var slideImgSrc      = sliderObj.imageSrc;
        var slideLink        = sliderObj.href;
        var bottomImage      = sliderObj.bottomImage;

        // Change the link and fade in the new image
        $('.ads-' + side + '-block .currentLink, .ads-' + side + '-block .products-top-txt a.titleLink').attr('href', slideLink);
        $('.animations-' + side + '-container .currentLink').attr('href', slideLink);
        $('.animations-' + side + '-container .currentImage').attr('src', slideImgSrc)
            .css({ width: '260px', height: '300px'}).fadeIn(gifSlider.fadeInSpeed);

        // Set title and description
        $('.ads-' + side + '-block .products-top-txt .red')
            .safeHTML(slideTitle)
            .fadeIn(gifSlider.fadeInSpeed);
        $('.ads-' + side + '-block .products-top-txt .description')
            .text(slideDescription)
            .fadeIn(gifSlider.fadeInSpeed);

        // Display corresponding image in bottom right corner
        if (typeof bottomImage === 'string') {
            $('.ads-' + side + '-block .products-bottom-block .' + bottomImage).fadeIn(gifSlider.fadeInSpeed);
        }

        // If the mobile ad, pick a random store to show in bottom right corner e.g. Google, Apple, Windows
        else if (bottomImage !== null) {
            var randomIndex = rand(bottomImage.length);
            $('.ads-' + side + '-block .products-bottom-block .' + bottomImage[randomIndex]).fadeIn(gifSlider.fadeInSpeed);
        }
    },

    /**
     * Clears the timers and removes the hashchange handler
     */
    clear: function() {

        if (this.leftAnimationIntervalId) {
            clearTimeout(this.leftAnimationIntervalId);
            this.leftAnimationIntervalId = 0;
        }
        if (this.rightAnimationIntervalId) {
            clearTimeout(this.rightAnimationIntervalId);
            this.rightAnimationIntervalId = 0;
        }

        // Set to empty image
        $('img.animation-image, a.currentLink img.currentImage').attr('src', this.empty1x1png);
        this.state = this.STATE_GONE;
    },

    // State flags
    state: 0,
    STATE_INIT: 1,
    STATE_SHOW: 2,
    STATE_DONE: 4,
    STATE_GONE: 8
};
