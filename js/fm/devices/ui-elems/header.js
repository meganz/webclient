/**
 * Device Centre UI element Header
 *
 * Codebase to interact with device centre UI Header
 */
lazy(mega.devices.uiElems, 'Header', () => {
    'use strict';

    const {
        models: {
            /**
             * {Object} syncType - contains device folder types constants
             */
            syncType,
        },
    } = mega.devices;

    /**
     * Header for Device Centre
     */
    return class {
        constructor($container) {
            /**
             * {jQuery} $el - jQuery object
             */
            this.$el = $('.device-centre-header', $container);

            /**
             * {jQuery} $header - jQuery object
             */
            this.$icon = $('.device-centre-header-icon', this.$el);

            /**
             * {jQuery} $header - jQuery object
             */
            this.$name = $('.name', this.$el);

            /**
             * {jQuery} $tooltip - jQuery object
             */
            this.$tooltip = $('.device-centre-tooltip-icon', this.$el);

            /**
             * {jQuery} $header - jQuery object
             */
            this.$info = $('.device-centre-item-info', this.$el);

            /**
             * {jQuery} $options - jQuery object
             */
            this.$optionsLink = $('.options-link', this.$el);

            /**
             * {jQuery} $removeButton - jQuery object
             */
            this.$removeButton = $('.js-dc-remove-sync-button', this.$el);

            /**
             * {jQuery} $togglePauseButton - jQuery object
             */
            this.$togglePauseButton = $('.js-dc-togglepause-sync-button', this.$el);
        }

        /**
         * Shows header
         * @param {DeviceCentreDevice|DeviceCentreFolder} item - to render header from
         * @param {Function} renderStatusFn - function to render status info
         * @param {Function} onClickOptionsFn - function to run on click options
         * @param {Boolean} showBanner - whether to show notification banner
         * @returns {void}
         */
        show(item, renderStatusFn, onClickOptionsFn, showBanner) {
            const {h, isDeviceFolder, name, icon, t, status} = item;

            this.$icon.removeClass().addClass(`device-centre-header-icon item-type-icon-90 icon-${icon}-90`);
            this.$name.text(name);
            this.$info.text('');

            const {ui} = mega.devices;
            if (typeof renderStatusFn === 'function' && ui.isActive(item)) {
                renderStatusFn({
                    status,
                    itemNode: this.$info[0],
                    iClass: 'dc-status',
                    isDevice: !!M.dcd[h],
                    showBanner,
                });
            }

            if (isDeviceFolder) {
                this.$tooltip.attr('data-simpletip', this._headerTooltipText(item));
                this.$tooltip.removeClass('hidden');
            }
            else {
                this.$tooltip.addClass('hidden');
            }

            const { cameraUpload } = syncType;

            if (isDeviceFolder && t !== cameraUpload) {
                const {ui} = mega.devices;
                $('span', this.$removeButton).text(
                    ui.isBackupRelated([M.currentCustomView.nodeID])
                        ? l.stop_backup_button
                        : l.stop_syncing_button

                );
                this.$removeButton.removeClass('hidden');

                const $togglePauseIcon = $('.sprite-fm-mono', this.$togglePauseButton);
                const $togglePauseLabel = $('span', this.$togglePauseButton);

                if (status.pausedSyncs) {
                    $togglePauseIcon.removeClass('icon-pause-small-regular-solid');
                    $togglePauseIcon.addClass('icon-play-circle');
                    $togglePauseLabel.text(l.dc_run);
                }
                else {
                    $togglePauseIcon.removeClass('icon-play-circle');
                    $togglePauseIcon.addClass('icon-pause-small-regular-solid');
                    $togglePauseLabel.text(l.dc_pause);
                }

                this.$togglePauseButton.removeClass('hidden');
            }
            else {
                this.$removeButton.addClass('hidden');
                this.$togglePauseButton.addClass('hidden');
            }

            this.$optionsLink.removeClass('hidden');
            this.$el.removeClass('hidden');
            this._bindEvents(onClickOptionsFn);
        }

        /**
         * Hides header
         * @returns {void}
         */
        hide() {
            this.$el.addClass('hidden');
            this.$removeButton.addClass('hidden');
            this.$togglePauseButton.addClass('hidden');
            this.$optionsLink.addClass('hidden');
            this.$tooltip.addClass('hidden');

            this.$icon.removeClass();
            this.$name.text('');
            this.$info.text('');

            this._unbindEvents();
        }

        /**
         * Refreshes the current header if in view
         * @returns {void}
         */
        refresh() {
            if (this.$el.hasClass('hidden')) {
                return;
            }

            const {folder} = mega.devices.ui.getCurrentDirData();
            if (!folder) {
                return;
            }

            this.show(
                folder,
                mega.devices.utils.StatusUI.get(folder.status).render,
                mega.devices.tree.contextMenu,
                true
            );
        }

        /**
         * Returns header tooltip text based on folder type
         * @param {DevideCentreFolder} folder - folder to generate tooltip text for
         * @returns {String|undefined} - header tooltip text
         */
        _headerTooltipText(folder) {
            const {
                twoWay,
                oneWayUp,
                oneWayDown,
                cameraUpload,
                mediaUpload,
                backup,
            } = syncType;

            switch (folder.t) {
                case twoWay:
                case oneWayUp:
                case oneWayDown:
                    return l.sync_folder_header_tooltip;
                case cameraUpload:
                case mediaUpload:
                    return l.camera_upload_folder_header_tooltip;
                case backup:
                    return l.backup_folder_header_tooltip;
            }
        }

        /**
         * Unbind device list event listeners
         * @returns {void}
         */
        _unbindEvents() {
            if (this.$optionsLink) {
                this.$optionsLink.off('click.dc.deviceitem.options');
            }
            if (this.$removeButton) {
                this.$removeButton.off('click.dc.deviceitem.remove');
            }
            if (this.$togglePauseButton) {
                this.$togglePauseButton.off('click.dc.deviceitem.togglepause');
            }
        }

        /**
         * Bind device list event listeners
         * @param {Function} onClickOptionsFn - Function to run on click options
         * @returns {void}
         */
        _bindEvents(onClickOptionsFn) {
            if (this.$optionsLink) {
                this.$optionsLink.rebind('click.dc.deviceitem.options', (e) => {
                    e.preventDefault();
                    const path = M.currentdirid.split("/");
                    if (path.length > 1) {
                        $.hideContextMenu();

                        if (window.selectionManager) {
                            selectionManager.resetTo(path[path.length - 1]);
                        }
                        else {
                            $.selected = [path[path.length - 1]];
                        }

                        if (typeof onClickOptionsFn === 'function') {
                            onClickOptionsFn(e);
                        }

                        // must be delayed because of selection manager: delay('selMan:notify:selection'
                        // M.addSelectedNodes() cannot be used instead since it selects the available node
                        // in case there is 1 single node in current view, so the info-panel is shown
                        // for that node instead of the device in selection manager "reinitialize()"...
                        // if (nodeList.length === this.items.length) { this.select_all(); }
                        delay('deviceFolders:hide:selectionBar', () => {
                            selectionManager.hideSelectionBar();
                        }, 80);
                    }
                });
            }
            if (this.$removeButton) {
                this.$removeButton
                    .off('click.dc.deviceitem.remove')
                    .on('click.dc.deviceitem.remove',
                        () => {
                            $.selected = [M.currentCustomView.nodeID];
                            mega.devices.ui.desktopApp.common.remove();
                        });
            }
            if (this.$togglePauseButton) {
                this.$togglePauseButton
                    .off('click.dc.deviceitem.togglepause')
                    .on('click.dc.deviceitem.togglepause',
                        () => {
                            $.selected = [M.currentCustomView.nodeID];
                            mega.devices.ui.desktopApp.common.togglePause();
                        });
            }
        }
    };
});
