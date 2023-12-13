/** @property mega.rewindUtils */
lazy(mega, 'rewindUtils', () => {
    'use strict';

    const logger = new MegaLogger('utils', null, MegaLogger.getLogger('rewind'));
    let treeChannel = -1;
    let packetChannel = -1;
    let rewindWorker = null;

    class RewindMEGAWorker extends MEGAWorker {
        attachNewWorker() {
            const worker = new Worker(this.url);
            worker.wkc = 0;
            worker.jobs = 0;
            worker.onerror = this.wkErrorHandler;
            worker.onmessage = this.wkMessageHandler;
            if (this.hello) {
                let initPayload = false;
                // We make sure the payload is set to a single object
                if (typeof this.hello !== 'object') {
                    initPayload = {
                        token: 'init',
                        command: 'hello',
                        data: this.hello,
                        converted: true
                    };
                }
                else if (!this.hello.converted) {
                    initPayload = {
                        token: 'init',
                        command: 'hello',
                        converted: true,
                        ...this.hello
                    };
                }

                let initSignal = null;
                if (initPayload.initSignal) {
                    initSignal = initPayload.initSignal;
                    delete initPayload.initSignal;
                }

                worker.postMessage(initPayload);

                // Since we terminate workers, we save the initSignal
                // like owner keys to rerun on worker init
                if (initSignal && initSignal.length) {
                    for (const payload of initSignal) {
                        worker.postMessage(payload);
                    }
                }
            }
            return this.push(worker) - 1;
        }

        post(worker, {resolve, reject, command, payload}) {
            return tryCatch(() => {
                const token = makeUUID();
                // We make sure the payload is set to a single object
                payload = this.preparePayload(token, command, payload);

                const t = MEGAWorker.getTransferable(payload);
                worker.postMessage(payload, t);
                this.running.set(token, {token, worker, resolve, reject});
                return ++worker.jobs;
            }, reject)();
        }

        preparePayload(token, command, payload) {
            if (typeof payload !== 'object') {
                payload = {
                    token: token,
                    command: command,
                    data: payload,
                    converted: true
                };
            }
            else if (!payload.converted) {
                payload = {
                    token: token,
                    command: command,
                    converted: true,
                    ...payload
                };
            }
            return payload;
        }

        dispatch(data) {
            const {token, error} = data;

            // Since we pasted the token on the payload
            // We shall retrieve it and use it for mapping
            // the promise associated for the job/task
            if (data.token) {
                delete data.token;
            }

            // Same applies for error
            if (data.error) {
                delete data.error;
            }

            const result = data;
            super.dispatch({result, token, error});
        }

        queue(command, payload) {
            const resultPromise = super.queue(command, payload);
            return resultPromise.then((node) => {
                if (node.command) {
                    delete node.command;
                }

                if (node.converted) {
                    delete node.converted;
                }

                if (node.token) {
                    delete node.token;
                }

                return node;
            });
        }

        broadcast(command, payload) {
            const promiseArray = [];

            for (const worker of this) {
                promiseArray.push(new Promise((resolve, reject) => {
                    this.post(worker, {resolve, reject, command, payload});
                }));
            }

            return Promise.allSettled(promiseArray);
        }
    }

    const initRewindWorker = () => {
        if (rewindWorker) {
            return;
        }

        let allowNullKeys = false;
        if (window.allowNullKeys) {
            allowNullKeys = window.allowNullKeys;
        }

        const workerStateData = {
            d,
            u_k,
            u_privk,
            u_handle,
            allowNullKeys,
            usk: window.u_attr && u_attr['*~usk']
        };

        rewindWorker = new RewindMEGAWorker(decWorkerPool.url.split('/').pop(), 8, workerStateData);
    };

    class RewindChunkTreeHandler {
        constructor() {
            this.apiInit = false;
        }

        initChannel() {
            if (!this.apiInit) {
                treeChannel = api.addChannel(
                    -1,
                    'cs',
                    freeze({
                        '[': this.handleResidue,
                        '[{[ok0{': this.handleOwnerKey,
                        '[{[f{': this.handleNode,
                        '[{[f2{': this.handleNode
                    })
                );
                this.apiInit = true;
            }
        }

        handleNode(node) {
            // Tells the worker that we will be processing a rewind node
            node.rewind = 1;
            node.apiId = this.__ident_1; // Will just tell us what request they are in

            if (!mega.rewindUtils.queue[node.apiId]) {
                mega.rewindUtils.queue[node.apiId] = [];
            }

            initRewindWorker();

            let nodePromise = null;

            if (rewindWorker) {
                nodePromise = rewindWorker.queue('decrypt', node);
            }
            else {
                crypto_decryptnode(node);
                nodePromise = Promise.resolve(node);
            }

            // Throw in as promise as we are waiting for the
            // dispatch to finish.
            const queueLength = mega.rewindUtils.queue[node.apiId].length;
            // This is for handling the current progress
            mega.rewind.handleProgress(1, queueLength);

            mega.rewindUtils.handleWorkerMessage(nodePromise);
            mega.rewindUtils.queue[node.apiId].push(nodePromise);
        }

        handleOwnerKey(ownerKey) {
            const apiId = this.__ident_1;
            initRewindWorker();
            if (rewindWorker) {
                if (!rewindWorker.hello.initSignal) {
                    rewindWorker.hello.initSignal = [];
                }

                rewindWorker.hello.initSignal.push(ownerKey);
                const ownerKeyPromise = rewindWorker.broadcast('decrypt', ownerKey);

                if (!mega.rewindUtils.queue[apiId]) {
                    mega.rewindUtils.queue[apiId] = [];
                }

                mega.rewindUtils.queue[apiId].push(ownerKeyPromise);
            }
        }

        handleResidue(response) {
            // The context for this function is MEGAPIRequest
            const apiId = this.__ident_1;

            // This is for request tracking that is still in progress
            // and be terminated once the nodes are processed already
            if (!mega.rewindUtils.inflight[apiId]) {
                mega.rewindUtils.inflight[apiId] = new Set();
            }
            mega.rewindUtils.inflight[apiId].add(this);


            // This is for api to respond properly to the invoker
            if (!this.residual.length) {
                this.residual.push(mega.promise);
            }

            // store the residual f response for perusal once all workers signal that they're done
            this.residual.push(...response);

            // This is just to check if we are done processing
            // from worker earlier than expected and residue
            // might take a long time to finish parsing/downloading
            mega.rewindUtils.checkRequestDone(apiId, 1);
        }
    }

    class RewindChunkPacketHandler {
        constructor() {
            this.apiInit = false;
        }

        initChannel() {
            if (!this.apiInit) {
                packetChannel = api.addChannel(
                    -1,
                    'sc',
                    freeze({
                        '{': this.handleResidue,
                        '{[a{': this.handlePacket,
                        '{[a{{t[f{': this.handleNode,  // SC node
                        '{[a{{t[f2{': this.handleNode  // SC node (versioned)
                    })
                );
                this.apiInit = true;
            }
        }
        handleNode(node) {
            const apiId = this.__ident_1; // Will just tell us what request they are in

            if (!mega.rewindUtils.index[apiId]) {
                mega.rewindUtils.index[apiId] = 1;
            }

            const packetIndex = mega.rewindUtils.index[apiId];

            let nodePromise = null;

            initRewindWorker();
            if (rewindWorker) {
                nodePromise = rewindWorker.queue('decrypt', node);
            }
            else {
                crypto_decryptnode(node);
                nodePromise = Promise.resolve(node);
            }

            if (!mega.rewindUtils.packets[packetIndex]) {
                mega.rewindUtils.packets[packetIndex] = [null, [], false, 0];
            }

            // We set the 2nd index as the promise collection
            mega.rewindUtils.packets[packetIndex][1].push(nodePromise);
        }

        handlePacket(actionPacket) {
            const apiId = this.__ident_1;

            if (!mega.rewindUtils.index[apiId]) {
                mega.rewindUtils.index[apiId] = 1;
            }

            const packetIndex = mega.rewindUtils.index[apiId];

            if (mega.rewindUtils.packets[packetIndex]) {
                mega.rewindUtils.packets[packetIndex][0] = actionPacket;
            }
            else {
                mega.rewindUtils.packets[packetIndex] = [actionPacket, [], false, 0];
            }

            mega.rewindUtils.packet.handlePacketPromises(packetIndex);
            mega.rewindUtils.index[apiId]++;
        }

        async handlePacketPromises(packetIndex) {
            if (!mega.rewindUtils.packets[packetIndex]) {
                return;
            }

            mega.rewindUtils.pending[packetIndex] = true;
            const promiseArray = mega.rewindUtils.packets[packetIndex][1];
            let nodes = [];
            if (promiseArray.length) {
                nodes = await Promise.all(mega.rewindUtils.packets[packetIndex][1]);
            }

            // Awaited nodes
            mega.rewindUtils.packets[packetIndex][1] = nodes;
            // Cleanup promises so we can track this on residue
            mega.rewindUtils.packets[packetIndex][2] = true;
            delete mega.rewindUtils.pending[packetIndex];
        }

        handleTimestamp(ts) {
            for (let i = 0; i < ts.length; i++) {
                const index = i + 1;
                if (mega.rewindUtils.packets[index]) {
                    mega.rewindUtils.packets[index][3] = ts[i];
                }
            }
        }

        handleResidue(response) {
            const apiId = this.__ident_1;

            if (response.ts && response.ts.length) {
                mega.rewindUtils.packet.handleTimestamp(response.ts);
            }

            // Just to check if we have inflight request
            if (!mega.rewindUtils.inflight[apiId]) {
                mega.rewindUtils.inflight[apiId] = new Set();
            }
            mega.rewindUtils.inflight[apiId].add(this);

            // Add all pending promises to the queue
            for (const packetIndex in mega.rewindUtils.pending) {
                if (!mega.rewindUtils.queue[apiId]) {
                    mega.rewindUtils.queue[apiId] = [];
                }

                const packetInfo = mega.rewindUtils.packets[packetIndex];
                if (packetInfo) {
                    mega.rewindUtils.queue[apiId].push(...packetInfo[1]);
                }
            }

            mega.rewindUtils.packet.handlePostRequest(apiId, response);
        }

        async handlePostRequest(apiId, response) {
            // We know the request is done and
            // make all the nodes are processed already
            await mega.rewindUtils.checkRequestDone(apiId, 3, true);

            const sn = response.sn; // Last SN on the action packet
            const packets = mega.rewindUtils.packets; // Processed packets

            logger.info('Packet.handlePostRequest - rewind:packet:done');
            mBroadcaster.sendMessage('rewind:packet:done', {
                packets,
                sn
            });

            if (mega.rewindUtils.queue[apiId] && Object.keys(mega.rewindUtils.queue[apiId])) {
                logger.error('Packet.handlePostRequest - Abnormal - Packet queue not empty',
                             mega.rewindUtils.queue[apiId]);
            }

            delete mega.rewindUtils.queue[apiId];
            mega.rewindUtils.packets = [];
        }
    }

    return new class RewindUtils {
        constructor() {
            this.init();
        }

        init() {
            lazy(this, 'tree', () => new RewindChunkTreeHandler());
            lazy(this, 'packet', () => new RewindChunkPacketHandler());

            this.queue = Object.create(null);
            this.inflight = Object.create(null);
            this.pending = Object.create(null);
            this.packets = [];
            this.index = Object.create(null);
        }

        getTreeCacheList() {
            const payload = {
                a: 'tch',
                d: 1
            };

            return api.req(payload).then(({result}) => result);
        }

        getChangeLog(handles, fromDate, toDate) {
            if (!Array.isArray(handles)) {
                handles = [handles];
            }

            if (fromDate instanceof Date) {
                fromDate = fromDate.getTime() / 1000;
            }

            if (toDate instanceof Date) {
                toDate = toDate.getTime() / 1000;
            }

            const payload = {
                a: 'fh',
                h: handles,
                fd: fromDate,
                td: toDate
            };

            return api.req(payload).then(({result}) => result);
        }

        getTreeCacheHistory(timestamp, handle, channel, progressCallback) {
            const payload = {
                a: 'tch',
                ts: timestamp,
                h: handle
            };

            const options = {
                progress: progressCallback,
                channel
            };

            logger.info('RewindUtils.getTreeCacheHistory - Send request', payload);
            return api.req(payload, options).then(({result}) => result);
        }

        getChunkedTreeCacheHistory(timestamp, handle, progressCallback) {
            this.tree.initChannel();
            return this.getTreeCacheHistory(timestamp, handle, treeChannel, progressCallback);
        }

        getActionPacketHistory(sequenceNumber, endDate, channel, progressCallback) {

            if (endDate instanceof Date) {
                endDate = endDate.getTime();
            }

            const payload = `sn=${sequenceNumber}&ts=1&ets=${Math.round(endDate)}`;
            const options = {
                callback: progressCallback,
                channel
            };

            logger.info('RewindUtils.getActionPacketHistory - Send request', payload);
            return this.makeApiRequest(payload, options).then(({result}) => result);
        }

        getChunkedActionPacketHistory(sequenceNumber, endDate, progressCallback) {
            this.packet.initChannel();
            return this.getActionPacketHistory(sequenceNumber, endDate, packetChannel, progressCallback);
        }

        makeApiRequest(request, channel) {
            return api.req(request, channel || 3);
        }

        async handleWorkerMessage(promiseData) {
            const data = await promiseData;

            if (data.h) {
                data.apiId = null;
                delete data.apiId;

                mega.rewind.addNodeFromWorker(data);
            }
        }

        restoreNode(handles) {

            if (typeof handles === 'string') {
                handles = [handles];
            }

            const payload = {
                a: 'rw',
                h: handles
            };

            return api.req(payload).then(({result}) => result);
        }

        async checkRequestDone(apiId, progressSource, fromPacket) {
            // If we know
            if (mega.rewindUtils.inflight[apiId]) {
                const chunkArray = (array, size) => {
                    const chunkedArr = [];
                    for (let i = 0; i < array.length; i += size) {
                        chunkedArr.push(array.slice(i, i + size));
                    }
                    return chunkedArr;
                };

                if (mega.rewindUtils.queue[apiId] && mega.rewindUtils.queue[apiId].length) {
                    const chunkedArray = chunkArray(mega.rewindUtils.queue[apiId], 10000);
                    for (const itemArray of chunkedArray) {
                        await Promise.allSettled(itemArray);
                    }
                }

                const inflight = mega.rewindUtils.inflight[apiId];
                for (const api of inflight) {
                    if (api.residual && api.residual.length) {
                        api.residual[0].resolve();
                    }
                }

                if (mega.rewind.putQueue && mega.rewind.putQueue.length) {
                    await new Promise((resolve) => {
                        const batch = mega.rewind.putQueue.slice(0, FMDB_FLUSH_THRESHOLD);
                        mega.rewind.putQueue.splice(0, FMDB_FLUSH_THRESHOLD);

                        let oldPromise = null;
                        const promiseArray = [];

                        for (const item of batch) {
                            const [putFunction, ...putArgs] = item;
                            const promise = putFunction(...putArgs);
                            if (promise !== oldPromise) {
                                oldPromise = promise;
                                promiseArray.push(oldPromise);
                            }
                        }

                        Promise.allSettled(promiseArray).then(() => {
                            if (d) {
                                logger.info('Flushing nodes - request done');
                            }
                            resolve();
                        });
                    });
                }

                mega.rewind.handleProgress(progressSource, 0, true);

                mega.rewindUtils.inflight[apiId] = null;
                delete mega.rewindUtils.inflight[apiId];

                // Clone size dictionary
                if (!fromPacket) {
                    // Sum all the size data for the nodes
                    mega.rewind.sumSizeData();
                    logger.info(`Api.checkRequestDone -` +
                        `Downloaded ${Object.keys(mega.rewind.nodeDictionary).length - 1} nodes`);
                }

                // cleanup queue
                delete mega.rewindUtils.queue[apiId];
                logger.info(`Api.checkRequestDone - Request done - with inflight - from packet: ${fromPacket}`);
                return true;
            }

            logger.info(`Api.checkRequestDone - Request done - without inflight - from packet: ${fromPacket}`);
            return false;
        }
    };
});
