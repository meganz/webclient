/**
 *  If progress was called right away when the SpeedMeter object
 *  was created (only reproducible if you have a very fast
 *  internet connection) it ended up dividing the speed by 0 (which is Infinity).
 */
describe("test speedmeter bug with fast connections", function(next) {
    'use strict';

    var sp = new SpeedMeter(function() {});
    var mb5 = 5 * 1024 * 1024;
    sp.progress(0, mb5 * 5);
    for (i = 0; i < 500; ++i) {
        sp.progress(i * 2, mb5 * 5);
    }
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
