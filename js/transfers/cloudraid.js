/* ***************** BEGIN MEGA LIMITED CODE REVIEW LICENCE *****************
 *
 * Copyright (c) 2018 by Mega Limited, Auckland, New Zealand
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

(function megaCloudRaid(global) {
    'use strict';

    var logger = MegaLogger.getLogger('cloudraid');
    logger.options.levelColors = {
        'ERROR': '#d90007',
        'DEBUG': '#9591a7',
        'WARN': '#ebb200',
        'INFO': '#818dff',
        'LOG': '#808f8d'
    };

    var roundUpToMultiple = function(n, factor) {
        return (n + factor - 1) - ((n + factor - 1) % factor);
    };

    var roundDownToMultiple = function (n, factor) {
        return n - (n % factor);
    };

    /**
     * Helper class for CloudRaidRequest, keeps the data per channel in one instance.
     * @param {Number} partNum Raid part number
     * @param {String} baseUrl The URL to the storage server.
     * @constructor
     * @private
     */
    function CloudRaidPartFetcher(partNum, baseUrl) {

        // each chunk of part data downloaded is appended here
        this.filePieces = [];

        // increments on any fail.  Receiving data successfully resets it to 0
        this.failCount = 0;

        // track where each part has gotten to in the overall part of the file
        this.lastPos = 0;

        // channel is paused if it gets more than 3 chunks ahead of the
        // slowest channel, to avoid using too much memory for buffers
        this.channelPauseCount = 0;
        this.channelPauseMillisec = 0;
        this.timedout = false;
        this.readTimeoutId = null;
        this.delayedinitialconnect = null;

        // raid part number
        this.partNum = partNum;

        // URL of this part's data
        this.baseUrl = baseUrl;

        // AbortController lets us terminate a fetch() operation (eg. on timeout). We can't reuse it after
        // it's been signalled though, eg timeout on this part, then another, then back to this one
        this.abortController = null;
        this.signal = null;
        this.reader = null;
        this.reading = false;
        this.done = false;

        // Whether abort was signalled from the higher layer.
        this.highlevelabort = false;
    }

    CloudRaidPartFetcher.prototype = Object.create(null, {constructor: {value: CloudRaidPartFetcher}});
    CloudRaidPartFetcher.prototype.abort = function() {

        if (this.abortController) {
            this.abortController.abort();
            this.abortController = false;
        }

        if (this.delayedinitialconnect) {
            clearTimeout(this.delayedinitialconnect);
            this.delayedinitialconnect = false;
        }

        this.done = false;
        this.signal = false;
        this.reader = false;
        this.reading = false;
        this.timedout = false;

        return this;
    };
    Object.freeze(CloudRaidPartFetcher.prototype);


    /**
     * CloudRaidRequest
     * @param {Object} aDownload The download object, containing the 'g' reply
     * @param {Number} [aStartOffset] Offset from where to start downloading
     * @param {Number} [aEndOffset] Download data up to this offset
     * @param {*} [aFiveChannelsMode] 5-channel mode strategy.
     * @constructor
     *
     * Downloads CloudRAID files, which means files are split into 5 pieces + XOR, across 6 servers.
     * Each 16 byte file sector is distributed across the servers in round robin fashion.
     * Any 5 of the 6 sectors at a given point in the file are enough to reconstitute the file data at that point.
     *
     * Strategy:  First try to download 6 channels, and drop the slowest-to-respond channel.
     *            Build the file from the 5. In case of a failure or timeout on any channel,
     *            stop using that channel and use the currently unused one.
     */
    function CloudRaidRequest(aDownload, aStartOffset, aEndOffset, aFiveChannelsMode) {
        var baseURLs = aDownload.url || aDownload.g;
        var fileSize = aDownload.size || aDownload.s;

        this.response = false;
        this.outputByteCount = 0;
        this.wholeFileDatalinePos = 0;

        // Only known once the download is initialised
        this.fullFileSize = 0;

        // Only deliver data from this position in the file onwards (0-based)
        this.fileStartPos = 0;

        // Only read data up to this position in the file (exclusive, 0-based).
        // We may need to read data past the fileEndDeliverPos so that we can get enough data to xor the last sector
        this.fileEndReadPos = 0;

        // Only deliver data up to this position in the file (exclusive, 0-based)
        this.fileEndDeliverPos = 0;

        // starts at -1, indicating we are trying 6 channels, and we will abandon the slowest.
        // once we get the headers for 5 of the channels, it is the channel number that is not being fetched
        this.initialChannelMode = -1;

        this.lastFailureTime = null;
        this.startTime = null;
        this.bytesProcessed = 0;
        this.totalRequests = 0;
        this.channelReplyState = 0;
        this.finished = false;

        // XMLHttpRequest properties
        this.status = 0;
        this.upload = this;
        this.readyState = XMLHttpRequest.UNSENT;

        this.part = [];
        for (var i = this.RAIDPARTS; i--;) {
            this.part[i] = new CloudRaidPartFetcher(i, baseURLs[i]);
        }

        if (aStartOffset === undefined) {
            aEndOffset = -1;
            aStartOffset = 0;
        }

        this.fullFileSize = fileSize;
        this.fileStartPos = aStartOffset;
        this.startTime = performance.now();
        this.fileEndDeliverPos = (aEndOffset === -1 ? this.fullFileSize : aEndOffset);
        this.fileEndReadPos = Math.min(this.fullFileSize, roundUpToMultiple(this.fileEndDeliverPos, this.RAIDLINE));
        this.wholeFileDatalinePos = (this.fileStartPos - (this.fileStartPos % this.RAIDLINE));
        this.expectedBytes = this.fileEndDeliverPos - this.fileStartPos;

        // skip this amount of data in the first raid line to start at requested byte
        this.skipBeginningData = this.fileStartPos - this.wholeFileDatalinePos;

        // Setup CloudRAID Settings inherited between CloudRaidRequest instances.
        var cloudRaidSettings = aDownload.cloudRaidSettings;
        if (!cloudRaidSettings || cloudRaidSettings.baseURLs !== baseURLs) {
            cloudRaidSettings = aDownload.cloudRaidSettings = Object.create(null);
            cloudRaidSettings.baseURLs = baseURLs;
            cloudRaidSettings.onFails = 0;
            cloudRaidSettings.timeouts = 0;
            cloudRaidSettings.toomanyfails = 0;
            cloudRaidSettings.startglitches = 0;
        }
        this.cloudRaidSettings = cloudRaidSettings;

        // Set the initial channel mode if we already know which server is slowest
        if (this.cloudRaidSettings.lastFailedChannel !== undefined) {
            this.initialChannelMode = this.cloudRaidSettings.lastFailedChannel;
        }

        var lid = false;
        if (d) {
            var uuid = makeUUID();
            lid = cloudRaidSettings.iid || ((aDownload.id || aDownload.handle) + uuid.substr(-13, 5));
            cloudRaidSettings.iid = lid;
            lid += '-' + uuid.slice(-6) + ':' + this.fileStartPos + '-' + this.fileEndDeliverPos;
        }
        this.logger = new MegaLogger(lid, logger.options, logger);

        if (!window.cloudRaidDebug) {
            this.logger.debug = function() {};
        }

        if (d) {
            this.logger.info("Initiating CloudRAID Request...", this);
        }
    }

    /**
     * Promise-based CloudRaidRequest fetcher helper
     * @param {Object} aData An object containing the 'g' reply
     * @param {Number} [aStartOffset] Offset from where to start downloading
     * @param {Number} [aEndOffset] Download data up to this offset
     * @param {Function} [aProgress] Progressing function
     * @returns {Promise}
     */
    CloudRaidRequest.fetch = function(aData, aStartOffset, aEndOffset, aProgress) {
        return new Promise(function(resolve, reject) {
            var xhr = new CloudRaidRequest(aData, aStartOffset, aEndOffset);

            xhr.onloadend = function(ev) {

                if (this.outputByteCount === this.expectedBytes) {
                    resolve(ev);
                }
                else {
                    this.response = false;
                    reject(ev);
                }

                // cleanup
                this.abort();
            };

            xhr.onprogress = aProgress || null;
            xhr.send();
        });
    };

    CloudRaidRequest.prototype = Object.create(null, {
        constructor: {
            value: CloudRaidRequest
        },
        open: {
            value: function _open() {
                this.readyState = XMLHttpRequest.OPENED;
            }
        },
        send: {
            value: function _send() {
                this.startTime = performance.now();
                this.start5Channel(this.initialChannelMode);
            }
        },
        abort: {
            value: function _abort() {

                this.highlevelabort = true;
                for (var i = this.RAIDPARTS; i--;) {
                    this.part[i].abort();
                }

                this.dispatchEvent('abort', XMLHttpRequest.DONE);
                this.readyState = XMLHttpRequest.UNSENT;
            }
        },
        dispatchEvent: {
            value: tryCatch(function _dispatchEvent(name, state, data) {
                if (d) {
                    this.logger.debug('dispatchEvent', name, state, data, this.readyState);
                }

                if (typeof state !== 'number') {
                    data = state;
                }
                else {
                    this.readyState = state;
                }

                if (typeof this['on' + name] === 'function') {
                    var ev = new $.Event(name);
                    ev.target = this;

                    if (typeof data === 'object') {
                        Object.assign(ev, data);
                    }
                    this['on' + name].call(this, ev);
                }
            })
        }
    });

    CloudRaidRequest.prototype.RAIDPARTS = 6;
    CloudRaidRequest.prototype.RAIDSECTOR = 16;
    CloudRaidRequest.prototype.RAIDLINE = 16 * 5;

    // With slow data speeds, and/or high cpu, we may not see data
    // from a working fetch for over 40 seconds (experimentally determined)
    CloudRaidRequest.prototype.FETCH_DATA_TIMEOUT_MS = 115000;

    // Switch source for received http error codes.
    CloudRaidRequest.prototype.EC_SWITCH_SOURCE = {408: 1, 409: 1, 429: 1, 503: 1};

    CloudRaidRequest.prototype.onPartFailure = function(failedPartNum, partStatus) {
        var self = this;

        this.cloudRaidSettings.onFails += 1;

        this.part[failedPartNum].failCount++;
        this.lastFailureTime = Date.now();

        if (d) {
            this.logger.warn("Recovering from fail, part %s", failedPartNum,
                this.part[0].failCount, this.part[1].failCount, this.part[2].failCount,
                this.part[3].failCount, this.part[4].failCount, this.part[5].failCount);
        }

        this.cloudRaidSettings.lastFailedChannel = failedPartNum;

        var sumFails = 0;
        for (var i = this.RAIDPARTS; i--;) {
            sumFails += this.part[i].failCount;
        }

        if (sumFails > 2 || partStatus > 200 && !this.EC_SWITCH_SOURCE[partStatus | 0]) {
            // three fails across all channels, when any data received would reset the count on that channel
            if (d) {
                this.logger.error("%s, aborting chunk download and retrying...",
                    sumFails > 2 ? 'too many fails' : 'network error');
            }
            this.response = false;
            this.cloudRaidSettings.toomanyfails++;
            return this.dispatchLoadEnd(partStatus);
        }

        var partStartPos = this.wholeFileDatalinePos / (this.RAIDPARTS - 1);

        if (this.initialChannelMode < 0) {
            this.cloudRaidSettings.startglitches += 1;
            // we haven't decided which channel to skip yet.  Eg. on the first 5 connects, this one reports
            // back first with connection refused. in this case, try again but on a bit of a delay.
            // Probably this one will turn out to be the slowest, and be cancelled anyway.
            this.logger.debug("We will retry channel %s shortly...", failedPartNum);

            this.part[failedPartNum].delayedinitialconnect = setTimeout(function() {
                self.startPart(failedPartNum, partStartPos, self.initialChannelMode);
            }, 1000);
        }
        else {
            // turn the faulty channel (which is already stopped) into the idle
            // channel (which already reached the end), and start reading from the old idle channel
            this.logger.debug("Resetting channels %s and %s", this.initialChannelMode, failedPartNum);

            this.part[failedPartNum].filePieces = [];
            this.part[this.initialChannelMode].filePieces = [];
            this.startPart(failedPartNum, partStartPos, failedPartNum);
            this.startPart(this.initialChannelMode, partStartPos, failedPartNum);
            this.initialChannelMode = failedPartNum;
        }

    };

    CloudRaidRequest.prototype.dispatchLoadEnd = function(status) {
        this.status = status | 0;
        this.dispatchEvent('readystatechange', XMLHttpRequest.DONE);
        this.dispatchEvent('loadend');
    };

    CloudRaidRequest.prototype.skipStrategy = function(partNum, failedPartNum) {
        if (failedPartNum === -1) {
            // try 6 but drop the last one to report onloadstart()
            return -3;

            // (not used for now) 6 channel mode, skipping every 6th one starting at the partNum'th
            // return partNum;
        }

        if (partNum === failedPartNum) {
            // skip all since this channel failed last time
            return -2;
        }

        // don't skip any
        return -1;
    };

    CloudRaidRequest.prototype.start5Channel = function (failedPartNum) {
        var i;

        // keep outputpieces that we have so far, of course, but throw away any further
        // chunks we have already as some of them will be 'skipped' and not have actual data
        for (i = this.RAIDPARTS; i--;) {
            this.part[i].filePieces = [];
        }

        // start on a raid line boundary
        var partStartPos = this.wholeFileDatalinePos / (this.RAIDPARTS - 1);

        if (d) {
            this.logger.debug("Begin reading file from position %s, each part from %s",
                this.wholeFileDatalinePos, partStartPos);
        }

        for (i = this.RAIDPARTS; i--;) {
            this.startPart(i, partStartPos, failedPartNum);
        }
    };

    CloudRaidRequest.prototype.startPart = function(partNum, partStartPos, failedPartNum) {
        var partSize = this.calcFilePartSize(partNum, this.fileEndReadPos);
        var skipStrategy = this.skipStrategy(partNum, failedPartNum);

        if (d) {
            if (skipStrategy === -2) {
                this.logger.debug("part %s not downloading", partNum);
            }
            else if (skipStrategy === -1) {
                this.logger.debug("part %s not skipping", partNum);
            }
        }

        this.part[partNum].abort();
        this.loadPart(partNum, partStartPos, partSize, skipStrategy);
    };


    CloudRaidRequest.prototype.calcFilePartSize = function(part, filesize) {
        // compute the size of this raid part based on the original file size len
        var r = filesize % this.RAIDLINE;
        var t = Math.min(this.RAIDSECTOR, Math.max(0, r - (part - (part === 0 ? 0 : 1)) * this.RAIDSECTOR));

        return (filesize - r) / (this.RAIDPARTS - 1) + t;
    };


    CloudRaidRequest.prototype.recoverFromParity = function(target, buffers, offset) {
        // target is already initialised to 0 so we can xor directly into it
        for (var i = this.RAIDPARTS; i--;) {
            if (!buffers[i].skipped) {
                var thisoffset = offset + buffers[i].used;
                var b = buffers[i].buffer.subarray(thisoffset, thisoffset + this.RAIDSECTOR);
                for (var p = this.RAIDSECTOR; p--;) {
                    target[p] ^= b[p];
                }
            }
        }
    };

    CloudRaidRequest.prototype.getInputBuffer = function (piecesPos, piecesLen, pieces) {

        var dataremaining = piecesLen * (this.RAIDPARTS - 1);
        var fileBuf = new ArrayBuffer(dataremaining);
        var datalines = piecesLen / this.RAIDSECTOR;
        var pos = piecesPos;

        for (var dataline = 0; dataline < datalines; ++dataline) {
            for (var i = 1; i < this.RAIDPARTS; i++) {
                var s = Math.min(dataremaining, this.RAIDSECTOR);
                if (s > 0 && pieces[i] !== null) {
                    var target = new Uint8Array(fileBuf, dataline * this.RAIDLINE + (i - 1) * this.RAIDSECTOR, s);

                    if (pieces[i].skipped) {
                        this.recoverFromParity(target, pieces, pos - piecesPos, false);
                    }
                    else {
                        var offset = (pieces[i].used + pos - piecesPos);
                        var source = pieces[i].buffer.subarray(offset, offset + s);
                        target.set(source);
                    }
                    dataremaining -= s;
                }
            }
            pos += this.RAIDSECTOR;
        }
        return fileBuf;
    };

    CloudRaidRequest.prototype.combineSectors = function (piecesPos, piecesLen, pieces, eofexcess) {
        var skipFileBack = eofexcess;
        var skipFileFront = 0;

        var fileBuf = this.getInputBuffer(piecesPos, piecesLen, pieces);

        // chop off any excess data after the last dataline has been xor'd
        if (this.outputByteCount + fileBuf.byteLength - eofexcess >= (this.fileEndReadPos - this.fileStartPos)) {
            skipFileBack += this.fileEndReadPos - this.fileEndDeliverPos;
        }

        if (this.skipBeginningData > 0) {
            skipFileFront = this.skipBeginningData; // it's always less than one raidline
            this.skipBeginningData = 0;
        }

        var deliverByteLen = fileBuf.byteLength - skipFileBack - skipFileFront;
        var dataToDeliver = new Uint8Array(fileBuf, skipFileFront, deliverByteLen);

        // fill in the buffer with the new full-file rows
        if (!this.response) {
            this.response = new Uint8Array(this.expectedBytes);
        }
        this.response.subarray(this.outputByteCount, this.outputByteCount + deliverByteLen).set(dataToDeliver);

        this.outputByteCount += deliverByteLen;
        this.wholeFileDatalinePos += fileBuf.byteLength;

        // notify of progress anytime we construct rows of the original
        // file for smooth data rate display (and avoiding timeouts)
        if (this.outputByteCount && this.onprogress) {
            var progress = this.dispatchEvent.bind(this, 'progress', {
                lengthComputable: 1,
                total: this.expectedBytes,
                loaded: this.outputByteCount
            });
            delay(this.logger.name, progress, 190);
        }

        if (this.outputByteCount === this.expectedBytes) {

            this.finished = true;

            if (d) {
                var channelPauseMs = 0;
                var channelPauseCount = 0;
                var ms = Math.max(1, performance.now() - this.startTime);

                for (var i = this.RAIDPARTS; i--;) {
                    channelPauseMs += this.part[i].channelPauseMillisec;
                    channelPauseCount += this.part[i].channelPauseCount;
                }

                this.logger.log("Chunk complete, %d bytes (Took %dms, %d bytes/sec) " +
                    "bandwidth efficiency: %f, total channel pauses: %d (%dms) - %d requests sent.",
                    this.outputByteCount, ms, this.outputByteCount * 1000 / ms,
                    this.outputByteCount / this.bytesProcessed, channelPauseCount, channelPauseMs, this.totalRequests);
            }

            onIdle(this.dispatchLoadEnd.bind(this, 200));
        }
    };

    CloudRaidRequest.prototype.discardUsedParts = function (piecesize) {
        // remove from the beginning of each part's list of received data
        for (var i = this.RAIDPARTS; i--;) {
            var n = piecesize;
            var fp = this.part[i].filePieces;
            while (n > 0 && fp.length > 0 && (fp[0].buffer.byteLength - fp[0].used <= n)) {
                n -= fp[0].buffer.byteLength - fp[0].used;
                fp.shift();
            }
            if (fp.length > 0) {
                fp[0].used += n;
            }
        }
    };

    CloudRaidRequest.prototype.queueReceivedPiece = function(partNum, piece) {

        this.part[partNum].filePieces.push(piece);

        while (1) {
            var i;
            var fp;
            var tocombine = [];
            var combinesize = 1 << 20;

            for (i = this.RAIDPARTS; i--;) {
                fp = this.part[i].filePieces;

                if (!fp.length) {
                    combinesize = 0;
                }
                else {
                    combinesize = Math.min(combinesize, fp[0].buffer.byteLength - fp[0].used);

                    if ((fp[0].partpos + fp[0].used)*5 != this.wholeFileDatalinePos) {
                        this.logger.error('ERROR: partpos dataline mismatch %s %s %s', (fp[0].partpos + fp[0].used), this.wholeFileDatalinePos, partNum);
                    }
                }
            }

            var fulllinesize = roundDownToMultiple(combinesize, this.RAIDSECTOR);
            var lastline = this.wholeFileDatalinePos >= roundDownToMultiple(this.fileEndReadPos, this.RAIDLINE);

            if (fulllinesize > 0) {

                for (i = 0; i < this.RAIDPARTS; ++i) {
                    tocombine.push(this.part[i].filePieces[0]);
                }

                this.combineSectors(this.wholeFileDatalinePos/5, fulllinesize, tocombine, 0);
                this.discardUsedParts(fulllinesize);
                continue;
            }
            else if (combinesize > 0 || lastline) {

                var part1len = 0;
                var part0len = 0;
                var totalsize = 0;

                for (i = 0; i < this.RAIDPARTS; ++i) {
                    var loaded = 0;
                    var b = new ArrayBuffer(this.RAIDSECTOR);

                    fp = this.part[i].filePieces;
                    for (var j = 0; loaded < this.RAIDSECTOR && j < fp.length; ++j) {
                        var toload = Math.min(fp[j].buffer.byteLength - fp[j].used, this.RAIDSECTOR - loaded);
                        var target = new Uint8Array(b, loaded, toload);
                        var source = fp[j].buffer.subarray(fp[j].used, fp[j].used + toload);
                        target.set(source);
                        loaded += toload;
                    }

                    if (i > 0) {
                        totalsize += loaded;
                    }
                    if (i === 0) {
                        part0len = loaded;
                    }
                    if (i === 1) {
                        part1len = loaded;
                    }

                    tocombine.push({
                        'used': 0,
                        'partpos': this.wholeFileDatalinePos/5,
                        'skipped': !fp.length ? false : fp[0].skipped,
                        'buffer': new Uint8Array(b, 0, this.RAIDSECTOR)
                    });
                }

                if (part1len === part0len && (totalsize === this.RAIDLINE || totalsize === this.fileEndReadPos - this.wholeFileDatalinePos)) {
                    this.combineSectors(
                        this.wholeFileDatalinePos/5, this.RAIDSECTOR, tocombine,
                        (totalsize === this.RAIDLINE) ? 0 : this.RAIDLINE - totalsize
                    );
                    this.discardUsedParts(this.RAIDSECTOR);
                    continue;
                }
            }
            break;
        }
        this.checkReadParts();
    };

    CloudRaidRequest.prototype.checkReadParts = function() {
        var i;
        var part;
        var torequest = [];

        for (i = this.RAIDPARTS; i--;) {
            part = this.part[i];

            if (part.reader && !part.reading && !part.done && (part.pos < this.wholeFileDatalinePos/5 + 81920)) {
                torequest.push(part);
            }
        }

        // read from the most-behind socket first
        torequest.sort(function(a, b) {
            return a.pos - b.pos;
        });

        for (i = 0; i < torequest.length; i++) {
            part = torequest[i];

            if (d > 1) {
                this.logger.debug("part %s reading again from %s", part.partNum, part.pos);
            }
            this.readFetchData(part.partNum);
        }
    };

    CloudRaidRequest.prototype.loadPart = function (partNum, pos, endpos, skipchunkcount) {
        var self = this;
        var part = this.part[partNum];

        if (pos >= endpos) {
            // put one more 0-size piece on the end, which makes it easy to rebuild the last raidline of the file
            if (!this.finished) {
                this.queueReceivedPiece(partNum, {
                    'skipped': false,
                    'used': 0,
                    'partpos': pos,
                    'buffer': new Uint8Array(0)
                });
                part.done = true;
            }
            return;
        }

        var chunksize = endpos - pos;

        // -1 indicates no skipping, load all data.
        // -2 indicates skipping all which is used when one channel has had a failure
        // -3 indicates we are starting a new download, and the slowest connection to respond should be discarded.
        if (skipchunkcount === -2) {
            // skip this chunk, the other 5 channels will load the corresponding parts and we can xor to reassemble
            // fill in the buffer with an empty array to keep the algo simple
            var filePiece = {
                'used': 0,
                'partpos': pos,
                'skipped': true,
                'buffer': new Uint8Array(chunksize)
            };
            this.part[partNum].lastPos = pos + filePiece.buffer.byteLength;
            this.queueReceivedPiece(partNum, filePiece);
            this.loadPart(partNum, pos + filePiece.buffer.byteLength, endpos, skipchunkcount);
            return;
        }

        var pieceUrl = part.baseUrl + "/" + pos + "-" + (pos + chunksize - 1);

        if (d) {
            this.logger.log("Part %s pos: %s chunksize: %s from: %s", partNum, pos, chunksize, pieceUrl);
        }

        this.totalRequests++;

        // Execute the fetch, with continuation functions for each buffer piece that arrives
        part.abortController = new AbortController();
        part.signal = part.abortController.signal;
        part.timedout = false;
        part.pos = pos;
        part.endpos = endpos;
        part.skipchunkcount = skipchunkcount;

        part.reading = true;
        try {
            fetch(pieceUrl, {signal: part.signal})
                .then(function(fetchresponse) {
                    part.reading = false;
                    self.processFetchResponse(partNum, fetchresponse);
                })
                .catch(function(ex) {
                    part.reading = false;
                    self.fetchReadExceptionHandler(ex, partNum);
                });
        }
        catch (ex) {
            part.reading = false;
            self.fetchReadExceptionHandler(ex, partNum);
        }
    };

    CloudRaidRequest.prototype.processFetchResponse = function(partNum, fetchResponse) {

        if (this.readyState < XMLHttpRequest.HEADERS_RECEIVED) {
            this.status = fetchResponse.status | 0;
            this.dispatchEvent('readystatechange', XMLHttpRequest.HEADERS_RECEIVED);
            this.dispatchEvent('readystatechange', XMLHttpRequest.LOADING);
        }

        if (fetchResponse.status !== 200) {
            if (d) {
                this.logger.error("response status: %s %s", fetchResponse.status, fetchResponse.ok);
            }
            this.onPartFailure(partNum, fetchResponse.status);
            return;
        }

        // Check whether we need to drop the slowest channel/connection.
        if (this.part[partNum].skipchunkcount === -3 && this.channelReplyState !== 63) {
            var mia = -1;

            this.channelReplyState |= (1 << partNum);

            if (d) {
                this.logger.debug("received reply on: %s bitfield now: %s", partNum, this.channelReplyState);
            }

            for (var i = this.RAIDPARTS; i--;) {
                if ((this.channelReplyState | (1 << i)) === 63) {
                    mia = i;
                }
            }

            if (mia !== -1) {
                if (d) {
                    this.logger.info("All channels but %s are working, closing channel %s.", mia, mia);
                }
                this.cloudRaidSettings.lastFailedChannel = mia;

                this.part[mia].abort();
                this.channelReplyState = 63;
                this.initialChannelMode = mia;

                // all channels start at the same pos, and if skipchunkcount === -3 then this is
                // the first chunk for all, so that one can generate dummy data from 'pos'.
                this.loadPart(mia, this.part[mia].pos, this.part[mia].endpos, -2);
            }
        }

        // stream the reply body
        this.part[partNum].reader = fetchResponse.body.getReader();
        this.readFetchData(partNum);
    };

    CloudRaidRequest.prototype.readFetchData = function(partNum) {

        var self = this;
        var part = self.part[partNum];

        part.timedout = false;
        part.readTimeoutId = setTimeout(function() {
            part.timedout = true;
            part.abortController.abort();
        }, this.FETCH_DATA_TIMEOUT_MS);

        part.reading = true;

        try {
            part.reader.read()
                .then(function processPartStream(r) {
                    part.reading = false;
                    self.processFetchData(partNum, r.done, r.value);
                })
                .catch(function(ex) {
                    part.reading = false;
                    self.fetchReadExceptionHandler(ex, partNum);
                });
        }
        catch (ex) {
            part.reading = false;
            self.fetchReadExceptionHandler(ex, partNum);
        }
    };

    CloudRaidRequest.prototype.processFetchData = function(partNum, done, value) {

        var part = this.part[partNum];
        clearTimeout(part.readTimeoutId);
        part.readTimeoutId = null;

        if (done) {
            this.loadPart(partNum, part.pos, part.endpos, part.skipchunkcount);
            return;
        }

        if (d > 1) {
            this.logger.debug("Received data on part %s: %s bytes", partNum, value.byteLength);
        }

        var filePiece = {
            'skipped': false,
            'used': 0,
            'partpos': part.pos,
            'buffer': value
        };

        part.pos += value.length;

        this.bytesProcessed += value.length;
        part.lastPos = part.pos;

        if (part.failCount > 0) {
            part.failCount = 0;
            if (d) {
                this.logger.debug("Reset fail count on part %s.", partNum,
                    this.part[0].failCount, this.part[1].failCount, this.part[2].failCount,
                    this.part[3].failCount, this.part[4].failCount, this.part[5].failCount);
            }
        }

        this.queueReceivedPiece(partNum, filePiece);
    };

    CloudRaidRequest.prototype.fetchReadExceptionHandler = function (ex, partNum) {

        var part = this.part[partNum];

        if (part.readTimeoutId !== null) {
            clearTimeout(part.readTimeoutId);
            part.readTimeoutId = null;
        }

        if (ex.name === 'AbortError') {
            if (this.highlevelabort) {
                this.logger.debug("Part %s exiting...", partNum);
            }
            else if (part.timedout) {
                this.cloudRaidSettings.timeouts += 1;
                // switch to the currently idle channel instead, and pick up from there.
                if (d) {
                    this.logger.warn("Timeout on part %s", partNum);
                }
                this.onPartFailure(partNum, 408);
                part.timedout = false;
            }
            else {
                this.logger.debug('Fetch on %s would have been the slowest (or failed).', partNum);
            }
        }
        else {
            if (d) {
                this.logger.warn("Caught exception from fetch on part: %s", partNum, ex);
            }
            this.onPartFailure(partNum, 409);
        }
    };

    Object.freeze(CloudRaidRequest.prototype);
    Object.defineProperty(global, 'CloudRaidRequest', {value: Object.freeze(CloudRaidRequest)});

})(self);
