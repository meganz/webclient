var copyright = copyright || {};

/**
 * Validate the email address, as without a valid email we can not contact the complainant
 * if there is a counter-notice, or to report stats on their complaints.
 * Further email validation may occur in the API
 * @param {String} email The email to validate
 * @return {Boolean} True if passing validation, false otherwise
 */
copyright.validateEmail = function(email) {
    'use strict';
    return isValidEmail(email);
};

copyright.ourDomains = {'mega.co.nz': 1, 'mega.nz': 1, 'mega.io': 1};

/**
 * Validate that the user has entered a link that is, or can be easily turned into, a valid MEGA link
 * @param {String} url The url to validate as a mega public link
 * @return {Array} The link type at idx 0, handle found as idx 1, and sub-node as idx 2 if any.
 * If S4, then idx 0 "s4" and idx 1 an object of S4 parts.
 */
copyright.validateUrl = function(url) {
    'use strict';
    url = tryCatch(() => new URL(mURIDecode(url).trim()), false)();
    if (!url) {
        return null;
    }

    const s4Match = /([\w-]*)\.?(s3\.([\w-]+)\.s4\.mega\.io)\/(\S+)/i.exec(url.href);
    if (s4Match) {
        return ['s4', { bucket: s4Match[1], region: s4Match[3], path: s4Match[4] }];
    }

    const ext = url && String(url.protocol).endsWith('-extension:');

    if (!url || !this.ourDomains[url.host] && !ext) {
        return null;
    }
    let path = (ext ? '' : url.pathname) + url.hash;

    if (url.hash) {
        const hash = String(url.hash).replace('#', '');

        if (hash[0] === '!' || hash[0] === 'F' && hash[1] === '!') {
            path = hash[0] === 'F'
                ? hash.replace('F!', '/folder/').replace('!', '#').replace('!', '/folder/').replace('?', '/file/')
                : hash.replace('!', '/file/').replace('!', '#');
        }
        else if (hash[0] === 'P' && hash[1] === '!') {
            const a = base64urldecode(hash.substr(2));
            const b = String.fromCharCode(a.charCodeAt(2))
                    + String.fromCharCode(a.charCodeAt(3))
                    + String.fromCharCode(a.charCodeAt(4))
                    + String.fromCharCode(a.charCodeAt(5))
                    + String.fromCharCode(a.charCodeAt(6))
                    + String.fromCharCode(a.charCodeAt(7));
            path = '/file/' + base64urlencode(b);
        }
    }

    const match = path.match(/^[#/]*(file|folder|embed|collection|album)[!#/]+([\w-]{8})\b/i);
    if (!match) {
        console.warn('Invalid url.', url);
        return null;
    }
    const result = [match[1], match[2]];

    if (match[1] === 'folder') {
        result.push((path.replace(match[0], '').match(/(?:file|folder)\/([\w-]{8})/i) || [])[1]);
    }
    return result;
};

copyright.validatePhoneNumber = function(phoneNumber) {
    'use strict';
    // if not at least 4 numbers, what is this thing?
    return M.validatePhoneNumber(phoneNumber);
};

copyright.validateDisputeForm = function() {
    'use strict';

    var $copyrightwork = $('.copyrightwork', '.dn-form');
    var $explanation = $('.copyrightexplanation', '.dn-form');
    var proceed = true;
    var $contentURL = $('.contenturl', '.dn-form');
    for (var i = 0; i < $contentURL.length; i++) {
        proceed = true;
        var eVal = $($contentURL[i]).val();
        var cprVal = $($copyrightwork[i]).val();
        var explainVal = $($explanation[i]).val();

        if (eVal !== '' && cprVal !== '' && explainVal === '') {
            proceed = false;
            msgDialog('warninga', l[135], escapeHTML(l[8809]));
            return false;
        }
        else if (eVal !== '' && cprVal === '') {
            proceed = false;
            msgDialog('warninga', l[135], escapeHTML(l[8810]));
            return false;
        }
        else if (eVal === '' || cprVal === '') {
            proceed = false;
            msgDialog('warninga', l[135], escapeHTML(l[8811]));
            return false;
        }
        else if (!copyright.validateUrl(eVal)) {
            proceed = false;
            msgDialog('warninga', l[135], escapeHTML(l[8812]));
            return false;
        }
    }

    if (!proceed) {
        return false;
    }

    if ($('input.copyrightowner', '.dn-form').val() === '') {
        msgDialog('warninga', l[135], escapeHTML(l[662]), false, function() {
            $('input.copyrightowner', '.dn-form').trigger("focus");
        });
        return false;
    }
    else if ($('input.phonenumber', '.dn-form').val() === '') {
        msgDialog('warninga', l[135], escapeHTML(l[8813]), false, function() {
            $('input.phonenumber', '.dn-form').trigger("focus");
        });
        return false;
    }
    else if (!copyright.validatePhoneNumber($('input.phonenumber', '.dn-form').val())) {
        msgDialog('warninga', l[135], escapeHTML(l[8814]), false, function() {
            $('input.phonenumber', '.dn-form').trigger("focus");
        });
        return false;
    }
    else if ($('input.email', '.dn-form').val() === '') {
        msgDialog('warninga', l[135], escapeHTML(l[663]), false, function() {
            $('input.email', '.dn-form').trigger("focus");
        });
        return false;
    }
    else if (!copyright.validateEmail($('input.email', '.dn-form').val())) {
        msgDialog('warninga', l[135], escapeHTML(l[198]), false, function() {
            $('input.email', '.dn-form').trigger("focus");
        });
        return false;
    }
    else if ($('input.address', '.dn-form').val() === '') {
        msgDialog('warninga', l[135], escapeHTML(l[8815]), false, function() {
            $('input.address', '.dn-form').trigger("focus");
        });
        return false;
    }
    else if ($('input.city', '.dn-form').val() === '') {
        msgDialog('warninga', l[135], escapeHTML(l[1262]), false, function() {
            $('input.city', '.dn-form').trigger("focus");
        });
        return false;
    }
    else if (!$('.select.country', '.dn-form').hasClass('selected')) {
        msgDialog('warninga', l[135], escapeHTML(l[568]));
        return false;
    }

    // The checkboxes depend on the type
    if (proceed && !$('.cn_check1 .checkinput', '.dn-form').prop('checked')) {
        msgDialog('warninga', l[135], escapeHTML(l[8816]));
        return false;
    }
    else if (!$('.cn_check2 .checkinput', '.dn-form').prop('checked')) {
        msgDialog('warninga', l[135], escapeHTML(l[8817]));
        return false;
    }

    return true;
};

copyright.init_cndispute = function() {
    'use strict';

    if (is_mobile) {
        $('.dn.main-pad-block').removeClass('hidden');
        $('.js-back-to-dispute', '.dn.header').rebind('click', () => {
            loadSubPage('dispute');
        });
    }

    if (typeof (u_attr) !== 'undefined' && typeof (u_attr.email) !== 'undefined' && u_attr.email !== '') {
        $('input.email', '.dn-form').val(u_attr.email);
    }

    // prefill the URL with public node handle.
    if (u_attr) {
        var localStorageKey = 'takedownDisputeNodeURL';
        var disputeNodeURL = localStorage.getItem(localStorageKey);
        if (disputeNodeURL) {
            $('input.contenturl', '.dn-form').val(disputeNodeURL);
            localStorage.removeItem(localStorageKey);
        }
    }

    // The sign button needs to validate the form
    $('.signbtn', '.dn-form').rebind('click.copydispute', () => {

        if (copyright.validateDisputeForm()) {
            // Show loading dialog
            loadingDialog.show();

            // The 'copyright notice dispute' api request. Pull the values straight from the inputs
            // as we have already validated them
            var url = $('input.contenturl', '.dn-form').val();
            var handles = copyright.validateUrl(url);
            var validatedPhoneNumber = M.validatePhoneNumber($('input.phonenumber', '.dn-form').val());

            var requestParameters = {
                a: 'cnd',
                ph: handles[1],
                ufsh: handles[2],
                desc: $('input.copyrightwork', '.dn-form').val(),
                comments: $('input.copyrightexplanation', '.dn-form').val(),
                name: $('input.copyrightowner', '.dn-form').val(),
                phonenumber: validatedPhoneNumber,
                email: $('input.email', '.dn-form').val(),
                company: $('input.company', '.dn-form').val(),
                address1: $('input.address', '.dn-form').val(),
                address2: $('input.address2', '.dn-form').val(),
                city: $('input.city', '.dn-form').val(),
                province: $('input.state', '.dn-form').val(),
                postalcode: $('input.zip', '.dn-form').val(),
                country: $('.select.country select', '.dn-form').val(),
                otherremarks: $('input.otherremarks', '.dn-form').val()
            };

            if (['collection', 'album'].includes(handles[0])) {
                requestParameters.collection = 1;
            }

            if (handles[0] === 's4') {
                requestParameters.s4 = 1;
                requestParameters.ph = url;
                delete requestParameters.ufsh;
            }

            api_req(requestParameters, {
                callback: function(response) {
                    loadingDialog.hide();

                    if (!isNaN(parseFloat(response)) && isFinite(response)) {
                        // Its a number, must be error code of some kind
                        if (response === -9) {
                            // ENOENT error
                            msgDialog('warninga',
                                escapeHTML(l[135]), escapeHTML(l[8818]), false);
                            return false;
                        }
                        if (response === -12) {
                            // EEXIST error, they have already made a dispute for this link
                            msgDialog('warninga',
                                escapeHTML(l[135]), escapeHTML(l[8819]), false);
                            return false;
                        }
                        else if (response === -11) {
                            // Access
                            msgDialog('warninga',
                                escapeHTML(l[135]), escapeHTML(l[8820]), false);
                            return false;
                        }
                        else {
                            // Generic (probably args)
                            msgDialog('warninga',
                                escapeHTML(l[135]), escapeHTML(l[47]), false);
                            return false;
                        }
                    }

                    msgDialog('info',
                        escapeHTML(l[1287]), escapeHTML(l[1288]), false,
                        function() {
                            loadSubPage('dispute');
                        });
                }
            });
        }
    });

    // Add click and unclick functionality for the custom styled checkboxes
    copyright.initCheckboxListeners();

    $('.select select', '.dn-form').rebind('change.copydispute', function() {
        if ($(this).val() !== 0) {
            $(this).parent().addClass('selected');
            $(this).parent().find('.affiliate-select-txt')
                .text($(this).find('option[value=\'' + $(this).val() + '\']').text());
        }
    });

    // Set up the country values
    var markup = '<OPTION value="0"></OPTION>';
    var countries = M.getCountries();
    for (var country in countries) {
        if (countries.hasOwnProperty(country)) {
            markup += '<option value="' + escapeHTML(country) + '">'
                + escapeHTML(countries[country]) + '</option>';
        }
    }
    $('.select.country select', '.dn-form').safeHTML(markup);
};

// Add click and unclick functionality for the custom styled checkboxes
copyright.initCheckboxListeners = function() {
    'use strict';

    $('.cn_check1, .cn_check2, .cn_check3, .cn_check4').rebind('click.copydispute', function() {
        var $input = $(this).find('input');
        var $checkboxDiv = $(this).find('.checkdiv');

        // If unticked, tick the box
        if ($input.hasClass('checkboxOff')) {
            $input.removeClass('checkboxOff').addClass('checkboxOn').prop('checked', true);
            $checkboxDiv.removeClass('checkboxOff').addClass('checkboxOn');
        }
        else {
            // Otherwise untick the box
            $input.removeClass('checkboxOn').addClass('checkboxOff').prop('checked', false);
            $checkboxDiv.removeClass('checkboxOn').addClass('checkboxOff');
        }
    });
};

/**
 * Mark input field as wrong.
 * @param elm
 */
copyright.markInputWrong = function(elm) {
    'use strict';
    $(elm)
        .addClass("red")
        .css('font-weight', 'bold')
        .rebind('click', function() {
            $(this).off('click')
                .removeClass("red")
                .css('font-weight', 'normal')
                .parent()
                .css('box-shadow', 'none');
        })
        .parent().css('box-shadow', '0px 0px 8px #f00');
};
