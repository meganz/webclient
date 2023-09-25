/**
 * Calculate MD5 checksum utility function taken from the pdf.js library at
 * https://github.com/mozilla/pdf.js/blob/3f33fbf8cf1d7eb5f29de32288ebaa4dd4922501/src/core/crypto.js#L78
 *
 * Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @param {BufferSource|String} data
 * @param {Number} [offset]
 * @param {Number} [length]
 * @returns {Uint8Array}
 * @name md5sum
 * @memberOf window
 */
lazy(self, 'md5sum', () => {
    'use strict';
    const r = new Uint8Array([
        7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5,
        9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11,
        16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10,
        15, 21,
    ]);

    const k = new Int32Array([
        -680876936, -389564586, 606105819, -1044525330, -176418897, 1200080426,
        -1473231341, -45705983, 1770035416, -1958414417, -42063, -1990404162,
        1804603682, -40341101, -1502002290, 1236535329, -165796510, -1069501632,
        643717713, -373897302, -701558691, 38016083, -660478335, -405537848,
        568446438, -1019803690, -187363961, 1163531501, -1444681467, -51403784,
        1735328473, -1926607734, -378558, -2022574463, 1839030562, -35309556,
        -1530992060, 1272893353, -155497632, -1094730640, 681279174, -358537222,
        -722521979, 76029189, -640364487, -421815835, 530742520, -995338651,
        -198630844, 1126891415, -1416354905, -57434055, 1700485571, -1894986606,
        -1051523, -2054922799, 1873313359, -30611744, -1560198380, 1309151649,
        -145523070, -1120210379, 718787259, -343485551,
    ]);

    const te = new TextEncoder();

    return (data, offset, length) => {
        let h0 = 1732584193;
        let h1 = -271733879;
        let h2 = -1732584194;
        let h3 = 271733878;

        if (typeof data === 'string') {
            data = te.encode(data);
        }
        else if (data instanceof ArrayBuffer) {
            data = new Uint8Array(data);
        }

        if (offset === undefined) {
            offset = data.byteOffset;
        }
        if (length === undefined) {
            length = data.byteLength;
        }

        // pre-processing
        const paddedLength = length + 72 & ~63; // data + 9 extra bytes
        const padded = new Uint8Array(paddedLength);
        let i, j;
        for (i = 0; i < length; ++i) {
            padded[i] = data[offset++];
        }
        padded[i++] = 0x80;

        const n = paddedLength - 8;
        while (i < n) {
            padded[i++] = 0;
        }
        padded[i++] = length << 3 & 0xff;
        padded[i++] = length >> 5 & 0xff;
        padded[i++] = length >> 13 & 0xff;
        padded[i++] = length >> 21 & 0xff;
        padded[i++] = length >>> 29 & 0xff;
        padded[i++] = 0;
        padded[i++] = 0;
        padded[i++] = 0;
        const w = new Int32Array(16);
        for (i = 0; i < paddedLength;) {
            for (j = 0; j < 16; ++j, i += 4) {
                w[j] =
                    padded[i] |
                    padded[i + 1] << 8 |
                    padded[i + 2] << 16 |
                    padded[i + 3] << 24;
            }
            let a = h0;
            let b = h1;
            let c = h2;
            let d = h3;
            let f;
            let g;
            for (j = 0; j < 64; ++j) {
                if (j < 16) {
                    f = b & c | ~b & d;
                    g = j;
                }
                else if (j < 32) {
                    f = d & b | ~d & c;
                    g = 5 * j + 1 & 15;
                }
                else if (j < 48) {
                    f = b ^ c ^ d;
                    g = 3 * j + 5 & 15;
                }
                else {
                    f = c ^ (b | ~d);
                    g = 7 * j & 15;
                }
                const tmp = d;
                const rotateArg = a + f + k[j] + w[g] | 0;
                const rotate = r[j];
                d = c;
                c = b;
                b = b + (rotateArg << rotate | rotateArg >>> 32 - rotate) | 0;
                a = tmp;
            }
            h0 = h0 + a | 0;
            h1 = h1 + b | 0;
            h2 = h2 + c | 0;
            h3 = h3 + d | 0;
        }

        // prettier-ignore
        return new Uint8Array([
            h0 & 0xFF, h0 >> 8 & 0xFF, h0 >> 16 & 0xFF, h0 >>> 24 & 0xFF,
            h1 & 0xFF, h1 >> 8 & 0xFF, h1 >> 16 & 0xFF, h1 >>> 24 & 0xFF,
            h2 & 0xFF, h2 >> 8 & 0xFF, h2 >> 16 & 0xFF, h2 >>> 24 & 0xFF,
            h3 & 0xFF, h3 >> 8 & 0xFF, h3 >> 16 & 0xFF, h3 >>> 24 & 0xFF
        ]);
    };
});
