$(document).ready(function() {
    console.time('firstInit');
    $('.js-messages-scroll-area:visible').jScrollPane();
    console.timeEnd('firstInit');

});


window.testBatchDataUpdates = function() {
    console.time("testBatchDataUpdates");
    var $elem = $('.js-messages-scroll-area:visible');
    for (var i = 0; i < 10; i++) {
        $elem.data('jsp').reinitialise();
    }
    console.timeEnd("testBatchDataUpdates");
};
