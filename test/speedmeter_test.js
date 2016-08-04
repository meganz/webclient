describe("test speedmeter bug with fast connections", function(next) {
    'use strict';

    var sp = new SpeedMeter(function() {});
    var mb5 = 5 * 1024 * 1024;
    sp.progress(0, mb5 * 5);
    var i = 0;
    var tick = setInterval(function() {
        sp.progress(mb5*(++i));
        assert(sp.getData().speed.match(/infin/i) === null);
        if (i == 5) {
            clearInterval(tick);
            next();
        }
    }, 1000);
});
