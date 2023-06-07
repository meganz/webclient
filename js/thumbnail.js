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
        mBroadcaster.sendMessage('fa:error', id, 'omitthumb', false, 2);
        return Promise.resolve();
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
    const createThumbnail = !fa.includes(':0*') || $.funkyThumbRegen;
    const createPreview = !fa.includes(':1*') || onPreviewRetry || $.funkyThumbRegen;
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
            if (!res) {
                throw new Error(`Thumbnail-handler failed for ${(n || file || !1).name}`);
            }
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

            // @todo make async and hold until api_storefileattr() completes (SC-ack)
        }

        if (node) {
            thumbnails.decouple(node);
        }
        sendToPreview(node, preview);

        return {thumbnail, preview};
    };

    let timer;
    let typeGuess;
    const ext = fileext(file && file.name || n.name);
    return (async() => {
        const exifFromImage = !!exifImageRotation.fromImage;

        // @todo move all this to a reusable helper across upload/download
        isVideo = isVideo || MediaInfoLib.isFileSupported(n);

        if (isVideo && (file || imagedata && n.s >= imagedata.byteLength)) {
            file = file || new File([imagedata], n.name, {type: filemime(n)});

            // @todo FIXME mp3 may be wrongly detected as MLP (?!)
            if (is_audio(n) || ext === 'mp3') {
                const buffer = imagedata && imagedata.buffer;
                imagedata = await getID3CoverArt(buffer || imagedata || file).catch(nop) || imagedata;
            }
            else {
                await Promise.resolve(M.require('videostream'));
                imagedata = await Streamer.getThumbnail(file).catch(nop) || imagedata;
            }
        }
        else if (isRawImage && exifFromImage && webgl.doesSupport('worker')) {
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

        typeGuess = source.type || (await webgl.identify(source)).type || 'unknown';
        if (d) {
            debug(`Source guessed to be ${typeGuess}...`, [source]);
        }

        (timer = tSleep(120))
            .then(() => webgl.sendTimeoutError())
            .catch(dump);

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

        if (String(ex && ex.message || ex).includes('Thumbnail-handler')) {
            // @todo mute above debug() if too noisy..
            return;
        }
        webgl.gLastError = ex;

        if (!window.pfid && canStoreAttr && String(typeGuess).startsWith('image/')) {
            eventlog(99665, JSON.stringify([
                3,
                ext,
                typeGuess,
                String(ex && ex.message || ex).split('\n')[0].substr(0, 98),
                fa.includes(':8*') && String(MediaAttribute.getCodecStrings(n)) || 'na'
            ]));
        }
        throw new MEGAException(ex, imagedata || file);
    }).finally(() => {
        if (timer) {
            tryCatch(() => timer.abort())();
            timer = null;
        }
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

// ----------------------------------------------------------------------------------

/**
 * Creates a new thumbnails' manager.
 * @param {Number} capacity for LRU
 * @param {String} [dbname] optional database name
 * @returns {LRUMap}
 */
class ThumbManager extends LRUMap {
    constructor(capacity, dbname) {
        super(capacity || 200, (value, key, store, rep) => store.remove(key, value, rep));

        Object.defineProperty(this, 'evict', {value: []});
        Object.defineProperty(this, 'debug', {value: self.d > 4});

        Object.defineProperty(this, 'loaded', {value: 0, writable: true});
        Object.defineProperty(this, 'pending', {value: Object.create(null)});

        Object.defineProperty(this, 'requested', {value: new Map()});
        Object.defineProperty(this, 'duplicates', {value: new MapSet(this.capacity << 2, d && nop)});

        Object.defineProperty(this, '__ident_0', {value: `thumb-manager.${makeUUID()}`});

        if (dbname) {
            this.loading = LRUMegaDexie.create(dbname, this.capacity << 4)
                .then(db => {
                    if (db instanceof LRUMegaDexie) {
                        Object.defineProperty(this, 'db', {value: db, writable: true});

                        this.db.add = (h, data) => {
                            webgl.readAsArrayBuffer(data)
                                .then(buf => this.db.set(h, buf))
                                .catch((ex) => {
                                    if (d) {
                                        console.assert(this.db.error, `Unexpected error... ${ex}`, ex);
                                    }
                                    this.db = false;
                                });
                        };
                    }
                })
                .catch(dump)
                .finally(() => {
                    delete this.loading;
                });
        }
    }

    get [Symbol.toStringTag]() {
        return 'ThumbManager';
    }

    revoke(h, url, stay) {

        if (this.debug) {
            console.warn(`Revoking thumbnail ${h}, ${url}`);
        }
        this.delete(h);

        if (!stay) {
            this.decouple(h);
        }
        URL.revokeObjectURL(url);
    }

    dispose(single) {
        let threshold = single ? 0 : this.capacity / 10 | 1;

        if (this.debug) {
            console.group('thumbnails:lru');
        }

        for (let i = this.evict.length; i--;) {
            this.revoke(...this.evict[i]);
        }
        this.evict.length = 0;

        while (--threshold > 0) {
            const [[k, v]] = this;
            this.revoke(k, v);
        }

        if (this.debug) {
            console.groupEnd();
        }

        delay.cancel(this.__ident_0);
    }

    remove(...args) {
        this.evict.push(args);
        return args[2] ? this.dispose(true) : delay(this.__ident_0, () => this.dispose(), 400);
    }

    cleanup() {
        this.loaded = 0;
        this.duplicates.clear();
    }

    decouple(key) {
        const fa = (M.getNodeByHandle(key) || key).fa || key;

        this.each(fa, (n) => {
            n.seen = null;

            if (M.megaRender) {
                M.megaRender.revokeDOMNode(n.h);
            }
        });

        this.duplicates.delete(fa);
        this.requested.delete(fa);
    }

    each(fa, cb) {
        if (this.duplicates.size(fa)) {
            const hs = [...this.duplicates.get(fa)];

            for (let i = hs.length; i--;) {
                const n = M.getNodeByHandle(hs[i]);

                if (n && cb(n)) {
                    return true;
                }
            }
        }
    }

    queued(n, type) {
        let res = false;

        const rv = this.requested.get(n.fa) | 0;
        if (!super.has(n.fa) && !rv || rv !== type + 1 && rv < 2) {

            if (!this.pending[n.fa]) {
                this.pending[n.fa] = [];
            }

            res = true;
            this.requested.set(n.fa, 1 + type);
        }

        this.duplicates.set(n.fa, n.h);
        return res;
    }

    add(key, value, each) {
        if (d) {
            console.assert(super.get(key) !== value);
        }
        super.set(key, value);

        if (this.pending[key]) {
            for (let i = this.pending[key].length; i--;) {
                queueMicrotask(this.pending[key][i]);
            }
            delete this.pending[key];
        }

        if (each) {
            this.each(key, each);
        }
    }

    replace(h, value) {
        const n = M.getNodeByHandle(h);

        this.add(n.fa, value || self.noThumbURI);

        if (M.megaRender) {
            const domNode = M.megaRender.revokeDOMNode(n.h);
            if (domNode) {
                const img = domNode.querySelector('img');
                if (img) {
                    img.src = super.get(n.fa);
                }
            }
        }
    }

    async query(handles, each, loadend) {
        if (this.loading) {
            await this.loading;
        }

        if (this.db && handles.length) {
            const send = async(h, ab) => loadend(h, ab);
            const found = await this.db.bulkGet(handles).catch(dump) || false;

            for (const h in found) {

                if (each(h)) {
                    send(h, found[h]).catch(dump);
                }
            }
        }
    }
}

Object.defineProperties(ThumbManager, {
    rebuildThumbnails: {
        value: async(nodes) => {
            'use strict';
            let max = 1e9;
            const gen = (h) => {
                const n = M.getNodeByHandle(h);

                if (n.t || n.u !== u_handle || (max -= n.s) < 0) {
                    return Promise.reject('Access denied.');
                }

                return M.gfsfetch(h, 0, -1).then(res => setImage(n, res));
            };
            const fmt = (res) => {
                const output = {};
                for (let i = res.length; i--;) {
                    output[nodes[i]] = {name: M.getNameByHandle(nodes[i]), ...res[i]};
                }
                return output;
            };

            nodes = [...nodes];
            $.funkyThumbRegen = 1;

            const res = await Promise.allSettled(nodes.map(gen)).then(fmt).catch(dump);
            console.table(res);

            delete $.funkyThumbRegen;
        }
    }
});

// ----------------------------------------------------------------------------------

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
