function BusinessProductPage() {

}

BusinessProductPage.prototype.init = function () {
    $('.create-business-acc-pp').off('click.suba').on('click.suba', function
        createBusinessAccountButtonClickHandler() {
        loadSubPage('registerb');
    });
};