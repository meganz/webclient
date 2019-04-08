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
 * @returns {Boolean} Whether the operation was successful
 */
function copyToClipboard(content, toastText, classname) {
    'use strict';
    var success = true;

    if (is_chrome_firefox) {
        mozSetClipboard(content);
    }
    else {
        var elm = document.getElementById('chromeclipboard');

        if (elm) {
            elm.textContent = content;
            // selectText(elm.id);

            try {
                elm.focus();
                elm.setSelectionRange(0, content.length);

                success = document.execCommand('copy');
            }
            catch (ex) {
                console.error(ex);
                success = false;
            }

            elm.textContent = '';
        }
    }

    if (success && toastText) {
        showToast(classname ? 'clipboard ' + classname : 'clipboard', toastText);
    }

    return success;
}
