/**
 * bitcoin-math
 * https://github.com/dangersalad/bitcoin-math
 * 
 * Copyright (c) 2013, Danger Salad LLC
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 * 
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 * 
 * * Redistributions in binary form must reproduce the above copyright notice, this
 *   list of conditions and the following disclaimer in the documentation and/or
 *   other materials provided with the distribution.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

function toSatoshi(num) {
    if (isNaN(num)) return NaN;
    if (num === 0) return 0;
    var str = num.toString();
    var sign = (str.indexOf('-') === 0) ? "-" : "";
    str = str.replace(/^-/, '');
    if (str.indexOf('e') >=0) {
        return parseInt(sign + str.replace(".", "").replace(/e-8/, "").replace(/e-7/, "0"), 10);
    } else {
        if (!(/\./).test(str)) str += ".0";
        var parts = str.split(".");
        str = parts[0] + "." + parts[1].slice(0,8);
        while (!(/\.[0-9]{8}/).test(str)) {
            str += "0";
        }
        return parseInt(sign + str.replace(".", "").replace(/^0+/, ""), 10);
    }
};

function toBitcoinString(num) {
    if (isNaN(num)) return NaN;
    if (num === 0) return 0;
    var str = parseInt(num, 10).toString();
    var sign = (str.indexOf('-') === 0) ? "-" : "";
    str = str.replace(/^-/, '');
    var lengthTester = (/[0-9]{8}/);
    while (!lengthTester.test(str)) {
        str = "0" + str;
    }
    str = str.slice(0, str.length - 8) + "." + str.slice(str.length - 8);
    if (str[0] === '.') str = '0' + str;
    return sign + str;
};

function toBitcoin(num) {
    return parseFloat(toBitcoinString(num));
};

function zeroFill(num, places) {
    if (isNaN(num)) return NaN;
    if (!places) {
        places = 8;
    }
    var str = num.toString();
    var parts = str.split(".");
    if (parts.length === 1) {
        parts.push("0");
    }
    var needed = places - parts[1].length;
    for (var i = 0; i < needed; i++) {
        parts[1] += '0';
    }
    return parts[0] + "." + parts[1];
};