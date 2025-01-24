/**
 * Device Centre Device List
 *
 * Codebase to interact with device centre device list
 */
lazy(mega.devices.sections, 'devices', () => {
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
        },

        /**
         * {Object} ui - Device center ui instance
         */
        ui,
    } = mega.devices;

    /**
     * DeviceList class
     */
    class DeviceList {
        constructor() {
            /**
             * {jQuery} $grid - jQuery object
             */
            this.$grid = $('.devices.grid-scrolling-table', ui.$gridWrapper);
        }

        /**
         * {String} section - section name
         */
        static get section() {
            return section.devices;
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
         * Renders UI and return true in case of successful rendering
         * @returns {void}
         */
        render() {
            ui.header.hide();
            if (Object.values(M.dcd).length) {
                ui.noDevices = false;
                ui.$gridWrapper.removeClass('hidden');
                this.$grid.removeClass('hidden');
                this._renderItems();
            }
            else {
                ui.noDevices = true;
                ui.showNoDevices();
            }
        }

        /**
         * Update the Node properties passed for UI renderisation
         * @param {Object} props - node renderisation properties
         * @param {DeviceCentreDevice} device - device to render
         * @returns {void}
         */
        updateProps(props, device) {
            props.size = bytesToSize(device.tb);
            props.icon = device.icon;
            props.folders = device.td;
            props.files = device.tf;
            props.status = device.status;
        }

        /**
         * Update the DOM Node template passed for UI renderisation
         * @param {Object} aProperties - node properties
         * @param {Object} aTemplate - The DOM Node template
         * @returns {void}
         */
        updateTemplate(aProperties, aTemplate) {
            aTemplate.querySelector('.device-centre-item-icon').classList.add(`icon-${aProperties.icon}-90`);
            aTemplate.querySelector('.device-centre-item-name').textContent = aProperties.name;

            const {ui} = mega.devices;
            if (aProperties.status && !ui.filterChipUtils.isInactiveSelected) {
                StatusUI.get(aProperties.status).render({
                    status: aProperties.status,
                    itemNode: aTemplate.querySelector('.device-centre-item-info'),
                    iClass: 'dc-status',
                    isDevice: true,
                });
            }

            const nFolders = mega.icu.format(l.folder_count, aProperties.folders);
            const nFiles = mega.icu.format(l.file_count, aProperties.files);

            aTemplate.querySelector('.device-centre-item-contain').textContent = `${nFolders}, ${nFiles}`;
            aTemplate.querySelector('.device-centre-item-size').textContent = aProperties.size;
        }

        /**
         * Renders device items list
         * Feeds M.v with current device info
         * @returns {void}
         */
        _renderItems() {
            M.v = Object.values(M.dcd);

            const {n, d} = fmconfig.sortmodes[M.currentdirid] || {n: 'name', d: 1};
            M.doSort(n, d);
            M.renderMain();
        }
    }

    return freeze({DeviceList});
});
