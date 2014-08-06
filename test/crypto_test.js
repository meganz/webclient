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
    var ED25519_FINGERPRINT = base64urldecode('WyeqVYkXl3DkdXWxYqHe2XuL_G0');
    
    var stdoutHook;
    var _echo = function(x) { return x; };
    
    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('user attributes', function() {
        describe('getPubEd25519', function() {
            it("internal callback error, no custom callback", function() {
                sandbox.stub(window, 'pubEd25519', {});
                sandbox.spy(window, 'getUserAttribute');
                getPubEd25519('me');
                sinon.assert.calledOnce(getUserAttribute);
                var callback = getUserAttribute.args[0][3];
                var theCtx = getUserAttribute.args[0][4];
                callback(-3, theCtx);
                assert.deepEqual(pubEd25519, {});
            });

            it("internal callback, no custom callback", function() {
                sandbox.stub(window, 'pubEd25519', {});
                sandbox.spy(window, 'getUserAttribute');
                getPubEd25519('me');
                sinon.assert.calledOnce(getUserAttribute);
                var callback = getUserAttribute.args[0][3];
                var theCtx = getUserAttribute.args[0][4];
                callback(base64urlencode('foo'), theCtx);
                assert.deepEqual(pubEd25519, {'me': 'foo'});
            });

            it("cached value, no custom callback, authentication error", function() {
                pubEd25519 = {'you456789xw': ED25519_PUB_KEY};
                u_authring = {'you456789xw': {fingerprint: base64urldecode('XyeqVYkXl3DkdXWxYqHe2XuL_G0'),
                                              method: 0x04,
                                              confidence: 0x02}};
                assert.throws(function() { getPubEd25519('you456789xw'); },
                              'Fingerprint does not match previously authenticated one!');
            });

            it("internal callback error, custom callback", function() {
                sandbox.stub(window, 'pubEd25519', {});
                sandbox.spy(window, 'getUserAttribute');
                var myCallback = sinon.spy();
                getPubEd25519('me', myCallback);
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
                getPubEd25519('me', myCallback);
                sinon.assert.calledOnce(getUserAttribute);
                var callback = getUserAttribute.args[0][3];
                var theCtx = getUserAttribute.args[0][4];
                callback(base64urlencode('foo'), theCtx);
                assert.deepEqual(pubEd25519, {'me': 'foo'});
                sinon.assert.calledOnce(myCallback);
                assert.deepEqual(myCallback.args[0][0], {pubkey: 'foo', authenticated: false});
            });

            it("no custom callback, authentication error", function() {
                sandbox.stub(window, 'pubEd25519', {});
                sandbox.stub(window, 'u_authring',
                             {'you456789xw': {fingerprint: base64urldecode('XyeqVYkXl3DkdXWxYqHe2XuL_G0'),
                                              method: 0x04,
                                              confidence: 0x02}});
                sandbox.spy(window, 'getUserAttribute');
                getPubEd25519('you456789xw');
                sinon.assert.calledOnce(getUserAttribute);
                var callback = getUserAttribute.args[0][3];
                var theCtx = getUserAttribute.args[0][4];
                assert.throws(function() { callback(base64urlencode(ED25519_PUB_KEY), theCtx); },
                              'Fingerprint does not match previously authenticated one!');
            });

            it("internal callback, custom callback, cached value", function() {
                sandbox.stub(window, 'pubEd25519', {'me': 'foo'});
                var myCallback = sinon.spy();
                getPubEd25519('me', myCallback);
                assert.deepEqual(pubEd25519, {'me': 'foo'});
                sinon.assert.calledOnce(myCallback);
                assert.deepEqual(myCallback.args[0][0], {pubkey: 'foo', authenticated: false});
            });

            it("internal callback, no custom callback, cached value", function() {
                sandbox.stub(window, 'pubEd25519', {'me': 'foo'});
                getPubEd25519('me');
                assert.deepEqual(pubEd25519, {'me': 'foo'});
            });
        });

        describe('getFingerprint', function() {
            it("internal callback error, no custom callback", function() {
                sandbox.stub(window, 'pubEd25519', {});
                sandbox.spy(window, 'getUserAttribute');
                getFingerprint('me');
                sinon.assert.calledOnce(getUserAttribute);
                var callback = getUserAttribute.args[0][3];
                var theCtx = getUserAttribute.args[0][4];
                callback(-3, theCtx);
                assert.deepEqual(pubEd25519, {});
            });
    
            it("internal callback, no custom callback", function() {
                sandbox.stub(window, 'pubEd25519', {});
                sandbox.spy(window, 'getUserAttribute');
                getFingerprint('me');
                sinon.assert.calledOnce(getUserAttribute);
                var callback = getUserAttribute.args[0][3];
                var theCtx = getUserAttribute.args[0][4];
                callback(base64urlencode(ED25519_PUB_KEY), theCtx);
                assert.deepEqual(pubEd25519, {'me': ED25519_PUB_KEY});
            });
            
            it("internal callback error, custom callback", function() {
                sandbox.stub(window, 'pubEd25519', {});
                sandbox.spy(window, 'getUserAttribute');
                var myCallback = sinon.spy();
                getFingerprint('me', myCallback);
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
                getFingerprint('me', myCallback);
                sinon.assert.calledOnce(getUserAttribute);
                var callback = getUserAttribute.args[0][3];
                var theCtx = getUserAttribute.args[0][4];
                callback(base64urlencode(ED25519_PUB_KEY), theCtx);
                assert.deepEqual(pubEd25519, {'me': ED25519_PUB_KEY});
                sinon.assert.calledOnce(myCallback);
                assert.strictEqual(myCallback.args[0][0], '5b27aa5589179770e47575b162a1ded97b8bfc6d');
            });
    
            it("internal callback, custom callback", function() {
                sandbox.stub(window, 'pubEd25519', {'me': ED25519_PUB_KEY});
                var myCallback = sinon.spy();
                getFingerprint('me', myCallback);
                assert.deepEqual(pubEd25519, {'me': ED25519_PUB_KEY});
                sinon.assert.calledOnce(myCallback);
                assert.strictEqual(myCallback.args[0][0], '5b27aa5589179770e47575b162a1ded97b8bfc6d');
            });
    
            it("internal callback, custom callback, hex", function() {
                sandbox.stub(window, 'pubEd25519', {'me': ED25519_PUB_KEY});
                var myCallback = sinon.spy();
                getFingerprint('me', myCallback ,"hex");
                assert.deepEqual(pubEd25519, {'me': ED25519_PUB_KEY});
                sinon.assert.calledOnce(myCallback);
                assert.strictEqual(myCallback.args[0][0], '5b27aa5589179770e47575b162a1ded97b8bfc6d');
            });
    
            it("internal callback, custom callback, bytes", function() {
                sandbox.stub(window, 'pubEd25519', {'me': ED25519_PUB_KEY});
                var myCallback = sinon.spy();
                getFingerprint('me', myCallback ,"bytes");
                assert.deepEqual(pubEd25519, {'me': ED25519_PUB_KEY});
                sinon.assert.calledOnce(myCallback);
                assert.deepEqual(myCallback.args[0][0],
                                 asmCrypto.hex_to_bytes('5b27aa5589179770e47575b162a1ded97b8bfc6d'));
            });
    
            it("internal callback, custom callback, base64", function() {
                sandbox.stub(window, 'pubEd25519', {'me': ED25519_PUB_KEY});
                var myCallback = sinon.spy();
                getFingerprint('me', myCallback ,"base64");
                assert.deepEqual(pubEd25519, {'me': ED25519_PUB_KEY});
                sinon.assert.calledOnce(myCallback);
                assert.deepEqual(myCallback.args[0][0], 'WyeqVYkXl3DkdXWxYqHe2XuL_G0');
            });
    
            it("internal callback, custom callback, string", function() {
                sandbox.stub(window, 'pubEd25519', {'me': ED25519_PUB_KEY});
                var myCallback = sinon.spy();
                getFingerprint('me', myCallback ,"string");
                assert.deepEqual(pubEd25519, {'me': ED25519_PUB_KEY});
                sinon.assert.calledOnce(myCallback);
                assert.deepEqual(base64urlencode(myCallback.args[0][0]),
                                 'WyeqVYkXl3DkdXWxYqHe2XuL_G0');
            });
        });
    });
});
