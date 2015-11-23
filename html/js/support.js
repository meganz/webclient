var support = (function() {
    var supportSubjects = {
        0: 'General Enquiry', 
        1: 'Technical Issue', 
        2: 'Payment Issue'
    };
    var minLetters = 50;
    var ns = {};
    var $textarea;
    var $button;
    var $bottom;
    var $subject;
    var $window = $(window);
    var $top;

    function resizeHandler() {
        if (!$textarea.is(':visible')) {
            return $window.unbind('resize', resizeHandler);
        }
        var height = $bottom.position().top - $top.height() - 150;
        $textarea.css('height', height);
        mainScroll();
    }
    
    function submit() {
        var opts = {
            a: 'sse', // send support email
            m: $.trim($textarea.val()), // message
            t: $subject.find('.active').data('value'),
        }
        if (opts.m.length <= minLetters) {
            msgDialog('warninga', 'Message too short', 'Please type at least a %d letters'.replace('%d', minLetters), false, function() {
                $textarea.focus();
            });
            return false;
        }

        $button.hide();
        api_req(opts, {
            callback: function(response) {
                if (response === 0) {
                    return msgDialog('warningb', 'Message sent', 'Your message has been sent');
                }

                $button.show();
                msgDialog('warningb', 'Internal error', 'Please resend your message');
            }
        });
        console.error(opts);
        return false;
    }

    ns.initUI = function() {
        var html = '';
        var first = true;
        $textarea = $('.support textarea');
        $bottom  = $('.nw-bottom-block');
        $top     = $('.about-top-block');
        $subject = $('#support-subject');
        for (var i in supportSubjects) {
            if (supportSubjects.hasOwnProperty(i)) {
                if (first) {
                    $subject.find('span').text(supportSubjects[i]);
                }
                html += '<div class="default-dropdown-item ' + ((first) ? 'active' : '') + ' " data-value="' + i + '">' + supportSubjects[i] + '</div>';
                first = false;
            }
        }
        $subject.find('.default-select-scroll').html(html);
        bindDropdownEvents($subject, 1);
        $window.rebind('resize', resizeHandler);
        $button = $('.support a').rebind('click', submit);
        resizeHandler();
    };

    return ns;
})();
