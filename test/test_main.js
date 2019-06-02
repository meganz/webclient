// Set up the testing environment.
// XXX: This must be the first test we run

describe("Initialization Unit Tests", function() {
    "use strict";

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

        _showDebug(['api_req', 'console.error', 'console.info']);

        // turn the `ua` (userAgent) string into an object which holds the browser details
        try {
            ua = Object(ua);
            ua.details = Object.create(browserdetails(ua));
        }
        catch (e) {}

        var len = function(o) {
            return Object.keys(o || {}).length;
        };
        var blen = function(p) {
            return len(mBroadcaster._topics[p]);
        };

        // We must have boot_done listeners at least for:
        // api_reset(), watchdog.setup(), eventsCollect(), MegaData(), polyfills, and attrs.js
        assert(blen('boot_done') > 5, 'Unexpected boot_done listeners...');

        // We must have a bunch of listeners waiting for startMega() to get invoked...
        assert(blen('startMega'), 'Should listen to startMega()...');
        assert(blen('startMega:desktop'), 'Should listen to startMega:desktop...');

        // Check for some others...
        assert(blen('closedialog'), 'safeShowDialog() should listen to closeDialog()');
        assert(blen('crossTab:master'), 'Should listen to cross-tab master ownership');
        assert(blen('mediainfo:collect'), 'Should listen to collect mediainfo metadata');

        // Initialize core components
        mBroadcaster.sendMessage('boot_done');

        var rejectedPromise = MegaPromise.reject(EBLOCKED);
        M.$reqStub = sinon.stub(M, 'req').callsFake(function(r) {
            console.warn('Prevented call to M.req(), the network should not be reached.' +
                '\nREQUEST: ' + JSON.stringify(r) +
                '\nSTACKTRACE: \n' + mStub.stack() + '\n\n');
            return rejectedPromise;
        });

        mBroadcaster.sendMessage('startMega');
        mBroadcaster.sendMessage('startMega:desktop');

        expect(console.error.callCount).to.eql(0);
        _hideDebug();

        // Test stubbing and restoring.
        var warn = sinon.stub(console, 'warn');
        M.req('doh');
        expect(console.warn.callCount).to.eql(1);
        M.reqA(['hah']);
        assert.ok(M.req.calledWith('hah'));
        expect(console.warn.callCount).to.eql(2);
        warn.restore();

        var iDBState = 'OK';
        try {
            var tmp = !!window.indexedDB;
        }
        catch (ex) {
            iDBState = ex.name;
        }

        if (iDBState === 'SecurityError') {
            assert.strictEqual(window.mDB, undefined);
        }
        else {
            // Check mDB.js's startMega was called
            expect(window.mDB).to.eql(0x7f);
            expect(indexedDB.getDatabaseNames).to.be.a('function');
        }
    });
});
