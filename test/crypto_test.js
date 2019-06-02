/**
 * @fileOverview
 * Crypto operations unit tests.
 */

describe("crypto unit test", function() {
    "use strict";

    var ns = crypt;
    var assert = chai.assert;

    // for anyone reading this line... never mock global stuff in unit tests...
    var origMegaPromise = MegaPromise;

    // Some test data.
    var ED25519_PUB_KEY = atob('11qYAYKxCrfVS/7TyWQHOg7hcvPapiMlrwIaaPcHURo=');
    var ED25519_FINGERPRINT = base64urldecode('If4x36FUomFia/hUBG/SJxt77Us');
    // 1024 bit RSA key pair.
    var RSA_PUB_KEY = [
        asmCrypto.base64_to_bytes('wT+JSBnBNjgalMGT5hmFHd/N5eyncAA+w1TzFC4PYfB'
            + 'nbX1CFcx6E7BuB0SqgxbJw3ZsvvowsjRvuo8SNtfmVIz4fZV45pBPxCkeCWonN/'
            + 'zZZiT3LnYnk1BfnfxfoXtEYRrdVPXAC/VDc9cgy29OXKuuNsREKznb9JFYQUVH9'
            + 'FM='),
        asmCrypto.base64_to_bytes('AQAB')
    ];
    var RSA_PRIV_KEY = [
        asmCrypto.base64_to_bytes('wT+JSBnBNjgalMGT5hmFHd/N5eyncAA+w1TzFC4PYfB'
            + 'nbX1CFcx6E7BuB0SqgxbJw3ZsvvowsjRvuo8SNtfmVIz4fZV45pBPxCkeCWonN/'
            + 'zZZiT3LnYnk1BfnfxfoXtEYRrdVPXAC/VDc9cgy29OXKuuNsREKznb9JFYQUVH9'
            + 'FM='),
        65537,
        asmCrypto.base64_to_bytes('B1SXqop/j8T1DSuCprnVGNsCfnRJra/0sYgpaFyO7NI'
            + 'nujmEJjuJbfHFWrU6GprksGtvmJb4/emLS3Jd6IKsE/wRthTLLMgbzGm5rRZ92g'
            + 'k8XGY3dUrNDsnphFsbIkTVl8n2PX6gdr2hn+rc2zvRupAYkV/smBZX+3pDAcuHo'
            + '+E='),
        asmCrypto.base64_to_bytes('7y+NkdfNlnENazteobZ2K0IU7+Mp59BgmrhBl0TvhiA'
            + '5HkI9WJDIZK67NsDa9QNdJ/NCfmqE/eNkZqFLVq0c+w=='),
        asmCrypto.base64_to_bytes('ztVHfgrLnINsPFTjMmjgZM6M39QEUsi4erg4s2tJiuI'
            + 'v29szH1n2HdPKFRIUPnemj48kANvp5XagAAhOb8u2iQ=='),
        asmCrypto.base64_to_bytes('IniC+aLVUTonye17fOjT7PYQGGZvsqX4VjP51/gqYPU'
            + 'h5jd7qdjr2H7KImD27Vq3wTswuRFW61QrMxNJzUsTow=='),
        asmCrypto.base64_to_bytes('TeoqNGD8sskPTOrta1/2qALnLqo/tq/GTvR255/S5G6'
            + 'weLHqYDUTcckGp0lYNu/73ridZ3VwdvBo9ZorchHbgQ=='),
        asmCrypto.base64_to_bytes('JhqTYTqT5Dj6YoWHWNHbOz24NmMZUXwDms/MDOBM0Nc'
            + '0nX6NjLDooFrJZtBMGMgcSQJd4rULuH94+szNGc2GAg==')
    ];

    var _echo = function(x) { return x; };

    beforeEach(function() {
        //sandbox.stub(attribCache, 'isDisabled', true);

        mStub(backgroundNacl.sign.detached, 'verify').callsFake(function() {
            return MegaPromise.resolve(
                nacl.sign.detached.verify.apply(this, arguments)
            );
        });
    });

    afterEach(function() {
        _hideDebug();
        mStub.restore();
    });

    describe('crypt namespace', function() {
        describe('getPubKeyAttribute()', function() {
            it("RSA key", function() {
                mStub(ns._logger, '_log');
                var pubKey = 'the key';
                var rootPromise = _stubMegaPromise(sinon, true);
                var attribCachePromise = _stubMegaPromise(sinon);
                attribCachePromise.fail = function(callback) {
                    callback();
                };
                mStub(window, 'crypto_decodepubkey').returns(pubKey);
                mStub(attribCache, 'getItem').returns(attribCachePromise);
                _showDebug(['api_req', 'assertUserHandle', 'base64urldecode']);

                var result = ns.getPubKeyAttribute('you456789xw', 'RSA');
                assert.strictEqual(result, rootPromise);
                assert.strictEqual(attribCache.getItem.callCount, 1);
                assert.strictEqual(api_req.callCount, 1);
                assert.deepEqual(api_req.args[0][0], { a: 'uk', u: 'you456789xw' });
                assert.strictEqual(api_req.args[0][1].u, 'you456789xw');

                var settleFunction = api_req.args[0][1].callback;
                settleFunction({ pubk: pubKey, u: 'you456789xw'}, 0, 0, 0, 1);
                assert.strictEqual(rootPromise.resolve.callCount, 1);
                assert.strictEqual(rootPromise.resolve.args[0][0], pubKey);
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Got RSA pub key of user you456789xw');
            });

            it("API error on RSA key", function() {
                mStub(ns._logger, '_log');
                var rootPromise = _stubMegaPromise(sinon, true);
                var attribCachePromise = _stubMegaPromise(sinon);
                attribCachePromise.fail = function(callback) {
                    callback();
                };
                mStub(attribCache, 'getItem').returns(attribCachePromise);
                _showDebug(['api_req']);

                var result = ns.getPubKeyAttribute('you456789xw', 'RSA');
                assert.strictEqual(result, rootPromise);
                assert.strictEqual(attribCache.getItem.callCount, 1);
                assert.strictEqual(api_req.callCount, 1);
                assert.deepEqual(api_req.args[0][0], { a: 'uk', u: 'you456789xw' });
                assert.strictEqual(api_req.args[0][1].u, 'you456789xw');

                var settleFunction = api_req.args[0][1].callback;
                settleFunction(ENOENT);
                assert.strictEqual(rootPromise.reject.callCount, 1);
                assert.strictEqual(rootPromise.reject.args[0][0], ENOENT);
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'RSA pub key for you456789xw could not be retrieved: -9');
            });

            it("Cu25519 key", function(done) {
                mStub(ns._logger, '_log');
                var attributePromise = { done: sinon.stub(), then: sinon.stub() };
                mStub(mega.attr, 'get').returns(attributePromise);

                var result = ns.getPubKeyAttribute('you456789xw', 'Cu25519');

                assert.strictEqual(mega.attr.get.callCount, 1);
                assert.strictEqual(attributePromise.done.callCount, 1);
                assert.strictEqual(attributePromise.then.callCount, 1);

                var settleFunction = attributePromise.done.args[0][0];
                settleFunction('dGhlIGtleQ');
                result
                    .done(function(resolveArgs) {
                        assert.strictEqual(resolveArgs, 'the key');
                    })
                    .always(function() {
                        done();
                    });
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Got Cu25519 pub key of user you456789xw.');
            });

            it("Ed25519 key", function(done) {
                mStub(ns._logger, '_log');
                var attributePromise = { done: sinon.stub(), then: sinon.stub() };
                mStub(mega.attr, 'get').returns(attributePromise);

                var result = ns.getPubKeyAttribute('you456789xw', 'Ed25519');

                assert.strictEqual(mega.attr.get.callCount, 1);
                assert.strictEqual(attributePromise.done.callCount, 1);
                assert.strictEqual(attributePromise.then.callCount, 1);

                var settleFunction = attributePromise.done.args[0][0];
                settleFunction('dGhlIGtleQ');
                result
                    .done(function(resolveArgs) {
                        assert.strictEqual(resolveArgs, 'the key');
                    })
                    .always(function() {
                        done();
                    });
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Got Ed25519 pub key of user you456789xw.');
            });
        });

        describe('_getPubKeyAuthentication()', function() {
            it("unseen key", function() {
                mStub(window, 'pubEd25519', {'you456789xw': ED25519_PUB_KEY});
                mStub(authring, 'getContactAuthenticated').returns(false);
                mStub(authring, 'equalFingerprints').returns(undefined);
                var result = ns._getPubKeyAuthentication('you456789xw', ED25519_PUB_KEY, 'Ed25519');
                assert.strictEqual(result, null);
            });

            it("seen key", function() {
                mStub(window, 'pubEd25519', {'you456789xw': ED25519_PUB_KEY});
                var authenticated = { fingerprint: ED25519_FINGERPRINT,
                                      method: authring.AUTHENTICATION_METHOD.SEEN,
                                      confidence: authring.KEY_CONFIDENCE.UNSURE };
                mStub(authring, 'getContactAuthenticated').returns(authenticated);
                mStub(authring, 'equalFingerprints').returns(true);
                var result = ns._getPubKeyAuthentication('you456789xw', ED25519_PUB_KEY, 'Ed25519');
                assert.strictEqual(result, authring.AUTHENTICATION_METHOD.SEEN);
            });

            it("signed key", function() {
                mStub(window, 'pubEd25519', {'you456789xw': ED25519_PUB_KEY});
                var authenticated = { fingerprint: ED25519_FINGERPRINT,
                                      method: authring.AUTHENTICATION_METHOD.SIGNATURE_VERIFIED,
                                      confidence: authring.KEY_CONFIDENCE.UNSURE };
                mStub(authring, 'getContactAuthenticated').returns(authenticated);
                mStub(authring, 'equalFingerprints').returns(true);
                var result = ns._getPubKeyAuthentication('you456789xw', ED25519_PUB_KEY, 'Ed25519');
                assert.strictEqual(result, authring.AUTHENTICATION_METHOD.SIGNATURE_VERIFIED);
            });

            it("fingerprint mismatch", function() {
                mStub(ns._logger, '_log');
                mStub(window, 'pubEd25519', {'you456789xw': ED25519_PUB_KEY});
                var authenticated = { fingerprint: base64urldecode('XyeqVYkXl3DkdXWxYqHe2XuL_G0'),
                                      method: authring.AUTHENTICATION_METHOD.SEEN,
                                      confidence: authring.KEY_CONFIDENCE.UNSURE };
                mStub(authring, 'getContactAuthenticated').returns(authenticated);
                mStub(authring, 'equalFingerprints').returns(false);
                var result = ns._getPubKeyAuthentication('you456789xw', ED25519_PUB_KEY, 'Ed25519');
                assert.strictEqual(result, false);
            });
        });

        describe('_checkSignature()', function() {
            it("good signature", function(done) {
                mStub(authring, 'verifyKey').returns(origMegaPromise.resolve(true));
                ns._checkSignature('squiggle', 'RSA key', 'RSA', 'Ed key')
                    .done(function(result) {
                        assert.strictEqual(result, true);
                        assert.strictEqual(authring.verifyKey.callCount, 1);
                        assert.deepEqual(authring.verifyKey.args[0],
                            ['squiggle', 'RSA key', 'RSA', 'Ed key']);

                        done();
                    });

            });

            it("bad signature", function(done) {
                mStub(authring, 'verifyKey').returns(origMegaPromise.resolve(false));
                ns._checkSignature('squiggle', 'RSA key', 'RSA', 'Ed key')
                    .done(function(result) {
                        assert.strictEqual(result, false);
                        assert.strictEqual(authring.verifyKey.callCount, 1);
                        assert.deepEqual(authring.verifyKey.args[0],
                            ['squiggle', 'RSA key', 'RSA', 'Ed key']);

                        done();
                    });
            });

            it("empty signature", function(done) {
                mStub(authring, 'verifyKey').returns(origMegaPromise.resolve(null));
                ns._checkSignature('', 'RSA key', 'RSA', 'Ed key')
                    .done(function(result) {
                        assert.strictEqual(result, null);
                        assert.strictEqual(authring.verifyKey.callCount, 0);
                        done();
                    });
            });
        });

        // describe('_resolveSignatureVerificationGenerator()', function() {
            // it("cached Ed25519 key", function(done) {
                // var theFunction = ns._resolveSignatureVerificationGenerator(
                    // 'you456789xw', 'Cu25519', undefined,
                    // authring.AUTHENTICATION_METHOD.SEEN,
                    // authring.AUTHENTICATION_METHOD.SIGNATURE_VERIFIED);
//
            // });
        // });

        describe('getPubKey()', function() {
            it("cached Ed25519 key", function(done) {
                mStub(window, 'u_authring', {Ed25519: {}});
                mStub(window, 'pubEd25519', {'you456789xw': 'the key'});
                mStub(authring, 'hadInitialised').returns(true);

                var result = ns.getPubKey('you456789xw', 'Ed25519');
                result
                    .done(function(r) {
                        // test
                        assert.strictEqual(r, 'the key');
                        assert.deepEqual(pubEd25519, { 'you456789xw': 'the key' });
                        done();
                    })
                    .fail(function() {
                        assert.fail('failed to retrv. cached key');
                    });
            });

            it("cached Ed25519 key, with callback", function(done) {
                mStub(ns._logger, '_log');
                mStub(window, 'u_authring', {Ed25519: {}});
                mStub(window, 'pubEd25519', {'you456789xw': 'the key'});
                mStub(window, 'u_handle', 'me3456789xw');
                mStub(authring, 'hadInitialised').returns(true);

                var callback = sinon.stub();

                var result = ns.getPubKey('you456789xw', 'Ed25519', callback);

                result
                    .done(function(r) {
                        // test
                        assert.strictEqual(r, 'the key');
                        assert.deepEqual(pubEd25519, { 'you456789xw': 'the key' });
                        assert.strictEqual(callback.callCount, 1);
                        done();
                    })
                    .fail(function() {
                        assert.fail('failed to retrv. cached key and call callback');
                    });
            });

            it("cached Ed25519 key, uninitialised authring", function(done) {
                mStub(ns._logger, '_log');
                mStub(window, 'u_handle', 'me3456789xw');
                mStub(window, 'u_attr', {});
                mStub(window, 'u_authring', {Ed25519: undefined});
                mStub(window, 'pubEd25519', {'you456789xw': 'the key'});

                mStub(window, 'api_req').callsFake(function(apiCallDetails, ctx) {
                    console.error("Not implemented - api call:", apiCallDetails, ctx);
                });

                var authringPromise = { done: sinon.stub() };
                mStub(authring, 'getContacts').returns(authringPromise);
                mStub(authring, '_initKeyPair').returns(MegaPromise.resolve());

                var _initKeyringAndEd25519 = {
                    done: function(cb) {
                        cb();
                        return this;
                    },
                    then: function(cb) {
                        cb();
                    },
                    fail: function() {
                        return this;
                    }
                };
                mStub(authring, '_initKeyringAndEd25519').returns(_initKeyringAndEd25519);

                var result = ns.getPubKey('you456789xw', 'Ed25519');

                result
                    .done(function(r) {
                        assert.strictEqual(r, 'the key');
                        assert.deepEqual(pubEd25519, { 'you456789xw': 'the key' });
                        assert.strictEqual(authring._initKeyPair.callCount, 2);
                        assert.strictEqual(authring.hadInitialised(), true);

                        done();
                    })
                    .fail(function() {
                        assert.fail('failed to retrv. cached key, uninit. authring');
                    });
            });

            it("uncached Ed25519 key", function(done) {
                mStub(window, 'u_authring', {Ed25519: {}});
                mStub(window, 'pubEd25519', {});

                mStub(ns, 'getPubKeyAttribute').returns(MegaPromise.resolve('the key'));
                mStub(ns, '_getPubKeyAuthentication').returns(authring.AUTHENTICATION_METHOD.SEEN);
                mStub(authring, 'computeFingerprint').returns('smudge');

                var result = ns.getPubKey('you456789xw', 'Ed25519');

                result
                    .done(function(r) {
                        assert.strictEqual(r, 'the key');
                        assert.deepEqual(pubEd25519, { 'you456789xw': 'the key' });
                        assert.strictEqual(ns.getPubKeyAttribute.callCount, 1);
                        assert.strictEqual(ns._getPubKeyAuthentication.callCount, 1);
                        assert.deepEqual(pubEd25519, { 'you456789xw': 'the key' });
                        done();
                    })
                    .fail(function() {
                        assert.fail('failed to retrv. uncached key');
                    });
            });

            it("uncached Ed25519 key, unseen", function(done) {
                mStub(window, 'u_authring', {Ed25519: {}});
                mStub(window, 'pubEd25519', {});

                mStub(ns, 'getPubKeyAttribute').returns(MegaPromise.resolve('the key'));
                mStub(ns, '_getPubKeyAuthentication').returns(null);
                mStub(authring, 'computeFingerprint').returns('smudge');
                mStub(authring, 'setContactAuthenticated');

                var result = ns.getPubKey('you456789xw', 'Ed25519');

                result
                    .done(function(r) {
                        assert.strictEqual(r, 'the key');
                        assert.deepEqual(pubEd25519, { 'you456789xw': 'the key' });
                        assert.strictEqual(ns.getPubKeyAttribute.callCount, 1);
                        assert.strictEqual(ns._getPubKeyAuthentication.callCount, 1);
                        assert.strictEqual(authring.setContactAuthenticated.callCount, 1);
                        assert.deepEqual(pubEd25519, { 'you456789xw': 'the key' });
                        done();
                    })
                    .fail(function() {
                        assert.fail('failed to retrv. uncached key, unseen');
                    });
            });

            it("uncached Ed25519 key, bad fingerprint", function(done) {
                mStub(window, 'u_authring', {Ed25519: {}});
                mStub(window, 'pubEd25519', {});

                mStub(ns, 'getPubKeyAttribute').returns(MegaPromise.resolve('the key'));
                mStub(ns, '_getPubKeyAuthentication').returns(false);
                mStub(authring, 'computeFingerprint').returns('smudge');
                mStub(ns, '_showFingerprintMismatchException');

                var result = ns.getPubKey('you456789xw', 'Ed25519');

                result
                    .done(function(r) {
                        assert.fail('failed to retrieve uncached key, bad fingerprint');
                    })
                    .fail(function(err) {
                        // TODO: This should be confirmed by Guy. Because of '_getPubKeyAuthentication' mocking to
                        // return false, the code in the crypto.js would always reject the master promise with -1
                        assert.strictEqual(err, EINTERNAL);

                        // TODO: The next line would never work, because the __finish is going to be called AFTER the
                        // promise is being rejected/resolved
                        assert.deepEqual(pubEd25519, {});
                        assert.strictEqual(ns.getPubKeyAttribute.callCount, 1);
                        assert.strictEqual(ns._getPubKeyAuthentication.callCount, 1);
                        assert.strictEqual(ns._showFingerprintMismatchException.callCount, 1);
                        assert.strictEqual(pubEd25519['you456789xw'], undefined);
                        done();
                    });
            });

            it("uncached Cu25519 key", function(done) {
// dump('*** begin');
                mStub(window, 'u_authring', {Cu25519: {}});
                mStub(window, 'pubEd25519', {'you456789xw': 'the key'});
                mStub(window, 'pubCu25519', {});

                mStub(ns, 'getPubKeyAttribute').returns(MegaPromise.resolve('the key'));
                mStub(ns, '_getPubKeyAuthentication').returns(authring.AUTHENTICATION_METHOD.SIGNATURE_VERIFIED);
                mStub(mega.attr, 'get').returns('squiggle');
                mStub(authring, 'computeFingerprint').returns('smudge');
                mStub(ns, '_checkSignature').returns(origMegaPromise.resolve(true));

                // This is to pass through the first call directly, then stub on subsequent ones.
                var _getPubKey = ns.getPubKey;
                var callCount = 0;
                mStub(ns, 'getPubKey').callsFake(function __getPubKey(userhandle, keyType, callback) {
                    callCount++;
                    if (callCount === 1) {
                        return _getPubKey(userhandle, keyType, callback);
                    }
                    else {
                        return 'Ed placebo';
                    }
                });

                var result = ns.getPubKey('you456789xw', 'Cu25519');

                result
                    .done(function(r) {
                        assert.strictEqual(r, 'the key');
                        assert.strictEqual(ns.getPubKeyAttribute.callCount, 1);
                        assert.strictEqual(ns.getPubKeyAttribute.callCount, 1);
                        assert.strictEqual(ns.getPubKey.callCount, 2);

                        // TODO: To be 100% sure that the signatureVerificationPromise is resolved, the mess in
                        // 'getPubKey' should be fully refactored first!
                        //assert.strictEqual(signatureVerificationPromise.done.callCount, 1);
                        assert.strictEqual(ns._getPubKeyAuthentication.callCount, 1);
                        //assert.strictEqual(base64urldecode.callCount, 1);
                        assert.strictEqual(ns._checkSignature.callCount, 1);
                        assert.deepEqual(pubEd25519, { 'you456789xw': 'the key' });

                        done();
                    })
                    .fail(function() {
                        assert.fail('failed to retrv. uncached Cu key');
                    });
// dump('*** end');
            });

            it("uncached Cu25519 key, unseen", function(done) {

                mStub(window, 'u_authring', {Cu25519: {}});
                mStub(window, 'pubEd25519', {'you456789xw': 'the key'});
                mStub(window, 'pubCu25519', {});

                mStub(ns, 'getPubKeyAttribute').returns(MegaPromise.resolve('the Cu key'));
                mStub(ns, '_getPubKeyAuthentication').returns(authring.AUTHENTICATION_METHOD.SIGNATURE_VERIFIED);
                mStub(mega.attr, 'get').returns('squiggle');
                mStub(authring, 'computeFingerprint').returns('smudge');
                mStub(window, 'base64urldecode').callsFake(_echo);
                mStub(window, 'assertUserHandle');
                mStub(ns, '_checkSignature').returns(origMegaPromise.resolve(true));

                // This is to pass through the first call directly, then stub on subsequent ones.
                var _getPubKey = ns.getPubKey;
                var callCount = 0;
                mStub(ns, 'getPubKey').callsFake(function __getPubKey(userhandle, keyType, callback) {
                    callCount++;
                    if (callCount === 1) {
                        return _getPubKey(userhandle, keyType, callback);
                    }
                    else {
                        return 'Ed placebo';
                    }
                });

                var result = ns.getPubKey('you456789xw', 'Cu25519');

                result.done(function(r) {
                    assert.strictEqual(ns.getPubKeyAttribute.callCount, 1);

                    assert.strictEqual(ns.getPubKey.callCount, 2);
                    assert.strictEqual(mega.attr.get.callCount, 1);

                    assert.strictEqual(ns._getPubKeyAuthentication.callCount, 1);
                    assert.strictEqual(authring.computeFingerprint.callCount, 1);

                    // TODO: To be 100% sure that the signatureVerificationPromise is resolved, the mess in
                    // 'getPubKey' should be fully refactored first!
                    //assert.strictEqual(signatureVerificationPromise.done.callCount, 1);

                    // var signatureVerificationCallback = signatureVerificationPromise.done.args[0][0];
                    // signatureVerificationCallback(['the key', 'Ed placebo', 'squiggle']);
                    //assert.strictEqual(base64urldecode.callCount, 1);
                    assert.strictEqual(ns._checkSignature.callCount, 1);

                    assert.deepEqual(pubEd25519, { 'you456789xw': 'the key' });
                    assert.deepEqual(pubCu25519, { 'you456789xw': 'the Cu key' });

                    done();
                })
                .fail(function() {
                    assert.fail('failed to retrv. uncached, unseen Cu key');
                });
            });

            it("uncached Cu25519 key, new key", function(done) {
                mStub(window, 'u_authring', {Cu25519: {}});
                mStub(window, 'pubEd25519', {'you456789xw': 'the key'});
                mStub(window, 'pubCu25519', {});

                mStub(ns, 'getPubKeyAttribute').returns(MegaPromise.resolve('the key'));
                mStub(ns, '_getPubKeyAuthentication').returns(false);
                mStub(mega.attr, 'get').returns('squiggle');
                mStub(authring, 'computeFingerprint').returns('smudge');
                mStub(window, 'base64urldecode').callsFake(_echo);
                mStub(window, 'assertUserHandle');
                mStub(ns, '_checkSignature').returns(origMegaPromise.resolve(true));
                mStub(authring, 'setContactAuthenticated');

                // This is to pass through the first call directly, then stub on subsequent ones.
                var _getPubKey = ns.getPubKey;
                var callCount = 0;
                mStub(ns, 'getPubKey').callsFake(function __getPubKey(userhandle, keyType, callback) {
                    callCount++;
                    if (callCount === 1) {
                        return _getPubKey(userhandle, keyType, callback);
                    }
                    else {
                        return 'Ed placebo';
                    }
                });

                var result = ns.getPubKey('you456789xw', 'Cu25519');

                result
                    .done(function(r) {
                        assert.strictEqual(ns.getPubKeyAttribute.callCount, 1);
                        assert.strictEqual(ns.getPubKey.callCount, 2);
                        assert.strictEqual(mega.attr.get.callCount, 1);

                        assert.strictEqual(ns._getPubKeyAuthentication.callCount, 1);
                        assert.strictEqual(authring.computeFingerprint.callCount, 1);

                        assert.strictEqual(base64urldecode.callCount, 1);
                        assert.strictEqual(ns._checkSignature.callCount, 1);
                        assert.strictEqual(authring.setContactAuthenticated.callCount, 1);
                        assert.deepEqual(pubCu25519, { 'you456789xw': 'the key' });
                        assert.deepEqual(pubEd25519, { 'you456789xw': 'the key' });
                        done();
                    })
                    .fail(function() {
                        assert.fail('failed to retrv. uncached, new Cu key');
                    });
            });

            it("uncached Cu25519 key, seen, no signature", function(done) {
                mStub(window, 'u_authring', {Cu25519: {}});
                mStub(window, 'pubEd25519', {'you456789xw': 'the key'});
                mStub(window, 'pubCu25519', {});

                mStub(ns, 'getPubKeyAttribute').returns(MegaPromise.resolve('the key'));
                mStub(ns, '_getPubKeyAuthentication').returns(authring.AUTHENTICATION_METHOD.SEEN);
                mStub(authring, 'getContactAuthenticated').returns({fingerprint: 'smudge'});
                mStub(mega.attr, 'get').returns('');
                mStub(authring, 'computeFingerprint').returns('smudge');
                mStub(window, 'base64urldecode').callsFake(_echo);
                mStub(window, 'assertUserHandle');
                mStub(ns, '_checkSignature').returns(origMegaPromise.resolve(null));

                // This is to pass through the first call directly, then stub on subsequent ones.
                var _getPubKey = ns.getPubKey;
                var callCount = 0;
                mStub(ns, 'getPubKey').callsFake(function __getPubKey(userhandle, keyType, callback) {
                    callCount++;
                    if (callCount === 1) {
                        return _getPubKey(userhandle, keyType, callback);
                    }
                    else {
                        return 'Ed placebo';
                    }
                });

                var result = ns.getPubKey('you456789xw', 'Cu25519');
                result
                    .done(function() {
                        assert.strictEqual(ns.getPubKeyAttribute.callCount, 1);
                        assert.strictEqual(ns.getPubKey.callCount, 2);
                        assert.strictEqual(mega.attr.get.callCount, 1);
                        assert.strictEqual(ns._getPubKeyAuthentication.callCount, 1);
                        assert.strictEqual(authring.computeFingerprint.callCount, 1);

                        assert.strictEqual(base64urldecode.callCount, 1);
                        assert.strictEqual(ns._checkSignature.callCount, 1);
                        assert.deepEqual(pubCu25519, { 'you456789xw': 'the key' });
                        assert.deepEqual(pubEd25519, { 'you456789xw': 'the key' });

                        done();
                    })
                    .fail(function() {
                        assert.fail('failed to retrv. uncached, seen Cu key, no sig.');
                    });
            });

            it("uncached Cu25519 key, unseen, no signature", function(done) {
                mStub(window, 'u_authring', {Cu25519: {}});
                mStub(window, 'pubEd25519', {'you456789xw': 'the key'});
                mStub(window, 'pubCu25519', {});

                mStub(ns, 'getPubKeyAttribute').returns(MegaPromise.resolve('the key'));
                mStub(ns, '_getPubKeyAuthentication').returns(null);
                mStub(authring, 'getContactAuthenticated').returns(false);
                mStub(mega.attr, 'get').returns('');
                mStub(authring, 'computeFingerprint').returns('smudge');
                mStub(window, 'base64urldecode').callsFake(_echo);
                mStub(window, 'assertUserHandle');
                mStub(ns, '_checkSignature').returns(origMegaPromise.resolve(null));
                mStub(authring, 'setContactAuthenticated');

                // This is to pass through the first call directly, then stub on subsequent ones.
                var _getPubKey = ns.getPubKey;
                var callCount = 0;
                mStub(ns, 'getPubKey').callsFake(function __getPubKey(userhandle, keyType, callback) {
                    callCount++;
                    if (callCount === 1) {
                        return _getPubKey(userhandle, keyType, callback);
                    }
                    else {
                        return 'Ed placebo';
                    }
                });

                var result = ns.getPubKey('you456789xw', 'Cu25519');
                result
                    .done(function() {
                        assert.strictEqual(ns.getPubKeyAttribute.callCount, 1);
                        assert.strictEqual(ns.getPubKey.callCount, 2);
                        assert.strictEqual(mega.attr.get.callCount, 1);

                        assert.strictEqual(ns._getPubKeyAuthentication.callCount, 1);
                        assert.strictEqual(authring.computeFingerprint.callCount, 1);


                        assert.strictEqual(base64urldecode.callCount, 1);
                        assert.strictEqual(ns._checkSignature.callCount, 1);

                        assert.strictEqual(authring.setContactAuthenticated.callCount, 1);
                        assert.deepEqual(pubCu25519, { 'you456789xw': 'the key' });
                        assert.deepEqual(pubEd25519, { 'you456789xw': 'the key' });

                        done();
                    })
                    .fail(function() {
                        assert.fail('failed to retrv. uncached, unseen Cu key, no sig.');
                    });
            });

            it("cached Cu25519 key, seen, new signature", function(done) {
                mStub(window, 'u_authring', {Cu25519: {}});
                mStub(window, 'pubEd25519', {'you456789xw': 'the key'});
                mStub(window, 'pubCu25519', {});

                mStub(ns, 'getPubKeyAttribute').returns(MegaPromise.resolve('the key'));
                mStub(ns, '_getPubKeyAuthentication').returns(authring.AUTHENTICATION_METHOD.SEEN);
                mStub(mega.attr, 'get').returns('squiggle');
                mStub(authring, 'computeFingerprint').returns('smudge');
                mStub(window, 'base64urldecode').callsFake(_echo);
                mStub(window, 'assertUserHandle');
                mStub(ns, '_checkSignature').returns(origMegaPromise.resolve(true));
                mStub(authring, 'setContactAuthenticated');

                // This is to pass through the first call directly, then stub on subsequent ones.
                var _getPubKey = ns.getPubKey;
                var callCount = 0;
                mStub(ns, 'getPubKey').callsFake(function __getPubKey(userhandle, keyType, callback) {
                    callCount++;
                    if (callCount === 1) {
                        return _getPubKey(userhandle, keyType, callback);
                    }
                    else {
                        return 'Ed placebo';
                    }
                });

                var result = ns.getPubKey('you456789xw', 'Cu25519');
                result
                    .done(function() {
                        assert.strictEqual(ns.getPubKeyAttribute.callCount, 1);
                        assert.strictEqual(ns.getPubKey.callCount, 2);
                        assert.strictEqual(mega.attr.get.callCount, 1);

                        assert.strictEqual(ns._getPubKeyAuthentication.callCount, 1);
                        assert.strictEqual(authring.computeFingerprint.callCount, 1);

                        assert.strictEqual(base64urldecode.callCount, 1);
                        assert.strictEqual(ns._checkSignature.callCount, 1);

                        assert.strictEqual(authring.setContactAuthenticated.callCount, 1);
                        assert.deepEqual(pubCu25519, { 'you456789xw': 'the key' });
                        assert.deepEqual(pubEd25519, { 'you456789xw': 'the key' });

                        done();
                    })
                    .fail(function() {
                        assert.fail('failed to retrv. uncached, unseen Cu key, new sig.');
                    });
            });
        });

        describe("convenience wrappers", function() {
            it('getPubRSA()', function() {
                mStub(ns, 'getPubKey').returns('a promise');
                var result = ns.getPubRSA('you456789xw');
                assert.strictEqual(result, 'a promise');
                assert.strictEqual(ns.getPubKey.callCount, 1);
                assert.deepEqual(ns.getPubKey.args[0],
                                 ['you456789xw', 'RSA', undefined]);
            });

            it('getPubEd25519()', function() {
                mStub(ns, 'getPubKey').returns('a promise');
                var result = ns.getPubEd25519('you456789xw');
                assert.strictEqual(result, 'a promise');
                assert.strictEqual(ns.getPubKey.callCount, 1);
                assert.deepEqual(ns.getPubKey.args[0],
                                 ['you456789xw', 'Ed25519', undefined]);
            });

            it('getPubCu25519()', function() {
                mStub(ns, 'getPubKey').returns('a promise');
                var result = ns.getPubCu25519('you456789xw');
                assert.strictEqual(result, 'a promise');
                assert.strictEqual(ns.getPubKey.callCount, 1);
                assert.deepEqual(ns.getPubKey.args[0],
                                 ['you456789xw', 'Cu25519', undefined]);
            });
        });

        describe('getFingerprintEd25519', function() {
            it("cached key", function() {
                mStub(ns._logger, '_log');
                mStub(window, 'pubEd25519', {'you456789xw': 'the key'});
                mStub(authring, 'computeFingerprint').returns('the fingerprint');
                var masterPromise = _stubMegaPromise(sinon, true);

                var result = ns.getFingerprintEd25519('you456789xw');
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(authring.computeFingerprint.callCount, 1);
                assert.strictEqual(masterPromise.resolve.callCount, 1);
                assert.strictEqual(masterPromise.resolve.args[0][0], 'the fingerprint');
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Got Ed25519 fingerprint for user "you456789xw": the fingerprint');
            });

            it("cached key, hex", function() {
                mStub(ns._logger, '_log');
                mStub(window, 'pubEd25519', {'you456789xw': 'the key'});
                mStub(authring, 'computeFingerprint').returns('the hexprint');
                var masterPromise = _stubMegaPromise(sinon, true);

                var result = ns.getFingerprintEd25519('you456789xw', 'hex');
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(authring.computeFingerprint.callCount, 1);
                assert.strictEqual(masterPromise.resolve.callCount, 1);
                assert.strictEqual(masterPromise.resolve.args[0][0], 'the hexprint');
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Got Ed25519 fingerprint for user "you456789xw": the hexprint');
            });

            it("cached key, binary string", function() {
                mStub(ns._logger, '_log');
                mStub(window, 'pubEd25519', {'you456789xw': 'the key'});
                mStub(authring, 'computeFingerprint').returns('\u0000\u0001\u0002\u0003');
                var masterPromise = _stubMegaPromise(sinon, true);

                var result = ns.getFingerprintEd25519('you456789xw', 'string');
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(authring.computeFingerprint.callCount, 1);
                assert.strictEqual(masterPromise.resolve.callCount, 1);
                assert.strictEqual(masterPromise.resolve.args[0][0], '\u0000\u0001\u0002\u0003');
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Got Ed25519 fingerprint for user "you456789xw": AAECAw');
            });

            it("non-cached", function() {
                mStub(ns._logger, '_log');
                mStub(window, 'pubEd25519', {});
                mStub(authring, 'computeFingerprint').returns('the fingerprint');
                var masterPromise = _stubMegaPromise(sinon, true);
                var keyPromise = _stubMegaPromise(sinon);
                mStub(crypt, 'getPubEd25519').returns(keyPromise);

                var result = ns.getFingerprintEd25519('you456789xw');
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(crypt.getPubEd25519.callCount, 1);
                assert.strictEqual(crypt.getPubEd25519.args[0][0], 'you456789xw');
                assert.strictEqual(keyPromise.done.callCount, 1);

                var fingerprintCallback = keyPromise.done.args[0][0];
                // Now stub getFingerprintEd25519(), as we're calling it recursively.
                mStub(ns, 'getFingerprintEd25519').returns('recursion');
                fingerprintCallback();
                assert.strictEqual(ns.getFingerprintEd25519.callCount, 1);
                assert.deepEqual(ns.getFingerprintEd25519.args[0], ['you456789xw', undefined]);
                assert.strictEqual(masterPromise.linkDoneAndFailTo.callCount, 1);
                assert.strictEqual(masterPromise.linkDoneAndFailTo.args[0][0], 'recursion');
            });

            it("cached, hex", function() {
                mStub(ns._logger, '_log');
                mStub(window, 'pubEd25519', {'you456789xw': ED25519_PUB_KEY});
                mStub(authring, 'computeFingerprint').returns('21fe31dfa154a261626bf854046fd2271b7bed4b');
                ns.getFingerprintEd25519('you456789xw', 'hex');
                assert.strictEqual(authring.computeFingerprint.callCount, 1);
                assert.strictEqual(authring.computeFingerprint.args[0][2], 'hex');
                assert.deepEqual(pubEd25519, { 'you456789xw': ED25519_PUB_KEY });
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Got Ed25519 fingerprint for user "you456789xw": 21fe31dfa154a261626bf854046fd2271b7bed4b');
            });

            it("cached, string", function() {
                mStub(ns._logger, '_log');
                mStub(window, 'pubEd25519', {'you456789xw': ED25519_PUB_KEY});
                mStub(authring, 'computeFingerprint').returns(ED25519_FINGERPRINT);
                ns.getFingerprintEd25519('you456789xw', 'string');
                assert.strictEqual(authring.computeFingerprint.callCount, 1);
                assert.strictEqual(authring.computeFingerprint.args[0][2], 'string');
                assert.deepEqual(pubEd25519, { 'you456789xw': ED25519_PUB_KEY });
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Got Ed25519 fingerprint for user "you456789xw": If4x36FUomFia_hUBG_SJxt77Us');
            });
        });

        describe('RSA string en/decryption', function() {
            describe('rsaEncryptString/rsaDecryptString round trips', function() {
                it("binary values", function() {
                    var messages = ['Spiegelei', ED25519_PUB_KEY];
                    var ciphertext;
                    var cleartext;
                    for (var i = 0; i < messages.length; i++) {
                        ciphertext = crypt.rsaEncryptString(messages[i], RSA_PUB_KEY);
                        assert.strictEqual(ciphertext.length, 1024 / 8 + 2);
                        cleartext = crypt.rsaDecryptString(ciphertext, RSA_PRIV_KEY);
                        assert.strictEqual(cleartext, messages[i]);
                    }
                });

                it("Unicode and string values", function() {
                    var messages = ['42', "Don't panic!", 'Flying Spaghetti Monster',
                                    "Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn",
                                    'Tēnā koe', 'Hänsel & Gretel', 'Слартибартфаст'];
                    var ciphertext;
                    var cleartext;
                    for (var i = 0; i < messages.length; i++) {
                        ciphertext = crypt.rsaEncryptString(messages[i], RSA_PUB_KEY, true);
                        assert.strictEqual(ciphertext.length, 1024 / 8 + 2);
                        cleartext = crypt.rsaDecryptString(ciphertext, RSA_PRIV_KEY, true);
                        assert.strictEqual(cleartext, messages[i]);
                    }
                });
            });
        });
    });
});
