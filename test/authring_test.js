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
    var ED25519_HEX_FINGERPRINT = '21fe31dfa154a261626bf854046fd2271b7bed4b';
    var ED25519_STRING_FINGERPRINT = base64urldecode('If4x36FUomFia/hUBG/SJxt77Us');
    var RSA_PUB_KEY = [atob('1XJHwX9WYEVk7KOack5nhOgzgnYWrVdt0UY2yn5Lw38mPzkVn'
                            + 'kHCmguqWIfL5bzVpbHHhlG9yHumvyyu9r1gKUMz4Y/1cf69'
                            + '1WIQmRGfg8dB2TeRUSvwb2A7EFGeFqQZHclgvpM2aq4PXrP'
                            + 'PmQAciTxjguxcL1lem/fXGd1X6KKxPJ+UfQ5TZbV4O2aOwY'
                            + 'uxys1YHh3mNHEp/xE1/fx292hdejPTJIX8IC5zjsss76e9P'
                            + 'SVOgSrz+jQQYKbKpT5Yamml98bEZuLY9ncMGUmw5q4WHi/O'
                            + 'dcvskHUydAL0qNOqbCwvt1Y7xIQfclR0SQE/AbwuJui0mt3'
                            + 'PuGjM42T/DQ=='),
                       atob('AQE='), 2048];
    var RSA_HEX_FINGERPRINT = '18ddac5acba45a711aaea54f4bb984e6c3eba37f';
    var RSA_STRING_FINGERPRINT = base64urldecode('GN2sWsukWnEarqVPS7mE5sPro38');
    var RSA_SIGNED_PUB_KEY = atob('AAAAAFPqtrj3Qr4d83Oz/Ya6svzJfeoSBtWPC7KBU4'
                                  + 'KqWMI8OX3eXT45+IyWCTTA5yeip/GThvkS8O2HBF'
                                  + 'aNLvSAFq5/5lQG');

    var SERIALISED_RING_ED25519 = atob('me3456789xwh/jHfoVSiYWJr+FQEb9InG3vtSwDKi7jnrvz3HCH+Md+hVKJhYmv4VARv0icbe+1LQg==');
    var RING_ED25519 = {'me3456789xw': {fingerprint: ED25519_STRING_FINGERPRINT,
                                        method: ns.AUTHENTICATION_METHOD.SEEN,
                                        confidence: ns.KEY_CONFIDENCE.UNSURE},
                        'you456789xw': {fingerprint: ED25519_STRING_FINGERPRINT,
                                        method: 0x02,
                                        confidence: 0x04}};
    var SERIALISED_RING_RSA = atob('me3456789xwY3axay6RacRqupU9LuYTmw+ujfwDKi7jnrvz3HBjdrFrLpFpxGq6lT0u5hObD66N/Qg==');
    var RING_RSA = {'me3456789xw': {fingerprint: RSA_STRING_FINGERPRINT,
                                    method: ns.AUTHENTICATION_METHOD.SEEN,
                                    confidence: ns.KEY_CONFIDENCE.UNSURE},
                    'you456789xw': {fingerprint: RSA_STRING_FINGERPRINT,
                                    method: 0x02,
                                    confidence: 0x04}};

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
            var expected = 'ohKpg1j6E64h/jHfoVSiYWJr+FQEb9InG3vtS0I=';
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
            var expected = 'me3456789xwh/jHfoVSiYWJr+FQEb9InG3vtSwDKi7jnrvz3HCH+Md+hVKJhYmv4VARv0icbe+1LQg==';
            assert.strictEqual(btoa(ns.serialise(test)), expected);
        });

        it('_splitSingleTAuthRecord()', function() {
            var tests = atob('me3456789xwh/jHfoVSiYWJr+FQEb9InG3vtSwDKi7jnrvz3HCH+Md+hVKJhYmv4VARv0icbe+1LQg==');
            var result = ns._deserialiseRecord(tests);
            assert.strictEqual(result.userhandle, 'me3456789xw');
            assert.deepEqual(result.value, {fingerprint: ED25519_STRING_FINGERPRINT,
                                            method: ns.AUTHENTICATION_METHOD.SEEN,
                                            confidence: ns.KEY_CONFIDENCE.UNSURE});
            assert.strictEqual(result.rest, base64urldecode('you456789xw') + ED25519_STRING_FINGERPRINT + String.fromCharCode(0x42));
        });

        it('deserialise()', function() {
            var tests = atob('me3456789xwh/jHfoVSiYWJr+FQEb9InG3vtSwDKi7jnrvz3HCH+Md+hVKJhYmv4VARv0icbe+1LQg==');
            var expected = {'me3456789xw': {fingerprint: ED25519_STRING_FINGERPRINT,
                                            method: ns.AUTHENTICATION_METHOD.SEEN,
                                            confidence: ns.KEY_CONFIDENCE.UNSURE},
                            'you456789xw': {fingerprint: ED25519_STRING_FINGERPRINT,
                                            method: 0x02,
                                            confidence: 0x04}};
            assert.deepEqual(ns.deserialise(tests), expected);
        });
    });

    describe('getting/setting u_authring.Ed25519', function() {
        describe('getContacts()', function() {
            it("API error", function() {
                sandbox.stub(window.console, 'error');
                sandbox.stub(u_authring, 'Ed25519', undefined);
                sandbox.stub(window, 'getUserAttribute').returns(new MegaPromise());
                var aPromise = ns.getContacts('Ed25519');
                assert.strictEqual(getUserAttribute.callCount, 1);
                assert.lengthOf(getUserAttribute.args[0], 4);
                assert.strictEqual(getUserAttribute.args[0][1], 'authring');
                aPromise.resolve(-3);
                assert.strictEqual(u_authring.Ed25519, undefined);
                assert.strictEqual(console.error.args[0][2],
                    'Error retrieving authentication ring for key type Ed25519: -3');
            });

            it("through API", function() {
                sandbox.stub(window.console, 'debug');
                sandbox.stub(u_authring, 'Ed25519', undefined);
                sandbox.stub(window, 'getUserAttribute').returns(new MegaPromise());
                var aPromise = ns.getContacts('Ed25519');
                assert.strictEqual(getUserAttribute.callCount, 1);
                assert.lengthOf(getUserAttribute.args[0], 4);
                assert.strictEqual(getUserAttribute.args[0][1], 'authring');
                aPromise.resolve({'': SERIALISED_RING_ED25519});
                assert.deepEqual(u_authring.Ed25519, RING_ED25519);
                assert.strictEqual(console.debug.args[0][2],
                    'Got authentication ring for key type Ed25519.');
            });

            it("unsupported key type", function() {
                assert.throws(function() { ns.getContacts('DSA'); },
                              'Unsupporte authentication key type: DSA');
            });

            it("authring for RSA", function() {
                sandbox.stub(window.console, 'debug');
                sandbox.stub(u_authring, 'RSA', undefined);
                sandbox.stub(window, 'getUserAttribute').returns(new MegaPromise());
                var aPromise = ns.getContacts('RSA');
                assert.strictEqual(getUserAttribute.callCount, 1);
                assert.lengthOf(getUserAttribute.args[0], 4);
                assert.strictEqual(getUserAttribute.args[0][1], 'authRSA');
                aPromise.resolve({'': SERIALISED_RING_RSA});
                assert.deepEqual(u_authring.RSA, RING_RSA);
                assert.strictEqual(console.debug.args[0][2],
                    'Got authentication ring for key type RSA.');
            });
        });

        describe('setContacts()', function() {
            var aesKey = asmCrypto.bytes_to_string(asmCrypto.hex_to_bytes('0f0e0d0c0b0a09080706050403020100'));

            it("authring for Ed25519", function() {
                sandbox.stub(u_authring, 'Ed25519', RING_ED25519);
                sandbox.stub(window, 'setUserAttribute').returns('foo');
                assert.strictEqual(ns.setContacts('Ed25519'), 'foo');
                assert.strictEqual(setUserAttribute.callCount, 1);
                assert.lengthOf(setUserAttribute.args[0], 4);
                assert.strictEqual(setUserAttribute.args[0][0], 'authring');
            });

            it("authring for RSA", function() {
                sandbox.stub(u_authring, 'RSA', RING_RSA);
                sandbox.stub(window, 'setUserAttribute').returns('foo');
                assert.strictEqual(ns.setContacts('RSA'), 'foo');
                assert.strictEqual(setUserAttribute.callCount, 1);
                assert.lengthOf(setUserAttribute.args[0], 4);
                assert.strictEqual(setUserAttribute.args[0][0], 'authRSA');
                assert.strictEqual(setUserAttribute.args[0][1][''], SERIALISED_RING_RSA);
            });

            it("unsupported key type", function() {
                assert.throws(function() { ns.setContacts('DSA'); },
                              'Unsupporte authentication key type: DSA');
            });
        });
    });

    describe('fingerprints and signing', function() {
        describe('computeFingerprint()', function() {
            it("default format Ed25519", function() {
                assert.strictEqual(ns.computeFingerprint(ED25519_PUB_KEY, 'Ed25519'),
                                   ED25519_HEX_FINGERPRINT);
            });

            it("hext Ed25519", function() {
                assert.strictEqual(ns.computeFingerprint(ED25519_PUB_KEY, 'Ed25519', "hex"),
                                   ED25519_HEX_FINGERPRINT);
            });

            it("stringt Ed25519", function() {
                assert.strictEqual(ns.computeFingerprint(ED25519_PUB_KEY, 'Ed25519', "string"),
                                   ED25519_STRING_FINGERPRINT);
            });

            it("default format RSA", function() {
                assert.strictEqual(ns.computeFingerprint(RSA_PUB_KEY, 'RSA'),
                                   RSA_HEX_FINGERPRINT);
            });

            it("hex RSA", function() {
                assert.strictEqual(ns.computeFingerprint(RSA_PUB_KEY, 'RSA', "hex"),
                                   RSA_HEX_FINGERPRINT);
            });

            it("stringRSA ", function() {
                assert.strictEqual(ns.computeFingerprint(RSA_PUB_KEY, 'RSA', "string"),
                                   RSA_STRING_FINGERPRINT);
            });

            it("unsupported key type", function() {
                assert.throws(function() { ns.computeFingerprint(RSA_PUB_KEY, 'DSA'); },
                              'Unsupporte key type: DSA');
            });
        });

        describe('signKey()', function() {
            it("all normal", function() {
                sandbox.stub(Date, 'now', function() { return 1407891127650; });
                sandbox.stub(window, 'u_privEd25519', ED25519_PRIV_KEY);
                sandbox.stub(window, 'u_pubEd25519', ED25519_PUB_KEY);
                assert.strictEqual(btoa(ns.signKey(RSA_PUB_KEY, 'RSA')),
                                   btoa(RSA_SIGNED_PUB_KEY));
            });

            it("unsupported key type", function() {
                assert.throws(function() { ns.signKey(RSA_PUB_KEY, 'DSA'); },
                              'Unsupporte key type: DSA');
            });
        });

        describe('verifyKey()', function() {
            it("good signature", function() {
                assert.strictEqual(ns.verifyKey(RSA_SIGNED_PUB_KEY, RSA_PUB_KEY, 'RSA', ED25519_PUB_KEY), true);
            });

            it("bad signature", function() {
                assert.strictEqual(ns.verifyKey(RSA_SIGNED_PUB_KEY.substring(0, 71) + String.fromCharCode(42),
                                                RSA_PUB_KEY, 'RSA', ED25519_PUB_KEY), false);
            });

            it("bad signature with bad timestamp", function() {
                sandbox.stub(Date, 'now', function() { return 1407891027650; });
                assert.throws(function() { return ns.verifyKey(RSA_SIGNED_PUB_KEY,
                                                               RSA_PUB_KEY, 'RSA', ED25519_PUB_KEY); },
                              'Bad timestamp: In the future!');
            });

            it("bad signature with bad point", function() {
                assert.strictEqual(ns.verifyKey(RSA_SIGNED_PUB_KEY.substring(0, 8) + String.fromCharCode(42) + RSA_SIGNED_PUB_KEY.substring(9),
                                                RSA_PUB_KEY, 'RSA', ED25519_PUB_KEY), false);
            });

            it("unsupported key type", function() {
                assert.throws(function() { ns.verifyKey(RSA_SIGNED_PUB_KEY, RSA_PUB_KEY, 'DSA', ED25519_PUB_KEY); },
                              'Unsupporte key type: DSA');
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
            sandbox.stub(u_authring, 'Ed25519', undefined);
            assert.throws(function() { ns.setContactAuthenticated('you456789xw',
                                                                  ED25519_STRING_FINGERPRINT,
                                                                  'Ed25519',
                                                                  ns.AUTHENTICATION_METHOD.SEEN,
                                                                  ns.KEY_CONFIDENCE.UNSURE); },
                          'First initialise u_authring by calling authring.getContacts()');
        });

        it("unsupported key type", function() {
            assert.throws(function() { ns.setContactAuthenticated('you456789xw',
                                                                  ED25519_STRING_FINGERPRINT,
                                                                  'DSA',
                                                                  ns.AUTHENTICATION_METHOD.SEEN,
                                                                  ns.KEY_CONFIDENCE.UNSURE); },
                          'Unsupporte key type: DSA');
        });

        it("normal behaviour Ed25519", function() {
            sandbox.stub(u_authring, 'Ed25519', {});
            sandbox.stub(ns, 'setContacts');
            ns.setContactAuthenticated('you456789xw', ED25519_STRING_FINGERPRINT, 'Ed25519',
                                       ns.AUTHENTICATION_METHOD.SEEN, ns.KEY_CONFIDENCE.UNSURE);
            var expected = {'you456789xw': {fingerprint: ED25519_STRING_FINGERPRINT,
                                            method: 0, confidence: 0}};
            assert.deepEqual(u_authring.Ed25519, expected);
            assert.strictEqual(ns.setContacts.callCount, 1);
            assert.strictEqual(ns.setContacts.args[0][0], 'Ed25519');
        });

        it("normal behaviou RSAr", function() {
            sandbox.stub(u_authring, 'RSA', {});
            sandbox.stub(ns, 'setContacts');
            ns.setContactAuthenticated('you456789xw', RSA_STRING_FINGERPRINT, 'RSA',
                                       ns.AUTHENTICATION_METHOD.SEEN, ns.KEY_CONFIDENCE.UNSURE);
            var expected = {'you456789xw': {fingerprint: RSA_STRING_FINGERPRINT,
                                            method: 0, confidence: 0}};
            assert.deepEqual(u_authring.RSA, expected);
            assert.strictEqual(ns.setContacts.callCount, 1);
            assert.strictEqual(ns.setContacts.args[0][0], 'RSA');
        });

        it("don't add self", function() {
            sandbox.stub(u_authring, 'Ed25519', {});
            sandbox.stub(window, 'u_handle', 'me3456789xw');
            sandbox.stub(ns, 'setContacts');
            ns.setContactAuthenticated('me3456789xw', ED25519_STRING_FINGERPRINT, 'Ed25519',
                                       ns.AUTHENTICATION_METHOD.SEEN, ns.KEY_CONFIDENCE.UNSURE);
            assert.deepEqual(u_authring.Ed25519, {});
            assert.strictEqual(ns.setContacts.callCount, 0);
        });
    });

    describe('getContactAuthenticated()', function() {
        it("uninitialised", function() {
            sandbox.stub(u_authring, 'Ed25519', undefined);
            assert.throws(function() { ns.getContactAuthenticated('you456789xw', 'Ed25519'); },
                          'First initialise u_authring by calling authring.getContacts()');
        });

        it("unsupported key type", function() {
            assert.throws(function() { ns.getContactAuthenticated('you456789xw', 'DSA'); },
                          'Unsupporte key type: DSA');
        });

        it("unauthenticated contact", function() {
            sandbox.stub(u_authring, 'Ed25519', {});
            assert.deepEqual(ns.getContactAuthenticated('you456789xw', 'Ed25519'), false);
        });

        it("authenticated contact Ed25519", function() {
            var authenticated = {fingerprint: ED25519_STRING_FINGERPRINT,
                                 method: 0, confidence: 0};
            sandbox.stub(u_authring, 'Ed25519', {'you456789xw': authenticated});
            assert.deepEqual(ns.getContactAuthenticated('you456789xw', 'Ed25519'), authenticated);
        });

        it("authenticated contact RSA", function() {
            var authenticated = {fingerprint: RSA_STRING_FINGERPRINT,
                                 method: 0, confidence: 0};
            sandbox.stub(u_authring, 'RSA', {'you456789xw': authenticated});
            assert.deepEqual(ns.getContactAuthenticated('you456789xw', 'RSA'), authenticated);
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

    describe('scrubber', function() {
        describe('scrubAuthRing()', function() {
            it("with populated u_authring", function() {
                u_authring = {'Ed25519': RING_ED25519, 'RSA': RING_RSA};
                sandbox.stub(ns, 'setContacts');
                ns.scrubAuthRing();
                assert.strictEqual(ns.setContacts.args.length, 2);
                assert.deepEqual(ns.setContacts.args[0], ['Ed25519']);
                assert.deepEqual(ns.setContacts.args[1], ['RSA']);
                assert.deepEqual(u_authring, {'Ed25519': {}, 'RSA': {}});
            });

            it("with unpopulated u_authring", function() {
                u_authring = {'Ed25519': {}, 'RSA': {}};
                sandbox.stub(ns, 'setContacts');
                ns.scrubAuthRing();
                assert.strictEqual(ns.setContacts.args.length, 2);
                assert.deepEqual(ns.setContacts.args[0], ['Ed25519']);
                assert.deepEqual(ns.setContacts.args[1], ['RSA']);
                assert.deepEqual(u_authring, {'Ed25519': {}, 'RSA': {}});
            });
        });
    });

    describe('authentication system start', function() {
        describe('setUpAuthenticationSystem()', function() {
            it('all from scratch', function() {
                sandbox.stub(console, 'debug');
                sandbox.stub(jodid25519.eddsa, 'generateKeySeed').returns('foo');
                sandbox.stub(jodid25519.eddsa, 'publicKey').returns('bar');
                sandbox.stub(window, 'u_attr', {});
                sandbox.stub(window, 'setUserAttribute').returns(new MegaPromise());
                sandbox.stub(window, 'crypto_decodepubkey');
                sandbox.stub(window, 'base64urldecode');
                sandbox.stub(window, 'base64urlencode');
                sandbox.stub(authring, 'signKey').returns('baz');
                sandbox.stub(ns, 'setContacts');
                sandbox.stub(MegaPromise, 'allDone').returns('blah');
                var result = ns.setUpAuthenticationSystem();
                assert.strictEqual(jodid25519.eddsa.generateKeySeed.callCount, 1);
                assert.strictEqual(jodid25519.eddsa.publicKey.callCount, 1);
                assert.strictEqual(setUserAttribute.callCount, 3);
                assert.strictEqual(setUserAttribute.callCount, 3);
                assert.strictEqual(setUserAttribute.args[0][0], 'puEd255');
                assert.strictEqual(setUserAttribute.args[0][2], true);
                assert.strictEqual(setUserAttribute.args[1][0], 'keyring');
                assert.strictEqual(setUserAttribute.args[1][2], false);
                assert.strictEqual(setUserAttribute.args[2][0], 'sigPubk');
                assert.strictEqual(setUserAttribute.args[2][2], true);
                assert.strictEqual(authring.signKey.callCount, 1);
                assert.strictEqual(authring.setContacts.callCount, 2);
                assert.strictEqual(MegaPromise.allDone.callCount, 1);
                assert.lengthOf(MegaPromise.allDone.args[0], 1);
                assert.lengthOf(MegaPromise.allDone.args[0][0], 5);
                assert.strictEqual(result, 'blah');
                assert.strictEqual(console.debug.args[0][2],
                                   'Setting up authentication system (Ed25519 keys, RSA pub key signature).');
            });
        });

        describe('_checkEd25519PubKey()', function() {
            it('passed check', function() {
                var getAttributePromise = { then: sinon.stub(),
                                            resolve: sinon.stub() };
                sandbox.stub(window, 'getUserAttribute').returns(getAttributePromise);
                sandbox.stub(window, 'base64urldecode').returns(ED25519_PUB_KEY);
                sandbox.stub(window, 'u_pubEd25519', ED25519_PUB_KEY);
                ns._checkEd25519PubKey();
                var callback = getAttributePromise.then.args[0][0];
                callback('foo', 'you456789xw');
                assert.strictEqual(getAttributePromise.resolve.callCount, 1);
            });

            it('outdated key', function() {
                sandbox.stub(console, 'info');
                sandbox.stub(console, 'debug');
                var getAttributePromise = { then: sinon.stub(),
                                            resolve: sinon.stub() };
                sandbox.stub(window, 'getUserAttribute').returns(getAttributePromise);
                var setAttributePromise = { then: sinon.stub(),
                                            resolve: sinon.stub() };
                sandbox.stub(window, 'setUserAttribute').returns(setAttributePromise);
                sandbox.stub(window, 'base64urldecode').returns(ED25519_PUB_KEY);
                sandbox.stub(window, 'u_pubEd25519', 'foo');
                ns._checkEd25519PubKey();
                var getCallback = getAttributePromise.then.args[0][0];
                getCallback('foo', 'you456789xw');
                var setCallback = setAttributePromise.then.args[0][0];
                setCallback('foo', 'you456789xw');
                assert.strictEqual(getAttributePromise.resolve.callCount, 1);
                assert.strictEqual(console.info.args[0][2],
                                   'Need to update Ed25519 pub key.');
                assert.strictEqual(console.debug.args[0][2],
                                   'Ed25519 pub key updated.');
            });

            it('getting key fails', function() {
                sandbox.stub(console, 'warn');
                sandbox.stub(console, 'debug');
                var getAttributePromise = { then: sinon.stub(),
                                            resolve: sinon.stub() };
                sandbox.stub(window, 'getUserAttribute').returns(getAttributePromise);
                var setAttributePromise = { then: sinon.stub(),
                                            resolve: sinon.stub() };
                sandbox.stub(window, 'setUserAttribute').returns(setAttributePromise);
                ns._checkEd25519PubKey();
                var getCallback = getAttributePromise.then.args[0][1];
                getCallback('foo', 'you456789xw');
                var setCallback = setAttributePromise.then.args[0][0];
                setCallback('foo', 'you456789xw');
                assert.strictEqual(getAttributePromise.resolve.callCount, 1);
                assert.strictEqual(console.warn.args[0][2],
                                   'Could not get my Ed25519 pub key, setting it now.');
                assert.strictEqual(console.debug.args[0][2],
                                   'Ed25519 pub key updated.');
            });

            it('key update fails', function() {
                sandbox.stub(console, 'info');
                sandbox.stub(console, 'error');
                var getAttributePromise = { then: sinon.stub(),
                                            reject: sinon.stub() };
                sandbox.stub(window, 'getUserAttribute').returns(getAttributePromise);
                var setAttributePromise = { then: sinon.stub(),
                                            resolve: sinon.stub() };
                sandbox.stub(window, 'setUserAttribute').returns(setAttributePromise);
                sandbox.stub(window, 'base64urldecode').returns(ED25519_PUB_KEY);
                sandbox.stub(window, 'u_pubEd25519', 'foo');
                ns._checkEd25519PubKey();
                var getCallback = getAttributePromise.then.args[0][0];
                getCallback('foo', 'you456789xw');
                var setCallback = setAttributePromise.then.args[0][1];
                setCallback('foo', 'you456789xw');
                assert.strictEqual(getAttributePromise.reject.callCount, 1);
                assert.strictEqual(console.info.args[0][2],
                                   'Need to update Ed25519 pub key.');
                assert.strictEqual(console.error.args[0][2],
                                   'Error updating Ed25519 pub key.');
            });
        });

        describe('initAuthenticationSystem()', function() {
            it('works normally', function() {
                sandbox.stub(authring, 'getContacts');
                sandbox.stub(MegaPromise, 'allDone');
                sandbox.stub(window, 'u_keyring', null);
                sandbox.stub(window, 'u_handle', 'me3456789xw');
                sandbox.stub(window, 'u_attr', {});
                sandbox.stub(window, 'u_privEd25519', null);
                sandbox.stub(window, 'u_pubEd25519', null);
                sandbox.stub(window, 'pubEd25519', {});
                sandbox.stub(ns, '_checkEd25519PubKey');
                sandbox.stub(jodid25519.eddsa, 'publicKey').returns(ED25519_PUB_KEY);
                var getAttributePromise = { then: sinon.stub(),
                                            resolve: sinon.stub() };
                sandbox.stub(window, 'getUserAttribute').returns(getAttributePromise);
                var collectivePromise = ns.initAuthenticationSystem();
                var getCallback = getAttributePromise.then.args[0][0];
                getCallback({ prEd255: ED25519_PRIV_KEY }, 'me3456789xw');
                assert.deepEqual(u_keyring, { prEd255: ED25519_PRIV_KEY });
                assert.deepEqual(u_attr.keyring, { prEd255: ED25519_PRIV_KEY });
                assert.strictEqual(u_privEd25519, ED25519_PRIV_KEY);
                assert.strictEqual(u_pubEd25519, ED25519_PUB_KEY);
                assert.strictEqual(u_attr.puEd255, ED25519_PUB_KEY);
                assert.strictEqual(pubEd25519[u_handle], ED25519_PUB_KEY);
                assert.strictEqual(jodid25519.eddsa.publicKey.callCount, 1);
                assert.strictEqual(ns._checkEd25519PubKey.callCount, 1);
                assert.strictEqual(getAttributePromise.resolve.callCount, 1);
                assert.strictEqual(authring.getContacts.callCount, 2);
                assert.strictEqual(MegaPromise.allDone.callCount, 1);
            });

            it('missing keyring, auth system setup succeeds', function() {
                sandbox.stub(authring, 'getContacts');
                sandbox.stub(MegaPromise, 'allDone');
                sandbox.stub(console, 'warn');
                var getAttributePromise = { then: sinon.stub(),
                                            resolve: sinon.stub() };
                sandbox.stub(window, 'getUserAttribute').returns(getAttributePromise);
                var setupAuthPromise = { then: sinon.stub(),
                                         resolve: sinon.stub() };
                sandbox.stub(ns, 'setUpAuthenticationSystem').returns(setupAuthPromise);
                var collectivePromise = ns.initAuthenticationSystem();
                var getCallback = getAttributePromise.then.args[0][1];
                getCallback(-9, 'foo');
                var setupAuthCallback = setupAuthPromise.then.args[0][0];
                setupAuthCallback(true, 'foo');
                assert.strictEqual(console.warn.args[0][2],
                                   'Authentication system seems unavailable.');
                assert.strictEqual(ns.setUpAuthenticationSystem.callCount, 1);
                assert.strictEqual(getAttributePromise.resolve.callCount, 1);
            });

            it('missing keyring, auth system setup fails', function() {
                sandbox.stub(authring, 'getContacts');
                sandbox.stub(MegaPromise, 'allDone');
                sandbox.stub(console, 'warn');
                var getAttributePromise = { then: sinon.stub(),
                                            reject: sinon.stub() };
                sandbox.stub(window, 'getUserAttribute').returns(getAttributePromise);
                var setupAuthPromise = { then: sinon.stub(),
                                         resolve: sinon.stub() };
                sandbox.stub(ns, 'setUpAuthenticationSystem').returns(setupAuthPromise);
                var collectivePromise = ns.initAuthenticationSystem();
                var getCallback = getAttributePromise.then.args[0][1];
                getCallback(-9, 'foo');
                var setupAuthCallback = setupAuthPromise.then.args[0][1];
                setupAuthCallback(false, 'foo');
                assert.strictEqual(console.warn.args[0][2],
                                   'Authentication system seems unavailable.');
                assert.strictEqual(ns.setUpAuthenticationSystem.callCount, 1);
                assert.strictEqual(getAttributePromise.reject.callCount, 1);
            });

            it('keyring get rejected', function() {
                sandbox.stub(authring, 'getContacts');
                sandbox.stub(MegaPromise, 'allDone');
                sandbox.stub(console, 'error');
                var getAttributePromise = { then: sinon.stub(),
                                            reject: sinon.stub() };
                sandbox.stub(window, 'getUserAttribute').returns(getAttributePromise);
                var collectivePromise = ns.initAuthenticationSystem();
                var getCallback = getAttributePromise.then.args[0][1];
                getCallback('foo', 'bar');
                assert.strictEqual(console.error.args[0][2],
                                   'Error retrieving Ed25519 authentication ring: foo');
                assert.strictEqual(getAttributePromise.reject.callCount, 1);
            });
        });
    });
});
