/**
 * Set transfer status
 * @param {Object} dl The download object
 * @param {String} status The status text
 * @param {Boolean} [ethrow] Throw the exception noted in `status`
 * @param {Number} [lock] Lock the DOM node in the transfers panel.
 * @param {Boolean} [fatalError] Whther invoked from dlFatalEror()
 */
function setTransferStatus(dl, status, ethrow, lock, fatalError) {
    var id = dl && dlmanager.getGID(dl);
    var text = '' + status;

    if (text.length > 56) {
        text = text.substr(0, 56) + "\u2026";
    }

    if (ethrow) {
        fatalError = true;
    }

    if (page === 'download') {
        var $dlTopBar = $('.download.top-bar');
        var $dlMainTNfo = $('.download.main-transfer-info');
        var $dlTopBarErrorBlock = $('.download.main-transfer-error', $dlTopBar);

        if (status === l[20666]) {
            $('.download.error-text', $dlTopBar).addClass('hidden');
            $dlTopBarErrorBlock = $('.download.overquoata-error', $dlTopBar);
        }

        $dlTopBar.addClass('error');
        $('.download.speed-block', $dlTopBar).addClass('hidden');
        $('.download.eta-block', $dlTopBar).addClass('hidden');
        $('.bar-table .progress-block', $dlTopBar).addClass('hidden');

        $dlTopBarErrorBlock
            .removeClass('hidden')
            .attr('title', status)
            .find('span')
            .text(text);

        if (fatalError) {
            $('.mid-pause', $dlTopBar).addClass('hidden');
            $('.default-white-button', $dlMainTNfo).addClass('hidden');
            dlmanager.setBrowserWarningClasses('.download.warning-block', 0, status);
        }
    }
    else {
        if (fatalError) {
            dlmanager.onDownloadFatalError = status;

            if (is_mobile && lock !== 2 && dl) {
                mobile.downloadOverlay.close();
                mobile.messageOverlay.show(status);
            }
        }

        $('.transfer-table #' + id + ' .transfer-status')
            .attr('title', status)
            .text(text);
    }

    if (lock) {
        var $tr = $('.transfer-table #' + id)
            .addClass('transfer-completed')
            .removeClass('transfer-initiliazing')
            .attr('id', 'LOCKed_' + id);

        if (lock === 2) {
            $tr.remove();
        }
    }

    if (ethrow) {
        if (d) {
            console.error(status);
        }
        throw status;
    }
}

/**
 * Notify a download fatal error.
 * @param {Object} dl The download object
 * @param {Object|String} error The error object
 * @param {Boolean} [ethrow] Throw the exception noted in `status`
 * @param {Number} [lock] Lock the DOM node in the transfers panel.
 */
function dlFatalError(dl, error, ethrow, lock) {
    'use strict';

    var awaitingPromise = dl && dl.awaitingPromise;

    // Log the fatal error
    Soon(function() {
        if (awaitingPromise) {
            awaitingPromise.reject(error);
        }
        error = String(Object(error).message || error).replace(/\s+/g, ' ').trim();

        if (error.indexOf(l[16871]) < 0 && error.indexOf(l[16872]) < 0 && error.indexOf(l[1668]) < 0) {
            if (error.indexOf(String(l[5945]).split('[')[0]) > -1) {
                error = '5945, ' + (error.match(/\[(.*)]/) || '  ')[1];
            }
            // srvlog('dlFatalError: ' + error.substr(0, 60) + (window.Incognito ? ' (Incognito)' : ''));
            // ^ Let's stop logging Incognito issues, they are too common and we do have fallback logic anyway
            // Also stop obsolete browsers (e.g. attempting to use FlashIO, sigh) from logging errors
            if (!window.Incognito && mega.es2019 && !/^[\d\s,.]+$/.test(error)) {
                srvlog('dlFatalError: ' + error.substr(0, 72));
            }
        }
    });

    // Set transfer status and abort it
    setTransferStatus(dl, error, ethrow, lock !== undefined ? lock : true, String(error).indexOf(l[1668]) < 0);
    dlmanager.abort(dl);
}

// Quick hack for sane average speed readings
function Speedometer(initialp) {
    if (!(this instanceof Speedometer)) {
        return new Speedometer(initialp);
    }
    this.interval = 200;
    this.num = 300;
    this.prevp = initialp;
    this.h = Object.create(null);
}
Speedometer.prototype.progress = function(p) {
    var now, min, oldest;
    var total;
    var t;

    now = Date.now();
    now -= now % this.interval;

    this.h[now] = (this.h[now] || 0) + p - this.prevp;
    this.prevp = p;

    min = now - this.interval * this.num;

    oldest = now;
    total = 0;

    for (t in this.h) {
        if (t < min) {
            delete this.h.bt;
        }
        else {
            if (t < oldest) {
                oldest = t;
            }
            total += this.h[t];
        }
    }

    if (now - oldest < 1000) {
        return 0;
    }

    p = 1000 * total / (now - oldest);

    // protect against negative returns due to repeated chunks etc.
    return p > 0 ? p : 0;
};

// compute final MAC from block MACs
function condenseMacs(macs, key, initialMac) {
    'use strict';

    var i, j, mblk;
    var mac = initialMac || [0, 0, 0, 0];
    var aes = new sjcl.cipher.aes([key[0], key[1], key[2], key[3]]);

    for (i = 0; i < macs.length; i++) {
        mblk = macs[i];

        for (j = 0; j < mblk.length; j += 4) {
            mac[0] ^= mblk[j];
            mac[1] ^= mblk[j + 1];
            mac[2] ^= mblk[j + 2];
            mac[3] ^= mblk[j + 3];

            mac = aes.encrypt(mac);
        }
    }

    return mac;
}

function chksum(buf) {
    var l, c, d;

    if (have_ab) {
        var ll;

        c = new Uint32Array(3);

        ll = buf.byteLength;

        l = Math.floor(ll / 12);

        ll -= l * 12;

        if (l) {
            l *= 3;
            d = new Uint32Array(buf, 0, l);

            while (l) {
                l -= 3;

                c[0] ^= d[l];
                c[1] ^= d[l + 1];
                c[2] ^= d[l + 2];
            }
        }

        c = new Uint8Array(c.buffer);

        if (ll) {
            d = new Uint8Array(buf, buf.byteLength - ll, ll);

            while (ll--) c[ll] ^= d[ll];
        }
    }
    else {
        c = Array(12);

        for (l = 12; l--;) {
            c[l] = 0;
        }

        for (l = buf.length; l--;) {
            c[l % 12] ^= buf.charCodeAt(l);
        }

    }

    for (d = '', l = 0; l < 12; l++) {
        d += String.fromCharCode(c[l]);
    }

    return d;
}

function setupTransferAnalysis() {
    if ($.mTransferAnalysis || 1) {
        return;
    }
    var PROC_INTERVAL = 4.2 * 60 * 1000;
    var logger = MegaLogger.getLogger('TransferAnalysis');

    var prev = {},
        tlen = {},
        time = {},
        chunks = {};
    $.mTransferAnalysis = setInterval(function() {
        if (uldl_hold || dlmanager.isOverQuota) {
            prev = {};
        }
        else if ($.transferprogress) {
            var tp = $.transferprogress;

            for (var i in tp) {
                if (tp.hasOwnProperty(i)) {
                    var currentlyTransfered = tp[i][0];
                    var totalToBeTransfered = tp[i][1];
                    var currenTransferSpeed = tp[i][2];

                    var finished = (currentlyTransfered === totalToBeTransfered);

                    if (finished) {
                        logger.info('Transfer "%s" has finished. \uD83D\uDC4D', i);
                        continue;
                    }

                    var transfer = Object(GlobalProgress[i]);

                    if (transfer.paused || !transfer.started) {
                        logger.info('Transfer "%s" is not active.', i, transfer);
                        continue;
                    }

                    if (prev[i] && prev[i] === currentlyTransfered) {
                        var type = (i[0] === 'u'
                            ? 'Upload'
                            : (i[0] === 'z' ? 'ZIP' : 'Download'));

                        srvlog(type + ' transfer seems stuck.');

                        logger.warn('Transfer "%s" had no progress for the last minutes...', i, transfer);
                    }
                    else {
                        logger.info('Transfer "%s" is in progress... %d% completed', i,
                            Math.floor(currentlyTransfered / totalToBeTransfered * 100));

                        time[i] = Date.now();
                        tlen[i] = Math.max(tlen[i] | 0, currentlyTransfered);
                        prev[i] = currentlyTransfered;
                    }
                }
            }
        }
    }, PROC_INTERVAL);
}


(function __FileFingerprint(scope) {
    'use strict';
    var CRC_SIZE = 16;
    var BLOCK_SIZE = CRC_SIZE * 4;
    var MAX_TSINT = Math.pow(2, 32) - 1;

    function i2s(i) {
        return String.fromCharCode.call(String,
            i >> 24 & 0xff,
            i >> 16 & 0xff,
            i >> 8 & 0xff,
            i & 0xff);
    }

    function serialize(v) {
        var p = 0,
            b = [];
        v = Math.min(MAX_TSINT, parseInt(v));
        while (v > 0) {
            b[++p] = String.fromCharCode(v & 0xff);
            v >>>= 8;
        }
        b[0] = String.fromCharCode(p);
        return b.join("");
    }

    function makeCRCTable() {
        var c, crcTable = [];

        for (var n = 0; n < 256; ++n) {
            c = n;

            for (var k = 0; k < 8; ++k) {
                c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
            }

            crcTable[n] = c;
        }

        return crcTable;
    }

    function crc32(str, crc, len) {
        crc = crc ^ (-1);

        for (var i = 0; i < len; ++i) {
            crc = (crc >>> 8) ^ crc32table[(crc ^ str.charCodeAt(i)) & 0xFF];
        }

        return (crc ^ (-1)) >>> 0;
    }

    /**
     * Generate file fingerprint.
     * @param {File} file The file entry.
     * @returns {Promise}
     * @global
     */
    scope.getFingerprint = function(file) {
        return new Promise(function(resolve, reject) {
            var logger = d && new MegaLogger('fingerprint:'
                + file.size + ':..' + String(file.name).substr(-8), false, ulmanager.logger);

            if (!(file instanceof Blob && file.name)) {
                if (d) {
                    logger.debug('CHECK THIS', 'Unable to generate fingerprint..', [file]);
                    logger.debug('CHECK THIS', 'Invalid file entry', JSON.stringify(file));
                }
                return reject(new Error('Invalid file entry.'));
            }

            if (file.hash && file.ts) {
                if (d) {
                    logger.debug('Skipping file fingerprint, does already exists...');
                }
                return resolve({hash: file.hash, ts: file.ts});
            }

            if (d) {
                logger.info('Generating fingerprint...', file.name, [file]);
            }

            var size = file.size;
            var reader = new FileReader();
            reader.ab = !reader.readAsBinaryString;
            reader.errorCount = 0;

            crc32table = scope.crc32table || (scope.crc32table = makeCRCTable());
            if (crc32table[1] !== 0x77073096) {
                throw new Error('Unexpected CRC32 Table...');
            }

            var timer;
            var resetTimeout = function(abort) {
                if (timer) {
                    clearTimeout(timer);
                    timer = false;
                }
                if (!abort) {
                    timer = setTimeout(function() {
                        if (d) {
                            logger.warn('Fingerprint timed out, the file is locked or unreadable.');
                        }
                        reject(0x8052000e);
                    }, 6e4);
                }
            };

            var finish = function(crc) {
                resetTimeout(1);
                var ts = (file.lastModifiedDate || file.lastModified || 0) / 1000;
                resolve({hash: base64urlencode(crc + serialize(ts)), ts: ts});
            };

            var readBlock = function(blob, callback) {
                resetTimeout();
                reader.onloadend = tryCatch(function(ev) {
                    var target = ev.target;
                    var error = target.error;

                    resetTimeout(1);
                    reader.onloadend = null;

                    if (error) {
                        if (++reader.errorCount > 10) {
                            return reject(error);
                        }

                        if (d) {
                            logger.warn('Failed to read block (%s), retrying...', error.name, [error]);
                        }
                        setTimeout(readBlock.bind(null, blob, callback), 4e3);
                    }
                    else {
                        onIdle(callback.bind(null, reader.ab ? ab_to_str(target.result) : target.result));
                    }
                }, reject);

                if (reader.ab) {
                    reader.readAsArrayBuffer(blob);
                }
                else {
                    reader.readAsBinaryString(blob);
                }
            };

            if (size <= 8192) {
                return readBlock(file, function(data) {
                    var i;
                    var crc;

                    if (size <= CRC_SIZE) {
                        crc = data;
                        i = CRC_SIZE - crc.length;
                        while (i--) {
                            crc += "\x00";
                        }
                    }
                    else {
                        var tmp = [];

                        for (i = 0; i < 4; i++) {
                            var begin = parseInt(i * size / 4);
                            var len = parseInt(((i + 1) * size / 4) - begin);

                            tmp.push(i2s(crc32(data.substr(begin, len), 0, len)));
                        }

                        crc = tmp.join("");
                    }

                    finish(crc);
                });
            }

            var idx = 0;
            var max = 4;
            var tmp = [];
            var blocks = parseInt(8192 / (BLOCK_SIZE * 4));
            var sliceFn = file.slice ? 'slice' : (file.mozSlice ? 'mozSlice' : 'webkitSlice');

            (function step() {
                if (max === idx) {
                    return finish(tmp.join(""));
                }

                var blk = 0;
                var crc = 0;
                (function next() {
                    if (blocks === blk) {
                        tmp.push(i2s(crc));
                        return step(++idx);
                    }
                    if (typeof file[sliceFn] !== 'function') {
                        return reject(new Error(sliceFn + ' unavailable'));
                    }

                    var offset = parseInt((size - BLOCK_SIZE) * (idx * blocks + blk) / (4 * blocks - 1));

                    readBlock(file[sliceFn](offset, offset + BLOCK_SIZE), function(block) {
                        crc = crc32(block, crc, BLOCK_SIZE);
                        next(++blk);
                    });
                })();
            })();
        });
    };
})(self);
