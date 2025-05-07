/**
 * Some additional functionality for the Pro pages.
 * This complements the desktop code in /html/js/propay.js
 */
mobile.propay = {

    $propayCard: null,

    /**
     * Extra initialisation code just for the mobile Pro payment page
     */
    init: function() {

        'use strict';

        var $stepTwo = $('.membership-step2');
        var $contactUsButton = $stepTwo.find('.pro-bottom-button');
        var $backButton = $stepTwo.find('.js-back-to-plans');

        // Add click handler for the contact button

        // Show the page for mobile
        $stepTwo.removeClass('hidden');

        if (mobile.settingsHelper.currentPage) {
            mobile.settingsHelper.currentPage.hide();
            mobile.settingsHelper.currentPage = $stepTwo;
        }
    },

    /**
     * Filter the payment providers for mobile as only credit cards are available for now
     * @param {Array} gatewayOptions All the payment providers
     * @returns {Array} Returns a filtered list of the payment providers
     */
    filterPaymentProviderOptions: function(gatewayOptions) {

        'use strict';

        // Enabled payment providers for mobile so far are vouchers, the credit card options and direct resellers
        const mobileEnabledGateways = new Set([
            'voucher', 'astropayVI', 'astropayMC', 'ecpVI', 'ecpMC', 'sabadellVI', 'sabadellMC',
            'directreseller', 'Stripe2', 'stripeVI', 'stripeMC', 'stripeDD', 'stripeUP', 'stripeJC', 'stripeAE',
            'stripeAP', 'stripeGP', 'stripeID',
        ]);

        // Filter out anything else
        var filteredGateways = gatewayOptions.filter(function(val) {
            if (mobileEnabledGateways.has(val.gatewayName)) {
                return true;
            }

            if (val.gatewayId === 16) {
                return val.gatewayName === 'ecp';
            }

            if (val.gatewayId === 19) {
                return val.gatewayName === 'stripe';
            }

            return false;
        });

        return filteredGateways;
    },

    createMobilePaymentCard($target, newID, plan, blockTrial) {

        'use strict';

        const $card = mega.templates.getTemplate('pr-pay-card-mob-temp', newID);

        $target.safeAppend($card.prop('outerHTML'));

        mobile.propay.$propayCard = $(`#${newID}`, $target);

        return this.updateMobilePaymentCard(plan, blockTrial);
    },

    updateMobilePaymentCard(plan, blockTrial) {

        'use strict';

        if (!mobile.propay.$propayCard) {
            console.assert(d, 'No card created yet');
            return;
        }

        const planDuration = plan[pro.UTQA_RES_INDEX_MONTHS];
        const currency = plan[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY] || plan[pro.UTQA_RES_INDEX_CURRENCY];
        const isEuro = currency === 'EUR';

        let discount = pro.propay.getDiscount();
        if (discount.m && (discount.m < planDuration)) {
            discount = false;
        }

        let discountedPrice;
        let discountPercentage;
        if (discount) {
            discountPercentage = discount.pd;
            discountedPrice = discount[isEuro ? 'edtp' : 'ldtp'];
        }

        let periodText = plan[pro.UTQA_RES_INDEX_MONTHS] === 12 ? l[932] : l[931];
        if (discount && discount.m && discount.m !== 1 && discount.m !== 12) {
            periodText = mega.icu.format(l.months_chat_history_plural, discount.m);
        }

        const planExtras = plan[pro.UTQA_RES_INDEX_EXTRAS];

        const freeTrial = !blockTrial && planExtras.trial;

        const planPrice = plan[pro.UTQA_RES_INDEX_LOCALPRICE] || plan[pro.UTQA_RES_INDEX_PRICE];
        const price = discountedPrice || planPrice;

        let transfer = plan[pro.UTQA_RES_INDEX_TRANSFER] * pro.BYTES_PER_GB;
        const storage = plan[pro.UTQA_RES_INDEX_STORAGE] * pro.BYTES_PER_GB;

        const $featureTemplate = mega.templates.getTemplate('pr-pay-card-mob-f-temp');
        const $card = mobile.propay.$propayCard.removeClass('hidden').toggleClass('discount', !!discount);
        const $discountItems = $('.discount', $card).toggleClass('hidden', !discount);

        const $mainTitle = $('.main-title', $card).toggleClass('hidden', !!freeTrial);
        const $freeTrialTitle = $('.free-trial-title', $card).toggleClass('hidden', !freeTrial);
        const $extraInfo = $('.extra-info', $card).toggleClass('hidden', !freeTrial);
        const $storage = $('.storage', $card).toggleClass('hidden', !freeTrial || !storage);
        const $transfer = $('.transfer', $card).toggleClass('hidden', !freeTrial || !transfer);
        const $cardBody = $('.card-body', $card);

        $('.price', $card).text(formatCurrency(freeTrial ? 0 : price, currency, 'narrowSymbol'));
        $('.payment-cycle', $card).text(' ' + (freeTrial ? l.today_occurrence_label : `${currency} / ${periodText}`));

        $('.feature:not(.template)', $cardBody).remove();

        const fillBodyStrings = (strings, extras) => {
            const keys = Object.keys(strings);
            const showIcons = strings.every(s => s.icon);
            for (let i = 0; i < keys.length; i++) {
                const $feature = $featureTemplate.clone().removeClass('hidden');
                const text = strings[keys[i]].getText ? strings[keys[i]].getText(extras) : strings[keys[i]].text;
                $('span', $feature).text(text);
                if (showIcons) {
                    $('i', $feature).addClass(strings[keys[i]].icon).removeClass('hidden');
                }
                $cardBody.safeAppend($feature.prop('outerHTML'));
            }
        };

        const setInformation = () => {
            if (transfer) {
                if (discount && discount.m !== 1 && discount.m !== 12) {
                    transfer = (transfer / planDuration) * discount.m;
                }
                $transfer.text(l[23790].replace('%1', bytesToSize(transfer, 3, 4))).removeClass('hidden');
            }
            if (storage) {
                $storage.text(l[23789].replace('%1', bytesToSize(storage, 3, 4))).removeClass('hidden');
            }

            if (planExtras.trialStrings && freeTrial && freeTrial.days) {
                fillBodyStrings(planExtras.trialStrings, freeTrial);
            }
            else if (planExtras.featureStrings) {
                fillBodyStrings(planExtras.featureStrings);
            }

            if (freeTrial) {
                $freeTrialTitle.text(l.free_trial_caps);
                $extraInfo.safeHTML(mega.icu.format(l.then_price_m_after_n_days, freeTrial.days)
                    .replace('%1', formatCurrency(price, currency, 'narrowSymbol'))
                    .replace('%2', currency));
            }
            else {
                $mainTitle.text(pro.getProPlanName(plan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL]));
            }

            if (discount) {
                $discountItems.filter('.old-price').text(formatCurrency(
                    discount.ltp || planPrice,
                    currency,
                    'narrowSymbol'
                ));
                $discountItems.filter('.discount-title').text(l[24670]
                    .replace('$1', formatPercentage(discountPercentage / 100)));
            }

            $('.asterisk', $card).toggleClass('hidden', isEuro);
        };

        setInformation();


        return mobile.propay.$propayCard;
    },
};
