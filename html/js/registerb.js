/** a class contains the code-behind of business register "registerb" page */
function BusinessRegister() {

}


/** afunction to rest business registeration page to its initial state*/
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

    $pageContainer.removeClass('hidden');  // viewing the maing signup part
    $('.bus-confirm-body.confirm').addClass('hidden'); // hiding confirmation part
    $('.bus-confirm-body.verfication').addClass('hidden'); // hiding verification part
};

BusinessRegister.prototype.getListOfPaymentGateways = function() {
    "use strict";
};
