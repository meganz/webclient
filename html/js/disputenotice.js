var copyright = copyright || {};

// Validate the email address
copyright.validateEmail = function(email) {
    var re = /[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*@([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/
    var match = re.exec(email);
    if (match === null) return false;

    return true;
}

// Validate that the user has entered a link that is, or can be easily turned into, a valid MEGA link
copyright.validateUrl = function(url) {
    url = copyright.decodeURIm(url);
    handles = copyright.getHandles(url);
    return Object.keys(handles).length;
}

copyright.validatePhoneNumber = function(phoneNumber) {
    console.log(phoneNumber);
    var p = /\d[^\d]*\d[^\d]*\d[^\d]*\d/;
    var match = p.exec(phoneNumber);
    if (match === null) return false; // not at least 4 numbers, what is this thing?
    return true;
}

// Find any valid or semi-valid MEGA link handles from the data
copyright.getHandles = function(data) {
    var handles = {};
    var p = /.(?:F?!|\w+\=)([\w-]{8})(?:!([\w-]+))?\b/gi;

    (data.replace(/<\/?\w[^>]+>/g,'').replace(/\s+/g,'')+data).replace(p,function(a,id,key)
    {
        if (!handles[id]) handles[id] = 1;
    });

    return handles;
}

// Iteratively remove any %% stuff from the data
copyright.decodeURIm = function(data) {
    for (var lmt = 7 ; --lmt && /%[a-f\d]{2}/i.test(data) ; )
    {
        try {
            data = decodeURIComponent(data);
        } catch(e) {
            break;
        }
    }

    while (~data.indexOf('%25')) {
        data = data.replace('%25','%','g');
    }

    return data.replace('%21','!','g');
}


copyright.validateDisputeForm = function() {
    var copyrightwork = $('.copyrightwork');
    var explanation = $('.copyrightexplanation');
    var proceed = true;
    $('.contenturl').each(function(i, e) {
        proceed = true;
        if ($(e).val() !== '' && $(copyrightwork[i]).val() !== '' && $(explanation[i]).val() === '') {
            proceed = false;
            msgDialog('warninga', l[135], escapeHTML("Please provide commentary sufficient to explain the mistake or misidentification."));
            return false;
        }
        if ($(e).val() !== '' && $(copyrightwork[i]).val() === '') {
            proceed = false;
            msgDialog('warninga', l[135], escapeHTML("Please provide a description of the content that has been taken down."));
            return false;
        }
        if ($(e).val() === '' || $(copyrightwork[i]).val() === '') {
            proceed = false;
            msgDialog('warninga', l[135], escapeHTML("Please supply the URL of the content that has been taken down."));
            return false;
        } else {
            if (!copyright.validateUrl($(e).val())) {
                proceed = false;
                msgDialog('warninga', l[135], escapeHTML("Please enter a valid MEGA link to the content that has been taken down."));
                return false;
            }
        }
    });
    if (!proceed) return false;

    if ($('input.copyrightowner').val() === '') {
        msgDialog('warninga', l[135], escapeHTML("Please supply your full name."), false, function() {
            $('input.copyrightowner').focus();
        });
        return false;
    }
    else if ($('input.phonenumber').val() === '') {
        msgDialog('warninga', l[135], escapeHTML("Please supply your phone number."), false, function() {
            $('input.phonenumber').focus();
        });
        return false;
    } else if (!copyright.validatePhoneNumber($('input.phonenumber').val())) {
        msgDialog('warninga', l[135], escapeHTML("Please supply a valid phone number."), false, function() {
            $('input.phonenumber').focus();
        });
        return false;
    }
    else if ($('input.email').val() === '') {
        msgDialog('warninga', l[135], escapeHTML(l[663]), false, function() {
            $('input.email').focus();
        });
        return false;
    } else if (!copyright.validateEmail($('input.email').val())) {
        msgDialog('warninga', l[135], escapeHTML(l[198]), false, function() {
            $('input.email').focus();
        });
        return false;
    }
    else if ($('input.address').val() === '') {
        msgDialog('warninga', l[135], escapeHTML("Please supply your address."), false, function() {
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
        msgDialog('warninga', l[135], escapeHTML("Please acknowledge that you will accept service of proceedings in New Zealand or in the jurisdiction where my address in this counter-notice is located, from the person who provided MEGA with the original copyright takedown notice or an agent of such person."));
        return false;
    }
    else if (!$('.cn_check2 .checkinput').attr('checked')) {
        msgDialog('warninga', l[135], escapeHTML("Please acknowledge that you have a good faith belief that the material was removed or disabled as a result of a mistake or misidentification of the material to be removed or disabled."));
        return false;
    }

    return true;
}

copyright.init_cndispute = function() {
    
    if (typeof(u_attr) !== 'undefined' && typeof(u_attr.email) !== 'undefined' && u_attr.email !== '')
    {
        $('input.email').val(u_attr.email);
    }

    // The sign button needs to validate the form
    $('.signbtn').rebind('click', function(e) {      
        
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
                province:  $('input.state').val(),
                postalcode: $('input.zip').val(),
                country: $('.select.country select').val(),
                otherremarks: $('input.otherremarks').val()
            }, {
                callback: function(response) {
                    loadingDialog.hide();

                    if (!isNaN(parseFloat(response)) && isFinite(response)) {
                        // Its a number, must be error code of some kind
                        if (response == -9) {
                            // ENOENT error
                            msgDialog('warninga',
                                escapeHTML(l[135]), escapeHTML("The link you provided is either invalid or is not the subject of a takedown notice."), false);
                            return false;
                        } 
                        if (response == -12) {
                            // EEXIST error, they have already made a dispute for this link
                            msgDialog('warninga',
                                escapeHTML(l[135]), escapeHTML("You have already made a counter-notification against this link."), false);
                            return false;
                        } else if (response == -11) {
                            // Access
                            msgDialog('warninga',
                                escapeHTML(l[135]), escapeHTML("The MEGA account provided did not match the owner of the link."), false);
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
                        function(e) {
                            document.location.hash = 'dispute';
                        });
                }
            });
        }        
    });
   
    // Add click and unclick functionality for the custom styled checkboxes
    $('.cn_check1, .cn_check2, .cn_check3, .cn_check4').rebind('click', function(event) {

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
        if ($(this).val() !== 0) {
            $(this).parent().addClass('selected');
            $(this).parent().find('.affiliate-select-txt')
                .text($(this).find('option[value=\'' + $(this).val() + '\']').text());
        }
    });
   
    // Set up the country values
    var markup = '<OPTION value="0"></OPTION>';
    for (var country in isocountries) {
        if (isocountries.hasOwnProperty(country)) {
            markup += '<option value="' + escapeHTML(country) + '">'
                + escapeHTML(isocountries[country]) + '</option>';
        }
    }
    $('.select.country select').safeHTML(markup);
}

