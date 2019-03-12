function RepayPage() {

};

RepayPage.prototype.init = function() {

    if (!u_attr || !u_attr.b || !u_attr.b.m || u_attr.b.s !== -1) {
        loadSubPage('start');
        return;
    }
    parsepage(pages['repay']);

    $('.main-mid-pad.bus-repay .repay-btn').off('click').on('click',
        function repayButtonHandler() {
            alert('Hi Kiro');
    });
};