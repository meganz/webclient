function createnodethumbnail(node, aes, id, imagedata, opt) {
    storedattr[id] = {};
    storedattr[id] = {
        target: node
    };
    createthumbnail(false, aes, id, imagedata, node, opt);
}

function createthumbnail(file, aes, id, imagedata, node, opt) {

    var onPreviewRetry, isRawImage, thumbHandler;

    if (typeof opt === 'object') {
        isRawImage = opt.raw;
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

        ASSERT(!isRawImage || typeof dcraw !== 'undefined', 'DCRAW is unavailale.');
    }
    else {
        onPreviewRetry = !!opt;
    }

    if (d) {
        console.time('createthumbnail');
    }

    var img = new Image();
    img.id = id;
    img.aes = aes;
    img.onload = function() {
        var t = new Date().getTime();
        var n = M.d[node];
        var fa = '' + (n && n.fa);
        var dataURI;
        var canvas;
        var ctx;
        var ab;
        var imageType = 'image/jpeg';
        var canStoreAttr = !n || (n.u === u_handle && n.f !== u_handle);
        // XXX: In Firefox loading a ~100MB image might throw `Image corrupt or truncated.`
        // and this .onload called back with a white image. Bug #941823 / #1045926
        // This is the MurmurHash3 for such image's dataURI.
        var MURMURHASH3RR = 0x59d73a69;

        if (img.isPNG) {
            var transparent;

            canvas = document.createElement('canvas');
            ctx = canvas.getContext("2d");
            canvas.width = this.naturalWidth;
            canvas.height = this.naturalHeight;
            ctx.drawImage(this, 0, 0, canvas.width, canvas.height);
            ab = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

            for (var i = 0 ; i < ab.length ; i += 4) {
                if (ab[i + 3] < 0xff) {
                    transparent = true;
                    break;
                }
            }

            if (transparent) {
                imageType = 'image/png';
                MURMURHASH3RR = 0xE6BC61E0;
            }
        }

        if (d) {
            console.debug('createthumbnail', imageType);
        }

        // thumbnail:
        if (fa.indexOf(':0*') < 0) {
            var options = {
                width: 120,
                height: 120
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

            dataURI = canvas.toDataURL(imageType, 0.70);
            // if (d) console.log('THUMBNAIL', dataURI);
            if (MurmurHash3(dataURI, 0x7fee00aa) === MURMURHASH3RR) {
                console.error('Error generating thumbnail, aborting...');
                return;
            }

            if (canStoreAttr) {
                ab = dataURLToAB(dataURI);

                // FIXME hack into cipher and extract key
                api_storefileattr(this.id, 0, this.aes._key[0].slice(0, 4), ab.buffer, n && n.h);
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

            // only store preview when the user is the file owner, and when it's not a retry (because then there is already a preview image, it's just unavailable:

            if (!onPreviewRetry && canStoreAttr && fa.indexOf(':1*') < 0) {
                if (d) {
                    console.log('Storing preview...', n);
                }
                // FIXME hack into cipher and extract key
                api_storefileattr(this.id, 1, this.aes._key[0].slice(0, 4), ab.buffer, n && n.h);
            }

            if (node) {
                previewimg(node, ab);
            }

            if (d) {
                console.log('total time:', new Date().getTime() - t);
            }
        }

        if (d) {
            console.timeEnd('createthumbnail');
        }
    };
    img.onerror = function(e) {
        if (d) {
            console.error('createthumbnail error', e);
            console.timeEnd('createthumbnail');
        }
    };
    if (typeof FileReader !== 'undefined') {
        setTimeout(function() {
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
                    } finally {
                        try {
                            FS.unlink(filename);
                        }
                        catch (e) {
                            if (e.code !== 'ENOENT') {
                                console.error('FS.unlink error', e);
                            }
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
                        }
                    }

                    if (thumbData) {
                        file = new Blob([thumbData], {
                            type: 'image/jpg'
                        });
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

                __render_thumb(img, u8, orientation, file);
                file = imagedata = undefined;
            };
            if (file) {
                if (is_chrome_firefox && "blob" in file) {
                    if (file.size > 2e6) {
                        try {
                            return OS.File.read(file.mozFile.path).then(function(u8) {
                                file = new Blob([u8], {
                                    type: file.type
                                });
                                mega.utils.neuterArrayBuffer(u8);
                                ThumbFR.readAsArrayBuffer(file);
                            }, function(ex) {
                                if (d) {
                                    console.error(String(ex), ex);
                                }
                                __render_thumb(img);
                            });
                        }
                        catch (e) {}
                    }

                    try {
                        file = file.blob();
                    }
                    catch (ex) {
                        if (d) {
                            console.error(ex);
                        }
                        __render_thumb(img);
                    }
                }
            }
            else {
                file = new Blob([new Uint8Array(imagedata)], {
                    type: 'image/jpeg'
                });
                mega.utils.neuterArrayBuffer(imagedata);
            }
            ThumbFR.readAsArrayBuffer(file);
        }, 350 + Math.floor(Math.random() * 600));
    }
}

function __render_thumb(img, u8, orientation, blob) {
    if (u8) {
        var dv = new DataView(u8.buffer || u8);
        if (dv.getUint32(0) === 0x89504e47) {
            img.isPNG = true;
        }
        dv = undefined;

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
        mega.utils.neuterArrayBuffer(u8);
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
                imageData.data[j] = ppm[i]; // R
                imageData.data[j + 1] = ppm[i + 1]; // G
                imageData.data[j + 2] = ppm[i + 2]; // B
                imageData.data[j + 3] = 0xBE; // A
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


var noThumbURI = "data:image/svg+xml;charset-utf-8,%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22UTF-8%22%20standalone%3D%22no%22%3F%3E%3Csvg%20width%3D%22120px%22%20height%3D%22120px%22%20viewBox%3D%220%200%20120%20120%22%20version%3D%221.1%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%20xmlns%3Asketch%3D%22http%3A%2F%2Fwww.bohemiancoding.com%2Fsketch%2Fns%22%3E%3Cdefs%3E%3C%2Fdefs%3E%3Cg%20id%3D%22Page-1%22%20stroke%3D%22none%22%20stroke-width%3D%221%22%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%20sketch%3Atype%3D%22MSPage%22%3E%3Cg%20id%3D%22no-thumb%22%20sketch%3Atype%3D%22MSArtboardGroup%22%20fill%3D%22%23CCCBCB%22%3E%3Cpath%20d%3D%22M60%2C66%20C63.315%2C66%2066%2C63.315%2066%2C60%20C66%2C58.856%2065.674%2C57.791%2065.119%2C56.881%20L56.881%2C65.119%20C57.791%2C65.674%2058.856%2C66%2060%2C66%20Z%20M49.153%2C68.847%20C47.183%2C66.436%2046%2C63.357%2046%2C60%20C46%2C52.266%2052.267%2C46%2060%2C46%20C63.357%2C46%2066.436%2C47.183%2068.847%2C49.153%20L74.092%2C43.908%20C70.002%2C41.587%2065.325%2C40%2060%2C40%20C44%2C40%2033.817%2C54.285%2028%2C60%20C31.48%2C63.419%2036.524%2C69.902%2043.438%2C74.562%20L49.153%2C68.847%20Z%20M76.562%2C45.438%20L70.848%2C51.153%20C72.817%2C53.564%2074%2C56.643%2074%2C60%20C74%2C67.734%2067.733%2C74%2060%2C74%20C56.643%2C74%2053.564%2C72.817%2051.153%2C70.847%20L45.909%2C76.091%20C49.998%2C78.413%2054.675%2C80%2060%2C80%20C76.001%2C80%2086.183%2C65.715%2092%2C60%20C88.52%2C56.581%2083.477%2C50.098%2076.562%2C45.438%20Z%20M60%2C54%20C56.686%2C54%2054%2C56.685%2054%2C60%20C54%2C61.144%2054.326%2C62.209%2054.881%2C63.119%20L63.119%2C54.881%20C62.209%2C54.326%2061.144%2C54%2060%2C54%20Z%22%20id%3D%22Fill-1%22%20sketch%3Atype%3D%22MSShapeGroup%22%3E%3C%2Fpath%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E";
