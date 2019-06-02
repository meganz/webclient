asmCrypto.random.skipSystemRNGWarning = true;

var _initDebug = function() {
    MegaLogger.DEFAULT_OPTIONS.colorsEnabled = 0;
    MegaLogger.DEFAULT_OPTIONS.dateFormatter = function() { return '' };
    MegaLogger.DEFAULT_OPTIONS.minLogLevel = function() { return window.d ? 0 : 40 };
    _initDebug = 0;
}

function _showDebug(stubs) {
    mStub(window, 'd', true);
    MegaLogger.rootLogger.options.isEnabled = 1;
    if (_initDebug) {
        _initDebug();
    }

    if (stubs && stubs.length) {
        stubs.forEach(function(fc) {
            fc = fc.split('.');
            if (fc.length < 2) {
                mStub(window, fc[0]);
            }
            else {
                mStub(window[fc[0]], fc[1]);
            }
        });
    }
}

function _hideDebug() {
    mStub.restore();
    window.d = 0;
    MegaLogger.rootLogger.options.isEnabled = 0;
}

function _stubMegaPromise(sinon, sandbox) {
    var meths = [
        "then","done","fail","resolve","reject","always","linkDoneTo",
        "linkFailTo","linkDoneAndFailTo","linkDoneAndFailToResult"
    ];
    var promise = {};

    meths.forEach(function(meth) {
        promise[meth] = sinon.stub().returns(promise);
    });

    if (sandbox) {
        mStub(window, 'MegaPromise').returns(promise);
    }

    return promise;
}

function mStub(obj, prop, value) {
    mStub.values.push([obj, prop, obj[prop]]);
    var result = sinon.stub(obj, prop);
    mStub.inflight.push(result);
    obj[prop] = result;
    if (arguments.length > 2) {
        if (typeof value === 'function') {
            result.callsFake(value);
        }
        else {
            result.value(value);
        }
        obj[prop] = value;
    }
    return result;
}

mStub.restore = function() {
    for (var i = mStub.inflight.length; i--;) {
        try {
            mStub.inflight[i].restore();
        } catch (ex) {}
    }
    for (var j = mStub.values.length; j--;) {
        var v = mStub.values[j];
        v[0][v[1]] = v[2];
    }
    mStub.values = [];
    mStub.inflight = [];
};

mStub.stack = function(n) {
    var base;
    var stack;

    try {
        throw new Error('doh');
    }
    catch (ex) {
        stack = ex.stack;
    }

    if (stack) {
        stack = stack.split('\n');
        base = (String(stack[0]).match(/@(.*?\/(?:base\/)+)/) || [])[1];

        stack = stack.slice(n || 1)
            .filter(function(ln) {
                return ln.indexOf('node_modules') < 0;
            })
            .map(function(ln) {
                return ln.replace(base, '../').replace(/\?\w+/, '');
            });
    }

    return (stack || ['--no-stack-available--']).join('\n');
};
mStub.values = [];
mStub.inflight = [];

if (typeof dump !== 'function') {
    window.dump = console.debug.bind(console);
}
