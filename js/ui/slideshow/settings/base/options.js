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
         * Return the cfg value for a named config option (e.g. 'slow', 'oldest')
         * @param {String} name - config key
         * @returns {Number} - the option's cfg value
         */
        getCfgByName(name) {
            return this._config[name].cfg;
        }

        /**
         * Return current config or default value if undefined
         * TODO: new slideshow not implemented in mobile version
         * @returns {Object} - current config
         */
        getConfig() {
            const {override} = mega.slideshow.settings;
            let cfg;
            if (override && override[this.name] !== undefined) {
                cfg = override[this.name];
            }
            else if (fmconfig.viewercfg) {
                cfg = fmconfig.viewercfg[this.name];
            }

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
