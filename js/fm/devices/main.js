/**
 * UI for Device Centre
 *
 * Codebase to interact with device centre UI and main facade to render device center UI
 */
lazy(mega.devices, 'main', () => {
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
        },

        sections: {
            /**
             * {Class} DeviceList - device list class
             */
            devices: {DeviceList},
            deviceFolders: {DeviceFolders},
            folderChildren: {FolderChildren},
        },

        /**
         * {String} rootId - root ID of the device centre UI
         */
        rootId,
    } = mega.devices;

    /**
     * DeviceCentre main UI instance
     */
    return new class {
        constructor() {
            /**
             * {String} section - section name
             */
            this.section = null;

            /*
             * {String} beforePageChangeListener - The ID identifying the event
             */
            this.beforePageChangeListener = null;

            this.handler = {
                /**
                 * {Object} classes - list of classes for each section
                 */
                classes: [
                    DeviceList,
                    DeviceFolders,
                    FolderChildren
                ],

                /**
                 * {Object} instances - list of instances for each section
                 */
                instances: {},
            };
        }

        /**
         * Run function (if exists) on current section handler instance
         * @param {String} fn - function name
         * @param {...any} args - function args
         * @returns {*} Result of handler function call
         */
        run(fn, ...args) {
            const handler = this.handler.instances[this.section];
            if (typeof handler[fn] === 'function') {
                return handler[fn](...args);
            }
            logger.warn(`this('${fn}') is not a function`);
        }

        /**
         * Destruction tasks
         * @returns {void}
         */
        destroy() {
            for (const handler of Object.values(this.handler.instances)) {
                if (typeof handler.destroy === 'function') {
                    handler.destroy();
                }
            }
        }

        /**
         * Renders main UI for current section
         * @param {Boolean} isRefresh - whether is refresh
         * @returns {Promise<void>} void
         */
        async render(isRefresh) {
            if (M.currentCustomView.type !== rootId) {
                return;
            }

            this.destroy();
            this._initializeSection();

            if (this.section === null) {
                M.openFolder(rootId);
                return;
            }

            this._setupListeners();

            const handler = this._getSectionHandlerInstance();

            mega.ui.secondaryNav.hideCard();
            const {err, id} = await handler.render(isRefresh) || {};
            if (err) {
                M.openFolder(id);
            }
        }

        /**
         * Initializes section based on M.currentdirid
         * @returns {void}
         */
        _initializeSection() {
            this.section = null;

            if (M.currentdirid === rootId) {
                this.section = syncSection.devices;
            }
            else {
                const path = M.currentdirid.split('/');
                this.section = path.length > 2 ?
                    syncSection.folderChildren :
                    syncSection.deviceFolders;
            }
        }

        /**
         * Initializes listener "beforepagechange" to destroy handlers when leaving device-center page
         * @returns {void}
         */
        _setupListeners() {
            if (!this.beforePageChangeListener) {
                this.beforePageChangeListener = mBroadcaster.addListener('beforepagechange', () => {
                    if (M.currentrootid !== rootId) {
                        mBroadcaster.removeListener(this.beforePageChangeListener);
                        this.beforePageChangeListener = null;
                        this.destroy();
                    }
                });
            }
        }

        /**
         * Gets handler instance for given section. Creates new instance if it doesn't exist
         * @param {String} section - section to render
         * @returns {Object} Handler instance
         */
        _getSectionHandlerInstance() {
            if (this.handler.instances[this.section]) {
                return this.handler.instances[this.section];
            }

            const handler = this.handler.classes.find(clazz => clazz.section === this.section);
            if (handler) {
                const instance = new handler();
                this.handler.instances[this.section] = instance;
                return instance;
            }

            throw new Error(
                `mega.devices.main._getSectionHandlerInstance: No handler for section ${this.section}`);
        }
    };
});
