/* ***************** BEGIN MEGA LIMITED CODE REVIEW LICENCE *****************
 *
 * Copyright (c) 2025 by Mega Limited, Auckland, New Zealand
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
 *    AND YOURS AND IS NOT MADE AVAILABE FOR CONSUMER USE OR ANY OTHER USE
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

// WebSocket uploading v0.95
//
// FIXME: add logic to give up on/retry uploads that are too slow or run into too many connection/CRC failures

/** @property mega.wsuploadmgr */
lazy(mega, 'wsuploadmgr', () => {
    'use strict';

    const crc32b = (() => {
        /**
         * Fast CRC32 in JavaScript
         * 101arrowz (https://github.com/101arrowz)
         * License: MIT
         */
        const crct = new Int32Array(4096);

        for (let i = 0; i < 256; ++i) {
            let c = i;
            let k = 9;
            while (--k) {
                c = (c & 1 && -306674912) ^ c >>> 1;
            }
            crct[i] = c;
        }

        for (let i = 0; i < 256; ++i) {
            let lv = crct[i];
            for (let j = 256; j < 4096; j += 256) {
                lv = crct[i | j] = lv >>> 8 ^ crct[lv & 255];
            }
        }

        const crcts = [];

        for (let i = 0; i < 16;) {
            crcts[i] = crct.subarray(i << 8, ++i << 8);
        }

        const [t1, t2, t3, t4, t5, t6, t7, t8, t9, t10, t11, t12, t13, t14, t15, t16] = crcts;

        return (d, c) => {
            c = ~c;
            d = new Uint8Array(d);
            let i = 0;
            const max = d.length - 16;
            while (i < max) {
                c =
                    t16[d[i++] ^ c & 255] ^
                    t15[d[i++] ^ c >> 8 & 255] ^
                    t14[d[i++] ^ c >> 16 & 255] ^
                    t13[d[i++] ^ c >>> 24] ^
                    t12[d[i++]] ^
                    t11[d[i++]] ^
                    t10[d[i++]] ^
                    t9[d[i++]] ^
                    t8[d[i++]] ^
                    t7[d[i++]] ^
                    t6[d[i++]] ^
                    t5[d[i++]] ^
                    t4[d[i++]] ^
                    t3[d[i++]] ^
                    t2[d[i++]] ^
                    t1[d[i++]];
            }
            for (; i < d.length; ++i) {
                c = t1[c & 255 ^ d[i]] ^ c >>> 8;
            }

            // results are unsigned!
            return (c ^ 0xFFFFFFFF) >>> 0;
        };
    })();

    const logger = new MegaLogger('WSU', false, self.ulmanager && ulmanager.logger);

    // manages a pool of WebSocket connections to a fixed URL
    class WsPool {
        constructor(wspmgr, host, uri, setupws) {
            this.wspmgr = wspmgr;

            this.host = host;
            this.setupws = setupws;
            this.url = `wss://${host}/${uri}`;

            // pools need to be refreshed every 24 hours (wallclock time)
            this.timestamp = Date.now();

            // we keep a single standby connection per url open for faster upload starts
            this.conn = [new WebSocket(this.url)];

            // one connection per pool open while idle
            this.numconn = 1;

            this.chunksinflight = 0;

            this.files = Object.create(null);   // the files in this pool
            this.logger = new MegaLogger(`WsPool(${makeUUID().slice(-16)})`, false, logger);

            setupws(this.conn[0], this);
        }

        // gracefully close a connection
        dispose(idx) {
            const [ws] = this.conn.splice(idx, 1);
            if (self.d) {
                this.logger.warn(`disposing connection at #${idx}...`, ws);
            }
            if (ws) {
                ws.cleanclose();
            }
        }

        // close all connections
        purge() {
            for (let i = this.conn.length; i--;) {
                this.dispose(i);
            }
            if (self.d) {
                this.logger.warn('pool purged.', [this]);
            }
            oDestroy(this);
        }

        // close idle excess connections
        closexconn() {
            if (this.conn.length > this.numconn) {
                for (let i = this.conn.length; i--;) {

                    if (!this.conn[i].bufferedAmount
                     && !this.conn[i].chunksonthewire.length) {

                        this.dispose(i);
                    }

                    if (this.conn.length <= this.numconn) {
                        break;
                    }
                }
            }
        }

        // returns connection with the lowest suitable bufferedAmount, false if none available
        getmostidlews() {
            // FIXME: ramp up connection count as configured
            let lowest = -1;

            // create missing connections
            if (this.conn.length < this.numconn) {
                const ws = new WebSocket(this.url);
                this.setupws(ws, this);
                this.conn.push(ws);
            }
            this.closexconn();

            for (let i = this.conn.length; i--;) {

                if (this.conn[i].readyState === WebSocket.OPEN) {
                    if (lowest < 0 || this.conn[i].bufferedAmount < this.conn[lowest].bufferedAmount) {
                        lowest = i;
                    }
                }
            }

            if (lowest >= 0) {
                return this.conn[lowest];
            }

            return false;
        }

        // closes all timed out connections
        enforcetimeouts() {
            for (let i = this.conn.length; i--;) {
                const ws = this.conn[i];

                if (ws.reconnectat ? this.wspmgr.wsumgr.seconds > ws.reconnectat : ws.readyState === ws.CLOSED) {
                    // re-establish a failed/timed out connection
                    ws.cleanclose();
                    this.conn[i] = new WebSocket(this.url);
                    this.setupws(this.conn[i], this);
                }
            }
        }

        filethroughputs() {
            // we update the throughputs for all files being uploaded
            const onthewire = Object.create(null);
            let stop = false;

            for (let i = this.conn.length; i--;) {
                // extract chunksonthewire that are no longer covered by bufferedAmount
                let buffered = this.conn[i].bufferedAmount;

                for (let j = this.conn[i].chunksonthewire.length; j--;) {
                    const c = this.conn[i].chunksonthewire[j];

                    buffered -= c[1] + 20;     // subtract chunk and header length
                    if (buffered < 0) {
                        // part of this chunk and all previous chunks are no longer buffered
                        // and can be added to the server-confirmed amount as having left the local machine
                        onthewire[c[2]] = (onthewire[c[2]] || 0) - buffered;

                        while (j--) {
                            const c = this.conn[i].chunksonthewire[j];
                            onthewire[c[2]] = (onthewire[c[2]] || 0) + c[1];
                        }

                        break;
                    }
                }
            }

            // update throughputs for files with bytes on the wire
            for (const fileno in onthewire) {
                if (this.files[fileno]) {
                    this.files[fileno].showthroughput(onthewire[fileno]);
                }
            }

            // update throughputs for other active files
            for (const fileno in this.files) {
                if (onthewire[fileno] === undefined) {
                    const f = this.files[fileno];

                    if (!f || f.abort) {
                        stop = true;
                        delete this.files[fileno];
                    }
                    else if (f.reader.readpos) {
                        this.files[fileno].showthroughput(0);
                    }
                }
            }

            return stop;
        }

        // returns [position, size, fileno] of next chunk, or false if we're done
        nextchunk() {
            if (ulQueue.isPaused()) {
                if (self.d > 1) {
                    this.logger.warn("All transfers paused.");
                }
                return false;
            }

            // do we have any failed chunks to resend available in the cache?
            while (this.toresend && this.toresend.length) {
                const [pos, len, fileno] = this.toresend[0];
                const ul = this.files[fileno];

                // if the file upload has been cancelled, skip
                if (!ul || ul.done || ul.abort) {
                    if (self.d) {
                        this.logger.info(`Not resending chunk (file #${fileno} ${pos} ${len}) - done/aborted`);
                    }
                    this.toresend.splice(0, 1);
                    continue;
                }

                // if the chunk isn't available yet, proceed with fresh chunks until it is
                if (pos < ul.reader.file.size && !ul.reader.haveChunk(pos)) {
                    if (self.d) {
                        this.logger.info(`Not resending chunk (file #${fileno} ${pos} ${len}) - waiting for reader`);
                    }
                    break;
                }

                if (self.d) {
                    this.logger.info(`Resending chunk (file #${fileno} ${pos} ${len})`);
                }

                this.toresend.splice(0, 1);
                return [pos, len, fileno];
            }

            let fileno, ulfile;
            let cachelimit = this.chunksinflight + 40;

            // find a file with unsent chunks
            for (fileno in this.files) {
                if (!this.files[fileno].abort) {
                    const ul = this.files[fileno];
                    const {reader, eofset} = ul;
                    const {file, headpos, error} = reader;

                    if (ulQueue.isPaused(file.owner.gid)) {
                        continue;
                    }

                    if (error) {
                        // @todo report
                        continue;
                    }

                    // upload confirmation lost? retrigger.
                    if (ul.havelastchunkconfirmation && this.wspmgr.wsumgr.seconds - ul.havelastchunkconfirmation > 3) {
                        this.logger.info(`Missing upload confirmation for file #${fileno} - retriggering`);
                        ul.havelastchunkconfirmation = this.wspmgr.wsumgr.seconds;
                        return [file.size, 0, fileno];
                    }

                    if (cachelimit > 0) {
                        cachelimit -= reader.readahead(cachelimit);
                    }

                    if (!('headpos' in reader) || headpos < file.size || !eofset) {
                        ulfile = ul;
                        fileno = Number(fileno);
                        break;
                    }
                }
            }

            if (!ulfile) {
                // nothing to send
                return false;
            }

            const {pos, len, eof} = ulfile.reader.advanceHead();
            if (eof) {
                ulfile.eofset = true;

                if (!len) {
                    // the server will confirm the empty size-setting chunk
                    ulfile.needsizeconfirmation = true;
                }
            }

            return [pos, len, fileno];
        }

        retrychunk(chunk, reread) {
            const fu = this.files[chunk[2]];

            if (!fu || fu.done || fu.abort) {
                if (self.d) {
                    this.logger.debug(`Not retrying chunk ${JSON.stringify(chunk)} (done/aborted)`);
                }
            }
            else {
                if (self.d) {
                    this.logger.debug(`Going to retry chunk ${JSON.stringify(chunk)}`);
                }

                if (reread && fu.reader.file && chunk[0] < fu.reader.file.size) {
                    fu.reader.readChunk(chunk[0]);
                }

                if (!this.toresend) {
                    this.toresend = [];
                }

                this.toresend.push(chunk);
            }
        }

        sendchunkdata(ws, fileno, pos, chunkdata) {
            /**
             * Header:
             * - fileno (32 bit LE)
             * + pos (64 bit LE)
             * + length (32 bit LE)
             * + CRC32b (32 bit LE) over the first 16 bytes of the header
             * + the chunk data
             */
            const header = new ArrayBuffer(20);
            const view = new DataView(header);
            view.setUint32(0, fileno, true);
            view.setBigUint64(4, BigInt(pos), true);
            view.setUint32(12, chunkdata.byteLength, true);
            view.setUint32(16, crc32b(chunkdata, crc32b(new Uint8Array(header, 0, 16))), true);
            ws.send(header);
            ws.send(chunkdata);
        }

        // send one chunk from the WsPool to the given WebSocket
        // returns true if something was sent, false otherwise
        sendchunk(ws) {
            // if connection is up and buffer is not too full, we send another chunk
            if (ws.readyState === WebSocket.OPEN && ws.bufferedAmount < 1500000) {
                const chunk = this.nextchunk();

                if (chunk) {
                    // chunk is [chunkpos, len, fileno]
                    // (we need to tell the reader about how many chunks we have in flight across all
                    // connections so that it can adapt to our link's bandwidth-delay product)
                    const buf = chunk[1] ? this.files[chunk[2]].reader.getChunk(chunk[0]) : new ArrayBuffer(0);

                    if (buf && buf.byteLength === chunk[1]) {
                        this.sendchunkdata(ws, chunk[2], chunk[0], buf);

                        // mark the sent chunk as in flight on this connection/file
                        this.chunksinflight++;

                        // (for accurate throughput metering)
                        return ws.chunksonthewire.push(chunk);
                    }

                    if (self.d) {
                        if (buf) {
                            const at = `${chunk[0]}: ${buf.byteLength} != ${chunk[1]}`;
                            this.logger.error(`GetChunk for file #${chunk[2]} failed at ${at}`, buf);
                        }
                        else {
                            this.logger.log(`No chunk at ${chunk[0]} file #${chunk[2]}`);
                        }
                    }

                    this.retrychunk(chunk, false);
                }
            }

            return false;
        }

        // fills the buffers of all connections of the pool
        sendchunks(round) {
            let tooslow = false;

            this.enforcetimeouts();

            for (; ;) {
                const ws = this.getmostidlews();

                if (ws === false) {
                    // all filled up
                    break;
                }
                else {
                    // do not overfill send buffers
                    if (ws.bufferedAmount > 1500000) {
                        break;
                    }

                    // did the socket buffer run empty?
                    if (ws.lastround !== undefined && !ws.bufferedAmount && (round - ws.lastround & 0xffffffff) === 1) {
                        tooslow = true;
                    }

                    // ws is the WebSocket that shall receive the next chunk
                    if (!this.sendchunk(ws)) {
                        break;
                    }

                    // WebSocket buffer full? tag it with round to see if it ran empty in one interval
                    if (ws.bufferedAmount > 1500000) {
                        ws.lastround = round;
                    }
                }
            }

            if (this.filethroughputs()) {

                this.wspmgr.wsumgr.stop();
            }

            // if any buffer ran empty, we need to increase invocation frequency
            return tooslow;
        }
    }

    // obtains size classes and related upload URLs from the API
    // creates a WsPool for each
    // setupws attaches message handlers etc. to the websocket
    class WsPoolMgr {
        constructor(wsumgr, setupws) {
            this.wsumgr = wsumgr;
            this.pools = [];
            this.maxulsize = [];
            this.setupws = setupws;
            this.unassigned = [];
            this.logger = new MegaLogger(`WsPoolMgr(${makeUUID().slice(-16)})`, false, logger);
        }

        // number of parallel upload connections
        get numconn() {
            // we keep one connection per pool open and ramp it up when a file is queued
            return self.fmconfig && fmconfig.ul_maxSlots || ulmanager.ulDefConcurrency;
        }

        // number of ongoing file uploads
        get files() {
            let res = 0;
            for (let i = this.pools.length; i--;) {
                res += Object.keys(this.pools[i].files).length;
            }
            return res;
        }

        // create new WsPools for each size class based on the API response layout:
        // maxulsize[] is ordered ascending and contains the maximum file size allowed into the pool with the same index
        // pools[maxulsize.length] is the active pool for all higher file sizes
        // Beyond that, index are pools that are drying up
        // (they may still have transfers on them, but they are not getting new ones)
        async refreshpools() {
            // response format is [[host, uri, sizelimit], ..., [host, uri, sizelimit], [host uri]]
            const {result: u} = await api.req({a: 'usc'}, 7);

            // we construct replacement pools/maxulsize arrays,
            // recycling non-expired existing ones pointing to the same host and having the same size class
            const pools = [];
            const maxulsize = [];
            const oldestvalid = Date.now() - 24 * 3600 * 1000;

            // set number of concurrent FileUpload instances
            ulQueue.setSize(Math.max(2, u.length | 0));

            // store API size class allocation and corresponding upload URLs
            for (let i = 0; i < u.length; i++) {
                let found = false;

                // locate matching fresh WsPool
                for (let j = this.pools.length; j--;) {

                    if (this.pools[j].host === u[i][0]
                        && this.maxulsize[j] === u[i][2]
                        && this.pools[j].timestamp >= oldestvalid) {

                        // non-expired match found: maintain
                        found = true;

                        pools.push(this.pools[j]);
                        this.pools.splice(j, 1);

                        if (this.maxulsize[j]) {
                            maxulsize.push(this.maxulsize[j]);
                            this.maxulsize.splice(j, 1);
                        }
                        break;
                    }
                }

                if (!found) {
                    // not found, we'll create a fresh one
                    pools.push(new WsPool(this, u[i][0], u[i][1], this.setupws));
                    if (u[i][2]) {
                        maxulsize.push(u[i][2]);
                    }
                }
            }

            // the obsolete pools are kept alive as they might have active transfers on them
            for (let i = 0; i < this.pools.length; i++) {
                pools.push(this.pools[i]);
            }

            this.pools = pools;
            this.maxulsize = maxulsize;

            // now assign pending uploads
            if (this.pools.length) {
                for (let i = this.unassigned.length; i--;) {
                    this.assignfile(this.unassigned[i]);
                }
                this.unassigned = [];
            }

            // and send data/close orphaned pools
            this.pumpdata();
        }

        assignfile(fu) {
            const {reader: {file}, fileno} = fu;

            // if .wsfu is deleted, the upload is considered aborted by FileUploadReader
            file.wsfu = fu;

            if (this.pools.length) {
                let i = 0;
                while (i < this.maxulsize.length && file.size >= this.maxulsize[i]) {
                    ++i;
                }
                // add file to pool
                // ramp up connections, FIXME: set timer to downramp after no upload inactivity
                this.pools[i].numconn = this.numconn;
                this.pools[i].files[fileno] = fu;
                this.pools[i].sendchunks(0);

                if (self.d) {
                    this.logger.info(`fileno#${fileno} assigned to ${file.owner}`, [fu]);
                }
            }
            else {
                if (self.d) {
                    this.logger.warn(`We don't have any usc response yet, queueing #${fileno}...`, [fu]);
                }
                this.unassigned.push(fu);
            }
        }

        pumpdata(wmgr) {
            // delete empty inactive pools (which start at index this.maxulsize.length + 1)
            for (let i = this.pools.length; --i > this.maxulsize.length;) {
                if (!this.pools[i].chunksinflight && !Object.keys(this.pools[i].files).length) {
                    if (self.d) {
                        this.logger.log(`Closing idle pool ${i}`);
                    }
                    this.pools[i].purge();
                    this.pools.splice(i, 1);
                }
            }

            // we tag each WebSocket that got fresh data with an identifier
            // so that we can detect it ran empty since the last invocation,
            // which means that we need to increase the pumping frequency
            this.round = this.round + 1 & 0xffffffff;

            let tooslow = false;

            for (let i = this.pools.length; i--;) {
                if (this.pools[i].sendchunks(this.round)) {
                    tooslow = true;
                }
            }

            return tooslow;
        }
    }

    class WsFileUpload {
        constructor(file, fileno) {
            this.abort = false;
            this.fileno = fileno;
            this.bytesuploaded = 0;
            this.needsizeconfirmation = false;
            this.havelastchunkconfirmation = 0;
            this.reader = new FileUploadReader(file);

            // start the Speedometer the first activity
            lazy(this, 'speedometer', () => Speedometer(0));
        }

        showthroughput(bytesinflight) {
            if (!this.abort && this.reader.file.owner) {
                const {reader: {file}, bytesuploaded, speedometer} = this;

                if (!file.ulSilent) {
                    const b = bytesuploaded + bytesinflight;
                    const p = GlobalProgress[file.owner.gid].speed = speedometer.progress(b);

                    M.ulprogress(file, Math.floor(b / file.size * 100), b, file.size, p);
                }
            }
        }

        destroy() {
            if (this.reader) {
                delete this.abort;
                this.reader.destroy();
                Object.defineProperty(this, 'abort', {value: true});
                oDestroy(this);
            }
        }
    }

    class WsUploadMgr {
        constructor() {
            this.fileno = 0;
            this.seconds = 0;
            this.refreshing = false;
            this.logger = new MegaLogger(`WsUploadMgr(${makeUUID().slice(-16)})`, false, logger);

            this.poolmgr = new WsPoolMgr(this, (ws, pool) => {
                // configure the freshly created WebSocket
                ws.binaryType = 'arraybuffer';
                ws.pool = pool;
                // chronological record of the unacknowledged chunks in transit (for accurate transfer speed)
                ws.chunksonthewire = [];

                // run the datapump if a connection is established/closed
                function openhandler() {
                    if (self.d) {
                        this.pool.wspmgr.wsumgr.logger.log(`Connected to ${this.url}`);
                    }
                    this.pool.sendchunk(ws);      // immediately send a chunk to the new connection
                    this.pool.sendchunks();       // and fill the whole pool's buffers
                }

                function errorhandler(ev) {
                    this.pool.wspmgr.wsumgr.logger.error(`Connection error for ${this.url}`, ev);
                    this.reconnectat = this.pool.wspmgr.wsumgr.seconds + 5; // reconnect after 5 seconds
		}

                function closehandler(ev) {
                    // ignore the closure of sockets on oDestroy()'d pools
                    if (!this.pool.wspmgr) return;

                    if (self.d) {
                        const {wasClean, code, reason} = ev;
                        this.pool.wspmgr.wsumgr.logger.info(`Disconnected from ${this.url}`, wasClean, code, reason, [ev]);
                    }

                    // if the connection dropped unexpectedly, we return the in-flight chunks to the pool
                    this.pool.chunksinflight -= this.chunksonthewire.length;

                    // we must resend all unacknowledged in-flight chunks
                    for (let i = 0; i < this.chunksonthewire.length; i++) {
                        this.pool.retrychunk(this.chunksonthewire[i], true);
                    }

                    this.pool.sendchunk(ws);       // re-enqueue inflight chunks
                }

                // process a server message
                function messagehandler({data}) {
                    const view = new DataView(data);

                    // parse and action the message from the upload server
                    if (view.byteLength < 9) {
                        if (self.d) {
                            this.pool.wspmgr.wsumgr.logger.error(`Invalid server message length ${view.byteLength}`);
                        }
                    }
                    else {
                        const crc = view.getUint32(data.byteLength - 4, true);

                        if (crc === crc32b(new Uint8Array(data, 0, view.byteLength - 4))) {

                            return this.pool.wspmgr.wsumgr.process(this, data, view);
                        }

                        if (self.d) {
                            this.pool.wspmgr.wsumgr.logger.error(`CRC failed, byteLength=${view.byteLength} ${crc}`);
                        }
                    }

                    this.close();
                }

                ws.addEventListener('open', openhandler);
                ws.addEventListener('message', messagehandler);
                ws.addEventListener('close', closehandler);
                ws.addEventListener('error', errorhandler);

                // delete listeners (except closehandler - we need it to run)
                ws.cleanclose = function() {
                    this.removeEventListener('open', openhandler);
                    this.removeEventListener('message', messagehandler);
                    this.removeEventListener('error', errorhandler);
                    this.close();
                };
            });
        }

        process(ws, data, view) {
            let chunk;
            const type = view.getInt8(12);
            const fileno = view.getUint32(0, true);
            const chunkpos = Number(view.getBigUint64(4, true));
            const fu = ws.pool.files[fileno] || {abort: -1};

            if (type > 0 && type < 4 || type === 7) {
                // server confirmation received: this chunk is no longer in flight (ul confirmation follows separately)
                chunk = this.flush(ws, fileno, chunkpos);

                if (!fu.reader) {
                    this.logger.warn(`No upload associated with file #${fileno}`);
                    delete ws.pool.files[fileno];
                    return this.stop();
                }
            }

            if (type < 0) {
                this.logger.error(`File #${fileno} failed at ${chunkpos} (${type})`);

                if (!fu.abort && !fu.done) {
                    this.uploadfailed(fu, type);
                }
                return;
            }

            switch (type) {
                case 1: // non-final chunk ingested by server
                case 7: // server has received the final chunk
                    this.finalise(chunk, type, fu);
                    break;

                case 2:
                    // chunk already on server (could happen after a reconnect/retry)
                    break;

                case 3:
                    // CRC failed (unlikely on SSL, but very possible on TCP)
                    this.logger.error(`Chunk CRC FAILED on ${ws.url}`);
                    ws.pool.retrychunk(chunk, true);
                    break;

                case 4:
                    // upload completed
                    delete ws.pool.files[fileno];
                    if (!fu.abort) {
                        fu.done = true;
                        this.uploadcomplete(fu, new Uint8Array(data, 14, view.getUint8(13)));
                    }
                    break;

                case 5:
                    // server in distress - refresh pool target URLs from API
                    this.logger.warn(`Server ${ws.pool.url} shedding connections`);

                    queueMicrotask(() => {
                        if (!this.refreshing) {
                            this.refreshing = true;

                            this.poolmgr.refreshpools()
                                .catch(dump)
                                .finally(() => {
                                    this.refreshing = false;
                                });
                        }
                    });
                    return;

                case 6:
                    // server requests a break
                    // FIXME: implement
                    this.logger.warn(`Server ${ws.pool.url} requests pause of ${chunkpos} ms`);
                    break;

                default:
                    // ignore unknown messages for compatibility with future protocol features
                    this.logger.warn(`Unknown response from server ${type}`);
            }

            // if we have chunks in flight, expect the next response in at most 10 seconds
            if (ws.chunksonthewire.length) {
                ws.reconnectat = this.seconds + 10;
            } else {
                ws.reconnectat = 0;
            }
        }

        finalise(chunk, type, fu) {
            if (!fu.abort && chunk) {

                // empty chunk only allowed to confirm size
                if (chunk[1]) {
                    fu.bytesuploaded += chunk[1];
                }
                else {
                    if (!fu.needsizeconfirmation) {
                        this.logger.warn('Unexpected file size confirmation (file #${chunk[2]}); starting over!', [fu]);
                        this.uploadfailed(fu, -2);
                        return;
                    }
                    fu.needsizeconfirmation = false;
                }

                if (type === 7) {
                    if (fu.reader.readpos < fu.reader.file.size) {
                        this.logger.warn('Premature end-of-file ack (file #${chunk[2]}); starting over...', [fu]);
                        this.uploadfailed(fu, -13);
                        return;
                    }
                    if (fu.havelastchunkconfirmation) {
                        this.logger.warn('Duplicate end-of-file ack (file #${chunk[2]}); starting over...', [fu]);
                        this.uploadfailed(fu, -12);
                        return;
                    }
                    fu.havelastchunkconfirmation = this.seconds;
                }

                if (fu.bytesuploaded >= fu.reader.file.size
                    && !fu.needsizeconfirmation && !fu.havelastchunkconfirmation) {

                    // the file has been fully uploaded, but
                    // the server is telling us that it thinks it will send more confirmations
                    // this means that the server has lost its state
                    if (self.d) {
                        this.logger.warn(`Server has lost the plot (file #${chunk[2]}); starting over...`, [fu]);
                    }
                    this.uploadfailed(fu, -8);
                }
            }
        }

        flush(ws, fileno, offset) {
            let chunk = null;

            // remove from chunksonthewire - most likely located at the beginning
            for (let i = 0; i < ws.chunksonthewire.length; i++) {
                if (ws.chunksonthewire[i][0] === offset && ws.chunksonthewire[i][2] === fileno) {
                    chunk = ws.chunksonthewire.splice(i, 1)[0];
                    assert(ws.pool.chunksinflight-- > 0);
                    break;
                }
            }

            if (!chunk) {
                this.logger.error(`Server confirmed chunk not in flight: File #${fileno}@${offset}`);
            }

            return chunk;
        }

        // this loop is responsible for maintaining the (standby) connections and pumping data during transfers
        // since WebSocket doesn't have an onbufferempty(), we need
        // to busy-loop with adaptive frequency to keep the data flowing)
       async run(val = 500) {

            if (!this.poolmgr.pools.length) {
                this.poolmgr.refreshpools()
                    .catch((ex) => {
                        M.uscex(ex);
                        this.running = null;
                        this.logger.error(ex);
                    });
            }
            const pid = this.running = ++mIncID;

            while (1) {
                await sleep(val / 1e3);
                this.seconds += val / 1e3;

                if (pid !== this.running) {
                    break;
                }
                if (this.poolmgr.pumpdata(this)) {
                    // (40 ms and 2 MB WebSocket buffers should be fast enough?)
                    val = val * 0.75 + 10;
                }
            }

            return pid;
        }

        stop() {
            if (this.running && !this.poolmgr.files) {
                if (self.d) {
                    this.logger.info('Entered idle state.');
                }
                this.running = false;

                // maintain one stand-by connection per pool
                for (let i = this.poolmgr.pools.length; i--; ) {
                    this.poolmgr.pools[i].numconn = 1;
                    this.poolmgr.pools[i].closexconn();
                }
            }
        }

        uploadfailed(fu, reason) {
            const {reader: {file}, fileno} = fu;

            this.logger.error(`File #${fileno} failed to upload`, reason, [fu]);

            reason = ulmanager.ulStrError(reason) || reason;

            fu.destroy();
            ulmanager.restart(file, reason);
        }

        uploadcomplete(fu, response) {

            if (!response.byteLength || response.byteLength === 36) {
                const {reader: {file}} = fu;
                const {ul_key, ul_macs, owner: {gid} = false, xput} = file;

                if (!gid || ulmanager.ulCompletingPhase[gid]) {
                    this.logger.error(`[${gid}] how we got here?`, this, fu, response);
                    return;
                }

                if (self.u_k_aes || xput) {
                    const t = Object.keys(ul_macs)
                        .map(Number)
                        .sort((a, b) => a - b);

                    for (let i = 0; i < t.length; i++) {
                        t[i] = ul_macs[t[i]];
                    }
                    const u8 = new Uint8Array(response);
                    const mac = condenseMacs(t, ul_key);

                    file.filekey = [
                        ul_key[0] ^ ul_key[4],
                        ul_key[1] ^ ul_key[5],
                        ul_key[2] ^ mac[0] ^ mac[1],
                        ul_key[3] ^ mac[2] ^ mac[3],
                        ul_key[4],
                        ul_key[5],
                        mac[0] ^ mac[1],
                        mac[2] ^ mac[3]
                    ];
                    file.response = u8[35] === 1 ? ab_to_base64(response) : ab_to_str(response);

                    this.stop();
                    return ulmanager.ulFinalize(file);
                }
            }
            else if (self.d) {
                this.logger.error(`Invalid upload response received`, response);
            }

            return this.uploadfailed(fu, ab_to_str(response));
        }

        // enqueue upload and start sending data
        upload(file) {
            this.run().catch(reportError);

            this.fileno++;
            this.poolmgr.assignfile(new WsFileUpload(file, this.fileno));
        }
    }

    return new WsUploadMgr();
});
