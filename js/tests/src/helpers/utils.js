function expect() {
    return chai.expect.apply(this, toArray(arguments))
};

function fail(msg) {
    console.error(msg + " " + (Array.prototype.splice.call(arguments, 1)).join(" "));
    expect(true).toBeFalsy();
}

function expectToBeResolved($promise, msg) {
    $promise
        .fail(function() {
            if(localStorage.dxmpp) {
                debugger;
            }

            expect(true).to.eql(false, msg + ", fail arguments: " + toArray(arguments).join(", "));
        });

    return $promise;
}


var stringToXml = function(xmlStr) {
    var doc = $.parseXML(xmlStr);
    return doc.documentElement;
};

/**
 * Simple patch hack to make all logs from the tested code in Mocha to be grouped in the Google Chrome Console, so that
 * you can easily debug whats going on.
 *
 * This is intended to be used in Chrome.
 * Main goal is to be used when localStorage.d + dxmpp is == 1
 *
 * @returns {ConsoleMochaHelper}
 * @constructor
 */
var ConsoleMochaHelper = function() {
    var _it = it;
    var _refs = {
        'beforeEach': beforeEach,
        'afterEach': afterEach
    };
    var logMethod = "group";
    if(window.location.toString().indexOf("logcollapsed=1") != -1) {
        logMethod = 'groupCollapsed';
    }

    it = function(title, fn) {
        _it(title, function(done) {
            console[logMethod](this.test.parent.title, title);

            fn.call(this, function() {
                console.groupEnd();
                done();
            });

            if(fn.length == 0) {
                console.groupEnd();
                if(done) {
                    done();
                }
            }
        });
    };

    $.each(['beforeEach', 'afterEach'], function(k, v) {
        window[v] = function(fn, done) {
            _refs[v](function(done) {
                console[logMethod](this.currentTest.parent.title, this.currentTest.title, "[" + v + "]");

                fn.call(this, function() {
                    console.groupEnd();
                    done();
                });

                if(fn.length == 0) {
                    console.groupEnd();
                    if(done) {
                        done();
                    }
                }
            });
        }
    });

    this.restore = function() {
        it = _it;
        beforeEach = _refs['beforeEach'];
        afterEach = _refs['afterEach'];
    };

    return this;
};

/**
 * Run this in the console start running Mocha unit tests forever.
 * Helpful to find race conditions/really hard to track problems in the integration tests.
 */
var loopMochaTests = function() {
    var x = 0;

    stop_it = false; /* global flag, to be used from the console to stop the unit tests */
    var fn1 = function() {
        if(!stop_it) {
            console.clear();
            console.log("Loop #", x++);
            mocha.run(fn1);
        }
    };
    mocha.run(fn1);
};