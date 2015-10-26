asmCrypto.random.skipSystemRNGWarning = true;

function _showDebug(sandbox, stubs) {
    window.d = 1;
    MegaLogger.rootLogger.options.isEnabled = 1;

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
