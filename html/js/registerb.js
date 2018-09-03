/** a class contains the code-behind of business register "registerb" page */
function BusinessRegister() {
    this.cacheTimeout = 9e5; // 15 min - default threshold to update payment gateway list
    if (mega) {
        if (!mega.cachedBusinessGateways) {
            mega.cachedBusinessGateways = Object.create(null);
        }
    }
}


/** a function to rest business registration page to its initial state*/
BusinessRegister.prototype.initPage = function () {
    "use strict";

    var $pageContainer = $('.bus-reg-body');

    $pageContainer.find('#business-nbusrs').val('');
    $pageContainer.find('#business-cname').val('');
    $pageContainer.find('#business-tel').val('');
    $pageContainer.find('#business-fname').val('');
    $pageContainer.find('#business-lname').val('');
    $pageContainer.find('#business-email').val('');
    $pageContainer.find('#business-pass').val('');
    $pageContainer.find('#business-rpass').val('');
    $pageContainer.find('.bus-reg-radio-block .bus-reg-radio').removeClass('checkOn').addClass('checkOff');
    $pageContainer.find('.bus-reg-agreement .bus-reg-checkbox').removeClass('checkOn');
    $pageContainer.find('.bus-reg-input').removeClass('error');

    // hiding everything to get ready first
    $pageContainer.addClass('hidden');  // hiding the main sign-up part
    $('.bus-confirm-body.confirm').addClass('hidden'); // hiding confirmation part
    $('.bus-confirm-body.verfication').addClass('hidden'); // hiding verification part

    // function to show first step of registration
    var unhidePage = function () {
        $pageContainer.removeClass('hidden');  // viewing the main sign-up part
        $('.bus-confirm-body.confirm').addClass('hidden'); // hiding confirmation part
        $('.bus-confirm-body.verfication').addClass('hidden'); // hiding verification part
    };

    var fillPaymentGateways = function (st, list) {
        "use strict";

        var failureExit = function () {
            msgDialog('warninga', '', l[19342], '', function () {
                loadSubPage('start');
            });
        };

        if (!st) { // failed result from API
            return failureExit();
        }

        // clear the payment block
        $pageContainer.find('.bus-reg-radio-block').empty();

        var $paymentBlock = $('.bus-reg-radio-block', $pageContainer);

        var radioHtml = '<div class="bus-reg-radio payment-[x] checkOff"></div>';
        var textHtml = '<div class="provider">[x]</div>';
        var iconHtml = '<div class="provider-icon [x]"></div>';

        var foundOnePaymentGatewayAtLeast = false;

        for (var pay in list) {
            if (pay.supportsBusinessPlans) {
                foundOnePaymentGatewayAtLeast = true;
                var payRadio = radioHtml.replace('[x]', pay.gatewayName);
                var payText = textHtml.replace('[x]', pay.displayName);
                var payIcon = iconHtml.replace('[x]', pay.gatewayName);
                $paymentBlock.append(payRadio + payText + payIcon);
            }
        }
        if (!foundOnePaymentGatewayAtLeast) {
            return failureExit();
        }
        // setting the first payment provider as chosen
        $pageContainer.find('.bus-reg-radio-block .bus-reg-radio')[0].removeClass('checkOff')
            .addClass('checkOn');

        // view the page
        unhidePage();
    };


    $('.bus-reg-agreement .bus-reg-checkbox').off('click.suba').on('click.suba',
        function businessRegisterationCheckboxClick() {
            var $me = $(this);
            if ($me.hasClass('checkOn')) {
                $me.removeClass('checkOn').addClass('checkOff');
            }
            else {
                $me.removeClass('checkOff').addClass('checkOn');
            }
        });

    return unhidePage(); // DELETE ME

    M.require('businessAcc_js').done(function afterLoadingBusinessClass() {
        var business = new BusinessAccount();

        business.getListOfPaymentGateways(false).always(fillPaymentGateways);
    });
    
};

