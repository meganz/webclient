lazy(mega.slideshow.settings, 'speed', () => {
    'use strict';

    const name = 'speed';
    const shortText = l.ss_setting_speed_seconds;

    return new class SlideshowSpeedSetting extends mega.slideshow.settings.options {
        /**
         * Speed setting handler
         * @returns {SlideshowSpeedSetting} instance
         */
        constructor() {
            super(
                name,
                'normal',
                {
                    slow: {cfg: 1, value: 8000, longText: l.ss_settings_speed_opt_1},
                    normal: {cfg: 2, value: 4000, longText: l.ss_settings_speed_opt_2},
                    fast: {cfg: 3, value: 2000, longText: l.ss_settings_speed_opt_3}
                }
            );
        }

        /**
         * Render slideshow settings UI according to config values
         * Settings UI elements will be provided with config change event bindings
         * @param {Object} $container - jquery element containing settings
         * @param {Function} onUpdate - to be called when setting is changed
         * @returns {void}
         */
        render($container, onUpdate) {
            const $button = $(`button.${this.name}`, $container);
            const $options = $(`nav.${this.name}`, $container);

            const clickHandler = (id) => {
                onUpdate(this.name, this._config[id].cfg);

                for (const [k, v] of Object.entries(this._config)) {
                    const button = $(`button.${k}`, $options);
                    if (k === id) {
                        button.addClass('active');
                        $('.current', $button).safeHTML(this._getText(v, true));
                        $(`button.${k} i.icon-active`, $options).removeClass('hidden');
                    }
                    else {
                        button.removeClass('active');
                        $(`button.${k} i.icon-active`, $options).addClass('hidden');
                    }
                }
            };

            const cfg = fmconfig.viewercfg ? fmconfig.viewercfg[this.name] : undefined;

            let id = this._defaultConfig;
            for (const [k, v] of Object.entries(this._config)) {
                const button = $(`button.${k}`, $options);
                if (v.cfg === cfg) {
                    id = k;
                    button.addClass('active');
                }
                else {
                    button.removeClass('active');
                }
                $(`button.${k} span`, $options).safeHTML(this._getText(v));
                button.rebind('click.slideshow-speed', () => clickHandler(k));
            }

            $('.current', $button).safeHTML(this._getText(this._config[id], true));
            $(`button.${id} i.icon-active`, $options).removeClass('hidden');
        }

        /**
         * Return setting related translated label text
         * @param {Object} config - specific config
         * @param {Boolean} isShort - whether to use short label
         * @returns {String} translated label text
         */
        _getText(config, isShort) {
            return (isShort ? shortText : config.longText).replace('%1', config.value / 1000);
        }
    };
});
