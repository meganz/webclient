/**
 * Create a banner object that covers top alerts, inline alerts and inline advertisements
 *
 * @parent MegaComponent
 * @features type, title, message, left-icon, right-icon/advertisement, action button text
 * @structure Banner component is used by MegaRack for top-alert banners and directly for inline banners.
 * @example
 * // MegaMobileBanner({
 *     parentNode: XXX,
 *
 * })
 *
 */
class MegaMobileBanner extends MegaComponent {

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

        this.domNode.classList.add('banner', 'alert');

        const contentBox = mCreateElement('div', {'class': 'content-box'}, [
            mCreateElement('span', {'class': 'banner title-text'}),
            mCreateElement('span', {'class': 'banner message-text'}),
        ]);

        // CTA button
        const interactableClass = options.actionButtonType === 'link' ? MegaLink : MegaButton;
        this.actionButton = new interactableClass({
            parentNode: contentBox,
            text: 'b',
            type: 'normal',
            componentClassname: 'action-link'
        });
        this.actionButton.on('tap.close', () => {
            this.trigger('cta');
        });
        this.domNode.appendChild(contentBox);

        const endBox = this.domNode.appendChild(mCreateElement('div', {'class': 'banner end-box'}));
        // Close button
        this.xButton = new MegaButton({
            parentNode: endBox,
            type: 'icon',
            icon: 'sprite-mobile-fm-mono icon-dialog-close',
            iconSize: 24,
            componentClassname: 'text-icon'
        });
        this.xButton.on('tap.close', () => {
            if (typeof this.collapsed !== 'undefined') {
                this.collapsed = !this.collapsed;
                return;
            }
            this.trigger('close');
            this.hide();
        });

        this.text = options.text || '';
        this.title = options.title || '';
        this.icon = options.icon || '';
        this.name = options.name || '';

        if (options.icon && options.iconSize) {
            this.iconSize = options.iconSize || 24;
        }

        this.rightIcon = options.rightIcon || '';
        this.closeButton = options.closeButton !== false;
        this.actionButtonText = options.actionButtonText || '';
        this.displayType = options.displayType || 'info';

        if (options.displayType !== 'inline') {
            this.isSystemWide = options.isSystemWide || false;
        }
    }

    /**
     * Clear the contents of the banner and the associated event listeners.
     *
     * @returns {undefined}
     */
    clear() {

        this.title = '';
        this.text = '';
        this.name = '';
        this.collapsed = false;
        this.icon = '';
        this.iconSize = '24';
        this.rightIcon = '';
        this.closeButton = true;
        this.actionButtonText = '';
        this.displayType = 'info';

        this.off('close');
        this.off('cta');
        delete this._collapsed;
    }

    /**
     * Get the current left icon.
     *
     * @returns {String} Current icon class
     */
    get icon() {

        return this.domNode.icon && this.domNode.icon.c;

    }

    /**
     * Set the left icon to a specified classname.
     * An empty classname will cause the left icon element to be removed
     * from the DOM.
     * If the element doesn't already exist, this set function will create it.
     *
     * @param {String} [iconClass] The class of the requested icon.
     *
     * @returns {undefined}
     */
    set icon(iconClass) {

        let elm = this.domNode.querySelector('.banner.left-icon');

        if (!iconClass) {
            if (elm) {
                elm.remove();
            }
            return;
        }

        if (!elm) {

            elm = document.createElement('i');

            this.domNode.prepend(elm);
            this.domNode.icon = {};
        }

        elm.className = `banner left-icon ${iconClass}`;
        this.domNode.icon.c = iconClass;

    }

    /**
     * Get the left icon size.
     *
     * @returns {String} left icon size
     */
    get iconSize() {
        return this.domNode.icon.s;
    }

    /**
     * Set the left icon size.
     *
     * @param {String} [iconSize] left icon size.
     *
     * @returns {undefined}
     */
    set iconSize(size) {
        if (!this.icon) {
            console.error('Icon not found');
            return;
        }

        const sizeClass = MegaMobileBanner.iconSizesClass[size];

        if (!sizeClass) {
            console.error(`Icon size is not valid, valid sizes are:
                ${Object.keys(MegaMobileBanner.iconSizesClass).toString()}`);
            return;
        }

        this.domNode.icon.s = size;

        const elm = this.domNode.querySelector('.left-icon');

        if (elm) {
            elm.classList.remove(MegaMobileBanner.iconSizesClass[this.domNode.icon.s]);
            elm.classList.add(sizeClass);
        }
    }

    /**
     * Get the current right (advertisement) icon.
     *
     * @returns {String} Current icon class
     */
    get rightIcon() {

        return this.domNode.rightIcon.c;

    }

    /**
     * Set the right (advertisement) icon to a specified classname.
     * An empty classname will cause the left icon element to be removed
     * from the DOM.
     * If the element doesn't already exist, this set function will create it.
     *
     * @param {String} [iconClass] The class of the requested icon.
     *
     * @returns {undefined}
     */
    set rightIcon(iconClass) {

        let elm = this.domNode.querySelector('.banner.right-icon');

        if (!iconClass) {
            if (elm) {
                elm.remove();
            }
            return;
        }

        if (!elm) {

            elm = document.createElement('i');

            this.domNode.querySelector('.end-box').appendChild(elm);
            this.domNode.rightIcon = {};
        }

        elm.className = `banner right-icon ${iconClass}`;
        this.domNode.rightIcon.c = iconClass;

    }

    /**
     * Get the close button status.
     *
     * @returns {boolean} True if the close button is visible, else false.
     */
    get closeButton() {

        return !this.xButton.domNode.classList.contains('hidden');

    }

    /**
     * Set the close button to be visible (true) or not (false).
     *
     * @param {Boolean} visible Whether the close button should be visible or not.
     *
     * @returns {undefined}
     */
    set closeButton(visible) {

        if (visible) {
            this.xButton.icon = 'sprite-mobile-fm-mono icon-dialog-close';
            this.xButton.domNode.classList.remove('hidden');
            return;

        }

        this.xButton.domNode.classList.add('hidden');
    }

    /**
     * Set the action/call to action button text.
     *
     * @param {String} [message=''] The new text.
     *
     * @returns {undefined}
     */
    set actionButtonText(message) {
        if (message) {
            this.actionButton.domNode.classList.remove('hidden');
            this.actionButton.text = message;
        }
        else {
            this.actionButton.domNode.classList.add('hidden');
        }
    }

    /**
     * Get the current action button text.
     *
     * @returns {String} Action button text contents.
     */
    get actionButtonText() {

        return this.actionButton.text;

    }

    /**
     * Get the current type of colour scheme/display used.
     *
     * @returns {String} The current classname of the displayType.
     */
    get displayType() {

        return this.domNode.displayType;

    }

    /**
     * Set the colour scheme/display type.
     *
     * @param {String} [value] The classname of the requested display type, from
     * MegaMobileBanner.displayTypes.
     *
     * @returns {undefined}
     */
    set displayType(value) {

        this.domNode.classList.remove(this.displayType);

        if (MegaMobileBanner.displayTypes.includes(value)) {

            this.domNode.displayType = value;
            this.domNode.classList.add(value);

        }
    }

    /**
     * Get whether the banner alert is system wide or not.
     *
     * @returns {Boolean} True if the banner alert is system wide, else false.
     */
    get isSystemWide() {

        return this.domNode.isSystemWide;

    }

    /**
     * Set the banner alert to be system wide (true) or not (false).
     *
     * @param {Boolean} [systemWide] Whether the banner alert is system wide or not.
     *
     * @returns {undefined}
     */
    set isSystemWide(systemWide) {

        if (systemWide) {
            mega.ui.alerts.addClass('system-wide');
            mega.ui.topmenu.addClass('system-wide');
        }
        else {
            mega.ui.alerts.removeClass('system-wide');
            mega.ui.topmenu.removeClass('system-wide');
        }

    }

    /**
     * Get the current message text.
     *
     * @returns {String} Current text.
     */
    get text() {

        return this.domNode.querySelector('.message-text').innerText;

    }

    /**
     * Set a new message text.
     *
     * @param {String} [text=''] The new message text.
     *
     * @returns {undefined}
     */
    set text(text = '') {
        const textNode = this.domNode.querySelector('.message-text');

        if (typeof text === 'string') {
            textNode.textContent = text;
        }
        else {
            textNode.textContent = '';
            textNode.appendChild(text);
        }
    }

    /**
     * Get the current message title.
     *
     * @returns {String} Current title.
     */
    get title() {

        return this.domNode.querySelector('.title-text').innerText;

    }

    /**
     * Set a new title text.
     *
     * @param {String} [text=''] The new message text.
     *
     * @returns {undefined}
     */
    set title(text) {

        this.domNode.querySelector('.title-text').innerText = text || '';

    }

    get collapsed() {
        return this._collapsed;
    }

    set collapsed(collapse) {
        this._collapsed = collapse;
        this.xButton.icon =
            `sprite-fm-mono ${collapse ? 'icon-arrow-down-thin-solid' : 'icon-arrow-up-thin-solid'}`;
        const textNode = this.domNode.querySelector('.message-text');
        if (collapse) {
            textNode.classList.add('hidden');
        }
        else {
            textNode.classList.remove('hidden');
        }
        this.actionButton[collapse ? 'hide' : 'show']();
    }

    /**
     * Create MegaRacks at runtime as appropriate to display alerts and ads.
     *
     * @returns {undefined}
     */
    static init() {
        // No need to re-initialise if it has already been done before
        if (mega.ui.alerts) {
            return;
        }

        // Single alerts instant object
        mega.ui.alerts = new MegaRack({
            parentNode: mega.ui.header.bannerHolder,
            componentClassname: 'banner-rack flow-up top',
            prependRack: true,
            childComponent: MegaMobileBanner,
            instanceOptions: {
                componentClassname: 'alert'
            }
        });

        // Secondary alerts instant object
        mega.ui.secondaryAlerts = new MegaRack({
            parentNode: mega.ui.header.secondaryBannerHolder,
            componentClassname: 'banner-rack flow-up top',
            prependRack: true,
            childComponent: MegaMobileBanner,
            instanceOptions: {
                componentClassname: 'alert'
            }
        });

        // Create helpers for creating inline ads and alerts.
        mobile.inline = Object.create(null);
        mobile.inline.ads = Object.create(null);
        mobile.inline.ads.create = function(options) {
            return new MegaMobileBanner({
                ...options,
                componentClassname: `${options.componentClassname} inline`,
                displayType: 'advertisement'
            });
        };
        mobile.inline.alert = Object.create(null);
        mobile.inline.alert.create = function(options) {
            return new MegaMobileBanner({
                ...options,
                componentClassname: `${options.componentClassname} inline`,
                displayType: 'inline'
            });
        };

        mobile.banner = {
            icon: {
                info: 'sprite-mobile-fm-mono icon-alert-circle-thin-outline',
                warning: 'sprite-mobile-fm-mono icon-alert-circle-thin-outline',
                error: 'sprite-mobile-fm-mono icon-alert-triangle-thin-outline',
                success: 'sprite-mobile-fm-mono icon-check-circle-thin-outline',
                advertisement: 'sprite-mobile-fm-uni icon-mega-logo-rounded-square'
            },
            show: (opts = {}) => {
                const {
                    name, title, msgText, msgHtml, ctaText,
                    secondary, type, closeBtn, systemWide, clear
                } = opts;

                if (clear) {
                    mega.ui.alerts.hideSlots();
                }

                return mega.ui[secondary ? 'secondaryAlerts' : 'alerts'].show(function() {
                    this.name = name;
                    this.title = title;
                    this.text = msgHtml ? parseHTML(msgHtml) : msgText;
                    this.actionButtonText = ctaText;
                    this.displayType = type;
                    this.icon = mobile.banner.icon[type];
                    this.iconSize = type === 'advertisement' ? '48' : '24';
                    this.closeButton = typeof closeBtn === 'undefined' ? true : closeBtn;
                    this.isSystemWide = typeof systemWide === 'undefined' ? true : systemWide;
                    this.domNode.classList.remove('hidden');
                    this.wrapperNode.classList.remove('hidden');
                    if (closeBtn === false) {
                        this.closeButton = false;
                        this.collapsed = false;
                    }
                });
            },
            hide: (n, toSleep) => {
                const slots = [...mega.ui.alerts.slotList, ...mega.ui.secondaryAlerts.slotList];
                let i = slots.length;

                n = typeof n === 'string' ? [n] : n;
                while (i--) {
                    if (!n || n.includes(slots[i].name)) {
                        slots[i].trigger('close');
                        slots[i].hide(toSleep);
                    }
                }
            }
        };

        mBroadcaster.addListener('pagechange', () => {

            if (is_fm() || isPublicLink()) {
                mega.ui.alerts.removeClass('hidden');
            }
            else {
                mega.ui.alerts.addClass('hidden');
            }
        });

        if (u_attr && (u_attr.b || u_attr.pf)) {
            M.require('businessAcc_js', 'businessAccUI_js').done(() => {
                const busUI = new BusinessAccountUI();
                busUI.showExp_GraceUIElements();
            });
        }
    }
}

/**
 * The avaliable types of colour schemes/display modes for the banners.
 *
 * @type {string[]}
 */
MegaMobileBanner.displayTypes = Object.freeze([
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
MegaMobileBanner.iconSizesClass = Object.freeze({
    24: 'icon-size-24',
    48: 'icon-size-48',
});


mBroadcaster.once('fm:initialized', () => {
    'use strict';

    MegaMobileBanner.init();
});
