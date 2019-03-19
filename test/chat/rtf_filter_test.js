/**
 * @fileOverview
 * Rich text formatting test.
 */

describe("chat.rtf_filter unit test", function() {
    "use strict";

    var assert = chai.assert;

    var sandbox;
    var rtf;
    var megaChat;

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
        var EMOJI_DATASET_VERSION = 2;
        megaChat = {
            'getEmojiDataSet': function(name) {
                var self = this;
                assert(name === "categories" || name === "emojis", "Invalid emoji dataset name passed.");

                if (!self._emojiDataLoading) {
                    self._emojiDataLoading = {};
                }
                if (!self._emojiData) {
                    self._emojiData = {};
                }

                if (self._emojiData[name]) {
                    return MegaPromise.resolve(
                        self._emojiData[name]
                    );
                }
                else if (self._emojiDataLoading[name]) {
                    return self._emojiDataLoading[name];
                }
                else {
                    self._emojiDataLoading[name] = MegaPromise.asMegaPromiseProxy(
                        $.getJSON(staticpath + "js/chat/emojidata/" + name + "_v" + EMOJI_DATASET_VERSION + ".json")
                    );
                    self._emojiDataLoading[name].done(function(data) {
                        self._emojiData[name] = data;
                        delete self._emojiDataLoading[name];
                    }).fail(function() {
                        delete self._emojiDataLoading[name];
                    });

                    return self._emojiDataLoading[name];
                }
            }
        };
        makeObservable(megaChat);
        megaChat.plugins = {
            // 'chatStats': ChatStats,
            // 'chatdIntegration': ChatdIntegration,
            // 'callManager': CallManager,
            'urlFilter': UrlFilter,
            'emoticonShortcutsFilter': EmoticonShortcutsFilter,
            'emoticonsFilter': EmoticonsFilter,
            // 'callFeedback': CallFeedback,
            // 'presencedIntegration': PresencedIntegration,
            // 'persistedTypeArea': PersistedTypeArea,
            'btRtfFilter': BacktickRtfFilter,
            'rtfFilter': RtfFilter
        };
        // init
        Object.keys(megaChat.plugins).forEach(function(plName) {
            megaChat.plugins[plName] = new megaChat.plugins[plName](megaChat);
        });

        rtf = new RtfFilter(megaChat);
    });

    afterEach(function() {
        sandbox.restore();
        rtf = null;
    });

    var expected = function(expected, got, msg) {
        if (expected != got) {
            var errorMsg = "Expected: " + expected + "\nGot: \n" + got + "\nError message: " + msg;
            assert.fail(expected, got, errorMsg);
        }
    };


    it("parser test", function() {

        var punctuationCharacters = '.,/#!$%^&*;:{}=-_~()';
        var expectedValues = [];

        punctuationCharacters
        .split('')
        .forEach(function(char) {
            expectedValues.push(
                [char + '```placeholder```', char + '<pre class="rtf-multi">placeholder</pre>'],
                [char + '`placeholder`', char +  '<pre class="rtf-single">placeholder</pre>']
            );
        });

        [
            [
                '```a```',
                '<pre class="rtf-multi">a</pre>'
            ],
            [
                '`a`',
                '<pre class="rtf-single">a</pre>'
            ],
            [
                '```a b```',
                '<pre class="rtf-multi">a b</pre>'
            ],
            [
                '```a\nb```',
                '<pre class="rtf-multi">a\nb</pre>'
            ],
            [
                '`a1` ```a2\nb1```',
                '<pre class="rtf-single">a1</pre> <pre class="rtf-multi">a2\nb1</pre>'
            ],
            [
                '`a1` `a2`',
                '<pre class="rtf-single">a1</pre> <pre class="rtf-single">a2</pre>'
            ],
            [
                '`a1` `or` ` `a2`',
                '<pre class="rtf-single">a1</pre> <pre class="rtf-single">or</pre> ` <pre class="rtf-single">a2</pre>'
            ],
            [
                '```a1 ` a2```',
                '<pre class="rtf-multi">a1 ` a2</pre>'
            ],
            [
                '`inside ``` or ``` inside single`',
                '<pre class="rtf-single">inside ``` or ``` inside single</pre>'
            ],
            [
                '` ```',
                '` ```'
            ],
            [
                '``` LocalStorage `*TM*`clear``` and hit enter\n',
                '<pre class="rtf-multi"> LocalStorage `*TM*`clear</pre> and hit enter\n'
            ],
            [
                '``` LocalStorage `*TM*`clear```',
                '<pre class="rtf-multi"> LocalStorage `*TM*`clear</pre>'
            ],
            [
                'a```dont parse```',
                'a```dont parse```'
            ],
            [
                'a`dont parse`',
                'a`dont parse`',
            ],
            [
                'a`dont parse',
                'a`dont parse',
            ],
            [
                'a `\ntest`',
                'a `\ntest`',
            ],
            [
                'a `\ntest\n`',
                'a `\ntest\n`',
            ],
            [
                'a a```\ntest\n`',
                'a a```\ntest\n`',
            ],
            [
                '```test`dontparse`testok```',
                '<pre class="rtf-multi">test`dontparse`testok</pre>'
            ]
        ].concat(expectedValues).forEach(function(expectedVals, k) {
            var btkrtf = new BacktickRtfFilter({'rebind': function(){}});
            var found = [];
            var res = btkrtf.processBackticks(expectedVals[0], function(match, html, txt) {
                found.push([match, html, txt]);
                return html;
            });

            expected(expectedVals[1], res, 'parser test#' + k + ' failed.');
        })
    });
    it("test escaping", function() {
        [
            ['a', 'a', 'a'],
            [
                '`:spoon:`\n' +
                '`:apple: `\n' +
                '`:dolphin: `',

                '`:spoon:`\n' +
                '`:apple: `\n' +
                '`:dolphin: `',

                '<pre class="rtf-single">:spoon:</pre><br/>' +
                '<pre class="rtf-single">:apple: </pre><br/><pre class="rtf-single">:dolphin: </pre>'
            ],
            [
                '<img src="#" width=300 height=300 />',
                '<img src="#" width=300 height=300 />',
                '&lt;img src="#" width=300 height=300 /&gt;',
            ],
            [
                '`a`',

                '`a`',

                '<pre class="rtf-single">a</pre>'
            ],
            [
                '```test\n' +
                'test2```',

                '```test\n' +
                'test2```',

                '<pre class="rtf-multi">test<br/>test2</pre>'
            ],
            [
                '```test\n' +
                'test2```\n' +
                '```test```',

                '```test\n' +
                'test2```\n' +
                '```test```',

                '<pre class="rtf-multi">test<br/>test2</pre><br/><pre class="rtf-multi">test</pre>'
            ],
            [
                '```a ` b ``` c `',

                '```a ` b ``` c `',

                '<pre class="rtf-multi">a ` b </pre> c `',
            ]
        ].forEach(function(rule) {
            var evtObj = {
                message: {
                    'textContents': rule[0],
                    'message': rule[0],
                },
                room: {}
            };

            var e = new $.Event("onPreBeforeRenderMessage");
            megaChat.trigger(e, evtObj);

            var event = new $.Event("onBeforeRenderMessage");
            megaChat.trigger(event, evtObj);

            e = new $.Event("onPostBeforeRenderMessage");
            megaChat.trigger(e, evtObj);

            expected(
                rule[1],
                evtObj.message.textContents,
                'RTF formatting failed (textContents)'
            );

            expected(
                rule[2],
                evtObj.message.messageHtml,
                'RTF formatting failed (messageHtml)'
            );
        });
    });

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
                "2 `singleline`\n" +
                "a`test`b\n" +
                "a `test` b\n" +
                "a `test` b `test2` `test 3 space`\n" +
                "a ```test```\n" +
                "a `\n" +
                "test\n" +
                "b`\n" +
                "dontmatchme `\n" +
                "testtt`",

                "2 <pre class=\"rtf-single\">singleline</pre><br/>" +
                "a`test`b<br/>" +
                "a <pre class=\"rtf-single\">test</pre> b<br/>" +
                "a <pre class=\"rtf-single\">test</pre> b <pre class=\"rtf-single\">test2</pre> <pre class=\"rtf-single\">test 3 space</pre><br/>" +
                "a <pre class=\"rtf-multi\">test</pre><br/>" +
                "a `<br/>test<br/>b`<br/>dontmatchme `<br/>" +
                "testtt`"
            ],
            [
                "1 ```singleline```\n" +
                "a```test```b\n" +
                "a ```test``` b\n" +
                "a ```test``` b ```test2``` ```test 3 space```\n" +
                "a ````test````\n" +
                "a ```\n" +
                "test\n" +
                "b```\n" +
                "domatchme ```\n" +
                "testtt```",

                '1 <pre class="rtf-multi">singleline</pre><br/>' +
                'a```test```b<br/>' +
                'a <pre class="rtf-multi">test</pre> b<br/>' +
                'a <pre class="rtf-multi">test</pre> b <pre class="rtf-multi">test2</pre> <pre class="rtf-multi">test 3 space</pre><br/>' +
                'a <pre class="rtf-multi">`test</pre>`<br/>' +
                'a <pre class="rtf-multi"><br/>' +
                'test<br/>' +
                'b</pre><br/>' +
                'domatchme <pre class="rtf-multi"><br/>' +
                'testtt</pre>'
            ]
        ];

        fixture.forEach(function(entry) {
            entry[1] = entry[1].replace(/\n/gi, "<br/>");


            var evtObj = {
                message: {
                    'messageHtml': htmlentities(entry[0]),
                    'textContents': entry[0],
                    'decrypted': true
                },
                room: {}
            };

            megaChat.trigger('onPreBeforeRenderMessage', evtObj);
            var event = new $.Event("onBeforeRenderMessage");
            megaChat.trigger(event, evtObj);
            megaChat.trigger('onPostBeforeRenderMessage', evtObj);

            expected(
                entry[1],
                evtObj.message.messageHtml,
                'RTF formatting failed'
            );
        });

    });
});
