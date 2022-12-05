lazy(mega.slideshow.settings, 'sub', () => {
    'use strict';

    const name = 'sub';

    return new class SlideshowSubSetting extends mega.slideshow.settings.switch {
        /**
         * sub setting handler
         * @returns {SlideshowSubSetting} instance
         */
        constructor() {
            super(
                name,
                0,
                () => !mega.slideshow.utils.isCurrentDirFlat(),
                // set to "false" to deactivate include sub-folders setting functionality
                false
            );
        }

        /**
         * Return if settings have to be rendered: hasToDisable and switch not disabled or viceversa
         * @param {Object} $container - jquery element containing settings
         * @returns {Boolean} whether settings have to update render
         */
        hasToUpdateRender($container) {
            if (!this._isImplemented || typeof this._isAllowed !== 'function') {
                return false;
            }

            const $parent = $(`#${this.name}`, $container).closest('li');
            return this._isAllowed() ?
                $parent.hasClass('disabled') :
                !$parent.hasClass('disabled');
        }

        /**
         * Handle setting changes
         * @param {*} _ unused
         * @param {String} name - name of the setting changed
         * @param {Number} cfg - value of the setting changed
         * @returns {void}
         */
        onConfigChange(_, name, cfg) {
            if (name === this.name && cfg !== undefined) {
                const {utils, manager} = mega.slideshow;
                if (!cfg) {
                    utils.setCurrentDir();
                }
                manager.setState({isReset: true, isAbortFetch: !cfg});
            }
        }
    };
});
