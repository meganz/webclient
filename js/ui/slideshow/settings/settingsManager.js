lazy(mega.slideshow.settings, 'manager', () => {
    'use strict';

    return new class SlideshowSettingsManager {
        /**
         * Slideshow settings manager / facade exposing slideshow playlist settings operations.
         * Can handle as many settings as wanted just by defining them in "_settings" property
         * @returns {SlideshowSettingsManager} instance
         */
        constructor() {
            const {order, speed, repeat, sub} = mega.slideshow.settings;
            this._settings = [speed, order, repeat, sub];

            Object.freeze(this);
        }

        /**
         * Check if settings current render has to be updated
         * @param {Object} $container - jquery element containing settings
         * @returns {Boolean} whether current render must be updated
         */
        hasToUpdateRender($container) {
            for (let i = 0; i < this._settings.length; i++) {
                const setting = this._settings[i];
                if (typeof setting.hasToUpdateRender === 'function' && setting.hasToUpdateRender($container)) {
                    return true;
                }
            }
            return false;
        }

        /**
         * Render slideshow settings UI according to config values
         * Settings UI elements will be provided with config change event bindings
         * Set default config in case undefined
         * @param {Object} $container - jquery element containing settings
         * @param {Function} onConfigChange - apply on config change
         * @returns {void}
         */
        render($container, onConfigChange) {
            const setSettingsDefaults = (exclude) => {
                const viewercfg = {};
                for (let i = 0; i < this._settings.length; i++) {
                    const setting = this._settings[i];
                    assert(typeof setting.getDefaultCfg === 'function',
                           `"${setting.name}" setting must implement "getDefaultCfg" method`);
                    if (exclude === undefined || setting.name !== exclude) {
                        viewercfg[setting.name] = setting.getDefaultCfg();
                    }
                }
                fmconfig.viewercfg = viewercfg;
            };

            const onUpdate = (name, cfg) => {
                if (fmconfig.viewercfg === undefined) {
                    setSettingsDefaults(name);
                }
                if (cfg !== fmconfig.viewercfg[name]) {
                    fmconfig.viewercfg[name] = cfg;
                    mega.config.set('viewercfg', fmconfig.viewercfg);
                    onConfigChange(name);
                    this._onConfigChange($container, name, cfg);
                }
            };

            for (let i = 0; i < this._settings.length; i++) {
                const setting = this._settings[i];
                assert(typeof setting.render === 'function',
                       `"${setting.name}" setting must implement "render" method`);
                setting.render($container, onUpdate);
            }

            this._onConfigChange($container);
        }

        /**
         * Notify settings about changes in configuration
         * @param {Object} $container - jquery element containing settings
         * @param {String} name - setting name
         * @param {Number} cfg - config value
         * @returns {void}
         */
        _onConfigChange($container, name, cfg) {
            for (let i = 0; i < this._settings.length; i++) {
                const setting = this._settings[i];
                if (typeof setting.onConfigChange === 'function') {
                    setting.onConfigChange($container, name, cfg);
                }
            }
        }
    };
});
