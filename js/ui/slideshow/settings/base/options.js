lazy(mega.slideshow.settings, 'options', () => {
    'use strict';

    return class SlideshowOptionsSetting {
        /**
         * Settings options base class
         * @param {String} name - setting name
         * @param {String} defaultConfig - setting default config if no available
         * @param {Object} config  - setting config definition
         * @returns {SlideshowOptionsSetting} instance
         */
        constructor(name, defaultConfig, config) {
            this.name = name;
            this._defaultConfig = defaultConfig;
            this._config = config;

            Object.freeze(this);
        }

        /**
         * Return current config value
         * @returns {*} - current config value
         */
        getValue() {
            return this.getConfig().value;
        }

        /**
         * Return current config cfg
         * @returns {Number} - current config cfg
         */
        getDefaultCfg() {
            return this.getConfig().cfg;
        }

        /**
         * Return current config or default value if undefined
         * TODO: new slideshow not implemented in mobile version
         * @returns {Object} - current config
         */
        getConfig() {
            const cfg = fmconfig.viewercfg ? fmconfig.viewercfg[this.name] : undefined;

            let id = this._defaultConfig;

            if (!is_mobile) {
                for (const [k, v] of Object.entries(this._config)) {
                    if (v.cfg === cfg) {
                        id = k;
                        break;
                    }
                }
            }

            return this._config[id];
        }
    };
});
