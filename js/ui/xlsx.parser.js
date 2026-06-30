/* ***************** BEGIN MEGA LIMITED CODE REVIEW LICENCE *****************
 *
 * Copyright (c) 2026 by Mega Limited, Auckland, New Zealand
 * All rights reserved.
 *
 * This licence grants you the rights, and only the rights, set out below,
 * to access and review Mega's code. If you take advantage of these rights,
 * you accept this licence. If you do not accept the licence,
 * do not access the code.
 *
 * Words used in the Mega Limited Terms of Service [https://mega.nz/terms]
 * have the same meaning in this licence. Where there is any inconsistency
 * between this licence and those Terms of Service, these terms prevail.
 *
 * 1. This licence does not grant you any rights to use Mega's name, logo,
 *    or trademarks and you must not in any way indicate you are authorised
 *    to speak on behalf of Mega.
 *
 * 2. If you issue proceedings in any jurisdiction against Mega because you
 *    consider Mega has infringed copyright or any patent right in respect
 *    of the code (including any joinder or counterclaim), your licence to
 *    the code is automatically terminated.
 *
 * 3. THE CODE IS MADE AVAILABLE "AS-IS" AND WITHOUT ANY EXPRESS OF IMPLIED
 *    GUARANTEES AS TO FITNESS, MERCHANTABILITY, NON-INFRINGEMENT OR OTHERWISE.
 *    IT IS NOT BEING PROVIDED IN TRADE BUT ON A VOLUNTARY BASIS ON OUR PART
 *    AND YOURS AND IS NOT MADE AVAILABLE FOR CONSUMER USE OR ANY OTHER USE
 *    OUTSIDE THE TERMS OF THIS LICENCE. ANYONE ACCESSING THE CODE SHOULD HAVE
 *    THE REQUISITE EXPERTISE TO SECURE THEIR OWN SYSTEM AND DEVICES AND TO
 *    ACCESS AND USE THE CODE FOR REVIEW PURPOSES. YOU BEAR THE RISK OF
 *    ACCESSING AND USING IT. IN PARTICULAR, MEGA BEARS NO LIABILITY FOR ANY
 *    INTERFERENCE WITH OR ADVERSE EFFECT ON YOUR SYSTEM OR DEVICES AS A
 *    RESULT OF YOUR ACCESSING AND USING THE CODE.
 *
 * Read the full and most up-to-date version at:
 *    https://github.com/meganz/webclient/blob/master/LICENCE.md
 *
 * ***************** END MEGA LIMITED CODE REVIEW LICENCE ***************** */

/**
 * OOXML SpreadsheetML (xlsx / xlsm) and CSV parser + DOM renderer for the
 * in-app spreadsheet viewer. Runs inside the sandboxed xlsx-viewer iframe and
 * exposes window.XlsxParser. MEGA LIMITED - Internal development.
 */

/* eslint-disable local-rules/hints */ // Trycatch cannot be used since this file run on sandbox
(function(scope) {
    'use strict';

    var SIG_LOCAL = 0x04034b50;
    var SIG_CENTRAL = 0x02014b50;
    var SIG_EOCD = 0x06054b50;
    var MAX_CELLS_PER_SHEET = 50000;
    var REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    var SVG_NS = 'http://www.w3.org/2000/svg';
    var NON_SCALING_STROKE = 'non-scaling-stroke';
    var STROKE_WIDTH_ATTR = 'stroke-width';
    var EMU_PER_PX = 9525;
    var HEADER_W = 44;
    var HEADER_H = 22;

    var H_ALIGN_ALLOW = new Set(['left', 'right', 'center', 'justify',
                                 'fill', 'distributed', 'centerContinuous']);
    var V_ALIGN_ALLOW = new Set(['top', 'center', 'bottom', 'justify', 'distributed']);
    var BORDER_SIDES = ['top', 'right', 'bottom', 'left'];
    var BORDER_WIDTH_MAP = {
        thin: '1px solid', medium: '2px solid', thick: '3px solid',
        hair: '1px solid', dashed: '1px dashed', dotted: '1px dotted',
        double: '3px double', mediumDashed: '2px dashed',
        dashDot: '1px dashed', mediumDashDot: '2px dashed',
        dashDotDot: '1px dashed', mediumDashDotDot: '2px dashed',
        slantDashDot: '1px dashed'
    };

    function byteToHex(v) {
        return Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0').toUpperCase();
    }

    function normalizeHexColor(c) {
        if (!c) {
            return null;
        }
        var s = String(c).trim().toLowerCase();
        if (s.startsWith('#')) {
            return s.length === 4
                ? `#${  s[1]  }${s[1]  }${s[2]  }${s[2]  }${s[3]  }${s[3]}`
                : s;
        }
        if (/^[\da-f]{6}$/i.test(s)) {
            return `#${  s}`;
        }
        if (/^[\da-f]{8}$/i.test(s)) {
            return `#${  s.slice(2)}`;
        }
        return null;
    }

    function getAll(parent, localName) {
        return parent.getElementsByTagNameNS('*', localName);
    }
    function getOne(parent, localName) {
        var list = parent.getElementsByTagNameNS('*', localName);
        return list.length ? list[0] : null;
    }
    function getOneDirect(parent, localName) {
        for (var i = 0; i < parent.childNodes.length; i++) {
            var ch = parent.childNodes[i];
            if (ch.nodeType === 1 && ch.localName === localName) {
                return ch;
            }
        }
        return null;
    }
    var BUILTIN_DATE_FMTS = new Set([
        14, 15, 16, 17, 18, 19, 20, 21, 22,
        27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
        45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58
    ]);

    var BUILTIN_NUM_FMTS = {
        0: 'General', 1: '0', 2: '0.00', 3: '#,##0', 4: '#,##0.00',
        9: '0%', 10: '0.00%', 11: '0.00E+00', 12: '# ?/?', 13: '# ??/??',
        14: 'm/d/yyyy', 15: 'd-mmm-yy', 16: 'd-mmm', 17: 'mmm-yy',
        18: 'h:mm AM/PM', 19: 'h:mm:ss AM/PM', 20: 'h:mm', 21: 'h:mm:ss',
        22: 'm/d/yyyy h:mm', 37: '#,##0 ;(#,##0)', 38: '#,##0 ;[Red](#,##0)',
        39: '#,##0.00;(#,##0.00)', 40: '#,##0.00;[Red](#,##0.00)',
        45: 'mm:ss', 46: '[h]:mm:ss', 47: 'mmss.0', 48: '##0.0E+0',
        49: '@'
    };

    var INDEXED_COLORS = [
        '000000', 'FFFFFF', 'FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', '00FFFF',
        '000000', 'FFFFFF', 'FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', '00FFFF',
        '800000', '008000', '000080', '808000', '800080', '008080', 'C0C0C0', '808080',
        '9999FF', '993366', 'FFFFCC', 'CCFFFF', '660066', 'FF8080', '0066CC', 'CCCCFF',
        '000080', 'FF00FF', 'FFFF00', '00FFFF', '800080', '800000', '008080', '0000FF',
        '00CCFF', 'CCFFFF', 'CCFFCC', 'FFFF99', '99CCFF', 'FF99CC', 'CC99FF', 'FFCC99',
        '3366FF', '33CCCC', '99CC00', 'FFCC00', 'FF9900', 'FF6600', '666699', '969696',
        '003366', '339966', '003300', '333300', '993300', '993366', '333399', '333333',
        '000000', 'FFFFFF'
    ];

    var DEFAULT_THEME = [
        '000000', 'FFFFFF', '44546A', 'E7E6E6',
        '5B9BD5', 'ED7D31', 'A5A5A5', 'FFC000',
        '4472C4', '70AD47', '0563C1', '954F72'
    ];

    function swapThemeIdx(idx) {
        if (idx === 0) {
            return 1;
        }
        if (idx === 1) {
            return 0;
        }
        if (idx === 2) {
            return 3;
        }
        if (idx === 3) {
            return 2;
        }
        return idx;
    }

    function hex2(n) {
        var v = Math.max(0, Math.min(255, Math.round(n)));
        var s = v.toString(16);
        return s.length === 1 ? `0${  s}` : s;
    }

    function applyTint(hex, tint) {
        if (!tint) {
            return hex;
        }
        var r = parseInt(hex.slice(0, 2), 16);
        var g = parseInt(hex.slice(2, 4), 16);
        var b = parseInt(hex.slice(4, 6), 16);
        var t = Math.max(-1, Math.min(1, tint));
        var f = t < 0 ? 1 + t : 1 - t;
        if (t < 0) {
            r *= f;
            g *= f;
            b *= f;
        }
        else {
            r += (255 - r) * t;
            g += (255 - g) * t;
            b += (255 - b) * t;
        }
        return hex2(r) + hex2(g) + hex2(b);
    }

    function safeHex(input) {
        if (typeof input !== 'string') {
            return '';
        }
        var raw = input.replace(/^#/, '').toUpperCase();
        if (raw.length === 8) {
            raw = raw.slice(2);
        }
        if (raw.length === 3) {
            raw = raw[0] + raw[0] + raw[1] + raw[1] + raw[2] + raw[2];
        }
        if (/^[\dA-F]{6}$/.test(raw)) {
            return raw;
        }
        return '';
    }

    function resolveColor(el, themeColors) {
        if (!el || el.getAttribute('auto') === '1') {
            return '';
        }
        var tint = parseFloat(el.getAttribute('tint') || '0') || 0;
        var tinted = function(raw) {
            var h = safeHex(raw);
            if (!h) {
                return '';
            }
            return `#${safeHex(applyTint(h, tint)) || h}`;
        };
        var rgb = el.getAttribute('rgb');
        if (rgb) {
            return tinted(rgb);
        }
        var themeAttr = el.getAttribute('theme');
        if (themeAttr !== null && themeAttr !== '') {
            var ti = swapThemeIdx(parseInt(themeAttr, 10) || 0);
            return tinted(themeColors[ti] || DEFAULT_THEME[ti] || '000000');
        }
        var idx = el.getAttribute('indexed');
        if (idx !== null && idx !== '') {
            var pal = INDEXED_COLORS[parseInt(idx, 10)];
            if (pal) {
                return tinted(pal);
            }
        }
        return '';
    }

    async function readZipEntries(buffer) {
        var view = new DataView(buffer);
        var len = view.byteLength;

        if (len < 22) {
            throw new Error('File too small to be a valid xlsx');
        }

        var eocdPos = -1;
        var searchStart = Math.max(0, len - 65557);
        for (var i = len - 22; i >= searchStart; i--) {
            if (view.getUint32(i, true) === SIG_EOCD) {
                eocdPos = i;
                break;
            }
        }
        if (eocdPos < 0) {
            throw new Error('Not a valid ZIP/xlsx file');
        }

        var totalEntries = view.getUint16(eocdPos + 10, true);
        var cdSize = view.getUint32(eocdPos + 12, true);
        var cdOffset = view.getUint32(eocdPos + 16, true);
        if (cdOffset === 0xffffffff || cdSize === 0xffffffff || totalEntries === 0xffff) {
            throw new Error('ZIP64 archives are not supported');
        }

        var entries = new Map();
        var decoder = new TextDecoder('utf-8');

        var pos = cdOffset;
        for (var n = 0; n < totalEntries; n++) {
            if (view.getUint32(pos, true) !== SIG_CENTRAL) {
                throw new Error(`Corrupt central directory at entry ${  n}`);
            }
            var compMethod = view.getUint16(pos + 10, true);
            var compSize = view.getUint32(pos + 20, true);
            var uncompSize = view.getUint32(pos + 24, true);
            var fnLen = view.getUint16(pos + 28, true);
            var extraLen = view.getUint16(pos + 30, true);
            var commentLen = view.getUint16(pos + 32, true);
            var localOffset = view.getUint32(pos + 42, true);

            if (localOffset === 0xffffffff || compSize === 0xffffffff || uncompSize === 0xffffffff) {
                throw new Error('ZIP64 archives are not supported');
            }

            var fnBytes = new Uint8Array(buffer, pos + 46, fnLen);
            var filename = decoder.decode(fnBytes);
            entries.set(filename, {
                localOffset,
                compMethod,
                compSize,
                uncompSize
            });
            pos += 46 + fnLen + extraLen + commentLen;
        }

        var MAX_UNCOMPRESSED_PER_ENTRY = 200 * 1024 * 1024;
        var MAX_TOTAL_INFLATED = 400 * 1024 * 1024;
        var totalInflated = 0;

        function extract(filename, perCallCap) {
            var entry = entries.get(filename);
            if (!entry) {
                return Promise.resolve(null);
            }
            var perEntryCap = typeof perCallCap === 'number' && perCallCap > 0
                ? Math.min(MAX_UNCOMPRESSED_PER_ENTRY, perCallCap)
                : MAX_UNCOMPRESSED_PER_ENTRY;
            if (entry.uncompSize > perEntryCap) {
                return Promise.reject(new Error(`Entry too large: ${filename}`));
            }
            if (totalInflated + entry.uncompSize > MAX_TOTAL_INFLATED) {
                return Promise.reject(new Error(`Cumulative inflate budget exceeded at ${filename}`));
            }
            var lhPos = entry.localOffset;
            if (view.getUint32(lhPos, true) !== SIG_LOCAL) {
                return Promise.reject(new Error(`Invalid local header for ${  filename}`));
            }
            var lhFnLen = view.getUint16(lhPos + 26, true);
            var lhExtraLen = view.getUint16(lhPos + 28, true);
            var dataOffset = lhPos + 30 + lhFnLen + lhExtraLen;
            var data = new Uint8Array(buffer, dataOffset, entry.compSize);

            if (entry.compMethod === 0) {
                if (data.byteLength > perEntryCap
                    || totalInflated + data.byteLength > MAX_TOTAL_INFLATED) {
                    return Promise.reject(new Error(`Entry too large: ${filename}`));
                }
                totalInflated += data.byteLength;
                return Promise.resolve(data);
            }
            if (entry.compMethod === 8) {
                var ds = new DecompressionStream('deflate-raw');
                var stream = new Blob([data]).stream().pipeThrough(ds);
                var reader = stream.getReader();
                var chunks = [];
                var accum = 0;
                return (function read() {
                    return reader.read().then((res) => {
                        if (res.done) {
                            totalInflated += accum;
                            var out = new Uint8Array(accum);
                            var off = 0;
                            for (var i = 0; i < chunks.length; i++) {
                                out.set(chunks[i], off);
                                off += chunks[i].byteLength;
                            }
                            return out;
                        }
                        accum += res.value.byteLength;
                        if (accum > perEntryCap
                            || totalInflated + accum > MAX_TOTAL_INFLATED) {
                            return reader.cancel().then(() => {
                                throw new Error(`Inflate cap exceeded at ${filename}`);
                            });
                        }
                        chunks.push(res.value);
                        return read();
                    });
                })();
            }
            return Promise.reject(new Error(`Unsupported compression method: ${  entry.compMethod}`));
        }

        function entrySize(filename) {
            var e = entries.get(filename);
            return e ? e.uncompSize : -1;
        }

        return {
            names: [...entries.keys()],
            entrySize,
            extract
        };
    }

    const xmlHasError = (doc) => {
        return doc.querySelector('parsererror')
            || doc.documentElement.nodeName === 'Error';
    };

    const freeze = (obj) => {
        Object.setPrototypeOf(obj, null);
        return Object.freeze(obj);
    };

    async function readXml(zip, path, maxBytes) {
        var bytes = await zip.extract(path, maxBytes);
        if (!bytes) {
            throw new Error(`Missing entry: ${  path}`);
        }
        var text = new TextDecoder('utf-8').decode(bytes);
        var doc = new DOMParser().parseFromString(text, 'text/xml');
        if (xmlHasError(doc)) {
            throw new Error(`XML parse error in ${  path}`);
        }
        return doc;
    }

    function colRefToIndex(ref) {
        var col = 0;
        for (var i = 0; i < ref.length; i++) {
            var c = ref.charCodeAt(i);
            if (c < 65 || c > 90) {
                break;
            }
            col = col * 26 + (c - 64);
        }
        return col - 1;
    }

    function indexToColRef(idx) {
        var s = '';
        var n = idx;
        do {
            s = String.fromCharCode(65 + n % 26) + s;
            n = Math.floor(n / 26) - 1;
        } while (n >= 0);
        return s;
    }

    var MAX_SHARED_STRINGS = 1000000;
    var MAX_SHARED_STRING_CHARS = 64 * 1024 * 1024;
    var MAX_SHARED_STR_LEN = 64 * 1024;

    function readSharedStrings(doc) {
        var out = [];
        var items = getAll(doc, 'si');
        var totalChars = 0;
        var n = Math.min(items.length, MAX_SHARED_STRINGS);
        for (var i = 0; i < n; i++) {
            var si = items[i];
            var tNodes = getAll(si, 't');
            var s = '';
            for (var j = 0; j < tNodes.length; j++) {
                if (tNodes[j].parentNode.localName === 'rPh') {
                    continue;
                }
                s += tNodes[j].textContent;
                if (s.length > MAX_SHARED_STR_LEN) {
                    s = s.slice(0, MAX_SHARED_STR_LEN);
                    break;
                }
            }
            if (totalChars + s.length > MAX_SHARED_STRING_CHARS) {
                for (; i < n; i++) {
                    out.push('');
                }
                break;
            }
            totalChars += s.length;
            out.push(s);
        }
        return out;
    }

    function pad2(v) {
        return v < 10 ? `0${  v}` : `${  v}`;
    }

    var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    function excelSerialToDate(serial) {
        var s = serial;
        if (s < 60) {
            s += 1;
        }
        var ms = (s - 25569) * 86400 * 1000;
        var d = new Date(ms);
        return isNaN(d.getTime()) ? null : d;
    }

    function tokenizeDateFormat(section) {
        var tokens = [];
        var i = 0;
        while (i < section.length) {
            var ch = section[i];
            if (ch === '"') {
                var end = section.indexOf('"', i + 1);
                if (end < 0) {
                    end = section.length;
                }
                tokens.push({ lit: section.slice(i + 1, end) });
                i = end + 1;
                continue;
            }
            if (ch === '\\' && i + 1 < section.length) {
                tokens.push({ lit: section[i + 1] });
                i += 2;
                continue;
            }
            var upcoming = section.slice(i);
            if (/^am\/pm/i.test(upcoming)) {
                tokens.push({ tok: 'ampm', upper: section[i] === 'A' });
                i += 5;
                continue;
            }
            if (/^a\/p/i.test(upcoming)) {
                tokens.push({ tok: 'ap', upper: section[i] === 'A' });
                i += 3;
                continue;
            }
            if (/[Mdhmsy]/.test(ch)) {
                var lower = ch.toLowerCase();
                var j = i;
                while (j < section.length && section[j].toLowerCase() === lower) {
                    j++;
                }
                tokens.push({ tok: lower.repeat(j - i) });
                i = j;
                continue;
            }
            tokens.push({ lit: ch });
            i++;
        }
        markMinuteTokens(tokens);
        return tokens;
    }

    function markMinuteTokens(tokens) {
        function neighborTok(idx, dir) {
            for (var p = idx + dir; p >= 0 && p < tokens.length; p += dir) {
                if (tokens[p].tok) {
                    return tokens[p].tok;
                }
            }
            return null;
        }
        for (var k = 0; k < tokens.length; k++) {
            var t = tokens[k];
            if (!t.tok || t.tok !== 'm' && t.tok !== 'mm') {
                continue;
            }
            var prev = neighborTok(k, -1);
            var next = neighborTok(k, +1);
            if (prev === 'h' || prev === 'hh' || next === 's' || next === 'ss') {
                t.minute = true;
            }
        }
    }

    function emitDateToken(tk, ctx) {
        if (tk.lit !== undefined) {
            return tk.lit;
        }
        var emitters = {
            yyyy: () => String(ctx.Y),
            yyy: () => String(ctx.Y).slice(-2),
            yy: () => String(ctx.Y).slice(-2),
            y: () => String(ctx.Y),
            mmmmm: () => MONTH_NAMES[ctx.Mi].slice(0, 1),
            mmmm: () => MONTH_NAMES[ctx.Mi],
            mmm: () => MONTH_NAMES[ctx.Mi].slice(0, 3),
            mm: () => tk.minute ? pad2(ctx.mi) : pad2(ctx.Mi + 1),
            m: () => tk.minute ? String(ctx.mi) : String(ctx.Mi + 1),
            dddd: () => DAY_NAMES[ctx.W],
            ddd: () => DAY_NAMES[ctx.W].slice(0, 3),
            dd: () => pad2(ctx.D),
            d: () => String(ctx.D),
            hh: () => pad2(ctx.hour),
            h: () => String(ctx.hour),
            ss: () => pad2(ctx.se),
            s: () => String(ctx.se),
            ampm: () => tk.upper ? ctx.h24 >= 12 ? 'PM' : 'AM' : ctx.h24 >= 12 ? 'pm' : 'am',
            ap: () => tk.upper ? ctx.h24 >= 12 ? 'P' : 'A' : ctx.h24 >= 12 ? 'p' : 'a'
        };
        var fn = emitters[tk.tok];
        return fn ? fn() : tk.tok;
    }

    function formatDate(serial, code) {
        var d = excelSerialToDate(serial);
        if (!d) {
            return String(serial);
        }
        var ctx = {
            Y: d.getUTCFullYear(),
            Mi: d.getUTCMonth(),
            D: d.getUTCDate(),
            W: d.getUTCDay(),
            h24: d.getUTCHours(),
            mi: d.getUTCMinutes(),
            se: d.getUTCSeconds()
        };
        if (!code || code === 'General') {
            var iso = `${ctx.Y}-${pad2(ctx.Mi + 1)}-${pad2(ctx.D)}`;
            if (serial % 1 === 0) {
                return iso;
            }
            return `${iso} ${pad2(ctx.h24)}:${pad2(ctx.mi)}:${pad2(ctx.se)}`;
        }
        var section = code.replace(/\[[^\]]*]/g, '').split(';')[0];
        var hasAmPm = /AM\/PM|am\/pm|A\/P|a\/p/.test(section);
        ctx.hour = hasAmPm ? ctx.h24 % 12 || 12 : ctx.h24;
        var tokens = tokenizeDateFormat(section);
        var out = '';
        for (var kk = 0; kk < tokens.length; kk++) {
            out += emitDateToken(tokens[kk], ctx);
        }
        return out;
    }

    function readThemeColors(themeDoc) {
        if (!themeDoc) {
            return [...DEFAULT_THEME];
        }
        var clrScheme = getOne(themeDoc, 'clrScheme');
        if (!clrScheme) {
            return [...DEFAULT_THEME];
        }
        var order = ['dk1', 'lt1', 'dk2', 'lt2', 'accent1', 'accent2',
                     'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'];
        var out = [];
        for (var i = 0; i < order.length; i++) {
            var el = getOne(clrScheme, order[i]);
            var hex = DEFAULT_THEME[i];
            if (el) {
                var srgb = getOne(el, 'srgbClr');
                var sys = getOne(el, 'sysClr');
                if (srgb) {
                    hex = safeHex(srgb.getAttribute('val')) || hex;
                }
                else if (sys) {
                    hex = safeHex(sys.getAttribute('lastClr')) || hex;
                }
            }
            out.push(safeHex(hex) || '000000');
        }
        out.lineStyles = readThemeLineStyles(themeDoc);
        return out;
    }

    function readThemeLineStyles(themeDoc) {
        var out = [];
        var fmtScheme = getOne(themeDoc, 'fmtScheme');
        if (!fmtScheme) {
            return out;
        }
        var lnStyleLst = getOneDirect(fmtScheme, 'lnStyleLst');
        if (!lnStyleLst) {
            return out;
        }
        var lns = getDirectChildren(lnStyleLst);
        for (var i = 0; i < lns.length; i++) {
            if (lns[i].localName !== 'ln') {
                continue;
            }
            var w = parseInt(lns[i].getAttribute('w') || '0', 10) || 0;
            var cap = lns[i].getAttribute('cap') || '';
            out.push({ w, cap });
        }
        return out;
    }

    function readFonts(stylesDoc, themeColors) {
        var out = [];
        var fontsEl = getOne(stylesDoc, 'fonts');
        if (!fontsEl) {
            return out;
        }
        var fontEls = getAll(fontsEl, 'font');
        for (var i = 0; i < fontEls.length; i++) {
            var f = fontEls[i];
            var nameEl = getOne(f, 'name');
            var szEl = getOne(f, 'sz');
            var sz = szEl ? parseFloat(szEl.getAttribute('val')) : 11;
            out.push({
                name: nameEl ? nameEl.getAttribute('val') || '' : '',
                size: sz || 11,
                bold: getAll(f, 'b').length > 0,
                italic: getAll(f, 'i').length > 0,
                underline: getAll(f, 'u').length > 0,
                strike: getAll(f, 'strike').length > 0,
                color: resolveColor(getOne(f, 'color'), themeColors)
            });
        }
        return out;
    }

    function readFills(stylesDoc, themeColors) {
        var out = [];
        var fillsEl = getOne(stylesDoc, 'fills');
        if (!fillsEl) {
            return out;
        }
        var fillEls = getAll(fillsEl, 'fill');
        for (var i = 0; i < fillEls.length; i++) {
            var pf = getOne(fillEls[i], 'patternFill');
            if (!pf) {
                out.push({ bgColor: '' });
                continue;
            }
            var patternType = pf.getAttribute('patternType') || 'none';
            if (patternType === 'none') {
                out.push({ bgColor: '' });
                continue;
            }
            var fg = getOne(pf, 'fgColor');
            var bg = getOne(pf, 'bgColor');
            var color = resolveColor(fg, themeColors) || resolveColor(bg, themeColors);
            out.push({ bgColor: color });
        }
        return out;
    }

    function readBorderSide(parent, name, themeColors) {
        var el = getOne(parent, name);
        if (!el) {
            return null;
        }
        var styleAttr = el.getAttribute('style');
        if (!styleAttr) {
            return null;
        }
        return {
            style: styleAttr,
            color: resolveColor(getOne(el, 'color'), themeColors) || '#000'
        };
    }

    function readBorders(stylesDoc, themeColors) {
        var out = [];
        var bordersEl = getOne(stylesDoc, 'borders');
        if (!bordersEl) {
            return out;
        }
        var bs = getAll(bordersEl, 'border');
        for (var i = 0; i < bs.length; i++) {
            out.push({
                top: readBorderSide(bs[i], 'top', themeColors),
                right: readBorderSide(bs[i], 'right', themeColors),
                bottom: readBorderSide(bs[i], 'bottom', themeColors),
                left: readBorderSide(bs[i], 'left', themeColors)
            });
        }
        return out;
    }

    var MAX_NUM_FMT_LEN = 256;
    function readNumFmts(stylesDoc) {
        var out = Object.create(null);
        var els = getAll(stylesDoc, 'numFmt');
        for (var i = 0; i < els.length; i++) {
            var id = parseInt(els[i].getAttribute('numFmtId'), 10);
            if (!isFinite(id) || id < 0) {
                continue;
            }
            var code = els[i].getAttribute('formatCode') || '';
            if (code.length > MAX_NUM_FMT_LEN) {
                code = code.slice(0, MAX_NUM_FMT_LEN);
            }
            out[id] = code;
        }
        return out;
    }

    function readXfAlignProps(align) {
        return {
            horizontal: align ? align.getAttribute('horizontal') || '' : '',
            vertical: align ? align.getAttribute('vertical') || '' : '',
            wrapText: !!(align && align.getAttribute('wrapText') === '1'),
            indent: align ? parseInt(align.getAttribute('indent') || '0', 10) || 0 : 0
        };
    }

    function readXfs(stylesDoc, customNumFmts) {
        var out = [];
        var cellXfs = getOne(stylesDoc, 'cellXfs');
        if (!cellXfs) {
            return out;
        }
        function parseOneXf(x) {
            var fmtId = parseInt(x.getAttribute('numFmtId'), 10) || 0;
            var fmtCode = customNumFmts[fmtId] || BUILTIN_NUM_FMTS[fmtId] || '';
            var isDate = BUILTIN_DATE_FMTS.has(fmtId)
                || /[dhmsy]/i.test(fmtCode) && !/[#$?]/.test(fmtCode);
            return Object.assign({
                fontId: parseInt(x.getAttribute('fontId'), 10) || 0,
                fillId: parseInt(x.getAttribute('fillId'), 10) || 0,
                borderId: parseInt(x.getAttribute('borderId'), 10) || 0,
                applyFont: x.getAttribute('applyFont') === '1',
                applyFill: x.getAttribute('applyFill') === '1',
                applyBorder: x.getAttribute('applyBorder') === '1',
                applyAlignment: x.getAttribute('applyAlignment') === '1',
                applyNumFmt: x.getAttribute('applyNumberFormat') === '1',
                numFmtId: fmtId,
                numFmtCode: fmtCode,
                isDate
            }, readXfAlignProps(getOne(x, 'alignment')));
        }
        var xfs = getAll(cellXfs, 'xf');
        for (var i = 0; i < xfs.length; i++) {
            out.push(parseOneXf(xfs[i]));
        }
        return out;
    }

    function buildStyleTable(xfs, fonts, fills, borders) {
        var out = [];
        for (var i = 0; i < xfs.length; i++) {
            var x = xfs[i];
            out.push({
                font: fonts[x.fontId] || null,
                fill: fills[x.fillId] || null,
                border: borders[x.borderId] || null,
                alignment: {
                    horizontal: x.horizontal,
                    vertical: x.vertical,
                    wrap: x.wrapText,
                    indent: x.indent || 0
                },
                numFmtCode: x.numFmtCode,
                isDate: x.isDate
            });
        }
        return out;
    }

    async function readStylesAndTheme(zip) {
        var themeColors = [...DEFAULT_THEME];
        var themePath = null;
        for (var i = 0; i < zip.names.length; i++) {
            if (zip.names[i].startsWith('xl/theme/') && zip.names[i].endsWith('.xml')) {
                themePath = zip.names[i];
                break;
            }
        }
        try {
            if (themePath) {
                var themeDoc = await readXml(zip, themePath);
                themeColors = readThemeColors(themeDoc);
            }
        }
        catch (ex) {
            themeColors = [...DEFAULT_THEME];
        }

        if (!zip.names.includes('xl/styles.xml')) {
            return { styleTable: [], themeColors };
        }
        try {
            var stylesDoc = await readXml(zip, 'xl/styles.xml');
            var fonts = readFonts(stylesDoc, themeColors);
            var fills = readFills(stylesDoc, themeColors);
            var borders = readBorders(stylesDoc, themeColors);
            var customNumFmts = readNumFmts(stylesDoc);
            var xfs = readXfs(stylesDoc, customNumFmts);
            var dxfs = readDxfs(stylesDoc, themeColors);
            var tableStyles = readTableStyles(stylesDoc);
            var defaultFontIdx = xfs[0] && xfs[0].fontId || 0;
            var defaultFont = fonts[defaultFontIdx] || fonts[0] || null;
            return {
                styleTable: buildStyleTable(xfs, fonts, fills, borders),
                themeColors,
                dxfs,
                tableStyles,
                defaultFont
            };
        }
        catch (ex) {
            return { styleTable: [], themeColors, dxfs: [], tableStyles: {}, defaultFont: null };
        }
    }

    function readTableStyles(stylesDoc) {
        var out = Object.create(null);
        var container = getOne(stylesDoc, 'tableStyles');
        if (!container) {
            return out;
        }
        var styles = getAll(container, 'tableStyle');
        for (var i = 0; i < styles.length; i++) {
            var name = styles[i].getAttribute('name') || '';
            if (!name) {
                continue;
            }
            var entry = Object.create(null);
            var elements = getAll(styles[i], 'tableStyleElement');
            for (var j = 0; j < elements.length; j++) {
                var type = elements[j].getAttribute('type') || '';
                var dxfId = parseInt(elements[j].getAttribute('dxfId') || '-1', 10);
                if (type && dxfId >= 0) {
                    entry[type] = dxfId;
                }
            }
            out[name] = entry;
        }
        return out;
    }

    function readOoxmlBool(el) {
        if (!el) {
            return undefined;
        }
        var v = el.getAttribute('val');
        if (v === null || v === undefined || v === '') {
            return true;
        }
        return v !== '0' && v !== 'false';
    }

    function isAutoIndexedColor(el) {
        if (!el) {
            return false;
        }
        var idx = el.getAttribute('indexed');
        return idx === '64' || idx === '65';
    }

    function readDxfFont(fontEl, themeColors) {
        if (!fontEl) {
            return null;
        }
        var out = {};
        var boolFlags = [['b', 'bold'], ['i', 'italic'], ['u', 'underline'], ['strike', 'strike']];
        for (var k = 0; k < boolFlags.length; k++) {
            var el = getOne(fontEl, boolFlags[k][0]);
            if (el) {
                out[boolFlags[k][1]] = readOoxmlBool(el);
            }
        }
        var colorEl = getOne(fontEl, 'color');
        if (colorEl) {
            var c = resolveColor(colorEl, themeColors);
            if (c) {
                out.color = c;
            }
        }
        var nameEl = getOne(fontEl, 'name');
        var n = nameEl ? nameEl.getAttribute('val') || '' : '';
        if (n) {
            out.name = n;
        }
        var szEl = getOne(fontEl, 'sz');
        var sz = szEl ? parseFloat(szEl.getAttribute('val')) : 0;
        if (sz) {
            out.size = sz;
        }
        return Object.keys(out).length ? out : null;
    }

    function readDxfFill(fillEl, themeColors) {
        if (!fillEl) {
            return null;
        }
        var pf = getOne(fillEl, 'patternFill');
        if (!pf) {
            return null;
        }
        var fg = getOne(pf, 'fgColor');
        var bg = getOne(pf, 'bgColor');
        if (isAutoIndexedColor(fg)) {
            fg = null;
        }
        if (isAutoIndexedColor(bg)) {
            bg = null;
        }
        var color = resolveColor(fg, themeColors) || resolveColor(bg, themeColors);
        return color ? { bgColor: color } : null;
    }

    function readDxfAlignment(alignEl) {
        if (!alignEl) {
            return null;
        }
        return {
            horizontal: alignEl.getAttribute('horizontal') || '',
            vertical: alignEl.getAttribute('vertical') || '',
            wrap: alignEl.getAttribute('wrapText') === '1'
        };
    }

    function readDxfs(stylesDoc, themeColors) {
        var out = [];
        var container = getOne(stylesDoc, 'dxfs');
        if (!container) {
            return out;
        }
        var els = getAll(container, 'dxf');
        for (var i = 0; i < els.length; i++) {
            var d = els[i];
            var dxf = {};
            var font = readDxfFont(getOne(d, 'font'), themeColors);
            if (font) {
                dxf.font = font;
            }
            var fill = readDxfFill(getOne(d, 'fill'), themeColors);
            if (fill) {
                dxf.fill = fill;
            }
            var align = readDxfAlignment(getOne(d, 'alignment'));
            if (align) {
                dxf.alignment = align;
            }
            var numFmtEl = getOne(d, 'numFmt');
            if (numFmtEl) {
                dxf.numFmtCode = (numFmtEl.getAttribute('formatCode') || '').slice(0, MAX_NUM_FMT_LEN);
            }
            out.push(dxf);
        }
        return out;
    }

    function extractStringValue(cell) {
        var tNodes = getAll(cell, 't');
        var s = '';
        for (var ti = 0; ti < tNodes.length; ti++) {
            s += tNodes[ti].textContent;
        }
        return s;
    }

    function parseCellValue(cell, type, sharedStrings) {
        if (type === 's') {
            var vEl = getOne(cell, 'v');
            var idx = vEl ? parseInt(vEl.textContent, 10) : -1;
            return idx >= 0 && sharedStrings[idx] !== undefined ? sharedStrings[idx] : '';
        }
        if (type === 'b') {
            var bv = getOne(cell, 'v');
            return !!(bv && bv.textContent === '1');
        }
        if (type === 'str' || type === 'e') {
            var sv = getOne(cell, 'v');
            return sv ? sv.textContent : '';
        }
        if (type === 'inlineStr') {
            var isEl = getOne(cell, 'is');
            return isEl ? extractStringValue(isEl) : '';
        }
        var nv = getOne(cell, 'v');
        if (!nv) {
            return '';
        }
        var raw = nv.textContent;
        var num = parseFloat(raw);
        if (isNaN(num)) {
            return raw;
        }
        return num;
    }

    function readSheet(doc, sharedStrings) {
        var rows = [];
        var cellStyles = [];
        var rowEls = getAll(doc, 'row');
        var cellCount = 0;
        var truncated = false;
        var XL_MAX_ROWS = 1048576;
        var XL_MAX_COLS = 16384;

        for (var r = 0; r < rowEls.length; r++) {
            var rowEl = rowEls[r];
            if (rows.length >= MAX_CELLS_PER_SHEET) {
                truncated = true;
                break;
            }
            var rIdxRaw = parseInt(rowEl.getAttribute('r'), 10) - 1;
            var rIdx = isNaN(rIdxRaw) ? rows.length
                : Math.min(rIdxRaw, XL_MAX_ROWS - 1);
            if (rIdx - rows.length > MAX_CELLS_PER_SHEET) {
                truncated = true;
                break;
            }
            while (rows.length < rIdx) {
                rows.push([]);
                cellStyles.push([]);
            }
            var rowDefaultStyleAttr = rowEl.getAttribute('s');
            var rowDefaultStyle = rowDefaultStyleAttr ? parseInt(rowDefaultStyleAttr, 10) || 0 : 0;
            var rowCustomFormat = rowEl.getAttribute('customFormat') === '1';
            var fillStyle = rowCustomFormat ? rowDefaultStyle : 0;
            var row = [];
            var styles = [];
            var cells = getAll(rowEl, 'c');
            for (var c = 0; c < cells.length; c++) {
                var cell = cells[c];
                var ref = cell.getAttribute('r');
                var colIdxRaw = ref ? colRefToIndex(ref) : row.length;
                var colIdx = Math.min(colIdxRaw, XL_MAX_COLS - 1);
                if (colIdx - row.length > MAX_CELLS_PER_SHEET - cellCount) {
                    truncated = true;
                    break;
                }
                while (row.length < colIdx) {
                    row.push('');
                    styles.push(fillStyle);
                }
                var type = cell.getAttribute('t') || 'n';
                var styleIdxAttr = cell.getAttribute('s');
                var styleIdx = styleIdxAttr ? parseInt(styleIdxAttr, 10) : rowDefaultStyle;
                row.push(parseCellValue(cell, type, sharedStrings));
                styles.push(styleIdx || 0);
                cellCount++;
                if (cellCount >= MAX_CELLS_PER_SHEET) {
                    truncated = true;
                    break;
                }
            }
            rows.push(row);
            cellStyles.push(styles);
            if (truncated) {
                break;
            }
        }
        return { rows, cellStyles, truncated };
    }

    var MAX_MERGE_CELLS_TOTAL = 200000;
    function readMerges(doc, remainingBudget) {
        var out = [];
        var mc = getAll(doc, 'mergeCell');
        var sheetCap = typeof remainingBudget === 'number'
            ? Math.min(MAX_MERGE_CELLS_TOTAL, Math.max(0, remainingBudget))
            : MAX_MERGE_CELLS_TOTAL;
        var totalCells = 0;
        for (var i = 0; i < mc.length; i++) {
            var ref = mc[i].getAttribute('ref') || '';
            var parts = ref.split(':');
            if (parts.length !== 2) {
                continue;
            }
            var a = parseRef(parts[0]);
            var b = parseRef(parts[1]);
            if (!a || !b) {
                continue;
            }
            var r1 = Math.min(a.row, b.row);
            var c1 = Math.min(a.col, b.col);
            var r2 = Math.max(a.row, b.row);
            var c2 = Math.max(a.col, b.col);
            var cells = (r2 - r1 + 1) * (c2 - c1 + 1);
            if (cells > MAX_CELLS_PER_SHEET) {
                continue;
            }
            if (totalCells + cells > sheetCap) {
                break;
            }
            totalCells += cells;
            out.push({ r1, c1, r2, c2 });
        }
        out._consumed = totalCells;
        return out;
    }

    function parseRef(ref) {
        var m = /^([A-Z]+)(\d+)$/.exec(ref);
        if (!m) {
            return null;
        }
        return { col: colRefToIndex(m[1]), row: parseInt(m[2], 10) - 1 };
    }

    function readColWidths(doc) {
        var out = [];
        var cols = getAll(doc, 'col');
        for (var i = 0; i < cols.length; i++) {
            var min = parseInt(cols[i].getAttribute('min'), 10);
            var max = parseInt(cols[i].getAttribute('max'), 10);
            var w = parseFloat(cols[i].getAttribute('width'));
            if (isNaN(w) || isNaN(min) || isNaN(max)) {
                continue;
            }
            min = Math.max(1, Math.min(16384, min));
            max = Math.max(1, Math.min(16384, max));
            if (max < min) {
                continue;
            }
            var endK = Math.min(max, 1024);
            for (var k = min - 1; k < endK; k++) {
                out[k] = w;
            }
        }
        return out;
    }

    function readRowHeights(doc) {
        var out = [];
        var rows = getAll(doc, 'row');
        for (var i = 0; i < rows.length; i++) {
            var r = parseInt(rows[i].getAttribute('r'), 10);
            var ht = parseFloat(rows[i].getAttribute('ht'));
            if (!isNaN(ht) && r) {
                out[r - 1] = ht;
            }
        }
        return out;
    }

    async function readSheetHyperlinkRels(zip, sheetPath) {
        var out = Object.create(null);
        var dir = sheetPath.replace(/[^/]+$/, '');
        var relsPath = `${dir}_rels/${sheetPath.split('/').pop()}.rels`;
        if (!zip.names.includes(relsPath)) {
            return out;
        }
        try {
            var doc = await readXml(zip, relsPath);
            var rs = doc.getElementsByTagName('Relationship');
            for (var i = 0; i < rs.length; i++) {
                var type = rs[i].getAttribute('Type') || '';
                if (type.endsWith('/hyperlink')) {
                    var rid = rs[i].getAttribute('Id');
                    if (rid) {
                        out[rid] = rs[i].getAttribute('Target') || '';
                    }
                }
            }
        }
        catch (ex) {
            return out;
        }
        return out;
    }

    var MAX_HYPERLINK_CELLS_TOTAL = 200000;
    function readHyperlinks(doc, ridToTarget, remainingBudget) {
        var out = new Map();
        var hls = getAll(doc, 'hyperlink');
        var sheetCap = typeof remainingBudget === 'number'
            ? Math.min(MAX_HYPERLINK_CELLS_TOTAL, Math.max(0, remainingBudget))
            : MAX_HYPERLINK_CELLS_TOTAL;
        var totalCells = 0;
        for (var i = 0; i < hls.length; i++) {
            var ref = hls[i].getAttribute('ref');
            if (!ref) {
                continue;
            }
            var url = '';
            var rid = hls[i].getAttribute('r:id')
                || hls[i].getAttributeNS(REL_NS, 'id');
            if (rid && ridToTarget && ridToTarget[rid]) {
                url = ridToTarget[rid];
            }
            if (!url) {
                var loc = hls[i].getAttribute('location') || '';
                if (loc) {
                    url = `#${  loc}`;
                }
            }
            if (!url) {
                url = hls[i].getAttribute('display') || '';
            }
            var range = parseSqref(ref);
            for (var r = 0; r < range.length; r++) {
                var rng = range[r];
                var cells = (rng.r2 - rng.r1 + 1) * (rng.c2 - rng.c1 + 1);
                if (cells > MAX_CELLS_PER_SHEET) {
                    continue;
                }
                if (totalCells + cells > sheetCap) {
                    out._consumed = totalCells;
                    return out;
                }
                totalCells += cells;
                for (var rr = rng.r1; rr <= rng.r2; rr++) {
                    for (var cc = rng.c1; cc <= rng.c2; cc++) {
                        out.set(`${rr},${cc}`, url);
                    }
                }
            }
        }
        out._consumed = totalCells;
        return out;
    }

    function readSheetFormat(doc) {
        var sfp = getOne(doc, 'sheetFormatPr');
        if (!sfp) {
            return { defaultColWidth: null, defaultRowHeight: null, baseColWidth: null };
        }
        var dcw = parseFloat(sfp.getAttribute('defaultColWidth'));
        var drh = parseFloat(sfp.getAttribute('defaultRowHeight'));
        var bcw = parseFloat(sfp.getAttribute('baseColWidth'));
        return {
            defaultColWidth: isNaN(dcw) ? null : dcw,
            defaultRowHeight: isNaN(drh) ? null : drh,
            baseColWidth: isNaN(bcw) ? null : bcw
        };
    }

    function readSheetShowGridLines(doc) {
        var sv = getOne(doc, 'sheetView');
        if (!sv) {
            return true;
        }
        var attr = sv.getAttribute('showGridLines');
        if (attr === null || attr === '') {
            return true;
        }
        return attr !== '0' && attr !== 'false';
    }

    async function loadSharedStrings(zip) {
        if (!zip.names.includes('xl/sharedStrings.xml')) {
            return [];
        }
        var SHARED_STRINGS_BYTE_CAP = 32 * 1024 * 1024;
        try {
            var ssDoc = await readXml(zip, 'xl/sharedStrings.xml', SHARED_STRINGS_BYTE_CAP);
            return readSharedStrings(ssDoc);
        }
        catch (ex) {
            if (window.d) {
                console.warn('sharedStrings rejected:', ex.message);
            }
            return [];
        }
    }

    function emptySheetEntry(name, truncated) {
        return {
            name,
            rows: [],
            cellStyles: [],
            merges: [],
            colWidths: [],
            rowHeights: [],
            defaultColWidth: null,
            defaultRowHeight: null,
            baseColWidth: null,
            charts: [],
            drawings: [],
            truncated: !!truncated
        };
    }

    function resolveSheetPath(zip, target) {
        var path = target.charAt(0) === '/' ? target.slice(1) : `xl/${target}`;
        if (!zip.names.includes(path) && target.indexOf('xl/') !== 0) {
            path = `xl/${target}`;
        }
        return path;
    }

    function lazySheetStub(name, path) {
        var stub = emptySheetEntry(name, false);
        stub.__lazy = true;
        stub.__lazyPath = path;
        return stub;
    }

    async function parseSheetRows(workbook, idx) {
        var sheet = workbook && workbook.sheets && workbook.sheets[idx];
        if (!sheet || !sheet.__lazy) {
            return sheet;
        }
        var ctx = workbook.__lazyCtx;
        if (!ctx) {
            return sheet;
        }
        var caps = { cellsTotal: 0, mergeRemaining: 500000, hyperlinkRemaining: 500000 };
        var sheetDoc = await readXml(ctx.zip, sheet.__lazyPath);
        var built = await buildSheetEntry(ctx.zip, sheetDoc, sheet.__lazyPath, sheet.name,
                                          ctx.sharedStrings, ctx.themeColors, caps);
        delete built.__sheetPath;
        Object.assign(sheet, built);
        delete sheet.__lazy;
        delete sheet.__lazyPath;
        return sheet;
    }

    async function buildSheetEntry(zip, sheetDoc, path, name, sharedStrings, themeColors, caps) {
        var parsed = readSheet(sheetDoc, sharedStrings);
        var merges = readMerges(sheetDoc, caps.mergeRemaining);
        caps.mergeRemaining -= merges._consumed || 0;
        var sheetFmt = readSheetFormat(sheetDoc);
        var drawingsRes = await readDrawingsForSheet(zip, path, parsed.rows, themeColors);
        var sheetHyperlinkRels = await readSheetHyperlinkRels(zip, path);
        var hyperlinks = readHyperlinks(sheetDoc, sheetHyperlinkRels, caps.hyperlinkRemaining);
        caps.hyperlinkRemaining -= hyperlinks._consumed || 0;
        var autoFilters = [];
        var sheetLevel = readAutoFilter(sheetDoc);
        if (sheetLevel) {
            autoFilters.push(sheetLevel);
        }
        var tablePartInfo = await readTablePartAutoFilters(zip, path, sheetDoc);
        for (var ta = 0; ta < tablePartInfo.autoFilters.length; ta++) {
            autoFilters.push(tablePartInfo.autoFilters[ta]);
        }
        for (var rr = 0; rr < parsed.rows.length; rr++) {
            caps.cellsTotal += parsed.rows[rr].length;
        }
        return {
            autoFilter: autoFilters.length === 1 ? autoFilters[0] : null,
            autoFilters,
            tableParts: tablePartInfo.tableParts,
            name,
            rows: parsed.rows,
            cellStyles: parsed.cellStyles,
            merges,
            colWidths: readColWidths(sheetDoc),
            rowHeights: readRowHeights(sheetDoc),
            defaultColWidth: sheetFmt.defaultColWidth,
            defaultRowHeight: sheetFmt.defaultRowHeight,
            baseColWidth: sheetFmt.baseColWidth,
            showGridLines: readSheetShowGridLines(sheetDoc),
            charts: drawingsRes.charts,
            drawings: drawingsRes.drawings,
            conditionalFormatting: readConditionalFormatting(sheetDoc),
            hyperlinks,
            truncated: parsed.truncated,
            __sheetPath: path
        };
    }

    async function parseXlsx(buffer) {
        var zip = await readZipEntries(buffer);
        var workbookDoc = await readXml(zip, 'xl/workbook.xml');
        var relsDoc = await readXml(zip, 'xl/_rels/workbook.xml.rels');
        var rels = new Map();
        var relEls = relsDoc.getElementsByTagName('Relationship');
        for (var i = 0; i < relEls.length; i++) {
            rels.set(relEls[i].getAttribute('Id'), relEls[i].getAttribute('Target'));
        }
        var sharedStrings = await loadSharedStrings(zip);
        var stylesResult = await readStylesAndTheme(zip);
        var sheetEls = workbookDoc.getElementsByTagName('sheet');
        var MAX_SHEETS = 256;
        var MAX_CELLS_PER_WORKBOOK = 250000;
        var sheets = [];
        var caps = {
            cellsTotal: 0,
            mergeRemaining: 500000,
            hyperlinkRemaining: 500000
        };
        var sheetLimit = Math.min(sheetEls.length, MAX_SHEETS);
        for (var s = 0; s < sheetLimit; s++) {
            var name = sheetEls[s].getAttribute('name') || `Sheet${s + 1}`;
            var rId = sheetEls[s].getAttribute('r:id') || sheetEls[s].getAttributeNS(REL_NS, 'id');
            var target = rels.get(rId);
            if (!target) {
                sheets.push(emptySheetEntry(name, false));
                continue;
            }
            var path = resolveSheetPath(zip, target);
            if (caps.cellsTotal >= MAX_CELLS_PER_WORKBOOK) {
                sheets.push(lazySheetStub(name, path));
                continue;
            }
            var sheetDoc = await readXml(zip, path);
            sheets.push(await buildSheetEntry(zip, sheetDoc, path, name,
                                              sharedStrings, stylesResult.themeColors, caps));
        }
        await resolveSlicerItems(zip, sheets);
        for (var si = 0; si < sheets.length; si++) {
            delete sheets[si].__sheetPath;
        }
        return {
            sheets,
            styleTable: stylesResult.styleTable,
            dxfs: stylesResult.dxfs || [],
            tableStyles: stylesResult.tableStyles || {},
            defaultFont: stylesResult.defaultFont || null,
            __lazyCtx: { zip, sharedStrings, themeColors: stylesResult.themeColors }
        };
    }

    async function resolveSlicerItems(zip, sheets) {
        var hasSlicer = false;
        for (var s = 0; s < sheets.length; s++) {
            var ds = sheets[s].drawings || [];
            for (var d = 0; d < ds.length; d++) {
                if (ds[d].kind === 'slicer') {
                    hasSlicer = true;
                    break;
                }
            }
            if (hasSlicer) {
                break;
            }
        }
        if (!hasSlicer) {
            return;
        }
        var slicerNameToCache = await readAllSlicers(zip);
        var cacheToSource = await readAllSlicerCaches(zip);
        var tableIdToInfo = await buildTableIdMap(zip, sheets);
        for (var si = 0; si < sheets.length; si++) {
            var drawings = sheets[si].drawings || [];
            for (var di = 0; di < drawings.length; di++) {
                var dr = drawings[di];
                if (dr.kind !== 'slicer') {
                    continue;
                }
                var cacheName = slicerNameToCache[dr.name];
                var src = cacheName ? cacheToSource[cacheName] : null;
                if (!src) {
                    continue;
                }
                var info = tableIdToInfo[src.tableId];
                if (!info) {
                    continue;
                }
                dr.items = extractTableColumnValues(sheets, info, src.column);
            }
        }
    }

    async function readAllSlicers(zip) {
        var out = Object.create(null);
        var names = zip.names || [];
        for (var i = 0; i < names.length; i++) {
            if (names[i].indexOf('xl/slicers/') !== 0 || !names[i].endsWith('.xml')) {
                continue;
            }
            var doc = await readXml(zip, names[i]);
            var els = getAll(doc, 'slicer');
            for (var j = 0; j < els.length; j++) {
                var nm = els[j].getAttribute('name') || '';
                var cache = els[j].getAttribute('cache') || '';
                if (nm) {
                    out[nm] = cache;
                }
            }
        }
        return out;
    }

    async function readAllSlicerCaches(zip) {
        var out = Object.create(null);
        var names = zip.names || [];
        for (var i = 0; i < names.length; i++) {
            if (names[i].indexOf('xl/slicerCaches/') !== 0 || !names[i].endsWith('.xml')) {
                continue;
            }
            var doc = await readXml(zip, names[i]);
            var defs = getAll(doc, 'slicerCacheDefinition');
            if (!defs.length) {
                continue;
            }
            var def = defs[0];
            var cacheName = def.getAttribute('name') || '';
            if (!cacheName) {
                continue;
            }
            var tsc = getAll(doc, 'tableSlicerCache');
            if (tsc.length) {
                var tid = parseInt(tsc[0].getAttribute('tableId') || '0', 10);
                var col = parseInt(tsc[0].getAttribute('column') || '0', 10);
                if (tid) {
                    out[cacheName] = { tableId: tid, column: col };
                }
            }
        }
        return out;
    }

    async function buildTableIdMap(zip, sheets) {
        var out = Object.create(null);
        var names = zip.names || [];
        var pathToSheetIdx = Object.create(null);
        for (var s = 0; s < sheets.length; s++) {
            pathToSheetIdx[sheets[s].__sheetPath] = s;
        }
        for (var i = 0; i < names.length; i++) {
            if (names[i].indexOf('xl/tables/') !== 0 || !names[i].endsWith('.xml')) {
                continue;
            }
            var doc = await readXml(zip, names[i]);
            var els = getAll(doc, 'table');
            if (!els.length) {
                continue;
            }
            var tableEl = els[0];
            var idAttr = parseInt(tableEl.getAttribute('id') || '0', 10);
            var refAttr = tableEl.getAttribute('ref') || '';
            if (!idAttr || !refAttr) {
                continue;
            }
            var ranges = parseSqref(refAttr);
            if (!ranges.length) {
                continue;
            }
            var rng = ranges[0];
            var sheetIdx = -1;
            for (var k = 0; k < sheets.length; k++) {
                var sheetPath = sheets[k].__sheetPath || '';
                var sheetRels = await findSheetRelToTarget(zip, sheetPath, names[i]);
                if (sheetRels) {
                    sheetIdx = k;
                    break;
                }
            }
            if (sheetIdx < 0) {
                continue;
            }
            out[idAttr] = { sheetIdx, r1: rng.r1, c1: rng.c1, r2: rng.r2, c2: rng.c2 };
        }
        return out;
    }

    async function findSheetRelToTarget(zip, sheetPath, tablePath) {
        if (!sheetPath) {
            return false;
        }
        var dir = sheetPath.replace(/[^/]+$/, '');
        var relsPath = `${dir}_rels/${sheetPath.split('/').pop()}.rels`;
        if (!zip.names.includes(relsPath)) {
            return false;
        }
        try {
            var doc = await readXml(zip, relsPath);
            var rs = doc.getElementsByTagName('Relationship');
            for (var i = 0; i < rs.length; i++) {
                var tgt = rs[i].getAttribute('Target') || '';
                var resolved = resolveRelPath(dir, tgt);
                if (resolved === tablePath) {
                    return true;
                }
            }
        }
        catch (ex) {
            return false;
        }
        return false;
    }

    function extractTableColumnValues(sheets, info, columnIdx) {
        var sheet = sheets[info.sheetIdx];
        if (!sheet || !sheet.rows) {
            return [];
        }
        var offset = columnIdx > 0 ? columnIdx - 1 : 0;
        var col = info.c1 + offset;
        var MAX_SLICER_ITEMS = 1024;
        var MAX_SLICER_ITEM_LEN = 256;
        var seen = new Map();
        var items = [];
        for (var r = info.r1 + 1; r <= info.r2 && items.length < MAX_SLICER_ITEMS; r++) {
            var row = sheet.rows[r];
            if (!row) {
                continue;
            }
            var v = row[col];
            if (v === undefined || v === null || v === '') {
                continue;
            }
            var s = typeof v === 'string' ? v : String(v);
            if (s.length > MAX_SLICER_ITEM_LEN) {
                s = s.slice(0, MAX_SLICER_ITEM_LEN);
            }
            if (seen.has(s)) {
                continue;
            }
            seen.set(s, true);
            items.push(s);
        }
        items.sort((a, b) => {
            return a.localeCompare(b);
        });
        return items;
    }

    function parseSqref(sqref) {
        var out = [];
        if (!sqref) {
            return out;
        }
        var MAX_SQREF_RANGES = 64;
        var parts = sqref.split(/\s+/);
        var partLimit = Math.min(parts.length, MAX_SQREF_RANGES);
        for (var i = 0; i < partLimit; i++) {
            var s = parts[i].replace(/\$/g, '');
            var bits = s.split(':');
            var start = parseSimpleCellRef(bits[0]);
            var end = bits.length > 1 ? parseSimpleCellRef(bits[1]) : start;
            if (start && end) {
                out.push({
                    r1: Math.min(start.r, end.r),
                    c1: Math.min(start.c, end.c),
                    r2: Math.max(start.r, end.r),
                    c2: Math.max(start.c, end.c)
                });
            }
        }
        return out;
    }

    function buildTablePartEntry(tableEl, rng) {
        var styleInfoEl = getOne(tableEl, 'tableStyleInfo');
        return {
            r1: rng.r1,
            c1: rng.c1,
            r2: rng.r2,
            c2: rng.c2,
            headerRowCount: parseInt(tableEl.getAttribute('headerRowCount') || '1', 10),
            totalsRowCount: parseInt(tableEl.getAttribute('totalsRowCount') || '0', 10),
            styleName: styleInfoEl ? styleInfoEl.getAttribute('name') || '' : '',
            showFirstColumn: styleInfoEl && styleInfoEl.getAttribute('showFirstColumn') === '1',
            showLastColumn: styleInfoEl && styleInfoEl.getAttribute('showLastColumn') === '1',
            showRowStripes: styleInfoEl && styleInfoEl.getAttribute('showRowStripes') === '1',
            showColumnStripes: styleInfoEl && styleInfoEl.getAttribute('showColumnStripes') === '1'
        };
    }

    async function processSheetTablePart(zip, dir, tablePath, autoFilters, tableParts) {
        var tableDoc = await readXml(zip, tablePath);
        var af = readAutoFilter(tableDoc);
        if (af) {
            autoFilters.push(af);
        }
        var tableEl = getOne(tableDoc, 'table');
        var tableRef = tableEl ? tableEl.getAttribute('ref') || '' : '';
        if (!tableRef) {
            return;
        }
        var ranges = parseSqref(tableRef);
        if (ranges.length) {
            tableParts.push(buildTablePartEntry(tableEl, ranges[0]));
        }
    }

    async function readTablePartAutoFilters(zip, sheetPath, sheetDoc) {
        var autoFilters = [];
        var tableParts = [];
        var result = { autoFilters, tableParts };
        var partEls = getAll(sheetDoc, 'tablePart');
        if (!partEls.length) {
            return result;
        }
        var dir = sheetPath.replace(/[^/]+$/, '');
        var name = sheetPath.split('/').pop();
        var relsPath = `${dir}_rels/${name}.rels`;
        if (!zip.names.includes(relsPath)) {
            return result;
        }
        try {
            var relsDoc = await readXml(zip, relsPath);
            var idToTarget = {};
            var relEls = relsDoc.getElementsByTagName('Relationship');
            for (var i = 0; i < relEls.length; i++) {
                idToTarget[relEls[i].getAttribute('Id')] = relEls[i].getAttribute('Target');
            }
            for (var p = 0; p < partEls.length; p++) {
                var rid = partEls[p].getAttribute('r:id') || partEls[p].getAttributeNS(REL_NS, 'id');
                var target = idToTarget[rid];
                if (!target) {
                    continue;
                }
                var tablePath = resolveRelPath(dir, target);
                if (!tablePath || !zip.names.includes(tablePath)) {
                    continue;
                }
                await processSheetTablePart(zip, dir, tablePath, autoFilters, tableParts);
            }
        }
        catch (ex) {
            return result;
        }
        return result;
    }

    function readAutoFilter(sheetDoc) {
        var el = getOne(sheetDoc, 'autoFilter');
        if (!el) {
            return null;
        }
        var ref = el.getAttribute('ref') || '';
        var ranges = parseSqref(ref);
        if (!ranges.length) {
            return null;
        }
        var rng = ranges[0];
        return { r1: rng.r1, c1: rng.c1, r2: rng.r2, c2: rng.c2 };
    }

    function parseSimpleCellRef(s) {
        var m = /^([A-Z]+)(\d+)$/.exec(s);
        if (!m) {
            return null;
        }
        return { c: colRefToIndex(m[1]), r: parseInt(m[2], 10) - 1 };
    }

    function readCfSqref(cfEl) {
        var sqref = cfEl.getAttribute('sqref') || '';
        if (sqref) {
            return sqref;
        }
        var sqrefEl = getOne(cfEl, 'sqref');
        return sqrefEl ? sqrefEl.textContent || '' : '';
    }

    function readCfIconSet(iconSetEl) {
        if (!iconSetEl) {
            return null;
        }
        var MAX_CFVO = 32;
        var thresholds = [];
        var cfvos = getAll(iconSetEl, 'cfvo');
        var cfvoLimit = Math.min(cfvos.length, MAX_CFVO);
        for (var ci = 0; ci < cfvoLimit; ci++) {
            var cfvoVal = cfvos[ci].getAttribute('val');
            if (!cfvoVal) {
                var fEl = getOne(cfvos[ci], 'f');
                cfvoVal = fEl ? fEl.textContent || '' : '';
            }
            thresholds.push({
                type: cfvos[ci].getAttribute('type') || 'percent',
                val: cfvoVal,
                gte: cfvos[ci].getAttribute('gte') !== '0'
            });
        }
        var cfIcons = getAll(iconSetEl, 'cfIcon');
        var perBucketIcons = null;
        if (cfIcons.length) {
            perBucketIcons = [];
            var iconLimit = Math.min(cfIcons.length, MAX_CFVO);
            for (var ii = 0; ii < iconLimit; ii++) {
                perBucketIcons.push({
                    setName: cfIcons[ii].getAttribute('iconSet') || '',
                    iconId: parseInt(cfIcons[ii].getAttribute('iconId'), 10) || 0
                });
            }
        }
        return {
            setName: iconSetEl.getAttribute('iconSet') || '3TrafficLights1',
            showValue: iconSetEl.getAttribute('showValue') !== '0',
            reverse: iconSetEl.getAttribute('reverse') === '1',
            thresholds,
            perBucketIcons
        };
    }

    function readCfRule(ruleEl) {
        var MAX_CF_FORMULAS_PER_RULE = 4;
        var MAX_CF_FORMULA_LEN = 4096;
        var dxfIdAttr = ruleEl.getAttribute('dxfId');
        var dxfId = dxfIdAttr === null ? null : parseInt(dxfIdAttr, 10);
        var formulas = [];
        var fEls = getAll(ruleEl, 'formula');
        var fLimit = Math.min(fEls.length, MAX_CF_FORMULAS_PER_RULE);
        for (var k = 0; k < fLimit; k++) {
            var fText = fEls[k].textContent || '';
            if (fText.length > MAX_CF_FORMULA_LEN) {
                fText = fText.slice(0, MAX_CF_FORMULA_LEN);
            }
            formulas.push(fText);
        }
        return {
            type: ruleEl.getAttribute('type') || '',
            operator: ruleEl.getAttribute('operator') || '',
            dxfId: isNaN(dxfId) ? null : dxfId,
            priority: parseInt(ruleEl.getAttribute('priority'), 10) || 0,
            formulas,
            iconSet: readCfIconSet(getOne(ruleEl, 'iconSet')),
            stopIfTrue: ruleEl.getAttribute('stopIfTrue') === '1'
        };
    }

    function readConditionalFormatting(sheetDoc) {
        var out = [];
        var cfs = getAll(sheetDoc, 'conditionalFormatting');
        var MAX_CF_BLOCKS_PER_SHEET = 256;
        var MAX_CF_RULES_PER_BLOCK = 64;
        var blockLimit = Math.min(cfs.length, MAX_CF_BLOCKS_PER_SHEET);
        for (var i = 0; i < blockLimit; i++) {
            var ranges = parseSqref(readCfSqref(cfs[i]));
            if (!ranges.length) {
                continue;
            }
            var ruleEls = getAll(cfs[i], 'cfRule');
            var rules = [];
            var ruleLimit = Math.min(ruleEls.length, MAX_CF_RULES_PER_BLOCK);
            for (var j = 0; j < ruleLimit; j++) {
                rules.push(readCfRule(ruleEls[j]));
            }
            rules.sort((a, b) => a.priority - b.priority);
            out.push({ ranges, rules });
        }
        return out;
    }

    function parseCellRangeRef(refStr) {
        if (!refStr) {
            return null;
        }
        var rest = refStr;
        var sheet = null;
        var bang = refStr.lastIndexOf('!');
        if (bang >= 0) {
            sheet = refStr.slice(0, bang).replace(/^["']|["']$/g, '');
            rest = refStr.slice(bang + 1);
        }
        rest = rest.replace(/\$/g, '');
        var parts = rest.split(':');
        var a = parseRef(parts[0]);
        var b = parts[1] ? parseRef(parts[1]) : a;
        if (!a || !b) {
            return null;
        }
        return {
            sheet,
            r1: Math.min(a.row, b.row),
            c1: Math.min(a.col, b.col),
            r2: Math.max(a.row, b.row),
            c2: Math.max(a.col, b.col)
        };
    }

    var MAX_RANGE_CELLS = 100000;
    function readRangeValues(rows, range) {
        if (!range || !rows) {
            return [];
        }
        var out = [];
        for (var r = range.r1; r <= range.r2; r++) {
            var row = rows[r] || [];
            for (var c = range.c1; c <= range.c2; c++) {
                if (out.length >= MAX_RANGE_CELLS) {
                    return out;
                }
                out.push(row[c] === undefined ? '' : row[c]);
            }
        }
        return out;
    }

    function findRelTarget(zip, sheetPath, type) {
        var dir = sheetPath.replace(/[^/]+$/, '');
        var relsPath = `${dir  }_rels/${  sheetPath.split('/').pop()  }.rels`;
        if (!zip.names.includes(relsPath)) {
            return null;
        }
        return readXml(zip, relsPath).then((doc) => {
            var rs = doc.getElementsByTagName('Relationship');
            for (var i = 0; i < rs.length; i++) {
                if ((rs[i].getAttribute('Type') || '').endsWith(type)) {
                    return { relsPath, dir, target: rs[i].getAttribute('Target') };
                }
            }
            return null;
        }).catch(() => null);
    }

    function resolveRelPath(baseDir, target) {
        if (!target) {
            return null;
        }
        if (target.charAt(0) === '/') {
            return target.slice(1);
        }
        var parts = (baseDir + target).split('/');
        var stack = [];
        for (var i = 0; i < parts.length; i++) {
            if (parts[i] === '..') {
                stack.pop();
            }
            else if (parts[i] !== '.' && parts[i] !== '') {
                stack.push(parts[i]);
            }
        }
        return stack.join('/');
    }

    function getChartTitle(doc) {
        var titleEl = getOne(doc, 'title');
        if (!titleEl) {
            return '';
        }
        var tNodes = getAll(titleEl, 't');
        var out = '';
        for (var ti = 0; ti < tNodes.length; ti++) {
            out += tNodes[ti].textContent;
        }
        return out;
    }

    function readLineProps(spPr, themeColors) {
        if (!spPr) {
            return null;
        }
        var ln = getOne(spPr, 'ln');
        if (!ln) {
            return null;
        }
        if (getOne(ln, 'noFill')) {
            return { color: '', width: 0, dash: 'solid' };
        }
        var wRaw = parseInt(ln.getAttribute('w'), 10);
        var solid = getOne(ln, 'solidFill');
        var color = '';
        if (solid) {
            var srgb = getOne(solid, 'srgbClr');
            if (srgb) {
                var _safe = safeHex(srgb.getAttribute('val'));
                color = _safe ? `#${_safe}` : '';
            }
            else {
                var scheme = getOne(solid, 'schemeClr');
                if (scheme) {
                    color = resolveSchemeClr(scheme, themeColors);
                }
            }
        }
        var prst = getOne(ln, 'prstDash');
        return {
            color,
            width: isNaN(wRaw) ? null : wRaw / 12700 * (96 / 72),
            dash: prst ? prst.getAttribute('val') : 'solid'
        };
    }

    function readMarker(markerEl, themeColors) {
        if (!markerEl) {
            return null;
        }
        var symEl = getOne(markerEl, 'symbol');
        var sizeEl = getOne(markerEl, 'size');
        var spPr = getOne(markerEl, 'spPr');
        return {
            symbol: symEl ? symEl.getAttribute('val') : 'auto',
            size: sizeEl ? parseInt(sizeEl.getAttribute('val'), 10) || 5 : 5,
            color: readSpPrColor(spPr, themeColors),
            line: readLineProps(spPr, themeColors)
        };
    }

    function readBool(el, defaultVal) {
        if (!el) {
            return defaultVal;
        }
        var v = el.getAttribute('val');
        if (v === null || v === undefined) {
            return true;
        }
        return v === '1' || v === 'true';
    }

    function readDataLabels(dLblsEl, themeColors) {
        if (!dLblsEl) {
            return null;
        }
        var del = getOne(dLblsEl, 'delete');
        if (del && readBool(del, false)) {
            return { show: false, perPoint: readPerPointDLbls(dLblsEl, themeColors) };
        }
        var posEl = getOne(dLblsEl, 'dLblPos');
        var showVal = getOne(dLblsEl, 'showVal');
        var showCat = getOne(dLblsEl, 'showCatName');
        var showSer = getOne(dLblsEl, 'showSerName');
        var showPct = getOne(dLblsEl, 'showPercent');
        var txPr = getOne(dLblsEl, 'txPr');
        var numFmtEl = getOne(dLblsEl, 'numFmt');
        return {
            show: true,
            position: posEl ? posEl.getAttribute('val') : 'outEnd',
            showValue: readBool(showVal, !showCat && !showSer && !showPct),
            showCategory: readBool(showCat, false),
            showSeries: readBool(showSer, false),
            showPercent: readBool(showPct, false),
            font: readTxFont(txPr, themeColors),
            numFmt: numFmtEl ? (numFmtEl.getAttribute('formatCode') || '').slice(0, MAX_NUM_FMT_LEN) : '',
            perPoint: readPerPointDLbls(dLblsEl, themeColors)
        };
    }

    function readPerPointDLbls(dLblsEl, themeColors) {
        var out = [];
        for (var i = 0; i < dLblsEl.childNodes.length; i++) {
            var node = dLblsEl.childNodes[i];
            if (node.nodeType !== 1 || node.localName !== 'dLbl') {
                continue;
            }
            var idxEl = getOne(node, 'idx');
            var idx = idxEl ? parseInt(idxEl.getAttribute('val'), 10) : -1;
            if (idx < 0) {
                continue;
            }
            var deleted = false;
            var delEl = getOneDirect(node, 'delete');
            if (delEl && readBool(delEl, false)) {
                deleted = true;
            }
            var layoutEl = getOne(node, 'layout');
            var pos = layoutEl ? readChartLayout(layoutEl) : null;
            var showVal = getOne(node, 'showVal');
            var showPct = getOne(node, 'showPercent');
            var showCat = getOne(node, 'showCatName');
            var posEl = getOne(node, 'dLblPos');
            var numFmtEl = getOne(node, 'numFmt');
            var txPr = getOne(node, 'txPr');
            out[idx] = {
                idx,
                deleted,
                layout: pos,
                position: posEl ? posEl.getAttribute('val') : '',
                showValue: showVal ? readBool(showVal, false) : null,
                showPercent: showPct ? readBool(showPct, false) : null,
                showCategory: showCat ? readBool(showCat, false) : null,
                numFmt: numFmtEl ? (numFmtEl.getAttribute('formatCode') || '').slice(0, MAX_NUM_FMT_LEN) : '',
                font: readTxFont(txPr, themeColors)
            };
        }
        return out;
    }

    function readTxFont(txPr, themeColors) {
        if (!txPr) {
            return null;
        }
        var rPr = getOne(txPr, 'defRPr') || getOne(txPr, 'rPr');
        if (!rPr) {
            return null;
        }
        var szRaw = parseInt(rPr.getAttribute('sz'), 10);
        var bold = rPr.getAttribute('b') === '1';
        var italic = rPr.getAttribute('i') === '1';
        var solid = getOne(rPr, 'solidFill');
        var color = '';
        if (solid) {
            var srgb = getOne(solid, 'srgbClr');
            if (srgb) {
                var _safe = safeHex(srgb.getAttribute('val'));
                color = _safe ? `#${_safe}` : '';
            }
            else {
                var scheme = getOne(solid, 'schemeClr');
                if (scheme) {
                    color = resolveSchemeClr(scheme, themeColors);
                }
            }
        }
        var latin = getOne(rPr, 'latin');
        return {
            size: isNaN(szRaw) ? null : szRaw / 100,
            bold,
            italic,
            color,
            name: latin ? latin.getAttribute('typeface') || '' : ''
        };
    }

    function readRichTitleText(rich, themeColors) {
        var text = '';
        var font = null;
        var ps = getAll(rich, 'p');
        for (var i = 0; i < ps.length; i++) {
            var rs = getAll(ps[i], 'r');
            for (var j = 0; j < rs.length; j++) {
                var tEl = getOne(rs[j], 't');
                if (tEl) {
                    text += tEl.textContent;
                }
            }
            if (text && !font) {
                font = readTxFont(getOne(ps[0], 'pPr'), themeColors)
                    || (rs[0] ? readTxFont(rs[0], themeColors) : null);
            }
        }
        return { text, font };
    }

    function readStrRefTitleText(tx) {
        var strRef = getOne(tx, 'strRef');
        if (!strRef) {
            return '';
        }
        var cache = getOne(strRef, 'strCache');
        if (!cache) {
            return '';
        }
        var pt = getOne(cache, 'pt');
        var v = pt ? getOne(pt, 'v') : null;
        return v ? v.textContent : '';
    }

    function readChartTitleLayout(titleEl) {
        var layoutEl = getOne(titleEl, 'layout');
        var manualEl = layoutEl ? getOne(layoutEl, 'manualLayout') : null;
        if (!manualEl) {
            return null;
        }
        var xEl = getOne(manualEl, 'x');
        var yEl = getOne(manualEl, 'y');
        var x = xEl ? parseFloat(xEl.getAttribute('val')) : NaN;
        var y = yEl ? parseFloat(yEl.getAttribute('val')) : NaN;
        if (isNaN(x) && isNaN(y)) {
            return null;
        }
        return {
            x: isNaN(x) ? null : x,
            y: isNaN(y) ? null : y
        };
    }

    function readChartTitleEl(titleEl, themeColors) {
        if (!titleEl) {
            return null;
        }
        var overlayEl = getOne(titleEl, 'overlay');
        var tx = getOne(titleEl, 'tx');
        var text = '';
        var font = null;
        if (tx) {
            var rich = getOne(tx, 'rich');
            if (rich) {
                ({text, font} = readRichTitleText(rich, themeColors));
            }
            else {
                text = readStrRefTitleText(tx);
            }
        }
        return {
            text,
            font,
            layout: readChartTitleLayout(titleEl),
            overlay: overlayEl && readBool(overlayEl, false)
        };
    }

    function readLegend(legendEl, themeColors) {
        if (!legendEl) {
            return { show: true, position: 'r', font: null };
        }
        var posEl = getOne(legendEl, 'legendPos');
        var overlayEl = getOne(legendEl, 'overlay');
        return {
            show: true,
            position: posEl ? posEl.getAttribute('val') : 'r',
            overlay: overlayEl && readBool(overlayEl, false),
            font: readTxFont(getOne(legendEl, 'txPr'), themeColors)
        };
    }

    function readAxisScaling(scaling) {
        if (!scaling) {
            return { min: null, max: null, reversed: false, logBase: null };
        }
        var minEl = getOne(scaling, 'min');
        var maxEl = getOne(scaling, 'max');
        var orientationEl = getOne(scaling, 'orientation');
        var logBaseEl = getOne(scaling, 'logBase');
        return {
            min: minEl ? parseFloat(minEl.getAttribute('val')) : null,
            max: maxEl ? parseFloat(maxEl.getAttribute('val')) : null,
            reversed: orientationEl && orientationEl.getAttribute('val') === 'maxMin',
            logBase: logBaseEl ? parseFloat(logBaseEl.getAttribute('val')) : null
        };
    }

    function readAxisGridlines(majorGrid, minorGrid, themeColors) {
        var DEFAULT_MAJOR = { color: '#d9d9d9', width: 0.75, dash: 'solid' };
        var DEFAULT_MINOR = { color: '#f0f0f0', width: 0.5, dash: 'solid' };
        return {
            majorGridlines: majorGrid
                ? { line: readLineProps(getOne(majorGrid, 'spPr'), themeColors) || DEFAULT_MAJOR }
                : null,
            minorGridlines: minorGrid
                ? { line: readLineProps(getOne(minorGrid, 'spPr'), themeColors) || DEFAULT_MINOR }
                : null
        };
    }

    function readAxisLabelOpts(axEl, themeColors) {
        var txPr = getOne(axEl, 'txPr');
        var bodyPr = txPr ? getOne(txPr, 'bodyPr') : null;
        var rotRaw = bodyPr ? parseInt(bodyPr.getAttribute('rot'), 10) : NaN;
        var rot = isNaN(rotRaw) ? 0 : -rotRaw / 60000;
        if (Math.abs(rot) > 360) {
            rot = 0;
        }
        return {
            labelFont: readTxFont(txPr, themeColors),
            labelRotation: rot
        };
    }

    function readAxisProps(axEl, themeColors) {
        if (!axEl) {
            return null;
        }
        var scaling = readAxisScaling(getOne(axEl, 'scaling'));
        var grid = readAxisGridlines(
            getOne(axEl, 'majorGridlines'),
            getOne(axEl, 'minorGridlines'),
            themeColors
        );
        var labelOpts = readAxisLabelOpts(axEl, themeColors);
        var delEl = getOne(axEl, 'delete');
        var titleEl = getOne(axEl, 'title');
        var majorUnitEl = getOne(axEl, 'majorUnit');
        var minorUnitEl = getOne(axEl, 'minorUnit');
        var numFmtEl = getOne(axEl, 'numFmt');
        var majorTickEl = getOne(axEl, 'majorTickMark');
        var minorTickEl = getOne(axEl, 'minorTickMark');
        var labelPosEl = getOne(axEl, 'tickLblPos');
        var spPr = getOne(axEl, 'spPr');
        return {
            hidden: delEl && readBool(delEl, false),
            title: readChartTitleEl(titleEl, themeColors),
            min: scaling.min,
            max: scaling.max,
            reversed: scaling.reversed,
            logBase: scaling.logBase,
            majorUnit: majorUnitEl ? parseFloat(majorUnitEl.getAttribute('val')) : null,
            minorUnit: minorUnitEl ? parseFloat(minorUnitEl.getAttribute('val')) : null,
            numFmt: numFmtEl ? (numFmtEl.getAttribute('formatCode') || '').slice(0, MAX_NUM_FMT_LEN) : '',
            majorTick: majorTickEl ? majorTickEl.getAttribute('val') : 'out',
            minorTick: minorTickEl ? minorTickEl.getAttribute('val') : 'none',
            labelPos: labelPosEl ? labelPosEl.getAttribute('val') : 'nextTo',
            line: readLineProps(spPr, themeColors),
            labelFont: labelOpts.labelFont,
            labelRotation: labelOpts.labelRotation,
            majorGridlines: grid.majorGridlines,
            minorGridlines: grid.minorGridlines
        };
    }

    function readBackground(spPr, themeColors) {
        if (!spPr) {
            return null;
        }
        var noFill = getOne(spPr, 'noFill');
        if (noFill) {
            return { color: '', line: readLineProps(spPr, themeColors) };
        }
        var solid = getOne(spPr, 'solidFill');
        var color = '';
        if (solid) {
            var srgb = getOne(solid, 'srgbClr');
            if (srgb) {
                var _safe = safeHex(srgb.getAttribute('val'));
                color = _safe ? `#${_safe}` : '';
            }
            else {
                var scheme = getOne(solid, 'schemeClr');
                if (scheme) {
                    color = resolveSchemeClr(scheme, themeColors);
                }
            }
        }
        return {
            color,
            line: readLineProps(spPr, themeColors)
        };
    }

    function readTrendline(tlEl, themeColors) {
        if (!tlEl) {
            return null;
        }
        var typeEl = getOne(tlEl, 'trendlineType');
        var orderEl = getOne(tlEl, 'order');
        var periodEl = getOne(tlEl, 'period');
        var forwardEl = getOne(tlEl, 'forward');
        var backwardEl = getOne(tlEl, 'backward');
        return {
            type: typeEl ? typeEl.getAttribute('val') || 'linear' : 'linear',
            order: orderEl ? parseInt(orderEl.getAttribute('val'), 10) || 2 : 2,
            period: periodEl ? parseInt(periodEl.getAttribute('val'), 10) || 2 : 2,
            forward: forwardEl ? parseFloat(forwardEl.getAttribute('val')) : 0,
            backward: backwardEl ? parseFloat(backwardEl.getAttribute('val')) : 0,
            line: readLineProps(getOne(tlEl, 'spPr'), themeColors)
        };
    }

    var MAX_CHART_POINTS = 10000;
    function readCachedPts(cacheEl, isNumeric) {
        if (!cacheEl) {
            return null;
        }
        var pts = getAll(cacheEl, 'pt');
        var sparse = [];
        var maxIdx = -1;
        var ptLimit = Math.min(pts.length, MAX_CHART_POINTS);
        for (var i = 0; i < ptLimit; i++) {
            var idx = parseInt(pts[i].getAttribute('idx'), 10);
            if (isNaN(idx) || idx < 0) {
                idx = i;
            }
            if (idx >= MAX_CHART_POINTS) {
                continue;
            }
            var v = getOne(pts[i], 'v');
            if (v) {
                sparse[idx] = isNumeric ? parseFloat(v.textContent) : v.textContent;
            }
            if (idx > maxIdx) {
                maxIdx = idx;
            }
        }
        var dense = [];
        for (var k = 0; k <= maxIdx; k++) {
            if (isNumeric) {
                dense.push(typeof sparse[k] === 'number' && !isNaN(sparse[k]) ? sparse[k] : 0);
            }
            else {
                dense.push(sparse[k] === undefined ? '' : String(sparse[k]));
            }
        }
        return dense;
    }

    function readSeriesName(ser, resolveRef) {
        var tx = getOne(ser, 'tx');
        if (!tx) {
            return '';
        }
        var strRef = getOne(tx, 'strRef');
        if (strRef) {
            var cached = readCachedPts(getOne(strRef, 'strCache'), false);
            if (cached && cached.length) {
                return cached.join(' ');
            }
            var f = getOne(strRef, 'f');
            if (f) {
                return resolveRef(f.textContent).join(' ') || '';
            }
        }
        var lit = getOne(tx, 'v');
        return lit ? lit.textContent : '';
    }

    function readSeriesValues(ser, resolveRef) {
        var valEl = getOne(ser, 'val') || getOne(ser, 'yVal');
        if (!valEl) {
            return [];
        }
        var numRef = getOne(valEl, 'numRef');
        if (numRef) {
            var cached = readCachedPts(getOne(numRef, 'numCache'), true);
            if (cached) {
                return cached;
            }
            var f = getOne(numRef, 'f');
            if (f) {
                return resolveRef(f.textContent).map((v) => {
                    var n = parseFloat(v);
                    return isNaN(n) ? 0 : n;
                });
            }
        }
        var numLit = getOne(valEl, 'numLit');
        if (numLit) {
            var litCached = readCachedPts(numLit, true);
            return litCached || [];
        }
        return [];
    }

    function readSeriesNumFmt(ser) {
        var valEl = getOne(ser, 'val') || getOne(ser, 'yVal');
        if (!valEl) {
            return '';
        }
        var numRef = getOne(valEl, 'numRef');
        if (numRef) {
            var cache = getOne(numRef, 'numCache');
            if (cache) {
                var fc = getOne(cache, 'formatCode');
                if (fc) {
                    return fc.textContent || '';
                }
            }
        }
        var numLit = getOne(valEl, 'numLit');
        if (numLit) {
            var fc2 = getOne(numLit, 'formatCode');
            if (fc2) {
                return fc2.textContent || '';
            }
        }
        return '';
    }

    function readSeriesCategories(ser, resolveRef) {
        var catEl = getOne(ser, 'cat') || getOne(ser, 'xVal');
        if (!catEl) {
            return null;
        }
        var strRef = getOne(catEl, 'strRef');
        if (strRef) {
            var sc = readCachedPts(getOne(strRef, 'strCache'), false);
            if (sc) {
                return sc;
            }
            var sf = getOne(strRef, 'f');
            if (sf) {
                return resolveRef(sf.textContent).map(String);
            }
        }
        var numRef = getOne(catEl, 'numRef');
        if (numRef) {
            var nc = readCachedPts(getOne(numRef, 'numCache'), true);
            if (nc) {
                return nc;
            }
            var nf = getOne(numRef, 'f');
            if (nf) {
                return resolveRef(nf.textContent);
            }
        }
        return null;
    }

    function readSpPrColor(spPr, themeColors) {
        if (!spPr) {
            return '';
        }
        var solid = getOne(spPr, 'solidFill');
        var fill = solid || getOne(spPr, 'gradFill');
        if (!fill) {
            return '';
        }
        var pickFromContainer = function(container) {
            if (!container) {
                return '';
            }
            var s = getOne(container, 'srgbClr');
            if (s) {
                var h = safeHex(s.getAttribute('val'));
                return h ? `#${h}` : '';
            }
            var sc = getOne(container, 'schemeClr');
            if (sc) {
                return resolveSchemeClr(sc, themeColors);
            }
            return '';
        };
        if (solid) {
            return pickFromContainer(solid);
        }
        var stops = getAll(fill, 'gs');
        var best = null;
        var bestDist = Infinity;
        for (var i = 0; i < stops.length; i++) {
            var posAttr = parseInt(stops[i].getAttribute('pos'), 10);
            var pos = isNaN(posAttr) ? 0 : posAttr;
            var d = Math.abs(pos - 50000);
            if (d < bestDist) {
                bestDist = d;
                best = stops[i];
            }
        }
        return pickFromContainer(best);
    }

    function resolveSchemeClr(scheme, themeColors) {
        var SCHEME_INDEX = {
            bg1: 0, tx1: 1, bg2: 2, tx2: 3,
            lt1: 0, dk1: 1, lt2: 2, dk2: 3,
            accent1: 4, accent2: 5, accent3: 6, accent4: 7, accent5: 8, accent6: 9,
            hlink: 10, folHlink: 11
        };
        var name = scheme.getAttribute('val') || '';
        var idx = SCHEME_INDEX[name];
        if (idx === undefined) {
            return '';
        }
        var pairSwap = { 0: 1, 1: 0, 2: 3, 3: 2 };
        if (pairSwap[idx] !== undefined) {
            idx = pairSwap[idx];
        }
        var hex = themeColors[idx] || DEFAULT_THEME[idx] || '000000';
        var tintEl = getOne(scheme, 'tint');
        var shadeEl = getOne(scheme, 'shade');
        var lumModEl = getOne(scheme, 'lumMod');
        var lumOffEl = getOne(scheme, 'lumOff');
        if (tintEl) {
            hex = applyTint(hex, parseInt(tintEl.getAttribute('val'), 10) / 100000);
        }
        if (shadeEl) {
            var shadeVal = parseInt(shadeEl.getAttribute('val'), 10) / 100000;
            hex = applyTint(hex, -(1 - shadeVal));
        }
        if (lumModEl || lumOffEl) {
            var mod = lumModEl ? parseInt(lumModEl.getAttribute('val'), 10) / 100000 : 1;
            var off = lumOffEl ? parseInt(lumOffEl.getAttribute('val'), 10) / 100000 : 0;
            if (off > 0) {
                hex = applyTint(hex, off);
            }
            else if (mod < 1) {
                var factor = Math.pow(mod, 2.5);
                hex = applyTint(hex, -(1 - factor));
            }
        }
        var safe = safeHex(hex);
        return safe ? `#${safe}` : '';
    }

    function readDataPointColors(ser, themeColors) {
        var dPts = getAll(ser, 'dPt');
        var colors = [];
        for (var i = 0; i < dPts.length; i++) {
            var idxEl = getOne(dPts[i], 'idx');
            var idx = idxEl ? parseInt(idxEl.getAttribute('val'), 10) : i;
            var color = readSpPrColor(getOne(dPts[i], 'spPr'), themeColors);
            if (color) {
                colors[idx] = color;
            }
        }
        return colors;
    }

    function readPointExplosions(ser) {
        var dPts = getAll(ser, 'dPt');
        var out = [];
        for (var i = 0; i < dPts.length; i++) {
            var idxEl = getOne(dPts[i], 'idx');
            var idx = idxEl ? parseInt(idxEl.getAttribute('val'), 10) : i;
            var explEl = getOne(dPts[i], 'explosion');
            if (explEl) {
                out[idx] = parseInt(explEl.getAttribute('val'), 10) || 0;
            }
        }
        return out.length ? out : null;
    }

    function readSeriesAdvanced(ser, themeColors) {
        var spPr = getOne(ser, 'spPr');
        var smoothEl = getOne(ser, 'smooth');
        var invertEl = getOne(ser, 'invertIfNegative');
        var shadowEl = spPr ? getOne(spPr, 'outerShdw') : null;
        return {
            color: readSpPrColor(spPr, themeColors),
            line: readLineProps(spPr, themeColors),
            pointColors: readDataPointColors(ser, themeColors),
            pointExplosions: readPointExplosions(ser),
            marker: readMarker(getOne(ser, 'marker'), themeColors),
            dataLabels: readDataLabels(getOne(ser, 'dLbls'), themeColors),
            trendline: readTrendline(getOne(ser, 'trendline'), themeColors),
            smooth: smoothEl ? readBool(smoothEl, true) : null,
            invertIfNegative: invertEl ? readBool(invertEl, false) : false,
            hasShadow: shadowEl ? true : null
        };
    }

    var MAX_CHART_SERIES = 64;
    function readChartSeries(el, resolveRef, themeColors) {
        var series = getAll(el, 'ser');
        var seriesOut = [];
        var categories = null;
        var seriesLimit = Math.min(series.length, MAX_CHART_SERIES);
        for (var si = 0; si < seriesLimit; si++) {
            var ser = series[si];
            var name = readSeriesName(ser, resolveRef);
            var data = readSeriesValues(ser, resolveRef);
            if (data && data.length > MAX_CHART_POINTS) {
                data.length = MAX_CHART_POINTS;
            }
            if (!categories) {
                categories = readSeriesCategories(ser, resolveRef);
                if (categories && categories.length > MAX_CHART_POINTS) {
                    categories.length = MAX_CHART_POINTS;
                }
            }
            var advanced = readSeriesAdvanced(ser, themeColors);
            advanced.name = name || `Series ${  si + 1}`;
            advanced.data = data;
            advanced.valueNumFmt = readSeriesNumFmt(ser);
            seriesOut.push(advanced);
        }
        if (!categories) {
            var maxLen = seriesOut.reduce((m, s) => Math.max(m, s.data.length), 0);
            categories = [];
            for (var k = 0; k < maxLen; k++) {
                categories.push(String(k + 1));
            }
        }
        return { series: seriesOut, categories };
    }

    function readChartGroupOptions(el) {
        var grouping = getOne(el, 'grouping');
        var barDir = getOne(el, 'barDir');
        var gapWidth = getOne(el, 'gapWidth');
        var overlap = getOne(el, 'overlap');
        var varyColors = getOne(el, 'varyColors');
        var holeSize = getOne(el, 'holeSize');
        var firstSliceAng = getOne(el, 'firstSliceAng');
        return {
            grouping: grouping ? grouping.getAttribute('val') : 'standard',
            barDirection: barDir ? barDir.getAttribute('val') : 'col',
            gapWidth: gapWidth ? parseInt(gapWidth.getAttribute('val'), 10) : 150,
            overlap: overlap ? parseInt(overlap.getAttribute('val'), 10) : -27,
            varyColors: varyColors ? readBool(varyColors, false) : false,
            holeSize: holeSize ? parseInt(holeSize.getAttribute('val'), 10) : 50,
            firstSliceAng: firstSliceAng ? parseInt(firstSliceAng.getAttribute('val'), 10) : 0
        };
    }

    var MAX_CHART_ELS = 16;
    function collectChartElements(doc) {
        var typeNames = ['barChart', 'lineChart', 'pieChart', 'doughnutChart',
                         'areaChart', 'bar3DChart', 'line3DChart', 'pie3DChart', 'area3DChart',
                         'ofPieChart', 'scatterChart', 'radarChart'];
        var chartEls = [];
        for (var t = 0; t < typeNames.length && chartEls.length < MAX_CHART_ELS; t++) {
            var found = getAll(doc, typeNames[t]);
            for (var i = 0; i < found.length && chartEls.length < MAX_CHART_ELS; i++) {
                chartEls.push({ type: typeNames[t], el: found[i] });
            }
        }
        return chartEls;
    }

    function readChartTitleWithFallback(doc, themeColors) {
        var titleEl = getOne(doc, 'title');
        var title = readChartTitleEl(titleEl, themeColors);
        if (title && !title.text) {
            title.text = getChartTitle(doc);
        }
        var titleAutoHide = getOne(doc, 'autoTitleDeleted');
        if (titleAutoHide && readBool(titleAutoHide, false) && title) {
            title.hidden = true;
        }
        return title;
    }

    function collectAxisIds(catAxes, valAxes, dateAxes) {
        var axisById = Object.create(null);
        var groups = [catAxes, valAxes, dateAxes];
        for (var g = 0; g < groups.length; g++) {
            for (var i = 0; i < groups[g].length; i++) {
                var ce = getOne(groups[g][i], 'axId');
                if (ce) {
                    axisById[ce.getAttribute('val')] = groups[g][i];
                }
            }
        }
        return axisById;
    }

    function readChartAxes(plotArea, themeColors) {
        var catAxes = plotArea ? getAll(plotArea, 'catAx') : [];
        var valAxes = plotArea ? getAll(plotArea, 'valAx') : [];
        var dateAxes = plotArea ? getAll(plotArea, 'dateAx') : [];
        function pickAxisByPos(els, pos) {
            for (var ai = 0; ai < els.length; ai++) {
                var posEl = getOne(els[ai], 'axPos');
                if (posEl && posEl.getAttribute('val') === pos) {
                    return els[ai];
                }
            }
            return null;
        }
        var primaryValEl = pickAxisByPos(valAxes, 'l') || valAxes[0] || null;
        var secondaryValEl = pickAxisByPos(valAxes, 'r');
        if (secondaryValEl === primaryValEl) {
            secondaryValEl = null;
        }
        var secondaryAxIdEl = secondaryValEl && getOne(secondaryValEl, 'axId');
        return {
            catAxis: readAxisProps(catAxes[0] || dateAxes[0], themeColors),
            valAxis: readAxisProps(primaryValEl, themeColors),
            valAxis2: readAxisProps(secondaryValEl, themeColors),
            secondaryValAxId: secondaryAxIdEl ? secondaryAxIdEl.getAttribute('val') : null,
            axisById: collectAxisIds(catAxes, valAxes, dateAxes)
        };
    }

    function parseChartXml(doc, sheetRowsByName, currentSheetRows, themeColors) {
        var chartEls = collectChartElements(doc);
        if (!chartEls.length) {
            return [];
        }
        var title = readChartTitleWithFallback(doc, themeColors);
        var legend = readLegend(getOne(doc, 'legend'), themeColors);
        if (!getOne(doc, 'legend')) {
            legend.show = false;
        }
        var plotArea = getOne(doc, 'plotArea');
        var axes = readChartAxes(plotArea, themeColors);
        var plotLayout = readChartLayout(plotArea ? getOneDirect(plotArea, 'layout') : null);
        var chartBackground = readBackground(getOneDirect(doc.documentElement, 'spPr'), themeColors);
        var plotBackground = readBackground(plotArea ? getOneDirect(plotArea, 'spPr') : null, themeColors);
        var view3DInfo = readView3D(getOne(doc, 'view3D'));
        var resolveRef = function(refStr) {
            var range = parseCellRangeRef(refStr);
            if (!range) {
                return [];
            }
            var rows = range.sheet && sheetRowsByName[range.sheet]
                ? sheetRowsByName[range.sheet] : currentSheetRows;
            return readRangeValues(rows, range);
        };
        var sharedCtx = Object.assign({
            title, legend, chartBackground, plotBackground, view3DInfo, plotLayout,
            themeColors, resolveRef
        }, axes);
        var cartesianTypes = { barChart: 1, lineChart: 1, areaChart: 1,
                               bar3DChart: 1, line3DChart: 1, area3DChart: 1 };
        var cartesianGroups = [];
        var standaloneEntries = [];
        for (var ci = 0; ci < chartEls.length; ci++) {
            (cartesianTypes[chartEls[ci].type] ? cartesianGroups : standaloneEntries).push(chartEls[ci]);
        }
        var out = [];
        if (cartesianGroups.length) {
            out.push(buildCartesianChartObject(cartesianGroups, sharedCtx));
        }
        for (var si = 0; si < standaloneEntries.length; si++) {
            out.push(buildChartObject(standaloneEntries[si], sharedCtx));
        }
        return out;
    }

    function isSecondaryAxIdEntry(entry, secondaryValAxId) {
        if (!secondaryValAxId) {
            return false;
        }
        var axIdEls = getAll(entry.el, 'axId');
        for (var ax = 0; ax < axIdEls.length; ax++) {
            if (axIdEls[ax].getAttribute('val') === secondaryValAxId) {
                return true;
            }
        }
        return false;
    }

    function buildCartesianEntryGroup(entry, ctx, combinedSeries) {
        var built = readChartSeries(entry.el, ctx.resolveRef, ctx.themeColors);
        var opts = readChartGroupOptions(entry.el);
        var normalised = entry.type.replace('3DChart', '').replace('Chart', '');
        var useSecondary = isSecondaryAxIdEntry(entry, ctx.secondaryValAxId);
        for (var j = 0; j < built.series.length && combinedSeries.length < MAX_CHART_SERIES; j++) {
            built.series[j].seriesType = normalised;
            built.series[j].useSecondaryAxis = useSecondary;
            combinedSeries.push(built.series[j]);
        }
        return {
            opts,
            categories: built.categories,
            group: {
                type: normalised,
                series: built.series,
                opts,
                useSecondaryAxis: useSecondary
            }
        };
    }

    function buildCartesianChartObject(entries, ctx) {
        var combinedSeries = [];
        var categories = null;
        var firstOpts = null;
        var seriesGroups = [];
        for (var i = 0; i < entries.length; i++) {
            var built = buildCartesianEntryGroup(entries[i], ctx, combinedSeries);
            if (!firstOpts) {
                firstOpts = built.opts;
            }
            if (!categories && built.categories && built.categories.length) {
                ({categories} = built);
            }
            seriesGroups.push(built.group);
        }
        var primaryType = entries[0].type.replace('3DChart', '').replace('Chart', '');
        return {
            type: entries.length > 1 ? 'combo' : primaryType,
            is3D: entries.some((e) => {
                return e.type.includes('3D');
            }),
            title: ctx.title,
            legend: ctx.legend,
            catAxis: ctx.catAxis,
            valAxis: ctx.valAxis,
            valAxis2: ctx.valAxis2,
            chartBackground: ctx.chartBackground,
            plotBackground: ctx.plotBackground,
            view3D: ctx.view3DInfo,
            plotLayout: ctx.plotLayout,
            grouping: firstOpts ? firstOpts.grouping : 'standard',
            barDirection: firstOpts ? firstOpts.barDirection : 'col',
            gapWidth: firstOpts ? firstOpts.gapWidth : 150,
            overlap: firstOpts ? firstOpts.overlap : -27,
            varyColors: firstOpts ? firstOpts.varyColors : false,
            holeSize: firstOpts ? firstOpts.holeSize : 50,
            firstSliceAng: firstOpts ? firstOpts.firstSliceAng : 0,
            seriesGroups,
            series: combinedSeries,
            categories: categories || []
        };
    }

    function buildChartObject(entry, ctx) {
        var built = readChartSeries(entry.el, ctx.resolveRef, ctx.themeColors);
        var opts = readChartGroupOptions(entry.el);
        var normalised = entry.type.replace('3DChart', '').replace('Chart', '');
        return {
            type: normalised,
            is3D: entry.type.includes('3D'),
            title: ctx.title,
            legend: ctx.legend,
            catAxis: ctx.catAxis,
            valAxis: ctx.valAxis,
            chartBackground: ctx.chartBackground,
            plotBackground: ctx.plotBackground,
            view3D: ctx.view3DInfo,
            plotLayout: ctx.plotLayout,
            grouping: opts.grouping,
            barDirection: opts.barDirection,
            gapWidth: opts.gapWidth,
            overlap: opts.overlap,
            varyColors: opts.varyColors,
            holeSize: opts.holeSize,
            firstSliceAng: opts.firstSliceAng,
            series: built.series,
            categories: built.categories
        };
    }

    function readChartLayout(layoutEl) {
        if (!layoutEl) {
            return null;
        }
        var manualEl = getOne(layoutEl, 'manualLayout');
        if (!manualEl) {
            return null;
        }
        function frac(name) {
            var el = getOne(manualEl, name);
            var v = el ? parseFloat(el.getAttribute('val')) : NaN;
            return isFinite(v) ? v : null;
        }
        var targetEl = getOne(manualEl, 'layoutTarget');
        return {
            target: targetEl ? targetEl.getAttribute('val') || 'inner' : 'inner',
            x: frac('x'),
            y: frac('y'),
            w: frac('w'),
            h: frac('h')
        };
    }

    function readView3D(view3D) {
        if (!view3D) {
            return null;
        }
        var rotXEl = getOne(view3D, 'rotX');
        var rotYEl = getOne(view3D, 'rotY');
        var depthEl = getOne(view3D, 'depthPercent');
        var perspEl = getOne(view3D, 'perspective');
        return {
            rotX: rotXEl ? parseInt(rotXEl.getAttribute('val'), 10) : 15,
            rotY: rotYEl ? parseInt(rotYEl.getAttribute('val'), 10) : 20,
            depth: depthEl ? parseInt(depthEl.getAttribute('val'), 10) : 100,
            perspective: perspEl ? parseInt(perspEl.getAttribute('val'), 10) : 30
        };
    }

    async function readDrawingsForSheet(zip, sheetPath, sheetRows, themeColors) {
        var empty = { charts: [], drawings: [] };
        var rels = await findRelTarget(zip, sheetPath,
                                       '/relationships/drawing');
        if (!rels) {
            return empty;
        }
        var drawingPath = resolveRelPath(rels.dir, rels.target);
        if (!drawingPath || !zip.names.includes(drawingPath)) {
            return empty;
        }
        async function readDrawingRels(drawingDir, drawingName) {
            var maps = {
                chartIdToPath: Object.create(null),
                imageIdToPath: Object.create(null),
                hyperlinkIdToUrl: Object.create(null)
            };
            var drawingRelsPath = `${drawingDir}_rels/${drawingName}.rels`;
            if (!zip.names.includes(drawingRelsPath)) {
                return maps;
            }
            var dRels = await readXml(zip, drawingRelsPath);
            var rs = dRels.getElementsByTagName('Relationship');
            for (var i = 0; i < rs.length; i++) {
                var rid = rs[i].getAttribute('Id');
                var rt = rs[i].getAttribute('Type') || '';
                var rawTarget = rs[i].getAttribute('Target');
                if (!rid) {
                    continue;
                }
                if (rt.endsWith('/hyperlink')) {
                    maps.hyperlinkIdToUrl[rid] = rawTarget;
                }
                else if (rt.endsWith('/chart')) {
                    maps.chartIdToPath[rid] = resolveRelPath(drawingDir, rawTarget);
                }
                else if (rt.endsWith('/image')) {
                    maps.imageIdToPath[rid] = resolveRelPath(drawingDir, rawTarget);
                }
            }
            return maps;
        }
        try {
            var drawingDoc = await readXml(zip, drawingPath);
            var drawingDir = drawingPath.replace(/[^/]+$/, '');
            var drawingName = drawingPath.split('/').pop();
            var maps = await readDrawingRels(drawingDir, drawingName);
            var charts = [];
            var drawings = [];
            var MAX_DRAWINGS_PER_SHEET = 1024;
            var MAX_CHARTS_PER_SHEET = 256;
            var ctx = Object.assign({ zip, sheetRows, themeColors }, maps);
            var anchors = collectDrawingAnchors(drawingDoc);
            for (var ai = 0; ai < anchors.length; ai++) {
                if (drawings.length >= MAX_DRAWINGS_PER_SHEET
                    && charts.length >= MAX_CHARTS_PER_SHEET) {
                    break;
                }
                var anchorBox = readAnchorBox(anchors[ai]);
                var directChildren = getDirectChildren(anchors[ai]);
                for (var ci = 0; ci < directChildren.length; ci++) {
                    if (drawings.length >= MAX_DRAWINGS_PER_SHEET
                        && charts.length >= MAX_CHARTS_PER_SHEET) {
                        break;
                    }
                    await handleAnchorChild(directChildren[ci], anchorBox, ctx, charts, drawings);
                }
            }
            if (drawings.length > MAX_DRAWINGS_PER_SHEET) {
                drawings.length = MAX_DRAWINGS_PER_SHEET;
            }
            if (charts.length > MAX_CHARTS_PER_SHEET) {
                charts.length = MAX_CHARTS_PER_SHEET;
            }
            return { charts, drawings };
        }
        catch (ex) {
            return empty;
        }
    }

    async function handleAnchorChild(child, anchorBox, ctx, charts, drawings) {
        var ln = child.localName;
        if (ln === 'graphicFrame') {
            var slicerName = readSlicerFrameName(child);
            if (slicerName) {
                drawings.push({ kind: 'slicer', name: slicerName, anchor: anchorBox });
                return;
            }
            await handleChartFrame(child, anchorBox, ctx, charts);
            return;
        }
        if (ln === 'AlternateContent') {
            await handleAlternateContent(child, anchorBox, ctx, charts, drawings);
            return;
        }
        if (ln === 'sp') {
            var sp = parseShape(child, ctx.themeColors);
            if (sp) {
                sp.anchor = anchorBox;
                if (sp.hlinkId && ctx.hyperlinkIdToUrl && ctx.hyperlinkIdToUrl[sp.hlinkId]) {
                    sp.hyperlink = ctx.hyperlinkIdToUrl[sp.hlinkId];
                }
                drawings.push(sp);
            }
            return;
        }
        if (ln === 'cxnSp') {
            var cx = parseConnector(child, ctx.themeColors);
            if (cx) {
                cx.anchor = anchorBox;
                drawings.push(cx);
            }
            return;
        }
        if (ln === 'pic') {
            var pic = await parsePicture(child, ctx.imageIdToPath, ctx.zip, ctx.themeColors);
            if (pic) {
                pic.anchor = anchorBox;
                drawings.push(pic);
            }
            return;
        }
        if (ln === 'grpSp') {
            var grp = await parseGroup(child, ctx.imageIdToPath, ctx.zip, ctx.themeColors, ctx.hyperlinkIdToUrl);
            if (grp) {
                grp.anchor = anchorBox;
                drawings.push(grp);
            }
        }
    }

    async function handleAlternateContent(acEl, anchorBox, ctx, charts, drawings) {
        var kids = getDirectChildren(acEl);
        var choice = null;
        for (var i = 0; i < kids.length; i++) {
            if (kids[i].localName === 'Choice') {
                choice = kids[i];
                break;
            }
        }
        if (!choice) {
            return;
        }
        var inner = getDirectChildren(choice);
        for (var j = 0; j < inner.length; j++) {
            await handleAnchorChild(inner[j], anchorBox, ctx, charts, drawings);
        }
    }

    function readSlicerFrameName(frameEl) {
        var gData = getOne(frameEl, 'graphicData');
        if (!gData) {
            return '';
        }
        var uri = gData.getAttribute('uri') || '';
        if (!uri.includes('slicer')) {
            return '';
        }
        var nv = getOne(frameEl, 'nvGraphicFramePr');
        if (nv) {
            var cNvPr = getOne(nv, 'cNvPr');
            if (cNvPr) {
                return cNvPr.getAttribute('name') || '';
            }
        }
        var kids = getDirectChildren(gData);
        for (var i = 0; i < kids.length; i++) {
            var n = kids[i].getAttribute && kids[i].getAttribute('name');
            if (n) {
                return n;
            }
        }
        return 'Slicer';
    }

    async function handleChartFrame(frameEl, anchorBox, ctx, charts) {
        var chartRefEl = getOne(frameEl, 'chart');
        if (!chartRefEl) {
            return;
        }
        var chartRId = chartRefEl.getAttribute('r:id')
            || chartRefEl.getAttributeNS(REL_NS, 'id');
        var chartPath = ctx.chartIdToPath[chartRId];
        if (!chartPath || !ctx.zip.names.includes(chartPath)) {
            return;
        }
        var chartDoc = await readXml(ctx.zip, chartPath);
        var parsed = parseChartXml(chartDoc, {}, ctx.sheetRows, ctx.themeColors);
        for (var p = 0; p < parsed.length; p++) {
            parsed[p].anchor = anchorBox;
            charts.push(parsed[p]);
        }
    }

    function collectDrawingAnchors(drawingDoc) {
        var root = drawingDoc.documentElement;
        var anchors = [];
        if (!root) {
            return anchors;
        }
        for (var i = 0; i < root.childNodes.length; i++) {
            var n = root.childNodes[i];
            if (n.nodeType !== 1) {
                continue;
            }
            if (n.localName === 'twoCellAnchor' || n.localName === 'oneCellAnchor'
                || n.localName === 'absoluteAnchor') {
                anchors.push(n);
            }
        }
        return anchors;
    }

    function getDirectChildren(el) {
        var out = [];
        for (var i = 0; i < el.childNodes.length; i++) {
            var n = el.childNodes[i];
            if (n.nodeType === 1) {
                out.push(n);
            }
        }
        return out;
    }

    function getAllDirect(el, localName) {
        var out = [];
        for (var i = 0; i < el.childNodes.length; i++) {
            var n = el.childNodes[i];
            if (n.nodeType === 1 && n.localName === localName) {
                out.push(n);
            }
        }
        return out;
    }

    function readEmuXfrm(xfrmEl) {
        if (!xfrmEl) {
            return null;
        }
        function xyPair(el, ax, ay) {
            if (!el) {
                return null;
            }
            var o = {};
            o[ax] = parseInt(el.getAttribute(ax), 10) || 0;
            o[ay] = parseInt(el.getAttribute(ay), 10) || 0;
            return o;
        }
        var out = {};
        var off = xyPair(getOneDirect(xfrmEl, 'off'), 'x', 'y');
        var ext = xyPair(getOneDirect(xfrmEl, 'ext'), 'cx', 'cy');
        var chOff = xyPair(getOneDirect(xfrmEl, 'chOff'), 'x', 'y');
        var chExt = xyPair(getOneDirect(xfrmEl, 'chExt'), 'cx', 'cy');
        if (off) {
            out.off = off;
        }
        if (ext) {
            out.ext = ext;
        }
        if (chOff) {
            out.chOff = chOff;
        }
        if (chExt) {
            out.chExt = chExt;
        }
        var rotVal = parseInt(xfrmEl.getAttribute('rot') || '', 10);
        if (!isNaN(rotVal) && rotVal !== 0) {
            out.rot = rotVal / 60000;
        }
        if (xfrmEl.getAttribute('flipH') === '1') {
            out.flipH = true;
        }
        if (xfrmEl.getAttribute('flipV') === '1') {
            out.flipV = true;
        }
        return out;
    }

    function readShapeNvPr(nvEl) {
        var info = { name: '', descr: '', hlinkId: null };
        if (!nvEl) {
            return info;
        }
        var cNvPr = getOne(nvEl, 'cNvPr');
        if (!cNvPr) {
            return info;
        }
        info.name = cNvPr.getAttribute('name') || '';
        info.descr = cNvPr.getAttribute('descr') || '';
        var hl = getOne(cNvPr, 'hlinkClick');
        if (hl) {
            info.hlinkId = hl.getAttribute('r:id') || hl.getAttributeNS(REL_NS, 'id') || null;
        }
        return info;
    }

    function applyStyleFontRefDefaultColor(text, styleEl, themeColors) {
        if (!text || text.defaultColor || !styleEl) {
            return;
        }
        var fontRef = getOneDirect(styleEl, 'fontRef');
        if (!fontRef) {
            return;
        }
        var fontRefCol = readDrawingColor(fontRef, themeColors);
        if (fontRefCol) {
            text.defaultColor = fontRefCol;
        }
    }

    function parseShape(spEl, themeColors) {
        var spPr = getOneDirect(spEl, 'spPr');
        var nvInfo = readShapeNvPr(getOneDirect(spEl, 'nvSpPr'));
        var prstEl = spPr ? getOneDirect(spPr, 'prstGeom') : null;
        var custGeomEl = spPr ? getOneDirect(spPr, 'custGeom') : null;
        var styleEl = getOneDirect(spEl, 'style');
        var fill = spPr ? readDrawingFill(spPr, themeColors) : null;
        var line = spPr ? readDrawingLine(spPr, themeColors) : null;
        if (!line && styleEl) {
            line = readStyleLineRef(styleEl, themeColors);
        }
        if (!fill && styleEl) {
            fill = readStyleFillRef(styleEl, themeColors);
        }
        var txBody = getOneDirect(spEl, 'txBody');
        var text = txBody ? readTxBody(txBody, themeColors) : null;
        applyStyleFontRefDefaultColor(text, styleEl, themeColors);
        return {
            kind: 'shape',
            name: nvInfo.name,
            descr: nvInfo.descr,
            xfrm: spPr ? readEmuXfrm(getOneDirect(spPr, 'xfrm')) : null,
            prst: prstEl ? prstEl.getAttribute('prst') || 'rect' : custGeomEl ? 'custom' : 'rect',
            adj: prstEl ? readPrstAvLst(prstEl) : null,
            custDef: custGeomEl ? parseCustGeom(custGeomEl) : null,
            fill,
            line,
            text,
            hlinkId: nvInfo.hlinkId
        };
    }

    function parseConnector(cxnEl, themeColors) {
        var spPr = getOneDirect(cxnEl, 'spPr');
        var nv = getOneDirect(cxnEl, 'nvCxnSpPr');
        var name = '';
        var descr = '';
        if (nv) {
            var cNvPr = getOne(nv, 'cNvPr');
            if (cNvPr) {
                name = cNvPr.getAttribute('name') || '';
                descr = cNvPr.getAttribute('descr') || '';
            }
        }
        var xfrm = spPr ? readEmuXfrm(getOneDirect(spPr, 'xfrm')) : null;
        var prstEl = spPr ? getOneDirect(spPr, 'prstGeom') : null;
        var prst = prstEl ? prstEl.getAttribute('prst') || 'line' : 'line';
        var adj = prstEl ? readPrstAvLst(prstEl) : null;
        var line = spPr ? readDrawingLine(spPr, themeColors) : null;
        var styleEl = getOneDirect(cxnEl, 'style');
        if (!line && styleEl) {
            line = readStyleLineRef(styleEl, themeColors);
        }
        return {
            kind: 'shape',
            name,
            descr,
            xfrm,
            prst,
            adj,
            fill: { kind: 'none' },
            line,
            text: null
        };
    }

    function readStyleLineRef(styleEl, themeColors) {
        var lnRef = getOneDirect(styleEl, 'lnRef');
        if (!lnRef) {
            return null;
        }
        var idx = parseInt(lnRef.getAttribute('idx') || '0', 10) || 0;
        if (idx <= 0) {
            return null;
        }
        var color = readDrawingColor(lnRef, themeColors);
        if (!color) {
            return null;
        }
        var styles = themeColors && themeColors.lineStyles;
        var widthEmu = 6350;
        if (styles && styles[idx - 1] && styles[idx - 1].w) {
            widthEmu = styles[idx - 1].w;
        }
        else if (idx === 2) {
            widthEmu = 12700;
        }
        else if (idx === 3) {
            widthEmu = 19050;
        }
        var px = Math.max(1, Math.round(widthEmu / EMU_PER_PX));
        return { width: px, color };
    }

    function readStyleFillRef(styleEl, themeColors) {
        var fillRef = getOneDirect(styleEl, 'fillRef');
        if (!fillRef) {
            return null;
        }
        var idx = parseInt(fillRef.getAttribute('idx') || '0', 10) || 0;
        if (idx <= 0) {
            return null;
        }
        var color = readDrawingColor(fillRef, themeColors);
        if (!color) {
            return null;
        }
        return { kind: 'solid', color };
    }

    function readPrstAvLst(prstEl) {
        var avLst = getOneDirect(prstEl, 'avLst');
        if (!avLst) {
            return null;
        }
        var out = null;
        var kids = avLst.childNodes;
        for (var i = 0; i < kids.length; i++) {
            var k = kids[i];
            if (k.nodeType !== 1 || k.localName !== 'gd') {
                continue;
            }
            var n = k.getAttribute('name');
            var fmla = k.getAttribute('fmla');
            if (!n || !fmla) {
                continue;
            }
            var parts = fmla.trim().split(/\s+/);
            if (parts[0] === 'val' && parts.length >= 2) {
                var v = parseFloat(parts[1]);
                if (!isNaN(v)) {
                    if (!out) {
                        out = Object.create(null);
                    }
                    out[n] = v;
                }
            }
        }
        return out;
    }

    async function parsePicture(picEl, imageIdToPath, zip, themeColors) {
        var spPr = getOneDirect(picEl, 'spPr');
        var blipFill = getOneDirect(picEl, 'blipFill');
        var nv = getOneDirect(picEl, 'nvPicPr');
        var name = '';
        var descr = '';
        if (nv) {
            var cNvPr = getOne(nv, 'cNvPr');
            if (cNvPr) {
                name = cNvPr.getAttribute('name') || '';
                descr = cNvPr.getAttribute('descr') || '';
            }
        }
        var xfrm = spPr ? readEmuXfrm(getOneDirect(spPr, 'xfrm')) : null;
        var dataUrl = '';
        if (blipFill) {
            var blip = getOne(blipFill, 'blip');
            if (blip) {
                var rid = blip.getAttribute('r:embed')
                    || blip.getAttributeNS(REL_NS, 'embed');
                var imgPath = imageIdToPath[rid];
                if (imgPath && zip.names.includes(imgPath)) {
                    dataUrl = await loadImageAsDataUrl(zip, imgPath);
                }
            }
        }
        var fill = spPr ? readDrawingFill(spPr, themeColors) : null;
        var line = spPr ? readDrawingLine(spPr, themeColors) : null;
        return {
            kind: 'picture',
            name,
            descr,
            xfrm,
            dataUrl,
            fill,
            line
        };
    }

    var MAX_GROUP_DEPTH = 64;
    var MAX_GROUP_CHILDREN = 256;
    async function parseGroup(grpEl, imageIdToPath, zip, themeColors, hyperlinkIdToUrl, depth = 0) {
        if (depth > MAX_GROUP_DEPTH) {
            return null;
        }
        var grpSpPr = getOneDirect(grpEl, 'grpSpPr');
        var xfrm = grpSpPr ? readEmuXfrm(getOneDirect(grpSpPr, 'xfrm')) : null;
        var nv = getOneDirect(grpEl, 'nvGrpSpPr');
        var cNvPr = nv ? getOne(nv, 'cNvPr') : null;
        var name = cNvPr ? cNvPr.getAttribute('name') || '' : '';
        async function parseChild(k) {
            var ln = k.localName;
            if (ln === 'sp') {
                var sp = parseShape(k, themeColors);
                if (sp && sp.hlinkId && hyperlinkIdToUrl && hyperlinkIdToUrl[sp.hlinkId]) {
                    sp.hyperlink = hyperlinkIdToUrl[sp.hlinkId];
                }
                return sp;
            }
            if (ln === 'cxnSp') {
                return parseConnector(k, themeColors);
            }
            if (ln === 'pic') {
                return parsePicture(k, imageIdToPath, zip, themeColors);
            }
            if (ln === 'grpSp') {
                return parseGroup(k, imageIdToPath, zip, themeColors, hyperlinkIdToUrl, depth + 1);
            }
            return null;
        }
        var children = [];
        var kids = getDirectChildren(grpEl);
        for (var i = 0; i < kids.length && children.length < MAX_GROUP_CHILDREN; i++) {
            var child = await parseChild(kids[i]);
            if (child) {
                children.push(child);
            }
        }
        return {
            kind: 'group',
            name,
            xfrm,
            children
        };
    }

    function readDrawingFill(spPr, themeColors) {
        var kids = getDirectChildren(spPr);
        for (var i = 0; i < kids.length; i++) {
            var k = kids[i];
            var ln = k.localName;
            if (ln === 'noFill') {
                return { kind: 'none' };
            }
            if (ln === 'solidFill') {
                var col = readDrawingColor(k, themeColors);
                if (col) {
                    return { kind: 'solid', color: col };
                }
            }
            else if (ln === 'gradFill') {
                var stops = getAll(k, 'gs');
                var colors = [];
                for (var s = 0; s < stops.length; s++) {
                    var sc = readDrawingColor(stops[s], themeColors);
                    if (sc) {
                        var posAttr = parseInt(stops[s].getAttribute('pos') || '0', 10);
                        colors.push({ pos: isNaN(posAttr) ? 0 : posAttr / 1000, color: sc });
                    }
                }
                if (colors.length) {
                    return { kind: 'gradient', stops: colors };
                }
            }
        }
        return null;
    }

    function readDrawingLine(spPr, themeColors) {
        var ln = getOneDirect(spPr, 'ln');
        if (!ln) {
            return null;
        }
        var w = parseInt(ln.getAttribute('w') || '0', 10) || 0;
        var px = w > 0 ? Math.max(1, Math.round(w / EMU_PER_PX)) : 0;
        var kids = getDirectChildren(ln);
        var color = '';
        var noFill = false;
        var headEnd = null;
        var tailEnd = null;
        for (var i = 0; i < kids.length; i++) {
            var k = kids[i];
            if (k.localName === 'noFill') {
                noFill = true;
            }
            else if (k.localName === 'solidFill') {
                color = readDrawingColor(k, themeColors);
            }
            else if (k.localName === 'headEnd') {
                headEnd = readLineEnd(k);
            }
            else if (k.localName === 'tailEnd') {
                tailEnd = readLineEnd(k);
            }
        }
        if (noFill || !color) {
            return null;
        }
        var out = { width: px || 1, color };
        if (headEnd) {
            out.headEnd = headEnd;
        }
        if (tailEnd) {
            out.tailEnd = tailEnd;
        }
        return out;
    }

    function readLineEnd(el) {
        var type = el.getAttribute('type') || 'none';
        if (type === 'none') {
            return null;
        }
        var w = el.getAttribute('w') || 'med';
        var len = el.getAttribute('len') || 'med';
        return { type, w, len };
    }

    function readDrawingColor(parent, themeColors) {
        var kids = getDirectChildren(parent);
        for (var i = 0; i < kids.length; i++) {
            var k = kids[i];
            var ln = k.localName;
            if (ln === 'srgbClr') {
                var hex = safeHex(k.getAttribute('val') || '');
                if (!hex) {
                    continue;
                }
                hex = applyColorMods(hex, k);
                return `#${  hex}`;
            }
            if (ln === 'schemeClr') {
                var rc = resolveSchemeClr(k, themeColors);
                if (rc) {
                    return rc;
                }
            }
            else if (ln === 'sysClr') {
                var lastHex = safeHex(k.getAttribute('lastClr') || '');
                if (lastHex) {
                    return `#${  applyColorMods(lastHex, k)}`;
                }
            }
            else if (ln === 'prstClr') {
                var named = k.getAttribute('val') || '';
                var prstHex = namedPrstColor(named);
                if (prstHex) {
                    return `#${  applyColorMods(prstHex, k)}`;
                }
            }
        }
        return '';
    }

    function applyColorMods(hex, el) {
        var tintEl = getOne(el, 'tint');
        var shadeEl = getOne(el, 'shade');
        var lumModEl = getOne(el, 'lumMod');
        var lumOffEl = getOne(el, 'lumOff');
        var out = hex;
        if (tintEl) {
            out = applyTint(out, parseInt(tintEl.getAttribute('val'), 10) / 100000);
        }
        if (shadeEl) {
            var shadeVal = parseInt(shadeEl.getAttribute('val'), 10) / 100000;
            out = applyTint(out, -(1 - shadeVal));
        }
        if (lumModEl || lumOffEl) {
            var mod = lumModEl ? parseInt(lumModEl.getAttribute('val'), 10) / 100000 : 1;
            var off = lumOffEl ? parseInt(lumOffEl.getAttribute('val'), 10) / 100000 : 0;
            if (off > 0) {
                out = applyTint(out, off);
            }
            else if (mod < 1) {
                var factor = Math.pow(mod, 2.5);
                out = applyTint(out, -(1 - factor));
            }
        }
        return safeHex(out) || hex;
    }

    function namedPrstColor(name) {
        var TABLE = {
            black: '000000', white: 'FFFFFF', red: 'FF0000', green: '008000',
            blue: '0000FF', yellow: 'FFFF00', cyan: '00FFFF', magenta: 'FF00FF',
            gray: '808080', orange: 'FFA500'
        };
        return TABLE[name] || '';
    }

    function readTxBody(txBody, themeColors) {
        var bodyPr = getOneDirect(txBody, 'bodyPr');
        var anchor = 't';
        var wrap = 'square';
        var horzOverflow = '';
        var vertOverflow = '';
        if (bodyPr) {
            anchor = bodyPr.getAttribute('anchor') || 't';
            wrap = bodyPr.getAttribute('wrap') || 'square';
            horzOverflow = bodyPr.getAttribute('horzOverflow') || '';
            vertOverflow = bodyPr.getAttribute('vertOverflow') || '';
        }
        var defaultColor = '';
        var lstStyle = getOneDirect(txBody, 'lstStyle');
        if (lstStyle) {
            var lvl1 = getOneDirect(lstStyle, 'lvl1pPr') || getOneDirect(lstStyle, 'defPPr');
            if (lvl1) {
                var defRPr = getOneDirect(lvl1, 'defRPr');
                if (defRPr) {
                    var solid = getOneDirect(defRPr, 'solidFill');
                    if (solid) {
                        defaultColor = readDrawingColor(solid, themeColors) || '';
                    }
                }
            }
        }
        var paragraphs = [];
        var pNodes = getAllDirect(txBody, 'p');
        for (var i = 0; i < pNodes.length; i++) {
            paragraphs.push(readTxParagraph(pNodes[i], themeColors));
        }
        return { anchor, wrap, horzOverflow, vertOverflow, paragraphs, defaultColor };
    }

    function readTxParagraph(pEl, themeColors) {
        var pPr = getOneDirect(pEl, 'pPr');
        var algn = pPr ? pPr.getAttribute('algn') || 'l' : 'l';
        var runs = [];
        var kids = getDirectChildren(pEl);
        for (var i = 0; i < kids.length; i++) {
            var k = kids[i];
            var ln = k.localName;
            if (ln === 'r' || ln === 'fld') {
                var run = readTxRun(k, themeColors);
                if (run) {
                    runs.push(run);
                }
            }
            else if (ln === 'br') {
                runs.push({ text: '\n', font: null });
            }
        }
        return { algn, runs };
    }

    function readTxRun(rEl, themeColors) {
        var rPr = getOneDirect(rEl, 'rPr');
        var tEl = getOneDirect(rEl, 't');
        var text = tEl ? tEl.textContent : '';
        var font = null;
        if (rPr) {
            font = {};
            var sz = rPr.getAttribute('sz');
            if (sz) {
                font.size = parseInt(sz, 10) / 100;
            }
            if (rPr.getAttribute('b') === '1') {
                font.bold = true;
            }
            if (rPr.getAttribute('i') === '1') {
                font.italic = true;
            }
            var u = rPr.getAttribute('u');
            if (u && u !== 'none') {
                font.underline = true;
            }
            var latin = getOneDirect(rPr, 'latin');
            if (latin) {
                var tf = latin.getAttribute('typeface') || '';
                if (tf && tf.charAt(0) !== '+') {
                    font.name = tf;
                }
            }
            var solid = getOneDirect(rPr, 'solidFill');
            if (solid) {
                var col = readDrawingColor(solid, themeColors);
                if (col) {
                    font.color = col;
                }
            }
        }
        return { text, font };
    }

    var BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

    function bytesToBase64(bytes) {
        var result = '';
        var len = bytes.length;
        var i;
        for (i = 0; i + 2 < len; i += 3) {
            var b0 = bytes[i];
            var b1 = bytes[i + 1];
            var b2 = bytes[i + 2];
            result += BASE64_CHARS[b0 >> 2];
            result += BASE64_CHARS[(b0 & 0x03) << 4 | b1 >> 4];
            result += BASE64_CHARS[(b1 & 0x0F) << 2 | b2 >> 6];
            result += BASE64_CHARS[b2 & 0x3F];
        }
        if (i < len) {
            var c0 = bytes[i];
            result += BASE64_CHARS[c0 >> 2];
            if (i + 1 < len) {
                var c1 = bytes[i + 1];
                result += BASE64_CHARS[(c0 & 0x03) << 4 | c1 >> 4];
                result += BASE64_CHARS[(c1 & 0x0F) << 2];
                result += '=';
            }
            else {
                result += BASE64_CHARS[(c0 & 0x03) << 4];
                result += '==';
            }
        }
        return result;
    }

    function mimeForImage(path) {
        var ext = (path.split('.').pop() || '').toLowerCase();
        if (ext === 'png') {
            return 'image/png';
        }
        if (ext === 'jpg' || ext === 'jpeg') {
            return 'image/jpeg';
        }
        if (ext === 'gif') {
            return 'image/gif';
        }
        if (ext === 'svg') {
            return 'image/svg+xml';
        }
        if (ext === 'webp') {
            return 'image/webp';
        }
        if (ext === 'bmp') {
            return 'image/bmp';
        }
        return '';
    }

    var MAX_INLINE_IMAGE_BYTES = 25 * 1024 * 1024;
    var MAX_TOTAL_IMG_BYTES = 80 * 1024 * 1024;
    const SVG_DROP_TAGS = freeze({
        animate: 1, animatemotion: 1, animatetransform: 1, audio: 1,
        discard: 1, embed: 1, foreignobject: 1, handler: 1, iframe: 1,
        listener: 1, object: 1, script: 1, set: 1, shadow: 1,
        template: 1, use: 1, video: 1
    });
    const SVG_URL_ATTRS = freeze({href: 1, src: 1});

    function svgUrlIsSafe(value) {
        if ((value = (typeof value === 'string' && value || '').trim())) {

            if (value[0] === '#') {
                return /^#[\w-]+$/.test(value);
            }
            const u = new URL(value, "https://example.org");

            if (u.protocol === 'data:') {
                return /^data:image\/(?:png|jpe?g|gif|webp|bmp)[,;]/i.test(u.href);
            }

            if (u.protocol === 'http:' || u.protocol === 'https:') {
                return !u.pathname.toLowerCase().endsWith('.svg');
            }
        }
        return false;
    }

    function sanitizeSvgElement(el) {
        var attrs = el.attributes;
        var drop = [];
        var i;
        for (i = 0; i < attrs.length; i++) {
            var attr = attrs[i];
            var name = (attr.localName || attr.name || '').toLowerCase();
            if (name.indexOf('on') === 0
                || SVG_URL_ATTRS[name] && !svgUrlIsSafe(attr.value)) {
                drop.push(attr);
            }
        }
        for (i = 0; i < drop.length; i++) {
            el.removeAttributeNode(drop[i]);
        }
        var children = [];
        for (var node = el.firstChild; node; node = node.nextSibling) {
            children.push(node);
        }
        for (i = 0; i < children.length; i++) {
            var child = children[i];
            if (child.nodeType !== 1) {
                continue;
            }
            if (SVG_DROP_TAGS[(child.localName || child.nodeName || '').toLowerCase()]) {
                el.removeChild(child);
            }
            else {
                sanitizeSvgElement(child);
            }
        }
    }

    function sanitizeSvgBytes(bytes) {
        try {
            var text = new TextDecoder('utf-8').decode(bytes);
            var doc = new DOMParser().parseFromString(text, 'image/svg+xml');
            var root = doc && doc.documentElement;
            if (!root
                || xmlHasError(doc)
                || (root.localName || '').toLowerCase() !== 'svg') {
                return null;
            }
            sanitizeSvgElement(root);
            return new TextEncoder().encode(new XMLSerializer().serializeToString(root));
        }
        catch (ex) {
            return null;
        }
    }

    async function loadImageAsDataUrl(zip, path) {
        try {
            var mime = mimeForImage(path);
            if (!mime) {
                return '';
            }
            if (!zip._imageDataUrlCache) {
                zip._imageDataUrlCache = Object.create(null);
                zip._imageDataUrlTotalBytes = 0;
            }
            if (Object.prototype.hasOwnProperty.call(zip._imageDataUrlCache, path)) {
                return zip._imageDataUrlCache[path];
            }
            if (zip._imageDataUrlTotalBytes >= MAX_TOTAL_IMG_BYTES) {
                zip._imageDataUrlCache[path] = '';
                return '';
            }
            var bytes = await zip.extract(path);
            if (!bytes || bytes.byteLength > MAX_INLINE_IMAGE_BYTES) {
                zip._imageDataUrlCache[path] = '';
                return '';
            }
            if (mime === 'image/svg+xml') {
                bytes = sanitizeSvgBytes(bytes);
                if (!bytes) {
                    zip._imageDataUrlCache[path] = '';
                    return '';
                }
            }
            var dataUrl = `data:${mime};base64,${bytesToBase64(bytes)}`;
            if (zip._imageDataUrlTotalBytes + dataUrl.length > MAX_TOTAL_IMG_BYTES) {
                zip._imageDataUrlCache[path] = '';
                return '';
            }
            zip._imageDataUrlTotalBytes += dataUrl.length;
            zip._imageDataUrlCache[path] = dataUrl;
            return dataUrl;
        }
        catch (ex) {
            return '';
        }
    }

    function readAnchorBox(anchorEl) {
        var fromEl = getOneDirect(anchorEl, 'from');
        var toEl = getOneDirect(anchorEl, 'to');
        var extEl = getOneDirect(anchorEl, 'ext');
        var posEl = getOneDirect(anchorEl, 'pos');
        var from = readAnchorPoint(fromEl);
        var to = readAnchorPoint(toEl);
        var ext = null;
        if (extEl) {
            ext = {
                cx: parseInt(extEl.getAttribute('cx'), 10) || 0,
                cy: parseInt(extEl.getAttribute('cy'), 10) || 0
            };
        }
        var pos = null;
        if (posEl) {
            pos = {
                x: parseInt(posEl.getAttribute('x'), 10) || 0,
                y: parseInt(posEl.getAttribute('y'), 10) || 0
            };
        }
        return { from, to, ext, pos };
    }

    function readAnchorPoint(el) {
        if (!el) {
            return null;
        }
        var col = getOne(el, 'col');
        var colOff = getOne(el, 'colOff');
        var row = getOne(el, 'row');
        var rowOff = getOne(el, 'rowOff');
        return {
            col: col ? parseInt(col.textContent, 10) || 0 : 0,
            colOff: colOff ? parseInt(colOff.textContent, 10) || 0 : 0,
            row: row ? parseInt(row.textContent, 10) || 0 : 0,
            rowOff: rowOff ? parseInt(rowOff.textContent, 10) || 0 : 0
        };
    }

    function detectDelimiter(firstLine) {
        var counts = {
            ',': (firstLine.match(/,/g) || []).length,
            ';': (firstLine.match(/;/g) || []).length,
            '\t': (firstLine.match(/\t/g) || []).length
        };
        var best = ',';
        var bestN = counts[','];
        if (counts[';'] > bestN) {
            best = ';'; bestN = counts[';'];
        }
        if (counts['\t'] > bestN) {
            best = '\t';
        }
        return best;
    }

    function decodeCsvBytes(buffer) {
        var bytes = new Uint8Array(buffer);
        try {
            return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        }
        catch (ex) {
            return new TextDecoder('windows-1252').decode(bytes);
        }
    }

    function parseCsv(buffer) {
        var text = decodeCsvBytes(buffer);
        if (text.charCodeAt(0) === 0xFEFF) {
            text = text.slice(1);
        }

        var firstLineEnd = text.search(/[\n\r]/);
        var firstLine = firstLineEnd < 0 ? text : text.slice(0, firstLineEnd);
        var delim = detectDelimiter(firstLine);

        var MAX_CSV_FIELD_LEN = 64 * 1024;
        var rows = [];
        var row = [];
        var field = '';
        var inQuotes = false;
        var i = 0;
        var n = text.length;
        var cellCount = 0;
        var truncated = false;

        function pushChar(ch) {
            if (field.length >= MAX_CSV_FIELD_LEN) {
                return;
            }
            field += ch;
        }

        while (i < n) {
            var ch = text[i];
            if (inQuotes) {
                if (ch === '"') {
                    if (text[i + 1] === '"') {
                        pushChar('"');
                        i += 2;
                    }
                    else {
                        inQuotes = false;
                        i++;
                    }
                }
                else {
                    pushChar(ch);
                    i++;
                }
            }
            else if (ch === '"' && field === '') {
                inQuotes = true;
                i++;
            }
            else if (ch === delim) {
                row.push(field);
                field = '';
                i++;
                cellCount++;
            }
            else if (ch === '\r' || ch === '\n') {
                row.push(field);
                rows.push(row);
                cellCount++;
                row = [];
                field = '';
                if (ch === '\r' && text[i + 1] === '\n') {
                    i += 2;
                }
                else {
                    i++;
                }
                if (cellCount >= MAX_CELLS_PER_SHEET) {
                    truncated = true;
                    break;
                }
            }
            else {
                pushChar(ch);
                i++;
            }
        }
        if (!truncated && (field !== '' || row.length > 0)) {
            row.push(field);
            rows.push(row);
        }

        var cellStyles = rows.map((r) => r.map(() => 0));
        return {
            sheets: [{
                name: 'Sheet1',
                rows,
                cellStyles,
                merges: [],
                colWidths: [],
                rowHeights: [],
                defaultColWidth: null,
                defaultRowHeight: null,
                charts: [],
                truncated
            }],
            styleTable: []
        };
    }

    function formatNumber(value, code) {
        if (typeof value !== 'number' || !code || code === 'General' || code === '@') {
            return value;
        }
        var c = code.replace(/\[[^\]]*]/g, '');
        var section = c.split(';')[0];
        section = section.replace(/_./g, '').replace(/\*./g, '');
        var isPercent = section.includes('%');
        var v = isPercent ? value * 100 : value;
        var hasThousand = /#,##/.test(section);
        var decMatch = /\.(0+)/.exec(section);
        var decimals = decMatch ? decMatch[1].length : 0;
        var prefixMatch = /^([^#%,.0?]*)/.exec(section);
        var suffixMatch = /([^#%,.0?]*)$/.exec(section);
        var prefix = (prefixMatch && prefixMatch[1] || '').replace(/["\\]/g, '');
        var suffix = (suffixMatch && suffixMatch[1] || '').replace(/["\\]/g, '');
        if (isPercent) {
            suffix = `${suffix  }%`.replace(/%%$/, '%');
        }
        var sign = v < 0 ? '-' : '';
        var abs = Math.abs(v);
        var body = decimals > 0 ? abs.toFixed(decimals) : String(Math.round(abs));
        if (hasThousand) {
            var dot = body.indexOf('.');
            var intPart = dot >= 0 ? body.slice(0, dot) : body;
            var fracPart = dot >= 0 ? body.slice(dot) : '';
            intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            body = intPart + fracPart;
        }
        return prefix + sign + body + suffix;
    }

    async function parseSpreadsheet(buffer, ext) {
        var e = (ext || '').toLowerCase();
        if (!buffer || buffer.byteLength === 0) {
            return {
                sheets: [{
                    name: 'Sheet1',
                    rows: [], cellStyles: [], merges: [], colWidths: [],
                    rowHeights: [], defaultColWidth: null, defaultRowHeight: null,
                    charts: [], drawings: [], truncated: false
                }],
                styleTable: [], dxfs: [], tableStyles: {}, defaultFont: null
            };
        }
        if (e === 'csv') {
            return parseCsv(buffer);
        }
        return parseXlsx(buffer);
    }

    function evaluateFormula(formula, sheet, baseR, baseC, currR, currC) {
        var tokens = tokenizeFormula(formula);
        var dR = currR - baseR;
        var dC = currC - baseC;
        var ctx = { tokens, pos: 0, sheet, dR, dC };
        return parseComparison(ctx);
    }

    function readFormulaIdentifier(s, i) {
        var start = i;
        while (i < s.length && /[\w.]/.test(s[i])) {
            i++;
        }
        var word = s.slice(start, i);
        var refMatch = /^\$?([a-z]+)\$?(\d+)$/i.exec(word);
        var token = refMatch
            ? {
                type: 'ref',
                col: colRefToIndex(refMatch[1].toUpperCase()),
                row: parseInt(refMatch[2], 10) - 1
            }
            : { type: 'name', val: word.toUpperCase() };
        return { token, next: i };
    }

    function readFormulaNumber(s, i) {
        var nstart = i;
        while (i < s.length && /[\d.]/.test(s[i])) {
            i++;
        }
        return { token: { type: 'num', val: parseFloat(s.slice(nstart, i)) }, next: i };
    }

    function readFormulaString(s, i) {
        i++;
        var sstart = i;
        while (i < s.length && s[i] !== '"') {
            i++;
        }
        return { token: { type: 'str', val: s.slice(sstart, i) }, next: i + 1 };
    }

    function tokenizeFormula(s) {
        var tokens = [];
        var i = 0;
        while (i < s.length) {
            var ch = s[i];
            if (ch === ' ' || ch === '\t' || ch === '\n') {
                i++;
                continue;
            }
            if (/[A-Z_a-z]/.test(ch)) {
                var ident = readFormulaIdentifier(s, i);
                tokens.push(ident.token);
                i = ident.next;
                continue;
            }
            if (/\d/.test(ch) || ch === '.' && /\d/.test(s[i + 1])) {
                var num = readFormulaNumber(s, i);
                tokens.push(num.token);
                i = num.next;
                continue;
            }
            if (ch === '"') {
                var str = readFormulaString(s, i);
                tokens.push(str.token);
                i = str.next;
                continue;
            }
            var two = i + 1 < s.length ? s.slice(i, i + 2) : '';
            if (two === '>=' || two === '<=' || two === '<>') {
                tokens.push({ type: 'op', val: two });
                i += 2;
                continue;
            }
            if ('+-*/(),><=&%^$'.includes(ch)) {
                tokens.push({ type: 'op', val: ch });
                i++;
                continue;
            }
            i++;
        }
        return tokens;
    }

    function peekToken(ctx) {
        return ctx.tokens[ctx.pos];
    }
    function consumeToken(ctx) {
        return ctx.tokens[ctx.pos++];
    }
    function matchOp(ctx, val) {
        var t = peekToken(ctx);
        if (t && t.type === 'op' && t.val === val) {
            ctx.pos++;
            return true;
        }
        return false;
    }

    var MAX_FORMULA_DEPTH = 256;
    function parseComparison(ctx) {
        ctx.depth = (ctx.depth || 0) + 1;
        if (ctx.depth > MAX_FORMULA_DEPTH) {
            ctx.depth--;
            throw new Error('Formula recursion too deep');
        }
        var result;
        var left = parseConcat(ctx);
        var t = peekToken(ctx);
        if (t && t.type === 'op' && /^(>|<|>=|<=|=|<>)$/.test(t.val)) {
            consumeToken(ctx);
            var right = parseConcat(ctx);
            var l = coerceNumLike(left);
            var r = coerceNumLike(right);
            switch (t.val) {
                case '>': result = l > r; break;
                case '<': result = l < r; break;
                case '>=': result = l >= r; break;
                case '<=': result = l <= r; break;
                case '=': result = l === r; break;
                case '<>': result = l !== r; break;
            }
        }
        else {
            result = left;
        }
        ctx.depth--;
        return result;
    }

    function parseConcat(ctx) {
        var left = parseAdd(ctx);
        while (peekToken(ctx) && peekToken(ctx).type === 'op' && peekToken(ctx).val === '&') {
            consumeToken(ctx);
            var right = parseAdd(ctx);
            left = String(left === null || left === undefined ? '' : left)
                + String(right === null || right === undefined ? '' : right);
        }
        return left;
    }

    function parseAdd(ctx) {
        var left = parseMul(ctx);
        while (peekToken(ctx) && peekToken(ctx).type === 'op'
               && (peekToken(ctx).val === '+' || peekToken(ctx).val === '-')) {
            var op = consumeToken(ctx).val;
            var right = parseMul(ctx);
            var ln = +coerceNumLike(left);
            var rn = +coerceNumLike(right);
            left = op === '+' ? ln + rn : ln - rn;
        }
        return left;
    }

    function parseMul(ctx) {
        var left = parseUnary(ctx);
        while (peekToken(ctx) && peekToken(ctx).type === 'op'
               && (peekToken(ctx).val === '*' || peekToken(ctx).val === '/')) {
            var op = consumeToken(ctx).val;
            var right = parseUnary(ctx);
            var ln = +coerceNumLike(left);
            var rn = +coerceNumLike(right);
            left = op === '*' ? ln * rn : rn === 0 ? null : ln / rn;
        }
        return left;
    }

    function parseUnary(ctx) {
        var t = peekToken(ctx);
        if (t && t.type === 'op' && (t.val === '-' || t.val === '+')) {
            consumeToken(ctx);
            var v = parseUnary(ctx);
            return t.val === '-' ? -+coerceNumLike(v) : +coerceNumLike(v);
        }
        return parsePrimary(ctx);
    }

    function parsePrimary(ctx) {
        var t = peekToken(ctx);
        if (!t) {
            return null;
        }
        if (t.type === 'num') {
            consumeToken(ctx);
            return t.val;
        }
        if (t.type === 'str') {
            consumeToken(ctx);
            return t.val;
        }
        if (t.type === 'ref') {
            consumeToken(ctx);
            var r = t.row + ctx.dR;
            var c = t.col + ctx.dC;
            var rowArr = ctx.sheet.rows[r];
            if (!rowArr) {
                return null;
            }
            var v = rowArr[c];
            return v === undefined ? null : v;
        }
        if (t.type === 'name') {
            var name = consumeToken(ctx).val;
            if (name === 'TRUE') {
                return true;
            }
            if (name === 'FALSE') {
                return false;
            }
            if (matchOp(ctx, '(')) {
                var args = [];
                if (!(peekToken(ctx) && peekToken(ctx).type === 'op' && peekToken(ctx).val === ')')) {
                    args.push(parseComparison(ctx));
                    while (matchOp(ctx, ',')) {
                        args.push(parseComparison(ctx));
                    }
                }
                matchOp(ctx, ')');
                return callFunction(name, args);
            }
            return null;
        }
        if (t.type === 'op' && t.val === '(') {
            consumeToken(ctx);
            var v2 = parseComparison(ctx);
            matchOp(ctx, ')');
            return v2;
        }
        consumeToken(ctx);
        return null;
    }

    function coerceNumLike(v) {
        if (typeof v === 'number') {
            return v;
        }
        if (typeof v === 'boolean') {
            return v ? 1 : 0;
        }
        if (v === null || v === undefined || v === '') {
            return 0;
        }
        var n = parseFloat(v);
        return isNaN(n) ? v : n;
    }

    function serialToParts(v) {
        if (typeof v !== 'number') {
            v = parseFloat(v);
        }
        if (!isFinite(v)) {
            return null;
        }
        var d = excelSerialToDate(v);
        if (!d) {
            return null;
        }
        return {
            year: d.getUTCFullYear(),
            month: d.getUTCMonth() + 1,
            day: d.getUTCDate(),
            weekday: d.getUTCDay()
        };
    }

    var FORMULA_FUNCS = {
        DAY(args) {
            var p = serialToParts(args[0]); return p ? p.day : null;
        },
        MONTH(args) {
            var p = serialToParts(args[0]); return p ? p.month : null;
        },
        YEAR(args) {
            var p = serialToParts(args[0]); return p ? p.year : null;
        },
        WEEKDAY(args) {
            var p = serialToParts(args[0]); return p ? p.weekday + 1 : null;
        },
        AND(args) {
            return args.every(truthy);
        },
        OR(args) {
            return args.some(truthy);
        },
        NOT(args) {
            return !truthy(args[0]);
        },
        IF(args) {
            return truthy(args[0]) ? args[1] : args.length > 2 ? args[2] : false;
        },
        ISBLANK(args) {
            return args[0] === null || args[0] === undefined || args[0] === '';
        },
        ISNUMBER(args) {
            return typeof args[0] === 'number' && isFinite(args[0]);
        },
        LEN(args) {
            return args[0] === null || args[0] === undefined ? 0 : String(args[0]).length;
        },
        ABS(args) {
            return Math.abs(+coerceNumLike(args[0]));
        },
        INT(args) {
            return Math.floor(+coerceNumLike(args[0]));
        },
        ROUND(args) {
            return Number(Number(args[0]).toFixed(args[1] || 0));
        },
        MIN(args) {
            return Math.min.apply(null, args.map((a) => +coerceNumLike(a)));
        },
        MAX(args) {
            return Math.max.apply(null, args.map((a) => +coerceNumLike(a)));
        }
    };

    function callFunction(name, args) {
        var fn = FORMULA_FUNCS[name];
        return fn ? fn(args) : null;
    }

    function truthy(v) {
        return !(v === null || v === undefined || v === '' || v === 0 || v === false);
    }

    function safeCssColor(v) {
        if (typeof v !== 'string') {
            return '';
        }
        const m = /^#([\dA-Fa-f]{6})$/.exec(v);
        return m ? `#${m[1].toUpperCase()}` : '';
    }

    const PRESET_BUILTINS = {
        l: () => 0,
        t: () => 0,
        r: (ctx) => ctx.w,
        b: (ctx) => ctx.h,
        w: (ctx) => ctx.w,
        h: (ctx) => ctx.h,
        hc: (ctx) => ctx.w / 2,
        vc: (ctx) => ctx.h / 2,
        wd2: (ctx) => ctx.w / 2,
        hd2: (ctx) => ctx.h / 2,
        wd3: (ctx) => ctx.w / 3,
        hd3: (ctx) => ctx.h / 3,
        wd4: (ctx) => ctx.w / 4,
        hd4: (ctx) => ctx.h / 4,
        wd5: (ctx) => ctx.w / 5,
        hd5: (ctx) => ctx.h / 5,
        wd6: (ctx) => ctx.w / 6,
        hd6: (ctx) => ctx.h / 6,
        wd8: (ctx) => ctx.w / 8,
        hd8: (ctx) => ctx.h / 8,
        wd10: (ctx) => ctx.w / 10,
        wd12: (ctx) => ctx.w / 12,
        wd16: (ctx) => ctx.w / 16,
        wd32: (ctx) => ctx.w / 32,
        ss: (ctx) => Math.min(ctx.w, ctx.h),
        ls: (ctx) => Math.max(ctx.w, ctx.h),
        ssd2: (ctx) => Math.min(ctx.w, ctx.h) / 2,
        ssd4: (ctx) => Math.min(ctx.w, ctx.h) / 4,
        ssd6: (ctx) => Math.min(ctx.w, ctx.h) / 6,
        ssd8: (ctx) => Math.min(ctx.w, ctx.h) / 8,
        ssd16: (ctx) => Math.min(ctx.w, ctx.h) / 16,
        ssd32: (ctx) => Math.min(ctx.w, ctx.h) / 32,
        cd2: () => 10800000,
        cd4: () => 5400000,
        cd8: () => 2700000,
        '3cd4': () => 16200000,
        '3cd8': () => 8100000,
        '5cd8': () => 13500000,
        '7cd8': () => 18900000
    };

    function presetResolveRef(ref, ctx) {
        if (typeof ref === 'number') {
            return ref;
        }
        if (typeof ref !== 'string') {
            return 0;
        }
        if (PRESET_BUILTINS[ref]) {
            return PRESET_BUILTINS[ref](ctx);
        }
        if (ctx.adj && Object.prototype.hasOwnProperty.call(ctx.adj, ref)) {
            return ctx.adj[ref];
        }
        if (ctx.gd && Object.prototype.hasOwnProperty.call(ctx.gd, ref)) {
            return ctx.gd[ref];
        }
        const n = Number(ref);
        if (!Number.isNaN(n)) {
            return n;
        }
        return 0;
    }

    var PRESET_OPS = {
        val: (a) => a(0),
        '+-': (a) => a(0) + a(1) - a(2),
        '+/': (a) => {
            const d = a(2); return d === 0 ? 0 : (a(0) + a(1)) / d;
        },
        '*/': (a) => {
            const d = a(2); return d === 0 ? 0 : a(0) * a(1) / d;
        },
        '?:': (a) => a(0) > 0 ? a(1) : a(2),
        abs: (a) => Math.abs(a(0)),
        at2: (a) => {
            const x = a(0);
            const y = a(1);
            return x === 0 && y === 0 ? 0 : Math.atan2(y, x) * 60000 * 180 / Math.PI;
        },
        cat2: (a) => a(0) * Math.cos(Math.atan2(a(2), a(1))),
        sat2: (a) => a(0) * Math.sin(Math.atan2(a(2), a(1))),
        cos: (a) => a(0) * Math.cos(a(1) * Math.PI / (60000 * 180)),
        sin: (a) => a(0) * Math.sin(a(1) * Math.PI / (60000 * 180)),
        tan: (a) => a(0) * Math.tan(a(1) * Math.PI / (60000 * 180)),
        max: (a) => Math.max(a(0), a(1)),
        min: (a) => Math.min(a(0), a(1)),
        mod: (a) => Math.hypot(a(0), a(1), a(2)),
        pin: (a) => Math.min(Math.max(a(0), a(1)), a(2)),
        sqrt: (a) => Math.sqrt(a(0))
    };

    function presetEvalOp(op, args, ctx) {
        const a = (i) => presetResolveRef(args[i], ctx);
        const fn = PRESET_OPS[op];
        return fn ? fn(a) : 0;
    }

    function presetBuildContext(def, shapeW, shapeH, userAdj) {
        const ctx = { w: shapeW, h: shapeH, adj: {}, gd: {} };
        if (def.av) {
            for (const k of Object.keys(def.av)) {
                ctx.adj[k] = def.av[k];
            }
        }
        if (userAdj) {
            for (const k of Object.keys(userAdj)) {
                ctx.adj[k] = userAdj[k];
            }
        }
        if (def.gd) {
            for (let i = 0; i < def.gd.length; i++) {
                const entry = def.gd[i];
                ctx.gd[entry[0]] = presetEvalOp(entry[1], entry[2], ctx);
            }
        }
        return ctx;
    }

    function presetArcToSvg(currX, currY, wR, hR, stAng, swAng) {
        const stRad = stAng * Math.PI / (60000 * 180);
        const endRad = (stAng + swAng) * Math.PI / (60000 * 180);
        const cx = currX - wR * Math.cos(stRad);
        const cy = currY - hR * Math.sin(stRad);
        const endX = cx + wR * Math.cos(endRad);
        const endY = cy + hR * Math.sin(endRad);
        const sweepDeg = swAng / 60000;
        const largeArc = Math.abs(sweepDeg) > 180 ? 1 : 0;
        const sweep = sweepDeg > 0 ? 1 : 0;
        return { d: `A ${Math.abs(wR)} ${Math.abs(hR)} 0 ${largeArc} ${sweep} ${endX} ${endY}`, x: endX, y: endY };
    }

    function presetBuildPaths(def, shapeW, shapeH, userAdj) {
        const ctx = presetBuildContext(def, shapeW, shapeH, userAdj);
        const paths = [];
        const list = def.paths || [];
        for (let pi = 0; pi < list.length; pi++) {
            const p = list[pi];
            const pathW = typeof p.w === 'number' && p.w > 0 ? p.w : shapeW;
            const pathH = typeof p.h === 'number' && p.h > 0 ? p.h : shapeH;
            const localCtx = pathW === shapeW && pathH === shapeH
                ? ctx
                : { w: pathW, h: pathH, adj: ctx.adj, gd: ctx.gd };
            const sx = shapeW / pathW;
            const sy = shapeH / pathH;
            const out = [];
            let curX = 0;
            let curY = 0;
            for (let ci = 0; ci < p.cmds.length; ci++) {
                const c = p.cmds[ci];
                const op = c[0];
                if (op === 'moveTo') {
                    const x = presetResolveRef(c[1], localCtx) * sx;
                    const y = presetResolveRef(c[2], localCtx) * sy;
                    out.push(`M ${x} ${y}`);
                    curX = x;
                    curY = y;
                }
                else if (op === 'lnTo') {
                    const x = presetResolveRef(c[1], localCtx) * sx;
                    const y = presetResolveRef(c[2], localCtx) * sy;
                    out.push(`L ${x} ${y}`);
                    curX = x;
                    curY = y;
                }
                else if (op === 'quadBezTo') {
                    const x1 = presetResolveRef(c[1], localCtx) * sx;
                    const y1 = presetResolveRef(c[2], localCtx) * sy;
                    const x = presetResolveRef(c[3], localCtx) * sx;
                    const y = presetResolveRef(c[4], localCtx) * sy;
                    out.push(`Q ${x1} ${y1} ${x} ${y}`);
                    curX = x;
                    curY = y;
                }
                else if (op === 'cubicBezTo') {
                    const x1 = presetResolveRef(c[1], localCtx) * sx;
                    const y1 = presetResolveRef(c[2], localCtx) * sy;
                    const x2 = presetResolveRef(c[3], localCtx) * sx;
                    const y2 = presetResolveRef(c[4], localCtx) * sy;
                    const x = presetResolveRef(c[5], localCtx) * sx;
                    const y = presetResolveRef(c[6], localCtx) * sy;
                    out.push(`C ${x1} ${y1} ${x2} ${y2} ${x} ${y}`);
                    curX = x;
                    curY = y;
                }
                else if (op === 'arcTo') {
                    const wR = presetResolveRef(c[1], localCtx) * sx;
                    const hR = presetResolveRef(c[2], localCtx) * sy;
                    const stAng = presetResolveRef(c[3], localCtx);
                    const swAng = presetResolveRef(c[4], localCtx);
                    const arc = presetArcToSvg(curX, curY, wR, hR, stAng, swAng);
                    out.push(arc.d);
                    curX = arc.x;
                    curY = arc.y;
                }
                else if (op === 'close') {
                    out.push('Z');
                }
            }
            paths.push({ d: out.join(' '), fill: p.fill || null, stroke: p.stroke || null });
        }
        return paths;
    }

    function presetTextRect(def, shapeW, shapeH, userAdj) {
        if (!def.rect) {
            return null;
        }
        const ctx = presetBuildContext(def, shapeW, shapeH, userAdj);
        return {
            l: presetResolveRef(def.rect.l, ctx),
            t: presetResolveRef(def.rect.t, ctx),
            r: presetResolveRef(def.rect.r, ctx),
            b: presetResolveRef(def.rect.b, ctx)
        };
    }

    function parseCustGeomFmla(fmla) {
        if (!fmla) {
            return null;
        }
        const parts = String(fmla).trim().split(/\s+/);
        if (!parts.length) {
            return null;
        }
        const op = parts[0];
        const args = parts.slice(1).map((tok) => {
            if (/^-?\d+(\.\d+)?$/.test(tok)) {
                return parseFloat(tok);
            }
            return tok;
        });
        return [op, args];
    }

    function parseCustGeomPt(ptEl) {
        if (!ptEl) {
            return [0, 0];
        }
        const x = ptEl.getAttribute('x');
        const y = ptEl.getAttribute('y');
        const px = /^-?\d+(\.\d+)?$/.test(x) ? parseFloat(x) : x;
        const py = /^-?\d+(\.\d+)?$/.test(y) ? parseFloat(y) : y;
        return [px, py];
    }

    const MAX_CUST_GEOM_GD = 256;
    const MAX_CUST_GEOM_PATHS = 64;
    const MAX_CUST_GEOM_CMDS_PER_PATH = 1024;
    function parseCustGeomGdList(custGeomEl) {
        const gd = [];
        const gdListEl = getOneDirect(custGeomEl, 'gdLst');
        if (!gdListEl) {
            return gd;
        }
        const gdEls = getAllDirect(gdListEl, 'gd');
        const gdLimit = Math.min(gdEls.length, MAX_CUST_GEOM_GD);
        for (let i = 0; i < gdLimit; i++) {
            const name = gdEls[i].getAttribute('name');
            const fmla = parseCustGeomFmla(gdEls[i].getAttribute('fmla'));
            if (name && fmla) {
                gd.push([name, fmla[0], fmla[1]]);
            }
        }
        return gd;
    }

    function parseCustGeomRectRef(v) {
        return /^-?\d+(\.\d+)?$/.test(v) ? parseFloat(v) : v;
    }

    function parseCustGeomRect(custGeomEl) {
        const rectEl = getOneDirect(custGeomEl, 'rect');
        if (!rectEl) {
            return null;
        }
        return {
            l: parseCustGeomRectRef(rectEl.getAttribute('l') || 'l'),
            t: parseCustGeomRectRef(rectEl.getAttribute('t') || 't'),
            r: parseCustGeomRectRef(rectEl.getAttribute('r') || 'r'),
            b: parseCustGeomRectRef(rectEl.getAttribute('b') || 'b')
        };
    }

    function parseCustGeomPathCmd(node) {
        const local = node.localName;
        if (local === 'moveTo' || local === 'lnTo') {
            const pt = parseCustGeomPt(getOneDirect(node, 'pt'));
            return [local, pt[0], pt[1]];
        }
        if (local === 'quadBezTo') {
            const pts = getAllDirect(node, 'pt');
            if (pts.length >= 2) {
                const p1 = parseCustGeomPt(pts[0]);
                const p2 = parseCustGeomPt(pts[1]);
                return ['quadBezTo', p1[0], p1[1], p2[0], p2[1]];
            }
            return null;
        }
        if (local === 'cubicBezTo') {
            const pts = getAllDirect(node, 'pt');
            if (pts.length >= 3) {
                const p1 = parseCustGeomPt(pts[0]);
                const p2 = parseCustGeomPt(pts[1]);
                const p3 = parseCustGeomPt(pts[2]);
                return ['cubicBezTo', p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]];
            }
            return null;
        }
        if (local === 'arcTo') {
            return [
                'arcTo',
                parseFloat(node.getAttribute('wR')) || 0,
                parseFloat(node.getAttribute('hR')) || 0,
                parseFloat(node.getAttribute('stAng')) || 0,
                parseFloat(node.getAttribute('swAng')) || 0
            ];
        }
        if (local === 'close') {
            return ['close'];
        }
        return null;
    }

    function parseCustGeomPath(pEl) {
        const cmds = [];
        for (let ci = 0; ci < pEl.childNodes.length
            && cmds.length < MAX_CUST_GEOM_CMDS_PER_PATH; ci++) {
            const node = pEl.childNodes[ci];
            if (node.nodeType !== 1) {
                continue;
            }
            const cmd = parseCustGeomPathCmd(node);
            if (cmd) {
                cmds.push(cmd);
            }
        }
        return {
            w: parseFloat(pEl.getAttribute('w')) || 0,
            h: parseFloat(pEl.getAttribute('h')) || 0,
            cmds,
            fill: pEl.getAttribute('fill') || null,
            stroke: pEl.getAttribute('stroke') === 'false' ? false : null
        };
    }

    function parseCustGeom(custGeomEl) {
        if (!custGeomEl) {
            return null;
        }
        const gd = parseCustGeomGdList(custGeomEl);
        const rect = parseCustGeomRect(custGeomEl);
        const paths = [];
        const pathListEl = getOneDirect(custGeomEl, 'pathLst');
        if (pathListEl) {
            const pathEls = getAllDirect(pathListEl, 'path');
            const pathLimit = Math.min(pathEls.length, MAX_CUST_GEOM_PATHS);
            for (let pi = 0; pi < pathLimit; pi++) {
                paths.push(parseCustGeomPath(pathEls[pi]));
            }
        }
        return { av: {}, gd, paths, rect };
    }

    const PRESET_SHAPES = {
        accentBorderCallout1: {
            av: {adj1:18750,adj2:-8333,adj3:112500,adj4:-38333},
            gd: [
                ['y1','*/',["h","adj1",100000]],
                ['x1','*/',["w","adj2",100000]],
                ['y2','*/',["h","adj3",100000]],
                ['x2','*/',["w","adj4",100000]],
            ],
            paths: [
                {cmds:[["moveTo","l","t"],["lnTo","r","t"],["lnTo","r","b"],["lnTo","l","b"],["close"]]},
                {fill:"none",cmds:[["moveTo","x1","t"],["close"],["lnTo","x1","b"]]},
                {fill:"none",cmds:[["moveTo","x1","y1"],["lnTo","x2","y2"]]},
            ]
        },
        accentBorderCallout2: {
            av: {adj1:18750,adj2:-8333,adj3:18750,adj4:-16667,adj5:112500,adj6:-46667},
            gd: [
                ['y1','*/',["h","adj1",100000]],
                ['x1','*/',["w","adj2",100000]],
                ['y2','*/',["h","adj3",100000]],
                ['x2','*/',["w","adj4",100000]],
                ['y3','*/',["h","adj5",100000]],
                ['x3','*/',["w","adj6",100000]],
            ],
            paths: [
                {cmds:[["moveTo","l","t"],["lnTo","r","t"],["lnTo","r","b"],["lnTo","l","b"],["close"]]},
                {fill:"none",cmds:[["moveTo","x1","t"],["close"],["lnTo","x1","b"]]},
                {fill:"none",cmds:[["moveTo","x1","y1"],["lnTo","x2","y2"],["lnTo","x3","y3"]]},
            ]
        },
        accentBorderCallout3: {
            av: {adj1:18750,adj2:-8333,adj3:18750,adj4:-16667,adj5:100000,adj6:-16667,adj7:112963,adj8:-8333},
            gd: [
                ['y1','*/',["h","adj1",100000]],
                ['x1','*/',["w","adj2",100000]],
                ['y2','*/',["h","adj3",100000]],
                ['x2','*/',["w","adj4",100000]],
                ['y3','*/',["h","adj5",100000]],
                ['x3','*/',["w","adj6",100000]],
                ['y4','*/',["h","adj7",100000]],
                ['x4','*/',["w","adj8",100000]],
            ],
            paths: [
                {cmds:[["moveTo","l","t"],["lnTo","r","t"],["lnTo","r","b"],["lnTo","l","b"],["close"]]},
                {fill:"none",cmds:[["moveTo","x1","t"],["close"],["lnTo","x1","b"]]},
                {fill:"none",cmds:[["moveTo","x1","y1"],["lnTo","x2","y2"],["lnTo","x3","y3"],["lnTo","x4","y4"]]},
            ]
        },
        accentCallout1: {
            av: {adj1:18750,adj2:-8333,adj3:112500,adj4:-38333},
            gd: [
                ['y1','*/',["h","adj1",100000]],
                ['x1','*/',["w","adj2",100000]],
                ['y2','*/',["h","adj3",100000]],
                ['x2','*/',["w","adj4",100000]],
            ],
            paths: [
                {stroke:"false",cmds:[["moveTo","l","t"],["lnTo","r","t"],["lnTo","r","b"],["lnTo","l","b"],["close"]]},
                {fill:"none",cmds:[["moveTo","x1","t"],["close"],["lnTo","x1","b"]]},
                {fill:"none",cmds:[["moveTo","x1","y1"],["lnTo","x2","y2"]]},
            ]
        },
        accentCallout2: {
            av: {adj1:18750,adj2:-8333,adj3:18750,adj4:-16667,adj5:112500,adj6:-46667},
            gd: [
                ['y1','*/',["h","adj1",100000]],
                ['x1','*/',["w","adj2",100000]],
                ['y2','*/',["h","adj3",100000]],
                ['x2','*/',["w","adj4",100000]],
                ['y3','*/',["h","adj5",100000]],
                ['x3','*/',["w","adj6",100000]],
            ],
            paths: [
                {stroke:"false",cmds:[["moveTo","l","t"],["lnTo","r","t"],["lnTo","r","b"],["lnTo","l","b"],["close"]]},
                {fill:"none",cmds:[["moveTo","x1","t"],["close"],["lnTo","x1","b"]]},
                {fill:"none",cmds:[["moveTo","x1","y1"],["lnTo","x2","y2"],["lnTo","x3","y3"]]},
            ]
        },
        accentCallout3: {
            av: {adj1:18750,adj2:-8333,adj3:18750,adj4:-16667,adj5:100000,adj6:-16667,adj7:112963,adj8:-8333},
            gd: [
                ['y1','*/',["h","adj1",100000]],
                ['x1','*/',["w","adj2",100000]],
                ['y2','*/',["h","adj3",100000]],
                ['x2','*/',["w","adj4",100000]],
                ['y3','*/',["h","adj5",100000]],
                ['x3','*/',["w","adj6",100000]],
                ['y4','*/',["h","adj7",100000]],
                ['x4','*/',["w","adj8",100000]],
            ],
            paths: [
                {stroke:"false",cmds:[["moveTo","l","t"],["lnTo","r","t"],["lnTo","r","b"],["lnTo","l","b"],["close"]]},
                {fill:"none",cmds:[["moveTo","x1","t"],["close"],["lnTo","x1","b"]]},
                {fill:"none",cmds:[["moveTo","x1","y1"],["lnTo","x2","y2"],["lnTo","x3","y3"],["lnTo","x4","y4"]]},
            ]
        },
        actionButtonBackPrevious: {
            gd: [
                ['dx2','*/',["ss",3,8]],
                ['g9','+-',["vc",0,"dx2"]],
                ['g10','+-',["vc","dx2",0]],
                ['g11','+-',["hc",0,"dx2"]],
                ['g12','+-',["hc","dx2",0]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","l","t"],
                    ["lnTo","r","t"],
                    ["lnTo","r","b"],
                    ["lnTo","l","b"],
                    ["close"],
                    ["moveTo","g11","vc"],
                    ["lnTo","g12","g9"],
                    ["lnTo","g12","g10"],
                    ["close"],
                ]},
                {fill:"darken",stroke:"false",cmds:[
                    ["moveTo","g11","vc"],
                    ["lnTo","g12","g9"],
                    ["lnTo","g12","g10"],
                    ["close"],
                ]},
                {fill:"none",cmds:[["moveTo","g11","vc"],["lnTo","g12","g9"],["lnTo","g12","g10"],["close"]]},
                {fill:"none",cmds:[["moveTo","l","t"],["lnTo","r","t"],["lnTo","r","b"],["lnTo","l","b"],["close"]]},
            ]
        },
        actionButtonBeginning: {
            gd: [
                ['dx2','*/',["ss",3,8]],
                ['g9','+-',["vc",0,"dx2"]],
                ['g10','+-',["vc","dx2",0]],
                ['g11','+-',["hc",0,"dx2"]],
                ['g12','+-',["hc","dx2",0]],
                ['g13','*/',["ss",3,4]],
                ['g14','*/',["g13",1,8]],
                ['g15','*/',["g13",1,4]],
                ['g16','+-',["g11","g14",0]],
                ['g17','+-',["g11","g15",0]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","l","t"],
                    ["lnTo","r","t"],
                    ["lnTo","r","b"],
                    ["lnTo","l","b"],
                    ["close"],
                    ["moveTo","g17","vc"],
                    ["lnTo","g12","g9"],
                    ["lnTo","g12","g10"],
                    ["close"],
                    ["moveTo","g16","g9"],
                    ["lnTo","g11","g9"],
                    ["lnTo","g11","g10"],
                    ["lnTo","g16","g10"],
                    ["close"],
                ]},
                {fill:"darken",stroke:"false",cmds:[
                    ["moveTo","g17","vc"],
                    ["lnTo","g12","g9"],
                    ["lnTo","g12","g10"],
                    ["close"],
                    ["moveTo","g16","g9"],
                    ["lnTo","g11","g9"],
                    ["lnTo","g11","g10"],
                    ["lnTo","g16","g10"],
                    ["close"],
                ]},
                {fill:"none",cmds:[
                    ["moveTo","g17","vc"],
                    ["lnTo","g12","g9"],
                    ["lnTo","g12","g10"],
                    ["close"],
                    ["moveTo","g16","g9"],
                    ["lnTo","g16","g10"],
                    ["lnTo","g11","g10"],
                    ["lnTo","g11","g9"],
                    ["close"],
                ]},
                {fill:"none",cmds:[["moveTo","l","t"],["lnTo","r","t"],["lnTo","r","b"],["lnTo","l","b"],["close"]]},
            ]
        },
        actionButtonBlank: {
            paths: [
                {cmds:[["moveTo","l","t"],["lnTo","r","t"],["lnTo","r","b"],["lnTo","l","b"],["close"]]},
            ]
        },
        actionButtonDocument: {
            gd: [
                ['dx2','*/',["ss",3,8]],
                ['g9','+-',["vc",0,"dx2"]],
                ['g10','+-',["vc","dx2",0]],
                ['dx1','*/',["ss",9,32]],
                ['g11','+-',["hc",0,"dx1"]],
                ['g12','+-',["hc","dx1",0]],
                ['g13','*/',["ss",3,16]],
                ['g14','+-',["g12",0,"g13"]],
                ['g15','+-',["g9","g13",0]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","l","t"],
                    ["lnTo","r","t"],
                    ["lnTo","r","b"],
                    ["lnTo","l","b"],
                    ["close"],
                    ["moveTo","g11","g9"],
                    ["lnTo","g14","g9"],
                    ["lnTo","g12","g15"],
                    ["lnTo","g12","g10"],
                    ["lnTo","g11","g10"],
                    ["close"],
                ]},
                {fill:"darkenLess",stroke:"false",cmds:[
                    ["moveTo","g11","g9"],
                    ["lnTo","g14","g9"],
                    ["lnTo","g14","g15"],
                    ["lnTo","g12","g15"],
                    ["lnTo","g12","g10"],
                    ["lnTo","g11","g10"],
                    ["close"],
                ]},
                {fill:"darken",stroke:"false",cmds:[
                    ["moveTo","g14","g9"],
                    ["lnTo","g14","g15"],
                    ["lnTo","g12","g15"],
                    ["close"],
                ]},
                {fill:"none",cmds:[
                    ["moveTo","g11","g9"],
                    ["lnTo","g14","g9"],
                    ["lnTo","g12","g15"],
                    ["lnTo","g12","g10"],
                    ["lnTo","g11","g10"],
                    ["close"],
                    ["moveTo","g12","g15"],
                    ["lnTo","g14","g15"],
                    ["lnTo","g14","g9"],
                ]},
                {fill:"none",cmds:[["moveTo","l","t"],["lnTo","r","t"],["lnTo","r","b"],["lnTo","l","b"],["close"]]},
            ]
        },
        actionButtonEnd: {
            gd: [
                ['dx2','*/',["ss",3,8]],
                ['g9','+-',["vc",0,"dx2"]],
                ['g10','+-',["vc","dx2",0]],
                ['g11','+-',["hc",0,"dx2"]],
                ['g12','+-',["hc","dx2",0]],
                ['g13','*/',["ss",3,4]],
                ['g14','*/',["g13",3,4]],
                ['g15','*/',["g13",7,8]],
                ['g16','+-',["g11","g14",0]],
                ['g17','+-',["g11","g15",0]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","l","t"],
                    ["lnTo","r","t"],
                    ["lnTo","r","b"],
                    ["lnTo","l","b"],
                    ["close"],
                    ["moveTo","g16","vc"],
                    ["lnTo","g11","g9"],
                    ["lnTo","g11","g10"],
                    ["close"],
                    ["moveTo","g17","g9"],
                    ["lnTo","g12","g9"],
                    ["lnTo","g12","g10"],
                    ["lnTo","g17","g10"],
                    ["close"],
                ]},
                {fill:"darken",stroke:"false",cmds:[
                    ["moveTo","g16","vc"],
                    ["lnTo","g11","g9"],
                    ["lnTo","g11","g10"],
                    ["close"],
                    ["moveTo","g17","g9"],
                    ["lnTo","g12","g9"],
                    ["lnTo","g12","g10"],
                    ["lnTo","g17","g10"],
                    ["close"],
                ]},
                {fill:"none",cmds:[
                    ["moveTo","g16","vc"],
                    ["lnTo","g11","g10"],
                    ["lnTo","g11","g9"],
                    ["close"],
                    ["moveTo","g17","g9"],
                    ["lnTo","g12","g9"],
                    ["lnTo","g12","g10"],
                    ["lnTo","g17","g10"],
                    ["close"],
                ]},
                {fill:"none",cmds:[["moveTo","l","t"],["lnTo","r","t"],["lnTo","r","b"],["lnTo","l","b"],["close"]]},
            ]
        },
        actionButtonForwardNext: {
            gd: [
                ['dx2','*/',["ss",3,8]],
                ['g9','+-',["vc",0,"dx2"]],
                ['g10','+-',["vc","dx2",0]],
                ['g11','+-',["hc",0,"dx2"]],
                ['g12','+-',["hc","dx2",0]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","l","t"],
                    ["lnTo","r","t"],
                    ["lnTo","r","b"],
                    ["lnTo","l","b"],
                    ["close"],
                    ["moveTo","g12","vc"],
                    ["lnTo","g11","g9"],
                    ["lnTo","g11","g10"],
                    ["close"],
                ]},
                {fill:"darken",stroke:"false",cmds:[
                    ["moveTo","g12","vc"],
                    ["lnTo","g11","g9"],
                    ["lnTo","g11","g10"],
                    ["close"],
                ]},
                {fill:"none",cmds:[["moveTo","g12","vc"],["lnTo","g11","g10"],["lnTo","g11","g9"],["close"]]},
                {fill:"none",cmds:[["moveTo","l","t"],["lnTo","r","t"],["lnTo","r","b"],["lnTo","l","b"],["close"]]},
            ]
        },
        actionButtonHelp: {
            gd: [
                ['dx2','*/',["ss",3,8]],
                ['g9','+-',["vc",0,"dx2"]],
                ['g11','+-',["hc",0,"dx2"]],
                ['g13','*/',["ss",3,4]],
                ['g14','*/',["g13",1,7]],
                ['g15','*/',["g13",3,14]],
                ['g16','*/',["g13",2,7]],
                ['g19','*/',["g13",3,7]],
                ['g20','*/',["g13",4,7]],
                ['g21','*/',["g13",17,28]],
                ['g23','*/',["g13",21,28]],
                ['g24','*/',["g13",11,14]],
                ['g27','+-',["g9","g16",0]],
                ['g29','+-',["g9","g21",0]],
                ['g30','+-',["g9","g23",0]],
                ['g31','+-',["g9","g24",0]],
                ['g33','+-',["g11","g15",0]],
                ['g36','+-',["g11","g19",0]],
                ['g37','+-',["g11","g20",0]],
                ['g41','*/',["g13",1,14]],
                ['g42','*/',["g13",3,28]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","l","t"],
                    ["lnTo","r","t"],
                    ["lnTo","r","b"],
                    ["lnTo","l","b"],
                    ["close"],
                    ["moveTo","g33","g27"],
                    ["arcTo","g16","g16","cd2","cd2"],
                    ["arcTo","g14","g15",0,"cd4"],
                    ["arcTo","g41","g42","3cd4",-5400000],
                    ["lnTo","g37","g30"],
                    ["lnTo","g36","g30"],
                    ["lnTo","g36","g29"],
                    ["arcTo","g14","g15","cd2","cd4"],
                    ["arcTo","g41","g42","cd4",-5400000],
                    ["arcTo","g14","g14",0,-10800000],
                    ["close"],
                    ["moveTo","hc","g31"],
                    ["arcTo","g42","g42","3cd4",21600000],
                    ["close"],
                ]},
                {fill:"darken",stroke:"false",cmds:[
                    ["moveTo","g33","g27"],
                    ["arcTo","g16","g16","cd2","cd2"],
                    ["arcTo","g14","g15",0,"cd4"],
                    ["arcTo","g41","g42","3cd4",-5400000],
                    ["lnTo","g37","g30"],
                    ["lnTo","g36","g30"],
                    ["lnTo","g36","g29"],
                    ["arcTo","g14","g15","cd2","cd4"],
                    ["arcTo","g41","g42","cd4",-5400000],
                    ["arcTo","g14","g14",0,-10800000],
                    ["close"],
                    ["moveTo","hc","g31"],
                    ["arcTo","g42","g42","3cd4",21600000],
                    ["close"],
                ]},
                {fill:"none",cmds:[
                    ["moveTo","g33","g27"],
                    ["arcTo","g16","g16","cd2","cd2"],
                    ["arcTo","g14","g15",0,"cd4"],
                    ["arcTo","g41","g42","3cd4",-5400000],
                    ["lnTo","g37","g30"],
                    ["lnTo","g36","g30"],
                    ["lnTo","g36","g29"],
                    ["arcTo","g14","g15","cd2","cd4"],
                    ["arcTo","g41","g42","cd4",-5400000],
                    ["arcTo","g14","g14",0,-10800000],
                    ["close"],
                    ["moveTo","hc","g31"],
                    ["arcTo","g42","g42","3cd4",21600000],
                    ["close"],
                ]},
                {fill:"none",cmds:[["moveTo","l","t"],["lnTo","r","t"],["lnTo","r","b"],["lnTo","l","b"],["close"]]},
            ]
        },
        actionButtonHome: {
            gd: [
                ['dx2','*/',["ss",3,8]],
                ['g9','+-',["vc",0,"dx2"]],
                ['g10','+-',["vc","dx2",0]],
                ['g11','+-',["hc",0,"dx2"]],
                ['g12','+-',["hc","dx2",0]],
                ['g13','*/',["ss",3,4]],
                ['g14','*/',["g13",1,16]],
                ['g15','*/',["g13",1,8]],
                ['g16','*/',["g13",3,16]],
                ['g17','*/',["g13",5,16]],
                ['g18','*/',["g13",7,16]],
                ['g19','*/',["g13",9,16]],
                ['g20','*/',["g13",11,16]],
                ['g21','*/',["g13",3,4]],
                ['g22','*/',["g13",13,16]],
                ['g23','*/',["g13",7,8]],
                ['g24','+-',["g9","g14",0]],
                ['g25','+-',["g9","g16",0]],
                ['g26','+-',["g9","g17",0]],
                ['g27','+-',["g9","g21",0]],
                ['g28','+-',["g11","g15",0]],
                ['g29','+-',["g11","g18",0]],
                ['g30','+-',["g11","g19",0]],
                ['g31','+-',["g11","g20",0]],
                ['g32','+-',["g11","g22",0]],
                ['g33','+-',["g11","g23",0]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","l","t"],
                    ["lnTo","r","t"],
                    ["lnTo","r","b"],
                    ["lnTo","l","b"],
                    ["close"],
                    ["moveTo","hc","g9"],
                    ["lnTo","g11","vc"],
                    ["lnTo","g28","vc"],
                    ["lnTo","g28","g10"],
                    ["lnTo","g33","g10"],
                    ["lnTo","g33","vc"],
                    ["lnTo","g12","vc"],
                    ["lnTo","g32","g26"],
                    ["lnTo","g32","g24"],
                    ["lnTo","g31","g24"],
                    ["lnTo","g31","g25"],
                    ["close"],
                ]},
                {fill:"darkenLess",stroke:"false",cmds:[
                    ["moveTo","g32","g26"],
                    ["lnTo","g32","g24"],
                    ["lnTo","g31","g24"],
                    ["lnTo","g31","g25"],
                    ["close"],
                    ["moveTo","g28","vc"],
                    ["lnTo","g28","g10"],
                    ["lnTo","g29","g10"],
                    ["lnTo","g29","g27"],
                    ["lnTo","g30","g27"],
                    ["lnTo","g30","g10"],
                    ["lnTo","g33","g10"],
                    ["lnTo","g33","vc"],
                    ["close"],
                ]},
                {fill:"darken",stroke:"false",cmds:[
                    ["moveTo","hc","g9"],
                    ["lnTo","g11","vc"],
                    ["lnTo","g12","vc"],
                    ["close"],
                    ["moveTo","g29","g27"],
                    ["lnTo","g30","g27"],
                    ["lnTo","g30","g10"],
                    ["lnTo","g29","g10"],
                    ["close"],
                ]},
                {fill:"none",cmds:[
                    ["moveTo","hc","g9"],
                    ["lnTo","g31","g25"],
                    ["lnTo","g31","g24"],
                    ["lnTo","g32","g24"],
                    ["lnTo","g32","g26"],
                    ["lnTo","g12","vc"],
                    ["lnTo","g33","vc"],
                    ["lnTo","g33","g10"],
                    ["lnTo","g28","g10"],
                    ["lnTo","g28","vc"],
                    ["lnTo","g11","vc"],
                    ["close"],
                    ["moveTo","g31","g25"],
                    ["lnTo","g32","g26"],
                    ["moveTo","g33","vc"],
                    ["lnTo","g28","vc"],
                    ["moveTo","g29","g10"],
                    ["lnTo","g29","g27"],
                    ["lnTo","g30","g27"],
                    ["lnTo","g30","g10"],
                ]},
                {fill:"none",cmds:[["moveTo","l","t"],["lnTo","r","t"],["lnTo","r","b"],["lnTo","l","b"],["close"]]},
            ]
        },
        actionButtonInformation: {
            gd: [
                ['dx2','*/',["ss",3,8]],
                ['g9','+-',["vc",0,"dx2"]],
                ['g11','+-',["hc",0,"dx2"]],
                ['g13','*/',["ss",3,4]],
                ['g14','*/',["g13",1,32]],
                ['g17','*/',["g13",5,16]],
                ['g18','*/',["g13",3,8]],
                ['g19','*/',["g13",13,32]],
                ['g20','*/',["g13",19,32]],
                ['g22','*/',["g13",11,16]],
                ['g23','*/',["g13",13,16]],
                ['g24','*/',["g13",7,8]],
                ['g25','+-',["g9","g14",0]],
                ['g28','+-',["g9","g17",0]],
                ['g29','+-',["g9","g18",0]],
                ['g30','+-',["g9","g23",0]],
                ['g31','+-',["g9","g24",0]],
                ['g32','+-',["g11","g17",0]],
                ['g34','+-',["g11","g19",0]],
                ['g35','+-',["g11","g20",0]],
                ['g37','+-',["g11","g22",0]],
                ['g38','*/',["g13",3,32]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","l","t"],
                    ["lnTo","r","t"],
                    ["lnTo","r","b"],
                    ["lnTo","l","b"],
                    ["close"],
                    ["moveTo","hc","g9"],
                    ["arcTo","dx2","dx2","3cd4",21600000],
                    ["close"],
                ]},
                {fill:"darken",stroke:"false",cmds:[
                    ["moveTo","hc","g9"],
                    ["arcTo","dx2","dx2","3cd4",21600000],
                    ["close"],
                    ["moveTo","hc","g25"],
                    ["arcTo","g38","g38","3cd4",21600000],
                    ["moveTo","g32","g28"],
                    ["lnTo","g32","g29"],
                    ["lnTo","g34","g29"],
                    ["lnTo","g34","g30"],
                    ["lnTo","g32","g30"],
                    ["lnTo","g32","g31"],
                    ["lnTo","g37","g31"],
                    ["lnTo","g37","g30"],
                    ["lnTo","g35","g30"],
                    ["lnTo","g35","g28"],
                    ["close"],
                ]},
                {fill:"lighten",stroke:"false",cmds:[
                    ["moveTo","hc","g25"],
                    ["arcTo","g38","g38","3cd4",21600000],
                    ["moveTo","g32","g28"],
                    ["lnTo","g35","g28"],
                    ["lnTo","g35","g30"],
                    ["lnTo","g37","g30"],
                    ["lnTo","g37","g31"],
                    ["lnTo","g32","g31"],
                    ["lnTo","g32","g30"],
                    ["lnTo","g34","g30"],
                    ["lnTo","g34","g29"],
                    ["lnTo","g32","g29"],
                    ["close"],
                ]},
                {fill:"none",cmds:[
                    ["moveTo","hc","g9"],
                    ["arcTo","dx2","dx2","3cd4",21600000],
                    ["close"],
                    ["moveTo","hc","g25"],
                    ["arcTo","g38","g38","3cd4",21600000],
                    ["moveTo","g32","g28"],
                    ["lnTo","g35","g28"],
                    ["lnTo","g35","g30"],
                    ["lnTo","g37","g30"],
                    ["lnTo","g37","g31"],
                    ["lnTo","g32","g31"],
                    ["lnTo","g32","g30"],
                    ["lnTo","g34","g30"],
                    ["lnTo","g34","g29"],
                    ["lnTo","g32","g29"],
                    ["close"],
                ]},
                {fill:"none",cmds:[["moveTo","l","t"],["lnTo","r","t"],["lnTo","r","b"],["lnTo","l","b"],["close"]]},
            ]
        },
        actionButtonMovie: {
            gd: [
                ['dx2','*/',["ss",3,8]],
                ['g9','+-',["vc",0,"dx2"]],
                ['g10','+-',["vc","dx2",0]],
                ['g11','+-',["hc",0,"dx2"]],
                ['g12','+-',["hc","dx2",0]],
                ['g13','*/',["ss",3,4]],
                ['g14','*/',["g13",1455,21600]],
                ['g15','*/',["g13",1905,21600]],
                ['g16','*/',["g13",2325,21600]],
                ['g17','*/',["g13",16155,21600]],
                ['g18','*/',["g13",17010,21600]],
                ['g19','*/',["g13",19335,21600]],
                ['g20','*/',["g13",19725,21600]],
                ['g21','*/',["g13",20595,21600]],
                ['g22','*/',["g13",5280,21600]],
                ['g23','*/',["g13",5730,21600]],
                ['g24','*/',["g13",6630,21600]],
                ['g25','*/',["g13",7492,21600]],
                ['g26','*/',["g13",9067,21600]],
                ['g27','*/',["g13",9555,21600]],
                ['g28','*/',["g13",13342,21600]],
                ['g29','*/',["g13",14580,21600]],
                ['g30','*/',["g13",15592,21600]],
                ['g31','+-',["g11","g14",0]],
                ['g32','+-',["g11","g15",0]],
                ['g33','+-',["g11","g16",0]],
                ['g34','+-',["g11","g17",0]],
                ['g35','+-',["g11","g18",0]],
                ['g36','+-',["g11","g19",0]],
                ['g37','+-',["g11","g20",0]],
                ['g38','+-',["g11","g21",0]],
                ['g39','+-',["g9","g22",0]],
                ['g40','+-',["g9","g23",0]],
                ['g41','+-',["g9","g24",0]],
                ['g42','+-',["g9","g25",0]],
                ['g43','+-',["g9","g26",0]],
                ['g44','+-',["g9","g27",0]],
                ['g45','+-',["g9","g28",0]],
                ['g46','+-',["g9","g29",0]],
                ['g47','+-',["g9","g30",0]],
                ['g48','+-',["g9","g31",0]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","l","t"],
                    ["lnTo","r","t"],
                    ["lnTo","r","b"],
                    ["lnTo","l","b"],
                    ["close"],
                    ["moveTo","g11","g39"],
                    ["lnTo","g11","g44"],
                    ["lnTo","g31","g44"],
                    ["lnTo","g32","g43"],
                    ["lnTo","g33","g43"],
                    ["lnTo","g33","g47"],
                    ["lnTo","g35","g47"],
                    ["lnTo","g35","g45"],
                    ["lnTo","g36","g45"],
                    ["lnTo","g38","g46"],
                    ["lnTo","g12","g46"],
                    ["lnTo","g12","g41"],
                    ["lnTo","g38","g41"],
                    ["lnTo","g37","g42"],
                    ["lnTo","g35","g42"],
                    ["lnTo","g35","g41"],
                    ["lnTo","g34","g40"],
                    ["lnTo","g32","g40"],
                    ["lnTo","g31","g39"],
                    ["close"],
                ]},
                {fill:"darken",stroke:"false",cmds:[
                    ["moveTo","g11","g39"],
                    ["lnTo","g11","g44"],
                    ["lnTo","g31","g44"],
                    ["lnTo","g32","g43"],
                    ["lnTo","g33","g43"],
                    ["lnTo","g33","g47"],
                    ["lnTo","g35","g47"],
                    ["lnTo","g35","g45"],
                    ["lnTo","g36","g45"],
                    ["lnTo","g38","g46"],
                    ["lnTo","g12","g46"],
                    ["lnTo","g12","g41"],
                    ["lnTo","g38","g41"],
                    ["lnTo","g37","g42"],
                    ["lnTo","g35","g42"],
                    ["lnTo","g35","g41"],
                    ["lnTo","g34","g40"],
                    ["lnTo","g32","g40"],
                    ["lnTo","g31","g39"],
                    ["close"],
                ]},
                {fill:"none",cmds:[
                    ["moveTo","g11","g39"],
                    ["lnTo","g31","g39"],
                    ["lnTo","g32","g40"],
                    ["lnTo","g34","g40"],
                    ["lnTo","g35","g41"],
                    ["lnTo","g35","g42"],
                    ["lnTo","g37","g42"],
                    ["lnTo","g38","g41"],
                    ["lnTo","g12","g41"],
                    ["lnTo","g12","g46"],
                    ["lnTo","g38","g46"],
                    ["lnTo","g36","g45"],
                    ["lnTo","g35","g45"],
                    ["lnTo","g35","g47"],
                    ["lnTo","g33","g47"],
                    ["lnTo","g33","g43"],
                    ["lnTo","g32","g43"],
                    ["lnTo","g31","g44"],
                    ["lnTo","g11","g44"],
                    ["close"],
                ]},
                {fill:"none",cmds:[["moveTo","l","t"],["lnTo","r","t"],["lnTo","r","b"],["lnTo","l","b"],["close"]]},
            ]
        },
        actionButtonReturn: {
            gd: [
                ['dx2','*/',["ss",3,8]],
                ['g9','+-',["vc",0,"dx2"]],
                ['g10','+-',["vc","dx2",0]],
                ['g11','+-',["hc",0,"dx2"]],
                ['g12','+-',["hc","dx2",0]],
                ['g13','*/',["ss",3,4]],
                ['g14','*/',["g13",7,8]],
                ['g15','*/',["g13",3,4]],
                ['g16','*/',["g13",5,8]],
                ['g17','*/',["g13",3,8]],
                ['g18','*/',["g13",1,4]],
                ['g19','+-',["g9","g15",0]],
                ['g20','+-',["g9","g16",0]],
                ['g21','+-',["g9","g18",0]],
                ['g22','+-',["g11","g14",0]],
                ['g23','+-',["g11","g15",0]],
                ['g24','+-',["g11","g16",0]],
                ['g25','+-',["g11","g17",0]],
                ['g26','+-',["g11","g18",0]],
                ['g27','*/',["g13",1,8]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","l","t"],
                    ["lnTo","r","t"],
                    ["lnTo","r","b"],
                    ["lnTo","l","b"],
                    ["close"],
                    ["moveTo","g12","g21"],
                    ["lnTo","g23","g9"],
                    ["lnTo","hc","g21"],
                    ["lnTo","g24","g21"],
                    ["lnTo","g24","g20"],
                    ["arcTo","g27","g27",0,"cd4"],
                    ["lnTo","g25","g19"],
                    ["arcTo","g27","g27","cd4","cd4"],
                    ["lnTo","g26","g21"],
                    ["lnTo","g11","g21"],
                    ["lnTo","g11","g20"],
                    ["arcTo","g17","g17","cd2",-5400000],
                    ["lnTo","hc","g10"],
                    ["arcTo","g17","g17","cd4",-5400000],
                    ["lnTo","g22","g21"],
                    ["close"],
                ]},
                {fill:"darken",stroke:"false",cmds:[
                    ["moveTo","g12","g21"],
                    ["lnTo","g23","g9"],
                    ["lnTo","hc","g21"],
                    ["lnTo","g24","g21"],
                    ["lnTo","g24","g20"],
                    ["arcTo","g27","g27",0,"cd4"],
                    ["lnTo","g25","g19"],
                    ["arcTo","g27","g27","cd4","cd4"],
                    ["lnTo","g26","g21"],
                    ["lnTo","g11","g21"],
                    ["lnTo","g11","g20"],
                    ["arcTo","g17","g17","cd2",-5400000],
                    ["lnTo","hc","g10"],
                    ["arcTo","g17","g17","cd4",-5400000],
                    ["lnTo","g22","g21"],
                    ["close"],
                ]},
                {fill:"none",cmds:[
                    ["moveTo","g12","g21"],
                    ["lnTo","g22","g21"],
                    ["lnTo","g22","g20"],
                    ["arcTo","g17","g17",0,"cd4"],
                    ["lnTo","g25","g10"],
                    ["arcTo","g17","g17","cd4","cd4"],
                    ["lnTo","g11","g21"],
                    ["lnTo","g26","g21"],
                    ["lnTo","g26","g20"],
                    ["arcTo","g27","g27","cd2",-5400000],
                    ["lnTo","hc","g19"],
                    ["arcTo","g27","g27","cd4",-5400000],
                    ["lnTo","g24","g21"],
                    ["lnTo","hc","g21"],
                    ["lnTo","g23","g9"],
                    ["close"],
                ]},
                {fill:"none",cmds:[["moveTo","l","t"],["lnTo","r","t"],["lnTo","r","b"],["lnTo","l","b"],["close"]]},
            ]
        },
        actionButtonSound: {
            gd: [
                ['dx2','*/',["ss",3,8]],
                ['g9','+-',["vc",0,"dx2"]],
                ['g10','+-',["vc","dx2",0]],
                ['g11','+-',["hc",0,"dx2"]],
                ['g12','+-',["hc","dx2",0]],
                ['g13','*/',["ss",3,4]],
                ['g14','*/',["g13",1,8]],
                ['g15','*/',["g13",5,16]],
                ['g16','*/',["g13",5,8]],
                ['g17','*/',["g13",11,16]],
                ['g18','*/',["g13",3,4]],
                ['g19','*/',["g13",7,8]],
                ['g20','+-',["g9","g14",0]],
                ['g21','+-',["g9","g15",0]],
                ['g22','+-',["g9","g17",0]],
                ['g23','+-',["g9","g19",0]],
                ['g24','+-',["g11","g15",0]],
                ['g25','+-',["g11","g16",0]],
                ['g26','+-',["g11","g18",0]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","l","t"],
                    ["lnTo","r","t"],
                    ["lnTo","r","b"],
                    ["lnTo","l","b"],
                    ["close"],
                    ["moveTo","g11","g21"],
                    ["lnTo","g11","g22"],
                    ["lnTo","g24","g22"],
                    ["lnTo","g25","g10"],
                    ["lnTo","g25","g9"],
                    ["lnTo","g24","g21"],
                    ["close"],
                ]},
                {fill:"darken",stroke:"false",cmds:[
                    ["moveTo","g11","g21"],
                    ["lnTo","g11","g22"],
                    ["lnTo","g24","g22"],
                    ["lnTo","g25","g10"],
                    ["lnTo","g25","g9"],
                    ["lnTo","g24","g21"],
                    ["close"],
                ]},
                {fill:"none",cmds:[
                    ["moveTo","g11","g21"],
                    ["lnTo","g24","g21"],
                    ["lnTo","g25","g9"],
                    ["lnTo","g25","g10"],
                    ["lnTo","g24","g22"],
                    ["lnTo","g11","g22"],
                    ["close"],
                    ["moveTo","g26","g21"],
                    ["lnTo","g12","g20"],
                    ["moveTo","g26","vc"],
                    ["lnTo","g12","vc"],
                    ["moveTo","g26","g22"],
                    ["lnTo","g12","g23"],
                ]},
                {fill:"none",cmds:[["moveTo","l","t"],["lnTo","r","t"],["lnTo","r","b"],["lnTo","l","b"],["close"]]},
            ]
        },
        arc: {
            av: {adj1:16200000,adj2:0},
            gd: [
                ['stAng','pin',[0,"adj1",21599999]],
                ['enAng','pin',[0,"adj2",21599999]],
                ['sw11','+-',["enAng",0,"stAng"]],
                ['sw12','+-',["sw11",21600000,0]],
                ['swAng','?:',["sw11","sw11","sw12"]],
                ['wt1','sin',["wd2","stAng"]],
                ['ht1','cos',["hd2","stAng"]],
                ['dx1','cat2',["wd2","ht1","wt1"]],
                ['dy1','sat2',["hd2","ht1","wt1"]],
                ['wt2','sin',["wd2","enAng"]],
                ['ht2','cos',["hd2","enAng"]],
                ['dx2','cat2',["wd2","ht2","wt2"]],
                ['dy2','sat2',["hd2","ht2","wt2"]],
                ['x1','+-',["hc","dx1",0]],
                ['y1','+-',["vc","dy1",0]],
                ['x2','+-',["hc","dx2",0]],
                ['y2','+-',["vc","dy2",0]],
                ['sw0','+-',[21600000,0,"stAng"]],
                ['da1','+-',["swAng",0,"sw0"]],
                ['g1','max',["x1","x2"]],
                ['ir','?:',["da1","r","g1"]],
                ['sw1','+-',["cd4",0,"stAng"]],
                ['sw2','+-',[27000000,0,"stAng"]],
                ['sw3','?:',["sw1","sw1","sw2"]],
                ['da2','+-',["swAng",0,"sw3"]],
                ['g5','max',["y1","y2"]],
                ['ib','?:',["da2","b","g5"]],
                ['sw4','+-',["cd2",0,"stAng"]],
                ['sw5','+-',[32400000,0,"stAng"]],
                ['sw6','?:',["sw4","sw4","sw5"]],
                ['da3','+-',["swAng",0,"sw6"]],
                ['g9','min',["x1","x2"]],
                ['il','?:',["da3","l","g9"]],
                ['sw7','+-',["3cd4",0,"stAng"]],
                ['sw8','+-',[37800000,0,"stAng"]],
                ['sw9','?:',["sw7","sw7","sw8"]],
                ['da4','+-',["swAng",0,"sw9"]],
                ['g13','min',["y1","y2"]],
                ['it','?:',["da4","t","g13"]],
                ['cang1','+-',["stAng",0,"cd4"]],
                ['cang2','+-',["enAng","cd4",0]],
                ['cang3','+/',["cang1","cang2",2]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","x1","y1"],
                    ["arcTo","wd2","hd2","stAng","swAng"],
                    ["lnTo","hc","vc"],
                    ["close"],
                ]},
                {fill:"none",cmds:[["moveTo","x1","y1"],["arcTo","wd2","hd2","stAng","swAng"]]},
            ]
        },
        bentArrow: {
            av: {adj1:25000,adj2:25000,adj3:25000,adj4:43750},
            gd: [
                ['a2','pin',[0,"adj2",50000]],
                ['maxAdj1','*/',["a2",2,1]],
                ['a1','pin',[0,"adj1","maxAdj1"]],
                ['a3','pin',[0,"adj3",50000]],
                ['th','*/',["ss","a1",100000]],
                ['aw2','*/',["ss","a2",100000]],
                ['th2','*/',["th",1,2]],
                ['dh2','+-',["aw2",0,"th2"]],
                ['ah','*/',["ss","a3",100000]],
                ['bw','+-',["r",0,"ah"]],
                ['bh','+-',["b",0,"dh2"]],
                ['bs','min',["bw","bh"]],
                ['maxAdj4','*/',[100000,"bs","ss"]],
                ['a4','pin',[0,"adj4","maxAdj4"]],
                ['bd','*/',["ss","a4",100000]],
                ['bd3','+-',["bd",0,"th"]],
                ['bd2','max',["bd3",0]],
                ['x3','+-',["th","bd2",0]],
                ['x4','+-',["r",0,"ah"]],
                ['y3','+-',["dh2","th",0]],
                ['y4','+-',["y3","dh2",0]],
                ['y5','+-',["dh2","bd",0]],
                ['y6','+-',["y3","bd2",0]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","b"],
                    ["lnTo","l","y5"],
                    ["arcTo","bd","bd","cd2","cd4"],
                    ["lnTo","x4","dh2"],
                    ["lnTo","x4","t"],
                    ["lnTo","r","aw2"],
                    ["lnTo","x4","y4"],
                    ["lnTo","x4","y3"],
                    ["lnTo","x3","y3"],
                    ["arcTo","bd2","bd2","3cd4",-5400000],
                    ["lnTo","th","b"],
                    ["close"],
                ]},
            ]
        },
        bentUpArrow: {
            av: {adj1:25000,adj2:25000,adj3:25000},
            gd: [
                ['a1','pin',[0,"adj1",50000]],
                ['a2','pin',[0,"adj2",50000]],
                ['a3','pin',[0,"adj3",50000]],
                ['y1','*/',["ss","a3",100000]],
                ['dx1','*/',["ss","a2",50000]],
                ['x1','+-',["r",0,"dx1"]],
                ['dx3','*/',["ss","a2",100000]],
                ['x3','+-',["r",0,"dx3"]],
                ['dx2','*/',["ss","a1",200000]],
                ['x2','+-',["x3",0,"dx2"]],
                ['x4','+-',["x3","dx2",0]],
                ['dy2','*/',["ss","a1",100000]],
                ['y2','+-',["b",0,"dy2"]],
                ['x0','*/',["x4",1,2]],
                ['y3','+/',["y2","b",2]],
                ['y15','+/',["y1","b",2]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","y2"],
                    ["lnTo","x2","y2"],
                    ["lnTo","x2","y1"],
                    ["lnTo","x1","y1"],
                    ["lnTo","x3","t"],
                    ["lnTo","r","y1"],
                    ["lnTo","x4","y1"],
                    ["lnTo","x4","b"],
                    ["lnTo","l","b"],
                    ["close"],
                ]},
            ]
        },
        bevel: {
            av: {adj:12500},
            gd: [
                ['a','pin',[0,"adj",50000]],
                ['x1','*/',["ss","a",100000]],
                ['x2','+-',["r",0,"x1"]],
                ['y2','+-',["b",0,"x1"]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","x1","x1"],
                    ["lnTo","x2","x1"],
                    ["lnTo","x2","y2"],
                    ["lnTo","x1","y2"],
                    ["close"],
                ]},
                {fill:"lightenLess",stroke:"false",cmds:[
                    ["moveTo","l","t"],
                    ["lnTo","r","t"],
                    ["lnTo","x2","x1"],
                    ["lnTo","x1","x1"],
                    ["close"],
                ]},
                {fill:"darkenLess",stroke:"false",cmds:[
                    ["moveTo","l","b"],
                    ["lnTo","x1","y2"],
                    ["lnTo","x2","y2"],
                    ["lnTo","r","b"],
                    ["close"],
                ]},
                {fill:"lighten",stroke:"false",cmds:[
                    ["moveTo","l","t"],
                    ["lnTo","x1","x1"],
                    ["lnTo","x1","y2"],
                    ["lnTo","l","b"],
                    ["close"],
                ]},
                {fill:"darken",stroke:"false",cmds:[
                    ["moveTo","r","t"],
                    ["lnTo","r","b"],
                    ["lnTo","x2","y2"],
                    ["lnTo","x2","x1"],
                    ["close"],
                ]},
                {fill:"none",cmds:[
                    ["moveTo","l","t"],
                    ["lnTo","r","t"],
                    ["lnTo","r","b"],
                    ["lnTo","l","b"],
                    ["close"],
                    ["moveTo","x1","x1"],
                    ["lnTo","x2","x1"],
                    ["lnTo","x2","y2"],
                    ["lnTo","x1","y2"],
                    ["close"],
                    ["moveTo","l","t"],
                    ["lnTo","x1","x1"],
                    ["moveTo","l","b"],
                    ["lnTo","x1","y2"],
                    ["moveTo","r","t"],
                    ["lnTo","x2","x1"],
                    ["moveTo","r","b"],
                    ["lnTo","x2","y2"],
                ]},
            ]
        },
        borderCallout1: {
            av: {adj1:18750,adj2:-8333,adj3:112500,adj4:-38333},
            gd: [
                ['y1','*/',["h","adj1",100000]],
                ['x1','*/',["w","adj2",100000]],
                ['y2','*/',["h","adj3",100000]],
                ['x2','*/',["w","adj4",100000]],
            ],
            paths: [
                {cmds:[["moveTo","l","t"],["lnTo","r","t"],["lnTo","r","b"],["lnTo","l","b"],["close"]]},
                {fill:"none",cmds:[["moveTo","x1","y1"],["lnTo","x2","y2"]]},
            ]
        },
        borderCallout2: {
            av: {adj1:18750,adj2:-8333,adj3:18750,adj4:-16667,adj5:112500,adj6:-46667},
            gd: [
                ['y1','*/',["h","adj1",100000]],
                ['x1','*/',["w","adj2",100000]],
                ['y2','*/',["h","adj3",100000]],
                ['x2','*/',["w","adj4",100000]],
                ['y3','*/',["h","adj5",100000]],
                ['x3','*/',["w","adj6",100000]],
            ],
            paths: [
                {cmds:[["moveTo","l","t"],["lnTo","r","t"],["lnTo","r","b"],["lnTo","l","b"],["close"]]},
                {fill:"none",cmds:[["moveTo","x1","y1"],["lnTo","x2","y2"],["lnTo","x3","y3"]]},
            ]
        },
        borderCallout3: {
            av: {adj1:18750,adj2:-8333,adj3:18750,adj4:-16667,adj5:100000,adj6:-16667,adj7:112963,adj8:-8333},
            gd: [
                ['y1','*/',["h","adj1",100000]],
                ['x1','*/',["w","adj2",100000]],
                ['y2','*/',["h","adj3",100000]],
                ['x2','*/',["w","adj4",100000]],
                ['y3','*/',["h","adj5",100000]],
                ['x3','*/',["w","adj6",100000]],
                ['y4','*/',["h","adj7",100000]],
                ['x4','*/',["w","adj8",100000]],
            ],
            paths: [
                {cmds:[["moveTo","l","t"],["lnTo","r","t"],["lnTo","r","b"],["lnTo","l","b"],["close"]]},
                {fill:"none",cmds:[["moveTo","x1","y1"],["lnTo","x2","y2"],["lnTo","x3","y3"],["lnTo","x4","y4"]]},
            ]
        },
        bracePair: {
            av: {adj:8333},
            gd: [
                ['a','pin',[0,"adj",25000]],
                ['x1','*/',["ss","a",100000]],
                ['x2','*/',["ss","a",50000]],
                ['x3','+-',["r",0,"x2"]],
                ['x4','+-',["r",0,"x1"]],
                ['y2','+-',["vc",0,"x1"]],
                ['y3','+-',["vc","x1",0]],
                ['y4','+-',["b",0,"x1"]],
                ['it','*/',["x1",29289,100000]],
                ['il','+-',["x1","it",0]],
                ['ir','+-',["r",0,"il"]],
                ['ib','+-',["b",0,"it"]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","x2","b"],
                    ["arcTo","x1","x1","cd4","cd4"],
                    ["lnTo","x1","y3"],
                    ["arcTo","x1","x1",0,-5400000],
                    ["arcTo","x1","x1","cd4",-5400000],
                    ["lnTo","x1","x1"],
                    ["arcTo","x1","x1","cd2","cd4"],
                    ["lnTo","x3","t"],
                    ["arcTo","x1","x1","3cd4","cd4"],
                    ["lnTo","x4","y2"],
                    ["arcTo","x1","x1","cd2",-5400000],
                    ["arcTo","x1","x1","3cd4",-5400000],
                    ["lnTo","x4","y4"],
                    ["arcTo","x1","x1",0,"cd4"],
                    ["close"],
                ]},
                {fill:"none",cmds:[
                    ["moveTo","x2","b"],
                    ["arcTo","x1","x1","cd4","cd4"],
                    ["lnTo","x1","y3"],
                    ["arcTo","x1","x1",0,-5400000],
                    ["arcTo","x1","x1","cd4",-5400000],
                    ["lnTo","x1","x1"],
                    ["arcTo","x1","x1","cd2","cd4"],
                    ["moveTo","x3","t"],
                    ["arcTo","x1","x1","3cd4","cd4"],
                    ["lnTo","x4","y2"],
                    ["arcTo","x1","x1","cd2",-5400000],
                    ["arcTo","x1","x1","3cd4",-5400000],
                    ["lnTo","x4","y4"],
                    ["arcTo","x1","x1",0,"cd4"],
                ]},
            ]
        },
        bracketPair: {
            av: {adj:16667},
            gd: [
                ['a','pin',[0,"adj",50000]],
                ['x1','*/',["ss","a",100000]],
                ['x2','+-',["r",0,"x1"]],
                ['y2','+-',["b",0,"x1"]],
                ['il','*/',["x1",29289,100000]],
                ['ir','+-',["r",0,"il"]],
                ['ib','+-',["b",0,"il"]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","l","x1"],
                    ["arcTo","x1","x1","cd2","cd4"],
                    ["lnTo","x2","t"],
                    ["arcTo","x1","x1","3cd4","cd4"],
                    ["lnTo","r","y2"],
                    ["arcTo","x1","x1",0,"cd4"],
                    ["lnTo","x1","b"],
                    ["arcTo","x1","x1","cd4","cd4"],
                    ["close"],
                ]},
                {fill:"none",cmds:[
                    ["moveTo","x1","b"],
                    ["arcTo","x1","x1","cd4","cd4"],
                    ["lnTo","l","x1"],
                    ["arcTo","x1","x1","cd2","cd4"],
                    ["moveTo","x2","t"],
                    ["arcTo","x1","x1","3cd4","cd4"],
                    ["lnTo","r","y2"],
                    ["arcTo","x1","x1",0,"cd4"],
                ]},
            ]
        },
        callout1: {
            av: {adj1:18750,adj2:-8333,adj3:112500,adj4:-38333},
            gd: [
                ['y1','*/',["h","adj1",100000]],
                ['x1','*/',["w","adj2",100000]],
                ['y2','*/',["h","adj3",100000]],
                ['x2','*/',["w","adj4",100000]],
            ],
            paths: [
                {stroke:"false",cmds:[["moveTo","l","t"],["lnTo","r","t"],["lnTo","r","b"],["lnTo","l","b"],["close"]]},
                {fill:"none",cmds:[["moveTo","x1","y1"],["lnTo","x2","y2"]]},
            ]
        },
        callout2: {
            av: {adj1:18750,adj2:-8333,adj3:18750,adj4:-16667,adj5:112500,adj6:-46667},
            gd: [
                ['y1','*/',["h","adj1",100000]],
                ['x1','*/',["w","adj2",100000]],
                ['y2','*/',["h","adj3",100000]],
                ['x2','*/',["w","adj4",100000]],
                ['y3','*/',["h","adj5",100000]],
                ['x3','*/',["w","adj6",100000]],
            ],
            paths: [
                {stroke:"false",cmds:[["moveTo","l","t"],["lnTo","r","t"],["lnTo","r","b"],["lnTo","l","b"],["close"]]},
                {fill:"none",cmds:[["moveTo","x1","y1"],["lnTo","x2","y2"],["lnTo","x3","y3"]]},
            ]
        },
        callout3: {
            av: {adj1:18750,adj2:-8333,adj3:18750,adj4:-16667,adj5:100000,adj6:-16667,adj7:112963,adj8:-8333},
            gd: [
                ['y1','*/',["h","adj1",100000]],
                ['x1','*/',["w","adj2",100000]],
                ['y2','*/',["h","adj3",100000]],
                ['x2','*/',["w","adj4",100000]],
                ['y3','*/',["h","adj5",100000]],
                ['x3','*/',["w","adj6",100000]],
                ['y4','*/',["h","adj7",100000]],
                ['x4','*/',["w","adj8",100000]],
            ],
            paths: [
                {stroke:"false",cmds:[["moveTo","l","t"],["lnTo","r","t"],["lnTo","r","b"],["lnTo","l","b"],["close"]]},
                {fill:"none",cmds:[["moveTo","x1","y1"],["lnTo","x2","y2"],["lnTo","x3","y3"],["lnTo","x4","y4"]]},
            ]
        },
        can: {
            av: {adj:25000},
            gd: [
                ['maxAdj','*/',[50000,"h","ss"]],
                ['a','pin',[0,"adj","maxAdj"]],
                ['y1','*/',["ss","a",200000]],
                ['y2','+-',["y1","y1",0]],
                ['y3','+-',["b",0,"y1"]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","l","y1"],
                    ["arcTo","wd2","y1","cd2",-10800000],
                    ["lnTo","r","y3"],
                    ["arcTo","wd2","y1",0,"cd2"],
                    ["close"],
                ]},
                {fill:"lighten",stroke:"false",cmds:[
                    ["moveTo","l","y1"],
                    ["arcTo","wd2","y1","cd2","cd2"],
                    ["arcTo","wd2","y1",0,"cd2"],
                    ["close"],
                ]},
                {fill:"none",cmds:[
                    ["moveTo","r","y1"],
                    ["arcTo","wd2","y1",0,"cd2"],
                    ["arcTo","wd2","y1","cd2","cd2"],
                    ["lnTo","r","y3"],
                    ["arcTo","wd2","y1",0,"cd2"],
                    ["lnTo","l","y1"],
                ]},
            ]
        },
        chartPlus: {
            paths: [
                {w:10,h:10,fill:"none",cmds:[["moveTo",5,0],["lnTo",5,10],["moveTo",0,5],["lnTo",10,5]]},
                {w:10,h:10,stroke:"false",cmds:[["moveTo",0,0],["lnTo",0,10],["lnTo",10,10],["lnTo",10,0],["close"]]},
            ]
        },
        chartStar: {
            paths: [
                {w:10,h:10,fill:"none",cmds:[
                    ["moveTo",0,0],
                    ["lnTo",10,10],
                    ["moveTo",0,10],
                    ["lnTo",10,0],
                    ["moveTo",5,0],
                    ["lnTo",5,10],
                ]},
                {w:10,h:10,stroke:"false",cmds:[["moveTo",0,0],["lnTo",0,10],["lnTo",10,10],["lnTo",10,0],["close"]]},
            ]
        },
        chartX: {
            paths: [
                {w:10,h:10,fill:"none",cmds:[["moveTo",0,0],["lnTo",10,10],["moveTo",0,10],["lnTo",10,0]]},
                {w:10,h:10,stroke:"false",cmds:[["moveTo",0,0],["lnTo",0,10],["lnTo",10,10],["lnTo",10,0],["close"]]},
            ]
        },
        chevron: {
            av: {adj:50000},
            gd: [
                ['maxAdj','*/',[100000,"w","ss"]],
                ['a','pin',[0,"adj","maxAdj"]],
                ['x1','*/',["ss","a",100000]],
                ['x2','+-',["r",0,"x1"]],
                ['x3','*/',["x2",1,2]],
                ['dx','+-',["x2",0,"x1"]],
                ['il','?:',["dx","x1","l"]],
                ['ir','?:',["dx","x2","r"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","t"],
                    ["lnTo","x2","t"],
                    ["lnTo","r","vc"],
                    ["lnTo","x2","b"],
                    ["lnTo","l","b"],
                    ["lnTo","x1","vc"],
                    ["close"],
                ]},
            ]
        },
        chord: {
            av: {adj1:2700000,adj2:16200000},
            gd: [
                ['stAng','pin',[0,"adj1",21599999]],
                ['enAng','pin',[0,"adj2",21599999]],
                ['sw1','+-',["enAng",0,"stAng"]],
                ['sw2','+-',["sw1",21600000,0]],
                ['swAng','?:',["sw1","sw1","sw2"]],
                ['wt1','sin',["wd2","stAng"]],
                ['ht1','cos',["hd2","stAng"]],
                ['dx1','cat2',["wd2","ht1","wt1"]],
                ['dy1','sat2',["hd2","ht1","wt1"]],
                ['wt2','sin',["wd2","enAng"]],
                ['ht2','cos',["hd2","enAng"]],
                ['dx2','cat2',["wd2","ht2","wt2"]],
                ['dy2','sat2',["hd2","ht2","wt2"]],
                ['x1','+-',["hc","dx1",0]],
                ['y1','+-',["vc","dy1",0]],
                ['x2','+-',["hc","dx2",0]],
                ['y2','+-',["vc","dy2",0]],
                ['x3','+/',["x1","x2",2]],
                ['y3','+/',["y1","y2",2]],
                ['midAng0','*/',["swAng",1,2]],
                ['midAng','+-',["stAng","midAng0","cd2"]],
                ['idx','cos',["wd2",2700000]],
                ['idy','sin',["hd2",2700000]],
                ['il','+-',["hc",0,"idx"]],
                ['ir','+-',["hc","idx",0]],
                ['it','+-',["vc",0,"idy"]],
                ['ib','+-',["vc","idy",0]],
            ],
            paths: [
                {cmds:[["moveTo","x1","y1"],["arcTo","wd2","hd2","stAng","swAng"],["close"]]},
            ]
        },
        circularArrow: {
            av: {adj1:12500,adj2:1142319,adj3:20457681,adj4:10800000,adj5:12500},
            gd: [
                ['a5','pin',[0,"adj5",25000]],
                ['maxAdj1','*/',["a5",2,1]],
                ['a1','pin',[0,"adj1","maxAdj1"]],
                ['enAng','pin',[1,"adj3",21599999]],
                ['stAng','pin',[0,"adj4",21599999]],
                ['th','*/',["ss","a1",100000]],
                ['thh','*/',["ss","a5",100000]],
                ['th2','*/',["th",1,2]],
                ['rw1','+-',["wd2","th2","thh"]],
                ['rh1','+-',["hd2","th2","thh"]],
                ['rw2','+-',["rw1",0,"th"]],
                ['rh2','+-',["rh1",0,"th"]],
                ['rw3','+-',["rw2","th2",0]],
                ['rh3','+-',["rh2","th2",0]],
                ['wtH','sin',["rw3","enAng"]],
                ['htH','cos',["rh3","enAng"]],
                ['dxH','cat2',["rw3","htH","wtH"]],
                ['dyH','sat2',["rh3","htH","wtH"]],
                ['xH','+-',["hc","dxH",0]],
                ['yH','+-',["vc","dyH",0]],
                ['rI','min',["rw2","rh2"]],
                ['u1','*/',["dxH","dxH",1]],
                ['u2','*/',["dyH","dyH",1]],
                ['u3','*/',["rI","rI",1]],
                ['u4','+-',["u1",0,"u3"]],
                ['u5','+-',["u2",0,"u3"]],
                ['u6','*/',["u4","u5","u1"]],
                ['u7','*/',["u6",1,"u2"]],
                ['u8','+-',[1,0,"u7"]],
                ['u9','sqrt',["u8"]],
                ['u10','*/',["u4",1,"dxH"]],
                ['u11','*/',["u10",1,"dyH"]],
                ['u12','+/',[1,"u9","u11"]],
                ['u13','at2',[1,"u12"]],
                ['u14','+-',["u13",21600000,0]],
                ['u15','?:',["u13","u13","u14"]],
                ['u16','+-',["u15",0,"enAng"]],
                ['u17','+-',["u16",21600000,0]],
                ['u18','?:',["u16","u16","u17"]],
                ['u19','+-',["u18",0,"cd2"]],
                ['u20','+-',["u18",0,21600000]],
                ['u21','?:',["u19","u20","u18"]],
                ['maxAng','abs',["u21"]],
                ['aAng','pin',[0,"adj2","maxAng"]],
                ['ptAng','+-',["enAng","aAng",0]],
                ['wtA','sin',["rw3","ptAng"]],
                ['htA','cos',["rh3","ptAng"]],
                ['dxA','cat2',["rw3","htA","wtA"]],
                ['dyA','sat2',["rh3","htA","wtA"]],
                ['xA','+-',["hc","dxA",0]],
                ['yA','+-',["vc","dyA",0]],
                ['wtE','sin',["rw1","stAng"]],
                ['htE','cos',["rh1","stAng"]],
                ['dxE','cat2',["rw1","htE","wtE"]],
                ['dyE','sat2',["rh1","htE","wtE"]],
                ['xE','+-',["hc","dxE",0]],
                ['yE','+-',["vc","dyE",0]],
                ['dxG','cos',["thh","ptAng"]],
                ['dyG','sin',["thh","ptAng"]],
                ['xG','+-',["xH","dxG",0]],
                ['yG','+-',["yH","dyG",0]],
                ['dxB','cos',["thh","ptAng"]],
                ['dyB','sin',["thh","ptAng"]],
                ['xB','+-',["xH",0,"dxB",0]],
                ['yB','+-',["yH",0,"dyB",0]],
                ['sx1','+-',["xB",0,"hc"]],
                ['sy1','+-',["yB",0,"vc"]],
                ['sx2','+-',["xG",0,"hc"]],
                ['sy2','+-',["yG",0,"vc"]],
                ['rO','min',["rw1","rh1"]],
                ['x1O','*/',["sx1","rO","rw1"]],
                ['y1O','*/',["sy1","rO","rh1"]],
                ['x2O','*/',["sx2","rO","rw1"]],
                ['y2O','*/',["sy2","rO","rh1"]],
                ['dxO','+-',["x2O",0,"x1O"]],
                ['dyO','+-',["y2O",0,"y1O"]],
                ['dO','mod',["dxO","dyO",0]],
                ['q1','*/',["x1O","y2O",1]],
                ['q2','*/',["x2O","y1O",1]],
                ['DO','+-',["q1",0,"q2"]],
                ['q3','*/',["rO","rO",1]],
                ['q4','*/',["dO","dO",1]],
                ['q5','*/',["q3","q4",1]],
                ['q6','*/',["DO","DO",1]],
                ['q7','+-',["q5",0,"q6"]],
                ['q8','max',["q7",0]],
                ['sdelO','sqrt',["q8"]],
                ['ndyO','*/',["dyO",-1,1]],
                ['sdyO','?:',["ndyO",-1,1]],
                ['q9','*/',["sdyO","dxO",1]],
                ['q10','*/',["q9","sdelO",1]],
                ['q11','*/',["DO","dyO",1]],
                ['dxF1','+/',["q11","q10","q4"]],
                ['q12','+-',["q11",0,"q10"]],
                ['dxF2','*/',["q12",1,"q4"]],
                ['adyO','abs',["dyO"]],
                ['q13','*/',["adyO","sdelO",1]],
                ['q14','*/',["DO","dxO",-1]],
                ['dyF1','+/',["q14","q13","q4"]],
                ['q15','+-',["q14",0,"q13"]],
                ['dyF2','*/',["q15",1,"q4"]],
                ['q16','+-',["x2O",0,"dxF1"]],
                ['q17','+-',["x2O",0,"dxF2"]],
                ['q18','+-',["y2O",0,"dyF1"]],
                ['q19','+-',["y2O",0,"dyF2"]],
                ['q20','mod',["q16","q18",0]],
                ['q21','mod',["q17","q19",0]],
                ['q22','+-',["q21",0,"q20"]],
                ['dxF','?:',["q22","dxF1","dxF2"]],
                ['dyF','?:',["q22","dyF1","dyF2"]],
                ['sdxF','*/',["dxF","rw1","rO"]],
                ['sdyF','*/',["dyF","rh1","rO"]],
                ['xF','+-',["hc","sdxF",0]],
                ['yF','+-',["vc","sdyF",0]],
                ['x1I','*/',["sx1","rI","rw2"]],
                ['y1I','*/',["sy1","rI","rh2"]],
                ['x2I','*/',["sx2","rI","rw2"]],
                ['y2I','*/',["sy2","rI","rh2"]],
                ['dxI','+-',["x2I",0,"x1I"]],
                ['dyI','+-',["y2I",0,"y1I"]],
                ['dI','mod',["dxI","dyI",0]],
                ['v1','*/',["x1I","y2I",1]],
                ['v2','*/',["x2I","y1I",1]],
                ['DI','+-',["v1",0,"v2"]],
                ['v3','*/',["rI","rI",1]],
                ['v4','*/',["dI","dI",1]],
                ['v5','*/',["v3","v4",1]],
                ['v6','*/',["DI","DI",1]],
                ['v7','+-',["v5",0,"v6"]],
                ['v8','max',["v7",0]],
                ['sdelI','sqrt',["v8"]],
                ['v9','*/',["sdyO","dxI",1]],
                ['v10','*/',["v9","sdelI",1]],
                ['v11','*/',["DI","dyI",1]],
                ['dxC1','+/',["v11","v10","v4"]],
                ['v12','+-',["v11",0,"v10"]],
                ['dxC2','*/',["v12",1,"v4"]],
                ['adyI','abs',["dyI"]],
                ['v13','*/',["adyI","sdelI",1]],
                ['v14','*/',["DI","dxI",-1]],
                ['dyC1','+/',["v14","v13","v4"]],
                ['v15','+-',["v14",0,"v13"]],
                ['dyC2','*/',["v15",1,"v4"]],
                ['v16','+-',["x1I",0,"dxC1"]],
                ['v17','+-',["x1I",0,"dxC2"]],
                ['v18','+-',["y1I",0,"dyC1"]],
                ['v19','+-',["y1I",0,"dyC2"]],
                ['v20','mod',["v16","v18",0]],
                ['v21','mod',["v17","v19",0]],
                ['v22','+-',["v21",0,"v20"]],
                ['dxC','?:',["v22","dxC1","dxC2"]],
                ['dyC','?:',["v22","dyC1","dyC2"]],
                ['sdxC','*/',["dxC","rw2","rI"]],
                ['sdyC','*/',["dyC","rh2","rI"]],
                ['xC','+-',["hc","sdxC",0]],
                ['yC','+-',["vc","sdyC",0]],
                ['ist0','at2',["sdxC","sdyC"]],
                ['ist1','+-',["ist0",21600000,0]],
                ['istAng','?:',["ist0","ist0","ist1"]],
                ['isw1','+-',["stAng",0,"istAng"]],
                ['isw2','+-',["isw1",0,21600000]],
                ['iswAng','?:',["isw1","isw2","isw1"]],
                ['p1','+-',["xF",0,"xC"]],
                ['p2','+-',["yF",0,"yC"]],
                ['p3','mod',["p1","p2",0]],
                ['p4','*/',["p3",1,2]],
                ['p5','+-',["p4",0,"thh"]],
                ['xGp','?:',["p5","xF","xG"]],
                ['yGp','?:',["p5","yF","yG"]],
                ['xBp','?:',["p5","xC","xB"]],
                ['yBp','?:',["p5","yC","yB"]],
                ['en0','at2',["sdxF","sdyF"]],
                ['en1','+-',["en0",21600000,0]],
                ['en2','?:',["en0","en0","en1"]],
                ['sw0','+-',["en2",0,"stAng"]],
                ['sw1','+-',["sw0",21600000,0]],
                ['swAng','?:',["sw0","sw0","sw1"]],
                ['wtI','sin',["rw3","stAng"]],
                ['htI','cos',["rh3","stAng"]],
                ['dxI','cat2',["rw3","htI","wtI"]],
                ['dyI','sat2',["rh3","htI","wtI"]],
                ['xI','+-',["hc","dxI",0]],
                ['yI','+-',["vc","dyI",0]],
                ['aI','+-',["stAng",0,"cd4"]],
                ['aA','+-',["ptAng","cd4",0]],
                ['aB','+-',["ptAng","cd2",0]],
                ['idx','cos',["rw1",2700000]],
                ['idy','sin',["rh1",2700000]],
                ['il','+-',["hc",0,"idx"]],
                ['ir','+-',["hc","idx",0]],
                ['it','+-',["vc",0,"idy"]],
                ['ib','+-',["vc","idy",0]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","xE","yE"],
                    ["arcTo","rw1","rh1","stAng","swAng"],
                    ["lnTo","xGp","yGp"],
                    ["lnTo","xA","yA"],
                    ["lnTo","xBp","yBp"],
                    ["lnTo","xC","yC"],
                    ["arcTo","rw2","rh2","istAng","iswAng"],
                    ["close"],
                ]},
            ]
        },
        cloud: {
            gd: [
                ['il','*/',["w",2977,21600]],
                ['it','*/',["h",3262,21600]],
                ['ir','*/',["w",17087,21600]],
                ['ib','*/',["h",17337,21600]],
                ['g27','*/',["w",67,21600]],
                ['g28','*/',["h",21577,21600]],
                ['g29','*/',["w",21582,21600]],
                ['g30','*/',["h",1235,21600]],
            ],
            paths: [
                {w:43200,h:43200,cmds:[
                    ["moveTo",3900,14370],
                    ["arcTo",6753,9190,-11429249,7426832],
                    ["arcTo",5333,7267,-8646143,5396714],
                    ["arcTo",4365,5945,-8748475,5983381],
                    ["arcTo",4857,6595,-7859164,7034504],
                    ["arcTo",5333,7273,-4722533,6541615],
                    ["arcTo",6775,9220,-2776035,7816140],
                    ["arcTo",5785,7867,37501,6842000],
                    ["arcTo",6752,9215,1347096,6910353],
                    ["arcTo",7720,10543,3974558,4542661],
                    ["arcTo",4360,5918,-16496525,8804134],
                    ["arcTo",4345,5945,-14809710,9151131],
                    ["close"],
                ]},
                {w:43200,h:43200,fill:"none",cmds:[
                    ["moveTo",4693,26177],
                    ["arcTo",4345,5945,5204520,1585770],
                    ["moveTo",6928,34899],
                    ["arcTo",4360,5918,4416628,686848],
                    ["moveTo",16478,39090],
                    ["arcTo",6752,9215,8257449,844866],
                    ["moveTo",28827,34751],
                    ["arcTo",6752,9215,387196,959901],
                    ["moveTo",34129,22954],
                    ["arcTo",5785,7867,-4217541,4255042],
                    ["moveTo",41798,15354],
                    ["arcTo",5333,7273,1819082,1665090],
                    ["moveTo",38324,5426],
                    ["arcTo",4857,6595,-824660,891534],
                    ["moveTo",29078,3952],
                    ["arcTo",4857,6595,-8950887,1091722],
                    ["moveTo",22141,4720],
                    ["arcTo",4365,5945,-9809656,1061181],
                    ["moveTo",14000,5192],
                    ["arcTo",6753,9190,-4002417,739161],
                    ["moveTo",4127,15789],
                    ["arcTo",6753,9190,9459261,711490],
                ]},
            ]
        },
        cloudCallout: {
            av: {adj1:-20833,adj2:62500},
            gd: [
                ['dxPos','*/',["w","adj1",100000]],
                ['dyPos','*/',["h","adj2",100000]],
                ['xPos','+-',["hc","dxPos",0]],
                ['yPos','+-',["vc","dyPos",0]],
                ['ht','cat2',["hd2","dxPos","dyPos"]],
                ['wt','sat2',["wd2","dxPos","dyPos"]],
                ['g2','cat2',["wd2","ht","wt"]],
                ['g3','sat2',["hd2","ht","wt"]],
                ['g4','+-',["hc","g2",0]],
                ['g5','+-',["vc","g3",0]],
                ['g6','+-',["g4",0,"xPos"]],
                ['g7','+-',["g5",0,"yPos"]],
                ['g8','mod',["g6","g7",0]],
                ['g9','*/',["ss",6600,21600]],
                ['g10','+-',["g8",0,"g9"]],
                ['g11','*/',["g10",1,3]],
                ['g12','*/',["ss",1800,21600]],
                ['g13','+-',["g11","g12",0]],
                ['g14','*/',["g13","g6","g8"]],
                ['g15','*/',["g13","g7","g8"]],
                ['g16','+-',["g14","xPos",0]],
                ['g17','+-',["g15","yPos",0]],
                ['g18','*/',["ss",4800,21600]],
                ['g19','*/',["g11",2,1]],
                ['g20','+-',["g18","g19",0]],
                ['g21','*/',["g20","g6","g8"]],
                ['g22','*/',["g20","g7","g8"]],
                ['g23','+-',["g21","xPos",0]],
                ['g24','+-',["g22","yPos",0]],
                ['g25','*/',["ss",1200,21600]],
                ['g26','*/',["ss",600,21600]],
                ['x23','+-',["xPos","g26",0]],
                ['x24','+-',["g16","g25",0]],
                ['x25','+-',["g23","g12",0]],
                ['il','*/',["w",2977,21600]],
                ['it','*/',["h",3262,21600]],
                ['ir','*/',["w",17087,21600]],
                ['ib','*/',["h",17337,21600]],
                ['g27','*/',["w",67,21600]],
                ['g28','*/',["h",21577,21600]],
                ['g29','*/',["w",21582,21600]],
                ['g30','*/',["h",1235,21600]],
                ['pang','at2',["dxPos","dyPos"]],
            ],
            paths: [
                {w:43200,h:43200,cmds:[
                    ["moveTo",3900,14370],
                    ["arcTo",6753,9190,-11429249,7426832],
                    ["arcTo",5333,7267,-8646143,5396714],
                    ["arcTo",4365,5945,-8748475,5983381],
                    ["arcTo",4857,6595,-7859164,7034504],
                    ["arcTo",5333,7273,-4722533,6541615],
                    ["arcTo",6775,9220,-2776035,7816140],
                    ["arcTo",5785,7867,37501,6842000],
                    ["arcTo",6752,9215,1347096,6910353],
                    ["arcTo",7720,10543,3974558,4542661],
                    ["arcTo",4360,5918,-16496525,8804134],
                    ["arcTo",4345,5945,-14809710,9151131],
                    ["close"],
                ]},
                {cmds:[["moveTo","x23","yPos"],["arcTo","g26","g26",0,21600000],["close"]]},
                {cmds:[["moveTo","x24","g17"],["arcTo","g25","g25",0,21600000],["close"]]},
                {cmds:[["moveTo","x25","g24"],["arcTo","g12","g12",0,21600000],["close"]]},
                {w:43200,h:43200,fill:"none",cmds:[
                    ["moveTo",4693,26177],
                    ["arcTo",4345,5945,5204520,1585770],
                    ["moveTo",6928,34899],
                    ["arcTo",4360,5918,4416628,686848],
                    ["moveTo",16478,39090],
                    ["arcTo",6752,9215,8257449,844866],
                    ["moveTo",28827,34751],
                    ["arcTo",6752,9215,387196,959901],
                    ["moveTo",34129,22954],
                    ["arcTo",5785,7867,-4217541,4255042],
                    ["moveTo",41798,15354],
                    ["arcTo",5333,7273,1819082,1665090],
                    ["moveTo",38324,5426],
                    ["arcTo",4857,6595,-824660,891534],
                    ["moveTo",29078,3952],
                    ["arcTo",4857,6595,-8950887,1091722],
                    ["moveTo",22141,4720],
                    ["arcTo",4365,5945,-9809656,1061181],
                    ["moveTo",14000,5192],
                    ["arcTo",6753,9190,-4002417,739161],
                    ["moveTo",4127,15789],
                    ["arcTo",6753,9190,9459261,711490],
                ]},
            ]
        },
        corner: {
            av: {adj1:50000,adj2:50000},
            gd: [
                ['maxAdj1','*/',[100000,"h","ss"]],
                ['maxAdj2','*/',[100000,"w","ss"]],
                ['a1','pin',[0,"adj1","maxAdj1"]],
                ['a2','pin',[0,"adj2","maxAdj2"]],
                ['x1','*/',["ss","a2",100000]],
                ['dy1','*/',["ss","a1",100000]],
                ['y1','+-',["b",0,"dy1"]],
                ['cx1','*/',["x1",1,2]],
                ['cy1','+/',["y1","b",2]],
                ['d','+-',["w",0,"h"]],
                ['it','?:',["d","y1","t"]],
                ['ir','?:',["d","r","x1"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","t"],
                    ["lnTo","x1","t"],
                    ["lnTo","x1","y1"],
                    ["lnTo","r","y1"],
                    ["lnTo","r","b"],
                    ["lnTo","l","b"],
                    ["close"],
                ]},
            ]
        },
        cornerTabs: {
            gd: [['md','mod',["w","h",0]],['dx','*/',[1,"md",20]],['y1','+-',[0,"b","dx"]],['x1','+-',[0,"r","dx"]]],
            paths: [
                {cmds:[["moveTo","l","t"],["lnTo","dx","t"],["lnTo","l","dx"],["close"]]},
                {cmds:[["moveTo","l","y1"],["lnTo","dx","b"],["lnTo","l","b"],["close"]]},
                {cmds:[["moveTo","x1","t"],["lnTo","r","t"],["lnTo","r","dx"],["close"]]},
                {cmds:[["moveTo","r","y1"],["lnTo","r","b"],["lnTo","x1","b"],["close"]]},
            ]
        },
        cube: {
            av: {adj:25000},
            gd: [
                ['a','pin',[0,"adj",100000]],
                ['y1','*/',["ss","a",100000]],
                ['y4','+-',["b",0,"y1"]],
                ['y2','*/',["y4",1,2]],
                ['y3','+/',["y1","b",2]],
                ['x4','+-',["r",0,"y1"]],
                ['x2','*/',["x4",1,2]],
                ['x3','+/',["y1","r",2]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","l","y1"],
                    ["lnTo","x4","y1"],
                    ["lnTo","x4","b"],
                    ["lnTo","l","b"],
                    ["close"],
                ]},
                {fill:"darkenLess",stroke:"false",cmds:[
                    ["moveTo","x4","y1"],
                    ["lnTo","r","t"],
                    ["lnTo","r","y4"],
                    ["lnTo","x4","b"],
                    ["close"],
                ]},
                {fill:"lightenLess",stroke:"false",cmds:[
                    ["moveTo","l","y1"],
                    ["lnTo","y1","t"],
                    ["lnTo","r","t"],
                    ["lnTo","x4","y1"],
                    ["close"],
                ]},
                {fill:"none",cmds:[
                    ["moveTo","l","y1"],
                    ["lnTo","y1","t"],
                    ["lnTo","r","t"],
                    ["lnTo","r","y4"],
                    ["lnTo","x4","b"],
                    ["lnTo","l","b"],
                    ["close"],
                    ["moveTo","l","y1"],
                    ["lnTo","x4","y1"],
                    ["lnTo","r","t"],
                    ["moveTo","x4","y1"],
                    ["lnTo","x4","b"],
                ]},
            ]
        },
        curvedDownArrow: {
            av: {adj1:25000,adj2:50000,adj3:25000},
            gd: [
                ['maxAdj2','*/',[50000,"w","ss"]],
                ['a2','pin',[0,"adj2","maxAdj2"]],
                ['a1','pin',[0,"adj1",100000]],
                ['th','*/',["ss","a1",100000]],
                ['aw','*/',["ss","a2",100000]],
                ['q1','+/',["th","aw",4]],
                ['wR','+-',["wd2",0,"q1"]],
                ['q7','*/',["wR",2,1]],
                ['q8','*/',["q7","q7",1]],
                ['q9','*/',["th","th",1]],
                ['q10','+-',["q8",0,"q9"]],
                ['q11','sqrt',["q10"]],
                ['idy','*/',["q11","h","q7"]],
                ['maxAdj3','*/',[100000,"idy","ss"]],
                ['a3','pin',[0,"adj3","maxAdj3"]],
                ['ah','*/',["ss","adj3",100000]],
                ['x3','+-',["wR","th",0]],
                ['q2','*/',["h","h",1]],
                ['q3','*/',["ah","ah",1]],
                ['q4','+-',["q2",0,"q3"]],
                ['q5','sqrt',["q4"]],
                ['dx','*/',["q5","wR","h"]],
                ['x5','+-',["wR","dx",0]],
                ['x7','+-',["x3","dx",0]],
                ['q6','+-',["aw",0,"th"]],
                ['dh','*/',["q6",1,2]],
                ['x4','+-',["x5",0,"dh"]],
                ['x8','+-',["x7","dh",0]],
                ['aw2','*/',["aw",1,2]],
                ['x6','+-',["r",0,"aw2"]],
                ['y1','+-',["b",0,"ah"]],
                ['swAng','at2',["ah","dx"]],
                ['mswAng','+-',[0,0,"swAng"]],
                ['iy','+-',["b",0,"idy"]],
                ['ix','+/',["wR","x3",2]],
                ['q12','*/',["th",1,2]],
                ['dang2','at2',["idy","q12"]],
                ['stAng','+-',["3cd4","swAng",0]],
                ['stAng2','+-',["3cd4",0,"dang2"]],
                ['swAng2','+-',["dang2",0,"cd4"]],
                ['swAng3','+-',["cd4","dang2",0]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","x6","b"],
                    ["lnTo","x4","y1"],
                    ["lnTo","x5","y1"],
                    ["arcTo","wR","h","stAng","mswAng"],
                    ["lnTo","x3","t"],
                    ["arcTo","wR","h","3cd4","swAng"],
                    ["lnTo","x8","y1"],
                    ["close"],
                ]},
                {fill:"darkenLess",stroke:"false",cmds:[
                    ["moveTo","ix","iy"],
                    ["arcTo","wR","h","stAng2","swAng2"],
                    ["lnTo","l","b"],
                    ["arcTo","wR","h","cd2","swAng3"],
                    ["close"],
                ]},
                {fill:"none",cmds:[
                    ["moveTo","ix","iy"],
                    ["arcTo","wR","h","stAng2","swAng2"],
                    ["lnTo","l","b"],
                    ["arcTo","wR","h","cd2","cd4"],
                    ["lnTo","x3","t"],
                    ["arcTo","wR","h","3cd4","swAng"],
                    ["lnTo","x8","y1"],
                    ["lnTo","x6","b"],
                    ["lnTo","x4","y1"],
                    ["lnTo","x5","y1"],
                    ["arcTo","wR","h","stAng","mswAng"],
                ]},
            ]
        },
        curvedLeftArrow: {
            av: {adj1:25000,adj2:50000,adj3:25000},
            gd: [
                ['maxAdj2','*/',[50000,"h","ss"]],
                ['a2','pin',[0,"adj2","maxAdj2"]],
                ['a1','pin',[0,"adj1","a2"]],
                ['th','*/',["ss","a1",100000]],
                ['aw','*/',["ss","a2",100000]],
                ['q1','+/',["th","aw",4]],
                ['hR','+-',["hd2",0,"q1"]],
                ['q7','*/',["hR",2,1]],
                ['q8','*/',["q7","q7",1]],
                ['q9','*/',["th","th",1]],
                ['q10','+-',["q8",0,"q9"]],
                ['q11','sqrt',["q10"]],
                ['idx','*/',["q11","w","q7"]],
                ['maxAdj3','*/',[100000,"idx","ss"]],
                ['a3','pin',[0,"adj3","maxAdj3"]],
                ['ah','*/',["ss","a3",100000]],
                ['y3','+-',["hR","th",0]],
                ['q2','*/',["w","w",1]],
                ['q3','*/',["ah","ah",1]],
                ['q4','+-',["q2",0,"q3"]],
                ['q5','sqrt',["q4"]],
                ['dy','*/',["q5","hR","w"]],
                ['y5','+-',["hR","dy",0]],
                ['y7','+-',["y3","dy",0]],
                ['q6','+-',["aw",0,"th"]],
                ['dh','*/',["q6",1,2]],
                ['y4','+-',["y5",0,"dh"]],
                ['y8','+-',["y7","dh",0]],
                ['aw2','*/',["aw",1,2]],
                ['y6','+-',["b",0,"aw2"]],
                ['x1','+-',["l","ah",0]],
                ['swAng','at2',["ah","dy"]],
                ['mswAng','+-',[0,0,"swAng"]],
                ['ix','+-',["l","idx",0]],
                ['iy','+/',["hR","y3",2]],
                ['q12','*/',["th",1,2]],
                ['dang2','at2',["idx","q12"]],
                ['swAng2','+-',["dang2",0,"swAng"]],
                ['swAng3','+-',["swAng","dang2",0]],
                ['stAng3','+-',[0,0,"dang2"]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","l","y6"],
                    ["lnTo","x1","y4"],
                    ["lnTo","x1","y5"],
                    ["arcTo","w","hR","swAng","swAng2"],
                    ["arcTo","w","hR","stAng3","swAng3"],
                    ["lnTo","x1","y8"],
                    ["close"],
                ]},
                {fill:"darkenLess",stroke:"false",cmds:[
                    ["moveTo","r","y3"],
                    ["arcTo","w","hR",0,-5400000],
                    ["lnTo","l","t"],
                    ["arcTo","w","hR","3cd4","cd4"],
                    ["close"],
                ]},
                {fill:"none",cmds:[
                    ["moveTo","r","y3"],
                    ["arcTo","w","hR",0,-5400000],
                    ["lnTo","l","t"],
                    ["arcTo","w","hR","3cd4","cd4"],
                    ["lnTo","r","y3"],
                    ["arcTo","w","hR",0,"swAng"],
                    ["lnTo","x1","y8"],
                    ["lnTo","l","y6"],
                    ["lnTo","x1","y4"],
                    ["lnTo","x1","y5"],
                    ["arcTo","w","hR","swAng","swAng2"],
                ]},
            ]
        },
        curvedRightArrow: {
            av: {adj1:25000,adj2:50000,adj3:25000},
            gd: [
                ['maxAdj2','*/',[50000,"h","ss"]],
                ['a2','pin',[0,"adj2","maxAdj2"]],
                ['a1','pin',[0,"adj1","a2"]],
                ['th','*/',["ss","a1",100000]],
                ['aw','*/',["ss","a2",100000]],
                ['q1','+/',["th","aw",4]],
                ['hR','+-',["hd2",0,"q1"]],
                ['q7','*/',["hR",2,1]],
                ['q8','*/',["q7","q7",1]],
                ['q9','*/',["th","th",1]],
                ['q10','+-',["q8",0,"q9"]],
                ['q11','sqrt',["q10"]],
                ['idx','*/',["q11","w","q7"]],
                ['maxAdj3','*/',[100000,"idx","ss"]],
                ['a3','pin',[0,"adj3","maxAdj3"]],
                ['ah','*/',["ss","a3",100000]],
                ['y3','+-',["hR","th",0]],
                ['q2','*/',["w","w",1]],
                ['q3','*/',["ah","ah",1]],
                ['q4','+-',["q2",0,"q3"]],
                ['q5','sqrt',["q4"]],
                ['dy','*/',["q5","hR","w"]],
                ['y5','+-',["hR","dy",0]],
                ['y7','+-',["y3","dy",0]],
                ['q6','+-',["aw",0,"th"]],
                ['dh','*/',["q6",1,2]],
                ['y4','+-',["y5",0,"dh"]],
                ['y8','+-',["y7","dh",0]],
                ['aw2','*/',["aw",1,2]],
                ['y6','+-',["b",0,"aw2"]],
                ['x1','+-',["r",0,"ah"]],
                ['swAng','at2',["ah","dy"]],
                ['stAng','+-',["cd2",0,"swAng"]],
                ['mswAng','+-',[0,0,"swAng"]],
                ['ix','+-',["r",0,"idx"]],
                ['iy','+/',["hR","y3",2]],
                ['q12','*/',["th",1,2]],
                ['dang2','at2',["idx","q12"]],
                ['swAng2','+-',["dang2",0,"cd4"]],
                ['swAng3','+-',["cd4","dang2",0]],
                ['stAng3','+-',["cd2",0,"dang2"]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","l","hR"],
                    ["arcTo","w","hR","cd2","mswAng"],
                    ["lnTo","x1","y4"],
                    ["lnTo","r","y6"],
                    ["lnTo","x1","y8"],
                    ["lnTo","x1","y7"],
                    ["arcTo","w","hR","stAng","swAng"],
                    ["close"],
                ]},
                {fill:"darkenLess",stroke:"false",cmds:[
                    ["moveTo","r","th"],
                    ["arcTo","w","hR","3cd4","swAng2"],
                    ["arcTo","w","hR","stAng3","swAng3"],
                    ["close"],
                ]},
                {fill:"none",cmds:[
                    ["moveTo","l","hR"],
                    ["arcTo","w","hR","cd2","mswAng"],
                    ["lnTo","x1","y4"],
                    ["lnTo","r","y6"],
                    ["lnTo","x1","y8"],
                    ["lnTo","x1","y7"],
                    ["arcTo","w","hR","stAng","swAng"],
                    ["lnTo","l","hR"],
                    ["arcTo","w","hR","cd2","cd4"],
                    ["lnTo","r","th"],
                    ["arcTo","w","hR","3cd4","swAng2"],
                ]},
            ]
        },
        curvedUpArrow: {
            av: {adj1:25000,adj2:50000,adj3:25000},
            gd: [
                ['maxAdj2','*/',[50000,"w","ss"]],
                ['a2','pin',[0,"adj2","maxAdj2"]],
                ['a1','pin',[0,"adj1",100000]],
                ['th','*/',["ss","a1",100000]],
                ['aw','*/',["ss","a2",100000]],
                ['q1','+/',["th","aw",4]],
                ['wR','+-',["wd2",0,"q1"]],
                ['q7','*/',["wR",2,1]],
                ['q8','*/',["q7","q7",1]],
                ['q9','*/',["th","th",1]],
                ['q10','+-',["q8",0,"q9"]],
                ['q11','sqrt',["q10"]],
                ['idy','*/',["q11","h","q7"]],
                ['maxAdj3','*/',[100000,"idy","ss"]],
                ['a3','pin',[0,"adj3","maxAdj3"]],
                ['ah','*/',["ss","adj3",100000]],
                ['x3','+-',["wR","th",0]],
                ['q2','*/',["h","h",1]],
                ['q3','*/',["ah","ah",1]],
                ['q4','+-',["q2",0,"q3"]],
                ['q5','sqrt',["q4"]],
                ['dx','*/',["q5","wR","h"]],
                ['x5','+-',["wR","dx",0]],
                ['x7','+-',["x3","dx",0]],
                ['q6','+-',["aw",0,"th"]],
                ['dh','*/',["q6",1,2]],
                ['x4','+-',["x5",0,"dh"]],
                ['x8','+-',["x7","dh",0]],
                ['aw2','*/',["aw",1,2]],
                ['x6','+-',["r",0,"aw2"]],
                ['y1','+-',["t","ah",0]],
                ['swAng','at2',["ah","dx"]],
                ['mswAng','+-',[0,0,"swAng"]],
                ['iy','+-',["t","idy",0]],
                ['ix','+/',["wR","x3",2]],
                ['q12','*/',["th",1,2]],
                ['dang2','at2',["idy","q12"]],
                ['swAng2','+-',["dang2",0,"swAng"]],
                ['mswAng2','+-',[0,0,"swAng2"]],
                ['stAng3','+-',["cd4",0,"swAng"]],
                ['swAng3','+-',["swAng","dang2",0]],
                ['stAng2','+-',["cd4",0,"dang2"]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","x6","t"],
                    ["lnTo","x8","y1"],
                    ["lnTo","x7","y1"],
                    ["arcTo","wR","h","stAng3","swAng3"],
                    ["arcTo","wR","h","stAng2","swAng2"],
                    ["lnTo","x4","y1"],
                    ["close"],
                ]},
                {fill:"darkenLess",stroke:"false",cmds:[
                    ["moveTo","wR","b"],
                    ["arcTo","wR","h","cd4","cd4"],
                    ["lnTo","th","t"],
                    ["arcTo","wR","h","cd2",-5400000],
                    ["close"],
                ]},
                {fill:"none",cmds:[
                    ["moveTo","ix","iy"],
                    ["arcTo","wR","h","stAng2","swAng2"],
                    ["lnTo","x4","y1"],
                    ["lnTo","x6","t"],
                    ["lnTo","x8","y1"],
                    ["lnTo","x7","y1"],
                    ["arcTo","wR","h","stAng3","swAng"],
                    ["lnTo","wR","b"],
                    ["arcTo","wR","h","cd4","cd4"],
                    ["lnTo","th","t"],
                    ["arcTo","wR","h","cd2",-5400000],
                ]},
            ]
        },
        decagon: {
            av: {vf:105146},
            gd: [
                ['shd2','*/',["hd2","vf",100000]],
                ['dx1','cos',["wd2",2160000]],
                ['dx2','cos',["wd2",4320000]],
                ['x1','+-',["hc",0,"dx1"]],
                ['x2','+-',["hc",0,"dx2"]],
                ['x3','+-',["hc","dx2",0]],
                ['x4','+-',["hc","dx1",0]],
                ['dy1','sin',["shd2",4320000]],
                ['dy2','sin',["shd2",2160000]],
                ['y1','+-',["vc",0,"dy1"]],
                ['y2','+-',["vc",0,"dy2"]],
                ['y3','+-',["vc","dy2",0]],
                ['y4','+-',["vc","dy1",0]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","vc"],
                    ["lnTo","x1","y2"],
                    ["lnTo","x2","y1"],
                    ["lnTo","x3","y1"],
                    ["lnTo","x4","y2"],
                    ["lnTo","r","vc"],
                    ["lnTo","x4","y3"],
                    ["lnTo","x3","y4"],
                    ["lnTo","x2","y4"],
                    ["lnTo","x1","y3"],
                    ["close"],
                ]},
            ]
        },
        diagStripe: {
            av: {adj:50000},
            gd: [
                ['a','pin',[0,"adj",100000]],
                ['x2','*/',["w","a",100000]],
                ['x1','*/',["x2",1,2]],
                ['x3','+/',["x2","r",2]],
                ['y2','*/',["h","a",100000]],
                ['y1','*/',["y2",1,2]],
                ['y3','+/',["y2","b",2]],
            ],
            paths: [
                {cmds:[["moveTo","l","y2"],["lnTo","x2","t"],["lnTo","r","t"],["lnTo","l","b"],["close"]]},
            ]
        },
        diamond: {
            gd: [['ir','*/',["w",3,4]],['ib','*/',["h",3,4]]],
            paths: [
                {cmds:[["moveTo","l","vc"],["lnTo","hc","t"],["lnTo","r","vc"],["lnTo","hc","b"],["close"]]},
            ]
        },
        dodecagon: {
            gd: [
                ['x1','*/',["w",2894,21600]],
                ['x2','*/',["w",7906,21600]],
                ['x3','*/',["w",13694,21600]],
                ['x4','*/',["w",18706,21600]],
                ['y1','*/',["h",2894,21600]],
                ['y2','*/',["h",7906,21600]],
                ['y3','*/',["h",13694,21600]],
                ['y4','*/',["h",18706,21600]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","y2"],
                    ["lnTo","x1","y1"],
                    ["lnTo","x2","t"],
                    ["lnTo","x3","t"],
                    ["lnTo","x4","y1"],
                    ["lnTo","r","y2"],
                    ["lnTo","r","y3"],
                    ["lnTo","x4","y4"],
                    ["lnTo","x3","b"],
                    ["lnTo","x2","b"],
                    ["lnTo","x1","y4"],
                    ["lnTo","l","y3"],
                    ["close"],
                ]},
            ]
        },
        donut: {
            av: {adj:25000},
            gd: [
                ['a','pin',[0,"adj",50000]],
                ['dr','*/',["ss","a",100000]],
                ['iwd2','+-',["wd2",0,"dr"]],
                ['ihd2','+-',["hd2",0,"dr"]],
                ['idx','cos',["wd2",2700000]],
                ['idy','sin',["hd2",2700000]],
                ['il','+-',["hc",0,"idx"]],
                ['ir','+-',["hc","idx",0]],
                ['it','+-',["vc",0,"idy"]],
                ['ib','+-',["vc","idy",0]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","vc"],
                    ["arcTo","wd2","hd2","cd2","cd4"],
                    ["arcTo","wd2","hd2","3cd4","cd4"],
                    ["arcTo","wd2","hd2",0,"cd4"],
                    ["arcTo","wd2","hd2","cd4","cd4"],
                    ["close"],
                    ["moveTo","dr","vc"],
                    ["arcTo","iwd2","ihd2","cd2",-5400000],
                    ["arcTo","iwd2","ihd2","cd4",-5400000],
                    ["arcTo","iwd2","ihd2",0,-5400000],
                    ["arcTo","iwd2","ihd2","3cd4",-5400000],
                    ["close"],
                ]},
            ]
        },
        doubleWave: {
            av: {adj1:6250,adj2:0},
            gd: [
                ['a1','pin',[0,"adj1",12500]],
                ['a2','pin',[-10000,"adj2",10000]],
                ['y1','*/',["h","a1",100000]],
                ['dy2','*/',["y1",10,3]],
                ['y2','+-',["y1",0,"dy2"]],
                ['y3','+-',["y1","dy2",0]],
                ['y4','+-',["b",0,"y1"]],
                ['y5','+-',["y4",0,"dy2"]],
                ['y6','+-',["y4","dy2",0]],
                ['dx1','*/',["w","a2",100000]],
                ['of2','*/',["w","a2",50000]],
                ['x1','abs',["dx1"]],
                ['dx2','?:',["of2",0,"of2"]],
                ['x2','+-',["l",0,"dx2"]],
                ['dx8','?:',["of2","of2",0]],
                ['x8','+-',["r",0,"dx8"]],
                ['dx3','+/',["dx2","x8",6]],
                ['x3','+-',["x2","dx3",0]],
                ['dx4','+/',["dx2","x8",3]],
                ['x4','+-',["x2","dx4",0]],
                ['x5','+/',["x2","x8",2]],
                ['x6','+-',["x5","dx3",0]],
                ['x7','+/',["x6","x8",2]],
                ['x9','+-',["l","dx8",0]],
                ['x15','+-',["r","dx2",0]],
                ['x10','+-',["x9","dx3",0]],
                ['x11','+-',["x9","dx4",0]],
                ['x12','+/',["x9","x15",2]],
                ['x13','+-',["x12","dx3",0]],
                ['x14','+/',["x13","x15",2]],
                ['x16','+-',["r",0,"x1"]],
                ['xAdj','+-',["hc","dx1",0]],
                ['il','max',["x2","x9"]],
                ['ir','min',["x8","x15"]],
                ['it','*/',["h","a1",50000]],
                ['ib','+-',["b",0,"it"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","x2","y1"],
                    ["cubicBezTo","x3","y2","x4","y3","x5","y1"],
                    ["cubicBezTo","x6","y2","x7","y3","x8","y1"],
                    ["lnTo","x15","y4"],
                    ["cubicBezTo","x14","y6","x13","y5","x12","y4"],
                    ["cubicBezTo","x11","y6","x10","y5","x9","y4"],
                    ["close"],
                ]},
            ]
        },
        downArrow: {
            av: {adj1:50000,adj2:50000},
            gd: [
                ['maxAdj2','*/',[100000,"h","ss"]],
                ['a1','pin',[0,"adj1",100000]],
                ['a2','pin',[0,"adj2","maxAdj2"]],
                ['dy1','*/',["ss","a2",100000]],
                ['y1','+-',["b",0,"dy1"]],
                ['dx1','*/',["w","a1",200000]],
                ['x1','+-',["hc",0,"dx1"]],
                ['x2','+-',["hc","dx1",0]],
                ['dy2','*/',["x1","dy1","wd2"]],
                ['y2','+-',["y1","dy2",0]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","y1"],
                    ["lnTo","x1","y1"],
                    ["lnTo","x1","t"],
                    ["lnTo","x2","t"],
                    ["lnTo","x2","y1"],
                    ["lnTo","r","y1"],
                    ["lnTo","hc","b"],
                    ["close"],
                ]},
            ]
        },
        upArrow: {
            av: {adj1:50000,adj2:50000},
            gd: [
                ['maxAdj2','*/',[100000,"h","ss"]],
                ['a1','pin',[0,"adj1",100000]],
                ['a2','pin',[0,"adj2","maxAdj2"]],
                ['dy1','*/',["ss","a2",100000]],
                ['y1','+-',["t","dy1",0]],
                ['dx1','*/',["w","a1",200000]],
                ['x1','+-',["hc",0,"dx1"]],
                ['x2','+-',["hc","dx1",0]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","y1"],
                    ["lnTo","hc","t"],
                    ["lnTo","r","y1"],
                    ["lnTo","x2","y1"],
                    ["lnTo","x2","b"],
                    ["lnTo","x1","b"],
                    ["lnTo","x1","y1"],
                    ["close"],
                ]},
            ]
        },
        downArrowCallout: {
            av: {adj1:25000,adj2:25000,adj3:25000,adj4:64977},
            gd: [
                ['maxAdj2','*/',[50000,"w","ss"]],
                ['a2','pin',[0,"adj2","maxAdj2"]],
                ['maxAdj1','*/',["a2",2,1]],
                ['a1','pin',[0,"adj1","maxAdj1"]],
                ['maxAdj3','*/',[100000,"h","ss"]],
                ['a3','pin',[0,"adj3","maxAdj3"]],
                ['q2','*/',["a3","ss","h"]],
                ['maxAdj4','+-',[100000,0,"q2"]],
                ['a4','pin',[0,"adj4","maxAdj4"]],
                ['dx1','*/',["ss","a2",100000]],
                ['dx2','*/',["ss","a1",200000]],
                ['x1','+-',["hc",0,"dx1"]],
                ['x2','+-',["hc",0,"dx2"]],
                ['x3','+-',["hc","dx2",0]],
                ['x4','+-',["hc","dx1",0]],
                ['dy3','*/',["ss","a3",100000]],
                ['y3','+-',["b",0,"dy3"]],
                ['y2','*/',["h","a4",100000]],
                ['y1','*/',["y2",1,2]],
            ],
            rect: {l:'l',t:'t',r:'r',b:'y2'},
            paths: [
                {cmds:[
                    ["moveTo","l","t"],
                    ["lnTo","r","t"],
                    ["lnTo","r","y2"],
                    ["lnTo","x3","y2"],
                    ["lnTo","x3","y3"],
                    ["lnTo","x4","y3"],
                    ["lnTo","hc","b"],
                    ["lnTo","x1","y3"],
                    ["lnTo","x2","y3"],
                    ["lnTo","x2","y2"],
                    ["lnTo","l","y2"],
                    ["close"],
                ]},
            ]
        },
        ellipse: {
            gd: [
                ['idx','cos',["wd2",2700000]],
                ['idy','sin',["hd2",2700000]],
                ['il','+-',["hc",0,"idx"]],
                ['ir','+-',["hc","idx",0]],
                ['it','+-',["vc",0,"idy"]],
                ['ib','+-',["vc","idy",0]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","vc"],
                    ["arcTo","wd2","hd2","cd2","cd4"],
                    ["arcTo","wd2","hd2","3cd4","cd4"],
                    ["arcTo","wd2","hd2",0,"cd4"],
                    ["arcTo","wd2","hd2","cd4","cd4"],
                    ["close"],
                ]},
            ]
        },
        ellipseRibbon: {
            av: {adj1:25000,adj2:50000,adj3:12500},
            gd: [
                ['a1','pin',[0,"adj1",100000]],
                ['a2','pin',[25000,"adj2",75000]],
                ['q10','+-',[100000,0,"a1"]],
                ['q11','*/',["q10",1,2]],
                ['q12','+-',["a1",0,"q11"]],
                ['minAdj3','max',[0,"q12"]],
                ['a3','pin',["minAdj3","adj3","a1"]],
                ['dx2','*/',["w","a2",200000]],
                ['x2','+-',["hc",0,"dx2"]],
                ['x3','+-',["x2","wd8",0]],
                ['x4','+-',["r",0,"x3"]],
                ['x5','+-',["r",0,"x2"]],
                ['x6','+-',["r",0,"wd8"]],
                ['dy1','*/',["h","a3",100000]],
                ['f1','*/',[4,"dy1","w"]],
                ['q1','*/',["x3","x3","w"]],
                ['q2','+-',["x3",0,"q1"]],
                ['y1','*/',["f1","q2",1]],
                ['cx1','*/',["x3",1,2]],
                ['cy1','*/',["f1","cx1",1]],
                ['cx2','+-',["r",0,"cx1"]],
                ['q1','*/',["h","a1",100000]],
                ['dy3','+-',["q1",0,"dy1"]],
                ['q3','*/',["x2","x2","w"]],
                ['q4','+-',["x2",0,"q3"]],
                ['q5','*/',["f1","q4",1]],
                ['y3','+-',["q5","dy3",0]],
                ['q6','+-',["dy1","dy3","y3"]],
                ['q7','+-',["q6","dy1",0]],
                ['cy3','+-',["q7","dy3",0]],
                ['rh','+-',["b",0,"q1"]],
                ['q8','*/',["dy1",14,16]],
                ['y2','+/',["q8","rh",2]],
                ['y5','+-',["q5","rh",0]],
                ['y6','+-',["y3","rh",0]],
                ['cx4','*/',["x2",1,2]],
                ['q9','*/',["f1","cx4",1]],
                ['cy4','+-',["q9","rh",0]],
                ['cx5','+-',["r",0,"cx4"]],
                ['cy6','+-',["cy3","rh",0]],
                ['y7','+-',["y1","dy3",0]],
                ['cy7','+-',["q1","q1","y7"]],
                ['y8','+-',["b",0,"dy1"]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","l","t"],
                    ["quadBezTo","cx1","cy1","x3","y1"],
                    ["lnTo","x2","y3"],
                    ["quadBezTo","hc","cy3","x5","y3"],
                    ["lnTo","x4","y1"],
                    ["quadBezTo","cx2","cy1","r","t"],
                    ["lnTo","x6","y2"],
                    ["lnTo","r","rh"],
                    ["quadBezTo","cx5","cy4","x5","y5"],
                    ["lnTo","x5","y6"],
                    ["quadBezTo","hc","cy6","x2","y6"],
                    ["lnTo","x2","y5"],
                    ["quadBezTo","cx4","cy4","l","rh"],
                    ["lnTo","wd8","y2"],
                    ["close"],
                ]},
                {fill:"darkenLess",stroke:"false",cmds:[
                    ["moveTo","x3","y7"],
                    ["lnTo","x3","y1"],
                    ["lnTo","x2","y3"],
                    ["quadBezTo","hc","cy3","x5","y3"],
                    ["lnTo","x4","y1"],
                    ["lnTo","x4","y7"],
                    ["quadBezTo","hc","cy7","x3","y7"],
                    ["close"],
                ]},
                {fill:"none",cmds:[
                    ["moveTo","l","t"],
                    ["quadBezTo","cx1","cy1","x3","y1"],
                    ["lnTo","x2","y3"],
                    ["quadBezTo","hc","cy3","x5","y3"],
                    ["lnTo","x4","y1"],
                    ["quadBezTo","cx2","cy1","r","t"],
                    ["lnTo","x6","y2"],
                    ["lnTo","r","rh"],
                    ["quadBezTo","cx5","cy4","x5","y5"],
                    ["lnTo","x5","y6"],
                    ["quadBezTo","hc","cy6","x2","y6"],
                    ["lnTo","x2","y5"],
                    ["quadBezTo","cx4","cy4","l","rh"],
                    ["lnTo","wd8","y2"],
                    ["close"],
                    ["moveTo","x2","y5"],
                    ["lnTo","x2","y3"],
                    ["moveTo","x5","y3"],
                    ["lnTo","x5","y5"],
                    ["moveTo","x3","y1"],
                    ["lnTo","x3","y7"],
                    ["moveTo","x4","y7"],
                    ["lnTo","x4","y1"],
                ]},
            ]
        },
        ellipseRibbon2: {
            av: {adj1:25000,adj2:50000,adj3:12500},
            gd: [
                ['a1','pin',[0,"adj1",100000]],
                ['a2','pin',[25000,"adj2",75000]],
                ['q10','+-',[100000,0,"a1"]],
                ['q11','*/',["q10",1,2]],
                ['q12','+-',["a1",0,"q11"]],
                ['minAdj3','max',[0,"q12"]],
                ['a3','pin',["minAdj3","adj3","a1"]],
                ['dx2','*/',["w","a2",200000]],
                ['x2','+-',["hc",0,"dx2"]],
                ['x3','+-',["x2","wd8",0]],
                ['x4','+-',["r",0,"x3"]],
                ['x5','+-',["r",0,"x2"]],
                ['x6','+-',["r",0,"wd8"]],
                ['dy1','*/',["h","a3",100000]],
                ['f1','*/',[4,"dy1","w"]],
                ['q1','*/',["x3","x3","w"]],
                ['q2','+-',["x3",0,"q1"]],
                ['u1','*/',["f1","q2",1]],
                ['y1','+-',["b",0,"u1"]],
                ['cx1','*/',["x3",1,2]],
                ['cu1','*/',["f1","cx1",1]],
                ['cy1','+-',["b",0,"cu1"]],
                ['cx2','+-',["r",0,"cx1"]],
                ['q1','*/',["h","a1",100000]],
                ['dy3','+-',["q1",0,"dy1"]],
                ['q3','*/',["x2","x2","w"]],
                ['q4','+-',["x2",0,"q3"]],
                ['q5','*/',["f1","q4",1]],
                ['u3','+-',["q5","dy3",0]],
                ['y3','+-',["b",0,"u3"]],
                ['q6','+-',["dy1","dy3","u3"]],
                ['q7','+-',["q6","dy1",0]],
                ['cu3','+-',["q7","dy3",0]],
                ['cy3','+-',["b",0,"cu3"]],
                ['rh','+-',["b",0,"q1"]],
                ['q8','*/',["dy1",14,16]],
                ['u2','+/',["q8","rh",2]],
                ['y2','+-',["b",0,"u2"]],
                ['u5','+-',["q5","rh",0]],
                ['y5','+-',["b",0,"u5"]],
                ['u6','+-',["u3","rh",0]],
                ['y6','+-',["b",0,"u6"]],
                ['cx4','*/',["x2",1,2]],
                ['q9','*/',["f1","cx4",1]],
                ['cu4','+-',["q9","rh",0]],
                ['cy4','+-',["b",0,"cu4"]],
                ['cx5','+-',["r",0,"cx4"]],
                ['cu6','+-',["cu3","rh",0]],
                ['cy6','+-',["b",0,"cu6"]],
                ['u7','+-',["u1","dy3",0]],
                ['y7','+-',["b",0,"u7"]],
                ['cu7','+-',["q1","q1","u7"]],
                ['cy7','+-',["b",0,"cu7"]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","l","b"],
                    ["quadBezTo","cx1","cy1","x3","y1"],
                    ["lnTo","x2","y3"],
                    ["quadBezTo","hc","cy3","x5","y3"],
                    ["lnTo","x4","y1"],
                    ["quadBezTo","cx2","cy1","r","b"],
                    ["lnTo","x6","y2"],
                    ["lnTo","r","q1"],
                    ["quadBezTo","cx5","cy4","x5","y5"],
                    ["lnTo","x5","y6"],
                    ["quadBezTo","hc","cy6","x2","y6"],
                    ["lnTo","x2","y5"],
                    ["quadBezTo","cx4","cy4","l","q1"],
                    ["lnTo","wd8","y2"],
                    ["close"],
                ]},
                {fill:"darkenLess",stroke:"false",cmds:[
                    ["moveTo","x3","y7"],
                    ["lnTo","x3","y1"],
                    ["lnTo","x2","y3"],
                    ["quadBezTo","hc","cy3","x5","y3"],
                    ["lnTo","x4","y1"],
                    ["lnTo","x4","y7"],
                    ["quadBezTo","hc","cy7","x3","y7"],
                    ["close"],
                ]},
                {fill:"none",cmds:[
                    ["moveTo","l","b"],
                    ["lnTo","wd8","y2"],
                    ["lnTo","l","q1"],
                    ["quadBezTo","cx4","cy4","x2","y5"],
                    ["lnTo","x2","y6"],
                    ["quadBezTo","hc","cy6","x5","y6"],
                    ["lnTo","x5","y5"],
                    ["quadBezTo","cx5","cy4","r","q1"],
                    ["lnTo","x6","y2"],
                    ["lnTo","r","b"],
                    ["quadBezTo","cx2","cy1","x4","y1"],
                    ["lnTo","x5","y3"],
                    ["quadBezTo","hc","cy3","x2","y3"],
                    ["lnTo","x3","y1"],
                    ["quadBezTo","cx1","cy1","l","b"],
                    ["close"],
                    ["moveTo","x2","y3"],
                    ["lnTo","x2","y5"],
                    ["moveTo","x5","y5"],
                    ["lnTo","x5","y3"],
                    ["moveTo","x3","y7"],
                    ["lnTo","x3","y1"],
                    ["moveTo","x4","y1"],
                    ["lnTo","x4","y7"],
                ]},
            ]
        },
        flowChartAlternateProcess: {
            gd: [
                ['x2','+-',["r",0,"ssd6"]],
                ['y2','+-',["b",0,"ssd6"]],
                ['il','*/',["ssd6",29289,100000]],
                ['ir','+-',["r",0,"il"]],
                ['ib','+-',["b",0,"il"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","ssd6"],
                    ["arcTo","ssd6","ssd6","cd2","cd4"],
                    ["lnTo","x2","t"],
                    ["arcTo","ssd6","ssd6","3cd4","cd4"],
                    ["lnTo","r","y2"],
                    ["arcTo","ssd6","ssd6",0,"cd4"],
                    ["lnTo","ssd6","b"],
                    ["arcTo","ssd6","ssd6","cd4","cd4"],
                    ["close"],
                ]},
            ]
        },
        flowChartCollate: {
            gd: [['ir','*/',["w",3,4]],['ib','*/',["h",3,4]]],
            paths: [
                {w:2,h:2,cmds:[
                    ["moveTo",0,0],
                    ["lnTo",2,0],
                    ["lnTo",1,1],
                    ["lnTo",2,2],
                    ["lnTo",0,2],
                    ["lnTo",1,1],
                    ["close"],
                ]},
            ]
        },
        flowChartConnector: {
            gd: [
                ['idx','cos',["wd2",2700000]],
                ['idy','sin',["hd2",2700000]],
                ['il','+-',["hc",0,"idx"]],
                ['ir','+-',["hc","idx",0]],
                ['it','+-',["vc",0,"idy"]],
                ['ib','+-',["vc","idy",0]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","vc"],
                    ["arcTo","wd2","hd2","cd2","cd4"],
                    ["arcTo","wd2","hd2","3cd4","cd4"],
                    ["arcTo","wd2","hd2",0,"cd4"],
                    ["arcTo","wd2","hd2","cd4","cd4"],
                    ["close"],
                ]},
            ]
        },
        flowChartDecision: {
            gd: [['ir','*/',["w",3,4]],['ib','*/',["h",3,4]]],
            paths: [
                {w:2,h:2,cmds:[["moveTo",0,1],["lnTo",1,0],["lnTo",2,1],["lnTo",1,2],["close"]]},
            ]
        },
        flowChartDelay: {
            gd: [
                ['idx','cos',["wd2",2700000]],
                ['idy','sin',["hd2",2700000]],
                ['ir','+-',["hc","idx",0]],
                ['it','+-',["vc",0,"idy"]],
                ['ib','+-',["vc","idy",0]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","t"],
                    ["lnTo","hc","t"],
                    ["arcTo","wd2","hd2","3cd4","cd2"],
                    ["lnTo","l","b"],
                    ["close"],
                ]},
            ]
        },
        flowChartDisplay: {
            gd: [['x2','*/',["w",5,6]]],
            paths: [
                {w:6,h:6,cmds:[
                    ["moveTo",0,3],
                    ["lnTo",1,0],
                    ["lnTo",5,0],
                    ["arcTo",1,3,"3cd4","cd2"],
                    ["lnTo",1,6],
                    ["close"],
                ]},
            ]
        },
        flowChartDocument: {
            gd: [['y1','*/',["h",17322,21600]],['y2','*/',["h",20172,21600]]],
            paths: [
                {w:21600,h:21600,cmds:[
                    ["moveTo",0,0],
                    ["lnTo",21600,0],
                    ["lnTo",21600,17322],
                    ["cubicBezTo",10800,17322,10800,23922,0,20172],
                    ["close"],
                ]},
            ]
        },
        flowChartExtract: {
            gd: [['x2','*/',["w",3,4]]],
            paths: [
                {w:2,h:2,cmds:[["moveTo",0,2],["lnTo",1,0],["lnTo",2,2],["close"]]},
            ]
        },
        flowChartInputOutput: {
            gd: [['x3','*/',["w",2,5]],['x4','*/',["w",3,5]],['x5','*/',["w",4,5]],['x6','*/',["w",9,10]]],
            paths: [
                {w:5,h:5,cmds:[["moveTo",0,5],["lnTo",1,0],["lnTo",5,0],["lnTo",4,5],["close"]]},
            ]
        },
        flowChartInternalStorage: {
            paths: [
                {w:1,h:1,stroke:"false",cmds:[["moveTo",0,0],["lnTo",1,0],["lnTo",1,1],["lnTo",0,1],["close"]]},
                {w:8,h:8,fill:"none",cmds:[["moveTo",1,0],["lnTo",1,8],["moveTo",0,1],["lnTo",8,1]]},
                {w:1,h:1,fill:"none",cmds:[["moveTo",0,0],["lnTo",1,0],["lnTo",1,1],["lnTo",0,1],["close"]]},
            ]
        },
        flowChartMagneticDisk: {
            gd: [['y3','*/',["h",5,6]]],
            paths: [
                {w:6,h:6,stroke:"false",cmds:[
                    ["moveTo",0,1],
                    ["arcTo",3,1,"cd2","cd2"],
                    ["lnTo",6,5],
                    ["arcTo",3,1,0,"cd2"],
                    ["close"],
                ]},
                {w:6,h:6,fill:"none",cmds:[["moveTo",6,1],["arcTo",3,1,0,"cd2"]]},
                {w:6,h:6,fill:"none",cmds:[
                    ["moveTo",0,1],
                    ["arcTo",3,1,"cd2","cd2"],
                    ["lnTo",6,5],
                    ["arcTo",3,1,0,"cd2"],
                    ["close"],
                ]},
            ]
        },
        flowChartMagneticDrum: {
            gd: [['x2','*/',["w",2,3]]],
            paths: [
                {w:6,h:6,stroke:"false",cmds:[
                    ["moveTo",1,0],
                    ["lnTo",5,0],
                    ["arcTo",1,3,"3cd4","cd2"],
                    ["lnTo",1,6],
                    ["arcTo",1,3,"cd4","cd2"],
                    ["close"],
                ]},
                {w:6,h:6,fill:"none",cmds:[["moveTo",5,6],["arcTo",1,3,"cd4","cd2"]]},
                {w:6,h:6,fill:"none",cmds:[
                    ["moveTo",1,0],
                    ["lnTo",5,0],
                    ["arcTo",1,3,"3cd4","cd2"],
                    ["lnTo",1,6],
                    ["arcTo",1,3,"cd4","cd2"],
                    ["close"],
                ]},
            ]
        },
        flowChartMagneticTape: {
            gd: [
                ['idx','cos',["wd2",2700000]],
                ['idy','sin',["hd2",2700000]],
                ['il','+-',["hc",0,"idx"]],
                ['ir','+-',["hc","idx",0]],
                ['it','+-',["vc",0,"idy"]],
                ['ib','+-',["vc","idy",0]],
                ['ang1','at2',["w","h"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","hc","b"],
                    ["arcTo","wd2","hd2","cd4","cd4"],
                    ["arcTo","wd2","hd2","cd2","cd4"],
                    ["arcTo","wd2","hd2","3cd4","cd4"],
                    ["arcTo","wd2","hd2",0,"ang1"],
                    ["lnTo","r","ib"],
                    ["lnTo","r","b"],
                    ["close"],
                ]},
            ]
        },
        flowChartManualInput: {
            paths: [
                {w:5,h:5,cmds:[["moveTo",0,1],["lnTo",5,0],["lnTo",5,5],["lnTo",0,5],["close"]]},
            ]
        },
        flowChartManualOperation: {
            gd: [['x3','*/',["w",4,5]],['x4','*/',["w",9,10]]],
            paths: [
                {w:5,h:5,cmds:[["moveTo",0,0],["lnTo",5,0],["lnTo",4,5],["lnTo",1,5],["close"]]},
            ]
        },
        flowChartMerge: {
            gd: [['x2','*/',["w",3,4]]],
            paths: [
                {w:2,h:2,cmds:[["moveTo",0,0],["lnTo",2,0],["lnTo",1,2],["close"]]},
            ]
        },
        flowChartMultidocument: {
            gd: [
                ['y2','*/',["h",3675,21600]],
                ['y8','*/',["h",20782,21600]],
                ['x3','*/',["w",9298,21600]],
                ['x4','*/',["w",12286,21600]],
                ['x5','*/',["w",18595,21600]],
            ],
            paths: [
                {w:21600,h:21600,stroke:"false",cmds:[
                    ["moveTo",0,20782],
                    ["cubicBezTo",9298,23542,9298,18022,18595,18022],
                    ["lnTo",18595,3675],
                    ["lnTo",0,3675],
                    ["close"],
                    ["moveTo",1532,3675],
                    ["lnTo",1532,1815],
                    ["lnTo",20000,1815],
                    ["lnTo",20000,16252],
                    ["cubicBezTo",19298,16252,18595,16352,18595,16352],
                    ["lnTo",18595,3675],
                    ["close"],
                    ["moveTo",2972,1815],
                    ["lnTo",2972,0],
                    ["lnTo",21600,0],
                    ["lnTo",21600,14392],
                    ["cubicBezTo",20800,14392,20000,14467,20000,14467],
                    ["lnTo",20000,1815],
                    ["close"],
                ]},
                {w:21600,h:21600,fill:"none",cmds:[
                    ["moveTo",0,3675],
                    ["lnTo",18595,3675],
                    ["lnTo",18595,18022],
                    ["cubicBezTo",9298,18022,9298,23542,0,20782],
                    ["close"],
                    ["moveTo",1532,3675],
                    ["lnTo",1532,1815],
                    ["lnTo",20000,1815],
                    ["lnTo",20000,16252],
                    ["cubicBezTo",19298,16252,18595,16352,18595,16352],
                    ["moveTo",2972,1815],
                    ["lnTo",2972,0],
                    ["lnTo",21600,0],
                    ["lnTo",21600,14392],
                    ["cubicBezTo",20800,14392,20000,14467,20000,14467],
                ]},
                {w:21600,h:21600,fill:"none",stroke:"false",cmds:[
                    ["moveTo",0,20782],
                    ["cubicBezTo",9298,23542,9298,18022,18595,18022],
                    ["lnTo",18595,16352],
                    ["cubicBezTo",18595,16352,19298,16252,20000,16252],
                    ["lnTo",20000,14467],
                    ["cubicBezTo",20000,14467,20800,14392,21600,14392],
                    ["lnTo",21600,0],
                    ["lnTo",2972,0],
                    ["lnTo",2972,1815],
                    ["lnTo",1532,1815],
                    ["lnTo",1532,3675],
                    ["lnTo",0,3675],
                    ["close"],
                ]},
            ]
        },
        flowChartOfflineStorage: {
            gd: [['x4','*/',["w",3,4]]],
            paths: [
                {w:2,h:2,stroke:"false",cmds:[["moveTo",0,0],["lnTo",2,0],["lnTo",1,2],["close"]]},
                {w:5,h:5,fill:"none",cmds:[["moveTo",2,4],["lnTo",3,4]]},
                {w:2,h:2,fill:"none",cmds:[["moveTo",0,0],["lnTo",2,0],["lnTo",1,2],["close"]]},
            ]
        },
        flowChartOffpageConnector: {
            gd: [['y1','*/',["h",4,5]]],
            paths: [
                {w:10,h:10,cmds:[["moveTo",0,0],["lnTo",10,0],["lnTo",10,8],["lnTo",5,10],["lnTo",0,8],["close"]]},
            ]
        },
        flowChartOnlineStorage: {
            gd: [['x2','*/',["w",5,6]]],
            paths: [
                {w:6,h:6,cmds:[
                    ["moveTo",1,0],
                    ["lnTo",6,0],
                    ["arcTo",1,3,"3cd4",-10800000],
                    ["lnTo",1,6],
                    ["arcTo",1,3,"cd4","cd2"],
                    ["close"],
                ]},
            ]
        },
        flowChartOr: {
            gd: [
                ['idx','cos',["wd2",2700000]],
                ['idy','sin',["hd2",2700000]],
                ['il','+-',["hc",0,"idx"]],
                ['ir','+-',["hc","idx",0]],
                ['it','+-',["vc",0,"idy"]],
                ['ib','+-',["vc","idy",0]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","l","vc"],
                    ["arcTo","wd2","hd2","cd2","cd4"],
                    ["arcTo","wd2","hd2","3cd4","cd4"],
                    ["arcTo","wd2","hd2",0,"cd4"],
                    ["arcTo","wd2","hd2","cd4","cd4"],
                    ["close"],
                ]},
                {fill:"none",cmds:[["moveTo","hc","t"],["lnTo","hc","b"],["moveTo","l","vc"],["lnTo","r","vc"]]},
                {fill:"none",cmds:[
                    ["moveTo","l","vc"],
                    ["arcTo","wd2","hd2","cd2","cd4"],
                    ["arcTo","wd2","hd2","3cd4","cd4"],
                    ["arcTo","wd2","hd2",0,"cd4"],
                    ["arcTo","wd2","hd2","cd4","cd4"],
                    ["close"],
                ]},
            ]
        },
        flowChartPredefinedProcess: {
            gd: [['x2','*/',["w",7,8]]],
            paths: [
                {w:1,h:1,stroke:"false",cmds:[["moveTo",0,0],["lnTo",1,0],["lnTo",1,1],["lnTo",0,1],["close"]]},
                {w:8,h:8,fill:"none",cmds:[["moveTo",1,0],["lnTo",1,8],["moveTo",7,0],["lnTo",7,8]]},
                {w:1,h:1,fill:"none",cmds:[["moveTo",0,0],["lnTo",1,0],["lnTo",1,1],["lnTo",0,1],["close"]]},
            ]
        },
        flowChartPreparation: {
            gd: [['x2','*/',["w",4,5]]],
            paths: [
                {w:10,h:10,cmds:[
                    ["moveTo",0,5],
                    ["lnTo",2,0],
                    ["lnTo",8,0],
                    ["lnTo",10,5],
                    ["lnTo",8,10],
                    ["lnTo",2,10],
                    ["close"],
                ]},
            ]
        },
        flowChartProcess: {
            paths: [
                {w:1,h:1,cmds:[["moveTo",0,0],["lnTo",1,0],["lnTo",1,1],["lnTo",0,1],["close"]]},
            ]
        },
        flowChartPunchedCard: {
            paths: [
                {w:5,h:5,cmds:[["moveTo",0,1],["lnTo",1,0],["lnTo",5,0],["lnTo",5,5],["lnTo",0,5],["close"]]},
            ]
        },
        flowChartPunchedTape: {
            gd: [['y2','*/',["h",9,10]],['ib','*/',["h",4,5]]],
            paths: [
                {w:20,h:20,cmds:[
                    ["moveTo",0,2],
                    ["arcTo",5,2,"cd2",-10800000],
                    ["arcTo",5,2,"cd2","cd2"],
                    ["lnTo",20,18],
                    ["arcTo",5,2,0,-10800000],
                    ["arcTo",5,2,0,"cd2"],
                    ["close"],
                ]},
            ]
        },
        flowChartSort: {
            gd: [['ir','*/',["w",3,4]],['ib','*/',["h",3,4]]],
            paths: [
                {w:2,h:2,stroke:"false",cmds:[["moveTo",0,1],["lnTo",1,0],["lnTo",2,1],["lnTo",1,2],["close"]]},
                {w:2,h:2,fill:"none",cmds:[["moveTo",0,1],["lnTo",2,1]]},
                {w:2,h:2,fill:"none",cmds:[["moveTo",0,1],["lnTo",1,0],["lnTo",2,1],["lnTo",1,2],["close"]]},
            ]
        },
        flowChartSummingJunction: {
            gd: [
                ['idx','cos',["wd2",2700000]],
                ['idy','sin',["hd2",2700000]],
                ['il','+-',["hc",0,"idx"]],
                ['ir','+-',["hc","idx",0]],
                ['it','+-',["vc",0,"idy"]],
                ['ib','+-',["vc","idy",0]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","l","vc"],
                    ["arcTo","wd2","hd2","cd2","cd4"],
                    ["arcTo","wd2","hd2","3cd4","cd4"],
                    ["arcTo","wd2","hd2",0,"cd4"],
                    ["arcTo","wd2","hd2","cd4","cd4"],
                    ["close"],
                ]},
                {fill:"none",cmds:[["moveTo","il","it"],["lnTo","ir","ib"],["moveTo","ir","it"],["lnTo","il","ib"]]},
                {fill:"none",cmds:[
                    ["moveTo","l","vc"],
                    ["arcTo","wd2","hd2","cd2","cd4"],
                    ["arcTo","wd2","hd2","3cd4","cd4"],
                    ["arcTo","wd2","hd2",0,"cd4"],
                    ["arcTo","wd2","hd2","cd4","cd4"],
                    ["close"],
                ]},
            ]
        },
        flowChartTerminator: {
            gd: [
                ['il','*/',["w",1018,21600]],
                ['ir','*/',["w",20582,21600]],
                ['it','*/',["h",3163,21600]],
                ['ib','*/',["h",18437,21600]],
            ],
            paths: [
                {w:21600,h:21600,cmds:[
                    ["moveTo",3475,0],
                    ["lnTo",18125,0],
                    ["arcTo",3475,10800,"3cd4","cd2"],
                    ["lnTo",3475,21600],
                    ["arcTo",3475,10800,"cd4","cd2"],
                    ["close"],
                ]},
            ]
        },
        foldedCorner: {
            av: {adj:16667},
            gd: [
                ['a','pin',[0,"adj",50000]],
                ['dy2','*/',["ss","a",100000]],
                ['dy1','*/',["dy2",1,5]],
                ['x1','+-',["r",0,"dy2"]],
                ['x2','+-',["x1","dy1",0]],
                ['y2','+-',["b",0,"dy2"]],
                ['y1','+-',["y2","dy1",0]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","l","t"],
                    ["lnTo","r","t"],
                    ["lnTo","r","y2"],
                    ["lnTo","x1","b"],
                    ["lnTo","l","b"],
                    ["close"],
                ]},
                {fill:"darkenLess",stroke:"false",cmds:[
                    ["moveTo","x1","b"],
                    ["lnTo","x2","y1"],
                    ["lnTo","r","y2"],
                    ["close"],
                ]},
                {fill:"none",cmds:[
                    ["moveTo","x1","b"],
                    ["lnTo","x2","y1"],
                    ["lnTo","r","y2"],
                    ["lnTo","x1","b"],
                    ["lnTo","l","b"],
                    ["lnTo","l","t"],
                    ["lnTo","r","t"],
                    ["lnTo","r","y2"],
                ]},
            ]
        },
        frame: {
            av: {adj1:12500},
            gd: [
                ['a1','pin',[0,"adj1",50000]],
                ['x1','*/',["ss","a1",100000]],
                ['x4','+-',["r",0,"x1"]],
                ['y4','+-',["b",0,"x1"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","t"],
                    ["lnTo","r","t"],
                    ["lnTo","r","b"],
                    ["lnTo","l","b"],
                    ["close"],
                    ["moveTo","x1","x1"],
                    ["lnTo","x1","y4"],
                    ["lnTo","x4","y4"],
                    ["lnTo","x4","x1"],
                    ["close"],
                ]},
            ]
        },
        funnel: {
            gd: [
                ['d','*/',["ss",1,20]],
                ['rw2','+-',["wd2",0,"d"]],
                ['rh2','+-',["hd4",0,"d"]],
                ['t1','cos',["wd2",480000]],
                ['t2','sin',["hd4",480000]],
                ['da','at2',["t1","t2"]],
                ['2da','*/',["da",2,1]],
                ['stAng1','+-',["cd2",0,"da"]],
                ['swAng1','+-',["cd2","2da",0]],
                ['swAng3','+-',["cd2",0,"2da"]],
                ['rw3','*/',["wd2",1,4]],
                ['rh3','*/',["hd4",1,4]],
                ['ct1','cos',["hd4","stAng1"]],
                ['st1','sin',["wd2","stAng1"]],
                ['m1','mod',["ct1","st1",0]],
                ['n1','*/',["wd2","hd4","m1"]],
                ['dx1','cos',["n1","stAng1"]],
                ['dy1','sin',["n1","stAng1"]],
                ['x1','+-',["hc","dx1",0]],
                ['y1','+-',["hd4","dy1",0]],
                ['ct3','cos',["rh3","da"]],
                ['st3','sin',["rw3","da"]],
                ['m3','mod',["ct3","st3",0]],
                ['n3','*/',["rw3","rh3","m3"]],
                ['dx3','cos',["n3","da"]],
                ['dy3','sin',["n3","da"]],
                ['x3','+-',["hc","dx3",0]],
                ['vc3','+-',["b",0,"rh3"]],
                ['y2','+-',["vc3","dy3",0]],
                ['x2','+-',["wd2",0,"rw2"]],
                ['cd','*/',["cd2",2,1]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","x1","y1"],
                    ["arcTo","wd2","hd4","stAng1","swAng1"],
                    ["lnTo","x3","y2"],
                    ["arcTo","rw3","rh3","da","swAng3"],
                    ["close"],
                    ["moveTo","x2","hd4"],
                    ["arcTo","rw2","rh2","cd2",-21600000],
                    ["close"],
                ]},
            ]
        },
        gear6: {
            av: {adj1:15000,adj2:3526},
            gd: [
                ['a1','pin',[0,"adj1",20000]],
                ['a2','pin',[0,"adj2",5358]],
                ['th','*/',["ss","a1",100000]],
                ['lFD','*/',["ss","a2",100000]],
                ['th2','*/',["th",1,2]],
                ['l2','*/',["lFD",1,2]],
                ['l3','+-',["th2","l2",0]],
                ['rh','+-',["hd2",0,"th"]],
                ['rw','+-',["wd2",0,"th"]],
                ['dr','+-',["rw",0,"rh"]],
                ['maxr','?:',["dr","rh","rw"]],
                ['ha','at2',["maxr","l3"]],
                ['aA1','+-',[19800000,0,"ha"]],
                ['aD1','+-',[19800000,"ha",0]],
                ['ta11','cos',["rw","aA1"]],
                ['ta12','sin',["rh","aA1"]],
                ['bA1','at2',["ta11","ta12"]],
                ['cta1','cos',["rh","bA1"]],
                ['sta1','sin',["rw","bA1"]],
                ['ma1','mod',["cta1","sta1",0]],
                ['na1','*/',["rw","rh","ma1"]],
                ['dxa1','cos',["na1","bA1"]],
                ['dya1','sin',["na1","bA1"]],
                ['xA1','+-',["hc","dxa1",0]],
                ['yA1','+-',["vc","dya1",0]],
                ['td11','cos',["rw","aD1"]],
                ['td12','sin',["rh","aD1"]],
                ['bD1','at2',["td11","td12"]],
                ['ctd1','cos',["rh","bD1"]],
                ['std1','sin',["rw","bD1"]],
                ['md1','mod',["ctd1","std1",0]],
                ['nd1','*/',["rw","rh","md1"]],
                ['dxd1','cos',["nd1","bD1"]],
                ['dyd1','sin',["nd1","bD1"]],
                ['xD1','+-',["hc","dxd1",0]],
                ['yD1','+-',["vc","dyd1",0]],
                ['xAD1','+-',["xA1",0,"xD1"]],
                ['yAD1','+-',["yA1",0,"yD1"]],
                ['lAD1','mod',["xAD1","yAD1",0]],
                ['a1','at2',["yAD1","xAD1"]],
                ['dxF1','sin',["lFD","a1"]],
                ['dyF1','cos',["lFD","a1"]],
                ['xF1','+-',["xD1","dxF1",0]],
                ['yF1','+-',["yD1","dyF1",0]],
                ['xE1','+-',["xA1",0,"dxF1"]],
                ['yE1','+-',["yA1",0,"dyF1"]],
                ['yC1t','sin',["th","a1"]],
                ['xC1t','cos',["th","a1"]],
                ['yC1','+-',["yF1","yC1t",0]],
                ['xC1','+-',["xF1",0,"xC1t"]],
                ['yB1','+-',["yE1","yC1t",0]],
                ['xB1','+-',["xE1",0,"xC1t"]],
                ['aD6','+-',["3cd4","ha",0]],
                ['td61','cos',["rw","aD6"]],
                ['td62','sin',["rh","aD6"]],
                ['bD6','at2',["td61","td62"]],
                ['ctd6','cos',["rh","bD6"]],
                ['std6','sin',["rw","bD6"]],
                ['md6','mod',["ctd6","std6",0]],
                ['nd6','*/',["rw","rh","md6"]],
                ['dxd6','cos',["nd6","bD6"]],
                ['dyd6','sin',["nd6","bD6"]],
                ['xD6','+-',["hc","dxd6",0]],
                ['yD6','+-',["vc","dyd6",0]],
                ['xA6','+-',["hc",0,"dxd6"]],
                ['xF6','+-',["xD6",0,"lFD"]],
                ['xE6','+-',["xA6","lFD",0]],
                ['yC6','+-',["yD6",0,"th"]],
                ['swAng1','+-',["bA1",0,"bD6"]],
                ['aA2','+-',[1800000,0,"ha"]],
                ['aD2','+-',[1800000,"ha",0]],
                ['ta21','cos',["rw","aA2"]],
                ['ta22','sin',["rh","aA2"]],
                ['bA2','at2',["ta21","ta22"]],
                ['yA2','+-',["h",0,"yD1"]],
                ['td21','cos',["rw","aD2"]],
                ['td22','sin',["rh","aD2"]],
                ['bD2','at2',["td21","td22"]],
                ['yD2','+-',["h",0,"yA1"]],
                ['yC2','+-',["h",0,"yB1"]],
                ['yB2','+-',["h",0,"yC1"]],
                ['xB2','val',["xC1"]],
                ['swAng2','+-',["bA2",0,"bD1"]],
                ['aD3','+-',["cd4","ha",0]],
                ['td31','cos',["rw","aD3"]],
                ['td32','sin',["rh","aD3"]],
                ['bD3','at2',["td31","td32"]],
                ['yD3','+-',["h",0,"yD6"]],
                ['yB3','+-',["h",0,"yC6"]],
                ['aD4','+-',[9000000,"ha",0]],
                ['td41','cos',["rw","aD4"]],
                ['td42','sin',["rh","aD4"]],
                ['bD4','at2',["td41","td42"]],
                ['xD4','+-',["w",0,"xD1"]],
                ['xC4','+-',["w",0,"xC1"]],
                ['xB4','+-',["w",0,"xB1"]],
                ['aD5','+-',[12600000,"ha",0]],
                ['td51','cos',["rw","aD5"]],
                ['td52','sin',["rh","aD5"]],
                ['bD5','at2',["td51","td52"]],
                ['xD5','+-',["w",0,"xA1"]],
                ['xC5','+-',["w",0,"xB1"]],
                ['xB5','+-',["w",0,"xC1"]],
                ['xCxn1','+/',["xB1","xC1",2]],
                ['yCxn1','+/',["yB1","yC1",2]],
                ['yCxn2','+-',["b",0,"yCxn1"]],
                ['xCxn4','+/',["r",0,"xCxn1"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","xA1","yA1"],
                    ["lnTo","xB1","yB1"],
                    ["lnTo","xC1","yC1"],
                    ["lnTo","xD1","yD1"],
                    ["arcTo","rw","rh","bD1","swAng2"],
                    ["lnTo","xC1","yB2"],
                    ["lnTo","xB1","yC2"],
                    ["lnTo","xA1","yD2"],
                    ["arcTo","rw","rh","bD2","swAng1"],
                    ["lnTo","xF6","yB3"],
                    ["lnTo","xE6","yB3"],
                    ["lnTo","xA6","yD3"],
                    ["arcTo","rw","rh","bD3","swAng1"],
                    ["lnTo","xB4","yC2"],
                    ["lnTo","xC4","yB2"],
                    ["lnTo","xD4","yA2"],
                    ["arcTo","rw","rh","bD4","swAng2"],
                    ["lnTo","xB5","yC1"],
                    ["lnTo","xC5","yB1"],
                    ["lnTo","xD5","yA1"],
                    ["arcTo","rw","rh","bD5","swAng1"],
                    ["lnTo","xE6","yC6"],
                    ["lnTo","xF6","yC6"],
                    ["lnTo","xD6","yD6"],
                    ["arcTo","rw","rh","bD6","swAng1"],
                    ["close"],
                ]},
            ]
        },
        gear9: {
            av: {adj1:10000,adj2:1763},
            gd: [
                ['a1','pin',[0,"adj1",20000]],
                ['a2','pin',[0,"adj2",2679]],
                ['th','*/',["ss","a1",100000]],
                ['lFD','*/',["ss","a2",100000]],
                ['th2','*/',["th",1,2]],
                ['l2','*/',["lFD",1,2]],
                ['l3','+-',["th2","l2",0]],
                ['rh','+-',["hd2",0,"th"]],
                ['rw','+-',["wd2",0,"th"]],
                ['dr','+-',["rw",0,"rh"]],
                ['maxr','?:',["dr","rh","rw"]],
                ['ha','at2',["maxr","l3"]],
                ['aA1','+-',[18600000,0,"ha"]],
                ['aD1','+-',[18600000,"ha",0]],
                ['ta11','cos',["rw","aA1"]],
                ['ta12','sin',["rh","aA1"]],
                ['bA1','at2',["ta11","ta12"]],
                ['cta1','cos',["rh","bA1"]],
                ['sta1','sin',["rw","bA1"]],
                ['ma1','mod',["cta1","sta1",0]],
                ['na1','*/',["rw","rh","ma1"]],
                ['dxa1','cos',["na1","bA1"]],
                ['dya1','sin',["na1","bA1"]],
                ['xA1','+-',["hc","dxa1",0]],
                ['yA1','+-',["vc","dya1",0]],
                ['td11','cos',["rw","aD1"]],
                ['td12','sin',["rh","aD1"]],
                ['bD1','at2',["td11","td12"]],
                ['ctd1','cos',["rh","bD1"]],
                ['std1','sin',["rw","bD1"]],
                ['md1','mod',["ctd1","std1",0]],
                ['nd1','*/',["rw","rh","md1"]],
                ['dxd1','cos',["nd1","bD1"]],
                ['dyd1','sin',["nd1","bD1"]],
                ['xD1','+-',["hc","dxd1",0]],
                ['yD1','+-',["vc","dyd1",0]],
                ['xAD1','+-',["xA1",0,"xD1"]],
                ['yAD1','+-',["yA1",0,"yD1"]],
                ['lAD1','mod',["xAD1","yAD1",0]],
                ['a1','at2',["yAD1","xAD1"]],
                ['dxF1','sin',["lFD","a1"]],
                ['dyF1','cos',["lFD","a1"]],
                ['xF1','+-',["xD1","dxF1",0]],
                ['yF1','+-',["yD1","dyF1",0]],
                ['xE1','+-',["xA1",0,"dxF1"]],
                ['yE1','+-',["yA1",0,"dyF1"]],
                ['yC1t','sin',["th","a1"]],
                ['xC1t','cos',["th","a1"]],
                ['yC1','+-',["yF1","yC1t",0]],
                ['xC1','+-',["xF1",0,"xC1t"]],
                ['yB1','+-',["yE1","yC1t",0]],
                ['xB1','+-',["xE1",0,"xC1t"]],
                ['aA2','+-',[21000000,0,"ha"]],
                ['aD2','+-',[21000000,"ha",0]],
                ['ta21','cos',["rw","aA2"]],
                ['ta22','sin',["rh","aA2"]],
                ['bA2','at2',["ta21","ta22"]],
                ['cta2','cos',["rh","bA2"]],
                ['sta2','sin',["rw","bA2"]],
                ['ma2','mod',["cta2","sta2",0]],
                ['na2','*/',["rw","rh","ma2"]],
                ['dxa2','cos',["na2","bA2"]],
                ['dya2','sin',["na2","bA2"]],
                ['xA2','+-',["hc","dxa2",0]],
                ['yA2','+-',["vc","dya2",0]],
                ['td21','cos',["rw","aD2"]],
                ['td22','sin',["rh","aD2"]],
                ['bD2','at2',["td21","td22"]],
                ['ctd2','cos',["rh","bD2"]],
                ['std2','sin',["rw","bD2"]],
                ['md2','mod',["ctd2","std2",0]],
                ['nd2','*/',["rw","rh","md2"]],
                ['dxd2','cos',["nd2","bD2"]],
                ['dyd2','sin',["nd2","bD2"]],
                ['xD2','+-',["hc","dxd2",0]],
                ['yD2','+-',["vc","dyd2",0]],
                ['xAD2','+-',["xA2",0,"xD2"]],
                ['yAD2','+-',["yA2",0,"yD2"]],
                ['lAD2','mod',["xAD2","yAD2",0]],
                ['a2','at2',["yAD2","xAD2"]],
                ['dxF2','sin',["lFD","a2"]],
                ['dyF2','cos',["lFD","a2"]],
                ['xF2','+-',["xD2","dxF2",0]],
                ['yF2','+-',["yD2","dyF2",0]],
                ['xE2','+-',["xA2",0,"dxF2"]],
                ['yE2','+-',["yA2",0,"dyF2"]],
                ['yC2t','sin',["th","a2"]],
                ['xC2t','cos',["th","a2"]],
                ['yC2','+-',["yF2","yC2t",0]],
                ['xC2','+-',["xF2",0,"xC2t"]],
                ['yB2','+-',["yE2","yC2t",0]],
                ['xB2','+-',["xE2",0,"xC2t"]],
                ['swAng1','+-',["bA2",0,"bD1"]],
                ['aA3','+-',[1800000,0,"ha"]],
                ['aD3','+-',[1800000,"ha",0]],
                ['ta31','cos',["rw","aA3"]],
                ['ta32','sin',["rh","aA3"]],
                ['bA3','at2',["ta31","ta32"]],
                ['cta3','cos',["rh","bA3"]],
                ['sta3','sin',["rw","bA3"]],
                ['ma3','mod',["cta3","sta3",0]],
                ['na3','*/',["rw","rh","ma3"]],
                ['dxa3','cos',["na3","bA3"]],
                ['dya3','sin',["na3","bA3"]],
                ['xA3','+-',["hc","dxa3",0]],
                ['yA3','+-',["vc","dya3",0]],
                ['td31','cos',["rw","aD3"]],
                ['td32','sin',["rh","aD3"]],
                ['bD3','at2',["td31","td32"]],
                ['ctd3','cos',["rh","bD3"]],
                ['std3','sin',["rw","bD3"]],
                ['md3','mod',["ctd3","std3",0]],
                ['nd3','*/',["rw","rh","md3"]],
                ['dxd3','cos',["nd3","bD3"]],
                ['dyd3','sin',["nd3","bD3"]],
                ['xD3','+-',["hc","dxd3",0]],
                ['yD3','+-',["vc","dyd3",0]],
                ['xAD3','+-',["xA3",0,"xD3"]],
                ['yAD3','+-',["yA3",0,"yD3"]],
                ['lAD3','mod',["xAD3","yAD3",0]],
                ['a3','at2',["yAD3","xAD3"]],
                ['dxF3','sin',["lFD","a3"]],
                ['dyF3','cos',["lFD","a3"]],
                ['xF3','+-',["xD3","dxF3",0]],
                ['yF3','+-',["yD3","dyF3",0]],
                ['xE3','+-',["xA3",0,"dxF3"]],
                ['yE3','+-',["yA3",0,"dyF3"]],
                ['yC3t','sin',["th","a3"]],
                ['xC3t','cos',["th","a3"]],
                ['yC3','+-',["yF3","yC3t",0]],
                ['xC3','+-',["xF3",0,"xC3t"]],
                ['yB3','+-',["yE3","yC3t",0]],
                ['xB3','+-',["xE3",0,"xC3t"]],
                ['swAng2','+-',["bA3",0,"bD2"]],
                ['aA4','+-',[4200000,0,"ha"]],
                ['aD4','+-',[4200000,"ha",0]],
                ['ta41','cos',["rw","aA4"]],
                ['ta42','sin',["rh","aA4"]],
                ['bA4','at2',["ta41","ta42"]],
                ['cta4','cos',["rh","bA4"]],
                ['sta4','sin',["rw","bA4"]],
                ['ma4','mod',["cta4","sta4",0]],
                ['na4','*/',["rw","rh","ma4"]],
                ['dxa4','cos',["na4","bA4"]],
                ['dya4','sin',["na4","bA4"]],
                ['xA4','+-',["hc","dxa4",0]],
                ['yA4','+-',["vc","dya4",0]],
                ['td41','cos',["rw","aD4"]],
                ['td42','sin',["rh","aD4"]],
                ['bD4','at2',["td41","td42"]],
                ['ctd4','cos',["rh","bD4"]],
                ['std4','sin',["rw","bD4"]],
                ['md4','mod',["ctd4","std4",0]],
                ['nd4','*/',["rw","rh","md4"]],
                ['dxd4','cos',["nd4","bD4"]],
                ['dyd4','sin',["nd4","bD4"]],
                ['xD4','+-',["hc","dxd4",0]],
                ['yD4','+-',["vc","dyd4",0]],
                ['xAD4','+-',["xA4",0,"xD4"]],
                ['yAD4','+-',["yA4",0,"yD4"]],
                ['lAD4','mod',["xAD4","yAD4",0]],
                ['a4','at2',["yAD4","xAD4"]],
                ['dxF4','sin',["lFD","a4"]],
                ['dyF4','cos',["lFD","a4"]],
                ['xF4','+-',["xD4","dxF4",0]],
                ['yF4','+-',["yD4","dyF4",0]],
                ['xE4','+-',["xA4",0,"dxF4"]],
                ['yE4','+-',["yA4",0,"dyF4"]],
                ['yC4t','sin',["th","a4"]],
                ['xC4t','cos',["th","a4"]],
                ['yC4','+-',["yF4","yC4t",0]],
                ['xC4','+-',["xF4",0,"xC4t"]],
                ['yB4','+-',["yE4","yC4t",0]],
                ['xB4','+-',["xE4",0,"xC4t"]],
                ['swAng3','+-',["bA4",0,"bD3"]],
                ['aA5','+-',[6600000,0,"ha"]],
                ['aD5','+-',[6600000,"ha",0]],
                ['ta51','cos',["rw","aA5"]],
                ['ta52','sin',["rh","aA5"]],
                ['bA5','at2',["ta51","ta52"]],
                ['td51','cos',["rw","aD5"]],
                ['td52','sin',["rh","aD5"]],
                ['bD5','at2',["td51","td52"]],
                ['xD5','+-',["w",0,"xA4"]],
                ['xC5','+-',["w",0,"xB4"]],
                ['xB5','+-',["w",0,"xC4"]],
                ['swAng4','+-',["bA5",0,"bD4"]],
                ['aD6','+-',[9000000,"ha",0]],
                ['td61','cos',["rw","aD6"]],
                ['td62','sin',["rh","aD6"]],
                ['bD6','at2',["td61","td62"]],
                ['xD6','+-',["w",0,"xA3"]],
                ['xC6','+-',["w",0,"xB3"]],
                ['xB6','+-',["w",0,"xC3"]],
                ['aD7','+-',[11400000,"ha",0]],
                ['td71','cos',["rw","aD7"]],
                ['td72','sin',["rh","aD7"]],
                ['bD7','at2',["td71","td72"]],
                ['xD7','+-',["w",0,"xA2"]],
                ['xC7','+-',["w",0,"xB2"]],
                ['xB7','+-',["w",0,"xC2"]],
                ['aD8','+-',[13800000,"ha",0]],
                ['td81','cos',["rw","aD8"]],
                ['td82','sin',["rh","aD8"]],
                ['bD8','at2',["td81","td82"]],
                ['xA8','+-',["w",0,"xD1"]],
                ['xD8','+-',["w",0,"xA1"]],
                ['xC8','+-',["w",0,"xB1"]],
                ['xB8','+-',["w",0,"xC1"]],
                ['aA9','+-',["3cd4",0,"ha"]],
                ['aD9','+-',["3cd4","ha",0]],
                ['td91','cos',["rw","aD9"]],
                ['td92','sin',["rh","aD9"]],
                ['bD9','at2',["td91","td92"]],
                ['ctd9','cos',["rh","bD9"]],
                ['std9','sin',["rw","bD9"]],
                ['md9','mod',["ctd9","std9",0]],
                ['nd9','*/',["rw","rh","md9"]],
                ['dxd9','cos',["nd9","bD9"]],
                ['dyd9','sin',["nd9","bD9"]],
                ['xD9','+-',["hc","dxd9",0]],
                ['yD9','+-',["vc","dyd9",0]],
                ['ta91','cos',["rw","aA9"]],
                ['ta92','sin',["rh","aA9"]],
                ['bA9','at2',["ta91","ta92"]],
                ['xA9','+-',["hc",0,"dxd9"]],
                ['xF9','+-',["xD9",0,"lFD"]],
                ['xE9','+-',["xA9","lFD",0]],
                ['yC9','+-',["yD9",0,"th"]],
                ['swAng5','+-',["bA9",0,"bD8"]],
                ['xCxn1','+/',["xB1","xC1",2]],
                ['yCxn1','+/',["yB1","yC1",2]],
                ['xCxn2','+/',["xB2","xC2",2]],
                ['yCxn2','+/',["yB2","yC2",2]],
                ['xCxn3','+/',["xB3","xC3",2]],
                ['yCxn3','+/',["yB3","yC3",2]],
                ['xCxn4','+/',["xB4","xC4",2]],
                ['yCxn4','+/',["yB4","yC4",2]],
                ['xCxn5','+/',["r",0,"xCxn4"]],
                ['xCxn6','+/',["r",0,"xCxn3"]],
                ['xCxn7','+/',["r",0,"xCxn2"]],
                ['xCxn8','+/',["r",0,"xCxn1"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","xA1","yA1"],
                    ["lnTo","xB1","yB1"],
                    ["lnTo","xC1","yC1"],
                    ["lnTo","xD1","yD1"],
                    ["arcTo","rw","rh","bD1","swAng1"],
                    ["lnTo","xB2","yB2"],
                    ["lnTo","xC2","yC2"],
                    ["lnTo","xD2","yD2"],
                    ["arcTo","rw","rh","bD2","swAng2"],
                    ["lnTo","xB3","yB3"],
                    ["lnTo","xC3","yC3"],
                    ["lnTo","xD3","yD3"],
                    ["arcTo","rw","rh","bD3","swAng3"],
                    ["lnTo","xB4","yB4"],
                    ["lnTo","xC4","yC4"],
                    ["lnTo","xD4","yD4"],
                    ["arcTo","rw","rh","bD4","swAng4"],
                    ["lnTo","xB5","yC4"],
                    ["lnTo","xC5","yB4"],
                    ["lnTo","xD5","yA4"],
                    ["arcTo","rw","rh","bD5","swAng3"],
                    ["lnTo","xB6","yC3"],
                    ["lnTo","xC6","yB3"],
                    ["lnTo","xD6","yA3"],
                    ["arcTo","rw","rh","bD6","swAng2"],
                    ["lnTo","xB7","yC2"],
                    ["lnTo","xC7","yB2"],
                    ["lnTo","xD7","yA2"],
                    ["arcTo","rw","rh","bD7","swAng1"],
                    ["lnTo","xB8","yC1"],
                    ["lnTo","xC8","yB1"],
                    ["lnTo","xD8","yA1"],
                    ["arcTo","rw","rh","bD8","swAng5"],
                    ["lnTo","xE9","yC9"],
                    ["lnTo","xF9","yC9"],
                    ["lnTo","xD9","yD9"],
                    ["arcTo","rw","rh","bD9","swAng5"],
                    ["close"],
                ]},
            ]
        },
        halfFrame: {
            av: {adj1:33333,adj2:33333},
            gd: [
                ['maxAdj2','*/',[100000,"w","ss"]],
                ['a2','pin',[0,"adj2","maxAdj2"]],
                ['x1','*/',["ss","a2",100000]],
                ['g1','*/',["h","x1","w"]],
                ['g2','+-',["h",0,"g1"]],
                ['maxAdj1','*/',[100000,"g2","ss"]],
                ['a1','pin',[0,"adj1","maxAdj1"]],
                ['y1','*/',["ss","a1",100000]],
                ['dx2','*/',["y1","w","h"]],
                ['x2','+-',["r",0,"dx2"]],
                ['dy2','*/',["x1","h","w"]],
                ['y2','+-',["b",0,"dy2"]],
                ['cx1','*/',["x1",1,2]],
                ['cy1','+/',["y2","b",2]],
                ['cx2','+/',["x2","r",2]],
                ['cy2','*/',["y1",1,2]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","t"],
                    ["lnTo","r","t"],
                    ["lnTo","x2","y1"],
                    ["lnTo","x1","y1"],
                    ["lnTo","x1","y2"],
                    ["lnTo","l","b"],
                    ["close"],
                ]},
            ]
        },
        heart: {
            gd: [
                ['dx1','*/',["w",49,48]],
                ['dx2','*/',["w",10,48]],
                ['x1','+-',["hc",0,"dx1"]],
                ['x2','+-',["hc",0,"dx2"]],
                ['x3','+-',["hc","dx2",0]],
                ['x4','+-',["hc","dx1",0]],
                ['y1','+-',["t",0,"hd3"]],
                ['il','*/',["w",1,6]],
                ['ir','*/',["w",5,6]],
                ['ib','*/',["h",2,3]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","hc","hd4"],
                    ["cubicBezTo","x3","y1","x4","hd4","hc","b"],
                    ["cubicBezTo","x1","hd4","x2","y1","hc","hd4"],
                    ["close"],
                ]},
            ]
        },
        heptagon: {
            av: {hf:102572,vf:105210},
            gd: [
                ['swd2','*/',["wd2","hf",100000]],
                ['shd2','*/',["hd2","vf",100000]],
                ['svc','*/',["vc","vf",100000]],
                ['dx1','*/',["swd2",97493,100000]],
                ['dx2','*/',["swd2",78183,100000]],
                ['dx3','*/',["swd2",43388,100000]],
                ['dy1','*/',["shd2",62349,100000]],
                ['dy2','*/',["shd2",22252,100000]],
                ['dy3','*/',["shd2",90097,100000]],
                ['x1','+-',["hc",0,"dx1"]],
                ['x2','+-',["hc",0,"dx2"]],
                ['x3','+-',["hc",0,"dx3"]],
                ['x4','+-',["hc","dx3",0]],
                ['x5','+-',["hc","dx2",0]],
                ['x6','+-',["hc","dx1",0]],
                ['y1','+-',["svc",0,"dy1"]],
                ['y2','+-',["svc","dy2",0]],
                ['y3','+-',["svc","dy3",0]],
                ['ib','+-',["b",0,"y1"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","x1","y2"],
                    ["lnTo","x2","y1"],
                    ["lnTo","hc","t"],
                    ["lnTo","x5","y1"],
                    ["lnTo","x6","y2"],
                    ["lnTo","x4","y3"],
                    ["lnTo","x3","y3"],
                    ["close"],
                ]},
            ]
        },
        hexagon: {
            av: {adj:25000,vf:115470},
            gd: [
                ['maxAdj','*/',[50000,"w","ss"]],
                ['a','pin',[0,"adj","maxAdj"]],
                ['shd2','*/',["hd2","vf",100000]],
                ['x1','*/',["ss","a",100000]],
                ['x2','+-',["r",0,"x1"]],
                ['dy1','sin',["shd2",3600000]],
                ['y1','+-',["vc",0,"dy1"]],
                ['y2','+-',["vc","dy1",0]],
                ['q1','*/',["maxAdj",-1,2]],
                ['q2','+-',["a","q1",0]],
                ['q3','?:',["q2",4,2]],
                ['q4','?:',["q2",3,2]],
                ['q5','?:',["q2","q1",0]],
                ['q6','+/',["a","q5","q1"]],
                ['q7','*/',["q6","q4",-1]],
                ['q8','+-',["q3","q7",0]],
                ['il','*/',["w","q8",24]],
                ['it','*/',["h","q8",24]],
                ['ir','+-',["r",0,"il"]],
                ['ib','+-',["b",0,"it"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","vc"],
                    ["lnTo","x1","y1"],
                    ["lnTo","x2","y1"],
                    ["lnTo","r","vc"],
                    ["lnTo","x2","y2"],
                    ["lnTo","x1","y2"],
                    ["close"],
                ]},
            ]
        },
        homePlate: {
            av: {adj:50000},
            gd: [
                ['maxAdj','*/',[100000,"w","ss"]],
                ['a','pin',[0,"adj","maxAdj"]],
                ['dx1','*/',["ss","a",100000]],
                ['x1','+-',["r",0,"dx1"]],
                ['ir','+/',["x1","r",2]],
                ['x2','*/',["x1",1,2]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","t"],
                    ["lnTo","x1","t"],
                    ["lnTo","r","vc"],
                    ["lnTo","x1","b"],
                    ["lnTo","l","b"],
                    ["close"],
                ]},
            ]
        },
        horizontalScroll: {
            av: {adj:12500},
            gd: [
                ['a','pin',[0,"adj",25000]],
                ['ch','*/',["ss","a",100000]],
                ['ch2','*/',["ch",1,2]],
                ['ch4','*/',["ch",1,4]],
                ['y3','+-',["ch","ch2",0]],
                ['y4','+-',["ch","ch",0]],
                ['y6','+-',["b",0,"ch"]],
                ['y7','+-',["b",0,"ch2"]],
                ['y5','+-',["y6",0,"ch2"]],
                ['x3','+-',["r",0,"ch"]],
                ['x4','+-',["r",0,"ch2"]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","r","ch2"],
                    ["arcTo","ch2","ch2",0,"cd4"],
                    ["lnTo","x4","ch2"],
                    ["arcTo","ch4","ch4",0,"cd2"],
                    ["lnTo","x3","ch"],
                    ["lnTo","ch2","ch"],
                    ["arcTo","ch2","ch2","3cd4",-5400000],
                    ["lnTo","l","y7"],
                    ["arcTo","ch2","ch2","cd2",-10800000],
                    ["lnTo","ch","y6"],
                    ["lnTo","x4","y6"],
                    ["arcTo","ch2","ch2","cd4",-5400000],
                    ["close"],
                    ["moveTo","ch2","y4"],
                    ["arcTo","ch2","ch2","cd4",-5400000],
                    ["arcTo","ch4","ch4",0,-10800000],
                    ["close"],
                ]},
                {fill:"darkenLess",stroke:"false",cmds:[
                    ["moveTo","ch2","y4"],
                    ["arcTo","ch2","ch2","cd4",-5400000],
                    ["arcTo","ch4","ch4",0,-10800000],
                    ["close"],
                    ["moveTo","x4","ch"],
                    ["arcTo","ch2","ch2","cd4",-16200000],
                    ["arcTo","ch4","ch4","cd2",-10800000],
                    ["close"],
                ]},
                {fill:"none",cmds:[
                    ["moveTo","l","y3"],
                    ["arcTo","ch2","ch2","cd2","cd4"],
                    ["lnTo","x3","ch"],
                    ["lnTo","x3","ch2"],
                    ["arcTo","ch2","ch2","cd2","cd2"],
                    ["lnTo","r","y5"],
                    ["arcTo","ch2","ch2",0,"cd4"],
                    ["lnTo","ch","y6"],
                    ["lnTo","ch","y7"],
                    ["arcTo","ch2","ch2",0,"cd2"],
                    ["close"],
                    ["moveTo","x3","ch"],
                    ["lnTo","x4","ch"],
                    ["arcTo","ch2","ch2","cd4",-5400000],
                    ["moveTo","x4","ch"],
                    ["lnTo","x4","ch2"],
                    ["arcTo","ch4","ch4",0,"cd2"],
                    ["moveTo","ch2","y4"],
                    ["lnTo","ch2","y3"],
                    ["arcTo","ch4","ch4","cd2","cd2"],
                    ["arcTo","ch2","ch2",0,"cd2"],
                    ["moveTo","ch","y3"],
                    ["lnTo","ch","y6"],
                ]},
            ]
        },
        irregularSeal1: {
            gd: [
                ['x5','*/',["w",4627,21600]],
                ['x12','*/',["w",8485,21600]],
                ['x21','*/',["w",16702,21600]],
                ['x24','*/',["w",14522,21600]],
                ['y3','*/',["h",6320,21600]],
                ['y6','*/',["h",8615,21600]],
                ['y9','*/',["h",13937,21600]],
                ['y18','*/',["h",13290,21600]],
            ],
            paths: [
                {w:21600,h:21600,cmds:[
                    ["moveTo",10800,5800],
                    ["lnTo",14522,0],
                    ["lnTo",14155,5325],
                    ["lnTo",18380,4457],
                    ["lnTo",16702,7315],
                    ["lnTo",21097,8137],
                    ["lnTo",17607,10475],
                    ["lnTo",21600,13290],
                    ["lnTo",16837,12942],
                    ["lnTo",18145,18095],
                    ["lnTo",14020,14457],
                    ["lnTo",13247,19737],
                    ["lnTo",10532,14935],
                    ["lnTo",8485,21600],
                    ["lnTo",7715,15627],
                    ["lnTo",4762,17617],
                    ["lnTo",5667,13937],
                    ["lnTo",135,14587],
                    ["lnTo",3722,11775],
                    ["lnTo",0,8615],
                    ["lnTo",4627,7617],
                    ["lnTo",370,2295],
                    ["lnTo",7312,6320],
                    ["lnTo",8352,2295],
                    ["close"],
                ]},
            ]
        },
        irregularSeal2: {
            gd: [
                ['x2','*/',["w",9722,21600]],
                ['x5','*/',["w",5372,21600]],
                ['x16','*/',["w",11612,21600]],
                ['x19','*/',["w",14640,21600]],
                ['y2','*/',["h",1887,21600]],
                ['y3','*/',["h",6382,21600]],
                ['y8','*/',["h",12877,21600]],
                ['y14','*/',["h",19712,21600]],
                ['y16','*/',["h",18842,21600]],
                ['y17','*/',["h",15935,21600]],
                ['y24','*/',["h",6645,21600]],
            ],
            paths: [
                {w:21600,h:21600,cmds:[
                    ["moveTo",11462,4342],
                    ["lnTo",14790,0],
                    ["lnTo",14525,5777],
                    ["lnTo",18007,3172],
                    ["lnTo",16380,6532],
                    ["lnTo",21600,6645],
                    ["lnTo",16985,9402],
                    ["lnTo",18270,11290],
                    ["lnTo",16380,12310],
                    ["lnTo",18877,15632],
                    ["lnTo",14640,14350],
                    ["lnTo",14942,17370],
                    ["lnTo",12180,15935],
                    ["lnTo",11612,18842],
                    ["lnTo",9872,17370],
                    ["lnTo",8700,19712],
                    ["lnTo",7527,18125],
                    ["lnTo",4917,21600],
                    ["lnTo",4805,18240],
                    ["lnTo",1285,17825],
                    ["lnTo",3330,15370],
                    ["lnTo",0,12877],
                    ["lnTo",3935,11592],
                    ["lnTo",1172,8270],
                    ["lnTo",5372,7817],
                    ["lnTo",4502,3625],
                    ["lnTo",8550,6382],
                    ["lnTo",9722,1887],
                    ["close"],
                ]},
            ]
        },
        leftArrow: {
            av: {adj1:50000,adj2:50000},
            gd: [
                ['maxAdj2','*/',[100000,"w","ss"]],
                ['a1','pin',[0,"adj1",100000]],
                ['a2','pin',[0,"adj2","maxAdj2"]],
                ['dx2','*/',["ss","a2",100000]],
                ['x2','+-',["l","dx2",0]],
                ['dy1','*/',["h","a1",200000]],
                ['y1','+-',["vc",0,"dy1"]],
                ['y2','+-',["vc","dy1",0]],
                ['dx1','*/',["y1","dx2","hd2"]],
                ['x1','+-',["x2",0,"dx1"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","vc"],
                    ["lnTo","x2","t"],
                    ["lnTo","x2","y1"],
                    ["lnTo","r","y1"],
                    ["lnTo","r","y2"],
                    ["lnTo","x2","y2"],
                    ["lnTo","x2","b"],
                    ["close"],
                ]},
            ]
        },
        leftArrowCallout: {
            av: {adj1:25000,adj2:25000,adj3:25000,adj4:64977},
            gd: [
                ['maxAdj2','*/',[50000,"h","ss"]],
                ['a2','pin',[0,"adj2","maxAdj2"]],
                ['maxAdj1','*/',["a2",2,1]],
                ['a1','pin',[0,"adj1","maxAdj1"]],
                ['maxAdj3','*/',[100000,"w","ss"]],
                ['a3','pin',[0,"adj3","maxAdj3"]],
                ['q2','*/',["a3","ss","w"]],
                ['maxAdj4','+-',[100000,0,"q2"]],
                ['a4','pin',[0,"adj4","maxAdj4"]],
                ['dy1','*/',["ss","a2",100000]],
                ['dy2','*/',["ss","a1",200000]],
                ['y1','+-',["vc",0,"dy1"]],
                ['y2','+-',["vc",0,"dy2"]],
                ['y3','+-',["vc","dy2",0]],
                ['y4','+-',["vc","dy1",0]],
                ['x1','*/',["ss","a3",100000]],
                ['dx2','*/',["w","a4",100000]],
                ['x2','+-',["r",0,"dx2"]],
                ['x3','+/',["x2","r",2]],
            ],
            rect: {l:'x2',t:'t',r:'r',b:'b'},
            paths: [
                {cmds:[
                    ["moveTo","l","vc"],
                    ["lnTo","x1","y1"],
                    ["lnTo","x1","y2"],
                    ["lnTo","x2","y2"],
                    ["lnTo","x2","t"],
                    ["lnTo","r","t"],
                    ["lnTo","r","b"],
                    ["lnTo","x2","b"],
                    ["lnTo","x2","y3"],
                    ["lnTo","x1","y3"],
                    ["lnTo","x1","y4"],
                    ["close"],
                ]},
            ]
        },
        leftBrace: {
            av: {adj1:8333,adj2:50000},
            gd: [
                ['a2','pin',[0,"adj2",100000]],
                ['q1','+-',[100000,0,"a2"]],
                ['q2','min',["q1","a2"]],
                ['q3','*/',["q2",1,2]],
                ['maxAdj1','*/',["q3","h","ss"]],
                ['a1','pin',[0,"adj1","maxAdj1"]],
                ['y1','*/',["ss","a1",100000]],
                ['y3','*/',["h","a2",100000]],
                ['y4','+-',["y3","y1",0]],
                ['dx1','cos',["wd2",2700000]],
                ['dy1','sin',["y1",2700000]],
                ['il','+-',["r",0,"dx1"]],
                ['it','+-',["y1",0,"dy1"]],
                ['ib','+-',["b","dy1","y1"]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","r","b"],
                    ["arcTo","wd2","y1","cd4","cd4"],
                    ["lnTo","hc","y4"],
                    ["arcTo","wd2","y1",0,-5400000],
                    ["arcTo","wd2","y1","cd4",-5400000],
                    ["lnTo","hc","y1"],
                    ["arcTo","wd2","y1","cd2","cd4"],
                    ["close"],
                ]},
                {fill:"none",cmds:[
                    ["moveTo","r","b"],
                    ["arcTo","wd2","y1","cd4","cd4"],
                    ["lnTo","hc","y4"],
                    ["arcTo","wd2","y1",0,-5400000],
                    ["arcTo","wd2","y1","cd4",-5400000],
                    ["lnTo","hc","y1"],
                    ["arcTo","wd2","y1","cd2","cd4"],
                ]},
            ]
        },
        leftBracket: {
            av: {adj:8333},
            gd: [
                ['maxAdj','*/',[50000,"h","ss"]],
                ['a','pin',[0,"adj","maxAdj"]],
                ['y1','*/',["ss","a",100000]],
                ['y2','+-',["b",0,"y1"]],
                ['dx1','cos',["w",2700000]],
                ['dy1','sin',["y1",2700000]],
                ['il','+-',["r",0,"dx1"]],
                ['it','+-',["y1",0,"dy1"]],
                ['ib','+-',["b","dy1","y1"]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","r","b"],
                    ["arcTo","w","y1","cd4","cd4"],
                    ["lnTo","l","y1"],
                    ["arcTo","w","y1","cd2","cd4"],
                    ["close"],
                ]},
                {fill:"none",cmds:[
                    ["moveTo","r","b"],
                    ["arcTo","w","y1","cd4","cd4"],
                    ["lnTo","l","y1"],
                    ["arcTo","w","y1","cd2","cd4"],
                ]},
            ]
        },
        leftCircularArrow: {
            av: {adj1:12500,adj2:-1142319,adj3:1142319,adj4:10800000,adj5:12500},
            gd: [
                ['a5','pin',[0,"adj5",25000]],
                ['maxAdj1','*/',["a5",2,1]],
                ['a1','pin',[0,"adj1","maxAdj1"]],
                ['enAng','pin',[1,"adj3",21599999]],
                ['stAng','pin',[0,"adj4",21599999]],
                ['th','*/',["ss","a1",100000]],
                ['thh','*/',["ss","a5",100000]],
                ['th2','*/',["th",1,2]],
                ['rw1','+-',["wd2","th2","thh"]],
                ['rh1','+-',["hd2","th2","thh"]],
                ['rw2','+-',["rw1",0,"th"]],
                ['rh2','+-',["rh1",0,"th"]],
                ['rw3','+-',["rw2","th2",0]],
                ['rh3','+-',["rh2","th2",0]],
                ['wtH','sin',["rw3","enAng"]],
                ['htH','cos',["rh3","enAng"]],
                ['dxH','cat2',["rw3","htH","wtH"]],
                ['dyH','sat2',["rh3","htH","wtH"]],
                ['xH','+-',["hc","dxH",0]],
                ['yH','+-',["vc","dyH",0]],
                ['rI','min',["rw2","rh2"]],
                ['u1','*/',["dxH","dxH",1]],
                ['u2','*/',["dyH","dyH",1]],
                ['u3','*/',["rI","rI",1]],
                ['u4','+-',["u1",0,"u3"]],
                ['u5','+-',["u2",0,"u3"]],
                ['u6','*/',["u4","u5","u1"]],
                ['u7','*/',["u6",1,"u2"]],
                ['u8','+-',[1,0,"u7"]],
                ['u9','sqrt',["u8"]],
                ['u10','*/',["u4",1,"dxH"]],
                ['u11','*/',["u10",1,"dyH"]],
                ['u12','+/',[1,"u9","u11"]],
                ['u13','at2',[1,"u12"]],
                ['u14','+-',["u13",21600000,0]],
                ['u15','?:',["u13","u13","u14"]],
                ['u16','+-',["u15",0,"enAng"]],
                ['u17','+-',["u16",21600000,0]],
                ['u18','?:',["u16","u16","u17"]],
                ['u19','+-',["u18",0,"cd2"]],
                ['u20','+-',["u18",0,21600000]],
                ['u21','?:',["u19","u20","u18"]],
                ['u22','abs',["u21"]],
                ['minAng','*/',["u22",-1,1]],
                ['u23','abs',["adj2"]],
                ['a2','*/',["u23",-1,1]],
                ['aAng','pin',["minAng","a2",0]],
                ['ptAng','+-',["enAng","aAng",0]],
                ['wtA','sin',["rw3","ptAng"]],
                ['htA','cos',["rh3","ptAng"]],
                ['dxA','cat2',["rw3","htA","wtA"]],
                ['dyA','sat2',["rh3","htA","wtA"]],
                ['xA','+-',["hc","dxA",0]],
                ['yA','+-',["vc","dyA",0]],
                ['wtE','sin',["rw1","stAng"]],
                ['htE','cos',["rh1","stAng"]],
                ['dxE','cat2',["rw1","htE","wtE"]],
                ['dyE','sat2',["rh1","htE","wtE"]],
                ['xE','+-',["hc","dxE",0]],
                ['yE','+-',["vc","dyE",0]],
                ['wtD','sin',["rw2","stAng"]],
                ['htD','cos',["rh2","stAng"]],
                ['dxD','cat2',["rw2","htD","wtD"]],
                ['dyD','sat2',["rh2","htD","wtD"]],
                ['xD','+-',["hc","dxD",0]],
                ['yD','+-',["vc","dyD",0]],
                ['dxG','cos',["thh","ptAng"]],
                ['dyG','sin',["thh","ptAng"]],
                ['xG','+-',["xH","dxG",0]],
                ['yG','+-',["yH","dyG",0]],
                ['dxB','cos',["thh","ptAng"]],
                ['dyB','sin',["thh","ptAng"]],
                ['xB','+-',["xH",0,"dxB",0]],
                ['yB','+-',["yH",0,"dyB",0]],
                ['sx1','+-',["xB",0,"hc"]],
                ['sy1','+-',["yB",0,"vc"]],
                ['sx2','+-',["xG",0,"hc"]],
                ['sy2','+-',["yG",0,"vc"]],
                ['rO','min',["rw1","rh1"]],
                ['x1O','*/',["sx1","rO","rw1"]],
                ['y1O','*/',["sy1","rO","rh1"]],
                ['x2O','*/',["sx2","rO","rw1"]],
                ['y2O','*/',["sy2","rO","rh1"]],
                ['dxO','+-',["x2O",0,"x1O"]],
                ['dyO','+-',["y2O",0,"y1O"]],
                ['dO','mod',["dxO","dyO",0]],
                ['q1','*/',["x1O","y2O",1]],
                ['q2','*/',["x2O","y1O",1]],
                ['DO','+-',["q1",0,"q2"]],
                ['q3','*/',["rO","rO",1]],
                ['q4','*/',["dO","dO",1]],
                ['q5','*/',["q3","q4",1]],
                ['q6','*/',["DO","DO",1]],
                ['q7','+-',["q5",0,"q6"]],
                ['q8','max',["q7",0]],
                ['sdelO','sqrt',["q8"]],
                ['ndyO','*/',["dyO",-1,1]],
                ['sdyO','?:',["ndyO",-1,1]],
                ['q9','*/',["sdyO","dxO",1]],
                ['q10','*/',["q9","sdelO",1]],
                ['q11','*/',["DO","dyO",1]],
                ['dxF1','+/',["q11","q10","q4"]],
                ['q12','+-',["q11",0,"q10"]],
                ['dxF2','*/',["q12",1,"q4"]],
                ['adyO','abs',["dyO"]],
                ['q13','*/',["adyO","sdelO",1]],
                ['q14','*/',["DO","dxO",-1]],
                ['dyF1','+/',["q14","q13","q4"]],
                ['q15','+-',["q14",0,"q13"]],
                ['dyF2','*/',["q15",1,"q4"]],
                ['q16','+-',["x2O",0,"dxF1"]],
                ['q17','+-',["x2O",0,"dxF2"]],
                ['q18','+-',["y2O",0,"dyF1"]],
                ['q19','+-',["y2O",0,"dyF2"]],
                ['q20','mod',["q16","q18",0]],
                ['q21','mod',["q17","q19",0]],
                ['q22','+-',["q21",0,"q20"]],
                ['dxF','?:',["q22","dxF1","dxF2"]],
                ['dyF','?:',["q22","dyF1","dyF2"]],
                ['sdxF','*/',["dxF","rw1","rO"]],
                ['sdyF','*/',["dyF","rh1","rO"]],
                ['xF','+-',["hc","sdxF",0]],
                ['yF','+-',["vc","sdyF",0]],
                ['x1I','*/',["sx1","rI","rw2"]],
                ['y1I','*/',["sy1","rI","rh2"]],
                ['x2I','*/',["sx2","rI","rw2"]],
                ['y2I','*/',["sy2","rI","rh2"]],
                ['dxI','+-',["x2I",0,"x1I"]],
                ['dyI','+-',["y2I",0,"y1I"]],
                ['dI','mod',["dxI","dyI",0]],
                ['v1','*/',["x1I","y2I",1]],
                ['v2','*/',["x2I","y1I",1]],
                ['DI','+-',["v1",0,"v2"]],
                ['v3','*/',["rI","rI",1]],
                ['v4','*/',["dI","dI",1]],
                ['v5','*/',["v3","v4",1]],
                ['v6','*/',["DI","DI",1]],
                ['v7','+-',["v5",0,"v6"]],
                ['v8','max',["v7",0]],
                ['sdelI','sqrt',["v8"]],
                ['v9','*/',["sdyO","dxI",1]],
                ['v10','*/',["v9","sdelI",1]],
                ['v11','*/',["DI","dyI",1]],
                ['dxC1','+/',["v11","v10","v4"]],
                ['v12','+-',["v11",0,"v10"]],
                ['dxC2','*/',["v12",1,"v4"]],
                ['adyI','abs',["dyI"]],
                ['v13','*/',["adyI","sdelI",1]],
                ['v14','*/',["DI","dxI",-1]],
                ['dyC1','+/',["v14","v13","v4"]],
                ['v15','+-',["v14",0,"v13"]],
                ['dyC2','*/',["v15",1,"v4"]],
                ['v16','+-',["x1I",0,"dxC1"]],
                ['v17','+-',["x1I",0,"dxC2"]],
                ['v18','+-',["y1I",0,"dyC1"]],
                ['v19','+-',["y1I",0,"dyC2"]],
                ['v20','mod',["v16","v18",0]],
                ['v21','mod',["v17","v19",0]],
                ['v22','+-',["v21",0,"v20"]],
                ['dxC','?:',["v22","dxC1","dxC2"]],
                ['dyC','?:',["v22","dyC1","dyC2"]],
                ['sdxC','*/',["dxC","rw2","rI"]],
                ['sdyC','*/',["dyC","rh2","rI"]],
                ['xC','+-',["hc","sdxC",0]],
                ['yC','+-',["vc","sdyC",0]],
                ['ist0','at2',["sdxC","sdyC"]],
                ['ist1','+-',["ist0",21600000,0]],
                ['istAng0','?:',["ist0","ist0","ist1"]],
                ['isw1','+-',["stAng",0,"istAng0"]],
                ['isw2','+-',["isw1",21600000,0]],
                ['iswAng0','?:',["isw1","isw1","isw2"]],
                ['istAng','+-',["istAng0","iswAng0",0]],
                ['iswAng','+-',[0,0,"iswAng0"]],
                ['p1','+-',["xF",0,"xC"]],
                ['p2','+-',["yF",0,"yC"]],
                ['p3','mod',["p1","p2",0]],
                ['p4','*/',["p3",1,2]],
                ['p5','+-',["p4",0,"thh"]],
                ['xGp','?:',["p5","xF","xG"]],
                ['yGp','?:',["p5","yF","yG"]],
                ['xBp','?:',["p5","xC","xB"]],
                ['yBp','?:',["p5","yC","yB"]],
                ['en0','at2',["sdxF","sdyF"]],
                ['en1','+-',["en0",21600000,0]],
                ['en2','?:',["en0","en0","en1"]],
                ['sw0','+-',["en2",0,"stAng"]],
                ['sw1','+-',["sw0",0,21600000]],
                ['swAng','?:',["sw0","sw1","sw0"]],
                ['stAng0','+-',["stAng","swAng",0]],
                ['swAng0','+-',[0,0,"swAng"]],
                ['wtI','sin',["rw3","stAng"]],
                ['htI','cos',["rh3","stAng"]],
                ['dxI','cat2',["rw3","htI","wtI"]],
                ['dyI','sat2',["rh3","htI","wtI"]],
                ['xI','+-',["hc","dxI",0]],
                ['yI','+-',["vc","dyI",0]],
                ['aI','+-',["stAng","cd4",0]],
                ['aA','+-',["ptAng",0,"cd4"]],
                ['aB','+-',["ptAng","cd2",0]],
                ['idx','cos',["rw1",2700000]],
                ['idy','sin',["rh1",2700000]],
                ['il','+-',["hc",0,"idx"]],
                ['ir','+-',["hc","idx",0]],
                ['it','+-',["vc",0,"idy"]],
                ['ib','+-',["vc","idy",0]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","xE","yE"],
                    ["lnTo","xD","yD"],
                    ["arcTo","rw2","rh2","istAng","iswAng"],
                    ["lnTo","xBp","yBp"],
                    ["lnTo","xA","yA"],
                    ["lnTo","xGp","yGp"],
                    ["lnTo","xF","yF"],
                    ["arcTo","rw1","rh1","stAng0","swAng0"],
                    ["close"],
                ]},
            ]
        },
        leftRightArrow: {
            av: {adj1:50000,adj2:50000},
            gd: [
                ['maxAdj2','*/',[50000,"w","ss"]],
                ['a1','pin',[0,"adj1",100000]],
                ['a2','pin',[0,"adj2","maxAdj2"]],
                ['x2','*/',["ss","a2",100000]],
                ['x3','+-',["r",0,"x2"]],
                ['dy','*/',["h","a1",200000]],
                ['y1','+-',["vc",0,"dy"]],
                ['y2','+-',["vc","dy",0]],
                ['dx1','*/',["y1","x2","hd2"]],
                ['x1','+-',["x2",0,"dx1"]],
                ['x4','+-',["x3","dx1",0]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","vc"],
                    ["lnTo","x2","t"],
                    ["lnTo","x2","y1"],
                    ["lnTo","x3","y1"],
                    ["lnTo","x3","t"],
                    ["lnTo","r","vc"],
                    ["lnTo","x3","b"],
                    ["lnTo","x3","y2"],
                    ["lnTo","x2","y2"],
                    ["lnTo","x2","b"],
                    ["close"],
                ]},
            ]
        },
        leftRightArrowCallout: {
            av: {adj1:25000,adj2:25000,adj3:25000,adj4:48123},
            gd: [
                ['maxAdj2','*/',[50000,"h","ss"]],
                ['a2','pin',[0,"adj2","maxAdj2"]],
                ['maxAdj1','*/',["a2",2,1]],
                ['a1','pin',[0,"adj1","maxAdj1"]],
                ['maxAdj3','*/',[50000,"w","ss"]],
                ['a3','pin',[0,"adj3","maxAdj3"]],
                ['q2','*/',["a3","ss","wd2"]],
                ['maxAdj4','+-',[100000,0,"q2"]],
                ['a4','pin',[0,"adj4","maxAdj4"]],
                ['dy1','*/',["ss","a2",100000]],
                ['dy2','*/',["ss","a1",200000]],
                ['y1','+-',["vc",0,"dy1"]],
                ['y2','+-',["vc",0,"dy2"]],
                ['y3','+-',["vc","dy2",0]],
                ['y4','+-',["vc","dy1",0]],
                ['x1','*/',["ss","a3",100000]],
                ['x4','+-',["r",0,"x1"]],
                ['dx2','*/',["w","a4",200000]],
                ['x2','+-',["hc",0,"dx2"]],
                ['x3','+-',["hc","dx2",0]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","vc"],
                    ["lnTo","x1","y1"],
                    ["lnTo","x1","y2"],
                    ["lnTo","x2","y2"],
                    ["lnTo","x2","t"],
                    ["lnTo","x3","t"],
                    ["lnTo","x3","y2"],
                    ["lnTo","x4","y2"],
                    ["lnTo","x4","y1"],
                    ["lnTo","r","vc"],
                    ["lnTo","x4","y4"],
                    ["lnTo","x4","y3"],
                    ["lnTo","x3","y3"],
                    ["lnTo","x3","b"],
                    ["lnTo","x2","b"],
                    ["lnTo","x2","y3"],
                    ["lnTo","x1","y3"],
                    ["lnTo","x1","y4"],
                    ["close"],
                ]},
            ]
        },
        leftRightCircularArrow: {
            av: {adj1:12500,adj2:1142319,adj3:20457681,adj4:11942319,adj5:12500},
            gd: [
                ['a5','pin',[0,"adj5",25000]],
                ['maxAdj1','*/',["a5",2,1]],
                ['a1','pin',[0,"adj1","maxAdj1"]],
                ['enAng','pin',[1,"adj3",21599999]],
                ['stAng','pin',[0,"adj4",21599999]],
                ['th','*/',["ss","a1",100000]],
                ['thh','*/',["ss","a5",100000]],
                ['th2','*/',["th",1,2]],
                ['rw1','+-',["wd2","th2","thh"]],
                ['rh1','+-',["hd2","th2","thh"]],
                ['rw2','+-',["rw1",0,"th"]],
                ['rh2','+-',["rh1",0,"th"]],
                ['rw3','+-',["rw2","th2",0]],
                ['rh3','+-',["rh2","th2",0]],
                ['wtH','sin',["rw3","enAng"]],
                ['htH','cos',["rh3","enAng"]],
                ['dxH','cat2',["rw3","htH","wtH"]],
                ['dyH','sat2',["rh3","htH","wtH"]],
                ['xH','+-',["hc","dxH",0]],
                ['yH','+-',["vc","dyH",0]],
                ['rI','min',["rw2","rh2"]],
                ['u1','*/',["dxH","dxH",1]],
                ['u2','*/',["dyH","dyH",1]],
                ['u3','*/',["rI","rI",1]],
                ['u4','+-',["u1",0,"u3"]],
                ['u5','+-',["u2",0,"u3"]],
                ['u6','*/',["u4","u5","u1"]],
                ['u7','*/',["u6",1,"u2"]],
                ['u8','+-',[1,0,"u7"]],
                ['u9','sqrt',["u8"]],
                ['u10','*/',["u4",1,"dxH"]],
                ['u11','*/',["u10",1,"dyH"]],
                ['u12','+/',[1,"u9","u11"]],
                ['u13','at2',[1,"u12"]],
                ['u14','+-',["u13",21600000,0]],
                ['u15','?:',["u13","u13","u14"]],
                ['u16','+-',["u15",0,"enAng"]],
                ['u17','+-',["u16",21600000,0]],
                ['u18','?:',["u16","u16","u17"]],
                ['u19','+-',["u18",0,"cd2"]],
                ['u20','+-',["u18",0,21600000]],
                ['u21','?:',["u19","u20","u18"]],
                ['maxAng','abs',["u21"]],
                ['aAng','pin',[0,"adj2","maxAng"]],
                ['ptAng','+-',["enAng","aAng",0]],
                ['wtA','sin',["rw3","ptAng"]],
                ['htA','cos',["rh3","ptAng"]],
                ['dxA','cat2',["rw3","htA","wtA"]],
                ['dyA','sat2',["rh3","htA","wtA"]],
                ['xA','+-',["hc","dxA",0]],
                ['yA','+-',["vc","dyA",0]],
                ['dxG','cos',["thh","ptAng"]],
                ['dyG','sin',["thh","ptAng"]],
                ['xG','+-',["xH","dxG",0]],
                ['yG','+-',["yH","dyG",0]],
                ['dxB','cos',["thh","ptAng"]],
                ['dyB','sin',["thh","ptAng"]],
                ['xB','+-',["xH",0,"dxB",0]],
                ['yB','+-',["yH",0,"dyB",0]],
                ['sx1','+-',["xB",0,"hc"]],
                ['sy1','+-',["yB",0,"vc"]],
                ['sx2','+-',["xG",0,"hc"]],
                ['sy2','+-',["yG",0,"vc"]],
                ['rO','min',["rw1","rh1"]],
                ['x1O','*/',["sx1","rO","rw1"]],
                ['y1O','*/',["sy1","rO","rh1"]],
                ['x2O','*/',["sx2","rO","rw1"]],
                ['y2O','*/',["sy2","rO","rh1"]],
                ['dxO','+-',["x2O",0,"x1O"]],
                ['dyO','+-',["y2O",0,"y1O"]],
                ['dO','mod',["dxO","dyO",0]],
                ['q1','*/',["x1O","y2O",1]],
                ['q2','*/',["x2O","y1O",1]],
                ['DO','+-',["q1",0,"q2"]],
                ['q3','*/',["rO","rO",1]],
                ['q4','*/',["dO","dO",1]],
                ['q5','*/',["q3","q4",1]],
                ['q6','*/',["DO","DO",1]],
                ['q7','+-',["q5",0,"q6"]],
                ['q8','max',["q7",0]],
                ['sdelO','sqrt',["q8"]],
                ['ndyO','*/',["dyO",-1,1]],
                ['sdyO','?:',["ndyO",-1,1]],
                ['q9','*/',["sdyO","dxO",1]],
                ['q10','*/',["q9","sdelO",1]],
                ['q11','*/',["DO","dyO",1]],
                ['dxF1','+/',["q11","q10","q4"]],
                ['q12','+-',["q11",0,"q10"]],
                ['dxF2','*/',["q12",1,"q4"]],
                ['adyO','abs',["dyO"]],
                ['q13','*/',["adyO","sdelO",1]],
                ['q14','*/',["DO","dxO",-1]],
                ['dyF1','+/',["q14","q13","q4"]],
                ['q15','+-',["q14",0,"q13"]],
                ['dyF2','*/',["q15",1,"q4"]],
                ['q16','+-',["x2O",0,"dxF1"]],
                ['q17','+-',["x2O",0,"dxF2"]],
                ['q18','+-',["y2O",0,"dyF1"]],
                ['q19','+-',["y2O",0,"dyF2"]],
                ['q20','mod',["q16","q18",0]],
                ['q21','mod',["q17","q19",0]],
                ['q22','+-',["q21",0,"q20"]],
                ['dxF','?:',["q22","dxF1","dxF2"]],
                ['dyF','?:',["q22","dyF1","dyF2"]],
                ['sdxF','*/',["dxF","rw1","rO"]],
                ['sdyF','*/',["dyF","rh1","rO"]],
                ['xF','+-',["hc","sdxF",0]],
                ['yF','+-',["vc","sdyF",0]],
                ['x1I','*/',["sx1","rI","rw2"]],
                ['y1I','*/',["sy1","rI","rh2"]],
                ['x2I','*/',["sx2","rI","rw2"]],
                ['y2I','*/',["sy2","rI","rh2"]],
                ['dxI','+-',["x2I",0,"x1I"]],
                ['dyI','+-',["y2I",0,"y1I"]],
                ['dI','mod',["dxI","dyI",0]],
                ['v1','*/',["x1I","y2I",1]],
                ['v2','*/',["x2I","y1I",1]],
                ['DI','+-',["v1",0,"v2"]],
                ['v3','*/',["rI","rI",1]],
                ['v4','*/',["dI","dI",1]],
                ['v5','*/',["v3","v4",1]],
                ['v6','*/',["DI","DI",1]],
                ['v7','+-',["v5",0,"v6"]],
                ['v8','max',["v7",0]],
                ['sdelI','sqrt',["v8"]],
                ['v9','*/',["sdyO","dxI",1]],
                ['v10','*/',["v9","sdelI",1]],
                ['v11','*/',["DI","dyI",1]],
                ['dxC1','+/',["v11","v10","v4"]],
                ['v12','+-',["v11",0,"v10"]],
                ['dxC2','*/',["v12",1,"v4"]],
                ['adyI','abs',["dyI"]],
                ['v13','*/',["adyI","sdelI",1]],
                ['v14','*/',["DI","dxI",-1]],
                ['dyC1','+/',["v14","v13","v4"]],
                ['v15','+-',["v14",0,"v13"]],
                ['dyC2','*/',["v15",1,"v4"]],
                ['v16','+-',["x1I",0,"dxC1"]],
                ['v17','+-',["x1I",0,"dxC2"]],
                ['v18','+-',["y1I",0,"dyC1"]],
                ['v19','+-',["y1I",0,"dyC2"]],
                ['v20','mod',["v16","v18",0]],
                ['v21','mod',["v17","v19",0]],
                ['v22','+-',["v21",0,"v20"]],
                ['dxC','?:',["v22","dxC1","dxC2"]],
                ['dyC','?:',["v22","dyC1","dyC2"]],
                ['sdxC','*/',["dxC","rw2","rI"]],
                ['sdyC','*/',["dyC","rh2","rI"]],
                ['xC','+-',["hc","sdxC",0]],
                ['yC','+-',["vc","sdyC",0]],
                ['wtI','sin',["rw3","stAng"]],
                ['htI','cos',["rh3","stAng"]],
                ['dxI','cat2',["rw3","htI","wtI"]],
                ['dyI','sat2',["rh3","htI","wtI"]],
                ['xI','+-',["hc","dxI",0]],
                ['yI','+-',["vc","dyI",0]],
                ['lptAng','+-',["stAng",0,"aAng"]],
                ['wtL','sin',["rw3","lptAng"]],
                ['htL','cos',["rh3","lptAng"]],
                ['dxL','cat2',["rw3","htL","wtL"]],
                ['dyL','sat2',["rh3","htL","wtL"]],
                ['xL','+-',["hc","dxL",0]],
                ['yL','+-',["vc","dyL",0]],
                ['dxK','cos',["thh","lptAng"]],
                ['dyK','sin',["thh","lptAng"]],
                ['xK','+-',["xI","dxK",0]],
                ['yK','+-',["yI","dyK",0]],
                ['dxJ','cos',["thh","lptAng"]],
                ['dyJ','sin',["thh","lptAng"]],
                ['xJ','+-',["xI",0,"dxJ",0]],
                ['yJ','+-',["yI",0,"dyJ",0]],
                ['p1','+-',["xF",0,"xC"]],
                ['p2','+-',["yF",0,"yC"]],
                ['p3','mod',["p1","p2",0]],
                ['p4','*/',["p3",1,2]],
                ['p5','+-',["p4",0,"thh"]],
                ['xGp','?:',["p5","xF","xG"]],
                ['yGp','?:',["p5","yF","yG"]],
                ['xBp','?:',["p5","xC","xB"]],
                ['yBp','?:',["p5","yC","yB"]],
                ['en0','at2',["sdxF","sdyF"]],
                ['en1','+-',["en0",21600000,0]],
                ['en2','?:',["en0","en0","en1"]],
                ['od0','+-',["en2",0,"enAng"]],
                ['od1','+-',["od0",21600000,0]],
                ['od2','?:',["od0","od0","od1"]],
                ['st0','+-',["stAng",0,"od2"]],
                ['st1','+-',["st0",21600000,0]],
                ['st2','?:',["st0","st0","st1"]],
                ['sw0','+-',["en2",0,"st2"]],
                ['sw1','+-',["sw0",21600000,0]],
                ['swAng','?:',["sw0","sw0","sw1"]],
                ['ist0','at2',["sdxC","sdyC"]],
                ['ist1','+-',["ist0",21600000,0]],
                ['istAng','?:',["ist0","ist0","ist1"]],
                ['id0','+-',["istAng",0,"enAng"]],
                ['id1','+-',["id0",0,21600000]],
                ['id2','?:',["id0","id1","id0"]],
                ['ien0','+-',["stAng",0,"id2"]],
                ['ien1','+-',["ien0",0,21600000]],
                ['ien2','?:',["ien1","ien1","ien0"]],
                ['isw1','+-',["ien2",0,"istAng"]],
                ['isw2','+-',["isw1",0,21600000]],
                ['iswAng','?:',["isw1","isw2","isw1"]],
                ['wtE','sin',["rw1","st2"]],
                ['htE','cos',["rh1","st2"]],
                ['dxE','cat2',["rw1","htE","wtE"]],
                ['dyE','sat2',["rh1","htE","wtE"]],
                ['xE','+-',["hc","dxE",0]],
                ['yE','+-',["vc","dyE",0]],
                ['wtD','sin',["rw2","ien2"]],
                ['htD','cos',["rh2","ien2"]],
                ['dxD','cat2',["rw2","htD","wtD"]],
                ['dyD','sat2',["rh2","htD","wtD"]],
                ['xD','+-',["hc","dxD",0]],
                ['yD','+-',["vc","dyD",0]],
                ['xKp','?:',["p5","xE","xK"]],
                ['yKp','?:',["p5","yE","yK"]],
                ['xJp','?:',["p5","xD","xJ"]],
                ['yJp','?:',["p5","yD","yJ"]],
                ['aL','+-',["lptAng",0,"cd4"]],
                ['aA','+-',["ptAng","cd4",0]],
                ['aB','+-',["ptAng","cd2",0]],
                ['aJ','+-',["lptAng","cd2",0]],
                ['idx','cos',["rw1",2700000]],
                ['idy','sin',["rh1",2700000]],
                ['il','+-',["hc",0,"idx"]],
                ['ir','+-',["hc","idx",0]],
                ['it','+-',["vc",0,"idy"]],
                ['ib','+-',["vc","idy",0]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","xL","yL"],
                    ["lnTo","xKp","yKp"],
                    ["lnTo","xE","yE"],
                    ["arcTo","rw1","rh1","st2","swAng"],
                    ["lnTo","xGp","yGp"],
                    ["lnTo","xA","yA"],
                    ["lnTo","xBp","yBp"],
                    ["lnTo","xC","yC"],
                    ["arcTo","rw2","rh2","istAng","iswAng"],
                    ["lnTo","xJp","yJp"],
                    ["close"],
                ]},
            ]
        },
        leftRightRibbon: {
            av: {adj1:50000,adj2:50000,adj3:16667},
            gd: [
                ['a3','pin',[0,"adj3",33333]],
                ['maxAdj1','+-',[100000,0,"a3"]],
                ['a1','pin',[0,"adj1","maxAdj1"]],
                ['w1','+-',["wd2",0,"wd32"]],
                ['maxAdj2','*/',[100000,"w1","ss"]],
                ['a2','pin',[0,"adj2","maxAdj2"]],
                ['x1','*/',["ss","a2",100000]],
                ['x4','+-',["r",0,"x1"]],
                ['dy1','*/',["h","a1",200000]],
                ['dy2','*/',["h","a3",-200000]],
                ['ly1','+-',["vc","dy2","dy1"]],
                ['ry4','+-',["vc","dy1","dy2"]],
                ['ly2','+-',["ly1","dy1",0]],
                ['ry3','+-',["b",0,"ly2"]],
                ['ly4','*/',["ly2",2,1]],
                ['ry1','+-',["b",0,"ly4"]],
                ['ly3','+-',["ly4",0,"ly1"]],
                ['ry2','+-',["b",0,"ly3"]],
                ['hR','*/',["a3","ss",400000]],
                ['x2','+-',["hc",0,"wd32"]],
                ['x3','+-',["hc","wd32",0]],
                ['y1','+-',["ly1","hR",0]],
                ['y2','+-',["ry2",0,"hR"]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","l","ly2"],
                    ["lnTo","x1","t"],
                    ["lnTo","x1","ly1"],
                    ["lnTo","hc","ly1"],
                    ["arcTo","wd32","hR","3cd4","cd2"],
                    ["arcTo","wd32","hR","3cd4",-10800000],
                    ["lnTo","x4","ry2"],
                    ["lnTo","x4","ry1"],
                    ["lnTo","r","ry3"],
                    ["lnTo","x4","b"],
                    ["lnTo","x4","ry4"],
                    ["lnTo","hc","ry4"],
                    ["arcTo","wd32","hR","cd4","cd4"],
                    ["lnTo","x2","ly3"],
                    ["lnTo","x1","ly3"],
                    ["lnTo","x1","ly4"],
                    ["close"],
                ]},
                {fill:"darkenLess",stroke:"false",cmds:[
                    ["moveTo","x3","y1"],
                    ["arcTo","wd32","hR",0,"cd4"],
                    ["arcTo","wd32","hR","3cd4",-10800000],
                    ["lnTo","x3","ry2"],
                    ["close"],
                ]},
                {fill:"none",cmds:[
                    ["moveTo","l","ly2"],
                    ["lnTo","x1","t"],
                    ["lnTo","x1","ly1"],
                    ["lnTo","hc","ly1"],
                    ["arcTo","wd32","hR","3cd4","cd2"],
                    ["arcTo","wd32","hR","3cd4",-10800000],
                    ["lnTo","x4","ry2"],
                    ["lnTo","x4","ry1"],
                    ["lnTo","r","ry3"],
                    ["lnTo","x4","b"],
                    ["lnTo","x4","ry4"],
                    ["lnTo","hc","ry4"],
                    ["arcTo","wd32","hR","cd4","cd4"],
                    ["lnTo","x2","ly3"],
                    ["lnTo","x1","ly3"],
                    ["lnTo","x1","ly4"],
                    ["close"],
                    ["moveTo","x3","y1"],
                    ["lnTo","x3","ry2"],
                    ["moveTo","x2","y2"],
                    ["lnTo","x2","ly3"],
                ]},
            ]
        },
        leftRightUpArrow: {
            av: {adj1:25000,adj2:25000,adj3:25000},
            gd: [
                ['a2','pin',[0,"adj2",50000]],
                ['maxAdj1','*/',["a2",2,1]],
                ['a1','pin',[0,"adj1","maxAdj1"]],
                ['q1','+-',[100000,0,"maxAdj1"]],
                ['maxAdj3','*/',["q1",1,2]],
                ['a3','pin',[0,"adj3","maxAdj3"]],
                ['x1','*/',["ss","a3",100000]],
                ['dx2','*/',["ss","a2",100000]],
                ['x2','+-',["hc",0,"dx2"]],
                ['x5','+-',["hc","dx2",0]],
                ['dx3','*/',["ss","a1",200000]],
                ['x3','+-',["hc",0,"dx3"]],
                ['x4','+-',["hc","dx3",0]],
                ['x6','+-',["r",0,"x1"]],
                ['dy2','*/',["ss","a2",50000]],
                ['y2','+-',["b",0,"dy2"]],
                ['y4','+-',["b",0,"dx2"]],
                ['y3','+-',["y4",0,"dx3"]],
                ['y5','+-',["y4","dx3",0]],
                ['il','*/',["dx3","x1","dx2"]],
                ['ir','+-',["r",0,"il"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","y4"],
                    ["lnTo","x1","y2"],
                    ["lnTo","x1","y3"],
                    ["lnTo","x3","y3"],
                    ["lnTo","x3","x1"],
                    ["lnTo","x2","x1"],
                    ["lnTo","hc","t"],
                    ["lnTo","x5","x1"],
                    ["lnTo","x4","x1"],
                    ["lnTo","x4","y3"],
                    ["lnTo","x6","y3"],
                    ["lnTo","x6","y2"],
                    ["lnTo","r","y4"],
                    ["lnTo","x6","b"],
                    ["lnTo","x6","y5"],
                    ["lnTo","x1","y5"],
                    ["lnTo","x1","b"],
                    ["close"],
                ]},
            ]
        },
        leftUpArrow: {
            av: {adj1:25000,adj2:25000,adj3:25000},
            gd: [
                ['a2','pin',[0,"adj2",50000]],
                ['maxAdj1','*/',["a2",2,1]],
                ['a1','pin',[0,"adj1","maxAdj1"]],
                ['maxAdj3','+-',[100000,0,"maxAdj1"]],
                ['a3','pin',[0,"adj3","maxAdj3"]],
                ['x1','*/',["ss","a3",100000]],
                ['dx2','*/',["ss","a2",50000]],
                ['x2','+-',["r",0,"dx2"]],
                ['y2','+-',["b",0,"dx2"]],
                ['dx4','*/',["ss","a2",100000]],
                ['x4','+-',["r",0,"dx4"]],
                ['y4','+-',["b",0,"dx4"]],
                ['dx3','*/',["ss","a1",200000]],
                ['x3','+-',["x4",0,"dx3"]],
                ['x5','+-',["x4","dx3",0]],
                ['y3','+-',["y4",0,"dx3"]],
                ['y5','+-',["y4","dx3",0]],
                ['il','*/',["dx3","x1","dx4"]],
                ['cx1','+/',["x1","x5",2]],
                ['cy1','+/',["x1","y5",2]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","y4"],
                    ["lnTo","x1","y2"],
                    ["lnTo","x1","y3"],
                    ["lnTo","x3","y3"],
                    ["lnTo","x3","x1"],
                    ["lnTo","x2","x1"],
                    ["lnTo","x4","t"],
                    ["lnTo","r","x1"],
                    ["lnTo","x5","x1"],
                    ["lnTo","x5","y5"],
                    ["lnTo","x1","y5"],
                    ["lnTo","x1","b"],
                    ["close"],
                ]},
            ]
        },
        lightningBolt: {
            gd: [
                ['x1','*/',["w",5022,21600]],
                ['x3','*/',["w",8472,21600]],
                ['x4','*/',["w",8757,21600]],
                ['x5','*/',["w",10012,21600]],
                ['x8','*/',["w",12860,21600]],
                ['x9','*/',["w",13917,21600]],
                ['x11','*/',["w",16577,21600]],
                ['y1','*/',["h",3890,21600]],
                ['y2','*/',["h",6080,21600]],
                ['y4','*/',["h",7437,21600]],
                ['y6','*/',["h",9705,21600]],
                ['y7','*/',["h",12007,21600]],
                ['y10','*/',["h",14277,21600]],
                ['y11','*/',["h",14915,21600]],
            ],
            paths: [
                {w:21600,h:21600,cmds:[
                    ["moveTo",8472,0],
                    ["lnTo",12860,6080],
                    ["lnTo",11050,6797],
                    ["lnTo",16577,12007],
                    ["lnTo",14767,12877],
                    ["lnTo",21600,21600],
                    ["lnTo",10012,14915],
                    ["lnTo",12222,13987],
                    ["lnTo",5022,9705],
                    ["lnTo",7602,8382],
                    ["lnTo",0,3890],
                    ["close"],
                ]},
            ]
        },
        mathDivide: {
            av: {adj1:23520,adj2:5880,adj3:11760},
            gd: [
                ['a1','pin',[1000,"adj1",36745]],
                ['ma1','+-',[0,0,"a1"]],
                ['ma3h','+/',[73490,"ma1",4]],
                ['ma3w','*/',[36745,"w","h"]],
                ['maxAdj3','min',["ma3h","ma3w"]],
                ['a3','pin',[1000,"adj3","maxAdj3"]],
                ['m4a3','*/',[-4,"a3",1]],
                ['maxAdj2','+-',[73490,"m4a3","a1"]],
                ['a2','pin',[0,"adj2","maxAdj2"]],
                ['dy1','*/',["h","a1",200000]],
                ['yg','*/',["h","a2",100000]],
                ['rad','*/',["h","a3",100000]],
                ['dx1','*/',["w",73490,200000]],
                ['y3','+-',["vc",0,"dy1"]],
                ['y4','+-',["vc","dy1",0]],
                ['a','+-',["yg","rad",0]],
                ['y2','+-',["y3",0,"a"]],
                ['y1','+-',["y2",0,"rad"]],
                ['y5','+-',["b",0,"y1"]],
                ['x1','+-',["hc",0,"dx1"]],
                ['x3','+-',["hc","dx1",0]],
                ['x2','+-',["hc",0,"rad"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","hc","y1"],
                    ["arcTo","rad","rad","3cd4",21600000],
                    ["close"],
                    ["moveTo","hc","y5"],
                    ["arcTo","rad","rad","cd4",21600000],
                    ["close"],
                    ["moveTo","x1","y3"],
                    ["lnTo","x3","y3"],
                    ["lnTo","x3","y4"],
                    ["lnTo","x1","y4"],
                    ["close"],
                ]},
            ]
        },
        mathEqual: {
            av: {adj1:23520,adj2:11760},
            gd: [
                ['a1','pin',[0,"adj1",36745]],
                ['2a1','*/',["a1",2,1]],
                ['mAdj2','+-',[100000,0,"2a1"]],
                ['a2','pin',[0,"adj2","mAdj2"]],
                ['dy1','*/',["h","a1",100000]],
                ['dy2','*/',["h","a2",200000]],
                ['dx1','*/',["w",73490,200000]],
                ['y2','+-',["vc",0,"dy2"]],
                ['y3','+-',["vc","dy2",0]],
                ['y1','+-',["y2",0,"dy1"]],
                ['y4','+-',["y3","dy1",0]],
                ['x1','+-',["hc",0,"dx1"]],
                ['x2','+-',["hc","dx1",0]],
                ['yC1','+/',["y1","y2",2]],
                ['yC2','+/',["y3","y4",2]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","x1","y1"],
                    ["lnTo","x2","y1"],
                    ["lnTo","x2","y2"],
                    ["lnTo","x1","y2"],
                    ["close"],
                    ["moveTo","x1","y3"],
                    ["lnTo","x2","y3"],
                    ["lnTo","x2","y4"],
                    ["lnTo","x1","y4"],
                    ["close"],
                ]},
            ]
        },
        mathMinus: {
            av: {adj1:23520},
            gd: [
                ['a1','pin',[0,"adj1",100000]],
                ['dy1','*/',["h","a1",200000]],
                ['dx1','*/',["w",73490,200000]],
                ['y1','+-',["vc",0,"dy1"]],
                ['y2','+-',["vc","dy1",0]],
                ['x1','+-',["hc",0,"dx1"]],
                ['x2','+-',["hc","dx1",0]],
            ],
            paths: [
                {cmds:[["moveTo","x1","y1"],["lnTo","x2","y1"],["lnTo","x2","y2"],["lnTo","x1","y2"],["close"]]},
            ]
        },
        mathMultiply: {
            av: {adj1:23520},
            gd: [
                ['a1','pin',[0,"adj1",51965]],
                ['th','*/',["ss","a1",100000]],
                ['a','at2',["w","h"]],
                ['sa','sin',[1,"a"]],
                ['ca','cos',[1,"a"]],
                ['ta','tan',[1,"a"]],
                ['dl','mod',["w","h",0]],
                ['rw','*/',["dl",51965,100000]],
                ['lM','+-',["dl",0,"rw"]],
                ['xM','*/',["ca","lM",2]],
                ['yM','*/',["sa","lM",2]],
                ['dxAM','*/',["sa","th",2]],
                ['dyAM','*/',["ca","th",2]],
                ['xA','+-',["xM",0,"dxAM"]],
                ['yA','+-',["yM","dyAM",0]],
                ['xB','+-',["xM","dxAM",0]],
                ['yB','+-',["yM",0,"dyAM"]],
                ['xBC','+-',["hc",0,"xB"]],
                ['yBC','*/',["xBC","ta",1]],
                ['yC','+-',["yBC","yB",0]],
                ['xD','+-',["r",0,"xB"]],
                ['xE','+-',["r",0,"xA"]],
                ['yFE','+-',["vc",0,"yA"]],
                ['xFE','*/',["yFE",1,"ta"]],
                ['xF','+-',["xE",0,"xFE"]],
                ['xL','+-',["xA","xFE",0]],
                ['yG','+-',["b",0,"yA"]],
                ['yH','+-',["b",0,"yB"]],
                ['yI','+-',["b",0,"yC"]],
                ['xC2','+-',["r",0,"xM"]],
                ['yC3','+-',["b",0,"yM"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","xA","yA"],
                    ["lnTo","xB","yB"],
                    ["lnTo","hc","yC"],
                    ["lnTo","xD","yB"],
                    ["lnTo","xE","yA"],
                    ["lnTo","xF","vc"],
                    ["lnTo","xE","yG"],
                    ["lnTo","xD","yH"],
                    ["lnTo","hc","yI"],
                    ["lnTo","xB","yH"],
                    ["lnTo","xA","yG"],
                    ["lnTo","xL","vc"],
                    ["close"],
                ]},
            ]
        },
        mathNotEqual: {
            av: {adj1:23520,adj2:6600000,adj3:11760},
            gd: [
                ['a1','pin',[0,"adj1",50000]],
                ['crAng','pin',[4200000,"adj2",6600000]],
                ['2a1','*/',["a1",2,1]],
                ['maxAdj3','+-',[100000,0,"2a1"]],
                ['a3','pin',[0,"adj3","maxAdj3"]],
                ['dy1','*/',["h","a1",100000]],
                ['dy2','*/',["h","a3",200000]],
                ['dx1','*/',["w",73490,200000]],
                ['x1','+-',["hc",0,"dx1"]],
                ['x8','+-',["hc","dx1",0]],
                ['y2','+-',["vc",0,"dy2"]],
                ['y3','+-',["vc","dy2",0]],
                ['y1','+-',["y2",0,"dy1"]],
                ['y4','+-',["y3","dy1",0]],
                ['cadj2','+-',["crAng",0,"cd4"]],
                ['xadj2','tan',["hd2","cadj2"]],
                ['len','mod',["xadj2","hd2",0]],
                ['bhw','*/',["len","dy1","hd2"]],
                ['bhw2','*/',["bhw",1,2]],
                ['x7','+-',["hc","xadj2","bhw2"]],
                ['dx67','*/',["xadj2","y1","hd2"]],
                ['x6','+-',["x7",0,"dx67"]],
                ['dx57','*/',["xadj2","y2","hd2"]],
                ['x5','+-',["x7",0,"dx57"]],
                ['dx47','*/',["xadj2","y3","hd2"]],
                ['x4','+-',["x7",0,"dx47"]],
                ['dx37','*/',["xadj2","y4","hd2"]],
                ['x3','+-',["x7",0,"dx37"]],
                ['dx27','*/',["xadj2",2,1]],
                ['x2','+-',["x7",0,"dx27"]],
                ['rx7','+-',["x7","bhw",0]],
                ['rx6','+-',["x6","bhw",0]],
                ['rx5','+-',["x5","bhw",0]],
                ['rx4','+-',["x4","bhw",0]],
                ['rx3','+-',["x3","bhw",0]],
                ['rx2','+-',["x2","bhw",0]],
                ['dx7','*/',["dy1","hd2","len"]],
                ['rxt','+-',["x7","dx7",0]],
                ['lxt','+-',["rx7",0,"dx7"]],
                ['rx','?:',["cadj2","rxt","rx7"]],
                ['lx','?:',["cadj2","x7","lxt"]],
                ['dy3','*/',["dy1","xadj2","len"]],
                ['dy4','+-',[0,0,"dy3"]],
                ['ry','?:',["cadj2","dy3","t"]],
                ['ly','?:',["cadj2","t","dy4"]],
                ['dlx','+-',["w",0,"rx"]],
                ['drx','+-',["w",0,"lx"]],
                ['dly','+-',["h",0,"ry"]],
                ['dry','+-',["h",0,"ly"]],
                ['xC1','+/',["rx","lx",2]],
                ['xC2','+/',["drx","dlx",2]],
                ['yC1','+/',["ry","ly",2]],
                ['yC2','+/',["y1","y2",2]],
                ['yC3','+/',["y3","y4",2]],
                ['yC4','+/',["dry","dly",2]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","x1","y1"],
                    ["lnTo","x6","y1"],
                    ["lnTo","lx","ly"],
                    ["lnTo","rx","ry"],
                    ["lnTo","rx6","y1"],
                    ["lnTo","x8","y1"],
                    ["lnTo","x8","y2"],
                    ["lnTo","rx5","y2"],
                    ["lnTo","rx4","y3"],
                    ["lnTo","x8","y3"],
                    ["lnTo","x8","y4"],
                    ["lnTo","rx3","y4"],
                    ["lnTo","drx","dry"],
                    ["lnTo","dlx","dly"],
                    ["lnTo","x3","y4"],
                    ["lnTo","x1","y4"],
                    ["lnTo","x1","y3"],
                    ["lnTo","x4","y3"],
                    ["lnTo","x5","y2"],
                    ["lnTo","x1","y2"],
                    ["close"],
                ]},
            ]
        },
        mathPlus: {
            av: {adj1:23520},
            gd: [
                ['a1','pin',[0,"adj1",73490]],
                ['dx1','*/',["w",73490,200000]],
                ['dy1','*/',["h",73490,200000]],
                ['dx2','*/',["ss","a1",200000]],
                ['x1','+-',["hc",0,"dx1"]],
                ['x2','+-',["hc",0,"dx2"]],
                ['x3','+-',["hc","dx2",0]],
                ['x4','+-',["hc","dx1",0]],
                ['y1','+-',["vc",0,"dy1"]],
                ['y2','+-',["vc",0,"dx2"]],
                ['y3','+-',["vc","dx2",0]],
                ['y4','+-',["vc","dy1",0]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","x1","y2"],
                    ["lnTo","x2","y2"],
                    ["lnTo","x2","y1"],
                    ["lnTo","x3","y1"],
                    ["lnTo","x3","y2"],
                    ["lnTo","x4","y2"],
                    ["lnTo","x4","y3"],
                    ["lnTo","x3","y3"],
                    ["lnTo","x3","y4"],
                    ["lnTo","x2","y4"],
                    ["lnTo","x2","y3"],
                    ["lnTo","x1","y3"],
                    ["close"],
                ]},
            ]
        },
        moon: {
            av: {adj:50000},
            gd: [
                ['a','pin',[0,"adj",87500]],
                ['g0','*/',["ss","a",100000]],
                ['g0w','*/',["g0","w","ss"]],
                ['g1','+-',["ss",0,"g0"]],
                ['g2','*/',["g0","g0","g1"]],
                ['g3','*/',["ss","ss","g1"]],
                ['g4','*/',["g3",2,1]],
                ['g5','+-',["g4",0,"g2"]],
                ['g6','+-',["g5",0,"g0"]],
                ['g6w','*/',["g6","w","ss"]],
                ['g7','*/',["g5",1,2]],
                ['g8','+-',["g7",0,"g0"]],
                ['dy1','*/',["g8","hd2","ss"]],
                ['g10h','+-',["vc",0,"dy1"]],
                ['g11h','+-',["vc","dy1",0]],
                ['g12','*/',["g0",9598,32768]],
                ['g12w','*/',["g12","w","ss"]],
                ['g13','+-',["ss",0,"g12"]],
                ['q1','*/',["ss","ss",1]],
                ['q2','*/',["g13","g13",1]],
                ['q3','+-',["q1",0,"q2"]],
                ['q4','sqrt',["q3"]],
                ['dy4','*/',["q4","hd2","ss"]],
                ['g15h','+-',["vc",0,"dy4"]],
                ['g16h','+-',["vc","dy4",0]],
                ['g17w','+-',["g6w",0,"g0w"]],
                ['g18w','*/',["g17w",1,2]],
                ['dx2p','+-',["g0w","g18w","w"]],
                ['dx2','*/',["dx2p",-1,1]],
                ['dy2','*/',["hd2",-1,1]],
                ['stAng1','at2',["dx2","dy2"]],
                ['enAngp1','at2',["dx2","hd2"]],
                ['enAng1','+-',["enAngp1",0,21600000]],
                ['swAng1','+-',["enAng1",0,"stAng1"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","r","b"],
                    ["arcTo","w","hd2","cd4","cd2"],
                    ["arcTo","g18w","dy1","stAng1","swAng1"],
                    ["close"],
                ]},
            ]
        },
        nonIsoscelesTrapezoid: {
            av: {adj1:25000,adj2:25000},
            gd: [
                ['maxAdj','*/',[50000,"w","ss"]],
                ['a1','pin',[0,"adj1","maxAdj"]],
                ['a2','pin',[0,"adj2","maxAdj"]],
                ['x1','*/',["ss","a1",200000]],
                ['x2','*/',["ss","a1",100000]],
                ['dx3','*/',["ss","a2",100000]],
                ['x3','+-',["r",0,"dx3"]],
                ['x4','+/',["r","x3",2]],
                ['il','*/',["wd3","a1","maxAdj"]],
                ['adjm','max',["a1","a2"]],
                ['it','*/',["hd3","adjm","maxAdj"]],
                ['irt','*/',["wd3","a2","maxAdj"]],
                ['ir','+-',["r",0,"irt"]],
            ],
            paths: [
                {cmds:[["moveTo","l","b"],["lnTo","x2","t"],["lnTo","x3","t"],["lnTo","r","b"],["close"]]},
            ]
        },
        noSmoking: {
            av: {adj:18750},
            gd: [
                ['a','pin',[0,"adj",50000]],
                ['dr','*/',["ss","a",100000]],
                ['iwd2','+-',["wd2",0,"dr"]],
                ['ihd2','+-',["hd2",0,"dr"]],
                ['ang','at2',["w","h"]],
                ['ct','cos',["ihd2","ang"]],
                ['st','sin',["iwd2","ang"]],
                ['m','mod',["ct","st",0]],
                ['n','*/',["iwd2","ihd2","m"]],
                ['drd2','*/',["dr",1,2]],
                ['dang','at2',["n","drd2"]],
                ['2dang','*/',["dang",2,1]],
                ['swAng','+-',[-10800000,"2dang",0]],
                ['t3','at2',["w","h"]],
                ['stAng1','+-',["t3",0,"dang"]],
                ['stAng2','+-',["stAng1",0,"cd2"]],
                ['ct1','cos',["ihd2","stAng1"]],
                ['st1','sin',["iwd2","stAng1"]],
                ['m1','mod',["ct1","st1",0]],
                ['n1','*/',["iwd2","ihd2","m1"]],
                ['dx1','cos',["n1","stAng1"]],
                ['dy1','sin',["n1","stAng1"]],
                ['x1','+-',["hc","dx1",0]],
                ['y1','+-',["vc","dy1",0]],
                ['x2','+-',["hc",0,"dx1"]],
                ['y2','+-',["vc",0,"dy1"]],
                ['idx','cos',["wd2",2700000]],
                ['idy','sin',["hd2",2700000]],
                ['il','+-',["hc",0,"idx"]],
                ['ir','+-',["hc","idx",0]],
                ['it','+-',["vc",0,"idy"]],
                ['ib','+-',["vc","idy",0]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","vc"],
                    ["arcTo","wd2","hd2","cd2","cd4"],
                    ["arcTo","wd2","hd2","3cd4","cd4"],
                    ["arcTo","wd2","hd2",0,"cd4"],
                    ["arcTo","wd2","hd2","cd4","cd4"],
                    ["close"],
                    ["moveTo","x1","y1"],
                    ["arcTo","iwd2","ihd2","stAng1","swAng"],
                    ["close"],
                    ["moveTo","x2","y2"],
                    ["arcTo","iwd2","ihd2","stAng2","swAng"],
                    ["close"],
                ]},
            ]
        },
        notchedRightArrow: {
            av: {adj1:50000,adj2:50000},
            gd: [
                ['maxAdj2','*/',[100000,"w","ss"]],
                ['a1','pin',[0,"adj1",100000]],
                ['a2','pin',[0,"adj2","maxAdj2"]],
                ['dx2','*/',["ss","a2",100000]],
                ['x2','+-',["r",0,"dx2"]],
                ['dy1','*/',["h","a1",200000]],
                ['y1','+-',["vc",0,"dy1"]],
                ['y2','+-',["vc","dy1",0]],
                ['x1','*/',["dy1","dx2","hd2"]],
                ['x3','+-',["r",0,"x1"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","y1"],
                    ["lnTo","x2","y1"],
                    ["lnTo","x2","t"],
                    ["lnTo","r","vc"],
                    ["lnTo","x2","b"],
                    ["lnTo","x2","y2"],
                    ["lnTo","l","y2"],
                    ["lnTo","x1","vc"],
                    ["close"],
                ]},
            ]
        },
        octagon: {
            av: {adj:29289},
            gd: [
                ['a','pin',[0,"adj",50000]],
                ['x1','*/',["ss","a",100000]],
                ['x2','+-',["r",0,"x1"]],
                ['y2','+-',["b",0,"x1"]],
                ['il','*/',["x1",1,2]],
                ['ir','+-',["r",0,"il"]],
                ['ib','+-',["b",0,"il"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","x1"],
                    ["lnTo","x1","t"],
                    ["lnTo","x2","t"],
                    ["lnTo","r","x1"],
                    ["lnTo","r","y2"],
                    ["lnTo","x2","b"],
                    ["lnTo","x1","b"],
                    ["lnTo","l","y2"],
                    ["close"],
                ]},
            ]
        },
        parallelogram: {
            av: {adj:25000},
            gd: [
                ['maxAdj','*/',[100000,"w","ss"]],
                ['a','pin',[0,"adj","maxAdj"]],
                ['x1','*/',["ss","a",200000]],
                ['x2','*/',["ss","a",100000]],
                ['x6','+-',["r",0,"x1"]],
                ['x5','+-',["r",0,"x2"]],
                ['x3','*/',["x5",1,2]],
                ['x4','+-',["r",0,"x3"]],
                ['il','*/',["wd2","a","maxAdj"]],
                ['q1','*/',[5,"a","maxAdj"]],
                ['q2','+/',[1,"q1",12]],
                ['il','*/',["q2","w",1]],
                ['it','*/',["q2","h",1]],
                ['ir','+-',["r",0,"il"]],
                ['ib','+-',["b",0,"it"]],
                ['q3','*/',["h","hc","x2"]],
                ['y1','pin',[0,"q3","h"]],
                ['y2','+-',["b",0,"y1"]],
            ],
            paths: [
                {cmds:[["moveTo","l","b"],["lnTo","x2","t"],["lnTo","r","t"],["lnTo","x5","b"],["close"]]},
            ]
        },
        pentagon: {
            av: {hf:105146,vf:110557},
            gd: [
                ['swd2','*/',["wd2","hf",100000]],
                ['shd2','*/',["hd2","vf",100000]],
                ['svc','*/',["vc","vf",100000]],
                ['dx1','cos',["swd2",1080000]],
                ['dx2','cos',["swd2",18360000]],
                ['dy1','sin',["shd2",1080000]],
                ['dy2','sin',["shd2",18360000]],
                ['x1','+-',["hc",0,"dx1"]],
                ['x2','+-',["hc",0,"dx2"]],
                ['x3','+-',["hc","dx2",0]],
                ['x4','+-',["hc","dx1",0]],
                ['y1','+-',["svc",0,"dy1"]],
                ['y2','+-',["svc",0,"dy2"]],
                ['it','*/',["y1","dx2","dx1"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","x1","y1"],
                    ["lnTo","hc","t"],
                    ["lnTo","x4","y1"],
                    ["lnTo","x3","y2"],
                    ["lnTo","x2","y2"],
                    ["close"],
                ]},
            ]
        },
        pie: {
            av: {adj1:0,adj2:16200000},
            gd: [
                ['stAng','pin',[0,"adj1",21599999]],
                ['enAng','pin',[0,"adj2",21599999]],
                ['sw1','+-',["enAng",0,"stAng"]],
                ['sw2','+-',["sw1",21600000,0]],
                ['swAng','?:',["sw1","sw1","sw2"]],
                ['wt1','sin',["wd2","stAng"]],
                ['ht1','cos',["hd2","stAng"]],
                ['dx1','cat2',["wd2","ht1","wt1"]],
                ['dy1','sat2',["hd2","ht1","wt1"]],
                ['x1','+-',["hc","dx1",0]],
                ['y1','+-',["vc","dy1",0]],
                ['wt2','sin',["wd2","enAng"]],
                ['ht2','cos',["hd2","enAng"]],
                ['dx2','cat2',["wd2","ht2","wt2"]],
                ['dy2','sat2',["hd2","ht2","wt2"]],
                ['x2','+-',["hc","dx2",0]],
                ['y2','+-',["vc","dy2",0]],
                ['idx','cos',["wd2",2700000]],
                ['idy','sin',["hd2",2700000]],
                ['il','+-',["hc",0,"idx"]],
                ['ir','+-',["hc","idx",0]],
                ['it','+-',["vc",0,"idy"]],
                ['ib','+-',["vc","idy",0]],
            ],
            paths: [
                {cmds:[["moveTo","x1","y1"],["arcTo","wd2","hd2","stAng","swAng"],["lnTo","hc","vc"],["close"]]},
            ]
        },
        pieWedge: {
            gd: [
                ['g1','cos',["w",13500000]],
                ['g2','sin',["h",13500000]],
                ['x1','+-',["r","g1",0]],
                ['y1','+-',["b","g2",0]],
            ],
            paths: [
                {cmds:[["moveTo","l","b"],["arcTo","w","h","cd2","cd4"],["lnTo","r","b"],["close"]]},
            ]
        },
        plaque: {
            av: {adj:16667},
            gd: [
                ['a','pin',[0,"adj",50000]],
                ['x1','*/',["ss","a",100000]],
                ['x2','+-',["r",0,"x1"]],
                ['y2','+-',["b",0,"x1"]],
                ['il','*/',["x1",70711,100000]],
                ['ir','+-',["r",0,"il"]],
                ['ib','+-',["b",0,"il"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","x1"],
                    ["arcTo","x1","x1","cd4",-5400000],
                    ["lnTo","x2","t"],
                    ["arcTo","x1","x1","cd2",-5400000],
                    ["lnTo","r","y2"],
                    ["arcTo","x1","x1","3cd4",-5400000],
                    ["lnTo","x1","b"],
                    ["arcTo","x1","x1",0,-5400000],
                    ["close"],
                ]},
            ]
        },
        plaqueTabs: {
            gd: [['md','mod',["w","h",0]],['dx','*/',[1,"md",20]],['y1','+-',[0,"b","dx"]],['x1','+-',[0,"r","dx"]]],
            paths: [
                {cmds:[["moveTo","l","t"],["lnTo","dx","t"],["arcTo","dx","dx",0,"cd4"],["close"]]},
                {cmds:[["moveTo","l","y1"],["arcTo","dx","dx","3cd4","cd4"],["lnTo","l","b"],["close"]]},
                {cmds:[["moveTo","r","t"],["lnTo","r","dx"],["arcTo","dx","dx","cd4","cd4"],["close"]]},
                {cmds:[["moveTo","x1","b"],["arcTo","dx","dx","cd2","cd4"],["lnTo","r","b"],["close"]]},
            ]
        },
        plus: {
            av: {adj:25000},
            gd: [
                ['a','pin',[0,"adj",50000]],
                ['x1','*/',["ss","a",100000]],
                ['x2','+-',["r",0,"x1"]],
                ['y2','+-',["b",0,"x1"]],
                ['d','+-',["w",0,"h"]],
                ['il','?:',["d","l","x1"]],
                ['ir','?:',["d","r","x2"]],
                ['it','?:',["d","x1","t"]],
                ['ib','?:',["d","y2","b"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","x1"],
                    ["lnTo","x1","x1"],
                    ["lnTo","x1","t"],
                    ["lnTo","x2","t"],
                    ["lnTo","x2","x1"],
                    ["lnTo","r","x1"],
                    ["lnTo","r","y2"],
                    ["lnTo","x2","y2"],
                    ["lnTo","x2","b"],
                    ["lnTo","x1","b"],
                    ["lnTo","x1","y2"],
                    ["lnTo","l","y2"],
                    ["close"],
                ]},
            ]
        },
        quadArrow: {
            av: {adj1:22500,adj2:22500,adj3:22500},
            gd: [
                ['a2','pin',[0,"adj2",50000]],
                ['maxAdj1','*/',["a2",2,1]],
                ['a1','pin',[0,"adj1","maxAdj1"]],
                ['q1','+-',[100000,0,"maxAdj1"]],
                ['maxAdj3','*/',["q1",1,2]],
                ['a3','pin',[0,"adj3","maxAdj3"]],
                ['x1','*/',["ss","a3",100000]],
                ['dx2','*/',["ss","a2",100000]],
                ['x2','+-',["hc",0,"dx2"]],
                ['x5','+-',["hc","dx2",0]],
                ['dx3','*/',["ss","a1",200000]],
                ['x3','+-',["hc",0,"dx3"]],
                ['x4','+-',["hc","dx3",0]],
                ['x6','+-',["r",0,"x1"]],
                ['y2','+-',["vc",0,"dx2"]],
                ['y5','+-',["vc","dx2",0]],
                ['y3','+-',["vc",0,"dx3"]],
                ['y4','+-',["vc","dx3",0]],
                ['y6','+-',["b",0,"x1"]],
                ['il','*/',["dx3","x1","dx2"]],
                ['ir','+-',["r",0,"il"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","vc"],
                    ["lnTo","x1","y2"],
                    ["lnTo","x1","y3"],
                    ["lnTo","x3","y3"],
                    ["lnTo","x3","x1"],
                    ["lnTo","x2","x1"],
                    ["lnTo","hc","t"],
                    ["lnTo","x5","x1"],
                    ["lnTo","x4","x1"],
                    ["lnTo","x4","y3"],
                    ["lnTo","x6","y3"],
                    ["lnTo","x6","y2"],
                    ["lnTo","r","vc"],
                    ["lnTo","x6","y5"],
                    ["lnTo","x6","y4"],
                    ["lnTo","x4","y4"],
                    ["lnTo","x4","y6"],
                    ["lnTo","x5","y6"],
                    ["lnTo","hc","b"],
                    ["lnTo","x2","y6"],
                    ["lnTo","x3","y6"],
                    ["lnTo","x3","y4"],
                    ["lnTo","x1","y4"],
                    ["lnTo","x1","y5"],
                    ["close"],
                ]},
            ]
        },
        quadArrowCallout: {
            av: {adj1:18515,adj2:18515,adj3:18515,adj4:48123},
            gd: [
                ['a2','pin',[0,"adj2",50000]],
                ['maxAdj1','*/',["a2",2,1]],
                ['a1','pin',[0,"adj1","maxAdj1"]],
                ['maxAdj3','+-',[50000,0,"a2"]],
                ['a3','pin',[0,"adj3","maxAdj3"]],
                ['q2','*/',["a3",2,1]],
                ['maxAdj4','+-',[100000,0,"q2"]],
                ['a4','pin',["a1","adj4","maxAdj4"]],
                ['dx2','*/',["ss","a2",100000]],
                ['dx3','*/',["ss","a1",200000]],
                ['ah','*/',["ss","a3",100000]],
                ['dx1','*/',["w","a4",200000]],
                ['dy1','*/',["h","a4",200000]],
                ['x8','+-',["r",0,"ah"]],
                ['x2','+-',["hc",0,"dx1"]],
                ['x7','+-',["hc","dx1",0]],
                ['x3','+-',["hc",0,"dx2"]],
                ['x6','+-',["hc","dx2",0]],
                ['x4','+-',["hc",0,"dx3"]],
                ['x5','+-',["hc","dx3",0]],
                ['y8','+-',["b",0,"ah"]],
                ['y2','+-',["vc",0,"dy1"]],
                ['y7','+-',["vc","dy1",0]],
                ['y3','+-',["vc",0,"dx2"]],
                ['y6','+-',["vc","dx2",0]],
                ['y4','+-',["vc",0,"dx3"]],
                ['y5','+-',["vc","dx3",0]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","vc"],
                    ["lnTo","ah","y3"],
                    ["lnTo","ah","y4"],
                    ["lnTo","x2","y4"],
                    ["lnTo","x2","y2"],
                    ["lnTo","x4","y2"],
                    ["lnTo","x4","ah"],
                    ["lnTo","x3","ah"],
                    ["lnTo","hc","t"],
                    ["lnTo","x6","ah"],
                    ["lnTo","x5","ah"],
                    ["lnTo","x5","y2"],
                    ["lnTo","x7","y2"],
                    ["lnTo","x7","y4"],
                    ["lnTo","x8","y4"],
                    ["lnTo","x8","y3"],
                    ["lnTo","r","vc"],
                    ["lnTo","x8","y6"],
                    ["lnTo","x8","y5"],
                    ["lnTo","x7","y5"],
                    ["lnTo","x7","y7"],
                    ["lnTo","x5","y7"],
                    ["lnTo","x5","y8"],
                    ["lnTo","x6","y8"],
                    ["lnTo","hc","b"],
                    ["lnTo","x3","y8"],
                    ["lnTo","x4","y8"],
                    ["lnTo","x4","y7"],
                    ["lnTo","x2","y7"],
                    ["lnTo","x2","y5"],
                    ["lnTo","ah","y5"],
                    ["lnTo","ah","y6"],
                    ["close"],
                ]},
            ]
        },
        rect: {
            paths: [
                {cmds:[["moveTo","l","t"],["lnTo","r","t"],["lnTo","r","b"],["lnTo","l","b"],["close"]]},
            ]
        },
        ribbon: {
            av: {adj1:16667,adj2:50000},
            gd: [
                ['a1','pin',[0,"adj1",33333]],
                ['a2','pin',[25000,"adj2",75000]],
                ['x10','+-',["r",0,"wd8"]],
                ['dx2','*/',["w","a2",200000]],
                ['x2','+-',["hc",0,"dx2"]],
                ['x9','+-',["hc","dx2",0]],
                ['x3','+-',["x2","wd32",0]],
                ['x8','+-',["x9",0,"wd32"]],
                ['x5','+-',["x2","wd8",0]],
                ['x6','+-',["x9",0,"wd8"]],
                ['x4','+-',["x5",0,"wd32"]],
                ['x7','+-',["x6","wd32",0]],
                ['y1','*/',["h","a1",200000]],
                ['y2','*/',["h","a1",100000]],
                ['y4','+-',["b",0,"y2"]],
                ['y3','*/',["y4",1,2]],
                ['hR','*/',["h","a1",400000]],
                ['y5','+-',["b",0,"hR"]],
                ['y6','+-',["y2",0,"hR"]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","l","t"],
                    ["lnTo","x4","t"],
                    ["arcTo","wd32","hR","3cd4","cd2"],
                    ["lnTo","x3","y1"],
                    ["arcTo","wd32","hR","3cd4",-10800000],
                    ["lnTo","x8","y2"],
                    ["arcTo","wd32","hR","cd4",-10800000],
                    ["lnTo","x7","y1"],
                    ["arcTo","wd32","hR","cd4","cd2"],
                    ["lnTo","r","t"],
                    ["lnTo","x10","y3"],
                    ["lnTo","r","y4"],
                    ["lnTo","x9","y4"],
                    ["lnTo","x9","y5"],
                    ["arcTo","wd32","hR",0,"cd4"],
                    ["lnTo","x3","b"],
                    ["arcTo","wd32","hR","cd4","cd4"],
                    ["lnTo","x2","y4"],
                    ["lnTo","l","y4"],
                    ["lnTo","wd8","y3"],
                    ["close"],
                ]},
                {fill:"darkenLess",stroke:"false",cmds:[
                    ["moveTo","x5","hR"],
                    ["arcTo","wd32","hR",0,"cd4"],
                    ["lnTo","x3","y1"],
                    ["arcTo","wd32","hR","3cd4",-10800000],
                    ["lnTo","x5","y2"],
                    ["close"],
                    ["moveTo","x6","hR"],
                    ["arcTo","wd32","hR","cd2",-5400000],
                    ["lnTo","x8","y1"],
                    ["arcTo","wd32","hR","3cd4","cd2"],
                    ["lnTo","x6","y2"],
                    ["close"],
                ]},
                {fill:"none",cmds:[
                    ["moveTo","l","t"],
                    ["lnTo","x4","t"],
                    ["arcTo","wd32","hR","3cd4","cd2"],
                    ["lnTo","x3","y1"],
                    ["arcTo","wd32","hR","3cd4",-10800000],
                    ["lnTo","x8","y2"],
                    ["arcTo","wd32","hR","cd4",-10800000],
                    ["lnTo","x7","y1"],
                    ["arcTo","wd32","hR","cd4","cd2"],
                    ["lnTo","r","t"],
                    ["lnTo","x10","y3"],
                    ["lnTo","r","y4"],
                    ["lnTo","x9","y4"],
                    ["lnTo","x9","y5"],
                    ["arcTo","wd32","hR",0,"cd4"],
                    ["lnTo","x3","b"],
                    ["arcTo","wd32","hR","cd4","cd4"],
                    ["lnTo","x2","y4"],
                    ["lnTo","l","y4"],
                    ["lnTo","wd8","y3"],
                    ["close"],
                    ["moveTo","x5","hR"],
                    ["lnTo","x5","y2"],
                    ["moveTo","x6","y2"],
                    ["lnTo","x6","hR"],
                    ["moveTo","x2","y4"],
                    ["lnTo","x2","y6"],
                    ["moveTo","x9","y6"],
                    ["lnTo","x9","y4"],
                ]},
            ]
        },
        ribbon2: {
            av: {adj1:16667,adj2:50000},
            gd: [
                ['a1','pin',[0,"adj1",33333]],
                ['a2','pin',[25000,"adj2",75000]],
                ['x10','+-',["r",0,"wd8"]],
                ['dx2','*/',["w","a2",200000]],
                ['x2','+-',["hc",0,"dx2"]],
                ['x9','+-',["hc","dx2",0]],
                ['x3','+-',["x2","wd32",0]],
                ['x8','+-',["x9",0,"wd32"]],
                ['x5','+-',["x2","wd8",0]],
                ['x6','+-',["x9",0,"wd8"]],
                ['x4','+-',["x5",0,"wd32"]],
                ['x7','+-',["x6","wd32",0]],
                ['dy1','*/',["h","a1",200000]],
                ['y1','+-',["b",0,"dy1"]],
                ['dy2','*/',["h","a1",100000]],
                ['y2','+-',["b",0,"dy2"]],
                ['y4','+-',["t","dy2",0]],
                ['y3','+/',["y4","b",2]],
                ['hR','*/',["h","a1",400000]],
                ['y6','+-',["b",0,"hR"]],
                ['y7','+-',["y1",0,"hR"]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","l","b"],
                    ["lnTo","x4","b"],
                    ["arcTo","wd32","hR","cd4",-10800000],
                    ["lnTo","x3","y1"],
                    ["arcTo","wd32","hR","cd4","cd2"],
                    ["lnTo","x8","y2"],
                    ["arcTo","wd32","hR","3cd4","cd2"],
                    ["lnTo","x7","y1"],
                    ["arcTo","wd32","hR","3cd4",-10800000],
                    ["lnTo","r","b"],
                    ["lnTo","x10","y3"],
                    ["lnTo","r","y4"],
                    ["lnTo","x9","y4"],
                    ["lnTo","x9","hR"],
                    ["arcTo","wd32","hR",0,-5400000],
                    ["lnTo","x3","t"],
                    ["arcTo","wd32","hR","3cd4",-5400000],
                    ["lnTo","x2","y4"],
                    ["lnTo","l","y4"],
                    ["lnTo","wd8","y3"],
                    ["close"],
                ]},
                {fill:"darkenLess",stroke:"false",cmds:[
                    ["moveTo","x5","y6"],
                    ["arcTo","wd32","hR",0,-5400000],
                    ["lnTo","x3","y1"],
                    ["arcTo","wd32","hR","cd4","cd2"],
                    ["lnTo","x5","y2"],
                    ["close"],
                    ["moveTo","x6","y6"],
                    ["arcTo","wd32","hR","cd2","cd4"],
                    ["lnTo","x8","y1"],
                    ["arcTo","wd32","hR","cd4",-10800000],
                    ["lnTo","x6","y2"],
                    ["close"],
                ]},
                {fill:"none",cmds:[
                    ["moveTo","l","b"],
                    ["lnTo","wd8","y3"],
                    ["lnTo","l","y4"],
                    ["lnTo","x2","y4"],
                    ["lnTo","x2","hR"],
                    ["arcTo","wd32","hR","cd2","cd4"],
                    ["lnTo","x8","t"],
                    ["arcTo","wd32","hR","3cd4","cd4"],
                    ["lnTo","x9","y4"],
                    ["lnTo","x9","y4"],
                    ["lnTo","r","y4"],
                    ["lnTo","x10","y3"],
                    ["lnTo","r","b"],
                    ["lnTo","x7","b"],
                    ["arcTo","wd32","hR","cd4","cd2"],
                    ["lnTo","x8","y1"],
                    ["arcTo","wd32","hR","cd4",-10800000],
                    ["lnTo","x3","y2"],
                    ["arcTo","wd32","hR","3cd4",-10800000],
                    ["lnTo","x4","y1"],
                    ["arcTo","wd32","hR","3cd4","cd2"],
                    ["close"],
                    ["moveTo","x5","y2"],
                    ["lnTo","x5","y6"],
                    ["moveTo","x6","y6"],
                    ["lnTo","x6","y2"],
                    ["moveTo","x2","y7"],
                    ["lnTo","x2","y4"],
                    ["moveTo","x9","y4"],
                    ["lnTo","x9","y7"],
                ]},
            ]
        },
        rightArrow: {
            av: {adj1:50000,adj2:50000},
            gd: [
                ['maxAdj2','*/',[100000,"w","ss"]],
                ['a1','pin',[0,"adj1",100000]],
                ['a2','pin',[0,"adj2","maxAdj2"]],
                ['dx1','*/',["ss","a2",100000]],
                ['x1','+-',["r",0,"dx1"]],
                ['dy1','*/',["h","a1",200000]],
                ['y1','+-',["vc",0,"dy1"]],
                ['y2','+-',["vc","dy1",0]],
                ['dx2','*/',["y1","dx1","hd2"]],
                ['x2','+-',["x1","dx2",0]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","y1"],
                    ["lnTo","x1","y1"],
                    ["lnTo","x1","t"],
                    ["lnTo","r","vc"],
                    ["lnTo","x1","b"],
                    ["lnTo","x1","y2"],
                    ["lnTo","l","y2"],
                    ["close"],
                ]},
            ]
        },
        rightArrowCallout: {
            av: {adj1:25000,adj2:25000,adj3:25000,adj4:64977},
            gd: [
                ['maxAdj2','*/',[50000,"h","ss"]],
                ['a2','pin',[0,"adj2","maxAdj2"]],
                ['maxAdj1','*/',["a2",2,1]],
                ['a1','pin',[0,"adj1","maxAdj1"]],
                ['maxAdj3','*/',[100000,"w","ss"]],
                ['a3','pin',[0,"adj3","maxAdj3"]],
                ['q2','*/',["a3","ss","w"]],
                ['maxAdj4','+-',[100000,0,"q2"]],
                ['a4','pin',[0,"adj4","maxAdj4"]],
                ['dy1','*/',["ss","a2",100000]],
                ['dy2','*/',["ss","a1",200000]],
                ['y1','+-',["vc",0,"dy1"]],
                ['y2','+-',["vc",0,"dy2"]],
                ['y3','+-',["vc","dy2",0]],
                ['y4','+-',["vc","dy1",0]],
                ['dx3','*/',["ss","a3",100000]],
                ['x3','+-',["r",0,"dx3"]],
                ['x2','*/',["w","a4",100000]],
                ['x1','*/',["x2",1,2]],
            ],
            rect: {l:'l',t:'t',r:'x2',b:'b'},
            paths: [
                {cmds:[
                    ["moveTo","l","t"],
                    ["lnTo","x2","t"],
                    ["lnTo","x2","y2"],
                    ["lnTo","x3","y2"],
                    ["lnTo","x3","y1"],
                    ["lnTo","r","vc"],
                    ["lnTo","x3","y4"],
                    ["lnTo","x3","y3"],
                    ["lnTo","x2","y3"],
                    ["lnTo","x2","b"],
                    ["lnTo","l","b"],
                    ["close"],
                ]},
            ]
        },
        rightBrace: {
            av: {adj1:8333,adj2:50000},
            gd: [
                ['a2','pin',[0,"adj2",100000]],
                ['q1','+-',[100000,0,"a2"]],
                ['q2','min',["q1","a2"]],
                ['q3','*/',["q2",1,2]],
                ['maxAdj1','*/',["q3","h","ss"]],
                ['a1','pin',[0,"adj1","maxAdj1"]],
                ['y1','*/',["ss","a1",100000]],
                ['y3','*/',["h","a2",100000]],
                ['y2','+-',["y3",0,"y1"]],
                ['y4','+-',["b",0,"y1"]],
                ['dx1','cos',["wd2",2700000]],
                ['dy1','sin',["y1",2700000]],
                ['ir','+-',["l","dx1",0]],
                ['it','+-',["y1",0,"dy1"]],
                ['ib','+-',["b","dy1","y1"]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","l","t"],
                    ["arcTo","wd2","y1","3cd4","cd4"],
                    ["lnTo","hc","y2"],
                    ["arcTo","wd2","y1","cd2",-5400000],
                    ["arcTo","wd2","y1","3cd4",-5400000],
                    ["lnTo","hc","y4"],
                    ["arcTo","wd2","y1",0,"cd4"],
                    ["close"],
                ]},
                {fill:"none",cmds:[
                    ["moveTo","l","t"],
                    ["arcTo","wd2","y1","3cd4","cd4"],
                    ["lnTo","hc","y2"],
                    ["arcTo","wd2","y1","cd2",-5400000],
                    ["arcTo","wd2","y1","3cd4",-5400000],
                    ["lnTo","hc","y4"],
                    ["arcTo","wd2","y1",0,"cd4"],
                ]},
            ]
        },
        rightBracket: {
            av: {adj:8333},
            gd: [
                ['maxAdj','*/',[50000,"h","ss"]],
                ['a','pin',[0,"adj","maxAdj"]],
                ['y1','*/',["ss","a",100000]],
                ['y2','+-',["b",0,"y1"]],
                ['dx1','cos',["w",2700000]],
                ['dy1','sin',["y1",2700000]],
                ['ir','+-',["l","dx1",0]],
                ['it','+-',["y1",0,"dy1"]],
                ['ib','+-',["b","dy1","y1"]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","l","t"],
                    ["arcTo","w","y1","3cd4","cd4"],
                    ["lnTo","r","y2"],
                    ["arcTo","w","y1",0,"cd4"],
                    ["close"],
                ]},
                {fill:"none",cmds:[
                    ["moveTo","l","t"],
                    ["arcTo","w","y1","3cd4","cd4"],
                    ["lnTo","r","y2"],
                    ["arcTo","w","y1",0,"cd4"],
                ]},
            ]
        },
        round1Rect: {
            av: {adj:16667},
            gd: [
                ['a','pin',[0,"adj",50000]],
                ['dx1','*/',["ss","a",100000]],
                ['x1','+-',["r",0,"dx1"]],
                ['idx','*/',["dx1",29289,100000]],
                ['ir','+-',["r",0,"idx"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","t"],
                    ["lnTo","x1","t"],
                    ["arcTo","dx1","dx1","3cd4","cd4"],
                    ["lnTo","r","b"],
                    ["lnTo","l","b"],
                    ["close"],
                ]},
            ]
        },
        round2DiagRect: {
            av: {adj1:16667,adj2:0},
            gd: [
                ['a1','pin',[0,"adj1",50000]],
                ['a2','pin',[0,"adj2",50000]],
                ['x1','*/',["ss","a1",100000]],
                ['y1','+-',["b",0,"x1"]],
                ['a','*/',["ss","a2",100000]],
                ['x2','+-',["r",0,"a"]],
                ['y2','+-',["b",0,"a"]],
                ['dx1','*/',["x1",29289,100000]],
                ['dx2','*/',["a",29289,100000]],
                ['d','+-',["dx1",0,"dx2"]],
                ['dx','?:',["d","dx1","dx2"]],
                ['ir','+-',["r",0,"dx"]],
                ['ib','+-',["b",0,"dx"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","x1","t"],
                    ["lnTo","x2","t"],
                    ["arcTo","a","a","3cd4","cd4"],
                    ["lnTo","r","y1"],
                    ["arcTo","x1","x1",0,"cd4"],
                    ["lnTo","a","b"],
                    ["arcTo","a","a","cd4","cd4"],
                    ["lnTo","l","x1"],
                    ["arcTo","x1","x1","cd2","cd4"],
                    ["close"],
                ]},
            ]
        },
        round2SameRect: {
            av: {adj1:16667,adj2:0},
            gd: [
                ['a1','pin',[0,"adj1",50000]],
                ['a2','pin',[0,"adj2",50000]],
                ['tx1','*/',["ss","a1",100000]],
                ['tx2','+-',["r",0,"tx1"]],
                ['bx1','*/',["ss","a2",100000]],
                ['bx2','+-',["r",0,"bx1"]],
                ['by1','+-',["b",0,"bx1"]],
                ['d','+-',["tx1",0,"bx1"]],
                ['tdx','*/',["tx1",29289,100000]],
                ['bdx','*/',["bx1",29289,100000]],
                ['il','?:',["d","tdx","bdx"]],
                ['ir','+-',["r",0,"il"]],
                ['ib','+-',["b",0,"bdx"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","tx1","t"],
                    ["lnTo","tx2","t"],
                    ["arcTo","tx1","tx1","3cd4","cd4"],
                    ["lnTo","r","by1"],
                    ["arcTo","bx1","bx1",0,"cd4"],
                    ["lnTo","bx1","b"],
                    ["arcTo","bx1","bx1","cd4","cd4"],
                    ["lnTo","l","tx1"],
                    ["arcTo","tx1","tx1","cd2","cd4"],
                    ["close"],
                ]},
            ]
        },
        roundRect: {
            av: {adj:16667},
            gd: [
                ['a','pin',[0,"adj",50000]],
                ['x1','*/',["ss","a",100000]],
                ['x2','+-',["r",0,"x1"]],
                ['y2','+-',["b",0,"x1"]],
                ['il','*/',["x1",29289,100000]],
                ['ir','+-',["r",0,"il"]],
                ['ib','+-',["b",0,"il"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","x1"],
                    ["arcTo","x1","x1","cd2","cd4"],
                    ["lnTo","x2","t"],
                    ["arcTo","x1","x1","3cd4","cd4"],
                    ["lnTo","r","y2"],
                    ["arcTo","x1","x1",0,"cd4"],
                    ["lnTo","x1","b"],
                    ["arcTo","x1","x1","cd4","cd4"],
                    ["close"],
                ]},
            ]
        },
        rtTriangle: {
            gd: [['it','*/',["h",7,12]],['ir','*/',["w",7,12]],['ib','*/',["h",11,12]]],
            paths: [
                {cmds:[["moveTo","l","b"],["lnTo","l","t"],["lnTo","r","b"],["close"]]},
            ]
        },
        smileyFace: {
            av: {adj:4653},
            gd: [
                ['a','pin',[-4653,"adj",4653]],
                ['x1','*/',["w",4969,21699]],
                ['x2','*/',["w",6215,21600]],
                ['x3','*/',["w",13135,21600]],
                ['x4','*/',["w",16640,21600]],
                ['y1','*/',["h",7570,21600]],
                ['y3','*/',["h",16515,21600]],
                ['dy2','*/',["h","a",100000]],
                ['y2','+-',["y3",0,"dy2"]],
                ['y4','+-',["y3","dy2",0]],
                ['dy3','*/',["h","a",50000]],
                ['y5','+-',["y4","dy3",0]],
                ['idx','cos',["wd2",2700000]],
                ['idy','sin',["hd2",2700000]],
                ['il','+-',["hc",0,"idx"]],
                ['ir','+-',["hc","idx",0]],
                ['it','+-',["vc",0,"idy"]],
                ['ib','+-',["vc","idy",0]],
                ['wR','*/',["w",1125,21600]],
                ['hR','*/',["h",1125,21600]],
            ],
            paths: [
                {stroke:"false",cmds:[["moveTo","l","vc"],["arcTo","wd2","hd2","cd2",21600000],["close"]]},
                {fill:"darkenLess",cmds:[
                    ["moveTo","x2","y1"],
                    ["arcTo","wR","hR","cd2",21600000],
                    ["moveTo","x3","y1"],
                    ["arcTo","wR","hR","cd2",21600000],
                ]},
                {fill:"none",cmds:[["moveTo","x1","y2"],["quadBezTo","hc","y5","x4","y2"]]},
                {fill:"none",cmds:[["moveTo","l","vc"],["arcTo","wd2","hd2","cd2",21600000],["close"]]},
            ]
        },
        snip1Rect: {
            av: {adj:16667},
            gd: [
                ['a','pin',[0,"adj",50000]],
                ['dx1','*/',["ss","a",100000]],
                ['x1','+-',["r",0,"dx1"]],
                ['it','*/',["dx1",1,2]],
                ['ir','+/',["x1","r",2]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","t"],
                    ["lnTo","x1","t"],
                    ["lnTo","r","dx1"],
                    ["lnTo","r","b"],
                    ["lnTo","l","b"],
                    ["close"],
                ]},
            ]
        },
        snip2DiagRect: {
            av: {adj1:0,adj2:16667},
            gd: [
                ['a1','pin',[0,"adj1",50000]],
                ['a2','pin',[0,"adj2",50000]],
                ['lx1','*/',["ss","a1",100000]],
                ['lx2','+-',["r",0,"lx1"]],
                ['ly1','+-',["b",0,"lx1"]],
                ['rx1','*/',["ss","a2",100000]],
                ['rx2','+-',["r",0,"rx1"]],
                ['ry1','+-',["b",0,"rx1"]],
                ['d','+-',["lx1",0,"rx1"]],
                ['dx','?:',["d","lx1","rx1"]],
                ['il','*/',["dx",1,2]],
                ['ir','+-',["r",0,"il"]],
                ['ib','+-',["b",0,"il"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","lx1","t"],
                    ["lnTo","rx2","t"],
                    ["lnTo","r","rx1"],
                    ["lnTo","r","ly1"],
                    ["lnTo","lx2","b"],
                    ["lnTo","rx1","b"],
                    ["lnTo","l","ry1"],
                    ["lnTo","l","lx1"],
                    ["close"],
                ]},
            ]
        },
        snip2SameRect: {
            av: {adj1:16667,adj2:0},
            gd: [
                ['a1','pin',[0,"adj1",50000]],
                ['a2','pin',[0,"adj2",50000]],
                ['tx1','*/',["ss","a1",100000]],
                ['tx2','+-',["r",0,"tx1"]],
                ['bx1','*/',["ss","a2",100000]],
                ['bx2','+-',["r",0,"bx1"]],
                ['by1','+-',["b",0,"bx1"]],
                ['d','+-',["tx1",0,"bx1"]],
                ['dx','?:',["d","tx1","bx1"]],
                ['il','*/',["dx",1,2]],
                ['ir','+-',["r",0,"il"]],
                ['it','*/',["tx1",1,2]],
                ['ib','+/',["by1","b",2]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","tx1","t"],
                    ["lnTo","tx2","t"],
                    ["lnTo","r","tx1"],
                    ["lnTo","r","by1"],
                    ["lnTo","bx2","b"],
                    ["lnTo","bx1","b"],
                    ["lnTo","l","by1"],
                    ["lnTo","l","tx1"],
                    ["close"],
                ]},
            ]
        },
        snipRoundRect: {
            av: {adj1:16667,adj2:16667},
            gd: [
                ['a1','pin',[0,"adj1",50000]],
                ['a2','pin',[0,"adj2",50000]],
                ['x1','*/',["ss","a1",100000]],
                ['dx2','*/',["ss","a2",100000]],
                ['x2','+-',["r",0,"dx2"]],
                ['il','*/',["x1",29289,100000]],
                ['ir','+/',["x2","r",2]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","x1","t"],
                    ["lnTo","x2","t"],
                    ["lnTo","r","dx2"],
                    ["lnTo","r","b"],
                    ["lnTo","l","b"],
                    ["lnTo","l","x1"],
                    ["arcTo","x1","x1","cd2","cd4"],
                    ["close"],
                ]},
            ]
        },
        squareTabs: {
            gd: [['md','mod',["w","h",0]],['dx','*/',[1,"md",20]],['y1','+-',[0,"b","dx"]],['x1','+-',[0,"r","dx"]]],
            paths: [
                {cmds:[["moveTo","l","t"],["lnTo","dx","t"],["lnTo","dx","dx"],["lnTo","l","dx"],["close"]]},
                {cmds:[["moveTo","l","y1"],["lnTo","dx","y1"],["lnTo","dx","b"],["lnTo","l","b"],["close"]]},
                {cmds:[["moveTo","x1","t"],["lnTo","r","t"],["lnTo","r","dx"],["lnTo","x1","dx"],["close"]]},
                {cmds:[["moveTo","x1","y1"],["lnTo","r","y1"],["lnTo","r","b"],["lnTo","x1","b"],["close"]]},
            ]
        },
        star10: {
            av: {adj:42533,hf:105146},
            gd: [
                ['a','pin',[0,"adj",50000]],
                ['swd2','*/',["wd2","hf",100000]],
                ['dx1','*/',["swd2",95106,100000]],
                ['dx2','*/',["swd2",58779,100000]],
                ['x1','+-',["hc",0,"dx1"]],
                ['x2','+-',["hc",0,"dx2"]],
                ['x3','+-',["hc","dx2",0]],
                ['x4','+-',["hc","dx1",0]],
                ['dy1','*/',["hd2",80902,100000]],
                ['dy2','*/',["hd2",30902,100000]],
                ['y1','+-',["vc",0,"dy1"]],
                ['y2','+-',["vc",0,"dy2"]],
                ['y3','+-',["vc","dy2",0]],
                ['y4','+-',["vc","dy1",0]],
                ['iwd2','*/',["swd2","a",50000]],
                ['ihd2','*/',["hd2","a",50000]],
                ['sdx1','*/',["iwd2",80902,100000]],
                ['sdx2','*/',["iwd2",30902,100000]],
                ['sdy1','*/',["ihd2",95106,100000]],
                ['sdy2','*/',["ihd2",58779,100000]],
                ['sx1','+-',["hc",0,"iwd2"]],
                ['sx2','+-',["hc",0,"sdx1"]],
                ['sx3','+-',["hc",0,"sdx2"]],
                ['sx4','+-',["hc","sdx2",0]],
                ['sx5','+-',["hc","sdx1",0]],
                ['sx6','+-',["hc","iwd2",0]],
                ['sy1','+-',["vc",0,"sdy1"]],
                ['sy2','+-',["vc",0,"sdy2"]],
                ['sy3','+-',["vc","sdy2",0]],
                ['sy4','+-',["vc","sdy1",0]],
                ['yAdj','+-',["vc",0,"ihd2"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","x1","y2"],
                    ["lnTo","sx2","sy2"],
                    ["lnTo","x2","y1"],
                    ["lnTo","sx3","sy1"],
                    ["lnTo","hc","t"],
                    ["lnTo","sx4","sy1"],
                    ["lnTo","x3","y1"],
                    ["lnTo","sx5","sy2"],
                    ["lnTo","x4","y2"],
                    ["lnTo","sx6","vc"],
                    ["lnTo","x4","y3"],
                    ["lnTo","sx5","sy3"],
                    ["lnTo","x3","y4"],
                    ["lnTo","sx4","sy4"],
                    ["lnTo","hc","b"],
                    ["lnTo","sx3","sy4"],
                    ["lnTo","x2","y4"],
                    ["lnTo","sx2","sy3"],
                    ["lnTo","x1","y3"],
                    ["lnTo","sx1","vc"],
                    ["close"],
                ]},
            ]
        },
        star12: {
            av: {adj:37500},
            gd: [
                ['a','pin',[0,"adj",50000]],
                ['dx1','cos',["wd2",1800000]],
                ['dy1','sin',["hd2",3600000]],
                ['x1','+-',["hc",0,"dx1"]],
                ['x3','*/',["w",3,4]],
                ['x4','+-',["hc","dx1",0]],
                ['y1','+-',["vc",0,"dy1"]],
                ['y3','*/',["h",3,4]],
                ['y4','+-',["vc","dy1",0]],
                ['iwd2','*/',["wd2","a",50000]],
                ['ihd2','*/',["hd2","a",50000]],
                ['sdx1','cos',["iwd2",900000]],
                ['sdx2','cos',["iwd2",2700000]],
                ['sdx3','cos',["iwd2",4500000]],
                ['sdy1','sin',["ihd2",4500000]],
                ['sdy2','sin',["ihd2",2700000]],
                ['sdy3','sin',["ihd2",900000]],
                ['sx1','+-',["hc",0,"sdx1"]],
                ['sx2','+-',["hc",0,"sdx2"]],
                ['sx3','+-',["hc",0,"sdx3"]],
                ['sx4','+-',["hc","sdx3",0]],
                ['sx5','+-',["hc","sdx2",0]],
                ['sx6','+-',["hc","sdx1",0]],
                ['sy1','+-',["vc",0,"sdy1"]],
                ['sy2','+-',["vc",0,"sdy2"]],
                ['sy3','+-',["vc",0,"sdy3"]],
                ['sy4','+-',["vc","sdy3",0]],
                ['sy5','+-',["vc","sdy2",0]],
                ['sy6','+-',["vc","sdy1",0]],
                ['yAdj','+-',["vc",0,"ihd2"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","vc"],
                    ["lnTo","sx1","sy3"],
                    ["lnTo","x1","hd4"],
                    ["lnTo","sx2","sy2"],
                    ["lnTo","wd4","y1"],
                    ["lnTo","sx3","sy1"],
                    ["lnTo","hc","t"],
                    ["lnTo","sx4","sy1"],
                    ["lnTo","x3","y1"],
                    ["lnTo","sx5","sy2"],
                    ["lnTo","x4","hd4"],
                    ["lnTo","sx6","sy3"],
                    ["lnTo","r","vc"],
                    ["lnTo","sx6","sy4"],
                    ["lnTo","x4","y3"],
                    ["lnTo","sx5","sy5"],
                    ["lnTo","x3","y4"],
                    ["lnTo","sx4","sy6"],
                    ["lnTo","hc","b"],
                    ["lnTo","sx3","sy6"],
                    ["lnTo","wd4","y4"],
                    ["lnTo","sx2","sy5"],
                    ["lnTo","x1","y3"],
                    ["lnTo","sx1","sy4"],
                    ["close"],
                ]},
            ]
        },
        star16: {
            av: {adj:37500},
            gd: [
                ['a','pin',[0,"adj",50000]],
                ['dx1','*/',["wd2",92388,100000]],
                ['dx2','*/',["wd2",70711,100000]],
                ['dx3','*/',["wd2",38268,100000]],
                ['dy1','*/',["hd2",92388,100000]],
                ['dy2','*/',["hd2",70711,100000]],
                ['dy3','*/',["hd2",38268,100000]],
                ['x1','+-',["hc",0,"dx1"]],
                ['x2','+-',["hc",0,"dx2"]],
                ['x3','+-',["hc",0,"dx3"]],
                ['x4','+-',["hc","dx3",0]],
                ['x5','+-',["hc","dx2",0]],
                ['x6','+-',["hc","dx1",0]],
                ['y1','+-',["vc",0,"dy1"]],
                ['y2','+-',["vc",0,"dy2"]],
                ['y3','+-',["vc",0,"dy3"]],
                ['y4','+-',["vc","dy3",0]],
                ['y5','+-',["vc","dy2",0]],
                ['y6','+-',["vc","dy1",0]],
                ['iwd2','*/',["wd2","a",50000]],
                ['ihd2','*/',["hd2","a",50000]],
                ['sdx1','*/',["iwd2",98079,100000]],
                ['sdx2','*/',["iwd2",83147,100000]],
                ['sdx3','*/',["iwd2",55557,100000]],
                ['sdx4','*/',["iwd2",19509,100000]],
                ['sdy1','*/',["ihd2",98079,100000]],
                ['sdy2','*/',["ihd2",83147,100000]],
                ['sdy3','*/',["ihd2",55557,100000]],
                ['sdy4','*/',["ihd2",19509,100000]],
                ['sx1','+-',["hc",0,"sdx1"]],
                ['sx2','+-',["hc",0,"sdx2"]],
                ['sx3','+-',["hc",0,"sdx3"]],
                ['sx4','+-',["hc",0,"sdx4"]],
                ['sx5','+-',["hc","sdx4",0]],
                ['sx6','+-',["hc","sdx3",0]],
                ['sx7','+-',["hc","sdx2",0]],
                ['sx8','+-',["hc","sdx1",0]],
                ['sy1','+-',["vc",0,"sdy1"]],
                ['sy2','+-',["vc",0,"sdy2"]],
                ['sy3','+-',["vc",0,"sdy3"]],
                ['sy4','+-',["vc",0,"sdy4"]],
                ['sy5','+-',["vc","sdy4",0]],
                ['sy6','+-',["vc","sdy3",0]],
                ['sy7','+-',["vc","sdy2",0]],
                ['sy8','+-',["vc","sdy1",0]],
                ['idx','cos',["iwd2",2700000]],
                ['idy','sin',["ihd2",2700000]],
                ['il','+-',["hc",0,"idx"]],
                ['it','+-',["vc",0,"idy"]],
                ['ir','+-',["hc","idx",0]],
                ['ib','+-',["vc","idy",0]],
                ['yAdj','+-',["vc",0,"ihd2"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","vc"],
                    ["lnTo","sx1","sy4"],
                    ["lnTo","x1","y3"],
                    ["lnTo","sx2","sy3"],
                    ["lnTo","x2","y2"],
                    ["lnTo","sx3","sy2"],
                    ["lnTo","x3","y1"],
                    ["lnTo","sx4","sy1"],
                    ["lnTo","hc","t"],
                    ["lnTo","sx5","sy1"],
                    ["lnTo","x4","y1"],
                    ["lnTo","sx6","sy2"],
                    ["lnTo","x5","y2"],
                    ["lnTo","sx7","sy3"],
                    ["lnTo","x6","y3"],
                    ["lnTo","sx8","sy4"],
                    ["lnTo","r","vc"],
                    ["lnTo","sx8","sy5"],
                    ["lnTo","x6","y4"],
                    ["lnTo","sx7","sy6"],
                    ["lnTo","x5","y5"],
                    ["lnTo","sx6","sy7"],
                    ["lnTo","x4","y6"],
                    ["lnTo","sx5","sy8"],
                    ["lnTo","hc","b"],
                    ["lnTo","sx4","sy8"],
                    ["lnTo","x3","y6"],
                    ["lnTo","sx3","sy7"],
                    ["lnTo","x2","y5"],
                    ["lnTo","sx2","sy6"],
                    ["lnTo","x1","y4"],
                    ["lnTo","sx1","sy5"],
                    ["close"],
                ]},
            ]
        },
        star24: {
            av: {adj:37500},
            gd: [
                ['a','pin',[0,"adj",50000]],
                ['dx1','cos',["wd2",900000]],
                ['dx2','cos',["wd2",1800000]],
                ['dx3','cos',["wd2",2700000]],
                ['dx4','val',["wd4"]],
                ['dx5','cos',["wd2",4500000]],
                ['dy1','sin',["hd2",4500000]],
                ['dy2','sin',["hd2",3600000]],
                ['dy3','sin',["hd2",2700000]],
                ['dy4','val',["hd4"]],
                ['dy5','sin',["hd2",900000]],
                ['x1','+-',["hc",0,"dx1"]],
                ['x2','+-',["hc",0,"dx2"]],
                ['x3','+-',["hc",0,"dx3"]],
                ['x4','+-',["hc",0,"dx4"]],
                ['x5','+-',["hc",0,"dx5"]],
                ['x6','+-',["hc","dx5",0]],
                ['x7','+-',["hc","dx4",0]],
                ['x8','+-',["hc","dx3",0]],
                ['x9','+-',["hc","dx2",0]],
                ['x10','+-',["hc","dx1",0]],
                ['y1','+-',["vc",0,"dy1"]],
                ['y2','+-',["vc",0,"dy2"]],
                ['y3','+-',["vc",0,"dy3"]],
                ['y4','+-',["vc",0,"dy4"]],
                ['y5','+-',["vc",0,"dy5"]],
                ['y6','+-',["vc","dy5",0]],
                ['y7','+-',["vc","dy4",0]],
                ['y8','+-',["vc","dy3",0]],
                ['y9','+-',["vc","dy2",0]],
                ['y10','+-',["vc","dy1",0]],
                ['iwd2','*/',["wd2","a",50000]],
                ['ihd2','*/',["hd2","a",50000]],
                ['sdx1','*/',["iwd2",99144,100000]],
                ['sdx2','*/',["iwd2",92388,100000]],
                ['sdx3','*/',["iwd2",79335,100000]],
                ['sdx4','*/',["iwd2",60876,100000]],
                ['sdx5','*/',["iwd2",38268,100000]],
                ['sdx6','*/',["iwd2",13053,100000]],
                ['sdy1','*/',["ihd2",99144,100000]],
                ['sdy2','*/',["ihd2",92388,100000]],
                ['sdy3','*/',["ihd2",79335,100000]],
                ['sdy4','*/',["ihd2",60876,100000]],
                ['sdy5','*/',["ihd2",38268,100000]],
                ['sdy6','*/',["ihd2",13053,100000]],
                ['sx1','+-',["hc",0,"sdx1"]],
                ['sx2','+-',["hc",0,"sdx2"]],
                ['sx3','+-',["hc",0,"sdx3"]],
                ['sx4','+-',["hc",0,"sdx4"]],
                ['sx5','+-',["hc",0,"sdx5"]],
                ['sx6','+-',["hc",0,"sdx6"]],
                ['sx7','+-',["hc","sdx6",0]],
                ['sx8','+-',["hc","sdx5",0]],
                ['sx9','+-',["hc","sdx4",0]],
                ['sx10','+-',["hc","sdx3",0]],
                ['sx11','+-',["hc","sdx2",0]],
                ['sx12','+-',["hc","sdx1",0]],
                ['sy1','+-',["vc",0,"sdy1"]],
                ['sy2','+-',["vc",0,"sdy2"]],
                ['sy3','+-',["vc",0,"sdy3"]],
                ['sy4','+-',["vc",0,"sdy4"]],
                ['sy5','+-',["vc",0,"sdy5"]],
                ['sy6','+-',["vc",0,"sdy6"]],
                ['sy7','+-',["vc","sdy6",0]],
                ['sy8','+-',["vc","sdy5",0]],
                ['sy9','+-',["vc","sdy4",0]],
                ['sy10','+-',["vc","sdy3",0]],
                ['sy11','+-',["vc","sdy2",0]],
                ['sy12','+-',["vc","sdy1",0]],
                ['idx','cos',["iwd2",2700000]],
                ['idy','sin',["ihd2",2700000]],
                ['il','+-',["hc",0,"idx"]],
                ['it','+-',["vc",0,"idy"]],
                ['ir','+-',["hc","idx",0]],
                ['ib','+-',["vc","idy",0]],
                ['yAdj','+-',["vc",0,"ihd2"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","vc"],
                    ["lnTo","sx1","sy6"],
                    ["lnTo","x1","y5"],
                    ["lnTo","sx2","sy5"],
                    ["lnTo","x2","y4"],
                    ["lnTo","sx3","sy4"],
                    ["lnTo","x3","y3"],
                    ["lnTo","sx4","sy3"],
                    ["lnTo","x4","y2"],
                    ["lnTo","sx5","sy2"],
                    ["lnTo","x5","y1"],
                    ["lnTo","sx6","sy1"],
                    ["lnTo","hc","t"],
                    ["lnTo","sx7","sy1"],
                    ["lnTo","x6","y1"],
                    ["lnTo","sx8","sy2"],
                    ["lnTo","x7","y2"],
                    ["lnTo","sx9","sy3"],
                    ["lnTo","x8","y3"],
                    ["lnTo","sx10","sy4"],
                    ["lnTo","x9","y4"],
                    ["lnTo","sx11","sy5"],
                    ["lnTo","x10","y5"],
                    ["lnTo","sx12","sy6"],
                    ["lnTo","r","vc"],
                    ["lnTo","sx12","sy7"],
                    ["lnTo","x10","y6"],
                    ["lnTo","sx11","sy8"],
                    ["lnTo","x9","y7"],
                    ["lnTo","sx10","sy9"],
                    ["lnTo","x8","y8"],
                    ["lnTo","sx9","sy10"],
                    ["lnTo","x7","y9"],
                    ["lnTo","sx8","sy11"],
                    ["lnTo","x6","y10"],
                    ["lnTo","sx7","sy12"],
                    ["lnTo","hc","b"],
                    ["lnTo","sx6","sy12"],
                    ["lnTo","x5","y10"],
                    ["lnTo","sx5","sy11"],
                    ["lnTo","x4","y9"],
                    ["lnTo","sx4","sy10"],
                    ["lnTo","x3","y8"],
                    ["lnTo","sx3","sy9"],
                    ["lnTo","x2","y7"],
                    ["lnTo","sx2","sy8"],
                    ["lnTo","x1","y6"],
                    ["lnTo","sx1","sy7"],
                    ["close"],
                ]},
            ]
        },
        star32: {
            av: {adj:37500},
            gd: [
                ['a','pin',[0,"adj",50000]],
                ['dx1','*/',["wd2",98079,100000]],
                ['dx2','*/',["wd2",92388,100000]],
                ['dx3','*/',["wd2",83147,100000]],
                ['dx4','cos',["wd2",2700000]],
                ['dx5','*/',["wd2",55557,100000]],
                ['dx6','*/',["wd2",38268,100000]],
                ['dx7','*/',["wd2",19509,100000]],
                ['dy1','*/',["hd2",98079,100000]],
                ['dy2','*/',["hd2",92388,100000]],
                ['dy3','*/',["hd2",83147,100000]],
                ['dy4','sin',["hd2",2700000]],
                ['dy5','*/',["hd2",55557,100000]],
                ['dy6','*/',["hd2",38268,100000]],
                ['dy7','*/',["hd2",19509,100000]],
                ['x1','+-',["hc",0,"dx1"]],
                ['x2','+-',["hc",0,"dx2"]],
                ['x3','+-',["hc",0,"dx3"]],
                ['x4','+-',["hc",0,"dx4"]],
                ['x5','+-',["hc",0,"dx5"]],
                ['x6','+-',["hc",0,"dx6"]],
                ['x7','+-',["hc",0,"dx7"]],
                ['x8','+-',["hc","dx7",0]],
                ['x9','+-',["hc","dx6",0]],
                ['x10','+-',["hc","dx5",0]],
                ['x11','+-',["hc","dx4",0]],
                ['x12','+-',["hc","dx3",0]],
                ['x13','+-',["hc","dx2",0]],
                ['x14','+-',["hc","dx1",0]],
                ['y1','+-',["vc",0,"dy1"]],
                ['y2','+-',["vc",0,"dy2"]],
                ['y3','+-',["vc",0,"dy3"]],
                ['y4','+-',["vc",0,"dy4"]],
                ['y5','+-',["vc",0,"dy5"]],
                ['y6','+-',["vc",0,"dy6"]],
                ['y7','+-',["vc",0,"dy7"]],
                ['y8','+-',["vc","dy7",0]],
                ['y9','+-',["vc","dy6",0]],
                ['y10','+-',["vc","dy5",0]],
                ['y11','+-',["vc","dy4",0]],
                ['y12','+-',["vc","dy3",0]],
                ['y13','+-',["vc","dy2",0]],
                ['y14','+-',["vc","dy1",0]],
                ['iwd2','*/',["wd2","a",50000]],
                ['ihd2','*/',["hd2","a",50000]],
                ['sdx1','*/',["iwd2",99518,100000]],
                ['sdx2','*/',["iwd2",95694,100000]],
                ['sdx3','*/',["iwd2",88192,100000]],
                ['sdx4','*/',["iwd2",77301,100000]],
                ['sdx5','*/',["iwd2",63439,100000]],
                ['sdx6','*/',["iwd2",47140,100000]],
                ['sdx7','*/',["iwd2",29028,100000]],
                ['sdx8','*/',["iwd2",9802,100000]],
                ['sdy1','*/',["ihd2",99518,100000]],
                ['sdy2','*/',["ihd2",95694,100000]],
                ['sdy3','*/',["ihd2",88192,100000]],
                ['sdy4','*/',["ihd2",77301,100000]],
                ['sdy5','*/',["ihd2",63439,100000]],
                ['sdy6','*/',["ihd2",47140,100000]],
                ['sdy7','*/',["ihd2",29028,100000]],
                ['sdy8','*/',["ihd2",9802,100000]],
                ['sx1','+-',["hc",0,"sdx1"]],
                ['sx2','+-',["hc",0,"sdx2"]],
                ['sx3','+-',["hc",0,"sdx3"]],
                ['sx4','+-',["hc",0,"sdx4"]],
                ['sx5','+-',["hc",0,"sdx5"]],
                ['sx6','+-',["hc",0,"sdx6"]],
                ['sx7','+-',["hc",0,"sdx7"]],
                ['sx8','+-',["hc",0,"sdx8"]],
                ['sx9','+-',["hc","sdx8",0]],
                ['sx10','+-',["hc","sdx7",0]],
                ['sx11','+-',["hc","sdx6",0]],
                ['sx12','+-',["hc","sdx5",0]],
                ['sx13','+-',["hc","sdx4",0]],
                ['sx14','+-',["hc","sdx3",0]],
                ['sx15','+-',["hc","sdx2",0]],
                ['sx16','+-',["hc","sdx1",0]],
                ['sy1','+-',["vc",0,"sdy1"]],
                ['sy2','+-',["vc",0,"sdy2"]],
                ['sy3','+-',["vc",0,"sdy3"]],
                ['sy4','+-',["vc",0,"sdy4"]],
                ['sy5','+-',["vc",0,"sdy5"]],
                ['sy6','+-',["vc",0,"sdy6"]],
                ['sy7','+-',["vc",0,"sdy7"]],
                ['sy8','+-',["vc",0,"sdy8"]],
                ['sy9','+-',["vc","sdy8",0]],
                ['sy10','+-',["vc","sdy7",0]],
                ['sy11','+-',["vc","sdy6",0]],
                ['sy12','+-',["vc","sdy5",0]],
                ['sy13','+-',["vc","sdy4",0]],
                ['sy14','+-',["vc","sdy3",0]],
                ['sy15','+-',["vc","sdy2",0]],
                ['sy16','+-',["vc","sdy1",0]],
                ['idx','cos',["iwd2",2700000]],
                ['idy','sin',["ihd2",2700000]],
                ['il','+-',["hc",0,"idx"]],
                ['it','+-',["vc",0,"idy"]],
                ['ir','+-',["hc","idx",0]],
                ['ib','+-',["vc","idy",0]],
                ['yAdj','+-',["vc",0,"ihd2"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","vc"],
                    ["lnTo","sx1","sy8"],
                    ["lnTo","x1","y7"],
                    ["lnTo","sx2","sy7"],
                    ["lnTo","x2","y6"],
                    ["lnTo","sx3","sy6"],
                    ["lnTo","x3","y5"],
                    ["lnTo","sx4","sy5"],
                    ["lnTo","x4","y4"],
                    ["lnTo","sx5","sy4"],
                    ["lnTo","x5","y3"],
                    ["lnTo","sx6","sy3"],
                    ["lnTo","x6","y2"],
                    ["lnTo","sx7","sy2"],
                    ["lnTo","x7","y1"],
                    ["lnTo","sx8","sy1"],
                    ["lnTo","hc","t"],
                    ["lnTo","sx9","sy1"],
                    ["lnTo","x8","y1"],
                    ["lnTo","sx10","sy2"],
                    ["lnTo","x9","y2"],
                    ["lnTo","sx11","sy3"],
                    ["lnTo","x10","y3"],
                    ["lnTo","sx12","sy4"],
                    ["lnTo","x11","y4"],
                    ["lnTo","sx13","sy5"],
                    ["lnTo","x12","y5"],
                    ["lnTo","sx14","sy6"],
                    ["lnTo","x13","y6"],
                    ["lnTo","sx15","sy7"],
                    ["lnTo","x14","y7"],
                    ["lnTo","sx16","sy8"],
                    ["lnTo","r","vc"],
                    ["lnTo","sx16","sy9"],
                    ["lnTo","x14","y8"],
                    ["lnTo","sx15","sy10"],
                    ["lnTo","x13","y9"],
                    ["lnTo","sx14","sy11"],
                    ["lnTo","x12","y10"],
                    ["lnTo","sx13","sy12"],
                    ["lnTo","x11","y11"],
                    ["lnTo","sx12","sy13"],
                    ["lnTo","x10","y12"],
                    ["lnTo","sx11","sy14"],
                    ["lnTo","x9","y13"],
                    ["lnTo","sx10","sy15"],
                    ["lnTo","x8","y14"],
                    ["lnTo","sx9","sy16"],
                    ["lnTo","hc","b"],
                    ["lnTo","sx8","sy16"],
                    ["lnTo","x7","y14"],
                    ["lnTo","sx7","sy15"],
                    ["lnTo","x6","y13"],
                    ["lnTo","sx6","sy14"],
                    ["lnTo","x5","y12"],
                    ["lnTo","sx5","sy13"],
                    ["lnTo","x4","y11"],
                    ["lnTo","sx4","sy12"],
                    ["lnTo","x3","y10"],
                    ["lnTo","sx3","sy11"],
                    ["lnTo","x2","y9"],
                    ["lnTo","sx2","sy10"],
                    ["lnTo","x1","y8"],
                    ["lnTo","sx1","sy9"],
                    ["close"],
                ]},
            ]
        },
        star4: {
            av: {adj:12500},
            gd: [
                ['a','pin',[0,"adj",50000]],
                ['iwd2','*/',["wd2","a",50000]],
                ['ihd2','*/',["hd2","a",50000]],
                ['sdx','cos',["iwd2",2700000]],
                ['sdy','sin',["ihd2",2700000]],
                ['sx1','+-',["hc",0,"sdx"]],
                ['sx2','+-',["hc","sdx",0]],
                ['sy1','+-',["vc",0,"sdy"]],
                ['sy2','+-',["vc","sdy",0]],
                ['yAdj','+-',["vc",0,"ihd2"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","vc"],
                    ["lnTo","sx1","sy1"],
                    ["lnTo","hc","t"],
                    ["lnTo","sx2","sy1"],
                    ["lnTo","r","vc"],
                    ["lnTo","sx2","sy2"],
                    ["lnTo","hc","b"],
                    ["lnTo","sx1","sy2"],
                    ["close"],
                ]},
            ]
        },
        star5: {
            av: {adj:19098,hf:105146,vf:110557},
            gd: [
                ['a','pin',[0,"adj",50000]],
                ['swd2','*/',["wd2","hf",100000]],
                ['shd2','*/',["hd2","vf",100000]],
                ['svc','*/',["vc","vf",100000]],
                ['dx1','cos',["swd2",1080000]],
                ['dx2','cos',["swd2",18360000]],
                ['dy1','sin',["shd2",1080000]],
                ['dy2','sin',["shd2",18360000]],
                ['x1','+-',["hc",0,"dx1"]],
                ['x2','+-',["hc",0,"dx2"]],
                ['x3','+-',["hc","dx2",0]],
                ['x4','+-',["hc","dx1",0]],
                ['y1','+-',["svc",0,"dy1"]],
                ['y2','+-',["svc",0,"dy2"]],
                ['iwd2','*/',["swd2","a",50000]],
                ['ihd2','*/',["shd2","a",50000]],
                ['sdx1','cos',["iwd2",20520000]],
                ['sdx2','cos',["iwd2",3240000]],
                ['sdy1','sin',["ihd2",3240000]],
                ['sdy2','sin',["ihd2",20520000]],
                ['sx1','+-',["hc",0,"sdx1"]],
                ['sx2','+-',["hc",0,"sdx2"]],
                ['sx3','+-',["hc","sdx2",0]],
                ['sx4','+-',["hc","sdx1",0]],
                ['sy1','+-',["svc",0,"sdy1"]],
                ['sy2','+-',["svc",0,"sdy2"]],
                ['sy3','+-',["svc","ihd2",0]],
                ['yAdj','+-',["svc",0,"ihd2"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","x1","y1"],
                    ["lnTo","sx2","sy1"],
                    ["lnTo","hc","t"],
                    ["lnTo","sx3","sy1"],
                    ["lnTo","x4","y1"],
                    ["lnTo","sx4","sy2"],
                    ["lnTo","x3","y2"],
                    ["lnTo","hc","sy3"],
                    ["lnTo","x2","y2"],
                    ["lnTo","sx1","sy2"],
                    ["close"],
                ]},
            ]
        },
        star6: {
            av: {adj:28868,hf:115470},
            gd: [
                ['a','pin',[0,"adj",50000]],
                ['swd2','*/',["wd2","hf",100000]],
                ['dx1','cos',["swd2",1800000]],
                ['x1','+-',["hc",0,"dx1"]],
                ['x2','+-',["hc","dx1",0]],
                ['y2','+-',["vc","hd4",0]],
                ['iwd2','*/',["swd2","a",50000]],
                ['ihd2','*/',["hd2","a",50000]],
                ['sdx2','*/',["iwd2",1,2]],
                ['sx1','+-',["hc",0,"iwd2"]],
                ['sx2','+-',["hc",0,"sdx2"]],
                ['sx3','+-',["hc","sdx2",0]],
                ['sx4','+-',["hc","iwd2",0]],
                ['sdy1','sin',["ihd2",3600000]],
                ['sy1','+-',["vc",0,"sdy1"]],
                ['sy2','+-',["vc","sdy1",0]],
                ['yAdj','+-',["vc",0,"ihd2"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","x1","hd4"],
                    ["lnTo","sx2","sy1"],
                    ["lnTo","hc","t"],
                    ["lnTo","sx3","sy1"],
                    ["lnTo","x2","hd4"],
                    ["lnTo","sx4","vc"],
                    ["lnTo","x2","y2"],
                    ["lnTo","sx3","sy2"],
                    ["lnTo","hc","b"],
                    ["lnTo","sx2","sy2"],
                    ["lnTo","x1","y2"],
                    ["lnTo","sx1","vc"],
                    ["close"],
                ]},
            ]
        },
        star7: {
            av: {adj:34601,hf:102572,vf:105210},
            gd: [
                ['a','pin',[0,"adj",50000]],
                ['swd2','*/',["wd2","hf",100000]],
                ['shd2','*/',["hd2","vf",100000]],
                ['svc','*/',["vc","vf",100000]],
                ['dx1','*/',["swd2",97493,100000]],
                ['dx2','*/',["swd2",78183,100000]],
                ['dx3','*/',["swd2",43388,100000]],
                ['dy1','*/',["shd2",62349,100000]],
                ['dy2','*/',["shd2",22252,100000]],
                ['dy3','*/',["shd2",90097,100000]],
                ['x1','+-',["hc",0,"dx1"]],
                ['x2','+-',["hc",0,"dx2"]],
                ['x3','+-',["hc",0,"dx3"]],
                ['x4','+-',["hc","dx3",0]],
                ['x5','+-',["hc","dx2",0]],
                ['x6','+-',["hc","dx1",0]],
                ['y1','+-',["svc",0,"dy1"]],
                ['y2','+-',["svc","dy2",0]],
                ['y3','+-',["svc","dy3",0]],
                ['iwd2','*/',["swd2","a",50000]],
                ['ihd2','*/',["shd2","a",50000]],
                ['sdx1','*/',["iwd2",97493,100000]],
                ['sdx2','*/',["iwd2",78183,100000]],
                ['sdx3','*/',["iwd2",43388,100000]],
                ['sx1','+-',["hc",0,"sdx1"]],
                ['sx2','+-',["hc",0,"sdx2"]],
                ['sx3','+-',["hc",0,"sdx3"]],
                ['sx4','+-',["hc","sdx3",0]],
                ['sx5','+-',["hc","sdx2",0]],
                ['sx6','+-',["hc","sdx1",0]],
                ['sdy1','*/',["ihd2",90097,100000]],
                ['sdy2','*/',["ihd2",22252,100000]],
                ['sdy3','*/',["ihd2",62349,100000]],
                ['sy1','+-',["svc",0,"sdy1"]],
                ['sy2','+-',["svc",0,"sdy2"]],
                ['sy3','+-',["svc","sdy3",0]],
                ['sy4','+-',["svc","ihd2",0]],
                ['yAdj','+-',["svc",0,"ihd2"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","x1","y2"],
                    ["lnTo","sx1","sy2"],
                    ["lnTo","x2","y1"],
                    ["lnTo","sx3","sy1"],
                    ["lnTo","hc","t"],
                    ["lnTo","sx4","sy1"],
                    ["lnTo","x5","y1"],
                    ["lnTo","sx6","sy2"],
                    ["lnTo","x6","y2"],
                    ["lnTo","sx5","sy3"],
                    ["lnTo","x4","y3"],
                    ["lnTo","hc","sy4"],
                    ["lnTo","x3","y3"],
                    ["lnTo","sx2","sy3"],
                    ["close"],
                ]},
            ]
        },
        star8: {
            av: {adj:37500},
            gd: [
                ['a','pin',[0,"adj",50000]],
                ['dx1','cos',["wd2",2700000]],
                ['x1','+-',["hc",0,"dx1"]],
                ['x2','+-',["hc","dx1",0]],
                ['dy1','sin',["hd2",2700000]],
                ['y1','+-',["vc",0,"dy1"]],
                ['y2','+-',["vc","dy1",0]],
                ['iwd2','*/',["wd2","a",50000]],
                ['ihd2','*/',["hd2","a",50000]],
                ['sdx1','*/',["iwd2",92388,100000]],
                ['sdx2','*/',["iwd2",38268,100000]],
                ['sdy1','*/',["ihd2",92388,100000]],
                ['sdy2','*/',["ihd2",38268,100000]],
                ['sx1','+-',["hc",0,"sdx1"]],
                ['sx2','+-',["hc",0,"sdx2"]],
                ['sx3','+-',["hc","sdx2",0]],
                ['sx4','+-',["hc","sdx1",0]],
                ['sy1','+-',["vc",0,"sdy1"]],
                ['sy2','+-',["vc",0,"sdy2"]],
                ['sy3','+-',["vc","sdy2",0]],
                ['sy4','+-',["vc","sdy1",0]],
                ['yAdj','+-',["vc",0,"ihd2"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","vc"],
                    ["lnTo","sx1","sy2"],
                    ["lnTo","x1","y1"],
                    ["lnTo","sx2","sy1"],
                    ["lnTo","hc","t"],
                    ["lnTo","sx3","sy1"],
                    ["lnTo","x2","y1"],
                    ["lnTo","sx4","sy2"],
                    ["lnTo","r","vc"],
                    ["lnTo","sx4","sy3"],
                    ["lnTo","x2","y2"],
                    ["lnTo","sx3","sy4"],
                    ["lnTo","hc","b"],
                    ["lnTo","sx2","sy4"],
                    ["lnTo","x1","y2"],
                    ["lnTo","sx1","sy3"],
                    ["close"],
                ]},
            ]
        },
        stripedRightArrow: {
            av: {adj1:50000,adj2:50000},
            gd: [
                ['maxAdj2','*/',[84375,"w","ss"]],
                ['a1','pin',[0,"adj1",100000]],
                ['a2','pin',[0,"adj2","maxAdj2"]],
                ['x4','*/',["ss",5,32]],
                ['dx5','*/',["ss","a2",100000]],
                ['x5','+-',["r",0,"dx5"]],
                ['dy1','*/',["h","a1",200000]],
                ['y1','+-',["vc",0,"dy1"]],
                ['y2','+-',["vc","dy1",0]],
                ['dx6','*/',["dy1","dx5","hd2"]],
                ['x6','+-',["r",0,"dx6"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","y1"],
                    ["lnTo","ssd32","y1"],
                    ["lnTo","ssd32","y2"],
                    ["lnTo","l","y2"],
                    ["close"],
                    ["moveTo","ssd16","y1"],
                    ["lnTo","ssd8","y1"],
                    ["lnTo","ssd8","y2"],
                    ["lnTo","ssd16","y2"],
                    ["close"],
                    ["moveTo","x4","y1"],
                    ["lnTo","x5","y1"],
                    ["lnTo","x5","t"],
                    ["lnTo","r","vc"],
                    ["lnTo","x5","b"],
                    ["lnTo","x5","y2"],
                    ["lnTo","x4","y2"],
                    ["close"],
                ]},
            ]
        },
        sun: {
            av: {adj:25000},
            gd: [
                ['a','pin',[12500,"adj",46875]],
                ['g0','+-',[50000,0,"a"]],
                ['g1','*/',["g0",30274,32768]],
                ['g2','*/',["g0",12540,32768]],
                ['g3','+-',["g1",50000,0]],
                ['g4','+-',["g2",50000,0]],
                ['g5','+-',[50000,0,"g1"]],
                ['g6','+-',[50000,0,"g2"]],
                ['g7','*/',["g0",23170,32768]],
                ['g8','+-',[50000,"g7",0]],
                ['g9','+-',[50000,0,"g7"]],
                ['g10','*/',["g5",3,4]],
                ['g11','*/',["g6",3,4]],
                ['g12','+-',["g10",3662,0]],
                ['g13','+-',["g11",3662,0]],
                ['g14','+-',["g11",12500,0]],
                ['g15','+-',[100000,0,"g10"]],
                ['g16','+-',[100000,0,"g12"]],
                ['g17','+-',[100000,0,"g13"]],
                ['g18','+-',[100000,0,"g14"]],
                ['ox1','*/',["w",18436,21600]],
                ['oy1','*/',["h",3163,21600]],
                ['ox2','*/',["w",3163,21600]],
                ['oy2','*/',["h",18436,21600]],
                ['x8','*/',["w","g8",100000]],
                ['x9','*/',["w","g9",100000]],
                ['x10','*/',["w","g10",100000]],
                ['x12','*/',["w","g12",100000]],
                ['x13','*/',["w","g13",100000]],
                ['x14','*/',["w","g14",100000]],
                ['x15','*/',["w","g15",100000]],
                ['x16','*/',["w","g16",100000]],
                ['x17','*/',["w","g17",100000]],
                ['x18','*/',["w","g18",100000]],
                ['x19','*/',["w","a",100000]],
                ['wR','*/',["w","g0",100000]],
                ['hR','*/',["h","g0",100000]],
                ['y8','*/',["h","g8",100000]],
                ['y9','*/',["h","g9",100000]],
                ['y10','*/',["h","g10",100000]],
                ['y12','*/',["h","g12",100000]],
                ['y13','*/',["h","g13",100000]],
                ['y14','*/',["h","g14",100000]],
                ['y15','*/',["h","g15",100000]],
                ['y16','*/',["h","g16",100000]],
                ['y17','*/',["h","g17",100000]],
                ['y18','*/',["h","g18",100000]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","r","vc"],
                    ["lnTo","x15","y18"],
                    ["lnTo","x15","y14"],
                    ["close"],
                    ["moveTo","ox1","oy1"],
                    ["lnTo","x16","y13"],
                    ["lnTo","x17","y12"],
                    ["close"],
                    ["moveTo","hc","t"],
                    ["lnTo","x18","y10"],
                    ["lnTo","x14","y10"],
                    ["close"],
                    ["moveTo","ox2","oy1"],
                    ["lnTo","x13","y12"],
                    ["lnTo","x12","y13"],
                    ["close"],
                    ["moveTo","l","vc"],
                    ["lnTo","x10","y14"],
                    ["lnTo","x10","y18"],
                    ["close"],
                    ["moveTo","ox2","oy2"],
                    ["lnTo","x12","y17"],
                    ["lnTo","x13","y16"],
                    ["close"],
                    ["moveTo","hc","b"],
                    ["lnTo","x14","y15"],
                    ["lnTo","x18","y15"],
                    ["close"],
                    ["moveTo","ox1","oy2"],
                    ["lnTo","x17","y16"],
                    ["lnTo","x16","y17"],
                    ["close"],
                    ["moveTo","x19","vc"],
                    ["arcTo","wR","hR","cd2",21600000],
                    ["close"],
                ]},
            ]
        },
        swooshArrow: {
            av: {adj1:25000,adj2:16667},
            gd: [
                ['a1','pin',[1,"adj1",75000]],
                ['maxAdj2','*/',[70000,"w","ss"]],
                ['a2','pin',[0,"adj2","maxAdj2"]],
                ['ad1','*/',["h","a1",100000]],
                ['ad2','*/',["ss","a2",100000]],
                ['xB','+-',["r",0,"ad2"]],
                ['yB','+-',["t","ssd8",0]],
                ['alfa','*/',["cd4",1,14]],
                ['dx0','tan',["ssd8","alfa"]],
                ['xC','+-',["xB",0,"dx0"]],
                ['dx1','tan',["ad1","alfa"]],
                ['yF','+-',["yB","ad1",0]],
                ['xF','+-',["xB","dx1",0]],
                ['xE','+-',["xF","dx0",0]],
                ['yE','+-',["yF","ssd8",0]],
                ['dy2','+-',["yE",0,"t"]],
                ['dy22','*/',["dy2",1,2]],
                ['dy3','*/',["h",1,20]],
                ['yD','+-',["t","dy22","dy3"]],
                ['dy4','*/',["hd6",1,1]],
                ['yP1','+-',["hd6","dy4",0]],
                ['xP1','val',["wd6"]],
                ['dy5','*/',["hd6",1,2]],
                ['yP2','+-',["yF","dy5",0]],
                ['xP2','val',["wd4"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","b"],
                    ["quadBezTo","xP1","yP1","xB","yB"],
                    ["lnTo","xC","t"],
                    ["lnTo","r","yD"],
                    ["lnTo","xE","yE"],
                    ["lnTo","xF","yF"],
                    ["quadBezTo","xP2","yP2","l","b"],
                    ["close"],
                ]},
            ]
        },
        teardrop: {
            av: {adj:100000},
            gd: [
                ['a','pin',[0,"adj",200000]],
                ['r2','sqrt',[2]],
                ['tw','*/',["wd2","r2",1]],
                ['th','*/',["hd2","r2",1]],
                ['sw','*/',["tw","a",100000]],
                ['sh','*/',["th","a",100000]],
                ['dx1','cos',["sw",2700000]],
                ['dy1','sin',["sh",2700000]],
                ['x1','+-',["hc","dx1",0]],
                ['y1','+-',["vc",0,"dy1"]],
                ['x2','+/',["hc","x1",2]],
                ['y2','+/',["vc","y1",2]],
                ['idx','cos',["wd2",2700000]],
                ['idy','sin',["hd2",2700000]],
                ['il','+-',["hc",0,"idx"]],
                ['ir','+-',["hc","idx",0]],
                ['it','+-',["vc",0,"idy"]],
                ['ib','+-',["vc","idy",0]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","vc"],
                    ["arcTo","wd2","hd2","cd2","cd4"],
                    ["quadBezTo","x2","t","x1","y1"],
                    ["quadBezTo","r","y2","r","vc"],
                    ["arcTo","wd2","hd2",0,"cd4"],
                    ["arcTo","wd2","hd2","cd4","cd4"],
                    ["close"],
                ]},
            ]
        },
        trapezoid: {
            av: {adj:25000},
            gd: [
                ['maxAdj','*/',[50000,"w","ss"]],
                ['a','pin',[0,"adj","maxAdj"]],
                ['x1','*/',["ss","a",200000]],
                ['x2','*/',["ss","a",100000]],
                ['x3','+-',["r",0,"x2"]],
                ['x4','+-',["r",0,"x1"]],
                ['il','*/',["wd3","a","maxAdj"]],
                ['it','*/',["hd3","a","maxAdj"]],
                ['ir','+-',["r",0,"il"]],
            ],
            paths: [
                {cmds:[["moveTo","l","b"],["lnTo","x2","t"],["lnTo","x3","t"],["lnTo","r","b"],["close"]]},
            ]
        },
        triangle: {
            av: {adj:50000},
            gd: [
                ['a','pin',[0,"adj",100000]],
                ['x1','*/',["w","a",200000]],
                ['x2','*/',["w","a",100000]],
                ['x3','+-',["x1","wd2",0]],
            ],
            paths: [
                {cmds:[["moveTo","l","b"],["lnTo","x2","t"],["lnTo","r","b"],["close"]]},
            ]
        },
        upArrowCallout: {
            av: {adj1:25000,adj2:25000,adj3:25000,adj4:64977},
            gd: [
                ['maxAdj2','*/',[50000,"w","ss"]],
                ['a2','pin',[0,"adj2","maxAdj2"]],
                ['maxAdj1','*/',["a2",2,1]],
                ['a1','pin',[0,"adj1","maxAdj1"]],
                ['maxAdj3','*/',[100000,"h","ss"]],
                ['a3','pin',[0,"adj3","maxAdj3"]],
                ['q2','*/',["a3","ss","h"]],
                ['maxAdj4','+-',[100000,0,"q2"]],
                ['a4','pin',[0,"adj4","maxAdj4"]],
                ['dx1','*/',["ss","a2",100000]],
                ['dx2','*/',["ss","a1",200000]],
                ['x1','+-',["hc",0,"dx1"]],
                ['x2','+-',["hc",0,"dx2"]],
                ['x3','+-',["hc","dx2",0]],
                ['x4','+-',["hc","dx1",0]],
                ['y1','*/',["ss","a3",100000]],
                ['dy2','*/',["h","a4",100000]],
                ['y2','+-',["b",0,"dy2"]],
                ['y3','+/',["y2","b",2]],
            ],
            rect: {l:'l',t:'y2',r:'r',b:'b'},
            paths: [
                {cmds:[
                    ["moveTo","l","y2"],
                    ["lnTo","x2","y2"],
                    ["lnTo","x2","y1"],
                    ["lnTo","x1","y1"],
                    ["lnTo","hc","t"],
                    ["lnTo","x4","y1"],
                    ["lnTo","x3","y1"],
                    ["lnTo","x3","y2"],
                    ["lnTo","r","y2"],
                    ["lnTo","r","b"],
                    ["lnTo","l","b"],
                    ["close"],
                ]},
            ]
        },
        upDownArrow: {
            av: {adj1:50000,adj2:50000},
            gd: [
                ['maxAdj2','*/',[50000,"h","ss"]],
                ['a1','pin',[0,"adj1",100000]],
                ['a2','pin',[0,"adj2","maxAdj2"]],
                ['y2','*/',["ss","a2",100000]],
                ['y3','+-',["b",0,"y2"]],
                ['dx1','*/',["w","a1",200000]],
                ['x1','+-',["hc",0,"dx1"]],
                ['x2','+-',["hc","dx1",0]],
                ['dy1','*/',["x1","y2","wd2"]],
                ['y1','+-',["y2",0,"dy1"]],
                ['y4','+-',["y3","dy1",0]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","y2"],
                    ["lnTo","hc","t"],
                    ["lnTo","r","y2"],
                    ["lnTo","x2","y2"],
                    ["lnTo","x2","y3"],
                    ["lnTo","r","y3"],
                    ["lnTo","hc","b"],
                    ["lnTo","l","y3"],
                    ["lnTo","x1","y3"],
                    ["lnTo","x1","y2"],
                    ["close"],
                ]},
            ]
        },
        upDownArrowCallout: {
            av: {adj1:25000,adj2:25000,adj3:25000,adj4:48123},
            gd: [
                ['maxAdj2','*/',[50000,"w","ss"]],
                ['a2','pin',[0,"adj2","maxAdj2"]],
                ['maxAdj1','*/',["a2",2,1]],
                ['a1','pin',[0,"adj1","maxAdj1"]],
                ['maxAdj3','*/',[50000,"h","ss"]],
                ['a3','pin',[0,"adj3","maxAdj3"]],
                ['q2','*/',["a3","ss","hd2"]],
                ['maxAdj4','+-',[100000,0,"q2"]],
                ['a4','pin',[0,"adj4","maxAdj4"]],
                ['dx1','*/',["ss","a2",100000]],
                ['dx2','*/',["ss","a1",200000]],
                ['x1','+-',["hc",0,"dx1"]],
                ['x2','+-',["hc",0,"dx2"]],
                ['x3','+-',["hc","dx2",0]],
                ['x4','+-',["hc","dx1",0]],
                ['y1','*/',["ss","a3",100000]],
                ['y4','+-',["b",0,"y1"]],
                ['dy2','*/',["h","a4",200000]],
                ['y2','+-',["vc",0,"dy2"]],
                ['y3','+-',["vc","dy2",0]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","y2"],
                    ["lnTo","x2","y2"],
                    ["lnTo","x2","y1"],
                    ["lnTo","x1","y1"],
                    ["lnTo","hc","t"],
                    ["lnTo","x4","y1"],
                    ["lnTo","x3","y1"],
                    ["lnTo","x3","y2"],
                    ["lnTo","r","y2"],
                    ["lnTo","r","y3"],
                    ["lnTo","x3","y3"],
                    ["lnTo","x3","y4"],
                    ["lnTo","x4","y4"],
                    ["lnTo","hc","b"],
                    ["lnTo","x1","y4"],
                    ["lnTo","x2","y4"],
                    ["lnTo","x2","y3"],
                    ["lnTo","l","y3"],
                    ["close"],
                ]},
            ]
        },
        uturnArrow: {
            av: {adj1:25000,adj2:25000,adj3:25000,adj4:43750,adj5:75000},
            gd: [
                ['a2','pin',[0,"adj2",25000]],
                ['maxAdj1','*/',["a2",2,1]],
                ['a1','pin',[0,"adj1","maxAdj1"]],
                ['q2','*/',["a1","ss","h"]],
                ['q3','+-',[100000,0,"q2"]],
                ['maxAdj3','*/',["q3","h","ss"]],
                ['a3','pin',[0,"adj3","maxAdj3"]],
                ['q1','+-',["a3","a1",0]],
                ['minAdj5','*/',["q1","ss","h"]],
                ['a5','pin',["minAdj5","adj5",100000]],
                ['th','*/',["ss","a1",100000]],
                ['aw2','*/',["ss","a2",100000]],
                ['th2','*/',["th",1,2]],
                ['dh2','+-',["aw2",0,"th2"]],
                ['y5','*/',["h","a5",100000]],
                ['ah','*/',["ss","a3",100000]],
                ['y4','+-',["y5",0,"ah"]],
                ['x9','+-',["r",0,"dh2"]],
                ['bw','*/',["x9",1,2]],
                ['bs','min',["bw","y4"]],
                ['maxAdj4','*/',["bs",100000,"ss"]],
                ['a4','pin',[0,"adj4","maxAdj4"]],
                ['bd','*/',["ss","a4",100000]],
                ['bd3','+-',["bd",0,"th"]],
                ['bd2','max',["bd3",0]],
                ['x3','+-',["th","bd2",0]],
                ['x8','+-',["r",0,"aw2"]],
                ['x6','+-',["x8",0,"aw2"]],
                ['x7','+-',["x6","dh2",0]],
                ['x4','+-',["x9",0,"bd"]],
                ['x5','+-',["x7",0,"bd2"]],
                ['cx','+/',["th","x7",2]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","b"],
                    ["lnTo","l","bd"],
                    ["arcTo","bd","bd","cd2","cd4"],
                    ["lnTo","x4","t"],
                    ["arcTo","bd","bd","3cd4","cd4"],
                    ["lnTo","x9","y4"],
                    ["lnTo","r","y4"],
                    ["lnTo","x8","y5"],
                    ["lnTo","x6","y4"],
                    ["lnTo","x7","y4"],
                    ["lnTo","x7","x3"],
                    ["arcTo","bd2","bd2",0,-5400000],
                    ["lnTo","x3","th"],
                    ["arcTo","bd2","bd2","3cd4",-5400000],
                    ["lnTo","th","b"],
                    ["close"],
                ]},
            ]
        },
        verticalScroll: {
            av: {adj:12500},
            gd: [
                ['a','pin',[0,"adj",25000]],
                ['ch','*/',["ss","a",100000]],
                ['ch2','*/',["ch",1,2]],
                ['ch4','*/',["ch",1,4]],
                ['x3','+-',["ch","ch2",0]],
                ['x4','+-',["ch","ch",0]],
                ['x6','+-',["r",0,"ch"]],
                ['x7','+-',["r",0,"ch2"]],
                ['x5','+-',["x6",0,"ch2"]],
                ['y3','+-',["b",0,"ch"]],
                ['y4','+-',["b",0,"ch2"]],
            ],
            paths: [
                {stroke:"false",cmds:[
                    ["moveTo","ch2","b"],
                    ["arcTo","ch2","ch2","cd4",-5400000],
                    ["lnTo","ch2","y4"],
                    ["arcTo","ch4","ch4","cd4",-10800000],
                    ["lnTo","ch","y3"],
                    ["lnTo","ch","ch2"],
                    ["arcTo","ch2","ch2","cd2","cd4"],
                    ["lnTo","x7","t"],
                    ["arcTo","ch2","ch2","3cd4","cd2"],
                    ["lnTo","x6","ch"],
                    ["lnTo","x6","y4"],
                    ["arcTo","ch2","ch2",0,"cd4"],
                    ["close"],
                    ["moveTo","x4","ch2"],
                    ["arcTo","ch2","ch2",0,"cd4"],
                    ["arcTo","ch4","ch4","cd4","cd2"],
                    ["close"],
                ]},
                {fill:"darkenLess",stroke:"false",cmds:[
                    ["moveTo","x4","ch2"],
                    ["arcTo","ch2","ch2",0,"cd4"],
                    ["arcTo","ch4","ch4","cd4","cd2"],
                    ["close"],
                    ["moveTo","ch","y4"],
                    ["arcTo","ch2","ch2",0,"3cd4"],
                    ["arcTo","ch4","ch4","3cd4","cd2"],
                    ["close"],
                ]},
                {fill:"none",cmds:[
                    ["moveTo","ch","y3"],
                    ["lnTo","ch","ch2"],
                    ["arcTo","ch2","ch2","cd2","cd4"],
                    ["lnTo","x7","t"],
                    ["arcTo","ch2","ch2","3cd4","cd2"],
                    ["lnTo","x6","ch"],
                    ["lnTo","x6","y4"],
                    ["arcTo","ch2","ch2",0,"cd4"],
                    ["lnTo","ch2","b"],
                    ["arcTo","ch2","ch2","cd4","cd2"],
                    ["close"],
                    ["moveTo","x3","t"],
                    ["arcTo","ch2","ch2","3cd4","cd2"],
                    ["arcTo","ch4","ch4","cd4","cd2"],
                    ["lnTo","x4","ch2"],
                    ["moveTo","x6","ch"],
                    ["lnTo","x3","ch"],
                    ["moveTo","ch2","y3"],
                    ["arcTo","ch4","ch4","3cd4","cd2"],
                    ["lnTo","ch","y4"],
                    ["moveTo","ch2","b"],
                    ["arcTo","ch2","ch2","cd4",-5400000],
                    ["lnTo","ch","y3"],
                ]},
            ]
        },
        wave: {
            av: {adj1:12500,adj2:0},
            gd: [
                ['a1','pin',[0,"adj1",20000]],
                ['a2','pin',[-10000,"adj2",10000]],
                ['y1','*/',["h","a1",100000]],
                ['dy2','*/',["y1",10,3]],
                ['y2','+-',["y1",0,"dy2"]],
                ['y3','+-',["y1","dy2",0]],
                ['y4','+-',["b",0,"y1"]],
                ['y5','+-',["y4",0,"dy2"]],
                ['y6','+-',["y4","dy2",0]],
                ['dx1','*/',["w","a2",100000]],
                ['of2','*/',["w","a2",50000]],
                ['x1','abs',["dx1"]],
                ['dx2','?:',["of2",0,"of2"]],
                ['x2','+-',["l",0,"dx2"]],
                ['dx5','?:',["of2","of2",0]],
                ['x5','+-',["r",0,"dx5"]],
                ['dx3','+/',["dx2","x5",3]],
                ['x3','+-',["x2","dx3",0]],
                ['x4','+/',["x3","x5",2]],
                ['x6','+-',["l","dx5",0]],
                ['x10','+-',["r","dx2",0]],
                ['x7','+-',["x6","dx3",0]],
                ['x8','+/',["x7","x10",2]],
                ['x9','+-',["r",0,"x1"]],
                ['xAdj','+-',["hc","dx1",0]],
                ['xAdj2','+-',["hc",0,"dx1"]],
                ['il','max',["x2","x6"]],
                ['ir','min',["x5","x10"]],
                ['it','*/',["h","a1",50000]],
                ['ib','+-',["b",0,"it"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","x2","y1"],
                    ["cubicBezTo","x3","y2","x4","y3","x5","y1"],
                    ["lnTo","x10","y4"],
                    ["cubicBezTo","x8","y6","x7","y5","x6","y4"],
                    ["close"],
                ]},
            ]
        },
        wedgeEllipseCallout: {
            av: {adj1:-20833,adj2:62500},
            gd: [
                ['dxPos','*/',["w","adj1",100000]],
                ['dyPos','*/',["h","adj2",100000]],
                ['xPos','+-',["hc","dxPos",0]],
                ['yPos','+-',["vc","dyPos",0]],
                ['sdx','*/',["dxPos","h",1]],
                ['sdy','*/',["dyPos","w",1]],
                ['pang','at2',["sdx","sdy"]],
                ['stAng','+-',["pang",660000,0]],
                ['enAng','+-',["pang",0,660000]],
                ['dx1','cos',["wd2","stAng"]],
                ['dy1','sin',["hd2","stAng"]],
                ['x1','+-',["hc","dx1",0]],
                ['y1','+-',["vc","dy1",0]],
                ['dx2','cos',["wd2","enAng"]],
                ['dy2','sin',["hd2","enAng"]],
                ['x2','+-',["hc","dx2",0]],
                ['y2','+-',["vc","dy2",0]],
                ['stAng1','at2',["dx1","dy1"]],
                ['enAng1','at2',["dx2","dy2"]],
                ['swAng1','+-',["enAng1",0,"stAng1"]],
                ['swAng2','+-',["swAng1",21600000,0]],
                ['swAng','?:',["swAng1","swAng1","swAng2"]],
                ['idx','cos',["wd2",2700000]],
                ['idy','sin',["hd2",2700000]],
                ['il','+-',["hc",0,"idx"]],
                ['ir','+-',["hc","idx",0]],
                ['it','+-',["vc",0,"idy"]],
                ['ib','+-',["vc","idy",0]],
            ],
            paths: [
                {cmds:[["moveTo","xPos","yPos"],["lnTo","x1","y1"],["arcTo","wd2","hd2","stAng1","swAng"],["close"]]},
            ]
        },
        wedgeRectCallout: {
            av: {adj1:-20833,adj2:62500},
            gd: [
                ['dxPos','*/',["w","adj1",100000]],
                ['dyPos','*/',["h","adj2",100000]],
                ['xPos','+-',["hc","dxPos",0]],
                ['yPos','+-',["vc","dyPos",0]],
                ['dx','+-',["xPos",0,"hc"]],
                ['dy','+-',["yPos",0,"vc"]],
                ['dq','*/',["dxPos","h","w"]],
                ['ady','abs',["dyPos"]],
                ['adq','abs',["dq"]],
                ['dz','+-',["ady",0,"adq"]],
                ['xg1','?:',["dxPos",7,2]],
                ['xg2','?:',["dxPos",10,5]],
                ['x1','*/',["w","xg1",12]],
                ['x2','*/',["w","xg2",12]],
                ['yg1','?:',["dyPos",7,2]],
                ['yg2','?:',["dyPos",10,5]],
                ['y1','*/',["h","yg1",12]],
                ['y2','*/',["h","yg2",12]],
                ['t1','?:',["dxPos","l","xPos"]],
                ['xl','?:',["dz","l","t1"]],
                ['t2','?:',["dyPos","x1","xPos"]],
                ['xt','?:',["dz","t2","x1"]],
                ['t3','?:',["dxPos","xPos","r"]],
                ['xr','?:',["dz","r","t3"]],
                ['t4','?:',["dyPos","xPos","x1"]],
                ['xb','?:',["dz","t4","x1"]],
                ['t5','?:',["dxPos","y1","yPos"]],
                ['yl','?:',["dz","y1","t5"]],
                ['t6','?:',["dyPos","t","yPos"]],
                ['yt','?:',["dz","t6","t"]],
                ['t7','?:',["dxPos","yPos","y1"]],
                ['yr','?:',["dz","y1","t7"]],
                ['t8','?:',["dyPos","yPos","b"]],
                ['yb','?:',["dz","t8","b"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","t"],
                    ["lnTo","x1","t"],
                    ["lnTo","xt","yt"],
                    ["lnTo","x2","t"],
                    ["lnTo","r","t"],
                    ["lnTo","r","y1"],
                    ["lnTo","xr","yr"],
                    ["lnTo","r","y2"],
                    ["lnTo","r","b"],
                    ["lnTo","x2","b"],
                    ["lnTo","xb","yb"],
                    ["lnTo","x1","b"],
                    ["lnTo","l","b"],
                    ["lnTo","l","y2"],
                    ["lnTo","xl","yl"],
                    ["lnTo","l","y1"],
                    ["close"],
                ]},
            ]
        },
        wedgeRoundRectCallout: {
            av: {adj1:-20833,adj2:62500,adj3:16667},
            gd: [
                ['dxPos','*/',["w","adj1",100000]],
                ['dyPos','*/',["h","adj2",100000]],
                ['xPos','+-',["hc","dxPos",0]],
                ['yPos','+-',["vc","dyPos",0]],
                ['dq','*/',["dxPos","h","w"]],
                ['ady','abs',["dyPos"]],
                ['adq','abs',["dq"]],
                ['dz','+-',["ady",0,"adq"]],
                ['xg1','?:',["dxPos",7,2]],
                ['xg2','?:',["dxPos",10,5]],
                ['x1','*/',["w","xg1",12]],
                ['x2','*/',["w","xg2",12]],
                ['yg1','?:',["dyPos",7,2]],
                ['yg2','?:',["dyPos",10,5]],
                ['y1','*/',["h","yg1",12]],
                ['y2','*/',["h","yg2",12]],
                ['t1','?:',["dxPos","l","xPos"]],
                ['xl','?:',["dz","l","t1"]],
                ['t2','?:',["dyPos","x1","xPos"]],
                ['xt','?:',["dz","t2","x1"]],
                ['t3','?:',["dxPos","xPos","r"]],
                ['xr','?:',["dz","r","t3"]],
                ['t4','?:',["dyPos","xPos","x1"]],
                ['xb','?:',["dz","t4","x1"]],
                ['t5','?:',["dxPos","y1","yPos"]],
                ['yl','?:',["dz","y1","t5"]],
                ['t6','?:',["dyPos","t","yPos"]],
                ['yt','?:',["dz","t6","t"]],
                ['t7','?:',["dxPos","yPos","y1"]],
                ['yr','?:',["dz","y1","t7"]],
                ['t8','?:',["dyPos","yPos","b"]],
                ['yb','?:',["dz","t8","b"]],
                ['u1','*/',["ss","adj3",100000]],
                ['u2','+-',["r",0,"u1"]],
                ['v2','+-',["b",0,"u1"]],
                ['il','*/',["u1",29289,100000]],
                ['ir','+-',["r",0,"il"]],
                ['ib','+-',["b",0,"il"]],
            ],
            paths: [
                {cmds:[
                    ["moveTo","l","u1"],
                    ["arcTo","u1","u1","cd2","cd4"],
                    ["lnTo","x1","t"],
                    ["lnTo","xt","yt"],
                    ["lnTo","x2","t"],
                    ["lnTo","u2","t"],
                    ["arcTo","u1","u1","3cd4","cd4"],
                    ["lnTo","r","y1"],
                    ["lnTo","xr","yr"],
                    ["lnTo","r","y2"],
                    ["lnTo","r","v2"],
                    ["arcTo","u1","u1",0,"cd4"],
                    ["lnTo","x2","b"],
                    ["lnTo","xb","yb"],
                    ["lnTo","x1","b"],
                    ["lnTo","u1","b"],
                    ["arcTo","u1","u1","cd4","cd4"],
                    ["lnTo","l","y2"],
                    ["lnTo","xl","yl"],
                    ["lnTo","l","y1"],
                    ["close"],
                ]},
            ]
        },
    };

    function safeHrefForHyperlink(url) {
        if (typeof url !== 'string') {
            return '';
        }
        const trimmed = url.trim();
        if (!trimmed) {
            return '';
        }
        if (/^(https?:|mailto:)/i.test(trimmed)) {
            return trimmed;
        }
        return '';
    }

    function parseInternalHyperlink(url) {
        if (typeof url !== 'string') {
            return null;
        }
        const trimmed = url.trim();
        if (!trimmed || trimmed[0] !== '#') {
            return null;
        }
        const body = trimmed.slice(1);
        const bang = body.lastIndexOf('!');
        if (bang < 0) {
            return { sheet: body.replace(/^'(.*)'$/, '$1'), cell: 'A1' };
        }
        let sheet = body.slice(0, bang);
        const cell = body.slice(bang + 1) || 'A1';
        sheet = sheet.replace(/^'(.*)'$/, '$1').replace(/''/g, "'");
        return { sheet, cell };
    }

    function safeNum(v, min, max) {
        const n = parseFloat(v);
        if (!isFinite(n)) {
            return null;
        }
        return Math.max(min, Math.min(max, n));
    }

    function safeFontFamily(v) {
        if (typeof v !== 'string') {
            return '';
        }
        const cleaned = v.replace(/[^\d +.A-Za-z-]/g, '').trim();
        return cleaned.slice(0, 64);
    }

    class XlsxRenderer {

        constructor(workbook, opts) {
            this.workbook = workbook;
            this.onInternalLinkClick = opts && opts.onInternalLinkClick || null;
        }

        handleExternalLink(ev, url) {
            if (ev) {
                ev.preventDefault();
                ev.stopPropagation();
            }
            if (!url || typeof url !== 'string') {
                return;
            }
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'xlsxviewer:open-url', url }, '*');
            }
        }

        handleInternalLink(ev, target) {
            if (ev) {
                ev.preventDefault();
                ev.stopPropagation();
            }
            if (!target) {
                return;
            }
            const sheets = this.workbook && this.workbook.sheets || [];
            const idx = sheets.findIndex((s) => s.name === target.sheet);
            if (idx >= 0 && this.onInternalLinkClick) {
                this.onInternalLinkClick(idx, target.cell);
            }
            this.scrollToCellRef(target.cell);
        }

        scrollToCellRef(cell) {
            const scroller = document.getElementById('xlsx-content')
                || document.scrollingElement
                || document.documentElement
                || document.body;
            if (!scroller) {
                return;
            }
            const cellRef = (cell || 'A1').toUpperCase();
            if (cellRef === 'A1') {
                scroller.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            if (!/^[A-Z]+\d+$/.test(cellRef)) {
                return;
            }
            const safeRef = typeof CSS !== 'undefined' && CSS.escape
                ? CSS.escape(cellRef)
                : cellRef;
            const targetEl = (() => {
                try {
                    return document.querySelector(`[data-cell-ref="${safeRef}"]`);
                }
                catch (ex) {
                    return null;
                }
            })();
            if (targetEl && targetEl.scrollIntoView) {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }

        renderTabs(tabsNode, activeIndex, onTabClick) {
            const sheets = this.workbook && this.workbook.sheets || [];

            // Drop any observer left over from a previous render of the same node.
            if (tabsNode._xlsxTabsResizeObserver) {
                tabsNode._xlsxTabsResizeObserver.disconnect();
                tabsNode._xlsxTabsResizeObserver = null;
            }
            tabsNode.replaceChildren();
            this.tabList = null;

            if (sheets.length <= 1) {
                tabsNode.style.display = 'none';
                return;
            }
            tabsNode.style.display = '';

            const mkArrow = (dir) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `xlsx-tab-arrow xlsx-tab-arrow-${dir}`;
                btn.setAttribute('aria-label', dir === 'prev' ? 'Previous sheets' : 'Next sheets');
                btn.tabIndex = -1;
                return btn;
            };

            const prev = mkArrow('prev');
            const next = mkArrow('next');
            const list = document.createElement('div');
            list.className = 'xlsx-tab-list';

            for (let i = 0; i < sheets.length; i++) {
                const tab = document.createElement('div');
                tab.className = `xlsx-tab${i === activeIndex ? ' active' : ''}`;
                tab.textContent = sheets[i].name;
                tab.title = sheets[i].name;
                tab.dataset.idx = String(i);
                tab.addEventListener('click', () => onTabClick(i));
                list.appendChild(tab);
            }

            tabsNode.appendChild(prev);
            tabsNode.appendChild(next);
            tabsNode.appendChild(list);
            this.tabList = list;

            const updateArrows = () => {
                const overflow = list.scrollWidth - list.clientWidth;
                const hasOverflow = overflow > 1;
                prev.classList.toggle('hidden', !hasOverflow);
                next.classList.toggle('hidden', !hasOverflow);
                if (hasOverflow) {
                    prev.disabled = list.scrollLeft <= 0;
                    next.disabled = list.scrollLeft >= overflow - 1;
                }
            };

            const scrollByOne = (dir) => {
                const tabs = list.querySelectorAll('.xlsx-tab');
                const listRect = list.getBoundingClientRect();
                if (dir > 0) {
                    for (const t of tabs) {
                        const r = t.getBoundingClientRect();
                        if (r.right > listRect.right + 1) {
                            list.scrollLeft += r.right - listRect.right;
                            return;
                        }
                    }
                }
                else {
                    for (let i = tabs.length - 1; i >= 0; i--) {
                        const r = tabs[i].getBoundingClientRect();
                        if (r.left < listRect.left - 1) {
                            list.scrollLeft -= listRect.left - r.left;
                            return;
                        }
                    }
                }
            };

            prev.addEventListener('click', () => scrollByOne(-1));
            next.addEventListener('click', () => scrollByOne(1));
            list.addEventListener('scroll', updateArrows, { passive: true });

            if (typeof ResizeObserver !== 'undefined') {
                const ro = new ResizeObserver(updateArrows);
                ro.observe(list);
                tabsNode._xlsxTabsResizeObserver = ro;
            }

            updateArrows();
            this.scrollActiveTabIntoView(activeIndex);
        }

        setActiveTab(tabsNode, activeIndex) {
            const tabs = tabsNode.querySelectorAll('.xlsx-tab');
            for (let i = 0; i < tabs.length; i++) {
                tabs[i].classList.toggle('active', i === activeIndex);
            }
            this.scrollActiveTabIntoView(activeIndex);
        }

        scrollActiveTabIntoView(activeIndex) {
            const list = this.tabList;
            if (!list) {
                return;
            }
            const tab = list.querySelector(`.xlsx-tab[data-idx="${activeIndex}"]`);
            if (tab && tab.scrollIntoView) {
                tab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
            }
        }

        fontCss(f) {
            if (!f) {
                return [];
            }
            const parts = [];
            if (f.bold) {
                parts.push('font-weight:bold');
            }
            if (f.italic) {
                parts.push('font-style:italic');
            }
            const td = [];
            if (f.underline) {
                td.push('underline');
            }
            if (f.strike) {
                td.push('line-through');
            }
            if (td.length) {
                parts.push(`text-decoration:${td.join(' ')}`);
            }
            const sz = safeNum(f.size, 0, 144);
            if (sz) {
                parts.push(`font-size:${sz}pt`);
            }
            const col = safeCssColor(f.color);
            if (col) {
                parts.push(`color:${col}`);
            }
            const fam = safeFontFamily(f.name);
            if (fam) {
                parts.push(`font-family:"${fam}",sans-serif`);
            }
            return parts;
        }

        borderCss(b) {
            if (!b) {
                return [];
            }
            const parts = [];
            for (const side of BORDER_SIDES) {
                if (b[side]) {
                    parts.push(`border-${side}:${this.borderStyleCss(b[side])}`);
                }
            }
            return parts;
        }

        alignmentCss(a) {
            if (!a) {
                return [];
            }
            const parts = [];
            if (H_ALIGN_ALLOW.has(a.horizontal)) {
                const h = a.horizontal === 'centerContinuous'
                    || a.horizontal === 'fill'
                    || a.horizontal === 'distributed'
                    ? 'center' : a.horizontal;
                parts.push(`text-align:${h}`);
            }
            if (V_ALIGN_ALLOW.has(a.vertical)) {
                const v = a.vertical === 'center'
                    || a.vertical === 'distributed'
                    || a.vertical === 'justify'
                    ? 'middle' : a.vertical;
                parts.push(`vertical-align:${v}`);
            }
            return parts;
        }

        cssForXf(xf) {
            if (!xf) {
                return '';
            }
            const parts = this.fontCss(xf.font);
            const bg = safeCssColor(xf.fill && xf.fill.bgColor);
            if (bg) {
                parts.push(`background-color:${bg}`);
            }
            parts.push(...this.borderCss(xf.border), ...this.alignmentCss(xf.alignment));
            return parts.join(';');
        }

        borderStyleCss(side) {
            if (!side) {
                return '';
            }
            const decl = BORDER_WIDTH_MAP[side.style] || '1px solid';
            const color = safeCssColor(side.color) || '#000';
            return `${decl} ${color}`;
        }

        cellDisplayText(value, xf) {
            if (value === null || value === undefined || value === '') {
                return '';
            }
            if (typeof value === 'boolean') {
                return value ? 'TRUE' : 'FALSE';
            }
            if (typeof value === 'number') {
                if (xf && xf.isDate) {
                    return String(formatDate(value, xf.numFmtCode));
                }
                if (xf && xf.numFmtCode) {
                    return String(formatNumber(value, xf.numFmtCode));
                }
            }
            return String(value);
        }

        isInvisibleText(xf) {
            const fg = xf && xf.font && xf.font.color;
            if (!fg) {
                return false;
            }
            const bg = xf && xf.fill && xf.fill.bgColor;
            const fgHex = normalizeHexColor(fg);
            const bgHex = normalizeHexColor(bg);
            if (!fgHex) {
                return false;
            }
            if (fgHex === '#ffffff' && (!bgHex || bgHex === '#ffffff')) {
                return true;
            }
            if (bgHex && fgHex === bgHex) {
                return true;
            }
            if (bgHex) {
                const fr = parseInt(fgHex.slice(1, 3), 16);
                const fg2 = parseInt(fgHex.slice(3, 5), 16);
                const fb = parseInt(fgHex.slice(5, 7), 16);
                const br = parseInt(bgHex.slice(1, 3), 16);
                const bg2 = parseInt(bgHex.slice(3, 5), 16);
                const bb = parseInt(bgHex.slice(5, 7), 16);
                const dr = fr - br;
                const dg = fg2 - bg2;
                const db = fb - bb;
                const dist2 = dr * dr + dg * dg + db * db;
                if (dist2 < 1500) {
                    return true;
                }
            }
            return false;
        }

        buildMergeMaps(merges) {
            const skip = new Map();
            const anchor = new Map();
            for (const m of merges) {
                anchor.set(`${m.r1},${m.c1}`, { rs: m.r2 - m.r1 + 1, cs: m.c2 - m.c1 + 1 });
                for (let r = m.r1; r <= m.r2; r++) {
                    for (let c = m.c1; c <= m.c2; c++) {
                        if (r !== m.r1 || c !== m.c1) {
                            skip.set(`${r},${c}`, true);
                        }
                    }
                }
            }
            return { skip, anchor };
        }

        measureContext() {
            if (!this._measureCtx) {
                const c = document.createElement('canvas');
                this._measureCtx = c.getContext('2d');
            }
            return this._measureCtx;
        }

        fontStringFor(font) {
            const size = font && font.size || 11;
            const name = font && font.name || 'Calibri';
            const style = font && font.italic ? 'italic' : 'normal';
            const weight = font && font.bold ? 'bold' : 'normal';
            return `${style} ${weight} ${size}pt "${name}", sans-serif`;
        }

        defaultMDW() {
            if (this._defaultMDW !== undefined) {
                return this._defaultMDW;
            }
            const f = this.workbook && this.workbook.defaultFont;
            let mdw;
            try {
                const ctx = this.measureContext();
                ctx.font = this.fontStringFor(f);
                mdw = Math.max(5, Math.ceil(ctx.measureText('0').width));
            }
            catch (ex) {
                const size = f && f.size || 11;
                mdw = Math.max(6, Math.min(12, Math.round(size * 7 / 11)));
            }
            this._defaultMDW = mdw;
            return mdw;
        }

        colWidthToPx(width) {
            if (!width || isNaN(width)) {
                return null;
            }
            const mdw = this.defaultMDW();
            return Math.max(20, Math.round(width * mdw + 5));
        }

        rowHeightToPx(ht) {
            if (!ht || isNaN(ht)) {
                return null;
            }
            return Math.max(14, Math.round(ht * 96 / 72));
        }

        sheetDefaultColPx(sheet) {
            if (sheet.defaultColWidth) {
                return this.colWidthToPx(sheet.defaultColWidth);
            }
            if (sheet.baseColWidth) {
                return this.colWidthToPx(sheet.baseColWidth + 0.43);
            }
            return 64;
        }

        buildColgroup(maxCols, sheet, styleTable, mergeMaps) {
            const colgroup = document.createElement('colgroup');
            const corner = document.createElement('col');
            corner.style.width = '44px';
            colgroup.appendChild(corner);
            const defaultPx = this.sheetDefaultColPx(sheet);
            const measured = this.measureColumnMinWidths(sheet, maxCols, styleTable, mergeMaps);
            let totalPx = 44;
            const effectiveWidths = [];
            for (let c = 0; c < maxCols; c++) {
                const colEl = document.createElement('col');
                const specific = sheet.colWidths && sheet.colWidths[c];
                const storedPx = specific ? this.colWidthToPx(specific) : defaultPx;
                const px = Math.max(storedPx, measured[c] || 0);
                colEl.style.width = `${px}px`;
                colgroup.appendChild(colEl);
                effectiveWidths[c] = px;
                totalPx += px;
            }
            sheet.effectiveColWidthsPx = effectiveWidths;
            colgroup._totalPx = totalPx;
            return colgroup;
        }

        measureCellWidth(ctx, text, xf) {
            const isWrap = xf && xf.alignment && xf.alignment.wrap;
            if (isWrap) {
                return String(text).split(/\s+/)
                    .reduce((m, p) => Math.max(m, ctx.measureText(p).width), 0);
            }
            return ctx.measureText(String(text)).width;
        }

        shouldSkipCellForMeasure(v, r, c, mergeMaps) {
            if (v === '' || v === null || v === undefined) {
                return true;
            }
            const anchor = mergeMaps.anchor.get(`${r},${c}`);
            if (anchor && anchor.cs > 1) {
                return true;
            }
            return !!mergeMaps.skip.get(`${r},${c}`);
        }

        measureColumnMinWidths(sheet, maxCols, styleTable, mergeMaps) {
            const ctx = this.measureContext();
            const padding = 8;
            const cap = 220;
            const minW = new Array(maxCols).fill(0);
            const cellStyles = sheet.cellStyles || [];
            for (let r = 0; r < sheet.rows.length; r++) {
                const row = sheet.rows[r];
                const styleRow = cellStyles[r] || [];
                for (let c = 0; c < Math.min(maxCols, row.length); c++) {
                    const v = row[c];
                    if (this.shouldSkipCellForMeasure(v, r, c, mergeMaps)) {
                        continue;
                    }
                    const xf = styleTable[styleRow[c] || 0];
                    const text = this.cellDisplayText(v, xf);
                    if (!text) {
                        continue;
                    }
                    ctx.font = this.fontStringFor(xf && xf.font);
                    const align = this.effectiveAlign(v, xf);
                    const isWrap = xf && xf.alignment && xf.alignment.wrap;
                    const canSpill = !isWrap
                        && (align === 'left' || align === 'right' || align === 'justify');
                    if (canSpill && this.hasEmptyNeighbour(row, c, maxCols, align)) {
                        continue;
                    }
                    const total = Math.min(cap, Math.ceil(this.measureCellWidth(ctx, text, xf)) + padding);
                    if (total > minW[c]) {
                        minW[c] = total;
                    }
                }
            }
            return minW;
        }

        hasEmptyNeighbour(row, c, maxCols, align) {
            if (align === 'left' || align === 'justify') {
                const nc = c + 1;
                if (nc >= maxCols || nc >= row.length + 4) {
                    return true;
                }
                return this.isCellEmpty(row[nc]);
            }
            if (align === 'right') {
                const pc = c - 1;
                if (pc < 0) {
                    return true;
                }
                return this.isCellEmpty(row[pc]);
            }
            return false;
        }

        buildHeadRow(maxCols) {
            const thead = document.createElement('thead');
            const headRow = document.createElement('tr');
            headRow.appendChild(document.createElement('th'));
            for (let c = 0; c < maxCols; c++) {
                const th = document.createElement('th');
                th.textContent = indexToColRef(c);
                headRow.appendChild(th);
            }
            thead.appendChild(headRow);
            return thead;
        }

        applyCellTypeClasses(td, value, xf) {
            if (typeof value === 'number') {
                td.classList.add('num');
            }
            else if (typeof value === 'boolean') {
                td.classList.add('bool');
            }
            if (xf && xf.alignment && xf.alignment.wrap) {
                td.classList.add('xlsx-wrap');
            }
            if (xf && xf.__autoFilter) {
                td.classList.add('xlsx-filter-header');
            }
            const valign = xf && xf.alignment && xf.alignment.vertical;
            if (valign === 'top') {
                td.classList.add('xlsx-valign-top');
            }
            else if (valign === 'center') {
                td.classList.add('xlsx-valign-middle');
            }
        }

        applyHyperlinkClasses(td, xf, isLink) {
            if (!isLink) {
                return;
            }
            td.classList.add('xlsx-hyperlink-cell');
            const font = xf && xf.font;
            const hasCustomFont = !!(font && (font.bold || font.italic || font.underline || font.strike
                || font.color && String(font.color).toLowerCase() !== '#000000'));
            const hasExplicitFill = !!(xf && xf.fill && xf.fill.bgColor);
            if (!hasCustomFont && !hasExplicitFill) {
                td.classList.add('xlsx-hyperlink-default');
            }
        }

        applyCellIndent(inner, xf) {
            const indent = xf && xf.alignment && xf.alignment.indent;
            if (typeof indent !== 'number' || indent <= 0) {
                return;
            }
            const indentPx = indent * 9;
            if (xf.alignment.horizontal === 'right') {
                inner.style.paddingRight = `${4 + indentPx}px`;
            }
            else {
                inner.style.paddingLeft = `${4 + indentPx}px`;
            }
        }

        applyCellSpill(td, inner, value, xf, spill) {
            const align = this.effectiveAlign(value, xf);
            if (spill && spill.right && (align === 'left' || align === 'justify')) {
                inner.classList.add('spill-right');
                td.classList.add('xlsx-spill');
            }
            if (spill && spill.left && align === 'right') {
                inner.classList.add('spill-left');
                td.classList.add('xlsx-spill');
            }
        }

        buildCellLink(text, isLink, linkUrl) {
            const safeHref = safeHrefForHyperlink(linkUrl);
            const internal = isLink ? parseInternalHyperlink(linkUrl) : null;
            if (isLink && safeHref) {
                const a = document.createElement('a');
                a.href = safeHref;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.textContent = text;
                a.addEventListener('click', (ev) => this.handleExternalLink(ev, safeHref));
                return a;
            }
            if (internal) {
                const a = document.createElement('a');
                a.href = '#';
                a.textContent = text;
                a.addEventListener('click', (ev) => this.handleInternalLink(ev, internal));
                return a;
            }
            return null;
        }

        buildCellInner(td, value, xf, spill, isLink, linkUrl) {
            const text = this.cellDisplayText(value, xf);
            const inner = document.createElement('div');
            inner.className = 'xlsx-cell-content';
            this.applyCellIndent(inner, xf);
            this.applyCellSpill(td, inner, value, xf, spill);
            const linkEl = this.buildCellLink(text, isLink, linkUrl);
            if (linkEl) {
                inner.appendChild(linkEl);
            }
            else {
                inner.textContent = text;
            }
            return inner;
        }

        buildCell(value, xf, anchorInfo, spill, isLink, hidden, linkUrl) {
            const td = document.createElement('td');
            if (anchorInfo && anchorInfo.rs > 1) {
                td.rowSpan = anchorInfo.rs;
            }
            if (anchorInfo && anchorInfo.cs > 1) {
                td.colSpan = anchorInfo.cs;
            }
            const css = this.cssForXf(xf);
            if (css) {
                td.setAttribute('style', css);
            }
            this.applyHyperlinkClasses(td, xf, isLink);
            this.applyCellTypeClasses(td, value, xf);
            const text = this.cellDisplayText(value, xf);
            if (text && !this.isInvisibleText(xf) && !hidden) {
                td.appendChild(this.buildCellInner(td, value, xf, spill, isLink, linkUrl));
            }
            if (xf && xf.__iconSet) {
                const dot = document.createElement('span');
                dot.className = `xlsx-cf-icon xlsx-cf-icon-${xf.__iconSet.type} xlsx-cf-icon-anchor-left`;
                td.appendChild(dot);
            }
            return td;
        }

        isCellEmpty(v) {
            return v === '' || v === undefined || v === null;
        }

        spillSides(row, c, r, mergeMaps, maxCols) {
            const upper = Math.min(maxCols, c + 16 + 1);
            let right = false;
            for (let nc = c + 1; nc < upper; nc++) {
                if (mergeMaps.skip.get(`${r},${nc}`) || mergeMaps.anchor.get(`${r},${nc}`)) {
                    break;
                }
                if (!this.isCellEmpty(row[nc])) {
                    break;
                }
                right = true;
            }
            let left = false;
            for (let pc = c - 1; pc >= 0 && pc >= c - 16; pc--) {
                if (mergeMaps.skip.get(`${r},${pc}`) || mergeMaps.anchor.get(`${r},${pc}`)) {
                    break;
                }
                if (!this.isCellEmpty(row[pc])) {
                    break;
                }
                left = true;
            }
            return { left, right };
        }

        effectiveAlign(value, xf) {
            const explicit = xf && xf.alignment && xf.alignment.horizontal;
            if (explicit && explicit !== 'general') {
                return explicit;
            }
            if (typeof value === 'number') {
                return 'right';
            }
            if (typeof value === 'boolean') {
                return 'center';
            }
            return 'left';
        }

        findCfRangeOrigin(ranges, r, c) {
            for (const rng of ranges) {
                if (r >= rng.r1 && r <= rng.r2 && c >= rng.c1 && c <= rng.c2) {
                    return { baseR: rng.r1, baseC: rng.c1 };
                }
            }
            return null;
        }

        evaluateCfRuleMatch(rule, sheet, r, c, baseR, baseC) {
            if (!rule.formulas || !rule.formulas.length) {
                return false;
            }
            try {
                if (rule.type === 'expression') {
                    return Boolean(evaluateFormula(rule.formulas[0], sheet, baseR, baseC, r, c));
                }
                if (rule.type === 'cellIs') {
                    const cellVal = sheet.rows[r] && sheet.rows[r][c];
                    const threshold = evaluateFormula(rule.formulas[0], sheet, baseR, baseC, r, c);
                    const second = rule.formulas[1]
                        ? evaluateFormula(rule.formulas[1], sheet, baseR, baseC, r, c) : undefined;
                    return this.compareCellIs(cellVal, rule.operator, threshold, second);
                }
            }
            catch (ex) {
                return false;
            }
            return false;
        }

        applyCfBlock(cf, sheet, r, c, dxfs, state) {
            const origin = this.findCfRangeOrigin(cf.ranges, r, c);
            if (!origin) {
                return;
            }
            const { baseR, baseC } = origin;
            for (const rule of cf.rules) {
                if (rule.iconSet) {
                    const iconType = this.pickIconForValue(sheet.rows[r] && sheet.rows[r][c], rule.iconSet);
                    if (iconType) {
                        state.icon = {
                            setName: rule.iconSet.setName, type: iconType, showValue: rule.iconSet.showValue
                        };
                    }
                    continue;
                }
                if (rule.type !== 'expression' && rule.type !== 'cellIs') {
                    continue;
                }
                const matched = this.evaluateCfRuleMatch(rule, sheet, r, c, baseR, baseC);
                if (matched && rule.dxfId !== null && dxfs[rule.dxfId]) {
                    state.merged = this.mergeDxf(state.merged, dxfs[rule.dxfId]);
                }
                if (matched && rule.stopIfTrue) {
                    return;
                }
            }
        }

        applyConditionalFormatting(baseXf, sheet, r, c, dxfs, cfList) {
            if (!cfList || !cfList.length) {
                return baseXf;
            }
            const state = { merged: baseXf, icon: null };
            for (const cf of cfList) {
                this.applyCfBlock(cf, sheet, r, c, dxfs, state);
            }
            let { merged, icon } = state;
            if (icon && merged === baseXf) {
                merged = Object.assign({}, merged, { __iconSet: icon });
            }
            else if (icon) {
                merged.__iconSet = icon;
            }
            return merged;
        }

        pickIconForValue(value, iconSet) {
            if (typeof value !== 'number') {
                return null;
            }
            const thresholds = iconSet.thresholds || [];
            if (!thresholds.length) {
                return null;
            }
            const nums = thresholds.map(t => parseFloat(t.val) || 0);
            let bucket = 0;
            for (let i = 1; i < thresholds.length; i++) {
                const gte = thresholds[i].gte !== false;
                const passes = gte ? value >= nums[i] : value > nums[i];
                if (passes) {
                    bucket = i;
                }
            }
            if (iconSet.reverse) {
                bucket = thresholds.length - 1 - bucket;
            }
            const palette = this.iconSetPalette(iconSet.setName);
            return palette[bucket] || palette[palette.length - 1];
        }

        iconSetPalette(setName) {
            switch (setName) {
                case '3Arrows':
                case '3ArrowsGray':
                    return ['red', 'yellow', 'green'];
                case '3Symbols':
                case '3Symbols2':
                    return ['red', 'yellow', 'green'];
                case '3TrafficLights1':
                case '3TrafficLights2':
                case '3Signs':
                    return ['red', 'yellow', 'green'];
                case '3Flags':
                    return ['red', 'yellow', 'green'];
                case '4RedToBlack':
                    return ['red', 'orange', 'gray', 'black'];
                case '4Arrows':
                case '4ArrowsGray':
                    return ['red', 'orange', 'lightgreen', 'green'];
                case '5Arrows':
                case '5ArrowsGray':
                    return ['red', 'orange', 'yellow', 'lightgreen', 'green'];
                default:
                    return ['red', 'yellow', 'green'];
            }
        }

        compareCellIs(value, op, t1, t2) {
            const v = typeof value === 'number' ? value : parseFloat(value);
            const a = typeof t1 === 'number' ? t1 : parseFloat(t1);
            const b = t2 === undefined ? undefined : typeof t2 === 'number' ? t2 : parseFloat(t2);
            if (isNaN(v) || isNaN(a)) {
                return false;
            }
            const ops = {
                greaterThan: (x, y) => x > y,
                lessThan: (x, y) => x < y,
                greaterThanOrEqual: (x, y) => x >= y,
                lessThanOrEqual: (x, y) => x <= y,
                equal: (x, y) => x === y,
                notEqual: (x, y) => x !== y,
                between: (x, y, z) => z !== undefined && x >= Math.min(y, z) && x <= Math.max(y, z),
                notBetween: (x, y, z) => z !== undefined && (x < Math.min(y, z) || x > Math.max(y, z))
            };
            const cmp = ops[op];
            return cmp ? cmp(v, a, b) : false;
        }

        mergeDxf(base, dxf) {
            const out = Object.assign({}, base);
            if (dxf.font) {
                out.font = Object.assign({}, base.font || {}, dxf.font);
                if (!dxf.font.color && base.font) {
                    out.font.color = base.font.color;
                }
            }
            if (dxf.fill && dxf.fill.bgColor) {
                out.fill = Object.assign({}, base.fill || {}, dxf.fill);
            }
            if (dxf.alignment) {
                out.alignment = Object.assign({}, base.alignment || {}, dxf.alignment);
            }
            if (dxf.numFmtCode) {
                out.numFmtCode = dxf.numFmtCode;
            }
            return out;
        }

        pickTablePartDxfId(tp, style, r, c) {
            const candidates = this.tablePartCandidateKeys(tp, r, c);
            for (const key of candidates) {
                if (key && style[key] !== undefined) {
                    return style[key];
                }
            }
            return -1;
        }

        tablePartCandidateKeys(tp, r, c) {
            const headerRows = tp.headerRowCount || 0;
            const isHeader = headerRows > 0 && r < tp.r1 + headerRows;
            const isTotals = (tp.totalsRowCount || 0) > 0 && r > tp.r2 - tp.totalsRowCount;
            const isBody = !isHeader && !isTotals;
            const stripeKey = (cond, idx, k0, k1) =>
                isBody && cond ? idx % 2 === 0 ? k0 : k1 : null;
            return [
                isHeader && 'headerRow',
                isTotals && 'totalRow',
                tp.showFirstColumn && c === tp.c1 && 'firstColumn',
                tp.showLastColumn && c === tp.c2 && 'lastColumn',
                stripeKey(tp.showColumnStripes, c - tp.c1, 'firstColumnStripe', 'secondColumnStripe'),
                stripeKey(tp.showRowStripes, r - tp.r1 - headerRows, 'firstRowStripe', 'secondRowStripe')
            ];
        }

        mergeTablePartDxf(xf, dxf) {
            const next = Object.assign({}, xf);
            if ((!xf.fill || !xf.fill.bgColor) && dxf.fill && dxf.fill.bgColor) {
                next.fill = Object.assign({}, dxf.fill);
            }
            if (dxf.font) {
                next.font = Object.assign({}, xf.font || {}, dxf.font);
                if (xf.font) {
                    if (!dxf.font.name) {
                        next.font.name = xf.font.name;
                    }
                    if (dxf.font.size === null || dxf.font.size === undefined) {
                        next.font.size = xf.font.size;
                    }
                }
            }
            return next;
        }

        applyTablePartStyling(xf, sheet, r, c) {
            if (!sheet.tableParts) {
                return xf;
            }
            const dxfs = this.workbook.dxfs || [];
            const tableStyles = this.workbook.tableStyles || {};
            for (const tp of sheet.tableParts) {
                if (r < tp.r1 || r > tp.r2 || c < tp.c1 || c > tp.c2) {
                    continue;
                }
                const style = tableStyles[tp.styleName];
                if (!style) {
                    continue;
                }
                const dxfId = this.pickTablePartDxfId(tp, style, r, c);
                if (dxfId >= 0 && dxfs[dxfId]) {
                    return this.mergeTablePartDxf(xf, dxfs[dxfId]);
                }
                return xf;
            }
            return xf;
        }

        applyAutoFilterFlag(xf, sheet, r, c) {
            const filters = sheet.autoFilters || (sheet.autoFilter ? [sheet.autoFilter] : []);
            for (const af of filters) {
                if (r === af.r1 && c >= af.c1 && c <= af.c2) {
                    return Object.assign({}, xf, { __autoFilter: true });
                }
            }
            return xf;
        }

        isTableCorner(sheet, r, c) {
            if (!sheet.tableParts) {
                return false;
            }
            for (const tp of sheet.tableParts) {
                if (r === tp.r2 && c === tp.c2) {
                    return true;
                }
            }
            return false;
        }

        buildTbodyRow(sheet, r, ctx) {
            const { maxCols, styleTable, mergeMaps, cellStyles, rowHeights, defaultRowPx,
                    dxfs, cfList, opaqueRects, shapeHyperlinkUrls } = ctx;
            const row = sheet.rows[r];
            const styleRow = cellStyles[r] || [];
            const tr = document.createElement('tr');
            const px = this.rowHeightToPx(rowHeights[r]) || defaultRowPx;
            if (px) {
                tr.style.height = `${px}px`;
            }
            const rowHead = document.createElement('th');
            rowHead.textContent = String(r + 1);
            tr.appendChild(rowHead);
            for (let c = 0; c < maxCols; c++) {
                if (mergeMaps.skip.get(`${r},${c}`)) {
                    continue;
                }
                const baseXf = styleTable[styleRow[c] || 0];
                let xf = this.applyConditionalFormatting(baseXf, sheet, r, c, dxfs, cfList);
                xf = this.applyTablePartStyling(xf, sheet, r, c);
                xf = this.applyAutoFilterFlag(xf, sheet, r, c);
                const spill = mergeMaps.anchor.get(`${r},${c}`)
                    ? { left: false, right: false }
                    : this.spillSides(row, c, r, mergeMaps, maxCols);
                const linkUrl = sheet.hyperlinks ? sheet.hyperlinks.get(`${r},${c}`) : undefined;
                const isLink = linkUrl !== undefined;
                let hidden = this.cellCoveredByOpaqueDrawing(sheet, r, c, opaqueRects);
                if (!hidden && isLink && shapeHyperlinkUrls.has(linkUrl)) {
                    hidden = true;
                }
                const td = this.buildCell(
                    row[c], xf, mergeMaps.anchor.get(`${r},${c}`), spill, isLink, hidden, linkUrl
                );
                td.dataset.cellRef = indexToColRef(c) + (r + 1);
                if (this.isTableCorner(sheet, r, c)) {
                    td.classList.add('xlsx-table-corner');
                }
                tr.appendChild(td);
            }
            return tr;
        }

        buildTbody(sheet, maxCols, styleTable, mergeMaps) {
            const tbody = document.createElement('tbody');
            const ctx = {
                maxCols,
                styleTable,
                mergeMaps,
                cellStyles: sheet.cellStyles || [],
                rowHeights: sheet.rowHeights || [],
                defaultRowPx: this.rowHeightToPx(sheet.defaultRowHeight),
                dxfs: this.workbook.dxfs || [],
                cfList: sheet.conditionalFormatting || [],
                opaqueRects: this.collectOpaqueDrawingRects(sheet),
                shapeHyperlinkUrls: this.collectShapeHyperlinkUrls(sheet)
            };
            for (let r = 0; r < sheet.rows.length; r++) {
                tbody.appendChild(this.buildTbodyRow(sheet, r, ctx));
            }
            return tbody;
        }

        groupHasContent(group) {
            if (!group || !group.children) {
                return false;
            }
            for (const c of group.children) {
                if (!c) {
                    continue;
                }
                if (c.kind === 'shape') {
                    const hasFill = c.fill && c.fill.kind !== 'none';
                    const hasText = !!(c.text && c.text.paragraphs
                        && c.text.paragraphs.some((p) => p.runs && p.runs.some((r) => (r.text || '').length)));
                    if (hasFill || hasText) {
                        return true;
                    }
                }
                else if (c.kind === 'picture') {
                    return true;
                }
                else if (c.kind === 'group' && this.groupHasContent(c)) {
                    return true;
                }
            }
            return false;
        }

        collectShapeHyperlinkUrls(sheet) {
            const set = new Set();
            if (!sheet || !sheet.drawings || !sheet.drawings.length) {
                return set;
            }
            const walk = (items) => {
                for (const d of items) {
                    if (!d) {
                        continue;
                    }
                    if (d.hyperlink) {
                        set.add(d.hyperlink);
                    }
                    if (d.children && d.children.length) {
                        walk(d.children);
                    }
                }
            };
            walk(sheet.drawings);
            return set;
        }

        collectOpaqueDrawingRects(sheet) {
            const out = [];
            if (!sheet || !sheet.drawings || !sheet.drawings.length) {
                return out;
            }
            for (const d of sheet.drawings) {
                let qualifies = false;
                if (d.kind === 'shape') {
                    const hasFill = d.fill && d.fill.kind !== 'none';
                    const hasHyperlink = !!d.hyperlink;
                    const hasText = !!(d.text && d.text.paragraphs
                        && d.text.paragraphs.some((p) => p.runs && p.runs.some((r) => (r.text || '').length)));
                    qualifies = hasFill || hasHyperlink || hasText;
                }
                else if (d.kind === 'group' && this.groupHasContent(d)) {
                    qualifies = true;
                }
                if (!qualifies) {
                    continue;
                }
                let rect = this.anchorToRect(d.anchor, sheet);
                if (rect) {
                    rect = this.applyXfrmSizeHint(rect, d);
                    out.push(rect);
                }
            }
            if (!out.length) {
                return out;
            }
            const colX = [HEADER_W];
            const rowY = [HEADER_H];
            const maxCols = sheet.rows.reduce((m, r) => Math.max(m, r.length), 0) + 16;
            for (let c = 0; c < maxCols; c++) {
                colX.push(colX[c] + this.colPx(c, sheet));
            }
            for (let r = 0; r < sheet.rows.length; r++) {
                rowY.push(rowY[r] + this.rowPx(r, sheet));
            }
            out._colX = colX;
            out._rowY = rowY;
            return out;
        }

        cellCoveredByOpaqueDrawing(sheet, r, c, opaqueRects) {
            if (!opaqueRects || !opaqueRects.length) {
                return false;
            }
            const colX = opaqueRects._colX;
            const rowY = opaqueRects._rowY;
            if (!colX || !rowY || c + 1 >= colX.length || r + 1 >= rowY.length) {
                return false;
            }
            const cx = (colX[c] + colX[c + 1]) / 2;
            const cy = (rowY[r] + rowY[r + 1]) / 2;
            for (const dr of opaqueRects) {
                if (cx >= dr.x && cx <= dr.x + dr.w && cy >= dr.y && cy <= dr.y + dr.h) {
                    return true;
                }
            }
            return false;
        }

        renderSheet(idx, contentNode) {
            const sheet = this.workbook.sheets[idx];
            const styleTable = this.workbook.styleTable || [];
            contentNode.replaceChildren();
            contentNode.scrollTop = 0;
            contentNode.scrollLeft = 0;

            if (!sheet || !sheet.rows || !sheet.rows.length) {
                const empty = document.createElement('div');
                empty.className = 'xlsx-empty';
                empty.textContent = 'This sheet is empty';
                contentNode.appendChild(empty);
                this.renderCharts(sheet);
                return;
            }

            const dataCols = sheet.rows.reduce((m, r) => Math.max(m, r.length), 0);
            const declaredCols = sheet.colWidths ? sheet.colWidths.length : 0;
            const maxCols = Math.min(Math.max(dataCols, declaredCols), dataCols + 8);
            const mergeMaps = this.buildMergeMaps(sheet.merges || []);

            const wrap = document.createElement('div');
            wrap.className = 'xlsx-table-wrap';
            if (sheet.showGridLines === false) {
                wrap.classList.add('xlsx-no-gridlines');
            }
            const table = document.createElement('table');
            table.className = 'xlsx-table';
            if (sheet.showGridLines === false) {
                table.classList.add('xlsx-no-gridlines');
            }
            const colgroup = this.buildColgroup(maxCols, sheet, styleTable, mergeMaps);
            table.appendChild(colgroup);
            if (colgroup._totalPx) {
                table.style.width = `${colgroup._totalPx}px`;
            }
            table.appendChild(this.buildHeadRow(maxCols));
            table.appendChild(this.buildTbody(sheet, maxCols, styleTable, mergeMaps));
            wrap.appendChild(table);
            contentNode.appendChild(wrap);

            if (sheet.truncated) {
                const warn = document.createElement('div');
                warn.className = 'xlsx-truncated';
                warn.textContent = `This sheet was truncated to ${
                    MAX_CELLS_PER_SHEET.toLocaleString()
                } cells for preview.`;
                contentNode.appendChild(warn);
            }

            this.renderCharts(sheet, wrap);
            this.renderDrawings(sheet, wrap);
        }

        renderDrawings(sheet, wrap) {
            if (!sheet || !wrap || !sheet.drawings || !sheet.drawings.length) {
                return;
            }
            let maxRight = 0;
            let maxBottom = 0;
            for (const d of sheet.drawings) {
                const node = this.buildDrawing(d, sheet, null);
                if (!node) {
                    continue;
                }
                wrap.appendChild(node);
                const rect = node._drawingRect;
                if (rect) {
                    maxRight = Math.max(maxRight, rect.x + rect.w);
                    maxBottom = Math.max(maxBottom, rect.y + rect.h);
                }
            }
            const curMinW = parseFloat(wrap.style.minWidth) || 0;
            const curMinH = parseFloat(wrap.style.minHeight) || 0;
            if (maxRight + 16 > curMinW) {
                wrap.style.minWidth = `${maxRight + 16}px`;
            }
            if (maxBottom + 16 > curMinH) {
                wrap.style.minHeight = `${maxBottom + 16}px`;
            }
        }

        buildDrawing(drawing, sheet, parentCtx) {
            if (!drawing) {
                return null;
            }
            const rect = this.computeDrawingRect(drawing, sheet, parentCtx);
            if (!rect || rect.w <= 0 || rect.h <= 0) {
                return null;
            }
            if (drawing.kind === 'group') {
                return this.buildGroupNode(drawing, sheet, rect);
            }
            if (drawing.kind === 'picture') {
                return this.buildPictureNode(drawing, rect);
            }
            if (drawing.kind === 'shape') {
                return this.buildShapeNode(drawing, rect);
            }
            if (drawing.kind === 'slicer') {
                return this.buildSlicerNode(drawing, rect);
            }
            return null;
        }

        buildSlicerNode(drawing, rect) {
            const node = document.createElement('div');
            node.className = 'xlsx-drawing xlsx-drawing-slicer';
            node.style.position = 'absolute';
            node.style.left = `${rect.x}px`;
            node.style.top = `${rect.y}px`;
            node.style.width = `${rect.w}px`;
            node.style.height = `${rect.h}px`;
            node.style.boxSizing = 'border-box';
            node.style.pointerEvents = 'none';
            node._drawingRect = rect;

            const header = document.createElement('div');
            header.className = 'xlsx-slicer-header';
            const title = document.createElement('span');
            title.className = 'xlsx-slicer-header-title';
            title.textContent = drawing.caption || drawing.name || 'Slicer';
            header.appendChild(title);
            const actions = document.createElement('span');
            actions.className = 'xlsx-slicer-header-actions';
            actions.insertAdjacentHTML('beforeend',
                                       '<svg viewBox="0 0 16 16" aria-hidden="true">'
                + '<rect x="2" y="2" width="5" height="5" fill="none" stroke="currentColor" stroke-width="1"/>'
                + '<rect x="9" y="2" width="5" height="5" fill="none" stroke="currentColor" stroke-width="1"/>'
                + '<rect x="2" y="9" width="5" height="5" fill="none" stroke="currentColor" stroke-width="1"/>'
                + '<rect x="9" y="9" width="5" height="5" fill="none" stroke="currentColor" stroke-width="1"/>'
                + '</svg>');
            actions.insertAdjacentHTML('beforeend',
                                       '<svg viewBox="0 0 16 16" aria-hidden="true">'
                + '<path d="M2 3 L14 3 L9.5 8.5 L9.5 14 L6.5 12 L6.5 8.5 Z"'
                + ' fill="none" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/>'
                + '<line x1="11" y1="11" x2="14" y2="14" stroke="#c0504d" stroke-width="1.4"/>'
                + '<line x1="14" y1="11" x2="11" y2="14" stroke="#c0504d" stroke-width="1.4"/>'
                + '</svg>');
            header.appendChild(actions);
            node.appendChild(header);

            const list = document.createElement('div');
            list.className = 'xlsx-slicer-list';
            const items = drawing.items || [];
            for (const it of items) {
                const btn = document.createElement('div');
                btn.className = 'xlsx-slicer-item';
                btn.textContent = it;
                list.appendChild(btn);
            }
            node.appendChild(list);
            return node;
        }

        isSingleColAnchor(anchor) {
            return !!(anchor && anchor.from && anchor.to
                && typeof anchor.from.col === 'number' && typeof anchor.to.col === 'number'
                && anchor.from.col === anchor.to.col);
        }

        isPlainTextboxDrawing(drawing) {
            const flat = !drawing.xfrm
                || typeof drawing.xfrm.rot !== 'number' || drawing.xfrm.rot === 0;
            const noFlip = !(drawing.xfrm && (drawing.xfrm.flipH || drawing.xfrm.flipV));
            return drawing.kind === 'shape'
                && (!drawing.prst || drawing.prst === 'rect' || drawing.prst === 'textNoShape')
                && drawing.text && flat && noFlip;
        }

        hasUsableXfrm(xfrm) {
            return !!(xfrm && xfrm.off && xfrm.ext
                && (xfrm.off.x > 0 || xfrm.off.y > 0)
                && (xfrm.ext.cx > 0 || xfrm.ext.cy > 0));
        }

        maybePreferXfrmRect(r, drawing, sheet) {
            if (!this.isSingleColAnchor(drawing.anchor)
                || !this.isPlainTextboxDrawing(drawing)
                || !this.hasUsableXfrm(drawing.xfrm)) {
                return null;
            }
            const xfrmRect = this.absoluteEmuToRect(drawing.xfrm, sheet);
            if (!xfrmRect) {
                return null;
            }
            if (!r) {
                return xfrmRect;
            }
            const dx = Math.abs(xfrmRect.x - r.x);
            const dy = Math.abs(xfrmRect.y - r.y);
            if ((dx > 5 || dy > 5) && dx < 40 && dy < 40) {
                return { x: xfrmRect.x, y: xfrmRect.y, w: xfrmRect.w, h: xfrmRect.h, sheet: r.sheet };
            }
            return null;
        }

        computeDrawingRect(drawing, sheet, parentCtx) {
            if (parentCtx) {
                return this.mapGroupChildRect(drawing, parentCtx);
            }
            let r = null;
            if (drawing.anchor && drawing.anchor.from) {
                r = this.anchorToRect(drawing.anchor, sheet);
                if (r) {
                    r = this.applyXfrmSizeHint(r, drawing);
                }
            }
            const preferred = this.maybePreferXfrmRect(r, drawing, sheet);
            if (preferred) {
                return preferred;
            }
            return r || this.anchorToRect(drawing.anchor, sheet);
        }

        applyXfrmSizeHint(rect, drawing) {
            if (!rect || !drawing || !drawing.xfrm || !drawing.xfrm.ext) {
                return rect;
            }
            const xext = drawing.xfrm.ext;
            const rotDeg = typeof drawing.xfrm.rot === 'number' ? drawing.xfrm.rot : 0;
            const normRot = (rotDeg % 360 + 360) % 360;
            const isQuarter = Math.abs(normRot - 90) < 0.5 || Math.abs(normRot - 270) < 0.5;
            const wantW = Math.max(1, Math.round((isQuarter ? xext.cy : xext.cx) / EMU_PER_PX));
            const wantH = Math.max(1, Math.round((isQuarter ? xext.cx : xext.cy) / EMU_PER_PX));
            const wRatio = rect.w / wantW;
            const hRatio = rect.h / wantH;
            if (wRatio > 0.5 && wRatio < 2 && hRatio > 0.5 && hRatio < 2) {
                return rect;
            }
            const cx = rect.x + rect.w / 2;
            const cy = rect.y + rect.h / 2;
            return {
                x: Math.round(cx - wantW / 2),
                y: Math.round(cy - wantH / 2),
                w: wantW,
                h: wantH,
                sheet: rect.sheet
            };
        }

        absoluteEmuToRect(xfrm, sheet) {
            const {off, ext} = xfrm;
            const x = HEADER_W + off.x / EMU_PER_PX;
            const y = HEADER_H + off.y / EMU_PER_PX;
            const w = ext.cx / EMU_PER_PX;
            const h = ext.cy / EMU_PER_PX;
            return {
                x: Math.round(x),
                y: Math.round(y),
                w: Math.max(1, Math.round(w)),
                h: Math.max(1, Math.round(h)),
                sheet
            };
        }

        anchorToRect(anchor, sheet) {
            if (!anchor) {
                return null;
            }
            if (!anchor.from && anchor.pos) {
                const x = HEADER_W + anchor.pos.x / EMU_PER_PX;
                const y = HEADER_H + anchor.pos.y / EMU_PER_PX;
                const w = anchor.ext ? anchor.ext.cx / EMU_PER_PX : 120;
                const h = anchor.ext ? anchor.ext.cy / EMU_PER_PX : 60;
                return {
                    x: Math.round(x),
                    y: Math.round(y),
                    w: Math.max(1, Math.round(w)),
                    h: Math.max(1, Math.round(h)),
                    sheet
                };
            }
            const from = anchor.from || { col: 0, row: 0, colOff: 0, rowOff: 0 };
            const fromX = this.anchorPointX(from, sheet);
            const fromY = this.anchorPointY(from, sheet);
            const x = fromX;
            const y = fromY;
            let w;
            let h;
            if (anchor.to) {
                const endX = this.anchorPointX(anchor.to, sheet);
                w = endX - x;
                const endY = this.anchorPointY(anchor.to, sheet);
                h = endY - y;
            }
            else if (anchor.ext) {
                w = anchor.ext.cx / EMU_PER_PX;
                h = anchor.ext.cy / EMU_PER_PX;
            }
            else {
                w = 120;
                h = 60;
            }
            return {
                x: Math.round(x),
                y: Math.round(y),
                w: Math.max(1, Math.round(w)),
                h: Math.max(1, Math.round(h)),
                sheet
            };
        }

        anchorPointX(pt, sheet) {
            let col = pt.col || 0;
            let colOff = pt.colOff || 0;
            while (true) {
                const excelPx = this.excelStoredColPx(col, sheet);
                if (excelPx <= 0) {
                    break;
                }
                const excelEmu = excelPx * EMU_PER_PX;
                if (colOff > excelEmu + EMU_PER_PX) {
                    colOff -= excelEmu;
                    col += 1;
                    continue;
                }
                break;
            }
            let x = HEADER_W;
            for (let c = 0; c < col; c++) {
                x += this.colPx(c, sheet);
            }
            x += colOff / EMU_PER_PX;
            return x;
        }

        anchorPointY(pt, sheet) {
            let y = HEADER_H;
            for (let r = 0; r < (pt.row || 0); r++) {
                y += this.rowPx(r, sheet);
            }
            y += (pt.rowOff || 0) / EMU_PER_PX;
            return y;
        }

        excelStoredColPx(c, sheet) {
            const specific = sheet.colWidths && sheet.colWidths[c];
            const w = specific || sheet.defaultColWidth;
            if (!w) {
                return 0;
            }
            return this.colWidthToPx(w) || 0;
        }

        mapGroupChildRect(drawing, parentCtx) {
            if (!drawing.xfrm || !drawing.xfrm.off || !drawing.xfrm.ext) {
                return null;
            }
            const {off, ext, rot} = drawing.xfrm;
            const sx = parentCtx.scaleX;
            const sy = parentCtx.scaleY;
            const preW = ext.cx * sx;
            const preH = ext.cy * sy;
            const rotDeg = typeof rot === 'number' ? rot : 0;
            const normRot = (rotDeg % 360 + 360) % 360;
            const isQuarter = Math.abs(normRot - 90) < 0.5 || Math.abs(normRot - 270) < 0.5;
            const visW = isQuarter ? preH : preW;
            const visH = isQuarter ? preW : preH;
            const cxLocal = parentCtx.originX + (off.x - parentCtx.chOffX) * sx + preW / 2;
            const cyLocal = parentCtx.originY + (off.y - parentCtx.chOffY) * sy + preH / 2;
            return {
                x: Math.round(cxLocal - visW / 2),
                y: Math.round(cyLocal - visH / 2),
                w: Math.max(1, Math.round(visW)),
                h: Math.max(1, Math.round(visH)),
                sheet: parentCtx.sheet
            };
        }

        buildGroupNode(drawing, sheet, rect) {
            const node = document.createElement('div');
            node.className = 'xlsx-drawing xlsx-drawing-group';
            node.style.position = 'absolute';
            node.style.left = `${rect.x}px`;
            node.style.top = `${rect.y}px`;
            node.style.width = `${rect.w}px`;
            node.style.height = `${rect.h}px`;
            node.style.pointerEvents = 'none';
            this.applyXfrmTransform(node, drawing.xfrm);
            node._drawingRect = rect;
            const xfrm = drawing.xfrm || {};
            const chExt = xfrm.chExt || xfrm.ext || { cx: 1, cy: 1 };
            const chOff = xfrm.chOff || { x: 0, y: 0 };
            const scaleEmuToPxX = rect.w / Math.max(1, chExt.cx);
            const scaleEmuToPxY = rect.h / Math.max(1, chExt.cy);
            const childCtx = {
                originX: 0,
                originY: 0,
                chOffX: chOff.x,
                chOffY: chOff.y,
                scaleX: scaleEmuToPxX,
                scaleY: scaleEmuToPxY,
                sheet
            };
            const children = drawing.children || [];
            for (const child of children) {
                const childNode = this.buildDrawing(child, sheet, childCtx);
                if (childNode) {
                    node.appendChild(childNode);
                }
            }
            return node;
        }

        buildPictureNode(drawing, rect) {
            const node = document.createElement('div');
            node.className = 'xlsx-drawing xlsx-drawing-picture';
            node.style.position = 'absolute';
            node.style.left = `${rect.x}px`;
            node.style.top = `${rect.y}px`;
            node.style.width = `${rect.w}px`;
            node.style.height = `${rect.h}px`;
            node.style.overflow = 'hidden';
            node.style.pointerEvents = 'none';
            this.applyXfrmTransform(node, drawing.xfrm);
            this.applyShapeLine(node, drawing.line);
            node._drawingRect = rect;
            if (drawing.dataUrl) {
                const img = document.createElement('img');
                img.src = drawing.dataUrl;
                img.alt = drawing.descr || drawing.name || '';
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'contain';
                img.style.display = 'block';
                node.appendChild(img);
            }
            return node;
        }

        rotatedDrawRect(rect, xfrm) {
            const rotDeg = xfrm && typeof xfrm.rot === 'number' ? xfrm.rot : 0;
            const normRot = (rotDeg % 360 + 360) % 360;
            const isQuarter = Math.abs(normRot - 90) < 0.5 || Math.abs(normRot - 270) < 0.5;
            if (!isQuarter || rect.w === rect.h) {
                return rect;
            }
            const cx = rect.x + rect.w / 2;
            const cy = rect.y + rect.h / 2;
            return {
                x: Math.round(cx - rect.h / 2),
                y: Math.round(cy - rect.w / 2),
                w: Math.max(1, Math.round(rect.h)),
                h: Math.max(1, Math.round(rect.w)),
                sheet: rect.sheet
            };
        }

        applyShapeGeometry(node, drawing, drawRect) {
            const prst = drawing.prst || 'rect';
            const def = drawing.custDef || PRESET_SHAPES[prst];
            if (prst === 'line' || prst === 'straightConnector1') {
                this.applyLineShape(node, drawing, drawRect);
                return null;
            }
            if (def) {
                this.applyPresetShape(node, drawing, def, drawRect);
                return presetTextRect(def, drawRect.w, drawRect.h, drawing.adj);
            }
            this.applyShapeFill(node, drawing.fill);
            this.applyShapeLine(node, drawing.line);
            if (!drawing.fill && !drawing.line && prst !== 'textNoShape') {
                node.style.borderStyle = 'solid';
                node.style.borderWidth = '1px';
                node.style.borderColor = '#888';
            }
            return null;
        }

        buildShapeNode(drawing, rect) {
            const node = document.createElement('div');
            const prstSafe = /^[A-Za-z][\dA-Za-z]*$/.test(drawing.prst || '')
                ? drawing.prst : 'rect';
            node.className = `xlsx-drawing xlsx-drawing-shape xlsx-drawing-prst-${prstSafe}`;
            const drawRect = this.rotatedDrawRect(rect, drawing.xfrm);
            Object.assign(node.style, {
                position: 'absolute',
                left: `${drawRect.x}px`,
                top: `${drawRect.y}px`,
                width: `${drawRect.w}px`,
                height: `${drawRect.h}px`,
                boxSizing: 'border-box',
                pointerEvents: 'none'
            });
            this.applyXfrmTransform(node, drawing.xfrm);
            node._drawingRect = rect;
            const textRect = this.applyShapeGeometry(node, drawing, drawRect);
            if (drawing.text) {
                node.appendChild(this.buildShapeTextBlock(drawing.text, drawing.prst, textRect, drawRect));
            }
            const prst = drawing.prst || 'rect';
            if (drawing.hyperlink) {
                this.applyShapeHyperlink(node, drawing.hyperlink, drawing.descr || drawing.name);
            }
            else if (prst === 'downArrowCallout' || prst === 'upArrowCallout') {
                this.applyScrollHotspot(node, prst, drawing.descr || drawing.name);
            }
            return node;
        }

        applyScrollHotspot(node, prst, title) {
            const overlay = document.createElement('button');
            overlay.type = 'button';
            overlay.className = 'xlsx-shape-scroll-hotspot';
            overlay.setAttribute('aria-label', title || (prst === 'upArrowCallout' ? 'Back to top' : 'Scroll down'));
            if (title) {
                overlay.title = title;
            }
            overlay.style.position = 'absolute';
            overlay.style.left = '0';
            overlay.style.top = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.background = 'transparent';
            overlay.style.border = '0';
            overlay.style.padding = '0';
            overlay.style.margin = '0';
            overlay.style.cursor = 'pointer';
            overlay.style.zIndex = '2';
            overlay.style.pointerEvents = 'auto';
            overlay.addEventListener('click', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                const scroller = document.getElementById('xlsx-content')
                    || document.scrollingElement
                    || document.documentElement
                    || document.body;
                if (!scroller) {
                    return;
                }
                const dy = (scroller.clientHeight || window.innerHeight || 600) - 80;
                const label = (title || '').toLowerCase();
                if (prst === 'upArrowCallout' || /back\s*to\s*top|back to top/.test(label)) {
                    scroller.scrollTo({ top: 0, behavior: 'smooth' });
                }
                else {
                    scroller.scrollBy({ top: dy, behavior: 'smooth' });
                }
            });
            node.appendChild(overlay);
        }

        applyShapeHyperlink(node, url, title) {
            if (!url) {
                return;
            }
            const internal = parseInternalHyperlink(url);
            const safeHref = safeHrefForHyperlink(url);
            if (!internal && !safeHref) {
                return;
            }
            const link = document.createElement('a');
            if (internal) {
                link.href = '#';
                link.addEventListener('click', (ev) => this.handleInternalLink(ev, internal));
            }
            else {
                link.href = safeHref;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.addEventListener('click', (ev) => this.handleExternalLink(ev, safeHref));
            }
            if (title) {
                link.title = title;
            }
            link.style.position = 'absolute';
            link.style.left = '0';
            link.style.top = '0';
            link.style.width = '100%';
            link.style.height = '100%';
            link.style.zIndex = '2';
            link.style.cursor = 'pointer';
            link.style.pointerEvents = 'auto';
            link.setAttribute('aria-label', title || url);
            node.style.pointerEvents = 'auto';
            node.appendChild(link);
        }

        applyXfrmTransform(node, xfrm) {
            if (!xfrm) {
                return;
            }
            const parts = [];
            if (xfrm.rot) {
                parts.push(`rotate(${xfrm.rot}deg)`);
            }
            if (xfrm.flipH) {
                parts.push('scaleX(-1)');
            }
            if (xfrm.flipV) {
                parts.push('scaleY(-1)');
            }
            if (parts.length) {
                node.style.transformOrigin = 'center center';
                node.style.transform = parts.join(' ');
            }
        }

        applyLineShape(node, drawing, rect) {
            node.style.background = 'transparent';
            const svg = document.createElementNS(SVG_NS, 'svg');
            const vbW = Math.max(1, rect.w);
            const vbH = Math.max(1, rect.h);
            svg.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);
            svg.setAttribute('preserveAspectRatio', 'none');
            svg.style.position = 'absolute';
            svg.style.left = '0';
            svg.style.top = '0';
            svg.style.width = '100%';
            svg.style.height = '100%';
            svg.style.overflow = 'visible';
            const lineSpec = drawing.line;
            const stroke = this.resolveShapeStrokeColor(lineSpec) || '#000';
            const strokeWidth = lineSpec ? Math.max(1, lineSpec.width || 1) : 1;
            const markerIds = this.ensureLineMarkers(svg, lineSpec, stroke);
            const el = document.createElementNS(SVG_NS, 'line');
            el.setAttribute('x1', '0');
            el.setAttribute('y1', '0');
            el.setAttribute('x2', String(vbW));
            el.setAttribute('y2', String(vbH));
            el.setAttribute('stroke', stroke);
            el.setAttribute(STROKE_WIDTH_ATTR, String(strokeWidth));
            el.setAttribute('vector-effect', NON_SCALING_STROKE);
            el.setAttribute('stroke-linecap', 'round');
            if (markerIds.headId) {
                el.setAttribute('marker-start', `url(#${markerIds.headId})`);
            }
            if (markerIds.tailId) {
                el.setAttribute('marker-end', `url(#${markerIds.tailId})`);
            }
            svg.appendChild(el);
            node.appendChild(svg);
        }

        ensureLineMarkers(svg, lineSpec, stroke) {
            const out = { headId: '', tailId: '' };
            if (!lineSpec || !lineSpec.headEnd && !lineSpec.tailEnd) {
                return out;
            }
            const defs = document.createElementNS(SVG_NS, 'defs');
            const uid = `xlmk${Math.random().toString(36).slice(2, 8)}`;
            const sizeMap = { sm: 4, med: 6, lg: 9 };
            const makeMarker = (end, isStart) => {
                if (!end) {
                    return '';
                }
                const w = sizeMap[end.w] || sizeMap.med;
                const len = sizeMap[end.len] || sizeMap.med;
                const id = `${uid}${isStart ? 's' : 'e'}`;
                const marker = document.createElementNS(SVG_NS, 'marker');
                marker.setAttribute('id', id);
                marker.setAttribute('viewBox', `0 0 ${len} ${w}`);
                marker.setAttribute('refX', isStart ? '0' : String(len));
                marker.setAttribute('refY', String(w / 2));
                marker.setAttribute('markerUnits', 'strokeWidth');
                marker.setAttribute('markerWidth', String(len));
                marker.setAttribute('markerHeight', String(w));
                marker.setAttribute('orient', 'auto');
                let shape;
                if (end.type === 'stealth') {
                    shape = document.createElementNS(SVG_NS, 'polygon');
                    shape.setAttribute('points', isStart
                        ? `${len},0 0,${w / 2} ${len},${w} ${len / 2},${w / 2}`
                        : `0,0 ${len},${w / 2} 0,${w} ${len / 2},${w / 2}`);
                    shape.setAttribute('fill', stroke);
                }
                else if (end.type === 'diamond') {
                    shape = document.createElementNS(SVG_NS, 'polygon');
                    shape.setAttribute('points', `${len / 2},0 ${len},${w / 2} ${len / 2},${w} 0,${w / 2}`);
                    shape.setAttribute('fill', stroke);
                }
                else if (end.type === 'oval') {
                    shape = document.createElementNS(SVG_NS, 'ellipse');
                    shape.setAttribute('cx', String(len / 2));
                    shape.setAttribute('cy', String(w / 2));
                    shape.setAttribute('rx', String(len / 2));
                    shape.setAttribute('ry', String(w / 2));
                    shape.setAttribute('fill', stroke);
                }
                else {
                    shape = document.createElementNS(SVG_NS, 'polygon');
                    shape.setAttribute('points', isStart
                        ? `${len},0 0,${w / 2} ${len},${w}`
                        : `0,0 ${len},${w / 2} 0,${w}`);
                    shape.setAttribute('fill', stroke);
                }
                marker.appendChild(shape);
                defs.appendChild(marker);
                return id;
            };
            out.headId = makeMarker(lineSpec.headEnd, true);
            out.tailId = makeMarker(lineSpec.tailEnd, false);
            if (defs.childNodes.length) {
                svg.appendChild(defs);
            }
            return out;
        }

        resolvePathFill(p, baseFill) {
            const SHADES = {
                darken: -0.15, darkenLess: -0.08, lighten: 0.15, lightenLess: 0.08
            };
            if (p.fill === 'none') {
                return 'none';
            }
            if (Object.prototype.hasOwnProperty.call(SHADES, p.fill)) {
                return this.shadeColor(baseFill, SHADES[p.fill]) || baseFill || 'none';
            }
            return baseFill || 'none';
        }

        applyPresetPathStroke(el, p, baseFill, baseStroke, strokeWidth, markerIds) {
            if (p.stroke === 'false') {
                el.setAttribute('stroke', 'none');
                return;
            }
            if (!(baseStroke && strokeWidth > 0)) {
                return;
            }
            el.setAttribute('stroke', baseStroke);
            el.setAttribute(STROKE_WIDTH_ATTR, String(strokeWidth));
            el.setAttribute('vector-effect', NON_SCALING_STROKE);
            el.setAttribute('stroke-linejoin', 'round');
            el.setAttribute('stroke-linecap', 'round');
            if (p.fill === 'none' || !baseFill) {
                if (markerIds.headId) {
                    el.setAttribute('marker-start', `url(#${markerIds.headId})`);
                }
                if (markerIds.tailId) {
                    el.setAttribute('marker-end', `url(#${markerIds.tailId})`);
                }
            }
        }

        applyPresetShape(node, drawing, def, rect) {
            node.style.background = 'transparent';
            const svg = document.createElementNS(SVG_NS, 'svg');
            const vbW = Math.max(1, rect.w);
            const vbH = Math.max(1, rect.h);
            svg.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);
            svg.setAttribute('preserveAspectRatio', 'none');
            Object.assign(svg.style, {
                position: 'absolute', left: '0', top: '0',
                width: '100%', height: '100%', zIndex: '0', overflow: 'visible'
            });
            const paths = presetBuildPaths(def, vbW, vbH, drawing.adj);
            const fillSpec = drawing.fill;
            const lineSpec = drawing.line;
            const baseFill = this.resolveShapeFillColor(fillSpec);
            let baseStroke = this.resolveShapeStrokeColor(lineSpec);
            let strokeWidth = lineSpec ? Math.max(1, lineSpec.width || 1) : 0;
            if (!fillSpec && !lineSpec && !baseFill && !baseStroke) {
                baseStroke = '#888';
                strokeWidth = 1;
            }
            const markerIds = baseStroke
                ? this.ensureLineMarkers(svg, lineSpec, baseStroke)
                : { headId: '', tailId: '' };
            for (const p of paths) {
                const el = document.createElementNS(SVG_NS, 'path');
                el.setAttribute('d', p.d);
                el.setAttribute('fill-rule', 'evenodd');
                el.setAttribute('fill', this.resolvePathFill(p, baseFill));
                this.applyPresetPathStroke(el, p, baseFill, baseStroke, strokeWidth, markerIds);
                svg.appendChild(el);
            }
            node.appendChild(svg);
        }

        resolveShapeFillColor(fill) {
            if (!fill || fill.kind === 'none') {
                return '';
            }
            if (fill.kind === 'solid') {
                return safeCssColor(fill.color);
            }
            if (fill.kind === 'gradient' && fill.stops && fill.stops.length) {
                return safeCssColor(fill.stops[0].color);
            }
            return '';
        }

        resolveShapeStrokeColor(line) {
            if (!line) {
                return '';
            }
            return safeCssColor(line.color);
        }

        shadeColor(hex, factor) {
            if (!hex || typeof hex !== 'string' || hex.length !== 7 || hex[0] !== '#') {
                return '';
            }
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            const adjust = (v) => {
                if (factor < 0) {
                    return Math.round(v * (1 + factor));
                }
                return Math.round(v + (255 - v) * factor);
            };
            return `#${byteToHex(adjust(r))}${byteToHex(adjust(g))}${byteToHex(adjust(b))}`;
        }

        applyShapeFill(node, fill) {
            if (!fill || fill.kind === 'none') {
                return;
            }
            if (fill.kind === 'solid') {
                const c = safeCssColor(fill.color);
                if (c) {
                    node.style.background = c;
                }
            }
            else if (fill.kind === 'gradient') {
                const stops = fill.stops || [];
                if (stops.length === 1) {
                    const c = safeCssColor(stops[0].color);
                    if (c) {
                        node.style.background = c;
                    }
                    return;
                }
                if (stops.length >= 2) {
                    const parts = [];
                    for (const s of stops) {
                        const c = safeCssColor(s.color);
                        if (c) {
                            parts.push(`${c} ${Math.round(s.pos)}%`);
                        }
                    }
                    if (parts.length >= 2) {
                        node.style.background = `linear-gradient(180deg,${parts.join(',')})`;
                    }
                }
            }
        }

        applyShapeLine(node, line) {
            if (!line) {
                return;
            }
            const c = safeCssColor(line.color);
            if (!c) {
                return;
            }
            node.style.borderStyle = 'solid';
            node.style.borderWidth = `${line.width}px`;
            node.style.borderColor = c;
        }

        computeTextInsetPct(textRect, shapeRect) {
            if (!textRect || !shapeRect || shapeRect.w <= 0 || shapeRect.h <= 0) {
                return { left: 0, top: 0, right: 0, bottom: 0 };
            }
            const l = Math.max(0, Math.min(100, textRect.l / shapeRect.w * 100));
            const t = Math.max(0, Math.min(100, textRect.t / shapeRect.h * 100));
            const r = Math.max(0, Math.min(100, 100 - textRect.r / shapeRect.w * 100));
            const b = Math.max(0, Math.min(100, 100 - textRect.b / shapeRect.h * 100));
            return { left: l, top: t, right: r, bottom: b };
        }

        buildShapeTextBlock(text, prst, textRect, shapeRect) {
            const wrap = document.createElement('div');
            wrap.className = 'xlsx-drawing-text';
            wrap.style.position = 'absolute';
            const insetPct = this.computeTextInsetPct(textRect, shapeRect);
            wrap.style.left = `${insetPct.left}%`;
            wrap.style.top = `${insetPct.top}%`;
            wrap.style.right = `${insetPct.right}%`;
            wrap.style.bottom = `${insetPct.bottom}%`;
            wrap.style.zIndex = '1';
            wrap.style.padding = '4px 8px';
            wrap.style.boxSizing = 'border-box';
            wrap.style.display = 'flex';
            wrap.style.flexDirection = 'column';
            wrap.style.whiteSpace = 'pre-wrap';
            wrap.style.wordWrap = 'normal';
            wrap.style.overflowWrap = 'normal';
            const horzClip = text.horzOverflow === 'clip';
            const vertClip = text.vertOverflow === 'clip';
            if (text.wrap === 'none' || horzClip) {
                wrap.style.whiteSpace = 'pre';
            }
            if (horzClip && vertClip) {
                wrap.style.overflow = 'hidden';
            }
            else if (horzClip) {
                wrap.style.overflowX = 'hidden';
                wrap.style.overflowY = 'visible';
            }
            else if (vertClip) {
                wrap.style.overflowY = 'hidden';
                wrap.style.overflowX = 'visible';
            }
            else {
                wrap.style.overflow = 'visible';
            }
            if (text.anchor === 'ctr') {
                wrap.style.justifyContent = 'center';
            }
            else if (text.anchor === 'b') {
                wrap.style.justifyContent = 'flex-end';
            }
            else {
                wrap.style.justifyContent = 'flex-start';
            }
            if (text.defaultColor) {
                const defC = safeCssColor(text.defaultColor);
                if (defC) {
                    wrap.style.color = defC;
                }
            }
            const paragraphs = text.paragraphs || [];
            for (const p of paragraphs) {
                wrap.appendChild(this.buildShapeParagraph(p));
            }
            return wrap;
        }

        buildShapeParagraph(p) {
            const pEl = document.createElement('div');
            pEl.className = 'xlsx-drawing-p';
            pEl.style.lineHeight = '1.2';
            if (p.algn === 'ctr') {
                pEl.style.textAlign = 'center';
            }
            else if (p.algn === 'r') {
                pEl.style.textAlign = 'right';
            }
            else if (p.algn === 'just') {
                pEl.style.textAlign = 'justify';
            }
            else {
                pEl.style.textAlign = 'left';
            }
            const runs = p.runs || [];
            if (!runs.length) {
                pEl.appendChild(document.createTextNode('\u00A0'));
                return pEl;
            }
            for (const r of runs) {
                if (r.text === '\n') {
                    pEl.appendChild(document.createElement('br'));
                    continue;
                }
                const span = document.createElement('span');
                span.textContent = r.text || '';
                this.applyFontStyle(span, r.font);
                pEl.appendChild(span);
            }
            return pEl;
        }

        renderCharts(sheet, wrap) {
            if (!sheet || !sheet.charts || !sheet.charts.length || !wrap) {
                return;
            }
            let maxRight = 0;
            let maxBottom = 0;
            for (const chart of sheet.charts) {
                const pos = this.computeChartPosition(chart, sheet);
                maxRight = Math.max(maxRight, pos.x + pos.w);
                maxBottom = Math.max(maxBottom, pos.y + pos.h);
                wrap.appendChild(this.buildChartCard(chart, pos));
            }
            if (maxRight > 0) {
                wrap.style.minWidth = `${maxRight + 16}px`;
            }
            if (maxBottom > 0) {
                wrap.style.minHeight = `${maxBottom + 16}px`;
            }
        }

        applyChartCardBackground(card, chartBackground) {
            if (!chartBackground) {
                return;
            }
            const bg = safeCssColor(chartBackground.color);
            if (bg) {
                card.style.background = bg;
            }
            else {
                card.style.background = 'transparent';
                card.style.boxShadow = 'none';
            }
            const ln = chartBackground.line;
            const ln2 = safeCssColor(ln && ln.color);
            if (ln2) {
                const w = Math.max(1, Math.round(safeNum(ln.width, 1, 20) || 1));
                card.style.borderStyle = this.dashToBorderStyle(ln.dash);
                card.style.borderWidth = `${w}px`;
                card.style.borderColor = ln2;
            }
            else if (!bg) {
                card.style.border = 'none';
            }
        }

        appendChartTitle(card, title) {
            if (!title || !title.text || title.hidden) {
                return;
            }
            const h = document.createElement('div');
            h.className = 'xlsx-chart-title';
            h.textContent = title.text;
            this.applyFontStyle(h, title.font);
            const x = title.layout && title.layout.x;
            let align;
            if (typeof x !== 'number') {
                align = 'center';
            }
            else if (x < 0.25) {
                align = 'flex-start';
            }
            else if (x > 0.75) {
                align = 'flex-end';
            }
            else {
                align = 'center';
            }
            h.style.alignSelf = align;
            card.appendChild(h);
        }

        buildChartBody(chart, legendPos, pos) {
            const body = document.createElement('div');
            body.className = 'xlsx-chart-body';
            body.style.flexDirection = legendPos === 't' || legendPos === 'b' ? 'column' : 'row';
            const svgWrap = document.createElement('div');
            svgWrap.className = 'xlsx-chart-svg-wrap';
            const plotBg = safeCssColor(chart.plotBackground && chart.plotBackground.color);
            if (plotBg) {
                svgWrap.style.background = plotBg;
            }
            const svgSize = this.estimateChartBodySize(chart, legendPos, pos);
            const svg = this.renderChartSvg(chart, svgSize);
            if (svg) {
                svgWrap.appendChild(svg);
            }
            else {
                const note = document.createElement('div');
                note.className = 'xlsx-chart-note';
                note.textContent = `Chart type "${chart.type}" is not supported in preview.`;
                svgWrap.appendChild(note);
            }
            return { body, svgWrap, svg };
        }

        buildChartLegend(chart, svg, legendPos) {
            let legend = null;
            if (legendPos && svg && svg._pieLegend) {
                legend = svg._pieLegend;
            }
            else if (legendPos && chart.series.length) {
                legend = this.renderLegend(chart);
            }
            if (legend) {
                this.applyFontStyle(legend, chart.legend && chart.legend.font);
                legend.classList.add(`xlsx-chart-legend-${legendPos}`);
            }
            return legend;
        }

        buildChartCard(chart, pos) {
            const card = document.createElement('div');
            card.className = 'xlsx-chart-overlay';
            card.style.left = `${pos.x}px`;
            card.style.top = `${pos.y}px`;
            card.style.width = `${pos.w}px`;
            card.style.height = `${pos.h}px`;
            this.applyChartCardBackground(card, chart.chartBackground);
            this.appendChartTitle(card, chart.title);

            const legendPos = chart.legend && chart.legend.show ? chart.legend.position : null;
            const isCornerLegend = legendPos === 'tr' || legendPos === 'br'
                || legendPos === 'tl' || legendPos === 'bl';
            const { body, svgWrap, svg } = this.buildChartBody(chart, legendPos, pos);
            const legend = this.buildChartLegend(chart, svg, legendPos);

            if ((legendPos === 't' || legendPos === 'l') && legend) {
                body.appendChild(legend);
                body.appendChild(svgWrap);
            }
            else if (isCornerLegend) {
                body.appendChild(svgWrap);
            }
            else {
                body.appendChild(svgWrap);
                if (legend) {
                    body.appendChild(legend);
                }
            }
            card.appendChild(body);
            if (isCornerLegend && legend) {
                card.appendChild(legend);
            }
            return card;
        }

        applyFontStyle(el, font) {
            if (!el || !font) {
                return;
            }
            if (font.size) {
                el.style.fontSize = `${font.size}pt`;
            }
            if (font.color) {
                el.style.color = font.color;
            }
            if (font.bold) {
                el.style.fontWeight = 'bold';
            }
            if (font.italic) {
                el.style.fontStyle = 'italic';
            }
            if (font.name) {
                const fam = safeFontFamily(font.name);
                if (fam) {
                    el.style.fontFamily = `"${fam}",sans-serif`;
                }
            }
            const td = [];
            if (font.underline) {
                td.push('underline');
            }
            if (font.strike) {
                td.push('line-through');
            }
            if (td.length) {
                el.style.textDecoration = td.join(' ');
            }
        }

        dashToBorderStyle(dash) {
            if (dash === 'dash' || dash === 'lgDash' || dash === 'sysDash') {
                return 'dashed';
            }
            if (dash === 'dot' || dash === 'sysDot') {
                return 'dotted';
            }
            return 'solid';
        }

        dashArrayFor(dash, strokeWidth = 2) {
            const w = strokeWidth;
            switch (dash) {
                case 'dash': return `${4 * w},${3 * w}`;
                case 'lgDash': return `${8 * w},${3 * w}`;
                case 'dashDot': return `${4 * w},${3 * w},${w},${3 * w}`;
                case 'lgDashDot': return `${8 * w},${3 * w},${w},${3 * w}`;
                case 'lgDashDotDot': return `${8 * w},${3 * w},${w},${3 * w},${w},${3 * w}`;
                case 'dot': case 'sysDot': return `${w},${2 * w}`;
                case 'sysDash': return `${3 * w},${w}`;
                case 'sysDashDot': return `${3 * w},${w},${w},${w}`;
                case 'sysDashDotDot': return `${3 * w},${w},${w},${w},${w},${w}`;
                default: return '';
            }
        }

        colPx(c, sheet) {
            const eff = sheet.effectiveColWidthsPx && sheet.effectiveColWidthsPx[c];
            if (eff) {
                return eff;
            }
            const specific = sheet.colWidths && sheet.colWidths[c];
            if (specific) {
                return this.colWidthToPx(specific);
            }
            return this.sheetDefaultColPx(sheet);
        }

        rowPx(r, sheet) {
            const specific = sheet.rowHeights && sheet.rowHeights[r];
            if (specific) {
                return this.rowHeightToPx(specific);
            }
            return this.rowHeightToPx(sheet.defaultRowHeight) || 20;
        }

        computeChartPosition(chart, sheet) {
            const anchor = chart.anchor || {};
            const from = anchor.from || { col: 0, row: 0, colOff: 0, rowOff: 0 };
            const {to} = anchor;
            const {ext} = anchor;

            let x = HEADER_W;
            for (let c = 0; c < from.col; c++) {
                x += this.colPx(c, sheet);
            }
            x += from.colOff / EMU_PER_PX;

            let y = HEADER_H;
            for (let r = 0; r < from.row; r++) {
                y += this.rowPx(r, sheet);
            }
            y += from.rowOff / EMU_PER_PX;

            let w;
            let h;
            if (to) {
                let endX = HEADER_W;
                for (let c = 0; c < to.col; c++) {
                    endX += this.colPx(c, sheet);
                }
                endX += to.colOff / EMU_PER_PX;
                w = endX - x;
                let endY = HEADER_H;
                for (let r = 0; r < to.row; r++) {
                    endY += this.rowPx(r, sheet);
                }
                endY += to.rowOff / EMU_PER_PX;
                h = endY - y;
            }
            else if (ext) {
                w = ext.cx / EMU_PER_PX;
                h = ext.cy / EMU_PER_PX;
            }
            else {
                w = 480;
                h = 280;
            }
            return {
                x: Math.round(x),
                y: Math.round(y),
                w: Math.max(120, Math.round(w)),
                h: Math.max(80, Math.round(h))
            };
        }

        chartColor(chart, si, pi) {
            const palette = this.chartPalette();
            const series = chart.series[si];
            if (series) {
                if (typeof pi === 'number' && series.pointColors && series.pointColors[pi]) {
                    return series.pointColors[pi];
                }
                if (chart.varyColors && typeof pi === 'number') {
                    return palette[pi % palette.length];
                }
                if (series.color) {
                    return series.color;
                }
            }
            return palette[si % palette.length];
        }

        renderLegend(chart) {
            const legend = document.createElement('div');
            legend.className = 'xlsx-chart-legend';
            for (let i = 0; i < chart.series.length; i++) {
                const item = document.createElement('span');
                item.className = 'xlsx-chart-legend-item';
                const sw = document.createElement('span');
                sw.className = 'xlsx-chart-legend-swatch';
                sw.style.background = this.chartColor(chart, i);
                item.appendChild(sw);
                const label = document.createElement('span');
                label.textContent = chart.series[i].name;
                item.appendChild(label);
                legend.appendChild(item);
            }
            return legend;
        }

        chartPalette() {
            return ['#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5',
                    '#70AD47', '#264478', '#9E480E', '#636363', '#997300'];
        }

        estimateChartBodySize(chart, legendPos, pos) {
            if (!pos || !pos.w || !pos.h) {
                return { w: 640, h: 320 };
            }
            const {w: posW, h: posH} = pos;
            let w = posW;
            let h = posH;
            if (chart.title && chart.title.text && !chart.title.hidden) {
                h -= 26;
            }
            if (legendPos === 't' || legendPos === 'b') {
                h -= 24;
            }
            else if (legendPos === 'r' || legendPos === 'l') {
                w -= Math.min(120, Math.round(posW * 0.32));
            }
            return { w: Math.max(80, Math.round(w)), h: Math.max(60, Math.round(h)) };
        }

        renderChartSvg(chart, size) {
            const {type} = chart;
            if (type === 'bar' || type === 'line' || type === 'area' || type === 'combo') {
                return this.renderCartesianChart(chart, size);
            }
            if (type === 'pie' || type === 'doughnut') {
                return this.renderPieChart(chart, size);
            }
            return null;
        }

        createSvg(width, height) {
            const ns = SVG_NS;
            const svg = document.createElementNS(ns, 'svg');
            svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            svg.classList.add('xlsx-chart-svg');
            return svg;
        }

        rangeStandard(series) {
            let min = Infinity;
            let max = -Infinity;
            for (const ser of series) {
                for (const v of ser.data) {
                    if (typeof v === 'number') {
                        if (v < min) {
                            min = v;
                        }
                        if (v > max) {
                            max = v;
                        }
                    }
                }
            }
            if (!isFinite(min) || !isFinite(max)) {
                return { min: 0, max: 1 };
            }
            if (min === max) {
                min -= 1;
                max += 1;
            }
            if (min > 0) {
                min = 0;
            }
            return { min, max };
        }

        rangeStacked(series) {
            const nCats = Math.max(0, ...series.map((s) => s.data.length));
            let min = Infinity;
            let max = -Infinity;
            for (let i = 0; i < nCats; i++) {
                let pos = 0;
                let neg = 0;
                for (const ser of series) {
                    const v = typeof ser.data[i] === 'number' ? ser.data[i] : 0;
                    if (v >= 0) {
                        pos += v;
                    }
                    else {
                        neg += v;
                    }
                }
                if (pos > max) {
                    max = pos;
                }
                if (neg < min) {
                    min = neg;
                }
            }
            return {
                min: isFinite(min) ? min : 0,
                max: isFinite(max) ? max : 1
            };
        }

        computeRange(chart) {
            const grouping = chart.grouping || 'standard';
            const valAxis = chart.valAxis || {};
            let extent;
            if (grouping === 'percentStacked') {
                extent = { min: 0, max: 1 };
            }
            else if (grouping === 'stacked') {
                extent = this.rangeStacked(chart.series);
            }
            else {
                extent = this.rangeStandard(chart.series);
            }
            const rawRange = Math.max(1e-9, extent.max - extent.min);
            const rawStep = this.niceStep(rawRange);
            const majorUnit = typeof valAxis.majorUnit === 'number' && valAxis.majorUnit > 0
                ? valAxis.majorUnit
                : rawStep;
            const niceMax = typeof valAxis.max === 'number'
                ? valAxis.max
                : extent.max <= 0 ? 0 : Math.ceil(extent.max / majorUnit) * majorUnit;
            const niceMin = typeof valAxis.min === 'number'
                ? valAxis.min
                : extent.min < 0 ? Math.floor(extent.min / majorUnit) * majorUnit : 0;
            const range = Math.max(1e-9, niceMax - niceMin);
            return { niceMin, niceMax, range, majorUnit };
        }

        niceStep(range) {
            const rough = range / 5;
            const exp = Math.floor(Math.log10(rough));
            const base = Math.pow(10, exp);
            const m = rough / base;
            let nice;
            if (m <= 1) {
                nice = 1;
            }
            else if (m <= 2) {
                nice = 2;
            }
            else if (m <= 5) {
                nice = 5;
            }
            else {
                nice = 10;
            }
            return nice * base;
        }

        drawGridLine(svg, ns, x1, x2, y, line) {
            const el = document.createElementNS(ns, 'line');
            el.setAttribute('x1', x1);
            el.setAttribute('x2', x2);
            el.setAttribute('y1', y);
            el.setAttribute('y2', y);
            if (line && line.color) {
                el.setAttribute('stroke', line.color);
            }
            else {
                el.setAttribute('class', 'xlsx-chart-grid');
            }
            if (line && line.width) {
                el.setAttribute(STROKE_WIDTH_ATTR, String(line.width));
            }
            if (line && line.dash && line.dash !== 'solid') {
                const da = this.dashArrayFor(line.dash, line.width || 1);
                if (da) {
                    el.setAttribute('stroke-dasharray', da);
                }
            }
            svg.appendChild(el);
        }

        drawAxisLabel(svg, ns, opts) {
            const { x, y, text, anchor, rotation, font } = opts;
            const label = document.createElementNS(ns, 'text');
            label.setAttribute('x', x);
            label.setAttribute('y', y);
            label.setAttribute('text-anchor', anchor || 'middle');
            label.setAttribute('class', 'xlsx-chart-axis-label');
            if (rotation) {
                label.setAttribute('transform', `rotate(${rotation} ${x} ${y})`);
            }
            if (font) {
                this.applySvgFont(label, font);
            }
            label.textContent = text;
            svg.appendChild(label);
            return label;
        }

        applySvgFont(el, font) {
            const sz = safeNum(font.size, 0, 144);
            if (sz) {
                el.style.fontSize = `${sz * 1.333}px`;
            }
            const col = safeCssColor(font.color);
            if (col) {
                el.setAttribute('fill', col);
            }
            if (font.bold) {
                el.setAttribute('font-weight', 'bold');
            }
            if (font.italic) {
                el.setAttribute('font-style', 'italic');
            }
            const fam = safeFontFamily(font.name);
            if (fam) {
                el.setAttribute('font-family', `"${fam}",sans-serif`);
            }
        }

        drawAxisLine(svg, ns, x1, y1, x2, y2, line) {
            const el = document.createElementNS(ns, 'line');
            el.setAttribute('x1', x1);
            el.setAttribute('y1', y1);
            el.setAttribute('x2', x2);
            el.setAttribute('y2', y2);
            el.setAttribute('class', 'xlsx-chart-axis');
            if (line) {
                if (line.color) {
                    el.setAttribute('stroke', line.color);
                }
                if (line.width) {
                    el.setAttribute(STROKE_WIDTH_ATTR, String(line.width));
                }
                if (line.dash && line.dash !== 'solid') {
                    const da = this.dashArrayFor(line.dash, line.width || 1);
                    if (da) {
                        el.setAttribute('stroke-dasharray', da);
                    }
                }
            }
            svg.appendChild(el);
        }

        tryFormatNumber(v, numFmt) {
            try {
                return String(formatNumber(v, numFmt));
            }
            catch (ex) {
                return null;
            }
        }

        formatAxisValue(v, numFmt, grouping) {
            if (grouping === 'percentStacked') {
                return `${Math.round(v * 100)}%`;
            }
            if (numFmt && numFmt !== 'General') {
                const formatted = this.tryFormatNumber(v, numFmt);
                if (formatted !== null) {
                    return formatted;
                }
            }
            return this.formatTickLabel(v);
        }

        formatCategoryLabel(value, numFmt, fallbackIdx) {
            if (value === undefined || value === null || value === '') {
                return String(fallbackIdx + 1);
            }
            if (typeof value === 'number' && numFmt && numFmt !== 'General') {
                const isDateCode = /[dhmsy]/i.test(numFmt) && !/[#$?]/.test(numFmt);
                if (isDateCode) {
                    const dateStr = (() => {
                        try {
                            return formatDate(value, numFmt);
                        }
                        catch (ex) {
                            return null;
                        }
                    })();
                    if (dateStr !== null) {
                        return String(dateStr);
                    }
                }
                const formatted = this.tryFormatNumber(value, numFmt);
                if (formatted !== null && formatted !== undefined) {
                    return formatted;
                }
            }
            return String(value);
        }

        drawYAxisMajorGridline(svg, ns, geom, majorGrid, y) {
            if (majorGrid && majorGrid.line && (majorGrid.line.color || majorGrid.line.width !== 0)) {
                this.drawGridLine(svg, ns, geom.padL, geom.W - geom.padR, y, majorGrid.line);
            }
            else if (majorGrid !== null && majorGrid !== undefined) {
                this.drawGridLine(svg, ns, geom.padL, geom.W - geom.padR, y, null);
            }
        }

        drawYAxisTick(svg, ns, geom, ctxYAxis, v, y) {
            const { sideKey, majorGrid, valAxis, labelFont, showAxis, chart } = ctxYAxis;
            if (sideKey === 'left') {
                this.drawYAxisMajorGridline(svg, ns, geom, majorGrid, y);
            }
            if (showAxis) {
                this.drawAxisLabel(svg, ns, {
                    x: sideKey === 'right' ? geom.W - geom.padR + 6 : geom.padL - 6,
                    y: y + 4,
                    text: this.formatAxisValue(v, valAxis.numFmt, chart.grouping),
                    anchor: sideKey === 'right' ? 'start' : 'end',
                    font: labelFont
                });
            }
        }

        drawYAxisTitle(svg, ns, geom, sideKey, title) {
            if (!title || !title.text) {
                return;
            }
            const label = this.drawAxisLabel(svg, ns, {
                x: sideKey === 'right' ? geom.W - 14 : 14,
                y: geom.padT + geom.innerH / 2,
                text: title.text,
                anchor: 'middle',
                rotation: sideKey === 'right' ? 90 : -90,
                font: title.font
            });
            label.classList.add('xlsx-chart-axis-title');
        }

        drawYAxis(svg, ns, geom, rangeInfo, chart, opts) {
            const {side, axisOverride, valToYOverride} = opts || {};
            const sideKey = side || 'left';
            const valAxis = axisOverride || chart.valAxis || {};
            const showAxis = !valAxis.hidden;
            const valToY = valToYOverride || geom.valToY;
            const tickCtx = {
                sideKey,
                majorGrid: valAxis.majorGridlines,
                valAxis,
                labelFont: valAxis.labelFont,
                showAxis,
                chart
            };
            const ticks = Math.max(2, Math.round(rangeInfo.range / rangeInfo.majorUnit));
            for (let i = 0; i <= ticks; i++) {
                const v = rangeInfo.niceMin + rangeInfo.majorUnit * i;
                if (v > rangeInfo.niceMax + 1e-6) {
                    break;
                }
                this.drawYAxisTick(svg, ns, geom, tickCtx, v, valToY(v));
            }
            if (showAxis) {
                const ax = sideKey === 'right' ? geom.W - geom.padR : geom.padL;
                this.drawAxisLine(svg, ns, ax, geom.padT, ax, geom.H - geom.padB, valAxis.line);
            }
            this.drawYAxisTitle(svg, ns, geom, sideKey, valAxis.title);
        }

        drawXAxis(svg, ns, geom, cats, nCats, chart, isBar) {
            const catAxis = chart.catAxis || {};
            const {labelFont, hidden, labelRotation, numFmt, line, title} = catAxis;
            const showAxis = !hidden;
            const {innerW, padL, padB, H, W, padR, valToY} = geom;
            if (nCats > 0 && showAxis) {
                const step = innerW / nCats;
                const offsetMid = isBar ? 0.5 : 0;
                const labelDivisor = isBar ? nCats : Math.max(nCats - 1, 1);
                const stepLbl = innerW / labelDivisor;
                const maxLabels = Math.min(nCats, Math.floor(innerW / 50));
                const stride = Math.max(1, Math.ceil(nCats / Math.max(1, maxLabels)));
                const rotation = labelRotation || 0;
                const anchor = rotation === 0 ? 'middle' : rotation > 0 ? 'start' : 'end';
                for (let i = 0; i < nCats; i += stride) {
                    this.drawAxisLabel(svg, ns, {
                        x: padL + (isBar ? step * (i + offsetMid) : stepLbl * i),
                        y: H - padB + 16,
                        text: this.formatCategoryLabel(cats[i], numFmt, i),
                        anchor,
                        rotation,
                        font: labelFont
                    });
                }
            }
            if (showAxis) {
                const baseY = valToY(0);
                this.drawAxisLine(svg, ns, padL, baseY, W - padR, baseY, line);
            }
            if (title && title.text) {
                this.drawAxisLabel(svg, ns, {
                    x: padL + innerW / 2,
                    y: H - 6,
                    text: title.text,
                    anchor: 'middle',
                    font: title.font
                });
            }
        }

        barGeometry(chart, geom, si, i, nCats) {
            const groupW = geom.innerW / Math.max(nCats, 1);
            const gapPct = (chart.gapWidth === undefined ? 150 : chart.gapWidth) / 100;
            const overlapPct = (chart.overlap === undefined ? -27 : chart.overlap) / 100;
            const isStacked = chart.grouping === 'stacked' || chart.grouping === 'percentStacked';
            const nSeries = isStacked ? 1 : chart.series.length;
            const denom = nSeries + (nSeries - 1) * -overlapPct + gapPct;
            const barW = groupW / Math.max(1, denom);
            const gap = barW * gapPct;
            const sx = geom.padL + groupW * i + gap / 2;
            const x = isStacked ? sx : sx + barW * si * (1 - overlapPct);
            return { x, w: barW };
        }

        percentStackTotals(series, nCats) {
            const totals = new Array(nCats).fill(0);
            for (let i = 0; i < nCats; i++) {
                let sum = 0;
                for (const ser of series) {
                    const v = typeof ser.data[i] === 'number' ? ser.data[i] : 0;
                    sum += Math.abs(v);
                }
                totals[i] = sum || 1;
            }
            return totals;
        }

        barYRange(stackState, v) {
            if (stackState.isStacked) {
                if (v >= 0) {
                    const y0 = stackState.geom.valToY(stackState.posStack[stackState.i]);
                    const y1 = stackState.geom.valToY(stackState.posStack[stackState.i] + v);
                    stackState.posStack[stackState.i] += v;
                    return [y0, y1];
                }
                const y0 = stackState.geom.valToY(stackState.negStack[stackState.i]);
                const y1 = stackState.geom.valToY(stackState.negStack[stackState.i] + v);
                stackState.negStack[stackState.i] += v;
                return [y0, y1];
            }
            return [stackState.geom.valToY(0), stackState.geom.valToY(v)];
        }

        drawSingleBar(svg, ns, chart, ctx) {
            const { x, w, y0, y1, si, i, ser, seriesColor } = ctx;
            const rect = document.createElementNS(ns, 'rect');
            rect.setAttribute('x', x);
            rect.setAttribute('y', Math.min(y0, y1));
            rect.setAttribute('width', Math.max(0.5, w));
            rect.setAttribute('height', Math.max(1, Math.abs(y1 - y0)));
            rect.setAttribute('fill', this.chartColor(chart, si, i) || seriesColor);
            const lineProps = ser.line;
            if (lineProps && lineProps.color) {
                rect.setAttribute('stroke', lineProps.color);
                if (lineProps.width) {
                    rect.setAttribute(STROKE_WIDTH_ATTR, String(lineProps.width));
                }
            }
            if (this.shouldApplyChartShadow(chart, ser)) {
                rect.setAttribute('filter', `url(#${this.ensureShadowFilter(svg, ns, chart && chart.is3D)})`);
            }
            svg.appendChild(rect);
        }

        shouldApplyChartShadow(chart, ser) {
            if (ser && ser.hasShadow === false) {
                return false;
            }
            return chart.type === 'bar' || chart.type === 'pie' || chart.type === 'doughnut';
        }

        ensureShadowFilter(svg, ns, deep) {
            const id = deep ? 'xlsx-chart-shadow-3d' : 'xlsx-chart-shadow';
            const flag = deep ? '_has3DShadowFilter' : '_hasShadowFilter';
            if (svg[flag]) {
                return id;
            }
            let defs = svg.querySelector('defs');
            if (!defs) {
                defs = document.createElementNS(ns, 'defs');
                svg.insertBefore(defs, svg.firstChild);
            }
            const filter = document.createElementNS(ns, 'filter');
            filter.setAttribute('id', id);
            filter.setAttribute('x', '-10%');
            filter.setAttribute('y', '-10%');
            filter.setAttribute('width', '120%');
            filter.setAttribute('height', '120%');
            const blur = document.createElementNS(ns, 'feGaussianBlur');
            blur.setAttribute('in', 'SourceAlpha');
            blur.setAttribute('stdDeviation', deep ? '2.5' : '1.5');
            filter.appendChild(blur);
            const offset = document.createElementNS(ns, 'feOffset');
            offset.setAttribute('dx', deep ? '3' : '1');
            offset.setAttribute('dy', deep ? '4' : '2');
            offset.setAttribute('result', 'offsetblur');
            filter.appendChild(offset);
            const compTrans = document.createElementNS(ns, 'feComponentTransfer');
            const funcA = document.createElementNS(ns, 'feFuncA');
            funcA.setAttribute('type', 'linear');
            funcA.setAttribute('slope', deep ? '0.45' : '0.25');
            compTrans.appendChild(funcA);
            filter.appendChild(compTrans);
            const merge = document.createElementNS(ns, 'feMerge');
            const mn1 = document.createElementNS(ns, 'feMergeNode');
            const mn2 = document.createElementNS(ns, 'feMergeNode');
            mn2.setAttribute('in', 'SourceGraphic');
            merge.appendChild(mn1);
            merge.appendChild(mn2);
            filter.appendChild(merge);
            defs.appendChild(filter);
            svg[flag] = true;
            return id;
        }

        drawBars(svg, ns, chart, geom, nCats) {
            if (chart.barDirection === 'bar') {
                this.drawHorizontalBars(svg, ns, chart, geom, nCats);
                return;
            }
            const isStacked = chart.grouping === 'stacked' || chart.grouping === 'percentStacked';
            const isPctStacked = chart.grouping === 'percentStacked';
            const posStack = new Array(nCats).fill(0);
            const negStack = new Array(nCats).fill(0);
            const totals = isPctStacked ? this.percentStackTotals(chart.series, nCats) : null;
            for (let si = 0; si < chart.series.length; si++) {
                const ser = chart.series[si];
                const seriesColor = this.chartColor(chart, si);
                for (let i = 0; i < ser.data.length; i++) {
                    let v = typeof ser.data[i] === 'number' ? ser.data[i] : 0;
                    if (isPctStacked) {
                        v = Math.abs(v) / totals[i] * (ser.data[i] < 0 ? -1 : 1);
                    }
                    const { x, w } = this.barGeometry(chart, geom, si, i, nCats);
                    const [y0, y1] = this.barYRange({ isStacked, geom, posStack, negStack, i }, v);
                    const color = this.barFill(chart, ser, si, i, v, seriesColor);
                    this.drawSingleBar(svg, ns, chart, { x, w, y0, y1, si, i, ser, seriesColor: color });
                    if (ser.dataLabels && ser.dataLabels.show) {
                        this.drawBarDataLabel(svg, ns, { chart, ser, v, i, cx: x + w / 2, y0, y1 });
                    }
                }
            }
        }

        drawHorizontalBars(svg, ns, chart, geom, nCats) {
            const isStacked = chart.grouping === 'stacked' || chart.grouping === 'percentStacked';
            const isPctStacked = chart.grouping === 'percentStacked';
            const posStack = new Array(nCats).fill(0);
            const negStack = new Array(nCats).fill(0);
            const totals = isPctStacked ? this.percentStackTotals(chart.series, nCats) : null;
            const valToX = geom.valToY;
            for (let si = 0; si < chart.series.length; si++) {
                const ser = chart.series[si];
                const seriesColor = this.chartColor(chart, si);
                for (let i = 0; i < ser.data.length; i++) {
                    let v = typeof ser.data[i] === 'number' ? ser.data[i] : 0;
                    if (isPctStacked) {
                        v = Math.abs(v) / totals[i] * (ser.data[i] < 0 ? -1 : 1);
                    }
                    const { y, h } = this.horizBarGeometry(chart, geom, si, i, nCats);
                    let x0, x1;
                    if (isStacked) {
                        const stack = v >= 0 ? posStack : negStack;
                        x0 = valToX(stack[i]);
                        x1 = valToX(stack[i] + v);
                        stack[i] += v;
                    }
                    else {
                        x0 = valToX(0);
                        x1 = valToX(v);
                    }
                    const color = this.barFill(chart, ser, si, i, v, seriesColor);
                    this.drawSingleHorizBar(svg, ns, chart, { y, h, x0, x1, si, i, ser, seriesColor: color });
                    if (ser.dataLabels && ser.dataLabels.show) {
                        this.drawBarDataLabel(svg, ns, { chart, ser, v, i, cx: (x0 + x1) / 2, y0: y, y1: y + h });
                    }
                }
            }
        }

        horizBarGeometry(chart, geom, si, i, nCats) {
            const groupH = geom.innerH / Math.max(nCats, 1);
            const gapPct = (chart.gapWidth === undefined ? 150 : chart.gapWidth) / 100;
            const overlapPct = (chart.overlap === undefined ? -27 : chart.overlap) / 100;
            const isStacked = chart.grouping === 'stacked' || chart.grouping === 'percentStacked';
            const nSeries = isStacked ? 1 : chart.series.length;
            const denom = nSeries + (nSeries - 1) * -overlapPct + gapPct;
            const barH = groupH / Math.max(1, denom);
            const gap = barH * gapPct;
            const sy = geom.padT + groupH * i + gap / 2;
            const y = isStacked ? sy : sy + barH * si * (1 - overlapPct);
            return { y, h: barH };
        }

        drawSingleHorizBar(svg, ns, chart, ctx) {
            const { y, h, x0, x1, si, i, ser, seriesColor } = ctx;
            const rect = document.createElementNS(ns, 'rect');
            rect.setAttribute('x', Math.min(x0, x1));
            rect.setAttribute('y', y);
            rect.setAttribute('width', Math.max(1, Math.abs(x1 - x0)));
            rect.setAttribute('height', Math.max(0.5, h));
            rect.setAttribute('fill', this.chartColor(chart, si, i) || seriesColor);
            const lineProps = ser.line;
            if (lineProps && lineProps.color) {
                rect.setAttribute('stroke', lineProps.color);
                if (lineProps.width) {
                    rect.setAttribute(STROKE_WIDTH_ATTR, String(lineProps.width));
                }
            }
            if (this.shouldApplyChartShadow(chart, ser)) {
                rect.setAttribute('filter', `url(#${this.ensureShadowFilter(svg, ns, chart && chart.is3D)})`);
            }
            svg.appendChild(rect);
        }

        barFill(chart, ser, si, i, v, defaultColor) {
            if (v < 0 && ser.invertIfNegative) {
                return '#ffffff';
            }
            return this.chartColor(chart, si, i) || defaultColor;
        }

        drawBarDataLabel(svg, ns, ctx) {
            const { chart, ser, v, i, cx, y0, y1 } = ctx;
            const dl = ser.dataLabels;
            const text = this.formatDataLabel(chart, ser, v, i);
            if (!text) {
                return;
            }
            const pos = dl.position || 'outEnd';
            let y;
            const anchor = 'middle';
            if (pos === 'inEnd' || pos === 'ctr') {
                y = (y0 + y1) / 2 + 4;
            }
            else if (pos === 'inBase') {
                y = y0 - 4;
            }
            else {
                y = v >= 0 ? Math.min(y0, y1) - 4 : Math.max(y0, y1) + 12;
            }
            this.drawAxisLabel(svg, ns, { x: cx, y, text, anchor, font: dl.font });
        }

        formatDataLabel(chart, ser, v, i) {
            const dl = ser.dataLabels;
            const parts = [];
            if (dl.showCategory && chart.categories && chart.categories[i] !== undefined) {
                parts.push(String(chart.categories[i]));
            }
            if (dl.showSeries) {
                parts.push(ser.name);
            }
            if (dl.showPercent) {
                parts.push(`${(v * 100).toFixed(0)}%`);
            }
            if (dl.showValue || !dl.showCategory && !dl.showSeries && !dl.showPercent) {
                const fmt = dl.numFmt || chart.valAxis && chart.valAxis.numFmt;
                parts.push(this.formatAxisValue(v, fmt, ''));
            }
            return parts.join(', ');
        }

        smoothPathD(points) {
            if (points.length < 2) {
                return '';
            }
            if (points.length === 2) {
                return `M${points[0][0]} ${points[0][1]} L${points[1][0]} ${points[1][1]}`;
            }
            let d = `M${points[0][0]} ${points[0][1]}`;
            for (let i = 0; i < points.length - 1; i++) {
                const p0 = points[i - 1] || points[i];
                const p1 = points[i];
                const p2 = points[i + 1];
                const p3 = points[i + 2] || p2;
                const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
                const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
                const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
                const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
                d += ` C${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2[0]} ${p2[1]}`;
            }
            return d;
        }

        drawMarker(svg, ns, opts) {
            const { cx, cy, symbol, size, fill, stroke } = opts;
            if (!symbol || symbol === 'none') {
                return;
            }
            const half = size / 2;
            let el;
            switch (symbol) {
                case 'square':
                    el = document.createElementNS(ns, 'rect');
                    el.setAttribute('x', cx - half);
                    el.setAttribute('y', cy - half);
                    el.setAttribute('width', size);
                    el.setAttribute('height', size);
                    break;
                case 'triangle':
                    el = document.createElementNS(ns, 'polygon');
                    el.setAttribute('points',
                                    `${cx},${cy - half} ${cx + half},${cy + half} ${cx - half},${cy + half}`);
                    break;
                case 'diamond':
                    el = document.createElementNS(ns, 'polygon');
                    el.setAttribute('points',
                                    `${cx},${cy - half} ${cx + half},${cy} ${cx},${cy + half} ${cx - half},${cy}`);
                    break;
                case 'x':
                    this.drawXMarker(svg, ns, cx, cy, half, stroke || fill);
                    return;
                case 'plus':
                    this.drawPlusMarker(svg, ns, cx, cy, half, stroke || fill);
                    return;
                case 'star':
                    el = document.createElementNS(ns, 'polygon');
                    el.setAttribute('points', this.starPoints(cx, cy, half));
                    break;
                case 'dash':
                    el = document.createElementNS(ns, 'rect');
                    el.setAttribute('x', cx - half);
                    el.setAttribute('y', cy - 1);
                    el.setAttribute('width', size);
                    el.setAttribute('height', 2);
                    break;
                default:
                    el = document.createElementNS(ns, 'circle');
                    el.setAttribute('cx', cx);
                    el.setAttribute('cy', cy);
                    el.setAttribute('r', half);
                    break;
            }
            el.setAttribute('fill', fill);
            if (stroke) {
                el.setAttribute('stroke', stroke);
                el.setAttribute(STROKE_WIDTH_ATTR, '1');
            }
            svg.appendChild(el);
        }

        drawXMarker(svg, ns, cx, cy, half, color) {
            const a = document.createElementNS(ns, 'line');
            a.setAttribute('x1', cx - half);
            a.setAttribute('y1', cy - half);
            a.setAttribute('x2', cx + half);
            a.setAttribute('y2', cy + half);
            a.setAttribute('stroke', color);
            a.setAttribute(STROKE_WIDTH_ATTR, '1.5');
            svg.appendChild(a);
            const b = document.createElementNS(ns, 'line');
            b.setAttribute('x1', cx - half);
            b.setAttribute('y1', cy + half);
            b.setAttribute('x2', cx + half);
            b.setAttribute('y2', cy - half);
            b.setAttribute('stroke', color);
            b.setAttribute(STROKE_WIDTH_ATTR, '1.5');
            svg.appendChild(b);
        }

        drawPlusMarker(svg, ns, cx, cy, half, color) {
            const a = document.createElementNS(ns, 'line');
            a.setAttribute('x1', cx - half);
            a.setAttribute('y1', cy);
            a.setAttribute('x2', cx + half);
            a.setAttribute('y2', cy);
            a.setAttribute('stroke', color);
            a.setAttribute(STROKE_WIDTH_ATTR, '1.5');
            svg.appendChild(a);
            const b = document.createElementNS(ns, 'line');
            b.setAttribute('x1', cx);
            b.setAttribute('y1', cy - half);
            b.setAttribute('x2', cx);
            b.setAttribute('y2', cy + half);
            b.setAttribute('stroke', color);
            b.setAttribute(STROKE_WIDTH_ATTR, '1.5');
            svg.appendChild(b);
        }

        starPoints(cx, cy, r) {
            const pts = [];
            for (let i = 0; i < 10; i++) {
                const angle = -Math.PI / 2 + i * Math.PI / 5;
                const rr = i % 2 === 0 ? r : r * 0.45;
                pts.push(`${cx + Math.cos(angle) * rr},${cy + Math.sin(angle) * rr}`);
            }
            return pts.join(' ');
        }

        buildSeriesPoints(chart, geom, nCats) {
            const isStacked = chart.grouping === 'stacked' || chart.grouping === 'percentStacked';
            const isPctStacked = chart.grouping === 'percentStacked';
            const stack = isStacked ? new Array(nCats).fill(0) : null;
            const totals = isPctStacked ? this.percentStackTotals(chart.series, nCats) : null;
            const step = geom.innerW / Math.max(nCats - 1, 1);
            return chart.series.map((ser) => {
                const points = [];
                for (let i = 0; i < ser.data.length; i++) {
                    let v = typeof ser.data[i] === 'number' ? ser.data[i] : 0;
                    if (isPctStacked) {
                        v = Math.abs(v) / totals[i] * (ser.data[i] < 0 ? -1 : 1);
                    }
                    let y;
                    if (isStacked) {
                        stack[i] += v;
                        y = geom.valToY(stack[i]);
                    }
                    else {
                        y = geom.valToY(v);
                    }
                    points.push([geom.padL + step * i, y]);
                }
                return points;
            });
        }

        drawAreaFill(svg, ns, points, prevPoints, color, isStacked, geom) {
            if (!points.length) {
                return;
            }
            let polyPoints;
            if (isStacked && prevPoints) {
                polyPoints = [...points, ...[...prevPoints].reverse()];
            }
            else {
                const y0 = geom.valToY(0);
                polyPoints = [...points, [points[points.length - 1][0], y0], [points[0][0], y0]];
            }
            const polygon = document.createElementNS(ns, 'polygon');
            polygon.setAttribute('points', polyPoints.map((p) => p.join(',')).join(' '));
            polygon.setAttribute('fill', color);
            polygon.setAttribute('fill-opacity', isStacked ? '0.8' : '0.3');
            svg.appendChild(polygon);
        }

        drawSeriesPath(svg, ns, points, ser, color) {
            const line = ser.line || {};
            const lineWidth = line.width || 2;
            const path = document.createElementNS(ns, 'path');
            path.setAttribute('d', ser.smooth
                ? this.smoothPathD(points)
                : `M${points.map((p) => p.join(' ')).join(' L')}`);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', line.color || color);
            path.setAttribute(STROKE_WIDTH_ATTR, String(lineWidth));
            if (line.dash && line.dash !== 'solid') {
                const da = this.dashArrayFor(line.dash, lineWidth);
                if (da) {
                    path.setAttribute('stroke-dasharray', da);
                }
            }
            svg.appendChild(path);
        }

        drawSeriesMarkers(svg, ns, points, ser, color) {
            const {marker} = ser;
            if (!marker || marker.symbol === 'none') {
                return;
            }
            const opts = {
                symbol: marker.symbol && marker.symbol !== 'auto' ? marker.symbol : 'circle',
                size: marker.size || 5,
                fill: marker.color || color,
                stroke: marker.line && marker.line.color || color
            };
            for (const [px, py] of points) {
                this.drawMarker(svg, ns, { ...opts, cx: px, cy: py });
            }
        }

        drawSeriesDataLabels(svg, ns, points, chart, ser) {
            if (!ser.dataLabels || !ser.dataLabels.show) {
                return;
            }
            for (let i = 0; i < points.length; i++) {
                const v = typeof ser.data[i] === 'number' ? ser.data[i] : 0;
                const text = this.formatDataLabel(chart, ser, v, i);
                if (text) {
                    this.drawAxisLabel(svg, ns, {
                        x: points[i][0],
                        y: points[i][1] - 6,
                        text,
                        anchor: 'middle',
                        font: ser.dataLabels.font
                    });
                }
            }
        }

        drawLines(svg, ns, chart, geom, nCats) {
            const isStacked = chart.grouping === 'stacked' || chart.grouping === 'percentStacked';
            const seriesPoints = this.buildSeriesPoints(chart, geom, nCats);
            for (let si = 0; si < chart.series.length; si++) {
                const ser = chart.series[si];
                const color = this.chartColor(chart, si);
                const points = seriesPoints[si];
                if (chart.type === 'area') {
                    this.drawAreaFill(svg, ns, points,
                                      isStacked && si > 0 ? seriesPoints[si - 1] : null,
                                      color, isStacked, geom);
                }
                this.drawSeriesPath(svg, ns, points, ser, color);
                if (chart.type !== 'area') {
                    this.drawSeriesMarkers(svg, ns, points, ser, color);
                }
                if (ser.trendline) {
                    this.drawTrendline(svg, ns, chart, ser, points, geom);
                }
                this.drawSeriesDataLabels(svg, ns, points, chart, ser);
            }
        }

        drawTrendline(svg, ns, chart, ser, points, geom) {
            const tl = ser.trendline;
            if (!points.length) {
                return;
            }
            const xs = ser.data.map((_v, i) => i);
            const ys = ser.data.map((v) => typeof v === 'number' ? v : 0);
            const n = xs.length;
            const sumX = xs.reduce((a, b) => a + b, 0);
            const sumY = ys.reduce((a, b) => a + b, 0);
            const sumXY = xs.reduce((a, b, i) => a + b * ys[i], 0);
            const sumXX = xs.reduce((a, b) => a + b * b, 0);
            const denom = n * sumXX - sumX * sumX;
            if (Math.abs(denom) < 1e-9) {
                return;
            }
            const slope = (n * sumXY - sumX * sumY) / denom;
            const intercept = (sumY - slope * sumX) / n;
            const x0 = points[0][0];
            const x1 = points[points.length - 1][0];
            const y0 = geom.valToY(intercept);
            const y1 = geom.valToY(intercept + slope * (n - 1));
            const line = document.createElementNS(ns, 'line');
            line.setAttribute('x1', x0);
            line.setAttribute('y1', y0);
            line.setAttribute('x2', x1);
            line.setAttribute('y2', y1);
            const lp = tl.line || {};
            line.setAttribute('stroke', lp.color || this.chartColor(chart, chart.series.indexOf(ser)));
            line.setAttribute(STROKE_WIDTH_ATTR, String(lp.width || 1.5));
            const da = this.dashArrayFor(lp.dash || 'dash', lp.width || 1.5);
            if (da) {
                line.setAttribute('stroke-dasharray', da);
            }
            svg.appendChild(line);
        }

        computeCartesianPlotBox(chart, W, H, hasSecondaryAxis) {
            const m = chart.plotLayout;
            const layoutOk = m && [m.x, m.y, m.w, m.h].every((v) => v !== null && v !== undefined);
            if (layoutOk) {
                const padL = Math.round(m.x * W);
                const padT = Math.round(m.y * H);
                const innerW = Math.round(m.w * W);
                const innerH = Math.round(m.h * H);
                return {
                    padL, padT, innerW, innerH,
                    padR: Math.max(0, W - padL - innerW),
                    padB: Math.max(0, H - padT - innerH)
                };
            }
            const padL = chart.valAxis && chart.valAxis.title && chart.valAxis.title.text ? 64 : 50;
            const padR = hasSecondaryAxis ? 60 : 16;
            const padT = 20;
            const padB = chart.catAxis && chart.catAxis.title && chart.catAxis.title.text ? 50 : 40;
            return { padL, padR, padT, padB, innerW: W - padL - padR, innerH: H - padT - padB };
        }

        computeAxisRanges(chart, geom, hasSecondaryAxis) {
            const { padT, innerH } = geom;
            const primarySeries = hasSecondaryAxis
                ? chart.series.filter((s) => !s.useSecondaryAxis) : chart.series;
            const primaryChart = hasSecondaryAxis
                ? Object.assign({}, chart, { series: primarySeries }) : chart;
            const rangeInfo = this.computeRange(primaryChart);
            const valToY = (v) => padT + innerH - (v - rangeInfo.niceMin) / rangeInfo.range * innerH;
            let rangeInfo2 = null;
            let valToY2 = null;
            if (hasSecondaryAxis) {
                const secondarySeries = chart.series.filter((s) => s.useSecondaryAxis);
                const secondaryChart = Object.assign({}, chart,
                                                     { series: secondarySeries, valAxis: chart.valAxis2 });
                rangeInfo2 = this.computeRange(secondaryChart);
                valToY2 = (v) => padT + innerH - (v - rangeInfo2.niceMin) / rangeInfo2.range * innerH;
            }
            return { rangeInfo, valToY, rangeInfo2, valToY2 };
        }

        drawCartesianSeries(svg, ns, chart, geom, valToY2, nCats) {
            if (chart.seriesGroups && chart.seriesGroups.length) {
                for (const group of chart.seriesGroups) {
                    const subChart = Object.assign({}, chart, {
                        type: group.type,
                        series: group.series,
                        grouping: group.opts ? group.opts.grouping : chart.grouping,
                        gapWidth: group.opts ? group.opts.gapWidth : chart.gapWidth,
                        overlap: group.opts ? group.opts.overlap : chart.overlap
                    });
                    const groupGeom = group.useSecondaryAxis && valToY2
                        ? Object.assign({}, geom, { valToY: valToY2 }) : geom;
                    if (group.type === 'bar') {
                        this.drawBars(svg, ns, subChart, groupGeom, nCats);
                    }
                    else {
                        this.drawLines(svg, ns, subChart, groupGeom, nCats);
                    }
                }
                return;
            }
            if (chart.type === 'bar') {
                this.drawBars(svg, ns, chart, geom, nCats);
            }
            else {
                this.drawLines(svg, ns, chart, geom, nCats);
            }
        }

        renderCartesianChart(chart, size) {
            const ns = SVG_NS;
            const W = size && size.w || 640;
            const H = size && size.h || 320;
            const hasSecondaryAxis = !!(chart.valAxis2 && chart.seriesGroups
                && chart.seriesGroups.some((g) => g.useSecondaryAxis));
            const box = this.computeCartesianPlotBox(chart, W, H, hasSecondaryAxis);
            const svg = this.createSvg(W, H);
            const { rangeInfo, valToY, rangeInfo2, valToY2 } =
                this.computeAxisRanges(chart, box, hasSecondaryAxis);
            const geom = Object.assign({ W, H, valToY }, box);
            const cats = chart.categories || [];
            const nCats = Math.max(cats.length, ...chart.series.map((s) => s.data.length));
            if (chart.plotBackground && chart.plotBackground.color) {
                const bg = document.createElementNS(ns, 'rect');
                bg.setAttribute('x', box.padL);
                bg.setAttribute('y', box.padT);
                bg.setAttribute('width', box.innerW);
                bg.setAttribute('height', box.innerH);
                bg.setAttribute('fill', safeCssColor(chart.plotBackground.color) || 'transparent');
                svg.appendChild(bg);
            }
            this.drawYAxis(svg, ns, geom, rangeInfo, chart);
            if (hasSecondaryAxis) {
                this.drawYAxis(svg, ns, geom, rangeInfo2, chart, {
                    side: 'right', axisOverride: chart.valAxis2, valToYOverride: valToY2
                });
            }
            const hasBars = chart.seriesGroups
                ? chart.seriesGroups.some((g) => g.type === 'bar')
                : chart.type === 'bar';
            this.drawXAxis(svg, ns, geom, cats, nCats, chart, hasBars);
            this.drawCartesianSeries(svg, ns, chart, geom, valToY2, nCats);
            return svg;
        }

        formatTickLabel(v) {
            const abs = Math.abs(v);
            if (abs >= 1e6) {
                return `${(v / 1e6).toFixed(1)}M`;
            }
            if (abs >= 1e3) {
                return `${(v / 1e3).toFixed(1)}k`;
            }
            if (Number.isInteger(v)) {
                return v;
            }
            return v.toFixed(2);
        }

        pieSliceOffset(ser, i, mid, r) {
            if (!ser.pointExplosions || !ser.pointExplosions[i]) {
                return { ox: 0, oy: 0 };
            }
            const expl = ser.pointExplosions[i] / 100 * r;
            return { ox: Math.cos(mid) * expl, oy: Math.sin(mid) * expl };
        }

        pieSlicePathD(geom, start, end) {
            const { cx, cy, r, innerR, ox, oy } = geom;
            const large = end - start > Math.PI ? 1 : 0;
            const x1 = cx + ox + Math.cos(start) * r;
            const y1 = cy + oy + Math.sin(start) * r;
            const x2 = cx + ox + Math.cos(end) * r;
            const y2 = cy + oy + Math.sin(end) * r;
            if (innerR > 0) {
                const ix2 = cx + ox + Math.cos(end) * innerR;
                const iy2 = cy + oy + Math.sin(end) * innerR;
                const ix1 = cx + ox + Math.cos(start) * innerR;
                const iy1 = cy + oy + Math.sin(start) * innerR;
                return `M${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} `
                    + `L${ix2} ${iy2} A${innerR} ${innerR} 0 ${large} 0 ${ix1} ${iy1} Z`;
            }
            return `M${cx + ox} ${cy + oy} L${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
        }

        drawPieSlicePath(svg, ns, ser, fill, d) {
            const path = document.createElementNS(ns, 'path');
            path.setAttribute('d', d);
            path.setAttribute('fill', fill);
            const lp = ser.line;
            if (lp && lp.color) {
                path.setAttribute('stroke', lp.color);
                path.setAttribute(STROKE_WIDTH_ATTR, String(lp.width || 1));
            }
            else {
                path.setAttribute('stroke', '#fff');
                path.setAttribute(STROKE_WIDTH_ATTR, '1');
            }
            const chart = svg._chart;
            if (chart && this.shouldApplyChartShadow(chart)) {
                path.setAttribute('filter', `url(#${this.ensureShadowFilter(svg, ns, chart.is3D)})`);
            }
            svg.appendChild(path);
        }

        pieLabelRadius(pos, r, innerR, isDoughnut) {
            if (pos === 'ctr') {
                return isDoughnut ? (r + innerR) / 2 : r * 0.5;
            }
            if (pos === 'inEnd') {
                return r * 0.78;
            }
            return r + 14;
        }

        formatPieLabel(ctx) {
            const { dl, ser, v, i, total, labels } = ctx;
            const parts = [];
            if (dl.showCategory && labels[i] !== undefined) {
                parts.push(String(labels[i]));
            }
            if (dl.showSeries) {
                parts.push(ser.name);
            }
            if (dl.showPercent || !dl.showValue && !dl.showCategory && !dl.showSeries) {
                parts.push(`${(v / total * 100).toFixed(0)}%`);
            }
            if (dl.showValue) {
                const fmt = dl.numFmt || ser.valueNumFmt || '';
                parts.push(this.formatAxisValue(v, fmt, ''));
            }
            return parts.join(' ');
        }

        mergePieLabelOptions(dl, perPoint) {
            if (!perPoint) {
                return dl;
            }
            const pick = (key) => perPoint[key] === null || perPoint[key] === undefined
                ? dl && dl[key] : perPoint[key];
            return Object.assign({}, dl || { show: true }, {
                showValue: pick('showValue'),
                showPercent: pick('showPercent'),
                showCategory: pick('showCategory'),
                numFmt: perPoint.numFmt || dl && dl.numFmt,
                font: perPoint.font || dl && dl.font,
                position: perPoint.position || dl && dl.position
            });
        }

        computePieLabelPos(chart, geom, perPoint, start, end, effectiveDl) {
            if (perPoint && perPoint.layout && chart.type === 'doughnut') {
                return { lx: geom.cx + geom.ox, ly: geom.cy + geom.oy + 4 };
            }
            const mid = (start + end) / 2;
            const labelR = this.pieLabelRadius(
                effectiveDl.position || 'bestFit', geom.r, geom.innerR, chart.type === 'doughnut');
            return {
                lx: geom.cx + geom.ox + Math.cos(mid) * labelR,
                ly: geom.cy + geom.oy + Math.sin(mid) * labelR + 4
            };
        }

        pieLabelFont(effectiveDl, perPoint, chart) {
            const labelFont = effectiveDl.font ? Object.assign({}, effectiveDl.font) : {};
            if (perPoint && perPoint.layout && chart.type === 'doughnut') {
                if (!labelFont.size || labelFont.size < 20) {
                    labelFont.size = 36;
                }
                if (labelFont.color === undefined || labelFont.color === '') {
                    labelFont.color = '#555';
                }
            }
            return labelFont;
        }

        drawPieSliceLabel(svg, ns, chart, ser, ctx) {
            const dl = ser.dataLabels;
            const { geom, start, end, v, i, total, labels } = ctx;
            const perPoint = dl && dl.perPoint && dl.perPoint[i];
            if (perPoint && perPoint.deleted) {
                return;
            }
            if ((!dl || !dl.show) && !perPoint) {
                return;
            }
            const effectiveDl = this.mergePieLabelOptions(dl, perPoint);
            const text = this.formatPieLabel({ dl: effectiveDl, ser, v, i, total, labels });
            if (!text) {
                return;
            }
            const { lx, ly } = this.computePieLabelPos(chart, geom, perPoint, start, end, effectiveDl);
            this.drawAxisLabel(svg, ns, {
                x: lx, y: ly, text, anchor: 'middle',
                font: this.pieLabelFont(effectiveDl, perPoint, chart)
            });
        }

        buildPieLegend(chart, ser, total, labels) {
            const legend = document.createElement('div');
            legend.className = 'xlsx-chart-legend';
            for (let i = 0; i < ser.data.length; i++) {
                if (typeof ser.data[i] !== 'number' || ser.data[i] <= 0) {
                    continue;
                }
                const item = document.createElement('span');
                item.className = 'xlsx-chart-legend-item';
                const sw = document.createElement('span');
                sw.className = 'xlsx-chart-legend-swatch';
                sw.style.background = this.chartColor(chart, 0, i);
                item.appendChild(sw);
                const label = document.createElement('span');
                const pct = (ser.data[i] / total * 100).toFixed(1);
                const lbl = labels[i] === undefined ? i + 1 : labels[i];
                label.textContent = `${lbl} (${pct}%)`;
                item.appendChild(label);
                legend.appendChild(item);
            }
            return legend;
        }

        computePieGeometry(chart, W, H) {
            const pl = chart.plotLayout;
            const hasLayout = pl && pl.x !== null && pl.x !== undefined
                && pl.w !== null && pl.w !== undefined;
            let cx;
            let cy;
            let r;
            if (hasLayout) {
                const boxW = pl.w * W;
                const boxH = pl.h * H;
                cx = pl.x * W + boxW / 2;
                cy = pl.y * H + boxH / 2;
                r = Math.min(boxW, boxH) / 2;
            }
            else {
                cx = W / 2;
                cy = H / 2;
                r = Math.min(W, H) / 2 - 20;
            }
            const isDoughnut = chart.type === 'doughnut';
            const holePct = typeof chart.holeSize === 'number' ? chart.holeSize : 50;
            const innerR = isDoughnut ? r * Math.max(0.1, Math.min(0.9, holePct / 100)) : 0;
            return { cx, cy, r, innerR };
        }

        renderPieChart(chart, size) {
            const ns = SVG_NS;
            const W = size && size.w || 420;
            const H = size && size.h || 320;
            const svg = this.createSvg(W, H);
            svg._chart = chart;
            const ser = chart.series[0];
            if (!ser || !ser.data.length) {
                return svg;
            }
            const total = ser.data.reduce((s, v) => s + (typeof v === 'number' && v > 0 ? v : 0), 0);
            if (total <= 0) {
                return svg;
            }
            const { cx, cy, r, innerR } = this.computePieGeometry(chart, W, H);
            const startAngOffset = (chart.firstSliceAng || 0) * Math.PI / 180;
            let start = -Math.PI / 2 + startAngOffset;
            const labels = chart.categories || [];

            for (let i = 0; i < ser.data.length; i++) {
                const v = ser.data[i];
                if (typeof v !== 'number' || v <= 0) {
                    continue;
                }
                const angle = v / total * Math.PI * 2;
                const end = start + angle;
                const mid = (start + end) / 2;
                const { ox, oy } = this.pieSliceOffset(ser, i, mid, r);
                const geom = { cx, cy, r, innerR, ox, oy };
                const d = this.pieSlicePathD(geom, start, end);
                this.drawPieSlicePath(svg, ns, ser, this.chartColor(chart, 0, i), d);
                this.drawPieSliceLabel(svg, ns, chart, ser,
                                       { geom, start, end, v, i, total, labels });
                start = end;
            }

            svg._pieLegend = this.buildPieLegend(chart, ser, total, labels);
            return svg;
        }
    }

    scope.XlsxParser = {
        parseSpreadsheet,
        parseXlsx,
        parseCsv,
        parseSheetRows,
        formatNumber,
        formatDate,
        evaluateFormula,
        indexToColRef,
        MAX_CELLS_PER_SHEET,
        XlsxRenderer
    };
})(typeof window === 'undefined' ? self : window);
