$(document).ready(function() {
    var elem = $('.js-messages-scroll-area:visible')[0];
    console.time('firstInit');
    Ps.initialize(elem, {
        handlers: ['click-rail', 'drag-scrollbar', 'keyboard', 'wheel', 'touch']
    });
    console.timeEnd('firstInit');
    document.addEventListener('ps-scroll-x', function () {
        // window.asdf = $('.uc27geA7KQ4.message')[0].offsetTop;
    });
});


window.testBatchDataUpdates = function() {
    console.time("testBatchDataUpdates");
    var elem = $('.js-messages-scroll-area:visible')[0];
    for (var i = 0; i < 10; i++) {
        Ps.update(elem);
    }
    console.timeEnd("testBatchDataUpdates");
};
