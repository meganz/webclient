function BusinessProductPage() {

}

BusinessProductPage.prototype.init = function () {
    "use strict";
    $('.create-business-acc-pp').off('click.suba').on('click.suba', function
        createBusinessAccountButtonClickHandler() {
        loadSubPage('registerb');
    });
};
