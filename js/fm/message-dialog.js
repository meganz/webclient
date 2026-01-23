/**
 *
 * @param {String} [type] Dialog type. May also contain button labels: "warninga:Save" or "warninga:!^$Yes!No"
 * @param {String} [title] Title.
 * @param {String} [msg] Primary message.
 * @param {String} [subMsg] Sub Message.
 * @param {Function} [callback] Called on tap of any button, callback({Bool} "OK": true, "Cancel": false).
 * @param {Function|Number|String} [checkboxCallback] "Do not show again" checkbox. Desktop may pass 1 or config key.
 *
 * @returns {undefined}
 */
function msgDialog(type, title, msg, subMsg, callback, checkboxCallback) {

    'use strict';

    let dialogType = String(type);
    let showClose;
    let isDestructive = false;
    var buttonsArray = is_mobile ? [] : [l.ok_button];
    var icon;

    // Legacy support for old msgDialog custom types
    if (dialogType.startsWith('*')) {
        dialogType = dialogType.slice(1);
        showClose = true;
    }
    if (dialogType.startsWith('-')) {
        dialogType = dialogType.slice(1);
        isDestructive = true;
    }

    dialogType = dialogType.split(':');

    icon = msgDialog.icons[dialogType[0]] || '';
    buttonsArray = msgDialog.defaultButtons[dialogType[0]] ?
        [...msgDialog.defaultButtons[dialogType[0]]] : buttonsArray;

    if (dialogType.length > 1) {
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

    const reverseAction = ['warninga', 'warningb', 'info', 'error'].includes(type);

    if (is_mobile) {

        let image;
        let safeShow = false;

        // Swap button position for specific types
        if (reverseAction && buttonsArray.length > 1) {
            buttonsArray.reverse();
        }

        if (type === 'reload-account') {
            showClose = true;
            safeShow = type;
            image = 'reload';
        }
        else {
            $.msgDialog = type;
        }

        // @todo: Remove stuff once mobile msgDialog and ephemeral session UI are ready
        if (type === 'import_login_or_register' && typeof callback === 'function') {
            callback(-1);
            return false;
        }

        megaMsgDialog.render(
            title,
            msg,
            subMsg,
            {
                onInteraction: callback,
                checkbox: checkboxCallback,
            },
            {
                icon,
                buttons: buttonsArray,
                image
            },
            safeShow,
            showClose
        );
    }
    else {
        msgDialog.desktop({
            type,
            title,
            msg,
            subMsg,
            callback,
            checkboxCallback,
            showClose,
            isDestructive,
            buttonsArray,
            reverseAction,
            icon
        });
    }

    if ($.dialog) {
        $('.mega-dialog:not(#msgDialog)').addClass('arrange-to-back');
        $('.mega-dialog-container.common-container').addClass('arrange-to-back');
    }

    if (typeof psa !== 'undefined') {
        psa.repositionAll();
    }
}

// Desktop version dedicated methods
Object.defineProperty(msgDialog, 'desktop', {
    value: (opt) => {

        'use strict';

        let {
            type,
            title,
            msg,
            subMsg,
            callback,
            showClose,
            isDestructive,
            checkboxCallback,
            buttonsArray,
            reverseAction,
            icon
        } = opt;

        // Checkbox handling: desktop may pass 1 (show close) or a config key
        if (checkboxCallback === 1) {
            showClose = true;
        }
        else if (typeof checkboxCallback === 'string') {
            const key = checkboxCallback;
            assert(['cslrem','nowarnpl','skipDelWarning','skipcdtos4','skips4tocd','skips4tos4',
                    'skipSenToS4','rwReinstate','dcPause'].includes(key), key);
            checkboxCallback = checked => checked ? mega.config.set(key, 1) : mega.config.remove(key);
        }

        if (type.startsWith('confirmation') || type === 'clear-bin' || type === 'remove') {
            if (buttonsArray[0] === l.ok_button) {
                buttonsArray[0] = l[78];
            }
            isDestructive = isDestructive || type === 'clear-bin' || buttonsArray[0] === l[23737];
        }

        const footerElements = mCreateElement('div', {class: 'flex flex-row-reverse'});

        if (buttonsArray.length) {
            const primary = buttonsArray[0];
            const secondary = buttonsArray[1];
            const tertiary = buttonsArray[2];
            const quaternary = buttonsArray[3];
            const usingNumResp = tertiary || quaternary;

            if (primary) {
                const priBtn = MegaButton.factory({
                    parentNode: footerElements,
                    text: primary,
                    componentClassname: 'slim font-600',
                    type: 'normal'
                }).on('click', () => {
                    let res = usingNumResp ? 1 : true;
                    if (reverseAction) {
                        res = !res;
                    }
                    if (typeof callback === 'function') {
                        callback(res);
                    }
                    closeMsg();
                });
                priBtn[isDestructive ? 'addClass' : 'removeClass']('destructive');
            }

            if (secondary) {
                MegaButton.factory({
                    parentNode: footerElements,
                    text: secondary,
                    componentClassname: 'slim font-600 mx-2 secondary',
                    type: 'normal'
                }).on('click', () => {
                    let res = usingNumResp ? -1 : false;
                    if (reverseAction) {
                        res = !res;
                    }
                    if (typeof callback === 'function') {
                        callback(res);
                    }
                    closeMsg();
                });
            }

            if (tertiary) {
                MegaButton.factory({
                    parentNode: footerElements,
                    text: tertiary,
                    componentClassname: 'slim font-600 secondary',
                    type: 'normal'
                }).on('click', () => {
                    if (typeof callback === 'function') {
                        callback(0);
                    }
                    closeMsg();
                });
            }

            if (quaternary) {
                MegaButton.factory({
                    parentNode: footerElements,
                    text: quaternary,
                    componentClassname: 'font-600',
                    type: 'text'
                }).on('click', () => {
                    if (typeof callback === 'function') {
                        callback(-2);
                    }
                    closeMsg();
                });
            }
        }

        // Reload account is using a different layout
        const contents = type === 'reload-account' ? [title, msg] : [msg, subMsg];

        $.msgDialog = type;
        megaMsgDialog.render(
            ...contents,
            false,
            {
                onInteraction: callback,
                checkbox: checkboxCallback,
            },
            {
                icon,
                sheetType: 'normal',
                footer: {
                    slot: [footerElements],
                    confirmButton: false,
                    buttons: true
                }
            },
            false,
            showClose
        );

        clickURLs();
    },
    writable: false,
    configurable: false
});

Object.defineProperty(msgDialog, 'icons', {
    value: is_mobile ? {
        'warninga': 'sprite-mobile-fm-mono icon-alert-triangle-thin-outline warning',
        'warningb': 'sprite-mobile-fm-mono icon-alert-triangle-thin-outline warning',
        'confirmation': 'sprite-mobile-fm-mono icon-question-circle-thin-outline info',
        'info': 'sprite-mobile-fm-mono icon-info-thin-outline info',
        'error': 'sprite-fm-mono icon-x-circle-thin-outline error',
        'clear-bin': 'sprite-mobile-fm-mono icon-alert-triangle-thin-outline warning',
        'remove': 'sprite-mobile-fm-mono icon-alert-triangle-thin-outline warning'
    } : {
        'warninga': 'sprite-fm-mono icon-alert-triangle-thin-solid warning',
        'warningb': 'sprite-fm-mono icon-alert-triangle-thin-solid warning',
        'error': 'sprite-fm-mono icon-x-circle-thin-solid error',
        'megasync-reconnect': 'sprite-fm-mono icon-x-circle-thin-solid error'
    },
    writable: false,
    configurable: false
});

lazy(msgDialog, 'defaultButtons', () => {

    'use strict';

    const strings = is_mobile ? {
        'clear-bin': [l[1730], l.msg_dlg_cancel],
        'confirmation': [l[78], l[79]],
        'remove': [l[78], l[79]],
        'reload-account' : [l.reload_account_btn]
    } : {
        'clear-bin': [l[1018], l.msg_dlg_cancel],
        'delete-contact': [l[78], l[79]],
        'remove': [l[78], l[79]],
        'confirmationa': [l[78], l[79]],
        'confirmationb': [l[78], l[79]],
        'confirmation': [l[78], l[79]],
        'warninga': [l.ok_button],
        'warningb': [l.ok_button],
        'info': [l.ok_button],
        'error': [l.ok_button],
        'save_discard_cancel': [l.msg_dlg_save, l.msg_dlg_discard, l.msg_dlg_cancel],
        'import_login_or_register': [l[209], l[171], false, l[20754]],
        'reload-account': [l.reload_account_btn, l.msg_dlg_cancel],
        'megasync-reconnect': [l.reconnect, l[20827]]
    };

    Object.values(strings).forEach(Object.freeze);
    Object.freeze(strings);
    return strings;
});

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

function closeMsg(value) {

    'use strict';

    if (value !== undefined) {
        mega.ui.sheet.trigger('close', [value]);
    }

    if ($.dialog && !(M.chat && $.dialog === 'onboardingDialog')) {
        $('.mega-dialog').removeClass('arrange-to-back');
        $('.mega-dialog-container.common-container').removeClass('arrange-to-back');
    }

    delete $.msgDialog;
    mBroadcaster.sendMessage('msgdialog-closed');

    if (mega.ui.sheet.visible) {
        mega.ui.sheet.hide();
    }

    mega.ui.sheet.off('close.megaSheet');
    mega.ui.sheet.off('close.msgDialog');
    mega.ui.sheet.clear();

    if (typeof psa !== 'undefined') {
        psa.repositionAll();
    }
}
