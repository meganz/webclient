var mega = mega || {};
mega.utils = mega.utils || {};
(function(scope) {
    var DEBUG = false;

    var validEmojiCharacters = new RegExp("[a-z\:\_0-9]", "gi");

    scope.emojiCodeParser = function(currentContent, currentCursorPos) {
        var startPos = false;
        var endPos = false;
        // back
        var matchedWord = "";
        var currentChar;
        if (DEBUG) {
            console.error("start", currentContent, currentCursorPos);
        }

        for (var x = currentCursorPos; x >= 0; x--) {
            currentChar = currentContent.substr(x, 1);
            if (DEBUG) {
                console.error(currentContent, "bbwd", x, currentChar);
            }
            if (currentChar === ":") {
                if (x > 0) {
                    var prevEmoji = scope.emojiCodeParser(currentContent.substr(0, x), x - 1);

                    if (prevEmoji[0]) {
                        return [false, false, false];
                    }

                }

                startPos = x;
                matchedWord = currentChar + matchedWord;
                break;
            }
            else if (currentChar && currentChar.match(validEmojiCharacters)) {
                matchedWord = currentChar + matchedWord;
            }
            else {
                startPos = x + 1;
                break;
            }
        }
        // console.error("bbwd", currentCursorPos, startPos, endPos, matchedWord);

        // fwd
        for (var x = currentCursorPos + 1; x < currentContent.length; x++) {
            currentChar = currentContent.substr(x, 1);
            if (DEBUG) {
                console.error(currentContent, "fwd", x, currentChar);
            }

            if (matchedWord && currentChar === ":") {
                // end in case of second ":" is found.
                matchedWord = matchedWord + currentChar;
                endPos = x - 1;
                break;
            }
            else if (currentChar && currentChar.match(validEmojiCharacters)) {
                matchedWord = matchedWord + currentChar;
            }
            else {
                endPos = x;
                break;
            }
        }

        if (matchedWord && matchedWord.length > 2 && matchedWord.substr(0, 1) === ":") {
            endPos = endPos ? endPos : startPos + (matchedWord.length - 1);

            if (matchedWord.substr(-1) === ":") {
                matchedWord = matchedWord.substr(0, matchedWord.length - 1);
            }

            // var matchedWordClean = matchedWord.replace(/(^:+|:+$)/gi, "");
            //
            // if (DEBUG) {
            //     console.error('matchedWordClean', matchedWordClean);
            // }

            // if (megaChat.isValidEmojiSlug(matchedWordClean)) {
            //     // don't show in case the slug matches a valid emoji..e.g. its already entered, no need for auto
            //     // completes and stuff...
            //     return [
            //         false,
            //         false,
            //         false
            //     ];
            // }

            // don't match for time-like strings, e.g. 14:52
            if (
                $.isNumeric(matchedWord.substr(1)) &&
                startPos > 0 &&
                $.isNumeric(currentContent[startPos - 1])
            ) {
                // found currentContent[-1 on start pos] to be numeric, so seems like a timestamp - skip showing auto
                // complete.
                return [false, false, false];
            }

            return [
                matchedWord,
                startPos ? startPos : 0,
                endPos
            ];
        }
        else {
            return [false, false, false];
        }
    };
})(mega.utils);
