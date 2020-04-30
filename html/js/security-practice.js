var securityPractice = {

    init: function() {
        'use strict';

        var videos = {
            en: '#!RvY01QZB!AUN8S0wAUm4r6TXUZBnchRRkbPmad2NopXFFbuCkAjA',
            es: '#!8rI0GIrQ!taCEjwTsRYppIPslAWl4Hn3vE51MES-y_cDkEkN6O_Q'
        };
        var linkToUse = getBaseUrl() + '/embed' + (videos[lang] || videos['en']);

        if (is_extension) {
            linkToUse = getAppBaseUrl() + String(videos[lang] || videos['en']).replace('#', '#E');
        }

        onIdle(function() {
            var iframe = mCreateElement('iframe', {
                type: 'content',
                height: '100%',
                width: '100%',
                frameborder: 0,
                src: linkToUse,
                'class': 'security-video-container'
            });

            // eslint-disable-next-line local-rules/jquery-replacements
            $('.security-page-video-block').removeAttr('style').append(iframe);
        });

        // If user is logged into MEGA, show their recovery key on the security page
        if (u_handle) {
            $('.recover-paste-block').add();
            $('.business-text.recovery-key-info').addClass('hidden');

            if (is_mobile) {
                $('.business-text.recovery-key-info').removeClass('hidden');
            }

            // Convert the Master/Recovery Key to Base64
            var recoveryKeyBase64 = a32_to_base64(u_k);

            // Put the key in the text field
            $('#security-page-backup-key').val(recoveryKeyBase64);
        }
        // Else hide the recovery key block and display the link to /backup
        else {
            $('.recover-paste-block').remove();
            $('.business-text.recovery-key-info').removeClass('hidden');
        }

        $('.show-hide-recovery-key-button').rebind('click', function() {

            var $input = $('#security-page-backup-key');
            if ($input.attr('type') === 'password') {
                $input.attr('type', 'text');
                $('.show-hide-recovery-key-button').find('span:first-of-type')
                    .fadeToggle("fast", "linear", function() {
                        $('.show-hide-recovery-key-button').find('span:last-of-type').fadeToggle("fast", "linear");
                    });
            }
            else {
                $input.attr('type', 'password');
                $('.show-hide-recovery-key-button').find('span:last-of-type')
                    .fadeToggle("fast", "linear", function() {
                        $('.show-hide-recovery-key-button').find('span:first-of-type').fadeToggle("fast", "linear");
                    });
            }
        });

        $('.save-recovery-key-button').rebind('click', u_savekey);
    }
};
