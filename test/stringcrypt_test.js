/**
 * @fileOverview
 * Test of the `stringcrypt` module.
 */

describe("stringcrypt unit test", function() {
    "use strict";
    var assert = chai.assert;
    var ns = stringcrypt;

    afterEach(function() {
        mStub.restore();
    });

    describe('string en-/decryption', function() {
        it("stringEncrypter/stringDecrypter round trip", function() {
            var key = asmCrypto.bytes_to_string(asmCrypto.hex_to_bytes('0f0e0d0c0b0a09080706050403020100'));
            var tests = ['', '42', "Don't panic!", 'Flying Spaghetti Monster',
                         "Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn",
                         'Tēnā koe', 'Hänsel & Gretel', 'Слартибартфаст'];
            for (var i = 0; i < tests.length; i++) {
                var plain = tests[i];
                var cipher = ns.stringEncrypter(plain, key);
                var rePlain = ns.stringDecrypter(cipher, key);
                assert.strictEqual(rePlain, plain);
            }
        });
    });
});
