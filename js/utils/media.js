function isMediaSourceSupported() {
    'use strict';
    return window.MediaSource && typeof MediaSource.isTypeSupported === 'function' && (!window.safari || d);
}

function is_video(n) {
    'use strict';

    if (String(n && n.fa).indexOf(':8*') > 0) {
        // check whether it's an *streamable* video
        return MediaAttribute.getMediaType(n);
    }

    var ext = fileext(n && n.name || n, true, true);

    return is_video.ext[ext];
}

is_video.ext = {
    'MP4': -1,
    'M4V': -1
};

if (!isMediaSourceSupported()) {
    window.is_video = function() {
        'use strict';
        return false;
    };
}

/**
 * Returns a truthy value whenever we can get a previewable image for a file/node.
 * @param {String|MegaNode|Object} n An ufs-node, or filename
 * @param {String} [ext] Optional filename extension
 * @returns {Number|String|Function}
 *      {Number}: Build-in support in browsers,
 *      {String}: RAW Image file type
 *      {Function}: Handler we can use to get a preview image out of the file/node data
 */
function is_image(n, ext) {
    'use strict';
    ext = ext || fileext(n && n.name || n, true, true);
    return is_image.def[ext] || is_rawimage(null, ext) || mThumbHandler.has(0, ext);
}

/**
 * Same as is_image(), additionally checking whether the node has an image file attribute we can preview
 * @param {String|MegaNode|Object} n An ufs-node, or filename
 * @param {String} [ext] Optional filename extension
 * @returns {Number|String|Function|Boolean}
 */
function is_image2(n, ext) {
    'use strict';
    ext = ext || fileext(n && n.name || n, true, true);
    return (is_image(n, ext) && (!mega.chrome || !n || n.s < 6e8))
        || (filemime(n).startsWith('image') && String(n.fa).indexOf(':1*') > 0);
}

/**
 * Same as is_image2(), additionally skipping non-image files regardless of file attributes or generation handlers
 * @param {String|MegaNode|Object} n An ufs-node, or filename
 * @param {String} [ext] Optional filename extension
 * @returns {Number|String|Function|Boolean}
 */
function is_image3(n, ext) {
    'use strict';
    ext = ext || fileext(n && n.name || n, true, true);
    return ext !== 'PDF' && is_image2(n, ext);
}

/**
 * Check whether a file/node is a RAW image.
 * @param {String|MegaNode|Object} name An ufs-node, or filename
 * @param {String} [ext] Optional filename extension
 * @returns {String}
 */
function is_rawimage(name, ext) {
    'use strict';

    ext = ext || fileext(name, true, true);

    return is_image.raw[ext] && ext;
}

is_image.def = {
    'JPG': 1,
    'JPEG': 1,
    'GIF': 1,
    'BMP': 1,
    'PNG': 1
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
    // "TIF": "Tagged Image File Format",
    // "TIFF": "Tagged Image File Format",
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

        ext = ext || fileext(name, true, true);

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

mThumbHandler.add('TIFF,TIF', function TIFThumbHandler(ab, cb) {
    'use strict';

    M.require('tiffjs').tryCatch(function makeTIF() {
        if (TIFThumbHandler.working) {
            if (d) {
                console.debug('Holding tiff thumb creation...', ab && ab.byteLength);
            }
            mBroadcaster.once('TIFThumbHandler.ready', makeTIF);
            return;
        }
        TIFThumbHandler.working = true;

        onIdle(function() {
            if (d) {
                console.debug('...unholding tiff thumb creation.', mBroadcaster.hasListener('TIFThumbHandler.ready'));
            }
            TIFThumbHandler.working = false;
            mBroadcaster.sendMessage('TIFThumbHandler.ready');
        });

        var timeTag = 'tiffjs.' + makeUUID();

        if (d) {
            console.debug('Creating TIFF thumbnail...', ab && ab.byteLength);
            console.time(timeTag);
        }

        var dv = new DataView(ab.buffer || ab);
        switch (dv.byteLength > 16 && dv.getUint16(0)) {
            case 0x4D4D: // TIFF, big-endian
            case 0x4949: // TIFF, little-endian
                // XXX: libtiff is unable to handle images with 32-bit samples.
                var tiff = false;

                try {
                    Tiff.initialize({TOTAL_MEMORY: 134217728});
                    tiff = new Tiff(new Uint8Array(ab));

                    ab = dataURLToAB(tiff.toDataURL());

                    if (d) {
                        console.log('tif2png %sx%s (%s bytes)', tiff.width(), tiff.height(), ab.byteLength);
                    }
                }
                catch (ex) {
                    if (d) {
                        console.warn('Caught tiff.js exception, aborting...', ex);
                    }
                    ab = false;

                    if (!tiff) {
                        break;
                    }
                }

                try {
                    tiff.close();
                    Tiff.Module.FS_unlink(tiff._filename);
                }
                catch (ex) {
                    if (d) {
                        console.debug(ex);
                    }
                }

                if (ab) {
                    eventlog(99692);
                }
                break;

            default:
                if (d) {
                    console.debug('This does not seems a TIFF...', [ab]);
                }
        }

        if (d) {
            console.timeEnd(timeTag);
        }

        cb(ab);
    });
});

mThumbHandler.add('WEBP', function WEBPThumbHandler(ab, cb) {
    'use strict';

    M.require('webpjs').tryCatch(function() {
        var timeTag = 'webpjs.' + makeUUID();

        if (d) {
            console.debug('Creating WEBP thumbnail...', ab && ab.byteLength);
            console.time(timeTag);
        }

        var canvas = webpToCanvas(new Uint8Array(ab), ab.byteLength);

        if (d) {
            console.timeEnd(timeTag);
        }

        if (canvas) {
            ab = dataURLToAB(canvas.toDataURL());

            if (d) {
                console.log('webp2png %sx%s (%s bytes)', canvas.width, canvas.height, ab.byteLength);
            }
        }
        else {
            if (d) {
                console.debug('WebP thumbnail creation failed.');
            }
            ab = null;
        }
        cb(ab);
    });
});

mBroadcaster.once('startMega', function() {
    'use strict';

    var img = new Image();
    img.onload = function() {
        // This browser does natively support WebP
        delete mThumbHandler.sup.WEBP;
        is_image.def.WEBP = 1;

        if (d) {
            console.debug('Using build in WebP support...');
        }
    };
    img.onerror = function() {
        if (d) {
            console.debug('This browser does not support WebP, we will use libwebp...', ua);
        }
    };
    img.src = 'data:image/webp;base64,' +
        'UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
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

if (!mega.chrome || (parseInt(String(navigator.appVersion).split('Chrome/').pop()) | 0) < 56) {
    delete mThumbHandler.sup.SVG;
}


// ---------------------------------------------------------------------------------------------------------------

var _getImageCache = Object.create(null);

/**
 * Retrieve file attribute image
 * @param {MegaNode} node The node to get associated image with
 * @param {Number} [type] Image type, 0: thumbnail, 1: preview
 * @param {Boolean} [raw] get back raw buffer, otherwise a blob: URI
 * @returns {Promise}
 */
function getImage(node, type, raw) {
    'use strict';
    var entry = Object(node).h + '!' + (type |= 0) + '.' + (raw |= 0);

    if (!type && thumbnails[node.h] && !raw) {
        return Promise.resolve(thumbnails[node.h]);
    }

    if (_getImageCache[entry]) {
        if (_getImageCache[entry] instanceof Promise) {
            return _getImageCache[entry];
        }
        return Promise.resolve(_getImageCache[entry]);
    }

    _getImageCache[entry] = new Promise(function(resolve, reject) {
        var done = function(a, b, data) {
            if (data !== 0xDEAD) {
                _getImageCache[entry] = raw ? data : mObjectURL([data.buffer || data], 'image/jpeg');
                resolve(_getImageCache[entry]);
            }
            else {
                _getImageCache[entry] = null;
                reject();
            }
        };
        api_getfileattr([node], type, done, function(ex) {
            onIdle(function() {
                reject(ex);
            });
        });
    });

    return _getImageCache[entry];
}

/**
 * Store file attribute image
 * @param {MegaNode} n The node to set associated image
 * @param {ArrayBuffer} ab The binary data holding the image
 * @param {*} [options]
 */
function setImage(n, ab, options) {
    'use strict';
    var aes = new sjcl.cipher.aes([
        n.k[0] ^ n.k[4], n.k[1] ^ n.k[5], n.k[2] ^ n.k[6], n.k[3] ^ n.k[7]
    ]);
    var ph = !n.u || n.u !== u_handle ? n.ph : null;
    createnodethumbnail(n.h, aes, n.h, ab, options || false, ph);
}

/**
 * Just a quick&dirty function to retrieve an image embed through ID3v2.3 tags
 * @details Based on https://github.com/tmont/audio-metadata
 * @param {File|ArrayBuffer} entry
 */
function getID3CoverArt(entry) {
    'use strict';
    // jscs:disable disallowImplicitTypeConversion
    return new Promise(function(resolve, reject) {
        var parse = tryCatch(function(ab) {
            var result;
            var u8 = new Uint8Array(ab);
            var getLong = function(offset) {
                return (((((u8[offset] << 8) + u8[offset + 1]) << 8) + u8[offset + 2]) << 8) + u8[offset + 3];
            };
            var readFrame = function(offset) {
                var id = String.fromCharCode.apply(String, [
                    u8[offset], u8[offset + 1], u8[offset + 2], u8[offset + 3]
                ]);
                return {id: id, size: getLong(offset + 4) + 10};
            };
            if (u8[0] === 0x49 && u8[1] === 0x44 && u8[2] === 0x33 && u8[3] === 3) {
                var offset = 10 + (u8[5] & 128 ? getLong(10) : 0);
                var size = offset + getLong(6);

                while (offset < size) {
                    var frame = readFrame(offset);
                    if (frame.id === 'APIC') {
                        offset += 11;
                        for (var x = 2; x--; offset++) {
                            while (u8[offset++]) ;
                        }
                        result = u8.slice(--offset, frame.size);
                        break;
                    }
                    offset += frame.size;
                }
            }
            if (u8[0] === 0x66 && u8[1] === 0x4C && u8[2] === 0x61 && u8[3] === 0x43) {
                var pos = 4;
                var len = u8.byteLength;
                var type;

                while (len > pos) {
                    var hdr = getLong(pos);

                    if ((hdr >>> 24 & ~0x80) === 6) {
                        var index = getLong(pos + 8);
                        index += getLong(pos + index + 12) + 32 + pos;
                        type = getLong(pos + 4);

                        result = u8.slice(index + 4, getLong(index));
                    }

                    if (type === 3 || (hdr >>> 24 & 0x80)) {
                        break;
                    }
                    pos += 4 + (hdr & 0xffffff);
                }
            }
            if (result && result.byteLength) {
                if (d) {
                    console.debug('getID3CoverArt', [result]);
                }
                return resolve(result);
            }
            onIdle(function() {
                reject(Error('[getID3CoverArt] None found.'));
            });
        }, reject);

        if (entry instanceof Blob) {
            var reader = new FileReader();
            reader.onload = function(ev) {
                if (ev.target.error) {
                    return reject(ev.target.error);
                }
                parse(ev.target.result);
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(entry);
        }
        else {
            parse(entry);
        }
    });
}

// ---------------------------------------------------------------------------------------------------------------

/**
 * Fullscreen handling helper
 * @param {Object} $button The button to jump into fullscreen
 * @param {Object} $element The element that must go into fullscreen
 * @returns {FullScreenManager}
 * @requires jquery.fullscreen.js
 * @constructor
 */
function FullScreenManager($button, $element) {
    'use strict';

    if (!(this instanceof FullScreenManager)) {
        return new FullScreenManager($button, $element);
    }

    var listeners = [];
    var iid = makeUUID();
    var $document = $(document);
    var state = $document.fullScreen();
    var goFullScreen = function() {
        state = $document.fullScreen();

        if (state) {
            $document.fullScreen(false);
        }
        else {
            $element.fullScreen(true);
        }
        return false;
    };

    if (state === null) {
        // FullScreen is not supported
        $button.addClass('hidden');
    }
    else {
        $document.rebind('fullscreenchange.' + iid, function() {
            state = $document.fullScreen();
            for (var i = listeners.length; i--;) {
                listeners[i](state);
            }
        });
        this.enterFullscreen = function() {
            if (!state) {
                goFullScreen();
            }
        };
        $button.removeClass('hidden').rebind('click.' + iid, goFullScreen);
    }

    Object.defineProperty(this, 'state', {
        get: function() {
            return state;
        }
    });

    this.iid = iid;
    this.$button = $button;
    this.$document = $document;
    this.listeners = listeners;
    this.destroyed = false;
}

FullScreenManager.prototype = Object.create(null);

// destroy full screen manager instance
FullScreenManager.prototype.destroy = function() {
    'use strict';

    if (!this.destroyed) {
        this.destroyed = true;
        this.$button.off('click.' + this.iid);
        this.$document.off('fullscreenchange.' + this.iid);
        this.exitFullscreen();
    }
};

// list for full screen changes
FullScreenManager.prototype.change = function(cb) {
    'use strict';
    this.listeners.push(tryCatch(cb.bind(this)));
    return this;
};

// switch full screen
FullScreenManager.prototype.switchFullscreen = function() {
    'use strict';

    if (this.state) {
        this.exitFullscreen();
    }
    else {
        this.enterFullscreen();
    }
};

// exit full screen
FullScreenManager.prototype.exitFullscreen = function() {
    'use strict';
    this.$document.fullScreen(false);
};

// enter full screen
FullScreenManager.prototype.enterFullscreen = function() {
    'use strict';
    /* noop */
};

// ---------------------------------------------------------------------------------------------------------------


(function _initVideoStream(global) {
    'use strict';

    // @private Make thumb/preview images if missing
    var _makethumb = function(n, stream) {
        if (String(n.fa).indexOf(':0*') < 0 || String(n.fa).indexOf(':1*') < 0) {
            var onVideoPlaying = function() {
                var video = this.video;

                if (video && video.duration) {
                    var took = Math.round(2 * video.duration / 100);

                    if (d) {
                        console.debug('Video thumbnail missing, will take image at %s...', secondsToTime(took));
                    }

                    this.on('timeupdate', function() {
                        if (video.currentTime < took) {
                            return true;
                        }

                        this.getImage().then(setImage.bind(null, n)).catch(console.warn.bind(console));
                    });

                    return false;
                }

                return true;
            };

            if (is_video(n) !== 2) {
                stream.on('playing', onVideoPlaying);
            }
            else {
                stream.on('audio-buffer', function(ev, buffer) {
                    getID3CoverArt(buffer).then(setImage.bind(null, n)).catch(console.debug.bind(console));
                });
            }
        }
    };

    // @private Init custom video controls
    var _initVideoControls = function(wrapper, streamer, node, options) {
        var $wrapper = $(wrapper);
        var $video = $wrapper.find('video');
        var videoElement = $video.get(0);
        var $videoContainer = $video.parent();
        var $videoControls = $wrapper.find('.video-controls');
        var $document = $(document);
        var timer;
        var filters = Object.create(null);

        // Hide the default controls
        videoElement.controls = false;

        // Show the volume icon until we found the video has no audio track
        $('.volume-control', $wrapper).removeClass('no-audio');

        // Obtain handles to buttons and other elements
        var $playpause = $videoControls.find('.playpause');
        var $mute = $videoControls.find('.mute');
        var $progress = $videoControls.find('.video-progress-bar');
        var $progressBar = $videoControls.find('.video-time-bar');
        var $fullscreen = $videoControls.find('.fs');
        var $volumeBar = $videoControls.find('.volume-bar');

        // Changes the button state of certain button's so the correct visuals can be displayed with CSS
        var changeButtonState = function(type) {
            // Play/Pause button
            if (type === 'playpause') {
                if (videoElement.paused || videoElement.ended) {
                    $playpause.find('i').removeClass('pause').addClass('play');
                    // $wrapper.addClass('paused');
                }
                else {
                    $playpause.find('i').removeClass('play').addClass('pause');
                    // $wrapper.removeClass('paused');
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

        var hideControls = function() {
            $wrapper.removeClass('mouse-idle');
            if (dlmanager.isStreaming) {
                clearTimeout(timer);
                timer = setTimeout(function() {
                    if (videoElement && !(videoElement.paused || videoElement.ended)) {
                        $wrapper.addClass('mouse-idle');
                    }
                }, 2600);
            }
        };

        var getTimeOffset = function(x) {
            var maxduration = videoElement.duration;
            var position = x - $progress.offset().left; // Click pos
            var percentage = Math.max(0, Math.min(100, 100 * position / $progress.width()));
            var selectedTime = Math.round(maxduration * percentage / 100);
            return {time: selectedTime | 0, percent: percentage};
        };

        // Set video duration in progress bar
        var setDuration = function(value) {
            $wrapper.find('.video-timing.duration').text(secondsToTimeShort(value, 1));
        };

        // Increase/decrease video speed
        var setVideoSpeed = function(rate) {
            if (!rate) {
                videoElement.playbackRate = 1.0;
            }
            else {
                var r = videoElement.playbackRate;
                videoElement.playbackRate = Math.min(Math.max(r + rate, 0.25), 4);
            }
        };

        // Increase/decrease video volume.
        var setVideoVolume = function(v) {
            if (videoElement.muted) {
                videoElement.muted = false;
                changeButtonState('mute');
            }
            videoElement.volume = Math.min(1.0, Math.max(videoElement.volume + v, 0.1));
            $volumeBar.find('span').css('height', Math.round(videoElement.volume * 100) + '%');
        };

        // Increase/decrease color filter
        var setVideoFilter = function(v) {
            var style = [];
            var op = v > 0 && v < 4 ? 2 : v > 3 && v < 7 ? 5 : 8;
            var filter = ({'2': 'saturate', '5': 'contrast', '8': 'brightness'})[op];

            if (!v) {
                filters = Object.create(null);
            }
            else if (v === op) {
                delete filters[filter];
            }
            else {
                v = '147'.indexOf(v) < 0 ? 0.1 : -0.1;
                filters[filter] = Number(Math.min(8.0, Math.max((filters[filter] || 1) + v, 0.1)).toFixed(2));
            }

            Object.keys(filters).forEach(function(k) {
                style.push(k + '(' + filters[k] + ')');
            });

            videoElement.style.filter = style.join(' ') || 'none';
        };

        // Apply specific video filter
        var applyVideoFilter = function(s, c, b) {
            filters.saturate = s;
            filters.contrast = c;
            filters.brightness = b;
            videoElement.style.filter = 'saturate(' + s + ') contrast(' + c + ') brightness(' + b + ')';
        };

        // Seek by specified number of seconds.
        var seekBy = function(sec) {
            streamer.currentTime = Math.min(streamer.duration, Math.max(0, streamer.currentTime + sec));
        };

        // Set Init Values
        changeButtonState('playpause');
        changeButtonState('mute');
        $wrapper.removeClass('paused').find('.video-timing').text('00:00');
        $progressBar.removeAttr('style');
        $volumeBar.find('style').removeAttr('style');

        // Add event listeners for video specific events
        $video.rebind('play pause', function() {
            changeButtonState('playpause');
        });

        var playevent;
        $video.rebind('playing', function() {
            if (streamer.duration) {
                $wrapper.removeClass('paused').find('.viewer-pending').addClass('hidden');

                if (!playevent) {
                    playevent = true;
                    setDuration(streamer.duration);

                    // play/pause on click
                    $video.rebind('click', function() {
                        $playpause.trigger('click');
                    });

                    // jump to full screen on double-click
                    $video.rebind('dblclick', function() {
                        $fullscreen.trigger('click');
                    });

                    $('.play-video-button', $wrapper).rebind('click', function() {
                        $playpause.trigger('click');
                    });

                    if (!streamer.hasAudio) {
                        var $vc = $('.volume-control', $wrapper).addClass('no-audio');
                        var title = l[19061];

                        if (streamer.hasUnsupportedAudio) {
                            eventlog(99693, streamer.hasUnsupportedAudio);
                            title = escapeHTML(l[19060]).replace('%1', streamer.hasUnsupportedAudio);
                        }
                        $vc.attr('title', title);
                    }

                    streamer._megaNode = node;
                    dlmanager.isStreaming = streamer;
                    pagemetadata();
                }

                hideControls();
                $document.rebind('mousemove.idle', hideControls);
            }
        });

        $videoControls.rebind('mousemove.idle', function() {
            onIdle(function() {
                clearTimeout(timer);
            });
        });

        $video.rebind('ended.idle pause.idle', function() {
            clearTimeout(timer);
            $wrapper.removeClass('mouse-idle');
            $document.off('mousemove.idle');
            // playevent = false;
        });

        $video.rebind('contextmenu.mvs', function() {
            if (playevent) {
                $video.off('contextmenu.mvs');
            }
            else {
                return false;
            }
        });

        // Add events for all buttons
        $playpause.rebind('click', function() {
            if (videoElement.paused || videoElement.ended) {
                if (dlmanager.isOverQuota) {
                    $wrapper.trigger('is-over-quota');
                    dlmanager.showOverQuotaDialog();
                }
                else {
                    later(hideControls);
                    if (streamer.currentTime >= streamer.duration) {
                        streamer.currentTime = 0;
                    }
                    else {
                        streamer.play();
                    }
                }
            }
            else {
                videoElement.pause();
            }
            return false;
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

        $('.volume-control', $wrapper).rebind('mousewheel.volumecontrol', function(e) {
            var delta = Math.max(-1, Math.min(1, (e.wheelDelta || e.deltaY || -e.detail)));
            setVideoVolume(0.1 * delta);
            return false;
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
            if (!$(this).parent('.volume-control').hasClass('no-audio')) {
                videoElement.muted = !videoElement.muted;
                changeButtonState('mute');
                updateVolumeBar();
            }
            return false;
        });

        var progressBarElementStyle = $progressBar.get(0).style;
        var videoTimingElement = $wrapper.find('.video-timing.current').get(0);

        // As the video is playing, update the progress bar
        var onTimeUpdate = function(offset, length) {
            if (offset > length) {
                offset = length;
            }

            videoTimingElement.textContent = secondsToTimeShort(offset, 1);
            progressBarElementStyle.setProperty('width', Math.round(100 * offset / length) + '%');
        };

        if (options.startTime) {
            var playtime = MediaAttribute(node).data.playtime;
            if (playtime) {
                setDuration(playtime);
                onTimeUpdate(options.startTime, playtime);
            }
        }

        if (options.filter) {
            applyVideoFilter.apply(this, options.filter.map(function(v) { return v / 10; }));
        }

        $video.rebind('timeupdate', function() {
            onTimeUpdate(streamer.currentTime, streamer.duration);
        });

        /* Drag status */
        var timeDrag = false;
        $progress.rebind('mousedown.videoprogress', function(e) {
            timeDrag = true;

            if (streamer.currentTime) {
                videoElement.pause();
                onIdle(updatebar.bind(0, e.pageX));
            }
        });

        $document.rebind('mouseup.videoprogress', function(e) {
            if (timeDrag) {
                timeDrag = false;

                if (streamer.currentTime) {
                    updatebar(e.pageX);

                    if (!streamer.WILL_AUTOPLAY_ONSEEK) {
                        streamer.play();
                    }
                }
            }
        });

        $document.rebind('mousemove.videoprogress', function(e) {
            if (timeDrag && streamer.currentTime) {
                updatebar(e.pageX);
            }
        });

        $progress.rebind('mousemove.videoprogress', function(e) {
            this.setAttribute('title', secondsToTimeShort(getTimeOffset(e.pageX).time, 1));
        });

        // Update Progress Bar control
        var updatebar = function(x) {
            var o = getTimeOffset(x);

            //Update progress bar and video currenttime
            $progressBar.css('width', o.percent + '%');
            $wrapper.find('.video-timing.current').text(secondsToTimeShort(o.time, 1));

            if (!timeDrag) {
                streamer.currentTime = o.time;
            }
        };

        // Set the video container's fullscreen state
        var setFullscreenData = function(state) {
            $videoContainer.attr('data-fullscreen', !!state);

            // Set the fullscreen button's 'data-state' which allows the correct button image to be set via CSS
            $fullscreen.attr('data-state', state ? 'cancel-fullscreen' : 'go-fullscreen');

            if (state) {
                $fullscreen.find('i').removeClass('fullscreen').addClass('lowscreen');
            }
            else {
                $fullscreen.find('i').removeClass('lowscreen').addClass('fullscreen');
            }
        };

        var $element = page === 'download' ? $wrapper.find('.video-block') : $wrapper;
        var fullScreenManager = FullScreenManager($fullscreen, $element).change(setFullscreenData);

        // Video playback keyboard event handler.
        var videoKeyboardHandler = function(ev) {
            var bubble = false;
            var key = playevent && (ev.code || ev.key);

            switch (key) {
                case 'KeyK':
                case 'Space':
                case 'MediaPlayPause':
                    $playpause.trigger('click');
                    break;
                case 'ArrowUp':
                    setVideoVolume(0.1);
                    break;
                case 'ArrowDown':
                    setVideoVolume(-0.1);
                    break;
                case 'ArrowLeft':
                    seekBy(-5);
                    break;
                case 'ArrowRight':
                    seekBy(5);
                    break;
                case 'KeyJ':
                    seekBy(-10);
                    break;
                case 'KeyL':
                    seekBy(10);
                    break;
                case 'KeyF':
                    fullScreenManager.switchFullscreen();
                    break;
                case 'KeyM':
                    $mute.trigger('click');
                    break;
                case 'Home':
                case 'Digit0':
                    streamer.currentTime = 0;
                    break;
                case 'End':
                    streamer.currentTime = streamer.duration - 0.2;
                    break;
                case 'Digit1':
                case 'Digit2':
                case 'Digit3':
                case 'Digit4':
                case 'Digit5':
                case 'Digit6':
                case 'Digit7':
                case 'Digit8':
                case 'Digit9':
                    streamer.currentTime = streamer.duration * key.substr(5) / 10;
                    break;
                case 'Numpad0':
                case 'Numpad1':
                case 'Numpad2':
                case 'Numpad3':
                case 'Numpad4':
                case 'Numpad5':
                case 'Numpad6':
                case 'Numpad7':
                case 'Numpad8':
                case 'Numpad9':
                    setVideoFilter(key.substr(6) | 0);
                    break;
                default:
                    if (ev.key === '<' || ev.key === '>') {
                        setVideoSpeed(ev.ctrlKey ? null : 0.25 * (ev.key.charCodeAt(0) - 0x3d));
                    }
                    else {
                        bubble = true;
                    }
                    break;
            }

            if (!bubble) {
                ev.preventDefault();
                ev.stopPropagation();
            }
        };
        window.addEventListener('keydown', videoKeyboardHandler, true);

        $wrapper.rebind('is-over-quota', function() {
            fullScreenManager.exitFullscreen();
            videoElement.pause();
            return false;
        });

        $wrapper.rebind('video-destroy', function() {
            $mute.off();
            $video.off();
            $progress.off();
            $playpause.off();
            $volumeBar.off();
            clearTimeout(timer);
            videoElement.style.filter = 'none';
            window.removeEventListener('keydown', videoKeyboardHandler, true);
            $wrapper.removeClass('mouse-idle video-theatre-mode video')
                .off('is-over-quota').find('.viewer-pending').addClass('hidden');
            $document.off('mousemove.videoprogress');
            $document.off('mouseup.videoprogress');
            $document.off('mousemove.volumecontrol');
            $document.off('mouseup.volumecontrol');
            $(window).off('video-destroy.main');
            videoElement = streamer = null;
            dlmanager.isStreaming = false;
            fullScreenManager.destroy();
            pagemetadata();
            return false;
        });

        dlmanager.isStreaming = true;
    };

    // @private Launch video streaming
    var _initVideoStream = function(node, $wrapper, destroy, options) {
        var onOverQuotaCT;

        if (typeof destroy === 'object') {
            options = destroy;
            destroy = null;
        }
        options = Object.assign(Object.create(null), options);

        if ($.playbackOptions) {
            String($.playbackOptions).replace(/(\d+)(\w)/g, function(m, v, k) {
                if (k === 's') {
                    options.startTime = v | 0;
                }
                else if (k === 'f') {
                    v = String(v | 0);
                    while (v.length < 6) {
                        if (v.length & 1) {
                            v = '1' + v;
                        }
                        v = '0' + v;
                    }
                    options.filter = v.slice(-6).split(/(.{2})/).filter(String);
                }
            });
            $.playbackOptions = null;
        }

        if (!options.type) {
            var c = MediaAttribute.getCodecStrings(node);
            if (c) {
                options.type = c && c[0];
            }
        }
        var s = Streamer(node.link || node.h, $wrapper.find('video').get(0), options);

        _initVideoControls($wrapper, s, node, options);

        destroy = destroy || function() {
            s.destroy();
            $wrapper.trigger('video-destroy');
        };
        s.abort = destroy;

        s.on('inactivity', function(ev) {
            // Event invoked when the video becomes stalled, we'll show the loading/buffering spinner
            if (d) {
                console.debug(ev.type, ev);
            }

            var $pinner = $wrapper.find('.viewer-pending');
            $pinner.removeClass('hidden');
            $pinner.find('span').text(navigator.onLine === false ? 'No internet access.' : '');

            if (this.isOverQuota) {
                var self = this;
                var file = this.file;
                var video = this.video;

                $wrapper.trigger('is-over-quota');
                dlmanager.showOverQuotaDialog(function() {
                    dlmanager.onNolongerOverquota();
                    file.flushRetryQueue();

                    if (video.paused) {
                        $wrapper.removeClass('paused');
                        $pinner.removeClass('hidden');
                        onIdle(self.play.bind(self));
                    }
                });

                onOverQuotaCT = (s.currentTime | 0) + 1;

                eventlog(is_embed ? 99708 : folderlink ? 99709 : fminitialized ? 99710 : 99707);
            }
            else if (navigator.onLine && this.gotIntoBuffering) {
                var data = [
                    3,
                    s.hasVideo, s.hasAudio, Math.round(s.getProperty('bitrate')), s.getProperty('server'),
                    s.playbackTook, node.ph || node.h
                ];

                if (d) {
                    console.log(ev.type, data, this);
                }
                eventlog(99694, JSON.stringify(data), true);
            }

            return true; // continue listening
        });

        s.on('activity', function(ev) {
            // Event invoked when the video is no longer stalled
            if (d) {
                console.debug(ev.type, ev);
            }

            var $pinner = $wrapper.find('.viewer-pending');
            if (this.file.playing) {
                // only hide the spinner if we are not in the initial loading state
                $pinner.addClass('hidden');
            }
            $pinner.find('span').text('');

            // if resumed from over bandwidth quota state.
            if (onOverQuotaCT && s.currentTime > onOverQuotaCT) {
                onOverQuotaCT = false;
                eventlog(99705);
            }

            return true; // continue listening
        });

        s.on('error', function(ev, error) {
            // <video>'s element `error` handler

            var emsg;
            var info = [2].concat(MediaAttribute.getCodecStrings(node)).concat(s.hasVideo, s.hasAudio);

            if (!$.dialog) {
                var hint = error.message || error;
                info.push(String(hint || 'na'));

                if (!hint && !mega.chrome) {
                    // Suggest Chrome...
                    hint = l[16151] + ' ' + l[242];
                }

                switch (String(hint)) {
                    case 'Blocked':
                    case 'Not found':
                    case 'Access denied':
                        emsg = l[23];
                        break;
                    case 'The provided type is not supported':
                        emsg = l[17743];
                        break;
                    default:
                        emsg = hint;
                }

                if (s.options.autoplay) {
                    msgDialog('warninga', l[135], l[47], emsg);
                }
                else {
                    // $wrapper.removeClass('video-theatre-mode video');
                }
            }
            if (d) {
                console.debug('ct=%s, buf=%s', this.video.currentTime, this.stream.bufTime, error, info);
            }
            destroy();
            s.error = emsg;

            if (!d && String(Object.entries).indexOf('native') > 0
                && !window.buildOlderThan10Days && emsg && emsg !== l[23]) {

                eventlog(99669, JSON.stringify(info));
            }
        });

        s.on('playing', function() {
            var events = {
                'WebM': 99681, 'MPEG Audio': 99684, 'M4A ': 99687, 'Wave': 99688, 'Ogg': 99689, 'FLAC': 99712
            };
            var eid = events[s.options.type] || 99668;

            if (eid === 99684 && node.s > 41943040) {
                eid = 99685;
            }
            else if (eid === 99712 && node.s > 314572800) {
                eid = 99713;
            }

            console.assert(eid !== 99668 || is_video(node) !== 2, 'This is not a video...');
            eventlog(eid);
        });

        if (typeof dataURLToAB === 'function') {
            _makethumb(node, s);
        }

        $(window).rebind('video-destroy.main', function() {
            $('.mobile.filetype-img').removeClass('hidden');
            s.abort();
        });

        return s;
    };

    /**
     * Fire video stream
     * @param {MegaNode} node An ufs node
     * @param {Object} wrapper Video element wrapper
     * @param {Function} [destroy] Function to invoke when the video is destroyed
     * @param {Object} [options] Streamer options
     * @returns {MegaPromise}
     * @global
     */
    global.initVideoStream = function(node, wrapper, destroy, options) {
        var _init = function() {
            dlmanager.setUserFlags();
            return _initVideoStream(node, wrapper, destroy, options);
        };
        return new MegaPromise(function(resolve, reject) {
            if (typeof Streamer !== 'undefined') {
                return resolve(_init());
            }
            M.require('videostream').tryCatch(function() {
                resolve(_init());
            }, function(ex) {
                msgDialog('warninga', l[135], l[47], ex);
                reject(ex);
            });
        });
    };

    /**
     * Initialize common video player layout for the downloads and embed pages
     * @param {MegaNode} node An ufs node
     * @param {Object} $wrapper Video element wrapper
     * @param {Object} [options] Streamer options
     * @returns {MegaPromise}
     * @global
     */
    global.iniVideoStreamLayout = function(node, $wrapper, options) {
        var $fileinfoBlock = $('.download.file-info', $wrapper);
        var $fn = $('.big-txt', $fileinfoBlock);

        if (!$.trim($fn.text())) {
            $fn.text(node.name);
        }

        return new MegaPromise(function(resolve, reject) {
            MediaAttribute.canPlayMedia(node).then(function(yup) {
                var c = MediaAttribute.getCodecStrings(node);
                if (c) {
                    $fn.attr('title', node.name + ' (' + c + ')');
                }

                if (!yup) {
                    if (String(node.fa).indexOf(':8*') > 0 && isMediaSourceSupported()) {
                        eventlog(99714, JSON.stringify([1, node.ph || node.h].concat(c)));
                    }
                    return resolve(false);
                }
                var $video = $wrapper.find('video');
                if (!$video.length) {
                    return reject(new Error('No video element found...'));
                }

                // Disable default video controls
                $video.get(0).controls = false;

                getImage(node, 1).then(function(uri) {
                    $video.attr('poster', uri);
                }).catch(console.debug.bind(console));

                options = Object.assign({autoplay: false, preBuffer: true}, options);

                var vsp = options.preBuffer && initVideoStream(node, $wrapper, options);

                $('.play-video-button', $wrapper).rebind('click', function() {
                    if (dlmanager.isOverQuota) {
                        $wrapper.trigger('is-over-quota');
                        return dlmanager.showOverQuotaDialog();
                    }

                    if (typeof mediaCollectFn === 'function') {
                        onIdle(mediaCollectFn);
                        mediaCollectFn = null;
                    }

                    // Show Loader until video is playing
                    $wrapper.find('.viewer-pending').removeClass('hidden');

                    if (!vsp) {
                        vsp = initVideoStream(node, $wrapper, options);
                        resolve(vsp);
                    }

                    vsp.done(function(stream) {
                        if (stream.error) {
                            onIdle(function() {
                                $wrapper.removeClass('video-theatre-mode video');
                            });
                            return msgDialog('warninga', l[135], l[47], stream.error);
                        }

                        // _makethumb(node, stream);
                        if (is_embed) {
                            node.stream = stream;
                        }
                        stream.play();
                    }).fail(console.warn.bind(console));

                    $wrapper.addClass('video-theatre-mode');
                });

                if (vsp) {
                    resolve(vsp);
                }
            }).catch(reject);
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
    Object.defineProperty(MediaInfoReport.prototype, 'rotation', {
        get: function() {
            var v = Object(this.Video && this.Video[0]);
            return v.Rotation | 0;
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
            var db;
            var timer;
            var apiReq = function() {
                var prc = function(res) {
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
                    if (db) {
                        db.kv.put({k: 'l', t: Date.now(), v: data});
                    }
                    resolve(mediaCodecs);
                };
                api_req({a: 'mc'}, {callback: tryCatch(prc, reject)});
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

            if (typeof Dexie !== 'undefined') {
                var dbname = '$mcv1';
                db = new Dexie(dbname);
                db.version(1).stores({kv: '&k'});
                db.open().then(read).catch(console.warn.bind(console, dbname));
                timer = setTimeout(apiReq, 800);

                // save the db name for our getDatabaseNames polyfill
                localStorage['_$mdb$' + dbname] = 1;
            }
            else {
                apiReq();
            }
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
                chunkSize: -1,
                maxBytesRead: 6291456
            }, options);

            for (var i = entries.length; i--;) {
                var entry = new MediaAttribute(entries[i]);
                var size = entry.s || entry.size || 0;

                if (size > 16 && MediaInfoLib.isFileSupported(entry) && entry.weak) {
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
                    r.a = n.fromAttributeString(
                        String(r.fa).split('/').map(function(a) {
                            return 'cl:' + a;
                        }).join('/')
                    );

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
                        _nextChunk(self.chunkSize < 0x2000 ? Math.min(0x80000, length << 1) : self.chunkSize);
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
        if (localStorage.noMediaCollect || miCollectedBytes > 0x1000000 || M.chat) {
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

            var finish = function() {
                if (d) {
                    console.debug('MediaInfo collect finished.');
                    console.timeEnd('mediainfo:collect');
                }
                miCollectRunning = false;
            };

            MediaInfoLib.collect(M.v)
                .then(function(res) {
                    var pending = 0;
                    var process = function() {
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
                            process();
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

            if (!MediaInfoLib.isFileSupported(entry) || !((entry.s || entry.size) > 16)) {
                resolve(ENOENT);
            }
            else if (!entry.weak) {
                resolve(EEXIST);
            }
            else {
                MediaInfoLib(entry.link || entry.h, -1)
                    .getMetadata()
                    .then(entry.store.bind(entry))
                    .then(resolve)
                    .catch(reject);
            }
        });
    };

    var audioElement = document.createElement('audio');

    /**
     * Test a media attribute's decoded properties against MediaSource.isTypeSupported()
     * @param {String} container
     * @param {String} [videocodec]
     * @param {String} [audiocodec]
     * @returns {Number} 1: is video, 2: is audio, 0: not supported
     */
    MediaAttribute.isTypeSupported = function(container, videocodec, audiocodec) {
        var mime;
        var canPlayMSEAudio = function() {
            if (!videocodec && audiocodec) {
                audiocodec = String(audiocodec).replace(/-/g, '.').toLowerCase(); // fLaC

                if (String(audiocodec).startsWith('mp4a')) {
                    var swap = {'mp4a': 'mp4a.40.2', 'mp4a.69': 'mp3', 'mp4a.6b': 'mp3'};
                    audiocodec = swap[audiocodec] || audiocodec;
                }
                var amime = 'audio/mp4; codecs="' + audiocodec + '"';
                if (mega.chrome && audiocodec === 'mp3') {
                    amime = 'audio/mpeg';
                }
                return MediaSource.isTypeSupported(amime) ? 2 : 0;
            }
            return 0;
        };

        switch ('MediaSource' in window && container) {
            case 'mp41':
            case 'mp42':
            case 'isom':
            case 'iso2':
            case 'iso4':
            case 'iso5':
            case 'M4V ':
            case 'avc1': // JVT
            case 'f4v ': // Adobe Flash (MPEG-4 Part 12)
                if (videocodec === 'avc1') {
                    mime = 'video/mp4; codecs="avc1.640029';

                    if (0 && String(audiocodec).startsWith('mp4a')) {
                        if (audiocodec === 'mp4a') {
                            audiocodec = 'mp4a.40.2';
                        }
                        mime += ', ' + audiocodec.replace(/-/g, '.');
                    }

                    return MediaSource.isTypeSupported(mime + '"') ? 1 : 0;
                }
                return canPlayMSEAudio();

            case 'WebM':
                switch (mega.chrome && videocodec) {
                    case 'V_VP8':
                    case 'V_VP9':
                        var codec = videocodec.substr(2).toLowerCase();
                        return MediaSource.isTypeSupported('video/webm; codecs="' + codec + '"') ? 1 : 0;
                }
                break;

            case 'M4A ':
                if (!mega.fullAudioContextSupport) {
                    return canPlayMSEAudio();
                }
                mime = 'audio/aac';
            /* fallthrough */
            case 'Ogg':
                mime = mime || 'audio/ogg';
            /* fallthrough */
            case 'Wave':
                mime = mime || 'audio/wav';
            /* fallthrough */
            case 'FLAC':
                mime = mime || 'audio/flac';
            /* falls through */
            case 'MPEG Audio':
                if (!videocodec) {
                    mime = mime || (audiocodec === container ? 'audio/mpeg' : 'doh');
                    return mega.fullAudioContextSupport && audioElement.canPlayType(mime) ? 2 : 0;
                }
                break;
        }

        return 0;
    };

    var mediaTypeCache = Object.create(null);

    /**
     * Check whether a node is streamable, this is basically a synchronous version of canPlayMedia()
     * @param {MegaNode|Object} n The ufs-node
     * @returns {Number} 1: is video, 2: is audio, 0: not supported
     */
    MediaAttribute.getMediaType = function(n) {
        if (mediaTypeCache[n.h] === undefined) {
            // we won't initialize an usual MediaAttribute instance to make this as
            // lightweight as possible as used by is_video over a whole cloud folder contents.
            var a = MediaAttribute.prototype.fromAttributeString(n.fa, n.k);
            var r = 0;

            if (a && a.shortformat !== 0xff) {
                a = MediaAttribute.getCodecStrings(a);
                r = MediaAttribute.isTypeSupported.apply(null, a);
            }

            mediaTypeCache[n.h] = r;
        }

        return mediaTypeCache[n.h];
    };

    /**
     * Retrieve codecs/format string from decoded media attributes
     * @param {MegaNode|Object} a The decoded media attribute, or MegaNode
     * @param {Object} [mc] The media codecs list
     * @returns {Array|undefined}
     */
    MediaAttribute.getCodecStrings = function(a, mc) {
        mc = mc || MediaInfoLib.avflist;

        if (a instanceof MegaNode) {
            a = MediaAttribute.prototype.fromAttributeString(a.fa, a.k);

            if (!a || a.shortformat === 0xff) {
                return;
            }
        }

        if (mc) {
            var container = mc.container.byIdx[a.container];
            var videocodec = mc.video.byIdx[a.videocodec];
            var audiocodec = mc.audio.byIdx[a.audiocodec];

            if (a.shortformat) {
                var fmt = String(mc.shortformat.byIdx[a.shortformat]).split(':');

                container = fmt[0];
                videocodec = fmt[1];
                audiocodec = fmt[2];
            }

            mc = Object.create(Array.prototype, {
                toJSON: {
                    value: function() {
                        return this.slice();
                    }
                },
                toString: {
                    value: function() {
                        return array.unique(this).map(function(k) {
                            return String(k || '').trim();
                        }).filter(String).join('/');
                    }
                }
            });

            mc.push(container, videocodec, audiocodec);
            return mc;
        }

        delay('mc:missing', console.warn.bind(console, 'Media codecs list not loaded.'));
    };

    /**
     * Check whether can play media..
     * @param {MegaNode|Object} entry
     * @returns {Promise}
     */
    MediaAttribute.canPlayMedia = function(entry) {
        return new Promise(function(resolve, reject) {
            entry = new MediaAttribute(entry);

            var mfa = entry.data;
            if (!mfa || !('MediaSource' in window)) {
                return resolve(false);
            }

            MediaInfoLib.getMediaCodecsList()
                .then(function(mc) {
                    mfa = MediaAttribute.getCodecStrings(mfa, mc);
                    resolve(MediaAttribute.isTypeSupported.apply(null, mfa));
                })
                .catch(reject);
        });
    };

    MediaAttribute.test = function() {
        var n = new MegaNode({
            h: '876543x1',
            fa: '470:8*COXwfdF5an8',
            k: [-989750631, -795573481, -2084370882, 1515041341, -5120575, 233480270, -727919728, 1882664925]
        });
        var l = MediaInfoLib.avflist;
        var a = new MediaAttribute(n);
        var d = a.fromAttributeString();
        var s = MediaAttribute.getCodecStrings(d);

        console.log('MediaAttribute.test', s, d, a);

        d.containerid = l.container[s[0]].idx;
        d.vcodecid = l.video[s[1]].idx;
        d.acodecid = l.audio[s[2]].idx;

        console.log('MediaAttribute.test %s', a.toAttributeString(d) === n.fa.split(':')[1] ? 'OK' : 'FAILED');
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

        if (!Array.isArray(filekey) || filekey.length !== 8) {
            return '';
        }

        if (!(container && (vcodec && (acodec || !res.acodec) && width && height || acodec && !vcodec))) {
            shortformat = 255;
            fps = MediaInfoLib.build;
            width = MediaInfoLib.version;
            playtime = this.avflv;
        }
        else {
            var r = res.rotation;

            if (r === 90 || r === 270) {
                r = width;
                width = height;
                height = r;
            }
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
        if (!Array.isArray(filekey) || filekey.length !== 8) {
            attrs = null;
        }
        var pos = String(attrs).indexOf(':8*');

        if (pos >= 0) {
            var v = new Uint32Array(base64_to_ab(attrs.substr(pos + 3, 11)), 0, 2);
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
                pos = attrs.indexOf(':9*');

                if (pos >= 0) {
                    v = new Uint32Array(base64_to_ab(attrs.substr(pos + 3, 11)), 0, 2);
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
                    n.fa = fa;
                    M.nodeUpdated(n);

                    if (res.playtime && M.viewmode && n.p === M.currentdirid) {
                        $('#' + n.h)
                            .find('.data-block-bg').addClass('video')
                            .find('.video-thumb-details span').text(secondsToTimeShort(res.playtime));
                    }
                }
                self.fa = fa;

                resolve(self);
            };

            M.req(req).tryCatch(success, reject);

            if (!res.vcodec && req.n) {
                if (Object(res.General).Cover_Data) {
                    try {
                        setImage(self, str_to_ab(atob(res.General.Cover_Data)));
                    }
                    catch (ex) {
                        console.warn(ex);
                    }
                }
                else if (res.container === 'MPEG Audio' || res.container === 'FLAC') {
                    getID3CoverArt(res.entry).then(setImage.bind(null, self)).catch(console.debug.bind(console));
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

                return a.fps < MediaInfoLib.build || a.width < MediaInfoLib.version || a.playtime < this.avflv;
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

mBroadcaster.once('startMega', function isAudioContextSupported() {
    'use strict';

    if ('AudioContext' in window) {
        var ctx;
        var stream;

        try {
            ctx = new AudioContext();
            stream = new MediaStream();
            stream = ctx.createMediaStreamDestination();
            stream.connect(ctx.destination);
        }
        catch (ex) {
            console.debug('This browser does not support advanced audio streaming...', ex);
        }
        finally {
            if (ctx && typeof ctx.close === 'function') {
                var p = ctx.close();
                if (p instanceof Promise) {
                    p.then(function() {
                        mega.fullAudioContextSupport = stream && stream.numberOfOutputs > 0;
                    });
                }
            }
        }
    }
});
