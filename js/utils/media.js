function isStreamingEnabled() {
    'use strict';
    // return !window.safari || d;
    return true;
}

function isMediaSourceSupported() {
    'use strict'; // https://caniuse.com/#feat=mediasource
    return window.MediaSource && typeof MediaSource.isTypeSupported === 'function' && isStreamingEnabled();
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
 * Check whether a node is an streamable audio file.
 * @param {MegaNode} n The node.
 * @returns {Boolean} whether it is
 */
function is_audio(n) {
    'use strict';
    return is_video(n) === 2 || /\.(mp3|wav|flac)$/i.test(n && n.name);
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
    return ext !== 'PDF' && ext !== 'DOCX' && is_image2(n, ext);
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
    'JFIF': 1,
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
    "ARI": "Arri Alexa RAW Format",
    "ARQ": "Sony Alpha Pixel-Shift RAW (TIFF-based)",
    "ARW": "Sony Alpha RAW (TIFF-based)",
    "BAY": "Casio RAW Camera Image File Format",
    "BMQ": "NuCore Raw Image File",
    "CAP": "Phase One Digital Camera Raw Image",
    "CINE": "Phantom Software Raw Image File.",
    "CR2": "Canon RAW 2 (TIFF-based)",
    "CR3": "Canon RAW 3 (QuickTime-based)",
    "CRW": "Canon RAW Camera Image File Format (CRW spec.)",
    "CIFF": "Canon RAW Camera Image File Format (CRW spec.)",
    "CS1": "Sinar CaptureShop 1-shot RAW (PSD-based)",
    "DC2": "Kodak DC25 Digital Camera File",
    "DCR": "Kodak Digital Camera RAW (TIFF-based)",
    "DSC": "Kodak Digital Camera RAW Image (TIFF-based)",
    "DNG": "Digital Negative (TIFF-based)",
    "DRF": "Kodak Digital Camera RAW Image (TIFF-based)",
    "EIP": "Phase One Intelligent Image Quality RAW (TIFF-based)",
    "ERF": "Epson RAW Format (TIFF-based)",
    "FFF": "Hasselblad RAW (TIFF-based)",
    "IA": "Sinar Raw Image File",
    "IIQ": "Phase One Intelligent Image Quality RAW (TIFF-based)",
    "K25": "Kodak DC25 RAW (TIFF-based)",
    "KC2": "Kodak DCS200 Digital Camera Raw Image Format",
    "KDC": "Kodak Digital Camera RAW (TIFF-based)",
    "MDC": "Minolta RD175 Digital Camera Raw Image",
    "MEF": "Mamiya (RAW) Electronic Format (TIFF-based)",
    "MOS": "Leaf Camera RAW File",
    "MRW": "Minolta RAW",
    "NEF": "Nikon (RAW) Electronic Format (TIFF-based)",
    "NRW": "Nikon RAW (2) (TIFF-based)",
    "OBM": "Olympus RAW Format (TIFF-based)",
    "ORF": "Olympus RAW Format (TIFF-based)",
    "ORI": "Olympus RAW Format (TIFF-based?)",
    "PEF": "Pentax (RAW) Electronic Format (TIFF-based)",
    "PTX": "Pentax (RAW) Electronic Format (TIFF-based)",
    "PXN": "Logitech Digital Camera Raw Image Format",
    "QTK": "Apple Quicktake 100/150 Digital Camera Raw Image",
    "RAF": "FujiFilm RAW Format",
    "RAW": "Panasonic RAW (TIFF-based)",
    "RDC": "Digital Foto Maker Raw Image File",
    "RW2": "Panasonic RAW 2 (TIFF-based)",
    "RWL": "Leica RAW (TIFF-based)",
    "RWZ": "Rawzor Digital Camera Raw Image Format",
    "SR2": "Sony RAW 2 (TIFF-based)",
    "SRF": "Sony RAW Format (TIFF-based)",
    "SRW": "Samsung RAW format (TIFF-based)",
    "STI": "Sinar Capture Shop Raw Image File",
    "X3F": "Sigma/Foveon RAW"
};

/**
 * Global function to Check if the node is for a textual file
 * @param {MegaNode} node An ufs node.
 * @returns {Boolean} Whether it's a text/plain file
 */
function is_text(node) {
    'use strict';
    if (!node || node.fa || node.s === undefined || node.s > 2e7) {
        return false;
    }

    var fext = fileext(node.name);
    if (!fext) {
        return true;
    }

    var fType = filetype(node, true)[0];
    if (fType === 'text' || fType === 'web-data' || fType === 'web-lang' || fType === 'mega') {
        return true;
    }

    if (fmconfig.editorext && fmconfig.editorext.indexOf(fext.toLowerCase()) > -1) {
        return true;
    }

    return false;
}

var mThumbHandler = {
    sup: Object.create(null),

    add: function(exts, parser) {
        'use strict';
        parser = ((handler) => promisify((resolve, reject, data) => handler(data, resolve)))(parser);

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

mThumbHandler.add('DOCX', function DOCXThumbHandler(ab, cb) {
    'use strict';

    // @todo ..
    cb(null);
});

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

mThumbHandler.add('PDF', function PDFThumbHandler(ab, cb) {
    'use strict';

    M.require('pdfjs').then(function() {
        if (!PDFThumbHandler.q) {
            PDFThumbHandler.q = function PDFThumbQueueHandler(task, done) {
                var buffer = task[0];
                var callback = task[1];
                var tag = 'pdf-thumber.' + makeUUID();
                var logger = PDFThumbHandler.q.logger;
                var finish = function(buf) {
                    if (done) {
                        onIdle(done);
                        done = null;
                    }

                    if (d) {
                        console.timeEnd(tag);
                    }
                    callback(buf);
                };

                if (d) {
                    logger.info('[%s] Starting pdf thumbnail creation...', tag, buffer.byteLength);
                    console.time(tag);
                }

                if (!window.pdfjsLib || typeof pdfjsLib.getPreviewImage !== 'function') {
                    if (d) {
                        logger.warn('unexpected pdf.js instance/state...');
                    }
                    return finish();
                }

                pdfjsLib.getPreviewImage(buffer).then(function(buffer) {

                    if (d) {
                        logger.log('[%s] %sx%s (%s bytes)', tag, buffer.width, buffer.height, buffer.byteLength);
                    }

                    finish(buffer);
                    eventlog(99661);// Generated PDF thumbnail.
                }).catch(function(ex) {
                    if (d) {
                        logger.warn('[%s] Failed to create PDF thumbnail.', tag, ex);
                    }
                    finish();
                });
            };
            PDFThumbHandler.q = new MegaQueue(PDFThumbHandler.q, mega.maxWorkers, 'pdf-thumber');

            if (d) {
                console.info('Using pdf.js %s (%s)', pdfjsLib.version, pdfjsLib.build);
            }
        }
        var q = PDFThumbHandler.q;

        if (d) {
            var bytes = q._queue.reduce(function(r, v) {
                r += v[0][0].byteLength;
                return r;
            }, 0);
            q.logger.debug('Queueing pdf thumbnail creation (%s waiting, %s bytes)', q._queue.length, bytes);
        }
        q.push([ab, cb]);
        ab = cb = undefined;
    }).catch(function(ex) {
        if (d) {
            console.warn(ex);
        }
        cb(null);
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

mBroadcaster.once('startMega', tryCatch(() => {
    'use strict';
    const images = [
        [
            'JXL',
            'image/jxl',
            '/woAkAEAEogCAMAAPeESAAAVKqOMG7yc6/nyQ4fFtI3rDG21bWEJY7O9MEhIOIONi4LdHIrhMyApVJIA'
        ],
        [
            'WEBP',
            'image/webp',
            'UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA'
        ],
        [
            'AVIF',
            'image/avif',
            `AAAAHGZ0eXBtaWYxAAAAAG1pZjFhdmlmbWlhZgAAAPJtZXRhAAAAAAAAACtoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAZ28tYXZp
            ZiB2MAAAAAAOcGl0bQAAAAAAAQAAAB5pbG9jAAAAAARAAAEAAQAAAAABFgABAAAAGAAAAChpaW5mAAAAAAABAAAAGmluZmUCAAAAAAEAA
            GF2MDFJbWFnZQAAAABnaXBycAAAAEhpcGNvAAAAFGlzcGUAAAAAAAAAAQAAAAEAAAAQcGFzcAAAAAEAAAABAAAADGF2MUOBAAwAAAAAEH
            BpeGkAAAAAAwgICAAAABdpcG1hAAAAAAAAAAEAAQQBAoOEAAAAIG1kYXQSAAoFGAAOwCAyDR/wAABgBgAAAACsyvA=`
        ],
        [
            'HEIC',
            'image/heic',
            `AAAAGGZ0eXBoZWljAAAAAGhlaWNtaWYxAAABvm1ldGEAAAAAAAAAImhkbHIAAAAAAAAAAHBpY3QAAAAAAAAAAAAAAAAAAAAAACRkaW5m
            AAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAA5waXRtAAAAAAABAAAAOGlpbmYAAAAAAAIAAAAVaW5mZQIAAAAAAQAAaHZjMQAAA
            AAVaW5mZQIAAAEAAgAARXhpZgAAAAAaaXJlZgAAAAAAAAAOY2RzYwACAAEAAQAAAOBpcHJwAAAAwGlwY28AAAATY29scm5jbHgAAgACAA
            aAAAAAeGh2Y0MBAWAAAACwAAAAAAAe8AD8/fj4AAAPA6AAAQAXQAEMAf//AWAAAAMAsAAAAwAAAwAeLAmhAAEAIkIBAQFgAAADALAAAAM
            AAAMAHqEickmcuSRKSXE3AgIGpAKiAAEAEUQBwGDAkwE6RERJEkSRJEqQAAAAFGlzcGUAAAAAAAAAAgAAAAIAAAAJaXJvdAAAAAAQcGl4
            aQAAAAADCAgIAAAAGGlwbWEAAAAAAAAAAQABBYGCA4QFAAAALGlsb2MAAAAARAAAAgABAAAAAQAAAeYAAAASAAIAAAABAAAB5gAAAAAAA
            AABbWRhdAAAAAAAAAAiAAAADiYBrcDmF9NIDoIkoml4`
        ]
    ];
    const supported = [];
    let count = images.length;

    const test = (name, mime, data) => {
        const img = new Image();
        const done = () => {
            if (!--count && self.d) {
                console.info(`This browser does support decoding ${supported} images.`);
            }
            img.onload = img.onerror = undefined;
        };
        img.onload = function() {
            if (this.naturalWidth > 0) {
                is_image.def[name] = 1;
                delete mThumbHandler.sup[name];
                supported.push(name);
            }
            done();
        };
        img.onerror = done;
        img.src = `data:${mime};base64,${data.replace(/\s+/g, '')}`;
    };

    for (let i = images.length; i--;) {

        test(...images[i]);
    }
}));


// ---------------------------------------------------------------------------------------------------------------

/**
 * Retrieve file attribute image
 * @param {MegaNode} node The node to get associated image with
 * @param {Number} [type] Image type, 0: thumbnail, 1: preview
 * @param {Boolean} [raw] get back raw buffer, otherwise a blob: URI
 * @returns {Promise}
 */
function getImage(node, type, raw) {
    'use strict';
    const entry = `${Object(node).h}!${type |= 0}.${raw |= 0}`;

    if (!type && thumbnails.has(node.fa) && !raw) {
        return Promise.resolve(thumbnails.get(node.fa));
    }

    if (getImage.cache.has(entry)) {
        const value = getImage.cache.get(entry);
        return value instanceof Promise ? value : Promise.resolve(value);
    }

    const promise = new Promise((resolve, reject) => {
        const onload = (a, b, data) => {
            if (data === 0xDEAD) {
                getImage.cache.delete(entry);
                reject(node);
            }
            else {
                const value = raw ? data : mObjectURL([data.buffer || data], 'image/jpeg');

                getImage.cache.set(entry, value);
                resolve(value);
            }
        };

        api_getfileattr({[node.fa]: node}, type, onload, reject).catch(dump);
    });

    getImage.cache.set(entry, promise);
    return promise;
}

/** @property getImage.cache */
lazy(getImage, 'cache', () => {
    'use strict';
    return new LRUMap(23, (uri) => typeof uri === 'string' && URL.revokeObjectURL(uri));
});

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
                        while (u8[offset++]) {}
                        ++offset;
                        if (u8[offset] === 0xFF && u8[offset + 1] === 0xFE
                            || u8[offset] === 0xFE && u8[offset + 1] === 0xFF) {

                            while (u8[offset]) {
                                offset += 2;
                            }
                            offset += 3;
                            frame.size += offset; // fixme..
                        }
                        else {
                            while (u8[offset++]) {}
                            ++offset;
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
FullScreenManager.prototype.destroy = function(keep) {
    'use strict';

    if (!this.destroyed) {
        this.destroyed = true;
        this.$button.off('click.' + this.iid);
        this.$document.off('fullscreenchange.' + this.iid);

        if (!keep) {
            this.exitFullscreen();
        }
        this.$button = this.$document = this.listeners = null;
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

                if (this.duration) {
                    const took = Math.round(2 * this.duration / 100);

                    if (d) {
                        console.debug('Video thumbnail missing, will take image at %s...', secondsToTime(took));
                    }

                    this.on('timeupdate', function() {
                        if (this.currentTime < took) {
                            return true;
                        }

                        this.getImage().then(setImage.bind(null, n)).catch(console.warn.bind(console));
                    });

                    return false;
                }

                return true;
            };

            if (is_audio(n)) {
                stream.on('audio-buffer', function(ev, buffer) {
                    getID3CoverArt(buffer).then(setImage.bind(null, n)).catch(console.debug.bind(console));
                });
            }
            else {
                stream.on('playing', onVideoPlaying);
            }
        }
    };

    /** Animation for hiding the mobile video controls*/
    var hideMobileVideoControls = null;

    /**
     * Init & reset hide the mobile video controls animation function
     * @param $wrapper
     * @private
     */
    var _initHideMobileVideoControls = function($wrapper) {
        clearTimeout(hideMobileVideoControls);
        hideMobileVideoControls = setTimeout(function() {
            $('.video-controls', $wrapper).addClass('invisible');
            $('.viewer-vad-control', $wrapper).addClass('bottom');
        }, 3000);
    };

    const _createSubtitlesManager = tryCatch((node, $wrapper, $video, $videoControls, $playpause) => {
        let continuePlay, $subtitles;
        const video = $video.get(0);
        const $button = $('button.subtitles', $videoControls);
        const manager = mega.utils.subtitles.init();
        // Subtitles context menu
        let menu = $('.context-menu.subtitles', $wrapper).get(0);
        if (!menu) {
            menu = contextMenu.create({
                template: $('#media-viewer-subtitles-menu', $wrapper)[0],
                sibling: $('.subtitles-wrapper .tooltip', $wrapper)[0],
                animationDuration: 150,
                boundingElement: $wrapper[0]
            });
        }
        const destroy = tryCatch(() => {
            if ($subtitles) {
                $subtitles.off();
            }
            if (menu) {
                contextMenu.close(menu);
            }
            $button.off().parent().addClass('hidden');
            manager.destroySubtitlesMenu();
        });
        onIdle(() => manager.configure(node).catch(destroy));

        // Subtitles icon
        $button.rebind('click.media-viewer', tryCatch(() => {
            if ($button.hasClass('active')) {
                $button.removeClass('active deactivated');
                contextMenu.close(menu);
            }
            else if (video) {
                if (video.paused) {
                    continuePlay = false;
                }
                else {
                    continuePlay = true;
                    video.pause();
                    $wrapper.rebind('mouseup.close-subtitles-context-menu', () => {
                        if (video.paused) {
                            $playpause.trigger('click');
                        }
                        $wrapper.off('mouseup.close-subtitles-context-menu');
                    });
                }
                $button.addClass('active deactivated').trigger('simpletipClose');
                // eslint-disable-next-line local-rules/open -- not a window.open() call.
                contextMenu.open(menu);

                mBroadcaster.sendMessage('trk:event', 'media-journey', 'subtitles', 'open');
            }
            return false;
        }));

        // Bind Subtitles context menu
        $('.context-menu.subtitles', $wrapper).rebind('click.media-viewer', 'button', tryCatch((ev) => {
            const $this = $(ev.currentTarget);
            const name = $this[0].className;
            const index = name === 'add' ? -1 : $this.index();
            const {length} = $this.parent().children();

            if (index >= 0 && index < length) {
                const success = manager.select(index - 1);

                if (success || success === undefined) {
                    $('div.video-subtitles', $wrapper).remove();
                    $subtitles = null;

                    if (index > 0) {
                        const subtitlesElement = document.createElement('div');
                        subtitlesElement.setAttribute('class', 'video-subtitles');
                        video.after(subtitlesElement);

                        $subtitles = $('div.video-subtitles', $wrapper);
                        $subtitles.rebind('click.subtitles', () => {
                            $video.trigger('click');
                        });
                        $subtitles.rebind('dblclick.subtitles', () => {
                            $video.trigger('dblclick');
                        });
                        manager.displaySubtitles(video.streamer, $subtitles);
                        $button.addClass('mask-color-brand');
                        $('i', $button).removeClass('icon-subtitles-02-small-regular-outline')
                            .addClass('icon-subtitles-02-small-regular-solid');
                        mBroadcaster.sendMessage('trk:event', 'media-journey', 'subtitles', 'select');
                    }
                    else {
                        $button.removeClass('mask-color-brand');
                        $('i', $button).addClass('icon-subtitles-02-small-regular-outline')
                            .removeClass('icon-subtitles-02-small-regular-solid');
                        mBroadcaster.sendMessage('trk:event', 'media-journey', 'subtitles', 'off');
                    }
                    $('.context-menu.subtitles button i', $wrapper).addClass('hidden');
                    $(`.context-menu.subtitles button.${name} i`, $wrapper).removeClass('hidden');
                }
            }
            else if (index === -1) {
                if (!video.paused) {
                    continuePlay = true;
                    video.pause();
                }
                manager.addSubtitlesDialog(continuePlay);
            }
        }));
        $button.parent().removeClass('hidden');

        return freeze({
            destroy,
            get isVisible() {
                return $.dialog === 'subtitles-dialog' || menu.classList.contains('visible');
            },
            fire(ev) {
                if (ev.type === 'mouseup') {
                    const $target = $(ev.target);
                    if (!$target.closest('button.subtitles').length
                        && $button.hasClass('active')) {

                        $button.trigger('click.media-viewer');
                    }
                }
                else {
                    return true;
                }
            },
            display(streamer) {
                if ($subtitles) {
                    manager.displaySubtitles(streamer, $subtitles);
                }
                video.streamer = streamer;
            },
        });
    });

    // @private Init custom video controls
    var _initVideoControls = function(wrapper, streamer, node, options) {
        var $wrapper = $(wrapper);
        var $video = $('video', $wrapper);
        var videoElement = $video.get(0);
        var $videoContainer = $video.parent();
        var $videoControls = $('.video-controls', $wrapper);
        var $playVideoButton = $('.play-video-button', $wrapper);
        var $document = $(document);
        var filters = Object.create(null);
        let duration, playevent;
        const fadeTiming = 300;
        const MOUSE_IDLE_TID = 'auto-hide-media-controls';
        const SPRITE = is_embed ? 'sprite-embed-mono' : 'sprite-fm-mono';
        const $playPauseButton = $('.play-pause-video-button', $wrapper);
        const $watchAgainButton = $('.watch-again-button', $wrapper);
        let subtitlesManager, speedMenu, settingsMenu;

        const props = Object.defineProperties(Object.create(null), {
            duration: {
                get() {
                    return duration || streamer && streamer.duration;
                }
            }
        });

        /* Drag status */
        let timeDrag = false;

        // Set volume icon default state
        $('.vol-wrapper', $wrapper).removeClass('audio');

        // Obtain handles to buttons and other elements
        var $playpause = $('.playpause', $videoControls);
        var $mute = $('.mute', $videoControls);
        var $progress = $('.video-progress-bar', $videoControls);
        var $progressBar = $('.video-time-bar', $videoControls);
        var $fullscreen = $('.fs', $videoControls);
        var $volumeBar = $('.volume-bar', $videoControls);
        var $pendingBlock = $('.loader-grad', $wrapper);
        const $repeat = $('.repeat', $videoControls);
        const $speed = $('.speed', $videoControls);
        const $settings = $('button.settings', $videoControls);

        // time-update elements and helpers.
        var onTimeUpdate;
        var setTimeUpdate;
        var progressBarElementStyle = $progressBar.get(0).style;
        var videoTimingElement = $('.video-timing.current', $wrapper).get(0);

        const $expectTimeBar = $('.video-expected-time-bar', $videoControls);
        const $progressTimeBar = $('.video-progress-time', $videoControls);

        const storeCurrentTime = tryCatch((v) => {
            sessionStorage.previewTime = v;
        });

        // set idle state, i.e. hide controls
        var setIdle = function(value) {
            if (setIdle.value !== value) {
                setIdle.value = value;
                onTimeUpdate.last = null;

                if (value) {
                    $wrapper.addClass('mouse-idle');
                }
                else {
                    setTimeUpdate();
                    $wrapper.removeClass('mouse-idle');
                }
            }
        };

        // As the video is playing, update the progress bar
        onTimeUpdate = function(offset, length) {
            offset = (offset > length ? length : offset) | 0;

            if (offset !== onTimeUpdate.last) {
                onTimeUpdate.last = offset;

                if (!setIdle.value) {
                    videoTimingElement.textContent = secondsToTimeShort(offset, 1);
                    progressBarElementStyle.setProperty('width', `${100 * offset / length}%`);
                }

                if (offset % 2) {
                    // Store the current time in session storage such that we can restore on reload.
                    storeCurrentTime(offset);
                }

                if (subtitlesManager) {
                    subtitlesManager.display(streamer);
                }
            }
        };

        // programmatic timeupdate helper
        setTimeUpdate = function() {
            if (streamer) {
                onTimeUpdate(streamer.currentTime, props.duration);
            }
        };
        $video.rebind('timeupdate.xyz', setTimeUpdate);

        const volumeIcon = (volume) => {
            if (volume < 0.5) {
                return 'icon-volume-small-regular-outline';
            }

            if (volume >= 0.5 && volume < 0.75) {
                return 'icon-volume-min-small-regular-outline';
            }

            return 'icon-volume-max-small-regular-outline';
        };

        const getTimeOffset = (x) => {
            const maxduration = props.duration || 0;
            const position = x - $progress.offset().left; // Click pos
            const percentage = Math.max(0, Math.min(100, 100 * position / $progress.width()));
            const selectedTime = Math.round(maxduration * percentage / 100);
            return {time: selectedTime | 0, percent: percentage};
        };

        // Update Progress Bar control
        const updatebar = (x) => {
            if (streamer) {
                const o = getTimeOffset(x);
                const t = secondsToTimeShort(o.time, 1);

                // Update progress bar and video current time
                $progressTimeBar.text(t);
                videoTimingElement.textContent = t;
                progressBarElementStyle.setProperty('width', o.percent + '%');

                if (!timeDrag) {
                    streamer.currentTime = o.time;

                    // Also set startTime, needed by AudioStream.
                    options.startTime = o.time;
                }
            }
        };

        const showPauseBtn = () => {
            $playPauseButton.css('display', 'none');
            $playPauseButton.removeClass('hidden');
            $playPauseButton.fadeIn(fadeTiming);
        };

        const hidePauseBtn = delay.bind(null, 'hide-pause-btn', () => {
            $playPauseButton.fadeOut(fadeTiming, () => {
                $playPauseButton.addClass('hidden');
            });
        }, 1000);

        // Changes the button state of certain button's so the correct visuals can be displayed with CSS
        var changeButtonState = function(type) {

            // Play/Pause button
            if (type === 'playpause' && !timeDrag) {
                const {ended} = streamer || !1;
                const style = is_embed === 2 ? 'solid' : 'outline';

                if (ended) {
                    if ($repeat.mnh === node.h) {
                        $playpause.trigger('click');
                        return;
                    }

                    $('i', $playpause).removeClass(`icon-pause-small-regular-${style}`)
                        .addClass('icon-rotate-ccw-small-regular-outline');
                    $('.playpause-wrapper .tooltip', $wrapper).text(l.video_player_watch_again);
                    $watchAgainButton.removeClass('hidden');
                    videoElement.style.filter = `${videoElement.style.filter.replace('none', '')}blur(6px)`;
                    mBroadcaster.sendMessage('trk:event', 'media-journey', 'playback', 'ended');

                    if (is_embed === 2) {
                        $('.audio-wrapper .playpause-wrapper').addClass('hidden');
                        $('.audio-wrapper .play-video-button').removeClass('hidden');
                    }
                }
                else if (videoElement.paused) {
                    $('i', $playpause).removeClass(`icon-pause-small-regular-${style}`)
                        .addClass(`icon-play-small-regular-${style}`);
                    $('.playpause-wrapper .tooltip', $wrapper).text(l.video_player_play);
                    $pendingBlock.addClass('hidden');
                    $watchAgainButton.addClass('hidden');
                    showPauseBtn();
                    videoElement.style.filter = videoElement.style.filter.replace('blur(6px)', '');
                    $('i', $playPauseButton).removeClass('icon-play-small-regular-solid')
                        .addClass('icon-pause-small-regular-solid');
                    hidePauseBtn();

                    if (is_mobile && playevent) {
                        clearTimeout(hideMobileVideoControls);
                        $videoControls.removeClass('invisible');
                    }
                    $('.media-viewer', $wrapper).addClass('video-paused');
                }
                else {
                    $('i', $playpause).removeClass().addClass(`${SPRITE} icon-pause-small-regular-${style}`);
                    $('.playpause-wrapper .tooltip', $wrapper).text(l.video_player_pause);
                    $playVideoButton.addClass('hidden');
                    $watchAgainButton.addClass('hidden');
                    videoElement.style.filter = videoElement.style.filter.replace('blur(6px)', '');
                    if ($('i', $playPauseButton).hasClass('icon-pause-small-regular-solid')) {
                        showPauseBtn();
                        $('i', $playPauseButton).addClass('icon-play-small-regular-solid')
                            .removeClass('icon-pause-small-regular-solid');
                        hidePauseBtn();
                    }

                    if (is_embed === 2) {
                        $('.audio-wrapper .playpause-wrapper').removeClass('hidden');
                        $('.audio-wrapper .play-video-button').addClass('hidden');
                    }
                    $('.media-viewer', $wrapper).removeClass('video-paused');
                }
            }
            // Mute button
            else if (type === 'mute') {
                const $muteTooltip = $('.vol-wrapper .tooltip', $wrapper).removeClass('no-sound');
                if (videoElement.muted) {
                    $('i', $mute).removeClass().addClass(`${SPRITE} icon-volume-x-small-regular-outline`);
                    $muteTooltip.text(l.video_player_unmute);
                }
                else {
                    $('i', $mute).removeClass().addClass(`${SPRITE} ${volumeIcon(streamer.volume)}`);
                    $muteTooltip.text(l.video_player_mute);
                }
            }
        };

        var hideControls = function() {
            setIdle(false);
            if (dlmanager.isStreaming) {
                delay(MOUSE_IDLE_TID, () => {
                    if (streamer && !streamer.interrupted) {
                        setIdle(true);
                    }
                }, 2600);
            }
        };

        // Set video duration in progress bar
        var setDuration = function(value) {
            duration = value;
            $wrapper.find('.video-timing.duration').text(secondsToTimeShort(value, 1));
        };

        // Increase/decrease video speed
        var setVideoSpeed = function(rate) {
            if (rate) {
                const r = streamer.playbackRate;
                streamer.playbackRate = Math.min(Math.max(r + rate, 0.25), 6);
            }
            else {
                streamer.playbackRate = 1.0;
            }
        };

        // Increase/decrease video volume.
        var setVideoVolume = function(v) {
            if (videoElement.muted) {
                videoElement.muted = false;
                changeButtonState('mute');
            }
            streamer.volume += v;
            $('span', $volumeBar).css('width', Math.round(streamer.volume * 100) + '%');
        };

        // Increase/decrease color filter
        var setVideoFilter = function(v) {
            var style = [];
            var op = v > 0 && v < 4 ? 2 : v > 3 && v < 7 ? 5 : 8;
            var filter = ({'2': 'saturate', '5': 'contrast', '8': 'brightness'})[op];

            if (!v) {
                filters = Object.create(null);
                $('.reset-all', $videoControls).trigger('click');
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

            const $elm = $(`.${filter}-bar`, $videoControls);
            const pcn = Math.min(100, (filters[filter] || 1) * 50);
            $('span', $elm).css('width', `${pcn}%`);
            $elm.next().text(pcn);

            if (pcn !== 50) {
                $('.reset-all', $videoControls).removeClass('invisible');
            }
        };

        // Apply specific video filter
        var applyVideoFilter = function(s, c, b) {
            filters.saturate = s;
            filters.contrast = c;
            filters.brightness = b;
            videoElement.style.filter = 'saturate(' + s + ') contrast(' + c + ') brightness(' + b + ')';
        };

        // update Settings panel Bar control
        const setVideoFilterLevel = (pageX, $elm) => {
            let values = [...$('.settings-range .settings-bar span', $videoControls)];

            if ($elm) {
                const width = $elm.width();
                const position = width - (pageX - $elm.offset().left);
                const percent = Math.max(0, Math.min(100 - 100 * position / width | 0, 100));

                $elm.next().text(percent);
                $('span', $elm).css('width', `${percent}%`);
            }
            else {
                $('.settings-range .value', $videoControls).textContent = '50';
                $('.settings-range .settings-bar span', $videoControls).css('width', '50%');
            }
            values = values.map(({style: v}) => parseFloat(v.width || '50') / 50);

            applyVideoFilter.apply(this, values.reverse());

            if (values.filter(v => v !== 1).length) {
                $('.reset-all', $videoControls).removeClass('invisible');
            }
            else {
                $('.reset-all', $videoControls).addClass('invisible');
            }
        };

        // Seek by specified number of seconds.
        var seekBy = function(sec) {
            streamer.currentTime = Math.min(props.duration, Math.max(0, streamer.currentTime + sec));
        };

        if (is_embed !== 2 && self.contextMenu) {
            // Playback Speed context menu
            speedMenu = $('.context-menu.playback-speed', $wrapper).get(0);
            if (!speedMenu) {
                speedMenu = contextMenu.create({
                    template: $('#media-viewer-speed-menu', $wrapper)[0],
                    sibling: $('.speed-wrapper .tooltip', $wrapper)[0],
                    animationDuration: 150,
                    boundingElement: $wrapper[0]
                });
            }

            // Settings context menu
            settingsMenu = $('.context-menu.settings', $wrapper).get(0);
            if (!settingsMenu) {
                settingsMenu = contextMenu.create({
                    template: $('#media-viewer-video-settings-menu', $wrapper)[0],
                    sibling: $('.settings-wrapper .tooltip', $wrapper)[0],
                    animationDuration: 150,
                    boundingElement: $wrapper[0]
                });
            }
        }

        // Set Init Values
        changeButtonState('mute');
        $('.video-timing', $wrapper).text('00:00');
        $progressBar.removeAttr('style');
        $volumeBar.find('style').removeAttr('style');

        if ($('.loader-grad', $wrapper).hasClass('hidden')) {
            $playVideoButton.removeClass('hidden');
        }

        duration = options.playtime || !options.vad && MediaAttribute(node).data.playtime || 0;
        setDuration(duration);
        onTimeUpdate(0, 1);

        if (duration && options.startTime) {
            onTimeUpdate(options.startTime, duration);
        }
        setVideoFilterLevel();

        if (options.filter) {
            applyVideoFilter.apply(this, options.filter.map(v => v / 10));
        }

        // Subtitles manager
        if (self.fminitialized && !self.pfcol && !is_audio(node) && !is_mobile) {
            subtitlesManager = _createSubtitlesManager(node, $wrapper, $video, $videoControls, $playpause);
        }

        if (!subtitlesManager) {
            if (page === 'download' || self.pfcol) {
                $('button.subtitles', $videoControls).attr('disabled', 'disabled').addClass('mask-color-grey-out');
            }
            else {
                $('button.subtitles', $videoControls).parent().addClass('hidden');
            }
            subtitlesManager = false;
        }

        // deal with play() failed because the user didn't interact with the document first.
        streamer.on('cannot-play', SoonFc((ev, ex) => {
            if (!playevent && options.autoplay && !$pendingBlock.hasClass('hidden')) {
                $pendingBlock.addClass('hidden');
                $playVideoButton.removeClass('hidden');
            }
            dump(ex && ex.message);
        }));

        // Add event listeners for video specific events
        $video.rebind('play pause', function() {
            if (!videoElement.paused && subtitlesManager.isVisible) {
                videoElement.pause();
            }
            else {
                changeButtonState('playpause');
            }
        });

        $video.rebind('playing', function() {
            if (streamer.currentTime + 0.01) {
                changeButtonState('playpause');
                $pendingBlock.addClass('hidden');

                if (!playevent) {
                    playevent = true;
                    if (streamer.duration > duration) {
                        setDuration(streamer.duration);
                    }

                    streamer.on('duration', (ev, value) => {
                        if (duration < value) {
                            setDuration(value);
                            return true;
                        }
                    });

                    // play/pause on click
                    $video.rebind('click', function() {
                        if (!is_mobile) {
                            $playpause.trigger('click');
                        }
                    });

                    // jump to full screen on double-click
                    $video.rebind('dblclick', function() {
                        $fullscreen.trigger('click');
                    });

                    $playVideoButton.rebind('click', function() {
                        $playpause.trigger('click');
                    });

                    $watchAgainButton.rebind('click', () => {
                        $playpause.trigger('click');
                    });

                    const $vc = $('.vol-wrapper', $wrapper);

                    if (streamer.hasAudio) {
                        $vc.addClass('audio').removeAttr('title');
                    }
                    else {
                        var title = l[19061];

                        if (streamer.hasUnsupportedAudio) {
                            eventlog(99693, streamer.hasUnsupportedAudio);
                            title = escapeHTML(l[19060]).replace('%1', streamer.hasUnsupportedAudio);
                        }
                        $('i', $vc).removeClass().addClass(`${SPRITE} icon-volume-x-small-regular-outline`);
                        $('.vol-wrapper .tooltip', $wrapper).addClass('no-sound').text(title);
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
            onIdle(() => {
                delay.cancel(MOUSE_IDLE_TID);
            });
        });

        $video.rebind('ended.idle pause.idle', function() {
            setIdle(false);
            delay.cancel(MOUSE_IDLE_TID);
            $document.off('mousemove.idle');

            if (streamer.ended && !$wrapper.hasClass('vad')) {
                delete sessionStorage.previewTime;
                onIdle(() => progressBarElementStyle.setProperty('width', '100%'));
            }
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
            if (streamer.interrupted) {
                if (dlmanager.isOverQuota) {
                    $wrapper.trigger('is-over-quota');
                    dlmanager.showOverQuotaDialog();
                }
                else {
                    later(hideControls);

                    if (streamer.ended) {
                        streamer.currentTime = 0;
                        mBroadcaster.sendMessage('trk:event', 'media-journey', 'playback', 'watch-again');
                    }
                    else {
                        streamer.play();
                    }
                }
            }
            else {
                videoElement.pause();
                mBroadcaster.sendMessage('trk:event', 'media-journey', 'playback', 'pause-click');
            }
            return false;
        });

        // update Volume Bar control
        var updateVolumeBar = function(x) {
            var $this = $($volumeBar);

            if (x) {
                var position = $this.width() - (x - $this.offset().left);
                var percentage = 100 - (100 * position / $this.width());

                // Check within range
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
                $('span', $this).css('width', percentage + '%');
                streamer.volume = percentage / 100;
            }
            else if (videoElement.muted) {
                $('span', $this).css('width', '0%');
            }
            else {
                var currentVolume = streamer.volume * 100;
                $('span', $this).css('width', currentVolume + '%');
            }
        };

        // Volume Bar control
        var volumeDrag = false;
        /* Drag status */
        $volumeBar.rebind('mousedown.volumecontrol', (e) => {
            volumeDrag = true;
            updateVolumeBar(e.pageX);
        });

        $('.vol-wrapper', $wrapper).rebind('mousewheel.volumecontrol', (e) => {
            const delta = Math.max(-1, Math.min(1, e.deltaY || -e.detail));

            setVideoVolume(0.1 * delta);
        });

        updateVolumeBar();

        // Add the event listener of clicking mute/unmute buttons from the right click menu when play video/audio
        $video.rebind('volumechange', () => {
            changeButtonState('mute');
            updateVolumeBar();
        });

        // Bind Mute button
        $mute.rebind('click', function() {
            if ($(this).parent('.vol-wrapper').hasClass('audio')) {
                streamer.muted = -1; // swap state
                changeButtonState('mute');
                updateVolumeBar();
            }
            return false;
        });

        // Settings panel bar control
        let settingsPanelDrag = false;
        const $vcSResetAll = $('.reset-all', $videoControls);
        const $vcSettingsBar = $('.settings-bar', $videoControls);
        $vcSettingsBar.rebind('mousedown.settingspanelcontrol', function({pageX}) {
            const $this = $(this);
            settingsPanelDrag = $this;

            if (pageX > 0) {
                setVideoFilterLevel(pageX, $this);
            }
        });

        $vcSettingsBar.rebind('mousemove.settingspanelcontrol', function({pageX}) {
            if (pageX > 0) {
                const $this = $(this);
                const width = $this.width();
                const position = width - (pageX - $this.offset().left);
                const percentage = Math.max(0, Math.min(100 - 100 * position / width | 0, 100));

                $this.next().text(percentage).css('left', `${percentage / 100 * width - 4}px`);
            }
        });

        $vcSResetAll.rebind('click', () => setVideoFilterLevel());

        // Get page X based on event
        var getX = function(e) {
            if (e.type.includes("mouse")) {
                return e.pageX;
            }
            else if (e.type.includes("touch")) {
                return (e.changedTouches || e.touches)[0].pageX;
            }
        };

        $progress.rebind('mousedown.videoprogress touchstart.videoprogress', function(e) {
            timeDrag = true;

            if (streamer && streamer.currentTime) {
                videoElement.pause();
                onIdle(updatebar.bind(0, getX(e)));
            }

            if (is_mobile) {
                var $videoControl = $(this).parents('.video-controls');
                clearTimeout(hideMobileVideoControls);
                $videoControl.addClass('timeDrag');
            }
        });

        $document.rebind('mouseup.video-player touchend.videoprogress', function(e) {
            // video progress
            if (timeDrag) {
                timeDrag = false;

                if (streamer && streamer.currentTime) {
                    updatebar(getX(e));

                    if (!streamer.WILL_AUTOPLAY_ONSEEK) {
                        streamer.play();
                    }
                }
            }

            if (is_mobile) {
                var $videoControl = $(this).parents('.video-controls');
                $videoControl.removeClass('timeDrag');
                _initHideMobileVideoControls($wrapper);
            }

            $progressTimeBar.css('display', '');

            // volume control
            if (volumeDrag) {
                volumeDrag = false;
                updateVolumeBar(e.pageX);
            }

            // settings panel control
            if (settingsPanelDrag) {
                if (e.pageX > 0) {
                    setVideoFilterLevel(e.pageX, settingsPanelDrag);
                }
                settingsPanelDrag = false;
            }
        });

        $document.rebind('mousemove.video-player', (e) => {
            // video progress
            if (timeDrag && streamer && streamer.currentTime) {
                updatebar(getX(e));
            }

            // volume control
            if (volumeDrag) {
                updateVolumeBar(e.pageX);
            }

            // settings panel control
            if (settingsPanelDrag && e.pageX > 0) {
                setVideoFilterLevel(e.pageX, settingsPanelDrag);
            }
        });

        const _hoverAction = e => {

            const x = getX(e);

            $progressTimeBar.text(secondsToTimeShort(getTimeOffset(x).time, 1));
            $expectTimeBar.css('width', `${100 * (x - $progress.offset().left) / $progress.width()}%`);
        };

        $progress.rebind('mousemove.videoprogress',_hoverAction);
        $('.video-progress-block', $videoControls).rebind('mouseenter.videoprogress', _hoverAction);

        $progress.rebind('touchmove.videoprogress', function(e) {
            updatebar(getX(e));
            this.setAttribute('title', secondsToTimeShort(getTimeOffset(getX(e)).time, 1));
            return false;
        });

        // Set the video container's fullscreen state
        var setFullscreenData = function(state) {
            $videoContainer.attr('data-fullscreen', !!state);

            // Set the fullscreen button's 'data-state' which allows the correct button image to be set via CSS
            $fullscreen.attr('data-state', state ? 'cancel-fullscreen' : 'go-fullscreen');

            if (state) {
                $('i', $fullscreen).removeClass('icon-maximize-02-small-regular-outline')
                    .addClass('icon-minimize-02-small-regular-outline');
                $('.fs-wrapper .tooltip', $wrapper).text(l.video_player_exit_fullscreen);
            }
            else {
                $('i', $fullscreen).removeClass('icon-minimize-02-small-regular-outline')
                    .addClass('icon-maximize-02-small-regular-outline');
                $('.fs-wrapper .tooltip', $wrapper).text(l.video_player_fullscreen);
            }
        };

        var $element = page === 'download' ? $wrapper.find('.video-block') : $wrapper;
        var fullScreenManager = FullScreenManager($fullscreen, $element).change(setFullscreenData);

        // Bind Repeat button
        $repeat.rebind('click', () => {
            if ($repeat.mnh) {
                $repeat.mnh = null;
                $repeat.removeClass('mask-color-brand');
                $('.repeat-wrapper .tooltip', $wrapper).text(l.video_player_repeat);
            }
            else {
                $repeat.mnh = node.h;
                $repeat.addClass('mask-color-brand');
                $('.repeat-wrapper .tooltip', $wrapper).text(l.video_player_stop_repeat);
                eventlog(99940);
            }
        });

        // Speed icon
        $speed.rebind('click.media-viewer', function() {
            var $this = $(this);

            if ($this.hasClass('hidden')) {
                return false;
            }
            if ($this.hasClass('active')) {
                $this.removeClass('active deactivated');
                contextMenu.close(speedMenu);
            }
            else {
                $this.addClass('active deactivated').trigger('simpletipClose');
                // xxx: no, this is not a window.open() call..
                // eslint-disable-next-line local-rules/open
                contextMenu.open(speedMenu);
            }
            return false;
        });

        // Settings icon
        $settings.rebind('click.media-viewer', function() {
            var $this = $(this);

            if ($this.hasClass('hidden')) {
                return false;
            }
            if ($this.hasClass('active')) {
                $this.removeClass('active deactivated');
                contextMenu.close(settingsMenu);
            }
            else {
                $this.addClass('active deactivated').trigger('simpletipClose');
                // xxx: no, this is not a window.open() call..
                // eslint-disable-next-line local-rules/open
                contextMenu.open(settingsMenu);
            }
            return false;
        });

        // Close context menu
        $wrapper.rebind('mouseup.video-player', (ev) => {
            const $target = $(ev.target);

            if (!$target.closest('button.speed').length && $speed.hasClass('active')) {
                $speed.trigger('click.media-viewer');
            }

            if (subtitlesManager) {
                subtitlesManager.fire(ev);
            }
        });

        $wrapper.rebind('mousedown.video-player', (e) => {
            const $target = $(e.target);

            if (!$target.closest('button.settings').length && !$target.closest('.context-menu').length &&
                $settings.hasClass('active')) {
                $settings.trigger('click.media-viewer');
            }
        });

        // Bind Playback Speed context menu
        $('.context-menu.playback-speed button', $wrapper).rebind('click.media-viewer', function() {
            let rate = 1;
            let cl = '1x';
            let icon = '';
            const $this = $(this);

            $speed.removeClass('margin-2');

            if ($this.hasClass('05x')) {
                cl = '05x';
                rate = 0.5;
                icon = 'icon-size-36';
                $speed.addClass('margin-2');
            }
            else if ($this.hasClass('15x')) {
                cl = '15x';
                rate = 1.5;
                icon = 'icon-size-36';
                $speed.addClass('margin-2');
            }
            else if ($this.hasClass('2x')) {
                cl = '2x';
                rate = 2;
            }

            $('.context-menu.playback-speed button i', $wrapper).addClass('hidden');
            $(`.context-menu.playback-speed button.${cl} i`, $wrapper).removeClass('hidden');
            $('i', $speed)
                .removeClass()
                .addClass(`${SPRITE} icon-playback-${cl}-small-regular-outline ${icon}`);

            streamer.playbackRate = rate;
        });

        // Video playback keyboard event handler.
        var videoKeyboardHandler = function(ev) {

            if (window.disableVideoKeyboardHandler) {
                return false;
            }

            var bubble = false;
            var key = !ev.ctrlKey && ev.target.nodeName !== 'INPUT' && playevent && (ev.code || ev.key);

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
                    streamer.currentTime = props.duration - 0.2;
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
                    streamer.currentTime = props.duration * key.substr(5) / 10;
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

        if (options.vad) {
            $progress.off();
            window.removeEventListener('keydown', videoKeyboardHandler, true);
            onTimeUpdate = function(offset, length) {
                offset = offset > length ? length : offset;
                videoTimingElement.textContent = secondsToTimeShort(offset, 1);
                $('.video-time-bar', $wrapper).css('width',  `${100 * offset / length}%`);
            };
        }

        if (is_embed === 2) {
            $document.off('mousemove.idle');
            $videoControls.off('mousemove.idle');
            clearTimeout(hideMobileVideoControls);
            _initHideMobileVideoControls = hideControls = nop;
        }

        $wrapper.rebind('is-over-quota', function() {
            fullScreenManager.exitFullscreen();
            $pendingBlock.addClass('hidden');
            videoElement.pause();
            return false;
        });

        $wrapper.rebind('video-destroy', function() {
            if ($repeat.mnh) {
                $repeat.trigger('click');
            }
            $mute.off();
            $video.off();
            $progress.off();
            $playpause.off();
            $volumeBar.off();
            $repeat.off();
            $speed.off();
            $settings.off();
            $vcSettingsBar.off();
            $vcSResetAll.off();
            delay.cancel(MOUSE_IDLE_TID);
            if (videoElement) {
                videoElement.style.filter = 'none';
            }
            if (options.vad) {
                return false;
            }
            if (subtitlesManager) {
                subtitlesManager.destroy();
                subtitlesManager = false;
            }
            if (speedMenu) {
                contextMenu.close(speedMenu);
            }
            if (settingsMenu) {
                contextMenu.close(settingsMenu);
            }
            fullScreenManager.destroy(!!$.videoAutoFullScreen);
            window.removeEventListener('keydown', videoKeyboardHandler, true);
            $wrapper.removeClass('mouse-idle video-theatre-mode video').off('is-over-quota');
            $pendingBlock.addClass('hidden');
            $('.vol-wrapper', $wrapper).off();
            $document.off('mousemove.video-player');
            $document.off('mouseup.video-player');
            $wrapper.off('mouseup.video-player');
            $wrapper.off('mousedown.video-player');
            $document.off('mousemove.idle');
            $(window).off('video-destroy.main');
            videoElement = streamer = null;
            dlmanager.isStreaming = false;
            pagemetadata();
            return false;
        });

        dlmanager.isStreaming = true;
    };

    // @private get additional video instance..
    var _getVideoAdInstance = function(node, $wrapper, videoElement, options) {
        var pan, vad;
        var vAdInstance = Object.create(null);
        var opt = {autoplay: options.autoplay};
        var $control = $('.viewer-vad-control', $wrapper).removeClass('skip');
        var $pendingBlock = $('.loader-grad', $wrapper);

        const pra = JSON.parse(localStorage.pra || '{}');

        var nop = function(ev) {
            ev.preventDefault();
            ev.stopPropagation();
        };
        var dsp = function(ev) {
            localStorage.pra = JSON.stringify(pra);

            nop(ev);
            if (vAdInstance) {
                vAdInstance.skip();
            }
            return false;
        };

        vAdInstance.skip = function() {
            this.kill();

            if (this.parent) {
                videoElement.classList.remove('hidden');
                videoElement.pause();

                _initVideoControls($wrapper, this.parent, node, options);

                var error = this.parent.error;
                if (error) {
                    onIdle(function() {
                        msgDialog('warninga', l[135], l[47], error);
                    });
                    this.abort();
                }
                else if (opt.autoplay) {
                    options.autoplay = true;
                    this.parent.play();
                }
                else {
                    this.start = this.parent.play.bind(this.parent);
                }
                this.parent = null;
            }
        };

        vAdInstance.kill = function() {
            if (pan) {
                $wrapper.removeClass('vad');
                $control.addClass('hidden');
                pan.removeChild(vad);
                pan = null;
            }

            if (vAdInstance) {
                if (vAdInstance.stream) {
                    $wrapper.trigger('video-destroy');
                    vAdInstance.stream.destroy();
                    vAdInstance.stream = null;
                }
                vAdInstance = null;
            }
        };

        vAdInstance.start = function() {
            let rc = 0;
            if (this.stream) {
                rc = 1;
                this.stream.play();
            }
            opt.autoplay = true;
            return rc;
        };

        const { dlid, pfid, pfcol } = window;
        const vadAllowed = !!(dlid || is_embed || (pfid && !pfcol));
        if (!vadAllowed || options.vad === false || is_audio(node)) {
            pan = null;
            vAdInstance.disabled = true;
            return vAdInstance;
        }
        videoElement.addEventListener('click', nop, true);
        videoElement.addEventListener('contextmenu', nop, true);

        var rs = {};
        var ts = 15807e5;
        var now = Date.now() / 1e3;
        var ids = Object.keys(pra);
        for (var i = ids.length; i--;) {
            var t = pra[ids[i]] + ts;

            if (now > t + 3600) {
                delete pra[ids[i]];
            }
            else {
                rs[ids[i]] = t;
            }
        }

        var req = {a: 'pra', rs: rs, d: d ? 1e3 : undefined};
        if (node.ph) {
            req.ph = node.ph;
        }
        else if (node.h) {
            req.h = node.h;
        }
        api.req(req).always(({result: res}) => {
            if (d) {
                console.debug('pra', res, [vAdInstance]);
            }
            videoElement.removeEventListener('click', nop, true);
            videoElement.removeEventListener('contextmenu', nop, true);

            if (!vAdInstance || !res || res < 0 || typeof res !== 'object') {
                return vAdInstance && vAdInstance.skip();
            }
            pra[res.id] = now - ts | 0;

            pan = videoElement.parentNode;
            vad = videoElement.cloneNode();

            vad.id = '';
            vad.style.zIndex = 9;
            $wrapper.addClass('vad');
            videoElement.before(vad);
            videoElement.classList.add('hidden');
            vad.addEventListener('ended', dsp);
            vad.addEventListener('click', nop, true);
            vad.addEventListener('contextmenu', nop, true);

            vAdInstance.stream = Streamer(res.l, vad, opt);
            vAdInstance.stream.on('playing', function() {
                var count = parseInt(res.cds) | 0;
                if (count < 1) {
                    count = Math.min(this.duration | 0, 5);
                }

                $control
                    .removeClass('hidden')
                    .text(l.ad_skip_count.replace('%1', count));

                var timer = setInterval(() => {
                    if (!this.file || !this.file.playing) {
                        return;
                    }

                    count--;

                    if (count < 1) {
                        $control.text(l[1379]);

                        const icon = document.createElement('i');
                        icon.classList.add(
                            (is_embed) ? 'sprite-embed-mono' :  'sprite-fm-mono',
                            'icon-skip-forward-small-regular-outline'
                        );

                        $control.append(icon);
                        clearInterval(timer);

                        $control.addClass('skip');
                        $control.rebind('click.ctl', function(ev) {
                            eventlog(99731);
                            return dsp(ev);
                        });
                    }
                    else {
                        $control.text(l.ad_skip_count.replace('%1', count));
                    }
                }, 1000);

                if (res.aurl) {
                    const onclick = (e, eventId) => {
                        nop(e);
                        open(res.aurl);
                        vad.pause();
                        eventlog(eventId);
                        delay('prevent-control-hiding', () => clearTimeout(hideMobileVideoControls));
                    };
                    vad.style.cursor = 'pointer';
                    vad.removeEventListener('click', nop, true);
                    vad.addEventListener('click', (e) => {
                        onclick(e, 99732);
                    }, true);

                    if (!is_mobile && !is_embed && res.text && res.title && res.icon) {
                        const info = $('.viewer-vad-info', $wrapper);

                        if (info.length) {
                            info.removeClass('hidden');

                            $('.vad-info-title i', info).attr('class', res.icon);
                            $('.vad-info-title p', info).text(res.title);

                            const txt = $('.vad-info-txt', info);
                            txt.text(res.text);
                            txt.attr('title', res.text);

                            $('button', info).rebind('click.vad-more', (e) => {
                                onclick(e, 500693);
                            });
                        }
                    }
                }

                $pendingBlock.addClass('hidden');

                eventlog(99730);
            });

            vAdInstance.stream.on('stalled', () => {
                if (vAdInstance.stream.isOverQuota) {
                    dlmanager.showOverQuotaDialog();
                }
            });

            if (opt.autoplay) {
                vAdInstance.start();
            }

            vAdInstance.stream.abort = vAdInstance.abort;
            _initVideoControls($wrapper, vAdInstance.stream, node, {...opt, vad: true});
        });

        if (options.autoplay) {
            $('.loader-grad', $wrapper).removeClass('hidden');
        }
        options.autoplay = false;

        return vAdInstance;
    };

    // @private obtain streamer instance with as needed expanded methods at runtime.
    var _getStreamerInstance = function(node, $wrapper, videoElement, options) {
        var vAdInstance = _getVideoAdInstance.apply(this, arguments);
        var vStream = Streamer(node.link || node.h, videoElement, options);

        console.assert(!vStream.kill);
        console.assert(!vStream.start);

        vStream.kill = function() {
            if (vAdInstance) {
                vAdInstance.kill();
                vAdInstance = null;
            }

            if (vStream) {
                var abort = vStream.abort;
                vStream.abort = null;

                if (typeof abort === 'function') {
                    abort.call(vStream);
                }

                if (vStream) {
                    vStream.destroy();
                }
                vStream = null;
            }
        };

        vStream.start = function() {
            let rc = 0;
            if (vAdInstance) {
                rc = vAdInstance.start();
            }
            if (!rc && vStream && (is_audio(node) || options.autoplay)) {
                rc = 2;
                vStream.play();
            }
            return rc;
        };

        vAdInstance.parent = vStream;
        vAdInstance.abort = vStream.kill;

        if (d) {
            window.vStream = vStream;
            window.vAdInstance = vAdInstance;
        }

        if (vAdInstance.disabled) {
            vAdInstance.skip();
            vAdInstance = null;
        }

        return vStream;
    };

    // @private Launch video streaming
    var _initVideoStream = function(node, $wrapper, destroy, options) {
        var onOverQuotaCT;
        var videoElement = $('video', $wrapper).get(0);

        if (typeof destroy === 'object') {
            options = destroy;
            destroy = null;
        }
        options = Object.assign(Object.create(null), {autoplay: true}, options);

        // Hide the default controls
        videoElement.controls = false;

        // If a preview time is set, use it as the starting time.
        if (sessionStorage.previewTime) {
            if (node.h && sessionStorage.previewNode === node.h) {
                options.startTime = sessionStorage.previewTime;
            }
            sessionStorage.removeItem('previewTime');
        }

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
                else if (k === 'a') {
                    options.autoplay = options.preBuffer = v | 0;
                }
                else if (k === 'm') {
                    options.muted = videoElement.muted = v | 0;
                }
                else if (k === 'v' || k === 'c') {
                    console.assert(window.is_embed === 2);
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

        options.filesize = node.s;
        options.playtime = MediaAttribute(node).data.playtime;
        options.bitrate = options.filesize / options.playtime;

        if (d && options.bitrate && typeof bytesToSize === 'function') {
            console.info('%s, %s', node.name, bytesToSize(node.s),
                         secondsToTime(options.playtime), bytesToSpeed(options.bitrate));
        }

        var s = _getStreamerInstance(node, $wrapper, videoElement, options);

        destroy = destroy || function() {
            s.kill();
            $wrapper.trigger('video-destroy');
        };
        s.abort = destroy;

        if (!u_type) {
            mBroadcaster.once('login', function() {
                if (s.isOverQuota) {
                    s.file.flushRetryQueue();
                }
            });
        }

        s.on('inactivity', function(ev) {
            // Event invoked when the video becomes stalled, we'll show the loading/buffering spinner
            if (d) {
                console.debug(ev.type, ev);
            }

            if (navigator.onLine === false) {
                showToast('warning', l.no_internet, 4e3);
            }
            const $pinner = $('.loader-grad', $wrapper).removeClass('hidden');

            if (this.isOverQuota) {
                var self = this;
                var file = this.file;
                var video = this.video;

                $wrapper.trigger('is-over-quota');
                dlmanager.showOverQuotaDialog(function() {
                    dlmanager.onNolongerOverquota();
                    file.flushRetryQueue();

                    if (video.paused) {
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

            var $pinner = $('.loader-grad', $wrapper);
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
                    case api_strerror(EBLOCKED):
                        if (!window.is_iframed) {
                            emsg = l[246];
                        }
                    /* fallthrough */
                    case api_strerror(ENOENT):
                    case api_strerror(EACCESS):
                        emsg = emsg || l[23];
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
            mBroadcaster.sendMessage('trk:event', 'videostream', 'error');
        });

        s.on('playing', function() {
            var events = {
                'WebM': 99681, 'MPEG Audio': 99684, 'M4A ': 99687, 'Wave': 99688, 'Ogg': 99689,
                'FLAC': 99712, 'Matroska': 99722, 'qt  ': 99725
            };
            var eid = events[s.options.type] || 99668;

            if (eid === 99684 && node.s > 41943040) {
                eid = 99685;
            }
            else if (eid === 99712 && node.s > 134217728) {
                eid = 99713;
            }

            console.assert(eid !== 99668 || is_video(node) !== 2, 'This is not a video...');
            eventlog(eid);

            if (/av0?1\b/i.test(s.hasVideo)) {
                eventlog(99721, JSON.stringify([1, s.hasVideo, s.hasAudio, s.options.type]));
            }
            if (/^h(?:ev|vc)1\b/i.test(s.hasVideo)) {
                var audio = s.hasAudio || '~' + s.hasUnsupportedAudio;
                eventlog(99738, JSON.stringify([1, s.hasVideo, audio, s.options.type]));
            }
            if (s.hasAudio && /\b[ae]+c-?3\b/i.test(s.hasAudio)) {
                eventlog(99820, JSON.stringify([1, s.hasVideo, s.hasAudio, s.options.type]));
            }
            if (is_embed) {
                // Watch correlation with 99686
                eventlog(99824, true);
            }
            mBroadcaster.sendMessage('trk:event', 'videostream', 'playing', s);

            if (!is_audio(node)) {
                $(videoElement).css('background-image', ``);
            }
        });

        if (typeof dataURLToAB === 'function') {
            _makethumb(node, s);
        }

        $(window).rebind('video-destroy.main', function() {
            $('.mobile.filetype-img').removeClass('hidden');
            s.kill();
        });

        return s;
    };

    /**
     * Toggle hiding and showing the mobile video controls
     * @param $wrapper
     * @private
     */
    mega.initMobileVideoControlsToggle = function($wrapper) {
        const $video = $('.video-block, .embedplayer .video-wrapper', $wrapper);
        var $videoControl = $('.video-controls', $wrapper);
        var $adControl = $('.viewer-vad-control', $wrapper);
        var videoElement = $('video', $video).get(0);

        _initHideMobileVideoControls($wrapper);

        $video.rebind('touchstart', ev => {
            if (videoElement && videoElement.ended) {
                $('.play-video-button', $wrapper).trigger('click');
                return false;
            }
            if ($(ev.target).is('.mobile-gallery, #video, #mobile-video')) {
                if ($videoControl.hasClass('invisible')) {
                    $adControl.removeClass('bottom');
                    $videoControl.removeClass('invisible');
                    _initHideMobileVideoControls($wrapper);
                }
                else {
                    $videoControl.addClass('invisible');
                    $adControl.addClass('bottom');
                }
            }
            else {
                var $videoControls = $(ev.target).closest('.video-controls');
                if ($videoControls.length && !$videoControls.hasClass('timeDrag')) {
                    _initHideMobileVideoControls($wrapper);
                }
            }
        });
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
                var $video = $('video', $wrapper);
                var c = MediaAttribute.getCodecStrings(node);
                if (c) {
                    $fn.attr('title', node.name + ' (' + c + ')');
                    getImage(node, 1).then(uri => {
                        const a = !is_audio(node) && MediaAttribute(node).data || false;
                        $video.css('background-size', a.width > a.height ? 'cover' : 'contain');
                        $video.css('background-image', `url(${uri})`);
                    }).catch(dump);
                }

                var $videoControls = $('.video-controls', $wrapper);
                var $playVideoButton = $('.play-video-button', $wrapper);

                if (!$video.length) {
                    return reject(new Error('No video element found...'));
                }

                if (!yup) {
                    if (String(node.fa).indexOf(':8*') > 0 && isMediaSourceSupported()) {
                        eventlog(99714, JSON.stringify([1, node.ph || node.h].concat(c)));
                    }
                    return resolve(false);
                }

                // Disable default video controls
                $video.get(0).controls = false;

                options = Object.assign({autoplay: false, preBuffer: true}, options);

                var vsp = options.preBuffer && initVideoStream(node, $wrapper, options);

                $playVideoButton.rebind('click', function() {
                    if (dlmanager.isOverQuota) {
                        $wrapper.trigger('is-over-quota');
                        return dlmanager.showOverQuotaDialog();
                    }

                    if (typeof mediaCollectFn === 'function') {
                        onIdle(mediaCollectFn);
                        mediaCollectFn = null;
                    }

                    // Show Loader until video is playing
                    $('.loader-grad', $wrapper).removeClass('hidden');
                    $(this).addClass('hidden');

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
                        stream.start();
                    }).fail(console.warn.bind(console));

                    if (is_embed === 2) {
                        $('.audio-wrapper .playpause-wrapper').removeClass('hidden');
                    }
                    $wrapper.addClass('video-theatre-mode');
                    $videoControls.removeClass('hidden');

                    if (is_mobile) {
                        requestAnimationFrame(() => mega.initMobileVideoControlsToggle($wrapper));
                    }
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
    Object.defineProperty(MediaInfoReport.prototype, 'addMediaData', {
        value: function(file, timeout = 9) {
            return Promise.race([tSleep(timeout), MediaAttribute.getMediaData(file)])
                .then((res) => {
                    if (res) {
                        const {duration, width, height, fps} = res;

                        if (!this.fps && fps > 0) {
                            Object.defineProperty(this, 'fps', {value: fps});
                        }
                        if (!this.width && width > 0) {
                            Object.defineProperty(this, 'width', {value: width});
                        }
                        if (!this.height && height > 0) {
                            Object.defineProperty(this, 'height', {value: height});
                        }
                        if (!this.playtime && duration > 0) {
                            Object.defineProperty(this, 'playtime', {value: duration});
                        }
                    }
                    return res;
                });
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

        const cls = tryCatch(() => {
            // This is 84KB, let's expunge it until the user comes back to an embed player.
            delete localStorage['<mc>'];
        });

        mediaCodecs = new Promise(function(resolve, reject) {
            var db;
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

                    data.version = res[0] | 0;
                    mediaCodecs = deepFreeze(data);

                    if (data.version < 3) {
                        console.error('Got unexpected mc-list version.', data.version, res);
                    }
                    resolve(mediaCodecs);

                    if (db) {
                        queueMicrotask(cls);
                        return db.kv.put({k: 'l', t: Date.now(), v: data});
                    }

                    tryCatch(() => {
                        if (data.version > 2) {
                            localStorage['<mc>'] = JSON.stringify([Date.now(), data]);
                        }
                    })();
                };
                return api.req({a: 'mc'}).then(({result}) => prc(result));
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

            if (typeof Dexie === 'undefined') {

                const data = tryCatch(() => {
                    if (localStorage['<mc>']) {
                        const [ts, data] = JSON.parse(localStorage['<mc>']);

                        if (Date.now() < ts + 864e6) {

                            return deepFreeze(data);
                        }
                    }
                })();

                if (data) {
                    queueMicrotask(() => resolve(mediaCodecs = data));
                }
                else {
                    queueMicrotask(cls);
                    apiReq().catch(reject);
                }
            }
            else {
                const timer = setTimeout(() => apiReq().catch(reject), 1400);

                db = new Dexie('$mcv1');
                db.version(1).stores({kv: '&k'});

                db.kv.get('l')
                    .then((r) => {
                        if (!r) {
                            throw ENOENT;
                        }
                        mediaCodecs = deepFreeze(r.v);

                        if (Date.now() < r.t + 864e6) {
                            clearTimeout(timer);
                            resolve(mediaCodecs);
                        }
                    })
                    .catch((ex) => {
                        dump(db.name, ex);
                        clearTimeout(timer);
                        if (ex !== ENOENT) {
                            db = null;
                        }
                        return apiReq();
                    })
                    .catch(reject);
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
                var size = M.getNodeShare(entry).down ? -1 : entry.s || entry.size || 0;

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
                var xhr = new XMLHttpRequest();
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

                        Promise.resolve(res.playtime)
                            .then((time) => {
                                if (!time && file instanceof Blob) {
                                    return res.addMediaData(file);
                                }
                            })
                            .catch(dump)
                            .finally(() => resolve(res));
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
                .then((data) => {
                    const {buffer} = data;
                    if (typeof entry.file === 'string') {
                        data = data.payload;
                        data.size = data.s;
                        entry.file = data;
                    }
                    resolve(buffer);
                })
                .catch(reject);
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
    const miCollectProcess = function(force, nodes) {
        // @todo improve depending whether 'nodes' is provided..
        if (!force && miCollectedBytes > 0x4000000 || M.chat) {
            return;
        }

        if (miCollectRunning) {
            if (d) {
                console.debug('MediaInfo collect already running...');
            }
            return;
        }

        if (M.currentrootid === M.RubbishID) {
            delay.cancel('mediainfo:collect');
            return;
        }

        delay('mediainfo:collect', () => {
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
            nodes = nodes || M.v;

            const opt = {
                maxAtOnce: force && nodes.length || 32
            };
            MediaInfoLib.collect(nodes, opt)
                .then((res) => {
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
        }, force || 4e3);
    };

    const dayOfMonth = new Date().getDate();

    if (!localStorage.noMediaCollect) {
        const shouldRun = () => {
            const n = M.getNodeByHandle(M.currentCustomView.nodeID || M.currentdirid);

            return n && mega.fileRequest.publicFolderExists(n.h);
        };
        const collector = tryCatch((...args) => {
            const force = args[0] > 0;

            if (force || dayOfMonth > 27 || shouldRun()) {

                miCollectProcess.apply(self, force && args || []);
            }
        });
        mBroadcaster.addListener('mega:openfolder', collector);
        mBroadcaster.addListener('mediainfo:collect', collector);
    }

})(self);

(function _MediaAttribute(global) {
    'use strict';

    const mp4brands = new Set([
        'mp41', 'mp42', 'mp4v',
        'isom', 'iso2', 'iso4', 'iso5',
        '3gp4', '3gp5', '3gp6', '3gp7', '3gp8',
        'avc1', 'f4v ', 'nvr1', 'FACE', 'M4V ', 'M4VH', 'M4VP', 'XAVC', 'MSNV'
    ]);

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

        const format = isMediaSourceSupported() ? mp4brands.has(container) ? '--mp4-brand--$' : container : 0;
        switch (format) {
            case '--mp4-brand--$':
            case 'qt  ' + (mega.chrome || audiocodec ? '$' : ''):
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
                else if (videocodec === 'av01') {
                    return MediaSource.isTypeSupported('video/mp4; codecs="av01.2.23M.12"') ? 1 : 0;
                }
                else if (videocodec === 'vp09') {
                    return MediaSource.isTypeSupported('video/mp4; codecs="vp09.03.62.12"') ? 1 : 0;
                }
                else if (videocodec === 'hev1' || videocodec === 'hvc1') {
                    return MediaSource.isTypeSupported('video/mp4; codecs="' + videocodec + '.1.6.L93.90"') ? 1 : 0;
                }
                return canPlayMSEAudio();

            case 'Matroska':
                if (audiocodec && audiocodec !== 'A_OPUS') {
                    return 0;
                }
                /* falls through */
            case 'WebM':
                switch (isMediaSourceSupported.webm && videocodec) {
                    case 'V_AV1':
                        return MediaSource.isTypeSupported('video/webm; codecs="av01.2.23M.12"') ? 1 : 0;
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
            if (!mfa || !isMediaSourceSupported()) {
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

    /**
     * Retrieve HTMLMediaElement meta data.
     * @param {File|Blob} entry File entry or Blob.
     * @returns {Promise<*>} metadata
     */
    MediaAttribute.getMediaData = function(entry) {
        return new Promise((resolve) => {
            const elm = document.createElement('video');
            elm.preload = 'metadata';
            elm.currentTime = 0x80000;
            elm.ondurationchange = function() {
                if (elm.duration !== Infinity) {
                    const res = {
                        width: elm.videoWidth,
                        height: elm.videoHeight,
                        duration: elm.duration,
                        video: elm.videoTracks,
                        audio: elm.audioTracks
                    };

                    elm.ondurationchange = null;
                    tSleep.race(6, MediaAttribute.estimateVideoFrameRate(elm))
                        .then((data) => {
                            if (data && data !== ETEMPUNAVAIL) {
                                const p = 'fps,width,height'.split(',');
                                for (let i = p.length; i--;) {
                                    const k = p[i];
                                    if (!res[k] && data[k] !== undefined) {
                                        res[k] = data[k] | 0;
                                    }
                                }
                            }
                        })
                        .catch(dump)
                        .finally(() => {
                            resolve(freeze(res));
                            URL.revokeObjectURL(elm.src);
                            elm.src = '';
                        });
                }
            };
            elm.src = URL.createObjectURL(entry);
        });
    };

    /**
     * Estimate video frame rate.
     * @param {Blob|HTMLVideoElement} video File entry, blob, or video element
     * @param {Number} [runTime] number of seconds to run the estimator.
     * @returns {Promise<{fps, width, height}>} fps, plus width/height
     */
    MediaAttribute.estimateVideoFrameRate = function(video, runTime = 4) {
        return new Promise((resolve) => {
            let revoke;
            let time = 0;
            let ticks = 0;
            let frames = 0;
            const data = {fps: 0};
            const finish = (res) => {
                if (revoke) {
                    URL.revokeObjectURL(revoke);
                    video.src = '';
                }
                if (data.fps > 0) {
                    data.fps = Math.round(1.0 / (data.fps / ticks));
                    res = data;
                }
                resolve(res || false);
            };

            if (video instanceof Blob) {
                const elm = document.createElement('video');
                revoke = elm.src = URL.createObjectURL(video);
                video = elm;
            }

            if (typeof video.requestVideoFrameCallback !== 'function' || video.playbackRate !== 1) {
                return finish();
            }

            video.requestVideoFrameCallback(function stub(now, {mediaTime, presentedFrames, width, height}) {
                time = Math.abs(mediaTime - time);
                frames = Math.abs(presentedFrames - frames);

                const avg = time / frames;
                if (avg && avg < 1) {
                    ticks++;
                    data.fps += avg;
                }

                if ((time = mediaTime) > runTime) {
                    data.width = width;
                    data.height = height;
                    finish();
                }
                else {
                    frames = presentedFrames;
                    video.requestVideoFrameCallback(stub);
                }
            });

            video.muted = true;
            video.currentTime = 0;
            video.addEventListener('error', finish);
            video.addEventListener('ended', finish);
            Promise.resolve(video.play()).catch(dump);
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

            var success = function({result: fa}) {
                MEGAException.assert(typeof fa === 'string' && /:\d+\*/.test(fa));
                var n = M.d[req.n];

                if (n) {
                    // n.fa = fa;
                    // M.nodeUpdated(n);

                    if (res.playtime && M.viewmode && n.p === M.currentdirid) {
                        $('span.duration', `#${n.h}`).text(secondsToTimeShort(res.playtime));
                    }
                }
                self.fa = fa;

                resolve(self);
            };

            const promise = api.screq(req).then(success).catch(reject);

            if (Object(res.General).InternetMediaType === 'video/mp4') {
                const known = new Set(['qt  ', 'M4A ', ...mp4brands]);

                if (!known.has(res.container)) {
                    eventlog(99729, JSON.stringify([3, res.containerid, res.container, res.vcodec, res.height]));
                }
            }

            promise.finally(() => {
                if (res.vcodec || req.ph) {
                    if (d) {
                        console.debug('Not adding cover-art...', res, [req]);
                    }
                    return;
                }
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
            });
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

                if (this.u && this.u !== u_handle) {
                    if (d) {
                        console.debug('Ignoring media attribute state for non-own node...', this);
                    }
                    return false;
                }

                return a.fps < MediaInfoLib.build || a.width < MediaInfoLib.version || a.playtime < this.avflv;
            }

            return true;
        }
    });

    if (sessionStorage.vsPlayAnything) {
        MediaAttribute.getMediaType = () => 1;
        MediaAttribute.isTypeSupported = () => 1;
        MediaAttribute.canPlayMedia = async() => 1;
    }

    /**
     * @name MediaAttribute
     * @global
     */
    Object.defineProperty(global, 'MediaAttribute', {value: Object.freeze(MediaAttribute)});

})(self);

mBroadcaster.once('startMega', function isAudioContextSupported() {
    'use strict';

    if (isMediaSourceSupported()) {
        queueMicrotask(tryCatch(() => {
            if (!localStorage.vsWebM) {
                if (mega.chrome) {
                    Object.defineProperty(isMediaSourceSupported, 'webm', {value: 2});
                }
                return;
            }
            const ms = new MediaSource();
            const uri = URL.createObjectURL(ms);
            const video = document.getElementById('video');
            const onOpen = tryCatch(() => {
                ms.removeEventListener('sourceopen', onOpen);
                URL.revokeObjectURL(uri);

                const sb = ms.addSourceBuffer('video/webm; codecs="vp8, vorbis"');

                if (sb.timestampOffset === 0) {
                    sb.timestampOffset = true;

                    if (sb.timestampOffset === 1) {
                        /** @property isMediaSourceSupported.webm */
                        Object.defineProperty(isMediaSourceSupported, 'webm', {value: true});

                        if (d) {
                            console.debug('[MSE] WebM support enabled.');
                        }
                    }
                }

            }, false);

            ms.addEventListener('sourceopen', onOpen);
            video.src = uri;
        }, false));
    }

    /** @property mega.fullAudioContextSupport */
    lazy(mega, 'fullAudioContextSupport', () => {
        return tryCatch(() => {
            const ctx = new AudioContext();
            onIdle(() => ctx && typeof ctx.close === 'function' && ctx.close());

            let stream = new MediaStream();
            console.assert('active' in stream);
            stream = ctx.createMediaStreamDestination();
            if (stream.stream.getTracks()[0].readyState !== 'live' || stream.numberOfInputs !== 1) {
                throw new Error('audio track is not live');
            }
            return true;
        }, (ex) => {
            console.debug('This browser does not support advanced audio streaming...', ex);
        })();
    });
});
