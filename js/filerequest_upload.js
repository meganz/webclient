/* eslint-disable max-classes-per-file */
lazy(mega, 'fileRequestUpload', () => {
    'use strict';

    const ERROR_TYPE_ACCOUNT = 1;
    const ERROR_TYPE_QUOTA = 2;
    const ERROR_TYPE_INVALID = 3;

    const ERROR_TASK_TYPE = 1;
    const ERROR_TASK_TYPE_GENERAL = 2;
    const ERROR_TASK_TYPE_RETRY = 3;

    const ERROR_TYPE_MESSAGES = {};
    const ERROR_TASK_MESSAGES = {};

    // Type messages
    ERROR_TYPE_MESSAGES[ERROR_TYPE_INVALID] = {
        title: l.file_request_upload_error_unvailable_title,
        description: l.file_request_upload_error_invalid_description
    };
    ERROR_TYPE_MESSAGES[ERROR_TYPE_ACCOUNT] = {
        title: l.file_request_upload_error_problem_title,
        description: l.file_request_upload_error_account_description
    };
    ERROR_TYPE_MESSAGES[ERROR_TYPE_QUOTA] = {
        title: l.file_request_upload_error_problem_title,
        description: l.file_request_upload_error_overquota_description
    };

    // Task messages
    // Retryable messages
    ERROR_TASK_MESSAGES[EAGAIN] = {
        taskType: ERROR_TASK_TYPE_RETRY
    };
    ERROR_TASK_MESSAGES[ERATELIMIT] = {
        taskType: ERROR_TASK_TYPE_RETRY
    };
    ERROR_TASK_MESSAGES[ETOOMANY] = {
        taskType: ERROR_TASK_TYPE_RETRY
    };
    ERROR_TASK_MESSAGES[ERANGE] = {
        taskType: ERROR_TASK_TYPE_RETRY
    };
    ERROR_TASK_MESSAGES[ESID] = {
        taskType: ERROR_TASK_TYPE_RETRY
    };
    ERROR_TASK_MESSAGES[ETEMPUNAVAIL] = {
        taskType: ERROR_TASK_TYPE_RETRY
    };
    ERROR_TASK_MESSAGES[ETOOMANYCONNECTIONS] = {
        taskType: ERROR_TASK_TYPE_RETRY
    };

    // Reupload messages
    ERROR_TASK_MESSAGES[EINTERNAL] = {
        taskType: ERROR_TASK_TYPE
    };
    ERROR_TASK_MESSAGES[EARGS] = {
        taskType: ERROR_TASK_TYPE
    };
    ERROR_TASK_MESSAGES[EEXPIRED] = {
        taskType: ERROR_TASK_TYPE
    };
    ERROR_TASK_MESSAGES[ECIRCULAR] = {
        taskType: ERROR_TASK_TYPE
    };
    ERROR_TASK_MESSAGES[EEXIST] = {
        taskType: ERROR_TASK_TYPE
    };
    ERROR_TASK_MESSAGES[EINCOMPLETE] = {
        taskType: ERROR_TASK_TYPE
    };
    ERROR_TASK_MESSAGES[EKEY] = {
        taskType: ERROR_TASK_TYPE
    };

    // Show stopper codes
    ERROR_TASK_MESSAGES[ENOENT] = {
        taskType: ERROR_TASK_TYPE_GENERAL,
        type: ERROR_TYPE_ACCOUNT
    };
    ERROR_TASK_MESSAGES[EACCESS] = {
        taskType: ERROR_TASK_TYPE_GENERAL,
        type: ERROR_TYPE_ACCOUNT
    };
    ERROR_TASK_MESSAGES[EBLOCKED] = {
        taskType: ERROR_TASK_TYPE_GENERAL,
        type: ERROR_TYPE_ACCOUNT
    };
    ERROR_TASK_MESSAGES[EBUSINESSPASTDUE] = {
        taskType: ERROR_TASK_TYPE_GENERAL,
        type: ERROR_TYPE_ACCOUNT
    };
    ERROR_TASK_MESSAGES[EFAILED] = {
        taskType: ERROR_TASK_TYPE_GENERAL,
        type: ERROR_TYPE_INVALID
    };

    // Quota related
    ERROR_TASK_MESSAGES[EOVERQUOTA] = {
        taskType: ERROR_TASK_TYPE_GENERAL,
        type: ERROR_TYPE_QUOTA,
        message: l[1010]
    };
    ERROR_TASK_MESSAGES[EGOINGOVERQUOTA] = {
        taskType: ERROR_TASK_TYPE_GENERAL,
        type: ERROR_TYPE_QUOTA,
        message: l[1010]
    };
    ERROR_TASK_MESSAGES[ESHAREROVERQUOTA] = {
        taskType: ERROR_TASK_TYPE_GENERAL,
        type: ERROR_TYPE_QUOTA,
        message: l[8435]
    };
    ERROR_TASK_MESSAGES[EPAYWALL] = {
        taskType: ERROR_TASK_TYPE_GENERAL,
        type: ERROR_TYPE_QUOTA
    };

    const logger = new MegaLogger('upload', null, MegaLogger.getLogger('FileRequest'));

    /**
     * Upload event handler
     *
     * @param {FileRequestUploadPage} uploadPage Upload page instance
     *
     * @returns {void}
     */
    class FileRequestUploadEventHandler {
        constructor() {
            this.uploadId = 8000;
            this.initialized = false;
        }

        checkEvent(event) {
            if (!event) {
                return;
            }

            if (event.stopPropagation) {
                event.stopPropagation();
            }
            if (event.preventDefault) {
                event.preventDefault();
            }
        }

        isInitialized() {
            return this.initialized;
        }

        handle(optionReference, event) {
            // Stop bubbling, e.g. prevent Save File dialog
            this.checkEvent(event);
            optionReference.touchedElement = 0;

            const targetId = mega.fileRequestUpload
                .getUploadPagePuHandle();

            const ownerHandle = mega.fileRequestUpload
                .getUploadPageOwnerHandle();

            const dataTransfer = Object(event.dataTransfer);
            const files = event.target.files || dataTransfer.files;

            if (!files || !files.length) {
                return false;
            }

            if (M.checkFolderDrop(event)) {
                // Hide drop to upload dialog and show warning notification
                optionReference.removeOverlay();
                msgDialog('warninga', l[135], l[19179], false, false, false);
                return false;
            }

            for (let i = 0; files[i]; i++) {
                const file = files[i];
                let path = null;

                if (file.webkitRelativePath) {
                    path = String(file.webkitRelativePath)
                        .replace(
                            RegExp(`[\\/]${String(file.name).replace(/(\W)/g, '\\$1')}$`),
                            ''
                        );
                }

                if (file.name !== '.') {
                    // FIXME: Improve
                    // eslint-disable-next-line local-rules/hints
                    try {
                        const newName = mega.fileRequestUpload.uploadPage.getName(file.name);
                        if (newName !== file.name) {
                            Object.defineProperty(file, 'name', {
                                value: newName,
                                writable: true,
                                configurable: true
                            });
                        }
                        file.target = targetId;
                        file.id = this.uploadId++;
                        file.ownerId = ownerHandle;
                        file.path = path;

                        ul_queue.push(file);

                        mega.fileRequestUpload.uploadPage.addItem(file.id, file.name, l[7227], file.size);

                        if (is_mobile) {
                            M.addToTransferTable(`ul_${file.id}`, file);
                        }
                    }
                    catch (ex) {
                        console.error(file.name, ex);
                        continue;
                    }
                }
            }

            // Set flag if its uploading
            ulmanager.isUploading = Boolean(ul_queue.length);

            // hide drop to upload dialog, no need to call InitFileDrag on every upload
            optionReference.removeOverlay();
        }
    }


    /**
     * File request upload page
     * @param {FileRequestUploadPageHandler} pageHandler Upload page handler
     *
     * @returns {void}
     */
    class FileRequestUploadPage {
        constructor() {
            this.$wrapper = null;
            this.$uploadButton = null;
            this.$languageButton = null;
            this.$dialogOverlay = null;
            this.$window = null;
            this.$uploadItems = null;
            this.$selectFileButton = null;

            this.$labelName = null;

            this.$wrapperDetail = null;
            this.$labelTitle = null;
            this.$labelDescription = null;
            this.$labelUploadId = null;

            this.$labelUploadInfo = null;
            this.$labelLanguage = null;

            this.$uploadItemTemplate = null;

            this.$wrapperEmptyBlock = null;
            this.$wrapperItems = null;
            this.$wrapperStatus = null;

            this.uploadEventHandler = null;

            this.queue = Object.create(null);
            this.queue.items = Object.create(null);
            this.queue.total = 0;

            this.duplicates = Object.create(null);

            this.stats = {
                totalSize: 0,
                currentSize: 0,
                totalPercentage: 0,
                speed: 0,
                total: 0,
                current: 0
            };

            this.initialized = false;
            this.error = false;
            this.errorHandlerInitialized = false;
            this.itemCompleted = Object.create(null);
            this.stopped = false;

            lazy(this, 'id', () => {
                return getCleanSitePath().includes('!uid=0') ? '' : makeid(6);
            });
        }

        init() {
            if (this.initialized) {
                return;
            }

            this.$wrapper = $('.file-request-upload-page', document.body);
            this.$uploadButton = new mega.fileRequestUI.ButtonComponent(
                $('.upload-btn, .upload-more', this.$wrapper), {
                    namespace: 'frup'
                }
            );
            this.$languageButton = new mega.fileRequestUI.ButtonComponent(
                $('.language-wrapper', this.$wrapper), {
                    namespace: 'frup'
                }
            );
            this.$dialogOverlay = new mega.fileRequestUI.ButtonComponent(
                $('.fm-dialog-overlay', document.body), {
                    namespace: 'frup'
                }
            );

            this.$window = $(window);
            this.$labelName = $('.content-title', this.$wrapper);

            this.$wrapperDetail = $('.content-details:not(.content-error)', this.$wrapper);
            this.$labelTitle = $('.detail-title', this.$wrapper);
            this.$labelDescription = $('.detail-description', this.$wrapper);
            this.$labelUploadId = $('.detail-upload-id .upload-id', this.$wrapper);
            this.$labelUploadIdWrapper = $('.detail-upload-id', this.$wrapper);

            this.$selectFileButton = $('#fileselect5', document.body);
            this.$uploadItems = $('.block-uploading-scroll', this.$wrapper);

            this.$labelUploadInfo = $('.upload-info', this.$wrapper);

            this.$labelLanguage = $('.language-text', this.$wrapper);
            this.$uploadItemTemplate = $('#file-upload-item-template', document.body);

            this.$wrapperEmptyBlock = $('.block-empty', this.$wrapper);
            this.$wrapperItems = $('.block-uploading', this.$wrapper);
            this.$wrapperStatus = $('.content-upload-summary', this.$wrapper);

            this.addEventHandlers();
            this.initialized = true;
        }

        addEventHandlers() {
            this.$uploadButton.eventOnClick(($input) => {
                if (this.hasError() && $input.hasClass('upload-btn')) {
                    return false;
                }
                this.$selectFileButton.click();
                return false;
            });

            this.$languageButton.eventOnClick(() => {
                langDialog.show();
            });

            this.$dialogOverlay.eventOnClick((e) => {
                closeDialog(e);
            });

            $(window).rebind('keyup.frup', (e) => {
                if (e.keyCode === 27) {// ESC key pressed
                    closeDialog(e);
                }
            });

            const uploadItemReupload = '.block-uploading-item .error-reupload';
            this.$wrapperItems
                .off('click.frup', uploadItemReupload)
                .on('click.frup', uploadItemReupload, () => {
                    this.$selectFileButton.click();
                });

            this.handleResize();
            $(window).rebind('resize.filerequest_upload', () => {
                this.handleResize();
            });

            const selectFileEvent = is_mobile ? 'tap, click' : 'click';
            this.$selectFileButton.rebind(selectFileEvent, (evt) => {
                if (evt && evt.target) {
                    evt.target.value = null;
                }
            });
        }

        handleResize() {
            const $pageCaption = $('.page-caption', this.$wrapper);
            const footerCaptionHeight = $pageCaption.outerHeight(true) +
            $('.page-footer', this.$wrapper).outerHeight(true);
            const bodyHeight = $('body').outerHeight(true);

            const newCaptionTop = `${bodyHeight - footerCaptionHeight}px`;
            $pageCaption.css('top', newCaptionTop);
        }

        initDragAndDrop() {
            return this.$uploadItems && this.$uploadItems.length;
        }

        getAndSetUploadHandler(optionReference) {
            const {handle: uploadHandler} = this.uploadEventHandler;
            const eventHandler = this.uploadEventHandler;
            const hasError = this.hasError.bind(this);

            this.$selectFileButton.rebind(
                'change.frup',
                (...args) => {
                    return uploadHandler.apply(eventHandler, [optionReference, ...args]);
                }
            );

            return function(...args) {
                if (hasError()) {
                    args[0].preventDefault();
                    args[0].stopPropagation();
                    return;
                }

                // Pass the event handler context
                // We pass the option by reference since
                // most of the properties inside filedrag are
                // private, not optimal but it works
                return uploadHandler.apply(eventHandler, [optionReference, ...args]);
            };
        }

        checkUploadDragHandler(dragEventHandler) {
            const hasError = this.hasError.bind(this);
            return function(...args) {
                if (hasError()) {
                    args[0].preventDefault();
                    args[0].stopPropagation();
                    return;
                }

                dragEventHandler.apply(this, args);
            };
        }

        setLabel(name, title, description, error) {
            this.$labelName
                .addClass('hidden')
                .text('');

            if (name) {
                const formattedName = l.file_request_upload_content_title
                    .replace('%1', name);

                this.$labelName
                    .removeClass('hidden')
                    .text(formattedName);
            }

            this.$wrapperDetail.removeClass('hidden content-error');
            this.$labelTitle
                .addClass('hidden')
                .text('');
            this.$labelDescription
                .addClass('hidden')
                .text('');

            if (error) {
                this.$wrapperDetail.addClass('content-error');
            }

            if (title) {
                this.$labelTitle.removeClass('hidden');
                this.$labelTitle.text(title);
            }
            if (description) {
                this.$labelDescription.removeClass('hidden');
                this.$labelDescription.text(description);
            }

            if (this.id) {
                this.$labelUploadId.text(this.id);
            }
            else if (!(error || title || description)) {
                this.$wrapperDetail.addClass('hidden');
            }
        }

        initUploadEventHandler() {
            if (this.uploadEventHandler === null) {
                this.uploadEventHandler = new FileRequestUploadEventHandler(this);
            }
        }

        initLanguage() {
            this.$labelLanguage.text(lang.toUpperCase());
        }

        isInitialized() {
            return this.initialized;
        }

        onItemUploadCompletion(id) { // Complete Item
            const gid = `ul_${id}`;
            const item = this.queue.items[`#${gid}`];
            const $itemElement = item.$;

            $itemElement.status.text(l.file_request_upload_status_uploaded);
            $itemElement.progress.css('width', `100%`);
            item.completed = true;

            delay('filerequest.log', eventlog.bind(null, 99776)); // upload count

            this.addItemCompleted(id);
        }

        onUploadCompletion() { // Overall completion
            this.stats.currentSize = this.stats.totalSize;
            this.stats.current = this.getCompletedItems();

            this.updateUploadInfo();
        }

        updateUploadInfo() {
            const formattedInfo = mega.icu.format(l.file_request_upload_summary_total_plural, this.stats.total)
                .replace('%1', this.stats.current);

            this.$labelUploadInfo.text(formattedInfo);
        }

        onItemUploadProgress(ul, bps, time, perc, bl) { // Item Upload
            const { id, _gotTransferError } = ul;
            const prefix = 'ul_';
            const cacheId = `#${prefix}${id}`;
            const $item = this.cacheUploadItem(cacheId);

            // Update specific upload item
            if (perc >= 100) {
                $item.$.status.text(l.file_request_upload_status_uploaded);
            }
            else {
                $item.$.status.text(formatPercentage(perc / 100));
            }

            $item.$.progress.css('width', `${perc}%`);
            $item.percent = perc;

            if (bl) {
                $item.currentSize = bl;
            }

            if ($item.$.element) {
                $item.$.element.removeClass('transfer-initiliazing transfer-queued');
                $item.$.element.addClass('transfer-started');
            }

            if (_gotTransferError && bps > 0) {
                ul._gotTransferError = false;

                $item.$.element.removeClass('transfer-error');
                $item.$.error
                    .removeClass('hidden');
            }
        }

        onItemUploadError(abort, uid, error, ignoreGeneral) { // Item Upload
            this.removeItemCompleted(uid);

            // Upload has been stopped after a showstopper.
            if (this.stopped) {
                return;
            }

            const prefix = 'ul_';
            const cacheId = `#${prefix}${uid}`;
            const $item = this.cacheUploadItem(cacheId);

            const $errorMessage = $('.error-message', $item.$.error);
            const $errorReupload = $('.error-reupload', $item.$.error);

            $item.completed = false;
            $item.$.error.removeClass('hidden');

            // Hide status when there is an upload error
            $item.$.status.addClass('hidden');
            $errorReupload.addClass('hidden');

            let errorType = null;

            let message = api_strerror(error);
            let errorTaskObject = ERROR_TASK_MESSAGES[error];
            if (!errorTaskObject) {
                errorTaskObject = {
                    taskType: ERROR_TASK_TYPE
                };
                message =  l[1578];
            }

            const { taskType, message: taskMessage } = errorTaskObject;
            if (errorTaskObject.type) {
                errorType = errorTaskObject.type;
            }

            if (taskMessage) {
                message = taskMessage;
            }

            let gid = null;
            if (errorType && taskType === ERROR_TASK_TYPE_GENERAL && !ignoreGeneral) { // Show stoppers
                switch (errorType) {
                    case ERROR_TYPE_ACCOUNT:
                        mBroadcaster.sendMessage('FileRequest:disabled', error);
                        break;
                    case ERROR_TYPE_INVALID:
                        mBroadcaster.sendMessage('FileRequest:invalid', error);
                        break;
                    case ERROR_TYPE_QUOTA:
                        mBroadcaster.sendMessage('FileRequest:overquota', error);
                        break;
                }

                this.stopped = true;
            }
            else if (taskType === ERROR_TASK_TYPE) {
                $errorReupload.removeClass('hidden');
                gid = `ul_${uid}`;
            }

            if (ignoreGeneral) {
                $errorReupload.addClass('hidden');
            }

            if (d) {
                logger.info('Upload - Page.onItemUploadError', uid, error);
            }

            if (!abort) {
                ulmanager.abort(gid);
            }

            $errorMessage.text(message);
            this.onItemUploadProgress({
                id: uid
            }, 0, 0, 100, 0);

            $item.$.element.addClass('transfer-error');
        }

        createItem(id, name, size, status) {
            const $newItem = this.$uploadItemTemplate.clone();
            $newItem
                .removeClass('hidden')
                .attr('id', id);

            $('.item-name', $newItem).text(name);
            $('.item-size', $newItem).text(size);
            $('.item-status', $newItem).text(status);

            return $newItem;
        }

        addItem(fileId, fileName, status, fileSize) {
            const size = bytesToSize(fileSize, 1);
            const prefix = 'ul_';
            const id = `${prefix}${fileId}`;
            const name = str_mtrunc(fileName, 37);

            this.queue.total += 1;

            const $newItem = this.createItem(id, name, size, status);

            if (this.queue.total === 1) { // Add last-item class on first element
                $newItem.addClass('last-item');
            }

            this.$uploadItems.prepend($newItem);
            this.$wrapperEmptyBlock
                .removeClass('block-empty-error')
                .addClass('hidden');

            const $item = this.cacheUploadItem(`#${prefix}${fileId}`);
            $item.totalSize = size;

            this.addToTotalStat(fileSize);
            initPerfectScrollbar(this.$uploadItems);

            this.$wrapperItems.removeClass('hidden');
            this.$wrapperStatus.removeClass('hidden');
        }

        addToTotalStat(fileSize) {
            this.stats.totalSize += fileSize;
            this.stats.total += 1;

            this.updateUploadInfo();
        }

        cacheUploadItem(id) {
            let item = this.queue.items[id];

            // Cache DOM elements for item
            if (!item) {
                const $tmp = $(id);
                item = this.queue.items[id] = {};
                item.$ = {};
                item.$.element = $tmp;
                item.$.name = $('.item-name', $tmp);
                item.$.size = $('.item-size', $tmp);
                item.$.status = $('.item-status', $tmp);
                item.$.progress = $('.item-progress-bar', $tmp);
                item.$.error = $('.item-error', $tmp);
                item.currentSize = 0;
                item.totalSize = 0;
                item.percent = 0;
                item.completed = false;
            }

            return item;
        }

        handleError(type, error) {
            if (type === undefined) {
                type = ERROR_TYPE_INVALID;
            }

            let messageObject = ERROR_TYPE_MESSAGES[type];
            if (!messageObject) {
                messageObject = {
                    title: l.file_request_upload_error_unvailable_title,
                    description: l.file_request_upload_error_invalid_description
                };
            }

            let name = null;

            if (mega.fileRequestUpload.puHandleObjectData) {
                name = mega.fileRequestUpload.puHandleObjectData.name;
            }

            this.setLabel(
                name,
                messageObject.title,
                messageObject.description,
                true
            );

            if (this.hasItemCompleted()) {
                this.setErrorOnIncompleteItems(error);
                return;
            }

            this.showEmptyBlockError();

            this.$wrapperItems.addClass('hidden');
            this.$wrapperStatus.addClass('hidden');

            this.$labelUploadIdWrapper.addClass('hidden');
        }

        setErrorOnIncompleteItems(error) {
            const keys = Object.keys(this.queue.items);
            if (keys) {
                keys.forEach((value) => {
                    const item = this.queue.items[value];

                    if (!item || item.completed) {
                        return;
                    }

                    const fileId = value.replace('#ul_', '');
                    mBroadcaster.sendMessage('upload:abort', fileId, error, true);
                });
            }
        }

        hasError() {
            return this.error;
        }

        setError(error) {
            this.error = error;
        }

        addItemCompleted(uid) {
            this.itemCompleted[uid] = true;
            this.updateItemCompletedInfo();
        }

        removeItemCompleted(uid) {
            if (this.itemCompleted[uid]) {
                delete this.itemCompleted[uid];
            }

            this.updateItemCompletedInfo();
        }

        updateItemCompletedInfo() {
            this.stats.current = this.getCompletedItems();
            this.updateUploadInfo();
        }

        hasItemCompleted() {
            return this.getCompletedItems() > 0;
        }

        getCompletedItems() {
            return Object.keys(this.itemCompleted).length;
        }

        initUploadErrorEventHandler() {
            if (this.errorHandlerInitialized) {
                return;
            }

            mBroadcaster
                .addListener(`upload:abort`, this.onItemUploadError.bind(this, true));
            mBroadcaster
                .addListener(`upload:error`, this.onItemUploadError.bind(this, false));

            this.errorHandlerInitialized = true;
        }

        getName(name) {
            if (!this.duplicates[name]) {
                this.duplicates[name] = 0;
            }

            const index = ++this.duplicates[name];
            const nameArray = name.split('.');
            const ext = nameArray.pop();
            const newName = nameArray.join('.');
            const id = this.id ? `_${this.id}` : '';

            if (index === 1) {
                return `${newName}${id}.${ext}`;
            }

            return `${newName} (${index - 1})${id}.${ext}`;
        }

        showEmptyBlockError() {
            this.$wrapperEmptyBlock
                .addClass('block-empty-error')
                .removeClass('hidden');
        }
    }

    return new class FileRequestUploadPageHandler {
        constructor() {
            this.puHandlePublicHandle = null;
            this.ownerHandle = null;
            this.puHandleObjectData = null;
            this.puPagePublicHandle = null;
            this.parameters = null;
            this.ownerPublicKey = null;

            lazy(this, 'fileRequestApi', () => mega.fileRequestCommon.fileRequestApi);
            lazy(this, 'uploadPage', () => new FileRequestUploadPage());

            this.addEventHandlers();
        }

        async handlePublicUploadPage(uploadPagePath) {
            const parameters = this.parseParameters(uploadPagePath);
            if (parameters.isPreview && !parameters.isUpdate) {
                this.handlePreview(parameters);
                return;
            }
            const {puPageId} = parameters;

            if (!puPageId) {
                mBroadcaster.sendMessage('FileRequest:invalid', 0);
                return;
            }
            eventlog(99775);

            let data = is_megadrop.p === puPageId && is_megadrop;
            if (!data) {
                loadingDialog.show();

                data = await this.fileRequestApi.getPuPage(puPageId)
                    .catch((ex) => {
                        logger.error(ex);
                        this.handleException(ex, puPageId);
                    })
                    .finally(() => {
                        loadingDialog.hide();
                    });
            }

            if (data) {
                this.handle(data);
            }
        }

        initDragAndDrop() {
            if (!this.uploadPage) {
                return false;
            }

            return this.uploadPage.initDragAndDrop();
        }

        getAndSetUploadHandler(optionReference) {
            return this.uploadPage.getAndSetUploadHandler(optionReference);
        }

        checkUploadDragHandler(dragEventHandler) {
            return this.uploadPage.checkUploadDragHandler(dragEventHandler);
        }

        isUploadPageInitialized() {
            return this.uploadPage && this.uploadPage.isInitialized();
        }

        onItemUploadCompletion(id) {
            return this.uploadPage.onItemUploadCompletion(id);
        }

        onUploadCompletion() {
            return this.uploadPage.onUploadCompletion();
        }

        getUploadPageOwnerHandle() {
            return this.ownerHandle;
        }

        getUploadPagePuHandle() {
            return this.puHandlePublicHandle;
        }

        onItemUploadProgress(id, bps, retime, perc, bl) {
            return this.uploadPage.onItemUploadProgress(id, bps, retime, perc, bl);
        }

        addEventHandlers() {
            mBroadcaster.addListener(`FileRequest:disabled`, (error) => {
                this.handleDisabled(error);
            });

            mBroadcaster.addListener(`FileRequest:invalid`, (error) => {
                this.handleInvalid(error);
            });

            mBroadcaster.addListener(`FileRequest:overquota`, (error) => {
                this.handleOverQuota(error);
            });
        }

        handleDisabled(error) {
            this.handlePageError(ERROR_TYPE_ACCOUNT, error);
        }

        handleOverQuota(error) {
            if (error === 0) {
                error = EOVERQUOTA;
            }

            this.handlePageError(ERROR_TYPE_QUOTA, error);
        }

        handleInvalid(error) {
            this.handlePageError(ERROR_TYPE_INVALID, error);
        }

        handlePageError(type, error) {
            if (!this.uploadPage || !this.uploadPage.isInitialized()) {
                this.parsePage();

                mega.ui.setTheme(0);
            }

            this.uploadPage.setError(true);
            this.uploadPage.init();
            this.uploadPage.handleError(type, error);
            this.uploadPage.initLanguage();
        }

        handleInitialized() {
            if (!window.u_k_aes) {
                api_create_u_k();
                u_k_aes = new sjcl.cipher.aes(u_k);
            }
            u_pubkeys[this.ownerHandle] = this.ownerPublicKey; // Store public key for owner

            this.uploadPage.initUploadEventHandler();
            InitFileDrag(); // Init file drag upload
            this.uploadPage.initLanguage();
            this.uploadPage.initUploadErrorEventHandler();
        }

        async handleChecked() {
            this.parsePage();

            let {name, description, msg: title} = this.puHandleObjectData;
            let theme = 0;

            this.uploadPage.init();
            if (this.parameters && this.parameters.isUpdate) {
                name = this.parameters.name || name;
                title = this.parameters.title || title;
                description = this.parameters.description || description;
                theme = this.parameters.theme;
            }

            mega.ui.setTheme(theme);
            this.uploadPage.setLabel(name, title, description);

            return this.fileRequestApi
                .getOwnerPublicKey(this.ownerHandle)
                .then((pubk) => {

                    this.ownerPublicKey = crypto_decodepubkey(base64urldecode(pubk));

                    return this.handleInitialized();
                });
        }

        handlePreview(parameters) {
            this.parsePage();

            const name = parameters.name || '';
            const title = parameters.title || '';
            const description = parameters.description || '';
            const theme = parameters.theme !== '' && parseInt(parameters.theme) || 0;

            mega.ui.setTheme(theme);
            this.uploadPage.setError(true);

            this.uploadPage.init();
            this.uploadPage.setLabel(name, title, description);
            this.uploadPage.initLanguage();

            this.uploadPage.showEmptyBlockError();
        }

        handle(puPageObject, puPagePublicHandle) {
            if (typeof puPageObject !== 'number' && typeof puPageObject !== 'object') {
                if (d) {
                    logger.info('Upload - Api.getPuPage - Disabled', puPageObject);
                }

                mBroadcaster.sendMessage('FileRequest:disabled', 0);
                return;
            }

            if (typeof puPageObject === 'number') {
                if (puPageObject === EOVERQUOTA) {
                    if (d) {
                        logger.info('Upload - Api.getPuPage - Over Quota', api_strerror(puPage));
                    }

                    mBroadcaster.sendMessage('FileRequest:overquota', puPageObject);
                    return;
                }

                if (d) {
                    logger.info('Upload - Api.getPuPage - Other', api_strerror(puPage));
                }

                mBroadcaster.sendMessage('FileRequest:disabled', puPageObject);
                return;
            }

            if ($.isEmptyObject(puPageObject)) {
                if (d) {
                    logger.info('Upload - Api.getPuPage - Empty', puPage);
                }

                mBroadcaster.sendMessage('FileRequest:disabled', 0);
                return;
            }

            if (Array.isArray(puPageObject)) {
                puPageObject = puPageObject[0];
            }

            this.puHandlePublicHandle = puPageObject.ph;
            this.ownerHandle = puPageObject.u;
            this.puHandleObjectData = puPageObject.d;
            this.puPagePublicHandle = puPagePublicHandle;

            this.handleChecked().catch(tell);

            if (d) {
                logger.info('Upload - Api.getPuPage - Handle', puPageObject);
            }
        }

        handleException(exception, puPagePublicHandle) {
            const errorTaskObject = ERROR_TASK_MESSAGES[exception];
            if (errorTaskObject && errorTaskObject.type === ERROR_TYPE_QUOTA) {
                mBroadcaster.sendMessage(`FileRequest:overquota`, exception);
            }
            else {
                mBroadcaster.sendMessage(`FileRequest:invalid`, exception);
            }

            if (d) {
                logger.info(
                    'Upload - PageHandler.handleException - Exception',
                    exception,
                    puPagePublicHandle
                );
            }
        }

        parsePage() {
            parsepage(pages.filerequest);
        }

        parseParameters(pagePath) {
            const previewIndex = pagePath.indexOf('!');
            const isPreview = previewIndex > -1;
            let isUpdate = false;

            if (isPreview) {
                const parsedPath = String(pagePath).split('!');

                let name = null;
                let title = null;
                let description = null;
                let theme = null;

                for (let index = 0; index < parsedPath.length; index++) {
                    const key = parsedPath[index].substr(0, 1);
                    const value = parsedPath[index].substr(2);
                    switch (key) {
                        case 'n':
                            name = from8(base64urldecode(value));
                            break;
                        case 't':
                            title = from8(base64urldecode(value));
                            break;
                        case 'd':
                            description = from8(base64urldecode(value));
                            break;
                        case 'm':
                            theme = from8(base64urldecode(value));
                            break;
                    }
                }

                this.parameters = {
                    isPreview,
                    name,
                    title,
                    description,
                    theme
                };
            }

            let pupHandle = null;
            if (pagePath.substr(0, 1) !== '!') {
                const endIndex = isPreview ? previewIndex : 14;
                pupHandle = pagePath.substr(0, endIndex);

                if (isPreview) { // It has a pup handle and has preview parameters
                    isUpdate = true;
                }
            }

            this.parameters = {
                isUpdate,
                puPageId: pupHandle,
                ...this.parameters
            };

            return this.parameters;
        }
    };
});

function init_page() {
    "use strict";

    if (!is_megadrop) {
        console.error('Invalid FR Navigation...');
        return location.replace(getBaseUrl());
    }
    const page = getCleanSitePath();

    mega.fileRequestUpload.handlePublicUploadPage(page.split('/')[1]).catch(tell);
}

function topmenuUI() {
    'use strict';
    /* nop */
}
