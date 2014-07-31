/**
 * @fileOverview
 * User operations unit tests.
 */

describe("user unit test", function() {
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
        describe('getUserAttribute', function() {
            it("internal callback error, no custom callback", function() {
                window.api_req = sinon.spy();
                getUserAttribute('me', 'puEd255', true, undefined);
                sinon.assert.calledOnce(api_req);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                sandbox.stub(window.console, 'log');
                window.d = true;
                callback(-3, theCtx);
                window.d = false;
                assert.strictEqual(console.log.args[0][0],
                                   'Error retrieving attribute "+puEd255" for user "me": -3!');
            });
    
            it("internal callback error, custom callback", function() {
                window.api_req = sinon.spy();
                var myCallback = sinon.spy();
                getUserAttribute('me', 'puEd255', true, myCallback);
                sinon.assert.calledOnce(api_req);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                callback(-3, theCtx);
                assert.strictEqual(myCallback.args[0][0], -3);
            });
    
            it("internal callback OK, no custom callback", function() {
                window.api_req = sinon.spy();
                getUserAttribute('me', 'puEd255', true, undefined);
                sinon.assert.calledOnce(api_req);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                sandbox.stub(window.console, 'log');
                window.d = true;
                callback('Zm9ydHl0d28=', theCtx);
                window.d = false;
                assert.strictEqual(console.log.args[0][0],
                                   'Attribute "+puEd255" for user "me" is "fortytwo".');
            });
    
            it("internal callback OK, custom callback", function() {
                window.api_req = sinon.spy();
                var myCallback = sinon.spy();
                getUserAttribute('me', 'puEd255', true, myCallback);
                sinon.assert.calledOnce(api_req);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                callback('Zm9ydHl0d28=', theCtx);
                assert.strictEqual(myCallback.args[0][0], 'fortytwo');
            });
    
            it("private attribute, internal callback OK, custom callback", function() {
                window.api_req = sinon.spy();
                var myCallback = sinon.spy();
                sandbox.stub(window, 'blockDecrypt', _echo);
                sandbox.stub(window, 'tlvRecordsToContainer', _echo);
                sandbox.stub(window, 'u_k', 'foo');
                getUserAttribute('me', 'keyring', false, myCallback);
                sinon.assert.calledOnce(api_req);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                callback('Zm9ydHl0d28=', theCtx);
                assert.strictEqual(myCallback.args[0][0], 'fortytwo');
                assert.ok(blockDecrypt.calledWith('fortytwo'));
                assert.ok(blockDecrypt.calledWith('fortytwo', 'foo'));
            });
    
            it("private attribute, internal callback OK, custom callback", function() {
                window.api_req = sinon.spy();
                var myCallback = sinon.spy();
                sandbox.stub(window, 'u_k', asmCrypto.bytes_to_string(asmCrypto.hex_to_bytes('0f0e0d0c0b0a09080706050403020100')));
                getUserAttribute('me', 'keyring', false, myCallback);
                sinon.assert.calledOnce(api_req);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                var res = 'AgABAgMEBQYHCAk+T6t/cBKS0eztTXRFa2qd9jFfycQmUC5dJJurGUm99XOLMSTw00I3LtHJ7HtLuKdAauFIGc5oCegTnlHVaAFIahGfgp845h0GDQ==';
                var expected = {'foo': 'bar', 'puEd255': ED25519_PUB_KEY};
                callback(res, theCtx);
                assert.deepEqual(myCallback.args[0][0], expected);
            });
            
            it("public attribute", function() {
                window.api_req = sinon.spy();
                getUserAttribute('me', 'puEd255', undefined, undefined);
                sinon.assert.calledOnce(api_req);
                assert.deepEqual(api_req.args[0][0], {a: 'uga', u: 'me', ua: '+puEd255'});
            });
            
            it("public attribute, two params", function() {
                window.api_req = sinon.spy();
                getUserAttribute('me', 'puEd255');
                sinon.assert.calledOnce(api_req);
                assert.deepEqual(api_req.args[0][0], {a: 'uga', u: 'me', ua: '+puEd255'});
            });
    
            it("private attribute", function() {
                window.api_req = sinon.spy();
                getUserAttribute('me', 'keyring', false, undefined);
                sinon.assert.calledOnce(api_req);
                assert.deepEqual(api_req.args[0][0], {a: 'uga', u: 'me', ua: '*keyring'});
            });
        });

        describe('setUserAttribute', function() {
//            it("internal callback error, no custom callback", function() {
//                window.api_req = sinon.spy();
//                getUserAttribute('me', 'puEd255', true, undefined);
//                sinon.assert.calledOnce(api_req);
//                var callback = api_req.args[0][1].callback;
//                var theCtx = api_req.args[0][1];
//                sandbox.stub(window.console, 'log');
//                window.d = true;
//                callback(-3, theCtx);
//                window.d = false;
//                assert.strictEqual(console.log.args[0][0],
//                                   'Error setting attribute "+puEd255" for user "me": -3!');
//            });
    
//            it("internal callback error, custom callback", function() {
//                window.api_req = sinon.spy();
//                var myCallback = sinon.spy();
//                getUserAttribute('me', 'puEd255', true, myCallback);
//                sinon.assert.calledOnce(api_req);
//                var callback = api_req.args[0][1].callback;
//                var theCtx = api_req.args[0][1];
//                callback(-3, theCtx);
//                assert.strictEqual(myCallback.args[0][0], -3);
//            });
//    
//            it("internal callback OK, no custom callback", function() {
//                window.api_req = sinon.spy();
//                getUserAttribute('me', 'puEd255', true, undefined);
//                sinon.assert.calledOnce(api_req);
//                var callback = api_req.args[0][1].callback;
//                var theCtx = api_req.args[0][1];
//                sandbox.stub(window.console, 'log');
//                window.d = true;
//                callback('Zm9ydHl0d28=', theCtx);
//                window.d = false;
//                assert.strictEqual(console.log.args[0][0],
//                                   'Attribute "+puEd255" for user "me" is "fortytwo".');
//            });
//    
//            it("internal callback OK, custom callback", function() {
//                window.api_req = sinon.spy();
//                var myCallback = sinon.spy();
//                getUserAttribute('me', 'puEd255', true, myCallback);
//                sinon.assert.calledOnce(api_req);
//                var callback = api_req.args[0][1].callback;
//                var theCtx = api_req.args[0][1];
//                callback('Zm9ydHl0d28=', theCtx);
//                assert.strictEqual(myCallback.args[0][0], 'fortytwo');
//            });
//    
//            it("private attribute, internal callback OK, custom callback", function() {
//                window.api_req = sinon.spy();
//                var myCallback = sinon.spy();
//                sandbox.stub(window, 'blockDecrypt', _echo);
//                sandbox.stub(window, 'tlvRecordsToContainer', _echo);
//                sandbox.stub(window, 'u_k', 'foo');
//                getUserAttribute('me', 'keyring', false, myCallback);
//                sinon.assert.calledOnce(api_req);
//                var callback = api_req.args[0][1].callback;
//                var theCtx = api_req.args[0][1];
//                callback('Zm9ydHl0d28=', theCtx);
//                assert.strictEqual(myCallback.args[0][0], 'fortytwo');
//                assert.ok(blockDecrypt.calledWith('fortytwo'));
//                assert.ok(blockDecrypt.calledWith('fortytwo', 'foo'));
//            });
//    
//            it("private attribute, internal callback OK, custom callback", function() {
//                window.api_req = sinon.spy();
//                var myCallback = sinon.spy();
//                sandbox.stub(window, 'u_k', asmCrypto.bytes_to_string(asmCrypto.hex_to_bytes('0f0e0d0c0b0a09080706050403020100')));
//                getUserAttribute('me', 'keyring', false, myCallback);
//                sinon.assert.calledOnce(api_req);
//                var callback = api_req.args[0][1].callback;
//                var theCtx = api_req.args[0][1];
//                var res = 'AgABAgMEBQYHCAk+T6t/cBKS0eztTXRFa2qd9jFfycQmUC5dJJurGUm99XOLMSTw00I3LtHJ7HtLuKdAauFIGc5oCegTnlHVaAFIahGfgp845h0GDQ==';
//                var expected = {'foo': 'bar', 'puEd255': ED25519_PUB_KEY};
//                callback(res, theCtx);
//                assert.deepEqual(myCallback.args[0][0], expected);
//            });
//            
//            it("public attribute", function() {
//                window.api_req = sinon.spy();
//                getUserAttribute('me', 'puEd255', undefined, undefined);
//                sinon.assert.calledOnce(api_req);
//                assert.deepEqual(api_req.args[0][0], {a: 'uga', u: 'me', ua: '+puEd255'});
//            });
//            
//            it("public attribute, two params", function() {
//                window.api_req = sinon.spy();
//                getUserAttribute('me', 'puEd255');
//                sinon.assert.calledOnce(api_req);
//                assert.deepEqual(api_req.args[0][0], {a: 'uga', u: 'me', ua: '+puEd255'});
//            });
//    
//            it("private attribute", function() {
//                window.api_req = sinon.spy();
//                getUserAttribute('me', 'keyring', false, undefined);
//                sinon.assert.calledOnce(api_req);
//                assert.deepEqual(api_req.args[0][0], {a: 'uga', u: 'me', ua: '*keyring'});
//            });
        });
    });
});
