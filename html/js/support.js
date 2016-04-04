var support = (function() {

    var minLetters = 10;
    var ns = {};
    var $textarea;
    var $button;    
    var $subject;
    var $window = $(window);
    var headerHeight;
    var bottomHeight;

    function resizeHandler() {
        if (!$textarea.is(':visible')) {
            return $window.unbind('resize.support-textarea', resizeHandler);
        }

        var height = Math.max(150, $window.height() - bottomHeight - headerHeight - 200);
        $textarea.css('height', height);
        mainScroll();
    }
    
    function submit() {
        var opts = {
            a: 'sse', // send support email
            m: $.trim($textarea.val()), // message
            t: $subject.find('.active').data('value') // type
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
                        l[7882], // Message sent
                        l[7881], // Thank you! One of our support consultants...
                        '',
                        function() {
                            document.location.href = '#fm/' + M.RootID;
                        }
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
        
        var supportSubjects = {
            0: l[8527],     // General Inquiry
            1: l[8528],     // Technical Issue
            2: l[8529],     // Payment Issue
            3: l[8638],     // Forgotten password
            4: l[8639],     // Transfer Speed Issue
            5: l[8640],     // Contact/Sharing Issue
            6: l[8641],     // MEGAsync Issue
            7: l[8642],     // Missing / Invisible Data
        };
        
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
        
        $subject.find('.default-select-scroll').safeHTML(html);
        bindDropdownEvents($subject, 1);
        $window.rebind('resize.support-textarea', resizeHandler);
        $button = $('.support a').rebind('click', submit);
        resizeHandler();
    };

    return ns;
})();
