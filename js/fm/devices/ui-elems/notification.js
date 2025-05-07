/**
 * Device Centre UI element Notification
 *
 * Codebase to interact with device centre UI Notification
 */
lazy(mega.devices.uiElems, 'Notification', () => {
    'use strict';

    /**
     * Notification for Device Centre
     */
    return class {
        constructor($container) {
            /**
             * {jQuery} $notification - jQuery object
             */
            this.$notification = $('.fm-notification-block.device-centre', $container);

            /**
             * {jQuery} $text - jQuery object
             */
            this.$text = $('span', this.$notification);
        }

        show(message) {
            this.$notification.addClass('visible');
            this.$text.text(message);
        }

        hide() {
            this.$notification.removeClass('visible');
            this.$text.text('');
        }
    };
});
