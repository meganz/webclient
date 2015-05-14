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

            it("unseen fingerprint, custom callback", function() {
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': ED25519_PUB_KEY });
                sandbox.stub(authring, 'getContactAuthenticated').returns(false);
                sandbox.stub(authring, 'equalFingerprints').returns(undefined);
                sandbox.stub(authring, 'setContactAuthenticated');
                var myCallback = sinon.stub();
                ns._checkAuthenticationEd25519('you456789xw', myCallback);
                assert.strictEqual(authring.setContactAuthenticated.callCount, 1);
                assert.strictEqual(myCallback.callCount, 1);
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
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': ED25519_PUB_KEY });
                var authenticated = { fingerprint: base64urldecode('XyeqVYkXl3DkdXWxYqHe2XuL_G0'),
                                      method: authring.AUTHENTICATION_METHOD.SEEN,
                                      confidence: authring.KEY_CONFIDENCE.UNSURE };
                sandbox.stub(authring, 'getContactAuthenticated').returns(authenticated);
                sandbox.stub(authring, 'equalFingerprints').returns(false);
                sandbox.stub(authring, 'setContactAuthenticated');
                assert.throws(function() { ns._checkAuthenticationEd25519('you456789xw'); },
                              'Ed25519 fingerprint does not match previously authenticated one!');
                assert.strictEqual(authring.setContactAuthenticated.callCount, 0);
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
                sandbox.stub(window, 'u_pubkeys', { 'you456789xw': 'foo' });
                var authenticated = { fingerprint: ED25519_FINGERPRINT,
                                      method: authring.AUTHENTICATION_METHOD.SIGNATURE_VERIFIED,
                                      confidence: authring.KEY_CONFIDENCE.UNSURE };
                sandbox.stub(authring, 'getContactAuthenticated').returns(authenticated);
                sandbox.stub(authring, 'computeFingerprint').returns(ED25519_FINGERPRINT);
                sandbox.stub(authring, 'equalFingerprints').returns(false);
                sandbox.stub(window, 'MegaPromise');

                assert.throws(function () { ns._asynchCheckAuthenticationRSA('you456789xw'); },
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
                sandbox.stub(window, 'u_pubkeys', { 'you456789xw': 'the key' });
                sandbox.stub(authring, 'verifyKey').returns(false);
                sandbox.stub(authring, 'setContactAuthenticated');

                assert.throws(function() { ns._trackRSAKeyAuthentication(
                    'you456789xw', 'not my autograph', ED25519_FINGERPRINT); },
                    'RSA pub key signature of you456789xw is invalid!');
                assert.strictEqual(authring.setContactAuthenticated.callCount, 0);
            });
        });

        describe('getPubRSA()', function() {
            it("get through API", function() {
                sandbox.stub(window, 'u_pubkeys', {});
                sandbox.stub(window, 'u_authring', { RSA: {} });
                var attributePromise = { then: sinon.stub().returns('checked pub key promise') };
                var rootPromise = { then: sinon.stub().returns(attributePromise),
                                    resolve: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(rootPromise);
                sandbox.stub(ns, '_getPubRSAattribute').returns('RSA key promise');
                sandbox.stub(ns, '_asynchCheckAuthenticationRSA').returns('check promise');

                var result = ns.getPubRSA('you456789xw');
                assert.strictEqual(result, 'checked pub key promise');

                var attributeCallback = rootPromise.then.args[0][0];
                result = attributeCallback();
                assert.strictEqual(ns._getPubRSAattribute.callCount, 1);
                assert.strictEqual(ns._getPubRSAattribute.args[0][0], 'you456789xw');
                assert.strictEqual(result, 'RSA key promise');

                var checkCallback = attributePromise.then.args[0][0];
                result = checkCallback('the key');
                assert.deepEqual(u_pubkeys, { 'you456789xw': 'the key' });
                assert.strictEqual(ns._asynchCheckAuthenticationRSA.callCount, 1);
                assert.strictEqual(ns._asynchCheckAuthenticationRSA.args[0][0], 'you456789xw');
                assert.strictEqual(result, 'check promise');
            });

            it("get cached", function() {
                sandbox.stub(window, 'u_pubkeys', { 'you456789xw': 'the key' });
                sandbox.stub(window, 'u_authring', { RSA: {} });
                var rootPromise = { then: sinon.stub().returns('checked pub key promise'),
                                    resolve: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(rootPromise);
                sandbox.stub(ns, '_asynchCheckAuthenticationRSA').returns('check promise');

                var result = ns.getPubRSA('you456789xw');
                assert.strictEqual(result, 'checked pub key promise');

                var checkCallback = rootPromise.then.args[0][0];
                result = checkCallback();
                assert.deepEqual(u_pubkeys, { 'you456789xw': 'the key' });
                assert.strictEqual(ns._asynchCheckAuthenticationRSA.callCount, 1);
                assert.strictEqual(ns._asynchCheckAuthenticationRSA.args[0][0], 'you456789xw');
                assert.strictEqual(result, 'check promise');
            });

            it("cached, uninitialised authring", function() {
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'u_pubkeys', { 'you456789xw': 'the key' });
                sandbox.stub(window, 'u_authring', {});
                var rootPromise = { then: sinon.stub().returns('checked pub key promise'),
                                    resolve: sinon.stub() };
                sandbox.stub(authring, 'getContacts').returns(rootPromise);
                sandbox.stub(ns, '_asynchCheckAuthenticationRSA').returns('check promise');

                var result = ns.getPubRSA('you456789xw');
                assert.strictEqual(result, 'checked pub key promise');
                assert.strictEqual(authring.getContacts.callCount, 1);
                assert.strictEqual(authring.getContacts.args[0][0], 'RSA');

                var checkCallback = rootPromise.then.args[0][0];
                result = checkCallback();
                assert.deepEqual(u_pubkeys, { 'you456789xw': 'the key' });
                assert.strictEqual(ns._asynchCheckAuthenticationRSA.callCount, 1);
                assert.strictEqual(ns._asynchCheckAuthenticationRSA.args[0][0], 'you456789xw');
                assert.strictEqual(result, 'check promise');
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
            it("API error, no custom callback", function() {
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'pubEd25519', {});
                sandbox.stub(window, 'u_authring', { Ed25519: {} });
                sandbox.stub(ns, '_checkAuthenticationEd25519');
                var attributePromise = { then: sinon.stub() };
                var rootPromise = { then: sinon.stub().returns(attributePromise),
                                    resolve: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(rootPromise);
                sandbox.stub(window, 'getUserAttribute');

                ns.getPubEd25519('you456789xw');
                var rootCallback = rootPromise.then.args[0][0];
                rootCallback('foo');
                assert.strictEqual(getUserAttribute.callCount, 1);
                assert.strictEqual(ns._checkAuthenticationEd25519.callCount, 0);
                assert.lengthOf(getUserAttribute.args[0], 4);

                var attributeCallback = attributePromise.then.args[0][1];
                attributeCallback(EFAILED);
                assert.deepEqual(pubEd25519, {});
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'Error getting Ed25519 pub key of user "you456789xw": -5');
            });

            it("trough API, no custom callback", function() {
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'pubEd25519', {});
                sandbox.stub(window, 'u_authring', { Ed25519: {} });
                sandbox.stub(ns, '_checkAuthenticationEd25519');
                var attributePromise = { then: sinon.stub() };
                var rootPromise = { then: sinon.stub().returns(attributePromise),
                                    resolve: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(rootPromise);
                sandbox.stub(window, 'getUserAttribute');

                ns.getPubEd25519('you456789xw');
                var rootCallback = rootPromise.then.args[0][0];
                rootCallback('foo');
                assert.strictEqual(getUserAttribute.callCount, 1);
                assert.strictEqual(ns._checkAuthenticationEd25519.callCount, 0);
                assert.lengthOf(getUserAttribute.args[0], 4);

                var attributeCallback = attributePromise.then.args[0][0];
                attributeCallback(base64urlencode(ED25519_PUB_KEY));
                assert.strictEqual(ns._checkAuthenticationEd25519.callCount, 1);
                assert.deepEqual(pubEd25519, { 'you456789xw': ED25519_PUB_KEY });
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'Got Ed25519 pub key of user "you456789xw".');
            });

            it("cached value, no custom callback, authentication error", function() {
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': ED25519_PUB_KEY });
                sandbox.stub(ns, '_checkAuthenticationEd25519').throws(
                    'Fingerprint does not match previously authenticated one!');
                sandbox.stub(window, 'getUserAttribute');
                sandbox.stub(ns._logger, '_log');
                var authenticated = { fingerprint: ED25519_FINGERPRINT,
                                      method: authring.AUTHENTICATION_METHOD.SEEN,
                                      confidence: authring.KEY_CONFIDENCE.UNSURE };
                sandbox.stub(u_authring, 'Ed25519', { 'you456789xw': authenticated });
                sandbox.spy(MegaPromise.prototype, 'then');

                assert.throws(function() { ns.getPubEd25519('you456789xw'); });
                assert.strictEqual(ns._checkAuthenticationEd25519.callCount, 1);
                assert.strictEqual(getUserAttribute.callCount, 0);
                assert.deepEqual(u_authring.Ed25519['you456789xw'], authenticated);
            });

            it("API error, custom callback", function() {
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(u_authring, 'Ed25519', {});
                sandbox.stub(window, 'pubEd25519', {});
                var attributePromise = { then: sinon.stub() };
                var rootPromise = { then: sinon.stub().returns(attributePromise),
                                    resolve: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(rootPromise);
                sandbox.stub(window, 'getUserAttribute');
                var myCallback = sinon.spy();

                ns.getPubEd25519('you456789xw', myCallback);
                var rootCallback = rootPromise.then.args[0][0];
                rootCallback('foo');
                assert.strictEqual(getUserAttribute.callCount, 1);
                assert.lengthOf(getUserAttribute.args[0], 4);

                var attributeCallback = attributePromise.then.args[0][1];
                attributeCallback(EFAILED);
                assert.deepEqual(pubEd25519, {});
                assert.strictEqual(myCallback.callCount, 1);
                assert.deepEqual(u_authring.Ed25519, {});
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'Error getting Ed25519 pub key of user "you456789xw": -5');
            });

            it("through API, custom callback", function() {
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'pubEd25519', {});
                sandbox.stub(window, 'u_authring', { Ed25519: {} });
                sandbox.stub(ns, '_checkAuthenticationEd25519');
                var attributePromise = { then: sinon.stub() };
                var rootPromise = { then: sinon.stub().returns(attributePromise),
                                    resolve: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(rootPromise);
                sandbox.stub(window, 'getUserAttribute');
                                var myCallback = sinon.spy();

                ns.getPubEd25519('you456789xw', myCallback);
                var rootCallback = rootPromise.then.args[0][0];
                rootCallback('foo');
                assert.strictEqual(getUserAttribute.callCount, 1);
                assert.strictEqual(ns._checkAuthenticationEd25519.callCount, 0);
                assert.lengthOf(getUserAttribute.args[0], 4);

                var attributeCallback = attributePromise.then.args[0][0];
                attributeCallback(base64urlencode(ED25519_PUB_KEY));
                assert.strictEqual(ns._checkAuthenticationEd25519.callCount, 1);
                assert.strictEqual(ns._checkAuthenticationEd25519.args[0][1], myCallback);
                assert.deepEqual(pubEd25519, { 'you456789xw': ED25519_PUB_KEY });
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'Got Ed25519 pub key of user "you456789xw".');
            });

            it("through API, no custom callback, authentication error", function() {
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'pubEd25519', {});
                sandbox.stub(u_authring, 'Ed25519', {});
                sandbox.stub(ns, '_checkAuthenticationEd25519').throws(
                    'Fingerprint does not match previously authenticated one!');
                var attributePromise = { then: sinon.stub() };
                var rootPromise = { then: sinon.stub().returns(attributePromise),
                                    resolve: sinon.stub() };
                sandbox.stub(window, 'MegaPromise').returns(rootPromise);
                sandbox.stub(window, 'getUserAttribute');

                ns.getPubEd25519('you456789xw');
                var rootCallback = rootPromise.then.args[0][0];
                rootCallback('foo');
                assert.strictEqual(getUserAttribute.callCount, 1);
                assert.strictEqual(ns._checkAuthenticationEd25519.callCount, 0);
                assert.lengthOf(getUserAttribute.args[0], 4);

                var attributeCallback = attributePromise.then.args[0][0];
                assert.throws(function() { attributeCallback(base64urlencode(ED25519_PUB_KEY)); });
                assert.strictEqual(ns._checkAuthenticationEd25519.callCount, 1);
                assert.deepEqual(u_authring.Ed25519, {});
            });

            it("through API, custom callback, cached value", function() {
                sandbox.stub(u_authring, 'Ed25519', {});
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': ED25519_PUB_KEY });
                sandbox.stub(ns, '_checkAuthenticationEd25519');
                var myCallback = sinon.spy();

                ns.getPubEd25519('you456789xw', myCallback);
                assert.deepEqual(pubEd25519, { 'you456789xw': ED25519_PUB_KEY });
                assert.strictEqual(ns._checkAuthenticationEd25519.callCount, 1);
                assert.strictEqual(ns._checkAuthenticationEd25519.args[0][1], myCallback);
            });

            it("through API, custom callback, cached value, seen before", function() {
                var authenticated = { fingerprint: undefined, method: 0, confidence: 0 };
                sandbox.stub(u_authring, 'Ed25519', { 'you456789xw': authenticated });
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': ED25519_PUB_KEY });
                sandbox.stub(ns, '_checkAuthenticationEd25519');
                var myCallback = sinon.spy();

                ns.getPubEd25519('you456789xw', myCallback);
                assert.deepEqual(pubEd25519, { 'you456789xw': ED25519_PUB_KEY });
                assert.strictEqual(ns._checkAuthenticationEd25519.callCount, 1);
                assert.strictEqual(ns._checkAuthenticationEd25519.args[0][1], myCallback);
            });

            it("through API, no custom callback, cached value", function() {
                sandbox.stub(u_authring, 'Ed25519', {});
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': ED25519_PUB_KEY });
                sandbox.stub(authring, 'setContacts');

                ns.getPubEd25519('you456789xw');
                assert.deepEqual(pubEd25519, { 'you456789xw': ED25519_PUB_KEY });
                assert.deepEqual(u_authring.Ed25519, {'you456789xw': { fingerprint: ED25519_FINGERPRINT,
                                                                       method: 0, confidence: 0 } });
            });

            it("uninitialised authring", function() {
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'pubEd25519', {});
                sandbox.stub(window, 'u_authring', {});
                var attributePromise = { then: sinon.stub() };
                var rootPromise = { then: sinon.stub().returns(attributePromise),
                                    resolve: sinon.stub() };
                sandbox.stub(authring, 'getContacts').returns(rootPromise);
                sandbox.stub(ns, '_checkAuthenticationEd25519');
                sandbox.stub(window, 'getUserAttribute');

                ns.getPubEd25519('you456789xw');
                assert.strictEqual(authring.getContacts.callCount, 1);
                assert.strictEqual(rootPromise.then.callCount, 1);
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'First initialising the Ed25519 authring.')
            });

            it("nonexistent u_authring", function() {
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'pubEd25519', {});
                sandbox.stub(window, 'u_authring', undefined);
                var attributePromise = { then: sinon.stub() };
                var rootPromise = { then: sinon.stub().returns(attributePromise),
                                    resolve: sinon.stub() };
                sandbox.stub(authring, 'getContacts').returns(rootPromise);
                sandbox.stub(ns, '_checkAuthenticationEd25519');
                sandbox.stub(window, 'getUserAttribute');
                ns.getPubEd25519('you456789xw');
                assert.strictEqual(authring.getContacts.callCount, 1);
                assert.strictEqual(rootPromise.then.callCount, 1);
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'First initialising the Ed25519 authring.')
            });
        });

        describe('getFingerprintEd25519', function() {
            it("key promise reject, no custom callback", function() {
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'pubEd25519', {});
                var keyPromise = { then: sinon.stub().returns('foo'),
                                   reject: sinon.stub() };
                sandbox.stub(ns, 'getPubEd25519').returns(keyPromise);
                var response = ns.getFingerprintEd25519('you456789xw');
                assert.strictEqual(response, 'foo');
                assert.strictEqual(ns.getPubEd25519.callCount, 1);
                assert.lengthOf(ns.getPubEd25519.args[0], 1);
                var callback = keyPromise.then.args[0][1];
                callback(EFAILED);
                assert.deepEqual(pubEd25519, {});
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'Error getting Ed25519 fingerprint for user "you456789xw": -5');
            });

            it("non-cached, no custom callback", function() {
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'pubEd25519', {});
                var keyPromise = { then: sinon.stub().returns('foo'),
                                   resolve: sinon.stub() };
                sandbox.stub(ns, 'getPubEd25519', function() {
                    pubEd25519['you456789xw'] = ED25519_PUB_KEY;
                    return keyPromise;
                });
                var response = ns.getFingerprintEd25519('you456789xw');
                assert.strictEqual(response, 'foo');
                assert.strictEqual(ns.getPubEd25519.callCount, 1);
                assert.lengthOf(ns.getPubEd25519.args[0], 1);
                var callback = keyPromise.then.args[0][0];
                callback(ED25519_PUB_KEY);
                assert.deepEqual(pubEd25519, { 'you456789xw': ED25519_PUB_KEY });
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'Got Ed25519 fingerprint for user "you456789xw": 21fe31dfa154a261626bf854046fd2271b7bed4b');
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
