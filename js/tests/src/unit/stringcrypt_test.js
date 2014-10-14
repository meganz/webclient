/**
 * @fileOverview
 * Test of the `stringcrypt` module.
 */

describe("stringcrypt unit test", function() {
    "use strict";

    var assert = chai.assert;

    var ns = stringcrypt;

    // Create/restore Sinon stub/spy/mock sandboxes.
    var sandbox = null;

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('string en-/decryption', function() {
        it("stringEncrypt/stringDecrypt round trip", function() {
            var key = asmCrypto.bytes_to_string(asmCrypto.hex_to_bytes('0f0e0d0c0b0a09080706050403020100'));
            var tests = ['', '42', "Don't panic!", 'Flying Spaghetti Monster',
                         "Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn",
                         'Tēnā koe', 'Hänsel & Gretel', 'Слартибартфаст'];
            for (var i = 0; i < modes.length; i++) {
                for (var j = 0; j < tests.length; j++) {
                    var plain = tests[j];
                    var cipher = ns.stringEncrypt(plain, key);
                    var rePlain = ns.stringDecrypt(cipher, key);
                    assert.strictEqual(rePlain, plain);
                }
            }
        });
    });
});
