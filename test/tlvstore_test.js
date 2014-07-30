/**
 * @fileOverview
 * TLV store unit tests.
 */

describe("tlvstore unit test", function() {
    "use strict";
    
    var assert = chai.assert;
    var sandbox = sinon.sandbox;
    
    var ns = _TlvStore;
    
    // Some test daata.
    var ED25519_PUB_KEY = atob('11qYAYKxCrfVS/7TyWQHOg7hcvPapiMlrwIaaPcHURo=');
    
    // Create/restore Sinon stub/spy/mock sandboxes.
    var sandbox = null;

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('TLV en-/decoding', function() {
        it("_toTlvRecord", function() {
            var tests = [['foo', 'bar',
                          'foo\u0000\u0000\u0003bar'],
                         ['puEd255', ED25519_PUB_KEY,
                          'puEd255\u0000\u0000\u0020' + ED25519_PUB_KEY]
                        ];
            for (var i = 0; i < tests.length; i++) {
                var key = tests[i][0];
                var value = tests[i][1];
                var expected = tests[i][2];
                assert.strictEqual(ns._toTlvRecord(key, value), expected);
            }
        });
        
        it("containerToTlvRecords", function() {
            var tests = {'foo': 'bar',
                         'puEd255': ED25519_PUB_KEY};
            var expected = 'foo\u0000\u0000\u0003bar'
                         + 'puEd255\u0000\u0000\u0020' + ED25519_PUB_KEY;
            assert.strictEqual(containerToTlvRecords(tests), expected);
        });
        
        it('_splitSingleTlvRecord', function() {
            var tests = 'foo\u0000\u0000\u0003bar'
                      + 'puEd255\u0000\u0000\u0020' + ED25519_PUB_KEY;
            var result = ns._splitSingleTlvRecord(tests);
            assert.strictEqual(result.record[0], 'foo');
            assert.strictEqual(result.record[1], 'bar');
            assert.strictEqual(result.rest, 'puEd255\u0000\u0000\u0020' + ED25519_PUB_KEY);
        });
        
        it('tlvRecordsToContainer', function() {
            var tests = 'foo\u0000\u0000\u0003bar'
                      + 'puEd255\u0000\u0000\u0020' + ED25519_PUB_KEY;
            var expected = {'foo': 'bar',
                            'puEd255': ED25519_PUB_KEY};
            var result = tlvRecordsToContainer(tests);
            for (var key in expected) {
                assert.strictEqual(result[key], expected[key]);
            }
        });
    });
    
    describe('attribute en-/decryption', function() {
        it("blockEncrypt", function() {
            var iv = asmCrypto.hex_to_bytes('000102030405060708090a0b0c0d0e0f');
            var key = asmCrypto.bytes_to_string(asmCrypto.hex_to_bytes('0f0e0d0c0b0a09080706050403020100'));
            var modes = [[BLOCK_ENCRYPTION_SCHEME.AES_CCM_12_16, 12],
                         [BLOCK_ENCRYPTION_SCHEME.AES_CCM_10_16, 10],
                         [BLOCK_ENCRYPTION_SCHEME.AES_CCM_10_08, 10]];
            var tests = ['', '42', "Don't panic!", 'Flying Spaghetti Monster',
                         "Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn",
                         'Tēnā koe', 'Hänsel & Gretel', 'Слартибартфаст'];
            var expected = [
                'AAABAgMEBQYHCAkKC436kEyuBNzuW6p4fd5WoW0=',
                'AAABAgMEBQYHCAkKCyi+Gse0PYhohpuaRdPeQ2zQzA==',
                'AAABAgMEBQYHCAkKC1jj/Y+ZHFFbO3UUng4na9OXvdc4jSVHIfN7ZqY=',
                'AAABAgMEBQYHCAkKC1rg6sGDWwFpJX0Q14jMKRU1EqGtmyxNLrct68sME75wRH6Vz8mvGDc=',
                'AAABAgMEBQYHCAkKC0zktMaKUFRTdXEQ05qfMx1zN+6AnDBdMJZPYx7hPtIuU1e9B+eiG4Z5jlqrYiW3FTqKXuJPuLb4jgJTeK0FsYowMw==',
                'AAABAgMEBQYHCAkKC0hIAMYpvQFROnlMxVaEuPiXMq/Y4m8BUAgw',
                'AAABAgMEBQYHCAkKC1RPN8aeWU0aczwwzYjMOBC6E2laTFsBrGOaoCAFb928',
                'AAABAgMEBQYHCAkKC8wtQxM9jPC6hJ6nBz0JjczE3x9BOdz47C+7ks4K2Wb9lPQIBLG4INdpu990',
                'AQABAgMEBQYHCAl2SvO7NJsA/pCOM/+ZGRLO',
                'AQABAgMEBQYHCAlsEidPV7tzJs/RkQ4e652Ipuc=',
                'AQABAgMEBQYHCAkcT6pYBDGA0fD0WxB4YOqtkAhkd2VnxJpePwdJ',
                'AQABAgMEBQYHCAkeTL0WHnbQ4+78X1lELSvB1nwQZCAI98SSw69pQGbXhP4kwoW5x0R1',
                'AQABAgMEBQYHCAkISOMRF32F2b7wX11WfjHJkFlfSScU59o0kzk7jy8GJ9g+DYAvePaaxtKi9hPgbbTkt2gAUoEyAsKvEWbizViIqag=',
                'AQABAgMEBQYHCAkM5FcRtJDQ2/H4Efh3pgp0imG3oK+nxrA3SA==',
                'AQABAgMEBQYHCAkQ42ARA3SckLi9f0NELTrExuPcws6HdbPNrB+JfereuA==',
                'AQABAgMEBQYHCAmIgRTEoKEhME8f6Inx6I8YJ7GuiIL4QgaNZ8jrKNLfo7kJ4yRAJQ7lsIwegQ==',
                'AgABAgMEBQYHCAmJNz0zRRXZCQ==',
                'AgABAgMEBQYHCAlsEvCWxcq1JorR',
                'AgABAgMEBQYHCAkcT6pYBDGA0fD0WxDEk30ne8m70A==',
                'AgABAgMEBQYHCAkeTL0WHnbQ4+78X1lELSvB1nwQZCAI98QRPNxvXtb4mQ==',
                'AgABAgMEBQYHCAkISOMRF32F2b7wX11WfjHJkFlfSScU59o0kzk7jy8GJ9g+DYAvePaaxtKi9hPgbbTkt/LWvrZpzTEM',
                'AgABAgMEBQYHCAkM5FcRtJDQ2/H445cZBM9C5Ws=',
                'AgABAgMEBQYHCAkQ42ARA3SckLi9f0NELTrE+a13ciKmM6k=',
                'AgABAgMEBQYHCAmIgRTEoKEhME8f6Inx6I8YJ7GuiIL4QgaNZ8jrw5l9HNUXDPk=',
            ];
            for (var i = 0; i < modes.length; i++) {
                var mode = modes[i][0];
                // Make the correct nonce size and stub it in.
                var nonce = new Uint8Array(iv.subarray(0, modes[i][1]));
                var _copy = function(x) {
                    for (var i = 0; i < x.length; i++) {
                        x[i] = nonce[i];
                    }
                };
                sandbox.stub(asmCrypto, 'getRandomValues', _copy);
                for (var j = 0; j < tests.length; j++) {
                    var clear = tests[j];
                    assert.strictEqual(btoa(blockEncrypt(clear, key, mode)),
                                       expected[i * tests.length + j]);
                }
                asmCrypto.getRandomValues.restore();
            }
        });
            
        it("blockDecrypt", function() {
            var key = asmCrypto.bytes_to_string(asmCrypto.hex_to_bytes('0f0e0d0c0b0a09080706050403020100'));
            var modes = [[BLOCK_ENCRYPTION_SCHEME.AES_CCM_12_16, 12],
                         [BLOCK_ENCRYPTION_SCHEME.AES_CCM_10_16, 10],
                         [BLOCK_ENCRYPTION_SCHEME.AES_CCM_10_08, 10]];
            var tests = [
                'AAABAgMEBQYHCAkKC436kEyuBNzuW6p4fd5WoW0=',
                'AAABAgMEBQYHCAkKCyi+Gse0PYhohpuaRdPeQ2zQzA==',
                'AAABAgMEBQYHCAkKC1jj/Y+ZHFFbO3UUng4na9OXvdc4jSVHIfN7ZqY=',
                'AAABAgMEBQYHCAkKC1rg6sGDWwFpJX0Q14jMKRU1EqGtmyxNLrct68sME75wRH6Vz8mvGDc=',
                'AAABAgMEBQYHCAkKC0zktMaKUFRTdXEQ05qfMx1zN+6AnDBdMJZPYx7hPtIuU1e9B+eiG4Z5jlqrYiW3FTqKXuJPuLb4jgJTeK0FsYowMw==',
                'AAABAgMEBQYHCAkKC0hIAMYpvQFROnlMxVaEuPiXMq/Y4m8BUAgw',
                'AAABAgMEBQYHCAkKC1RPN8aeWU0aczwwzYjMOBC6E2laTFsBrGOaoCAFb928',
                'AAABAgMEBQYHCAkKC8wtQxM9jPC6hJ6nBz0JjczE3x9BOdz47C+7ks4K2Wb9lPQIBLG4INdpu990',
                'AQABAgMEBQYHCAl2SvO7NJsA/pCOM/+ZGRLO',
                'AQABAgMEBQYHCAlsEidPV7tzJs/RkQ4e652Ipuc=',
                'AQABAgMEBQYHCAkcT6pYBDGA0fD0WxB4YOqtkAhkd2VnxJpePwdJ',
                'AQABAgMEBQYHCAkeTL0WHnbQ4+78X1lELSvB1nwQZCAI98SSw69pQGbXhP4kwoW5x0R1',
                'AQABAgMEBQYHCAkISOMRF32F2b7wX11WfjHJkFlfSScU59o0kzk7jy8GJ9g+DYAvePaaxtKi9hPgbbTkt2gAUoEyAsKvEWbizViIqag=',
                'AQABAgMEBQYHCAkM5FcRtJDQ2/H4Efh3pgp0imG3oK+nxrA3SA==',
                'AQABAgMEBQYHCAkQ42ARA3SckLi9f0NELTrExuPcws6HdbPNrB+JfereuA==',
                'AQABAgMEBQYHCAmIgRTEoKEhME8f6Inx6I8YJ7GuiIL4QgaNZ8jrKNLfo7kJ4yRAJQ7lsIwegQ==',
                'AgABAgMEBQYHCAmJNz0zRRXZCQ==',
                'AgABAgMEBQYHCAlsEvCWxcq1JorR',
                'AgABAgMEBQYHCAkcT6pYBDGA0fD0WxDEk30ne8m70A==',
                'AgABAgMEBQYHCAkeTL0WHnbQ4+78X1lELSvB1nwQZCAI98QRPNxvXtb4mQ==',
                'AgABAgMEBQYHCAkISOMRF32F2b7wX11WfjHJkFlfSScU59o0kzk7jy8GJ9g+DYAvePaaxtKi9hPgbbTkt/LWvrZpzTEM',
                'AgABAgMEBQYHCAkM5FcRtJDQ2/H445cZBM9C5Ws=',
                'AgABAgMEBQYHCAkQ42ARA3SckLi9f0NELTrE+a13ciKmM6k=',
                'AgABAgMEBQYHCAmIgRTEoKEhME8f6Inx6I8YJ7GuiIL4QgaNZ8jrw5l9HNUXDPk=',
            ];
            var expected = ['', '42', "Don't panic!", 'Flying Spaghetti Monster',
                            "Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn",
                            'Tēnā koe', 'Hänsel & Gretel', 'Слартибартфаст'];
            for (var i = 0; i < modes.length; i++) {
                for (var j = 0; j < expected.length; j++) {
                    var cipher = atob(tests[i * expected.length + j]);
                    assert.strictEqual(blockDecrypt(cipher, key), expected[j]);
                }
            }
        });
        
        it("blockEncrypt/blockDecrypt round trip", function() {
            var key = asmCrypto.bytes_to_string(asmCrypto.hex_to_bytes('0f0e0d0c0b0a09080706050403020100'));
            var modes = [[BLOCK_ENCRYPTION_SCHEME.AES_CCM_12_16, 12],
                         [BLOCK_ENCRYPTION_SCHEME.AES_CCM_10_16, 10],
                         [BLOCK_ENCRYPTION_SCHEME.AES_CCM_10_08, 10]];
            var tests = ['', '42', "Don't panic!", 'Flying Spaghetti Monster',
                         "Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn",
                         'Tēnā koe', 'Hänsel & Gretel', 'Слартибартфаст'];
            for (var i = 0; i < modes.length; i++) {
                var mode = modes[i][0];
                for (var j = 0; j < tests.length; j++) {
                    var clear = tests[j];
                    var cipher = blockEncrypt(clear, key, mode);
                    var reClear = blockDecrypt(cipher, key);
                    assert.strictEqual(reClear, clear);
                }
            }
        });
    });
});
