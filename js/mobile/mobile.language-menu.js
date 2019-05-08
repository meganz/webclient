/**
 * Initialise the menu options for changing language
 */
mobile.languageMenu = {

    /**
     * Initialise the options
     */
    init: function() {

        'use strict';

        // Main tier 1 languages that we support (based on usage analysis)
        var tierOneLangCodes = [
            'es', 'en', 'br', 'ct', 'fr', 'de', 'ru', 'it', 'ar',
            'nl', 'cn', 'jp', 'kr', 'ro', 'id', 'th', 'vi', 'pl'
        ];

        // Remove all the tier 1 languages and we have only the tier 2 languages remaining
        var allLangCodes = Object.keys(languages);
        var tierTwoLangCodes = allLangCodes.filter(function(langCode) {
            return tierOneLangCodes.indexOf(langCode) < 0;
        });

        // Remove old menu items in case this was re-rendered
        $('.top-submenu.language-items .top-menu-item').not('.language-template').remove();

        // Generate the HTML for tier one and tier two languages (second param set to true shows beta icon)
        this.renderLanguages(tierOneLangCodes, false);
        this.renderLanguages(tierTwoLangCodes, true);

        // Initialise the handler for
        this.initLanguageSelectionHandler();
    },

    /**
     * Create the language HTML from a list of language codes
     * @param {Array} langCodes Array of language codes e.g. ['en', 'es', ...]
     * @param {Boolean} tierTwo If this is a tier two / beta language
     */
    renderLanguages: function(langCodes, tierTwo) {

        'use strict';

        // Cache selectors
        var $template = $('.top-menu-item.language-template').clone();
        var $languageItemsContainer = $('.top-submenu.language-items');

        // Remove the template class
        $template.removeClass('language-template');

        // Sort languages by ISO 639-1 two letter language code (which is reasonably ordered anyway)
        langCodes.sort(function(codeA, codeB) {
            return codeA.localeCompare(codeB);
        });

        var html = '';

        // Make single array with code, native lang name, and english lang name
        for (var i = 0, length = langCodes.length; i < length; i++) {

            // FIXME: why we do have all this code duplicated? :(

            var langCode = langCodes[i];                 // Two letter language code e.g. de
            var langItem = Object(languages[langCode]);  // map to languages object
            var nativeName = langItem[2];                // Deutsch
            var englishName = langItem[1];               // German

            if (!nativeName) {
                console.warn('Language %s not found...', langCode);
                continue;
            }

            // Clone the template
            var $langHtml = $template.clone();

            // Update the template details
            $langHtml.attr('data-lang-code', langCode);
            $langHtml.attr('title', englishName);
            $langHtml.find('.lang-name').text(nativeName);

            // If they have already chosen a language show it as selected
            if (langCode === lang) {
                $langHtml.addClass('current');
            }

            // If the beta language, show the beta icon
            if (tierTwo) {
                $langHtml.addClass('beta');
            }

            // Build up the HTML to be rendered
            html += $langHtml.prop('outerHTML');
        }

        // Render the HTML
        $languageItemsContainer.append(html);
    },

    /**
     * Initialise the Save button to set the language and reload the page
     */
    initLanguageSelectionHandler: function() {

        'use strict';

        var $languageItems = $('.top-submenu.language-items .top-menu-item');

        // Initialise the save button
        $languageItems.off('click tap').on('tap', function() {

            // Get the selected code
            var selectedLangCode = $(this).data('lang-code');

            // If not the currently selected language, change to the selected language
            if (selectedLangCode !== lang) {

                // Store the new language in localStorage to be used upon reload
                localStorage.lang = selectedLangCode;

                // Set a language user attribute on the API (This is a private but unencrypted user
                // attribute so that the API can read it and send emails in the correct language)
                if (typeof u_attr !== 'undefined') {
                    mega.attr.set(
                        'lang',
                        selectedLangCode,       // E.g. en, es, pt
                        -2,                     // Set to private private not encrypted
                        true                    // Set to non-historic, this won't retain previous values on API server
                    );
                }

                // Reload the site
                document.location.reload();
            }

            return false;
        });
    }
};
