/* jshint -W003 */// 'noThumbURI' was used before it was defined.

function createnodethumbnail(node, aes, id, imagedata, opt, ph, file) {
    'use strict';
    storedattr[id] = Object.assign(Object.create(null), {'$ph': ph, target: node});
    createthumbnail(file || false, aes, id, imagedata, node, opt).catch(nop);

    var uled = ulmanager.getEventDataByHandle(node);
    if (uled && !uled.thumb) {
        // XXX: prevent this from being reached twice, e.g. an mp4 renamed as avi and containing covert art ...
        uled.thumb = 1;

        if (d) {
            console.log('Increasing the number of expected file attributes for the chat to be aware.', uled);
        }
        uled.efa += 2;
    }
}

function createthumbnail(file, aes, id, imagedata, node, opt) {
    'use strict';

    var isVideo;
    var isRawImage;
    var thumbHandler;
    var onPreviewRetry;

    if (window.omitthumb) {
        console.warn('Omitting thumb creation on purpose...', arguments);
        return;
    }

    if (typeof opt === 'object') {
        isRawImage = opt.raw;
        isVideo = opt.isVideo;
        onPreviewRetry = opt.onPreviewRetry;

        if (typeof isRawImage === 'function') {
            thumbHandler = isRawImage;
            isRawImage = false;
        }
        else if (typeof isRawImage !== 'string') {
            if (d) {
                console.debug('Not really a raw..', isRawImage);
            }
            isRawImage = false;
        }

        if (d && isRawImage) {
            console.log('Processing RAW Image: ' + isRawImage);
        }
        if (d && thumbHandler) {
            console.log('ThumbHandler: ' + thumbHandler.name);
        }
    }
    else {
        onPreviewRetry = !!opt;
    }

    const tag = `createthumbnail(${file && file.name || Math.random().toString(26).slice(-6)}).${id}`;
    const debug = (m, ...a) => console.warn(`[${tag}] ${m}`, ...a);

    const n = M.getNodeByHandle(node);
    const fa = String(n && n.fa);
    const ph = Object(storedattr[id]).$ph;
    const createThumbnail = !fa.includes(':0*');
    const createPreview = !fa.includes(':1*') || onPreviewRetry;
    const canStoreAttr = !n || !n.u || n.u === u_handle && n.f !== u_handle;

    if (!createThumbnail && !createPreview) {
        debug('Neither thumbnail nor preview needs to be created.', n);
        return Promise.resolve(EEXIST);
    }

    if (d) {
        console.time(tag);
    }

    var sendToPreview = function(h, ab) {
        var n = h && M.getNodeByHandle(h);

        if (n && fileext(n.name, 0, 1) !== 'pdf' && !is_video(n)) {
            previewimg(h, ab || dataURLToAB(noThumbURI));
        }
    };

    const getSourceImage = async(source) => {
        const buffer = await webgl.readAsArrayBuffer(source);

        if (thumbHandler) {
            const res = await thumbHandler(buffer);
            source = res.buffer || res;
        }
        else if (isRawImage) {
            if (typeof dcraw === 'undefined') {
                await Promise.resolve(M.require('dcrawjs')).catch(dump);
            }
            const {data, orientation} = webgl.decodeRAWImage(isRawImage, buffer);
            if (data) {
                source = data;
                source.orientation = orientation;
            }
        }
        return source;
    };

    const store = ({thumbnail, preview}) => {
        if (canStoreAttr) {
            // FIXME hack into cipher and extract key
            const key = aes._key[0].slice(0, 4);

            if (thumbnail) {
                api_storefileattr(id, 0, key, thumbnail, n.h, ph);
            }

            // only store preview when the user is the file owner, and when it's not a
            // retry (because then there is already a preview image, it's just unavailable)
            if (preview && !onPreviewRetry) {
                api_storefileattr(id, 1, key, preview, n.h, ph);
            }
        }

        if (node) {
            delete th_requested[node];
        }
        sendToPreview(node, preview);

        return {thumbnail, preview};
    };

    return (async() => {
        const exifFromImage = !!exifImageRotation.fromImage;

        if (isVideo && file) {
            await Promise.resolve(M.require('videostream'));
            imagedata = await Streamer.getThumbnail(file);
        }
        else if (isRawImage && !exifFromImage) {
            // We don't need to rotate images ourselves, so we will decode it into a worker.
            if (d) {
                debug('Leaving %s image decoding to worker...', isRawImage);
            }
            isRawImage = false;
        }

        let source = imagedata || file;

        if (thumbHandler || isRawImage) {
            source = await getSourceImage(source);
        }

        if (!(source instanceof ImageData) && !exifFromImage) {
            source = await webgl.getRotatedImageData(source);
        }

        const res = store(await webgl.worker('scissor', {source, createPreview, createThumbnail}));

        if (d) {
            console.timeEnd(tag);
        }
        return res;
    })().catch(ex => {
        if (d) {
            console.timeEnd(tag);
            debug('Failed to create thumbnail', ex);
        }

        sendToPreview(node);
        mBroadcaster.sendMessage('fa:error', id, ex, false, 2);

        if (!window.pfid && canStoreAttr) {
            eventlog(99665, fileext(M.getNodeByHandle(node).name));
        }
        throw new MEGAException(ex, imagedata || file);
    });
}

mBroadcaster.once('startMega', function() {
    'use strict';
    exifImageRotation.fromImage = getComputedStyle(document.documentElement).imageOrientation === 'from-image';

    if (exifImageRotation.fromImage) {
        if (d) {
            console.info('This browser automatically rotates images based on the EXIF metadata.', [ua]);
        }

        if (window.safari || ua.details.engine === 'Gecko') {
            exifImageRotation.fromImage = -1;
        }
    }
});

/**
 * Rotate images as per the extracted EXIF orientation
 * @param {ArrayBuffer} source The image file data
 * @param {Number} orientation The EXIF rotation value
 */
async function exifImageRotation(source, orientation) {
    'use strict';

    orientation |= 0;
    if (orientation < 2 || exifImageRotation.fromImage < 0) {
        // No rotation needed.
        return source;
    }

    return new Promise((resolve, reject) => {
        var img = new Image();
        var canvas = document.createElement('canvas');
        const cleanup = () => {
            if (exifImageRotation.fromImage) {
                document.body.removeChild(img);
                document.body.removeChild(canvas);
            }
            URL.revokeObjectURL(img.src);
        };
        var signalError = function() {
            reject();
            cleanup();
        };

        if (exifImageRotation.fromImage) {
            img.style.imageOrientation = 'none';
            canvas.style.imageOrientation = 'none';
            document.body.appendChild(img);
            document.body.appendChild(canvas);
        }

        img.onload = tryCatch(function() {
            var width = this.naturalWidth;
            var height = this.naturalHeight;

            if (!width || !height) {
                if (d) {
                    console.error('exifImageRotation found invalid width/height values...', width, height);
                }

                return signalError();
            }

            if (d) {
                console.debug('exifImageRotation: %d x %d', width, height);
            }
            var ctx = canvas.getContext('2d');

            ctx.save();
            switch (orientation) {
                case 5:
                case 6:
                case 7:
                case 8:
                    canvas.width = height;
                    canvas.height = width;
                    break;
                default:
                    canvas.width = width;
                    canvas.height = height;
            }

            switch (orientation) {
                case 2:
                    // horizontal flip
                    ctx.translate(width, 0);
                    ctx.scale(-1, 1);
                    break;
                case 3:
                    // 180 rotate left
                    ctx.translate(width, height);
                    ctx.rotate(Math.PI);
                    break;
                case 4:
                    // vertical flip
                    ctx.translate(0, height);
                    ctx.scale(1, -1);
                    break;
                case 5:
                    // vertical flip + 90 rotate right
                    ctx.rotate(0.5 * Math.PI);
                    ctx.scale(1, -1);
                    break;
                case 6:
                    // 90 rotate right
                    ctx.rotate(0.5 * Math.PI);
                    ctx.translate(0, -height);
                    break;
                case 7:
                    // horizontal flip + 90 rotate right
                    ctx.rotate(0.5 * Math.PI);
                    ctx.translate(width, -height);
                    ctx.scale(-1, 1);
                    break;
                case 8:
                    // 90 rotate left
                    ctx.rotate(-0.5 * Math.PI);
                    ctx.translate(-width, 0);
                    break;
                default:
                    break;
            }

            ctx.drawImage(img, 0, 0);
            ctx.restore();

            queueMicrotask(cleanup);
            resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));

        }, img.onerror = function(ev) {
            if (d) {
                console.error('exifImageRotation failed...', ev);
            }
            signalError();
        });

        img.src = source instanceof Blob
            ? URL.createObjectURL(source)
            : mObjectURL([source], source.type || 'image/jpeg');
    });
}

function dataURLToAB(dataURL) {
    if (dataURL.indexOf(';base64,') == -1) {
        var parts = dataURL.split(',');
        var contentType = parts[0].split(':')[1];
        var raw = parts[1];
    }
    else {
        var parts = dataURL.split(';base64,');
        var contentType = parts[0].split(':')[1];
        var raw = window.atob(parts[1]);
    }
    var rawLength = raw.length;
    var uInt8Array = new Uint8Array(((rawLength + 15) & -16));
    for (var i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
    }

    return uInt8Array;
}

var ba_images = [],
    ba_time = 0,
    ba_id = 0,
    ba_result = [];

function benchmarki() {
    var a = 0;
    ba_images = [];
    for (var i in M.d) {
        if (M.d[i].name && is_image(M.d[i].name) && M.d[i].fa) {
            ba_images.push(M.d[i]);
        }
        else {
            a++;
        }
    }
    console.log('found ' + ba_images.length + ' images with file attr (' + a + ' don\'t have file attributes)');

    ba_images = shuffle(ba_images);

    ba_result['success'] = 0;
    ba_result['error'] = 0;

    benchmarkireq();
}

function shuffle(array) {
    var currentIndex = array.length,
        temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

function benchmarkireq() {
    ba_time = new Date().getTime();

    function eot(id, err) {
        for (var i in ba_images) {
            if (ba_images[i].h == id) {
                ba_result['error']++;
                console.log('error', new Date().getTime() - ba_time, err);
                console.log(ba_images[i].fa);
                ba_id++;
                benchmarkireq();
            }
        }
    }

    eot.timeout = 5100;

    var n = ba_images[ba_id];
    if (n) {
        var treq = {};
        treq[n.h] = {
            fa: n.fa,
            k: n.k
        };
        preqs[slideshowid = n.h] = 1;
        api_getfileattr(treq, 1, function(ctx, id, uint8arr) {
            for (var i in ba_images) {
                if (ba_images[i].h == id) {
                    ba_result['success']++;
                    console.log('success', uint8arr.length, new Date().getTime() - ba_time);
                    ba_id++;
                    benchmarkireq();

                    previewsrc(myURL.createObjectURL(new Blob([uint8arr], {
                        type: 'image/jpeg'
                    })));
                }
            }
        }, eot);
    }
    else {
        console.log('ready');
        slideshowid = undefined;
        preqs = {};
    }

}

// Do not change this to a remote URL since it'll cause a CORS issue (tainted canvas)
// Neither change it to base64, just a URL-encoded Data URI
var noThumbURI =
    'data:image/svg+xml;charset-utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22240' +
    'pt%22%20height%3D%22240pt%22%20viewBox%3D%220%200%20240%20240%22%3E%3Cpath%20fill%3D%22rgb(80%25,79.607843%25' +
    ',79.607843%25)%22%20fill-rule%3D%22evenodd%22%20d%3D%22M120%20132c6.63%200%2012-5.37%2012-12%200-2.3-.65-4.42' +
    '-1.76-6.24l-16.48%2016.48c1.82%201.1%203.95%201.76%206.24%201.76zm-21.7%205.7c-3.93-4.83-6.3-11-6.3-17.7%200-' +
    '15.47%2012.54-28%2028-28%206.7%200%2012.87%202.37%2017.7%206.3l10.48-10.48C140%2083.18%20130.65%2080%20120%20' +
    '80c-32%200-52.37%2028.57-64%2040%206.96%206.84%2017.05%2019.8%2030.88%2029.13zm54.83-46.82L141.7%20102.3c3.93' +
    '%204.83%206.3%2011%206.3%2017.7%200%2015.47-12.54%2028-28%2028-6.7%200-12.87-2.37-17.7-6.3l-10.48%2010.48C100' +
    '%20156.82%20109.35%20160%20120%20160c32%200%2052.37-28.57%2064-40-6.96-6.84-17.05-19.8-30.88-29.13zM120%20108' +
    'c-6.63%200-12%205.37-12%2012%200%202.3.65%204.42%201.76%206.24l16.48-16.48c-1.82-1.1-3.95-1.76-6.24-1.76zm0%2' +
    '00%22%2F%3E%3C%2Fsvg%3E';
