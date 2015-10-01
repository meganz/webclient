/**
 * @fileOverview
 * Chat message encryption unit tests.
 */

describe("chat.strongvelope unit test", function() {
    "use strict";

    var assert = chai.assert;

    var ns = strongvelope;

    // Some test data.
    var ED25519_PRIV_KEY = atob('nWGxne/9WmC6hEr0kuwsxERJxWl7MmkZcDusAxyuf2A=');
    var ED25519_PUB_KEY = atob('11qYAYKxCrfVS/7TyWQHOg7hcvPapiMlrwIaaPcHURo=');
    var CU25519_PRIV_KEY = atob('ZMB9oRI87iFj5cwKBvgzwnxxToRAO3L5P1gILfJyEik=');
    var CU25519_PUB_KEY = atob('4BXxF+5ehQKKCCR5x3hP3E0hzYry59jFTM30x9dzWRI=');
    var KEY = atob('/+fPkTwBddDWDSA2M1hluA==');
    var NONCE = atob('MTHgl79y+1FFnmnopp4UNA==');
    var INITIAL_MESSAGE_BIN = atob('AAEAAECR5abrrFG5otEtEsM/VX+RVXES1zWRji8RGy'
        + '4wbldEl3rnNn3TsgNf6hFVOTeniLMKufx+arMo+E+btMeSDH4CAgAAAQADAAAM71Brl'
        + 'kBJXmR5xRtMBAAACMqLuOeu/PccBQAAEMiaxjj3mLwIOIk3mKluzXsGAAABAAcAAAbr'
        + 'uWm1K5g=');
    var INITIAL_MESSAGE = {
        protocolVersion: 0,
        signature:  atob('keWm66xRuaLRLRLDP1V/kVVxEtc1kY4vERsuMG5XRJd65zZ907ID'
                         + 'X+oRVTk3p4izCrn8fmqzKPhPm7THkgx+Ag=='),
        signedContent: atob('AgAAAQADAAAM71BrlkBJXmR5xRtMBAAACMqLuOeu/PccBQAAE'
                            + 'Miaxjj3mLwIOIk3mKluzXsGAAABAAcAAAbruWm1K5g='),
        type: 0x00,
        nonce: atob('71BrlkBJXmR5xRtM'),
        recipients: ['you456789xw'],
        keys: [atob('yJrGOPeYvAg4iTeYqW7New==')],
        keyId: 0x00,
        payload: atob('67lptSuY')
    };
    var FOLLOWUP_MESSAGE_BIN = atob('AAEAAEAUrDxmdixK1JDmUMpe7Kl04xwN7GIZYpYS1'
        + '7FJiXjPGWLn4OARJRl7+o4+m8Sa1vSgdBEjIE+H/AvjLjDjqhcCAgAAAQEDAAAM71Br'
        + 'lkBJXmR5xRtMBgAAAQAHAAAG67lptSuY');
    var FOLLOWUP_MESSAGE = {
        protocolVersion: 0,
        signature:  atob('FKw8ZnYsStSQ5lDKXuypdOMcDexiGWKWEtexSYl4zxli5+DgESUZ'
                         + 'e/qOPpvEmtb0oHQRIyBPh/wL4y4w46oXAg=='),
        signedContent: atob('AgAAAQEDAAAM71BrlkBJXmR5xRtMBgAAAQAHAAAG67lptSuY'),
        type: 0x01,
        nonce: atob('71BrlkBJXmR5xRtM'),
        recipients: [],
        keys: [],
        keyId: 0x00,
        payload: atob('67lptSuY')
    };
    var ROTATED_KEY = atob('D/1apgnOpfzZqrYi95t5pw==');
    var ROTATION_MESSAGE_BIN = atob('AAEAAEAInegEOLv2lu8+ZTFM/C2NJJ3CxhxG1GW5d'
        + 'urvkOnpbpaKQajZeudY2qek2mDddGkyFNuzacFgi+AQQRsXJpQAAgAAAQADAAAM71Br'
        + 'lkBJXmR5xRtMBAAACMqLuOeu/PccBQAAIFk7mB4YHHMOQdLukN+74uq79XrRhAqxMb0'
        + 'cVGLUtIcDBgAAAQEHAAAGH78adfMY');
    var ROTATION_MESSAGE = {
        protocolVersion: 0,
        signature:  atob('CJ3oBDi79pbvPmUxTPwtjSSdwsYcRtRluXbq75Dp6W6WikGo2Xrn'
                         + 'WNqnpNpg3XRpMhTbs2nBYIvgEEEbFyaUAA=='),
        signedContent: atob('AgAAAQADAAAM71BrlkBJXmR5xRtMBAAACMqLuOeu/PccBQAAI'
                            + 'Fk7mB4YHHMOQdLukN+74uq79XrRhAqxMb0cVGLUtIcDBgAA'
                            + 'AQEHAAAGH78adfMY'),
        type: 0x00,
        nonce: atob('71BrlkBJXmR5xRtM'),
        recipients: ['you456789xw'],
        keys: [atob('WTuYHhgccw5B0u6Q37vi6rv1etGECrExvRxUYtS0hwM=')],
        keyId: 0x01,
        payload: atob('H78adfMY')
    };

    // Create/restore Sinon stub/spy/mock sandboxes.
    var sandbox = null;

    var _echo = function(x) { return x; };
    var _copy = function(source) {
        var __copy = function(dest) {
            for (var i = 0; i < source.length; i++) {
                dest[i] = source.charCodeAt(i);
            }
        };
        return __copy;
    };
    var _bytesOfString = function(x) {
        var result = [];
        for (var i = 0; i < x.length; i++) {
            result.push(x.charCodeAt(i));
        }
        return new Uint8Array(result);
    };

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('en-/decryption', function() {
        describe('_symmetricEncryptMessage', function() {
            it("all parameters given", function() {
                sandbox.stub(window, 'encodeURIComponent', _echo);
                sandbox.stub(window, 'unescape', _echo);
                sandbox.stub(asmCrypto, 'string_to_bytes', _echo);
                sandbox.stub(asmCrypto.AES_CTR, 'encrypt').returns('cipher text');
                sandbox.stub(asmCrypto, 'bytes_to_string', _echo);

                var result = ns._symmetricEncryptMessage('forty two', 'the key', 'gooniegoogoo');
                assert.deepEqual(result,
                    { ciphertext: 'cipher text', key: 'the key', nonce: 'gooniegoogoo' });
                assert.strictEqual(asmCrypto.string_to_bytes.callCount, 3);
                assert.strictEqual(encodeURIComponent.callCount, 1);
                assert.strictEqual(unescape.callCount, 1);
                assert.strictEqual(asmCrypto.AES_CTR.encrypt.callCount, 1);
                assert.deepEqual(asmCrypto.AES_CTR.encrypt.args[0],
                    ['forty two', 'the key', 'gooniegoogoo']);
                assert.strictEqual(asmCrypto.bytes_to_string.callCount, 3);
            });

            it("no mocks", function() {
                var result = ns._symmetricEncryptMessage('forty two', KEY, NONCE);
                assert.strictEqual(btoa(result.ciphertext), 'PqG4NXmumTUS');
                assert.strictEqual(btoa(result.key), btoa(KEY));
                assert.strictEqual(btoa(result.nonce), btoa(NONCE.substring(0, 12)));
            });

            it("missing nonce", function() {
                sandbox.stub(window, 'encodeURIComponent', _echo);
                sandbox.stub(window, 'unescape', _echo);
                sandbox.stub(asmCrypto, 'string_to_bytes', _echo);
                sandbox.stub(asmCrypto, 'getRandomValues', _copy('gooniegoogoo'));
                sandbox.stub(asmCrypto.AES_CTR, 'encrypt').returns('cipher text');
                sandbox.stub(asmCrypto, 'bytes_to_string', _echo);

                var result = ns._symmetricEncryptMessage('forty two', 'the key');
                assert.deepEqual(result, { ciphertext: 'cipher text', key: 'the key',
                                           nonce: _bytesOfString('gooniegoogoo') });
                assert.strictEqual(asmCrypto.string_to_bytes.callCount, 2);
                assert.strictEqual(asmCrypto.getRandomValues.callCount, 1);
                assert.strictEqual(encodeURIComponent.callCount, 1);
                assert.strictEqual(unescape.callCount, 1);
                assert.strictEqual(asmCrypto.AES_CTR.encrypt.callCount, 1);
                assert.strictEqual(asmCrypto.bytes_to_string.callCount, 3);
            });

            it("message only", function() {
                sandbox.stub(window, 'encodeURIComponent', _echo);
                sandbox.stub(window, 'unescape', _echo);
                sandbox.stub(asmCrypto, 'string_to_bytes', _echo);
                var counter = 0;
                var _getRandomValues = function(x) {
                    counter++;
                    var value;
                    if (counter === 1) {
                        value = 'a new secret key';
                    }
                    else {
                        value = 'gooniegoogoo';
                    }
                    return _copy(value)(x);
                };
                sandbox.stub(asmCrypto, 'getRandomValues', _getRandomValues);
                sandbox.stub(asmCrypto.AES_CTR, 'encrypt').returns('cipher text');
                sandbox.stub(asmCrypto, 'bytes_to_string', _echo);

                var result = ns._symmetricEncryptMessage('forty two');
                assert.deepEqual(result, { ciphertext: 'cipher text',
                                           key: _bytesOfString('a new secret key'),
                                           nonce: _bytesOfString('gooniegoogoo') });
                assert.strictEqual(asmCrypto.string_to_bytes.callCount, 1);
                assert.strictEqual(asmCrypto.getRandomValues.callCount, 2);
                assert.strictEqual(encodeURIComponent.callCount, 1);
                assert.strictEqual(unescape.callCount, 1);
                assert.strictEqual(asmCrypto.AES_CTR.encrypt.callCount, 1);
                assert.strictEqual(asmCrypto.bytes_to_string.callCount, 3);
            });
        });

        describe('_symmetricDecryptMessage', function() {
            it("all parameters given", function() {
                sandbox.stub(window, 'decodeURIComponent', _echo);
                sandbox.stub(window, 'escape', _echo);
                sandbox.stub(asmCrypto, 'string_to_bytes', _echo);
                sandbox.stub(asmCrypto.AES_CTR, 'decrypt').returns('forty two');
                sandbox.stub(asmCrypto, 'bytes_to_string', _echo);

                var result = ns._symmetricDecryptMessage('cipher text', 'the key', 'gooniegoogoo');
                assert.deepEqual(result, 'forty two');
                assert.strictEqual(asmCrypto.string_to_bytes.callCount, 3);
                assert.strictEqual(asmCrypto.AES_CTR.decrypt.callCount, 1);
                assert.deepEqual(asmCrypto.AES_CTR.decrypt.args[0],
                    ['cipher text', 'the key', 'gooniegoogoo']);
                assert.strictEqual(asmCrypto.bytes_to_string.callCount, 1);
                assert.strictEqual(decodeURIComponent.callCount, 1);
                assert.strictEqual(escape.callCount, 1);
            });

            it("no mocks", function() {
                var result = ns._symmetricDecryptMessage(atob('PqG4NXmumTUS'), KEY, NONCE);
                assert.strictEqual(result, 'forty two');
            });
        });

        describe('_symmetricEncryptMessage/_symmetricDecryptMessage', function() {
            it("round trips", function() {
                var tests = ['42', "Don't panic!", 'Flying Spaghetti Monster',
                             "Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn",
                             'Tēnā koe', 'Hänsel & Gretel', 'Слартибартфаст'];
                var encrypted;
                var decrypted;
                var testValue;
                for (var i = 0; i < tests.length; i++) {
                    testValue = tests[i];
                    encrypted = strongvelope._symmetricEncryptMessage(testValue);
                    decrypted = strongvelope._symmetricDecryptMessage(
                        encrypted.ciphertext, encrypted.key, encrypted.nonce);
                    assert.strictEqual(testValue, decrypted);
                }
            });
        });

        describe('_signMessage', function() {
            it("vanilla case", function() {
                sandbox.stub(asmCrypto, 'string_to_bytes', _echo);
                sandbox.stub(nacl.sign, 'detached').returns('squiggle');
                sandbox.stub(asmCrypto, 'bytes_to_string', _echo);

                var result = ns._signMessage('forty two', 'private key', 'public key');
                assert.strictEqual(result, 'squiggle');
                assert.strictEqual(asmCrypto.string_to_bytes.callCount, 2);
                assert.strictEqual(nacl.sign.detached.callCount, 1);
                assert.deepEqual(nacl.sign.detached.args[0],
                    ['forty two', 'private keypublic key']);
                assert.strictEqual(asmCrypto.bytes_to_string.callCount, 1);
            });

            it("no mocks", function() {
                var result = ns._signMessage('forty two', ED25519_PRIV_KEY, ED25519_PUB_KEY);
                assert.strictEqual(btoa(result),
                    'xlJUrYhkjwgY7hMPEndCVR0SArLnWCv4ZH0RgJqrkZONTgU2wHV0CN+HB4Wq04nfUensmNfIayU+hdHurFQwCQ==');
            });
        });

        describe('_verifyMessage', function() {
            it("vanilla case", function() {
                sandbox.stub(asmCrypto, 'string_to_bytes', _echo);
                sandbox.stub(nacl.sign.detached, 'verify').returns(true);

                var result = ns._verifyMessage('forty two', 'squiggle', 'public key');
                assert.deepEqual(result, true);
                assert.strictEqual(asmCrypto.string_to_bytes.callCount, 3);
                assert.strictEqual(nacl.sign.detached.verify.callCount, 1);
                assert.deepEqual(nacl.sign.detached.verify.args[0],
                    ['forty two', 'squiggle', 'public key']);
            });

            it("no mocks", function() {
                var signature = atob('xlJUrYhkjwgY7hMPEndCVR0SArLnWCv4ZH0RgJqr'
                                     + 'kZONTgU2wHV0CN+HB4Wq04nfUensmNfIayU+hd'
                                     + 'HurFQwCQ==');
                var result = ns._verifyMessage('forty two', signature, ED25519_PUB_KEY);
                assert.deepEqual(result, true);
            });
        });

        describe('_parseMessageContent', function() {
            it("keyed message", function() {
                var result = ns._parseMessageContent(INITIAL_MESSAGE_BIN);
                assert.deepEqual(result, INITIAL_MESSAGE);
            });

            it("followup message", function() {
                var result = ns._parseMessageContent(FOLLOWUP_MESSAGE_BIN);
                assert.deepEqual(result, FOLLOWUP_MESSAGE);
            });

            it("rotation message", function() {
                var result = ns._parseMessageContent(ROTATION_MESSAGE_BIN);
                assert.deepEqual(result, ROTATION_MESSAGE);
            });
        });
    });

    describe('ProtocolHandler class', function() {
        describe('_computeSymmetricKey', function() {
            it("normal operation", function() {
                var handler = new ns.ProtocolHandler('me3456789xw',
                    CU25519_PRIV_KEY, ED25519_PRIV_KEY, ED25519_PUB_KEY);
                sandbox.stub(window, 'pubCu25519', { 'you456789xw': 'your key' });
                sandbox.stub(asmCrypto, 'string_to_bytes', _echo);
                sandbox.stub(nacl, 'scalarMult').returns('shared secret');
                sandbox.stub(asmCrypto, 'bytes_to_string', _echo);
                sandbox.stub(asmCrypto.SHA256, 'bytes', _echo);

                var result = handler._computeSymmetricKey('you456789xw');
                assert.strictEqual(result, 'shared secret');
                assert.strictEqual(asmCrypto.string_to_bytes.callCount, 2);
                assert.strictEqual(nacl.scalarMult.callCount, 1);
                assert.strictEqual(asmCrypto.SHA256.bytes.callCount, 1);
                assert.strictEqual(asmCrypto.bytes_to_string.callCount, 1);
            });

            it("no mocks", function() {
                var handler = new ns.ProtocolHandler('me3456789xw',
                    CU25519_PRIV_KEY, ED25519_PRIV_KEY, ED25519_PUB_KEY);
                sandbox.stub(window, 'pubCu25519', { 'you456789xw': CU25519_PUB_KEY });
                sandbox.stub(window, 'u_privCu25519', CU25519_PRIV_KEY);
                var result = handler._computeSymmetricKey('you456789xw');
                assert.strictEqual(btoa(result),
                    'X2O2IQoAqzPvr2F4XWjCuwP17tYHoJwB5KhyhlHb/mM=');
            });

            it("missing recipient pubkey", function() {
                var handler = new ns.ProtocolHandler('me3456789xw',
                    CU25519_PRIV_KEY, ED25519_PRIV_KEY, ED25519_PUB_KEY);
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'pubCu25519', {});
                assert.throws(function() { handler._computeSymmetricKey('you456789xw'); },
                              'No cached chat key for user!');
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'No cached chat key for user: you456789xw');
            });
        });

        describe('_encryptKeysTo', function() {
            it("single key", function() {
                var handler = new ns.ProtocolHandler('me3456789xw',
                    CU25519_PRIV_KEY, ED25519_PRIV_KEY, ED25519_PUB_KEY);
                sandbox.stub(asmCrypto, 'string_to_bytes', _echo);
                sandbox.stub(window, 'base64urldecode', _echo);
                var iv = { subarray: sinon.stub().returns('IV') };
                sandbox.stub(asmCrypto.SHA256, 'bytes').returns(iv);
                sandbox.stub(handler, '_computeSymmetricKey').returns(
                    { substring: sinon.stub().returns('the key') });
                sandbox.stub(asmCrypto.AES_CBC, 'encrypt').returns('ciphertext');
                sandbox.stub(asmCrypto, 'bytes_to_string', _echo);

                var result = handler._encryptKeysTo(['a key'], 'gooniegoogoo', 'you456789xw');
                assert.strictEqual(result, 'ciphertext');
                assert.strictEqual(asmCrypto.AES_CBC.encrypt.callCount, 1);
                assert.deepEqual(asmCrypto.AES_CBC.encrypt.args[0],
                    ['a key', 'the key', false, 'IV']);
            });

            it("two keys", function() {
                var handler = new ns.ProtocolHandler('me3456789xw',
                    CU25519_PRIV_KEY, ED25519_PRIV_KEY, ED25519_PUB_KEY);
                sandbox.stub(asmCrypto, 'string_to_bytes', _echo);
                sandbox.stub(window, 'base64urldecode', _echo);
                var iv = { subarray: sinon.stub().returns('IV') };
                sandbox.stub(asmCrypto.SHA256, 'bytes').returns(iv);
                sandbox.stub(handler, '_computeSymmetricKey').returns(
                    { substring: sinon.stub().returns('the key') });
                sandbox.stub(asmCrypto.AES_CBC, 'encrypt').returns('ciphertext');
                sandbox.stub(asmCrypto, 'bytes_to_string', _echo);

                var result = handler._encryptKeysTo(['key one', 'key two'], 'gooniegoogoo', 'you456789xw');
                assert.strictEqual(result, 'ciphertext');
                assert.strictEqual(asmCrypto.AES_CBC.encrypt.callCount, 1);
                assert.deepEqual(asmCrypto.AES_CBC.encrypt.args[0],
                    ['key onekey two', 'the key', false, 'IV']);
            });

            it("no mocks, one key", function() {
                var handler = new ns.ProtocolHandler('me3456789xw',
                    CU25519_PRIV_KEY, ED25519_PRIV_KEY, ED25519_PUB_KEY);
                sandbox.stub(window, 'u_privCu25519', CU25519_PRIV_KEY);
                sandbox.stub(window, 'pubCu25519', { 'you456789xw': CU25519_PUB_KEY });
                sandbox.stub(handler, '_computeSymmetricKey').returns(
                    atob('X2O2IQoAqzPvr2F4XWjCuwP17tYHoJwB5KhyhlHb/mM='));

                var result = handler._encryptKeysTo([KEY], NONCE, 'you456789xw');
                assert.strictEqual(btoa(result), 'cYNQ28YygmVqaPddZsjlXA==');
            });
        });

        describe('_decryptKeysFrom', function() {
            it("single key", function() {
                var handler = new ns.ProtocolHandler('me3456789xw',
                    CU25519_PRIV_KEY, ED25519_PRIV_KEY, ED25519_PUB_KEY);
                sandbox.stub(asmCrypto, 'string_to_bytes', _echo);
                sandbox.stub(window, 'base64urldecode', _echo);
                var iv = { subarray: sinon.stub().returns('IV') };
                sandbox.stub(asmCrypto.SHA256, 'bytes').returns(iv);
                sandbox.stub(handler, '_computeSymmetricKey').returns(
                    { substring: sinon.stub().returns('the key') });
                sandbox.stub(asmCrypto.AES_CBC, 'decrypt').returns('a key67890123456');
                sandbox.stub(asmCrypto, 'bytes_to_string', _echo);

                var result = handler._decryptKeysFrom('an encrypted key', 'gooniegoogoo', 'you456789xw');
                assert.deepEqual(result, ['a key67890123456']);
                assert.strictEqual(asmCrypto.AES_CBC.decrypt.callCount, 1);
                assert.deepEqual(asmCrypto.AES_CBC.decrypt.args[0],
                    ['an encrypted key', 'the key', false, 'IV']);
            });

            it("two keys", function() {
                var handler = new ns.ProtocolHandler('me3456789xw',
                    CU25519_PRIV_KEY, ED25519_PRIV_KEY, ED25519_PUB_KEY);
                sandbox.stub(asmCrypto, 'string_to_bytes', _echo);
                sandbox.stub(window, 'base64urldecode', _echo);
                var iv = { subarray: sinon.stub().returns('IV') };
                sandbox.stub(asmCrypto.SHA256, 'bytes').returns(iv);
                sandbox.stub(handler, '_computeSymmetricKey').returns(
                    { substring: sinon.stub().returns('the key') });
                sandbox.stub(asmCrypto.AES_CBC, 'decrypt').returns('a key67890123456another key23456');
                sandbox.stub(asmCrypto, 'bytes_to_string', _echo);

                var result = handler._decryptKeysFrom('two encrypted keys', 'gooniegoogoo', 'you456789xw');
                assert.deepEqual(result, ['a key67890123456', 'another key23456']);
                assert.strictEqual(asmCrypto.AES_CBC.decrypt.callCount, 1);
                assert.deepEqual(asmCrypto.AES_CBC.decrypt.args[0],
                    ['two encrypted keys', 'the key', false, 'IV']);
            });

            it("no mocks, one key", function() {
                var handler = new ns.ProtocolHandler('you456789xw',
                    CU25519_PRIV_KEY, ED25519_PRIV_KEY, ED25519_PUB_KEY);
                sandbox.stub(handler, '_computeSymmetricKey').returns(
                    atob('X2O2IQoAqzPvr2F4XWjCuwP17tYHoJwB5KhyhlHb/mM='));

                var result = handler._decryptKeysFrom(atob('cYNQ28YygmVqaPddZsjlXA=='), NONCE, '');
                assert.deepEqual(result, [KEY]);
            });

            it("no mocks, two kes", function() {
                var handler = new ns.ProtocolHandler('you456789xw',
                    CU25519_PRIV_KEY, ED25519_PRIV_KEY, ED25519_PUB_KEY);
                sandbox.stub(handler, '_computeSymmetricKey').returns(
                    atob('X2O2IQoAqzPvr2F4XWjCuwP17tYHoJwB5KhyhlHb/mM='));

                var result = handler._decryptKeysFrom(
                    atob('PhbRKOvBhdKiKHGqdYpCuAqtulpr/nqV92QGc4gPHrg='), NONCE, '');
                assert.deepEqual(result, [ROTATED_KEY, KEY]);
            });
        });

        describe('encryptTo', function() {
            it("keyed message", function() {
                var handler = new ns.ProtocolHandler('me3456789xw',
                    CU25519_PRIV_KEY, ED25519_PRIV_KEY, ED25519_PUB_KEY);
                handler.senderKeys = ['sender key'];
                sandbox.stub(window, 'u_handle', 'me3456789xw');
                sandbox.stub(window, 'u_privEd25519', 'private Ed');
                sandbox.stub(window, 'u_pubEd25519', 'public Ed');
                sandbox.stub(window, 'base64urldecode', _echo);
                sandbox.stub(ns, '_symmetricEncryptMessage').returns(
                    { key: 'sender key', nonce: 'gooniegoogoo', ciphertext: 'ciphertext' });
                sandbox.stub(handler, '_encryptKeysTo').returns(atob('PqG4NXmumTUS'));
                sandbox.stub(ns, '_signMessage').returns('squiggle');
                sandbox.stub(tlvstore, 'toTlvRecord');
                tlvstore.toTlvRecord.withArgs('\u0001').returns('|squiggle');
                tlvstore.toTlvRecord.withArgs('\u0002').returns('|0x00');
                tlvstore.toTlvRecord.withArgs('\u0003').returns('|gooniegoogoo');
                tlvstore.toTlvRecord.withArgs('\u0004').returns('|you456789xw');
                tlvstore.toTlvRecord.withArgs('\u0005').returns('|encrypted key');
                tlvstore.toTlvRecord.withArgs('\u0006').returns('|0');
                tlvstore.toTlvRecord.withArgs('\u0007').returns('|ciphertext');
                assert.strictEqual(handler._sentKeyId, null);

                var result = handler.encryptTo('Hello!', 'you456789xw');
                assert.strictEqual(result,
                    '\u0000|squiggle|0x00|gooniegoogoo|you456789xw|encrypted key|0|ciphertext');
                assert.strictEqual(ns._symmetricEncryptMessage.callCount, 1);
                assert.strictEqual(handler._encryptKeysTo.callCount, 1);
                assert.strictEqual(tlvstore.toTlvRecord.callCount, 7);
                assert.strictEqual(ns._signMessage.callCount, 1);
                assert.strictEqual(handler._sentKeyId, handler.keyId);
                assert.strictEqual(handler._keyEncryptionCount, 1);
            });

            it("keyed, no mocks", function() {
                var handler = new ns.ProtocolHandler('me3456789xw',
                    CU25519_PRIV_KEY, ED25519_PRIV_KEY, ED25519_PUB_KEY);
                handler.senderKeys = [KEY];
                sandbox.stub(window, 'u_handle', 'me3456789xw');
                sandbox.stub(window, 'u_privEd25519', ED25519_PRIV_KEY);
                sandbox.stub(window, 'u_pubEd25519', ED25519_PUB_KEY);
                sandbox.stub(window, 'u_privCu25519', CU25519_PRIV_KEY);
                sandbox.stub(window, 'pubCu25519', { 'you456789xw': CU25519_PUB_KEY });
                sandbox.stub(ns, '_symmetricEncryptMessage').returns(
                    { key: KEY, nonce: atob('71BrlkBJXmR5xRtM'),
                      ciphertext: atob('67lptSuY') });
                sandbox.stub(handler, '_encryptKeysTo').returns(atob('yJrGOPeYvAg4iTeYqW7New=='));
                sandbox.stub(ns, '_signMessage').returns(INITIAL_MESSAGE.signature);

                var result = handler.encryptTo('Hello!', 'you456789xw');
                assert.strictEqual(btoa(result), btoa(INITIAL_MESSAGE_BIN));
                assert.strictEqual(result.length, 137);
                assert.strictEqual(handler._keyEncryptionCount, 1);
            });

            it("followup message", function() {
                var handler = new ns.ProtocolHandler('me3456789xw',
                    CU25519_PRIV_KEY, ED25519_PRIV_KEY, ED25519_PUB_KEY);
                handler.senderKeys = ['sender key'];
                handler._sentKeyId = 0;
                handler._keyEncryptionCount = 1;
                sandbox.stub(window, 'u_handle', 'me3456789xw');
                sandbox.stub(window, 'u_privEd25519', 'private Ed');
                sandbox.stub(window, 'u_pubEd25519', 'public Ed');
                sandbox.stub(window, 'base64urldecode', _echo);
                sandbox.stub(ns, '_symmetricEncryptMessage').returns(
                    { key: 'sender key', nonce: 'gooniegoogoo', ciphertext: 'ciphertext' });
                sandbox.stub(ns, '_signMessage').returns('squiggle');
                sandbox.stub(tlvstore, 'toTlvRecord');
                tlvstore.toTlvRecord.withArgs('\u0001').returns('|squiggle');
                tlvstore.toTlvRecord.withArgs('\u0002').returns('|0x01');
                tlvstore.toTlvRecord.withArgs('\u0003').returns('|gooniegoogoo');
                tlvstore.toTlvRecord.withArgs('\u0006').returns('|0');
                tlvstore.toTlvRecord.withArgs('\u0007').returns('|ciphertext');

                var result = handler.encryptTo('Hello!', 'you456789xw');
                assert.strictEqual(result,
                    '\u0000|squiggle|0x01|gooniegoogoo|0|ciphertext');
                assert.strictEqual(ns._symmetricEncryptMessage.callCount, 1);
                assert.strictEqual(tlvstore.toTlvRecord.callCount, 5);
                assert.strictEqual(ns._signMessage.callCount, 1);
                assert.strictEqual(handler._sentKeyId, handler.keyId);
                assert.strictEqual(handler._keyEncryptionCount, 2);
            });

            it("followup, no mocks", function() {
                var handler = new ns.ProtocolHandler('me3456789xw',
                    CU25519_PRIV_KEY, ED25519_PRIV_KEY, ED25519_PUB_KEY);
                handler.senderKeys = [KEY];
                handler._sentKeyId = 0;
                handler._keyEncryptionCount = 1;
                sandbox.stub(window, 'u_handle', 'me3456789xw');
                sandbox.stub(window, 'u_privEd25519', ED25519_PRIV_KEY);
                sandbox.stub(window, 'u_pubEd25519', ED25519_PUB_KEY);
                sandbox.stub(window, 'u_privCu25519', CU25519_PRIV_KEY);
                sandbox.stub(window, 'pubCu25519', { 'you456789xw': CU25519_PUB_KEY });
                sandbox.stub(ns, '_symmetricEncryptMessage').returns(
                    { key: KEY, nonce: atob('71BrlkBJXmR5xRtM'),
                      ciphertext: atob('67lptSuY') });
                sandbox.stub(ns, '_signMessage').returns(FOLLOWUP_MESSAGE.signature);

                var result = handler.encryptTo('Hello!', 'you456789xw');
                assert.strictEqual(btoa(result), btoa(FOLLOWUP_MESSAGE_BIN));
                assert.strictEqual(result.length, 105);
                assert.strictEqual(handler._keyEncryptionCount, 2);
            });

            it("rotate keys, no mocks", function() {
                var handler = new ns.ProtocolHandler('me3456789xw',
                    CU25519_PRIV_KEY, ED25519_PRIV_KEY, ED25519_PUB_KEY, 3);
                handler.senderKeys = [KEY];
                handler._sentKeyId = 0;
                handler._keyEncryptionCount = 3;
                sandbox.stub(window, 'u_handle', 'me3456789xw');
                sandbox.stub(window, 'u_privEd25519', ED25519_PRIV_KEY);
                sandbox.stub(window, 'u_pubEd25519', ED25519_PUB_KEY);
                sandbox.stub(window, 'u_privCu25519', CU25519_PRIV_KEY);
                sandbox.stub(window, 'pubCu25519', { 'you456789xw': CU25519_PUB_KEY });
                sandbox.stub(asmCrypto, 'getRandomValues', _copy(ROTATED_KEY));
                sandbox.stub(ns, '_symmetricEncryptMessage').returns(
                    { key: ROTATED_KEY, nonce: atob('71BrlkBJXmR5xRtM'),
                      ciphertext: atob('H78adfMY') });
                sandbox.stub(ns, '_signMessage').returns(ROTATION_MESSAGE.signature);

                var result = handler.encryptTo('Hello!', 'you456789xw');
                assert.strictEqual(btoa(result), btoa(ROTATION_MESSAGE_BIN));
                assert.strictEqual(result.length, 153);
                assert.strictEqual(handler.keyId, 1);
                assert.deepEqual(handler.senderKeys,
                    [KEY, ROTATED_KEY]);
                assert.strictEqual(handler._sentKeyId, 1);
                assert.strictEqual(handler._keyEncryptionCount, 1);
            });
        });

        describe('decryptFrom', function() {
            it("keyed message", function() {
                var handler = new ns.ProtocolHandler('me3456789xw',
                    CU25519_PRIV_KEY, ED25519_PRIV_KEY, ED25519_PUB_KEY);
                sandbox.stub(window, 'pubEd25519', { 'me3456789xw': ED25519_PUB_KEY });
                sandbox.stub(window, 'u_handle', 'you456789xw');
                sandbox.stub(ns, '_parseMessageContent').returns(INITIAL_MESSAGE);
                sandbox.stub(ns, '_verifyMessage').returns(true);
                sandbox.stub(handler, '_decryptKeysFrom').returns([KEY]);

                var result = handler.decryptFrom(INITIAL_MESSAGE_BIN, 'me3456789xw');
                assert.deepEqual(result, {
                    sender: 'me3456789xw',
                    type: 0,
                    payload: 'Hello!'
                });
                assert.strictEqual(ns._parseMessageContent.callCount, 1);
                assert.strictEqual(ns._verifyMessage.callCount, 1);
                assert.strictEqual(handler._decryptKeysFrom.callCount, 1);
                assert.deepEqual(handler.participantKeys, { 'me3456789xw': { 0: KEY } });
            });

            it("bad parsing", function() {
                sandbox.stub(ns._logger, '_log');
                var handler = new ns.ProtocolHandler('me3456789xw',
                    CU25519_PRIV_KEY, ED25519_PRIV_KEY, ED25519_PUB_KEY);
                sandbox.stub(window, 'pubEd25519', { 'me3456789xw': ED25519_PUB_KEY });
                sandbox.stub(ns, '_parseMessageContent').returns(false);

                var result = handler.decryptFrom(INITIAL_MESSAGE_BIN, 'me3456789xw');
                assert.strictEqual(result, false);
                assert.strictEqual(ns._parseMessageContent.callCount, 1);
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'Incoming message not usable.');
            });

            it("bad protocol version", function() {
                sandbox.stub(ns._logger, '_log');
                var parsedMessage = testutils.clone(INITIAL_MESSAGE);
                parsedMessage.protocolVersion = 254;
                sandbox.stub(ns, '_parseMessageContent').returns(parsedMessage);
                var handler = new ns.ProtocolHandler('me3456789xw',
                    CU25519_PRIV_KEY, ED25519_PRIV_KEY, ED25519_PUB_KEY);

                var result = handler.decryptFrom(INITIAL_MESSAGE_BIN, 'me3456789xw');
                assert.strictEqual(result, false);
                assert.strictEqual(ns._parseMessageContent.callCount, 1);
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'Message not compatible with current protocol version.');
            });

            it("bad signature", function() {
                sandbox.stub(ns._logger, '_log');
                var handler = new ns.ProtocolHandler('me3456789xw',
                    CU25519_PRIV_KEY, ED25519_PRIV_KEY, ED25519_PUB_KEY);
                sandbox.stub(window, 'pubEd25519', { 'me3456789xw': ED25519_PUB_KEY });
                sandbox.stub(window, 'u_handle', 'you456789xw');
                sandbox.stub(ns, '_parseMessageContent').returns(INITIAL_MESSAGE);
                sandbox.stub(ns, '_verifyMessage').returns(false);

                var result = handler.decryptFrom(INITIAL_MESSAGE_BIN, 'me3456789xw');
                assert.strictEqual(result, false);
                assert.strictEqual(ns._parseMessageContent.callCount, 1);
                assert.strictEqual(ns._verifyMessage.callCount, 1);
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'Message signature invalid.');
            });

            it("followup message", function() {
                var handler = new ns.ProtocolHandler('me3456789xw',
                    CU25519_PRIV_KEY, ED25519_PRIV_KEY, ED25519_PUB_KEY);
                handler.participantKeys = { 'me3456789xw': { 0: KEY } };
                sandbox.stub(window, 'pubEd25519', { 'me3456789xw': ED25519_PUB_KEY });
                sandbox.stub(window, 'u_handle', 'you456789xw');
                sandbox.stub(ns, '_parseMessageContent').returns(FOLLOWUP_MESSAGE);
                sandbox.stub(ns, '_verifyMessage').returns(true);

                var result = handler.decryptFrom(INITIAL_MESSAGE_BIN, 'me3456789xw');
                assert.deepEqual(result, {
                    sender: 'me3456789xw',
                    type: 1,
                    payload: 'Hello!'
                });
                assert.strictEqual(ns._parseMessageContent.callCount, 1);
                assert.strictEqual(ns._verifyMessage.callCount, 1);
            });

            it("followup message, missing sender key", function() {
                sandbox.stub(ns._logger, '_log');
                var handler = new ns.ProtocolHandler('me3456789xw',
                    CU25519_PRIV_KEY, ED25519_PRIV_KEY, ED25519_PUB_KEY);
                sandbox.stub(window, 'pubEd25519', { 'me3456789xw': ED25519_PUB_KEY });
                sandbox.stub(window, 'u_handle', 'you456789xw');
                sandbox.stub(ns, '_parseMessageContent').returns(FOLLOWUP_MESSAGE);
                sandbox.stub(ns, '_verifyMessage').returns(true);

                var result = handler.decryptFrom(INITIAL_MESSAGE_BIN, 'me3456789xw');
                assert.deepEqual(result, false);
                assert.strictEqual(ns._parseMessageContent.callCount, 1);
                assert.strictEqual(ns._verifyMessage.callCount, 1);
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'Encryption key for message from me3456789xw with ID 0 unavailable.');
            });

            it("rotation message, old and new sender key", function() {
                var handler = new ns.ProtocolHandler('me3456789xw',
                    CU25519_PRIV_KEY, ED25519_PRIV_KEY, ED25519_PUB_KEY);
                sandbox.stub(window, 'pubEd25519', { 'me3456789xw': ED25519_PUB_KEY });
                sandbox.stub(window, 'u_handle', 'you456789xw');
                sandbox.stub(ns, '_parseMessageContent').returns(ROTATION_MESSAGE);
                sandbox.stub(ns, '_verifyMessage').returns(true);
                sandbox.stub(handler, '_decryptKeysFrom').returns([ROTATED_KEY, KEY]);
                var result = handler.decryptFrom(ROTATION_MESSAGE_BIN, 'me3456789xw');
                assert.deepEqual(result, {
                    sender: 'me3456789xw',
                    type: 0,
                    payload: 'Hello!'
                });
                assert.strictEqual(ns._parseMessageContent.callCount, 1);
                assert.strictEqual(ns._verifyMessage.callCount, 1);
                assert.strictEqual(handler._decryptKeysFrom.callCount, 1);
                assert.deepEqual(handler.participantKeys,
                    { 'me3456789xw': { 0: KEY, 1: ROTATED_KEY } });
            });
        });
    });
});
