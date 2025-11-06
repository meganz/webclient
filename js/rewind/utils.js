/** @property mega.rewindUtils */
lazy(mega, 'rewindUtils', () => {
    'use strict';

    const logger = new MegaLogger('utils', null, MegaLogger.getLogger('rewind'));
    let rewindWorker = null;

    const RewindAdditionType = {
        FILE: 'Adding file',
        FILE_VERSIONED: 'Adding version to file',
        BLIND_ROOT: 'Adding all nodes in tree',
        BLIND_FOLDER: 'Adding folder',
        SKIP_FILE: 'Skipped',
    };

    class RewindTask {
        constructor() {
            this.reset();
        }

        reset() {
            this.timers = new Set();
            this.percent = 0;
            this.running = 0;
            this.tasks = {
                'getRecords:tree:cache:read': 0,
                'getRecords:tree:storage:read': 0,
                'getRecords:tree:state:storage:read': 0,
                'getRecords:tree:state:storage:save:start': 0,
                'getRecords:tree:state:storage:save:end': 0,
                'getRecords:tree:prepare': 0,
                'getRecords:tree:api:get': 0,
                'getRecords:tree:api:get:process:queue': 0,
                'getRecords:tree:api:get:process:putQueue': 0,
                'getRecords:packet:prepare': 0,
                'getRecords:packet:storage:read': 0,
                'getRecords:packet:state:storage:save': 0,
                'getRecords:packet:api:get': 0,
                'getRecords:packet:api:get:process:queue': 0,
                'getRecords:packet:api:get:process:putQueue': 0,
            };
        }

        start(id) {
            const isProgressTask = this._isProgressTask(id);
            if (isProgressTask) {
                this.running++;
            }

            this.update(id, 0);

            if (!this.timers.has(id)) {
                const taskInfo = isProgressTask ? `-> Task #${this.running}` : '';
                logger.info(`rewind:${id}: started ${taskInfo}`);
                logger.time(`rewind:${id}`);
                this.timers.add(id);
            }
        }

        complete(id) {
            this.update(id, 100);

            if (this.timers.has(id)) {
                logger.timeEnd(`rewind:${id}`);
                this.timers.delete(id);
            }
        }

        update(id, val) {
            if (this._isProgressTask(id) && val >= 0 && val <= 100) {
                if (val.toFixed(2) === this.tasks[id].toFixed(2)) {
                    if (val === 0 || val === 100) {
                        mega.rewindUi.sidebar.updateTaskProgress(this.running, val);
                    }
                    return;
                }

                this.tasks[id] = val;
                mega.rewindUi.sidebar.updateTaskProgress(this.running, val);

                let percent = 0;
                const tasksPercents = Object.values(this.tasks);

                for (let i = 0; i < tasksPercents.length; i++) {
                    percent += Number(tasksPercents[i]) || 0;
                }

                percent = Math.min(100, Math.floor(percent / tasksPercents.length));
                if (this.percent !== percent) {
                    this.percent = percent;
                    mega.rewindUi.sidebar.updateProgress(percent);
                }
            }
        }

        _isProgressTask(id) {
            return this.tasks.hasOwnProperty(id);
        }
    }

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

    class RewindChunkHandler {
        constructor(isMonitored) {
            this.channel = -1;
            this.isMonitored = isMonitored;
        }

        initChannel(id, cmd, handlers) {
            if (this.channel === -1) {
                this.channel = api.addChannel(id, cmd, handlers ? freeze(handlers) : undefined);
                if (this.isMonitored) {
                    mega.requestStatusMonitor.listen(this.channel);
                }
            }
        }

        finalise() {
            if (this.channel !== -1) {
                if (this.isMonitored) {
                    mega.requestStatusMonitor.unlisten(this.channel);
                }
                api.removeChannel(this.channel);
                this.channel = -1;
            }
        }
    }

    class RewindChunkTreeHandler extends RewindChunkHandler {
        initChannel() {
            super.initChannel(-1, 'cs', {
                '[': this.handleResidue,
                '[{[ok0{': this.handleOwnerKey,
                '[{[f{': this.handleNode,
                '[{[f2{': this.handleNode
            });
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

            const {length} = mega.rewindUtils.queue[node.apiId];
            return mega.rewindUtils.queue[node.apiId].push(
                nodePromise.then((node) => mega.rewindUtils.handleTreeNode(node, length)));
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

            if (rewindWorker) {
                rewindWorker.broadcast('flush', {flush: true});
            }

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
            mega.rewindUtils.checkRequestDone(apiId, 'getRecords:tree:api:get:process')
                .catch((ex) => {
                    mega.rewindUi.sidebar.close();
                    tell(ex);
                });
        }
    }

    class RewindChunkPacketHandler extends RewindChunkHandler {
        initChannel() {
            super.initChannel(-1,  'sc', {
                '{': this.handleResidue,
                '{[a{': this.handlePacket,
                '{[a{{t[f{': this.handleNode,  // SC node
                '{[a{{t[f2{': this.handleNode  // SC node (versioned)
            });
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

            if (rewindWorker) {
                rewindWorker.broadcast('flush', {flush: true});
            }

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
            await mega.rewindUtils.checkRequestDone(apiId, 'getRecords:packet:api:get:process', true)
                .catch((ex) => {
                    mega.rewindUi.sidebar.close();
                    tell(ex);
                });

            const sn = response.sn; // Last SN on the action packet
            const packets = mega.rewindUtils.packets; // Processed packets

            logger.info('Packet.handlePostRequest - sendMessage "rewind:packet:done"');
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

    class RewindReinstateHandler extends RewindChunkHandler {
        constructor() {
            super(true);
            this.progressCallback = null;
            this.inProgress = false;
            this.numFoldersProcessed = 0;
            this.reinstateLogger = new ReinstateLogger();
        }

        initChannel() {
            super.initChannel(-1,  'cs');
        }

        finalise() {
            super.finalise();
            this.inProgress = false;
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
            const req = {
                a: 'pd',
                v: 3,
                sm: 1,
                t: target,
                n: nodes,
            };

            const sn = M.getShareNodesSync(target, null, true);
            if (sn.length) {
                const nodesInDict = [];
                const handles = [];

                for (let i = 0; i < nodes.length; i++) {
                    const {h} = nodes[i];
                    nodesInDict.push(mega.rewind.nodeDictionary[h]);
                    handles.push(h);
                }

                req.cr = crypto_makecr(nodesInDict, sn, false);
                req.cr[1].push(...handles);
            }

            requests.push(req);
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

            mega.rewindUtils.task.reset();
            progress.init(folderName, restoreDate);

            this.initChannel();

            progress.showSection();
            progress.next();

            mega.rewindUtils.task.start('restore:requests:build');
            const requests = await this.buildRequests(rwRoot);
            mega.rewindUtils.task.complete('restore:requests:build');

            progress.next();

            mega.rewindUtils.task.start('restore:requests:run');
            const res = requests.length ? await api.screq(requests, this.channel) : null;
            mega.rewindUtils.task.complete('restore:requests:run');

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
            lazy(this, 'task', () => new RewindTask());

            this.reset();
        }

        reset() {
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

            logger.info('RewindUtils.getTreeCacheList - Send request', payload);
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

            logger.info('RewindUtils.getChangeLog - Send request', payload);
            return api.req(payload).then(({result}) => result);
        }

        getChunkedTreeCacheHistory(timestamp, handle, progressCallback) {
            this.tree.initChannel();

            const payload = {
                a: 'tch',
                ts: timestamp,
                h: handle
            };

            const options = {
                progress: progressCallback,
                channel: this.tree.channel,
            };

            logger.info('RewindUtils.getChunkedTreeCacheHistory - Send request', payload);
            return api.req(payload, options).then(({result}) => result);
        }

        getChunkedActionPacketHistory(sequenceNumber, endDate, progressCallback) {
            this.packet.initChannel();

            if (endDate instanceof Date) {
                endDate = endDate.getTime();
            }

            const payload = `sn=${sequenceNumber}&ts=1&ets=${Math.round(endDate)}`;
            const options = {
                progress: progressCallback,
                channel: this.packet.channel
            };

            logger.info('RewindUtils.getChunkedActionPacketHistory - Send request', payload);
            return api.req(payload, options).then(({result}) => result);
        }

        async handleTreeNode(node, length) {
            const qTotal = this.queue[node.apiId].length;
            this.task.update('getRecords:tree:api:get:process:queue', (qTotal - length) / qTotal * 100);

            if (node.h) {
                node.apiId = null;
                delete node.apiId;

                return mega.rewind.addNodeFromWorker(node);
            }
        }

        async checkRequestDone(apiId, progressSource, isPacket) {
            if (this.inflight && this.inflight[apiId]) {
                this.task.start(progressSource);

                this.task.start(`${progressSource}:queue`);
                if (this.queue && this.queue[apiId]) {
                    const limit = 10000;
                    const qTotal = this.queue[apiId].length;
                    for (let i = 0; i < qTotal; i += limit) {
                        if (isPacket) {
                            this.task.update(`${progressSource}:queue`, i / qTotal * 100);
                        }
                        const end = Math.min(i + limit, qTotal);
                        await Promise.allSettled(this.queue[apiId].slice(i, end));
                    }
                    delete this.queue[apiId];
                }
                this.task.complete(`${progressSource}:queue`);

                for (const api of this.inflight[apiId]) {
                    if (api.residual && api.residual.length) {
                        api.residual[0].resolve();
                    }
                }
                delete this.inflight[apiId];

                this.task.start(`${progressSource}:putQueue`);
                if (mega.rewind.putQueue && mega.rewind.putQueue.length) {
                    let oldPromise = null;
                    const promises = [];

                    const batch = mega.rewind.putQueue.splice(0, FMDB_FLUSH_THRESHOLD);
                    const bTotal = batch.length;

                    for (let i = 0; i < bTotal; i++) {
                        const [putFunction, ...putArgs] = batch[i];
                        const promise = putFunction(...putArgs);
                        if (promise !== oldPromise) {
                            oldPromise = promise;
                            promises.push(oldPromise.finally(() => {
                                this.task.update(`${progressSource}:putQueue`, i / bTotal * 100);
                            }));
                        }
                    }

                    await Promise.allSettled(promises);
                    logger.info('Flushing nodes done');
                }
                this.task.complete(`${progressSource}:putQueue`);

                // Clone size dictionary
                if (!isPacket) {
                    // Sum all the size data for the nodes
                    mega.rewind.sumSizeData();
                    logger.info(`Api.checkRequestDone -` +
                        `Downloaded ${Object.keys(mega.rewind.nodeDictionary).length - 1} nodes`);
                }

                logger.info(`Api.checkRequestDone - Request done - with inflight - isPacket: ${isPacket}`);
                this.task.complete(progressSource);
                return true;
            }

            logger.info(`Api.checkRequestDone - Request done - without inflight - isPacket: ${progressSource}`);
            return false;
        }
    };
});
