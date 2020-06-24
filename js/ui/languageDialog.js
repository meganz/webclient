/**
 * The language selection dialog code
 */
var langDialog = {

    $dialog: null,
    $overlay: null,

    /**
     * Initialises and shows the dialog
     */
    show: function() {

        // Cache some selectors for performance
        langDialog.$dialog = $('.fm-dialog.languages-dialog');
        langDialog.$overlay = $('.fm-dialog-overlay');

        var $tierOneLanguages = langDialog.$dialog.find('.tier-one-languages');
        var $tierTwoLanguages = langDialog.$dialog.find('.tier-two-languages');

        // Main tier 1 languages that we support (based on usage analysis)
        var tierOneLangCodes = [
            'es', 'en', 'br', 'ct', 'fr', 'de', 'ru', 'it', 'ar',
            'nl', 'cn', 'jp', 'kr', 'ro', 'id', 'th', 'vi', 'pl'
        ];

        // Remove all the tier 1 languages and we have only the tier 2 languages remaining
        var allLangCodes = Object.keys(languages);
        var tierTwoLangCodes = allLangCodes.filter(function(langCode) {
            return (tierOneLangCodes.indexOf(langCode) < 0);
        });

        // Generate the HTML for tier one and tier two languages (second param set to true shows beta icon)
        var tierOneHtml = langDialog.renderLanguages(tierOneLangCodes, false);

        // Display the HTML
        $tierOneLanguages.safeHTML(tierOneHtml);

        if (tierTwoLangCodes.length) {

            var tierTwoHtml = langDialog.renderLanguages(tierTwoLangCodes, true);
            $tierTwoLanguages.safeHTML(tierTwoHtml);
        }
        else {
            $('.show-more-languages', langDialog.$dialog).addClass('hidden');
        }

        // Cache some selectors for performance
        var $languageLinks = langDialog.$dialog.find('.nlanguage-lnk');
        var $showMoreLanguages = langDialog.$dialog.find('.show-more-languages');
        var $arrowIcon = $showMoreLanguages.find('.round-arrow');
        var $showHideText = $showMoreLanguages.find('.show-more-text');

        // When the user clicks on 'Show more languages', show the Tier 2 languages
        $showMoreLanguages.rebind('click', function() {

            // If the extra languages section is already open
            if ($arrowIcon.hasClass('opened')) {

                // Extra languages hidden
                $arrowIcon.removeClass('opened');
                $showHideText.safeHTML(l[7657]);        // Show more languages
                $tierTwoLanguages.hide();
                langDialog.centerDialog();
            }
            else {
                // Extra languages visible
                $arrowIcon.addClass('opened');
                $showHideText.safeHTML(l[7658]);        // Hide languages
                $tierTwoLanguages.show();
                langDialog.centerDialog();
            }
        });

        // Show tier two languages if a language is already selected from that list
        if (tierTwoLangCodes.indexOf(lang) > -1) {
            $arrowIcon.addClass('opened');
            $showHideText.safeHTML(l[7658]);        // Hide languages
            $tierTwoLanguages.show();
            langDialog.centerDialog();
        }

        // Show the dialog
        langDialog.$dialog.removeClass('hidden');
        langDialog.$overlay.removeClass('hidden');
        $('body').addClass('overlayed');
        $.dialog = 'languages';

        // Initialise the close button
        langDialog.$dialog.find('.fm-dialog-close').rebind('click', function() {
            langDialog.hide();
        });

        // Initialise the save button
        langDialog.initSaveButton();

        // Show different style when language is selected
        $languageLinks.rebind('click', function() {

            $languageLinks.removeClass('selected');
            $(this).addClass('selected');

            return false;
        });
    },

    /**
     * Re-center the dialog vertically because the height can change when showing/hiding the extra languages
     */
    centerDialog: function() {

        var currentHeight = langDialog.$dialog.outerHeight();
        var newTopMargin = (currentHeight / 2) * -1;

        langDialog.$dialog.css('margin-top', newTopMargin);
    },

    /**
     * Hides the language dialog
     * @returns {false}
     */
    hide: function() {

        langDialog.$dialog.addClass('hidden');
        langDialog.$overlay.addClass('hidden');
        $('body').removeClass('overlayed');
        $.dialog = false;

        return false;
    },

    /**
     * Create the language HTML from a list of language codes
     * @param {Array} langCodes Array of language codes e.g. ['en', 'es', ...]
     * @param {Boolean} tierTwo If this is a tier two / beta language
     * @returns {String} Returns the HTML to be rendered
     */
    renderLanguages: function(langCodes, tierTwo) {

        var $template = $('.languages-dialog .language-template').clone();
        var html = '';

        // Remove template class
        $template.removeClass('language-template');

        // Sort languages by ISO 639-1 two letter language code (which is reasonably ordered anyway)
        langCodes.sort(function(codeA, codeB) {
            return codeA.localeCompare(codeB);
        });

        // Make single array with code, native lang name, and english lang name
        for (var i = 0, length = langCodes.length; i < length; i++) {

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
            $langHtml.find('.native-language-name').text(nativeName);
            $langHtml.attr('title', englishName);

            // If they have already chosen a language show it as selected
            if (langCode === lang) {
                $langHtml.addClass('selected');
            }

            // If the beta language, show the beta icon
            if (tierTwo) {
                $langHtml.find('.beta').removeClass('hidden');
            }

            // Build up the HTML to be rendered
            html += $langHtml.prop('outerHTML');
        }

        return html;
    },

    /**
     * Initialise the Save button to set the language and reload the page
     */
    initSaveButton: function() {

        // Initialise the save button
        langDialog.$dialog.find('.fm-languages-save').rebind('click', function() {

            langDialog.hide();

            // Get the selected code
            var selectedLangCode = langDialog.$dialog.find('.nlanguage-lnk.selected').attr('data-lang-code');

            // If not the currently selected language, change to the selected language
            if (selectedLangCode !== lang) {

                var _reload = function() {
                    loadingDialog.hide();

                    // Store the new language in localStorage to be used upon reload
                    localStorage.lang = selectedLangCode;

                    // If there are transfers, ask the user to cancel them to reload...
                    M.abortTransfers().then(function() {
                        // Reload the site
                        location.reload();
                    }).catch(function(ex) {
                        console.debug('Not reloading upon language change...', ex);
                    });
                };
                loadingDialog.show();

                // Set a language user attribute on the API (This is a private but unencrypted user
                // attribute so that the API can read it and send emails in the correct language)
                if (typeof u_attr !== 'undefined') {
                    mega.attr.set(
                        'lang',
                        selectedLangCode,       // E.g. en, es, pt
                        -2,                     // Set to private private not encrypted
                        true                    // Set to non-historic, this won't retain previous values on API server
                    ).then(function() {
                        setTimeout(_reload, 3e3);
                    }).catch(_reload);
                }
                else {
                    _reload();
                }
            }
        });
    }
};
