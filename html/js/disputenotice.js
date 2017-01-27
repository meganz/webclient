var copyright = copyright || {};

// Validate the email address
copyright.validateEmail = function (email) {

    var re1 = /[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*/;
    var re2 = /@([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;
    var re = new RegExp(re1.source + re2.source);
    var match = re.exec(email);

    if (match === null) {
        return false;
    }

    return true;
};

// Validate that the user has entered a link that is, or can be easily turned into, a valid MEGA link
copyright.validateUrl = function (url) {

    url = copyright.decodeURIm(url);
    handles = copyright.getHandles(url);
    return Object.keys(handles).length;
};

copyright.validatePhoneNumber = function (phoneNumber) {

    var p = /\d[^\d]*\d[^\d]*\d[^\d]*\d/;
    var match = p.exec(phoneNumber);

    if (match === null) {
        return false; // not at least 4 numbers, what is this thing?
    }
    return true;
};

/**
 * Find any valid or semi-valid MEGA link handles from the data
 * @param {String} data The data to scan for handles
 * @return {Object} hashset of handles
 */
copyright.getHandles = function(data) {

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

    (data.replace(/<\/?\w[^>]+>/g, '').replace(/\s+/g, '') + data).replace(p, function(a, id, key) {
        if (!handles[id]) {
            handles[id] = 1;
        }
    });

    return handles;
};

// Iteratively remove any %% stuff from the data
copyright.decodeURIm = function (data) {

    for (var lmt = 7; --lmt && /%[a-f\d]{2}/i.test(data);) {
        try {
            data = decodeURIComponent(data);
        }
        catch (e) {
            break;
        }
    }

    while (data.indexOf('%25') > -1) {
        data = data.replace('%25', '%', 'g');
    }

    return data.replace('%21', '!', 'g');
};


copyright.validateDisputeForm = function () {

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
        msgDialog('warninga', l[135], escapeHTML(l[662]), false, function () {
            $('input.copyrightowner').focus();
        });
        return false;
    }
    else if ($('input.phonenumber').val() === '') {
        msgDialog('warninga', l[135], escapeHTML(l[8813]), false, function () {
            $('input.phonenumber').focus();
        });
        return false;
    }
    else if (!copyright.validatePhoneNumber($('input.phonenumber').val())) {
        msgDialog('warninga', l[135], escapeHTML(l[8814]), false, function () {
            $('input.phonenumber').focus();
        });
        return false;
    }
    else if ($('input.email').val() === '') {
        msgDialog('warninga', l[135], escapeHTML(l[663]), false, function () {
            $('input.email').focus();
        });
        return false;
    }
    else if (!copyright.validateEmail($('input.email').val())) {
        msgDialog('warninga', l[135], escapeHTML(l[198]), false, function () {
            $('input.email').focus();
        });
        return false;
    }
    else if ($('input.address').val() === '') {
        msgDialog('warninga', l[135], escapeHTML(l[8815]), false, function () {
            $('input.address').focus();
        });
        return false;
    }
    else if ($('input.city').val() === '') {
        msgDialog('warninga', l[135], escapeHTML(l[1262]), false, function () {
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

copyright.init_cndispute = function () {

    if (typeof (u_attr) !== 'undefined' && typeof (u_attr.email) !== 'undefined' && u_attr.email !== '')
    {
        $('input.email').val(u_attr.email);
    }

    // The sign button needs to validate the form
    $('.signbtn').rebind('click.copydispute', function (e) {

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
                callback: function (response) {
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
                        } else if (response === -11) {
                            // Access
                            msgDialog('warninga',
                                    escapeHTML(l[135]), escapeHTML(l[8820]), false);
                            return false;
                        } else {
                            // Generic (probably args)
                            msgDialog('warninga',
                                    escapeHTML(l[135]), escapeHTML(l[47]), false);
                            return false;
                        }
                    }

                    msgDialog('info',
                            escapeHTML(l[1287]), escapeHTML(l[1288]), false,
                            function (e) {
                                loadSubPage('dispute');
                            });
                }
            });
        }
    });

    // Add click and unclick functionality for the custom styled checkboxes
    $('.cn_check1, .cn_check2, .cn_check3, .cn_check4').rebind('click.copydispute', function (event) {

        $input = $(this).find('input');
        $checkboxDiv = $(this).find('.checkdiv');

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

    $('.cn .select select').rebind('change.copydispute', function (e) {
        if ($(this).val() !== 0) {
            $(this).parent().addClass('selected');
            $(this).parent().find('.affiliate-select-txt')
                    .text($(this).find('option[value=\'' + $(this).val() + '\']').text());
        }
    });

    // Set up the country values
    var markup = '<OPTION value="0"></OPTION>';
    for (var country in isoCountries) {
        if (isoCountries.hasOwnProperty(country)) {
            markup += '<option value="' + escapeHTML(country) + '">'
                    + escapeHTML(isoCountries[country]) + '</option>';
        }
    }
    $('.cn .select.country select').safeHTML(markup);
};
