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
            assert.strictEqual(ns._logger._log.args[0][0],
                               'Inconsistent TLV decoding. Maybe content UTF-8 encoded?');
            assert.strictEqual(ns._logger._log.args[1][0],
                               'Retrying to decode TLV container legacy style ...');
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

        it("blockEncrypt", function() {
            for (var i = 0; i < modes.length; i++) {
                var mode = modes[i][0];
                // Make the correct nonce size and stub it in.
                var nonce = new Uint8Array(iv.subarray(0, modes[i][1]));
                var _copy = function(x) {
                    for (var i = 0; i < x.length; i++) {
                        x[i] = nonce[i];
                    }
                };
                mStub(asmCrypto, 'getRandomValues').callsFake(_copy);
                for (var j = 0; j < clearVectors.length; j++) {
                    var clear = clearVectors[j];
                    assert.strictEqual(btoa(ns.blockEncrypt(clear, key, mode, true)),
                                       cipherVectors[i * clearVectors.length + j]);
                }
                asmCrypto.getRandomValues.restore();
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
