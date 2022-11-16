/**
 * @fileOverview
 * TLV store unit tests.
 */

describe("tlvstore unit test", function() {
    "use strict";
    var assert = chai.assert;
    var ns = tlvstore;

    // Some test data.
    var ED25519_PUB_KEY = atob('11qYAYKxCrfVS/7TyWQHOg7hcvPapiMlrwIaaPcHURo=');

    afterEach(function() {
        mStub.restore();
    });

    describe('asmcrypto library test', function() {
        it('AES-GCM test', function() {
            // This has hit us in the past as a bug, so let's check whether it works.
            var adataCases = [undefined, null, '', new Uint8Array()];
            var key = asmCrypto.string_to_bytes(atob('dGQhii+B7+eLLHRiOA690w=='));
            var nonce = asmCrypto.string_to_bytes(atob('R8q1njARXS7urWv3'));
            var plainText = atob('dGQhwoovwoHDr8OnwossdGI4DsK9w5M=');
            for (var i = 0; i < adataCases.length; i++) {
                var cipherText = asmCrypto.AES_GCM.encrypt(plainText, key, nonce, adataCases[i], 16);
                assert.strictEqual(asmCrypto.bytes_to_base64(cipherText),
                    'L3zqVYAOsRk7zMg2KsNTVShcad8TjIQ7umfsvia21QO0XTj8vaeR');
                var rePlain = asmCrypto.AES_GCM.decrypt(cipherText, key, nonce, adataCases[i], 16);
                assert.strictEqual(asmCrypto.bytes_to_string(rePlain), plainText);
            }
        });

        it('AES-CCM test', function() {
            // This has hit us in the past as a bug, so let's check whether it works.
            var adataCases = [undefined, null, '', new Uint8Array()];
            var plainText = '42';
            var nonce = asmCrypto.hex_to_bytes('000102030405060708090a0b');
            var key = asmCrypto.hex_to_bytes('0f0e0d0c0b0a09080706050403020100');

            for (var i = 0; i < adataCases.length; i++) {
                var cipherText = asmCrypto.AES_CCM.encrypt(plainText, key, nonce, adataCases[i], 16);
                assert.strictEqual(asmCrypto.bytes_to_hex(cipherText),
                    '28be1ac7b43d8868869b9a45d3de436cd0cc');
                var rePlain = asmCrypto.AES_CCM.decrypt(cipherText, key, nonce, adataCases[i], 16);
                assert.strictEqual(asmCrypto.bytes_to_string(rePlain), plainText);
            }
        });
    });

    describe('TLV en-/decoding', function() {
        it("toTlvRecord", function() {
            var tests = [['foo', 'bar',
                          'foo\u0000\u0000\u0003bar'],
                         ['puEd255', ED25519_PUB_KEY,
                          'puEd255\u0000\u0000\u0020' + ED25519_PUB_KEY]
                        ];
            for (var i = 0; i < tests.length; i++) {
                var key = tests[i][0];
                var value = tests[i][1];
                var expected = tests[i][2];
                assert.strictEqual(ns.toTlvRecord(key, value), expected);
            }
        });

        it("containerToTlvRecords", function() {
            var tests = [{'foo': 'bar',
                          'puEd255': ED25519_PUB_KEY},
                         {'': 'fortytwo'}];
            var expected = ['foo\u0000\u0000\u0003bar'
                            + 'puEd255\u0000\u0000\u0020' + ED25519_PUB_KEY,
                            '\u0000\u0000\u0008fortytwo'];
            for (var i = 0; i < tests.length; i++) {
                assert.strictEqual(ns.containerToTlvRecords(tests[i]), expected[i]);
            }
        });

        it('splitSingleTlvRecord', function() {
            var tests = 'foo\u0000\u0000\u0003bar'
                      + 'puEd255\u0000\u0000\u0020' + ED25519_PUB_KEY;
            var result = ns.splitSingleTlvRecord(tests);
            assert.strictEqual(result.record[0], 'foo');
            assert.strictEqual(result.record[1], 'bar');
            assert.strictEqual(result.rest, 'puEd255\u0000\u0000\u0020' + ED25519_PUB_KEY);
        });

        it('tlvRecordsToContainer', function() {
            var tests = ['foo\u0000\u0000\u0003bar'
                         + 'puEd255\u0000\u0000\u0020' + ED25519_PUB_KEY,
                         '\u0000\u0000\u0008fortytwo',
                         atob('Zm9vAAADYmFycHVFZDI1NQAAINdamAGCsQq31Uv+08lkBzoO4XLz2qYjJa8CGmj3B1Ea')];
            var expected = [{'foo': 'bar',
                             'puEd255': ED25519_PUB_KEY},
                            {'': 'fortytwo'},
                            {'foo': 'bar', 'puEd255': ED25519_PUB_KEY}];
            for (var i = 0; i < tests.length; i++) {
                assert.deepEqual(ns.tlvRecordsToContainer(tests[i]), expected[i]);
            }
        });

        it('tlvRecordsToContainer, malformed TLV (UTF-8 encoded)', function() {
            mStub(ns._logger, '_log');
            var test = atob('Zm9vAAADYmFycHVFZDI1NQAAIMOXWsKYAcKCwrEKwrfDlUvDvsOTw4lkBzoOw6Fyw7PDmsKmIyXCrwIaaMO3B1Ea');
            assert.strictEqual(ns.tlvRecordsToContainer(test), false);
            assert.strictEqual(ns._logger._log.args[0][0],
                               'Inconsistent TLV decoding. Maybe content UTF-8 encoded?');
        });

        it('tlvRecordsToContainer, UTF-8 legacy decoding', function() {
            mStub(ns._logger, '_log');
            var test = atob('Zm9vAAADYmFycHVFZDI1NQAAIMOXWsKYAcKCwrEKwrfDlUvDvsOTw4lkBzoOw6Fyw7PDmsKmIyXCrwIaaMO3B1Ea');
            var expected = {'foo': 'bar', 'puEd255': ED25519_PUB_KEY};
            assert.deepEqual(ns.tlvRecordsToContainer(test, true), expected);
            assert.strictEqual(ns._logger._log.args[0][0], 'Inconsistent TLV decoding. Maybe content UTF-8 encoded?');
            assert.strictEqual(ns._logger._log.args[1][0], 'Retrying to decode TLV container legacy style ...');
        });

        it("encrypt/decrypt UTF8-aware payloads per record, not at container)", function() {
            const key = asmCrypto.bytes_to_string(asmCrypto.hex_to_bytes('0f0e0d0c0b0a09080706050403020100'));
            const keya = [252579084, 185207048, 117835012, 50462976];

            const tests = [
                '42', "Don't panic!", 'Flying Spaghetti Monster', "Ph'nglui R'lyeh wgah'ñagl.",
                'Tēnā koe', 'Hänsel & Gretel', 'Слартибартфаст', 'c\u0327a va', 'Boo \u{1f4a3}!'
            ];
            const ciphers = [
                'EGbyV29oLIf__3DrXdd5XKEvksEYe6QNglUNelj5cU6v8A',
                'EGbyMW8_LIf__xjrXRqJkiheoE7zxWHzPtn_MDoX62aaC80WUP3rEEQt43s',
                'EGfyV28OLIf__yfrXbrp3LV-bUW2ZqQDEZKtVOnhbN_LQTNHE_RNkFc8V-kZVuFCnjmFksIgXxY',
                'EGXyMG9ZLIf__ynrXY0WMvQyKJHY2kO9QKYkjCOuGVLLZZd5SCjJhdz-qNDOAGWmN_fx90MkMjoy4u0',
                'EGbyVW9pLIf__3DrXZhASAG_Z-JwUm51uTFY9zNfVsMYSA_IbIkbDZsh',
                'EGLyM288LIf__xnrXRNJz9dwXkYIBHTGvy2y9CwwKW_hdtWDnklFa5n7t6HPewzI',
                'EGfyUW8PLIf__yXrXfehQJiMU0K-1J_YNYQk1THtjO73lOcqweExcylsNJWAxOL1qziK1EcebB0aKeiR',
                'EGHyNm9eLIf__yrrXRqCWWTywMOCtqvnUQSGrt1tkcAN3_4WIcyL',
                'EGbyV29oLIf__3TrXf6Pgf2NqYIPNST5WQRTDPjCKccCRv4Y1u08RYI'
            ];
            const nonce = new Uint8Array([110, 242, 49, 111, 63, 44, 135, 255, 255, 28, 235, 93]);
            mStub(mega, 'getRandomValues').returns(nonce);

            for (let i = tests.length; i--;) {
                nonce[0] ^= i;
                nonce[2] ^= nonce[0];
                nonce[4] ^= nonce[2];
                nonce[9] ^= nonce[4];

                const cipher = ns.encrypt(tests[i], 0, key);
                assert.strictEqual(cipher, ciphers[i]);

                const plain = ns.decrypt(cipher, {}, keya);
                assert.strictEqual(tests[i], plain);
            }

            mega.getRandomValues.restore();
        });

        it('handle overflowed records', () => {
            mStub(window, 'eventlog');
            mStub(ns._logger, 'warn');
            mStub(ns._logger, 'error');

            const data7e4 = Array(7e4).join('.');
            const record = ns.toTlvRecord('', data7e4);
            const container = ns.tlvRecordsToContainer(record);

            assert.strictEqual(record, `\x00\xff\xff${data7e4}`);

            assert.strictEqual(ns._logger.warn.args[0][0], 'TLV-record  did overflow.');
            assert.strictEqual(ns._logger.warn.args[1][0], 'tlv-record overflow fix-up.');
            assert.deepEqual(ns._logger.warn.args[1][1], [record]);
            assert.strictEqual(container[''], record.substr(3));

            assert.strictEqual(ns.containerToTlvRecords(container), record);

            assert.strictEqual(ns.containerToTlvRecords({...container, foo: 'bar'}), false);
            assert.strictEqual(ns._logger.error.args[0][0], 'Cannot store foo, previous element did overflow.');

            assert.strictEqual(window.eventlog.callCount, 5);
            assert.deepEqual(window.eventlog.args[0], [99772, '[1,1,0,69999,0]', true]);
            assert.deepEqual(window.eventlog.args[1], [99772, '[1,7,70002]', true]);
            assert.deepEqual(window.eventlog.args[4], [99772, '[1,3,70002]']);
        });
    });

    describe('attribute en-/decryption', function() {
        var clearVectors = ['', '42', "Don't panic!", 'Flying Spaghetti Monster',
                            "Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn",
                            'Tēnā koe', 'Hänsel & Gretel', 'Слартибартфаст',
                            'foo\u0000\u0000\u0003bar' + 'puEd255\u0000\u0000\u0020' + ED25519_PUB_KEY];
        var cipherVectors = [
            'AAABAgMEBQYHCAkKC436kEyuBNzuW6p4fd5WoW0=',
            'AAABAgMEBQYHCAkKCyi+Gse0PYhohpuaRdPeQ2zQzA==',
            'AAABAgMEBQYHCAkKC1jj/Y+ZHFFbO3UUng4na9OXvdc4jSVHIfN7ZqY=',
            'AAABAgMEBQYHCAkKC1rg6sGDWwFpJX0Q14jMKRU1EqGtmyxNLrct68sME75wRH6Vz'
            + '8mvGDc=',
            'AAABAgMEBQYHCAkKC0zktMaKUFRTdXEQ05qfMx1zN+6AnDBdMJZPYx7hPtIuU1e9B'
            + '+eiG4Z5jlqrYiW3FTqKXuJPuLb4jgJTeK0FsYowMw==',
            'AAABAgMEBQYHCAkKC0hIAMYpvQFROnlMxVaEuPiXMq/Y4m8BUAgw',
            'AAABAgMEBQYHCAkKC1RPN8aeWU0aczwwzYjMOBC6E2laTFsBrGOaoCAFb928',
            'AAABAgMEBQYHCAkKC8wtQxM9jPC6hJ6nBz0JjczE3x9BOdz47C+7ks4K2Wb9lPQIB'
            + 'LG4INdpu990',
            'AAABAgMEBQYHCAkKC3rj/KjtP0NbJ2wC+omKaEkVX+4AfwLqxP/4wY53WGn8+OKBo'
            + 'zgJryuRjTGxCo5iBp5XKqex2bwO2Dz7BTgZ+/w+iDFjLEWwz/gvCRBqTQDSvEs=',
            'AQABAgMEBQYHCAl2SvO7NJsA/pCOM/+ZGRLO',
            'AQABAgMEBQYHCAlsEidPV7tzJs/RkQ4e652Ipuc=',
            'AQABAgMEBQYHCAkcT6pYBDGA0fD0WxB4YOqtkAhkd2VnxJpePwdJ',
            'AQABAgMEBQYHCAkeTL0WHnbQ4+78X1lELSvB1nwQZCAI98SSw69pQGbXhP4kwoW5x0R1',
            'AQABAgMEBQYHCAkISOMRF32F2b7wX11WfjHJkFlfSScU59o0kzk7jy8GJ9g+DYAve'
            + 'PaaxtKi9hPgbbTkt2gAUoEyAsKvEWbizViIqag=',
            'AQABAgMEBQYHCAkM5FcRtJDQ2/H4Efh3pgp0imG3oK+nxrA3SA==',
            'AQABAgMEBQYHCAkQ42ARA3SckLi9f0NELTrExuPcws6HdbPNrB+JfereuA==',
            'AQABAgMEBQYHCAmIgRTEoKEhME8f6Inx6I8YJ7GuiIL4QgaNZ8jrKNLfo7kJ4yRAJ'
            + 'Q7lsIwegQ==',
            'AQABAgMEBQYHCAk+T6t/cBKS0eztTXRFa2qd9jFfycQmUC5dJJurGUm99XOLMSTw0'
            + '0I3LtHJ7HtLuKdAauFIGc5oCegTnlHVaAFIahH9Z65QV0iwi7YdUCAa/lYB',
            'AgABAgMEBQYHCAmJNz0zRRXZCQ==',
            'AgABAgMEBQYHCAlsEvCWxcq1JorR',
            'AgABAgMEBQYHCAkcT6pYBDGA0fD0WxDEk30ne8m70A==',
            'AgABAgMEBQYHCAkeTL0WHnbQ4+78X1lELSvB1nwQZCAI98QRPNxvXtb4mQ==',
            'AgABAgMEBQYHCAkISOMRF32F2b7wX11WfjHJkFlfSScU59o0kzk7jy8GJ9g+DYAve'
            + 'PaaxtKi9hPgbbTkt/LWvrZpzTEM',
            'AgABAgMEBQYHCAkM5FcRtJDQ2/H445cZBM9C5Ws=',
            'AgABAgMEBQYHCAkQ42ARA3SckLi9f0NELTrE+a13ciKmM6k=',
            'AgABAgMEBQYHCAmIgRTEoKEhME8f6Inx6I8YJ7GuiIL4QgaNZ8jrw5l9HNUXDPk=',
            'AgABAgMEBQYHCAk+T6t/cBKS0eztTXRFa2qd9jFfycQmUC5dJJurGUm99XOLMSTw0'
            + '0I3LtHJ7HtLuKdAauFIGc5oCegTnlHVaAFIahGfgp845h0GDQ==',
            'EAABAgMEBQYHCAkKCyR5GYxDe7o4vcjZLeE2R88=',
            'EAABAgMEBQYHCAkKC0DZNeoyJefrgM3ht5K2lluY0A==',
            'EAABAgMEBQYHCAkKCzCENPWqBdZ9iYHm/twECJ+lUZuGxZkFYjXgRtE=',
            'EAABAgMEBQYHCAkKCzKHI7uwQoZPl4nit9x/Mt9Mr4gkb0FCxq+seBkOHSeGM84Pu'
            + 'cK2llA=',
            'EAABAgMEBQYHCAkKCySDfby5SdN1x4Xis84sKNcKiscJaF1S2DCiQGp/SzpXJulMW'
            + 'wOUnJelELudQvU6qGtY4i3Jxz7Gm88naUOmk92ILw==',
            'EAABAgMEBQYHCAkKCyAvybwapIZ3iI0er7bxP99xaDI+YOvTSidV',
            'EAABAgMEBQYHCAkKCzwo/rytQMo8wcjCrdx/I9qEZOHPej2EFrFk0rmHOfN/',
            'EAABAgMEBQYHCAkKC6RKimkOlXecNmpVZ2m6lga9YjbIzbH3BIlWsbrGUQZEPl1J'
            + '8k1+OONEKZQV',
            'EAABAgMEBQYHCAkKCxKENdLeJsR9lZjwmt05c4Ns4seJi2/lLFkV4vrpLYGFjVxw/'
            + '9w/KDpNE9CHKl7vu8+FnOcGEN1pSZ+/hkcdq8a5X/DNbXNyPUoLeBsW1yh1PzU=',
        ];
        var modes = [[ns.BLOCK_ENCRYPTION_SCHEME.AES_CCM_12_16, 12],
                     [ns.BLOCK_ENCRYPTION_SCHEME.AES_CCM_10_16, 10],
                     [ns.BLOCK_ENCRYPTION_SCHEME.AES_CCM_10_08, 10],
                     [ns.BLOCK_ENCRYPTION_SCHEME.AES_GCM_12_16, 12]];
        var iv = asmCrypto.hex_to_bytes('000102030405060708090a0b0c0d0e0f');
        var key = asmCrypto.bytes_to_string(asmCrypto.hex_to_bytes('0f0e0d0c0b0a09080706050403020100'));
        var key2 = [252579084, 185207048, 117835012, 50462976];

        it("blockEncrypt", function() {
            for (var i = 0; i < modes.length; i++) {
                var mode = modes[i][0];
                // Make the correct nonce size and stub it in.
                var nonce = new Uint8Array(iv.subarray(0, modes[i][1]));
                mStub(mega, 'getRandomValues').returns(nonce);
                for (var j = 0; j < clearVectors.length; j++) {
                    var clear = clearVectors[j];
                    var cip = cipherVectors[i * clearVectors.length + j];
                    assert.strictEqual(btoa(ns.blockEncrypt(clear, key, mode, true)), cip);
                    assert.strictEqual(btoa(ns.blockEncrypt(clear, key2, mode, true)), cip);
                }
                mega.getRandomValues.restore();
            }
        });

        it("blockDecrypt", function() {
            for (var i = 0; i < modes.length; i++) {
                var mode = modes[i][0];
                for (var j = 0; j < clearVectors.length; j++) {
                    var cipherText = atob(cipherVectors[i * clearVectors.length + j]);
                    assert.strictEqual(ns.blockDecrypt(cipherText, key, true), clearVectors[j]);
                }
            }
        });

        it("blockDecrypt, failed integrity", function() {
            var tests = [
                atob('AAABAgMEBQYHCAkKC1jj/Y+ZHFFbO3UUng4na9OXvdc4jSVHIfN7ZqX='),
                atob('AQABAgMEBQYHCAkcT6pYBDGA0fD0WxB4YOqtkAhkd2VnxJpePwdK'),
                atob('AgABAgMEBQYHCAkcT6pYBDGA0fD0WxDEk30ne8m70a=='),
                atob('AwABAgMEBQYHCAkKC1jj/Y+ZHFFbO3UUng4na9OXvdc4jSVHIfN7ZqX='),
            ];
            for (var i = 0; i < tests.length; i++) {
                assert.throws(function() { ns.blockDecrypt(tests[i], key); },
                              'data integrity check failed');
            }
        });

        it("blockEncrypt/blockDecrypt round trip", function() {
            for (var i = 0; i < modes.length; i++) {
                var mode = modes[i][0];
                for (var j = 0; j < clearVectors.length; j++) {
                    var clearText = clearVectors[j];
                    var cipherText = ns.blockEncrypt(clearText, key, mode, true);
                    var reClear = ns.blockDecrypt(cipherText, key, true);
                    assert.strictEqual(reClear, clearText);
                }
            }
        });

        it("blockEncrypt/blockDecrypt round trip with array key", function() {
            var arrayKey = [252579084, 185207048, 117835012, 50462976];
            for (var i = 0; i < modes.length; i++) {
                var mode = modes[i][0];
                for (var j = 0; j < clearVectors.length; j++) {
                    var clearText = clearVectors[j];
                    var cipherText = ns.blockEncrypt(clearText, arrayKey, mode, true);
                    var reClear = ns.blockDecrypt(cipherText, arrayKey, true);
                    assert.strictEqual(reClear, clearText);
                }
            }
        });
    });
});
