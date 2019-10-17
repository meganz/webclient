/**
 * Functionality for the Browsers extension page (#browsers)
 */
var browserspage = {

    /**
     * Initialise the Chrome extension page
     */
    init: function() {
        "use strict";

        if (is_mobile)  {
            browserspage.setBrowserData('firefox');
        }
        else if (window.opr)  {
            browserspage.setBrowserData('opera');
        }
        else if (mega.chrome)  {
            browserspage.setBrowserData('chrome');
        }
        else if (ua.details.engine === 'Gecko')  {
            browserspage.setBrowserData('firefox');
        }

        browserspage.bindOnClickEvents();
    },

    /**
     * Show buttons and texts depending on Browser name
     */
    setBrowserData: function(browser) {
        "use strict";

        var $topBlock = $('.bottom-page.vertical-centered-bl.top-bl');
        var $browserLinks = $topBlock.find('.top-copyrights .available');

        if (browser === 'chrome')  {
            $browserLinks.find('.a1').text('Firefox');
            $browserLinks.find('.a2').text('Opera');
        }
        else if (browser === 'firefox')  {
            $browserLinks.find('.a1').text('Chrome');
            $browserLinks.find('.a2').text('Opera');
        }
        else if (browser === 'opera')  {
            $browserLinks.find('.a1').text('Chrome');
            $browserLinks.find('.a2').text('Firefox');
        }
        else {
            browser = 'unsupported';
            $browserLinks.find('a').removeClass('mac linux').text('');
        }

        $topBlock.removeClass('unsupported chrome firefox opera').addClass(browser);
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