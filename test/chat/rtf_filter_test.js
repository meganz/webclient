/**
 * @fileOverview
 * Rich text formatting test.
 */

describe("chat.rtf_filter unit test", function() {
    "use strict";

    var assert = chai.assert;

    var sandbox;
    var rtf;

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
        rtf = new RtfFilter({
            'bind': function() {}
        });
    });

    afterEach(function() {
        sandbox.restore();
        rtf = null;
    });

    var expected = function(expected, got, msg) {
        if (expected !== got) {
            var errorMsg = "Expected: \n" + expected + "\nGot: \n" + got + "\nError message: " + msg;
            assert.fail(expected, got, errorMsg);
        }
    };


    it("testing util funcs of rtf to html", function() {
        var fixture = [
            [
                "*singleline*\n" +
                "a*test*b\n" +
                "a *test* b\n" +
                "a *test* b *test2* *test 3 space*\n" +
                "a ***test***\n" +
                "a *\n" +
                "test\n" +
                "b*\n" +
                "dontmatchme ***\n" +
                "testtt***",

                "<strong>singleline</strong>\n" +
                "a*test*b\n" +
                "a <strong>test</strong> b\n" +
                "a <strong>test</strong> b <strong>test2</strong> <strong>test 3 space</strong>\n" +
                "a ***test***\n" +
                "a *\n" +
                "test\n" +
                "b*\n" +
                "dontmatchme ***\n" +
                "testtt***"
            ],
            [
                "_singleline_\n" +
                "a_test_b\n" +
                "a _test_ b\n" +
                "a _test_ b _test2_ _test 3 space_\n" +
                "a ___test___\n" +
                "a _\n" +
                "test\n" +
                "b_\n" +
                "dontmatchme _\n" +
                "testtt_",

                "<em class=\"rtf-italic\">singleline</em>\n" +
                "a_test_b\n" +
                "a <em class=\"rtf-italic\">test</em> b\n" +
                "a <em class=\"rtf-italic\">test</em> b <em class=\"rtf-italic\">test2</em> " +
                "<em class=\"rtf-italic\">test 3 space</em>\n" +
                "a ___test___\n" +
                "a _\n" +
                "test\n" +
                "b_\n" +
                "dontmatchme _\n" +
                "testtt_"
            ],
            [
                "`singleline`\n" +
                "a`test`b\n" +
                "a `test` b\n" +
                "a `test` b `test2` `test 3 space`\n" +
                "a ```test```\n" +
                "a `\n" +
                "test\n" +
                "b`\n" +
                "dontmatchme `\n" +
                "testtt`",

                "<pre class=\"rtf-single\">singleline</pre>\n" +
                "a`test`b\n" +
                "a <pre class=\"rtf-single\">test</pre> b\n" +
                "a <pre class=\"rtf-single\">test</pre> b <pre class=\"rtf-single\">test2</pre> " +
                "<pre class=\"rtf-single\">test 3 space</pre>\n" +
                "a <pre class=\"rtf-multi\">test</pre>\n" +
                "a `\n" +
                "test\n" +
                "b`\n" +
                "dontmatchme `\n" +
                "testtt`"
            ],
            [
                "```singleline```\n" +
                "a```test```b\n" +
                "a ```test``` b\n" +
                "a ```test``` b ```test2``` ```test 3 space```\n" +
                "a ````test````\n" +
                "a ```\n" +
                "test\n" +
                "b```\n" +
                "domatchme ```\n" +
                "testtt```",

                "<pre class=\"rtf-multi\">singleline</pre>\n" +
                "a```test```b\n" +
                "a <pre class=\"rtf-multi\">test</pre> b\n" +
                "a <pre class=\"rtf-multi\">test</pre> b <pre class=\"rtf-multi\">test2</pre> " +
                "<pre class=\"rtf-multi\">test 3 space</pre>\n" +
                "a ````test````\n" +
                "a <pre class=\"rtf-multi\">" +
                "test\n" +
                "b</pre>\n" +
                "domatchme <pre class=\"rtf-multi\">" +
                "testtt</pre>"
            ]
        ];

        fixture.forEach(function(entry) {
            var msg = {
                'message': {
                    'messageHtml': entry[0],
                    'textContents': entry[0],
                    'decrypted': true
                }
            };
            entry[1] = entry[1].replace(/\n/gi, "<br/>");

            rtf.processMessage(false, msg);

            expected(
                entry[1],
                msg.message.messageHtml,
                'RTF formatting failed'
            );
        });

    });
});
