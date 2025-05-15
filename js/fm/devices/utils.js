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
     * Timer
     * Handles logger timers
     */
    class Timer {
        constructor() {
            this.timers = new Set();
        }

        start(label) {
            if (!this.timers.has(label)) {
                logger.time(label);
                this.timers.add(label);
            }
        }

        stop(label) {
            if (this.timers.has(label)) {
                logger.timeEnd(label);
                this.timers.delete(label);
            }
        }
    }

    /**
     * {Object} errorMessages - Error messages definition
     */
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

    /**
     * {Object} StatusElements - utilities to create status UI elements
     */
    const StatusElements = {
        icon: (itemNode, iClass, iconClass) => {
            mCreateElement(
                'i',
                {'class': `${iClass} sprite-fm-mono ${iconClass}`},
                itemNode);
        },
        text: (itemNode, textClass, text) => {
            mCreateElement(
                'span',
                {'class': `status-text ${textClass}`},
                itemNode).textContent = text;
        },
        tooltip: (itemNode, iClass, text, {isWarning} = {}) => {
            const iconClass = isWarning ?
                'sprite-fm-uni icon-hazard simpletip' :
                'sprite-fm-mono icon-info-filled tip-icon simpletip';

            mCreateElement('i', {
                'class': `${iClass}-tip ${iconClass}`,
                'data-simpletip': text,
                'data-simpletipposition': 'top',
                'data-simpletipoffset': 2
            }, itemNode);
        }
    };

    /**
     * {Object} folderStatusPriority - Sync folders status priority definition
     */
    const folderStatusPriority = {
        error: 1,
        disabled: 2,
        updating: 3,
        success: 4,
    };

    /**
     * {Object} priorityHandlers - definition for priority based handlers to create Status UI elements
     */
    const priorityHandlers = {
        inactive: ({itemNode, iClass}) => {
            StatusElements.icon(itemNode, iClass, 'error icon-close-component');
            StatusElements.text(itemNode, 'error', l.dc_inactive);
        },
        error: ({status, itemNode, iClass, isDevice, showBanner, skipBannerManagement}) => {
            let iconClass = '';
            let text = '';
            let textClass = '';
            let tooltip = '';

            if (status.overquotaSyncs) {
                iconClass = 'error icon-cloud-storage-over-quota';
                textClass = 'error';
                text = l.out_of_quota;
            }
            else if (status.blockedSyncs) {
                iconClass = 'error icon-close-component';
                textClass = 'error';

                const errorMessage = errorMessages[status.errorState];
                tooltip = errorMessage;

                if (status.errorState === 10) {
                    text = l.expired_account_state;
                }
                else if (errorMessage) {
                    text = l[1578];
                }
                else {
                    text = l.blocked_status;
                }

                if (!skipBannerManagement && errorMessage) {
                    if (showBanner) {
                        ui.notification.show(errorMessage);
                    }
                    else {
                        ui.notification.hide();
                    }
                }
            }
            else if (status.stalledSyncs) {
                iconClass = 'error icon-close-component';
                textClass = 'error';
                text = mega.icu.format(l.stalled_sync_state, isDevice ? status.stalledSyncs : 1);
            }
            else if (status.offlineSyncs) {
                iconClass = 'icon-offline';
                text = l[5926];

                if (status.isMobile) {
                    tooltip = l.dc_check_mobile_app_tip;
                }
            }
            else if (status.stoppedSyncs) {
                iconClass = 'icon-clear';
                text = l.backup_stopped;
            }

            if (iconClass) {
                StatusElements.icon(itemNode, iClass, iconClass);
            }
            if (text) {
                StatusElements.text(itemNode, textClass, text);
            }
            if (tooltip && !isDevice) {
                StatusElements.tooltip(itemNode, iClass, tooltip);
            }
        },
        attention: ({itemNode, iClass}) => {
            StatusElements.icon(itemNode, iClass, 'error icon-alert-triangle-thin-outline');
            StatusElements.text(itemNode, 'error', l.dc_attention_needed);
            StatusElements.tooltip(itemNode, iClass, l.dc_attention_needed_tip);
        },
        disabled: ({status, itemNode, iClass, isDevice}) => {
            let iconClass = '';
            let text = '';
            let textClass = '';
            let tooltip = '';

            if (status.pausedSyncs) {
                iconClass = 'icon-pause';
                text = l[1651];

                if (status.isMobile) {
                    tooltip = l.dc_check_mobile_app_tip;
                }
            }
            else if (status.disabledSyncs) {
                iconClass = 'warning icon-disable';
                text = l.backup_disabled_by_user;
                textClass = 'warning';
                tooltip = status.isMobile ? l.disabled_mobile_sync_tip : l.disabled_sync_tip;
            }

            if (iconClass) {
                StatusElements.icon(itemNode, iClass, iconClass);
            }
            if (text) {
                StatusElements.text(itemNode, textClass, text);
            }
            if (tooltip && !isDevice) {
                StatusElements.tooltip(itemNode, iClass, tooltip);
            }
        },
        updating: ({status, itemNode, iClass}) => {
            let text = '';
            let skipStdIcon = false;
            if (status.inProgressSyncs) {
                text = l.updating_status;

                if (status.syncingPercs) {
                    skipStdIcon = true;
                    const percentageNode = mCreateElement('span', {'class': 'percs'}, itemNode);
                    StatusElements.icon(percentageNode, iClass, 'icon-sync in-progress rotating-animation');
                    StatusElements.text(
                        percentageNode, 'in-progress', `${Math.floor(status.syncingPercs / status.inProgressSyncs)} %`);
                }
            }
            else if (status.scaningSyncs) {
                text = l.scanning_status;
            }
            else if (status.initializingSyncs) {
                text = l.initailizing_status;
            }

            if (!skipStdIcon) {
                StatusElements.icon(itemNode, iClass, 'icon-sync in-progress rotating-animation');
            }

            if (text) {
                StatusElements.text(itemNode, 'in-progress', text);
            }
        },
        success: ({status, itemNode, iClass, isDevice, isHideSuccess}) => {
            if (!isHideSuccess || status.disabledSyncs) {
                StatusElements.icon(itemNode, iClass, 'icon-check-circle success');
            }

            StatusElements.text(itemNode, 'success', l.up_to_date_status);

            if (!isDevice && status.disabledSyncs) {
                StatusElements.tooltip(
                    itemNode, iClass, mega.icu.format(l.device_attention_tip, status.disabledSyncs), {isWarning: true});
            }
        },
    };

    /**
     * Renderisation of devices and folders status
     */
    const StatusUI = {
        /**
         * {Array<Function>} folderHandlers - array of functions to handle different status for folders
         */
        folderHandlers: [
            priorityHandlers.error,
            priorityHandlers.disabled,
            priorityHandlers.updating,
            priorityHandlers.success,
        ],

        /**
         * {Array<Function>} deviceHandlers - array of functions to handle different status for devices
         */
        deviceHandlers: [
            priorityHandlers.attention,
            priorityHandlers.updating,
            priorityHandlers.success,
        ],

        /**
         * Returns status handler for given status depending on whether it's a device or folder
         * Fault tolerant, returns default empty handler and writes warning log trace if no matching handler found
         * This allows handler to be called in a "fluent" fashion: StatusUI.get(status)({...})
         * @param {Object} status object
         * @returns {Object} status handler object
         */
        get: (status) => {
            if (status) {
                if (status.isDevice) {
                    const {error, disabled, updating, success} = folderStatusPriority;

                    // map from folder status priority to device status priority
                    const deviceHandlerIndex = {
                        [error]: 0,
                        [disabled]: 0,
                        [updating]: 1,
                        [success]: 2,
                    }[status.priority];

                    if (deviceHandlerIndex !== undefined) {
                        return StatusUI.deviceHandlers[deviceHandlerIndex];
                    }
                }
                else if (status.priority > 0 && status.priority <= StatusUI.folderHandlers.length) {
                    return StatusUI.folderHandlers[status.priority - 1];
                }
            }

            return () => {
                console.warn(status
                    ? `StatusUI: No matching status handler found for status ` +
                        `${status.isDevice ? 'device' : 'folder'} priority: ${status.priority}`
                    : 'StatusUI: No status provided'
                );
            };
        },

        statusClass(status, isSync, isBackup, isDevice) {
            const {error, disabled, updating, success} = folderStatusPriority;
            if (isSync || isBackup) {
                if (status.priority > 0 && status.priority <= this.folderHandlers.length) {
                    let statusName = {
                        [error]: 'error',
                        [disabled]: 'clear',
                        [updating]: 'updating',
                        [success]: 'success',
                    }[status.priority] || 'status-unknown';
                    if (statusName === 'clear' && status.disabledSyncs) {
                        statusName = 'warning';
                    }
                    else if (statusName === 'error' && (status.stoppedSyncs || status.offlineSyncs)) {
                        statusName = 'clear';
                    }
                    return statusName;
                }
            }
            else if (isDevice) {
                return {
                    [error]: 'attention',
                    [disabled]: 'attention',
                    [updating]: 'updating',
                    [success]: 'success',
                }[status.priority] || 'status-unknown';
            }
            return 'hidden';
        },
    };

    return freeze({
        logger,
        timer: new Timer(),
        folderStatusPriority,
        StatusUI,
    });
});
