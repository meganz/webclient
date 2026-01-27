/**
 * This file handles the Public Service Announcements. One announcement will
 * appear at the bottom of the page in an overlay at a time. The announcements
 * come from a hard coded list initially. Once a user has seen an announcement
 * they will mark it as read on the API server. If a user is not logged in
 * then it will mark that announcement as seen in localStorage.
 */

/**
 * Common utils
 */
var psaUtils = {
    /**
     * Returns decoded text from encoded source text
     * @param {String} encoded text
     * @returns {String} decoded text
     */
    decodeText: (encoded) => {
        'use strict';

        if (encoded) {
            return from8(base64urldecode(encoded));
        }
    },

    /**
     * Returns a resolution suffix based on the device's pixel ratio
     * @returns {String} suffix
     */
    retinaSuffix: () => {
        'use strict';

        return window.devicePixelRatio > 1 ? '@2x' : '';
    }
};

/**
 * PSA Banner configuration entity created out of data retrieved from API 'gpsa' command
 * {
 *      id: integer psa id
 *      dsp: string default images path
 *      img: string url to image on one of our static servers
 *      t: string psa title, already translated into user's known language if available
 *      d: string psa body/description, already translated if available
 *      b: string button label for primary button, can be empty if not provided
 *      l: string link url for the primary button (this can be empty if not provided)
 *      b2: string button label for secundary button, can be empty if not provided
 *      l2: string link url for the secundar button (this can be empty if not provided)
 * }
 */
class PsaBannerConfig {
    constructor(id, dsp, img, title, desc, buttons) {
        this.id = id;
        this.img = img;
        this.dsp = dsp;
        this.title = title;
        this.desc = desc;
        this.buttons = buttons;
    }

    static fromRaw(raw) {
        const {id, dsp, img, t, d, b, l, b2, l2} = raw;
        const {decodeText} = psaUtils;

        const buttons = [];

        if (b && l) {
            const label = decodeText(b);
            if (label) {
                buttons.push({
                    label,
                    link: l,
                });
            }
        }

        if (b2 && l2) {
            const label = decodeText(b2);
            if (label) {
                buttons.push({
                    label,
                    link: l2,
                });
            }
        }

        return new this(
            id,
            dsp,
            img,
            decodeText(t),
            decodeText(d),
            buttons
        );
    }

    get isValid() {
        return !!(this.title && this.desc);
    }

    get path() {
        return `${staticpath}images/mega/psa/${this.img}${psaUtils.retinaSuffix()}.png`;
    }

    get url() {
        return `${this.dsp}${this.img}${psaUtils.retinaSuffix()}.png`;
    }
}

/**
 * PSA banner DOM node
 */
class PsaBannerNode {
    constructor(selector) {
        this.topMargin = 10;
        this.selector = selector;
    }

    /**
     * Returns PSA banner DOM node
     *
     * @returns {Object} DOM node
     */
    get el() {
        return document.querySelector(this.selector);
    }

    /**
     * Returns PSA banner visibility
     *
     * @returns {Boolean} whether is visible
     */
    get isVisible() {
        const {el} = this;
        return el ? !el.classList.contains('hidden') : false;
    }

    /**
     * Returns calculated banner height value in pixels
     *
     * @returns {Number} number of pixels
     */
    getHeight() {
        const {el, topMargin, isVisible} = this;
        if (!(el && isVisible)) {
            return 0;
        }

        const {bottom} = getComputedStyle(el);
        const bottomVal = bottom ? +bottom.replace('px', '') : 0;

        return el.offsetHeight + bottomVal + topMargin;
    }
}

/**
 * UI layout capable of repositioning elements depending on PSA banner visibility
 */
class PsaLayoutManager {
    constructor(banner) {
        this.banner = banner;
    }

    /**
     * Moves DOM element defined by "selector" adjusting "bottom" property
     * depending on:
     * - PSA banner visibility and size
     * - PSA banner overlayed by any dialog
     *
     * @param {String} selector DOM element selector to move
     * @param {Number} original original bottom property
     * @returns {Object} self instance
     */
    move(selector, original) {
        const el = document.querySelector(selector);
        if (el && !is_mobile) {
            if (this.banner.isVisible && !el.closest('.overlayed')) {
                el.style.bottom = `${this.banner.getHeight() + original}px`;
            }
            else if (original) {
                el.style.bottom = `${original}px`;
            }
            else {
                el.style.removeProperty('bottom');
            }
        }

        return this;
    }

    /**
     * Resizes DOM element defined by "selector" adjusting "height" property
     * depending on PSA banner visibility and size
     *
     * @param {String} selector DOM element selector to resize
     * @param {Boolean} isAbsolute Whether resize of the elment is absolute or relative to document height
     * @returns {Object} self instance
     */
    resize(selector, isAbsolute) {
        const el = document.querySelector(selector);
        if (el && !is_mobile) {
            if (this.banner.isVisible) {
                el.style.height = !isAbsolute && document.body.offsetHeight
                    ? `${document.body.offsetHeight - this.banner.getHeight()}px`
                    : `${this.banner.getHeight()}px`;
            }
            else {
                el.style.removeProperty('height');
            }
        }

        return this;
    }

    /**
     * Resizes DOM avatar menu defined by "selector" adjusting "max-height" property
     * depending on PSA banner visibility and size
     *
     * @param {String} selector DOM element selector to move
     * @returns {Object} self instance
     */
    avatarMenu(selector) {
        const el = document.querySelector(selector);
        if (el && !is_mobile) {
            el.style.maxHeight = this.banner.isVisible
                ? `calc(100vh - ${74 + this.banner.getHeight()}px)`
                : 'calc(100vh - 74px)';
        }

        return this;
    }

    /**
     * Resizes DOM meetings call defined by "selector" adjusting "max-height" property
     * depending on:
     * - PSA banner visibility and size
     * - PSA banner overlayed by any dialog
     *
     * @param {String} selector DOM element selector to move
     * @returns {Object} self instance
     */
    meetingsCall(selector) {
        const el = document.querySelector(selector);
        if (el && !is_mobile) {
            el.style.maxHeight = this.banner.isVisible && !el.closest('.overlayed')
                ? `calc(100% - ${this.banner.getHeight()}px)`
                : '100%';
        }

        return this;
    }

    /**
     * Resizes DOM media player container element defined by "selector" adjusting "height" property
     * depending on PSA banner visibility and size
     *
     * @param {String} selector DOM element containing media player
     * @param {Boolean} isCheckPlayButton whether has to check play button visibility
     * @returns {Object} self instance
     */
    mediaPlayer(selector, isCheckPlayButton) {
        const el = document.querySelector(selector);
        if (el && !is_mobile) {
            const playButton = el.querySelector('.play-video-button');
            const isPlayButtonVisible = isCheckPlayButton && playButton && !playButton.classList.contains('hidden');

            const videoContainer = el.querySelector('.content[data-fullscreen]');
            const isFullScreen = videoContainer && videoContainer.dataset.fullscreen === 'true' ||
                el.parentElement.classList.contains('fullscreen');

            el.style.height = this.banner.isVisible && !isPlayButtonVisible && !isFullScreen
                ? `calc(100% - ${this.banner.getHeight()}px)`
                : '100%';
        }

        return this;
    }

    /**
     * Resizes DOM element defined by "selector" adjusting "height" property
     * depending on containing 'browserscreen' class
     *
     * @param {String} selector DOM element containing media player
     * @returns {Object} self instance
     */
    browserScreen(selector) {
        const el = document.querySelector(selector);
        if (el && !is_mobile) {
            el.style.height = el.classList.contains('browserscreen')
                ? `calc(100% - ${this.banner.getHeight()}px)`
                : '100%';
        }

        return this;
    }
}

var psa = {

    /** The id number of the last announcement that the user has seen */
    lastSeenPsaId: 0,

    /** PsaBannerConfig instance having current PSA banner configuration */
    config: null,

    /** Whether the PSA has already been fetched this session */
    fetchedPsa: false,

    /** If the PSA is currently being shown */
    visible: false,

    /** Layout instance to reposition UI elements depending on PSA banner visibility */
    layout: null,

    /**
     * Show the dialog if they have not seen the announcement yet
     */
    async init() {
        'use strict';

        // Already tried fetching the announcement this session
        if (psa.fetchedPsa) {
            return false;
        }
        psa.fetchedPsa = true;

        // Get the last announcement number they have seen from localStorage
        const seen = await Promise.allSettled([
            M.getPersistentData('lastSeenPsaId'),
            u_handle && u_handle !== 'AAAAAAAAAAA' && mega.attr.get(u_handle, 'lastPsa', -2, true)
        ]);
        psa.lastSeenPsaId = parseInt(seen[1].value || seen[0].value) | 0;

        // Make Get PSA (gpsa) API request
        const {result} = await api.req({a: 'gpsa', n: psa.lastSeenPsaId});

        // If there is an announcement to be shown
        if (typeof result === 'object' && 'id' in result) {

            // Cache the current announcement
            psa.config = PsaBannerConfig.fromRaw(result);

            // Show the announcement
            psa.configureAndShowAnnouncement();
        }
    },

    /**
     * Wrapper function to configure the announcement details and show it
     */
    configureAndShowAnnouncement: () => {

        'use strict';

        // Only show the announcement if they have not seen the current announcement.
        // The localStorage.alwaysShowPsa is a test variable to force show the PSA
        if ((psa.lastSeenPsaId < psa.config.id || localStorage.alwaysShowPsa === '1')
            && psa.prefillAnnouncementDetails()) {

            psa.showAnnouncement();
        }
        else {
            // If they viewed the site while not logged in, then logged in with
            // an account that had already seen this PSA then this hides it
            psa.hideAnnouncement();
        }
    },

    /**
     * Creates PSA banner icon
     * @param {Object} container banner DOM element
     * @returns {void}
     */
    createIcon: (container) => {
        'use strict';

        const header = mCreateElement('div', {'class': 'banner-image'}, container);

        const icon = mCreateElement('img', {'src': psa.config.path}, header);
        icon.onerror = function() {
            const {url} =  psa.config;
            if (this.getAttribute('src') === url) {
                return this.removeAttribute('src');
            }
            // If the icon doesn't exist for new PSAs which is likely while in local development, use the one
            // on the default static path as they are added directly to the static servers now for each new PSA
            this.src = url;
        };
    },

    /**
     * Creates PSA banner content
     * @param {Object} container banner DOM element
     * @returns {void}
     */
    createContent: (container) => {
        'use strict';

        const header = mCreateElement('div', {'class': 'banner-content'}, container);

        const content = mCreateElement('div', {'class': 'banner-message'}, header);
        mCreateElement('div', {'class': 'banner-title'}, content).textContent = psa.config.title;
        mCreateElement('div', {'class': 'banner-text'}, content).textContent = psa.config.desc;
    },

    /**
     * Create banner action buttons
     * @param {Object} container banner DOM element
     * @returns {void}
     */
    createActionButtons: (container) => {
        'use strict';

        const buttons = is_mobile ? psa.config.buttons.reverse() : psa.config.buttons;
        for (let i = buttons.length - 1; i >= 0; i--) {
            const {label, link} = buttons[i];

            // Create DOM element
            const actions = container.querySelector('.banner-actions')
                || mCreateElement('div', {'class': 'banner-actions'}, container);

            const btnLayout = is_mobile ? 'action-link' : 'mega-button';

            let btnType = '';
            if (is_mobile) {
                btnType = i || buttons.length < 2 ? 'primary' : 'secondary';
            }
            else {
                btnType = i ? 'outline' : 'primary';
            }

            const button = mCreateElement('button', {
                'class': `mega-component nav-elem normal ${btnLayout} ${btnType} js-${btnType}-action`,
                'data-continue-link': link
            }, actions);
            mCreateElement('span', {'class': `${btnType}-text`}, button).textContent = label;

            // Handle click event: use delegated event in case the HTML elements are not loaded yet
            $('body', document).rebind(`click.psa.${btnType}BtnClick`, `.psa-holder .js-${btnType}-action`, (e) => {
                psa.hideAnnouncement();
                psa.saveLastPsaSeen();

                const pageLink = e.currentTarget.dataset.continueLink;
                if (!pageLink) {
                    return;
                }
                window.open(pageLink, '_blank', 'noopener,noreferrer');
            });
        }
    },

    /**
     * Create banner close button
     * @param {Object} container banner DOM element
     * @returns {void}
     */
    createCloseButton: (container) => {
        'use strict';

        // Create DOM element
        const close = mCreateElement('div', {'class': 'banner-close'}, container);

        const button = mCreateElement('button', {
            'class': 'mega-component nav-elem mega-button action icon js-close'
        }, close);

        mCreateElement('i', {
            'class': `sprite-${is_mobile ? 'mobile-' : ''}fm-mono icon-dialog-close`
        }, button);

        // Handle click event: use delegated event in case the HTML elements are not loaded yet
        $('body', document).rebind('click.psa.close', '.psa-holder .js-close', () => {
            psa.hideAnnouncement();
            psa.saveLastPsaSeen();
        });
    },

    /**
     * Update the details of the announcement depending on the current one
     * @returns {boolean} whether announcement integrity is ok or not
     */
    prefillAnnouncementDetails: () => {
        'use strict';

        const wrapperNode = document.getElementById('mainlayout');

        if (!(psa.config.isValid && wrapperNode)) {
            return false;
        }

        // PSA container
        const container = document.querySelector('.psa-holder')
            || mCreateElement('div', {'class': 'psa-holder'}, wrapperNode);

        // Create PSA banner
        container.textContent = '';
        const banner = mCreateElement('div', {'class': 'mega-component banner anouncement hidden'}, container);

        psa.createIcon(banner);
        psa.createContent(banner);
        psa.createActionButtons(banner);
        psa.createCloseButton(banner);

        return true;
    },

    /**
     * Shows the announcement
     */
    showAnnouncement: () => {
        'use strict';

        // skip psa where not needed
        if (is_mobile && page.indexOf('propay_') === 0) {
            return;
        }

        // Banner instance
        const banner = new PsaBannerNode('.psa-holder .banner');
        const {el: bannerNode} = banner;
        if (!bannerNode) {
            return false;
        }

        // Show the announcement
        document.body.classList.add('psa-notification');
        bannerNode.classList.remove('hidden');

        // Currently being shown
        psa.visible = true;

        // Create PSA Layout Manager to reposition UI elements depending on PSA banner visibility & size
        psa.layout = new PsaLayoutManager(banner);

        // Add a handler to fix the layout if the window is resized
        $(window).rebind('resize.psa.layout', () => {
            psa.layout
                .move('.loader-progressbar')
                .move('.float-video:not(.minimized)', 110)
                .resize('.psa-holder', true)
                .resize('.text-editor-container')
                .resize('#fmholder')
                .resize('#startholder')
                .resize('.meetings-loading')
                .avatarMenu('.mega-header div.header-dropdown-menu')
                .mediaPlayer('.media-viewer:not(.download-grid *)')
                .browserScreen('.download-grid .media-viewer-container')
                .meetingsCall('.meetings-call');
        });

        // Trigger resize so that full content in the file manager is updated
        $(window).trigger('resize');
    },

    /**
     * Hides the announcement
     */
    hideAnnouncement: function() {

        'use strict';

        if (!(psa.visible && psa.layout.banner.el)) {
            return false;
        }

        // Hide the announcement
        document.body.classList.remove('psa-notification');
        psa.layout.banner.el.classList.add('hidden');

        // Set to no longer visible
        psa.visible = false;

        // Save last seen announcement number for page changes
        psa.lastSeenPsaId = psa.config.id;

        if (!is_mobile) {
            document.querySelector('.psa-holder').style.removeProperty('height');
        }

        // Trigger resize so that full content in the file manager is visible after closing
        $(window).trigger('resize');

        // Remove even listeners
        $(window).unbind('resize.psa.layout');
    },

    /**
     * Saves the current announcement number they have seen to a user attribute if logged in, otherwise to localStorage
     */
    saveLastPsaSeen: function() {

        'use strict';

        // Always store that they have seen it in localStorage. This is useful if they
        // then log out, then the PSA should still stay hidden and not re-show itself
        M.setPersistentData('lastSeenPsaId', String(psa.config.id)).dump('psa');

        // If logged in and completed registration
        if (u_type === 3) {

            // Store that they have seen it on the API side
            // (should be stored as ^!lastPsa for a private non encrypted, non historic attribute)
            mega.attr.set('lastPsa', String(psa.config.id), -2, true);
        }
    },

    /**
     * When the user logs in, this updates the API with the last PSA they saw when they were logged out
     * @param {String|undefined} apiLastPsaSeen The last PSA that the user has seen that the API knows about
     */
    updateApiWithLastPsaSeen: function(apiLastPsaSeen) {
        'use strict';

        // Make sure they have seen a PSA and that the API seen PSA is older than the one in localStorage
        M.getPersistentData('lastSeenPsaId')
            .then(res => {
                if (apiLastPsaSeen < res) {

                    // Store that they have seen it on the API side
                    // (should be stored as ^!lastPsa for a private non encrypted, non historic attribute)
                    mega.attr.set('lastPsa', res, -2, true);
                }
            })
            .catch(nop);
    },

    /**
     * Repositions targeted UI elements so it is fully visible when PSA is shown
     * @returns {void}
     */
    repositionAll: () => {
        'use strict';

        if (psa.layout && psa.visible) {
            psa.layout
                .resize('.psa-holder', true)
                .resize('.text-editor-container')
                .resize('#fmholder')
                .resize('#startholder')
                .avatarMenu('.mega-header div.header-dropdown-menu');
        }

        psa.repositionLoadingBar();
        psa.repositionMeetingsCall();
        psa.repositionMediaPlayer();
    },

    /**
     * Repositions loading bar so it is fully visible when PSA is shown
     * @returns {void}
     */
    repositionLoadingBar: () => {
        'use strict';

        if (psa.layout && psa.visible) {
            psa.layout.move('.loader-progressbar');
        }
    },

    /**
     * Repositions meetings call so it is fully visible when PSA is shown
     * @returns {void}
     */
    repositionMeetingsCall: () => {
        'use strict';
        if (psa.layout && psa.visible) {
            psa.layout
                .move('.float-video:not(.minimized)', 110)
                .resize('.meetings-loading')
                .meetingsCall('.meetings-call');
        }
    },

    /**
     * Repositions media player so it is fully visible when PSA is shown
     * @returns {void}
     */
    repositionMediaPlayer: () => {
        'use strict';

        if (psa.layout && psa.visible) {
            psa.layout
                .mediaPlayer('.media-viewer:not(.download-grid *)')
                .browserScreen('.download-grid .media-viewer-container');
        }
    },

    /**
     * Returns calculated PSA banner height value in pixels
     * @returns {Number} number of pixels
     */
    getBannerHeight: () => {
        'use strict';

        return psa.layout && psa.visible ? psa.layout.banner.getHeight() : 0;
    }
};
