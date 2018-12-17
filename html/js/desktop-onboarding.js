(function desktopOnboarding(global) {
    'use strict';

    function goToCloud() {
        loadSubPage(sessionStorage.onDesktopOnboardingRedirectTo || 'fm');
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
            $('.onboard-image.down-arrow', $oiw).addClass('visible');
            $('.onboard-image.desktop-inactive', $oiw).addClass('hidden');
            $('.onboard-image.desktop-active', $oiw).removeClass('hidden');
            $('.default-green-button.download-app', $oiw).addClass('hidden');

            //Hide the download buttons and MEGAcmd dropdown
            $('.default-green-button.download-app', $wrapper).addClass('hidden');
            $('.megaapp-linux.cmd', $wrapper).addClass('hidden');

            //Swap between pre/post download body text
            $('.pre-download', $wrapper).addClass('hidden');
            $('.post-download', $wrapper).removeClass('hidden');

            //Swap between text button and green button for cloud drive redirection
            $('.text-button.redirect-clouddrive-link', $wrapper).addClass('hidden');
            $('.default-green-button.redirect-clouddrive', $wrapper).removeClass('hidden');
            $('.bottom-bar.desktop-redirection', $wrapper).addClass('border');

            //Resize the height of the container to align items
            $('.bottom-page.horizontal-centered-bl', $wrapper).addClass('resize');

            window.location = syncurl;
            return false;
        });

        if (is_mobile || ua.indexOf('linux') < 0) {
            $('.download-app', $wrapper).removeClass('hidden');
            $('.bottom-page.horizontal-centered-bl', $wrapper).addClass('resize');

            if (is_mobile) {
                syncurl = mobile.downloadOverlay.getStoreLink();
                $('.bottom-page.onboard-image-wrapper', $wrapper).addClass('hidden');
            }
        }
        else {
            $('.megaapp-linux', $wrapper).removeClass('hidden');
            $('.bottom-page.horizontal-centered-bl', $wrapper).removeClass('resize');

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
