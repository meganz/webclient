var copyright = copyright || {};

copyright.updateUI = function() {
    'use strict';

    $('#cn_urls .contenturl').rebind('click', function() {
        if ($(this).val() === '') {
            $(this).select();
        }
    });
};

/**
 * Validate the email address, as without a valid email we can not contact the complainant
 * if there is a counter-notice, or to report stats on their complaints.
 * Further email validation may occur in the API
 * @param {String} email The email to validate
 * @return {Boolean} True if passing validation, false otherwise
 */
copyright.validateEmail = function(email) {
    'use strict';
    var re1 = /[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*/;
    var re2 = /@([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;
    var re = new RegExp(re1.source + re2.source);
    var match = re.exec(email);
    return match !== null;
};

/**
 * Validate that the user has entered a link that is, or can be easily turned into, a valid MEGA link
 * @param {String} url The url to validate as a mega public link
 * @return {Number} The (integer) number of handles found
 */
copyright.validateUrl = function(url) {
    'use strict';
    if (!/^\s*https?:\/\/mega\./i.test(url)) {
        return 0;
    }
    url = copyright.decodeURIm(url);
    var handles = copyright.getHandles(url);
    return Object.keys(handles).length;
};

/**
 * Find any valid or semi-valid MEGA link handles from the data
 * @param {String} data The data to scan for handles
 * @return {Object} hashset of handles
 */
copyright.getHandles = function(data) {
    'use strict';

    var handles = {};
    var passwordLinkPattern = /(#P!)([\w-]+)\b/gi;

    // Find the handles for any password protected link
    data = data.replace(passwordLinkPattern, function(fullUrlHash, passwordLinkId, urlEncodedData) {

        // Decode the Base64 URL encoded data and get the 6 bytes for the handle, then re-encode the handle to Base64
        var bytes = exportPassword.base64UrlDecode(urlEncodedData);
        var handle = bytes.subarray(2, 8);
        var handleBase64 = exportPassword.base64UrlEncode(handle);

        // Add the handle
        handles[handleBase64] = 1;

        // Remove the link so the bottom code doesn't detect it as well
        return '';
    });

    var p = /.(?:F?!|\w+\=)([\w-]{8})(?:!([\w-]+))?\b/gi;

    (data.replace(/<\/?\w[^>]+>/g, '').replace(/\s+/g, '') + data).replace(p, function(a, id) {
        if (!handles[id]) {
            handles[id] = 1;
        }
    });

    return handles;
};

/**
 * Iteratively remove any %% stuff from the data
 * @param {String} data The data string to decode
 * @return {String} the decoded data
 */
copyright.decodeURIm = function(data) {
    'use strict';
    for (var lmt = 7; --lmt && /%[a-f\d]{2}/i.test(data);) {
        try {
            data = decodeURIComponent(data);
        }
        catch (ex) {
            break;
        }
    }

    while (data.indexOf('%25') !== -1) {
        data = data.replace(/%25/g, '%');
    }

    return data.replace(/%21/g, '!');
};

/**
 * Store the complainant details so they don't have to type them in next time
 * Puts them into localStorage.copyrightOwnerDetails
 */
copyright.saveCopyrightOwnerValues = function() {
    'use strict';
    var details = {
        owner: $('input.copyrightowner').val(),
        jobtitle: $('input.jobtitle').val(),
        email: $('input.email').val(),
        fax: $('input.fax').val(),
        city: $('input.city').val(),
        postalcode: $('input.zip').val(),
        name: $('input.agent').val(),
        company: $('input.company').val(),
        phone: $('input.phone').val(),
        address: $('input.address').val(),
        province: $('input.state').val(),
        country: $('.select.country select').val()
    };

    localStorage.setItem('copyrightOwnerDetails', JSON.stringify(details));
};

/**
 * Load the complainant details directly into the html elements so they don't have to type them in again
 */
copyright.loadCopyrightOwnerValues = function() {
    'use strict';
    if (localStorage.copyrightOwnerDetails) {
        var details = JSON.parse(localStorage.copyrightOwnerDetails);
        $('input.copyrightowner').val(details.owner);
        $('input.jobtitle').val(details.jobtitle);
        $('input.email').val(details.email);
        $('input.fax').val(details.fax);
        $('input.city').val(details.city);
        $('input.zip').val(details.postalcode);
        $('input.agent').val(details.name);
        $('input.company').val(details.company);
        $('input.phone').val(details.phone);
        $('input.address').val(details.address);
        $('input.state').val(details.province);
        $('.select.country select').val(details.country).change();
    }
};

/**
 * Initialises the copyright form page, binding the events the form requires
 */
copyright.init_cn = function() {
    'use strict';
    var wrong = function(elm) {
        $(elm)
            .addClass("red")
            .css('font-weight', 'bold')
            .rebind('click', function() {
                $(this).unbind('click')
                    .removeClass("red")
                    .css('font-weight', 'normal')
                    .parent()
                    .css('box-shadow', 'none');
            })
            .parent().css('box-shadow', '0px 0px 8px #f00');
    };

    $('.addurlbtn').rebind('click', function() {
        $('#cn_urls').safeAppend('<div class="new-affiliate-label">' +
            '<div class="new-affiliate-star"></div>@@</div>' +
            '<div class="clear"></div>' +
            '<div class="affiliate-input-block">' +
                '<input type="text" class="contenturl" value="">' +
            '</div>' +
            '<div class="new-affiliate-label">' +
                '<div class="new-affiliate-star"></div>@@' +
            '</div>' +
            '<div class="clear"></div>' +
            '<div class="affiliate-input-block">' +
                '<input type="text" class="copyrightwork" value="">' +
            '</div>', l[641], l[648]);
        copyright.updateUI();
    });
    copyright.updateUI();
    $('.step2btn').rebind('click', function() {
        if (!$('.select.content').hasClass('selected')) {
            msgDialog('warninga', l[135], escapeHTML(l[657]));
        }
        else if (!$('.select.type').hasClass('selected')) {
            msgDialog('warninga', l[135], escapeHTML(l[658]));
        }
        else {
            var invalidWords = ['asd', 'asdf', 'copyright'];
            var copyrightwork = $('.copyrightwork');
            var proceed = false;
            $('.contenturl').each(function(i, e) {
                proceed = true;
                var eVal = String($(e).val()).trim();
                var cVal = String($(copyrightwork[i]).val()).trim();
                if (eVal !== ''  && cVal === '' || invalidWords.indexOf(cVal.toLowerCase()) !== -1) {
                    proceed = false;
                    msgDialog('warninga', l[135], escapeHTML(l[660]));
                    wrong(copyrightwork[i]);
                    return false;
                }
                if (eVal === '' || cVal === '') {
                    proceed = false;
                    msgDialog('warninga', l[135], escapeHTML(l[659]));
                    wrong(eVal ? copyrightwork[i] : e);
                    return false;
                }

                if (!copyright.validateUrl(eVal)) {
                    proceed = false;
                    msgDialog('warninga', l[135], escapeHTML(l[7686]));
                    wrong(e);
                    return false;
                }

                if (copyright.validateUrl(cVal)) {
                    proceed = false;
                    msgDialog('warninga', l[135], escapeHTML(l[9056]));
                    wrong(copyrightwork[i]);
                    return false;
                }

                $(e).removeClass("red");

            });

            if (proceed && !$('.cn_check1 .checkinput').attr('checked')) {
                msgDialog('warninga', l[135], escapeHTML(l[665]));
            }
            else if (proceed) {
                $('.cn.step1').addClass('hidden');
                $('.cn.step2').removeClass('hidden');

                // Reload values from local storage if the user has previously been here
                copyright.loadCopyrightOwnerValues();
            }
        }
    });

    $('.backbtn').rebind('click', function() {
        $('.cn.step1').removeClass('hidden');
        $('.cn.step2').addClass('hidden');
    });

    copyright.initCheckboxListeners();

    $('.select select').rebind('change.initcn', function() {
        var c = $(this).attr('class');
        if (c && c.indexOf('type') > -1 && $(this).val() === 4) {
            msgDialog('info',
                escapeHTML(l[701]),
                escapeHTML(l[700])
                    .replace('[A1]', '<a href="mailto:copyright@mega.nz" class="red">')
                    .replace('[/A1]', '</A>')
                    .replace('[A2]', '<a href="/copyright" class="red clickurl">')
                    .replace('[/A2]', '</A>'));
            clickURLs();
            $(this).val(0);
            $(this).parent().find('.affiliate-select-txt').text(l[1278]);
        }
        else if ($(this).val() !== 0) {
            $(this).parent().addClass('selected');
            $(this).parent().find('.affiliate-select-txt')
                .text($(this).find('option[value=\'' + $(this).val() + '\']').text());
        }
    });
    $('.signbtn').rebind('click', function() {
        if ($('input.copyrightowner').val() === '') {
            msgDialog('warninga', l[135], escapeHTML(l[661]), false, function() {
                $('input.copyrightowner').focus();
            });
        }
        else if ($('input.agent').val() === '') {
            msgDialog('warninga', l[135], escapeHTML(l[662]), false, function() {
                $('input.agent').focus();
            });
        }
        else if ($('input.email').val() === '') {
            msgDialog('warninga', l[135], escapeHTML(l[663]), false, function() {
                $('input.email').focus();
            });
        }
        else if (!copyright.validateEmail($('input.email').val())) {
            msgDialog('warninga', l[135], escapeHTML(l[198]), false, function() {
                $('input.email').focus();
            });
        }
        else if ($('input.city').val() === '') {
            msgDialog('warninga', l[135], escapeHTML(l[1262]), false, function() {
                $('input.city').focus();
            });
        }
        else if (!$('.select.country').hasClass('selected')) {
            msgDialog('warninga', l[135], escapeHTML(l[568]));
        }
        else if (!$('.cn_check2 .checkinput').attr('checked')) {
            msgDialog('warninga', l[135], escapeHTML(l[666]));
        }
        else if (!$('.cn_check3 .checkinput').attr('checked')) {
            msgDialog('warninga', l[135], escapeHTML(l[667]));
        }
        else {

            // Save the entered values into local storage so the user doesn't have to re-enter them next time
            copyright.saveCopyrightOwnerValues();

            var cn_post_urls = [];
            var cn_post_works = [];
            $('.contenturl').each(function(a, b) {
                cn_post_urls.push(b.value);
            });
            $('.copyrightwork').each(function(a, b) {
                cn_post_works.push(b.value);
            });
            var cn_works_json = JSON.stringify([cn_post_urls, cn_post_works]);
            loadingDialog.show();
            api_req({
                a: 'cn',
                works: cn_works_json,
                infr_type: $('.select.content select').val(),
                takedown_type: $('.select.type select').val(),
                jobtitle: $('input.jobtitle').val(),
                owner: $('input.copyrightowner').val(),
                email: $('input.email').val(),
                fax: $('input.fax').val(),
                postalcode: $('input.zip').val(),
                city: $('input.city').val(),
                company: $('input.company').val(),
                name: $('input.agent').val(),
                phone: $('input.phone').val(),
                address: $('input.address').val(),
                province: $('input.state').val(),
                country: $('.select.country select').val()
            }, {
                callback: function() {
                    loadingDialog.hide();
                    msgDialog('info',
                        escapeHTML(l[1287]), escapeHTML(l[1288]), false,
                        function() {
                            loadSubPage('copyright');
                        });
                }
            });
        }
    });
    var markup = '<OPTION value="0"></OPTION>';
    var countries = M.getCountries();
    for (var country in countries) {
        if (countries.hasOwnProperty(country)) {
            markup += '<option value="' + escapeHTML(country) + '">'
                + escapeHTML(countries[country]) + '</option>';
        }
    }
    $('.select.country select').safeHTML(markup);
};

copyright.validatePhoneNumber = function(phoneNumber) {
    'use strict';

    var p = /\d[^\d]*\d[^\d]*\d[^\d]*\d/;
    var match = p.exec(phoneNumber);

    // if not at least 4 numbers, what is this thing?
    return match !== null;
};

copyright.validateDisputeForm = function() {
    'use strict';

    var copyrightwork = $('.copyrightwork');
    var explanation = $('.copyrightexplanation');
    var proceed = true;

    $('.contenturl').each(function(i, e) {
        proceed = true;
        if (($(e).val() !== '') && ($(copyrightwork[i]).val() !== '') && ($(explanation[i]).val() === '')) {
            proceed = false;
            msgDialog('warninga', l[135], escapeHTML(l[8809]));
            return false;
        }
        else if (($(e).val() !== '') && ($(copyrightwork[i]).val() === '')) {
            proceed = false;
            msgDialog('warninga', l[135], escapeHTML(l[8810]));
            return false;
        }
        else if (($(e).val() === '') || ($(copyrightwork[i]).val() === '')) {
            proceed = false;
            msgDialog('warninga', l[135], escapeHTML(l[8811]));
            return false;
        }
        else if (!copyright.validateUrl($(e).val())) {
            proceed = false;
            msgDialog('warninga', l[135],
                escapeHTML(l[8812]));

            return false;
        }
    });

    if (!proceed) {
        return false;
    }

    if ($('input.copyrightowner').val() === '') {
        msgDialog('warninga', l[135], escapeHTML(l[662]), false, function() {
            $('input.copyrightowner').focus();
        });
        return false;
    }
    else if ($('input.phonenumber').val() === '') {
        msgDialog('warninga', l[135], escapeHTML(l[8813]), false, function() {
            $('input.phonenumber').focus();
        });
        return false;
    }
    else if (!copyright.validatePhoneNumber($('input.phonenumber').val())) {
        msgDialog('warninga', l[135], escapeHTML(l[8814]), false, function() {
            $('input.phonenumber').focus();
        });
        return false;
    }
    else if ($('input.email').val() === '') {
        msgDialog('warninga', l[135], escapeHTML(l[663]), false, function() {
            $('input.email').focus();
        });
        return false;
    }
    else if (!copyright.validateEmail($('input.email').val())) {
        msgDialog('warninga', l[135], escapeHTML(l[198]), false, function() {
            $('input.email').focus();
        });
        return false;
    }
    else if ($('input.address').val() === '') {
        msgDialog('warninga', l[135], escapeHTML(l[8815]), false, function() {
            $('input.address').focus();
        });
        return false;
    }
    else if ($('input.city').val() === '') {
        msgDialog('warninga', l[135], escapeHTML(l[1262]), false, function() {
            $('input.city').focus();
        });
        return false;
    }
    else if (!$('.select.country').hasClass('selected')) {
        msgDialog('warninga', l[135], escapeHTML(l[568]));
        return false;
    }

    // The checkboxes depend on the type
    if (proceed && !$('.cn_check1 .checkinput').attr('checked')) {
        msgDialog('warninga', l[135], escapeHTML(l[8816]));
        return false;
    }
    else if (!$('.cn_check2 .checkinput').attr('checked')) {
        msgDialog('warninga', l[135], escapeHTML(l[8817]));
        return false;
    }

    return true;
};

copyright.init_cndispute = function() {
    'use strict';

    if (typeof (u_attr) !== 'undefined' && typeof (u_attr.email) !== 'undefined' && u_attr.email !== '') {
        $('input.email').val(u_attr.email);
    }

    // The sign button needs to validate the form
    $('.signbtn').rebind('click.copydispute', function() {

        if (copyright.validateDisputeForm()) {
            // Show loading dialog
            loadingDialog.show();

            // The 'copyright notice dispute' api request. Pull the values straight from the inputs
            // as we have already validated them
            var handles = copyright.getHandles($('input.contenturl').val());
            api_req({
                a: 'cnd',
                ph: Object.keys(handles)[0],
                desc: $('input.copyrightwork').val(),
                comments: $('input.copyrightexplanation').val(),
                name: $('input.copyrightowner').val(),
                phonenumber: $('input.phonenumber').val(),
                email: $('input.email').val(),
                company: $('input.company').val(),
                address1: $('input.address').val(),
                address2: $('input.address2').val(),
                city: $('input.city').val(),
                province: $('input.state').val(),
                postalcode: $('input.zip').val(),
                country: $('.select.country select').val(),
                otherremarks: $('input.otherremarks').val()
            }, {
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

    $('.cn .select select').rebind('change.copydispute', function() {
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
    $('.cn .select.country select').safeHTML(markup);
};

// Add click and unclick functionality for the custom styled checkboxes
copyright.initCheckboxListeners = function() {
    'use strict';

    $('.cn_check1, .cn_check2, .cn_check3, .cn_check4').rebind('click.copydispute', function() {
        var $input = $(this).find('input');
        var $checkboxDiv = $(this).find('.checkdiv');

        // If unticked, tick the box
        if ($input.hasClass('checkboxOff')) {
            $input.removeClass('checkboxOff').addClass('checkboxOn').attr('checked', 'checked');
            $checkboxDiv.removeClass('checkboxOff').addClass('checkboxOn');
        }
        else {
            // Otherwise untick the box
            $input.removeClass('checkboxOn').addClass('checkboxOff').removeAttr('checked');
            $checkboxDiv.removeClass('checkboxOn').addClass('checkboxOff');
        }
    });
};
