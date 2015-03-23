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

        // thumbnail:
        if (fa.indexOf(':0*') < 0) {
            var options = {
                width: 120,
                height: 120
            };

            if (d) {
                console.time('smartcrop');
            }
            var crop = SmartCrop.crop(this, options).topCrop;
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext("2d");
            canvas.width = options.width;
            canvas.height = options.height;
            ctx.drawImage(this, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);

            var ab = dataURLToAB(canvas.toDataURL('image/jpeg', 0.90));
            api_storefileattr(this.id, 0,
                this.aes._key[0].slice(0, 4), ab.buffer); // FIXME hack into cipher and extract key

            if (d) {
                console.timeEnd('smartcrop');
            }
        }

        // preview image:
        if (fa.indexOf(':1*') < 0 || onPreviewRetry) {
            var canvas2 = document.createElement('canvas');
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
            var ctx2 = canvas2.getContext("2d");
            canvas2.width = preview_x;
            canvas2.height = preview_y;
            ctx2.drawImage(this, 0, 0, preview_x, preview_y);

            var dataURI2 = canvas2.toDataURL('image/jpeg', 0.85);

            var ab2 = dataURLToAB(dataURI2);

            // only store preview when the user is the file owner, and when it's not a retry (because then there is already a preview image, it's just unavailable:

            if (!onPreviewRetry && (!n || n.u == u_handle) && fa.indexOf(':1*') < 0) {
                if (d) {
                    console.log('Storing preview...', n);
                }
                api_storefileattr(this.id, 1, this.aes._key[0].slice(0, 4),
                    ab2.buffer); // FIXME hack into cipher and extract key
            }

            if (node) {
                previewimg(node, ab2);
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
    try {
        if (typeof FileReader !== 'undefined') {
            var ThumbFR = new FileReader();
            ThumbFR.onload = function(e) {
                var u8 = new Uint8Array(ThumbFR.result),
                    orientation;
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
            };
            if (file) {
                if (is_chrome_firefox && "blob" in file) {
                    if (file.size > 2e6) {
                        try {
                            return OS.File.read(file.mozFile.path).then(function(u8) {
                                file = new Blob([u8], {
                                    type: file.type
                                });
                                ThumbFR.readAsArrayBuffer(file);
                            });
                        }
                        catch (e) {}
                    }

                    file = file.blob();
                }

            }
            else {
                file = new Blob([new Uint8Array(imagedata)], {
                    type: 'image/jpeg'
                });
            }
            ThumbFR.readAsArrayBuffer(file);
        }
    }
    catch (e) {
        console.log('thumbnail error', e)
    }

}

function __render_thumb(img, u8, orientation, blob) {
    if (undefined == orientation || orientation < 1 || orientation > 8) {
        if (d) {
            console.time('exif');
        }
        var exif = EXIF.getImageData(new BinaryFile(u8), true);
        orientation = +exif.Orientation || 1;
        if (d) {
            console.timeEnd('exif');
            console.debug('EXIF', exif, orientation);
        }
    }
    if (!blob) {
        blob = new Blob([u8], {
            type: 'image/jpg'
        });
    }
    var mpImg = new MegaPixImage(blob);
    mpImg.render(img, {
        maxWidth: 1000,
        maxHeight: 1000,
        quality: 0.96,
        orientation: orientation
    });
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
            k: n.key
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
