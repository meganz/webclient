// Copyright (c) 2007, 2013, 2014 Michele Bini
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is furnished
// to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

var c255lbase32chars = "abcdefghijklmnopqrstuvwxyz234567";
var c255lbase32values = {"a":0, "b":1, "c":2, "d":3, "e":4, "f":5, "g":6, "h":7, "i":8, "j":9, "k":10, "l":11, "m":12, "n":13, "o":14, "p":15, "q":16, "r":17, "s":18, "t":19, "u":20, "v":21, "w":22, "x":23, "y":24, "z":25, "2":26, "3":27, "4":28, "5":29, "6":30, "7":31 };
function c255lbase32encode(n) {
  var c;
  var r = "";
  for (c = 0; c < 255; c+=5) {
    r = c255lbase32chars.substr(c255lgetbit(n, c) + (c255lgetbit(n, c+1) << 1) + (c255lgetbit(n, c+2) << 2) + (c255lgetbit(n, c+3) << 3) + (c255lgetbit(n, c+4) << 4), 1) + r;
  }
  return r;
}
function c255lbase32decode(n) {
  var c = 0;
  var r = c255lzero();
  var l = n.length;
  for (c = 0; (l > 0) && (c < 255); c+=5) {
    l--;
    var v = c255lbase32values[n.substr(l, 1)];
    c255lsetbit(r, c,    v&1); v = v >> 1;
    c255lsetbit(r, c+1,  v&1); v = v >> 1;
    c255lsetbit(r, c+2,  v&1); v = v >> 1;
    c255lsetbit(r, c+3,  v&1); v = v >> 1;
    c255lsetbit(r, c+4,  v&1);
  }
  return r;
}
var c255lhexchars = "0123456789abcdef";
var c255lhexvalues = {"0":0, "1":1, "2":2, "3":3, "4":4, "5":5, "6":6, "7":7,  "8":8, "9":9, "a":10, "b":11, "c":12, "d":13, "e":14, "f":15 };
function c255lhexencode(n) {
  var c;
  var r = "";
  for (c = 0; c < 255; c+=4) {
    r = c255lhexchars.substr(c255lgetbit(n, c) + (c255lgetbit(n, c+1) << 1) + (c255lgetbit(n, c+2) << 2) + (c255lgetbit(n, c+3) << 3), 1) + r;
  }
  return r;
}
function c255lhexdecode(n) {
  var c = 0;
  var r = c255lzero();
  var l = n.length;
  for (c = 0; (l > 0) && (c < 255); c+=4) {
    l--;
    var v = c255lhexvalues[n.substr(l, 1)];
    c255lsetbit(r, c,    v&1); v = v >> 1;
    c255lsetbit(r, c+1,  v&1); v = v >> 1;
    c255lsetbit(r, c+2,  v&1); v = v >> 1;
    c255lsetbit(r, c+3,  v&1);
  }
  return r;
}
var c255lprime = [0xffff-18, 0xffff, 0xffff, 0xffff,  0xffff, 0xffff, 0xffff, 0xffff,  0xffff, 0xffff, 0xffff, 0xffff,  0xffff, 0xffff, 0xffff, 0x7fff];
function c255lsetbit(n, c, v) {
  var i = c >> 4;
  var a = n[i];
  a = a + (1 << (c & 0xf)) * v;
  n[i] = a;
}
function c255lgetbit(n, c) {
  return (n[c >> 4] >> (c & 0xf)) & 1;
}
function c255lzero() {
  return [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
}
function c255lone() {
  return [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
}
function c255lbase() { // Basepoint
  return [9,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
}
// return -1, 0, +1 when a is less than, equal, or greater than b
function c255lbigintcmp(a, b) {
 // The following code is a bit tricky to avoid code branching
  var c, abs_r, mask;
  var r = 0;
  for (c = 15; c >= 0; c--) {
    var x = a[c];
    var y = b[c];
    r = r + (x - y)*(1 - r*r);
    // http://graphics.stanford.edu/~seander/bithacks.html#IntegerAbs
    // correct for [-294967295, 294967295]
    mask = r >> 31;
    abs_r = (r + mask) ^ mask;
    // http://stackoverflow.com/questions/596467/how-do-i-convert-a-number-to-an-integer-in-javascript
    // this rounds towards zero
    r = ~~((r << 1) / (abs_r + 1));
  }
  return r;
}
function c255lbigintadd(a, b) {
  var r = [];
  var v;
  r[0] = (v = a[0] + b[0]) & 0xffff;
  r[1] = (v = (v >>> 16) + a[1] + b[1]) & 0xffff;
  r[2] = (v = (v >>> 16) + a[2] + b[2]) & 0xffff;
  r[3] = (v = (v >>> 16) + a[3] + b[3]) & 0xffff;
  r[4] = (v = (v >>> 16) + a[4] + b[4]) & 0xffff;
  r[5] = (v = (v >>> 16) + a[5] + b[5]) & 0xffff;
  r[6] = (v = (v >>> 16) + a[6] + b[6]) & 0xffff;
  r[7] = (v = (v >>> 16) + a[7] + b[7]) & 0xffff;
  r[8] = (v = (v >>> 16) + a[8] + b[8]) & 0xffff;
  r[9] = (v = (v >>> 16) + a[9] + b[9]) & 0xffff;
  r[10] = (v = (v >>> 16) + a[10] + b[10]) & 0xffff;
  r[11] = (v = (v >>> 16) + a[11] + b[11]) & 0xffff;
  r[12] = (v = (v >>> 16) + a[12] + b[12]) & 0xffff;
  r[13] = (v = (v >>> 16) + a[13] + b[13]) & 0xffff;
  r[14] = (v = (v >>> 16) + a[14] + b[14]) & 0xffff;
  r[15] = (v >>> 16) + a[15] + b[15];
  return r;
}
function c255lbigintsub(a, b) {
  var r = [];
  var v;
  r[0] = (v = 0x80000 + a[0] - b[0]) & 0xffff;
  r[1] = (v = (v >>> 16) + 0x7fff8 + a[1] - b[1]) & 0xffff;
  r[2] = (v = (v >>> 16) + 0x7fff8 + a[2] - b[2]) & 0xffff;
  r[3] = (v = (v >>> 16) + 0x7fff8 + a[3] - b[3]) & 0xffff;
  r[4] = (v = (v >>> 16) + 0x7fff8 + a[4] - b[4]) & 0xffff;
  r[5] = (v = (v >>> 16) + 0x7fff8 + a[5] - b[5]) & 0xffff;
  r[6] = (v = (v >>> 16) + 0x7fff8 + a[6] - b[6]) & 0xffff;
  r[7] = (v = (v >>> 16) + 0x7fff8 + a[7] - b[7]) & 0xffff;
  r[8] = (v = (v >>> 16) + 0x7fff8 + a[8] - b[8]) & 0xffff;
  r[9] = (v = (v >>> 16) + 0x7fff8 + a[9] - b[9]) & 0xffff;
  r[10] = (v = (v >>> 16) + 0x7fff8 + a[10] - b[10]) & 0xffff;
  r[11] = (v = (v >>> 16) + 0x7fff8 + a[11] - b[11]) & 0xffff;
  r[12] = (v = (v >>> 16) + 0x7fff8 + a[12] - b[12]) & 0xffff;
  r[13] = (v = (v >>> 16) + 0x7fff8 + a[13] - b[13]) & 0xffff;
  r[14] = (v = (v >>> 16) + 0x7fff8 + a[14] - b[14]) & 0xffff;
  r[15] = (v >>> 16) - 8 + a[15] - b[15];
  return r;
}

function c255lsqr8h(a7, a6, a5, a4, a3, a2, a1, a0) {
  // 'division by 0x10000' can not be replaced by '>> 16' because more than 32 bits of precision are needed
  // similarly 'multiplication by 2' cannot be replaced by '<< 1'
  var r = [];
  var v;
  r[0] = (v = a0*a0) & 0xffff;
  r[1] = (v = (0|(v / 0x10000)) + 2*a0*a1) & 0xffff;
  r[2] = (v = (0|(v / 0x10000)) + 2*a0*a2 + a1*a1) & 0xffff;
  r[3] = (v = (0|(v / 0x10000)) + 2*a0*a3 + 2*a1*a2) & 0xffff;
  r[4] = (v = (0|(v / 0x10000)) + 2*a0*a4 + 2*a1*a3 + a2*a2) & 0xffff;
  r[5] = (v = (0|(v / 0x10000)) + 2*a0*a5 + 2*a1*a4 + 2*a2*a3) & 0xffff;
  r[6] = (v = (0|(v / 0x10000)) + 2*a0*a6 + 2*a1*a5 + 2*a2*a4 + a3*a3) & 0xffff;
  r[7] = (v = (0|(v / 0x10000)) + 2*a0*a7 + 2*a1*a6 + 2*a2*a5 + 2*a3*a4) & 0xffff;
  r[8] = (v = (0|(v / 0x10000)) + 2*a1*a7 + 2*a2*a6 + 2*a3*a5 + a4*a4) & 0xffff;
  r[9] = (v = (0|(v / 0x10000)) + 2*a2*a7 + 2*a3*a6 + 2*a4*a5) & 0xffff;
  r[10] = (v = (0|(v / 0x10000)) + 2*a3*a7 + 2*a4*a6 + a5*a5) & 0xffff;
  r[11] = (v = (0|(v / 0x10000)) + 2*a4*a7 + 2*a5*a6) & 0xffff;
  r[12] = (v = (0|(v / 0x10000)) + 2*a5*a7 + a6*a6) & 0xffff;
  r[13] = (v = (0|(v / 0x10000)) + 2*a6*a7) & 0xffff;
  r[14] = (v = (0|(v / 0x10000)) + a7*a7) & 0xffff;
  r[15] = 0|(v / 0x10000);
  return r;
}

function c255lsqrmodp(a) {
  var x = c255lsqr8h(a[15], a[14], a[13], a[12], a[11], a[10], a[9], a[8]);
  var z = c255lsqr8h(a[7], a[6], a[5], a[4], a[3], a[2], a[1], a[0]);
  var y = c255lsqr8h(a[15] + a[7], a[14] + a[6], a[13] + a[5], a[12] + a[4], a[11] + a[3], a[10] + a[2], a[9] + a[1], a[8] + a[0]);
  var r = [];
  var v;
  r[0] = (v = 0x800000 + z[0] + (y[8] -x[8] -z[8] + x[0] -0x80) * 38) & 0xffff;
  r[1] = (v = 0x7fff80 + (v >>> 16) + z[1] + (y[9] -x[9] -z[9] + x[1]) * 38) & 0xffff;
  r[2] = (v = 0x7fff80 + (v >>> 16) + z[2] + (y[10] -x[10] -z[10] + x[2]) * 38) & 0xffff;
  r[3] = (v = 0x7fff80 + (v >>> 16) + z[3] + (y[11] -x[11] -z[11] + x[3]) * 38) & 0xffff;
  r[4] = (v = 0x7fff80 + (v >>> 16) + z[4] + (y[12] -x[12] -z[12] + x[4]) * 38) & 0xffff;
  r[5] = (v = 0x7fff80 + (v >>> 16) + z[5] + (y[13] -x[13] -z[13] + x[5]) * 38) & 0xffff;
  r[6] = (v = 0x7fff80 + (v >>> 16) + z[6] + (y[14] -x[14] -z[14] + x[6]) * 38) & 0xffff;
  r[7] = (v = 0x7fff80 + (v >>> 16) + z[7] + (y[15] -x[15] -z[15] + x[7]) * 38) & 0xffff;
  r[8] = (v = 0x7fff80 + (v >>> 16) + z[8] + y[0] -x[0] -z[0] + x[8] * 38) & 0xffff;
  r[9] = (v = 0x7fff80 + (v >>> 16) + z[9] + y[1] -x[1] -z[1] + x[9] * 38) & 0xffff;
  r[10] = (v = 0x7fff80 + (v >>> 16) + z[10] + y[2] -x[2] -z[2] + x[10] * 38) & 0xffff;
  r[11] = (v = 0x7fff80 + (v >>> 16) + z[11] + y[3] -x[3] -z[3] + x[11] * 38) & 0xffff;
  r[12] = (v = 0x7fff80 + (v >>> 16) + z[12] + y[4] -x[4] -z[4] + x[12] * 38) & 0xffff;
  r[13] = (v = 0x7fff80 + (v >>> 16) + z[13] + y[5] -x[5] -z[5] + x[13] * 38) & 0xffff;
  r[14] = (v = 0x7fff80 + (v >>> 16) + z[14] + y[6] -x[6] -z[6] + x[14] * 38) & 0xffff;
  r[15] = 0x7fff80 + (v >>> 16) + z[15] + y[7] -x[7] -z[7] + x[15] * 38;
  c255lreduce(r);
  return r;
}

function c255lmul8h(a7, a6, a5, a4, a3, a2, a1, a0, b7, b6, b5, b4, b3, b2, b1, b0) {
  // 'division by 0x10000' can not be replaced by '>> 16' because more than 32 bits of precision are needed
  var r = [];
  var v;
  r[0] = (v = a0*b0) & 0xffff;
  r[1] = (v = (0|(v / 0x10000)) + a0*b1 + a1*b0) & 0xffff;
  r[2] = (v = (0|(v / 0x10000)) + a0*b2 + a1*b1 + a2*b0) & 0xffff;
  r[3] = (v = (0|(v / 0x10000)) + a0*b3 + a1*b2 + a2*b1 + a3*b0) & 0xffff;
  r[4] = (v = (0|(v / 0x10000)) + a0*b4 + a1*b3 + a2*b2 + a3*b1 + a4*b0) & 0xffff;
  r[5] = (v = (0|(v / 0x10000)) + a0*b5 + a1*b4 + a2*b3 + a3*b2 + a4*b1 + a5*b0) & 0xffff;
  r[6] = (v = (0|(v / 0x10000)) + a0*b6 + a1*b5 + a2*b4 + a3*b3 + a4*b2 + a5*b1 + a6*b0) & 0xffff;
  r[7] = (v = (0|(v / 0x10000)) + a0*b7 + a1*b6 + a2*b5 + a3*b4 + a4*b3 + a5*b2 + a6*b1 + a7*b0) & 0xffff;
  r[8] = (v = (0|(v / 0x10000)) + a1*b7 + a2*b6 + a3*b5 + a4*b4 + a5*b3 + a6*b2 + a7*b1) & 0xffff;
  r[9] = (v = (0|(v / 0x10000)) + a2*b7 + a3*b6 + a4*b5 + a5*b4 + a6*b3 + a7*b2) & 0xffff;
  r[10] = (v = (0|(v / 0x10000)) + a3*b7 + a4*b6 + a5*b5 + a6*b4 + a7*b3) & 0xffff;
  r[11] = (v = (0|(v / 0x10000)) + a4*b7 + a5*b6 + a6*b5 + a7*b4) & 0xffff;
  r[12] = (v = (0|(v / 0x10000)) + a5*b7 + a6*b6 + a7*b5) & 0xffff;
  r[13] = (v = (0|(v / 0x10000)) + a6*b7 + a7*b6) & 0xffff;
  r[14] = (v = (0|(v / 0x10000)) + a7*b7) & 0xffff;
  r[15] = (0|(v / 0x10000));
  return r;
}

function
c255lmulmodp(a, b) {
  // Karatsuba multiplication scheme: x*y = (b^2+b)*x1*y1 - b*(x1-x0)*(y1-y0) + (b+1)*x0*y0
  var x = c255lmul8h(a[15], a[14], a[13], a[12], a[11], a[10], a[9], a[8], b[15], b[14], b[13], b[12], b[11], b[10], b[9], b[8]);
  var z = c255lmul8h(a[7], a[6], a[5], a[4], a[3], a[2], a[1], a[0], b[7], b[6], b[5], b[4], b[3], b[2], b[1], b[0]);
  var y = c255lmul8h(a[15] + a[7], a[14] + a[6], a[13] + a[5], a[12] + a[4], a[11] + a[3], a[10] + a[2], a[9] + a[1], a[8] + a[0],
  			b[15] + b[7], b[14] + b[6], b[13] + b[5], b[12] + b[4], b[11] + b[3], b[10] + b[2], b[9] + b[1], b[8] + b[0]);
  var r = [];
  var v;
  r[0] = (v = 0x800000 + z[0] + (y[8] -x[8] -z[8] + x[0] -0x80) * 38) & 0xffff;
  r[1] = (v = 0x7fff80 + (v >>> 16) + z[1] + (y[9] -x[9] -z[9] + x[1]) * 38) & 0xffff;
  r[2] = (v = 0x7fff80 + (v >>> 16) + z[2] + (y[10] -x[10] -z[10] + x[2]) * 38) & 0xffff;
  r[3] = (v = 0x7fff80 + (v >>> 16) + z[3] + (y[11] -x[11] -z[11] + x[3]) * 38) & 0xffff;
  r[4] = (v = 0x7fff80 + (v >>> 16) + z[4] + (y[12] -x[12] -z[12] + x[4]) * 38) & 0xffff;
  r[5] = (v = 0x7fff80 + (v >>> 16) + z[5] + (y[13] -x[13] -z[13] + x[5]) * 38) & 0xffff;
  r[6] = (v = 0x7fff80 + (v >>> 16) + z[6] + (y[14] -x[14] -z[14] + x[6]) * 38) & 0xffff;
  r[7] = (v = 0x7fff80 + (v >>> 16) + z[7] + (y[15] -x[15] -z[15] + x[7]) * 38) & 0xffff;
  r[8] = (v = 0x7fff80 + (v >>> 16) + z[8] + y[0] -x[0] -z[0] + x[8] * 38) & 0xffff;
  r[9] = (v = 0x7fff80 + (v >>> 16) + z[9] + y[1] -x[1] -z[1] + x[9] * 38) & 0xffff;
  r[10] = (v = 0x7fff80 + (v >>> 16) + z[10] + y[2] -x[2] -z[2] + x[10] * 38) & 0xffff;
  r[11] = (v = 0x7fff80 + (v >>> 16) + z[11] + y[3] -x[3] -z[3] + x[11] * 38) & 0xffff;
  r[12] = (v = 0x7fff80 + (v >>> 16) + z[12] + y[4] -x[4] -z[4] + x[12] * 38) & 0xffff;
  r[13] = (v = 0x7fff80 + (v >>> 16) + z[13] + y[5] -x[5] -z[5] + x[13] * 38) & 0xffff;
  r[14] = (v = 0x7fff80 + (v >>> 16) + z[14] + y[6] -x[6] -z[6] + x[14] * 38) & 0xffff;
  r[15] = 0x7fff80 + (v >>> 16) + z[15] + y[7] -x[7] -z[7] + x[15] * 38;
  c255lreduce(r);
  return r;
}

function c255lreduce(a) {
  var v = a[15];
  a[15] = v & 0x7fff;
  v = (0|(v / 0x8000)) * 19; // >32-bits of precision are required here so '/ 0x8000' can not be replaced by the arithmetic equivalent '>>> 15'
  a[0] = (v += a[0]) & 0xffff;
  v = v >>> 16;
  a[1] = (v += a[1]) & 0xffff;
  v = v >>> 16;
  a[2] = (v += a[2]) & 0xffff;
  v = v >>> 16;
  a[3] = (v += a[3]) & 0xffff;
  v = v >>> 16;
  a[4] = (v += a[4]) & 0xffff;
  v = v >>> 16;
  a[5] = (v += a[5]) & 0xffff;
  v = v >>> 16;
  a[6] = (v += a[6]) & 0xffff;
  v = v >>> 16;
  a[7] = (v += a[7]) & 0xffff;
  v = v >>> 16;
  a[8] = (v += a[8]) & 0xffff;
  v = v >>> 16;
  a[9] = (v += a[9]) & 0xffff;
  v = v >>> 16;
  a[10] = (v += a[10]) & 0xffff;
  v = v >>> 16;
  a[11] = (v += a[11]) & 0xffff;
  v = v >>> 16;
  a[12] = (v += a[12]) & 0xffff;
  v = v >>> 16;
  a[13] = (v += a[13]) & 0xffff;
  v = v >>> 16;
  a[14] = (v += a[14]) & 0xffff;
  v = v >>> 16;
  a[15] += v;
}

function c255laddmodp(a, b) {
  var r = [];
  var v;
  r[0] = (v = ((0|(a[15] >>> 15)) + (0|(b[15] >>> 15))) * 19 + a[0] + b[0]) & 0xffff;
  r[1] = (v = (v >>> 16) + a[1] + b[1]) & 0xffff;
  r[2] = (v = (v >>> 16) + a[2] + b[2]) & 0xffff;
  r[3] = (v = (v >>> 16) + a[3] + b[3]) & 0xffff;
  r[4] = (v = (v >>> 16) + a[4] + b[4]) & 0xffff;
  r[5] = (v = (v >>> 16) + a[5] + b[5]) & 0xffff;
  r[6] = (v = (v >>> 16) + a[6] + b[6]) & 0xffff;
  r[7] = (v = (v >>> 16) + a[7] + b[7]) & 0xffff;
  r[8] = (v = (v >>> 16) + a[8] + b[8]) & 0xffff;
  r[9] = (v = (v >>> 16) + a[9] + b[9]) & 0xffff;
  r[10] = (v = (v >>> 16) + a[10] + b[10]) & 0xffff;
  r[11] = (v = (v >>> 16) + a[11] + b[11]) & 0xffff;
  r[12] = (v = (v >>> 16) + a[12] + b[12]) & 0xffff;
  r[13] = (v = (v >>> 16) + a[13] + b[13]) & 0xffff;
  r[14] = (v = (v >>> 16) + a[14] + b[14]) & 0xffff;
  r[15] = (v >>> 16) + (a[15] & 0x7fff) + (b[15] & 0x7fff);
  return r;
}

function c255lsubmodp(a, b) {
  var r = [];
  var v;
  r[0] = (v = 0x80000 + ((0|(a[15] >>> 15)) - (0|(b[15] >>> 15)) - 1) * 19 + a[0] - b[0]) & 0xffff;
  r[1] = (v = (v >>> 16) + 0x7fff8 + a[1] - b[1]) & 0xffff;
  r[2] = (v = (v >>> 16) + 0x7fff8 + a[2] - b[2]) & 0xffff;
  r[3] = (v = (v >>> 16) + 0x7fff8 + a[3] - b[3]) & 0xffff;
  r[4] = (v = (v >>> 16) + 0x7fff8 + a[4] - b[4]) & 0xffff;
  r[5] = (v = (v >>> 16) + 0x7fff8 + a[5] - b[5]) & 0xffff;
  r[6] = (v = (v >>> 16) + 0x7fff8 + a[6] - b[6]) & 0xffff;
  r[7] = (v = (v >>> 16) + 0x7fff8 + a[7] - b[7]) & 0xffff;
  r[8] = (v = (v >>> 16) + 0x7fff8 + a[8] - b[8]) & 0xffff;
  r[9] = (v = (v >>> 16) + 0x7fff8 + a[9] - b[9]) & 0xffff;
  r[10] = (v = (v >>> 16) + 0x7fff8 + a[10] - b[10]) & 0xffff;
  r[11] = (v = (v >>> 16) + 0x7fff8 + a[11] - b[11]) & 0xffff;
  r[12] = (v = (v >>> 16) + 0x7fff8 + a[12] - b[12]) & 0xffff;
  r[13] = (v = (v >>> 16) + 0x7fff8 + a[13] - b[13]) & 0xffff;
  r[14] = (v = (v >>> 16) + 0x7fff8 + a[14] - b[14]) & 0xffff;
  r[15] = (v >>> 16) + 0x7ff8 + (a[15] & 0x7fff) - (b[15] & 0x7fff);
  return r;
}

function
c255linvmodp(a) {
  var c = a;
  var i = 250;
  while (--i) {
    a = c255lsqrmodp(a);
    //if (i > 240) { tracev("invmodp a", a); }
    a = c255lmulmodp(a, c);
    //if (i > 240) { tracev("invmodp a 2", a); }
  }
  a = c255lsqrmodp(a);
  a = c255lsqrmodp(a); a = c255lmulmodp(a, c);
  a = c255lsqrmodp(a);
  a = c255lsqrmodp(a); a = c255lmulmodp(a, c);
  a = c255lsqrmodp(a); a = c255lmulmodp(a, c);
  return a;
}

function c255lmulasmall(a) {
  // 'division by 0x10000' can not be replaced by '>> 16' because more than 32 bits of precision are needed
  var m = 121665;
  var r = [];
  var v;
  r[0] = (v = a[0] * m) & 0xffff;
  r[1] = (v = (0|(v / 0x10000)) + a[1]*m) & 0xffff;
  r[2] = (v = (0|(v / 0x10000)) + a[2]*m) & 0xffff;
  r[3] = (v = (0|(v / 0x10000)) + a[3]*m) & 0xffff;
  r[4] = (v = (0|(v / 0x10000)) + a[4]*m) & 0xffff;
  r[5] = (v = (0|(v / 0x10000)) + a[5]*m) & 0xffff;
  r[6] = (v = (0|(v / 0x10000)) + a[6]*m) & 0xffff;
  r[7] = (v = (0|(v / 0x10000)) + a[7]*m) & 0xffff;
  r[8] = (v = (0|(v / 0x10000)) + a[8]*m) & 0xffff;
  r[9] = (v = (0|(v / 0x10000)) + a[9]*m) & 0xffff;
  r[10] = (v = (0|(v / 0x10000)) + a[10]*m) & 0xffff;
  r[11] = (v = (0|(v / 0x10000)) + a[11]*m) & 0xffff;
  r[12] = (v = (0|(v / 0x10000)) + a[12]*m) & 0xffff;
  r[13] = (v = (0|(v / 0x10000)) + a[13]*m) & 0xffff;
  r[14] = (v = (0|(v / 0x10000)) + a[14]*m) & 0xffff;
  r[15] = (0|(v / 0x10000)) + a[15]*m;
  c255lreduce(r);
  return r;
}

function c255ldbl(x, z) {
  var x_2, z_2, m, n, o;
  ///tracev("dbl x", x);
  ///tracev("dbl z", z);
  m = c255lsqrmodp(c255laddmodp(x, z));
  //tracev("dbl m", c255laddmodp(x, z));
  n = c255lsqrmodp(c255lsubmodp(x, z));
  ///tracev("dbl n", n);
  o = c255lsubmodp(m, n);
  ///tracev("dbl o", o);
  x_2 = c255lmulmodp(n, m);
  //tracev("dbl x_2", x_2);
  z_2 = c255lmulmodp(c255laddmodp(c255lmulasmall(o), m), o);
  //tracev("dbl z_2", z_2);
  return [x_2, z_2];
}

function c255lsum(x, z, x_p, z_p, x_1) {
  var x_3, z_3, k, l, p, q;
  //tracev("sum x", x);
  //tracev("sum z", z);
  p = c255lmulmodp(c255lsubmodp(x, z), c255laddmodp(x_p, z_p));
  q = c255lmulmodp(c255laddmodp(x, z), c255lsubmodp(x_p, z_p));
  //tracev("sum p", p);
  //tracev("sum q", q);
  x_3 = c255lsqrmodp(c255laddmodp(p, q));
  z_3 = c255lmulmodp(c255lsqrmodp(c255lsubmodp(p, q)), x_1);
  return [x_3, z_3];
}


function curve25519_raw(f, c) {
  var a, x_1, q;

  x_1 = c;
  //tracev("c", c);
  //tracev("x_1", x_1);
  a = c255ldbl(x_1, c255lone());
  //tracev("x_a", a[0]);
  //tracev("z_a", a[1]);
  q = [ x_1, c255lone() ];

  var n = 255;

  while (c255lgetbit(f, n) == 0) {
    n--;
    // For correct constant-time operation, bit 255 should always be set to 1 so the following 'while' loop is never entered
    if (n < 0) {
      return c255lzero();
    }
  }
  n--;

  var aq = [ a, q ];
    
  while (n >= 0) {
    var r, s;
    var b = c255lgetbit(f, n);
    r = c255lsum(aq[0][0], aq[0][1], aq[1][0], aq[1][1], x_1);
    s = c255ldbl(aq[1-b][0], aq[1-b][1]);
    aq[1-b]  = s;
    aq[b]    = r;
    n--;
  }
  q = aq[1];

  //tracev("x", q[0]);
  //tracev("z", q[1]);
  q[1] = c255linvmodp(q[1]);
  //tracev("1/z", q[1]);
  q[0] = c255lmulmodp(q[0], q[1]);
  c255lreduce(q[0]);
  return q[0];
}

function curve25519b32(a, b) {
  return c255lbase32encode(curve25519(c255lbase32decode(a), c255lbase32decode(b)));
}

function curve25519(f, c) {
    if (!c) { c = c255lbase(); }
    f[0]   &= 0xFFF8;
    f[15]   = (f[15] & 0x7FFF) | 0x4000;
    return curve25519_raw(f, c);
}
