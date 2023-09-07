/**
 * Highlights some text inside an element as if you had selected it with the mouse
 * From http://stackoverflow.com/a/987376
 * @param {String} elementId The name of the id
 */
function selectText(elementId) {
    'use strict';
    var range;
    var selection;
    var text = document.getElementById(elementId);

    if (document.body.createTextRange) {
        range = document.body.createTextRange();
        range.moveToElementText(text);
        range.select();
    }
    else if (window.getSelection) {
        selection = window.getSelection();
        range = document.createRange();
        range.selectNodeContents(text);
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

/**
 * Copy the provided content to the clipboard.
 * @param {String} content The content to copy to the clipboard
 * @param {String} [toastText] Optional toast notification message
 * @param {String} [classname] Optional toast notification addition classname
 * @param {Number} [timeout] Optional toast notification time (millis) until dismiss
 * @returns {Boolean} Whether the operation was successful
 */
function copyToClipboard(content, toastText, classname, timeout) {
    'use strict';
    const success = clip(content);

    if (success && toastText) {

        showToast(classname || 'clipboard', toastText, "", "", null, null, timeout);
    }

    return success;
}
