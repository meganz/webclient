/**
 * Device Centre UI
 *
 * Codebase to interact with device centre UI
 */
lazy(mega.devices, 'ui', () => {
    'use strict';

    const {
        uiElems: {
            /**
             * {Header} Header - Header UI element
             */
            Header,

            /**
             * {Shimmer} Shimmer - Shimmer UI element
             */
            Shimmer,

            /**
             * {Notification} Notification - Notification UI element
             */
            Notification,
        },
        /**
         * {String} rootId - root ID of the device centre UI
         */
        rootId,
    } = mega.devices;

    /**
     * {Number} refreshMillis - update interval in milliseconds
     */
    const refreshMillis = 3e4;

    /**
     * {String} refreshEventName - refresh event name
     */
    const refreshEventName = 'device-centre:refresh';

    /**
     * {Number} maxDeviceNameLength - validation check, maximum device name length
     */
    const maxDeviceNameLength = 32;

    /**
     * {Object} renderSection - contains UI rendering sections related constants
     */
    const renderSection = {
        cloudDrive: 'cloud-drive',
        devices: 'device-centre-devices',
        deviceFolders: 'device-centre-folders',
    };

    /**
     * {jQuery} $dcFilterChipsWrapper - Contains the filter chips to filter devices
     */
    const $dcFilterChipsWrapper = $('.dc-filter-chips-wrapper', '.fm-right-files-block');

    /**
     * {Class} FilterChipComponent - Used to extend the device centre filter chips
     */
    const { FilterChipComponent } = mega.ui.mNodeFilter;

    // Currently, for a particular view, only one filter chip is shown in DC.
    // TODO: If multiple chips are to be shown, selectedFilters.data will be an array of objects

    /**
     * Represents the selected filters for the Device Centre filter chips
     * @typedef {Object} selectedFilters
     * @property {number} value - The current filter value.
     * @property {?Object} data - Filter-related data, like the name and index, `null` if none is selected.
     * @property {boolean} manual - Indicates whether the filter was manually selected.
     *                              If `true`, the selection will be respected when we reinitialize.
     */
    const selectedFilters = {
        value: 0,
        data: null,
        manual: false,
    };

    /**
     * {Object} filters - options and values related to device centre filter chips
     */
    const filters = {
        deviceactivity: {
            title: l.dc_fchips_all_devices,
            selection: false,
            shouldShow() {
                const {ui} = mega.devices;
                return ui.getRenderSection() === renderSection.devices
                    && M.dcd
                    && !Object.keys(M.dcd)
                        .every(h => ui.isActive(M.dcd[h]));
            },
            get defaultOption() {
                return this.menu.findIndex(opt => opt.defaultOption);
            },
            // eid: 99941,
            match(n) {
                return n.status && this.selection(n.status.lastHeartbeat);
            },
            menu: [
                {
                    defaultOption: true,
                    label: l.dc_fchips_active_devices,
                    get data() {
                        return (hb) => mega.devices.data.isActive(hb);
                    },
                    // eid: 99942
                },
                {
                    tooltip: l.dc_fchips_inactive_devices_tooltip,
                    label: l.dc_fchips_inactive_devices,
                    get data() {
                        return (hb) => !mega.devices.data.isActive(hb);
                    },
                    // eid: 99943
                },
            ]
        },
        folderactivity: {
            title: "All folders",
            selection: false,
            shouldShow() {
                const {ui} = mega.devices;
                const {device} = ui.getCurrentDirData();
                return ui.getRenderSection() === renderSection.deviceFolders
                    && device
                    && !Object.keys(device.folders).every(h => ui.isActive(device.folders[h]));
            },
            get defaultOption() {
                return this.menu.findIndex(opt => opt.defaultOption);
            },
            // eid: 99941,
            match(n) {
                return n.status && this.selection(n.status.lastHeartbeat);
            },
            menu: [
                {
                    defaultOption: true,
                    label: l.dc_fchips_active_folders,
                    get data() {
                        return (hb) => mega.devices.data.isActive(hb);
                    },
                    // eid: 99942
                },
                {
                    tooltip: l.dc_fchips_inactive_folders_tooltip,
                    label: l.dc_fchips_inactive_folders,
                    get data() {
                        return (hb) => !mega.devices.data.isActive(hb);
                    },
                    // eid: 99943
                },
            ]
        }
    };

    /**
     * Filter chip component for Device Centre
     */
    class DCFilterChip extends FilterChipComponent {
        /**
         * Create a FilterChip.
         * @param {String} name static filter identifier.
         */
        constructor(name) {
            super(name, 'dc', $dcFilterChipsWrapper, filters, selectedFilters);
        }

        /**
         * Sets the options for the filter chip and updates the checkmark for each option.
         * @param {Array} list - The list of options
         */
        set options(list) {
            super.options = list;

            for (let i = 0; i < this._options.length; i++) {

                if (list[i].tooltip) {
                    const $tooltip = this.$qMarkTooltipTemplate.clone();
                    $tooltip.attr('data-simpletip', list[i].tooltip);
                    $tooltip.removeClass('tooltip-question-mark-template hidden');
                    $('div', $(this._options[i].el)).first().safeAppend($tooltip.prop('outerHTML'));
                }
            }
        }

        /**
         * Handles the selection of an item.
         * @param {number} index - The index of the selected item.
         * @param {Object} item - The selected item object.
         * @param {Function} clickFn - Onclick function, not used here.
         * @param {Boolean} [preventReload] - Prevents reload after selection.
         * @param {Boolean} [autoSelected] - Set to `true` when its not manually selected through the UI.
         *
         * @returns {undefined}
         */
        onItemSelect(index, item, clickFn, preventReload, autoSelected) {
            const {name} = this;
            selectionManager.clear_selection();
            selectedFilters.data = freeze({
                name,
                index,
            });
            selectedFilters.manual = !autoSelected;
            super.onItemSelect(index, item, clickFn, preventReload);
        }

        /**
         * Handles the automatic selection of an item (simulates clicking an option from the filter dropdown).
         * @param {number} index - The index of the selected item.
         * @param {Boolean} [preventReload] - Prevents reload after selection.
         * @param {Boolean} [isManualSelection] - Set to `true` when user interaction is involved.
         *
         * @returns {undefined}
         */
        autoSelect(index, preventReload, isManualSelection) {
            this.onItemSelect(index, this._options[index], nop, preventReload, !isManualSelection);
        }
    }

    /**
     * DesktopAppFeature for Device Centre
     * TODO: REMOVE INDIVIDUAL VERSION CHECKS AND USE v5.3.0 AS BASE REQUIREMENT FOR BOTH
     * TODO: ADD CHECK BEFORE ERROR CODE HANDLING IS DONE
     */
    class DesktopAppFeature {
        constructor(config) {
            /**
             * {String} pauseMenuItemSelector - Query selector of the pause menu item
             */
            this.pauseMenuItemSelector = '.togglepausesync-item';

            /**
             * {Object<Object>} config - instance configuration
             * {String} config.requests - request payloads to send to the desktop app
             * {String} config.options - behavior options
             * {String} config.options.handleInvalidUser - whether has to handle invalid user error
             * {Object<String, Number>} config.sdsCodes - SDS codes to trigger SDK updates
             */
            this.config = {
                megaDesktopUrl: 'https://mega.io/desktop',
                minVersion: 5.2,
                err: {
                    issueFound: -2,
                    wrongUserSync: -9,
                    wrongUserBackup: -11,
                },
                requests: config.requests || {},
                options: {
                    handleInvalidUser: config.options && config.options.handleInvalidUser !== undefined ?
                        config.options.handleInvalidUser :
                        false
                },
                sdsCodes: config.sdsCodes || {},
                event: {
                    backup: {
                        remove: 500617
                    },
                    sync: {
                        remove: 500618
                    },
                    ...config.event
                },
                appPromoPageNum: config.appPromoPageNum,
            };
        }

        /**
         * Triggers Desktop App dialog to add backup or sync folder
         * @returns {void}
         */
        add() {
            megasync.isInstalled((err, is) => {
                if (this.config.event.add) {
                    eventlog(this.config.event.add);
                }
                if (!err && is) {
                    if (typeof is === 'object' && is.v
                        && (Number.isNaN(parseFloat(is.v)) || parseFloat(is.v) < this.config.minVersion)) {
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
                                    megasync.getMegaSyncUrl() || this.config.megaDesktopUrl,
                                    '_blank',
                                    'noopener,noreferrer'
                                );
                            }
                        );
                        return;
                    }

                    // Once version check passes, proceed with MegaSync request
                    const { config } = this;
                    const addSyncReq = config.requests.add;

                    // TODO: Once v5.9.0 is released,
                    //
                    // 1. Remove this `if` block
                    // 2. Change the request body
                    // 3. Set `config.minVersion` to `5.9`
                    if (parseFloat(is.v) >= 5.9) {
                        addSyncReq.h = null;
                        addSyncReq.u = u_handle;
                    }

                    megasync.megaSyncRequest(addSyncReq, (_, res) => {
                        // Invalid user handle
                        if (res === config.err.issueFound && config.options.handleInvalidUser) {
                            msgDialog('info', l[23967], l[200]);
                        }
                        else if (res === config.err.wrongUserBackup || res === config.err.wrongUserSync) {
                            msgDialog('info', l[23967], l.account_mismatch_info);
                        }
                    }, () => {
                        // MEGAsync is not running
                        msgDialog('info', l[23967], l[23967], l.empty_bakups_info);
                    });
                }
                else {
                    mega.ui.dcAppPromoDialog.showDialog(this.config.appPromoPageNum);
                }
            });
        }

        /**
         * Removes the selected backup/sync after showing a dialog
         * @returns {void}
         */
        async remove() {

            const {config} = this;
            const {ui} = mega.devices;
            const syncNode = ui.isCurrentPathDeviceFolder()
                ? M.currentCustomView.nodeID : false;
            const nodeHandle = $.selected[0] || syncNode;

            const {device} = ui.getCurrentDirData();
            const folder = device ? device.folders[nodeHandle] : {};

            const selectedSync = {
                nodeHandle,
                id: folder.id,
            };

            /**
             * Stop Sync/Backup
             * @param {String} id Sync id
             * @param {String} h Folder handle
             * @param {String} target Target folder handle, only for backups
             * @returns {Promise} Promise that resolve once process is done
             */
            const stopSync = async(id, h, target) => {
                if (M.isInvalidUserStatus()) {
                    return;
                }

                const node = M.getNodeByHandle(h);

                // If `id` is not a folder handle, stop the sync/backup
                if (id && id !== h) {
                    const {result} = await api.req(config.requests.remove(id));

                    if (d) {
                        console.log(`Remove backup/sync response: sr -> ${result}`);
                    }
                }

                if (node) {
                    // Set `sds` attr to make sure that SDK will try to clear heartbeat record too
                    if (id && id !== h) {
                        const sds = node.sds
                            ? `${node.sds},${id}:${config.sdsCodes.remove}`
                            : `${id}:${config.sdsCodes.remove}`;
                        await api.setNodeAttributes(node, {sds});
                    }

                    // Backup/stopped backup folder
                    if (M.getNodeRoot(node.h) === M.InboxID) {
                        return target ? M.moveNodes([h], target, 3) : M.safeRemoveNodes([h]);
                    }
                }
            };

            const refreshAfterRemoval = async(handle) => {
                const {ui} = mega.devices;
                ui.clearLastReq();

                if (ui.isCurrentPathDeviceFolder()) {
                    delay('device-centre:on-folder-removed', () => {
                        M.openFolder(`${rootId}/${device.h}`);
                    }
                    , 250);
                    return;
                }

                if (M.currentrootid === rootId) {
                    if (M.megaRender) {
                        M.megaRender.revokeDOMNode(handle, true);
                    }
                    ui.render(M.currentdirid, {isRefresh: true});
                }
            };

            const dialogs = freeze({

                /**
                 * Show backup move dialog and stop the selected backup
                 * @returns {void}
                 */
                beforeStopBackup() {

                    if (!$.selected.length && !syncNode) {
                        return false;
                    }

                    // Show single confirmation dialog is there is not folder node
                    if (!M.d[selectedSync.nodeHandle]) {

                        this.confirmRemoval(true);
                        return;
                    }

                    const $backupDialog = $('.mega-dialog.stop-backup', '.mega-dialog-container');
                    const $radioWrappers = $('.radio-button', $backupDialog);
                    const $radioButtons = $('input[name="stop-backup"]', $backupDialog);
                    const $input = $('.js-path-input input', $backupDialog);
                    const $changePathButton = $('.js-change-path', $backupDialog);
                    const $confirmButton = $('.js-confirm', $backupDialog);
                    const $closeButton = $('.js-close', $backupDialog);
                    const inputValue = `${l[18051]}/`;
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

                        if ($(e.currentTarget).hasClass('disabled') || !selectedSync) {

                            return false;
                        }

                        const deleteFolder = $('input:checked', $radioWrappers).val();

                        closeDialog();
                        loadingDialog.pshow();

                        stopSync(selectedSync.id, selectedSync.nodeHandle, deleteFolder !== '1' && target)
                            .catch(dump)
                            .finally(() => {
                                refreshAfterRemoval(selectedSync.nodeHandle);
                                loadingDialog.phide();
                            });
                    });

                    M.safeShowDialog('stop-backup', $backupDialog);

                },

                /**
                 * Show a confirmation dialog and stop the selected backup/sync
                 * @param {Boolean} isBackup - Whether it's a backup or not
                 * @returns {void}
                 */
                confirmRemoval(isBackup) {
                    if (!$.selected.length && !syncNode) {

                        return false;
                    }

                    let type = `-remove:!^${ l.stop_syncing_button}!${l[1597]}`;
                    let title = l.stop_syncing_dialog_title;
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

                            stopSync(selectedSync.id, selectedSync.nodeHandle)
                                .then(nop)
                                .catch(dump)
                                .finally(() => {
                                    refreshAfterRemoval(selectedSync.nodeHandle);
                                    loadingDialog.phide();
                                });
                        });
                }
            });

            const isBackup = ui.isBackupRelated($.selected.length ? $.selected : [nodeHandle]);
            if (isBackup) {
                eventlog(config.event.backup.remove);
                dialogs.beforeStopBackup();
            }
            else {
                eventlog(config.event.sync.remove);
                dialogs.confirmRemoval();
            }
        }

        /**
         * Pauses the selected backup/sync after showing a dialog
         * @returns {void}
         */
        async togglePause() {

            if (M.isInvalidUserStatus()) {
                return;
            }

            const {config} = this;
            const {ui} = mega.devices;
            const syncNode = ui.isCurrentPathDeviceFolder()
                ? M.currentCustomView.nodeID : false;
            const nodeHandle = $.selected[0] || syncNode;

            const {device} = ui.getCurrentDirData();
            const folder = device ? device.folders[nodeHandle] : {};

            const selectedSync = {
                nodeHandle,
                id: folder.id,
            };

            const node = M.getNodeByHandle(nodeHandle);
            const action = folder.status.pausedSyncs
                ? 'resume'
                : 'pause';

            const proceedWithTogglePause = async() => {
                await api.req(config.requests[action](selectedSync.id));
                const sds = `${selectedSync.id}:${config.sdsCodes[action]}`;
                await api.setNodeAttributes(node, {sds});

                const {ui} = mega.devices;
                ui.clearLastReq();

                if (M.currentrootid === rootId) {
                    return ui.render(M.currentdirid, {isRefresh: true});
                }
            };

            if (!folder.status.pausedSyncs && !mega.config.get('dcPause')) {
                const pauseText = folder.isBackup
                    ? l.dc_pause_backup
                    : l.dc_pause_sync;

                msgDialog(
                    `confirmation:!^${pauseText}!${l[1597]}`,
                    '',
                    pauseText,
                    l.dc_pause_sync_confirm_desc,
                    (proceed) => {
                        if (proceed) {
                            proceedWithTogglePause().catch(tell);
                        }
                    },
                    'dcPause'
                );
            }
            else {
                await proceedWithTogglePause();
            }
        }
    }

    /**
     * DeviceCentre UI instance
     */
    return new class {
        constructor() {
            /**
             * {String} gridWrapperSelector - Grid wrapper query selector
             */
            this.gridWrapperSelector = '.device-centre-grid-view';

            /**
             * {Boolean} isReady - whether UI is ready to e rendered
             */
            this.isReady = false;

            /**
             * {Boolean} isLoading - whether loading is in progress
             */
            this.isLoading = false;

            /**
             * {Number} lastReq - last time data req was made
             */
            this.lastReq = 0;

            /*
             * {String} beforePageChangeListener - The ID identifying the event
             */
            this.beforePageChangeListener = null;

            /**
             * {jQuery} $fmMain - jQuery object
             */
            this.$fmMain = $('.fm-right-files-block', '.fmholder');

            /**
             * {jQuery} $fmHeader - jQuery object
             */
            this.$fmHeaderButtons = $('.fm-header-buttons', this.$fmMain);

            /**
             * {jQuery} $gridWrapper - jQuery object
             */
            this.$gridWrapper = $(this.gridWrapperSelector, this.$fmMain);

            /**
             * {jQuery} $grids - jQuery object
             */
            this.$grid = $('.grid-scrolling-table', this.$gridWrapper);

            /**
             * {jQuery} $emptyDevices - jQuery object
             */
            this.$emptyDevices = $('.fm-empty-device-list', this.$fmMain);

            /**
             * {jQuery} $emptyFolder - jQuery object
             */
            this.$emptyFolder = $('.fm-empty-folder', this.$fmMain);

            /**
             * {jQuery} $addBackup - jQuery object
             */
            this.$addBackup = $('.fm-add-backup', this.$fmHeaderButtons);

            /**
             * {jQuery} $emptyActiveDevices - jQuery object
             */
            this.$emptyActiveDevices = $('.fm-no-active-devices', this.$fmMain);

            /**
             * {jQuery} $emptyActiveFolders - jQuery object
             */
            this.$emptyActiveFolders = $('.fm-no-active-folders', this.$fmMain);

            /**
             * {jQuery} $addSyncs - jQuery object
             */
            this.$addSyncs = $('.fm-add-syncs', this.$fmHeaderButtons);

            /**
             * {jQuery} $emptyAddActions - jQuery object
             */
            this.$emptyAddActions = $('.fm-add-sb-actions', this.$emptyDevices);

            /**
             * {jQuery} $emptyAppDLButtons - jQuery object
             */
            this.$emptyAppDLButtons = $('.fm-app-links', this.$emptyDevices);
            /**
             * {Shimmer} shimmer - Shimmer instance
             */
            this.shimmer = new Shimmer(this.$fmMain);

            /**
             * {Notification} notification - Notification instance
             */
            this.notification = new Notification(this.$fmMain);

            /**
             * {Header} header - Header instance
             */
            this.header = new Header(this.$fmMain);

            this.desktopApp = {
                /**
                 * {DesktopAppFeature} backup - DesktopAppFeature instance to handle backup
                 */
                backup: new DesktopAppFeature({
                    requests: {
                        add: {
                            a: 'ab',
                            u: u_handle,
                        },
                    },
                    options: {
                        handleInvalidUser: true,
                    },
                    event: {
                        add: 500614
                    },
                    appPromoPageNum: 1,
                }),
                /**
                 * {DesktopAppFeature} sync - DesktopAppFeature instance to handle sync
                 */
                sync: new DesktopAppFeature({
                    requests: {
                        add: {
                            a: 's',
                            h: M.RootID,
                            // u: u_handle, //TODO: Add this param after 5.9.0 is released
                        },
                    },
                    event: {
                        add: 500615
                    },
                    appPromoPageNum: 2,
                }),
                /**
                 * {DesktopAppFeature} common - DesktopAppFeature instance to handle common functionality
                 */
                // FIXME: anti-pattern. Instead of having a common instance of DesktopAppFeature
                // define common config in a external variable or as default in class
                // and keep only 2 instances for both backup & sync
                common: new DesktopAppFeature({
                    requests: {
                        remove: (id) => (
                            {
                                a: 'sr',
                                id
                            }
                        ),
                        pause: (id) => (
                            {
                                a: 'sp',
                                s: 3,
                                id,
                            }
                        ),
                        resume: (id) => (
                            {
                                a: 'sp',
                                s: 1,
                                id,
                            }
                        )
                    },
                    sdsCodes: {
                        ok: 0,
                        resume: 1,
                        pause: 3,
                        remove: 8,
                    },
                }),
            };

            /**
             * {Object} filterChipUtils - Contains DC Filter Chip utility functions, accessible externally
             *
             */
            this.filterChipUtils = freeze({
                /**
                 * Initializes the filter chips and shows/hides them.
                 * Also adjusts the visibility of the filter chip wrapper and sets the appropriate filters are active.
                 * @returns {undefined}
                 */
                init() {
                    $dcFilterChipsWrapper.removeClass('hidden');

                    for (const name in filters) {
                        if (filters.hasOwnProperty(name)) {
                            const ctx = filters[name];

                            if (!ctx.component) {
                                ctx.component = new DCFilterChip(name);
                            }

                            if (ctx.shouldShow) {
                                ctx.component.$element.toggleClass('hidden', !ctx.shouldShow());
                            }
                        }
                    }

                    const hideWrapper = Object.keys(filters)
                        .every(name => filters[name].component.$element.hasClass('hidden'));

                    $dcFilterChipsWrapper.toggleClass('hidden', hideWrapper);

                    if (!hideWrapper && !this.selectedFilters.manual && window.selectionManager) {
                        this.toggleActiveFilter(true);
                        this.selectedFilters.manual = true;
                        M.openFolder(M.currentdirid, true);
                    }
                },

                /**
                 * Checks if a given filter matches the filter conditions for the provided input `n`.
                 *
                 * @param {any} n - The input to check against the filters.
                 * @returns {boolean} - Returns `true` if all filters match, otherwise `false`.
                 */
                match(n) {

                    for (const name in filters) {
                        if (filters.hasOwnProperty(name)) {
                            const ctx = filters[name];

                            if (ctx.selection && !ctx.match(n)) {

                                return false;
                            }
                        }
                    }

                    return true;
                },

                /**
                 * Resets the filter selections to their default values.
                 * Optionally uses a stash to restore previous state.
                 *
                 * @param {boolean} [stash=false] - If `true`, attempts to restore filter state from a previous stash.
                 * @returns {undefined}
                 */
                resetSelections(stash) {

                    if (!stash) {

                        for (const name in filters) {
                            if (filters.hasOwnProperty(name)) {
                                const ctx = filters[name];

                                if (ctx.component) {
                                    ctx.component.resetToDefault();
                                }
                            }
                        }
                    }

                    const {ui} = mega.devices;
                    const hidden = ui.getRenderSection() === renderSection.cloudDrive;
                    this[hidden ? 'hide' : 'init']();
                },

                /**
                 * Hides the filter chip wrapper, effectively hiding all filter chips.
                 *
                 * @returns {undefined}
                 */
                hide() {
                    $dcFilterChipsWrapper.addClass('hidden');
                },

                /**
                 * Automatically selects a filter chip for the specified filter and index,
                 * optionally preventing a reload and marking it as a manual selection.
                 *
                 * @param {string} filterName - The name of the filter to auto-select.
                 * @param {number} index - The index of the filter option to select.
                 * @param {boolean} [preventReload=false] - If `true`, prevents reloading when the filter is selected.
                 * @param {boolean} [isManualSelection=false] - If `true`, marks the selection as manual.
                 * @returns {undefined}
                 */
                autoSelect(filterName, index, preventReload, isManualSelection) {
                    const ctx = filters[filterName];
                    if (!ctx || !ctx.component) {
                        return;
                    }
                    ctx.component.autoSelect(index, preventReload, isManualSelection);
                },

                /**
                 * Toggles the active filter based on the current section of the UI.
                 * Automatically selects the appropriate filter for the section or resets the selections.
                 *
                 * @param {boolean} preventReload - If `true`, prevents reloading the view when toggling the filter.
                 * @returns {undefined}
                 */
                toggleActiveFilter(preventReload) {
                    const {ui} = mega.devices;
                    const currSect = ui.getRenderSection();
                    const {device} = ui.getCurrentDirData();
                    let folderFilterOption;
                    switch (currSect) {
                        case renderSection.devices:
                            this.autoSelect('deviceactivity', 0, preventReload);
                            break;
                        case renderSection.deviceFolders:
                            // If current device is inactive, we autoselect the "inactive folders" filter
                            folderFilterOption = (device && !ui.isActive(device)) | 0;
                            this.autoSelect('folderactivity', folderFilterOption, preventReload);
                            break;
                        default:
                            this.resetSelections();
                    }
                },

                /**
                 * Gets the currently selected filters.
                 * @returns {Object} - The current selected filters object.
                 */
                get selectedFilters() {
                    return selectedFilters;
                },
            });
        }

        /**
         * Checks if the device centre has devices.
         * @returns {boolean} - Returns `true` if devices exist, otherwise `false`
         */
        get hasDevices() {
            return M.dcd && Object.keys(M.dcd).length;
        }

        /**
         * Destruction tasks
         * @returns {void}
         */
        destroy() {
            this._unbindEvents();
            this.shimmer.hide();
            this.header.hide();
            this.filterChipUtils.resetSelections();
            this.filterChipUtils.selectedFilters.manual = false;
        }

        /**
         * Set lastReq to 0 to force fetch data
         * @returns {void} void
         */
        clearLastReq() {
            this.lastReq = 0;
        }

        /**
         * Renders device centre UI
         * @param {String} id - current dir id
         * @param {Object} options - options object
         * @param {Boolean} options.isRefresh - whether is a refresh call
         * @param {Boolean} options.isSkipFetch - whether to skip fetch data
         * @param {Boolean} options.isSkipPathCheck - whether to force load even path is not device centre
         * @returns {Promise<void>} void
         */
        async render(id, options) {
            const {isRefresh, isSkipFetch, isSkipPathCheck} = options || {};

            if (M.currentCustomView.type !== rootId && !isSkipPathCheck) {
                return;
            }

            const path = id.split('/');
            if ((!path.length || path[0] !== rootId || path.length > 3) && !isSkipPathCheck) {
                M.openFolder(rootId);
                return;
            }

            this._setupListeners(id);

            if (this.isReady) {
                if (!this.isLoading && !isSkipFetch) {
                    this.isLoading = true;
                    this._fetch().finally(() => {
                        this.isLoading = false;
                    });
                }
            }
            else {
                this.shimmer.show();
                if (this.isLoading) {
                    return;
                }
                this.isLoading = true;
                await this._boot().finally(() => {
                    this.isReady = true;
                    this.isLoading = false;
                    this.shimmer.hide();
                });
            }

            await mega.devices.main.render(isRefresh);
            this._postRender();

            delay(refreshEventName, () => this.render(id, {isRefresh: true}).catch(dump), refreshMillis);
        }

        /**
         * Renders device centre UI if shared node updated is a synced folder
         * and it's not in permissions error state
         * @param {String} handle - Sahred node handle
         * @return {void} void
         */
        onSharedUpdated(handle) {
            let folder;
            const devices = Object.values(M.dcd);
            for (let i = 0; i < devices.length; i++) {
                folder = devices[i].folders[handle];
                if (folder) {
                    break;
                }
            }

            if (folder && folder.status.errorState !== 14) {
                // cancel current delay to avoid potential race condition
                delay.cancel(refreshEventName);
                // clear last request to get new data
                this.clearLastReq();
                // render delayed: it might take time to get an updated API response after shared node updated
                delay('device-centre:on-shared-updated', () => {
                    this.render(M.currentdirid, {isRefresh: true}).catch(dump);
                }
                , 3e3);
            }
        }

        /**
         * Updates device and folder data when a node is updated
         * @param {MegaNode} node - node to update
         * @returns {void} void
         */
        updateNode(node) {
            const devices = Object.values(M.dcd);
            for (let i = 0; i < devices.length; i++) {
                const device = devices[i];
                const folder = device.folders[node.h];
                if (folder) {
                    const newFolder = mega.devices.data.Parser.buildDeviceFolder(folder, node);
                    M.dcd[device.h].folders[folder.h] = newFolder;
                }
            }
        }

        /**
         * Sets devices names
         * @param {Array} data - Devices data
         * @param {String} handle - Device handle
         * @returns {Promise<Array>} Data Array
         */
        async setDeviceNames(data, handle) {
            await mega.devices.data.setDeviceNames(data);
            for (const device of Object.values(M.dcd)) {
                device.name = data[device.h];
            }

            if (M.megaRender) {
                M.megaRender.revokeDOMNode(handle, true);
            }

            if (M.currentrootid === rootId) {
                mega.devices.ui.render(M.currentdirid, {isRefresh: true});
            }
        }

        /**
         * Returns device and folder corresponding to handle
         * to be used only when current view is not device centre
         * @param {String} handle - Device handle
         * @returns {Promise<Object>} device and folder data
         */
        async getOuterViewData(handle) {
            if (!Object.keys(M.dcd).length) {
                await this.render(M.currentdirid, {isSkipPathCheck: true});
            }

            let folder = this._findFolder(handle);
            if (!folder) {
                const path = M.getPath(handle);

                // parent index for backup (4) or sync (2) in node parent path
                const index = path[path.length - 1] === M.InboxID ? 4 : 2;
                if (path.length > index) {
                    folder = this._findFolder(path[path.length - index]);
                }
            }

            return {
                device: folder ? M.dcd[folder.d] : null,
                folder,
            };
        }

        /**
         * Returns deviec centre path for a node
         * to be used only when current view is device centre
         * @param {String} handle - Device handle
         * @returns {Promise<Array>} path
         */
        async getNodePathFromOuterView(handle) {
            const {folder} = await this.getOuterViewData(handle);
            if (!folder) {
                return [];
            }

            const path = M.getPath(handle);
            return folder.getPath(path);
        }

        /**
         * Returns device centre URL path for a node
         * to be used only when current view is not device centre
         * @param {MegaNode} node - target node
         * @param {Boolean} isParent - whether to set path for node itself or its parent
         * @returns {Promise<String>} path
         */
        async getNodeURLPathFromOuterView(node, isParent) {
            const handle = isParent ? node.p : node.h;
            const path = [mega.devices.rootId];

            const {device} = await this.getOuterViewData(handle);
            if (device) {
                path.push(device.h, handle);
            }
            else if (isParent) {
                const {device} = await this.getOuterViewData(node.h);
                if (device) {
                    path.push(device.h);
                }
            }

            return path.join('/');
        }

        /**
         * Returns device centre FULL path for a node
         * to be used only when current view is not device centre
         * @param {MegaNode} node - target node
         * @returns {Promise<String>} path
         */
        async getNodeFullPathFromOuterView(node) {
            const path = [mega.devices.rootId];
            const {device} = await this.getOuterViewData(node.h);

            if (device) {
                const originalPath = M.getPath(node.h);
                const index = originalPath[originalPath.length - 1] === M.InboxID ? 3 : 1;
                path.unshift(...originalPath.slice(0,  -index), device.h);
            }
            return path;
        }

        /**
         * Returns device and folder corresponding to current dir
         * @returns {Object} device and folder data
         */
        getCurrentDirData() {
            if (M.currentCustomView) {
                const aDir = M.currentdirid.split('/');
                return {
                    device: M.dcd[aDir[1]],
                    folder: M.dcd[aDir[1]] ? M.dcd[aDir[1]].folders[aDir[2]] : undefined
                };
            }
            return {};
        }

        /**
         * Returns device folder in the path passed as argument getting device from current view
         * @param {Array<String>|null} path - path to get folder from
         * @returns {DeviceCentreFolder|undefined} device centre folder or undefined
         */
        getFolderInPath(path) {
            if (path) {
                const {device} = this.getCurrentDirData();
                if (device) {
                    for (let i = path.length - 1; i >= 0; i--) {
                        const folder = device.folders[path[i]];
                        if (folder) {
                            return folder;
                        }
                    }
                }
            }
        }

        /**
         * Returns device centre current dir path for a given node handle
         * To be used in URLs & openFolder
         * @param {String} handle - node handle
         * @returns {String} device centre path
         */
        getCurrentDirPath(handle) {
            if (M.currentCustomView && M.currentCustomView.type === rootId) {
                return [...M.currentdirid.split('/').slice(0, 2), handle].join('/');
            }
            return handle;
        }

        /**
         * Returns device centre path for a device folder children from path passed as argument
         * getting device from current view
         * @param {Arary<String>} path - path to get device centre path from
         * @returns {Arary<String>} device centre path
         */
        getFolderChildrenPath(path) {
            if (M.currentCustomView && M.currentCustomView.type === rootId) {
                const folder = this.getFolderInPath(path);
                if (folder) {
                    return folder.getPath(path);
                }
            }
            return path;
        }

        /**
         * Returns device centre full path path for a given node handle
         * @param {String} handle - node handle
         * @returns {Array<String>} device centre full path
         */
        getFullPath(handle) {
            if (M.dcd[handle]) {
                return M.dcd[handle].getPath();
            }

            const {original, nodeID} = M.currentCustomView;
            const aPath = original.split('/');
            const device = M.dcd[aPath[1]];
            if (!device) {
                return [];
            }

            const folder = device.folders[nodeID];
            const path = M.getPath(handle);
            return folder ? folder.getPath(path) : this.getFolderChildrenPath(path);
        }

        /**
         * Returns render section
         * @returns {String} render section
         */
        getRenderSection() {
            if (M.currentCustomView && M.currentCustomView.type === rootId) {
                if (M.currentdirid === rootId) {
                    return renderSection.devices;
                }
                return M.dcd[M.currentCustomView.nodeID] ?
                    renderSection.deviceFolders :
                    renderSection.cloudDrive;
            }
            return renderSection.cloudDrive;
        }

        /**
         * Returns grid id based on current dir id
         * @returns {String} grid id
         */
        getGridId() {
            const handler = M.currentdirid === rootId ? '.devices' : '.folders';
            return `.device-centre-grid-view ${handler}.grid-scrolling-table`;
        }

        /**
         * Whether custom path must be rendered by a custom device centre handler
         * @returns {Boolean} whether is custom render
         */
        isCustomRender() {
            return M.currentrootid === rootId &&
                (M.currentdirid === rootId || !!M.dcd[M.currentCustomView.nodeID]);
        }

        /**
         * Whether current path is a device folder
         * @returns {Boolean} whether current path is a device folder
         */
        isCurrentPathDeviceFolder() {
            if (M.currentrootid === rootId) {
                const {device, folder} = this.getCurrentDirData();
                return !!(device && folder);
            }
            return false;
        }

        /**
         * Returns whether there is any backup folder in given handles
         * @param {Array<String>} handles - list of handles to get folders of
         * @returns {Boolean} whether backup folder exists in given handles
         */
        isBackupRelated(handles) {
            if (typeof handles === 'string') {
                handles = [handles];
            }
            for (let i = 0; i < handles.length; i++) {
                const folder = this.getFolderInPath(M.getPath(handles[i]));
                if (folder && folder.t === mega.devices.models.syncType.backup) {
                    return true;
                }
            }
            return false;
        }

        /**
         * Returns whether there the provided handle is/belongs to a full sync
         * @param {Array<String>} handle - the handle to check
         * @returns {Boolean} whether the handle is or belongs to a full sync
         */
        isFullSyncRelated(handle) {
            const folder = this.getFolderInPath(M.getPath(handle));
            return folder && folder.h === M.RootID;
        }

        /**
         * Returns whether given handles can be moved
         * @param {Array<String>} handles list of handles to get devices / folders of
         * @returns {Boolean} whether given handles can be moved
         */
        canMove(handles) {
            return !handles.some((handle) => {
                if (M.dcd[handle]) {
                    return true;
                }
                const folder = this.getFolderInPath(M.getPath(handle));
                return folder && !folder.canMove;
            });
        }

        /**
         * Returns whether a node is a deprecated backup, so its parent, grandparent or itself is M.InboxID
         * @param {MegaNode} node - node to check
         * @returns {Boolen} Whether the node is a deprecated backup
         */
        isDeprecatedBackups(node) {
            if (node.h === M.InboxID || node.p === M.InboxID) {
                return true;
            }

            const path = M.getPath(node.h);
            return path.length === 3 && path[2] === M.InboxID;
        }

        /**
         * Handles the visibility of Add Backup & Add Sync buttons for the header and empty devices
         * @param {Boolean|undefined} appIsInstalled whether desktop app is installed. If `undefined`, it rechecks
         * @returns {void}
         */
        handleAddBtnVisibility(appIsInstalled) {
            if (appIsInstalled === undefined) {
                megasync.isInstalled((err, is) => {
                    appIsInstalled = !err || is;
                });
            }
            if (!this.hasDevices) {
                if (appIsInstalled) {
                    this.hideAppDlButtons();
                    this.showEmptyActionButtons();
                }
                else {
                    this.showAppDlButtons();
                    this.hideEmptyActionButtons();
                }
            }
        }

        /**
         * Executes tasks after rendering UI
         * @returns {void} void
         */
        _postRender() {
            this._bindEvents();

            if (this.hasDevices) {
                if (M.currentrootid === rootId) {
                    this.filterChipUtils.init();
                }

                if (this.filterChipUtils.selectedFilters.value) {
                    M.filterByParent(M.currentdirid);
                    M.renderMain();
                    const {name, index} = this.filterChipUtils.selectedFilters.data;
                    if (!M.v.length && name === 'folderactivity' && index) {
                        this.$emptyFolder.removeClass('hidden');
                    }
                }
                else {
                    const {main: {section}, models: {syncSection}} = mega.devices;
                    if (!M.v.length && section === syncSection.deviceFolders) {
                        this.$emptyFolder.removeClass('hidden');
                    }
                }

                mega.ui.mInfoPanel.reRenderIfVisible(selectionManager.get_selected());
            }
        }

        /**
         * Shows device centre empty devices UI
         * @returns {void}
         */
        showNoDevices() {
            this.$gridWrapper.addClass('hidden');
            this.$emptyDevices.removeClass('hidden');
            megasync.isInstalled((err, is) => {
                const appFound = !err || is;
                const descText = appFound
                    ? l.dc_empty_desc_withapp
                    : l.dc_empty_desc_noapp;
                $('.fm-empty-description', this.$emptyDevices).safeHTML(descText);
                onIdle(clickURLs);
                this.handleAddBtnVisibility(appFound);
            });
        }

        /**
         * Shows the Add Backup & Add Sync buttons in the empty devices section
         * @returns {void}
         */
        showEmptyActionButtons() {
            this.$emptyAddActions.removeClass('hidden');
        }

        /**
         * Hides the Add Backup & Add Sync buttons in the empty devices section
         * @returns {void}
         */
        hideEmptyActionButtons() {
            this.$emptyAddActions.addClass('hidden');
        }

        /**
         * Shows the mega app download buttons in the device centre empty devices UI
         * @returns {void}
         */
        showAppDlButtons() {
            if (this.$emptyAppDLButtons) {
                this.$emptyAppDLButtons.removeClass('hidden');
            }
        }

        /**
         * Hides the mega app download buttons in the device centre empty devices UI
         * @returns {void}
         */
        hideAppDlButtons() {
            if (this.$emptyAppDLButtons) {
                this.$emptyAppDLButtons.addClass('hidden');
            }
        }

        /**
         * Writes the vault property, necessary when moving the backup folder before removal
         *  @param {string} h - node handle of the backup folder
         *  @param {Object} req - API request payload
         * @returns {void}
         */
        ackVaultWriteAccess(h, req) {
            if (h) {
                assert(req.a === 'm' || req.a === 'a' || req.a === 'd');
                req.vw = 1;
            }
            else if (d) {
                console.error('Unexpected Vault-write attempt.', h, req);
            }
        }

        /**
         * Shows the device rename dialog
         * @returns {void}
         */
        renameDevice() {
            if (!$.selected.length) {
                return;
            }

            const handle = $.selected[0];
            const devNames = Object.create(null);
            const currentDeviceData = M.dcd[handle];

            for (const {h, name} of Object.values(M.dcd)) {
                devNames[h] = name;
            }

            const deviceIconClass = `icon-${deviceIcon(
                currentDeviceData.dua || currentDeviceData.name,
                currentDeviceData.t
            )}-filled`;

            const $dialog = $('.mega-dialog.device-rename-dialog', '.mega-dialog-container');
            const $input = $('input', $dialog);
            let errMsg = '';

            M.safeShowDialog('device-rename-dialog', () => {
                $dialog.removeClass('hidden').addClass('active');
                $input.trigger("focus");
                return $dialog;
            });

            $('button.js-close, .device-rename-dialog-button.cancel', $dialog)
                .rebind('click.dialogClose', closeDialog);

            $('.device-rename-dialog-button.rename', $dialog).rebind('click.dcdialogRename', () => {
                if ($dialog.hasClass('active')) {

                    let value = $input.val();
                    errMsg = '';

                    if (currentDeviceData.name && currentDeviceData.name !== value) {

                        value = value.trim();

                        if (!value) {
                            errMsg = l.device_rename_dialog_warning_empty;
                        }
                        else if (M.isSafeName(value) && value.length <= maxDeviceNameLength) {

                            // Check for duplicate device names
                            if (Object.values(devNames).includes(value)) {
                                errMsg = l.device_rename_dialog_warning_duplicate;
                            }
                            else {
                                devNames[handle] = value;
                                this.setDeviceNames(devNames, handle).then(() => {
                                    showToast('info', l.dc_device_renamed, null, null, null, null, 5000);
                                });
                            }
                        }
                        else if (value.length > maxDeviceNameLength) {
                            errMsg = mega.icu.format(l.device_rename_dialog_warning_length, maxDeviceNameLength);
                        }
                        else {
                            errMsg = l[24708];
                        }

                        if (errMsg) {
                            $('.duplicated-input-warning span', $dialog).safeHTML(errMsg);
                            $dialog.addClass('duplicate');
                            $input.addClass('error');

                            setTimeout(() => {
                                $dialog.removeClass('duplicate');
                                $input.removeClass('error');

                                $input.trigger("focus");
                            }, 2000);

                            return;
                        }
                    }
                    closeDialog();
                }
            });

            $input.val(currentDeviceData.name);

            $('.device-rename-input-bl > i', $dialog)
                .attr('class',
                      `sprite-fm-theme ${deviceIconClass}`
                );

            $input.rebind('focus.dcRenameDialog', () => {
                $dialog.addClass('focused');
            });

            $input.rebind('blur.dcRenameDialog', () => {
                $dialog.removeClass('focused');
            });

            $input.rebind('keydown.dcRenameDialog', (event) => {
                // distingushing only keydown evet, then checking if it's Enter in order to preform the action'
                if (event.keyCode === 13) { // Enter
                    $('.device-rename-dialog-button.rename', $dialog).click();
                }
                else if (event.keyCode === 27) { // ESC
                    closeDialog();
                }
                else {
                    $dialog.removeClass('duplicate').addClass('active');
                    $input.removeClass('error');
                }
            });
        }

        /**
         * Checks the 'active' status of a device or a folder based on its heartbeat
         * @param {Object} dcItem - The device or folder must have the `status` attribute
         * @returns {Boolean} Whether the device or folder is active
         */
        isActive(dcItem) {
            if (!dcItem || !dcItem.status || !dcItem.status.lastHeartbeat) {
                return false;
            }
            return mega.devices.data.isActive(dcItem.status.lastHeartbeat);
        }

        /**
         * Show a context menu for the selected device
         * @param {Event} e - contextMenu event
         * @returns {void}
         */
        contextMenu(e) {
            const items = ['.properties-item'];
            const {syncType} = mega.devices.models;
            if ($.selected.length === 1) {
                const h = $.selected[0];
                if (M.dcd[h]) {
                    items.push('.device-rename-item');
                }
                else {
                    const {device} = mega.devices.ui.getCurrentDirData();
                    if (device) {
                        const folder = device.folders[h];
                        if (folder && folder.t !== syncType.backup && h !== M.RootID) {
                            items.push('.rename-item');
                        }
                    }
                }
            }
            M.contextMenuUI(e, 8, items.join(', '));
        }

        /**
         * Initializes listener "beforepagechange" to destroy handlers when leaving device-center page
         * @returns {void}
         */
        _setupListeners() {
            if (!this.beforePageChangeListener) {
                this.beforePageChangeListener = mBroadcaster.addListener('beforepagechange', () => {
                    if (M.currentrootid === rootId) {
                        // Hide transient state of filter chip
                        this.filterChipUtils.hide();
                        this.filterChipUtils.selectedFilters.manual = false;
                    }
                    else {
                        delay.cancel(refreshEventName);
                        mBroadcaster.removeListener(this.beforePageChangeListener);
                        this.beforePageChangeListener = null;
                        this.destroy();
                    }
                });
            }
        }

        /**
         * Unbind event listeners
         * @returns {void}
         */
        _unbindEvents() {
            if (this.$addBackup) {
                this.$addBackup.off('click.dc.backup.add');
            }
            if (this.$addSyncs) {
                this.$addSyncs.off('click.dc.syncs.add');
            }
            if (this.$emptyActiveDevices) {
                $('.js-inactive-filter-select', this.$emptyActiveDevices).off('click.dc.inactive.devices');
            }
            if (this.$emptyActiveFolders) {
                $('.js-inactive-filter-select', this.$emptyActiveFolders).off('click.dc.inactive.folders');
            }
            if (this.$emptyAppDLButtons) {
                $('.mega-app-desktop', this.$emptyAppDLButtons).off('click.dc.download');
                $('.mega-app-mobile', this.$emptyAppDLButtons).off('click.dc.download');
            }
            if (this.$emptyAddActions) {
                $('.cta-add-backup', this.$emptyAddActions).off('click.dc.backup.add');
                $('.cta-add-sync', this.$emptyAddActions).off('click.dc.sync.add');
            }
        }

        /**
         * Bind event listeners
         * @returns {void}
         */
        _bindEvents() {
            if (this.$addBackup) {
                this.$addBackup.rebind('click.dc.backup.add', () => {
                    this.desktopApp.backup.add();
                });
            }
            if (this.$addSyncs) {
                this.$addSyncs.rebind('click.dc.syncs.add', () => {
                    this.desktopApp.sync.add();
                });
            }
            if (this.$emptyActiveDevices) {
                $('.js-inactive-filter-select', this.$emptyActiveDevices).rebind('click.dc.inactive.devices', () => {
                    this.filterChipUtils.autoSelect('deviceactivity', 1, false, true);
                });
            }
            if (this.$emptyActiveFolders) {
                $('.js-inactive-filter-select', this.$emptyActiveFolders).rebind('click.dc.inactive.folders', () => {
                    this.filterChipUtils.autoSelect('folderactivity', 1, false, true);
                });
            }
            if (this.$emptyAppDLButtons) {
                $('.mega-app-desktop', this.$emptyAppDLButtons).rebind('click.dc.download', () => {
                    window.open('https://mega.io/desktop', '_blank', 'noopener,noreferrer');
                });
                $('.mega-app-mobile', this.$emptyAppDLButtons).rebind('click.dc.download', () => {
                    window.open('https://mega.io/mobile', '_blank', 'noopener,noreferrer');
                });
            }
            if (this.$emptyAddActions) {
                $('.cta-add-backup', this.$emptyAddActions).rebind('click.dc.backup.add', () => {
                    this.desktopApp.backup.add();
                });
                $('.cta-add-syncs', this.$emptyAddActions).rebind('click.dc.sync.add', () => {
                    this.desktopApp.sync.add();
                });
            }
        }

        /**
         * Scans all device folders until folder determined by handle is found or null otherwise
         * @param {String} handle - folder handle to find
         * @returns {DeviceCentreFolder|null} Folder object or null
         */
        _findFolder(handle) {
            if (!M.dcd || !Object.keys(M.dcd).length) {
                return null;
            }

            for (const device of Object.values(M.dcd)) {
                const folder = device.folders[handle];
                if (folder) {
                    return folder;
                }
            }

            return null;
        }

        /**
         * Internal function, populates device folder context menu items
         *
         * @param {DeviceCentreFolder} folder - The folder to populate items for
         * @param {MegaNode} node - The selected node
         * @param {object.<string,number>} items - The items to populate
         * @param {Boolean} isSharedFolder - Whether this folder is shared
         * @param {Boolean} hasSharedLink - Whether this folder has a public link
         * @param {Boolean} isInShare - Whether this folder is in a share
         * @returns {void} void
         */
        _populateDeviceFolderCtxItems(folder, node, items, isSharedFolder, hasSharedLink, isInShare) {
            const {
                twoWay, cameraUpload, mediaUpload, backup
            } = mega.devices.models.syncType;

            items['.open-item'] = 1;
            items['.download-item'] = 1;
            items['.zipdownload-item'] = 1;
            items['.properties-item'] = 1;

            // Full sync
            if (node.h === M.RootID) {
                items['.open-cloud-item'] = 1;
            }
            // Inshare + Selective sync
            else if (folder.t === twoWay && isInShare) {
                items['.copy-item'] = 1;
                items['.open-in-location'] = 1;
                items['.leaveshare-item'] = 1;
                if (M.getNodeRights(folder.h) > 1) {
                    items['.stopsync-item'] = 1;
                    items['.rename-item'] = 1;
                    if (node.tvf) {
                        items['.clearprevious-versions'] = 1;
                    }
                }
            }
            // Selective sync (not inshare)
            else if (folder.t === twoWay) {
                items['.rename-item'] = 1;
                items['.copy-item'] = 1;
                items['.open-cloud-item'] = 1;
                items['.stopsync-item'] = 1;
                this._populateCommonCtxItems(node, items, isSharedFolder, hasSharedLink);
            }
            // Backup
            else if (folder.t === backup) {
                items['.stopbackup-item'] = 1;
                items['.copy-item'] = 1;
                items['.getlink-item'] = 1;
                items['.sh4r1ng-item'] = 1;
                items['.send-to-contact-item'] = 1;
                if (isSharedFolder) {
                    items['.removeshare-item'] = 1;
                }
                if (hasSharedLink) {
                    items['.removelink-item'] = 1;
                }
            }
            else if (folder.t === cameraUpload || folder.t === mediaUpload) {
                this._populateCommonCtxItems(node, items, isSharedFolder, hasSharedLink);
                items['.rename-item'] = 1;
                items['.open-cloud-item'] = 1;
            }
        }

        /**
         * Internal function, populates common context menu items
         *
         * @param {MegaNode} node The selected node
         * @param {object.<string,number>} items The items to populate
         * @param {Boolean} isSharedFolder Whether this folder is shared
         * @param {Boolean} hasSharedLink Whether this folder has a public link
         * @param {Boolean} multiple Whether multiple nodes have been selected
         *
         * @returns {void} void
         */
        _populateCommonCtxItems(node, items, isSharedFolder, hasSharedLink, multiple) {

            items['.send-to-contact-item'] = 1;
            items['.download-item'] = 1;
            items['.zipdownload-item'] = 1;
            items['.copy-item'] = 1;
            items['.properties-item'] = 1;
            items['.getlink-item'] = 1;

            if (multiple) {
                return;
            }

            const isWritable = M.getNodeRights(node.h) > 1 && !this.isBackupRelated(node.h);

            if (isWritable && node.h !== M.RootID) {
                items['.move-item'] = 1;
                items['.remove-item'] = 1;
                items['.rename-item'] = 1;
                items['.add-star-item'] = 1;
                items['.colour-label-items'] = 1;
            }
            if (node.t) {
                items['.open-item'] = 1;
                items['.sh4r1ng-item'] = 1;
                this._populateFileReqCtxItems(node, items);
            }
            if (isSharedFolder) {
                items['.removeshare-item'] = 1;
            }
            if (hasSharedLink) {
                items['.removelink-item'] = 1;
            }

            if (is_image2(node)) {
                items['.preview-item'] = 1;
            }
            else if (is_video(node)) {
                items['.play-item'] = 1;
            }
            else if (is_text(node)) {
                items['.edit-file-item'] = 1;
            }

            if (node.tvf > 0 && !node.t) {
                items['.properties-versions'] = 1;
            }
            if (node.tvf && isWritable) {
                items['.clearprevious-versions'] = 1;
            }

            this._populateSensitiveCtxItems([node.h], items);
        }

        _populateSensitiveCtxItems(handles, items) {
            const sen = mega.sensitives.getSensitivityStatus(handles);
            if (sen) {
                items['.add-sensitive-item'] = sen;
            }
        }

        /**
         * Internal function, populates context menu items related to File Requests
         *
         * @param {MegaNode} node The selected node
         * @param {object.<string,number>} items The items to populate
         *
         * @returns {void} void
         */
        _populateFileReqCtxItems(node, items) {

            if (this.isBackupRelated(node.h)) {
                return;
            }

            let exp = false;
            const shares = M.getNodeShareUsers(node);

            for (let i = shares.length; i--;) {
                if (shares[i] === 'EXP') {
                    shares.splice(i, 1);
                    exp = node.shares.EXP;
                }
            }

            if (!exp && !shared.is(node.h)) {
                if (mega.fileRequest.publicFolderExists(node.h)) {
                    let pageClass = '';
                    if (!is_mobile) {
                        pageClass =
                            M.currentrootid === 'file-requests'
                                ? '.file-request-page'
                                : ':not(.file-request-page)';
                    }
                    items[`.file-request-manage${pageClass}`] = 1;
                    items[`.file-request-copy-link${pageClass}`] = 1;
                    items[`.file-request-remove${pageClass}`] = 1;
                }
                else {
                    items[`.file-request-create`] = 1;
                }
            }
        }


        /**
         * Internal function, filter items in case restricted in handles
         *
         * @param {Array<String>} handles - The handles of the selected nodes
         * @param {object.<string,number>} items The items to populate
         *
         * @returns {void} void
         */
        _filterRestrictedItems(handles, items) {
            const isUndecrypted = handles.some(h => missingkeys[h]);

            if (isUndecrypted) {
                delete items['.add-star-item'];
                delete items['.download-item'];
                delete items['.rename-item'];
                delete items['.copy-item'];
                delete items['.move-item'];
                delete items['.getlink-item'];
                delete items['.embedcode-item'];
                delete items['.colour-label-items'];
                delete items['.send-to-contact-item'];
            }
            else {
                const cl = new mega.Share.ExportLink();
                const isTakenDown = cl.isTakenDown(handles);

                if (isTakenDown) {
                    delete items['.getlink-item'];
                    delete items['.embedcode-item'];
                    delete items['.removelink-item'];
                    delete items['.sh4r1ng-item'];
                    delete items['.add-star-item'];
                    delete items['.colour-label-items'];
                    delete items['.download-item'];
                    delete items['.play-item'];
                    delete items['.preview-item'];
                    delete items['.edit-file-item'];
                    delete items['.add-sensitive-item'];

                    items['.dispute-item'] = 1;
                }
            }
        }

        /**
         * Returns a list of context menu items for device centre entities
         *
         * @param {Array<String>} handles The handles of the selected nodes
         * @param {boolean} isHeaderContext If the context menu is in the header of the page (parent node)
         * @returns {object.<string,number>} Context menu item selectors
         */
        getContextMenuItems(handles, isHeaderContext) {

            const items = Object.create(null);
            const currentSection = this.getRenderSection();

            if (handles.length > 1 && currentSection !== renderSection.cloudDrive) {

                items['.properties-item'] = 1;
                items['.download-item'] = 1;
                items['.zipdownload-item'] = 1;

                this._populateSensitiveCtxItems(handles, items);
                this._filterRestrictedItems(handles, items);

                return items;
            }
            else if (
                handles.length > 1
                && currentSection === renderSection.cloudDrive
                && this.isFullSyncRelated(handles[0])
            ) {

                this._populateSensitiveCtxItems(handles, items);
                items['.move-item'] = 1;
                items['.add-star-item'] = 1;
                items['.colour-label-items'] = 1;
                items['.remove-item'] = 1;
            }

            const mult = handles.length > 1;
            const h = handles[0];

            // If its a device, we take care of it under `ui.contextMenu()`
            if (M.dcd[h]) {
                return;
            }

            const selNode = M.getNodeByHandle(h);
            const isInShare = !!sharer(selNode.h);
            const isSharedFolder = M.getNodeShareUsers(selNode, 'EXP').length || M.ps[h];
            const hasSharedLink = new mega.Share().hasExportLink(h);
            const isRejectedNode = isInShare && M.getNodeRights(h) < 2;

            const {device} = this.getCurrentDirData();
            const folder = device.folders[h];

            // Device folders
            if (currentSection === renderSection.deviceFolders || isHeaderContext && folder) {
                this._populateDeviceFolderCtxItems(
                    folder, selNode, items, isSharedFolder, hasSharedLink, isInShare);
            }
            // Inside a device folder
            else if (currentSection === renderSection.cloudDrive) {
                this._populateCommonCtxItems(
                    selNode, items, isSharedFolder, hasSharedLink, mult
                );
                if (this.isFullSyncRelated(h)) {
                    items['.open-cloud-item'] = 1;
                }
            }

            // Checks if item is pausable or resumable, and handles `.togglepause-item`
            if (!isRejectedNode && folder && folder.status.errorState !== 14) {
                this._handlePauseCtxItems(folder, items);
            }

            // Handle sensitive menu item styles
            this._handleSenCtxItemStyling(items);

            M.colourLabelcmUpdate(handles);

            if (items['.add-star-item']) {
                const $addStarItem = $('.add-star-item', '.files-menu');
                if (M.isFavourite(h)) {
                    $addStarItem
                        .safeHTML('<i class="sprite-fm-mono icon-favourite-removed"></i>@@', l[5872]);
                }
                else {
                    $addStarItem
                        .safeHTML('<i class="sprite-fm-mono icon-favourite"></i>@@', l[5871]);
                }
            }

            this._filterRestrictedItems(handles, items);
            if (isHeaderContext) {
                delete items['.open-item'];
                if (folder) {
                    delete items[this.desktopApp.common.pauseMenuItemSelector];
                    delete items['.stopbackup-item'];
                }
                else {
                    delete items['.sh4r1ng-item'];
                }
            }

            return items;
        }

        /**
         * Internal function, handles show/hide (sensitive) context menu item styling
         *
         * @param {object.<string,number>} items The items to populate
         *
         * @returns {void} void
         */
        _handleSenCtxItemStyling(items) {
            if (items['.add-sensitive-item']) {
                const toHide = items['.add-sensitive-item'] === 1;
                mega.sensitives.applyMenuItemStyle('.add-sensitive-item', toHide);
            }
        }

        /**
         * Internal function, handles pause/resume context menu items
         *
         * @param {DeviceCentreFolder} folder The selected folder
         * @param {object.<string,number>} items The items to populate
         *
         * @returns {void} void
         */
        _handlePauseCtxItems(folder, items) {

            const togglePauseSelector = this.desktopApp.common.pauseMenuItemSelector;

            if (folder.h === M.RootID) {
                delete items[togglePauseSelector];
                return;
            }
            const {
                twoWay, oneWayUp, oneWayDown, backup
            } = mega.devices.models.syncType;

            if (folder && [twoWay, oneWayUp, oneWayDown, backup].includes(folder.t)) {
                items[togglePauseSelector] = 1;
                const $togglePauseOption = $(
                    togglePauseSelector,'.dropdown.context');
                const $icon = $('.sprite-fm-mono', $togglePauseOption);
                const $label = $('span', $togglePauseOption);

                if (folder.status.pausedSyncs) {
                    $icon.removeClass('icon-pause-thin');
                    $icon.addClass('icon-play-small-regular-outline');
                    $label.text(l.dc_run);
                }
                else {
                    $icon.removeClass('icon-play-small-regular-outline');
                    $icon.addClass('icon-pause-thin');
                    $label.text(l.dc_pause);
                }
            }
        }

        /**
         * Executes boot tasks: load device centre sources and fetch data
         * @returns {Promise<Object>} device centre data
         */
        async _boot() {
            if (!('main' in mega.devices)) {
                await Promise.resolve(M.require('devices')).catch(dump);
            }
            return this._fetch();
        }

        /**
         * Fetches device centre data and updated UI on fetch data
         * @returns {Promise<Object>} device centre data
         */
        async _fetch() {
            if (Date.now() - this.lastReq > refreshMillis - 1000) {
                return mega.devices.data.fetch(M.dcd)
                    .then(this._onDataFetch.bind(this))
                    .catch(dump)
                    .finally(() => {
                        this.lastReq = Date.now();
                    });
            }
        }

        /**
         * Assigns M.dcd with device centre data + revokes DOM nodes defined by outdated handles
         * @param {Object} res data fetched
         * @param {Object} res.data - devices data
         * @param {Array<Object>} res.outdated - outdated handles
         * @returns {void} void
         */
        _onDataFetch(res) {
            const {data = {}, outdated = []} = res || {};
            M.dcd = typeof data === 'object' && data || Object.create(null);

            if (M.currentrootid === rootId) {
                if (M.megaRender) {
                    const {device, folder} = this.getCurrentDirData();

                    for (let i = 0; i < outdated.length; i++) {
                        if (M.currentdirid === rootId) {
                            M.megaRender.revokeDOMNode(outdated[i].device, true);
                        }
                        else if (!folder && device.h === outdated[i].device) {
                            M.megaRender.revokeDOMNode(outdated[i].folder, true);
                        }
                    }
                }

                this.render(M.currentdirid, {isRefresh: true, isSkipFetch: true});
            }
        }
    };
});
