function RepayPage() {

};

RepayPage.prototype.init = function() {

    if (!u_attr || !u_attr.b || !u_attr.b.m || (u_attr.b.s !== -1 && u_attr.b.s !== -2)) {
        loadSubPage('start');
        return;
    }

    // loadingDialog.show();

    parsepage(pages['repay']);

    var $repaySection = $('.main-mid-pad.bus-repay');
    var $leftSection = $('.main-left-block', $repaySection);
    var $paymentBlock = $('.bus-reg-radio-block', $leftSection);

    var $repayBtn = $leftSection.find('.repay-btn').addClass('disabled');

    $leftSection.find('.bus-reg-agreement.mega-terms .bus-reg-txt').safeHTML(l['208s']);

    // event handler for repay button
    $repayBtn.off('click').on('click',
        function repayButtonHandler() {
            if ($(this).hasClass('disabled')) {
                return false;
            }
            alert('Hi Kiro');
        });

    // event handler for radio buttons
    $('.bus-reg-radio', $paymentBlock)
        .off('click.suba').on('click.suba', function businessRepayCheckboxClick() {
            var $me = $(this);
            if ($me.hasClass('checkOn')) {
                return;
            }
            else {
                $('.bus-reg-radio', $paymentBlock).removeClass('checkOn').addClass('checkOff');
                $me.removeClass('checkOff').addClass('checkOn');
            }
        });


    // event handler for clicking on terms anchor
    $leftSection.find('.bus-reg-agreement.mega-terms .bus-reg-txt span').off('click')
        .on('click', function termsClickHandler() {
            if (!is_mobile) {
                bottomPageDialog(false, 'terms', false, true);
            }
            else {
                var wentOut = false;
                if (window.open) {
                    var cutPlace = location.href.indexOf('/registerb');
                    var myHost = location.href.substr(0, cutPlace);
                    myHost += '/terms';
                    wentOut = window.open(myHost, 'MEGA LIMITED TERMS OF SERVICE');
                }
                if (!wentOut) {
                    loadSubPage('terms');
                }
            }
            return false;
        });

    // event handler for check box
    $('.bus-reg-agreement', $leftSection).off('click.suba').on('click.suba',
        function businessRepayCheckboxClick() {
            var $me = $(this).find('.bus-reg-checkbox');
            if ($me.hasClass('checkOn')) {
                $me.removeClass('checkOn').addClass('checkOff');
                $repayBtn.addClass('disabled');
            }
            else {
                $me.removeClass('checkOff').addClass('checkOn');
                if ($('.bus-reg-agreement .bus-reg-checkbox.checkOn', $leftSection).length === 2) {
                    $repayBtn.removeClass('disabled');
                }
                else {
                    $repayBtn.addClass('disabled');
                }
            }
        });
};