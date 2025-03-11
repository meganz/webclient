/**
 * Create a banner object that covers top alerts, inline alerts and inline advertisements
 *
 * @parent MegaComponent
 * @features type, title, message, left-icon, right-icon/advertisement, action button text
 * @structure Banner component is used by MegaRack for top-alert banners and directly for inline banners.
 * @example
 * // MegaBanner({
 *     parentNode: XXX,
 *
 * })
 *
 */
class MegaBanner extends MegaMobileBanner {

    /**
     * Banner constructor.
     *
     * @param {Object} options Instance options.
     * @param {Object} options.parentNode The node to append the banner to.
     * @param {Object} [options.componentClassname] 'Inline' or 'Alert' + and additional CSS classes.
     * @param {String} [options.title] The banner title.
     * @param {String} [options.text] The banner text message.
     * @param {String} [options.icon] Class of the small left icon.
     * @param {String} [options.iconSize] Size of the left icon.
     * @param {String} [options.rightIcon] Class of the large advertisement icon.
     * @param {Boolean} [options.closeButton] Whether to show the close button (true) or not (false).
     * @param {String} [options.actionButtonText] The text to show on the call to action button.
     * @param {String} [options.displayType] The color scheme of the shown banner.
     * @param {Boolean} [options.isSystemWide] Whether the banner message is across the system or just
     * for the cloud drive.
     */
    constructor(options) {

        super(options);

        this.addClass('pm');

        // Close button
        this.xButton.icon = is_mobile ? 'sprite-fm-mono icon-x-thin-outline' : 'sprite-fm-mono icon-dialog-close';

        if (this.actionButtonText === '') {
            this.actionButton.hide();
        }

        this.xButton.on('click.close', () => {
            this.trigger('close');
            this.hide();
        });
    }

    /**
     * Set the left icon size.
     *
     * @param {String}  [size] left icon size.
     *
     */
    set iconSize(size) {
        if (!this.icon) {
            console.error('Icon not found');
            return;
        }

        const sizeClass = MegaBanner.iconSizesClass[size];

        if (!sizeClass) {
            console.error(`Icon size is not valid, valid sizes are:
                ${Object.keys(MegaBanner.iconSizesClass).toString()}`);
            return;
        }

        this.domNode.icon.s = size;

        const elm = this.domNode.querySelector('.left-icon');

        if (elm) {
            elm.classList.remove(MegaBanner.iconSizesClass[this.domNode.icon.s]);
            elm.classList.add(sizeClass);
        }
    }

    /**
     * Set the colour scheme/display type.
     *
     * @param {String} [value] The classname of the requested display type, from
     * MegaBanner.displayTypes.
     *
     * @returns {void}
     */
    set displayType(value) {

        this.domNode.classList.remove(this.displayType);

        if (MegaBanner.displayTypes.includes(value)) {

            this.domNode.displayType = value;
            this.domNode.classList.add(value);

        }
    }

    /**
     * Set the banner alert to be system wide (true) or not (false).
     *
     * @param {Boolean} [systemWide] Whether the banner alert is system wide or not.
     *
     * @returns {void}
     */
    set isSystemWide(systemWide) {

        if (systemWide) {
            mega.ui.alerts.addClass('system-wide');
        }
        else {
            mega.ui.alerts.removeClass('system-wide');
        }

    }
}

/**
 * The avaliable types of colour schemes/display modes for the banners.
 *
 * @type {string[]}
 */
MegaBanner.displayTypes = Object.freeze([
    'info',
    'warning',
    'success',
    'error',
    'advertisement'
]);

/**
 * The avaliable types of left icon sizes for the banners. Default size is 24 if iconSize
 * is not defined
 */
MegaBanner.iconSizesClass = freeze({
    24: 'icon-size-24',
    48: 'icon-size-48'
});

(mega => {
    "use strict";

    // Single alerts instant object
    lazy(mega.ui, 'alerts', () => new MegaRack({
        parentNode: document.getElementById('pmlayout'),
        componentClassname: 'banner-rack flow-up top',
        prependRack: true,
        childComponent: MegaBanner,
        instanceOptions: {
            componentClassname: 'alert'
        }
    }));

    lazy(mega.ui, 'inlineAlert', () => Object.create(null));

    lazy(mega.ui, 'inlineAlert.create', (options) => {
        return new MegaBanner({
            ...options,
            componentClassname: `${options.componentClassname} inline`,
            displayType: 'inline'
        });
    });

    lazy(mega.ui, 'banner', () => {
        return {
            icon: {
                // info: 'sprite-fm-mono icon-alert-circle-thin-outline',
                // warning: 'sprite-fm-mono icon-alert-circle-thin-outline',
                error: 'sprite-pm-mono icon-alert-triangle-regular-outline',
                // advertisement: 'sprite-mobile-fm-uni icon-mega-logo-rounded-square',
                success: 'sprite-pm-mono icon-check-circle-regular-outline'
            },
            show: (title, message, ctaText, type, closeBtn, systemWide, clear) =>{

                if (clear) {
                    mega.ui.alerts.hideSlots();
                }

                document.body.classList.add('has-banner');

                return mega.ui.alerts.show(function() {
                    this.title = title;
                    this.text = message;
                    this.actionButtonText = ctaText;
                    this.displayType = type;
                    this.icon = mega.ui.banner.icon[type];
                    this.iconSize = type === 'advertisement' ? '48' : '24';
                    this.closeButton = typeof closeBtn === 'undefined' ? true : closeBtn;
                    this.isSystemWide = typeof systemWide === 'undefined' ? true : systemWide;
                });
            }
        };
    });

})(window.mega);
