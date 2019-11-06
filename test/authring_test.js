/**
 * @fileOverview
 * Authentication ring unit tests.
 */

describe("authring unit test", function() {
    "use strict";

    var assert = chai.assert;

    var ns = authring;

    // for anyone reading this line... never mock global stuff in unit tests...
    var origMegaPromise = MegaPromise;

    var _echo = function(x) { return x; };

    // Some test data.
    var ED25519_PRIV_KEY = atob('nWGxne/9WmC6hEr0kuwsxERJxWl7MmkZcDusAxyuf2A=');
    var ED25519_PUB_KEY = atob('11qYAYKxCrfVS/7TyWQHOg7hcvPapiMlrwIaaPcHURo=');
    var ED25519_PRIV_KEY_ARRAY = asmCrypto.string_to_bytes(ED25519_PRIV_KEY);
    var ED25519_PUB_KEY_ARRAY = asmCrypto.string_to_bytes(ED25519_PUB_KEY);
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

    var SERIALISED_RING_ED25519 = atob('me3456789xwh/jHfoVSiYWJr+FQEb9InG3vtSwDKi7jnrvz3HCH+Md+hVKJhYmv4VARv0icbe+1LAg==');
    var RING_ED25519 = {'me3456789xw': {fingerprint: ED25519_STRING_FINGERPRINT,
                                        method: ns.AUTHENTICATION_METHOD.SEEN,
                                        confidence: ns.KEY_CONFIDENCE.UNSURE},
                        'you456789xw': {fingerprint: ED25519_STRING_FINGERPRINT,
                                        method: ns.AUTHENTICATION_METHOD.SIGNATURE_VERIFIED,
                                        confidence: ns.KEY_CONFIDENCE.UNSURE}};
    var SERIALISED_RING_RSA = atob('me3456789xwY3axay6RacRqupU9LuYTmw+ujfwDKi7jnrvz3HBjdrFrLpFpxGq6lT0u5hObD66N/Ag==');
    var RING_RSA = {'me3456789xw': {fingerprint: RSA_STRING_FINGERPRINT,
                                    method: ns.AUTHENTICATION_METHOD.SEEN,
                                    confidence: ns.KEY_CONFIDENCE.UNSURE},
                    'you456789xw': {fingerprint: RSA_STRING_FINGERPRINT,
                                    method: ns.AUTHENTICATION_METHOD.SIGNATURE_VERIFIED,
                                    confidence: ns.KEY_CONFIDENCE.UNSURE}};

    var Mu = false;
    beforeEach(function() {
        mStub(attribCache, 'getItem').callsFake(function() {
            return MegaPromise.reject();
        });
        mStub(backgroundNacl.sign.detached, 'verify').callsFake(function() {
            return MegaPromise.resolve(
                nacl.sign.detached.verify.apply(this, arguments)
            );
        });
        Mu = M.u;

        M.u = {
            'me3456789xw': {
                'c': 2,
                'h': 'me3456789xw',
                'u': 'me3456789xw',
            },
            'you456789xw': {
                'c': 1,
                'h': 'you456789xw',
                'u': 'you456789xw',
            },
        };
    });

    afterEach(function() {
        mStub.restore();
        M.u = Mu;
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
            assert.strictEqual(ns.serialise(RING_ED25519), SERIALISED_RING_ED25519);
        });

        it('_splitSingleTAuthRecord()', function() {
            var result = ns._deserialiseRecord(SERIALISED_RING_ED25519);
            assert.strictEqual(result.userhandle, 'me3456789xw');
            assert.deepEqual(result.value, RING_ED25519['me3456789xw']);
            assert.strictEqual(result.rest,
                base64urldecode('you456789xw') + ED25519_STRING_FINGERPRINT + String.fromCharCode(0x02));
        });

        it('deserialise()', function() {
            assert.deepEqual(ns.deserialise(SERIALISED_RING_ED25519), RING_ED25519);
        });
    });

    describe('getting/setting u_authring.Ed25519', function() {
        describe('getContacts()', function() {
            it("API error", function() {
                mStub(ns._logger, '_log');
                mStub(u_authring, 'Ed25519', undefined);
                var masterPromise = { reject: sinon.stub() };
                mStub(window, 'MegaPromise').returns(masterPromise);
                var attributePromise = { done: sinon.stub(),
                                         fail:  sinon.stub()};
                mStub(mega.attr, 'get').returns(attributePromise);

                var aPromise = ns.getContacts('Ed25519');
                assert.strictEqual(aPromise, masterPromise);
                assert.strictEqual(mega.attr.get.callCount, 1);
                assert.lengthOf(mega.attr.get.args[0], 4);
                assert.strictEqual(mega.attr.get.args[0][1], 'authring');
                assert.strictEqual(attributePromise.done.callCount, 1);
                assert.strictEqual(attributePromise.fail.callCount, 1);

                var callback = attributePromise.done.args[0][0];
                callback(EFAILED);
                assert.strictEqual(masterPromise.reject.callCount, 1);
                assert.strictEqual(u_authring.Ed25519, undefined);
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Error retrieving authentication ring for key type Ed25519: -5');
            });

            it("API ENOENT", function() {
                mStub(ns._logger, '_log');
                mStub(u_authring, 'Ed25519', undefined);
                var masterPromise = { resolve: sinon.stub() };
                mStub(window, 'MegaPromise').returns(masterPromise);
                var attributePromise = { done: sinon.stub(),
                                         fail:  sinon.stub()};
                mStub(mega.attr, 'get').returns(attributePromise);
                mStub(ns, 'setContacts');

                var aPromise = ns.getContacts('Ed25519');
                assert.strictEqual(aPromise, masterPromise);
                assert.strictEqual(mega.attr.get.callCount, 1);
                assert.lengthOf(mega.attr.get.args[0], 4);
                assert.strictEqual(mega.attr.get.args[0][1], 'authring');
                assert.strictEqual(attributePromise.done.callCount, 1);
                assert.strictEqual(attributePromise.fail.callCount, 1);

                var callback = attributePromise.done.args[0][0];
                callback(ENOENT);
                assert.strictEqual(masterPromise.resolve.callCount, 1);
                assert.deepEqual(u_authring.Ed25519, {});
                assert.strictEqual(ns.setContacts.callCount, 1);
                assert.strictEqual(ns.setContacts.args[0][0], 'Ed25519');
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'No authentication ring for key type Ed25519, making one.');
            });

            it("normal operation", function() {
                mStub(ns._logger, '_log');
                mStub(u_authring, 'Ed25519', undefined);
                var masterPromise = { resolve: sinon.stub() };
                mStub(window, 'MegaPromise').returns(masterPromise);
                var attributePromise = { done: sinon.stub(),
                                         fail:  sinon.stub()};
                mStub(mega.attr, 'get').returns(attributePromise);
                mStub(ns, 'deserialise').returns('the authring');

                var aPromise = ns.getContacts('Ed25519');
                assert.strictEqual(aPromise, masterPromise);
                assert.strictEqual(mega.attr.get.callCount, 1);
                assert.lengthOf(mega.attr.get.args[0], 4);
                assert.strictEqual(mega.attr.get.args[0][1], 'authring');
                assert.strictEqual(attributePromise.done.callCount, 1);
                assert.strictEqual(attributePromise.fail.callCount, 1);

                var callback = attributePromise.done.args[0][0];
                callback({ '': 'some content' });
                assert.strictEqual(ns.deserialise.callCount, 1);
                assert.strictEqual(ns.deserialise.args[0][0], 'some content');
                assert.deepEqual(u_authring.Ed25519, 'the authring');
                assert.strictEqual(masterPromise.resolve.callCount, 1);
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Got authentication ring for key type Ed25519.');
            });

            it("reject API error", function() {
                mStub(ns._logger, '_log');
                mStub(u_authring, 'Ed25519', undefined);
                var masterPromise = { reject: sinon.stub() };
                mStub(window, 'MegaPromise').returns(masterPromise);
                var attributePromise = { done: sinon.stub(),
                                         fail:  sinon.stub()};
                mStub(mega.attr, 'get').returns(attributePromise);

                var aPromise = ns.getContacts('Ed25519');
                assert.strictEqual(aPromise, masterPromise);
                assert.strictEqual(mega.attr.get.callCount, 1);
                assert.lengthOf(mega.attr.get.args[0], 4);
                assert.strictEqual(mega.attr.get.args[0][1], 'authring');
                assert.strictEqual(attributePromise.done.callCount, 1);
                assert.strictEqual(attributePromise.fail.callCount, 1);

                var callback = attributePromise.fail.args[0][0];
                callback(EFAILED);
                assert.strictEqual(masterPromise.reject.callCount, 1);
                assert.strictEqual(u_authring.Ed25519, undefined);
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Error retrieving authentication ring for key type Ed25519: -5');
            });

            it("reject API ENOENT", function() {
                mStub(ns._logger, '_log');
                mStub(u_authring, 'Ed25519', undefined);
                var masterPromise = { resolve: sinon.stub() };
                mStub(window, 'MegaPromise').returns(masterPromise);
                var attributePromise = { done: sinon.stub(),
                                         fail:  sinon.stub()};
                mStub(mega.attr, 'get').returns(attributePromise);
                mStub(ns, 'setContacts');

                var aPromise = ns.getContacts('Ed25519');
                assert.strictEqual(aPromise, masterPromise);
                assert.strictEqual(mega.attr.get.callCount, 1);
                assert.lengthOf(mega.attr.get.args[0], 4);
                assert.strictEqual(mega.attr.get.args[0][1], 'authring');
                assert.strictEqual(attributePromise.done.callCount, 1);
                assert.strictEqual(attributePromise.fail.callCount, 1);

                var callback = attributePromise.fail.args[0][0];
                callback(ENOENT);
                assert.strictEqual(masterPromise.resolve.callCount, 1);
                assert.deepEqual(u_authring.Ed25519, {});
                assert.strictEqual(ns.setContacts.callCount, 1);
                assert.strictEqual(ns.setContacts.args[0][0], 'Ed25519');
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'No authentication ring for key type Ed25519, making one.');
            });

            it("unsupported key type", function() {
                mStub(ns._logger, '_log');
                var result = ns.getContacts('DSA');
                assert.strictEqual(result.state(), 'rejected');
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Unsupported authentication key type: DSA');
            });

            it("authring for RSA", function() {
                mStub(ns._logger, '_log');
                mStub(u_authring, 'RSA', undefined);
                var masterPromise = { resolve: sinon.stub() };
                mStub(window, 'MegaPromise').returns(masterPromise);
                var attributePromise = { done: sinon.stub(),
                                         fail:  sinon.stub()};
                mStub(mega.attr, 'get').returns(attributePromise);
                mStub(ns, 'deserialise').returns('the authring');

                var aPromise = ns.getContacts('RSA');
                assert.strictEqual(aPromise, masterPromise);
                assert.strictEqual(mega.attr.get.callCount, 1);
                assert.lengthOf(mega.attr.get.args[0], 4);
                assert.strictEqual(mega.attr.get.args[0][1], 'authRSA');
                assert.strictEqual(attributePromise.done.callCount, 1);
                assert.strictEqual(attributePromise.fail.callCount, 1);

                var callback = attributePromise.done.args[0][0];
                callback({ '': 'some content' });
                assert.strictEqual(ns.deserialise.callCount, 1);
                assert.strictEqual(ns.deserialise.args[0][0], 'some content');
                assert.deepEqual(u_authring.RSA, 'the authring');
                assert.strictEqual(masterPromise.resolve.callCount, 1);
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Got authentication ring for key type RSA.');
            });
        });

        describe('setContacts()', function() {
            var aesKey = asmCrypto.bytes_to_string(asmCrypto.hex_to_bytes('0f0e0d0c0b0a09080706050403020100'));

            it("authring for Ed25519", function() {
                mStub(u_authring, 'Ed25519', RING_ED25519);
                mStub(mega.attr, 'set').returns('foo');
                mStub(window, 'u_handle', 'Nxmg3MOw0CI');
                var fakePromise = { done: sinon.stub(),
                                    fail: function() {}};
                mStub(fakePromise, 'fail').returns(fakePromise);
                mStub(ns, 'onAuthringReady').returns(fakePromise);
                var masterPromise = { resolve: sinon.stub(),
                                      linkDoneAndFailTo: sinon.stub()};
                mStub(window, 'MegaPromise').returns(masterPromise);
                assert.strictEqual(ns.setContacts('Ed25519'), masterPromise);
                var callback = fakePromise.done.args[0][0];
                callback();
                assert.strictEqual(masterPromise.linkDoneAndFailTo.args[0][0], 'foo');
                assert.strictEqual(mega.attr.set.callCount, 1);
                assert.lengthOf(mega.attr.set.args[0], 4);
                assert.strictEqual(mega.attr.set.args[0][0], 'authring');
            });

            it("authring for RSA", function() {
                mStub(u_authring, 'RSA', RING_RSA);
                mStub(mega.attr, 'set').returns('foo');
                mStub(window, 'u_handle', 'Nxmg3MOw0CI');
                // typically M.u is mocked so that user me3456789xw is === u_handle,
                // but in this test, u_handle is set to Nxmg3MOw0CI, so, lets alter the M.u
                // so that it make sense in this context
                M.u['me3456789xw'].c = 1;
                M.u['Nxmg3MOw0CI'] = {
                    'u': 'Nxmg3MOw0CI',
                    'h': 'Nxmg3MOw0CI',
                    'c': 2
                };
                
                var fakePromise = { done: sinon.stub(),
                    fail: function() {}};
                mStub(fakePromise, 'fail').returns(fakePromise);
                mStub(ns, 'onAuthringReady').returns(fakePromise);
                var masterPromise = { resolve: sinon.stub(),
                    linkDoneAndFailTo: sinon.stub()};
                mStub(window, 'MegaPromise').returns(masterPromise);
                assert.strictEqual(ns.setContacts('RSA'), masterPromise);
                var callback = fakePromise.done.args[0][0];
                callback();
                assert.strictEqual(masterPromise.linkDoneAndFailTo.args[0][0], 'foo');
                assert.strictEqual(mega.attr.set.callCount, 1);
                assert.lengthOf(mega.attr.set.args[0], 4);
                assert.strictEqual(mega.attr.set.args[0][0], 'authRSA');
                assert.strictEqual(mega.attr.set.args[0][1][''], SERIALISED_RING_RSA);
            });

            it("unsupported key type", function() {
                mStub(ns._logger, '_log');
                var result = ns.setContacts('DSA');
                assert.strictEqual(result.state(), 'rejected');
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Unsupported authentication key type: DSA');
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
                mStub(ns._logger, '_log');
                var result = ns.computeFingerprint(RSA_PUB_KEY, 'DSA');
                assert.strictEqual(result, '');
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Unsupported key type: DSA');
            });
        });

        describe('signKey()', function() {
            it("all normal", function() {
                mStub(Date, 'now').callsFake(function() {
                    return 1407891127650;
                });
                mStub(window, 'u_privEd25519', ED25519_PRIV_KEY);
                mStub(window, 'u_pubEd25519', ED25519_PUB_KEY);
                assert.strictEqual(btoa(ns.signKey(RSA_PUB_KEY, 'RSA')),
                                   btoa(RSA_SIGNED_PUB_KEY));
            });

            it("unsupported key type", function() {
                mStub(ns._logger, '_log');
                var result = ns.signKey(RSA_PUB_KEY, 'DSA');
                assert.strictEqual(result, undefined);
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Unsupported key type: DSA');
            });

            it("no key given", function() {
                mStub(ns._logger, '_log');
                var result = ns.signKey(undefined, 'RSA');
                assert.strictEqual(result, undefined);
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'No key to sign.');
            });
        });

        describe('verifyKey()', function() {
            it("good signature", function(done) {
                ns.verifyKey(RSA_SIGNED_PUB_KEY, RSA_PUB_KEY, 'RSA', ED25519_PUB_KEY)
                    .done(function(r) {
                        assert.strictEqual(r, true);
                    })
                    .fail(function() {
                        assert.strictEqual(false, true);
                    })
                    .always(function() {
                        done();
                    });
            });

            it("bad signature", function(done) {
                ns.verifyKey(RSA_SIGNED_PUB_KEY.substring(0, 71) + String.fromCharCode(42),
                    RSA_PUB_KEY, 'RSA', ED25519_PUB_KEY)
                    .done(function(r) {
                        assert.strictEqual(r, false);
                    })
                    .fail(function() {
                        assert.strictEqual(true, false);
                    }).always(function() { done() });
            });

            it("empty signature", function(done) {
                mStub(ns._logger, '_log');
                var result = ns.verifyKey('', RSA_PUB_KEY, 'RSA', ED25519_PUB_KEY)
                    .done(function(r) {
                        assert.strictEqual(r, null);
                        assert.strictEqual(ns._logger._log.args[0][0],
                            'Cannot verify an empty signature.');
                    })
                    .fail(function() {
                        assert.strictEqual(true, false);
                    })
                    .always(function() { done() });

            });

            it("bad signature with bad timestamp", function(done) {
                mStub(ns._logger, '_log');
                mStub(Date, 'now').callsFake(function() {
                    return 1407891027650;
                });
                ns.verifyKey(RSA_SIGNED_PUB_KEY, RSA_PUB_KEY, 'RSA', ED25519_PUB_KEY)
                    .done(function(result) {
                        assert.strictEqual(result, null);
                        assert.strictEqual(ns._logger._log.args[0][0],
                            'Bad timestamp: In the future!');
                    })
                    .fail(function() {
                        assert.strictEqual(true, false);
                    })
                    .always(function() { done() });

            });

            it("bad signature with bad point", function(done) {
                ns.verifyKey(
                    RSA_SIGNED_PUB_KEY.substring(0, 8) + String.fromCharCode(42) + RSA_SIGNED_PUB_KEY.substring(9),
                                                RSA_PUB_KEY, 'RSA', ED25519_PUB_KEY)
                    .done(function(result) {
                        assert.strictEqual(result, false);
                    })
                    .fail(function() {
                        assert.strictEqual(true, false);
                    })
                    .always(function() { done() });
            });

            it("unsupported key type", function(done) {
                mStub(ns._logger, '_log');
                ns.verifyKey(RSA_SIGNED_PUB_KEY, RSA_PUB_KEY, 'DSA', ED25519_PUB_KEY)
                    .done(function(result) {
                        assert.strictEqual(result, null);
                        assert.strictEqual(ns._logger._log.args[0][0],
                            'Unsupported key type: DSA');
                    })
                    .fail(function() {
                        assert.strictEqual(true, false);
                    })
                    .always(function() { done() });

            });
        });

        describe('signKey()/verifyKey() roundtripping', function() {
            it("equality", function(done) {
                mStub(window, 'u_privEd25519', ED25519_PRIV_KEY);
                mStub(window, 'u_pubEd25519', ED25519_PUB_KEY);
                var buffer = new Uint8Array(256);
                var p1;
                var p2;
                var pubKey;
                var signature;
                for (var i = 0; i < 16; i++) {
                    asmCrypto.getRandomValues(buffer);
                    p1 = asmCrypto.bytes_to_string(buffer);
                    asmCrypto.getRandomValues(buffer);
                    p2 = asmCrypto.bytes_to_string(buffer);
                    pubKey = [p1, p2];
                    signature = ns.signKey(pubKey, 'RSA');
                    ns.verifyKey(signature, pubKey, 'RSA', ED25519_PUB_KEY)
                        .done(function(r) {
                            assert.strictEqual(r, true);
                        })
                        .fail(function(r) {
                            assert.strictEqual(false, true);
                        })
                        .always(function() {
                            done();
                        });
                }
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
            mStub(ns._logger, '_log');
            mStub(u_authring, 'Ed25519', undefined);
            var result = ns.setContactAuthenticated('you456789xw',
                                                    ED25519_STRING_FINGERPRINT,
                                                    'Ed25519',
                                                    ns.AUTHENTICATION_METHOD.SEEN,
                                                    ns.KEY_CONFIDENCE.UNSURE);
            assert.strictEqual(result, undefined);
            assert.strictEqual(ns._logger._log.args[0][0],
                               'First initialise u_authring by calling authring.getContacts()');
        });

        it("unsupported key type", function() {
            mStub(ns._logger, '_log');
            var result = ns.setContactAuthenticated('you456789xw',
                                                    ED25519_STRING_FINGERPRINT,
                                                    'DSA',
                                                    ns.AUTHENTICATION_METHOD.SEEN,
                                                    ns.KEY_CONFIDENCE.UNSURE);
            assert.strictEqual(result, undefined);
            assert.strictEqual(ns._logger._log.args[0][0],
                               'Unsupported key type: DSA');
        });

        it("normal behaviour Ed25519", function() {
            mStub(u_authring, 'Ed25519', {});
            mStub(ns, 'setContacts');
            ns.setContactAuthenticated('you456789xw', ED25519_STRING_FINGERPRINT, 'Ed25519',
                                       ns.AUTHENTICATION_METHOD.SEEN, ns.KEY_CONFIDENCE.UNSURE);
            var expected = {'you456789xw': {fingerprint: ED25519_STRING_FINGERPRINT,
                                            method: 0, confidence: 0}};
            assert.deepEqual(u_authring.Ed25519, expected);
            assert.strictEqual(ns.setContacts.callCount, 1);
            assert.strictEqual(ns.setContacts.args[0][0], 'Ed25519');
        });

        it("normal behaviou RSA", function() {
            mStub(u_authring, 'RSA', {});
            mStub(ns, 'setContacts');
            ns.setContactAuthenticated('you456789xw', RSA_STRING_FINGERPRINT, 'RSA',
                                       ns.AUTHENTICATION_METHOD.SEEN, ns.KEY_CONFIDENCE.UNSURE);
            var expected = {'you456789xw': {fingerprint: RSA_STRING_FINGERPRINT,
                                            method: 0, confidence: 0}};
            assert.deepEqual(u_authring.RSA, expected);
            assert.strictEqual(ns.setContacts.callCount, 1);
            assert.strictEqual(ns.setContacts.args[0][0], 'RSA');
        });

        it("no change", function() {
            var expected = {'you456789xw': {fingerprint: ED25519_STRING_FINGERPRINT,
                                            method: 0, confidence: 0}};
            mStub(u_authring, 'Ed25519', expected);
            mStub(ns, 'setContacts');
            ns.setContactAuthenticated('you456789xw', ED25519_STRING_FINGERPRINT, 'Ed25519',
                                       ns.AUTHENTICATION_METHOD.SEEN, ns.KEY_CONFIDENCE.UNSURE);
            assert.deepEqual(u_authring.Ed25519, expected);
            assert.strictEqual(ns.setContacts.callCount, 0);
        });

        it("don't add self", function() {
            mStub(u_authring, 'Ed25519', {});
            mStub(window, 'u_handle', 'me3456789xw');
            mStub(ns, 'setContacts');
            ns.setContactAuthenticated('me3456789xw', ED25519_STRING_FINGERPRINT, 'Ed25519',
                                       ns.AUTHENTICATION_METHOD.SEEN, ns.KEY_CONFIDENCE.UNSURE);
            assert.deepEqual(u_authring.Ed25519, {});
            assert.strictEqual(ns.setContacts.callCount, 0);
        });
    });

    describe('getContactAuthenticated()', function() {
        it("uninitialised", function() {
            mStub(ns._logger, '_log');
            mStub(u_authring, 'Ed25519', undefined);
            var result = ns.getContactAuthenticated('you456789xw', 'Ed25519');
            assert.strictEqual(result, false);
            assert.strictEqual(ns._logger._log.args[0][0],
                          'First initialise u_authring by calling authring.getContacts()');
        });

        it("unsupported key type", function() {
            mStub(ns._logger, '_log');
            var result = ns.getContactAuthenticated('you456789xw', 'DSA');
            assert.strictEqual(result, false);
            assert.strictEqual(ns._logger._log.args[0][0],
                               'Unsupported key type: DSA');
        });

        it("unauthenticated contact", function() {
            mStub(u_authring, 'Ed25519', {});
            assert.deepEqual(ns.getContactAuthenticated('you456789xw', 'Ed25519'), false);
        });

        it("authenticated contact Ed25519", function() {
            var authenticated = {fingerprint: ED25519_STRING_FINGERPRINT,
                                 method: 0, confidence: 0};
            mStub(u_authring, 'Ed25519', {'you456789xw': authenticated});
            assert.deepEqual(ns.getContactAuthenticated('you456789xw', 'Ed25519'), authenticated);
        });

        it("authenticated contact RSA", function() {
            var authenticated = {fingerprint: RSA_STRING_FINGERPRINT,
                                 method: 0, confidence: 0};
            mStub(u_authring, 'RSA', {'you456789xw': authenticated});
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
                mStub(ns._logger, '_log');
                var tests = [9007199254740991 + 1];
                var result;
                for (var i = 0; i < tests.length; i++) {
                    result = ns._longToByteString(tests[i]);
                    assert.strictEqual(result, '');
                    assert.strictEqual(ns._logger._log.args[0][0],
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
                mStub(ns._logger, '_log');
                var tests = ['0020000000000000'];
                var result;
                for (var i = 0; i < tests.length; i++) {
                    var testString = asmCrypto.bytes_to_string(asmCrypto.hex_to_bytes(tests[i]));
                    result = ns._byteStringToLong(testString);
                    assert.strictEqual(result, undefined);
                    assert.strictEqual(ns._logger._log.args[0][0],
                        'Integer not suitable for lossless conversion in JavaScript.');
                }
            });
        });
    });

    describe('scrubber', function() {
        describe('scrubAuthRing()', function() {
            it("with populated u_authring", function() {
                u_authring = {'Ed25519': RING_ED25519,
                              'Cu25519': {'foo': 'bar'},
                              'RSA': RING_RSA};
                mStub(ns, 'setContacts');
                ns.scrubAuthRing();
                assert.strictEqual(ns.setContacts.callCount, 3);
                assert.deepEqual(ns.setContacts.args[0], ['Ed25519']);
                assert.deepEqual(ns.setContacts.args[1], ['Cu25519']);
                assert.deepEqual(ns.setContacts.args[2], ['RSA']);
                assert.deepEqual(u_authring, {'Ed25519': {}, 'Cu25519': {}, 'RSA': {} });
            });

            it("with unpopulated u_authring", function() {
                u_authring = {'Ed25519': {}, 'Cu25519': {}, 'RSA': {}};
                mStub(ns, 'setContacts');
                ns.scrubAuthRing();
                assert.strictEqual(ns.setContacts.callCount, 3);
                assert.deepEqual(ns.setContacts.args[0], ['Ed25519']);
                assert.deepEqual(ns.setContacts.args[1], ['Cu25519']);
                assert.deepEqual(ns.setContacts.args[2], ['RSA']);
                assert.deepEqual(u_authring, {'Ed25519': {}, 'Cu25519': {}, 'RSA': {}});
            });
        });
    });

    describe('authentication system start', function() {
        describe('_checkPubKey()', function() {
            it('passed check', function() {
                var masterPromise = { resolve: sinon.stub() };
                mStub(window, 'MegaPromise').returns(masterPromise);
                var attributePromise = { done: sinon.stub(),
                                         fail: sinon.stub() };
                mStub(mega.attr, 'get').returns(attributePromise);
                mStub(window, 'base64urldecode').callsFake(_echo);

                var result = ns._checkPubKey('the key', 'Ed25519');
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(MegaPromise.callCount, 1);
                assert.strictEqual(mega.attr.get.callCount, 1);
                assert.strictEqual(attributePromise.done.callCount, 1);
                assert.strictEqual(attributePromise.fail.callCount, 1);

                var callback = attributePromise.done.args[0][0];
                result = callback('the key');
                assert.strictEqual(base64urldecode.callCount, 1);
                assert.strictEqual(masterPromise.resolve.callCount, 1);
                assert.strictEqual(masterPromise.resolve.args[0][0], true);
            });

            it('outdated key', function() {
                mStub(ns._logger, '_log');
                var masterPromise = { linkDoneAndFailTo: sinon.stub() };
                mStub(window, 'MegaPromise').returns(masterPromise);
                var attributePromise = { done: sinon.stub(),
                                         fail: sinon.stub() };
                mStub(mega.attr, 'get').returns(attributePromise);
                mStub(window, 'base64urldecode').callsFake(_echo);
                mStub(mega.attr, 'set');

                var result = ns._checkPubKey('the old key', 'Ed25519');
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(MegaPromise.callCount, 1);
                assert.strictEqual(mega.attr.get.callCount, 1);
                assert.strictEqual(attributePromise.done.callCount, 1);
                assert.strictEqual(attributePromise.fail.callCount, 1);

                var callback = attributePromise.done.args[0][0];
                result = callback('the key');
                assert.strictEqual(base64urldecode.callCount, 1);
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Need to update Ed25519 pub key.');
                assert.strictEqual(mega.attr.set.callCount, 1);
                assert.strictEqual(masterPromise.linkDoneAndFailTo.callCount, 1);
            });

            it('getting key fails', function() {
                mStub(ns._logger, '_log');
                var masterPromise = { linkDoneAndFailTo: sinon.stub() };
                mStub(window, 'MegaPromise').returns(masterPromise);
                var attributePromise = { done: sinon.stub(),
                                         fail: sinon.stub() };
                mStub(mega.attr, 'get').returns(attributePromise);
                mStub(mega.attr, 'set');

                var result = ns._checkPubKey('the key', 'Ed25519');
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(MegaPromise.callCount, 1);
                assert.strictEqual(mega.attr.get.callCount, 1);
                assert.strictEqual(attributePromise.done.callCount, 1);
                assert.strictEqual(attributePromise.fail.callCount, 1);

                var callback = attributePromise.fail.args[0][0];
                result = callback(ENOENT);
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Could not get my Ed25519 pub key, setting it now.');
                assert.strictEqual(mega.attr.set.callCount, 1);
                assert.strictEqual(masterPromise.linkDoneAndFailTo.callCount, 1);
            });

            it('unsupported key type', function() {
                mStub(ns._logger, '_log');
                var result = ns._checkPubKey('the key', 'RSA');
                assert.strictEqual(result.state(), 'rejected');
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Unsupported key type for pub key check: RSA');
            });
        });

        describe('initAuthenticationSystem()', function() {
            it('works normally', function() {
                mStub(ns, '_initialisingPromise', false);
                var masterPromise = _stubMegaPromise(sinon);
                var prefilledRsaKeysPromise = { linkDoneAndFailTo: sinon.stub() };
                mStub(window, 'MegaPromise');
                MegaPromise.onCall(0).returns(masterPromise);
                MegaPromise.onCall(1).returns(prefilledRsaKeysPromise);
                mStub(MegaPromise, 'all').returns('combo');
                var keyringPromise = { done: sinon.stub(),
                                       fail: sinon.stub() };
                mStub(ns, '_initKeyringAndEd25519').returns(keyringPromise);
                var rsaPromise = { done: sinon.stub() };
                mStub(ns, '_initKeyPair');
                ns._initKeyPair.onCall(0).returns(rsaPromise);
                ns._initKeyPair.onCall(1).returns('Cu25519');
                mStub(ns, '_initAndPreloadRSAKeys');

                var result = ns.initAuthenticationSystem();
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(MegaPromise.callCount, 1);
                assert.strictEqual(ns._initKeyringAndEd25519.callCount, 1);
                assert.strictEqual(keyringPromise.done.callCount, 1);
                assert.strictEqual(keyringPromise.fail.callCount, 1);

                var callback = keyringPromise.done.args[0][0];
                callback();
                assert.strictEqual(ns._initKeyPair.callCount, 2);
                assert.strictEqual(MegaPromise.all.callCount, 1);
                assert.strictEqual(MegaPromise.all.callCount, 1);
                assert.strictEqual(masterPromise.linkDoneAndFailTo.callCount, 1);
                assert.strictEqual(masterPromise.linkDoneAndFailTo.args[0][0], 'combo');
                assert.strictEqual(masterPromise.done.callCount, 1);
                assert.strictEqual(masterPromise.fail.callCount, 1);
                assert.strictEqual(rsaPromise.done.callCount, 1);

                callback = rsaPromise.done.args[0][0];
                callback();
                assert.strictEqual(prefilledRsaKeysPromise.linkDoneAndFailTo.callCount, 1);
                assert.strictEqual(ns._initAndPreloadRSAKeys.callCount, 1);
            });

            it('Ed25519 fails', function() {
                mStub(ns, '_initialisingPromise', false);
                var masterPromise = _stubMegaPromise(sinon, true);
                mStub(MegaPromise, 'all').returns('combo');
                var keyringPromise = _stubMegaPromise(sinon);
                mStub(ns, '_initKeyringAndEd25519').returns(keyringPromise);

                var result = ns.initAuthenticationSystem();
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(MegaPromise.callCount, 1);
                assert.strictEqual(ns._initKeyringAndEd25519.callCount, 1);
                assert.strictEqual(masterPromise.done.callCount, 1);
                assert.strictEqual(masterPromise.fail.callCount, 1);
                assert.strictEqual(keyringPromise.done.callCount, 1);
                assert.strictEqual(keyringPromise.fail.callCount, 1);

                var callback = keyringPromise.fail.args[0][0];
                callback();
                assert.strictEqual(masterPromise.fail.callCount, 1);
                assert.strictEqual(masterPromise.reject.callCount, 1);
            });
        });

        describe('_initKeyringAndEd25519()', function() {
            it('existing keyring', function() {
                var masterPromise = _stubMegaPromise(sinon, true);
                var attributePromise = _stubMegaPromise(sinon);
                mStub(mega.attr, 'get').returns(attributePromise);
                mStub(window, 'u_keyring', undefined);
                mStub(window, 'u_attr', {});
                mStub(window, 'u_privEd25519', undefined);
                mStub(window, 'u_pubEd25519', undefined);
                mStub(window, 'pubEd25519', {});
                mStub(window, 'u_handle', 'me3456789xw');
                mStub(asmCrypto, 'string_to_bytes').callsFake(_echo);
                mStub(nacl.sign.keyPair, 'fromSeed').callsFake(function(privKey) {
                    return { secretKey: privKey, publicKey: 'public key' };
                });
                mStub(asmCrypto, 'bytes_to_string').callsFake(_echo);
                mStub(mega.attr, 'set');
                mStub(ns, 'getContacts').returns('authring');
                mStub(ns, '_checkPubKey');
                mStub(crypt, 'setPubKey');

                var result = ns._initKeyringAndEd25519();
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(MegaPromise.callCount, 1);
                assert.strictEqual(mega.attr.get.callCount, 1);
                assert.strictEqual(mega.attr.get.args[0][1], 'keyring');
                assert.strictEqual(attributePromise.done.callCount, 1);
                assert.strictEqual(attributePromise.fail.callCount, 1);

                var keyRing = { prEd255: 'private key' };
                var resolveCallback = attributePromise.done.args[0][0];
                resolveCallback(keyRing);
                assert.deepEqual(u_keyring, keyRing);
                assert.strictEqual(u_privEd25519, 'private key');
                assert.strictEqual(asmCrypto.string_to_bytes.callCount, 1);
                assert.strictEqual(nacl.sign.keyPair.fromSeed.callCount, 1);
                assert.strictEqual(asmCrypto.bytes_to_string.callCount, 1);
                assert.strictEqual(u_pubEd25519, 'public key');
                assert.deepEqual(u_attr, { keyring: keyRing, puEd255: 'public key', prEd255: 'private key' });
                assert.deepEqual(pubEd25519, { 'me3456789xw': 'public key' });
                assert.strictEqual(authring.getContacts.callCount, 1);
                assert.strictEqual(masterPromise.linkDoneAndFailTo.callCount, 1);
                assert.strictEqual(masterPromise.linkDoneAndFailTo.args[0][0], 'authring');
            });

            it('no keyring', function() {
                mStub(ns._logger, '_log');
                var masterPromise = _stubMegaPromise(sinon, true);
                MegaPromise.all = sinon.stub;
                var attributePromise = _stubMegaPromise(sinon);
                mStub(mega.attr, 'get').returns(attributePromise);
                mStub(window, 'u_keyring', undefined);
                mStub(window, 'u_attr', {});
                mStub(window, 'u_privEd25519', undefined);
                mStub(window, 'u_pubEd25519', undefined);
                mStub(window, 'pubEd25519', {});
                mStub(window, 'u_handle', 'me3456789xw');
                mStub(asmCrypto, 'bytes_to_string').callsFake(_echo);
                mStub(mega.attr, 'set').returns('attribute');
                mStub(ns, 'getContacts').returns('authring');
                mStub(nacl.sign, 'keyPair').returns({
                    secretKey: { subarray: sinon.stub().returns('private key') },
                    publicKey: 'public key'
                });

                var result = ns._initKeyringAndEd25519();
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(MegaPromise.callCount, 1);
                assert.strictEqual(mega.attr.get.callCount, 1);
                assert.strictEqual(mega.attr.get.args[0][1], 'keyring');
                assert.strictEqual(attributePromise.done.callCount, 1);
                assert.strictEqual(attributePromise.fail.callCount, 1);

                var keyRing = { prEd255: 'private key' };
                var resolveCallback = attributePromise.fail.args[0][0];
                resolveCallback(ENOENT);
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Authentication system seems non-existent. Setting up ...');
                assert.strictEqual(nacl.sign.keyPair.callCount, 1);
                assert.strictEqual(asmCrypto.bytes_to_string.callCount, 2);
                assert.deepEqual(u_keyring, keyRing);
                assert.strictEqual(u_privEd25519, 'private key');
                assert.strictEqual(u_pubEd25519, 'public key');
                assert.deepEqual(u_attr, { keyring: keyRing, puEd255: 'public key', prEd255: 'private key' });
                assert.deepEqual(pubEd25519, { 'me3456789xw': 'public key' });
                assert.strictEqual(authring.getContacts.callCount, 1);
                assert.strictEqual(masterPromise.linkDoneAndFailTo.callCount, 1);
                assert.deepEqual(masterPromise.linkDoneAndFailTo.args[0][0],
                    ['attribute', 'attribute', 'authring']);
            });

            it('failed fetching keyring', function() {
                mStub(ns._logger, '_log');
                var masterPromise = _stubMegaPromise(sinon, true);
                var attributePromise = _stubMegaPromise(sinon);
                mStub(mega.attr, 'get').returns(attributePromise);

                var result = ns._initKeyringAndEd25519();
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(MegaPromise.callCount, 1);
                assert.strictEqual(mega.attr.get.callCount, 1);
                assert.strictEqual(mega.attr.get.args[0][1], 'keyring');
                assert.strictEqual(attributePromise.done.callCount, 1);
                assert.strictEqual(attributePromise.fail.callCount, 1);

                var resolveCallback = attributePromise.fail.args[0][0];
                resolveCallback(EFAILED);
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Error retrieving key ring: -5');
                assert.strictEqual(masterPromise.reject.callCount, 1);
            });
        });

        describe('_setupKeyPair()', function() {
            it('Curve25519 key', function() {
                mStub(window, 'MegaPromise');
                MegaPromise.all = sinon.stub().returns('all');
                mStub(nacl.box, 'keyPair').returns(
                    { secretKey: 'private key', publicKey: 'public key' });
                mStub(asmCrypto, 'bytes_to_string').callsFake(_echo);
                mStub(window, 'u_keyring', {});
                mStub(window, 'u_attr', {keyring: {}});
                mStub(window, 'u_privCu25519', undefined);
                mStub(window, 'u_pubCu25519', undefined);
                mStub(window, 'pubCu25519', {});
                mStub(window, 'u_handle', 'me3456789xw');
                mStub(ns, 'signKey').returns('squiggle');
                mStub(mega.attr, 'set').returns('attribute');
                mStub(window, 'base64urlencode');
                mStub(ns, 'getContacts').returns('contacts');

                var result = ns._setupKeyPair('Cu25519');
                assert.strictEqual(result, 'all');
                assert.strictEqual(nacl.box.keyPair.callCount, 1);
                assert.strictEqual(asmCrypto.bytes_to_string.callCount, 2);
                var keyRing = { prCu255: 'private key' };
                assert.deepEqual(u_keyring, keyRing);
                assert.strictEqual(u_privCu25519, 'private key');
                assert.strictEqual(u_pubCu25519, 'public key');
                assert.deepEqual(u_attr, { keyring: keyRing, puCu255: 'public key', prCu255: 'private key' });
                assert.deepEqual(pubCu25519, { 'me3456789xw': 'public key' });
                assert.strictEqual(ns.signKey.callCount, 1);
                assert.strictEqual(mega.attr.set.callCount, 3);
                assert.strictEqual(ns.getContacts.callCount, 1);
                assert.strictEqual(MegaPromise.all.callCount, 1);
                assert.deepEqual(MegaPromise.all.args[0][0],
                    ['attribute', 'attribute', 'contacts', 'attribute']);
            });

            it('unsupported key', function() {
                mStub(ns._logger, '_log');
                var result = ns._setupKeyPair('Ed25519');
                assert.strictEqual(result.state(), 'rejected');
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Unsupported key type for key generation: Ed25519');
            });
        });

        describe('_initKeyPair()', function() {
            it('unsupported key', function() {
                mStub(ns._logger, '_log');
                var result = ns._initKeyPair('Ed25519');
                assert.strictEqual(result.state(), 'rejected');
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Unsupported key type for initialisation: Ed25519');
            });

            it('Curve25519 key', function() {
                mStub(ns, 'verifyKey').returns(origMegaPromise.resolve(true));

                var masterPromise = { resolve: sinon.stub(),
                                      linkFailTo: sinon.stub() };
                var pubkeyPromise = { done: sinon.stub(),
                                      resolve: sinon.stub() };

                mStub(window, 'MegaPromise');
                MegaPromise.onCall(0).returns(masterPromise);
                MegaPromise.onCall(1).returns(pubkeyPromise);
                var gotSignaturePromise = { resolve: sinon.stub() };
                MegaPromise.onCall(2).returns(gotSignaturePromise);
                var sigKeyComboPromise = { done: sinon.stub(),
                                           fail: sinon.stub() };
                MegaPromise.all = sinon.stub();
                MegaPromise.all.onCall(0).returns(sigKeyComboPromise);
                MegaPromise.all.onCall(1).returns('combo promise');
                mStub(ns, 'getContacts').returns('contacts');
                var signaturePromise = { done: sinon.stub(),
                                         fail: sinon.stub() };
                mStub(mega.attr, 'get').returns(signaturePromise);
                mStub(window, 'u_keyring', {prCu255: 'private key'});
                mStub(window, 'u_attr', {keyring: {}});
                mStub(window, 'u_privCu25519', undefined);
                mStub(window, 'u_pubCu25519', undefined);
                mStub(window, 'pubCu25519', {});
                mStub(window, 'u_handle', 'me3456789xw');
                mStub(window, 'u_privEd25519', 'my private Eddie');
                mStub(window, 'u_pubEd25519', 'my public Eddie');
                mStub(window, 'base64urldecode').callsFake(_echo);
                mStub(crypt, 'getPubKeyFromPrivKey').returns('public key');
                mStub(ns, '_checkPubKey');
                mStub(crypt, 'setPubKey');

                var result = ns._initKeyPair('Cu25519');
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(ns.getContacts.callCount, 1);
                assert.strictEqual(mega.attr.get.callCount, 1);
                assert.strictEqual(crypt.getPubKeyFromPrivKey.callCount, 1);
                assert.strictEqual(MegaPromise.callCount, 3);
                assert.strictEqual(pubkeyPromise.resolve.callCount, 1);
                assert.strictEqual(pubkeyPromise.done.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.callCount, 2);
                assert.strictEqual(masterPromise.linkFailTo.args[0][0], pubkeyPromise);
                assert.strictEqual(signaturePromise.done.callCount, 1);
                assert.strictEqual(signaturePromise.done.callCount, 1);
                assert.strictEqual(MegaPromise.all.callCount, 1);
                assert.strictEqual(sigKeyComboPromise.done.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.args[1][0], sigKeyComboPromise);

                var callback = pubkeyPromise.done.args[0][0];
                // Nothing happens here for a Cu25519 key pair.

                callback = signaturePromise.done.args[0][0];
                callback('squiggle');
                assert.strictEqual(base64urldecode.callCount, 1);
                assert.strictEqual(gotSignaturePromise.resolve.callCount, 1);
                assert.strictEqual(gotSignaturePromise.resolve.args[0][0], 'squiggle');

                callback = sigKeyComboPromise.done.args[0][0];
                callback(['squiggle', 'Cu25519 pubkey']);
                assert.strictEqual(ns.verifyKey.callCount, 1);
                assert.strictEqual(masterPromise.resolve.callCount, 1);
                assert.strictEqual(ns._checkPubKey.callCount, 1);
                assert.strictEqual(crypt.setPubKey.callCount, 1);
                var keyRing = { prCu255: 'private key' };
                assert.deepEqual(u_keyring, keyRing);
                assert.strictEqual(u_privCu25519, 'private key');
                assert.strictEqual(u_pubCu25519, 'public key');
                assert.deepEqual(u_attr, { keyring: keyRing, puCu255: 'public key', prCu255: 'private key' });
                assert.deepEqual(pubCu25519, { 'me3456789xw': 'public key' });
            });

            it('RSA key', function() {
                mStub(ns, 'verifyKey').returns(origMegaPromise.resolve(true));

                var masterPromise = { resolve: sinon.stub(),
                                      linkFailTo: sinon.stub() };
                mStub(window, 'MegaPromise');
                MegaPromise.onCall(0).returns(masterPromise);
                var gotSignaturePromise = { resolve: sinon.stub() };
                MegaPromise.onCall(1).returns(gotSignaturePromise);
                var sigKeyComboPromise = { done: sinon.stub(),
                                           fail: sinon.stub() };
                MegaPromise.all = sinon.stub();
                MegaPromise.all.onCall(0).returns(sigKeyComboPromise);
                MegaPromise.all.onCall(1).returns('combo promise');
                mStub(ns, 'getContacts').returns('contacts');
                var signaturePromise = { done: sinon.stub(),
                                         fail: sinon.stub() };
                mStub(mega.attr, 'get').returns(signaturePromise);
                mStub(window, 'u_privk', 'private key');
                mStub(window, 'u_handle', 'me3456789xw');
                mStub(window, 'u_privEd25519', 'my private Eddie');
                mStub(window, 'u_pubEd25519', 'my public Eddie');
                mStub(window, 'base64urldecode').callsFake(_echo);
                var pubkeyPromise = { done: sinon.stub(),
                                      resolve: sinon.stub() };
                mStub(crypt, 'getPubKeyAttribute').returns(pubkeyPromise);

                var result = ns._initKeyPair('RSA');
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(MegaPromise.callCount, 2);
                assert.strictEqual(ns.getContacts.callCount, 1);
                assert.strictEqual(mega.attr.get.callCount, 1);
                assert.strictEqual(crypt.getPubKeyAttribute.callCount, 1);
                assert.strictEqual(pubkeyPromise.done.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.callCount, 2);
                assert.strictEqual(masterPromise.linkFailTo.args[0][0], pubkeyPromise);
                assert.strictEqual(signaturePromise.done.callCount, 1);
                assert.strictEqual(signaturePromise.done.callCount, 1);
                assert.strictEqual(MegaPromise.all.callCount, 1);
                assert.strictEqual(sigKeyComboPromise.done.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.args[1][0], sigKeyComboPromise);

                var callback = pubkeyPromise.done.args[0][0];
                // Nothing testable happens here for an RSA key pair.

                callback = signaturePromise.done.args[0][0];
                callback('squiggle');
                assert.strictEqual(base64urldecode.callCount, 1);
                assert.strictEqual(gotSignaturePromise.resolve.callCount, 1);
                assert.strictEqual(gotSignaturePromise.resolve.args[0][0], 'squiggle');

                callback = sigKeyComboPromise.done.args[0][0];
                callback(['squiggle', 'RSA pubkey']);
                assert.strictEqual(ns.verifyKey.callCount, 1);
                assert.strictEqual(masterPromise.resolve.callCount, 1);
            });

            it('RSA key, no signature', function() {
                var masterPromise = { resolve: sinon.stub(),
                                      linkFailTo: sinon.stub() };
                mStub(window, 'MegaPromise');
                MegaPromise.onCall(0).returns(masterPromise);
                var gotSignaturePromise = { resolve: sinon.stub() };
                MegaPromise.onCall(1).returns(gotSignaturePromise);
                var sigKeyComboPromise = { done: sinon.stub(),
                                           fail: sinon.stub() };
                MegaPromise.all = sinon.stub();
                MegaPromise.all.onCall(0).returns(sigKeyComboPromise);
                MegaPromise.all.onCall(1).returns('combo promise');
                mStub(ns, 'getContacts').returns('contacts');
                var signaturePromise = { done: sinon.stub(),
                                         fail: sinon.stub() };
                mStub(mega.attr, 'get').returns(signaturePromise);
                mStub(window, 'u_privk', 'private key');
                mStub(window, 'u_handle', 'me3456789xw');
                mStub(window, 'u_privEd25519', 'my private Eddie');
                mStub(window, 'u_pubEd25519', 'my public Eddie');
                var pubkeyPromise = { done: sinon.stub(),
                                      resolve: sinon.stub() };
                mStub(crypt, 'getPubKeyAttribute').returns(pubkeyPromise);
                mStub(mega.attr, 'set');
                mStub(ns, 'signKey').returns('squiggle');
                mStub(window, 'base64urlencode').callsFake(_echo);

                var result = ns._initKeyPair('RSA');
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(MegaPromise.callCount, 2);
                assert.strictEqual(ns.getContacts.callCount, 1);
                assert.strictEqual(mega.attr.get.callCount, 1);
                assert.strictEqual(crypt.getPubKeyAttribute.callCount, 1);
                assert.strictEqual(pubkeyPromise.done.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.callCount, 2);
                assert.strictEqual(masterPromise.linkFailTo.args[0][0], pubkeyPromise);
                assert.strictEqual(signaturePromise.done.callCount, 1);
                assert.strictEqual(signaturePromise.done.callCount, 1);
                assert.strictEqual(MegaPromise.all.callCount, 1);
                assert.strictEqual(sigKeyComboPromise.done.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.args[1][0], sigKeyComboPromise);

                var callback = pubkeyPromise.done.args[0][0];
                // Nothing testable happens here for an RSA key pair.

                callback = signaturePromise.fail.args[0][0];
                callback(ENOENT);
                assert.strictEqual(gotSignaturePromise.resolve.callCount, 1);
                assert.strictEqual(gotSignaturePromise.resolve.args[0][0], null);

                callback = sigKeyComboPromise.done.args[0][0];
                callback([null, 'RSA pubkey']);
                assert.strictEqual(ns.signKey.callCount, 1);
                assert.strictEqual(base64urlencode.callCount, 1);
                assert.strictEqual(mega.attr.set.callCount, 1);
                assert.strictEqual(mega.attr.set.args[0][1], 'squiggle');
                assert.strictEqual(masterPromise.resolve.callCount, 1);
            });

            it('RSA key, signature API error', function() {
                var masterPromise = { resolve: sinon.stub(),
                                      linkFailTo: sinon.stub() };
                mStub(window, 'MegaPromise');
                MegaPromise.onCall(0).returns(masterPromise);
                var gotSignaturePromise = { reject: sinon.stub() };
                MegaPromise.onCall(1).returns(gotSignaturePromise);
                var sigKeyComboPromise = { done: sinon.stub(),
                                           fail: sinon.stub() };
                MegaPromise.all = sinon.stub();
                MegaPromise.all.onCall(0).returns(sigKeyComboPromise);
                MegaPromise.all.onCall(1).returns('combo promise');
                mStub(ns, 'getContacts').returns('contacts');
                var signaturePromise = { done: sinon.stub(),
                                         fail: sinon.stub() };
                mStub(mega.attr, 'get').returns(signaturePromise);
                mStub(window, 'u_privk', 'private key');
                mStub(window, 'u_handle', 'me3456789xw');
                mStub(window, 'u_privEd25519', 'my private Eddie');
                mStub(window, 'u_pubEd25519', 'my public Eddie');
                var pubkeyPromise = { done: sinon.stub(),
                                      resolve: sinon.stub() };
                mStub(crypt, 'getPubKeyAttribute').returns(pubkeyPromise);

                var result = ns._initKeyPair('RSA');
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(MegaPromise.callCount, 2);
                assert.strictEqual(ns.getContacts.callCount, 1);
                assert.strictEqual(mega.attr.get.callCount, 1);
                assert.strictEqual(crypt.getPubKeyAttribute.callCount, 1);
                assert.strictEqual(pubkeyPromise.done.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.callCount, 2);
                assert.strictEqual(masterPromise.linkFailTo.args[0][0], pubkeyPromise);
                assert.strictEqual(signaturePromise.done.callCount, 1);
                assert.strictEqual(signaturePromise.done.callCount, 1);
                assert.strictEqual(MegaPromise.all.callCount, 1);
                assert.strictEqual(sigKeyComboPromise.done.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.args[1][0], sigKeyComboPromise);

                var callback = pubkeyPromise.done.args[0][0];
                // Nothing testable happens here for an RSA key pair.

                callback = signaturePromise.fail.args[0][0];
                callback(EFAILED);
                assert.strictEqual(gotSignaturePromise.reject.callCount, 1);
                assert.strictEqual(gotSignaturePromise.reject.args[0][0], EFAILED);
            });

            it('RSA key, invalid signature', function() {
                mStub(ns, 'verifyKey').returns(origMegaPromise.resolve(false));

                var masterPromise = { linkDoneAndFailTo: sinon.stub(),
                                      linkFailTo: sinon.stub() };
                mStub(window, 'MegaPromise');
                MegaPromise.onCall(0).returns(masterPromise);
                var gotSignaturePromise = { resolve: sinon.stub() };
                MegaPromise.onCall(1).returns(gotSignaturePromise);
                var sigKeyComboPromise = { done: sinon.stub(),
                                           fail: sinon.stub() };
                MegaPromise.all = sinon.stub();
                MegaPromise.all.onCall(0).returns(sigKeyComboPromise);
                MegaPromise.all.onCall(1).returns('combo promise');
                mStub(ns, 'getContacts').returns('contacts');
                var signaturePromise = { done: sinon.stub(),
                                         fail: sinon.stub() };
                mStub(mega.attr, 'get').returns(signaturePromise);
                mStub(window, 'u_privk', 'private key');
                mStub(window, 'u_handle', 'me3456789xw');
                mStub(window, 'u_privEd25519', 'my private Eddie');
                mStub(window, 'u_pubEd25519', 'my public Eddie');
                mStub(window, 'base64urldecode').callsFake(_echo);
                var pubkeyPromise = { done: sinon.stub(),
                                      resolve: sinon.stub() };
                mStub(crypt, 'getPubKeyAttribute').returns(pubkeyPromise);
                mStub(mega.attr, 'set');
                mStub(ns, 'signKey').returns('squiggle');
                mStub(window, 'base64urlencode').callsFake(_echo);

                var result = ns._initKeyPair('RSA');
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(MegaPromise.callCount, 2);
                assert.strictEqual(ns.getContacts.callCount, 1);
                assert.strictEqual(mega.attr.get.callCount, 1);
                assert.strictEqual(crypt.getPubKeyAttribute.callCount, 1);
                assert.strictEqual(pubkeyPromise.done.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.callCount, 2);
                assert.strictEqual(masterPromise.linkFailTo.args[0][0], pubkeyPromise);
                assert.strictEqual(signaturePromise.done.callCount, 1);
                assert.strictEqual(signaturePromise.done.callCount, 1);
                assert.strictEqual(MegaPromise.all.callCount, 1);
                assert.strictEqual(sigKeyComboPromise.done.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.args[1][0], sigKeyComboPromise);

                var callback = pubkeyPromise.done.args[0][0];
                // Nothing testable happens here for an RSA key pair.

                callback = signaturePromise.done.args[0][0];
                callback('squiggle');
                assert.strictEqual(base64urldecode.callCount, 1);
                assert.strictEqual(gotSignaturePromise.resolve.callCount, 1);
                assert.strictEqual(gotSignaturePromise.resolve.args[0][0], 'squiggle');

                callback = sigKeyComboPromise.done.args[0][0];
                callback(['squiggle', 'RSA pubkey']);
                assert.strictEqual(ns.verifyKey.callCount, 1);
                assert.strictEqual(ns.signKey.callCount, 1);
                assert.strictEqual(base64urlencode.callCount, 1);
                assert.strictEqual(mega.attr.set.callCount, 1);
                assert.strictEqual(mega.attr.set.args[0][1], 'squiggle');
                assert.strictEqual(masterPromise.linkDoneAndFailTo.callCount, 1);
            });

            it('Cu25519 key, missing key pair', function() {
                var masterPromise = { linkDoneAndFailTo: sinon.stub() };
                mStub(window, 'MegaPromise').returns(masterPromise);
                mStub(window, 'u_keyring', {});
                mStub(ns, '_setupKeyPair').returns('setup promise');

                var result = ns._initKeyPair('Cu25519');
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(ns._setupKeyPair.callCount, 1);
                assert.strictEqual(ns._setupKeyPair.args[0][0], 'Cu25519');
                assert.strictEqual(masterPromise.linkDoneAndFailTo.args[0][0], 'setup promise');
            });
        });
    });
});
