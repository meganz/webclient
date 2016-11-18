/**
 * Test the crypto functions for the Export Password protect feature
 */
describe('Test the crypto functions for the Export Password protect feature', function() {
    'use strict';

    // Use the Chai Assertion Library
    var assert = chai.assert;

    // Test encryption function
    it('Test XOR of two byte arrays for encryption and decryption', function() {
        
        var arrayA = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        var arrayB = new Uint8Array([0, 1, 2, 3, 4, 5, 4, 3, 2, 1]);
        
        var result = exportPassword.xorByteArrays(arrayA, arrayB);
        var expectedResult = new Uint8Array([0, 0, 0, 0, 0, 0, 2, 4, 10, 8]);
        
        assert.deepEqual(result, expectedResult);
    });
    
    // Test that the main Web Crypto key derivation function output matches output from the fallback asmCrypto function
    it('Test key derivation functions', function() {
        
        // Test algorithm (PBKDF2-HMAC-SHA512, 1000 rounds)
        var algorithm = 0;
        
        // Generated from: crypto.getRandomValues(new Uint8Array(32));
        var saltBytes = new Uint8Array([
            249,222,39,45,138,76,162,1,58,133,114,25,155,230,53,69,
            70,86,71,13,67,20,31,114,54,212,140,210,73,113,159,42
        ]);
        
        // Generated from: exportPassword.stringToByteArray('correct horse battery staple')
        var passwordBytes = new Uint8Array([
            99,111,114,114,101,99,116,32,104,111,114,115,101,32,
            98,97,116,116,101,114,121,32,115,116,97,112,108,101
        ]);
        
        // Generated from: exportPassword.deriveKeyWithWebCrypto()
        var expectedDerivedKeyBytes = new Uint8Array([
            48,187,136,114,157,183,46,234,79,28,129,167,193,163,64,247,
            225,177,128,107,165,148,22,244,105,58,92,117,51,64,167,48,
            170,18,86,112,231,115,99,59,58,122,59,138,176,106,236,106,
            137,83,53,32,192,217,56,55,226,93,180,31,61,148,56,172
        ]);
        
        // Check asmCrypto
        exportPassword.deriveKeyWithAsmCrypto(algorithm, saltBytes, passwordBytes, function(derivedKeyBytes) {
           assert.deepEqual(derivedKeyBytes, expectedDerivedKeyBytes);
        });
    });
    
    // Test the Base64 URL encoding and decoding functions
    it('Test the Base64 URL encoding and decoding functions', function() {
        
        // Generated from: crypto.getRandomValues(new Uint8Array(32));
        var dataBytes = new Uint8Array([
            249,222,39,45,138,76,162,1,58,133,114,25,155,230,53,69,
            70,86,71,13,67,20,31,114,54,212,140,210,73,113,159,42
        ]);
        
        // Convert to URL encoded Base64 string
        var base64String = exportPassword.base64UrlEncode(dataBytes);
        var expectedBase64String = '-d4nLYpMogE6hXIZm-Y1RUZWRw1DFB9yNtSM0klxnyo';
        
        // Convert back to bytes
        var convertedDataBytes = exportPassword.base64UrlDecode(base64String);
        var expectedConvertedDataBytes = dataBytes;
        
        assert.strictEqual(base64String, expectedBase64String);
        assert.deepEqual(convertedDataBytes, expectedConvertedDataBytes);
    });
});
