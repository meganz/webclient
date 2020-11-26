function BusinessProductPage() {

}

BusinessProductPage.prototype.init = function () {
    "use strict";

    var $page = $('.scroll-block.business-page', '.fmholder');
    var $storageInfo = $('.business-storage-info', $page);
    var $storageTip = $('.business-price-note', $page);
    var $currencyTip = $('.business-compare-tip span', $page);
    var storageAmount = '15 ' + l[20160];
    var exchangeRate = '1.19'; // USD
    var exchangeRateDate = '18/11/20';

    // Set string values
    $storageInfo.text(l[23789].replace('%1', storageAmount) + ' *');
    $storageTip.safeHTML(l[23169].replace('**', '<span>*</span>'));
    $currencyTip.text(l[24539].replace('%1', storageAmount)
        .replace('%2', exchangeRate).replace('%3', exchangeRateDate));

};
