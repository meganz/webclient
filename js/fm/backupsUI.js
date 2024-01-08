/**
 * BackupCenter functions.
 * @name backupCenter
 * @memberOf mega
 * @type {Object}
 */
lazy(mega, 'backupCenter', () => {
    'use strict';

    const errorMessages = {
        // File system not supported.
        '2': l.err_fs_is_not_supported,
        // Remote node is not valid.
        '3': l.err_invalid_remote_node,
        // Local path is not valid.
        '4': l.err_invalid_local_path,
        // Initial scan failed.
        '5': l.err_initial_scan_failed,
        // Local path temporarily unavailable.
        '6': l.err_local_path_temp_na,
        // Local path not available.
        '7': l.err_local_path_is_na,
        // Remote node not found.
        '8': l.err_remote_n_not_found,
        // Foreign target storage quota reached.
        '11': l.err_inshare_acc_overquota,
        // Remote path has changed.
        '12': l.err_changed_remote_path,
        // Remote node has been deleted.
        '13': l.err_deleted_remote_n,
        // Share without full access.
        '14': l.err_share_wo_access,
        // Local fingerprint mismatch.
        '15': l.err_wrong_fingerprint,
        // Put nodes error.
        '16': l.err_put_nodes_error,
        // Active sync below path.
        '17': l.err_sync_below_path,
        // Active sync above path.
        '18': l.err_sync_above_path,
        // Remote node moved to Rubbish Bin.
        '19': l.err_n_moved_to_rubbish,
        // Remote node is inside Rubbish Bin.
        '20': l.err_n_is_in_rubbish,
        // Unsupported VBoxSharedFolderFS filesystem.
        '21': l.err_unsupported_vbsf,
        // Local path collides with an existing sync.
        '22': l.err_path_with_sync,
        // Unknown temporary error.
        '24': l.err_unknown_temp,
        // Too many changes in account, local state invalid.
        '25': l.err_local_state_invalid,
        // Session closed.
        '26': l.err_session_closed,
        // The whole account was reloaded, missed updates could not have been applied in an orderly fashion.
        '27': l.err_reloaded_acc,
        // Unable to figure out some node correspondence.
        '28': l.err_n_correspondence,
        // Backup externally modified.
        '29': l.err_externally_modified,
        // Backup source path not below drive path.
        '30': l.err_wrong_source_path,
        // Unable to write sync config to disk.
        '31': l.err_write_config_to_disk
    };

    const syncStatus = {

        inProgressSyncs(syncData, statusParentNode) {
            // Show Syncing progress (or Backing up icon if progress data is missing)
            if (syncData.syncingPercs && syncData.syncsNumber === 1) {
                const percsNode = mCreateElement('div', {'class': 'percs'}, statusParentNode);

                mCreateElement('i', {'class': 'sprite-fm-mono icon-transfer in-progress'}, percsNode);
                mCreateElement('span', {
                    'class': 'in-progress'
                }, percsNode).textContent = `${syncData.syncingPercs} %`;
            }
            else {

                mCreateElement('i', {
                    'class': 'sprite-fm-mono icon-transfer in-progress'
                }, statusParentNode);
            }

            mCreateElement('span', {'class': 'in-progress'}, statusParentNode).textContent = l.updating_status;
        },

        blockedSyncs(syncData, statusParentNode, isDeviceCard) {

            const errorMessage = errorMessages[syncData.errorState];
            let status = l.blocked_status; // Blocked

            // Expired account status
            if (syncData.errorState === 10) {
                status = l.expired_account_state;
            }
            // Error status
            else if (errorMessage) {
                status = l[1578];
            }

            mCreateElement('i', {'class': 'sprite-fm-mono error icon-close-component'}, statusParentNode);
            mCreateElement('span', {'class': 'error'}, statusParentNode).textContent = status;

            // Show error icon with a tooltip
            if (!isDeviceCard && errorMessage) {

                mCreateElement('i', {
                    'class': 'sprite-fm-mono icon-info-filled tip-icon simpletip',
                    'data-simpletip': errorMessage,
                    'data-simpletip-class': 'backup-tip',
                    'data-simpletipposition': 'top',
                    'data-simpletipoffset': 2
                }, statusParentNode);
            }
        },

        offlineSyncs(syncData, statusParentNode, isDeviceCard) {
            const daysNum = 7; // Max Offline days to show warning

            // Show warning icon if last heartbeat was > 'daysNum' days ago
            if (isDeviceCard &&
                (syncData.currentDate - syncData.lastHeartbeat * 1000) / (1000 * 3600 * 24) >= daysNum) {

                mCreateElement('i', {
                    'class': 'sprite-fm-uni icon-hazard simpletip',
                    'data-simpletip': mega.icu.format(l.offline_device_tip, daysNum),
                    'data-simpletipposition': 'top',
                    'data-simpletipoffset': 2
                }, statusParentNode);
            }
            mCreateElement('i', {'class': 'sprite-fm-mono icon-offline'}, statusParentNode);
            mCreateElement('span', undefined, statusParentNode).textContent = l[5926];
        }
    };

    return new class {

        constructor() {

            this.data = []; // Formatted API response data
            this.deviceCardStates = {}; // Saved Expanded/Selected device states, paginator value
            this.dn = {};
            this.lastupdate = 0; // Last API request date
            this.selectedSync = false; // Selected backup/sync id, if any
            this.$fmHolder = $('.fmholder', 'body');
            this.$backupWrapper = $('.fm-right-block.backup', this.$fmHolder);
            this.$leftPane = $('.content-panel.backup-center', this.$fmHolder);
            this.$leftPaneBtns = $('.js-lpbtn', this.$leftPane);
            this.$loader = $('.js-bc-loader', this.$backupWrapper);
            this.$emptyBlock = $('.backup-center.empty-section', this.$backupWrapper);
            this.$contentBlock = $('.backup-center.content-block', this.$backupWrapper);
        }

        /**
         * Get device names list from u_attr
         * @returns {void}
         */
        async getDevicesData() {

            const res = await Promise.resolve(mega.attr.get(u_handle, 'dn', false, true)).catch(nop);

            if (typeof res === 'object') {

                // Decode the 8 bit chars in the string to a UTF-8 byte array then
                // convert back to a regular JavaScript String (UTF-16)
                this.dn = mega.attr.decodeObjectValues(res) || {};
            }

            if (d) {
                console.log('Devices names:');
                console.log(this.dn);
            }
        }

        /**
         * Add folders that exist in My Backups, but there is no sync data in API
         * @returns {void}
         */
        async getStoppedBackups() {

            const backups = M.tree[M.BackupsId];

            if (typeof backups !== 'object') {
                return false;
            }

            for (const h in backups) {

                const folders = M.tree[h];

                if (!folders) {
                    continue;
                }

                const handles = Object.keys(folders);
                await dbfetch.geta(handles);

                const id = M.d[h].devid || M.d[h].drvid;
                const i = this.data.findIndex(e => e.device === id);

                if (i > -1) {

                    const activeBackups = this.data[i].folders || [];
                    const ids = new Set(activeBackups.map(d => d.h));
                    const stoppedBackups = Object.values(folders).filter(d => !ids.has(d.h));

                    if (stoppedBackups) {
                        this.data[i].folders = [...activeBackups, ...stoppedBackups];
                    }
                }
                else {

                    if (!this.deviceCardStates[id]) {

                        this.deviceCardStates[id] = {};
                    }

                    this.data.push({
                        device: id,
                        folders: Object.values(folders),
                        handle: M.d[h].p,
                        t: 5
                    });
                }
            }
        }

        /**
         * Create an array with deviceIds and corresponding backups/syncs data
         * @param {Array} res Array of all backup folders from API
         * @returns {Array} Array of devices and corresponding syncs
         */
        formatData(res) {

            const formattedData = [];

            for (let i = 0; i < res.length; i++) {

                const n = M.getNodeByHandle(res[i].h);

                // Check if such device already exists
                const devIndex = formattedData.findIndex(a => a.device === res[i].d);

                // If such Device already exists in Array
                if (devIndex > -1) {

                    formattedData[devIndex].folders.push(res[i]);

                    // Reset the Parent folder handle if at least one folder is not a backup
                    if (res[i].t !== 5) {
                        formattedData[devIndex].handle = '';
                    }

                    // Set "Backup" type if device contains Sync folders and Backups
                    // If there is no device name in u_attr, we will set Backup parent folder name later
                    formattedData[devIndex].type = Math.max(formattedData[devIndex].type, res[i].t);
                }
                else {

                    // Create device states key to keep Expanded/Selected states and paginator value
                    if (!this.deviceCardStates[res[i].d]) {

                        this.deviceCardStates[res[i].d] = {};
                    }

                    formattedData.push({
                        device: res[i].d,
                        handle: res[i].t === 5 && n.p ? n.p : '', // Set parent node handle if it's a Backup folder
                        folders: [res[i]],
                        type: res[i].t
                    });
                }
            }

            return formattedData;
        }

        /**
         * Get Device list with backup/sync folders data
         * @param {Boolean} force True to update data without time limit
         * @returns {Promise} Promise that resolve once process is done.
         */
        async getData(force) {

            this.lastupdate = Date.now();

            const {result: res} = await api.req({a: 'sf'});

            if (d) {
                console.log('Backup/sync folders API response: sf ->');
                console.log(res);
            }

            if (Array.isArray(res) && res.length) {

                const uniqueHandles = res.map(a => a.h)
                    .filter((val, i, self) => self.indexOf(val) === i);

                await dbfetch.geta(uniqueHandles);

                // Set an array of objects with device IDs and corresponding sync/backup data
                this.data = this.formatData(res);
            }
            else {

                this.data = [];
            }
        }

        /**
         * Open MEGAsync if it's installed or Show necessary dialog
         * @returns {void}
         */
        addNewBackup() {

            megasync.isInstalled((err, is) => {

                if (!err && is) {

                    megasync.megaSyncRequest({a: "ab", u: u_handle}, (ev, res) => {

                        // TODO: Remove the condition when no old versions left on users devices
                        if (res === -2 && is.v && parseFloat(is.v) < 4.8) {

                            msgDialog(
                                `confirmation:!^${l[20826]}!${l[1597]}`,
                                l[23967],
                                l.outdated_app_ver,
                                undefined,
                                (e) => {

                                    if (!e || typeof megasync === 'undefined') {
                                        return false;
                                    }
                                    open(
                                        megasync.getMegaSyncUrl() || 'https://mega.io/desktop',
                                        '_blank',
                                        'noopener,noreferrer'
                                    );
                                }
                            );
                        }
                        // Invalid user handle
                        else if (res === -2) {

                            msgDialog('info', l[23967], l[200]);
                        }
                        // Wrong user
                        else if (res === -11) {

                            msgDialog('info', l[23967],l.account_mismatch_info);
                        }
                    }, () => {

                        // MEGAsync is not running
                        msgDialog('info', l[23967], l[23967], l.empty_bakups_info);
                    });
                }
                else {

                    dlmanager.showMEGASyncOverlay();
                }
            });
        }

        /**
         * Stop Sync/Backup
         * @param {String} id Sync id
         * @param {String} h Folder handle
         * @param {String} target Target folder handle
         * @returns {Promise} Promise that resolve once process is done
         */
        async stopSync(id, h, target) {

            if (M.isInvalidUserStatus()) {
                return;
            }

            const node = M.getNodeByHandle(h);

            // If `id` is not a folder handle, stop the sync/backup
            if (id && id !== h) {
                const {result} = await api.req({a: 'sr', id: id});

                if (d) {
                    console.log(`Remove backup/sync response: sr -> ${result}`);
                }
            }

            if (node) {

                // Set `sds` attr to make sure that SDK will try to clear heartbeat record too
                if (id && id !== h) {
                    const sds = node.sds ? `${node.sds},${id}:8` : `${id}:8`;
                    await api.setNodeAttributes(node, {sds});
                }

                // Backup/stopped backup folder
                if (M.getNodeRoot(node.h) === M.InboxID) {

                    // Move backup to target folder
                    if (target) {

                        await M.moveNodes([h], target, 3);
                    }
                    // Remove
                    else {

                        await M.safeRemoveNodes([h]);
                    }
                }
            }
            await this.renderContent(true);
        }

        /**
         * Show Stop Sync/Backup confirmation dialog
         * @param {Boolean} isBackup Change wording for backups
         * @returns {void}
         */
        showStopConfirmationDialog(isBackup) {

            if (!$.selected.length || !this.selectedSync
                || this.selectedSync.nodeHandle !== $.selected[0]) {

                return false;
            }

            let type = `confirmation:!^${ l.stop_syncing_button}!${l[1597]}`;
            let title = l.stop_syncing_button;
            let info = l.stop_syncing_info;

            if (isBackup) {
                type = 'confirmation';
                title = l.stop_backup_header;
                info = '';
            }

            msgDialog(
                type,
                l[882],
                title,
                info,
                (e) => {

                    if (!e) {
                        return false;
                    }

                    loadingDialog.pshow();

                    this.stopSync(this.selectedSync.id, this.selectedSync.nodeHandle)
                        .then(nop)
                        .catch((ex) => {
                            msgDialog('warninga', l[135], l[47], ex);
                        })
                        .finally(() => {

                            loadingDialog.phide();
                        });
                });
        }

        /**
         * Show Stop Backup dialog
         * @returns {void}
         */
        showStopBackupDialog() {

            if (!$.selected.length || !this.selectedSync
                || this.selectedSync.nodeHandle !== $.selected[0]) {

                return false;
            }

            // Show single confirmation dialog is there is not folder node
            if (!M.d[this.selectedSync.nodeHandle]) {

                this.showStopConfirmationDialog(true);
                return;
            }

            const $backupDialog = $('.mega-dialog.stop-backup', '.mega-dialog-container');
            const $radioWrappers = $('.radio-button', $backupDialog);
            const $radioButtons = $('input[name="stop-backup"]', $backupDialog);
            const $input = $('.js-path-input input', $backupDialog);
            const $changePathButton = $('.js-change-path', $backupDialog);
            const $confirmButton = $('.js-confirm', $backupDialog);
            const $closeButton = $('.js-close', $backupDialog);
            let inputValue = `${l[18051]}/`;
            let target = M.RootID;

            $radioButtons.prop('checked', false);
            $radioWrappers.removeClass('radioOn').addClass('radioOff');
            $changePathButton.addClass('disabled');
            $confirmButton.addClass('disabled');
            $input.val(inputValue);

            $closeButton.rebind('click.closeDialog', () => {

                closeDialog();
            });

            $radioButtons.rebind('change.selectAction', (e) => {

                const $this = $(e.target);

                $radioWrappers.removeClass('radioOn').addClass('radioOff');
                $this.parent().removeClass('radioOff').addClass('radioOn');

                if ($this.val() === '0') {
                    $changePathButton.removeClass('disabled');
                }
                else {
                    $changePathButton.addClass('disabled');
                }

                $confirmButton.removeClass('disabled');
            });

            $changePathButton.rebind('click.changePath', (e) => {

                if ($(e.currentTarget).hasClass('disabled')) {

                    return false;
                }

                closeDialog();

                selectFolderDialog('move')
                    .then((folder) => {
                        folder = folder || target;

                        M.safeShowDialog('stop-backup', $backupDialog);
                        return folder === M.RootID ? folder : dbfetch.get(folder).then(() => folder);
                    })
                    .then((folder) => {
                        target = folder;
                        $input.val(M.getPath(folder).reverse().map(h => M.getNameByHandle(h)).join('/'));
                    })
                    .catch(tell);
            });

            $confirmButton.rebind('click.stopBackup', (e) => {

                if ($(e.currentTarget).hasClass('disabled') || !this.selectedSync) {

                    return false;
                }

                const deleteFolder = $('input:checked', $radioWrappers).val();

                closeDialog();
                loadingDialog.pshow();

                this.stopSync(this.selectedSync.id, this.selectedSync.nodeHandle, deleteFolder !== '1' && target)
                    .catch(tell)
                    .finally(() => {

                        loadingDialog.phide();
                    });
            });

            M.safeShowDialog('stop-backup', $backupDialog);
        }

        /**
         * Init / update content scrolling
         * @returns {void}
         */
        scrollBlock() {

            // Init content scrolling
            const $scrollBlock = $('.content-body', this.$contentBlock);

            if ($scrollBlock.is('.ps')) {
                Ps.update($scrollBlock[0]);
            }
            else {
                Ps.initialize($scrollBlock[0]);
            }

            if (this.scrollToSelected) {

                const $scrollTo = $('tr.active, .backup-body.expanded', $scrollBlock).first();
                this.scrollToSelected = false;

                if ($scrollTo.length === 0) {
                    return false;
                }

                const scrollToOffset = $scrollTo.offset().top;
                const scrollToHeight = $scrollTo.outerHeight();
                const scrollBlockOffset = $scrollBlock.offset().top;
                const scrollBlockHeight = $scrollBlock.height();
                const scrollValue = $scrollBlock.scrollTop();

                if (scrollToOffset - scrollBlockOffset + scrollToHeight > scrollBlockHeight) {

                    $scrollBlock.scrollTop(
                        scrollToOffset - scrollBlockOffset
                            + scrollToHeight - scrollBlockHeight + scrollValue + 8
                    );
                }
            }
        }

        /**
         * Get device name
         * @param {String} deviceId Device name
         * @param {Number} syncType Device sync type
         * @param {Object} node Device Node
         * @returns {String} Device name
         */
        getDeviceName(deviceId, syncType, node) {

            // Return real device name is  device id exists is u_attr
            if (this.dn && this.dn[deviceId]) {

                return this.dn[deviceId];
            }
            // Return "Mobile" if sync is MU/CU
            else if (syncType === 3 || syncType === 4) {

                return l.my_mobile;
            }
            // Return forder name if it's a Backup
            else if (syncType === 5 && node.name) {

                return node.name;
            }

            // Return "Unknown device"
            return l.my_computer;
        }

        /**
         * Decode and decrypt an encrypted TLV values of
         * @param {String} encodedValue Encoded string
         * @returns {Object} Decoded Folder data
         */
        decodeFolderData(encodedValue) {

            let decodedValue = {};

            if (encodedValue) {

                tryCatch(() => {

                    // Try decode, decrypt, convert from TLV into a JS object
                    const urlDecodedString = base64urldecode(encodedValue);
                    const decryptedBlock = tlvstore.blockDecrypt(urlDecodedString, u_k);
                    const container = tlvstore.tlvRecordsToContainer(decryptedBlock);

                    decodedValue = mega.attr.decodeObjectValues(container);

                }, (ex) => {

                    if (d) {

                        console.error(`Failed to decrypt ${encodedValue}`, ex);
                    }
                })();
            }

            return decodedValue;
        }

        /**
         * Init Backup center pages navigator for each device is folders list contains > 10
         * @returns {void}
         */
        initPagesNavigator() {

            const $backups = $('.backup-body', this.$contentBlock);

            // Slides switcher
            const switchSlide = ($backup, slide) => {

                const $navigation = $('.nav', $backup);
                const $pageNumbers = $('span', $navigation);

                // Save page value to restore after data refresh
                this.deviceCardStates[$backup.attr('data-id')].nav = slide;

                $backup.attr('data-nav',  slide);
                $pageNumbers.removeClass('active');
                $pageNumbers.filter(`[data-slide="${slide}"]`).addClass('active');
                $('i', $navigation).removeClass('disabled hidden');

                if (slide === 1) {
                    $('.prev', $navigation).addClass('hidden');
                }
                else if (slide === $('span', $navigation).length) {
                    $('.next', $navigation).addClass('disabled');
                }

                $('.data-table', $backup).addClass('hidden');
                $(`.data-table:eq(${slide - 1})`, $backup).removeClass('hidden');

                this.scrollBlock();
            };

            // Populate nav buttons and select a slide
            for (let i = 0; i < $backups.length; i++) {

                const $currentBackup = $($backups[i]);
                const $foldersLists = $('.data-table', $currentBackup);
                const $navigation = $('.nav', $currentBackup).text('');
                const foldersNum = $foldersLists.length;
                const savedSlide = $currentBackup.attr('data-nav') || 1;
                let navPages = null;

                // Create navigation bar
                if (foldersNum > 1) {

                    // Prev/Next buttons and pages wrapper
                    mCreateElement('i', {'class': 'sprite-fm-mono icon-arrow-right prev hidden'}, $navigation[0]);
                    navPages = mCreateElement('div', {'class': 'pages'}, $navigation[0]);
                    mCreateElement('i', {'class': 'sprite-fm-mono icon-arrow-right next'}, $navigation[0]);

                    // Create Pages buttons
                    for (let j = 0; j < foldersNum; j++) {

                        mCreateElement('span', {
                            'data-slide': j + 1
                        }, navPages).textContent = j + 1;
                    }

                    // Show saved slide or first one
                    switchSlide($currentBackup, savedSlide > foldersNum ? foldersNum : parseInt(savedSlide));
                }
            }

            // Init Pages click event
            $('.pages span', $backups).rebind('click.showPage', (e) => {

                const $this = $(e.target);

                switchSlide($this.closest('.backup-body'), parseInt($this.attr('data-slide')));
            });

            // Init Prev/Next click events
            $('.nav i', $backups).rebind('click.showPage', (e) => {

                const $this = $(e.target);
                const $backup = $this.closest('.backup-body');
                let newSlide = 0;

                if ($this.hasClass('hidden') || $this.hasClass('disabled')) {
                    return false;
                }
                else if ($this.hasClass('prev')) {
                    newSlide = parseInt($('.pages span.active', $backup).attr('data-slide')) - 1;
                }
                else {
                    newSlide = parseInt($('.pages span.active', $backup).attr('data-slide')) + 1;
                }

                switchSlide($backup, newSlide);
            });
        }

        /**
         * Init Backup center collapse/expand folder lists
         * @returns {void}
         */
        initExpandCollapse() {

            const $contentWrap = $('.content-wrap', this.$contentBlock);

            $('.js-expand', $contentWrap).rebind('click.expandCollapse', (e) => {

                const $this = $(e.target);
                const $deviceCard = $this.closest('.backup-body');
                const deviceId = $deviceCard.attr('data-id');

                if ($deviceCard.hasClass('expanded')) {
                    this.deviceCardStates[deviceId].expanded = '';
                    $deviceCard.removeClass('expanded');
                }
                else {
                    $deviceCard.addClass('expanded');
                    this.deviceCardStates[deviceId].expanded = 'expanded';

                    // Update data
                    this.renderContent().catch(dump);
                }

                this.scrollBlock();
            });
        }

        /**
         * Show Context menu and required menu items
         * @param {Object} e Event data
         * @returns {void}
         */
        showContextMenu(e) {

            const $this = $(e.target);
            const $syncFolder = $this.closest('tr[data-handle]');
            const $deviceCard = $this.closest('.backup-body');
            let menuItems = '';

            // If target is backup folder
            if ($syncFolder.length === 1) {

                menuItems = '.properties-item';

                if (M.d[$syncFolder.attr('data-handle')]) {
                    menuItems += ', .open-cloud-item';
                }

                if (!$syncFolder.attr('data-id')) {
                    menuItems += ', .move-backup-item, .remove-backup-item';
                }
                else if ($syncFolder.attr('data-type') === '5') {
                    menuItems += ', .stopbackup-item';
                }
                else if ($syncFolder.attr('data-type') !== '3' && $syncFolder.attr('data-type') !== '4') {
                    menuItems += ', .stopsync-item';
                }
            }
            // If target is device card
            else if ($deviceCard.length === 1) {

                menuItems = '.properties-item';

                // "Show in Cloud drive" for Backups only
                if ($deviceCard.attr('data-handle') && M.d[$deviceCard.attr('data-handle')]) {

                    menuItems += ', .open-cloud-item';
                }

                // "Get more quota"
                if ($deviceCard.hasClass('overquota')) {

                    menuItems += ', .get-more-quota';
                }
            }
            // Outside area
            else {

                menuItems = '.new-backup';
            }

            // Show menu
            M.contextMenuUI(e, 8, menuItems);
        }

        /**
         * Init Backup center Context menus
         * @returns {void}
         */
        initContextMenus() {

            const $contentBody = $('.content-body', this.$contentBlock);

            // Select device card/sync folder
            $contentBody.rebind('click.backupSelect contextmenu.backupSelect', (e) => {

                const $this = $(e.target);
                const $selectedDevice = $('.backup-body.active', $contentBody);
                const $currentDevice = $this.closest('.backup-body');
                const $currentFolder = $this.closest('tr[data-handle]');

                selectionManager.clear_selection();

                // Unselect previously selected sync/backup
                this.selectedSync = false;
                $('tr', $contentBody).removeClass('active');

                // Unselect previously selected device card
                if ($selectedDevice.length) {

                    $('.backup-body.active', $contentBody).removeClass('active');
                    this.deviceCardStates[$selectedDevice.attr('data-id')].selected = '';
                }

                if ($currentFolder.length) {

                    $currentFolder.addClass('active');

                    selectionManager.add_to_selection($currentFolder.attr('data-handle'));
                    this.selectedSync = {
                        'nodeHandle': $currentFolder.attr('data-handle'),
                        'id': $currentFolder.attr('data-id') || $currentFolder.attr('data-handle'),
                        'localName': $currentFolder.attr('data-local')
                    };
                }
                // Select clicked device card
                else if ($currentDevice.length) {

                    // Show "Open in cloud drive" item if device contains backups only
                    if ($currentDevice.attr('data-handle')) {

                        selectionManager.add_to_selection($currentDevice.attr('data-handle'));
                    }
                    else {

                        const $deviceFolders = $('tr[data-handle]', $currentDevice);

                        // Get all folder handles in device for Properties dialog
                        for (let i = 0; i < $deviceFolders.length; i++) {

                            selectionManager.add_to_selection($deviceFolders[i].dataset.handle);
                        }
                    }

                    $currentDevice.addClass('active');
                    this.deviceCardStates[$currentDevice.attr('data-id')].selected = 'active ';
                }
            });

            // Right click on backups content block
            $contentBody.rebind('contextmenu.backupContext', (e) => {

                this.showContextMenu(e);
            });

            // Context icon click
            $('.js-context', $contentBody).rebind('click.backupContext', (e) => {

                this.showContextMenu(e);
            });
        }

        /**
         * Init Backup center events
         * @returns {void}
         */
        initEvents() {

            this.scrollBlock();
            this.initPagesNavigator();
            this.initExpandCollapse();
            this.initContextMenus();

            // Reinit simpletip events
            $('.simpletip', this.$contentBlock).trigger('simpletipUpdated');

            // Open Support page if the link exists
            $('.tip-icon', this.$contentBlock).rebind(
                'mouseover.showTip',
                SoonFc(() => {

                    $('.dark-direct-tooltip.backup-tip a', 'body').rebind('click.openHelp', () => {

                        window.open('https://mega.nz/support', '_blank');
                    });
                }));

            // Init New backup button
            $('.js-backup-computer', this.$contentBlock).rebind('click.openApp', () => {

                this.addNewBackup();
            });
        }

        /**
         * Get backup states and sync statuses of one or multiple folders
         * @param {Array} folders One or multiple folders data
         * @returns {Object} An Object with 'status', 'progress' and 'heartbeat' unix date
         */
        // eslint-disable-next-line complexity
        getSyncStatus(folders) {

            const syncData = {
                'currentDate': Date.now(),
                'blockedSyncs': 0,
                'disabledSyncs': 0,
                'errorState': undefined,
                'initializingSyncs': 0,
                'inProgressSyncs': 0,
                'isMobile': false,
                'lastHeartbeat': 0,
                'offlineSyncs': 0,
                'overquotaSyncs': 0,
                'pausedSyncs': 0,
                'scaningSyncs': 0,
                'stalledSyncs': 0,
                'stoppedSyncs': 0,
                'syncingPercs': 0,
                'syncsNumber': folders.length,
                'syncType': 0,
                'upToDateSyncs': 0
            };

            for (var i = 0; i < folders.length; i++) {

                let folderHeartbeat = 0;
                let timeDifference = 0;

                // Detect Mobile device
                // 0 - TYPE_TWOWAY
                // 1 - TYPE_ONEWAY_UP
                // 2 - TYPE_ONEWAY_DOWN
                // 3 - TYPE_CAMERA_UPLOAD
                // 4 - TYPE_MEDIA_UPLOAD
                // 5 - TYPE_BACKUP
                syncData.isMobile = folders[i].t === 3 || folders[i].t === 4;

                // Get folder hearbeat and save latest timestamp
                if (folders[i].hb) {

                    // Get latest backup heartbeat
                    folderHeartbeat = Math.max(
                        folders[i].hb.ts || 0,
                        folders[i].hb.lt || 0
                    );

                    // Set latest device heartbeat
                    syncData.lastHeartbeat = Math.max(
                        folderHeartbeat,
                        syncData.lastHeartbeat
                    );
                }

                // How much time has passed since the last interaction
                timeDifference = (syncData.currentDate - folderHeartbeat * 1000) / (1000 * 60);

                // Stopped backup (folder without sync data)
                if (!folders[i].s) {

                    syncData.stoppedSyncs++;
                }
                // Check Disabled/Paused backup states
                // 1- Working fine (enabled)
                // 2 - Failed (permanently disabled)
                // 3 - Temporarily disabled due to a transient situation (e.g: account blocked).
                // 3 - Will be resumed when the condition passes
                // 4 - Disabled by the user
                // 5 - Active but upload transfers paused in the SDK
                // 6 - Active but download transfers paused in the SDK
                // 7 - Active but transfers paused in the SDK
                // Blocked (permanently disabled / due to a transient situation) or Error
                else if (folders[i].s === 2 || folders[i].s === 3) {

                    syncData.blockedSyncs++;
                    syncData.errorState = folders[i].ss;

                    if (folders[i].ss === 9) {
                        syncData.overquotaSyncs++;
                    }
                }
                // Stalled
                else if (folders[i].hb && folders[i].hb.s === 6) {

                    syncData.stalledSyncs++;
                }
                // Disabled by user
                else if (folders[i].s === 4) {

                    syncData.disabledSyncs++;
                }
                // Offline Sync
                // if there is no heartbeat
                // or last CU/MU heartbeat was > 1h ago
                // or last Sync/backup heartbeat was > 30mins ago
                else if (!folderHeartbeat || syncData.isMobile && timeDifference > 60
                    || !syncData.isMobile && timeDifference > 30) {

                    // Set Offline only if MEGA folder does not exist
                    // or if MEGA folder was created > 10mins ago
                    if (!M.d[folders[i].h]
                        || (syncData.currentDate - M.d[folders[i].h].ts * 1000) / (1000 * 60) > 10) {

                        syncData.offlineSyncs++;
                    }
                }
                // Paused
                // if TWOWAY sync and any transfer type is paused
                // or if ONEWAY_UP/CU/MU/Backup and uploads/all transfers are paused
                // or if ONEWAY_DOWN and downloads/all transfers are paused
                else if (folders[i].t === 0 && folders[i].s >= 5
                    || (folders[i].t === 1 || folders[i].t >= 3) && (folders[i].s === 5 || folders[i].s === 7)
                    || folders[i].t === 2 && folders[i].s >= 6) {

                    syncData.pausedSyncs++;
                }
                // Check Sync heartbeat statuses:
                // 1 - Up to date: local and remote paths are in sync
                // 2 - The sync engine is working, transfers are in progress (will be detected by folder.hb.p)
                // 3 - The sync engine is working, e.g: scanning local folders
                // 4 - Sync is not active. A state != ACTIVE should have been sent through '''sp'''
                // 5 - Unknown status
                // 6 - Stalled: indicates the user needs to intervene due to something the sync can't decide for them
                // Up to date
                // if working fine or unrelated transfer type is paused
                // and there is no heartbeat state or Up to date/unknown/not active
                else if ((folders[i].s === 1 || folders[i].s >= 5) && (!folders[i].hb
                    || folders[i].hb && (folders[i].hb.s === 1 || folders[i].hb.s === 4))) {

                    syncData.upToDateSyncs++;
                }
                // Initalizing...
                else if (folders[i].hb && folders[i].hb.s === 5) {

                    syncData.initializingSyncs++;
                }
                // Syncing. If 'p' value exitsts in backup, then the sync engine is working
                // If it doesn't not exist, then wwe thing that backup if synced, as rest states will be filtered before
                else if (folders[i].hb && folders[i].hb.s === 2) {

                    syncData.syncingPercs = folders[i].hb.p;
                    syncData.inProgressSyncs++;
                }
                // Scanning
                else if (folders[i].hb && folders[i].hb.s === 3) {

                    syncData.scaningSyncs++;
                }
            }

            return syncData;
        }

        /**
         * Create DOM element with sync status
         * @param {Object} syncData An Object with 'status', 'progress' and 'heartbeat' unix date
         * @param {Object} statusParentNode An Element Object, representing Status parent element
         * @param {Boolean} isDeviceCard True is status required special Device card warnigs
         * @returns {void}
         */
        setSyncStatus(syncData, statusParentNode, isDeviceCard) {

            // Show syncing status: Backing up
            if (syncData.inProgressSyncs) {

                syncStatus.inProgressSyncs(syncData, statusParentNode, isDeviceCard);
            }
            // Show syncing status: Scaning
            else if (syncData.scaningSyncs) {

                mCreateElement('i', {'class': 'sprite-fm-mono icon-sync in-progress'}, statusParentNode);
                mCreateElement('span', {'class': 'in-progress'}, statusParentNode).textContent = l.scanning_status;
            }
            // Show syncing status: Initilizing
            else if (syncData.initializingSyncs) {

                mCreateElement('i', {'class': 'sprite-fm-mono icon-sync in-progress'}, statusParentNode);
                mCreateElement('span', {'class': 'in-progress'}, statusParentNode).textContent = l.initailizing_status;
            }
            // Show sync status: Paused
            else if (syncData.pausedSyncs) {

                mCreateElement('i', {'class': 'sprite-fm-mono icon-pause'}, statusParentNode);
                mCreateElement('span', undefined, statusParentNode).textContent = l[1651];
            }
            // Show backup state: Overquota
            else if (syncData.overquotaSyncs) {

                mCreateElement('i', {
                    'class': 'sprite-fm-mono error icon-cloud-storage-over-quota'
                }, statusParentNode);
                mCreateElement('span', {'class': 'error'}, statusParentNode).textContent = l.out_of_quota;
            }
            // Show backup state: Blocked due to error/Temporary blocked
            else if (syncData.blockedSyncs) {

                syncStatus.blockedSyncs(syncData, statusParentNode, isDeviceCard);
            }
            // Show backup state: Stalled
            else if (syncData.stalledSyncs) {

                mCreateElement('i', {
                    'class': 'sprite-fm-mono error icon-close-component'
                }, statusParentNode);
                mCreateElement('span', {'class': 'error'}, statusParentNode).textContent =
                    mega.icu.format(l.stalled_sync_state, isDeviceCard ? syncData.stalledSyncs : 1);
            }
            // Show sync status: Up to date
            else if (syncData.upToDateSyncs) {

                mCreateElement('i', {'class': 'sprite-fm-mono icon-check success'}, statusParentNode);
                mCreateElement('span', {
                    'class': 'success'
                }, statusParentNode).textContent = l.up_to_date_status;
            }
            // Show sync status: Offline
            else if (syncData.offlineSyncs) {

                syncStatus.offlineSyncs(syncData, statusParentNode, isDeviceCard);
            }
            // Show backup state: Disabled by user
            else if (syncData.disabledSyncs) {

                mCreateElement('i', {
                    'class': 'sprite-fm-mono warning icon-disable'
                }, statusParentNode);
                mCreateElement('span', {'class': 'warning'}, statusParentNode).textContent = l.backup_disabled_by_user;

                if (!isDeviceCard) {

                    mCreateElement('i', {
                        'class': 'sprite-fm-mono icon-info-filled tip-icon simpletip',
                        'data-simpletip': syncData.isMobile ? l.disabled_mobile_sync_tip : l.disabled_sync_tip,
                        'data-simpletip-class': 'backup-tip',
                        'data-simpletipposition': 'top',
                        'data-simpletipoffset': 2
                    }, statusParentNode);
                }
            }
            // Show stopped backup state
            else if (syncData.stoppedSyncs) {

                mCreateElement('i', {
                    'class': 'sprite-fm-mono icon-clear'
                }, statusParentNode);
                mCreateElement('span', undefined, statusParentNode).textContent = l.backup_stopped;
            }
        }

        /**
         * Populate device list
         * @returns {void}
         */
        populateDevices() {

            const $contentWrap = $('.content-wrap', this.$contentBlock).text('');

            this.$emptyBlock.addClass('hidden');
            this.$contentBlock.removeClass('hidden');

            for (let i = 0; i < this.data.length; i++) {

                const syncStatuses = this.getSyncStatus(this.data[i].folders);
                const deviceHandle = this.data[i].handle || '';
                const n = M.getNodeByHandle(deviceHandle);
                const foldersNumber = this.data[i].folders.length;
                const savedDeviceStates = this.deviceCardStates[this.data[i].device] || {};
                let deviceState = '';
                let deviceName = '';
                let deviceNode = null;
                let headerNode = null;
                let nameNode = null;
                let infoNode = null;
                let foldersInfoNode = null;
                let statusWrapperNode = null;
                let statusInfoNode = null;

                // Keep expanded state after update
                if (savedDeviceStates.expanded) {
                    deviceState += ` ${savedDeviceStates.expanded}`;
                }

                // Keep selected state after update
                if (savedDeviceStates.selected) {
                    deviceState += ` ${savedDeviceStates.selected}`;
                }

                // Ovequota state to show correct context menu
                if (syncStatuses.overquotaSyncs) {
                    deviceState += ' overquota';
                }

                // Backup container with device id and folder handle
                deviceNode = mCreateElement('div', {
                    'class': `backup-body${deviceState}`,
                    'data-id': this.data[i].device,
                    'data-handle': deviceHandle,
                    'data-nav': savedDeviceStates.nav || ''
                }, $contentWrap[0]);

                // Backup container header
                headerNode = mCreateElement('div', {'class': 'header'}, deviceNode);

                // Device name container
                nameNode = mCreateElement('div', {'class': 'name'}, headerNode);

                // Get device name
                deviceName = this.getDeviceName(this.data[i].device, this.data[i].type, n);

                // Show Device icon
                mCreateElement('i', {
                    'class':`medium-file-icon ${deviceIcon(deviceName, this.data[i].type)}`
                }, nameNode);

                // Show Device name
                mCreateElement('span', {
                    'title': deviceName
                }, nameNode).textContent = deviceName;

                // Backup info container
                infoNode = mCreateElement('div', {'class': 'info'}, headerNode);

                // Backup folders info container
                foldersInfoNode = mCreateElement('div', {'class': 'info-cell folders-info'}, infoNode);

                // Show Number of backups
                mCreateElement('span', {'class': 'high'}, foldersInfoNode).textContent =
                    foldersNumber === 1 ? l[834] : l[832].replace('[X]', foldersNumber);

                // Show Warning icon if any folder have issues
                if (syncStatuses.disabledSyncs) {

                    mCreateElement('i', {
                        'class': 'sprite-fm-uni icon-hazard simpletip',
                        'data-simpletip': mega.icu.format(l.device_attention_tip, syncStatuses.disabledSyncs),
                        'data-simpletipposition': 'top',
                        'data-simpletipoffset': 2
                    }, foldersInfoNode);
                }

                // Sync status wrapper
                statusWrapperNode = mCreateElement('div', {'class': 'info-cell status-info'}, infoNode);

                // Sync status block
                statusInfoNode = mCreateElement('div', {'class': 'status'}, statusWrapperNode);
                this.setSyncStatus(syncStatuses, statusInfoNode, true);

                // Show Expand and Context icons
                mCreateElement('i', {
                    'class': 'control sprite-fm-mono icon-arrow-down js-expand'
                }, statusWrapperNode);
                mCreateElement('i', {
                    'class': 'control sprite-fm-mono icon-options js-context'
                }, statusWrapperNode);

                // Create folders list wrapper
                mCreateElement('div', {'class': 'bc-item-list'}, deviceNode);

                // Populate folders list for current device
                this.populateFolders(this.data[i]);
            }
        }

        /**
         * Populate folder list
         * @param {Object} deviceNode An Element Object, representing Device card element
         * @returns {void}
         */
        // eslint-disable-next-line complexity
        populateFolders(deviceNode) {

            const $deviceWrap = $(`.backup-body[data-id="${deviceNode.device}"]`, this.$contentBlock);
            const $foldersList = $('.bc-item-list', $deviceWrap).text('');
            let tableNode = null;
            let tableHeaderNode = null;
            let folderRowNode = null;
            let folderCellNode = null;
            let folderInfoNode = null;
            let foldersCounter = 0;
            let pagesCounter = 1;

            // Create table and static header
            const createFoldersTable = () => {

                tableNode = mCreateElement('table', {'class': 'data-table minimal'}, $foldersList[0]);
                tableHeaderNode = mCreateElement('tr', undefined, tableNode);
                mCreateElement('th', undefined, tableHeaderNode); // Folder name without label
                mCreateElement('th', undefined, tableHeaderNode).textContent = l[488]; // Status
                mCreateElement('th', undefined, tableHeaderNode)
                    .textContent = l.last_updated_label; // 'Last updated'
                mCreateElement('th', undefined, tableHeaderNode)
                    .textContent = l.used_storage_label; // 'Used storage'
                mCreateElement('th', undefined, tableHeaderNode); // Context icon without label
            };

            createFoldersTable();

            for (let i = 0; i < deviceNode.folders.length; i++) {

                const folder = deviceNode.folders[i];
                const decodedFolderName = this.decodeFolderData(folder.e);
                const syncStatus = this.getSyncStatus([folder]);
                const n = M.getNodeByHandle(folder.h);
                const folderName = folder.id && decodedFolderName.bn && !syncStatus.isMobile || !n.name ?
                    decodedFolderName.bn : n.name;
                const isSelected = folder.id && folder.id === this.selectedSync.id
                        || folder.h === this.selectedSync.id;
                let icon = '';

                // Create new table if > 10 folders for pages navigator
                if (foldersCounter === 10) {

                    foldersCounter = 0;
                    pagesCounter++;
                    createFoldersTable();
                }

                foldersCounter++;

                // Create table row for current folder
                folderRowNode = mCreateElement('tr', {
                    'class': isSelected ? 'active' : '',
                    'data-handle': folder.h,
                    'data-id': folder.id || '',
                    'data-local': folderName,
                    'data-type': folder.id ? folder.t : ''
                }, tableNode);

                if (folder.id && folder.t === 5) {
                    icon = ' folder-backup';
                }
                else if (folder.id && folder.t !== 3 && folder.t !== 4) {
                    icon = ' folder-sync';
                }

                // Show folder name
                folderCellNode = mCreateElement('td', undefined, folderRowNode);
                folderInfoNode = mCreateElement('div', {'class': 'item-name'}, folderCellNode);
                // sprite-fm-uni icon-folder-24 for vector
                mCreateElement('i', {'class': `transfer-filetype-icon folder ${icon}`}, folderInfoNode);
                mCreateElement('span', {
                    'title': this.decodeFolderData(folder.l).lf || ''
                }, folderInfoNode).textContent = folderName;

                // Create folder Status cell
                folderCellNode = mCreateElement('td', undefined, folderRowNode);
                folderInfoNode = mCreateElement('div', {'class': 'status'}, folderCellNode);

                // Show sync status
                this.setSyncStatus(syncStatus, folderInfoNode);

                // Create Last Updated cell
                folderCellNode = mCreateElement('td', undefined, folderRowNode);

                // Set last interation date
                if (syncStatus.lastHeartbeat) {
                    folderCellNode.textContent = time2date(syncStatus.lastHeartbeat);
                }

                // Create Used Storage cell
                folderCellNode = mCreateElement('td', undefined, folderRowNode);

                // Show Used storage
                folderCellNode.textContent = n.tb ? bytesToSize(n.tb) : bytesToSize(0);

                // Show Context menu icon
                folderCellNode = mCreateElement('td', undefined, folderRowNode);
                mCreateElement('i', {
                    'class': 'control sprite-fm-mono icon-options js-context'
                }, folderCellNode);

                // Show page with selected folder
                if (isSelected) {
                    $deviceWrap.attr('data-nav', pagesCounter);
                }
            }

            // Create navigation wrapper
            mCreateElement('div', {'class': 'nav'}, $foldersList[0]);
        }

        /**
         * Render Show Empty screen
         * @returns {void}
         */
        renderEmptyScreen() {

            this.$emptyBlock.removeClass('hidden');
            this.$contentBlock.addClass('hidden');

            // Create a backup button
            $('.desktop a', this.$emptyBlock).rebind('click.openApp', (e) => {
                e.preventDefault();
                this.addNewBackup();
            });

            // Open mobile apps page
            $('.mobile a', this.$emptyBlock).rebind('click.openMobile', (e) => {
                e.preventDefault();
                mega.redirect('mega.io', 'mobile', false, false, false);
            });
        }

        /**
         * Populate device list or show Empty screen
         * @returns {void}
         */
        populateData() {

            if (d) {
                console.log('All Backed up devices:');
                console.log(this.data);
            }

            this.$loader.addClass('hidden');

            // Show a list of devices
            if (this.data.length) {

                this.populateDevices();
            }
            // Or show Empty screen
            else {

                this.renderEmptyScreen();
            }

            // Init pages navigator if needed
            this.initEvents();
        }

        /**
         * Render/rerender Backups content
         * @param {Boolean} [force] True to update data without time limit
         * @returns {Promise}
         */
        async renderContent(force) {

            if (M.currentdirid !== 'devices' || !force && this.lastupdate > Date.now() - 10000) {
                return false;
            }

            await this.getDevicesData();
            await this.getData();
            await this.getStoppedBackups();
            this.populateData();

            delay('devices:update', () => this.renderContent().catch(dump), 30000);

            if (!this.bpcListener) {
                this.bpcListener = mBroadcaster.addListener('beforepagechange', (page) => {

                    if (page.includes('devices')) {
                        return;
                    }

                    delay.cancel('devices:update');
                    this.lastupdate = 0;
                    this.selectedSync = false;
                    mBroadcaster.removeListener(this.bpcListener);
                    delete this.bpcListener;
                });
            }
        }

        /**
         * Update and render Backups content or show Empty block when BC is opened
         * @returns {void}
         */
        async render() {

            // Hide both Content and Empty screen till we get any data
            this.$emptyBlock.addClass('hidden');
            this.$contentBlock.addClass('hidden');
            this.$loader.removeClass('hidden');

            // Rended Content or Empty screen
            await this.renderContent().catch(dump);
        }

        /**
         * Show Backup Center section
         * @returns {void}
         */
        openSection() {

            // Prevent ephemeral session to access
            if (u_type === 0) {

                msgDialog('confirmation', l[998], `${l[17146]} ${l[999]}`, l[1000], (e) => {
                    if (e) {
                        loadSubPage('register');
                        return false;
                    }
                    loadSubPage('fm');
                });

                return false;
            }

            // Show devices section and hide rest
            $('.fm-right-block, .fm-right-files-block, .section.conversations,'
                + '.fm-right-account-block', '.fmholder').addClass('hidden');
            this.$backupWrapper.removeClass('hidden');

            // Render left tree pane
            M.onSectionUIOpen('devices');
            this.$leftPaneBtns.removeClass('active');
            this.$leftPaneBtns.filter('.devices').addClass('active');

            M.initShortcutsAndSelection(this.$backupWrapper);

            // Update and render Devices content or show Empty block
            this.render();
        }

        /**
         * Show Backup folder in BC
         * @param {String} h Backup folder handle
         * @returns {void}
         */
        showFolder(h) {

            if (!h || M.getNodeRoot(h) !== M.InboxID) {
                return false;
            }

            const node = M.d[h];
            let id = node.devid || node.drvid;
            let backupHandle = '';
            this.scrollToSelected = true;

            if (!id && node.h !== M.BackupsId) {

                const path = M.getPath(node.h);

                for (i = 0; i < path.length; i++) {

                    const {p} = M.d[path[i]];

                    id = M.d[p].devid || M.d[p].drvid;

                    if (id) {
                        backupHandle = path[i];
                        break;
                    }
                }
            }

            if (id) {
                this.deviceCardStates[id] = {
                    'expanded': 'expanded',
                    'selected': 'active '
                };
            }

            if (backupHandle) {
                this.selectedSync = {
                    'id': backupHandle
                };
            }

            M.openFolder('devices', true);
        }

        ackVaultWriteAccess(h, req) {
            if (h && this.selectedSync.nodeHandle === h) {
                assert(req.a === 'm' || req.a === 'a' || req.a === 'd');
                req.vw = 1;
            }
            else if (d) {
                console.error('Unexpected Vault-write attempt.', h, req);
            }
        }
    };
});
