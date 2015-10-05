function cn_UI() {
    $('#cn_urls .contenturl').rebind('click', function(e) {
        if ($(this).val() === 'http://') {
            $(this).select();
        }
    });
}

function init_cn() {
    $('.addurlbtn').rebind('click', function(e) {
        $('#cn_urls').safeAppend('<div class="new-affiliate-label">' +
            '<div class="new-affiliate-star"></div>@@</div>' +
            '<div class="clear"></div>' +
            '<div class="affiliate-input-block">' +
                '<input type="text" class="contenturl" value="https://">' +
            '</div>' +
            '<div class="new-affiliate-label">' +
                '<div class="new-affiliate-star"></div>@@' +
            '</div>' +
            '<div class="clear"></div>' +
            '<div class="affiliate-input-block">' +
                '<input type="text" class="copyrightwork" value="">' +
            '</div>', l[641], l[648]);
        mainScroll();
        cn_UI();
    });
    cn_UI();
    $('.step2btn').rebind('click', function(e) {
        if (!$('.select.content').hasClass('selected')) {
            msgDialog('warninga', l[135], escapeHTML(l[657]));
        }
        else if (!$('.select.type').hasClass('selected')) {
            msgDialog('warninga', l[135], escapeHTML(l[658]));
        }
        else {
            var copyrightwork = $('.copyrightwork');
            var proceed = false;
            $('.contenturl').each(function(i, e) {
                proceed = true;
                if ($(e).val() !== 'https://' && $(copyrightwork[i]).val() === '') {
                    proceed = false;
                    msgDialog('warninga', l[135], escapeHTML(l[660]));
                    return false;
                }
                if ($(e).val() === 'https://' || $(copyrightwork[i]).val() === '') {
                    proceed = false;
                    msgDialog('warninga', l[135], escapeHTML(l[659]));
                    return false;
                }
            });
            if (proceed && !$('.cn_check1 .checkinput').attr('checked')) {
                msgDialog('warninga', l[135], escapeHTML(l[665]));
            }
            else if (proceed) {
                $('.cn.step1').addClass('hidden');
                $('.cn.step2').removeClass('hidden');
            }
        }
    });
    $('.backbtn').rebind('click', function(e) {
        $('.cn.step1').removeClass('hidden');
        $('.cn.step2').addClass('hidden');
    });

    // Add click and unclick functionality for the custom styled checkboxes
    $('.cn_check1, .cn_check2, .cn_check3').rebind('click', function(event) {

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

    $('.select select').rebind('change', function(e) {
        var c = $(this).attr('class');
        if (c && c.indexOf('type') > -1 && $(this).val() === 4) {
            msgDialog('info',
                escapeHTML(l[701]),
                escapeHTML(l[700])
                    .replace('[A1]', '<a href="mailto:copyright@mega.nz" class="red">')
                    .replace('[/A1]', '</A>')
                    .replace('[A2]', '<a href="#copyright" class="red">')
                    .replace('[/A2]', '</A>'));
            $(this).val(0);
            $(this).parent().find('.affiliate-select-txt').text(l[1278]);
        }
        else if ($(this).val() !== 0) {
            $(this).parent().addClass('selected');
            $(this).parent().find('.affiliate-select-txt')
                .text($(this).find('option[value=\'' + $(this).val() + '\']').text());
        }
    });
    $('.signbtn').rebind('click', function(e) {
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
                infr_type: $('.select.content select').val(),
                takedown_type: $('.select.type select').val(),
                works: cn_works_json,
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
                province: $('input.province').val(),
                country: $('.select.country select').val()
            }, {
                callback: function() {
                    loadingDialog.hide();
                    msgDialog('info',
                        escapeHTML(l[1287]), escapeHTML(l[1288]), false,
                        function(e) {
                            document.location.hash = 'copyright';
                        });
                }
            });
        }
    });
    var markup = '<OPTION value="0"></OPTION>';
    for (var country in isocountries) {
        if (isocountries.hasOwnProperty(country)) {
            markup += '<option value="' + escapeHTML(country) + '">'
                + escapeHTML(isocountries[country]) + '</option>';
        }
    }
    $('.select.country select').safeHTML(markup);
}
