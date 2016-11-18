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
            'es', 'en', 'br', 'ct', 'fr', 'de', 'ru', 'tr', 'it', 'ar',
            'nl', 'hu', 'cn', 'jp', 'kr', 'ro', 'id', 'th', 'vi'
        ];

        // Remove all the tier 1 languages and we have only the tier 2 languages remaining
        var allLangCodes = Object.keys(ln);
        var tierTwoLangCodes = allLangCodes.filter(function(langCode) {
            return (tierOneLangCodes.indexOf(langCode) < 0);
        });

        // Generate the HTML for tier one and tier two languages (second param set to true shows beta icon) 
        var tierOneHtml = langDialog.renderLanguages(tierOneLangCodes, false);
        var tierTwoHtml = langDialog.renderLanguages(tierTwoLangCodes, true);

        // Display the HTML
        $tierOneLanguages.safeHTML(tierOneHtml);
        $tierTwoLanguages.safeHTML(tierTwoHtml);
        
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
        langDialog.$dialog.find('.fm-languages-save').rebind('click', function() {
            
            langDialog.hide();
            
            // Get the selected code
            var selectedLangCode = langDialog.$dialog.find('.nlanguage-lnk.selected').attr('data-lang-code');
            
            // If not the currently selected language, change to the selected language
            if (selectedLangCode !== lang) {
                localStorage.lang = selectedLangCode;
                document.location.reload();
            }
        });

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

            var langCode = langCodes[i];            // Two letter language code e.g. de
            var nativeName = ln[langCode];          // Deutsch
            var englishName = ln2[langCode];        // German

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
    }
};