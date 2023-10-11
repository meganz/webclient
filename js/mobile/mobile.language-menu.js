/**
 * Initialise the menu options for changing language
 */
mobile.languageMenu = {

    /**
     * Initialise the options and display them
     * Cache for future init calls
     */
    init: function() {

        'use strict';

        if (this.dropdown) {
            this.dropdown.trigger('dropdown');
            return;
        }

        const dropdownItems = {};
        const langKeys = Object.keys(languages);

        // Create a list of dropdown entries
        for (let i = 0; i < langKeys.length; i++) {
            const key = langKeys[i];
            dropdownItems[key] = {text: languages[key][2], subtext: languages[key][1]};
        }

        this.dropdown = new MegaMobileDropdown({
            invisible: true,
            listContainerClass: 'language-selector',
            parentNode: document.getElementById('fmholder'),
            dropdownItems: dropdownItems,
            sheetHeight: 'full',
            dropdownOptions: {
                titleText: l.lang_select_title,
                search: true,
                placeholderText: l.lang_select_placeholder
            },
            classNames: 'language-input',
            elemName: 'settings-dropdown-country',
            resultText: {title: l.lang_select_no_result_title, caption: l.lang_select_no_result_caption},
            selected: lang,
            onSelected: (event) => {

                // Get the selected lang code
                const selectedLangCode = event.currentTarget.optionNode.value;

                // If not the currently selected language, change to the selected language
                if (selectedLangCode !== lang) {

                    M.uiSaveLang(selectedLangCode)
                        .then(() => location.reload())
                        .catch(dump);
                }
            }
        });

        this.dropdown.trigger('dropdown');
    },

    /*
     * Old code block start - old code for login page
     * need to deprecate once we applies new top menu to login page
     */
    oldMenu: function() {
        'use strict';

        const langCodes = Object.keys(languages);

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

        // Create a list of dropdown entries
        for (let i = 0; i < langCodes.length; i++) {

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

            // Build up the HTML to be rendered
            html += $langHtml.prop('outerHTML');
        }

        // Render the HTML
        $languageItemsContainer.append(html);
        this.initOLangSelectionHandler();
    },

    /**
     * Initialise the Save button to set the language and reload the page - DEPRECATED
     */
    initOLangSelectionHandler: function() {

        'use strict';

        var $languageItems = $('.top-submenu.language-items .top-menu-item');

        // Initialise the save button
        $languageItems.off('click tap').on('tap', function() {

            // Get the selected code
            var selectedLangCode = $(this).data('lang-code');

            // If not the currently selected language, change to the selected language
            if (selectedLangCode !== lang) {

                M.uiSaveLang(selectedLangCode)
                    .then(() => location.reload())
                    .catch(dump);
            }

            return false;
        });
    }

    /*
     * Old code block end
     */
};
