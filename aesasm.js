/**
 * asmCrypto
 * Module from https://github.com/vibornoff/asmcrypto.js/blob/release/src/aes/aes.asm.js
 * Copyright (c) 2013 Artem S Vybornov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of 
 * this software and associated documentation files (the "Software"), to deal in 
 * the Software without restriction, including without limitation the rights to 
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of 
 * the Software, and to permit persons to whom the Software is furnished to do so, 
 * subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all 
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
var _aes_tables = [
    // 0x0000: Sbox
    0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
    0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
    0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
    0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
    0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
    0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
    0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
    0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
    0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
    0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
    0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
    0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
    0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
    0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
    0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
    0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16,

    // 0x0100: InvSbox
    0x52, 0x09, 0x6a, 0xd5, 0x30, 0x36, 0xa5, 0x38, 0xbf, 0x40, 0xa3, 0x9e, 0x81, 0xf3, 0xd7, 0xfb,
    0x7c, 0xe3, 0x39, 0x82, 0x9b, 0x2f, 0xff, 0x87, 0x34, 0x8e, 0x43, 0x44, 0xc4, 0xde, 0xe9, 0xcb,
    0x54, 0x7b, 0x94, 0x32, 0xa6, 0xc2, 0x23, 0x3d, 0xee, 0x4c, 0x95, 0x0b, 0x42, 0xfa, 0xc3, 0x4e,
    0x08, 0x2e, 0xa1, 0x66, 0x28, 0xd9, 0x24, 0xb2, 0x76, 0x5b, 0xa2, 0x49, 0x6d, 0x8b, 0xd1, 0x25,
    0x72, 0xf8, 0xf6, 0x64, 0x86, 0x68, 0x98, 0x16, 0xd4, 0xa4, 0x5c, 0xcc, 0x5d, 0x65, 0xb6, 0x92,
    0x6c, 0x70, 0x48, 0x50, 0xfd, 0xed, 0xb9, 0xda, 0x5e, 0x15, 0x46, 0x57, 0xa7, 0x8d, 0x9d, 0x84,
    0x90, 0xd8, 0xab, 0x00, 0x8c, 0xbc, 0xd3, 0x0a, 0xf7, 0xe4, 0x58, 0x05, 0xb8, 0xb3, 0x45, 0x06,
    0xd0, 0x2c, 0x1e, 0x8f, 0xca, 0x3f, 0x0f, 0x02, 0xc1, 0xaf, 0xbd, 0x03, 0x01, 0x13, 0x8a, 0x6b,
    0x3a, 0x91, 0x11, 0x41, 0x4f, 0x67, 0xdc, 0xea, 0x97, 0xf2, 0xcf, 0xce, 0xf0, 0xb4, 0xe6, 0x73,
    0x96, 0xac, 0x74, 0x22, 0xe7, 0xad, 0x35, 0x85, 0xe2, 0xf9, 0x37, 0xe8, 0x1c, 0x75, 0xdf, 0x6e,
    0x47, 0xf1, 0x1a, 0x71, 0x1d, 0x29, 0xc5, 0x89, 0x6f, 0xb7, 0x62, 0x0e, 0xaa, 0x18, 0xbe, 0x1b,
    0xfc, 0x56, 0x3e, 0x4b, 0xc6, 0xd2, 0x79, 0x20, 0x9a, 0xdb, 0xc0, 0xfe, 0x78, 0xcd, 0x5a, 0xf4,
    0x1f, 0xdd, 0xa8, 0x33, 0x88, 0x07, 0xc7, 0x31, 0xb1, 0x12, 0x10, 0x59, 0x27, 0x80, 0xec, 0x5f,
    0x60, 0x51, 0x7f, 0xa9, 0x19, 0xb5, 0x4a, 0x0d, 0x2d, 0xe5, 0x7a, 0x9f, 0x93, 0xc9, 0x9c, 0xef,
    0xa0, 0xe0, 0x3b, 0x4d, 0xae, 0x2a, 0xf5, 0xb0, 0xc8, 0xeb, 0xbb, 0x3c, 0x83, 0x53, 0x99, 0x61,
    0x17, 0x2b, 0x04, 0x7e, 0xba, 0x77, 0xd6, 0x26, 0xe1, 0x69, 0x14, 0x63, 0x55, 0x21, 0x0c, 0x7d,

    // 0x0200: 2 x Sbox[X]
    0xc6, 0xf8, 0xee, 0xf6, 0xff, 0xd6, 0xde, 0x91, 0x60, 0x02, 0xce, 0x56, 0xe7, 0xb5, 0x4d, 0xec,
    0x8f, 0x1f, 0x89, 0xfa, 0xef, 0xb2, 0x8e, 0xfb, 0x41, 0xb3, 0x5f, 0x45, 0x23, 0x53, 0xe4, 0x9b,
    0x75, 0xe1, 0x3d, 0x4c, 0x6c, 0x7e, 0xf5, 0x83, 0x68, 0x51, 0xd1, 0xf9, 0xe2, 0xab, 0x62, 0x2a,
    0x08, 0x95, 0x46, 0x9d, 0x30, 0x37, 0x0a, 0x2f, 0x0e, 0x24, 0x1b, 0xdf, 0xcd, 0x4e, 0x7f, 0xea,
    0x12, 0x1d, 0x58, 0x34, 0x36, 0xdc, 0xb4, 0x5b, 0xa4, 0x76, 0xb7, 0x7d, 0x52, 0xdd, 0x5e, 0x13,
    0xa6, 0xb9, 0x00, 0xc1, 0x40, 0xe3, 0x79, 0xb6, 0xd4, 0x8d, 0x67, 0x72, 0x94, 0x98, 0xb0, 0x85,
    0xbb, 0xc5, 0x4f, 0xed, 0x86, 0x9a, 0x66, 0x11, 0x8a, 0xe9, 0x04, 0xfe, 0xa0, 0x78, 0x25, 0x4b,
    0xa2, 0x5d, 0x80, 0x05, 0x3f, 0x21, 0x70, 0xf1, 0x63, 0x77, 0xaf, 0x42, 0x20, 0xe5, 0xfd, 0xbf,
    0x81, 0x18, 0x26, 0xc3, 0xbe, 0x35, 0x88, 0x2e, 0x93, 0x55, 0xfc, 0x7a, 0xc8, 0xba, 0x32, 0xe6,
    0xc0, 0x19, 0x9e, 0xa3, 0x44, 0x54, 0x3b, 0x0b, 0x8c, 0xc7, 0x6b, 0x28, 0xa7, 0xbc, 0x16, 0xad,
    0xdb, 0x64, 0x74, 0x14, 0x92, 0x0c, 0x48, 0xb8, 0x9f, 0xbd, 0x43, 0xc4, 0x39, 0x31, 0xd3, 0xf2,
    0xd5, 0x8b, 0x6e, 0xda, 0x01, 0xb1, 0x9c, 0x49, 0xd8, 0xac, 0xf3, 0xcf, 0xca, 0xf4, 0x47, 0x10,
    0x6f, 0xf0, 0x4a, 0x5c, 0x38, 0x57, 0x73, 0x97, 0xcb, 0xa1, 0xe8, 0x3e, 0x96, 0x61, 0x0d, 0x0f,
    0xe0, 0x7c, 0x71, 0xcc, 0x90, 0x06, 0xf7, 0x1c, 0xc2, 0x6a, 0xae, 0x69, 0x17, 0x99, 0x3a, 0x27,
    0xd9, 0xeb, 0x2b, 0x22, 0xd2, 0xa9, 0x07, 0x33, 0x2d, 0x3c, 0x15, 0xc9, 0x87, 0xaa, 0x50, 0xa5,
    0x03, 0x59, 0x09, 0x1a, 0x65, 0xd7, 0x84, 0xd0, 0x82, 0x29, 0x5a, 0x1e, 0x7b, 0xa8, 0x6d, 0x2c,

    // 0x0300: 3 x Sbox[X]
    0xa5, 0x84, 0x99, 0x8d, 0x0d, 0xbd, 0xb1, 0x54, 0x50, 0x03, 0xa9, 0x7d, 0x19, 0x62, 0xe6, 0x9a,
    0x45, 0x9d, 0x40, 0x87, 0x15, 0xeb, 0xc9, 0x0b, 0xec, 0x67, 0xfd, 0xea, 0xbf, 0xf7, 0x96, 0x5b,
    0xc2, 0x1c, 0xae, 0x6a, 0x5a, 0x41, 0x02, 0x4f, 0x5c, 0xf4, 0x34, 0x08, 0x93, 0x73, 0x53, 0x3f,
    0x0c, 0x52, 0x65, 0x5e, 0x28, 0xa1, 0x0f, 0xb5, 0x09, 0x36, 0x9b, 0x3d, 0x26, 0x69, 0xcd, 0x9f,
    0x1b, 0x9e, 0x74, 0x2e, 0x2d, 0xb2, 0xee, 0xfb, 0xf6, 0x4d, 0x61, 0xce, 0x7b, 0x3e, 0x71, 0x97,
    0xf5, 0x68, 0x00, 0x2c, 0x60, 0x1f, 0xc8, 0xed, 0xbe, 0x46, 0xd9, 0x4b, 0xde, 0xd4, 0xe8, 0x4a,
    0x6b, 0x2a, 0xe5, 0x16, 0xc5, 0xd7, 0x55, 0x94, 0xcf, 0x10, 0x06, 0x81, 0xf0, 0x44, 0xba, 0xe3,
    0xf3, 0xfe, 0xc0, 0x8a, 0xad, 0xbc, 0x48, 0x04, 0xdf, 0xc1, 0x75, 0x63, 0x30, 0x1a, 0x0e, 0x6d,
    0x4c, 0x14, 0x35, 0x2f, 0xe1, 0xa2, 0xcc, 0x39, 0x57, 0xf2, 0x82, 0x47, 0xac, 0xe7, 0x2b, 0x95,
    0xa0, 0x98, 0xd1, 0x7f, 0x66, 0x7e, 0xab, 0x83, 0xca, 0x29, 0xd3, 0x3c, 0x79, 0xe2, 0x1d, 0x76,
    0x3b, 0x56, 0x4e, 0x1e, 0xdb, 0x0a, 0x6c, 0xe4, 0x5d, 0x6e, 0xef, 0xa6, 0xa8, 0xa4, 0x37, 0x8b,
    0x32, 0x43, 0x59, 0xb7, 0x8c, 0x64, 0xd2, 0xe0, 0xb4, 0xfa, 0x07, 0x25, 0xaf, 0x8e, 0xe9, 0x18,
    0xd5, 0x88, 0x6f, 0x72, 0x24, 0xf1, 0xc7, 0x51, 0x23, 0x7c, 0x9c, 0x21, 0xdd, 0xdc, 0x86, 0x85,
    0x90, 0x42, 0xc4, 0xaa, 0xd8, 0x05, 0x01, 0x12, 0xa3, 0x5f, 0xf9, 0xd0, 0x91, 0x58, 0x27, 0xb9,
    0x38, 0x13, 0xb3, 0x33, 0xbb, 0x70, 0x89, 0xa7, 0xb6, 0x22, 0x92, 0x20, 0x49, 0xff, 0x78, 0x7a,
    0x8f, 0xf8, 0x80, 0x17, 0xda, 0x31, 0xc6, 0xb8, 0xc3, 0xb0, 0x77, 0x11, 0xcb, 0xfc, 0xd6, 0x3a,

    // 0x0400: 9 x X
    0x00, 0x09, 0x12, 0x1b, 0x24, 0x2d, 0x36, 0x3f, 0x48, 0x41, 0x5a, 0x53, 0x6c, 0x65, 0x7e, 0x77,
    0x90, 0x99, 0x82, 0x8b, 0xb4, 0xbd, 0xa6, 0xaf, 0xd8, 0xd1, 0xca, 0xc3, 0xfc, 0xf5, 0xee, 0xe7,
    0x3b, 0x32, 0x29, 0x20, 0x1f, 0x16, 0x0d, 0x04, 0x73, 0x7a, 0x61, 0x68, 0x57, 0x5e, 0x45, 0x4c,
    0xab, 0xa2, 0xb9, 0xb0, 0x8f, 0x86, 0x9d, 0x94, 0xe3, 0xea, 0xf1, 0xf8, 0xc7, 0xce, 0xd5, 0xdc,
    0x76, 0x7f, 0x64, 0x6d, 0x52, 0x5b, 0x40, 0x49, 0x3e, 0x37, 0x2c, 0x25, 0x1a, 0x13, 0x08, 0x01,
    0xe6, 0xef, 0xf4, 0xfd, 0xc2, 0xcb, 0xd0, 0xd9, 0xae, 0xa7, 0xbc, 0xb5, 0x8a, 0x83, 0x98, 0x91,
    0x4d, 0x44, 0x5f, 0x56, 0x69, 0x60, 0x7b, 0x72, 0x05, 0x0c, 0x17, 0x1e, 0x21, 0x28, 0x33, 0x3a,
    0xdd, 0xd4, 0xcf, 0xc6, 0xf9, 0xf0, 0xeb, 0xe2, 0x95, 0x9c, 0x87, 0x8e, 0xb1, 0xb8, 0xa3, 0xaa,
    0xec, 0xe5, 0xfe, 0xf7, 0xc8, 0xc1, 0xda, 0xd3, 0xa4, 0xad, 0xb6, 0xbf, 0x80, 0x89, 0x92, 0x9b,
    0x7c, 0x75, 0x6e, 0x67, 0x58, 0x51, 0x4a, 0x43, 0x34, 0x3d, 0x26, 0x2f, 0x10, 0x19, 0x02, 0x0b,
    0xd7, 0xde, 0xc5, 0xcc, 0xf3, 0xfa, 0xe1, 0xe8, 0x9f, 0x96, 0x8d, 0x84, 0xbb, 0xb2, 0xa9, 0xa0,
    0x47, 0x4e, 0x55, 0x5c, 0x63, 0x6a, 0x71, 0x78, 0x0f, 0x06, 0x1d, 0x14, 0x2b, 0x22, 0x39, 0x30,
    0x9a, 0x93, 0x88, 0x81, 0xbe, 0xb7, 0xac, 0xa5, 0xd2, 0xdb, 0xc0, 0xc9, 0xf6, 0xff, 0xe4, 0xed,
    0x0a, 0x03, 0x18, 0x11, 0x2e, 0x27, 0x3c, 0x35, 0x42, 0x4b, 0x50, 0x59, 0x66, 0x6f, 0x74, 0x7d,
    0xa1, 0xa8, 0xb3, 0xba, 0x85, 0x8c, 0x97, 0x9e, 0xe9, 0xe0, 0xfb, 0xf2, 0xcd, 0xc4, 0xdf, 0xd6,
    0x31, 0x38, 0x23, 0x2a, 0x15, 0x1c, 0x07, 0x0e, 0x79, 0x70, 0x6b, 0x62, 0x5d, 0x54, 0x4f, 0x46,

    // 0x0500: 11 x X
    0x00, 0x0b, 0x16, 0x1d, 0x2c, 0x27, 0x3a, 0x31, 0x58, 0x53, 0x4e, 0x45, 0x74, 0x7f, 0x62, 0x69,
    0xb0, 0xbb, 0xa6, 0xad, 0x9c, 0x97, 0x8a, 0x81, 0xe8, 0xe3, 0xfe, 0xf5, 0xc4, 0xcf, 0xd2, 0xd9,
    0x7b, 0x70, 0x6d, 0x66, 0x57, 0x5c, 0x41, 0x4a, 0x23, 0x28, 0x35, 0x3e, 0x0f, 0x04, 0x19, 0x12,
    0xcb, 0xc0, 0xdd, 0xd6, 0xe7, 0xec, 0xf1, 0xfa, 0x93, 0x98, 0x85, 0x8e, 0xbf, 0xb4, 0xa9, 0xa2,
    0xf6, 0xfd, 0xe0, 0xeb, 0xda, 0xd1, 0xcc, 0xc7, 0xae, 0xa5, 0xb8, 0xb3, 0x82, 0x89, 0x94, 0x9f,
    0x46, 0x4d, 0x50, 0x5b, 0x6a, 0x61, 0x7c, 0x77, 0x1e, 0x15, 0x08, 0x03, 0x32, 0x39, 0x24, 0x2f,
    0x8d, 0x86, 0x9b, 0x90, 0xa1, 0xaa, 0xb7, 0xbc, 0xd5, 0xde, 0xc3, 0xc8, 0xf9, 0xf2, 0xef, 0xe4,
    0x3d, 0x36, 0x2b, 0x20, 0x11, 0x1a, 0x07, 0x0c, 0x65, 0x6e, 0x73, 0x78, 0x49, 0x42, 0x5f, 0x54,
    0xf7, 0xfc, 0xe1, 0xea, 0xdb, 0xd0, 0xcd, 0xc6, 0xaf, 0xa4, 0xb9, 0xb2, 0x83, 0x88, 0x95, 0x9e,
    0x47, 0x4c, 0x51, 0x5a, 0x6b, 0x60, 0x7d, 0x76, 0x1f, 0x14, 0x09, 0x02, 0x33, 0x38, 0x25, 0x2e,
    0x8c, 0x87, 0x9a, 0x91, 0xa0, 0xab, 0xb6, 0xbd, 0xd4, 0xdf, 0xc2, 0xc9, 0xf8, 0xf3, 0xee, 0xe5,
    0x3c, 0x37, 0x2a, 0x21, 0x10, 0x1b, 0x06, 0x0d, 0x64, 0x6f, 0x72, 0x79, 0x48, 0x43, 0x5e, 0x55,
    0x01, 0x0a, 0x17, 0x1c, 0x2d, 0x26, 0x3b, 0x30, 0x59, 0x52, 0x4f, 0x44, 0x75, 0x7e, 0x63, 0x68,
    0xb1, 0xba, 0xa7, 0xac, 0x9d, 0x96, 0x8b, 0x80, 0xe9, 0xe2, 0xff, 0xf4, 0xc5, 0xce, 0xd3, 0xd8,
    0x7a, 0x71, 0x6c, 0x67, 0x56, 0x5d, 0x40, 0x4b, 0x22, 0x29, 0x34, 0x3f, 0x0e, 0x05, 0x18, 0x13,
    0xca, 0xc1, 0xdc, 0xd7, 0xe6, 0xed, 0xf0, 0xfb, 0x92, 0x99, 0x84, 0x8f, 0xbe, 0xb5, 0xa8, 0xa3,

    // 0x0600: 13 x X
    0x00, 0x0d, 0x1a, 0x17, 0x34, 0x39, 0x2e, 0x23, 0x68, 0x65, 0x72, 0x7f, 0x5c, 0x51, 0x46, 0x4b,
    0xd0, 0xdd, 0xca, 0xc7, 0xe4, 0xe9, 0xfe, 0xf3, 0xb8, 0xb5, 0xa2, 0xaf, 0x8c, 0x81, 0x96, 0x9b,
    0xbb, 0xb6, 0xa1, 0xac, 0x8f, 0x82, 0x95, 0x98, 0xd3, 0xde, 0xc9, 0xc4, 0xe7, 0xea, 0xfd, 0xf0,
    0x6b, 0x66, 0x71, 0x7c, 0x5f, 0x52, 0x45, 0x48, 0x03, 0x0e, 0x19, 0x14, 0x37, 0x3a, 0x2d, 0x20,
    0x6d, 0x60, 0x77, 0x7a, 0x59, 0x54, 0x43, 0x4e, 0x05, 0x08, 0x1f, 0x12, 0x31, 0x3c, 0x2b, 0x26,
    0xbd, 0xb0, 0xa7, 0xaa, 0x89, 0x84, 0x93, 0x9e, 0xd5, 0xd8, 0xcf, 0xc2, 0xe1, 0xec, 0xfb, 0xf6,
    0xd6, 0xdb, 0xcc, 0xc1, 0xe2, 0xef, 0xf8, 0xf5, 0xbe, 0xb3, 0xa4, 0xa9, 0x8a, 0x87, 0x90, 0x9d,
    0x06, 0x0b, 0x1c, 0x11, 0x32, 0x3f, 0x28, 0x25, 0x6e, 0x63, 0x74, 0x79, 0x5a, 0x57, 0x40, 0x4d,
    0xda, 0xd7, 0xc0, 0xcd, 0xee, 0xe3, 0xf4, 0xf9, 0xb2, 0xbf, 0xa8, 0xa5, 0x86, 0x8b, 0x9c, 0x91,
    0x0a, 0x07, 0x10, 0x1d, 0x3e, 0x33, 0x24, 0x29, 0x62, 0x6f, 0x78, 0x75, 0x56, 0x5b, 0x4c, 0x41,
    0x61, 0x6c, 0x7b, 0x76, 0x55, 0x58, 0x4f, 0x42, 0x09, 0x04, 0x13, 0x1e, 0x3d, 0x30, 0x27, 0x2a,
    0xb1, 0xbc, 0xab, 0xa6, 0x85, 0x88, 0x9f, 0x92, 0xd9, 0xd4, 0xc3, 0xce, 0xed, 0xe0, 0xf7, 0xfa,
    0xb7, 0xba, 0xad, 0xa0, 0x83, 0x8e, 0x99, 0x94, 0xdf, 0xd2, 0xc5, 0xc8, 0xeb, 0xe6, 0xf1, 0xfc,
    0x67, 0x6a, 0x7d, 0x70, 0x53, 0x5e, 0x49, 0x44, 0x0f, 0x02, 0x15, 0x18, 0x3b, 0x36, 0x21, 0x2c,
    0x0c, 0x01, 0x16, 0x1b, 0x38, 0x35, 0x22, 0x2f, 0x64, 0x69, 0x7e, 0x73, 0x50, 0x5d, 0x4a, 0x47,
    0xdc, 0xd1, 0xc6, 0xcb, 0xe8, 0xe5, 0xf2, 0xff, 0xb4, 0xb9, 0xae, 0xa3, 0x80, 0x8d, 0x9a, 0x97,

    // 0x0700: 14 x X
    0x00, 0x0e, 0x1c, 0x12, 0x38, 0x36, 0x24, 0x2a, 0x70, 0x7e, 0x6c, 0x62, 0x48, 0x46, 0x54, 0x5a,
    0xe0, 0xee, 0xfc, 0xf2, 0xd8, 0xd6, 0xc4, 0xca, 0x90, 0x9e, 0x8c, 0x82, 0xa8, 0xa6, 0xb4, 0xba,
    0xdb, 0xd5, 0xc7, 0xc9, 0xe3, 0xed, 0xff, 0xf1, 0xab, 0xa5, 0xb7, 0xb9, 0x93, 0x9d, 0x8f, 0x81,
    0x3b, 0x35, 0x27, 0x29, 0x03, 0x0d, 0x1f, 0x11, 0x4b, 0x45, 0x57, 0x59, 0x73, 0x7d, 0x6f, 0x61,
    0xad, 0xa3, 0xb1, 0xbf, 0x95, 0x9b, 0x89, 0x87, 0xdd, 0xd3, 0xc1, 0xcf, 0xe5, 0xeb, 0xf9, 0xf7,
    0x4d, 0x43, 0x51, 0x5f, 0x75, 0x7b, 0x69, 0x67, 0x3d, 0x33, 0x21, 0x2f, 0x05, 0x0b, 0x19, 0x17,
    0x76, 0x78, 0x6a, 0x64, 0x4e, 0x40, 0x52, 0x5c, 0x06, 0x08, 0x1a, 0x14, 0x3e, 0x30, 0x22, 0x2c,
    0x96, 0x98, 0x8a, 0x84, 0xae, 0xa0, 0xb2, 0xbc, 0xe6, 0xe8, 0xfa, 0xf4, 0xde, 0xd0, 0xc2, 0xcc,
    0x41, 0x4f, 0x5d, 0x53, 0x79, 0x77, 0x65, 0x6b, 0x31, 0x3f, 0x2d, 0x23, 0x09, 0x07, 0x15, 0x1b,
    0xa1, 0xaf, 0xbd, 0xb3, 0x99, 0x97, 0x85, 0x8b, 0xd1, 0xdf, 0xcd, 0xc3, 0xe9, 0xe7, 0xf5, 0xfb,
    0x9a, 0x94, 0x86, 0x88, 0xa2, 0xac, 0xbe, 0xb0, 0xea, 0xe4, 0xf6, 0xf8, 0xd2, 0xdc, 0xce, 0xc0,
    0x7a, 0x74, 0x66, 0x68, 0x42, 0x4c, 0x5e, 0x50, 0x0a, 0x04, 0x16, 0x18, 0x32, 0x3c, 0x2e, 0x20,
    0xec, 0xe2, 0xf0, 0xfe, 0xd4, 0xda, 0xc8, 0xc6, 0x9c, 0x92, 0x80, 0x8e, 0xa4, 0xaa, 0xb8, 0xb6,
    0x0c, 0x02, 0x10, 0x1e, 0x34, 0x3a, 0x28, 0x26, 0x7c, 0x72, 0x60, 0x6e, 0x44, 0x4a, 0x58, 0x56,
    0x37, 0x39, 0x2b, 0x25, 0x0f, 0x01, 0x13, 0x1d, 0x47, 0x49, 0x5b, 0x55, 0x7f, 0x71, 0x63, 0x6d,
    0xd7, 0xd9, 0xcb, 0xc5, 0xef, 0xe1, 0xf3, 0xfd, 0xa7, 0xa9, 0xbb, 0xb5, 0x9f, 0x91, 0x83, 0x8d

    // 0x0800: processed data
];

var _aes_heap_start = 0x800; // multiple of 16

function _aes_asm ( stdlib, foreign, buffer ) {
    'use asm';

    // AES state
    var S0 = 0, S1 = 0, S2 = 0, S3 = 0, S4 = 0, S5 = 0, S6 = 0, S7 = 0, S8 = 0, S9 = 0, SA = 0, SB = 0, SC = 0, SD = 0, SE = 0, SF = 0;
    var keySize = 0;

    // GCM mode additional state
    var H0 = 0, H1 = 0, H2 = 0, H3 = 0, Z0 = 0, Z1 = 0, Z2 = 0, Z3 = 0;

    // AES key schedule
    var R00 = 0, R01 = 0, R02 = 0, R03 = 0, R04 = 0, R05 = 0, R06 = 0, R07 = 0, R08 = 0, R09 = 0, R0A = 0, R0B = 0, R0C = 0, R0D = 0, R0E = 0, R0F = 0, // cipher key
        R10 = 0, R11 = 0, R12 = 0, R13 = 0, R14 = 0, R15 = 0, R16 = 0, R17 = 0, R18 = 0, R19 = 0, R1A = 0, R1B = 0, R1C = 0, R1D = 0, R1E = 0, R1F = 0, // round 1 key
        R20 = 0, R21 = 0, R22 = 0, R23 = 0, R24 = 0, R25 = 0, R26 = 0, R27 = 0, R28 = 0, R29 = 0, R2A = 0, R2B = 0, R2C = 0, R2D = 0, R2E = 0, R2F = 0, // round 2 key
        R30 = 0, R31 = 0, R32 = 0, R33 = 0, R34 = 0, R35 = 0, R36 = 0, R37 = 0, R38 = 0, R39 = 0, R3A = 0, R3B = 0, R3C = 0, R3D = 0, R3E = 0, R3F = 0, // round 3 key
        R40 = 0, R41 = 0, R42 = 0, R43 = 0, R44 = 0, R45 = 0, R46 = 0, R47 = 0, R48 = 0, R49 = 0, R4A = 0, R4B = 0, R4C = 0, R4D = 0, R4E = 0, R4F = 0, // round 4 key
        R50 = 0, R51 = 0, R52 = 0, R53 = 0, R54 = 0, R55 = 0, R56 = 0, R57 = 0, R58 = 0, R59 = 0, R5A = 0, R5B = 0, R5C = 0, R5D = 0, R5E = 0, R5F = 0, // round 5 key
        R60 = 0, R61 = 0, R62 = 0, R63 = 0, R64 = 0, R65 = 0, R66 = 0, R67 = 0, R68 = 0, R69 = 0, R6A = 0, R6B = 0, R6C = 0, R6D = 0, R6E = 0, R6F = 0, // round 6 key
        R70 = 0, R71 = 0, R72 = 0, R73 = 0, R74 = 0, R75 = 0, R76 = 0, R77 = 0, R78 = 0, R79 = 0, R7A = 0, R7B = 0, R7C = 0, R7D = 0, R7E = 0, R7F = 0, // round 7 key
        R80 = 0, R81 = 0, R82 = 0, R83 = 0, R84 = 0, R85 = 0, R86 = 0, R87 = 0, R88 = 0, R89 = 0, R8A = 0, R8B = 0, R8C = 0, R8D = 0, R8E = 0, R8F = 0, // round 8 key
        R90 = 0, R91 = 0, R92 = 0, R93 = 0, R94 = 0, R95 = 0, R96 = 0, R97 = 0, R98 = 0, R99 = 0, R9A = 0, R9B = 0, R9C = 0, R9D = 0, R9E = 0, R9F = 0, // round 9 key
        RA0 = 0, RA1 = 0, RA2 = 0, RA3 = 0, RA4 = 0, RA5 = 0, RA6 = 0, RA7 = 0, RA8 = 0, RA9 = 0, RAA = 0, RAB = 0, RAC = 0, RAD = 0, RAE = 0, RAF = 0, // round 10 key
        RB0 = 0, RB1 = 0, RB2 = 0, RB3 = 0, RB4 = 0, RB5 = 0, RB6 = 0, RB7 = 0, RB8 = 0, RB9 = 0, RBA = 0, RBB = 0, RBC = 0, RBD = 0, RBE = 0, RBF = 0, // round 11 key
        RC0 = 0, RC1 = 0, RC2 = 0, RC3 = 0, RC4 = 0, RC5 = 0, RC6 = 0, RC7 = 0, RC8 = 0, RC9 = 0, RCA = 0, RCB = 0, RCC = 0, RCD = 0, RCE = 0, RCF = 0, // round 12 key
        RD0 = 0, RD1 = 0, RD2 = 0, RD3 = 0, RD4 = 0, RD5 = 0, RD6 = 0, RD7 = 0, RD8 = 0, RD9 = 0, RDA = 0, RDB = 0, RDC = 0, RDD = 0, RDE = 0, RDF = 0, // round 13 key
        RE0 = 0, RE1 = 0, RE2 = 0, RE3 = 0, RE4 = 0, RE5 = 0, RE6 = 0, RE7 = 0, RE8 = 0, RE9 = 0, REA = 0, REB = 0, REC = 0, RED = 0, REE = 0, REF = 0; // round 14 key

    // I/O buffer
    var HEAP = new stdlib.Uint8Array(buffer);

    function _expand_key_128 () {
        var sbox = 0;

        // key 1
        R10 = R00 ^ HEAP[sbox|R0D] ^ 0x01;
        R11 = R01 ^ HEAP[sbox|R0E];
        R12 = R02 ^ HEAP[sbox|R0F];
        R13 = R03 ^ HEAP[sbox|R0C];
        R14 = R04 ^ R10;
        R15 = R05 ^ R11;
        R16 = R06 ^ R12;
        R17 = R07 ^ R13;
        R18 = R08 ^ R14;
        R19 = R09 ^ R15;
        R1A = R0A ^ R16;
        R1B = R0B ^ R17;
        R1C = R0C ^ R18;
        R1D = R0D ^ R19;
        R1E = R0E ^ R1A;
        R1F = R0F ^ R1B;

        // key 2
        R20 = R10 ^ HEAP[sbox|R1D] ^ 0x02;
        R21 = R11 ^ HEAP[sbox|R1E];
        R22 = R12 ^ HEAP[sbox|R1F];
        R23 = R13 ^ HEAP[sbox|R1C];
        R24 = R14 ^ R20;
        R25 = R15 ^ R21;
        R26 = R16 ^ R22;
        R27 = R17 ^ R23;
        R28 = R18 ^ R24;
        R29 = R19 ^ R25;
        R2A = R1A ^ R26;
        R2B = R1B ^ R27;
        R2C = R1C ^ R28;
        R2D = R1D ^ R29;
        R2E = R1E ^ R2A;
        R2F = R1F ^ R2B;

        // key 3
        R30 = R20 ^ HEAP[sbox|R2D] ^ 0x04;
        R31 = R21 ^ HEAP[sbox|R2E];
        R32 = R22 ^ HEAP[sbox|R2F];
        R33 = R23 ^ HEAP[sbox|R2C];
        R34 = R24 ^ R30;
        R35 = R25 ^ R31;
        R36 = R26 ^ R32;
        R37 = R27 ^ R33;
        R38 = R28 ^ R34;
        R39 = R29 ^ R35;
        R3A = R2A ^ R36;
        R3B = R2B ^ R37;
        R3C = R2C ^ R38;
        R3D = R2D ^ R39;
        R3E = R2E ^ R3A;
        R3F = R2F ^ R3B;

        // key 4
        R40 = R30 ^ HEAP[sbox|R3D] ^ 0x08;
        R41 = R31 ^ HEAP[sbox|R3E];
        R42 = R32 ^ HEAP[sbox|R3F];
        R43 = R33 ^ HEAP[sbox|R3C];
        R44 = R34 ^ R40;
        R45 = R35 ^ R41;
        R46 = R36 ^ R42;
        R47 = R37 ^ R43;
        R48 = R38 ^ R44;
        R49 = R39 ^ R45;
        R4A = R3A ^ R46;
        R4B = R3B ^ R47;
        R4C = R3C ^ R48;
        R4D = R3D ^ R49;
        R4E = R3E ^ R4A;
        R4F = R3F ^ R4B;

        // key 5
        R50 = R40 ^ HEAP[sbox|R4D] ^ 0x10;
        R51 = R41 ^ HEAP[sbox|R4E];
        R52 = R42 ^ HEAP[sbox|R4F];
        R53 = R43 ^ HEAP[sbox|R4C];
        R54 = R44 ^ R50;
        R55 = R45 ^ R51;
        R56 = R46 ^ R52;
        R57 = R47 ^ R53;
        R58 = R48 ^ R54;
        R59 = R49 ^ R55;
        R5A = R4A ^ R56;
        R5B = R4B ^ R57;
        R5C = R4C ^ R58;
        R5D = R4D ^ R59;
        R5E = R4E ^ R5A;
        R5F = R4F ^ R5B;

        // key 6
        R60 = R50 ^ HEAP[sbox|R5D] ^ 0x20;
        R61 = R51 ^ HEAP[sbox|R5E];
        R62 = R52 ^ HEAP[sbox|R5F];
        R63 = R53 ^ HEAP[sbox|R5C];
        R64 = R54 ^ R60;
        R65 = R55 ^ R61;
        R66 = R56 ^ R62;
        R67 = R57 ^ R63;
        R68 = R58 ^ R64;
        R69 = R59 ^ R65;
        R6A = R5A ^ R66;
        R6B = R5B ^ R67;
        R6C = R5C ^ R68;
        R6D = R5D ^ R69;
        R6E = R5E ^ R6A;
        R6F = R5F ^ R6B;

        // key 7
        R70 = R60 ^ HEAP[sbox|R6D] ^ 0x40;
        R71 = R61 ^ HEAP[sbox|R6E];
        R72 = R62 ^ HEAP[sbox|R6F];
        R73 = R63 ^ HEAP[sbox|R6C];
        R74 = R64 ^ R70;
        R75 = R65 ^ R71;
        R76 = R66 ^ R72;
        R77 = R67 ^ R73;
        R78 = R68 ^ R74;
        R79 = R69 ^ R75;
        R7A = R6A ^ R76;
        R7B = R6B ^ R77;
        R7C = R6C ^ R78;
        R7D = R6D ^ R79;
        R7E = R6E ^ R7A;
        R7F = R6F ^ R7B;

        // key 8
        R80 = R70 ^ HEAP[sbox|R7D] ^ 0x80;
        R81 = R71 ^ HEAP[sbox|R7E];
        R82 = R72 ^ HEAP[sbox|R7F];
        R83 = R73 ^ HEAP[sbox|R7C];
        R84 = R74 ^ R80;
        R85 = R75 ^ R81;
        R86 = R76 ^ R82;
        R87 = R77 ^ R83;
        R88 = R78 ^ R84;
        R89 = R79 ^ R85;
        R8A = R7A ^ R86;
        R8B = R7B ^ R87;
        R8C = R7C ^ R88;
        R8D = R7D ^ R89;
        R8E = R7E ^ R8A;
        R8F = R7F ^ R8B;

        // key 9
        R90 = R80 ^ HEAP[sbox|R8D] ^ 0x1b;
        R91 = R81 ^ HEAP[sbox|R8E];
        R92 = R82 ^ HEAP[sbox|R8F];
        R93 = R83 ^ HEAP[sbox|R8C];
        R94 = R84 ^ R90;
        R95 = R85 ^ R91;
        R96 = R86 ^ R92;
        R97 = R87 ^ R93;
        R98 = R88 ^ R94;
        R99 = R89 ^ R95;
        R9A = R8A ^ R96;
        R9B = R8B ^ R97;
        R9C = R8C ^ R98;
        R9D = R8D ^ R99;
        R9E = R8E ^ R9A;
        R9F = R8F ^ R9B;

        // key 10
        RA0 = R90 ^ HEAP[sbox|R9D] ^ 0x36;
        RA1 = R91 ^ HEAP[sbox|R9E];
        RA2 = R92 ^ HEAP[sbox|R9F];
        RA3 = R93 ^ HEAP[sbox|R9C];
        RA4 = R94 ^ RA0;
        RA5 = R95 ^ RA1;
        RA6 = R96 ^ RA2;
        RA7 = R97 ^ RA3;
        RA8 = R98 ^ RA4;
        RA9 = R99 ^ RA5;
        RAA = R9A ^ RA6;
        RAB = R9B ^ RA7;
        RAC = R9C ^ RA8;
        RAD = R9D ^ RA9;
        RAE = R9E ^ RAA;
        RAF = R9F ^ RAB;
    }

    function _expand_key_256 () {
        var sbox = 0;

        // key 2
        R20 = R00 ^ HEAP[sbox|R1D] ^ 0x01;
        R21 = R01 ^ HEAP[sbox|R1E];
        R22 = R02 ^ HEAP[sbox|R1F];
        R23 = R03 ^ HEAP[sbox|R1C];
        R24 = R04 ^ R20;
        R25 = R05 ^ R21;
        R26 = R06 ^ R22;
        R27 = R07 ^ R23;
        R28 = R08 ^ R24;
        R29 = R09 ^ R25;
        R2A = R0A ^ R26;
        R2B = R0B ^ R27;
        R2C = R0C ^ R28;
        R2D = R0D ^ R29;
        R2E = R0E ^ R2A;
        R2F = R0F ^ R2B;

        // key 3
        R30 = R10 ^ HEAP[sbox|R2C];
        R31 = R11 ^ HEAP[sbox|R2D];
        R32 = R12 ^ HEAP[sbox|R2E];
        R33 = R13 ^ HEAP[sbox|R2F];
        R34 = R14 ^ R30;
        R35 = R15 ^ R31;
        R36 = R16 ^ R32;
        R37 = R17 ^ R33;
        R38 = R18 ^ R34;
        R39 = R19 ^ R35;
        R3A = R1A ^ R36;
        R3B = R1B ^ R37;
        R3C = R1C ^ R38;
        R3D = R1D ^ R39;
        R3E = R1E ^ R3A;
        R3F = R1F ^ R3B;

        // key 4
        R40 = R20 ^ HEAP[sbox|R3D] ^ 0x02;
        R41 = R21 ^ HEAP[sbox|R3E];
        R42 = R22 ^ HEAP[sbox|R3F];
        R43 = R23 ^ HEAP[sbox|R3C];
        R44 = R24 ^ R40;
        R45 = R25 ^ R41;
        R46 = R26 ^ R42;
        R47 = R27 ^ R43;
        R48 = R28 ^ R44;
        R49 = R29 ^ R45;
        R4A = R2A ^ R46;
        R4B = R2B ^ R47;
        R4C = R2C ^ R48;
        R4D = R2D ^ R49;
        R4E = R2E ^ R4A;
        R4F = R2F ^ R4B;

        // key 5
        R50 = R30 ^ HEAP[sbox|R4C];
        R51 = R31 ^ HEAP[sbox|R4D];
        R52 = R32 ^ HEAP[sbox|R4E];
        R53 = R33 ^ HEAP[sbox|R4F];
        R54 = R34 ^ R50;
        R55 = R35 ^ R51;
        R56 = R36 ^ R52;
        R57 = R37 ^ R53;
        R58 = R38 ^ R54;
        R59 = R39 ^ R55;
        R5A = R3A ^ R56;
        R5B = R3B ^ R57;
        R5C = R3C ^ R58;
        R5D = R3D ^ R59;
        R5E = R3E ^ R5A;
        R5F = R3F ^ R5B;

        // key 6
        R60 = R40 ^ HEAP[sbox|R5D] ^ 0x04;
        R61 = R41 ^ HEAP[sbox|R5E];
        R62 = R42 ^ HEAP[sbox|R5F];
        R63 = R43 ^ HEAP[sbox|R5C];
        R64 = R44 ^ R60;
        R65 = R45 ^ R61;
        R66 = R46 ^ R62;
        R67 = R47 ^ R63;
        R68 = R48 ^ R64;
        R69 = R49 ^ R65;
        R6A = R4A ^ R66;
        R6B = R4B ^ R67;
        R6C = R4C ^ R68;
        R6D = R4D ^ R69;
        R6E = R4E ^ R6A;
        R6F = R4F ^ R6B;

        // key 7
        R70 = R50 ^ HEAP[sbox|R6C];
        R71 = R51 ^ HEAP[sbox|R6D];
        R72 = R52 ^ HEAP[sbox|R6E];
        R73 = R53 ^ HEAP[sbox|R6F];
        R74 = R54 ^ R70;
        R75 = R55 ^ R71;
        R76 = R56 ^ R72;
        R77 = R57 ^ R73;
        R78 = R58 ^ R74;
        R79 = R59 ^ R75;
        R7A = R5A ^ R76;
        R7B = R5B ^ R77;
        R7C = R5C ^ R78;
        R7D = R5D ^ R79;
        R7E = R5E ^ R7A;
        R7F = R5F ^ R7B;

        // key 8
        R80 = R60 ^ HEAP[sbox|R7D] ^ 0x08;
        R81 = R61 ^ HEAP[sbox|R7E];
        R82 = R62 ^ HEAP[sbox|R7F];
        R83 = R63 ^ HEAP[sbox|R7C];
        R84 = R64 ^ R80;
        R85 = R65 ^ R81;
        R86 = R66 ^ R82;
        R87 = R67 ^ R83;
        R88 = R68 ^ R84;
        R89 = R69 ^ R85;
        R8A = R6A ^ R86;
        R8B = R6B ^ R87;
        R8C = R6C ^ R88;
        R8D = R6D ^ R89;
        R8E = R6E ^ R8A;
        R8F = R6F ^ R8B;

        // key 9
        R90 = R70 ^ HEAP[sbox|R8C];
        R91 = R71 ^ HEAP[sbox|R8D];
        R92 = R72 ^ HEAP[sbox|R8E];
        R93 = R73 ^ HEAP[sbox|R8F];
        R94 = R74 ^ R90;
        R95 = R75 ^ R91;
        R96 = R76 ^ R92;
        R97 = R77 ^ R93;
        R98 = R78 ^ R94;
        R99 = R79 ^ R95;
        R9A = R7A ^ R96;
        R9B = R7B ^ R97;
        R9C = R7C ^ R98;
        R9D = R7D ^ R99;
        R9E = R7E ^ R9A;
        R9F = R7F ^ R9B;

        // key 10
        RA0 = R80 ^ HEAP[sbox|R9D] ^ 0x10;
        RA1 = R81 ^ HEAP[sbox|R9E];
        RA2 = R82 ^ HEAP[sbox|R9F];
        RA3 = R83 ^ HEAP[sbox|R9C];
        RA4 = R84 ^ RA0;
        RA5 = R85 ^ RA1;
        RA6 = R86 ^ RA2;
        RA7 = R87 ^ RA3;
        RA8 = R88 ^ RA4;
        RA9 = R89 ^ RA5;
        RAA = R8A ^ RA6;
        RAB = R8B ^ RA7;
        RAC = R8C ^ RA8;
        RAD = R8D ^ RA9;
        RAE = R8E ^ RAA;
        RAF = R8F ^ RAB;

        // key 11
        RB0 = R90 ^ HEAP[sbox|RAC];
        RB1 = R91 ^ HEAP[sbox|RAD];
        RB2 = R92 ^ HEAP[sbox|RAE];
        RB3 = R93 ^ HEAP[sbox|RAF];
        RB4 = R94 ^ RB0;
        RB5 = R95 ^ RB1;
        RB6 = R96 ^ RB2;
        RB7 = R97 ^ RB3;
        RB8 = R98 ^ RB4;
        RB9 = R99 ^ RB5;
        RBA = R9A ^ RB6;
        RBB = R9B ^ RB7;
        RBC = R9C ^ RB8;
        RBD = R9D ^ RB9;
        RBE = R9E ^ RBA;
        RBF = R9F ^ RBB;

        // key 12
        RC0 = RA0 ^ HEAP[sbox|RBD] ^ 0x20;
        RC1 = RA1 ^ HEAP[sbox|RBE];
        RC2 = RA2 ^ HEAP[sbox|RBF];
        RC3 = RA3 ^ HEAP[sbox|RBC];
        RC4 = RA4 ^ RC0;
        RC5 = RA5 ^ RC1;
        RC6 = RA6 ^ RC2;
        RC7 = RA7 ^ RC3;
        RC8 = RA8 ^ RC4;
        RC9 = RA9 ^ RC5;
        RCA = RAA ^ RC6;
        RCB = RAB ^ RC7;
        RCC = RAC ^ RC8;
        RCD = RAD ^ RC9;
        RCE = RAE ^ RCA;
        RCF = RAF ^ RCB;

        // key 13
        RD0 = RB0 ^ HEAP[sbox|RCC];
        RD1 = RB1 ^ HEAP[sbox|RCD];
        RD2 = RB2 ^ HEAP[sbox|RCE];
        RD3 = RB3 ^ HEAP[sbox|RCF];
        RD4 = RB4 ^ RD0;
        RD5 = RB5 ^ RD1;
        RD6 = RB6 ^ RD2;
        RD7 = RB7 ^ RD3;
        RD8 = RB8 ^ RD4;
        RD9 = RB9 ^ RD5;
        RDA = RBA ^ RD6;
        RDB = RBB ^ RD7;
        RDC = RBC ^ RD8;
        RDD = RBD ^ RD9;
        RDE = RBE ^ RDA;
        RDF = RBF ^ RDB;

        // key 14
        RE0 = RC0 ^ HEAP[sbox|RDD] ^ 0x40;
        RE1 = RC1 ^ HEAP[sbox|RDE];
        RE2 = RC2 ^ HEAP[sbox|RDF];
        RE3 = RC3 ^ HEAP[sbox|RDC];
        RE4 = RC4 ^ RE0;
        RE5 = RC5 ^ RE1;
        RE6 = RC6 ^ RE2;
        RE7 = RC7 ^ RE3;
        RE8 = RC8 ^ RE4;
        RE9 = RC9 ^ RE5;
        REA = RCA ^ RE6;
        REB = RCB ^ RE7;
        REC = RCC ^ RE8;
        RED = RCD ^ RE9;
        REE = RCE ^ REA;
        REF = RCF ^ REB;
    }

    function _encrypt ( s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, sA, sB, sC, sD, sE, sF ) {
        s0 = s0|0;
        s1 = s1|0;
        s2 = s2|0;
        s3 = s3|0;
        s4 = s4|0;
        s5 = s5|0;
        s6 = s6|0;
        s7 = s7|0;
        s8 = s8|0;
        s9 = s9|0;
        sA = sA|0;
        sB = sB|0;
        sC = sC|0;
        sD = sD|0;
        sE = sE|0;
        sF = sF|0;

        var t0 = 0, t1 = 0, t2 = 0, t3 = 0, t4 = 0, t5 = 0, t6 = 0, t7 = 0, t8 = 0, t9 = 0, tA = 0, tB = 0, tC = 0, tD = 0, tE = 0, tF = 0,
            sbox = 0, x2_sbox = 0x200, x3_sbox = 0x300;

        // round 0
        s0 = s0 ^ R00;
        s1 = s1 ^ R01;
        s2 = s2 ^ R02;
        s3 = s3 ^ R03;
        s4 = s4 ^ R04;
        s5 = s5 ^ R05;
        s6 = s6 ^ R06;
        s7 = s7 ^ R07;
        s8 = s8 ^ R08;
        s9 = s9 ^ R09;
        sA = sA ^ R0A;
        sB = sB ^ R0B;
        sC = sC ^ R0C;
        sD = sD ^ R0D;
        sE = sE ^ R0E;
        sF = sF ^ R0F;

        // round 1
        t0 = HEAP[x2_sbox|s0] ^ HEAP[x3_sbox|s5] ^ HEAP[sbox|sA] ^ HEAP[sbox|sF] ^ R10;
        t1 = HEAP[sbox|s0] ^ HEAP[x2_sbox|s5] ^ HEAP[x3_sbox|sA] ^ HEAP[sbox|sF] ^ R11;
        t2 = HEAP[sbox|s0] ^ HEAP[sbox|s5] ^ HEAP[x2_sbox|sA] ^ HEAP[x3_sbox|sF] ^ R12;
        t3 = HEAP[x3_sbox|s0] ^ HEAP[sbox|s5] ^ HEAP[sbox|sA] ^ HEAP[x2_sbox|sF] ^ R13;
        t4 = HEAP[x2_sbox|s4] ^ HEAP[x3_sbox|s9] ^ HEAP[sbox|sE] ^ HEAP[sbox|s3] ^ R14;
        t5 = HEAP[sbox|s4] ^ HEAP[x2_sbox|s9] ^ HEAP[x3_sbox|sE] ^ HEAP[sbox|s3] ^ R15;
        t6 = HEAP[sbox|s4] ^ HEAP[sbox|s9] ^ HEAP[x2_sbox|sE] ^ HEAP[x3_sbox|s3] ^ R16;
        t7 = HEAP[x3_sbox|s4] ^ HEAP[sbox|s9] ^ HEAP[sbox|sE] ^ HEAP[x2_sbox|s3] ^ R17;
        t8 = HEAP[x2_sbox|s8] ^ HEAP[x3_sbox|sD] ^ HEAP[sbox|s2] ^ HEAP[sbox|s7] ^ R18;
        t9 = HEAP[sbox|s8] ^ HEAP[x2_sbox|sD] ^ HEAP[x3_sbox|s2] ^ HEAP[sbox|s7] ^ R19;
        tA = HEAP[sbox|s8] ^ HEAP[sbox|sD] ^ HEAP[x2_sbox|s2] ^ HEAP[x3_sbox|s7] ^ R1A;
        tB = HEAP[x3_sbox|s8] ^ HEAP[sbox|sD] ^ HEAP[sbox|s2] ^ HEAP[x2_sbox|s7] ^ R1B;
        tC = HEAP[x2_sbox|sC] ^ HEAP[x3_sbox|s1] ^ HEAP[sbox|s6] ^ HEAP[sbox|sB] ^ R1C;
        tD = HEAP[sbox|sC] ^ HEAP[x2_sbox|s1] ^ HEAP[x3_sbox|s6] ^ HEAP[sbox|sB] ^ R1D;
        tE = HEAP[sbox|sC] ^ HEAP[sbox|s1] ^ HEAP[x2_sbox|s6] ^ HEAP[x3_sbox|sB] ^ R1E;
        tF = HEAP[x3_sbox|sC] ^ HEAP[sbox|s1] ^ HEAP[sbox|s6] ^ HEAP[x2_sbox|sB] ^ R1F;

        // round 2
        s0 = HEAP[x2_sbox|t0] ^ HEAP[x3_sbox|t5] ^ HEAP[sbox|tA] ^ HEAP[sbox|tF] ^ R20;
        s1 = HEAP[sbox|t0] ^ HEAP[x2_sbox|t5] ^ HEAP[x3_sbox|tA] ^ HEAP[sbox|tF] ^ R21;
        s2 = HEAP[sbox|t0] ^ HEAP[sbox|t5] ^ HEAP[x2_sbox|tA] ^ HEAP[x3_sbox|tF] ^ R22;
        s3 = HEAP[x3_sbox|t0] ^ HEAP[sbox|t5] ^ HEAP[sbox|tA] ^ HEAP[x2_sbox|tF] ^ R23;
        s4 = HEAP[x2_sbox|t4] ^ HEAP[x3_sbox|t9] ^ HEAP[sbox|tE] ^ HEAP[sbox|t3] ^ R24;
        s5 = HEAP[sbox|t4] ^ HEAP[x2_sbox|t9] ^ HEAP[x3_sbox|tE] ^ HEAP[sbox|t3] ^ R25;
        s6 = HEAP[sbox|t4] ^ HEAP[sbox|t9] ^ HEAP[x2_sbox|tE] ^ HEAP[x3_sbox|t3] ^ R26;
        s7 = HEAP[x3_sbox|t4] ^ HEAP[sbox|t9] ^ HEAP[sbox|tE] ^ HEAP[x2_sbox|t3] ^ R27;
        s8 = HEAP[x2_sbox|t8] ^ HEAP[x3_sbox|tD] ^ HEAP[sbox|t2] ^ HEAP[sbox|t7] ^ R28;
        s9 = HEAP[sbox|t8] ^ HEAP[x2_sbox|tD] ^ HEAP[x3_sbox|t2] ^ HEAP[sbox|t7] ^ R29;
        sA = HEAP[sbox|t8] ^ HEAP[sbox|tD] ^ HEAP[x2_sbox|t2] ^ HEAP[x3_sbox|t7] ^ R2A;
        sB = HEAP[x3_sbox|t8] ^ HEAP[sbox|tD] ^ HEAP[sbox|t2] ^ HEAP[x2_sbox|t7] ^ R2B;
        sC = HEAP[x2_sbox|tC] ^ HEAP[x3_sbox|t1] ^ HEAP[sbox|t6] ^ HEAP[sbox|tB] ^ R2C;
        sD = HEAP[sbox|tC] ^ HEAP[x2_sbox|t1] ^ HEAP[x3_sbox|t6] ^ HEAP[sbox|tB] ^ R2D;
        sE = HEAP[sbox|tC] ^ HEAP[sbox|t1] ^ HEAP[x2_sbox|t6] ^ HEAP[x3_sbox|tB] ^ R2E;
        sF = HEAP[x3_sbox|tC] ^ HEAP[sbox|t1] ^ HEAP[sbox|t6] ^ HEAP[x2_sbox|tB] ^ R2F;

        // round 3
        t0 = HEAP[x2_sbox|s0] ^ HEAP[x3_sbox|s5] ^ HEAP[sbox|sA] ^ HEAP[sbox|sF] ^ R30;
        t1 = HEAP[sbox|s0] ^ HEAP[x2_sbox|s5] ^ HEAP[x3_sbox|sA] ^ HEAP[sbox|sF] ^ R31;
        t2 = HEAP[sbox|s0] ^ HEAP[sbox|s5] ^ HEAP[x2_sbox|sA] ^ HEAP[x3_sbox|sF] ^ R32;
        t3 = HEAP[x3_sbox|s0] ^ HEAP[sbox|s5] ^ HEAP[sbox|sA] ^ HEAP[x2_sbox|sF] ^ R33;
        t4 = HEAP[x2_sbox|s4] ^ HEAP[x3_sbox|s9] ^ HEAP[sbox|sE] ^ HEAP[sbox|s3] ^ R34;
        t5 = HEAP[sbox|s4] ^ HEAP[x2_sbox|s9] ^ HEAP[x3_sbox|sE] ^ HEAP[sbox|s3] ^ R35;
        t6 = HEAP[sbox|s4] ^ HEAP[sbox|s9] ^ HEAP[x2_sbox|sE] ^ HEAP[x3_sbox|s3] ^ R36;
        t7 = HEAP[x3_sbox|s4] ^ HEAP[sbox|s9] ^ HEAP[sbox|sE] ^ HEAP[x2_sbox|s3] ^ R37;
        t8 = HEAP[x2_sbox|s8] ^ HEAP[x3_sbox|sD] ^ HEAP[sbox|s2] ^ HEAP[sbox|s7] ^ R38;
        t9 = HEAP[sbox|s8] ^ HEAP[x2_sbox|sD] ^ HEAP[x3_sbox|s2] ^ HEAP[sbox|s7] ^ R39;
        tA = HEAP[sbox|s8] ^ HEAP[sbox|sD] ^ HEAP[x2_sbox|s2] ^ HEAP[x3_sbox|s7] ^ R3A;
        tB = HEAP[x3_sbox|s8] ^ HEAP[sbox|sD] ^ HEAP[sbox|s2] ^ HEAP[x2_sbox|s7] ^ R3B;
        tC = HEAP[x2_sbox|sC] ^ HEAP[x3_sbox|s1] ^ HEAP[sbox|s6] ^ HEAP[sbox|sB] ^ R3C;
        tD = HEAP[sbox|sC] ^ HEAP[x2_sbox|s1] ^ HEAP[x3_sbox|s6] ^ HEAP[sbox|sB] ^ R3D;
        tE = HEAP[sbox|sC] ^ HEAP[sbox|s1] ^ HEAP[x2_sbox|s6] ^ HEAP[x3_sbox|sB] ^ R3E;
        tF = HEAP[x3_sbox|sC] ^ HEAP[sbox|s1] ^ HEAP[sbox|s6] ^ HEAP[x2_sbox|sB] ^ R3F;

        // round 4
        s0 = HEAP[x2_sbox|t0] ^ HEAP[x3_sbox|t5] ^ HEAP[sbox|tA] ^ HEAP[sbox|tF] ^ R40;
        s1 = HEAP[sbox|t0] ^ HEAP[x2_sbox|t5] ^ HEAP[x3_sbox|tA] ^ HEAP[sbox|tF] ^ R41;
        s2 = HEAP[sbox|t0] ^ HEAP[sbox|t5] ^ HEAP[x2_sbox|tA] ^ HEAP[x3_sbox|tF] ^ R42;
        s3 = HEAP[x3_sbox|t0] ^ HEAP[sbox|t5] ^ HEAP[sbox|tA] ^ HEAP[x2_sbox|tF] ^ R43;
        s4 = HEAP[x2_sbox|t4] ^ HEAP[x3_sbox|t9] ^ HEAP[sbox|tE] ^ HEAP[sbox|t3] ^ R44;
        s5 = HEAP[sbox|t4] ^ HEAP[x2_sbox|t9] ^ HEAP[x3_sbox|tE] ^ HEAP[sbox|t3] ^ R45;
        s6 = HEAP[sbox|t4] ^ HEAP[sbox|t9] ^ HEAP[x2_sbox|tE] ^ HEAP[x3_sbox|t3] ^ R46;
        s7 = HEAP[x3_sbox|t4] ^ HEAP[sbox|t9] ^ HEAP[sbox|tE] ^ HEAP[x2_sbox|t3] ^ R47;
        s8 = HEAP[x2_sbox|t8] ^ HEAP[x3_sbox|tD] ^ HEAP[sbox|t2] ^ HEAP[sbox|t7] ^ R48;
        s9 = HEAP[sbox|t8] ^ HEAP[x2_sbox|tD] ^ HEAP[x3_sbox|t2] ^ HEAP[sbox|t7] ^ R49;
        sA = HEAP[sbox|t8] ^ HEAP[sbox|tD] ^ HEAP[x2_sbox|t2] ^ HEAP[x3_sbox|t7] ^ R4A;
        sB = HEAP[x3_sbox|t8] ^ HEAP[sbox|tD] ^ HEAP[sbox|t2] ^ HEAP[x2_sbox|t7] ^ R4B;
        sC = HEAP[x2_sbox|tC] ^ HEAP[x3_sbox|t1] ^ HEAP[sbox|t6] ^ HEAP[sbox|tB] ^ R4C;
        sD = HEAP[sbox|tC] ^ HEAP[x2_sbox|t1] ^ HEAP[x3_sbox|t6] ^ HEAP[sbox|tB] ^ R4D;
        sE = HEAP[sbox|tC] ^ HEAP[sbox|t1] ^ HEAP[x2_sbox|t6] ^ HEAP[x3_sbox|tB] ^ R4E;
        sF = HEAP[x3_sbox|tC] ^ HEAP[sbox|t1] ^ HEAP[sbox|t6] ^ HEAP[x2_sbox|tB] ^ R4F;

        // round 5
        t0 = HEAP[x2_sbox|s0] ^ HEAP[x3_sbox|s5] ^ HEAP[sbox|sA] ^ HEAP[sbox|sF] ^ R50;
        t1 = HEAP[sbox|s0] ^ HEAP[x2_sbox|s5] ^ HEAP[x3_sbox|sA] ^ HEAP[sbox|sF] ^ R51;
        t2 = HEAP[sbox|s0] ^ HEAP[sbox|s5] ^ HEAP[x2_sbox|sA] ^ HEAP[x3_sbox|sF] ^ R52;
        t3 = HEAP[x3_sbox|s0] ^ HEAP[sbox|s5] ^ HEAP[sbox|sA] ^ HEAP[x2_sbox|sF] ^ R53;
        t4 = HEAP[x2_sbox|s4] ^ HEAP[x3_sbox|s9] ^ HEAP[sbox|sE] ^ HEAP[sbox|s3] ^ R54;
        t5 = HEAP[sbox|s4] ^ HEAP[x2_sbox|s9] ^ HEAP[x3_sbox|sE] ^ HEAP[sbox|s3] ^ R55;
        t6 = HEAP[sbox|s4] ^ HEAP[sbox|s9] ^ HEAP[x2_sbox|sE] ^ HEAP[x3_sbox|s3] ^ R56;
        t7 = HEAP[x3_sbox|s4] ^ HEAP[sbox|s9] ^ HEAP[sbox|sE] ^ HEAP[x2_sbox|s3] ^ R57;
        t8 = HEAP[x2_sbox|s8] ^ HEAP[x3_sbox|sD] ^ HEAP[sbox|s2] ^ HEAP[sbox|s7] ^ R58;
        t9 = HEAP[sbox|s8] ^ HEAP[x2_sbox|sD] ^ HEAP[x3_sbox|s2] ^ HEAP[sbox|s7] ^ R59;
        tA = HEAP[sbox|s8] ^ HEAP[sbox|sD] ^ HEAP[x2_sbox|s2] ^ HEAP[x3_sbox|s7] ^ R5A;
        tB = HEAP[x3_sbox|s8] ^ HEAP[sbox|sD] ^ HEAP[sbox|s2] ^ HEAP[x2_sbox|s7] ^ R5B;
        tC = HEAP[x2_sbox|sC] ^ HEAP[x3_sbox|s1] ^ HEAP[sbox|s6] ^ HEAP[sbox|sB] ^ R5C;
        tD = HEAP[sbox|sC] ^ HEAP[x2_sbox|s1] ^ HEAP[x3_sbox|s6] ^ HEAP[sbox|sB] ^ R5D;
        tE = HEAP[sbox|sC] ^ HEAP[sbox|s1] ^ HEAP[x2_sbox|s6] ^ HEAP[x3_sbox|sB] ^ R5E;
        tF = HEAP[x3_sbox|sC] ^ HEAP[sbox|s1] ^ HEAP[sbox|s6] ^ HEAP[x2_sbox|sB] ^ R5F;

        // round 6
        s0 = HEAP[x2_sbox|t0] ^ HEAP[x3_sbox|t5] ^ HEAP[sbox|tA] ^ HEAP[sbox|tF] ^ R60;
        s1 = HEAP[sbox|t0] ^ HEAP[x2_sbox|t5] ^ HEAP[x3_sbox|tA] ^ HEAP[sbox|tF] ^ R61;
        s2 = HEAP[sbox|t0] ^ HEAP[sbox|t5] ^ HEAP[x2_sbox|tA] ^ HEAP[x3_sbox|tF] ^ R62;
        s3 = HEAP[x3_sbox|t0] ^ HEAP[sbox|t5] ^ HEAP[sbox|tA] ^ HEAP[x2_sbox|tF] ^ R63;
        s4 = HEAP[x2_sbox|t4] ^ HEAP[x3_sbox|t9] ^ HEAP[sbox|tE] ^ HEAP[sbox|t3] ^ R64;
        s5 = HEAP[sbox|t4] ^ HEAP[x2_sbox|t9] ^ HEAP[x3_sbox|tE] ^ HEAP[sbox|t3] ^ R65;
        s6 = HEAP[sbox|t4] ^ HEAP[sbox|t9] ^ HEAP[x2_sbox|tE] ^ HEAP[x3_sbox|t3] ^ R66;
        s7 = HEAP[x3_sbox|t4] ^ HEAP[sbox|t9] ^ HEAP[sbox|tE] ^ HEAP[x2_sbox|t3] ^ R67;
        s8 = HEAP[x2_sbox|t8] ^ HEAP[x3_sbox|tD] ^ HEAP[sbox|t2] ^ HEAP[sbox|t7] ^ R68;
        s9 = HEAP[sbox|t8] ^ HEAP[x2_sbox|tD] ^ HEAP[x3_sbox|t2] ^ HEAP[sbox|t7] ^ R69;
        sA = HEAP[sbox|t8] ^ HEAP[sbox|tD] ^ HEAP[x2_sbox|t2] ^ HEAP[x3_sbox|t7] ^ R6A;
        sB = HEAP[x3_sbox|t8] ^ HEAP[sbox|tD] ^ HEAP[sbox|t2] ^ HEAP[x2_sbox|t7] ^ R6B;
        sC = HEAP[x2_sbox|tC] ^ HEAP[x3_sbox|t1] ^ HEAP[sbox|t6] ^ HEAP[sbox|tB] ^ R6C;
        sD = HEAP[sbox|tC] ^ HEAP[x2_sbox|t1] ^ HEAP[x3_sbox|t6] ^ HEAP[sbox|tB] ^ R6D;
        sE = HEAP[sbox|tC] ^ HEAP[sbox|t1] ^ HEAP[x2_sbox|t6] ^ HEAP[x3_sbox|tB] ^ R6E;
        sF = HEAP[x3_sbox|tC] ^ HEAP[sbox|t1] ^ HEAP[sbox|t6] ^ HEAP[x2_sbox|tB] ^ R6F;

        // round 7
        t0 = HEAP[x2_sbox|s0] ^ HEAP[x3_sbox|s5] ^ HEAP[sbox|sA] ^ HEAP[sbox|sF] ^ R70;
        t1 = HEAP[sbox|s0] ^ HEAP[x2_sbox|s5] ^ HEAP[x3_sbox|sA] ^ HEAP[sbox|sF] ^ R71;
        t2 = HEAP[sbox|s0] ^ HEAP[sbox|s5] ^ HEAP[x2_sbox|sA] ^ HEAP[x3_sbox|sF] ^ R72;
        t3 = HEAP[x3_sbox|s0] ^ HEAP[sbox|s5] ^ HEAP[sbox|sA] ^ HEAP[x2_sbox|sF] ^ R73;
        t4 = HEAP[x2_sbox|s4] ^ HEAP[x3_sbox|s9] ^ HEAP[sbox|sE] ^ HEAP[sbox|s3] ^ R74;
        t5 = HEAP[sbox|s4] ^ HEAP[x2_sbox|s9] ^ HEAP[x3_sbox|sE] ^ HEAP[sbox|s3] ^ R75;
        t6 = HEAP[sbox|s4] ^ HEAP[sbox|s9] ^ HEAP[x2_sbox|sE] ^ HEAP[x3_sbox|s3] ^ R76;
        t7 = HEAP[x3_sbox|s4] ^ HEAP[sbox|s9] ^ HEAP[sbox|sE] ^ HEAP[x2_sbox|s3] ^ R77;
        t8 = HEAP[x2_sbox|s8] ^ HEAP[x3_sbox|sD] ^ HEAP[sbox|s2] ^ HEAP[sbox|s7] ^ R78;
        t9 = HEAP[sbox|s8] ^ HEAP[x2_sbox|sD] ^ HEAP[x3_sbox|s2] ^ HEAP[sbox|s7] ^ R79;
        tA = HEAP[sbox|s8] ^ HEAP[sbox|sD] ^ HEAP[x2_sbox|s2] ^ HEAP[x3_sbox|s7] ^ R7A;
        tB = HEAP[x3_sbox|s8] ^ HEAP[sbox|sD] ^ HEAP[sbox|s2] ^ HEAP[x2_sbox|s7] ^ R7B;
        tC = HEAP[x2_sbox|sC] ^ HEAP[x3_sbox|s1] ^ HEAP[sbox|s6] ^ HEAP[sbox|sB] ^ R7C;
        tD = HEAP[sbox|sC] ^ HEAP[x2_sbox|s1] ^ HEAP[x3_sbox|s6] ^ HEAP[sbox|sB] ^ R7D;
        tE = HEAP[sbox|sC] ^ HEAP[sbox|s1] ^ HEAP[x2_sbox|s6] ^ HEAP[x3_sbox|sB] ^ R7E;
        tF = HEAP[x3_sbox|sC] ^ HEAP[sbox|s1] ^ HEAP[sbox|s6] ^ HEAP[x2_sbox|sB] ^ R7F;

        // round 8
        s0 = HEAP[x2_sbox|t0] ^ HEAP[x3_sbox|t5] ^ HEAP[sbox|tA] ^ HEAP[sbox|tF] ^ R80;
        s1 = HEAP[sbox|t0] ^ HEAP[x2_sbox|t5] ^ HEAP[x3_sbox|tA] ^ HEAP[sbox|tF] ^ R81;
        s2 = HEAP[sbox|t0] ^ HEAP[sbox|t5] ^ HEAP[x2_sbox|tA] ^ HEAP[x3_sbox|tF] ^ R82;
        s3 = HEAP[x3_sbox|t0] ^ HEAP[sbox|t5] ^ HEAP[sbox|tA] ^ HEAP[x2_sbox|tF] ^ R83;
        s4 = HEAP[x2_sbox|t4] ^ HEAP[x3_sbox|t9] ^ HEAP[sbox|tE] ^ HEAP[sbox|t3] ^ R84;
        s5 = HEAP[sbox|t4] ^ HEAP[x2_sbox|t9] ^ HEAP[x3_sbox|tE] ^ HEAP[sbox|t3] ^ R85;
        s6 = HEAP[sbox|t4] ^ HEAP[sbox|t9] ^ HEAP[x2_sbox|tE] ^ HEAP[x3_sbox|t3] ^ R86;
        s7 = HEAP[x3_sbox|t4] ^ HEAP[sbox|t9] ^ HEAP[sbox|tE] ^ HEAP[x2_sbox|t3] ^ R87;
        s8 = HEAP[x2_sbox|t8] ^ HEAP[x3_sbox|tD] ^ HEAP[sbox|t2] ^ HEAP[sbox|t7] ^ R88;
        s9 = HEAP[sbox|t8] ^ HEAP[x2_sbox|tD] ^ HEAP[x3_sbox|t2] ^ HEAP[sbox|t7] ^ R89;
        sA = HEAP[sbox|t8] ^ HEAP[sbox|tD] ^ HEAP[x2_sbox|t2] ^ HEAP[x3_sbox|t7] ^ R8A;
        sB = HEAP[x3_sbox|t8] ^ HEAP[sbox|tD] ^ HEAP[sbox|t2] ^ HEAP[x2_sbox|t7] ^ R8B;
        sC = HEAP[x2_sbox|tC] ^ HEAP[x3_sbox|t1] ^ HEAP[sbox|t6] ^ HEAP[sbox|tB] ^ R8C;
        sD = HEAP[sbox|tC] ^ HEAP[x2_sbox|t1] ^ HEAP[x3_sbox|t6] ^ HEAP[sbox|tB] ^ R8D;
        sE = HEAP[sbox|tC] ^ HEAP[sbox|t1] ^ HEAP[x2_sbox|t6] ^ HEAP[x3_sbox|tB] ^ R8E;
        sF = HEAP[x3_sbox|tC] ^ HEAP[sbox|t1] ^ HEAP[sbox|t6] ^ HEAP[x2_sbox|tB] ^ R8F;

        // round 9
        t0 = HEAP[x2_sbox|s0] ^ HEAP[x3_sbox|s5] ^ HEAP[sbox|sA] ^ HEAP[sbox|sF] ^ R90;
        t1 = HEAP[sbox|s0] ^ HEAP[x2_sbox|s5] ^ HEAP[x3_sbox|sA] ^ HEAP[sbox|sF] ^ R91;
        t2 = HEAP[sbox|s0] ^ HEAP[sbox|s5] ^ HEAP[x2_sbox|sA] ^ HEAP[x3_sbox|sF] ^ R92;
        t3 = HEAP[x3_sbox|s0] ^ HEAP[sbox|s5] ^ HEAP[sbox|sA] ^ HEAP[x2_sbox|sF] ^ R93;
        t4 = HEAP[x2_sbox|s4] ^ HEAP[x3_sbox|s9] ^ HEAP[sbox|sE] ^ HEAP[sbox|s3] ^ R94;
        t5 = HEAP[sbox|s4] ^ HEAP[x2_sbox|s9] ^ HEAP[x3_sbox|sE] ^ HEAP[sbox|s3] ^ R95;
        t6 = HEAP[sbox|s4] ^ HEAP[sbox|s9] ^ HEAP[x2_sbox|sE] ^ HEAP[x3_sbox|s3] ^ R96;
        t7 = HEAP[x3_sbox|s4] ^ HEAP[sbox|s9] ^ HEAP[sbox|sE] ^ HEAP[x2_sbox|s3] ^ R97;
        t8 = HEAP[x2_sbox|s8] ^ HEAP[x3_sbox|sD] ^ HEAP[sbox|s2] ^ HEAP[sbox|s7] ^ R98;
        t9 = HEAP[sbox|s8] ^ HEAP[x2_sbox|sD] ^ HEAP[x3_sbox|s2] ^ HEAP[sbox|s7] ^ R99;
        tA = HEAP[sbox|s8] ^ HEAP[sbox|sD] ^ HEAP[x2_sbox|s2] ^ HEAP[x3_sbox|s7] ^ R9A;
        tB = HEAP[x3_sbox|s8] ^ HEAP[sbox|sD] ^ HEAP[sbox|s2] ^ HEAP[x2_sbox|s7] ^ R9B;
        tC = HEAP[x2_sbox|sC] ^ HEAP[x3_sbox|s1] ^ HEAP[sbox|s6] ^ HEAP[sbox|sB] ^ R9C;
        tD = HEAP[sbox|sC] ^ HEAP[x2_sbox|s1] ^ HEAP[x3_sbox|s6] ^ HEAP[sbox|sB] ^ R9D;
        tE = HEAP[sbox|sC] ^ HEAP[sbox|s1] ^ HEAP[x2_sbox|s6] ^ HEAP[x3_sbox|sB] ^ R9E;
        tF = HEAP[x3_sbox|sC] ^ HEAP[sbox|s1] ^ HEAP[sbox|s6] ^ HEAP[x2_sbox|sB] ^ R9F;

        if ( (keySize|0) == 16 ) {
            // round 10
            S0 = HEAP[sbox|t0] ^ RA0;
            S1 = HEAP[sbox|t5] ^ RA1;
            S2 = HEAP[sbox|tA] ^ RA2;
            S3 = HEAP[sbox|tF] ^ RA3;
            S4 = HEAP[sbox|t4] ^ RA4;
            S5 = HEAP[sbox|t9] ^ RA5;
            S6 = HEAP[sbox|tE] ^ RA6;
            S7 = HEAP[sbox|t3] ^ RA7;
            S8 = HEAP[sbox|t8] ^ RA8;
            S9 = HEAP[sbox|tD] ^ RA9;
            SA = HEAP[sbox|t2] ^ RAA;
            SB = HEAP[sbox|t7] ^ RAB;
            SC = HEAP[sbox|tC] ^ RAC;
            SD = HEAP[sbox|t1] ^ RAD;
            SE = HEAP[sbox|t6] ^ RAE;
            SF = HEAP[sbox|tB] ^ RAF;

            return;
        }

        // round 10
        s0 = HEAP[x2_sbox|t0] ^ HEAP[x3_sbox|t5] ^ HEAP[sbox|tA] ^ HEAP[sbox|tF] ^ RA0;
        s1 = HEAP[sbox|t0] ^ HEAP[x2_sbox|t5] ^ HEAP[x3_sbox|tA] ^ HEAP[sbox|tF] ^ RA1;
        s2 = HEAP[sbox|t0] ^ HEAP[sbox|t5] ^ HEAP[x2_sbox|tA] ^ HEAP[x3_sbox|tF] ^ RA2;
        s3 = HEAP[x3_sbox|t0] ^ HEAP[sbox|t5] ^ HEAP[sbox|tA] ^ HEAP[x2_sbox|tF] ^ RA3;
        s4 = HEAP[x2_sbox|t4] ^ HEAP[x3_sbox|t9] ^ HEAP[sbox|tE] ^ HEAP[sbox|t3] ^ RA4;
        s5 = HEAP[sbox|t4] ^ HEAP[x2_sbox|t9] ^ HEAP[x3_sbox|tE] ^ HEAP[sbox|t3] ^ RA5;
        s6 = HEAP[sbox|t4] ^ HEAP[sbox|t9] ^ HEAP[x2_sbox|tE] ^ HEAP[x3_sbox|t3] ^ RA6;
        s7 = HEAP[x3_sbox|t4] ^ HEAP[sbox|t9] ^ HEAP[sbox|tE] ^ HEAP[x2_sbox|t3] ^ RA7;
        s8 = HEAP[x2_sbox|t8] ^ HEAP[x3_sbox|tD] ^ HEAP[sbox|t2] ^ HEAP[sbox|t7] ^ RA8;
        s9 = HEAP[sbox|t8] ^ HEAP[x2_sbox|tD] ^ HEAP[x3_sbox|t2] ^ HEAP[sbox|t7] ^ RA9;
        sA = HEAP[sbox|t8] ^ HEAP[sbox|tD] ^ HEAP[x2_sbox|t2] ^ HEAP[x3_sbox|t7] ^ RAA;
        sB = HEAP[x3_sbox|t8] ^ HEAP[sbox|tD] ^ HEAP[sbox|t2] ^ HEAP[x2_sbox|t7] ^ RAB;
        sC = HEAP[x2_sbox|tC] ^ HEAP[x3_sbox|t1] ^ HEAP[sbox|t6] ^ HEAP[sbox|tB] ^ RAC;
        sD = HEAP[sbox|tC] ^ HEAP[x2_sbox|t1] ^ HEAP[x3_sbox|t6] ^ HEAP[sbox|tB] ^ RAD;
        sE = HEAP[sbox|tC] ^ HEAP[sbox|t1] ^ HEAP[x2_sbox|t6] ^ HEAP[x3_sbox|tB] ^ RAE;
        sF = HEAP[x3_sbox|tC] ^ HEAP[sbox|t1] ^ HEAP[sbox|t6] ^ HEAP[x2_sbox|tB] ^ RAF;

        // round 11
        t0 = HEAP[x2_sbox|s0] ^ HEAP[x3_sbox|s5] ^ HEAP[sbox|sA] ^ HEAP[sbox|sF] ^ RB0;
        t1 = HEAP[sbox|s0] ^ HEAP[x2_sbox|s5] ^ HEAP[x3_sbox|sA] ^ HEAP[sbox|sF] ^ RB1;
        t2 = HEAP[sbox|s0] ^ HEAP[sbox|s5] ^ HEAP[x2_sbox|sA] ^ HEAP[x3_sbox|sF] ^ RB2;
        t3 = HEAP[x3_sbox|s0] ^ HEAP[sbox|s5] ^ HEAP[sbox|sA] ^ HEAP[x2_sbox|sF] ^ RB3;
        t4 = HEAP[x2_sbox|s4] ^ HEAP[x3_sbox|s9] ^ HEAP[sbox|sE] ^ HEAP[sbox|s3] ^ RB4;
        t5 = HEAP[sbox|s4] ^ HEAP[x2_sbox|s9] ^ HEAP[x3_sbox|sE] ^ HEAP[sbox|s3] ^ RB5;
        t6 = HEAP[sbox|s4] ^ HEAP[sbox|s9] ^ HEAP[x2_sbox|sE] ^ HEAP[x3_sbox|s3] ^ RB6;
        t7 = HEAP[x3_sbox|s4] ^ HEAP[sbox|s9] ^ HEAP[sbox|sE] ^ HEAP[x2_sbox|s3] ^ RB7;
        t8 = HEAP[x2_sbox|s8] ^ HEAP[x3_sbox|sD] ^ HEAP[sbox|s2] ^ HEAP[sbox|s7] ^ RB8;
        t9 = HEAP[sbox|s8] ^ HEAP[x2_sbox|sD] ^ HEAP[x3_sbox|s2] ^ HEAP[sbox|s7] ^ RB9;
        tA = HEAP[sbox|s8] ^ HEAP[sbox|sD] ^ HEAP[x2_sbox|s2] ^ HEAP[x3_sbox|s7] ^ RBA;
        tB = HEAP[x3_sbox|s8] ^ HEAP[sbox|sD] ^ HEAP[sbox|s2] ^ HEAP[x2_sbox|s7] ^ RBB;
        tC = HEAP[x2_sbox|sC] ^ HEAP[x3_sbox|s1] ^ HEAP[sbox|s6] ^ HEAP[sbox|sB] ^ RBC;
        tD = HEAP[sbox|sC] ^ HEAP[x2_sbox|s1] ^ HEAP[x3_sbox|s6] ^ HEAP[sbox|sB] ^ RBD;
        tE = HEAP[sbox|sC] ^ HEAP[sbox|s1] ^ HEAP[x2_sbox|s6] ^ HEAP[x3_sbox|sB] ^ RBE;
        tF = HEAP[x3_sbox|sC] ^ HEAP[sbox|s1] ^ HEAP[sbox|s6] ^ HEAP[x2_sbox|sB] ^ RBF;

        // round 12
        s0 = HEAP[x2_sbox|t0] ^ HEAP[x3_sbox|t5] ^ HEAP[sbox|tA] ^ HEAP[sbox|tF] ^ RC0;
        s1 = HEAP[sbox|t0] ^ HEAP[x2_sbox|t5] ^ HEAP[x3_sbox|tA] ^ HEAP[sbox|tF] ^ RC1;
        s2 = HEAP[sbox|t0] ^ HEAP[sbox|t5] ^ HEAP[x2_sbox|tA] ^ HEAP[x3_sbox|tF] ^ RC2;
        s3 = HEAP[x3_sbox|t0] ^ HEAP[sbox|t5] ^ HEAP[sbox|tA] ^ HEAP[x2_sbox|tF] ^ RC3;
        s4 = HEAP[x2_sbox|t4] ^ HEAP[x3_sbox|t9] ^ HEAP[sbox|tE] ^ HEAP[sbox|t3] ^ RC4;
        s5 = HEAP[sbox|t4] ^ HEAP[x2_sbox|t9] ^ HEAP[x3_sbox|tE] ^ HEAP[sbox|t3] ^ RC5;
        s6 = HEAP[sbox|t4] ^ HEAP[sbox|t9] ^ HEAP[x2_sbox|tE] ^ HEAP[x3_sbox|t3] ^ RC6;
        s7 = HEAP[x3_sbox|t4] ^ HEAP[sbox|t9] ^ HEAP[sbox|tE] ^ HEAP[x2_sbox|t3] ^ RC7;
        s8 = HEAP[x2_sbox|t8] ^ HEAP[x3_sbox|tD] ^ HEAP[sbox|t2] ^ HEAP[sbox|t7] ^ RC8;
        s9 = HEAP[sbox|t8] ^ HEAP[x2_sbox|tD] ^ HEAP[x3_sbox|t2] ^ HEAP[sbox|t7] ^ RC9;
        sA = HEAP[sbox|t8] ^ HEAP[sbox|tD] ^ HEAP[x2_sbox|t2] ^ HEAP[x3_sbox|t7] ^ RCA;
        sB = HEAP[x3_sbox|t8] ^ HEAP[sbox|tD] ^ HEAP[sbox|t2] ^ HEAP[x2_sbox|t7] ^ RCB;
        sC = HEAP[x2_sbox|tC] ^ HEAP[x3_sbox|t1] ^ HEAP[sbox|t6] ^ HEAP[sbox|tB] ^ RCC;
        sD = HEAP[sbox|tC] ^ HEAP[x2_sbox|t1] ^ HEAP[x3_sbox|t6] ^ HEAP[sbox|tB] ^ RCD;
        sE = HEAP[sbox|tC] ^ HEAP[sbox|t1] ^ HEAP[x2_sbox|t6] ^ HEAP[x3_sbox|tB] ^ RCE;
        sF = HEAP[x3_sbox|tC] ^ HEAP[sbox|t1] ^ HEAP[sbox|t6] ^ HEAP[x2_sbox|tB] ^ RCF;

        // round 13
        t0 = HEAP[x2_sbox|s0] ^ HEAP[x3_sbox|s5] ^ HEAP[sbox|sA] ^ HEAP[sbox|sF] ^ RD0;
        t1 = HEAP[sbox|s0] ^ HEAP[x2_sbox|s5] ^ HEAP[x3_sbox|sA] ^ HEAP[sbox|sF] ^ RD1;
        t2 = HEAP[sbox|s0] ^ HEAP[sbox|s5] ^ HEAP[x2_sbox|sA] ^ HEAP[x3_sbox|sF] ^ RD2;
        t3 = HEAP[x3_sbox|s0] ^ HEAP[sbox|s5] ^ HEAP[sbox|sA] ^ HEAP[x2_sbox|sF] ^ RD3;
        t4 = HEAP[x2_sbox|s4] ^ HEAP[x3_sbox|s9] ^ HEAP[sbox|sE] ^ HEAP[sbox|s3] ^ RD4;
        t5 = HEAP[sbox|s4] ^ HEAP[x2_sbox|s9] ^ HEAP[x3_sbox|sE] ^ HEAP[sbox|s3] ^ RD5;
        t6 = HEAP[sbox|s4] ^ HEAP[sbox|s9] ^ HEAP[x2_sbox|sE] ^ HEAP[x3_sbox|s3] ^ RD6;
        t7 = HEAP[x3_sbox|s4] ^ HEAP[sbox|s9] ^ HEAP[sbox|sE] ^ HEAP[x2_sbox|s3] ^ RD7;
        t8 = HEAP[x2_sbox|s8] ^ HEAP[x3_sbox|sD] ^ HEAP[sbox|s2] ^ HEAP[sbox|s7] ^ RD8;
        t9 = HEAP[sbox|s8] ^ HEAP[x2_sbox|sD] ^ HEAP[x3_sbox|s2] ^ HEAP[sbox|s7] ^ RD9;
        tA = HEAP[sbox|s8] ^ HEAP[sbox|sD] ^ HEAP[x2_sbox|s2] ^ HEAP[x3_sbox|s7] ^ RDA;
        tB = HEAP[x3_sbox|s8] ^ HEAP[sbox|sD] ^ HEAP[sbox|s2] ^ HEAP[x2_sbox|s7] ^ RDB;
        tC = HEAP[x2_sbox|sC] ^ HEAP[x3_sbox|s1] ^ HEAP[sbox|s6] ^ HEAP[sbox|sB] ^ RDC;
        tD = HEAP[sbox|sC] ^ HEAP[x2_sbox|s1] ^ HEAP[x3_sbox|s6] ^ HEAP[sbox|sB] ^ RDD;
        tE = HEAP[sbox|sC] ^ HEAP[sbox|s1] ^ HEAP[x2_sbox|s6] ^ HEAP[x3_sbox|sB] ^ RDE;
        tF = HEAP[x3_sbox|sC] ^ HEAP[sbox|s1] ^ HEAP[sbox|s6] ^ HEAP[x2_sbox|sB] ^ RDF;

        // round 14
        S0 = HEAP[sbox|t0] ^ RE0;
        S1 = HEAP[sbox|t5] ^ RE1;
        S2 = HEAP[sbox|tA] ^ RE2;
        S3 = HEAP[sbox|tF] ^ RE3;
        S4 = HEAP[sbox|t4] ^ RE4;
        S5 = HEAP[sbox|t9] ^ RE5;
        S6 = HEAP[sbox|tE] ^ RE6;
        S7 = HEAP[sbox|t3] ^ RE7;
        S8 = HEAP[sbox|t8] ^ RE8;
        S9 = HEAP[sbox|tD] ^ RE9;
        SA = HEAP[sbox|t2] ^ REA;
        SB = HEAP[sbox|t7] ^ REB;
        SC = HEAP[sbox|tC] ^ REC;
        SD = HEAP[sbox|t1] ^ RED;
        SE = HEAP[sbox|t6] ^ REE;
        SF = HEAP[sbox|tB] ^ REF;
    }

    function _decrypt ( s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, sA, sB, sC, sD, sE, sF ) {
        s0 = s0 | 0;
        s1 = s1 | 0;
        s2 = s2 | 0;
        s3 = s3 | 0;
        s4 = s4 | 0;
        s5 = s5 | 0;
        s6 = s6 | 0;
        s7 = s7 | 0;
        s8 = s8 | 0;
        s9 = s9 | 0;
        sA = sA | 0;
        sB = sB | 0;
        sC = sC | 0;
        sD = sD | 0;
        sE = sE | 0;
        sF = sF | 0;

        var t0 = 0, t1 = 0, t2 = 0, t3 = 0, t4 = 0, t5 = 0, t6 = 0, t7 = 0, t8 = 0, t9 = 0, tA = 0, tB = 0, tC = 0, tD = 0, tE = 0, tF = 0,
            inv_sbox = 0x100, x9 = 0x400, xB = 0x500, xD = 0x600, xE = 0x700;

        if ( (keySize|0) == 32 ) {
            // round 14+13
            t0 = HEAP[inv_sbox|(s0 ^ RE0)] ^ RD0;
            t1 = HEAP[inv_sbox|(sD ^ RED)] ^ RD1;
            t2 = HEAP[inv_sbox|(sA ^ REA)] ^ RD2;
            t3 = HEAP[inv_sbox|(s7 ^ RE7)] ^ RD3;
            t4 = HEAP[inv_sbox|(s4 ^ RE4)] ^ RD4;
            t5 = HEAP[inv_sbox|(s1 ^ RE1)] ^ RD5;
            t6 = HEAP[inv_sbox|(sE ^ REE)] ^ RD6;
            t7 = HEAP[inv_sbox|(sB ^ REB)] ^ RD7;
            t8 = HEAP[inv_sbox|(s8 ^ RE8)] ^ RD8;
            t9 = HEAP[inv_sbox|(s5 ^ RE5)] ^ RD9;
            tA = HEAP[inv_sbox|(s2 ^ RE2)] ^ RDA;
            tB = HEAP[inv_sbox|(sF ^ REF)] ^ RDB;
            tC = HEAP[inv_sbox|(sC ^ REC)] ^ RDC;
            tD = HEAP[inv_sbox|(s9 ^ RE9)] ^ RDD;
            tE = HEAP[inv_sbox|(s6 ^ RE6)] ^ RDE;
            tF = HEAP[inv_sbox|(s3 ^ RE3)] ^ RDF;
            s0 = HEAP[xE|t0] ^ HEAP[xB|t1] ^ HEAP[xD|t2] ^ HEAP[x9|t3];
            s1 = HEAP[x9|tC] ^ HEAP[xE|tD] ^ HEAP[xB|tE] ^ HEAP[xD|tF];
            s2 = HEAP[xD|t8] ^ HEAP[x9|t9] ^ HEAP[xE|tA] ^ HEAP[xB|tB];
            s3 = HEAP[xB|t4] ^ HEAP[xD|t5] ^ HEAP[x9|t6] ^ HEAP[xE|t7];
            s4 = HEAP[xE|t4] ^ HEAP[xB|t5] ^ HEAP[xD|t6] ^ HEAP[x9|t7];
            s5 = HEAP[x9|t0] ^ HEAP[xE|t1] ^ HEAP[xB|t2] ^ HEAP[xD|t3];
            s6 = HEAP[xD|tC] ^ HEAP[x9|tD] ^ HEAP[xE|tE] ^ HEAP[xB|tF];
            s7 = HEAP[xB|t8] ^ HEAP[xD|t9] ^ HEAP[x9|tA] ^ HEAP[xE|tB];
            s8 = HEAP[xE|t8] ^ HEAP[xB|t9] ^ HEAP[xD|tA] ^ HEAP[x9|tB];
            s9 = HEAP[x9|t4] ^ HEAP[xE|t5] ^ HEAP[xB|t6] ^ HEAP[xD|t7];
            sA = HEAP[xD|t0] ^ HEAP[x9|t1] ^ HEAP[xE|t2] ^ HEAP[xB|t3];
            sB = HEAP[xB|tC] ^ HEAP[xD|tD] ^ HEAP[x9|tE] ^ HEAP[xE|tF];
            sC = HEAP[xE|tC] ^ HEAP[xB|tD] ^ HEAP[xD|tE] ^ HEAP[x9|tF];
            sD = HEAP[x9|t8] ^ HEAP[xE|t9] ^ HEAP[xB|tA] ^ HEAP[xD|tB];
            sE = HEAP[xD|t4] ^ HEAP[x9|t5] ^ HEAP[xE|t6] ^ HEAP[xB|t7];
            sF = HEAP[xB|t0] ^ HEAP[xD|t1] ^ HEAP[x9|t2] ^ HEAP[xE|t3];

            // round 12
            t0 = HEAP[inv_sbox|s0] ^ RC0;
            t1 = HEAP[inv_sbox|s1] ^ RC1;
            t2 = HEAP[inv_sbox|s2] ^ RC2;
            t3 = HEAP[inv_sbox|s3] ^ RC3;
            t4 = HEAP[inv_sbox|s4] ^ RC4;
            t5 = HEAP[inv_sbox|s5] ^ RC5;
            t6 = HEAP[inv_sbox|s6] ^ RC6;
            t7 = HEAP[inv_sbox|s7] ^ RC7;
            t8 = HEAP[inv_sbox|s8] ^ RC8;
            t9 = HEAP[inv_sbox|s9] ^ RC9;
            tA = HEAP[inv_sbox|sA] ^ RCA;
            tB = HEAP[inv_sbox|sB] ^ RCB;
            tC = HEAP[inv_sbox|sC] ^ RCC;
            tD = HEAP[inv_sbox|sD] ^ RCD;
            tE = HEAP[inv_sbox|sE] ^ RCE;
            tF = HEAP[inv_sbox|sF] ^ RCF;
            s0 = HEAP[xE|t0] ^ HEAP[xB|t1] ^ HEAP[xD|t2] ^ HEAP[x9|t3];
            s1 = HEAP[x9|tC] ^ HEAP[xE|tD] ^ HEAP[xB|tE] ^ HEAP[xD|tF];
            s2 = HEAP[xD|t8] ^ HEAP[x9|t9] ^ HEAP[xE|tA] ^ HEAP[xB|tB];
            s3 = HEAP[xB|t4] ^ HEAP[xD|t5] ^ HEAP[x9|t6] ^ HEAP[xE|t7];
            s4 = HEAP[xE|t4] ^ HEAP[xB|t5] ^ HEAP[xD|t6] ^ HEAP[x9|t7];
            s5 = HEAP[x9|t0] ^ HEAP[xE|t1] ^ HEAP[xB|t2] ^ HEAP[xD|t3];
            s6 = HEAP[xD|tC] ^ HEAP[x9|tD] ^ HEAP[xE|tE] ^ HEAP[xB|tF];
            s7 = HEAP[xB|t8] ^ HEAP[xD|t9] ^ HEAP[x9|tA] ^ HEAP[xE|tB];
            s8 = HEAP[xE|t8] ^ HEAP[xB|t9] ^ HEAP[xD|tA] ^ HEAP[x9|tB];
            s9 = HEAP[x9|t4] ^ HEAP[xE|t5] ^ HEAP[xB|t6] ^ HEAP[xD|t7];
            sA = HEAP[xD|t0] ^ HEAP[x9|t1] ^ HEAP[xE|t2] ^ HEAP[xB|t3];
            sB = HEAP[xB|tC] ^ HEAP[xD|tD] ^ HEAP[x9|tE] ^ HEAP[xE|tF];
            sC = HEAP[xE|tC] ^ HEAP[xB|tD] ^ HEAP[xD|tE] ^ HEAP[x9|tF];
            sD = HEAP[x9|t8] ^ HEAP[xE|t9] ^ HEAP[xB|tA] ^ HEAP[xD|tB];
            sE = HEAP[xD|t4] ^ HEAP[x9|t5] ^ HEAP[xE|t6] ^ HEAP[xB|t7];
            sF = HEAP[xB|t0] ^ HEAP[xD|t1] ^ HEAP[x9|t2] ^ HEAP[xE|t3];

            // round 11
            t0 = HEAP[inv_sbox|s0] ^ RB0;
            t1 = HEAP[inv_sbox|s1] ^ RB1;
            t2 = HEAP[inv_sbox|s2] ^ RB2;
            t3 = HEAP[inv_sbox|s3] ^ RB3;
            t4 = HEAP[inv_sbox|s4] ^ RB4;
            t5 = HEAP[inv_sbox|s5] ^ RB5;
            t6 = HEAP[inv_sbox|s6] ^ RB6;
            t7 = HEAP[inv_sbox|s7] ^ RB7;
            t8 = HEAP[inv_sbox|s8] ^ RB8;
            t9 = HEAP[inv_sbox|s9] ^ RB9;
            tA = HEAP[inv_sbox|sA] ^ RBA;
            tB = HEAP[inv_sbox|sB] ^ RBB;
            tC = HEAP[inv_sbox|sC] ^ RBC;
            tD = HEAP[inv_sbox|sD] ^ RBD;
            tE = HEAP[inv_sbox|sE] ^ RBE;
            tF = HEAP[inv_sbox|sF] ^ RBF;
            s0 = HEAP[xE|t0] ^ HEAP[xB|t1] ^ HEAP[xD|t2] ^ HEAP[x9|t3];
            s1 = HEAP[x9|tC] ^ HEAP[xE|tD] ^ HEAP[xB|tE] ^ HEAP[xD|tF];
            s2 = HEAP[xD|t8] ^ HEAP[x9|t9] ^ HEAP[xE|tA] ^ HEAP[xB|tB];
            s3 = HEAP[xB|t4] ^ HEAP[xD|t5] ^ HEAP[x9|t6] ^ HEAP[xE|t7];
            s4 = HEAP[xE|t4] ^ HEAP[xB|t5] ^ HEAP[xD|t6] ^ HEAP[x9|t7];
            s5 = HEAP[x9|t0] ^ HEAP[xE|t1] ^ HEAP[xB|t2] ^ HEAP[xD|t3];
            s6 = HEAP[xD|tC] ^ HEAP[x9|tD] ^ HEAP[xE|tE] ^ HEAP[xB|tF];
            s7 = HEAP[xB|t8] ^ HEAP[xD|t9] ^ HEAP[x9|tA] ^ HEAP[xE|tB];
            s8 = HEAP[xE|t8] ^ HEAP[xB|t9] ^ HEAP[xD|tA] ^ HEAP[x9|tB];
            s9 = HEAP[x9|t4] ^ HEAP[xE|t5] ^ HEAP[xB|t6] ^ HEAP[xD|t7];
            sA = HEAP[xD|t0] ^ HEAP[x9|t1] ^ HEAP[xE|t2] ^ HEAP[xB|t3];
            sB = HEAP[xB|tC] ^ HEAP[xD|tD] ^ HEAP[x9|tE] ^ HEAP[xE|tF];
            sC = HEAP[xE|tC] ^ HEAP[xB|tD] ^ HEAP[xD|tE] ^ HEAP[x9|tF];
            sD = HEAP[x9|t8] ^ HEAP[xE|t9] ^ HEAP[xB|tA] ^ HEAP[xD|tB];
            sE = HEAP[xD|t4] ^ HEAP[x9|t5] ^ HEAP[xE|t6] ^ HEAP[xB|t7];
            sF = HEAP[xB|t0] ^ HEAP[xD|t1] ^ HEAP[x9|t2] ^ HEAP[xE|t3];

            // round 10
            t0 = HEAP[inv_sbox|s0] ^ RA0;
            t1 = HEAP[inv_sbox|s1] ^ RA1;
            t2 = HEAP[inv_sbox|s2] ^ RA2;
            t3 = HEAP[inv_sbox|s3] ^ RA3;
            t4 = HEAP[inv_sbox|s4] ^ RA4;
            t5 = HEAP[inv_sbox|s5] ^ RA5;
            t6 = HEAP[inv_sbox|s6] ^ RA6;
            t7 = HEAP[inv_sbox|s7] ^ RA7;
            t8 = HEAP[inv_sbox|s8] ^ RA8;
            t9 = HEAP[inv_sbox|s9] ^ RA9;
            tA = HEAP[inv_sbox|sA] ^ RAA;
            tB = HEAP[inv_sbox|sB] ^ RAB;
            tC = HEAP[inv_sbox|sC] ^ RAC;
            tD = HEAP[inv_sbox|sD] ^ RAD;
            tE = HEAP[inv_sbox|sE] ^ RAE;
            tF = HEAP[inv_sbox|sF] ^ RAF;
            s0 = HEAP[xE|t0] ^ HEAP[xB|t1] ^ HEAP[xD|t2] ^ HEAP[x9|t3];
            s1 = HEAP[x9|tC] ^ HEAP[xE|tD] ^ HEAP[xB|tE] ^ HEAP[xD|tF];
            s2 = HEAP[xD|t8] ^ HEAP[x9|t9] ^ HEAP[xE|tA] ^ HEAP[xB|tB];
            s3 = HEAP[xB|t4] ^ HEAP[xD|t5] ^ HEAP[x9|t6] ^ HEAP[xE|t7];
            s4 = HEAP[xE|t4] ^ HEAP[xB|t5] ^ HEAP[xD|t6] ^ HEAP[x9|t7];
            s5 = HEAP[x9|t0] ^ HEAP[xE|t1] ^ HEAP[xB|t2] ^ HEAP[xD|t3];
            s6 = HEAP[xD|tC] ^ HEAP[x9|tD] ^ HEAP[xE|tE] ^ HEAP[xB|tF];
            s7 = HEAP[xB|t8] ^ HEAP[xD|t9] ^ HEAP[x9|tA] ^ HEAP[xE|tB];
            s8 = HEAP[xE|t8] ^ HEAP[xB|t9] ^ HEAP[xD|tA] ^ HEAP[x9|tB];
            s9 = HEAP[x9|t4] ^ HEAP[xE|t5] ^ HEAP[xB|t6] ^ HEAP[xD|t7];
            sA = HEAP[xD|t0] ^ HEAP[x9|t1] ^ HEAP[xE|t2] ^ HEAP[xB|t3];
            sB = HEAP[xB|tC] ^ HEAP[xD|tD] ^ HEAP[x9|tE] ^ HEAP[xE|tF];
            sC = HEAP[xE|tC] ^ HEAP[xB|tD] ^ HEAP[xD|tE] ^ HEAP[x9|tF];
            sD = HEAP[x9|t8] ^ HEAP[xE|t9] ^ HEAP[xB|tA] ^ HEAP[xD|tB];
            sE = HEAP[xD|t4] ^ HEAP[x9|t5] ^ HEAP[xE|t6] ^ HEAP[xB|t7];
            sF = HEAP[xB|t0] ^ HEAP[xD|t1] ^ HEAP[x9|t2] ^ HEAP[xE|t3];

            // round 9
            t0 = HEAP[inv_sbox|s0] ^ R90;
            t1 = HEAP[inv_sbox|s1] ^ R91;
            t2 = HEAP[inv_sbox|s2] ^ R92;
            t3 = HEAP[inv_sbox|s3] ^ R93;
            t4 = HEAP[inv_sbox|s4] ^ R94;
            t5 = HEAP[inv_sbox|s5] ^ R95;
            t6 = HEAP[inv_sbox|s6] ^ R96;
            t7 = HEAP[inv_sbox|s7] ^ R97;
            t8 = HEAP[inv_sbox|s8] ^ R98;
            t9 = HEAP[inv_sbox|s9] ^ R99;
            tA = HEAP[inv_sbox|sA] ^ R9A;
            tB = HEAP[inv_sbox|sB] ^ R9B;
            tC = HEAP[inv_sbox|sC] ^ R9C;
            tD = HEAP[inv_sbox|sD] ^ R9D;
            tE = HEAP[inv_sbox|sE] ^ R9E;
            tF = HEAP[inv_sbox|sF] ^ R9F;
        }
        else {
            // round 10
            t0 = HEAP[inv_sbox|(s0 ^ RA0)] ^ R90;
            t1 = HEAP[inv_sbox|(sD ^ RAD)] ^ R91;
            t2 = HEAP[inv_sbox|(sA ^ RAA)] ^ R92;
            t3 = HEAP[inv_sbox|(s7 ^ RA7)] ^ R93;
            t4 = HEAP[inv_sbox|(s4 ^ RA4)] ^ R94;
            t5 = HEAP[inv_sbox|(s1 ^ RA1)] ^ R95;
            t6 = HEAP[inv_sbox|(sE ^ RAE)] ^ R96;
            t7 = HEAP[inv_sbox|(sB ^ RAB)] ^ R97;
            t8 = HEAP[inv_sbox|(s8 ^ RA8)] ^ R98;
            t9 = HEAP[inv_sbox|(s5 ^ RA5)] ^ R99;
            tA = HEAP[inv_sbox|(s2 ^ RA2)] ^ R9A;
            tB = HEAP[inv_sbox|(sF ^ RAF)] ^ R9B;
            tC = HEAP[inv_sbox|(sC ^ RAC)] ^ R9C;
            tD = HEAP[inv_sbox|(s9 ^ RA9)] ^ R9D;
            tE = HEAP[inv_sbox|(s6 ^ RA6)] ^ R9E;
            tF = HEAP[inv_sbox|(s3 ^ RA3)] ^ R9F;
        }

        // round 9
        s0 = HEAP[xE|t0] ^ HEAP[xB|t1] ^ HEAP[xD|t2] ^ HEAP[x9|t3];
        s1 = HEAP[x9|tC] ^ HEAP[xE|tD] ^ HEAP[xB|tE] ^ HEAP[xD|tF];
        s2 = HEAP[xD|t8] ^ HEAP[x9|t9] ^ HEAP[xE|tA] ^ HEAP[xB|tB];
        s3 = HEAP[xB|t4] ^ HEAP[xD|t5] ^ HEAP[x9|t6] ^ HEAP[xE|t7];
        s4 = HEAP[xE|t4] ^ HEAP[xB|t5] ^ HEAP[xD|t6] ^ HEAP[x9|t7];
        s5 = HEAP[x9|t0] ^ HEAP[xE|t1] ^ HEAP[xB|t2] ^ HEAP[xD|t3];
        s6 = HEAP[xD|tC] ^ HEAP[x9|tD] ^ HEAP[xE|tE] ^ HEAP[xB|tF];
        s7 = HEAP[xB|t8] ^ HEAP[xD|t9] ^ HEAP[x9|tA] ^ HEAP[xE|tB];
        s8 = HEAP[xE|t8] ^ HEAP[xB|t9] ^ HEAP[xD|tA] ^ HEAP[x9|tB];
        s9 = HEAP[x9|t4] ^ HEAP[xE|t5] ^ HEAP[xB|t6] ^ HEAP[xD|t7];
        sA = HEAP[xD|t0] ^ HEAP[x9|t1] ^ HEAP[xE|t2] ^ HEAP[xB|t3];
        sB = HEAP[xB|tC] ^ HEAP[xD|tD] ^ HEAP[x9|tE] ^ HEAP[xE|tF];
        sC = HEAP[xE|tC] ^ HEAP[xB|tD] ^ HEAP[xD|tE] ^ HEAP[x9|tF];
        sD = HEAP[x9|t8] ^ HEAP[xE|t9] ^ HEAP[xB|tA] ^ HEAP[xD|tB];
        sE = HEAP[xD|t4] ^ HEAP[x9|t5] ^ HEAP[xE|t6] ^ HEAP[xB|t7];
        sF = HEAP[xB|t0] ^ HEAP[xD|t1] ^ HEAP[x9|t2] ^ HEAP[xE|t3];

        // round 8
        t0 = HEAP[inv_sbox|s0] ^ R80;
        t1 = HEAP[inv_sbox|s1] ^ R81;
        t2 = HEAP[inv_sbox|s2] ^ R82;
        t3 = HEAP[inv_sbox|s3] ^ R83;
        t4 = HEAP[inv_sbox|s4] ^ R84;
        t5 = HEAP[inv_sbox|s5] ^ R85;
        t6 = HEAP[inv_sbox|s6] ^ R86;
        t7 = HEAP[inv_sbox|s7] ^ R87;
        t8 = HEAP[inv_sbox|s8] ^ R88;
        t9 = HEAP[inv_sbox|s9] ^ R89;
        tA = HEAP[inv_sbox|sA] ^ R8A;
        tB = HEAP[inv_sbox|sB] ^ R8B;
        tC = HEAP[inv_sbox|sC] ^ R8C;
        tD = HEAP[inv_sbox|sD] ^ R8D;
        tE = HEAP[inv_sbox|sE] ^ R8E;
        tF = HEAP[inv_sbox|sF] ^ R8F;
        s0 = HEAP[xE|t0] ^ HEAP[xB|t1] ^ HEAP[xD|t2] ^ HEAP[x9|t3];
        s1 = HEAP[x9|tC] ^ HEAP[xE|tD] ^ HEAP[xB|tE] ^ HEAP[xD|tF];
        s2 = HEAP[xD|t8] ^ HEAP[x9|t9] ^ HEAP[xE|tA] ^ HEAP[xB|tB];
        s3 = HEAP[xB|t4] ^ HEAP[xD|t5] ^ HEAP[x9|t6] ^ HEAP[xE|t7];
        s4 = HEAP[xE|t4] ^ HEAP[xB|t5] ^ HEAP[xD|t6] ^ HEAP[x9|t7];
        s5 = HEAP[x9|t0] ^ HEAP[xE|t1] ^ HEAP[xB|t2] ^ HEAP[xD|t3];
        s6 = HEAP[xD|tC] ^ HEAP[x9|tD] ^ HEAP[xE|tE] ^ HEAP[xB|tF];
        s7 = HEAP[xB|t8] ^ HEAP[xD|t9] ^ HEAP[x9|tA] ^ HEAP[xE|tB];
        s8 = HEAP[xE|t8] ^ HEAP[xB|t9] ^ HEAP[xD|tA] ^ HEAP[x9|tB];
        s9 = HEAP[x9|t4] ^ HEAP[xE|t5] ^ HEAP[xB|t6] ^ HEAP[xD|t7];
        sA = HEAP[xD|t0] ^ HEAP[x9|t1] ^ HEAP[xE|t2] ^ HEAP[xB|t3];
        sB = HEAP[xB|tC] ^ HEAP[xD|tD] ^ HEAP[x9|tE] ^ HEAP[xE|tF];
        sC = HEAP[xE|tC] ^ HEAP[xB|tD] ^ HEAP[xD|tE] ^ HEAP[x9|tF];
        sD = HEAP[x9|t8] ^ HEAP[xE|t9] ^ HEAP[xB|tA] ^ HEAP[xD|tB];
        sE = HEAP[xD|t4] ^ HEAP[x9|t5] ^ HEAP[xE|t6] ^ HEAP[xB|t7];
        sF = HEAP[xB|t0] ^ HEAP[xD|t1] ^ HEAP[x9|t2] ^ HEAP[xE|t3];

        // round 7
        t0 = HEAP[inv_sbox|s0] ^ R70;
        t1 = HEAP[inv_sbox|s1] ^ R71;
        t2 = HEAP[inv_sbox|s2] ^ R72;
        t3 = HEAP[inv_sbox|s3] ^ R73;
        t4 = HEAP[inv_sbox|s4] ^ R74;
        t5 = HEAP[inv_sbox|s5] ^ R75;
        t6 = HEAP[inv_sbox|s6] ^ R76;
        t7 = HEAP[inv_sbox|s7] ^ R77;
        t8 = HEAP[inv_sbox|s8] ^ R78;
        t9 = HEAP[inv_sbox|s9] ^ R79;
        tA = HEAP[inv_sbox|sA] ^ R7A;
        tB = HEAP[inv_sbox|sB] ^ R7B;
        tC = HEAP[inv_sbox|sC] ^ R7C;
        tD = HEAP[inv_sbox|sD] ^ R7D;
        tE = HEAP[inv_sbox|sE] ^ R7E;
        tF = HEAP[inv_sbox|sF] ^ R7F;
        s0 = HEAP[xE|t0] ^ HEAP[xB|t1] ^ HEAP[xD|t2] ^ HEAP[x9|t3];
        s1 = HEAP[x9|tC] ^ HEAP[xE|tD] ^ HEAP[xB|tE] ^ HEAP[xD|tF];
        s2 = HEAP[xD|t8] ^ HEAP[x9|t9] ^ HEAP[xE|tA] ^ HEAP[xB|tB];
        s3 = HEAP[xB|t4] ^ HEAP[xD|t5] ^ HEAP[x9|t6] ^ HEAP[xE|t7];
        s4 = HEAP[xE|t4] ^ HEAP[xB|t5] ^ HEAP[xD|t6] ^ HEAP[x9|t7];
        s5 = HEAP[x9|t0] ^ HEAP[xE|t1] ^ HEAP[xB|t2] ^ HEAP[xD|t3];
        s6 = HEAP[xD|tC] ^ HEAP[x9|tD] ^ HEAP[xE|tE] ^ HEAP[xB|tF];
        s7 = HEAP[xB|t8] ^ HEAP[xD|t9] ^ HEAP[x9|tA] ^ HEAP[xE|tB];
        s8 = HEAP[xE|t8] ^ HEAP[xB|t9] ^ HEAP[xD|tA] ^ HEAP[x9|tB];
        s9 = HEAP[x9|t4] ^ HEAP[xE|t5] ^ HEAP[xB|t6] ^ HEAP[xD|t7];
        sA = HEAP[xD|t0] ^ HEAP[x9|t1] ^ HEAP[xE|t2] ^ HEAP[xB|t3];
        sB = HEAP[xB|tC] ^ HEAP[xD|tD] ^ HEAP[x9|tE] ^ HEAP[xE|tF];
        sC = HEAP[xE|tC] ^ HEAP[xB|tD] ^ HEAP[xD|tE] ^ HEAP[x9|tF];
        sD = HEAP[x9|t8] ^ HEAP[xE|t9] ^ HEAP[xB|tA] ^ HEAP[xD|tB];
        sE = HEAP[xD|t4] ^ HEAP[x9|t5] ^ HEAP[xE|t6] ^ HEAP[xB|t7];
        sF = HEAP[xB|t0] ^ HEAP[xD|t1] ^ HEAP[x9|t2] ^ HEAP[xE|t3];

        // round 6
        t0 = HEAP[inv_sbox|s0] ^ R60;
        t1 = HEAP[inv_sbox|s1] ^ R61;
        t2 = HEAP[inv_sbox|s2] ^ R62;
        t3 = HEAP[inv_sbox|s3] ^ R63;
        t4 = HEAP[inv_sbox|s4] ^ R64;
        t5 = HEAP[inv_sbox|s5] ^ R65;
        t6 = HEAP[inv_sbox|s6] ^ R66;
        t7 = HEAP[inv_sbox|s7] ^ R67;
        t8 = HEAP[inv_sbox|s8] ^ R68;
        t9 = HEAP[inv_sbox|s9] ^ R69;
        tA = HEAP[inv_sbox|sA] ^ R6A;
        tB = HEAP[inv_sbox|sB] ^ R6B;
        tC = HEAP[inv_sbox|sC] ^ R6C;
        tD = HEAP[inv_sbox|sD] ^ R6D;
        tE = HEAP[inv_sbox|sE] ^ R6E;
        tF = HEAP[inv_sbox|sF] ^ R6F;
        s0 = HEAP[xE|t0] ^ HEAP[xB|t1] ^ HEAP[xD|t2] ^ HEAP[x9|t3];
        s1 = HEAP[x9|tC] ^ HEAP[xE|tD] ^ HEAP[xB|tE] ^ HEAP[xD|tF];
        s2 = HEAP[xD|t8] ^ HEAP[x9|t9] ^ HEAP[xE|tA] ^ HEAP[xB|tB];
        s3 = HEAP[xB|t4] ^ HEAP[xD|t5] ^ HEAP[x9|t6] ^ HEAP[xE|t7];
        s4 = HEAP[xE|t4] ^ HEAP[xB|t5] ^ HEAP[xD|t6] ^ HEAP[x9|t7];
        s5 = HEAP[x9|t0] ^ HEAP[xE|t1] ^ HEAP[xB|t2] ^ HEAP[xD|t3];
        s6 = HEAP[xD|tC] ^ HEAP[x9|tD] ^ HEAP[xE|tE] ^ HEAP[xB|tF];
        s7 = HEAP[xB|t8] ^ HEAP[xD|t9] ^ HEAP[x9|tA] ^ HEAP[xE|tB];
        s8 = HEAP[xE|t8] ^ HEAP[xB|t9] ^ HEAP[xD|tA] ^ HEAP[x9|tB];
        s9 = HEAP[x9|t4] ^ HEAP[xE|t5] ^ HEAP[xB|t6] ^ HEAP[xD|t7];
        sA = HEAP[xD|t0] ^ HEAP[x9|t1] ^ HEAP[xE|t2] ^ HEAP[xB|t3];
        sB = HEAP[xB|tC] ^ HEAP[xD|tD] ^ HEAP[x9|tE] ^ HEAP[xE|tF];
        sC = HEAP[xE|tC] ^ HEAP[xB|tD] ^ HEAP[xD|tE] ^ HEAP[x9|tF];
        sD = HEAP[x9|t8] ^ HEAP[xE|t9] ^ HEAP[xB|tA] ^ HEAP[xD|tB];
        sE = HEAP[xD|t4] ^ HEAP[x9|t5] ^ HEAP[xE|t6] ^ HEAP[xB|t7];
        sF = HEAP[xB|t0] ^ HEAP[xD|t1] ^ HEAP[x9|t2] ^ HEAP[xE|t3];

        // round 5
        t0 = HEAP[inv_sbox|s0] ^ R50;
        t1 = HEAP[inv_sbox|s1] ^ R51;
        t2 = HEAP[inv_sbox|s2] ^ R52;
        t3 = HEAP[inv_sbox|s3] ^ R53;
        t4 = HEAP[inv_sbox|s4] ^ R54;
        t5 = HEAP[inv_sbox|s5] ^ R55;
        t6 = HEAP[inv_sbox|s6] ^ R56;
        t7 = HEAP[inv_sbox|s7] ^ R57;
        t8 = HEAP[inv_sbox|s8] ^ R58;
        t9 = HEAP[inv_sbox|s9] ^ R59;
        tA = HEAP[inv_sbox|sA] ^ R5A;
        tB = HEAP[inv_sbox|sB] ^ R5B;
        tC = HEAP[inv_sbox|sC] ^ R5C;
        tD = HEAP[inv_sbox|sD] ^ R5D;
        tE = HEAP[inv_sbox|sE] ^ R5E;
        tF = HEAP[inv_sbox|sF] ^ R5F;
        s0 = HEAP[xE|t0] ^ HEAP[xB|t1] ^ HEAP[xD|t2] ^ HEAP[x9|t3];
        s1 = HEAP[x9|tC] ^ HEAP[xE|tD] ^ HEAP[xB|tE] ^ HEAP[xD|tF];
        s2 = HEAP[xD|t8] ^ HEAP[x9|t9] ^ HEAP[xE|tA] ^ HEAP[xB|tB];
        s3 = HEAP[xB|t4] ^ HEAP[xD|t5] ^ HEAP[x9|t6] ^ HEAP[xE|t7];
        s4 = HEAP[xE|t4] ^ HEAP[xB|t5] ^ HEAP[xD|t6] ^ HEAP[x9|t7];
        s5 = HEAP[x9|t0] ^ HEAP[xE|t1] ^ HEAP[xB|t2] ^ HEAP[xD|t3];
        s6 = HEAP[xD|tC] ^ HEAP[x9|tD] ^ HEAP[xE|tE] ^ HEAP[xB|tF];
        s7 = HEAP[xB|t8] ^ HEAP[xD|t9] ^ HEAP[x9|tA] ^ HEAP[xE|tB];
        s8 = HEAP[xE|t8] ^ HEAP[xB|t9] ^ HEAP[xD|tA] ^ HEAP[x9|tB];
        s9 = HEAP[x9|t4] ^ HEAP[xE|t5] ^ HEAP[xB|t6] ^ HEAP[xD|t7];
        sA = HEAP[xD|t0] ^ HEAP[x9|t1] ^ HEAP[xE|t2] ^ HEAP[xB|t3];
        sB = HEAP[xB|tC] ^ HEAP[xD|tD] ^ HEAP[x9|tE] ^ HEAP[xE|tF];
        sC = HEAP[xE|tC] ^ HEAP[xB|tD] ^ HEAP[xD|tE] ^ HEAP[x9|tF];
        sD = HEAP[x9|t8] ^ HEAP[xE|t9] ^ HEAP[xB|tA] ^ HEAP[xD|tB];
        sE = HEAP[xD|t4] ^ HEAP[x9|t5] ^ HEAP[xE|t6] ^ HEAP[xB|t7];
        sF = HEAP[xB|t0] ^ HEAP[xD|t1] ^ HEAP[x9|t2] ^ HEAP[xE|t3];

        // round 4
        t0 = HEAP[inv_sbox|s0] ^ R40;
        t1 = HEAP[inv_sbox|s1] ^ R41;
        t2 = HEAP[inv_sbox|s2] ^ R42;
        t3 = HEAP[inv_sbox|s3] ^ R43;
        t4 = HEAP[inv_sbox|s4] ^ R44;
        t5 = HEAP[inv_sbox|s5] ^ R45;
        t6 = HEAP[inv_sbox|s6] ^ R46;
        t7 = HEAP[inv_sbox|s7] ^ R47;
        t8 = HEAP[inv_sbox|s8] ^ R48;
        t9 = HEAP[inv_sbox|s9] ^ R49;
        tA = HEAP[inv_sbox|sA] ^ R4A;
        tB = HEAP[inv_sbox|sB] ^ R4B;
        tC = HEAP[inv_sbox|sC] ^ R4C;
        tD = HEAP[inv_sbox|sD] ^ R4D;
        tE = HEAP[inv_sbox|sE] ^ R4E;
        tF = HEAP[inv_sbox|sF] ^ R4F;
        s0 = HEAP[xE|t0] ^ HEAP[xB|t1] ^ HEAP[xD|t2] ^ HEAP[x9|t3];
        s1 = HEAP[x9|tC] ^ HEAP[xE|tD] ^ HEAP[xB|tE] ^ HEAP[xD|tF];
        s2 = HEAP[xD|t8] ^ HEAP[x9|t9] ^ HEAP[xE|tA] ^ HEAP[xB|tB];
        s3 = HEAP[xB|t4] ^ HEAP[xD|t5] ^ HEAP[x9|t6] ^ HEAP[xE|t7];
        s4 = HEAP[xE|t4] ^ HEAP[xB|t5] ^ HEAP[xD|t6] ^ HEAP[x9|t7];
        s5 = HEAP[x9|t0] ^ HEAP[xE|t1] ^ HEAP[xB|t2] ^ HEAP[xD|t3];
        s6 = HEAP[xD|tC] ^ HEAP[x9|tD] ^ HEAP[xE|tE] ^ HEAP[xB|tF];
        s7 = HEAP[xB|t8] ^ HEAP[xD|t9] ^ HEAP[x9|tA] ^ HEAP[xE|tB];
        s8 = HEAP[xE|t8] ^ HEAP[xB|t9] ^ HEAP[xD|tA] ^ HEAP[x9|tB];
        s9 = HEAP[x9|t4] ^ HEAP[xE|t5] ^ HEAP[xB|t6] ^ HEAP[xD|t7];
        sA = HEAP[xD|t0] ^ HEAP[x9|t1] ^ HEAP[xE|t2] ^ HEAP[xB|t3];
        sB = HEAP[xB|tC] ^ HEAP[xD|tD] ^ HEAP[x9|tE] ^ HEAP[xE|tF];
        sC = HEAP[xE|tC] ^ HEAP[xB|tD] ^ HEAP[xD|tE] ^ HEAP[x9|tF];
        sD = HEAP[x9|t8] ^ HEAP[xE|t9] ^ HEAP[xB|tA] ^ HEAP[xD|tB];
        sE = HEAP[xD|t4] ^ HEAP[x9|t5] ^ HEAP[xE|t6] ^ HEAP[xB|t7];
        sF = HEAP[xB|t0] ^ HEAP[xD|t1] ^ HEAP[x9|t2] ^ HEAP[xE|t3];

        // round 3
        t0 = HEAP[inv_sbox|s0] ^ R30;
        t1 = HEAP[inv_sbox|s1] ^ R31;
        t2 = HEAP[inv_sbox|s2] ^ R32;
        t3 = HEAP[inv_sbox|s3] ^ R33;
        t4 = HEAP[inv_sbox|s4] ^ R34;
        t5 = HEAP[inv_sbox|s5] ^ R35;
        t6 = HEAP[inv_sbox|s6] ^ R36;
        t7 = HEAP[inv_sbox|s7] ^ R37;
        t8 = HEAP[inv_sbox|s8] ^ R38;
        t9 = HEAP[inv_sbox|s9] ^ R39;
        tA = HEAP[inv_sbox|sA] ^ R3A;
        tB = HEAP[inv_sbox|sB] ^ R3B;
        tC = HEAP[inv_sbox|sC] ^ R3C;
        tD = HEAP[inv_sbox|sD] ^ R3D;
        tE = HEAP[inv_sbox|sE] ^ R3E;
        tF = HEAP[inv_sbox|sF] ^ R3F;
        s0 = HEAP[xE|t0] ^ HEAP[xB|t1] ^ HEAP[xD|t2] ^ HEAP[x9|t3];
        s1 = HEAP[x9|tC] ^ HEAP[xE|tD] ^ HEAP[xB|tE] ^ HEAP[xD|tF];
        s2 = HEAP[xD|t8] ^ HEAP[x9|t9] ^ HEAP[xE|tA] ^ HEAP[xB|tB];
        s3 = HEAP[xB|t4] ^ HEAP[xD|t5] ^ HEAP[x9|t6] ^ HEAP[xE|t7];
        s4 = HEAP[xE|t4] ^ HEAP[xB|t5] ^ HEAP[xD|t6] ^ HEAP[x9|t7];
        s5 = HEAP[x9|t0] ^ HEAP[xE|t1] ^ HEAP[xB|t2] ^ HEAP[xD|t3];
        s6 = HEAP[xD|tC] ^ HEAP[x9|tD] ^ HEAP[xE|tE] ^ HEAP[xB|tF];
        s7 = HEAP[xB|t8] ^ HEAP[xD|t9] ^ HEAP[x9|tA] ^ HEAP[xE|tB];
        s8 = HEAP[xE|t8] ^ HEAP[xB|t9] ^ HEAP[xD|tA] ^ HEAP[x9|tB];
        s9 = HEAP[x9|t4] ^ HEAP[xE|t5] ^ HEAP[xB|t6] ^ HEAP[xD|t7];
        sA = HEAP[xD|t0] ^ HEAP[x9|t1] ^ HEAP[xE|t2] ^ HEAP[xB|t3];
        sB = HEAP[xB|tC] ^ HEAP[xD|tD] ^ HEAP[x9|tE] ^ HEAP[xE|tF];
        sC = HEAP[xE|tC] ^ HEAP[xB|tD] ^ HEAP[xD|tE] ^ HEAP[x9|tF];
        sD = HEAP[x9|t8] ^ HEAP[xE|t9] ^ HEAP[xB|tA] ^ HEAP[xD|tB];
        sE = HEAP[xD|t4] ^ HEAP[x9|t5] ^ HEAP[xE|t6] ^ HEAP[xB|t7];
        sF = HEAP[xB|t0] ^ HEAP[xD|t1] ^ HEAP[x9|t2] ^ HEAP[xE|t3];

        // round 2
        t0 = HEAP[inv_sbox|s0] ^ R20;
        t1 = HEAP[inv_sbox|s1] ^ R21;
        t2 = HEAP[inv_sbox|s2] ^ R22;
        t3 = HEAP[inv_sbox|s3] ^ R23;
        t4 = HEAP[inv_sbox|s4] ^ R24;
        t5 = HEAP[inv_sbox|s5] ^ R25;
        t6 = HEAP[inv_sbox|s6] ^ R26;
        t7 = HEAP[inv_sbox|s7] ^ R27;
        t8 = HEAP[inv_sbox|s8] ^ R28;
        t9 = HEAP[inv_sbox|s9] ^ R29;
        tA = HEAP[inv_sbox|sA] ^ R2A;
        tB = HEAP[inv_sbox|sB] ^ R2B;
        tC = HEAP[inv_sbox|sC] ^ R2C;
        tD = HEAP[inv_sbox|sD] ^ R2D;
        tE = HEAP[inv_sbox|sE] ^ R2E;
        tF = HEAP[inv_sbox|sF] ^ R2F;
        s0 = HEAP[xE|t0] ^ HEAP[xB|t1] ^ HEAP[xD|t2] ^ HEAP[x9|t3];
        s1 = HEAP[x9|tC] ^ HEAP[xE|tD] ^ HEAP[xB|tE] ^ HEAP[xD|tF];
        s2 = HEAP[xD|t8] ^ HEAP[x9|t9] ^ HEAP[xE|tA] ^ HEAP[xB|tB];
        s3 = HEAP[xB|t4] ^ HEAP[xD|t5] ^ HEAP[x9|t6] ^ HEAP[xE|t7];
        s4 = HEAP[xE|t4] ^ HEAP[xB|t5] ^ HEAP[xD|t6] ^ HEAP[x9|t7];
        s5 = HEAP[x9|t0] ^ HEAP[xE|t1] ^ HEAP[xB|t2] ^ HEAP[xD|t3];
        s6 = HEAP[xD|tC] ^ HEAP[x9|tD] ^ HEAP[xE|tE] ^ HEAP[xB|tF];
        s7 = HEAP[xB|t8] ^ HEAP[xD|t9] ^ HEAP[x9|tA] ^ HEAP[xE|tB];
        s8 = HEAP[xE|t8] ^ HEAP[xB|t9] ^ HEAP[xD|tA] ^ HEAP[x9|tB];
        s9 = HEAP[x9|t4] ^ HEAP[xE|t5] ^ HEAP[xB|t6] ^ HEAP[xD|t7];
        sA = HEAP[xD|t0] ^ HEAP[x9|t1] ^ HEAP[xE|t2] ^ HEAP[xB|t3];
        sB = HEAP[xB|tC] ^ HEAP[xD|tD] ^ HEAP[x9|tE] ^ HEAP[xE|tF];
        sC = HEAP[xE|tC] ^ HEAP[xB|tD] ^ HEAP[xD|tE] ^ HEAP[x9|tF];
        sD = HEAP[x9|t8] ^ HEAP[xE|t9] ^ HEAP[xB|tA] ^ HEAP[xD|tB];
        sE = HEAP[xD|t4] ^ HEAP[x9|t5] ^ HEAP[xE|t6] ^ HEAP[xB|t7];
        sF = HEAP[xB|t0] ^ HEAP[xD|t1] ^ HEAP[x9|t2] ^ HEAP[xE|t3];

        // round 1
        t0 = HEAP[inv_sbox|s0] ^ R10;
        t1 = HEAP[inv_sbox|s1] ^ R11;
        t2 = HEAP[inv_sbox|s2] ^ R12;
        t3 = HEAP[inv_sbox|s3] ^ R13;
        t4 = HEAP[inv_sbox|s4] ^ R14;
        t5 = HEAP[inv_sbox|s5] ^ R15;
        t6 = HEAP[inv_sbox|s6] ^ R16;
        t7 = HEAP[inv_sbox|s7] ^ R17;
        t8 = HEAP[inv_sbox|s8] ^ R18;
        t9 = HEAP[inv_sbox|s9] ^ R19;
        tA = HEAP[inv_sbox|sA] ^ R1A;
        tB = HEAP[inv_sbox|sB] ^ R1B;
        tC = HEAP[inv_sbox|sC] ^ R1C;
        tD = HEAP[inv_sbox|sD] ^ R1D;
        tE = HEAP[inv_sbox|sE] ^ R1E;
        tF = HEAP[inv_sbox|sF] ^ R1F;
        s0 = HEAP[xE|t0] ^ HEAP[xB|t1] ^ HEAP[xD|t2] ^ HEAP[x9|t3];
        s1 = HEAP[x9|tC] ^ HEAP[xE|tD] ^ HEAP[xB|tE] ^ HEAP[xD|tF];
        s2 = HEAP[xD|t8] ^ HEAP[x9|t9] ^ HEAP[xE|tA] ^ HEAP[xB|tB];
        s3 = HEAP[xB|t4] ^ HEAP[xD|t5] ^ HEAP[x9|t6] ^ HEAP[xE|t7];
        s4 = HEAP[xE|t4] ^ HEAP[xB|t5] ^ HEAP[xD|t6] ^ HEAP[x9|t7];
        s5 = HEAP[x9|t0] ^ HEAP[xE|t1] ^ HEAP[xB|t2] ^ HEAP[xD|t3];
        s6 = HEAP[xD|tC] ^ HEAP[x9|tD] ^ HEAP[xE|tE] ^ HEAP[xB|tF];
        s7 = HEAP[xB|t8] ^ HEAP[xD|t9] ^ HEAP[x9|tA] ^ HEAP[xE|tB];
        s8 = HEAP[xE|t8] ^ HEAP[xB|t9] ^ HEAP[xD|tA] ^ HEAP[x9|tB];
        s9 = HEAP[x9|t4] ^ HEAP[xE|t5] ^ HEAP[xB|t6] ^ HEAP[xD|t7];
        sA = HEAP[xD|t0] ^ HEAP[x9|t1] ^ HEAP[xE|t2] ^ HEAP[xB|t3];
        sB = HEAP[xB|tC] ^ HEAP[xD|tD] ^ HEAP[x9|tE] ^ HEAP[xE|tF];
        sC = HEAP[xE|tC] ^ HEAP[xB|tD] ^ HEAP[xD|tE] ^ HEAP[x9|tF];
        sD = HEAP[x9|t8] ^ HEAP[xE|t9] ^ HEAP[xB|tA] ^ HEAP[xD|tB];
        sE = HEAP[xD|t4] ^ HEAP[x9|t5] ^ HEAP[xE|t6] ^ HEAP[xB|t7];
        sF = HEAP[xB|t0] ^ HEAP[xD|t1] ^ HEAP[x9|t2] ^ HEAP[xE|t3];

        // round 0
        S0 = HEAP[inv_sbox|s0] ^ R00;
        S1 = HEAP[inv_sbox|s1] ^ R01;
        S2 = HEAP[inv_sbox|s2] ^ R02;
        S3 = HEAP[inv_sbox|s3] ^ R03;
        S4 = HEAP[inv_sbox|s4] ^ R04;
        S5 = HEAP[inv_sbox|s5] ^ R05;
        S6 = HEAP[inv_sbox|s6] ^ R06;
        S7 = HEAP[inv_sbox|s7] ^ R07;
        S8 = HEAP[inv_sbox|s8] ^ R08;
        S9 = HEAP[inv_sbox|s9] ^ R09;
        SA = HEAP[inv_sbox|sA] ^ R0A;
        SB = HEAP[inv_sbox|sB] ^ R0B;
        SC = HEAP[inv_sbox|sC] ^ R0C;
        SD = HEAP[inv_sbox|sD] ^ R0D;
        SE = HEAP[inv_sbox|sE] ^ R0E;
        SF = HEAP[inv_sbox|sF] ^ R0F;
    }

    function init_state ( s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, sA, sB, sC, sD, sE, sF ) {
        s0 = s0|0;
        s1 = s1|0;
        s2 = s2|0;
        s3 = s3|0;
        s4 = s4|0;
        s5 = s5|0;
        s6 = s6|0;
        s7 = s7|0;
        s8 = s8|0;
        s9 = s9|0;
        sA = sA|0;
        sB = sB|0;
        sC = sC|0;
        sD = sD|0;
        sE = sE|0;
        sF = sF|0;

        S0 = s0;
        S1 = s1;
        S2 = s2;
        S3 = s3;
        S4 = s4;
        S5 = s5;
        S6 = s6;
        S7 = s7;
        S8 = s8;
        S9 = s9;
        SA = sA;
        SB = sB;
        SC = sC;
        SD = sD;
        SE = sE;
        SF = sF;
    }

    // offset - multiple of 16
    function save_state ( offset ) {
        offset = offset|0;

        HEAP[offset] = S0;
        HEAP[offset|1] = S1;
        HEAP[offset|2] = S2;
        HEAP[offset|3] = S3;
        HEAP[offset|4] = S4;
        HEAP[offset|5] = S5;
        HEAP[offset|6] = S6;
        HEAP[offset|7] = S7;
        HEAP[offset|8] = S8;
        HEAP[offset|9] = S9;
        HEAP[offset|10] = SA;
        HEAP[offset|11] = SB;
        HEAP[offset|12] = SC;
        HEAP[offset|13] = SD;
        HEAP[offset|14] = SE;
        HEAP[offset|15] = SF;
    }

    function init_key_128 ( k0, k1, k2, k3, k4, k5, k6, k7, k8, k9, kA, kB, kC, kD, kE, kF ) {
        k0 = k0|0;
        k1 = k1|0;
        k2 = k2|0;
        k3 = k3|0;
        k4 = k4|0;
        k5 = k5|0;
        k6 = k6|0;
        k7 = k7|0;
        k8 = k8|0;
        k9 = k9|0;
        kA = kA|0;
        kB = kB|0;
        kC = kC|0;
        kD = kD|0;
        kE = kE|0;
        kF = kF|0;

        R00 = k0;
        R01 = k1;
        R02 = k2;
        R03 = k3;
        R04 = k4;
        R05 = k5;
        R06 = k6;
        R07 = k7;
        R08 = k8;
        R09 = k9;
        R0A = kA;
        R0B = kB;
        R0C = kC;
        R0D = kD;
        R0E = kE;
        R0F = kF;

        keySize = 16;

        _expand_key_128();
    }

    function init_key_256 ( k00, k01, k02, k03, k04, k05, k06, k07, k08, k09, k0A, k0B, k0C, k0D, k0E, k0F, k10, k11, k12, k13, k14, k15, k16, k17, k18, k19, k1A, k1B, k1C, k1D, k1E, k1F ) {
        k00 = k00|0;
        k01 = k01|0;
        k02 = k02|0;
        k03 = k03|0;
        k04 = k04|0;
        k05 = k05|0;
        k06 = k06|0;
        k07 = k07|0;
        k08 = k08|0;
        k09 = k09|0;
        k0A = k0A|0;
        k0B = k0B|0;
        k0C = k0C|0;
        k0D = k0D|0;
        k0E = k0E|0;
        k0F = k0F|0;
        k10 = k10|0;
        k11 = k11|0;
        k12 = k12|0;
        k13 = k13|0;
        k14 = k14|0;
        k15 = k15|0;
        k16 = k16|0;
        k17 = k17|0;
        k18 = k18|0;
        k19 = k19|0;
        k1A = k1A|0;
        k1B = k1B|0;
        k1C = k1C|0;
        k1D = k1D|0;
        k1E = k1E|0;
        k1F = k1F|0;

        R00 = k00;
        R01 = k01;
        R02 = k02;
        R03 = k03;
        R04 = k04;
        R05 = k05;
        R06 = k06;
        R07 = k07;
        R08 = k08;
        R09 = k09;
        R0A = k0A;
        R0B = k0B;
        R0C = k0C;
        R0D = k0D;
        R0E = k0E;
        R0F = k0F;
        R10 = k10;
        R11 = k11;
        R12 = k12;
        R13 = k13;
        R14 = k14;
        R15 = k15;
        R16 = k16;
        R17 = k17;
        R18 = k18;
        R19 = k19;
        R1A = k1A;
        R1B = k1B;
        R1C = k1C;
        R1D = k1D;
        R1E = k1E;
        R1F = k1F;

        keySize = 32;

        _expand_key_256();
    }

    // offset, length - multiple of 16
    function ecb_encrypt ( offset, length ) {
        offset = offset|0;
        length = length|0;

        var encrypted = 0;

        if ( offset & 15 )
            return -1;

        while ( (length|0) >= 16 ) {
            _encrypt(
                    HEAP[offset]|0,
                    HEAP[offset|1]|0,
                    HEAP[offset|2]|0,
                    HEAP[offset|3]|0,
                    HEAP[offset|4]|0,
                    HEAP[offset|5]|0,
                    HEAP[offset|6]|0,
                    HEAP[offset|7]|0,
                    HEAP[offset|8]|0,
                    HEAP[offset|9]|0,
                    HEAP[offset|10]|0,
                    HEAP[offset|11]|0,
                    HEAP[offset|12]|0,
                    HEAP[offset|13]|0,
                    HEAP[offset|14]|0,
                    HEAP[offset|15]|0
            );

            HEAP[offset] = S0;
            HEAP[offset|1] = S1;
            HEAP[offset|2] = S2;
            HEAP[offset|3] = S3;
            HEAP[offset|4] = S4;
            HEAP[offset|5] = S5;
            HEAP[offset|6] = S6;
            HEAP[offset|7] = S7;
            HEAP[offset|8] = S8;
            HEAP[offset|9] = S9;
            HEAP[offset|10] = SA;
            HEAP[offset|11] = SB;
            HEAP[offset|12] = SC;
            HEAP[offset|13] = SD;
            HEAP[offset|14] = SE;
            HEAP[offset|15] = SF;

            offset = (offset + 16)|0;
            length = (length - 16)|0;

            encrypted = (encrypted + 16)|0;
        }

        return encrypted|0;
    }

    // offset, length - multiple of 16
    function ecb_decrypt ( offset, length ) {
        offset = offset|0;
        length = length|0;

        var decrypted = 0;

        if ( offset & 15 )
            return -1;

        while ( (length|0) >= 16 ) {
            _decrypt(
                    HEAP[offset]|0,
                    HEAP[offset|1]|0,
                    HEAP[offset|2]|0,
                    HEAP[offset|3]|0,
                    HEAP[offset|4]|0,
                    HEAP[offset|5]|0,
                    HEAP[offset|6]|0,
                    HEAP[offset|7]|0,
                    HEAP[offset|8]|0,
                    HEAP[offset|9]|0,
                    HEAP[offset|10]|0,
                    HEAP[offset|11]|0,
                    HEAP[offset|12]|0,
                    HEAP[offset|13]|0,
                    HEAP[offset|14]|0,
                    HEAP[offset|15]|0
            );

            HEAP[offset] = S0;
            HEAP[offset|1] = S1;
            HEAP[offset|2] = S2;
            HEAP[offset|3] = S3;
            HEAP[offset|4] = S4;
            HEAP[offset|5] = S5;
            HEAP[offset|6] = S6;
            HEAP[offset|7] = S7;
            HEAP[offset|8] = S8;
            HEAP[offset|9] = S9;
            HEAP[offset|10] = SA;
            HEAP[offset|11] = SB;
            HEAP[offset|12] = SC;
            HEAP[offset|13] = SD;
            HEAP[offset|14] = SE;
            HEAP[offset|15] = SF;

            offset = (offset + 16)|0;
            length = (length - 16)|0;

            decrypted = (decrypted + 16)|0;
        }

        return decrypted|0;
    }

    // offset, length - multiple of 16
    function cbc_encrypt ( offset, length ) {
        offset = offset|0;
        length = length|0;

        var encrypted = 0;

        if ( offset & 15 )
            return -1;

        while ( (length|0) >= 16 ) {
            _encrypt(
                S0 ^ HEAP[offset],
                S1 ^ HEAP[offset|1],
                S2 ^ HEAP[offset|2],
                S3 ^ HEAP[offset|3],
                S4 ^ HEAP[offset|4],
                S5 ^ HEAP[offset|5],
                S6 ^ HEAP[offset|6],
                S7 ^ HEAP[offset|7],
                S8 ^ HEAP[offset|8],
                S9 ^ HEAP[offset|9],
                SA ^ HEAP[offset|10],
                SB ^ HEAP[offset|11],
                SC ^ HEAP[offset|12],
                SD ^ HEAP[offset|13],
                SE ^ HEAP[offset|14],
                SF ^ HEAP[offset|15]
            );

            HEAP[offset] = S0;
            HEAP[offset|1] = S1;
            HEAP[offset|2] = S2;
            HEAP[offset|3] = S3;
            HEAP[offset|4] = S4;
            HEAP[offset|5] = S5;
            HEAP[offset|6] = S6;
            HEAP[offset|7] = S7;
            HEAP[offset|8] = S8;
            HEAP[offset|9] = S9;
            HEAP[offset|10] = SA;
            HEAP[offset|11] = SB;
            HEAP[offset|12] = SC;
            HEAP[offset|13] = SD;
            HEAP[offset|14] = SE;
            HEAP[offset|15] = SF;

            offset = (offset + 16)|0;
            length = (length - 16)|0;

            encrypted = (encrypted + 16)|0;
        }

        return encrypted|0;
    }

    // offset, length - multiple of 16
    function cbc_decrypt ( offset, length ) {
        offset = offset|0;
        length = length|0;

        var iv0 = 0, iv1 = 0, iv2 = 0, iv3 = 0, iv4 = 0, iv5 = 0, iv6 = 0, iv7 = 0, iv8 = 0, iv9 = 0, ivA = 0, ivB = 0, ivC = 0, ivD = 0, ivE = 0, ivF = 0,
            decrypted = 0;

        if ( offset & 15 )
            return -1;

        iv0 = S0; iv1 = S1; iv2 = S2; iv3 = S3; iv4 = S4; iv5 = S5; iv6 = S6; iv7 = S7; iv8 = S8; iv9 = S9; ivA = SA; ivB = SB; ivC = SC; ivD = SD; ivE = SE; ivF = SF;

        while ( (length|0) >= 16 ) {
            _decrypt(
                HEAP[offset]|0,
                HEAP[offset|1]|0,
                HEAP[offset|2]|0,
                HEAP[offset|3]|0,
                HEAP[offset|4]|0,
                HEAP[offset|5]|0,
                HEAP[offset|6]|0,
                HEAP[offset|7]|0,
                HEAP[offset|8]|0,
                HEAP[offset|9]|0,
                HEAP[offset|10]|0,
                HEAP[offset|11]|0,
                HEAP[offset|12]|0,
                HEAP[offset|13]|0,
                HEAP[offset|14]|0,
                HEAP[offset|15]|0
            );

            S0 = S0 ^ iv0; iv0 = HEAP[offset]|0;
            S1 = S1 ^ iv1; iv1 = HEAP[offset|1]|0;
            S2 = S2 ^ iv2; iv2 = HEAP[offset|2]|0;
            S3 = S3 ^ iv3; iv3 = HEAP[offset|3]|0;
            S4 = S4 ^ iv4; iv4 = HEAP[offset|4]|0;
            S5 = S5 ^ iv5; iv5 = HEAP[offset|5]|0;
            S6 = S6 ^ iv6; iv6 = HEAP[offset|6]|0;
            S7 = S7 ^ iv7; iv7 = HEAP[offset|7]|0;
            S8 = S8 ^ iv8; iv8 = HEAP[offset|8]|0;
            S9 = S9 ^ iv9; iv9 = HEAP[offset|9]|0;
            SA = SA ^ ivA; ivA = HEAP[offset|10]|0;
            SB = SB ^ ivB; ivB = HEAP[offset|11]|0;
            SC = SC ^ ivC; ivC = HEAP[offset|12]|0;
            SD = SD ^ ivD; ivD = HEAP[offset|13]|0;
            SE = SE ^ ivE; ivE = HEAP[offset|14]|0;
            SF = SF ^ ivF; ivF = HEAP[offset|15]|0;

            HEAP[offset] = S0;
            HEAP[offset|1] = S1;
            HEAP[offset|2] = S2;
            HEAP[offset|3] = S3;
            HEAP[offset|4] = S4;
            HEAP[offset|5] = S5;
            HEAP[offset|6] = S6;
            HEAP[offset|7] = S7;
            HEAP[offset|8] = S8;
            HEAP[offset|9] = S9;
            HEAP[offset|10] = SA;
            HEAP[offset|11] = SB;
            HEAP[offset|12] = SC;
            HEAP[offset|13] = SD;
            HEAP[offset|14] = SE;
            HEAP[offset|15] = SF;

            offset = (offset + 16)|0;
            length = (length - 16)|0;

            decrypted = (decrypted + 16)|0;
        }

        S0 = iv0; S1 = iv1; S2 = iv2; S3 = iv3; S4 = iv4; S5 = iv5; S6 = iv6; S7 = iv7; S8 = iv8; S9 = iv9; SA = ivA; SB = ivB; SC = ivC; SD = ivD; SE = ivE; SF = ivF;

        return decrypted|0;
    }

    // offset, length, output - multiple of 16
    function cbc_mac ( offset, length, output ) {
        offset = offset|0;
        length = length|0;
        output = output|0;

        if ( offset & 15 )
            return -1;

        if ( ~output )
            if ( output & 31 )
                return -1;

        while ( (length|0) >= 16 ) {
            _encrypt(
                S0 ^ HEAP[offset],
                S1 ^ HEAP[offset|1],
                S2 ^ HEAP[offset|2],
                S3 ^ HEAP[offset|3],
                S4 ^ HEAP[offset|4],
                S5 ^ HEAP[offset|5],
                S6 ^ HEAP[offset|6],
                S7 ^ HEAP[offset|7],
                S8 ^ HEAP[offset|8],
                S9 ^ HEAP[offset|9],
                SA ^ HEAP[offset|10],
                SB ^ HEAP[offset|11],
                SC ^ HEAP[offset|12],
                SD ^ HEAP[offset|13],
                SE ^ HEAP[offset|14],
                SF ^ HEAP[offset|15]
            );

            offset = (offset + 16)|0;
            length = (length - 16)|0;
        }
        if ( (length|0) > 0 ) {
            S0 = S0 ^ HEAP[offset];
            if ( (length|0) > 1 ) S1 = S1 ^ HEAP[offset|1];
            if ( (length|0) > 2 ) S2 = S2 ^ HEAP[offset|2];
            if ( (length|0) > 3 ) S3 = S3 ^ HEAP[offset|3];
            if ( (length|0) > 4 ) S4 = S4 ^ HEAP[offset|4];
            if ( (length|0) > 5 ) S5 = S5 ^ HEAP[offset|5];
            if ( (length|0) > 6 ) S6 = S6 ^ HEAP[offset|6];
            if ( (length|0) > 7 ) S7 = S7 ^ HEAP[offset|7];
            if ( (length|0) > 8 ) S8 = S8 ^ HEAP[offset|8];
            if ( (length|0) > 9 ) S9 = S9 ^ HEAP[offset|9];
            if ( (length|0) > 10 ) SA = SA ^ HEAP[offset|10];
            if ( (length|0) > 11 ) SB = SB ^ HEAP[offset|11];
            if ( (length|0) > 12 ) SC = SC ^ HEAP[offset|12];
            if ( (length|0) > 13 ) SD = SD ^ HEAP[offset|13];
            if ( (length|0) > 14 ) SE = SE ^ HEAP[offset|14];

            _encrypt( S0, S1, S2, S3, S4, S5, S6, S7, S8, S9, SA, SB, SC, SD, SE, SF );

            offset = (offset + length)|0;
            length = 0;
        }

        if ( ~output ) {
            HEAP[output|0] = S0;
            HEAP[output|1] = S1;
            HEAP[output|2] = S2;
            HEAP[output|3] = S3;
            HEAP[output|4] = S4;
            HEAP[output|5] = S5;
            HEAP[output|6] = S6;
            HEAP[output|7] = S7;
            HEAP[output|8] = S8;
            HEAP[output|9] = S9;
            HEAP[output|10] = SA;
            HEAP[output|11] = SB;
            HEAP[output|12] = SC;
            HEAP[output|13] = SD;
            HEAP[output|14] = SE;
            HEAP[output|15] = SF;
        }

        return 0;
    }

    // offset, length - multiple of 16
    function ctr_encrypt ( offset, length, n0, n1, n2, n3, n4, n5, n6, n7, n8, n9, nA, nB, nCDEF ) {
        offset = offset|0;
        length = length|0;
        n0 = n0|0;
        n1 = n1|0;
        n2 = n2|0;
        n3 = n3|0;
        n4 = n4|0;
        n5 = n5|0;
        n6 = n6|0;
        n7 = n7|0;
        n8 = n8|0;
        n9 = n9|0;
        nA = nA|0;
        nB = nB|0;
        nCDEF = nCDEF|0;

        var encrypted = 0;

        while ( (length|0) >= 16 ) {
            _encrypt(
                n0, n1, n2, n3, n4, n5, n6, n7, n8, n9, nA, nB,
                nCDEF >>> 24,
                nCDEF >>> 16 & 255,
                nCDEF >>> 8 & 255,
                nCDEF & 255
            );

            HEAP[offset|0] = HEAP[offset|0] ^ S0;
            HEAP[offset|1] = HEAP[offset|1] ^ S1;
            HEAP[offset|2] = HEAP[offset|2] ^ S2;
            HEAP[offset|3] = HEAP[offset|3] ^ S3;
            HEAP[offset|4] = HEAP[offset|4] ^ S4;
            HEAP[offset|5] = HEAP[offset|5] ^ S5;
            HEAP[offset|6] = HEAP[offset|6] ^ S6;
            HEAP[offset|7] = HEAP[offset|7] ^ S7;
            HEAP[offset|8] = HEAP[offset|8] ^ S8;
            HEAP[offset|9] = HEAP[offset|9] ^ S9;
            HEAP[offset|10] = HEAP[offset|10] ^ SA;
            HEAP[offset|11] = HEAP[offset|11] ^ SB;
            HEAP[offset|12] = HEAP[offset|12] ^ SC;
            HEAP[offset|13] = HEAP[offset|13] ^ SD;
            HEAP[offset|14] = HEAP[offset|14] ^ SE;
            HEAP[offset|15] = HEAP[offset|15] ^ SF;

            offset = (offset + 16)|0;
            length = (length - 16)|0;

            encrypted = (encrypted + 16)|0;
            nCDEF = (nCDEF + 1)|0;
        }

        return encrypted|0;
    }

    // offset, length, output - multiple of 16
    function ccm_encrypt ( offset, length, nonce0, nonce1, nonce2, nonce3, nonce4, nonce5, nonce6, nonce7, nonce8, nonce9, nonceA, nonceB, nonceC, nonceD, counter0, counter1 ) {
        offset = offset|0;
        length = length|0;
        nonce0 = nonce0|0;
        nonce1 = nonce1|0;
        nonce2 = nonce2|0;
        nonce3 = nonce3|0;
        nonce4 = nonce4|0;
        nonce5 = nonce5|0;
        nonce6 = nonce6|0;
        nonce7 = nonce7|0;
        nonce8 = nonce8|0;
        nonce9 = nonce9|0;
        nonceA = nonceA|0;
        nonceB = nonceB|0;
        nonceC = nonceC|0;
        nonceD = nonceD|0;
        counter0 = counter0|0;
        counter1 = counter1|0;

        var iv0 = 0, iv1 = 0, iv2 = 0, iv3 = 0, iv4 = 0, iv5 = 0, iv6 = 0, iv7 = 0, iv8 = 0, iv9 = 0, ivA = 0, ivB = 0, ivC = 0, ivD = 0, ivE = 0, ivF = 0,
            s0 = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0, s5 = 0, s6 = 0, s7 = 0, s8 = 0, s9 = 0, sA = 0, sB = 0, sC = 0, sD = 0, sE = 0, sF = 0,
            encrypted = 0;

        if ( offset & 15 )
            return -1;

        iv0 = S0, iv1 = S1, iv2 = S2, iv3 = S3, iv4 = S4, iv5 = S5, iv6 = S6, iv7 = S7, iv8 = S8, iv9 = S9, ivA = SA, ivB = SB, ivC = SC, ivD = SD, ivE = SE, ivF = SF;

        while ( (length|0) >= 16 ) {
            s0 = HEAP[offset]|0;
            s1 = HEAP[offset|1]|0;
            s2 = HEAP[offset|2]|0;
            s3 = HEAP[offset|3]|0;
            s4 = HEAP[offset|4]|0;
            s5 = HEAP[offset|5]|0;
            s6 = HEAP[offset|6]|0;
            s7 = HEAP[offset|7]|0;
            s8 = HEAP[offset|8]|0;
            s9 = HEAP[offset|9]|0;
            sA = HEAP[offset|10]|0;
            sB = HEAP[offset|11]|0;
            sC = HEAP[offset|12]|0;
            sD = HEAP[offset|13]|0;
            sE = HEAP[offset|14]|0;
            sF = HEAP[offset|15]|0;

            //
            // Cipher
            //

            _encrypt(
                nonce0,
                nonce1,
                nonce2,
                nonce3,
                nonce4,
                nonce5,
                nonce6,
                nonce7,
                nonce8 ^ (counter0>>>24),
                nonce9 ^ (counter0>>>16&255),
                nonceA ^ (counter0>>>8&255),
                nonceB ^ (counter0&255),
                nonceC ^ (counter1>>>24),
                nonceD ^ (counter1>>>16&255),
                counter1>>>8&255,
                counter1&255
            );

            HEAP[offset] = s0 ^ S0;
            HEAP[offset|1] = s1 ^ S1;
            HEAP[offset|2] = s2 ^ S2;
            HEAP[offset|3] = s3 ^ S3;
            HEAP[offset|4] = s4 ^ S4;
            HEAP[offset|5] = s5 ^ S5;
            HEAP[offset|6] = s6 ^ S6;
            HEAP[offset|7] = s7 ^ S7;
            HEAP[offset|8] = s8 ^ S8;
            HEAP[offset|9] = s9 ^ S9;
            HEAP[offset|10] = sA ^ SA;
            HEAP[offset|11] = sB ^ SB;
            HEAP[offset|12] = sC ^ SC;
            HEAP[offset|13] = sD ^ SD;
            HEAP[offset|14] = sE ^ SE;
            HEAP[offset|15] = sF ^ SF;

            //
            // MAC
            //

            _encrypt(
                s0 ^ iv0,
                s1 ^ iv1,
                s2 ^ iv2,
                s3 ^ iv3,
                s4 ^ iv4,
                s5 ^ iv5,
                s6 ^ iv6,
                s7 ^ iv7,
                s8 ^ iv8,
                s9 ^ iv9,
                sA ^ ivA,
                sB ^ ivB,
                sC ^ ivC,
                sD ^ ivD,
                sE ^ ivE,
                sF ^ ivF
            );

            iv0 = S0, iv1 = S1, iv2 = S2, iv3 = S3, iv4 = S4, iv5 = S5, iv6 = S6, iv7 = S7, iv8 = S8, iv9 = S9, ivA = SA, ivB = SB, ivC = SC, ivD = SD, ivE = SE, ivF = SF;

            encrypted = (encrypted + 16)|0;

            offset = (offset + 16)|0;
            length = (length - 16)|0;

            counter1 = (counter1 + 1)|0;
            if ( (counter1|0) == 0 ) counter0 = (counter0 + 1)|0;
        }
        if ( (length|0) > 0 ) {
            s0 = HEAP[offset]|0;
            s1 = (length|0) > 1 ? HEAP[offset|1]|0 : 0;
            s2 = (length|0) > 2 ? HEAP[offset|2]|0 : 0;
            s3 = (length|0) > 3 ? HEAP[offset|3]|0 : 0;
            s4 = (length|0) > 4 ? HEAP[offset|4]|0 : 0;
            s5 = (length|0) > 5 ? HEAP[offset|5]|0 : 0;
            s6 = (length|0) > 6 ? HEAP[offset|6]|0 : 0;
            s7 = (length|0) > 7 ? HEAP[offset|7]|0 : 0;
            s8 = (length|0) > 8 ? HEAP[offset|8]|0 : 0;
            s9 = (length|0) > 9 ? HEAP[offset|9]|0 : 0;
            sA = (length|0) > 10 ? HEAP[offset|10]|0 : 0;
            sB = (length|0) > 11 ? HEAP[offset|11]|0 : 0;
            sC = (length|0) > 12 ? HEAP[offset|12]|0 : 0;
            sD = (length|0) > 13 ? HEAP[offset|13]|0 : 0;
            sE = (length|0) > 14 ? HEAP[offset|14]|0 : 0;
            //sF = 0;

            //
            // Cipher
            //

            _encrypt(
                nonce0,
                nonce1,
                nonce2,
                nonce3,
                nonce4,
                nonce5,
                nonce6,
                nonce7,
                nonce8 ^ (counter0>>>24),
                nonce9 ^ (counter0>>>16&255),
                nonceA ^ (counter0>>>8&255),
                nonceB ^ (counter0&255),
                nonceC ^ (counter1>>>24),
                nonceD ^ (counter1>>>16&255),
                counter1>>>8&255,
                counter1&255
            );

            HEAP[offset] = s0 ^ S0;
            if ( (length|0) > 1 ) HEAP[offset|1] = s1 ^ S1;
            if ( (length|0) > 2 ) HEAP[offset|2] = s2 ^ S2;
            if ( (length|0) > 3 ) HEAP[offset|3] = s3 ^ S3;
            if ( (length|0) > 4 ) HEAP[offset|4] = s4 ^ S4;
            if ( (length|0) > 5 ) HEAP[offset|5] = s5 ^ S5;
            if ( (length|0) > 6 ) HEAP[offset|6] = s6 ^ S6;
            if ( (length|0) > 7 ) HEAP[offset|7] = s7 ^ S7;
            if ( (length|0) > 8 ) HEAP[offset|8] = s8 ^ S8;
            if ( (length|0) > 9 ) HEAP[offset|9] = s9 ^ S9;
            if ( (length|0) > 10 ) HEAP[offset|10] = sA ^ SA;
            if ( (length|0) > 11 ) HEAP[offset|11] = sB ^ SB;
            if ( (length|0) > 12 ) HEAP[offset|12] = sC ^ SC;
            if ( (length|0) > 13 ) HEAP[offset|13] = sD ^ SD;
            if ( (length|0) > 14 ) HEAP[offset|14] = sE ^ SE;
            //if ( 0 ) HEAP[offset|15] = sF ^ SF;

            //
            // MAC
            //

            _encrypt(
                s0 ^ iv0,
                s1 ^ iv1,
                s2 ^ iv2,
                s3 ^ iv3,
                s4 ^ iv4,
                s5 ^ iv5,
                s6 ^ iv6,
                s7 ^ iv7,
                s8 ^ iv8,
                s9 ^ iv9,
                sA ^ ivA,
                sB ^ ivB,
                sC ^ ivC,
                sD ^ ivD,
                sE ^ ivE,
                ivF // sF = 0
            );

            iv0 = S0, iv1 = S1, iv2 = S2, iv3 = S3, iv4 = S4, iv5 = S5, iv6 = S6, iv7 = S7, iv8 = S8, iv9 = S9, ivA = SA, ivB = SB, ivC = SC, ivD = SD, ivE = SE, ivF = SF;

            encrypted = (encrypted + length)|0;

            offset = (offset + length)|0;
            length = 0;

            counter1 = (counter1 + 1)|0;
            if ( (counter1|0) == 0 ) counter0 = (counter0 + 1)|0;
        }

        return encrypted|0;
    }

    // offset, length, output - multiple of 16
    function ccm_decrypt ( offset, length, nonce0, nonce1, nonce2, nonce3, nonce4, nonce5, nonce6, nonce7, nonce8, nonce9, nonceA, nonceB, nonceC, nonceD, counter0, counter1 ) {
        offset = offset|0;
        length = length|0;
        nonce0 = nonce0|0;
        nonce1 = nonce1|0;
        nonce2 = nonce2|0;
        nonce3 = nonce3|0;
        nonce4 = nonce4|0;
        nonce5 = nonce5|0;
        nonce6 = nonce6|0;
        nonce7 = nonce7|0;
        nonce8 = nonce8|0;
        nonce9 = nonce9|0;
        nonceA = nonceA|0;
        nonceB = nonceB|0;
        nonceC = nonceC|0;
        nonceD = nonceD|0;
        counter0 = counter0|0;
        counter1 = counter1|0;

        var iv0 = 0, iv1 = 0, iv2 = 0, iv3 = 0, iv4 = 0, iv5 = 0, iv6 = 0, iv7 = 0, iv8 = 0, iv9 = 0, ivA = 0, ivB = 0, ivC = 0, ivD = 0, ivE = 0, ivF = 0,
            s0 = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0, s5 = 0, s6 = 0, s7 = 0, s8 = 0, s9 = 0, sA = 0, sB = 0, sC = 0, sD = 0, sE = 0, sF = 0,
            decrypted = 0;

        if ( offset & 15 )
            return -1;

        iv0 = S0, iv1 = S1, iv2 = S2, iv3 = S3, iv4 = S4, iv5 = S5, iv6 = S6, iv7 = S7, iv8 = S8, iv9 = S9, ivA = SA, ivB = SB, ivC = SC, ivD = SD, ivE = SE, ivF = SF;

        while ( (length|0) >= 16 ) {
            //
            // Cipher
            //

            _encrypt(
                nonce0,
                nonce1,
                nonce2,
                nonce3,
                nonce4,
                nonce5,
                nonce6,
                nonce7,
                nonce8 ^ (counter0>>>24),
                nonce9 ^ (counter0>>>16&255),
                nonceA ^ (counter0>>>8&255),
                nonceB ^ (counter0&255),
                nonceC ^ (counter1>>>24),
                nonceD ^ (counter1>>>16&255),
                counter1>>>8&255,
                counter1&255
            );

            HEAP[offset] = s0 = HEAP[offset] ^ S0;
            HEAP[offset|1] = s1 = HEAP[offset|1] ^ S1;
            HEAP[offset|2] = s2 = HEAP[offset|2] ^ S2;
            HEAP[offset|3] = s3 = HEAP[offset|3] ^ S3;
            HEAP[offset|4] = s4 = HEAP[offset|4] ^ S4;
            HEAP[offset|5] = s5 = HEAP[offset|5] ^ S5;
            HEAP[offset|6] = s6 = HEAP[offset|6] ^ S6;
            HEAP[offset|7] = s7 = HEAP[offset|7] ^ S7;
            HEAP[offset|8] = s8 = HEAP[offset|8] ^ S8;
            HEAP[offset|9] = s9 = HEAP[offset|9] ^ S9;
            HEAP[offset|10] = sA = HEAP[offset|10] ^ SA;
            HEAP[offset|11] = sB = HEAP[offset|11] ^ SB;
            HEAP[offset|12] = sC = HEAP[offset|12] ^ SC;
            HEAP[offset|13] = sD = HEAP[offset|13] ^ SD;
            HEAP[offset|14] = sE = HEAP[offset|14] ^ SE;
            HEAP[offset|15] = sF = HEAP[offset|15] ^ SF;

            //
            // MAC
            //

            _encrypt(
                s0 ^ iv0,
                s1 ^ iv1,
                s2 ^ iv2,
                s3 ^ iv3,
                s4 ^ iv4,
                s5 ^ iv5,
                s6 ^ iv6,
                s7 ^ iv7,
                s8 ^ iv8,
                s9 ^ iv9,
                sA ^ ivA,
                sB ^ ivB,
                sC ^ ivC,
                sD ^ ivD,
                sE ^ ivE,
                sF ^ ivF
            );

            iv0 = S0, iv1 = S1, iv2 = S2, iv3 = S3, iv4 = S4, iv5 = S5, iv6 = S6, iv7 = S7, iv8 = S8, iv9 = S9, ivA = SA, ivB = SB, ivC = SC, ivD = SD, ivE = SE, ivF = SF;

            decrypted = (decrypted + 16)|0;

            offset = (offset + 16)|0;
            length = (length - 16)|0;

            counter1 = (counter1 + 1)|0;
            if ( (counter1|0) == 0 ) counter0 = (counter0 + 1)|0;
        }
        if ( (length|0) > 0 ) {
            //
            // Cipher
            //

            _encrypt(
                nonce0,
                nonce1,
                nonce2,
                nonce3,
                nonce4,
                nonce5,
                nonce6,
                nonce7,
                nonce8 ^ (counter0>>>24),
                nonce9 ^ (counter0>>>16&255),
                nonceA ^ (counter0>>>8&255),
                nonceB ^ (counter0&255),
                nonceC ^ (counter1>>>24),
                nonceD ^ (counter1>>>16&255),
                counter1>>>8&255,
                counter1&255
            );

            s0 = HEAP[offset] ^ S0;
            s1 = (length|0) > 1 ? HEAP[offset|1] ^ S1 : 0;
            s2 = (length|0) > 2 ? HEAP[offset|2] ^ S2 : 0;
            s3 = (length|0) > 3 ? HEAP[offset|3] ^ S3 : 0;
            s4 = (length|0) > 4 ? HEAP[offset|4] ^ S4 : 0;
            s5 = (length|0) > 5 ? HEAP[offset|5] ^ S5 : 0;
            s6 = (length|0) > 6 ? HEAP[offset|6] ^ S6 : 0;
            s7 = (length|0) > 7 ? HEAP[offset|7] ^ S7 : 0;
            s8 = (length|0) > 8 ? HEAP[offset|8] ^ S8 : 0;
            s9 = (length|0) > 9 ? HEAP[offset|9] ^ S9 : 0;
            sA = (length|0) > 10 ? HEAP[offset|10] ^ SA : 0;
            sB = (length|0) > 11 ? HEAP[offset|11] ^ SB : 0;
            sC = (length|0) > 12 ? HEAP[offset|12] ^ SC : 0;
            sD = (length|0) > 13 ? HEAP[offset|13] ^ SD : 0;
            sE = (length|0) > 14 ? HEAP[offset|14] ^ SE : 0;
            sF = (length|0) > 15 ? HEAP[offset|15] ^ SF : 0;

            HEAP[offset] = s0;
            if ( (length|0) > 1 ) HEAP[offset|1] = s1;
            if ( (length|0) > 2 ) HEAP[offset|2] = s2;
            if ( (length|0) > 3 ) HEAP[offset|3] = s3;
            if ( (length|0) > 4 ) HEAP[offset|4] = s4;
            if ( (length|0) > 5 ) HEAP[offset|5] = s5;
            if ( (length|0) > 6 ) HEAP[offset|6] = s6;
            if ( (length|0) > 7 ) HEAP[offset|7] = s7;
            if ( (length|0) > 8 ) HEAP[offset|8] = s8;
            if ( (length|0) > 9 ) HEAP[offset|9] = s9;
            if ( (length|0) > 10 ) HEAP[offset|10] = sA;
            if ( (length|0) > 11 ) HEAP[offset|11] = sB;
            if ( (length|0) > 12 ) HEAP[offset|12] = sC;
            if ( (length|0) > 13 ) HEAP[offset|13] = sD;
            if ( (length|0) > 14 ) HEAP[offset|14] = sE;
            //if ( (length|0) > 15 ) HEAP[offset|15] = sF;

            //
            // MAC
            //

            _encrypt(
                s0 ^ iv0,
                s1 ^ iv1,
                s2 ^ iv2,
                s3 ^ iv3,
                s4 ^ iv4,
                s5 ^ iv5,
                s6 ^ iv6,
                s7 ^ iv7,
                s8 ^ iv8,
                s9 ^ iv9,
                sA ^ ivA,
                sB ^ ivB,
                sC ^ ivC,
                sD ^ ivD,
                sE ^ ivE,
                sF ^ ivF
            );

            iv0 = S0, iv1 = S1, iv2 = S2, iv3 = S3, iv4 = S4, iv5 = S5, iv6 = S6, iv7 = S7, iv8 = S8, iv9 = S9, ivA = SA, ivB = SB, ivC = SC, ivD = SD, ivE = SE, ivF = SF;

            decrypted = (decrypted + length)|0;

            offset = (offset + length)|0;
            length = 0;

            counter1 = (counter1 + 1)|0;
            if ( (counter1|0) == 0 ) counter0 = (counter0 + 1)|0;
        }

        return decrypted|0;
    }

    // offset, length - multiple of 16
    function cfb_encrypt ( offset, length ) {
        offset = offset|0;
        length = length|0;

        var encrypted = 0;

        if ( offset & 15 )
            return -1;

        while ( (length|0) >= 16 ) {
            _encrypt(
                    S0,
                    S1,
                    S2,
                    S3,
                    S4,
                    S5,
                    S6,
                    S7,
                    S8,
                    S9,
                    SA,
                    SB,
                    SC,
                    SD,
                    SE,
                    SF
            );

            S0 = S0 ^ HEAP[offset];
            S1 = S1 ^ HEAP[offset|1];
            S2 = S2 ^ HEAP[offset|2];
            S3 = S3 ^ HEAP[offset|3];
            S4 = S4 ^ HEAP[offset|4];
            S5 = S5 ^ HEAP[offset|5];
            S6 = S6 ^ HEAP[offset|6];
            S7 = S7 ^ HEAP[offset|7];
            S8 = S8 ^ HEAP[offset|8];
            S9 = S9 ^ HEAP[offset|9];
            SA = SA ^ HEAP[offset|10];
            SB = SB ^ HEAP[offset|11];
            SC = SC ^ HEAP[offset|12];
            SD = SD ^ HEAP[offset|13];
            SE = SE ^ HEAP[offset|14];
            SF = SF ^ HEAP[offset|15];

            HEAP[offset] = S0;
            HEAP[offset|1] = S1;
            HEAP[offset|2] = S2;
            HEAP[offset|3] = S3;
            HEAP[offset|4] = S4;
            HEAP[offset|5] = S5;
            HEAP[offset|6] = S6;
            HEAP[offset|7] = S7;
            HEAP[offset|8] = S8;
            HEAP[offset|9] = S9;
            HEAP[offset|10] = SA;
            HEAP[offset|11] = SB;
            HEAP[offset|12] = SC;
            HEAP[offset|13] = SD;
            HEAP[offset|14] = SE;
            HEAP[offset|15] = SF;

            offset = (offset + 16)|0;
            length = (length - 16)|0;

            encrypted = (encrypted + 16)|0;
        }

        if ( (length|0) > 0 ) {
            _encrypt(
                S0,
                S1,
                S2,
                S3,
                S4,
                S5,
                S6,
                S7,
                S8,
                S9,
                SA,
                SB,
                SC,
                SD,
                SE,
                SF
            );

            HEAP[offset] = HEAP[offset] ^ S0;
            if ( (length|0) > 1 ) HEAP[offset|1] = HEAP[offset|1] ^ S1;
            if ( (length|0) > 2 ) HEAP[offset|2] = HEAP[offset|2] ^ S2;
            if ( (length|0) > 3 ) HEAP[offset|3] = HEAP[offset|3] ^ S3;
            if ( (length|0) > 4 ) HEAP[offset|4] = HEAP[offset|4] ^ S4;
            if ( (length|0) > 5 ) HEAP[offset|5] = HEAP[offset|5] ^ S5;
            if ( (length|0) > 6 ) HEAP[offset|6] = HEAP[offset|6] ^ S6;
            if ( (length|0) > 7 ) HEAP[offset|7] = HEAP[offset|7] ^ S7;
            if ( (length|0) > 8 ) HEAP[offset|8] = HEAP[offset|8] ^ S8;
            if ( (length|0) > 9 ) HEAP[offset|9] = HEAP[offset|9] ^ S9;
            if ( (length|0) > 10 ) HEAP[offset|10] = HEAP[offset|10] ^ SA;
            if ( (length|0) > 11 ) HEAP[offset|11] = HEAP[offset|11] ^ SB;
            if ( (length|0) > 12 ) HEAP[offset|12] = HEAP[offset|12] ^ SC;
            if ( (length|0) > 13 ) HEAP[offset|13] = HEAP[offset|13] ^ SD;
            if ( (length|0) > 14 ) HEAP[offset|14] = HEAP[offset|14] ^ SE;
            //if ( 0 ) HEAP[offset|15] = HEAP[offset|15] ^ SF;

            encrypted = (encrypted + length)|0;

            offset = (offset + length)|0;
            length = 0;
        }

        return encrypted|0;
    }

    // offset, length - multiple of 16
    function cfb_decrypt ( offset, length ) {
        offset = offset|0;
        length = length|0;

        var iv0 = 0, iv1 = 0, iv2 = 0, iv3 = 0, iv4 = 0, iv5 = 0, iv6 = 0, iv7 = 0, iv8 = 0, iv9 = 0, ivA = 0, ivB = 0, ivC = 0, ivD = 0, ivE = 0, ivF = 0,
            decrypted = 0;

        if ( offset & 15 )
            return -1;

        while ( (length|0) >= 16 ) {
            _encrypt(
                    S0,
                    S1,
                    S2,
                    S3,
                    S4,
                    S5,
                    S6,
                    S7,
                    S8,
                    S9,
                    SA,
                    SB,
                    SC,
                    SD,
                    SE,
                    SF
            );

            iv0 = HEAP[offset]|0;
            iv1 = HEAP[offset|1]|0;
            iv2 = HEAP[offset|2]|0;
            iv3 = HEAP[offset|3]|0;
            iv4 = HEAP[offset|4]|0;
            iv5 = HEAP[offset|5]|0;
            iv6 = HEAP[offset|6]|0;
            iv7 = HEAP[offset|7]|0;
            iv8 = HEAP[offset|8]|0;
            iv9 = HEAP[offset|9]|0;
            ivA = HEAP[offset|10]|0;
            ivB = HEAP[offset|11]|0;
            ivC = HEAP[offset|12]|0;
            ivD = HEAP[offset|13]|0;
            ivE = HEAP[offset|14]|0;
            ivF = HEAP[offset|15]|0;

            HEAP[offset] = S0 ^ iv0;
            HEAP[offset|1] = S1 ^ iv1;
            HEAP[offset|2] = S2 ^ iv2;
            HEAP[offset|3] = S3 ^ iv3;
            HEAP[offset|4] = S4 ^ iv4;
            HEAP[offset|5] = S5 ^ iv5;
            HEAP[offset|6] = S6 ^ iv6;
            HEAP[offset|7] = S7 ^ iv7;
            HEAP[offset|8] = S8 ^ iv8;
            HEAP[offset|9] = S9 ^ iv9;
            HEAP[offset|10] = SA ^ ivA;
            HEAP[offset|11] = SB ^ ivB;
            HEAP[offset|12] = SC ^ ivC;
            HEAP[offset|13] = SD ^ ivD;
            HEAP[offset|14] = SE ^ ivE;
            HEAP[offset|15] = SF ^ ivF;

            S0 = iv0;
            S1 = iv1;
            S2 = iv2;
            S3 = iv3;
            S4 = iv4;
            S5 = iv5;
            S6 = iv6;
            S7 = iv7;
            S8 = iv8;
            S9 = iv9;
            SA = ivA;
            SB = ivB;
            SC = ivC;
            SD = ivD;
            SE = ivE;
            SF = ivF;

            offset = (offset + 16)|0;
            length = (length - 16)|0;

            decrypted = (decrypted + 16)|0;
        }


        if ( (length|0) > 0 ) {
            _encrypt(
                S0,
                S1,
                S2,
                S3,
                S4,
                S5,
                S6,
                S7,
                S8,
                S9,
                SA,
                SB,
                SC,
                SD,
                SE,
                SF
            );

            HEAP[offset] = HEAP[offset] ^ S0;
            if ( (length|0) > 1 ) HEAP[offset|1] = HEAP[offset|1] ^ S1;
            if ( (length|0) > 2 ) HEAP[offset|2] = HEAP[offset|2] ^ S2;
            if ( (length|0) > 3 ) HEAP[offset|3] = HEAP[offset|3] ^ S3;
            if ( (length|0) > 4 ) HEAP[offset|4] = HEAP[offset|4] ^ S4;
            if ( (length|0) > 5 ) HEAP[offset|5] = HEAP[offset|5] ^ S5;
            if ( (length|0) > 6 ) HEAP[offset|6] = HEAP[offset|6] ^ S6;
            if ( (length|0) > 7 ) HEAP[offset|7] = HEAP[offset|7] ^ S7;
            if ( (length|0) > 8 ) HEAP[offset|8] = HEAP[offset|8] ^ S8;
            if ( (length|0) > 9 ) HEAP[offset|9] = HEAP[offset|9] ^ S9;
            if ( (length|0) > 10 ) HEAP[offset|10] = HEAP[offset|10] ^ SA;
            if ( (length|0) > 11 ) HEAP[offset|11] = HEAP[offset|11] ^ SB;
            if ( (length|0) > 12 ) HEAP[offset|12] = HEAP[offset|12] ^ SC;
            if ( (length|0) > 13 ) HEAP[offset|13] = HEAP[offset|13] ^ SD;
            if ( (length|0) > 14 ) HEAP[offset|14] = HEAP[offset|14] ^ SE;
            //if ( 0 ) HEAP[offset|15] = HEAP[offset|15] ^ SF;

            decrypted = (decrypted + length)|0;

            offset = (offset + length)|0;
            length = 0;
        }

        return decrypted|0;
    }

    function _gcm_mult ( x0, x1, x2, x3 ) {
        x0 = x0|0;
        x1 = x1|0;
        x2 = x2|0;
        x3 = x3|0;

        var y0 = 0, y1 = 0, y2 = 0, y3 = 0,
            z0 = 0, z1 = 0, z2 = 0, z3 = 0,
            i = 0, c = 0;

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

        Z0 = z0,
        Z1 = z1,
        Z2 = z2,
        Z3 = z3;
    }

    function gcm_init () {
        _encrypt( 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ),
        H0 = (S0 << 24) | (S1 << 16) | (S2 << 8) | S3,
        H1 = (S4 << 24) | (S5 << 16) | (S6 << 8) | S7,
        H2 = (S8 << 24) | (S9 << 16) | (SA << 8) | SB,
        H3 = (SC << 24) | (SD << 16) | (SE << 8) | SF;

        Z0 = Z1 = Z2 = Z3 = 0;
    }

    // offset - multiple of 16
    function gcm_ghash ( offset, length ) {
        offset = offset|0;
        length = length|0;

        var processed = 0;

        if ( offset & 15 )
            return -1;

        Z0 = (S0 << 24) | (S1 << 16) | (S2 << 8) | S3,
        Z1 = (S4 << 24) | (S5 << 16) | (S6 << 8) | S7,
        Z2 = (S8 << 24) | (S9 << 16) | (SA << 8) | SB,
        Z3 = (SC << 24) | (SD << 16) | (SE << 8) | SF;

        while ( (length|0) >= 16 ) {
            _gcm_mult(
                Z0 ^ ( (HEAP[offset|0] << 24) | (HEAP[offset|1] << 16) | (HEAP[offset|2] << 8) | HEAP[offset|3] ),
                Z1 ^ ( (HEAP[offset|4] << 24) | (HEAP[offset|5] << 16) | (HEAP[offset|6] << 8) | HEAP[offset|7] ),
                Z2 ^ ( (HEAP[offset|8] << 24) | (HEAP[offset|9] << 16) | (HEAP[offset|10] << 8) | HEAP[offset|11] ),
                Z3 ^ ( (HEAP[offset|12] << 24) | (HEAP[offset|13] << 16) | (HEAP[offset|14] << 8) | HEAP[offset|15] )
            );

            offset = (offset+16)|0,
            length = (length-16)|0,
            processed = (processed+16)|0;
        }

        S0 = Z0 >>> 24, S1 = (Z0 >>> 16) & 255, S2 = (Z0 >>> 8) & 255, S3 = Z0 & 255,
        S4 = Z1 >>> 24, S5 = (Z1 >>> 16) & 255, S6 = (Z1 >>> 8) & 255, S7 = Z1 & 255,
        S8 = Z2 >>> 24, S9 = (Z2 >>> 16) & 255, SA = (Z2 >>> 8) & 255, SB = Z2 & 255,
        SC = Z3 >>> 24, SD = (Z3 >>> 16) & 255, SE = (Z3 >>> 8) & 255, SF = Z3 & 255;

        return processed|0;
    }

    // offset - multiple of 16
    function gcm_encrypt ( offset, length, g0, g1, g2, g3, g4, g5, g6, g7, g8, g9, gA, gB, gCDEF ) {
        offset = offset|0;
        length = length|0;
        g0 = g0|0;
        g1 = g1|0;
        g2 = g2|0;
        g3 = g3|0;
        g4 = g4|0;
        g5 = g5|0;
        g6 = g6|0;
        g7 = g7|0;
        g8 = g8|0;
        g9 = g9|0;
        gA = gA|0;
        gB = gB|0;
        gCDEF = gCDEF|0;

        var s0 = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0, s5 = 0, s6 = 0, s7 = 0, s8 = 0, s9 = 0, sA = 0, sB = 0, sC = 0, sD = 0, sE = 0, sF = 0,
            processed = 0;

        if ( offset & 15 )
            return -1;

        while ( (length|0) >= 16 ) {
            _encrypt(
                g0, g1, g2, g3, g4, g5, g6, g7, g8, g9, gA, gB,
                gCDEF >>> 24, (gCDEF >>> 16) & 255, (gCDEF >>> 8) & 255, gCDEF & 255
            );

            HEAP[offset|0] = s0 = HEAP[offset|0] ^ S0,
            HEAP[offset|1] = s1 = HEAP[offset|1] ^ S1,
            HEAP[offset|2] = s2 = HEAP[offset|2] ^ S2,
            HEAP[offset|3] = s3 = HEAP[offset|3] ^ S3,
            HEAP[offset|4] = s4 = HEAP[offset|4] ^ S4,
            HEAP[offset|5] = s5 = HEAP[offset|5] ^ S5,
            HEAP[offset|6] = s6 = HEAP[offset|6] ^ S6,
            HEAP[offset|7] = s7 = HEAP[offset|7] ^ S7,
            HEAP[offset|8] = s8 = HEAP[offset|8] ^ S8,
            HEAP[offset|9] = s9 = HEAP[offset|9] ^ S9,
            HEAP[offset|10] = sA = HEAP[offset|10] ^ SA,
            HEAP[offset|11] = sB = HEAP[offset|11] ^ SB,
            HEAP[offset|12] = sC = HEAP[offset|12] ^ SC,
            HEAP[offset|13] = sD = HEAP[offset|13] ^ SD,
            HEAP[offset|14] = sE = HEAP[offset|14] ^ SE,
            HEAP[offset|15] = sF = HEAP[offset|15] ^ SF;

            _gcm_mult(
                Z0 ^ ( (s0 << 24) | (s1 << 16) | (s2 << 8) | s3 ),
                Z1 ^ ( (s4 << 24) | (s5 << 16) | (s6 << 8) | s7 ),
                Z2 ^ ( (s8 << 24) | (s9 << 16) | (sA << 8) | sB ),
                Z3 ^ ( (sC << 24) | (sD << 16) | (sE << 8) | sF )
            );

            gCDEF = (gCDEF + 1)|0;

            offset = (offset+16)|0,
            length = (length-16)|0,
            processed = (processed+16)|0;
        }

        if ( (length|0) > 0 ) {
            _encrypt(
                g0, g1, g2, g3, g4, g5, g6, g7, g8, g9, gA, gB,
                gCDEF >>> 24, (gCDEF >>> 16) & 255, (gCDEF >>> 8) & 255, gCDEF & 255
            );

            s0 = HEAP[offset|0] ^ S0,
            s1 = (length|0) > 1 ? HEAP[offset|1] ^ S1 : 0,
            s2 = (length|0) > 2 ? HEAP[offset|2] ^ S2 : 0,
            s3 = (length|0) > 3 ? HEAP[offset|3] ^ S3 : 0,
            s4 = (length|0) > 4 ? HEAP[offset|4] ^ S4 : 0,
            s5 = (length|0) > 5 ? HEAP[offset|5] ^ S5 : 0,
            s6 = (length|0) > 6 ? HEAP[offset|6] ^ S6 : 0,
            s7 = (length|0) > 7 ? HEAP[offset|7] ^ S7 : 0,
            s8 = (length|0) > 8 ? HEAP[offset|8] ^ S8 : 0,
            s9 = (length|0) > 9 ? HEAP[offset|9] ^ S9 : 0,
            sA = (length|0) > 10 ? HEAP[offset|10] ^ SA : 0,
            sB = (length|0) > 11 ? HEAP[offset|11] ^ SB : 0,
            sC = (length|0) > 12 ? HEAP[offset|12] ^ SC : 0,
            sD = (length|0) > 13 ? HEAP[offset|13] ^ SD : 0,
            sE = (length|0) > 14 ? HEAP[offset|14] ^ SE : 0;
            sF = /*(length|0) > 15 ? HEAP[offset|15] ^ SF :*/ 0;

            HEAP[offset] = s0;
            if ( (length|0) > 1 ) HEAP[offset|1] = s1;
            if ( (length|0) > 2 ) HEAP[offset|2] = s2;
            if ( (length|0) > 3 ) HEAP[offset|3] = s3;
            if ( (length|0) > 4 ) HEAP[offset|4] = s4;
            if ( (length|0) > 5 ) HEAP[offset|5] = s5;
            if ( (length|0) > 6 ) HEAP[offset|6] = s6;
            if ( (length|0) > 7 ) HEAP[offset|7] = s7;
            if ( (length|0) > 8 ) HEAP[offset|8] = s8;
            if ( (length|0) > 9 ) HEAP[offset|9] = s9;
            if ( (length|0) > 10 ) HEAP[offset|10] = sA;
            if ( (length|0) > 11 ) HEAP[offset|11] = sB;
            if ( (length|0) > 12 ) HEAP[offset|12] = sC;
            if ( (length|0) > 13 ) HEAP[offset|13] = sD;
            if ( (length|0) > 14 ) HEAP[offset|14] = sE;
            //if ( 0 ) HEAP[offset|15] = sF;

            _gcm_mult(
                Z0 ^ ( (s0 << 24) | (s1 << 16) | (s2 << 8) | s3 ),
                Z1 ^ ( (s4 << 24) | (s5 << 16) | (s6 << 8) | s7 ),
                Z2 ^ ( (s8 << 24) | (s9 << 16) | (sA << 8) | sB ),
                Z3 ^ ( (sC << 24) | (sD << 16) | (sE << 8) | sF )
            );

            gCDEF = (gCDEF+1)|0;

            processed = (processed+length)|0;
        }

        S0 = Z0 >>> 24, S1 = (Z0 >>> 16) & 255, S2 = (Z0 >>> 8) & 255, S3 = Z0 & 255,
        S4 = Z1 >>> 24, S5 = (Z1 >>> 16) & 255, S6 = (Z1 >>> 8) & 255, S7 = Z1 & 255,
        S8 = Z2 >>> 24, S9 = (Z2 >>> 16) & 255, SA = (Z2 >>> 8) & 255, SB = Z2 & 255,
        SC = Z3 >>> 24, SD = (Z3 >>> 16) & 255, SE = (Z3 >>> 8) & 255, SF = Z3 & 255;

        return processed|0;
    }

    function gcm_decrypt ( offset, length, g0, g1, g2, g3, g4, g5, g6, g7, g8, g9, gA, gB, gCDEF ) {
        offset = offset|0;
        length = length|0;
        g0 = g0|0;
        g1 = g1|0;
        g2 = g2|0;
        g3 = g3|0;
        g4 = g4|0;
        g5 = g5|0;
        g6 = g6|0;
        g7 = g7|0;
        g8 = g8|0;
        g9 = g9|0;
        gA = gA|0;
        gB = gB|0;
        gCDEF = gCDEF|0;

        var s0 = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0, s5 = 0, s6 = 0, s7 = 0, s8 = 0, s9 = 0, sA = 0, sB = 0, sC = 0, sD = 0, sE = 0, sF = 0,
            processed = 0;

        if ( offset & 15 )
            return -1;

        while ( (length|0) >= 16 ) {
            s0 = HEAP[offset|0]|0,
            s1 = HEAP[offset|1]|0,
            s2 = HEAP[offset|2]|0,
            s3 = HEAP[offset|3]|0,
            s4 = HEAP[offset|4]|0,
            s5 = HEAP[offset|5]|0,
            s6 = HEAP[offset|6]|0,
            s7 = HEAP[offset|7]|0,
            s8 = HEAP[offset|8]|0,
            s9 = HEAP[offset|9]|0,
            sA = HEAP[offset|10]|0,
            sB = HEAP[offset|11]|0,
            sC = HEAP[offset|12]|0,
            sD = HEAP[offset|13]|0,
            sE = HEAP[offset|14]|0,
            sF = HEAP[offset|15]|0;

            _gcm_mult(
                Z0 ^ ( (s0 << 24) | (s1 << 16) | (s2 << 8) | s3 ),
                Z1 ^ ( (s4 << 24) | (s5 << 16) | (s6 << 8) | s7 ),
                Z2 ^ ( (s8 << 24) | (s9 << 16) | (sA << 8) | sB ),
                Z3 ^ ( (sC << 24) | (sD << 16) | (sE << 8) | sF )
            );

            _encrypt(
                g0, g1, g2, g3, g4, g5, g6, g7, g8, g9, gA, gB,
                gCDEF >>> 24, (gCDEF >>> 16) & 255, (gCDEF >>> 8) & 255, gCDEF & 255
            );

            HEAP[offset|0] = s0 ^ S0,
            HEAP[offset|1] = s1 ^ S1,
            HEAP[offset|2] = s2 ^ S2,
            HEAP[offset|3] = s3 ^ S3,
            HEAP[offset|4] = s4 ^ S4,
            HEAP[offset|5] = s5 ^ S5,
            HEAP[offset|6] = s6 ^ S6,
            HEAP[offset|7] = s7 ^ S7,
            HEAP[offset|8] = s8 ^ S8,
            HEAP[offset|9] = s9 ^ S9,
            HEAP[offset|10] = sA ^ SA,
            HEAP[offset|11] = sB ^ SB,
            HEAP[offset|12] = sC ^ SC,
            HEAP[offset|13] = sD ^ SD,
            HEAP[offset|14] = sE ^ SE,
            HEAP[offset|15] = sF ^ SF;

            gCDEF = (gCDEF + 1)|0;

            offset = (offset+16)|0,
            length = (length-16)|0,
            processed = (processed+16)|0;
        }

        if ( (length|0) > 0 ) {
            s0 = HEAP[offset|0]|0,
            s1 = (length|0) > 1 ? HEAP[offset|1]|0 : 0,
            s2 = (length|0) > 2 ? HEAP[offset|2]|0 : 0,
            s3 = (length|0) > 3 ? HEAP[offset|3]|0 : 0,
            s4 = (length|0) > 4 ? HEAP[offset|4]|0 : 0,
            s5 = (length|0) > 5 ? HEAP[offset|5]|0 : 0,
            s6 = (length|0) > 6 ? HEAP[offset|6]|0 : 0,
            s7 = (length|0) > 7 ? HEAP[offset|7]|0 : 0,
            s8 = (length|0) > 8 ? HEAP[offset|8]|0 : 0,
            s9 = (length|0) > 9 ? HEAP[offset|9]|0 : 0,
            sA = (length|0) > 10 ? HEAP[offset|10]|0 : 0,
            sB = (length|0) > 11 ? HEAP[offset|11]|0 : 0,
            sC = (length|0) > 12 ? HEAP[offset|12]|0 : 0,
            sD = (length|0) > 13 ? HEAP[offset|13]|0 : 0,
            sE = (length|0) > 14 ? HEAP[offset|14]|0 : 0;
            sF = /*(length|0) > 15 ? HEAP[offset|15] :*/ 0;

            _gcm_mult(
                Z0 ^ ( (s0 << 24) | (s1 << 16) | (s2 << 8) | s3 ),
                Z1 ^ ( (s4 << 24) | (s5 << 16) | (s6 << 8) | s7 ),
                Z2 ^ ( (s8 << 24) | (s9 << 16) | (sA << 8) | sB ),
                Z3 ^ ( (sC << 24) | (sD << 16) | (sE << 8) | sF )
            );

            _encrypt(
                g0, g1, g2, g3, g4, g5, g6, g7, g8, g9, gA, gB,
                gCDEF >>> 24, (gCDEF >>> 16) & 255, (gCDEF >>> 8) & 255, gCDEF & 255
            );

            HEAP[offset] = s0 ^ S0;
            if ( (length|0) > 1 ) HEAP[offset|1] = s1 ^ S1;
            if ( (length|0) > 2 ) HEAP[offset|2] = s2 ^ S2;
            if ( (length|0) > 3 ) HEAP[offset|3] = s3 ^ S3;
            if ( (length|0) > 4 ) HEAP[offset|4] = s4 ^ S4;
            if ( (length|0) > 5 ) HEAP[offset|5] = s5 ^ S5;
            if ( (length|0) > 6 ) HEAP[offset|6] = s6 ^ S6;
            if ( (length|0) > 7 ) HEAP[offset|7] = s7 ^ S7;
            if ( (length|0) > 8 ) HEAP[offset|8] = s8 ^ S8;
            if ( (length|0) > 9 ) HEAP[offset|9] = s9 ^ S9;
            if ( (length|0) > 10 ) HEAP[offset|10] = sA ^ SA;
            if ( (length|0) > 11 ) HEAP[offset|11] = sB ^ SB;
            if ( (length|0) > 12 ) HEAP[offset|12] = sC ^ SC;
            if ( (length|0) > 13 ) HEAP[offset|13] = sD ^ SD;
            if ( (length|0) > 14 ) HEAP[offset|14] = sE ^ SE;
            //if ( 0 ) HEAP[offset|15] = sF ^ SF;

            gCDEF = (gCDEF+1)|0;

            processed = (processed+length)|0;
        }

        S0 = Z0 >>> 24, S1 = (Z0 >>> 16) & 255, S2 = (Z0 >>> 8) & 255, S3 = Z0 & 255,
        S4 = Z1 >>> 24, S5 = (Z1 >>> 16) & 255, S6 = (Z1 >>> 8) & 255, S7 = Z1 & 255,
        S8 = Z2 >>> 24, S9 = (Z2 >>> 16) & 255, SA = (Z2 >>> 8) & 255, SB = Z2 & 255,
        SC = Z3 >>> 24, SD = (Z3 >>> 16) & 255, SE = (Z3 >>> 8) & 255, SF = Z3 & 255;

        return processed|0;
    }

    return {
        _encrypt: _encrypt,
        _decrypt: _decrypt,

        init_state: init_state,
        save_state: save_state,

        init_key_128: init_key_128,
        init_key_256: init_key_256,

        ecb_encrypt: ecb_encrypt,
        ecb_decrypt: ecb_decrypt,

        cbc_encrypt: cbc_encrypt,
        cbc_decrypt: cbc_decrypt,
        cbc_mac: cbc_mac,

        ctr_encrypt: ctr_encrypt,
        ctr_decrypt: ctr_encrypt,

        ccm_encrypt: ccm_encrypt,
        ccm_decrypt: ccm_decrypt,

        cfb_encrypt: cfb_encrypt,
        cfb_decrypt: cfb_decrypt,

        gcm_init: gcm_init,
        gcm_ghash: gcm_ghash,
        gcm_encrypt: gcm_encrypt,
        gcm_decrypt: gcm_decrypt,
    };
}

function aes_asm ( stdlib, foreign, buffer ) {
    var heap = new Uint8Array(buffer);
    heap.set(_aes_tables);
    return _aes_asm( stdlib, foreign, buffer );
}
