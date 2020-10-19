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

    /**
     * Show buttons and texts depending on Browser name
     */
    setBrowserData: function(browser) {
        "use strict";

        var $topBlock = $('.bottom-page.vertical-centered-bl.top-bl');
        var $browserLinks = $topBlock.find('.top-copyrights .available');

        if (browser === 'chrome')  {
            $('.a1', $browserLinks).text('Firefox');
            $('.a3', $browserLinks).text('Edge');
        }
        else if (browser === 'firefox')  {
            $('.a1', $browserLinks).text('Chrome');
            $('.a3', $browserLinks).text('Edge');
        }
        else if (browser === 'edge')  {
            $('.a1', $browserLinks).text('Chrome');
            $('.a3', $browserLinks).text('Firefox');
        }
        else {
            browser = 'unsupported';
            $('a', $browserLinks).removeClass('mac linux').text('');
        }

        if (is_ios) {
            browser = browser + ' ios';
        }
        else if (is_android) {
            browser = browser + ' android';
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
