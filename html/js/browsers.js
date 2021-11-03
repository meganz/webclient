/**
 * Functionality for the Browsers extension page (#browsers)
 */
var browserspage = {

    /**
     * Initialise the Chrome extension page
     */
    init: function() {
        "use strict";

        this.$topContianer = $('.bottom-page.vertical-centered-bl.top-bl');

        this.setTexts();

        if (is_mobile)  {
            browserspage.setBrowserData('firefox');
        }
        else if (window.opr) {
            browserspage.setBrowserData('opera');
        }
        else if (ua.details.browser === 'Edgium') {
            browserspage.setBrowserData('edge');
        }
        else if (mega.chrome)  {
            browserspage.setBrowserData('chrome');
        }
        else if (ua.details.engine === 'Gecko')  {
            browserspage.setBrowserData('firefox');
        }

        browserspage.bindOnClickEvents();
    },

    setTexts: function() {
        'use strict';

        const chromeText = l[20924].replace('%1', 'Chrome<sup>&reg;</sup>');
        // const ffText = l[20924].replace('%1', 'Firefox<sup>&reg;</sup>');
        const edgeText = l[20924].replace('%1', 'Edge<sup>&reg;</sup>');
        const chromeLabel = l[20923].replace('%1', 'Chrome');
        // const ffLabel = l[20923].replace('%1', 'Firefox');
        const edgeLabel = l[20923].replace('%1', 'Edge');

        $('.bottom-page.top-dark-button.chrome span.label', this.$topContianer).safeHTML(chromeLabel);
        // $('.bottom-page.top-dark-button.ff span.label', this.$topContianer).safeHTML(ffLabel);
        $('.bottom-page.top-dark-button.edge span.label', this.$topContianer).safeHTML(edgeLabel);

        $('.bottom-page.top-copyrights .chrome em', this.$topContianer).safeHTML(chromeText);
        // $('.bottom-page.top-copyrights .ff em', this.$topContianer).safeHTML(ffText);
        $('.bottom-page.top-copyrights .edge em', this.$topContianer).safeHTML(edgeText);
    },

    /**
     * Show buttons and texts depending on Browser name
     */
    setBrowserData: function(browser) {
        "use strict";

        var $topBlock = this.$topContianer;
        var $browserLinks = $topBlock.find('.top-copyrights .available');

        if (browser === 'chrome')  {
            $('.a1', $browserLinks).text('Edge');
        }
        else if (browser === 'edge')  {
            $('.a1', $browserLinks).text('Chrome');
        }
        else {
            browser = 'unsupported';
            $('a', $browserLinks).removeClass('mac linux').text('');
        }

        if (is_ios) {
            // firefox is always passed as argument to this function on mobile
            browser = 'firefox ios';
        }
        else if (is_android) {
            // firefox is always passed as argument to this function on mobile
            browser = 'firefox android';
        }

        $topBlock.removeClass('unsupported edge chrome firefox opera ios android')
            .addClass(browser);
    },

    /**
     * Show buttons and texts depending on Browser name
     */
    bindOnClickEvents: function() {
        "use strict";

        var $topBlock = $('.bottom-page.vertical-centered-bl.top-bl');
        var $browserLinks = $topBlock.find('.top-copyrights .available');
        var $downloadButton = $topBlock.find('.top-dark-button');

        $browserLinks.find('a').rebind('click', function(e) {
            var browserName;

            e.preventDefault();

            if (is_mobile) {
                return false;
            }

            browserName = escapeHTML($(this).text()).toLowerCase();

            if (browserName) {
                browserspage.setBrowserData(browserName);
            }
        });

        // Log that they downloaded via the webstore link
        $downloadButton.click(function() {
            api_req({ a: 'log', e: 99604, m: 'Downloaded Chrome ext via webstore link' });
        });
    }
};
