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
    const refreshMillis = 30000;

    /**
     * {String} refreshEventName - refresh event name
     */
    const refreshEventName = 'device-centre:refresh';

    /**
     * {Number} maxDeviceNameLength - validation check, maximum device name length
     */
    const maxDeviceNameLength = 32;

    /**
     * {jQuery} $dcFilterChipsWrapper - Contains the filter chips to filter devices
     */
    const $dcFilterChipsWrapper = $('.dc-filter-chips-wrapper', '.fm-right-files-block');

    /**
     * {Number} hbActivityThreshold - devices/folders with heartbeats older than 60 days are inactive
     */
    const hbActivityThreshold = 60 * 24 * 60 * 60;

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
                return ui.getRenderSection() === 'device-centre-devices'
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
                        return (hb) => Date.now() / 1000 - hb <= hbActivityThreshold;
                    },
                    // eid: 99942
                },
                {
                    tooltip: l.dc_fchips_inactive_devices_tooltip,
                    label: l.dc_fchips_inactive_devices,
                    get data() {
                        return (hb) => Date.now() / 1000 - hb > hbActivityThreshold;
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
                return ui.getRenderSection() === 'device-centre-folders'
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
                        return (hb) => Date.now() / 1000 - hb <= hbActivityThreshold;
                    },
                    // eid: 99942
                },
                {
                    tooltip: l.dc_fchips_inactive_folders_tooltip,
                    label: l.dc_fchips_inactive_folders,
                    get data() {
                        return (hb) => Date.now() / 1000 - hb > hbActivityThreshold;
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
            const {ui} = mega.devices;
            ui.clearSelection();
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
                    handleInvalidUser: config.options && typeof config.options.handleInvalidUser !== 'undefined' ?
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

                    megasync.megaSyncRequest(config.requests.add, (_, res) => {
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
                const isRejectedNode = !node || sharer(node.h) && M.getNodeRights(node.h) < 2;

                if (isRejectedNode) {
                    return;
                }

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

            const refreshAfterRemoval = async() => {
                const {ui} = mega.devices;
                ui.clearLastReq();

                if (ui.isCurrentPathDeviceFolder()) {
                    return M.openFolder(`${rootId}/${device.h}`);
                }

                ui.render(M.currentdirid, false, true);
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
                            .catch(tell)
                            .finally(() => {
                                refreshAfterRemoval();
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
                                .catch((ex) => {
                                    msgDialog('warninga', l[135], l[47], ex);
                                })
                                .finally(() => {
                                    refreshAfterRemoval();
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
            const isRejectedNode = !node || sharer(node.h) && M.getNodeRights(node.h) < 2;

            if (isRejectedNode) {
                return;
            }

            const action = folder.status.pausedSyncs
                ? 'resume'
                : 'pause';

            const proceedWithTogglePause = async() => {
                await api.req(config.requests[action](selectedSync.id));
                const sds = `${selectedSync.id}:${config.sdsCodes[action]}`;
                await api.setNodeAttributes(node, {sds});

                const {ui} = mega.devices;
                ui.clearLastReq();
                return ui.render(M.currentdirid, false, true);
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
                    async(proceed) => {
                        if (proceed) {
                            await proceedWithTogglePause();
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
             * {Number} lastReq - last time data req was made
             */
            this.lastReq = 0;

            /**
             * {Boolean} isLoading - whether data is being loaded
             */
            this.isLoading = false;

            /**
             * {String} selected - selected nodes before UI initialization
             */
            this.selected = null;

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
             * {jQuery} $empty - jQuery object
             */
            this.$empty = $('.fm-empty-device-list', this.$fmMain);

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
            this.$emptyAddActions = $('.fm-add-sb-actions', this.$empty);

            /**
             * {jQuery} $emptyAppDLButtons - jQuery object
             */
            this.$emptyAppDLButtons = $('.fm-app-links', this.$empty);
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
                            h: M.RootID
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

                    if (!hideWrapper && !this.selectedFilters.manual) {
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
                    const hidden = ui.getRenderSection() === 'cloud-drive';
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
                    switch (currSect) {
                        case 'device-centre-devices':
                            this.autoSelect('deviceactivity', 0, preventReload);
                            break;
                        case 'device-centre-folders':
                            this.autoSelect('folderactivity', 0, preventReload);
                            break;
                        default:
                            this.resetSelections();
                    }
                },

                /**
                 * Force re-applies currently selected filter, does not reload afterwards
                 *
                 * @returns {undefined}
                 */
                reapplyCurrentFilter() {
                    if (selectedFilters.data) {
                        const { name, index } = selectedFilters.data;
                        this.autoSelect(name, index, true);
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
         * UI initialisations
         * - hide FM & gallery views
         * - fmtopUI: called manually as it only runs when renderMain gets called
         * - hideEmptyGrids: to hide previous view empty grid
         * - initShortcutsAndSelection: must be executed for better UX
         *     - selection bar will not be shown/hidden unnecessarily when opening folder
         *       because oIsFrozen() call in selectionManager.add_to_selection returns true
         *       since selectionManager was destroyed and initialised
         * @returns {void}
         */
        init() {
            $('.files-grid-view.fm', this.$fmMain).addClass('hidden');
            $('.fm-blocks-view.fm', this.$fmMain).addClass('hidden');
            $('.gallery-view', this.$fmMain).addClass('hidden');

            if (selectionManager) {
                this.selected = selectionManager.selected_list;
            }

            fmtopUI();
            M.hideEmptyGrids();
            M.initShortcutsAndSelection();
        }

        /**
         * Set lastReq to 0 to force fetch data
         * @returns {void} void
         */
        clearLastReq() {
            this.lastReq = 0;
        }

        /**
         * Clear selection
         * @returns {void} void
         */
        clearSelection() {
            this.selected = null;
            selectionManager.clear_selection();
        }

        /**
         * Boot tasks
         * @param {String} id - current dir id
         * @param {Boolean} isSkipPathCheck - whether to force load even path is not device centre
         * @param {Boolean} skipShimmer - whether to skip shimmer
         * @returns {Promise<void>} void
         */
        async render(id, isSkipPathCheck, skipShimmer) {
            await this._boot(skipShimmer);

            const path = id.split('/');
            if ((!path.length || path[0] !== rootId || path.length > 3) && !isSkipPathCheck) {
                M.openFolder(rootId);
                return;
            }

            this._setupListeners(id);
            await mega.devices.tree.render();
            this._bindEvents();

            if (this.hasDevices) {
                const selected = this.selected && this.selected.length ?
                    this.selected :
                    selectionManager.selected_list;

                for (let i = 0; i < selected.length; i++) {
                    selectionManager.add_to_selection(selected[i], true);
                }

                if (M.currentrootid === rootId) {
                    this.filterChipUtils.init();
                }

                if (this.filterChipUtils.selectedFilters.value) {
                    M.filterByParent(M.currentdirid);
                    if (!M.v.length) {
                        this.header.hide();
                    }
                    M.renderMain();
                }

                await mega.ui.mInfoPanel.reRenderIfVisible(selected);
            }
            else if (M.currentrootid === id) {
                this.showNoDevices();
            }
            else if (M.currentrootid === rootId) {
                M.openFolder(rootId);
            }

            if (M.currentrootid === rootId) {
                delay(refreshEventName, () => this.render(id, false, true).catch(dump), refreshMillis);
            }
            else {
                delay.cancel(refreshEventName);
            }
        }

        /**
         * Refresh UI
         * @returns {Promise<void>} void
         */
        refresh() {
            this.clearLastReq();
            if (M.currentrootid === rootId) {
                $.hideContextMenu();
                return this.render(M.currentdirid, false, true);
            }
        }

        /**
         * Sets devices names
         * @param {Array} data - Devices data
         * @param {String} handle - Device handle
         * @returns {Promise<Array>} Data Array
         */
        async setDeviceNames(data, handle) {
            data = await mega.devices.data.setDeviceNames(data);
            for (const device of Object.values(M.dcd)) {
                device.name = data[device.h];
            }

            await mega.devices.tree.render();
            mega.devices.ui.filterChipUtils.reapplyCurrentFilter();
            mega.ui.mInfoPanel.reRenderIfVisible([handle]);
        }

        /**
         * Returns device and folder corresponding to handle
         * to be used only when current view is not device centre
         * @param {String} handle - Device handle
         * @returns {Promise<Object>} device and folder data
         */
        async getOuterViewData(handle) {
            if (!Object.keys(M.dcd).length) {
                await this.render(M.currentdirid, true);
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
                path.push(device.h);
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
         * Updates folder names accross devices
         * @param {MegaNode} node - node to update
         * @returns {void}
         */
        updateFolderName(node) {
            for (const device of Object.values(M.dcd)) {
                const folder = device.folders[node.h];
                if (folder) {
                    folder.name = node.name;
                }
            }
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
            if (M.currentrootid === rootId) {
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
            if (M.currentrootid === rootId) {
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
            if (M.currentrootid === rootId) {
                if (M.currentdirid === rootId) {
                    return 'device-centre-devices';
                }
                return M.dcd[M.currentCustomView.nodeID] ?
                    'device-centre-folders' :
                    'cloud-drive';
            }
            return 'cloud-drive';
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
            for (let i = 0; i < handles.length; i++) {
                const folder = this.getFolderInPath(M.getPath(handles[i]));
                if (folder && folder.isBackup) {
                    return true;
                }
            }
            return false;
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
            if (typeof appIsInstalled === 'undefined') {
                megasync.isInstalled((err, is) => {
                    appIsInstalled = !err || is;
                });
            }
            if (!this.hasDevices) {
                if (appIsInstalled) {
                    this.hideAppDlButtons();
                    this.hideFmHeaderAddButtons();
                    this.showEmptyActionButtons();
                }
                else {
                    this.showAppDlButtons();
                    this.hideFmHeaderAddButtons();
                    this.hideEmptyActionButtons();
                }
            }
            else if (this.isCustomRender()) {
                this.showFmHeaderAddButtons();
            }
        }

        /**
         * Shows device centre empty devices UI
         * @returns {void}
         */
        showNoDevices() {
            this.$gridWrapper.addClass('hidden');
            this.$empty.removeClass('hidden');
            megasync.isInstalled((err, is) => {
                const appFound = !err || is;
                const descText = appFound
                    ? l.dc_empty_desc_withapp
                    : l.dc_empty_desc_noapp;
                $('.fm-empty-description', this.$empty).safeHTML(descText);
                onIdle(clickURLs);
                this.handleAddBtnVisibility(appFound);
            });
        }

        /**
         * Shows the Add Backup & Add Sync header buttons
         * @returns {void}
         */
        showFmHeaderAddButtons() {
            this.$addBackup.removeClass('hidden');
            this.$addSyncs.removeClass('hidden');

        }

        /**
         * Hides the Add Backup & Add Sync header buttons
         * @returns {void}
         */
        hideFmHeaderAddButtons() {
            this.$addBackup.addClass('hidden');
            this.$addSyncs.addClass('hidden');
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
            )}-90`;

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

            $('.item-type-icon-90', $dialog)
                .attr('class',
                      `item-type-icon-90 ${deviceIconClass}`
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
            return Date.now() / 1000 - dcItem.status.lastHeartbeat <= hbActivityThreshold;
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
         * Boot tasks
         * - show / hide shimmer
         * - Load sources if necessary
         * - Fetches data
         * @param {Boolean} skipShimmer - whether to skip shimmer
         * @returns {Promise<void>} void
         */
        async _boot(skipShimmer) {
            const hasToFetch = !this.isLoading && Date.now() - this.lastReq > refreshMillis - 1000;

            if (hasToFetch && !skipShimmer && M.currentrootid === rootId) {
                this.isLoading = true;
                this.shimmer.show();
            }

            if (!('tree' in mega.devices)) {
                await Promise.resolve(M.require('devices'));
            }

            if (hasToFetch) {
                this.isLoading = true;
                return mega.devices.data.fetch()
                    .then((data) => {
                        M.dcd = typeof data === 'object' && data || Object.create(null);
                    })
                    .catch(dump)
                    .finally(() => {
                        this.isLoading = false;
                        this.lastReq = Date.now();
                        this.shimmer.hide();
                    });
            }

            this.isLoading = false;
            this.shimmer.hide();
        }
    };
});
