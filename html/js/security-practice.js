var securityPractice = {

    init: function() {
        'use strict';

        const $bountyPage = $('.bottom-page.scroll-block.corporate', 'body');
        $bountyPage[0].style.setProperty('display', 'none', 'important');

        var videos = {
            en: '#!RvY01QZB!AUN8S0wAUm4r6TXUZBnchRRkbPmad2NopXFFbuCkAjA',
            es: '#!8rI0GIrQ!taCEjwTsRYppIPslAWl4Hn3vE51MES-y_cDkEkN6O_Q'
        };
        var linkToUse = getBaseUrl() + '/embed' + (videos[lang] || videos['en']);

        if (is_extension) {
            linkToUse = getAppBaseUrl() + String(videos[lang] || videos['en']).replace('#', '#E');
        }
        else if (is_litesite) {
            linkToUse = linkToUse.replace('mega.io', 'mega.nz');
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
                $('span', '.show-hide-recovery-key-button').text(l[20029]);
            }
            else {
                $input.attr('type', 'password');
                $('span', '.show-hide-recovery-key-button').text(l[20001]);
            }
        });

        $('.save-recovery-key-button').rebind('click', u_savekey);
    },

    initBounty: function() {
        "use strict";
        const $securityPage = $('.bottom-page.scroll-block.securitypractice', 'body');
        $securityPage.remove();

        const $bountyPage = $('.bottom-page.scroll-block.corporate', 'body');
        $bountyPage.removeClass('hidden');
        this.fetchCMS($bountyPage);

        securityPractice.showSubsectionContent($bountyPage, 'bug-bounty');

        if (!is_mobile) {
            $('.bottom-page.corporate-content',$bountyPage).css('padding-top', '86px');
        }
    },

    fetchCMS: function($page) {
        "use strict";
        CMS.scope = 'corporate';
        CMS.get('corporate', (err, data) => {
            if (err) {
                console.error('Error fetching Corporate page data.');
                return false;
            }
            securityPractice.renderCorporatePages(data.object);
            $('.corporate.main-menu.item', $page).rebind('click.corporate', function() {
                loadSubPage('corporate/' + $(this).data('page'));
            });

            securityPractice.showSubsectionContent($page, 'bug-bounty');
        });
    },

    showSubsectionContent: function($page, subsection) {
        "use strict";
        $('.corporate.main-menu.item.active', $page).removeClass('active');
        $('.corporate.main-menu.item.corporate-' + subsection, $page).addClass('active');
        $('.bottom-page.full-block.active', $page).removeClass('active');
        $('.bottom-page.full-block.corporate-' + subsection, $page).addClass('active');
    },

    renderCorporatePages: function(pages) {
        "use strict";
        const $target = $('.corporate-content', this.$page);
        for (var i = 0; i < pages.length; i++) {
            $target.safeAppend(CMS.parse(pages[i].content));
        }
    },
};
