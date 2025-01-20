/**
 * Device Centre Devices Tree
 *
 * Codebase to interact with device centre device tree
 */
lazy(mega.devices, 'tree', () => {
    'use strict';

    /**
     * {String} deviceTreeItemPrefix - preffix for rendered tree item id
     */
    const deviceTreeItemPrefix = 'device-centre_';

    const {
        utils: {
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
            logger,
        },

        /**
         * {Object} ui - Device center UI
         */
        ui,

        /**
         * {String} rootId - root ID of the device centre UI
         */
        rootId,
    } = mega.devices;

    /**
     * DeviceCentre tree UI instance
     */
    return new class {
        constructor() {
            /**
             * {Boolean} isReady - whether tree is ready
             */
            this.isReady = true;

            /**
             * {Boolean} isNewData - whether there is new data
             */
            this.isNewData = true;

            /**
             * {jQuery} $tree - jQuery object
             */
            this.$tree = $('.js-device-centre-tree-panel', '.js-lp-myfiles');

            /**
             * {jQuery} $button - jQuery object
             */
            this.$button = $('.js-lpbtn.js-device-centre', this.$tree);

            /**
             * {jQuery} $expIcon - jQuery object
             */
            this.$expIcon = $('.js-cloudtree-expander', this.$tree);

            /**
             * {jQuery} $contentPanel - jQuery object
             */
            this.$contentPanel = $('.content-panel.device-centre', this.$tree);

            /**
             * {jQuery} $devices - jQuery object
             */
            this.$devices = $('.tree', this.$contentPanel);

            this._bindEvents();
        }

        /**
         * Renders UI for passed as argument or retrieving data if undefined
         * @param {Array|undefined} data - data to render or retrieve
         * @returns {Promise<void>} void
         */
        render(data) {
            if (this.isReady) {
                this.isReady = false;

                const selectedId = M.currentCustomView.nodeID;
                this._selectChild(selectedId);

                return this._handleData(data)
                    .then(() => {
                        this._renderRoot(selectedId);
                        if (this.isNewData) {
                            this._renderChildren(selectedId);
                        }
                    })
                    .catch(tell)
                    .finally(() => {
                        this.isReady = true;
                        const {main} = mega.devices;
                        main.render();
                    });
            }
        }

        /**
         * Show a context menu for the selected device
         * @param {Event} e - contextMenu event
         * @returns {void}
         */
        contextMenu(e) {
            const items = ['.properties-item'];
            if ($.selected.length === 1) {
                const h = $.selected[0];
                if (M.dcd[h]) {
                    items.push('.device-rename-item');
                }
                else {
                    const {device} = ui.getCurrentDirData();
                    if (device) {
                        const folder = device.folders[h];
                        if (folder) {
                            items.push('.rename-item');
                        }
                    }
                }
            }
            M.contextMenuUI(e, 8, items.join(', '));
        }

        /**
         * Parses data passed as argument or gets new data in case not data passed and data is expired
         * Fetches device folder handles from DB in case new data
         * @param {Array|undefined} data - data to parse or fetch
         * @returns {Promise<void>} void
         */
        async _handleData(data = []) {
            this.isNewData = data.length || ui.isDataExpired() && (data = await ui.getData());

            if (this.isNewData) {
                const [apiDeviceNames = {}, apiFolders = []] = data || [];
                const handles = [...new Set(apiFolders.map((f) => f.h))];

                logger.debug('mega.devices.ui dbfetch.geta', handles);
                await dbfetch.geta(handles);

                ApiDataParser.parse(apiFolders, apiDeviceNames);

                logger.debug('mega.devices.ui M.dcd', M.dcd);
            }
        }

        /**
         * Selects current tree child
         * @param {String} selectedId - id of the selected device
         * @returns {void}
         */
        _selectChild(selectedId) {
            if (Object.keys(M.dcd || {}).length) {
                const {device} = ui.getCurrentDirData();
                if (device) {
                    selectedId = device.h;
                }
            }
            $(`#treea_device-centre_${selectedId}`, this.$contentPanel).addClass('selected');
        }

        /**
         * Renders device centre tree root
         * @param {String} selectedId - id of the selected device
         * @returns {void}
         */
        _renderRoot(selectedId) {
            if (selectedId === rootId) {
                this.$button.addClass('active');
            }
            else {
                this.$button.removeClass('active');
                this._openTree();
            }
        }

        /**
         * Renders device centre tree children
         * @param {String} selectedId - id of the selected device
         * @returns {void}
         */
        _renderChildren(selectedId) {
            this.$devices.text('');

            const devices = Object.values(M.dcd)
                .filter(device => mega.devices.ui.isActive(device));

            if (devices.length) {
                this.$expIcon.removeClass('hidden');
            }
            else {
                this.$expIcon.addClass('hidden');
            }

            for (const {h, name, dua, type, status} of devices) {
                const icon = deviceIcon(dua, type);
                this._createItem(
                    h,
                    name,
                    `icon-${icon}-90 item-type-icon-90`,
                    selectedId,
                    status
                );
            }

            M.addTreeUIDelayed();
        }

        /**
         * Builds device centre tree item
         * @param {String} h - device handle
         * @param {String} name - device name
         * @param {String} iconClass - device icon class
         * @param {String} selectedId - selected device id
         * @param {Object} status - device status
         * @returns {void}
         */
        _createItem(h, name, iconClass, selectedId, status) {
            const itemWrap = mCreateElement('li', {
                'id': `treeli_${h}`
            }, this.$devices[0]);

            const {device} = ui.getCurrentDirData();
            if (device) {
                selectedId = device.h;
            }

            const itemNode = mCreateElement('span', {
                'class': `device-item nw-fm-tree-item ${h === selectedId ? 'selected' : ''}`,
                'id': `treea_${deviceTreeItemPrefix}${h}`
            }, itemWrap);

            const iconGroup = mCreateElement('span', {'class': 'dc-fm-tree-icon-group'}, itemNode);

            StatusUI.get(status).render({
                status,
                itemNode: iconGroup,
                iClass: 'dc-fm-tree-status',
                isDevice: true,
                isOnlyIcon: true,
                isHideSuccess: true,
            });

            mCreateElement('span', {'class': `dc-fm-tree-icon ${iconClass}`}, iconGroup);
            mCreateElement('span', {
                'class': `dc-fm-tree-name`
            }, itemNode).textContent = name;
        }

        /**
         * Opens device centre tree
         * @returns {void}
         */
        _openTree() {
            this.$button.removeClass('collapse');
            this.$contentPanel.removeClass('collapse').addClass('active');
            M.addTreeUIDelayed();
        }

        /**
         * Closes device centre tree
         * @returns {void}
         */
        _closeTree() {
            this.$button.addClass('collapse');
            this.$contentPanel.removeClass('active').addClass('collapse');
        }

        /**
         * Bind device centre tree event listeners
         * @returns {void}
         */
        _bindEvents() {
            if (this.$button) {
                this.$button.rebind('click.dc.tree.button', (e) => {
                    eventlog(500613);
                    if (M.currentdirid === rootId || $(e.target).hasClass('js-cloudtree-expander')) {
                        this.$button.toggleClass('collapse');
                        if (this.$contentPanel.hasClass('active')) {
                            this._closeTree();
                        }
                        else {
                            this._openTree();
                        }
                    }
                    else {
                        if (this.$button.hasClass('active')) {
                            this._closeTree();
                        }
                        else {
                            this._openTree();
                        }
                        M.openFolder(rootId, true);
                    }

                    $.tresizer();
                });
            }
        }
    };
});
