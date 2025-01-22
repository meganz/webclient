/**
 * UTILS for Device Centre
 *
 * Codebase to define common utilities for Device Centre
 * @property mega.devices.utils
 */
lazy(mega.devices, 'utils', () => {
    'use strict';

    const {
        /**
         * {Object} ui - Device center ui instance
         */
        ui,
    } = mega.devices;

    /**
     * {Object<MegaLogger>} logger - logger instance
     */
    const logger = new MegaLogger('devices', {
        throwOnAssertFail: true,
        printDate: 'rad' in mega,
        levelColors: {
            ERROR: `#f00000`,
            DEBUG: `#457bf0`,
            WARN: `#f09a00`,
            INFO: `#229944`,
            LOG: '#7e5b6a'
        }
    });

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

    return freeze({
        StatusUI,
        logger,
    });
});
