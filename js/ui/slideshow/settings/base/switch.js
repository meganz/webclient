lazy(mega.slideshow.settings, 'switch', () => {
    'use strict';

    return class SlideshowSwitchSetting {
        /**
         * Settings switch base class
         * @param {String} name - setting name
         * @param {Boolean} defaultValue - default value
         * @param {Function} isAllowed - whether switch is allowed or not
         * @param {Boolean} isImplemented - whether current switch setting is implemented and must be shown or not.
         *                                  This parameter will be useless when include sub-folders setting
         *                                  is definetely integrated
         * @returns {SlideshowSwitchSetting} instance
         */
        constructor(name, defaultValue, isAllowed, isImplemented) {
            this.name = name;
            this._defaultValue = defaultValue || 0;
            this._isAllowed = isAllowed;
            this._isImplemented = isImplemented === undefined ? true : isImplemented;

            Object.freeze(this);
        }

        /**
         * Return current config value or default value if undefined or is_mobile
         * TODO: new slideshow not implemented in mobile version
         * @returns {*} - current config value
         */
        getValue() {
            return !is_mobile &&
            this._isImplemented &&
            fmconfig.viewercfg && fmconfig.viewercfg[this.name] !== undefined ?
                fmconfig.viewercfg[this.name] :
                this._defaultValue;
        }

        /**
         * Return switch default value
         * @returns {Boolean} enabled / disabled
         */
        getDefaultCfg() {
            return this._defaultValue;
        }

        /**
         * Render slideshow settings UI according to config values
         * Settings UI elements will be provided with config change event bindings
         * @param {Object} $container - jquery element containing settings
         * @param {Function} onUpdate - to be called when setting is changed
         * @returns {void}
         */
        render($container, onUpdate) {
            if (!this._isImplemented) {
                return;
            }

            const $switch = $(`#${this.name}`, $container);

            let toggle = (onChange) => {
                let value;
                if ($switch.hasClass('toggle-on')) {
                    $switch.removeClass('toggle-on');
                    value = 0;
                }
                else {
                    $switch.addClass('toggle-on');
                    value = 1;
                }

                $switch.trigger('update.accessibility');

                if (typeof onChange === 'function') {
                    onChange(value);
                }
            };

            const value = this.getValue();
            if (value && !$switch.hasClass('toggle-on')
                || !value && $switch.hasClass('toggle-on')) {
                toggle();
            }
            else {
                $switch.trigger('update.accessibility');
            }

            if (typeof this._isAllowed === 'function') {
                if (this._isAllowed()) {
                    $switch.closest('li').removeClass('disabled');
                }
                else {
                    $switch.closest('li').addClass('disabled');
                    $switch.removeClass('toggle-on');
                    $switch.trigger('update.accessibility');
                    toggle = () => false;
                }
            }

            Soon(() => {
                $('.no-trans-init', $switch).removeClass('no-trans-init');
            });

            $switch.rebind(`click.slideshow-${this.name}`, () => toggle((value) => onUpdate(this.name, value)));
        }
    };
});
