/**
 *
 * @param {String} [type] Dialog type. May also contain button labels: "warninga:Save" or "warninga:!^$Yes!No"
 * @param {String} [title] Title.
 * @param {String} [msg] Primary message.
 * @param {String} [subMsg] Sub Message.
 * @param {Function} [callback] Called on tap of any button, callback({Bool} "OK": true, "Cancel": false).
 * @param {Function} [checkboxCallback] "Do not show again" checkbox, callback({Bool} checkboxState).
 *
 * @returns {undefined}
 */
function msgDialog(type, title, msg, subMsg, callback, checkboxCallback) {
    'use strict';

    if (msg === l[7713]) {

        mega.ui.sheet.show({
            name: 'reload-account',
            type: 'modal',
            showClose: true,
            icon: 'reload',
            title: l[23433],
            contents: [l[7713]],
            actions: [
                {
                    type: 'normal',
                    text: l.reload_account_btn,
                    onClick: () => {
                        mega.ui.sheet.hide();
                        callback(true);
                    }
                }
            ]
        });

        return;
    }

    const dialogType = type.split(':');
    var icon = '';

    // Determine icon from the dialog type
    if (dialogType) {
        const typeIconLookup = {
            'warninga': 'icon-alert-triangle-thin-outline warning',
            'warningb': 'icon-alert-triangle-thin-outline warning',
            'confirmation': 'icon-check-circle-thin-outline success',
            'info': 'icon-info-thin-outline info',
            'error': 'icon-x-circle-thin-outline error'
        };

        icon = `sprite-mobile-fm-mono ${typeIconLookup[dialogType[0]]}`;
    }

    // Support other button types if necessary (adapted from fm.js msgDialog function first if/else block):
    // 1. Yes and No buttons for confirmation dialogs
    // 2. Action buttons if type contains button label(s)
    var buttonsArray = [];

    if (dialogType[0] === 'confirmation' || dialogType[1] === `!^${l[78]}!${l[79]}`) {
        buttonsArray = [l[78], l[79]]; // [Yes, No]
    }
    else if (dialogType.length > 1) {
        type = dialogType.shift();
        var actionButton = buttonsArray[0] = dialogType.join(':');

        if (actionButton[0] === '!') {
            actionButton = buttonsArray[0] = actionButton.substr(1);

            if (actionButton[0] === '^') {
                var buttons = actionButton.substr(1);
                var pos = buttons.indexOf('!');
                buttonsArray[0] = buttons.substr(0, pos++);
                buttonsArray[1] = buttons.substr(pos);
            }
        }
    }

    $.msgDialog = type;

    // This types are swap button position
    if (type === 'warninga' || type === 'warningb' || type === 'info' || type === 'error' && buttonsArray.length > 1) {
        buttonsArray.reverse();
    }

    mobile.messageOverlay.render(
        title,
        msg,
        subMsg,
        {
            onInteraction: callback,
            checkbox: checkboxCallback,
        },
        {
            icon: icon,
            buttons: buttonsArray
        },
        false
    );
}

function asyncMsgDialog(type, title, msg, subMsg, callback, checkboxCallback) {

    'use strict';

    return new Promise((resolve, reject) => {
        callback = callback || echo;
        const asyncCallback = tryCatch((value) => {
            Promise.resolve(callback(value)).then(resolve).catch(reject);
        }, reject);
        msgDialog(type, title, msg, subMsg, asyncCallback, checkboxCallback);
    });
}
