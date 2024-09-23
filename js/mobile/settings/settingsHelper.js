mobile.settingsHelper = {
    /**
     * Holds a reference the current page. Can be used to determine the
     * current rendered page, as well as call {show|hide|clear}() on it.
     *
     * @type {Object}
     */
    currentPage: undefined,

    /**
     * Holds a reference to the parent node that all account/settings
     * pages are built under.
     *
     * @type {HTMLDivElement}
     */
    parentNode: undefined,

    /**
     * Generate a settings menu item.
     *
     * @param {HTMLBodyElement} targetNode The target node to attach it to.
     * @param {Object} [opt] Options array for the menu item.
     * @param {String} [opt.rightIcon] Right icon
     * @param {String} [opt.text] Menu text
     * @param {String} [opt.subtext] Menu sub text
     * @param {String} [opt.componentClassname] Additional component class(es)
     * @param {String} [opt.icon] Left icon
     * @param {String} [opt.href] Href attribute if binding is not set
     * @param {Function} [opt.binding] Button binding if not a link.
     *
     * @returns {MegaMobileLink|MegaMobileButton} The generated menu item.
     */
    generateMenuItem: function(targetNode, opt) {
        'use strict';

        let menuIcon = '';

        if (opt.defaultRightIcon) {
            menuIcon = 'sprite-mobile-fm-mono icon-chevron-right-thin-outline';
        }
        else if (!(opt.binding || opt.rightIcon === null)) {
            menuIcon = opt.rightIcon || 'sprite-mobile-fm-mono icon-chevron-right-thin-outline';
        }

        const props = {
            type: 'fullwidth',
            componentClassname: `text-icon ${opt.componentClassname || ''}`,
            iconSize: opt.iconSize || 24,
            rightIcon: menuIcon,
            rightIconSize: 24,
            text: opt.text,
            subtext: opt.subtext,
            icon: opt.icon,
            parentNode: targetNode,
            href: opt.binding ? '' : opt.href,
        };
        let item;

        // Infer the tappable type
        if (opt.binding) {
            item = new MegaMobileButton(props);
            item.on('tap', opt.binding);
        }
        else {
            item = new MegaMobileLink(props);
        }
        if (opt.eventLog) {
            item.rebind('tap.eventlog', () => eventlog(opt.eventLog));
        }
        return item;
    },

    /**
     * Generate a settings page.
     *
     * @param {String} name The CSS class name of the page.
     * @param {HTMLDivElement} [targetNode] The node to attach it to.
     *
     * @returns {HTMLDivElement} The generated page domNode.
     */
    generatePage: function(name, targetNode) {
        'use strict';

        if (!targetNode) {
            // Generate a parent if it doesn't exist
            if (!mobile.settingsHelper.parentNode) {
                const parentNode = document.createElement('div');
                parentNode.classList.add('mobile', 'my-account-page', 'fm-scrolling');
                document.getElementById('fmholder').appendChild(parentNode);
                mobile.settingsHelper.parentNode = parentNode;
            }

            targetNode = mobile.settingsHelper.parentNode;
        }

        const page = document.createElement('div');
        page.classList.add('mega-mobile-settings', 'hidden');

        if (name) {
            page.classList.add(name);
        }
        targetNode.appendChild(page);

        return page;
    },

    /**
     * Show the current page.
     *
     * @returns {undefined}
     */
    show: function() {
        'use strict';

        mega.ui.header.update();

        if (this.domNode) {

            const fmholder = document.getElementById('fmholder');

            // For case when popstate between folder link and fm and clear fmholder triggered
            if (!fmholder.contains(mobile.settingsHelper.parentNode)) {
                fmholder.appendChild(mobile.settingsHelper.parentNode);
            }

            document.body.scrollTo(0, 0);

            this.domNode.classList.remove('hidden');
            if (this.parentNode.classList.contains('hidden')) {
                this.parentNode.classList.remove('hidden');
            }
            if (this.updateCallback && typeof this.updateCallback === 'function') {
                this.updateCallback();
            }
        }
        // Init it if we are asked to show it but it doesn't
        // exist yet.
        else if (this.init && typeof this.init === 'function') {
            this.init();
        }

        mobile.settingsHelper.currentPage = this;
    },

    /**
     * Hide the current page.
     *
     * @returns {undefined}
     */
    hide: function() {
        'use strict';

        if (this.domNode) {
            this.domNode.classList.add('hidden');
        }
    },

    /**
     * Clear the current page.
     *
     * @returns {undefined}
     */
    clear: function() {
        'use strict';

        this.hide();
        this.domNode.remove();
    }
};
