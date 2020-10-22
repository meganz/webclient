(function desktopOnboarding(global) {
    'use strict';

    function goToCloud() {
        loadSubPage(sessionStorage.onDesktopOnboardingRedirectTo || 'fm');
        delete sessionStorage.voucherData;
        return false;
    }

    function renderPage() {
        var syncurl = megasync.getMegaSyncUrl();
        var $wrapper = $('.bottom-page.scroll-block.onboarding-suggestions');

        $('.post-download', $wrapper).addClass('hidden');
        $('.pre-download', $wrapper).removeClass('hidden invisible');
        $('.redeemed-v', $wrapper).addClass('hidden');

        $('.top-head .left.individual').addClass('hidden');

        // Check if the user came from a voucher redemption.
        if (sessionStorage.voucherData) {
            var $voucherBlock = $('.promo-voucher-section', $wrapper).removeClass('hidden');
            var vd = JSON.parse(sessionStorage.voucherData);
            var storageValue;
            var bandwidthValue;

            // Change texts accordingly.
            $('.top-dark-info.' + (is_mobile ? 'mobile-download' : 'pre-download')).text(l[20415]);
            $('.top-description.' + (is_mobile ? 'mobile-download' : 'pre-download')).safeHTML(l[19512]);

            var $promoCard = $('.promo-voucher-card', $voucherBlock);

            if (vd.businessmonths) {
                $('.plan-name', $wrapper).text(l[19530]);
                $('.plan-icon', $voucherBlock).removeClass('pro1 pro2 pro3 pro4').addClass('business');

                $promoCard.removeClass('red-block yellow-block')
                    .addClass('blue-block');

                // Show PRO plan details
                $('.storage-amount', $voucherBlock).safeHTML(l[24097]);
                $('.transfer-amount', $voucherBlock).safeHTML(l[24098]);
            }
            else {

                storageValue = bytesToSize(vd.storage * 0x40000000, 0);
                bandwidthValue = bytesToSize(vd.bandwidth * 0x40000000, 0);

                $('.plan-name', $wrapper).text(pro.getProPlanName(vd.proNum));
                $('.plan-icon', $voucherBlock).removeClass('pro1 pro2 pro3 pro4 business')
                    .addClass('pro' + vd.proNum);

                if (vd.proNum === 4) {
                    $promoCard.removeClass('red-block blue-block')
                        .addClass('yellow-block');
                }
                else {
                    $promoCard.removeClass('yellow-block blue-block')
                        .addClass('red-block');
                }

                // Show PRO plan details
                $('.storage-amount', $voucherBlock)
                    .safeHTML(l[23789].replace('%1', '<span>' + storageValue + '</span>'));
                $('.transfer-amount', $voucherBlock)
                    .safeHTML(l[23790].replace('%1', '<span>' + bandwidthValue + '</span>'));
            }

            if (!is_mobile) {
                $('.voucher-message', $wrapper).text(l[20133]);
            }

            $('.redeemed-v', $wrapper).removeClass('hidden');
        }

        $('.redirect-clouddrive', $wrapper).rebind('click', goToCloud);
        $('.redirect-clouddrive-link', $wrapper).rebind('click', function() {
            eventlog(99717);
            goToCloud();
        });

        $('.download-app', $wrapper).addClass('hidden').rebind('click', function() {
            var $oiw = $('.onboard-image-wrapper', $wrapper);

            $('.onboard-image.logo-mega', $oiw).addClass('visible');
            $('.onboard-image.down-arrow', $oiw).addClass('visible');
            $('.onboard-image.desktop-inactive', $oiw).addClass('hidden');
            $('.onboard-image.desktop-active', $oiw).removeClass('hidden');
            $('.onboard-image.folder-select', $oiw).addClass('hidden');
            $('.onboard-image.transfer-progress', $oiw).addClass('hidden');
            $('.onboard-image.transfer-speed', $oiw).addClass('hidden');

            // Hide the download buttons and MEGAcmd dropdown
            $('.default-green-button.download-app', $wrapper).addClass('hidden');
            $('.megaapp-linux.cmd', $wrapper).addClass('hidden');

            // Swap between pre/post download body text
            $('.pre-download', $wrapper).addClass('hidden');
            $('.post-download', $wrapper).removeClass('hidden');

            // Swap between text button and green button for cloud drive redirection
            $('.text-button.redirect-clouddrive-link', $wrapper).addClass('hidden');
            $('.default-green-button.redirect-clouddrive', $wrapper).removeClass('hidden');

            // Resize the height of the container to align items
            $('.bottom-page.horizontal-centered-bl', $wrapper).addClass('resize');

            eventlog(99716);
            setTimeout(function() {
                window.location = syncurl;
            }, 950);
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

        // Change the download text
        if (ua.indexOf('linux') > -1) {
            $('.os-mac-windows-toggle').text('Windows');
            $('.os-linux-toggle').text('MacOS');
        }
        else if (ua.indexOf('mac') > -1) {
            $('.os-mac-windows-toggle').text('Windows');
            $('.os-linux-toggle').text('Linux');
        }
        else {
            // Otherwise if on Windows
            $('.os-mac-windows-toggle').text('Linux');
            $('.os-linux-toggle').text('MacOS');
        }
    }

    global.desktopOnboarding = function() {
        if (is_mobile || sessionStorage.voucherData) {
            return renderPage();
        }
        megasync.megaSyncRequest({a: 'v'}).then(goToCloud).catch(renderPage);
    };

})(self);
