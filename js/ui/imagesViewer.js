var previews = Object.create(null);
var preqs = Object.create(null);
var pfails = Object.create(null);
var slideshowid;

(function _imageViewerSlideShow(global) {
    "use strict";

    var zoom_mode;
    var origImgWidth;
    var slideshowplay;
    var slideshowpause;
    var origImgHeight;
    var slideshowTimer;
    var mouseIdleTimer;
    var fullScreenManager;
    var _hideCounter = false;
    var switchedSides = false;
    var fitToWindow = Object.create(null);
    var _pdfSeen = false;
    var optionsMenu;
    var preselection;

    function slideshow_handle(raw) {
        var result;

        if (slideshowid) {
            result = raw ? slideshowid : slideshowid.slice(-8);
        }
        return result || false;
    }

    function slideshowsteps() {
        var $overlay = $('.media-viewer-container', 'body');
        var $controls = $('gallery-btn', $overlay);
        var $counter = $('header .counter', $overlay);
        var $slideshowButton = $('footer .v-btn.slideshow', $overlay);
        var forward = [];
        var backward = [];
        var ii = [];
        var ci;
        var filter = function(n) {
            return is_image2(n) || is_video(n);
        };
        var index = function(i) {
            return M.v[i].h;
        };

        if (slideshowplay) {
            filter = function(n) {
                return n.s && is_image3(n);
            };
        }

        if (M.chat) {
            index = function(i) {
                return M.v[i].ch;
            };
        }

        if (preselection) {
            index = function(i) {
                return preselection[i].h;
            };
            filter = () => {
                // This should already filtered at this point
                return true;
            };
        }

        const sArr = preselection ? preselection : M.v;
        // Loop through available items and extract images
        for (var i = 0, m = sArr.length; i < m; i++) {
            if (filter(sArr[i])) {
                // is currently previewed item
                if (index(i) === slideshowid) {
                    ci = i;
                }
                ii.push(i);
            }
        }

        var len = ii.length;
        // If there is at least 2 images
        if (len > 1) {
            var n = ii.indexOf(ci);
            switch (n) {
                // last
                case len - 1:
                    forward.push(index(ii[0]));
                    backward.push(index(ii[n - 1]));
                    break;
                // first
                case 0:
                    forward.push(index(ii[n + 1]));
                    backward.push(index(ii[len - 1]));
                    break;
                case -1:
                    break;
                default:
                    forward.push(index(ii[n + 1]));
                    backward.push(index(ii[n - 1]));
            }
            $('.first', $counter).text(n + 1);
            $('.last', $counter).text(len);
        }

        if (_hideCounter) {
            $counter.addClass('hidden');
        }
        else {
            $counter.removeClass('hidden');
        }
        if (len < 2) {
            $counter.addClass('hidden');
            $controls.addClass('hidden');
            $slideshowButton.addClass('hidden');
        }
        else {
            $controls.removeClass('hidden');
            $slideshowButton.removeClass('hidden');
        }
        return {backward: backward, forward: forward};
    }

    function slideshow_move(dir) {
        var valid = true;
        var h = slideshow_handle();
        var step = dir === 'next' ? 'forward' : 'backward';
        $.videoAutoFullScreen = $(document).fullScreen();

        $.each(dl_queue || [], function(id, file) {
            if (file.id === h && file.preview) {
                valid = false;
                return false;
            }
        });
        if (!valid) {
            return;
        }
        var steps = slideshowsteps();
        if (steps[step].length > 0) {
            const newShownHandle = steps[step][0];
            if ($.videoAutoFullScreen && is_video(M.getNodeByHandle(newShownHandle))) {
                // Autoplay the next/prev video if it's in full screen mode
                $.autoplay = newShownHandle;
            }

            mBroadcaster.sendMessage('slideshow:' + dir, steps);
            slideshow(newShownHandle);
        }
    }

    function slideshow_next() {
        slideshow_move('next');
    }

    function slideshow_prev() {
        slideshow_move('prev');
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

    function slideshow_favourite(n, $overlay) {
        var $favButton = $('.context-menu .favourite', $overlay);
        var root = M.getNodeRoot(n && n.h || false);

        if (!n || !n.p || root === 'shares' && M.getNodeRights(n.p) < 2 ||
            folderlink || root === M.RubbishID ||
            (M.getNodeByHandle(n.h) && !M.getNodeByHandle(n.h).u && M.getNodeRights(n.p) < 2)) {

            $favButton.addClass('hidden');
        }
        else {
            $favButton.removeClass('hidden');

            $favButton.rebind('click.mediaviewer', function() {
                var $button = $(this);
                var newFavState = Number(!M.isFavourite(n.h));

                M.favourite(n.h, newFavState);

                if (newFavState) {
                    $('span', $button).text(l[5872]);
                    $('i', $button).removeClass('icon-favourite').addClass('icon-favourite-removed');
                }
                else {
                    $('span', $button).text(l[5871]);
                    $('i', $button).removeClass('icon-favourite-removed').addClass('icon-favourite');
                }
            });

            // Change favourite icon
            if (M.isFavourite(n.h)) {
                $('span', $favButton).text(l[5872]);
                $('i', $favButton).removeClass('icon-favourite').addClass('icon-favourite-removed');
            }
            else {
                $('span', $favButton).text(l[5871]);
                $('i', $favButton).removeClass('icon-favourite-removed').addClass('icon-favourite');
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
            $optionButton.removeClass('hidden');
        }

    }

    function slideshow_remove(n, $overlay) {

        var $removeButton = $('.context-menu .remove', $overlay);
        const $removeButtonV = $('.v-btn.remove', $overlay);
        var $divider = $removeButton.closest('li').prev('.divider');
        var root = M.getNodeRoot(n && n.h || false);

        if (!n || !n.p || (root === 'shares' && M.getNodeRights(n.p) < 2) || folderlink ||
            (M.getNodeByHandle(n.h) && !M.getNodeByHandle(n.h).u && M.getNodeRights(n.p) < 2) || M.chat) {

            $removeButton.addClass('hidden');
            $removeButtonV.addClass('hidden');
            $divider.addClass('hidden');
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

            if (!n || !n.p || root === 'shares' || root === M.RubbishID ||
                (!folderlink && M.getNodeByHandle(n.h) && !M.getNodeByHandle(n.h).u &&
                 M.getNodeRights(n.p) < 2)) {

                $getLinkBtn.addClass('hidden');
            }
            else {

                $getLinkBtn.removeClass('hidden');
                $getLinkBtn.rebind('click.mediaviewer', function() {
                    $(document).fullScreen(false);

                    if (u_type === 0) {
                        ephemeralDialog(l[1005]);
                    }
                    else {
                        mega.Share.initCopyrightsDialog([slideshow_handle()]);
                    }

                    return false;
                });
            }
        }

        return n || false;
    }

    function slideshow_timereset() {
        if (slideshowplay && !slideshowpause) {
            clearTimeout(slideshowTimer);
            slideshowTimer = setTimeout(slideshow_next, 4000);
        }
    }

    function slideshow_zoomSlider(value = 100) {
        const container = document.querySelector('.media-viewer-container');
        const wrapper = container && container.querySelector('.zoom-slider-wrap');
        const $elm = $('.zoom-slider', wrapper);
        const setValue = tryCatch(() => {
            wrapper.dataset.perc = value;
            $elm.slider('value', value);
        });

        if (!wrapper) {
            if (d) {
                console.error('zoom-slider-wrap not found.');
            }
            return;
        }

        if ($elm.slider('instance')) {
            // Update existing slider.
            return setValue();
        }

        // Init zoom slider
        $elm.slider({
            min: 1,
            max: 1000,
            range: 'min',
            step: 0.01,
            change: function(e, ui) {
                $('.ui-slider-handle .mv-zoom-slider', this).text(formatPercentage(ui.value / 100));
                wrapper.dataset.perc = ui.value;
            },
            slide: function(e, ui) {
                $('.ui-slider-handle .mv-zoom-slider', this).text(formatPercentage(ui.value / 100));
                slideshow_zoom(container, false, ui.value);
            },
            create: () => {
                setValue();
                $('.ui-slider-handle', $elm).safeAppend(
                    `<div class="mv-zoom-slider dark-direct-tooltip"></div>
                    <i class="mv-zoom-slider-arrow sprite-fm-mono icon-tooltip-arrow"></i>`
                );
            }
        });
    }

    // Inits Image viewer bottom control bar
    function slideshow_imgControls(slideshow_stop) {
        var $overlay = $('.media-viewer-container', 'body');
        var $slideshowControls = $('.slideshow-controls', $overlay);
        var $imageControls = $('.image-controls', $overlay);
        var $viewerTopBar = $('header .viewer-bars', $overlay);
        var $prevNextButtons = $('.gallery-btn', $overlay);
        var $startButton = $('.v-btn.slideshow', $imageControls);
        var $pauseButton = $('.sl-btn.playpause', $slideshowControls);
        var $prevButton = $('.sl-btn.previous', $slideshowControls);
        var $nextButton = $('.sl-btn.next', $slideshowControls);
        var $zoomInButton = $('.v-btn.zoom-in', $imageControls);
        var $zoomOutButton = $('.v-btn.zoom-out', $imageControls);

        if (slideshow_stop) {
            $viewerTopBar.removeClass('hidden');
            $prevNextButtons.removeClass('hidden');
            $imageControls.removeClass('hidden');
            $slideshowControls.addClass('hidden');
            $overlay.removeClass('slideshow').off('mousewheel.imgzoom');
            slideshowplay = false;
            slideshowpause = false;
            $pauseButton.attr('data-state', 'pause');
            $('i', $pauseButton).removeClass('icon-play').addClass('icon-pause');

            clearTimeout(slideshowTimer);
            slideshowsteps(); // update x of y counter

            return false;
        }

        $imageControls.removeClass('hidden');

        // Bind Slideshow Mode button
        $startButton.rebind('click.mediaviewer', function() {
            $overlay.addClass('slideshow');
            slideshowplay = true;
            slideshow_timereset();
            $viewerTopBar.addClass('hidden');
            $imageControls.addClass('hidden');
            $slideshowControls.removeClass('hidden');
            $prevNextButtons.addClass('hidden');
            zoom_mode = false;

            // hack to start the slideshow in full screen mode
            if (fullScreenManager) {
                fullScreenManager.enterFullscreen();
            }

            return false;
        });

        // Bind Slideshow Pause button
        $pauseButton.rebind('click.mediaviewer', function() {
            var $this = $(this);

            clearTimeout(slideshowTimer);
            if ($(this).attr('data-state') === 'pause') {
                $this.attr('data-state', 'play');
                $('i', $this).removeClass('icon-pause').addClass('icon-play');
                slideshowpause = true;
            }
            else {
                $this.attr('data-state', 'pause');
                $('i', $this).removeClass('icon-play').addClass('icon-pause');
                slideshowTimer = setTimeout(slideshow_next, 4000);
                slideshowpause = false;
            }
            return false;
        });

        // Bind Slideshow Prev button
        $prevButton.rebind('click.mediaviewer', function() {
            slideshow_prev();
            slideshow_timereset();
            return false;
        });

        // Bind Slideshow Next button
        $nextButton.rebind('click.mediaviewer', function() {
            slideshow_next();
            slideshow_timereset();
            return false;
        });

        $('.v-btn.browserscreen', $overlay).rebind('click.media-viewer', () => {
            $overlay.addClass('browserscreen');
            $overlay.parents('.download.download-page').addClass('browserscreen');
            slideshow_imgPosition($overlay);
            return false;
        });

        // Bind ZoomIn button
        $zoomInButton.rebind('click.mediaviewer', function() {
            slideshow_zoom($overlay);
            return false;
        });

        // Bind ZoomOut button
        $zoomOutButton.rebind('click.mediaviewer', function() {
            slideshow_zoom($overlay, 1);
            return false;
        });

        // Allow mouse wheel to zoom in/out
        $('.media-viewer', $overlay).rebind('mousewheel.imgzoom', function(e) {
            var delta = Math.max(-1, Math.min(1, (e.wheelDelta || e.deltaY || -e.detail)));

            if (delta > 0) {
                $zoomInButton.trigger('click.mediaviewer');
            }
            else {
                $zoomOutButton.trigger('click.mediaviewer');
            }
            return false;
        });

        // Bind Slideshow Close button
        $('.sl-btn.close', $slideshowControls).rebind('click.mediaviewer', function() {
            slideshow_imgControls(1);

            // hack to also stop fullscreen
            if (fullScreenManager) {
                fullScreenManager.exitFullscreen();
            }
            return false;
        });
    }

    // Inits Pick and pan mode if image doesn't fit into the container
    function slideshow_pickpan($overlay, close) {
        var $imgWrap = $('.img-wrap', $overlay);
        var $img = $('img.active', $imgWrap);
        var wrapWidth = $imgWrap.outerWidth();
        var wrapHeight = $imgWrap.outerHeight();
        var imgWidth = switchedSides ? $img.height() : $img.width();
        var imgHeight = switchedSides ? $img.width() : $img.height();
        var dragStart = 0;
        var lastPos = {x: null, y: null};

        if (close) {
            $imgWrap.off('mousedown.pickpan');
            $imgWrap.off('mouseup.pickpan mouseout.pickpan');
            $imgWrap.off('mousemove.pickpan');
            return false;
        }

        // Get cursor last position before dragging
        $imgWrap.rebind('mousedown.pickpan', function(event) {
            dragStart = 1;
            lastPos = {x: event.pageX, y: event.pageY};
            $(this).addClass('picked');
            return false;
        });

        // Stop dragging
        $imgWrap.rebind('mouseup.pickpan mouseout.pickpan', function() {
            dragStart = 0;
            $(this).removeClass('picked');
            return false;
        });

        // Drag image if it doesn't fit into the container
        $imgWrap.rebind('mousemove.pickpan', function(event) {
            if (dragStart) {
                var currentPos = {x: event.pageX, y: event.pageY};
                var changeX = currentPos.x - lastPos.x;
                var changeY = currentPos.y - lastPos.y;

                /* Save mouse position */
                lastPos = currentPos;

                var imgTop = $img.position().top;
                var imgLeft = $img.position().left;
                var imgTopNew = imgTop + changeY;
                var imgLeftNew = imgLeft + changeX;

                // Check if top and left do not fall outside the image
                if (wrapHeight >= imgHeight) {
                    imgTopNew = (wrapHeight - imgHeight) / 2;
                }
                else if (imgTopNew > 0) {
                    imgTopNew = 0;
                }
                else if (imgTopNew < (wrapHeight - imgHeight)) {
                    imgTopNew = wrapHeight - imgHeight;
                }
                if (wrapWidth >= imgWidth) {
                    imgLeftNew = (wrapWidth - imgWidth) / 2;
                }
                else if (imgLeftNew > 0) {
                    imgLeftNew = 0;
                }
                else if (imgLeftNew < (wrapWidth - imgWidth)) {
                    imgLeftNew = wrapWidth - imgWidth;
                }

                $img.css({
                    'left': imgLeftNew + 'px',
                    'top': imgTopNew + 'px'
                });

                return false;
            }
        });
    }

    // Zoom In/Out function
    function slideshow_zoom($overlay, zoomout, value) {
        const $img = $('.img-wrap img.active', $overlay);
        const $percLabel = $('.zoom-slider-wrap', $overlay);
        let newPerc = parseFloat($percLabel.attr('data-perc')) || 1;
        let newImgWidth;
        let zoomStep;

        if (value) {
            newPerc = parseFloat(value);
        }
        else if (zoomout) {
            zoomStep = (newPerc * 0.9).toFixed(2);
            newPerc = zoomStep >= 1 ? zoomStep : 1;
        }
        else if (!zoomout) {
            zoomStep = (newPerc * 1.2).toFixed(2);
            newPerc = zoomStep <= 1000 ? zoomStep : 1000;
            console.log(newPerc);
        }

        newPerc /= devicePixelRatio * 100;
        newImgWidth = origImgWidth * newPerc;

        $img.css({
            'width': switchedSides ? newImgHeight : newImgWidth
        });

        zoom_mode = true;

        // Set zoom, position values and init pick and pan
        slideshow_imgPosition($overlay);
    }

    // Sets zoom percents and image position
    function slideshow_imgPosition($overlay) {
        const $imgWrap = $('.img-wrap', $overlay);
        const $img = $('img.active', $overlay);
        const id = $imgWrap.attr('data-image');
        const viewerWidth = $imgWrap.width();
        const viewerHeight = $imgWrap.height();
        let imgWidth = 0;
        let imgHeight = 0;
        let w_perc = 0;
        let h_perc = 0;
        let newImgWidth = 0;

        if (zoom_mode) {
            imgWidth = switchedSides ? $img.height() : $img.width();
            imgHeight = switchedSides ? $img.width() : $img.height();

            // Init pick and pan mode if Image larger its wrapper
            if (imgWidth > viewerWidth || imgHeight > viewerHeight) {
                slideshow_pickpan($overlay);
            }
            else {
                slideshow_pickpan($overlay, 1);
            }
        }
        else {
            w_perc = viewerWidth / origImgWidth;
            h_perc = viewerHeight / origImgHeight;
            $img.removeAttr('style');
            imgWidth = (switchedSides ? $img.height() : $img.width()) || origImgWidth;
            imgHeight = (switchedSides ? $img.width() : $img.height()) || origImgHeight;

            // Set minHeight, minWidth if image is bigger then browser window
            // Check if height fits browser window after reducing width
            if (origImgWidth > viewerWidth && origImgHeight * w_perc <= viewerHeight) {
                imgWidth = viewerWidth;
                imgHeight = origImgHeight * w_perc;
                newImgWidth = switchedSides ? imgHeight : imgWidth;
            }
            // Check if width fits browser window after reducing height
            else if ((origImgWidth > viewerWidth && origImgHeight * w_perc > viewerHeight)
                || (origImgWidth < viewerWidth && origImgHeight > viewerHeight)) {

                imgWidth = origImgWidth * h_perc;
                imgHeight = viewerHeight;
                newImgWidth = switchedSides ? imgHeight : imgWidth;
            }
            // Check if preview and original imgs are loading and height fits browser window after increasing width
            else if (fitToWindow[id] && origImgHeight < viewerHeight
                && origImgWidth < viewerWidth && origImgHeight * w_perc <= viewerHeight) {

                imgWidth = viewerWidth;
                imgHeight = origImgHeight * w_perc;
                newImgWidth = switchedSides ? imgHeight : imgWidth;
            }
            // Check if preview and original imgs are loading and width fits browser window after increasing height
            else if (fitToWindow[id] && imgHeight < viewerHeight
                && origImgWidth < viewerWidth && origImgWidth * h_perc <= viewerWidth) {

                imgWidth = origImgWidth * h_perc;
                imgHeight = viewerHeight;
                newImgWidth = switchedSides ? imgHeight : imgWidth;
            }
            else {
                newImgWidth = switchedSides ? origImgHeight : origImgWidth;
            }

            $img.css({
                'width': newImgWidth
            });
        }

        $img.css({
            'left': (viewerWidth - imgWidth) / 2,
            'top': (viewerHeight - imgHeight) / 2,
        });
        slideshow_zoomSlider(imgWidth / origImgWidth * 100 * devicePixelRatio);
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
    }

    // Viewer Init
    // eslint-disable-next-line complexity
    function slideshow(id, close, hideCounter, filteredNodeArr) {
        if (!close && M.isInvalidUserStatus()) {
            return;
        }

        var $overlay = $('.media-viewer-container', 'body');
        var $content = $('.content', $overlay);
        var $controls = $('footer, header, .gallery-btn', $overlay);
        var $imgWrap = $('.img-wrap', $content);
        var $imageControls = $('.image-controls', $overlay);
        var $zoomSlider = $('.zoom-slider-wrap', $imageControls);
        var $playVideoButton = $('.play-video-button', $content);
        var $video = $('video', $content);
        var $videoControls = $('.video-controls', $overlay);
        var $dlBut = $('.v-btn.download', $overlay);
        var $prevNextButtons = $('.gallery-btn', $content);
        var $document = $(document);
        const $sendToChat = $('.v-btn.send-to-chat', $overlay);

        if (d) {
            console.log('slideshow', id, close, slideshowid);
        }

        if (close) {
            sessionStorage.removeItem('previewNode');
            sessionStorage.removeItem('previewTime');
            zoom_mode = false;
            switchedSides = false;
            slideshowid = false;
            $.videoAutoFullScreen = false;
            _hideCounter = false;
            slideshowplay = false;
            preselection = undefined;
            $overlay.removeClass('video video-theatre-mode mouse-idle slideshow fullscreen')
                .addClass('hidden');
            $playVideoButton.addClass('hidden');
            $videoControls.addClass('hidden');
            $zoomSlider.attr('data-perc', 100);
            $(window).off('resize.imgResize');
            $document.off('keydown.slideshow mousemove.idle');
            $imgWrap.attr('data-count', '');
            $('img', $imgWrap).attr('src', '').removeAttr('style').removeClass('active');
            $('.v-btn.active', $controls).removeClass('active');
            if (optionsMenu) {
                contextMenu.close(optionsMenu);
            }
            if (fullScreenManager) {
                fullScreenManager.destroy();
                fullScreenManager = null;
            }
            for (var i in dl_queue) {
                if (dl_queue[i] && dl_queue[i].id === id) {
                    if (dl_queue[i].preview) {
                        dlmanager.abort(dl_queue[i]);
                    }
                    break;
                }
            }
            slideshow_imgControls(1);
            mBroadcaster.sendMessage('slideshow:close');
            slideshow_freemem();

            if (_pdfSeen) {
                _pdfSeen = false;

                tryCatch(function() {
                    var ev = document.createEvent("HTMLEvents");
                    ev.initEvent("pdfjs-cleanup.meganz", true);
                    document.getElementById('pdfpreviewdiv1').contentDocument.body.dispatchEvent(ev);
                })();
            }

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
            }
            _hideCounter = hideCounter;
        }

        slideshowid = n.ch || n.h;
        if (window.selectionManager) {
            selectionManager.resetTo(n.h);
        }
        else {
            $.selected = [n.h];
        }
        mBroadcaster.sendMessage('slideshow:open', n);

        if (page !== 'download') {
            sessionStorage.setItem('previewNode', id);
            pushHistoryState(true, Object.assign({subpage: page}, history.state, {view: slideshowid}));
        }

        // Clear previousy set data
        zoom_mode = false;
        switchedSides = false;
        $('header .file-name', $overlay).text(n.name);
        $('.viewer-error, video, #pdfpreviewdiv1', $overlay).addClass('hidden');
        $('.viewer-progress', $overlay).addClass('vo-hidden');

        $imageControls.addClass('hidden');
        $prevNextButtons.addClass('hidden');
        $playVideoButton.addClass('hidden');
        $('.viewer-progress p, .video-time-bar', $content).removeAttr('style');

        // Clear video file data
        $video.css('background-image', ``).removeAttr('poster src').addClass('hidden');
        $videoControls.addClass('hidden');
        $('.video-time-bar', $videoControls).removeAttr('style');
        $('.video-progress-bar', $videoControls).removeAttr('title');
        $('.video-timing', $videoControls).text('');

        // Init full screen icon and related data attributes
        if ($document.fullScreen()) {
            $('.v-btn.fullscreen i', $imageControls)
                .addClass('icon-fullscreen-leave')
                .removeClass('icon-fullscreen-enter');

            $content.attr('data-fullscreen', 'true');
            $('.v-btn.fs', $videoControls).addClass('cancel-fullscreen').removeClass('go-fullscreen');
            $('.v-btn.fs i', $videoControls).addClass('icon-fullscreen-leave').removeClass('icon-fullscreen-enter');
        }
        else {
            $('.v-btn.fullscreen i', $imageControls)
                .removeClass('icon-fullscreen-leave')
                .addClass('icon-fullscreen-enter');

            $content.attr('data-fullscreen', 'false');
            $('.v-btn.fs', $videoControls).removeClass('cancel-fullscreen').addClass('go-fullscreen');
            $('.v-btn.fs i', $videoControls).removeClass('icon-fullscreen-leave').addClass('icon-fullscreen-enter');
        }

        // Turn off pick and pan mode
        slideshow_pickpan($overlay, 1);

        // Options context menu
        if (!optionsMenu) {
            optionsMenu = contextMenu.create({
                template: $('#media-viewer-options-menu', $overlay)[0],
                sibling: $('.v-btn.options', $overlay)[0],
                animationDuration: 150,
                boundingElement: $overlay[0]
            });
        }

        // Bind static events is viewer is not in slideshow mode to avoid unnecessary rebinds
        if (!slideshowplay) {
            $overlay.removeClass('fullscreen browserscreen mouse-idle slideshow video pdf');

            // Bind keydown events
            $document.rebind('keydown.slideshow', function(e) {
                const isDownloadPage = page === 'download';

                if (e.keyCode === 37 && slideshowid && !e.altKey && !e.ctrlKey && !isDownloadPage) {
                    slideshow_prev();
                }
                else if (e.keyCode === 39 && slideshowid && !isDownloadPage) {
                    slideshow_next();
                }
                else if (e.keyCode === 46 && fullScreenManager) {
                    fullScreenManager.exitFullscreen();
                }
                else if (e.keyCode === 27 && slideshowid && !$document.fullScreen()) {
                    if ($.dialog) {
                        closeDialog($.dialog);
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
                else if ((e.keyCode === 8 || e.key === 'Backspace') && !isDownloadPage && !$.copyDialog) {
                    history.back();
                    return false;
                }
            });

            // Close icon
            $('.v-btn.close, .viewer-error-close', $overlay).rebind('click.media-viewer', function() {
                if (page === 'download') {
                    if ($(document).fullScreen()) {
                        fullScreenManager.exitFullscreen();
                    }
                    $overlay.removeClass('fullscreen browserscreen');
                    $overlay.parents('.download.download-page').removeClass('fullscreen browserscreen');
                    slideshow_imgPosition($overlay);
                    return false;
                }
                history.back();
                return false;
            });

            // Properties icon
            $('.context-menu .info, .v-btn.info', $overlay).rebind('click.media-viewer', () => {
                $document.fullScreen(false);
                propertiesDialog();
                return false;
            });

            // Options icon
            $('.v-btn.options', $overlay).rebind('click.media-viewer', function() {
                var $this = $(this);

                if ($(this).hasClass('hidden')) {
                    return false;
                }
                if ($this.hasClass('active')) {
                    $this.removeClass('active deactivated');
                    contextMenu.close(optionsMenu);
                }
                else {
                    $this.addClass('active deactivated').trigger('simpletipClose');
                    contextMenu.open(optionsMenu);
                }
                return false;
            });

            if (fminitialized && !folderlink && u_type === 3 && M.currentrootid !== M.RubbishID) {
                $sendToChat.removeClass('hidden');
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

            // Close context menu
            $overlay.rebind('mouseup.media-viewer', function() {

                $('.v-btn.options', $overlay).removeClass('active deactivated');
                contextMenu.close(optionsMenu);
            });

            // Favourite Icon
            slideshow_favourite(n, $overlay);

            // Remove Icon
            slideshow_remove(n, $overlay);
            if (filteredNodeArr && Array.isArray(filteredNodeArr)) {
                preselection = filteredNodeArr;
            }

            // Icons for rubbish bin
            slideshow_bin(n, $overlay);

            // Previous/Next viewer buttons
            var steps = slideshowsteps();

            if (steps.backward.length > 0) {
                $prevNextButtons.filter('.previous').removeClass('hidden');
            }
            if (steps.forward.length > 0) {
                $prevNextButtons.filter('.next').removeClass('hidden');
            }

            $prevNextButtons.rebind('click.mediaviewer', function() {
                var c = $(this).attr('class');

                if (c && c.indexOf('hidden') === -1) {
                    var steps = slideshowsteps();
                    if (c.indexOf('previous') > -1 && steps.backward.length > 0) {
                        slideshow_prev();
                    }
                    else if (c.indexOf('next') > -1 && steps.forward.length > 0) {
                        slideshow_next();
                    }
                }

                return false;
            });

            clearTimeout(mouseIdleTimer);
            $document.off('mousemove.idle');
            $controls.off('mousemove.idle');

            // Slideshow Mode Init
            if (is_image3(n)) {
                slideshow_imgControls();

                // Autohide controls
                (function _() {
                    clearTimeout(mouseIdleTimer);
                    $overlay.removeClass('mouse-idle');
                    mouseIdleTimer = setTimeout(function() {
                        $overlay.addClass('mouse-idle');
                    }, 2000);
                    $document.rebind('mousemove.idle', _);
                })();
                $controls.rebind('mousemove.idle', function() {
                    onIdle(function() {
                        clearTimeout(mouseIdleTimer);
                    });
                });

                if (fullScreenManager && fullScreenManager.state) {
                    $('.viewer-bars', $overlay).noTransition(() => {
                        $overlay.addClass('fullscreen');
                    });
                }

                if (!fullScreenManager) {
                    slideshow_fullscreen($overlay);
                }
            }

            if (!previews[n.h]) {
                $('img', $imgWrap).attr('src', '');
                $('.viewer-pending', $content).removeClass('hidden');
            }
        }

        $dlBut.rebind('click.media-viewer', function _dlButClick() {
            var p = previews[n && n.h];

            if (p && p.full && Object(p.buffer).byteLength) {
                M.saveAs(p.buffer, n.name)
                    .fail(function(ex) {
                        if (d) {
                            console.debug(ex);
                        }
                        p.full = p.buffer = false;
                        _dlButClick();
                    });
                return false;
            }

            for (var i = dl_queue.length; i--;) {
                if (dl_queue[i] && dl_queue[i].id === slideshow_handle() && dl_queue[i].preview) {
                    dl_queue[i].preview = false;
                    M.openTransfersPanel();
                    return;
                }
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

        if (n.p || M.chat || page === 'download') {
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
        else if (!preqs[n.h]) {
            fetchsrc(n);
        }

        $overlay.removeClass('hidden');
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

        var eot = function eot(id, err) {
            delete preqs[id];
            delete pfails[id];
            if (n.s > 13e7) {
                return previewimg(id, null);
            }
            M.addDownload([id], false, err ? -1 : true);
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

        if (fileext(n.name) === 'pdf') {
            if (!preqs[n.h]) {
                preqs[n.h] = 1;

                M.gfsfetch(n.link || n.h, 0, -1).then((data) => {
                    preview({type: 'application/pdf'}, n.h, data.buffer);
                }).catch((ex) => {
                    if (d) {
                        console.warn('Failed to retrieve PDF, failing back to broken eye image...', ex);
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

        if (is_video(n)) {
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

                M.require('videostream').done(function() {
                    if (preqs[n.h]) {
                        previewimg(n.h, Array(26).join('x'), filemime(n, 'video/mp4'));
                    }
                }).fail(function() {
                    console.error('Failed to load videostream.js');
                });
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
        var maxSize = ua.details.engine === 'Trident' ? 12 : 50;
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
                $('.viewer-pending', $content).addClass('hidden').end().trigger('video-destroy');

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
            $('.viewer-pending', $content).removeClass('hidden');
            $('.video-controls', $overlay).removeClass('hidden');
            $overlay.addClass('video-theatre-mode');

            // Hide play button.
            $(this).addClass('hidden');
            $('.video-controls .playpause i', $overlay).removeClass('icon-play').addClass('icon-pause');

            initVideoStream(n, $overlay, destroy).done(function(streamer) {
                preqs[n.h] = streamer;

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
        $('.viewer-pending', $content).addClass('hidden');
        $('.img-wrap', $content).addClass('hidden');
        $content.removeClass('hidden');

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

        if ($.autoplay === id || page === 'download') {
            queueMicrotask(() => {
                $playVideoButton.trigger('click');
            });
            delete $.autoplay;
        }
    }

    function isThumbnailMissing(n) {
        return !M.chat && (!n.fa || n.fa.indexOf(':0*') < 0);
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
            return true;
        });

        if (_pdfSeen) {

            if (signal()) {
                return;
            }
        }

        M.require('pdfjs2', 'pdfviewer', 'pdfviewercss', 'pdfviewerjs').then(() => {
            var myPage = pages['pdfviewer'];
            myPage = myPage.replace('viewer.css', window.pdfviewercss);
            myPage = myPage.replace('../build/pdf.js', window.pdfjs2);
            myPage = myPage.replace('viewer.js', window.pdfviewerjs);
            // remove then re-add iframe to avoid History changes [push]
            var pdfIframe = document.getElementById('pdfpreviewdiv1');
            var newPdfIframe = document.createElement('iframe');
            newPdfIframe.id = 'pdfpreviewdiv1';
            newPdfIframe.src = 'about:blank';
            var pdfIframeParent = pdfIframe.parentNode;
            pdfIframeParent.replaceChild(newPdfIframe, pdfIframe);
            var doc = newPdfIframe.contentWindow.document;
            doc.open();
            doc.write(myPage);
            doc.addEventListener('pdfjs-webViewerInitialized.meganz', function ack() {
                doc.removeEventListener('pdfjs-webViewerInitialized.meganz', ack);
                queueMicrotask(signal);
            });
            doc.close();
            _pdfSeen = true;
        });
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
        $('#pdfpreviewdiv1', $content).addClass('hidden');
        $bottomBar.removeClass('hidden');

        if (previews[id].type === 'application/pdf') {
            $overlay.addClass('pdf');
            $pendingBlock.addClass('hidden');
            $progressBlock.addClass('vo-hidden');
            $bottomBar.addClass('hidden');
            $imgWrap.addClass('hidden');
            // preview pdfs using pdfjs for all browsers #8036
            // to fix pdf compatibility - Bug #7796
            prepareAndViewPdfViewer(previews[id]);
            api_req({a: 'log', e: 99660, m: 'Previewed PDF Document.'});
            return;
        }

        if (/^(?:audio|video)\//i.test(previews[id].type)) {
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
                $img.attr('src', src1).addClass('active');

                if (previews[id].brokenEye) {
                    $img.addClass('broken-eye');
                }

                slideshow_imgPosition($overlay);
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
                // slideshow_zoomSlider($img.width() / origImgWidth * 100 * devicePixelRatio);
            }

            // Apply exit orientation
            $img.removeClassWith('exif-rotation-').addClass('exif-rotation-' + rot).attr('data-exif', rot);

            $pendingBlock.addClass('hidden');
            $progressBlock.addClass('vo-hidden');
        };
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

        if (previews[id]) {
            if (previews[id].full) {
                if (d && previews[id].fromChat !== null) {
                    console.warn('Not overwriting a full preview...', id);
                }
                if (id === slideshow_handle()) {
                    previewsrc(id);
                }
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

        if (id === slideshow_handle()) {
            previewsrc(id);
        }

        // Ensure we are not eating too much memory...
        delay('slideshow:freemem', slideshow_freemem, 6e3);
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

        if (size > 450 * 1048576) {
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

})(self);
