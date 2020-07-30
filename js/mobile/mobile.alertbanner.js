/**
 * The AlertBanner on Mobile.
 */
mobile.alertBanner = {

    /**
     * Cached jQuery selector.
     */
    $fileManagerBlock: null,
    $fmScrolling: null,
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

        this.$fileManagerBlock = $(".mobile.file-manager-block");
        this.$fmScrolling = this.$fileManagerBlock.find(".mobile.fm-scrolling");
        this.$alertBanner = $(".mobile.alert-banner");
        this.$alertBannerText = this.$alertBanner.find(".alert-text");
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

        // Decide if should be fixed and if we need to adjust viewport scroll position.
        var currentScrollOffset = this.$fmScrolling.scrollTop();
        if (currentScrollOffset > 60 && !this.$fileManagerBlock.hasClass('fixed-alert-banner')) {
            if (this.$alertBanner.hasClass('closed')) {
                this.$fmScrolling.scrollTop(currentScrollOffset + 60);
            } else {
                this.$alertBanner.addClass('closed');
            }
            this.$fileManagerBlock.addClass('fixed-alert-banner');
            this.attachScrollListener();
        }

        this.$alertBannerText.safeHTML(message);

        this.$alertBanner.removeClass('warning error business');
        if (style !== null) {
            this.$alertBanner.addClass(style);
        }
        this.$alertBanner.removeClass('closed hidden');
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
        this.$alertBanner.addClass('closed');
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
        if (this.$alertBanner === null) {
            this.init();
        }
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
                handler();
                return false;
            });
        } else {
            console.warn("mobile.alertBanner.on was passed an invalid event handler");
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
    },

    /**
     * Attach the scroll event handler to the fm-scrolling.
     * This is only attached if we use the fixed-alert-banner to avoid
     * running the event handler when we do not need to.
     */
    attachScrollListener: function() {
        'use strict';

        this.$fmScrolling.off('scroll').on('scroll', SoonFc(function(e) {
            var toggleHeight = mobile.alertBanner.$alertBanner.hasClass('closed') ? 60 : 0;
            if ($(e.target).scrollTop() <= toggleHeight) {
                mobile.alertBanner.$fileManagerBlock.removeClass('fixed-alert-banner');
                mobile.alertBanner.$fmScrolling.off('scroll');
                mobile.alertBanner.$fmScrolling.scrollTop(0);
            }
        }));
    }
};
