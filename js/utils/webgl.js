/* global EXIF, dcraw, exifImageRotation, mThumbHandler, makeUUID */
/* eslint-disable no-use-before-define, strict, max-params, max-classes-per-file */

if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
    Object.defineProperty(self, 'isWorkerScope', {value: true});

    self.echo = (v) => v;
    self.lazy = (t, p, s) => Object.defineProperty(t, p, {
        get() {
            Object.defineProperty(this, p, {value: s.call(this)});
            return this[p];
        },
        configurable: true
    });
    self.eventlog = (e) => fetch(`${apipath}cs?id=0&wwk=1`, {method: 'post', body: JSON.stringify([{a: 'log', e}])});
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

/**
 * The MEGAException interface represents an abnormal event (called an exception) that occurs
 * as a result of calling a method or accessing a property of a Web API.
 * It does extends DOMException adding a stack trace record and a weak reference to some data.
 * @param {Error|String} ex description associated with the given error name.
 * @param {*} [data] arbitrary data to pass through the event.
 * @param {String} [name] A standard DOMException error name.
 */
class MEGAException extends DOMException {
    constructor(ex, data = null, name = 'InvalidStateError') {
        let stack;
        if (ex instanceof Error) {
            stack = ex.stack;
            ex = ex.message || ex;
        }
        if (data && typeof data === 'string' && /^[A-Z].*Error$/.test(data)) {
            name = data;
            data = null;
        }
        super(ex, name);

        if (data !== null) {
            if (typeof data === 'object') {
                const ref = new WeakRef(data);
                Object.defineProperty(this, 'data', {
                    get() {
                        return ref.deref();
                    }
                });
            }
            else {
                Object.defineProperty(this, 'data', {value: data});
            }
        }

        if (!stack) {
            stack = new Error(ex).stack;

            if (stack && typeof stack === 'string') {
                stack = stack.replace('Error:', `${name}:`)
                    .split('\n')
                    .filter(MEGAException.stackFilter)
                    .join('\n');
            }
        }

        Object.defineProperty(this, 'stack', {
            configurable: true,
            value: String(stack || '')
        });
    }

    toString() {
        return `${this.name}: ${this.message}`;
    }

    valueOf() {
        const {stack, name} = this;
        return stack.startsWith(name) ? stack : `${this.toString()}\n${stack}`;
    }

    get [Symbol.toStringTag]() {
        return 'MEGAException';
    }
}

Object.defineProperty(MEGAException, 'assert', {
    value: function assert(expr, msg, ...args) {
        if (!expr) {
            throw new MEGAException(msg || 'Failed assertion.', ...args);
        }
    }
});

/** @property MEGAException.stackFilter */
lazy(MEGAException, 'stackFilter', () => {
    'use strict';
    const assert = self.ua && ua.details.engine === 'Gecko' ? 'assert@' : 'assert ';

    return (ln) => !ln.includes('MEGAException') && !ln.includes(assert);
});

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

/**
 * The MEGAImageElement interface provides utility functions to load and/or decode images in different formats.
 * @param {String|Blob|ArrayBufferLike} source The resource to load.
 * @param {String} [type] The mime type associated with the resource being loaded.
 */
class MEGAImageElement {
    constructor(source, type = MEGAImageElement.DEFAULT_FORMAT) {
        if (source) {
            this.type = type;
            this.source = source;
        }
    }

    loadImage(source, type = MEGAImageElement.DEFAULT_FORMAT, options = null) {
        return new Promise((resolve, reject) => {
            let objectURL;

            if (typeof type === 'object') {
                options = type;
                type = options.type || MEGAImageElement.DEFAULT_FORMAT;
            }

            if (typeof source === 'object' && "byteLength" in source) {
                source = new Blob([source], {type});
            }

            if (source instanceof Blob) {
                if (self.isWorkerScope) {
                    return this.createImageBitmap(source).then(resolve).catch(reject);
                }
                source = objectURL = URL.createObjectURL(source);
            }

            if (self.isWorkerScope) {
                fetch(source, {mode: 'cors'})
                    .then(resp => resp.blob())
                    .then(blob => this.createImageBitmap(blob))
                    .then(resolve)
                    .catch(reject);
                return;
            }

            const loadend = (error) => {
                if (objectURL) {
                    URL.revokeObjectURL(objectURL);
                }
                image.onload = image.onerror = null;

                if (!(image.width + image.height)) {
                    error = error || true;
                }
                if (error) {
                    const message = error.message || 'The source image cannot be decoded!';
                    return reject(new MEGAException(message, image, 'EncodingError'));
                }
                resolve(image);
            };

            const image = new Image();
            image.crossOrigin = '';
            image.src = source;

            if ('decode' in image) {
                return image.decode().then(() => loadend()).catch(loadend);
            }

            image.onerror = loadend;
            image.onload = () => loadend();
        });
    }

    async decodeTIFFImage(data) {
        if (typeof Tiff === 'undefined') {
            return false;
        }
        Tiff.initialize({TOTAL_MEMORY: 128 * 1048576});

        const tiff = new Tiff(new Uint8Array(data.buffer || data));
        const res = this.createImageData(tiff.readRGBAImage(), tiff.width(), tiff.height());

        this.tryCatch(() => {
            tiff.close();
            Tiff.Module.FS_unlink(tiff._filename);
        });
        return res;
    }

    decodeRAWImage(type, data) {
        const d = self.d > 0;
        const uint8 = new Uint8Array(data);
        const {FS, run} = self.dcraw || !1;
        const filename = `${Math.random().toString(26).slice(-9)}.${type}`;
        let orientation, cwd;

        if (d) {
            console.group(`decodeRAWImage(${filename})`);
            console.time(filename);
        }

        this.tryCatch(() => {
            cwd = `/MEGA-${Date.now()}`;
            FS.mkdir(cwd);
            FS.chdir(cwd);

            if (d) {
                console.time('dcraw-load');
            }
            FS.createDataFile('.', filename, uint8, true, false);

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
        })();

        const thumb = filename.substr(0, filename.lastIndexOf('.'));

        const getPPMThumbnail = () => FS.readFile(`${thumb}.thumb.ppm`);
        const getJPEGThumbnail = () => FS.readFile(`${thumb}.thumb.jpg`);

        const convertImage = () => {
            if (d) {
                this.debug(`${filename} has no thumbnail, converting whole image...`);
                console.time('dcraw-conv');
            }

            if (typeof eventlog !== 'undefined') {
                // log 'RAW image w/o thumbnail'
                eventlog(99662);
            }

            run(['-O', `${thumb}.ppm`, filename]);

            const result = this.tryCatch(() => this.convertPPMToImageData(FS.readFile(`${thumb}.ppm`)))();

            if (d) {
                console.timeEnd('dcraw-conv');
            }

            return result;
        };

        const step3 = this.tryCatch(convertImage);
        const step2 = this.tryCatch(() => this.convertPPMToImageData(getPPMThumbnail()), step3);

        data = this.tryCatch(getJPEGThumbnail, step2)();

        this.tryCatch(() => FS.unlink(filename))();
        this.tryCatch(() => {
            FS.readdir('.').map((n) => n !== '.' && n !== '..' && FS.unlink(n));
            FS.readdir('/tmp').map((n) => n !== '.' && n !== '..' && FS.unlink(`/tmp/${n}`));
            FS.chdir('..');
            FS.rmdir(cwd);
        })();

        if (typeof eventlog !== 'undefined') {
            // 'RAW image processed.' : 'Failed to decode RAW image.'
            eventlog(data ? 99663 : 99664);
        }

        if (type === 'PEF') {
            orientation = +uint8[115];
        }

        if (d) {
            console.timeEnd(filename);
            console.groupEnd();
        }
        return data && {data, orientation} || false;
    }

    convertPPMToImageData(ppm) {
        let imageData;

        // Check for P6 header
        if (ppm[0] === 80 && ppm[1] === 54) {
            let i = 2;
            let dim = '';

            if (self.d) {
                console.time('convertPPMToImageData');
            }

            while (ppm[++i] !== 10) {
                dim += String.fromCharCode(ppm[i]);
            }

            // check for 255 identifier.
            if (ppm[i + 1] === 50 && ppm[i + 2] === 53 && ppm[i + 3] === 53) {
                const [width, height] = dim.split(' ').map(Number);
                const {ctx} = new MEGACanvasElement(width, height, '2d');

                ppm = ppm.subarray(i + 5);
                imageData = ctx.createImageData(width, height);

                const ppmLen = ppm.byteLength;
                const iLen = width * height * 4;
                let blank = true;
                let j = 0;
                i = 0;
                while (i < ppmLen && j < iLen) {
                    if (blank) {
                        blank = !(ppm[i] | ppm[i + 1] | ppm[i + 2]);
                    }
                    imageData.data[j] = ppm[i];         // R
                    imageData.data[j + 1] = ppm[i + 1]; // G
                    imageData.data[j + 2] = ppm[i + 2]; // B
                    imageData.data[j + 3] = 255;        // A
                    i += 3;
                    j += 4;
                }

                if (blank) {
                    imageData = null;
                }
            }

            if (self.d) {
                console.timeEnd('convertPPMToImageData');
            }
        }

        return imageData;
    }

    identify(data) {
        if (data instanceof Blob) {
            return this.readAsArrayBuffer(data.slice(0, 32)).then(ab => this.identify(ab));
        }
        const res = Object.create(null);
        const dv = new DataView(data.buffer || data);
        const getUint32 = (offset) => dv.byteLength > 4 + offset && dv.getUint32(offset);

        // Perform magic number checks for each recognized image type by is_image() per file extension.
        // Anything handled from mThumbHandler is meant to return a PNG, so we don't need to add a magic for eg SVG.
        switch (dv.getUint16(0)) {
            case 0xFFD8:
                res.format = 'JPEG';
                res.type = 'image/jpeg';
                break;
            case 0x4D4D: // TIFF, big-endian
                res.bigEndian = true;
            /* fallthrough */
            case 0x4949: // TIFF, little-endian
                res.format = 'TIFF';
                res.type = 'image/tiff';
                break;
            case 0x424D:
                res.format = 'BMP';
                res.type = 'image/bmp';
                break;
            case 0xFF0A:
                // JPEG-XL 'naked' codestream.
                res.format = 'JXL';
                res.type = 'image/jxl';
                res.doesSupportAlpha = true;
                break;

            default:
                if (getUint32(20) === 0x68656963) {
                    res.format = 'HEIC';
                    res.type = 'image/heic';
                    break;
                }
                if (getUint32(20) === 0x61766966) {
                    res.format = 'AVIF';
                    res.type = 'image/avif';
                    break;
                }
                if (getUint32(8) === 0x57454250) {
                    res.format = 'WEBP';
                    res.type = 'image/webp';
                    res.doesSupportAlpha = true;
                    break;
                }
                if (getUint32(4) === 0x4A584C20) {
                    // JPEG-XL ISOBMFF-based container.
                    res.format = 'JXL';
                    res.type = 'image/jxl';
                    res.doesSupportAlpha = true;
                    break;
                }

                switch (getUint32(0)) {
                    case 0x89504e47:
                        res.format = 'PNG';
                        res.type = 'image/png';
                        res.doesSupportAlpha = true;
                        break;
                    case 0x47494638: // GIF8
                    case 0x47494639: // GIF9
                        res.format = 'GIF';
                        res.type = 'image/gif';
                        break;

                    default:
                        if (self.d) {
                            this.debug('Unrecognized image format.', dv);
                        }
                        res.format = 'UNK';
                }
        }

        return res;
    }

    readAs(file, method = 'ArrayBuffer') {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = reject;
            reader.onload = (ev) => resolve(ev.target.result);
            reader[`readAs${method}`](file);
        });
    }

    readAsDataURL(file) {
        return this.readAs(file, 'DataURL');
    }

    readAsArrayBuffer(file) {
        if ('byteLength' in file) {
            return file.buffer || file;
        }
        if ('arrayBuffer' in file) {
            return file.arrayBuffer();
        }
        return this.readAs(file, 'ArrayBuffer');
    }

    async readAsAESCBCBuffer(file) {
        const buffer = await this.readAsArrayBuffer(file);
        const uint8 = new Uint8Array(buffer.byteLength + 15 & -16);
        uint8.set(new Uint8Array(buffer));
        return uint8.buffer;
    }

    readEXIFMetaData(buffer, tag = 'Orientation') {
        if (self.d) {
            console.time('exif');
        }
        const exif = EXIF.readFromArrayBuffer(buffer, true);

        if (self.d) {
            this.debug('readEXIFMetaData', exif);
            console.timeEnd('exif');
        }
        return tag ? exif[tag] : exif;
    }

    dataURLToUint8(url) {
        let [type, data] = String(url).split(',');

        const bp = type.indexOf(';base64');
        if (bp > 0) {
            data = atob(data);
            type = type.substr(0, bp);
        }
        data = Uint8Array.from(data, c => c.charCodeAt(0));
        data.type = type.substr(5);

        return data;
    }

    dataURLToBlob(url) {
        const data = this.dataURLToUint8(url);
        return new Blob([data], {type: data.type});
    }

    createImageData(data, width, height) {
        data = new Uint8ClampedArray(data);
        return new ImageData(data, width, height);
    }

    async createImageBitmap(source) {
        // https://caniuse.com/createimagebitmap

        // @todo https://crbug.com/979890
        // @todo https://bugzilla.mozilla.org/show_bug.cgi?id=1367251

        if (self.supImageBitmap) {
            const bitmap = await createImageBitmap(source)
                .catch(ex => {
                    if (self.d) {
                        this.debug(`Failed to create ImageBitmap from ${source[Symbol.toStringTag]}...`, ex, source);
                    }
                });

            if (bitmap) {
                return bitmap;
            }
        }

        if (source instanceof Blob) {
            if (self.isWorkerScope) {
                // @todo Blob support..
                throw new MEGAException('TBD: Blob Support.', 'NotSupportedError');
            }
            return this.loadImage(source);
        }

        const {ctx} = new MEGACanvasElement(source.width, source.height);
        if (source instanceof ImageData) {
            ctx.putImageData(source, 0, 0);
        }
        else {
            ctx.drawImage(source, 0, 0);
        }

        return ctx.canvas;
    }

    async getRotatedImageData(source) {
        const isBlob = source instanceof Blob;
        const isBuffer = !isBlob && source && source.byteLength > 32;

        if (!(isBlob || isBuffer)) {
            throw new MEGAException('Unable to decode input file.', source);
        }

        let rv = source.orientation;
        const type = source.type || (await this.identify(source)).type;

        if (rv === undefined && type === 'image/jpeg') {
            if (isBlob) {
                source = await this.readAsArrayBuffer(source);
            }
            rv = this.readEXIFMetaData(source, 'Orientation');
        }

        source.type = type;
        return exifImageRotation(source, rv);
    }

    debug(m, ...args) {
        if (!this.pid) {
            this.pid = `${this[Symbol.toStringTag]}:${Math.random().toString(36).slice(-7).toUpperCase()}`;
        }

        return self.dump(`[${this.pid}] ${m}`, ...args);
    }

    assert(expr, message) {
        if (!expr) {
            throw new MEGAException(message || 'Failed assertion.');
        }
    }

    getError() {
        return 0;
    }

    getErrorString(code) {
        return String(code);
    }

    tryCatch(cb, onerror) {
        return (...args) => {
            // eslint-disable-next-line local-rules/hints
            try {
                return cb(...args);
            }
            catch (ex) {
                if (self.d > 1) {
                    console.warn(ex);
                }
                if (onerror) {
                    return onerror(ex);
                }
            }
        };
    }

    get [Symbol.toStringTag]() {
        return 'MEGAImageElement';
    }
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

/**
 * The MEGACanvasElement interface provides a means for drawing graphics via JavaScript and the HTML <canvas> element.
 * Among other things, it can be used for animation, game graphics, data visualization, and photo manipulation.
 * This API largely focuses on 2D graphics.
 * @param {Number} [width] logical pixels (or RGBA values) going across one row of the canvas.
 * @param {Number} [height] logical pixels (or RGBA values) going down one column of the canvas.
 * @param {String} [ctx] the context identifier defining the drawing context associated to the canvas.
 * @param {Object} [options] context attributes for the rendering context.
 */
class MEGACanvasElement extends MEGAImageElement {
    constructor(width = 1, height = 1, ctx = '', options = null) {
        super();
        if (!ctx || typeof ctx === 'object') {
            options = ctx;
            ctx = '2d';
        }

        if (self.supOffscreenCanvas > 1 || self.supOffscreenCanvas && ctx === '2d') {

            this.ctx = this.getRenderingContext(new OffscreenCanvas(width, height), ctx, options);
        }
        else {
            if (typeof document === 'undefined') {
                throw new MEGAException('Out of scope.');
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            this.ctx = this.getRenderingContext(canvas, ctx, options);
        }

        this.faced = null;
        this.bitmaprenderer = null;
        this.renderingContextType = this.ctx && (ctx === 'webgl2' ? 'webgl' : ctx) || null;

        /** @property MEGACanvasElement.engine */
        lazy(this, 'engine', () => {
            let res = 'Unknown';

            if (self.isWorkerScope) {
                res = self.engine;
            }
            else if (self.ua && self.ua.details) {
                res = self.ua.details.engine;
            }
            else if ('mozInnerScreenX' in self) {
                res = 'Gecko';
            }
            else if (self.d) {
                self.dump(`Unknown engine.`);
            }
            return res;
        });
    }

    get [Symbol.toStringTag]() {
        return 'MEGACanvasElement';
    }

    doesSupport(name) {
        return !!(MEGACanvasElement.sup & MEGACanvasElement[`SUPPORT_${String(name).toUpperCase()}`]);
    }

    async resample(source, width, height, type, quality = MEGAImageElement.DEFAULT_QUALITY) {
        this.assert(this.doesSupport('BitmapRenderer'));

        source = await createImageBitmap(source, {resizeWidth: width, resizeHeight: height, resizeQuality: 'high'});

        if (!this.bitmaprenderer) {
            this.bitmaprenderer = new MEGACanvasElement(1, 1, 'bitmaprenderer');
        }
        const {ctx} = this.bitmaprenderer;
        ctx.canvas.width = source.width;
        ctx.canvas.height = source.height;
        ctx.transferFromImageBitmap(source);

        return type ? this.bitmaprenderer.convertTo(type, quality) : ctx;
    }

    viewport(width, height) {
        const {canvas} = this.ctx;

        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }
    }

    getDrawingContext(width, height) {
        this.viewport(width, height);
        return this;
    }

    getRenderingContext(canvas, type, options, rec) {
        let ctx = null;

        if (options && typeof options === 'object') {
            ctx = this.tryCatch(() => canvas.getContext(type, options))();

            if (!ctx && !rec) {
                const opt = {...options};
                delete opt.willReadFrequently;
                return this.getRenderingContext(canvas, type, Object.keys(opt).length && opt, 1);
            }
        }

        return ctx || canvas.getContext(type);
    }

    async getIntrinsicImage(source, maxSize = 2160) {
        if (!exifImageRotation.fromImage) {
            source = await this.getRotatedImageData(source);
        }
        const {width = maxSize, height = maxSize} = await webgl.loadImage(source).catch(nop) || source;

        maxSize = Math.min(maxSize, width, height);
        source = await this.createPreviewImage(source, {type: 'image/png', maxWidth: maxSize, maxHeight: maxSize});

        return source;
    }

    getImageData(sx, sy, sw, sh, flip = true) {
        const {ctx, renderingContextType} = this;

        sx = sx || 0;
        sy = sy || 0;
        sw = sw || ctx.canvas.width;
        sh = sh || ctx.canvas.height;

        if (renderingContextType === '2d') {
            return ctx.getImageData(sx, sy, sw, sh);
        }

        // WebGL context.
        const data = new Uint8Array(sw * sh * 4);
        ctx.readPixels(sx, sy, sw, sh, ctx.RGBA, ctx.UNSIGNED_BYTE, data);

        if (flip) {
            const dw = sw * 4;
            const dh = sh / 2 | 0;
            if (dh > 0) {
                for (let i = 0, t = new Uint8Array(dw); i < dh; ++i) {
                    sx = i * dw;
                    sy = (sh - i - 1) * dw;
                    t.set(data.subarray(sx, sx + dw));
                    data.copyWithin(sx, sy, sy + dw);
                    data.set(t, sy);
                }
            }
        }
        return this.createImageData(data.buffer, sw, sh);
    }

    isTainted(aImageData) {
        const {data, width, height} = aImageData || this.getImageData(0, 0, 0, 0, false);
        let result = true;

        let len = data.byteLength;
        while (len--) {
            if (data[len] && data[len] !== 0xff) {
                result = false;
                break;
            }
        }

        if (!result && width > 7 && data.byteLength > 63) {
            // Detect randomness pattern used by Firefox..
            const fv2 = (v) => Math.floor(v / 4) << 2;
            const u32 = new Uint32Array(data.buffer.slice(0, fv2(data.byteLength)));
            const wl4 = fv2(width);

            const cmp = (i) => {
                let l = wl4;
                let j = l;
                while (!(u32[i] === u32[0] && u32[i + 1] === u32[1]) && --j) {
                    if (u32.length < ++i + l) {
                        return false;
                    }
                }
                while (l--) {
                    if (u32[l] !== u32[i + l]) {
                        return true;
                    }
                }
                return false;
            };

            let solid = true;
            for (let i = width << 3, p = data.length - i, ed = 0; i > 4;) {
                ed += Math.pow(data[i - 4] - data[p], 2)
                    + Math.pow(data[i - 3] - data[p + 1], 2)
                    + Math.pow(data[i - 2] - data[p + 2], 2);

                if (Math.sqrt(ed) > 9) {
                    solid = false;
                    break;
                }

                i -= 4;
                p += 4;
            }

            if (!solid) {

                let i = width;
                while (i < u32.length) {
                    if (cmp(i)) {
                        break;
                    }
                    i += width;
                }

                result = i >= u32.length;
            }
        }

        if (self.d > 2 && result) {
            this.debug('isTainted?', result, width, height, [data], new Uint32Array(data.buffer));

            // webgl.putImageDataIntoTerminal(aImageData);
        }

        return result;
    }

    isTransparent(aImageData) {
        const {data} = aImageData || this.getImageData(0, 0, 0, 0, false);

        for (let i = 0; i < data.byteLength; i += 4) {
            if (data[i + 3] < 0xff) {
                return true;
            }
        }
    }

    async contentAwareCroppingMethod() {
        if (this.faced === null) {
            this.faced = await self.faceDetector.catch(dump);
        }

        return this.faced ? 'FaceDetector' : 'SmartCrop';
    }

    getScaledCropArea(source, sx, sy, sw, sh, maxWidth, maxHeight) {
        const eq = (x, y, s, l) => x / s + y * s > l;
        const sc = (sw, sx, scale, max) => {
            while (scale < 1.0 && eq(sw, sx, scale, max)) {
                scale += 0.01;
            }
            return scale;
        };
        let scale, fscale;

        // @todo simplify & improve ...

        const ratio = Math.min(source.width / maxWidth, source.height / maxHeight);
        if (ratio > 1) {
            maxHeight = maxWidth *= ratio;// Math.max(1, ratio >> 1);
            if (self.d) {
                this.debug('ratio', ratio, {maxWidth, maxHeight}, source.width, source.height);
            }
        }

        if (maxWidth > sw && maxHeight > sh) {
            const cx = maxWidth - sw >> 1;
            const cy = maxHeight - sh >> 1;

            sx = Math.max(sx - cx, 0);
            sw = Math.min(sw + (cx << 1), source.width - sx);
            sy = Math.max(sy - cy, 0);
            sh = Math.min(sh + (cy << 1), source.height - sy);

            if (self.d) {
                this.debug('scale', {sx, sy, sw, sh}, cx, cy);
            }
            scale = 1 / sc(sw, sx, 1 / (sw / maxWidth), source.width);
            fscale = 1 / sc(sh, sy, 1 / (sh / maxHeight), source.height);
        }
        else {
            scale = sc(sw, sx, sw / maxWidth, source.width);
            fscale = sc(sh, sy, sh / maxHeight, source.height);
        }

        sx = ~~(sx * scale);
        sy = ~~(sy * fscale);
        sw = ~~(sw / scale);
        sh = ~~(sh / fscale);

        let tx = sx + sw - source.width;
        if (tx > 0) {
            sx = Math.max(0, sx - tx);
            sw = source.width - sx;
        }

        tx = sy + sh - source.height;
        if (tx > 0) {
            sy = Math.max(0, sy - tx);
            sh = source.height - sy;
        }

        return [sx, sy, sw, sh];
    }

    async alignTargetSize({sw, sh, maxWidth, maxHeight}) {
        this.assert(maxWidth > 0 && maxWidth === maxHeight);

        const mn = Math.min(sw, sh);
        if (mn <= maxWidth) {
            // Original image is smaller than desired crop size
            maxWidth = maxHeight = mn;
        }
        else if (maxWidth > MEGAImageElement.THUMBNAIL_SIZE
            && await this.contentAwareCroppingMethod() === 'SmartCrop') {

            const alignedWidth = mn + 15 & -16;
            let targetSize = Math.min(mn, Math.max(MEGAImageElement.THUMBNAIL_SIZE, alignedWidth >> 1));

            if (!(targetSize & targetSize - 1)) {
                targetSize += 16;
            }

            if (self.d) {
                this.debug(`maxWH of ${maxWidth}px changed to ${targetSize}px for ${sw}x${sh} image.`);
            }

            maxWidth = maxHeight = targetSize;
        }

        return [maxWidth, maxHeight];
    }

    async getCropCoords(source, maxWidth, maxHeight) {

        if (source.width >= maxWidth || source.height >= maxHeight) {
            const method = await this.contentAwareCroppingMethod();

            if (method === 'FaceDetector') {
                const faces = await this.faced.detect(source).catch(dump);

                if (faces && faces.length) {
                    let fx = 0;
                    let sx = Infinity;
                    let sy = Infinity;
                    let sw = -Infinity;
                    let sh = -Infinity;
                    const ds = (face) => Math.min(face.width, face.height) >> 1;

                    for (let i = faces.length; i--;) {
                        const face = faces[i].boundingBox;

                        if (face) {
                            fx = Math.max(fx, ds(face));
                        }
                    }

                    for (let i = faces.length; i--;) {
                        const face = faces[i].boundingBox;

                        if (face && ds(face) >= fx) {
                            sy = Math.min(sy, face.top);
                            sx = Math.min(sx, face.left);
                            sw = Math.max(sw, face.right);
                            sh = Math.max(sh, face.bottom);
                        }
                    }

                    if (self.d) {
                        this.debug('FACEdS', faces, {sx, sy, sw, sh}, source);
                    }

                    if (sx | sy | sw | sh) {
                        [sx, sy, sw, sh] =
                            this.getScaledCropArea(source, sx, sy, sw - sx, sh - sy, maxWidth, maxHeight);

                        if (self.d) {
                            this.debug('FACEdSr', {sx, sy, sw, sh});
                        }
                        return {sx, sy, sw, sh};
                    }
                }
            }

            const {topCrop} = await SmartCrop.crop(source, {
                ...MEGACanvasElement.SMARTCROP_OPTIONS,
                width: maxWidth, height: maxHeight
            });

            return {sx: topCrop.x, sy: topCrop.y, sw: topCrop.width, sh: topCrop.height};
        }

        return {
            dw: maxWidth,
            dh: maxHeight,
            dx: maxWidth - source.width >> 1,
            dy: maxHeight - source.height >> 1
        };
    }

    async getCropRect({source, crop, maxRatio, maxWidth, maxHeight, dest, ats}) {
        const {width, height} = source;

        let sx = 0;
        let sy = 0;
        let sw = width;
        let sh = height;
        const ratio = Math.max(sw / sh, sh / sw);

        if (crop === 'guess') {
            crop = false;

            if (sw > maxWidth && ratio > MEGAImageElement.ASPECT_RATIO_16_9) {
                maxRatio = MEGAImageElement.ASPECT_RATIO_16_9;
            }
        }

        if (maxRatio && ratio > maxRatio) {
            if (sw > sh) {
                sw = ~~(sh * maxRatio);
            }
            else {
                sh = ~~(sw * maxRatio);
            }
            sx = width - sw >> 2;
            sy = height - sh >> 2;
        }

        if (crop === 'center') {
            sw = Math.round(sw / ratio);
            sh = Math.round(sh / ratio);
            sx = width - sw >> 1;
            sy = height - sh >> 1;
        }
        else if (crop === 'smart') {
            maxWidth = maxWidth || sw;
            maxHeight = maxHeight || sh;

            ats = ats || sw < maxWidth && sh < maxHeight;

            // @todo deprecate the following at the earliest convenience.
            // i.e. those are experiments to make the on-the-fly cropping in line with current live-site thumbnails.
            const thumbnail = maxWidth === maxHeight && ats > 0;

            if (thumbnail) {
                [maxWidth, maxHeight] = await this.alignTargetSize({sw, sh, maxWidth, maxHeight});

                dest.maxWidth = maxWidth;
                dest.maxHeight = maxHeight;
            }
            return this.getCropCoords(source, maxWidth, maxHeight);
        }

        return {sx, sy, sw, sh};
    }

    async getBoundingRect({source, maxWidth, maxHeight, ...options}) {
        const dest = {};
        let {sx, sy, sw, sh, dx, dy, dw, dh}
            = await this.getCropRect({source, maxWidth, maxHeight, ...options, dest});

        maxWidth = dest.maxWidth || maxWidth;
        maxHeight = dest.maxHeight || maxHeight;

        if (dw === undefined) {
            dw = sw;
        }
        if (dh === undefined) {
            dh = sh;
        }

        return this.getBoundingBox({sx, sy, sw, sh, dx, dy, dw, dh, maxWidth, maxHeight, ...options});
    }

    getBoundingBox({sx, sy, sw, sh, dx, dy, dw, dh, maxWidth, maxHeight, minWidth, minHeight, allowUpScale}) {

        if (maxWidth && sw > maxWidth) {
            dh = Math.round(sh * maxWidth / sw);
            dw = maxWidth;
        }
        else if (maxHeight && sh > maxHeight) {
            dw = Math.round(sw * maxHeight / sh);
            dh = maxHeight;
        }

        if (minWidth && dw < minWidth && (allowUpScale || sw > minWidth)) {
            dw = minWidth;
            dh = Math.round(dw * sh / sw);
        }
        else if (minHeight && dh < minHeight && (allowUpScale || sh > minHeight)) {
            dh = minHeight;
            dw = Math.round(dh * sw / sh);
        }

        return {sx, sy, sw, sh, dx, dy, dw, dh};
    }

    async createThumbnailImage(source, options = false) {
        const defSize = MEGAImageElement.THUMBNAIL_SIZE;
        const defQuality = MEGAImageElement.THUMBNAIL_QUALITY;
        const {maxWidth = defSize, maxHeight = defSize, quality = defQuality} = options;

        options = {crop: 'smart', type: 'thumb', quality, maxWidth, maxHeight, ...options};
        return this.createPreviewImage(source, options);
    }

    async createPreviewImage(source, options = false) {
        const defSize = MEGAImageElement.PREVIEW_SIZE;
        const defType = MEGAImageElement.PREVIEW_TYPE;
        const defQuality = MEGAImageElement.PREVIEW_QUALITY;
        const {
            crop = 'none',
            type = defType,
            maxWidth = defSize,
            maxHeight = defSize,
            quality = defQuality
        } = options;

        source = await this.getCanvasImageSource(source);
        const {sx, sy, sw, sh, dx, dy, dw, dh} =
            await this.getBoundingRect({crop, source, maxWidth, maxHeight, ...options});

        /** @todo https://crbug.com/1082451
        const {width, height} = image;
        if (!(sx | sy) && sw === width && sh === height
            && (this.bitmaprenderer || this.doesSupport('BitmapRenderer'))) {

            if (self.d > 1) {
                dump(
                    `Creating ${dw}x${dh} image using high-quality bitmap resizer.`,
                    {sx, sy, sw, sh}, {dx, dy, dw, dh}, source
                );
            }
            return this.resample(image, dw, dh, type, quality);
        }
        else*/ if (self.d > 1) {
            this.debug(
                `Creating ${dw}x${dh} image using ${this.renderingContextType}...`,
                {sx, sy, sw, sh}, {dx, dy, dw, dh}, source
            );
        }

        return this.drawImage(source, sx, sy, sw, sh, dx | 0, dy | 0, dw, dh, type, quality);
    }

    clearRect(sx, sy, sw, sh) {
        this.viewport(sw, sh, sx, sy);
        this.ctx.clearRect(0, 0, sw, sh);
    }

    drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh, type, quality = MEGAImageElement.DEFAULT_QUALITY) {
        if (typeof sw === 'string') {
            dx = sw;
            dy = sh;
            sw = sh = undefined;
        }
        if (typeof dx === 'string') {
            type = dx;
            quality = dy || quality;
            dx = dy = dw = dh = undefined;
        }
        else if (typeof dw === 'string') {
            type = dw;
            quality = dh || quality;
            dw = dh = undefined;
        }

        if (sx === undefined) {
            sx = 0;
        }
        if (sy === undefined) {
            sy = 0;
        }
        if (dx === undefined) {
            dx = sx;
            sx = 0;
        }
        if (dy === undefined) {
            dy = sy;
            sy = 0;
        }
        if (sw === undefined) {
            sw = image.width;
        }
        if (sh === undefined) {
            sh = image.height;
        }
        if (dw === undefined) {
            dw = sw;
            sw = image.width;
        }
        if (dh === undefined) {
            dh = sh;
            sh = image.height;
        }

        return this._drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh, type, quality)
            .catch((ex) => {

                if (this instanceof WebGLMEGAContext) {
                    if (self.d) {
                        const error = typeof ex === 'number' ? `${this.getErrorString(ex)} (${ex})` : ex;

                        this.debug(`WebGL Error: ${error}, trying to fall back to canvas...`);
                    }

                    type = type === 'thumb' ? 'broken' : type;
                    return new MEGACanvasElement()._drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh, type, quality);
                }

                throw ex;
            });
    }

    async _drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh, type, quality = MEGAImageElement.DEFAULT_QUALITY) {
        this.clearRect(0, 0, dw, dh);
        this.ctx.drawImage(image, sx, sy, sw, sh, dx, dy, Math.min(sw, dw), Math.min(sh, dh));
        return type && this.convertTo(type, quality);
    }

    putImageDataIntoTerminal(aImageData) {
        const {width, height, data} = aImageData;
        const len = data.byteLength;
        const line = Array(width + 1).join("%c\u25a0");
        const rows = Array(height).join('!').split('!').map(() => line);
        const colors = [];

        const to16 = (v) => v.toString(16).padStart(2, '0');
        const rgba = (p, i) => to16(p[i]) + to16(p[i + 1]) + to16(p[i + 2]) + to16(p[i + 3]);

        let i = 0;
        while (len > i) {
            colors.push(`color:#${rgba(data, i)}`);
            i += 4;
        }
        console.info(`\n${rows.join('\n')}`, ...colors);
    }

    async convertTo(type, quality) {
        if (type === 'imaged') {
            return this.getImageData();
        }
        if (type === 'terminal') {
            return this.putImageDataIntoTerminal(this.getImageData());
        }
        const {canvas} = this.ctx;
        const typed = [quality, MEGAImageElement.DEFAULT_QUALITY];

        if (type === 'buffer') {
            return this.convertToArrayBuffer(...typed);
        }

        if (type === 'bitmap') {
            if ('transferToImageBitmap' in canvas) {
                return canvas.transferToImageBitmap();
            }
            return this.createImageBitmap(this.getImageData());
        }

        if (type === 'dataurl') {
            if ('toDataURL' in canvas) {
                return canvas.toDataURL(...typed);
            }
            return this.convertToDataURL(...typed);
        }

        const data = this.getImageData(0, 0, 0, 0, false);
        if (this.isTainted(data)) {
            throw new MEGAException('The image is tainted!', {data, ctx: this}, 'SecurityError');
        }

        if (type === 'broken') {
            type = MEGAImageElement.THUMBNAIL_TYPE;
        }
        else if (type === 'thumb') {
            type = this.isTransparent(data) ? MEGAImageElement.ALPHA_FORMAT : MEGAImageElement.THUMBNAIL_TYPE;
        }
        const blob = await this.convertToBlob(type, quality);

        if (this.engine === 'Gecko' && !this.postTaintedChecked) {
            const t = this.isTainted(await this.createImage(blob, 0, 0, 'imaged'));
            if (t) {
                throw new MEGAException('The image is tainted', this, 'SecurityError');
            }
            this.postTaintedChecked = 1;
        }

        return blob;
    }

    convertToBlob(type, quality) {
        const {canvas} = this.ctx;

        if (typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas) {
            return canvas.convertToBlob({type, quality});
        }

        return new Promise((resolve) => {
            canvas.toBlob(resolve, type, quality);
        });
    }

    convertToArrayBuffer(type, quality) {
        return this.convertToBlob(type, quality).then(blob => this.readAsArrayBuffer(blob));
    }

    convertToDataURL(type, quality) {
        return this.convertToBlob(type, quality).then(blob => this.readAsDataURL(blob));
    }

    async getCanvasImageSource(data) {

        if (typeof data === 'string') {
            data = await this.loadImage(data);
        }

        if (typeof data === 'object') {
            if (data instanceof Blob) {
                const {format} = await this.identify(data).catch(echo);

                if (format === 'TIFF' || format === 'UNK') {
                    if (self.d) {
                        this.debug(`Attempting to decode RAW image...`, format);
                    }
                    const image = this.decodeRAWImage('raw', await this.readAsArrayBuffer(data)).data;

                    if (image) {
                        data = image instanceof ImageData ? image : await this.loadImage(image);
                    }
                }
            }
            else if ('byteLength' in data) {
                data = await this.loadImage(data);
            }

            if (data instanceof ImageData || data instanceof Blob) {
                data = await this.createImageBitmap(data);
            }
        }

        return data;
    }

    async createPattern(image, repetition) {
        const source = await this.getCanvasImageSource(image);

        // Safari may unexpectedly throw a mysterious 'Type error', e.g., by providing an ImageBitmap
        // eslint-disable-next-line local-rules/hints -- @todo https://bugs.webkit.org/show_bug.cgi?id=149986
        try {
            return this.ctx.createPattern(source, repetition);
        }
        catch (ex) {
            if (!self.supImageBitmap || !(source instanceof ImageBitmap)) {

                this.debug('Unexpected createPattern() failure...', ex);
            }
            else {
                image = await this.createImage(source);
                return this.ctx.createPattern(await this.loadImage(image), repetition);
            }

            throw ex;
        }
    }

    async createImage(data, width = 27, height = 31, type = 'image/webp', quality = 1) {
        if (data === 'pattern') {
            const patterns = [];
            const bw = width / 4 | 0;
            const bh = height / 4 | 0;
            const canvas = new MEGACanvasElement(width, height);
            const safari = window.safari && new Uint32Array(width * height);
            for (let x = bw; x--;) {
                let source = this.createImageData(mega.getRandomValues(4), 1, 1);
                if (safari) {
                    safari.fill(new Uint32Array(source.data.buffer)[0]);
                    source = this.createImageData(safari.buffer, width, height);
                }

                const pattern = await canvas.createPattern(source, 'repeat').catch(nop);
                if (pattern && patterns.push(pattern) > 15) {
                    break;
                }
            }
            const n = patterns.length >> 2;
            for (let x = n, sy = 0; x--;) {
                for (let i = n, sx = 0; i--;) {
                    canvas.ctx.fillStyle = patterns.pop();
                    canvas.ctx.fillRect(sx, sy, bw, bh);
                    sx += bw;
                }
                sy += bh;
            }
            data = canvas.ctx.getImageData(0, 0, width, height);
        }
        else if (typeof data === 'number') {
            const pixel = (data < 0x100 ? data << 24 | data >> 4 << 16 | (data & 15) << 8 | 0xff : data) >>> 0;
            data = new Uint32Array(width * height).fill(pixel);
            data = this.createImageData(data.buffer, width, height);
            if (self.d > 1) {
                this.debug('createImage, %s (0x%s)', pixel >>> 0, pixel.toString(16), pixel >>> 16, data);
            }
        }
        else if (!data) {
            const size = 0xffff;
            const length = width * height * 4;
            const buffer = new Uint8ClampedArray(length);
            for (let offset = 0; offset < length; offset += size) {
                buffer.set(mega.getRandomValues(Math.min(length - offset, size)), offset);
            }
            data = new ImageData(buffer, width, height);
        }
        data = await this.getCanvasImageSource(data);

        width = data.width || width;
        height = data.height || height;
        if (type === 'terminal') {
            const ratio = Math.min(208 / width, 176 / height);
            if (ratio < 1) {
                width *= ratio;
                height *= ratio;
            }
        }
        return this.drawImage(data, 0, 0, width, height, type, quality);
    }
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

/**
 * The WebGLMEGAContext interface provides a means for drawing graphics via WebGL2 (Web Graphics Library)
 * This API conforms to OpenGL ES 3.0 that can be used in HTML5 <canvas> elements for rendering high-performance
 * interactive 3D and 2D graphics within any compatible web browser without the use of plug-ins.
 * This conformance makes it possible to take advantage of hardware graphics acceleration provided by the user's device.
 * @param {Number} [width] logical pixels (or RGBA values) going across one row of the canvas.
 * @param {Number} [height] logical pixels (or RGBA values) going down one column of the canvas.
 * @param {Object} [options] context attributes for the rendering context.
 */
class WebGLMEGAContext extends MEGACanvasElement {
    constructor(width = 1, height = 1, options = null) {
        super(width, height, 'webgl2', {
            ...WebGLMEGAContext.DEFAULT_OPTIONS,
            ...options
        });

        const gl = this.ctx;
        if (gl) {
            this.setupWebGLContext(gl);
        }
    }

    get [Symbol.toStringTag]() {
        return 'WebGLMEGAContext';
    }

    setupWebGLContext(gl) {
        const {canvas} = gl;

        if (self.d > 1) {
            this.debug('Setting up new WebGL context...', [this]);
        }

        this.onContextLost = tryCatch((ev) => {
            ev.preventDefault();

            this.cleanup();
            this.didLoseContext = true;
            this.debug('context lost.');

            setTimeout(() => this.restoreContext(), 300);
        });

        this.onContextRestore = tryCatch(() => {
            this.debug('context restored.');

            this.initWebGLContext(gl);
        });

        canvas.addEventListener('webglcontextlost', this.onContextLost, false);
        canvas.addEventListener('webglcontextrestored', this.onContextRestore, false);

        this.glLoseExtension = gl.getExtension('WEBGL_lose_context');

        return this.initWebGLContext(gl);
    }

    initWebGLContext(gl) {
        this.didLoseContext = false;

        if ((this.program = this.createProgram(gl))) {
            this.loc = {
                position: gl.getAttribLocation(this.program, "a_position"),
                texcoord: gl.getAttribLocation(this.program, "a_texcoord"),
                resolution: gl.getUniformLocation(this.program, "u_resolution")
            };
            this.createTexture(gl);
        }

        this.gl = gl;
        this.ready = false;
    }

    restoreContext() {
        if (this.glLoseExtension && this.gl && this.gl.isContextLost()) {

            this.glLoseExtension.restoreContext();
        }
    }

    cleanup() {
        if (this.program) {
            if (this.gl) {
                this.gl.deleteProgram(this.program);
            }
            this.program = null;
        }
        this.ready = false;
    }

    getDrawingContext(width, height) {
        let ctx = this.ctx && this;
        if (!ctx || ctx.gl.isContextLost()) {
            // WebGL2 is not available.
            ctx = new MEGACanvasElement(width, height, '2d');
        }
        ctx.viewport(width, height);
        return ctx;
    }

    attachShader(gl, program, type, source) {
        const shader = gl.createShader(type);

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        gl.attachShader(program, shader);
    }

    createProgram(gl) {
        const program = gl.createProgram();

        const vertexSource = `
            attribute vec2 a_position;
            attribute vec2 a_texcoord;
            uniform vec2 u_resolution;
            varying vec2 v_texcoord;
            void main(void) {
              gl_Position = vec4((((a_position / u_resolution) * 2.0) - 1.0) * vec2(1, -1), 0.0, 1.0);
              v_texcoord = a_texcoord;
            }`;

        const fragmentSource = `
            precision highp float;
            varying vec2 v_texcoord;
            uniform sampler2D u_texture;
            void main(void) {
              gl_FragColor = texture2D(u_texture, v_texcoord);
            }`;

        this.attachShader(gl, program, gl.VERTEX_SHADER, vertexSource);
        this.attachShader(gl, program, gl.FRAGMENT_SHADER, fragmentSource);

        gl.linkProgram(program);
        gl.validateProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            this.debug('Error linking program.', gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
            return null;
        }

        return program;
    }

    createBuffer(gl, data, usage) {
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, data, usage || gl.STATIC_DRAW);
        return buf;
    }

    enableVertexAttrib(gl, index, data) {
        const buf = this.createBuffer(gl, data);
        gl.enableVertexAttribArray(index);
        gl.vertexAttribPointer(index, 2, gl.FLOAT, false, 0, 0);
        return buf;
    }

    bindBuffers(gl, image, sx, sy, sw, sh, dx, dy, dw, dh) {
        const {position, texcoord, resolution} = this.loc;

        const u0 = sx / image.width;
        const v0 = sy / image.height;
        const u1 = (sx + sw) / image.width;
        const v1 = (sy + sh) / image.height;

        const tex = this.enableVertexAttrib(
            gl, texcoord, new Float32Array([u0, v0, u1, v0, u0, v1, u0, v1, u1, v0, u1, v1])
        );

        const x1 = dx;
        const x2 = dx + dw;
        const y1 = dy;
        const y2 = dy + dh;

        const pos = this.enableVertexAttrib(
            gl, position, new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2])
        );

        gl.uniform2f(resolution, gl.drawingBufferWidth, gl.drawingBufferHeight);

        return [tex, pos];
    }

    createTexture(gl) {
        // gl.getExtension('OES_texture_float');
        // gl.getExtension('OES_texture_float_linear');

        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);

        // const ext = gl.getExtension('EXT_texture_filter_anisotropic');
        // if (ext) {
        //     const max = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
        //     gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, max);
        //     console.info('Anisotropic filtering enabled', max);
        // }

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

        // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

        // gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        // gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    }

    viewport(width, height, sx = 0, sy = 0) {
        super.viewport(width, height);
        this.gl.viewport(sx, sy, width, height);
    }

    getError() {
        const rc = this.gl.getError();
        const LOST = WebGL2RenderingContext.CONTEXT_LOST_WEBGL;

        if (rc === LOST && !this.didLoseContext) {
            this.didLoseContext = true;
            queueMicrotask(() => this.cleanup());
        }

        return rc || this.didLoseContext && LOST;
    }

    getErrorString(code) {
        if (!WebGLMEGAContext.glContextErrorMap) {
            WebGLMEGAContext.glContextErrorMap = Object.keys(WebGL2RenderingContext)
                .reduce((o, p) => {
                    const n = WebGL2RenderingContext[p];
                    if (typeof n === 'number') {
                        o[n] = p;
                    }
                    return o;
                }, Object.create(null));
        }
        return WebGLMEGAContext.glContextErrorMap[code | 0] || 'Unknown error';
    }

    clearRect(sx, sy, sw, sh) {
        const {gl} = this;
        this.viewport(sw, sh, sx, sy);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    async _drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh, type, quality = MEGAImageElement.DEFAULT_QUALITY) {
        const {gl, program, ready} = this;
        if (!ready) {
            if (!program) {
                throw new MEGAException('WebGL2 cannot be used.');
            }
            this.ready = true;
            gl.useProgram(program);
        }

        this.clearRect(0, 0, dw, dh);
        const [b1, b2] = this.bindBuffers(gl, image, sx, sy, sw, sh, dx, dy, Math.min(sw, dw), Math.min(sh, dh));

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.flush();

        let error = this.getError();
        let result = false;

        if (!error && type) {
            result = await this.convertTo(type, quality)
                .catch((ex) => {
                    error = ex;
                });
        }

        gl.deleteBuffer(b1);
        gl.deleteBuffer(b2);

        if (error) {
            throw error;
        }

        return result;
    }
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

/**
 * The MEGAWorker interface implements a pool of Web Workers that does represents background tasks.
 * @param {String|Function|Blob} url Web Worker resource.
 * @param {Number} [size] Maximum number of concurrent Web Workers.
 * @param {*} [hello] Initial payload to send to newly created workers.
 * @param {Number} [jpw] Maximum number of concurrent jobs per Worker.
 */
class MEGAWorker extends Array {
    constructor(url, size = 2, hello = false, jpw = 4) {
        super();

        if (typeof url === 'function') {
            url = new Blob([`(${url})()`], {type: 'text/javascript'});
        }

        if (url instanceof Blob) {
            url = URL.createObjectURL(url);
        }

        if (!url.startsWith('blob:')) {
            let [base, params] = url.split('?');

            if (self.is_karma) {
                params = `${params ? '&' : ''}karma=1`;
            }
            url = `${base}?wk=${MEGAWorker.VERSION}&${params || ''}`;
            if (!url.includes('//')) {
                url = `${MEGAWorker.wBasePath}${url}`;
            }
        }

        Object.defineProperty(this, 'url', {value: url});
        Object.defineProperty(this, 'size', {value: size});
        Object.defineProperty(this, 'pending', {value: []});
        Object.defineProperty(this, 'hello', {value: hello});
        Object.defineProperty(this, 'maxWkJobs', {value: jpw});
        Object.defineProperty(this, 'running', {value: new Map()});
        Object.defineProperty(this, '__ident_0', {value: `mWorker.${makeUUID()}`});

        Object.defineProperty(this, 'wkErrorHandler', {
            value: (ev) => {
                const error = ev.error || ev.message || ev || 'unknown';

                if (String(error).includes('throw-test')) {
                    return this.dispatch({token: ev.token, error: ev.payload});
                }

                if (!self.is_karma || self.d > 1) {
                    console.error('FATAL Error in MEGAWorker SubSystem!', error, [this]);
                }

                this.kill(error, ev.payloads, true);
            }
        });

        Object.defineProperty(this, 'wkMessageHandler', {
            value: ({data}) => {

                if (data.error) {
                    return this.wkErrorHandler(data);
                }

                this.dispatch(data);
            }
        });

        Object.defineProperty(this, 'wkCompletedJobs', {writable: true, value: 0});
        Object.defineProperty(this, 'wkDisposalThreshold', {writable: true, value: 0});
    }

    get [Symbol.toStringTag]() {
        return 'MEGAWorker';
    }

    get busy() {
        return this.running.size || this.pending.length;
    }

    get stats() {
        const res = [
            this.running.size,
            this.pending.length,
            this.wkCompletedJobs,
            this.wkDisposalThreshold,
            Object.isFrozen(this) | 0
        ];

        for (let i = this.length; i--;) {
            const {wkc, jobs} = this[i];

            res.push([wkc, jobs]);
        }

        return res;
    }

    kill(error, payloads, freeze) {
        const pending = [...this.running.values(), ...this.pending];

        this.running.clear();
        this.pending.length = 0;

        for (let i = pending.length; i--;) {
            const {token, reject} = pending[i];
            const payload = payloads && payloads[token];

            reject({error, payload});
        }

        for (let i = this.length; i--;) {
            const worker = this[i];
            worker.jobs = NaN;
            worker.onerror = worker.onmessage = null;
            this.wkCompletedJobs += worker.wkc;
            worker.terminate();
        }
        this.length = 0;

        if (freeze) {
            Object.defineProperty(this, 'queue', {value: () => Promise.reject('unstable')});
            Object.freeze(this);
        }
    }

    attachNewWorker() {
        const worker = new Worker(this.url);
        worker.wkc = 0;
        worker.jobs = 0;
        worker.onerror = this.wkErrorHandler;
        worker.onmessage = this.wkMessageHandler;
        if (this.hello) {
            worker.postMessage({token: 'init', command: 'hello', payload: this.hello});
        }
        return this.push(worker) - 1;
    }

    dispose() {
        delay(this.__ident_0, () => {
            if (this.length > 2 && !this.busy) {
                if (d) {
                    dump('Terminating worker pool...', this);
                }
                this.kill();
            }
        }, 450 + -Math.log(Math.random()) * ++this.wkDisposalThreshold);
    }

    dispatch({token, result, error}) {
        if (this.running.has(token)) {
            const {worker, resolve, reject} = this.running.get(token);

            worker.wkc++;
            worker.jobs--;
            this.running.delete(token);

            while (this.pending.length) {
                if (this.post(worker, this.pending.pop())) {
                    break;
                }
            }

            if (!this.running.size) {
                this.dispose();
            }

            if (!error && (self.d || self.is_karma)) {
                // just to identify the work comes from a worker.
                result.token = token;
            }
            return error ? reject(error) : resolve(result);
        }
        else if (this.pending.length) {
            const {resolve, reject, command, payload} = this.pending.pop();
            this.queue(command, payload).then(resolve).catch(reject);
        }

        if (self.d && token !== 'init') {
            console.error('No worker running with token %s', token, error || result);
        }
    }

    post(worker, {resolve, reject, command, payload}) {
        return tryCatch(() => {
            const token = makeUUID();
            const t = MEGAWorker.getTransferable(payload);

            worker.postMessage({token, command, payload}, t);
            this.running.set(token, {token, worker, resolve, reject});
            return ++worker.jobs;
        }, reject)();
    }

    queue(command, payload) {
        return new Promise((resolve, reject) => {
            let idx = this.length;
            while (idx--) {
                if (this[idx].jobs < this.maxWkJobs) {
                    break;
                }
            }

            if (idx < 0 && this.size > this.length) {
                idx = this.attachNewWorker();
            }

            const worker = this[idx];
            if (worker) {
                this.post(worker, {resolve, reject, command, payload});
            }
            else {
                // All workers are busy.
                this.pending.push({command, payload, resolve, reject});
            }
        });
    }
}

Object.defineProperties(MEGAWorker, {
    VERSION: {value: 1},
    wBasePath: {
        get() {
            return self.is_karma ? 'base/' : self.is_extension ? '' : '/';
        }
    },
    isTransferable: {
        value: (data) => {
            data = data && data.buffer || data;
            return (data instanceof ArrayBuffer
                || typeof ImageBitmap !== 'undefined' && data instanceof ImageBitmap
                || typeof OffscreenCanvas !== 'undefined' && data instanceof OffscreenCanvas) && data;
        }
    },
    getTransferable: {
        value: (payload, refs = new WeakSet()) => {
            const transferable = [];

            if (payload) {
                const nonIterable = typeof payload !== 'object'
                    || payload instanceof Blob || 'BYTES_PER_ELEMENT' in payload || 'width' in payload;
                const add = (v) => transferable.includes(v) || transferable.push(v);

                if (nonIterable) {
                    payload = [payload];
                }
                else if (refs.has(payload)) {
                    return false;
                }
                else {
                    refs.add(payload);
                }

                const keys = Object.keys(payload);
                for (let i = keys.length; i--;) {
                    const value = payload[keys[i]];

                    if (value) {
                        const nt = !nonIterable && MEGAWorker.getTransferable(value, refs);

                        if (nt.length) {
                            for (let i = nt.length; i--;) {
                                add(nt[i]);
                            }
                        }
                        else {
                            const data = MEGAWorker.isTransferable(value.buffer || value.data || value);

                            if (data) {
                                add(data);
                            }
                        }
                    }
                }
            }
            return transferable;
        }
    }
});

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

/**
 * Cancellable wrapper around MEGAWorker and WebGL/Canvas Utilities.
 * @param {Function} aMessageHandler Worker message handler.
 * @param {Object} [aHello] If Worker() is supported, the initial payload to send them.
 * @param {Object} [options] Additional optinal options.
 */
class MEGAWorkerController {
    constructor(aMessageHandler, aHello = null, options = false) {
        Object.defineProperty(this, 'hello', {value: aHello});
        Object.defineProperty(this, 'branches', {value: Object.create(null)});
        Object.defineProperty(this, 'syncMessageHandler', {value: aMessageHandler});
        Object.defineProperty(this, 'syncQueue', {value: []});

        this.syncPending = 0;
        this.branches.main = false;

        const defOptions = {
            syncMethod: 'pop', // LIFO
            syncConcurrency: 1
        };
        Object.defineProperty(this, 'options', {
            value: Object.assign(defOptions, options)
        });
        Object.setPrototypeOf(this.options, null);

        Object.defineProperty(this, 'handler', {
            value: typeof aHello === 'object' ? this._workerHandler : this._syncHandler
        });
    }

    async attach() {
        const name = makeUUID();
        this.branches[name] = null;
        return name;
    }

    async detach(branch = 'main') {
        MEGAException.assert(branch in this.branches, `Unknown branch ${branch}.`);
        MEGAException.assert(branch !== 'main', 'You cannot detach the main branch.');

        const abortError = new MEGAException('Aborted.', 'AbortError');

        if (this.branches[branch]) {
            MEGAException.assert(this.branches[branch] instanceof MEGAWorker);
            this.branches[branch].kill(abortError, null, true);
        }
        delete this.branches[branch];

        branch += '.sync';
        for (let i = this.syncQueue.length; i--;) {
            const {branch: bch, reject} = this.syncQueue[i];

            if (branch === bch) {
                reject(abortError);
                this.syncQueue.splice(i, 1);
            }
        }
        delete this.branches[branch];
    }

    _syncDispatcher() {
        if (this.syncQueue.length && this.syncPending < this.options.syncConcurrency) {
            const {resolve, reject, command, payload} = this.syncQueue[this.options.syncMethod]();

            this.syncPending++;
            this.syncMessageHandler({data: {command, payload}})
                .then(res => this.catchFailure(res, true))
                .then(resolve)
                .catch(reject)
                .finally(() => {
                    this.syncPending--;
                    onIdle(() => this._syncDispatcher());
                });
        }
    }

    _syncHandler(command, payload, branch = 'main') {
        return new Promise((resolve, reject) => {
            if (!(branch in this.branches)) {
                return reject(new MEGAException(`Unknown branch ${branch}.`));
            }
            branch += '.sync';

            this.branches[branch] = this.syncQueue.push({resolve, reject, command, payload, branch});
            this._syncDispatcher();
        });
    }

    async _workerHandler(command, payload, branch = 'main') {
        MEGAException.assert(branch in this.branches, `Unknown branch ${branch}.`);

        if (!this.worker) {
            await this.workerURL();
        }
        if (!this.branches[branch]) {
            this.branches[branch] = new MEGAWorker(this.worker, 4, this.hello);
        }

        let result = await this.branches[branch].queue(command, payload).catch(echo);
        if (result === 'unstable') {
            this.branches[branch] = result = null;
        }
        if (!this.catchFailure(result)) {
            if (self.d) {
                dump('Worker failed, falling back to main thread..', command, result);
            }
            payload = result && result.payload || payload;
            result = await this._syncHandler(command, payload, branch);
        }

        return result;
    }

    async workerURL() {
        await Promise.resolve(M.require('webgl')).catch(dump);

        if (!this.worker) {
            let url = 'js/utils/webgl.js';
            if (self.sbj5rsc_webgl) {
                url = mObjectURL([`(() => {exports=self;${self.sbj5rsc_webgl}})()`], 'text/javascript');
            }
            Object.defineProperty(this, 'worker', {value: url});
        }

        return this.worker;
    }

    catchFailure(res, fail) {
        if (!res || res instanceof Error || res.error) {
            const name = res && res.error && res.error.name;

            if (self.d && res) {
                dump(`${res.error || res}`);
            }

            if (fail || name === 'SecurityError' || name === 'AbortError') {
                throw res && res.error || res || new Error('NULL');
            }
            return false;
        }
        return res;
    }
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// @todo remove
if (typeof zSleep === 'undefined') {
    zSleep = () => new Promise(onIdle);
}

WebGLMEGAContext.test = async(...files) => {
    const canvas = new MEGACanvasElement();
    const now = Date.now();
    const promises = [];

    console.time('webgl-bulk-test');

    for (let i = 0; i < files.length; ++i) {
        const file = files[i];

        if (now) {
            // promises.push(webgl.worker('scissor', file).then(({preview, thumbnail}) => [file, thumbnail, preview]));
            promises.push(webgl.worker('thumbnail', file).then((blob) => [file, blob]));
            continue;
        }

        await zSleep();
        console.time(`c2d-${file.name}`);
        file.c2dResult = await canvas.createPreviewImage(file);
        console.timeEnd(`c2d-${file.name}`);

        await zSleep();
        console.time(`webgl-${file.name}`);
        file.webglResult = await webgl.createPreviewImage(file);
        console.timeEnd(`webgl-${file.name}`);

        const name = file.name.slice(0, 32);
        M.saveAs(file.c2dResult, `${now}.${name}-2d.jpg`);
        M.saveAs(file.webglResult, `${now}.${name}-webgl.jpg`);
    }

    if (promises.length) {
        const res = await Promise.allSettled(promises);
        for (let i = res.length; i--;) {
            if (res[i].reason) {
                console.error(res[i].reason);
                continue;
            }
            const [file, thumbnail, preview] = res[i].value;
            if (preview) {
                M.saveAs(preview, `${now}-preview-${file.name}`);
            }
            M.saveAs(thumbnail, `${now}-thumbnail-${file.name}`);
        }
    }
    console.timeEnd('webgl-bulk-test');

    if (files.length && files[0].webglResult) {
        dump(webgl.ctx.getContextAttributes());
        await webgl.createImage(files[0].webglResult, 0, 0, 'terminal');
    }
    console.log(files);
};

if (self.isWorkerScope) {
    self.tryCatch = MEGAImageElement.prototype.tryCatch;
}

/** @property self.isWebGLSupported */
lazy(self, 'isWebGLSupported', () => {
    let result = false;
    if (typeof WebGL2RenderingContext !== 'undefined') {
        tryCatch(() => {
            const {ctx} = new MEGACanvasElement(1, 1, 'webgl2', {antialias: true});

            if (ctx instanceof WebGL2RenderingContext) {

                if (typeof ctx.getContextAttributes === 'function') {
                    result = ctx.getContextAttributes().antialias === true;
                }

                tryCatch(() => {
                    const glCtx = ctx.getExtension('WEBGL_lose_context');
                    if (glCtx) {
                        glCtx.loseContext();
                    }
                })();
            }
        })();
    }
    return result;
});

/** @property self.faceDetector */
lazy(self, 'faceDetector', () => Promise.resolve((async() => {
    const fd = 'FaceDetector' in self && new FaceDetector();
    const ex = fd && await fd.detect(new MEGACanvasElement().ctx.canvas).catch(echo);
    return !ex || ex.name !== 'NotSupportedError' ? fd : false;
})()));

((self) => {
    'use strict';
    let waiter = false;
    const stats = [[]];
    const debug = self.d > 0 ? self.d : self.is_karma || self.location.host !== 'mega.nz';

    const dump = (() => {
        if (!self.isWorkerScope) {
            return (m, ...a) => console.warn(`[webgl] ${m}`, ...a);
        }
        const pid = `${Math.random().toString(26).slice(-6)}-${self.location.href.split('/').pop().slice(-17)}`;
        const rgb = [
            `color:#${((r) => (r() << 16 | r() << 8 | r()).toString(16))(() => ~~(Math.random() * 0x9f + 96))}`,
            'color:inherit'
        ];
        return (m, ...a) => console.warn(`[webgl:worker/%c${pid}%c] ${m}`, ...rgb, ...a);
    })();

    if (self.OffscreenCanvas) {
        // @todo https://bugs.webkit.org/show_bug.cgi?id=183720
        // @todo https://bugzilla.mozilla.org/show_bug.cgi?id=801176
        const res = tryCatch(() => {
            let value = Boolean(new self.OffscreenCanvas(1, 1).getContext('2d'));

            if (typeof WebGL2RenderingContext !== 'undefined') {
                const ctx = new self.OffscreenCanvas(1, 1).getContext('webgl2');

                if (ctx instanceof WebGL2RenderingContext) {

                    value = 2;
                }
            }
            return value;
        }, (ex) => {
            dump('This browser does lack proper OffscreenCanvas support.', [ex]);
        })();
        Object.defineProperty(self, 'supOffscreenCanvas', {value: res | 0});
    }

    if (!self.isWorkerScope && self.ImageBitmap && typeof createImageBitmap === 'function') {
        // Test for proper ImageBitmap compliance.
        // https://bugs.webkit.org/show_bug.cgi?id=182424

        waiter = (async() => {
            const sample =
                'data:image/jpeg;base64,/9j/4QBiRXhpZgAATU0AKgAAAAgABQESAAMAAAABAAcAAAEaAAUAAAABAAAASgEbAAUAAAA' +
                'BAAAAUgEoAAMAAAABAAIAAAITAAMAAAABAAEAAAAAAAAAAABIAAAAAQAAAEgAAAAB/9sAQwABAQEBAQEBAQEBAQEBAQEBA' +
                'QEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB/9sAQwEBAQEBAQEBAQEBAQEBAQEBAQE' +
                'BAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB/8AAEQgAAQADAwERAAIRAQMRAf/EABQAA' +
                'QAAAAAAAAAAAAAAAAAAAAr/xAAZEAABBQAAAAAAAAAAAAAAAAAGAAcxd7f/xAAVAQEBAAAAAAAAAAAAAAAAAAAFBv/EACA' +
                'RAAADCQEAAAAAAAAAAAAAAAAEBwECBQY0N3J2srX/2gAMAwEAAhEDEQA/ADvj0lloPDqxmrGF0BbBvbwWSW1qdaTLHjEx/9kK';

            const ctx = new MEGACanvasElement();
            let temp = ctx.dataURLToBlob(sample);
            temp = await createImageBitmap(temp).catch(echo);
            temp = await ctx.drawImage(temp, 0, 0, 'imaged').catch(echo);

            const value = temp && temp.data && temp.data[9];
            Object.defineProperty(self, 'supImageBitmap', {value: value === 123});

            if (!self.supImageBitmap && debug) {
                dump('This browser does lack proper ImageBitmap support.', value, temp);
            }

            queueMicrotask(() => {
                waiter = null;
            });
        })();
    }

    const handlers = {
        'hello': async(data) => {
            Object.assign(self, data);
        },
        'throw-test': (data, token) => {
            if (self.isWorkerScope) {
                throw new MEGAException('throw-test', token);
            }
            return Promise.resolve(data);
        },
        'thumbnail': async(data) => {
            const {blob, buffer, source, options = false} = data;
            return webgl.createThumbnailImage(blob || buffer || source || data, options);
        },
        'preview': async(data) => {
            const {blob, buffer, source, options = false} = data;
            return webgl.createPreviewImage(blob || buffer || source || data, options);
        },
        'scissor': async(data) => {
            let {blob, buffer, source, createPreview = true, createThumbnail = true} = data;
            source = await webgl.getCanvasImageSource(blob || buffer || source || data);

            const thumbnail = createThumbnail
                && await webgl.createThumbnailImage(source).then(blob => webgl.readAsAESCBCBuffer(blob));
            const preview = createPreview
                && await webgl.createPreviewImage(source).then(blob => webgl.readAsAESCBCBuffer(blob));

            return {thumbnail, preview};
        },
        'convert': async(data) => {
            const {blob, buffer, target = 'image/jpeg', quality = 0.9} = data;

            data = blob || buffer || data;
            const image = await webgl.loadImage(data, data.type);

            return webgl.drawImage(image, 0, 0, image.width, image.height, target, quality);
        }
    };
    Object.setPrototypeOf(handlers, null);

    const gMessageHandler = async({data}) => {
        const {token, command, payload} = data;
        let result = payload || Object.create(null);

        if (self.isWorkerScope) {
            self.wkPayloads[token] = payload;
        }

        if (debug > 1) {
            dump(`gMessageHandler(${command})`, token, payload);
        }

        if (handlers[command]) {
            result = await handlers[command](payload, token).catch((ex) => ({error: ex, payload}));
        }
        else {
            dump('Unknown command.', command, payload);
        }

        if (debug > 1) {
            dump(`gMessageHandler(${command}).reply`, token, result);
        }

        if (self.isWorkerScope) {
            delete self.wkPayloads[token];
            self.postMessage({token, result}, MEGAWorker.getTransferable(result));
        }

        return result;
    };

    /**
     *  @name webgl
     *  @memberOf window
     */
    lazy(self, 'webgl', () => {
        const props = lazy(Object.create(null), 'canUseWorker', () => {
            return !self.isWorkerScope && self.supOffscreenCanvas > 1 && self.supImageBitmap;
        });
        const MEGARenderingContext = self.isWebGLSupported ? WebGLMEGAContext : MEGACanvasElement;
        const webgl = new MEGARenderingContext();

        /**
         * @name getDynamicThumbnail
         * @memberOf webgl
         */
        lazy(webgl, 'getDynamicThumbnail', () => {
            const type = mThumbHandler.sup.WEBP ? 'image/png' : 'image/webp';

            return async(buffer, size, options, branch) => {
                if (typeof options === 'string') {
                    branch = options;
                    options = false;
                }
                if (typeof size === 'object') {
                    options = size;
                    size = 0;
                }
                if ((size | 0) < 1) {
                    size = MEGAImageElement.THUMBNAIL_SIZE << 1;
                }

                options = {type, maxWidth: size, maxHeight: size, quality: 1.0, ...options};
                return webgl.worker('thumbnail', {buffer, options}, branch);
            };
        });

        /**
         * @name worker
         * @memberOf webgl
         */
        lazy(webgl, 'worker', () => {
            const parity = lazy(Object.create(null), 'worker', () => {
                const data = {
                    apipath,
                    d: debug,
                    supImageBitmap: !!self.supImageBitmap,
                    engine: self.ua && self.ua.details.engine
                };
                return new MEGAWorkerController(gMessageHandler, props.canUseWorker ? data : false);
            });
            const wrap = (method) => {
                if (!waiter) {
                    return (...args) => parity.worker[method](...args);
                }
                return (...args) => Promise.resolve(waiter).then(() => parity.worker[method](...args));
            };
            const handler = wrap('handler');

            if (self.d && !waiter) {
                dump('waiter wrap was unneeded...', waiter);
            }

            Object.defineProperties(handler, {
                stats: {
                    get() {
                        const res = [...stats];
                        const {branches} = parity.worker;

                        if (branches.main) {
                            res.push(branches.main.stats);
                        }

                        res[0] = res[0].join('');
                        res.push($.len(branches));

                        return res;
                    }
                },
                attach: {
                    value: wrap('attach')
                },
                detach: {
                    value: wrap('detach')
                }
            });
            return handler;
        });

        waiter = (async() => {
            const res = [];
            const colors = [];
            const check = (feat, msg) => {
                stats[0].push((self[feat] && (self[feat] | 0 || 1)) | 0);
                res.push(`%c${msg || feat} ${self[feat] ? "\u2714" : "\u2716"}`);
                colors.push(self[feat] ? 'color:#0f0' : 'color:#f00', 'color:inherit');
                MEGACanvasElement.sup |= self[feat] && MEGACanvasElement[`SUPPORT_${(msg || feat).toUpperCase()}`];
            };

            if (waiter) {
                await waiter;
            }
            check('isWebGLSupported', 'WebGL2');
            check(props.canUseWorker && 'Worker', 'Worker');
            check('supOffscreenCanvas', 'OffscreenCanvas');
            check('supImageBitmap', 'ImageBitmap');

            await(async() => {
                let v = 'yes!';
                if (self.supImageBitmap) {
                    // eslint-disable-next-line local-rules/hints
                    try {
                        await self.createImageBitmap(new ImageData(1, 1), {
                            get resizeQuality() {
                                throw v;
                            }
                        });
                    }
                    catch (ex) {
                        v = ex !== v;
                    }
                }
                check(!v && 'ImageBitmap', 'BitmapOptions');

                v = !v && typeof ImageBitmapRenderingContext !== 'undefined'
                    && new MEGACanvasElement(1, 1, 'bitmaprenderer').ctx;

                v = v && 'transferFromImageBitmap' in v || false;

                check(v && 'ImageBitmap', 'BitmapRenderer');
            })();
            check(await self.faceDetector.catch(dump) && 'FaceDetector', 'FaceDetector');

            if (debug) {
                if (self.is_karma) {
                    console.info(res.join(' ').replace(/%c/g, ''));
                }
                else {
                    let ua = '';
                    if (self.ua) {
                        const oss = {
                            'Windows': 'x',
                            'Apple': 'y',
                            'Linux': 'z',
                            'Android': 'a',
                            'iPhone': 'b',
                            'iPad': 'c'
                        };
                        const {engine, browser, version, os} = self.ua.details;
                        ua = `${browser}${parseInt(version)}${oss[os] || '!'}${engine} `;
                    }
                    dump(`${ua}components support:  ${res.join('%c   ')}`, ...colors.slice(0, -1));
                }
            }

            queueMicrotask(() => {
                waiter = null;
            });
        })();

        return Object.defineProperties(webgl, {
            sendTimeoutError: {
                value() {
                    const {gLastError: ex, worker: {stats}} = this;
                    const payload = JSON.stringify([
                        1,
                        buildVersion.website || 'dev',
                        stats,
                        String(ex && ex.message || ex || 'na').split('\n')[0].substr(0, 98)
                    ]);

                    dump(payload);
                    return eventlog(99829, payload, true);
                }
            }
        });
    });

    if (self.isWorkerScope) {
        Object.defineProperty(self, 'wkPayloads', {value: Object.create(null)});
        Object.defineProperty(self, 'wkKarmaRunner', {value: self.location.search.split('karma=')[1]});

        self.addEventListener('error', (ev) => {
            const error = ev.error || ev.message || ev.type || 'wtf';

            console.error('WorkerGlobalScope', ev);
            ev.preventDefault();

            if (String(error).includes('throw-test')) {
                const message = {error, token: error.data, payload: self.wkPayloads[error.data]};
                return self.postMessage(message, MEGAWorker.getTransferable(message));
            }

            const payloads = self.wkPayloads;
            const tfs = MEGAWorker.getTransferable({payloads, error});
            self.postMessage({payloads, error}, tfs);
        });

        self.addEventListener('unhandledrejection', (ev) => {
            ev.preventDefault();
            throw ev.reason;
        });

        self.addEventListener('message', gMessageHandler);
        self.is_karma = self.is_karma || !!self.wkKarmaRunner;
        self.dump = dump;
        self.d = debug;
    }
})(self);

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// static properties

Object.defineProperties(MEGAImageElement, {
    PREVIEW_SIZE: {value: 1024},
    THUMBNAIL_SIZE: {value: 240},
    PREVIEW_QUALITY: {value: 0.85},
    THUMBNAIL_QUALITY: {value: 0.80},
    DEFAULT_QUALITY: {value: 0.9},
    DEFAULT_FORMAT: {value: 'image/jpeg'},
    ALPHA_FORMAT: {value: 'image/png'},
    PREVIEW_TYPE: {value: 'image/jpeg'},
    THUMBNAIL_TYPE: {value: 'image/jpeg'},
    ASPECT_RATIO_4_3: {value: 4 / 3},
    ASPECT_RATIO_8_5: {value: 8 / 5},
    ASPECT_RATIO_16_9: {value: 16 / 9},
    ASPECT_RATIO_21_9: {value: 21 / 9},
    ASPECT_RATIO_25_16: {value: 25 / 16},
    ASPECT_RATIO_32_9: {value: 32 / 9}
});

Object.defineProperties(WebGLMEGAContext, {
    DEFAULT_OPTIONS: {
        value: {
            antialias: true,
            // desynchronized: true,
            preserveDrawingBuffer: false,
            premultipliedAlpha: false,
            // failIfMajorPerformanceCaveat: true,
            powerPreference: 'high-performance'
        }
    }
});

Object.defineProperties(MEGACanvasElement, {
    sup: {
        value: 0,
        writable: true
    },
    SMARTCROP_OPTIONS: {
        value: {
            width: MEGAImageElement.THUMBNAIL_SIZE,
            height: MEGAImageElement.THUMBNAIL_SIZE,
            canvasFactory(width, height) {
                return new MEGACanvasElement(width, height, {willReadFrequently: true}).ctx.canvas;
            },
            get resampleWithImageBitmap() {
                return webgl.doesSupport('BitmapOptions');
            }
        }
    },
    SUPPORT_WEBGL2: {value: 1 << 0},
    SUPPORT_WORKER: {value: 1 << 1},
    SUPPORT_OFFSCREENCANVAS: {value: 1 << 2},
    SUPPORT_IMAGEBITMAP: {value: 1 << 3},
    SUPPORT_BITMAPOPTIONS: {value: 1 << 4},
    SUPPORT_BITMAPRENDERER: {value: 1 << 5},
    SUPPORT_FACEDETECTOR: {value: 1 << 8}
});

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// static methods

Object.defineProperty(MEGAImageElement, 'load', {value: (...args) => new MEGAImageElement().loadImage(...args)});
