/**
 * Device Centre Device Folders
 *
 * Codebase to interact with device centre device folders
 */
lazy(mega.devices.sections, 'deviceFolders', () => {
    'use strict';

    const {
        utils: {
            /**
             * {StatusUI} StatusUI - Status UI handler
             */
            StatusUI,
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
     * DeviceFolders class
     */
    class DeviceFolders {
        constructor() {
            /**
             * {jQuery} $empty - jQuery object
             */
            this.$empty = $('.fm-empty-folder', ui.$fmMain);

            /**
             * {jQuery} $grid - jQuery object
             */
            this.$grid = $('.folders.grid-scrolling-table', ui.$gridWrapper);
        }

        /**
         * {String} section - section name
         */
        static get section() {
            return syncSection.deviceFolders;
        }

        /**
         * Destruction tasks
         * @returns {void}
         */
        destroy() {
            ui.notification.hide();
            ui.$gridWrapper.addClass('hidden');
            this.$grid.addClass('hidden');
        }

        /**
         * Renders device folders list and returns true in case of successful rendering
         * @param {Boolean} isRefresh - whether is refresh
         * @returns {Object|void} - {err, id} or void if rendering was successful
         */
        render(isRefresh) {
            const path = M.currentdirid.split('/');
            const device = M.dcd[path[1]];
            if (!device) {
                return {err: true, id: rootId};
            }

            ui.$gridWrapper.removeClass('hidden');
            this.$grid.removeClass('hidden');
            this._renderHeader(device);
            this._renderItems(device, isRefresh);
        }

        /**
         * Update the Node properties passed for UI renderisation
         * @param {Object} props - node renderisation properties
         * @param {DeviceCentreFolder} folder - folder to render
         * @returns {void}
         */
        updateProps(props, folder) {
            props.time = time2date(folder.ts);
            props.icon = folder.icon;
            props.type = folder.typeText;
            props.status = folder.status;

            if (folder.hb) {
                props.lastHeartbeat = time2date(folder.hb.ts);
            }
        }

        /**
         * Update the DOM Node template passed for UI renderisation
         * @param {MegaNode} aNode - node
         * @param {Object} aProperties - node properties
         * @param {Object} aTemplate - The DOM Node template
         * @returns {void}
         */
        updateTemplate(aNode, aProperties, aTemplate) {
            const elIcon = aTemplate.querySelector('.device-centre-item-icon');
            const elName = aTemplate.querySelector('.device-centre-item-name');
            const elInfo = aTemplate.querySelector('.device-centre-item-info');
            const elType = aTemplate.querySelector('.device-centre-item-type');
            const elSize = aTemplate.querySelector('.device-centre-item-size');
            const elAdded = aTemplate.querySelector('.device-centre-item-added');
            const elModified = aTemplate.querySelector('.device-centre-item-modified');

            if (mega.sensitives.shouldBlurNode(M.d[aNode.h])) {
                aTemplate.classList.add('is-sensitive');
            }

            if (elIcon && elName && elInfo && elType && elSize && elAdded && elModified) {
                elIcon.classList.add(`icon-${aProperties.icon}-90`);
                elName.textContent = aProperties.name || l[164];

                StatusUI.get(aProperties.status)({
                    status: aProperties.status,
                    itemNode: elInfo,
                    iClass: 'dc-status',
                });

                elType.textContent = aProperties.type;
                elSize.textContent = aProperties.size;
                elAdded.textContent = aProperties.time;
                elModified.textContent = aProperties.lastHeartbeat;
            }
        }

        /**
         * Renders UI folder list header
         * @param {DeviceCentreDevice} device - device to render header for
         * @returns {void}
         */
        _renderHeader(device) {
            ui.header.show(
                device,
                StatusUI.get(device.status),
                ui.contextMenu
            );
        }

        /**
         * Renders folder items UI
         * Feeds M.v with current device folders info
         * @param {DeviceCentreDevice} device - data of the device containing its folders
         * @param {Boolean} isRefresh - whether is refresh
         * @returns {void}
         */
        _renderItems(device, isRefresh) {
            if (M.viewmode) {
                M.viewmode = 0;
            }

            M.v = Object.values(device.folders).filter(n => mega.sensitives.shouldShowNode(n.h));

            if (M.v.length) {
                this.$empty.addClass('hidden');
                ui.header.$el.removeClass('bottom-border');
            }
            else {
                this.$empty.removeClass('hidden');
                ui.header.$el.addClass('bottom-border');
            }

            const {n, d} = fmconfig.sortmodes[M.currentdirid] || {n: 'name', d: 1};
            M.doSort(n, d);
            M.renderMain(isRefresh);

            onIdle(() => {
                M.renderPathBreadcrumbs();
            });
        }
    }

    return freeze({DeviceFolders});
});
