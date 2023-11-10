/**
 * Create a banner object that covers top alerts, inline alerts and inline advertisements
 *
 * @parent MegaMobileComponent
 * @features type, title, message, left-icon, right-icon/advertisement, action button text
 * @structure Banner component is used by MegaMobileRack for top-alert banners and directly for inline banners.
 * @example
 * // MegaMobileBanner({
 *     parentNode: XXX,
 *
 * })
 *
 */
class MegaMobileBanner extends MegaMobileComponent {

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
        this.actionButton = new MegaMobileButton({
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
        this.xButton = new MegaMobileButton({
            parentNode: endBox,
            type: 'icon',
            icon: 'sprite-mobile-fm-mono icon-x-thin-outline',
            iconSize: 24,
            componentClassname: 'text-icon'
        });
        this.xButton.on('tap.close', () => {
            this.trigger('close');
            this.hide();
        });

        this.text = options.text || '';
        this.title = options.title || '';
        this.icon = options.icon || '';

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
        this.icon = '';
        this.iconSize = '24';
        this.rightIcon = '';
        this.closeButton = true;
        this.actionButtonText = '';
        this.displayType = 'info';

        this.off('close');
        this.off('cta');
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
        this.actionButton.text = message || '';
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
    set text(text) {
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

    /**
     * Create MegaMobileRacks at runtime as appropriate to display alerts and ads.
     *
     * @returns {undefined}
     */
    static init() {
        // No need to re-initialise if it has already been done before
        if (mega.ui.alerts) {
            return;
        }

        // Single alerts instant object
        mega.ui.alerts = new MegaMobileRack({
            parentNode: mainlayout,
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
                advertisement: 'sprite-mobile-fm-uni icon-mega-logo-rounded-square'
            },
            show: function(title, message, ctaText, type, closeBtn, systemWide, clear) {

                if (clear) {
                    mega.ui.alerts.hideSlots();
                }

                return mega.ui.alerts.show(function() {
                    this.title = title;
                    this.text = message;
                    this.actionButtonText = ctaText;
                    this.displayType = type;
                    this.icon = mobile.banner.icon[type];
                    this.iconSize = type === 'advertisement' ? '48' : '24';
                    this.closeButton = typeof closeBtn === 'undefined' ? true : closeBtn;
                    this.isSystemWide = typeof systemWide === 'undefined' ? true : systemWide;
                });
            }
        };

        mBroadcaster.addListener('pagechange', () => {
            const isPub = isPublicLink() || isPublickLinkV2();

            if (is_fm() || isPub) {
                mega.ui.alerts.removeClass('hidden');
            }
            else {
                mega.ui.alerts.addClass('hidden');
            }
        });

        if (u_attr) {
            // Business and Pro user account validity check
            if (u_attr.b) {
                if (u_attr.b.s === -1) {
                    mega.ui.sheet.hide();

                    if (u_attr.b.m) {
                        const banner = mobile.banner.show(
                            l[20401], l.payment_failed_and_not_resolved, l.pay_and_reactivate, 'error', false);
                        banner.on('cta', () => loadSubPage('repay'));

                        mega.ui.sheet.show({
                            name: 'bmaster-user-expired',
                            type: 'modal',
                            showClose: true,
                            icon: 'sprite-mobile-fm-mono icon-alert-triangle-thin-outline icon error',
                            title: l[20401],
                            contents: [parseHTML(l[20402])],
                            actions: [
                                {
                                    type: 'normal',
                                    text: l[20403],
                                    className: 'primary',
                                    onClick: () => {
                                        mega.ui.sheet.hide();
                                        loadSubPage('repay');
                                    }
                                }
                            ]
                        });
                    }
                    else {
                        // sub user
                        if (u_attr.b.s === -1) { // expired
                            mobile.banner.show(
                                l.bsub_user_account_exp_title,
                                l.bsub_user_account_exp_msg,
                                '',
                                'error',
                                false
                            );
                        }

                        // sheet
                        mega.ui.sheet.show({
                            name: 'bsub-user-expired',
                            type: 'modal',
                            showClose: true,
                            icon: 'sprite-mobile-fm-mono icon-alert-triangle-thin-outline icon error',
                            title: l.bsub_user_account_exp_title,
                            contents: [l.bsub_user_account_exp_msg],
                            actions: [
                                {
                                    type: 'normal',
                                    text: l[81],
                                    className: 'primary',
                                    onClick: () => {
                                        mega.ui.sheet.hide();
                                    }
                                }
                            ]
                        });
                    }

                    return false;
                }

                if (u_attr.b.m) {
                    if (u_attr.b.s === 2) {
                        // grace
                        const banner = mobile.banner.show(
                            l.payment_not_processed_title, l.payment_not_processed_msg, l.update_card, 'error', false);
                        banner.on('cta', () => loadSubPage('fm/account/paymentcard'));
                    }

                    // storage and transfer quota exceed the base quota
                    if (!u_attr['^buextra'] || sessionStorage.buextra) {
                        if (sessionStorage.buextra) {
                            const banner = mobile.banner.show(
                                l.additional_storage_usage_title, l.additional_storage_usage_msg, l.read_more, 'info');
                            banner.on('cta', () => {
                                location.href = 'https://help.mega.io/plans-storage/space-storage/pay-as-you-go';
                            });
                        }
                        else {
                            M.accountData((account) => {
                                if (account.space_bus_ext || account.tfsq_bus_ext) {
                                    sessionStorage.buextra = 1;
                                    mega.attr.set('buextra', 1, -2, 0);
                                }
                            });
                        }
                    }
                }
            }

            // If Pro Flexi
            if (u_attr.pf) {
                // If expired, show red banner
                if (u_attr.pf.s === -1) {
                    const banner = mobile.banner.show(
                        l.pf_account_deactivated_title, l.pf_account_deactivated_msg, l.reactivate_account, 'error');
                    banner.on('cta', () => loadSubPage('repay'));

                    // sheet
                    mega.ui.sheet.show({
                        name: 'pf-account-expired',
                        type: 'modal',
                        showClose: true,
                        icon: 'sprite-mobile-fm-mono icon-alert-triangle-thin-outline icon error',
                        title: l.pf_account_deactivated_title,
                        contents: [parseHTML(l.pro_flexi_account_suspended_description)],
                        actions: [
                            {
                                type: 'normal',
                                text: l[20403],
                                className: 'primary',
                                onClick: () => {
                                    mega.ui.sheet.hide();
                                    loadSubPage('repay');
                                }
                            }
                        ]
                    });
                }
                else if (u_attr.pf.s === 2) {
                    // grace period
                    const banner = mobile.banner.show(
                        l.payment_not_processed_title, l.payment_not_processed_msg, l.update_card, 'error');
                    banner.on('cta', () => loadSubPage('fm/account/paymentcard'));
                }
            }
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
