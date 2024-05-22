// Set up the testing environment.
// XXX: This must be the first test we run

describe("Initialization Unit Tests", function() {
    "use strict";

    var assert = chai.assert;
    const nuke = (desc) => {
        const rejectedPromise = Promise.reject(EBLOCKED);
        const stub = (proto, method, test) => {
            const orig = proto[method];
            const name = proto[Symbol.toStringTag] || Object(proto.constructor).name || proto.name || 'unknown';

            Object.defineProperty(window, `__sinon_stub_${Math.random()}`, {
                value: sinon.stub(proto, method)
                    .callsFake(function(...args) {
                        if (test && test(...args)) {
                            console.info(`${name}.${method} call for...`, ...args);
                            return orig.apply(this, args);
                        }
                        console.warn(
                            `Forbidden call to ${name}.${method},\n` +
                            `ARGUMENTS: ${JSON.stringify(args, null, 4)},\n` +
                            `STACKTRACE:\n${mStub.stack()}\r\n`
                        );
                        return rejectedPromise;
                    })
            });
        };

        for (let i = desc.length; i--;) {
            stub(...desc[i]);
        }
    };

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

        nuke([
            [window, 'fetch'],
            [MEGAPIRequest.prototype, 'enqueue'],
            [XMLHttpRequest.prototype, 'open', (...args) => /^base\/.*\.js$/.test(args[1])]
        ]);

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
        // assert(blen('mediainfo:collect'), 'Should listen to collect mediainfo metadata');

        // catch errors dispatching broadcast events (console.error addendum)
        const repl = mStub(window, 'reportError', (ex) => {
            repl.errors.add(ex && `${ex + '\n' + ex.stack}` || 'unknown-error');
        });
        repl.errors = new Set();
        window.buildVersion.timestamp = Date.now();

        // Initialize core components
        mBroadcaster.sendMessage('boot_done');

        mBroadcaster.sendMessage('startMega');
        mBroadcaster.sendMessage('startMega:desktop');

        if (repl.errors.size) {
            for (const ex of repl.errors) {
                dump(`\u{1F90C} Caught exception... ${ex} \u{1F691} \u{1F691}`);
            }
        }

        expect(repl.errors.size).to.eql(0);
        expect(console.error.callCount).to.eql(0);
        _hideDebug();

        // Test stubbing and restoring.
        var warn = sinon.stub(console, 'warn');
        window.fetch('doh')
            .catch(r => assert.ok(r === EBLOCKED));
        expect(console.warn.callCount).to.eql(1);
        expect(window.fetch.callCount).to.eql(1);
        assert.ok(window.fetch.calledWith('doh'));
        warn.restore();
    });
});
