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
                sandbox.stub(window, 'pubEd25519', {'you456789xw': ED25519_PUB_KEY});
                sandbox.stub(authring, 'getContactAuthenticated').returns(false);
                sandbox.stub(authring, 'equalFingerprints').returns(undefined);
                sandbox.stub(authring, 'setContactAuthenticated');
                assert.deepEqual(ns._checkAuthenticationEd25519('you456789xw'),
                                 { pubkey: ED25519_PUB_KEY, authenticated: false });
                assert.strictEqual(authring.setContactAuthenticated.callCount, 1);
            });

            it("seen fingerprint", function() {
                sandbox.stub(window, 'pubEd25519', {'you456789xw': ED25519_PUB_KEY});
                var authenticated = { fingerprint: ED25519_FINGERPRINT,
                                      method: authring.AUTHENTICATION_METHOD.SEEN,
                                      confidence: authring.KEY_CONFIDENCE.UNSURE };
                sandbox.stub(authring, 'getContactAuthenticated').returns(authenticated);
                sandbox.stub(authring, 'equalFingerprints').returns(true);
                sandbox.stub(authring, 'setContactAuthenticated');
                assert.deepEqual(ns._checkAuthenticationEd25519('you456789xw'),
                                 {pubkey: ED25519_PUB_KEY, authenticated: authenticated});
                assert.strictEqual(authring.setContactAuthenticated.callCount, 0);
            });

            it("fingerprint mismatch", function() {
                sandbox.stub(window, 'pubEd25519', {'you456789xw': ED25519_PUB_KEY});
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

        describe('_checkAuthenticationRSA()', function() {
            it("unseen fingerprint", function() {
                sandbox.stub(window, 'u_pubkeys', {'you456789xw': 'foo'});
                sandbox.stub(authring, 'getContactAuthenticated').returns(false);
                sandbox.stub(authring, 'computeFingerprint').returns(ED25519_FINGERPRINT);
                sandbox.stub(authring, 'equalFingerprints').returns(undefined);
                sandbox.stub(authring, 'setContactAuthenticated');
                assert.deepEqual(ns._checkAuthenticationRSA('you456789xw'),
                                 { pubkey: 'foo', authenticated: false });
                assert.strictEqual(authring.getContactAuthenticated.callCount, 1);
                assert.strictEqual(authring.computeFingerprint.callCount, 1);
                assert.strictEqual(authring.setContactAuthenticated.callCount, 1);
                assert.strictEqual(authring.equalFingerprints.callCount, 0);
            });

            it("seen fingerprint", function() {
                sandbox.stub(window, 'u_pubkeys', {'you456789xw': 'foo'});
                var authenticated = { fingerprint: ED25519_FINGERPRINT,
                                      method: authring.AUTHENTICATION_METHOD.SEEN,
                                      confidence: authring.KEY_CONFIDENCE.UNSURE };
                sandbox.stub(authring, 'getContactAuthenticated').returns(authenticated);
                sandbox.stub(authring, 'computeFingerprint').returns(ED25519_FINGERPRINT);
                sandbox.stub(authring, 'equalFingerprints').returns(true);
                sandbox.stub(authring, 'setContactAuthenticated');
                assert.deepEqual(ns._checkAuthenticationRSA('you456789xw'),
                                 { pubkey: 'foo', authenticated: authenticated });
                assert.strictEqual(authring.getContactAuthenticated.callCount, 1);
                assert.strictEqual(authring.computeFingerprint.callCount, 1);
                assert.strictEqual(authring.setContactAuthenticated.callCount, 0);
                assert.strictEqual(authring.equalFingerprints.callCount, 1);
            });

            it("fingerprint mismatch", function() {
                sandbox.stub(window, 'u_pubkeys', {'you456789xw': 'foo'});
                var authenticated = { fingerprint: ED25519_FINGERPRINT,
                                      method: authring.AUTHENTICATION_METHOD.SEEN,
                                      confidence: authring.KEY_CONFIDENCE.UNSURE };
                sandbox.stub(authring, 'getContactAuthenticated').returns(authenticated);
                sandbox.stub(authring, 'computeFingerprint').returns(ED25519_FINGERPRINT);
                sandbox.stub(authring, 'equalFingerprints').returns(false);
                sandbox.stub(authring, 'setContactAuthenticated');
                assert.throws(function() { ns._checkAuthenticationRSA('you456789xw'); },
                              'RSA fingerprint does not match previously authenticated one!');
                assert.strictEqual(authring.getContactAuthenticated.callCount, 1);
                assert.strictEqual(authring.computeFingerprint.callCount, 1);
                assert.strictEqual(authring.setContactAuthenticated.callCount, 0);
                assert.strictEqual(authring.equalFingerprints.callCount, 1);
            });
        });

        describe('getPubEd25519', function() {
            it("API error, no custom callback", function() {
                sandbox.stub(console, 'error');
                sandbox.stub(window, 'pubEd25519', {});
                sandbox.stub(window, 'u_authring', { Ed25519: {} });
                sandbox.stub(ns, '_checkAuthenticationEd25519').returns('foo');
                var attributePromise = { then: sinon.stub(),
                                         reject: sinon.stub() };
                sandbox.stub(window, 'getUserAttribute').returns(attributePromise);
                ns.getPubEd25519('you456789xw');
                assert.strictEqual(getUserAttribute.callCount, 1);
                assert.strictEqual(ns._checkAuthenticationEd25519.callCount, 0);
                assert.lengthOf(getUserAttribute.args[0], 4);
                var callback = attributePromise.then.args[0][1];
                callback(-3, 'you456789xw');
                assert.deepEqual(pubEd25519, {});
                assert.strictEqual(console.error.args[0][2],
                                   'Error getting Ed25519 pub key of user "you456789xw": -3');
            });

            it("trough API, no custom callback", function() {
                sandbox.stub(console, 'debug');
                sandbox.stub(window, 'pubEd25519', {});
                sandbox.stub(window, 'u_authring', { Ed25519: {} });
                sandbox.stub(ns, '_checkAuthenticationEd25519').returns(
                    { pubkey: ED25519_PUB_KEY,
                      authenticated: { fingerprint: ED25519_FINGERPRINT,
                                       method: 0, confidence: 0} } );
                var attributePromise = { then: sinon.stub(),
                                         resolve: sinon.stub() };
                sandbox.stub(window, 'getUserAttribute').returns(attributePromise);
                ns.getPubEd25519('you456789xw');
                assert.strictEqual(getUserAttribute.callCount, 1);
                assert.strictEqual(ns._checkAuthenticationEd25519.callCount, 0);
                assert.lengthOf(getUserAttribute.args[0], 4);
                var callback = attributePromise.then.args[0][0];
                callback(base64urlencode(ED25519_PUB_KEY), { u: 'you456789xw' });
                assert.strictEqual(ns._checkAuthenticationEd25519.callCount, 1);
                assert.deepEqual(pubEd25519, { 'you456789xw': ED25519_PUB_KEY });
                assert.strictEqual(console.debug.args[0][2],
                                   'Got Ed25519 pub key of user "you456789xw".');
            });

            it("cached value, no custom callback, authentication error", function() {
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': ED25519_PUB_KEY });
                sandbox.stub(ns, '_checkAuthenticationEd25519').throws(
                    'Fingerprint does not match previously authenticated one!');
                sandbox.stub(window, 'getUserAttribute');
                sandbox.stub(console, 'error');
                var authenticated = { fingerprint: ED25519_FINGERPRINT,
                                      method: authring.AUTHENTICATION_METHOD.SEEN,
                                      confidence: authring.KEY_CONFIDENCE.UNSURE };
                sandbox.stub(u_authring, 'Ed25519', { 'you456789xw': authenticated });
                sandbox.spy(MegaPromise.prototype, 'then');
                assert.throws(function() { ns.getPubEd25519('you456789xw'); });
                assert.strictEqual(ns._checkAuthenticationEd25519.callCount, 1);
                assert.strictEqual(getUserAttribute.callCount, 0);
                assert.strictEqual(ns._checkAuthenticationEd25519.callCount, 1);
                var log = console.error.args[0];
                assert.strictEqual(log[2],
                                   'Error verifying authenticity of Ed25519 pub key:'
                                   + ' Fingerprint does not match previously authenticated one!');
                assert.deepEqual(u_authring.Ed25519['you456789xw'], authenticated);
            });

            it("API error, custom callback", function() {
                sandbox.stub(console, 'error');
                sandbox.stub(u_authring, 'Ed25519', {});
                sandbox.stub(window, 'pubEd25519', {});
                var attributePromise = { then: sinon.stub(),
                                         reject: sinon.stub() };
                sandbox.stub(window, 'getUserAttribute').returns(attributePromise);
                var myCallback = sinon.spy();
                ns.getPubEd25519('you456789xw', myCallback);
                sinon.assert.calledOnce(getUserAttribute);
                assert.lengthOf(getUserAttribute.args[0], 4);
                var callback = attributePromise.then.args[0][1];
                callback(-3, 'foo');
                assert.deepEqual(pubEd25519, {});
                assert.strictEqual(myCallback.callCount, 1);
                assert.deepEqual(u_authring.Ed25519, {});
                assert.strictEqual(console.error.args[0][2],
                                   'Error getting Ed25519 pub key of user "you456789xw": -3');
            });

            it("through API, custom callback", function() {
                sandbox.stub(console, 'debug');
                sandbox.stub(window, 'pubEd25519', {});
                sandbox.stub(window, 'u_authring', { Ed25519: {} });
                sandbox.stub(ns, '_checkAuthenticationEd25519').returns(
                    { pubkey: ED25519_PUB_KEY,
                      authenticated: { fingerprint: ED25519_FINGERPRINT,
                                       method: 0, confidence: 0} } );
                var attributePromise = { then: sinon.stub(),
                                         resolve: sinon.stub() };
                sandbox.stub(window, 'getUserAttribute').returns(attributePromise);
                var myCallback = sinon.spy();
                ns.getPubEd25519('you456789xw', myCallback);
                assert.strictEqual(getUserAttribute.callCount, 1);
                assert.strictEqual(ns._checkAuthenticationEd25519.callCount, 0);
                assert.lengthOf(getUserAttribute.args[0], 4);
                var callback = attributePromise.then.args[0][0];
                callback(base64urlencode(ED25519_PUB_KEY), { u: 'you456789xw' });
                assert.strictEqual(ns._checkAuthenticationEd25519.callCount, 1);
                assert.deepEqual(pubEd25519, { 'you456789xw': ED25519_PUB_KEY });
                assert.strictEqual(myCallback.callCount, 1);
                assert.strictEqual(console.debug.args[0][2],
                                   'Got Ed25519 pub key of user "you456789xw".');
            });

            it("through API, no custom callback, authentication error", function() {
                sandbox.stub(console, 'error');
                sandbox.stub(window, 'pubEd25519', {});
                sandbox.stub(u_authring, 'Ed25519', {});
                sandbox.stub(ns, '_checkAuthenticationEd25519').throws(
                    'Fingerprint does not match previously authenticated one!');
                var attributePromise = { then: sinon.stub() };
                sandbox.stub(window, 'getUserAttribute').returns(attributePromise);
                ns.getPubEd25519('you456789xw');
                assert.strictEqual(getUserAttribute.callCount, 1);
                assert.strictEqual(ns._checkAuthenticationEd25519.callCount, 0);
                assert.lengthOf(getUserAttribute.args[0], 4);
                var callback = attributePromise.then.args[0][0];
                assert.throws(function() { callback(base64urlencode(ED25519_PUB_KEY), { u: 'you456789xw' }); });
                assert.strictEqual(ns._checkAuthenticationEd25519.callCount, 1);
                var log = console.error.args[0];
                assert.strictEqual(log[2],
                                   'Error verifying authenticity of Ed25519 pub key:'
                                   + ' Fingerprint does not match previously authenticated one!');
                assert.deepEqual(u_authring.Ed25519, {});
            });

            it("through API, custom callback, cached value", function() {
                sandbox.stub(u_authring, 'Ed25519', {});
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': ED25519_PUB_KEY });
                sandbox.stub(authring, 'computeFingerprint').returns(ED25519_FINGERPRINT);
                sandbox.stub(authring, 'setContacts');
                var myCallback = sinon.spy();
                ns.getPubEd25519('you456789xw', myCallback);
                assert.deepEqual(pubEd25519, { 'you456789xw': ED25519_PUB_KEY });
                sinon.assert.calledOnce(myCallback);
                assert.deepEqual(myCallback.args[0][0],
                                 { pubkey: ED25519_PUB_KEY, authenticated: false });
                assert.deepEqual(u_authring.Ed25519, { 'you456789xw': { fingerprint: ED25519_FINGERPRINT,
                                                                        method: 0, confidence: 0 } });
            });

            it("through API, custom callback, cached value, seen before", function() {
                var authenticated = { fingerprint: undefined, method: 0, confidence: 0 };
                sandbox.stub(u_authring, 'Ed25519', { 'you456789xw': authenticated });
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': ED25519_PUB_KEY });
                sandbox.stub(authring, 'computeFingerprint').returns(ED25519_FINGERPRINT);
                var myCallback = sinon.spy();
                ns.getPubEd25519('you456789xw', myCallback);
                assert.deepEqual(pubEd25519, { 'you456789xw': ED25519_PUB_KEY });
                sinon.assert.calledOnce(myCallback);
                assert.deepEqual(myCallback.args[0][0],
                                 { pubkey: ED25519_PUB_KEY, authenticated: authenticated });
                assert.deepEqual(u_authring.Ed25519, { 'you456789xw': authenticated });
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
        });

        describe('getFingerprintEd25519', function() {
            it("key promise reject, no custom callback", function() {
                sandbox.stub(console, 'error');
                sandbox.stub(window, 'pubEd25519', {});
                var keyPromise = { then: sinon.stub(),
                                   reject: sinon.stub() };
                sandbox.stub(ns, 'getPubEd25519').returns(keyPromise);
                var response = ns.getFingerprintEd25519('you456789xw');
                assert.strictEqual(typeof response.then, 'function');
                assert.strictEqual(ns.getPubEd25519.callCount, 1);
                assert.lengthOf(ns.getPubEd25519.args[0], 1);
                var callback = keyPromise.then.args[0][1];
                callback(-3, 'foo');
                assert.deepEqual(pubEd25519, {});
                assert.strictEqual(console.error.args[0][2],
                                   'Error getting Ed25519 fingerprint for user "you456789xw": -3');
            });

            it("non-cached, no custom callback", function() {
                sandbox.stub(console, 'debug');
                sandbox.stub(window, 'pubEd25519', {});
                var keyPromise = { then: sinon.stub(),
                                   resolve: sinon.stub() };
                sandbox.stub(ns, 'getPubEd25519', function() {
                    pubEd25519['you456789xw'] = ED25519_PUB_KEY;
                    return keyPromise;
                });
                var response = ns.getFingerprintEd25519('you456789xw');
                assert.strictEqual(typeof response.then, 'function');
                assert.strictEqual(ns.getPubEd25519.callCount, 1);
                assert.lengthOf(ns.getPubEd25519.args[0], 1);
                var callback = keyPromise.then.args[0][0];
                callback(ED25519_PUB_KEY, 'you456789xw');
                assert.deepEqual(pubEd25519, { 'you456789xw': ED25519_PUB_KEY });
                assert.strictEqual(console.debug.args[0][2],
                                   'Got Ed25519 fingerprint for user "you456789xw": 21fe31dfa154a261626bf854046fd2271b7bed4b');
            });

            it("cached, hex", function() {
                sandbox.stub(console, 'debug');
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': ED25519_PUB_KEY });
                sandbox.stub(authring, 'computeFingerprint').returns('21fe31dfa154a261626bf854046fd2271b7bed4b');
                ns.getFingerprintEd25519('you456789xw', 'hex');
                assert.strictEqual(authring.computeFingerprint.callCount, 1);
                assert.strictEqual(authring.computeFingerprint.args[0][2], 'hex');
                assert.deepEqual(pubEd25519, { 'you456789xw': ED25519_PUB_KEY });
                assert.strictEqual(console.debug.args[0][2],
                                   'Got Ed25519 fingerprint for user "you456789xw": 21fe31dfa154a261626bf854046fd2271b7bed4b');
            });

            it("cached, string", function() {
                sandbox.stub(console, 'debug');
                sandbox.stub(window, 'pubEd25519', { 'you456789xw': ED25519_PUB_KEY });
                sandbox.stub(authring, 'computeFingerprint').returns(ED25519_FINGERPRINT);
                ns.getFingerprintEd25519('you456789xw', 'string');
                assert.strictEqual(authring.computeFingerprint.callCount, 1);
                assert.strictEqual(authring.computeFingerprint.args[0][2], 'string');
                assert.deepEqual(pubEd25519, { 'you456789xw': ED25519_PUB_KEY });
                assert.strictEqual(console.debug.args[0][2],
                                   'Got Ed25519 fingerprint for user "you456789xw": If4x36FUomFia_hUBG_SJxt77Us');
            });
        });
    });
});
