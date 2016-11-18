/*! asmCrypto, (c) 2013 Artem S Vybornov, opensource.org/licenses/MIT */
(function ( exports, global ) {

function IllegalStateError () { var err = Error.apply( this, arguments ); this.message = err.message, this.stack = err.stack; }
IllegalStateError.prototype = Object.create( Error.prototype, { name: { value: 'IllegalStateError' } } );

function IllegalArgumentError () { var err = Error.apply( this, arguments ); this.message = err.message, this.stack = err.stack; }
IllegalArgumentError.prototype = Object.create( Error.prototype, { name: { value: 'IllegalArgumentError' } } );

function SecurityError () { var err = Error.apply( this, arguments ); this.message = err.message, this.stack = err.stack; }
SecurityError.prototype = Object.create( Error.prototype, { name: { value: 'SecurityError' } } );

var FloatArray = global.Float64Array || global.Float32Array; // make PhantomJS happy

function string_to_bytes ( str, utf8 ) {
    utf8 = !!utf8;

    var len = str.length,
        bytes = new Uint8Array( utf8 ? 4*len : len );

    for ( var i = 0, j = 0; i < len; i++ ) {
        var c = str.charCodeAt(i);

        if ( utf8 && 0xd800 <= c && c <= 0xdbff ) {
            if ( ++i >= len ) throw new Error( "Malformed string, low surrogate expected at position " + i );
            c = ( (c ^ 0xd800) << 10 ) | 0x10000 | ( str.charCodeAt(i) ^ 0xdc00 );
        }
        else if ( !utf8 && c >>> 8 ) {
            throw new Error("Wide characters are not allowed.");
        }

        if ( !utf8 || c <= 0x7f ) {
            bytes[j++] = c;
        }
        else if ( c <= 0x7ff ) {
            bytes[j++] = 0xc0 | (c >> 6);
            bytes[j++] = 0x80 | (c & 0x3f);
        }
        else if ( c <= 0xffff ) {
            bytes[j++] = 0xe0 | (c >> 12);
            bytes[j++] = 0x80 | (c >> 6 & 0x3f);
            bytes[j++] = 0x80 | (c & 0x3f);
        }
        else {
            bytes[j++] = 0xf0 | (c >> 18);
            bytes[j++] = 0x80 | (c >> 12 & 0x3f);
            bytes[j++] = 0x80 | (c >> 6 & 0x3f);
            bytes[j++] = 0x80 | (c & 0x3f);
        }
    }

    return bytes.subarray(0, j);
}

function hex_to_bytes ( str ) {
    var len = str.length;
    if ( len & 1 ) {
        str = '0'+str;
        len++;
    }
    var bytes = new Uint8Array(len>>1);
    for ( var i = 0; i < len; i += 2 ) {
        bytes[i>>1] = parseInt( str.substr( i, 2), 16 );
    }
    return bytes;
}

function base64_to_bytes ( str ) {
    return string_to_bytes( atob( str ) );
}

function bytes_to_string ( bytes, utf8 ) {
    utf8 = !!utf8;

    var len = bytes.length,
        chars = new Array(len);

    for ( var i = 0, j = 0; i < len; i++ ) {
        var b = bytes[i];
        if ( !utf8 || b < 128 ) {
            chars[j++] = b;
        }
        else if ( b >= 192 && b < 224 && i+1 < len ) {
            chars[j++] = ( (b & 0x1f) << 6 ) | (bytes[++i] & 0x3f);
        }
        else if ( b >= 224 && b < 240 && i+2 < len ) {
            chars[j++] = ( (b & 0xf) << 12 ) | ( (bytes[++i] & 0x3f) << 6 ) | (bytes[++i] & 0x3f);
        }
        else if ( b >= 240 && b < 248 && i+3 < len ) {
            var c = ( (b & 7) << 18 ) | ( (bytes[++i] & 0x3f) << 12 ) | ( (bytes[++i] & 0x3f) << 6 ) | (bytes[++i] & 0x3f);
            if ( c <= 0xffff ) {
                chars[j++] = c;
            }
            else {
                c ^= 0x10000;
                chars[j++] = 0xd800 | (c >> 10);
                chars[j++] = 0xdc00 | (c & 0x3ff);
            }
        }
        else {
            throw new Error("Malformed UTF8 character at byte offset " + i);
        }
    }

    var str = '',
        bs = 16384;
    for ( var i = 0; i < j; i += bs ) {
        str += String.fromCharCode.apply( String, chars.slice( i, i+bs <= j ? i+bs : j ) );
    }

    return str;
}

function bytes_to_hex ( arr ) {
    var str = '';
    for ( var i = 0; i < arr.length; i++ ) {
        var h = ( arr[i] & 0xff ).toString(16);
        if ( h.length < 2 ) str += '0';
        str += h;
    }
    return str;
}

function bytes_to_base64 ( arr ) {
    return btoa( bytes_to_string(arr) );
}

function pow2_ceil ( a ) {
    a -= 1;
    a |= a >>> 1;
    a |= a >>> 2;
    a |= a >>> 4;
    a |= a >>> 8;
    a |= a >>> 16;
    a += 1;
    return a;
}

function is_number ( a ) {
    return ( typeof a === 'number' );
}

function is_string ( a ) {
    return ( typeof a === 'string' );
}

function is_buffer ( a ) {
    return ( a instanceof ArrayBuffer );
}

function is_bytes ( a ) {
    return ( a instanceof Uint8Array );
}

function is_typed_array ( a ) {
    return ( a instanceof Int8Array ) || ( a instanceof Uint8Array )
        || ( a instanceof Int16Array ) || ( a instanceof Uint16Array )
        || ( a instanceof Int32Array ) || ( a instanceof Uint32Array )
        || ( a instanceof Float32Array )
        || ( a instanceof Float64Array );
}

function _heap_init ( constructor, options ) {
    var heap = options.heap,
        size = heap ? heap.byteLength : options.heapSize || 65536;

    if ( size & 0xfff || size <= 0 )
        throw new Error("heap size must be a positive integer and a multiple of 4096");

    heap = heap || new constructor( new ArrayBuffer(size) );

    return heap;
}

function _heap_write ( heap, hpos, data, dpos, dlen ) {
    var hlen = heap.length - hpos,
        wlen = ( hlen < dlen ) ? hlen : dlen;

    heap.set( data.subarray( dpos, dpos+wlen ), hpos );

    return wlen;
}

/**
 * Util exports
 */

exports.string_to_bytes = string_to_bytes;
exports.hex_to_bytes = hex_to_bytes;
exports.base64_to_bytes = base64_to_bytes;
exports.bytes_to_string = bytes_to_string;
exports.bytes_to_hex = bytes_to_hex;
exports.bytes_to_base64 = bytes_to_base64;

/**
 * Error definitions
 */

global.IllegalStateError = IllegalStateError;
global.IllegalArgumentError = IllegalArgumentError;
global.SecurityError = SecurityError;

/**
 * @file {@link http://asmjs.org Asm.js} implementation of the {@link https://en.wikipedia.org/wiki/Advanced_Encryption_Standard Advanced Encryption Standard}.
 * @author Artem S Vybornov <vybornov@gmail.com>
 * @license MIT
 */
var AES_asm = function () {
    "use strict";

    /**
     * Galois Field stuff init flag
     */
    var ginit_done = false;

    /**
     * Galois Field exponentiation and logarithm tables for 3 (the generator)
     */
    var gexp3, glog3;

    /**
     * Init Galois Field tables
     */
    function ginit () {
        gexp3 = [],
        glog3 = [];

        var a = 1, c, d;
        for ( c = 0; c < 255; c++ ) {
            gexp3[c] = a;

            // Multiply by three
            d = a & 0x80, a <<= 1, a &= 255;
            if ( d === 0x80 ) a ^= 0x1b;
            a ^= gexp3[c];

            // Set the log table value
            glog3[gexp3[c]] = c;
        }
        gexp3[255] = gexp3[0];
        glog3[0] = 0;

        ginit_done = true;
    }

    /**
     * Galois Field multiplication
     * @param {int} a
     * @param {int} b
     * @return {int}
     */
    function gmul ( a, b ) {
        var c = gexp3[ ( glog3[a] + glog3[b] ) % 255 ];
        if ( a === 0 || b === 0 ) c = 0;
        return c;
    }

    /**
     * Galois Field reciprocal
     * @param {int} a
     * @return {int}
     */
    function ginv ( a ) {
        var i = gexp3[ 255 - glog3[a] ];
        if ( a === 0 ) i = 0;
        return i;
    }

    /**
     * AES stuff init flag
     */
    var aes_init_done = false;

    /**
     * Encryption, Decryption, S-Box and KeyTransform tables
     */
    var aes_sbox, aes_sinv, aes_enc, aes_dec;

    /**
     * Init AES tables
     */
    function aes_init () {
        if ( !ginit_done ) ginit();

        // Calculates AES S-Box value
        function _s ( a ) {
            var c, s, x;
            s = x = ginv(a);
            for ( c = 0; c < 4; c++ ) {
                s = ( (s << 1) | (s >>> 7) ) & 255;
                x ^= s;
            }
            x ^= 99;
            return x;
        }

        // Tables
        aes_sbox = [],
        aes_sinv = [],
        aes_enc = [ [], [], [], [] ],
        aes_dec = [ [], [], [], [] ];

        for ( var i = 0; i < 256; i++ ) {
            var s = _s(i);

            // S-Box and its inverse
            aes_sbox[i]  = s;
            aes_sinv[s]  = i;

            // Ecryption and Decryption tables
            aes_enc[0][i] = ( gmul( 2, s ) << 24 )  | ( s << 16 )            | ( s << 8 )             | gmul( 3, s );
            aes_dec[0][s] = ( gmul( 14, i ) << 24 ) | ( gmul( 9, i ) << 16 ) | ( gmul( 13, i ) << 8 ) | gmul( 11, i );
            // Rotate tables
            for ( var t = 1; t < 4; t++ ) {
                aes_enc[t][i] = ( aes_enc[t-1][i] >>> 8 ) | ( aes_enc[t-1][i] << 24 );
                aes_dec[t][s] = ( aes_dec[t-1][s] >>> 8 ) | ( aes_dec[t-1][s] << 24 );
            }
        }
    }

    /**
     * Asm.js module constructor.
     *
     * <p>
     * Heap buffer layout by offset:
     * <pre>
     * 0x0000   encryption key schedule
     * 0x0400   decryption key schedule
     * 0x0800   sbox
     * 0x0c00   inv sbox
     * 0x1000   encryption tables
     * 0x2000   decryption tables
     * 0x3000   reserved (future GCM multiplication lookup table)
     * 0x4000   data
     * </pre>
     * Don't touch anything before <code>0x400</code>.
     * </p>
     *
     * @alias AES_asm
     * @class
     * @param {GlobalScope} stdlib - global scope object (e.g. <code>window</code>)
     * @param {Object} foreign - <i>ignored</i>
     * @param {ArrayBuffer} buffer - heap buffer to link with
     */
    var wrapper = function ( stdlib, foreign, buffer ) {
        // Init AES stuff for the first time
        if ( !aes_init_done ) aes_init();

        // Fill up AES tables
        var heap = new Uint32Array(buffer);
        heap.set( aes_sbox, 0x0800>>2 );
        heap.set( aes_sinv, 0x0c00>>2 );
        for ( var i = 0; i < 4; i++ ) {
            heap.set( aes_enc[i], ( 0x1000 + 0x400 * i )>>2 );
            heap.set( aes_dec[i], ( 0x2000 + 0x400 * i )>>2 );
        }

        /**
         * Calculate AES key schedules.
         * @instance
         * @memberof AES_asm
         * @param {int} ks - key size, 4/6/8 (for 128/192/256-bit key correspondingly)
         * @param {int} k0..k7 - key vector components
         */
        function set_key ( ks, k0, k1, k2, k3, k4, k5, k6, k7 ) {
            var ekeys = heap.subarray( 0x000, 60 ),
                dkeys = heap.subarray( 0x100, 0x100+60 );

            // Encryption key schedule
            ekeys.set( [ k0, k1, k2, k3, k4, k5, k6, k7 ] );
            for ( var i = ks, rcon = 1; i < 4*ks+28; i++ ) {
                var k = ekeys[i-1];
                if ( ( i % ks === 0 ) || ( ks === 8 && i % ks === 4 ) ) {
                    k = aes_sbox[k>>>24]<<24 ^ aes_sbox[k>>>16&255]<<16 ^ aes_sbox[k>>>8&255]<<8 ^ aes_sbox[k&255];
                }
                if ( i % ks === 0 ) {
                    k = (k << 8) ^ (k >>> 24) ^ (rcon << 24);
                    rcon = (rcon << 1) ^ ( (rcon & 0x80) ? 0x1b : 0 );
                }
                ekeys[i] = ekeys[i-ks] ^ k;
            }

            // Decryption key schedule
            for ( var j = 0; j < i; j += 4 ) {
                for ( var jj = 0; jj < 4; jj++ ) {
                    var k = ekeys[i-(4+j)+(4-jj)%4];
                    if ( j < 4 || j >= i-4 ) {
                        dkeys[j+jj] = k;
                    } else {
                        dkeys[j+jj] = aes_dec[0][aes_sbox[k>>>24]]
                                    ^ aes_dec[1][aes_sbox[k>>>16&255]]
                                    ^ aes_dec[2][aes_sbox[k>>>8&255]]
                                    ^ aes_dec[3][aes_sbox[k&255]];
                    }
                }
            }

            // Set rounds number
            asm.set_rounds( ks + 5 );
        }

        var asm = function ( stdlib, foreign, buffer ) {
            "use asm";

            var S0 = 0, S1 = 0, S2 = 0, S3 = 0,
                I0 = 0, I1 = 0, I2 = 0, I3 = 0,
                N0 = 0, N1 = 0, N2 = 0, N3 = 0,
                M0 = 0, M1 = 0, M2 = 0, M3 = 0,
                H0 = 0, H1 = 0, H2 = 0, H3 = 0,
                R = 0;

            var HEAP = new stdlib.Uint32Array(buffer),
                DATA = new stdlib.Uint8Array(buffer);

            /**
             * AES core
             * @param {int} k - precomputed key schedule offset
             * @param {int} s - precomputed sbox table offset
             * @param {int} t - precomputed round table offset
             * @param {int} r - number of inner rounds to perform
             * @param {int} x0..x3 - 128-bit input block vector
             */
            function _core ( k, s, t, r, x0, x1, x2, x3 ) {
                k = k|0;
                s = s|0;
                t = t|0;
                r = r|0;
                x0 = x0|0;
                x1 = x1|0;
                x2 = x2|0;
                x3 = x3|0;

                var t1 = 0, t2 = 0, t3 = 0,
                    y0 = 0, y1 = 0, y2 = 0, y3 = 0,
                    i = 0;

                t1 = t|0x400, t2 = t|0x800, t3 = t|0xc00;

                // round 0
                x0 = x0 ^ HEAP[(k|0)>>2],
                x1 = x1 ^ HEAP[(k|4)>>2],
                x2 = x2 ^ HEAP[(k|8)>>2],
                x3 = x3 ^ HEAP[(k|12)>>2];

                // round 1..r
                for ( i = 16; (i|0) <= (r<<4); i = (i+16)|0 ) {
                    y0 = HEAP[(t|x0>>22&1020)>>2] ^ HEAP[(t1|x1>>14&1020)>>2] ^ HEAP[(t2|x2>>6&1020)>>2] ^ HEAP[(t3|x3<<2&1020)>>2] ^ HEAP[(k|i|0)>>2],
                    y1 = HEAP[(t|x1>>22&1020)>>2] ^ HEAP[(t1|x2>>14&1020)>>2] ^ HEAP[(t2|x3>>6&1020)>>2] ^ HEAP[(t3|x0<<2&1020)>>2] ^ HEAP[(k|i|4)>>2],
                    y2 = HEAP[(t|x2>>22&1020)>>2] ^ HEAP[(t1|x3>>14&1020)>>2] ^ HEAP[(t2|x0>>6&1020)>>2] ^ HEAP[(t3|x1<<2&1020)>>2] ^ HEAP[(k|i|8)>>2],
                    y3 = HEAP[(t|x3>>22&1020)>>2] ^ HEAP[(t1|x0>>14&1020)>>2] ^ HEAP[(t2|x1>>6&1020)>>2] ^ HEAP[(t3|x2<<2&1020)>>2] ^ HEAP[(k|i|12)>>2];
                    x0 = y0, x1 = y1, x2 = y2, x3 = y3;
                }

                // final round
                S0 = HEAP[(s|x0>>22&1020)>>2]<<24 ^ HEAP[(s|x1>>14&1020)>>2]<<16 ^ HEAP[(s|x2>>6&1020)>>2]<<8 ^ HEAP[(s|x3<<2&1020)>>2] ^ HEAP[(k|i|0)>>2],
                S1 = HEAP[(s|x1>>22&1020)>>2]<<24 ^ HEAP[(s|x2>>14&1020)>>2]<<16 ^ HEAP[(s|x3>>6&1020)>>2]<<8 ^ HEAP[(s|x0<<2&1020)>>2] ^ HEAP[(k|i|4)>>2],
                S2 = HEAP[(s|x2>>22&1020)>>2]<<24 ^ HEAP[(s|x3>>14&1020)>>2]<<16 ^ HEAP[(s|x0>>6&1020)>>2]<<8 ^ HEAP[(s|x1<<2&1020)>>2] ^ HEAP[(k|i|8)>>2],
                S3 = HEAP[(s|x3>>22&1020)>>2]<<24 ^ HEAP[(s|x0>>14&1020)>>2]<<16 ^ HEAP[(s|x1>>6&1020)>>2]<<8 ^ HEAP[(s|x2<<2&1020)>>2] ^ HEAP[(k|i|12)>>2];
            }

            /**
             * ECB mode encryption
             * @param {int} x0..x3 - 128-bit input block vector
             */
            function _ecb_enc ( x0, x1, x2, x3 ) {
                x0 = x0|0;
                x1 = x1|0;
                x2 = x2|0;
                x3 = x3|0;

                _core(
                    0x0000, 0x0800, 0x1000,
                    R,
                    x0,
                    x1,
                    x2,
                    x3
                );
            }

            /**
             * ECB mode decryption
             * @param {int} x0..x3 - 128-bit input block vector
             */
            function _ecb_dec ( x0, x1, x2, x3 ) {
                x0 = x0|0;
                x1 = x1|0;
                x2 = x2|0;
                x3 = x3|0;

                var t = 0;

                _core(
                    0x0400, 0x0c00, 0x2000,
                    R,
                    x0,
                    x3,
                    x2,
                    x1
                );

                t = S1, S1 = S3, S3 = t;
            }


            /**
             * CBC mode encryption
             * @param {int} x0..x3 - 128-bit input block vector
             */
            function _cbc_enc ( x0, x1, x2, x3 ) {
                x0 = x0|0;
                x1 = x1|0;
                x2 = x2|0;
                x3 = x3|0;

                _core(
                    0x0000, 0x0800, 0x1000,
                    R,
                    I0 ^ x0,
                    I1 ^ x1,
                    I2 ^ x2,
                    I3 ^ x3
                );

                I0 = S0,
                I1 = S1,
                I2 = S2,
                I3 = S3;
            }

            /**
             * CBC mode decryption
             * @param {int} x0..x3 - 128-bit input block vector
             */
            function _cbc_dec ( x0, x1, x2, x3 ) {
                x0 = x0|0;
                x1 = x1|0;
                x2 = x2|0;
                x3 = x3|0;

                var t = 0;

                _core(
                    0x0400, 0x0c00, 0x2000,
                    R,
                    x0,
                    x3,
                    x2,
                    x1
                );

                t = S1, S1 = S3, S3 = t;

                S0 = S0 ^ I0,
                S1 = S1 ^ I1,
                S2 = S2 ^ I2,
                S3 = S3 ^ I3;

                I0 = x0,
                I1 = x1,
                I2 = x2,
                I3 = x3;
            }

            /**
             * CFB mode encryption
             * @param {int} x0..x3 - 128-bit input block vector
             */
            function _cfb_enc ( x0, x1, x2, x3 ) {
                x0 = x0|0;
                x1 = x1|0;
                x2 = x2|0;
                x3 = x3|0;

                _core(
                    0x0000, 0x0800, 0x1000,
                    R,
                    I0,
                    I1,
                    I2,
                    I3
                );

                I0 = S0 = S0 ^ x0,
                I1 = S1 = S1 ^ x1,
                I2 = S2 = S2 ^ x2,
                I3 = S3 = S3 ^ x3;
            }


            /**
             * CFB mode decryption
             * @param {int} x0..x3 - 128-bit input block vector
             */
            function _cfb_dec ( x0, x1, x2, x3 ) {
                x0 = x0|0;
                x1 = x1|0;
                x2 = x2|0;
                x3 = x3|0;

                _core(
                    0x0000, 0x0800, 0x1000,
                    R,
                    I0,
                    I1,
                    I2,
                    I3
                );

                S0 = S0 ^ x0,
                S1 = S1 ^ x1,
                S2 = S2 ^ x2,
                S3 = S3 ^ x3;

                I0 = x0,
                I1 = x1,
                I2 = x2,
                I3 = x3;
            }

            /**
             * OFB mode encryption / decryption
             * @param {int} x0..x3 - 128-bit input block vector
             */
            function _ofb ( x0, x1, x2, x3 ) {
                x0 = x0|0;
                x1 = x1|0;
                x2 = x2|0;
                x3 = x3|0;

                _core(
                    0x0000, 0x0800, 0x1000,
                    R,
                    I0,
                    I1,
                    I2,
                    I3
                );

                I0 = S0,
                I1 = S1,
                I2 = S2,
                I3 = S3;

                S0 = S0 ^ x0,
                S1 = S1 ^ x1,
                S2 = S2 ^ x2,
                S3 = S3 ^ x3;
            }

            /**
             * CTR mode encryption / decryption
             * @param {int} x0..x3 - 128-bit input block vector
             */
            function _ctr ( x0, x1, x2, x3 ) {
                x0 = x0|0;
                x1 = x1|0;
                x2 = x2|0;
                x3 = x3|0;

                _core(
                    0x0000, 0x0800, 0x1000,
                    R,
                    N0,
                    N1,
                    N2,
                    N3
                );

                N3 = ( ~M3 & N3 ) | M3 & ( N3 + 1 ),
                N2 = ( ~M2 & N2 ) | M2 & ( N2 + ( (N3|0) == 0 ) ),
                N1 = ( ~M1 & N1 ) | M1 & ( N1 + ( (N2|0) == 0 ) ),
                N0 = ( ~M0 & N0 ) | M0 & ( N0 + ( (N1|0) == 0 ) );

                S0 = S0 ^ x0,
                S1 = S1 ^ x1,
                S2 = S2 ^ x2,
                S3 = S3 ^ x3;
            }

            /**
             * GCM mode MAC calculation
             * @param {int} x0..x3 - 128-bit input block vector
             */
            function _gcm_mac ( x0, x1, x2, x3 ) {
                x0 = x0|0;
                x1 = x1|0;
                x2 = x2|0;
                x3 = x3|0;

                var y0 = 0, y1 = 0, y2 = 0, y3 = 0,
                    z0 = 0, z1 = 0, z2 = 0, z3 = 0,
                    i = 0, c = 0;

                x0 = x0 ^ I0,
                x1 = x1 ^ I1,
                x2 = x2 ^ I2,
                x3 = x3 ^ I3;

                y0 = H0|0,
                y1 = H1|0,
                y2 = H2|0,
                y3 = H3|0;

                for ( ; (i|0) < 128; i = (i + 1)|0 ) {
                    if ( y0 >>> 31 ) {
                        z0 = z0 ^ x0,
                        z1 = z1 ^ x1,
                        z2 = z2 ^ x2,
                        z3 = z3 ^ x3;
                    }

                    y0 = (y0 << 1) | (y1 >>> 31),
                    y1 = (y1 << 1) | (y2 >>> 31),
                    y2 = (y2 << 1) | (y3 >>> 31),
                    y3 = (y3 << 1);

                    c = x3 & 1;

                    x3 = (x3 >>> 1) | (x2 << 31),
                    x2 = (x2 >>> 1) | (x1 << 31),
                    x1 = (x1 >>> 1) | (x0 << 31),
                    x0 = (x0 >>> 1);

                    if ( c ) x0 = x0 ^ 0xe1000000;
                }

                I0 = z0,
                I1 = z1,
                I2 = z2,
                I3 = z3;
            }

            /**
             * Set the internal rounds number.
             * @instance
             * @memberof AES_asm
             * @param {int} r - number if inner AES rounds
             */
            function set_rounds ( r ) {
                r = r|0;
                R = r;
            }

            /**
             * Populate the internal state of the module.
             * @instance
             * @memberof AES_asm
             * @param {int} s0...s3 - state vector
             */
            function set_state ( s0, s1, s2, s3 ) {
                s0 = s0|0;
                s1 = s1|0;
                s2 = s2|0;
                s3 = s3|0;

                S0 = s0,
                S1 = s1,
                S2 = s2,
                S3 = s3;
            }

            /**
             * Populate the internal iv of the module.
             * @instance
             * @memberof AES_asm
             * @param {int} i0...i3 - iv vector
             */
            function set_iv ( i0, i1, i2, i3 ) {
                i0 = i0|0;
                i1 = i1|0;
                i2 = i2|0;
                i3 = i3|0;

                I0 = i0,
                I1 = i1,
                I2 = i2,
                I3 = i3;
            }

            /**
             * Set nonce for CTR-family modes.
             * @instance
             * @memberof AES_asm
             * @param {int} n0..n3 - nonce vector
             */
            function set_nonce ( n0, n1, n2, n3 ) {
                n0 = n0|0;
                n1 = n1|0;
                n2 = n2|0;
                n3 = n3|0;

                N0 = n0,
                N1 = n1,
                N2 = n2,
                N3 = n3;
            }

            /**
             * Set counter mask for CTR-family modes.
             * @instance
             * @memberof AES_asm
             * @param {int} m0...m3 - counter mask vector
             */
            function set_mask ( m0, m1, m2, m3 ) {
                m0 = m0|0;
                m1 = m1|0;
                m2 = m2|0;
                m3 = m3|0;

                M0 = m0,
                M1 = m1,
                M2 = m2,
                M3 = m3;
            }

            /**
             * Set counter for CTR-family modes.
             * @instance
             * @memberof AES_asm
             * @param {int} c0...c3 - counter vector
             */
            function set_counter ( c0, c1, c2, c3 ) {
                c0 = c0|0;
                c1 = c1|0;
                c2 = c2|0;
                c3 = c3|0;

                N3 = ( ~M3 & N3 ) | M3 & c3,
                N2 = ( ~M2 & N2 ) | M2 & c2,
                N1 = ( ~M1 & N1 ) | M1 & c1,
                N0 = ( ~M0 & N0 ) | M0 & c0;
            }

            /**
             * Store the internal state vector into the heap.
             * @instance
             * @memberof AES_asm
             * @param {int} pos - offset where to put the data
             * @return {int} The number of bytes have been written into the heap, always 16.
             */
            function get_state ( pos ) {
                pos = pos|0;

                if ( pos & 15 ) return -1;

                DATA[pos|0] = S0>>>24,
                DATA[pos|1] = S0>>>16&255,
                DATA[pos|2] = S0>>>8&255,
                DATA[pos|3] = S0&255,
                DATA[pos|4] = S1>>>24,
                DATA[pos|5] = S1>>>16&255,
                DATA[pos|6] = S1>>>8&255,
                DATA[pos|7] = S1&255,
                DATA[pos|8] = S2>>>24,
                DATA[pos|9] = S2>>>16&255,
                DATA[pos|10] = S2>>>8&255,
                DATA[pos|11] = S2&255,
                DATA[pos|12] = S3>>>24,
                DATA[pos|13] = S3>>>16&255,
                DATA[pos|14] = S3>>>8&255,
                DATA[pos|15] = S3&255;

                return 16;
            }

            /**
             * Store the internal iv vector into the heap.
             * @instance
             * @memberof AES_asm
             * @param {int} pos - offset where to put the data
             * @return {int} The number of bytes have been written into the heap, always 16.
             */
            function get_iv ( pos ) {
                pos = pos|0;

                if ( pos & 15 ) return -1;

                DATA[pos|0] = I0>>>24,
                DATA[pos|1] = I0>>>16&255,
                DATA[pos|2] = I0>>>8&255,
                DATA[pos|3] = I0&255,
                DATA[pos|4] = I1>>>24,
                DATA[pos|5] = I1>>>16&255,
                DATA[pos|6] = I1>>>8&255,
                DATA[pos|7] = I1&255,
                DATA[pos|8] = I2>>>24,
                DATA[pos|9] = I2>>>16&255,
                DATA[pos|10] = I2>>>8&255,
                DATA[pos|11] = I2&255,
                DATA[pos|12] = I3>>>24,
                DATA[pos|13] = I3>>>16&255,
                DATA[pos|14] = I3>>>8&255,
                DATA[pos|15] = I3&255;

                return 16;
            }

            /**
             * GCM initialization.
             * @instance
             * @memberof AES_asm
             */
            function gcm_init ( ) {
                _ecb_enc( 0, 0, 0, 0 );
                H0 = S0,
                H1 = S1,
                H2 = S2,
                H3 = S3;
            }

            /**
             * Perform ciphering operation on the supplied data.
             * @instance
             * @memberof AES_asm
             * @param {int} mode - block cipher mode (see {@link AES_asm} mode constants)
             * @param {int} pos - offset of the data being processed
             * @param {int} len - length of the data being processed
             * @return {int} Actual amount of data have been processed.
             */
            function cipher ( mode, pos, len ) {
                mode = mode|0;
                pos = pos|0;
                len = len|0;

                var ret = 0;

                if ( pos & 15 ) return -1;

                while ( (len|0) >= 16 ) {
                    _cipher_modes[mode&7](
                        DATA[pos|0]<<24 | DATA[pos|1]<<16 | DATA[pos|2]<<8 | DATA[pos|3],
                        DATA[pos|4]<<24 | DATA[pos|5]<<16 | DATA[pos|6]<<8 | DATA[pos|7],
                        DATA[pos|8]<<24 | DATA[pos|9]<<16 | DATA[pos|10]<<8 | DATA[pos|11],
                        DATA[pos|12]<<24 | DATA[pos|13]<<16 | DATA[pos|14]<<8 | DATA[pos|15]
                    );

                    DATA[pos|0] = S0>>>24,
                    DATA[pos|1] = S0>>>16&255,
                    DATA[pos|2] = S0>>>8&255,
                    DATA[pos|3] = S0&255,
                    DATA[pos|4] = S1>>>24,
                    DATA[pos|5] = S1>>>16&255,
                    DATA[pos|6] = S1>>>8&255,
                    DATA[pos|7] = S1&255,
                    DATA[pos|8] = S2>>>24,
                    DATA[pos|9] = S2>>>16&255,
                    DATA[pos|10] = S2>>>8&255,
                    DATA[pos|11] = S2&255,
                    DATA[pos|12] = S3>>>24,
                    DATA[pos|13] = S3>>>16&255,
                    DATA[pos|14] = S3>>>8&255,
                    DATA[pos|15] = S3&255;

                    ret = (ret + 16)|0,
                    pos = (pos + 16)|0,
                    len = (len - 16)|0;
                }

                return ret|0;
            }

            /**
             * Calculates MAC of the supplied data.
             * @instance
             * @memberof AES_asm
             * @param {int} mode - block cipher mode (see {@link AES_asm} mode constants)
             * @param {int} pos - offset of the data being processed
             * @param {int} len - length of the data being processed
             * @return {int} Actual amount of data have been processed.
             */
            function mac ( mode, pos, len ) {
                mode = mode|0;
                pos = pos|0;
                len = len|0;

                var ret = 0;

                if ( pos & 15 ) return -1;

                while ( (len|0) >= 16 ) {
                    _mac_modes[mode&1](
                        DATA[pos|0]<<24 | DATA[pos|1]<<16 | DATA[pos|2]<<8 | DATA[pos|3],
                        DATA[pos|4]<<24 | DATA[pos|5]<<16 | DATA[pos|6]<<8 | DATA[pos|7],
                        DATA[pos|8]<<24 | DATA[pos|9]<<16 | DATA[pos|10]<<8 | DATA[pos|11],
                        DATA[pos|12]<<24 | DATA[pos|13]<<16 | DATA[pos|14]<<8 | DATA[pos|15]
                    );

                    ret = (ret + 16)|0,
                    pos = (pos + 16)|0,
                    len = (len - 16)|0;
                }

                return ret|0;
            }

            /**
             * AES cipher modes table (virual methods)
             */
            var _cipher_modes = [ _ecb_enc, _ecb_dec, _cbc_enc, _cbc_dec, _cfb_enc, _cfb_dec, _ofb, _ctr ];

            /**
             * AES MAC modes table (virual methods)
             */
            var _mac_modes = [ _cbc_enc, _gcm_mac ];

            /**
             * Asm.js module exports
             */
            return {
                set_rounds: set_rounds,
                set_state:  set_state,
                set_iv:     set_iv,
                set_nonce:  set_nonce,
                set_mask:   set_mask,
                set_counter:set_counter,
                get_state:  get_state,
                get_iv:     get_iv,
                gcm_init:   gcm_init,
                cipher:     cipher,
                mac:        mac
            };
        }( stdlib, foreign, buffer );

        asm.set_key = set_key;

        return asm;
    };

    /**
     * AES enciphering mode constants
     * @enum {int}
     * @const
     */
    wrapper.ENC = {
        ECB: 0,
        CBC: 2,
        CFB: 4,
        OFB: 6,
        CTR: 7
    },

    /**
     * AES deciphering mode constants
     * @enum {int}
     * @const
     */
    wrapper.DEC = {
        ECB: 1,
        CBC: 3,
        CFB: 5,
        OFB: 6,
        CTR: 7
    },

    /**
     * AES MAC mode constants
     * @enum {int}
     * @const
     */
    wrapper.MAC = {
        CBC: 0,
        GCM: 1
    };

    /**
     * Heap data offset
     * @type {int}
     * @const
     */
    wrapper.HEAP_DATA = 0x4000;

    return wrapper;
}();

function AES ( options ) {
    options = options || {};

    this.heap = _heap_init( Uint8Array, options ).subarray( AES_asm.HEAP_DATA );
    this.asm = options.asm || AES_asm( global, null, this.heap.buffer );
    this.mode = null;
    this.key = null;

    this.reset( options );
}

function AES_set_key ( key ) {
    if ( key !== undefined ) {
        if ( is_buffer(key) || is_bytes(key) ) {
            key = new Uint8Array(key);
        }
        else if ( is_string(key) ) {
            key = string_to_bytes(key);
        }
        else {
            throw new TypeError("unexpected key type");
        }

        var keylen = key.length;
        if ( keylen !== 16 && keylen !== 24 && keylen !== 32 )
            throw new IllegalArgumentError("illegal key size");

        var keyview = new DataView( key.buffer, key.byteOffset, key.byteLength );
        this.asm.set_key(
            keylen >> 2,
            keyview.getUint32(0),
            keyview.getUint32(4),
            keyview.getUint32(8),
            keyview.getUint32(12),
            keylen > 16 ? keyview.getUint32(16) : 0,
            keylen > 16 ? keyview.getUint32(20) : 0,
            keylen > 24 ? keyview.getUint32(24) : 0,
            keylen > 24 ? keyview.getUint32(28) : 0
        );

        this.key = key;
    }
    else if ( !this.key ) {
        throw new Error("key is required");
    }
}

function AES_set_iv ( iv ) {
    if ( iv !== undefined ) {
        if ( is_buffer(iv) || is_bytes(iv) ) {
            iv = new Uint8Array(iv);
        }
        else if ( is_string(iv) ) {
            iv = string_to_bytes(iv);
        }
        else {
            throw new TypeError("unexpected iv type");
        }

        if ( iv.length !== 16 )
            throw new IllegalArgumentError("illegal iv size");

        var ivview = new DataView( iv.buffer, iv.byteOffset, iv.byteLength );

        this.iv = iv;
        this.asm.set_iv( ivview.getUint32(0), ivview.getUint32(4), ivview.getUint32(8), ivview.getUint32(12) );
    }
    else {
        this.iv = null;
        this.asm.set_iv( 0, 0, 0, 0 );
    }
}

function AES_set_padding ( padding ) {
    if ( padding !== undefined ) {
        this.padding = !!padding;
    }
    else {
        this.padding = true;
    }
}

function AES_reset ( options ) {
    options = options || {};

    this.result = null;
    this.pos = 0;
    this.len = 0;

    AES_set_key.call( this, options.key );
    if ( this.hasOwnProperty('iv') ) AES_set_iv.call( this, options.iv );
    if ( this.hasOwnProperty('padding') ) AES_set_padding.call( this, options.padding );

    return this;
}

function AES_Encrypt_process ( data ) {
    if ( is_string(data) )
        data = string_to_bytes(data);

    if ( is_buffer(data) )
        data = new Uint8Array(data);

    if ( !is_bytes(data) )
        throw new TypeError("data isn't of expected type");

    var asm = this.asm,
        heap = this.heap,
        amode = AES_asm.ENC[this.mode],
        hpos = AES_asm.HEAP_DATA,
        pos = this.pos,
        len = this.len,
        dpos = 0,
        dlen = data.length || 0,
        rpos = 0,
        rlen = (len + dlen) & -16,
        wlen = 0;

    var result = new Uint8Array(rlen);

    while ( dlen > 0 ) {
        wlen = _heap_write( heap, pos+len, data, dpos, dlen );
        len  += wlen;
        dpos += wlen;
        dlen -= wlen;

        wlen = asm.cipher( amode, hpos + pos, len );

        if ( wlen ) result.set( heap.subarray( pos, pos + wlen ), rpos );
        rpos += wlen;

        if ( wlen < len ) {
            pos += wlen;
            len -= wlen;
        } else {
            pos = 0;
            len = 0;
        }
    }

    this.result = result;
    this.pos = pos;
    this.len = len;

    return this;
}

function AES_Encrypt_finish ( data ) {
    var presult = null,
        prlen = 0;

    if ( data !== undefined ) {
        presult = AES_Encrypt_process.call( this, data ).result;
        prlen = presult.length;
    }

    var asm = this.asm,
        heap = this.heap,
        amode = AES_asm.ENC[this.mode],
        hpos = AES_asm.HEAP_DATA,
        pos = this.pos,
        len = this.len,
        plen = 16 - len % 16,
        rlen = len;

    if ( this.hasOwnProperty('padding') ) {
        if ( this.padding ) {
            for ( var p = 0; p < plen; ++p ) heap[ pos + len + p ] = plen;
            len += plen;
            rlen = len;
        }
        else if ( len % 16 ) {
            throw new IllegalArgumentError("data length must be a multiple of the block size");
        }
    }
    else {
        len += plen;
    }

    var result = new Uint8Array( prlen + rlen );

    if ( prlen ) result.set( presult );

    if ( len ) asm.cipher( amode, hpos + pos, len );

    if ( rlen ) result.set( heap.subarray( pos, pos + rlen ), prlen );

    this.result = result;
    this.pos = 0;
    this.len = 0;

    return this;
}

function AES_Decrypt_process ( data ) {
    if ( is_string(data) )
        data = string_to_bytes(data);

    if ( is_buffer(data) )
        data = new Uint8Array(data);

    if ( !is_bytes(data) )
        throw new TypeError("data isn't of expected type");

    var asm = this.asm,
        heap = this.heap,
        amode = AES_asm.DEC[this.mode],
        hpos = AES_asm.HEAP_DATA,
        pos = this.pos,
        len = this.len,
        dpos = 0,
        dlen = data.length || 0,
        rpos = 0,
        rlen = (len + dlen) & -16,
        plen = 0,
        wlen = 0;

    if ( this.hasOwnProperty('padding') && this.padding ) {
        plen = len + dlen - rlen || 16;
        rlen -= plen;
    }

    var result = new Uint8Array(rlen);

    while ( dlen > 0 ) {
        wlen = _heap_write( heap, pos+len, data, dpos, dlen );
        len  += wlen;
        dpos += wlen;
        dlen -= wlen;

        wlen = asm.cipher( amode, hpos + pos, len - ( !dlen ? plen : 0 ) );

        if ( wlen ) result.set( heap.subarray( pos, pos + wlen ), rpos );
        rpos += wlen;

        if ( wlen < len ) {
            pos += wlen;
            len -= wlen;
        } else {
            pos = 0;
            len = 0;
        }
    }

    this.result = result;
    this.pos = pos;
    this.len = len;

    return this;
}

function AES_Decrypt_finish ( data ) {
    var presult = null,
        prlen = 0;

    if ( data !== undefined ) {
        presult = AES_Decrypt_process.call( this, data ).result;
        prlen = presult.length;
    }

    var asm = this.asm,
        heap = this.heap,
        amode = AES_asm.DEC[this.mode],
        hpos = AES_asm.HEAP_DATA,
        pos = this.pos,
        len = this.len,
        rlen = len;

    if ( len > 0 ) {
        if ( len % 16 ) {
            if ( this.hasOwnProperty('padding') ) {
                throw new IllegalArgumentError("data length must be a multiple of the block size");
            } else {
                len += 16 - len % 16;
            }
        }

        asm.cipher( amode, hpos + pos, len );

        if ( this.hasOwnProperty('padding') && this.padding ) {
            var pad = heap[ pos + rlen - 1 ];
            if ( pad < 1 || pad > 16 || pad > rlen )
                throw new SecurityError("bad padding");

            var pcheck = 0;
            for ( var i = pad; i > 1; i-- ) pcheck |= pad ^ heap[ pos + rlen - i ];
            if ( pcheck )
                throw new SecurityError("bad padding");

            rlen -= pad;
        }
    }

    var result = new Uint8Array( prlen + rlen );

    if ( prlen > 0 ) {
        result.set( presult );
    }

    if ( rlen > 0 ) {
        result.set( heap.subarray( pos, pos + rlen ), prlen );
    }

    this.result = result;
    this.pos = 0;
    this.len = 0;

    return this;
}

/**
 * Electronic Code Book Mode (ECB)
 */

function AES_ECB ( options ) {
    this.padding = true;

    AES.call( this, options );

    this.mode = 'ECB';
}

var AES_ECB_prototype = AES_ECB.prototype;
AES_ECB_prototype.BLOCK_SIZE = 16;
AES_ECB_prototype.reset = AES_reset;
AES_ECB_prototype.encrypt = AES_Encrypt_finish;
AES_ECB_prototype.decrypt = AES_Decrypt_finish;

function AES_ECB_Encrypt ( options ) {
    AES_ECB.call( this, options );
}

var AES_ECB_Encrypt_prototype = AES_ECB_Encrypt.prototype;
AES_ECB_Encrypt_prototype.BLOCK_SIZE = 16;
AES_ECB_Encrypt_prototype.reset = AES_reset;
AES_ECB_Encrypt_prototype.process = AES_Encrypt_process;
AES_ECB_Encrypt_prototype.finish = AES_Encrypt_finish;

function AES_ECB_Decrypt ( options ) {
    AES_ECB.call( this, options );
}

var AES_ECB_Decrypt_prototype = AES_ECB_Decrypt.prototype;
AES_ECB_Decrypt_prototype.BLOCK_SIZE = 16;
AES_ECB_Decrypt_prototype.reset = AES_reset;
AES_ECB_Decrypt_prototype.process = AES_Decrypt_process;
AES_ECB_Decrypt_prototype.finish = AES_Decrypt_finish;

/**
 * Cipher Block Chaining Mode (CBC)
 */

function AES_CBC ( options ) {
    this.padding = true;
    this.iv = null;

    AES.call( this, options );

    this.mode = 'CBC';
}

var AES_CBC_prototype = AES_CBC.prototype;
AES_CBC_prototype.BLOCK_SIZE = 16;
AES_CBC_prototype.reset = AES_reset;
AES_CBC_prototype.encrypt = AES_Encrypt_finish;
AES_CBC_prototype.decrypt = AES_Decrypt_finish;

function AES_CBC_Encrypt ( options ) {
    AES_CBC.call( this, options );
}

var AES_CBC_Encrypt_prototype = AES_CBC_Encrypt.prototype;
AES_CBC_Encrypt_prototype.BLOCK_SIZE = 16;
AES_CBC_Encrypt_prototype.reset = AES_reset;
AES_CBC_Encrypt_prototype.process = AES_Encrypt_process;
AES_CBC_Encrypt_prototype.finish = AES_Encrypt_finish;

function AES_CBC_Decrypt ( options ) {
    AES_CBC.call( this, options );
}

var AES_CBC_Decrypt_prototype = AES_CBC_Decrypt.prototype;
AES_CBC_Decrypt_prototype.BLOCK_SIZE = 16;
AES_CBC_Decrypt_prototype.reset = AES_reset;
AES_CBC_Decrypt_prototype.process = AES_Decrypt_process;
AES_CBC_Decrypt_prototype.finish = AES_Decrypt_finish;

/**
 * Counter Mode (CTR)
 */

function AES_CTR ( options ) {
    this.nonce = null,
    this.counter = 0,
    this.counterSize = 0;

    AES.call( this, options );

    this.mode = 'CTR';
}

function AES_CTR_Crypt ( options ) {
    AES_CTR.call( this, options );
}

function AES_CTR_set_options ( nonce, counter, size ) {
    if ( size !== undefined ) {
        if ( size < 8 || size > 48 )
            throw new IllegalArgumentError("illegal counter size");

        this.counterSize = size;

        var mask = Math.pow( 2, size ) - 1;
        this.asm.set_mask( 0, 0, (mask / 0x100000000)|0, mask|0 );
    }
    else {
        this.counterSize = size = 48;
        this.asm.set_mask( 0, 0, 0xffff, 0xffffffff );
    }

    if ( nonce !== undefined ) {
        if ( is_buffer(nonce) || is_bytes(nonce) ) {
            nonce = new Uint8Array(nonce);
        }
        else if ( is_string(nonce) ) {
            nonce = string_to_bytes(nonce);
        }
        else {
            throw new TypeError("unexpected nonce type");
        }

        var len = nonce.length;
        if ( !len || len > 16 )
            throw new IllegalArgumentError("illegal nonce size");

        this.nonce = nonce;

        var view = new DataView( new ArrayBuffer(16) );
        new Uint8Array(view.buffer).set(nonce);

        this.asm.set_nonce( view.getUint32(0), view.getUint32(4), view.getUint32(8), view.getUint32(12) );
    }
    else {
        throw new Error("nonce is required");
    }

    if ( counter !== undefined ) {
        if ( !is_number(counter) )
            throw new TypeError("unexpected counter type");

        if ( counter < 0 || counter >= Math.pow( 2, size ) )
            throw new IllegalArgumentError("illegal counter value");

        this.counter = counter;

        this.asm.set_counter( 0, 0, (counter / 0x100000000)|0, counter|0 );
    }
    else {
        this.counter = counter = 0;
    }
}

function AES_CTR_reset ( options ) {
    options = options || {};

    AES_reset.call( this, options );

    AES_CTR_set_options.call( this, options.nonce, options.counter, options.counterSize );

    return this;
}

var AES_CTR_prototype = AES_CTR.prototype;
AES_CTR_prototype.BLOCK_SIZE = 16;
AES_CTR_prototype.reset = AES_CTR_reset;
AES_CTR_prototype.encrypt = AES_Encrypt_finish;
AES_CTR_prototype.decrypt = AES_Encrypt_finish;

var AES_CTR_Crypt_prototype = AES_CTR_Crypt.prototype;
AES_CTR_Crypt_prototype.BLOCK_SIZE = 16;
AES_CTR_Crypt_prototype.reset = AES_CTR_reset;
AES_CTR_Crypt_prototype.process = AES_Encrypt_process;
AES_CTR_Crypt_prototype.finish = AES_Encrypt_finish;

/**
 * Counter with CBC-MAC (CCM)
 *
 * Due to JS limitations (52 bits of Number precision) maximum encrypted message length
 * is limited to ~4 PiB ( 2^52 - 16 ) per `nonce`-`key` pair.
 * That also limits `lengthSize` parameter maximum value to 7 (not 8 as described in RFC3610).
 *
 * Additional authenticated data `adata` maximum length is choosen to be no more than 65279 bytes ( 2^16 - 2^8 ),
 * wich is considered enough for the most of use-cases.
 *
 * And one more important thing: in case of progressive ciphering of a data stream (in other
 * words when data can't be held in-memory at a whole and are ciphered chunk-by-chunk)
 * you have to know the `dataLength` in advance and pass that value to the cipher options.
 */

function _cbc_mac_process ( data ) {
    var heap = this.heap,
        asm  = this.asm,
        dpos = 0,
        dlen = data.length || 0,
        wlen = 0;

    while ( dlen > 0 ) {
        wlen = _heap_write( heap, 0, data, dpos, dlen );
        while ( wlen & 15 ) heap[ wlen++ ] = 0;
        dpos += wlen;
        dlen -= wlen;

        asm.mac( AES_asm.MAC.CBC, AES_asm.HEAP_DATA, wlen );
    }
}

var _AES_CCM_adata_maxLength = 65279,            // 2^16 - 2^8
    _AES_CCM_data_maxLength = 4503599627370480;  // 2^52 - 2^4

function AES_CCM ( options ) {
    this.tagSize    = 16;
    this.lengthSize = 4;
    this.nonce      = null;
    this.adata      = null;
    this.iv         = null;
    this.counter    = 1;
    this.dataLength = -1;

    AES.call( this, options );

    this.mode       = 'CCM';
}

function AES_CCM_Encrypt ( options ) {
    AES_CCM.call( this, options );
}

function AES_CCM_Decrypt ( options ) {
    AES_CCM.call( this, options );
}

function AES_CCM_calculate_iv () {
    var nonce = this.nonce,
        adata = this.adata,
        tagSize = this.tagSize,
        lengthSize = this.lengthSize,
        dataLength = this.dataLength;

    var data = new Uint8Array( 16 + ( adata ? 2 + adata.length : 0 ) );

    // B0: flags(adata?, M', L'), nonce, len(data)
    data[0] = ( adata ? 64 : 0 ) | ( (tagSize-2)<<2 ) | ( lengthSize-1 );
    data.set( nonce, 1 );
    if (lengthSize > 6) data[9]  = ( dataLength / 0x100000000 )>>>16&15;
    if (lengthSize > 5) data[10] = ( dataLength / 0x100000000 )>>>8&255;
    if (lengthSize > 4) data[11] = ( dataLength / 0x100000000 )&255;
    if (lengthSize > 3) data[12] = dataLength>>>24;
    if (lengthSize > 2) data[13] = dataLength>>>16&255;
    data[14] = dataLength>>>8&255;
    data[15] = dataLength&255;

    // B*: len(adata), adata
    if ( adata ) {
        data[16] = adata.length>>>8&255;
        data[17] = adata.length&255;
        data.set( adata, 18 );
    }

    _cbc_mac_process.call( this, data );
    this.asm.get_state( AES_asm.HEAP_DATA );

    this.iv = new Uint8Array( this.heap.subarray( 0, 16 ) );
}

function AES_CCM_reset ( options ) {
    options = options || {};

    AES_reset.call( this, options );

    var lengthSize = options.lengthSize,
        tagSize = options.tagSize,
        dataLength = options.dataLength,
        nonce = options.nonce,
        counter = options.counter,
        adata = options.adata,
        iv = options.iv;

    if ( tagSize !== undefined ) {
        if ( !is_number(tagSize) )
            throw new TypeError("tagSize must be a number");

        if ( tagSize < 4 || tagSize > 16 || tagSize & 1 )
            throw new IllegalArgumentError("illegal tagSize value");

        this.tagSize = tagSize;
    }
    else {
        this.tagSize = 16;
    }

    if ( nonce !== undefined ) {
        if ( is_bytes(nonce) || is_buffer(nonce) ) {
            nonce = new Uint8Array(nonce);
        }
        else if ( is_string(nonce) ) {
            nonce = string_to_bytes(nonce);
        }
        else {
            throw new TypeError("unexpected nonce type");
        }

        if ( nonce.length < 8 || nonce.length > 13 )
            throw new IllegalArgumentError("illegal nonce length");

        this.nonce = nonce;
        this.lengthSize = lengthSize = 15 - nonce.length;

        nonce = new Uint8Array( nonce.length + 1 );
        nonce[0] = lengthSize - 1, nonce.set( this.nonce, 1 );
    }
    else {
        throw new Error("nonce is required");
    }

    // Either counter, iv
    if ( iv !== undefined ) {
        if ( adata !== undefined )
            throw new IllegalStateError("you should specify either adata or iv, not both");

        if ( !is_number(counter) )
            throw new TypeError("counter must be a number");

        if ( counter < 1 || counter >= ( Math.pow( 2, 8*lengthSize ) - 16 ) )
            throw new IllegalArgumentError("illegal counter value");

        this.counter = counter;
    }
    // Or adata, dataLength
    else if ( adata !== undefined && adata !== null ) {
        if ( is_bytes(adata) || is_buffer(adata) ) {
            adata = new Uint8Array(adata);
        }
        else if ( is_string(adata) ) {
            adata = string_to_bytes(adata);
        }
        else {
            throw new TypeError("unexpected adata type");
        }

        if ( adata.length > _AES_CCM_adata_maxLength )
            throw new IllegalArgumentError("illegal adata length");

        if ( !is_number(dataLength) )
            throw new TypeError("dataLength must be a number");

        if ( dataLength < 0 || dataLength > _AES_CCM_data_maxLength || dataLength > ( Math.pow( 2, 8*lengthSize ) - 16 ) )
            throw new IllegalArgumentError("illegal dataLength value");

        this.adata = adata.length ? adata : null;
        this.dataLength = dataLength;
        this.counter = counter = 1;

        AES_CCM_calculate_iv.call(this);
        iv = this.iv;
    }
    // Assume adata is empty, check dataLength
    else {
        if ( !is_number(dataLength) )
            throw new TypeError("dataLength must be a number");

        if ( dataLength < 0 || dataLength > _AES_CCM_data_maxLength || dataLength > ( Math.pow( 2, 8*lengthSize ) - 16 ) )
            throw new IllegalArgumentError("illegal dataLength value");

        this.adata = null;
        this.dataLength = dataLength;
        this.counter = counter = 1;

        AES_CCM_calculate_iv.call(this);
        iv = this.iv;
    }

    AES_set_iv.call( this, iv );
    AES_CTR_set_options.call( this, nonce, counter, 8*lengthSize );

    return this;
}

function AES_CCM_Encrypt_process ( data ) {
    if ( is_string(data) )
        data = string_to_bytes(data);

    if ( is_buffer(data) )
        data = new Uint8Array(data);

    if ( !is_bytes(data) )
        throw new TypeError("data isn't of expected type");

    var dpos = 0,
        dlen = data.length || 0,
        asm = this.asm,
        heap = this.heap,
        counter = this.counter,
        pos = this.pos,
        len = this.len,
        rpos = 0,
        rlen = ( len + dlen ) & -16,
        wlen = 0;

    if ( ((counter-1)<<4) + len + dlen > _AES_CCM_data_maxLength ) // ??? should check against lengthSize
        throw new RangeError("counter overflow");

    var result = new Uint8Array(rlen);

    while ( dlen > 0 ) {
        wlen = _heap_write( heap, pos+len, data, dpos, dlen );
        len  += wlen;
        dpos += wlen;
        dlen -= wlen;

        wlen = asm.mac( AES_asm.MAC.CBC, AES_asm.HEAP_DATA + pos, len );
        wlen = asm.cipher( AES_asm.ENC.CTR, AES_asm.HEAP_DATA + pos, wlen );

        if ( wlen ) result.set( heap.subarray( pos, pos + wlen ), rpos );
        counter += (wlen>>>4);
        rpos += wlen;

        if ( wlen < len ) {
            pos += wlen;
            len -= wlen;
        } else {
            pos = 0;
            len = 0;
        }
    }

    this.result = result;
    this.counter = counter;
    this.pos = pos;
    this.len = len;

    return this;
}

function AES_CCM_Encrypt_finish () {
    var asm = this.asm,
        heap = this.heap,
        tagSize = this.tagSize,
        pos = this.pos,
        len = this.len,
        wlen = 0;

    var result = new Uint8Array( len + tagSize );

    for ( var i = len; i & 15; i++ ) heap[ pos + i ] = 0;

    wlen = asm.mac( AES_asm.MAC.CBC, AES_asm.HEAP_DATA + pos, i );
    wlen = asm.cipher( AES_asm.ENC.CTR, AES_asm.HEAP_DATA + pos, i );
    if ( len ) result.set( heap.subarray( pos, pos + len ) );

    asm.set_counter( 0, 0, 0, 0 );
    asm.get_iv( AES_asm.HEAP_DATA );
    asm.cipher( AES_asm.ENC.CTR, AES_asm.HEAP_DATA, 16 );
    result.set( heap.subarray( 0, tagSize ), len );

    this.result = result;
    this.counter = 1;
    this.pos = 0;
    this.len = 0;

    return this;
}

function AES_CCM_encrypt ( data ) {
    this.dataLength = data.length || 0;

    var result1 = AES_CCM_Encrypt_process.call( this, data ).result,
        result2 = AES_CCM_Encrypt_finish.call(this).result,
        result;

    result = new Uint8Array( result1.length + result2.length );
    if ( result1.length ) result.set(result1);
    if ( result2.length ) result.set( result2, result1.length );
    this.result = result;

    return this;
}

function AES_CCM_Decrypt_process ( data ) {
    if ( is_string(data) )
        data = string_to_bytes(data);

    if ( is_buffer(data) )
        data = new Uint8Array(data);

    if ( !is_bytes(data) )
        throw new TypeError("data isn't of expected type");

    var dpos = 0,
        dlen = data.length || 0,
        asm = this.asm,
        heap = this.heap,
        counter = this.counter,
        tagSize = this.tagSize,
        pos = this.pos,
        len = this.len,
        rpos = 0,
        rlen = len + dlen > tagSize ? ( len + dlen - tagSize ) & -16 : 0,
        tlen = len + dlen - rlen,
        wlen = 0;

    if ( ((counter-1)<<4) + len + dlen > _AES_CCM_data_maxLength )
        throw new RangeError("counter overflow");

    var result = new Uint8Array(rlen);

    while ( dlen > tlen ) {
        wlen = _heap_write( heap, pos+len, data, dpos, dlen-tlen );
        len  += wlen;
        dpos += wlen;
        dlen -= wlen;

        wlen = asm.cipher( AES_asm.DEC.CTR, AES_asm.HEAP_DATA + pos, wlen );
        wlen = asm.mac( AES_asm.MAC.CBC, AES_asm.HEAP_DATA + pos, wlen );

        if ( wlen ) result.set( heap.subarray( pos, pos+wlen ), rpos );
        counter += (wlen>>>4);
        rpos += wlen;

        pos = 0;
        len = 0;
    }

    if ( dlen > 0 ) {
        len += _heap_write( heap, 0, data, dpos, dlen );
    }

    this.result = result;
    this.counter = counter;
    this.pos = pos;
    this.len = len;

    return this;
}

function AES_CCM_Decrypt_finish () {
    var asm = this.asm,
        heap = this.heap,
        tagSize = this.tagSize,
        pos = this.pos,
        len = this.len,
        rlen = len - tagSize,
        wlen = 0;

    if ( len < tagSize )
        throw new IllegalStateError("authentication tag not found");

    var result = new Uint8Array(rlen),
        atag = new Uint8Array( heap.subarray( pos+rlen, pos+len ) );

    wlen = asm.cipher( AES_asm.DEC.CTR, AES_asm.HEAP_DATA + pos, (rlen + 15) & -16 );
    result.set( heap.subarray( pos, pos + rlen ) );

    for ( var i = rlen; i & 15; i++ ) heap[ pos + i ] = 0;
    wlen = asm.mac( AES_asm.MAC.CBC, AES_asm.HEAP_DATA + pos, i );

    asm.set_counter( 0, 0, 0, 0 );
    asm.get_iv( AES_asm.HEAP_DATA );
    asm.cipher( AES_asm.ENC.CTR, AES_asm.HEAP_DATA, 16 );

    var acheck = 0;
    for ( var i = 0; i < tagSize; ++i ) acheck |= atag[i] ^ heap[i];
    if ( acheck )
        throw new SecurityError("data integrity check failed");

    this.result = result;
    this.counter = 1;
    this.pos = 0;
    this.len = 0;

    return this;
}

function AES_CCM_decrypt ( data ) {
    this.dataLength = data.length || 0;

    var result1 = AES_CCM_Decrypt_process.call( this, data ).result,
        result2 = AES_CCM_Decrypt_finish.call(this).result,
        result;

    result = new Uint8Array( result1.length + result2.length );
    if ( result1.length ) result.set(result1);
    if ( result2.length ) result.set( result2, result1.length );
    this.result = result;

    return this;
}

var AES_CCM_prototype = AES_CCM.prototype;
AES_CCM_prototype.BLOCK_SIZE = 16;
AES_CCM_prototype.reset = AES_CCM_reset;
AES_CCM_prototype.encrypt = AES_CCM_encrypt;
AES_CCM_prototype.decrypt = AES_CCM_decrypt;

var AES_CCM_Encrypt_prototype = AES_CCM_Encrypt.prototype;
AES_CCM_Encrypt_prototype.BLOCK_SIZE = 16;
AES_CCM_Encrypt_prototype.reset = AES_CCM_reset;
AES_CCM_Encrypt_prototype.process = AES_CCM_Encrypt_process;
AES_CCM_Encrypt_prototype.finish = AES_CCM_Encrypt_finish;

var AES_CCM_Decrypt_prototype = AES_CCM_Decrypt.prototype;
AES_CCM_Decrypt_prototype.BLOCK_SIZE = 16;
AES_CCM_Decrypt_prototype.reset = AES_CCM_reset;
AES_CCM_Decrypt_prototype.process = AES_CCM_Decrypt_process;
AES_CCM_Decrypt_prototype.finish = AES_CCM_Decrypt_finish;

/**
 * Galois/Counter mode
 */

var _AES_GCM_data_maxLength = 68719476704;  // 2^36 - 2^5

function _gcm_mac_process ( data ) {
    var heap = this.heap,
        asm  = this.asm,
        dpos = 0,
        dlen = data.length || 0,
        wlen = 0;

    while ( dlen > 0 ) {
        wlen = _heap_write( heap, 0, data, dpos, dlen );
        dpos += wlen;
        dlen -= wlen;

        while ( wlen & 15 ) heap[ wlen++ ] = 0;

        asm.mac( AES_asm.MAC.GCM, AES_asm.HEAP_DATA, wlen );
    }
}

function AES_GCM ( options ) {
    this.nonce      = null;
    this.adata      = null;
    this.iv         = null;
    this.counter    = 1;
    this.tagSize    = 16;

    AES.call( this, options );

    this.mode       = 'GCM';
}

function AES_GCM_Encrypt ( options ) {
    AES_GCM.call( this, options );
}

function AES_GCM_Decrypt ( options ) {
    AES_GCM.call( this, options );
}

function AES_GCM_reset ( options ) {
    options = options || {};

    AES_reset.call( this, options );

    var asm = this.asm,
        heap = this.heap;

    asm.gcm_init();

    var tagSize = options.tagSize;
    if ( tagSize !== undefined ) {
        if ( !is_number(tagSize) )
            throw new TypeError("tagSize must be a number");

        if ( tagSize < 4 || tagSize > 16 )
            throw new IllegalArgumentError("illegal tagSize value");

        this.tagSize = tagSize;
    }
    else {
        this.tagSize = 16;
    }

    var nonce = options.nonce;
    if ( nonce !== undefined ) {
        if ( is_bytes(nonce) || is_buffer(nonce) ) {
            nonce = new Uint8Array(nonce);
        }
        else if ( is_string(nonce) ) {
            nonce = string_to_bytes(nonce);
        }
        else {
            throw new TypeError("unexpected nonce type");
        }

        this.nonce = nonce;

        var noncelen = nonce.length || 0,
            noncebuf = new Uint8Array(16);
        if ( noncelen !== 12 ) {
            _gcm_mac_process.call( this, nonce );

            heap[0] = heap[1] = heap[2] = heap[3] = heap[4] = heap[5] = heap[6] = heap[7] = heap[8] = heap[9] = heap[10] = 0,
            heap[11] = noncelen>>>29,
            heap[12] = noncelen>>>21&255,
            heap[13] = noncelen>>>13&255,
            heap[14] = noncelen>>>5&255,
            heap[15] = noncelen<<3&255;
            asm.mac( AES_asm.MAC.GCM, AES_asm.HEAP_DATA, 16 );

            asm.get_iv( AES_asm.HEAP_DATA );
            asm.set_iv();

            noncebuf.set( heap.subarray( 0, 16 ) );
        }
        else {
            noncebuf.set(nonce);
            noncebuf[15] = 1;
        }

        var nonceview = new DataView( noncebuf.buffer );
        this.gamma0 = nonceview.getUint32(12);

        asm.set_nonce( nonceview.getUint32(0), nonceview.getUint32(4), nonceview.getUint32(8), 0 );
        asm.set_mask( 0, 0, 0, 0xffffffff );
    }
    else {
        throw new Error("nonce is required");
    }

    var adata = options.adata;
    if ( adata !== undefined && adata !== null ) {
        if ( is_bytes(adata) || is_buffer(adata) ) {
            adata = new Uint8Array(adata);
        }
        else if ( is_string(adata) ) {
            adata = string_to_bytes(adata);
        }
        else {
            throw new TypeError("unexpected adata type");
        }

        if ( adata.length > _AES_GCM_data_maxLength )
            throw new IllegalArgumentError("illegal adata length");

        if ( adata.length ) {
            this.adata = adata;
            _gcm_mac_process.call( this, adata );
        }
        else {
            this.adata = null;
        }
    }
    else {
        this.adata = null;
    }

    var counter = options.counter;
    if ( counter !== undefined ) {
        if ( !is_number(counter) )
            throw new TypeError("counter must be a number");

        if ( counter < 1 || counter > 0xffffffff )
            throw new RangeError("counter must be a positive 32-bit integer");

        this.counter = counter;
        asm.set_counter( 0, 0, 0, this.gamma0+counter|0 );
    }
    else {
        this.counter = 1;
        asm.set_counter( 0, 0, 0, this.gamma0+1|0 );
    }

    var iv = options.iv;
    if ( iv !== undefined ) {
        if ( !is_number(counter) )
            throw new TypeError("counter must be a number");

        this.iv = iv;

        AES_set_iv.call( this, iv );
    }

    return this;
}

function AES_GCM_Encrypt_process ( data ) {
    if ( is_string(data) )
        data = string_to_bytes(data);

    if ( is_buffer(data) )
        data = new Uint8Array(data);

    if ( !is_bytes(data) )
        throw new TypeError("data isn't of expected type");

    var dpos = 0,
        dlen = data.length || 0,
        asm = this.asm,
        heap = this.heap,
        counter = this.counter,
        pos = this.pos,
        len = this.len,
        rpos = 0,
        rlen = ( len + dlen ) & -16,
        wlen = 0;

    if ( ((counter-1)<<4) + len + dlen > _AES_GCM_data_maxLength )
        throw new RangeError("counter overflow");

    var result = new Uint8Array(rlen);

    while ( dlen > 0 ) {
        wlen = _heap_write( heap, pos+len, data, dpos, dlen );
        len  += wlen;
        dpos += wlen;
        dlen -= wlen;

        wlen = asm.cipher( AES_asm.ENC.CTR, AES_asm.HEAP_DATA + pos, len );
        wlen = asm.mac( AES_asm.MAC.GCM, AES_asm.HEAP_DATA + pos, wlen );

        if ( wlen ) result.set( heap.subarray( pos, pos + wlen ), rpos );
        counter += (wlen>>>4);
        rpos += wlen;

        if ( wlen < len ) {
            pos += wlen;
            len -= wlen;
        } else {
            pos = 0;
            len = 0;
        }
    }

    this.result = result;
    this.counter = counter;
    this.pos = pos;
    this.len = len;

    return this;
}

function AES_GCM_Encrypt_finish () {
    var asm = this.asm,
        heap = this.heap,
        counter = this.counter,
        tagSize = this.tagSize,
        adata = this.adata,
        pos = this.pos,
        len = this.len;

    var result = new Uint8Array( len + tagSize );

    asm.cipher( AES_asm.ENC.CTR, AES_asm.HEAP_DATA + pos, (len + 15) & -16 );
    if ( len ) result.set( heap.subarray( pos, pos + len ) );

    for ( var i = len; i & 15; i++ ) heap[ pos + i ] = 0;
    asm.mac( AES_asm.MAC.GCM, AES_asm.HEAP_DATA + pos, i );

    var alen = ( adata !== null ) ? adata.length : 0,
        clen = ( (counter-1) << 4) + len;
    heap[0] = heap[1] = heap[2] = 0,
    heap[3] = alen>>>29,
    heap[4] = alen>>>21,
    heap[5] = alen>>>13&255,
    heap[6] = alen>>>5&255,
    heap[7] = alen<<3&255,
    heap[8] = heap[9] = heap[10] = 0,
    heap[11] = clen>>>29,
    heap[12] = clen>>>21&255,
    heap[13] = clen>>>13&255,
    heap[14] = clen>>>5&255,
    heap[15] = clen<<3&255;
    asm.mac( AES_asm.MAC.GCM, AES_asm.HEAP_DATA, 16 );
    asm.get_iv( AES_asm.HEAP_DATA );

    asm.set_counter( 0, 0, 0, this.gamma0 );
    asm.cipher( AES_asm.ENC.CTR, AES_asm.HEAP_DATA, 16 );
    result.set( heap.subarray( 0, tagSize ), len );

    this.result = result;
    this.counter = 1;
    this.pos = 0;
    this.len = 0;

    return this;
}

function AES_GCM_encrypt ( data ) {
    var result1 = AES_GCM_Encrypt_process.call( this, data ).result,
        result2 = AES_GCM_Encrypt_finish.call(this).result;

    var result = new Uint8Array( result1.length + result2.length );
    if ( result1.length ) result.set( result1 );
    if ( result2.length ) result.set( result2, result1.length );
    this.result = result;

    return this;
}

function AES_GCM_Decrypt_process ( data ) {
    if ( is_string(data) )
        data = string_to_bytes(data);

    if ( is_buffer(data) )
        data = new Uint8Array(data);

    if ( !is_bytes(data) )
        throw new TypeError("data isn't of expected type");

    var dpos = 0,
        dlen = data.length || 0,
        asm = this.asm,
        heap = this.heap,
        counter = this.counter,
        tagSize = this.tagSize,
        pos = this.pos,
        len = this.len,
        rpos = 0,
        rlen = len + dlen > tagSize ? ( len + dlen - tagSize ) & -16 : 0,
        tlen = len + dlen - rlen,
        wlen = 0;

    if ( ((counter-1)<<4) + len + dlen > _AES_GCM_data_maxLength )
        throw new RangeError("counter overflow");

    var result = new Uint8Array(rlen);

    while ( dlen > tlen ) {
        wlen = _heap_write( heap, pos+len, data, dpos, dlen-tlen );
        len  += wlen;
        dpos += wlen;
        dlen -= wlen;

        wlen = asm.mac( AES_asm.MAC.GCM, AES_asm.HEAP_DATA + pos, wlen );
        wlen = asm.cipher( AES_asm.DEC.CTR, AES_asm.HEAP_DATA + pos, wlen );

        if ( wlen ) result.set( heap.subarray( pos, pos+wlen ), rpos );
        counter += (wlen>>>4);
        rpos += wlen;

        pos = 0;
        len = 0;
    }

    if ( dlen > 0 ) {
        len += _heap_write( heap, 0, data, dpos, dlen );
    }

    this.result = result;
    this.counter = counter;
    this.pos = pos;
    this.len = len;

    return this;
}

function AES_GCM_Decrypt_finish () {
    var asm = this.asm,
        heap = this.heap,
        tagSize = this.tagSize,
        adata = this.adata,
        counter = this.counter,
        pos = this.pos,
        len = this.len,
        rlen = len - tagSize,
        wlen = 0;

    if ( len < tagSize )
        throw new IllegalStateError("authentication tag not found");

    var result = new Uint8Array(rlen),
        atag = new Uint8Array( heap.subarray( pos+rlen, pos+len ) );

    for ( var i = rlen; i & 15; i++ ) heap[ pos + i ] = 0;

    wlen = asm.mac( AES_asm.MAC.GCM, AES_asm.HEAP_DATA + pos, i );
    wlen = asm.cipher( AES_asm.DEC.CTR, AES_asm.HEAP_DATA + pos, i );
    if ( rlen ) result.set( heap.subarray( pos, pos+rlen ) );

    var alen = ( adata !== null ) ? adata.length : 0,
        clen = ( (counter-1) << 4) + len - tagSize;
    heap[0] = heap[1] = heap[2] = 0,
    heap[3] = alen>>>29,
    heap[4] = alen>>>21,
    heap[5] = alen>>>13&255,
    heap[6] = alen>>>5&255,
    heap[7] = alen<<3&255,
    heap[8] = heap[9] = heap[10] = 0,
    heap[11] = clen>>>29,
    heap[12] = clen>>>21&255,
    heap[13] = clen>>>13&255,
    heap[14] = clen>>>5&255,
    heap[15] = clen<<3&255;
    asm.mac( AES_asm.MAC.GCM, AES_asm.HEAP_DATA, 16 );
    asm.get_iv( AES_asm.HEAP_DATA );

    asm.set_counter( 0, 0, 0, this.gamma0 );
    asm.cipher( AES_asm.ENC.CTR, AES_asm.HEAP_DATA, 16 );

    var acheck = 0;
    for ( var i = 0; i < tagSize; ++i ) acheck |= atag[i] ^ heap[i];
    if ( acheck )
        throw new SecurityError("data integrity check failed");

    this.result = result;
    this.counter = 1;
    this.pos = 0;
    this.len = 0;

    return this;
}

function AES_GCM_decrypt ( data ) {
    var result1 = AES_GCM_Decrypt_process.call( this, data ).result,
        result2 = AES_GCM_Decrypt_finish.call( this ).result;

    var result = new Uint8Array( result1.length + result2.length );
    if ( result1.length ) result.set( result1 );
    if ( result2.length ) result.set( result2, result1.length );
    this.result = result;

    return this;
}

var AES_GCM_prototype = AES_GCM.prototype;
AES_GCM_prototype.BLOCK_SIZE = 16;
AES_GCM_prototype.reset = AES_GCM_reset;
AES_GCM_prototype.encrypt = AES_GCM_encrypt;
AES_GCM_prototype.decrypt = AES_GCM_decrypt;

var AES_GCM_Encrypt_prototype = AES_GCM_Encrypt.prototype;
AES_GCM_Encrypt_prototype.BLOCK_SIZE = 16;
AES_GCM_Encrypt_prototype.reset = AES_GCM_reset;
AES_GCM_Encrypt_prototype.process = AES_GCM_Encrypt_process;
AES_GCM_Encrypt_prototype.finish = AES_GCM_Encrypt_finish;

var AES_GCM_Decrypt_prototype = AES_GCM_Decrypt.prototype;
AES_GCM_Decrypt_prototype.BLOCK_SIZE = 16;
AES_GCM_Decrypt_prototype.reset = AES_GCM_reset;
AES_GCM_Decrypt_prototype.process = AES_GCM_Decrypt_process;
AES_GCM_Decrypt_prototype.finish = AES_GCM_Decrypt_finish;

// shared asm.js module and heap
var _AES_heap_instance = new Uint8Array(0x100000),
    _AES_asm_instance  = AES_asm( global, null, _AES_heap_instance.buffer );

/**
 * AES-ECB exports
 */

function AES_ECB_encrypt_bytes ( data, key, padding ) {
    if ( data === undefined ) throw new SyntaxError("data required");
    if ( key === undefined ) throw new SyntaxError("key required");
    return new AES_ECB( { heap: _AES_heap_instance, asm: _AES_asm_instance, key: key, padding: padding } ).encrypt(data).result;
}

function AES_ECB_decrypt_bytes ( data, key, padding ) {
    if ( data === undefined ) throw new SyntaxError("data required");
    if ( key === undefined ) throw new SyntaxError("key required");
    return new AES_ECB( { heap: _AES_heap_instance, asm: _AES_asm_instance, key: key, padding: padding } ).decrypt(data).result;
}

exports.AES_ECB = AES_ECB;
exports.AES_ECB.encrypt = AES_ECB_encrypt_bytes;
exports.AES_ECB.decrypt = AES_ECB_decrypt_bytes;

exports.AES_ECB.Encrypt = AES_ECB_Encrypt;
exports.AES_ECB.Decrypt = AES_ECB_Decrypt;

/**
 * AES-CBC exports
 */

function AES_CBC_encrypt_bytes ( data, key, padding, iv ) {
    if ( data === undefined ) throw new SyntaxError("data required");
    if ( key === undefined ) throw new SyntaxError("key required");
    return new AES_CBC( { heap: _AES_heap_instance, asm: _AES_asm_instance, key: key, padding: padding, iv: iv } ).encrypt(data).result;
}

function AES_CBC_decrypt_bytes ( data, key, padding, iv ) {
    if ( data === undefined ) throw new SyntaxError("data required");
    if ( key === undefined ) throw new SyntaxError("key required");
    return new AES_CBC( { heap: _AES_heap_instance, asm: _AES_asm_instance, key: key, padding: padding, iv: iv } ).decrypt(data).result;
}

exports.AES_CBC = AES_CBC;
exports.AES_CBC.encrypt = AES_CBC_encrypt_bytes;
exports.AES_CBC.decrypt = AES_CBC_decrypt_bytes;

exports.AES_CBC.Encrypt = AES_CBC_Encrypt;
exports.AES_CBC.Decrypt = AES_CBC_Decrypt;

/**
 * AES-CTR exports
 */

function AES_CTR_crypt_bytes ( data, key, nonce ) {
    if ( data === undefined ) throw new SyntaxError("data required");
    if ( key === undefined ) throw new SyntaxError("key required");
    if ( nonce === undefined ) throw new SyntaxError("nonce required");
    return new AES_CTR( { heap: _AES_heap_instance, asm: _AES_asm_instance, key: key, nonce: nonce } ).encrypt(data).result;
}

exports.AES_CTR = AES_CTR;
exports.AES_CTR.encrypt = AES_CTR_crypt_bytes;
exports.AES_CTR.decrypt = AES_CTR_crypt_bytes;

exports.AES_CTR.Encrypt =
exports.AES_CTR.Decrypt = AES_CTR_Crypt;

/**
 * AES-CCM exports
 */

function AES_CCM_encrypt_bytes ( data, key, nonce, adata, tagSize ) {
    if ( data === undefined ) throw new SyntaxError("data required");
    if ( key === undefined ) throw new SyntaxError("key required");
    if ( nonce === undefined ) throw new SyntaxError("nonce required");
    var dataLength = data.length || 0;
    return new AES_CCM( { heap: _AES_heap_instance, asm: _AES_asm_instance, key: key, nonce: nonce, adata: adata, tagSize: tagSize, dataLength: dataLength } ).encrypt(data).result;
}

function AES_CCM_decrypt_bytes ( data, key, nonce, adata, tagSize ) {
    if ( data === undefined ) throw new SyntaxError("data required");
    if ( key === undefined ) throw new SyntaxError("key required");
    if ( nonce === undefined ) throw new SyntaxError("nonce required");
    var dataLength = data.length || 0;
    tagSize = tagSize || 16;
    return new AES_CCM( { heap: _AES_heap_instance, asm: _AES_asm_instance, key: key, nonce: nonce, adata: adata, tagSize: tagSize, dataLength: dataLength-tagSize } ).decrypt(data).result;
}

exports.AES_CCM = AES_CCM;
exports.AES_CCM.encrypt = AES_CCM_encrypt_bytes;
exports.AES_CCM.decrypt = AES_CCM_decrypt_bytes;

exports.AES_CCM.Encrypt = AES_CCM_Encrypt;
exports.AES_CCM.Decrypt = AES_CCM_Decrypt;

/**
 * AES-GCM exports
 */

function AES_GCM_encrypt_bytes ( data, key, nonce, adata, tagSize ) {
    if ( data === undefined ) throw new SyntaxError("data required");
    if ( key === undefined ) throw new SyntaxError("key required");
    if ( nonce === undefined ) throw new SyntaxError("nonce required");
    return new AES_GCM( { heap: _AES_heap_instance, asm: _AES_asm_instance, key: key, nonce: nonce, adata: adata, tagSize: tagSize } ).encrypt(data).result;
}

function AES_GCM_decrypt_bytes ( data, key, nonce, adata, tagSize ) {
    if ( data === undefined ) throw new SyntaxError("data required");
    if ( key === undefined ) throw new SyntaxError("key required");
    if ( nonce === undefined ) throw new SyntaxError("nonce required");
    return new AES_GCM( { heap: _AES_heap_instance, asm: _AES_asm_instance, key: key, nonce: nonce, adata: adata, tagSize: tagSize } ).decrypt(data).result;
}

exports.AES_GCM = AES_GCM;
exports.AES_GCM.encrypt = AES_GCM_encrypt_bytes;
exports.AES_GCM.decrypt = AES_GCM_decrypt_bytes;

exports.AES_GCM.Encrypt = AES_GCM_Encrypt;
exports.AES_GCM.Decrypt = AES_GCM_Decrypt;

function hash_reset () {
    this.result = null;
    this.pos = 0;
    this.len = 0;

    this.asm.reset();

    return this;
}

function hash_process ( data ) {
    if ( this.result !== null )
        throw new IllegalStateError("state must be reset before processing new data");

    if ( is_string(data) )
        data = string_to_bytes(data);

    if ( is_buffer(data) )
        data = new Uint8Array(data);

    if ( !is_bytes(data) )
        throw new TypeError("data isn't of expected type");

    var asm = this.asm,
        heap = this.heap,
        hpos = this.pos,
        hlen = this.len,
        dpos = 0,
        dlen = data.length,
        wlen = 0;

    while ( dlen > 0 ) {
        wlen = _heap_write( heap, hpos+hlen, data, dpos, dlen );
        hlen += wlen;
        dpos += wlen;
        dlen -= wlen;

        wlen = asm.process( hpos, hlen );

        hpos += wlen;
        hlen -= wlen;

        if ( !hlen ) hpos = 0;
    }

    this.pos = hpos;
    this.len = hlen;

    return this;
}

function hash_finish () {
    if ( this.result !== null )
        throw new IllegalStateError("state must be reset before processing new data");

    this.asm.finish( this.pos, this.len, 0 );

    this.result = new Uint8Array(this.HASH_SIZE);
    this.result.set( this.heap.subarray( 0, this.HASH_SIZE ) );

    this.pos = 0;
    this.len = 0;

    return this;
}

function sha256_asm ( stdlib, foreign, buffer ) {
    "use asm";

    // SHA256 state
    var H0 = 0, H1 = 0, H2 = 0, H3 = 0, H4 = 0, H5 = 0, H6 = 0, H7 = 0,
        TOTAL0 = 0, TOTAL1 = 0;

    // HMAC state
    var I0 = 0, I1 = 0, I2 = 0, I3 = 0, I4 = 0, I5 = 0, I6 = 0, I7 = 0,
        O0 = 0, O1 = 0, O2 = 0, O3 = 0, O4 = 0, O5 = 0, O6 = 0, O7 = 0;

    // I/O buffer
    var HEAP = new stdlib.Uint8Array(buffer);

    function _core ( w0, w1, w2, w3, w4, w5, w6, w7, w8, w9, w10, w11, w12, w13, w14, w15 ) {
        w0 = w0|0;
        w1 = w1|0;
        w2 = w2|0;
        w3 = w3|0;
        w4 = w4|0;
        w5 = w5|0;
        w6 = w6|0;
        w7 = w7|0;
        w8 = w8|0;
        w9 = w9|0;
        w10 = w10|0;
        w11 = w11|0;
        w12 = w12|0;
        w13 = w13|0;
        w14 = w14|0;
        w15 = w15|0;

        var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0,
            t = 0;

        a = H0;
        b = H1;
        c = H2;
        d = H3;
        e = H4;
        f = H5;
        g = H6;
        h = H7;

        // 0
        t = ( w0 + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x428a2f98 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 1
        t = ( w1 + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x71374491 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 2
        t = ( w2 + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0xb5c0fbcf )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 3
        t = ( w3 + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0xe9b5dba5 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 4
        t = ( w4 + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x3956c25b )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 5
        t = ( w5 + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x59f111f1 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 6
        t = ( w6 + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x923f82a4 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 7
        t = ( w7 + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0xab1c5ed5 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 8
        t = ( w8 + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0xd807aa98 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 9
        t = ( w9 + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x12835b01 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 10
        t = ( w10 + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x243185be )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 11
        t = ( w11 + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x550c7dc3 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 12
        t = ( w12 + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x72be5d74 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 13
        t = ( w13 + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x80deb1fe )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 14
        t = ( w14 + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x9bdc06a7 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 15
        t = ( w15 + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0xc19bf174 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 16
        w0 = t = ( ( w1>>>7  ^ w1>>>18 ^ w1>>>3  ^ w1<<25 ^ w1<<14 ) + ( w14>>>17 ^ w14>>>19 ^ w14>>>10 ^ w14<<15 ^ w14<<13 ) + w0 + w9 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0xe49b69c1 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 17
        w1 = t = ( ( w2>>>7  ^ w2>>>18 ^ w2>>>3  ^ w2<<25 ^ w2<<14 ) + ( w15>>>17 ^ w15>>>19 ^ w15>>>10 ^ w15<<15 ^ w15<<13 ) + w1 + w10 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0xefbe4786 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 18
        w2 = t = ( ( w3>>>7  ^ w3>>>18 ^ w3>>>3  ^ w3<<25 ^ w3<<14 ) + ( w0>>>17 ^ w0>>>19 ^ w0>>>10 ^ w0<<15 ^ w0<<13 ) + w2 + w11 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x0fc19dc6 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 19
        w3 = t = ( ( w4>>>7  ^ w4>>>18 ^ w4>>>3  ^ w4<<25 ^ w4<<14 ) + ( w1>>>17 ^ w1>>>19 ^ w1>>>10 ^ w1<<15 ^ w1<<13 ) + w3 + w12 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x240ca1cc )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 20
        w4 = t = ( ( w5>>>7  ^ w5>>>18 ^ w5>>>3  ^ w5<<25 ^ w5<<14 ) + ( w2>>>17 ^ w2>>>19 ^ w2>>>10 ^ w2<<15 ^ w2<<13 ) + w4 + w13 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x2de92c6f )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 21
        w5 = t = ( ( w6>>>7  ^ w6>>>18 ^ w6>>>3  ^ w6<<25 ^ w6<<14 ) + ( w3>>>17 ^ w3>>>19 ^ w3>>>10 ^ w3<<15 ^ w3<<13 ) + w5 + w14 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x4a7484aa )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 22
        w6 = t = ( ( w7>>>7  ^ w7>>>18 ^ w7>>>3  ^ w7<<25 ^ w7<<14 ) + ( w4>>>17 ^ w4>>>19 ^ w4>>>10 ^ w4<<15 ^ w4<<13 ) + w6 + w15 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x5cb0a9dc )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 23
        w7 = t = ( ( w8>>>7  ^ w8>>>18 ^ w8>>>3  ^ w8<<25 ^ w8<<14 ) + ( w5>>>17 ^ w5>>>19 ^ w5>>>10 ^ w5<<15 ^ w5<<13 ) + w7 + w0 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x76f988da )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 24
        w8 = t = ( ( w9>>>7  ^ w9>>>18 ^ w9>>>3  ^ w9<<25 ^ w9<<14 ) + ( w6>>>17 ^ w6>>>19 ^ w6>>>10 ^ w6<<15 ^ w6<<13 ) + w8 + w1 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x983e5152 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 25
        w9 = t = ( ( w10>>>7  ^ w10>>>18 ^ w10>>>3  ^ w10<<25 ^ w10<<14 ) + ( w7>>>17 ^ w7>>>19 ^ w7>>>10 ^ w7<<15 ^ w7<<13 ) + w9 + w2 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0xa831c66d )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 26
        w10 = t = ( ( w11>>>7  ^ w11>>>18 ^ w11>>>3  ^ w11<<25 ^ w11<<14 ) + ( w8>>>17 ^ w8>>>19 ^ w8>>>10 ^ w8<<15 ^ w8<<13 ) + w10 + w3 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0xb00327c8 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 27
        w11 = t = ( ( w12>>>7  ^ w12>>>18 ^ w12>>>3  ^ w12<<25 ^ w12<<14 ) + ( w9>>>17 ^ w9>>>19 ^ w9>>>10 ^ w9<<15 ^ w9<<13 ) + w11 + w4 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0xbf597fc7 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 28
        w12 = t = ( ( w13>>>7  ^ w13>>>18 ^ w13>>>3  ^ w13<<25 ^ w13<<14 ) + ( w10>>>17 ^ w10>>>19 ^ w10>>>10 ^ w10<<15 ^ w10<<13 ) + w12 + w5 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0xc6e00bf3 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 29
        w13 = t = ( ( w14>>>7  ^ w14>>>18 ^ w14>>>3  ^ w14<<25 ^ w14<<14 ) + ( w11>>>17 ^ w11>>>19 ^ w11>>>10 ^ w11<<15 ^ w11<<13 ) + w13 + w6 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0xd5a79147 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 30
        w14 = t = ( ( w15>>>7  ^ w15>>>18 ^ w15>>>3  ^ w15<<25 ^ w15<<14 ) + ( w12>>>17 ^ w12>>>19 ^ w12>>>10 ^ w12<<15 ^ w12<<13 ) + w14 + w7 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x06ca6351 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 31
        w15 = t = ( ( w0>>>7  ^ w0>>>18 ^ w0>>>3  ^ w0<<25 ^ w0<<14 ) + ( w13>>>17 ^ w13>>>19 ^ w13>>>10 ^ w13<<15 ^ w13<<13 ) + w15 + w8 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x14292967 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 32
        w0 = t = ( ( w1>>>7  ^ w1>>>18 ^ w1>>>3  ^ w1<<25 ^ w1<<14 ) + ( w14>>>17 ^ w14>>>19 ^ w14>>>10 ^ w14<<15 ^ w14<<13 ) + w0 + w9 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x27b70a85 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 33
        w1 = t = ( ( w2>>>7  ^ w2>>>18 ^ w2>>>3  ^ w2<<25 ^ w2<<14 ) + ( w15>>>17 ^ w15>>>19 ^ w15>>>10 ^ w15<<15 ^ w15<<13 ) + w1 + w10 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x2e1b2138 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 34
        w2 = t = ( ( w3>>>7  ^ w3>>>18 ^ w3>>>3  ^ w3<<25 ^ w3<<14 ) + ( w0>>>17 ^ w0>>>19 ^ w0>>>10 ^ w0<<15 ^ w0<<13 ) + w2 + w11 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x4d2c6dfc )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 35
        w3 = t = ( ( w4>>>7  ^ w4>>>18 ^ w4>>>3  ^ w4<<25 ^ w4<<14 ) + ( w1>>>17 ^ w1>>>19 ^ w1>>>10 ^ w1<<15 ^ w1<<13 ) + w3 + w12 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x53380d13 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 36
        w4 = t = ( ( w5>>>7  ^ w5>>>18 ^ w5>>>3  ^ w5<<25 ^ w5<<14 ) + ( w2>>>17 ^ w2>>>19 ^ w2>>>10 ^ w2<<15 ^ w2<<13 ) + w4 + w13 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x650a7354 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 37
        w5 = t = ( ( w6>>>7  ^ w6>>>18 ^ w6>>>3  ^ w6<<25 ^ w6<<14 ) + ( w3>>>17 ^ w3>>>19 ^ w3>>>10 ^ w3<<15 ^ w3<<13 ) + w5 + w14 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x766a0abb )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 38
        w6 = t = ( ( w7>>>7  ^ w7>>>18 ^ w7>>>3  ^ w7<<25 ^ w7<<14 ) + ( w4>>>17 ^ w4>>>19 ^ w4>>>10 ^ w4<<15 ^ w4<<13 ) + w6 + w15 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x81c2c92e )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 39
        w7 = t = ( ( w8>>>7  ^ w8>>>18 ^ w8>>>3  ^ w8<<25 ^ w8<<14 ) + ( w5>>>17 ^ w5>>>19 ^ w5>>>10 ^ w5<<15 ^ w5<<13 ) + w7 + w0 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x92722c85 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 40
        w8 = t = ( ( w9>>>7  ^ w9>>>18 ^ w9>>>3  ^ w9<<25 ^ w9<<14 ) + ( w6>>>17 ^ w6>>>19 ^ w6>>>10 ^ w6<<15 ^ w6<<13 ) + w8 + w1 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0xa2bfe8a1 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 41
        w9 = t = ( ( w10>>>7  ^ w10>>>18 ^ w10>>>3  ^ w10<<25 ^ w10<<14 ) + ( w7>>>17 ^ w7>>>19 ^ w7>>>10 ^ w7<<15 ^ w7<<13 ) + w9 + w2 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0xa81a664b )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 42
        w10 = t = ( ( w11>>>7  ^ w11>>>18 ^ w11>>>3  ^ w11<<25 ^ w11<<14 ) + ( w8>>>17 ^ w8>>>19 ^ w8>>>10 ^ w8<<15 ^ w8<<13 ) + w10 + w3 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0xc24b8b70 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 43
        w11 = t = ( ( w12>>>7  ^ w12>>>18 ^ w12>>>3  ^ w12<<25 ^ w12<<14 ) + ( w9>>>17 ^ w9>>>19 ^ w9>>>10 ^ w9<<15 ^ w9<<13 ) + w11 + w4 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0xc76c51a3 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 44
        w12 = t = ( ( w13>>>7  ^ w13>>>18 ^ w13>>>3  ^ w13<<25 ^ w13<<14 ) + ( w10>>>17 ^ w10>>>19 ^ w10>>>10 ^ w10<<15 ^ w10<<13 ) + w12 + w5 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0xd192e819 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 45
        w13 = t = ( ( w14>>>7  ^ w14>>>18 ^ w14>>>3  ^ w14<<25 ^ w14<<14 ) + ( w11>>>17 ^ w11>>>19 ^ w11>>>10 ^ w11<<15 ^ w11<<13 ) + w13 + w6 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0xd6990624 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 46
        w14 = t = ( ( w15>>>7  ^ w15>>>18 ^ w15>>>3  ^ w15<<25 ^ w15<<14 ) + ( w12>>>17 ^ w12>>>19 ^ w12>>>10 ^ w12<<15 ^ w12<<13 ) + w14 + w7 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0xf40e3585 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 47
        w15 = t = ( ( w0>>>7  ^ w0>>>18 ^ w0>>>3  ^ w0<<25 ^ w0<<14 ) + ( w13>>>17 ^ w13>>>19 ^ w13>>>10 ^ w13<<15 ^ w13<<13 ) + w15 + w8 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x106aa070 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 48
        w0 = t = ( ( w1>>>7  ^ w1>>>18 ^ w1>>>3  ^ w1<<25 ^ w1<<14 ) + ( w14>>>17 ^ w14>>>19 ^ w14>>>10 ^ w14<<15 ^ w14<<13 ) + w0 + w9 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x19a4c116 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 49
        w1 = t = ( ( w2>>>7  ^ w2>>>18 ^ w2>>>3  ^ w2<<25 ^ w2<<14 ) + ( w15>>>17 ^ w15>>>19 ^ w15>>>10 ^ w15<<15 ^ w15<<13 ) + w1 + w10 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x1e376c08 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 50
        w2 = t = ( ( w3>>>7  ^ w3>>>18 ^ w3>>>3  ^ w3<<25 ^ w3<<14 ) + ( w0>>>17 ^ w0>>>19 ^ w0>>>10 ^ w0<<15 ^ w0<<13 ) + w2 + w11 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x2748774c )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 51
        w3 = t = ( ( w4>>>7  ^ w4>>>18 ^ w4>>>3  ^ w4<<25 ^ w4<<14 ) + ( w1>>>17 ^ w1>>>19 ^ w1>>>10 ^ w1<<15 ^ w1<<13 ) + w3 + w12 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x34b0bcb5 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 52
        w4 = t = ( ( w5>>>7  ^ w5>>>18 ^ w5>>>3  ^ w5<<25 ^ w5<<14 ) + ( w2>>>17 ^ w2>>>19 ^ w2>>>10 ^ w2<<15 ^ w2<<13 ) + w4 + w13 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x391c0cb3 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 53
        w5 = t = ( ( w6>>>7  ^ w6>>>18 ^ w6>>>3  ^ w6<<25 ^ w6<<14 ) + ( w3>>>17 ^ w3>>>19 ^ w3>>>10 ^ w3<<15 ^ w3<<13 ) + w5 + w14 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x4ed8aa4a )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 54
        w6 = t = ( ( w7>>>7  ^ w7>>>18 ^ w7>>>3  ^ w7<<25 ^ w7<<14 ) + ( w4>>>17 ^ w4>>>19 ^ w4>>>10 ^ w4<<15 ^ w4<<13 ) + w6 + w15 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x5b9cca4f )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 55
        w7 = t = ( ( w8>>>7  ^ w8>>>18 ^ w8>>>3  ^ w8<<25 ^ w8<<14 ) + ( w5>>>17 ^ w5>>>19 ^ w5>>>10 ^ w5<<15 ^ w5<<13 ) + w7 + w0 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x682e6ff3 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 56
        w8 = t = ( ( w9>>>7  ^ w9>>>18 ^ w9>>>3  ^ w9<<25 ^ w9<<14 ) + ( w6>>>17 ^ w6>>>19 ^ w6>>>10 ^ w6<<15 ^ w6<<13 ) + w8 + w1 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x748f82ee )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 57
        w9 = t = ( ( w10>>>7  ^ w10>>>18 ^ w10>>>3  ^ w10<<25 ^ w10<<14 ) + ( w7>>>17 ^ w7>>>19 ^ w7>>>10 ^ w7<<15 ^ w7<<13 ) + w9 + w2 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x78a5636f )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 58
        w10 = t = ( ( w11>>>7  ^ w11>>>18 ^ w11>>>3  ^ w11<<25 ^ w11<<14 ) + ( w8>>>17 ^ w8>>>19 ^ w8>>>10 ^ w8<<15 ^ w8<<13 ) + w10 + w3 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x84c87814 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 59
        w11 = t = ( ( w12>>>7  ^ w12>>>18 ^ w12>>>3  ^ w12<<25 ^ w12<<14 ) + ( w9>>>17 ^ w9>>>19 ^ w9>>>10 ^ w9<<15 ^ w9<<13 ) + w11 + w4 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x8cc70208 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 60
        w12 = t = ( ( w13>>>7  ^ w13>>>18 ^ w13>>>3  ^ w13<<25 ^ w13<<14 ) + ( w10>>>17 ^ w10>>>19 ^ w10>>>10 ^ w10<<15 ^ w10<<13 ) + w12 + w5 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0x90befffa )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 61
        w13 = t = ( ( w14>>>7  ^ w14>>>18 ^ w14>>>3  ^ w14<<25 ^ w14<<14 ) + ( w11>>>17 ^ w11>>>19 ^ w11>>>10 ^ w11<<15 ^ w11<<13 ) + w13 + w6 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0xa4506ceb )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 62
        w14 = t = ( ( w15>>>7  ^ w15>>>18 ^ w15>>>3  ^ w15<<25 ^ w15<<14 ) + ( w12>>>17 ^ w12>>>19 ^ w12>>>10 ^ w12<<15 ^ w12<<13 ) + w14 + w7 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0xbef9a3f7 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        // 63
        w15 = t = ( ( w0>>>7  ^ w0>>>18 ^ w0>>>3  ^ w0<<25 ^ w0<<14 ) + ( w13>>>17 ^ w13>>>19 ^ w13>>>10 ^ w13<<15 ^ w13<<13 ) + w15 + w8 )|0;
        t = ( t + h + ( e>>>6 ^ e>>>11 ^ e>>>25 ^ e<<26 ^ e<<21 ^ e<<7 ) +  ( g ^ e & (f^g) ) + 0xc67178f2 )|0;
        h = g; g = f; f = e; e = ( d + t )|0; d = c; c = b; b = a;
        a = ( t + ( (b & c) ^ ( d & (b ^ c) ) ) + ( b>>>2 ^ b>>>13 ^ b>>>22 ^ b<<30 ^ b<<19 ^ b<<10 ) )|0;

        H0 = ( H0 + a )|0;
        H1 = ( H1 + b )|0;
        H2 = ( H2 + c )|0;
        H3 = ( H3 + d )|0;
        H4 = ( H4 + e )|0;
        H5 = ( H5 + f )|0;
        H6 = ( H6 + g )|0;
        H7 = ( H7 + h )|0;
    }

    function _core_heap ( offset ) {
        offset = offset|0;

        _core(
            HEAP[offset|0]<<24 | HEAP[offset|1]<<16 | HEAP[offset|2]<<8 | HEAP[offset|3],
            HEAP[offset|4]<<24 | HEAP[offset|5]<<16 | HEAP[offset|6]<<8 | HEAP[offset|7],
            HEAP[offset|8]<<24 | HEAP[offset|9]<<16 | HEAP[offset|10]<<8 | HEAP[offset|11],
            HEAP[offset|12]<<24 | HEAP[offset|13]<<16 | HEAP[offset|14]<<8 | HEAP[offset|15],
            HEAP[offset|16]<<24 | HEAP[offset|17]<<16 | HEAP[offset|18]<<8 | HEAP[offset|19],
            HEAP[offset|20]<<24 | HEAP[offset|21]<<16 | HEAP[offset|22]<<8 | HEAP[offset|23],
            HEAP[offset|24]<<24 | HEAP[offset|25]<<16 | HEAP[offset|26]<<8 | HEAP[offset|27],
            HEAP[offset|28]<<24 | HEAP[offset|29]<<16 | HEAP[offset|30]<<8 | HEAP[offset|31],
            HEAP[offset|32]<<24 | HEAP[offset|33]<<16 | HEAP[offset|34]<<8 | HEAP[offset|35],
            HEAP[offset|36]<<24 | HEAP[offset|37]<<16 | HEAP[offset|38]<<8 | HEAP[offset|39],
            HEAP[offset|40]<<24 | HEAP[offset|41]<<16 | HEAP[offset|42]<<8 | HEAP[offset|43],
            HEAP[offset|44]<<24 | HEAP[offset|45]<<16 | HEAP[offset|46]<<8 | HEAP[offset|47],
            HEAP[offset|48]<<24 | HEAP[offset|49]<<16 | HEAP[offset|50]<<8 | HEAP[offset|51],
            HEAP[offset|52]<<24 | HEAP[offset|53]<<16 | HEAP[offset|54]<<8 | HEAP[offset|55],
            HEAP[offset|56]<<24 | HEAP[offset|57]<<16 | HEAP[offset|58]<<8 | HEAP[offset|59],
            HEAP[offset|60]<<24 | HEAP[offset|61]<<16 | HEAP[offset|62]<<8 | HEAP[offset|63]
        );
    }

    // offset - multiple of 32
    function _state_to_heap ( output ) {
        output = output|0;

        HEAP[output|0] = H0>>>24;
        HEAP[output|1] = H0>>>16&255;
        HEAP[output|2] = H0>>>8&255;
        HEAP[output|3] = H0&255;
        HEAP[output|4] = H1>>>24;
        HEAP[output|5] = H1>>>16&255;
        HEAP[output|6] = H1>>>8&255;
        HEAP[output|7] = H1&255;
        HEAP[output|8] = H2>>>24;
        HEAP[output|9] = H2>>>16&255;
        HEAP[output|10] = H2>>>8&255;
        HEAP[output|11] = H2&255;
        HEAP[output|12] = H3>>>24;
        HEAP[output|13] = H3>>>16&255;
        HEAP[output|14] = H3>>>8&255;
        HEAP[output|15] = H3&255;
        HEAP[output|16] = H4>>>24;
        HEAP[output|17] = H4>>>16&255;
        HEAP[output|18] = H4>>>8&255;
        HEAP[output|19] = H4&255;
        HEAP[output|20] = H5>>>24;
        HEAP[output|21] = H5>>>16&255;
        HEAP[output|22] = H5>>>8&255;
        HEAP[output|23] = H5&255;
        HEAP[output|24] = H6>>>24;
        HEAP[output|25] = H6>>>16&255;
        HEAP[output|26] = H6>>>8&255;
        HEAP[output|27] = H6&255;
        HEAP[output|28] = H7>>>24;
        HEAP[output|29] = H7>>>16&255;
        HEAP[output|30] = H7>>>8&255;
        HEAP[output|31] = H7&255;
    }

    function reset () {
        H0 = 0x6a09e667;
        H1 = 0xbb67ae85;
        H2 = 0x3c6ef372;
        H3 = 0xa54ff53a;
        H4 = 0x510e527f;
        H5 = 0x9b05688c;
        H6 = 0x1f83d9ab;
        H7 = 0x5be0cd19;
        TOTAL0 = TOTAL1 = 0;
    }

    function init ( h0, h1, h2, h3, h4, h5, h6, h7, total0, total1 ) {
        h0 = h0|0;
        h1 = h1|0;
        h2 = h2|0;
        h3 = h3|0;
        h4 = h4|0;
        h5 = h5|0;
        h6 = h6|0;
        h7 = h7|0;
        total0 = total0|0;
        total1 = total1|0;

        H0 = h0;
        H1 = h1;
        H2 = h2;
        H3 = h3;
        H4 = h4;
        H5 = h5;
        H6 = h6;
        H7 = h7;
        TOTAL0 = total0;
        TOTAL1 = total1;
    }

    // offset - multiple of 64
    function process ( offset, length ) {
        offset = offset|0;
        length = length|0;

        var hashed = 0;

        if ( offset & 63 )
            return -1;

        while ( (length|0) >= 64 ) {
            _core_heap(offset);

            offset = ( offset + 64 )|0;
            length = ( length - 64 )|0;

            hashed = ( hashed + 64 )|0;
        }

        TOTAL0 = ( TOTAL0 + hashed )|0;
        if ( TOTAL0>>>0 < hashed>>>0 ) TOTAL1 = ( TOTAL1 + 1 )|0;

        return hashed|0;
    }

    // offset - multiple of 64
    // output - multiple of 32
    function finish ( offset, length, output ) {
        offset = offset|0;
        length = length|0;
        output = output|0;

        var hashed = 0,
            i = 0;

        if ( offset & 63 )
            return -1;

        if ( ~output )
            if ( output & 31 )
                return -1;

        if ( (length|0) >= 64 ) {
            hashed = process( offset, length )|0;
            if ( (hashed|0) == -1 )
                return -1;

            offset = ( offset + hashed )|0;
            length = ( length - hashed )|0;
        }

        hashed = ( hashed + length )|0;
        TOTAL0 = ( TOTAL0 + length )|0;
        if ( TOTAL0>>>0 < length>>>0 ) TOTAL1 = ( TOTAL1 + 1 )|0;

        HEAP[offset|length] = 0x80;

        if ( (length|0) >= 56 ) {
            for ( i = (length+1)|0; (i|0) < 64; i = (i+1)|0 )
                HEAP[offset|i] = 0x00;

            _core_heap(offset);

            length = 0;

            HEAP[offset|0] = 0;
        }

        for ( i = (length+1)|0; (i|0) < 59; i = (i+1)|0 )
            HEAP[offset|i] = 0;

        HEAP[offset|56] = TOTAL1>>>21&255;
        HEAP[offset|57] = TOTAL1>>>13&255;
        HEAP[offset|58] = TOTAL1>>>5&255;
        HEAP[offset|59] = TOTAL1<<3&255 | TOTAL0>>>29;
        HEAP[offset|60] = TOTAL0>>>21&255;
        HEAP[offset|61] = TOTAL0>>>13&255;
        HEAP[offset|62] = TOTAL0>>>5&255;
        HEAP[offset|63] = TOTAL0<<3&255;
        _core_heap(offset);

        if ( ~output )
            _state_to_heap(output);

        return hashed|0;
    }

    function hmac_reset () {
        H0 = I0;
        H1 = I1;
        H2 = I2;
        H3 = I3;
        H4 = I4;
        H5 = I5;
        H6 = I6;
        H7 = I7;
        TOTAL0 = 64;
        TOTAL1 = 0;
    }

    function _hmac_opad () {
        H0 = O0;
        H1 = O1;
        H2 = O2;
        H3 = O3;
        H4 = O4;
        H5 = O5;
        H6 = O6;
        H7 = O7;
        TOTAL0 = 64;
        TOTAL1 = 0;
    }

    function hmac_init ( p0, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13, p14, p15 ) {
        p0 = p0|0;
        p1 = p1|0;
        p2 = p2|0;
        p3 = p3|0;
        p4 = p4|0;
        p5 = p5|0;
        p6 = p6|0;
        p7 = p7|0;
        p8 = p8|0;
        p9 = p9|0;
        p10 = p10|0;
        p11 = p11|0;
        p12 = p12|0;
        p13 = p13|0;
        p14 = p14|0;
        p15 = p15|0;

        // opad
        reset();
        _core(
            p0 ^ 0x5c5c5c5c,
            p1 ^ 0x5c5c5c5c,
            p2 ^ 0x5c5c5c5c,
            p3 ^ 0x5c5c5c5c,
            p4 ^ 0x5c5c5c5c,
            p5 ^ 0x5c5c5c5c,
            p6 ^ 0x5c5c5c5c,
            p7 ^ 0x5c5c5c5c,
            p8 ^ 0x5c5c5c5c,
            p9 ^ 0x5c5c5c5c,
            p10 ^ 0x5c5c5c5c,
            p11 ^ 0x5c5c5c5c,
            p12 ^ 0x5c5c5c5c,
            p13 ^ 0x5c5c5c5c,
            p14 ^ 0x5c5c5c5c,
            p15 ^ 0x5c5c5c5c
        );
        O0 = H0;
        O1 = H1;
        O2 = H2;
        O3 = H3;
        O4 = H4;
        O5 = H5;
        O6 = H6;
        O7 = H7;

        // ipad
        reset();
        _core(
            p0 ^ 0x36363636,
            p1 ^ 0x36363636,
            p2 ^ 0x36363636,
            p3 ^ 0x36363636,
            p4 ^ 0x36363636,
            p5 ^ 0x36363636,
            p6 ^ 0x36363636,
            p7 ^ 0x36363636,
            p8 ^ 0x36363636,
            p9 ^ 0x36363636,
            p10 ^ 0x36363636,
            p11 ^ 0x36363636,
            p12 ^ 0x36363636,
            p13 ^ 0x36363636,
            p14 ^ 0x36363636,
            p15 ^ 0x36363636
        );
        I0 = H0;
        I1 = H1;
        I2 = H2;
        I3 = H3;
        I4 = H4;
        I5 = H5;
        I6 = H6;
        I7 = H7;

        TOTAL0 = 64;
        TOTAL1 = 0;
    }

    // offset - multiple of 64
    // output - multiple of 32
    function hmac_finish ( offset, length, output ) {
        offset = offset|0;
        length = length|0;
        output = output|0;

        var t0 = 0, t1 = 0, t2 = 0, t3 = 0, t4 = 0, t5 = 0, t6 = 0, t7 = 0,
            hashed = 0;

        if ( offset & 63 )
            return -1;

        if ( ~output )
            if ( output & 31 )
                return -1;

        hashed = finish( offset, length, -1 )|0;
        t0 = H0, t1 = H1, t2 = H2, t3 = H3, t4 = H4, t5 = H5, t6 = H6, t7 = H7;

        _hmac_opad();
        _core( t0, t1, t2, t3, t4, t5, t6, t7, 0x80000000, 0, 0, 0, 0, 0, 0, 768 );

        if ( ~output )
            _state_to_heap(output);

        return hashed|0;
    }

    // salt is assumed to be already processed
    // offset - multiple of 64
    // output - multiple of 32
    function pbkdf2_generate_block ( offset, length, block, count, output ) {
        offset = offset|0;
        length = length|0;
        block = block|0;
        count = count|0;
        output = output|0;

        var h0 = 0, h1 = 0, h2 = 0, h3 = 0, h4 = 0, h5 = 0, h6 = 0, h7 = 0,
            t0 = 0, t1 = 0, t2 = 0, t3 = 0, t4 = 0, t5 = 0, t6 = 0, t7 = 0;

        if ( offset & 63 )
            return -1;

        if ( ~output )
            if ( output & 31 )
                return -1;

        // pad block number into heap
        // FIXME probable OOB write
        HEAP[(offset+length)|0]   = block>>>24;
        HEAP[(offset+length+1)|0] = block>>>16&255;
        HEAP[(offset+length+2)|0] = block>>>8&255;
        HEAP[(offset+length+3)|0] = block&255;

        // finish first iteration
        hmac_finish( offset, (length+4)|0, -1 )|0;
        h0 = t0 = H0, h1 = t1 = H1, h2 = t2 = H2, h3 = t3 = H3, h4 = t4 = H4, h5 = t5 = H5, h6 = t6 = H6, h7 = t7 = H7;
        count = (count-1)|0;

        // perform the rest iterations
        while ( (count|0) > 0 ) {
            hmac_reset();
            _core( t0, t1, t2, t3, t4, t5, t6, t7, 0x80000000, 0, 0, 0, 0, 0, 0, 768 );
            t0 = H0, t1 = H1, t2 = H2, t3 = H3, t4 = H4, t5 = H5, t6 = H6, t7 = H7;

            _hmac_opad();
            _core( t0, t1, t2, t3, t4, t5, t6, t7, 0x80000000, 0, 0, 0, 0, 0, 0, 768 );
            t0 = H0, t1 = H1, t2 = H2, t3 = H3, t4 = H4, t5 = H5, t6 = H6, t7 = H7;

            h0 = h0 ^ H0;
            h1 = h1 ^ H1;
            h2 = h2 ^ H2;
            h3 = h3 ^ H3;
            h4 = h4 ^ H4;
            h5 = h5 ^ H5;
            h6 = h6 ^ H6;
            h7 = h7 ^ H7;

            count = (count-1)|0;
        }

        H0 = h0;
        H1 = h1;
        H2 = h2;
        H3 = h3;
        H4 = h4;
        H5 = h5;
        H6 = h6;
        H7 = h7;

        if ( ~output )
            _state_to_heap(output);

        return 0;
    }

    return {
        // SHA256
        reset: reset,
        init: init,
        process: process,
        finish: finish,

        // HMAC-SHA256
        hmac_reset: hmac_reset,
        hmac_init: hmac_init,
        hmac_finish: hmac_finish,

        // PBKDF2-HMAC-SHA256
        pbkdf2_generate_block: pbkdf2_generate_block
    }
}

var _sha256_block_size = 64,
    _sha256_hash_size = 32;

function sha256_constructor ( options ) {
    options = options || {};

    this.heap = _heap_init( Uint8Array, options );
    this.asm = options.asm || sha256_asm( global, null, this.heap.buffer );

    this.BLOCK_SIZE = _sha256_block_size;
    this.HASH_SIZE = _sha256_hash_size;

    this.reset();
}

sha256_constructor.BLOCK_SIZE = _sha256_block_size;
sha256_constructor.HASH_SIZE = _sha256_hash_size;
var sha256_prototype = sha256_constructor.prototype;
sha256_prototype.reset =   hash_reset;
sha256_prototype.process = hash_process;
sha256_prototype.finish =  hash_finish;

var sha256_instance = null;

function get_sha256_instance () {
    if ( sha256_instance === null ) sha256_instance = new sha256_constructor( { heapSize: 0x100000 } );
    return sha256_instance;
}

/**
 * SHA256 exports
 */

function sha256_bytes ( data ) {
    if ( data === undefined ) throw new SyntaxError("data required");
    return get_sha256_instance().reset().process(data).finish().result;
}

function sha256_hex ( data ) {
    var result = sha256_bytes(data);
    return bytes_to_hex(result);
}

function sha256_base64 ( data ) {
    var result = sha256_bytes(data);
    return bytes_to_base64(result);
}

sha256_constructor.bytes = sha256_bytes;
sha256_constructor.hex = sha256_hex;
sha256_constructor.base64 = sha256_base64;

exports.SHA256 = sha256_constructor;

function sha512_asm ( stdlib, foreign, buffer ) {
    "use asm";

    // SHA512 state
    var H0h = 0, H0l = 0, H1h = 0, H1l = 0, H2h = 0, H2l = 0, H3h = 0, H3l = 0,
        H4h = 0, H4l = 0, H5h = 0, H5l = 0, H6h = 0, H6l = 0, H7h = 0, H7l = 0,
        TOTAL0 = 0, TOTAL1 = 0;

    // HMAC state
    var I0h = 0, I0l = 0, I1h = 0, I1l = 0, I2h = 0, I2l = 0, I3h = 0, I3l = 0,
        I4h = 0, I4l = 0, I5h = 0, I5l = 0, I6h = 0, I6l = 0, I7h = 0, I7l = 0,
        O0h = 0, O0l = 0, O1h = 0, O1l = 0, O2h = 0, O2l = 0, O3h = 0, O3l = 0,
        O4h = 0, O4l = 0, O5h = 0, O5l = 0, O6h = 0, O6l = 0, O7h = 0, O7l = 0;

    // I/O buffer
    var HEAP = new stdlib.Uint8Array(buffer);

    function _core ( w0h, w0l, w1h, w1l, w2h, w2l, w3h, w3l, w4h, w4l, w5h, w5l, w6h, w6l, w7h, w7l, w8h, w8l, w9h, w9l, w10h, w10l, w11h, w11l, w12h, w12l, w13h, w13l, w14h, w14l, w15h, w15l ) {
        w0h = w0h|0;
        w0l = w0l|0;
        w1h = w1h|0;
        w1l = w1l|0;
        w2h = w2h|0;
        w2l = w2l|0;
        w3h = w3h|0;
        w3l = w3l|0;
        w4h = w4h|0;
        w4l = w4l|0;
        w5h = w5h|0;
        w5l = w5l|0;
        w6h = w6h|0;
        w6l = w6l|0;
        w7h = w7h|0;
        w7l = w7l|0;
        w8h = w8h|0;
        w8l = w8l|0;
        w9h = w9h|0;
        w9l = w9l|0;
        w10h = w10h|0;
        w10l = w10l|0;
        w11h = w11h|0;
        w11l = w11l|0;
        w12h = w12h|0;
        w12l = w12l|0;
        w13h = w13h|0;
        w13l = w13l|0;
        w14h = w14h|0;
        w14l = w14l|0;
        w15h = w15h|0;
        w15l = w15l|0;

        var ah = 0, al = 0, bh = 0, bl = 0, ch = 0, cl = 0, dh = 0, dl = 0, eh = 0, el = 0, fh = 0, fl = 0, gh = 0, gl = 0, hh = 0, hl = 0,
            th = 0, tl = 0, xl = 0;

        ah = H0h;
        al = H0l;
        bh = H1h;
        bl = H1l;
        ch = H2h;
        cl = H2l;
        dh = H3h;
        dl = H3l;
        eh = H4h;
        el = H4l;
        fh = H5h;
        fl = H5l;
        gh = H6h;
        gl = H6l;
        hh = H7h;
        hl = H7l;

        // 0
        tl = ( 0xd728ae22 + w0l )|0;
        th = ( 0x428a2f98 + w0h + ((tl >>> 0) < (w0l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 1
        tl = ( 0x23ef65cd + w1l )|0;
        th = ( 0x71374491 + w1h + ((tl >>> 0) < (w1l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 2
        tl = ( 0xec4d3b2f + w2l )|0;
        th = ( 0xb5c0fbcf + w2h + ((tl >>> 0) < (w2l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 3
        tl = ( 0x8189dbbc + w3l )|0;
        th = ( 0xe9b5dba5 + w3h + ((tl >>> 0) < (w3l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 4
        tl = ( 0xf348b538 + w4l )|0;
        th = ( 0x3956c25b + w4h + ((tl >>> 0) < (w4l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 5
        tl = ( 0xb605d019 + w5l )|0;
        th = ( 0x59f111f1 + w5h + ((tl >>> 0) < (w5l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 6
        tl = ( 0xaf194f9b + w6l )|0;
        th = ( 0x923f82a4 + w6h + ((tl >>> 0) < (w6l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 7
        tl = ( 0xda6d8118 + w7l )|0;
        th = ( 0xab1c5ed5 + w7h + ((tl >>> 0) < (w7l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 8
        tl = ( 0xa3030242 + w8l )|0;
        th = ( 0xd807aa98 + w8h + ((tl >>> 0) < (w8l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 9
        tl = ( 0x45706fbe + w9l )|0;
        th = ( 0x12835b01 + w9h + ((tl >>> 0) < (w9l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 10
        tl = ( 0x4ee4b28c + w10l )|0;
        th = ( 0x243185be + w10h + ((tl >>> 0) < (w10l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 11
        tl = ( 0xd5ffb4e2 + w11l )|0;
        th = ( 0x550c7dc3 + w11h + ((tl >>> 0) < (w11l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 12
        tl = ( 0xf27b896f + w12l )|0;
        th = ( 0x72be5d74 + w12h + ((tl >>> 0) < (w12l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 13
        tl = ( 0x3b1696b1 + w13l )|0;
        th = ( 0x80deb1fe + w13h + ((tl >>> 0) < (w13l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 14
        tl = ( 0x25c71235 + w14l )|0;
        th = ( 0x9bdc06a7 + w14h + ((tl >>> 0) < (w14l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 15
        tl = ( 0xcf692694 + w15l )|0;
        th = ( 0xc19bf174 + w15h + ((tl >>> 0) < (w15l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 16
        w0l = ( w0l + w9l )|0;
        w0h = ( w0h + w9h + ((w0l >>> 0) < (w9l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w1l >>> 1) | (w1h << 31)) ^ ((w1l >>> 8) | (w1h << 24)) ^ ((w1l >>> 7) | (w1h << 25)) )|0;
        w0l = ( w0l + xl)|0;
        w0h = ( w0h + ( ((w1h >>> 1) | (w1l << 31)) ^ ((w1h >>> 8) | (w1l << 24)) ^ (w1h >>> 7) ) + ((w0l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w14l >>> 19) | (w14h << 13)) ^ ((w14l << 3) | (w14h >>> 29)) ^ ((w14l >>> 6) | (w14h << 26)) )|0;
        w0l = ( w0l + xl)|0;
        w0h = ( w0h + ( ((w14h >>> 19) | (w14l << 13)) ^ ((w14h << 3) | (w14l >>> 29)) ^ (w14h >>> 6) ) + ((w0l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x9ef14ad2 + w0l )|0;
        th = ( 0xe49b69c1 + w0h + ((tl >>> 0) < (w0l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 17
        w1l = ( w1l + w10l )|0;
        w1h = ( w1h + w10h + ((w1l >>> 0) < (w10l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w2l >>> 1) | (w2h << 31)) ^ ((w2l >>> 8) | (w2h << 24)) ^ ((w2l >>> 7) | (w2h << 25)) )|0;
        w1l = ( w1l + xl)|0;
        w1h = ( w1h + ( ((w2h >>> 1) | (w2l << 31)) ^ ((w2h >>> 8) | (w2l << 24)) ^ (w2h >>> 7) ) + ((w1l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w15l >>> 19) | (w15h << 13)) ^ ((w15l << 3) | (w15h >>> 29)) ^ ((w15l >>> 6) | (w15h << 26)) )|0;
        w1l = ( w1l + xl)|0;
        w1h = ( w1h + ( ((w15h >>> 19) | (w15l << 13)) ^ ((w15h << 3) | (w15l >>> 29)) ^ (w15h >>> 6) ) + ((w1l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x384f25e3 + w1l )|0;
        th = ( 0xefbe4786 + w1h + ((tl >>> 0) < (w1l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 18
        w2l = ( w2l + w11l )|0;
        w2h = ( w2h + w11h + ((w2l >>> 0) < (w11l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w3l >>> 1) | (w3h << 31)) ^ ((w3l >>> 8) | (w3h << 24)) ^ ((w3l >>> 7) | (w3h << 25)) )|0;
        w2l = ( w2l + xl)|0;
        w2h = ( w2h + ( ((w3h >>> 1) | (w3l << 31)) ^ ((w3h >>> 8) | (w3l << 24)) ^ (w3h >>> 7) ) + ((w2l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w0l >>> 19) | (w0h << 13)) ^ ((w0l << 3) | (w0h >>> 29)) ^ ((w0l >>> 6) | (w0h << 26)) )|0;
        w2l = ( w2l + xl)|0;
        w2h = ( w2h + ( ((w0h >>> 19) | (w0l << 13)) ^ ((w0h << 3) | (w0l >>> 29)) ^ (w0h >>> 6) ) + ((w2l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x8b8cd5b5 + w2l )|0;
        th = ( 0xfc19dc6 + w2h + ((tl >>> 0) < (w2l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 19
        w3l = ( w3l + w12l )|0;
        w3h = ( w3h + w12h + ((w3l >>> 0) < (w12l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w4l >>> 1) | (w4h << 31)) ^ ((w4l >>> 8) | (w4h << 24)) ^ ((w4l >>> 7) | (w4h << 25)) )|0;
        w3l = ( w3l + xl)|0;
        w3h = ( w3h + ( ((w4h >>> 1) | (w4l << 31)) ^ ((w4h >>> 8) | (w4l << 24)) ^ (w4h >>> 7) ) + ((w3l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w1l >>> 19) | (w1h << 13)) ^ ((w1l << 3) | (w1h >>> 29)) ^ ((w1l >>> 6) | (w1h << 26)) )|0;
        w3l = ( w3l + xl)|0;
        w3h = ( w3h + ( ((w1h >>> 19) | (w1l << 13)) ^ ((w1h << 3) | (w1l >>> 29)) ^ (w1h >>> 6) ) + ((w3l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x77ac9c65 + w3l )|0;
        th = ( 0x240ca1cc + w3h + ((tl >>> 0) < (w3l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 20
        w4l = ( w4l + w13l )|0;
        w4h = ( w4h + w13h + ((w4l >>> 0) < (w13l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w5l >>> 1) | (w5h << 31)) ^ ((w5l >>> 8) | (w5h << 24)) ^ ((w5l >>> 7) | (w5h << 25)) )|0;
        w4l = ( w4l + xl)|0;
        w4h = ( w4h + ( ((w5h >>> 1) | (w5l << 31)) ^ ((w5h >>> 8) | (w5l << 24)) ^ (w5h >>> 7) ) + ((w4l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w2l >>> 19) | (w2h << 13)) ^ ((w2l << 3) | (w2h >>> 29)) ^ ((w2l >>> 6) | (w2h << 26)) )|0;
        w4l = ( w4l + xl)|0;
        w4h = ( w4h + ( ((w2h >>> 19) | (w2l << 13)) ^ ((w2h << 3) | (w2l >>> 29)) ^ (w2h >>> 6) ) + ((w4l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x592b0275 + w4l )|0;
        th = ( 0x2de92c6f + w4h + ((tl >>> 0) < (w4l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 21
        w5l = ( w5l + w14l )|0;
        w5h = ( w5h + w14h + ((w5l >>> 0) < (w14l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w6l >>> 1) | (w6h << 31)) ^ ((w6l >>> 8) | (w6h << 24)) ^ ((w6l >>> 7) | (w6h << 25)) )|0;
        w5l = ( w5l + xl)|0;
        w5h = ( w5h + ( ((w6h >>> 1) | (w6l << 31)) ^ ((w6h >>> 8) | (w6l << 24)) ^ (w6h >>> 7) ) + ((w5l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w3l >>> 19) | (w3h << 13)) ^ ((w3l << 3) | (w3h >>> 29)) ^ ((w3l >>> 6) | (w3h << 26)) )|0;
        w5l = ( w5l + xl)|0;
        w5h = ( w5h + ( ((w3h >>> 19) | (w3l << 13)) ^ ((w3h << 3) | (w3l >>> 29)) ^ (w3h >>> 6) ) + ((w5l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x6ea6e483 + w5l )|0;
        th = ( 0x4a7484aa + w5h + ((tl >>> 0) < (w5l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 22
        w6l = ( w6l + w15l )|0;
        w6h = ( w6h + w15h + ((w6l >>> 0) < (w15l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w7l >>> 1) | (w7h << 31)) ^ ((w7l >>> 8) | (w7h << 24)) ^ ((w7l >>> 7) | (w7h << 25)) )|0;
        w6l = ( w6l + xl)|0;
        w6h = ( w6h + ( ((w7h >>> 1) | (w7l << 31)) ^ ((w7h >>> 8) | (w7l << 24)) ^ (w7h >>> 7) ) + ((w6l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w4l >>> 19) | (w4h << 13)) ^ ((w4l << 3) | (w4h >>> 29)) ^ ((w4l >>> 6) | (w4h << 26)) )|0;
        w6l = ( w6l + xl)|0;
        w6h = ( w6h + ( ((w4h >>> 19) | (w4l << 13)) ^ ((w4h << 3) | (w4l >>> 29)) ^ (w4h >>> 6) ) + ((w6l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0xbd41fbd4 + w6l )|0;
        th = ( 0x5cb0a9dc + w6h + ((tl >>> 0) < (w6l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 23
        w7l = ( w7l + w0l )|0;
        w7h = ( w7h + w0h + ((w7l >>> 0) < (w0l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w8l >>> 1) | (w8h << 31)) ^ ((w8l >>> 8) | (w8h << 24)) ^ ((w8l >>> 7) | (w8h << 25)) )|0;
        w7l = ( w7l + xl)|0;
        w7h = ( w7h + ( ((w8h >>> 1) | (w8l << 31)) ^ ((w8h >>> 8) | (w8l << 24)) ^ (w8h >>> 7) ) + ((w7l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w5l >>> 19) | (w5h << 13)) ^ ((w5l << 3) | (w5h >>> 29)) ^ ((w5l >>> 6) | (w5h << 26)) )|0;
        w7l = ( w7l + xl)|0;
        w7h = ( w7h + ( ((w5h >>> 19) | (w5l << 13)) ^ ((w5h << 3) | (w5l >>> 29)) ^ (w5h >>> 6) ) + ((w7l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x831153b5 + w7l )|0;
        th = ( 0x76f988da + w7h + ((tl >>> 0) < (w7l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 24
        w8l = ( w8l + w1l )|0;
        w8h = ( w8h + w1h + ((w8l >>> 0) < (w1l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w9l >>> 1) | (w9h << 31)) ^ ((w9l >>> 8) | (w9h << 24)) ^ ((w9l >>> 7) | (w9h << 25)) )|0;
        w8l = ( w8l + xl)|0;
        w8h = ( w8h + ( ((w9h >>> 1) | (w9l << 31)) ^ ((w9h >>> 8) | (w9l << 24)) ^ (w9h >>> 7) ) + ((w8l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w6l >>> 19) | (w6h << 13)) ^ ((w6l << 3) | (w6h >>> 29)) ^ ((w6l >>> 6) | (w6h << 26)) )|0;
        w8l = ( w8l + xl)|0;
        w8h = ( w8h + ( ((w6h >>> 19) | (w6l << 13)) ^ ((w6h << 3) | (w6l >>> 29)) ^ (w6h >>> 6) ) + ((w8l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0xee66dfab + w8l )|0;
        th = ( 0x983e5152 + w8h + ((tl >>> 0) < (w8l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 25
        w9l = ( w9l + w2l )|0;
        w9h = ( w9h + w2h + ((w9l >>> 0) < (w2l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w10l >>> 1) | (w10h << 31)) ^ ((w10l >>> 8) | (w10h << 24)) ^ ((w10l >>> 7) | (w10h << 25)) )|0;
        w9l = ( w9l + xl)|0;
        w9h = ( w9h + ( ((w10h >>> 1) | (w10l << 31)) ^ ((w10h >>> 8) | (w10l << 24)) ^ (w10h >>> 7) ) + ((w9l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w7l >>> 19) | (w7h << 13)) ^ ((w7l << 3) | (w7h >>> 29)) ^ ((w7l >>> 6) | (w7h << 26)) )|0;
        w9l = ( w9l + xl)|0;
        w9h = ( w9h + ( ((w7h >>> 19) | (w7l << 13)) ^ ((w7h << 3) | (w7l >>> 29)) ^ (w7h >>> 6) ) + ((w9l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x2db43210 + w9l )|0;
        th = ( 0xa831c66d + w9h + ((tl >>> 0) < (w9l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 26
        w10l = ( w10l + w3l )|0;
        w10h = ( w10h + w3h + ((w10l >>> 0) < (w3l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w11l >>> 1) | (w11h << 31)) ^ ((w11l >>> 8) | (w11h << 24)) ^ ((w11l >>> 7) | (w11h << 25)) )|0;
        w10l = ( w10l + xl)|0;
        w10h = ( w10h + ( ((w11h >>> 1) | (w11l << 31)) ^ ((w11h >>> 8) | (w11l << 24)) ^ (w11h >>> 7) ) + ((w10l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w8l >>> 19) | (w8h << 13)) ^ ((w8l << 3) | (w8h >>> 29)) ^ ((w8l >>> 6) | (w8h << 26)) )|0;
        w10l = ( w10l + xl)|0;
        w10h = ( w10h + ( ((w8h >>> 19) | (w8l << 13)) ^ ((w8h << 3) | (w8l >>> 29)) ^ (w8h >>> 6) ) + ((w10l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x98fb213f + w10l )|0;
        th = ( 0xb00327c8 + w10h + ((tl >>> 0) < (w10l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 27
        w11l = ( w11l + w4l )|0;
        w11h = ( w11h + w4h + ((w11l >>> 0) < (w4l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w12l >>> 1) | (w12h << 31)) ^ ((w12l >>> 8) | (w12h << 24)) ^ ((w12l >>> 7) | (w12h << 25)) )|0;
        w11l = ( w11l + xl)|0;
        w11h = ( w11h + ( ((w12h >>> 1) | (w12l << 31)) ^ ((w12h >>> 8) | (w12l << 24)) ^ (w12h >>> 7) ) + ((w11l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w9l >>> 19) | (w9h << 13)) ^ ((w9l << 3) | (w9h >>> 29)) ^ ((w9l >>> 6) | (w9h << 26)) )|0;
        w11l = ( w11l + xl)|0;
        w11h = ( w11h + ( ((w9h >>> 19) | (w9l << 13)) ^ ((w9h << 3) | (w9l >>> 29)) ^ (w9h >>> 6) ) + ((w11l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0xbeef0ee4 + w11l )|0;
        th = ( 0xbf597fc7 + w11h + ((tl >>> 0) < (w11l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 28
        w12l = ( w12l + w5l )|0;
        w12h = ( w12h + w5h + ((w12l >>> 0) < (w5l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w13l >>> 1) | (w13h << 31)) ^ ((w13l >>> 8) | (w13h << 24)) ^ ((w13l >>> 7) | (w13h << 25)) )|0;
        w12l = ( w12l + xl)|0;
        w12h = ( w12h + ( ((w13h >>> 1) | (w13l << 31)) ^ ((w13h >>> 8) | (w13l << 24)) ^ (w13h >>> 7) ) + ((w12l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w10l >>> 19) | (w10h << 13)) ^ ((w10l << 3) | (w10h >>> 29)) ^ ((w10l >>> 6) | (w10h << 26)) )|0;
        w12l = ( w12l + xl)|0;
        w12h = ( w12h + ( ((w10h >>> 19) | (w10l << 13)) ^ ((w10h << 3) | (w10l >>> 29)) ^ (w10h >>> 6) ) + ((w12l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x3da88fc2 + w12l )|0;
        th = ( 0xc6e00bf3 + w12h + ((tl >>> 0) < (w12l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 29
        w13l = ( w13l + w6l )|0;
        w13h = ( w13h + w6h + ((w13l >>> 0) < (w6l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w14l >>> 1) | (w14h << 31)) ^ ((w14l >>> 8) | (w14h << 24)) ^ ((w14l >>> 7) | (w14h << 25)) )|0;
        w13l = ( w13l + xl)|0;
        w13h = ( w13h + ( ((w14h >>> 1) | (w14l << 31)) ^ ((w14h >>> 8) | (w14l << 24)) ^ (w14h >>> 7) ) + ((w13l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w11l >>> 19) | (w11h << 13)) ^ ((w11l << 3) | (w11h >>> 29)) ^ ((w11l >>> 6) | (w11h << 26)) )|0;
        w13l = ( w13l + xl)|0;
        w13h = ( w13h + ( ((w11h >>> 19) | (w11l << 13)) ^ ((w11h << 3) | (w11l >>> 29)) ^ (w11h >>> 6) ) + ((w13l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x930aa725 + w13l )|0;
        th = ( 0xd5a79147 + w13h + ((tl >>> 0) < (w13l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 30
        w14l = ( w14l + w7l )|0;
        w14h = ( w14h + w7h + ((w14l >>> 0) < (w7l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w15l >>> 1) | (w15h << 31)) ^ ((w15l >>> 8) | (w15h << 24)) ^ ((w15l >>> 7) | (w15h << 25)) )|0;
        w14l = ( w14l + xl)|0;
        w14h = ( w14h + ( ((w15h >>> 1) | (w15l << 31)) ^ ((w15h >>> 8) | (w15l << 24)) ^ (w15h >>> 7) ) + ((w14l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w12l >>> 19) | (w12h << 13)) ^ ((w12l << 3) | (w12h >>> 29)) ^ ((w12l >>> 6) | (w12h << 26)) )|0;
        w14l = ( w14l + xl)|0;
        w14h = ( w14h + ( ((w12h >>> 19) | (w12l << 13)) ^ ((w12h << 3) | (w12l >>> 29)) ^ (w12h >>> 6) ) + ((w14l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0xe003826f + w14l )|0;
        th = ( 0x6ca6351 + w14h + ((tl >>> 0) < (w14l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 31
        w15l = ( w15l + w8l )|0;
        w15h = ( w15h + w8h + ((w15l >>> 0) < (w8l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w0l >>> 1) | (w0h << 31)) ^ ((w0l >>> 8) | (w0h << 24)) ^ ((w0l >>> 7) | (w0h << 25)) )|0;
        w15l = ( w15l + xl)|0;
        w15h = ( w15h + ( ((w0h >>> 1) | (w0l << 31)) ^ ((w0h >>> 8) | (w0l << 24)) ^ (w0h >>> 7) ) + ((w15l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w13l >>> 19) | (w13h << 13)) ^ ((w13l << 3) | (w13h >>> 29)) ^ ((w13l >>> 6) | (w13h << 26)) )|0;
        w15l = ( w15l + xl)|0;
        w15h = ( w15h + ( ((w13h >>> 19) | (w13l << 13)) ^ ((w13h << 3) | (w13l >>> 29)) ^ (w13h >>> 6) ) + ((w15l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0xa0e6e70 + w15l )|0;
        th = ( 0x14292967 + w15h + ((tl >>> 0) < (w15l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 32
        w0l = ( w0l + w9l )|0;
        w0h = ( w0h + w9h + ((w0l >>> 0) < (w9l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w1l >>> 1) | (w1h << 31)) ^ ((w1l >>> 8) | (w1h << 24)) ^ ((w1l >>> 7) | (w1h << 25)) )|0;
        w0l = ( w0l + xl)|0;
        w0h = ( w0h + ( ((w1h >>> 1) | (w1l << 31)) ^ ((w1h >>> 8) | (w1l << 24)) ^ (w1h >>> 7) ) + ((w0l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w14l >>> 19) | (w14h << 13)) ^ ((w14l << 3) | (w14h >>> 29)) ^ ((w14l >>> 6) | (w14h << 26)) )|0;
        w0l = ( w0l + xl)|0;
        w0h = ( w0h + ( ((w14h >>> 19) | (w14l << 13)) ^ ((w14h << 3) | (w14l >>> 29)) ^ (w14h >>> 6) ) + ((w0l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x46d22ffc + w0l )|0;
        th = ( 0x27b70a85 + w0h + ((tl >>> 0) < (w0l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 33
        w1l = ( w1l + w10l )|0;
        w1h = ( w1h + w10h + ((w1l >>> 0) < (w10l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w2l >>> 1) | (w2h << 31)) ^ ((w2l >>> 8) | (w2h << 24)) ^ ((w2l >>> 7) | (w2h << 25)) )|0;
        w1l = ( w1l + xl)|0;
        w1h = ( w1h + ( ((w2h >>> 1) | (w2l << 31)) ^ ((w2h >>> 8) | (w2l << 24)) ^ (w2h >>> 7) ) + ((w1l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w15l >>> 19) | (w15h << 13)) ^ ((w15l << 3) | (w15h >>> 29)) ^ ((w15l >>> 6) | (w15h << 26)) )|0;
        w1l = ( w1l + xl)|0;
        w1h = ( w1h + ( ((w15h >>> 19) | (w15l << 13)) ^ ((w15h << 3) | (w15l >>> 29)) ^ (w15h >>> 6) ) + ((w1l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x5c26c926 + w1l )|0;
        th = ( 0x2e1b2138 + w1h + ((tl >>> 0) < (w1l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 34
        w2l = ( w2l + w11l )|0;
        w2h = ( w2h + w11h + ((w2l >>> 0) < (w11l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w3l >>> 1) | (w3h << 31)) ^ ((w3l >>> 8) | (w3h << 24)) ^ ((w3l >>> 7) | (w3h << 25)) )|0;
        w2l = ( w2l + xl)|0;
        w2h = ( w2h + ( ((w3h >>> 1) | (w3l << 31)) ^ ((w3h >>> 8) | (w3l << 24)) ^ (w3h >>> 7) ) + ((w2l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w0l >>> 19) | (w0h << 13)) ^ ((w0l << 3) | (w0h >>> 29)) ^ ((w0l >>> 6) | (w0h << 26)) )|0;
        w2l = ( w2l + xl)|0;
        w2h = ( w2h + ( ((w0h >>> 19) | (w0l << 13)) ^ ((w0h << 3) | (w0l >>> 29)) ^ (w0h >>> 6) ) + ((w2l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x5ac42aed + w2l )|0;
        th = ( 0x4d2c6dfc + w2h + ((tl >>> 0) < (w2l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 35
        w3l = ( w3l + w12l )|0;
        w3h = ( w3h + w12h + ((w3l >>> 0) < (w12l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w4l >>> 1) | (w4h << 31)) ^ ((w4l >>> 8) | (w4h << 24)) ^ ((w4l >>> 7) | (w4h << 25)) )|0;
        w3l = ( w3l + xl)|0;
        w3h = ( w3h + ( ((w4h >>> 1) | (w4l << 31)) ^ ((w4h >>> 8) | (w4l << 24)) ^ (w4h >>> 7) ) + ((w3l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w1l >>> 19) | (w1h << 13)) ^ ((w1l << 3) | (w1h >>> 29)) ^ ((w1l >>> 6) | (w1h << 26)) )|0;
        w3l = ( w3l + xl)|0;
        w3h = ( w3h + ( ((w1h >>> 19) | (w1l << 13)) ^ ((w1h << 3) | (w1l >>> 29)) ^ (w1h >>> 6) ) + ((w3l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x9d95b3df + w3l )|0;
        th = ( 0x53380d13 + w3h + ((tl >>> 0) < (w3l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 36
        w4l = ( w4l + w13l )|0;
        w4h = ( w4h + w13h + ((w4l >>> 0) < (w13l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w5l >>> 1) | (w5h << 31)) ^ ((w5l >>> 8) | (w5h << 24)) ^ ((w5l >>> 7) | (w5h << 25)) )|0;
        w4l = ( w4l + xl)|0;
        w4h = ( w4h + ( ((w5h >>> 1) | (w5l << 31)) ^ ((w5h >>> 8) | (w5l << 24)) ^ (w5h >>> 7) ) + ((w4l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w2l >>> 19) | (w2h << 13)) ^ ((w2l << 3) | (w2h >>> 29)) ^ ((w2l >>> 6) | (w2h << 26)) )|0;
        w4l = ( w4l + xl)|0;
        w4h = ( w4h + ( ((w2h >>> 19) | (w2l << 13)) ^ ((w2h << 3) | (w2l >>> 29)) ^ (w2h >>> 6) ) + ((w4l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x8baf63de + w4l )|0;
        th = ( 0x650a7354 + w4h + ((tl >>> 0) < (w4l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 37
        w5l = ( w5l + w14l )|0;
        w5h = ( w5h + w14h + ((w5l >>> 0) < (w14l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w6l >>> 1) | (w6h << 31)) ^ ((w6l >>> 8) | (w6h << 24)) ^ ((w6l >>> 7) | (w6h << 25)) )|0;
        w5l = ( w5l + xl)|0;
        w5h = ( w5h + ( ((w6h >>> 1) | (w6l << 31)) ^ ((w6h >>> 8) | (w6l << 24)) ^ (w6h >>> 7) ) + ((w5l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w3l >>> 19) | (w3h << 13)) ^ ((w3l << 3) | (w3h >>> 29)) ^ ((w3l >>> 6) | (w3h << 26)) )|0;
        w5l = ( w5l + xl)|0;
        w5h = ( w5h + ( ((w3h >>> 19) | (w3l << 13)) ^ ((w3h << 3) | (w3l >>> 29)) ^ (w3h >>> 6) ) + ((w5l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x3c77b2a8 + w5l )|0;
        th = ( 0x766a0abb + w5h + ((tl >>> 0) < (w5l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 38
        w6l = ( w6l + w15l )|0;
        w6h = ( w6h + w15h + ((w6l >>> 0) < (w15l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w7l >>> 1) | (w7h << 31)) ^ ((w7l >>> 8) | (w7h << 24)) ^ ((w7l >>> 7) | (w7h << 25)) )|0;
        w6l = ( w6l + xl)|0;
        w6h = ( w6h + ( ((w7h >>> 1) | (w7l << 31)) ^ ((w7h >>> 8) | (w7l << 24)) ^ (w7h >>> 7) ) + ((w6l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w4l >>> 19) | (w4h << 13)) ^ ((w4l << 3) | (w4h >>> 29)) ^ ((w4l >>> 6) | (w4h << 26)) )|0;
        w6l = ( w6l + xl)|0;
        w6h = ( w6h + ( ((w4h >>> 19) | (w4l << 13)) ^ ((w4h << 3) | (w4l >>> 29)) ^ (w4h >>> 6) ) + ((w6l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x47edaee6 + w6l )|0;
        th = ( 0x81c2c92e + w6h + ((tl >>> 0) < (w6l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 39
        w7l = ( w7l + w0l )|0;
        w7h = ( w7h + w0h + ((w7l >>> 0) < (w0l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w8l >>> 1) | (w8h << 31)) ^ ((w8l >>> 8) | (w8h << 24)) ^ ((w8l >>> 7) | (w8h << 25)) )|0;
        w7l = ( w7l + xl)|0;
        w7h = ( w7h + ( ((w8h >>> 1) | (w8l << 31)) ^ ((w8h >>> 8) | (w8l << 24)) ^ (w8h >>> 7) ) + ((w7l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w5l >>> 19) | (w5h << 13)) ^ ((w5l << 3) | (w5h >>> 29)) ^ ((w5l >>> 6) | (w5h << 26)) )|0;
        w7l = ( w7l + xl)|0;
        w7h = ( w7h + ( ((w5h >>> 19) | (w5l << 13)) ^ ((w5h << 3) | (w5l >>> 29)) ^ (w5h >>> 6) ) + ((w7l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x1482353b + w7l )|0;
        th = ( 0x92722c85 + w7h + ((tl >>> 0) < (w7l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 40
        w8l = ( w8l + w1l )|0;
        w8h = ( w8h + w1h + ((w8l >>> 0) < (w1l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w9l >>> 1) | (w9h << 31)) ^ ((w9l >>> 8) | (w9h << 24)) ^ ((w9l >>> 7) | (w9h << 25)) )|0;
        w8l = ( w8l + xl)|0;
        w8h = ( w8h + ( ((w9h >>> 1) | (w9l << 31)) ^ ((w9h >>> 8) | (w9l << 24)) ^ (w9h >>> 7) ) + ((w8l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w6l >>> 19) | (w6h << 13)) ^ ((w6l << 3) | (w6h >>> 29)) ^ ((w6l >>> 6) | (w6h << 26)) )|0;
        w8l = ( w8l + xl)|0;
        w8h = ( w8h + ( ((w6h >>> 19) | (w6l << 13)) ^ ((w6h << 3) | (w6l >>> 29)) ^ (w6h >>> 6) ) + ((w8l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x4cf10364 + w8l )|0;
        th = ( 0xa2bfe8a1 + w8h + ((tl >>> 0) < (w8l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 41
        w9l = ( w9l + w2l )|0;
        w9h = ( w9h + w2h + ((w9l >>> 0) < (w2l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w10l >>> 1) | (w10h << 31)) ^ ((w10l >>> 8) | (w10h << 24)) ^ ((w10l >>> 7) | (w10h << 25)) )|0;
        w9l = ( w9l + xl)|0;
        w9h = ( w9h + ( ((w10h >>> 1) | (w10l << 31)) ^ ((w10h >>> 8) | (w10l << 24)) ^ (w10h >>> 7) ) + ((w9l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w7l >>> 19) | (w7h << 13)) ^ ((w7l << 3) | (w7h >>> 29)) ^ ((w7l >>> 6) | (w7h << 26)) )|0;
        w9l = ( w9l + xl)|0;
        w9h = ( w9h + ( ((w7h >>> 19) | (w7l << 13)) ^ ((w7h << 3) | (w7l >>> 29)) ^ (w7h >>> 6) ) + ((w9l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0xbc423001 + w9l )|0;
        th = ( 0xa81a664b + w9h + ((tl >>> 0) < (w9l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 42
        w10l = ( w10l + w3l )|0;
        w10h = ( w10h + w3h + ((w10l >>> 0) < (w3l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w11l >>> 1) | (w11h << 31)) ^ ((w11l >>> 8) | (w11h << 24)) ^ ((w11l >>> 7) | (w11h << 25)) )|0;
        w10l = ( w10l + xl)|0;
        w10h = ( w10h + ( ((w11h >>> 1) | (w11l << 31)) ^ ((w11h >>> 8) | (w11l << 24)) ^ (w11h >>> 7) ) + ((w10l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w8l >>> 19) | (w8h << 13)) ^ ((w8l << 3) | (w8h >>> 29)) ^ ((w8l >>> 6) | (w8h << 26)) )|0;
        w10l = ( w10l + xl)|0;
        w10h = ( w10h + ( ((w8h >>> 19) | (w8l << 13)) ^ ((w8h << 3) | (w8l >>> 29)) ^ (w8h >>> 6) ) + ((w10l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0xd0f89791 + w10l )|0;
        th = ( 0xc24b8b70 + w10h + ((tl >>> 0) < (w10l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 43
        w11l = ( w11l + w4l )|0;
        w11h = ( w11h + w4h + ((w11l >>> 0) < (w4l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w12l >>> 1) | (w12h << 31)) ^ ((w12l >>> 8) | (w12h << 24)) ^ ((w12l >>> 7) | (w12h << 25)) )|0;
        w11l = ( w11l + xl)|0;
        w11h = ( w11h + ( ((w12h >>> 1) | (w12l << 31)) ^ ((w12h >>> 8) | (w12l << 24)) ^ (w12h >>> 7) ) + ((w11l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w9l >>> 19) | (w9h << 13)) ^ ((w9l << 3) | (w9h >>> 29)) ^ ((w9l >>> 6) | (w9h << 26)) )|0;
        w11l = ( w11l + xl)|0;
        w11h = ( w11h + ( ((w9h >>> 19) | (w9l << 13)) ^ ((w9h << 3) | (w9l >>> 29)) ^ (w9h >>> 6) ) + ((w11l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x654be30 + w11l )|0;
        th = ( 0xc76c51a3 + w11h + ((tl >>> 0) < (w11l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 44
        w12l = ( w12l + w5l )|0;
        w12h = ( w12h + w5h + ((w12l >>> 0) < (w5l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w13l >>> 1) | (w13h << 31)) ^ ((w13l >>> 8) | (w13h << 24)) ^ ((w13l >>> 7) | (w13h << 25)) )|0;
        w12l = ( w12l + xl)|0;
        w12h = ( w12h + ( ((w13h >>> 1) | (w13l << 31)) ^ ((w13h >>> 8) | (w13l << 24)) ^ (w13h >>> 7) ) + ((w12l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w10l >>> 19) | (w10h << 13)) ^ ((w10l << 3) | (w10h >>> 29)) ^ ((w10l >>> 6) | (w10h << 26)) )|0;
        w12l = ( w12l + xl)|0;
        w12h = ( w12h + ( ((w10h >>> 19) | (w10l << 13)) ^ ((w10h << 3) | (w10l >>> 29)) ^ (w10h >>> 6) ) + ((w12l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0xd6ef5218 + w12l )|0;
        th = ( 0xd192e819 + w12h + ((tl >>> 0) < (w12l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 45
        w13l = ( w13l + w6l )|0;
        w13h = ( w13h + w6h + ((w13l >>> 0) < (w6l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w14l >>> 1) | (w14h << 31)) ^ ((w14l >>> 8) | (w14h << 24)) ^ ((w14l >>> 7) | (w14h << 25)) )|0;
        w13l = ( w13l + xl)|0;
        w13h = ( w13h + ( ((w14h >>> 1) | (w14l << 31)) ^ ((w14h >>> 8) | (w14l << 24)) ^ (w14h >>> 7) ) + ((w13l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w11l >>> 19) | (w11h << 13)) ^ ((w11l << 3) | (w11h >>> 29)) ^ ((w11l >>> 6) | (w11h << 26)) )|0;
        w13l = ( w13l + xl)|0;
        w13h = ( w13h + ( ((w11h >>> 19) | (w11l << 13)) ^ ((w11h << 3) | (w11l >>> 29)) ^ (w11h >>> 6) ) + ((w13l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x5565a910 + w13l )|0;
        th = ( 0xd6990624 + w13h + ((tl >>> 0) < (w13l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 46
        w14l = ( w14l + w7l )|0;
        w14h = ( w14h + w7h + ((w14l >>> 0) < (w7l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w15l >>> 1) | (w15h << 31)) ^ ((w15l >>> 8) | (w15h << 24)) ^ ((w15l >>> 7) | (w15h << 25)) )|0;
        w14l = ( w14l + xl)|0;
        w14h = ( w14h + ( ((w15h >>> 1) | (w15l << 31)) ^ ((w15h >>> 8) | (w15l << 24)) ^ (w15h >>> 7) ) + ((w14l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w12l >>> 19) | (w12h << 13)) ^ ((w12l << 3) | (w12h >>> 29)) ^ ((w12l >>> 6) | (w12h << 26)) )|0;
        w14l = ( w14l + xl)|0;
        w14h = ( w14h + ( ((w12h >>> 19) | (w12l << 13)) ^ ((w12h << 3) | (w12l >>> 29)) ^ (w12h >>> 6) ) + ((w14l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x5771202a + w14l )|0;
        th = ( 0xf40e3585 + w14h + ((tl >>> 0) < (w14l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 47
        w15l = ( w15l + w8l )|0;
        w15h = ( w15h + w8h + ((w15l >>> 0) < (w8l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w0l >>> 1) | (w0h << 31)) ^ ((w0l >>> 8) | (w0h << 24)) ^ ((w0l >>> 7) | (w0h << 25)) )|0;
        w15l = ( w15l + xl)|0;
        w15h = ( w15h + ( ((w0h >>> 1) | (w0l << 31)) ^ ((w0h >>> 8) | (w0l << 24)) ^ (w0h >>> 7) ) + ((w15l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w13l >>> 19) | (w13h << 13)) ^ ((w13l << 3) | (w13h >>> 29)) ^ ((w13l >>> 6) | (w13h << 26)) )|0;
        w15l = ( w15l + xl)|0;
        w15h = ( w15h + ( ((w13h >>> 19) | (w13l << 13)) ^ ((w13h << 3) | (w13l >>> 29)) ^ (w13h >>> 6) ) + ((w15l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x32bbd1b8 + w15l )|0;
        th = ( 0x106aa070 + w15h + ((tl >>> 0) < (w15l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 48
        w0l = ( w0l + w9l )|0;
        w0h = ( w0h + w9h + ((w0l >>> 0) < (w9l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w1l >>> 1) | (w1h << 31)) ^ ((w1l >>> 8) | (w1h << 24)) ^ ((w1l >>> 7) | (w1h << 25)) )|0;
        w0l = ( w0l + xl)|0;
        w0h = ( w0h + ( ((w1h >>> 1) | (w1l << 31)) ^ ((w1h >>> 8) | (w1l << 24)) ^ (w1h >>> 7) ) + ((w0l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w14l >>> 19) | (w14h << 13)) ^ ((w14l << 3) | (w14h >>> 29)) ^ ((w14l >>> 6) | (w14h << 26)) )|0;
        w0l = ( w0l + xl)|0;
        w0h = ( w0h + ( ((w14h >>> 19) | (w14l << 13)) ^ ((w14h << 3) | (w14l >>> 29)) ^ (w14h >>> 6) ) + ((w0l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0xb8d2d0c8 + w0l )|0;
        th = ( 0x19a4c116 + w0h + ((tl >>> 0) < (w0l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 49
        w1l = ( w1l + w10l )|0;
        w1h = ( w1h + w10h + ((w1l >>> 0) < (w10l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w2l >>> 1) | (w2h << 31)) ^ ((w2l >>> 8) | (w2h << 24)) ^ ((w2l >>> 7) | (w2h << 25)) )|0;
        w1l = ( w1l + xl)|0;
        w1h = ( w1h + ( ((w2h >>> 1) | (w2l << 31)) ^ ((w2h >>> 8) | (w2l << 24)) ^ (w2h >>> 7) ) + ((w1l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w15l >>> 19) | (w15h << 13)) ^ ((w15l << 3) | (w15h >>> 29)) ^ ((w15l >>> 6) | (w15h << 26)) )|0;
        w1l = ( w1l + xl)|0;
        w1h = ( w1h + ( ((w15h >>> 19) | (w15l << 13)) ^ ((w15h << 3) | (w15l >>> 29)) ^ (w15h >>> 6) ) + ((w1l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x5141ab53 + w1l )|0;
        th = ( 0x1e376c08 + w1h + ((tl >>> 0) < (w1l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 50
        w2l = ( w2l + w11l )|0;
        w2h = ( w2h + w11h + ((w2l >>> 0) < (w11l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w3l >>> 1) | (w3h << 31)) ^ ((w3l >>> 8) | (w3h << 24)) ^ ((w3l >>> 7) | (w3h << 25)) )|0;
        w2l = ( w2l + xl)|0;
        w2h = ( w2h + ( ((w3h >>> 1) | (w3l << 31)) ^ ((w3h >>> 8) | (w3l << 24)) ^ (w3h >>> 7) ) + ((w2l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w0l >>> 19) | (w0h << 13)) ^ ((w0l << 3) | (w0h >>> 29)) ^ ((w0l >>> 6) | (w0h << 26)) )|0;
        w2l = ( w2l + xl)|0;
        w2h = ( w2h + ( ((w0h >>> 19) | (w0l << 13)) ^ ((w0h << 3) | (w0l >>> 29)) ^ (w0h >>> 6) ) + ((w2l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0xdf8eeb99 + w2l )|0;
        th = ( 0x2748774c + w2h + ((tl >>> 0) < (w2l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 51
        w3l = ( w3l + w12l )|0;
        w3h = ( w3h + w12h + ((w3l >>> 0) < (w12l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w4l >>> 1) | (w4h << 31)) ^ ((w4l >>> 8) | (w4h << 24)) ^ ((w4l >>> 7) | (w4h << 25)) )|0;
        w3l = ( w3l + xl)|0;
        w3h = ( w3h + ( ((w4h >>> 1) | (w4l << 31)) ^ ((w4h >>> 8) | (w4l << 24)) ^ (w4h >>> 7) ) + ((w3l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w1l >>> 19) | (w1h << 13)) ^ ((w1l << 3) | (w1h >>> 29)) ^ ((w1l >>> 6) | (w1h << 26)) )|0;
        w3l = ( w3l + xl)|0;
        w3h = ( w3h + ( ((w1h >>> 19) | (w1l << 13)) ^ ((w1h << 3) | (w1l >>> 29)) ^ (w1h >>> 6) ) + ((w3l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0xe19b48a8 + w3l )|0;
        th = ( 0x34b0bcb5 + w3h + ((tl >>> 0) < (w3l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 52
        w4l = ( w4l + w13l )|0;
        w4h = ( w4h + w13h + ((w4l >>> 0) < (w13l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w5l >>> 1) | (w5h << 31)) ^ ((w5l >>> 8) | (w5h << 24)) ^ ((w5l >>> 7) | (w5h << 25)) )|0;
        w4l = ( w4l + xl)|0;
        w4h = ( w4h + ( ((w5h >>> 1) | (w5l << 31)) ^ ((w5h >>> 8) | (w5l << 24)) ^ (w5h >>> 7) ) + ((w4l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w2l >>> 19) | (w2h << 13)) ^ ((w2l << 3) | (w2h >>> 29)) ^ ((w2l >>> 6) | (w2h << 26)) )|0;
        w4l = ( w4l + xl)|0;
        w4h = ( w4h + ( ((w2h >>> 19) | (w2l << 13)) ^ ((w2h << 3) | (w2l >>> 29)) ^ (w2h >>> 6) ) + ((w4l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0xc5c95a63 + w4l )|0;
        th = ( 0x391c0cb3 + w4h + ((tl >>> 0) < (w4l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 53
        w5l = ( w5l + w14l )|0;
        w5h = ( w5h + w14h + ((w5l >>> 0) < (w14l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w6l >>> 1) | (w6h << 31)) ^ ((w6l >>> 8) | (w6h << 24)) ^ ((w6l >>> 7) | (w6h << 25)) )|0;
        w5l = ( w5l + xl)|0;
        w5h = ( w5h + ( ((w6h >>> 1) | (w6l << 31)) ^ ((w6h >>> 8) | (w6l << 24)) ^ (w6h >>> 7) ) + ((w5l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w3l >>> 19) | (w3h << 13)) ^ ((w3l << 3) | (w3h >>> 29)) ^ ((w3l >>> 6) | (w3h << 26)) )|0;
        w5l = ( w5l + xl)|0;
        w5h = ( w5h + ( ((w3h >>> 19) | (w3l << 13)) ^ ((w3h << 3) | (w3l >>> 29)) ^ (w3h >>> 6) ) + ((w5l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0xe3418acb + w5l )|0;
        th = ( 0x4ed8aa4a + w5h + ((tl >>> 0) < (w5l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 54
        w6l = ( w6l + w15l )|0;
        w6h = ( w6h + w15h + ((w6l >>> 0) < (w15l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w7l >>> 1) | (w7h << 31)) ^ ((w7l >>> 8) | (w7h << 24)) ^ ((w7l >>> 7) | (w7h << 25)) )|0;
        w6l = ( w6l + xl)|0;
        w6h = ( w6h + ( ((w7h >>> 1) | (w7l << 31)) ^ ((w7h >>> 8) | (w7l << 24)) ^ (w7h >>> 7) ) + ((w6l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w4l >>> 19) | (w4h << 13)) ^ ((w4l << 3) | (w4h >>> 29)) ^ ((w4l >>> 6) | (w4h << 26)) )|0;
        w6l = ( w6l + xl)|0;
        w6h = ( w6h + ( ((w4h >>> 19) | (w4l << 13)) ^ ((w4h << 3) | (w4l >>> 29)) ^ (w4h >>> 6) ) + ((w6l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x7763e373 + w6l )|0;
        th = ( 0x5b9cca4f + w6h + ((tl >>> 0) < (w6l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 55
        w7l = ( w7l + w0l )|0;
        w7h = ( w7h + w0h + ((w7l >>> 0) < (w0l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w8l >>> 1) | (w8h << 31)) ^ ((w8l >>> 8) | (w8h << 24)) ^ ((w8l >>> 7) | (w8h << 25)) )|0;
        w7l = ( w7l + xl)|0;
        w7h = ( w7h + ( ((w8h >>> 1) | (w8l << 31)) ^ ((w8h >>> 8) | (w8l << 24)) ^ (w8h >>> 7) ) + ((w7l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w5l >>> 19) | (w5h << 13)) ^ ((w5l << 3) | (w5h >>> 29)) ^ ((w5l >>> 6) | (w5h << 26)) )|0;
        w7l = ( w7l + xl)|0;
        w7h = ( w7h + ( ((w5h >>> 19) | (w5l << 13)) ^ ((w5h << 3) | (w5l >>> 29)) ^ (w5h >>> 6) ) + ((w7l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0xd6b2b8a3 + w7l )|0;
        th = ( 0x682e6ff3 + w7h + ((tl >>> 0) < (w7l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 56
        w8l = ( w8l + w1l )|0;
        w8h = ( w8h + w1h + ((w8l >>> 0) < (w1l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w9l >>> 1) | (w9h << 31)) ^ ((w9l >>> 8) | (w9h << 24)) ^ ((w9l >>> 7) | (w9h << 25)) )|0;
        w8l = ( w8l + xl)|0;
        w8h = ( w8h + ( ((w9h >>> 1) | (w9l << 31)) ^ ((w9h >>> 8) | (w9l << 24)) ^ (w9h >>> 7) ) + ((w8l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w6l >>> 19) | (w6h << 13)) ^ ((w6l << 3) | (w6h >>> 29)) ^ ((w6l >>> 6) | (w6h << 26)) )|0;
        w8l = ( w8l + xl)|0;
        w8h = ( w8h + ( ((w6h >>> 19) | (w6l << 13)) ^ ((w6h << 3) | (w6l >>> 29)) ^ (w6h >>> 6) ) + ((w8l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x5defb2fc + w8l )|0;
        th = ( 0x748f82ee + w8h + ((tl >>> 0) < (w8l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 57
        w9l = ( w9l + w2l )|0;
        w9h = ( w9h + w2h + ((w9l >>> 0) < (w2l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w10l >>> 1) | (w10h << 31)) ^ ((w10l >>> 8) | (w10h << 24)) ^ ((w10l >>> 7) | (w10h << 25)) )|0;
        w9l = ( w9l + xl)|0;
        w9h = ( w9h + ( ((w10h >>> 1) | (w10l << 31)) ^ ((w10h >>> 8) | (w10l << 24)) ^ (w10h >>> 7) ) + ((w9l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w7l >>> 19) | (w7h << 13)) ^ ((w7l << 3) | (w7h >>> 29)) ^ ((w7l >>> 6) | (w7h << 26)) )|0;
        w9l = ( w9l + xl)|0;
        w9h = ( w9h + ( ((w7h >>> 19) | (w7l << 13)) ^ ((w7h << 3) | (w7l >>> 29)) ^ (w7h >>> 6) ) + ((w9l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x43172f60 + w9l )|0;
        th = ( 0x78a5636f + w9h + ((tl >>> 0) < (w9l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 58
        w10l = ( w10l + w3l )|0;
        w10h = ( w10h + w3h + ((w10l >>> 0) < (w3l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w11l >>> 1) | (w11h << 31)) ^ ((w11l >>> 8) | (w11h << 24)) ^ ((w11l >>> 7) | (w11h << 25)) )|0;
        w10l = ( w10l + xl)|0;
        w10h = ( w10h + ( ((w11h >>> 1) | (w11l << 31)) ^ ((w11h >>> 8) | (w11l << 24)) ^ (w11h >>> 7) ) + ((w10l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w8l >>> 19) | (w8h << 13)) ^ ((w8l << 3) | (w8h >>> 29)) ^ ((w8l >>> 6) | (w8h << 26)) )|0;
        w10l = ( w10l + xl)|0;
        w10h = ( w10h + ( ((w8h >>> 19) | (w8l << 13)) ^ ((w8h << 3) | (w8l >>> 29)) ^ (w8h >>> 6) ) + ((w10l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0xa1f0ab72 + w10l )|0;
        th = ( 0x84c87814 + w10h + ((tl >>> 0) < (w10l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 59
        w11l = ( w11l + w4l )|0;
        w11h = ( w11h + w4h + ((w11l >>> 0) < (w4l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w12l >>> 1) | (w12h << 31)) ^ ((w12l >>> 8) | (w12h << 24)) ^ ((w12l >>> 7) | (w12h << 25)) )|0;
        w11l = ( w11l + xl)|0;
        w11h = ( w11h + ( ((w12h >>> 1) | (w12l << 31)) ^ ((w12h >>> 8) | (w12l << 24)) ^ (w12h >>> 7) ) + ((w11l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w9l >>> 19) | (w9h << 13)) ^ ((w9l << 3) | (w9h >>> 29)) ^ ((w9l >>> 6) | (w9h << 26)) )|0;
        w11l = ( w11l + xl)|0;
        w11h = ( w11h + ( ((w9h >>> 19) | (w9l << 13)) ^ ((w9h << 3) | (w9l >>> 29)) ^ (w9h >>> 6) ) + ((w11l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x1a6439ec + w11l )|0;
        th = ( 0x8cc70208 + w11h + ((tl >>> 0) < (w11l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 60
        w12l = ( w12l + w5l )|0;
        w12h = ( w12h + w5h + ((w12l >>> 0) < (w5l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w13l >>> 1) | (w13h << 31)) ^ ((w13l >>> 8) | (w13h << 24)) ^ ((w13l >>> 7) | (w13h << 25)) )|0;
        w12l = ( w12l + xl)|0;
        w12h = ( w12h + ( ((w13h >>> 1) | (w13l << 31)) ^ ((w13h >>> 8) | (w13l << 24)) ^ (w13h >>> 7) ) + ((w12l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w10l >>> 19) | (w10h << 13)) ^ ((w10l << 3) | (w10h >>> 29)) ^ ((w10l >>> 6) | (w10h << 26)) )|0;
        w12l = ( w12l + xl)|0;
        w12h = ( w12h + ( ((w10h >>> 19) | (w10l << 13)) ^ ((w10h << 3) | (w10l >>> 29)) ^ (w10h >>> 6) ) + ((w12l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x23631e28 + w12l )|0;
        th = ( 0x90befffa + w12h + ((tl >>> 0) < (w12l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 61
        w13l = ( w13l + w6l )|0;
        w13h = ( w13h + w6h + ((w13l >>> 0) < (w6l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w14l >>> 1) | (w14h << 31)) ^ ((w14l >>> 8) | (w14h << 24)) ^ ((w14l >>> 7) | (w14h << 25)) )|0;
        w13l = ( w13l + xl)|0;
        w13h = ( w13h + ( ((w14h >>> 1) | (w14l << 31)) ^ ((w14h >>> 8) | (w14l << 24)) ^ (w14h >>> 7) ) + ((w13l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w11l >>> 19) | (w11h << 13)) ^ ((w11l << 3) | (w11h >>> 29)) ^ ((w11l >>> 6) | (w11h << 26)) )|0;
        w13l = ( w13l + xl)|0;
        w13h = ( w13h + ( ((w11h >>> 19) | (w11l << 13)) ^ ((w11h << 3) | (w11l >>> 29)) ^ (w11h >>> 6) ) + ((w13l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0xde82bde9 + w13l )|0;
        th = ( 0xa4506ceb + w13h + ((tl >>> 0) < (w13l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 62
        w14l = ( w14l + w7l )|0;
        w14h = ( w14h + w7h + ((w14l >>> 0) < (w7l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w15l >>> 1) | (w15h << 31)) ^ ((w15l >>> 8) | (w15h << 24)) ^ ((w15l >>> 7) | (w15h << 25)) )|0;
        w14l = ( w14l + xl)|0;
        w14h = ( w14h + ( ((w15h >>> 1) | (w15l << 31)) ^ ((w15h >>> 8) | (w15l << 24)) ^ (w15h >>> 7) ) + ((w14l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w12l >>> 19) | (w12h << 13)) ^ ((w12l << 3) | (w12h >>> 29)) ^ ((w12l >>> 6) | (w12h << 26)) )|0;
        w14l = ( w14l + xl)|0;
        w14h = ( w14h + ( ((w12h >>> 19) | (w12l << 13)) ^ ((w12h << 3) | (w12l >>> 29)) ^ (w12h >>> 6) ) + ((w14l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0xb2c67915 + w14l )|0;
        th = ( 0xbef9a3f7 + w14h + ((tl >>> 0) < (w14l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 63
        w15l = ( w15l + w8l )|0;
        w15h = ( w15h + w8h + ((w15l >>> 0) < (w8l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w0l >>> 1) | (w0h << 31)) ^ ((w0l >>> 8) | (w0h << 24)) ^ ((w0l >>> 7) | (w0h << 25)) )|0;
        w15l = ( w15l + xl)|0;
        w15h = ( w15h + ( ((w0h >>> 1) | (w0l << 31)) ^ ((w0h >>> 8) | (w0l << 24)) ^ (w0h >>> 7) ) + ((w15l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w13l >>> 19) | (w13h << 13)) ^ ((w13l << 3) | (w13h >>> 29)) ^ ((w13l >>> 6) | (w13h << 26)) )|0;
        w15l = ( w15l + xl)|0;
        w15h = ( w15h + ( ((w13h >>> 19) | (w13l << 13)) ^ ((w13h << 3) | (w13l >>> 29)) ^ (w13h >>> 6) ) + ((w15l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0xe372532b + w15l )|0;
        th = ( 0xc67178f2 + w15h + ((tl >>> 0) < (w15l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 64
        w0l = ( w0l + w9l )|0;
        w0h = ( w0h + w9h + ((w0l >>> 0) < (w9l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w1l >>> 1) | (w1h << 31)) ^ ((w1l >>> 8) | (w1h << 24)) ^ ((w1l >>> 7) | (w1h << 25)) )|0;
        w0l = ( w0l + xl)|0;
        w0h = ( w0h + ( ((w1h >>> 1) | (w1l << 31)) ^ ((w1h >>> 8) | (w1l << 24)) ^ (w1h >>> 7) ) + ((w0l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w14l >>> 19) | (w14h << 13)) ^ ((w14l << 3) | (w14h >>> 29)) ^ ((w14l >>> 6) | (w14h << 26)) )|0;
        w0l = ( w0l + xl)|0;
        w0h = ( w0h + ( ((w14h >>> 19) | (w14l << 13)) ^ ((w14h << 3) | (w14l >>> 29)) ^ (w14h >>> 6) ) + ((w0l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0xea26619c + w0l )|0;
        th = ( 0xca273ece + w0h + ((tl >>> 0) < (w0l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 65
        w1l = ( w1l + w10l )|0;
        w1h = ( w1h + w10h + ((w1l >>> 0) < (w10l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w2l >>> 1) | (w2h << 31)) ^ ((w2l >>> 8) | (w2h << 24)) ^ ((w2l >>> 7) | (w2h << 25)) )|0;
        w1l = ( w1l + xl)|0;
        w1h = ( w1h + ( ((w2h >>> 1) | (w2l << 31)) ^ ((w2h >>> 8) | (w2l << 24)) ^ (w2h >>> 7) ) + ((w1l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w15l >>> 19) | (w15h << 13)) ^ ((w15l << 3) | (w15h >>> 29)) ^ ((w15l >>> 6) | (w15h << 26)) )|0;
        w1l = ( w1l + xl)|0;
        w1h = ( w1h + ( ((w15h >>> 19) | (w15l << 13)) ^ ((w15h << 3) | (w15l >>> 29)) ^ (w15h >>> 6) ) + ((w1l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x21c0c207 + w1l )|0;
        th = ( 0xd186b8c7 + w1h + ((tl >>> 0) < (w1l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 66
        w2l = ( w2l + w11l )|0;
        w2h = ( w2h + w11h + ((w2l >>> 0) < (w11l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w3l >>> 1) | (w3h << 31)) ^ ((w3l >>> 8) | (w3h << 24)) ^ ((w3l >>> 7) | (w3h << 25)) )|0;
        w2l = ( w2l + xl)|0;
        w2h = ( w2h + ( ((w3h >>> 1) | (w3l << 31)) ^ ((w3h >>> 8) | (w3l << 24)) ^ (w3h >>> 7) ) + ((w2l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w0l >>> 19) | (w0h << 13)) ^ ((w0l << 3) | (w0h >>> 29)) ^ ((w0l >>> 6) | (w0h << 26)) )|0;
        w2l = ( w2l + xl)|0;
        w2h = ( w2h + ( ((w0h >>> 19) | (w0l << 13)) ^ ((w0h << 3) | (w0l >>> 29)) ^ (w0h >>> 6) ) + ((w2l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0xcde0eb1e + w2l )|0;
        th = ( 0xeada7dd6 + w2h + ((tl >>> 0) < (w2l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 67
        w3l = ( w3l + w12l )|0;
        w3h = ( w3h + w12h + ((w3l >>> 0) < (w12l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w4l >>> 1) | (w4h << 31)) ^ ((w4l >>> 8) | (w4h << 24)) ^ ((w4l >>> 7) | (w4h << 25)) )|0;
        w3l = ( w3l + xl)|0;
        w3h = ( w3h + ( ((w4h >>> 1) | (w4l << 31)) ^ ((w4h >>> 8) | (w4l << 24)) ^ (w4h >>> 7) ) + ((w3l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w1l >>> 19) | (w1h << 13)) ^ ((w1l << 3) | (w1h >>> 29)) ^ ((w1l >>> 6) | (w1h << 26)) )|0;
        w3l = ( w3l + xl)|0;
        w3h = ( w3h + ( ((w1h >>> 19) | (w1l << 13)) ^ ((w1h << 3) | (w1l >>> 29)) ^ (w1h >>> 6) ) + ((w3l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0xee6ed178 + w3l )|0;
        th = ( 0xf57d4f7f + w3h + ((tl >>> 0) < (w3l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 68
        w4l = ( w4l + w13l )|0;
        w4h = ( w4h + w13h + ((w4l >>> 0) < (w13l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w5l >>> 1) | (w5h << 31)) ^ ((w5l >>> 8) | (w5h << 24)) ^ ((w5l >>> 7) | (w5h << 25)) )|0;
        w4l = ( w4l + xl)|0;
        w4h = ( w4h + ( ((w5h >>> 1) | (w5l << 31)) ^ ((w5h >>> 8) | (w5l << 24)) ^ (w5h >>> 7) ) + ((w4l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w2l >>> 19) | (w2h << 13)) ^ ((w2l << 3) | (w2h >>> 29)) ^ ((w2l >>> 6) | (w2h << 26)) )|0;
        w4l = ( w4l + xl)|0;
        w4h = ( w4h + ( ((w2h >>> 19) | (w2l << 13)) ^ ((w2h << 3) | (w2l >>> 29)) ^ (w2h >>> 6) ) + ((w4l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x72176fba + w4l )|0;
        th = ( 0x6f067aa + w4h + ((tl >>> 0) < (w4l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 69
        w5l = ( w5l + w14l )|0;
        w5h = ( w5h + w14h + ((w5l >>> 0) < (w14l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w6l >>> 1) | (w6h << 31)) ^ ((w6l >>> 8) | (w6h << 24)) ^ ((w6l >>> 7) | (w6h << 25)) )|0;
        w5l = ( w5l + xl)|0;
        w5h = ( w5h + ( ((w6h >>> 1) | (w6l << 31)) ^ ((w6h >>> 8) | (w6l << 24)) ^ (w6h >>> 7) ) + ((w5l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w3l >>> 19) | (w3h << 13)) ^ ((w3l << 3) | (w3h >>> 29)) ^ ((w3l >>> 6) | (w3h << 26)) )|0;
        w5l = ( w5l + xl)|0;
        w5h = ( w5h + ( ((w3h >>> 19) | (w3l << 13)) ^ ((w3h << 3) | (w3l >>> 29)) ^ (w3h >>> 6) ) + ((w5l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0xa2c898a6 + w5l )|0;
        th = ( 0xa637dc5 + w5h + ((tl >>> 0) < (w5l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 70
        w6l = ( w6l + w15l )|0;
        w6h = ( w6h + w15h + ((w6l >>> 0) < (w15l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w7l >>> 1) | (w7h << 31)) ^ ((w7l >>> 8) | (w7h << 24)) ^ ((w7l >>> 7) | (w7h << 25)) )|0;
        w6l = ( w6l + xl)|0;
        w6h = ( w6h + ( ((w7h >>> 1) | (w7l << 31)) ^ ((w7h >>> 8) | (w7l << 24)) ^ (w7h >>> 7) ) + ((w6l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w4l >>> 19) | (w4h << 13)) ^ ((w4l << 3) | (w4h >>> 29)) ^ ((w4l >>> 6) | (w4h << 26)) )|0;
        w6l = ( w6l + xl)|0;
        w6h = ( w6h + ( ((w4h >>> 19) | (w4l << 13)) ^ ((w4h << 3) | (w4l >>> 29)) ^ (w4h >>> 6) ) + ((w6l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0xbef90dae + w6l )|0;
        th = ( 0x113f9804 + w6h + ((tl >>> 0) < (w6l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 71
        w7l = ( w7l + w0l )|0;
        w7h = ( w7h + w0h + ((w7l >>> 0) < (w0l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w8l >>> 1) | (w8h << 31)) ^ ((w8l >>> 8) | (w8h << 24)) ^ ((w8l >>> 7) | (w8h << 25)) )|0;
        w7l = ( w7l + xl)|0;
        w7h = ( w7h + ( ((w8h >>> 1) | (w8l << 31)) ^ ((w8h >>> 8) | (w8l << 24)) ^ (w8h >>> 7) ) + ((w7l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w5l >>> 19) | (w5h << 13)) ^ ((w5l << 3) | (w5h >>> 29)) ^ ((w5l >>> 6) | (w5h << 26)) )|0;
        w7l = ( w7l + xl)|0;
        w7h = ( w7h + ( ((w5h >>> 19) | (w5l << 13)) ^ ((w5h << 3) | (w5l >>> 29)) ^ (w5h >>> 6) ) + ((w7l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x131c471b + w7l )|0;
        th = ( 0x1b710b35 + w7h + ((tl >>> 0) < (w7l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 72
        w8l = ( w8l + w1l )|0;
        w8h = ( w8h + w1h + ((w8l >>> 0) < (w1l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w9l >>> 1) | (w9h << 31)) ^ ((w9l >>> 8) | (w9h << 24)) ^ ((w9l >>> 7) | (w9h << 25)) )|0;
        w8l = ( w8l + xl)|0;
        w8h = ( w8h + ( ((w9h >>> 1) | (w9l << 31)) ^ ((w9h >>> 8) | (w9l << 24)) ^ (w9h >>> 7) ) + ((w8l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w6l >>> 19) | (w6h << 13)) ^ ((w6l << 3) | (w6h >>> 29)) ^ ((w6l >>> 6) | (w6h << 26)) )|0;
        w8l = ( w8l + xl)|0;
        w8h = ( w8h + ( ((w6h >>> 19) | (w6l << 13)) ^ ((w6h << 3) | (w6l >>> 29)) ^ (w6h >>> 6) ) + ((w8l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x23047d84 + w8l )|0;
        th = ( 0x28db77f5 + w8h + ((tl >>> 0) < (w8l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 73
        w9l = ( w9l + w2l )|0;
        w9h = ( w9h + w2h + ((w9l >>> 0) < (w2l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w10l >>> 1) | (w10h << 31)) ^ ((w10l >>> 8) | (w10h << 24)) ^ ((w10l >>> 7) | (w10h << 25)) )|0;
        w9l = ( w9l + xl)|0;
        w9h = ( w9h + ( ((w10h >>> 1) | (w10l << 31)) ^ ((w10h >>> 8) | (w10l << 24)) ^ (w10h >>> 7) ) + ((w9l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w7l >>> 19) | (w7h << 13)) ^ ((w7l << 3) | (w7h >>> 29)) ^ ((w7l >>> 6) | (w7h << 26)) )|0;
        w9l = ( w9l + xl)|0;
        w9h = ( w9h + ( ((w7h >>> 19) | (w7l << 13)) ^ ((w7h << 3) | (w7l >>> 29)) ^ (w7h >>> 6) ) + ((w9l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x40c72493 + w9l )|0;
        th = ( 0x32caab7b + w9h + ((tl >>> 0) < (w9l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 74
        w10l = ( w10l + w3l )|0;
        w10h = ( w10h + w3h + ((w10l >>> 0) < (w3l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w11l >>> 1) | (w11h << 31)) ^ ((w11l >>> 8) | (w11h << 24)) ^ ((w11l >>> 7) | (w11h << 25)) )|0;
        w10l = ( w10l + xl)|0;
        w10h = ( w10h + ( ((w11h >>> 1) | (w11l << 31)) ^ ((w11h >>> 8) | (w11l << 24)) ^ (w11h >>> 7) ) + ((w10l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w8l >>> 19) | (w8h << 13)) ^ ((w8l << 3) | (w8h >>> 29)) ^ ((w8l >>> 6) | (w8h << 26)) )|0;
        w10l = ( w10l + xl)|0;
        w10h = ( w10h + ( ((w8h >>> 19) | (w8l << 13)) ^ ((w8h << 3) | (w8l >>> 29)) ^ (w8h >>> 6) ) + ((w10l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x15c9bebc + w10l )|0;
        th = ( 0x3c9ebe0a + w10h + ((tl >>> 0) < (w10l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 75
        w11l = ( w11l + w4l )|0;
        w11h = ( w11h + w4h + ((w11l >>> 0) < (w4l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w12l >>> 1) | (w12h << 31)) ^ ((w12l >>> 8) | (w12h << 24)) ^ ((w12l >>> 7) | (w12h << 25)) )|0;
        w11l = ( w11l + xl)|0;
        w11h = ( w11h + ( ((w12h >>> 1) | (w12l << 31)) ^ ((w12h >>> 8) | (w12l << 24)) ^ (w12h >>> 7) ) + ((w11l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w9l >>> 19) | (w9h << 13)) ^ ((w9l << 3) | (w9h >>> 29)) ^ ((w9l >>> 6) | (w9h << 26)) )|0;
        w11l = ( w11l + xl)|0;
        w11h = ( w11h + ( ((w9h >>> 19) | (w9l << 13)) ^ ((w9h << 3) | (w9l >>> 29)) ^ (w9h >>> 6) ) + ((w11l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x9c100d4c + w11l )|0;
        th = ( 0x431d67c4 + w11h + ((tl >>> 0) < (w11l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 76
        w12l = ( w12l + w5l )|0;
        w12h = ( w12h + w5h + ((w12l >>> 0) < (w5l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w13l >>> 1) | (w13h << 31)) ^ ((w13l >>> 8) | (w13h << 24)) ^ ((w13l >>> 7) | (w13h << 25)) )|0;
        w12l = ( w12l + xl)|0;
        w12h = ( w12h + ( ((w13h >>> 1) | (w13l << 31)) ^ ((w13h >>> 8) | (w13l << 24)) ^ (w13h >>> 7) ) + ((w12l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w10l >>> 19) | (w10h << 13)) ^ ((w10l << 3) | (w10h >>> 29)) ^ ((w10l >>> 6) | (w10h << 26)) )|0;
        w12l = ( w12l + xl)|0;
        w12h = ( w12h + ( ((w10h >>> 19) | (w10l << 13)) ^ ((w10h << 3) | (w10l >>> 29)) ^ (w10h >>> 6) ) + ((w12l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0xcb3e42b6 + w12l )|0;
        th = ( 0x4cc5d4be + w12h + ((tl >>> 0) < (w12l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 77
        w13l = ( w13l + w6l )|0;
        w13h = ( w13h + w6h + ((w13l >>> 0) < (w6l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w14l >>> 1) | (w14h << 31)) ^ ((w14l >>> 8) | (w14h << 24)) ^ ((w14l >>> 7) | (w14h << 25)) )|0;
        w13l = ( w13l + xl)|0;
        w13h = ( w13h + ( ((w14h >>> 1) | (w14l << 31)) ^ ((w14h >>> 8) | (w14l << 24)) ^ (w14h >>> 7) ) + ((w13l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w11l >>> 19) | (w11h << 13)) ^ ((w11l << 3) | (w11h >>> 29)) ^ ((w11l >>> 6) | (w11h << 26)) )|0;
        w13l = ( w13l + xl)|0;
        w13h = ( w13h + ( ((w11h >>> 19) | (w11l << 13)) ^ ((w11h << 3) | (w11l >>> 29)) ^ (w11h >>> 6) ) + ((w13l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0xfc657e2a + w13l )|0;
        th = ( 0x597f299c + w13h + ((tl >>> 0) < (w13l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 78
        w14l = ( w14l + w7l )|0;
        w14h = ( w14h + w7h + ((w14l >>> 0) < (w7l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w15l >>> 1) | (w15h << 31)) ^ ((w15l >>> 8) | (w15h << 24)) ^ ((w15l >>> 7) | (w15h << 25)) )|0;
        w14l = ( w14l + xl)|0;
        w14h = ( w14h + ( ((w15h >>> 1) | (w15l << 31)) ^ ((w15h >>> 8) | (w15l << 24)) ^ (w15h >>> 7) ) + ((w14l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w12l >>> 19) | (w12h << 13)) ^ ((w12l << 3) | (w12h >>> 29)) ^ ((w12l >>> 6) | (w12h << 26)) )|0;
        w14l = ( w14l + xl)|0;
        w14h = ( w14h + ( ((w12h >>> 19) | (w12l << 13)) ^ ((w12h << 3) | (w12l >>> 29)) ^ (w12h >>> 6) ) + ((w14l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x3ad6faec + w14l )|0;
        th = ( 0x5fcb6fab + w14h + ((tl >>> 0) < (w14l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        // 79
        w15l = ( w15l + w8l )|0;
        w15h = ( w15h + w8h + ((w15l >>> 0) < (w8l >>> 0) ? 1 : 0) )|0;
        xl = ( ((w0l >>> 1) | (w0h << 31)) ^ ((w0l >>> 8) | (w0h << 24)) ^ ((w0l >>> 7) | (w0h << 25)) )|0;
        w15l = ( w15l + xl)|0;
        w15h = ( w15h + ( ((w0h >>> 1) | (w0l << 31)) ^ ((w0h >>> 8) | (w0l << 24)) ^ (w0h >>> 7) ) + ((w15l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ((w13l >>> 19) | (w13h << 13)) ^ ((w13l << 3) | (w13h >>> 29)) ^ ((w13l >>> 6) | (w13h << 26)) )|0;
        w15l = ( w15l + xl)|0;
        w15h = ( w15h + ( ((w13h >>> 19) | (w13l << 13)) ^ ((w13h << 3) | (w13l >>> 29)) ^ (w13h >>> 6) ) + ((w15l >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        tl = ( 0x4a475817 + w15l )|0;
        th = ( 0x6c44198c + w15h + ((tl >>> 0) < (w15l >>> 0) ? 1 : 0) )|0;
        tl = ( tl + hl )|0;
        th = ( th + hh + ((tl >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
        xl = ( ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9)) )|0;
        tl = ( tl + xl )|0;
        th = ( th + (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9))) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        xl = ( ( gl ^ el & (fl^gl) ) )|0;
        tl = ( tl + xl )|0;
        th = ( th + ( gh ^ eh & (fh^gh) ) + ((tl >>> 0) < (xl >>> 0) ? 1 : 0) )|0;
        hl = gl; hh = gh;
        gl = fl; gh = fh;
        fl = el; fh = eh;
        el = ( dl + tl )|0; eh = ( dh + th + ((el >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        dl = cl; dh = ch;
        cl = bl; ch = bh;
        bl = al; bh = ah;
        al = ( tl + ( (bl & cl) ^ ( dl & (bl ^ cl) ) ) )|0;
        ah = ( th + ( (bh & ch) ^ ( dh & (bh ^ ch) ) ) + ((al >>> 0) < (tl >>> 0) ? 1 : 0) )|0;
        xl = ( ((bl >>> 28) | (bh << 4)) ^ ((bl << 30) | (bh >>> 2)) ^ ((bl << 25) | (bh >>> 7)) )|0;
        al = ( al + xl )|0;
        ah = ( ah + (((bh >>> 28) | (bl << 4)) ^ ((bh << 30) | (bl >>> 2)) ^ ((bh << 25) | (bl >>> 7))) + ((al >>> 0) < (xl >>> 0) ? 1 : 0) )|0;

        H0l = ( H0l + al )|0;
        H0h = ( H0h + ah + ((H0l >>> 0) < (al >>> 0) ? 1 : 0) )|0;
        H1l = ( H1l + bl )|0;
        H1h = ( H1h + bh + ((H1l >>> 0) < (bl >>> 0) ? 1 : 0) )|0;
        H2l = ( H2l + cl )|0;
        H2h = ( H2h + ch + ((H2l >>> 0) < (cl >>> 0) ? 1 : 0) )|0;
        H3l = ( H3l + dl )|0;
        H3h = ( H3h + dh + ((H3l >>> 0) < (dl >>> 0) ? 1 : 0) )|0;
        H4l = ( H4l + el )|0;
        H4h = ( H4h + eh + ((H4l >>> 0) < (el >>> 0) ? 1 : 0) )|0;
        H5l = ( H5l + fl )|0;
        H5h = ( H5h + fh + ((H5l >>> 0) < (fl >>> 0) ? 1 : 0) )|0;
        H6l = ( H6l + gl )|0;
        H6h = ( H6h + gh + ((H6l >>> 0) < (gl >>> 0) ? 1 : 0) )|0;
        H7l = ( H7l + hl )|0;
        H7h = ( H7h + hh + ((H7l >>> 0) < (hl >>> 0) ? 1 : 0) )|0;
    }

    function _core_heap ( offset ) {
        offset = offset|0;

        _core(
            HEAP[offset|0]<<24 | HEAP[offset|1]<<16 | HEAP[offset|2]<<8 | HEAP[offset|3],
            HEAP[offset|4]<<24 | HEAP[offset|5]<<16 | HEAP[offset|6]<<8 | HEAP[offset|7],
            HEAP[offset|8]<<24 | HEAP[offset|9]<<16 | HEAP[offset|10]<<8 | HEAP[offset|11],
            HEAP[offset|12]<<24 | HEAP[offset|13]<<16 | HEAP[offset|14]<<8 | HEAP[offset|15],
            HEAP[offset|16]<<24 | HEAP[offset|17]<<16 | HEAP[offset|18]<<8 | HEAP[offset|19],
            HEAP[offset|20]<<24 | HEAP[offset|21]<<16 | HEAP[offset|22]<<8 | HEAP[offset|23],
            HEAP[offset|24]<<24 | HEAP[offset|25]<<16 | HEAP[offset|26]<<8 | HEAP[offset|27],
            HEAP[offset|28]<<24 | HEAP[offset|29]<<16 | HEAP[offset|30]<<8 | HEAP[offset|31],
            HEAP[offset|32]<<24 | HEAP[offset|33]<<16 | HEAP[offset|34]<<8 | HEAP[offset|35],
            HEAP[offset|36]<<24 | HEAP[offset|37]<<16 | HEAP[offset|38]<<8 | HEAP[offset|39],
            HEAP[offset|40]<<24 | HEAP[offset|41]<<16 | HEAP[offset|42]<<8 | HEAP[offset|43],
            HEAP[offset|44]<<24 | HEAP[offset|45]<<16 | HEAP[offset|46]<<8 | HEAP[offset|47],
            HEAP[offset|48]<<24 | HEAP[offset|49]<<16 | HEAP[offset|50]<<8 | HEAP[offset|51],
            HEAP[offset|52]<<24 | HEAP[offset|53]<<16 | HEAP[offset|54]<<8 | HEAP[offset|55],
            HEAP[offset|56]<<24 | HEAP[offset|57]<<16 | HEAP[offset|58]<<8 | HEAP[offset|59],
            HEAP[offset|60]<<24 | HEAP[offset|61]<<16 | HEAP[offset|62]<<8 | HEAP[offset|63],
            HEAP[offset|64]<<24 | HEAP[offset|65]<<16 | HEAP[offset|66]<<8 | HEAP[offset|67],
            HEAP[offset|68]<<24 | HEAP[offset|69]<<16 | HEAP[offset|70]<<8 | HEAP[offset|71],
            HEAP[offset|72]<<24 | HEAP[offset|73]<<16 | HEAP[offset|74]<<8 | HEAP[offset|75],
            HEAP[offset|76]<<24 | HEAP[offset|77]<<16 | HEAP[offset|78]<<8 | HEAP[offset|79],
            HEAP[offset|80]<<24 | HEAP[offset|81]<<16 | HEAP[offset|82]<<8 | HEAP[offset|83],
            HEAP[offset|84]<<24 | HEAP[offset|85]<<16 | HEAP[offset|86]<<8 | HEAP[offset|87],
            HEAP[offset|88]<<24 | HEAP[offset|89]<<16 | HEAP[offset|90]<<8 | HEAP[offset|91],
            HEAP[offset|92]<<24 | HEAP[offset|93]<<16 | HEAP[offset|94]<<8 | HEAP[offset|95],
            HEAP[offset|96]<<24 | HEAP[offset|97]<<16 | HEAP[offset|98]<<8 | HEAP[offset|99],
            HEAP[offset|100]<<24 | HEAP[offset|101]<<16 | HEAP[offset|102]<<8 | HEAP[offset|103],
            HEAP[offset|104]<<24 | HEAP[offset|105]<<16 | HEAP[offset|106]<<8 | HEAP[offset|107],
            HEAP[offset|108]<<24 | HEAP[offset|109]<<16 | HEAP[offset|110]<<8 | HEAP[offset|111],
            HEAP[offset|112]<<24 | HEAP[offset|113]<<16 | HEAP[offset|114]<<8 | HEAP[offset|115],
            HEAP[offset|116]<<24 | HEAP[offset|117]<<16 | HEAP[offset|118]<<8 | HEAP[offset|119],
            HEAP[offset|120]<<24 | HEAP[offset|121]<<16 | HEAP[offset|122]<<8 | HEAP[offset|123],
            HEAP[offset|124]<<24 | HEAP[offset|125]<<16 | HEAP[offset|126]<<8 | HEAP[offset|127]
        );
    }

    // offset - multiple of 32
    function _state_to_heap ( output ) {
        output = output|0;

        HEAP[output|0] = H0h>>>24;
        HEAP[output|1] = H0h>>>16&255;
        HEAP[output|2] = H0h>>>8&255;
        HEAP[output|3] = H0h&255;
        HEAP[output|4] = H0l>>>24;
        HEAP[output|5] = H0l>>>16&255;
        HEAP[output|6] = H0l>>>8&255;
        HEAP[output|7] = H0l&255;
        HEAP[output|8] = H1h>>>24;
        HEAP[output|9] = H1h>>>16&255;
        HEAP[output|10] = H1h>>>8&255;
        HEAP[output|11] = H1h&255;
        HEAP[output|12] = H1l>>>24;
        HEAP[output|13] = H1l>>>16&255;
        HEAP[output|14] = H1l>>>8&255;
        HEAP[output|15] = H1l&255;
        HEAP[output|16] = H2h>>>24;
        HEAP[output|17] = H2h>>>16&255;
        HEAP[output|18] = H2h>>>8&255;
        HEAP[output|19] = H2h&255;
        HEAP[output|20] = H2l>>>24;
        HEAP[output|21] = H2l>>>16&255;
        HEAP[output|22] = H2l>>>8&255;
        HEAP[output|23] = H2l&255;
        HEAP[output|24] = H3h>>>24;
        HEAP[output|25] = H3h>>>16&255;
        HEAP[output|26] = H3h>>>8&255;
        HEAP[output|27] = H3h&255;
        HEAP[output|28] = H3l>>>24;
        HEAP[output|29] = H3l>>>16&255;
        HEAP[output|30] = H3l>>>8&255;
        HEAP[output|31] = H3l&255;
        HEAP[output|32] = H4h>>>24;
        HEAP[output|33] = H4h>>>16&255;
        HEAP[output|34] = H4h>>>8&255;
        HEAP[output|35] = H4h&255;
        HEAP[output|36] = H4l>>>24;
        HEAP[output|37] = H4l>>>16&255;
        HEAP[output|38] = H4l>>>8&255;
        HEAP[output|39] = H4l&255;
        HEAP[output|40] = H5h>>>24;
        HEAP[output|41] = H5h>>>16&255;
        HEAP[output|42] = H5h>>>8&255;
        HEAP[output|43] = H5h&255;
        HEAP[output|44] = H5l>>>24;
        HEAP[output|45] = H5l>>>16&255;
        HEAP[output|46] = H5l>>>8&255;
        HEAP[output|47] = H5l&255;
        HEAP[output|48] = H6h>>>24;
        HEAP[output|49] = H6h>>>16&255;
        HEAP[output|50] = H6h>>>8&255;
        HEAP[output|51] = H6h&255;
        HEAP[output|52] = H6l>>>24;
        HEAP[output|53] = H6l>>>16&255;
        HEAP[output|54] = H6l>>>8&255;
        HEAP[output|55] = H6l&255;
        HEAP[output|56] = H7h>>>24;
        HEAP[output|57] = H7h>>>16&255;
        HEAP[output|58] = H7h>>>8&255;
        HEAP[output|59] = H7h&255;
        HEAP[output|60] = H7l>>>24;
        HEAP[output|61] = H7l>>>16&255;
        HEAP[output|62] = H7l>>>8&255;
        HEAP[output|63] = H7l&255;
    }

    function reset () {
        H0h = 0x6a09e667;
        H0l = 0xf3bcc908;
        H1h = 0xbb67ae85;
        H1l = 0x84caa73b;
        H2h = 0x3c6ef372;
        H2l = 0xfe94f82b;
        H3h = 0xa54ff53a;
        H3l = 0x5f1d36f1;
        H4h = 0x510e527f;
        H4l = 0xade682d1;
        H5h = 0x9b05688c;
        H5l = 0x2b3e6c1f;
        H6h = 0x1f83d9ab;
        H6l = 0xfb41bd6b;
        H7h = 0x5be0cd19;
        H7l = 0x137e2179;

        TOTAL0 = TOTAL1 = 0;
    }

    function init ( h0h, h0l, h1h, h1l, h2h, h2l, h3h, h3l, h4h, h4l, h5h, h5l, h6h, h6l, h7h, h7l, total0, total1 ) {
        h0h = h0h|0;
        h0l = h0l|0;
        h1h = h1h|0;
        h1l = h1l|0;
        h2h = h2h|0;
        h2l = h2l|0;
        h3h = h3h|0;
        h3l = h3l|0;
        h4h = h4h|0;
        h4l = h4l|0;
        h5h = h5h|0;
        h5l = h5l|0;
        h6h = h6h|0;
        h6l = h6l|0;
        h7h = h7h|0;
        h7l = h7l|0;
        total0 = total0|0;
        total1 = total1|0;

        H0h = h0h;
        H0l = h0l;
        H1h = h1h;
        H1l = h1l;
        H2h = h2h;
        H2l = h2l;
        H3h = h3h;
        H3l = h3l;
        H4h = h4h;
        H4l = h4l;
        H5h = h5h;
        H5l = h5l;
        H6h = h6h;
        H6l = h6l;
        H7h = h7h;
        H7l = h7l;
        TOTAL0 = total0;
        TOTAL1 = total1;
    }

    // offset - multiple of 128
    function process ( offset, length ) {
        offset = offset|0;
        length = length|0;

        var hashed = 0;

        if ( offset & 127 )
            return -1;

        while ( (length|0) >= 128 ) {
            _core_heap(offset);

            offset = ( offset + 128 )|0;
            length = ( length - 128 )|0;

            hashed = ( hashed + 128 )|0;
        }

        TOTAL0 = ( TOTAL0 + hashed )|0;
        if ( TOTAL0>>>0 < hashed>>>0 ) TOTAL1 = ( TOTAL1 + 1 )|0;

        return hashed|0;
    }

    // offset - multiple of 128
    // output - multiple of 64
    function finish ( offset, length, output ) {
        offset = offset|0;
        length = length|0;
        output = output|0;

        var hashed = 0,
            i = 0;

        if ( offset & 127 )
            return -1;

        if ( ~output )
            if ( output & 63 )
                return -1;

        if ( (length|0) >= 128 ) {
            hashed = process( offset, length )|0;
            if ( (hashed|0) == -1 )
                return -1;

            offset = ( offset + hashed )|0;
            length = ( length - hashed )|0;
        }

        hashed = ( hashed + length )|0;
        TOTAL0 = ( TOTAL0 + length )|0;
        if ( TOTAL0>>>0 < length>>>0 ) TOTAL1 = ( TOTAL1 + 1 )|0;

        HEAP[offset|length] = 0x80;

        if ( (length|0) >= 112 ) {
            for ( i = (length+1)|0; (i|0) < 128; i = (i+1)|0 )
                HEAP[offset|i] = 0x00;

            _core_heap(offset);

            length = 0;

            HEAP[offset|0] = 0;
        }

        for ( i = (length+1)|0; (i|0) < 123; i = (i+1)|0 )
            HEAP[offset|i] = 0;

        HEAP[offset|120] = TOTAL1>>>21&255;
        HEAP[offset|121] = TOTAL1>>>13&255;
        HEAP[offset|122] = TOTAL1>>>5&255;
        HEAP[offset|123] = TOTAL1<<3&255 | TOTAL0>>>29;
        HEAP[offset|124] = TOTAL0>>>21&255;
        HEAP[offset|125] = TOTAL0>>>13&255;
        HEAP[offset|126] = TOTAL0>>>5&255;
        HEAP[offset|127] = TOTAL0<<3&255;
        _core_heap(offset);

        if ( ~output )
            _state_to_heap(output);

        return hashed|0;
    }

    function hmac_reset () {
        H0h = I0h;
        H0l = I0l;
        H1h = I1h;
        H1l = I1l;
        H2h = I2h;
        H2l = I2l;
        H3h = I3h;
        H3l = I3l;
        H4h = I4h;
        H4l = I4l;
        H5h = I5h;
        H5l = I5l;
        H6h = I6h;
        H6l = I6l;
        H7h = I7h;
        H7l = I7l;
        TOTAL0 = 128;
        TOTAL1 = 0;
    }

    function _hmac_opad () {
        H0h = O0h;
        H0l = O0l;
        H1h = O1h;
        H1l = O1l;
        H2h = O2h;
        H2l = O2l;
        H3h = O3h;
        H3l = O3l;
        H4h = O4h;
        H4l = O4l;
        H5h = O5h;
        H5l = O5l;
        H6h = O6h;
        H6l = O6l;
        H7h = O7h;
        H7l = O7l;
        TOTAL0 = 128;
        TOTAL1 = 0;
    }

    function hmac_init ( p0h, p0l, p1h, p1l, p2h, p2l, p3h, p3l, p4h, p4l, p5h, p5l, p6h, p6l, p7h, p7l, p8h, p8l, p9h, p9l, p10h, p10l, p11h, p11l, p12h, p12l, p13h, p13l, p14h, p14l, p15h, p15l ) {
        p0h = p0h|0;
        p0l = p0l|0;
        p1h = p1h|0;
        p1l = p1l|0;
        p2h = p2h|0;
        p2l = p2l|0;
        p3h = p3h|0;
        p3l = p3l|0;
        p4h = p4h|0;
        p4l = p4l|0;
        p5h = p5h|0;
        p5l = p5l|0;
        p6h = p6h|0;
        p6l = p6l|0;
        p7h = p7h|0;
        p7l = p7l|0;
        p8h = p8h|0;
        p8l = p8l|0;
        p9h = p9h|0;
        p9l = p9l|0;
        p10h = p10h|0;
        p10l = p10l|0;
        p11h = p11h|0;
        p11l = p11l|0;
        p12h = p12h|0;
        p12l = p12l|0;
        p13h = p13h|0;
        p13l = p13l|0;
        p14h = p14h|0;
        p14l = p14l|0;
        p15h = p15h|0;
        p15l = p15l|0;

        // opad
        reset();
        _core(
            p0h ^ 0x5c5c5c5c,
            p0l ^ 0x5c5c5c5c,
            p1h ^ 0x5c5c5c5c,
            p1l ^ 0x5c5c5c5c,
            p2h ^ 0x5c5c5c5c,
            p2l ^ 0x5c5c5c5c,
            p3h ^ 0x5c5c5c5c,
            p3l ^ 0x5c5c5c5c,
            p4h ^ 0x5c5c5c5c,
            p4l ^ 0x5c5c5c5c,
            p5h ^ 0x5c5c5c5c,
            p5l ^ 0x5c5c5c5c,
            p6h ^ 0x5c5c5c5c,
            p6l ^ 0x5c5c5c5c,
            p7h ^ 0x5c5c5c5c,
            p7l ^ 0x5c5c5c5c,
            p8h ^ 0x5c5c5c5c,
            p8l ^ 0x5c5c5c5c,
            p9h ^ 0x5c5c5c5c,
            p9l ^ 0x5c5c5c5c,
            p10h ^ 0x5c5c5c5c,
            p10l ^ 0x5c5c5c5c,
            p11h ^ 0x5c5c5c5c,
            p11l ^ 0x5c5c5c5c,
            p12h ^ 0x5c5c5c5c,
            p12l ^ 0x5c5c5c5c,
            p13h ^ 0x5c5c5c5c,
            p13l ^ 0x5c5c5c5c,
            p14h ^ 0x5c5c5c5c,
            p14l ^ 0x5c5c5c5c,
            p15h ^ 0x5c5c5c5c,
            p15l ^ 0x5c5c5c5c
        );
        O0h = H0h;
        O0l = H0l;
        O1h = H1h;
        O1l = H1l;
        O2h = H2h;
        O2l = H2l;
        O3h = H3h;
        O3l = H3l;
        O4h = H4h;
        O4l = H4l;
        O5h = H5h;
        O5l = H5l;
        O6h = H6h;
        O6l = H6l;
        O7h = H7h;
        O7l = H7l;

        // ipad
        reset();
        _core(
           p0h ^ 0x36363636,
           p0l ^ 0x36363636,
           p1h ^ 0x36363636,
           p1l ^ 0x36363636,
           p2h ^ 0x36363636,
           p2l ^ 0x36363636,
           p3h ^ 0x36363636,
           p3l ^ 0x36363636,
           p4h ^ 0x36363636,
           p4l ^ 0x36363636,
           p5h ^ 0x36363636,
           p5l ^ 0x36363636,
           p6h ^ 0x36363636,
           p6l ^ 0x36363636,
           p7h ^ 0x36363636,
           p7l ^ 0x36363636,
           p8h ^ 0x36363636,
           p8l ^ 0x36363636,
           p9h ^ 0x36363636,
           p9l ^ 0x36363636,
           p10h ^ 0x36363636,
           p10l ^ 0x36363636,
           p11h ^ 0x36363636,
           p11l ^ 0x36363636,
           p12h ^ 0x36363636,
           p12l ^ 0x36363636,
           p13h ^ 0x36363636,
           p13l ^ 0x36363636,
           p14h ^ 0x36363636,
           p14l ^ 0x36363636,
           p15h ^ 0x36363636,
           p15l ^ 0x36363636
        );
        I0h = H0h;
        I0l = H0l;
        I1h = H1h;
        I1l = H1l;
        I2h = H2h;
        I2l = H2l;
        I3h = H3h;
        I3l = H3l;
        I4h = H4h;
        I4l = H4l;
        I5h = H5h;
        I5l = H5l;
        I6h = H6h;
        I6l = H6l;
        I7h = H7h;
        I7l = H7l;

        TOTAL0 = 128;
        TOTAL1 = 0;
    }

    // offset - multiple of 128
    // output - multiple of 64
    function hmac_finish ( offset, length, output ) {
        offset = offset|0;
        length = length|0;
        output = output|0;

        var t0h = 0, t0l = 0, t1h = 0, t1l = 0, t2h = 0, t2l = 0, t3h = 0, t3l = 0,
            t4h = 0, t4l = 0, t5h = 0, t5l = 0, t6h = 0, t6l = 0, t7h = 0, t7l = 0,
            hashed = 0;

        if ( offset & 127 )
            return -1;

        if ( ~output )
            if ( output & 63 )
                return -1;

        hashed = finish( offset, length, -1 )|0;
        t0h = H0h;
        t0l = H0l;
        t1h = H1h;
        t1l = H1l;
        t2h = H2h;
        t2l = H2l;
        t3h = H3h;
        t3l = H3l;
        t4h = H4h;
        t4l = H4l;
        t5h = H5h;
        t5l = H5l;
        t6h = H6h;
        t6l = H6l;
        t7h = H7h;
        t7l = H7l;

        _hmac_opad();
        _core( t0h, t0l, t1h, t1l, t2h, t2l, t3h, t3l, t4h, t4l, t5h, t5l, t6h, t6l, t7h, t7l, 0x80000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1536 );

        if ( ~output )
            _state_to_heap(output);

        return hashed|0;
    }

    // salt is assumed to be already processed
    // offset - multiple of 128
    // output - multiple of 64
    function pbkdf2_generate_block ( offset, length, block, count, output ) {
        offset = offset|0;
        length = length|0;
        block = block|0;
        count = count|0;
        output = output|0;

        var h0h = 0, h0l = 0, h1h = 0, h1l = 0, h2h = 0, h2l = 0, h3h = 0, h3l = 0,
            h4h = 0, h4l = 0, h5h = 0, h5l = 0, h6h = 0, h6l = 0, h7h = 0, h7l = 0,
            t0h = 0, t0l = 0, t1h = 0, t1l = 0, t2h = 0, t2l = 0, t3h = 0, t3l = 0,
            t4h = 0, t4l = 0, t5h = 0, t5l = 0, t6h = 0, t6l = 0, t7h = 0, t7l = 0;

        if ( offset & 127 )
            return -1;

        if ( ~output )
            if ( output & 63 )
                return -1;

        // pad block number into heap
        // FIXME probable OOB write
        HEAP[(offset+length)|0]   = block>>>24;
        HEAP[(offset+length+1)|0] = block>>>16&255;
        HEAP[(offset+length+2)|0] = block>>>8&255;
        HEAP[(offset+length+3)|0] = block&255;

        // finish first iteration
        hmac_finish( offset, (length+4)|0, -1 )|0;

        h0h = t0h = H0h;
        h0l = t0l = H0l;
        h1h = t1h = H1h;
        h1l = t1l = H1l;
        h2h = t2h = H2h;
        h2l = t2l = H2l;
        h3h = t3h = H3h;
        h3l = t3l = H3l;
        h4h = t4h = H4h;
        h4l = t4l = H4l;
        h5h = t5h = H5h;
        h5l = t5l = H5l;
        h6h = t6h = H6h;
        h6l = t6l = H6l;
        h7h = t7h = H7h;
        h7l = t7l = H7l;

        count = (count-1)|0;

        // perform the rest iterations
        while ( (count|0) > 0 ) {
            hmac_reset();
            _core( t0h, t0l, t1h, t1l, t2h, t2l, t3h, t3l, t4h, t4l, t5h, t5l, t6h, t6l, t7h, t7l, 0x80000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1536 );

            t0h = H0h;
            t0l = H0l;
            t1h = H1h;
            t1l = H1l;
            t2h = H2h;
            t2l = H2l;
            t3h = H3h;
            t3l = H3l;
            t4h = H4h;
            t4l = H4l;
            t5h = H5h;
            t5l = H5l;
            t6h = H6h;
            t6l = H6l;
            t7h = H7h;
            t7l = H7l;

            _hmac_opad();
            _core( t0h, t0l, t1h, t1l, t2h, t2l, t3h, t3l, t4h, t4l, t5h, t5l, t6h, t6l, t7h, t7l, 0x80000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1536 );

            t0h = H0h;
            t0l = H0l;
            t1h = H1h;
            t1l = H1l;
            t2h = H2h;
            t2l = H2l;
            t3h = H3h;
            t3l = H3l;
            t4h = H4h;
            t4l = H4l;
            t5h = H5h;
            t5l = H5l;
            t6h = H6h;
            t6l = H6l;
            t7h = H7h;
            t7l = H7l;

            h0h = h0h ^ H0h;
            h0l = h0l ^ H0l;
            h1h = h1h ^ H1h;
            h1l = h1l ^ H1l;
            h2h = h2h ^ H2h;
            h2l = h2l ^ H2l;
            h3h = h3h ^ H3h;
            h3l = h3l ^ H3l;
            h4h = h4h ^ H4h;
            h4l = h4l ^ H4l;
            h5h = h5h ^ H5h;
            h5l = h5l ^ H5l;
            h6h = h6h ^ H6h;
            h6l = h6l ^ H6l;
            h7h = h7h ^ H7h;
            h7l = h7l ^ H7l;

            count = (count-1)|0;
        }

        H0h = h0h;
        H0l = h0l;
        H1h = h1h;
        H1l = h1l;
        H2h = h2h;
        H2l = h2l;
        H3h = h3h;
        H3l = h3l;
        H4h = h4h;
        H4l = h4l;
        H5h = h5h;
        H5l = h5l;
        H6h = h6h;
        H6l = h6l;
        H7h = h7h;
        H7l = h7l;

        if ( ~output )
            _state_to_heap(output);

        return 0;
    }

    return {
        // SHA512
        reset: reset,
        init: init,
        process: process,
        finish: finish,

        // HMAC-SHA512
        hmac_reset: hmac_reset,
        hmac_init: hmac_init,
        hmac_finish: hmac_finish,

        // PBKDF2-HMAC-SHA512
        pbkdf2_generate_block: pbkdf2_generate_block
    }
}

var _sha512_block_size = 128,
    _sha512_hash_size = 64;

function sha512_constructor ( options ) {
    options = options || {};

    this.heap = _heap_init( Uint8Array, options );
    this.asm = options.asm || sha512_asm( global, null, this.heap.buffer );

    this.BLOCK_SIZE = _sha512_block_size;
    this.HASH_SIZE = _sha512_hash_size;

    this.reset();
}

sha512_constructor.BLOCK_SIZE = _sha512_block_size;
sha512_constructor.HASH_SIZE = _sha512_hash_size;
var sha512_prototype = sha512_constructor.prototype;
sha512_prototype.reset =   hash_reset;
sha512_prototype.process = hash_process;
sha512_prototype.finish =  hash_finish;

var sha512_instance = null;

function get_sha512_instance () {
    if ( sha512_instance === null ) sha512_instance = new sha512_constructor( { heapSize: 0x100000 } );
    return sha512_instance;
}

/**
 * SHA512 exports
 */

function sha512_bytes ( data ) {
    if ( data === undefined ) throw new SyntaxError("data required");
    return get_sha512_instance().reset().process(data).finish().result;
}

function sha512_hex ( data ) {
    var result = sha512_bytes(data);
    return bytes_to_hex(result);
}

function sha512_base64 ( data ) {
    var result = sha512_bytes(data);
    return bytes_to_base64(result);
}

sha512_constructor.bytes = sha512_bytes;
sha512_constructor.hex = sha512_hex;
sha512_constructor.base64 = sha512_base64;

exports.SHA512 = sha512_constructor;

function hmac_constructor ( options ) {
    options = options || {};

    if ( !options.hash )
        throw new SyntaxError("option 'hash' is required");

    if ( !options.hash.HASH_SIZE )
        throw new SyntaxError("option 'hash' supplied doesn't seem to be a valid hash function");

    this.hash = options.hash;
    this.BLOCK_SIZE = this.hash.BLOCK_SIZE;
    this.HMAC_SIZE = this.hash.HASH_SIZE;

    this.key = null;
    this.verify = null;
    this.result = null;

    if ( options.password !== undefined || options.verify !== undefined )
        this.reset(options);

    return this;
}

function _hmac_key ( hash, password ) {
    if ( is_buffer(password) )
        password = new Uint8Array(password);

    if ( is_string(password) )
        password = string_to_bytes(password);

    if ( !is_bytes(password) )
        throw new TypeError("password isn't of expected type");

    var key = new Uint8Array( hash.BLOCK_SIZE );

    if ( password.length > hash.BLOCK_SIZE ) {
        key.set( hash.reset().process(password).finish().result );
    }
    else {
        key.set(password);
    }

    return key;
}

function _hmac_init_verify ( verify ) {
    if ( is_buffer(verify) || is_bytes(verify) ) {
        verify = new Uint8Array(verify);
    }
    else if ( is_string(verify) ) {
        verify = string_to_bytes(verify);
    }
    else {
        throw new TypeError("verify tag isn't of expected type");
    }

    if ( verify.length !== this.HMAC_SIZE )
        throw new IllegalArgumentError("illegal verification tag size");

    this.verify = verify;
}

function hmac_reset ( options ) {
    options = options || {};
    var password = options.password;

    if ( this.key === null && !is_string(password) && !password )
        throw new IllegalStateError("no key is associated with the instance");

    this.result = null;
    this.hash.reset();

    if ( password || is_string(password) )
        this.key = _hmac_key( this.hash, password );

    var ipad = new Uint8Array(this.key);
    for ( var i = 0; i < ipad.length; ++i )
        ipad[i] ^= 0x36;

    this.hash.process(ipad);

    var verify = options.verify;
    if ( verify !== undefined ) {
        _hmac_init_verify.call( this, verify );
    }
    else {
        this.verify = null;
    }

    return this;
}

function hmac_process ( data ) {
    if ( this.key === null )
        throw new IllegalStateError("no key is associated with the instance");

    if ( this.result !== null )
        throw new IllegalStateError("state must be reset before processing new data");

    this.hash.process(data);

    return this;
}

function hmac_finish () {
    if ( this.key === null )
        throw new IllegalStateError("no key is associated with the instance");

    if ( this.result !== null )
        throw new IllegalStateError("state must be reset before processing new data");

    var inner_result = this.hash.finish().result;

    var opad = new Uint8Array(this.key);
    for ( var i = 0; i < opad.length; ++i )
        opad[i] ^= 0x5c;

    var verify = this.verify;
    var result = this.hash.reset().process(opad).process(inner_result).finish().result;

    if ( verify ) {
        if ( verify.length === result.length ) {
            var diff = 0;
            for ( var i = 0; i < verify.length; i++ ) {
                diff |= ( verify[i] ^ result[i] );
            }
            this.result = !diff;
        } else {
            this.result = false;
        }
    }
    else {
        this.result = result;
    }

    return this;
}

var hmac_prototype = hmac_constructor.prototype;
hmac_prototype.reset =   hmac_reset;
hmac_prototype.process = hmac_process;
hmac_prototype.finish =  hmac_finish;

function hmac_sha256_constructor ( options ) {
    options = options || {};

    if ( !( options.hash instanceof sha256_constructor ) )
        options.hash = get_sha256_instance();

    hmac_constructor.call( this, options );

    return this;
}

function hmac_sha256_reset ( options ) {
    options = options || {};

    this.result = null;
    this.hash.reset();

    var password = options.password;
    if ( password !== undefined ) {
        if ( is_string(password) )
            password = string_to_bytes(password);

        var key = this.key = _hmac_key( this.hash, password );
        this.hash.reset().asm.hmac_init(
            (key[0]<<24)|(key[1]<<16)|(key[2]<<8)|(key[3]),
            (key[4]<<24)|(key[5]<<16)|(key[6]<<8)|(key[7]),
            (key[8]<<24)|(key[9]<<16)|(key[10]<<8)|(key[11]),
            (key[12]<<24)|(key[13]<<16)|(key[14]<<8)|(key[15]),
            (key[16]<<24)|(key[17]<<16)|(key[18]<<8)|(key[19]),
            (key[20]<<24)|(key[21]<<16)|(key[22]<<8)|(key[23]),
            (key[24]<<24)|(key[25]<<16)|(key[26]<<8)|(key[27]),
            (key[28]<<24)|(key[29]<<16)|(key[30]<<8)|(key[31]),
            (key[32]<<24)|(key[33]<<16)|(key[34]<<8)|(key[35]),
            (key[36]<<24)|(key[37]<<16)|(key[38]<<8)|(key[39]),
            (key[40]<<24)|(key[41]<<16)|(key[42]<<8)|(key[43]),
            (key[44]<<24)|(key[45]<<16)|(key[46]<<8)|(key[47]),
            (key[48]<<24)|(key[49]<<16)|(key[50]<<8)|(key[51]),
            (key[52]<<24)|(key[53]<<16)|(key[54]<<8)|(key[55]),
            (key[56]<<24)|(key[57]<<16)|(key[58]<<8)|(key[59]),
            (key[60]<<24)|(key[61]<<16)|(key[62]<<8)|(key[63])
        );
    }
    else {
        this.hash.asm.hmac_reset();
    }

    var verify = options.verify;
    if ( verify !== undefined ) {
        _hmac_init_verify.call( this, verify );
    }
    else {
        this.verify = null;
    }

    return this;
}

function hmac_sha256_finish () {
    if ( this.key === null )
        throw new IllegalStateError("no key is associated with the instance");

    if ( this.result !== null )
        throw new IllegalStateError("state must be reset before processing new data");

    var hash = this.hash,
        asm = this.hash.asm,
        heap = this.hash.heap;

    asm.hmac_finish( hash.pos, hash.len, 0 );

    var verify = this.verify;
    var result = new Uint8Array(_sha256_hash_size);
    result.set( heap.subarray( 0, _sha256_hash_size ) );

    if ( verify ) {
        if ( verify.length === result.length ) {
            var diff = 0;
            for ( var i = 0; i < verify.length; i++ ) {
                diff |= ( verify[i] ^ result[i] );
            }
            this.result = !diff;
        } else {
            this.result = false;
        }
    }
    else {
        this.result = result;
    }

    return this;
}

hmac_sha256_constructor.BLOCK_SIZE = sha256_constructor.BLOCK_SIZE;
hmac_sha256_constructor.HMAC_SIZE = sha256_constructor.HASH_SIZE;

var hmac_sha256_prototype = hmac_sha256_constructor.prototype;
hmac_sha256_prototype.reset = hmac_sha256_reset;
hmac_sha256_prototype.process = hmac_process;
hmac_sha256_prototype.finish = hmac_sha256_finish;

var hmac_sha256_instance = null;

function get_hmac_sha256_instance () {
    if ( hmac_sha256_instance === null ) hmac_sha256_instance = new hmac_sha256_constructor();
    return hmac_sha256_instance;
}

function hmac_sha512_constructor ( options ) {
    options = options || {};

    if ( !( options.hash instanceof sha512_constructor ) )
        options.hash = get_sha512_instance();

    hmac_constructor.call( this, options );

    return this;
}

function hmac_sha512_reset ( options ) {
    options = options || {};

    this.result = null;
    this.hash.reset();

    var password = options.password;
    if ( password !== undefined ) {
        if ( is_string(password) )
            password = string_to_bytes(password);

        var key = this.key = _hmac_key( this.hash, password );
        this.hash.reset().asm.hmac_init(
                (key[0]<<24)|(key[1]<<16)|(key[2]<<8)|(key[3]),
                (key[4]<<24)|(key[5]<<16)|(key[6]<<8)|(key[7]),
                (key[8]<<24)|(key[9]<<16)|(key[10]<<8)|(key[11]),
                (key[12]<<24)|(key[13]<<16)|(key[14]<<8)|(key[15]),
                (key[16]<<24)|(key[17]<<16)|(key[18]<<8)|(key[19]),
                (key[20]<<24)|(key[21]<<16)|(key[22]<<8)|(key[23]),
                (key[24]<<24)|(key[25]<<16)|(key[26]<<8)|(key[27]),
                (key[28]<<24)|(key[29]<<16)|(key[30]<<8)|(key[31]),
                (key[32]<<24)|(key[33]<<16)|(key[34]<<8)|(key[35]),
                (key[36]<<24)|(key[37]<<16)|(key[38]<<8)|(key[39]),
                (key[40]<<24)|(key[41]<<16)|(key[42]<<8)|(key[43]),
                (key[44]<<24)|(key[45]<<16)|(key[46]<<8)|(key[47]),
                (key[48]<<24)|(key[49]<<16)|(key[50]<<8)|(key[51]),
                (key[52]<<24)|(key[53]<<16)|(key[54]<<8)|(key[55]),
                (key[56]<<24)|(key[57]<<16)|(key[58]<<8)|(key[59]),
                (key[60]<<24)|(key[61]<<16)|(key[62]<<8)|(key[63]),
                (key[64]<<24)|(key[65]<<16)|(key[66]<<8)|(key[67]),
                (key[68]<<24)|(key[69]<<16)|(key[70]<<8)|(key[71]),
                (key[72]<<24)|(key[73]<<16)|(key[74]<<8)|(key[75]),
                (key[76]<<24)|(key[77]<<16)|(key[78]<<8)|(key[79]),
                (key[80]<<24)|(key[81]<<16)|(key[82]<<8)|(key[83]),
                (key[84]<<24)|(key[85]<<16)|(key[86]<<8)|(key[87]),
                (key[88]<<24)|(key[89]<<16)|(key[90]<<8)|(key[91]),
                (key[92]<<24)|(key[93]<<16)|(key[94]<<8)|(key[95]),
                (key[96]<<24)|(key[97]<<16)|(key[98]<<8)|(key[99]),
                (key[100]<<24)|(key[101]<<16)|(key[102]<<8)|(key[103]),
                (key[104]<<24)|(key[105]<<16)|(key[106]<<8)|(key[107]),
                (key[108]<<24)|(key[109]<<16)|(key[110]<<8)|(key[111]),
                (key[112]<<24)|(key[113]<<16)|(key[114]<<8)|(key[115]),
                (key[116]<<24)|(key[117]<<16)|(key[118]<<8)|(key[119]),
                (key[120]<<24)|(key[121]<<16)|(key[122]<<8)|(key[123]),
                (key[124]<<24)|(key[125]<<16)|(key[126]<<8)|(key[127])
        );
    }
    else {
        this.hash.asm.hmac_reset();
    }

    var verify = options.verify;
    if ( verify !== undefined ) {
        _hmac_init_verify.call( this, verify );
    }
    else {
        this.verify = null;
    }

    return this;
}

function hmac_sha512_finish () {
    if ( this.key === null )
        throw new IllegalStateError("no key is associated with the instance");

    if ( this.result !== null )
        throw new IllegalStateError("state must be reset before processing new data");

    var hash = this.hash,
        asm = this.hash.asm,
        heap = this.hash.heap;

    asm.hmac_finish( hash.pos, hash.len, 0 );

    var verify = this.verify;
    var result = new Uint8Array(_sha512_hash_size);
    result.set( heap.subarray( 0, _sha512_hash_size ) );

    if ( verify ) {
        if ( verify.length === result.length ) {
            var diff = 0;
            for ( var i = 0; i < verify.length; i++ ) {
                diff |= ( verify[i] ^ result[i] );
            }
            this.result = !diff;
        } else {
            this.result = false;
        }
    }
    else {
        this.result = result;
    }

    return this;
}

hmac_sha512_constructor.BLOCK_SIZE = sha512_constructor.BLOCK_SIZE;
hmac_sha512_constructor.HMAC_SIZE = sha512_constructor.HASH_SIZE;

var hmac_sha512_prototype = hmac_sha512_constructor.prototype;
hmac_sha512_prototype.reset = hmac_sha512_reset;
hmac_sha512_prototype.process = hmac_process;
hmac_sha512_prototype.finish = hmac_sha512_finish;

var hmac_sha512_instance = null;

function get_hmac_sha512_instance () {
    if ( hmac_sha512_instance === null ) hmac_sha512_instance = new hmac_sha512_constructor();
    return hmac_sha512_instance;
}

/**
 * HMAC-SHA256 exports
 */

function hmac_sha256_bytes ( data, password ) {
    if ( data === undefined ) throw new SyntaxError("data required");
    if ( password === undefined ) throw new SyntaxError("password required");
    return get_hmac_sha256_instance().reset( { password: password } ).process(data).finish().result;
}

function hmac_sha256_hex ( data, password ) {
    var result = hmac_sha256_bytes( data, password );
    return bytes_to_hex(result);
}

function hmac_sha256_base64 ( data, password ) {
    var result = hmac_sha256_bytes( data, password );
    return bytes_to_base64(result);
}

hmac_sha256_constructor.bytes = hmac_sha256_bytes;
hmac_sha256_constructor.hex = hmac_sha256_hex;
hmac_sha256_constructor.base64 = hmac_sha256_base64;

exports.HMAC_SHA256 = hmac_sha256_constructor;

/**
 * HMAC-SHA512 exports
 */

function hmac_sha512_bytes ( data, password ) {
    if ( data === undefined ) throw new SyntaxError("data required");
    if ( password === undefined ) throw new SyntaxError("password required");
    return get_hmac_sha512_instance().reset( { password: password } ).process(data).finish().result;
}

function hmac_sha512_hex ( data, password ) {
    var result = hmac_sha512_bytes( data, password );
    return bytes_to_hex(result);
}

function hmac_sha512_base64 ( data, password ) {
    var result = hmac_sha512_bytes( data, password );
    return bytes_to_base64(result);
}

hmac_sha512_constructor.bytes = hmac_sha512_bytes;
hmac_sha512_constructor.hex = hmac_sha512_hex;
hmac_sha512_constructor.base64 = hmac_sha512_base64;

exports.HMAC_SHA512 = hmac_sha512_constructor;

function pbkdf2_constructor ( options ) {
    options = options || {};

    if ( !options.hmac )
        throw new SyntaxError("option 'hmac' is required");

    if ( !options.hmac.HMAC_SIZE )
        throw new SyntaxError("option 'hmac' supplied doesn't seem to be a valid HMAC function");

    this.hmac = options.hmac;
    this.count = options.count || 4096;
    this.length = options.length || this.hmac.HMAC_SIZE;

    this.result = null;

    var password = options.password;
    if ( password || is_string(password) )
        this.reset(options);

    return this;
}

function pbkdf2_reset ( options ) {
    this.result = null;

    this.hmac.reset(options);

    return this;
}

function pbkdf2_generate ( salt, count, length ) {
    if ( this.result !== null )
        throw new IllegalStateError("state must be reset before processing new data");

    if ( !salt && !is_string(salt) )
        throw new IllegalArgumentError("bad 'salt' value");

    count = count || this.count;
    length = length || this.length;

    this.result = new Uint8Array(length);

    var blocks = Math.ceil( length / this.hmac.HMAC_SIZE );

    for ( var i = 1; i <= blocks; ++i ) {
        var j = ( i - 1 ) * this.hmac.HMAC_SIZE;
        var l = ( i < blocks ? 0 : length % this.hmac.HMAC_SIZE ) || this.hmac.HMAC_SIZE;
        var tmp = new Uint8Array( this.hmac.reset().process(salt).process( new Uint8Array([ i>>>24&0xff, i>>>16&0xff, i>>>8&0xff, i&0xff ]) ).finish().result );
        this.result.set( tmp.subarray( 0, l ), j );
        for ( var k = 1; k < count; ++k ) {
            tmp = new Uint8Array( this.hmac.reset().process(tmp).finish().result );
            for ( var r = 0; r < l; ++r ) this.result[j+r] ^= tmp[r];
        }
    }

    return this;
}

// methods
var pbkdf2_prototype = pbkdf2_constructor.prototype;
pbkdf2_prototype.reset =   pbkdf2_reset;
pbkdf2_prototype.generate = pbkdf2_generate;

function pbkdf2_hmac_sha256_constructor ( options ) {
    options = options || {};

    if ( !( options.hmac instanceof hmac_sha256_constructor ) )
        options.hmac = get_hmac_sha256_instance();

    pbkdf2_constructor.call( this, options );

    return this;
}

function pbkdf2_hmac_sha256_generate ( salt, count, length ) {
    if ( this.result !== null )
        throw new IllegalStateError("state must be reset before processing new data");

    if ( !salt && !is_string(salt) )
        throw new IllegalArgumentError("bad 'salt' value");

    count = count || this.count;
    length = length || this.length;

    this.result = new Uint8Array(length);

    var blocks = Math.ceil( length / this.hmac.HMAC_SIZE );

    for ( var i = 1; i <= blocks; ++i ) {
        var j = ( i - 1 ) * this.hmac.HMAC_SIZE;
        var l = ( i < blocks ? 0 : length % this.hmac.HMAC_SIZE ) || this.hmac.HMAC_SIZE;

        this.hmac.reset().process(salt);
        this.hmac.hash.asm.pbkdf2_generate_block( this.hmac.hash.pos, this.hmac.hash.len, i, count, 0 );

        this.result.set( this.hmac.hash.heap.subarray( 0, l ), j );
    }

    return this;
}

var pbkdf2_hmac_sha256_prototype = pbkdf2_hmac_sha256_constructor.prototype;
pbkdf2_hmac_sha256_prototype.reset =   pbkdf2_reset;
pbkdf2_hmac_sha256_prototype.generate = pbkdf2_hmac_sha256_generate;

var pbkdf2_hmac_sha256_instance = null;

function get_pbkdf2_hmac_sha256_instance () {
    if ( pbkdf2_hmac_sha256_instance === null ) pbkdf2_hmac_sha256_instance = new pbkdf2_hmac_sha256_constructor();
    return pbkdf2_hmac_sha256_instance;
}

function pbkdf2_hmac_sha512_constructor ( options ) {
    options = options || {};

    if ( !( options.hmac instanceof hmac_sha512_constructor ) )
        options.hmac = get_hmac_sha512_instance();

    pbkdf2_constructor.call( this, options );

    return this;
}

function pbkdf2_hmac_sha512_generate ( salt, count, length ) {
    if ( this.result !== null )
        throw new IllegalStateError("state must be reset before processing new data");

    if ( !salt && !is_string(salt) )
        throw new IllegalArgumentError("bad 'salt' value");

    count = count || this.count;
    length = length || this.length;

    this.result = new Uint8Array(length);

    var blocks = Math.ceil( length / this.hmac.HMAC_SIZE );

    for ( var i = 1; i <= blocks; ++i ) {
        var j = ( i - 1 ) * this.hmac.HMAC_SIZE;
        var l = ( i < blocks ? 0 : length % this.hmac.HMAC_SIZE ) || this.hmac.HMAC_SIZE;

        this.hmac.reset().process(salt);
        this.hmac.hash.asm.pbkdf2_generate_block( this.hmac.hash.pos, this.hmac.hash.len, i, count, 0 );

        this.result.set( this.hmac.hash.heap.subarray( 0, l ), j );
    }

    return this;
}

var pbkdf2_hmac_sha512_prototype = pbkdf2_hmac_sha512_constructor.prototype;
pbkdf2_hmac_sha512_prototype.reset =   pbkdf2_reset;
pbkdf2_hmac_sha512_prototype.generate = pbkdf2_hmac_sha512_generate;

var pbkdf2_hmac_sha512_instance = null;

function get_pbkdf2_hmac_sha512_instance () {
    if ( pbkdf2_hmac_sha512_instance === null ) pbkdf2_hmac_sha512_instance = new pbkdf2_hmac_sha512_constructor();
    return pbkdf2_hmac_sha512_instance;
}

/**
 * PBKDF2-HMAC-SHA512 exports
 */

function pbkdf2_hmac_sha512_bytes ( password, salt, iterations, dklen ) {
    if ( password === undefined ) throw new SyntaxError("password required");
    if ( salt === undefined ) throw new SyntaxError("salt required");
    return get_pbkdf2_hmac_sha512_instance().reset( { password: password } ).generate( salt, iterations, dklen ).result;
}

function pbkdf2_hmac_sha512_hex ( password, salt, iterations, dklen ) {
    var result = pbkdf2_hmac_sha512_bytes( password, salt, iterations, dklen );
    return bytes_to_hex(result);
}

function pbkdf2_hmac_sha512_base64 ( password, salt, iterations, dklen ) {
    var result = pbkdf2_hmac_sha512_bytes( password, salt, iterations, dklen );
    return bytes_to_base64(result);
}

exports.PBKDF2_HMAC_SHA512 = {
    bytes: pbkdf2_hmac_sha512_bytes,
    hex: pbkdf2_hmac_sha512_hex,
    base64: pbkdf2_hmac_sha512_base64
};

/* ----------------------------------------------------------------------
 * Copyright (c) 2014 Artem S Vybornov
 *
 * Copyright (c) 2012 Yves-Marie K. Rinquin
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * ----------------------------------------------------------------------
 *
 * ISAAC is a cryptographically secure pseudo-random number generator
 * (or CSPRNG for short) designed by Robert J. Jenkins Jr. in 1996 and
 * based on RC4. It is designed for speed and security.
 *
 * ISAAC's informations & analysis:
 *   http://burtleburtle.net/bob/rand/isaac.html
 * ISAAC's implementation details:
 *   http://burtleburtle.net/bob/rand/isaacafa.html
 *
 * ISAAC succesfully passed TestU01
 */

var ISAAC = ( function () {
    var m = new Uint32Array(256), // internal memory
        r = new Uint32Array(256), // result array
        acc = 0,              // accumulator
        brs = 0,              // last result
        cnt = 0,              // counter
        gnt = 0;              // generation counter

    /* private: randinit function, same as ISAAC reference implementation */
    function randinit() {
        var a, b, c, d, e, f, g, h;

        /* private mixing function */
        function mix () {
            a ^= b <<  11; d = (d + a)|0; b = (b + c)|0;
            b ^= c >>>  2; e = (e + b)|0; c = (c + d)|0;
            c ^= d <<   8; f = (f + c)|0; d = (d + e)|0;
            d ^= e >>> 16; g = (g + d)|0; e = (e + f)|0;
            e ^= f <<  10; h = (h + e)|0; f = (f + g)|0;
            f ^= g >>>  4; a = (a + f)|0; g = (g + h)|0;
            g ^= h <<   8; b = (b + g)|0; h = (h + a)|0;
            h ^= a >>>  9; c = (c + h)|0; a = (a + b)|0;
        }

        acc = brs = cnt = 0;

        // the golden ratio
        a = b = c = d = e = f = g = h = 0x9e3779b9;

        // scramble it
        for ( var i = 0; i < 4; i++ )
            mix();

        // mix it and combine with the internal state
        for ( var i = 0; i < 256; i += 8 ) {
            a = (a + r[i|0])|0; b = (b + r[i|1])|0;
            c = (c + r[i|2])|0; d = (d + r[i|3])|0;
            e = (e + r[i|4])|0; f = (f + r[i|5])|0;
            g = (g + r[i|6])|0; h = (h + r[i|7])|0;
            mix();
            m.set([a, b, c, d, e, f, g, h], i);
        }

        // mix it again
        for ( var i = 0; i < 256; i += 8 ) {
            a = (a + m[i|0])|0; b = (b + m[i|1])|0;
            c = (c + m[i|2])|0; d = (d + m[i|3])|0;
            e = (e + m[i|4])|0; f = (f + m[i|5])|0;
            g = (g + m[i|6])|0; h = (h + m[i|7])|0;
            mix();
            m.set([a, b, c, d, e, f, g, h], i);
        }

        // fill in the first set of results
        prng(1), gnt = 256;
    }

    /* public: seeding function */
    function seed ( s ) {
        var i, j, k, n, l;

        if ( !is_typed_array(s) ) {
            if ( is_number(s) ) {
                n = new FloatArray(1), n[0] = s;
                s = new Uint8Array(n.buffer);
            }
            else if ( is_string(s) ) {
                s = string_to_bytes(s);
            }
            else if ( is_buffer(s) ) {
                s = new Uint8Array(s);
            }
            else {
                throw new TypeError("bad seed type");
            }
        }
        else {
            s = new Uint8Array(s.buffer);
        }

        // preprocess the seed
        l = s.length;
        for ( j = 0; j < l; j += 1024 )
        {
            // xor each chunk of 1024 bytes with r, for randinit() to mix in
            for ( k = j, i = 0; ( i < 1024 ) && ( k < l ); k = j | (++i) ) {
                r[i >> 2] ^= ( s[k] << ( (i & 3) << 3 ) );
            }
            randinit();
        }
    }

    /* public: isaac generator, n = number of run */
    function prng ( n ) {
        n = n || 1;

        var i, x, y;

        while ( n-- ) {
            cnt = (cnt + 1)|0;
            brs = (brs + cnt)|0;

            for ( i = 0; i < 256; i += 4 ) {
                acc ^= acc << 13;
                acc = m[(i + 128) & 0xff] + acc | 0; x = m[i|0];
                m[i|0] = y = m[(x>>>2) & 0xff] + ( acc + brs | 0 ) | 0;
                r[i|0] = brs = m[(y>>>10) & 0xff] + x | 0;

                acc ^= acc >>> 6;
                acc = m[(i + 129) & 0xff] + acc | 0; x = m[i|1];
                m[i|1] = y = m[(x >>> 2) & 0xff] + ( acc + brs | 0 ) | 0;
                r[i|1] = brs = m[(y >>> 10) & 0xff] + x | 0;

                acc ^= acc << 2;
                acc = m[(i + 130) & 0xff] + acc | 0; x = m[i|2];
                m[i|2] = y = m[(x >>> 2) & 0xff] + ( acc + brs | 0 ) | 0;
                r[i|2] = brs = m[(y >>> 10) & 0xff] + x | 0;

                acc ^= acc >>> 16;
                acc = m[(i + 131) & 0xff] + acc | 0; x = m[i|3];
                m[i|3] = y = m[(x >>> 2) & 0xff] + (acc + brs | 0 ) | 0;
                r[i|3] = brs = m[(y >>> 10) & 0xff] + x | 0;
            }
        }
    }

    /* public: return a random number */
    function rand() {
        if ( !gnt-- )
            prng(1), gnt = 255;

        return r[gnt];
    }

    /* return class object */
    return {
        'seed':  seed,
        'prng':  prng,
        'rand':  rand
    };
})();

var _global_console = global.console,
    _global_date_now = global.Date.now,
    _global_math_random = global.Math.random,
    _global_performance = global.performance,
    _global_crypto = global.crypto || global.msCrypto,
    _global_crypto_getRandomValues;

if ( _global_crypto !== undefined )
    _global_crypto_getRandomValues = _global_crypto.getRandomValues;

var _isaac_rand = ISAAC.rand,
    _isaac_seed = ISAAC.seed,
    _isaac_counter = 0,
    _isaac_weak_seeded = false,
    _isaac_seeded = false;

var _random_estimated_entropy = 0,
    _random_required_entropy = 256,
    _random_allow_weak = false,
    _random_skip_system_rng_warning = false,
    _random_warn_callstacks = {};

var _hires_now;
if ( _global_performance !== undefined ) {
    _hires_now = function () { return 1000 * _global_performance.now() | 0 };
}
else {
    var _hires_epoch = 1000 * _global_date_now() | 0;
    _hires_now = function () { return 1000 * _global_date_now() - _hires_epoch | 0 };
}

/**
 * weak_seed
 *
 * Seeds RNG with native `crypto.getRandomValues` output or with high-resolution
 * time and single `Math.random()` value, and various other sources.
 *
 * We estimate this may give at least ~50 bits of unpredictableness,
 * but this has not been analysed thoroughly or precisely.
 */
function Random_weak_seed () {
    if ( _global_crypto !== undefined ) {
        buffer = new Uint8Array(32);
        _global_crypto_getRandomValues.call( _global_crypto, buffer );

        _isaac_seed(buffer);
    }
    else {
        // Some clarification about brute-force attack cost:
        // - entire bitcoin network operates at ~10^16 hash guesses per second;
        // - each PBKDF2 iteration requires the same number of hashing operations as bitcoin nonce guess;
        // - attacker having such a hashing power is able to break worst-case 50 bits of the randomness in ~3 hours;
        // Sounds sad though attacker having such a hashing power more likely would prefer to mine bitcoins.
        var buffer = new FloatArray(3),
            i, t;

        buffer[0] = _global_math_random();
        buffer[1] = _global_date_now();
        buffer[2] = _hires_now();

        buffer = new Uint8Array(buffer.buffer);

        var pbkdf2 = get_pbkdf2_hmac_sha256_instance();
        for ( i = 0; i < 100; i++ ) {
            buffer = pbkdf2.reset( { password: buffer } ).generate( global.location.href, 1000, 32 ).result;
            t = _hires_now();
            buffer[0] ^= t >>> 24, buffer[1] ^= t >>> 16, buffer[2] ^= t >>> 8, buffer[3] ^= t;
        }

        _isaac_seed(buffer);
    }

    _isaac_counter = 0;

    _isaac_weak_seeded = true;
}

/**
 * seed
 *
 * Seeds PRNG with supplied random values if these values have enough entropy.
 *
 * A false return value means the RNG is currently insecure; however a true
 * return value does not mean it is necessarily secure (depending on how you
 * collected the seed) though asmCrypto will be forced to assume this.
 *
 * The input buffer will be zeroed to discourage reuse. You should not copy it
 * or use it anywhere else before passing it into this function.
 *
 * **DISCLAIMER!** Seeding with a poor values is an easiest way shoot your legs, so
 * do not seed until you're know what entropy is and how to obtail high-quality random values,
 * **DO NOT SEED WITH CONSTANT VALUE! YOU'LL GET NO RANDOMNESS FROM CONSTANT!**
 */
function Random_seed ( seed ) {
    if ( !is_buffer(seed) && !is_typed_array(seed) )
        throw new TypeError("bad seed type");

    var bpos = seed.byteOffset || 0,
        blen = seed.byteLength || seed.length,
        buff = new Uint8Array( ( seed.buffer || seed ), bpos, blen );

    _isaac_seed(buff);

    _isaac_counter = 0;

    // don't let the user use these bytes again
    var nonzero = 0;
    for ( var i = 0; i < buff.length; i++ ) {
        nonzero |= buff[i];
        buff[i] = 0;
    }

    if ( nonzero !== 0 ) {
        // TODO we could make a better estimate, but half-length is a prudent
        // simple measure that seems unlikely to over-estimate
        _random_estimated_entropy += 4 * blen;
    }

    _isaac_seeded = ( _random_estimated_entropy  >= _random_required_entropy );

    return _isaac_seeded;
}

/**
 * getValues
 *
 * Populates the buffer with cryptographically secure random values. These are
 * calculated using `crypto.getRandomValues` if it is available, as well as our
 * own ISAAC PRNG implementation.
 *
 * If the former is not available (older browsers such as IE10 [1]), then the
 * latter *must* be seeded using `Random.seed`, unless `asmCrypto.random.allowWeak` is true.
 *
 * *We assume the system RNG is strong*; if you cannot afford this risk, then
 * you should also seed ISAAC using `Random.seed`. This is advisable for very
 * important situations, such as generation of long-term secrets. See also [2].
 *
 * [1] https://developer.mozilla.org/en-US/docs/Web/API/window.crypto.getRandomValues
 * [2] https://en.wikipedia.org/wiki/Dual_EC_DRBG
 *
 * In all cases, we opportunistically seed using various arbitrary sources
 * such as high-resolution time and one single value from the insecure
 * Math.random(); however this is not reliable as a strong security measure.
 */
function Random_getValues ( buffer ) {
    // opportunistically seed ISAAC with a weak seed; this hopefully makes an
    // attack harder in the case where the system RNG is weak *and* we haven't
    // seeded ISAAC. but don't make any guarantees to the user about this.
    if ( !_isaac_weak_seeded )
        Random_weak_seed();

    // if we have no strong sources then the RNG is weak, handle it
    if ( !_isaac_seeded && _global_crypto === undefined ) {
        if ( !_random_allow_weak )
            throw new SecurityError("No strong PRNGs available. Use asmCrypto.random.seed().");

        if ( _global_console !== undefined )
            _global_console.error("No strong PRNGs available; your security is greatly lowered. Use asmCrypto.random.seed().");
    }

    // separate warning about assuming system RNG strong
    if ( !_random_skip_system_rng_warning && !_isaac_seeded && _global_crypto !== undefined && _global_console !== undefined ) {
        // Hacky way to get call stack
        var s = new Error().stack;
        _random_warn_callstacks[s] |= 0;
        if ( !_random_warn_callstacks[s]++ )
            _global_console.warn("asmCrypto PRNG not seeded; your security relies on your system PRNG. If this is not acceptable, use asmCrypto.random.seed().");
    }

    // proceed to get random values
    if ( !is_buffer(buffer) && !is_typed_array(buffer) )
        throw new TypeError("unexpected buffer type");

    var bpos = buffer.byteOffset || 0,
        blen = buffer.byteLength || buffer.length,
        bytes = new Uint8Array( ( buffer.buffer || buffer ), bpos, blen ),
        i, r;

    // apply system rng
    if ( _global_crypto !== undefined )
        _global_crypto_getRandomValues.call( _global_crypto, bytes );

    // apply isaac rng
    for ( i = 0; i < blen; i++ ) {
        if ( (i & 3) === 0 ) {
            if ( _isaac_counter >= 0x10000000000 ) Random_weak_seed();
            r = _isaac_rand();
            _isaac_counter++;
        }
        bytes[i] ^= r;
        r >>>= 8;
    }

    return buffer;
}

/**
 * getNumber
 *
 * A drop-in `Math.random` replacement.
 * Intended for prevention of random material leakage out of the user's host.
 */
function Random_getNumber () {
    if ( !_isaac_weak_seeded || _isaac_counter >= 0x10000000000 )
        Random_weak_seed();

    var n = ( 0x100000 * _isaac_rand() + ( _isaac_rand() >>> 12 ) ) / 0x10000000000000;
    _isaac_counter += 2;

    return n;
}

exports.random = Random_getNumber;

exports.random.seed = Random_seed;

Object.defineProperty( Random_getNumber, 'allowWeak', {
    get: function () { return _random_allow_weak; },
    set: function ( a ) { _random_allow_weak = a; }
});

Object.defineProperty( Random_getNumber, 'skipSystemRNGWarning', {
    get: function () { return _random_skip_system_rng_warning; },
    set: function ( w ) { _random_skip_system_rng_warning = w; }
});

exports.getRandomValues = Random_getValues;

exports.getRandomValues.seed = Random_seed;

Object.defineProperty( Random_getValues, 'allowWeak', {
    get: function () { return _random_allow_weak; },
    set: function ( a ) { _random_allow_weak = a; }
});

Object.defineProperty( Random_getValues, 'skipSystemRNGWarning', {
    get: function () { return _random_skip_system_rng_warning; },
    set: function ( w ) { _random_skip_system_rng_warning = w; }
});

global.Math.random = Random_getNumber;

if ( global.crypto === undefined ) global.crypto = {};
global.crypto.getRandomValues = Random_getValues;

var bigint_asm;

if ( global.Math.imul === undefined ) {
    function _half_imul ( a, b ) {
        return a * b | 0;
    }
    bigint_asm = function ( stdlib, foreign, buffer ) {
        global.Math.imul = _half_imul;
        var m = _bigint_asm( stdlib, foreign, buffer );
        delete global.Math.imul;
        return m;
    };
}
else {
    bigint_asm = _bigint_asm;
}

/**
 * Integers are represented as little endian array of 32-bit limbs.
 * Limbs number is a power of 2 and a multiple of 8 (256 bits).
 * Negative values use two's complement representation.
 */
function _bigint_asm ( stdlib, foreign, buffer ) {
    "use asm";

    var SP = 0;

    var HEAP32 = new stdlib.Uint32Array(buffer);

    var imul = stdlib.Math.imul;

    /**
     * Simple stack memory allocator
     *
     * Methods:
     *  sreset
     *  salloc
     *  sfree
     */

    function sreset ( p ) {
        p = p|0;
        SP = p = (p + 31) & -32;
        return p|0;
    }

    function salloc ( l ) {
        l = l|0;
        var p = 0; p = SP;
        SP = p + ((l + 31) & -32)|0;
        return p|0;
    }

    function sfree ( l ) {
        l = l|0;
        SP = SP - ((l + 31) & -32)|0;
    }

    /**
     * Utility functions:
     *  cp
     *  z
     */

    function cp ( l, A, B ) {
        l = l|0;
        A = A|0;
        B = B|0;

        var i = 0;

        if ( (A|0) > (B|0) ) {
            for ( ; (i|0) < (l|0); i = (i+4)|0 ) {
                HEAP32[(B+i)>>2] = HEAP32[(A+i)>>2];
            }
        }
        else {
            for ( i = (l-4)|0; (i|0) >= 0; i = (i-4)|0 ) {
                HEAP32[(B+i)>>2] = HEAP32[(A+i)>>2];
            }
        }
    }

    function z ( l, z, A ) {
        l = l|0;
        z = z|0;
        A = A|0;

        var i = 0;

        for ( ; (i|0) < (l|0); i = (i+4)|0 ) {
            HEAP32[(A+i)>>2] = z;
        }
    }

    /**
     * Negate the argument
     *
     * Perform two's complement transformation:
     *
     *  -A = ~A + 1
     *
     * @param A offset of the argment being negated, 32-byte aligned
     * @param lA length of the argument, multiple of 32
     *
     * @param R offset where to place the result to, 32-byte aligned
     * @param lR length to truncate the result to, multiple of 32
     */
    function neg ( A, lA, R, lR ) {
        A  =  A|0;
        lA = lA|0;
        R  =  R|0;
        lR = lR|0;

        var a = 0, c = 0, t = 0, r = 0, i = 0;

        if ( (lR|0) <= 0 )
            lR = lA;

        if ( (lR|0) < (lA|0) )
            lA = lR;

        c = 1;
        for ( ; (i|0) < (lA|0); i = (i+4)|0 ) {
            a = ~HEAP32[(A+i)>>2];
            t = (a & 0xffff) + c|0;
            r = (a >>> 16) + (t >>> 16)|0;
            HEAP32[(R+i)>>2] = (r << 16) | (t & 0xffff);
            c = r >>> 16;
        }

        for ( ; (i|0) < (lR|0); i = (i+4)|0 ) {
            HEAP32[(R+i)>>2] = (c-1)|0;
        }

        return c|0;
    }

    function cmp ( A, lA, B, lB ) {
        A  =  A|0;
        lA = lA|0;
        B  =  B|0;
        lB = lB|0;

        var a = 0, b = 0, i = 0;

        if ( (lA|0) > (lB|0) ) {
            for ( i = (lA-4)|0; (i|0) >= (lB|0); i = (i-4)|0 ) {
                if ( HEAP32[(A+i)>>2]|0 ) return 1;
            }
        }
        else {
            for ( i = (lB-4)|0; (i|0) >= (lA|0); i = (i-4)|0 ) {
                if ( HEAP32[(B+i)>>2]|0 ) return -1;
            }
        }

        for ( ; (i|0) >= 0; i = (i-4)|0 ) {
            a = HEAP32[(A+i)>>2]|0, b = HEAP32[(B+i)>>2]|0;
            if ( (a>>>0) < (b>>>0) ) return -1;
            if ( (a>>>0) > (b>>>0) ) return 1;
        }

        return 0;
    }

    /**
     * Test the argument
     *
     * Same as `cmp` with zero.
     */
    function tst ( A, lA ) {
        A  =  A|0;
        lA = lA|0;

        var i = 0;

        for ( i = (lA-4)|0; (i|0) >= 0; i = (i-4)|0 ) {
            if ( HEAP32[(A+i)>>2]|0 ) return (i+4)|0;
        }

        return 0;
    }

    /**
     * Conventional addition
     *
     * @param A offset of the first argument, 32-byte aligned
     * @param lA length of the first argument, multiple of 32
     *
     * @param B offset of the second argument, 32-bit aligned
     * @param lB length of the second argument, multiple of 32
     *
     * @param R offset where to place the result to, 32-byte aligned
     * @param lR length to truncate the result to, multiple of 32
     */
    function add ( A, lA, B, lB, R, lR ) {
        A  =  A|0;
        lA = lA|0;
        B  =  B|0;
        lB = lB|0;
        R  =  R|0;
        lR = lR|0;

        var a = 0, b = 0, c = 0, t = 0, r = 0, i = 0;

        if ( (lA|0) < (lB|0) ) {
            t = A, A = B, B = t;
            t = lA, lA = lB, lB = t;
        }

        if ( (lR|0) <= 0 )
            lR = lA+4|0;

        if ( (lR|0) < (lB|0) )
            lA = lB = lR;

        for ( ; (i|0) < (lB|0); i = (i+4)|0 ) {
            a = HEAP32[(A+i)>>2]|0;
            b = HEAP32[(B+i)>>2]|0;
            t = ( (a & 0xffff) + (b & 0xffff)|0 ) + c|0;
            r = ( (a >>> 16) + (b >>> 16)|0 ) + (t >>> 16)|0;
            HEAP32[(R+i)>>2] = (t & 0xffff) | (r << 16);
            c = r >>> 16;
        }

        for ( ; (i|0) < (lA|0); i = (i+4)|0 ) {
            a = HEAP32[(A+i)>>2]|0;
            t = (a & 0xffff) + c|0;
            r = (a >>> 16) + (t >>> 16)|0;
            HEAP32[(R+i)>>2] = (t & 0xffff) | (r << 16);
            c = r >>> 16;
        }

        for ( ; (i|0) < (lR|0); i = (i+4)|0 ) {
            HEAP32[(R+i)>>2] = c|0;
            c = 0;
        }

        return c|0;
    }

   /**
     * Conventional subtraction
     *
     * @param A offset of the first argument, 32-byte aligned
     * @param lA length of the first argument, multiple of 32
     *
     * @param B offset of the second argument, 32-bit aligned
     * @param lB length of the second argument, multiple of 32
     *
     * @param R offset where to place the result to, 32-byte aligned
     * @param lR length to truncate the result to, multiple of 32
     */
    function sub ( A, lA, B, lB, R, lR ) {
        A  =  A|0;
        lA = lA|0;
        B  =  B|0;
        lB = lB|0;
        R  =  R|0;
        lR = lR|0;

        var a = 0, b = 0, c = 0, t = 0, r = 0, i = 0;

        if ( (lR|0) <= 0 )
            lR = (lA|0) > (lB|0) ? lA+4|0 : lB+4|0;

        if ( (lR|0) < (lA|0) )
            lA = lR;

        if ( (lR|0) < (lB|0) )
            lB = lR;

        if ( (lA|0) < (lB|0) ) {
            for ( ; (i|0) < (lA|0); i = (i+4)|0 ) {
                a = HEAP32[(A+i)>>2]|0;
                b = HEAP32[(B+i)>>2]|0;
                t = ( (a & 0xffff) - (b & 0xffff)|0 ) + c|0;
                r = ( (a >>> 16) - (b >>> 16)|0 ) + (t >> 16)|0;
                HEAP32[(R+i)>>2] = (t & 0xffff) | (r << 16);
                c = r >> 16;
            }

            for ( ; (i|0) < (lB|0); i = (i+4)|0 ) {
                b = HEAP32[(B+i)>>2]|0;
                t = c - (b & 0xffff)|0;
                r = (t >> 16) - (b >>> 16)|0;
                HEAP32[(R+i)>>2] = (t & 0xffff) | (r << 16);
                c = r >> 16;
            }
        }
        else {
            for ( ; (i|0) < (lB|0); i = (i+4)|0 ) {
                a = HEAP32[(A+i)>>2]|0;
                b = HEAP32[(B+i)>>2]|0;
                t = ( (a & 0xffff) - (b & 0xffff)|0 ) + c|0;
                r = ( (a >>> 16) - (b >>> 16)|0 ) + (t >> 16)|0;
                HEAP32[(R+i)>>2] = (t & 0xffff) | (r << 16);
                c = r >> 16;
            }

            for ( ; (i|0) < (lA|0); i = (i+4)|0 ) {
                a = HEAP32[(A+i)>>2]|0;
                t = (a & 0xffff) + c|0;
                r = (a >>> 16) + (t >> 16)|0;
                HEAP32[(R+i)>>2] = (t & 0xffff) | (r << 16);
                c = r >> 16;
            }
        }

        for ( ; (i|0) < (lR|0); i = (i+4)|0 ) {
            HEAP32[(R+i)>>2] = c|0;
        }

        return c|0;
    }

    /**
     * Conventional multiplication
     *
     * TODO implement Karatsuba algorithm for large multiplicands
     *
     * @param A offset of the first argument, 32-byte aligned
     * @param lA length of the first argument, multiple of 32
     *
     * @param B offset of the second argument, 32-byte aligned
     * @param lB length of the second argument, multiple of 32
     *
     * @param R offset where to place the result to, 32-byte aligned
     * @param lR length to truncate the result to, multiple of 32
     */
    function mul ( A, lA, B, lB, R, lR ) {
        A  =  A|0;
        lA = lA|0;
        B  =  B|0;
        lB = lB|0;
        R  =  R|0;
        lR = lR|0;

        var al0 = 0, al1 = 0, al2 = 0, al3 = 0, al4 = 0, al5 = 0, al6 = 0, al7 = 0, ah0 = 0, ah1 = 0, ah2 = 0, ah3 = 0, ah4 = 0, ah5 = 0, ah6 = 0, ah7 = 0,
            bl0 = 0, bl1 = 0, bl2 = 0, bl3 = 0, bl4 = 0, bl5 = 0, bl6 = 0, bl7 = 0, bh0 = 0, bh1 = 0, bh2 = 0, bh3 = 0, bh4 = 0, bh5 = 0, bh6 = 0, bh7 = 0,
            r0 = 0, r1 = 0, r2 = 0, r3 = 0, r4 = 0, r5 = 0, r6 = 0, r7 = 0, r8 = 0, r9 = 0, r10 = 0, r11 = 0, r12 = 0, r13 = 0, r14 = 0, r15 = 0,
            u = 0, v = 0, w = 0, m = 0,
            i = 0, Ai = 0, j = 0, Bj = 0, Rk = 0;

        if ( (lA|0) > (lB|0) ) {
            u = A, v = lA;
            A = B, lA = lB;
            B = u, lB = v;
        }

        m = (lA+lB)|0;
        if ( ( (lR|0) > (m|0) ) | ( (lR|0) <= 0 ) )
            lR = m;

        if ( (lR|0) < (lA|0) )
            lA = lR;

        if ( (lR|0) < (lB|0) )
            lB = lR;

        for ( ; (i|0) < (lA|0); i = (i+32)|0 ) {
            Ai = (A+i)|0;

            ah0 = HEAP32[(Ai|0)>>2]|0,
            ah1 = HEAP32[(Ai|4)>>2]|0,
            ah2 = HEAP32[(Ai|8)>>2]|0,
            ah3 = HEAP32[(Ai|12)>>2]|0,
            ah4 = HEAP32[(Ai|16)>>2]|0,
            ah5 = HEAP32[(Ai|20)>>2]|0,
            ah6 = HEAP32[(Ai|24)>>2]|0,
            ah7 = HEAP32[(Ai|28)>>2]|0,
            al0 = ah0 & 0xffff,
            al1 = ah1 & 0xffff,
            al2 = ah2 & 0xffff,
            al3 = ah3 & 0xffff,
            al4 = ah4 & 0xffff,
            al5 = ah5 & 0xffff,
            al6 = ah6 & 0xffff,
            al7 = ah7 & 0xffff,
            ah0 = ah0 >>> 16,
            ah1 = ah1 >>> 16,
            ah2 = ah2 >>> 16,
            ah3 = ah3 >>> 16,
            ah4 = ah4 >>> 16,
            ah5 = ah5 >>> 16,
            ah6 = ah6 >>> 16,
            ah7 = ah7 >>> 16;

            r8 = r9 = r10 = r11 = r12 = r13 = r14 = r15 = 0;

            for ( j = 0; (j|0) < (lB|0); j = (j+32)|0 ) {
                Bj = (B+j)|0;
                Rk = (R+(i+j|0))|0;

                bh0 = HEAP32[(Bj|0)>>2]|0,
                bh1 = HEAP32[(Bj|4)>>2]|0,
                bh2 = HEAP32[(Bj|8)>>2]|0,
                bh3 = HEAP32[(Bj|12)>>2]|0,
                bh4 = HEAP32[(Bj|16)>>2]|0,
                bh5 = HEAP32[(Bj|20)>>2]|0,
                bh6 = HEAP32[(Bj|24)>>2]|0,
                bh7 = HEAP32[(Bj|28)>>2]|0,
                bl0 = bh0 & 0xffff,
                bl1 = bh1 & 0xffff,
                bl2 = bh2 & 0xffff,
                bl3 = bh3 & 0xffff,
                bl4 = bh4 & 0xffff,
                bl5 = bh5 & 0xffff,
                bl6 = bh6 & 0xffff,
                bl7 = bh7 & 0xffff,
                bh0 = bh0 >>> 16,
                bh1 = bh1 >>> 16,
                bh2 = bh2 >>> 16,
                bh3 = bh3 >>> 16,
                bh4 = bh4 >>> 16,
                bh5 = bh5 >>> 16,
                bh6 = bh6 >>> 16,
                bh7 = bh7 >>> 16;

                r0 = HEAP32[(Rk|0)>>2]|0,
                r1 = HEAP32[(Rk|4)>>2]|0,
                r2 = HEAP32[(Rk|8)>>2]|0,
                r3 = HEAP32[(Rk|12)>>2]|0,
                r4 = HEAP32[(Rk|16)>>2]|0,
                r5 = HEAP32[(Rk|20)>>2]|0,
                r6 = HEAP32[(Rk|24)>>2]|0,
                r7 = HEAP32[(Rk|28)>>2]|0;

                u = ((imul(al0, bl0)|0) + (r8 & 0xffff)|0) + (r0 & 0xffff)|0;
                v = ((imul(ah0, bl0)|0) + (r8 >>> 16)|0) + (r0 >>> 16)|0;
                w = ((imul(al0, bh0)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah0, bh0)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r0 = (w << 16) | (u & 0xffff);

                u = ((imul(al0, bl1)|0) + (m & 0xffff)|0) + (r1 & 0xffff)|0;
                v = ((imul(ah0, bl1)|0) + (m >>> 16)|0) + (r1 >>> 16)|0;
                w = ((imul(al0, bh1)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah0, bh1)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r1 = (w << 16) | (u & 0xffff);

                u = ((imul(al0, bl2)|0) + (m & 0xffff)|0) + (r2 & 0xffff)|0;
                v = ((imul(ah0, bl2)|0) + (m >>> 16)|0) + (r2 >>> 16)|0;
                w = ((imul(al0, bh2)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah0, bh2)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r2 = (w << 16) | (u & 0xffff);

                u = ((imul(al0, bl3)|0) + (m & 0xffff)|0) + (r3 & 0xffff)|0;
                v = ((imul(ah0, bl3)|0) + (m >>> 16)|0) + (r3 >>> 16)|0;
                w = ((imul(al0, bh3)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah0, bh3)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r3 = (w << 16) | (u & 0xffff);

                u = ((imul(al0, bl4)|0) + (m & 0xffff)|0) + (r4 & 0xffff)|0;
                v = ((imul(ah0, bl4)|0) + (m >>> 16)|0) + (r4 >>> 16)|0;
                w = ((imul(al0, bh4)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah0, bh4)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r4 = (w << 16) | (u & 0xffff);

                u = ((imul(al0, bl5)|0) + (m & 0xffff)|0) + (r5 & 0xffff)|0;
                v = ((imul(ah0, bl5)|0) + (m >>> 16)|0) + (r5 >>> 16)|0;
                w = ((imul(al0, bh5)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah0, bh5)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r5 = (w << 16) | (u & 0xffff);

                u = ((imul(al0, bl6)|0) + (m & 0xffff)|0) + (r6 & 0xffff)|0;
                v = ((imul(ah0, bl6)|0) + (m >>> 16)|0) + (r6 >>> 16)|0;
                w = ((imul(al0, bh6)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah0, bh6)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r6 = (w << 16) | (u & 0xffff);

                u = ((imul(al0, bl7)|0) + (m & 0xffff)|0) + (r7 & 0xffff)|0;
                v = ((imul(ah0, bl7)|0) + (m >>> 16)|0) + (r7 >>> 16)|0;
                w = ((imul(al0, bh7)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah0, bh7)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r7 = (w << 16) | (u & 0xffff);

                r8 = m;

                u = ((imul(al1, bl0)|0) + (r9 & 0xffff)|0) + (r1 & 0xffff)|0;
                v = ((imul(ah1, bl0)|0) + (r9 >>> 16)|0) + (r1 >>> 16)|0;
                w = ((imul(al1, bh0)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah1, bh0)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r1 = (w << 16) | (u & 0xffff);

                u = ((imul(al1, bl1)|0) + (m & 0xffff)|0) + (r2 & 0xffff)|0;
                v = ((imul(ah1, bl1)|0) + (m >>> 16)|0) + (r2 >>> 16)|0;
                w = ((imul(al1, bh1)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah1, bh1)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r2 = (w << 16) | (u & 0xffff);

                u = ((imul(al1, bl2)|0) + (m & 0xffff)|0) + (r3 & 0xffff)|0;
                v = ((imul(ah1, bl2)|0) + (m >>> 16)|0) + (r3 >>> 16)|0;
                w = ((imul(al1, bh2)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah1, bh2)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r3 = (w << 16) | (u & 0xffff);

                u = ((imul(al1, bl3)|0) + (m & 0xffff)|0) + (r4 & 0xffff)|0;
                v = ((imul(ah1, bl3)|0) + (m >>> 16)|0) + (r4 >>> 16)|0;
                w = ((imul(al1, bh3)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah1, bh3)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r4 = (w << 16) | (u & 0xffff);

                u = ((imul(al1, bl4)|0) + (m & 0xffff)|0) + (r5 & 0xffff)|0;
                v = ((imul(ah1, bl4)|0) + (m >>> 16)|0) + (r5 >>> 16)|0;
                w = ((imul(al1, bh4)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah1, bh4)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r5 = (w << 16) | (u & 0xffff);

                u = ((imul(al1, bl5)|0) + (m & 0xffff)|0) + (r6 & 0xffff)|0;
                v = ((imul(ah1, bl5)|0) + (m >>> 16)|0) + (r6 >>> 16)|0;
                w = ((imul(al1, bh5)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah1, bh5)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r6 = (w << 16) | (u & 0xffff);

                u = ((imul(al1, bl6)|0) + (m & 0xffff)|0) + (r7 & 0xffff)|0;
                v = ((imul(ah1, bl6)|0) + (m >>> 16)|0) + (r7 >>> 16)|0;
                w = ((imul(al1, bh6)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah1, bh6)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r7 = (w << 16) | (u & 0xffff);

                u = ((imul(al1, bl7)|0) + (m & 0xffff)|0) + (r8 & 0xffff)|0;
                v = ((imul(ah1, bl7)|0) + (m >>> 16)|0) + (r8 >>> 16)|0;
                w = ((imul(al1, bh7)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah1, bh7)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r8 = (w << 16) | (u & 0xffff);

                r9 = m;

                u = ((imul(al2, bl0)|0) + (r10 & 0xffff)|0) + (r2 & 0xffff)|0;
                v = ((imul(ah2, bl0)|0) + (r10 >>> 16)|0) + (r2 >>> 16)|0;
                w = ((imul(al2, bh0)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah2, bh0)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r2 = (w << 16) | (u & 0xffff);

                u = ((imul(al2, bl1)|0) + (m & 0xffff)|0) + (r3 & 0xffff)|0;
                v = ((imul(ah2, bl1)|0) + (m >>> 16)|0) + (r3 >>> 16)|0;
                w = ((imul(al2, bh1)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah2, bh1)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r3 = (w << 16) | (u & 0xffff);

                u = ((imul(al2, bl2)|0) + (m & 0xffff)|0) + (r4 & 0xffff)|0;
                v = ((imul(ah2, bl2)|0) + (m >>> 16)|0) + (r4 >>> 16)|0;
                w = ((imul(al2, bh2)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah2, bh2)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r4 = (w << 16) | (u & 0xffff);

                u = ((imul(al2, bl3)|0) + (m & 0xffff)|0) + (r5 & 0xffff)|0;
                v = ((imul(ah2, bl3)|0) + (m >>> 16)|0) + (r5 >>> 16)|0;
                w = ((imul(al2, bh3)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah2, bh3)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r5 = (w << 16) | (u & 0xffff);

                u = ((imul(al2, bl4)|0) + (m & 0xffff)|0) + (r6 & 0xffff)|0;
                v = ((imul(ah2, bl4)|0) + (m >>> 16)|0) + (r6 >>> 16)|0;
                w = ((imul(al2, bh4)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah2, bh4)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r6 = (w << 16) | (u & 0xffff);

                u = ((imul(al2, bl5)|0) + (m & 0xffff)|0) + (r7 & 0xffff)|0;
                v = ((imul(ah2, bl5)|0) + (m >>> 16)|0) + (r7 >>> 16)|0;
                w = ((imul(al2, bh5)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah2, bh5)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r7 = (w << 16) | (u & 0xffff);

                u = ((imul(al2, bl6)|0) + (m & 0xffff)|0) + (r8 & 0xffff)|0;
                v = ((imul(ah2, bl6)|0) + (m >>> 16)|0) + (r8 >>> 16)|0;
                w = ((imul(al2, bh6)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah2, bh6)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r8 = (w << 16) | (u & 0xffff);

                u = ((imul(al2, bl7)|0) + (m & 0xffff)|0) + (r9 & 0xffff)|0;
                v = ((imul(ah2, bl7)|0) + (m >>> 16)|0) + (r9 >>> 16)|0;
                w = ((imul(al2, bh7)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah2, bh7)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r9 = (w << 16) | (u & 0xffff);

                r10 = m;

                u = ((imul(al3, bl0)|0) + (r11 & 0xffff)|0) + (r3 & 0xffff)|0;
                v = ((imul(ah3, bl0)|0) + (r11 >>> 16)|0) + (r3 >>> 16)|0;
                w = ((imul(al3, bh0)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah3, bh0)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r3 = (w << 16) | (u & 0xffff);

                u = ((imul(al3, bl1)|0) + (m & 0xffff)|0) + (r4 & 0xffff)|0;
                v = ((imul(ah3, bl1)|0) + (m >>> 16)|0) + (r4 >>> 16)|0;
                w = ((imul(al3, bh1)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah3, bh1)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r4 = (w << 16) | (u & 0xffff);

                u = ((imul(al3, bl2)|0) + (m & 0xffff)|0) + (r5 & 0xffff)|0;
                v = ((imul(ah3, bl2)|0) + (m >>> 16)|0) + (r5 >>> 16)|0;
                w = ((imul(al3, bh2)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah3, bh2)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r5 = (w << 16) | (u & 0xffff);

                u = ((imul(al3, bl3)|0) + (m & 0xffff)|0) + (r6 & 0xffff)|0;
                v = ((imul(ah3, bl3)|0) + (m >>> 16)|0) + (r6 >>> 16)|0;
                w = ((imul(al3, bh3)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah3, bh3)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r6 = (w << 16) | (u & 0xffff);

                u = ((imul(al3, bl4)|0) + (m & 0xffff)|0) + (r7 & 0xffff)|0;
                v = ((imul(ah3, bl4)|0) + (m >>> 16)|0) + (r7 >>> 16)|0;
                w = ((imul(al3, bh4)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah3, bh4)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r7 = (w << 16) | (u & 0xffff);

                u = ((imul(al3, bl5)|0) + (m & 0xffff)|0) + (r8 & 0xffff)|0;
                v = ((imul(ah3, bl5)|0) + (m >>> 16)|0) + (r8 >>> 16)|0;
                w = ((imul(al3, bh5)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah3, bh5)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r8 = (w << 16) | (u & 0xffff);

                u = ((imul(al3, bl6)|0) + (m & 0xffff)|0) + (r9 & 0xffff)|0;
                v = ((imul(ah3, bl6)|0) + (m >>> 16)|0) + (r9 >>> 16)|0;
                w = ((imul(al3, bh6)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah3, bh6)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r9 = (w << 16) | (u & 0xffff);

                u = ((imul(al3, bl7)|0) + (m & 0xffff)|0) + (r10 & 0xffff)|0;
                v = ((imul(ah3, bl7)|0) + (m >>> 16)|0) + (r10 >>> 16)|0;
                w = ((imul(al3, bh7)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah3, bh7)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r10 = (w << 16) | (u & 0xffff);

                r11 = m;

                u = ((imul(al4, bl0)|0) + (r12 & 0xffff)|0) + (r4 & 0xffff)|0;
                v = ((imul(ah4, bl0)|0) + (r12 >>> 16)|0) + (r4 >>> 16)|0;
                w = ((imul(al4, bh0)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah4, bh0)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r4 = (w << 16) | (u & 0xffff);

                u = ((imul(al4, bl1)|0) + (m & 0xffff)|0) + (r5 & 0xffff)|0;
                v = ((imul(ah4, bl1)|0) + (m >>> 16)|0) + (r5 >>> 16)|0;
                w = ((imul(al4, bh1)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah4, bh1)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r5 = (w << 16) | (u & 0xffff);

                u = ((imul(al4, bl2)|0) + (m & 0xffff)|0) + (r6 & 0xffff)|0;
                v = ((imul(ah4, bl2)|0) + (m >>> 16)|0) + (r6 >>> 16)|0;
                w = ((imul(al4, bh2)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah4, bh2)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r6 = (w << 16) | (u & 0xffff);

                u = ((imul(al4, bl3)|0) + (m & 0xffff)|0) + (r7 & 0xffff)|0;
                v = ((imul(ah4, bl3)|0) + (m >>> 16)|0) + (r7 >>> 16)|0;
                w = ((imul(al4, bh3)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah4, bh3)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r7 = (w << 16) | (u & 0xffff);

                u = ((imul(al4, bl4)|0) + (m & 0xffff)|0) + (r8 & 0xffff)|0;
                v = ((imul(ah4, bl4)|0) + (m >>> 16)|0) + (r8 >>> 16)|0;
                w = ((imul(al4, bh4)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah4, bh4)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r8 = (w << 16) | (u & 0xffff);

                u = ((imul(al4, bl5)|0) + (m & 0xffff)|0) + (r9 & 0xffff)|0;
                v = ((imul(ah4, bl5)|0) + (m >>> 16)|0) + (r9 >>> 16)|0;
                w = ((imul(al4, bh5)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah4, bh5)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r9 = (w << 16) | (u & 0xffff);

                u = ((imul(al4, bl6)|0) + (m & 0xffff)|0) + (r10 & 0xffff)|0;
                v = ((imul(ah4, bl6)|0) + (m >>> 16)|0) + (r10 >>> 16)|0;
                w = ((imul(al4, bh6)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah4, bh6)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r10 = (w << 16) | (u & 0xffff);

                u = ((imul(al4, bl7)|0) + (m & 0xffff)|0) + (r11 & 0xffff)|0;
                v = ((imul(ah4, bl7)|0) + (m >>> 16)|0) + (r11 >>> 16)|0;
                w = ((imul(al4, bh7)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah4, bh7)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r11 = (w << 16) | (u & 0xffff);

                r12 = m;

                u = ((imul(al5, bl0)|0) + (r13 & 0xffff)|0) + (r5 & 0xffff)|0;
                v = ((imul(ah5, bl0)|0) + (r13 >>> 16)|0) + (r5 >>> 16)|0;
                w = ((imul(al5, bh0)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah5, bh0)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r5 = (w << 16) | (u & 0xffff);

                u = ((imul(al5, bl1)|0) + (m & 0xffff)|0) + (r6 & 0xffff)|0;
                v = ((imul(ah5, bl1)|0) + (m >>> 16)|0) + (r6 >>> 16)|0;
                w = ((imul(al5, bh1)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah5, bh1)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r6 = (w << 16) | (u & 0xffff);

                u = ((imul(al5, bl2)|0) + (m & 0xffff)|0) + (r7 & 0xffff)|0;
                v = ((imul(ah5, bl2)|0) + (m >>> 16)|0) + (r7 >>> 16)|0;
                w = ((imul(al5, bh2)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah5, bh2)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r7 = (w << 16) | (u & 0xffff);

                u = ((imul(al5, bl3)|0) + (m & 0xffff)|0) + (r8 & 0xffff)|0;
                v = ((imul(ah5, bl3)|0) + (m >>> 16)|0) + (r8 >>> 16)|0;
                w = ((imul(al5, bh3)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah5, bh3)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r8 = (w << 16) | (u & 0xffff);

                u = ((imul(al5, bl4)|0) + (m & 0xffff)|0) + (r9 & 0xffff)|0;
                v = ((imul(ah5, bl4)|0) + (m >>> 16)|0) + (r9 >>> 16)|0;
                w = ((imul(al5, bh4)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah5, bh4)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r9 = (w << 16) | (u & 0xffff);

                u = ((imul(al5, bl5)|0) + (m & 0xffff)|0) + (r10 & 0xffff)|0;
                v = ((imul(ah5, bl5)|0) + (m >>> 16)|0) + (r10 >>> 16)|0;
                w = ((imul(al5, bh5)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah5, bh5)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r10 = (w << 16) | (u & 0xffff);

                u = ((imul(al5, bl6)|0) + (m & 0xffff)|0) + (r11 & 0xffff)|0;
                v = ((imul(ah5, bl6)|0) + (m >>> 16)|0) + (r11 >>> 16)|0;
                w = ((imul(al5, bh6)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah5, bh6)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r11 = (w << 16) | (u & 0xffff);

                u = ((imul(al5, bl7)|0) + (m & 0xffff)|0) + (r12 & 0xffff)|0;
                v = ((imul(ah5, bl7)|0) + (m >>> 16)|0) + (r12 >>> 16)|0;
                w = ((imul(al5, bh7)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah5, bh7)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r12 = (w << 16) | (u & 0xffff);

                r13 = m;

                u = ((imul(al6, bl0)|0) + (r14 & 0xffff)|0) + (r6 & 0xffff)|0;
                v = ((imul(ah6, bl0)|0) + (r14 >>> 16)|0) + (r6 >>> 16)|0;
                w = ((imul(al6, bh0)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah6, bh0)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r6 = (w << 16) | (u & 0xffff);

                u = ((imul(al6, bl1)|0) + (m & 0xffff)|0) + (r7 & 0xffff)|0;
                v = ((imul(ah6, bl1)|0) + (m >>> 16)|0) + (r7 >>> 16)|0;
                w = ((imul(al6, bh1)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah6, bh1)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r7 = (w << 16) | (u & 0xffff);

                u = ((imul(al6, bl2)|0) + (m & 0xffff)|0) + (r8 & 0xffff)|0;
                v = ((imul(ah6, bl2)|0) + (m >>> 16)|0) + (r8 >>> 16)|0;
                w = ((imul(al6, bh2)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah6, bh2)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r8 = (w << 16) | (u & 0xffff);

                u = ((imul(al6, bl3)|0) + (m & 0xffff)|0) + (r9 & 0xffff)|0;
                v = ((imul(ah6, bl3)|0) + (m >>> 16)|0) + (r9 >>> 16)|0;
                w = ((imul(al6, bh3)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah6, bh3)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r9 = (w << 16) | (u & 0xffff);

                u = ((imul(al6, bl4)|0) + (m & 0xffff)|0) + (r10 & 0xffff)|0;
                v = ((imul(ah6, bl4)|0) + (m >>> 16)|0) + (r10 >>> 16)|0;
                w = ((imul(al6, bh4)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah6, bh4)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r10 = (w << 16) | (u & 0xffff);

                u = ((imul(al6, bl5)|0) + (m & 0xffff)|0) + (r11 & 0xffff)|0;
                v = ((imul(ah6, bl5)|0) + (m >>> 16)|0) + (r11 >>> 16)|0;
                w = ((imul(al6, bh5)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah6, bh5)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r11 = (w << 16) | (u & 0xffff);

                u = ((imul(al6, bl6)|0) + (m & 0xffff)|0) + (r12 & 0xffff)|0;
                v = ((imul(ah6, bl6)|0) + (m >>> 16)|0) + (r12 >>> 16)|0;
                w = ((imul(al6, bh6)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah6, bh6)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r12 = (w << 16) | (u & 0xffff);

                u = ((imul(al6, bl7)|0) + (m & 0xffff)|0) + (r13 & 0xffff)|0;
                v = ((imul(ah6, bl7)|0) + (m >>> 16)|0) + (r13 >>> 16)|0;
                w = ((imul(al6, bh7)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah6, bh7)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r13 = (w << 16) | (u & 0xffff);

                r14 = m;

                u = ((imul(al7, bl0)|0) + (r15 & 0xffff)|0) + (r7 & 0xffff)|0;
                v = ((imul(ah7, bl0)|0) + (r15 >>> 16)|0) + (r7 >>> 16)|0;
                w = ((imul(al7, bh0)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah7, bh0)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r7 = (w << 16) | (u & 0xffff);

                u = ((imul(al7, bl1)|0) + (m & 0xffff)|0) + (r8 & 0xffff)|0;
                v = ((imul(ah7, bl1)|0) + (m >>> 16)|0) + (r8 >>> 16)|0;
                w = ((imul(al7, bh1)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah7, bh1)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r8 = (w << 16) | (u & 0xffff);

                u = ((imul(al7, bl2)|0) + (m & 0xffff)|0) + (r9 & 0xffff)|0;
                v = ((imul(ah7, bl2)|0) + (m >>> 16)|0) + (r9 >>> 16)|0;
                w = ((imul(al7, bh2)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah7, bh2)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r9 = (w << 16) | (u & 0xffff);

                u = ((imul(al7, bl3)|0) + (m & 0xffff)|0) + (r10 & 0xffff)|0;
                v = ((imul(ah7, bl3)|0) + (m >>> 16)|0) + (r10 >>> 16)|0;
                w = ((imul(al7, bh3)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah7, bh3)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r10 = (w << 16) | (u & 0xffff);

                u = ((imul(al7, bl4)|0) + (m & 0xffff)|0) + (r11 & 0xffff)|0;
                v = ((imul(ah7, bl4)|0) + (m >>> 16)|0) + (r11 >>> 16)|0;
                w = ((imul(al7, bh4)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah7, bh4)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r11 = (w << 16) | (u & 0xffff);

                u = ((imul(al7, bl5)|0) + (m & 0xffff)|0) + (r12 & 0xffff)|0;
                v = ((imul(ah7, bl5)|0) + (m >>> 16)|0) + (r12 >>> 16)|0;
                w = ((imul(al7, bh5)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah7, bh5)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r12 = (w << 16) | (u & 0xffff);

                u = ((imul(al7, bl6)|0) + (m & 0xffff)|0) + (r13 & 0xffff)|0;
                v = ((imul(ah7, bl6)|0) + (m >>> 16)|0) + (r13 >>> 16)|0;
                w = ((imul(al7, bh6)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah7, bh6)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r13 = (w << 16) | (u & 0xffff);

                u = ((imul(al7, bl7)|0) + (m & 0xffff)|0) + (r14 & 0xffff)|0;
                v = ((imul(ah7, bl7)|0) + (m >>> 16)|0) + (r14 >>> 16)|0;
                w = ((imul(al7, bh7)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah7, bh7)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r14 = (w << 16) | (u & 0xffff);

                r15 = m;

                HEAP32[(Rk|0)>>2] = r0,
                HEAP32[(Rk|4)>>2] = r1,
                HEAP32[(Rk|8)>>2] = r2,
                HEAP32[(Rk|12)>>2] = r3,
                HEAP32[(Rk|16)>>2] = r4,
                HEAP32[(Rk|20)>>2] = r5,
                HEAP32[(Rk|24)>>2] = r6,
                HEAP32[(Rk|28)>>2] = r7;
            }

            Rk = (R+(i+j|0))|0;
            HEAP32[(Rk|0)>>2] = r8,
            HEAP32[(Rk|4)>>2] = r9,
            HEAP32[(Rk|8)>>2] = r10,
            HEAP32[(Rk|12)>>2] = r11,
            HEAP32[(Rk|16)>>2] = r12,
            HEAP32[(Rk|20)>>2] = r13,
            HEAP32[(Rk|24)>>2] = r14,
            HEAP32[(Rk|28)>>2] = r15;
        }
/*
        for ( i = lA & -32; (i|0) < (lA|0); i = (i+4)|0 ) {
            Ai = (A+i)|0;

            ah0 = HEAP32[Ai>>2]|0,
            al0 = ah0 & 0xffff,
            ah0 = ah0 >>> 16;

            r1 = 0;

            for ( j = 0; (j|0) < (lB|0); j = (j+4)|0 ) {
                Bj = (B+j)|0;
                Rk = (R+(i+j|0))|0;

                bh0 = HEAP32[Bj>>2]|0,
                bl0 = bh0 & 0xffff,
                bh0 = bh0 >>> 16;

                r0 = HEAP32[Rk>>2]|0;

                u = ((imul(al0, bl0)|0) + (r1 & 0xffff)|0) + (r0 & 0xffff)|0;
                v = ((imul(ah0, bl0)|0) + (r1 >>> 16)|0) + (r0 >>> 16)|0;
                w = ((imul(al0, bh0)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                m = ((imul(ah0, bh0)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                r0 = (w << 16) | (u & 0xffff);

                r1 = m;

                HEAP32[Rk>>2] = r0;
            }

            Rk = (R+(i+j|0))|0;
            HEAP32[Rk>>2] = r1;
        }
*/
    }

    /**
     * Fast squaring
     *
     * Exploits the fact:
     *
     *  X^2 = ( X0 + X1*B )^2 = X0^2 + 2*X0*X1*B + X1^2*B^2,
     *
     * where B is a power of 2, so:
     *
     *  2*X0*X1*B = (X0*X1 << 1)*B
     *
     * @param A offset of the argument being squared, 32-byte aligned
     * @param lA length of the argument, multiple of 32
     *
     * @param R offset where to place the result to, 32-byte aligned
     */
    function sqr ( A, lA, R ) {
        A  =  A|0;
        lA = lA|0;
        R  =  R|0;

        var al0 = 0, al1 = 0, al2 = 0, al3 = 0, al4 = 0, al5 = 0, al6 = 0, al7 = 0, ah0 = 0, ah1 = 0, ah2 = 0, ah3 = 0, ah4 = 0, ah5 = 0, ah6 = 0, ah7 = 0,
            bl0 = 0, bl1 = 0, bl2 = 0, bl3 = 0, bl4 = 0, bl5 = 0, bl6 = 0, bl7 = 0, bh0 = 0, bh1 = 0, bh2 = 0, bh3 = 0, bh4 = 0, bh5 = 0, bh6 = 0, bh7 = 0,
            r0 = 0, r1 = 0, r2 = 0, r3 = 0, r4 = 0, r5 = 0, r6 = 0, r7 = 0, r8 = 0, r9 = 0, r10 = 0, r11 = 0, r12 = 0, r13 = 0, r14 = 0, r15 = 0,
            u = 0, v = 0, w = 0, c = 0, h = 0, m = 0, r = 0,
            d = 0, dd = 0, p = 0, i = 0, j = 0, k = 0, Ai = 0, Aj = 0, Rk = 0;

        // prepare for iterations
        for ( ; (i|0) < (lA|0); i = (i+4)|0 ) {
            Rk = R+(i<<1)|0;
            ah0 = HEAP32[(A+i)>>2]|0, al0 = ah0 & 0xffff, ah0 = ah0 >>> 16;
            u = imul(al0,al0)|0;
            v = (imul(al0,ah0)|0) + (u >>> 17)|0;
            w = (imul(ah0,ah0)|0) + (v >>> 15)|0;
            HEAP32[(Rk)>>2] = (v << 17) | (u & 0x1ffff);
            HEAP32[(Rk|4)>>2] = w;
        }

        // unrolled 1st iteration
        for ( p = 0; (p|0) < (lA|0); p = (p+8)|0 ) {
            Ai = A+p|0, Rk = R+(p<<1)|0;

            ah0 = HEAP32[(Ai)>>2]|0, al0 = ah0 & 0xffff, ah0 = ah0 >>> 16;

            bh0 = HEAP32[(Ai|4)>>2]|0, bl0 = bh0 & 0xffff, bh0 = bh0 >>> 16;

            u = imul(al0,bl0)|0;
            v = (imul(al0,bh0)|0) + (u >>> 16)|0;
            w = (imul(ah0,bl0)|0) + (v & 0xffff)|0;
            m = ((imul(ah0,bh0)|0) + (v >>> 16)|0) + (w >>> 16)|0;

            r = HEAP32[(Rk|4)>>2]|0;
            u = (r & 0xffff) + ((u & 0xffff) << 1)|0;
            w = ((r >>> 16) + ((w & 0xffff) << 1)|0) + (u >>> 16)|0;
            HEAP32[(Rk|4)>>2] = (w << 16) | (u & 0xffff);
            c = w >>> 16;

            r = HEAP32[(Rk|8)>>2]|0;
            u = ((r & 0xffff) + ((m & 0xffff) << 1)|0) + c|0;
            w = ((r >>> 16) + ((m >>> 16) << 1)|0) + (u >>> 16)|0;
            HEAP32[(Rk|8)>>2] = (w << 16) | (u & 0xffff);
            c = w >>> 16;

            if ( c ) {
                r = HEAP32[(Rk|12)>>2]|0;
                u = (r & 0xffff) + c|0;
                w = (r >>> 16) + (u >>> 16)|0;
                HEAP32[(Rk|12)>>2] = (w << 16) | (u & 0xffff);
            }
        }

        // unrolled 2nd iteration
        for ( p = 0; (p|0) < (lA|0); p = (p+16)|0 ) {
            Ai = A+p|0, Rk = R+(p<<1)|0;

            ah0 = HEAP32[(Ai)>>2]|0, al0 = ah0 & 0xffff, ah0 = ah0 >>> 16,
            ah1 = HEAP32[(Ai|4)>>2]|0, al1 = ah1 & 0xffff, ah1 = ah1 >>> 16;

            bh0 = HEAP32[(Ai|8)>>2]|0, bl0 = bh0 & 0xffff, bh0 = bh0 >>> 16,
            bh1 = HEAP32[(Ai|12)>>2]|0, bl1 = bh1 & 0xffff, bh1 = bh1 >>> 16;

            u = imul(al0, bl0)|0;
            v = imul(ah0, bl0)|0;
            w = ((imul(al0, bh0)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
            m = ((imul(ah0, bh0)|0) + (v >>> 16)|0) + (w >>> 16)|0;
            r0 = (w << 16) | (u & 0xffff);

            u = (imul(al0, bl1)|0) + (m & 0xffff)|0;
            v = (imul(ah0, bl1)|0) + (m >>> 16)|0;
            w = ((imul(al0, bh1)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
            m = ((imul(ah0, bh1)|0) + (v >>> 16)|0) + (w >>> 16)|0;
            r1 = (w << 16) | (u & 0xffff);

            r2 = m;

            u = (imul(al1, bl0)|0) + (r1 & 0xffff)|0;
            v = (imul(ah1, bl0)|0) + (r1 >>> 16)|0;
            w = ((imul(al1, bh0)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
            m = ((imul(ah1, bh0)|0) + (v >>> 16)|0) + (w >>> 16)|0;
            r1 = (w << 16) | (u & 0xffff);

            u = ((imul(al1, bl1)|0) + (r2 & 0xffff)|0) + (m & 0xffff)|0;
            v = ((imul(ah1, bl1)|0) + (r2 >>> 16)|0) + (m >>> 16)|0;
            w = ((imul(al1, bh1)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
            m = ((imul(ah1, bh1)|0) + (v >>> 16)|0) + (w >>> 16)|0;
            r2 = (w << 16) | (u & 0xffff);

            r3 = m;

            r = HEAP32[(Rk|8)>>2]|0;
            u = (r & 0xffff) + ((r0 & 0xffff) << 1)|0;
            w = ((r >>> 16) + ((r0 >>> 16) << 1)|0) + (u >>> 16)|0;
            HEAP32[(Rk|8)>>2] = (w << 16) | (u & 0xffff);
            c = w >>> 16;

            r = HEAP32[(Rk|12)>>2]|0;
            u = ((r & 0xffff) + ((r1 & 0xffff) << 1)|0)  + c|0;
            w = ((r >>> 16) + ((r1 >>> 16) << 1)|0) + (u >>> 16)|0;
            HEAP32[(Rk|12)>>2] = (w << 16) | (u & 0xffff);
            c = w >>> 16;

            r = HEAP32[(Rk|16)>>2]|0;
            u = ((r & 0xffff) + ((r2 & 0xffff) << 1)|0) + c|0;
            w = ((r >>> 16) + ((r2 >>> 16) << 1)|0) + (u >>> 16)|0;
            HEAP32[(Rk|16)>>2] = (w << 16) | (u & 0xffff);
            c = w >>> 16;

            r = HEAP32[(Rk|20)>>2]|0;
            u = ((r & 0xffff) + ((r3 & 0xffff) << 1)|0) + c|0;
            w = ((r >>> 16) + ((r3 >>> 16) << 1)|0) + (u >>> 16)|0;
            HEAP32[(Rk|20)>>2] = (w << 16) | (u & 0xffff);
            c = w >>> 16;

            for ( k = 24; !!c & ( (k|0) < 32 ); k = (k+4)|0 ) {
                r = HEAP32[(Rk|k)>>2]|0;
                u = (r & 0xffff) + c|0;
                w = (r >>> 16) + (u >>> 16)|0;
                HEAP32[(Rk|k)>>2] = (w << 16) | (u & 0xffff);
                c = w >>> 16;
            }
        }

        // unrolled 3rd iteration
        for ( p = 0; (p|0) < (lA|0); p = (p+32)|0 ) {
            Ai = A+p|0, Rk = R+(p<<1)|0;

            ah0 = HEAP32[(Ai)>>2]|0, al0 = ah0 & 0xffff, ah0 = ah0 >>> 16,
            ah1 = HEAP32[(Ai|4)>>2]|0, al1 = ah1 & 0xffff, ah1 = ah1 >>> 16,
            ah2 = HEAP32[(Ai|8)>>2]|0, al2 = ah2 & 0xffff, ah2 = ah2 >>> 16,
            ah3 = HEAP32[(Ai|12)>>2]|0, al3 = ah3 & 0xffff, ah3 = ah3 >>> 16;

            bh0 = HEAP32[(Ai|16)>>2]|0, bl0 = bh0 & 0xffff, bh0 = bh0 >>> 16,
            bh1 = HEAP32[(Ai|20)>>2]|0, bl1 = bh1 & 0xffff, bh1 = bh1 >>> 16,
            bh2 = HEAP32[(Ai|24)>>2]|0, bl2 = bh2 & 0xffff, bh2 = bh2 >>> 16,
            bh3 = HEAP32[(Ai|28)>>2]|0, bl3 = bh3 & 0xffff, bh3 = bh3 >>> 16;

            u = imul(al0, bl0)|0;
            v = imul(ah0, bl0)|0;
            w = ((imul(al0, bh0)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
            m = ((imul(ah0, bh0)|0) + (v >>> 16)|0) + (w >>> 16)|0;
            r0 = (w << 16) | (u & 0xffff);

            u = (imul(al0, bl1)|0) + (m & 0xffff)|0;
            v = (imul(ah0, bl1)|0) + (m >>> 16)|0;
            w = ((imul(al0, bh1)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
            m = ((imul(ah0, bh1)|0) + (v >>> 16)|0) + (w >>> 16)|0;
            r1 = (w << 16) | (u & 0xffff);

            u = (imul(al0, bl2)|0) + (m & 0xffff)|0;
            v = (imul(ah0, bl2)|0) + (m >>> 16)|0;
            w = ((imul(al0, bh2)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
            m = ((imul(ah0, bh2)|0) + (v >>> 16)|0) + (w >>> 16)|0;
            r2 = (w << 16) | (u & 0xffff);

            u = (imul(al0, bl3)|0) + (m & 0xffff)|0;
            v = (imul(ah0, bl3)|0) + (m >>> 16)|0;
            w = ((imul(al0, bh3)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
            m = ((imul(ah0, bh3)|0) + (v >>> 16)|0) + (w >>> 16)|0;
            r3 = (w << 16) | (u & 0xffff);

            r4 = m;

            u = (imul(al1, bl0)|0) + (r1 & 0xffff)|0;
            v = (imul(ah1, bl0)|0) + (r1 >>> 16)|0;
            w = ((imul(al1, bh0)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
            m = ((imul(ah1, bh0)|0) + (v >>> 16)|0) + (w >>> 16)|0;
            r1 = (w << 16) | (u & 0xffff);

            u = ((imul(al1, bl1)|0) + (r2 & 0xffff)|0) + (m & 0xffff)|0;
            v = ((imul(ah1, bl1)|0) + (r2 >>> 16)|0) + (m >>> 16)|0;
            w = ((imul(al1, bh1)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
            m = ((imul(ah1, bh1)|0) + (v >>> 16)|0) + (w >>> 16)|0;
            r2 = (w << 16) | (u & 0xffff);

            u = ((imul(al1, bl2)|0) + (r3 & 0xffff)|0) + (m & 0xffff)|0;
            v = ((imul(ah1, bl2)|0) + (r3 >>> 16)|0) + (m >>> 16)|0;
            w = ((imul(al1, bh2)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
            m = ((imul(ah1, bh2)|0) + (v >>> 16)|0) + (w >>> 16)|0;
            r3 = (w << 16) | (u & 0xffff);

            u = ((imul(al1, bl3)|0) + (r4 & 0xffff)|0) + (m & 0xffff)|0;
            v = ((imul(ah1, bl3)|0) + (r4 >>> 16)|0) + (m >>> 16)|0;
            w = ((imul(al1, bh3)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
            m = ((imul(ah1, bh3)|0) + (v >>> 16)|0) + (w >>> 16)|0;
            r4 = (w << 16) | (u & 0xffff);

            r5 = m;

            u = (imul(al2, bl0)|0) + (r2 & 0xffff)|0;
            v = (imul(ah2, bl0)|0) + (r2 >>> 16)|0;
            w = ((imul(al2, bh0)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
            m = ((imul(ah2, bh0)|0) + (v >>> 16)|0) + (w >>> 16)|0;
            r2 = (w << 16) | (u & 0xffff);

            u = ((imul(al2, bl1)|0) + (r3 & 0xffff)|0) + (m & 0xffff)|0;
            v = ((imul(ah2, bl1)|0) + (r3 >>> 16)|0) + (m >>> 16)|0;
            w = ((imul(al2, bh1)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
            m = ((imul(ah2, bh1)|0) + (v >>> 16)|0) + (w >>> 16)|0;
            r3 = (w << 16) | (u & 0xffff);

            u = ((imul(al2, bl2)|0) + (r4 & 0xffff)|0) + (m & 0xffff)|0;
            v = ((imul(ah2, bl2)|0) + (r4 >>> 16)|0) + (m >>> 16)|0;
            w = ((imul(al2, bh2)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
            m = ((imul(ah2, bh2)|0) + (v >>> 16)|0) + (w >>> 16)|0;
            r4 = (w << 16) | (u & 0xffff);

            u = ((imul(al2, bl3)|0) + (r5 & 0xffff)|0) + (m & 0xffff)|0;
            v = ((imul(ah2, bl3)|0) + (r5 >>> 16)|0) + (m >>> 16)|0;
            w = ((imul(al2, bh3)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
            m = ((imul(ah2, bh3)|0) + (v >>> 16)|0) + (w >>> 16)|0;
            r5 = (w << 16) | (u & 0xffff);

            r6 = m;

            u = (imul(al3, bl0)|0) + (r3 & 0xffff)|0;
            v = (imul(ah3, bl0)|0) + (r3 >>> 16)|0;
            w = ((imul(al3, bh0)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
            m = ((imul(ah3, bh0)|0) + (v >>> 16)|0) + (w >>> 16)|0;
            r3 = (w << 16) | (u & 0xffff);

            u = ((imul(al3, bl1)|0) + (r4 & 0xffff)|0) + (m & 0xffff)|0;
            v = ((imul(ah3, bl1)|0) + (r4 >>> 16)|0) + (m >>> 16)|0;
            w = ((imul(al3, bh1)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
            m = ((imul(ah3, bh1)|0) + (v >>> 16)|0) + (w >>> 16)|0;
            r4 = (w << 16) | (u & 0xffff);

            u = ((imul(al3, bl2)|0) + (r5 & 0xffff)|0) + (m & 0xffff)|0;
            v = ((imul(ah3, bl2)|0) + (r5 >>> 16)|0) + (m >>> 16)|0;
            w = ((imul(al3, bh2)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
            m = ((imul(ah3, bh2)|0) + (v >>> 16)|0) + (w >>> 16)|0;
            r5 = (w << 16) | (u & 0xffff);

            u = ((imul(al3, bl3)|0) + (r6 & 0xffff)|0) + (m & 0xffff)|0;
            v = ((imul(ah3, bl3)|0) + (r6 >>> 16)|0) + (m >>> 16)|0;
            w = ((imul(al3, bh3)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
            m = ((imul(ah3, bh3)|0) + (v >>> 16)|0) + (w >>> 16)|0;
            r6 = (w << 16) | (u & 0xffff);

            r7 = m;

            r = HEAP32[(Rk|16)>>2]|0;
            u = (r & 0xffff) + ((r0 & 0xffff) << 1)|0;
            w = ((r >>> 16) + ((r0 >>> 16) << 1)|0) + (u >>> 16)|0;
            HEAP32[(Rk|16)>>2] = (w << 16) | (u & 0xffff);
            c = w >>> 16;

            r = HEAP32[(Rk|20)>>2]|0;
            u = ((r & 0xffff) + ((r1 & 0xffff) << 1)|0)  + c|0;
            w = ((r >>> 16) + ((r1 >>> 16) << 1)|0) + (u >>> 16)|0;
            HEAP32[(Rk|20)>>2] = (w << 16) | (u & 0xffff);
            c = w >>> 16;

            r = HEAP32[(Rk|24)>>2]|0;
            u = ((r & 0xffff) + ((r2 & 0xffff) << 1)|0) + c|0;
            w = ((r >>> 16) + ((r2 >>> 16) << 1)|0) + (u >>> 16)|0;
            HEAP32[(Rk|24)>>2] = (w << 16) | (u & 0xffff);
            c = w >>> 16;

            r = HEAP32[(Rk|28)>>2]|0;
            u = ((r & 0xffff) + ((r3 & 0xffff) << 1)|0) + c|0;
            w = ((r >>> 16) + ((r3 >>> 16) << 1)|0) + (u >>> 16)|0;
            HEAP32[(Rk|28)>>2] = (w << 16) | (u & 0xffff);
            c = w >>> 16;

            r = HEAP32[(Rk+32)>>2]|0;
            u = ((r & 0xffff) + ((r4 & 0xffff) << 1)|0) + c|0;
            w = ((r >>> 16) + ((r4 >>> 16) << 1)|0) + (u >>> 16)|0;
            HEAP32[(Rk+32)>>2] = (w << 16) | (u & 0xffff);
            c = w >>> 16;

            r = HEAP32[(Rk+36)>>2]|0;
            u = ((r & 0xffff) + ((r5 & 0xffff) << 1)|0) + c|0;
            w = ((r >>> 16) + ((r5 >>> 16) << 1)|0) + (u >>> 16)|0;
            HEAP32[(Rk+36)>>2] = (w << 16) | (u & 0xffff);
            c = w >>> 16;

            r = HEAP32[(Rk+40)>>2]|0;
            u = ((r & 0xffff) + ((r6 & 0xffff) << 1)|0) + c|0;
            w = ((r >>> 16) + ((r6 >>> 16) << 1)|0) + (u >>> 16)|0;
            HEAP32[(Rk+40)>>2] = (w << 16) | (u & 0xffff);
            c = w >>> 16;

            r = HEAP32[(Rk+44)>>2]|0;
            u = ((r & 0xffff) + ((r7 & 0xffff) << 1)|0) + c|0;
            w = ((r >>> 16) + ((r7 >>> 16) << 1)|0) + (u >>> 16)|0;
            HEAP32[(Rk+44)>>2] = (w << 16) | (u & 0xffff);
            c = w >>> 16;

            for ( k = 48; !!c & ( (k|0) < 64 ); k = (k+4)|0 ) {
                r = HEAP32[(Rk+k)>>2]|0;
                u = (r & 0xffff) + c|0;
                w = (r >>> 16) + (u >>> 16)|0;
                HEAP32[(Rk+k)>>2] = (w << 16) | (u & 0xffff);
                c = w >>> 16;
            }
        }

        // perform iterations
        for ( d = 32; (d|0) < (lA|0); d = d << 1 ) { // depth loop
            dd = d << 1;

            for ( p = 0; (p|0) < (lA|0); p = (p+dd)|0 ) { // part loop
                Rk = R+(p<<1)|0;

                h = 0;
                for ( i = 0; (i|0) < (d|0); i = (i+32)|0 ) { // multiply-and-add loop
                    Ai = (A+p|0)+i|0;

                    ah0 = HEAP32[(Ai)>>2]|0, al0 = ah0 & 0xffff, ah0 = ah0 >>> 16,
                    ah1 = HEAP32[(Ai|4)>>2]|0, al1 = ah1 & 0xffff, ah1 = ah1 >>> 16,
                    ah2 = HEAP32[(Ai|8)>>2]|0, al2 = ah2 & 0xffff, ah2 = ah2 >>> 16,
                    ah3 = HEAP32[(Ai|12)>>2]|0, al3 = ah3 & 0xffff, ah3 = ah3 >>> 16,
                    ah4 = HEAP32[(Ai|16)>>2]|0, al4 = ah4 & 0xffff, ah4 = ah4 >>> 16,
                    ah5 = HEAP32[(Ai|20)>>2]|0, al5 = ah5 & 0xffff, ah5 = ah5 >>> 16,
                    ah6 = HEAP32[(Ai|24)>>2]|0, al6 = ah6 & 0xffff, ah6 = ah6 >>> 16,
                    ah7 = HEAP32[(Ai|28)>>2]|0, al7 = ah7 & 0xffff, ah7 = ah7 >>> 16;

                    r8 = r9 = r10 = r11 = r12 = r13 = r14 = r15 = c = 0;

                    for ( j = 0; (j|0) < (d|0); j = (j+32)|0 ) {
                        Aj = ((A+p|0)+d|0)+j|0;

                        bh0 = HEAP32[(Aj)>>2]|0, bl0 = bh0 & 0xffff, bh0 = bh0 >>> 16,
                        bh1 = HEAP32[(Aj|4)>>2]|0, bl1 = bh1 & 0xffff, bh1 = bh1 >>> 16,
                        bh2 = HEAP32[(Aj|8)>>2]|0, bl2 = bh2 & 0xffff, bh2 = bh2 >>> 16,
                        bh3 = HEAP32[(Aj|12)>>2]|0, bl3 = bh3 & 0xffff, bh3 = bh3 >>> 16,
                        bh4 = HEAP32[(Aj|16)>>2]|0, bl4 = bh4 & 0xffff, bh4 = bh4 >>> 16,
                        bh5 = HEAP32[(Aj|20)>>2]|0, bl5 = bh5 & 0xffff, bh5 = bh5 >>> 16,
                        bh6 = HEAP32[(Aj|24)>>2]|0, bl6 = bh6 & 0xffff, bh6 = bh6 >>> 16,
                        bh7 = HEAP32[(Aj|28)>>2]|0, bl7 = bh7 & 0xffff, bh7 = bh7 >>> 16;

                        r0 = r1 = r2 = r3 = r4 = r5 = r6 = r7 = 0;

                        u = ((imul(al0, bl0)|0) + (r0 & 0xffff)|0) + (r8 & 0xffff)|0;
                        v = ((imul(ah0, bl0)|0) + (r0 >>> 16)|0) + (r8 >>> 16)|0;
                        w = ((imul(al0, bh0)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah0, bh0)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r0 = (w << 16) | (u & 0xffff);

                        u = ((imul(al0, bl1)|0) + (r1 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah0, bl1)|0) + (r1 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al0, bh1)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah0, bh1)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r1 = (w << 16) | (u & 0xffff);

                        u = ((imul(al0, bl2)|0) + (r2 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah0, bl2)|0) + (r2 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al0, bh2)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah0, bh2)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r2 = (w << 16) | (u & 0xffff);

                        u = ((imul(al0, bl3)|0) + (r3 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah0, bl3)|0) + (r3 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al0, bh3)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah0, bh3)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r3 = (w << 16) | (u & 0xffff);

                        u = ((imul(al0, bl4)|0) + (r4 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah0, bl4)|0) + (r4 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al0, bh4)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah0, bh4)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r4 = (w << 16) | (u & 0xffff);

                        u = ((imul(al0, bl5)|0) + (r5 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah0, bl5)|0) + (r5 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al0, bh5)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah0, bh5)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r5 = (w << 16) | (u & 0xffff);

                        u = ((imul(al0, bl6)|0) + (r6 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah0, bl6)|0) + (r6 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al0, bh6)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah0, bh6)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r6 = (w << 16) | (u & 0xffff);

                        u = ((imul(al0, bl7)|0) + (r7 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah0, bl7)|0) + (r7 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al0, bh7)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah0, bh7)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r7 = (w << 16) | (u & 0xffff);

                        r8 = m;

                        u = ((imul(al1, bl0)|0) + (r1 & 0xffff)|0) + (r9 & 0xffff)|0;
                        v = ((imul(ah1, bl0)|0) + (r1 >>> 16)|0) + (r9 >>> 16)|0;
                        w = ((imul(al1, bh0)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah1, bh0)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r1 = (w << 16) | (u & 0xffff);

                        u = ((imul(al1, bl1)|0) + (r2 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah1, bl1)|0) + (r2 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al1, bh1)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah1, bh1)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r2 = (w << 16) | (u & 0xffff);

                        u = ((imul(al1, bl2)|0) + (r3 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah1, bl2)|0) + (r3 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al1, bh2)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah1, bh2)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r3 = (w << 16) | (u & 0xffff);

                        u = ((imul(al1, bl3)|0) + (r4 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah1, bl3)|0) + (r4 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al1, bh3)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah1, bh3)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r4 = (w << 16) | (u & 0xffff);

                        u = ((imul(al1, bl4)|0) + (r5 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah1, bl4)|0) + (r5 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al1, bh4)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah1, bh4)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r5 = (w << 16) | (u & 0xffff);

                        u = ((imul(al1, bl5)|0) + (r6 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah1, bl5)|0) + (r6 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al1, bh5)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah1, bh5)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r6 = (w << 16) | (u & 0xffff);

                        u = ((imul(al1, bl6)|0) + (r7 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah1, bl6)|0) + (r7 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al1, bh6)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah1, bh6)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r7 = (w << 16) | (u & 0xffff);

                        u = ((imul(al1, bl7)|0) + (r8 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah1, bl7)|0) + (r8 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al1, bh7)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah1, bh7)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r8 = (w << 16) | (u & 0xffff);

                        r9 = m;

                        u = ((imul(al2, bl0)|0) + (r2 & 0xffff)|0) + (r10 & 0xffff)|0;
                        v = ((imul(ah2, bl0)|0) + (r2 >>> 16)|0) + (r10 >>> 16)|0;
                        w = ((imul(al2, bh0)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah2, bh0)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r2 = (w << 16) | (u & 0xffff);

                        u = ((imul(al2, bl1)|0) + (r3 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah2, bl1)|0) + (r3 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al2, bh1)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah2, bh1)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r3 = (w << 16) | (u & 0xffff);

                        u = ((imul(al2, bl2)|0) + (r4 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah2, bl2)|0) + (r4 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al2, bh2)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah2, bh2)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r4 = (w << 16) | (u & 0xffff);

                        u = ((imul(al2, bl3)|0) + (r5 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah2, bl3)|0) + (r5 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al2, bh3)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah2, bh3)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r5 = (w << 16) | (u & 0xffff);

                        u = ((imul(al2, bl4)|0) + (r6 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah2, bl4)|0) + (r6 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al2, bh4)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah2, bh4)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r6 = (w << 16) | (u & 0xffff);

                        u = ((imul(al2, bl5)|0) + (r7 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah2, bl5)|0) + (r7 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al2, bh5)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah2, bh5)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r7 = (w << 16) | (u & 0xffff);

                        u = ((imul(al2, bl6)|0) + (r8 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah2, bl6)|0) + (r8 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al2, bh6)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah2, bh6)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r8 = (w << 16) | (u & 0xffff);

                        u = ((imul(al2, bl7)|0) + (r9 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah2, bl7)|0) + (r9 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al2, bh7)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah2, bh7)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r9 = (w << 16) | (u & 0xffff);

                        r10 = m;

                        u = ((imul(al3, bl0)|0) + (r3 & 0xffff)|0) + (r11 & 0xffff)|0;
                        v = ((imul(ah3, bl0)|0) + (r3 >>> 16)|0) + (r11 >>> 16)|0;
                        w = ((imul(al3, bh0)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah3, bh0)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r3 = (w << 16) | (u & 0xffff);

                        u = ((imul(al3, bl1)|0) + (r4 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah3, bl1)|0) + (r4 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al3, bh1)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah3, bh1)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r4 = (w << 16) | (u & 0xffff);

                        u = ((imul(al3, bl2)|0) + (r5 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah3, bl2)|0) + (r5 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al3, bh2)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah3, bh2)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r5 = (w << 16) | (u & 0xffff);

                        u = ((imul(al3, bl3)|0) + (r6 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah3, bl3)|0) + (r6 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al3, bh3)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah3, bh3)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r6 = (w << 16) | (u & 0xffff);

                        u = ((imul(al3, bl4)|0) + (r7 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah3, bl4)|0) + (r7 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al3, bh4)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah3, bh4)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r7 = (w << 16) | (u & 0xffff);

                        u = ((imul(al3, bl5)|0) + (r8 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah3, bl5)|0) + (r8 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al3, bh5)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah3, bh5)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r8 = (w << 16) | (u & 0xffff);

                        u = ((imul(al3, bl6)|0) + (r9 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah3, bl6)|0) + (r9 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al3, bh6)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah3, bh6)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r9 = (w << 16) | (u & 0xffff);

                        u = ((imul(al3, bl7)|0) + (r10 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah3, bl7)|0) + (r10 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al3, bh7)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah3, bh7)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r10 = (w << 16) | (u & 0xffff);

                        r11 = m;

                        u = ((imul(al4, bl0)|0) + (r4 & 0xffff)|0) + (r12 & 0xffff)|0;
                        v = ((imul(ah4, bl0)|0) + (r4 >>> 16)|0) + (r12 >>> 16)|0;
                        w = ((imul(al4, bh0)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah4, bh0)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r4 = (w << 16) | (u & 0xffff);

                        u = ((imul(al4, bl1)|0) + (r5 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah4, bl1)|0) + (r5 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al4, bh1)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah4, bh1)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r5 = (w << 16) | (u & 0xffff);

                        u = ((imul(al4, bl2)|0) + (r6 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah4, bl2)|0) + (r6 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al4, bh2)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah4, bh2)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r6 = (w << 16) | (u & 0xffff);

                        u = ((imul(al4, bl3)|0) + (r7 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah4, bl3)|0) + (r7 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al4, bh3)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah4, bh3)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r7 = (w << 16) | (u & 0xffff);

                        u = ((imul(al4, bl4)|0) + (r8 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah4, bl4)|0) + (r8 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al4, bh4)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah4, bh4)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r8 = (w << 16) | (u & 0xffff);

                        u = ((imul(al4, bl5)|0) + (r9 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah4, bl5)|0) + (r9 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al4, bh5)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah4, bh5)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r9 = (w << 16) | (u & 0xffff);

                        u = ((imul(al4, bl6)|0) + (r10 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah4, bl6)|0) + (r10 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al4, bh6)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah4, bh6)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r10 = (w << 16) | (u & 0xffff);

                        u = ((imul(al4, bl7)|0) + (r11 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah4, bl7)|0) + (r11 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al4, bh7)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah4, bh7)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r11 = (w << 16) | (u & 0xffff);

                        r12 = m;

                        u = ((imul(al5, bl0)|0) + (r5 & 0xffff)|0) + (r13 & 0xffff)|0;
                        v = ((imul(ah5, bl0)|0) + (r5 >>> 16)|0) + (r13 >>> 16)|0;
                        w = ((imul(al5, bh0)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah5, bh0)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r5 = (w << 16) | (u & 0xffff);

                        u = ((imul(al5, bl1)|0) + (r6 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah5, bl1)|0) + (r6 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al5, bh1)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah5, bh1)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r6 = (w << 16) | (u & 0xffff);

                        u = ((imul(al5, bl2)|0) + (r7 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah5, bl2)|0) + (r7 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al5, bh2)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah5, bh2)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r7 = (w << 16) | (u & 0xffff);

                        u = ((imul(al5, bl3)|0) + (r8 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah5, bl3)|0) + (r8 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al5, bh3)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah5, bh3)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r8 = (w << 16) | (u & 0xffff);

                        u = ((imul(al5, bl4)|0) + (r9 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah5, bl4)|0) + (r9 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al5, bh4)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah5, bh4)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r9 = (w << 16) | (u & 0xffff);

                        u = ((imul(al5, bl5)|0) + (r10 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah5, bl5)|0) + (r10 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al5, bh5)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah5, bh5)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r10 = (w << 16) | (u & 0xffff);

                        u = ((imul(al5, bl6)|0) + (r11 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah5, bl6)|0) + (r11 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al5, bh6)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah5, bh6)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r11 = (w << 16) | (u & 0xffff);

                        u = ((imul(al5, bl7)|0) + (r12 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah5, bl7)|0) + (r12 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al5, bh7)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah5, bh7)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r12 = (w << 16) | (u & 0xffff);

                        r13 = m;

                        u = ((imul(al6, bl0)|0) + (r6 & 0xffff)|0) + (r14 & 0xffff)|0;
                        v = ((imul(ah6, bl0)|0) + (r6 >>> 16)|0) + (r14 >>> 16)|0;
                        w = ((imul(al6, bh0)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah6, bh0)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r6 = (w << 16) | (u & 0xffff);

                        u = ((imul(al6, bl1)|0) + (r7 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah6, bl1)|0) + (r7 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al6, bh1)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah6, bh1)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r7 = (w << 16) | (u & 0xffff);

                        u = ((imul(al6, bl2)|0) + (r8 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah6, bl2)|0) + (r8 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al6, bh2)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah6, bh2)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r8 = (w << 16) | (u & 0xffff);

                        u = ((imul(al6, bl3)|0) + (r9 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah6, bl3)|0) + (r9 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al6, bh3)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah6, bh3)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r9 = (w << 16) | (u & 0xffff);

                        u = ((imul(al6, bl4)|0) + (r10 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah6, bl4)|0) + (r10 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al6, bh4)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah6, bh4)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r10 = (w << 16) | (u & 0xffff);

                        u = ((imul(al6, bl5)|0) + (r11 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah6, bl5)|0) + (r11 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al6, bh5)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah6, bh5)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r11 = (w << 16) | (u & 0xffff);

                        u = ((imul(al6, bl6)|0) + (r12 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah6, bl6)|0) + (r12 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al6, bh6)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah6, bh6)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r12 = (w << 16) | (u & 0xffff);

                        u = ((imul(al6, bl7)|0) + (r13 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah6, bl7)|0) + (r13 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al6, bh7)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah6, bh7)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r13 = (w << 16) | (u & 0xffff);

                        r14 = m;

                        u = ((imul(al7, bl0)|0) + (r7 & 0xffff)|0) + (r15 & 0xffff)|0;
                        v = ((imul(ah7, bl0)|0) + (r7 >>> 16)|0) + (r15 >>> 16)|0;
                        w = ((imul(al7, bh0)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah7, bh0)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r7 = (w << 16) | (u & 0xffff);

                        u = ((imul(al7, bl1)|0) + (r8 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah7, bl1)|0) + (r8 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al7, bh1)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah7, bh1)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r8 = (w << 16) | (u & 0xffff);

                        u = ((imul(al7, bl2)|0) + (r9 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah7, bl2)|0) + (r9 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al7, bh2)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah7, bh2)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r9 = (w << 16) | (u & 0xffff);

                        u = ((imul(al7, bl3)|0) + (r10 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah7, bl3)|0) + (r10 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al7, bh3)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah7, bh3)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r10 = (w << 16) | (u & 0xffff);

                        u = ((imul(al7, bl4)|0) + (r11 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah7, bl4)|0) + (r11 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al7, bh4)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah7, bh4)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r11 = (w << 16) | (u & 0xffff);

                        u = ((imul(al7, bl5)|0) + (r12 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah7, bl5)|0) + (r12 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al7, bh5)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah7, bh5)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r12 = (w << 16) | (u & 0xffff);

                        u = ((imul(al7, bl6)|0) + (r13 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah7, bl6)|0) + (r13 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al7, bh6)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah7, bh6)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r13 = (w << 16) | (u & 0xffff);

                        u = ((imul(al7, bl7)|0) + (r14 & 0xffff)|0) + (m & 0xffff)|0;
                        v = ((imul(ah7, bl7)|0) + (r14 >>> 16)|0) + (m >>> 16)|0;
                        w = ((imul(al7, bh7)|0) + (v & 0xffff)|0) + (u >>> 16)|0;
                        m = ((imul(ah7, bh7)|0) + (v >>> 16)|0) + (w >>> 16)|0;
                        r14 = (w << 16) | (u & 0xffff);

                        r15 = m;

                        k = d+(i+j|0)|0;
                        r = HEAP32[(Rk+k)>>2]|0;
                        u = ((r & 0xffff) + ((r0 & 0xffff) << 1)|0) + c|0;
                        w = ((r >>> 16) + ((r0 >>> 16) << 1)|0) + (u >>> 16)|0;
                        HEAP32[(Rk+k)>>2] = (w << 16) | (u & 0xffff);
                        c = w >>> 16;

                        k = k+4|0;
                        r = HEAP32[(Rk+k)>>2]|0;
                        u = ((r & 0xffff) + ((r1 & 0xffff) << 1)|0) + c|0;
                        w = ((r >>> 16) + ((r1 >>> 16) << 1)|0) + (u >>> 16)|0;
                        HEAP32[(Rk+k)>>2] = (w << 16) | (u & 0xffff);
                        c = w >>> 16;

                        k = k+4|0;
                        r = HEAP32[(Rk+k)>>2]|0;
                        u = ((r & 0xffff) + ((r2 & 0xffff) << 1)|0) + c|0;
                        w = ((r >>> 16) + ((r2 >>> 16) << 1)|0) + (u >>> 16)|0;
                        HEAP32[(Rk+k)>>2] = (w << 16) | (u & 0xffff);
                        c = w >>> 16;

                        k = k+4|0;
                        r = HEAP32[(Rk+k)>>2]|0;
                        u = ((r & 0xffff) + ((r3 & 0xffff) << 1)|0) + c|0;
                        w = ((r >>> 16) + ((r3 >>> 16) << 1)|0) + (u >>> 16)|0;
                        HEAP32[(Rk+k)>>2] = (w << 16) | (u & 0xffff);
                        c = w >>> 16;

                        k = k+4|0;
                        r = HEAP32[(Rk+k)>>2]|0;
                        u = ((r & 0xffff) + ((r4 & 0xffff) << 1)|0) + c|0;
                        w = ((r >>> 16) + ((r4 >>> 16) << 1)|0) + (u >>> 16)|0;
                        HEAP32[(Rk+k)>>2] = (w << 16) | (u & 0xffff);
                        c = w >>> 16;

                        k = k+4|0;
                        r = HEAP32[(Rk+k)>>2]|0;
                        u = ((r & 0xffff) + ((r5 & 0xffff) << 1)|0) + c|0;
                        w = ((r >>> 16) + ((r5 >>> 16) << 1)|0) + (u >>> 16)|0;
                        HEAP32[(Rk+k)>>2] = (w << 16) | (u & 0xffff);
                        c = w >>> 16;

                        k = k+4|0;
                        r = HEAP32[(Rk+k)>>2]|0;
                        u = ((r & 0xffff) + ((r6 & 0xffff) << 1)|0) + c|0;
                        w = ((r >>> 16) + ((r6 >>> 16) << 1)|0) + (u >>> 16)|0;
                        HEAP32[(Rk+k)>>2] = (w << 16) | (u & 0xffff);
                        c = w >>> 16;

                        k = k+4|0;
                        r = HEAP32[(Rk+k)>>2]|0;
                        u = ((r & 0xffff) + ((r7 & 0xffff) << 1)|0) + c|0;
                        w = ((r >>> 16) + ((r7 >>> 16) << 1)|0) + (u >>> 16)|0;
                        HEAP32[(Rk+k)>>2] = (w << 16) | (u & 0xffff);
                        c = w >>> 16;
                    }

                    k = d+(i+j|0)|0;
                    r = HEAP32[(Rk+k)>>2]|0;
                    u = (((r & 0xffff) + ((r8 & 0xffff) << 1)|0) + c|0) + h|0;
                    w = ((r >>> 16) + ((r8 >>> 16) << 1)|0) + (u >>> 16)|0;
                    HEAP32[(Rk+k)>>2] = (w << 16) | (u & 0xffff);
                    c = w >>> 16;

                    k = k+4|0;
                    r = HEAP32[(Rk+k)>>2]|0;
                    u = ((r & 0xffff) + ((r9 & 0xffff) << 1)|0) + c|0;
                    w = ((r >>> 16) + ((r9 >>> 16) << 1)|0) + (u >>> 16)|0;
                    HEAP32[(Rk+k)>>2] = (w << 16) | (u & 0xffff);
                    c = w >>> 16;

                    k = k+4|0;
                    r = HEAP32[(Rk+k)>>2]|0;
                    u = ((r & 0xffff) + ((r10 & 0xffff) << 1)|0) + c|0;
                    w = ((r >>> 16) + ((r10 >>> 16) << 1)|0) + (u >>> 16)|0;
                    HEAP32[(Rk+k)>>2] = (w << 16) | (u & 0xffff);
                    c = w >>> 16;

                    k = k+4|0;
                    r = HEAP32[(Rk+k)>>2]|0;
                    u = ((r & 0xffff) + ((r11 & 0xffff) << 1)|0) + c|0;
                    w = ((r >>> 16) + ((r11 >>> 16) << 1)|0) + (u >>> 16)|0;
                    HEAP32[(Rk+k)>>2] = (w << 16) | (u & 0xffff);
                    c = w >>> 16;

                    k = k+4|0;
                    r = HEAP32[(Rk+k)>>2]|0;
                    u = ((r & 0xffff) + ((r12 & 0xffff) << 1)|0) + c|0;
                    w = ((r >>> 16) + ((r12 >>> 16) << 1)|0) + (u >>> 16)|0;
                    HEAP32[(Rk+k)>>2] = (w << 16) | (u & 0xffff);
                    c = w >>> 16;

                    k = k+4|0;
                    r = HEAP32[(Rk+k)>>2]|0;
                    u = ((r & 0xffff) + ((r13 & 0xffff) << 1)|0) + c|0;
                    w = ((r >>> 16) + ((r13 >>> 16) << 1)|0) + (u >>> 16)|0;
                    HEAP32[(Rk+k)>>2] = (w << 16) | (u & 0xffff);
                    c = w >>> 16;

                    k = k+4|0;
                    r = HEAP32[(Rk+k)>>2]|0;
                    u = ((r & 0xffff) + ((r14 & 0xffff) << 1)|0) + c|0;
                    w = ((r >>> 16) + ((r14 >>> 16) << 1)|0) + (u >>> 16)|0;
                    HEAP32[(Rk+k)>>2] = (w << 16) | (u & 0xffff);
                    c = w >>> 16;

                    k = k+4|0;
                    r = HEAP32[(Rk+k)>>2]|0;
                    u = ((r & 0xffff) + ((r15 & 0xffff) << 1)|0) + c|0;
                    w = ((r >>> 16) + ((r15 >>> 16) << 1)|0) + (u >>> 16)|0;
                    HEAP32[(Rk+k)>>2] = (w << 16) | (u & 0xffff);
                    h = w >>> 16;
                }

                for ( k = k+4|0; !!h & ( (k|0) < (dd<<1) ); k = (k+4)|0 ) { // carry propagation loop
                    r = HEAP32[(Rk+k)>>2]|0;
                    u = (r & 0xffff) + h|0;
                    w = (r >>> 16) + (u >>> 16)|0;
                    HEAP32[(Rk+k)>>2] = (w << 16) | (u & 0xffff);
                    h = w >>> 16;
                }
            }
        }
    }

    /**
     * Conventional division
     *
     * @param A offset of the numerator, 32-byte aligned
     * @param lA length of the numerator, multiple of 32
     *
     * @param B offset of the divisor, 32-byte aligned
     * @param lB length of the divisor, multiple of 32
     *
     * @param R offset where to place the remainder to, 32-byte aligned
     *
     * @param Q offser where to place the quotient to, 32-byte aligned
     */

    function div ( N, lN, D, lD, Q ) {
        N  =  N|0;
        lN = lN|0
        D  =  D|0;
        lD = lD|0
        Q  =  Q|0;

        var n = 0, d = 0, e = 0,
            u1 = 0, u0 = 0,
            v0 = 0, vh = 0, vl = 0,
            qh = 0, ql = 0, rh = 0, rl = 0,
            t1 = 0, t2 = 0, m = 0, c = 0,
            i = 0, j = 0, k = 0;

        // number of significant limbs in `N` (multiplied by 4)
        for ( i = (lN-1) & -4; (i|0) >= 0; i = (i-4)|0 ) {
            n = HEAP32[(N+i)>>2]|0;
            if ( n ) {
                lN = i;
                break;
            }
        }

        // number of significant limbs in `D` (multiplied by 4)
        for ( i = (lD-1) & -4; (i|0) >= 0; i = (i-4)|0 ) {
            d = HEAP32[(D+i)>>2]|0;
            if ( d ) {
                lD = i;
                break;
            }
        }

        // `D` is zero? WTF?!

        // calculate `e` - the power of 2 of the normalization factor
        while ( (d & 0x80000000) == 0 ) {
            d = d << 1;
            e = e + 1|0;
        }

        // normalize `N` in place
        u0 = HEAP32[(N+lN)>>2]|0;
        if ( e ) {
            u1 = u0>>>(32-e|0);
            for ( i = (lN-4)|0; (i|0) >= 0; i = (i-4)|0 ) {
                n = HEAP32[(N+i)>>2]|0;
                HEAP32[(N+i+4)>>2] = (u0 << e) | ( e ? n >>> (32-e|0) : 0 );
                u0 = n;
            }
            HEAP32[N>>2] = u0 << e;
        }

        // normalize `D` in place
        if ( e ) {
            v0 = HEAP32[(D+lD)>>2]|0;
            for ( i = (lD-4)|0; (i|0) >= 0; i = (i-4)|0 ) {
                d = HEAP32[(D+i)>>2]|0;
                HEAP32[(D+i+4)>>2] = (v0 << e) | ( d >>> (32-e|0) );
                v0 = d;
            }
            HEAP32[D>>2] = v0 << e;
        }

        // divisor parts won't change
        v0 = HEAP32[(D+lD)>>2]|0;
        vh = v0 >>> 16, vl = v0 & 0xffff;

        // perform division
        for ( i = lN; (i|0) >= (lD|0); i = (i-4)|0 ) {
            j = (i-lD)|0;

            // estimate high part of the quotient
            u0 = HEAP32[(N+i)>>2]|0;
            qh = ( (u1>>>0) / (vh>>>0) )|0, rh = ( (u1>>>0) % (vh>>>0) )|0, t1 = imul(qh, vl)|0;
            while ( ( (qh|0) == 0x10000 ) | ( (t1>>>0) > (((rh << 16)|(u0 >>> 16))>>>0) ) ) {
                qh = (qh-1)|0, rh = (rh+vh)|0, t1 = (t1-vl)|0;
                if ( (rh|0) >= 0x10000 ) break;
            }

            // bulk multiply-and-subtract
            // m - multiplication carry, c - subtraction carry
            m = 0, c = 0;
            for ( k = 0; (k|0) <= (lD|0); k = (k+4)|0 ) {
                d = HEAP32[(D+k)>>2]|0;
                t1 = (imul(qh, d & 0xffff)|0) + (m >>> 16)|0;
                t2 = (imul(qh, d >>> 16)|0) + (t1 >>> 16)|0;
                d = (m & 0xffff) | (t1 << 16);
                m = t2;
                n = HEAP32[(N+j+k)>>2]|0;
                t1 = ((n & 0xffff) - (d & 0xffff)|0) + c|0;
                t2 = ((n >>> 16) - (d >>> 16)|0) + (t1 >> 16)|0;
                HEAP32[(N+j+k)>>2] = (t2 << 16) | (t1 & 0xffff);
                c = t2 >> 16;
            }
            t1 = ((u1 & 0xffff) - (m & 0xffff)|0) + c|0;
            t2 = ((u1 >>> 16) - (m >>> 16)|0) + (t1 >> 16)|0;
            u1 = (t2 << 16) | (t1 & 0xffff);
            c = t2 >> 16;

            // add `D` back if got carry-out
            if ( c ) {
                qh = (qh-1)|0;
                c = 0;
                for ( k = 0; (k|0) <= (lD|0); k = (k+4)|0 ) {
                    d = HEAP32[(D+k)>>2]|0;
                    n = HEAP32[(N+j+k)>>2]|0;
                    t1 = (n & 0xffff) + c|0;
                    t2 = (n >>> 16) + d + (t1 >>> 16)|0;
                    HEAP32[(N+j+k)>>2] = (t2 << 16) | (t1 & 0xffff);
                    c = t2 >>> 16;
                }
                u1 = (u1+c)|0;
            }

            // estimate low part of the quotient
            u0 = HEAP32[(N+i)>>2]|0;
            n = (u1 << 16) | (u0 >>> 16);
            ql = ( (n>>>0) / (vh>>>0) )|0, rl = ( (n>>>0) % (vh>>>0) )|0, t1 = imul(ql, vl)|0;
            while ( ( (ql|0) == 0x10000 ) | ( (t1>>>0) > (((rl << 16)|(u0 & 0xffff))>>>0) ) ) {
                ql = (ql-1)|0, rl = (rl+vh)|0, t1 = (t1-vl)|0;
                if ( (rl|0) >= 0x10000 ) break;
            }

            // bulk multiply-and-subtract
            // m - multiplication carry, c - subtraction carry
            m = 0, c = 0;
            for ( k = 0; (k|0) <= (lD|0); k = (k+4)|0 ) {
                d = HEAP32[(D+k)>>2]|0;
                t1 = (imul(ql, d & 0xffff)|0) + (m & 0xffff)|0;
                t2 = ((imul(ql, d >>> 16)|0) + (t1 >>> 16)|0) + (m >>> 16)|0;
                d = (t1 & 0xffff) | (t2 << 16);
                m = t2 >>> 16;
                n = HEAP32[(N+j+k)>>2]|0;
                t1 = ((n & 0xffff) - (d & 0xffff)|0) + c|0;
                t2 = ((n >>> 16) - (d >>> 16)|0) + (t1 >> 16)|0;
                c = t2 >> 16;
                HEAP32[(N+j+k)>>2] = (t2 << 16) | (t1 & 0xffff);
            }
            t1 = ((u1 & 0xffff) - (m & 0xffff)|0) + c|0;
            t2 = ((u1 >>> 16) - (m >>> 16)|0) + (t1 >> 16)|0;
            c = t2 >> 16;

            // add `D` back if got carry-out
            if ( c ) {
                ql = (ql-1)|0;
                c = 0;
                for ( k = 0; (k|0) <= (lD|0); k = (k+4)|0 ) {
                    d = HEAP32[(D+k)>>2]|0;
                    n = HEAP32[(N+j+k)>>2]|0;
                    t1 = ((n & 0xffff) + (d & 0xffff)|0) + c|0;
                    t2 = ((n >>> 16) + (d >>> 16)|0) + (t1 >>> 16)|0;
                    c = t2 >>> 16;
                    HEAP32[(N+j+k)>>2] = (t1 & 0xffff) | (t2 << 16);
                }
            }

            // got quotient limb
            HEAP32[(Q+j)>>2] = (qh << 16) | ql;

            u1 = HEAP32[(N+i)>>2]|0;
        }

        if ( e ) {
            // TODO denormalize `D` in place

            // denormalize `N` in place
            u0 = HEAP32[N>>2]|0;
            for ( i = 4; (i|0) <= (lD|0); i = (i+4)|0 ) {
                n = HEAP32[(N+i)>>2]|0;
                HEAP32[(N+i-4)>>2] = ( n << (32-e|0) ) | (u0 >>> e);
                u0 = n;
            }
            HEAP32[(N+lD)>>2] = u0 >>> e;
        }
    }

    /**
     * Montgomery modular reduction
     *
     * Definition:
     *
     *  MREDC(A) = A x X (mod N),
     *  M x X = N x Y + 1,
     *
     * where M = 2^(32*m) such that N < M and A < NxM
     *
     * Numbers `X` and `Y` can be calculated using Extended Euclidean Algorithm.
     */
    function mredc ( A, lA, N, lN, y, R ) {
        A  =  A|0;
        lA = lA|0;
        N  =  N|0;
        lN = lN|0;
        y  =  y|0;
        R  =  R|0;

        var T = 0,
            c = 0, uh = 0, ul = 0, vl = 0, vh = 0, w0 = 0, w1 = 0, w2 = 0, r0 = 0, r1 = 0,
            i = 0, j = 0, k = 0;

        T = salloc(lN<<1)|0;
        z(lN<<1, 0, T);

        cp( lA, A, T );

        // HAC 14.32
        for ( i = 0; (i|0) < (lN|0); i = (i+4)|0 ) {
            uh = HEAP32[(T+i)>>2]|0, ul = uh & 0xffff, uh = uh >>> 16;
            vh = y >>> 16, vl = y & 0xffff;
            w0 = imul(ul,vl)|0, w1 = ( (imul(ul,vh)|0) + (imul(uh,vl)|0) | 0 ) + (w0 >>> 16) | 0;
            ul = w0 & 0xffff, uh = w1 & 0xffff;
            r1 = 0;
            for ( j = 0; (j|0) < (lN|0); j = (j+4)|0 ) {
                k = (i+j)|0;
                vh = HEAP32[(N+j)>>2]|0, vl = vh & 0xffff, vh = vh >>> 16;
                r0 = HEAP32[(T+k)>>2]|0;
                w0 = ((imul(ul, vl)|0) + (r1 & 0xffff)|0) + (r0 & 0xffff)|0;
                w1 = ((imul(ul, vh)|0) + (r1 >>> 16)|0) + (r0 >>> 16)|0;
                w2 = ((imul(uh, vl)|0) + (w1 & 0xffff)|0) + (w0 >>> 16)|0;
                r1 = ((imul(uh, vh)|0) + (w2 >>> 16)|0) + (w1 >>> 16)|0;
                r0 = (w2 << 16) | (w0 & 0xffff);
                HEAP32[(T+k)>>2] = r0;
            }
            k = (i+j)|0;
            r0 = HEAP32[(T+k)>>2]|0;
            w0 = ((r0 & 0xffff) + (r1 & 0xffff)|0) + c|0;
            w1 = ((r0 >>> 16) + (r1 >>> 16)|0) + (w0 >>> 16)|0;
            HEAP32[(T+k)>>2] = (w1 << 16) | (w0 & 0xffff);
            c = w1 >>> 16;
        }

        cp( lN, (T+lN)|0, R );

        sfree(lN<<1);

        if ( c | ( (cmp( N, lN, R, lN )|0) <= 0 ) ) {
            sub( R, lN, N, lN, R, lN )|0;
        }
    }

    return {
        sreset: sreset,
        salloc: salloc,
        sfree:  sfree,
        z: z,
        tst: tst,
        neg: neg,
        cmp: cmp,
        add: add,
        sub: sub,
        mul: mul,
        sqr: sqr,
        div: div,
        mredc: mredc
    };
}

function is_big_number ( a ) {
    return ( a instanceof BigNumber );
}

///////////////////////////////////////////////////////////////////////////////

var _bigint_heap = new Uint32Array(0x100000),
    _bigint_asm = bigint_asm( global, null, _bigint_heap.buffer );

///////////////////////////////////////////////////////////////////////////////

var _BigNumber_ZERO_limbs = new Uint32Array(0);

function BigNumber ( num ) {
    var limbs = _BigNumber_ZERO_limbs,
        bitlen = 0,
        sign = 0;

    if ( is_string(num) )
        num = string_to_bytes(num);

    if ( is_buffer(num) )
        num = new Uint8Array(num);

    if ( num === undefined ) {
        // do nothing
    }
    else if ( is_number(num) ) {
        var absnum = Math.abs(num);
        if ( absnum > 0xffffffff ) {
            limbs = new Uint32Array(2);
            limbs[0] = absnum|0;
            limbs[1] = (absnum/0x100000000)|0;
            bitlen = 52;
        }
        else if ( absnum > 0 ) {
            limbs = new Uint32Array(1);
            limbs[0] = absnum;
            bitlen = 32;
        }
        else {
            limbs = _BigNumber_ZERO_limbs;
            bitlen = 0;
        }
        sign = num < 0 ? -1 : 1;
    }
    else if ( is_bytes(num) ) {
        for ( var i = 0; !num[i]; i++ );

        bitlen = ( num.length - i ) * 8;
        if ( !bitlen )
            return BigNumber_ZERO;

        limbs = new Uint32Array( (bitlen + 31) >> 5 );
        for ( var j = num.length-4; j >= i ; j -= 4 ) {
            limbs[(num.length-4-j)>>2] = (num[j] << 24) | (num[j+1] << 16) | (num[j+2] << 8) | num[j+3];
        }
        if ( i-j === 3 ) {
            limbs[limbs.length-1] = num[i];
        }
        else if ( i-j === 2 ) {
            limbs[limbs.length-1] = (num[i] << 8) | num[i+1];
        }
        else if ( i-j === 1 ) {
            limbs[limbs.length-1] = (num[i] << 16) | (num[i+1] << 8) | num[i+2];
        }

        sign = 1;
    }
    else if ( typeof num === 'object' && num !== null ) {
        limbs = new Uint32Array( num.limbs );
        bitlen = num.bitLength;
        sign = num.sign;
    }
    else {
        throw new TypeError("number is of unexpected type");
    }

    this.limbs = limbs;
    this.bitLength = bitlen;
    this.sign = sign;
}

function BigNumber_toString ( radix ) {
    radix = radix || 16;

    var limbs = this.limbs,
        bitlen = this.bitLength,
        str = '';

    if ( radix === 16 ) {
        // FIXME clamp last limb to (bitlen % 32)
        for ( var i = (bitlen+31>>5)-1; i >= 0; i-- ) {
            var h = limbs[i].toString(16);
            str += '00000000'.substr(h.length);
            str += h;
        }

        str = str.replace( /^0+/, '' );

        if ( !str.length )
            str = '0';
    }
    else {
        throw new IllegalArgumentError("bad radix");
    }

    if ( this.sign < 0 )
        str = '-' + str;

    return str;
}

function BigNumber_toBytes () {
    var bitlen = this.bitLength,
        limbs = this.limbs;

    if ( bitlen === 0 )
        return new Uint8Array(0);

    var bytelen = ( bitlen + 7 ) >> 3,
        bytes = new Uint8Array(bytelen);
    for ( var i = 0; i < bytelen; i++ ) {
        var j = bytelen - i - 1;
        bytes[i] = limbs[j>>2] >> ( (j & 3) << 3 );
    }

    return bytes;
}

// Downgrade to Number
function BigNumber_valueOf () {
    var limbs = this.limbs,
        bits = this.bitLength,
        sign = this.sign;

    if ( !sign )
        return 0;

    if ( bits <= 32 )
        return sign * (limbs[0]>>>0);

    if ( bits <= 52 )
        return sign * ( 0x100000000 * (limbs[1]>>>0) + (limbs[0]>>>0) );

    // normalization
    var i, l, e = 0;
    for ( i = limbs.length-1; i >= 0; i-- ) {
        if ( (l = limbs[i]) === 0 ) continue;
        while ( ( (l << e) & 0x80000000 ) === 0 ) e++;
        break;
    }

    if ( i === 0 )
        return sign * (limbs[0]>>>0);

    return sign * ( 0x100000 * (( (limbs[i] << e) | ( e ? limbs[i-1] >>> (32-e) : 0 ) )>>>0)
                             + (( (limbs[i-1] << e) | ( e && i > 1 ? limbs[i-2] >>> (32-e) : 0 ) )>>>12)
                  ) * Math.pow( 2, 32*i-e-52 );
}

function BigNumber_clamp ( b ) {
    var limbs = this.limbs,
        bitlen = this.bitLength;

    // FIXME check b is number and in a valid range

    if ( b >= bitlen )
        return this;

    var clamped = new BigNumber,
        n = (b + 31) >> 5,
        k = b % 32;

    clamped.limbs = new Uint32Array( limbs.subarray(0,n) );
    clamped.bitLength = b;
    clamped.sign = this.sign;

    if ( k ) clamped.limbs[n-1] &= (-1 >>> (32-k));

    return clamped;
}

function BigNumber_slice ( f, b ) {
    if ( !is_number(f) )
        throw new TypeError("TODO");

    if ( b !== undefined && !is_number(b) )
        throw new TypeError("TODO");

    var limbs = this.limbs,
        bitlen = this.bitLength;

    if ( f < 0 )
        throw new RangeError("TODO");

    if ( f >= bitlen )
        return BigNumber_ZERO;

    if ( b === undefined || b > bitlen - f )
        b = bitlen - f;

    var sliced = new BigNumber, slimbs,
        n = f >> 5, m = (f + b + 31) >> 5, l = (b + 31) >> 5,
        t = f % 32, k = b % 32;

    slimbs = new Uint32Array(l);
    if ( t ) {
        for ( var i = 0; i < m-n-1; i++ ) {
            slimbs[i] = (limbs[n+i]>>>t) | ( limbs[n+i+1]<<(32-t) );
        }
        slimbs[i] = limbs[n+i]>>>t;
    }
    else {
        slimbs.set( limbs.subarray(n, m) );
    }

    if ( k ) {
        slimbs[l-1] &= (-1 >>> (32-k));
    }

    sliced.limbs = slimbs
    sliced.bitLength = b;
    sliced.sign = this.sign;

    return sliced;
}

///////////////////////////////////////////////////////////////////////////////

function BigNumber_negate () {
    var negative = new BigNumber;

    negative.limbs = this.limbs;
    negative.bitLength = this.bitLength;
    negative.sign = -1 * this.sign;

    return negative;
}

function BigNumber_compare ( that ) {
    if ( !is_big_number(that) )
        that = new BigNumber(that);

    var alimbs = this.limbs, alimbcnt = alimbs.length,
        blimbs = that.limbs, blimbcnt = blimbs.length,
        z = 0;

    if ( this.sign < that.sign )
        return -1;

    if ( this.sign > that.sign )
        return 1;

    _bigint_heap.set( alimbs, 0 );
    _bigint_heap.set( blimbs, alimbcnt );
    z = _bigint_asm.cmp( 0, alimbcnt<<2, alimbcnt<<2, blimbcnt<<2 );

    return z * this.sign;
}

function BigNumber_add ( that ) {
    if ( !is_big_number(that) )
        that = new BigNumber(that);

    if ( !this.sign )
        return that;

    if ( !that.sign )
        return this;

    var abitlen = this.bitLength, alimbs = this.limbs, alimbcnt = alimbs.length, asign = this.sign,
        bbitlen = that.bitLength, blimbs = that.limbs, blimbcnt = blimbs.length, bsign = that.sign,
        rbitlen, rlimbcnt, rsign, rof, result = new BigNumber;

    rbitlen = ( abitlen > bbitlen ? abitlen : bbitlen ) + ( asign * bsign > 0 ? 1 : 0 );
    rlimbcnt = ( rbitlen + 31 ) >> 5;

    _bigint_asm.sreset();

    var pA = _bigint_asm.salloc( alimbcnt<<2 ),
        pB = _bigint_asm.salloc( blimbcnt<<2 ),
        pR = _bigint_asm.salloc( rlimbcnt<<2 );

    _bigint_asm.z( pR-pA+(rlimbcnt<<2), 0, pA );

    _bigint_heap.set( alimbs, pA>>2 );
    _bigint_heap.set( blimbs, pB>>2 );

    if ( asign * bsign > 0 ) {
        _bigint_asm.add( pA, alimbcnt<<2, pB, blimbcnt<<2, pR, rlimbcnt<<2 );
        rsign = asign;
    }
    else if ( asign > bsign ) {
        rof = _bigint_asm.sub( pA, alimbcnt<<2, pB, blimbcnt<<2, pR, rlimbcnt<<2 );
        rsign = rof ? bsign : asign;
    }
    else {
        rof = _bigint_asm.sub( pB, blimbcnt<<2, pA, alimbcnt<<2, pR, rlimbcnt<<2 );
        rsign = rof ? asign : bsign;
    }

    if ( rof )
        _bigint_asm.neg( pR, rlimbcnt<<2, pR, rlimbcnt<<2 );

    if ( _bigint_asm.tst( pR, rlimbcnt<<2 ) === 0 )
        return BigNumber_ZERO;

    result.limbs = new Uint32Array( _bigint_heap.subarray( pR>>2, (pR>>2)+rlimbcnt ) );
    result.bitLength = rbitlen;
    result.sign = rsign;

    return result;
}

function BigNumber_subtract ( that ) {
    if ( !is_big_number(that) )
        that = new BigNumber(that);

    return this.add( that.negate() );
}

function BigNumber_multiply ( that ) {
    if ( !is_big_number(that) )
        that = new BigNumber(that);

    if ( !this.sign || !that.sign )
        return BigNumber_ZERO;

    var abitlen = this.bitLength, alimbs = this.limbs, alimbcnt = alimbs.length,
        bbitlen = that.bitLength, blimbs = that.limbs, blimbcnt = blimbs.length,
        rbitlen, rlimbcnt, result = new BigNumber;

    rbitlen = abitlen + bbitlen;
    rlimbcnt = ( rbitlen + 31 ) >> 5;

    _bigint_asm.sreset();

    var pA = _bigint_asm.salloc( alimbcnt<<2 ),
        pB = _bigint_asm.salloc( blimbcnt<<2 ),
        pR = _bigint_asm.salloc( rlimbcnt<<2 );

    _bigint_asm.z( pR-pA+(rlimbcnt<<2), 0, pA );

    _bigint_heap.set( alimbs, pA>>2 );
    _bigint_heap.set( blimbs, pB>>2 );

    _bigint_asm.mul( pA, alimbcnt<<2, pB, blimbcnt<<2, pR, rlimbcnt<<2 );

    result.limbs = new Uint32Array( _bigint_heap.subarray( pR>>2, (pR>>2)+rlimbcnt ) );
    result.sign = this.sign * that.sign;
    result.bitLength = rbitlen;

    return result;
}

function BigNumber_square () {
    if ( !this.sign )
        return BigNumber_ZERO;

    var abitlen = this.bitLength, alimbs = this.limbs, alimbcnt = alimbs.length,
        rbitlen, rlimbcnt, result = new BigNumber;

    rbitlen = abitlen << 1;
    rlimbcnt = ( rbitlen + 31 ) >> 5;

    _bigint_asm.sreset();

    var pA = _bigint_asm.salloc( alimbcnt<<2 ),
        pR = _bigint_asm.salloc( rlimbcnt<<2 );

    _bigint_asm.z( pR-pA+(rlimbcnt<<2), 0, pA );

    _bigint_heap.set( alimbs, pA>>2 );

    _bigint_asm.sqr( pA, alimbcnt<<2, pR );

    result.limbs = new Uint32Array( _bigint_heap.subarray( pR>>2, (pR>>2)+rlimbcnt ) );
    result.bitLength = rbitlen;
    result.sign = 1;

    return result;
}

function BigNumber_divide ( that ) {
    if ( !is_big_number(that) )
        that = new BigNumber(that);

    var abitlen = this.bitLength, alimbs = this.limbs, alimbcnt = alimbs.length,
        bbitlen = that.bitLength, blimbs = that.limbs, blimbcnt = blimbs.length,
        qlimbcnt, rlimbcnt, quotient = BigNumber_ZERO, remainder = BigNumber_ZERO;

    _bigint_asm.sreset();

    var pA = _bigint_asm.salloc( alimbcnt<<2 ),
        pB = _bigint_asm.salloc( blimbcnt<<2 ),
        pQ = _bigint_asm.salloc( alimbcnt<<2 );

    _bigint_asm.z( pQ-pA+(alimbcnt<<2), 0, pA );

    _bigint_heap.set( alimbs, pA>>2 );
    _bigint_heap.set( blimbs, pB>>2 );

    _bigint_asm.div( pA, alimbcnt<<2, pB, blimbcnt<<2, pQ );

    qlimbcnt = _bigint_asm.tst( pQ, alimbcnt<<2 )>>2;
    if ( qlimbcnt ) {
        quotient = new BigNumber;
        quotient.limbs = new Uint32Array( _bigint_heap.subarray( pQ>>2, (pQ>>2)+qlimbcnt ) );
        quotient.bitLength = abitlen < (qlimbcnt<<5) ? abitlen : (qlimbcnt<<5);
        quotient.sign = this.sign * that.sign;
    }

    rlimbcnt = _bigint_asm.tst( pA, blimbcnt<<2 )>>2;
    if ( rlimbcnt ) {
        remainder = new BigNumber;
        remainder.limbs = new Uint32Array( _bigint_heap.subarray( pA>>2, (pA>>2)+rlimbcnt ) );;
        remainder.bitLength = bbitlen < (rlimbcnt<<5) ? bbitlen : (rlimbcnt<<5);
        remainder.sign = this.sign;
    }

    return {
        quotient: quotient,
        remainder: remainder
    };
}

///////////////////////////////////////////////////////////////////////////////

var BigNumberPrototype = BigNumber.prototype = new Number;
BigNumberPrototype.toString = BigNumber_toString;
BigNumberPrototype.toBytes = BigNumber_toBytes;
BigNumberPrototype.valueOf = BigNumber_valueOf;
BigNumberPrototype.clamp = BigNumber_clamp;
BigNumberPrototype.slice = BigNumber_slice;

///////////////////////////////////////////////////////////////////////////////

BigNumberPrototype.negate = BigNumber_negate;
BigNumberPrototype.compare = BigNumber_compare;
BigNumberPrototype.add = BigNumber_add;
BigNumberPrototype.subtract = BigNumber_subtract;
BigNumberPrototype.multiply = BigNumber_multiply;
BigNumberPrototype.square = BigNumber_square;
BigNumberPrototype.divide = BigNumber_divide;

///////////////////////////////////////////////////////////////////////////////

var BigNumber_ZERO = new BigNumber(0),
    BigNumber_ONE  = new BigNumber(1);

Object.freeze(BigNumber_ZERO);
Object.freeze(BigNumber_ONE);

function Number_extGCD ( a, b ) {
    var sa = ( a < 0 ) ? -1 : 1,
        sb = ( b < 0 ) ? -1 : 1,
        xi = 1, xj = 0,
        yi = 0, yj = 1,
        r, q, t, a_cmp_b;

    a *= sa;
    b *= sb;

    a_cmp_b = ( a < b );
    if ( a_cmp_b ) {
        t = a; a = b, b = t;
        t = sa; sa = sb; sb = t;
    }

    q = Math.floor( a / b ), r = a - q*b;
    while ( r ) {
        t = xi - q*xj, xi = xj, xj = t;
        t = yi - q*yj, yi = yj, yj = t;
        a = b, b = r;

        q = Math.floor( a / b ), r = a - q*b;
    }

    xj *= sa;
    yj *= sb;

    if ( a_cmp_b ) {
        t = xj; xj = yj, yj = t;
    }

    return {
        gcd: b,
        x: xj,
        y: yj
    };
}

function BigNumber_extGCD ( a, b ) {
    if ( !is_big_number(a) )
        a = new BigNumber(a);

    if ( !is_big_number(b) )
        b = new BigNumber(b);

    var sa = a.sign, sb = b.sign;

    if ( sa < 0 )
        a = a.negate();

    if ( sb < 0 )
        b = b.negate();

    var a_cmp_b = a.compare(b);
    if ( a_cmp_b < 0 ) {
        var t = a; a = b, b = t;
        t = sa; sa = sb; sb = t;
    }

    var xi = BigNumber_ONE, xj = BigNumber_ZERO, lx = b.bitLength,
        yi = BigNumber_ZERO, yj = BigNumber_ONE, ly = a.bitLength,
        z, r, q;

    z = a.divide(b);
    while ( (r = z.remainder) !== BigNumber_ZERO ) {
        q = z.quotient;

        z = xi.subtract( q.multiply(xj).clamp(lx) ).clamp(lx), xi = xj, xj = z;
        z = yi.subtract( q.multiply(yj).clamp(ly) ).clamp(ly), yi = yj, yj = z;

        a = b, b = r;

        z = a.divide(b);
    }

    if ( sa < 0 )
        xj = xj.negate();

    if ( sb < 0 )
        yj = yj.negate();

    if ( a_cmp_b < 0 ) {
        var t = xj; xj = yj, yj = t;
    }

    return {
        gcd: b,
        x: xj,
        y: yj
    };
}

/**
 * Modulus
 */
function Modulus () {
    BigNumber.apply( this, arguments );

    if ( this.valueOf() < 1 )
        throw new RangeError();

    if ( this.bitLength <= 32 )
        return;

    var comodulus;

    if ( this.limbs[0] & 1 ) {
        var bitlen = ( (this.bitLength+31) & -32 ) + 1, limbs = new Uint32Array( (bitlen+31) >> 5 );
        limbs[limbs.length-1] = 1;
        comodulus = new BigNumber();
        comodulus.sign = 1;
        comodulus.bitLength = bitlen;
        comodulus.limbs = limbs;

        var k = Number_extGCD( 0x100000000, this.limbs[0] ).y;
        this.coefficient = k < 0 ? -k : 0x100000000-k;
    }
    else {
        /**
         * TODO even modulus reduction
         * Modulus represented as `N = 2^U * V`, where `V` is odd and thus `GCD(2^U, V) = 1`.
         * Calculation `A = TR' mod V` is made as for odd modulo using Montgomery method.
         * Calculation `B = TR' mod 2^U` is easy as modulus is a power of 2.
         * Using Chinese Remainder Theorem and Garner's Algorithm restore `TR' mod N` from `A` and `B`.
         */
        return;
    }

    this.comodulus = comodulus;
    this.comodulusRemainder = comodulus.divide(this).remainder;
    this.comodulusRemainderSquare = comodulus.square().divide(this).remainder;
}

/**
 * Modular reduction
 */
function Modulus_reduce ( a ) {
    if ( !is_big_number(a) )
        a = new BigNumber(a);

    if ( a.bitLength <= 32 && this.bitLength <= 32 )
        return new BigNumber( a.valueOf() % this.valueOf() );

    if ( a.compare(this) < 0 )
        return a;

    return a.divide(this).remainder;
}

/**
 * Modular inverse
 */
function Modulus_inverse ( a ) {
    a = this.reduce(a);

    var r = BigNumber_extGCD( this, a );
    if ( r.gcd.valueOf() !== 1 ) return null;

    r = r.y;
    if ( r.sign < 0 ) r = r.add(this).clamp(this.bitLength);

    return r;
}

/**
 * Modular exponentiation
 */
function Modulus_power ( g, e ) {
    if ( !is_big_number(g) )
        g = new BigNumber(g);

    if ( !is_big_number(e) )
        e = new BigNumber(e);

    // count exponent set bits
    var c = 0;
    for ( var i = 0; i < e.limbs.length; i++ ) {
        var t = e.limbs[i];
        while ( t ) {
            if ( t & 1 ) c++;
            t >>>= 1;
        }
    }

    // window size parameter
    var k = 8;
    if ( e.bitLength <= 4536 ) k = 7;
    if ( e.bitLength <= 1736 ) k = 6;
    if ( e.bitLength <= 630 ) k = 5;
    if ( e.bitLength <= 210 ) k = 4;
    if ( e.bitLength <= 60 ) k = 3;
    if ( e.bitLength <= 12 ) k = 2;
    if ( c <= (1 << (k-1)) ) k = 1;

    // montgomerize base
    g = _Montgomery_reduce( this.reduce(g).multiply(this.comodulusRemainderSquare), this );

    // precompute odd powers
    var g2 = _Montgomery_reduce( g.square(), this ),
        gn = new Array( 1 << (k-1) );
    gn[0] = g;
    gn[1] = _Montgomery_reduce( g.multiply(g2), this );
    for ( var i = 2; i < (1 << (k-1)); i++ ) {
        gn[i] = _Montgomery_reduce( gn[i-1].multiply(g2), this );
    }

    // perform exponentiation
    var u = this.comodulusRemainder,
        r = u;
    for ( var i = e.limbs.length-1; i >= 0; i-- ) {
        var t = e.limbs[i];
        for ( var j = 32; j > 0; ) {
            if ( t & 0x80000000 ) {
                var n = t >>> (32-k), l = k;
                while ( (n & 1) === 0 ) { n >>>= 1; l--; }
                var m = gn[n>>>1];
                while ( n ) { n >>>= 1; if ( r !== u ) r = _Montgomery_reduce( r.square(), this ); }
                r = ( r !== u ) ? _Montgomery_reduce( r.multiply(m), this ) : m;
                t <<= l, j -= l;
            }
            else {
                if ( r !== u ) r = _Montgomery_reduce( r.square(), this );
                t <<= 1, j--;
            }
        }
    }

    // de-montgomerize result
    r = _Montgomery_reduce( r, this );

    return r;
}

function _Montgomery_reduce ( a, n ) {
    var alimbs = a.limbs, alimbcnt = alimbs.length,
        nlimbs = n.limbs, nlimbcnt = nlimbs.length,
        y = n.coefficient;

    _bigint_asm.sreset();

    var pA = _bigint_asm.salloc( alimbcnt<<2 ),
        pN = _bigint_asm.salloc( nlimbcnt<<2 ),
        pR = _bigint_asm.salloc( nlimbcnt<<2 );

    _bigint_asm.z( pR-pA+(nlimbcnt<<2), 0, pA );

    _bigint_heap.set( alimbs, pA>>2 );
    _bigint_heap.set( nlimbs, pN>>2 );

    _bigint_asm.mredc( pA, alimbcnt<<2, pN, nlimbcnt<<2, y, pR );

    var result = new BigNumber();
    result.limbs = new Uint32Array( _bigint_heap.subarray( pR>>2, (pR>>2)+nlimbcnt ) );
    result.bitLength = n.bitLength;
    result.sign = 1;

    return result;
}

var ModulusPrototype = Modulus.prototype = new BigNumber;
ModulusPrototype.reduce = Modulus_reduce;
ModulusPrototype.inverse = Modulus_inverse;
ModulusPrototype.power = Modulus_power;

// Tests if the number supplied is a Miller-Rabin strong probable prime
function _BigNumber_isMillerRabinProbablePrime ( rounds ) {
    var t = new BigNumber(this),
        s = 0;
    t.limbs[0] -= 1;
    while ( t.limbs[s>>5] === 0 ) s += 32;
    while ( ( ( t.limbs[s>>5] >> (s & 31) ) & 1 ) === 0 ) s++;
    t = t.slice(s);

    var m = new Modulus(this),
        m1 = this.subtract(BigNumber_ONE),
        a = new BigNumber(this),
        l = this.limbs.length-1;
    while ( a.limbs[l] === 0 ) l--;

    while ( --rounds >= 0 ) {
        Random_getValues(a.limbs);
        if ( a.limbs[0] < 2 ) a.limbs[0] += 2;
        while ( a.compare(m1) >= 0 ) a.limbs[l] >>>= 1;

        var x = m.power( a, t );
        if ( x.compare(BigNumber_ONE) === 0 ) continue;
        if ( x.compare(m1) === 0 ) continue;

        var c = s;
        while ( --c > 0 ) {
            x = x.square().divide(m).remainder;
            if ( x.compare(BigNumber_ONE) === 0 ) return false;
            if ( x.compare(m1) === 0 ) break;
        }

        if ( c === 0 ) return false;
    }

    return true;
}

function BigNumber_isProbablePrime ( paranoia ) {
    paranoia = paranoia || 80;

    var limbs = this.limbs,
        i = 0;

    // Oddity test
    // (50% false positive probability)
    if ( ( limbs[0] & 1 ) === 0 ) return false;
    if ( paranoia <= 1 ) return true;

    // Magic divisors (3, 5, 17) test
    // (~25% false positive probability)
    var s3 = 0, s5 = 0, s17 = 0;
    for ( i = 0; i < limbs.length; i++ ) {
        var l3 = limbs[i];
        while ( l3 ) {
            s3 += (l3 & 3);
            l3 >>>= 2;
        }

        var l5 = limbs[i];
        while ( l5 ) {
            s5 += (l5 & 3);
            l5 >>>= 2;
            s5 -= (l5 & 3);
            l5 >>>= 2;
        }

        var l17 = limbs[i];
        while ( l17 ) {
            s17 += (l17 & 15);
            l17 >>>= 4;
            s17 -= (l17 & 15);
            l17 >>>= 4;
        }
    }
    if ( !(s3 % 3) || !(s5 % 5) || !(s17 % 17) ) return false;
    if ( paranoia <= 2 ) return true;

    // Miller-Rabin test
    // (<= 4^(-k) false positive probability)
    return _BigNumber_isMillerRabinProbablePrime.call( this, paranoia >>> 1 );
}

// Small primes for trail division
var _primes = [ 2, 3 /* and so on, computed lazily */ ];

// Returns an array populated with first n primes.
function _small_primes ( n ) {
    if ( _primes.length >= n )
        return _primes.slice( 0, n );

    for ( var p = _primes[_primes.length-1] + 2; _primes.length < n; p += 2 ) {
        for ( var i = 0, d = _primes[i]; d*d <= p; d = _primes[++i] ) {
            if ( p % d == 0 ) break;
        }
        if ( d*d > p ) _primes.push(p);
    }

    return _primes;
}

// Returns strong pseudoprime of a specified bit length
function BigNumber_randomProbablePrime ( bitlen, filter ) {
    var limbcnt = (bitlen + 31) >> 5,
        prime = new BigNumber({ sign: 1, bitLength: bitlen, limbs: limbcnt }),
        limbs = prime.limbs;

    // Number of small divisors to try that minimizes the total cost of the trial division
    // along with the first round of Miller-Rabin test for a certain bit length.
    var k = 10000;
    if ( bitlen <= 512 ) k = 2200;
    if ( bitlen <= 256 ) k = 600;

    var divisors = _small_primes(k),
        remainders = new Uint32Array(k);

    // Number of Miller-Rabin iterations for an error rate  of less than 2^-80
    // Damgaard, Landrock, Pomerance: Average case error estimates for the strong probable prime test.
    var s = (bitlen * global.Math.LN2) | 0,
        r = 27;
    if ( bitlen >= 250 ) r = 12;
    if ( bitlen >= 450 ) r = 6;
    if ( bitlen >= 850 ) r = 3;
    if ( bitlen >= 1300 ) r = 2;

    while ( true ) {
        // populate `prime` with random bits, clamp to the appropriate bit length
        Random_getValues(limbs);
        limbs[0] |= 1;
        limbs[limbcnt-1] |= 1 << ((bitlen - 1) & 31);
        if ( bitlen & 31 ) limbs[limbcnt-1] &= pow2_ceil((bitlen + 1) & 31) - 1;

        // remainders from division to small primes
        remainders[0] = 1;
        for ( var i = 1; i < k; i++ ) {
            remainders[i] = prime.divide( divisors[i] ).remainder.valueOf();
        }

        // try no more than `s` subsequent candidates
        seek:
        for ( var j = 0; j < s; j += 2, limbs[0] += 2 ) {
            // check for small factors
            for ( var i = 1; i < k; i++ ) {
                if ( ( remainders[i] + j ) % divisors[i] === 0 ) continue seek;
            }

            // additional check just before the heavy lifting
            if ( typeof filter === 'function' && !filter(prime) ) continue;

            // proceed to Miller-Rabin test
            if ( _BigNumber_isMillerRabinProbablePrime.call( prime, r ) ) return prime;
        }
    }
}

BigNumberPrototype.isProbablePrime = BigNumber_isProbablePrime;

BigNumber.randomProbablePrime = BigNumber_randomProbablePrime;

BigNumber.ZERO = BigNumber_ZERO;
BigNumber.ONE  = BigNumber_ONE;

BigNumber.extGCD = BigNumber_extGCD;

exports.BigNumber = BigNumber;
exports.Modulus = Modulus;

function RSA ( options ) {
    options = options || {};

    this.key = null;
    this.result = null;

    this.reset(options);
}

function RSA_reset ( options ) {
    options = options || {};

    this.result = null;

    var key = options.key
    if ( key !== undefined ) {
        if ( key instanceof Array ) {
            var l = key.length;
            if ( l !== 2 && l !== 3 && l !== 8 )
                throw new SyntaxError("unexpected key type");

            var k = [];
            k[0] = new Modulus( key[0] );
            k[1] = new BigNumber( key[1] );
            if ( l > 2 ) {
                k[2] = new BigNumber( key[2] );
            }
            if ( l > 3 ) {
                k[3] = new Modulus( key[3] );
                k[4] = new Modulus( key[4] );
                k[5] = new BigNumber( key[5] );
                k[6] = new BigNumber( key[6] );
                k[7] = new BigNumber( key[7] );
            }

            this.key = k;
        }
        else {
            throw new TypeError("unexpected key type");
        }
    }

    return this;
}

function RSA_encrypt ( data ) {
    if ( !this.key )
        throw new IllegalStateError("no key is associated with the instance");

    if ( is_string(data) )
        data = string_to_bytes(data);

    if ( is_buffer(data) )
        data = new Uint8Array(data);

    var msg;
    if ( is_bytes(data) ) {
        msg = new BigNumber(data);
    }
    else if ( is_big_number(data) ) {
        msg = data;
    }
    else {
        throw new TypeError("unexpected data type");
    }

    if ( this.key[0].compare(msg) <= 0 )
        throw new RangeError("data too large");

    var m = this.key[0],
        e = this.key[1];

    var result = m.power( msg, e ).toBytes();

    var bytelen = m.bitLength + 7 >> 3;
    if ( result.length < bytelen ) {
        var r = new Uint8Array(bytelen);
        r.set( result, bytelen - result.length );
        result = r;
    }

    this.result = result;

    return this;
}

function RSA_decrypt ( data ) {
    if ( !this.key )
        throw new IllegalStateError("no key is associated with the instance");

    if ( this.key.length < 3 )
        throw new IllegalStateError("key isn't suitable for decription");

    if ( is_string(data) )
        data = string_to_bytes(data);

    if ( is_buffer(data) )
        data = new Uint8Array(data);

    var msg;
    if ( is_bytes(data) ) {
        msg = new BigNumber(data);
    }
    else if ( is_big_number(data) ) {
        msg = data;
    }
    else {
        throw new TypeError("unexpected data type");
    }

    if ( this.key[0].compare(msg) <= 0 )
        throw new RangeError("data too large");

    var result;
    if ( this.key.length > 3 ) {
        var m = this.key[0],
            p = this.key[3],
            q = this.key[4],
            dp = this.key[5],
            dq = this.key[6],
            u = this.key[7];

        var x = p.power( msg, dp ),
            y = q.power( msg, dq );

        var t = x.subtract(y);
        while ( t.sign < 0 ) t = t.add(p);

        var h = p.reduce( u.multiply(t) );

        result = h.multiply(q).add(y).clamp(m.bitLength).toBytes();
    }
    else {
        var m = this.key[0],
            d = this.key[2];

        result = m.power( msg, d ).toBytes();
    }

    var bytelen = m.bitLength + 7 >> 3;
    if ( result.length < bytelen ) {
        var r = new Uint8Array(bytelen);
        r.set( result, bytelen - result.length );
        result = r;
    }

    this.result = result;

    return this;
}

var RSA_prototype = RSA.prototype;
RSA_prototype.reset = RSA_reset;
RSA_prototype.encrypt = RSA_encrypt;
RSA_prototype.decrypt = RSA_decrypt;

/**
 * Generate RSA key pair
 *
 * @param bitlen desired modulus length, default is 2048
 * @param e public exponent, default is 65537
 */
function RSA_generateKey ( bitlen, e ) {
    bitlen = bitlen || 2048;
    e      = e      || 65537;

    if ( bitlen < 512 )
        throw new IllegalArgumentError("bit length is too small");

    if ( is_string(e) )
        e = string_to_bytes(e);

    if ( is_buffer(e) )
        e = new Uint8Array(e);

    if ( is_bytes(e) || is_number(e) || is_big_number(e) ) {
        e = new BigNumber(e);
    }
    else {
        throw new TypeError("unexpected exponent type");
    }

    if ( ( e.limbs[0] & 1 ) === 0 )
        throw new IllegalArgumentError("exponent must be an odd number");

    var m, e, d, p, q, p1, q1, dp, dq, u;

    p = BigNumber_randomProbablePrime(
        bitlen >> 1,
        function ( p ) {
            p1 = new BigNumber(p); p1.limbs[0] -= 1;
            return BigNumber_extGCD( p1, e ).gcd.valueOf() == 1;
        }
    );

    q = BigNumber_randomProbablePrime(
        bitlen - (bitlen >> 1),
        function ( q ) {
            m = new Modulus( p.multiply(q) );
            if ( !( m.limbs[ ( (bitlen + 31) >> 5 ) - 1 ] >>> ( (bitlen - 1) & 31) ) ) return false;
            q1 = new BigNumber(q); q1.limbs[0] -= 1;
            return BigNumber_extGCD( q1, e ).gcd.valueOf() == 1;
        }
    );

    d = new Modulus( p1.multiply(q1) ).inverse(e);

    dp = d.divide(p1).remainder,
    dq = d.divide(q1).remainder;

    p = new Modulus(p),
    q = new Modulus(q);

    var u = p.inverse(q);

    return [ m, e, d, p, q, dp, dq, u ];
}

RSA.generateKey = RSA_generateKey;


var RSA_RAW = RSA;

/**
 * RSA keygen exports
 */
function rsa_generate_key ( bitlen, e ) {
    if ( bitlen === undefined ) throw new SyntaxError("bitlen required");
    if ( e === undefined ) throw new SyntaxError("e required");
    var key = RSA_generateKey( bitlen, e );
    for ( var i = 0; i < key.length; i++ ) {
        if ( is_big_number(key[i]) )
            key[i] = key[i].toBytes();
    }
    return key;
}

exports.RSA = {
    generateKey: rsa_generate_key
};

/**
 * RSA-RAW exports
 */

function rsa_raw_encrypt_bytes ( data, key ) {
    if ( data === undefined ) throw new SyntaxError("data required");
    if ( key === undefined ) throw new SyntaxError("key required");
    return (new RSA_RAW({ key: key })).encrypt(data).result;
}

function rsa_raw_decrypt_bytes ( data, key ) {
    if ( data === undefined ) throw new SyntaxError("data required");
    if ( key === undefined ) throw new SyntaxError("key required");
    return (new RSA_RAW({ key: key })).decrypt(data).result;
}

RSA_RAW.encrypt = rsa_raw_encrypt_bytes;
RSA_RAW.decrypt = rsa_raw_decrypt_bytes;
RSA_RAW.sign = rsa_raw_decrypt_bytes;
RSA_RAW.verify = rsa_raw_encrypt_bytes;

exports.RSA_RAW = RSA_RAW;


'function'==typeof define&&define.amd?define([],function(){return exports}):'object'==typeof module&&module.exports?module.exports=exports:global.asmCrypto=exports;

return exports;
})( {}, function(){return this}() );