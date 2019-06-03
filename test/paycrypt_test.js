/**
 * @fileOverview
 * paycrypt operations unit tests.
 */

describe("paycrypt unit test", function() {
    "use strict";

    var ns = paycrypt;

    var assert = chai.assert;

    // Some test data.
    var PUBKEY = [
        base64urldecode('plp2MuzOXah-7Iaq4-IxEX4YQn86FObg8nAKH9aPCch7vxeO29GgA'
                        + 'fSoSrCFSr_dJ27nmu8BrlrHNKcZa0eZCjp6jBHCEKy8rBbqUpXq'
                        + 'sIpSIKeTFAb5D03bJ9tkHPUJXcJqf3GwTVX061FRUon79EIw525'
                        + 'e7fbCxeRoBTH2IVqjMQK9w99O9nEBfXk2wywmzw-0awr1Ik3aiN'
                        + 'W0-_Xv9fO2EswnY3lav7WW-WJ4Szx5YDUH35hSY-NYrUsKaqxGD'
                        + 'fHuZCL7BCDaR4i7VyCAQZ5XejWbueVN-7B3mJJ-TwenDIt2RJvd'
                        + 'LiAezE-Qsh2C2hGyfUZMyTUXMSQAtsOApw'),
        "\u0000\u0001\u0000\u0001", 2048
    ];
    var GORT_SAYS = 'AQChmTuKAGix7MV4A4aOt1fnD/TcN2owe9QaosrlQlAfyQvjFCsyAhfLR'
        + 'TzyFaZiwYNhk71kNfwv6W1r5OaCm3KVv2uR0oENMe5tqeYbxrupJOBAcWUnKHDFwa/k'
        + 'wvbFsX96Xmx2V6CIYkD8GvdfBitWEUuy2uDVUprrl3rcSSHDNyU3RkbCgJsJe68Wh+G'
        + 'dHzh2DN+n2wu21VfayyYYkPwW9hLuCV1cG7IduaT6KD8DUeUAcXZ/08IEkteexP5O0x'
        + 'NG43uzXqQXxFsLn2GkpDaD7ZwgmKbXnbEm8TXb9HwJLDwIPHCYCGBABSrDUGqb7QEHY'
        + 'da6WpNz7/VXiJo/fwVb';
    var CONTENT = '{"first_name": "First", "last_name": "Last",'
                + ' "card_number": "4532646653175959",'
                + ' "expiry_date_month": "10", "expiry_date_year": "2020",'
                + ' "cv2": "123", "address1": "120 Albert St",'
                + ' "address2": "Auckland Central", "city": "Auckland",'
                + ' "province": "Auckland", "postal_code": "1010",'
                + ' "country_code": "NZ"}';
    var IV = '7XS3jX8CrWh6gpZIavQamA==';
    var KEYS_DUMMY = {
        length: 48,
        keys: atob('IcfMNKnMLJNJAH+XPMDSh6wocLQEwmqfglzvihsWxCmSy/PJVX3WT2X2XHZzLY/K'),
        encryption: atob('IcfMNKnMLJNJAH+XPMDShw=='),
        hmac: atob('rChwtATCap+CXO+KGxbEKZLL88lVfdZPZfZcdnMtj8o='),
        iv: atob(IV)
    };
    var HMAC = 'C7WRAdge50wzsAMqdM2/BVhntsP/OUYxaDMkPtRvewg=';
    var CIPHER_BYTES = 'Btu6B6YxQV1oeMRij4Fn0Que9FfIE1LJyYdacVbNBM1bS+GZAtwQh5'
        + 'ZTtsakK6v/mMZGiQ3egRFSTNHzQU0jVa0GYZJ087NhlKlGtVO6PvBKmTkxpcnZpy1im'
        + 'S6uzKLccQU+IxKm1XnBF7gB7McbXDxb+j/s3+sjMJo/npDBOR3hUePGSyN+jmed7mvO'
        + 'K/fNY8DHqodpdVk7vy2PL8/iAY2SefttWGCD8DwiyxXx42KAjUaRHiYJqgdkZheF/Rp'
        + '9l+KxgW8krDdkHsQu+nqeciezk5iA5OlylUmCfc57AKztBElyd4KIfz4B7kprmTeiiH'
        + '8lhTCq7xZ64GdABzwfQghkf+fM9NJUD9bHfbTYfnnDRSvDrdJtD1gRVrkxnHNNVKhd6'
        + 'rtKToreM2bFhfUpcw==';
    var CRYPT_PAYLOAD = btoa(atob(HMAC) + atob(IV) + atob(CIPHER_BYTES));
    var CRYPT_KEYS_BYTES = 'AQAnxRfeJg5um9roPi2R/Pua+21zQDu6gOZurF4yoWUZAB+EJB'
        + 'YrpQKkoF1CjnFWaflyteI1yqmg+foeo9B/zzq9mnef99hTJAtS73SaX8HVilpEvYHK0'
        + 'KnGS8C6yTOxb9rM2NzF5GcbocIg+VYA1OXzPTnYC7xJ/4HzybSDmhe1NKvxcrJqQis0'
        + 'kfLquhFJ8itPuBtH2P7In9rmCxAPlFkdd//WUhJujWVaGPAmTXC6ISIGATfOnyUL9/T'
        + 'AlUK6pA+9vILbtbzCopWGRsjNqONr/zZUuisBTTCU6QjjJPEGAdDQVB0qQP9a47KjoC'
        + '4FOuTYKGvOiGTyuv3+gt+q2id3';

    afterEach(function() {
        mStub.restore();
    });

    describe('user attributes', function() {
        describe('_generateKeys()', function() {
            it("generate some keys", function() {
                var keys = ns._generateKeys();
                assert.strictEqual(keys.length, 48);
                assert.lengthOf(keys.keys, 48);
                assert.lengthOf(keys.encryption, 16);
                assert.lengthOf(keys.hmac, 32);
                assert.lengthOf(keys.iv, 16);
            });
        });

        describe('_encryptPayload()', function() {
            it("encryption keys", function() {
                mStub(asmCrypto.HMAC_SHA256, 'base64').returns(HMAC);
                mStub(asmCrypto.AES_CBC, 'encrypt').returns(asmCrypto.string_to_bytes(atob(CIPHER_BYTES)));
                var result = ns._encryptPayload(CONTENT, KEYS_DUMMY);
                assert.strictEqual(asmCrypto.AES_CBC.encrypt.callCount, 1);
                assert.strictEqual(asmCrypto.HMAC_SHA256.base64.callCount, 1);
                assert.strictEqual(btoa(result), CRYPT_PAYLOAD);
            });
        });

        describe('_rsaEncryptKeys()', function() {
            it("a movie quote", function() {
                mStub(asmCrypto.RSA_RAW, 'encrypt')
                    .returns(asmCrypto.string_to_bytes(atob(GORT_SAYS).substring(2)));

                var result = ns._rsaEncryptKeys('Klaatu barada nikto.', PUBKEY);
                assert.strictEqual(asmCrypto.RSA_RAW.encrypt.callCount, 1);
                assert.strictEqual(btoa(result), GORT_SAYS);
            });

            it("encryption keys", function() {
                mStub(asmCrypto.RSA_RAW, 'encrypt')
                    .returns(asmCrypto.string_to_bytes(atob(CRYPT_KEYS_BYTES).substring(2)));

                var result = ns._rsaEncryptKeys(KEYS_DUMMY.keys, PUBKEY);
                assert.strictEqual(asmCrypto.RSA_RAW.encrypt.callCount, 1);
                assert.strictEqual(btoa(result), CRYPT_KEYS_BYTES);
            });
        });

        describe('hybridEncrypt()', function() {
            it("a movie quote", function() {
                mStub(ns, '_generateKeys').returns(KEYS_DUMMY);
                mStub(ns, '_encryptPayload').returns('foo');
                mStub(ns, '_rsaEncryptKeys').returns('bar');
                var result = ns.hybridEncrypt('Klaatu barada nikto.', PUBKEY);
                assert.strictEqual(ns._generateKeys.callCount, 1);
                assert.strictEqual(ns._encryptPayload.callCount, 1);
                assert.strictEqual(ns._rsaEncryptKeys.callCount, 1);
                assert.strictEqual(result, 'barfoo');
            });

            it("encryption keys", function() {
                mStub(ns, '_generateKeys').returns(KEYS_DUMMY);
                mStub(ns, '_encryptPayload').returns(atob(CRYPT_PAYLOAD));
                mStub(ns, '_rsaEncryptKeys').returns(atob(CRYPT_KEYS_BYTES));
                var result = ns.hybridEncrypt(CONTENT, PUBKEY);
                assert.strictEqual(ns._generateKeys.callCount, 1);
                assert.strictEqual(ns._encryptPayload.callCount, 1);
                assert.strictEqual(ns._rsaEncryptKeys.callCount, 1);
                assert.strictEqual(btoa(result), btoa(atob(CRYPT_KEYS_BYTES) + atob(CRYPT_PAYLOAD)));
            });
        });
    });
});
