/**
 * Functionality and picture element processing for the feature pages
 *
 * Picture elements should either have a data-name and an override in the pictures variable;
 * or data-folder, data-name and data-extension
 */
const featurePages = (function() {
    'use strict';

    /**
     * Create a set of picture and image sources based on the name of the image and the folder it is in
     *
     * @param {string} folder - the folder the image is in
     * @param {string} name - the name of the image
     * @param {string} extension - the image's extension
     * @returns {object} - a sources object following a generic tempalate
     */
    const generateGenericSources = (folder, name, extension) => {
        const breakpoint = 461;

        return {
            sources: [
                {
                    srcset: (() => {
                        let str = `${staticpath}${folder}/${name}_desktop.${extension}, `;
                        for (let i = 2; i <= 3; i++) {
                            str += `${staticpath}${folder}/${name}_desktop@${i}x.${extension} ${i}x, `;
                        }
                        return str;
                    })(),
                    media: `(min-width: ${breakpoint}px)`,
                },

                (() => {
                    let str = `${staticpath}${folder}/${name}_mobile.${extension}, `;
                    for (let i = 2; i <= 3; i++) {
                        str += `${staticpath}${folder}/${name}_mobile@${i}x.${extension} ${i}x, `;
                    }
                    return str;
                })(),
            ],

            img: `${staticpath}${folder}/${name}_desktop.${extension}`,
        };
    };

    /**
     * Creates an array of picture sources, either generic or user specified
     *
     * @param {object} pictures - an object of non-generic source names, used to override the generic approach
     * @param {HTMLElement} elem - a picture element
     * @return {object} - an array of picture sources
     */
    const generatePictureSources = (pictures, elem) => {
        if (typeof pictures === 'object' && elem.dataset.name && pictures[elem.dataset.name]) {
            return pictures[elem.dataset.name];
        }
        else if (elem.dataset.folder && elem.dataset.name && elem.dataset.extension) {
            return generateGenericSources(
                elem.dataset.folder,
                elem.dataset.name,
                elem.dataset.extension);
        }
    };

    /**
     * Replace all pictures with a data-name attribute
     *
     * @param {object} pictures - an object of non-generic source names, used to override the generic approach
     * @returns {function} - a function that safely replaces picture elements on a page
     */
    const processPictures = (pictures) => {
        document.querySelectorAll('.feature-page picture[data-name]').forEach(elem => {
            let picture = generatePictureSources(pictures, elem);

            if (picture !== null) {
                const img = elem.querySelector('img');

                if (Array.isArray(picture.sources)) {
                    picture.sources.forEach(source => {
                        const sourceElem = document.createElement('source');

                        if (typeof source === 'string') {
                            sourceElem.srcset = source;
                        }
                        else {
                            if (source.srcset && typeof source.srcset === 'string') {
                                sourceElem.srcset = source.srcset;
                            }
                            if (source.media && typeof source.media === 'string') {
                                sourceElem.media = source.media;
                            }
                        }

                        elem.insertBefore(sourceElem, img);
                    });
                }

                if (typeof picture.img === 'string') {
                    img.src = picture.img;

                    const alt = elem.getAttribute('alt');
                    if (alt && alt !== '') {
                        img.alt = alt;
                    }
                }
            }
        });
    };

    /** Overrides/non-standard naming conventions can go here. Format:
     * data_name_of_picture = {
     *     sources: [
     *         {
     *             srcset: '',     // srcset with media query
     *             media: '',
     *         },
     *         '',                 // srcset
     *     ],
     *     img: '',                // img src
     * }
     */
    const pictures = {
        chat: {},
        collaboration: {},
        storage: {},
        objectstorage: {},
    };

    /**
     * @param  {string} [pageName] - the name of the page, used for overrides, optional
     * @returns {undefined}
     */
    return function(pageName) {
        if (typeof pageName === 'string') {
            processPictures(pictures[pageName]);
            if (pageName === 'objectstorage') {
                featurePages.objectStoragePage();
            }
        }
        else {
            processPictures();
        }
    };
})();

featurePages.fixMobileChatLinks = function() {
    'use strict';

    const chatLinks = document.querySelectorAll('.mobile .chatlink');
    chatLinks.forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const scrollTo = document.querySelector(link.dataset.scrollTo);
            if (scrollTo) {
                scrollTo.scrollIntoView(true);
            }
        });
    });
};

featurePages.objectStoragePage = function() {
    "use strict";
    let userEmail;
    let answers;
    let betaT;
    let currentTab = 0; // Current tab is set to be the first tab (0)
    loadingDialog.show();
    const s3Providers = {
        "AM": "Amazon",
        "GG": "Google",
        "IB": "IBM",
        "MS": "Microsoft Azure blob",
        "DS": "DigitalOcean Spaces",
        "DO": "DreamObjects",
        "LS": "Linode Object Storage",
        "WI": "Wasabi",
        "BB": "Blackblaze"
    };
    const $pageBlock = $('.feature-page.objectstorage');
    const $registerForm = $('.register-form', $pageBlock);
    const $countryInput = $('.rf-country', $registerForm);
    const $countryDropdown = $('#register-country', $registerForm);
    const $providerDropdown = $('#register-provider', $registerForm);
    const $inputs = $('.register-form input');
    $registerForm.eq(currentTab).addClass('display-block'); // Display the current tab

    sendCurrencyRequest();
    // event handler for Register button
    $('.cta').rebind('click', () => {
        scrollingToRegisterForm();
    });

    // bind events for inputs
    for (let i = 0; i < $inputs.length; i++) {
        bindInputsEvents($($inputs[i]));
    }

    if (is_mobile) {
        mobileRenderProvider(s3Providers);
    }
    else {
        getProviders(s3Providers);
    }
    // event handler for Current role radio buttons
    $('.register-role .register-radio-option', $registerForm).rebind('click', function() {
        const $radBut = $('.register-radio', this);
        if ($radBut.hasClass('radioOn')) {
            return;
        }
        if ($radBut.attr('id') === 'rad5oth') {
            $('.register-input-other', $registerForm).removeClass('hidden');
        }
        else {
            $('.register-input-other', $registerForm).addClass('hidden');
            $('.register-input-other input', $registerForm).val('').blur();
        }
        $('.register-radio', $('.register-role', $registerForm)).removeClass('radioOn').addClass('radioOff');
        $radBut.removeClass('radioOff').addClass('radioOn');
    });

    // event handler for radio options yes/no if user ever use S3 storage before
    $('.register-yesno-radio1 .register-radio-option1', $registerForm).rebind('click', function() {
        const $radBut = $('.register-radio', this);
        if (!$('.yesno-radio1  .register-form-error', $registerForm).hasClass('hidden')) {
            $('.yesno-radio1 .register-form-error', $registerForm).addClass('hidden');
        }
        if ($radBut.hasClass('radioOn')) {
            return;
        }
        if ($radBut.attr('id') === 'rad1yes') {
            $('.register-qn-s3provider', $registerForm).removeClass('hidden');
        }
        else {
            $('.register-qn-s3provider', $registerForm).addClass('hidden');
        }
        $('.register-radio', $('.register-yesno-radio1', $registerForm)).removeClass('radioOn').addClass('radioOff');
        $radBut.removeClass('radioOff').addClass('radioOn');
    });

    // event handler for radio options for user to choose storage amount needed
    $('.register-radio-tb .register-radio-option2', $registerForm).rebind('click', function() {
        const $radBut = $('.register-radio', this);
        if (!$('.radio-tb  .register-form-error', $registerForm).hasClass('hidden')) {
            $('.radio-tb .register-form-error', $registerForm).addClass('hidden');
        }
        if ($radBut.hasClass('radioOn')) {
            return;
        }
        $('.register-radio', $('.register-radio-tb', $registerForm)).removeClass('radioOn').addClass('radioOff');
        $radBut.removeClass('radioOff').addClass('radioOn');
    });

    // event handler for radio options yes/no if user want to be a beta tester
    $('.register-yesno-radio2 .register-radio-option3', $registerForm).rebind('click', function() {
        const $radBut = $('.register-radio', this);
        if (!$('.yesno-radio2  .register-form-error', $registerForm).hasClass('hidden')) {
            $('.yesno-radio2 .register-form-error', $registerForm).addClass('hidden');
        }
        if ($radBut.hasClass('radioOn')) {
            return;
        }
        $('.register-radio', $('.register-yesno-radio2', $registerForm)).removeClass('radioOn').addClass('radioOff');
        $radBut.removeClass('radioOff').addClass('radioOn');
    });

    // event handlers for Next and Submit buttons
    $('.next-rform', $registerForm).rebind('click', () => {
        if (inputsValidator1()) {
            nextPrev(currentTab);
            currentTab += 1;
            scrollingToRegisterForm();
        }
    });
    $('.submit-rform', $registerForm).rebind('click', () => {
        if (inputsValidator2()) {
            getFormData(userEmail, betaT, answers);
            sendFormData(currentTab);
        }
    });

    // event handler for Country dropdown option
    $countryDropdown.rebind('click', (event) => {
        const $target = $(event.target);
        if ($target.hasClass('option')) {
            if ($countryInput.hasClass('error')) {
                $countryInput.removeClass('error');
                $('.country', $countryInput.parent()).remove();
            }
            $('.option', $countryDropdown).removeClass('active').removeAttr('data-state');
            $target.addClass('active').attr('data-state', 'active');
            $('span', $countryDropdown).text($target.text());
            $('span', $countryDropdown).removeClass('placeholder');
            $target.trigger('change');
        }
    });

    // event handler for S3 provider dropdown multiple choice
    $('.option', $providerDropdown).rebind('click', (event) => {
        const $target = $(event.currentTarget);
        if ($('.rf-provider', $registerForm).hasClass('error')) {
            $('.rf-provider', $registerForm).removeClass('error');
            $('.s3provider', $('.register-provider', $registerForm)).remove();
        }
        if ($target.children(":first").hasClass('checkboxOn')) {
            $target.children(":first").removeClass('checkboxOn').addClass('checkboxOff');
        }
        else if ($target.children(":first").hasClass('checkboxOff')) {
            $target.children(":first").removeClass('checkboxOff').addClass('checkboxOn');
        }

        const $dropdownItem = $('.option', $providerDropdown);
        const length = $('.checkboxOn', $dropdownItem).length;
        if (length === 1) {
            $('> span', $providerDropdown).text($('.checkboxOn', $dropdownItem).next().text().trim());
        }
        else if ($('.checkboxOn', $('.option', $providerDropdown)).length > 1) {
            const spanText = mega.icu.format(l.ri_s4_regf_q3_span, length);
            $('> span', $providerDropdown).text(spanText);
        }
        else if (length === 0) {
            $('> span', $providerDropdown).text(l.ri_s4_regf_q3_title);
        }
        $target.trigger('change');
        return false;
    });

    // event handler for Back button
    $('.back-hover', $registerForm).rebind('click', () => {
        $registerForm.eq(currentTab).removeClass('display-block');
        currentTab = 0;
        $registerForm.eq(currentTab).addClass('display-block');
    });

    // event handler for Privacy agreement checkbox
    $('.register-agreement-checkbox', $registerForm).rebind('click', () => {
        const $checkBox = $('.register-agreement-checkbox .checkdiv', $registerForm);
        if (!$('.register-agreement-checkbox  .register-form-error', $registerForm).hasClass('hidden')) {
            $('.register-agreement-checkbox .register-form-error', $registerForm).addClass('hidden');
        }
        if ($checkBox.hasClass('checkboxOn')) {
            $checkBox.removeClass('checkboxOn').addClass('checkboxOff');
        }
        else {
            $checkBox.removeClass('checkboxOff').addClass('checkboxOn');
        }
    });
};

/**
 * create dropdown list for Countries
 * @param {String} localCountry local country name
 * @returns {void}
 */
function renderCountry(localCountry) {
    "use strict";
    let html = '';
    let sel = '';
    const $pageBlock = $('.feature-page.objectstorage');
    const $registerForm = $('.register-form', $pageBlock);
    const $country = $('#register-country', $registerForm);
    $('span', $country).text(l.ri_s4_regf_country);
    const countries = M.getCountries();
    for (const country in countries) {
        if (!countries.hasOwnProperty(country)) {
            continue;
        }
        if (localCountry && localCountry === countries[country]) {
            sel = 'active';
            $('span', $country).text(localCountry);
        }
        else {
            sel = '';
        }
        html += `<div class="option" data-value="${country}" data-state="${sel}">${countries[country]}</div>`;
    }
    $('.dropdown-scroll', $country).safeHTML(html);

    // Bind Dropdowns events
    bindDropdownEvents($country, false);
}

/**
 * create dropdown list for S3 providers
 * @param {Object} s3Providers list of  S3 providers
 * @returns {void}
 */
function getProviders(s3Providers) {
    "use strict";
    let html = '';
    const $pageBlock = $('.feature-page.objectstorage');
    const $registerForm = $('.register-form', $pageBlock);
    const $s3Provider = $('#register-provider', $registerForm);
    $('span', $s3Provider).text('Amazon');
    for (const s3Provider in s3Providers) {
        if (!s3Providers.hasOwnProperty(s3Provider)) {
            continue;
        }
        html += s3Provider === "AM" ? `<div class="option s3provider-checkbox">
                     <div class="checkdiv checkboxOn" id="s3provider-checkbox-${s3Provider}">
                     </div><label class="s3provider-label" data-value="${s3Provider}">
                     ${s3Providers[s3Provider]}</label></div>` :
            `<div class="option s3provider-checkbox">
                     <div class="checkdiv checkboxOff" id="s3provider-checkbox-${s3Provider}">
                     </div><label class="s3provider-label" data-value="${s3Provider}">
                     ${s3Providers[s3Provider]}</label></div>`;
    }
    $('.dropdown-scroll', $s3Provider).safeHTML(html);

    // Bind Dropdowns events
    bindDropdownEvents($s3Provider, false);
}
/**
 * show next tab
 * @param {Number} n Number for current tab
 * @returns {void}
 */
function nextPrev(n) {
    "use strict";
    const $pageBlock = $('.feature-page.objectstorage');
    const $registerForm = $('.register-form', $pageBlock);
    $registerForm.eq(n).removeClass('display-block');
    if (++n >= $registerForm.length) {
        n = 0;
    }
    $registerForm.eq(n).addClass('display-block');
}
/**
 * set local currency
 * @param {String} currency1000 Replacement with local currency for 1000 EUR
 * @param {String} currency299 Replacement with local currency for 2.99 EUR
 * @returns {void}
 */
function setCurrency(currency1000, currency299) {
    "use strict";
    const $pageBlock = $('.feature-page.objectstorage');
    l.ri_s4_subheader = l.ri_s4_subheader
        .replace('&#8364 1,000', currency1000);
    $('.objectstorage-p-subheader', $('.header-block', $pageBlock)).text("").safeAppend(l.ri_s4_subheader);
    l.ri_s4_card4_desc = l.ri_s4_card4_desc
        .replace('&#8364 2.99', currency299);
    $('.cheap p', $('.icon-block', $pageBlock)).text("").safeAppend(l.ri_s4_card4_desc);
    l.ri_s4_betat_header = l.ri_s4_betat_header
        .replace('&#8364 1,000', currency1000);
    $('.image-column .register-text h2', $('.content-two-column', $pageBlock)).text("")
        .safeAppend(l.ri_s4_betat_header);
}
/**
 * send request to get local currency
 * @returns {void}
 */
function sendCurrencyRequest() {
    "use strict";
    const $pageBlock = $('.feature-page.objectstorage');
    let currency1000 = "&#8364 1,000";
    let currency299 = "&#8364 2.99";
    let localCountry = '';
    Promise.allSettled([M.req({ a : 'lcc', "amount": 1000 }), M.req({ a : 'lcc', "amount": 2.99 }),
                        M.req({ a : "dailystats" })])
        .then((result) => {
            currency1000 = formatCurrency(result[0].value.amount, result[0].value.name,
                                          'symbol', true);
            currency299 = formatCurrency(result[1].value.amount, result[1].value.name,
                                         'symbol', true);
            const country = result[1].value.country;
            localCountry = M.getCountries()[country];
            setCurrency(currency1000, currency299);
            if (is_mobile) {
                mobileRenderCountry(localCountry);
            }
            else {
                renderCountry(localCountry);
            }
            const dailyUserNumber = result[2].value.confirmedusers.total;
            l.ri_s4_card2_desc = l.ri_s4_card2_desc
                .replace('235', Math.floor(dailyUserNumber / 5000000) * 5);
            $('.establish p', $pageBlock).safeHTML(l.ri_s4_card2_desc);
            loadingDialog.hide();
        });
}
/**
 * Fill the dropdown list with either countries or S3 providers
 * @param {Object} $list The selector to where the dropdown list should be appended
 * @param {Object} providers The object with a list of S3 providers
 * @returns {void}
 */
function buildDropDownList($list, providers) {
    "use strict";
    let options = '';
    const list = providers ? providers : M.getCountries();
    for (const item in list) {
        const itemName = list[item];
        let template = providers ?
            `<div class="mobile provider-list-item js-provider-list-item s3provider-checkbox"
                    data-provider-name="${itemName}">
                    <div class="checkdiv checkboxOff" id="s3provider-checkbox-${item}"></div>
                    <label class="mobile provider-name js-provider-name s3provider-label">${itemName}</label>
             </div>` : `<div class="mobile country-list-item js-country-list-item" data-country-name="${itemName}">
                            <div class="mobile country-name js-country-name">${itemName}</div>
                        </div>`;
        if (providers && item === 'AM') {
            template = `<div class="mobile provider-list-item js-provider-list-item s3provider-checkbox"
                    data-provider-name="${itemName}">
                    <div class="checkdiv checkboxOn" id="s3provider-checkbox-${item}"></div>
                    <label class="mobile provider-name js-provider-name s3provider-label">${itemName}</label>
             </div>`;
        }
        options += template;
    }
    $list.safeAppend(options);
}
/**
 * Initialise the click handler for clicking on a country which adds the country calling code to the form
 * @returns {void}
 */
function initCountryNameClickHandler() {
    "use strict";
    const $pageBlock = $('.feature-page.objectstorage');
    const $registerForm = $('.register-form', $pageBlock);
    const $countriesInput = $('.js-country-input', $registerForm);
    const $countrySelectorDialog = $('.objectstorage-mobile.js-country-selector');
    const $backgroundOverlay = $('.dark-overlay');
    const $countryList = $('.js-country-list', $countrySelectorDialog);
    const $countryInput = $('.rf-country', $registerForm);
    const $fileManagerHolder = $('.mobile .fmholder');

    // On tapping the country name
    $('.js-country-list-item', $countryList).rebind('tap', function() {

        // Get the country name
        const countryName = $(this).attr('data-country-name');

        // Put it in the screen behind
        $countriesInput.attr('data-country-name', countryName);
        $countriesInput.val(countryName).trigger('change');
        $('span', $('#register-country', $registerForm)).text(countryName);

        if ($countryInput.hasClass('error')) {
            $countryInput.removeClass('error');
            $('.country', $countryInput.parent()).remove();
        }

        // Hide the background overlay and dialog
        $backgroundOverlay.addClass('hidden');
        $countrySelectorDialog.addClass('hidden');
        $fileManagerHolder.removeClass('no-scroll');

        // Prevent double taps
        return false;
    });
}

/**
 * Intialise the Cancel button on the country picker dialog
 * @returns {void}
 */
function initCountryPickerCancelButton() {
    "use strict";
    const $countrySelectorDialog = $('.objectstorage-mobile.js-country-selector');
    const $backgroundOverlay = $('.dark-overlay');
    const $cancelButton = ('.js-cancel-country-selection', $countrySelectorDialog);
    const $fileManagerHolder = $('.mobile .fmholder');

    // Initialise the Cancel button
    $cancelButton.rebind('tap', () => {

        // Hide the background overlay and dialog
        $backgroundOverlay.addClass('hidden');
        $countrySelectorDialog.addClass('hidden');
        $fileManagerHolder.removeClass('no-scroll');

        // Prevent double taps
        return false;
    });
}

/**
 * Initialise the country picker dialog to open on clicking the text input
 * @returns {void}
 */
function initCountryPickerOpenHandler() {
    "use strict";
    const $pageBlock = $('.feature-page.objectstorage');
    const $registerForm = $('.register-form', $pageBlock);
    const $countrySelectorDialog = $('.objectstorage-mobile.js-country-selector');
    const $backgroundOverlay = $('.dark-overlay');
    const $fileManagerHolder = $('.mobile .fmholder');

    // On tapping the country container
    $('.rf-country', $registerForm).rebind('tap', () => {

        // Show the background overlay and dialog
        $backgroundOverlay.removeClass('hidden');
        $countrySelectorDialog.removeClass('hidden');
        $fileManagerHolder.addClass('no-scroll');

        // Prevent double taps
        return false;
    });
}

/**
 * Initialise the click handler for clicking on a provider
 * @returns {void}
 */
function initProviderNameClickHandler() {
    "use strict";
    const $pageBlock = $('.feature-page.objectstorage');
    const $registerForm = $('.register-form', $pageBlock);
    const $providerDropdown = $('#register-provider', $registerForm);
    const $providerSelectorDialog = $('.objectstorage-mobile.js-provider-selector');
    const $providerList = $('.js-provider-list', $providerSelectorDialog);

    // On tapping the provider name
    $('.js-provider-list-item', $providerList).rebind('tap', function() {
        let providerName = '';
        if ($('.rf-provider', $registerForm).hasClass('error')) {
            $('.rf-provider', $registerForm).removeClass('error');
            $('.s3provider', $('.register-provider', $registerForm)).remove();
        }
        if ($(this).children(':first').hasClass('checkboxOn')) {
            $(this).children(':first').removeClass('checkboxOn').addClass('checkboxOff');
        }
        else if ($(this).children(':first').hasClass('checkboxOff')) {
            $(this).children(':first').removeClass('checkboxOff').addClass('checkboxOn');
        }

        const length = $('.checkboxOn', $providerList).length;
        if (length === 1) {
            providerName = $('.checkboxOn', $providerList).next().text().trim();
            $('span', $providerDropdown).text(providerName);
        }
        else if (length > 1) {
            for (let i = 0; i < length; i++) {
                providerName += i === length - 1 ?
                    $('.checkboxOn', $providerList)[i].nextElementSibling.innerText.trim() :
                    `${$('.checkboxOn', $providerList)[i].nextElementSibling.innerText.trim()}, `;
            }
            const spanText = mega.icu.format(l.ri_s4_regf_q3_span, length);
            $('span', $providerDropdown).text(spanText);
        }
        else if (length === 0) {
            providerName = l.ri_s4_regf_q3_title;
            $('span', $providerDropdown).text(providerName);
        }
        $providerDropdown.attr('data-providers', providerName);

        // Prevent double taps
        return false;
    });
}

/**
 * Intialise the OK button on the provider picker dialog
 * @returns {void}
 */
function initProviderPickerOkButton() {
    "use strict";
    const $providerSelectorDialog = $('.objectstorage-mobile.js-provider-selector');
    const $backgroundOverlay = $('.dark-overlay');
    const $okButton = ('.js-cancel-provider-selection', $providerSelectorDialog);
    const $fileManagerHolder = $('.mobile .fmholder');

    // Initialise the OK button
    $okButton.rebind('tap', () => {

        // Hide the background overlay and dialog
        $backgroundOverlay.addClass('hidden');
        $providerSelectorDialog.addClass('hidden');
        $fileManagerHolder.removeClass('no-scroll');

        // Prevent double taps
        return false;
    });
}

/**
 * Initialise the provider picker dialog to open on clicking the text input
 * @returns {void}
 */
function initProviderPickerOpenHandler() {
    "use strict";
    const $pageBlock = $('.feature-page.objectstorage');
    const $registerForm = $('.register-form', $pageBlock);
    const $providerSelectorDialog = $('.objectstorage-mobile.js-provider-selector');
    const $backgroundOverlay = $('.dark-overlay');
    const $fileManagerHolder = $('.mobile .fmholder');

    // On tapping the country container
    $('.rf-provider', $registerForm).rebind('tap', () => {

        // Show the background overlay and dialog
        $backgroundOverlay.removeClass('hidden');
        $providerSelectorDialog.removeClass('hidden');
        $fileManagerHolder.addClass('no-scroll');

        // Prevent double taps
        return false;
    });
}

/**
 * initialise Country dropdown for mobile
 * @param {String} localCountry local country name
 * @returns {void}
 */
function mobileRenderCountry(localCountry) {
    "use strict";
    const $countrySelectorDialog = $('.objectstorage-mobile.js-country-selector');
    const $countryList = $('.js-country-list', $countrySelectorDialog);
    const $pageBlock = $('.feature-page.objectstorage');
    const $registerForm = $('.register-form', $pageBlock);
    if (localCountry && localCountry !== '') {
        $('span', $('#register-country', $registerForm)).text(localCountry);
        $('.js-country-input', $registerForm).attr('data-country-name', localCountry);
    }
    buildDropDownList($countryList);
    initCountryNameClickHandler();
    initCountryPickerCancelButton();
    initCountryPickerOpenHandler();
}
/**
 * initialise Country dropdown for mobile
 * @param {Object} s3Providers list of  S3 providers
 * @returns {void}
 */
function mobileRenderProvider(s3Providers) {
    "use strict";
    const $providerSelectorDialog = $('.objectstorage-mobile.js-provider-selector');
    const $providerList = $('.js-provider-list', $providerSelectorDialog);
    buildDropDownList($providerList, s3Providers);
    initProviderNameClickHandler();
    initProviderPickerOkButton();
    initProviderPickerOpenHandler();
}

/**
 * Add data from register form to answers array
 * @param {String} userEmail User's email
 * @param {String} betaT if user want to be a beta tester the value will be "Y", if not - "N"
 * @param {Array} answers array for answers from register your interest form
 * @returns {void}
 */
function getFormData(userEmail, betaT, answers) {
    "use strict";
    const $pageBlock = $('.feature-page.objectstorage');
    const $registerForm = $('.register-form', $pageBlock);
    const $emailInput = $('.rf-email', $registerForm);
    userEmail = $emailInput.val().trim();
    featurePages.objectStoragePage.userEmail = userEmail;
    betaT = $('#rad3yes', $registerForm).hasClass('radioOn') ? "Y" : "N";
    featurePages.objectStoragePage.betaT = betaT;
    let s3providers = "";
    const $fnameInput = $('.rf-first-name', $registerForm);
    const $lnameInput = $('.rf-last-name', $registerForm);
    const $countryInput = $('.rf-country', $registerForm);
    let roleName;
    const rolesList = [
        "Company Manager",
        "System Administator",
        "Developer",
        "Business Leader"
    ];
    if (is_mobile) {
        if ($('#register-provider', $registerForm).attr('data-providers') !== l.ri_s4_regf_q3_title) {
            s3providers = $('#register-provider', $registerForm).attr('data-providers');
        }
    }
    else if ($('#rad1yes', $registerForm).hasClass('radioOn')) {
        const $dropdownItem = $('.dropdown-scroll', $('.rf-provider', $registerForm));
        const $checkboxOnDropDown = $('.checkboxOn', $dropdownItem);
        const length = $checkboxOnDropDown.length;
        if (length === 1) {
            s3providers = $checkboxOnDropDown.next().text().trim();
        }
        else if (length > 1) {
            for (let i = 0; i < length; i++) {
                s3providers += i === length - 1 ? $checkboxOnDropDown[i].nextSibling.innerText.trim() :
                    `${$checkboxOnDropDown[i].nextSibling.innerText.trim()}, `;
            }
        }
    }

    for (let i = 0; i < rolesList.length; i++) {
        if ($('.radioOn', $('.register-role', $registerForm)).next().data('value') === i) {
            roleName = rolesList[i];
        }
    }

    const currentRole = $('#rad5oth', $registerForm).hasClass('radioOn') ?
        $('.rf-other', $registerForm).val().trim() : roleName;
    if (!s3providers) {
        s3providers = '';
    }
    answers = [
        $fnameInput.val().trim(),
        $lnameInput.val().trim(),
        $('.rf-company', $registerForm).val().trim(),
        $emailInput.val().trim(),
        $('span', $countryInput).text(),
        currentRole,
        $('.radioOn', $('.register-yesno-radio1', $registerForm)).next().text(),
        s3providers,
        $('.radioOn', $('.register-radio-tb', $registerForm)).next().text(),
        $('.radioOn', $('.register-yesno-radio2', $registerForm)).next().text()
    ];
    featurePages.objectStoragePage.answers = answers;
}
/**
 * Send survey form data
 * @param {Number} currentTab Current tab number, number to decide which tab should be shown
 * @returns {void}
 */
function sendFormData(currentTab) {
    "use strict";
    const $pageBlock = $('.feature-page.objectstorage');
    const $registerForm = $('.register-form', $pageBlock);
    const campaingData = {};
    const answers = featurePages.objectStoragePage.answers;
    const length = answers.length;
    if (!featurePages.objectStoragePage.userEmail || !length) {
        return false;
    }
    for (let i = 0; i < length; i++) {
        campaingData[`Q${i + 1}`] = base64urlencode(to8(answers[i]));
    }
    const request = {
        a: 'mrs',   // "marketing record survey"
        e: featurePages.objectStoragePage.userEmail, // email address of the user
        c: 4294967295, // this is a campaign id
        l: featurePages.objectStoragePage.betaT,
        // beta tester identifier, "Y" if user wants to be a beta tester and "N" if not
        d: campaingData
    };
    api_req(request, {
        callback: function(res) {
            if (res === 0 || res === -12) {
                if (res === -12) {
                    $('.rf-success-text p', $registerForm).text(l.ri_s4_regf_success2);
                }
                nextPrev(currentTab);
                currentTab += 1;
                scrollingToRegisterForm();
            }
            else {
                $('.rf-submit-error', $registerForm).removeClass('hidden');
            }
        }
    });
}

/** input values validation
 * @returns {Boolean}   whether the validation passed or not*/
function inputsValidator1() {
    "use strict";
    const $pageBlock = $('.feature-page.objectstorage');
    const $registerForm = $('.register-form', $pageBlock);
    const $countryInput = $('.rf-country', $registerForm);
    const $emailInput = $('.rf-email', $registerForm);
    const $lnameInput = $('.rf-last-name', $registerForm);
    const $fnameInput = $('.rf-first-name', $registerForm);
    const $otherInput = $('.rf-other', $registerForm);
    const $megaInputs = $('.mega-input', $registerForm);
    let passed = true;
    if ($fnameInput.parent().hasClass('error') || $lnameInput.parent().hasClass('error') ||
        $emailInput.parent().hasClass('error') || $countryInput.hasClass('error') ||
        $otherInput.parent().hasClass('error')) {
        for (let i = $megaInputs.length - 1; i > -1; i--) {
            if ($($megaInputs[i]).hasClass('error')){
                $($megaInputs[i]).children('input').focus();
            }
        }
        passed = false;
    }
    if ($('#rad5oth', $registerForm).hasClass('radioOn') && !$('.rf-other', $registerForm).val().trim() &&
        !$otherInput.parent().hasClass('error')) {
        $otherInput.closest('.register-input-other')
            .safeAppend(`<div class="message-container mega-banner other">${l.ri_s4_regf_err1}</div>`);
        $otherInput.focus();
        $otherInput.parent().addClass('error');
        passed = false;
    }
    if ($('span', $countryInput).text() === l.ri_s4_regf_country && !$countryInput.hasClass('error')) {
        $countryInput.parent()
            .safeAppend(`<div class="message-container mega-banner country">${l.ri_s4_regf_err1}</div>`);
        $countryInput.addClass('error');
        passed = false;
    }
    if (!inputsSubValidator($emailInput, $lnameInput, $fnameInput)) {
        passed = false;
    }
    return passed;
}
/** input values validation
 * @param {Object} $emailInput email input object
 * @param {Object} $lnameInput last name input object
 * @param {Object} $fnameInput first name input object
 * @returns {Boolean}   whether the validation passed or not*/
function inputsSubValidator($emailInput, $lnameInput, $fnameInput) {
    "use strict";
    let passed = true;
    if ((!$emailInput || !$emailInput.val().trim() || !isValidEmail($emailInput.val().trim())) &&
        !$emailInput.parent().hasClass('error')) {
        if (!$emailInput.val().trim()) {
            $emailInput.closest('.register-input')
                .safeAppend(`<div class="message-container mega-banner email">${l.ri_s4_regf_err1}</div>`);
        }
        else if (!isValidEmail($emailInput.val())) {
            $emailInput.closest('.register-input')
                .safeAppend(`<div class="message-container mega-banner email">${l[1513]}</div>`);
        }
        $emailInput.focus();
        $emailInput.parent().addClass('error');
        passed = false;
    }
    if ((!$lnameInput || !$lnameInput.val().trim()) && !$lnameInput.parent().hasClass('error')) {
        $lnameInput.closest('.register-input')
            .safeAppend(`<div class="message-container mega-banner lname">${l.ri_s4_regf_err1}</div>`);
        $lnameInput.focus();
        $lnameInput.parent().addClass('error');
        passed = false;
    }
    if ((!$fnameInput || !$fnameInput.val().trim()) && !$fnameInput.parent().hasClass('error')) {
        $fnameInput.closest('.register-input')
            .safeAppend(`<div class="message-container mega-banner fname">${l.ri_s4_regf_err1}</div>`);
        $fnameInput.focus();
        $fnameInput.parent().addClass('error');
        passed = false;
    }
    return passed;
}

/** input values validation
 * @returns {Boolean}   whether the validation passed or not*/
function inputsValidator2() {
    "use strict";
    const $pageBlock = $('.feature-page.objectstorage');
    const $registerForm = $('.register-form', $pageBlock);

    let passed = true;
    if (!$('.register-form-error', $registerForm).hasClass('hidden')) {
        passed = false;
    }
    if (!$('#rad1yes', $registerForm).hasClass('radioOn')
        && !$('#rad2no', $registerForm).hasClass('radioOn')) {
        $('.yesno-radio1 .register-form-error', $registerForm).removeClass('hidden');
        passed = false;
    }
    if ($('#rad1yes', $registerForm).hasClass('radioOn') &&
        $('span', $('.register-qn-s3provider', $registerForm)).text() === l.ri_s4_regf_q3_title &&
        !$('.rf-provider', $registerForm).hasClass('error')) {
        $('.register-provider', $registerForm)
            .safeAppend(`<div class="message-container mega-banner s3provider">${l.ri_s4_regf_err1}</div>`);
        $('.rf-provider', $registerForm).addClass('error');
        passed = false;
    }
    if ($('.rf-provider', $registerForm).hasClass('error')) {
        passed = false;
    }
    if (
        !$('#radless',$registerForm).hasClass('radioOn') &&
        !$('#rad10', $registerForm).hasClass('radioOn') &&
        !$('#rad25', $registerForm).hasClass('radioOn') &&
        !$('#rad100',$registerForm).hasClass('radioOn')
    ) {
        $('.radio-tb .register-form-error', $registerForm).removeClass('hidden');
        passed = false;
    }
    if (!$('#rad3yes', $registerForm).hasClass('radioOn') && !$('#rad4no', $registerForm).hasClass('radioOn')) {
        $('.yesno-radio2 .register-form-error', $registerForm).removeClass('hidden');
        passed = false;
    }
    if (!$('.register-agreement-checkbox .checkdiv', $registerForm).hasClass('checkboxOn')) {
        $('.register-agreement-checkbox .register-form-error', $registerForm).removeClass('hidden');
        passed = false;
    }
    return passed;
}
/** bind events for inputs
 * @param {Object} $input input object
 * @returns {void}
 */
function bindInputsEvents($input) {
    "use strict";
    $input.rebind('focus.underlinedText', () => {
        $input.parent().addClass('active');
    });

    $input.rebind('blur.underlinedText change.underlinedText', () => {
        if ($input.val()) {
            $input.parent().addClass('valued');
        }
        else {
            $input.parent().removeClass('valued');
        }
        $input.parent().removeClass('active');
    });

    $input.rebind('input.underlinedText', () => {
        if ($input.parent().hasClass('error')) {
            $input.parent().removeClass('error');
            $('.mega-banner', $input.closest('.register-input')).remove();
            if ($input.hasClass('rf-other')) {
                $('.mega-banner', $input.closest('.register-input-other')).remove();
            }
        }
    });
}

/** scrolling into register form
 * @returns {void}
 */
function scrollingToRegisterForm() {
    "use strict";
    const scrollTo = document.querySelector('.register-form-container');
    scrollTo.scrollIntoView({block: 'start'});
}

