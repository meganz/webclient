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

    var $pageContainer = $('bus-reg-body');

    $pageContainer.find('#business-nbusrs').text('');
    $pageContainer.find('#business-cname').text('');
    $pageContainer.find('#business-tel').text('');
    $pageContainer.find('#business-fname').text('');
    $pageContainer.find('#business-lname').text('');
    $pageContainer.find('#business-email').text('');
    $pageContainer.find('#business-pass').text('');
    $pageContainer.find('#business-rpass').text('');
    $pageContainer.find('.bus-reg-radio-block .bus-reg-radio').removeClass('checkOn').addClass('checkOff');
    $pageContainer.find('.bus-reg-agreement .bus-reg-checkbox').removeClass('checkOn');

    // setting the first payment provider as chosen
    $pageContainer.find('.bus-reg-radio-block .bus-reg-radio.payment-typ1').removeClass('checkOff')
        .addClass('checkOn');

    $pageContainer.removeClass('hidden');  // viewing the main sign-up part
    $('.bus-confirm-body.confirm').addClass('hidden'); // hiding confirmation part
    $('.bus-confirm-body.verfication').addClass('hidden'); // hiding verification part
};

