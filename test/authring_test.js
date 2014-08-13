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
    var ED25519_PRIV_KEY = atob('nWGxne/9WmC6hEr0kuwsxERJxWl7MmkZcDusAxyuf2A=');
    var ED25519_PUB_KEY = atob('11qYAYKxCrfVS/7TyWQHOg7hcvPapiMlrwIaaPcHURo=');
    var ED25519_HEX_FINGERPRINT = '5b27aa5589179770e47575b162a1ded97b8bfc6d';
    var ED25519_STRING_FINGERPRINT = base64urldecode('WyeqVYkXl3DkdXWxYqHe2XuL_G0');
    var RSA_PUB_KEY = [atob('1XJHwX9WYEVk7KOack5nhOgzgnYWrVdt0UY2yn5Lw38mPzkVn'
                            + 'kHCmguqWIfL5bzVpbHHhlG9yHumvyyu9r1gKUMz4Y/1cf69'
                            + '1WIQmRGfg8dB2TeRUSvwb2A7EFGeFqQZHclgvpM2aq4PXrP'
                            + 'PmQAciTxjguxcL1lem/fXGd1X6KKxPJ+UfQ5TZbV4O2aOwY'
                            + 'uxys1YHh3mNHEp/xE1/fx292hdejPTJIX8IC5zjsss76e9P'
                            + 'SVOgSrz+jQQYKbKpT5Yamml98bEZuLY9ncMGUmw5q4WHi/O'
                            + 'dcvskHUydAL0qNOqbCwvt1Y7xIQfclR0SQE/AbwuJui0mt3'
                            + 'PuGjM42T/DQ=='),
                       atob('AQE='), 2048];
    var RSA_HEX_FINGERPRINT = 'c8a7835ba37147f2f5bb60b059c9f003fa69a552';
    var RSA_STRING_FINGERPRINT = base64urldecode('yKeDW6NxR_L1u2CwWcnwA_pppVI');
    var RSA_SIGNED_PUB_KEY = atob('AAAAAFPqtrj3Qr4d83Oz/Ya6svzJfeoSBtWPC7KBU4'
                                  + 'KqWMI8OX3eXT45+IyWCTTA5yeip/GThvkS8O2HBF'
                                  + 'aNLvSAFq5/5lQG');

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

    describe('getting/setting u_authringRSA', function() {
        var aSerialisedRing = atob('me3456789xzIp4Nbo3FH8vW7YLBZyfAD+mmlUgDKi7jnrvz3HMing1ujcUfy9btgsFnJ8AP6aaVSQg==');
        var aRing = {'me3456789xw': {fingerprint: RSA_STRING_FINGERPRINT,
                                     method: ns.AUTHENTICATION_METHOD.SEEN,
                                     confidence: ns.KEY_CONFIDENCE.UNSURE},
                     'you456789xw': {fingerprint: RSA_STRING_FINGERPRINT,
                                     method: 0x02,
                                     confidence: 0x04}};

        describe('getContactsRSA()', function() {
            it("internal callback error, no custom callback", function() {
                sandbox.stub(window, 'u_authringRSA', undefined);
                sandbox.spy(window, 'getUserAttribute');
                ns.getContactsRSA();
                sinon.assert.calledOnce(getUserAttribute);
                var callback = getUserAttribute.args[0][3];
                var theCtx = getUserAttribute.args[0][4];
                callback(-3, theCtx);
                assert.deepEqual(u_authringRSA, {});
            });

            it("internal callback, no custom callback", function() {
                sandbox.stub(window, 'u_authringRSA', undefined);
                sandbox.spy(window, 'getUserAttribute');
                ns.getContactsRSA();
                sinon.assert.calledOnce(getUserAttribute);
                var callback = getUserAttribute.args[0][3];
                var theCtx = getUserAttribute.args[0][4];
                callback({'': aSerialisedRing}, theCtx);
                assert.deepEqual(u_authringRSA, aRing);
            });

            it("internal callback error, custom callback", function() {
                sandbox.stub(window, 'u_authringRSA', undefined);
                sandbox.spy(window, 'getUserAttribute');
                var myCallback = sinon.spy();
                ns.getContactsRSA(myCallback);
                sinon.assert.calledOnce(getUserAttribute);
                var callback = getUserAttribute.args[0][3];
                var theCtx = getUserAttribute.args[0][4];
                callback(-3, theCtx);
                sinon.assert.calledOnce(myCallback);
                assert.deepEqual(myCallback.args[0][0], {});
                assert.deepEqual(u_authringRSA, {});
            });

            it("internal callback, custom callback", function() {
                sandbox.stub(window, 'u_authringRSA', undefined);
                sandbox.spy(window, 'getUserAttribute');
                var myCallback = sinon.spy();
                ns.getContactsRSA(myCallback);
                sinon.assert.calledOnce(getUserAttribute);
                var callback = getUserAttribute.args[0][3];
                var theCtx = getUserAttribute.args[0][4];
                callback({'': aSerialisedRing}, theCtx);
                sinon.assert.calledOnce(myCallback);
                assert.deepEqual(myCallback.args[0][0], aRing);
                assert.deepEqual(u_authringRSA, aRing);
            });
        });

        describe('setContactsRSA()', function() {
            var aesKey = asmCrypto.bytes_to_string(asmCrypto.hex_to_bytes('0f0e0d0c0b0a09080706050403020100'));

            it("no custom callback", function() {
                sandbox.stub(window, 'u_authringRSA', aRing);
                sandbox.stub(window, 'setUserAttribute');
                ns.setContactsRSA();
                sinon.assert.calledOnce(setUserAttribute);
            });

            it("custom callback with error", function() {
                sandbox.stub(window, 'u_authringRSA', aRing);
                sandbox.stub(window, 'u_k', aesKey);
                sandbox.stub(window, 'api_req');
                sandbox.spy(window, 'setUserAttribute');
                var myCallback = sinon.spy();
                ns.setContactsRSA(myCallback);
                sinon.assert.calledOnce(setUserAttribute);
                var ctx = api_req.args[0][1];
                var callback = ctx.callback;
                callback(-3, ctx);
                sinon.assert.calledOnce(myCallback);
                assert.strictEqual(myCallback.args[0][0], -3);
            });

            it("custom callback", function() {
                sandbox.stub(window, 'u_authringRSA', aRing);
                sandbox.stub(window, 'u_k', aesKey);
                sandbox.stub(window, 'api_req');
                sandbox.spy(window, 'setUserAttribute');
                var myCallback = sinon.spy();
                ns.setContactsRSA(myCallback);
                sinon.assert.calledOnce(setUserAttribute);
                var ctx = api_req.args[0][1];
                var callback = ctx.callback;
                callback('me3456789xw', ctx);
                sinon.assert.calledOnce(myCallback);
                assert.strictEqual(myCallback.args[0][0], 'me3456789xw');
            });
        });
    });

    describe('fingerprints and signing', function() {
        describe('computeFingerprintEd25519()', function() {
            it("default format", function() {
                assert.strictEqual(ns.computeFingerprintEd25519(ED25519_PUB_KEY),
                                   ED25519_HEX_FINGERPRINT);
            });

            it("hex", function() {
                assert.strictEqual(ns.computeFingerprintEd25519(ED25519_PUB_KEY, "hex"),
                                   ED25519_HEX_FINGERPRINT);
            });

            it("string", function() {
                assert.strictEqual(ns.computeFingerprintEd25519(ED25519_PUB_KEY, "string"),
                                   ED25519_STRING_FINGERPRINT);
            });
        });

        describe('computeFingerprintRSA()', function() {
            it("default format", function() {
                assert.strictEqual(ns.computeFingerprintRSA(RSA_PUB_KEY),
                                   RSA_HEX_FINGERPRINT);
            });

            it("hex", function() {
                assert.strictEqual(ns.computeFingerprintRSA(RSA_PUB_KEY, "hex"),
                                   RSA_HEX_FINGERPRINT);
            });

            it("string", function() {
                assert.strictEqual(ns.computeFingerprintRSA(RSA_PUB_KEY, "string"),
                                   RSA_STRING_FINGERPRINT);
            });
        });

        describe('signRSAkey()', function() {
            it("all normal", function() {
                sandbox.stub(Date, 'now', function() { return 1407891127650; });
                sandbox.stub(window, 'u_privEd25519', ED25519_PRIV_KEY);
                sandbox.stub(window, 'u_pubEd25519', ED25519_PUB_KEY);
                assert.strictEqual(btoa(ns.signRSAkey(RSA_PUB_KEY)),
                                   btoa(RSA_SIGNED_PUB_KEY));
            });
        });

        describe('verifyRSAkey()', function() {
            it("good signature", function() {
                assert.strictEqual(ns.verifyRSAkey(RSA_SIGNED_PUB_KEY, RSA_PUB_KEY, ED25519_PUB_KEY), true);
            });

            it("bad signature", function() {
                assert.strictEqual(ns.verifyRSAkey(RSA_SIGNED_PUB_KEY.substring(0, 71) + String.fromCharCode(42),
                                                   RSA_PUB_KEY, ED25519_PUB_KEY), false);
            });

            it("bad signature with bad timestamp", function() {
                sandbox.stub(Date, 'now', function() { return 1407891027650; });
                assert.throws(function() { return ns.verifyRSAkey(RSA_SIGNED_PUB_KEY,
                                                                  RSA_PUB_KEY, ED25519_PUB_KEY); },
                              'Bad timestamp: In the future!');
            });

            it("bad signature with bad point", function() {
                assert.strictEqual(ns.verifyRSAkey(RSA_SIGNED_PUB_KEY.substring(0, 8) + String.fromCharCode(42) + RSA_SIGNED_PUB_KEY.substring(9),
                                                   RSA_PUB_KEY, ED25519_PUB_KEY), false);
            });
        });

        describe('equalFingerprints()', function() {
            it("equality", function() {
                var tests = [[ED25519_HEX_FINGERPRINT, ED25519_HEX_FINGERPRINT],
                             [ED25519_STRING_FINGERPRINT, ED25519_HEX_FINGERPRINT],
                             [ED25519_HEX_FINGERPRINT, ED25519_STRING_FINGERPRINT],
                             [ED25519_STRING_FINGERPRINT, ED25519_STRING_FINGERPRINT]];
                for (var i = 0; i < tests.length; i++) {
                    assert.ok(ns.equalFingerprints(tests[i][0], tests[i][1]));
                }
            });

            it("inequality", function() {
                var tests = [[RSA_HEX_FINGERPRINT, ED25519_HEX_FINGERPRINT],
                             [RSA_STRING_FINGERPRINT, ED25519_HEX_FINGERPRINT],
                             [RSA_HEX_FINGERPRINT, ED25519_STRING_FINGERPRINT],
                             [RSA_STRING_FINGERPRINT, ED25519_STRING_FINGERPRINT],
                             [undefined, ED25519_HEX_FINGERPRINT],
                             [RSA_HEX_FINGERPRINT, undefined],
                             [undefined, undefined]];
                for (var i = 0; i < tests.length; i++) {
                    assert.notOk(ns.equalFingerprints(tests[i][0], tests[i][1]));
                }
            });

            it("undefined", function() {
                var tests = [[undefined, ED25519_HEX_FINGERPRINT],
                             [RSA_HEX_FINGERPRINT, undefined],
                             [undefined, undefined]];
                for (var i = 0; i < tests.length; i++) {
                    assert.strictEqual(ns.equalFingerprints(tests[i][0], tests[i][1]), undefined);
                }
            });
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

    describe('integer conversion()', function() {
        describe('_longToByteString()', function() {
            it("simple tests", function() {
                var tests = [1407891127650, 0,
                             1, 3317330537000,
                             9007199254740991];
                var expected = ['00000147ccd9bd62', '0000000000000000',
                                '0000000000000001', '00000304604eea28',
                                '001fffffffffffff'];
                for (var i = 0; i < tests.length; i++) {
                    var expectedString = asmCrypto.bytes_to_string(asmCrypto.hex_to_bytes(expected[i]));
                    assert.strictEqual(ns._longToByteString(tests[i]), expectedString);
                }
            });

            it("value too big", function() {
                var tests = [9007199254740991 + 1];
                for (var i = 0; i < tests.length; i++) {
                    assert.throws(function() { ns._longToByteString(tests[i]); },
                                  'Integer not suitable for lossless conversion in JavaScript.');
                }
            });
        });

        describe('_byteStringToLong()', function() {
            it("simple tests", function() {
                var tests = ['00000147ccd9bd62', '0000000000000000',
                             '0000000000000001', '00000304604eea28',
                             '001fffffffffffff'];
                var expected = [1407891127650, 0,
                                1, 3317330537000,
                                9007199254740991];
                for (var i = 0; i < tests.length; i++) {
                    var testString = asmCrypto.bytes_to_string(asmCrypto.hex_to_bytes(tests[i]));
                    assert.strictEqual(ns._byteStringToLong(testString), expected[i]);
                }
            });

            it("value too big", function() {
                var tests = ['0020000000000000'];
                for (var i = 0; i < tests.length; i++) {
                    var testString = asmCrypto.bytes_to_string(asmCrypto.hex_to_bytes(tests[i]));
                    assert.throws(function() { ns._byteStringToLong(testString); },
                                  'Integer not suitable for lossless conversion in JavaScript.');
                }
            });
        });
    });
});
