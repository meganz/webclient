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
    var zoom_IO_times = 0;

    function slideshow_handle(raw) {
        var result;

        if (slideshowid) {
            result = raw ? slideshowid : slideshowid.slice(-8);
        }
        return result || false;
    }

    function slideshowsteps() {
        var $overlay = $('.viewer-overlay');
        var $controls = $overlay.find('.viewer-button.slideshow, .viewer-mid-button.prev, .viewer-mid-button.next');
        var $counter = $overlay.find('.viewer-counter-bl');
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

        // Loop through available items and extract images
        for (var i = 0, m = M.v.length; i < m; i++) {
            if (filter(M.v[i])) {
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
            $counter.find('.first').text(n + 1);
            $counter.find('.last').text(len);
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
        }
        else {
            $controls.removeClass('hidden');
        }
        return {backward: backward, forward: forward};
    }

    function slideshow_move(dir) {
        var valid = true;
        var h = slideshow_handle();
        var step = dir === 'next' ? 'forward' : 'backward';

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
            mBroadcaster.sendMessage('slideshow:' + dir, steps);
            slideshow(steps[step][0]);
        }
    }

    function slideshow_next() {
        slideshow_move('next');
    }

    function slideshow_prev() {
        slideshow_move('prev');
    }

    function slideshow_fullscreen($overlay) {
        var $button = $overlay.find('.viewer-button.fs');

        // Set the video container's fullscreen state
        var setFullscreenData = function(state) {
            if (state) {
                $button.find('i').removeClass('fullscreen').addClass('lowscreen');
            }
            else {
                $button.find('i').removeClass('lowscreen').addClass('fullscreen');

                // disable slideshow-mode exiting from full screen
                if (slideshowplay) {
                    slideshow_imgControls(1);
                }
            }
        };

        fullScreenManager = FullScreenManager($button, $overlay).change(setFullscreenData);
    }

    function slideshow_favourite(n, $overlay) {
        var $favButton = $overlay.find('.viewer-button.favourite');
        var root = M.getNodeRoot(n && n.h || false);

        if (!n || !n.p || (root === 'shares' && M.getNodeRights(n.p) < 2) || folderlink ||
            (M.getNodeByHandle(n.h) && !M.getNodeByHandle(n.h).u && M.getNodeRights(n.p) < 2)) {

            $favButton.addClass('hidden');
        }
        else {
            $favButton.removeClass('hidden');

            $favButton.rebind('click', function() {
                var $button = $(this);
                var newFavState = Number(!M.isFavourite(n.h));

                M.favourite(n.h, newFavState);

                if (newFavState) {
                    $button.attr('data-simpletip', l[5872]);
                    $('i', $button).removeClass('heart').addClass('red-heart');
                    $favButton.trigger('mouseenter');
                }
                else {
                    $button.attr('data-simpletip', l[5871]);
                    $('i', $button).removeClass('red-heart').addClass('heart');
                    $favButton.trigger('mouseenter');
                }
            });

            // Change favourite icon
            if (M.isFavourite(n.h)) {
                $('.viewer-button.favourite', $overlay).attr('data-simpletip',  l[5872]);
                $('.viewer-button.favourite i', $overlay).removeClass('heart').addClass('red-heart');
            }
            else {
                $('.viewer-button.favourite', $overlay).attr('data-simpletip', l[5871]);
                $('.viewer-button.favourite i', $overlay).removeClass('red-heart').addClass('heart');
            }
        }
    }

    function slideshow_remove(n, $overlay) {

        var $removeButton = $overlay.find('.viewer-button.remove');
        var root = M.getNodeRoot(n && n.h || false);

        if (!n || !n.p || (root === 'shares' && M.getNodeRights(n.p) < 2) || folderlink ||
            (M.getNodeByHandle(n.h) && !M.getNodeByHandle(n.h).u && M.getNodeRights(n.p) < 2) || M.chat) {

            $removeButton.addClass('hidden');
        }
        else {
            $removeButton.removeClass('hidden');

            $removeButton.rebind('click', function() {

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
            });
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

            if (!n || !n.p || root === 'shares' || root === M.RubbishID ||
                (!folderlink && M.getNodeByHandle(n.h) && !M.getNodeByHandle(n.h).u &&
                 M.getNodeRights(n.p) < 2)) {

                $overlay.find('.viewer-button.getlink').addClass('hidden');
            }
            else {
                $overlay.find('.viewer-button.getlink')
                    .removeClass('hidden')
                    .rebind('click', function() {
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

    // Inits Image viewer bottom control bar
    function slideshow_imgControls(slideshow_stop) {
        var $overlay = $('.viewer-overlay');
        var $controls = $overlay.find('.viewer-slideshow-controls');
        var $startButton = $overlay.find('.viewer-button.slideshow');
        var $pauseButton = $overlay.find('.viewer-big-button.pause');
        var $prevButton = $overlay.find('.viewer-big-button.prev');
        var $nextButton = $overlay.find('.viewer-big-button.next');
        var $zoomInButton = $overlay.find('.viewer-button.plus');
        var $zoomOutButton = $overlay.find('.viewer-button.minus');
        var $percLabel = $overlay.find('.viewer-button-label.zoom');

        if (slideshow_stop) {
            $overlay.removeClass('slideshow').off('mousewheel.imgzoom');
            slideshowplay = false;
            slideshowpause = false;
            $pauseButton.attr('data-state', 'pause');
            $pauseButton.find('i').removeClass('play').addClass('pause');
            clearTimeout(slideshowTimer);
            slideshowsteps(); // update x of y counter
        }

        // Bind Slideshow Mode button
        $startButton.rebind('click', function() {
            $overlay.addClass('slideshow');
            slideshowplay = true;
            slideshow_timereset();

            // hack to start the slideshow in full screen mode
            if (fullScreenManager) {
                fullScreenManager.enterFullscreen();
            }
            return false;
        });

        // Bind Slideshow Pause button
        $pauseButton.rebind('click', function() {
            var $this = $(this);

            clearTimeout(slideshowTimer);
            if ($(this).attr('data-state') === 'pause') {
                $this.attr('data-state', 'play');
                $this.find('i').removeClass('pause').addClass('play');
                slideshowpause = true;
            }
            else {
                $this.attr('data-state', 'pause');
                $this.find('i').removeClass('play').addClass('pause');
                slideshowTimer = setTimeout(slideshow_next, 4000);
                slideshowpause = false;
            }
            return false;
        });

        // Bind Slideshow Prev button
        $prevButton.rebind('click', function() {
            slideshow_prev();
            slideshow_timereset();
            return false;
        });

        // Bind Slideshow Next button
        $nextButton.rebind('click', function() {
            slideshow_next();
            slideshow_timereset();
            return false;
        });

        // Bind ZoomIn button
        $zoomInButton.rebind('click', function() {
            slideshow_zoom($overlay);
            return false;
        });

        // Bind ZoomOut button
        $zoomOutButton.rebind('click', function() {
            slideshow_zoom($overlay, 1);
            return false;
        });

        // Clicking the percent value will reset the view to 100%
        $percLabel.rebind('click', function() {
            $percLabel.attr('data-perc', NaN);
            $zoomInButton.trigger('click');
            return false;
        });

        // Allow mouse wheel to zoom in/out
        $overlay.rebind('mousewheel.imgzoom', function(e) {
            var delta = Math.max(-1, Math.min(1, (e.wheelDelta || e.deltaY || -e.detail)));

            if (delta > 0) {
                $zoomInButton.trigger('click');
            }
            else {
                $zoomOutButton.trigger('click');
            }
            return false;
        });

        // Bind Slideshow Close button
        $controls.find('.viewer-big-button.close').rebind('click', function() {
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
        var $imgWrap = $overlay.find('.img-wrap');
        var $img = $imgWrap.find('img.active');
        var wrapWidth = $imgWrap.outerWidth();
        var wrapHeight = $imgWrap.outerHeight();
        var imgWidth = switchedSides ? $img.height() : $img.width();
        var imgHeight = switchedSides ? $img.width() : $img.height();
        var dragStart = 0;
        var lastPos = {x: null, y: null};

        if (close) {
            $imgWrap.off('mousedown.pickpan');
            $imgWrap.off('mouseup.pickpan, mouseout.pickpan');
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
        $imgWrap.rebind('mouseup.pickpan, mouseout.pickpan', function() {
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
    function slideshow_zoom($overlay, zoomout) {
        var $img = $overlay.find('img.active');
        var $percLabel = $overlay.find('.viewer-button-label.zoom');
        var perc = parseFloat($percLabel.attr('data-perc'));
        var newPerc = perc / 100 || 1;

        if (zoomout) {
            if (zoom_IO_times <= 0) {
                newPerc *= 0.9;
            }
            else {
                // It was zoomed in previously
                newPerc /= 1.1;
            }
            zoom_IO_times--;
        }
        else {
            if (zoom_IO_times >= 0) {
                newPerc *= 1.1;
            }
            else {
                // It was zoomed out previously
                newPerc /= 0.9;
            }
            zoom_IO_times++;
        }

        newPerc /= devicePixelRatio;
        var newImgWidth = origImgWidth * newPerc;
        var newImgHeight = origImgHeight * newPerc;

        if (newImgHeight * newImgWidth > 240) {
            $img.css({
                'width': switchedSides ? newImgHeight : newImgWidth,
                'height': switchedSides ? newImgWidth : newImgHeight
            });

            zoom_mode = true;

            // Set zoom, position values and init pick and pan
            slideshow_imgPosition($overlay);
        }
    }

    // Sets zoom percents and image position
    function slideshow_imgPosition($overlay) {
        var $img = $overlay.find('img.active');
        var $percLabel = $overlay.find('.viewer-button-label.zoom');
        var id = $overlay.find('.img-wrap').attr('data-image');
        var viewerWidth = $overlay.width();
        var viewerHeight = $overlay.height();
        var imgWidth = 0;
        var imgHeight = 0;
        var w_perc = 0;
        var h_perc = 0;

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
                $img.css({
                    'width': switchedSides ? imgHeight : imgWidth
                });
            }
            // Check if width fits browser window after reducing height
            else if ((origImgWidth > viewerWidth && origImgHeight * w_perc > viewerHeight)
                || (origImgWidth < viewerWidth && origImgHeight > viewerHeight)) {

                imgWidth = origImgWidth * h_perc;
                imgHeight = viewerHeight;
                $img.css({
                    'height': switchedSides ? imgWidth : imgHeight
                });
            }
            // Check if preview and original imgs are loading and height fits browser window after increasing width
            else if (fitToWindow[id] && origImgHeight < viewerHeight
                && origImgWidth < viewerWidth && origImgHeight * w_perc <= viewerHeight) {

                imgWidth = viewerWidth;
                imgHeight = origImgHeight * w_perc;
                $img.css({
                    'width': switchedSides ? viewerHeight : viewerWidth
                });
            }
            // Check if preview and original imgs are loading and width fits browser window after increasing height
            else if (fitToWindow[id] && imgHeight < viewerHeight
                && origImgWidth < viewerWidth && origImgWidth * h_perc <= viewerWidth) {

                imgWidth = origImgWidth * h_perc;
                imgHeight = viewerHeight;
                $img.css({
                    'height': switchedSides ? viewerWidth : viewerHeight
                });
            }
            else {
                $img.css({
                    'height': switchedSides ? origImgWidth : origImgHeight
                });
            }
        }

        $img.css({
            'left': (viewerWidth - imgWidth) / 2,
            'top': (viewerHeight - imgHeight) / 2,
        });
        w_perc = (imgWidth / origImgWidth * 100 * devicePixelRatio);
        $percLabel.attr('data-perc', w_perc).text(Math.round(w_perc) + '%');
    }

    // Viewer Init
    function slideshow(id, close, hideCounter) {
        if (!close && M.isInvalidUserStatus()) {
            return;
        }

        var $overlay = $('.viewer-overlay');
        var $controls = $overlay.find('.viewer-top-bl, .viewer-bottom-bl, .viewer-slideshow-controls');
        var $document = $(document);
        zoom_IO_times = 0;

        if (d) {
            console.log('slideshow', id, close, slideshowid);
        }

        if (close) {
            sessionStorage.removeItem('previewNode');
            sessionStorage.removeItem('previewTime');
            zoom_mode = false;
            switchedSides = false;
            slideshowid = false;
            _hideCounter = false;
            slideshowplay = false;
            $overlay.removeClass('video video-theatre-mode mouse-idle slideshow fullscreen').addClass('hidden');
            $overlay.find('.viewer-button-label.zoom').attr('data-perc', 100);
            $(window).off('resize.imgResize');
            $document.off('keydown.slideshow mousemove.idle');
            $overlay.find('.viewer-image-bl').removeClass('default-state');
            $overlay.find('.viewer-image-bl .img-wrap').attr('data-count', '');
            $overlay.find('.viewer-image-bl img').attr('src', '').removeAttr('style');
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
            if (!history.state || history.state.view !== id) {
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
        sessionStorage.setItem('previewNode', id);
        pushHistoryState(true, Object.assign({subpage: page}, history.state, {view: slideshowid}));

        // Turn off pick and pan mode
        slideshow_pickpan($overlay, 1);

        // Bind static events is viewer is not in slideshow mode to avoid unnecessary rebinds
        if (!slideshowplay) {
            $overlay.removeClass('fullscreen mouse-idle slideshow video pdf');

            // Bind keydown events
            $document.rebind('keydown.slideshow', function(e) {
                if (e.keyCode === 37 && slideshowid && !e.altKey && !e.ctrlKey) {
                    slideshow_prev();
                }
                else if (e.keyCode === 39 && slideshowid) {
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
                    else {
                        slideshow(0, 1);
                    }
                }
                else if (e.keyCode === 8 || e.key === 'Backspace') {
                    history.back();
                    return false;
                }
            });

            // Close icon
            $overlay.find('.viewer-button.close,.viewer-error-close')
                .rebind('click', function () {
                    history.back();
                    return false;
                });

            // Properties icon
            $overlay.find('.viewer-button.info').rebind('click', function() {
                $document.fullScreen(false);
                propertiesDialog();
                return false;
            });

            clearTimeout(mouseIdleTimer);
            $document.off('mousemove.idle');
            $controls.off('mousemove.idle');
            $('.viewer-short-controls.img-controls', $overlay).addClass('hidden');

            // Slideshow Mode Init
            if (is_image3(n)) {
                $('.viewer-short-controls.img-controls', $overlay).removeClass('hidden');
                slideshow_imgControls();

                // Autohide controls
                (function _() {
                    clearTimeout(mouseIdleTimer);
                    $overlay.removeClass('mouse-idle');
                    mouseIdleTimer = setTimeout(function() {
                        $overlay.addClass('mouse-idle');
                    }, 4000);
                    $document.rebind('mousemove.idle', _);
                })();
                $controls.rebind('mousemove.idle', function() {
                    onIdle(function() {
                        clearTimeout(mouseIdleTimer);
                    });
                });

                if (!fullScreenManager) {
                    slideshow_fullscreen($overlay);
                }
            }

            if (!previews[n.h]) {
                $overlay.find('.img-wrap img').attr('src', '');
                $overlay.find('.viewer-pending').removeClass('hidden');
            }
        }

        // Favourite Icon
        slideshow_favourite(n, $overlay);

        // Remove Icon
        slideshow_remove(n, $overlay);

        // Set file data
        zoom_mode = false;
        switchedSides = false;
        $overlay.find('.viewer-filename').text(n.name);
        $overlay.find('.viewer-image-bl').removeClass('default-state');
        $overlay.find('.viewer-progress, .viewer-error, video, #pdfpreviewdiv1').addClass('hidden');
        $overlay.find('.viewer-mid-button.prev,.viewer-mid-button.next').removeClass('active');
        $overlay.find('.viewer-progress p').removeAttr('style');

        // Init full screen icon
        $overlay.find('.viewer-button.fs .icons-img').removeClass('lowscreen').addClass('fullscreen');

        var steps = slideshowsteps();
        if (steps.backward.length > 0) {
            $overlay.find('.viewer-mid-button.prev').addClass('active');
        }
        if (steps.forward.length > 0) {
            $overlay.find('.viewer-mid-button.next').addClass('active');
        }

        $overlay.find('.viewer-mid-button.prev, .viewer-mid-button.next').rebind('click', function() {
            var c = $(this).attr('class');
            if (c && c.indexOf('active') > -1) {
                var steps = slideshowsteps();
                if (c.indexOf('prev') > -1 && steps.backward.length > 0) {
                    slideshow_prev();
                }
                else if (c.indexOf('next') > -1 && steps.forward.length > 0) {
                    slideshow_next();
                }
            }

            return false;
        });

        var $dlBut = $overlay.find('.viewer-button.download');
        $dlBut.rebind('click', function _dlButClick() {
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
                $('.big-button.download-file').click();
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

                M.gfsfetch(n.link || n.h, 0, -1).done(function(data) {
                    preview({type: 'application/pdf'}, n.h, data.buffer);
                }).fail(function(ev) {
                    if (d) {
                        console.warn('Failed to retrieve PDF, failing back to broken eye image...', ev);
                    }

                    previewimg(n.h, null);
                    delete previews[n.h].buffer;
                    preqs[n.h] = 0; // to retry again
                    if (ev === EOVERQUOTA || Object(ev.target).status === 509) {
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

        var treq = Object.create(null);
        preqs[n.h] = 1;
        treq[n.h] = {fa: n.fa, k: n.k};
        var maxSize = ua.details.engine === 'Trident' ? 12 : 50;
        var loadOriginal = n.s < maxSize * 1048576 && is_image(n) === 1;
        var loadPreview = !loadOriginal || !slideshowplay && n.s > 1048576;
        var onPreviewError = loadOriginal ? previewimg.bind(window, n.h, null) : eot;
        var getPreview = api_getfileattr.bind(window, treq, 1, preview, onPreviewError);

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
            var $overlay = $('.viewer-overlay');
            var $progressBar = $overlay.find('.viewer-progress');

            var progress = function(perc) {
                var loadingDeg = 360 * perc / 100;

                if (slideshow_handle() !== n.h) {
                    if (d && ((perc | 0) % 10) < 1) {
                        console.debug('slideshow original image loading in background progress...', n.h, perc);
                    }
                    return;
                }
                $progressBar.removeClass('hidden');

                if (loadingDeg <= 180) {
                    $progressBar.find('.right-c p').css('transform', 'rotate(' + loadingDeg + 'deg)');
                    $progressBar.find('.left-c p').removeAttr('style');
                }
                else {
                    $progressBar.find('.right-c p').css('transform', 'rotate(180deg)');
                    $progressBar.find('.left-c p').css('transform', 'rotate(' + (loadingDeg - 180) + 'deg)');
                }

                if (loadingDeg === 360) {
                    $progressBar.addClass('hidden');
                    $progressBar.find('p').removeAttr('style');
                }
            };

            M.gfsfetch(n.link || n.h, 0, -1, progress).tryCatch(function(data) {
                preview({type: filemime(n, 'image/jpeg')}, n.h, data.buffer);
                if (!exifImageRotation.fromImage) {
                    previews[n.h].orientation = parseInt(EXIF.readFromArrayBuffer(data, true).Orientation) || 1;
                }
            }, function(ev) {
                if (ev === EOVERQUOTA || Object(ev.target).status === 509) {
                    eventlog(99703, true);
                }

                if (d) {
                    console.debug('slideshow failed to load original %s', n.h, ev.target && ev.target.status || ev);
                }

                if (slideshow_handle() === n.h) {
                    $progressBar.addClass('hidden');
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
            $overlay = $('video:visible').parent();
        }
        var n = slideshow_node(id, $overlay);

        $('.play-video-button', $overlay).rebind('click', function() {
            if (dlmanager.isOverQuota) {
                return dlmanager.showOverQuotaDialog();
            }

            var destroy = function() {
                $overlay.find('.viewer-pending').addClass('hidden').end().trigger('video-destroy');

                if (preqs[n.h] && preqs[n.h] instanceof Streamer) {
                    mBroadcaster.removeListener(preqs[n.h].ev1);
                    mBroadcaster.removeListener(preqs[n.h].ev2);
                    mBroadcaster.removeListener(preqs[n.h].ev3);
                    mBroadcaster.removeListener(preqs[n.h].ev4);

                    preqs[n.h].kill();
                    preqs[n.h] = false;
                }
            };

            // Show loading spinner until video is playing
            $overlay.find('.viewer-pending').removeClass('hidden');
            $overlay.addClass('video-theatre-mode')
                .find('.viewer-image-bl').removeClass('default-state');

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
        $overlay.find('video').removeClass('hidden');
        $overlay.find('.viewer-pending').addClass('hidden');
        // $overlay.find('.viewer-progress').addClass('hidden');
        $overlay.find('.viewer-image-bl .img-wrap').addClass('hidden');
        $overlay.find('.viewer-image-bl').addClass('default-state').removeClass('hidden');

        if (n.name) {
            var c = MediaAttribute.getCodecStrings(n);
            if (c) {
                $overlay.find('.viewer-filename').attr('title', c);
            }
        }

        var $video = $overlay.find('.viewer-image-bl video');
        $video.attr('poster', '').prop('controls', false).removeClass('hidden');

        if (previews[id].poster !== undefined) {
            $video.attr('poster', previews[id].poster);

            if (previews[id].poster) {
                $overlay.find('.viewer-image-bl').removeClass('default-state');
            }
        }
        else if (String(n.fa).indexOf(':1*') > 0) {
            getImage(n, 1).then(function(uri) {
                previews[id].poster = uri;

                if (id === slideshow_handle()) {
                    if ($video.length && !$video[0].parentNode) {
                        // The video element got already destroyed/replaced due an error
                        $video = $overlay.find('.viewer-image-bl video');
                    }
                    $video.attr('poster', uri);
                    $overlay.find('.viewer-image-bl').removeClass('default-state');
                }
            }).catch(console.debug.bind(console));
        }
        else {
            $overlay.find('.viewer-image-bl').addClass('default-state');
        }
        previews[id].poster = previews[id].poster || '';

        if ($.autoplay === id || page === 'download') {
            onIdle(function() {
                $('.play-video-button', $overlay).trigger('click');
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
        if (_pdfSeen) {
            var success = false;
            tryCatch(function() {
                var elm = document.getElementById('pdfpreviewdiv1');
                elm.classList.remove('hidden');

                var ev = document.createEvent("HTMLEvents");
                ev.initEvent("pdfjs-openfile.meganz", true);
                ev.data = data.buffer || data.src;
                elm.contentDocument.body.dispatchEvent(ev);
                success = true;
            })();

            if (success) {
                return;
            }
        }
        M.require('pdfjs2', 'pdfviewer', 'pdfviewercss', 'pdfviewerjs').done(function() {
            var myPage = pages['pdfviewer'];
            myPage = myPage.replace('viewer.css', window.pdfviewercss);
            myPage = myPage.replace('../build/pdf.js', window.pdfjs2);
            myPage = myPage.replace('viewer.js', window.pdfviewerjs);
            localStorage.setItem('currPdfPrev2', JSON.stringify(data.src));
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
            doc.close();
            _pdfSeen = true;
        });
    }

    function previewsrc(id) {
        var $overlay = $('.viewer-overlay');
        var $imgBlock = $overlay.find('.viewer-image-bl');
        var $imgCount = $imgBlock.find('.img-wrap');

        var src = Object(previews[id]).src;
        if (!src) {
            console.error('Cannot preview %s', id);
            return;
        }

        $overlay.removeClass('pdf video video-theatre-mode');
        $imgBlock.find('embed').addClass('hidden');
        $imgBlock.find('video').addClass('hidden');
        $imgBlock.find('.img-wrap').removeClass('hidden');
        $imgBlock.find('#pdfpreviewdiv1').addClass('hidden');
        $overlay.find('.viewer-bottom-bl').removeClass('hidden');

        if (previews[id].type === 'application/pdf') {
            $overlay.addClass('pdf');
            $overlay.find('.viewer-pending').addClass('hidden');
            $overlay.find('.viewer-progress').addClass('hidden');
            $overlay.find('.viewer-bottom-bl').addClass('hidden');
            $imgBlock.find('.img-wrap').addClass('hidden');
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
        var imgClass = $imgCount.attr('data-count') !== 'img1' ? 'img1' : 'img2';
        var replacement = false;

        if ($imgCount.attr('data-image') === id) {
            replacement = $imgCount.attr('data-count');
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
            var $img = $imgCount.find('.' + imgClass);
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
                    $overlay.find('.img-wrap img').attr('src', '');
                }
                $imgCount.find('img').removeClass('active');
                $imgCount.attr('data-count', imgClass);
                $imgCount.attr('data-image', id);
                $img.attr('src', src1).addClass('active');

                // Set position, zoom values
                zoom_mode = false;
                $overlay.find('.viewer-button-label.zoom').attr('data-perc', 100);
                slideshow_imgPosition($overlay);
                $(window).rebind('resize.imgResize', function() {
                    zoom_mode = false;
                    slideshow_imgPosition($overlay);
                });
            }
            else if (src1 !== noThumbURI) {
                $img.attr('src', src1).addClass('active');

                // adjust zoom percent label
                var perc = ($img.width() / origImgWidth * 100 * devicePixelRatio);
                $overlay.find('.viewer-button-label.zoom').attr('data-perc', perc).text(Math.round(perc) + '%');
            }

            // Apply exit orientation
            $img.removeClassWith('exif-rotation-').addClass('exif-rotation-' + rot).attr('data-exif', rot);

            $overlay.find('.viewer-pending').addClass('hidden');
            $overlay.find('.viewer-progress').addClass('hidden');
        };
        img.src = src;
    }

    function previewimg(id, uint8arr, type) {
        var blob;
        var n = M.getNodeByHandle(id);

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
            full: n.s === blob.size
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
