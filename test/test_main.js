// Set up the testing environment.
// XXX: This must be the first test we run

describe("Initialization Unit Tests", function() {
    "use strict";

    // Create/restore Sinon stub/spy/mock sandboxes.
    var sandbox = null;

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });
    afterEach(function() {
        sandbox.restore();
    });
    var assert = chai.assert;

    it("did not called jsl_start()", function() {
        // There is no reason to let secureboot's onload handler invoke jsl_start() because:
        // 1) We load the files through Karma already.
        // 2) If jsl_start() fails, we won't notice since that is not behind a test.
        // 3) It'll slow the testing process since that will be running on the background.

        // XXX: jsl_start will initialize xhr_progress to an array, so check it's undefined.
        assert.strictEqual(xhr_progress, undefined);
    });

    it("can invoke mBroadcaster", function() {
        // The secureboot's loading process is:
        // jsl_start -> initall -> boot_done -> boot_auth -> startMega
        // So, lets invoke mBroadcaster's startMega to initialize any required stuff

        _showDebug(sandbox, ['console.log', 'console.error']);

        mBroadcaster.sendMessage('startMega');

        _hideDebug();
        expect(console.log.callCount).to.be.at.least(1);
        expect(console.error.callCount).to.eql(0);

        // Check mDB.js's startMega was called
        expect(window.mDB).to.eql(0x7f);
        expect(indexedDB.getDatabaseNames).to.be.a('function');

    });
});
