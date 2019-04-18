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

    // Create/restore Sinon stub/spy/mock sandboxes.
    var sandbox = null;

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
        sandbox = sinon.sandbox.create();
        //sandbox.stub(attribCache, 'isDisabled', true);

        sandbox.stub(backgroundNacl.sign.detached, 'verify', function() {
            return MegaPromise.resolve(
                nacl.sign.detached.verify.apply(this, arguments)
            );
        });
    });

    afterEach(function() {
        _hideDebug();
        sandbox.restore();
    });

    describe('crypt namespace', function() {
        describe('getPubKeyAttribute()', function() {
            it("RSA key", function() {
                sandbox.stub(ns._logger, '_log');
                var pubKey = 'the key';
                var rootPromise = _stubMegaPromise(sinon, sandbox);
                var attribCachePromise = _stubMegaPromise(sinon);
                attribCachePromise.fail = function(callback) {
                    callback();
                };
                sandbox.stub(window, 'crypto_decodepubkey').returns(pubKey);
                sandbox.stub(attribCache, 'getItem').returns(attribCachePromise);
                _showDebug(sandbox, ['api_req', 'assertUserHandle', 'base64urldecode']);

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
                sandbox.stub(ns._logger, '_log');
                var rootPromise = _stubMegaPromise(sinon, sandbox);
                var attribCachePromise = _stubMegaPromise(sinon);
                attribCachePromise.fail = function(callback) {
                    callback();
                };
                sandbox.stub(attribCache, 'getItem').returns(attribCachePromise);
                _showDebug(sandbox, ['api_req']);

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
                sandbox.stub(ns._logger, '_log');
                var attributePromise = { done: sinon.stub(), then: sinon.stub() };
                sandbox.stub(mega.attr, 'get').returns(attributePromise);

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
                sandbox.stub(ns._logger, '_log');
                var attributePromise = { done: sinon.stub(), then: sinon.stub() };
                sandbox.stub(mega.attr, 'get').returns(attributePromise);

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
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': ED25519_PUB_KEY });
                sandbox.stub(authring, 'getContactAuthenticated').returns(false);
                sandbox.stub(authring, 'equalFingerprints').returns(undefined);
                var result = ns._getPubKeyAuthentication('you456789xw', ED25519_PUB_KEY, 'Ed25519');
                assert.strictEqual(result, null);
            });

            it("seen key", function() {
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': ED25519_PUB_KEY });
                var authenticated = { fingerprint: ED25519_FINGERPRINT,
                                      method: authring.AUTHENTICATION_METHOD.SEEN,
                                      confidence: authring.KEY_CONFIDENCE.UNSURE };
                sandbox.stub(authring, 'getContactAuthenticated').returns(authenticated);
                sandbox.stub(authring, 'equalFingerprints').returns(true);
                var result = ns._getPubKeyAuthentication('you456789xw', ED25519_PUB_KEY, 'Ed25519');
                assert.strictEqual(result, authring.AUTHENTICATION_METHOD.SEEN);
            });

            it("signed key", function() {
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': ED25519_PUB_KEY });
                var authenticated = { fingerprint: ED25519_FINGERPRINT,
                                      method: authring.AUTHENTICATION_METHOD.SIGNATURE_VERIFIED,
                                      confidence: authring.KEY_CONFIDENCE.UNSURE };
                sandbox.stub(authring, 'getContactAuthenticated').returns(authenticated);
                sandbox.stub(authring, 'equalFingerprints').returns(true);
                var result = ns._getPubKeyAuthentication('you456789xw', ED25519_PUB_KEY, 'Ed25519');
                assert.strictEqual(result, authring.AUTHENTICATION_METHOD.SIGNATURE_VERIFIED);
            });

            it("fingerprint mismatch", function() {
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': ED25519_PUB_KEY });
                var authenticated = { fingerprint: base64urldecode('XyeqVYkXl3DkdXWxYqHe2XuL_G0'),
                                      method: authring.AUTHENTICATION_METHOD.SEEN,
                                      confidence: authring.KEY_CONFIDENCE.UNSURE };
                sandbox.stub(authring, 'getContactAuthenticated').returns(authenticated);
                sandbox.stub(authring, 'equalFingerprints').returns(false);
                var result = ns._getPubKeyAuthentication('you456789xw', ED25519_PUB_KEY, 'Ed25519');
                assert.strictEqual(result, false);
            });
        });

        describe('_checkSignature()', function() {
            it("good signature", function(done) {
                sandbox.stub(authring, 'verifyKey').returns(origMegaPromise.resolve(true));
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
                sandbox.stub(authring, 'verifyKey').returns(origMegaPromise.resolve(false));
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
                sandbox.stub(authring, 'verifyKey').returns(origMegaPromise.resolve(null));
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
                sandbox.stub(window, 'u_authring', { Ed25519: {} });
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': 'the key' });
                sandbox.stub(authring, 'hadInitialised').returns(true);

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
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'u_authring', { Ed25519: {} });
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': 'the key' });
                sandbox.stub(window, 'u_handle', 'me3456789xw');

                sandbox.stub(authring, 'hadInitialised').returns(true);

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
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'u_handle', 'me3456789xw');
                sandbox.stub(window, 'u_attr', {});
                sandbox.stub(window, 'u_authring', { Ed25519: undefined });
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': 'the key' });

                sandbox.stub(window, 'api_req', function(apiCallDetails, ctx) {
                    console.error("Not implemented - api call:", apiCallDetails, ctx);
                });

                var authringPromise = { done: sinon.stub() };
                sandbox.stub(authring, 'getContacts').returns(authringPromise);
                sandbox.stub(authring, '_initKeyPair').returns(MegaPromise.resolve());

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
                sandbox.stub(authring, '_initKeyringAndEd25519').returns(_initKeyringAndEd25519);

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
                sandbox.stub(window, 'u_authring', { Ed25519: {} });
                sandbox.stub(window, 'pubEd25519', {});

                sandbox.stub(ns, 'getPubKeyAttribute').returns(MegaPromise.resolve('the key'));
                sandbox.stub(ns, '_getPubKeyAuthentication').returns(authring.AUTHENTICATION_METHOD.SEEN);
                sandbox.stub(authring, 'computeFingerprint').returns('smudge');

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
                sandbox.stub(window, 'u_authring', { Ed25519: {} });
                sandbox.stub(window, 'pubEd25519', {});

                sandbox.stub(ns, 'getPubKeyAttribute').returns(MegaPromise.resolve('the key'));
                sandbox.stub(ns, '_getPubKeyAuthentication').returns(null);
                sandbox.stub(authring, 'computeFingerprint').returns('smudge');
                sandbox.stub(authring, 'setContactAuthenticated');

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
                sandbox.stub(window, 'u_authring', { Ed25519: {} });
                sandbox.stub(window, 'pubEd25519', {});

                sandbox.stub(ns, 'getPubKeyAttribute').returns(MegaPromise.resolve('the key'));
                sandbox.stub(ns, '_getPubKeyAuthentication').returns(false);
                sandbox.stub(authring, 'computeFingerprint').returns('smudge');
                sandbox.stub(ns, '_showFingerprintMismatchException');

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
                sandbox.stub(window, 'u_authring', { Cu25519: {} });
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': 'the key' });
                sandbox.stub(window, 'pubCu25519', {});

                sandbox.stub(ns, 'getPubKeyAttribute').returns(MegaPromise.resolve('the key'));
                sandbox.stub(ns, '_getPubKeyAuthentication').returns(authring.AUTHENTICATION_METHOD.SIGNATURE_VERIFIED);
                sandbox.stub(mega.attr, 'get').returns('squiggle');
                sandbox.stub(authring, 'computeFingerprint').returns('smudge');
                sandbox.stub(ns, '_checkSignature').returns(origMegaPromise.resolve(true));

                // This is to pass through the first call directly, then stub on subsequent ones.
                var _getPubKey = ns.getPubKey;
                var callCount = 0;
                sandbox.stub(ns, 'getPubKey', function __getPubKey(userhandle, keyType, callback) {
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

                sandbox.stub(window, 'u_authring', { Cu25519: {} });
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': 'the key' });
                sandbox.stub(window, 'pubCu25519', {});

                sandbox.stub(ns, 'getPubKeyAttribute').returns(MegaPromise.resolve('the Cu key'));
                sandbox.stub(ns, '_getPubKeyAuthentication').returns(authring.AUTHENTICATION_METHOD.SIGNATURE_VERIFIED);
                sandbox.stub(mega.attr, 'get').returns('squiggle');
                sandbox.stub(authring, 'computeFingerprint').returns('smudge');
                sandbox.stub(window, 'base64urldecode', _echo);
                sandbox.stub(window, 'assertUserHandle');
                sandbox.stub(ns, '_checkSignature').returns(origMegaPromise.resolve(true));

                // This is to pass through the first call directly, then stub on subsequent ones.
                var _getPubKey = ns.getPubKey;
                var callCount = 0;
                sandbox.stub(ns, 'getPubKey', function __getPubKey(userhandle, keyType, callback) {
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
                sandbox.stub(window, 'u_authring', { Cu25519: {} });
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': 'the key' });
                sandbox.stub(window, 'pubCu25519', {});

                sandbox.stub(ns, 'getPubKeyAttribute').returns(MegaPromise.resolve('the key'));
                sandbox.stub(ns, '_getPubKeyAuthentication').returns(false);
                sandbox.stub(mega.attr, 'get').returns('squiggle');
                sandbox.stub(authring, 'computeFingerprint').returns('smudge');
                sandbox.stub(window, 'base64urldecode', _echo);
                sandbox.stub(window, 'assertUserHandle');
                sandbox.stub(ns, '_checkSignature').returns(origMegaPromise.resolve(true));
                sandbox.stub(authring, 'setContactAuthenticated');

                // This is to pass through the first call directly, then stub on subsequent ones.
                var _getPubKey = ns.getPubKey;
                var callCount = 0;
                sandbox.stub(ns, 'getPubKey', function __getPubKey(userhandle, keyType, callback) {
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

            /*it("uncached Cu25519 key, new key, no signature", function(done) {

                // TODO: this test is failing, because of the bad fingerprint is getting the masterPromise rejected.
                // To be fixed by Guy
                sandbox.stub(window, 'u_authring',
                    { Cu25519: { 'you456789xw': 'different stuff' } });
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': 'the key' });
                sandbox.stub(window, 'pubCu25519', {});


                sandbox.stub(ns, 'getPubKeyAttribute').returns(MegaPromise.resolve('the key'));
                sandbox.stub(ns, '_getPubKeyAuthentication').returns(authring.AUTHENTICATION_METHOD.SEEN);
                sandbox.stub(authring, 'getContactAuthenticated').returns({ fingerprint: 'bad smudge' });
                sandbox.stub(ns, '_showFingerprintMismatchException');
                sandbox.stub(mega.attr, 'get').returns('');
                sandbox.stub(authring, 'computeFingerprint').returns('smudge');
                sandbox.stub(window, 'base64urldecode', _echo);
                sandbox.stub(window, 'assertUserHandle');
                sandbox.stub(ns, '_checkSignature').returns(null);

                // This is to pass through the first call directly, then stub on subsequent ones.
                var _getPubKey = ns.getPubKey;
                var callCount = 0;
                sandbox.stub(ns, 'getPubKey', function __getPubKey(userhandle, keyType, callback) {
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
                        assert.strictEqual(authring.getContactAuthenticated.callCount, 1);
                        assert.strictEqual(ns._showFingerprintMismatchException.callCount, 1);
                        assert.strictEqual(pubCu25519['you456789xw'], undefined);

                        done();
                    })
                    .fail(function() {
                        assert.fail('failed to retrv. uncached, new Cu key, no sig.');
                    });
            });*/

            /*it("uncached Cu25519 key, bad signature", function(done) {
                // TODO: this test is failing, because of the bad fingerprint is getting the masterPromise rejected.
                // To be fixed by Guy
                sandbox.stub(window, 'u_authring', { Cu25519: {} });
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': 'the key' });
                sandbox.stub(window, 'pubCu25519', {});

                sandbox.stub(ns, 'getPubKeyAttribute').returns(MegaPromise.resolve('the key'));
                sandbox.stub(ns, '_getPubKeyAuthentication').returns(false);
                sandbox.stub(mega.attr, 'get').returns('squiggle');
                sandbox.stub(authring, 'computeFingerprint').returns('smudge');
                sandbox.stub(window, 'base64urldecode', _echo);
                sandbox.stub(window, 'assertUserHandle');
                sandbox.stub(ns, '_checkSignature').returns(false);
                sandbox.stub(ns, '_showKeySignatureFailureException');

                // This is to pass through the first call directly, then stub on subsequent ones.
                var _getPubKey = ns.getPubKey;
                var callCount = 0;
                sandbox.stub(ns, 'getPubKey', function __getPubKey(userhandle, keyType, callback) {
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
                        assert.strictEqual(ns._showKeySignatureFailureException.callCount, 1);
                        assert.strictEqual(pubCu25519['you456789xw'], undefined);
                        assert.deepEqual(pubEd25519, {'you456789xw': 'the key'});

                        done();
                    })
                    .fail(function() {
                        assert.fail('failed to retrv. uncached, Cu key, bad sig.');
                    });
            });*/

            it("uncached Cu25519 key, seen, no signature", function(done) {
                sandbox.stub(window, 'u_authring', { Cu25519: {} });
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': 'the key' });
                sandbox.stub(window, 'pubCu25519', {});

                sandbox.stub(ns, 'getPubKeyAttribute').returns(MegaPromise.resolve('the key'));
                sandbox.stub(ns, '_getPubKeyAuthentication').returns(authring.AUTHENTICATION_METHOD.SEEN);
                sandbox.stub(authring, 'getContactAuthenticated').returns({ fingerprint: 'smudge' });
                sandbox.stub(mega.attr, 'get').returns('');
                sandbox.stub(authring, 'computeFingerprint').returns('smudge');
                sandbox.stub(window, 'base64urldecode', _echo);
                sandbox.stub(window, 'assertUserHandle');
                sandbox.stub(ns, '_checkSignature').returns(origMegaPromise.resolve(null));

                // This is to pass through the first call directly, then stub on subsequent ones.
                var _getPubKey = ns.getPubKey;
                var callCount = 0;
                sandbox.stub(ns, 'getPubKey', function __getPubKey(userhandle, keyType, callback) {
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
                sandbox.stub(window, 'u_authring', { Cu25519: {} });
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': 'the key' });
                sandbox.stub(window, 'pubCu25519', {});

                sandbox.stub(ns, 'getPubKeyAttribute').returns(MegaPromise.resolve('the key'));
                sandbox.stub(ns, '_getPubKeyAuthentication').returns(null);
                sandbox.stub(authring, 'getContactAuthenticated').returns(false);
                sandbox.stub(mega.attr, 'get').returns('');
                sandbox.stub(authring, 'computeFingerprint').returns('smudge');
                sandbox.stub(window, 'base64urldecode', _echo);
                sandbox.stub(window, 'assertUserHandle');
                sandbox.stub(ns, '_checkSignature').returns(origMegaPromise.resolve(null));
                sandbox.stub(authring, 'setContactAuthenticated');

                // This is to pass through the first call directly, then stub on subsequent ones.
                var _getPubKey = ns.getPubKey;
                var callCount = 0;
                sandbox.stub(ns, 'getPubKey', function __getPubKey(userhandle, keyType, callback) {
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
                sandbox.stub(window, 'u_authring', { Cu25519: {} });
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': 'the key' });
                sandbox.stub(window, 'pubCu25519', {});

                sandbox.stub(ns, 'getPubKeyAttribute').returns(MegaPromise.resolve('the key'));
                sandbox.stub(ns, '_getPubKeyAuthentication').returns(authring.AUTHENTICATION_METHOD.SEEN);
                sandbox.stub(mega.attr, 'get').returns('squiggle');
                sandbox.stub(authring, 'computeFingerprint').returns('smudge');
                sandbox.stub(window, 'base64urldecode', _echo);
                sandbox.stub(window, 'assertUserHandle');
                sandbox.stub(ns, '_checkSignature').returns(origMegaPromise.resolve(true));
                sandbox.stub(authring, 'setContactAuthenticated');

                // This is to pass through the first call directly, then stub on subsequent ones.
                var _getPubKey = ns.getPubKey;
                var callCount = 0;
                sandbox.stub(ns, 'getPubKey', function __getPubKey(userhandle, keyType, callback) {
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
                sandbox.stub(ns, 'getPubKey').returns('a promise');
                var result = ns.getPubRSA('you456789xw');
                assert.strictEqual(result, 'a promise');
                assert.strictEqual(ns.getPubKey.callCount, 1);
                assert.deepEqual(ns.getPubKey.args[0],
                                 ['you456789xw', 'RSA', undefined]);
            });

            it('getPubEd25519()', function() {
                sandbox.stub(ns, 'getPubKey').returns('a promise');
                var result = ns.getPubEd25519('you456789xw');
                assert.strictEqual(result, 'a promise');
                assert.strictEqual(ns.getPubKey.callCount, 1);
                assert.deepEqual(ns.getPubKey.args[0],
                                 ['you456789xw', 'Ed25519', undefined]);
            });

            it('getPubCu25519()', function() {
                sandbox.stub(ns, 'getPubKey').returns('a promise');
                var result = ns.getPubCu25519('you456789xw');
                assert.strictEqual(result, 'a promise');
                assert.strictEqual(ns.getPubKey.callCount, 1);
                assert.deepEqual(ns.getPubKey.args[0],
                                 ['you456789xw', 'Cu25519', undefined]);
            });
        });

        describe('getFingerprintEd25519', function() {
            it("cached key", function() {
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': 'the key' });
                sandbox.stub(authring, 'computeFingerprint').returns('the fingerprint');
                var masterPromise = _stubMegaPromise(sinon, sandbox);

                var result = ns.getFingerprintEd25519('you456789xw');
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(authring.computeFingerprint.callCount, 1);
                assert.strictEqual(masterPromise.resolve.callCount, 1);
                assert.strictEqual(masterPromise.resolve.args[0][0], 'the fingerprint');
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Got Ed25519 fingerprint for user "you456789xw": the fingerprint');
            });

            it("cached key, hex", function() {
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': 'the key' });
                sandbox.stub(authring, 'computeFingerprint').returns('the hexprint');
                var masterPromise = _stubMegaPromise(sinon, sandbox);

                var result = ns.getFingerprintEd25519('you456789xw', 'hex');
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(authring.computeFingerprint.callCount, 1);
                assert.strictEqual(masterPromise.resolve.callCount, 1);
                assert.strictEqual(masterPromise.resolve.args[0][0], 'the hexprint');
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Got Ed25519 fingerprint for user "you456789xw": the hexprint');
            });

            it("cached key, binary string", function() {
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': 'the key' });
                sandbox.stub(authring, 'computeFingerprint').returns('\u0000\u0001\u0002\u0003');
                var masterPromise = _stubMegaPromise(sinon, sandbox);

                var result = ns.getFingerprintEd25519('you456789xw', 'string');
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(authring.computeFingerprint.callCount, 1);
                assert.strictEqual(masterPromise.resolve.callCount, 1);
                assert.strictEqual(masterPromise.resolve.args[0][0], '\u0000\u0001\u0002\u0003');
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Got Ed25519 fingerprint for user "you456789xw": AAECAw');
            });

            it("non-cached", function() {
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'pubEd25519', {});
                sandbox.stub(authring, 'computeFingerprint').returns('the fingerprint');
                var masterPromise = _stubMegaPromise(sinon, sandbox);
                var keyPromise = _stubMegaPromise(sinon);
                sandbox.stub(crypt, 'getPubEd25519').returns(keyPromise);

                var result = ns.getFingerprintEd25519('you456789xw');
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(crypt.getPubEd25519.callCount, 1);
                assert.strictEqual(crypt.getPubEd25519.args[0][0], 'you456789xw');
                assert.strictEqual(keyPromise.done.callCount, 1);

                var fingerprintCallback = keyPromise.done.args[0][0];
                // Now stub getFingerprintEd25519(), as we're calling it recursively.
                sandbox.stub(ns, 'getFingerprintEd25519').returns('recursion');
                fingerprintCallback();
                assert.strictEqual(ns.getFingerprintEd25519.callCount, 1);
                assert.deepEqual(ns.getFingerprintEd25519.args[0], ['you456789xw', undefined]);
                assert.strictEqual(masterPromise.linkDoneAndFailTo.callCount, 1);
                assert.strictEqual(masterPromise.linkDoneAndFailTo.args[0][0], 'recursion');
            });

            it("cached, hex", function() {
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': ED25519_PUB_KEY });
                sandbox.stub(authring, 'computeFingerprint').returns('21fe31dfa154a261626bf854046fd2271b7bed4b');
                ns.getFingerprintEd25519('you456789xw', 'hex');
                assert.strictEqual(authring.computeFingerprint.callCount, 1);
                assert.strictEqual(authring.computeFingerprint.args[0][2], 'hex');
                assert.deepEqual(pubEd25519, { 'you456789xw': ED25519_PUB_KEY });
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Got Ed25519 fingerprint for user "you456789xw": 21fe31dfa154a261626bf854046fd2271b7bed4b');
            });

            it("cached, string", function() {
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': ED25519_PUB_KEY });
                sandbox.stub(authring, 'computeFingerprint').returns(ED25519_FINGERPRINT);
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
