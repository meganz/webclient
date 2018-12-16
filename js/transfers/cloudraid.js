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

    var xhrStack = [];
    var getXMLHttpRequest = function() {
        var idx = xhrStack.length;
        while (idx--) {
            var state = xhrStack[idx].readyState;
            if (state === 4 || state === 0) {
                break;
            }
        }
        // logger.debug('xhrStack', xhrStack.map(x => [x.readyState, x.onloadend, x.onreadystatechange, x.timeout]));

        if (idx < 0) {
            idx = xhrStack.push(new XMLHttpRequest()) - 1;
        }
        return xhrStack[idx];
    };

    var roundUpToMultiple = function(n, factor) {
        return (n + factor - 1) - ((n + factor - 1) % factor);
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
        this.channelLastPauseTime = 0;
        this.resumeChannelCallback = null;

        // raid part number
        this.partNum = partNum;

        // URL of this part's data
        this.baseUrl = baseUrl;

        // network object. reuse for each request for the most chance to reuse sockets.
        // Also so we can cancel everything on error/timeout
        this.xhrInstance = null;
    }

    CloudRaidPartFetcher.prototype = Object.create(null, {constructor: {value: CloudRaidPartFetcher}});
    CloudRaidPartFetcher.prototype.abort = function() {
        var xhr = this.xhrInstance;

        if (xhr) {
            xhr.onreadystatechange = xhr.onloadend = null;
            xhr.abort();
        }
        this.xhrInstance = null;

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
     * Downloads files that are stored in 'Cloud Raid' which means files are split into 5 pieces across 6 servers.
     * 5 data channels and one that is the xor of the others. Each 16 byte file sector is distributed across the
     * servers in round robin fashion.  Any 5 of the 6 sectors at a given point in the file are enough to
     * reconstitute the file data at that point.
     *
     * Strategy:  First try to download 6 channels at once for maximum download speed.
     *            In case of a failure on any channel, fall back to download from the other 5 channels only
     *            If one of those channels fails, try to use the other 5 (by reusing the originally failed channel)
     *            Provided we can continue reading data, the fails will not cause the download to stop. If we can't
     *            get data from the other channel though, the download will stop. If the 5 channel goes smoothly
     *            for a while (and we were originally using 6 channel), then try to switch back to 6 channel.
     *
     * 6 channel sub-strategy:  Load data from each server in 'chunks'.
     *                          Each channel takes a turn skipping a chunk so that after each channel has loaded
     *                          5 chunks and skipped one, we have loaded 6 chunks of the file overall, though
     *                          each channel has only downloaded 5.
     *
     * 5 channel sub-strategy:  Just use the 5 working channels.
     *                          Each channel downloads a chunk at a time in parallel, no skipped data, and
     *                          the results are combined and processed.
     *
     * Generally:               No channel is allowed to read further ahead of any other channel by more than 2 chunks
     *                          Timeout (10s) when receiving data on a channel is considered a failure.
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

        // we can use this for six as well by specifying -1
        this.initialChannelMode = -1;

        this.sixChannelFailed = false;
        this.lastFailureTime = null;
        this.recoveringFromFail = false;
        this.posToResumeSixChannelAt = null;
        this.startTime = null;
        this.bytesProcessed = 0;
        this.totalRequests = 0;
        this.channelReplyState = 0;

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

        var lid = makeUUID().slice(-8) + ':' + this.fileStartPos + '-' + this.fileEndDeliverPos;
        this.logger = new MegaLogger(lid, logger.options, logger);

        if (!window.cloudRaidDebug) {
            this.logger.debug = function() {};
        }

        if (d) {
            this.logger.info("Initiating CloudRAID Request...", this);
        }

        // Setup CloudRAID Settings inherited between CloudRaidRequest instances.
        var cloudRaidSettings = aDownload.cloudRaidSettings;
        if (!cloudRaidSettings || cloudRaidSettings.baseURLs !== baseURLs) {
            cloudRaidSettings = aDownload.cloudRaidSettings = Object.create(null);
            cloudRaidSettings.baseURLs = baseURLs;
        }
        this.cloudRaidSettings = cloudRaidSettings;

        // Set the initial channel mode
        this.setChannelMode(aFiveChannelsMode);
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

                if (this.response && this.response.byteLength === this.expectedBytes) {
                    resolve(ev);
                }
                else {
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
                this.restart5Channel(this.initialChannelMode);
            }
        },
        abort: {
            value: function _abort() {
                this.cancelAllPieces();
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
    CloudRaidRequest.prototype.RAIDLINESPERCHUNK = 16 * 1024;   // 256k per chunk, as default

    // So typically reading 1.25Mb at a time per channel, and so buffering 6 times that when busy,
    // so taking 7.6Mb in read ahead buffers. Sometimes up to doubling that if a second read occurs
    // on the channel and another channel has not been processed yet.
    CloudRaidRequest.prototype.MAXCHUNKSPERREAD = 5;

    // Don't let any one channel get too far ahead of the others, in case we have a slow one
    CloudRaidRequest.prototype.READAHEADCHUNKSPAUSEPOINT = 8;
    CloudRaidRequest.prototype.READAHEADCHUNKSUNPAUSEPOINT = 4;

    // if the server doesn't respond in a reasonable time, break the wait and reconsider
    CloudRaidRequest.prototype.XHRTIMEOUT = 10000;

    CloudRaidRequest.prototype.ReturnToSixChannelNoErrorsMillisec = 60000;
    CloudRaidRequest.prototype.ReturnToSixChannelMinPercentLeft = 10;
    CloudRaidRequest.prototype.ReturnToSixChannelMinBytesLeft = 10 * 1024 * 1024;

    // We will auto choose 6 or 5 channel based on this.
    // Six channel has more requests for a given size, and the latency matters more at low file sizes.
    CloudRaidRequest.prototype.BytesBelowWhich5ChannelIsFaster = 6 * 1024 * 1024;


    CloudRaidRequest.prototype.setChannelMode = function(aFiveChannelsMode) {

        if (this.cloudRaidSettings.lastFailedChannel !== undefined) {
            this.initialChannelMode = this.cloudRaidSettings.lastFailedChannel;
        }

        if (aFiveChannelsMode !== null) {
            if (aFiveChannelsMode) {
                this.initialChannelMode = Math.floor(Math.random() * this.RAIDPARTS);
            }
        }
        else {
            var sizeBased5Channel = this.expectedBytes < this.BytesBelowWhich5ChannelIsFaster;
            if (sizeBased5Channel) {
                this.logger.debug("5 channel based on size");
                this.initialChannelMode = Math.floor(Math.random() * this.RAIDPARTS);
            }
            else {
                this.logger.debug("6 channel based on size");
            }
        }
    };

    CloudRaidRequest.prototype.onFailure = function(ev, partNum) {
        var self = this;
        var xhr = ev.target;
        var status = xhr.readyState > 1 && xhr.status;

        // no need to report fails when we shut down XFRs ourselves.
        if (this.recoveringFromFail) {
            return;
        }

        this.recoveringFromFail = true;
        this.part[partNum].failCount++;
        this.lastFailureTime = Date.now();
        this.posToResumeSixChannelAt = null;

        if (d) {
            this.logger.warn("Recovering from fail, part %s (%s)", partNum, ev.type,
                this.part[0].failCount, this.part[1].failCount, this.part[2].failCount,
                this.part[3].failCount, this.part[4].failCount, this.part[5].failCount);
        }

        this.cloudRaidSettings.lastFailedChannel = partNum;

        var sumFails = 0;
        for (var i = this.RAIDPARTS; i--;) {
            sumFails += this.part[i].failCount;
        }

        if (sumFails > 2 || status !== 200) {
            // three fails across all channels, when any data received would reset the count on that channel
            if (d) {
                this.logger.error("%s, aborting chunk download and retrying...",
                    sumFails > 2 ? 'too many fails' : 'network error', ev);
            }
            this.status = status | 0;
            return this.dispatchLoadEnd();
        }

        // only report and cancel everything once, cancelling will cause more callbacks here.
        if (this.sixChannelFailed) {
            if (d) {
                this.logger.log("five channel download failed, part %s reason: %s." +
                    " Restart 5 channel", partNum, ev.type);
            }
        }
        else {
            if (d) {
                this.logger.log("six channel download failed, part %s reason: %s." +
                    " Failing over to 5 channel", partNum, ev.type);
            }
            this.sixChannelFailed = true;
        }

        // delay allows for XFRs callbacks to complete
        onIdle(function() {
            self.restart5Channel(partNum);
        });

        this.cancelAllPieces();
    };

    CloudRaidRequest.prototype.cancelAllPieces = function() {
        // shut down all xfr and paused channels
        for (var i = this.RAIDPARTS; i--;) {
            this.part[i].abort().resumeChannelCallback = null;
        }
    };

    CloudRaidRequest.prototype.dispatchLoadEnd = function() {
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

    CloudRaidRequest.prototype.restart5Channel = function(failedPartNum) {
        var i;
        this.recoveringFromFail = false;

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

        this.loadPart(partNum, partStartPos, partSize, skipStrategy);
    };


    CloudRaidRequest.prototype.calcFilePartSize = function(part, filesize) {
        // compute the size of this raid part based on the original file size len
        var r = filesize % this.RAIDLINE;
        var t = Math.min(this.RAIDSECTOR, Math.max(0, r - (part - (part === 0 ? 0 : 1)) * this.RAIDSECTOR));

        return (filesize - r) / (this.RAIDPARTS - 1) + t;
    };


    CloudRaidRequest.prototype.recoverFromParity = function(target, buffers, offset, len) {
        // target is already initialised to 0 so we can xor directly into it
        for (var i = this.RAIDPARTS; i--;) {
            if (buffers[i] !== null && !buffers[i].skipped) {
                var minlen = Math.min(buffers[i].buffer.byteLength - offset, len);
                if (minlen > 0) {
                    var b = new Uint8Array(buffers[i].buffer, offset, minlen);
                    for (var p = minlen; p--;) {
                        target[p] ^= b[p];
                    }
                }
            }
        }
    };

    CloudRaidRequest.prototype.getInputBuffer = function(piecesToProcess) {
        var i;
        var piecesToProcessPartPos = 0;
        var piecesToProcessSumSize = 0;

        for (i = this.RAIDPARTS; i--;) {
            if (piecesToProcess[i]) {
                piecesToProcessPartPos = piecesToProcess[i].partpos;
                if (i) {
                    piecesToProcessSumSize += piecesToProcess[i].buffer.byteLength;
                }
            }
        }

        // Number of data lines to process this time.
        // The end of the file may not be a whole number of datalines, but the ones prior are.
        var datalines = roundUpToMultiple(piecesToProcessSumSize, this.RAIDLINE) / this.RAIDLINE;

        var partpos = piecesToProcessPartPos;
        var dataremaining = piecesToProcessSumSize;
        var fileBuf = new ArrayBuffer(piecesToProcessSumSize);

        for (var dataline = 0; dataline < datalines; ++dataline) {
            for (i = 1; i < this.RAIDPARTS; i++) {
                var s = Math.min(dataremaining, this.RAIDSECTOR);

                if (s > 0 && piecesToProcess[i]) {
                    var target = new Uint8Array(fileBuf, dataline * this.RAIDLINE + (i - 1) * this.RAIDSECTOR, s);

                    if (piecesToProcess[i].skipped) {
                        this.recoverFromParity(target, piecesToProcess, partpos - piecesToProcessPartPos, s);
                    }
                    else {
                        if (d > 2) {
                            var bufLen = piecesToProcess[i].buffer.byteLength;
                            this.logger.debug("source part %d, buf:%s offset:%s len:%s dataline:%s dataremaining:%s",
                                i, bufLen, (partpos - piecesToProcessPartPos), s, dataline, dataremaining);
                        }

                        var source = new Uint8Array(piecesToProcess[i].buffer, partpos - piecesToProcessPartPos, s);
                        target.set(source);
                    }

                    dataremaining -= s;
                }
            }

            partpos += this.RAIDSECTOR;
        }

        return fileBuf;
    };

    CloudRaidRequest.prototype.combineSectors = function(piecesToProcess) {
        var skipFileBack = 0;
        var skipFileFront = 0;
        var fileBuf = this.getInputBuffer(piecesToProcess);

        // chop off any excess data after the last dataline has been xor'd
        if (this.outputByteCount + fileBuf.byteLength >= (this.fileEndReadPos - this.fileStartPos)) {
            skipFileBack = this.fileEndReadPos - this.fileEndDeliverPos;
        }

        if (this.skipBeginningData > 0) {
            skipFileFront = this.skipBeginningData; // it's always less than one raidline
            this.skipBeginningData = 0;
        }

        var deliveredByteLen = fileBuf.byteLength - skipFileBack - skipFileFront;
        var dataToDeliver = fileBuf.slice(skipFileFront, skipFileFront + deliveredByteLen);

        if (d) {
            this.logger.debug('combineSectors', [dataToDeliver], [this.response]);
        }

        if (this.response.byteLength) {
            var tmp = new Uint8Array(this.response.byteLength + dataToDeliver.byteLength);
            tmp.set(new Uint8Array(this.response), 0);
            tmp.set(new Uint8Array(dataToDeliver), this.response.byteLength);
            this.response = tmp.buffer;
        }
        else {
            this.response = dataToDeliver;
        }

        this.outputByteCount += deliveredByteLen;
        this.wholeFileDatalinePos += fileBuf.byteLength;

        if (this.response.byteLength === this.expectedBytes) {
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

            onIdle(this.dispatchLoadEnd.bind(this));
        }

        // Consider if we should try to go back to six channel after errors stop. Must have been a
        // while since the last one, and still have plenty of the file left to go (more than 10% or 10 meg)
        if (this.posToResumeSixChannelAt === null && this.sixChannelFailed
            && this.lastFailureTime + this.ReturnToSixChannelNoErrorsMillisec < Date.now()) {

            var readSize = this.fileEndReadPos - this.fileStartPos;
            var fileLeft = this.fileEndReadPos - this.wholeFileDatalinePos;

            if (fileLeft * 100 / readSize > this.ReturnToSixChannelMinPercentLeft
                && fileLeft > this.ReturnToSixChannelMinBytesLeft && readSize > 0) {

                // well ahead of any point any channel has read to so far.
                this.posToResumeSixChannelAt = (
                    (this.wholeFileDatalinePos / (this.RAIDPARTS - 1))
                    + (this.MAXCHUNKSPERREAD + this.READAHEADCHUNKSPAUSEPOINT) * 2
                    * this.RAIDLINESPERCHUNK * this.RAIDSECTOR
                );
                this.sixChannelFailed = false;

                if (d) {
                    this.logger.debug("attempting to return to 6 channel, " +
                        "when we get to part pos %s", this.posToResumeSixChannelAt);
                }
            }
        }
    };

    CloudRaidRequest.prototype.resumeChannels = function() {
        // resume any channels that were paused due to getting too far ahead
        for (var i = this.RAIDPARTS; i--;) {
            if (this.part[i].resumeChannelCallback) {
                this.part[i].resumeChannelCallback();
            }
        }
    };

    CloudRaidRequest.prototype.queueReceivedPiece = function(partNum, piece) {
        var i;
        var gotNextChunkAllPieces = true;

        this.part[partNum].filePieces.push(piece);

        for (i = this.RAIDPARTS; i--;) {
            if (!this.part[i].filePieces.length) {
                // at least one piece at the current position hasn't arrived yet
                gotNextChunkAllPieces = false;
                break;
            }
        }

        if (gotNextChunkAllPieces) {
            var piecesToProcess = [];

            for (i = 0; i < this.RAIDPARTS; ++i) {
                piecesToProcess.push(this.part[i].filePieces.shift());
            }
            this.combineSectors(piecesToProcess);
        }
    };

    CloudRaidRequest.prototype.loadPartNotTooFarAhead = function(partNum, pos, partsize, skipchunkcount) {
        var datalineInParts = this.wholeFileDatalinePos / (this.RAIDPARTS - 1);

        if (this.part[partNum].resumeChannelCallback !== null) {
            // don't unpause too soon or the request will be for a small amount of data, and result in many round trips
            if (datalineInParts + this.RAIDLINESPERCHUNK * this.RAIDSECTOR * this.READAHEADCHUNKSUNPAUSEPOINT <= pos) {
                // stay paused
                return;
            }
            this.part[partNum].resumeChannelCallback = null;

            if (skipchunkcount !== -2) {
                // don't count these if it's the inactive channel in a 5 channel download
                this.part[partNum].channelPauseMillisec += performance.now() - this.part[partNum].channelLastPauseTime;

                if (d) {
                    this.logger.debug("resuming channel %s part pos %s (part dataline %s) count %s ms:%s sum ms:%s",
                        partNum, pos, datalineInParts, this.part[partNum].channelPauseCount,
                        (performance.now() - this.part[partNum].channelLastPauseTime),
                        this.part[partNum].channelPauseMillisec);
                }
            }
        }

        // prevent fast channels getting too far ahead of slow channels as that will use a lot of buffer space
        // no more than 2 chunks ahead of the point that all channels have achieved
        if (pos >= datalineInParts + this.RAIDLINESPERCHUNK * this.RAIDSECTOR * this.READAHEADCHUNKSPAUSEPOINT) {
            // check if it's already paused
            if (this.part[partNum].resumeChannelCallback === null) {
                if (skipchunkcount !== -2) {
                    if (d) {
                        var s = [];
                        for (var i = this.RAIDPARTS; i--;) {
                            var p = this.part[i];
                            s.push(i + ": " + p.lastPos + " " + (p.lastPos - datalineInParts)
                                + " " + (p.lastPos - datalineInParts) / (this.RAIDLINESPERCHUNK * this.RAIDSECTOR));
                        }
                        this.logger.debug("pausing channel %s part pos %s at part dataline %s (%s)",
                            partNum, pos, datalineInParts, s.join('  '));
                    }

                    // don't count these if it's the inactive channel in a 5 channel download
                    this.part[partNum].channelPauseCount += 1;
                    this.part[partNum].channelLastPauseTime = performance.now();
                }

                var self = this;
                this.part[partNum].resumeChannelCallback = function() {
                    self.loadPartNotTooFarAhead(partNum, pos, partsize, skipchunkcount);
                };
            }
        }
        else {
            this.loadPart(partNum, pos, partsize, skipchunkcount);
        }
    };

    CloudRaidRequest.prototype.loadPart = function(partNum, pos, partsize, skipchunkcount) {
        var chunksize;

        if (pos >= partsize) {
            if (partNum > 1) {
                // the very last sector of the last parts could be empty if they are on the chunk boundary,
                // whereas earlier parts have some data in that sector. Parts 0 and 1 will always have
                // the most so no need to do it for them.
                this.queueReceivedPiece(partNum, null);
                this.resumeChannels();
            }
            return;
        }

        if (this.posToResumeSixChannelAt !== null && pos === this.posToResumeSixChannelAt) {
            this.logger.debug("Resuming six channel mechanism for part " + partNum);
            skipchunkcount = partNum;
        }

        // cycling around and skipping every 6th one in 6-part download
        // -1 indicates no skipping, load all data.
        // -2 indicates skipping all which is used when one channel has had a failure
        // -3 indicates we are starting a new download, and the slowest connection to respond should be discarded.
        if (skipchunkcount === 0 || skipchunkcount === -2) {
            chunksize = Math.min(this.RAIDLINESPERCHUNK * this.RAIDSECTOR, partsize - pos);
            this.logger.debug("part %s skipping a piece at pos %s, size %s", partNum, pos, chunksize);

            // skip this chunk, the other 5 channels will load the corresponding parts and we can xor to reassemble
            // fill in the buffer with an empty array to keep the algo simple
            var filePiece = {skipped: true, partpos: pos, buffer: new ArrayBuffer(chunksize)};
            this.part[partNum].lastPos = pos + filePiece.buffer.byteLength;
            this.queueReceivedPiece(partNum, filePiece);
            this.resumeChannels();
            this.loadPartNotTooFarAhead(
                partNum, pos + filePiece.buffer.byteLength, partsize,
                skipchunkcount < 0
                    ? skipchunkcount
                    : ((skipchunkcount + this.RAIDPARTS - 1) % this.RAIDPARTS)
            );
            return;
        }

        // see if we can read multiple chunks ahead to reduce round trips
        var numChunks = this.MAXCHUNKSPERREAD;
        if (skipchunkcount >= 0) {
            // limit to next skip point
            numChunks = Math.min(this.MAXCHUNKSPERREAD, skipchunkcount);
        }

        if (d) {
            this.logger.debug("part %s reading ahead up to %s chunks", partNum, numChunks);
        }

        var partBytesPerChunk = this.RAIDLINESPERCHUNK * this.RAIDSECTOR;
        chunksize = Math.min(numChunks * partBytesPerChunk, partsize - pos);
        if (this.posToResumeSixChannelAt !== null && pos < this.posToResumeSixChannelAt) {
            chunksize = Math.min(chunksize, this.posToResumeSixChannelAt - pos);
        }

        // all channels start at the same pos, and if skipchunkcount === -3 then this is the first chunk for all
        var restartMiaPos = pos;

        var self = this;
        var part = self.part[partNum];
        var xhr = getXMLHttpRequest();
        part.xhrInstance = xhr;

        xhr.onreadystatechange = function(ev) {
            var state = ev.target.readyState;

            // Check whether we do need to drop the slowest channel/connection.
            if (state === XMLHttpRequest.HEADERS_RECEIVED && skipchunkcount === -3 && self.channelReplyState !== 63) {
                var mia = -1;

                self.channelReplyState |= (1 << partNum);

                for (var i = self.RAIDPARTS; i--;) {
                    if ((self.channelReplyState | (1 << i)) === 63) {
                        mia = i;
                    }
                }

                if (mia !== -1) {
                    self.logger.info("Slowest channel was %s, closing it.", mia);
                    self.cloudRaidSettings.lastFailedChannel = mia;

                    self.part[mia].abort();
                    self.channelReplyState = 63;
                    self.initialChannelMode = mia;
                    self.loadPart(mia, restartMiaPos, self.calcFilePartSize(mia, self.fileEndReadPos), -2);
                }
            }

            if (state === XMLHttpRequest.DONE) {
                if (ev.target.status !== 200) {
                    self.onFailure(ev, partNum);
                }
            }
            else if (state > self.readyState) {
                self.dispatchEvent('readystatechange', state);
            }
        };

        xhr.onloadend = function(ev) {
            var xhr = ev.target;
            var buffer = xhr.response || false;

            part.abort();
            self.bytesProcessed += buffer.byteLength || 0;

            // self.logger.warn('loadend', partNum, [buffer], self.bytesProcessed);

            if (buffer.byteLength !== chunksize) {
                return self.onFailure(ev, partNum);
            }

            if (part.failCount) {
                // data arrived, so consider this one error-free
                part.failCount = 0;

                if (d) {
                    self.logger.debug("Reset fail count on part %s.", partNum,
                        self.part[0].failCount, self.part[1].failCount, self.part[2].failCount,
                        self.part[3].failCount, self.part[4].failCount, self.part[5].failCount);
                }
            }

            for (var i = 0; i * partBytesPerChunk < buffer.byteLength; ++i) {
                var offset = i * partBytesPerChunk;
                var length = Math.min(partBytesPerChunk, buffer.byteLength - i * partBytesPerChunk);
                var filePiece = {
                    skipped: false,
                    partpos: pos + i * partBytesPerChunk,
                    buffer: buffer.slice(offset, offset + length)
                };
                part.lastPos = pos + filePiece.buffer.byteLength;
                self.queueReceivedPiece(partNum, filePiece);
            }

            if (self.onprogress && self.response.byteLength) {
                self.dispatchEvent('progress', {
                    lengthComputable: 1,
                    total: self.expectedBytes,
                    loaded: self.response.byteLength
                });
            }

            // resume after processing all chunks, as we might be able to request a larger amount per channel
            self.resumeChannels();

            self.loadPartNotTooFarAhead(
                partNum, pos + buffer.byteLength, partsize,
                skipchunkcount < 0
                    ? skipchunkcount
                    : ((skipchunkcount + numChunks * (self.RAIDPARTS - 1)) % self.RAIDPARTS)
            );
        };

        var pieceUrl = part.baseUrl + "/" + pos + "-" + (pos + chunksize - 1);

        if (d) {
            this.logger.debug("Part %s pos: %s chunks: %s of total: %s",
                partNum, pos, chunksize / partBytesPerChunk, partsize, pieceUrl);
        }

        this.totalRequests++;
        this.channelReplyState = 0;

        xhr.open("GET", pieceUrl);
        xhr.timeout = this.XHRTIMEOUT;
        xhr.responseType = "arraybuffer";
        xhr.send();
    };

    Object.freeze(CloudRaidRequest.prototype);
    Object.defineProperty(global, 'CloudRaidRequest', {value: Object.freeze(CloudRaidRequest)});

})(self);
