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
    var bottomHeight;
    var $subject;
    var $window = $(window);
    var headerHeight;

    function resizeHandler() {
        if (!$textarea.is(':visible')) {
            return $window.unbind('resize', resizeHandler);
        }

        var height = Math.max(150, $window.height() - bottomHeight - headerHeight - 200);
        $textarea.css('height', height);
        mainScroll();
    }
    
    function submit() {
        var opts = {
            a: 'sse', // send support email
            m: $.trim($textarea.val()), // message
            t: $subject.find('.active').data('value'),
        };
        if (opts.m.length <= minLetters) {
            msgDialog('warninga',
                l[7884], // Message too short
                l[7885].replace('%d', minLetters), // Your message needs to be at least %d letters long.
                false, function() {
                    $textarea.focus();
                });
            return false;
        }

        $button.hide();
        resizeHandler();
        api_req(opts, {
            callback: function(response) {
                if (response === 0) {
                    return msgDialog('warningb',
                        l[7882],  // Message sent
                        l[7881]   // Thank you! One of our support consultants...
                    );
                }

                $button.show();
                resizeHandler();
                msgDialog(
                    'warningb',
                    l[16], // Internal error
                    l[7883] // There was an error trying to send your message. Please try to resend it.
                );
            }
        });
        return false;
    }

    ns.initUI = function() {
        var html = '';
        var first = true;
        if (checkUserLogin()) {
            return;
        }
        $textarea = $('.support textarea');
        bottomHeight = $('.nw-bottom-block').height();
        headerHeight = $('.about-top-block').height();
        $subject = $('#support-subject');
        for (var i in supportSubjects) {
            if (supportSubjects.hasOwnProperty(i)) {
                if (first) {
                    $subject.find('span').text(supportSubjects[i]);
                }
                html += '<div class="default-dropdown-item ' + ((first) ? 'active' : '')
                    + ' " data-value="' + i + '">' + supportSubjects[i] + '</div>';
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
