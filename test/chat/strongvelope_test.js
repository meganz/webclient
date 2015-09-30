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
        type: 0,
        nonce: atob('71BrlkBJXmR5xRtM'),
        recipients: ['you456789xw'],
        keys: [atob('yJrGOPeYvAg4iTeYqW7New==')],
        keyId: 0,
        payload: atob('67lptSuY')
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
        describe('_computeSymmetricKey', function() {
            it("normal operation", function() {
                sandbox.stub(window, 'pubCu25519', { 'you456789xw': 'your key' });
                sandbox.stub(asmCrypto, 'string_to_bytes', _echo);
                sandbox.stub(nacl, 'scalarMult').returns('shared secret');
                sandbox.stub(asmCrypto, 'bytes_to_string', _echo);
                sandbox.stub(asmCrypto.SHA256, 'bytes', _echo);

                var result = ns._computeSymmetricKey('you456789xw');
                assert.strictEqual(result, 'shared secret');
                assert.strictEqual(asmCrypto.string_to_bytes.callCount, 2);
                assert.strictEqual(nacl.scalarMult.callCount, 1);
                assert.strictEqual(asmCrypto.SHA256.bytes.callCount, 1);
                assert.strictEqual(asmCrypto.bytes_to_string.callCount, 1);
            });

            it("no mocks", function() {
                sandbox.stub(window, 'pubCu25519', { 'you456789xw': CU25519_PUB_KEY });
                sandbox.stub(window, 'u_privCu25519', CU25519_PRIV_KEY);
                var result = ns._computeSymmetricKey('you456789xw');
                assert.strictEqual(btoa(result),
                    'X2O2IQoAqzPvr2F4XWjCuwP17tYHoJwB5KhyhlHb/mM=');
            });

            it("missing recipient pubkey", function() {
                sandbox.stub(ns._logger, '_log');
                sandbox.stub(window, 'pubCu25519', {});
                assert.throws(function() { ns._computeSymmetricKey('you456789xw'); },
                              'No cached chat key for user!');
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'No cached chat key for user: you456789xw');
            });
        });

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

        describe('_encryptKeysTo', function() {
            it("single key", function() {
                sandbox.stub(asmCrypto, 'string_to_bytes', _echo);
                sandbox.stub(window, 'base64urldecode', _echo);
                var iv = { subarray: sinon.stub().returns('IV') };
                sandbox.stub(asmCrypto.SHA256, 'bytes').returns(iv);
                sandbox.stub(ns, '_computeSymmetricKey').returns(
                    { substring: sinon.stub().returns('the key') });
                sandbox.stub(asmCrypto.AES_CBC, 'encrypt').returns('ciphertext');
                sandbox.stub(asmCrypto, 'bytes_to_string', _echo);

                var result = ns._encryptKeysTo(['a key'], 'gooniegoogoo', 'you456789xw');
                assert.strictEqual(result, 'ciphertext');
                assert.strictEqual(asmCrypto.AES_CBC.encrypt.callCount, 1);
                assert.deepEqual(asmCrypto.AES_CBC.encrypt.args[0],
                    ['a key', 'the key', false, 'IV']);
            });

            it("two keys", function() {
                sandbox.stub(asmCrypto, 'string_to_bytes', _echo);
                sandbox.stub(window, 'base64urldecode', _echo);
                var iv = { subarray: sinon.stub().returns('IV') };
                sandbox.stub(asmCrypto.SHA256, 'bytes').returns(iv);
                sandbox.stub(ns, '_computeSymmetricKey').returns(
                    { substring: sinon.stub().returns('the key') });
                sandbox.stub(asmCrypto.AES_CBC, 'encrypt').returns('ciphertext');
                sandbox.stub(asmCrypto, 'bytes_to_string', _echo);

                var result = ns._encryptKeysTo(['key one', 'key two'], 'gooniegoogoo', 'you456789xw');
                assert.strictEqual(result, 'ciphertext');
                assert.strictEqual(asmCrypto.AES_CBC.encrypt.callCount, 1);
                assert.deepEqual(asmCrypto.AES_CBC.encrypt.args[0],
                    ['key onekey two', 'the key', false, 'IV']);
            });

            it("no mocks, one key", function() {
                sandbox.stub(window, 'u_privCu25519', CU25519_PRIV_KEY);
                sandbox.stub(window, 'pubCu25519', { 'you456789xw': CU25519_PUB_KEY });
                sandbox.stub(ns, '_computeSymmetricKey').returns(
                    atob('X2O2IQoAqzPvr2F4XWjCuwP17tYHoJwB5KhyhlHb/mM='));

                var result = ns._encryptKeysTo([KEY], NONCE, 'you456789xw');
                assert.strictEqual(btoa(result), 'cYNQ28YygmVqaPddZsjlXA==');
            });
        });

        describe('_decryptKeysFrom', function() {
            it("single key", function() {
                sandbox.stub(asmCrypto, 'string_to_bytes', _echo);
                sandbox.stub(window, 'base64urldecode', _echo);
                var iv = { subarray: sinon.stub().returns('IV') };
                sandbox.stub(asmCrypto.SHA256, 'bytes').returns(iv);
                sandbox.stub(ns, '_computeSymmetricKey').returns(
                    { substring: sinon.stub().returns('the key') });
                sandbox.stub(asmCrypto.AES_CBC, 'decrypt').returns('a key67890123456');
                sandbox.stub(asmCrypto, 'bytes_to_string', _echo);

                var result = ns._decryptKeysFrom('an encrypted key', 'gooniegoogoo', 'you456789xw');
                assert.deepEqual(result, ['a key67890123456']);
                assert.strictEqual(asmCrypto.AES_CBC.decrypt.callCount, 1);
                assert.deepEqual(asmCrypto.AES_CBC.decrypt.args[0],
                    ['an encrypted key', 'the key', false, 'IV']);
            });

            it("two keys", function() {
                sandbox.stub(asmCrypto, 'string_to_bytes', _echo);
                sandbox.stub(window, 'base64urldecode', _echo);
                var iv = { subarray: sinon.stub().returns('IV') };
                sandbox.stub(asmCrypto.SHA256, 'bytes').returns(iv);
                sandbox.stub(ns, '_computeSymmetricKey').returns(
                    { substring: sinon.stub().returns('the key') });
                sandbox.stub(asmCrypto.AES_CBC, 'decrypt').returns('a key67890123456another key23456');
                sandbox.stub(asmCrypto, 'bytes_to_string', _echo);

                var result = ns._decryptKeysFrom('two encrypted keys', 'gooniegoogoo', 'you456789xw');
                assert.deepEqual(result, ['a key67890123456', 'another key23456']);
                assert.strictEqual(asmCrypto.AES_CBC.decrypt.callCount, 1);
                assert.deepEqual(asmCrypto.AES_CBC.decrypt.args[0],
                    ['two encrypted keys', 'the key', false, 'IV']);
            });

            it("no mocks, one key", function() {
                sandbox.stub(window, 'u_handle', 'you456789xw');
                sandbox.stub(window, 'u_privCu25519', CU25519_PRIV_KEY);
                sandbox.stub(ns, '_computeSymmetricKey').returns(
                    atob('X2O2IQoAqzPvr2F4XWjCuwP17tYHoJwB5KhyhlHb/mM='));

                var result = ns._decryptKeysFrom(atob('cYNQ28YygmVqaPddZsjlXA=='), NONCE, '');
                assert.deepEqual(result, [KEY]);
            });
        });

        describe('_parseMessageContent', function() {
            it("good message", function() {
                var result = ns._parseMessageContent(INITIAL_MESSAGE_BIN);
                assert.deepEqual(result, INITIAL_MESSAGE);
            });
        });
    });

    describe('ProtocolHandler class', function() {
        describe('encryptTo', function() {
            it("normal operation", function() {
                var protocolHandler = new ns.ProtocolHandler();
                protocolHandler.senderKeys = ['sender key'];
                sandbox.stub(window, 'u_handle', 'me3456789xw');
                sandbox.stub(window, 'u_privEd25519', 'private Ed');
                sandbox.stub(window, 'u_pubEd25519', 'public Ed');
                sandbox.stub(window, 'base64urldecode', _echo);
                sandbox.stub(ns, '_symmetricEncryptMessage').returns(
                    { key: 'sender key', nonce: 'gooniegoogoo', ciphertext: 'ciphertext' });
                sandbox.stub(ns, '_encryptKeysTo').returns(atob('PqG4NXmumTUS'));
                sandbox.stub(ns, '_signMessage').returns('squiggle');
                sandbox.stub(tlvstore, 'toTlvRecord');
                tlvstore.toTlvRecord.withArgs('\u0001').returns('|squiggle');
                tlvstore.toTlvRecord.withArgs('\u0002').returns('|0x00');
                tlvstore.toTlvRecord.withArgs('\u0003').returns('|gooniegoogoo');
                tlvstore.toTlvRecord.withArgs('\u0004').returns('|you456789xw');
                tlvstore.toTlvRecord.withArgs('\u0005').returns('|encrypted key');
                tlvstore.toTlvRecord.withArgs('\u0006').returns('|0');
                tlvstore.toTlvRecord.withArgs('\u0007').returns('|ciphertext');

                var result = protocolHandler.encryptTo('Hello!', 'you456789xw');
                assert.strictEqual(result,
                    '\u0000|squiggle|0x00|gooniegoogoo|you456789xw|encrypted key|0|ciphertext');
                assert.strictEqual(ns._symmetricEncryptMessage.callCount, 1);
                assert.strictEqual(ns._encryptKeysTo.callCount, 1);
                assert.strictEqual(tlvstore.toTlvRecord.callCount, 7);
                assert.strictEqual(ns._signMessage.callCount, 1);
            });

            it("no mocks", function() {
                var protocolHandler = new ns.ProtocolHandler();
                protocolHandler.senderKeys = [KEY];
                sandbox.stub(window, 'u_handle', 'me3456789xw');
                sandbox.stub(window, 'u_privEd25519', ED25519_PRIV_KEY);
                sandbox.stub(window, 'u_pubEd25519', ED25519_PUB_KEY);
                sandbox.stub(window, 'u_privCu25519', CU25519_PRIV_KEY);
                sandbox.stub(window, 'pubCu25519', { 'you456789xw': CU25519_PUB_KEY });
                sandbox.stub(ns, '_symmetricEncryptMessage').returns(
                    { key: KEY, nonce: atob('71BrlkBJXmR5xRtM'),
                      ciphertext: atob('67lptSuY') });
                sandbox.stub(ns, '_encryptKeysTo').returns(atob('yJrGOPeYvAg4iTeYqW7New=='));
                sandbox.stub(ns, '_signMessage').returns(INITIAL_MESSAGE.signature);

                var result = protocolHandler.encryptTo('Hello!', 'you456789xw');
                assert.strictEqual(btoa(result), btoa(INITIAL_MESSAGE_BIN));
            });
        });

        describe('decrypt', function() {
            it("normal operation", function() {
                var protocolHandler = new ns.ProtocolHandler();
                sandbox.stub(window, 'pubEd25519', { 'me3456789xw': ED25519_PUB_KEY });
                sandbox.stub(window, 'u_handle', 'you456789xw');
                sandbox.stub(ns, '_parseMessageContent').returns(INITIAL_MESSAGE);
                sandbox.stub(ns, '_verifyMessage').returns(true);
                sandbox.stub(ns, '_decryptKeysFrom').returns([KEY]);

                var result = protocolHandler.decrypt(INITIAL_MESSAGE_BIN, 'me3456789xw');
                assert.deepEqual(result, {
                    sender: 'me3456789xw',
                    type: 0,
                    payload: 'Hello!'
                });
                assert.strictEqual(ns._parseMessageContent.callCount, 1);
                assert.strictEqual(ns._verifyMessage.callCount, 1);
                assert.strictEqual(ns._decryptKeysFrom.callCount, 1);
                assert.deepEqual(protocolHandler.participantKeys, { 'me3456789xw': { 0: KEY } });
            });

            it("bad parsing", function() {
                sandbox.stub(ns._logger, '_log');
                var protocolHandler = new ns.ProtocolHandler();
                sandbox.stub(window, 'pubEd25519', { 'me3456789xw': ED25519_PUB_KEY });
                sandbox.stub(ns, '_parseMessageContent').returns(false);

                var result = protocolHandler.decrypt(INITIAL_MESSAGE_BIN, 'me3456789xw');
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
                var protocolHandler = new ns.ProtocolHandler();

                var result = protocolHandler.decrypt(INITIAL_MESSAGE_BIN, 'me3456789xw');
                assert.strictEqual(result, false);
                assert.strictEqual(ns._parseMessageContent.callCount, 1);
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'Message not compatible with current protocol version.');
            });

            it("bad signature", function() {
                sandbox.stub(ns._logger, '_log');
                var protocolHandler = new ns.ProtocolHandler();
                sandbox.stub(window, 'pubEd25519', { 'me3456789xw': ED25519_PUB_KEY });
                sandbox.stub(window, 'u_handle', 'you456789xw');
                sandbox.stub(ns, '_parseMessageContent').returns(INITIAL_MESSAGE);
                sandbox.stub(ns, '_verifyMessage').returns(false);

                var result = protocolHandler.decrypt(INITIAL_MESSAGE_BIN, 'me3456789xw');
                assert.strictEqual(result, false);
                assert.strictEqual(ns._parseMessageContent.callCount, 1);
                assert.strictEqual(ns._verifyMessage.callCount, 1);
                assert.strictEqual(ns._logger._log.args[0][1][0],
                                   'Message signature invalid.');
            });
        });
    });
});
