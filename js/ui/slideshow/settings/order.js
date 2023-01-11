lazy(mega.slideshow.settings, 'order', () => {
    'use strict';

    const name = 'order';

    return new class SlideshowOrderSetting extends mega.slideshow.settings.options {
        /**
         * Order setting handler
         * @returns {SlideshowOrderSetting} instance
         */
        constructor() {
            super(
                name,
                'shuffle',
                {
                    shuffle: {
                        cfg: 1,
                        icon: 'icon-shuffle',
                        absolute: false,
                        value: (indexList) => shuffle(indexList)
                    },
                    newest: {
                        cfg: 2,
                        icon: 'icon-hourglass-new',
                        absolute: true,
                        value: (indexList, nodeList) => this._timeSort(indexList, nodeList, -1)
                    },
                    oldest: {
                        cfg: 3,
                        icon: 'icon-hourglass-old',
                        absolute: true,
                        value: (indexList, nodeList) => this._timeSort(indexList, nodeList, 1)
                    }
                }
            );
        }

        /**
         * Return current config absolute
         * @returns {Boolean} whether is aboslute
         */
        isAbsolute() {
            return this.getConfig().absolute;
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
                const $button = $(`button.${this.name}`, $container);
                const $options = $(`nav.${this.name}`, $container);

                if (!$(`button.${id}`, $options).hasClass('disabled')) {
                    onUpdate(this.name, this._config[id].cfg);

                    for (const [k, v] of Object.entries(this._config)) {
                        const button = $(`button.${k}`, $options);
                        if (k === id) {
                            button.addClass('active');
                            $('i:last', $button).addClass(v.icon);
                            $(`button.${k} i.icon-active`, $options).removeClass('hidden');
                        }
                        else {
                            button.removeClass('active');
                            $('i:last', $button).removeClass(v.icon);
                            $(`button.${k} i.icon-active`, $options).addClass('hidden');
                        }
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
                $(`button.${k} i:first`, $options).addClass(v.icon);
                button.rebind('click.slideshow-order', () => clickHandler(k));
            }

            $('i:last', $button).addClass(this._config[id].icon);
            $(`button.${id} i.icon-active`, $options).removeClass('hidden');
        }

        /**
         * To be called when any setting is changed
         * Set order defaultConfig (shuffle) and disable other order options or enable all
         * @param {Object} $container - jquery element containing settings
         * @param {*} name - setting name
         * @returns {void}
         */
        onConfigChange($container, name) {
            const {utils, manager, settings} = mega.slideshow;

            if (this.name === name) {
                manager.setState({isReset: true, isChangeOrder: true});
            }

            if (name === undefined || name === settings.sub.name) {
                let id;
                if (!utils.isCurrentDirFlat() && settings.sub.getValue() === 1) {
                    id = this._defaultConfig;
                    fmconfig.viewercfg[this.name] = this._config[id].cfg;
                    mega.config.set('viewercfg', fmconfig.viewercfg);
                }
                this._enable($container, id);
            }
        }

        /**
         * Set order defaultConfig (shuffle) and disable other order options or enable all
         * determined by "id"
         * @param {Object} $container - jquery element containing settings
         * @param {String} id - specific setting
         * @returns {void}
         */
        _enable($container, id) {
            const $button = $(`button.${this.name}`, $container);
            const $options = $(`nav.${this.name}`, $container);

            for (const [k, v] of Object.entries(this._config)) {
                if (id === undefined) {
                    if (v.cfg === this.getDefaultCfg()) {
                        $('i:last', $button).addClass(v.icon);
                        $(`button.${k} i.icon-active`, $options).removeClass('hidden');
                    }
                    else {
                        $('i:last', $button).removeClass(v.icon);
                        $(`button.${k} i.icon-active`, $options).addClass('hidden');
                    }
                    $(`button.${k}`, $options).removeClass('disabled');
                }
                else if (k === this._defaultConfig) {
                    $('i:last', $button).addClass(v.icon);
                    $(`button.${k} i.icon-active`, $options).removeClass('hidden');
                    $(`button.${k}`, $options).removeClass('disabled');
                }
                else {
                    $('i:last', $button).removeClass(v.icon);
                    $(`button.${k} i.icon-active`, $options).addClass('hidden');
                    $(`button.${k}`, $options).addClass('disabled');
                }
            }
        }

        /**
         * Sort list of indexes
         * In case chat items, given list of indexes is already time sorted (ascending), reversed_list (descending)
         * Otherwise, order will be based on the mtime and name of the nodes they correspond to
         * @param {Array} indexList - list of indexes to sort
         * @param {Array} nodeList - list of nodes referenced on the list of indexes
         * @param {Number} d - sort direction. 1: ascending, -1: descending
         * @returns {Array} Sorted list of indexes
         */
        _timeSort(indexList, nodeList, d) {
            if (M.chat) {
                return d === 1 ? indexList : indexList.reverse();
            }

            return indexList.sort((a, b) => {
                a = nodeList[a];
                b = nodeList[b];

                const time1 = a.mtime - a.mtime % 60;
                const time2 = b.mtime - b.mtime % 60;
                if (time1 !== time2) {
                    return (time1 < time2 ? -1 : 1) * d;
                }

                return M.compareStrings(a.name, b.name, d);
            });
        }
    };
});
