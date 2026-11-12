/**
 * @fileOverview
 * Account operations unit tests.
 */

describe("account unit test", function() {
    "use strict";

    var assert = chai.assert;

    // Some test data.
    var ED25519_PUB_KEY = atob('11qYAYKxCrfVS/7TyWQHOg7hcvPapiMlrwIaaPcHURo=');

    var _echo = function(x) { return x; };
    var ns = mega.attr;

    beforeEach(function() {
        localStorage.clear();
        api_req = mStub(window, 'api_req');
    });

    afterEach(function(done) {
        mStub.restore();
        attribCache.dbcache = Object.create(null);     // items that reside in the DB
        attribCache.newcache = Object.create(null);    // new items that are pending flushing to the DB
        attribCache.delcache = Object.create(null);    // delete items that are pending deletion from the DB
        done();
    });

    describe('user attributes', function() {
        describe('mega.attr.get', function() {
            it("internal callback error, no custom callback", function() {
                mStub(ns._logger, 'warn');

                var aPromise = mega.attr.get('me3456789xw', 'puEd255', true, false, undefined);
                assert.strictEqual(api_req.callCount, 1);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                callback(EFAILED, theCtx);
                assert.strictEqual(aPromise.state(), 'rejected');
                assert.strictEqual(ns._logger.warn.callCount, 1);
                assert.strictEqual(ns._logger.warn.args[0][1], "+puEd255");
                assert.strictEqual(ns._logger.warn.args[0][2], "me3456789xw");
                assert.strictEqual(ns._logger.warn.args[0][3], -5);
            });

            it("internal callback error, custom callback", function() {
                mStub(ns._logger, 'warn');

                var myCallback = sinon.spy();
                var aPromise = mega.attr.get('me3456789xw', 'puEd255', true, false, myCallback);
                assert.strictEqual(api_req.callCount, 1);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                callback(EFAILED, theCtx);
                assert.strictEqual(aPromise.state(), 'rejected');
                assert.strictEqual(myCallback.args[0][0], EFAILED);
                assert.strictEqual(ns._logger.warn.args[0][1], "+puEd255");
                assert.strictEqual(ns._logger.warn.args[0][2], "me3456789xw");
                assert.strictEqual(ns._logger.warn.args[0][3], -5);
            });

            it("internal callback OK, no custom callback", function(done) {
                mStub(ns._logger, '_log');

                var aPromise = mega.attr.get('me3456789xw', 'puEd255', true, false, undefined);
                assert.strictEqual(api_req.callCount, 1);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                mStub(window, 'd', true);
                callback('fortytwo', theCtx);
                assert.strictEqual(aPromise.state(), 'resolved');
                assert.strictEqual(ns._logger._log.args[0][1], "+puEd255");
                assert.strictEqual(ns._logger._log.args[0][2], "me3456789xw");
                assert.strictEqual(ns._logger._log.args[0][3], '"fortytwo"');

                aPromise
                    .done(function(resolveArgs) {
                        assert.strictEqual(resolveArgs, 'fortytwo');
                    })
                    .always(function() {
                        done();
                    });
            });

            it("internal callback OK, custom callback", function() {
                mStub(ns._logger, '_log');

                var myCallback = sinon.spy();
                var aPromise = mega.attr.get('me3456789xw', 'puEd255', true, false, myCallback);
                assert.strictEqual(api_req.callCount, 1);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                mStub(window, 'd', true);
                callback('fortytwo', theCtx);
                assert.strictEqual(aPromise.state(), 'resolved');
                assert.strictEqual(myCallback.args[0][0], 'fortytwo');

                assert.strictEqual(ns._logger._log.callCount, 1);
                assert.strictEqual(ns._logger._log.args[0][1],"+puEd255");
                assert.strictEqual(ns._logger._log.args[0][2],"me3456789xw");
                assert.strictEqual(ns._logger._log.args[0][3],'"fortytwo"');

            });

            it("private attribute, internal callback OK, custom callback, crypto stubbed", function() {
                mStub(window, 'd', true);
                mStub(ns._logger, '_log');
                mStub(window, 'u_k', 'foo');
                mStub(tlvstore, 'blockDecrypt').callsFake(_echo);
                mStub(tlvstore, 'tlvRecordsToContainer').callsFake(_echo);

                var myCallback = sinon.spy();
                var aPromise = mega.attr.get('me3456789xw', 'keyring', false, false, myCallback);
                assert.strictEqual(api_req.callCount, 1);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                callback('Zm9ydHl0d28=', theCtx);
                assert.strictEqual(aPromise.state(), 'resolved');
                assert.strictEqual(myCallback.args[0][0], 'fortytwo');
                assert.ok(tlvstore.tlvRecordsToContainer.calledWith('fortytwo', true));
                assert.ok(tlvstore.blockDecrypt.calledWith('fortytwo', 'foo'));

                assert.strictEqual(ns._logger._log.callCount, 1);
                assert.strictEqual(ns._logger._log.args[0][1],"*keyring");
                assert.strictEqual(ns._logger._log.args[0][2],"me3456789xw");
                assert.strictEqual(ns._logger._log.args[0][3],'-- hidden --');
            });

            it("private attribute, failed data integrity check", function(done) {
                mStub(window, 'u_k', 'foo');
                mStub(tlvstore, 'blockDecrypt').throws('SecurityError');

                var result = mega.attr.get('me3456789xw', 'keyring', false, false);
                assert.strictEqual(api_req.callCount, 1);

                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                callback('Zm9ydHl0d28=', theCtx);

                assert.ok(tlvstore.blockDecrypt.calledWith('fortytwo', 'foo'));
                assert.strictEqual(result.state(), 'rejected');

                result
                    .fail(function(rejectArgs) {
                        assert.strictEqual(rejectArgs, EINTERNAL);
                    })
                    .always(function() {
                        done();
                    });
            });

            it("private attribute, plain object instead of an encrypted value", function() {
                mStub(ns._logger, '_log');
                mStub(tlvstore, 'blockDecrypt').callsFake(_echo);
                mStub(tlvstore, 'tlvRecordsToContainer').callsFake(_echo);
                var myCallback = sinon.spy();
                var aPromise = mega.attr.get('me3456789xw', 'keyring', false, false, myCallback);
                assert.strictEqual(api_req.callCount, 1);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                var plain = { 'foo': 'bar', 'puEd255': ED25519_PUB_KEY };
                mStub(window, 'd', true);
                callback(plain, theCtx);
                assert.strictEqual(aPromise.state(), 'rejected');
                assert.deepEqual(myCallback.callCount, 1);
                assert.strictEqual(myCallback.args[0][0], EINTERNAL);
                assert.strictEqual(tlvstore.blockDecrypt.callCount, 0);
            });

            it("public attribute", function() {

                mega.attr.get('me3456789xw', 'puEd255', undefined, undefined, undefined);
                assert.strictEqual(api_req.callCount, 1);

                assert.deepEqual(api_req.args[0][0], {a: 'uga', u: 'me3456789xw', ua: '+puEd255', v: 1});
            });

            it("public, non-historic attribute", function() {

                mega.attr.get('me3456789xw', 'puEd255', true, true, undefined);
                assert.strictEqual(api_req.callCount, 1);
                assert.deepEqual(api_req.args[0][0], {a: 'uga', u: 'me3456789xw', ua: '+!puEd255', v: 1});
            });

            it("public attribute, two params", function() {

                mega.attr.get('me3456789xz', 'puEd255');
                assert.strictEqual(api_req.callCount, 1);
                assert.deepEqual(api_req.args[0][0], {a: 'uga', u: 'me3456789xz', ua: '+puEd255', v: 1});
            });

            it("private attribute", function() {

                mega.attr.get('me3456789xw', 'keyring', false, false, undefined);
                assert.strictEqual(api_req.callCount, 1);
                assert.deepEqual(api_req.args[0][0], {a: 'uga', u: 'me3456789xw', ua: '*keyring', v: 1});
            });

            it("private, non-historic attribute", function() {

                mega.attr.get('me3456789xw', 'keyring', false, true, undefined);
                assert.strictEqual(api_req.callCount, 1);
                assert.deepEqual(api_req.args[0][0], {a: 'uga', u: 'me3456789xw', ua: '*!keyring', v: 1});
            });
        });

        describe('mega.attr.set', function() {
            it("internal callback error, no custom callback", function() {
                mStub(ns._logger, '_log');

                mega.attr.set('puEd255', 'foo', true, false, undefined);
                assert.strictEqual(api_req.callCount, 1);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                mStub(window, 'd', true);
                callback(EFAILED, theCtx);

                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Error setting user attribute "+puEd255", result: -5!');
            });

            it("internal callback error, custom callback", function() {
                mStub(ns._logger, '_log');

                var myCallback = sinon.spy();
                mega.attr.set('puEd255', 'foo', true, false, myCallback);
                assert.strictEqual(api_req.callCount, 1);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                callback(EFAILED, theCtx);
                assert.strictEqual(myCallback.args[0][0], EFAILED);
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Error setting user attribute "+puEd255", result: -5!');
            });

            it("internal callback OK, no custom callback", function() {
                mStub(ns._logger, '_log');

                mega.attr.set('puEd255', 'foo', true, false, undefined);
                assert.strictEqual(api_req.callCount, 1);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                mStub(window, 'd', true);
                callback('OK', theCtx);
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Setting user attribute "+puEd255", result: OK');
            });

            it("internal callback OK, custom callback", function() {
                mStub(ns._logger, '_log');

                var myCallback = sinon.spy();
                mega.attr.set('puEd255', 'foo', true, false, myCallback);
                assert.strictEqual(api_req.callCount, 1);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                callback('OK', theCtx);
                assert.strictEqual(myCallback.args[0][0], 'OK');

                assert.strictEqual(ns._logger._log.callCount, 1);
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Setting user attribute "+puEd255", result: OK');
            });

            it("private attribute, internal callback OK, custom callback, crypto stubbed", function() {
                mStub(ns._logger, '_log');
                var myCallback = sinon.spy();
                mStub(tlvstore, 'blockEncrypt').callsFake(_echo);
                mStub(tlvstore, 'containerToTlvRecords').callsFake(_echo);
                mStub(window, 'u_k', 'foo');
                mega.attr.set('keyring', 'fortytwo', false, false, myCallback);
                assert.ok(tlvstore.blockEncrypt.calledWith('fortytwo', 'foo',
                    tlvstore.BLOCK_ENCRYPTION_SCHEME. AES_GCM_12_16));
                assert.ok(tlvstore.containerToTlvRecords.calledWith('fortytwo'));
                assert.strictEqual(api_req.callCount, 1);
                var callback = api_req.args[0][1].callback;
                var theCtx = api_req.args[0][1];
                callback('OK', theCtx);
                assert.strictEqual(myCallback.args[0][0], 'OK');
                assert.strictEqual(ns._logger._log.args[0][0],
                                   'Setting user attribute "*keyring", result: OK');
            });

            it("private attribute, internal callback OK, no custom callback", function() {
                mStub(window, 'u_k',
                    asmCrypto.bytes_to_string(asmCrypto.hex_to_bytes('0f0e0d0c0b0a09080706050403020100')));

                mega.attr.set('keyring', {'foo': 'bar', 'puEd255': ED25519_PUB_KEY}, false, false, undefined);
                assert.strictEqual(api_req.callCount, 1);
                var decoded = tlvstore.tlvRecordsToContainer(
                    tlvstore.blockDecrypt(base64urldecode(
                        api_req.args[0][0]['*keyring']), window.u_k));
                assert.strictEqual(api_req.args[0][0].a, 'up');
                assert.strictEqual(decoded.puEd255, ED25519_PUB_KEY);
                assert.strictEqual(decoded.foo, 'bar');
            });

            it("public attribute", function() {

                mega.attr.set('puEd255', 'foo', true, false, undefined);
                assert.strictEqual(api_req.callCount, 1);
                assert.deepEqual(api_req.args[0][0].a, 'up');
                assert.deepEqual(api_req.args[0][0]['+puEd255'], 'foo');
            });

            it("public attribute, two params", function() {

                mega.attr.set('puEd255', 'foo');
                assert.strictEqual(api_req.callCount, 1);
                assert.deepEqual(api_req.args[0][0].a, 'up');
                assert.deepEqual(api_req.args[0][0]['+puEd255'], 'foo');
            });

            it("private attribute", function() {
                mStub(window, 'u_k',
                    asmCrypto.bytes_to_string(asmCrypto.hex_to_bytes('0f0e0d0c0b0a09080706050403020100')));

                mega.attr.set('keyring', {'foo': 'bar', 'puEd255': ED25519_PUB_KEY}, false, false, undefined);
                assert.strictEqual(api_req.callCount, 1);
                var decoded = tlvstore.tlvRecordsToContainer(
                    tlvstore.blockDecrypt(base64urldecode(
                        api_req.args[0][0]['*keyring']), window.u_k));
                assert.strictEqual(api_req.args[0][0].a, 'up');
                assert.strictEqual(decoded.puEd255, ED25519_PUB_KEY);
                assert.strictEqual(decoded.foo, 'bar');
                assert.lengthOf(api_req.args[0][0]['*keyring'], 107);
            });

            it("private attribute, compact crypto mode", function() {

                mStub(window, 'u_k',
                    asmCrypto.bytes_to_string(asmCrypto.hex_to_bytes('0f0e0d0c0b0a09080706050403020100')));
                mega.attr.set('keyring', {'foo': 'bar',
                                             'puEd255': ED25519_PUB_KEY},
                                 false, false, undefined, undefined,
                                 tlvstore.BLOCK_ENCRYPTION_SCHEME.AES_CCM_10_08);
                assert.strictEqual(api_req.callCount, 1);
                var decoded = tlvstore.tlvRecordsToContainer(
                    tlvstore.blockDecrypt(base64urldecode(
                        api_req.args[0][0]['*keyring']), window.u_k));
                assert.strictEqual(api_req.args[0][0].a, 'up');
                assert.strictEqual(decoded.puEd255, ED25519_PUB_KEY);
                assert.strictEqual(decoded.foo, 'bar');
                assert.lengthOf(api_req.args[0][0]['*keyring'], 94);
            });
        });
    });

    describe('u_checklogin3a', function() {
        // n=55 (p=5, q=11), SDK-style e=3 and d=7 mod lcm(4, 10), so e is derived mod phi as 23
        var privk = ['\x37', '\x17', '\x07', '\x05', '\x0b', 'dp', 'dq', 'u'];
        var encode = function(pubkey) {
            return base64urlencode(crypto_encodepubkey(pubkey));
        };

        var login = function(pubk) {
            mStub(console, 'error');
            mStub(window, 'u_sid', 'sid');
            mStub(window, 'u_storage', {sid: 'sid'});
            mStub(window, 'u_k', [1, 2, 3, 4]);
            mStub(window, 'u_k_aes', false);
            mStub(window, 'u_handle', false);
            mStub(window, 'u_attr', false);
            mStub(window, 'u_privk', false);
            mStub(window, 'init_storage');
            mStub(window, 'crypto_decodeprivkey').returns(privk);
            mStub(MegaUtils.prototype, 'getPersistentData').callsFake(function() {
                return Promise.reject(ENOENT);
            });

            return new Promise(function(resolve) {
                u_checklogin3a({u: 'me3456789xw', privk: a32_to_base64([1, 2, 3, 4]), pubk: pubk}, {
                    checkloginresult: function() {
                        resolve(u_attr.pubk);
                    }
                });
            });
        };

        it("keeps an API pub key matching the private key", function() {
            var pubk = encode(['\0\x37', '\x17']);
            return login(pubk).then(function(result) {
                assert.strictEqual(result, pubk);
                expect(console.error.callCount).to.eql(0);
            });
        });

        it("keeps an SDK pub key whose exponent pairs with d but isn't the derived one", function() {
            var pubk = encode(['\x37', '\x03']);
            return login(pubk).then(function(result) {
                assert.strictEqual(result, pubk);
                expect(console.error.callCount).to.eql(0);
            });
        });

        it("replaces an API pub key with another modulus", function() {
            return login(encode(['\x4d', '\x03'])).then(function(result) {
                assert.strictEqual(result, encode(privk));
                expect(console.error.callCount).to.eql(1);
            });
        });

        it("replaces an API pub key with another exponent", function() {
            return login(encode(['\x37', '\x09'])).then(function(result) {
                assert.strictEqual(result, encode(privk));
                expect(console.error.callCount).to.eql(1);
            });
        });
    });
});
