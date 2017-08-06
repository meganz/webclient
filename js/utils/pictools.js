function is_rawimage(name, ext) {
    ext = ext || ('' + name).split('.').pop().toUpperCase();

    return (typeof dcraw !== 'undefined') && is_image.raw[ext] && ext;
}

function is_image(name) {
    if (name) {
        if (typeof name === 'object') {
            name = name.name;
        }
        var ext = ('' + name).split('.').pop().toUpperCase();

        return is_image.def[ext] || is_rawimage(null, ext) || mThumbHandler.has(0, ext);
    }

    return false;
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
    "TIF": "Tagged Image File Format",
    "TIFF": "Tagged Image File Format",
    "X3F": "Sigma/Foveon RAW"
};

var mThumbHandler = {
    sup: {},

    add: function(exts, parser) {
        exts = exts.split(",");
        for (var i in exts) {
            this.sup[exts[i].toUpperCase()] = parser;
        }
    },

    has: function(name, ext) {
        ext = ext || ('' + name).split('.').pop().toUpperCase();

        return this.sup[ext];
    }
};

mThumbHandler.add('PSD', function PSDThumbHandler(ab, cb) {
    // http://www.awaresystems.be/imaging/tiff/tifftags/docs/photoshopthumbnail.html
    var logger = MegaLogger.getLogger('crypt');
    var u8 = new Uint8Array(ab),
        dv = new DataView(ab),
        len = u8.byteLength,
        i = 0,
        result;
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

mThumbHandler.add('SVG', function SVGThumbHandler(ab, cb) {
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
