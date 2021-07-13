/**
 * Achievement Page
 * This achievement page used in both web and mobile
*/
const achievementPage = function() {
    'use strict';

    const $pageStorageBlock = $('.storage-block', '.achievement-page');
    const $cta = $('.js-achievmcta', '.achievement-page');

    if (u_attr && !isEphemeral()) {
        $pageStorageBlock.addClass('logged-in').removeClass('logged-out');
        $cta.text(l[16668]);
        let url = '/fm/dashboard';

        if (M.maf) {
            mega.achievem.bindStorageDataToView($pageStorageBlock, false);
        }
        else {
            loadingDialog.show();
            M.accountData(() => {
                loadingDialog.hide();
                if (M.maf) {
                    mega.achievem.bindStorageDataToView($pageStorageBlock, false);
                }
            });
        }

        if (is_mobile) {
            url = '/fm/account';
            mobile.achieve.init();
        }
        $cta.attr('href', url);
    }
};
