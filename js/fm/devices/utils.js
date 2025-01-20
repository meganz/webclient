/**
 * UTILS for Device Centre
 *
 * Codebase to define common utilities for Device Centre
 */

/**
 * Returns folder hearbeat timestamp or 0 as default
 * @param {Object} folder - folder to get heartbeat timestamp for
 * @returns {Number} - heartbeat timestamp
 */
function getFolderHeartbeat(folder) {
    'use strict';

    if (folder && folder.hb) {
        return Math.max(folder.hb.ts || 0, folder.hb.lts || 0);
    }
    return 0;
}

lazy(mega.devices, 'utils', () => {
    'use strict';

    const {
        /**
         * {Object} ui - Device center ui instance
         */
        ui,
    } = mega.devices;

    /**
     * {Object} section - contains sections constants
     */
    const section = {
        devices: 0,
        deviceFolders: 1,
        folderChildren: 2,
    };

    /**
     * {Object} deviceFolderType - contains device folder types constants
     */
    const deviceFolderType = {
        twoWay: 0,
        oneWayUp: 1,
        oneWayDown: 2,
        cameraUpload: 3,
        mediaUpload: 4,
        backup: 5,
    };

    /**
     * Renderisation of devices and folders status
     */
    const StatusUI = {
        /**
         * {Object} errorMessages - Error messages definition
         */
        errorMessages: {
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
        },

        /**
         * This handlers will be run sequentially and the first handler that returns true ("is" func) will be executed
         * Order of the handlers determines the result, please do NOT change the order unless absolutely necessary
         * {object[]} handlers - list of status handlers
         */
        handlers: [
            {
                is: (status) => {
                    return status.inProgressSyncs;
                },
                render: ({status, itemNode, iClass, isOnlyIcon}) => {
                    if (status.syncingPercs) {
                        const percsNode = mCreateElement('span', {'class': 'percs'}, itemNode);
                        mCreateElement(
                            'i',
                            {'class': `${iClass} sprite-fm-mono icon-sync in-progress rotating-animation`},
                            percsNode);

                        if (!isOnlyIcon) {
                            mCreateElement('span', {'class': 'status-text in-progress'}, percsNode)
                                .textContent = `${Math.floor(status.syncingPercs / status.inProgressSyncs)} %`;
                        }
                    }
                    else {
                        mCreateElement(
                            'i',
                            {'class': `${iClass} sprite-fm-mono icon-sync in-progress rotating-animation`},
                            itemNode);
                    }
                    if (!isOnlyIcon) {
                        mCreateElement(
                            'span',
                            {'class': 'status-text in-progress'},
                            itemNode).textContent = l.updating_status;
                    }
                },
            },
            {
                is: (status) => {
                    return status.scaningSyncs;
                },
                render: ({itemNode, iClass, isOnlyIcon}) => {
                    mCreateElement(
                        'i',
                        {'class': `${iClass} sprite-fm-mono icon-sync in-progress rotating-animation`},
                        itemNode);
                    if (!isOnlyIcon) {
                        mCreateElement(
                            'span',
                            {'class': 'status-text in-progress'},
                            itemNode).textContent = l.scanning_status;
                    }
                },
            },
            {
                is: (status) => {
                    return status.initializingSyncs;
                },
                render: ({itemNode, iClass, isOnlyIcon}) => {
                    mCreateElement(
                        'i',
                        {'class': `${iClass} sprite-fm-mono icon-sync in-progress rotating-animation`},
                        itemNode);
                    if (!isOnlyIcon) {
                        mCreateElement(
                            'span',
                            {'class': 'status-text in-progress'},
                            itemNode).textContent = l.initailizing_status;
                    }
                },
            },
            {
                is: (status) => {
                    return status.overquotaSyncs;
                },
                render: ({itemNode, iClass, isOnlyIcon}) => {
                    mCreateElement(
                        'i',
                        {'class': `${iClass} sprite-fm-mono error icon-cloud-storage-over-quota`},
                        itemNode);
                    if (!isOnlyIcon) {
                        mCreateElement(
                            'span',
                            {'class': 'status-text error'},
                            itemNode).textContent = l.out_of_quota;
                    }
                },
            },
            {
                is: (status) => {
                    return status.blockedSyncs;
                },
                render: ({status, itemNode, iClass, isDevice, isOnlyIcon, showBanner, skipBannerManagement}) => {
                    mCreateElement(
                        'i',
                        {'class': `${iClass} sprite-fm-mono error icon-close-component`},
                        itemNode);

                    const errorMessage = StatusUI.errorMessages[status.errorState];
                    let statusText = l.blocked_status;
                    if (status.errorState === 10) {
                        statusText = l.expired_account_state;
                    }
                    else if (errorMessage) {
                        statusText = l[1578];
                    }

                    if (!isOnlyIcon) {
                        mCreateElement(
                            'span',
                            {'class': 'status-text error'},
                            itemNode).textContent = statusText;
                        if (errorMessage) {
                            if (!skipBannerManagement) {
                                if (showBanner) {
                                    ui.notification.show(errorMessage);
                                }
                                else {
                                    ui.notification.hide();
                                }
                            }

                            if (!isDevice) {
                                mCreateElement('i', {
                                    'class': `${iClass}-tip sprite-fm-mono icon-info-filled tip-icon simpletip`,
                                    'data-simpletip': errorMessage,
                                    'data-simpletip-class': 'backup-tip',
                                    'data-simpletipposition': 'top',
                                    'data-simpletipoffset': 2
                                }, itemNode);
                            }
                        }
                    }
                },
            },
            {
                is: (status) => {
                    return status.stalledSyncs;
                },
                render: ({status, itemNode, isDevice, iClass, isOnlyIcon}) => {
                    mCreateElement(
                        'i',
                        {'class': `${iClass} sprite-fm-mono error icon-close-component`},
                        itemNode);
                    if (!isOnlyIcon) {
                        mCreateElement('span', {'class': 'status-text error'}, itemNode).textContent =
                            mega.icu.format(l.stalled_sync_state, isDevice ? status.stalledSyncs : 1);
                    }
                },
            },
            {
                is: (status) => {
                    return status.offlineSyncs;
                },
                render: ({status, itemNode, isDevice, iClass, isOnlyIcon}) => {
                    const daysNum = 7; // Max Offline days to show warning

                    // Show warning icon if last heartbeat was > 'daysNum' days ago
                    if (isDevice &&
                        (status.currentDate - status.lastHeartbeat * 1000) / (1000 * 3600 * 24) >= daysNum) {
                        mCreateElement('i', {
                            'class': `${iClass}-tip sprite-fm-uni icon-hazard simpletip`,
                            'data-simpletip': mega.icu.format(l.offline_device_tip, daysNum),
                            'data-simpletipposition': 'top',
                            'data-simpletipoffset': 2
                        }, itemNode);
                    }
                    mCreateElement(
                        'i',
                        {'class': `${iClass} sprite-fm-mono icon-offline`},
                        itemNode);
                    if (!isOnlyIcon) {
                        mCreateElement('span', {'class': 'status-text'}, itemNode).textContent = l[5926];
                    }
                }
            },
            {
                is: (status) => {
                    return status.disabledSyncs;
                },
                render: ({status, itemNode, iClass, isDevice, isOnlyIcon}) => {
                    mCreateElement(
                        'i',
                        {'class': `${iClass} sprite-fm-mono warning icon-disable`},
                        itemNode);
                    if (!isOnlyIcon) {
                        mCreateElement(
                            'span',
                            {'class': 'status-text warning'},
                            itemNode).textContent = l.backup_disabled_by_user;

                        if (!isDevice) {
                            mCreateElement('i', {
                                'class': `${iClass}-tip sprite-fm-mono icon-info-filled tip-icon simpletip`,
                                'data-simpletip': status.isMobile ? l.disabled_mobile_sync_tip : l.disabled_sync_tip,
                                'data-simpletip-class': 'backup-tip',
                                'data-simpletipposition': 'top',
                                'data-simpletipoffset': 2
                            }, itemNode);
                        }
                    }
                },
            },
            {
                is: (status) => {
                    return status.stoppedSyncs;
                },
                render: ({itemNode, iClass, isOnlyIcon}) => {
                    mCreateElement(
                        'i',
                        {'class': `${iClass} sprite-fm-mono icon-clear`},
                        itemNode);
                    if (!isOnlyIcon) {
                        mCreateElement('span', {'class': 'status-text'}, itemNode).textContent = l.backup_stopped;
                    }
                },
            },
            {
                is: (status) => {
                    return status.pausedSyncs;
                },
                render: ({itemNode, iClass, isOnlyIcon}) => {
                    mCreateElement(
                        'i',
                        {'class': `${iClass} sprite-fm-mono icon-pause`},
                        itemNode);
                    if (!isOnlyIcon) {
                        mCreateElement('span', {'class': 'status-text'}, itemNode).textContent = l[1651];
                    }
                },
            },
            {
                is: (status) => {
                    return status.upToDateSyncs;
                },
                render: ({status, itemNode, iClass, isDevice, isOnlyIcon, isHideSuccess}) => {
                    if (!isDevice && status.disabledSyncs) {
                        mCreateElement('i', {
                            'class': `${iClass}-tip sprite-fm-uni icon-hazard simpletip`,
                            'data-simpletip': mega.icu.format(l.device_attention_tip, status.disabledSyncs),
                            'data-simpletipposition': 'top',
                            'data-simpletipoffset': 2
                        }, itemNode);
                    }

                    if (!isHideSuccess || status.disabledSyncs) {
                        mCreateElement(
                            'i',
                            {'class': `${iClass} sprite-fm-mono icon-check-circle success`},
                            itemNode);
                    }

                    if (!isOnlyIcon) {
                        mCreateElement(
                            'span',
                            {'class': 'status-text success'},
                            itemNode).textContent = l.up_to_date_status;
                    }
                },
            },
        ],

        /**
         * Returns status handler for given status
         * Fault tolerant, returns default empty handler and writes warning log trace if no matching handler found
         * This allows handler to be called in a "fluent" fashion: StatusUI.get(status).render({...})
         * @param {Object} status object
         * @returns {Object} status handler object
         */
        get: (status) => {
            if (status) {
                for (let i = 0; i < StatusUI.handlers.length; i++) {
                    const handler = StatusUI.handlers[i];
                    if (handler.is(status)) {
                        return handler;
                    }
                }
            }
            return {render: () => {
                console.warn(`StatusUI: No matching status handler found for status: ${status}`);
            }};
        }
    };

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
                    return folder.t === deviceFolderType.twoWay && folder.syncState >= 5 ||
                        (folder.t === deviceFolderType.oneWayUp || folder.t >= deviceFolderType.cameraUpload) &&
                        (folder.syncState === 5 || folder.syncState === 7) ||
                        folder.t === deviceFolderType.oneWayDown && folder.syncState >= 6;
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
            status.isMobile = folder.t === deviceFolderType.cameraUpload ||
                folder.t === deviceFolderType.mediaUpload;

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
    const ApiDataParser = {
        /**
         * Parses API formatted folders data to build application devices and folders out of it
         * and stores data in M.dcd
         * @param {Object} apiFolders - API formatted devices folders data
         * @param {Object} apiDeviceNames - API formatted device names data
         * @returns {void}
         */
        parse(apiFolders, apiDeviceNames) {
            M.dcd = Object.create(null);

            let deviceStatus;

            apiFolders.sort((a, b) => a.d.localeCompare(b.d));

            for (let i = 0; i < apiFolders.length; i++) {
                const apiFolder = apiFolders[i];
                apiFolder.syncState = apiFolder.s;
                delete apiFolder.s;

                const node = M.getNodeByHandle(apiFolder.h);
                if (node) {
                    let device = M.dcd[apiFolder.d];
                    if (device) {
                        const deviceTs = device.hb && device.hb.ts ? device.hb.ts : 0;
                        const apiFolderTs = apiFolder.hb && apiFolder.hb.ts ? apiFolder.hb.ts : 0;
                        const hb = deviceTs > apiFolderTs ? device.hb : apiFolder.hb || {};

                        device.props = {
                            // Reset the device parent folder handle if folder is not a backup
                            p: apiFolder.t === deviceFolderType.backup ? device.p : '',
                            // Set device type as "Backup" if device contains both Sync and Backups folders
                            t: Math.max(device.t, apiFolder.t),
                            hb,
                        };
                    }
                    else {
                        device = ApiDataParser._buildDevice(apiFolder, apiDeviceNames, node);
                        M.dcd[device.h] = device;
                        deviceStatus = null;
                    }

                    device.props = ApiDataParser._buildStorageStats(device, node);

                    // keep only the latest one in case duplicated folders in the same device
                    const deviceFolder = device.folders[apiFolder.h];
                    if (!deviceFolder || getFolderHeartbeat(apiFolder) > getFolderHeartbeat(deviceFolder)) {
                        const folder = ApiDataParser._buildDeviceFolder(apiFolder, node);
                        device.folders[folder.h] = folder;
                        deviceStatus = deviceStatus ? StatusBuilder.build(folder, deviceStatus) : {...folder.status};
                        deviceStatus.syncsNumber += 1;
                        device.props = {status: deviceStatus};
                    }
                }
            }
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
            if (t === deviceFolderType.cameraUpload ||
                t === deviceFolderType.mediaUpload) {
                props.icon = 'folder-camera-uploads';
                props.typeText = l.camera_uploads;
            }
            else if (t === deviceFolderType.backup) {
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
         * {Object} section - contains sections constants
         */
        section,

        /**
         * {Object} deviceFolderType - contains device folder types constants
         */
        deviceFolderType,

        /**
         * {StatusUI} StatusUI - Status UI handler
         */
        StatusUI,

        /**
         * {ApiDataParser} ApiDataParser - API data parser
         */
        ApiDataParser,

        /**
         * {Object<MegaLogger>} logger - logger instance
         */
        logger: new MegaLogger('devices', {
            throwOnAssertFail: true,
            printDate: 'rad' in mega,
            levelColors: {
                ERROR: `#f00000`,
                DEBUG: `#457bf0`,
                WARN: `#f09a00`,
                INFO: `#229944`,
                LOG: '#7e5b6a'
            }
        }),
    });
});
