/** @property mega.rewindUtils */
lazy(mega, 'rewindUtils', () => {
    'use strict';

    const logger = new MegaLogger('utils', null, MegaLogger.getLogger('rewind'));
    let treeChannel = -1;
    let packetChannel = -1;
    let reinstateChannel = -1;
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
            this.residual = this.residual.concat(response);

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

            const packet = {...mega.rewindUtils.packets[packetIndex][0]};
            if (packet.a === 'u') {
                packet.h = packet.n;
                packet.a = packet.at;
                delete packet.n;
                delete packet.at;

                crypto_decryptnode(packet);
                promiseArray.push(Promise.resolve(packet));
            }

            let nodes = [];
            if (promiseArray.length) {
                nodes = await Promise.all(promiseArray);
            }

            // Awaited nodes
            mega.rewindUtils.packets[packetIndex][1] = nodes;
            // Cleanup promises so we can track this on residue
            mega.rewindUtils.packets[packetIndex][2] = true;
            delete mega.rewindUtils.pending[packetIndex];
        }

        handleTimestamp(ts) {
            const mismatch = ts.length - (mega.rewindUtils.packets.length - 1);
            if (mismatch) {
                logger.warn('RewindChunkPacketHandler.handleTimestamp - ts and packets length mismatch', mismatch);
            }

            for (let i = 0; i < ts.length; i++) {
                const packetIndex = i + 1;
                if (packetIndex < mega.rewindUtils.packets.length) {
                    const packet = mega.rewindUtils.packets[packetIndex];
                    if (packet) {
                        packet[3] = ts[i];
                    }
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

    /**
     * Handles the rewinding and reinstatement of data.
     */
    class RewindReinstateHandler {
        constructor() {
            this.init();
        }

        init() {
            this.toBeRestored = [];
            this.seen = new Set();
            this.restored = Object.create(null);
            this.freshNodes = Object.create(null);
            this.selectedNodes = [];
            this.inProgress = false;
            this.stats = Object.create(null);
            this.apiInit = false;
        }

        initChannel() {
            if (!this.apiInit) {
                reinstateChannel = api.addChannel(-1, 'cs');
                this.apiInit = true;
            }
        }

        /**
         * Asynchronously restores a single node to under a specified parent (target).
         * This function will make the requests to the API as well as populate the `restored` list
         * @param {string} handle - The handle of the node to be restored.
         * @param {string} target - The handle of the parent under which the node will be restored.
         * @returns {Promise<void>} A promise that resolves when the node is successfully restored.
         */
        async restoreSingleNode(handle, target) {

            if (this.restored[handle] || !target) {
                return;
            }

            // Change target to the restored folder
            if (this.restored[target]) {
                target = this.restored[target];
            }

            const n = mega.rewind.persist.nodeDictionary[handle];

            let oldVersion;

            // Assume target always exists
            if (M.c[target]) {
                for (const h in M.c[target]) {
                    // Check if both are files/folders with matching names
                    if ((h === n.h || M.d[h] && M.d[h].name === n.name) && n.t === M.d[h].t) {
                        // If its a file, version it
                        if (!M.d[h].t) {
                            oldVersion = h;
                            this.restored[n.h] = h;
                            this.stats.versioned = (this.stats.versioned || 0) + 1;
                            break;
                        }
                        // Ensure that folders are not duplicated
                        this.restored[n.h] = h;
                        return;
                    }
                }
            }

            const req = {
                a: 'pd',
                v: 3,
                sm: 1,
                t: target,
                n: [{
                    k: a32_to_base64(encrypt_key(u_k_aes, n.k)),
                    a: ab_to_base64(crypto_makeattr(n)),
                    h: n.h,
                    t: n.t
                }]
            };

            // Use current timestamp (time of restoration) as the last modified time
            if (!n.t) {
                req.n[0].mtime = Math.floor(Date.now() / 1000);
            }

            if (oldVersion) {
                req.n[0].ov = oldVersion;
            }

            const sn = M.getShareNodesSync(target, null, true);
            if (sn.length) {
                req.cr = crypto_makecr([n], sn, false);
                req.cr[1][0] = req.n[0].h;
            }

            const statProp = req.n[0].t ? 'dirs' : 'files';

            this.initChannel();
            return api.screq(req, reinstateChannel).then(res => {
                this.restored[handle] = res.handle;
                this.stats[statProp] = (this.stats[statProp] || 0) + 1;
                return res.handle;
            });
        }

        /**
         * Adds parents of a node to the restoration list.
         * @param {string} handle - The handle of the node whose parents are to be added.
         * @returns {Promise<void>} A promise that resolves when all the parents are added to the restoration list.
         */
        async addParentsToRestoreList(handle) {
            // Cloud root can exist in the selection, we do not restore the cloud node's parents
            if (!handle) {
                return;
            }

            // Running rewind on a folder means that the folder always exists
            if (handle === mega.rewind.selectedHandle) {
                this.restored[handle] = handle;
                this.seen.add(handle);
                return;
            }

            const node = mega.rewind.persist.nodeDictionary[handle];
            let parentHandle = node && node.p;

            // If the node to be restored is the cloud drive root, we do nothing
            if (!parentHandle || typeof parentHandle !== 'string') {
                return;
            }

            // Populate M.d with the node so we can check its existence
            if (!M.d[handle]) {
                await dbfetch.acquire(handle);
                this.seen.add(parentHandle);
            }

            // Check if the parent exists, if it does, add it to the restored map
            if (M.d[parentHandle]
                && !this.freshNodes[parentHandle]
                && M.d[parentHandle].p === mega.rewind.persist.nodeDictionary[parentHandle].p) {

                this.restored[parentHandle] = parentHandle;
                this.seen.add(parentHandle);

                // Restore the folder name
                const previousName = mega.rewind.persist.nodeDictionary[parentHandle].name;
                if (M.d[parentHandle].name !== previousName) {
                    M.rename(parentHandle, previousName).catch(tell);
                }
            }

            // Or if the node has already been restored, we change the current working
            // parent handle to the new one
            else if (this.restored[parentHandle]) {
                parentHandle = this.restored[parentHandle];
            }

            // Parent doesn't exist, and it has not been restored, so add it to the restore list
            else {
                this.freshNodes[parentHandle] = 1;
                await this.addParentsToRestoreList(parentHandle);
                this.seen.add(parentHandle);
            }

            // Add current node
            if (!this.toBeRestored.includes(handle)) {
                this.toBeRestored.unshift(handle);
                this.seen.add(handle);
            }

            // Mark current node as fresh if parent is fresh
            if (this.freshNodes[parentHandle]) {
                this.freshNodes[handle] = 1;
            }
        }

        /**
         * Adds children of a node to the restoration list.
         * @param {string} handle - The handle of the node whose children are to be added.
         * @returns {void}
         */
        addChildrenToRestoreList(handle) {

            const children = mega.rewind.persist.nodeChildrenDictionary[handle];

            this.seen.add(handle);

            if (!children) {
                return;
            }

            for (const [h, type] of Object.entries(children)) {
                // Add the handle to the list for restoring
                if (!this.toBeRestored.includes(h)) {

                    this.seen.add(h);
                    this.toBeRestored.push(h);
                }

                // If the node is a folder, perform a recursive call
                else if (type === 2) {
                    this.addChildrenToRestoreList(h);
                }
            }
        }

        /**
         * Sorts handles in-place by depth
         * @param {string[]} handles - An array of handles of the nodes to be sorted.
         * @param {Object} dict - The node dictionary, object where keys are handles and values are node properties.
         *                        We can also use `M.d` or `mega.rewind.nodeDictionary` here.
         * @param {string} [rootHandle=M.RootID] - The handle of the root node. Defaults to M.RootID if not provided.
         *                                         This does not need to be the Cloud drive root, just an anchor point.
         * @returns {void}
         */
        _sortHandlesByDepth(handles, dict, rootHandle = M.RootID) {
            const depthMap = Object.create(null);

            for (let i = 0; i < handles.length; i++) {
                let node = dict[handles[i]];
                let depth = 0;
                while (node && node.h !== rootHandle && node.p) {
                    depth++;
                    node = dict[node.p];
                }
                depthMap[handles[i]] = depth;
            }

            handles.sort((h1, h2) => depthMap[h1] - depthMap[h2]);
        }

        /**
        * Asynchronously restores nodes based on provided handles.
        * @param {string[]} handles - An array of handles for the nodes to be restored.
        * @param {Function} progressCallback - A callback to track progress.
        *                                      It takes a normalized value (completed / totalCount) as a parameter.
        * @returns {Promise<void>} - A promise that resolves when all nodes are restored.
        */
        async restoreNodes(handles, progressCallback) {

            console.log("[RewindReinstateHandler] Restore started");

            this.inProgress = true;

            loadingDialog.show();

            // If any subtree is collapsed, we add the hidden nodes to be restored as well
            const partials = Object.values(mega.rewind.persist.selectedNodesPartial).flatMap(o => Object.keys(o));

            if (partials.length) {
                this.toBeRestored.push(...partials);
            }

            // We sort the handles by depth, needed for partial selections
            this._sortHandlesByDepth(handles, mega.rewind.persist.nodeDictionary, mega.rewind.persist.selectedHandle);

            this.toBeRestored = typeof handles === 'string' ? [handles] : handles;
            this.restored = Object.create(null);

            loadingDialog.hide();

            // Do a traversal along the parents for each node and restore if parent is missing
            let idx = 0;
            while (idx < this.toBeRestored.length) {
                const currentHandle = this.toBeRestored[idx];
                if (!this.seen.has(currentHandle)) {
                    await this.addParentsToRestoreList(currentHandle);
                }

                // `1` refers to a fully selected node, add its children in case its subtree is collapsed
                // If the node is not in `selectedNodes`, we added this to the restore list
                if (mega.rewind.persist.nodeDictionary[currentHandle].t
                    && (!mega.rewind.persist.selectedNodes[currentHandle]
                        || mega.rewind.persist.selectedNodes[currentHandle] === 1)) {

                    this.addChildrenToRestoreList(currentHandle);
                }
                idx++;
            }

            this.toBeRestored = [...new Set(this.toBeRestored)];

            // Finally, reinstate the nodes
            for (let i = 0; i < this.toBeRestored.length; i++) {

                const h = this.toBeRestored[i];
                const target = mega.rewind.persist.nodeDictionary[h].p;
                await this.restoreSingleNode(h, target).catch(ex => {
                    this.inProgress = false;
                    throw ex;
                });

                if (progressCallback && typeof progressCallback === 'function') {
                    progressCallback((i + 1) / this.toBeRestored.length);
                }
            }

            this.inProgress = false;

            const statStr = JSON.stringify([this.stats.files | 0,
                                            this.stats.dirs | 0,
                                            this.stats.versioned | 0]);
            // Cleanup
            this.toBeRestored = [];
            this.seen.clear();
            api.removeChannel(reinstateChannel);
            this.apiInit = false;
            this.restored = Object.create(null);
            this.freshNodes = Object.create(null);
            this.stats = Object.create(null);

            delay('rewind:log-reinstate-successful', eventlog.bind(null, 500471, statStr));

            console.log("[RewindReinstateHandler] Restore finished!");
        }
    }

    return new class RewindUtils {
        constructor() {
            this.init();
        }

        init() {
            lazy(this, 'tree', () => new RewindChunkTreeHandler());
            lazy(this, 'packet', () => new RewindChunkPacketHandler());
            lazy(this, 'reinstate', () => new RewindReinstateHandler());

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
