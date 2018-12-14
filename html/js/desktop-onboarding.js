(function desktopOnboarding(global) {
    'use strict';

    function goToCloud() {
        loadSubPage('fm');
        return false;
    }

    function renderPage() {
        parsepage(pages['downloadapp']);
        var syncurl = megasync.getMegaSyncUrl();
        var $wrapper = $('.bottom-page.scroll-block.onboarding-suggestions');

        $('.post-download', $wrapper).addClass('hidden');
        $('.pre-download', $wrapper).removeClass('hidden');

        $('.redirect-clouddrive-link, .redirect-clouddrive', $wrapper).rebind('click', goToCloud);

        $('.download-app', $wrapper).addClass('hidden').rebind('click', function() {
            var $oiw = $('.onboard-image-wrapper', $wrapper);

            $('.onboard-image.clouds', $oiw).removeClass('hidden');
            $('.onboard-image.logo-mega', $oiw).addClass('visible');
            $('.onboard-image.down-array', $oiw).addClass('visible');
            $('.onboard-image.desktop-inactive', $oiw).addClass('hidden');
            $('.onboard-image.desktop-active', $oiw).removeClass('hidden');

            $('.pre-download', $wrapper).addClass('hidden');
            $('.post-download', $wrapper).removeClass('hidden');

            window.location = syncurl;
            return false;
        });

        ua += ' linux ';
        if (is_mobile || ua.indexOf('linux') < 0) {
            $('.download-app', $wrapper).removeClass('hidden');

            if (is_mobile) {
                $('.desktop-redirection', $wrapper).addClass('hidden');
            }
        }
        else {
            $('.megaapp-linux', $wrapper).removeClass('hidden');

            initMegasync();
            mBroadcaster.addListener('megasync-linux-distro-selected', function(url) {
                syncurl = url;
                $('.download-app', $wrapper).removeClass('hidden');
                console.debug('megasync-linux-distro-selected', url);
            });
        }
    }

    global.desktopOnboarding = function() {
        if (is_mobile) {
            return renderPage();
        }
        megasync.megaSyncRequest({a: 'v'}).then(goToCloud).catch(renderPage);
    };

})(self);
