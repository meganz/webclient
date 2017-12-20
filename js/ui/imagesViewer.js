var previews = Object.create(null);
var preqs = Object.create(null);
var pfails = Object.create(null);
var slideshowid;

(function _imageViewerSlideShow(global) {
    "use strict";

    var fullScreenTimer = null;

    function slideshowsteps() {
        var $stepsBlock = $('.viewer-overlay .viewer-images-num');
        var forward = [];
        var backward = [];
        var ii = [];
        var ci;

        // Loop through available items and extract images
        for (var i in M.v) {
            if (is_image(M.v[i])) {
                // is currently previewed item
                if (M.v[i].h === slideshowid) {
                    ci = i;
                }
                ii.push(i);
            }
        }

        var len = ii.length;
        // If there is at least 2 images
        if (len > 1) {
            var n = ii.indexOf(ci);
            $stepsBlock.removeClass('hidden');
            switch (n) {
                // last
                case len - 1:
                    forward.push(M.v[ii[0]].h);
                    backward.push(M.v[ii[n - 1]].h);
                    break;
                // first
                case 0:
                    forward.push(M.v[ii[n + 1]].h);
                    backward.push(M.v[ii[len - 1]].h);
                    break;
                case -1:
                    break;
                default:
                    forward.push(M.v[ii[n + 1]].h);
                    backward.push(M.v[ii[n - 1]].h);
            }
            $stepsBlock.find('.first').text(n + 1);
            $stepsBlock.find('.last').text(len);
        }
        else {
            $stepsBlock.addClass('hidden');
        }
        return {backward: backward, forward: forward};
    }

    function slideshow_next() {
        var valid = true;
        $.each(dl_queue || [], function(id, file) {
            if (file.id === slideshowid) {
                valid = false;
                return false;
                /* break loop */
            }
        });
        if (!valid) {
            return;
        }
        var steps = slideshowsteps();
        if (steps.forward.length > 0) {
            mBroadcaster.sendMessage('slideshow:next', steps);
            slideshow(steps.forward[0]);
        }
    }

    function slideshow_prev() {
        var valid = true;
        $.each(dl_queue || [], function(id, file) {
            if (file.id === slideshowid) {
                valid = false;
                return false;
                /* break loop */
            }
        });
        if (!valid) {
            return;
        }
        var steps = slideshowsteps();
        if (steps.backward.length > 0) {
            mBroadcaster.sendMessage('slideshow:prev', steps);
            slideshow(steps.backward[steps.backward.length - 1]);
        }
    }

    function slideshow_fullscreen($overlay) {
        var $fullScreenIcon = $overlay.find('.viewer-button.fullscreen');

        if ($(document).fullScreen() === null) {
            $fullScreenIcon.addClass('hidden');
        }
        else {
            $fullScreenIcon.removeClass('hidden').rebind('click', function() {
                if ($(document).fullScreen()) {
                    $(document).fullScreen(false);
                }
                else {
                    $(document).fullScreen(true);
                }
            });

            $(document).rebind('fullscreenchange.mediaviewer', function() {
                if (!$(document).fullScreen()) {
                    clearTimeout(fullScreenTimer);

                    $(document).unbind('mousemove.mediaviewer');
                    $overlay.find('.viewer-button.fullscreen i').switchClass('lowscreen', 'fullscreen');
                    $overlay.removeClass('fullscreen mouse-idle');
                }
                else {
                    $overlay.addClass('fullscreen');
                    $overlay.find('.viewer-button.fullscreen i').switchClass('fullscreen', 'lowscreen');

                    // Hide buttons for mouse idle
                    $(document).bind('mousemove.mediaviewer', function() {
                        clearTimeout(fullScreenTimer);
                        $overlay.removeClass('mouse-idle');

                        if ($overlay.hasClass('fullscreen')) {
                            fullScreenTimer = setTimeout(function() {
                                $overlay.addClass('mouse-idle');
                            }, 3000);
                        }
                    });
                }
            });
        }
    }

    function slideshow_favourite(n, $overlay) {
        var $favButton = $overlay.find('.viewer-button.favourite');

        if (!n || !n.p || folderlink) {
            $favButton.addClass('hidden');
        }
        else {
            $favButton.removeClass('hidden');

            $favButton.rebind('click', function() {
                var newFavState = Number(!M.isFavourite(n.h));

                M.favourite(n.h, newFavState);

                if (newFavState) {
                    $(this).find('i').removeClass('heart').addClass('red-heart');
                }
                else {
                    $(this).find('i').removeClass('red-heart').addClass('heart');
                }
            });

            // Change favourite icon
            if (n.fav) {
                $overlay.find('.viewer-button.favourite i')
                    .removeClass('heart').addClass('red-heart');
            }
            else {
                $overlay.find('.viewer-button.favourite i')
                    .removeClass('red-heart').addClass('heart');
            }
        }
    }

    function slideshow_node(id, $overlay) {
        var n = M.getNodeByHandle(id);

        if (!n && typeof id === 'object') {
            n = id;
        }

        if ($overlay) {
            if (!n || !n.p || M.getNodeRoot(id) === 'shares' || folderlink) {
                $overlay.find('.viewer-button.getlink').addClass('hidden');
            }
            else {
                $overlay.find('.viewer-button.getlink')
                    .removeClass('hidden')
                    .rebind('click', function() {

                        if (u_type === 0) {
                            ephemeralDialog(l[1005]);
                        }
                        else {
                            mega.Share.initCopyrightsDialog([slideshowid]);
                        }
                    });
            }
        }

        return n || false;
    }

    function slideshow(id, close) {
        var $overlay = $('.viewer-overlay');
        var $document = $(document);

        $overlay.removeClass('fullscreen mouse-idle');

        if (d) {
            console.log('slideshow', id, close, slideshowid);
        }
        
        if (close) {
            slideshowid = false;
            $overlay.removeClass('video video-theatre-mode').addClass('hidden');
            $document.unbind('keydown.slideshow');
            if ($document.fullScreen()) {
                clearTimeout(fullScreenTimer);
                $document.fullScreen(false);
                $document.unbind('mousemove.mediaviewer');
            }
            for (var i in dl_queue) {
                if (dl_queue[i] && dl_queue[i].id === id) {
                    if (dl_queue[i].preview) {
                        dlmanager.abort(dl_queue[i]);
                    }
                    break;
                }
            }
            mBroadcaster.sendMessage('slideshow:close');
            return false;
        }
        var n = slideshow_node(id, $overlay);
        // Checking if this the first preview (not a preview navigation)
        // then pushing fake states of history/hash
        if (!slideshowid) {
            if (!hashLogic) {
                history.pushState({ subpage: page }, '', '/' + page);
            }
        }
        // Bind keydown events
        var overlayKeyDownHandler = function (e) {
            if (e.keyCode === 37 && slideshowid && !e.altKey && !e.ctrlKey) {
                slideshow_prev();
            }
            else if (e.keyCode === 39 && slideshowid) {
                slideshow_next();
            }
            else if (e.keyCode === 27 && slideshowid && !$document.fullScreen()) {
                slideshow(slideshowid, true);
            }
            else if (e.keyCode === 8 || e.key === 'Backspace') {
                // since Backspace event is processed with keydown at document level for cloudBrowser.
                // i prefered that to process it here, instead of unbind the previous handler.
                e.stopPropagation();
                if (!hashLogic) {
                    history.back();
                }
                else {
                    slideshow(slideshowid, 1);
                }
                return false;
            }
        };
        $document.rebind('keydown.slideshow', overlayKeyDownHandler);

        // Close icon
        $overlay.find('.viewer-button.close,.viewer-error-close')
            .rebind('click', function () {
                if (!hashLogic) {
                    history.back();
                }
                else {
                    slideshow(slideshowid, 1);
                }
            });

        // Fullscreen icon
        slideshow_fullscreen($overlay);

        // Favourite Icon
        slideshow_favourite(n, $overlay);

        if (!n) {
            return;
        }
        slideshowid = n.h;

        $overlay.find('.viewer-filename').text(n.name);
        $overlay.find('.viewer-image-bl img').attr('src', '');
        $overlay.find('.viewer-pending').removeClass('hidden');
        $overlay.find('.viewer-progress').addClass('hidden');
        $overlay.find('.viewer-error').addClass('hidden');
        $overlay.find('.viewer-image-bl').addClass('hidden');
        $overlay.find('.viewer-mid-button.prev,.viewer-mid-button.next').removeClass('active');
        $overlay.find('.viewer-progress p').removeAttr('style');

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
        $dlBut.rebind('click', function() {

            for (var i in dl_queue) {
                if (dl_queue[i] && dl_queue[i].id === slideshowid) {
                    dl_queue[i].preview = false;
                    M.openTransfersPanel();
                    return;
                }
            }

            if (M.d[slideshowid]) {
                M.addDownload([slideshowid]);
            }
            else {
                M.addDownload([n]);
            }
        });

        if (n.p || M.chat) {
            $dlBut.removeClass('hidden');
        }
        else {
            $dlBut.addClass('hidden');
        }

        if (previews[n.h]) {
            previewsrc(n.h);
            fetchnext();
        }
        else if (!preqs[n.h]) {
            fetchsrc(n);
        }

        $overlay.removeClass('hidden');
    }

    function fetchnext() {
        var n = M.d[slideshowsteps().forward[0]];
        if (!n || !n.fa) {
            return;
        }
        if (n.fa.indexOf(':1*') > -1 && !preqs[n.h] && !previews[n.h]) {
            fetchsrc(n.h);
        }
    }

    function fetchsrc(id) {
        function eot(id, err) {
            delete preqs[id];
            delete pfails[id];
            M.addDownload([id], false, err ? -1 : true);
        }

        eot.timeout = 8500;

        var preview = function preview(ctx, h, u8) {
            previewimg(h, u8, ctx.type);

            if (isThumbnailMissing(n)) {
                createNodeThumbnail(n, u8);
            }
            if (h === slideshowid) {
                fetchnext();
            }
        };

        var n = slideshow_node(id);
        if (!n) {
            console.error('Node "%s" not found...', id);
            return false;
        }

        if (filetype(n) === 'PDF Document') {
            if (!preqs[n.h]) {
                preqs[n.h] = 1;

                M.gfsfetch(n.link || n.h, 0, -1).done(function(data) {
                    preview({type: 'application/pdf'}, n.h, data.buffer);
                }).fail(function(ev) {
                    if (d) {
                        console.warn('Failed to retrieve PDF, failing back to broken eye image...', ev);
                    }

                    var svg = decodeURIComponent(noThumbURI.substr(noThumbURI.indexOf(',') + 1));
                    var u8 = new Uint8Array(svg.length);
                    for (var i = svg.length; i--;) {
                        u8[i] = svg.charCodeAt(i);
                    }
                    previewimg(n.h, u8, 'image/svg+xml');
                    delete previews[n.h].buffer;
                });
            }
            return false;
        }

        if (is_video(n)) {
            if (!preqs[n.h]) {
                preqs[n.h] = 1;

                M.require('videostream').done(function() {
                    if (preqs[n.h]) {
                        slideshow_videostream(n, '.viewer-overlay');
                    }
                }).fail(function() {
                    console.error('Failed to load videostream.js');
                });
            }
            return false;
        }

        if (pfails[n.h]) {
            // for slideshow_next/prev
            if (slideshowid === n.h) {
                return eot(n.h, 1);
            }
            delete pfails[n.h];
        }

        var treq = Object.create(null);
        preqs[n.h] = 1;
        treq[n.h] = {fa: n.fa, k: n.k};
        api_getfileattr(treq, 1, preview, eot);
    }

    // start streaming a video file
    function slideshow_videostream(n, wrapper) {
        var $wrapper = $(wrapper);

        if ($wrapper.length < 0) {
            $wrapper = $('video').parent();
        }

        dlmanager.setUserFlags();
        previewimg(n.h, Array(26).join('x'), filemime(n));

        $('.play-video-button', $wrapper).rebind('click', function() {
            preqs[n.h] = Streamer(n.link || n.h, $wrapper.find('video').get(0));

            // Init video controls
            initVideoControls($wrapper);

            // Show loading spinner until video is playing
            $wrapper.find('.viewer-pending').removeClass('hidden');
            $wrapper.addClass('video-theatre-mode')
                .find('.viewer-image-bl').removeClass('default-state');

            // Destroy videostreamer
            var destroy = function() {
                $wrapper.find('.viewer-pending').addClass('hidden');

                if (preqs[n.h] && preqs[n.h] instanceof Streamer) {
                    mBroadcaster.removeListener(preqs[n.h].ev1);
                    mBroadcaster.removeListener(preqs[n.h].ev2);
                    mBroadcaster.removeListener(preqs[n.h].ev3);
    
                    preqs[n.h].destroy();
                    preqs[n.h] = previews[n.h] = false;
                }
            };
            preqs[n.h].ev1 = mBroadcaster.addListener('slideshow:next', destroy);
            preqs[n.h].ev2 = mBroadcaster.addListener('slideshow:prev', destroy);
            preqs[n.h].ev3 = mBroadcaster.addListener('slideshow:close', destroy);

            // If video is playing
            preqs[n.h].on('playing', function() {
                var video = this.video;

                if (video && video.duration) {

                    if (isThumbnailMissing(n) && n.u === u_handle && n.f !== u_handle) {
                        var took = Math.round(2 * video.duration / 100);

                        if (d) {
                            console.debug('Video thumbnail missing, will take image at %s...', secondsToTime(took));
                        }

                        this.on('timeupdate', function() {
                            if (video.currentTime < took) {
                                return true;
                            }

                            this.getImage().then(createNodeThumbnail.bind(null, n)).catch(console.warn.bind(console));
                        });
                    }

                    return false;
                }

                return true;
            });

            preqs[n.h].on('error', function(ev, error) {
                // <video>'s element `error` handler
                if (!$.dialog) {
                    msgDialog('warninga', l[135], l[47], error.message || error);
                }
                if (d) {
                    console.debug('ct=%s, buf=%s', this.video.currentTime, this.stream.bufTime);
                }
                destroy();
    
                if (filemime(n) !== 'video/quicktime' && !d) {
                    api_req({a: 'log', e: 99669, m: 'stream error'});
                }
            });

            if (d) {
                window.strm = preqs[n.h];
            }
        });

    }

    // Init custom video controlls
    function initVideoControls(wrapper) {
        var $wrapper = $(wrapper);
        var $video = $wrapper.find('video');
        var videoElement = $video.get(0);
        var $videoContainer = $video.parent();
        var $videoControls = $wrapper.find('.video-controls');
        var $document = $(document);

        // Hide the default controls
        videoElement.controls = false;

        // Obtain handles to buttons and other elements
        var $playpause = $videoControls.find('.playpause');
        var $mute = $videoControls.find('.mute');
        var $progress = $videoControls.find('.video-progress-bar');
        var $progressBar = $videoControls.find('.video-time-bar');
        var $fullscreen = $videoControls.find('.fs');
        var $volumeBar = $videoControls.find('.volume-bar');

        // Wait for the video's meta data to be loaded, then set the progress bar's max value to the duration of the video
        $video.rebind('loadedmetadata', function() {
            $wrapper.find('.video-timing.duration')
                    .text(secondsToTimeShort(videoElement.duration, 1));
        });

        // Changes the button state of certain button's so the correct visuals can be displayed with CSS
        var changeButtonState = function(type) {
            // Play/Pause button
            if (type == 'playpause') {
                if (videoElement.paused || videoElement.ended) {
                    $playpause.find('i').removeClass('pause').addClass('play');
                }
                else {
                    $playpause.find('i').removeClass('play').addClass('pause');
                }
            }
            // Mute button
            else if (type == 'mute') {
                if (videoElement.muted) {
                    $mute.find('i').removeClass('volume').addClass('volume-muted');
                }
                else {
                    $mute.find('i').removeClass('volume-muted').addClass('volume');
                }
            }
        }

        // Set Init Values
        changeButtonState('playpause');
        changeButtonState('mute');
        $wrapper.find('.video-timing').text('00:00');
        $progressBar.removeAttr('style');
        $volumeBar.find('style').removeAttr('style');

        // Add event listeners for video specific events
        $video.rebind('play pause', function() {
            changeButtonState('playpause');
        });

        $video.rebind('playing', function() {
            if (videoElement && videoElement.duration) {
                $wrapper.find('.viewer-pending').addClass('hidden');
            }
        });

        // Add events for all buttons
        $playpause.rebind('click', function(e) {
            if (videoElement.paused || videoElement.ended) {
                videoElement.play();
            }
            else {
                videoElement.pause();
            }
        });

        // Volume Bar control
        var volumeDrag = false;   /* Drag status */
        $volumeBar.rebind('mousedown.volumecontrol', function(e) {
            volumeDrag = true;
            updateVolumeBar(e.pageY);
        });

        $document.rebind('mouseup.volumecontrol', function(e) {
            if(volumeDrag) {
                volumeDrag = false;
                updateVolumeBar(e.pageY);
            }
        });

        $document.rebind('mousemove.volumecontrol', function(e) {
            if(volumeDrag) {
                updateVolumeBar(e.pageY);
            }
        });

        // update Volume Bar control
        var updateVolumeBar = function(y) {
            var $this = $($volumeBar);

            if (y) {
                var position = $this.height() - (y - $this.offset().top);
                var percentage = 100 * position / $this.height();
             
                //Check within range
                if (percentage > 100) {
                    percentage = 100;
                }
                else if (percentage > 0) {
                    videoElement.muted = false;
                }
                else {
                    percentage = 0;
                    videoElement.muted = true;
                }

                changeButtonState('mute');
                $this.find('span').css('height', percentage+'%');
                videoElement.volume = percentage / 100;
            }
            else {
                if (!videoElement.muted) {
                    var currentVolume = videoElement.volume * 100;
                    $this.find('span').css('height', currentVolume+'%');
                }
                else {
                    $this.find('span').css('height', '0%');
                }
            }
        };
        updateVolumeBar();

        // Bind Mute button
        $mute.rebind('click', function(e) {
            videoElement.muted = !videoElement.muted;
            changeButtonState('mute');
            updateVolumeBar();
        });

        // As the video is playing, update the progress bar
        $video.rebind('timeupdate', function() {
            var currentPos = videoElement.currentTime;
            var maxduration = videoElement.duration;
            var percentage = 100 * currentPos / maxduration;
            $progressBar.css('width', percentage+'%');

            $wrapper.find('.video-timing.current')
                .text(secondsToTimeShort(videoElement.currentTime,1));
        });

        var timeDrag = false; /* Drag status */
        $progress.rebind('mousedown.videoprogress', function(e) {
            timeDrag = true;
            videoElement.pause();
        });

        $document.rebind('mouseup.videoprogress', function(e) {
            if (timeDrag) {
                timeDrag = false;
                updatebar(e.pageX);
                videoElement.play();
            }
        });

        $document.rebind('mousemove.videoprogress', function(e) {
            if (timeDrag) {
                updatebar(e.pageX);
            }
        });

        // Update Progress Bar control
        var updatebar = function(x) {
            var maxduration = videoElement.duration; //Video duraiton
            var position = x - $progress.offset().left; //Click pos
            var percentage = 100 * position / $progress.width();
            var selectedTime;

            //Check within range
            if (percentage > 100) {
                percentage = 100;
            }
            else if (percentage < 0) {
                percentage = 0;
            }

            //Update progress bar and video currenttime
            selectedTime = Math.round(maxduration * percentage / 100);

            $progressBar.css('width', percentage+'%');
            $wrapper.find('.video-timing.current')
                .text(secondsToTimeShort(selectedTime,1));

            if (!timeDrag) {
                videoElement.currentTime = selectedTime;
            }
        };


        // Check if the browser supports the Fullscreen mode
        var fullScreenEnabled = !!(document.fullscreenEnabled
            || document.mozFullScreenEnabled
            || document.msFullscreenEnabled
            || document.webkitSupportsFullscreen
            || document.webkitFullscreenEnabled
            || document.createElement('video').webkitRequestFullScreen);

        // If the browser doesn't support the Fulscreen then hide the fullscreen button
        if (!fullScreenEnabled) {
            $fullscreen.addClas('hidden');
        }

        // Set the video container's fullscreen state
        var setFullscreenData = function(state) {
            $videoContainer.attr('data-fullscreen', !!state);

            // Set the fullscreen button's 'data-state' which allows the correct button image to be set via CSS
            $fullscreen
                .attr('data-state', !!state ? 'cancel-fullscreen' : 'go-fullscreen');
        }

        // Checks if the document is currently in fullscreen mode
        var isFullScreen = function() {
            return !!(document.fullScreen
                || document.webkitIsFullScreen
                || document.mozFullScreen
                || document.msFullscreenElement
                || document.fullscreenElement);
        }

        // Fullscreen
        var handleFullscreen = function() {
            // If fullscreen mode is active...    
            if (isFullScreen()) {
                // ...exit fullscreen mode
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
                else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                }
                else if (document.webkitCancelFullScreen) {
                    document.webkitCancelFullScreen();
                }
                else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }

                $fullscreen.find('i').removeClass('lowscreen').addClass('fullscreen');
                setFullscreenData(false);
            }
            else {
                // ...otherwise enter fullscreen mode
                var containerEl = $wrapper.get(0);

                if (containerEl.requestFullscreen) {
                    containerEl.requestFullscreen();
                }
                else if (containerEl.mozRequestFullScreen) {
                    containerEl.mozRequestFullScreen();
                }
                else if (containerEl.webkitRequestFullScreen) {
                    containerEl.webkitRequestFullScreen();
                }
                else if (containerEl.msRequestFullscreen) {
                    containerEl.msRequestFullscreen();
                }

                $fullscreen.find('i').removeClass('fullscreen').addClass('lowscreen');
                setFullscreenData(true);
            }
        }

        // Bind Fullscreen button
        $fullscreen.rebind('click', function(e) {
            handleFullscreen();
        });

        // Listen for fullscreen change events (from other controls, e.g. right clicking on the video itself)
        document.addEventListener('fullscreenchange', function(e) {
            setFullscreenData(!!(document.fullScreen || document.fullscreenElement));
        });
        document.addEventListener('webkitfullscreenchange', function() {
            setFullscreenData(!!document.webkitIsFullScreen);
        });
        document.addEventListener('mozfullscreenchange', function() {
            setFullscreenData(!!document.mozFullScreen);
        });
        document.addEventListener('msfullscreenchange', function() {
            setFullscreenData(!!document.msFullscreenElement);
        });
    }

    function isThumbnailMissing(n) {
        return !n.fa || n.fa.indexOf(':0*') < 0;
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
    function prepareAndViewPdfViewer() {
        M.require('pdfjs2', 'pdfviewer', 'pdfviewercss', 'pdforiginalviewerjs').done(function() {
            var myPage = pages['pdfviewer'];
            myPage = myPage.replace('^$#^1', window['pdfviewercss']);
            myPage = myPage.replace('^$#^3', window['pdfjs2']);
            myPage = myPage.replace('^$#^4', window['pdforiginalviewerjs']);
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
        });
    }

    function previewsrc(id) {
        var $overlay = $('.viewer-overlay');

        var src = Object(previews[id]).src;
        if (!src) {
            console.error('Cannot preview %s', id);
            return;
        }

        $overlay.removeClass('video video-theatre-mode');
        $overlay.find('.viewer-image-bl embed').addClass('hidden');
        $overlay.find('.viewer-image-bl video').addClass('hidden');
        $overlay.find('.viewer-image-bl img').removeClass('hidden');
        $('#pdfpreviewdiv1').addClass('hidden');

        if (previews[id].type === 'application/pdf') {
            $overlay.find('.viewer-pending').addClass('hidden');
            $overlay.find('.viewer-progress').addClass('hidden');
            $overlay.find('.viewer-image-bl img').addClass('hidden');
            $overlay.find('.viewer-image-bl').removeClass('default-state hidden');
            // preview pdfs using pdfjs for all browsers #8036
            // to fix pdf compatibility - Bug #7796
            localStorage.setItem('currPdfPrev2', JSON.stringify(src));
            prepareAndViewPdfViewer();
            api_req({a: 'log', e: 99660, m: 'Previewed PDF Document.'});
            return;
        }

        if (String(previews[id].type).startsWith('video')) {
            var maxWidth = Math.ceil(innerWidth * 70 / 100);

            $overlay.addClass('video');
            $overlay.find('.viewer-pending').addClass('hidden');
            // $overlay.find('.viewer-progress').addClass('hidden');
            $overlay.find('.viewer-image-bl img').addClass('hidden');
            $overlay.find('.viewer-image-bl').addClass('default-state').removeClass('hidden');
            $overlay.find('.viewer-image-bl video').attr('controls', false).removeClass('hidden');
            // TODO: Set preview image scr
            // $overlay.find('.viewer-image-bl video').attr('poster', src);

            if (!d) {
                api_req({a: 'log', e: 99668, m: 'video watch'});
            }
            return;
        }

        var img = new Image();
        img.onload = function() {
            var w = this.width;
            var h = this.height;
            if (w < 960 && w < $(window).width() - 382 && h < 522 && h < $(window).height() - 222) {
                $overlay.find('.viewer-image-bl').addClass('default-state');
            }
            else {
                $overlay.find('.viewer-image-bl').removeClass('default-state');
            }
            $overlay.find('.viewer-image-bl img').attr('src', this.src);
            $overlay.find('.viewer-image-bl').removeClass('hidden');
            $overlay.find('.viewer-pending').addClass('hidden');
            $overlay.find('.viewer-progress').addClass('hidden');
        };
        img.onerror = function(ev) {
            console.error('Preview image error', ev);
        };
        img.src = src;
    }

    function previewimg(id, uint8arr, type) {
        var blob;

        type = typeof type === 'string' && type || 'image/jpeg';

        try {
            blob = new Blob([uint8arr], {type: type});
        }
        catch (ex) {
        }
        if (!blob || blob.size < 25) {
            blob = new Blob([uint8arr.buffer], {type: type});
        }

        previews[id] = {
            blob: blob,
            type: type,
            time: Date.now(),
            src: myURL.createObjectURL(blob),
            buffer: uint8arr.buffer || uint8arr
        };

        if (id === slideshowid) {
            previewsrc(id);
        }

        if (Object.keys(previews).length === 1) {
            $(window).unload(function() {
                for (var id in previews) {
                    if (previews[id].src) {
                        myURL.revokeObjectURL(previews[id].src);
                    }
                }
            });
        }
    }

    global.slideshow = slideshow;
    global.slideshow_next = slideshow_next;
    global.slideshow_prev = slideshow_prev;
    global.slideshowsteps = slideshowsteps;
    global.previewsrc = previewsrc;
    global.previewimg = previewimg;

})(self);
