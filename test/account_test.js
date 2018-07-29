/**
 * @fileOverview
 * Account operations unit tests.
 */

describe("account unit test", function() {
    "use strict";

    var assert = chai.assert;

    // Create/restore Sinon stub/spy/mock sandboxes.
    var sandbox = null;

    // Some test data.
    var ED25519_PUB_KEY = atob('11qYAYKxCrfVS/7TyWQHOg7hcvPapiMlrwIaaPcHURo=');

    var stdoutHook;
    var _echo = function(x) { return x; };
    var ns = mega.attr;

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
        localStorage.clear();

        sandbox.stub(window, 'api_req');
        api_req = window.api_req;
    });

    afterEach(function(done) {
        attribCache.clear()
            .always(function() {
                sandbox.restore();
                done();
            });
    });

    describe('user attributes', function() {
        describe('mega.attr.get', function() {
            it("internal callback error, no custom callback", function() {
                sandbox.stub(ns._logger, 'warn');

                var aPromise = mega.attr.get('me3456789xw', 'puEd255', true, false, undefined);
                assert.strictEqual(api_req.callCount, 1);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                callback(EFAILED, theCtx);
                assert.strictEqual(aPromise.state(), 'rejected');
                assert.strictEqual(ns._logger.warn.callCount, 1);
                assert.strictEqual(ns._logger.warn.args[0][1], "+puEd255");
                assert.strictEqual(ns._logger.warn.args[0][2], "me3456789xw");
                assert.strictEqual(ns._logger.warn.args[0][3], -5);
            });

            it("internal callback error, custom callback", function() {
                sandbox.stub(ns._logger, 'warn');

                var myCallback = sinon.spy();
                var aPromise = mega.attr.get('me3456789xw', 'puEd255', true, false, myCallback);
                assert.strictEqual(api_req.callCount, 1);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                callback(EFAILED, theCtx);
                assert.strictEqual(aPromise.state(), 'rejected');
                assert.strictEqual(myCallback.args[0][0], EFAILED);
                assert.strictEqual(ns._logger.warn.args[0][1], "+puEd255");
                assert.strictEqual(ns._logger.warn.args[0][2], "me3456789xw");
                assert.strictEqual(ns._logger.warn.args[0][3], -5);
            });

            it("internal callback OK, no custom callback", function(done) {
                sandbox.stub(ns._logger, '_log');

                var aPromise = mega.attr.get('me3456789xw', 'puEd255', true, false, undefined);
                assert.strictEqual(api_req.callCount, 1);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                sandbox.stub(window, 'd', true);
                callback('fortytwo', theCtx);
                assert.strictEqual(aPromise.state(), 'resolved');
                assert.strictEqual(ns._logger._log.args[0][1], "+puEd255");
                assert.strictEqual(ns._logger._log.args[0][2], "me3456789xw");
                assert.strictEqual(ns._logger._log.args[0][3], '"fortytwo"');

                aPromise
                    .done(function(resolveArgs) {
                        assert.strictEqual(resolveArgs, 'fortytwo');
                    })
                    .always(function() {
                        done();
                    });
            });

            it("internal callback OK, custom callback", function() {
                sandbox.stub(ns._logger, '_log');

                var myCallback = sinon.spy();
                var aPromise = mega.attr.get('me3456789xw', 'puEd255', true, false, myCallback);
                assert.strictEqual(api_req.callCount, 1);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                sandbox.stub(window, 'd', true);
                callback('fortytwo', theCtx);
                assert.strictEqual(aPromise.state(), 'resolved');
                assert.strictEqual(myCallback.args[0][0], 'fortytwo');

                assert.strictEqual(ns._logger._log.callCount, 1);
                assert.strictEqual(ns._logger._log.args[0][1],"+puEd255");
                assert.strictEqual(ns._logger._log.args[0][2],"me3456789xw");
                assert.strictEqual(ns._logger._log.args[0][3],'"fortytwo"');

            });

            it("private attribute, internal callback OK, custom callback, crypto stubbed", function() {
                sandbox.stub(ns._logger, '_log');

                var myCallback = sinon.spy();
                sandbox.stub(tlvstore, 'blockDecrypt', _echo);
                sandbox.stub(tlvstore, 'tlvRecordsToContainer', _echo);
                sandbox.stub(window, 'u_k', 'foo');
                var aPromise = mega.attr.get('me3456789xw', 'keyring', false, false, myCallback);
                assert.strictEqual(api_req.callCount, 1);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                sandbox.stub(window, 'd', true);
                callback('Zm9ydHl0d28=', theCtx);
                assert.strictEqual(aPromise.state(), 'resolved');
                assert.strictEqual(myCallback.args[0][0], 'fortytwo');
                assert.ok(tlvstore.tlvRecordsToContainer.calledWith('fortytwo'));
                assert.ok(tlvstore.blockDecrypt.calledWith('fortytwo', 'foo'));

                assert.strictEqual(ns._logger._log.callCount, 1);
                assert.strictEqual(ns._logger._log.args[0][1],"*keyring");
                assert.strictEqual(ns._logger._log.args[0][2],"me3456789xw");
                assert.strictEqual(ns._logger._log.args[0][3],'-- hidden --');
            });

            it("private attribute, failed data integrity check", function(done) {

                sandbox.stub(tlvstore, 'blockDecrypt').throws('SecurityError');
                sandbox.stub(window, 'u_k', 'foo');
                var result = mega.attr.get('me3456789xw', 'keyring', false, false);
                assert.strictEqual(api_req.callCount, 1);

                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                callback('Zm9ydHl0d28=', theCtx);
                assert.ok(tlvstore.blockDecrypt.calledWith('fortytwo', 'foo'));

                assert.strictEqual(result.state(), 'rejected');


                result
                    .fail(function(rejectArgs) {
                        assert.strictEqual(rejectArgs, EINTERNAL);
                    })
                    .always(function() {
                        done();
                    });
            });

            it("private attribute, internal callback OK, custom callback", function() {
                sandbox.stub(ns._logger, '_log');

                sandbox.stub(window, 'assertUserHandle');
                sandbox.stub(window, 'base64urldecode', _echo);
                sandbox.stub(tlvstore, 'blockDecrypt', _echo);
                sandbox.stub(tlvstore, 'tlvRecordsToContainer' , _echo);
                var myCallback = sinon.spy();
                var aPromise = mega.attr.get('me3456789xw', 'keyring', false, false, myCallback);
                assert.strictEqual(api_req.callCount, 1);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                var expected = { 'foo': 'bar', 'puEd255': ED25519_PUB_KEY };
                sandbox.stub(window, 'd', true);
                callback(expected, theCtx);
                assert.strictEqual(aPromise.state(), 'resolved');
                assert.deepEqual(myCallback.callCount, 1);
                assert.deepEqual(myCallback.args[0][0], expected);

                assert.strictEqual(ns._logger._log.callCount, 1);
                assert.strictEqual(ns._logger._log.args[0][1],"*keyring");
                assert.strictEqual(ns._logger._log.args[0][2],"me3456789xw");
                assert.strictEqual(ns._logger._log.args[0][3],'-- hidden --');
            });

            it("public attribute", function() {

                mega.attr.get('me3456789xw', 'puEd255', undefined, undefined, undefined);
                assert.strictEqual(api_req.callCount, 1);

                assert.deepEqual(api_req.args[0][0], {a: 'uga', u: 'me3456789xw', ua: '+puEd255', v: 1});
            });

            it("public, non-historic attribute", function() {

                mega.attr.get('me3456789xw', 'puEd255', true, true, undefined);
                assert.strictEqual(api_req.callCount, 1);
                assert.deepEqual(api_req.args[0][0], {a: 'uga', u: 'me3456789xw', ua: '+!puEd255', v: 1});
            });

            it("public attribute, two params", function() {

                mega.attr.get('me3456789xz', 'puEd255');
                assert.strictEqual(api_req.callCount, 1);
                assert.deepEqual(api_req.args[0][0], {a: 'uga', u: 'me3456789xz', ua: '+puEd255', v: 1});
            });

            it("private attribute", function() {

                mega.attr.get('me3456789xw', 'keyring', false, false, undefined);
                assert.strictEqual(api_req.callCount, 1);
                assert.deepEqual(api_req.args[0][0], {a: 'uga', u: 'me3456789xw', ua: '*keyring', v: 1});
            });

            it("private, non-historic attribute", function() {

                mega.attr.get('me3456789xw', 'keyring', false, true, undefined);
                assert.strictEqual(api_req.callCount, 1);
                assert.deepEqual(api_req.args[0][0], {a: 'uga', u: 'me3456789xw', ua: '*!keyring', v: 1});
            });
        });

        describe('mega.attr.set', function() {
            it("internal callback error, no custom callback", function() {
                sandbox.stub(ns._logger, '_log');

                mega.attr.set('puEd255', 'foo', true, false, undefined);
                assert.strictEqual(api_req.callCount, 1);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                sandbox.stub(window, 'd', true);
                callback(EFAILED, theCtx);

                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Error setting user attribute "+puEd255", result: -5!');
            });

            it("internal callback error, custom callback", function() {
                sandbox.stub(ns._logger, '_log');

                var myCallback = sinon.spy();
                mega.attr.set('puEd255', 'foo', true, false, myCallback);
                assert.strictEqual(api_req.callCount, 1);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                callback(EFAILED, theCtx);
                assert.strictEqual(myCallback.args[0][0], EFAILED);
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Error setting user attribute "+puEd255", result: -5!');
            });

            it("internal callback OK, no custom callback", function() {
                sandbox.stub(ns._logger, '_log');

                mega.attr.set('puEd255', 'foo', true, false, undefined);
                assert.strictEqual(api_req.callCount, 1);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                sandbox.stub(window, 'd', true);
                callback('OK', theCtx);
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Setting user attribute "+puEd255", result: OK');
            });

            it("internal callback OK, custom callback", function() {
                sandbox.stub(ns._logger, '_log');

                var myCallback = sinon.spy();
                mega.attr.set('puEd255', 'foo', true, false, myCallback);
                assert.strictEqual(api_req.callCount, 1);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                callback('OK', theCtx);
                assert.strictEqual(myCallback.args[0][0], 'OK');

                assert.strictEqual(ns._logger._log.callCount, 1);
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Setting user attribute "+puEd255", result: OK');
            });

            it("private attribute, internal callback OK, custom callback, crypto stubbed", function() {
                sandbox.stub(ns._logger, '_log');
                var myCallback = sinon.spy();
                sandbox.stub(tlvstore, 'blockEncrypt', _echo);
                sandbox.stub(tlvstore, 'containerToTlvRecords', _echo);
                sandbox.stub(window, 'u_k', 'foo');
                mega.attr.set('keyring', 'fortytwo', false, false, myCallback);
                assert.ok(tlvstore.blockEncrypt.calledWith('fortytwo', 'foo',
                    tlvstore.BLOCK_ENCRYPTION_SCHEME. AES_GCM_12_16));
                assert.ok(tlvstore.containerToTlvRecords.calledWith('fortytwo'));
                assert.strictEqual(api_req.callCount, 1);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                callback('OK', theCtx);
                assert.strictEqual(myCallback.args[0][0], 'OK');
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Setting user attribute "*keyring", result: OK');
            });

            it("private attribute, internal callback OK, no custom callback", function() {

                sandbox.stub(window, 'u_k',
                             asmCrypto.bytes_to_string(asmCrypto.hex_to_bytes(
                                 '0f0e0d0c0b0a09080706050403020100')));
                mega.attr.set('keyring', {'foo': 'bar',
                                             'puEd255': ED25519_PUB_KEY},
                                 false, false, undefined);
                assert.strictEqual(api_req.callCount, 1);
                var decoded = tlvstore.tlvRecordsToContainer(
                    tlvstore.blockDecrypt(base64urldecode(
                        api_req.args[0][0]['*keyring']), window.u_k));
                assert.strictEqual(api_req.args[0][0].a, 'up');
                assert.strictEqual(decoded.puEd255, ED25519_PUB_KEY);
                assert.strictEqual(decoded.foo, 'bar');
            });

            it("public attribute", function() {

                mega.attr.set('puEd255', 'foo', true, false, undefined);
                assert.strictEqual(api_req.callCount, 1);
                assert.deepEqual(api_req.args[0][0].a, 'up');
                assert.deepEqual(api_req.args[0][0]['+puEd255'], 'foo');
            });

            it("public attribute, two params", function() {

                mega.attr.set('puEd255', 'foo');
                assert.strictEqual(api_req.callCount, 1);
                assert.deepEqual(api_req.args[0][0].a, 'up');
                assert.deepEqual(api_req.args[0][0]['+puEd255'], 'foo');
            });

            it("private attribute", function() {

                sandbox.stub(window, 'u_k', asmCrypto.bytes_to_string(
                    asmCrypto.hex_to_bytes('0f0e0d0c0b0a09080706050403020100')));
                mega.attr.set('keyring', {'foo': 'bar',
                                             'puEd255': ED25519_PUB_KEY},
                                 false, false, undefined);
                assert.strictEqual(api_req.callCount, 1);
                var decoded = tlvstore.tlvRecordsToContainer(
                    tlvstore.blockDecrypt(base64urldecode(
                        api_req.args[0][0]['*keyring']), window.u_k));
                assert.strictEqual(api_req.args[0][0].a, 'up');
                assert.strictEqual(decoded.puEd255, ED25519_PUB_KEY);
                assert.strictEqual(decoded.foo, 'bar');
                assert.lengthOf(api_req.args[0][0]['*keyring'], 107);
            });

            it("private attribute, compact crypto mode", function() {

                sandbox.stub(window, 'u_k', asmCrypto.bytes_to_string(
                    asmCrypto.hex_to_bytes('0f0e0d0c0b0a09080706050403020100')));
                mega.attr.set('keyring', {'foo': 'bar',
                                             'puEd255': ED25519_PUB_KEY},
                                 false, false, undefined, undefined,
                                 tlvstore.BLOCK_ENCRYPTION_SCHEME.AES_CCM_10_08);
                assert.strictEqual(api_req.callCount, 1);
                var decoded = tlvstore.tlvRecordsToContainer(
                    tlvstore.blockDecrypt(base64urldecode(
                        api_req.args[0][0]['*keyring']), window.u_k));
                assert.strictEqual(api_req.args[0][0].a, 'up');
                assert.strictEqual(decoded.puEd255, ED25519_PUB_KEY);
                assert.strictEqual(decoded.foo, 'bar');
                assert.lengthOf(api_req.args[0][0]['*keyring'], 94);
            });
        });
    });
});
