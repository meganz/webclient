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
             * {Object<section>} section - sections constants
             */
            section,

            /**
             * {StatusUI} StatusUI - Status UI handler
             */
            StatusUI,

            /**
             * {Object<MegaLogger>} logger - logger instance
             */
            logger,
        },

        /**
         * {Object} tree - Device center tree instance
         */
        tree,

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
             * {jQuery} $grid - jQuery object
             */
            this.$empty = $('.fm-empty-folder', ui.$fmMain);
        }

        /**
         * {String} section - section name
         */
        static get section() {
            return section.folderChildren;
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
         * @returns {Promise<Object|void>} - {err, id} or void if rendering was successful
         */
        async render() {
            const h = M.currentCustomView.nodeID;
            const {device} = ui.getCurrentDirData();

            if (!device) {
                return {err: true, id: rootId};
            }

            let folder = device.folders[h];
            const hasToRenderHeader = !!folder;

            if (!folder) {
                logger.debug('mega.devices.sections.folderChildren dbfetch.get', h);
                await dbfetch.get(h);
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
                this._renderItems(h);
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
                StatusUI.get(folder.status).render,
                tree.contextMenu,
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

            const selected = ui.selected && ui.selected.length ?
                ui.selected :
                selectionManager.selected_list;

            M.renderMain();

            if (selected) {
                selectionManager.add_to_selection(selected[0], true);
            }

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
