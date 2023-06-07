/**
 * @fileOverview
 * webgl.js unit tests.
 */

describe("webgl.js test", function() {
    "use strict";

    const samplePPMImage =
        'data:image/x-portable-pixmap;base64,UDYKMiAxCjI1NQoFcxAFcxA=';
    const samplePNGImage =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAADCAYAAABS3WW' +
        'CAAAAFklEQVQI12P4/5/hAUNDA8MBBiBoAAAyFAUfmo0D5AAAAABJRU5ErkJggg==';
    const sampleJPEGImage =
        'data:image/jpeg;base64,/9j/4QBiRXhpZgAATU0AKgAAAAgABQESAAMAAAABAAYAAAE' +
        'aAAUAAAABAAAASgEbAAUAAAABAAAAUgEoAAMAAAABAAIAAAITAAMAAAABAAEAAAAAAAAAA' +
        'ABIAAAAAQAAAEgAAAAB/9sAQwD////////////////////////////////////////////' +
        '//////////////////////////////////////////8AACwgAAQACAQERAP/EABQAAQAAA' +
        'AAAAAAAAAAAAAAAAAP/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAA/ADf/2Q==';
    const taintedPNGImage =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAACCAYAAABllJ3tAAAAKklEQVQ' +
        'I12P4H/8/8////4xAbH1u8eq4yXs7vwHZeXt+v2sF0ioMhBQAACnnL/euXY3NAAAAAElFTkSuQmCC';
    const sampleWEBPImage =
        'data:image/webp;base64,UklGRpoAAABXRUJQVlA4WAoAAAAQAAAABwAAAQAAQUxQSBEAAAAAaQE7X' +
        'vZuhSRpATte9m6FJABWUDggYgAAAJADAJ0BKggAAgAAAAAliAJ0twCjAfgBWgH8AygD9AAX61klogAA/' +
        'v92H9h3/9dZ//vMJ+kr/6MT//DX//OZDj/85drYB66/+Js98w8y/vf8JlOhj0oS//MrkFSV3Pj+2YAA';
    const sampleTIFFImage =
        'data:image/tiff;base64,SUkqAAwAAAD//wAADwAAAQMAAQAAAAEAAAABAQMAAQAAAAEAAAACAQMAAwAAAMYAAAADAQMAA' +
        'QAAAAEAAAAGAQMAAQAAAAIAAAAKAQMAAQAAAAEAAAARAQQAAQAAAAgAAAASAQMAAQAAAAEAAAAVAQMAAQAAAAMAAAAWAQMAA' +
        'QAAAAEAAAAXAQQAAQAAAAMAAAAcAQMAAQAAAAEAAAApAQMAAgAAAAAAAQA+AQUAAgAAAPwAAAA/AQUABgAAAMwAAAAAAAAAC' +
        'AAIAAgA/wnXo/////9/4XpU///////MzEz//////5mZmf////9/ZmYm/////+8oXA//////fxsNUP//////VzlU/////w==';
    const sample2x3exif =
        'data:image/jpeg;base64,/9j/4QBiRXhpZgAATU0AKgAAAAgABQESAAMAAAABAAcAAAEaAAUAAAABAAAASgEbAAUAAAABAAAAU' +
        'gEoAAMAAAABAAIAAAITAAMAAAABAAEAAAAAAAAAAABIAAAAAQAAAEgAAAAB/9sAQwABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBA' +
        'QEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB/9sAQwEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBA' +
        'QEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB/8AAEQgAAwACAwERAAIRAQMRAf/EABQAAQAAAAAAAAAAAAAAAAAAAAj/x' +
        'AAcEAACAwEBAQEAAAAAAAAAAAAFBgEEBwgDExT/xAAVAQEBAAAAAAAAAAAAAAAAAAAJCv/EABsRAAMBAQEBAQAAAAAAAAAAAAQFB' +
        'ggHAwIJ/9oADAMBAAIRAxEAPwB7Zbj4wtmWclJ0/qMNJJEUCEiFDszrlGUxU3F8fYkarpKZtoFPTl2j9PyhFZTBBVpfG+VYSCEjh' +
        'dSrT8UQa5XyHLNGUyDi7ErUKcPMRBtLPGmYeh2DIVQR6Lxz6y/veUUl1c0pnkP8EPbC0on9ZTNPQp1Rumrg0w73my3x+g+0uPbq2' +
        'lySE0V0ISH5brPRvOY0WhMX3j8aUiOw2MzOjvLi9X01zZuPFQsD82dXZ0dBWURvz7t6J21cGGHkf//ZAA==';

    const now = Date.now();
    const samplePNGWithSolidColor = webgl.createImage(0xd9, 80, 60, 'image/png');
    const sampleJPEGWithSolidColor = webgl.createImage(0xd9, 80, 60, 'image/jpeg');
    const sampleForThumbnailCreation = webgl.createImage('pattern', 640, 480, 'image/jpeg');
    const sample2x3ExifMeta = {
        '1': {
            width: 2,
            height: 3,
            desc: 'Horizontal (normal)',
            mask: [0xff0000fe, 0xff00ffff, 0xff01ff00, 0xfffe0000, 0xfffe00ff, 0xffffff00]
        },
        '2': {
            width: 2,
            height: 3,
            desc: 'Mirror horizontal',
            mask: [0xff00ffff, 0xff0000fe, 0xfffe0000, 0xff01ff00, 0xffffff00, 0xfffe00ff]
        },
        '3': {
            width: 2,
            height: 3,
            desc: 'Rotate 180',
            mask: [0xffffff00, 0xfffe00ff, 0xfffe0000, 0xff01ff00, 0xff00ffff, 0xff0000fe]
        },
        '4': {
            width: 2,
            height: 3,
            desc: 'Mirror vertical',
            mask: [0xfffe00ff, 0xffffff00, 0xff01ff00, 0xfffe0000, 0xff0000fe, 0xff00ffff]
        },
        '5': {
            width: 3,
            height: 2,
            desc: 'Mirror horizontal and rotate 270 CW',
            mask: [0xff0000fe, 0xff01ff00, 0xfffe00ff, 0xff00ffff, 0xfffe0000, 0xffffff00]
        },
        '6': {
            width: 3,
            height: 2,
            desc: 'Rotate 90 CW',
            mask: [0xfffe00ff, 0xff01ff00, 0xff0000fe, 0xffffff00, 0xfffe0000, 0xff00ffff]
        },
        '7': {
            width: 3,
            height: 2,
            desc: 'Mirror horizontal and rotate 90 CW',
            mask: [0xffffff00, 0xfffe0000, 0xff00ffff, 0xfffe00ff, 0xff01ff00, 0xff0000fe]
        },
        '8': {
            width: 3,
            height: 2,
            desc: 'Rotate 270 CW',
            mask: [0xff00ffff, 0xfffe0000, 0xffffff00, 0xff0000fe, 0xff01ff00, 0xfffe00ff]
        }
    };

    const getReadFrequentlyCanvasElement = (width = 1, height = 1, options = false) => {
        // Multiple read-back operations using getImageData are faster with the willReadFrequently attribute set.
        return new MEGACanvasElement(width, height, '2d', {...options, willReadFrequently: true});
    };

    /**
     * When privacy.resistFingerprinting.randomDataOnCanvasExtract is true, tries to generate random
     * canvas data by sampling 32 bytes and then repeating those bytes many times to fill the buffer.
     * If this fails, returns all-white, opaque pixel data.
     */
    const generatePlaceholderCanvasData = (width, height) => {
        const buf = new Uint8ClampedArray(4 * width * height);
        const rnd = crypto.getRandomValues(new Uint32Array(8));

        for (let i = 0; i < buf.byteLength; i += rnd.byteLength) {
            buf.set(new Uint8Array(rnd.buffer, 0, Math.min(buf.byteLength - i, rnd.byteLength)), i);
        }

        return webgl.createImageData(buf, width, height);
    };

    const doWebGLAndCanvasTest = (name, test) => {
        if (self.isWebGLSupported) {
            it(`${name} (WebGL)`, async() => test(webgl));
        }

        const canvas = getReadFrequentlyCanvasElement();
        it(`${name} (Canvas)`, async() => test(canvas));
    };

    it('can obtain transferable', () => {
        const len = 5, bit = 1, val = 234;
        const uint8 = new Uint8Array(len);
        uint8[bit] = val;

        const sample = {bv: true, foo: [{bar: {baz: [uint8]}}, 'sk']};
        const blob = new Blob(['foo'], {type: 'text/plain'});
        blob.sk = sample;
        sample.foo.push(blob);

        const t = MEGAWorker.getTransferable(sample);

        chai.expect(t.length).to.eql(1);
        chai.expect(new Uint8Array(t[0])[bit]).to.eql(val);
    });

    it('can regain transferable ownership on thrown exception', async() => {
        if (!webgl.doesSupport('worker')) {
            if (!self.is_karma) {
                throw new MEGAException('No workers support', 'NotSupportedError');
            }
            console.info('Cannot test transferable ownership.');
            return;
        }

        const len = 7, bit = 3, val = 123;
        const uint8 = new Uint8Array(len);

        uint8[bit] = val;
        return webgl.worker('throw-test', uint8)
            .then((res) => {
                chai.assert(res !== uint8, 'fail');
                chai.expect(uint8.byteLength).to.eql(0);
                chai.expect(res).to.be.instanceOf(Uint8Array);
                chai.expect(res.byteLength).to.eql(len);
                chai.expect(res[bit]).to.eql(val);
            });
    });

    it('can identify JPEG and EXIF Orientation', () => {
        const uint8 = webgl.dataURLToUint8(sampleJPEGImage);
        const value = webgl.readEXIFMetaData(uint8);

        chai.expect(value).to.eql(6);
        chai.expect(uint8.byteLength).to.eql(241);
        chai.expect(uint8.type).to.eql('image/jpeg');
        chai.expect(uint8).to.be.instanceOf(Uint8Array);
        chai.expect(webgl.identify(uint8).format).to.eql('JPEG');
    });

    it('can convert PPM to ImageData', () => {
        const uint8 = webgl.dataURLToUint8(samplePPMImage);
        const value = webgl.convertPPMToImageData(uint8);

        chai.expect(value).to.be.instanceOf(ImageData);
        chai.expect(value.width).to.eql(2);
        chai.expect(value.height).to.eql(1);

        chai.expect(value.data[3]).to.eql(255);
        chai.expect(value.data[5]).to.eql(115);

        chai.expect(uint8.byteLength).to.eql(17);
        chai.expect(value.data.byteLength).to.eql(8);

        chai.expect(uint8.type).to.eql('image/x-portable-pixmap');
    });

    it('can identify PNG and Transparency', async() => {
        const uint8 = webgl.dataURLToUint8(samplePNGImage);
        chai.expect(uint8.byteLength).to.eql(79);
        chai.expect(uint8.type).to.eql('image/png');
        chai.expect(uint8).to.be.instanceOf(Uint8Array);

        const details = webgl.identify(uint8);
        chai.expect(details.format).to.eql('PNG');
        chai.expect(details.doesSupportAlpha).to.eql(true);

        const image = await webgl.loadImage(samplePNGImage);
        chai.expect(image).to.be.instanceOf(Image);
        chai.expect(image.width).to.eql(1);
        chai.expect(image.height).to.eql(3);

        const ctx = webgl.getDrawingContext(image.width, image.height);
        const imageData = await ctx.drawImage(image, 0, 0, image.width, image.height, 'imaged');

        chai.expect(imageData.width).to.eql(image.width);
        chai.expect(imageData.height).to.eql(image.height);
        chai.expect(imageData.data.byteLength).to.eql(image.width * image.height * 4);

        // [255, 255, 0, 224, 128, 128, 0, 192, 0, 0, 0, 128]
        //  ^^^^32[0]LSB^^^^          ^16[3]LSB ^^32[2]LSB^^
        const u32 = new Uint32Array(imageData.data.buffer);
        const u16 = new Uint16Array(imageData.data.buffer);
        chai.expect(u32[0]).to.eql(0xE000FFFF);
        chai.expect(u32[2]).to.eql(0x80000000);
        chai.expect(u16[3]).to.eql(0xC000);

        chai.expect(webgl.isTainted(imageData)).to.eql(false);
        chai.expect(webgl.isTransparent(imageData)).to.eql(true);
    });

    it('can identify tainted canvas', async() => {
        const uint8 = webgl.dataURLToUint8(sampleWEBPImage);
        chai.expect(uint8.byteLength).to.eql(162);
        chai.expect(uint8.type).to.eql('image/webp');
        chai.expect(uint8).to.be.instanceOf(Uint8Array);

        const details = webgl.identify(uint8);
        chai.expect(details.format).to.eql('WEBP');
        chai.expect(details.doesSupportAlpha).to.eql(true);

        let image = await webgl.loadImage(uint8).catch(nop);
        if (!image) {
            console.info('No WebP support in this browser.');
            image = await webgl.loadImage(taintedPNGImage);
        }
        chai.expect(image).to.be.instanceOf(Image);
        chai.expect(image.width).to.eql(8);
        chai.expect(image.height).to.eql(2);

        let imageData = await webgl.drawImage(image, 0, 0, image.width, image.height, 'imaged');
        chai.expect(webgl.isTainted(imageData)).to.eql(true);

        for (let i = 353; i < 5e3; i <<= 1) {
            imageData = generatePlaceholderCanvasData(i, i / 1.777 | 0);
            chai.expect(webgl.isTainted(imageData)).to.eql(true);

            // we shall not detect images with a single color as tainted (except pure black/white)
            imageData.data.fill(Math.min(0xFE, 0x3F | imageData.data[Math.random() * imageData.data.byteLength | 0]));
            chai.expect(webgl.isTainted(imageData)).to.eql(false);

            new Uint32Array(imageData.data.buffer).fill(2929824849);
            chai.expect(webgl.isTainted(imageData)).to.eql(false);
        }
    });

    it('can work with WebGLMEGAContext even if WebGL is not supported', async() => {
        if (webgl.doesSupport('webgl2')) {
            chai.expect(webgl).to.be.instanceOf(WebGLMEGAContext);
            chai.expect(webgl.renderingContextType).to.be.eql('webgl');
            if (!self.is_karma) {
                throw new MEGAException('WebGL *is* supported', 'NotSupportedError');
            }
            console.info('Cannot test WebGL unavailability.');
            return;
        }
        chai.expect(webgl).to.be.instanceOf(MEGACanvasElement);
        chai.expect(webgl.renderingContextType).to.be.eql('2d');
        chai.expect(webgl[Symbol.toStringTag]).to.be.eql('MEGACanvasElement');

        const image = await webgl.loadImage(samplePNGImage);
        chai.expect(image).to.be.instanceOf(Image);
        chai.expect(image.width).to.eql(1);
        chai.expect(image.height).to.eql(3);

        const gl = new WebGLMEGAContext();
        return gl.drawImage(image, 0, 0, image.width, image.height)
            .then((res) => {
                chai.expect(res).to.be.eql(false);

                const ctx = gl.getDrawingContext(image.width, image.height);
                return ctx.drawImage(image, 0, 0, image.width, image.height, 'buffer', 'image/jpeg');
            })
            .then((jpeg) => {
                chai.expect(jpeg).to.be.instanceOf(ArrayBuffer);
                chai.expect(jpeg.byteLength).to.be.lessThan(900);
                chai.expect(jpeg.byteLength).to.be.greaterThan(600);
                chai.expect(webgl.identify(jpeg).format).to.eql('JPEG');
            });
    });

    it('can restore lost WebGL context', async() => {
        if (!webgl.doesSupport('webgl2')) {
            if (!self.is_karma) {
                throw new MEGAException('WebGL is not supported', 'NotSupportedError');
            }
            return;
        }

        const gl = new WebGLMEGAContext();
        const ext = gl.ctx.getExtension('WEBGL_lose_context');
        if (!ext) {
            if (!self.is_karma) {
                throw new MEGAException('WEBGL_lose_context is not supported', 'NotSupportedError');
            }
            return;
        }
        await tSleep(1 / 10);

        const contextLost = new Promise((resolve) => {
            gl.ctx.canvas.addEventListener('webglcontextlost', resolve);
        });
        const restoreContext = new Promise((resolve) => {
            gl.ctx.canvas.addEventListener('webglcontextrestored', resolve);
        });
        ext.loseContext();

        // If the WebGL context is lost, this error is returned on the first call to getError.
        // Afterward and until the context has been restored, it returns gl.NO_ERROR.
        expect(gl.getError()).to.eql(WebGL2RenderingContext.CONTEXT_LOST_WEBGL);
        expect(gl.ctx.isContextLost()).to.eql(true);

        // ensure didLoseContext is set.
        await contextLost;

        expect(gl.ready).to.eql(false);
        expect(gl.program).to.eql(null);
        expect(gl.didLoseContext).to.eql(true);

        // we must always give a usable drawing context no matter what.
        expect(gl.getDrawingContext(1, 1).renderingContextType).to.eql('2d');
        expect(gl.getDrawingContext(1, 1)).to.be.instanceOf(MEGACanvasElement);

        // at this point, we must fall back to canvas, being our-getError() consistently returning CONTEXT_LOST_WEBGL
        expect(gl.getErrorString(gl.getError())).to.eql(`CONTEXT_LOST_WEBGL`);
        expect(gl.getError()).to.eql(WebGL2RenderingContext.CONTEXT_LOST_WEBGL);

        const image = await gl.loadImage(samplePNGImage);
        const imageData = await gl.drawImage(image, 0, 0, image.width, image.height, 'imaged');

        // if CONTEXT_LOST_WEBGL wasn't returned there, this would be detected as tainted.
        expect(gl.isTainted(imageData)).to.eql(false);

        const data = new Uint32Array(imageData.data.buffer);
        expect(data[0]).to.eql(0xe000ffff);
        expect(data[2]).to.eql(0x80000000);
        expect(data[1] >>> 16).to.eql(0xc000);

        await restoreContext;
        expect(gl.ctx.isContextLost()).to.eql(false);

        // this same instance must be reusable normally again.
        expect(gl.getDrawingContext(1, 1)).to.eql(gl);
        expect(gl.getDrawingContext(1, 1)).to.be.instanceOf(WebGLMEGAContext);
        expect(gl.program).to.be.instanceOf(WebGLProgram);

        const blob = await gl.drawImage(image, 0, 0, image.width, image.height, 'image/jpeg');
        chai.expect(blob).to.be.instanceOf(Blob);
        chai.expect(blob.size).to.be.greaterThan(600);
        chai.expect(blob.type).to.be.eql('image/jpeg');
    });

    it('can decode TIFF Images', async() => {
        const uint8 = webgl.dataURLToUint8(sampleTIFFImage);
        chai.expect(uint8.byteLength).to.eql(268);
        chai.expect(uint8.type).to.eql('image/tiff');

        const details = webgl.identify(uint8);
        chai.expect(details.format).to.eql('TIFF');
        chai.expect(details.bigEndian).to.eql(undefined);

        const imageData = await webgl.decodeTIFFImage(uint8);
        chai.expect(imageData.width).to.eql(1);
        chai.expect(imageData.height).to.eql(1);
        chai.expect(imageData.data.byteLength).to.eql(4);
        chai.expect(imageData.data[0]).to.eql(255);
        chai.expect(imageData.data[1]).to.eql(255);
        chai.expect(imageData.data[2]).to.eql(0);
        chai.expect(imageData.data[3]).to.eql(255);
    });

    it('can work with auto-rotated images', async() => {
        const uint8 = webgl.dataURLToUint8(sample2x3exif);
        chai.expect(uint8.byteLength).to.eql(568);
        chai.expect(uint8.type).to.eql('image/jpeg');

        const uint16 = new Uint16Array(uint8.buffer);
        chai.expect(uint16[15]).to.eql(7 << 8); // Exif Orientation 7

        const image = await webgl.loadImage(uint16);
        if (image.width === 2) {
            chai.expect(image.height).to.eql(3);
            if (!self.is_karma) {
                throw new MEGAException('This browser does not auto-rotates images', 'NotSupportedError');
            }
            return;
        }

        chai.expect(image.width).to.eql(3);
        chai.expect(image.height).to.eql(2);
        chai.expect(image).to.be.instanceOf(Image);

        const testBitmap = async(ctx, meta, source) => {
            if (!(source instanceof Blob)) {
                chai.expect(source.width).to.eql(meta.width);
                chai.expect(source.height).to.eql(meta.height);
            }

            const bitmap = await ctx.createImageBitmap(source);
            if (ctx.doesSupport('ImageBitmap')) {
                chai.expect(bitmap).to.be.instanceOf(ImageBitmap);
            }
            await testDrawImage(ctx, meta, bitmap);
        };

        const testDrawImage = async(ctx, meta, source) => {
            if (!(source instanceof Blob)) {
                chai.expect(source.width).to.eql(meta.width);
                chai.expect(source.height).to.eql(meta.height);
            }
            // const tag = source[Symbol.toStringTag];
            const iid = source instanceof ImageData;

            source = await ctx.getCanvasImageSource(source);
            chai.expect(source.width).to.eql(meta.width);
            chai.expect(source.height).to.eql(meta.height);

            const imageData = await ctx.drawImage(source, 0, 0, 'imaged');

            chai.expect(imageData).to.be.instanceOf(ImageData);
            chai.expect(imageData.width).to.eql(meta.width);
            chai.expect(imageData.height).to.eql(meta.height);

            chai.expect(ctx.ctx.canvas.width).to.eql(meta.width);
            chai.expect(ctx.ctx.canvas.height).to.eql(meta.height);

            const u32 = new Uint32Array(imageData.data.buffer);
            chai.expect(u32.length).to.eql(6);

            // console.log(`using ${ctx[Symbol.toStringTag]}, with ${tag}`, meta.desc, meta.v, Array.from(u32), meta.mask);
            // await M.saveAs(u32, `${now}-${meta.v}-${ctx[Symbol.toStringTag]}-${tag}.rgb`);

            for (let i = u32.length; i--;) {
                chai.assert(u32[i] === meta.mask[i],
                    `Unexpected color at offset#${i} Exif${meta.v} (${meta.desc}) ` +
                    `got: 0x${u32[i].toString(16)}, expected: 0x${meta.mask[i].toString(16)} ` +
                    `(using ${ctx[Symbol.toStringTag]}, with ${source[Symbol.toStringTag]})`);
            }

            if (!iid) {
                await testDrawImage(ctx, meta, imageData);
            }
        };

        const testSource = async(...args) => {
            await testBitmap(...args);
            await testDrawImage(...args);
        };

        const test = async(ctx) => {
            for (let rot = 9; --rot;) {
                const meta = {...sample2x3ExifMeta[rot]};
                meta.v = rot;

                const uint16 = new Uint16Array(uint8.buffer.slice(0));
                uint16[15] = rot << 8; // tamper Exif Orientation

                // await M.saveAs(uint16, `${now}-${meta.v}-${ctx[Symbol.toStringTag]}-orig.jpg`);

                const image = await webgl.loadImage(uint16);
                chai.expect(image).to.be.instanceOf(Image);
                chai.expect(image.width).to.eql(meta.width);
                chai.expect(image.height).to.eql(meta.height);

                // console.log('image');
                await testSource(ctx, meta, image);

                const blob = new Blob([uint16], {type: 'image/jpeg'});
                chai.expect(blob).to.be.instanceOf(Blob);
                chai.expect(blob.size).to.be.eql(568);
                chai.expect(blob.type).to.be.eql('image/jpeg');

                // console.log('blob');
                await testSource(ctx, meta, blob);
            }
        };

        if (webgl.doesSupport('webgl2')) {
            const gWebGLContext = new WebGLMEGAContext();
            await test(gWebGLContext);
        }

        const gCanvasContext = getReadFrequentlyCanvasElement();
        return test(gCanvasContext);
    });

    it('can create bitmap or shim to be used with drawImage()', async() => {
        const uint8 = webgl.dataURLToUint8(sampleJPEGImage);
        const image = await webgl.loadImage(uint8);

        if (image.width === 1) {
            // The image was auto-rotated (90 CCW)
            chai.expect(image.height).to.eql(2);
        }
        else {
            chai.expect(image.width).to.eql(2);
            chai.expect(image.height).to.eql(1);
        }
        chai.expect(image).to.be.instanceOf(Image);

        const ctx = webgl.getDrawingContext(image.width, image.height);
        return ctx.drawImage(image, 0, 0, image.width, image.height, 'bitmap')
            .then((bitmap) => {
                if (!self.supImageBitmap) {
                    if (typeof OffscreenCanvas === 'undefined') {
                        chai.expect(bitmap).to.be.instanceOf(HTMLCanvasElement);
                    }
                    else {
                        chai.expect(bitmap).to.be.instanceOf(OffscreenCanvas);
                    }
                }
                else {
                    chai.expect(bitmap).to.be.instanceOf(ImageBitmap);
                }

                return ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height, 'buffer', 'image/png');
            })
            .then((png) => {
                const details = webgl.identify(png);
                chai.expect(details.format).to.eql('PNG');
                chai.expect(png).to.be.instanceOf(ArrayBuffer);
            });
    });

    it('can convert image as blob in worker', async() => {
        const target = 'image/jpeg';
        const blob = webgl.dataURLToBlob(samplePNGImage);

        chai.expect(blob).to.be.instanceOf(Blob);
        chai.expect(blob.size).to.be.eql(79);
        chai.expect(blob.type).to.be.eql('image/png');

        return webgl.worker('convert', {blob, target, quality: 0.7})
            .then((res) => {
                chai.expect(res).to.be.instanceOf(Blob);
                chai.expect(res.type).to.be.eql(target);

                if (webgl.doesSupport('worker')) {
                    chai.assert(res.token, 'The task was bounced to the main thread.');
                }
                else if (!self.is_karma) {
                    throw new MEGAException('The task was completed in the main thread', 'NotSupportedError');
                }
            });
    });

    it('can create random sample image', async() => {
        const blob = await webgl.createImage(null, 17, 13, 'image/jpeg');
        const jpeg = new Uint8Array(await webgl.readAsArrayBuffer(blob));

        chai.expect(webgl.identify(jpeg).format).to.eql('JPEG');

        const image = await webgl.loadImage(blob);
        chai.expect(image).to.be.instanceOf(Image);
        chai.expect(image.width).to.eql(17);
        chai.expect(image.height).to.eql(13);
    });

    it('can retrieve an *ImageSource (Canvas or WebGL)', async() => {
        let ctx = new MEGACanvasElement();
        let source = await ctx.getCanvasImageSource(samplePNGImage);

        chai.expect(source).to.be.instanceOf(Image);
        chai.expect(source.width).to.eql(1);
        chai.expect(source.height).to.eql(3);

        const blob = ctx.dataURLToBlob(samplePNGImage);
        chai.expect(blob).to.be.instanceOf(Blob);
        chai.expect(blob.size).to.eql(79);
        chai.expect(blob.type).to.eql('image/png');

        source = await webgl.getCanvasImageSource(blob);
        if (webgl.doesSupport('ImageBitmap')) {
            chai.expect(source).to.be.instanceOf(ImageBitmap);
        }
        else {
            chai.expect(source).to.be.instanceOf(HTMLImageElement);
        }

        ctx = webgl.getDrawingContext(source.width, source.height);
        const imageData = await ctx.drawImage(source, 0, 0, source.width, source.height, 'imaged');

        chai.expect(imageData).to.be.instanceOf(ImageData);
        chai.expect(imageData.width).to.eql(source.width);
        chai.expect(imageData.height).to.eql(source.height);

        source = await webgl.getCanvasImageSource(imageData);
        if (webgl.doesSupport('ImageBitmap')) {
            chai.expect(source).to.be.instanceOf(ImageBitmap);
        }
        else if (webgl.doesSupport('OffscreenCanvas')) {
            chai.expect(source).to.be.instanceOf(OffscreenCanvas);
        }
        else {
            chai.expect(source).to.be.instanceOf(HTMLCanvasElement);
        }

    });

    {
        const ratios = Reflect.ownKeys(MEGAImageElement)
            .filter(k => k.startsWith('ASPECT_RATIO')).map(k => k.split('_').slice(-2));

        const width = 481;
        const height = width * 0.9 | 0;
        const canvas = new MEGACanvasElement(width, height);
        const gImageLoader = canvas.createImage(null, width, height, 'image/png');
        const name = `can resize/crop random (${ratios.map(rv => rv.join(':')).join(',')}) images`;
        const rnd = (v) => Math.ceil(Math.random() * v);

        const testRatio = async(ctx, source, ratio) => {
            for (let i = 3; i--;) {
                const args = [source, 0, 0, width, Math.ceil(width / ratio)];
                switch (i) {
                    case 0:
                        break;
                    case 1:
                        let dw = rnd(args[3] / 1.3);
                        args.push(0, 0, dw, Math.round(dw / ratio));
                        break;
                    default:
                        args.push(0, 0, Math.round(args[3] / 2), Math.round(args[4] / 2));
                        break;
                }

                const blob = await ctx.drawImage(...[...args, 'image/jpeg', 0.6]);
                chai.expect(blob).to.be.instanceOf(Blob);
                chai.expect(blob.type).to.eql('image/jpeg');
                chai.expect((await ctx.identify(blob)).format).to.eql('JPEG');
                // M.saveAs(blob, now + '-' + ctx.renderingContextType + '-' + i + '-' + rv + '-' + args.slice(1).join('.') + '.jpg');

                const image = await ctx.loadImage(blob);
                chai.expect(image).to.be.instanceOf(Image);
                chai.expect(image.width).to.eql(args[7] || args[3] || width);
                chai.expect(image.height).to.eql(args[8] || args[4] || height);
            }
        };

        const test = async(ctx) => {
            const blob = await gImageLoader;
            chai.expect(blob).to.be.instanceOf(Blob);
            chai.expect(blob.type).to.eql('image/png');
            chai.expect((await ctx.identify(blob)).format).to.eql('PNG');

            const source = await ctx.getCanvasImageSource(blob);
            chai.expect(source.width).to.eql(width);
            chai.expect(source.height).to.eql(height);

            for (let i = ratios.length; i--;) {
                const rv = ratios[i];
                const ratio = MEGAImageElement[`ASPECT_RATIO_${rv.join('_')}`];
                await testRatio(ctx, source, ratio);
            }
        };

        doWebGLAndCanvasTest(name, test);
    }

    doWebGLAndCanvasTest('can create thumbnail', async(ctx) => {
        const size = MEGAImageElement.THUMBNAIL_SIZE;
        const blob = await sampleForThumbnailCreation;

        const res = await ctx.createThumbnailImage(blob);
        chai.expect(res).to.be.instanceOf(Blob);
        chai.expect(res.type).to.be.eql(MEGAImageElement.THUMBNAIL_TYPE);

        const image = await ctx.loadImage(res);
        chai.expect(image).to.be.instanceOf(Image);
        chai.expect(image.width).to.eql(size);
        chai.expect(image.height).to.eql(size);

        let tiny = await ctx.createImage('pattern', size, size, 'image/jpeg');
        // let tiny = await ctx.createImage('pattern', size >> 2, size >> 2, 'image/jpeg');
        tiny = await ctx.createThumbnailImage(tiny, {type: 'imaged'});

        chai.expect(tiny).to.be.instanceOf(ImageData);
        chai.expect(tiny.width).to.be.eql(size);
        chai.expect(tiny.height).to.be.eql(size);

        chai.expect(ctx.isTainted(tiny)).to.eql(false);

        // chai.expect(ctx.isTransparent(tiny)).to.eql(true);
        // chai.expect(Math.max(...tiny.data.slice(0, tiny.width * 4))).to.be.eql(0);
    });

    doWebGLAndCanvasTest('can create preview image', async(ctx) => {
        let width = 1280;
        let height = ~~(width / MEGAImageElement.ASPECT_RATIO_16_9);
        let blob = await ctx.createImage('pattern', width, height, 'image/jpeg');

        chai.expect(blob).to.be.instanceOf(Blob);
        chai.expect(blob.type).to.be.eql('image/jpeg');

        let res = await ctx.createPreviewImage(blob);
        chai.expect(res).to.be.instanceOf(Blob);
        chai.expect(res.type).to.be.eql(MEGAImageElement.PREVIEW_TYPE);

        /*
        if (ctx.doesSupport('BitmapRenderer')) {
            chai.expect(ctx.bitmaprenderer).to.be.instanceOf(MEGACanvasElement);
            chai.expect(ctx.bitmaprenderer.renderingContextType).to.be.eql('bitmaprenderer');
            chai.expect(ctx.bitmaprenderer.ctx).to.be.instanceOf(ImageBitmapRenderingContext);
        }*/

        let image = await ctx.loadImage(res);
        chai.expect(image).to.be.instanceOf(Image);
        chai.expect(image.width).to.eql(MEGAImageElement.PREVIEW_SIZE);
        chai.expect(image.height).to.eql(~~(MEGAImageElement.PREVIEW_SIZE / MEGAImageElement.ASPECT_RATIO_16_9));

        height = 320;
        width = Math.ceil(height * MEGAImageElement.ASPECT_RATIO_32_9);
        blob = await ctx.createImage(null, width, height, 'image/jpeg');

        chai.expect(blob).to.be.instanceOf(Blob);
        chai.expect(blob.type).to.be.eql('image/jpeg');

        res = await ctx.createPreviewImage(blob);
        chai.expect(res).to.be.instanceOf(Blob);
        chai.expect(res.type).to.be.eql(MEGAImageElement.PREVIEW_TYPE);

        image = await ctx.loadImage(res);
        chai.expect(image).to.be.instanceOf(Image);
        chai.expect(image.width).to.eql(MEGAImageElement.PREVIEW_SIZE);
        chai.expect(image.height).to.eql(height - (MEGAImageElement.PREVIEW_SIZE >> 5));
    });

    doWebGLAndCanvasTest('can work with corrupted image data', async(ctx) => {
        const test = async(sample, offset, width, height) => {
            chai.expect(sample).to.be.instanceOf(Blob);
            if (offset < 0) {
                offset = sample.size - -offset;
            }
            chai.expect(offset).to.be.greaterThan(99);
            chai.expect(sample.size).to.be.greaterThan(offset);

            const type = String(sample.type).split('/')[1] || 'jpg';
            sample = sample.slice(0, offset);

            // premature EOF
            const blob = await ctx.createPreviewImage(sample).catch(echo);
            if (blob instanceof Error) {
                if (blob.name === 'EncodingError') {
                    // The error happened during ctx.loadImage()
                    chai.expect(blob.data).to.be.instanceOf(Image);
                }
                else if (ctx.renderingContextType === '2d') {
                    chai.expect(blob.message).to.eql('The image is tainted!');
                    chai.expect(blob.name).to.eql('SecurityError');
                }
                else {
                    chai.expect(blob.message).to.eql('WebGL Error: 1281');
                    chai.expect(blob.name).to.eql('InvalidStateError');
                }
                chai.expect(blob).to.be.instanceOf(MEGAException);
                return;
            }
            chai.expect(blob).to.be.instanceOf(Blob);

            const image = await ctx.loadImage(blob);
            chai.expect(image).to.be.instanceOf(Image);
            chai.expect(image.width).to.be.eql(width);
            chai.expect(image.height).to.be.eql(height);

            // damaged, result not tainted
            const uint8 = new Uint8Array(await ctx.readAsArrayBuffer(sample));
            const uint16 = new Uint16Array(uint8.byteLength + 1 & -2);
            new Uint8Array(uint16.buffer).set(uint8);

            for (offset >>= 1; offset < uint16.length; ++offset) {
                uint16[offset] = (Math.random() * 0x10000) | 0;
            }

            const thumb = await ctx.createThumbnailImage(uint16, {type: 'imaged', ats: 1}).catch(echo);
            if (thumb instanceof Error) {
                chai.expect(thumb.name).to.be.eql('EncodingError');
                chai.expect(thumb).to.be.instanceOf(MEGAException);
                console.info(`${ctx[Symbol.toStringTag]}.${type}: Cannot test damaged files...`, sample.size);
                return;
            }

            chai.expect(thumb).to.be.instanceOf(ImageData);
            chai.expect(thumb.width + thumb.height).to.eql(Math.min(width, height) << 1);

            const uint32 = new Uint32Array(thumb.data.buffer);
            chai.expect(uint32.length).to.be.eql(3600);

            if (ctx.isTainted(thumb)) {
                console.info(`${ctx[Symbol.toStringTag]}.${type}: Loading succeed, but tainted.`, uint32.slice(0, 4));
                return;
            }

            const pixel = type === 'png' ? 0xd9 : 0xff;
            for (let i = width >> 1; --i > 0;) {
                chai.expect(uint32[i] >>> 24).to.be.eql(pixel);
            }

            return true;
        };

        const res = await Promise.allSettled([
            test(await samplePNGWithSolidColor, 107, 80, 60),
            test(await sampleJPEGWithSolidColor, -51, 80, 60)
        ]);

        const fails = res.filter(res => {
            if (res.reason) {
                throw res.reason;
            }
            return !res.value;
        });
        if (fails.length) {
            if (!self.is_karma) {
                throw new MEGAException('partially', 'NotSupportedError');
            }
            console.warn('This browser cannot handle corrupt image data.');
        }
    });

    it('can invoke worker scissor (thumb/prev creation)', async() => {
        const blob = await webgl.createImage(null, 1234, 567, 'image/jpeg');
        const {preview, thumbnail} = await webgl.worker('scissor', blob);

        chai.expect(preview).to.be.instanceOf(ArrayBuffer);
        chai.expect(thumbnail).to.be.instanceOf(ArrayBuffer);

        chai.expect(preview.byteLength % 16).to.be.eql(0);
        chai.expect(thumbnail.byteLength % 16).to.be.eql(0);

        const pi = await webgl.loadImage(preview);
        const ti = await webgl.loadImage(thumbnail);

        chai.expect(pi).to.be.instanceOf(Image);
        chai.expect(ti).to.be.instanceOf(Image);

        chai.expect(pi.width).to.eql(MEGAImageElement.PREVIEW_SIZE);
        chai.expect(pi.height).to.eql(471);
        chai.expect(ti.width).to.eql(MEGAImageElement.THUMBNAIL_SIZE);
        chai.expect(ti.height).to.eql(MEGAImageElement.THUMBNAIL_SIZE);
    });

    it('can work with branches (getDynamicThumbnail())', async() => {
        const size = 200;
        const blob = await sampleForThumbnailCreation;

        const branch = await webgl.worker.attach();
        const image = await webgl.loadImage(await webgl.getDynamicThumbnail(blob, size, branch));

        chai.expect(image).to.be.instanceOf(Image);
        chai.expect(image.width).to.eql(size);
        chai.expect(image.height).to.eql(size);

        const promises = [];
        for (let i = 3; i--;) {
            promises.push(webgl.getDynamicThumbnail(blob, size, branch));
        }

        await Promise.race(promises);
        await webgl.worker.detach(branch);

        const res = (await Promise.allSettled(promises))
            .map(p => (p.value || p.reason).name || p.value.constructor.name)
            .sort()
            .join('|');
        chai.expect(res).to.eql('AbortError|AbortError|Blob');
    });

    it('can create thumbnail/preview pairs (legacy)', async() => {
        const blob = await webgl.createImage(null, 800, 600, 'image/jpeg');
        const h = Math.random().toString(26).slice(-8);

        M.d[h] = {h, u: h};
        blob.name = `${h}.jpg`;

        const store = {};
        const opi = window.previewimg;
        window.previewimg = (h, buffer) => store[h] = buffer;

        return createthumbnail(blob, !1, h, !1, h)
            .then(async({thumbnail, preview}) => {
                chai.expect(store[h]).to.eql(preview);
                window.previewimg = null;

                preview = await webgl.loadImage(preview);
                thumbnail = await webgl.loadImage(thumbnail);

                chai.expect(preview).to.be.instanceOf(Image);
                chai.expect(thumbnail).to.be.instanceOf(Image);

                chai.expect(preview.width).to.eql(800);
                chai.expect(preview.height).to.eql(600);
                chai.expect(thumbnail.width).to.eql(MEGAImageElement.THUMBNAIL_SIZE);
                chai.expect(thumbnail.height).to.eql(MEGAImageElement.THUMBNAIL_SIZE);
            })
            .finally(() => {
                window.previewimg = opi;
            });
    });
});
