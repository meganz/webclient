/* eslint-disable max-classes-per-file */
/**
 * @property {FileRequestCommon} mega.fileRequestCommon
 */
lazy(mega, 'fileRequestCommon', () => {
    'use strict';

    const DEBUG = self.d > 1;

    const logger = new MegaLogger('common', null, MegaLogger.getLogger('FileRequest'));
    const treeClass = 'file-request-folder';

    const ongoingRemoval = new Set();
    const dspOngoingRemoval = () => {
        const nodes = [...ongoingRemoval].map(h => Object.keys(M.c[h] || {})).flat().map(h => M.d[h]).filter(Boolean);

        ongoingRemoval.clear();
        mBroadcaster.sendMessage('mediainfo:collect', true, nodes);
    };
    const addOngoingRemoval = (h) => {
        ongoingRemoval.add(h);
        delay('file-request:ongoing-removal', dspOngoingRemoval, 2e3);
    };

    const refreshFileRequestPageList = () => {
        if (fminitialized && M.currentdirid === 'file-requests') {
            M.openFolder(M.currentdirid, true);
            selectionManager.clear_selection();
        }
    };

    const updateMobileNodeIcon = (nodeHandle) => {
        const component = MegaNodeComponent.getNodeComponentByHandle(nodeHandle);

        if (component) {
            component.update('icon');
        }
    };

    const addFileRequestIcon = (puHandlePublicHandle) => {
        if (fminitialized && puHandlePublicHandle) {
            const puHandleObject = M.d[puHandlePublicHandle]
                || mega.fileRequestCommon.storage.getPuHandleByPublicHandle(puHandlePublicHandle);

            if (!puHandleObject) {
                if (d) {
                    logger.info('common.addFileRequestIcon - Failed to add icon', puHandleObject, puHandlePublicHandle);
                }
                return;
            }

            const nodeId = puHandleObject.h;
            if (is_mobile) {
                updateMobileNodeIcon(nodeId);
                return;
            }

            let $nodeId = $(`#${nodeId}`);
            const $tree = $(`#treea_${nodeId} span.nw-fm-tree-folder`);

            if (
                $nodeId.length === 0 &&
                !String(M.currentdirid).includes('chat') &&
                M.megaRender && M.megaRender.hasDOMNode(nodeId)
            ) {
                $nodeId = $(M.megaRender.getDOMNode(nodeId));
            }

            if (!$nodeId.length && !$tree.length) {
                return false;
            }

            const viewModeClass = M.onIconView ? 'i.item-type-icon-90' : 'span.item-type-icon';
            const folderClass = M.onIconView ? 'icon-folder-public-90' : 'icon-folder-public-24';

            $(viewModeClass, $nodeId).addClass(folderClass);

            if ($tree.length) {
                $tree.addClass(treeClass);
            }

            if (DEBUG) {
                logger.info(
                    'common.addFileRequestIcon - Added node icon',
                    nodeId,
                    puHandleObject,
                    puHandlePublicHandle
                );
            }
        }
    };

    const removeFileRequestIcon = (selectedNodeHandle) => {
        if (fminitialized && selectedNodeHandle) {
            const nodeId = selectedNodeHandle;
            if (is_mobile) {
                updateMobileNodeIcon(nodeId);
                return;
            }

            let node = document.getElementById(nodeId);

            if (node && M.megaRender && M.megaRender.hasDOMNode(nodeId)) {
                node = M.megaRender.getDOMNode(nodeId);

                const viewModeClass = M.onIconView ? 'i.item-type-icon-90' : 'span.item-type-icon';
                $(viewModeClass, node).removeClass('icon-folder-public-24 icon-folder-public-90')
                    .addClass(M.onIconView ? 'icon-folder-90' : 'icon-folder-24');
            }

            $(`#treea_${nodeId} span.nw-fm-tree-folder`)
                .removeClass(treeClass);
        }
    };

    const isEmpty = (input) => {
        return input === undefined || input === null || input === '';
    };

    class FileRequestApi {
        create(handle, title, description) {
            const data = {
                name: u_attr.name,
                email: u_attr.email,
                msg: title || '',
                description: description || ''
            };

            mLoadingSpinner.show('puf-create');

            eventlog(99773);
            return api.screq({n: handle, a: 'ul', d: 0, s: 2, data})
                .finally(() => {
                    mLoadingSpinner.hide('puf-create');
                });
        }

        // Remove public upload folder
        remove(handle) {

            addOngoingRemoval(handle);
            mLoadingSpinner.show('puf-remove');

            return api.screq({a: 'ul', d: 1, n: handle})
                .finally(() => {
                    mLoadingSpinner.hide('puf-remove');
                });
        }

        update(puPagePublicHandle, title, description, name, email, settings) {
            const d = {
                name: name || u_attr.name,
                email: email || u_attr.email,
                msg: title,
                description: description
            };
            const req = {a: 'ps', p: puPagePublicHandle, d};

            if (settings) {
                d.f = settings.folder ? 0 : 1;      // Disallow folder uploads
                req.mfs = settings.limit || 0;      // Max file size in bytes
                req.ets = settings.expiry || 0;     // Expiry timestamp (unix seconds)
            }

            mLoadingSpinner.show('puf-update');

            return api.screq(req)
                .finally(() => {
                    mLoadingSpinner.hide('puf-update');
                });
        }

        getPuPageList() {

            return api.req({a: 'pl'});
        }

        getPuPage(pageId) {

            return api.req({a: 'pg', p: pageId});
        }

        getOwnerPublicKey(ownerHandle) {

            return api.req({a: 'uk', u: ownerHandle}).then(({result: {pubk}}) => pubk);
        }
    }

    class FileRequestStorage {
        constructor() {
            this.cache = {
                puHandle: Object.create(null),
                puPage: Object.create(null),
                puMessages: Object.create(null)
            };
        }

        addPuMessage(puHandlePublicHandle) {
            this.cache.puMessages[puHandlePublicHandle] = 1;
        }

        hasPuMessage(puHandlePublicHandle) {
            return this.cache.puMessages[puHandlePublicHandle] !== undefined;
        }

        removePuMessage(puHandlePublicHandle) {
            if (this.cache.puMessages[puHandlePublicHandle]) {
                delete this.cache.puMessages[puHandlePublicHandle];
            }
        }

        removePuHandle(puHandleNodeHandle, puHandlePublicHandle) {
            if (DEBUG) {
                logger.info('Storage.removePuHandle', {
                    puHandleNodeHandle,
                    puHandlePublicHandle
                });
            }

            if (fmdb && !pfkey) {
                fmdb.del('puf', puHandlePublicHandle);
            }

            let nodeHandle = puHandleNodeHandle;
            if (!puHandleNodeHandle || !this.cache.puHandle[nodeHandle]) {
                nodeHandle = this.getPuHandleKeyByPublicHandle(puHandlePublicHandle);
            }

            if (nodeHandle && this.cache.puHandle[nodeHandle]) {
                delete this.cache.puHandle[nodeHandle];
            }

            if (fminitialized && nodeHandle) {
                removeFileRequestIcon(nodeHandle);
            }
        }

        addPuHandle(puHandleNodeHandle, puHandlePublicHandle, data, pagePublicHandle) {
            if (DEBUG) {
                logger.info('Storage.addPuHandle', {
                    puHandleNodeHandle,
                    puHandlePublicHandle
                });
            }
            let n = M.getNodeByHandle(puHandleNodeHandle);
            // Since the name is getting retrieved asynchronously, we can update it later
            if (!n.name) {
                if (d) {
                    logger.warn('Storage.addPuHandle - no name was found', n, puHandleNodeHandle, puHandlePublicHandle);
                }
            }

            const puHandleState = 2;
            const {name = ''} = n;
            let title = '';
            let description = '';

            if (data) {
                title = data.msg;
                description = data.description;

                if (DEBUG) {
                    logger.info('Storage.addPuHandle - with data', puHandleNodeHandle, puHandlePublicHandle);
                }
            }

            if (DEBUG) {
                logger.info(
                    'Storage.addPuHandle - puf add',
                    puHandlePublicHandle,
                    puHandleNodeHandle
                );
            }

            // This just make sure we have the entry saved on cache locally
            this.saveOrUpdatePuHandle(
                {
                    nodeHandle: puHandleNodeHandle,
                    title,
                    description,
                    name,
                    state: puHandleState,
                    publicHandle: puHandlePublicHandle,
                    pagePublicHandle
                }
            );
        }

        saveOrUpdatePuHandle(options, update) {
            if (!options.publicHandle) {
                logger.info(
                    'Storage.saveOrUpdatePuHandle - PUF Save/Update',
                    options.folderName,
                    options.nodeHandle
                );
            }

            let {
                nodeHandle,
                title,
                description,
                folderName,
                state,
                publicHandle,
                pagePublicHandle,
                ets,
                mfs,
                f
            } = this.setPuHandleValues(options, update);

            // This is to look for
            if (!nodeHandle && publicHandle) {
                nodeHandle = this.getNodeHandleByPuHandle(publicHandle);
            }

            // Node handle should exist
            assert(typeof nodeHandle === 'string', 'saveOrUpdatePuHandle: No Handle - Check this',
                   publicHandle, [options, nodeHandle]);

            const puHandleCacheData = {
                p: pagePublicHandle || '', // Page public handle
                h: nodeHandle, // Node Handle
                ph: publicHandle, // Handle public handle
                fn: folderName, // Folder Name
                s: state, // state
                ets: ets || 0, // Expiry timestamp (unix seconds)
                mfs: mfs || 0, // Max file size in bytes
                d: {
                    t: title || '',         // Title
                    d: description || '',   // Description
                    f: f || 0               // Disallow folder uploads
                }
            };

            this.cache.puHandle[nodeHandle] = puHandleCacheData;

            if (fmdb && !pfkey) {
                const d = {...puHandleCacheData};

                fmdb.add('puf', {ph: publicHandle, d});
            }

            if (fminitialized) {
                mega.fileRequestCommon.addFileRequestIcon(nodeHandle);
            }

            return puHandleCacheData;
        }

        setPuHandleValues(options, update) {
            let {
                nodeHandle,
                title,
                description,
                folderName,
                state,
                publicHandle,
                pagePublicHandle,
                ets,
                mfs,
                f
            } = options;

            const currentCacheData = this.getPuHandleByNodeHandle(nodeHandle);
            if (currentCacheData) {
                folderName = isEmpty(folderName) ? currentCacheData.fn : folderName;
                title = isEmpty(title) && !update ? currentCacheData.d.t : title;
                description = isEmpty(description) && !update ? currentCacheData.d.d : description;
                publicHandle = isEmpty(publicHandle) ? currentCacheData.ph : publicHandle;
                pagePublicHandle = isEmpty(pagePublicHandle) ? currentCacheData.p : pagePublicHandle;
                state = isEmpty(state) ? currentCacheData.s : state;
                ets = isEmpty(ets) ? currentCacheData.ets : ets;
                mfs = isEmpty(mfs) ? currentCacheData.mfs : mfs;
                f = isEmpty(f) ? currentCacheData.d.f : f;
            }

            return {
                nodeHandle,
                title,
                description,
                folderName,
                state,
                publicHandle,
                pagePublicHandle,
                ets,
                mfs,
                f
            };
        }

        getPuHandleKeyByPublicHandle(puHandlePublicHandle) {
            let currentPuHandleObjectKey = null;
            const puHandleObjects = this.cache.puHandle;

            // Search puf.items with related PUP handle
            for (const key in puHandleObjects) {
                if (puHandleObjects[key]) {
                    const puHandleObject = puHandleObjects[key];
                    if (puHandleObject.ph === puHandlePublicHandle) {
                        currentPuHandleObjectKey = key;
                        break;
                    }
                }
            }

            return currentPuHandleObjectKey;
        }

        getPuHandleByPublicHandle(puHandlePublicHandle) {
            const currentPuHandleKey = this.getPuHandleKeyByPublicHandle(puHandlePublicHandle);

            if (!currentPuHandleKey) {
                return null;
            }

            return this.cache.puHandle[currentPuHandleKey];
        }

        getPuHandleByNodeHandle(nodeHandle) {
            if (!this.cache.puHandle) {
                return null;
            }

            return this.cache.puHandle[nodeHandle];
        }

        getPuPageByPageId(pageId) {
            if (!this.cache.puPage) {
                return null;
            }

            return this.cache.puPage[pageId];
        }

        getPuHandleList() {

            return this.cache.puHandle || false;
        }

        updatePuHandlePageId(
            puHandlePublicHandle,
            puPagePublicHandle,
            puHandleState,
            settings
        ) {
            if (DEBUG) {
                logger.info('Storage.updatePuHandlePageId', {
                    puHandlePublicHandle,
                    puPagePublicHandle,
                    puHandleState
                });
            }

            const currentPuHandleKey = this.getPuHandleKeyByPublicHandle(puHandlePublicHandle);
            if (!currentPuHandleKey) {
                logger.info('Storage.updatePuHandlePageId - Update puf db', {
                    puHandlePublicHandle,
                    puPagePublicHandle
                });
                return null;
            }

            const currentPuHandleObject = this.saveOrUpdatePuHandle(
                {
                    nodeHandle: currentPuHandleKey,
                    state: puHandleState,
                    publicHandle: puHandlePublicHandle,
                    pagePublicHandle: puPagePublicHandle,
                    ...settings
                }
            );

            if (DEBUG) {
                logger.info('Storage.updatePuHandlePageId - Update puf db', {
                    puHandlePublicHandle,
                    currentPuHandleObject
                });
            }

            return currentPuHandleObject;
        }

        addPuPage(puPageObject) {
            if (DEBUG) {
                logger.info('Storage.addPuPage - Add PUP', {
                    puPageObject
                });
            }

            const puHandleState = puPageObject.s;
            const puHandlePublicHandle = puPageObject.ph;
            const puPagePublicHandle = puPageObject.p;

            const settings = {
                ets: puPageObject.ets,
                mfs: puPageObject.mfs,
                f: Object(puPageObject.d).f
            };

            // Update puf.items with related PUP handle
            const puHandleObject =
                this.updatePuHandlePageId(puHandlePublicHandle, puPagePublicHandle, puHandleState, settings);
            if (!puHandleObject) {
                if (d) {
                    logger.error('Storage.addPuPage - no PUP object', {puPageObject});
                }
                return;
            }

            const folderName = puHandleObject.fn;
            const nodeHandle = puHandleObject.h;

            let title = '';
            let description = '';
            let message = '';

            if (puHandleObject.d) {
                title = puHandleObject.d.t;
                message = puHandleObject.d.t;
                description = puHandleObject.d.d;
            }
            else {
                title = puHandleObject.fn;
                message = puHandleObject.fn;
            }

            if (puPageObject.d) { // We override title and description and use what is stored in the API
                if ((!title.length || !message.length) && puPageObject.d.msg) {
                    title = puPageObject.d.msg;
                    message = puPageObject.d.msg;
                }
                if (!description.length && puPageObject.d.description) {
                    description = puPageObject.d.description;
                }
            }

            this.saveOrUpdatePuPage(
                {
                    nodeHandle,
                    title,
                    description,
                    message,
                    folderName,
                    state: puHandleState,
                    publicHandle: puHandlePublicHandle,
                    pagePublicHandle: puPagePublicHandle,
                    ...settings
                }
            );

            if (DEBUG) {
                logger.info('Storage.addPuPage - Save PUP Object', {
                    puPageObject,
                    puHandleObject
                });
            }
        }

        saveOrUpdatePuPage(options, update) {
            if (!options.pagePublicHandle) {
                logger.info(
                    'Storage.saveOrUpdatePuPage - PUF Save/Update',
                    options.folderName,
                    options.nodeHandle
                );
            }

            const {
                nodeHandle,
                title,
                description,
                message,
                folderName,
                state,
                publicHandle,
                pagePublicHandle,
                name,
                ets,
                mfs,
                f
            } = this.setPuPageValues(options, update);

            const puHandleCacheData = {
                p : pagePublicHandle || '', // Page public handle
                h:  nodeHandle, // Node Handle
                ph: publicHandle, // Handle public handle
                fn: folderName, // Folder Name
                s:  state, // state
                msg: message,
                name: name || u_attr.name,
                ets: ets || 0, // Expiry timestamp (unix seconds)
                mfs: mfs || 0, // Max file size in bytes
                d: {
                    t: title || '',         // Title
                    d: description || '',   // Description
                    f: f || 0               // Disallow folder uploads
                }
            };

            this.cache.puPage[pagePublicHandle] = puHandleCacheData;

            if (fmdb && !pfkey) {
                const d = {...puHandleCacheData};

                fmdb.add('pup', {p: pagePublicHandle, d});
            }

            return puHandleCacheData;
        }

        setPuPageValues(options, update) {
            let {
                nodeHandle,
                title,
                description,
                message,
                folderName,
                state,
                publicHandle,
                pagePublicHandle,
                name,
                ets,
                mfs,
                f
            } = options;

            const currentCacheData = this.getPuPageByPageId(pagePublicHandle);
            if (currentCacheData) {
                nodeHandle = isEmpty(nodeHandle) ? currentCacheData.h : nodeHandle;
                folderName = isEmpty(folderName) ? currentCacheData.fn : folderName;
                title = isEmpty(title) && update ? currentCacheData.d.t : title;
                description = isEmpty(description) && update ? currentCacheData.d.d : description;
                publicHandle = isEmpty(publicHandle) ? currentCacheData.ph : publicHandle;
                pagePublicHandle = isEmpty(pagePublicHandle) ? currentCacheData.p : pagePublicHandle;
                state = isEmpty(state) ? currentCacheData.s : state;
                message = isEmpty(message) ? currentCacheData.msg : message;
                name = isEmpty(name) ? currentCacheData.name : name;
                ets = isEmpty(ets) ? currentCacheData.ets : ets;
                mfs = isEmpty(mfs) ? currentCacheData.mfs : mfs;
                f = isEmpty(f) ? currentCacheData.d.f : f;
            }

            return {
                nodeHandle,
                title,
                description,
                message,
                folderName,
                state,
                publicHandle,
                pagePublicHandle,
                name,
                ets,
                mfs,
                f
            };
        }

        updatePuPage(puPagePublicHandle, title, description, settings) {
            if (DEBUG) {
                logger.info('Storage.updatePuPage - Update PUP', {
                    puPagePublicHandle,
                    title,
                    description
                });
            }

            // Update puf.items with related PUP handle
            const puPageObject = this.getPuPageByPageId(puPagePublicHandle);
            if (!puPageObject) {
                if (d) {
                    logger.error('Storage.updatePuPage - no PUP object', {puPagePublicHandle});
                }
                return;
            }

            let message = puPageObject.msg || '';

            if (isEmpty(title)) {
                title = puPageObject.d.t || '';
            }
            else {
                message = title;
            }

            if (isEmpty(description)) {
                description = puPageObject.d.d || '';
            }

            this.saveOrUpdatePuPage(
                {
                    title,
                    description,
                    message,
                    pagePublicHandle: puPagePublicHandle,
                    ...settings
                },
                true
            );

            if (DEBUG) {
                logger.info('Storage.addPuPage - Save PUP Object', {
                    puPageObject,
                    puPagePublicHandle
                });
            }
        }

        updatePuHandle(puHandleNodeHandle, title, description, settings) {
            if (DEBUG) {
                logger.info('Storage.updatePuHandle - update PUH', {
                    puHandleNodeHandle,
                    title,
                    description
                });
            }

            this.saveOrUpdatePuHandle(
                {
                    nodeHandle: puHandleNodeHandle,
                    title,
                    description,
                    ...settings
                },
                true
            );
        }

        removePuPage(puPagePublicHandle, puHandlePublicHandle) {
            if (DEBUG) {
                logger.info('Storage.removePuPage - Remove PUP', {
                    puPagePublicHandle,
                    puHandlePublicHandle
                });
            }

            if (fmdb && !pfkey) {
                fmdb.del('pup', puPagePublicHandle);
            }

            let nodeHandle = null;
            if (this.cache.puPage[puPagePublicHandle]) {
                nodeHandle = this.cache.puPage[puPagePublicHandle].h;
                delete this.cache.puPage[puPagePublicHandle];
            }

            const puHandleObject = this.getPuHandleByPublicHandle(puHandlePublicHandle);
            if (puHandleObject) {
                this.removePuHandle(puHandleObject.h, puHandleObject.ph);
            }

            return nodeHandle;
        }

        removePuPageByNodeHandle(puHandleNodeHandle) {
            if (DEBUG) {
                logger.info('Storage.removePuPageByNodeHandle', {
                    puHandleNodeHandle
                });
            }

            const puHandleObject = this.cache.puHandle[puHandleNodeHandle];
            let puHandlePublicHandle = null;
            if (puHandleObject) {
                puHandlePublicHandle = puHandleObject.ph;
            }

            const puPageObjects = this.cache.puPage;

            // Search puf.items with related PUP handle
            for (const key in puPageObjects) {
                if (puPageObjects[key]) {
                    const puPageObject = puPageObjects[key];
                    const puPagePublicHandle = key;

                    if (puHandlePublicHandle === puPageObject.ph) {
                        if (fmdb && !pfkey) {
                            fmdb.del('pup', puPagePublicHandle);
                        }
                        if (this.cache.puPage[puPagePublicHandle]) {
                            delete this.cache.puPage[puPagePublicHandle];
                        }
                        break;
                    }
                }
            }

            if (fmdb && !pfkey) {
                fmdb.del('puf', puHandlePublicHandle);
            }
            if (this.cache.puHandle[puHandleNodeHandle]) {
                delete this.cache.puHandle[puHandleNodeHandle];
            }
        }

        updatePuHandleFolderName(nodeHandle, folderName) {
            return this.saveOrUpdatePuHandle(
                {
                    nodeHandle,
                    folderName
                }
            );
        }

        updatePuPageFolderName(pagePublicHandle, folderName) {
            return this.saveOrUpdatePuPage(
                {
                    folderName,
                    pagePublicHandle
                }
            );
        }

        isDropExist(selected) {
            let sel = Array.isArray(selected) ? [...selected] : [selected];
            const result = [];

            while (sel.length) {
                const id = sel.shift();
                if (this.getPuHandleByNodeHandle(id)) {
                    result.push(id);
                }

                if (M.tree[id]) {
                    sel = sel.concat(Object.keys(M.tree[id]));
                }
            }

            return result;
        }

        async processPuHandleFromDB(entries) {

            for (let i = entries.length; i--;) {
                const puHandleObject = entries[i];
                const nodeHandle = puHandleObject.h;

                this.cache.puHandle[nodeHandle] = puHandleObject;

                entries[i] = nodeHandle;
            }

            if ((entries = entries.filter(Boolean)).length) {

                return dbfetch.acquired(entries);
            }
        }

        processPuPageFromDB(entries) {

            for (let i = entries.length; i--;) {
                const puPageObject = entries[i];
                const puPageHandle = puPageObject.p;

                this.cache.puPage[puPageHandle] = puPageObject;
            }
        }

        getNodeHandleByPuHandle(puHandlePublicHandle) {
            if (!this.cache.puHandle) {
                return null;
            }

            const puHandleObjects = this.cache.puHandle;

            for (const key in puHandleObjects) {
                if (puHandleObjects[key]) {
                    const puHandleObject = puHandleObjects[key];

                    if (puHandleObject.ph === puHandlePublicHandle) {
                        return key;
                    }
                }
            }

            return null;
        }
    }

    class FileRequestGenerator {
        constructor() {
            this.codeTemplate = `<iframe width="%w" height="%h" frameborder="0" src="%s"></iframe>`;
            this.urlTemplate = ``;
        }

        generateCode(puPagePublicHandle, theme) {
            const width = 0;
            const height = 0;
            const link = `${getBaseUrl()}/filerequest#!${puPagePublicHandle}!${theme || 'l'}!${lang}`;

            return this.codeTemplate
                .replace('%w', width > 0 ? width : 250)
                .replace('%h', height > 0 ? height : 54)
                .replace('%s', link)
                .replace(`/[\\t\\n\\s]+/g`, ''); // Minimize
        }

        generateUrl(puPagePublicHandle) {
            return `${getBaseUrl()}/filerequest/${puPagePublicHandle}`;
        }

        generateUrlPreview(name, title, description, theme, pupHandle, expiry, size) {
            const extensionSymbol = is_extension ? '#' : '/';
            const encodedName = name ? `!n-${base64urlencode(to8(name))}` : '';
            const encodedTitle = title ? `!t-${base64urlencode(to8(title))}` : '';
            const encodedDescription = description ? `!d-${base64urlencode(to8(description))}` : '';
            const encodedTheme = theme ? `!m-${base64urlencode(to8(theme))}` : '';
            const encodedExpiry = expiry ? `!e-${base64urlencode(to8(String(expiry)))}` : '';
            const encodedSize = size ? `!s-${base64urlencode(to8(String(size)))}` : '';

            return `${getAppBaseUrl()}${extensionSymbol}` +
                `filerequest/${pupHandle || ''}${encodedName}${encodedTitle}${encodedDescription}` +
                `${encodedTheme}${encodedExpiry}${encodedSize}`;
        }

        windowOpen(url) {
            // eslint-disable-next-line local-rules/open
            window.open(
                url,
                '_blank',
                'noopener,noreferrer,' +
                'width=770, height=770, resizable=no,' +
                'status=no, location=no, titlebar=no, toolbar=no'
            );
        }

        async encryptLink(pwd, data) {
            const algorithm = exportPassword.currentAlgorithm;
            const saltLengthBytes = exportPassword.algorithms[algorithm].saltLength / 8;
            const handleBytes = exportPassword.base64UrlDecode(data.handle);
            const keyBytes = new Uint8Array(32);
            keyBytes.set(handleBytes);
            const len = `${handleBytes.length}`;
            const linkInfo = {
                type: exportPassword.LINK_TYPE_DROP,
                saltBytes: crypto.getRandomValues(new Uint8Array(saltLengthBytes)),
                handle: `fr${'0'.repeat(6 - len.length)}${len}`,
                keyBytes,
            };
            linkInfo.publicHandle = linkInfo.handle;
            return new Promise((resolve) => {
                exportPassword.deriveKey(algorithm, linkInfo.saltBytes, pwd, (derivedKeyBytes) => {
                    resolve(exportPassword.encrypt.encryptAndMakeLink(linkInfo, derivedKeyBytes));
                });
            });
        }
    }

    class FileRequestActionHandler {
        processPublicUploadHandle(actionPacket) {
            if (DEBUG) {
                logger.info('Handler.processPublicUploadHandle - Handle puh', actionPacket);
            }

            const {h, ph, d} = actionPacket;

            if (d) {
                mega.fileRequest.storage.removePuHandle(h, ph);

                if (fminitialized) {
                    // @todo ideally we should not openFolder(true)
                    delay('fr:processPublicUploadHandle', refreshFileRequestPageList);
                }
            }
            else {
                mega.fileRequestCommon.storage.addPuHandle(h, ph);
            }
        }

        processUploadedPuHandles(fetchNodesResponse) {
            if (d) {
                logger.debug('[uph] processUploadedPuHandles', fetchNodesResponse);
            }

            for (let i = 0; i < fetchNodesResponse.length; ++i) {
                const {h, ph} = fetchNodesResponse[i];
                mega.fileRequestCommon.storage.addPuHandle(h, ph);
            }
        }

        processPublicUploadPage(actionPacket) {
            const state = actionPacket.s | 0;
            const doAdd = state === 2;

            if (d) {
                logger.info('Handler.processPublicUploadPage - %s pup', doAdd ? 'Add' : 'Remove', actionPacket);
            }

            assert(actionPacket && typeof actionPacket.p === 'string',
                   'processPublicUploadPage: No PUP Handle - Check this', actionPacket.ph, [actionPacket]);

            if (doAdd) {

                mega.fileRequest.storage.addPuPage(actionPacket);
            }
            else {

                mega.fileRequest.removePuPage(actionPacket);
            }
        }
    }

    const MB = 1024 * 1024;
    const GB = MB * 1024;
    const DEFAULT_SIZE = 100 * MB;
    const UNIT = freeze({ MB: 'mb', GB: 'gb' });
    const UNIT_BYTES = freeze({ [UNIT.MB]: MB, [UNIT.GB]: GB });
    const UNIT_LABELS = freeze({ [UNIT.MB]: l[20159], [UNIT.GB]: l[17696] });

    const linkSettings = freeze({
        unit: UNIT,
        unitLabels: UNIT_LABELS,
        read(puHandleObject) {
            const stored = puHandleObject || {};
            return {
                expiry: stored.ets > Date.now() / 1000 ? stored.ets : false,
                password: false,
                size: stored.mfs > 0 ? stored.mfs : false,
                folder: !Object(stored.d).f
            };
        },
        unitFor(bytes) {
            return bytes >= GB ? UNIT.GB : UNIT.MB;
        },
        toBytes(value, unit) {
            value = parseFloat(value) || 0;
            return value > 0 ? Math.round(value * UNIT_BYTES[unit]) : 0;
        },
        fromBytes(bytes, unit) {
            return (bytes || DEFAULT_SIZE) / UNIT_BYTES[unit];
        },
        setSizeState(input, state) {
            const { bytes, origSize, enabled } = state;
            input.error = '';
            input.warning = '';
            if (!enabled || origSize && bytes === origSize || !origSize && bytes === DEFAULT_SIZE) {
                return;
            }

            if (!bytes) {
                input.error = l.fr_size_missing;
            }
            else if (bytes < 5 * MB) {
                input.warning = l.fr_size_small;
            }
            else {
                input.success = l.fr_size_set.replace('%1', bytesToSize(bytes));
            }
        },
        isInvalid(settings, state) {
            return !!(
                state.expiry && !settings.expiry
                || state.password && !state.passwordValid
                || state.size && !settings.size
            );
        },

        async save(puHandleObject, data) {
            const { title, description, settings, password } = data;
            const link = password
                ? await mega.fileRequest.generator
                    .encryptLink(password, { handle: puHandleObject.p })
                    .catch(tell) || null
                : null;

            await mega.fileRequest.update(puHandleObject.h, title, description, {
                expiry: settings.expiry,
                limit: settings.size,
                folder: settings.folder,
            }, true);

            return link;
        }
    });

    return new class FileRequestCommon {
        constructor() {
            this.init();
        }

        init() {
            /** @class mega.fileRequestCommon.storage */
            lazy(this, 'storage', () => new FileRequestStorage);
            /** @property {FileRequestApi} mega.fileRequestCommon.fileRequestApi */
            lazy(this, 'fileRequestApi', () => new FileRequestApi());
            /** @class mega.fileRequestCommon.generator */
            lazy(this, 'generator', () => new FileRequestGenerator);
            /** @class mega.fileRequestCommon.actionHandler */
            lazy(this, 'actionHandler', () => new FileRequestActionHandler());
            /** @function mega.fileRequestCommon.addFileRequestIcon */
            lazy(this, 'addFileRequestIcon', () => addFileRequestIcon);
            /** @property {Object} mega.fileRequestCommon.linkSettings */
            this.linkSettings = linkSettings;
        }

        /**
         * Parse node fru tags for user renderable values
         *
         * @param {String} [fru] The node's file request tag, if any.
         * @returns {String} The label to show for it.
         */
        getUploaderLabel(fru) {
            if (typeof fru !== 'string' || !fru) {
                return l.anonymous_user;
            }
            const pos = fru.indexOf('/');
            if (pos < 0) {
                return fru;
            }
            const tag = fru.substring(0, pos);
            const name = fru.substring(pos + 1) || l.anonymous_user;
            return tag ? `${name}_${tag}` : name;
        }
    };
});
