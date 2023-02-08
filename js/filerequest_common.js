/* eslint-disable max-classes-per-file */
lazy(mega, 'fileRequestCommon', () => {
    'use strict';

    const logger = new MegaLogger('common', null, MegaLogger.getLogger('FileRequest'));
    const folderClass = 'file-request-folder';

    const refreshFileRequestPageList = () => {
        if (fminitialized && M.currentdirid === 'file-requests') {
            M.openFolder(M.currentdirid, true);
            selectionManager.clear_selection();
        }
    };

    const updateMobileNodeIcon = (nodeHandle) => {
        const $node = $(`#${nodeHandle}`, '.mobile.file-manager-block');
        const iconName = fileIcon(M.d[nodeHandle]);

        $('.regular-folder', $node).attr('src',`${mobile.imagePath + iconName}.png`);
    };

    const addFileRequestIcon = (puHandlePublicHandle) => {
        if (fminitialized && puHandlePublicHandle) {
            const puHandleObject = mega.fileRequestCommon
                .storage
                .getPuHandleByPublicHandle(puHandlePublicHandle);

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

            const viewModeClass = M.viewmode ? 'span.block-view-file-type' : 'span.transfer-filetype-icon';
            $(viewModeClass, $nodeId)
                .addClass(folderClass);

            if ($tree.length) {
                $tree.addClass(folderClass);
            }

            if (d) {
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

                const viewModeClass = M.viewmode ? 'span.block-view-file-type' : 'span.transfer-filetype-icon';
                $(viewModeClass, node)
                    .removeClass(folderClass);
            }

            $(`#treea_${nodeId} span.nw-fm-tree-folder`)
                .removeClass(folderClass);
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

            const payload = {
                n: handle, // File handle
                a: 'ul', // Action
                d: 0,    // Create public upload folder
                i: requesti, // ID Tag
                s: 2, // State?
                data: data
            };

            return M.req(payload);
        }

        update(puPagePublicHandle, title, description, name, email) {
            // TODO: Separate later
            const data = {
                name: name || u_attr.name,
                email: email || u_attr.email,
                msg: title,
                description: description
            };

            const payload = {
                a: 'ps',
                p: puPagePublicHandle,// PUP id
                d: data,// data
                i: requesti
            };

            return M.req(payload);
        }

        getPuPageList() {
            const payload = {
                a: 'pl',
                i: requesti
            };

            return M.req(payload);
        }

        getPuPage(pageId) {
            const payload = {
                a: 'pg',
                p: pageId
            };

            return M.req(payload);
        }

        remove(handle) {
            const payload = {       // Remove PUF
                a: 'ul',
                n: handle,      // Folder handle (node)
                d: 1,       // Delete public upload folder
                i: requesti
            };

            return M.req(payload);
        }

        getOwnerPublicKey(ownerHandle) {
            const payload = {
                a: 'uk',
                u: ownerHandle,
                i: requesti
            };

            return M.req(payload);
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
            if (d) {
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
        }

        async addPuHandle(
            puHandleNodeHandle,
            puHandlePublicHandle,
            data,
            pagePublicHandle,
            requestId
        ) {
            if (d) {
                logger.info('Storage.addPuHandle', {
                    puHandleNodeHandle,
                    puHandlePublicHandle
                });
            }

            await dbfetch.get(puHandleNodeHandle).catch(dump); // Load the file

            if (!M.d[puHandleNodeHandle] || !M.d[puHandleNodeHandle].name) {
                if (d) {
                    logger.info(
                        'Storage.addPuHandle - No folder exists',
                        puHandleNodeHandle,
                        puHandlePublicHandle,
                        data
                    );
                }
                return false;
            }

            if (!puHandlePublicHandle || !fmdb) {
                if (d) {
                    logger.info('Storage.addPuHandle - No handle/fmdb', puHandleNodeHandle);
                }
                return false;
            }

            if (pfkey) {
                return false;
            }

            const folderName = M.d[puHandleNodeHandle].name;
            const puHandleState = 2;
            let title = '';
            let description = '';

            if (data) {
                title = data.msg;
                description = data.description;

                if (d) {
                    logger.info('Storage.addPuHandle - with data', puHandleNodeHandle, puHandlePublicHandle);
                }
            }

            if (d) {
                logger.info(
                    'Storage.addPuHandle - puf add',
                    puHandlePublicHandle,
                    puHandleNodeHandle
                );
            }

            this.saveOrUpdatePuHandle(
                {
                    nodeHandle: puHandleNodeHandle,
                    title,
                    description,
                    folderName,
                    state: puHandleState,
                    publicHandle: puHandlePublicHandle,
                    pagePublicHandle
                }
            );

            const eventMessage = `FileRequest:puhProcessed_${puHandlePublicHandle}`;
            if (mBroadcaster.hasListener(eventMessage)) {
                mBroadcaster
                    .sendMessage(eventMessage);
            }
            else if (requestId === requesti) {
                this.addPuMessage(puHandlePublicHandle);
            }

            if (d) {
                logger.info(
                    `Storage.addPuHandle - Dispatch ${eventMessage}`,
                    puHandlePublicHandle
                );
            }
        }

        saveOrUpdatePuHandle(options, update) {
            if (!options.publicHandle) {
                logger.info(
                    'Storage.saveOrUpdatePuHandle - PUF Save/Update',
                    options.folderName,
                    options.nodeHandle
                );
            }

            const {
                nodeHandle,
                title,
                description,
                folderName,
                state,
                publicHandle,
                pagePublicHandle
            } = this.setPuHandleValues(options, update);

            const puHandleCacheData = {
                p: pagePublicHandle || '', // Page public handle
                h:  nodeHandle, // Node Handle
                ph: publicHandle, // Handle public handle
                fn: folderName, // Folder Name
                s:  state, // state
                d: {
                    t: title || '', // Title
                    d: description || '' // Description
                }
            };

            this.cache.puHandle[nodeHandle] = puHandleCacheData;

            const puHandleDBData = {
                p : pagePublicHandle || '', // Page public handle
                h: nodeHandle, // Node Handle
                fn: folderName, // Folder Name
                ph: publicHandle, // Handle public handle
                s: state, // state
                d: {
                    t: title || '', // Title
                    d: description || '' // Description
                }
            };

            if (fmdb && !pfkey) {
                fmdb.add('puf', {
                    ph: publicHandle,
                    d: puHandleDBData
                });
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
                pagePublicHandle
            } = options;

            const currentCacheData = this.getPuHandleByNodeHandle(nodeHandle);
            if (currentCacheData) {
                folderName = isEmpty(folderName) ? currentCacheData.fn : folderName;
                title = isEmpty(title) && !update ? currentCacheData.d.t : title;
                description = isEmpty(description) && !update ? currentCacheData.d.d : description;
                publicHandle = isEmpty(publicHandle) ? currentCacheData.ph : publicHandle;
                pagePublicHandle = isEmpty(pagePublicHandle) ? currentCacheData.p : pagePublicHandle;
                state = isEmpty(state) ? currentCacheData.s : state;
            }

            return {
                nodeHandle,
                title,
                description,
                folderName,
                state,
                publicHandle,
                pagePublicHandle
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
            if (!this.cache.puHandle) {
                return null;
            }

            return this.cache.puHandle;
        }

        updatePuHandlePageId(
            puHandlePublicHandle,
            puPagePublicHandle,
            puHandleState
        ) {
            if (d) {
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
                    pagePublicHandle: puPagePublicHandle
                }
            );

            if (d) {
                logger.info('Storage.updatePuHandlePageId - Update puf db', {
                    puHandlePublicHandle,
                    currentPuHandleObject
                });
            }

            return currentPuHandleObject;
        }

        addPuPage(puPageObject) {
            if (d) {
                logger.info('Storage.addPuPage - Add PUP', {
                    puPageObject
                });
            }

            const puHandleState = puPageObject.s;
            const puHandlePublicHandle = puPageObject.ph;
            const puPagePublicHandle = puPageObject.p;

            // Update puf.items with related PUP handle
            const puHandleObject = this.updatePuHandlePageId(puHandlePublicHandle, puPagePublicHandle, puHandleState);
            if (!puHandleObject) {
                if (d) {
                    logger.info('Storage.addPuPage - no PUP object', {
                        puPageObject
                    });
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
                    pagePublicHandle: puPagePublicHandle
                }
            );

            if (d) {
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
                name
            } = this.setPuPageValues(options, update);

            const puHandleCacheData = {
                p : pagePublicHandle || '', // Page public handle
                h:  nodeHandle, // Node Handle
                ph: publicHandle, // Handle public handle
                fn: folderName, // Folder Name
                s:  state, // state
                msg: message,
                name: name || u_attr.name,
                d: {
                    t: title || '', // Title
                    d: description || '' // Description
                }
            };

            this.cache.puPage[pagePublicHandle] = puHandleCacheData;

            const puHandleDBData = {
                p : pagePublicHandle || '', // Page public handle
                h: nodeHandle, // Node Handle
                fn: folderName, // Folder Name
                ph: publicHandle, // Handle public handle
                msg: message, // Default message/title
                s: state, // state
                name: name || u_attr.name,
                email: u_attr.email,
                d: {
                    t: title || '', // Title
                    d: description || '' // Description
                }
            };

            if (fmdb && !pfkey) {
                fmdb.add('pup', {
                    p: pagePublicHandle,
                    d: puHandleDBData
                });
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
                name
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
                name
            };
        }

        updatePuPage(puPagePublicHandle, title, description) {
            if (d) {
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
                    logger.info('Storage.updatePuPage - no PUP object', {
                        puPageObject
                    });
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
                    pagePublicHandle: puPagePublicHandle
                },
                true
            );

            if (d) {
                logger.info('Storage.addPuPage - Save PUP Object', {
                    puPageObject,
                    puPagePublicHandle
                });
            }
        }

        updatePuHandle(puHandleNodeHandle, title, description) {
            if (d) {
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
                    description
                },
                true
            );
        }

        removePuPage(puPagePublicHandle, puHandlePublicHandle) {
            if (d) {
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
            if (!puHandleObject) {
                return nodeHandle;
            }

            this.removePuHandle(puHandleObject.h, puHandleObject.ph);
            return nodeHandle;
        }

        removePuPageByNodeHandle(puHandleNodeHandle) {
            if (d) {
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

        isPresent(selectedNodeHandle) {
            if (!this.cache.puHandle) {
                return false;
            }

            const puHandleObject = this.cache.puHandle[selectedNodeHandle];
            return puHandleObject && puHandleObject.s !== 1 && puHandleObject.p !== null;
        }

        isDropExist(selected) {
            let sel = Array.isArray(selected) ? selected.slice(0) : [selected];
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

        processPuHandleFromDB(dbData) {
            for (const key in dbData) {
                if (dbData.hasOwnProperty(key)) {
                    const puHandleObject = dbData[key];
                    const nodeHandle = puHandleObject.h;

                    if (!this.cache.puHandle[nodeHandle]) {
                        this.cache.puHandle[nodeHandle] = Object.create(null);
                    }

                    this.cache.puHandle[nodeHandle] = puHandleObject;
                }
            }
        }

        processPuPageFromDB(dbData) {
            for (const key in dbData) {
                if (dbData.hasOwnProperty(key)) {
                    const puPageObject = dbData[key];
                    const puPageHandle = puPageObject.p;

                    if (!this.cache.puPage[puPageHandle]) {
                        this.cache.puPage[puPageHandle] = Object.create(null);
                    }

                    this.cache.puPage[puPageHandle] = puPageObject;
                }
            }
        }
    }

    class FileRequestGenerator {
        constructor() {
            this.codeTemplate = `<iframe width="%w" height="%h" frameborder="0" src="%s"></iframe>`;
            this.urlTemplate = ``;
        }

        generateCode(puPagePublicHandle, isLightTheme) {
            const width = 0;
            const height = 0;
            const theme = isLightTheme ? 'l' : 'd';
            const link = `${getBaseUrl()}/filerequest#!${puPagePublicHandle}!${theme}!${lang}`;

            return this.codeTemplate
                .replace('%w', width > 0 ? width : 250)
                .replace('%h', height > 0 ? height : 54)
                .replace('%s', link)
                .replace(`/[\\t\\n\\s]+/g`, ''); // Minimize
        }

        generateUrl(puPagePublicHandle) {
            return `${getBaseUrl()}/filerequest/${puPagePublicHandle}`;
        }

        generateUrlPreview(name, title, description, theme) {
            const extensionSymbol = is_extension ? '#' : '/';
            const encodedName = name ? `!n-${base64urlencode(to8(name))}` : '';
            const encodedTitle = title ? `!t-${base64urlencode(to8(title))}` : '';
            const encodedDescription = description ? `!d-${base64urlencode(to8(description))}` : '';
            const encodedTheme = theme ? `!m-${base64urlencode(to8(theme))}` : '';

            return `${getAppBaseUrl()}${extensionSymbol}` +
                `filerequest/${encodedName}${encodedTitle}${encodedDescription}${encodedTheme}`;
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
    }

    class FileRequestActionHandler {
        async processPublicUploadHandle(actionPacket) {
            if (d) {
                logger.info('Handler.processPublicUploadHandle - Handle puh', actionPacket);
            }

            for (let i = actionPacket.length; i--;) {
                const publicUploadHandle = Object.assign({}, actionPacket[i]);
                if (publicUploadHandle.d) { // if PUH is deleted
                    mega.fileRequest.storage.removePuHandle(
                        publicUploadHandle.h,
                        publicUploadHandle.ph
                    );

                    refreshFileRequestPageList();
                    removeFileRequestIcon(publicUploadHandle.h);
                }
                else {
                    await mega.fileRequestCommon.storage.addPuHandle(
                        publicUploadHandle.h,
                        publicUploadHandle.ph,
                        null,
                        null,
                        publicUploadHandle.i
                    ).catch(dump);
                }
            }
        }

        async processUploadedPuHandles(actionPacket) {
            if (d) {
                logger.info('Handler.processUploadedPuHandles - Handle uph');
            }

            for (let i = actionPacket.length; i--;) {
                const publicUploadHandle = Object.assign({}, actionPacket[i]);

                await mega.fileRequestCommon.storage.addPuHandle(
                    publicUploadHandle.h,
                    publicUploadHandle.ph
                ).catch(dump);
            }
        }

        processPublicUploadPage(actionPacket) {
            if (d) {
                logger.info('Handler.processPublicUploadPage - Handle pup', actionPacket);
            }

            const fileRequestObject = mega.fileRequest;
            const isDebug = d;
            const errorNonExistent = ENOENT;

            const processDifferentRequest = (publicUploadPage, puHandlePublicHandle) => {
                const puPageId = publicUploadPage.p;
                const puHandleId = puHandlePublicHandle;

                fileRequestObject.api.getPuPage(puPageId)
                    .then((puPage) => {
                        fileRequestObject.storage.addPuPage(puPage);

                        const currentPuPage = fileRequestObject.storage.getPuPageByPageId(puPage.p);
                        if (currentPuPage && puPage.d) {
                            fileRequestObject.storage
                                .updatePuHandle(
                                    currentPuPage.h,
                                    puPage.d.msg,
                                    puPage.d.description
                                );
                        }
                    })
                    .catch(
                        (ex) => {
                            if (ex === errorNonExistent) {
                                fileRequestObject.storage.removePuPage(puPageId, puHandleId);

                                if (isDebug) {
                                    logger.warn(
                                        'processPublicUploadPage - Api.getPuPage - Page does not exist',
                                        puHandleId,
                                        puPageId,
                                        ex
                                    );
                                }
                                return;
                            }

                            if (isDebug) {
                                logger.warn(
                                    'processPublicUploadPage - Api.getPuPage - Something went wrong',
                                    puHandleId,
                                    puPageId,
                                    ex
                                );
                            }
                        }
                    );
            };

            for (let i = actionPacket.length; i--;) {
                const publicUploadPage = Object.assign({}, actionPacket[i]);
                const puHandlePublicHandle = publicUploadPage.ph;
                const puHandleState = publicUploadPage.s || 0;
                const requestId = publicUploadPage.i;
                const currentRequestId = requesti;
                const isMobile = is_mobile;

                if (puHandleState !== 2) { // Inactive PUP
                    if (d) {
                        logger.info('Handler.processPublicUploadPage - Inactive PUP', publicUploadPage);
                    }
                    fileRequestObject.removePuPage(publicUploadPage);
                    continue;
                }

                if (!publicUploadPage.u) { // If not update operation
                    const eventMessage = `FileRequest:puhProcessed_${puHandlePublicHandle}`;
                    if (d) {
                        logger.info(
                            `#file-handler - Handler.processPublicUploadPage - Subscribe ${eventMessage}`,
                            publicUploadPage
                        );
                    }

                    const processedEventCallback = () => {
                        fileRequestObject.storage.addPuPage(publicUploadPage);

                        if (currentRequestId === requestId) {
                            if (isMobile) {
                                fileRequestObject.dialogs.successMobileDialog.init(publicUploadPage);
                            }
                            else {
                                fileRequestObject.dialogs.createSuccessDialog.init(publicUploadPage);
                            }
                        }
                        else {
                            processDifferentRequest(publicUploadPage, puHandlePublicHandle);
                        }

                        if (!isMobile) {
                            refreshFileRequestPageList();
                        }

                        addFileRequestIcon(puHandlePublicHandle);
                        fileRequestObject.storage.removePuMessage(puHandlePublicHandle);
                    };

                    if (fileRequestObject.storage.hasPuMessage(puHandlePublicHandle)) {
                        processedEventCallback();
                        if (d) {
                            logger.info('Handler.processPublicUploadPage - Process Success Dialog', publicUploadPage);
                        }
                    }
                    else {
                        // We are the first one to subscribe
                        mBroadcaster.once(eventMessage, processedEventCallback);
                    }

                    continue;
                }

                if (d) {
                    logger.info('Handler.processPublicUploadPage - Update PUP', publicUploadPage);
                }

                fileRequestObject.storage.addPuPage(publicUploadPage);
                processDifferentRequest(publicUploadPage, puHandlePublicHandle);
            }

            loadingDialog.hide();
        }
    }
    return new class {
        constructor() {
            this.init();
        }

        init() {
            lazy(this, 'storage', () => new FileRequestStorage);
            lazy(this, 'api', () => new FileRequestApi);
            lazy(this, 'generator', () => new FileRequestGenerator);
            lazy(this, 'actionHandler', () => new FileRequestActionHandler());
            lazy(this, 'addFileRequestIcon', () => addFileRequestIcon);
        }
    };
});
