
/**
 * @fileOverview
 * Chat message transcript tests.
 */

describe("chat.emoticon_shortcuts unit test", function() {
    "use strict";

    var assert = chai.assert;

    afterEach(function() {
        mStub.restore();
    });

    var expected = function(expected, got, msg) {
        if (expected !== got) {
            var errorMsg = "Expected: " + expected + "\nGot: " + got + "\nError message: " + msg;
            assert.fail(expected, got, errorMsg);
        }
    };

    it("testing util funcs of shortcuts to emoticons", function() {
        var fixture = [
            [' test',  1, 0],
            [' test ', 1, 1],
            ['  test  ', 2, 2],
            ['test  ', 0, 2],
        ];

        fixture.forEach(function(entry) {

            expected(
                entry[1],
                EmoticonShortcutsFilter._strStartsWithNSpaces(entry[0]),
                'Entry: ' + JSON.stringify(entry[0]) + ' does not STARTS with X spaces as expected.'
            );

            expected(
                entry[2],
                EmoticonShortcutsFilter._strEndsWithNSpaces(entry[0]),
                'Entry: ' + JSON.stringify(entry[0]) + ' does not ENDS with X spaces as expected.'
            );
        })

    });

    it("testing proper replacement of shortcuts to emoticons", function() {

        var fixture = [
            [':)', ':slight_smile:'],
            [':-)', ':slight_smile:'],
            [':D', ':grinning:'],
            [':-D', ':grinning:'],
            [';)', ':wink:'],
            [';-)', ':wink:'],
            [';P', ':stuck_out_tongue_winking_eye:'],
            [';-P', ':stuck_out_tongue_winking_eye:'],
            [':P', ':stuck_out_tongue:'],
            [':-P', ':stuck_out_tongue:'],
            [':D ok', ':grinning: ok'],
            [':Dok', ':Dok'],
            ['ok:Dok', 'ok:Dok'],
            ['ok :Dok', 'ok :Dok'],
            ['ok :D ok', 'ok :grinning: ok'],
            [':))', ':))'],
            [':devil :D', ':devil :grinning:'],
            [':) :)', ':slight_smile: :slight_smile:'],
            [' :) :) ', ' :slight_smile: :slight_smile: '],
            ['this is a test! :D', 'this is a test! :grinning:'],
            ['this is a test! :D\na', 'this is a test! :grinning:\na'],
            ['this is a test! :D\n:D', 'this is a test! :grinning:\n:grinning:'],
            ['this should not be changed:', 'this should not be changed:'],
            ['this should changed d:', 'this should changed :anguished:'],
            [':)\n:)', ':slight_smile:\n:slight_smile:'],
        ];


        var fakeChat = {};
        makeObservable(fakeChat);

        var filter = new EmoticonShortcutsFilter(fakeChat);

        fixture.forEach(function(entry) {
            var msgObj = {
                'message': {
                    'textContents': entry[0]
                }
            };

            fakeChat.trigger('onBeforeRenderMessage', msgObj);

            expected(
                entry[1],
                msgObj.message.messageHtml,
                'Failed to convert emoticon shortcut for fixture.'
            );
        });
    });
});
