/**
 * Device Centre UI
 *
 * Codebase to interact with device centre UI
 *
 * @property mega.devices.data
 */
lazy(mega.devices, 'data', () => {
    'use strict';

    /**
     * {Number} maxDaysNoActivity - maximum number of days a device with no activity is yet considered active
     */
    const maxDaysNoActivity = 60;

    /**
     * Returns true if device is active based on last heartbeat timestamp
     * @param {Number} hb last heartbeat timestamp
     * @returns {Boolean} - true if device is inactive
     */
    const isActive = (hb) => {
        const threshold = maxDaysNoActivity * 24 * 60 * 60;
        return Date.now() / 1000 - hb <= threshold;
    };

    /**
     * Returns dcItem hearbeat timestamp or 0 as default
     * @param {Object} dcItem - dcItem to get heartbeat timestamp for
     * @returns {Number} - heartbeat timestamp
     */
    const getHeartbeat = (dcItem) => {
        return dcItem && dcItem.hb ? Math.max(dcItem.hb.ts || 0, dcItem.hb.lts || 0) : 0;
    };

    const {
        models: {
            /**
             * {Object} syncType - contains device folder types constants
             */
            syncType,

            /**
             * {DeviceCentreDevice} DeviceCentreDevice - Device centre device model
             */
            DeviceCentreDevice,

            /**
             * {DeviceCentreFolder} DeviceCentreFolder - Device centre device folder model
             */
            DeviceCentreFolder,
        },

        utils: {

            /**
             * {Timer} timer - Instance of timer
             */
            timer,

            /**
             * {Object} folderStatusPriority - Status priorities definition
             */
            folderStatusPriority,
        }
    } = mega.devices;

    /**
     * Builds devices and folders status information
     */
    const StatusBuilder = {
        /**
         * This handlers will be run sequentially and the first handler that returns true ("is" func) will be executed
         * Order of the handlers determines the result, please do NOT change the order unless absolutely necessary
         * {object[]} handlers - list of handlers
         */
        handlers: [
            {
                is: ({folder}) => {
                    return M.getNodeRoot(folder.h) === M.RubbishID;
                },
                run: ({status}) => {
                    if (!status.priority || status.priority > folderStatusPriority.error) {
                        status.priority = folderStatusPriority.error;
                    }
                    status.blockedSyncs++;
                    status.errorState = 20;
                }
            },
            {
                is: ({folder}) => {
                    return !folder.syncState;
                },
                run: ({status}) => {
                    if (!status.priority || status.priority > folderStatusPriority.error) {
                        status.priority = folderStatusPriority.error;
                    }
                    status.stoppedSyncs++;
                }
            },
            {
                is: ({folder}) => {
                    // folder status temporary disabled and
                    // (folder sub state having no error or heartbeat state inactive)
                    if (folder.syncState === 3 && (folder.ss === 0 || folder.hb.s === 4)) {

                        // use case: paused shared syncs with permissions error
                        // API response tells that these folders are paused
                        // but for better UX will be shown as shared sync permissions error
                        if (sharer(folder.h) && M.getNodeRights(folder.h) < 2) {
                            folder.ss = 14; // set shared sync permissions error
                            return false;
                        }
                        return true;
                    }

                    // if TWOWAY sync and any transfer type is paused
                    // or if ONEWAY_UP/CU/MU/Backup and uploads/all transfers are paused
                    // or if ONEWAY_DOWN and downloads/all transfers are paused
                    return folder.t === syncType.twoWay && folder.syncState >= 5 ||
                        (folder.t === syncType.oneWayUp || folder.t >= syncType.cameraUpload) &&
                        (folder.syncState === 5 || folder.syncState === 7) ||
                        folder.t === syncType.oneWayDown && folder.syncState >= 6;
                },
                run: ({status}) => {
                    if (!status.priority || status.priority > folderStatusPriority.disabled) {
                        status.priority = folderStatusPriority.disabled;
                    }
                    status.pausedSyncs++;
                }
            },
            {
                is: ({folder}) => {
                    return folder.syncState === 2 || folder.syncState === 3;
                },
                run: ({status, folder}) => {
                    if (!status.priority || status.priority > folderStatusPriority.error) {
                        status.priority = folderStatusPriority.error;
                    }

                    status.errorState = folder.ss;

                    if (folder.ss === 9) {
                        status.overquotaSyncs++;
                    }
                    else {
                        status.blockedSyncs++;
                    }
                }
            },
            {
                is: ({folder}) => {
                    return folder.hb && folder.hb.s === 6;
                },
                run: ({status}) => {
                    if (!status.priority || status.priority > folderStatusPriority.error) {
                        status.priority = folderStatusPriority.error;
                    }
                    status.stalledSyncs++;
                }
            },
            {
                is: ({folder}) => {
                    return folder.syncState === 4;
                },
                run: ({status}) => {
                    if (!status.priority || status.priority > folderStatusPriority.disabled) {
                        status.priority = folderStatusPriority.disabled;
                    }
                    status.disabledSyncs++;
                }
            },
            {
                is: ({status, folderHeartbeat, timeDifference}) => {
                    // if there is no heartbeat
                    // or last CU/MU heartbeat was > 1h ago
                    // or last Sync/backup heartbeat was > 30mins ago
                    return !folderHeartbeat || status.isMobile && timeDifference > 60
                        || !status.isMobile && timeDifference > 30;
                },
                run: ({status, folder}) => {
                    // Offline Sync
                    // Set Offline only if MEGA folder does not exist
                    // or if MEGA folder was created > 10mins ago
                    if (!M.d[folder.h]
                        || (status.currentDate - M.d[folder.h].ts * 1000) / (1000 * 60) > 10) {
                        if (!status.priority || status.priority > folderStatusPriority.error) {
                            status.priority = folderStatusPriority.error;
                        }
                        status.offlineSyncs++;
                    }
                }
            },
            {
                is: ({folder}) => {
                    // Check Sync heartbeat statuses:
                    // 1 - Up to date: local and remote paths are in sync
                    // 2 - The sync engine is working, transfers are in progress (will be detected by folder.hb.p)
                    // 3 - The sync engine is working, e.g: scanning local folders
                    // 4 - Sync is not active. A state != ACTIVE should have been sent through '''sp'''
                    // 5 - Unknown status
                    // 6 - Stalled: indicates the user needs to intervene
                    //              due to something the sync can't decide for them
                    return (folder.syncState === 1 || folder.syncState >= 5) &&
                        (!folder.hb || folder.hb && (folder.hb.s === 1 || folder.hb.s === 4));
                },
                run: ({status}) => {
                    // Up to date
                    // if working fine or unrelated transfer type is paused
                    // and there is no heartbeat state or Up to date/unknown/not active
                    if (!status.priority || status.priority > folderStatusPriority.success) {
                        status.priority = folderStatusPriority.success;
                    }
                    status.upToDateSyncs++;
                }
            },
            {
                is: ({folder}) => {
                    return folder.hb && folder.hb.s === 5;
                },
                run: ({status}) => {
                    if (!status.priority || status.priority > folderStatusPriority.updating) {
                        status.priority = folderStatusPriority.updating;
                    }
                    status.initializingSyncs++;
                }
            },
            {
                is: ({folder}) => {
                    return folder.hb && folder.hb.s === 2;
                },
                run: ({status, folder}) => {
                    // Syncing. If 'p' value exitsts in backup, then the sync engine is working
                    // If it doesn't not exist, then we think that backup if synced
                    // as rest states will be filtered before
                    if (!status.priority || status.priority > folderStatusPriority.updating) {
                        status.priority = folderStatusPriority.updating;
                    }
                    status.syncingPercs += folder.hb.p;
                    status.inProgressSyncs++;
                }
            },
            {
                is: ({folder}) => {
                    return folder.hb && folder.hb.s === 3;
                },
                run: ({status}) => {
                    if (!status.priority || status.priority > folderStatusPriority.updating) {
                        status.priority = folderStatusPriority.updating;
                    }
                    status.scaningSyncs++;
                }
            },
        ],

        /**
         * Returns status builder handler for given parameters
         * @param {Object} data object
         * @param {Object} data.status - status object
         * @param {Object} data.folder - api data folder object
         * @param {Number} data.folderHeartbeat - folder heartbeat ts
         * @param {Number} data.timeDifference - current data - folder heartbeat
         * @returns {Object} status builder handler object
         */
        get: ({status, folder, folderHeartbeat, timeDifference}) => {
            for (let i = 0; i < StatusBuilder.handlers.length; i++) {
                const handler = StatusBuilder.handlers[i];
                if (handler.is({status, folder, folderHeartbeat, timeDifference})) {
                    return handler;
                }
            }
        },

        /**
         * Calculates and return device folder status
         * @param {Object} folder - API formatted folder data
         * @param {Object} status - current status object
         * @returns {Object} updated status object
         */
        build: (folder, status) => {
            if (status) {
                status.errorState = status.errorState || folder.status.errorState;
                status.isDevice = status.isDevice || folder.status.isDevice;
                status.isMobile = status.isMobile || folder.status.isMobile;
            }

            status = {
                'currentDate': Date.now(),
                'inactiveSyncs': 0,
                'blockedSyncs': 0,
                'disabledSyncs': 0,
                'errorState': undefined,
                'initializingSyncs': 0,
                'inProgressSyncs': 0,
                'isDevice': false,
                'isMobile': false,
                'lastHeartbeat': 0,
                'offlineSyncs': 0,
                'overquotaSyncs': 0,
                'pausedSyncs': 0,
                'scaningSyncs': 0,
                'stalledSyncs': 0,
                'stoppedSyncs': 0,
                'syncingPercs': 0,
                'syncsNumber': 0,
                'upToDateSyncs': 0,
                ...status,
            }

            let folderHeartbeat = 0;
            let timeDifference = 0;

            // Detect Mobile device
            status.isMobile = folder.t === syncType.cameraUpload ||
                folder.t === syncType.mediaUpload;

            // Get folder hearbeat
            if (folder.hb) {
                folderHeartbeat = getHeartbeat(folder);
                status.lastHeartbeat = status.lastHeartbeat ?
                    Math.max(
                        folderHeartbeat,
                        status.lastHeartbeat
                    ) : folderHeartbeat;
            }

            // How much time has passed since the last interaction
            timeDifference = (status.currentDate - folderHeartbeat * 1000) / (1000 * 60);

            const handler = StatusBuilder.get({status, folder, folderHeartbeat: status.lastHeartbeat, timeDifference});
            if (handler) {
                handler.run({status, folder});
            }

            if (!isActive(Math.min(status.lastHeartbeat, folderHeartbeat))) {
                status.inactiveSyncs++;
            }

            return status;
        },
    };

    /**
     * Parses API formatted data to application format
     */
    const Parser = {
        /**
         * Returns API formatted folders data to build application devices and folders out of it
         * Also returns outdated (updated / deleted) folders that might be used
         * to render only those outdated folders in the UI instead rendering all folders
         * @param {Object} apiFolders - API formatted devices folders data
         * @param {Object} apiDeviceNames - API formatted device names data
         * @param {Object} currentData - current Device Centre data
         * @returns {Object} device centre data + outdated handles
         */
        parse(apiFolders, apiDeviceNames, currentData) {
            timer.start('mega.devices.data.Parser.parse');

            // Set to track folders that have been added to devices
            const foldersAddedSet = new Set();

            // Object containing devices and folders data
            const data = Object.create(null);

            // Array to hold folders that are outdated (updated / deleted)
            const outdated = [];

            let deviceStatus;

            // sort api folders by device name and most recent heartbeat timestamp
            apiFolders.sort((a, b) => a.d.localeCompare(b.d) || getHeartbeat(b) - getHeartbeat(a));

            for (let i = 0; i < apiFolders.length; i++) {
                const apiFolder = {...apiFolders[i], syncState: apiFolders[i].s};
                delete apiFolder.s;

                const node = M.getNodeByHandle(apiFolder.h);
                if (node) {
                    let device = data[apiFolder.d];
                    if (device) {
                        const deviceTs = device.hb && device.hb.ts ? device.hb.ts : 0;
                        const apiFolderTs = apiFolder.hb && apiFolder.hb.ts ? apiFolder.hb.ts : 0;
                        const hb = deviceTs > apiFolderTs ? device.hb : apiFolder.hb || {};

                        device.props = {
                            // Reset the device parent folder handle if folder is not a backup
                            p: apiFolder.t === syncType.backup ? device.p : '',
                            // Set device type as "Backup" if device contains both Sync and Backups folders
                            t: Math.max(device.t, apiFolder.t),
                            hb,
                        };
                    }
                    else {
                        device = Parser.buildDevice(apiFolder, apiDeviceNames, node);
                        data[device.h] = device;
                        deviceStatus = null;
                    }

                    // keep only the latest one (first appearance) in case duplicated folders in the same device
                    const deviceFolder = device.folders[apiFolder.h];
                    if (!deviceFolder) {
                        device.props = Parser._buildStorageStats(device, node);

                        const folder = Parser.buildDeviceFolder(apiFolder, node);
                        device.folders[folder.h] = folder;

                        foldersAddedSet.add(`${folder.d}:${folder.h}`);
                        Parser._outdatedByChecksum(currentData, outdated, device, folder);

                        deviceStatus = StatusBuilder.build(folder, deviceStatus || {isDevice: true});
                        deviceStatus.syncsNumber += 1;

                        if (getHeartbeat(apiFolder) > getHeartbeat(device)) {
                            device.props = {hb: apiFolder.hb};
                        }

                        device.props = {
                            status: deviceStatus,
                        };
                    }
                }
            }

            Parser._outdatedByDeleted(currentData, outdated, foldersAddedSet);

            timer.stop('mega.devices.data.Parser.parse');
            return {data, outdated};
        },

        /**
         * Builds a device object from API formatted device data and node
         * @param {Object} apiFolder - API formatted device folder data
         * @param {Object} apiDeviceNames = API formatted device names data
         * @param {MegaNode} node - node associated with the apiFolder
         * @returns {DeviceCentreDevice} device object
         */
        buildDevice(apiFolder, apiDeviceNames, node) {
            const {d, t, dua, hb} = apiFolder;
            const name = apiDeviceNames && apiDeviceNames[d] ? apiDeviceNames[d] : l.device_no_name;

            const device = new DeviceCentreDevice(d);
            device.props = {
                name, t, dua, hb,
                // Reset the device parent folder handle if folder is not a backup
                p: t === 5 && node.p ? node.p : '',
                icon: deviceIcon(dua || name, t),
            };

            return device;
        },

        /**
         * Builds a device folder from API formatted device data and node
         * @param {Object} apiFolder - API formatted device folder data
         * @param {MegaNode} node - node associated with the apiFolder
         * @returns {DeviceCentreFolder} device folder object
         */
        buildDeviceFolder(apiFolder, node) {
            const {id, d, syncState, ss, t, hb} = apiFolder;
            const {h, name, ts, tb, td, tf} = node;

            const folder = new DeviceCentreFolder(d, h);
            folder.props = {name, ts, tb, td, tf, id, syncState, ss, t, hb};

            const props = {};
            if (t === syncType.cameraUpload ||
                t === syncType.mediaUpload) {
                props.icon = 'folder-camera-uploads';
                props.typeText = l.camera_uploads;
            }
            else if (t === syncType.backup) {
                props.icon = 'folder-backup';
                props.typeText = l[20606];
            }
            else {
                props.icon = 'folder-sync';
                props.typeText = l[17621];
            }

            folder.props = {
                ...props,
                status: StatusBuilder.build(apiFolder),
                checksum: wchecksum(JSON.stringify(apiFolder), 0x4ef5391b),
            };

            return folder;
        },

        /**
         * Build StorageStats object from device and node
         * @param {DeviceCentreDevice} device - device object
         * @param {MegaNode} node - node object
         * @returns {Object} StorageStats object
         */
        _buildStorageStats(device, node) {
            return {
                td: (device.td || 0) + (node.td || 0) + 1,
                tf: (device.tf || 0) + (node.tf || 0),
                tb: (device.tb || 0) + (node.tb || 0)
            };
        },

        /**
         * Updates outdated handles checking deleted folders
         * @param {Object} currentData - current Device Centre data
         * @param {Array<Object>} outdated - outdated handles
         * @param {Set<String>} foldersAddedSet - folders added set 'device_id:folder_handle'
         * @returns {void} void
         */
        _outdatedByDeleted(currentData, outdated, foldersAddedSet) {
            for (const {h: device, folders} of Object.values(currentData)) {
                for (const {h: folder} of Object.values(folders)) {
                    if (!foldersAddedSet.has(`${device}:${folder}`)) {
                        outdated.push({device, folder});
                    }
                }
            }
        },

        /**
         * Updates outdated handles checking outdated folders by comparing checksum
         * @param {Object} currentData - current Device Centre data
         * @param {Array<Object>} outdated - outdated handles
         * @param {DeviceCentreDevice} device - device object
         * @param {DeviceCentreFolder} folder - folder object
         * @returns {void} void
         */
        _outdatedByChecksum(currentData, outdated, device, folder) {
            const currentFolder = currentData
                && currentData[device.h]
                && currentData[device.h].folders
                && currentData[device.h].folders[folder.h];

            if (currentFolder && currentFolder.checksum !== folder.checksum) {
                outdated.push({device: device.h, folder: folder.h});
            }
        }
    };

    /**
     * Returns a list of backup folders not included in "handlesExcluded" list
     * @param {Array<String>} handlesExcluded - list of handles to exclude from result
     * @returns {Array<Object>} backup folders data
     */
    const getStoppedBackups = (handlesExcluded) => {
        const backups = [];
        const deviceHandles = Object.keys(M.tree[M.BackupsId] || {});

        for (let i = 0; i < deviceHandles.length; i++) {
            const deviceNode = M.d[deviceHandles[i]] || {};
            const deviceHandle = deviceNode.devid || deviceNode.drvid;

            if (deviceHandle) {
                const backupHandles = Object.keys(M.tree[deviceHandles[i]] || {});

                for (let j = 0; j < backupHandles.length; j++) {
                    if (!handlesExcluded.includes(backupHandles[j])) {
                        backups.push({
                            d: deviceHandle,
                            h: backupHandles[j],
                            t: mega.devices.models.syncType.backup
                        });
                    }
                }
            }
        }

        return backups;
    };

    return freeze({
        /**
         * {Number} maxDaysNoActivity - maximum number of days a device with no activity is yet considered active
         */
        maxDaysNoActivity,

        /**
         * {Parser} Parser - Parses API formatted data to application format
         */
        Parser,

        /**
         * {Function} isActive - Checks if device is active
         */
        isActive,

        /**
         * Fetches Device Centre data
         * @param {Object} currentData - current Device Centre data
         * @returns {Promise<Object>} device centre data + outdated handles
         */
        fetch: async(currentData) => {
            const {utils} = mega.devices;
            timer.start('mega.devices.data.fetch');

            let [deviceNames, {result: folders}] = await Promise.all([
                mega.attr.get(u_handle, 'dn', false, true),
                api.req({a: 'sf'})
            ]);

            let res = {};

            const stoppedBackups = getStoppedBackups(folders
                .filter((f) => f.t === mega.devices.models.syncType.backup)
                .map((f) => f.h));

            folders = [...folders, ...stoppedBackups];

            if (deviceNames && folders) {
                deviceNames = mega.attr.decodeObjectValues(deviceNames);

                const handles = new Set();
                for (let i = 0; i < folders.length; i++) {
                    const handle = folders[i].h;
                    if (!M.c[handle]) {
                        handles.add(handle);
                    }
                }

                if (handles.size) {
                    utils.logger.debug('mega.devices.data.fetch dbfetch.get', handles);
                    await dbfetch.geta([...handles]);
                }

                const {data, outdated} = Parser.parse(folders, deviceNames, currentData);
                utils.logger.debug('mega.devices.data.fetch data', data);
                utils.logger.debug('mega.devices.data.fetch outdated', outdated);
                res = {data, outdated};
            }

            timer.stop('mega.devices.data.fetch');
            return res;
        },

        /**
         * Sets Device Centre device names
         * @param {Object} data - device names
         * @returns {Promise<void>} void
         */
        setDeviceNames: (data) => {
            mega.devices.utils.logger.debug('mega.devices.data.setDeviceNames', data);
            mega.attr.set('dn', mega.attr.encodeObjectValues(data), false, true);
        },
    });
});
