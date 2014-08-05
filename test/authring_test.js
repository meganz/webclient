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
    var ED25519_HEX_FINGERPRINT = '5b27aa5589179770e47575b162a1ded97b8bfc6d';
    var ED25519_STRING_FINGERPRINT = base64urldecode('WyeqVYkXl3DkdXWxYqHe2XuL_G0');
    
    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('record en-/decoding', function() {
        it("_serialiseRecord()", function() {
            var tests = [['ohKpg1j6E64', ED25519_STRING_FINGERPRINT, 0x04, 0x02],
                         ['ohKpg1j6E64', ED25519_HEX_FINGERPRINT, 0x04, 0x02]];
            var expected = 'ohKpg1j6E65bJ6pViReXcOR1dbFiod7Ze4v8bUI=';
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
                                        method: ns.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON,
                                        confidence: ns.KEY_CONFIDENCE.UNSURE},
                        'you456789xw': {fingerprint: ED25519_HEX_FINGERPRINT,
                                        method: 0x04,
                                        confidence: 0x02}};
            var expected = 'me3456789xxbJ6pViReXcOR1dbFiod7Ze4v8bQDKi7jnrvz3HFsnqlWJF5dw5HV1sWKh3tl7i/xtQg==';
            assert.strictEqual(btoa(ns.serialise(test)), expected);
        });
        
        it('_splitSingleTAuthRecord()', function() {
            var tests = atob('me3456789xxbJ6pViReXcOR1dbFiod7Ze4v8bQDKi7jnrvz3HFsnqlWJF5dw5HV1sWKh3tl7i/xtQg==');
            var result = ns._deserialiseRecord(tests);
            assert.strictEqual(result.userhandle, 'me3456789xw');
            assert.deepEqual(result.value, {fingerprint: ED25519_STRING_FINGERPRINT,
                                            method: ns.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON,
                                            confidence: ns.KEY_CONFIDENCE.UNSURE});
            assert.strictEqual(result.rest, base64urldecode('you456789xw') + ED25519_STRING_FINGERPRINT + String.fromCharCode(0x42));
        });
        
        it('deserialise()', function() {
            var tests = atob('me3456789xxbJ6pViReXcOR1dbFiod7Ze4v8bQDKi7jnrvz3HFsnqlWJF5dw5HV1sWKh3tl7i/xtQg==');
            var expected = {'me3456789xw': {fingerprint: ED25519_STRING_FINGERPRINT,
                                            method: ns.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON,
                                            confidence: ns.KEY_CONFIDENCE.UNSURE},
                            'you456789xw': {fingerprint: ED25519_STRING_FINGERPRINT,
                                            method: 0x04,
                                            confidence: 0x02}};
            assert.deepEqual(ns.deserialise(tests), expected);
        });
    });

    describe('getting/setting u_authring', function() {
        var aSerialisedRing = atob('me3456789xxbJ6pViReXcOR1dbFiod7Ze4v8bQDKi7jnrvz3HFsnqlWJF5dw5HV1sWKh3tl7i/xtQg==');
        var aRing = {'me3456789xw': {fingerprint: ED25519_STRING_FINGERPRINT,
                                     method: ns.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON,
                                     confidence: ns.KEY_CONFIDENCE.UNSURE},
                     'you456789xw': {fingerprint: ED25519_STRING_FINGERPRINT,
                                     method: 0x04,
                                     confidence: 0x02}};
        
        describe('getContacts()', function() {
            it("internal callback error, no custom callback", function() {
                u_authring = undefined;
                sandbox.spy(window, 'getUserAttribute');
                ns.getContacts();
                sinon.assert.calledOnce(getUserAttribute);
                var callback = getUserAttribute.args[0][3];
                var theCtx = getUserAttribute.args[0][4];
                callback(-3, theCtx);
                assert.deepEqual(u_authring, {});
            });
                
            it("internal callback, no custom callback", function() {
                u_authring = undefined;
                sandbox.spy(window, 'getUserAttribute');
                ns.getContacts();
                sinon.assert.calledOnce(getUserAttribute);
                var callback = getUserAttribute.args[0][3];
                var theCtx = getUserAttribute.args[0][4];
                callback({'': aSerialisedRing}, theCtx);
                assert.deepEqual(u_authring, aRing);
            });
            
            it("internal callback error, custom callback", function() {
                u_authring = undefined;
                sandbox.spy(window, 'getUserAttribute');
                var myCallback = sinon.spy();
                ns.getContacts(myCallback);
                sinon.assert.calledOnce(getUserAttribute);
                var callback = getUserAttribute.args[0][3];
                var theCtx = getUserAttribute.args[0][4];
                callback(-3, theCtx);
                sinon.assert.calledOnce(myCallback);
                assert.strictEqual(myCallback.args[0][0], false);
                assert.deepEqual(u_authring, {});
            });

            it("internal callback, custom callback", function() {
                u_authring = undefined;
                sandbox.spy(window, 'getUserAttribute');
                var myCallback = sinon.spy();
                ns.getContacts(myCallback);
                sinon.assert.calledOnce(getUserAttribute);
                var callback = getUserAttribute.args[0][3];
                var theCtx = getUserAttribute.args[0][4];
                callback({'': aSerialisedRing}, theCtx);
                sinon.assert.calledOnce(myCallback);
                assert.deepEqual(myCallback.args[0][0], aRing);
                assert.deepEqual(u_authring, aRing);
            });
        });
        
        describe('setContacts()', function() {
            var aesKey = asmCrypto.bytes_to_string(asmCrypto.hex_to_bytes('0f0e0d0c0b0a09080706050403020100'));
            
            it("no custom callback", function() {
                u_authring = aRing;
                sandbox.stub(window, 'setUserAttribute');
                ns.setContacts();
                sinon.assert.calledOnce(setUserAttribute);
            });
                
            it("custom callback with error", function() {
                u_authring = aRing;
                sandbox.stub(window, 'u_k', aesKey);
                sandbox.stub(window, 'api_req');
                sandbox.spy(window, 'setUserAttribute');
                var myCallback = sinon.spy();
                ns.setContacts(myCallback);
                sinon.assert.calledOnce(setUserAttribute);
                var ctx = api_req.args[0][1];
                var callback = ctx.callback;
                callback(-3, ctx);
                sinon.assert.calledOnce(myCallback);
                assert.strictEqual(myCallback.args[0][0], -3);
            });
            
            it("custom callback", function() {
                u_authring = aRing;
                sandbox.stub(window, 'u_k', aesKey);
                sandbox.stub(window, 'api_req');
                sandbox.spy(window, 'setUserAttribute');
                var myCallback = sinon.spy();
                ns.setContacts(myCallback);
                sinon.assert.calledOnce(setUserAttribute);
                var ctx = api_req.args[0][1];
                var callback = ctx.callback;
                callback('me3456789xw', ctx);
                sinon.assert.calledOnce(myCallback);
                assert.strictEqual(myCallback.args[0][0], 'me3456789xw');
            });
        });
    });
});
