/**
 * Device Centre Device Folder Children
 *
 * Codebase to interact with device centre device folder children
 */
lazy(mega.devices.sections, 'folderChildren', () => {
    'use strict';

    const {
        utils: {
            /**
             * {Object<MegaLogger>} logger - logger instance
             */
            logger,
        },

        models: {
            /**
             * {Object} syncSection - contains sections constants
             */
            syncSection,
            syncType,
        },

        /**
         * {Object} ui - Device center ui instance
         */
        ui,

        /**
         * {String} rootId - root ID of the device centre UI
         */
        rootId,
    } = mega.devices;

    /**
     * FolderChildren class
     */
    class FolderChildren {
        constructor() {
            /**
             * {jQuery} $empty - jQuery object
             */
            this.$empty = $('.fm-empty-folder', ui.$fmMain);
        }

        /**
         * {String} section - section name
         */
        static get section() {
            return syncSection.folderChildren;
        }

        /**
         * Destruction tasks
         * @returns {void}
         */
        destroy() {
            mega.ui.secondaryNav.hideCard();
            ui.notification.hide();
        }

        /**
         * Renders UI and returns true in case of successful rendering
         * @param {Boolean} isRefresh - whether is refresh
         * @returns {Promise<Object|void>} - {err, id} or void if rendering was successful
         */
        async render(isRefresh) {
            const h = M.currentCustomView.nodeID;
            const {device} = ui.getCurrentDirData();

            if (!device) {
                return {err: true, id: rootId};
            }

            let folder = device.folders[h];
            const hasToRenderHeader = !!folder;

            if (!folder) {
                if (!M.c[h]) {
                    logger.debug('mega.devices.sections.folderChildren dbfetch.get', h);
                    await dbfetch.get(h);
                }
                folder = ui.getFolderInPath(M.getPath(h));

                if (!folder) {
                    return {err: true, id: `${rootId}/${device.h}`};
                }
            }

            mega.ui.secondaryNav.hideCard();
            mega.ui.secondaryNav.updateInfoPanelButton(true);
            if (!M.gallery) {
                const isBackup = ui.isBackupRelated(h);
                mega.ui.secondaryNav.updateGalleryLayout();
                if (hasToRenderHeader) {
                    const { isDeviceFolder, t, status } = folder;
                    const isShareLimitedNode = sharer(h) && M.getNodeRights(h) < 2;
                    const hideButtons = !(isDeviceFolder && t !== syncType.cameraUpload) ||
                        isShareLimitedNode ||
                        status.errorState === 14;
                    mega.ui.secondaryNav.showCard(
                        h,
                        {
                            componentClassname: `outline ${hideButtons ? 'hidden' : ''}`,
                            text: status.pausedSyncs ? l.dc_run : l.dc_pause,
                            onClick: () => {
                                $.selected = [h];
                                ui.desktopApp.common.togglePause();
                                eventlog(isBackup ? 500755 : 500756);
                            }
                        },
                        {
                            componentClassname: `destructive ${hideButtons ? 'hidden' : ''}`,
                            text: isBackup ? l.stop_backup_button : l.stop_syncing_button,
                            onClick: () => {
                                $.selected = [h];
                                ui.desktopApp.common.remove();
                                eventlog(isBackup ? 500753 : 500754);
                            }
                        },
                        (ev) => {
                            ev.preventDefault();
                            const path = M.currentdirid.split('/');
                            if (path.length > 1) {
                                $.hideContextMenu();

                                selectionManager.resetTo(path.pop());

                                ev.originalEvent.delegateTarget = ev.currentTarget.domNode;
                                M.contextMenuUI(ev.originalEvent, 1);

                                delay('deviceFolders:hide:selectionBar', () => {
                                    selectionManager.hideSelectionBar();
                                }, 80);
                            }
                        }
                    );
                    const infoIcon = mega.ui.secondaryNav.cardComponent.domNode.querySelector('.dc-badge-info-icon');
                    if (infoIcon && isDeviceFolder) {
                        const {
                            twoWay,
                            oneWayUp,
                            oneWayDown,
                            cameraUpload,
                            mediaUpload,
                            backup,
                        } = syncType;
                        let tip = '';
                        switch (t) {
                            case twoWay:
                            case oneWayUp:
                            case oneWayDown:
                                tip = l.sync_folder_header_tooltip;
                                break;
                            case cameraUpload:
                            case mediaUpload:
                                tip = l.camera_upload_folder_header_tooltip;
                                break;
                            case backup:
                                tip = l.backup_folder_header_tooltip;
                                break;
                        }
                        infoIcon.dataset.simpletip = tip;
                    }
                    else if (infoIcon) {
                        infoIcon.classList.add('hidden');
                    }
                }
                else {
                    mega.ui.secondaryNav.hideCard();
                }
                if (!isRefresh) {
                    // items already managed by mega render system, no need to re-render on refresh
                    this._renderItems(h);
                }
            }
        }

        /**
         * Renders folder items list
         * @param {String} h - current node handle
         * @returns {void}
         */
        _renderItems(h) {
            M.filterByParent(h);

            const {n, d} = fmconfig.sortmodes[M.currentdirid] || {n: 'name', d: 1};
            M.doSort(n, d);
            M.renderMain();

            if (!M.v.length &&
                !(mega.ui.mNodeFilter && mega.ui.mNodeFilter.selectedFilters.value)) {
                this.$empty.removeClass('hidden');
            }

            onIdle(() => {
                M.renderPathBreadcrumbs();
            });
        }
    }

    return freeze({FolderChildren});
});
