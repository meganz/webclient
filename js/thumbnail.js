function createnodethumbnail(node, aes, id, imagedata, opt, ph, file) {
    storedattr[id] = Object.assign(Object.create(null), {'$ph': ph, target: node});
    createthumbnail(file || false, aes, id, imagedata, node, opt);

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

    if (typeof opt === 'object') {
        isRawImage = opt.raw;
        isVideo = opt.isVideo;
        onPreviewRetry = opt.onPreviewRetry;

        if (typeof isRawImage === 'function') {
            thumbHandler = isRawImage;
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

    if (d) {
        console.time('createthumbnail' + id);
    }

    var img = new Image();
    img.id = id;
    img.aes = aes;
    img.onload = tryCatch(function() {
        var t = new Date().getTime();
        var n = M.getNodeByHandle(node);
        var fa = '' + (n && n.fa);
        var ph = Object(storedattr[id]).$ph;
        var dataURI;
        var canvas;
        var ctx;
        var ab;
        var imageType = 'image/jpeg';
        var canStoreAttr = !n || !n.u || (n.u === u_handle && n.f !== u_handle);

        if (img.isPNG) {
            var transparent;

            canvas = document.createElement('canvas');
            ctx = canvas.getContext("2d");
            canvas.width = this.naturalWidth;
            canvas.height = this.naturalHeight;
            ctx.drawImage(this, 0, 0, canvas.width, canvas.height);
            ab = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

            for (var i = 0; i < ab.length; i += 4) {
                if (ab[i + 3] < 0xff) {
                    transparent = true;
                    break;
                }
            }

            if (transparent) {
                imageType = 'image/png';
            }
        }

        if (d) {
            console.debug('createthumbnail', imageType);
        }

        // thumbnail:
        if (fa.indexOf(':0*') < 0) {
            // XXX: Make this width/height divisible by 16 for optimal SmartCrop results!
            var options = {
                width: 240,
                height: 240
            };

            canvas = document.createElement('canvas');
            ctx = canvas.getContext("2d");
            canvas.width = options.width;
            canvas.height = options.height;

            if (this.naturalWidth > options.width || this.naturalHeight > options.height) {
                if (d) {
                    console.time('smartcrop');
                }
                var crop = SmartCrop.crop(this, options).topCrop;
                ctx.drawImage(this, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);

                if (d) {
                    console.timeEnd('smartcrop');
                }
            }
            else {
                ctx.drawImage(this,
                    (options.width / 2) - (this.naturalWidth / 2),
                    (options.height / 2) - (this.naturalHeight / 2));
            }

            ab = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

            var len = ab.byteLength;
            while (len-- && !ab[len]) {}
            if (len < 0) {
                console.warn('All pixels are black, aborting thumbnail creation...', ab.byteLength);
                throw new Error('Unsupported image type/format.');
            }

            dataURI = canvas.toDataURL(imageType, 0.80);
            // if (d) console.log('THUMBNAIL', dataURI);

            if (canStoreAttr) {
                ab = dataURLToAB(dataURI);

                // FIXME hack into cipher and extract key
                api_storefileattr(this.id, 0, this.aes._key[0].slice(0, 4), ab.buffer, n && n.h, ph);
            }

            if (node) {
                delete th_requested[node];
            }
        }

        // preview image:
        if (fa.indexOf(':1*') < 0 || onPreviewRetry) {
            canvas = document.createElement('canvas');
            var preview_x = this.width,
                preview_y = this.height;
            if (preview_x > 1000) {
                preview_y = Math.round(preview_y * 1000 / preview_x);
                preview_x = 1000;
            }
            else if (preview_y > 1000) {
                preview_x = Math.round(preview_x * 1000 / preview_y);
                preview_y = 1000;
            }
            ctx = canvas.getContext("2d");
            canvas.width = preview_x;
            canvas.height = preview_y;
            ctx.drawImage(this, 0, 0, preview_x, preview_y);

            dataURI = canvas.toDataURL('image/jpeg', 0.75);
            // if (d) console.log('PREVIEW', dataURI);

            ab = dataURLToAB(dataURI);

            // only store preview when the user is the file owner, and when it's not a
            // retry (because then there is already a preview image, it's just unavailable)

            if (!onPreviewRetry && canStoreAttr && fa.indexOf(':1*') < 0) {
                if (d) {
                    console.log('Storing preview...', n);
                }
                // FIXME hack into cipher and extract key
                api_storefileattr(this.id, 1, this.aes._key[0].slice(0, 4), ab.buffer, n && n.h, ph);
            }

            if (node && filetype(n) !== 'PDF Document' && !is_video(n)) {
                previewimg(node, ab);
            }

            if (d) {
                console.log('total time:', new Date().getTime() - t);
            }
        }

        if (d) {
            console.timeEnd('createthumbnail' + id);
        }

        delete this.aes;
        img = null;
    }, img.onerror = function(e) {
        if (d) {
            console.timeEnd('createthumbnail' + id);
            console.error('Failed to create thumbnail', e);
        }

        api_req({a: 'log', e: 99665, m: 'Thumbnail creation failed.'});
        mBroadcaster.sendMessage('fa:error', id, e, false, 2);
    });

    if (typeof FileReader !== 'undefined') {
        var loader = function() {
            var ThumbFR = new FileReader();
            ThumbFR.onload = function(e) {
                var orientation;
                var u8 = new Uint8Array(ThumbFR.result);

                if (u8.byteLength < 4) {
                    console.error('Unable to create thumbnail, data too short...');
                    return;
                }

                img.dataSize = u8.byteLength;
                img.is64bit = browserdetails(ua).is64bit;

                // Deal with huge images...
                if (!img.is64bit && img.dataSize > (36 * 1024 * 1024)) {
                    // Let dcraw try to extract a thumbnail
                    if (typeof dcraw !== 'undefined') {
                        isRawImage = isRawImage || 'not-really';
                    }
                    img.huge = true;
                }

                if (thumbHandler) {
                    return thumbHandler(u8.buffer, function(ab) {
                        if (ab) {
                            __render_thumb(img, ab);
                        }
                    });
                }

                if (isRawImage) {
                    var FS = dcraw.FS,
                        run = dcraw.run,
                        thumbData;
                    var filename = file.name || (Math.random() * Date.now()).toString(36) + '.' + isRawImage;

                    try {
                        var cwd = '/MEGA-' + Date.now();
                        FS.mkdir(cwd);
                        FS.chdir(cwd);

                        if (d) {
                            console.time('dcraw-load');
                        }
                        var data = FS.createDataFile('.', filename, u8, true, false);
                        if (d) {
                            console.timeEnd('dcraw-load');
                        }

                        if (d) {
                            console.time('dcraw-proc');
                        }
                        if (d) {
                            run(['-i', '-v', filename]);
                        }
                        run(['-e', filename]);
                        if (d) {
                            console.timeEnd('dcraw-proc');
                        }
                    }
                    catch (e) {
                        if (d) {
                            console.error('dcraw error', e);
                        }
                    }

                    var thumb = filename.substr(0, filename.lastIndexOf('.'));
                    try {
                        thumbData = FS.readFile(thumb + '.thumb.jpg');
                    }
                    catch (e) {
                        if (e.code !== 'ENOENT') {
                            console.error('FS.readFile error', e);
                        }

                        try {
                            var ppm = FS.readFile(thumb + '.thumb.ppm');
                            thumbData = ppmtojpeg(ppm);
                        }
                        catch (e) {
                            if (e.code !== 'ENOENT') {
                                console.error('FS.readFile error', e);
                            }
                            else {
                                if (d) {
                                    console.log(filename + ' has no thumbnail, converting whole image...');
                                    console.time('dcraw-conv');
                                }
                                api_req({a: 'log', e: 99662, m: 'RAW image w/o thumbnail.'});

                                run(['-O', thumb + '.ppm', filename]);

                                try {
                                    thumbData = ppmtojpeg(FS.readFile(thumb + '.ppm'));
                                }
                                catch (e) {
                                }

                                if (d) {
                                    console.timeEnd('dcraw-conv');
                                }
                            }
                        }
                    }

                    try {
                        FS.unlink(filename);
                    }
                    catch (ex) {
                        if (ex.code !== 'ENOENT') {
                            console.error('FS.unlink error', ex);
                        }
                    }

                    if (thumbData) {
                        file = new Blob([thumbData], {type: 'image/jpg'});
                        api_req({a: 'log', e: 99663, m: 'RAW image processed.'});
                    }
                    else {
                        api_req({a: 'log', e: 99664, m: 'Failed to decode RAW image.'});
                    }

                    try {
                        FS.readdir('.').map(function(n) {
                            n != '.' && n != '..' && FS.unlink(n)
                        });
                        FS.readdir('/tmp').map(function(n) {
                            n != '.' && n != '..' && FS.unlink('/tmp/' + n)
                        });
                        FS.chdir('..');
                        FS.rmdir(cwd);
                    }
                    catch (e) {
                        if (d) {
                            console.error('dcraw error', e);
                        }
                    }

                    switch (isRawImage) {
                        // TODO: add other suitable formats
                        case 'PEF':
                            orientation = +u8[115];
                            break;
                    }
                }

                __render_thumb(img, u8, orientation, file, isRawImage);
                file = imagedata = undefined;
            };
            if (!file) {
                var defMime = 'image/jpeg';
                var curMime = MediaInfoLib.isFileSupported(node) ? defMime : filemime(M.d[node], defMime);
                file = new Blob([new Uint8Array(imagedata)], {type: curMime});
            }
            ThumbFR.readAsArrayBuffer(file);
        };
        var timeout = parseInt(localStorage.delayedThumbnailCreation) || 350 + Math.floor(Math.random() * 600);

        loader = setTimeout.bind(window, loader, timeout);

        if (isRawImage) {
            M.require('dcrawjs').always(function() {
                'use strict';

                if (typeof dcraw !== 'undefined') {
                    loader();
                }
                else {
                    console.error('Failed to load dcraw.js');
                }
            });
        }
        else if (isVideo && file) {
            M.require('videostream').tryCatch(function() {
                Streamer.getThumbnail(file).then(__render_thumb.bind(null, img)).catch(console.debug.bind(console));
            });
        }
        else {
            loader();
        }
    }
}

function __render_thumb(img, u8, orientation, blob, noMagicNumCheck) {
    'use strict';

    if (u8 && !noMagicNumCheck) {
        var dv = new DataView(u8.buffer || u8);
        // Perform magic number checks for each recognized image type by is_image() per file extension.
        // Anything handled from mThumbHandler is meant to return a PNG, so we don't need to add a magic for eg SVG.
        switch (dv.getUint16(0)) {
            case 0xFFD8: // JPEG
            case 0x4D4D: // TIFF, big-endian
            case 0x4949: // TIFF, little-endian
            case 0x424D: // BMP
                break;

            default:
                switch (dv.getUint32(0)) {
                    case 0x89504e47: // PNG
                        img.isPNG = true;
                    /* fallthrough */
                    case 0x47494638: // GIF8
                    case 0x47494639: // GIF9
                        break;

                    default:
                        if (d) {
                            console.warn('Unrecognized image format.', dv);
                        }
                        u8 = null;
                }
        }
        dv = undefined;
    }

    if (u8) {
        if (orientation === undefined || orientation < 1 || orientation > 8) {
            if (d) {
                console.time('exif');
            }
            var exif = EXIF.readFromArrayBuffer(u8, true);
            orientation = parseInt(exif.Orientation) || 1;
            if (d) {
                console.timeEnd('exif');
                console.debug('EXIF', exif, orientation);
            }
            exif = undefined;
        }
        if (!blob) {
            blob = new Blob([u8], {
                type: 'image/jpg'
            });
        }
    }

    if (!u8 || (img.huge && img.dataSize === blob.size)) {
        if (d) {
            console.warn('Unable to generate thumbnail...');
        }
        img.src = noThumbURI;
    }
    else {
        var mpImg = new MegaPixImage(blob);
        mpImg.render(img, {
            maxWidth: 1000,
            maxHeight: 1000,
            quality: 0.96,
            imageType: 'image/png',
            orientation: orientation
        });
    }
}

function ppmtojpeg(ppm) {
    var jpeg;
    if (ppm[0] == 80 && ppm[1] == 54) // P6
    {
        var dim = '',
            i = 2,
            j;
        if (d) {
            console.time('ppmtojpeg');
        }
        while (ppm[++i] != 10) dim += String.fromCharCode(ppm[i]);
        dim = dim.split(' ').map(Number);

        if (ppm[i + 1] == 50 && ppm[i + 2] == 53 && ppm[i + 3] == 53) // 255
        {
            ppm = ppm.subarray(i + 5);
            var canvas = document.createElement('canvas');
            canvas.width = dim[0];
            canvas.height = dim[1];
            var ctx = canvas.getContext('2d');
            var imageData = ctx.createImageData(canvas.width, canvas.height);
            var ppmLen = ppm.byteLength,
                iLen = canvas.width * canvas.height * 4;
            i = 0;
            j = 0;
            while (i < ppmLen && j < iLen) {
                imageData.data[j] = ppm[i];         // R
                imageData.data[j + 1] = ppm[i + 1]; // G
                imageData.data[j + 2] = ppm[i + 2]; // B
                imageData.data[j + 3] = 0xCE;       // A
                j += 4;
                i += 3;
            }
            ctx.putImageData(imageData, 0, 0);
            jpeg = dataURLToAB(canvas.toDataURL('image/png', 0.90));
        }
        if (d) {
            console.timeEnd('ppmtojpeg');
        }
    }
    return jpeg;
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
var noThumbURI = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXR' +
'mLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAxOS4wLjAsIFNWRyBFeHBvcnQgUG' +
'x1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0' +
'i0KHQu9C+0LlfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0ia' +
'HR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiDQoJIHdpZHRoPSIyNDBweCI' +
'gaGVpZ2h0PSIyNDBweCIgdmlld0JveD0iLTE4NSAyNzcgMjQwIDI0MCIgc3R5bGU9ImVuYWJsZS' +
'1iYWNrZ3JvdW5kOm5ldyAtMTg1IDI3NyAyNDAgMjQwOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+D' +
'Qo8c3R5bGUgdHlwZT0idGV4dC9jc3MiPg0KCS5zdDB7b3BhY2l0eTowLjE4O30NCjwvc3R5bGU+' +
'DQo8cGF0aCBjbGFzcz0ic3QwIiBkPSJNLTY1LDQwOWM2LjYsMCwxMi01LjQsMTItMTJjMC0yLjM' +
'tMC42LTQuNC0xLjgtNi4ybC0xNi41LDE2LjVDLTY5LjQsNDA4LjMtNjcuMyw0MDktNjUsNDA5ei' +
'BNLTg2LjcsNDE0LjcNCgljLTMuOS00LjgtNi4zLTExLTYuMy0xNy43YzAtMTUuNSwxMi41LTI4L' +
'DI4LTI4YzYuNywwLDEyLjksMi40LDE3LjcsNi4zbDEwLjUtMTAuNUMtNDUsMzYwLjItNTQuNCwz' +
'NTctNjUsMzU3DQoJYy0zMiwwLTUyLjQsMjguNi02NCw0MGM3LDYuOCwxNy4xLDE5LjgsMzAuOSw' +
'yOS4xTC04Ni43LDQxNC43eiBNLTMxLjksMzY3LjlsLTExLjQsMTEuNGMzLjksNC44LDYuMywxMS' +
'w2LjMsMTcuNw0KCWMwLDE1LjUtMTIuNSwyOC0yOCwyOGMtNi43LDAtMTIuOS0yLjQtMTcuNy02L' +
'jNsLTEwLjUsMTAuNWM4LjIsNC42LDE3LjUsNy44LDI4LjIsNy44YzMyLDAsNTIuNC0yOC42LDY0' +
'LTQwDQoJQy04LDM5MC4yLTE4LjEsMzc3LjItMzEuOSwzNjcuOUwtMzEuOSwzNjcuOXogTS02NSw' +
'zODVjLTYuNiwwLTEyLDUuNC0xMiwxMmMwLDIuMywwLjcsNC40LDEuOCw2LjJsMTYuNS0xNi41DQ' +
'oJQy02MC42LDM4NS43LTYyLjcsMzg1LTY1LDM4NXoiLz4NCjwvc3ZnPg0K';
