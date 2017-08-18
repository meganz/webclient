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
                            initCopyrightsDialog([slideshowid]);
                        }
                    });
            }
        }

        return n || false;
    }

    function slideshow(id, close) {
        var $overlay = $('.viewer-overlay');

        $overlay.removeClass('fullscreen mouse-idle');

        if (d) {
            console.log('slideshow', id, close, slideshowid);
        }

        if (close) {
            slideshowid = false;
            $overlay.addClass('hidden');
            if ($(document).fullScreen()) {
                clearTimeout(fullScreenTimer);
                $(document).fullScreen(false);
                $(document).unbind('mousemove.mediaviewer');
            }
            for (var i in dl_queue) {
                if (dl_queue[i] && dl_queue[i].id === id) {
                    if (dl_queue[i].preview) {
                        dlmanager.abort(dl_queue[i]);
                    }
                    break;
                }
            }
            return false;
        }
        var n = slideshow_node(id, $overlay);

        // Close icon
        $overlay.find('.viewer-button.close,.viewer-error-close')
            .rebind('click', function() {
                slideshow(id, 1);
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
        });

        var $dlBut = $overlay.find('.viewer-button.download');
        $dlBut.rebind('click', function() {

            for (var i in dl_queue) {
                if (dl_queue[i] && dl_queue[i].id === slideshowid) {
                    dl_queue[i].preview = false;
                    openTransfersPanel();
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

        if (n.p) {
            $dlBut.removeClass('hidden');
        }
        else {
            $dlBut.addClass('hidden');
        }

        if (previews[n.h]) {
            previewsrc(previews[n.h].src);
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

        var n = slideshow_node(id);
        if (!n) {
            console.error('handle "%s" not found...', id);
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
        api_getfileattr(treq, 1, function(ctx, h, uint8arr) {
            previewimg(h, uint8arr);

            if (!n.fa || n.fa.indexOf(':0*') < 0) {
                if (d) {
                    console.log('Thumbnail found missing on preview, creating...', h, n);
                }
                var aes = new sjcl.cipher.aes([
                    n.k[0] ^ n.k[4],
                    n.k[1] ^ n.k[5],
                    n.k[2] ^ n.k[6],
                    n.k[3] ^ n.k[7]
                ]);
                createnodethumbnail(n.h, aes, h, uint8arr);
            }
            if (h === slideshowid) {
                fetchnext();
            }
        }, eot);
    }

    function previewsrc(src) {
        var img = new Image();
        var $overlay = $('.viewer-overlay');
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
        img.src = src;
    }

    function previewimg(id, uint8arr) {
        var blob;

        try {
            blob = new Blob([uint8arr], {type: 'image/jpeg'});
        }
        catch (err) {
        }
        if (!blob || blob.size < 25) {
            blob = new Blob([uint8arr.buffer]);
        }
        previews[id] =
            {
                blob: blob,
                src: myURL.createObjectURL(blob),
                time: new Date().getTime()
            };
        if (id === slideshowid) {
            previewsrc(previews[id].src);
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
