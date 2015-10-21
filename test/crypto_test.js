/**
 * @fileOverview
 * Crypto operations unit tests.
 */

describe("crypto unit test", function() {
    "use strict";

    var ns = crypt;
    var assert = chai.assert;

    // Create/restore Sinon stub/spy/mock sandboxes.
    var sandbox = null;

    // Some test data.
    var ED25519_PUB_KEY = atob('11qYAYKxCrfVS/7TyWQHOg7hcvPapiMlrwIaaPcHURo=');
    var ED25519_FINGERPRINT = base64urldecode('If4x36FUomFia/hUBG/SJxt77Us');

    var _echo = function(x) { return x; };

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('crypt namespace', function() {
        describe('getPubKeyAattribute()', function() {
            it("RSA key", function() {
                sandbox.stub(ns._logger, '_log');
                var rootPromise = { resolve: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(rootPromise);
                var pubKey = 'the key';
                sandbox.stub(window, 'crypto_decodepubkey').returns(pubKey);
                sandbox.stub(window, 'base64urldecode');
                sandbox.stub(window, 'api_req');
                sandbox.stub(window, 'assertUserHandle');

                var result = ns.getPubKeyAttribute('you456789xw', 'RSA');
                assert.strictEqual(result, rootPromise);
                assert.strictEqual(api_req.callCount, 1);
                assert.deepEqual(api_req.args[0][0], { a: 'uk', u: 'you456789xw' });
                assert.strictEqual(api_req.args[0][1].u, 'you456789xw');

                var settleFunction = api_req.args[0][1].callback;
                settleFunction({ pubk: pubKey });
                assert.strictEqual(rootPromise.resolve.callCount, 1);
                assert.strictEqual(rootPromise.resolve.args[0][0], pubKey);
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'Got RSA pub key of user you456789xw: "the key"');
            });

            it("API error on RSA key", function() {
                sandbox.stub(ns._logger, '_log');
                var rootPromise = { then: sinon.stub(),
                                    reject: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(rootPromise);
                sandbox.stub(window, 'api_req');

                var result = ns.getPubKeyAttribute('you456789xw', 'RSA');
                assert.strictEqual(result, rootPromise);
                assert.strictEqual(api_req.callCount, 1);
                assert.deepEqual(api_req.args[0][0], { a: 'uk', u: 'you456789xw' });
                assert.strictEqual(api_req.args[0][1].u, 'you456789xw');

                var settleFunction = api_req.args[0][1].callback;
                settleFunction(ENOENT);
                assert.strictEqual(rootPromise.reject.callCount, 1);
                assert.strictEqual(rootPromise.reject.args[0][0], ENOENT);
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'RSA pub key for you456789xw could not be retrieved: -9');
            });

            it("Cu25519 key", function() {
                sandbox.stub(ns._logger, '_log');
                var rootPromise = { resolve: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(rootPromise);
                var attributePromise = { done: sinon.stub() };
                sandbox.stub(window, 'getUserAttribute').returns(attributePromise);
                sandbox.stub(window, 'base64urldecode', _echo);
                sandbox.stub(window, 'assertUserHandle');

                var result = ns.getPubKeyAttribute('you456789xw', 'Cu25519');
                assert.strictEqual(result, rootPromise);
                assert.strictEqual(getUserAttribute.callCount, 1);
                assert.strictEqual(attributePromise.done.callCount, 1);

                var settleFunction = attributePromise.done.args[0][0];
                settleFunction('the key');
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'Got Cu25519 pub key of user you456789xw.');
            });

            it("Ed25519 key", function() {
                sandbox.stub(ns._logger, '_log');
                var rootPromise = { resolve: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(rootPromise);
                var attributePromise = { done: sinon.stub() };
                sandbox.stub(window, 'getUserAttribute').returns(attributePromise);
                sandbox.stub(window, 'base64urldecode', _echo);
                sandbox.stub(window, 'assertUserHandle');

                var result = ns.getPubKeyAttribute('you456789xw', 'Ed25519');
                assert.strictEqual(result, rootPromise);
                assert.strictEqual(getUserAttribute.callCount, 1);
                assert.strictEqual(attributePromise.done.callCount, 1);

                var settleFunction = attributePromise.done.args[0][0];
                settleFunction('the key');
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'Got Ed25519 pub key of user you456789xw.');
            });
        });

        describe('_getPubKeyAuthentication()', function() {
            it("unseen key", function() {
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': ED25519_PUB_KEY });
                sandbox.stub(authring, 'getContactAuthenticated').returns(false);
                sandbox.stub(authring, 'equalFingerprints').returns(undefined);
                var result = ns._getPubKeyAuthentication('you456789xw', 'Ed25519');
                assert.strictEqual(result, null);
            });

            it("seen key", function() {
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': ED25519_PUB_KEY });
                var authenticated = { fingerprint: ED25519_FINGERPRINT,
                                      method: authring.AUTHENTICATION_METHOD.SEEN,
                                      confidence: authring.KEY_CONFIDENCE.UNSURE };
                sandbox.stub(authring, 'getContactAuthenticated').returns(authenticated);
                sandbox.stub(authring, 'equalFingerprints').returns(true);
                var result = ns._getPubKeyAuthentication('you456789xw', 'Ed25519');
                assert.strictEqual(result, authring.AUTHENTICATION_METHOD.SEEN);
            });

            it("signed key", function() {
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': ED25519_PUB_KEY });
                var authenticated = { fingerprint: ED25519_FINGERPRINT,
                                      method: authring.AUTHENTICATION_METHOD.SIGNATURE_VERIFIED,
                                      confidence: authring.KEY_CONFIDENCE.UNSURE };
                sandbox.stub(authring, 'getContactAuthenticated').returns(authenticated);
                sandbox.stub(authring, 'equalFingerprints').returns(true);
                var result = ns._getPubKeyAuthentication('you456789xw', 'Ed25519');
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
                var result = ns._getPubKeyAuthentication('you456789xw', 'Ed25519');
                assert.strictEqual(result, false);
            });
        });

        describe('_checkSignature()', function() {
            it("good signature", function() {
                sandbox.stub(authring, 'verifyKey').returns(true);
                var result = ns._checkSignature('squiggle', 'RSA key', 'RSA', 'Ed key');
                assert.strictEqual(result, true);
                assert.strictEqual(authring.verifyKey.callCount, 1);
                assert.deepEqual(authring.verifyKey.args[0],
                                 ['squiggle', 'RSA key', 'RSA', 'Ed key']);
            });

            it("bad signature", function() {
                sandbox.stub(authring, 'verifyKey').returns(false);
                var result = ns._checkSignature('squiggle', 'RSA key', 'RSA', 'Ed key');
                assert.strictEqual(result, false);
                assert.strictEqual(authring.verifyKey.callCount, 1);
                assert.deepEqual(authring.verifyKey.args[0],
                                 ['squiggle', 'RSA key', 'RSA', 'Ed key']);
            });

            it("empty signature", function() {
                sandbox.stub(authring, 'verifyKey');
                var result = ns._checkSignature('', 'RSA key', 'RSA', 'Ed key');
                assert.strictEqual(result, null);
                assert.strictEqual(authring.verifyKey.callCount, 0);
            });
        });

        describe('getPubKey()', function() {
            it("cached Ed25519 key", function() {
                sandbox.stub(window, 'u_authring', { Ed25519: {} });
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': 'the key' });
                var masterPromise = { resolve: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(masterPromise);

                var result = ns.getPubKey('you456789xw', 'Ed25519');
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(masterPromise.resolve.callCount, 1);
                assert.deepEqual(masterPromise.resolve.args[0], ['the key']);
                assert.deepEqual(pubEd25519, { 'you456789xw': 'the key' });
            });

            it("cached Ed25519 key, with callback", function() {
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'u_authring', { Ed25519: {} });
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': 'the key' });
                var masterPromise = { resolve: sinon.stub(),
                                      done: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(masterPromise);
                var callback = sinon.stub();

                var result = ns.getPubKey('you456789xw', 'Ed25519', callback);
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(masterPromise.resolve.callCount, 1);
                assert.deepEqual(masterPromise.resolve.args[0], ['the key']);
                assert.deepEqual(pubEd25519, { 'you456789xw': 'the key' });

                assert.strictEqual(masterPromise.done.callCount, 1);
                var doneCallback = masterPromise.done.args[0][0];
                doneCallback('foo');
                assert.strictEqual(callback.callCount, 1);
                assert.deepEqual(callback.args[0], ['foo']);
                assert.strictEqual(ns._logger._log.args[0][1][0], 'Calling callback');
            });

            it("cached Ed25519 key, uninitialised authring", function() {
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'u_authring', { Ed25519: undefined });
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': 'the key' });
                var masterPromise = { linkFailTo: sinon.stub(),
                                      linkDoneAndFailTo: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(masterPromise);
                var authringPromise = { done: sinon.stub() };
                sandbox.stub(authring, 'getContacts').returns(authringPromise);

                var result = ns.getPubKey('you456789xw', 'Ed25519');
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(authring.getContacts.callCount, 1);
                assert.deepEqual(masterPromise.linkFailTo.args[0][0], authringPromise);
                assert.strictEqual(authringPromise.done.callCount, 1);

                var authringDone = authringPromise.done.args[0][0];
                authringDone();
                assert.deepEqual(masterPromise.linkDoneAndFailTo.callCount, 1);
                assert.strictEqual(masterPromise.linkDoneAndFailTo.args[0][0], masterPromise);
                assert.deepEqual(pubEd25519, { 'you456789xw': 'the key' });
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'First initialising the Ed25519 authring.');
            });

            it("uncached Ed25519 key", function() {
                sandbox.stub(window, 'u_authring', { Ed25519: {} });
                sandbox.stub(window, 'pubEd25519', {});
                var masterPromise = { resolve: sinon.stub(),
                                      linkFailTo: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(masterPromise);
                var pubKeyPromise = { done: sinon.stub() };
                sandbox.stub(ns, 'getPubKeyAttribute').returns(pubKeyPromise);
                sandbox.stub(ns, '_getPubKeyAuthentication').returns(authring.AUTHENTICATION_METHOD.SEEN);
                sandbox.stub(authring, 'computeFingerprint').returns('smudge');

                var result = ns.getPubKey('you456789xw', 'Ed25519');
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(pubKeyPromise.done.callCount, 1);

                var pubKeyCallback = pubKeyPromise.done.args[0][0];
                pubKeyCallback('the key');
                assert.strictEqual(ns._getPubKeyAuthentication.callCount, 1);
                assert.strictEqual(authring.computeFingerprint.callCount, 1);
                assert.strictEqual(masterPromise.resolve.callCount, 1);
                assert.deepEqual(masterPromise.resolve.args[0], ['the key']);
                assert.strictEqual(masterPromise.linkFailTo.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.args[0][0], pubKeyPromise);
                assert.deepEqual(pubEd25519, { 'you456789xw': 'the key' });
            });

            it("uncached Ed25519 key, unseen", function() {
                sandbox.stub(window, 'u_authring', { Ed25519: {} });
                sandbox.stub(window, 'pubEd25519', {});
                var masterPromise = { resolve: sinon.stub(),
                                      linkFailTo: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(masterPromise);
                var pubKeyPromise = { done: sinon.stub() };
                sandbox.stub(ns, 'getPubKeyAttribute').returns(pubKeyPromise);
                sandbox.stub(ns, '_getPubKeyAuthentication').returns(null);
                sandbox.stub(authring, 'computeFingerprint').returns('smudge');
                sandbox.stub(authring, 'setContactAuthenticated');

                var result = ns.getPubKey('you456789xw', 'Ed25519');
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(pubKeyPromise.done.callCount, 1);

                var pubKeyCallback = pubKeyPromise.done.args[0][0];
                pubKeyCallback('the key');
                assert.strictEqual(ns._getPubKeyAuthentication.callCount, 1);
                assert.strictEqual(authring.computeFingerprint.callCount, 1);
                assert.strictEqual(masterPromise.resolve.callCount, 1);
                assert.deepEqual(masterPromise.resolve.args[0], ['the key']);
                assert.strictEqual(authring.setContactAuthenticated.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.args[0][0], pubKeyPromise);
                assert.deepEqual(pubEd25519, { 'you456789xw': 'the key' });
            });

            it("uncached Ed25519 key, bad fingerprint", function() {
                sandbox.stub(window, 'u_authring', { Ed25519: {} });
                sandbox.stub(window, 'pubEd25519', {});
                var masterPromise = { reject: sinon.stub(),
                                      linkFailTo: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(masterPromise);
                var pubKeyPromise = { done: sinon.stub() };
                sandbox.stub(ns, 'getPubKeyAttribute').returns(pubKeyPromise);
                sandbox.stub(ns, '_getPubKeyAuthentication').returns(false);
                sandbox.stub(authring, 'computeFingerprint').returns('smudge');
                sandbox.stub(ns, '_showFingerprintMismatchException');

                var result = ns.getPubKey('you456789xw', 'Ed25519');
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(pubKeyPromise.done.callCount, 1);

                var pubKeyCallback = pubKeyPromise.done.args[0][0];
                pubKeyCallback('the key');
                assert.strictEqual(ns._getPubKeyAuthentication.callCount, 1);
                assert.strictEqual(authring.computeFingerprint.callCount, 1);
                assert.strictEqual(ns._showFingerprintMismatchException.callCount, 1);
                assert.strictEqual(masterPromise.reject.callCount, 1);
                assert.strictEqual(masterPromise.reject.args[0][0], EINTERNAL);
                assert.strictEqual(masterPromise.linkFailTo.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.args[0][0], pubKeyPromise);
                assert.strictEqual(pubEd25519['you456789xw'], undefined);
            });

            it("uncached Cu25519 key", function() {
                sandbox.stub(window, 'u_authring', { Cu25519: {} });
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': 'the key' });
                sandbox.stub(window, 'pubCu25519', {});
                var masterPromise = { resolve: sinon.stub(),
                                      linkFailTo: sinon.stub() };
                var signatureVerificationPromise = { done: sinon.stub() };
                var _MegaPromise = function() {
                    return masterPromise;
                };
                _MegaPromise.all = sinon.stub().returns(signatureVerificationPromise);
                sandbox.stub(window, 'MegaPromise', _MegaPromise);
                var pubKeyPromise = { done: sinon.stub() };
                sandbox.stub(ns, 'getPubKeyAttribute').returns(pubKeyPromise);
                sandbox.stub(ns, '_getPubKeyAuthentication').returns(authring.AUTHENTICATION_METHOD.SIGNATURE_VERIFIED);
                sandbox.stub(window, 'getUserAttribute').returns('squiggle');
                sandbox.stub(authring, 'computeFingerprint').returns('smudge');
                sandbox.stub(window, 'base64urldecode', _echo);
                sandbox.stub(window, 'assertUserHandle');
                sandbox.stub(ns, '_checkSignature').returns(true);

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
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(ns.getPubKeyAttribute.callCount, 1);
                assert.strictEqual(pubKeyPromise.done.callCount, 1);
                assert.strictEqual(ns.getPubKey.callCount, 2);
                assert.strictEqual(getUserAttribute.callCount, 1);
                assert.strictEqual(MegaPromise.all.callCount, 1);
                assert.strictEqual(signatureVerificationPromise.done.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.args[0][0], signatureVerificationPromise);

                var pubKeyPromiseCallback = pubKeyPromise.done.args[0][0];
                pubKeyPromiseCallback('the key');
                assert.strictEqual(ns._getPubKeyAuthentication.callCount, 1);
                assert.strictEqual(authring.computeFingerprint.callCount, 1);

                var signatureVerificationCallback = signatureVerificationPromise.done.args[0][0];
                signatureVerificationCallback(['the key', 'Ed placebo', 'squiggle']);
                assert.strictEqual(base64urldecode.callCount, 1);
                assert.strictEqual(ns._checkSignature.callCount, 1);
                assert.strictEqual(masterPromise.resolve.callCount, 1);
                assert.deepEqual(pubEd25519, { 'you456789xw': 'the key' });
            });

            it("uncached Cu25519 key, unseen", function() {
                sandbox.stub(window, 'u_authring', { Cu25519: {} });
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': 'the key' });
                sandbox.stub(window, 'pubCu25519', {});
                var masterPromise = { resolve: sinon.stub(),
                                      linkFailTo: sinon.stub() };
                var signatureVerificationPromise = { done: sinon.stub() };
                var _MegaPromise = function() {
                    return masterPromise;
                };
                _MegaPromise.all = sinon.stub().returns(signatureVerificationPromise);
                sandbox.stub(window, 'MegaPromise', _MegaPromise);
                var pubKeyPromise = { done: sinon.stub() };
                sandbox.stub(ns, 'getPubKeyAttribute').returns(pubKeyPromise);
                sandbox.stub(ns, '_getPubKeyAuthentication').returns(authring.AUTHENTICATION_METHOD.SIGNATURE_VERIFIED);
                sandbox.stub(window, 'getUserAttribute').returns('squiggle');
                sandbox.stub(authring, 'computeFingerprint').returns('smudge');
                sandbox.stub(window, 'base64urldecode', _echo);
                sandbox.stub(window, 'assertUserHandle');
                sandbox.stub(ns, '_checkSignature').returns(true);

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
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(ns.getPubKeyAttribute.callCount, 1);
                assert.strictEqual(pubKeyPromise.done.callCount, 1);
                assert.strictEqual(ns.getPubKey.callCount, 2);
                assert.strictEqual(getUserAttribute.callCount, 1);
                assert.strictEqual(MegaPromise.all.callCount, 1);
                assert.strictEqual(signatureVerificationPromise.done.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.args[0][0], signatureVerificationPromise);

                var pubKeyPromiseCallback = pubKeyPromise.done.args[0][0];
                pubKeyPromiseCallback('the key');
                assert.strictEqual(ns._getPubKeyAuthentication.callCount, 1);
                assert.strictEqual(authring.computeFingerprint.callCount, 1);

                var signatureVerificationCallback = signatureVerificationPromise.done.args[0][0];
                signatureVerificationCallback(['the key', 'Ed placebo', 'squiggle']);
                assert.strictEqual(base64urldecode.callCount, 1);
                assert.strictEqual(ns._checkSignature.callCount, 1);
                assert.strictEqual(masterPromise.resolve.callCount, 1);
                assert.deepEqual(pubEd25519, { 'you456789xw': 'the key' });
            });

            it("uncached Cu25519 key, new key", function() {
                sandbox.stub(window, 'u_authring', { Cu25519: {} });
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': 'the key' });
                sandbox.stub(window, 'pubCu25519', {});
                var masterPromise = { resolve: sinon.stub(),
                                      linkFailTo: sinon.stub() };
                var signatureVerificationPromise = { done: sinon.stub() };
                var _MegaPromise = function() {
                    return masterPromise;
                };
                _MegaPromise.all = sinon.stub().returns(signatureVerificationPromise);
                sandbox.stub(window, 'MegaPromise', _MegaPromise);
                var pubKeyPromise = { done: sinon.stub() };
                sandbox.stub(ns, 'getPubKeyAttribute').returns(pubKeyPromise);
                sandbox.stub(ns, '_getPubKeyAuthentication').returns(false);
                sandbox.stub(window, 'getUserAttribute').returns('squiggle');
                sandbox.stub(authring, 'computeFingerprint').returns('smudge');
                sandbox.stub(window, 'base64urldecode', _echo);
                sandbox.stub(window, 'assertUserHandle');
                sandbox.stub(ns, '_checkSignature').returns(true);
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
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(ns.getPubKeyAttribute.callCount, 1);
                assert.strictEqual(pubKeyPromise.done.callCount, 1);
                assert.strictEqual(ns.getPubKey.callCount, 2);
                assert.strictEqual(getUserAttribute.callCount, 1);
                assert.strictEqual(MegaPromise.all.callCount, 1);
                assert.strictEqual(signatureVerificationPromise.done.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.args[0][0], signatureVerificationPromise);

                var pubKeyPromiseCallback = pubKeyPromise.done.args[0][0];
                pubKeyPromiseCallback('the key');
                assert.strictEqual(ns._getPubKeyAuthentication.callCount, 1);
                assert.strictEqual(authring.computeFingerprint.callCount, 1);

                var signatureVerificationCallback = signatureVerificationPromise.done.args[0][0];
                signatureVerificationCallback(['the key', 'Ed placebo', 'squiggle']);
                assert.strictEqual(base64urldecode.callCount, 1);
                assert.strictEqual(ns._checkSignature.callCount, 1);
                assert.strictEqual(masterPromise.resolve.callCount, 1);
                assert.strictEqual(authring.setContactAuthenticated.callCount, 1);
                assert.deepEqual(pubCu25519, { 'you456789xw': 'the key' });
                assert.deepEqual(pubEd25519, { 'you456789xw': 'the key' });
            });

            it("uncached Cu25519 key, new key, no signature", function() {
                sandbox.stub(window, 'u_authring',
                    { Cu25519: { 'you456789xw': 'different stuff' } });
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': 'the key' });
                sandbox.stub(window, 'pubCu25519', {});
                var masterPromise = { reject: sinon.stub(),
                                      linkFailTo: sinon.stub() };
                var signatureVerificationPromise = { done: sinon.stub() };
                var _MegaPromise = function() {
                    return masterPromise;
                };
                _MegaPromise.all = sinon.stub().returns(signatureVerificationPromise);
                sandbox.stub(window, 'MegaPromise', _MegaPromise);
                var pubKeyPromise = { done: sinon.stub() };
                sandbox.stub(ns, 'getPubKeyAttribute').returns(pubKeyPromise);
                sandbox.stub(ns, '_getPubKeyAuthentication').returns(authring.AUTHENTICATION_METHOD.SEEN);
                sandbox.stub(authring, 'getContactAuthenticated').returns({ fingerprint: 'bad smudge' });
                sandbox.stub(ns, '_showFingerprintMismatchException');
                sandbox.stub(window, 'getUserAttribute').returns('');
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
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(ns.getPubKeyAttribute.callCount, 1);
                assert.strictEqual(pubKeyPromise.done.callCount, 1);
                assert.strictEqual(ns.getPubKey.callCount, 2);
                assert.strictEqual(getUserAttribute.callCount, 1);
                assert.strictEqual(MegaPromise.all.callCount, 1);
                assert.strictEqual(signatureVerificationPromise.done.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.args[0][0], signatureVerificationPromise);

                var pubKeyPromiseCallback = pubKeyPromise.done.args[0][0];
                pubKeyPromiseCallback('the key');
                assert.strictEqual(ns._getPubKeyAuthentication.callCount, 1);
                assert.strictEqual(authring.computeFingerprint.callCount, 1);

                var signatureVerificationCallback = signatureVerificationPromise.done.args[0][0];
                signatureVerificationCallback(['the key', 'Ed placebo', '']);
                assert.strictEqual(base64urldecode.callCount, 1);
                assert.strictEqual(ns._checkSignature.callCount, 1);
                assert.strictEqual(authring.getContactAuthenticated.callCount, 1);
                assert.strictEqual(ns._showFingerprintMismatchException.callCount, 1);
                assert.strictEqual(masterPromise.reject.callCount, 1);
                assert.strictEqual(masterPromise.reject.args[0][0], EINTERNAL);
                assert.strictEqual(pubCu25519['you456789xw'], undefined);
            });

            it("uncached Cu25519 key, bad signature", function() {
                sandbox.stub(window, 'u_authring', { Cu25519: {} });
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': 'the key' });
                sandbox.stub(window, 'pubCu25519', {});
                var masterPromise = { reject: sinon.stub(),
                                      linkFailTo: sinon.stub() };
                var signatureVerificationPromise = { done: sinon.stub() };
                var _MegaPromise = function() {
                    return masterPromise;
                };
                _MegaPromise.all = sinon.stub().returns(signatureVerificationPromise);
                sandbox.stub(window, 'MegaPromise', _MegaPromise);
                var pubKeyPromise = { done: sinon.stub() };
                sandbox.stub(ns, 'getPubKeyAttribute').returns(pubKeyPromise);
                sandbox.stub(ns, '_getPubKeyAuthentication').returns(false);
                sandbox.stub(window, 'getUserAttribute').returns('squiggle');
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
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(ns.getPubKeyAttribute.callCount, 1);
                assert.strictEqual(pubKeyPromise.done.callCount, 1);
                assert.strictEqual(ns.getPubKey.callCount, 2);
                assert.strictEqual(getUserAttribute.callCount, 1);
                assert.strictEqual(MegaPromise.all.callCount, 1);
                assert.strictEqual(signatureVerificationPromise.done.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.args[0][0], signatureVerificationPromise);

                var pubKeyPromiseCallback = pubKeyPromise.done.args[0][0];
                pubKeyPromiseCallback('the key');
                assert.strictEqual(ns._getPubKeyAuthentication.callCount, 1);
                assert.strictEqual(authring.computeFingerprint.callCount, 1);

                var signatureVerificationCallback = signatureVerificationPromise.done.args[0][0];
                signatureVerificationCallback(['the key', 'Ed placebo', 'squiggle']);
                assert.strictEqual(base64urldecode.callCount, 1);
                assert.strictEqual(ns._checkSignature.callCount, 1);
                assert.strictEqual(ns._showKeySignatureFailureException.callCount, 1);
                assert.strictEqual(masterPromise.reject.callCount, 1);
                assert.strictEqual(masterPromise.reject.args[0][0], EINTERNAL);
                assert.strictEqual(pubCu25519['you456789xw'], undefined);
                assert.deepEqual(pubEd25519, { 'you456789xw': 'the key' });
            });

            it("uncached Cu25519 key, seen, no signature", function() {
                sandbox.stub(window, 'u_authring', { Cu25519: {} });
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': 'the key' });
                sandbox.stub(window, 'pubCu25519', {});
                var masterPromise = { resolve: sinon.stub(),
                                      linkFailTo: sinon.stub() };
                var signatureVerificationPromise = { done: sinon.stub() };
                var _MegaPromise = function() {
                    return masterPromise;
                };
                _MegaPromise.all = sinon.stub().returns(signatureVerificationPromise);
                sandbox.stub(window, 'MegaPromise', _MegaPromise);
                var pubKeyPromise = { done: sinon.stub() };
                sandbox.stub(ns, 'getPubKeyAttribute').returns(pubKeyPromise);
                sandbox.stub(ns, '_getPubKeyAuthentication').returns(authring.AUTHENTICATION_METHOD.SEEN);
                sandbox.stub(authring, 'getContactAuthenticated').returns({ fingerprint: 'smudge' });
                sandbox.stub(window, 'getUserAttribute').returns('');
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
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(ns.getPubKeyAttribute.callCount, 1);
                assert.strictEqual(pubKeyPromise.done.callCount, 1);
                assert.strictEqual(ns.getPubKey.callCount, 2);
                assert.strictEqual(getUserAttribute.callCount, 1);
                assert.strictEqual(MegaPromise.all.callCount, 1);
                assert.strictEqual(signatureVerificationPromise.done.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.args[0][0], signatureVerificationPromise);

                var pubKeyPromiseCallback = pubKeyPromise.done.args[0][0];
                pubKeyPromiseCallback('the key');
                assert.strictEqual(ns._getPubKeyAuthentication.callCount, 1);
                assert.strictEqual(authring.computeFingerprint.callCount, 1);

                var signatureVerificationCallback = signatureVerificationPromise.done.args[0][0];
                signatureVerificationCallback(['the key', 'Ed placebo', 'squiggle']);
                assert.strictEqual(base64urldecode.callCount, 1);
                assert.strictEqual(ns._checkSignature.callCount, 1);
                assert.strictEqual(masterPromise.resolve.callCount, 1);
                assert.deepEqual(pubCu25519, { 'you456789xw': 'the key' });
                assert.deepEqual(pubEd25519, { 'you456789xw': 'the key' });
            });

            it("uncached Cu25519 key, unseen, no signature", function() {
                sandbox.stub(window, 'u_authring', { Cu25519: {} });
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': 'the key' });
                sandbox.stub(window, 'pubCu25519', {});
                var masterPromise = { resolve: sinon.stub(),
                                      linkFailTo: sinon.stub() };
                var signatureVerificationPromise = { done: sinon.stub() };
                var _MegaPromise = function() {
                    return masterPromise;
                };
                _MegaPromise.all = sinon.stub().returns(signatureVerificationPromise);
                sandbox.stub(window, 'MegaPromise', _MegaPromise);
                var pubKeyPromise = { done: sinon.stub() };
                sandbox.stub(ns, 'getPubKeyAttribute').returns(pubKeyPromise);
                sandbox.stub(ns, '_getPubKeyAuthentication').returns(null);
                sandbox.stub(authring, 'getContactAuthenticated').returns(false);
                sandbox.stub(window, 'getUserAttribute').returns('');
                sandbox.stub(authring, 'computeFingerprint').returns('smudge');
                sandbox.stub(window, 'base64urldecode', _echo);
                sandbox.stub(window, 'assertUserHandle');
                sandbox.stub(ns, '_checkSignature').returns(null);
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
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(ns.getPubKeyAttribute.callCount, 1);
                assert.strictEqual(pubKeyPromise.done.callCount, 1);
                assert.strictEqual(ns.getPubKey.callCount, 2);
                assert.strictEqual(getUserAttribute.callCount, 1);
                assert.strictEqual(MegaPromise.all.callCount, 1);
                assert.strictEqual(signatureVerificationPromise.done.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.args[0][0], signatureVerificationPromise);

                var pubKeyPromiseCallback = pubKeyPromise.done.args[0][0];
                pubKeyPromiseCallback('the key');
                assert.strictEqual(ns._getPubKeyAuthentication.callCount, 1);
                assert.strictEqual(authring.computeFingerprint.callCount, 1);

                var signatureVerificationCallback = signatureVerificationPromise.done.args[0][0];
                signatureVerificationCallback(['the key', 'Ed placebo', 'squiggle']);
                assert.strictEqual(base64urldecode.callCount, 1);
                assert.strictEqual(ns._checkSignature.callCount, 1);
                assert.strictEqual(masterPromise.resolve.callCount, 1);
                assert.strictEqual(authring.setContactAuthenticated.callCount, 1);
                assert.deepEqual(pubCu25519, { 'you456789xw': 'the key' });
                assert.deepEqual(pubEd25519, { 'you456789xw': 'the key' });
            });

            it("cached Cu25519 key, seen, new signature", function() {
                sandbox.stub(window, 'u_authring', { Cu25519: {} });
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': 'the key' });
                sandbox.stub(window, 'pubCu25519', {});
                var masterPromise = { resolve: sinon.stub(),
                                      linkFailTo: sinon.stub() };
                var signatureVerificationPromise = { done: sinon.stub() };
                var _MegaPromise = function() {
                    return masterPromise;
                };
                _MegaPromise.all = sinon.stub().returns(signatureVerificationPromise);
                sandbox.stub(window, 'MegaPromise', _MegaPromise);
                var pubKeyPromise = { done: sinon.stub() };
                sandbox.stub(ns, 'getPubKeyAttribute').returns(pubKeyPromise);
                sandbox.stub(ns, '_getPubKeyAuthentication').returns(authring.AUTHENTICATION_METHOD.SEEN);
                sandbox.stub(window, 'getUserAttribute').returns('squiggle');
                sandbox.stub(authring, 'computeFingerprint').returns('smudge');
                sandbox.stub(window, 'base64urldecode', _echo);
                sandbox.stub(window, 'assertUserHandle');
                sandbox.stub(ns, '_checkSignature').returns(true);
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
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(ns.getPubKeyAttribute.callCount, 1);
                assert.strictEqual(pubKeyPromise.done.callCount, 1);
                assert.strictEqual(ns.getPubKey.callCount, 2);
                assert.strictEqual(getUserAttribute.callCount, 1);
                assert.strictEqual(MegaPromise.all.callCount, 1);
                assert.strictEqual(signatureVerificationPromise.done.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.args[0][0], signatureVerificationPromise);

                var pubKeyPromiseCallback = pubKeyPromise.done.args[0][0];
                pubKeyPromiseCallback('the key');
                assert.strictEqual(ns._getPubKeyAuthentication.callCount, 1);
                assert.strictEqual(authring.computeFingerprint.callCount, 1);

                var signatureVerificationCallback = signatureVerificationPromise.done.args[0][0];
                signatureVerificationCallback(['the key', 'Ed placebo', 'squiggle']);
                assert.strictEqual(base64urldecode.callCount, 1);
                assert.strictEqual(ns._checkSignature.callCount, 1);
                assert.strictEqual(masterPromise.resolve.callCount, 1);
                assert.strictEqual(authring.setContactAuthenticated.callCount, 1);
                assert.deepEqual(pubCu25519, { 'you456789xw': 'the key' });
                assert.deepEqual(pubEd25519, { 'you456789xw': 'the key' });
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
                var masterPromise = { resolve: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(masterPromise);

                var result = ns.getFingerprintEd25519('you456789xw');
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(authring.computeFingerprint.callCount, 1);
                assert.strictEqual(masterPromise.resolve.callCount, 1);
                assert.strictEqual(masterPromise.resolve.args[0][0], 'the fingerprint');
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'Got Ed25519 fingerprint for user "you456789xw": the fingerprint');
            });

            it("cached key, hex", function() {
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': 'the key' });
                sandbox.stub(authring, 'computeFingerprint').returns('the hexprint');
                var masterPromise = { resolve: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(masterPromise);

                var result = ns.getFingerprintEd25519('you456789xw', 'hex');
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(authring.computeFingerprint.callCount, 1);
                assert.strictEqual(masterPromise.resolve.callCount, 1);
                assert.strictEqual(masterPromise.resolve.args[0][0], 'the hexprint');
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'Got Ed25519 fingerprint for user "you456789xw": the hexprint');
            });

            it("cached key, binary string", function() {
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': 'the key' });
                sandbox.stub(authring, 'computeFingerprint').returns('\u0000\u0001\u0002\u0003');
                var masterPromise = { resolve: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(masterPromise);

                var result = ns.getFingerprintEd25519('you456789xw', 'string');
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(authring.computeFingerprint.callCount, 1);
                assert.strictEqual(masterPromise.resolve.callCount, 1);
                assert.strictEqual(masterPromise.resolve.args[0][0], '\u0000\u0001\u0002\u0003');
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'Got Ed25519 fingerprint for user "you456789xw": AAECAw');
            });

            it("non-cached", function() {
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'pubEd25519', {});
                sandbox.stub(authring, 'computeFingerprint').returns('the fingerprint');
                var masterPromise = { linkDoneAndFailTo: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(masterPromise);
                var keyPromise = { done: sinon.stub() };
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
                assert.strictEqual(ns._logger._log.args[0][1][0],
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
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'Got Ed25519 fingerprint for user "you456789xw": If4x36FUomFia_hUBG_SJxt77Us');
            });
        });
    });
});
