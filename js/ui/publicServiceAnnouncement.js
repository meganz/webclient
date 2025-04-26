/**
 * This file handles the Public Service Announcements. One announcement will
 * appear at the bottom of the page in an overlay at a time. The announcements
 * come from a hard coded list initially. Once a user has seen an announcement
 * they will mark it as read on the API server. If a user is not logged in
 * then it will mark that announcement as seen in localStorage.
 */
var psa = {

    /** The id number of the last announcement that the user has seen */
    lastSeenPsaId: 0,

    /**
     * The current announcement object from the API e.g.
     * {
     *      id: integer psa id
     *      t: string psa title, already translated into user's known language if available
     *      d: string psa body/description, already translated if available
     *      img: string url to image on one of our static servers
     *      l: string link url for the positive flow button (this can be empty if not provided)
     *      b: string button label for positive flow button, can be empty if not provided
     * }
     */
    currentPsa: null,

    /** Whether the PSA has already been fetched this session */
    fetchedPsa: false,

    /** If the PSA is currently being shown */
    visible: false,

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
            psa.currentPsa = result;

            // Show the announcement
            psa.configureAndShowAnnouncement();
        }
    },

    /**
     * Wrapper function to configure the announcement details and show it
     */
    configureAndShowAnnouncement: function() {

        'use strict';

        // Only show the announcement if they have not seen the current announcement.
        // The localStorage.alwaysShowPsa is a test variable to force show the PSA
        if ((psa.lastSeenPsaId < psa.currentPsa.id || localStorage.alwaysShowPsa === '1')
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
     * Update the details of the announcement depending on the current one
     * @returns {boolean} whether announcement integrity is ok or not
     */
    prefillAnnouncementDetails: function() {

        'use strict';

        // Determine image path
        var retina = (window.devicePixelRatio > 1) ? '@2x' : '';
        var imagePath = staticpath + 'images/mega/psa/' + psa.currentPsa.img + retina + '.png';

        // Decode the text from Base64 (there were some issues with some languages)
        var title = from8(base64urldecode(psa.currentPsa.t));
        var description = from8(base64urldecode(psa.currentPsa.d));
        var buttonLabel = from8(base64urldecode(psa.currentPsa.b));
        var wrapperNode = document.getElementById('mainlayout');
        var innerNode;

        if (!title || !description || !buttonLabel || !wrapperNode) {
            return false;
        }

        // PSA container
        innerNode = document.querySelector('.psa-holder') || mCreateElement('div', {
            'class': 'psa-holder'
        }, wrapperNode);

        // Create PSA banner
        innerNode.textContent = '';
        wrapperNode = mCreateElement('div', {
            'class': 'mega-component banner anouncement hidden'
        }, innerNode);

        // Create PSA icon
        innerNode = mCreateElement('img', {'src': imagePath}, wrapperNode);
        innerNode.onerror = function() {
            var url =  `${psa.currentPsa.dsp + psa.currentPsa.img + retina}.png`;

            if (this.getAttribute('src') === url) {
                return this.removeAttribute('src');
            }
            // If the icon doesn't exist for new PSAs which is likely while in local development, use the one
            // on the default static path as they are added directly to the static servers now for each new PSA
            this.src = url;
        };

        // Create PSA details
        innerNode = mCreateElement('div', {'class': 'content-box'}, wrapperNode);
        mCreateElement('span', {'class': 'banner title-text'}, innerNode).textContent = title;
        mCreateElement('span', {'class': 'banner message-text'}, innerNode).textContent = description;

        // Create PSA details button
        if (psa.currentPsa.l) {
            innerNode = mCreateElement('button', {
                'class': `${is_mobile ? 'action-link nav-elem normal button' : 'mega-button'} js-more-info`,
                'data-continue-link': psa.currentPsa.l
            }, innerNode);
            mCreateElement('span', {'class': 'text'}, innerNode).textContent = buttonLabel;
        }

        // Create PSA close button
        innerNode = mCreateElement('div', {'class': 'banner end-box'}, wrapperNode);
        innerNode = mCreateElement('button', {
            'class': 'mega-component nav-elem mega-button action icon js-close'
        }, innerNode);
        mCreateElement('i', {
            'class': `sprite-${is_mobile ? 'mobile-' : ''}fm-mono icon-dialog-close`
        }, innerNode);

        return true;
    },

    /**
     * Adds the close button functionality
     */
    addCloseButtonHandler: function() {

        'use strict';

        // Use delegated event in case the HTML elements are not loaded yet
        $('body').rebind('click.closePsa', '.psa-holder .js-close', () => {

            // Hide the banner and store that they have seen this PSA
            psa.hideAnnouncement();
            psa.saveLastPsaSeen();
        });
    },

    /**
     * Adds the functionality for the view more info button
     */
    addMoreInfoButtonHandler: function() {

        'use strict';

        // Use delegated event in case the HTML elements are not loaded yet
        $('body').rebind('click.showPsaInfo', '.psa-holder .js-more-info', (e) => {

            // Get the page link for this announcement
            var pageLink = e.currentTarget.dataset.continueLink;

            // Hide the banner and save the PSA as seen
            psa.hideAnnouncement();
            psa.saveLastPsaSeen();

            if (!pageLink) {
                return;
            }

            // Open a new tab (and hopefully don't trigger popup blocker)
            window.open(pageLink, '_blank', 'noopener,noreferrer');
        });
    },

    /**
     * Shows the announcement
     */
    showAnnouncement: function() {

        'use strict';

        var bannerNode = document.querySelector('.psa-holder .banner');

        if (!bannerNode) {
            return false;
        }

        // Show the announcement
        document.body.classList.add('psa-notification');
        bannerNode.classList.remove('hidden');

        // Bind Learn more and Close button evts
        psa.addCloseButtonHandler();
        psa.addMoreInfoButtonHandler();

        // Currently being shown
        psa.visible = true;

        // Add a handler to fix the layout if the window is resized
        $(window).rebind('resize.bottomNotification', function() {
            psa.resizeFileManagerHeight();
            psa.repositionAccountLoadingBar();
        });

        // Trigger resize so that full content in the file manager is updated
        $(window).trigger('resize');
    },

    /**
     * Hides the announcement
     */
    hideAnnouncement: function() {

        'use strict';

        var bannerNode;

        // If already hidden, don't do anything (specially a window.trigger('resize')).
        if (!this.visible || !(bannerNode = document.querySelector('.psa-holder .banner'))) {
            return false;
        }

        // Hide the announcement
        document.body.classList.remove('psa-notification');
        bannerNode.classList.add('hidden');

        // Set to no longer visible
        psa.visible = false;

        // Save last seen announcement number for page changes
        psa.lastSeenPsaId = psa.currentPsa.id;

        // Trigger resize so that full content in the file manager is visible after closing
        $(window).trigger('resize');

        // Remove even listeners
        $(window).unbind('resize.bottomNotification');
    },

    /**
     * Saves the current announcement number they have seen to a user attribute if logged in, otherwise to localStorage
     */
    saveLastPsaSeen: function() {

        'use strict';

        // Always store that they have seen it in localStorage. This is useful if they
        // then log out, then the PSA should still stay hidden and not re-show itself
        M.setPersistentData('lastSeenPsaId', String(psa.currentPsa.id)).dump('psa');

        // If logged in and completed registration
        if (u_type === 3) {

            // Store that they have seen it on the API side
            // (should be stored as ^!lastPsa for a private non encrypted, non historic attribute)
            mega.attr.set('lastPsa', String(psa.currentPsa.id), -2, true);
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
     * Resize the fmholder and startholder container heights, align loader bar
     * because they depend on the bottom notification height
     */
    resizeFileManagerHeight: function() {

        'use strict';

        if (is_mobile) {
            return false;
        }

        var bannerNode = document.querySelector('.psa-holder .banner');

        // If the PSA announcement is currently shown
        // @todo: Set display flex to ''.main-layout' and remove custom styling
        if (bannerNode && psa.visible) {
            var holderHeight = document.body.offsetHeight -
                bannerNode.offsetHeight || 0;

            document.getElementById('fmholder').style.height = `${holderHeight}px`;
            document.getElementById('startholder').style.height = `${holderHeight}px`;
        }
        else {
            document.getElementById('fmholder').style.removeProperty('height');
            document.getElementById('startholder').style.removeProperty('height');
        }
    },

    /**
     * Repositions the account loading bar so it is above the PSA if it is being shown
     */
    repositionAccountLoadingBar: function() {
        'use strict';
        const lpb = document.querySelector('.loader-progressbar');

        if (is_mobile || !lpb) {
            return false;
        }

        var bannerNode = document.querySelector('.psa-holder .banner');

        // If the PSA is visible
        if (bannerNode && psa.visible) {
            // Move the progress bar up above the PSA otherwise it's not visible
            lpb.style.bottom = `${bannerNode.offsetHeight}px`;
        }
        else {
            // Reset to the bottom
            lpb.style.removeProperty('bottom');
        }
    }
};
