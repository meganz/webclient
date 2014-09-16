/**
 * @fileOverview
 * crypto operations unit tests.
 */

describe("crypto unit test", function() {
    "use strict";

    var assert = chai.assert;

    // Create/restore Sinon stub/spy/mock sandboxes.
    var sandbox = null;

    // Some test data.
    var ED25519_PUB_KEY = atob('11qYAYKxCrfVS/7TyWQHOg7hcvPapiMlrwIaaPcHURo=');
    var ED25519_FINGERPRINT = base64urldecode('If4x36FUomFia/hUBG/SJxt77Us');

    var stdoutHook;
    var _echo = function(x) { return x; };

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('user attributes', function() {
        describe('_checkFingerprintEd25519()', function() {
            it("unseen fingerprint", function() {
                sandbox.stub(window, 'pubEd25519', {'you456789xw': ED25519_PUB_KEY});
                sandbox.stub(authring, 'getContactAuthenticated').returns(false);
                sandbox.stub(authring, 'equalFingerprints').returns(undefined);
                sandbox.stub(authring, 'setContactAuthenticated');
                assert.deepEqual(_checkFingerprintEd25519('you456789xw'), {pubkey: ED25519_PUB_KEY,
                                                                           authenticated: false});
                assert.ok(authring.setContactAuthenticated.calledOnce);
            });

            it("seen fingerprint", function() {
                sandbox.stub(window, 'pubEd25519', {'you456789xw': ED25519_PUB_KEY});
                var authenticated = {fingerprint: ED25519_FINGERPRINT,
                                     method: authring.AUTHENTICATION_METHOD.SEEN,
                                     confidence: authring.KEY_CONFIDENCE.UNSURE};
                sandbox.stub(authring, 'getContactAuthenticated').returns(authenticated);
                sandbox.stub(authring, 'equalFingerprints').returns(true);
                sandbox.stub(authring, 'setContactAuthenticated');
                assert.deepEqual(_checkFingerprintEd25519('you456789xw'), {pubkey: ED25519_PUB_KEY,
                                                                           authenticated: authenticated});
                assert.ok(authring.setContactAuthenticated.notCalled);
            });

            it("fingerprint mismatch", function() {
                sandbox.stub(window, 'pubEd25519', {'you456789xw': ED25519_PUB_KEY});
                var authenticated = {fingerprint: base64urldecode('XyeqVYkXl3DkdXWxYqHe2XuL_G0'),
                                     method: authring.AUTHENTICATION_METHOD.SEEN,
                                     confidence: authring.KEY_CONFIDENCE.UNSURE};
                sandbox.stub(authring, 'getContactAuthenticated').returns(authenticated);
                sandbox.stub(authring, 'equalFingerprints').returns(false);
                sandbox.stub(authring, 'setContactAuthenticated');
                assert.throws(function() { _checkFingerprintEd25519('you456789xw'); },
                              'Fingerprint does not match previously authenticated one!');
                assert.ok(authring.setContactAuthenticated.notCalled);
            });
        });

        describe('getPubEd25519', function() {
            it("internal callback error, no custom callback", function() {
                sandbox.stub(u_authring, 'Ed25519', {});
                sandbox.stub(window, 'pubEd25519', {});
                sandbox.spy(window, 'getUserAttribute');
                getPubEd25519('you456789xw');
                sinon.assert.calledOnce(getUserAttribute);
                var callback = getUserAttribute.args[0][3];
                var theCtx = getUserAttribute.args[0][4];
                callback(-3, theCtx);
                assert.deepEqual(pubEd25519, {});
                assert.deepEqual(u_authring.Ed25519, {});
            });

            it("internal callback, no custom callback", function() {
                sandbox.stub(u_authring, 'Ed25519', {});
                sandbox.stub(window, 'pubEd25519', {});
                sandbox.stub(authring, 'setContacts');
                sandbox.spy(window, 'getUserAttribute');
                getPubEd25519('you456789xw');
                sinon.assert.calledOnce(getUserAttribute);
                var callback = getUserAttribute.args[0][3];
                var theCtx = getUserAttribute.args[0][4];
                callback(base64urlencode(ED25519_PUB_KEY), theCtx);
                assert.deepEqual(pubEd25519, {'you456789xw': ED25519_PUB_KEY});
                assert.deepEqual(u_authring.Ed25519, {'you456789xw': {fingerprint: ED25519_FINGERPRINT,
                                                                      method: 0, confidence: 0}});
            });

            it("cached value, no custom callback, authentication error", function() {
                sandbox.stub(window, 'pubEd25519', {'you456789xw': ED25519_PUB_KEY});
                var authenticated = {fingerprint: base64urldecode('XyeqVYkXl3DkdXWxYqHe2XuL_G0'),
                                     method: 0x04, confidence: 0x02};
                sandbox.stub(u_authring, 'Ed25519', {'you456789xw': authenticated});
                assert.throws(function() { getPubEd25519('you456789xw'); },
                              'Fingerprint does not match previously authenticated one!');
                assert.deepEqual(u_authring.Ed25519, {'you456789xw': authenticated});
            });

            it("internal callback error, custom callback", function() {
                sandbox.stub(u_authring, 'Ed25519', {});
                sandbox.stub(window, 'pubEd25519', {});
                sandbox.spy(window, 'getUserAttribute');
                var myCallback = sinon.spy();
                getPubEd25519('you456789xw', myCallback);
                sinon.assert.calledOnce(getUserAttribute);
                var callback = getUserAttribute.args[0][3];
                var theCtx = getUserAttribute.args[0][4];
                callback(-3, theCtx);
                assert.deepEqual(pubEd25519, {});
                sinon.assert.calledOnce(myCallback);
                assert.strictEqual(myCallback.args[0][0], false);
                assert.deepEqual(u_authring.Ed25519, {});
            });

            it("internal callback, custom callback", function() {
                sandbox.stub(u_authring, 'Ed25519', {});
                sandbox.stub(window, 'pubEd25519', {});
                sandbox.spy(window, 'getUserAttribute');
                sandbox.stub(authring, 'setContacts');
                var myCallback = sinon.spy();
                getPubEd25519('you456789xw', myCallback);
                sinon.assert.calledOnce(getUserAttribute);
                var callback = getUserAttribute.args[0][3];
                var theCtx = getUserAttribute.args[0][4];
                callback(base64urlencode(ED25519_PUB_KEY), theCtx);
                assert.deepEqual(pubEd25519, {'you456789xw': ED25519_PUB_KEY});
                sinon.assert.calledOnce(myCallback);
                assert.deepEqual(myCallback.args[0][0], {pubkey: ED25519_PUB_KEY, authenticated: false});
                assert.deepEqual(u_authring.Ed25519, {'you456789xw': {fingerprint: ED25519_FINGERPRINT,
                                                                      method: 0, confidence: 0}});
            });

            it("no custom callback, authentication error", function() {
                sandbox.stub(window, 'pubEd25519', {});
                var authenticated = {fingerprint: base64urldecode('XyeqVYkXl3DkdXWxYqHe2XuL_G0'),
                                     method: 0x04, confidence: 0x02};
                sandbox.stub(u_authring, 'Ed25519', {'you456789xw': authenticated});
                sandbox.spy(window, 'getUserAttribute');
                getPubEd25519('you456789xw');
                sinon.assert.calledOnce(getUserAttribute);
                var callback = getUserAttribute.args[0][3];
                var theCtx = getUserAttribute.args[0][4];
                assert.throws(function() { callback(base64urlencode(ED25519_PUB_KEY), theCtx); },
                              'Fingerprint does not match previously authenticated one!');
                assert.deepEqual(u_authring.Ed25519, {'you456789xw': authenticated});
            });

            it("internal callback, custom callback, cached value", function() {
                sandbox.stub(u_authring, 'Ed25519', {});
                sandbox.stub(window, 'pubEd25519', {'you456789xw': ED25519_PUB_KEY});
                sandbox.stub(authring, 'computeFingerprint').returns(ED25519_FINGERPRINT);
                sandbox.stub(authring, 'setContacts');
                var myCallback = sinon.spy();
                getPubEd25519('you456789xw', myCallback);
                assert.deepEqual(pubEd25519, {'you456789xw': ED25519_PUB_KEY});
                sinon.assert.calledOnce(myCallback);
                assert.deepEqual(myCallback.args[0][0],
                                 {pubkey: ED25519_PUB_KEY, authenticated: false});
                assert.deepEqual(u_authring.Ed25519, {'you456789xw': {fingerprint: ED25519_FINGERPRINT,
                                                                      method: 0, confidence: 0}});
            });

            it("internal callback, custom callback, cached value, seen before", function() {
                var authenticated = {fingerprint: undefined, method: 0, confidence: 0};
                sandbox.stub(u_authring, 'Ed25519', {'you456789xw': authenticated});
                sandbox.stub(window, 'pubEd25519', {'you456789xw': ED25519_PUB_KEY});
                sandbox.stub(authring, 'computeFingerprint').returns(ED25519_FINGERPRINT);
                var myCallback = sinon.spy();
                getPubEd25519('you456789xw', myCallback);
                assert.deepEqual(pubEd25519, {'you456789xw': ED25519_PUB_KEY});
                sinon.assert.calledOnce(myCallback);
                assert.deepEqual(myCallback.args[0][0],
                                 {pubkey: ED25519_PUB_KEY, authenticated: authenticated});
                assert.deepEqual(u_authring.Ed25519, {'you456789xw': authenticated});
            });

            it("internal callback, no custom callback, cached value", function() {
                sandbox.stub(u_authring, 'Ed25519', {});
                sandbox.stub(window, 'pubEd25519', {'you456789xw': ED25519_PUB_KEY});
                sandbox.stub(authring, 'setContacts');
                getPubEd25519('you456789xw');
                assert.deepEqual(pubEd25519, {'you456789xw': ED25519_PUB_KEY});
                assert.deepEqual(u_authring.Ed25519, {'you456789xw': {fingerprint: ED25519_FINGERPRINT,
                                                                      method: 0, confidence: 0}});
            });
        });

        describe('getFingerprintEd25519', function() {
            it("internal callback error, no custom callback", function() {
                sandbox.stub(window, 'pubEd25519', {});
                sandbox.spy(window, 'getUserAttribute');
                getFingerprintEd25519('you456789xw');
                sinon.assert.calledOnce(getUserAttribute);
                var callback = getUserAttribute.args[0][3];
                var theCtx = getUserAttribute.args[0][4];
                callback(-3, theCtx);
                assert.deepEqual(pubEd25519, {});
            });

            it("internal callback, no custom callback", function() {
                sandbox.stub(window, 'pubEd25519', {});
                sandbox.spy(window, 'getUserAttribute');
                getFingerprintEd25519('you456789xw');
                sinon.assert.calledOnce(getUserAttribute);
                var callback = getUserAttribute.args[0][3];
                var theCtx = getUserAttribute.args[0][4];
                callback(base64urlencode(ED25519_PUB_KEY), theCtx);
                assert.deepEqual(pubEd25519, {'you456789xw': ED25519_PUB_KEY});
            });

            it("internal callback error, custom callback", function() {
                sandbox.stub(window, 'pubEd25519', {});
                sandbox.spy(window, 'getUserAttribute');
                var myCallback = sinon.spy();
                getFingerprintEd25519('you456789xw', myCallback);
                sinon.assert.calledOnce(getUserAttribute);
                var callback = getUserAttribute.args[0][3];
                var theCtx = getUserAttribute.args[0][4];
                callback(-3, theCtx);
                assert.deepEqual(pubEd25519, {});
                sinon.assert.calledOnce(myCallback);
                assert.strictEqual(myCallback.args[0][0], false);
            });

            it("internal callback, custom callback", function() {
                sandbox.stub(window, 'pubEd25519', {});
                sandbox.spy(window, 'getUserAttribute');
                var myCallback = sinon.spy();
                getFingerprintEd25519('you456789xw', myCallback);
                sinon.assert.calledOnce(getUserAttribute);
                var callback = getUserAttribute.args[0][3];
                var theCtx = getUserAttribute.args[0][4];
                callback(base64urlencode(ED25519_PUB_KEY), theCtx);
                assert.deepEqual(pubEd25519, {'you456789xw': ED25519_PUB_KEY});
                sinon.assert.calledOnce(myCallback);
                assert.strictEqual(myCallback.args[0][0], '21fe31dfa154a261626bf854046fd2271b7bed4b');
            });

            it("internal callback, custom callback", function() {
                sandbox.stub(window, 'pubEd25519', {'you456789xw': ED25519_PUB_KEY});
                var myCallback = sinon.spy();
                getFingerprintEd25519('you456789xw', myCallback);
                assert.deepEqual(pubEd25519, {'you456789xw': ED25519_PUB_KEY});
                sinon.assert.calledOnce(myCallback);
                assert.strictEqual(myCallback.args[0][0], '21fe31dfa154a261626bf854046fd2271b7bed4b');
            });

            it("internal callback, custom callback, hex", function() {
                sandbox.stub(window, 'pubEd25519', {'you456789xw': ED25519_PUB_KEY});
                var myCallback = sinon.spy();
                getFingerprintEd25519('you456789xw', myCallback ,"hex");
                assert.deepEqual(pubEd25519, {'you456789xw': ED25519_PUB_KEY});
                sinon.assert.calledOnce(myCallback);
                assert.strictEqual(myCallback.args[0][0], '21fe31dfa154a261626bf854046fd2271b7bed4b');
            });

            it("internal callback, custom callback, string", function() {
                sandbox.stub(u_authring, 'Ed25519', {});
                sandbox.stub(window, 'pubEd25519', {'you456789xw': ED25519_PUB_KEY});
                var myCallback = sinon.spy();
                getFingerprintEd25519('you456789xw', myCallback ,"string");
                assert.deepEqual(pubEd25519, {'you456789xw': ED25519_PUB_KEY});
                sinon.assert.calledOnce(myCallback);
                assert.deepEqual(base64urlencode(myCallback.args[0][0]),
                                 'If4x36FUomFia_hUBG_SJxt77Us');
            });
        });
    });
});
