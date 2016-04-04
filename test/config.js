asmCrypto.random.skipSystemRNGWarning = true;

var _initDebug = function() {
    MegaLogger.DEFAULT_OPTIONS.colorsEnabled = 0;
    MegaLogger.DEFAULT_OPTIONS.dateFormatter = function() { return '' };
    MegaLogger.DEFAULT_OPTIONS.minLogLevel = function() { return window.d ? 0 : 40 };
    _initDebug = 0;
}

function _showDebug(sandbox, stubs) {
    window.d = 1;
    MegaLogger.rootLogger.options.isEnabled = 1;
    if (_initDebug) {
        _initDebug();
    }

    if (sandbox) {
        stubs.forEach(function(fc) {
            fc = fc.split('.');
            if (fc.length < 2) {
                sandbox.stub(window, fc[0]);
            }
            else {
                sandbox.stub(window[fc[0]], fc[1]);
            }
        });
    }
}

function _hideDebug() {
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
        sandbox.stub(window, 'MegaPromise').returns(promise);
    }

    return promise;
}

if (typeof dump !== 'function') {
    window.dump = console.debug.bind(console);
}
