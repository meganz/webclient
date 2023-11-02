var copyright = copyright || {};

copyright.updateUI = function() {
    'use strict';

    $('#cn_urls .contenturl, #dn_urls .contenturl', '.cn-form').rebind('click', function() {
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
    return isValidEmail(email);
};

copyright.ourDomains = {'mega.co.nz': 1, 'mega.nz': 1, 'mega.io': 1};

/**
 * Validate that the user has entered a link that is, or can be easily turned into, a valid MEGA link
 * @param {String} url The url to validate as a mega public link
 * @return {Array} The link type at idx 0, handle found as idx 1, and sub-node as idx 2 if any.
 */
copyright.validateUrl = function(url) {
    'use strict';
    url = tryCatch(() => new URL(mURIDecode(url).trim()), false)();
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

/**
 * Check if the entered URL is a folder link without a subfile link.
 * @param url
 * @return {Boolean} If is folder without subfile link.
 */
copyright.isFolderWithoutSubHandle = function(url) {
    'use strict';
    url = this.isFolderLink(url);
    return url && !url[2];
};

/**
 * Check if a URL is a folder link.
 * @param url
 * @return {Boolean}
 */
copyright.isFolderLink = function(url) {
    'use strict';
    url = this.validateUrl(url) || !1;
    return url[0] === 'folder' && url;
};

/**
 * Store the complainant details so they don't have to type them in next time
 * Puts them into localStorage.copyrightOwnerDetails
 */
copyright.saveCopyrightOwnerValues = function() {
    'use strict';
    var details = {
        owner: $('input.copyrightowner', '.cn-form').val(),
        jobtitle: $('input.jobtitle', '.cn-form').val(),
        email: $('input.email', '.cn-form').val(),
        fax: $('input.fax', '.cn-form').val(),
        city: $('input.city', '.cn-form').val(),
        postalcode: $('input.zip', '.cn-form').val(),
        name: $('input.agent', '.cn-form').val(),
        company: $('input.company', '.cn-form').val(),
        phone: $('input.phone', '.cn-form').val(),
        address: $('input.address', '.cn-form').val(),
        province: $('input.state', '.cn-form').val(),
        country: $('.select.country select', '.cn-form').val()
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
        $('input.copyrightowner', '.cn-form').val(details.owner);
        $('input.jobtitle', '.cn-form').val(details.jobtitle);
        $('input.email', '.cn-form').val(details.email);
        $('input.fax', '.cn-form').val(details.fax);
        $('input.city', '.cn-form').val(details.city);
        $('input.zip', '.cn-form').val(details.postalcode);
        $('input.agent', '.cn-form').val(details.name);
        $('input.company', '.cn-form').val(details.company);
        $('input.phone', '.cn-form').val(details.phone);
        $('input.address', '.cn-form').val(details.address);
        $('input.state', '.cn-form').val(details.province);
        $('.select.country select', '.cn-form').val(details.country).change();
    }
};

copyright.step2Submit = function() {
    'use strict';
    if (!$('.select.content', '.cn-form').hasClass('selected')) {
        msgDialog('warninga', l[135], escapeHTML(l[657]));
    }
    else if ($('.select.type', '.cn-form').hasClass('selected')) {
        var invalidWords = ['asd', 'asdf', 'copyright'];
        var $copyrightwork = $('.copyrightwork', '.cn-form');
        var proceed = false;
        var takedownType = $('.select.type select', '.cn-form').val();
        var doStep2Submit = function() {
            copyright.step2Submit();
        };
        var $contentURL = $('.contenturl', '.cn-form');
        var e;
        for (var i = 0; i < $contentURL.length; i++) {
            e = $contentURL[i];
            var cVal = String($($copyrightwork[i]).val()).trim();
            var urls = String($(e).val()).split(/\n/);
            urls = urls.map(String.trim).filter(String);

            proceed = urls.length > 0;
            if (!proceed) {
                msgDialog('warninga', l[135], escapeHTML(l[659]));
                copyright.markInputWrong(e);
                return false;
            }

            for (var k = 0; k < urls.length; k++) {
                var eVal = urls[k];
                if (eVal !== ''  && cVal === '' || invalidWords.indexOf(cVal.toLowerCase()) !== -1) {
                    proceed = false;
                    msgDialog('warninga', l[135], escapeHTML(l[660]));
                    copyright.markInputWrong($copyrightwork[i]);
                    return false;
                }
                if (eVal === '' || cVal === '') {
                    proceed = false;
                    msgDialog('warninga', l[135], escapeHTML(l[659]));
                    copyright.markInputWrong(eVal ? $copyrightwork[i] : e);
                    return false;
                }

                if (!copyright.validateUrl(eVal)) {
                    proceed = false;
                    msgDialog('warninga', l[135], escapeHTML(l[7686]));
                    copyright.markInputWrong(e);
                    return false;
                }

                if (copyright.validateUrl(cVal)) {
                    proceed = false;
                    msgDialog('warninga', l[135], escapeHTML(l[9056]));
                    copyright.markInputWrong($copyrightwork[i]);
                    return false;
                }

                if (takedownType === "1" && copyright.isFolderLink(eVal)
                    && !copyright.isFolderWithoutSubHandle(eVal)) {
                    proceed = false;
                    msgDialog('warninga', l[135], l[19804]);
                    return false;
                }

                if ((takedownType === "2" || takedownType === "3")
                    && localStorage.tdFolderlinkWarning !== "1"
                    && copyright.isFolderWithoutSubHandle(eVal)) {
                    localStorage.tdFolderlinkWarning = 1;
                    proceed = false;
                    msgDialog('info', l[621], escapeHTML(l[19802]), null, doStep2Submit);
                    return false;
                }
            }
            $(e).removeClass("red");
        }

        if (proceed && !$('.cn_check1 .checkinput', '.cn-form').prop('checked')) {
            msgDialog('warninga', l[135], escapeHTML(l[665]));
        }
        else if (proceed) {
            $('.cn.step1', '.cn-form').addClass('hidden');
            $('.cn.step2', '.cn-form').removeClass('hidden');
            document.getElementsByClassName('cn step2')[0].scrollIntoView();
            // Reload values from local storage if the user has previously been here
            copyright.loadCopyrightOwnerValues();
        }
    }
    else {
        msgDialog('warninga', l[135], escapeHTML(l[658]));
    }
};

/**
 * Initialises the copyright form page, binding the events the form requires
 */
copyright.init_cn = function() {
    'use strict';

    if (is_mobile) {
        $('.cn.main-pad-block').removeClass('hidden');
        $('.js-back-to-copyright', '.cn.header').rebind('click', () => {
            loadSubPage('copyright');
        });
    }

    $('.addurlbtn', '.cn-form').rebind('click', () => {
        $('#cn_urls', '.cn-form').safeAppend('<div class="new-affiliate-label">' +
            '<div class="new-affiliate-star"></div>@@</div>' +
            '<div class="clear"></div>' +
            '<div class="affiliate-input-block dynamic-height">' +
                '<textarea class="contenturl" rows="3"></textarea>' +
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
    $('.step2btn', '.cn-form').rebind('click', () => {
        copyright.step2Submit();
    });

    $('.backbtn', '.cn-form').rebind('click', () => {
        $('.cn.step1', '.cn-form').removeClass('hidden');
        $('.cn.step2', '.cn-form').addClass('hidden');
    });

    copyright.initCheckboxListeners();

    $('.select select', '.cn-form').rebind('change.initcn', function() {
        var c = $(this).attr('class');
        if (c && c.indexOf('type') > -1 && $(this).val() === 4) {
            msgDialog(
                'info',
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
    $('.signbtn', '.cn-form').rebind('click', () => {
        if ($('input.copyrightowner', '.cn-form').val() === '') {
            msgDialog('warninga', l[135], escapeHTML(l[661]), false, function() {
                $('input.copyrightowner', '.cn-form').trigger("focus");
            });
        }
        else if ($('input.agent', '.cn-form').val() === '') {
            msgDialog('warninga', l[135], escapeHTML(l[662]), false, function() {
                $('input.agent', '.cn-form').trigger("focus");
            });
        }
        else if ($('input.email', '.cn-form').val() === '') {
            msgDialog('warninga', l[135], escapeHTML(l[663]), false, function() {
                $('input.email', '.cn-form').trigger("focus");
            });
        }
        else if (!copyright.validateEmail($('input.email', '.cn-form').val())) {
            msgDialog('warninga', l[135], escapeHTML(l[198]), false, function() {
                $('input.email', '.cn-form').trigger("focus");
            });
        }
        else if ($('input.city', '.cn-form').val() === '') {
            msgDialog('warninga', l[135], escapeHTML(l[1262]), false, function() {
                $('input.city', '.cn-form').trigger("focus");
            });
        }
        else if (!$('.select.country', '.cn-form').hasClass('selected')) {
            msgDialog('warninga', l[135], escapeHTML(l[568]));
        }
        else if (!$('.cn_check2 .checkinput', '.cn-form').prop('checked')) {
            msgDialog('warninga', l[135], escapeHTML(l[666]));
        }
        else if ($('.cn_check3 .checkinput', '.cn-form').prop('checked')) {
            // Save the entered values into local storage so the user doesn't have to re-enter them next time
            copyright.saveCopyrightOwnerValues();

            var cn_post_urls = [];
            var cn_post_works = [];

            var $copyrightwork = $('.copyrightwork', '.cn-form');
            var $contentURL = $('.contenturl', '.cn-form');
            for (var i = 0; i < $contentURL.length; i++) {
                var e = $contentURL[i];
                var cVal = String($($copyrightwork[i]).val()).trim();
                var urls = String($(e).val() || $(e).html()).split(/\n/);
                urls = urls.map(String.trim).filter((url) => {
                    return url !== "";
                });
                for (var k = 0; k < urls.length; k++) {
                    cn_post_urls.push(urls[k]);
                    cn_post_works.push(cVal);
                }
            }
            var cn_works_json = JSON.stringify([cn_post_urls, cn_post_works]);
            loadingDialog.show();
            api_req({
                a: 'cn',
                works: cn_works_json,
                infr_type: $('.select.content select', '.cn-form').val(),
                takedown_type: $('.select.type select', '.cn-form').val(),
                jobtitle: $('input.jobtitle', '.cn-form').val(),
                owner: $('input.copyrightowner', '.cn-form').val(),
                email: $('input.email', '.cn-form').val(),
                fax: $('input.fax', '.cn-form').val(),
                postalcode: $('input.zip', '.cn-form').val(),
                city: $('input.city', '.cn-form').val(),
                company: $('input.company', '.cn-form').val(),
                name: $('input.agent', '.cn-form').val(),
                phone: $('input.phone', '.cn-form').val(),
                address: $('input.address', '.cn-form').val(),
                province: $('input.state', '.cn-form').val(),
                country: $('.select.country select', '.cn-form').val()
            }, {
                callback: function() {
                    loadingDialog.hide();
                    msgDialog(
                        'info',
                        escapeHTML(l[1287]),
                        escapeHTML(l[1288]),
                        false,
                        function() {
                            loadSubPage('copyright');
                        });
                }
            });
        }
        else {
            msgDialog('warninga', l[135], escapeHTML(l[667]));
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
    $('.select.country select', '.cn-form').safeHTML(markup);
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

