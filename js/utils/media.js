function is_rawimage(name, ext) {
    'use strict';

    ext = ext || String(name).split('.').pop().toUpperCase();

    return is_image.raw[ext] && ext;
}

function is_video(n) {
    'use strict';

    var ext = String(n && n.name || n).split('.').pop().toUpperCase();

    return !window.safari && is_video.ext[ext];
}

is_video.ext = {
    'MP4': -1,
    'M4V': -1
};

if (d) {
    is_video.ext.MOV = 1;
}

function is_image(name) {
    'use strict';

    if (name) {
        if (typeof name === 'object') {
            name = name.name;
        }
        var ext = String(name).split('.').pop().toUpperCase();

        return is_image.def[ext] || is_rawimage(null, ext) || mThumbHandler.has(0, ext);
    }

    return false;
}

is_image.def = {
    'JPG': 1,
    'JPEG': 1,
    'GIF': 1,
    'BMP': 1,
    'PNG': 1,
    'HEIC': 1
};

is_image.raw = {
    // http://www.sno.phy.queensu.ca/~phil/exiftool/#supported
    // let raw = {}; for(let tr of document.querySelectorAll('.norm.tight.sm.bm tr'))
    //   if (tr.childNodes.length > 2 && ~tr.childNodes[2].textContent.indexOf('RAW'))
    //     raw[tr.childNodes[0].textContent] = tr.childNodes[2].textContent;
    "3FR": "Hasselblad RAW (TIFF-based)",
    "ARW": "Sony Alpha RAW (TIFF-based)",
    "CR2": "Canon RAW 2 (TIFF-based)",
    "CRW": "Canon RAW Camera Image File Format (CRW spec.)",
    "CIFF": "Canon RAW Camera Image File Format (CRW spec.)",
    "CS1": "Sinar CaptureShop 1-shot RAW (PSD-based)",
    "DCR": "Kodak Digital Camera RAW (TIFF-based)",
    "DNG": "Digital Negative (TIFF-based)",
    "ERF": "Epson RAW Format (TIFF-based)",
    "IIQ": "Phase One Intelligent Image Quality RAW (TIFF-based)",
    "K25": "Kodak DC25 RAW (TIFF-based)",
    "KDC": "Kodak Digital Camera RAW (TIFF-based)",
    "MEF": "Mamiya (RAW) Electronic Format (TIFF-based)",
    "MOS": "Leaf Camera RAW File",
    "MRW": "Minolta RAW",
    "NEF": "Nikon (RAW) Electronic Format (TIFF-based)",
    "NRW": "Nikon RAW (2) (TIFF-based)",
    "ORF": "Olympus RAW Format (TIFF-based)",
    "PEF": "Pentax (RAW) Electronic Format (TIFF-based)",
    "RAF": "FujiFilm RAW Format",
    "RAW": "Panasonic RAW (TIFF-based)",
    "RW2": "Panasonic RAW 2 (TIFF-based)",
    "RWL": "Leica RAW (TIFF-based)",
    "SR2": "Sony RAW 2 (TIFF-based)",
    "SRF": "Sony RAW Format (TIFF-based)",
    "SRW": "Samsung RAW format (TIFF-based)",
    "TIF": "Tagged Image File Format",
    "TIFF": "Tagged Image File Format",
    "X3F": "Sigma/Foveon RAW"
};

var mThumbHandler = {
    sup: Object.create(null),

    add: function(exts, parser) {
        'use strict';

        exts = String(exts).split(',');

        for (var i = exts.length; i--;) {
            this.sup[exts[i].toUpperCase()] = parser;
        }
    },

    has: function(name, ext) {
        'use strict';

        ext = ext || String(name).split('.').pop().toUpperCase();

        return this.sup[ext];
    }
};

mThumbHandler.add('PSD', function PSDThumbHandler(ab, cb) {
    'use strict';

    // http://www.awaresystems.be/imaging/tiff/tifftags/docs/photoshopthumbnail.html
    var logger = MegaLogger.getLogger('crypt');
    var u8 = new Uint8Array(ab);
    var dv = new DataView(ab);
    var len = u8.byteLength;
    var i = 0;
    var result;
    if (d) {
        console.time('psd-proc');
    }

    while (len > i + 12) {
        if (u8[i] === 0x38 && u8[i + 1] === 0x42 && u8[i + 2] === 0x49 && u8[i + 3] === 0x4d) // 8BIM
        {
            var ir = dv.getUint16(i += 4);
            var ps = dv.getUint8(i += 2) + 1;

            if (ps % 2) {
                ++ps;
            }
            var rl = dv.getUint32(i += ps);

            i += 4;
            if (len < i + rl) {
                break;
            }

            if (ir === 1033 || ir === 1036) {
                logger.debug('Got thumbnail resource at offset %d with length %d', i, rl);

                i += 28;
                result = ab.slice(i, i + rl);
                break;
            }

            i += rl;
        }
        else {
            ++i;
        }
    }
    if (d) {
        console.timeEnd('psd-proc');
    }
    cb(result);
});

mThumbHandler.add('PDF', function PDFThumbHandler(ab, cb) {
    'use strict';

    M.require('pdfjs').tryCatch(function() {
        var timeTag = 'pdfjs.' + makeUUID();

        if (d) {
            console.debug('Using pdf.js %s (%s)', PDFJS.version, PDFJS.build);
            console.time(timeTag);
        }

        PDFJS.verbosity = d ? 10 : 0;
        PDFJS.isEvalSupported = false;
        PDFJS.workerSrc = (is_extension ? '' : '/') + 'pdf.worker.js';

        PDFJS.getDocument(ab).then(function(pdf) {
            pdf.getPage(1).then(function(page) {
                var scale = 2.5;
                var viewport = page.getViewport(scale);

                // Prepare canvas using PDF page dimensions
                var canvas = document.createElement('canvas');
                var context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                // Render PDF page into canvas context
                var renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };
                var renderTask = page.render(renderContext);
                renderTask.then(function() {
                    ab = dataURLToAB(canvas.toDataURL('image/png'));

                    if (d) {
                        console.timeEnd(timeTag);
                        console.log('pdf2img %sx%s (%s bytes)', canvas.width, canvas.height, ab.byteLength);
                    }
                    cb(ab);
                    api_req({a: 'log', e: 99661, m: 'Generated PDF thumbnail.'});
                });
            });
        });
    });
});

mThumbHandler.add('SVG', function SVGThumbHandler(ab, cb) {
    'use strict';

    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var image = new Image();
    image.onload = function() {
        canvas.height = image.height;
        canvas.width = image.width;
        ctx.drawImage(image, 0, 0);
        cb(dataURLToAB(canvas.toDataURL('image/png')));
    };
    image.src = 'data:image/svg+xml;charset=utf-8,'
        + encodeURIComponent(ab_to_str(ab).replace(/foreignObject|script/g, 'desc'));
});

if (!window.chrome || (parseInt(String(navigator.appVersion).split('Chrome/').pop()) | 0) < 56) {
    delete mThumbHandler.sup.SVG;
}


// ---------------------------------------------------------------------------------------------------------------

(function _initVideoStream(global) {
    'use strict';

    // Init custom video controls
    var _initVideoControls = function(wrapper, streamer) {
        var $wrapper = $(wrapper);
        var $video = $wrapper.find('video');
        var videoElement = $video.get(0);
        var $videoContainer = $video.parent();
        var $videoControls = $wrapper.find('.video-controls');
        var $document = $(document);
        var timer;

        // Hide the default controls
        videoElement.controls = false;

        // Obtain handles to buttons and other elements
        var $playpause = $videoControls.find('.playpause');
        var $mute = $videoControls.find('.mute');
        var $progress = $videoControls.find('.video-progress-bar');
        var $progressBar = $videoControls.find('.video-time-bar');
        var $fullscreen = $videoControls.find('.fs');
        var $volumeBar = $videoControls.find('.volume-bar');

        // Wait for the video's meta data to be loaded, then set
        // the progress bar's max value to the duration of the video
        $video.rebind('loadedmetadata', function() {
            $wrapper.find('.video-timing.duration')
                .text(secondsToTimeShort(videoElement.duration, 1));
        });

        // Changes the button state of certain button's so the correct visuals can be displayed with CSS
        var changeButtonState = function(type) {
            // Play/Pause button
            if (type === 'playpause') {
                if (videoElement.paused || videoElement.ended) {
                    $playpause.find('i').removeClass('pause').addClass('play');
                }
                else {
                    $playpause.find('i').removeClass('play').addClass('pause');
                }
            }
            // Mute button
            else if (type === 'mute') {
                if (videoElement.muted) {
                    $mute.find('i').removeClass('volume').addClass('volume-muted');
                }
                else {
                    $mute.find('i').removeClass('volume-muted').addClass('volume');
                }
            }
        };

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

        var playevent;
        $video.rebind('playing', function() {
            if (videoElement && videoElement.duration) {
                $wrapper.find('.viewer-pending').addClass('hidden');

                if (!playevent) {
                    playevent = true;

                    // play/pause on click
                    $video.rebind('click', function() {
                        $playpause.trigger('click');
                    });

                    // jump to full screen on double-click
                    $video.rebind('dblclick', function() {
                        $fullscreen.trigger('click');
                    });
                }
            }
        });

        // Add events for all buttons
        $playpause.rebind('click', function() {
            if (videoElement.paused || videoElement.ended) {
                if (dlmanager.isOverQuota) {
                    dlmanager.showOverQuotaDialog();
                }
                else {
                    streamer.play();
                }
            }
            else {
                videoElement.pause();
            }
        });

        // Volume Bar control
        var volumeDrag = false;
        /* Drag status */
        $volumeBar.rebind('mousedown.volumecontrol', function(e) {
            volumeDrag = true;
            updateVolumeBar(e.pageY);
        });

        $document.rebind('mouseup.volumecontrol', function(e) {
            if (volumeDrag) {
                volumeDrag = false;
                updateVolumeBar(e.pageY);
            }
        });

        $document.rebind('mousemove.volumecontrol', function(e) {
            if (volumeDrag) {
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
                $this.find('span').css('height', percentage + '%');
                videoElement.volume = percentage / 100;
            }
            else {
                if (!videoElement.muted) {
                    var currentVolume = videoElement.volume * 100;
                    $this.find('span').css('height', currentVolume + '%');
                }
                else {
                    $this.find('span').css('height', '0%');
                }
            }
        };
        updateVolumeBar();

        // Bind Mute button
        $mute.rebind('click', function() {
            videoElement.muted = !videoElement.muted;
            changeButtonState('mute');
            updateVolumeBar();
        });

        // As the video is playing, update the progress bar
        $video.rebind('timeupdate', function() {
            var currentPos = videoElement.currentTime;
            var maxduration = videoElement.duration;
            var percentage = 100 * currentPos / maxduration;
            $progressBar.css('width', percentage + '%');

            $wrapper.find('.video-timing.current')
                .text(secondsToTimeShort(videoElement.currentTime, 1));
        });

        $video.rebind('mousemove.idle', function() {
            $wrapper.removeClass('mouse-idle');
            clearTimeout(timer);
            timer = setTimeout(function() {
                $wrapper.addClass('mouse-idle');
            }, 2600);
        });

        $videoControls.rebind('mousemove.idle', function() {
            clearTimeout(timer);
        });

        /* Drag status */
        var timeDrag = false;
        $progress.rebind('mousedown.videoprogress', function(e) {
            timeDrag = true;
            videoElement.pause();
            onIdle(updatebar.bind(0, e.pageX));
        });

        $document.rebind('mouseup.videoprogress', function(e) {
            if (timeDrag) {
                timeDrag = false;
                updatebar(e.pageX);
                if (streamer._events.indexOf('seeking') < 0) {
                    streamer.play();
                }
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

            //Check within range
            if (percentage > 100) {
                percentage = 100;
            }
            else if (percentage < 0) {
                percentage = 0;
            }
            var selectedTime = Math.round(maxduration * percentage / 100);

            //Update progress bar and video currenttime
            $progressBar.css('width', percentage + '%');
            $wrapper.find('.video-timing.current')
                .text(secondsToTimeShort(selectedTime, 1));

            if (!timeDrag) {
                videoElement.currentTime = selectedTime | 0;
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
            $fullscreen.attr('data-state', state ? 'cancel-fullscreen' : 'go-fullscreen');
        };

        // Checks if the document is currently in fullscreen mode
        var isFullScreen = function() {
            return !!(document.fullScreen
                || document.webkitIsFullScreen
                || document.mozFullScreen
                || document.msFullscreenElement
                || document.fullscreenElement);
        };

        // Bind Fullscreen button
        $fullscreen.rebind('click', function() {
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
                var containerEl = page === 'download' ? $wrapper.find('.video-block').get(0) : $wrapper.get(0);

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
        });

        // Listen for fullscreen change events (from other controls, e.g. right clicking on the video itself)
        document.addEventListener('fullscreenchange', function() {
            setFullscreenData(!!(document.fullScreen || document.fullscreenElement));
        });
        document.addEventListener('webkitfullscreenchange', function() {
            setFullscreenData(document.webkitIsFullScreen);
        });
        document.addEventListener('mozfullscreenchange', function() {
            setFullscreenData(!!document.mozFullScreen);
        });
        document.addEventListener('msfullscreenchange', function() {
            setFullscreenData(!!document.msFullscreenElement);
        });

        $wrapper.rebind('video-destroy', function(ev) {
            clearTimeout(timer);
            $wrapper.removeClass('mouse-idle');
            $video.unbind('mousemove.idle');
            $document.unbind('mousemove.videoprogress');
            $document.unbind('mouseup.videoprogress');
            $document.unbind('mousemove.volumecontrol');
            $document.unbind('mouseup.volumecontrol');
            return false;
        });
    };

    var _initVideoStream = function(node, $wrapper, destroy, options) {
        if (typeof destroy === 'object') {
            options = destroy;
            destroy = null;
        }
        var s = Streamer(node.link || node.h, $wrapper.find('video').get(0), options);

        _initVideoControls($wrapper, s);

        destroy = destroy || s.destroy.bind(s);

        s.on('error', function(ev, error) {
            // <video>'s element `error` handler
            if (!$.dialog) {
                msgDialog('warninga', l[135], l[47], error.message || error);
            }
            if (d) {
                console.debug('ct=%s, buf=%s', this.video.currentTime, this.stream.bufTime);
            }
            destroy();

            if (filemime(node) !== 'video/quicktime' && !d) {
                api_req({a: 'log', e: 99669, m: 'stream error'});
            }
        });

        return s;
    };

    /**
     * Fire video stream
     * @param {MegaNode} node An ufs node
     * @param {Object} wrapper Video element wrapper
     * @param {Function} [destroy] Function to invoke when the video is destroyed
     * @param {Object} [options] Streamer options
     * @global
     */
    global.initVideoStream = function(node, wrapper, destroy, options) {
        return new MegaPromise(function(resolve, reject) {
            M.require('videostream').tryCatch(function() {
                resolve(_initVideoStream(node, wrapper, destroy, options));
            }, function(ex) {
                msgDialog('warninga', l[135], l[47], ex);
                reject(ex);
            });
        });
    };
})(self);

// ---------------------------------------------------------------------------------------------------------------

(function _MediaInfoLib(global) {
    'use strict';

    var mediaCodecs = null;
    var mediaInfoLib = null;
    var mediaInfoTasks = null;
    var mediaInfoExtensions =
        '.264.265.3g2.3ga.3gp.3gpa.3gpp.3gpp2.aac.aacp.ac3.act.adts.aif.aifc.aiff.als.apl.at3.avc' +
        '.avi.dd+.dde.divx.dts.dtshd.eac3.ec3.evo.f4a.f4b.f4v.flac.gvi.h261.h263.h264.h265.hevc.isma' +
        '.ismt.ismv.ivf.jpm.k3g.m1a.m1v.m2a.m2p.m2s.m2t.m2v.m4a.m4b.m4p.m4s.m4t.m4v.m4v.mac.mkv.mk3d' +
        '.mka.mks.mlp.mov.mp1.mp1v.mp2.mp2v.mp3.mp4.mp4v.mpa1.mpa2.mpeg.mpg.mpgv.mpv.mqv.ogg.ogm.ogv' +
        '.omg.opus.qt.sls.spx.thd.tmf.trp.ts.ty.vc1.vob.vr.w64.wav.webm.wma.wmv.';

    if (d > 7) {
        mediaInfoExtensions +=
            '.aa3.amr.ape.asf.au.caf.dif.drc.dv.jpx.la.lxf.mpc.mp+.mtv.nsv.nut.oma.pss.qcp.rka.shn.tak.tp.vqf.wv.y4m.';
    }

    /**
     * Creates a new MediaInfo report. Do not use except for instanceof tests.
     * @constructor
     * @private
     */
    var MediaInfoReport = function MediaInfoReport() {
        var data = JSON.parse(mediaInfoLib.inform());
        var keys = Object.keys(data);

        for (var i = keys.length; i--;) {
            var k = keys[i];
            var v = data[k];

            if (Array.isArray(v)) {
                var a = [];

                for (var j = v.length; j--;) {
                    a.unshift(Object.assign(Object.create(null), v[j]));
                }

                v = a.map(Object.freeze);
            }
            else {
                v = Object.assign(Object.create(null), v);
            }

            Object.defineProperty(this, k, {value: Object.freeze(v), enumerable: true});
        }
    };
    MediaInfoReport.prototype = Object.create(null);

    Object.defineProperty(MediaInfoReport.prototype, 'getCodecID', {
        value: function(type, codec) {
            return mediaCodecs && mediaCodecs[type] && Object(mediaCodecs[type][codec]).idx | 0;
        }
    });
    Object.defineProperty(MediaInfoReport.prototype, 'getCodec', {
        value: function(type) {
            var codec = Object(this[type] && this[type][0]);
            if (codec.CodecID || codec.Format) {
                codec = String(codec.CodecID || codec.Format).split(' / ');

                for (var i = codec.length; i--;) {
                    if (this.getCodecID(type.toLowerCase(), codec[i])) {
                        return codec[i];
                    }
                }

                return String(codec);
            }

            return '';
        }
    });
    Object.defineProperty(MediaInfoReport.prototype, 'container', {
        get: function() {
            return this.General && (this.General.CodecID || this.General.Format) || '';
        }
    });
    Object.defineProperty(MediaInfoReport.prototype, 'acodec', {
        get: function() {
            return this.getCodec('Audio');
        }
    });
    Object.defineProperty(MediaInfoReport.prototype, 'vcodec', {
        get: function() {
            return this.getCodec('Video');
        }
    });
    Object.defineProperty(MediaInfoReport.prototype, 'playtime', {
        get: function() {
            var a = Object(this.Audio && this.Audio[0]);
            var v = Object(this.Video && this.Video[0]);
            return (this.General && this.General.Duration || v.Duration || a.Duration || 0) / 1e3;
        }
    });
    Object.defineProperty(MediaInfoReport.prototype, 'width', {
        get: function() {
            var v = Object(this.Video && this.Video[0]);
            return v.Width | 0;
        }
    });
    Object.defineProperty(MediaInfoReport.prototype, 'height', {
        get: function() {
            var v = Object(this.Video && this.Video[0]);
            return v.Height | 0;
        }
    });
    Object.defineProperty(MediaInfoReport.prototype, 'shortformat', {
        get: function() {
            var fmt = this.container + ':' + this.vcodec + ':' + this.acodec;
            return (mediaCodecs && Object(mediaCodecs.shortformat)[fmt]) | 0;
        }
    });
    Object.defineProperty(MediaInfoReport.prototype, 'fps', {
        get: function() {
            var v = Object(this.Video && this.Video[0]);
            var fps = v.FrameRate || this.General && this.General.FrameRate;

            if (!fps) {
                if (v.FrameRate_Den && v.FrameRate_Num) {
                    fps = v.FrameRate_Num / v.FrameRate_Den;
                }

                fps = fps || v.FrameRate_Original;
            }

            return parseFloat(fps) || 0;
        }
    });
    Object.defineProperty(MediaInfoReport.prototype, 'containerid', {
        get: function() {
            return this.getCodecID('container', this.container);
        }
    });
    Object.defineProperty(MediaInfoReport.prototype, 'vcodecid', {
        get: function() {
            return this.getCodecID('video', this.vcodec);
        }
    });
    Object.defineProperty(MediaInfoReport.prototype, 'acodecid', {
        get: function() {
            return this.getCodecID('audio', this.acodec);
        }
    });

    /**
     * Instantiates a new instance for mediainfo inspection.
     * @param {String|Object} [entry] The entry to analyze.
     * @param {Object} [options] Options such as chunkSize etc
     * @returns {MediaInfoLib}
     * @constructor
     */
    var MediaInfoLib = function MediaInfoLib(entry, options) {
        if (!(this instanceof MediaInfoLib)) {
            return new MediaInfoLib(entry, options);
        }
        if (typeof options === 'number') {
            options = {chunkSize: options};
        }

        options = Object(options);
        var chunkSize = options.chunkSize;

        this.entry = entry;

        if (!entry || entry instanceof Blob) {
            this.fetcher = this._fileReader;
        }
        else {
            this.fetcher = this._gfsReader;
            chunkSize = chunkSize || 0x40000;
        }

        this.options = options;
        this.chunkSize = chunkSize || 0x400000;
    };
    MediaInfoLib.prototype = Object.create(null);
    MediaInfoLib.prototype.constructor = MediaInfoLib;

    MediaInfoLib.build = 1;
    MediaInfoLib.version = 1710;

    /**
     * Retrieve an object name.
     * @param {File|MegaNode|String} n The entry to get the name from
     * @returns {String}
     */
    MediaInfoLib.getObjectName = function(n) {
        return String(n && n.name || Object(M.d[n]).name || n);
    };

    /**
     * Checks whether the provided file object can be parsed by mediainfo
     * @param {File|MegaNode|String} n The entry to get the name from, as per getObjectName()
     * @returns {Boolean}
     */
    MediaInfoLib.isFileSupported = function(n) {
        var ext = fileext(MediaInfoLib.getObjectName(n));

        return mediaInfoExtensions.indexOf('.' + ext + '.') >= 0;
    };

    /**
     * Retrieve the Media Codecs list, either from API or indexedDB
     * @returns {Promise}
     */
    MediaInfoLib.getMediaCodecsList = function() {
        if (mediaCodecs) {
            if (mediaCodecs instanceof Promise) {
                return mediaCodecs;
            }

            return Promise.resolve(mediaCodecs);
        }

        mediaCodecs = new Promise(function(resolve, reject) {
            var timer;
            var dbname = '$mcv1';
            var db = new Dexie(dbname);
            var apiReq = function() {
                M.req('mc').fail(reject).done(function(res) {
                    if (!Array.isArray(res) || res.length !== 2) {
                        if (d) {
                            console.warn('Unexpected response, will keep using cached codecs..if any', res);
                        }
                        return reject(res);
                    }

                    var data = {
                        container: {byIdx: {}},
                        video: {byIdx: {}},
                        audio: {byIdx: {}},
                        shortformat: {byIdx: {}}
                    };
                    var keys = Object.keys(data);
                    var stringify = function(s) {
                        return String(s || '');
                    };

                    for (var i = 0; i < res[1].length; i++) {
                        var sec = res[1][i];
                        var key = keys[i];
                        if (i > 2) {
                            for (var j = 0; j < sec.length; j++) {
                                var fmt =
                                    stringify(data.container.byIdx[sec[j][1]])
                                    + ':' + stringify(data.video.byIdx[sec[j][2]])
                                    + ':' + stringify(data.audio.byIdx[sec[j][3]]);
                                data[key][fmt] = sec[j][0];
                                data[key].byIdx[sec[j][0]] = fmt;
                            }
                        }
                        else {
                            for (var x = 0; x < sec.length; x++) {
                                var id = sec[x][0];
                                var codec = sec[x][1];
                                data[key][codec] = {idx: id, mime: stringify(sec[x][2])};
                                data[key].byIdx[id] = codec;
                            }
                        }
                    }

                    if (!data.shortformat['mp42:avc1:mp4a-40-2']) {
                        if (d) {
                            console.warn('Invalid mediaCodecs list...', data);
                        }
                        return reject(EFAILED);
                    }

                    mediaCodecs = data;
                    data.version = res[0] | 0;
                    db.kv.put({k: 'l', t: Date.now(), v: data});
                    resolve(mediaCodecs);
                });
            };
            var read = function() {
                db.kv.get('l').then(function(r) {
                    if (r) {
                        mediaCodecs = r.v;

                        if (Date.now() < r.t + 864e6) {
                            clearTimeout(timer);
                            resolve(mediaCodecs);
                        }
                    }
                });
            };

            reject = (function(reject) {
                return function(e) {
                    if (mediaCodecs instanceof Promise) {
                        mediaCodecs = false;
                        if (d) {
                            console.warn('Media codecs list retrieval failed...', e);
                        }
                        reject(e);
                    }
                    else {
                        resolve(mediaCodecs);
                    }
                };
            })(reject);

            db.version(1).stores({kv: '&k'});
            db.open().then(read).catch(console.warn.bind(console, dbname));
            timer = setTimeout(apiReq, 800);

            // save the db name for our getDatabaseNames polyfill
            localStorage['_$mdb$' + dbname] = 1;
        });

        return mediaCodecs;
    };

    /**
     * Collect mediainfo metadata from a list of provided entries
     * @param {Array|FileList} entries An iterable list of entries
     * @param {Object} [options]
     * @returns {Promise}
     */
    MediaInfoLib.collect = function(entries, options) {
        return new Promise(function(resolve) {
            var pending = 0;
            var bytesRead = 0;
            var totalBytes = 0;
            var result = Object.create(null);
            var summary = Object.create(null);
            var saveNode = function(n, err, res) {
                if (err) {
                    result[n.h] = new Error(err);
                }
                else {
                    res.n = n;
                    result[n.h] = res;
                    bytesRead += res.bytesRead;
                    summary[n.h] = n.h + ':...' + String(n.name).substr(-7)
                        + ':' + res.container + ':' + res.vcodec + ':' + res.acodec;
                }

                if (!--pending) {
                    result.summary = summary;
                    result.totalBytes = totalBytes;
                    result.totalBytesRead = bytesRead;
                    resolve(result);
                }
            };
            var parse = function(n) {
                totalBytes += n.s;

                MediaInfoLib(n.file || n.h, options)
                    .getMetadata()
                    .then(function(res) {
                        saveNode(n, false, res);
                    })
                    .catch(function(err) {
                        saveNode(n, err || true);
                    });
            };

            options = Object.assign({
                maxAtOnce: 10,
                chunkSize: 65536,
                maxBytesRead: 6291456
            }, options);

            for (var i = entries.length; i--;) {
                var entry = new MediaAttribute(entries[i]);

                if (MediaInfoLib.isFileSupported(entry) && entry.weak) {
                    parse(entry);
                    if (++pending > options.maxAtOnce) {
                        break;
                    }
                }
            }

            if (pending < 1) {
                resolve({});
            }
        });
    };

    /**
     * Test files against mediainfo
     * @param {FileList} files An iterable list of Files
     * @private
     */
    MediaInfoLib.test = function(files) {
        var extensions = Object.create(null);

        for (var i = files.length; i--;) {
            extensions[fileext(files[i].name)] = 1;
        }

        console.time('MediaInfoLibTest');

        MediaInfoLib.collect(files, {
            maxAtOnce: 0x20000,
            chunkSize: 0x400000,
            maxBytesRead: 0x1000000
        }).then(function(res) {
            var containers = [];
            var audiocodecs = [];
            var videocodecs = [];
            var unknown = [];
            var newaudio = [];
            var newvideo = [];
            var newcontainer = [];
            var errors = [];
            var overread = [];
            var overtime = [];
            var combos = {};
            var cnt = 0;

            console.debug('MediaInfo.collect result', res);

            for (var k in res) {
                if (res[k] instanceof MediaInfoReport) {
                    var r = res[k];
                    var n = r.n;
                    var combo = r.container + ':' + r.vcodec + ':' + r.acodec;

                    if (!combos[combo]) {
                        combos[combo] = 1;
                    }
                    else {
                        combos[combo]++;
                    }

                    r.fa = n.toAttributeString(r);
                    r.a = n.fromAttributeString(r.fa);

                    containers.push(r.container);
                    audiocodecs.push(r.acodec);
                    videocodecs.push(r.vcodec);

                    if (!r.containerid) {
                        newcontainer.push(r.container);
                    }
                    if (!r.vcodecid) {
                        newvideo.push(r.vcodec);
                    }
                    if (!r.acodecid) {
                        newaudio.push(r.acodec);
                    }

                    if (r.a.shortformat === 0xff) {
                        unknown.push(r);
                    }

                    if (r.bytesRead > 0x1000000) {
                        overread.push(r);
                    }
                    if (r.entry.took > 450) {
                        overtime.push(r);
                    }

                    ++cnt;
                }
                else if (res[k] instanceof Error) {
                    errors.push(res[k]);
                }
            }

            console.log('containers', array.unique(containers).filter(String));
            console.log('audiocodecs', array.unique(audiocodecs).filter(String));
            console.log('videocodecs', array.unique(videocodecs).filter(String));
            console.log('new-containers', array.unique(newcontainer).filter(String));
            console.log('new-audiocodecs', array.unique(newaudio).filter(String));
            console.log('new-videocodecs', array.unique(newvideo).filter(String));
            console.log('Unknown(shortformat=255)', unknown.length ? unknown : 'NONE!');
            console.log('Files with errors', errors.length ? errors : 'NONE!');
            console.log('overread', overread.length ? overread : 'NONE!');
            console.log('overtime', overtime.length ? overtime : 'NONE!');
            console.log('extensions', Object.keys(extensions));
            console.log('combos', combos);
            console.log('MediaInfoLib.test finished, processed %s/%s (%s%% media) files, %s%% were unrecognized',
                cnt, files.length, cnt * 100 / files.length | 0, unknown.length * 100 / cnt | 0);

            console.timeEnd('MediaInfoLibTest');

        }).catch(console.warn.bind(console));
    };

    /**
     * Returns the Media Codecs list, if already retrieved...
     * @name avflist
     */
    Object.defineProperty(MediaInfoLib, 'avflist', {
        get: function() {
            return mediaCodecs;
        }
    });

    /**
     * Inspect file with mediainfo
     * @param {File|MegaNode|String} [file] The file entry to inspect, if not provided with the constructor
     * @returns {Promise}
     */
    MediaInfoLib.prototype.getMetadata = function(file) {
        var self = this;
        file = file || self.entry;

        return new Promise(function(resolve, reject) {
            /*if (!MediaInfoLib.isFileSupported(file)) {
                // unsupported/non-media file.
                return reject(null);
            }*/

            reject = self._wrapOnNextTask(reject);
            resolve = self._wrapOnNextTask(resolve);

            var task = [file, resolve, reject];
            if (mediaInfoTasks) {
                mediaInfoTasks.push(task);
            }
            else {
                mediaInfoTasks = [];

                Promise.all([
                    self._loadMediaInfo(),
                    MediaInfoLib.getMediaCodecsList()
                ]).then(self._parseMediaFile.bind(self, task)).catch(reject);
            }
        });
    };

    /**
     * Load mediainfo.js
     * @returns {Promise}
     * @private
     */
    MediaInfoLib.prototype._loadMediaInfo = function() {
        return new Promise(function(resolve, reject) {
            if (mediaInfoLib) {
                resolve();
            }
            else {
                var xhr = getxhr();
                var urlPath = is_extension ? '' : '/';
                var memFile = urlPath + 'mediainfo.mem';

                xhr.open('GET', memFile);
                xhr.responseType = 'arraybuffer';
                xhr.send(null);

                M.require('mediainfo')
                    .tryCatch(function() {
                        var options = {
                            memoryInitializerRequest: xhr,
                            memoryInitializerPrefixURL: urlPath
                        };
                        MediaInfo(options)
                            .then(function(lib) {
                                mediaInfoLib = lib;
                                if (d) {
                                    global.mediaInfoLib = lib;
                                    console.log('Using %s', lib.getOption('info_version'));
                                }
                                resolve();
                            }).catch(reject);
                    }, reject);
            }
        });
    };

    /**
     * Dispatch next queued task, if any
     * @private
     */
    MediaInfoLib.prototype._dspNextTask = function() {
        var nextTask = mediaInfoTasks && mediaInfoTasks.pop();

        if (nextTask) {
            onIdle(this._parseMediaFile.bind(this, nextTask));
        }
        else {
            mediaInfoTasks = false;
        }

        // in case it was used
        if (mediaInfoLib) {
            mediaInfoLib.close();
        }
    };

    /**
     * Wrap a function call through auto-dispatching of queued pending tasks
     * @param {Function} callback
     * @returns {Function}
     * @private
     */
    MediaInfoLib.prototype._wrapOnNextTask = function(callback) {
        var self = this;

        return function _miTaskDSP() {
            self._dspNextTask();
            return callback.apply(this, arguments);
        };
    };

    /**
     * MediaInfo parsing logic used by getMetadata()
     * @param {Array} task
     * @private
     */
    MediaInfoLib.prototype._parseMediaFile = function(task) {
        var self = this;
        var entry = {file: task[0]};
        var reject = task[2].bind(this);
        var resolve = task[1].bind(this);
        var initialized = false;

        if (!mediaCodecs) {
            if (d) {
                console.warn('will not parse this media file since no media codecs list found...', entry);
            }
            return reject(ENOENT);
        }

        if (d) {
            console.time('mediaInfoLibTask');
        }

        var bytesRead = 0;
        var byteOffset = 0;
        var took = Date.now();
        (function _nextChunk(byteLength) {
            self.fetcher(entry, byteOffset, byteLength)
                .then(function(chunk) {
                    var file = entry.file;

                    if (!initialized) {
                        if (!mediaInfoLib.openBufferInit(file.size, 0)) {
                            return reject(EFAILED);
                        }
                        initialized = true;
                    }

                    var finished = false;
                    var length = chunk.byteLength;
                    var state = mediaInfoLib.openBufferContinue(chunk, length);
                    bytesRead += length;

                    if (state & 8 || !length) {
                        if (d && !length) {
                            console.warn('MediaInfoLib(%s:%s) Premature EOF!', file.name, file.size);
                        }
                        finished = true;
                    }
                    else if (bytesRead > self.options.maxBytesRead) {
                        if (d) {
                            console.debug('MediaInfoLib(%s:%s) maxBytesRead...', file.name, file.size, bytesRead);
                        }
                        finished = true;
                    }
                    else {
                        var seekTo = mediaInfoLib.openBufferGetSeekTo();

                        if (d) {
                            console.debug('MediaInfoLib(%s:%s) len=%s, state=%s, offset=%s',
                                file.name, file.size, length, state, byteOffset, seekTo);
                        }

                        if (seekTo === -1) {
                            byteOffset += length;

                            if (byteOffset === file.size) {
                                if (d) {
                                    console.debug('MediaInfoLib(%s:%s) EOF Reached.', file.name, file.size);
                                }
                                finished = true;
                            }
                        }
                        else if (seekTo === file.size) {
                            if (d) {
                                console.debug('MediaInfoLib(%s:%s) No more data needed.', file.name, file.size);
                            }
                            finished = true;
                        }
                        else {
                            byteOffset = seekTo;
                            mediaInfoLib.openBufferInit(file.size, seekTo);
                        }
                    }

                    if (state & 3 && !finished && self._isInformReady()) {
                        if (d) {
                            console.debug('MediaInfoLib(%s:%s) Enough data, apparently...', file.name, file.size);
                        }
                        finished = true;
                    }

                    if (finished) {
                        mediaInfoLib.openBufferFinalize();

                        if (Object.isExtensible(file)) {
                            file.took = Date.now() - took;
                        }

                        if (d) {
                            console.timeEnd('mediaInfoLibTask');
                            console.debug('MediaInfoLib(%s:%s) Parsing finished, state=%s, bytesRead=%s',
                                file.name, file.size, state, bytesRead, byteOffset);
                        }

                        var res = new MediaInfoReport();
                        res.bytesRead = bytesRead;
                        res.entry = file;
                        resolve(res);
                    }
                    else {
                        _nextChunk(self.chunkSize);
                    }
                })
                .catch(reject);
        })(16384);
    };

    /**
     * Check whether we need to continue feeding mediainfo with more data
     * @returns {Boolean}
     * @private
     */
    MediaInfoLib.prototype._isInformReady = function() {
        // TODO: find a more proper way to query this...

        try {
            var r = JSON.parse(mediaInfoLib.inform());
            if (d) {
                console.debug('MediaInfoLib(in-progress-report)', r);
            }
            var g = r.General;
            var v = r.Video;
            var a = r.Audio;
            if (g) {
                // we do assume that if the duration is set everything else must be as well
                if (g.Duration) {
                    return true;
                }
                var mime = g.InternetMediaType;

                if (String(mime).startsWith('audio/')) {
                    return a && a[0].Duration;
                }

                // FIXME: we'd read more data than needed for videos with no audio
                return v && v[0].Duration && a && a[0].Duration;
            }
        }
        catch (ex) {
        }

        return false;
    };

    /**
     * MediaInfo's local file reader
     * @param {File|Blob} entry The entry to read from
     * @param {Number} byteOffset
     * @param {Number} byteLength
     * @returns {Promise}
     * @private
     */
    MediaInfoLib.prototype._fileReader = function(entry, byteOffset, byteLength) {
        return new Promise(function(resolve, reject) {
            var reader = new FileReader();
            var blob = entry.file.slice(byteOffset, byteOffset + byteLength);
            reader.onload = function(ev) {
                if (ev.target.error) {
                    reject(ev.target.error);
                }
                else {
                    resolve(ev.target.result);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(blob);
            reader = blob = undefined;
        });
    };

    /**
     * MediaInfo's network file reader
     * @param {String} entry The entry to read from
     * @param {Number} byteOffset
     * @param {Number} byteLength
     * @returns {Promise}
     * @private
     */
    MediaInfoLib.prototype._gfsReader = function(entry, byteOffset, byteLength) {
        return new Promise(function(resolve, reject) {
            if (byteOffset > entry.file.size) {
                // this should throw a premature eof
                return resolve(new ArrayBuffer(0));
            }

            M.gfsfetch(entry.file, byteOffset, byteOffset + byteLength)
                .tryCatch(function(data) {
                    if (typeof entry.file === 'string') {
                        data.size = data.s;
                        entry.file = data;
                    }
                    resolve(data.buffer);
                    delete data.buffer;
                }, reject);
        });
    };

    /**
     * @name MediaInfoLib
     * @global
     */
    Object.defineProperty(global, 'MediaInfoLib', {value: Object.freeze(MediaInfoLib)});
    /**
     * @name MediaInfoReport
     * @global
     */
    Object.defineProperty(global, 'MediaInfoReport', {value: Object.freeze(MediaInfoReport)});

    if (d) {
        global.mediaInfoTasks = mediaInfoTasks;
    }

    var miCollectedBytes = 0;
    var miCollectRunning = 0;
    var miCollectProcess = function() {
        if (localStorage.noMediaCollect || miCollectedBytes > 0x1000000) {
            return 0xDEAD;
        }

        if (miCollectRunning) {
            if (d) {
                console.debug('MediaInfo collect already running...');
            }
            return;
        }

        delay('mediainfo:collect', function() {
            miCollectRunning = true;

            if (d) {
                console.debug('MediaInfo collect running...');
                console.time('mediainfo:collect');
            }

            var procnodes = [];
            var finish = function() {
                for (var i = M.viewmode && procnodes.length; i--;) {
                    var n = procnodes[i];

                    if (n.p === M.currentdirid) {
                        var h = n.h;
                        n = MediaAttribute(M.d[h]).data;

                        if (n.playtime) {
                            $('#' + h)
                                .find('.data-block-bg').addClass('video')
                                .find('.video-thumb-details span').text(secondsToTimeShort(n.playtime));
                        }
                    }
                }
                if (d) {
                    console.debug('MediaInfo collect finished.');
                    console.timeEnd('mediainfo:collect');
                }
                miCollectRunning = false;
            };

            MediaInfoLib.collect(M.v)
                .then(function(res) {
                    var pending = 0;
                    var process = function(n) {
                        if (n) {
                            procnodes.push(n);
                        }
                        if (--pending < 1) {
                            onIdle(finish);
                        }
                    };
                    var submit = function(res) {
                        var n = res.n;

                        n.store(res).then(function() {
                            if (d) {
                                console.debug('MediaInfo submit successful', res, arguments);
                            }
                            process(n);
                        }).catch(function() {
                            if (d) {
                                console.warn('MediaInfo submit error...', res, arguments);
                            }
                            process();
                        });

                        ++pending;
                    };

                    if (d) {
                        console.debug('MediaInfo collect completed, submitting file attributes...', res);
                    }
                    miCollectedBytes += res.totalBytesRead | 0;

                    for (var k in res) {
                        if (res[k] instanceof MediaInfoReport) {
                            submit(res[k]);
                        }
                    }

                    if (!pending) {
                        if (d) {
                            console.debug('No media attributes to submit...');
                        }
                        finish();
                    }
                })
                .catch(function(e) {
                    if (d) {
                        console.warn('MediaInfo collect error...', e);
                    }
                    finish();
                });
        }, 4e3);
    };
    mBroadcaster.addListener('mega:openfolder', miCollectProcess);
    mBroadcaster.addListener('mediainfo:collect', miCollectProcess);

})(self);

(function _MediaAttribute(global) {
    'use strict';

    function xxkey(k) {
        var key = new Uint32Array(4);

        for (var i = 4; i--;) {
            key[i] = k[i + 4];
        }

        return key;
    }

    function formatfileattr(id, v, k) {
        v = xxtea.encryptUint32Array(v, xxkey(k));

        return id + '*' + ab_to_base64(v.buffer);
    }

    /**
     * Initializes an entry to handle media file attributes
     * @param {File|MegaNode} [entry]
     * @param {Array} [key] 8-element Array with the file's key
     * @returns {MediaAttribute}
     * @constructor
     */
    function MediaAttribute(entry, key) {
        if (!(this instanceof MediaAttribute)) {
            return new MediaAttribute(entry, key);
        }

        if (entry instanceof MegaNode) {
            Object.assign(this, entry);
        }
        else if (entry instanceof File) {
            // File entries are only used during tests
            this.file = entry;
            this.name = entry.name;
            this.k = [1, 2, 3, 4, 5, 6, 7, 8];
            this.s = entry.size;
            this.h = makeUUID().substr(8, 8).toUpperCase();
        }

        this.k = this.k || key || entry;
    }

    MediaAttribute.prototype = Object.create(null);
    MediaAttribute.prototype.constructor = MediaAttribute;

    /**
     * Set media attributes if not already set
     * @param {MegaNode|Object} entry The node
     * @returns {Promise}
     */
    MediaAttribute.setAttribute = function(entry) {
        return new Promise(function(resolve, reject) {
            if (!(entry instanceof MegaNode)) {
                if (typeof entry !== 'object'
                    || String(entry.h).length !== 8
                    || !Array.isArray(entry.k)
                    || entry.k.length !== 8) {

                    return reject(EINCOMPLETE);
                }

                entry = new MegaNode(entry);
            }

            entry = new MediaAttribute(entry);

            if (!MediaInfoLib.isFileSupported(entry)) {
                resolve(ENOENT);
            }
            else if (!entry.weak) {
                resolve(EEXIST);
            }
            else {
                MediaInfoLib(entry.link || entry.h, 0x10000)
                    .getMetadata()
                    .then(entry.store.bind(entry))
                    .then(resolve)
                    .catch(reject);
            }
        });
    };

    MediaAttribute.canPlayMedia = function(entry) {
        var canPlayType = function(container, videocodec, audiocodec) {
            switch (container) {
                case 'mp42':
                case 'isom':
                case 'M4V ':
                    if (videocodec === 'avc1') {
                        var mime = 'video/mp4; codecs="avc1.640029';

                        if (audiocodec) {
                            if (String(audiocodec).startsWith('mp4a')) {
                                audiocodec = audiocodec.replace(/-/g, '.');
                            }

                            mime += ', ' + audiocodec;
                        }

                        return MediaSource.isTypeSupported(mime + '"');
                    }
            }

            return false;
        };

        return new Promise(function(resolve, reject) {
            entry = new MediaAttribute(entry);

            var mfa = entry.data;
            if (!mfa || !('MediaSource' in window)) {
                return resolve(false);
            }

            MediaInfoLib.getMediaCodecsList()
                .then(function(mc) {

                    var container = mc.container.byIdx[mfa.container];
                    var videocodec = mc.video.byIdx[mfa.videocodec];
                    var audiocodec = mc.audio.byIdx[mfa.audiocodec];

                    if (mfa.shortformat) {
                        var fmt = String(mc.shortformat.byIdx[mfa.shortformat]).split(':');

                        container = fmt[0];
                        videocodec = fmt[1];
                        audiocodec = fmt[2];
                    }

                    resolve(canPlayType(container, videocodec, audiocodec));
                })
                .catch(reject);
        });
    };

    /**
     * Returns a file attribute string for the specified media info properties
     * @param {MediaInfoReport} res Media info report.
     * @returns {String} file attribute string
     */
    MediaAttribute.prototype.toAttributeString = function(res) {
        var fps = res.fps;
        var width = res.width;
        var height = res.height;
        var vcodec = res.vcodecid;
        var acodec = res.acodecid;
        var playtime = res.playtime;
        var container = res.containerid;
        var shortformat = res.shortformat;
        var filekey = this.k;

        if (!(container && (vcodec && (acodec || !res.acodec) && width && height || acodec && !vcodec))) {
            shortformat = 255;
            fps = MediaInfoLib.build;
            width = MediaInfoLib.version;
            playtime = this.avflv;
        }

        width <<= 1;
        if (width >= 32768) {
            width = ((width - 32768) >> 3) | 1;
        }
        if (width >= 32768) {
            width = 32767;
        }

        height <<= 1;
        if (height >= 32768) {
            height = ((height - 32768) >> 3) | 1;
        }
        if (height >= 32768) {
            height = 32767;
        }

        playtime <<= 1;
        if (playtime >= 262144) {
            playtime = Math.floor((playtime - 262200) / 60) | 1;
        }
        if (playtime >= 262144) {
            playtime = 262143;
        }

        fps <<= 1;
        if (fps >= 256) {
            fps = ((fps - 256) >> 3) | 1;
        }
        if (fps >= 256) {
            fps = 255;
        }

        // LE code below
        var v = new Uint8Array(8);

        v[7] = shortformat;
        v[6] = playtime >> 10;
        v[5] = (playtime >> 2) & 255;
        v[4] = ((playtime & 3) << 6) + (fps >> 2);
        v[3] = ((fps & 3) << 6) + ((height >> 9) & 63);
        v[2] = (height >> 1) & 255;
        v[1] = ((width >> 8) & 127) + ((height & 1) << 7);
        v[0] = width & 255;

        var attrs = formatfileattr(8, new Uint32Array(v.buffer), filekey);

        // must be 0 if the format is exotic - in that case, container/videocodec/audiocodec
        // must be valid, if shortformat is > 0, container/videocodec/audiocodec are ignored
        // and no attribute 9 is returned
        if (!shortformat) {
            v = new Uint8Array(8);

            v[3] = (acodec >> 4) & 255;
            v[2] = ((vcodec >> 8) & 15) + ((acodec & 15) << 4);
            v[1] = vcodec & 255;
            v[0] = container;

            attrs += '/' + formatfileattr(9, new Uint32Array(v.buffer), filekey);
        }

        return attrs;
    };

    /**
     * Get media properties from a file attribute string.
     * @param {String} [attrs] File attributes string (n.fa)
     * @param {Array} [filekey] an 8-element Array with the file's key
     * @returns {Object}
     */
    MediaAttribute.prototype.fromAttributeString = function(attrs, filekey) {
        var r = null;
        attrs = attrs || this.fa;
        filekey = filekey || this.k;
        var pos = String(attrs).indexOf('8*');

        if (pos >= 0) {
            var v = new Uint32Array(base64_to_ab(attrs.substr(pos + 2, 11)), 0, 2);
            v = xxtea.decryptUint32Array(v, xxkey(filekey));
            v = new Uint8Array(v.buffer);

            r = Object.create(null);

            r.width = (v[0] >> 1) + ((v[1] & 127) << 7);
            if (v[0] & 1) {
                r.width = (r.width << 3) + 16384;
            }

            r.height = v[2] + ((v[3] & 63) << 8);
            if (v[1] & 128) {
                r.height = (r.height << 3) + 16384;
            }

            r.fps = (v[3] >> 7) + ((v[4] & 63) << 1);
            if (v[3] & 64) {
                r.fps = (r.fps << 3) + 128;
            }

            r.playtime = (v[4] >> 7) + (v[5] << 1) + (v[6] << 9);
            if (v[4] & 64) {
                r.playtime = r.playtime * 60 + 131100;
            }

            if (!(r.shortformat = v[7])) {
                pos = attrs.indexOf('9*');

                if (pos >= 0) {
                    v = new Uint32Array(base64_to_ab(attrs.substr(pos + 2, 11)), 0, 2);
                    v = xxtea.decryptUint32Array(v, xxkey(filekey));
                    v = new Uint8Array(v.buffer);

                    r.container = v[0];
                    r.videocodec = v[1] + ((v[2] & 15) << 8);
                    r.audiocodec = (v[2] >> 4) + (v[3] << 4);
                }
            }
        }

        return r;
    };

    /**
     * Send pfa command to store a node's file attribute
     * @param {MediaInfoReport} res The media info report gathered from MediaInfoLib.getMetadata()
     * @returns {Promise}
     */
    MediaAttribute.prototype.store = function(res) {
        var self = this;
        return new Promise(function(resolve, reject) {
            if (!(res instanceof MediaInfoReport)) {
                console.error('Unexpected MediaInfoLib.getMetadata() result...', res);
                return reject(EFAILED);
            }
            var req = {a: 'pfa', fa: self.toAttributeString(res)};
            if (self.ph && (!self.u || self.u !== u_handle)) {
                req.ph = self.ph;
            }
            else {
                req.n = self.h;
            }

            if (d) {
                console.debug('Storing media file attr for node.', req, res, self.fromAttributeString(req.fa));
            }

            var success = function(fa) {
                var n = M.d[req.n];

                if (n) {
                    if (n.fa) {
                        n.fa += '/' + fa;
                    }
                    else {
                        n.fa = fa;
                    }
                    M.nodeUpdated(n);
                }

                resolve(fa);
            };

            M.req(req).tryCatch(success, reject);

            if (Object(res.General).Cover_Data && !res.vcodec && req.n) {
                var aes = new sjcl.cipher.aes([
                    self.k[0] ^ self.k[4],
                    self.k[1] ^ self.k[5],
                    self.k[2] ^ self.k[6],
                    self.k[3] ^ self.k[7]
                ]);
                try {
                    createnodethumbnail(req.n, aes, req.n, str_to_ab(atob(res.General.Cover_Data)));
                }
                catch (ex) {
                    console.warn(ex);
                }
            }
        });
    };

    /**
     * Parse media file and store its file attribute
     * @param {File|MegaNode|String} entry The entry passed to MediaInfoLib
     * @returns {Promise}
     */
    MediaAttribute.prototype.parse = function(entry) {
        if (!MediaInfoLib.isFileSupported(entry)) {
            return false;
        }

        var self = this;
        return new Promise(function(resolve, reject) {
            MediaInfoLib(entry)
                .getMetadata()
                .then(function(r) {
                    if (d) {
                        console.debug('MediaInfoReport(%s)', MediaInfoLib.getObjectName(entry), r);
                    }
                    self.store(r).then(resolve).catch(reject);
                }).catch(reject);
        });
    };

    MediaAttribute.prototype.toString = function() {
        return String(this.fa);
    };

    Object.defineProperty(MediaAttribute.prototype, 'data', {
        get: function() {
            var a = this.fa && this.fromAttributeString(this.fa);
            return a && a.shortformat !== 0xff ? a : false;
        }
    });

    Object.defineProperty(MediaAttribute.prototype, 'avflv', {
        get: function() {
            return Object(MediaInfoLib.avflist).version | 0;
        }
    });

    Object.defineProperty(MediaAttribute.prototype, 'weak', {
        get: function() {
            var a = this.fromAttributeString();

            if (a && !localStorage.resetMediaAttributes) {
                if (a.shortformat < 255) {
                    return false;
                }

                return a.fps !== MediaInfoLib.build || a.width !== MediaInfoLib.version || a.playtime < this.avflv;
            }

            return true;
        }
    });

    /**
     * @name MediaAttribute
     * @global
     */
    Object.defineProperty(global, 'MediaAttribute', {value: Object.freeze(MediaAttribute)});

})(self);
