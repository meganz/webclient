/**
 * @fileOverview
 * crypto operations unit tests.
 */

describe("crypto unit test", function() {
    "use strict";
    
    var assert = chai.assert;
    var sandbox = sinon.sandbox;
    
    // Create/restore Sinon stub/spy/mock sandboxes.
    var sandbox = null;

    // Some test daata.
    var ED25519_PUB_KEY = atob('11qYAYKxCrfVS/7TyWQHOg7hcvPapiMlrwIaaPcHURo=');
    
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
                pubEd25519 = {};
                sandbox.spy(window, 'getUserAttribute');
                getPubEd25519('me');
                sinon.assert.calledOnce(getUserAttribute);
                var callback = getUserAttribute.args[0][3];
                var theCtx = getUserAttribute.args[0][4];
                callback(-3, theCtx);
                assert.deepEqual(pubEd25519, {});
            });
    
            it("internal callback, no custom callback", function() {
                pubEd25519 = {};
                sandbox.spy(window, 'getUserAttribute');
                getPubEd25519('me');
                sinon.assert.calledOnce(getUserAttribute);
                var callback = getUserAttribute.args[0][3];
                var theCtx = getUserAttribute.args[0][4];
                callback(base64urlencode('foo'), theCtx);
                assert.deepEqual(pubEd25519, {'me': 'foo'});
            });
            
            it("internal callback error, custom callback", function() {
                pubEd25519 = {};
                sandbox.spy(window, 'getUserAttribute');
                var myCallback = sinon.spy();
                getPubEd25519('me', myCallback);
                sinon.assert.calledOnce(getUserAttribute);
                var callback = getUserAttribute.args[0][3];
                var theCtx = getUserAttribute.args[0][4];
                callback(-3, theCtx);
                assert.deepEqual(pubEd25519, {});
                sinon.assert.calledOnce(myCallback);
            });
    
            it("internal callback, custom callback", function() {
                pubEd25519 = {};
                sandbox.spy(window, 'getUserAttribute');
                var myCallback = sinon.spy();
                getPubEd25519('me', myCallback);
                sinon.assert.calledOnce(getUserAttribute);
                var callback = getUserAttribute.args[0][3];
                var theCtx = getUserAttribute.args[0][4];
                callback(base64urlencode('foo'), theCtx);
                assert.deepEqual(pubEd25519, {'me': 'foo'});
                sinon.assert.calledOnce(myCallback);
                assert.strictEqual(myCallback.args[0][0], 'foo');
            });
    
            it("internal callback, custom callback, cached value", function() {
                pubEd25519['me'] = 'foo';
                var myCallback = sinon.spy();
                getPubEd25519('me', myCallback);
                assert.deepEqual(pubEd25519, {'me': 'foo'});
                sinon.assert.calledOnce(myCallback);
                assert.strictEqual(myCallback.args[0][0], 'foo');
            });
        });
    });
});
