/* eslint-disable max-classes-per-file */
/**
 * @property {FileRequestUploadPageHandler} mega.fileRequestUpload
 */
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
    ERROR_TASK_MESSAGES[EEXPIRED] = {
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

    const MAX_TAG_LENGTH = 48;

    const logger = new MegaLogger('upload', null, MegaLogger.getLogger('FileRequest'));

    const readSize = tryCatch((file) => file.size, false);

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

        async handle(optionReference, event) {
            // Stop bubbling, e.g. prevent Save File dialog
            this.checkEvent(event);
            optionReference.removeOverlay();

            const targetId = mega.fileRequestUpload
                .getUploadPagePuHandle();

            const ownerHandle = mega.fileRequestUpload
                .getUploadPageOwnerHandle();

            const dataTransfer = Object(event.dataTransfer);
            let files = event.target.files || dataTransfer.files;

            if (!files || !files.length) {
                return false;
            }

            const { uploadPage, puHandleObjectData } = mega.fileRequestUpload;
            // If set disable folder uploads
            const folders = !Object(puHandleObjectData).f;

            if (folders) {
                const list = await factory.require('file-list').getFileList(event).catch(tell);
                const { empty } = Object(list);
                if (empty && empty.length) {
                    mega.ui.toast.show(l.fr_empty_folders);
                }

                files = await uploadPage.resolveFolders(list, targetId);
                if (!files.length) {
                    return false;
                }
            }
            else if (M.checkFolderDrop(event)) {
                // Show warning notification
                msgDialog('warninga', l[135], l[19179], false, false, false);
                return false;
            }

            const entries = [];
            const tag = uploadPage.getUploadTag();

            // Similar to fileconflict but with some tweaks for past state/missing tree
            for (let i = 0; files[i]; i++) {
                const file = files[i];
                if (file.name !== '.') {
                    let path = file.path || null;
                    if (!folders && file.webkitRelativePath) {
                        path = String(file.webkitRelativePath)
                            .replace(
                                RegExp(`[\\/]${String(file.name).replace(/(\W)/g, '\\$1')}$`),
                                ''
                            );
                    }
                    if (readSize(file) === undefined) {
                        logger.warn('Skipping, cannot read its size...', file.name);
                        continue;
                    }

                    entries.push(this.getEntry(file, targetId, path));
                }
            }

            await uploadPage.resolveClashes(
                entries.filter((c) => c.found),
                (entry, name) => {
                    entry.skip = !name;
                }
            );

            for (let i = 0; i < entries.length; i++) {
                const { file, path, target, folder, skip } = entries[i];

                if (skip) {
                    continue;
                }

                file.target = target;
                file.id = this.uploadId++;
                file.ownerId = ownerHandle;
                file.path = path;
                file.fru = tag;

                ul_queue.push(file);

                uploadPage.addItem(file.id, file.name, file.size, folder);

                if (is_mobile) {
                    M.addToTransferTable(`ul_${file.id}`, file);
                }
            }

            // Set flag if its uploading
            ulmanager.isUploading = Boolean(ul_queue.length);
        }

        getEntry(file, targetId, path) {
            const target = path || targetId;
            const name = M.getSafeName(file.name);
            const found = mega.fileRequestUpload.uploadPage.getTakenName(name, target);
            if (!found) {
                mega.fileRequestUpload.uploadPage.reserveName(file, name, target);
            }
            const folder = file.folder || path && M.getSafePath(path)[0] || '';
            return { file, path, name, target, folder, found };
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
            this.$dialogOverlay = null;
            this.$window = null;
            this.$uploadItems = null;
            this.$selectFileButton = null;

            this.$labelName = null;
            this.ownerName = '';

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
            this.paths = Object.create(null);
            this.rows = Object.create(null);
            this.folderRows = Object.create(null);

            this.stats = {
                totalSize: 0
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
            ulQueue.pause();

            this.$wrapper = $('.file-request-upload-page', document.body);
            this.$wrapper.parent().addClass('page-file-request-upload');
            this.currentUploadBlock = this.$wrapper[0].querySelector('.current-upload-block');
            this.uploadSize = this.currentUploadBlock.querySelector('.upload-size');
            this.addMoreButton = new MegaButton({
                parentNode: this.currentUploadBlock,
                prepend: true,
                type: 'normal',
                text: l.add_more_files,
                icon: 'sprite-fm-mono icon-plus-thin-outline',
                componentClassname: 'text-icon fr-add-more',
                onClick: () => {
                    if (this.isLocked()) {
                        return false;
                    }
                    this.$selectFileButton.click();
                }
            });
            this.actionBlock = this.$wrapper[0].querySelector('.content-wrapper .action-block');
            this.uploadButton = new MegaButton({
                parentNode: this.actionBlock,
                type: 'normal',
                text: l[372],
                onClick: () => {
                    if (this.isLocked()) {
                        return false;
                    }

                    const { expiry } = mega.fileRequestUpload;
                    if (expiry > 0 && expiry + 3600 <= Date.now() / 1000) {
                        // Re-check if the creator updated the expiry or show the error on load.
                        ulmanager.isUploading = false;
                        location.reload();
                        return false;
                    }

                    this.uploadButton.loading = true;
                    this.addMoreButton.disabled = true;
                    this.uNameInput.disabled = true;
                    this.uNameInput.addClass('disabled');
                    this.startUpload();
                },
            });
            this.$dialogOverlay = new mega.fileRequestUI.ButtonComponent(
                $('.fm-dialog-overlay', document.body), {
                    namespace: 'frup'
                }
            );

            this.$window = $(window);
            this.$labelName = $('.page-header', this.$wrapper);

            this.$wrapperDetail = $('.content-details:not(.content-error)', this.$wrapper);
            this.$labelTitle = $('.detail-title', this.$wrapper);
            this.$labelDescription = $('.detail-description', this.$wrapper);
            this.$labelUploadId = $('.detail-upload-id .upload-id', this.$wrapper);
            this.$labelUploadIdWrapper = $('.detail-upload-id', this.$wrapper);

            this.$selectFileButton = $('#fileselect5', document.body);
            this.$uploadItems = $('.block-uploading-scroll', this.$wrapper);

            this.$labelLanguage = $('.language-text', this.$wrapper);
            this.$uploadItemTemplate = $('#file-upload-item-template', document.body);

            this.$wrapperEmptyBlock = $('.block-empty', this.$wrapper);
            this.$wrapperItems = $('.block-uploading', this.$wrapper);
            this.$wrapperStatus = $('.content-upload-summary', this.$wrapper);
            this.$wrapperStatus.removeClass('hidden');
            if (is_mobile) {
                $('.info-block i', this.$wrapperStatus).removeClass('simpletip');
            }

            this.addEventHandlers();
            this.initialized = true;

            MegaButton.factory({
                parentNode: this.$wrapperEmptyBlock[0],
                type: 'normal',
                text: l.transferit_add_files,
                onClick: () => {
                    if (this.isLocked()) {
                        return false;
                    }
                    this.$selectFileButton.click();
                    return false;
                }
            });
            this.uNameLen = this.$wrapper[0].querySelector('.char-count');
            this.uNameInput = new MegaInputComponent({
                parentNode: this.$wrapperStatus[0].querySelector('.input-holder'),
                className: 'form-element pmText',
                title: l.fr_name_label,
                titleOptional: true,
                placeholder: l.fr_user_addition_placeholder,
            });
            const MAX_NAME_LENGTH = 30;
            this.uNameInput.on('input.frp', () => {
                const from = this.uNameInput.value.trim();
                this.uNameLen.textContent = `${this.uNameInput.value.length}/${MAX_NAME_LENGTH}`;
                if (this.id) {
                    this.$labelUploadId.text(from ? `${from}_${this.id}` : this.id);
                }
            });
            this.uNameInput.input.id = 'frUName';
            this.uNameInput.input.maxLength = MAX_NAME_LENGTH;
            this.finishedBlock = this.$wrapper[0].querySelector('.block-finished');
            this.finishedSubtext = this.finishedBlock.querySelector('.block-finished-subtext');
            MegaButton.factory({
                parentNode: this.finishedBlock,
                type: 'normal',
                text: l.transferit_up_more_files,
                onClick: () => {
                    if (this.isLocked()) {
                        return false;
                    }
                    this.$selectFileButton.click();
                    return false;
                }
            });
            this.uploadError = this.$wrapper[0].querySelector('.upload-error-block .err-msg');
            this.badgeRow = this.$wrapper[0].querySelector('.badge-row');
            this.badgeExpiry = this.badgeRow.querySelector('.expiry-badge');
            this.badgeSize = this.badgeRow.querySelector('.size-badge');
            this.sentKey = `fr.sent.${mega.fileRequestUpload.getUploadPagePuHandle()}`;
            this.sent = parseFloat(sessionStorage[this.sentKey]) || 0;
            this.pageCaption = this.$wrapper[0].querySelector('.page-caption');
        }

        addEventHandlers() {
            this.$dialogOverlay.eventOnClick((e) => {
                closeDialog(e);
            });

            $(window).rebind('keyup.frup', (e) => {
                if (e.keyCode === 27) {// ESC key pressed
                    closeDialog(e);
                }
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
            this.$wrapper.rebind('click', '.item-details .action-icon', (ev) => {
                if (!ev.currentTarget.classList.contains('icon-dialog-close-thin')) {
                    return false;
                }
                const row = ev.currentTarget.closest('.block-uploading-item');
                const cacheId = `#${row.id}`;
                const { folder } = Object(this.queue.items[cacheId]);
                for (let i = ul_queue.length; i--;) {
                    const gid = ulmanager.getGID(ul_queue[i]);
                    if (this.rows[gid] === cacheId) {
                        const { name, target } = ul_queue[i];
                        if (this.duplicates[target]) {
                            delete this.duplicates[target][name];
                        }
                    }
                }
                const root = mega.fileRequestUpload.getUploadPagePuHandle();
                if (folder && this.duplicates[root]) {
                    delete this.duplicates[root][folder];
                }

                this.removeItem(row.id);

                if (!this.updateUploadError() && this.getCompletedItems()) {
                    this.onUploadCompletion();
                }
            });
        }

        handleResize() {
            const $pageCaption = $(this.pageCaption);
            const footerCaptionHeight = $pageCaption.outerHeight(true) +
            $('.page-footer', this.$wrapper).outerHeight(true);
            const bodyHeight = $('body').outerHeight(true);

            const $psa = $('.psa-holder:visible .mega-component.banner.anouncement');
            const psaHeight = $psa.length ? $psa.outerHeight(true) : 0;
            if (psaHeight) {
                const newCaptionTop = `${Math.ceil(bodyHeight - footerCaptionHeight - psaHeight - 60)}px`;
                $pageCaption.css('top', newCaptionTop);

                return;
            }

            const newCaptionTop = `${bodyHeight - footerCaptionHeight - 40}px`;
            $pageCaption.css('top', newCaptionTop);
        }

        initDragAndDrop() {
            return this.$uploadItems && this.$uploadItems.length;
        }

        getAndSetUploadHandler(optionReference) {
            const {handle: uploadHandler} = this.uploadEventHandler;
            const eventHandler = this.uploadEventHandler;
            const isLocked = this.isLocked.bind(this);

            this.$selectFileButton.rebind(
                'change.frup',
                (...args) => {
                    if (isLocked()) {
                        return;
                    }

                    return uploadHandler.apply(eventHandler, [optionReference, ...args]).catch(dump);
                }
            );

            return function(...args) {
                if (isLocked()) {
                    args[0].preventDefault();
                    args[0].stopPropagation();
                    return;
                }

                // Pass the event handler context
                // We pass the option by reference since
                // most of the properties inside filedrag are
                // private, not optimal but it works
                return uploadHandler.apply(eventHandler, [optionReference, ...args]).catch(dump);
            };
        }

        checkUploadDragHandler(dragEventHandler) {
            const isLocked = this.isLocked.bind(this);
            return function(...args) {
                if (isLocked()) {
                    args[0].preventDefault();
                    args[0].stopPropagation();
                    return;
                }

                dragEventHandler.apply(this, args);
            };
        }

        setLabel(name, title, description, error) {
            this.ownerName = name || '';
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
            this.$wrapper.removeClass('long-desc');
            if (description) {
                this.$labelDescription.removeClass('hidden');
                this.$labelDescription.text(description);
                if (!is_mobile && description.length > 250) {
                    this.$wrapper.addClass('long-desc');
                }
            }

            if (this.id) {
                this.$labelUploadId.text(this.id);
            }
            else if (!(error || title || description)) {
                this.$wrapperDetail.addClass('hidden');
            }

            const { expiry, maxSize } = mega.fileRequestUpload;
            this.badgeRow.classList.toggle('hidden', !(expiry || maxSize));
            this.badgeExpiry.classList.toggle('hidden', !expiry);
            this.badgeSize.classList.toggle('hidden', !maxSize);
            if (expiry) {
                this.badgeExpiry.querySelector('span').textContent = l.fr_expires.replace('%1', time2date(expiry, 2));
            }
            if (maxSize) {
                this.badgeSize.querySelector('span').textContent = l.fr_max.replace('%1', bytesToSize(maxSize, 0));
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
            const item = this.queue.items[this.rows[gid]];
            if (!item) {
                return;
            }

            item.done += 1;
            item.errors.delete(gid);

            delay('filerequest.log', eventlog.bind(null, 99776)); // upload count
            this.addItemCompleted(id);

            if (item.done < item.files) {
                this.updateUploadError();
                return;
            }

            const $itemElement = item.$;

            $itemElement.element
                .removeClass('transfer-started transfer-error')
                .addClass('transfer-completed');
            $itemElement.progress.css('width', `100%`);
            item.completed = true;
            item.error = false;
            $('.item-details i', $itemElement.element)
                .removeClass('icon-dialog-close-thin')
                .addClass('icon-check-circle-regular-solid');

            this.updateUploadError();
        }

        onUploadCompletion() { // Overall completion
            const ids = Object.keys(this.queue.items);
            if (!ids.length || this.updateUploadError() || !this.getCompletedItems()) {
                return;
            }

            for (let i = ids.length; i--;) {
                this.removeItem(ids[i]);
            }

            this.showFinished();
        }

        updateUploadInfo() {
            this.uploadSize.textContent = l.fr_upload_size.replace('%1', bytesToSize(this.stats.totalSize));
        }

        onItemUploadProgress(ul, bps, time, perc, bl) { // Item Upload
            const { id, _gotTransferError } = ul;
            const gid = `ul_${id}`;
            const $item = this.queue.items[this.rows[gid]];
            if (!$item) {
                return;
            }

            if (bl) {
                $item.loaded[gid] = bl;
            }

            let loaded = 0;
            const keys = Object.keys($item.loaded);
            for (let i = keys.length; i--;) {
                loaded += $item.loaded[keys[i]];
            }
            $item.currentSize = loaded;
            $item.percent = $item.totalSize ? Math.min(loaded / $item.totalSize * 100, 100) : perc;
            $item.$.progress.css('width', `${$item.percent}%`);

            if ($item.$.element) {
                $item.$.element.removeClass('transfer-initiliazing transfer-queued');
                $item.$.element.addClass('transfer-started');
            }

            if (_gotTransferError && bps > 0) {
                ul._gotTransferError = false;
                $item.errors.delete(gid);
                if (!$item.errors.size) {
                    $item.$.element.removeClass('transfer-error');
                    $item.$.error.addClass('hidden');
                    $item.error = false;
                }

                this.updateUploadError();
            }
        }

        onItemUploadError(abort, uid, error) { // Item Upload
            const prefix = 'ul_';
            const uploadGid = `${prefix}${uid}`;
            const $item = this.queue.items[this.rows[uploadGid]];
            if (!$item) {
                return;
            }

            this.removeItemCompleted(uid);

            // Upload has been stopped after a showstopper.
            if (this.stopped) {
                return;
            }

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
            if (errorType && taskType === ERROR_TASK_TYPE_GENERAL) { // Show stoppers
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
            else if (taskType === ERROR_TASK_TYPE) { // Permanent, only the user can clear it
                message = taskMessage || l.fr_upload_failed_item;
                gid = `ul_${uid}`;
            }

            if (d) {
                logger.info('Upload - Page.onItemUploadError', uid, error);
            }

            if (!abort && (gid || this.stopped)) {
                ulmanager.abort(gid);
            }

            if (this.stopped) {
                return;
            }

            this.setItemError(uid, message);
        }

        setItemError(id, message) {
            const gid = `ul_${id}`;
            const item = this.queue.items[this.rows[gid]];
            if (!item) {
                return;
            }

            $('.error-message', item.$.error).text(message);
            item.completed = false;
            item.error = true;
            item.errors.add(gid);
            item.$.error.removeClass('hidden');
            item.$.element.addClass('transfer-error');
            this.updateUploadError();
        }

        createItem(id, name, size, folder) {
            const $newItem = this.$uploadItemTemplate.clone();
            $newItem
                .removeClass('hidden')
                .attr('id', id);

            $('.item-name', $newItem).text(name);
            $('.item-size', $newItem).text(size);
            $('.item-type-icon', $newItem)
                .addClass(folder ? 'icon-folder-24' : `icon-${fileIcon({ name })}-24`);

            return $newItem;
        }

        addItem(fileId, fileName, fileSize, folder) {
            const gid = `ul_${fileId}`;
            if (folder && !this.folderRows[folder]) {
                this.folderRows[folder] = `fr_${fileId}`;
            }

            const rowId = folder ? this.folderRows[folder] : gid;
            const cacheId = `#${rowId}`;
            let $item = this.queue.items[cacheId];

            this.rows[gid] = cacheId;
            this.addToTotalStat(fileSize);

            if ($item) {
                $item.totalSize += fileSize;
                $item.files += 1;
                $item.$.size.text(bytesToSize($item.totalSize, 1));
            }
            else {
                this.queue.total += 1;

                const $newItem = this.createItem(
                    rowId,
                    str_mtrunc(folder || fileName, 37),
                    bytesToSize(fileSize, 1),
                    folder
                );

                if (this.queue.total === 1) { // Add last-item class on first element
                    $newItem.addClass('last-item');
                }

                this.$uploadItems.prepend($newItem);

                $item = this.cacheUploadItem(cacheId);
                $item.totalSize = fileSize;
                $item.files = 1;
                $item.folder = folder;
            }

            this.updateUploadError();
            this.showUploading();
            initPerfectScrollbar(this.$uploadItems);
        }

        addToTotalStat(fileSize) {
            this.stats.totalSize += fileSize;

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
                item.$.progress = $('.item-progress-bar', $tmp);
                item.$.error = $('.item-error', $tmp);
                item.currentSize = 0;
                item.totalSize = 0;
                item.percent = 0;
                item.completed = false;
                item.error = false;
                item.files = 0;
                item.done = 0;
                item.errors = new Set();
                item.loaded = Object.create(null);
            }

            return item;
        }

        showUnavailable(type) {
            const { title } = ERROR_TYPE_MESSAGES[ERROR_TYPE_INVALID];
            const { description } = ERROR_TYPE_MESSAGES[type || ERROR_TYPE_INVALID];

            this.setLabel(null, title, description, true);

            this.$wrapper.addClass('err-invalid');
            this.$wrapperItems.addClass('hidden');
            this.$wrapperStatus.addClass('hidden');
            this.$wrapperEmptyBlock.addClass('hidden');
            this.$labelUploadIdWrapper.addClass('hidden');
            this.uploadError.closest('.upload-error-block').classList.add('hidden');
            this.pageCaption.classList.add('hidden');
        }

        showBlocked() {
            this.stopped = true;
            this.uploadError.textContent = l.fr_upload_failed_owner;
            this.$wrapper.addClass('remain-err');
            this.uploadButton.loading = false;
            this.uploadButton.disabled = true;

            const keys = Object.keys(this.queue.items);
            for (let i = keys.length; i--;) {
                const item = this.queue.items[keys[i]];
                if (!item.completed) {
                    item.error = true;
                    item.$.element.addClass('transfer-error');
                }
            }
        }

        hasError() {
            return this.error;
        }

        isLocked() {
            return this.hasError() || this.uploadButton.loading;
        }

        setError(error) {
            this.error = error;
        }

        addItemCompleted(uid) {
            this.itemCompleted[uid] = true;
        }

        removeItemCompleted(uid) {
            if (this.itemCompleted[uid]) {
                delete this.itemCompleted[uid];
            }
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

        getTakenName(name, target) {
            const taken = this.duplicates[target];
            return taken && taken[name] || fileconflict.locateFileInUploadQueue(target, name);
        }

        reserveName(file, name, target) {
            if (!this.duplicates[target]) {
                this.duplicates[target] = Object.create(null);
            }
            this.duplicates[target][name] = {
                name,
                size: file.size,
                ts: Math.floor(file.lastModified / 1000)
            };

            if (name !== file.name) {
                Object.defineProperty(file, 'name', {
                    value: name,
                    writable: true,
                    configurable: true
                });
            }

            return name;
        }

        findName(name, target) {
            let newName = name;

            do {
                newName = fileconflict.getNewName(newName);
            } while (this.getTakenName(newName, target));

            return newName;
        }

        recordFolders(paths, root) {
            const keys = Object.keys(paths);
            for (let i = keys.length; i--;) {
                const segments = keys[i].split('/').filter(String);
                const h = paths[keys[i]];
                if (!(segments.length !== 1 || typeof h !== 'string')) {
                    if (!this.duplicates[root]) {
                        this.duplicates[root] = Object.create(null);
                    }

                    const [ name ] = segments;
                    this.duplicates[root][name] = { name, t: 1, h };
                }
            }
        }

        async resolveClashes(clashes, done) {
            let repeatOp = null;

            for (let i = 0; i < clashes.length; i++) {
                const { file, name, found, target } = clashes[i];
                const res = await this
                    .resolveName(file, name, found, target, clashes.length - i - 1, repeatOp)
                    .catch(dump);

                if (res && res.repeat) {
                    repeatOp = res.repeat;
                }
                done(clashes[i], res && res.name);
            }
        }

        async resolveFolders(files, root) {
            if (!files || !files.length) {
                return [];
            }
            const queue = Object.create(null);
            const loose = [];
            for (let i = files.length; i--;) {
                const folder = files[i].path && M.getSafePath(files[i].path)[0];
                if (folder) {
                    files[i].folder = folder;
                    if (!queue[folder]) {
                        queue[folder] = [];
                    }
                    queue[folder].push(files[i]);
                }
                else {
                    loose.push(files[i]);
                }
            }

            if (!this.duplicates[root]) {
                this.duplicates[root] = Object.create(null);
            }

            const taken = this.duplicates[root];
            const folders = Object.keys(queue);
            const clashes = [];

            for (let i = folders.length; i--;) {
                const folder = folders[i];
                if (taken[folder]) {
                    clashes.push({file: {name: folder, t: 1}, name: folder, found: taken[folder], target: root});
                }
                else {
                    taken[folder] = {name: folder, t: 1};
                }
            }

            await this.resolveClashes(clashes, (entry, name) => {
                if (name) {
                    this.renameFolder(queue, entry.name, name);
                }
                else {
                    delete queue[entry.name];
                }
            });

            const retFiles = [...loose, ...Object.values(queue).flat()];
            for (let i = retFiles.length; i--;) {
                if (retFiles[i].path) {
                    this.paths[retFiles[i].path] = null;
                }
            }
            return retFiles;
        }

        renameFolder(queue, from, to) {
            if (from === to || !queue[from]) {
                return;
            }

            const files = queue[from];

            for (let i = files.length; i--;) {
                const segments = String(files[i].path).split('/');

                segments[0] = to;
                files[i].path = segments.join('/');
                files[i].folder = to;
            }

            queue[to] = files;
            delete queue[from];
        }

        getUploadTag() {
            const id = `${this.id}`.slice(0, MAX_TAG_LENGTH - 1);
            const from = M.getSafeName(this.uNameInput.value.trim());
            return `${id}/${from.slice(0, MAX_TAG_LENGTH - id.length - 1)}`;
        }

        async resolveName(file, name, found, target, remaining, repeat) {
            if (repeat) {
                return {
                    name: repeat === fileconflict.KEEPBOTH
                        && this.reserveName(file, this.findName(name, target), target),
                    repeat
                };
            }

            const queued = {name, size: file.size, lastModified: file.lastModified, t: file.t};
            const suggestion = this.findName(name, target);

            return new Promise((resolve) => {
                fileconflict.prompt('upload', queued, found, remaining, target)
                    .always((res, chosen, action, checked) => {
                        resolve({
                            name: action === fileconflict.KEEPBOTH && this.reserveName(file, chosen, target),
                            repeat: checked && action
                        });
                    });

                // Forcibly hide dialog section and update with non-reserved name
                const $dialog = fileconflict.getDialog();
                $('.action-block.a1', $dialog).addClass('hidden');
                const $a3 = $('.action-block.a3', $dialog);
                $('.file-name', $a3).text(suggestion);
                fileconflict.customNames($a3[0]);
            });
        }

        updateUploadError() {
            if (this.hasError()) {
                return true;
            }

            const { maxSize } = mega.fileRequestUpload;
            const ids = Object.keys(this.queue.items);
            let failed = false;
            let pending = false;

            for (let i = ids.length; i--;) {
                const item = this.queue.items[ids[i]];

                const oversize = maxSize > 0 && item.totalSize > maxSize;
                item.$.element.toggleClass('transfer-oversize', oversize);

                failed = failed || item.error;
                pending = pending || !(item.error || item.completed);
            }

            const tooBig = maxSize > 0 && this.sent + this.stats.totalSize > maxSize;
            const blocked = tooBig || failed && !pending;

            if (blocked) {
                this.uploadError.textContent = tooBig
                    ? l.fr_upload_failed_size.replace('%1', bytesToSize(maxSize, 0))
                    : l.fr_uploaded_remain_err;
            }

            this.$wrapper.toggleClass('remain-err', blocked);
            this.uploadButton.disabled = tooBig;

            return tooBig || failed || pending;
        }

        showEmpty() {
            this.$wrapperEmptyBlock.removeClass('hidden');
            this.$wrapperItems.addClass('hidden');
            this.finishedBlock.classList.add('hidden');

            this.currentUploadBlock.classList.add('hidden');
            this.actionBlock.classList.add('hidden');
            this.$wrapperDetail.removeClass('hidden');
            this.$wrapperStatus.removeClass('hidden');
            this.$labelName.removeClass('hidden');

            this.resetUploadForm();
        }

        showUploading() {
            this.$wrapperEmptyBlock.addClass('hidden');
            this.$wrapperItems.removeClass('hidden');
            this.finishedBlock.classList.add('hidden');
            this.currentUploadBlock.classList.remove('hidden');
            this.actionBlock.classList.remove('hidden');
            this.$wrapperDetail.removeClass('hidden');
            this.$wrapperStatus.removeClass('hidden');
            this.$labelName.removeClass('hidden');
        }

        showFinished() {
            const subtext = escapeHTML(l.fr_upload_done_subtext)
                .replace('[B]', '<b>')
                .replace('[/B]', '</b>')
                .replace('%1', escapeHTML(this.ownerName));

            this.finishedSubtext.textContent = '';
            this.finishedSubtext.append(parseHTML(subtext));
            this.$wrapperEmptyBlock.addClass('hidden');
            this.$wrapperItems.addClass('hidden');
            this.finishedBlock.classList.remove('hidden');
            this.currentUploadBlock.classList.add('hidden');
            this.actionBlock.classList.add('hidden');
            this.$wrapperDetail.addClass('hidden');
            this.$wrapperStatus.addClass('hidden');
            this.$labelName.addClass('hidden');
            this.$wrapper.removeClass('remain-err');
            this.resetUploadForm();
        }

        startUpload() {
            const root = mega.fileRequestUpload.getUploadPagePuHandle();
            const { paths } = this;
            const tag = this.getUploadTag();
            for (let i = ul_queue.length; i--;) {
                if (ul_queue[i] && ul_queue[i].fru) {
                    ul_queue[i].fru = tag;
                }
            }

            if (!Object.keys(paths).length) {
                ulQueue.resume();
                return;
            }

            factory.require('mkdir')
                .mkdir(root, paths, (t, name) => mega.fileRequestUpload.createFolder(t, name, tag))
                .catch((ex) => {
                    if (d) {
                        logger.debug('Failed to create paths hierarchy...', ex);
                    }
                })
                .finally(() => {
                    for (let i = ul_queue.length; i--;) {
                        const ul = ul_queue[i];
                        if (!ul || !(ul.target in paths)) {
                            continue;
                        }
                        const created = paths[ul.target];
                        ul.target = typeof created === 'string' ? created : root;
                    }

                    this.recordFolders(paths, root);
                    this.paths = Object.create(null);
                    ulQueue.resume();
                });
        }

        resetUploadForm() {
            ulQueue.pause();
            this.uploadButton.loading = false;
            const locked = this.hasError();
            this.uploadButton.disabled = locked;
            this.addMoreButton.disabled = locked;
            this.uNameInput.disabled = false;
            this.uNameInput.removeClass('disabled');
        }

        removeItem(id) {
            const rowId = id[0] === '#' ? id.slice(1) : id;
            const cacheId = `#${rowId}`;
            const item = this.queue.items[cacheId];
            if (!item) {
                return;
            }

            delete this.queue.items[cacheId];

            if (item.folder) {
                const { folder } = item;
                delete this.folderRows[folder];
                const pending = Object.keys(this.paths);
                for (let i = pending.length; i--;) {
                    if (M.getSafePath(pending[i])[0] === folder) {
                        delete this.paths[pending[i]];
                        delete this.duplicates[pending[i]];
                    }
                }
            }

            for (const gid in this.rows) {
                if (this.rows[gid] === cacheId) {
                    delete this.rows[gid];

                    if (!item.completed) {
                        ulmanager.abort(gid);
                    }
                }
            }

            const $element = item.$.element;
            const wasLast = $element.hasClass('last-item');
            $element.remove();
            if (wasLast) {
                $('.block-uploading-item', this.$uploadItems).last().addClass('last-item');
            }

            this.queue.total = Math.max(this.queue.total - 1, 0);
            this.stats.totalSize = Math.max(this.stats.totalSize - item.totalSize, 0);

            if (item.completed) {
                this.sent += item.totalSize;
                sessionStorage[this.sentKey] = this.sent;
            }

            this.updateUploadInfo();
            this.updateUploadError();
            initPerfectScrollbar(this.$uploadItems);

            if (!this.queue.total) {
                this.showEmpty();
            }
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
            this.expiry = 0;
            this.maxSize = 0;

            lazy(this, 'fileRequestApi', () => mega.fileRequestCommon.fileRequestApi);
            /**
             * @property {FileRequestUploadPage} FileRequestUploadPageHandler.uploadPage
             */
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
                    .then(({result}) => result)
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

        setItemError(id, message) {
            return this.uploadPage.setItemError(id, message);
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

        async createFolder(target, name, tag) {
            const root = this.getUploadPagePuHandle();
            target = String(target || root);
            if (target.length !== 8 && target.length !== 11) {
                throw EACCESS;
            }

            name = String(name || '').trim();
            if (!name) {
                return target;
            }

            const n = { name: M.getSafeName(name), fru: tag };
            const req = {
                a: 'pp',
                t: root,
                v: 2,
                n: [{
                    h: 'xxxxxxxx',
                    t: 1,
                    a: ab_to_base64(crypto_makeattr(n)),
                    k: base64urlencode(
                        encryptto(this.getUploadPageOwnerHandle(), a32_to_str(n.k))
                    )
                }],
                i: requesti
            };

            if (target !== root) {
                req.sh = target;
            }

            const { result } = await api.req(req, { queryString: 'v=2' });
            const handle = result && result.f && result.f[0] && result.f[0].h;
            if (!handle) {
                throw new Error(`Unexpected folder creation reply for ${n.name}`);
            }

            if (d) {
                logger.info('Upload - created folder %s/%s...', target, handle, n.name);
            }
            return handle;
        }

        onItemUploadProgress(id, bps, retime, perc, bl) {
            return this.uploadPage.onItemUploadProgress(id, bps, retime, perc, bl);
        }

        addEventHandlers() {
            const handler = (error, type) => {
                if (this.puHandleObjectData) {
                    this.handleUploadError(error);
                    return;
                }

                this.handlePageError(error, type);
            };

            mBroadcaster.addListener(`FileRequest:disabled`, (error) => handler(error));
            mBroadcaster.addListener(`FileRequest:invalid`, (error) => handler(error));
            mBroadcaster.addListener(`FileRequest:overquota`, (error) => handler(error, ERROR_TYPE_QUOTA));
        }

        handlePageError(error, type) {
            if (d) {
                logger.info('Upload - PageHandler.handlePageError', error, type);
            }

            if (!this.uploadPage || !this.uploadPage.isInitialized()) {
                this.parsePage();

                mega.ui.setTheme(0);
            }

            this.uploadPage.setError(true);
            this.uploadPage.init();
            this.uploadPage.showUnavailable(type);
            this.uploadPage.initLanguage();
        }

        handleUploadError(error) {
            if (d) {
                logger.info('Upload - PageHandler.handleUploadError', error);
            }

            this.uploadPage.setError(true);
            this.uploadPage.showBlocked();
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
                this.expiry = this.parameters.expiry || 0;
                this.maxSize = this.parameters.maxSize || 0;
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
            this.expiry = parameters.expiry || 0;
            this.maxSize = parameters.maxSize || 0;

            mega.ui.setTheme(theme);
            this.uploadPage.setError(true);

            this.uploadPage.init();
            this.uploadPage.setLabel(name, title, description);
            this.uploadPage.initLanguage();

            this.uploadPage.showEmpty();
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

                if (puPageObject === EEXPIRED) {
                    // Link expired
                    mBroadcaster.sendMessage('FileRequest:invalid', puPageObject);
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

            this.expiry = puPageObject.ets || 0;
            this.maxSize = puPageObject.mfs || 0;

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
            if (mega.tld !== 'nz') {
                const url = document.querySelector('.file-request-upload-page a.nz-url');
                if (url) {
                    url.href = url.href.replace('nz', mega.tld);
                }
            }
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
                let expiry = 0;
                let maxSize = 0;

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
                        case 'e':
                            expiry = Number(from8(base64urldecode(value))) || 0;
                            break;
                        case 's':
                            maxSize = Number(from8(base64urldecode(value))) || 0;
                            break;
                    }
                }

                this.parameters = {
                    isPreview,
                    name,
                    title,
                    description,
                    theme,
                    expiry,
                    maxSize
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

    loadingDialog.hide('jsl-loader');

    const page = getCleanSitePath();

    mega.fileRequestUpload.handlePublicUploadPage(page.split('/')[1]).catch(tell);
}

function topmenuUI() {
    'use strict';
    /* nop */
}
