/**
 * @fileOverview
 * Authentication ring unit tests.
 */

describe("authring unit test", function() {
    "use strict";

    var assert = chai.assert;

    var ns = authring;

    // Create/restore Sinon stub/spy/mock sandboxes.
    var sandbox = null;

    // Some test data.
    var ED25519_PUB_KEY = atob('11qYAYKxCrfVS/7TyWQHOg7hcvPapiMlrwIaaPcHURo=');
    var ED25519_HEX_FINGERPRINT = '5b27aa5589179770e47575b162a1ded97b8bfc6d';
    var ED25519_STRING_FINGERPRINT = base64urldecode('WyeqVYkXl3DkdXWxYqHe2XuL_G0');

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('record en-/decoding', function() {
        it("_serialiseRecord()", function() {
            var tests = [['ohKpg1j6E64', ED25519_STRING_FINGERPRINT, 0x02, 0x04],
                         ['ohKpg1j6E64', ED25519_HEX_FINGERPRINT, 0x02, 0x04]];
            var expected = 'ohKpg1j6E65bJ6pViReXcOR1dbFiod7Ze4v8bUI=';
            for (var i = 0; i < tests.length; i++) {
                var userhandle = tests[i][0];
                var fingerprint = tests[i][1];
                var method = tests[i][2];
                var confidence = tests[i][3];
                assert.strictEqual(btoa(ns._serialiseRecord(userhandle, fingerprint, method, confidence)), expected);
            }
        });

        it("serialise()", function() {
            var test = {'me3456789xw': {fingerprint: ED25519_STRING_FINGERPRINT,
                                        method: ns.AUTHENTICATION_METHOD.SEEN,
                                        confidence: ns.KEY_CONFIDENCE.UNSURE},
                        'you456789xw': {fingerprint: ED25519_HEX_FINGERPRINT,
                                        method: 0x02,
                                        confidence: 0x04}};
            var expected = 'me3456789xxbJ6pViReXcOR1dbFiod7Ze4v8bQDKi7jnrvz3HFsnqlWJF5dw5HV1sWKh3tl7i/xtQg==';
            assert.strictEqual(btoa(ns.serialise(test)), expected);
        });

        it('_splitSingleTAuthRecord()', function() {
            var tests = atob('me3456789xxbJ6pViReXcOR1dbFiod7Ze4v8bQDKi7jnrvz3HFsnqlWJF5dw5HV1sWKh3tl7i/xtQg==');
            var result = ns._deserialiseRecord(tests);
            assert.strictEqual(result.userhandle, 'me3456789xw');
            assert.deepEqual(result.value, {fingerprint: ED25519_STRING_FINGERPRINT,
                                            method: ns.AUTHENTICATION_METHOD.SEEN,
                                            confidence: ns.KEY_CONFIDENCE.UNSURE});
            assert.strictEqual(result.rest, base64urldecode('you456789xw') + ED25519_STRING_FINGERPRINT + String.fromCharCode(0x42));
        });

        it('deserialise()', function() {
            var tests = atob('me3456789xxbJ6pViReXcOR1dbFiod7Ze4v8bQDKi7jnrvz3HFsnqlWJF5dw5HV1sWKh3tl7i/xtQg==');
            var expected = {'me3456789xw': {fingerprint: ED25519_STRING_FINGERPRINT,
                                            method: ns.AUTHENTICATION_METHOD.SEEN,
                                            confidence: ns.KEY_CONFIDENCE.UNSURE},
                            'you456789xw': {fingerprint: ED25519_STRING_FINGERPRINT,
                                            method: 0x02,
                                            confidence: 0x04}};
            assert.deepEqual(ns.deserialise(tests), expected);
        });
    });

    describe('getting/setting u_authring', function() {
        var aSerialisedRing = atob('me3456789xxbJ6pViReXcOR1dbFiod7Ze4v8bQDKi7jnrvz3HFsnqlWJF5dw5HV1sWKh3tl7i/xtQg==');
        var aRing = {'me3456789xw': {fingerprint: ED25519_STRING_FINGERPRINT,
                                     method: ns.AUTHENTICATION_METHOD.SEEN,
                                     confidence: ns.KEY_CONFIDENCE.UNSURE},
                     'you456789xw': {fingerprint: ED25519_STRING_FINGERPRINT,
                                     method: 0x02,
                                     confidence: 0x04}};

        describe('getContacts()', function() {
            it("internal callback error, no custom callback", function() {
                sandbox.stub(window, 'u_authring', undefined);
                sandbox.spy(window, 'getUserAttribute');
                ns.getContacts();
                sinon.assert.calledOnce(getUserAttribute);
                var callback = getUserAttribute.args[0][3];
                var theCtx = getUserAttribute.args[0][4];
                callback(-3, theCtx);
                assert.deepEqual(u_authring, {});
            });

            it("internal callback, no custom callback", function() {
                sandbox.stub(window, 'u_authring', undefined);
                sandbox.spy(window, 'getUserAttribute');
                ns.getContacts();
                sinon.assert.calledOnce(getUserAttribute);
                var callback = getUserAttribute.args[0][3];
                var theCtx = getUserAttribute.args[0][4];
                callback({'': aSerialisedRing}, theCtx);
                assert.deepEqual(u_authring, aRing);
            });

            it("internal callback error, custom callback", function() {
                sandbox.stub(window, 'u_authring', undefined);
                sandbox.spy(window, 'getUserAttribute');
                var myCallback = sinon.spy();
                ns.getContacts(myCallback);
                sinon.assert.calledOnce(getUserAttribute);
                var callback = getUserAttribute.args[0][3];
                var theCtx = getUserAttribute.args[0][4];
                callback(-3, theCtx);
                sinon.assert.calledOnce(myCallback);
                assert.deepEqual(myCallback.args[0][0], {});
                assert.deepEqual(u_authring, {});
            });

            it("internal callback, custom callback", function() {
                sandbox.stub(window, 'u_authring', undefined);
                sandbox.spy(window, 'getUserAttribute');
                var myCallback = sinon.spy();
                ns.getContacts(myCallback);
                sinon.assert.calledOnce(getUserAttribute);
                var callback = getUserAttribute.args[0][3];
                var theCtx = getUserAttribute.args[0][4];
                callback({'': aSerialisedRing}, theCtx);
                sinon.assert.calledOnce(myCallback);
                assert.deepEqual(myCallback.args[0][0], aRing);
                assert.deepEqual(u_authring, aRing);
            });
        });

        describe('setContacts()', function() {
            var aesKey = asmCrypto.bytes_to_string(asmCrypto.hex_to_bytes('0f0e0d0c0b0a09080706050403020100'));

            it("no custom callback", function() {
                sandbox.stub(window, 'u_authring', aRing);
                sandbox.stub(window, 'setUserAttribute');
                ns.setContacts();
                sinon.assert.calledOnce(setUserAttribute);
            });

            it("custom callback with error", function() {
                sandbox.stub(window, 'u_authring', aRing);
                sandbox.stub(window, 'u_k', aesKey);
                sandbox.stub(window, 'api_req');
                sandbox.spy(window, 'setUserAttribute');
                var myCallback = sinon.spy();
                ns.setContacts(myCallback);
                sinon.assert.calledOnce(setUserAttribute);
                var ctx = api_req.args[0][1];
                var callback = ctx.callback;
                callback(-3, ctx);
                sinon.assert.calledOnce(myCallback);
                assert.strictEqual(myCallback.args[0][0], -3);
            });

            it("custom callback", function() {
                sandbox.stub(window, 'u_authring', aRing);
                sandbox.stub(window, 'u_k', aesKey);
                sandbox.stub(window, 'api_req');
                sandbox.spy(window, 'setUserAttribute');
                var myCallback = sinon.spy();
                ns.setContacts(myCallback);
                sinon.assert.calledOnce(setUserAttribute);
                var ctx = api_req.args[0][1];
                var callback = ctx.callback;
                callback('me3456789xw', ctx);
                sinon.assert.calledOnce(myCallback);
                assert.strictEqual(myCallback.args[0][0], 'me3456789xw');
            });
        });
    });

    describe('computeFingerprint', function() {
        it("default format", function() {
            assert.strictEqual(ns.computeFingerprint(ED25519_PUB_KEY),
                               '5b27aa5589179770e47575b162a1ded97b8bfc6d');
        });

        it("hex", function() {
            assert.strictEqual(ns.computeFingerprint(ED25519_PUB_KEY, "hex"),
                               '5b27aa5589179770e47575b162a1ded97b8bfc6d');
        });

        it("string", function() {
            assert.strictEqual(base64urlencode(ns.computeFingerprint(ED25519_PUB_KEY, "string")),
                               'WyeqVYkXl3DkdXWxYqHe2XuL_G0');
        });
    });

    describe('equalFingerprints', function() {
        it("equality", function() {
            var tests = [['5b27aa5589179770e47575b162a1ded97b8bfc6d', '5b27aa5589179770e47575b162a1ded97b8bfc6d'],
                         [base64urldecode('WyeqVYkXl3DkdXWxYqHe2XuL_G0'), '5b27aa5589179770e47575b162a1ded97b8bfc6d'],
                         ['5b27aa5589179770e47575b162a1ded97b8bfc6d', base64urldecode('WyeqVYkXl3DkdXWxYqHe2XuL_G0')],
                         [base64urldecode('WyeqVYkXl3DkdXWxYqHe2XuL_G0'), base64urldecode('WyeqVYkXl3DkdXWxYqHe2XuL_G0')]];
            for (var i = 0; i < tests.length; i++) {
                assert.ok(ns.equalFingerprints(tests[i][0], tests[i][1]));
            }
        });

        it("inequality", function() {
            var tests = [['5b27aa5589179770e47575b162a1ded97b8bfc6e', '5b27aa5589179770e47575b162a1ded97b8bfc6d'],
                         [base64urldecode('XyeqVYkXl3DkdXWxYqHe2XuL_G0'), '5b27aa5589179770e47575b162a1ded97b8bfc6d'],
                         ['5b27aa5589179770e47575b162a1ded97b8bfc6e', base64urldecode('WyeqVYkXl3DkdXWxYqHe2XuL_G0')],
                         [base64urldecode('XyeqVYkXl3DkdXWxYqHe2XuL_G0'), base64urldecode('WyeqVYkXl3DkdXWxYqHe2XuL_G0')],
                         [undefined, '5b27aa5589179770e47575b162a1ded97b8bfc6d'],
                         ['5b27aa5589179770e47575b162a1ded97b8bfc6e', undefined],
                         [undefined, undefined]];
            for (var i = 0; i < tests.length; i++) {
                assert.notOk(ns.equalFingerprints(tests[i][0], tests[i][1]));
            }
        });

        it("undefined", function() {
            var tests = [[undefined, '5b27aa5589179770e47575b162a1ded97b8bfc6d'],
                         ['5b27aa5589179770e47575b162a1ded97b8bfc6e', undefined],
                         [undefined, undefined]];
            for (var i = 0; i < tests.length; i++) {
                assert.strictEqual(ns.equalFingerprints(tests[i][0], tests[i][1]), undefined);
            }
        });
    });

    describe('setContactAuthenticated()', function() {
        it("uninitialised", function() {
            sandbox.stub(window, 'u_authring', undefined);
            assert.throws(function() { ns.setContactAuthenticated('you456789xw',
                                                                  ED25519_STRING_FINGERPRINT,
                                                                  ns.AUTHENTICATION_METHOD.SEEN,
                                                                  ns.KEY_CONFIDENCE.UNSURE); },
                          'First initialise u_authring by calling authring.getContacts()');
        });

        it("normal behaviour", function() {
            sandbox.stub(window, 'u_authring', {});
            sandbox.stub(ns, 'setContacts');
            ns.setContactAuthenticated('you456789xw', ED25519_STRING_FINGERPRINT,
                                       ns.AUTHENTICATION_METHOD.SEEN, ns.KEY_CONFIDENCE.UNSURE);
            var expected = {'you456789xw': {fingerprint: ED25519_STRING_FINGERPRINT,
                                            method: 0, confidence: 0}};
            assert.deepEqual(u_authring, expected);
            sinon.assert.calledOnce(ns.setContacts);
        });

        it("don't add self", function() {
            sandbox.stub(window, 'u_authring', {});
            sandbox.stub(window, 'u_handle', 'me3456789xw');
            sandbox.stub(ns, 'setContacts');
            ns.setContactAuthenticated('me3456789xw', ED25519_STRING_FINGERPRINT,
                                       ns.AUTHENTICATION_METHOD.SEEN, ns.KEY_CONFIDENCE.UNSURE);
            assert.deepEqual(u_authring, {});
            sinon.assert.notCalled(ns.setContacts);
        });
    });

    describe('getContactAuthenticated()', function() {
        it("uninitialised", function() {
            sandbox.stub(window, 'u_authring', undefined);
            assert.throws(function() { ns.getContactAuthenticated('you456789xw'); },
                          'First initialise u_authring by calling authring.getContacts()');
        });

        it("unauthenticated contact", function() {
            sandbox.stub(window, 'u_authring', {});
            ns.getContactAuthenticated('you456789xw');
            assert.deepEqual(ns.getContactAuthenticated('you456789xw'), false);
        });

        it("authenticated contact", function() {
            var authenticated = {fingerprint: ED25519_STRING_FINGERPRINT,
                                 method: 0, confidence: 0};
            sandbox.stub(window, 'u_authring', {'you456789xw': authenticated});
            ns.getContactAuthenticated('you456789xw');
            assert.deepEqual(ns.getContactAuthenticated('you456789xw'), authenticated);
        });
    });
});
