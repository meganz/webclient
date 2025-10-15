/** @property mega.rewindUtils */
lazy(mega, 'rewindUtils', () => {
    'use strict';

    const logger = new MegaLogger('utils', null, MegaLogger.getLogger('rewind'));
    let treeChannel = -1;
    let packetChannel = -1;
    let rewindWorker = null;

    const RewindAdditionType = {
        FILE: 'Adding file',
        FILE_VERSIONED: 'Adding version to file',
        BLIND_ROOT: 'Adding all nodes in tree',
        BLIND_FOLDER: 'Adding folder',
        SKIP_FILE: 'Skipped',
    };

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
            const {token, error, bulkpm} = data;
            if (bulkpm && Array.isArray(data)) {
                while (data.length) {
                    this.dispatch(data.shift());
                }
                this.broadcast('flush', {flush: 1});
                return;
            }

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
                if (command === 'flush') {
                    worker.postMessage({flush: 1});
                }
                else {
                    promiseArray.push(new Promise((resolve, reject) => {
                        this.post(worker, {resolve, reject, command, payload});
                    }));
                }
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

            rewindWorker.broadcast('flush', {flush: true});
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

            rewindWorker.broadcast('flush', {flush: true});
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

    class ReinstateLogger {
        constructor() {
            this.init();
        }
        init() {
            this.prefix = 'Rewind:reinstateLogger';
            this.entryCount = -1;
        }
        next() {
            this.entryCount += 1;
            return this;
        }
        log(type, data) {
            console.log(
                this.prefix,
                `[${this.entryCount}]`,
                `[${type}]`,
                data
            );
            return this;
        }
    }

    class RewindReinstateHandler {
        constructor() {
            this.init();
        }

        init() {
            this.channel = -1;
            this.progressCallback = null;
            this.inProgress = false;
            this.numFoldersProcessed = 0;
            this.apiInit = false;
            this.reinstateLogger = new ReinstateLogger();
        }

        initChannel() {
            if (!this.apiInit) {
                this.channel = api.addChannel(-1, 'cs');
                mega.requestStatusMonitor.listen(this.channel);
                this.apiInit = true;
            }
        }

        finalise() {
            if (this.apiInit) {
                mega.requestStatusMonitor.unlisten(this.channel);
                api.removeChannel(this.channel);
                this.apiInit = false;
            }
            this.inProgress = false;
        }

        // TODO: Implement this later
        async checkRestored() {
            // Verify if restore worked by checking each restored node
        }

        _countNestedFolders(root) {
            let count = 0;
            const handles = [root];
            while (handles.length) {
                count++;
                const handle = handles.pop();
                const tree = M.tree[handle];
                if (tree) {
                    const nodes = Object.values(tree);
                    for (let i = 0; i < nodes.length; i++) {
                        handles.push(nodes[i].h);
                    }
                }
            }
            return count;
        }

        async buildRequests(root) {
            const requests = [];
            const numFolders = this._countNestedFolders(root);
            this.numFoldersProcessed = 0;

            loadingDialog.showProgress(0);
            await this._buildRequests(root, requests, numFolders);
            loadingDialog.showProgress(100);
            loadingDialog.hideProgress();
            return requests;
        }

        async _buildRequests(root, requests, numFolders, altTarget = false, level = 0) {
            loadingDialog.showProgress(this.numFoldersProcessed++ / numFolders * 100);

            const currentLevelChildren = Object.keys(mega.rewind.persist.nodeChildrenDictionary[root] || {});

            // 0. If no children exist, we do nothing
            if (!currentLevelChildren || !currentLevelChildren.length) {
                return false;
            }

            const dupeData = await this._getDupeData(currentLevelChildren, altTarget || root);

            // 2. If (no duplicates || no duplicate folders)
            //      Add all nodes under tree in one request, version files if required
            if (!dupeData || !dupeData.count.folders) {
                this.reinstateLogger.next().log(
                    RewindAdditionType.BLIND_ROOT,
                    `No duplicate folders: Intended root ${root}, Alternative ${altTarget}`
                );
                const nodes = await this._buildNodesInTree(root, altTarget, dupeData);
                if (nodes && nodes.length) {
                    this._addToRequests(requests, altTarget || root, nodes);
                }
            }
            else {
                // 3. If duplicate folders exist, restore everything else first
                const skipNodes = dupeData.folders;
                this.reinstateLogger.next().log(
                    RewindAdditionType.BLIND_ROOT,
                    `Duplicate folders: Intended root ${root}, Alternative ${altTarget}`
                );

                const nodes = await this._buildNodesInTree(root, altTarget, dupeData, skipNodes);
                if (nodes && nodes.length) {
                    this._addToRequests(requests, altTarget || root, nodes);
                }

                // 4. Then recursively build the requests inside the duplicates
                //      This means that we are NOT restoring duplicate folders
                for (const [rwh, cdh] of Object.entries(dupeData.folders)) {
                    const existingHandle = mega.rewind.persist.nodeDictionary[cdh] ? cdh : rwh;
                    const altTarget = existingHandle === rwh ? cdh : false;
                    await this._buildRequests(existingHandle, requests, numFolders, altTarget, level + 1);
                }
            }
        }

        _addToRequests(requests, target, nodes) {
            requests.push({
                a: 'pd',
                v: 3,
                sm: 1,
                t: target,
                n: nodes,
            });
        }

        async _getDupeData(handlesToCheck, target) {
            const files = Object.create(null);
            const folders = Object.create(null);
            const count = { files: 0, folders: 0 };
            const uniqueCount = { files: 0, folders: 0};
            const uniqueFolders = Object.create(null);
            let hasDupe = false;

            await dbfetch.acquire(target).catch(nop);

            const children = Object.keys(M.c[target] || {});
            if (children.length) {
                await dbfetch.acquire(children).catch(nop);
            }

            const childrenMap = {};
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                const {h, t, name} = M.d[child] || {};
                if (h && name) {
                    childrenMap[name] = {h, t};
                }
            }

            for (let i = 0; i < handlesToCheck.length; i++) {
                const handle = handlesToCheck[i];
                const nodeInDict = mega.rewind.persist.nodeDictionary[handle];
                const childInMap = childrenMap[nodeInDict.name];

                if (childInMap && !!childInMap.t === !!nodeInDict.t) {
                    hasDupe = true;
                    if (nodeInDict.t) {
                        folders[handle] = childInMap.h;
                        count.folders++;
                    }
                    else {
                        files[handle] = childInMap.h;
                        count.files++;
                    }
                }
                else if (nodeInDict.t) {
                    uniqueFolders[handle] = 1;
                    uniqueCount.folders++;
                }
                else {
                    // uniqueFiles - not yet required
                    uniqueCount.files++;
                }
            }

            return hasDupe && {files, folders, count, uniques: {folders: uniqueFolders, count: uniqueCount}};
        }

        _prepareNode(n) {
            if (typeof n === 'string') {
                n = mega.rewind.persist.nodeDictionary[n];
            }

            return {
                k: a32_to_base64(encrypt_key(u_k_aes, n.k)),
                a: ab_to_base64(crypto_makeattr(n)),
                h: n.h,
                t: n.t,
                p: n.p,
            };
        }

        async _addChildrenToNodes(children, nodes, toExplore, dupeData) {
            const handles = Object.keys(children);

            const handlesToFetch = [];
            for (let i = 0; i < handles.length; i++) {
                const h = handles[i];
                const type = children[h];
                if (type !== 2 && dupeData && dupeData.files[h]) {
                    handlesToFetch.push(h);
                }
            }

            if (handlesToFetch.length) {
                await dbfetch.acquire(handlesToFetch).catch(nop);
            }

            for (let i = 0; i < handles.length; i++) {
                const h = handles[i];
                const type = children[h];

                if (type === 2) {
                    toExplore.push(h);
                }
                else {
                    const oldHandle = dupeData && dupeData.files[h];
                    if (oldHandle) {
                        const oldNode = M.d[oldHandle];
                        const nodeInDict = mega.rewind.persist.nodeDictionary[h];
                        if (oldNode && nodeInDict && oldNode.hash === nodeInDict.hash) {
                            this.reinstateLogger.log(
                                RewindAdditionType.SKIP_FILE,
                                `Skipped ${h}, duplicated with ${oldHandle}`
                            );
                            continue;
                        }
                    }
                    const node = this._prepareNode(h);
                    if (oldHandle) {
                        node.ov = oldHandle;
                        this.reinstateLogger.log(
                            RewindAdditionType.FILE_VERSIONED, `${h} to version ${oldHandle}`);
                    }
                    else {
                        this.reinstateLogger.log(RewindAdditionType.FILE, h);
                    }
                    nodes.push(node);
                }
            }
        }

        async _buildNodesInTree(root, altTarget = false, dupeData = false, skipNodes = false) {
            const toExplore = [root];
            const nodes = [];

            let curr;
            let children;

            while (toExplore.length) {
                curr = toExplore.shift();

                if (skipNodes && skipNodes[curr]) {
                    continue;
                }

                if (curr !== root) {
                    this.reinstateLogger.log(
                        mega.rewind.persist.nodeDictionary[curr].t
                            ? RewindAdditionType.BLIND_FOLDER
                            : RewindAdditionType.FILE,
                        curr
                    );
                    nodes.push(this._prepareNode(curr));
                }
                children = mega.rewind.persist.nodeChildrenDictionary[curr];
                if (children) {
                    await this._addChildrenToNodes(children, nodes, toExplore, dupeData);
                }
            }

            for (let i = 0; i < nodes.length; i++) {
                if (nodes[i].p === altTarget || nodes[i].p === root) {
                    delete nodes[i].p;
                }
            }

            return nodes;
        }

        /**
        * Asynchronously restores nodes based on provided handles.
        * @param {string[]} rwRoot - The rewind root (node handle)
        * @param {RewindProgress} progress - Restore progress UI manager
        * @param {Object} options - progress options
        * @returns {Promise<void>} - A promise that resolves when all nodes are restored.
        */
        async restoreNodes(rwRoot, progress, options) {
            this.inProgress = true;
            const {folderName, restoreDate} = options;
            progress.init(folderName, restoreDate);

            this.initChannel();

            progress.showSection();
            progress.next();

            console.time('Rewind:build-requests');
            const requests = await this.buildRequests(rwRoot);
            console.timeEnd('Rewind:build-requests');

            progress.next();

            console.time('Rewind:run-requests');
            const res = requests.length ? await api.screq(requests, this.channel) : null;
            console.timeEnd('Rewind:run-requests');

            progress.next();
            progress.hideSection();
            progress.showToaster();

            return res;
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
