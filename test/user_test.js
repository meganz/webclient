/**
 * @fileOverview
 * User operations unit tests.
 */

describe("user unit test", function() {
    "use strict";

    var assert = chai.assert;

    // Create/restore Sinon stub/spy/mock sandboxes.
    var sandbox = null;

    // Some test data.
    var ED25519_PUB_KEY = atob('11qYAYKxCrfVS/7TyWQHOg7hcvPapiMlrwIaaPcHURo=');

    var stdoutHook;
    var _echo = function(x) { return x; };

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('user attributes', function() {
        describe('getUserAttribute', function() {
            it("internal callback error, no custom callback", function() {
                window.api_req = sinon.spy();
                getUserAttribute('me', 'puEd255', true, undefined);
                sinon.assert.calledOnce(api_req);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                sandbox.stub(window.console, 'log');
                localStorage.d = true;
                callback(-3, theCtx);
                assert.strictEqual(console.log.args[0][0],
                                   'Error retrieving attribute "+puEd255" for user "me": -3!');
            });

            it("internal callback error, custom callback", function() {
                window.api_req = sinon.spy();
                var myCallback = sinon.spy();
                getUserAttribute('me', 'puEd255', true, myCallback);
                sinon.assert.calledOnce(api_req);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                callback(-3, theCtx);
                assert.strictEqual(myCallback.args[0][0], -3);
            });

            it("internal callback OK, no custom callback", function() {
                window.api_req = sinon.spy();
                getUserAttribute('me', 'puEd255', true, undefined);
                sinon.assert.calledOnce(api_req);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                sandbox.stub(window.console, 'log');
                localStorage.d = true;
                callback('fortytwo', theCtx);
                assert.strictEqual(console.log.args[0][0],
                                   'Attribute "+puEd255" for user "me" is "fortytwo".');
            });

            it("internal callback OK, custom callback", function() {
                window.api_req = sinon.spy();
                var myCallback = sinon.spy();
                getUserAttribute('me', 'puEd255', true, myCallback);
                sinon.assert.calledOnce(api_req);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                callback('fortytwo', theCtx);
                assert.strictEqual(myCallback.args[0][0], 'fortytwo');
            });

            it("private attribute, internal callback OK, custom callback, crypto stubbed", function() {
                window.api_req = sinon.spy();
                var myCallback = sinon.spy();
                sandbox.stub(tlvstore, 'blockDecrypt', _echo);
                sandbox.stub(tlvstore, 'tlvRecordsToContainer', _echo);
                sandbox.stub(window, 'u_k', 'foo');
                getUserAttribute('me', 'keyring', false, myCallback);
                sinon.assert.calledOnce(api_req);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                callback('Zm9ydHl0d28=', theCtx);
                assert.strictEqual(myCallback.args[0][0], 'fortytwo');
                assert.ok(tlvstore.tlvRecordsToContainer.calledWith('fortytwo'));
                assert.ok(tlvstore.blockDecrypt.calledWith('fortytwo', 'foo'));
            });

            it("private attribute, internal callback OK, custom callback", function() {
                window.api_req = sinon.spy();
                var myCallback = sinon.spy();
                sandbox.stub(window, 'u_k', asmCrypto.bytes_to_string(asmCrypto.hex_to_bytes('0f0e0d0c0b0a09080706050403020100')));
                getUserAttribute('me', 'keyring', false, myCallback);
                sinon.assert.calledOnce(api_req);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                var res = 'AgABAgMEBQYHCAk+T6t/cBKS0eztTXRFa2qd9jFfycQmUC5dJJurGUm99XOLMSTw00I3LtHJ7HtLuKdAauFIGc5oCegTnlHVaAFIahGfgp845h0GDQ==';
                var expected = {'foo': 'bar', 'puEd255': ED25519_PUB_KEY};
                callback(res, theCtx);
                assert.deepEqual(myCallback.args[0][0], expected);
            });

            it("public attribute", function() {
                window.api_req = sinon.spy();
                getUserAttribute('me', 'puEd255', undefined, undefined);
                sinon.assert.calledOnce(api_req);
                assert.deepEqual(api_req.args[0][0], {a: 'uga', u: 'me', ua: '+puEd255'});
            });

            it("public attribute, two params", function() {
                window.api_req = sinon.spy();
                getUserAttribute('me', 'puEd255');
                sinon.assert.calledOnce(api_req);
                assert.deepEqual(api_req.args[0][0], {a: 'uga', u: 'me', ua: '+puEd255'});
            });

            it("private attribute", function() {
                window.api_req = sinon.spy();
                getUserAttribute('me', 'keyring', false, undefined);
                sinon.assert.calledOnce(api_req);
                assert.deepEqual(api_req.args[0][0], {a: 'uga', u: 'me', ua: '*keyring'});
            });
        });

        describe('setUserAttribute', function() {
            it("internal callback error, no custom callback", function() {
                window.api_req = sinon.spy();
                setUserAttribute('puEd255', 'foo', true, undefined);
                sinon.assert.calledOnce(api_req);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                sandbox.stub(window.console, 'log');
                localStorage.d = true;
                callback(-3, theCtx);
                assert.strictEqual(console.log.args[0][0],
                                   'Error setting user attribute "+puEd255", result: -3!');
            });

            it("internal callback error, custom callback", function() {
                window.api_req = sinon.spy();
                var myCallback = sinon.spy();
                setUserAttribute('puEd255', 'foo', true, myCallback);
                sinon.assert.calledOnce(api_req);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                callback(-3, theCtx);
                assert.strictEqual(myCallback.args[0][0], -3);
            });

            it("internal callback OK, no custom callback", function() {
                window.api_req = sinon.spy();
                setUserAttribute('puEd255', 'foo', true, undefined);
                sinon.assert.calledOnce(api_req);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                sandbox.stub(window.console, 'log');
                localStorage.d = true;
                callback('OK', theCtx);
                assert.strictEqual(console.log.args[0][0],
                                   'Setting user attribute "+puEd255", result: OK');
            });

            it("internal callback OK, custom callback", function() {
                window.api_req = sinon.spy();
                var myCallback = sinon.spy();
                setUserAttribute('puEd255', 'foo', true, myCallback);
                sinon.assert.calledOnce(api_req);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                callback('OK', theCtx);
                assert.strictEqual(myCallback.args[0][0], 'OK');
            });

            it("private attribute, internal callback OK, custom callback, crypto stubbed", function() {
                window.api_req = sinon.spy();
                var myCallback = sinon.spy();
                sandbox.stub(tlvstore, 'blockEncrypt', _echo);
                sandbox.stub(tlvstore, 'containerToTlvRecords', _echo);
                sandbox.stub(window, 'u_k', 'foo');
                setUserAttribute('keyring', 'fortytwo', false, myCallback);
                assert.ok(tlvstore.blockEncrypt.calledWith('fortytwo', 'foo', tlvstore.BLOCK_ENCRYPTION_SCHEME. AES_CCM_12_16));
                assert.ok(tlvstore.containerToTlvRecords.calledWith('fortytwo'));
                sinon.assert.calledOnce(api_req);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                callback('OK', theCtx);
                assert.strictEqual(myCallback.args[0][0], 'OK');
            });

            it("private attribute, internal callback OK, no custom callback", function() {
                window.api_req = sinon.spy();
                sandbox.stub(window, 'u_k', asmCrypto.bytes_to_string(asmCrypto.hex_to_bytes('0f0e0d0c0b0a09080706050403020100')));
                setUserAttribute('keyring', {'foo': 'bar', 'puEd255': ED25519_PUB_KEY}, false, undefined);
                sinon.assert.calledOnce(api_req);
                var decoded = tlvstore.tlvRecordsToContainer(tlvstore.blockDecrypt(base64urldecode(api_req.args[0][0]['*keyring']), window.u_k));
                assert.strictEqual(api_req.args[0][0].a, 'up');
                assert.strictEqual(decoded.puEd255, ED25519_PUB_KEY);
                assert.strictEqual(decoded.foo, 'bar');
            });

            it("public attribute", function() {
                window.api_req = sinon.spy();
                setUserAttribute('puEd255', 'foo', true, undefined);
                sinon.assert.calledOnce(api_req);
                assert.deepEqual(api_req.args[0][0], {a: 'up', '+puEd255': 'foo'});
            });

            it("public attribute, two params", function() {
                window.api_req = sinon.spy();
                setUserAttribute('puEd255', 'foo');
                sinon.assert.calledOnce(api_req);
                assert.deepEqual(api_req.args[0][0], {a: 'up', '+puEd255': 'foo'});
            });

            it("private attribute", function() {
                window.api_req = sinon.spy();
                sandbox.stub(window, 'u_k', asmCrypto.bytes_to_string(asmCrypto.hex_to_bytes('0f0e0d0c0b0a09080706050403020100')));
                setUserAttribute('keyring', {'foo': 'bar', 'puEd255': ED25519_PUB_KEY}, false, undefined);
                sinon.assert.calledOnce(api_req);
                var decoded = tlvstore.tlvRecordsToContainer(tlvstore.blockDecrypt(base64urldecode(api_req.args[0][0]['*keyring']), window.u_k));
                assert.strictEqual(api_req.args[0][0].a, 'up');
                assert.strictEqual(decoded.puEd255, ED25519_PUB_KEY);
                assert.strictEqual(decoded.foo, 'bar');
                assert.lengthOf(api_req.args[0][0]['*keyring'], 127);
            });

            it("private attribute, compact crypto mode", function() {
                window.api_req = sinon.spy();
                sandbox.stub(window, 'u_k', asmCrypto.bytes_to_string(asmCrypto.hex_to_bytes('0f0e0d0c0b0a09080706050403020100')));
                setUserAttribute('keyring', {'foo': 'bar', 'puEd255': ED25519_PUB_KEY},
                                 false, undefined, tlvstore.BLOCK_ENCRYPTION_SCHEME.AES_CCM_10_08);
                sinon.assert.calledOnce(api_req);
                var decoded = tlvstore.tlvRecordsToContainer(tlvstore.blockDecrypt(base64urldecode(api_req.args[0][0]['*keyring']), window.u_k));
                assert.strictEqual(api_req.args[0][0].a, 'up');
                assert.strictEqual(decoded.puEd255, ED25519_PUB_KEY);
                assert.strictEqual(decoded.foo, 'bar');
                assert.lengthOf(api_req.args[0][0]['*keyring'], 114);
            });
        });
    });
});
