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

    describe('user attributes', function() {
        describe('_checkAuthenticationEd25519()', function() {
            it("unseen fingerprint", function() {
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': ED25519_PUB_KEY });
                sandbox.stub(authring, 'getContactAuthenticated').returns(false);
                sandbox.stub(authring, 'equalFingerprints').returns(undefined);
                sandbox.stub(authring, 'setContactAuthenticated');
                ns._checkAuthenticationEd25519('you456789xw');
                assert.strictEqual(authring.setContactAuthenticated.callCount, 1);
            });

            it("seen fingerprint", function() {
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': ED25519_PUB_KEY });
                var authenticated = { fingerprint: ED25519_FINGERPRINT,
                                      method: authring.AUTHENTICATION_METHOD.SEEN,
                                      confidence: authring.KEY_CONFIDENCE.UNSURE };
                sandbox.stub(authring, 'getContactAuthenticated').returns(authenticated);
                sandbox.stub(authring, 'equalFingerprints').returns(true);
                sandbox.stub(authring, 'setContactAuthenticated');
                ns._checkAuthenticationEd25519('you456789xw');
                assert.strictEqual(authring.setContactAuthenticated.callCount, 0);
            });

            it("fingerprint mismatch", function() {
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': ED25519_PUB_KEY });
                sandbox.stub(ns, 'showFingerprintMismatchException').throws('an exception')
                var authenticated = { fingerprint: base64urldecode('XyeqVYkXl3DkdXWxYqHe2XuL_G0'),
                                      method: authring.AUTHENTICATION_METHOD.SEEN,
                                      confidence: authring.KEY_CONFIDENCE.UNSURE };
                sandbox.stub(authring, 'getContactAuthenticated').returns(authenticated);
                sandbox.stub(authring, 'equalFingerprints').returns(false);
                sandbox.stub(authring, 'setContactAuthenticated');
                assert.throws(function() { ns._checkAuthenticationEd25519('you456789xw'); });
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'Error verifying authenticity of Ed25519 pub key: '
                                   + 'fingerprint does not match previously authenticated one!');
                assert.strictEqual(authring.setContactAuthenticated.callCount, 0);
                assert.strictEqual(ns.showFingerprintMismatchException.callCount, 1);
            });
        });

        describe('_asynchCheckAuthenticationRSA()', function() {
            it("unseen fingerprint", function() {
                sandbox.stub(window, 'u_pubkeys', { 'you456789xw': 'foo' });
                sandbox.stub(authring, 'getContactAuthenticated').returns(false);
                sandbox.stub(authring, 'computeFingerprint').returns(ED25519_FINGERPRINT);
                var attributePromise = { then: sinon.stub() };
                sandbox.stub(window, 'getUserAttribute').returns(attributePromise);
                sandbox.stub(window, 'base64urldecode').returns('autograph');
                sandbox.stub(ns, '_trackRSAKeyAuthentication').returns(true);
                sandbox.stub(ns, 'getPubEd25519');
                var rootPromise = { resolve: sinon.stub(),
                                    all: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(rootPromise);
                var compoundPromise = { then: sinon.stub() };
                sandbox.stub(MegaPromise, 'all').returns(compoundPromise);

                var result = ns._asynchCheckAuthenticationRSA('you456789xw');
                assert.strictEqual(result, rootPromise);
                assert.strictEqual(authring.getContactAuthenticated.callCount, 1);
                assert.strictEqual(authring.computeFingerprint.callCount, 1);
                assert.strictEqual(getUserAttribute.callCount, 1);

                var attributeCallback = attributePromise.then.args[0][0];
                result = attributeCallback('foo');
                assert.strictEqual(base64urldecode.callCount, 1);
                assert.strictEqual(result, 'autograph');

                assert.strictEqual(rootPromise.resolve.callCount, 0);
                var compoundCallback = compoundPromise.then.args[0][0];
                compoundCallback('foo');
                assert.strictEqual(rootPromise.resolve.callCount, 1);
                assert.deepEqual(rootPromise.resolve.args[0], [true]);
            });

            it("unseen fingerprint, no signature", function() {
                sandbox.stub(window, 'u_pubkeys', { 'you456789xw': 'foo' });
                sandbox.stub(authring, 'getContactAuthenticated').returns(false);
                sandbox.stub(authring, 'computeFingerprint').returns(ED25519_FINGERPRINT);
                var attributePromise = { then: sinon.stub() };
                sandbox.stub(window, 'getUserAttribute').returns(attributePromise);
                sandbox.stub(window, 'base64urldecode').returns('autograph');
                sandbox.stub(ns, '_trackRSAKeyAuthentication').returns(true);
                sandbox.stub(ns, 'getPubEd25519');
                var rootPromise = { resolve: sinon.stub(),
                                    all: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(rootPromise);
                var compoundPromise = { then: sinon.stub() };
                sandbox.stub(MegaPromise, 'all').returns(compoundPromise);

                var result = ns._asynchCheckAuthenticationRSA('you456789xw');
                assert.strictEqual(result, rootPromise);
                assert.strictEqual(authring.getContactAuthenticated.callCount, 1);
                assert.strictEqual(authring.computeFingerprint.callCount, 1);
                assert.strictEqual(getUserAttribute.callCount, 1);

                var attributeCallback = attributePromise.then.args[0][1];
                result = attributeCallback(ENOENT);
                assert.strictEqual(base64urldecode.callCount, 0);
                assert.strictEqual(result, rootPromise);
                assert.strictEqual(rootPromise.resolve.callCount, 1);
                assert.deepEqual(rootPromise.resolve.args[0], ['']);

                var compoundCallback = compoundPromise.then.args[0][0];
                compoundCallback('foo');
                assert.strictEqual(rootPromise.resolve.callCount, 2);
                assert.deepEqual(rootPromise.resolve.args[1], [true]);
            });

            it("seen fingerprint", function() {
                sandbox.stub(window, 'u_pubkeys', { 'you456789xw': 'foo' });
                var authenticated = { fingerprint: ED25519_FINGERPRINT,
                                      method: authring.AUTHENTICATION_METHOD.SIGNATURE_VERIFIED,
                                      confidence: authring.KEY_CONFIDENCE.UNSURE };
                sandbox.stub(authring, 'getContactAuthenticated').returns(authenticated);
                sandbox.stub(authring, 'computeFingerprint').returns(ED25519_FINGERPRINT);
                sandbox.stub(authring, 'equalFingerprints').returns(true);
                var rootPromise = { resolve: sinon.stub(),
                                    all: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(rootPromise);

                var result = ns._asynchCheckAuthenticationRSA('you456789xw');
                assert.strictEqual(result, rootPromise);
                assert.strictEqual(authring.getContactAuthenticated.callCount, 1);
                assert.strictEqual(authring.computeFingerprint.callCount, 1);
                assert.strictEqual(authring.equalFingerprints.callCount, 1);
                assert.strictEqual(rootPromise.resolve.callCount, 1);
                assert.deepEqual(rootPromise.resolve.args[0], [true]);
            });

            it("seen fingerprint, custom callback", function() {
                sandbox.stub(window, 'u_pubkeys', { 'you456789xw': 'foo' });
                var authenticated = { fingerprint: ED25519_FINGERPRINT,
                                      method: authring.AUTHENTICATION_METHOD.SIGNATURE_VERIFIED,
                                      confidence: authring.KEY_CONFIDENCE.UNSURE };
                sandbox.stub(authring, 'getContactAuthenticated').returns(authenticated);
                sandbox.stub(authring, 'computeFingerprint').returns(ED25519_FINGERPRINT);
                sandbox.stub(authring, 'equalFingerprints').returns(true);
                var rootPromise = { resolve: sinon.stub(),
                                    all: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(rootPromise);
                var myCallback = sinon.stub();

                var result = ns._asynchCheckAuthenticationRSA('you456789xw',
                                                              myCallback);
                assert.strictEqual(result, rootPromise);
                assert.strictEqual(authring.getContactAuthenticated.callCount, 1);
                assert.strictEqual(authring.computeFingerprint.callCount, 1);
                assert.strictEqual(authring.equalFingerprints.callCount, 1);
                assert.strictEqual(rootPromise.resolve.callCount, 1);
                assert.deepEqual(rootPromise.resolve.args[0], [true]);
                assert.strictEqual(myCallback.callCount, 1);
                assert.deepEqual(myCallback.args[0], ['foo', 'you456789xw']);
            });

            it("fingerprint mismatch", function() {
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'u_pubkeys', { 'you456789xw': 'foo' });
                sandbox.stub(ns, 'showFingerprintMismatchException').throws('an exception')
                var authenticated = { fingerprint: ED25519_FINGERPRINT,
                                      method: authring.AUTHENTICATION_METHOD.SIGNATURE_VERIFIED,
                                      confidence: authring.KEY_CONFIDENCE.UNSURE };
                sandbox.stub(authring, 'getContactAuthenticated').returns(authenticated);
                sandbox.stub(authring, 'computeFingerprint').returns(ED25519_FINGERPRINT);
                sandbox.stub(authring, 'equalFingerprints').returns(false);
                sandbox.stub(window, 'MegaPromise');

                assert.throws(function () { ns._asynchCheckAuthenticationRSA('you456789xw'); });
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'RSA fingerprint does not match previously authenticated one!');
            });
        });

        describe('_trackRSAKeyAuthentication()', function() {
            it("empty signature", function() {
                sandbox.stub(window, 'u_pubkeys', { 'you456789xw': 'the key' });
                sandbox.stub(authring, 'setContactAuthenticated');

                var result = ns._trackRSAKeyAuthentication('you456789xw',
                                                           '',
                                                           ED25519_FINGERPRINT);
                assert.strictEqual(result, 'the key');
                assert.strictEqual(authring.setContactAuthenticated.callCount, 1);
                assert.deepEqual(authring.setContactAuthenticated.args[0],
                                 ['you456789xw', ED25519_FINGERPRINT, 'RSA',
                                  authring.AUTHENTICATION_METHOD.SEEN,
                                  authring.KEY_CONFIDENCE.UNSURE]);
            });

            it("empty signature", function() {
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'u_pubkeys', { 'you456789xw': 'the key' });
                sandbox.stub(authring, 'setContactAuthenticated');

                var result = ns._trackRSAKeyAuthentication('you456789xw',
                                                           undefined,
                                                           ED25519_FINGERPRINT);
                assert.strictEqual(result, 'the key');
                assert.strictEqual(authring.setContactAuthenticated.callCount, 0);
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'Problem retrieving RSA pub key signature for you456789xw');
            });

            it("with signature", function() {
                sandbox.stub(window, 'u_pubkeys', { 'you456789xw': 'the key' });
                sandbox.stub(authring, 'verifyKey').returns(true);
                sandbox.stub(authring, 'setContactAuthenticated');

                var result = ns._trackRSAKeyAuthentication('you456789xw',
                                                           'autograph',
                                                           ED25519_FINGERPRINT);
                assert.strictEqual(result, 'the key');
                assert.strictEqual(authring.setContactAuthenticated.callCount, 1);
                assert.deepEqual(authring.setContactAuthenticated.args[0],
                                 ['you456789xw', ED25519_FINGERPRINT, 'RSA',
                                  authring.AUTHENTICATION_METHOD.SIGNATURE_VERIFIED,
                                  authring.KEY_CONFIDENCE.UNSURE]);
            });

            it("with bad signature", function() {
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'u_pubkeys', { 'you456789xw': 'the key' });
                sandbox.stub(authring, 'verifyKey').returns(false);
                sandbox.stub(authring, 'setContactAuthenticated');
                sandbox.stub(window, 'msgDialog');
                assert.throws(function() { ns._trackRSAKeyAuthentication(
                    'you456789xw', 'not my autograph', ED25519_FINGERPRINT); },
                    'RSA pub key signature is invalid!');
                assert.strictEqual(authring.setContactAuthenticated.callCount, 0);
                assert.strictEqual(msgDialog.callCount, 1);
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'RSA pub key signature of you456789xw is invalid!');
            });
        });

        describe('getPubRSA()', function() {
            it("through API", function() {
                sandbox.stub(window, 'u_pubkeys', {});
                sandbox.stub(window, 'u_authring', { RSA: {} });
                var attributePromise = { done: sinon.stub() };
                var masterPromise = { linkFailTo: sinon.stub(),
                                      linkDoneAndFailTo: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(masterPromise);
                sandbox.stub(ns, '_getPubRSAattribute').returns(attributePromise);

                var result = ns.getPubRSA('you456789xw');
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(masterPromise.linkFailTo.callCount, 1);

                var attributeCallback = attributePromise.done.args[0][0];
                // Now stub getPubRSA(), as we're calling it recursively.
                sandbox.stub(ns, 'getPubRSA');
                result = attributeCallback('the key');
                assert.strictEqual(ns.getPubRSA.callCount, 1);
                assert.strictEqual(masterPromise.linkDoneAndFailTo.callCount, 1);
                assert.strictEqual(ns._getPubRSAattribute.callCount, 1);
                assert.strictEqual(ns._getPubRSAattribute.args[0][0], 'you456789xw');
                assert.deepEqual(u_pubkeys, { 'you456789xw': 'the key' });
            });

            it("through API, with callback", function() {
                sandbox.stub(window, 'u_pubkeys', {});
                sandbox.stub(window, 'u_authring', { RSA: {} });
                var attributePromise = { done: sinon.stub() };
                var masterPromise = { linkFailTo: sinon.stub(),
                                      linkDoneAndFailTo: sinon.stub(),
                                      done: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(masterPromise);
                sandbox.stub(ns, '_getPubRSAattribute').returns(attributePromise);
                var myCallback = sinon.stub();

                var result = ns.getPubRSA('you456789xw', myCallback);
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(masterPromise.linkFailTo.callCount, 1);
                assert.strictEqual(masterPromise.done.callCount, 1);

                var attributeCallback = attributePromise.done.args[0][0];
                // Now stub getPubRSA(), as we're calling it recursively.
                sandbox.stub(ns, 'getPubRSA');
                result = attributeCallback('the key');
                assert.strictEqual(ns.getPubRSA.callCount, 1);
                assert.strictEqual(masterPromise.linkDoneAndFailTo.callCount, 1);
                assert.strictEqual(ns._getPubRSAattribute.callCount, 1);
                assert.strictEqual(ns._getPubRSAattribute.args[0][0], 'you456789xw');
                assert.deepEqual(u_pubkeys, { 'you456789xw': 'the key' });
            });

            it("cached", function() {
                sandbox.stub(window, 'u_pubkeys', { 'you456789xw': 'the key' });
                sandbox.stub(window, 'u_authring', { RSA: {} });
                var masterPromise = { linkDoneAndFailTo: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(masterPromise);
                sandbox.stub(crypt, '_asynchCheckAuthenticationRSA').returns('all OK');

                var result = ns.getPubRSA('you456789xw');
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(masterPromise.linkDoneAndFailTo.callCount, 1);
                assert.strictEqual(masterPromise.linkDoneAndFailTo.args[0][0], 'all OK');
            });

            it("cached, uninitialised authring", function() {
                sandbox.stub(ns._logger, '_log');
                var authringPromise = { done: sinon.stub() };
                sandbox.stub(authring, 'getContacts').returns(authringPromise);
                sandbox.stub(window, 'u_pubkeys', { 'you456789xw': 'the key' });
                sandbox.stub(window, 'u_authring', {});
                var masterPromise = { linkFailTo: sinon.stub(),
                                      linkDoneAndFailTo: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(masterPromise);

                var result = ns.getPubRSA('you456789xw');
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(masterPromise.linkFailTo.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.args[0][0], authringPromise);

                var authringCallback = authringPromise.done.args[0][0];
                // Now stub getPubRSA(), as we're calling it recursively.
                sandbox.stub(ns, 'getPubRSA').returns('the key');
                result = authringCallback();
                assert.strictEqual(ns.getPubRSA.callCount, 1);
                assert.strictEqual(masterPromise.linkDoneAndFailTo.callCount, 1);
                assert.strictEqual(masterPromise.linkDoneAndFailTo.args[0][0], 'the key');
            });
        });

        describe('_getPubRSAattribute()', function() {
            it("got pub key", function() {
                sandbox.stub(ns._logger, '_log');
                var rootPromise = { then: sinon.stub(),
                                    resolve: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(rootPromise);
                var pubKey = 'the key';
                sandbox.stub(window, 'crypto_decodepubkey').returns(pubKey);
                sandbox.stub(window, 'base64urldecode');
                sandbox.stub(window, 'api_req');

                var result = ns._getPubRSAattribute('you456789xw');
                assert.strictEqual(result, rootPromise);
                assert.strictEqual(api_req.callCount, 1);
                assert.deepEqual(api_req.args[0][0], { a: 'uk', u: 'you456789xw' });
                assert.strictEqual(api_req.args[0][1].u, 'you456789xw');

                var settleFunction = api_req.args[0][1].callback;
                settleFunction({ pubk: pubKey });
                assert.strictEqual(rootPromise.resolve.callCount, 1);
                assert.strictEqual(rootPromise.resolve.args[0][0], pubKey);
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'Received RSA pub key for you456789xw: "the key"');
            });

            it("API error", function() {
                sandbox.stub(ns._logger, '_log');
                var rootPromise = { then: sinon.stub(),
                                    reject: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(rootPromise);
                sandbox.stub(window, 'api_req');

                var result = ns._getPubRSAattribute('you456789xw');
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
        });

        describe('getPubEd25519', function() {
            it("API error", function() {
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'pubEd25519', {});
                sandbox.stub(window, 'u_authring', { Ed25519: {} });

                var masterPromise = { linkFailTo: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(masterPromise);
                var attributePromise = { done: sinon.stub(),
                                         fail: sinon.stub() };
                sandbox.stub(window, 'getUserAttribute').returns(attributePromise);

                var result = ns.getPubEd25519('you456789xw');
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(masterPromise.linkFailTo.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.args[0][0], attributePromise);
                assert.strictEqual(attributePromise.done.callCount, 1);
                assert.strictEqual(attributePromise.fail.callCount, 1);

                var attributeCallback = attributePromise.fail.args[0][0];
                attributeCallback(EFAILED);
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'Error getting Ed25519 pub key of user "you456789xw": -5');
                assert.deepEqual(pubEd25519, {});
            });

            it("trough API", function() {
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'pubEd25519', {});
                sandbox.stub(window, 'u_authring', { Ed25519: {} });

                var masterPromise = { linkFailTo: sinon.stub(),
                                      resolve: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(masterPromise);
                var attributePromise = { done: sinon.stub(),
                                         fail: sinon.stub() };
                sandbox.stub(window, 'getUserAttribute').returns(attributePromise);
                sandbox.stub(window, 'base64urldecode', _echo);
                sandbox.stub(crypt, '_checkAuthenticationEd25519');

                var result = ns.getPubEd25519('you456789xw');
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(masterPromise.linkFailTo.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.args[0][0], attributePromise);
                assert.strictEqual(attributePromise.done.callCount, 1);
                assert.strictEqual(attributePromise.fail.callCount, 1);

                var attributeCallback = attributePromise.done.args[0][0];
                attributeCallback('the key');
                assert.strictEqual(base64urldecode.callCount, 1);
                assert.strictEqual(crypt._checkAuthenticationEd25519.callCount, 1);
                assert.strictEqual(masterPromise.resolve.callCount, 1);
                assert.strictEqual(masterPromise.resolve.args[0][0], 'the key');
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'Got Ed25519 pub key of user "you456789xw".');
                assert.deepEqual(pubEd25519, { 'you456789xw': 'the key' });
            });

            it("cached value", function() {
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': 'the key' });
                var authenticated = { fingerprint: ED25519_FINGERPRINT,
                                      method: authring.AUTHENTICATION_METHOD.SEEN,
                                      confidence: authring.KEY_CONFIDENCE.UNSURE };
                sandbox.stub(u_authring, 'Ed25519', { 'you456789xw': authenticated });

                var masterPromise = { resolve: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(masterPromise);
                sandbox.stub(crypt, '_checkAuthenticationEd25519');

                var result = ns.getPubEd25519('you456789xw');
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(crypt._checkAuthenticationEd25519.callCount, 1);
                assert.strictEqual(crypt._checkAuthenticationEd25519.args[0][0], 'you456789xw');
                assert.strictEqual(masterPromise.resolve.callCount, 1);
                assert.strictEqual(masterPromise.resolve.args[0][0], 'the key');
            });

            it("cached value, authentication error", function() {
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': 'the key' });
                var authenticated = { fingerprint: ED25519_FINGERPRINT,
                                      method: authring.AUTHENTICATION_METHOD.SEEN,
                                      confidence: authring.KEY_CONFIDENCE.UNSURE };
                sandbox.stub(u_authring, 'Ed25519', { 'you456789xw': authenticated });

                var masterPromise = { resolve: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(masterPromise);
                sandbox.stub(crypt, '_checkAuthenticationEd25519').throws(
                    'Ed25519 fingerprint does not match previously authenticated one!');

                assert.throws(function() { ns.getPubEd25519('you456789xw'); });
                assert.strictEqual(crypt._checkAuthenticationEd25519.callCount, 1);
                assert.strictEqual(crypt._checkAuthenticationEd25519.args[0][0], 'you456789xw');
                assert.strictEqual(masterPromise.resolve.callCount, 0);
            });

            it("through API, custom callback", function() {
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'pubEd25519', {});
                sandbox.stub(window, 'u_authring', { Ed25519: {} });

                var masterPromise = { linkFailTo: sinon.stub(),
                                      resolve: sinon.stub(),
                                      done: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(masterPromise);
                var attributePromise = { done: sinon.stub(),
                                         fail: sinon.stub() };
                sandbox.stub(window, 'getUserAttribute').returns(attributePromise);
                sandbox.stub(window, 'base64urldecode', _echo);
                sandbox.stub(crypt, '_checkAuthenticationEd25519');
                var myCallback = sinon.spy();

                var result = ns.getPubEd25519('you456789xw', myCallback);
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(masterPromise.linkFailTo.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.args[0][0], attributePromise);
                assert.strictEqual(attributePromise.done.callCount, 1);
                assert.strictEqual(attributePromise.fail.callCount, 1);

                var attributeCallback = attributePromise.done.args[0][0];
                attributeCallback('the key');
                assert.strictEqual(base64urldecode.callCount, 1);
                assert.strictEqual(crypt._checkAuthenticationEd25519.callCount, 1);
                assert.strictEqual(masterPromise.resolve.callCount, 1);
                assert.strictEqual(masterPromise.resolve.args[0][0], 'the key');
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'Got Ed25519 pub key of user "you456789xw".');
                assert.deepEqual(pubEd25519, { 'you456789xw': 'the key' });

                var callbackCallback = masterPromise.done.args[0][0];
                callbackCallback('the key');
                assert.strictEqual(ns._logger._log.args[1][1][0],
                                   'Calling callback');
                assert.strictEqual(myCallback.callCount, 1);
                assert.strictEqual(myCallback.args[0][0], 'the key');
            });

            it("API error, custom callback", function() {
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'pubEd25519', {});
                sandbox.stub(window, 'u_authring', { Ed25519: {} });

                var masterPromise = { linkFailTo: sinon.stub(),
                                      done: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(masterPromise);
                var attributePromise = { done: sinon.stub(),
                                         fail: sinon.stub() };
                sandbox.stub(window, 'getUserAttribute').returns(attributePromise);
                var myCallback = sinon.spy();

                var result = ns.getPubEd25519('you456789xw', myCallback);
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(masterPromise.linkFailTo.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.args[0][0], attributePromise);
                assert.strictEqual(attributePromise.done.callCount, 1);
                assert.strictEqual(attributePromise.fail.callCount, 1);
                assert.strictEqual(attributePromise.done.callCount, 1);

                var attributeCallback = attributePromise.fail.args[0][0];
                attributeCallback(EFAILED);
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'Error getting Ed25519 pub key of user "you456789xw": -5');
                assert.deepEqual(pubEd25519, {});
                assert.strictEqual(myCallback.callCount, 1);
                assert.strictEqual(myCallback.args[0][0], EFAILED);
            });

            it("uninitialised authring", function() {
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'pubEd25519', {});
                sandbox.stub(window, 'u_authring', {});

                var masterPromise = { linkFailTo: sinon.stub(),
                                      linkDoneAndFailTo: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(masterPromise);
                var authringPromise = { done: sinon.stub() };
                sandbox.stub(authring, 'getContacts').returns(authringPromise);

                var result = ns.getPubEd25519('you456789xw');
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'First initialising the Ed25519 authring.');
                assert.strictEqual(authring.getContacts.callCount, 1);
                assert.strictEqual(authring.getContacts.args[0][0], 'Ed25519');
                assert.strictEqual(masterPromise.linkFailTo.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.args[0][0], authringPromise);
                assert.strictEqual(authringPromise.done.callCount, 1);

                var authringCallback = authringPromise.done.args[0][0];
                // Now stub (getPubEd25519), as we're calling it recursively.
                sandbox.stub(ns, 'getPubEd25519');
                authringCallback();
                assert.strictEqual(masterPromise.linkDoneAndFailTo.callCount, 1);
                assert.strictEqual(ns.getPubEd25519.callCount, 1);
            });

            it("nonexistent u_authring", function() {
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'pubEd25519', {});
                sandbox.stub(window, 'u_authring', undefined);

                var masterPromise = { linkFailTo: sinon.stub(),
                                      linkDoneAndFailTo: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(masterPromise);
                var authringPromise = { done: sinon.stub() };
                sandbox.stub(authring, 'getContacts').returns(authringPromise);

                var result = ns.getPubEd25519('you456789xw');
                assert.strictEqual(result, masterPromise);
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'First initialising the Ed25519 authring.');
                assert.strictEqual(authring.getContacts.callCount, 1);
                assert.strictEqual(authring.getContacts.args[0][0], 'Ed25519');
                assert.strictEqual(masterPromise.linkFailTo.callCount, 1);
                assert.strictEqual(masterPromise.linkFailTo.args[0][0], authringPromise);
                assert.strictEqual(authringPromise.done.callCount, 1);

                var authringCallback = authringPromise.done.args[0][0];
                // Now stub getPubEd25519(), as we're calling it recursively.
                sandbox.stub(ns, 'getPubEd25519');
                authringCallback();
                assert.strictEqual(masterPromise.linkDoneAndFailTo.callCount, 1);
                assert.strictEqual(ns.getPubEd25519.callCount, 1);
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
