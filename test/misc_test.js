/**
 * @fileOverview
 * Miscelaneous tests.
 */

describe("misc unit tests", function() {
    "use strict";

    var assert = chai.assert;

    // Create/restore Sinon stub/spy/mock sandboxes.
    var sandbox = null;

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
        sandbox.restore();
    });

    it('can neuter arraybuffer', function() {
        function neuter(ab)
        {
            if (!(ab instanceof ArrayBuffer)) {
                ab = ab && ab.buffer;
            }
            try {
                if (typeof ArrayBuffer.transfer === 'function') {
                    ArrayBuffer.transfer(ab, 0);
                }
                else {
                    if (!neuter.dataWorker) {
                        neuter.dataWorker = new Worker("data:application/javascript,var%20d%3B");
                    }
                    neuter.dataWorker.postMessage(ab, [ab]);
                }
            }
            catch (ex) {
                console.warn('Cannot neuter ArrayBuffer', ab, ex);
            }
        }
        var buf = new ArrayBuffer(1000);
        var ta = new Int8Array(buf);

        for (var i = 0; i < 2500; i++) {
            if (i === 2000) {
                neuter(ta);
            }
            assert.strictEqual(ta.length, i >= 2000 ? 0 : 1000);
        }
    });
});
