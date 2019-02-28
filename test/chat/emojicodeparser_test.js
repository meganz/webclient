describe("chat.emoticon_shortcuts unit test", function() {
    "use strict";

    var assert = chai.assert;
    var DEBUG = false;


    var sandbox;
    var validEmojiSlugs = {
        "camera": true,
    };

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        assert(typeof(megaChat) === 'undefined');
        window.megaChat = {
            'isValidEmojiSlug': function(s) {
                if (DEBUG) {
                    console.error('isValidEmojiSlug', s, validEmojiSlugs[s]);
                }
                return !!validEmojiSlugs[s];
            }
        };
    });

    afterEach(function () {
        sandbox.restore();
        delete window.megaChat;
    });


    var expected = function (expected, got, msg) {
        if (expected !== got) {
            var errorMsg = "Expected: " + expected + "\nGot: " + got + "\nError message: " + msg;
            assert.fail(expected, got, errorMsg);
        }
    };
    var expectedArr = function (expected, got, msg) {
        if (JSON.stringify(expected) !== JSON.stringify(got)) {
            var errorMsg = "Expected: " + JSON.stringify(expected) + "\nGot: " + JSON.stringify(got) +
                "\nError message: " + msg;
            assert.fail(expected, got, errorMsg);
        }
        else {
            if (DEBUG) {
                console.log("Success:", expected);
            }
        }
    };

    it("basic stuff", function () {
        [
            [
                [":camer", 3],
                [":camer", 0, 5]
            ],
            [
                [":camera:", 3],
                [":camera", 0, 6]
            ],
            [
                ["camera:", 3],
                [false, false, false]
            ],
            [
                [":camera", 3],
                [":camera", 0, 6]
            ],
        ].forEach(function(row, scenarioNum) {
            expectedArr(
                row[1],
                mega.utils.emojiCodeParser(row[0][0], row[0][1]),
                "Failed scenario: #"+ scenarioNum + ", contents: " + row[0][0]
            );
        });
    });
    it ("multiple concatenated emoji support", function() {
        [
            [
                ["camera:came", 4],
                [false, false, false]
            ],
            [
                ["camera::came", 10],
                [":came", 7, 11]
            ],
            [
                [":camera::came", 9],
                [":came", 8, 12]
            ],
            [
                [":camera::came", 10],
                [":came", 8, 12]
            ],
            [
                [":camera::smiley::cam", 17],
                [":cam", 16, 19]
            ],
            [
                [":camera::smiley::cam", 16],
                [":cam", 16, 19]
            ],
            [
                [":camera::cam::smiley:", 9],
                [":cam", 8, 11]
            ],
            [
                [":camera:cam:", 8],
                [false, false, false]
            ],
            [
                [":open_file_folder::test_tube:", 18],
                [":test_tube", 18, 27]
            ],

        ].forEach(function(row, scenarioNum) {
            expectedArr(
                row[1],
                mega.utils.emojiCodeParser(row[0][0], row[0][1]),
                "Failed (concat) scenario: #"+ scenarioNum + ", contents: " + row[0][0]
            );
        });
    })
});
