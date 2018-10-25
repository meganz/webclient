/**
 * The AlertBanner on Mobile.
 */
mobile.alertBanner = {

    /**
     * Cached jQuery selector.
     */
    $alertBanner: null,
    $alertBannerText: null,

    /**
     * Available Preset Styles.
     */
    styles: {
        WARNING: 'warning',
        ERROR: 'error'
    },

    /**
     * Timer.
     */
    timer: null,

    /**
     * Init Alert Banner
     */
    init: function() {
        'use strict';

        this.$alertBanner = $(".mobile.alert-banner");
        this.$alertBannerText = this.$alertBanner.find(".alert-text span");
        var $alertBannerCloseButton = this.$alertBanner.find(".alert-close");

        // Handle close button click.
        $alertBannerCloseButton.off('tap').on('tap', function() {
            mobile.alertBanner.close();
            return false;
        });
    },

    /**
     * Show the alert banner with message, type and click callback.
     * @param message The message to show
     * @param style Optional The style class to apply {warning, error, null}
     * @return {this}
     */
    show: function(message, style) {
        'use strict';

        if (this.$alertBanner === null) {
            this.init();
        }

        this.$alertBannerText.text(message);

        this.$alertBanner.removeClass('warning error');
        if (style !== null) {
            this.$alertBanner.addClass(style);
        }

        this.$alertBanner.removeClass('hidden');
        this.$alertBanner.off('tap');

        this.removeTimeout();

        return this;
    },

    /**
     * Show a warning alert.
     * @param message
     * @return {this}
     */
    showWarning: function(message) {
        'use strict';
        return this.show(message, this.styles.WARNING);
    },

    /**
     * Show an error alert.
     * @param message
     * @return {this}
     */
    showError: function(message) {
        'use strict';
        return this.show(message, this.styles.ERROR);
    },

    /**
     * Hide the alert banner.
     */
    close: function() {
        'use strict';
        this.$alertBanner.addClass('hidden');
    },

    /**
     * Remove the timeout if there is one present.
     * @return {this}
     */
    removeTimeout: function() {
        'use strict';

        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        return this;
    },

    /**
     * Register onTap listener for alert dialog.
     * @param {Function} handler onClick handler.
     * @return {this}
     */
    onTap: function(handler) {
        'use strict';
        return this.on('tap', handler);
    },

    /**
     * Register an event handler to the alert banner.
     * @param {String} event The event to listen for.
     * @param {Function} handler The function to run.
     */
    on: function(event, handler) {
        'use strict';
        if (handler instanceof Function) {
            this.$alertBanner.off(event).on(event, function() {
                mobile.alertBanner.close();
                handler();
                return false;
            });
        }
        return this;
    },

    /**
     * Set a timeout for the banner.
     * @param timeout
     * @return {this}
     */
    setTimeout: function(timeout) {
        'use strict';

        this.removeTimeout();
        if (timeout) {
            this.timer = setTimeout(function () {
                mobile.alertBanner.close();
            }, timeout);
        }
        return this;
    }
};
