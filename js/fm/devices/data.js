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
     * Returns folder hearbeat timestamp or 0 as default
     * @param {Object} folder - folder to get heartbeat timestamp for
     * @returns {Number} - heartbeat timestamp
     */
    const getFolderHeartbeat = (folder) => {
        return folder && folder.hb ? Math.max(folder.hb.ts || 0, folder.hb.lts || 0) : 0;
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
                    return !folder.syncState;
                },
                run: ({status}) => {
                    status.stoppedSyncs++;
                }
            },
            {
                is: ({folder}) => {
                    // folder status temporary disabled and
                    // (folder sub state having no error or heartbeat state inactive)
                    if (folder.syncState === 3 && (folder.ss === 0 || folder.hb.s === 4)) {
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
                    status.pausedSyncs++;
                }
            },
            {
                is: ({folder}) => {
                    return folder.syncState === 2 || folder.syncState === 3;
                },
                run: ({status, folder}) => {
                    status.blockedSyncs++;
                    status.errorState = folder.ss;

                    if (folder.ss === 9) {
                        status.overquotaSyncs++;
                    }
                }
            },
            {
                is: ({folder}) => {
                    return folder.hb && folder.hb.s === 6;
                },
                run: ({status}) => {
                    status.stalledSyncs++;
                }
            },
            {
                is: ({folder}) => {
                    return folder.syncState === 4;
                },
                run: ({status}) => {
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
                    status.upToDateSyncs++;
                }
            },
            {
                is: ({folder}) => {
                    return folder.hb && folder.hb.s === 5;
                },
                run: ({status}) => {
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
                    status.syncingPercs += folder.hb.p;
                    status.inProgressSyncs++;
                }
            },
            {
                is: ({folder}) => {
                    return folder.hb && folder.hb.s === 3;
                },
                run: ({status}) => {
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
                status.isMobile = status.isMobile || folder.status.isMobile;
                status.lastHeartbeat = Math.max(
                    folder.status.lastHeartbeat,
                    status.lastHeartbeat
                );
            }
            else {
                status = {
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
                    'syncsNumber': 0,
                    'upToDateSyncs': 0
                };
            }

            let folderHeartbeat = 0;
            let timeDifference = 0;

            // Detect Mobile device
            status.isMobile = folder.t === syncType.cameraUpload ||
                folder.t === syncType.mediaUpload;

            // Get folder hearbeat and save latest timestamp
            if (folder.hb) {

                // Get latest backup heartbeat
                folderHeartbeat = getFolderHeartbeat(folder);

                // Set latest device heartbeat
                status.lastHeartbeat = Math.max(
                    folderHeartbeat,
                    status.lastHeartbeat
                );
            }

            // How much time has passed since the last interaction
            timeDifference = (status.currentDate - folderHeartbeat * 1000) / (1000 * 60);

            const handler = StatusBuilder.get({status, folder, folderHeartbeat, timeDifference});
            if (handler) {
                handler.run({status, folder});
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
         * @param {Object} apiFolders - API formatted devices folders data
         * @param {Object} apiDeviceNames - API formatted device names data
         * @returns {Object} Parsed data
         */
        parse(apiFolders, apiDeviceNames) {
            const data = Object.create(null);

            let deviceStatus;

            apiFolders.sort((a, b) => a.d.localeCompare(b.d));

            for (let i = 0; i < apiFolders.length; i++) {
                const apiFolder = apiFolders[i];
                apiFolder.syncState = apiFolder.s;
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
                        device = Parser._buildDevice(apiFolder, apiDeviceNames, node);
                        data[device.h] = device;
                        deviceStatus = null;
                    }

                    device.props = Parser._buildStorageStats(device, node);

                    // keep only the latest one in case duplicated folders in the same device
                    const deviceFolder = device.folders[apiFolder.h];
                    if (!deviceFolder ||
                        getFolderHeartbeat(apiFolder) > getFolderHeartbeat(deviceFolder)) {
                        const folder = Parser._buildDeviceFolder(apiFolder, node);
                        device.folders[folder.h] = folder;
                        deviceStatus = deviceStatus ? StatusBuilder.build(folder, deviceStatus) : {...folder.status};
                        deviceStatus.syncsNumber += 1;
                        device.props = {status: deviceStatus};
                    }
                }
            }

            return data;
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
         * Builds a device object from API formatted device data and node
         * @param {Object} apiFolder - API formatted device folder data
         * @param {Object} apiDeviceNames = API formatted device names data
         * @param {MegaNode} node - node associated with the apiFolder
         * @returns {DeviceCentreDevice} device object
         */
        _buildDevice(apiFolder, apiDeviceNames, node) {
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
        _buildDeviceFolder(apiFolder, node) {
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
            };

            return folder;
        },
    };

    return freeze({
        /**
         * Fetches Device Centre data
         * @returns {Promise<Object>} Device Centre data
         */
        fetch: async() => {
            let [deviceNames, {result: folders}] = await Promise.all([
                mega.attr.get(u_handle, 'dn', false, true),
                api.req({a: 'sf'})
            ]);

            if (deviceNames && folders) {
                deviceNames = mega.attr.decodeObjectValues(deviceNames);

                const handles = new Set();
                for (let i = 0; i < folders.length; i++) {
                    const handle = folders[i].h;
                    if (!M.c[handle]) {
                        handles.add(handle);
                    }
                }

                const {utils} = mega.devices;
                if (handles.size) {
                    utils.logger.debug('mega.devices.data.fetch dbfetch.get', handles);
                    await dbfetch.geta([...handles]);
                }

                const data = Parser.parse(folders, deviceNames);
                utils.logger.debug('mega.devices.data.fetch data', data);
                return data;
            }
        },

        /**
         * Sets Device Centre device names
         * @param {Object} data - Device names
         * @returns {Promise<Object>} device names encoded
         */
        setDeviceNames: async(data) => {
            data = mega.attr.encodeObjectValues(data);
            await mega.attr.set('dn', data, false, true);

            mega.devices.utils.logger.debug('mega.devices.data.setDeviceNames', data);
            return data;
        },
    });
});
