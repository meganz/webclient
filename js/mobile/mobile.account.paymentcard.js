/**
 * Functionality for the mobile payment card section
 */

mobile.account.paymentCard = new function() {
    'use strict';
    let $page;

    const validateCardResponse = (res) => {
        return res && (res.gw === (addressDialog || {}).gatewayId_stripe || 19) && res.brand && res.last4
            && res.exp_month && res.exp_year;
    };

    const render = (cardInfo) => {

        if (cardInfo) {

            if (cardInfo.brand === 'visa') {
                $('.card-info.payment-card', $page).addClass('visa').removeClass('mc');
                $('.payment-card-icon i', $page)
                    .removeClass('sprite-fm-uni icon-mastercard-border');
            }

            else if (cardInfo.brand === 'mastercard') {

                $('.card-info.payment-card', $page).addClass('mc').removeClass('visa');
                $('.payment-card-icon i', $page).addClass('sprite-fm-uni icon-mastercard-border');

            }

            else {
                $('.card-info.payment-card', $page).removeClass('visa mc');
            }

            $('.payment-card-nb .payment-card-digits', $page).text(cardInfo.last4);
            $('.payment-card-expiry .payment-card-expiry-val', $page)
                .text(`${String(cardInfo.exp_month).padStart(2, '0')}/${String(cardInfo.exp_year).substr(-2)}`);

            $('.payment-card-bottom a.payment-card-edit', $page).rebind('tap', () => {

                loadingDialog.show();

                api_req({ a: 'gw19_ccc' }, {
                    callback: (res) => {
                        loadingDialog.hide();

                        if ($.isNumeric(res)) {
                            msgDialog(
                                'warninga',
                                '',
                                l.edit_card_error.replace('%1', res),
                                l.edit_card_error_des,
                                loadSubPage.bind(null, 'fm/account')
                            );
                        }
                        else if (typeof res === 'string') {
                            addressDialog.processUtcResult(
                                {
                                    EUR: res,
                                    edit: true
                                },
                                true
                            );
                        }
                    }
                });
            });

            // Initialise back button to go back to My Account page
            mobile.initBackButton($page, 'fm/account/');

            // Initialise the top menu
            topmenuUI();

            // Show the account page content
            $page.removeClass('hidden');
        }
        else {
            loadSubPage('fm/account');
        }
    };

    this.init = function() {
        // the check of existence of needed data goes here
        // ..
        // ..

        $page = $('.mobile.payment-card-page');

        loadingDialog.show();

        api_req({ a: 'cci' }, {
            callback: (res) => {

                loadingDialog.hide();
                if (typeof res === 'object' && validateCardResponse(res)) {
                    return render(res);
                }

                $page.addClass('hidden');

                msgDialog('warninga', '', l.card_info_error, l.card_info_error_desc, () => {
                    return loadSubPage('fm/account');
                });

            }
        });
    };
};
