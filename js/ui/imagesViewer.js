var previews = Object.create(null);
var preqs = Object.create(null);
var pfails = Object.create(null);
var slideshowid;

(function _imageViewerSlideShow(global) {
    "use strict";

    var origImgWidth;
    var slideshowplay;
    var slideshowpause;
    var origImgHeight;
    var slideshowTimer;
    var fullScreenManager;
    var _hideCounter = false;
    var switchedSides = false;
    var fitToWindow = Object.create(null);
    var _pdfSeen = false;
    var _docxSeen = false;
    var optionsMenu;
    var settingsMenu;
    var preselection;
    const broadcasts = [];
    const MOUSE_IDLE_TID = 'auto-hide-previewer-controls';
    let zoomPan = false;

    const onConfigChange = (name) => {
        if (name === 'speed') {
            slideshow_timereset();
        }
    };

    const events = [
        'mega:openfolder',
        'updFileManagerUI',
        'chat_image_preview',
        'mega:gallery:view:after',
        'mega:close_fileversioning'
    ];

    const listener = () => {
        if (slideshowplay) {
            mega.slideshow.manager.setState({});
        }
    };

    for (let i = 0; i < events.length; i++) {
        mBroadcaster.addListener(events[i], listener);
    }

    function slideshow_handle(raw) {
        var result;

        if (slideshowid) {
            result = raw ? slideshowid : slideshowid.slice(-8);
        }
        return result || false;
    }

    function slideshow_legacySteps() {
        const $overlay = $('.media-viewer-container');
        const $controls = $('.gallery-btn', $overlay);
        const $counter = $('header .counter', $overlay);
        const $startButton = $('.v-btn.slideshow', $overlay);
        const forward = [];
        const backward = [];

        let slideShowItemCount = window.dl_node ? 2 : 0;
        const slideShowModeFilter = !slideShowItemCount &&
            (mega.slideshow.utils && mega.slideshow.utils.filterNodes(undefined, true) || (() => true));

        let current;
        let pos = [];
        let filter = (n) => (n.fa || !M.getNodeShare(n).down) && (is_image2(n) || is_video(n));
        let index = (i) => M.v[i].h;

        if (M.chat) {
            index = (i) => M.v[i].ch;
        }
        else if (preselection) {
            index = (i) => preselection[i].h;
            filter = () => true;
        }

        const list = preselection || M.v;
        for (let i = 0, m = list.length; i < m; ++i) {

            if (filter(list[i])) {
                // is currently previewed item
                if (index(i) === slideshowid) {
                    current = i;
                }
                pos.push(i);

                if (slideShowItemCount < 2 && slideShowModeFilter(list[i])) {

                    ++slideShowItemCount;
                }
            }
        }

        const len = pos.length;
        if (len > 1) {
            const n = pos.indexOf(current);
            switch (n) {
                // last
                case len - 1:
                    forward.push(index(pos[0]));
                    backward.push(index(pos[n - 1]));
                    break;
                // first
                case 0:
                    forward.push(index(pos[n + 1]));
                    backward.push(index(pos[len - 1]));
                    break;
                case -1:
                    break;
                default:
                    forward.push(index(pos[n + 1]));
                    backward.push(index(pos[n - 1]));
            }

            $counter.removeClass('hidden');
            $controls.removeClass('hidden');

            $startButton.toggleClass('hidden', slideShowItemCount < 2);
            $counter.text(String(l.preview_counter || '').replace('%1', pos = n + 1).replace('%2', len));
        }
        else {
            $counter.addClass('hidden');
            $controls.addClass('hidden');
            $startButton.addClass('hidden');
        }

        if (_hideCounter || is_video(M.v[current])) {
            $counter.addClass('hidden');
        }

        return {backward, forward, pos, len};
    }

    function slideshowsteps() {

        if (slideshowplay) {
            const {playIndex, playLength, backward, forward} = mega.slideshow.manager.next(slideshowid);

            if (!mega.slideshow.manager.isLast(playIndex) && forward === undefined) {
                mega.slideshow.manager.setState({});
                slideshow_next();
            }

            if (slideshowplay && !slideshowpause && mega.slideshow.manager.isLast(playIndex) && forward === undefined) {
                slideshow_toggle_pause($('.sl-btn.playpause', '.slideshow-controls'));
            }

            return {backward: [backward], forward: [forward], len: playLength, pos: playIndex};
        }

        return slideshow_legacySteps();
    }

    function slideshow_move(dir, steps) {
        var valid = true;
        var h = slideshow_handle();
        var step = dir === 'next' ? 'forward' : 'backward';
        $.videoAutoFullScreen = $(document).fullScreen();

        for (const i in self.dl_queue) {
            if (dl_queue[i].id === h && dl_queue[i].preview) {
                valid = false;
                return false;
            }
        }

        if (!valid) {
            return;
        }

        steps = steps || slideshowsteps();
        if (steps[step].length > 0) {
            const newShownHandle = steps[step][0];
            if (!newShownHandle) {
                return;
            }
            else if ($.videoAutoFullScreen && is_video(M.getNodeByHandle(newShownHandle))) {
                // Autoplay the next/prev video if it's in full screen mode
                $.autoplay = newShownHandle;
            }
            else if (slideshowplay < 0 && !previews[newShownHandle]) {
                if (d) {
                    console.warn('Waiting for %s to have loaded, cur=%s...', newShownHandle, slideshowid, steps);
                }
                slideshowplay = newShownHandle;
                if (!preqs[newShownHandle]) {
                    if (d) {
                        console.error('%s is not being fetched, forcefully doing so... debug & fix..', newShownHandle);
                    }
                    fetchsrc(newShownHandle);
                }
                return;
            }

            mBroadcaster.sendMessage(`slideshow:${dir}`, steps);
            slideshow(newShownHandle);

            if (is_mobile) {
                mobile.appBanner.updateBanner(newShownHandle);
            }
            else if (mega.ui.mInfoPanel) {
                // Rerender info panel when moving to next/previous at slide show.
                mega.ui.mInfoPanel.reRenderIfVisible([newShownHandle]);
            }
        }

        slideshow_timereset();
    }

    function slideshow_next(steps) {
        slideshow_move('next', steps);
    }

    function slideshow_prev(steps) {
        slideshow_move('prev', steps);
    }

    function slideshow_fullscreen($overlay) {
        var $button = $('footer .v-btn.fullscreen', $overlay);

        // Set the video container's fullscreen state
        var setFullscreenData = function(state) {

            if (page === 'download') {
                updateDownloadPageContainer($overlay, state);
                return false;
            }

            if (state) {
                $overlay.addClass('fullscreen').removeClass('browserscreen');
                $('i', $button).removeClass('icon-fullscreen-enter').addClass('icon-fullscreen-leave');
            }
            else {
                $overlay.addClass('browserscreen').removeClass('fullscreen');
                $('i', $button).removeClass('icon-fullscreen-leave').addClass('icon-fullscreen-enter');

                // disable slideshow-mode exiting from full screen
                if (slideshowplay) {
                    slideshow_imgControls(1);
                }
            }

            if (!$overlay.is('.video-theatre-mode')) {
                slideshow_imgPosition($overlay);
            }
        };

        fullScreenManager = FullScreenManager($button, $overlay).change(setFullscreenData);
    }

    function updateDownloadPageContainer($overlay, state) {

        var $button = $('footer .v-btn.fullscreen', $overlay);

        if (state) {
            $overlay.parents('.download.download-page').addClass('fullscreen').removeClass('browserscreen');
            $('i', $button).removeClass('icon-fullscreen-enter').addClass('icon-fullscreen-leave');
            $overlay.addClass('fullscreen').removeClass('browserscreen');
        }
        else {
            $overlay.parents('.download.download-page').removeClass('browserscreen fullscreen');
            $('i', $button).removeClass('icon-fullscreen-leave').addClass('icon-fullscreen-enter');
            $overlay.removeClass('browserscreen fullscreen');
            slideshow_imgPosition($overlay);
        }

        if (!$overlay.is('.video-theatre-mode')) {
            slideshow_imgPosition($overlay);
        }
    }

    function slideshowNodeAttributes(n, $overlay) {
        var $favButton = $('.context-menu .favourite', $overlay);
        const $senBtn = $('.context-menu .set-sensitive', $overlay);
        var root = M.getNodeRoot(n && n.h || false);

        if (!n
            || !n.p
            || root === M.InboxID
            || root === 'shares'
            || self.pfid
            || root === M.RubbishID
            || (M.getNodeByHandle(n.h) && !M.getNodeByHandle(n.h).u && M.getNodeRights(n.p) < 2)
        ) {
            $favButton.addClass('hidden');
            $senBtn.addClass('hidden');
        }
        else {
            $favButton.removeClass('hidden');

            $favButton.rebind('click.mediaviewer', function() {
                var $button = $(this);
                var newFavState = Number(!M.isFavourite(n.h));

                M.favourite(n.h, newFavState);

                if (newFavState) {
                    $('span', $button).text(l[5872]);
                    if (is_video(n)) {
                        $('i', $button).removeClass('icon-favourite')
                            .addClass('icon-heart-broken-small-regular-outline');
                    }
                    else {
                        $('i', $button).removeClass('icon-favourite').addClass('icon-favourite-removed');
                    }
                }
                else {
                    $('span', $button).text(l[5871]);
                    if (is_video(n)) {
                        $('i', $button).removeClass('icon-heart-broken-small-regular-outline')
                            .addClass('icon-favourite');
                    }
                    else {
                        $('i', $button).removeClass('icon-favourite-removed').addClass('icon-favourite');
                    }
                }
            });

            // Change favourite icon
            if (M.isFavourite(n.h)) {
                const icon = is_video(n) ? 'icon-heart-broken-small-regular-outline' : 'icon-favourite-removed';
                $('span', $favButton).text(l[5872]);
                $('i', $favButton).removeClass().addClass(`sprite-fm-mono ${icon}`);
            }
            else {
                $('span', $favButton).text(l[5871]);
                $('i', $favButton).removeClass().addClass('sprite-fm-mono icon-favourite');
            }

            const sen = mega.sensitives.getSensitivityStatus([n.h]);
            if (sen) {
                $senBtn.removeClass('hidden');
                const toHide = sen === 1;
                mega.sensitives.applyMenuItemStyle($senBtn, toHide);

                $senBtn.rebind('click.mediaviewer.sensitive_toggle', () => {
                    mega.sensitives.toggleStatus([n.h], !$senBtn.hasClass('sensitive-added'));
                });
            }
            else {
                $senBtn.addClass('hidden');
            }
        }
    }

    function slideshow_bin(n, $overlay) {
        const $infoButton = $('.v-btn.info', $overlay);
        const $optionButton = $('.v-btn.options', $overlay);
        const $sendToChat = $('.v-btn.send-to-chat', $overlay);
        const root = M.getNodeRoot(n && n.h || false);

        if (root === M.RubbishID) {
            $infoButton.removeClass('hidden');
            $optionButton.addClass('hidden');
            $sendToChat.addClass('hidden');
        }
        else {
            $infoButton.addClass('hidden');

            // Keep the Info panel option hidden on public links (but usable in regular Cloud Drive etc)
            const currentSitePath = getSitePath();
            if (!isPublicLink(currentSitePath)) {
                $optionButton.removeClass('hidden');
            }
        }

    }

    function slideshow_remove(n, $overlay) {

        var $removeButton = $('.context-menu .remove', $overlay);
        const $removeButtonV = $('.v-btn.remove', $overlay);
        var $divider = $removeButton.closest('li').prev('.divider');
        var root = M.getNodeRoot(n && n.h || false);
        const $sendToChatButton = $('.context-menu .send-to-chat', $overlay);

        if (!n || !n.p || root === M.InboxID || (root === 'shares' && M.getNodeRights(n.p) < 2) || self.pfid ||
            (M.getNodeByHandle(n.h) && !M.getNodeByHandle(n.h).u && M.getNodeRights(n.p) < 2) || M.chat) {

            $removeButton.addClass('hidden');
            $removeButtonV.addClass('hidden');
            $divider.addClass('hidden');
        }
        else if (is_mobile) {

            $removeButtonV.rebind('click.mediaviewer', () => {
            // TODO: work on this in view files ticket
            //     // Show the folder/file delete overlay
            //     mobile.deleteOverlay.show(n.h, () => {

                //     // After successful delete, hide the preview slideshow
                //     history.back();
                // });

            //     // Prevent double tap
            //     return false;
            });
        }
        else {
            $removeButton.removeClass('hidden');

            if (root === M.RubbishID) {
                $removeButtonV.removeClass('hidden');
            }
            else {
                $removeButtonV.addClass('hidden');
            }

            $divider.removeClass('hidden');

            const removeFunc = () => {
                if (M.isInvalidUserStatus()) {
                    history.back();
                    return false;
                }

                // Has to exit the full screen mode in order to show remove confirmation diagram
                if ($(document).fullScreen()) {
                    $(document).fullScreen(false);
                }

                fmremove();
                return false;
            };

            $removeButton.rebind('click.mediaviewer', removeFunc);
            $removeButtonV.rebind('click.mediaviewer', removeFunc);
        }

        if (is_video(n)) {
            $removeButton.addClass('mask-color-error');
            $('span', $removeButton).addClass('color-error');
            if (self.fminitialized && !self.pfid && u_type === 3 && M.currentrootid !== M.RubbishID) {
                $sendToChatButton.removeClass('hidden');
                $sendToChatButton.closest('li').prev('.divider').removeClass('hidden');
            }
            else {
                $sendToChatButton.addClass('hidden');
                $sendToChatButton.closest('li').prev('.divider').addClass('hidden');
            }
        }
        else {
            $removeButton.removeClass('mask-color-error');
            $('span', $removeButton).removeClass('color-error');
            $sendToChatButton.addClass('hidden');
            $sendToChatButton.closest('li').prev('.divider').addClass('hidden');
        }
    }

    function slideshow_addToAlbum(n, $overlay) {
        const $addToAlbumButton = $('.context-menu .add-to-album', $overlay);
        const $divider = $addToAlbumButton.closest('li').prev('.divider');

        if (M.getNodeRoot(n.h) === M.RootID && mega.gallery
            && mega.gallery.canShowAddToAlbum() && M.isGalleryNode(n)) {
            $addToAlbumButton.removeClass('hidden');
            $divider.removeClass('hidden');

            $addToAlbumButton.rebind('click.mediaviewer', () => {
                mega.gallery.albums.addToAlbum([n.h]);
            });
        }
        else {
            $addToAlbumButton.addClass('hidden');
            $divider.addClass('hidden');
        }
    }

    function slideshow_node(id, $overlay) {
        var n = M.getNodeByHandle(id);

        if (!n) {
            if (typeof id === 'object') {
                n = new MegaNode(id);
            }
            else if (typeof dl_node !== 'undefined' && dl_node.h === id) {
                n = dl_node;
            }
        }

        if ($overlay) {
            var root = M.getNodeRoot(n && n.h || false);
            var $getLinkBtn = $('.v-btn.getlink', $overlay);

            if (!n
                || !n.p
                || root === 'shares'
                || root === M.RubbishID
                || self.pfid
                || !M.getNodeByHandle(n.h).u && M.getNodeRights(n.p) < 2
            ) {
                $getLinkBtn.addClass('hidden');
            }
            else {

                $getLinkBtn.removeClass('hidden');
                $getLinkBtn.rebind('click.mediaviewer', function() {
                    if ($getLinkBtn.hasClass('disabled')) {
                        return;
                    }

                    $getLinkBtn.addClass('disabled');
                    tSleep(3).then(() => $getLinkBtn.removeClass('disabled'));

                    if (is_mobile) {
                        mobile.linkManagement.showOverlay(n.h);
                    }
                    else {
                        $(document).fullScreen(false);

                        if (u_type === 0) {
                            ephemeralDialog(l[1005]);
                        }
                        else {
                            mega.Share.initCopyrightsDialog([slideshow_handle()]);
                        }
                    }

                    return false;
                });
            }
        }

        return n || false;
    }

    function slideshow_aborttimer() {
        if (slideshowTimer) {
            slideshowTimer.abort();
            slideshowTimer = null;
        }
    }

    function slideshow_timereset() {
        slideshow_aborttimer();

        if (slideshowplay && !slideshowpause) {
            (slideshowTimer = tSleep(mega.slideshow.settings.speed.getValue() / 1e3))
                .then(() => {
                    if (slideshowplay) {
                        slideshowplay = -1;
                        slideshow_next();
                    }
                })
                .catch(dump);

            if (is_mobile) {
                $(window).one('blur.slideshowLoseFocus', () => {
                    slideshow_aborttimer();
                });
            }
        }
    }

    // Inits Image viewer bottom control bar
    function slideshow_imgControls(slideshow_stop, close) {
        var $overlay = $('.media-viewer-container', 'body');
        var $slideshowControls = $('.slideshow-controls', $overlay);
        var $slideshowControlsUpper = $('.slideshow-controls-upper', $overlay);
        var $imageControls = $('.image-controls', $overlay);
        var $viewerTopBar = $('header .viewer-bars', $overlay);
        var $prevNextButtons = $('.gallery-btn', $overlay);
        var $startButton = $('.v-btn.slideshow', $imageControls);
        var $pauseButton = $('.sl-btn.playpause', $slideshowControls);
        var $prevButton = $('.sl-btn.previous', $slideshowControls);
        var $nextButton = $('.sl-btn.next', $slideshowControls);

        if (slideshow_stop) {
            $viewerTopBar.removeClass('hidden');
            $imageControls.removeClass('hidden');
            $prevNextButtons.removeClass('hidden');
            $slideshowControls.addClass('hidden');
            $slideshowControlsUpper.addClass('hidden');
            slideshow_play(false, close);
            slideshowpause = false;
            $pauseButton.attr('data-state', 'pause');
            $('i', $pauseButton).removeClass('icon-play').addClass('icon-pause');

            slideshow_aborttimer();
            $(window).off('blur.slideshowLoseFocus');
            slideshowsteps(); // update x of y counter

            if (M.noSleep) {
                M.noSleep(true).catch(dump);
            }

            return false;
        }

        $imageControls.removeClass('hidden');

        // Bind Slideshow Mode button
        $startButton.rebind('click.mediaviewer', function() {
            if (!slideshowplay || mega.slideshow.settings.manager.hasToUpdateRender(settingsMenu)) {

                // Settings menu initialization
                if (!settingsMenu) {
                    settingsMenu = contextMenu.create({
                        template: $('#media-viewer-settings-menu', $overlay)[0],
                        sibling: $('.sl-btn.settings', $overlay)[0],
                        animationDuration: 150,
                        boundingElement: $overlay[0]
                    });
                }

                // Slideshow initialization
                mega.slideshow.settings.manager.render(settingsMenu, onConfigChange);
                mega.slideshow.manager.setState({nodes: preselection});
            }

            $overlay.addClass('slideshow');
            slideshow_play(true);
            slideshow_timereset();
            $viewerTopBar.addClass('hidden');
            $imageControls.addClass('hidden');
            $slideshowControls.removeClass('hidden');
            $slideshowControlsUpper.removeClass('hidden');
            $prevNextButtons.addClass('hidden');

            if (zoomPan) {
                zoomPan.reset();
            }

            if (M.noSleep) {
                M.noSleep().catch(dump);
            }

            if (is_mobile) {
                eventlog(pfcol ? 500841 : 99835);
                if (is_ios) {
                    // Due to the handling of the onload event with the previous image in iOS,
                    // force the call to img position
                    slideshow_imgPosition();
                }
            }

            // hack to start the slideshow in full screen mode
            if (fullScreenManager) {
                fullScreenManager.enterFullscreen();
            }

            return false;
        });

        // Bind Slideshow Pause button
        $pauseButton.rebind('click.mediaviewer', function() {
            slideshow_toggle_pause($(this));
            return false;
        });

        // Bind Slideshow Prev button
        $prevButton.rebind('click.mediaviewer', function() {
            slideshow_prev();
            return false;
        });

        // Bind Slideshow Next button
        $nextButton.rebind('click.mediaviewer', function() {
            slideshow_next();
            return false;
        });

        $('.v-btn.browserscreen', $overlay).rebind('click.media-viewer', () => {
            $overlay.addClass('browserscreen');
            $overlay.parents('.download.download-page').addClass('browserscreen');
            slideshow_imgPosition($overlay);
            return false;
        });

        // Bind Slideshow Close button
        $('.sl-btn.close', is_mobile ? $slideshowControls : $slideshowControlsUpper).rebind('click.mediaviewer', () => {
            slideshowplay_close();
            if (is_mobile && is_ios) {
                // Due to the handling of the onload event with the previous image in iOS,
                // force the call to img position
                slideshow_imgPosition();
            }
            return false;
        });
    }

    function getWH(id, viewerWidth, viewerHeight, imgWidth, imgHeight) {
        const wp = viewerWidth / origImgWidth;
        const hp = viewerHeight / origImgHeight;

        // Set minHeight, minWidth if image is bigger then browser window
        // Check if height fits browser window after reducing width
        if ((origImgWidth > viewerWidth && origImgHeight * wp <= viewerHeight)
            || (fitToWindow[id] && origImgHeight < viewerHeight
                && origImgWidth < viewerWidth && origImgHeight * wp <= viewerHeight)) {

            imgWidth = viewerWidth;
            imgHeight = origImgHeight * wp;
        }
        // Check if width fits browser window after reducing height
        else if ((origImgWidth > viewerWidth && origImgHeight * wp > viewerHeight)
            || (origImgWidth < viewerWidth && origImgHeight > viewerHeight)
            || (fitToWindow[id] && imgHeight < viewerHeight
                && origImgWidth < viewerWidth && origImgWidth * hp <= viewerWidth)) {

            imgWidth = origImgWidth * hp;
            imgHeight = viewerHeight;
        }
        else {
            imgWidth = origImgWidth;
            imgHeight = origImgHeight;
        }
        return [imgWidth, imgHeight];
    }

    // Sets scale value and image position
    function slideshow_imgPosition($overlay) {
        const $imgWrap = $('.img-wrap', $overlay);
        const $img = $('img.active', $overlay);

        if ($img.length === 0) {
            return false;
        }

        let imgWidth, imgHeight;
        const id = $imgWrap.attr('data-image');
        const viewerWidth = $imgWrap.width();
        const viewerHeight = $imgWrap.height();

        $img.attr('draggable', false);

        if (zoomPan.zoomMode) {
            imgWidth = switchedSides ? $img.height() : $img.width();
            imgHeight = switchedSides ? $img.width() : $img.height();
        }
        else {
            $img.removeAttr('style');

            imgWidth = (switchedSides ? $img.height() : $img.width()) || origImgWidth;
            imgHeight = (switchedSides ? $img.width() : $img.height()) || origImgHeight;

            [imgWidth, imgHeight] = getWH(id, viewerWidth, viewerHeight, imgWidth, imgHeight);

            $img.css({
                'width': switchedSides ? imgHeight : imgWidth
            });

            $img[0].dataset.initScale = imgWidth / origImgWidth * devicePixelRatio;

            // Init zoom and pan
            if (!zoomPan) {
                zoomPan = new MegaZoomPan({
                    domNode: $img[0],
                    slider: !(is_mobile && self.is_transferit) // only for mega desktop
                });
            }
        }

        $img.css({
            'left': (viewerWidth - imgWidth) / 2,
            'top': (viewerHeight - imgHeight) / 2,
        });

        if (is_mobile && mega.ui.viewerOverlay) {
            mega.ui.viewerOverlay.zoom = imgWidth / origImgWidth * devicePixelRatio * 100;
        }
    }

    // Mobile finger gesture
    function slideshow_gesture(h, elm, type) {

        // TODO: change to `!is_touchable` to support desktop touch device
        if (!is_mobile || !is_touchable || !mega.ui.viewerOverlay) {
            return;
        }

        const name = type ? 'iframeGesture' : 'gesture';

        // Lets reset
        if (mega.ui.viewerOverlay[name]) {

            mega.ui.viewerOverlay[name].destroy();
            delete mega.ui.viewerOverlay[name];
        }

        // no node passed means it is closing
        if (!elm) {

            delete mega.ui.viewerOverlay.zoom;

            return;
        }

        let containerSelector;

        if (type) {

            containerSelector = type === 'PDF' ? '#viewerContainer' : 'body';
            elm = elm.contentDocument;
        }
        else {
            containerSelector = is_video(M.getNodeByHandle(h)) ? '.video-block' : '.img-wrap';
            elm = elm.querySelector('.content');
        }

        console.assert(elm, 'Invalid element to initialise slideshow gesture');

        const options = {
            domNode: elm,
            onTouchStart: function() {

                const container = this.domNode.querySelector(containerSelector);
                const style = {
                    top: container.scrollTop,
                    left: container.scrollLeft,
                    width: container.offsetWidth,
                    height: container.offsetHeight
                };

                if (containerSelector === '.img-wrap') {

                    const img = container.querySelector('img.active');
                    const compstyle = img && getComputedStyle(img);

                    if (compstyle && compstyle.position === 'absolute') {

                        style.top = Math.abs(parseInt(compstyle.top));
                        style.left = Math.abs(parseInt(compstyle.left));
                        style.width = parseInt(compstyle.width);
                        style.height = parseInt(compstyle.height);
                    }
                }

                this.onEdge = {
                    top: style.top === 0,
                    right: (style.left + container.offsetWidth) / style.width > 0.999,
                    bottom: (style.top + container.offsetHeight) / style.height > 0.999,
                    left: style.left === 0
                };
            },
            onDragging: function(ev) {
                // Stop tap to be triggered
                ev.stopPropagation();
                return;
            }
        };

        if (name === 'iframeGesture') {
            options.iframeDoc = elm;
        }

        options.onSwipeRight = options.onSwipeLeft = options.onSwipeDown = options.onSwipeUp = ev => {
            ev.preventDefault();
        };

        if (page !== 'download') {

            options.onSwipeRight = function() {

                if (this.onEdge.left) {
                    slideshow_prev();
                }
            };

            options.onSwipeLeft = function() {

                if (this.onEdge.right) {
                    slideshow_next();
                }
            };
        }

        if (!type) {

            options.onPinchZoom = function(ev, mag) {

                mega.ui.viewerOverlay.zoom *= mag;
            };
        }
        else if (type === 'DOCX') {
            options.onPinchZoom = function(ev, mag) {

                const dElm = this.domNode.documentElement;
                const curr = parseFloat(dElm.style.transform.replace(/[^\d.]/g, '')) || 1;

                if (!this.initZoom) {
                    this.initZoom = curr;
                }

                const newVal = Math.max(curr * mag, this.initZoom);

                dElm.style.transform = `scale(${newVal.toFixed(6)})`;
                dElm.classList.add('scaled');
            };
        }

        mega.ui.viewerOverlay[name] = new MegaGesture(options);
    }

    function sendToChatHandler() {
        $(document).fullScreen(false);
        const $wrapper = $('.media-viewer-container', 'body');
        const video = $('video', $wrapper).get(0);
        if (video && !video.paused && !video.ended) {
            video.pause();
        }
        $.noOpenChatFromPreview = true;
        openCopyDialog('conversations');

        mBroadcaster.sendMessage('trk:event', 'preview', 'send-chat');
    }

    // Viewer Init
    // eslint-disable-next-line complexity
    function slideshow(id, close, hideCounter, filteredNodeArr) {
        if (!close && M.isInvalidUserStatus()) {
            return false;
        }

        var $overlay = $('.media-viewer-container', 'body');
        var $content = $('.content', $overlay);
        var $controls = $('footer, header, .gallery-btn', $overlay);
        var $imgWrap = $('.img-wrap', $content);
        const $pendingBlock = $('.viewer-pending', $content);
        var $imageControls = $('.image-controls', $overlay);
        var $zoomSlider = $('.zoom-slider-wrap', $imageControls);
        var $playVideoButton = $('.play-video-button', $content);
        var $video = $('video', $content);
        var $videoControls = $('.video-controls', $overlay);
        var $dlBut = $('.v-btn.download', $overlay);
        var $prevNextButtons = $('.gallery-btn', $content);
        var $document = $(document);
        const $sendToChat = $('.v-btn.send-to-chat', $overlay);
        const $playPauseButton = $('.play-pause-video-button', $content);
        const $watchAgainButton = $('.watch-again-button', $content);

        if (d) {
            console.log('slideshow', id, close, slideshowid);
        }

        if (close) {
            if (window.selectionManager) {

                selectionManager.restoreResetTo();
            }
            sessionStorage.removeItem('previewNode');
            sessionStorage.removeItem('previewTime');
            switchedSides = false;
            slideshowid = false;
            $.videoAutoFullScreen = false;
            _hideCounter = false;
            slideshow_play(false, true);
            preselection = undefined;
            $overlay.removeClass('video video-theatre-mode mouse-idle slideshow fullscreen fullimage')
                .addClass('hidden');
            $playVideoButton.addClass('hidden');
            $watchAgainButton.addClass('hidden');
            $playPauseButton.addClass('hidden');
            $('i', $playPauseButton).removeClass().addClass('sprite-fm-mono icon-play-small-regular-solid');
            $videoControls.addClass('hidden');
            $zoomSlider.attr('data-perc', 100);
            $(window).off('resize.imgResize');
            $document.off('keydown.slideshow mousemove.idle');
            $imgWrap.attr('data-count', '');
            $('img', $imgWrap).attr('src', '').removeAttr('style').removeClass('active');
            $('.v-btn.active', $controls).removeClass('active');
            $('.speed i', $videoControls).removeClass()
                .addClass('sprite-fm-mono icon-playback-1x-small-regular-outline');
            $('.speed', $videoControls).removeClass('margin-2');
            $('.context-menu.playback-speed button i', $videoControls).addClass('hidden');
            $('.context-menu.playback-speed button.1x i', $videoControls).removeClass('hidden');
            $('div.video-subtitles', $content).remove();
            $('.context-menu.subtitles button i', $videoControls).addClass('hidden');
            $('.context-menu.subtitles button.off i', $videoControls).removeClass('hidden');
            $('.subtitles-wrapper', $videoControls).removeClass('hidden');
            $('button.subtitles', $videoControls).removeClass('mask-color-brand');
            $('button.subtitles i', $videoControls).removeClass('icon-subtitles-02-small-regular-solid')
                .addClass('icon-subtitles-02-small-regular-outline');
            if (optionsMenu) {
                contextMenu.close(optionsMenu);
            }
            if (settingsMenu) {
                contextMenu.close(settingsMenu);
            }
            if (fullScreenManager) {
                fullScreenManager.destroy();
                fullScreenManager = null;
            }
            if (zoomPan) {
                zoomPan.destroy();
                zoomPan = false;
            }
            for (const i in self.dl_queue) {
                if (dl_queue[i] && dl_queue[i].id === id) {
                    if (dl_queue[i].preview) {
                        dlmanager.abort(dl_queue[i]);
                    }
                    break;
                }
            }
            for (let i = broadcasts.length; i--;) {
                mBroadcaster.removeListener(broadcasts[i]);
            }
            slideshow_imgControls(1, true);
            mBroadcaster.sendMessage('slideshow:close');
            slideshow_freemem();
            $(window).off('blur.slideshowLoseFocus');
            if (M.noSleep) {
                M.noSleep(true).catch(dump);
            }

            if (is_mobile) {
                if (mega.ui.viewerOverlay) {
                    mega.ui.viewerOverlay.hide();
                }
            }

            if (_pdfSeen) {
                _pdfSeen = false;

                tryCatch(function() {
                    var ev = document.createEvent("HTMLEvents");
                    ev.initEvent("pdfjs-cleanup.meganz", true);
                    document.getElementById('pdfpreviewdiv1').contentDocument.body.dispatchEvent(ev);
                })();
            }
            if (_docxSeen) {
                _docxSeen = false;
                tryCatch(() => {
                    const ev = new Event('docxviewercleanup');
                    document.getElementById('docxpreviewdiv1').contentDocument.dispatchEvent(ev);
                })();
            }

            slideshow_gesture();

            return false;
        }

        var n = slideshow_node(id, $overlay);
        if (!n) {
            return;
        }

        // Checking if this the first preview (not a preview navigation)
        if (!slideshowid) {
            // then pushing fake states of history/hash
            if (page !== 'download' && (!history.state || history.state.view !== id)) {
                pushHistoryState();

                if (n.p && !self.pfid && M.getNodeRoot(n.p) !== M.RubbishID && mega.ui.searchbar) {
                    onIdle(() => mega.ui.searchbar.recentlyOpened.addFile(id, false));
                }
            }
            _hideCounter = !d && hideCounter;
        }

        slideshowid = n.ch || n.h;
        if (window.selectionManager) {
            selectionManager.wantResetTo(n.h);
        }
        else {
            $.selected = [n.h];
        }
        mBroadcaster.sendMessage('slideshow:open', n);

        if (page !== 'download') {
            tryCatch(() => sessionStorage.setItem('previewNode', id))();
            pushHistoryState(true, Object.assign({subpage: page}, history.state, {view: slideshowid}));
        }

        // Clear previousy set data
        switchedSides = false;
        $('header .file-name', $overlay).text(n.name);
        $('header .file-size', $overlay).text(bytesToSize(n.s || 0));
        $('.viewer-error, #pdfpreviewdiv1, #docxpreviewdiv1', $overlay).addClass('hidden');
        $('.viewer-progress', $overlay).addClass('vo-hidden');

        if (!is_mobile) {
            $imageControls.addClass('hidden');
        }
        $zoomSlider.addClass('hidden');
        $prevNextButtons.addClass('hidden');
        $playVideoButton.addClass('hidden');
        $watchAgainButton.addClass('hidden');
        $playPauseButton.addClass('hidden');
        $('i', $playPauseButton).removeClass().addClass('sprite-fm-mono icon-play-small-regular-solid');
        $('.viewer-progress p, .video-time-bar', $content).removeAttr('style');

        if (!slideshowplay) {
            $('img', $imgWrap).removeClass('active');
        }

        // Clear video file data
        $video.css('background-image', '').removeAttr('poster src').addClass('hidden');
        $videoControls.addClass('hidden');
        $('.video-time-bar', $videoControls).removeAttr('style');
        $('.video-progress-bar', $videoControls).removeAttr('title');
        $('.video-timing', $videoControls).text('');
        $('.speed i', $videoControls).removeClass()
            .addClass('sprite-fm-mono icon-playback-1x-small-regular-outline');
        $('.speed', $videoControls).removeClass('margin-2');
        $('.context-menu.playback-speed button i', $videoControls).addClass('hidden');
        $('.context-menu.playback-speed button.1x i', $videoControls).removeClass('hidden');
        $('div.video-subtitles', $content).remove();
        $('.context-menu.subtitles button i', $videoControls).addClass('hidden');
        $('.context-menu.subtitles button.off i', $videoControls).removeClass('hidden');
        $('.subtitles-wrapper', $videoControls).removeClass('hidden');
        $('button.subtitles', $videoControls).removeClass('mask-color-brand');
        $('button.subtitles i', $videoControls).removeClass('icon-subtitles-02-small-regular-solid')
            .addClass('icon-subtitles-02-small-regular-outline');

        // Clear zoomPan data
        if (zoomPan) {
            zoomPan.destroy();
            zoomPan = false;
        }

        // Init full screen icon and related data attributes
        if ($document.fullScreen()) {
            $('.v-btn.fullscreen i', $imageControls)
                .addClass('icon-fullscreen-leave')
                .removeClass('icon-fullscreen-enter');

            $content.attr('data-fullscreen', 'true');
            $('.v-btn.fs', $videoControls).addClass('cancel-fullscreen').removeClass('go-fullscreen');
            $('.v-btn.fs i', $videoControls).removeClass()
                .addClass('sprite-fm-mono icon-minimize-02-small-regular-outline');
            $('.fs-wrapper .tooltip', $videoControls).text(l.video_player_exit_fullscreen);
        }
        else {
            $('.v-btn.fullscreen i', $imageControls)
                .removeClass('icon-fullscreen-leave')
                .addClass('icon-fullscreen-enter');

            $content.attr('data-fullscreen', 'false');
            $('.v-btn.fs', $videoControls).removeClass('cancel-fullscreen').addClass('go-fullscreen');
            $('.v-btn.fs i', $videoControls).removeClass()
                .addClass('sprite-fm-mono icon-maximize-02-small-regular-outline');
            $('.fs-wrapper .tooltip', $videoControls).text(l.video_player_fullscreen);
        }

        // Options context menu
        if (!optionsMenu && self.contextMenu) {
            optionsMenu = contextMenu.create({
                template: $('#media-viewer-options-menu', $overlay)[0],
                sibling: $('.v-btn.options', $overlay)[0],
                animationDuration: 150,
                boundingElement: $overlay[0]
            });
        }

        // Bind static events is viewer is not in slideshow mode to avoid unnecessary rebinds
        if (!slideshowplay) {
            $overlay.removeClass('fullscreen browserscreen mouse-idle slideshow video pdf docx');

            // Bind keydown events
            $document.rebind('keydown.slideshow', function(e) {
                const isDownloadPage = page === 'download';

                if (e.keyCode === 37 && slideshowid && !e.altKey && !e.ctrlKey && !isDownloadPage) {
                    mBroadcaster.sendMessage('trk:event', 'preview', 'arrow-key', this, self.slideshowid);
                    slideshow_prev();
                }
                else if (e.keyCode === 39 && slideshowid && !isDownloadPage) {
                    mBroadcaster.sendMessage('trk:event', 'preview', 'arrow-key', this, self.slideshowid);
                    slideshow_next();
                }
                else if (e.keyCode === 46 && fullScreenManager) {
                    fullScreenManager.exitFullscreen();
                }
                else if (e.keyCode === 27 && slideshowid && !$document.fullScreen()) {
                    mBroadcaster.sendMessage('trk:event', 'preview', 'close-btn', this, self.slideshowid);

                    if ($.dialog) {
                        closeDialog($.dialog);
                    }
                    else if ($.msgDialog) {
                        closeMsg();

                        if ($.warningCallback) {
                            $.warningCallback(false);
                            $.warningCallback = null;
                        }
                    }
                    else if (slideshowplay) {
                        slideshow_imgControls(1);
                    }
                    else if (isDownloadPage) {
                        $overlay.removeClass('fullscreen browserscreen');
                        $overlay.parents('.download.download-page').removeClass('fullscreen browserscreen');
                        slideshow_imgPosition($overlay);
                    }
                    else {
                        history.back();
                        return false;
                    }
                }
                else if ((e.keyCode === 8 || e.key === 'Backspace') && !isDownloadPage && !$.copyDialog
                        && !$.dialog && !$.msgDialog && mega.ui.mInfoPanel && !mega.ui.mInfoPanel.isOpen()) {
                    history.back();
                    return false;
                }
            });

            // Close icon
            $('.v-btn.close, .viewer-error-close', $overlay).rebind('click.media-viewer', function() {
                mBroadcaster.sendMessage('trk:event', 'preview', 'close-btn', this, self.slideshowid);

                if (page === 'download') {
                    if ($(document).fullScreen()) {
                        fullScreenManager.exitFullscreen();
                    }
                    $overlay.removeClass('fullscreen browserscreen');
                    $overlay.parents('.download.download-page').removeClass('fullscreen browserscreen');
                    if (is_mobile && zoomPan) {
                        zoomPan.destroy();
                        zoomPan = false;
                    }
                    slideshow_imgPosition($overlay);
                    return false;
                }
                history.back();
                if (mega.ui.mInfoPanel) {
                    mega.ui.mInfoPanel.hide();
                }
                return false;
            });

            $('.js-close-slideshow', $overlay).rebind('click.media-viewer', () => {
                slideshow(self.slideshowid, true);
            });

            // Keep the Info panel option hidden on public links (but usable in regular Cloud Drive etc)
            const currentSitePath = getSitePath();
            if (isPublicLink(currentSitePath)) {
                $('.v-btn.options', $overlay).addClass('hidden');
            }

            // Properties icon
            $('.context-menu .info, .v-btn.info', $overlay).rebind('click.media-viewer', () => {
                $document.fullScreen(false);
                // Use original ID to render info from chats
                mega.ui.mInfoPanel.show([slideshowid]);
                return false;
            });

            if (is_mobile) {

                $('.img-wrap', $overlay).rebind('tap.media-viewer', () => {

                    if (slideshowplay) {
                        return;
                    }

                    $overlay.toggleClass('fullimage');

                    slideshow_imgPosition($overlay);

                    // if (mega.flags.ab_ads) {
                        mega.commercials.updateOverlays();
                    // }

                    return false;
                });

                $('.go-fullscreen', $overlay).rebind('click.media-viewer', () => {
                    if (ua.details.os === "iPad") {
                        // iPad does not allow fullscreen mode for now
                        // therefore, we do not modify the header and imageControls
                        // since otherwise, we will not be able to revoke this action.
                        return;
                    }
                    if ($document.fullScreen()) {
                        $('header', $overlay).removeClass('hidden');
                        $imageControls.removeClass('hidden');
                    }
                    else {
                        $('header', $overlay).addClass('hidden');
                        $imageControls.addClass('hidden');
                    }
                });
            }
            else if (self.contextMenu) {
                // Options icon
                $('.v-btn.options, .sl-btn.settings', $overlay).rebind('click.media-viewer-settings', function() {
                    var $this = $(this);
                    const menu = $this.hasClass('settings') ? settingsMenu : optionsMenu;

                    if ($(this).hasClass('hidden')) {
                        return false;
                    }
                    if ($this.hasClass('active')) {
                        $this.removeClass('active deactivated');
                        if (menu === settingsMenu) {
                            $('i', $this).removeClass('icon-slider-filled').addClass('icon-slider-outline');
                        }
                        contextMenu.close(menu);
                        $overlay.removeClass('context-menu-open');
                    }
                    else {
                        $this.addClass('active deactivated').trigger('simpletipClose');
                        if (menu === settingsMenu) {
                            $('i', $this).removeClass('icon-slider-outline').addClass('icon-slider-filled');
                        }
                        // xxx: no, this is not a window.open() call..
                        // eslint-disable-next-line local-rules/open
                        contextMenu.open(menu);
                        $overlay.addClass('context-menu-open');
                    }
                    return false;
                });

                if (self.fminitialized && !self.pfid
                    && self.u_type === 3 && M.currentrootid !== M.RubbishID && !is_video(n)) {

                    $sendToChat.removeClass('hidden');
                }
                else if (is_video(n)) {
                    $sendToChat.addClass('hidden');
                }

                $sendToChat.rebind('click.media-viewer', () => {
                    if (megaChatIsReady) {
                        sendToChatHandler();
                    }
                    else {
                        showToast('send-chat', l[17794]);
                        mBroadcaster.once('chat_initialized', () => sendToChatHandler());
                    }
                });

                $('.context-menu .send-to-chat', $overlay).rebind('click.media-viewer', () => {
                    $sendToChat.trigger('click.media-viewer');
                });

                // Close context menu
                $overlay.rebind('mouseup.media-viewer', (e) => {
                    const $target = $(e.target);
                    if ($target.parent().is('.v-btn.options, .sl-btn.settings')) {
                        // leave the click-handler dealing with it.
                        return;
                    }

                    $('.v-btn.options', $overlay).removeClass('active deactivated');
                    contextMenu.close(optionsMenu);

                    if (!$(e.target).parents('.slideshow-context-settings').length) {
                        const $settingsButton = $('.sl-btn.settings', $overlay);
                        $settingsButton.removeClass('active deactivated');
                        $('i', $settingsButton).removeClass('icon-slider-filled');
                        $('i', $settingsButton).addClass('icon-slider-outline');
                        contextMenu.close(settingsMenu);
                        $overlay.removeClass('context-menu-open');
                    }
                });
            }

            // Favourite and Sensitive icons
            slideshowNodeAttributes(n, $overlay);

            // Remove Icon
            slideshow_remove(n, $overlay);

            // Add to album icon
            slideshow_addToAlbum(n, $overlay);

            if (filteredNodeArr && Array.isArray(filteredNodeArr)) {
                preselection = filteredNodeArr;
            }

            // Icons for rubbish bin
            slideshow_bin(n, $overlay);

            // Previous/Next viewer buttons
            const steps = slideshowsteps();

            if (M.chat) {
                const {pos, len} = steps;

                if (pos + 6 > len || pos - 4 < 0) {
                    if (len < 2) {
                        $.triggerSlideShow = slideshowid;
                    }

                    queueMicrotask(() => megaChat.retrieveSharedFilesHistory().catch(dump));
                }
            }

            if (steps.backward.length) {
                $prevNextButtons.filter('.previous').removeClass('hidden opacity-50').removeAttr('disabled');
            }
            if (steps.forward.length) {
                $prevNextButtons.filter('.next').removeClass('hidden opacity-50').removeAttr('disabled');
            }

            $prevNextButtons.rebind('click.mediaviewer', function() {

                if (!this.classList.contains('hidden') && M.v.length > 1) {
                    const steps = slideshowsteps();

                    if (this.classList.contains('previous')) {

                        if (steps.backward.length) {

                            slideshow_prev(steps);
                        }
                    }
                    else if (this.classList.contains('next') && steps.forward.length) {

                        slideshow_next(steps);
                    }
                }

                return false;
            });

            const idleAction = is_mobile ? 'touchstart' : 'mousemove';

            delay.cancel(MOUSE_IDLE_TID);
            $document.off(`${idleAction}.idle`);
            $controls.off('mousemove.idle');

            // Slideshow Mode Init
            if (is_image3(n)) {
                slideshow_imgControls();

                // Autohide controls
                (function _() {
                    $overlay.removeClass('mouse-idle');
                    delay(MOUSE_IDLE_TID, () => $overlay.addClass('mouse-idle'), 2e3);
                    $document.rebind(`${idleAction}.idle`, _);
                })();

                if (!is_mobile) {
                    $controls.rebind('mousemove.idle', () => {
                        onIdle(() => {
                            delay.cancel(MOUSE_IDLE_TID);
                        });
                    });
                }

                if (fullScreenManager && fullScreenManager.state) {
                    $('.viewer-bars', $overlay).noTransition(() => {
                        $overlay.addClass('fullscreen');
                    });
                }

                if (!fullScreenManager) {
                    slideshow_fullscreen($overlay);
                }
            }
        }

        $dlBut.rebind('click.media-viewer', function _dlButClick() {

            if (this.classList && this.classList.contains('disabled')) {
                return false;
            }

            var p = previews[n && n.h];

            if (p && p.full && Object(p.buffer).byteLength) {
                M.saveAs(p.buffer, n.name)
                    .catch((ex) => {
                        if (d) {
                            console.debug(ex);
                        }
                        p.full = p.buffer = false;
                        _dlButClick.call(this);
                    });
                return false;
            }

            if (is_mobile) {
                mobile.downloadOverlay.showOverlay(n.h);
                return false;
            }

            for (var i = dl_queue.length; i--;) {
                if (dl_queue[i] && dl_queue[i].id === slideshow_handle() && dl_queue[i].preview) {
                    dl_queue[i].preview = false;
                    M.openTransfersPanel();
                    return;
                }
            }

            if (self.pfcol) {
                tryCatch(() => eventlog(M.isGalleryVideo(n) ? 99972 : 99973))();
            }

            // TODO: adapt the above code to work on the downloads page if we need to download the original
            if (page === 'download') {
                $('button.download-file').click();
            }
            else if (M.d[slideshow_handle()]) {
                M.addDownload([slideshow_handle()]);
            }
            else {
                M.addDownload([n]);
            }

            return false;
        });

        $('.js-download-t-file').rebind('click.media-viewer', () => {
            if (n.xh) {
                window.open(T.core.getDownloadLink(n), '_blank', 'noopener,noreferrer');
            }
            return false;
        });

        if ((n.p || M.chat || page === 'download') && M.getNodeRoot(n.p) !== M.RubbishID) {
            $dlBut.removeClass('hidden');
        }
        else {
            $dlBut.addClass('hidden');
        }

        if (previews[n.h]) {
            if (previews[n.h].fromChat) {
                previews[n.h].fromChat = null;

                if (previews[n.h].full) {
                    previewimg(n.h, previews[n.h].buffer);
                }
                else {
                    fetchsrc(n);
                }
            }
            else {
                previewsrc(n.h);
            }

            fetchnext();
        }
        else {
            if (is_video(n)) {
                $('img', $imgWrap).attr('src', '');
                $('.loader-grad', $content).removeClass('hidden');
            }
            else if (slideshowplay !== true) {
                $('img', $imgWrap).attr('src', '');
                $pendingBlock.removeClass('hidden');
            }

            if (!preqs[n.h]) {
                fetchsrc(n);
            }
        }

        $overlay.removeClass('hidden');

        if (mega.ui.viewerOverlay) {
            mega.ui.viewerOverlay.show(id);
        }
    }

    function slideshow_toggle_pause($button) {
        if ($button.attr('data-state') === 'pause') {
            $button.attr('data-state', 'play');
            $('i', $button).removeClass('icon-pause').addClass('icon-play');
            slideshowpause = true;
        }
        else {
            $button.attr('data-state', 'pause');
            $('i', $button).removeClass('icon-play').addClass('icon-pause');
            slideshowpause = false;
        }

        slideshow_timereset();
    }

    function slideshow_play(isPlayMode, isAbortFetch) {
        if (mega.slideshow.manager) {
            mega.slideshow.manager.setState({
                currentNodeId: slideshowid,
                isPlayMode,
                isAbortFetch,
                isNotBuildPlaylist: !isPlayMode && !slideshowplay
            });
        }
        slideshowplay = isPlayMode;
    }

    function slideshowplay_close() {
        slideshow_imgControls(1, true);

        // hack to also stop fullscreen
        if (fullScreenManager) {
            fullScreenManager.exitFullscreen();
        }
    }

    function fetchnext() {
        var n = M.getNodeByHandle(slideshowsteps().forward[0]);

        if (String(n.fa).indexOf(':1*') > -1 && !preqs[n.h]) {

            if (!previews[n.h] || previews[n.h].fromChat) {

                if (previews[n.h]) {
                    previews[n.h].fromChat = null;
                }

                fetchsrc(n.h);
            }
        }
    }

    function fetchsrc(id) {
        var n = slideshow_node(id);
        if (!n) {
            console.error('Node "%s" not found...', id);
            return false;
        }

        var eot = function eot(h, err) {
            delete preqs[h];
            delete pfails[h];
            if (n.s > 13e7 || !M.addDownload) {
                return previewimg(h, null);
            }
            M.addDownload([h], false, err ? -1 : true);
        };
        eot.timeout = 8500;

        var preview = function preview(ctx, h, u8) {
            previewimg(h, u8, ctx.type);

            if (isThumbnailMissing(n)) {
                createNodeThumbnail(n, u8);
            }
            if (h === slideshow_handle()) {
                fetchnext();
            }
            delete pfails[h];
        };


        if (d) {
            console.debug('slideshow.fetchsrc', id, n, n.h);
        }

        if (['pdf', 'docx'].includes(fileext(n.name))) {
            if (!preqs[n.h]) {
                preqs[n.h] = 1;

                const ext = fileext(n.name);
                M.gfsfetch(n.link || n.h, 0, -1).then((data) => {
                    const type = ext === 'pdf' ? 'application/pdf' : extmime.docx;

                    preview({ type }, n.h, data.buffer);

                }).catch((ex) => {
                    if (d) {
                        console.warn(`Failed to retrieve ${ext}, failing back to broken eye image...`, ex);
                    }

                    previewimg(n.h, null);
                    delete previews[n.h].buffer;
                    preqs[n.h] = 0; // to retry again
                    if (ex === EOVERQUOTA || Object(ex.target).status === 509) {
                        dlmanager.setUserFlags();
                        dlmanager.showOverQuotaDialog();
                    }
                });
            }
            return false;
        }

        if (is_video(n) || is_audio(n)) {
            if (!preqs[n.h]) {
                preqs[n.h] = 1;

                if (String(n.fa).indexOf(':1*') > 0) {
                    getImage(n, 1)
                        .then(uri => {
                            if (previews[n.h]) {
                                previews[n.h].poster = uri;
                            }
                            return uri;
                        })
                        .dump('preload.poster.' + n.h);
                }

                M.require('videostream').then(() => {
                    if (preqs[n.h]) {
                        previewimg(n.h, Array(26).join('x'), filemime(n, 'video/mp4'));
                    }
                }).catch(tell);
            }
            return false;
        }

        if (pfails[n.h]) {
            // for slideshow_next/prev
            if (slideshow_handle() === n.h) {
                return eot(n.h, 1);
            }
            delete pfails[n.h];
        }

        preqs[n.h] = 1;
        const maxSize = parseInt(localStorage.maxPrvOrigSize) || 50;
        var loadOriginal = n.s < maxSize * 1048576 && is_image(n) === 1;
        var loadPreview = !loadOriginal || !slideshowplay && n.s > 1048576;
        var onPreviewError = loadOriginal ? previewimg.bind(window, n.h, null) : eot;
        var getPreview = api_getfileattr.bind(window, {[n.h]: n}, 1, preview, onPreviewError);

        if (d) {
            console.debug('slideshow.fetchsrc(%s), preview=%s original=%s', id, loadPreview, loadOriginal, n, n.h);
        }

        var isCached = previews[n.h] && previews[n.h].buffer && !slideshowplay;
        if (isCached) {
            // e.g. hackpatch for chat who already loaded the preview...
            if (n.s > 1048576) {
                loadPreview = true;
                getPreview = preview.bind(null, false, n.h, previews[n.h].buffer);
            }
            else {
                loadPreview = false;
                preview(false, n.h, previews[n.h].buffer);
            }
        }

        if (loadOriginal) {
            var $overlay = $('.media-viewer-container');
            var $progressBar = $('.viewer-progress', $overlay);

            var progress = function(perc) {
                var loadingDeg = 360 * perc / 100;

                if (slideshow_handle() !== n.h) {
                    if (d && ((perc | 0) % 10) < 1) {
                        console.debug('slideshow original image loading in background progress...', n.h, perc);
                    }
                    return;
                }
                $progressBar.removeClass('vo-hidden');

                if (loadingDeg <= 180) {
                    $('.right-c p', $progressBar).css('transform', 'rotate(' + loadingDeg + 'deg)');
                    $('.left-c p', $progressBar).removeAttr('style');
                }
                else {
                    $('.right-c p', $progressBar).css('transform', 'rotate(180deg)');
                    $('.left-c p', $progressBar).css('transform', 'rotate(' + (loadingDeg - 180) + 'deg)');
                }

                if (loadingDeg === 360) {
                    $progressBar.addClass('vo-hidden');
                    $('p', $progressBar).removeAttr('style');
                }
            };

            M.gfsfetch(n.link || n.h, 0, -1, progress).then((data) => {
                preview({type: filemime(n, 'image/jpeg')}, n.h, data.buffer);
                if (!exifImageRotation.fromImage) {
                    previews[n.h].orientation = parseInt(EXIF.readFromArrayBuffer(data, true).Orientation) || 1;
                }
            }).catch((ex) => {
                if (ex === EOVERQUOTA || Object(ex.target).status === 509) {
                    eventlog(99703, true);
                }

                if (d) {
                    console.debug('slideshow failed to load original %s', n.h, ex.target && ex.target.status || ex);
                }

                if (slideshow_handle() === n.h) {
                    $progressBar.addClass('vo-hidden');
                }

                if (!(loadPreview || isCached)) {
                    getPreview();
                }

                slideshow_timereset();
            });
        }

        if (loadPreview) {
            if (loadOriginal) {
                fitToWindow[n.h] = 1;
            }
            getPreview();
        }
    }

    // start streaming a video file
    function slideshow_videostream(id, $overlay) {
        if (!$overlay || !$overlay.length) {
            $overlay = $('video:visible').closest('.media-viewer');
        }
        var n = slideshow_node(id, $overlay);
        var $content = $('.content', $overlay);
        const autoPlay = $.autoplay === id;
        const $pendingBlock = $('.loader-grad', $content);
        var $video = $('video', $content);
        var $playVideoButton = $('.play-video-button', $content);
        let bgsize = 'auto';

        if (is_audio(n)) {
            bgsize = 'contain';
        }
        else {
            if (previews[id].fma === undefined) {
                previews[id].fma = MediaAttribute(n).data || false;
            }

            if (previews[id].fma.width > previews[id].fma.height) {
                bgsize = 'cover';
            }
        }

        $playVideoButton.rebind('click', function() {
            if (dlmanager.isOverQuota) {
                return dlmanager.showOverQuotaDialog();
            }

            var destroy = function() {
                $pendingBlock.addClass('hidden').end().trigger('video-destroy');

                if (preqs[n.h] && preqs[n.h] instanceof Streamer) {
                    mBroadcaster.removeListener(preqs[n.h].ev1);
                    mBroadcaster.removeListener(preqs[n.h].ev2);
                    mBroadcaster.removeListener(preqs[n.h].ev3);
                    mBroadcaster.removeListener(preqs[n.h].ev4);

                    preqs[n.h].kill();
                    preqs[n.h] = false;
                }

                sessionStorage.removeItem('previewNode');
                sessionStorage.removeItem('previewTime');
            };

            // Show loading spinner until video is playing
            $pendingBlock.removeClass('hidden');
            $('.video-controls', $overlay).removeClass('hidden');
            $overlay.addClass('video-theatre-mode');

            // Hide play button.
            $(this).addClass('hidden');
            $('.video-controls .playpause i', $overlay).removeClass('icon-play').addClass('icon-pause');

            if (is_mobile) {
                requestAnimationFrame(() => mega.initMobileVideoControlsToggle($overlay));
            }

            initVideoStream(n, $overlay, destroy).done(streamer => {
                preqs[n.h] = streamer;
                preqs[n.h].options.uclk = !autoPlay;

                preqs[n.h].ev1 = mBroadcaster.addListener('slideshow:next', destroy);
                preqs[n.h].ev2 = mBroadcaster.addListener('slideshow:prev', destroy);
                preqs[n.h].ev3 = mBroadcaster.addListener('slideshow:open', destroy);
                preqs[n.h].ev4 = mBroadcaster.addListener('slideshow:close', destroy);

                // If video is playing
                preqs[n.h].on('playing', function() {
                    var video = this.video;

                    if (video && video.duration) {

                        if (isThumbnailMissing(n) && is_video(n) === 1 && n.u === u_handle && n.f !== u_handle) {
                            var took = Math.round(2 * video.duration / 100);

                            if (d) {
                                console.debug('Video thumbnail missing, will take image at %s...',
                                    secondsToTime(took));
                            }

                            this.on('timeupdate', function() {
                                if (video.currentTime < took) {
                                    return true;
                                }

                                this.getImage().then(createNodeThumbnail.bind(null, n))
                                    .catch(console.warn.bind(console));
                            });
                        }

                        return false;
                    }

                    return true;
                });
            }).catch(console.warn.bind(console));
        });

        $overlay.addClass('video');
        $video.attr('controls', false).removeClass('hidden');
        $playVideoButton.removeClass('hidden');
        $pendingBlock.addClass('hidden');
        $('.img-wrap', $content).addClass('hidden');
        $content.removeClass('hidden');
        $('.viewer-pending', $content).addClass('hidden');

        if (n.name) {
            var c = MediaAttribute.getCodecStrings(n);
            if (c) {
                $('header .file-name', $overlay).attr('title', c);
            }
        }

        if (previews[id].poster !== undefined) {
            // $video.attr('poster', previews[id].poster);
            $video.css('background-size', bgsize);
            $video.css('background-image', `url(${previews[id].poster})`);
        }
        else if (String(n.fa).indexOf(':1*') > 0) {
            getImage(n, 1).then(function(uri) {

                previews[id].poster = uri;

                if (id === slideshow_handle()) {
                    if ($video.length && !$video[0].parentNode) {
                        // The video element got already destroyed/replaced due an error
                        $video = $('.content video', $overlay);
                    }

                    // $video.attr('poster', uri);
                    $video.css('background-size', bgsize);
                    $video.css('background-image', `url(${uri})`);
                }
            }).catch(console.debug.bind(console));
        }

        previews[id].poster = previews[id].poster || '';

        if ($.autoplay === id) {
            queueMicrotask(() => {
                $playVideoButton.trigger('click');
            });
            delete $.autoplay;
        }
    }

    function isThumbnailMissing(n) {
        return !M.chat && (!n.fa || !n.fa.includes(':0*')) && M.shouldCreateThumbnail(n.p);
    }

    function createNodeThumbnail(n, ab) {
        if (isThumbnailMissing(n)) {
            if (d) {
                console.log('Thumbnail found missing on preview, creating...', n.h, n);
            }
            var aes = new sjcl.cipher.aes([
                n.k[0] ^ n.k[4],
                n.k[1] ^ n.k[5],
                n.k[2] ^ n.k[6],
                n.k[3] ^ n.k[7]
            ]);
            var img = is_image(n);
            var vid = is_video(n);
            createnodethumbnail(n.h, aes, n.h, ab, {raw: img !== 1 && img, isVideo: vid});
        }
    }

    const require = async(html, js, ...other) => {
        const files = [html, ...other];

        if (!self.is_extension) {
            files.push(...js);
        }
        await M.require(...files);

        const map = require.map[html];
        html = translate(pages[html]);

        for (let [k, v] of map) {
            v = self.is_extension && js.includes(v) ? bootstaticpath + jsl2[v].f : window[v];

            assert(!!v, `${l[16]}, ${k}`);

            html = html.replace(k, v);
        }

        return html;
    };
    lazy(require, 'map', () => {
        return freeze({
            pdfviewer: new Map([
                ['viewer.js', 'pdfviewerjs'],
                ['viewer.css', 'pdfviewercss'],
                ['../build/pdf.js', 'pdfjs2']
            ]),
            docxviewer: new Map([
                ['docx.js', 'docxviewer_js'],
                ['viewer.css', 'docxviewercss'],
                ['docx-preview.js', 'docxpreview_js']
            ])
        });
    });

    // a method to fetch scripts and files needed to run pdfviewer
    // and then excute them on iframe element [#pdfpreviewdiv1]
    function prepareAndViewPdfViewer(data) {
        const signal = tryCatch(() => {
            const elm = document.getElementById('pdfpreviewdiv1');
            elm.classList.remove('hidden');

            const ev = document.createEvent("HTMLEvents");
            ev.initEvent("pdfjs-openfile.meganz", true);
            ev.data = data.buffer || data.src;
            elm.contentDocument.body.dispatchEvent(ev);
            slideshow_gesture(data.h, elm, 'PDF');
            return true;
        });

        if (_pdfSeen) {

            if (signal()) {
                return;
            }
        }

        require('pdfviewer', ['pdfjs2', 'pdfviewerjs'], 'pdfviewercss').then((myPage) => {
            const id = 'pdfpreviewdiv1';
            const pdfIframe = document.getElementById(id);
            const newPdfIframe = document.createElement('iframe');
            newPdfIframe.id = id;
            newPdfIframe.src = 'about:blank';

            if (pdfIframe) {

                // replace existing iframe to avoid History changes [push]
                pdfIframe.parentNode.replaceChild(newPdfIframe, pdfIframe);
            }
            else {
                // making pdf iframe for initial start
                const p = document.querySelector('.pdf .media-viewer .content');

                if (p) {
                    p.appendChild(newPdfIframe);
                }
            }

            var doc = newPdfIframe.contentWindow.document;
            doc.open();
            doc.write(myPage);
            doc.addEventListener('pdfjs-webViewerInitialized.meganz', function ack() {
                doc.removeEventListener('pdfjs-webViewerInitialized.meganz', ack);
                queueMicrotask(signal);
            });
            doc.close();
            _pdfSeen = true;
        }).catch(tell);
    }

    function prepareAndViewDocxViewer(data) {
        const signal = tryCatch(() => {
            const elem = document.getElementById('docxpreviewdiv1');
            elem.classList.remove('hidden');
            const ev = new Event('docxviewerload');
            ev.data = {
                blob: data.blob
            };
            elem.contentDocument.dispatchEvent(ev);
            slideshow_gesture(data.h, elem, 'DOCX');
        });

        if (_docxSeen) {
            signal();
            return;
        }

        require('docxviewer', ['docxpreview_js', 'docxviewer_js'], 'docxviewercss').then((myPage) => {
            const id = 'docxpreviewdiv1';
            const iframe = document.getElementById(id);
            const newIframe = document.createElement('iframe');
            newIframe.id = id;
            newIframe.src = 'about:blank';

            if (iframe) {

                // replace existing iframe to avoid History changes [push]
                iframe.parentNode.replaceChild(newIframe, iframe);
            }
            else {
                // making docx iframe for initial start
                const p = document.querySelector('.docx .media-viewer .content');

                if (p) {
                    p.appendChild(newIframe);
                }
            }

            const doc = newIframe.contentWindow.document;
            // eslint-disable-next-line local-rules/open
            doc.open();
            doc.write(myPage);
            doc.addEventListener('docxviewerready', function ready() {
                doc.removeEventListener('docxviewerready', ready);
                queueMicrotask(signal);
            });
            doc.addEventListener('docxviewererror', (ev) => {
                const { data } = ev;
                let errBody = '';
                if (data.error === -1) {
                    errBody = l.preview_failed_support;
                }
                else if (data.error === -2) {
                    errBody = l.preview_failed_temp;
                }
                msgDialog('error', '', l.preview_failed_title, errBody);
            });
            doc.close();
            _docxSeen = true;
        }).catch(tell);
    }

    function previewsrc(id) {
        var $overlay = $('.media-viewer-container', 'body');
        var $content = $('.content', $overlay);
        var $imgWrap = $('.img-wrap', $content);
        var $bottomBar = $('footer', $overlay);
        var $pendingBlock = $('.viewer-pending', $content);
        var $progressBlock = $('.viewer-progress', $content);

        var src = Object(previews[id]).src;
        if (!src) {
            console.error('Cannot preview %s', id);
            return;
        }

        var type = typeof previews[id].type === 'string' && previews[id].type || 'image/jpeg';
        mBroadcaster.sendMessage.apply(mBroadcaster, ['trk:event', 'preview'].concat(type.split('/')));

        $overlay.removeClass('pdf video video-theatre-mode');
        $('embed', $content).addClass('hidden');
        $('video', $content).addClass('hidden');
        $imgWrap.removeClass('hidden');
        $('#pdfpreviewdiv1, #docxpreviewdiv1', $content).addClass('hidden');
        $bottomBar.removeClass('hidden');

        if (previews[id].type === 'application/pdf') {
            $overlay.addClass('pdf');
            $pendingBlock.addClass('hidden');
            $progressBlock.addClass('vo-hidden');
            if (!is_mobile) {
                $bottomBar.addClass('hidden');
            }
            $imgWrap.addClass('hidden');
            // preview pdfs using pdfjs for all browsers #8036
            // to fix pdf compatibility - Bug #7796
            prepareAndViewPdfViewer(previews[id]);
            eventlog(99660);
            return;
        }
        if (previews[id].type === extmime.docx) {
            $overlay.addClass('docx');
            $pendingBlock.addClass('hidden');
            $progressBlock.addClass('vo-hidden');
            if (!is_mobile) {
                $bottomBar.addClass('hidden');
            }
            $imgWrap.addClass('hidden');
            prepareAndViewDocxViewer(previews[id]);
            eventlog(99819);
            return;
        }

        tryCatch(() => slideshow_gesture(previews[id].h, $overlay[0]), self.reportError)();

        const isVideoStream = /^(?:audio|video)\//i.test(previews[id].type);

        if (self.pfcol) {
            eventlog(isVideoStream ? 99970 : 99971);
        }

        if (isVideoStream) {
            return slideshow_videostream(id, $overlay);
        }

        // Choose img to set src for Slideshow transition effect
        var imgClass = $imgWrap.attr('data-count') === 'img1' ? 'img2' : 'img1';
        var replacement = false;

        if ($imgWrap.attr('data-image') === id) {
            replacement = $imgWrap.attr('data-count');
            if (replacement) {
                imgClass = replacement;

                if (d) {
                    console.debug('Replacing preview image with original', id, imgClass);
                }
            }
        }

        var img = new Image();
        img.onload = img.onerror = function(ev) {
            if (id !== slideshow_handle()) {
                if (d) {
                    console.debug('Moved to another image, not displaying %s...', id);
                }
                return;
            }
            var src1 = this.src;
            var $img = $('.' + imgClass, $imgWrap);
            var rot = previews[id].orientation | 0;

            if (slideshowplay) {
                if (previews[id].full
                    || previews[id].ffailed
                    || ev.type === 'error'
                    || is_image(M.getNodeByHandle(slideshowid)) !== 1) {

                    slideshow_timereset();
                }
            }

            if (ev.type === 'error') {
                src1 = noThumbURI;
                if (!replacement) {
                    // noThumbURI is a 240pt svg image over a 320pt container...
                    origImgWidth = origImgHeight = 320;
                }

                if (d) {
                    console.debug('slideshow failed to preview image...', id, src, previews[id].prev, ev);
                }

                // Restore last good preview
                if (previews[id].prev) {
                    URL.revokeObjectURL(previews[id].src);
                    previews[id] = previews[id].prev;
                    delete previews[id].prev;
                    previews[id].ffailed = 1;
                    this.src = previews[id].src;
                    return;
                }
            }
            else {
                switchedSides = rot > 4;

                if (switchedSides) {
                    origImgWidth = this.naturalHeight;
                    origImgHeight = this.naturalWidth;
                }
                else {
                    origImgWidth = this.naturalWidth;
                    origImgHeight = this.naturalHeight;
                }

                if (d) {
                    console.debug('slideshow loaded image %s:%sx%s, ' +
                        'orientation=%s', id, origImgWidth, origImgHeight, rot);
                }

                if (previews[id].fromChat !== undefined) {
                    replacement = false;
                }
            }

            // Apply img data to necessary image. If replacing preview->original,
            // update only the img's src and percent-label, to preserve any zoomed status.
            if (!replacement || switchedSides) {
                if (ua.details.engine === 'Gecko') {
                    // Prevent an issue where some previous images are shown moving to next
                    $('.img-wrap img', $overlay).attr('src', '');
                }
                $('img', $imgWrap).removeClass('active');
                $imgWrap.attr('data-count', imgClass);
                $imgWrap.attr('data-image', id);
                $img.attr('src', src1).one('load', () => {
                    $img.addClass('active');
                    slideshow_imgPosition($overlay);
                });

                if (previews[id].brokenEye) {
                    $img.addClass('broken-eye');
                }

                $(window).rebind('resize.imgResize', function() {
                    slideshow_imgPosition($overlay);
                });
            }
            else if (src1 !== noThumbURI) {
                $img.attr('src', src1).addClass('active');

                if ($img.hasClass('broken-eye')) {
                    $img.addClass('vo-hidden').removeClass('broken-eye');
                }

                // adjust zoom percent label
                onIdle(() => {
                    slideshow_imgPosition($overlay);
                    $img.removeClass('vo-hidden');
                });
            }

            // Apply exit orientation
            $img.removeClassWith('exif-rotation-').addClass('exif-rotation-' + rot).attr('data-exif', rot);

            $pendingBlock.addClass('hidden');
            $progressBlock.addClass('vo-hidden');
        };

        if (slideshowplay) {
            slideshow_aborttimer();
        }

        img.src = src;
    }

    function previewimg(id, uint8arr, type) {
        var blob;
        var n = M.getNodeByHandle(id);
        var brokenEye = false;

        if (uint8arr === null) {
            if (d) {
                console.debug('Using broken-eye image for %s...', id);
            }

            var svg = decodeURIComponent(noThumbURI.substr(noThumbURI.indexOf(',') + 1));
            var u8 = new Uint8Array(svg.length);
            for (var i = svg.length; i--;) {
                u8[i] = svg.charCodeAt(i);
            }
            uint8arr = u8;
            type = 'image/svg+xml';
            brokenEye = true;
        }

        type = typeof type === 'string' && type || 'image/jpeg';

        try {
            blob = new Blob([uint8arr], {type: type});
        }
        catch (ex) {
        }
        if (!blob || blob.size < 25) {
            blob = new Blob([uint8arr.buffer], {type: type});
        }

        const processFullPreview = () => {
            if (
                slideshowplay === id
                || (M.chat && typeof slideshowplay === 'string' && slideshowplay.split('!')[1] === id)
            ) {
                if (d) {
                    console.warn('Dispatching slideshow-play for %s...', id);
                }

                slideshow_next();
            }
            else if (id === slideshow_handle()) {
                previewsrc(id);
            }
        };

        if (previews[id]) {
            if (previews[id].full) {
                if (d && previews[id].fromChat !== null) {
                    console.warn('Not overwriting a full preview...', id);
                }
                processFullPreview();
                return;
            }
            previews[id].prev = previews[id];
        }

        if (d) {
            console.debug('slideshow.previewimg', id, previews[id]);
        }

        previews[id] = Object.assign(Object.create(null), previews[id], {
            h: id,
            blob: blob,
            type: type,
            time: Date.now(),
            src: myURL.createObjectURL(blob),
            buffer: uint8arr.buffer || uint8arr,
            full: n.s === blob.size,
            brokenEye: brokenEye
        });

        if (n.hash) {
            // cache previews by hash to reuse them in the chat
            previews[id].hash = n.hash;
            previews[n.hash] = previews[id];
        }

        processFullPreview();

        // Ensure we are not eating too much memory...
        tSleep.schedule(7, slideshow_freemem);
    }

    function slideshow_freemem() {
        var i;
        var k;
        var size = 0;
        var now = Date.now();
        var slideshowid = slideshow_handle();
        var entries = array.unique(Object.values(previews));

        for (i = entries.length; i--;) {
            k = entries[i];
            size += k.buffer && k.buffer.byteLength || 0;
        }

        if (d) {
            console.debug('Previews cache is using %s of memory...', bytesToSize(size));
        }
        const limit = is_mobile ? 100 : 450;

        if (size > limit * 1048576) {
            size = 0;

            for (i = entries.length; i--;) {
                var p = entries[i];

                if (p.h === slideshowid || !p.buffer || (now - p.time) < 2e4) {
                    continue;
                }
                k = p.h;

                size += p.buffer.byteLength;
                p.buffer = p.full = preqs[k] = false;

                if (p.prev) {
                    previews[k] = p.prev;
                    delete p.prev;
                }

                if (p.type.startsWith('image') || p.type === 'application/pdf') {
                    URL.revokeObjectURL(p.src);
                    if (previews[k] === p) {
                        previews[k] = false;
                    }
                }

                if (!previews[k] && p.hash) {
                    previews[p.hash] = false;
                }
            }

            if (d) {
                console.debug('...freed %s', bytesToSize(size));
            }
        }
    }


    /**
     * @global
     */
    global.slideshow = slideshow;
    global.slideshow_next = slideshow_next;
    global.slideshow_prev = slideshow_prev;
    global.slideshow_handle = slideshow_handle;
    global.slideshow_steps = slideshowsteps;
    global.previewsrc = previewsrc;
    global.previewimg = previewimg;
    global.slideshowNodeAttributes = slideshowNodeAttributes;

})(self);
