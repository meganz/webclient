/**
 * Device Centre UI element Shimmer
 *
 * Codebase to interact with device centre UI Shimmer
 */
lazy(mega.devices.uiElems, 'Shimmer', () => {
    'use strict';

    /**
     * Shimmer for Device Centre
     */
    return class {
        constructor($container) {
            /**
             * {bool} isReady - whether shimmer is already initialised
             */
            this.isReady = false;

            /**
             * {jQuery} $shimmer - jQuery object
             */
            this.$shimmer = $('.device-centre-shimmer', $container);

            /**
             * {Object} template - shimmer parsed HTML template
             */
            lazy(this, 'template', () => {
                const res = pages.deviceccentre_html || getTemplate('device_centre_shimmer_html');
                delete pages.deviceccentre_html;
                return parseHTML(res).querySelector('template');
            });
        }

        /**
         * Shows shimmer
         * @returns {void}
         */
        show() {
            this.$shimmer.removeClass('hidden');

            if (!this.isReady) {
                const {content} = this.template;

                for (let i = 0; i < Math.ceil($(window).innerHeight() / 80); i++) {
                    const newItem = $(content).clone(true);
                    this.$shimmer.append(newItem);
                }
                this.isReady = true;
            }
        }

        /**
         * Hides sihmmer
         * @returns {void}
         */
        hide() {
            this.$shimmer.addClass('hidden');
        }
    };
});
