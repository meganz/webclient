/**
 * @fileOverview
 * TLV store unit tests.
 */

describe("tlvstore unit test", function() {
    "use strict";
    
    var assert = chai.assert;
    
    var ns = _TlvStore;
    
    // Some test daata.
    var ED25519_PUB_KEY = atob('11qYAYKxCrfVS/7TyWQHOg7hcvPapiMlrwIaaPcHURo=');
    
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
