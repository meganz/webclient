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
             * {StatusUI} StatusUI - Status UI handler
             */
            StatusUI,

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

            if (!M.gallery) {
                if (hasToRenderHeader) {
                    this._renderHeader(folder);
                }
                else {
                    ui.header.hide();
                }
                if (!isRefresh) {
                    // items already managed by mega render system, no need to re-render on refresh
                    this._renderItems(h);
                }
            }
        }

        /**
         * Renders UI folder list header
         * @param {DeviceCentreFolder} folder - folder to render header for
         * @returns {void}
         */
        _renderHeader(folder) {
            ui.header.show(
                folder,
                StatusUI.get(folder.status),
                ui.contextMenu,
                true
            );
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
